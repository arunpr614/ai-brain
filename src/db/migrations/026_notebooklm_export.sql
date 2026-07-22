-- 026_notebooklm_export.sql — durable consumer NotebookLM one-click export
--
-- Google session material never enters this schema. The hosted application
-- stores only scoped connector-token hashes, local binding fingerprints,
-- frozen minimized payloads, and opaque provider/source aliases.

CREATE TABLE notebooklm_connector_pairing_codes (
  id              TEXT PRIMARY KEY,
  code_hash       TEXT NOT NULL UNIQUE CHECK (length(code_hash) = 64),
  label           TEXT,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  used_at         INTEGER,
  attempts        INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt_at INTEGER,
  CHECK (expires_at > created_at)
);

CREATE INDEX idx_notebooklm_pairing_codes_expiry
  ON notebooklm_connector_pairing_codes(expires_at, used_at);

CREATE TABLE notebooklm_connectors (
  id               TEXT PRIMARY KEY,
  token_hash       TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  token_hint       TEXT NOT NULL CHECK (length(token_hint) BETWEEN 4 AND 12),
  label            TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 64),
  extension_origin TEXT NOT NULL CHECK (extension_origin GLOB 'chrome-extension://*'),
  protocol_version INTEGER NOT NULL CHECK (protocol_version >= 1),
  state            TEXT NOT NULL CHECK (state IN ('registered', 'bound', 'revoked')),
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  last_seen_at     INTEGER,
  revoked_at       INTEGER,
  CHECK (updated_at >= created_at),
  CHECK ((state = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX idx_notebooklm_connectors_active
  ON notebooklm_connectors(state, last_seen_at DESC);

CREATE UNIQUE INDEX idx_notebooklm_connectors_one_live
  ON notebooklm_connectors((1))
  WHERE state != 'revoked';

CREATE TABLE notebooklm_targets (
  id                        TEXT PRIMARY KEY,
  connector_id              TEXT NOT NULL REFERENCES notebooklm_connectors(id) ON DELETE RESTRICT,
  binding_version           INTEGER NOT NULL CHECK (binding_version >= 1),
  safe_label                TEXT NOT NULL CHECK (safe_label = 'Private NotebookLM target'),
  local_binding_fingerprint TEXT NOT NULL CHECK (length(local_binding_fingerprint) = 64),
  subject_fingerprint       TEXT NOT NULL CHECK (length(subject_fingerprint) = 64),
  sharing_policy            TEXT NOT NULL DEFAULT 'private_only' CHECK (sharing_policy = 'private_only'),
  sharing_posture           TEXT NOT NULL CHECK (sharing_posture IN ('unknown', 'private', 'shared', 'public')),
  source_limit              INTEGER NOT NULL DEFAULT 50 CHECK (source_limit BETWEEN 1 AND 1000),
  reserve_count             INTEGER NOT NULL DEFAULT 5 CHECK (reserve_count BETWEEN 1 AND 100),
  source_count              INTEGER CHECK (source_count IS NULL OR source_count >= 0),
  health_status             TEXT NOT NULL CHECK (health_status IN ('unknown', 'healthy', 'attention')),
  health_reason             TEXT,
  verified_at               INTEGER,
  active                    INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at                INTEGER NOT NULL,
  deactivated_at            INTEGER,
  CHECK (reserve_count < source_limit),
  CHECK ((active = 1) = (deactivated_at IS NULL)),
  UNIQUE (connector_id, binding_version),
  UNIQUE (connector_id, local_binding_fingerprint, binding_version)
);

CREATE UNIQUE INDEX idx_notebooklm_targets_one_active
  ON notebooklm_targets(active)
  WHERE active = 1;

CREATE INDEX idx_notebooklm_targets_connector
  ON notebooklm_targets(connector_id, active, binding_version DESC);

CREATE TABLE notebooklm_operational_events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type   TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 64),
  connector_id TEXT REFERENCES notebooklm_connectors(id) ON DELETE SET NULL,
  target_id    TEXT REFERENCES notebooklm_targets(id) ON DELETE SET NULL,
  safe_reason  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_notebooklm_operational_events_retention
  ON notebooklm_operational_events(created_at);

CREATE TABLE notebooklm_runtime_control (
  id                       INTEGER PRIMARY KEY CHECK (id = 1),
  provider_write_blocked   INTEGER NOT NULL DEFAULT 0 CHECK (provider_write_blocked IN (0, 1)),
  protocol_failure_streak  INTEGER NOT NULL DEFAULT 0 CHECK (protocol_failure_streak BETWEEN 0 AND 3),
  block_reason             TEXT,
  last_protocol_failure_at INTEGER,
  retention_last_success_at INTEGER,
  retention_last_failure_at INTEGER,
  retention_failure_streak INTEGER NOT NULL DEFAULT 0 CHECK (retention_failure_streak >= 0),
  retention_last_error_code TEXT,
  retention_last_expired_count INTEGER NOT NULL DEFAULT 0 CHECK (retention_last_expired_count >= 0),
  retention_last_purged_count INTEGER NOT NULL DEFAULT 0 CHECK (retention_last_purged_count >= 0),
  retention_overdue_snapshot_count INTEGER NOT NULL DEFAULT 0 CHECK (retention_overdue_snapshot_count >= 0),
  retention_physical_purge_pending INTEGER NOT NULL DEFAULT 0 CHECK (retention_physical_purge_pending IN (0, 1)),
  retention_physical_purge_generation INTEGER NOT NULL DEFAULT 0 CHECK (retention_physical_purge_generation >= 0),
  unresolved_over_24h_count INTEGER NOT NULL DEFAULT 0 CHECK (unresolved_over_24h_count >= 0),
  updated_at               INTEGER NOT NULL,
  CHECK (retention_physical_purge_pending = 0 OR retention_physical_purge_generation > 0),
  CHECK ((provider_write_blocked = 1) = (block_reason IS NOT NULL))
);

INSERT INTO notebooklm_runtime_control
  (id, provider_write_blocked, protocol_failure_streak, updated_at)
VALUES (1, 0, 0, unixepoch() * 1000);

CREATE TABLE notebooklm_export_requests (
  id                TEXT PRIMARY KEY,
  owner_id          TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 64),
  idempotency_key   TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 96),
  item_id           TEXT NOT NULL,
  connector_id      TEXT NOT NULL REFERENCES notebooklm_connectors(id) ON DELETE RESTRICT,
  target_id         TEXT NOT NULL REFERENCES notebooklm_targets(id) ON DELETE RESTRICT,
  binding_version   INTEGER NOT NULL CHECK (binding_version >= 1),
  mapper_version    INTEGER NOT NULL CHECK (mapper_version >= 1),
  content_hash      TEXT NOT NULL CHECK (length(content_hash) = 64),
  opaque_marker     TEXT NOT NULL UNIQUE CHECK (length(opaque_marker) BETWEEN 16 AND 64),
  payload_title     TEXT,
  payload_text      TEXT,
  payload_bytes     INTEGER NOT NULL CHECK (payload_bytes >= 0),
  payload_words     INTEGER NOT NULL CHECK (payload_words >= 0),
  limited_capture   INTEGER NOT NULL DEFAULT 0 CHECK (limited_capture IN (0, 1)),
  state             TEXT NOT NULL CHECK (state IN (
    'queued', 'leased', 'sending', 'processing', 'succeeded',
    'authentication_attention', 'reconciling', 'reconciliation_required',
    'duplicate_conflict', 'target_attention', 'capacity_blocked',
    'retryable_failure', 'provider_failed', 'connector_update_required',
    'cancelled', 'expired'
  )),
  phase             TEXT NOT NULL CHECK (phase IN ('pre_create', 'create', 'reconcile', 'poll', 'terminal')),
  safe_reason       TEXT,
  lease_epoch       INTEGER NOT NULL DEFAULT 0 CHECK (lease_epoch >= 0),
  lease_token_hash  TEXT CHECK (lease_token_hash IS NULL OR length(lease_token_hash) = 64),
  lease_until       INTEGER,
  next_attempt_at   INTEGER NOT NULL,
  attempt_count     INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  source_alias      TEXT CHECK (source_alias IS NULL OR length(source_alias) = 64),
  provider_status   TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  claimed_at        INTEGER,
  create_dispatched_at INTEGER,
  processing_at     INTEGER,
  completed_at      INTEGER,
  expires_at        INTEGER NOT NULL,
  snapshot_purge_at INTEGER NOT NULL,
  snapshot_purged_at INTEGER,
  cancelled_at      INTEGER,
  CHECK (updated_at >= created_at),
  CHECK (expires_at > created_at),
  CHECK (snapshot_purge_at >= created_at),
  CHECK ((payload_title IS NULL) = (payload_text IS NULL)),
  UNIQUE (owner_id, idempotency_key),
  UNIQUE (item_id, target_id, binding_version, mapper_version, content_hash)
);

CREATE INDEX idx_notebooklm_requests_claim
  ON notebooklm_export_requests(connector_id, state, next_attempt_at, created_at, id);

CREATE INDEX idx_notebooklm_requests_item
  ON notebooklm_export_requests(item_id, created_at DESC);

CREATE INDEX idx_notebooklm_requests_retention
  ON notebooklm_export_requests(snapshot_purge_at, snapshot_purged_at, state);

CREATE UNIQUE INDEX idx_notebooklm_requests_source_alias
  ON notebooklm_export_requests(target_id, source_alias)
  WHERE source_alias IS NOT NULL;

CREATE TABLE notebooklm_export_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id     TEXT NOT NULL REFERENCES notebooklm_export_requests(id) ON DELETE CASCADE,
  connector_id   TEXT REFERENCES notebooklm_connectors(id) ON DELETE SET NULL,
  lease_epoch    INTEGER,
  event_type     TEXT NOT NULL CHECK (length(event_type) BETWEEN 1 AND 64),
  from_state     TEXT,
  to_state       TEXT,
  safe_reason    TEXT,
  created_at     INTEGER NOT NULL
);

CREATE INDEX idx_notebooklm_events_request
  ON notebooklm_export_events(request_id, id);

CREATE INDEX idx_notebooklm_events_retention
  ON notebooklm_export_events(created_at);
