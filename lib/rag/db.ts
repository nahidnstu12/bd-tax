import { Pool } from 'pg';

/**
 * Postgres + pgvector connection.
 *
 * Local container from docker-compose.yml, host port 5433 (5432 is taken by
 * another project). Nothing personal is ever stored here — only public corpus
 * text. Your filed returns stay in private/ as plain JSON, unembedded.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Did you `cp .env.local.example .env.local`?\n' +
      '  Scripts load it via: tsx --env-file-if-exists=.env.local',
  );
}

export const pool = new Pool({ connectionString });

/**
 * pgvector has no binary protocol in node-postgres, so a vector is passed as a
 * STRING literal and cast in SQL with `$1::vector`:
 *
 *   [0.031, -0.017, 0.44]  ->  "[0.031,-0.017,0.44]"
 *
 * No spaces, square brackets, comma-separated. That is the entire format.
 */
export function toVector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
