# Phase 5 — Calculate tab & narration

**Goal:** a form that computes tax, shows the working, and explains it in plain language.
**AI involved:** narration only — the model receives finished numbers and writes sentences.
**Effort:** a weekend.

---

## 1. The rule for this phase

**The model never computes anything.** It receives a finished `Breakdown` and turns it
into prose. If a number appears in the explanation that is not in the breakdown, that is
a bug — and the prompt is written to make it unlikely.

```
inputs → computeTax() → Breakdown → LLM → explanation
                            ↑
                    the only source of numbers
```

---

## 2. Privacy: what leaves the machine

The breakdown contains your income. FreeLLMAPI routes to free-tier providers whose terms
may permit training on inputs.

**Send derived figures only. Never send identifiers.**

| Send | Never send |
|---|---|
| total income, taxable salary | name, TIN, NID |
| gross tax, rebate, net tax | employer name |
| threshold, band rows | bank account or Sanchayapatra numbers |
| payable / refundable | address, phone |

The `Breakdown` type already contains no identifiers — keep it that way. Pass the
breakdown object, not the raw form inputs.

If even income figures feel too sensitive, run narration through a local Ollama chat
model instead. The code path is identical — only `baseURL` changes.

---

## 3. Calculate API

### `app/api/calculate/route.ts`

```ts
import { NextRequest } from 'next/server'
import { computeTax, loadYearConfig } from '@/lib/calc/index'
import type { TaxInputs } from '@/lib/calc/index'

export async function POST(req: NextRequest) {
  const { assessmentYear, inputs } = (await req.json()) as {
    assessmentYear: string
    inputs: TaxInputs
  }

  // Validate before computing — refusing is a feature.
  const rejected = rejectOutOfScope(inputs)
  if (rejected) return Response.json({ error: rejected }, { status: 422 })

  const config = loadYearConfig(assessmentYear)
  const breakdown = computeTax(config, inputs)

  return Response.json({ breakdown })
}
```

### Out-of-scope detection

```ts
/**
 * v1 covers resident individuals with salary, house property and bank interest.
 * Anything else must stop, not be approximated.
 */
function rejectOutOfScope(inputs: TaxInputs): string | null {
  if (inputs.category === undefined) return 'Taxpayer category is required.'
  // Extend as heads are added to the form:
  // if (inputs.business_income) return 'Business income is not supported yet...'
  // if (inputs.capital_gains)   return 'Capital gains are not supported yet...'
  return null
}
```

Also surface `breakdown.warnings` in the UI — the calculator already flags unverified
configs, net-house-property assumptions, and unconfigured conveyance exemption.

---

## 4. Narration API

### `app/api/explain/route.ts`

```ts
import { NextRequest } from 'next/server'
import { chat, CHAT_MODEL } from '@/lib/llm/client'
import type { Breakdown } from '@/lib/calc/index'

const SYSTEM = `You explain a Bangladesh income tax calculation to a taxpayer.

STRICT RULES:
- Use ONLY the numbers in the JSON provided. Never calculate, derive, or estimate.
- Never introduce a figure that is not present in the JSON.
- Do not give tax advice or suggest ways to reduce tax beyond what the data shows.
- Write 4-6 short sentences, plain language, no jargon.
- Answer in the language requested.

Explain, in this order:
1. Total income and how it was reached.
2. The tax-free threshold that applied and why (taxpayer category).
3. Which slabs were used.
4. The rebate: the amount, and which of the three caps limited it
   (rebate_binding: "income" = 3% of income capped it, "investment" = the
   percentage of investment capped it, "cap" = the absolute ceiling capped it).
5. Whether minimum tax applied.
6. Final payable or refundable amount.`

export async function POST(req: NextRequest) {
  const { breakdown, language } = (await req.json()) as {
    breakdown: Breakdown
    language?: 'bn' | 'en'
  }

  const stream = await chat.chat.completions.create({
    model: CHAT_MODEL,
    stream: true,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          `Language: ${language === 'bn' ? 'Bangla' : 'English'}\n\n` +
          JSON.stringify(breakdown, null, 2),
      },
    ],
  })

  // ... same SSE streaming wrapper as /api/ask
}
```

**Why `rebate_binding` matters.** "Your rebate was capped by 3% of income, so investing
more would not reduce your tax further" is genuinely actionable — and it comes from a
field the calculator already computes. No model reasoning involved.

---

## 5. UI

```
app/
  page.tsx                    tabs: Calculate | Ask
  components/
    YearSelector.tsx          shared across both tabs
    TaxForm.tsx               inputs
    BreakdownTable.tsx        the working
    Explanation.tsx           streamed narration
    Warnings.tsx              breakdown.warnings + unverified config banner
```

### Form sections — mirror the official e-Return order

Users who have filed before will recognise it (see
[`research/etax-filing-guide.md`](../research/etax-filing-guide.md)):

```
1. Assessment      year · taxpayer category · first-time filer?
2. Salary          basic · HRA · medical · conveyance · bonus · other · non-cash
3. Other income    house property (net) · bank interest · other
4. Rebate          eligible investment total
5. Paid            source tax · advance tax
```

Show the eligible-investment categories from `config.rebate.eligible_categories` as a
hint — twelve items, straight from the NBR manual.

### Breakdown display

Show every line the calculator produced, including per-band rows. **The working is the
trust.** A taxpayer who can follow the arithmetic will believe the result; one shown only
a final number will not.

Put the narration **below** the table, not instead of it.

### Non-negotiable UI elements

- **Unverified banner** — while any loaded config has `"verified": false`
- **Disclaimer** — guidance only; verify against the official form; this does not file
  anything
- **Warnings list** — from `breakdown.warnings`

---

## 6. Persisting a scenario

Save and reload from `private/returns/*.json` — the same shape the replay eval uses. That
means every scenario you save can become a test case, and the file stays gitignored.

```ts
// Save from the UI → private/returns/<year>-draft.json
{ assessment_year, _compare: 'net_tax', inputs, filed_result: { net_tax: 0 } }
```

Once you file for real, fill in `filed_result` and it becomes a permanent regression test.

---

## 7. Acceptance criteria

- [ ] Form computes and shows the full breakdown, including band rows
- [ ] Narration contains **no number absent from the breakdown** — check a few by hand
- [ ] Narration explains which rebate cap bound
- [ ] Unverified-config banner and disclaimer are visible
- [ ] `breakdown.warnings` are surfaced
- [ ] No identifiers are sent to the hosted model — inspect the request payload
- [ ] Out-of-scope inputs are rejected with a clear message, not approximated
- [ ] A saved scenario can be replayed by `npm run eval`

---

## 8. The check that matters

Run the same inputs through **both** assessment years and read the two explanations.

If the model correctly explains that 2026-27 raised the threshold but weakened the
rebate — and that the net effect can be *higher* tax — then narration is working, because
that conclusion is visible in the numbers rather than something the model knows.
