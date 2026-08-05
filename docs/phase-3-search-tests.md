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

| | |
|---|---|
| `0.684` | cosine similarity, 0..1 |
| the bar | same number, so gaps are visible at a glance |
| the heading | which chunk won |
| the path + year | **check this** — most bugs show up here, not in the score |

**The gap matters more than the top score.** A clear drop after rank 1 or 2 means
retrieval found something specific. Five near-identical scores means it found
nothing and is handing you its five least-bad rows.

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

**Expect:** rank 1 from **`rules/shared/corpus/`** — `filing-process.md`
(*How do I submit after payment?* or *What are the steps to file a regular
e-Return online?*). The year column must read **`shared`**.

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
(`shared/registration.md`), roughly **0.80–0.92**. The highest score on this
sheet.

**Verifies:** what "close" actually looks like at the top of the range, so you
have a reference point for every other test.

Compare this to test 1. Both are correct retrievals; one scores ~0.68, one
scores ~0.85. Now you know that 0.68 is a *good* score in this corpus, not a
mediocre one. Without this test you have no scale.

Also worth noting: this is where prepending the heading to the chunk body pays
off — the heading is the part your question resembles.

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

| # | Question | Predicted rank 1 | Actual rank 1 | Score | Year col | Pass? |
|---|---|---|---|---|---|---|
| 1 | festival bonus | What counts as salary income on e-Return? | | | 2025-26 | |
| 2 | renting out my flat | How do I enter house property income on e-Return? | | | 2025-26 or 2026-27 | |
| 3 | how do I submit | How do I submit after payment? | | | `shared` | |
| 4 | slabs `--year 2026-27` | What are the slab bands and rates for 2026-27? | | | 2026-27 or `shared`; no 2025-26 | |
| 5 | slabs `--year 2025-26` | What are the slab bands and rates for 2025-26? | | | 2025-26 or `shared`; no 2026-27 | |
| 6 | slabs, no year | Either year's “What are the slab bands and rates…” | | | both years expected | |
| 7 | mobile number | I changed my mobile number — what now? | | | `shared` | |
| 8 | corporate tax rate | What this assistant does not cover | | | `shared` | |
| 9 | biryani | No meaningful match (all below floor) | | | all below floor | |
| 10 | rebate — 2 words vs question | A rebate-calculation chunk (likely 2025-26) | | | 2025-26 or 2026-27 | |

---

## What to do with failures

| Symptom | Where the bug is |
|---|---|
| Wrong year appears in filtered results | `WHERE` clause in `lib/rag/search.ts` |
| `shared` chunks never appear | the `assessment_year IS NULL` branch |
| Right file, wrong section wins | chunking — the `##` split in `lib/rag/chunk.ts` |
| Every score is low and flat, for everything | wrong embedding model, or you edited the corpus and forgot `npm run index` |
| Correct content simply missing | Phase 2 gap — the corpus does not cover it |

That last row is worth stressing: **retrieval cannot return what was never
written.** Some failures here are content bugs, and no amount of tuning fixes
them.

---

## Next

These ten, plus a handful of your own, become `eval/questions.json` in Phase 6 —
where "I ran them and they looked fine" turns into `npm run eval` printing a hit
rate. Keep the ones that surprised you; those are the valuable test cases.
