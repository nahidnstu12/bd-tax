# Part 5 — The vector database

**The question:** what is pgvector actually doing, and what is an HNSW index?

---

## Why a database at all?

You could keep all 71 embeddings in a JavaScript array and compare them in a
loop. For 71 chunks that genuinely works — it'd take a few milliseconds.

You use Postgres because of what comes *with* it:

| you get | why it matters here |
|---|---|
| filtering | `WHERE assessment_year = '2026-27'` — a plain array can't do this well |
| persistence | index once, search forever; no re-embedding on restart |
| one query | filter + sort + limit in a single round trip |
| room to grow | the same code works at 71 chunks and 71,000 |

The last one is the real reason. Nothing in your code changes when the corpus
grows — only the index starts earning its keep.

## What pgvector adds

Postgres has no idea what a list of 768 floats means. `pgvector` is an extension
that teaches it:

**1. A column type**

```sql
embedding vector(768) NOT NULL
```

The `768` is a hard contract with your embedding model. Change the model, change
this, re-index everything. That's why `embed.ts` checks the length before it ever
reaches the database.

**2. Distance operators**

| operator | distance | use when |
|---|---|---|
| `<->` | L2 / Euclidean | genuine coordinates, image features |
| `<#>` | negative inner product | vectors are already normalised |
| `<=>` | **cosine** | text — what you use |

```sql
embedding <=> '[0.031,-0.017,…]'::vector    -- one number: 0 = identical
```

**3. Index types** — HNSW and IVFFlat. More on HNSW below.

> **Extensions are per-database, not per-server.** Another project on the same
> Postgres having `vector` installed does not help you. That's what
> `npm run db:check` verifies, and why it prints *which* database it reached.

## Sending a vector over the wire

`node-postgres` has no binary format for vectors, so they travel as **strings**:

```ts
export function toVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;   // "[0.031,-0.017,0.44]"
}
```

```sql
VALUES ($1, $2, $3, $4, $5::vector)   -- the ::vector cast does the parsing
```

Square brackets, comma-separated, no spaces. That's the whole format. Forget the
`::vector` cast and you get a type error that looks far more mysterious than it is.

## HNSW — the index

### The analogy: finding a house in a city

You want the house nearest to you.

**Exact search:** measure the distance to every house in the city. Perfectly
correct. Very slow with a million houses.

**HNSW:** the city has express highways connecting distant districts, main roads
connecting neighbourhoods, and small lanes connecting houses. You take the
highway to roughly the right district, drop to main roads, then to lanes. You
check a few hundred houses instead of a million.

You might miss the true nearest house by a few metres. You will get somewhere
essentially as good, thousands of times faster.

**HNSW = Hierarchical Navigable Small World.** Layers of shortcuts, from
long-range at the top to fine-grained at the bottom.

### The word that matters: approximate

```sql
CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
```

HNSW is **approximate**. It can occasionally miss a true nearest neighbour. In
exchange it turns a query that scales with your row count into one that barely
grows at all.

At 71 rows this is irrelevant — Postgres will probably scan every row anyway and
be faster for it. **You are not building the index for today. You're building it
so nothing has to change at 100,000 chunks.**

Note `vector_cosine_ops`. The index is built for **one** distance function. Query
with `<->` when the index was built for `<=>` and the index simply won't be used.

## The two things that are easy to get wrong

### 1. `ORDER BY` distance, not score

```sql
-- CORRECT: index can be used
ORDER BY embedding <=> $1::vector

-- WRONG: same rows, index ignored
ORDER BY 1 - (embedding <=> $1::vector) DESC
```

Both return identical results. But Postgres only uses an index when the ordering
expression **matches the index definition**. Wrap it in arithmetic and it silently
falls back to scanning every row.

Right answers, wrong plan. This bug survives to production because nothing looks
broken — it's just slow, and only at scale.

### 2. `ANALYZE` after a bulk load

```ts
await pool.query('ANALYZE chunks');
```

Postgres decides whether to use an index from its **statistics**. After
`TRUNCATE` + bulk insert, those statistics still say the table is empty. So the
planner reasons "tiny table, scanning is cheaper" — and ignores the index you
just built.

`ANALYZE` refreshes the statistics. Cheap, one line, easy to forget.

## Full rebuild, every time

```ts
await pool.query('TRUNCATE chunks RESTART IDENTITY');
```

Every `npm run index` deletes everything and re-embeds from scratch.

The alternative — track which files changed, update only those — means hashing
content, detecting deletions, and handling half-finished runs. For 71 chunks that
machinery buys nothing and introduces **the single most confusing bug in RAG**:

> A stale chunk that still matches queries after you edited the file.

You edit `rebate.md`, re-run, test — and get the old answer. Nothing looks broken.
You lose an hour.

Full rebuild takes a few seconds and makes that bug impossible. Revisit only when
re-indexing genuinely becomes painful.

Note it names `chunks` explicitly. Your database also holds `document_chunks` and
`documents` from another project. They are untouched.

## Why indexing is a script, not an API route

`npm run index` embeds 71 chunks one at a time. Ollama takes ~110ms each. That's
a request that would time out.

More importantly: **indexing is a build step, not a user action.** It runs when
the corpus changes, which is when *you* change it. Nobody visiting your app should
be able to trigger a full re-embed.

## Common confusions

**"Do I need a specialised vector database?"**
Pinecone, Weaviate, Qdrant, Chroma exist and are good. You don't need one.
pgvector handles millions of vectors, and it lets you join vectors against normal
relational columns — which is exactly what your year filter does. One database is
one thing to run, back up, and reason about.

**"Is HNSW making my search wrong?"**
Approximate, not wrong. And with 71 rows it isn't even being used yet.

**"What is IVFFlat?"**
The other pgvector index. It clusters vectors and searches only the nearest
clusters. Builds faster, uses less memory, generally slower to query. It also must
be built *after* data exists, whereas HNSW can be created on an empty table — one
reason your schema uses HNSW.

**"Why is `assessment_year` a separate column instead of inside the embedding?"**
Because a year is an exact fact, and exact facts belong in `WHERE`, not in a
similarity score. Never ask a fuzzy tool to do an exact job. This is Part 6.

## Go deeper

- Run `EXPLAIN ANALYZE` on your search query. At 71 rows you'll see `Seq Scan` — that's correct, not a bug. Insert 50,000 dummy rows and watch it switch.
- Read the pgvector README on **`hnsw.ef_search`** — the runtime knob trading recall for speed. The single most useful setting once your corpus grows.
- Look up **filtered vector search** and why combining `WHERE` with an ANN index is genuinely hard: the index finds the nearest 5, then the filter removes 4, and you're left with 1. pgvector calls this *iterative index scans*. Irrelevant at your size, unavoidable later.
- Compare **HNSW vs IVFFlat** build time and memory on your own data once you have more of it.
- Look at **binary and scalar quantization** — storing vectors in far less space with a small accuracy cost. What you'd reach for at millions of rows.

---

Next: [Part 6 — Retrieval](06-retrieval.md)
