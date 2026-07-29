# Phase 6 — Measurement, year tooling & polish

**Goal:** make quality measurable, make yearly updates a routine, and close the loop.
**Effort:** a weekend.

> This is the phase most side projects skip, and the reason most of them cannot be
> improved after they are built. Without measurement, every change is a guess.

---

## 1. Retrieval eval

The replay eval proves the calculator. This proves the retrieval.

### The test set — write it by hand

`eval/questions.json`:

```json
[
  { "q": "Is festival bonus taxable?",              "expect_file": "salary-income.md" },
  { "q": "What qualifies for the investment rebate?","expect_file": "rebate.md" },
  { "q": "How much medical allowance is exempt?",    "expect_file": "salary-income.md" },
  { "q": "When is the filing deadline?",             "expect_file": "deadlines.md" },
  { "q": "What do I need to register for e-Return?", "expect_file": "registration.md" },
  { "q": "Why is my source tax not verified?",       "expect_file": "source-tax-verification.md" },
  { "q": "What is the corporate tax rate?",          "expect_refusal": true },
  { "q": "How do I file for my company?",            "expect_refusal": true }
]
```

About 20 entries. **Include refusal cases** — a system that answers everything is broken
in a way hit rate alone will not reveal.

### `eval/retrieval.ts`

```ts
import { readFileSync } from 'node:fs'
import { search } from '../lib/rag/search'
import { pool } from '../lib/rag/db'

const FLOOR = Number(process.env.RETRIEVAL_SCORE_FLOOR ?? 0.5)
const cases = JSON.parse(readFileSync('eval/questions.json', 'utf8'))

let hits = 0, refusalsCorrect = 0, refusalCases = 0

for (const c of cases) {
  const results = await search(c.q, c.year ?? null, 5)
  const best = results[0]?.score ?? 0

  if (c.expect_refusal) {
    refusalCases++
    const refused = best < FLOOR
    if (refused) refusalsCorrect++
    console.log(`  ${refused ? '✓' : '✗'}  refuse: "${c.q}"  best=${best.toFixed(3)}`)
    continue
  }

  const found = results.some(r => r.sourceFile.endsWith(c.expect_file))
  if (found) hits++
  const rank = results.findIndex(r => r.sourceFile.endsWith(c.expect_file)) + 1
  console.log(`  ${found ? '✓' : '✗'}  "${c.q}"  ${found ? `rank ${rank}` : `expected ${c.expect_file}`}  best=${best.toFixed(3)}`)
}

const answerCases = cases.length - refusalCases
console.log(`\n  retrieval hit rate   ${hits}/${answerCases}`)
console.log(`  refusal accuracy     ${refusalsCorrect}/${refusalCases}\n`)
await pool.end()
```

Wire both evals into one command:

```json
"eval": "tsx eval/replay.ts && tsx eval/retrieval.ts"
```

```
npm run eval

  ✓  2025-26.json  net_tax  ->  92,668   expected 92,668
  ✓  2026-27.json  net_tax  ->  96,080   expected 96,080

  ✓  "Is festival bonus taxable?"  rank 1  best=0.847
  ✗  "How much medical allowance is exempt?"  expected salary-income.md  best=0.512
  ✓  refuse: "What is the corporate tax rate?"  best=0.383

  retrieval hit rate   18/20
  refusal accuracy     2/2
```

**Now chunk-size experiments are engineering, not vibes.** Change the chunker, re-index,
re-run — the number moves or it does not.

---

## 2. Year tooling

### Config diff

```ts
/** npx tsx scripts/config-diff.ts 2025-26 2026-27 */
import { loadYearConfig } from '../lib/calc/config'

const [a, b] = process.argv.slice(2)
const A = loadYearConfig(a!), B = loadYearConfig(b!)

function walk(x: any, y: any, path = '') {
  for (const k of new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})])) {
    if (k.startsWith('_')) continue
    const p = path ? `${path}.${k}` : k
    const xa = x?.[k], yb = y?.[k]
    if (typeof xa === 'object' && xa !== null && !Array.isArray(xa)) { walk(xa, yb, p); continue }
    if (JSON.stringify(xa) !== JSON.stringify(yb)) {
      console.log(`  ${p}\n    ${a}: ${JSON.stringify(xa)}\n    ${b}: ${JSON.stringify(yb)}`)
    }
  }
}
walk(A, B)
```

Output becomes the **"what changed this year"** page — genuinely the most useful thing on
the whole site, and you get it for free:

```
  exempt_threshold.general
    2025-26: 375000
    2026-27: 400000
  rebate.pct_of_investment
    2025-26: 0.15
    2026-27: 0.1
  rebate.absolute_cap
    2025-26: 1000000
    2026-27: 750000
```

### Side-by-side comparison in the UI

Run the same inputs through two years and show both breakdowns. This surfaces the
non-obvious result — that a higher threshold with a weaker rebate can mean *more* tax.

---

## 3. The yearly ritual (~2 hours)

When a new Finance Act lands, around June/July:

1. `cp -r rules/ay-<prev> rules/ay-<new>`
2. Edit changed figures in `config.json`; update corpus prose to match
3. Set `"verified": false` and refresh the `_verify` list
4. `npm run index`
5. **`npm run eval` — previous years must still pass**
6. `npx tsx scripts/config-diff.ts <prev> <new>` → publish the change summary
7. After filing, add the new year's return to `private/returns/` and set `verified: true`

**Old years are never edited.** That rule is what keeps the eval meaningful and stops a
repealed slab from surfacing in a current-year answer.

---

## 4. Remaining polish

| Item | Why |
|---|---|
| Bangla UI toggle | The whole point for most users |
| Print / PDF the breakdown | Take it to the e-Return form |
| "Missed deduction" nudges | Code detects the gap (eligible investment far below the cap); the LLM phrases it |
| Question log review | A week of logs shows which corpus files to write next |
| Backup `private/` | Your filed returns are the test set — losing them loses your proof |

---

## 5. Deliberately not done

Recording these prevents re-litigating them later:

- **No auth / multi-user** — local only, by design
- **No hosted deployment** — personal tax data stays on the machine
- **No PDF/OCR ingestion** — corpus stays hand-curated
- **No business income, capital gains, surcharge** — scope boundary; the app refuses
- **No filing** — this guides, it never submits

---

## 6. Acceptance criteria

- [ ] `npm run eval` runs both replay and retrieval, and prints hit rate
- [ ] Retrieval hit rate is measured and recorded — improve it deliberately
- [ ] Refusal cases pass
- [ ] `config-diff.ts` produces a readable year-over-year summary
- [ ] The yearly ritual is documented and has been rehearsed once
- [ ] Both assessment years pass replay

---

## 7. When it is finished

You will have a system where:

- Every number traces to a config value or a user input
- Correctness is **proved** by replaying real filed returns
- Retrieval quality is **measured**, not assumed
- A new tax year costs two hours and zero code changes
- Nothing personal ever leaves the machine

That set of properties — not the model, not the framework — is what "production" means.
