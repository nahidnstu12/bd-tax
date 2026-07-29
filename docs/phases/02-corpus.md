# Phase 2 — The corpus

**Goal:** a small, clean, hand-curated body of markdown the Ask tab will retrieve from.
**AI involved:** none.
**Effort:** one afternoon.

> **PDF and OCR ingestion is explicitly out of scope.** NBR PDFs are frequently scanned
> images with Bangla text and tables. Fighting that would consume the project and teach
> nothing about retrieval. Transcribe by hand; automate ingestion later, as its own
> separate exercise.

---

## 1. Two kinds of content

| Kind | Example | Year tag | Risk |
|---|---|---|---|
| **Process** | how to register, why source tax shows unverified, payment methods | `null` — year-independent | **low** — no numbers, changes rarely |
| **Rules** | what qualifies for rebate, how HRA exemption works | the specific year | higher — must match the Act |

**Start with process content.** It is already researched
([`research/etax-filing-guide.md`](../research/etax-filing-guide.md)), it cannot produce a
wrong number, and it is enough to build and test the entire pipeline in Phase 3 before
you touch a single tax rate.

---

## 2. Layout

```
rules/
  shared/corpus/            year-independent (process)
    registration.md
    filing-process.md
    payments.md
    documents.md
    source-tax-verification.md
  ay-2025-26/corpus/        year-specific (rules)
    salary-income.md
    house-property.md
    rebate.md
    minimum-tax.md
    thresholds.md
  ay-2026-27/corpus/
    ...
```

`shared/` chunks are indexed with `assessment_year = NULL` and are returned for **every**
year. Year folders are filtered to the selected year.

---

## 3. File format

Front-matter, then prose:

```markdown
---
assessment_year: "2025-26"     # omit entirely for shared/ files
topic: rebate
source: "Finance Act 2025, s.78"   # or the NBR manual for process content
source_url: https://...
---

## What qualifies for the investment rebate

Twelve categories qualify: life insurance premium, deposit pension scheme (DPS),
approved Sanchayapatra, ...

## How the rebate is calculated

The rebate is the lowest of three amounts: 3% of total income, 15% of eligible
investment, or 10,00,000 taka...
```

### Authoring rules that make retrieval work

These matter more than anything you will do in Phase 3.

1. **One idea per `##` heading.** Chunking splits on headings — a heading covering three
   topics produces a chunk that matches all three badly.
2. **Make the heading a question someone would ask.** "What qualifies for the investment
   rebate" retrieves better than "Rebate — general."
3. **Repeat context inside the chunk.** Chunks are retrieved alone, without the file
   around them. Write "the investment rebate" not "it."
4. **Keep chunks 150–500 words.** Shorter loses context; longer dilutes the embedding.
5. **Numbers in prose are for explanation only.** The calculator reads
   `config.json`, never the corpus. If they disagree, `config.json` wins — but keep them
   in sync or the assistant will contradict itself.
6. **One file per topic.** Easier to cite, easier to update per year.

---

## 4. Topics to write

### `shared/` — process (from the NBR manual, already researched)

| File | Covers |
|---|---|
| `registration.md` | TIN + biometric-verified SIM, OTP, password, change mobile number |
| `filing-process.md` | The 7 wizard tabs, heads of income, IT10B triggers, IT-11GA form |
| `payments.md` | Internet banking / card / mobile banking, e-Chalan, Sonali Bank |
| `source-tax-verification.md` | Only Car AIT, iBAS++ salary, Sanchayapatra auto-verify |
| `documents.md` | TIN certificate, acknowledgement, Express Certificate/PSR, challan |

### `ay-<year>/` — rules

| File | Covers |
|---|---|
| `thresholds.md` | Tax-free threshold per category, parent-of-disabled extra |
| `slabs.md` | Band structure and rates |
| `rebate.md` | The 12 eligible categories, lowest-of-three rule, worked example |
| `salary-income.md` | What counts as salary, HRA and medical exemptions, non-cash benefits |
| `house-property.md` | Rental income treatment |
| `minimum-tax.md` | Amounts, who it applies to |
| `deadlines.md` | Filing deadline, income year dates |

**About 12 files, 20–30 chunks.** That is plenty. Resist the urge to be exhaustive — a
small accurate corpus beats a large vague one, and you can measure the difference in
Phase 6.

---

## 5. Scope boundary content

Write one file that says what the assistant **cannot** do:

```markdown
---
topic: out-of-scope
---

## What this assistant does not cover

This assistant covers resident individual taxpayers with salary income, house property
income, and bank interest. It does not cover business or professional income, capital
gains, foreign income, agricultural income, non-resident taxpayers, surcharge on net
worth, or company taxation. For those, consult a tax professional.
```

This gives retrieval something correct to return for out-of-scope questions, instead of
the least-irrelevant rule chunk. It works alongside the score floor in Phase 4 — belt and
braces.

---

## 6. A validation script

Cheap insurance against silent breakage:

```ts
// scripts/lint-corpus.ts   — run with: npx tsx scripts/lint-corpus.ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'

let errors = 0
for (const dir of ['rules/shared/corpus', ...listYearCorpusDirs()]) {
  for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const { data, content } = matter(readFileSync(join(dir, file), 'utf8'))
    const where = `${dir}/${file}`

    if (!data.topic) { console.log(`✗ ${where}: missing topic`); errors++ }
    if (dir.includes('ay-') && !data.assessment_year) {
      console.log(`✗ ${where}: year corpus needs assessment_year`); errors++
    }
    if (!content.includes('## ')) { console.log(`✗ ${where}: no ## headings`); errors++ }

    for (const section of content.split(/^## /m).slice(1)) {
      const words = section.split(/\s+/).length
      if (words > 600) console.log(`! ${where}: a section is ${words} words — consider splitting`)
      if (words < 30)  console.log(`! ${where}: a section is only ${words} words`)
    }
  }
}
process.exit(errors ? 1 : 0)
```

---

## 7. Acceptance criteria

- [ ] Every file has valid front-matter (`topic`, plus `assessment_year` for year folders)
- [ ] Every file uses `##` headings, one idea each
- [ ] Sections are roughly 150–500 words
- [ ] `shared/` process content written — enough to test the pipeline without rate risk
- [ ] An `out-of-scope.md` exists
- [ ] `npx tsx scripts/lint-corpus.ts` passes
- [ ] Numbers in prose match `config.json` for the same year

---

## 8. Yearly maintenance

When a new Finance Act lands:

1. `cp -r rules/ay-<old> rules/ay-<new>` — corpus and config together
2. Edit the figures in `config.json` and the numbers in the corpus prose
3. Re-index (Phase 3)
4. **Re-run the replay eval — old years must still pass**

**Never edit an old year's corpus or config.** The year tag is what keeps a repealed slab
from surfacing in a current-year answer.
