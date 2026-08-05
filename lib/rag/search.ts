import { embed } from './embed';
import { pool, toVector } from './db';

/**
 * Retrieval: question in, five chunks out.
 *
 * This is the whole "librarian". Everything before it was preparation.
 *
 * Note what is NOT here: no model call, no reasoning, no decision. Search picks
 * rows by geometry alone. The LLM does not get to choose its own sources — it
 * gets these five and nothing else. That is the property the project depends on.
 */

export interface SearchHit {
  id: number;
  sourceFile: string;
  heading: string;
  content: string;
  assessmentYear: string | null;
  /** Cosine similarity, 0..1. Higher is closer. */
  score: number;
}

export interface SearchOptions {
  /** e.g. "2026-27". Chunks for OTHER years are excluded; shared chunks
   *  (assessment_year IS NULL) always survive the filter. */
  year?: string;
  limit?: number;
}

export async function search(query: string, options: SearchOptions = {}): Promise<SearchHit[]> {
  const { year, limit = 5 } = options;

  // The question is embedded by the SAME model as the corpus. It has to be:
  // two models produce two different coordinate systems, and comparing across
  // them yields numbers that look plausible and mean nothing.
  const vector = toVector(await embed(query));

  const { rows } = await pool.query<{
    id: string;
    source_file: string;
    heading: string | null;
    content: string;
    assessment_year: string | null;
    score: string;
  }>(
    `SELECT id, source_file, heading, content, assessment_year,
            1 - (embedding <=> $1::vector) AS score
       FROM chunks
      WHERE $2::text IS NULL
         OR assessment_year IS NULL
         OR assessment_year = $2::text
      ORDER BY embedding <=> $1::vector
      LIMIT $3`,
    [vector, year ?? null, limit],
  );

  return rows.map((r) => ({
    id: Number(r.id),
    sourceFile: r.source_file,
    heading: r.heading ?? '',
    content: r.content,
    assessmentYear: r.assessment_year,
    score: Number(r.score),
  }));
}

/**
 * Two details in that SQL that are easy to get wrong:
 *
 * ORDER BY embedding <=> $1  — ascending DISTANCE, not descending score.
 *   `<=>` is cosine distance (1 - similarity), so nearest = smallest. Writing
 *   `ORDER BY score DESC` returns the same rows, but the ordering expression no
 *   longer matches the HNSW index definition, so Postgres cannot use the index
 *   and falls back to scanning every row. Correct answers, wrong plan — the kind
 *   of bug that survives all the way to production and only shows up as latency.
 *
 * 1 - (embedding <=> $1) AS score  — flip distance back to similarity for humans.
 *   Ranking uses distance because the index needs it; display uses similarity
 *   because "0.71 similar" reads better than "0.29 apart".
 *
 * And the year filter is an OR, not an equality:
 *   assessment_year IS NULL OR assessment_year = $2
 * The NULL branch is what keeps process content (how to file, how to register)
 * available in every year. Drop it and "how do I submit my return?" retrieves
 * rate tables.
 */

/** Similarity below this and the caller should refuse rather than answer.
 *  Unused until Phase 4 — exported here so search-cli can draw the line. */
export const SCORE_FLOOR = Number(process.env.RETRIEVAL_SCORE_FLOOR ?? 0.5);
