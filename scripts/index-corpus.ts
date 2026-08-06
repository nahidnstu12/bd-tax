/**
 * Phase 3, step 4 — embed every chunk and store it.
 *
 *   npm run index
 *
 * NOT a Next.js route: embedding 60 chunks takes a minute or two and would time
 * out a request handler. Indexing is a build step you run when the corpus
 * changes, not something a user triggers.
 *
 * Anticlimactic on purpose. All the ideas were in steps 1-3; this is a loop
 * with an INSERT in it.
 */
import { chunkCorpus, currentStrategy } from '../lib/rag/chunk';
import { embed, MODEL } from '../lib/rag/embed';
import { pool, toVector } from '../lib/rag/db';

// Override with e.g. CHUNK_STRATEGY=sentence npm run index — see npm run ablate.
const strategy = currentStrategy();
const chunks = chunkCorpus(strategy);
if (chunks.length === 0) {
  console.error('  No chunks found. Is rules/*/corpus/ populated?');
  process.exit(1);
}

console.log(`\n  ${chunks.length} chunks to index  ·  model ${MODEL}  ·  strategy ${strategy}\n`);

/**
 * FULL REBUILD, every time.
 *
 * The alternative — tracking which files changed and updating only those — means
 * hashing content, detecting deletions, and handling half-finished runs. For 60
 * chunks that machinery buys nothing and introduces the single most confusing
 * bug in RAG: a stale chunk that still matches queries after you edited the file.
 * Delete everything, re-embed everything.
 */
await pool.query('TRUNCATE chunks RESTART IDENTITY');

const started = performance.now();
let currentFile = '';
let done = 0;

for (const c of chunks) {
  if (c.sourceFile !== currentFile) {
    currentFile = c.sourceFile;
    process.stdout.write(`\n  ${currentFile}\n`);
  }

  const vector = await embed(c.content); // local; the slow line

  await pool.query(
    `INSERT INTO chunks (source_file, heading, content, assessment_year, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [c.sourceFile, c.heading, c.content, c.assessmentYear, toVector(vector)],
  );

  done++;
  process.stdout.write(`     ${String(done).padStart(3)}/${chunks.length}  ${c.heading}\n`);
}

/**
 * HNSW is an approximate index — Postgres will only choose it if its statistics
 * say the table is big enough to be worth it. Without ANALYZE after a bulk load
 * the planner still thinks `chunks` is empty and does a sequential scan. Correct
 * results either way; just slower, and confusing when you check EXPLAIN.
 */
await pool.query('ANALYZE chunks');

// ── verify what actually landed, rather than trusting the loop ───────────────
const { rows } = await pool.query<{ assessment_year: string | null; n: string }>(
  `SELECT assessment_year, count(*) AS n
     FROM chunks
    GROUP BY assessment_year
    ORDER BY assessment_year NULLS FIRST`,
);

const seconds = ((performance.now() - started) / 1000).toFixed(1);
console.log(`\n  indexed ${done} chunks in ${seconds}s\n`);
for (const r of rows) {
  console.log(`     ${(r.assessment_year ?? 'shared (every year)').padEnd(22)} ${r.n}`);
}
console.log(`
  Those rows are now 60 independent records. Files no longer exist as a concept
  — search will pick 5 rows out of this table and nothing else.

  Re-run this any time you edit the corpus. Forgetting to is the most common
  "why didn't my change take effect?" in RAG.
`);

await pool.end();
