-- 029_transcript_job_sweeps.sql — Autonomous daily ASR refinement sweep metadata

ALTER TABLE transcript_jobs
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'user_capture';

ALTER TABLE transcript_jobs
  ADD COLUMN sweep_batch_id TEXT;

ALTER TABLE transcript_jobs
  ADD COLUMN sweep_timestamp INTEGER;

CREATE INDEX IF NOT EXISTS idx_transcript_jobs_sweep_origin
  ON transcript_jobs (origin, sweep_timestamp DESC);
