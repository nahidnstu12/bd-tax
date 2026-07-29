-- Corpus chunks for the Ask tab.
-- Not needed for Phase 1 (calculator) — set up when starting Phase 3.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id              bigserial PRIMARY KEY,
  source_file     text NOT NULL,
  heading         text,
  content         text NOT NULL,

  -- NULL = year-independent (e.g. the e-Return filing process).
  -- Set = rate/rule content valid only for that assessment year.
  assessment_year text,

  -- Dimension is LOCKED to the embedding model (nomic-embed-text = 768).
  -- Changing the model requires a migration AND a full re-index.
  embedding       vector(768) NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS chunks_year_idx
  ON chunks (assessment_year);

-- Run after the first bulk insert so the planner uses the HNSW index:
--   ANALYZE chunks;
