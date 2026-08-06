# Phase 3 — search test sheet

Ten questions to run against `npm run search`, with what each one is actually
testing. Write your prediction in the blank column **before** you run it.

The point is not to collect scores. It is to make retrieval's behaviour visible
while it is still simple enough to reason about — 59 chunks, no LLM, no UI.

> **Absolute score numbers vary** with model version and corpus edits. The bands
> below are guides. What must hold is the **relative** claims: which chunk ranks
> first, which year it came from, and how big the gap is between rank 1 and rank 5.

Run each as:

```bash
npm run search -- "the question"
```

The `--` is required, otherwise npm swallows the argument.

---



## Reading the output

Each hit prints four things:

```
  1.  0.684  █████████████·······
      What counts as salary income on e-Return?
      rules/ay-2025-26/corpus/salary-income.md  ·  2025-26
```


|                 |                                                           |
| --------------- | --------------------------------------------------------- |
| `0.684`         | cosine similarity, 0..1                                   |
| the bar         | same number, so gaps are visible at a glance              |
| the heading     | which chunk won                                           |
| the path + year | **check this** — most bugs show up here, not in the score |


**The gap matters more than the top score** — but read it together with whether
the five rows agree with each other:


|                                | five rows, one topic                                 | five rows, scattered topics                     |
| ------------------------------ | ---------------------------------------------------- | ----------------------------------------------- |
| **clear drop after rank 1-2**  | found one specific answer                            | found one specific answer                       |
| **five near-identical scores** | topic is dense — several chunks are all fair answers | **found nothing**, returning its least-bad rows |


Flatness alone is not failure. Flatness *plus* disagreement is. Compare the two
real runs below.

**A miss** — `"is my festival bonus taxable?"`, spread 0.024 across three
different topics (slabs / minimum tax / salary), with the correct chunk last:

```
1.  0.589   slabs 2025-26          taxed above the exempt threshold
2.  0.576   slabs 2026-27          taxed above the exempt threshold
3.  0.566   minimum-tax 2026-27    when is minimum tax zero
4.  0.566   slabs 2026-27          slab bands and rates
5.  0.565   salary-income 2025-26  what counts as salary income   <- should be #1
```

**A hit** — `"money I get from renting out my flat"`, an even flatter spread of
0.017, but every row is the same file:

```
1.  0.613   house-property 2025-26   how do I enter house property income
2.  0.612   house-property 2026-27   how do I report rental income
3.  0.608   house-property 2026-27   bank interest and rent together
4.  0.602   house-property 2026-27   what house property figure
5.  0.596   house-property 2025-26   what if I only know gross rent
```

Same shape, opposite verdict. The heading and path columns are what separate
them, which is why the sheet keeps telling you to read those and not the number.

### Why the first one missed

The salary chunk is ~60 words about employment tabs, multiple employers, salary
certificates and annual totals; *festival bonus* appears once inside it. But a
chunk becomes **one vector** — a single point in space, the average of
everything in it. That one specific fact gets diluted by the other fifty words.
Meanwhile the strongest term in the question, *taxable*, points straight at the
slab chunks, which are about nothing else.

**One chunk = one vector = one average.** No model and no prompt downstream can
recover a fact that was averaged away. Only re-cutting the chunk can.

### Calibration — measured, not guessed

A score means nothing on its own. It only means something next to other scores
from the *same* corpus and the *same* model. After one full pass of this sheet:

| score | what it turned out to mean here | seen in |
|---|---|---|
| **0.865** | ceiling — near-exact match | test 10 (sentence form) |
| 0.75–0.78 | strong, confident, correct | tests 3, 4, 5, 7, 10 |
| 0.60–0.65 | weak — might be right, might be noise | tests 1, 2, 8 |
| 0.38–0.39 | floor — nothing related exists | test 9 |

The 0.60–0.65 band is the uncomfortable one: test 2 (a correct answer, 0.613)
and test 8 (a complete miss, 0.623) both live there. Their spreads are no help
either — 0.017 and 0.047, both tiny. The **only** signal that separates them is
topic coherence: test 2's five rows are all `house-property.md`, test 8's are
scattered across three files.

That is the whole argument for reading three signals instead of one, and it is
also why a score floor alone cannot police scope. See test 8.

---



## 1. Plain paraphrase

```bash
npm run search -- "is my festival bonus taxable?"
```

**Expect:** rank 1 = *What counts as salary income on e-Return?*
(`ay-2025-26/salary-income.md`), roughly **0.60–0.75**.

**Verifies:** the pipeline works end to end — the query embedding and the corpus
embeddings live in the same coordinate system.

**Why not 0.95:** the chunk and the question say the same thing in different
words. Only near-identical text reaches the 0.9s. If this scores 0.95 you have
accidentally quoted the corpus back at itself.

**Fails if:** rank 1 is from a different file. Then your chunking cut the salary
section badly — nothing downstream can repair that.

**Actual first run: this FAILED** (see "Reading the output" above). Salary landed
at rank 5, behind three slab chunks. Leave it failing for now — it is the target
of the chunking ablation, and a test that already passes teaches you nothing when
you change the chunker.

---



## 2. Heavy paraphrase — almost no shared words

```bash
npm run search -- "money I get from renting out my flat"
```

**Expect:** a `house-property.md` chunk at rank 1, roughly **0.50–0.70**.

**Verifies:** the thing keyword search cannot do. Your question contains
*renting* and *flat*; the corpus says *house property income* and *rental
income*. Nearly zero literal overlap.

A `LIKE '%flat%'` query returns nothing here. Cosine returns the right chunk.
That difference is the entire reason embeddings exist in this project.

**Fails if:** the top hits are unrelated and bunched together. Then your corpus
genuinely lacks the content, which is a Phase 2 problem, not a Phase 3 one.

---



## 3. Process question — must come from `shared`

```bash
npm run search -- "how do I submit my return?"
```

**Expect:** rank 1 from `rules/shared/corpus/` — `filing-process.md`
(*How do I submit after payment?* or *What are the steps to file a regular
e-Return online?*). The year column must read `shared`.

**Verifies:** the `assessment_year IS NULL` branch of the WHERE clause.

Filing works the same way whichever year you are filing for, so process content
carries no year. If that branch were broken, shared chunks would be filtered out
the moment a year is supplied — and every "how do I…" question would return rate
tables instead.

**Fails if:** rank 1 has a year tag. Read the `WHERE` clause in
`lib/rag/search.ts` again.

---



## 4. Year filter — 2026-27

```bash
npm run search -- "what are the tax slabs?" --year 2026-27
```

**Expect:** rank 1 = *What are the slab bands and rates for 2026-27?*
Then scan **all five** rows: the year column shows only `2026-27` or `shared`.

**Verifies:** the filter excludes the *other* year. This is the check that
matters most in the whole sheet.

**Fails if:** a single `2025-26` row appears anywhere in the five. That is a
repealed rate about to be quoted as current — the exact failure this project
exists to prevent.

---



## 5. Same question, other year

```bash
npm run search -- "what are the tax slabs?" --year 2025-26
```

**Expect:** rank 1 = *What are the slab bands and rates for **2025-26***. No
`2026-27` rows anywhere.

**Verifies:** the filter works in both directions, not just for the year that
happens to sort first. Same question, different answer, and the *only* thing
that changed is a parameter — no model involved in the switch.

This pair (4 and 5) is what makes the multi-year design real rather than
aspirational.

---



## 6. No year filter — the collision

```bash
npm run search -- "what are the tax slabs?"
```

**Expect:** 2025-26 and 2026-27 slab chunks **interleaved**, with very close
scores.

**Verifies:** why Phase 4 must always pass a year.

Both years describe slabs in near-identical language, so their embeddings sit
almost on top of each other. Cosine cannot tell you which one the user meant —
that is not information contained in the question. Only the filter can.

Watch how small the gap between the two years is. That is how easily a
year-blind system would quote the wrong rate.

---



## 7. Near-duplicate of a heading — the score ceiling

```bash
npm run search -- "I changed my mobile number, what should I do?"
```

**Expect:** rank 1 = *I changed my mobile number — what now?*
(`shared/registration.md`), scoring **above 0.80**.

**Verifies:** what "close" actually looks like at the top of the range, so you
have a reference point for every other test.

Also worth noting: this is where prepending the heading to the chunk body pays
off — the heading is the part your question resembles.

**Actual first run: 0.758 — FAILED the stated 0.80 bar.** The bar was set from a
guess, not measurement; the real ceiling in this corpus turned out to be test
10's 0.865 (see the calibration scale in "Reading the output").

But the *shape* is the cleanest on the sheet, and that is what the test was
really for:

```
1.  0.758   registration.md
2.  0.551   registration.md
3.  0.509   registration.md
4.  0.459   payments.md         <- below floor
5.  0.455   filing-process.md   <- below floor
```

**Spread 0.303** — a cliff after rank 1, with ranks 4 and 5 falling below the
floor entirely. Compare test 9's spread of 0.011. A confident retrieval is
roughly **27x more spread out** than a failed one. That ratio, not the absolute
score, is the durable signal.

---



## 8. Out of scope, but the corpus knows it

```bash
npm run search -- "what is the corporate tax rate?"
```

**Expect:** genuinely uncertain — and that is why it is on the sheet.

`shared/corpus/out-of-scope.md` explicitly lists *company or firm taxation* as
not covered. So one of two things happens:

- **Rank 1 is *What this assistant does not cover*** — the corpus answers
correctly, and the answer is a refusal. Best case.
- **Rank 1 is some unrelated rate chunk, everything under ~0.5** — the floor
catches it instead.

**Verifies:** whether an explicitly-written scope boundary is retrievable, which
is a design question about your corpus, not about the code.

Record which one you got. It changes how Phase 4's refusal path gets written: a
retrieved scope chunk lets the app explain *why* it can't help, which is much
better than a bare "I don't know."

### Actual first run: NEITHER. This is the one real defect the sheet found.

```
1.  0.623   minimum-tax.md 2026-27
2.  0.603   minimum-tax.md 2025-26
3.  0.589   thresholds.md  2026-27
4.  0.581   thresholds.md  2025-26
5.  0.576   slabs.md       2026-27
```

Two things went wrong at once.

**The scope chunk never appeared.** `out-of-scope.md` explicitly names *company
or firm taxation* as excluded — and it did not crack the top five. It is a long
prose paragraph listing eight different excluded topics, so it becomes one
vector averaged across all eight. Exactly the dilution that sank test 1.

**The top score is 0.623, above the 0.5 floor.** So in Phase 4 this question
*reaches the model*, carrying five chunks about minimum tax and thresholds. The
model will then write a fluent, confident, invented corporate tax rate — the
precise failure the floor exists to prevent.

Note that the two diagnostic columns already caught it: spread 0.047, topics
scattered. **The floor does not look at either.** It reads one number, the top
score, and 0.623 clears it.

Three candidate fixes, cheapest first — this is a Phase 4 decision, so record it
rather than fixing it now:

1. **Split `out-of-scope.md`** one excluded topic per chunk, so "company
   taxation" gets its own vector. Cheap, and makes the refusal *explanatory*.
2. **Raise the floor.** But test 2 passed at 0.613, so anything above ~0.6 would
   start refusing correct answers. The two overlap — a floor alone cannot
   separate them.
3. **Add a spread check** next to the floor: refuse when rank 1 minus rank 5 is
   under ~0.05, however high the top score. Uses the signal you already have.

---



## 9. True junk — nothing related exists

```bash
npm run search -- "best biryani restaurant in Dhaka"
```

**Expect:** five rows, top score around **0.30–0.45**, all five bunched within
about 0.05 of each other. Every one marked `← below floor`.

**Verifies:** the single most important fact about vector search.

`ORDER BY distance LIMIT 5` **always** returns five rows if five rows exist. The
database has no concept of "nothing relevant here." It sorts and hands you the
top of the list. Nothing in cosine similarity ever says *no match*.

Feed those five weak chunks to an LLM and it will write a fluent, confident,
entirely invented answer. That is the most common failure mode in RAG systems.

The only defence is the number you already have: the score. Below
`RETRIEVAL_SCORE_FLOOR` (0.5), Phase 4 never calls the model.

**Compare the shape** to test 1: one clear winner with a drop behind it, versus
a flat plateau. You can tell "found it" from "found nothing" by shape alone,
before reading a single heading.

---



## 10. Keywords vs a sentence

```bash
npm run search -- "investment rebate"
npm run search -- "how is the investment rebate calculated?"
```

**Expect:** both find rebate chunks. The **full question usually scores higher**,
often by 0.05–0.15.

**Verifies:** embedding models are trained on sentences, not search keywords.
Two bare words carry less signal than a phrased question, so they land in a
vaguer region of the space.

**Consequence for Phase 5:** a user typing `rebate 2026` into the Ask box will
retrieve worse than one typing a question. If that turns out to matter, the fix
is prompt-side — expand short queries before embedding — not a different model.

---



## Record your runs



### How to fill each column


| Column          | When               | Basis                                                                                                           |
| --------------- | ------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Predicted**   | **before** running | Which corpus file would a human look in? Guess the file, not the score.                                         |
| **Actual**      | after              | The file on output row 1.                                                                                       |
| **Score**       | after              | The number on output row 1.                                                                                     |
| **Spread**      | after              | rank 1 score **minus** rank 5 score. Do the subtraction — this is how confident retrieval was.                  |
| **Same topic?** | after              | Are all five paths the same file/topic? yes / no                                                                |
| **Pass?**       | after              | Did **this test's own claim** hold — see the condition column. Not "did I get results": you always get results. |


The Predicted column is the one that does the work. Skip it and every result
looks reasonable in hindsight.

### Pass conditions differ per test

Read **all five rows** for tests 4 and 5 — one leaked row from the wrong year is
a fail, because that is a repealed rate about to be quoted as current.


| #   | Question                     | Predicted rank 1                                   | Pass condition                                                     | Actual rank 1                                                                                   | Score        | Spread                  | Same topic?   | Pass?    |
| --- | ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------ | ----------------------- | ------------- | -------- |
| 1   | festival bonus               | What counts as salary income on e-Return?          | rank 1 is `salary-income.md`                                       | `slabs.md` 2025-26                                                                              | 0.589        | 0.024                   | no — 3 topics | **FAIL** |
| 2   | renting out my flat          | How do I enter house property income on e-Return?  | rank 1 is `house-property.md`                                      | `house-property.md` 2025-26                                                                     | 0.613        | 0.017                   | yes — all 5   | **PASS** |
| 3   | how do I submit              | How do I submit after payment?                     | rank 1's year column reads `shared`                                | `filing-process.md` shared                    | 0.752        | 0.096         | yes — all 5 `shared` | **PASS** |
| 4   | slabs `--year 2026-27`       | What are the slab bands and rates for 2026-27?     | **no** 2025-26 row anywhere in the five                            | `slabs.md` 2026-27                            | 0.741        | 0.100         | yes — all 5 2026-27  | **PASS** |
| 5   | slabs `--year 2025-26`       | What are the slab bands and rates for 2025-26?     | **no** 2026-27 row anywhere in the five                            | `thresholds.md` 2025-26                       | 0.783        | 0.150         | yes — all 5 2025-26  | **PASS** |
| 6   | slabs, no year               | Either year's “What are the slab bands and rates…” | observation only — note how close the two years score              | `thresholds.md` **2025-26**                   | 0.783        | 0.090         | yes — rates          | observed |
| 7   | mobile number                | I changed my mobile number — what now?             | score **above 0.80** (the only test where the number is the claim) | `registration.md` shared                      | 0.758        | **0.303**     | yes — 3 of 5         | **FAIL** — bar was too high; shape was perfect |
| 8   | corporate tax rate           | What this assistant does not cover                 | either outcome passes — record **which**                           | `minimum-tax.md` 2026-27                      | 0.623        | 0.047         | no — scattered       | **FAIL** — neither outcome; scope chunk absent AND above floor |
| 9   | biryani                      | No meaningful match (all below floor)              | top score **under 0.5**, all five marked `← below floor`           | `minimum-tax.md` 2025-26                      | 0.392        | **0.011**     | no — scattered       | **PASS** |
| 10  | rebate — 2 words vs question | A rebate-calculation chunk (likely 2025-26)        | the full sentence scores **higher** than the two bare words        | `rebate.md` 2025-26 (both runs)               | 0.780 / **0.865** | 0.088 / 0.143 | yes — all 5 `rebate.md` | **PASS** |


**Write the spread as the answer, not the sum.** `0.752 − 0.656` is the working;
`0.096` is the number that lets you compare rows. Once computed, the column pays
off immediately: test 7 scores **0.303** and test 9 scores **0.011**. A confident
retrieval is roughly **27x more spread out** than a failed one — and no absolute
score would have told you that.

Also note row 2: the *smallest* spread on the sheet, and a clean pass. That is
why "Same topic?" is a separate column. Spread alone would have told you the
wrong thing.

**Result: 6 pass, 1 observation, 3 fail (tests 1, 7, 8).**

---

## Findings from the first full pass

Things the sheet surfaced that were not in anybody's prediction. These are the
reason the exercise was worth doing.

### 1. The score floor does not police scope — carry this into Phase 4

Test 8's top score is **0.623, above the 0.5 floor**, while the correct answer
(*What this assistant does not cover*) is nowhere in the top five. So the
out-of-scope question sails through to the model with five irrelevant chunks
attached.

Worse, it cannot be fixed by moving the floor: test 2 is a *correct* retrieval at
0.613. Raising the floor to catch 0.623 would refuse a working answer. **The two
overlap.** Fix it in the corpus (split `out-of-scope.md`) or add a second signal
(spread), not by tuning one number.

### 2. Year-blind search silently prefers the OLD year

Test 6, no `--year` flag:

```
1.  0.783   thresholds.md  2025-26   <- last year wins
2.  0.741   slabs.md       2026-27
```

Not because 2025-26 is more correct — purely because of how that file happens to
be worded. A year-blind app would quote **last year's rates by default**, and
would look perfectly healthy while doing it.

This is why the year filter is mandatory rather than an optimisation. Phase 4
must always pass a year; there is no safe default.

### 3. The same question surfaces a different FILE in each year

| query | filter | rank 1 |
|---|---|---|
| "what are the tax slabs?" | `--year 2026-27` | `slabs.md` |
| "what are the tax slabs?" | `--year 2025-26` | **`thresholds.md`** |

Both pass their test — no year leaked. But the winning *topic* changed, because
the two folders word the same rules differently. Worth knowing before you trust
rank 1 blindly: retrieval is sensitive to corpus prose, not just corpus facts.

### 4. Phrasing is worth more than a model upgrade

Test 10, same intent, two phrasings:

```
"investment rebate"                        -> 0.780
"how is the investment rebate calculated?" -> 0.865   (+0.085)
```

A full sentence beat two keywords by more than the entire gap between "strong"
and "weak" in the calibration table. Users typing `rebate 2026` into the Ask box
will retrieve measurably worse than users typing a question — a Phase 5 UI
problem (expand short queries before embedding), not a model problem.

---



## What to do with failures


| Symptom                                     | Where the bug is                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Wrong year appears in filtered results      | `WHERE` clause in `lib/rag/search.ts`                                      |
| `shared` chunks never appear                | the `assessment_year IS NULL` branch                                       |
| Right file, wrong section wins              | chunking — the `##` split in `lib/rag/chunk.ts`                            |
| Every score is low and flat, for everything | wrong embedding model, or you edited the corpus and forgot `npm run index` |
| Correct content simply missing              | Phase 2 gap — the corpus does not cover it                                 |
| Decent top score, but the five rows disagree | not a bug — retrieval genuinely found nothing. The floor will not catch this (test 8); it needs a spread check or a better-cut scope chunk |
| One long chunk that "contains the answer" never wins | dilution — one chunk is one averaged vector. Split it (tests 1 and 8) |


That last row is worth stressing: **retrieval cannot return what was never
written.** Some failures here are content bugs, and no amount of tuning fixes
them.

---



## Next

These ten, plus a handful of your own, become `eval/questions.json` in Phase 6 —
where "I ran them and they looked fine" turns into `npm run eval` printing a hit
rate. Keep the ones that surprised you; those are the valuable test cases.