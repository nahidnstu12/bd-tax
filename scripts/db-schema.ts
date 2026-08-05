/**
 * Apply db/schema.sql to whatever DATABASE_URL points at.
 *
 *   npm run db:schema
 *
 * Goes through the pg driver rather than `docker compose exec ... psql`, so it
 * works against this project's container, an existing pgvector container shared
 * with another project, or a remote database — no psql binary needed on the host.
 *
 * Safe to re-run: every statement in schema.sql is IF NOT EXISTS.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from '../lib/rag/db';

const url = new URL(process.env.DATABASE_URL!);
const sql = readFileSync(join(process.cwd(), 'db', 'schema.sql'), 'utf8');

console.log(`\n  applying db/schema.sql to ${url.hostname}:${url.port}${url.pathname}\n`);

try {
  // No parameters, so node-postgres uses the simple query protocol — which
  // allows multiple statements in one round trip.
  await pool.query(sql);
} catch (err) {
  const message = (err as Error).message;
  console.error(`  ✗ ${message}\n`);
  if (message.includes('permission denied to create extension')) {
    console.error(
      `    CREATE EXTENSION needs superuser. Either connect as a superuser, or\n` +
        `    have someone run: CREATE EXTENSION vector;  once, in this database.\n`,
    );
  }
  await pool.end();
  process.exit(1);
}

console.log(`  ✓ vector extension, chunks table, hnsw + year indexes\n`);
console.log(`  Next: npm run db:check\n`);
await pool.end();
