-- 005_vector_index.sql — v0.4.0 Ask (RAG)
-- Adds the sqlite-vec virtual table for chunk embeddings + rowid bridge.
--
-- Design notes:
-- - vec0 REQUIRES integer rowids (learned in R-VEC S-1 — even Number-typed JS
--   values are rejected; must bind via BigInt). chunks.id is a TEXT primary
--   key, so we need chunks_rowid as a TEXT→INTEGER bridge.
-- - 768 dimensions = Ollama nomic-embed-text (F-013). Locked per v0.4.0 plan
--   §12 (no 1024-dim bench). Switching later = new table, re-run backfill.
-- - sqlite-vec runtime target: 0.1.9 (F-057 pin, v0.4.0 T-0, commit e8f104a).

CREATE TABLE IF NOT EXISTS chunks_rowid (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
  rowid    INTEGER NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_chunks_rowid_rowid ON chunks_rowid(rowid);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_vec USING vec0(
  embedding float[768]
);
