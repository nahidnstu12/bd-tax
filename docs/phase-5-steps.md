# Phase 5, step by step — the learning route

Same method as Phases 3 and 4: **understand first, plumbing last.** The form is
step 8, not step 1, because by then there is nothing left to decide.

`docs/phases/05-calculate-tab.md` is the answer key. Read it *after* a step. It
predates the code in places — see **Errata** at the bottom.

**Effort: not a weekend.** The answer key says one; that was written before this
phase absorbed both tabs, the wealth and lifestyle sections, and a switchable
narration provider. Budget two, and do steps 1-6 in one sitting and the UI in
another. The thinking is all in 1-6; the UI is long, not hard.

---

## The one idea

Phase 4 was **grounding**: the model reads text you handed it, and you check the
citations by hand.

Phase 5 is **verifiable generation**. Every number the model is permitted to say
already exists in a `Breakdown` object. So for the first time you can check the
output *mechanically*:

```
inputs → computeTax() → Breakdown ──┬──▶ LLM ──▶ narration
                                    │                │
                                    └────────────────┤
                                       every number  ▼
                                       in the text   verify()
                                       must be in    │
                                       the JSON      ▼
                                                {ok, violations[]}
```

That flips the phase. In Phase 4 your prompt experiments were judged by reading
them. Here a script judges them, so every step after step 2 is measured rather
than argued about.

**The second idea:** decide what the model is even *for*. The most useful
sentence in the app —

> "Your rebate was capped by 3% of your income, so investing more would not have
> reduced your tax further."

— comes from `rebate_binding`, a field the calculator already computes. That
sentence should be a **template**, not model output. The model gets the
connective prose and the plain-language tone. Knowing which sentences to keep
away from the model is the actual skill this phase teaches.

---

## What Phase 5 produces

```
app/
  page.tsx                tabs: Calculate | Ask       ← both tabs land here
  api/calculate/route.ts  compute, or reject out-of-scope with 422
  api/explain/route.ts    narrate a Breakdown (SSE)
lib/narrate/
  verify.ts               the number checker — no model
  template.ts             the sentences code writes, not the model
  prompt.ts               SYSTEM_PROMPT + the JSON payload builder
  explain.ts              the pipeline: breakdown in, verified narration out
```

`lib/calc/` is untouched. If you find yourself editing it to make narration
easier, stop — the calculator does not serve the model.

---

## Before you start: the narration provider switch

Narration needs no world knowledge. It rephrases numbers you supply. That makes
a local model genuinely viable, which matters because **this phase sends your
actual income**, not public rule text.

Add to `.env.local`:

```bash
# local  = Ollama, income never leaves the machine (default)
# hosted = FreeLLMAPI, better prose, real figures go to free-tier providers
NARRATION_PROVIDER=local
NARRATION_MODEL_LOCAL=llama3.2:3b
NARRATION_MODEL_HOSTED=auto
```

Both are OpenAI-compatible, so `lib/llm/client.ts` from Phase 4 grows one
function rather than a second SDK:

```ts
export function narrator() → { client, model }   // picks by NARRATION_PROVIDER
```

Pull the local model first:

```bash
ollama pull llama3.2:3b
```

Step 10 compares the two on hallucination rate. Do not guess which wins — a 3B
local model may well be *safer* here, because the task is copying numbers and a
weaker model has fewer opinions to inject.

### Privacy line for this phase

| Send | Never send |
|---|---|
| the `Breakdown` object | name, TIN, NID |
| total income, taxable salary, band rows | employer name |
| rebate, net tax, payable, refundable | bank / Sanchayapatra account numbers |
| lifestyle totals, wealth reconciliation | address, phone |

`Breakdown` contains no identifiers today. **Keep it that way** — that property
is what makes "just pass the breakdown" a safe rule. Pass the breakdown, never
the raw form inputs.

---

## The rule that does not change

> **It is a calculator with a librarian attached. The AI is only the voice.**

Phase 4's table, tightened for narration:

| the model may | the model may not |
|---|---|
| rephrase a number that is in the JSON | compute, derive, or estimate any number |
| explain which rule applied | decide which rule applied |
| say a field was zero | infer why it was zero |
| choose plain wording over jargon | give tax advice beyond the data |

There is no retrieval in this phase and therefore no gate. `verify()` is its
replacement: Phase 4 refused *before* the model, Phase 5 checks *after* it.

---

## Step 1 — Watch it invent

**Goal:** see the failure mode before building the defence.

**You write:** `scripts/narrate-peek.ts` — load a config, compute a breakdown,
hand the JSON to the model with **no rules at all**, print the result.

You already have an input generator:

```bash
npm run calc -- 2026-27          # prints a real breakdown from the sample
```

**Add to `package.json`** (the env flag is not optional — without it neither
Ollama's URL nor the FreeLLMAPI key is loaded):

```json
"narrate:peek": "tsx --env-file-if-exists=.env.local scripts/narrate-peek.ts"
```

**What to look for:** numbers that are not in the JSON. The common ones are

- a **percentage** the model computed ("that's about 8% of your income")
- a **rounded restatement** ("roughly 1.2 lakh" for 118,540)
- a **helpful suggestion** with a figure attached ("investing another 50,000
  would…")

The third is the dangerous one, because it is the sentence a user will act on.

**Predict first:** how many invented numbers in one paragraph? Write the number
down before you run it.

---

## Step 2 — The number checker

**Goal:** turn "read it carefully" into a function. This is Phase 5's equivalent
of Phase 4's gate: deterministic, free, and the thing every later step is scored
by. Build it **second**, not last.

**You write:** `lib/narrate/verify.ts`

```
verify(narration: string, breakdown: Breakdown) → { ok, violations[], nearMisses[] }
```

Two halves, and the second is where the work is.

**Half 1 — the allowed set.** Walk the `Breakdown` recursively and collect every
numeric leaf. Then add the forms the model may legitimately write them in:

| in the JSON | may appear as |
|---|---|
| `150000` | `150,000` · `1,50,000` (South Asian grouping) · `1.5 lakh` |
| `rate: 0.10` | `10%` |
| `assessment_year: "2026-27"` | `2026-27` · `2026` · `27` |
| `0` | "no", "none", "nil" — words, not numbers |

Band rates are the trap. The JSON stores `0.10`; every human sentence says
"10%". Forget that expansion and the checker flags every correct narration.

**Half 2 — extracting numbers from prose.** Latin digits with either grouping
convention, decimals, percent signs, and the multiplier words — lakh, crore,
hazar. Step 4 adds Bangla-Indic digits (U+09E6–U+09EF) as input robustness.

**The verdict rule:** any extracted number not in the allowed set is a
violation. **No tolerance.** The model is quoting, not calculating, so ±1 is not
a rounding artefact — it is invention. Report close-but-wrong values separately
as `nearMisses`, because those tell you the prompt is nearly working.

**Allowlist, deliberately short:** list ordinals (`1.`, `2.`), the year, and
numbers appearing inside `breakdown.warnings` strings. Everything else is a
violation. A generous allowlist quietly disables the whole phase.

**You run:** the checker against the step-1 output, which you already know is
bad. A checker that passes an ungrounded narration is broken.

**Why it is worth this much effort:** it becomes a unit test, it scores step 3,
it gates step 10, and in Phase 6 it can run over every saved scenario in CI. It
is the most reused thing you write this phase.

---

## Step 3 — The prompt lab, scored by code

**Goal:** find out what each instruction is worth — with a number, not an
impression. **Pin the provider and model** for the whole lab.

**You run:** the same breakdown, N narrations per variant, `verify()` on each.

| variant | question it answers |
|---|---|
| no rules | baseline invention rate |
| "use only the numbers in the JSON" | is one sentence enough? |
| + "never calculate, derive or estimate" | does naming the verbs help? |
| + "do not suggest ways to reduce tax" | does the advice-with-a-figure case stop? |
| + explicit 6-point structure | does structure reduce invention, or just tidy it? |

Report violations per 100 sentences, not per run. One clean run proves nothing
at temperature 0.7.

**The counter-intuitive result to watch for:** the strict variants often produce
*worse prose* — stiff, list-like, repetitive. That trade is real, and it is
yours to make deliberately. Write down which variant you chose and why.

**Output of this step:** the `SYSTEM_PROMPT` that goes into `lib/narrate/prompt.ts`.

---

## Step 4 — How Bangladeshi numbers are written

**Goal:** the checker survives contact with real amount formatting.

**This app is English-only** — one local user, no deployment, no translation
layer. That decision removes an i18n pass and makes the local narration model an
easier choice, since Bangla prose quality was the main argument for going hosted.

But English-language Bangladeshi documents still write numbers their own way, and
a checker that does not know this will reject correct narrations:

- **lakh and crore**, not millions — "1.5 lakh" is ordinary English here
- **1,50,000 grouping**, not 150,000
- **Bangla-Indic digits** turn up anyway, in a pasted certificate or a portal
  screenshot, even in an otherwise English document

**You write:** the multiplier words and a digit map in `verify.ts`. The digit map
is about five lines and it is cheap insurance — without it, a Bangla numeral
reads as no number at all and passes silently, which is the worst failure a
checker can have.

**What to look for:** whether the model *converts* rather than quotes. "1.5 lakh"
for 150,000 is fine — same number, different spelling. "1.5 lakh" for 147,300 is
a violation dressed as politeness. Your checker must catch the second without
flagging the first. That distinction is the whole step.

**Decide and write down:** are lakh/crore phrasings allowed at all, or must the
narration quote digits exactly? Allowing them reads better and widens the
checker's surface. Step 10 measures the cost.

---

## Step 5 — Templates: what the model does not get to write

**Goal:** decide the boundary. Some sentences are too important to generate.

**You write:** `lib/narrate/template.ts` — pure functions, `Breakdown` in,
sentence out. No model.

Three that belong here:

| field | template sentence |
|---|---|
| `rebate_binding: 'income'` | "Your rebate was capped at 3% of your total income — investing more would not have reduced it further." |
| `rebate_binding: 'investment'` | "Your rebate was limited by your investment amount — investing more *would* increase it, up to the ceiling." |
| `minimum_tax_applied: true` | "Your calculated tax was below the minimum, so the minimum tax applies instead." |

Handle `rebate_binding: 'none'` too — the answer key's prompt lists only three
values, and the type has four.

**Why templates win here:** these are the sentences a user acts on financially,
they have exactly one correct phrasing per branch, and a template cannot get the
direction backwards. The model's job is the surrounding paragraph.

**Design question to answer explicitly:** do templates get *injected into the
prompt* (so the model weaves them in) or *rendered around* the model's text (so
they are guaranteed verbatim)? Rendering around is safer and slightly clunkier.
Pick one, write down why. This is the real decision of the phase.

---

## Step 6 — The pipeline

**Goal:** one function, callable from a script, independent of Next.

**You write:** `lib/narrate/explain.ts`

```
explain({ breakdown })
  → prompt → model → verify → { text, templated[], verification }
```

**What to do when `verify()` fails** — decide now, not in the route:

1. **Retry once** at temperature 0 with the violations named in the prompt
2. Still failing → **fall back to the templates alone**, which are always safe
3. Never show unverified narration, and never silently drop it

Return the verification result to the caller either way. The UI shows the
breakdown table regardless; narration is the optional layer, and it failing is
not an outage.

Mirror `lib/rag/ask.ts` from Phase 4 in shape and independence. Test it from a
script before any route exists.

---

## Step 7 — The two routes

**Goal:** wiring. Boring by design.

`app/api/calculate/route.ts`

```
parse → rejectOutOfScope() → 422
      → loadYearConfig(year) → computeTax() → { breakdown }
```

**Refusing is a feature here too.** v1 covers resident individuals with salary,
house property and bank interest. Anything else stops with a message — an
approximation that looks like a tax figure is worse than no answer.

`app/api/explain/route.ts` — calls `explain()`, streams SSE. Same wrapper as
`/api/ask`, including the **error frame** when the provider dies mid-stream.

**Log both**, like Phase 4: year, provider, model, violation count, whether the
retry or the template fallback fired. That log is how you find out in a week
whether local narration is actually holding up.

**Note the ordering:** compute and narrate are two calls, not one. The user sees
the table immediately; the prose streams in after. That is a UX decision *and* a
safety one — the numbers are never waiting on the model.

---

## Step 8 — The form

**Goal:** the full e-Return shape, in the official order, so a filer recognises it.

```
1. Assessment      year · taxpayer category · parent of disabled? · first-time filer?
2. Salary          basic · HRA · medical · conveyance · bonus · other · non-cash
3. Other income    house property (NET) · bank interest · other
4. Rebate          eligible investment total
5. Paid            source tax · advance tax
6. Expenditure     the 11 lifestyle lines (LifestyleExpenditure)
7. Assets/Wealth   prior net wealth · other sources · other outflows · declared closing
```

Sections 6 and 7 do **not** affect tax. Say so in the UI, right there — a user
who thinks lifestyle expenses reduce their tax will mis-file. They exist because
the e-Return demands them and because `wealth_difference` is the number that
triggers NBR questions.

**Details that pay off:**

- Show `config.rebate.eligible_categories` (12 items, straight from the NBR
  manual) as a hint under the investment field
- House property is **net** — label it, and surface the warning the calculator
  already emits when no repair-allowance rule is configured
- Category drives the threshold; show the resolved threshold live as they pick

**Breakdown display:** every line the calculator produced, **including per-band
rows**. The working is the trust. A taxpayer who can follow the arithmetic will
believe the result; one shown a single final number will not. Narration goes
*below* the table, never instead of it.

**Non-negotiable:** unverified-config banner (both years are `"verified": false`
today), `breakdown.warnings` list, and a disclaimer that this files nothing.

---

## Step 9 — The shell, and the Ask tab UI

**Goal:** Phase 4 ended at a `curl`-testable route. This is where Ask gets a face.

```
page.tsx          tabs: Calculate | Ask
YearSelector      shared by both tabs — one piece of state
AskBox            question, streamed answer, citation list
```

**Carry two findings forward:**

**Phase 3, test 10 — short queries retrieve measurably worse.** "investment
rebate" scored 0.780; "how is the investment rebate calculated?" scored 0.865.
That gap is bigger than the difference between strong and weak retrieval in the
calibration table. Phase 3 explicitly deferred it here as *a UI problem*. Fix it
in the box: a question-shaped placeholder, and either a nudge or a query
expansion before embedding.

**Phase 4 — citations are the product.** Always render them, with the `cited`
flag distinguishing what the model actually named from what was merely
retrieved. A cited answer a user can open and read beats a smarter uncited one.

The year selector being shared is not cosmetic: Phase 3 finding 2 was that
year-blind search silently prefers 2025-26. One selector, both tabs, always sent.

---

## Step 10 — Measure

**Goal:** the Phase 3 and 4 habit, applied to narration.

**The metric is already built.** `verify()` gives you violations per narration;
that is your hallucination rate. Run N=20 per cell, same breakdown, and report
violations per 100 sentences.

| variable | question |
|---|---|
| **local vs hosted** | does the 3B local model actually invent more? |
| temperature 0 vs 0.7 | how much does sampling cost you in invention? |
| lakh/crore allowed vs digits only | does letting it rephrase amounts increase drift? |
| strict vs structured prompt | which step-3 variant earns its place? |
| JSON vs pre-formatted prose input | is raw JSON harder for the model to quote from? |

That first row is the one to run first, because it decides whether your income
figures need to leave the machine at all. If local narration is within a point
or two of hosted, the privacy argument settles the question and you can default
to `local` permanently. English-only narration makes that outcome more likely —
prose quality was the strongest argument for hosted, and it just got weaker.

The last row is worth a thought: you are handing a model a nested JSON object
and asking it to quote leaves out of it. A flattened `label: value` list might be
easier to copy from. Cheap to test, and nobody ever does.

---

## Step 11 — A scenario becomes a test

**Goal:** close the loop back to Phase 1.

Save from the UI to `private/returns/<year>-draft.json`, in the shape
`eval/replay.ts` already loads:

```json
{ "assessment_year": "2026-27", "inputs": { ... }, "filed_result": { "net_tax": 0 } }
```

(`_compare` is deprecated — every key present in `filed_result` is asserted now.
Do not write it into new fixtures.)

Once you file for real, fill in the actual figures and it becomes a permanent
regression test that runs on `npm run eval`. The directory is gitignored, so real
numbers stay local.

**The payoff:** in Phase 6 you can run `verify()` over every saved scenario's
narration in one command. Every scenario you save makes the next model or prompt
change measurable instead of scary.

---

## Test these by hand

| # | case | expected |
|---|---|---|
| 1 | **Same inputs, both years** | explanations differ, and the 2026-27 one may show *higher* tax despite the higher threshold — the weakened rebate is visible in the numbers |
| 2 | Rebate bound by income | narration names *which* cap bound, correctly |
| 3 | Minimum tax applies | narration says so, and does not present the calculated tax as final |
| 4 | Zero / empty return | no invented numbers, no advice |
| 5 | Out-of-scope input | 422 with a clear message — never approximated |
| 6 | An amount phrased as "1.5 lakh" | accepted when it equals the JSON value, flagged when it rounds one |
| 7 | Unverified config | banner visible **and** the warning reaches the user |

Case 1 is the one that proves the phase. If the model correctly explains that the
threshold went up but the rebate ceiling came down, and that the net effect can
be *more* tax — narration is working, because that conclusion is visible in the
two breakdowns rather than something the model knows about Bangladesh.

---

## Done when

- [ ] Narration contains **no number absent from the breakdown** — proven by `verify()`, not by reading
- [ ] `verify()` runs as a test, and fails the step-1 ungrounded output
- [ ] Templated sentences are verbatim and cover all four `rebate_binding` values
- [ ] A failed verification falls back to templates — never shows unverified prose
- [ ] Local and hosted narration are both wired, and you have measured which invents more
- [ ] Full breakdown is shown including band rows; narration sits below it
- [ ] Expenditure and wealth sections exist and are labelled as not affecting tax
- [ ] Out-of-scope inputs are rejected with 422, not approximated
- [ ] Unverified banner, `breakdown.warnings`, and the disclaimer are all visible
- [ ] No identifiers reach any model — inspect an actual request payload
- [ ] Ask tab has a UI, shares the year selector, and nudges toward question-shaped queries
- [ ] A saved scenario replays under `npm run eval`

---

## Errata in the answer key

`docs/phases/05-calculate-tab.md` predates parts of the code:

| section | says | actually |
|---|---|---|
| §4 prompt | "answer in the language requested", `language: 'bn' \| 'en'` param | **English only** — drop the rule and the param; one local user, no translation layer |
| §4 prompt | `rebate_binding` has three values | four — `'none'` is missing from the prompt |
| §4 | narration order omits wealth and lifestyle | `Breakdown.wealth` exists and this phase's form collects it |
| §5 | UI is the Calculate tab | Phase 5 owns **both** tabs — Phase 4 now stops at the route |
| §6 | fixture includes `_compare: 'net_tax'` | deprecated in `eval/replay.ts:96`; all `filed_result` keys are asserted |
| §2 | local Ollama is the fallback option | it is the **default** here; `NARRATION_PROVIDER` switches |
| header | effort: a weekend | two, with the scope this phase now carries |
| throughout | no verification step | `verify()` is the spine of the phase (step 2) |

---

## Where each step's ideas come from

| step | source |
|---|---|
| 1, 3 | Phase 4's prompt lab — same method, but scored by code instead of by eye |
| 2, 4 | new ground: mechanical verification of generated text |
| 5 | [Part 6 — Retrieval](learn/06-retrieval.md) — "cheap deterministic checks first" applied to output |
| 8, 9 | [`research/etax-filing-guide.md`](research/etax-filing-guide.md) — the official form order |
| 10 | [Part 7 — Measuring](learn/07-measuring.md) — ablation method, N per cell, ceiling effects |
| 11 | Phase 1's `eval/replay.ts` — the fixture shape has not changed |

Say **"start step 1"** when `npm run calc -- 2026-27` prints a breakdown you
believe.
