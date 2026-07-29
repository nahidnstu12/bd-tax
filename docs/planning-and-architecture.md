# BD Tax Assistant — Planning & Architecture

**Status:** DRAFT · 2026-07-29
**Purpose:** personal tax-filing assistant for Bangladesh individual taxpayers, built primarily as a production-shaped learning project for RAG / AI engineering.
**Deployment:** local only (own machine). Not public, not multi-user.

---

## 1. Mental model

**It is a calculator with a librarian attached. The AI is only the voice.**

```
┌─────────────────────────────────────────────────┐
│  LANGUAGE    LLM — explains, finds, translates   │  never decides, never computes
├─────────────────────────────────────────────────┤
│  MATH        deterministic code                  │  every taka originates here
├─────────────────────────────────────────────────┤
│  FACTS       rules-as-data + your own figures    │  versioned by assessment year
└─────────────────────────────────────────────────┘
```

**Golden rule:** every number in any output traces back to either a config value or a user input. Nothing is model-generated. If a figure cannot be pointed at, it is a bug.

### Two question types, two paths

| User asks | Path | Answer comes from |
|---|---|---|
| "What do I owe?" | Calculator | user inputs × year config |
| "Is festival bonus taxable?" | RAG | corpus chunk, with citation |
| "Should I put more in DPS?" | Both | RAG rule + config ceiling + code math + LLM narration |

**v1 does not auto-classify intent.** Two separate tabs — *Calculate* and *Ask*. Intent routing is an extra failure mode with no user benefit at this scale.

### What RAG is (and is not)

RAG does not teach the model the documents. **It pastes relevant text into the question.** Chunking, embeddings and top-k exist only to decide *which* text gets pasted.

Therefore: RAG can only return what someone already wrote down. Anything requiring computation over personal data is the calculator's job, and no amount of tuning changes that.

---

## 2. Scope

### In scope (v1)

- Resident individual taxpayer, salaried, single employer
- Salary income (basic, allowances, bonus)
- House property income
- Bank / savings interest
- Investment rebate (DPS, insurance, savings certificates, etc.)
- Standard exemptions and thresholds
- Minimum tax
- Assessment-year selector, minimum two years loaded

### Out of scope (v1)

- Business / professional income
- Capital gains
- Foreign income
- Agricultural income
- Non-resident taxpayers
- Surcharge on net worth
- Company / firm taxation
- Actual e-return submission (guidance only — never files anything)

**Out-of-scope inputs must make the app say so and stop.** Refusing is a feature; it is most of what makes the tool trustworthy.

### Non-goals

- Not a public service, not multi-tenant, no auth in v1
- Not tax advice — guidance only, verify against the official form
- Not a chatbot for arbitrary tax questions beyond the curated corpus

---

## 3. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | UI + API in one place |
| Database | **Postgres 17 + pgvector** | docker, port `5433` to avoid clashing with `pos_db` |
| Embeddings | **Ollama — `nomic-embed-text`** | 768 dims, **runs locally — personal data never leaves the machine** |
| Generation | **FreeLLMAPI** (`/v1`, OpenAI-compatible) | free-tier pool; only ever sees public rules + anonymised figures |
| DB client | `pg` (node-postgres), raw SQL | SQL stays visible — this is a learning project |
| Front-matter | `gray-matter` | parses year/topic tags on corpus files |
| Scripts | `tsx` | indexing and eval run outside Next.js |

Deliberately **not** used: LangChain (hides the mechanics being learned), hosted vector DBs (unnecessary below ~10k chunks), any auth/deploy layer (local only).

### Why two OpenAI clients

Ollama exposes an OpenAI-compatible endpoint, so one SDK serves both:

```ts
export const embedder = new OpenAI({          // local — private data
  baseURL: process.env.OLLAMA_BASE_URL,       // http://localhost:11434/v1
  apiKey: 'ollama',
});

export const chat = new OpenAI({              // free tier — public rules only
  baseURL: process.env.FREELLMAPI_BASE_URL,   // http://localhost:3001/v1
  apiKey: process.env.FREELLMAPI_KEY,
});
```

---

## 4. Data model

Three distinct data categories. They must not be mixed.

### 4.1 Rules-as-data — versioned, never mutated

```
rules/
  ay-2024-25/
    config.json          # slabs, thresholds, rebate ceilings, minimum tax
    corpus/*.md          # curated prose, one topic per file
  ay-2025-26/
    config.json
    corpus/*.md
```

`config.json` shape (illustrative — **actual figures must be transcribed by hand from the Finance Act / NBR and verified**):

```jsonc
{
  "assessment_year": "2025-26",
  "source": "Finance Act …",
  "slabs": [
    { "upto": null, "rate": 0.00, "label": "tax-free threshold" }
    // ascending bands; last band upto: null
  ],
  "thresholds": {
    "general": null,
    "female_or_senior": null,
    "disabled": null
  },
  "rebate": {
    "eligible_investment_cap_pct_of_income": null,
    "absolute_cap": null,
    "rebate_rate": null
  },
  "minimum_tax": { "dhaka_city": null, "other_city": null, "rest": null }
}
```

**Never let a model produce or "remember" a tax figure.** These are transcribed and reviewed by a human, once per year.

### 4.2 Corpus — markdown with front-matter

```markdown
---
assessment_year: "2025-26"
topic: salary-income
source_url: https://nbr.gov.bd/...
---

## Festival bonus
Festival bonus received from an employer is treated as salary income …
```

20–30 pages, hand-curated. **PDF/OCR ingestion is explicitly deferred** — NBR PDFs are often scanned images with Bangla text and tables, and fighting that early would consume the whole project without teaching any RAG.

### 4.3 Private returns — the test set

```
private/returns/2023-24.json     # GITIGNORED
{
  "assessment_year": "2023-24",
  "inputs": { "salary_basic": 0, "house_rent_allowance": 0, ... },
  "filed_result": { "total_tax": 0 }
}
```

Never embedded. Never sent to FreeLLMAPI. Used by the calculator and the replay eval.

### 4.4 Postgres schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id              bigserial PRIMARY KEY,
  source_file     text NOT NULL,
  heading         text,
  content         text NOT NULL,
  assessment_year text,
  embedding       vector(768) NOT NULL,   -- LOCKED to nomic-embed-text
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (assessment_year);
```

`vector(768)` is a hard contract with the embedding model. Changing models means a migration **and** a full re-index.

---

## 5. Architecture

```
                ┌── CALCULATE TAB ───────────────────────────────┐
 your figures ─►│ validate → calc(year, inputs) → breakdown      │
                │                     │                          │
                │                     ▼                          │
                │  LLM: "explain this breakdown in plain         │
                │  language. Use ONLY these numbers."            │
                └────────────────────────────────────────────────┘

                ┌── ASK TAB ─────────────────────────────────────┐
   question ───►│ embed (Ollama) → pgvector search               │
                │   WHERE assessment_year = $year                │
                │   → top 5 + scores                             │
                │   → best score < 0.5 ?  →  "not covered"       │
                │   → else paste into prompt → LLM → cite file   │
                └────────────────────────────────────────────────┘
```

**The calculator has zero dependency on the LLM.** Remove the AI entirely and tax computation still works. That is the test of whether the layering is correct.

### Retrieval query

```sql
SELECT source_file, heading, content,
       1 - (embedding <=> $1::vector) AS score
FROM chunks
WHERE ($2::text IS NULL OR assessment_year = $2)
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

`<=>` = cosine distance; `1 - distance` = similarity.

### Two mandatory guards on the Ask path

Cosine search **always returns something**, even when nothing relevant exists. Without guards, an out-of-scope question gets answered confidently and wrongly.

1. **Score floor** — best score < `0.5` ⇒ do not call the model at all; reply "not covered by the loaded rules."
2. **Prompt instruction** — "answer using ONLY the context; if it does not contain the answer, say you don't know."

Both. This is the main thing separating a demo from something usable.

### Hybrid path example

> "I earn X and put 50,000 in DPS — can I save more tax?"

```
1. RAG   → retrieve the rebate rule chunk (for citation/context)
2. CODE  → read the ceiling from config.json  (NOT from the model)
3. CODE  → compute eligible ceiling vs actual 50,000
4. LLM   → narrate the two finished numbers
```

The model performs no arithmetic at any point.

---

## 6. Yearly updates — version, never edit

Rules are data, so a new year is a new folder, not a code change.

**Annual ritual (~2 hours, when the Finance Act lands, around June/July):**

1. `cp -r rules/ay-2025-26 rules/ay-2026-27`
2. Edit the changed figures in `config.json`; update affected corpus files
3. Re-index (`assessment_year` tag keeps years isolated)
4. **Re-run eval — previous years must still reproduce exactly**
5. Diff old vs new `config.json` → a free "what changed this year" summary

**Old years are never mutated.** If rules are edited in place, the replay eval breaks and the only proof of correctness is lost.

---

## 7. Privacy model

| Data | Where it goes |
|---|---|
| Public tax rules (corpus) | Ollama (embedding) + FreeLLMAPI (generation) — fine |
| Personal figures (income, TIN, NID, bank) | **local only** — Ollama embeddings if needed; never FreeLLMAPI |
| Calculator output sent for narration | **derived, anonymised values only** (e.g. "total income: X, rebate: Y") — no identifiers |

Free-tier providers may train on inputs. `private/` is gitignored and never indexed.

---

## 8. Evaluation — the spine

Written before the features, run on every change.

```
npm run eval

  ✓ replay ay-2023-24   → 47,250   expected 47,250
  ✓ replay ay-2024-25   → 61,800   expected 61,800
  ✓ retrieval hit rate  → 18/20
  ✗ q14 "house rent exemption" — expected house-property.md, got salary-income.md
```

**Two eval types:**

1. **Replay** — feed a previous year's inputs, assert the calculator reproduces the tax actually filed, to the taka. This is real ground truth, and it is unusual for a side project to have any.
2. **Retrieval hit rate** — ~20 questions with an expected source file. Measures whether the right chunk reached the top 5 — *not* whether the prose looked nice.

```jsonc
{ "q": "Is festival bonus taxable?", "expect_file": "salary-income.md" }
{ "q": "What is the rebate ceiling?", "expect_file": "rebate.md" }
```

Retrieval hit rate is what makes chunk-size and top-k experiments measurable instead of guesswork.

---

## 9. Project structure

```
bd-tax/
  docs/planning-and-architecture.md     ← this file
  docker-compose.yml                    # pgvector
  db/schema.sql
  rules/ay-2024-25/{config.json,corpus/*.md}
  rules/ay-2025-26/{config.json,corpus/*.md}
  private/returns/*.json                # gitignored
  app/
    page.tsx                            # Calculate | Ask tabs
    api/ask/route.ts                    # retrieve + stream
    api/calculate/route.ts
  lib/
    db.ts  embed.ts  search.ts  prompt.ts  llm.ts
    calc/{index.ts,slabs.ts,rebate.ts,minimumTax.ts}
  scripts/
    index-corpus.ts   # tsx — NOT a route (would time out)
    search.ts         # CLI: print top-5 + scores
    eval.ts
```

### Environment

```bash
DATABASE_URL=postgres://postgres:secret@localhost:5433/ragdb
OLLAMA_BASE_URL=http://localhost:11434/v1
EMBED_MODEL=nomic-embed-text
FREELLMAPI_BASE_URL=http://localhost:3001/v1
FREELLMAPI_KEY=
CHAT_MODEL=auto
RETRIEVAL_SCORE_FLOOR=0.5
```

---

## 10. Build phases

| Phase | Deliverable | AI involved |
|---|---|---|
| **1** | docker + schema + `config.json` for one year + calculator + **replay eval matching both filed returns to the taka** | none |
| **2** | Curate corpus markdown, tagged by year | none |
| **3** | `index-corpus.ts` → chunks in pgvector; `search.ts` prints top-5 + scores | embeddings |
| **4** | `/api/ask` — retrieval + score floor + citations + "I don't know" | yes |
| **5** | Calculate tab + LLM narration of the breakdown | yes |
| **6** | Second year loaded, year selector, config diff view | — |

**Phase 1 is the gate.** If the calculator cannot reproduce what was actually filed, nothing built on top is worth anything — and it is pure logic, fully testable, with no AI uncertainty.

**Phase 3 stop-and-stare:** run `search.ts` against a dozen questions and read the raw scores before building any UI. That is where the mental model locks in.

---

## 11. Known risks

| Risk | Mitigation |
|---|---|
| Transcribed tax figures are wrong | Replay eval against two filed returns; human review of `config.json` |
| Corpus becomes stale after Finance Act | Year-folder versioning; annual ritual documented above |
| Out-of-scope question answered confidently | Score floor + "I don't know" prompt + explicit scope refusal |
| Bangla PDF extraction rabbit hole | Deferred entirely; corpus is hand-curated in v1 |
| Personal data leaking to free-tier providers | Local Ollama embeddings; `private/` gitignored and never indexed |
| Embedding model swap breaks the index | `vector(768)` locks it; treat a change as migration + full re-index |

---

## 12. Open questions

- Which assessment years to load first — most recent two, or the two matching the filed returns?
- Chunk strategy: split on `##` headings, or fixed ~800 chars with overlap? *(decide empirically in Phase 3 using retrieval hit rate)*
- Does the Ask tab need per-year filtering in the UI, or infer from the selected year globally?
- Should out-of-scope income types be detected at input validation, or only at the point of calculation?
- Is a general chat model good enough for Bangla-language explanation, or does it need an explicit model pin?

---

## 13. Related notes

- Learning warm-up recommended first: the same `lib/` RAG module built against `pharmacy-pos/doc/` — same code, zero stakes, one weekend.
- Design principle shared with `pharmacy-pos/doc/invoice-scan-flow.md`: the model reads and narrates; code computes and decides.
