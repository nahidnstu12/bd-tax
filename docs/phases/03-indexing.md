# Phase 3 — Indexing & search

**Goal:** turn the corpus into vectors in Postgres, and search it from the terminal.
**AI involved:** embeddings only (local, via Ollama). No generation yet.
**Effort:** one evening.

> **Stop-and-stare phase.** Before building any UI, run searches and read the raw scores.
> This is where the mental model locks in permanently.

---

## 1. The mental model

**RAG does not teach the model your documents. It pastes relevant text into the question.**

Everything in this phase exists only to decide *which* text gets pasted:

```
question → embed → cosine search → top 5 chunks
```

An embedding is a list of ~768 numbers representing meaning. Two texts about the same
thing land near each other, even with no words in common. That is the entire foundation.

---

## 2. Infrastructure

### Postgres + pgvector

```bash
npm run db:up          # docker compose up -d
npm run db:schema      # applies db/schema.sql
```

Verify:
```bash
docker compose exec db psql -U postgres -d ragdb -c '\d chunks'
```

### Ollama

```bash
ollama pull nomic-embed-text     # 768 dimensions
ollama list                      # confirm it's there
```

**Keep Ollama running** before indexing or searching — a connection-refused error looks
like a code bug but isn't.

### Why local embeddings

Personal tax figures must never reach a hosted provider whose terms may allow training on
inputs. Embeddings run on your machine; only public rule text and anonymised derived
values ever reach FreeLLMAPI (Phase 4).

---

## 3. Dependencies

```bash
npm i openai pg gray-matter
npm i -D @types/pg
```

`.env.local`:
```bash
DATABASE_URL=postgres://postgres:secret@localhost:5433/ragdb
OLLAMA_BASE_URL=http://localhost:11434/v1
EMBED_MODEL=nomic-embed-text
RETRIEVAL_SCORE_FLOOR=0.5
```

---

## 4. Code

### `lib/rag/db.ts`

```ts
import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

/** pgvector accepts a vector literal: '[0.1,0.2,...]' */
export const toVector = (embedding: number[]): string => `[${embedding.join(',')}]`
```

### `lib/rag/embed.ts`

```ts
import OpenAI from 'openai'

// Ollama speaks the OpenAI wire format, so one SDK serves both providers.
const embedder = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL,
  apiKey: 'ollama',              // required by the SDK, ignored by Ollama
})

const MODEL = process.env.EMBED_MODEL ?? 'nomic-embed-text'

export async function embed(text: string): Promise<number[]> {
  const res = await embedder.embeddings.create({ model: MODEL, input: text })
  const vec = res.data[0]?.embedding
  if (!vec) throw new Error('Embedding failed — is Ollama running?')
  return vec
}

export async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (const t of texts) out.push(await embed(t))   // sequential — local, no rate limit
  return out
}
```

### `lib/rag/chunk.ts`

```ts
import matter from 'gray-matter'

export interface Chunk {
  sourceFile: string
  heading: string | null
  content: string
  assessmentYear: string | null
}

/**
 * Split a corpus file on `##` headings — one idea per chunk.
 *
 * The heading is prepended to the chunk body so it is part of what gets embedded:
 * headings carry a lot of the meaning and improve retrieval noticeably.
 */
export function chunkMarkdown(raw: string, sourceFile: string): Chunk[] {
  const { data, content } = matter(raw)
  const year = (data.assessment_year as string | undefined) ?? null

  return content
    .split(/^## /m)
    .slice(1)                                  // drop anything before the first heading
    .map((section) => {
      const [headingLine = '', ...rest] = section.split('\n')
      const heading = headingLine.trim()
      const body = rest.join('\n').trim()
      return {
        sourceFile,
        heading,
        content: `${heading}\n\n${body}`,      // heading is embedded too
        assessmentYear: year,
      }
    })
    .filter((c) => c.content.length > 40)
}
```

### `scripts/index-corpus.ts`

```ts
/**
 * Re-index the whole corpus. Run with: npx tsx scripts/index-corpus.ts
 *
 * NOT a Next.js route — embedding hundreds of chunks takes minutes and would
 * time out a request handler.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { chunkMarkdown } from '../lib/rag/chunk'
import { embed } from '../lib/rag/embed'
import { pool, toVector } from '../lib/rag/db'

function corpusDirs(): string[] {
  const dirs = ['rules/shared/corpus']
  for (const d of readdirSync('rules').filter((x) => x.startsWith('ay-'))) {
    dirs.push(join('rules', d, 'corpus'))
  }
  return dirs.filter(existsSync)
}

async function main() {
  // Full rebuild — the corpus is small and this avoids stale-chunk bugs entirely.
  await pool.query('TRUNCATE chunks RESTART IDENTITY')

  let total = 0
  for (const dir of corpusDirs()) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const path = join(dir, file)
      const chunks = chunkMarkdown(readFileSync(path, 'utf8'), path)

      for (const c of chunks) {
        const vector = await embed(c.content)
        await pool.query(
          `INSERT INTO chunks (source_file, heading, content, assessment_year, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [c.sourceFile, c.heading, c.content, c.assessmentYear, toVector(vector)],
        )
        total++
      }
      console.log(`  ${path} → ${chunks.length} chunks`)
    }
  }

  await pool.query('ANALYZE chunks')   // so the planner uses the HNSW index
  console.log(`\n  ${total} chunks indexed.\n`)
  await pool.end()
}

main()
```

### `lib/rag/search.ts`

```ts
import { embed } from './embed'
import { pool, toVector } from './db'

export interface Hit {
  sourceFile: string
  heading: string | null
  content: string
  assessmentYear: string | null
  score: number
}

/**
 * Cosine search, optionally scoped to one assessment year.
 * Year-independent chunks (assessment_year IS NULL) are ALWAYS included.
 */
export async function search(
  question: string,
  assessmentYear: string | null = null,
  limit = 5,
): Promise<Hit[]> {
  const vector = toVector(await embed(question))

  const { rows } = await pool.query(
    `SELECT source_file, heading, content, assessment_year,
            1 - (embedding <=> $1::vector) AS score
       FROM chunks
      WHERE $2::text IS NULL
         OR assessment_year = $2
         OR assessment_year IS NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
    [vector, assessmentYear, limit],
  )

  return rows.map((r) => ({
    sourceFile: r.source_file,
    heading: r.heading,
    content: r.content,
    assessmentYear: r.assessment_year,
    score: Number(r.score),
  }))
}
```

`<=>` is cosine **distance**, so `1 - distance` is similarity. `ORDER BY` uses distance
(ascending) so the HNSW index is used.

### `scripts/search-cli.ts`

```ts
/** npx tsx scripts/search-cli.ts "is festival bonus taxable?" 2025-26 */
import { search } from '../lib/rag/search'
import { pool } from '../lib/rag/db'

const [question, year] = process.argv.slice(2)
if (!question) { console.log('usage: search-cli "<question>" [year]'); process.exit(1) }

const hits = await search(question, year ?? null)
console.log(`\n  "${question}"${year ? `  (AY ${year})` : ''}\n`)
for (const h of hits) {
  console.log(`  ${h.score.toFixed(3)}  ${h.sourceFile}  ${h.heading ?? ''}`)
}
console.log('')
await pool.end()
```

Add to `package.json`:
```json
"index": "tsx scripts/index-corpus.ts",
"search": "tsx scripts/search-cli.ts"
```

---

## 5. Run it, then stare at it

```bash
npm run index
npm run search -- "is festival bonus taxable?" 2025-26
```

```
  0.847  rules/ay-2025-26/corpus/salary-income.md  What counts as salary income
  0.702  rules/ay-2025-26/corpus/salary-income.md  Non-cash benefits
  0.418  rules/shared/corpus/filing-process.md     Heads of income
  0.331  rules/ay-2025-26/corpus/rebate.md         What qualifies for the rebate
  0.298  rules/ay-2025-26/corpus/house-property.md Rental income
```

**Spend real time here.** Try a dozen questions:

- A question the corpus answers well → expect a top score above ~0.75
- A question it answers poorly → scores bunched around 0.4–0.5
- A question it cannot answer at all ("what is the corporate tax rate?") → **everything
  below ~0.45, and yet it still returns five rows**

That last case is the critical observation. **Cosine search always returns something.**
There is no "no results." Without a score floor, the model in Phase 4 will confidently
answer an out-of-scope question using the least-irrelevant chunk.

---

## 6. Tuning chunking, empirically

Chunk size is the highest-leverage decision in RAG. Try variations and watch the scores:

| Try | Effect to look for |
|---|---|
| Split on `##` (default) | usually best — headings mark ideas |
| Fixed ~800 chars | headings get split mid-idea; scores drop |
| Merge whole files into one chunk | everything matches everything, weakly |
| Not prepending the heading | noticeably worse — headings carry meaning |

Phase 6 makes this measurable with retrieval hit rate. For now, judge by eye — but judge.

---

## 7. Troubleshooting

| Symptom | Cause |
|---|---|
| `Embedding failed` | Ollama not running — `ollama serve` |
| `connect ECONNREFUSED …5433` | `npm run db:up` |
| `type "vector" does not exist` | `npm run db:schema` |
| `expected 768 dimensions, not N` | `EMBED_MODEL` changed — schema is locked to 768; migrate + full re-index |
| All scores ~0.99 | you embedded the question as the document, or indexed one giant chunk |
| Zero rows | `TRUNCATE` ran but indexing failed — check the console output |

---

## 8. Acceptance criteria

- [ ] `npm run index` reports a sensible chunk count (roughly 20–40)
- [ ] `npm run search` returns relevant chunks for a dozen hand-written questions
- [ ] You have observed an out-of-scope question still returning five rows with low scores
- [ ] Year filtering works — a 2025-26 query does not return 2026-27 rule chunks
- [ ] Shared/process chunks appear regardless of the year filter

**Only then start Phase 4.**
