/**
 * Confirm the database this project will actually talk to.
 *
 *   npm run db:check
 *
 * Connects using the exact same DATABASE_URL and driver as the indexer, so a
 * pass here means the indexer will connect too. Useful when pgvector is shared
 * with another project — it prints WHICH database you reached, not just "ok".
 */
import { pool } from '../lib/rag/db';

const url = new URL(process.env.DATABASE_URL!);

console.log(`
  target      ${url.hostname}:${url.port}${url.pathname}
  user        ${url.username}`);

// ── 1. can we connect at all? ────────────────────────────────────────────────
let version: string;
try {
  const { rows } = await pool.query<{ v: string }>('SELECT version() AS v');
  version = rows[0]?.v.split(',')[0] ?? 'unknown';
} catch (err) {
  console.error(`
  ✗ CANNOT CONNECT — ${(err as Error).message}

    Is the container running?   docker ps
    Right port?                 the URL says ${url.port}
    Right password?             it must match that container's POSTGRES_PASSWORD
`);
  process.exit(1);
}

const { rows: db } = await pool.query<{ name: string; usr: string }>(
  'SELECT current_database() AS name, current_user AS usr',
);
console.log(`  ✓ connected  ${version}
  ✓ database   ${db[0]?.name}   as ${db[0]?.usr}`);

// ── 2. is the vector extension installed? ────────────────────────────────────
const { rows: ext } = await pool.query<{ extversion: string }>(
  `SELECT extversion FROM pg_extension WHERE extname = 'vector'`,
);
if (ext.length === 0) {
  console.log(`
  ✗ pgvector extension NOT installed in this database.
    Extensions are per-database, so another project having it does not help.
    Fix: npm run db:schema
`);
  process.exit(1);
}
console.log(`  ✓ pgvector   v${ext[0]?.extversion}`);

// ── 3. does OUR table exist, with the right dimensions? ──────────────────────
const { rows: col } = await pool.query<{ type: string }>(
  `SELECT format_type(a.atttypid, a.atttypmod) AS type
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
    WHERE c.relname = 'chunks' AND a.attname = 'embedding'`,
);
if (col.length === 0) {
  console.log(`
  ✗ table "chunks" not found (or it has no embedding column).
    Fix: npm run db:schema
`);
  process.exit(1);
}
const expected = 'vector(768)';
const ok = col[0]?.type === expected;
console.log(`  ${ok ? '✓' : '✗'} chunks      embedding ${col[0]?.type}${ok ? '' : `  — EXPECTED ${expected}`}`);

// ── 4. what is in it? ────────────────────────────────────────────────────────
const { rows: counts } = await pool.query<{ assessment_year: string | null; n: string }>(
  `SELECT assessment_year, count(*) AS n
     FROM chunks GROUP BY assessment_year ORDER BY assessment_year NULLS FIRST`,
);
const total = counts.reduce((sum, r) => sum + Number(r.n), 0);

if (total === 0) {
  console.log(`
  · chunks is empty — expected before your first run. Next: npm run index
`);
} else {
  console.log(`\n  ${total} rows indexed`);
  for (const r of counts) {
    console.log(`     ${(r.assessment_year ?? 'shared (every year)').padEnd(22)} ${r.n}`);
  }
  console.log('');
}

// ── 5. sharing warning ───────────────────────────────────────────────────────
const { rows: others } = await pool.query<{ tablename: string }>(
  `SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'chunks' ORDER BY tablename`,
);
if (others.length > 0) {
  console.log(`  note: this database also holds ${others.map((r) => r.tablename).join(', ')}
        — another project's tables. Harmless: bd-tax only ever touches "chunks",
        and TRUNCATE in the indexer names that table explicitly.
`);
}

await pool.end();
