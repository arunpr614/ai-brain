-- 024_recall_manual_sync.sql - durable manual Recall sync orchestration

CREATE TABLE recall_sync_executions (
  id TEXT PRIMARY KEY,
  occurrence_key TEXT NOT NULL UNIQUE,
  trigger TEXT NOT NULL CHECK (trigger IN ('automatic', 'manual_ui')),
  request_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('running', 'done', 'blocked', 'error', 'partial_failure')),
  stage TEXT NOT NULL CHECK (stage IN ('starting', 'dry_run', 'dry_run_validated', 'backup', 'apply', 'apply_validated', 'terminal')),
  started_at INTEGER NOT NULL,
  heartbeat_at INTEGER NOT NULL,
  completed_at INTEGER,
  wrapper_validated_at INTEGER,
  dry_run_id TEXT,
  apply_run_id TEXT,
  safe_reason TEXT CHECK (safe_reason IS NULL OR safe_reason IN (
    'active', 'connection_attention', 'authentication_attention', 'rate_limited',
    'safety_attention', 'worker_unavailable', 'internal', 'expired'
  )),
  cards_imported INTEGER CHECK (cards_imported IS NULL OR cards_imported >= 0),
  cards_upgraded INTEGER CHECK (cards_upgraded IS NULL OR cards_upgraded >= 0),
  cards_already_current INTEGER CHECK (cards_already_current IS NULL OR cards_already_current >= 0),
  CHECK (completed_at IS NULL OR completed_at >= started_at),
  CHECK (wrapper_validated_at IS NULL OR state = 'done')
);

CREATE INDEX idx_recall_sync_executions_active
  ON recall_sync_executions(state, heartbeat_at);
CREATE INDEX idx_recall_sync_executions_validated
  ON recall_sync_executions(wrapper_validated_at DESC)
  WHERE wrapper_validated_at IS NOT NULL;

CREATE TABLE recall_sync_requests (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 64),
  trigger TEXT NOT NULL DEFAULT 'manual_ui' CHECK (trigger = 'manual_ui'),
  state TEXT NOT NULL CHECK (state IN (
    'queued', 'claimed', 'running', 'done', 'blocked', 'error', 'partial_failure', 'expired'
  )),
  requested_at INTEGER NOT NULL,
  claimed_at INTEGER,
  started_at INTEGER,
  heartbeat_at INTEGER,
  completed_at INTEGER,
  expires_at INTEGER NOT NULL,
  execution_id TEXT REFERENCES recall_sync_executions(id) ON DELETE SET NULL,
  safe_reason TEXT CHECK (safe_reason IS NULL OR safe_reason IN (
    'active', 'connection_attention', 'authentication_attention', 'rate_limited',
    'safety_attention', 'worker_unavailable', 'internal', 'expired'
  )),
  cards_imported INTEGER CHECK (cards_imported IS NULL OR cards_imported >= 0),
  cards_upgraded INTEGER CHECK (cards_upgraded IS NULL OR cards_upgraded >= 0),
  cards_already_current INTEGER CHECK (cards_already_current IS NULL OR cards_already_current >= 0),
  CHECK (expires_at > requested_at),
  CHECK (completed_at IS NULL OR completed_at >= requested_at)
);

CREATE UNIQUE INDEX idx_recall_sync_requests_one_active
  ON recall_sync_requests(trigger)
  WHERE state IN ('queued', 'claimed', 'running');
CREATE INDEX idx_recall_sync_requests_claim
  ON recall_sync_requests(state, requested_at);
CREATE INDEX idx_recall_sync_requests_cooldown
  ON recall_sync_requests(completed_at DESC)
  WHERE state IN ('done', 'blocked', 'error', 'partial_failure', 'expired');

ALTER TABLE recall_sync_runs ADD COLUMN execution_id TEXT;
ALTER TABLE recall_sync_runs ADD COLUMN trigger TEXT NOT NULL DEFAULT 'automatic'
  CHECK (trigger IN ('automatic', 'manual_ui'));
ALTER TABLE recall_sync_runs ADD COLUMN request_id TEXT;

CREATE INDEX idx_recall_sync_runs_execution ON recall_sync_runs(execution_id);
CREATE INDEX idx_recall_sync_runs_request ON recall_sync_runs(request_id);
