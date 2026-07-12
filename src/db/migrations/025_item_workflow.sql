-- 025_item_workflow.sql — Processing workflow projection, immutable history,
-- terminal mutation receipts, tab-scoped Undo, enrollment, and readiness.
-- Existing rows remain dormant until explicit enrollment. New rows are always
-- initialized by the application transaction or the old-code/raw guard.

ALTER TABLE items ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'inbox'
  CHECK(workflow_status IN ('inbox','todo','in_progress','done'));
ALTER TABLE items ADD COLUMN workflow_version INTEGER NOT NULL DEFAULT 0
  CHECK(workflow_version >= 0);
ALTER TABLE items ADD COLUMN workflow_legacy_baseline INTEGER NOT NULL DEFAULT 0
  CHECK(workflow_legacy_baseline IN (0,1));
ALTER TABLE items ADD COLUMN workflow_enrolled_at INTEGER;
ALTER TABLE items ADD COLUMN workflow_initialized_at INTEGER;
ALTER TABLE items ADD COLUMN workflow_inbox_entered_at INTEGER;
ALTER TABLE items ADD COLUMN workflow_inbox_episode_id TEXT;
ALTER TABLE items ADD COLUMN workflow_status_changed_at INTEGER;
ALTER TABLE items ADD COLUMN workflow_current_done_entered_at INTEGER;
ALTER TABLE items ADD COLUMN workflow_archived_at INTEGER;

-- This statement runs before validation triggers exist and marks only the rows
-- that predate the migration. Future inserts keep the non-legacy default.
UPDATE items SET workflow_legacy_baseline = 1;

CREATE TABLE processing_mutation_receipts (
  mutation_id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK(scope_type IN
    ('item_workflow','timezone','enrollment_job','initialization')),
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  scope_key_hash TEXT NOT NULL CHECK(length(scope_key_hash)=64),
  action_type TEXT NOT NULL CHECK(length(action_type) BETWEEN 2 AND 32),
  actor_tab_id TEXT CHECK(actor_tab_id IS NULL OR length(actor_tab_id) BETWEEN 32 AND 64),
  request_fingerprint TEXT NOT NULL CHECK(length(request_fingerprint)=64),
  expected_version INTEGER CHECK(expected_version IS NULL OR expected_version >= 0),
  outcome_class TEXT NOT NULL CHECK(outcome_class IN
    ('accepted_effective','accepted_noop','rejected')),
  result_code TEXT NOT NULL CHECK(result_code IN
    ('initialized','raw_initialized','enrolled','moved','archived','restored','reprocessed','undone',
     'timezone_updated','enrollment_confirmed','enrollment_cancelled','enrollment_retried',
     'same_state','same_timezone','version_conflict','action_ineligible','item_not_found',
     'undo_expired','undo_superseded','undo_invalid_target','job_conflict','job_expired','job_not_found')),
  accepted_event_uuid TEXT,
  accepted_item_version INTEGER CHECK(accepted_item_version IS NULL OR accepted_item_version > 0),
  observed_item_version INTEGER CHECK(observed_item_version IS NULL OR observed_item_version >= 0),
  confirmed_at INTEGER,
  undo_eligible_until INTEGER,
  undo_target_event_uuid TEXT,
  created_at INTEGER NOT NULL CHECK(created_at >= 0),
  expires_at INTEGER,
  CHECK((outcome_class='accepted_effective' AND scope_type IN ('item_workflow','initialization'))
    = (accepted_event_uuid IS NOT NULL)),
  CHECK(undo_eligible_until IS NULL OR
    (confirmed_at IS NOT NULL AND undo_eligible_until=confirmed_at+30000))
);

CREATE TABLE item_workflow_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_uuid TEXT NOT NULL UNIQUE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  item_version INTEGER NOT NULL CHECK(item_version > 0),
  mutation_id TEXT NOT NULL UNIQUE
    REFERENCES processing_mutation_receipts(mutation_id),
  event_type TEXT NOT NULL CHECK(event_type IN
    ('initialized','raw_initialized','enrolled','status_changed','archived','restored','reprocessed','undo')),
  from_status TEXT CHECK(from_status IS NULL OR from_status IN ('inbox','todo','in_progress','done')),
  to_status TEXT NOT NULL CHECK(to_status IN ('inbox','todo','in_progress','done')),
  from_archived_at INTEGER,
  to_archived_at INTEGER,
  from_inbox_entered_at INTEGER,
  to_inbox_entered_at INTEGER,
  from_inbox_episode_id TEXT,
  to_inbox_episode_id TEXT,
  from_status_changed_at INTEGER,
  to_status_changed_at INTEGER NOT NULL,
  from_current_done_entered_at INTEGER,
  to_current_done_entered_at INTEGER,
  origin TEXT NOT NULL CHECK(origin IN ('capture','enrollment','user','undo','raw_guard')),
  surface TEXT NOT NULL CHECK(surface IN
    ('web_capture','api_capture','telegram','recall','inbox','board','list','archived','detail','raw')),
  actor_channel TEXT NOT NULL CHECK(actor_channel IN
    ('web','android','extension','telegram','recall','system','unknown_raw')),
  actor_tab_id TEXT CHECK(actor_tab_id IS NULL OR length(actor_tab_id) BETWEEN 32 AND 64),
  undo_of_event_uuid TEXT UNIQUE
    REFERENCES item_workflow_events(event_uuid) DEFERRABLE INITIALLY DEFERRED,
  reason_code TEXT CHECK(reason_code IS NULL OR length(reason_code) BETWEEN 2 AND 32),
  occurred_at INTEGER NOT NULL CHECK(occurred_at >= 0),
  UNIQUE(item_id,item_version)
);

ALTER TABLE items ADD COLUMN workflow_last_event_uuid TEXT
  REFERENCES item_workflow_events(event_uuid)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE processing_undo_slots (
  actor_tab_id TEXT PRIMARY KEY CHECK(length(actor_tab_id) BETWEEN 32 AND 64),
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  target_event_uuid TEXT NOT NULL REFERENCES item_workflow_events(event_uuid) ON DELETE CASCADE,
  target_mutation_id TEXT NOT NULL REFERENCES processing_mutation_receipts(mutation_id) ON DELETE CASCADE,
  confirmed_at INTEGER NOT NULL,
  undo_eligible_until INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK(undo_eligible_until=confirmed_at+30000)
);

CREATE TABLE processing_enrollment_jobs (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  mode TEXT NOT NULL CHECK(mode IN ('selected','recent','all')),
  state TEXT NOT NULL CHECK(state IN
    ('previewing','preview_ready','confirmed','running','cancel_requested','completed','cancelled','failed','expired')),
  preview_as_of_utc INTEGER NOT NULL,
  recent_start_utc INTEGER,
  owner_timezone TEXT NOT NULL,
  timezone_version INTEGER NOT NULL,
  frozen_count INTEGER CHECK(frozen_count IS NULL OR frozen_count >= 0),
  frozen_hash TEXT CHECK(frozen_hash IS NULL OR length(frozen_hash)=64),
  confirmed_at INTEGER,
  processed_count INTEGER NOT NULL DEFAULT 0 CHECK(processed_count >= 0),
  enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK(enrolled_count >= 0),
  already_enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK(already_enrolled_count >= 0),
  deleted_count INTEGER NOT NULL DEFAULT 0 CHECK(deleted_count >= 0),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
  error_code TEXT CHECK(error_code IS NULL OR length(error_code) BETWEEN 2 AND 32),
  preview_expires_at INTEGER,
  cancel_requested_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX processing_one_active_enrollment_job
  ON processing_enrollment_jobs((1))
  WHERE state IN ('previewing','preview_ready','confirmed','running','cancel_requested');

CREATE TABLE processing_enrollment_job_items (
  job_id TEXT NOT NULL REFERENCES processing_enrollment_jobs(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK(ordinal >= 0),
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  scope_key_hash TEXT NOT NULL CHECK(length(scope_key_hash)=64),
  result TEXT NOT NULL DEFAULT 'pending'
    CHECK(result IN ('pending','enrolled','already_enrolled','deleted')),
  PRIMARY KEY(job_id,ordinal),
  UNIQUE(job_id,scope_key_hash)
);

CREATE TABLE processing_preferences (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  owner_timezone TEXT,
  timezone_version INTEGER NOT NULL DEFAULT 0 CHECK(timezone_version >= 0),
  initialized_at INTEGER,
  updated_at INTEGER,
  last_mutation_id TEXT REFERENCES processing_mutation_receipts(mutation_id)
);
INSERT INTO processing_preferences(singleton) VALUES(1);

CREATE TABLE processing_runtime_state (
  singleton INTEGER PRIMARY KEY CHECK(singleton=1),
  schema_version INTEGER NOT NULL,
  workflow_epoch INTEGER NOT NULL DEFAULT 0,
  taxonomy_epoch INTEGER NOT NULL DEFAULT 0,
  readiness_state TEXT NOT NULL CHECK(readiness_state IN ('unverified','green','red')),
  failure_code TEXT CHECK(failure_code IS NULL OR length(failure_code) BETWEEN 2 AND 48),
  last_deep_attempt_at INTEGER,
  last_deep_success_at INTEGER,
  audited_app_sha TEXT,
  audited_migration_hash TEXT,
  updated_at INTEGER NOT NULL
);
INSERT INTO processing_runtime_state(singleton,schema_version,readiness_state,updated_at)
VALUES(1,1,'unverified',unixepoch()*1000);

CREATE TRIGGER items_workflow_insert_shape
BEFORE INSERT ON items
WHEN NOT (
  (new.workflow_legacy_baseline=0 AND new.workflow_version=0 AND
   new.workflow_status='inbox' AND new.workflow_enrolled_at IS NULL AND
   new.workflow_initialized_at IS NULL AND new.workflow_inbox_entered_at IS NULL AND
   new.workflow_inbox_episode_id IS NULL AND new.workflow_status_changed_at IS NULL AND
   new.workflow_current_done_entered_at IS NULL AND new.workflow_archived_at IS NULL AND
   new.workflow_last_event_uuid IS NULL)
  OR
  (new.workflow_legacy_baseline=0 AND new.workflow_version=1 AND
   new.workflow_status='inbox' AND new.workflow_enrolled_at IS NOT NULL AND
   new.workflow_initialized_at IS NOT NULL AND new.workflow_inbox_entered_at IS NOT NULL AND
   new.workflow_inbox_episode_id IS NOT NULL AND new.workflow_status_changed_at IS NOT NULL AND
   new.workflow_current_done_entered_at IS NULL AND new.workflow_archived_at IS NULL AND
   new.workflow_last_event_uuid IS NOT NULL)
)
BEGIN
  SELECT RAISE(ABORT,'processing_insert_shape');
END;

CREATE TRIGGER items_workflow_update_shape
BEFORE UPDATE OF workflow_status,workflow_version,workflow_legacy_baseline,
  workflow_enrolled_at,workflow_initialized_at,workflow_inbox_entered_at,
  workflow_inbox_episode_id,workflow_status_changed_at,
  workflow_current_done_entered_at,workflow_archived_at,workflow_last_event_uuid ON items
BEGIN
  SELECT CASE WHEN new.workflow_version != old.workflow_version + 1
    THEN RAISE(ABORT,'processing_version_step') END;
  SELECT CASE WHEN old.workflow_version > 0 AND (
    new.workflow_enrolled_at IS NOT old.workflow_enrolled_at OR
    new.workflow_initialized_at IS NOT old.workflow_initialized_at OR
    new.workflow_legacy_baseline IS NOT old.workflow_legacy_baseline)
    THEN RAISE(ABORT,'processing_provenance_immutable') END;
  SELECT CASE WHEN new.workflow_enrolled_at IS NULL OR
    new.workflow_status_changed_at IS NULL OR new.workflow_last_event_uuid IS NULL
    THEN RAISE(ABORT,'processing_projection_missing') END;
  SELECT CASE WHEN new.workflow_legacy_baseline=0 AND new.workflow_initialized_at IS NULL
    THEN RAISE(ABORT,'processing_initialization_missing') END;
  SELECT CASE WHEN new.workflow_legacy_baseline=1 AND new.workflow_initialized_at IS NOT NULL
    THEN RAISE(ABORT,'processing_legacy_initialized') END;
  SELECT CASE WHEN new.workflow_status='inbox' AND (
    new.workflow_inbox_entered_at IS NULL OR new.workflow_inbox_episode_id IS NULL OR
    new.workflow_current_done_entered_at IS NOT NULL OR new.workflow_archived_at IS NOT NULL)
    THEN RAISE(ABORT,'processing_inbox_shape') END;
  SELECT CASE WHEN new.workflow_status IN ('todo','in_progress') AND (
    new.workflow_inbox_entered_at IS NOT NULL OR new.workflow_inbox_episode_id IS NOT NULL OR
    new.workflow_current_done_entered_at IS NOT NULL OR new.workflow_archived_at IS NOT NULL)
    THEN RAISE(ABORT,'processing_active_shape') END;
  SELECT CASE WHEN new.workflow_status='done' AND (
    new.workflow_inbox_entered_at IS NOT NULL OR new.workflow_inbox_episode_id IS NOT NULL OR
    new.workflow_current_done_entered_at IS NULL)
    THEN RAISE(ABORT,'processing_done_shape') END;
  SELECT CASE WHEN new.workflow_archived_at IS NOT NULL AND new.workflow_status!='done'
    THEN RAISE(ABORT,'processing_archive_shape') END;
  SELECT CASE WHEN new.workflow_last_event_uuid IS old.workflow_last_event_uuid
    THEN RAISE(ABORT,'processing_event_step') END;
END;

CREATE TRIGGER items_workflow_existing_event_guard
BEFORE UPDATE OF workflow_last_event_uuid ON items
WHEN EXISTS(SELECT 1 FROM item_workflow_events WHERE event_uuid=new.workflow_last_event_uuid)
  AND NOT EXISTS(
    SELECT 1 FROM item_workflow_events e
    WHERE e.event_uuid=new.workflow_last_event_uuid AND e.item_id=new.id
      AND e.item_version=new.workflow_version AND e.to_status=new.workflow_status
      AND e.to_archived_at IS new.workflow_archived_at
      AND e.to_inbox_entered_at IS new.workflow_inbox_entered_at
      AND e.to_inbox_episode_id IS new.workflow_inbox_episode_id
      AND e.to_status_changed_at IS new.workflow_status_changed_at
      AND e.to_current_done_entered_at IS new.workflow_current_done_entered_at
  )
BEGIN
  SELECT RAISE(ABORT,'processing_existing_event_mismatch');
END;

CREATE TRIGGER processing_receipts_no_update
BEFORE UPDATE ON processing_mutation_receipts BEGIN
  SELECT RAISE(ABORT,'processing_receipt_immutable');
END;

CREATE TRIGGER processing_receipts_guarded_delete
BEFORE DELETE ON processing_mutation_receipts
WHEN (old.item_id IS NOT NULL AND EXISTS(SELECT 1 FROM items WHERE id=old.item_id))
  OR (old.item_id IS NULL AND (old.expires_at IS NULL OR old.expires_at>unixepoch()*1000))
BEGIN
  SELECT RAISE(ABORT,'processing_receipt_delete_forbidden');
END;

CREATE TRIGGER workflow_events_no_update
BEFORE UPDATE ON item_workflow_events BEGIN
  SELECT RAISE(ABORT,'processing_event_immutable');
END;


CREATE TRIGGER workflow_events_guarded_delete
BEFORE DELETE ON item_workflow_events
WHEN EXISTS(SELECT 1 FROM items WHERE id=old.item_id)
BEGIN
  SELECT RAISE(ABORT,'processing_event_delete_forbidden');
END;

CREATE TRIGGER workflow_event_projection_guard
BEFORE INSERT ON item_workflow_events
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM processing_mutation_receipts r JOIN items i ON i.id=new.item_id
    WHERE r.mutation_id=new.mutation_id AND r.item_id=new.item_id
      AND r.outcome_class='accepted_effective'
      AND r.accepted_event_uuid=new.event_uuid
      AND r.accepted_item_version=new.item_version
      AND i.workflow_version=new.item_version
      AND i.workflow_last_event_uuid=new.event_uuid
      AND i.workflow_status=new.to_status
      AND i.workflow_archived_at IS new.to_archived_at
      AND i.workflow_inbox_entered_at IS new.to_inbox_entered_at
      AND i.workflow_inbox_episode_id IS new.to_inbox_episode_id
      AND i.workflow_status_changed_at IS new.to_status_changed_at
      AND i.workflow_current_done_entered_at IS new.to_current_done_entered_at
  ) THEN RAISE(ABORT,'processing_event_projection_mismatch') END;
  SELECT CASE WHEN new.undo_of_event_uuid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM item_workflow_events prior
    WHERE prior.event_uuid=new.undo_of_event_uuid AND prior.item_id=new.item_id
      AND prior.event_type IN ('status_changed','archived','restored','reprocessed')
      AND prior.item_version < new.item_version
  ) THEN RAISE(ABORT,'processing_undo_target_invalid') END;
END;

CREATE TRIGGER processing_job_item_deleted
AFTER UPDATE OF item_id ON processing_enrollment_job_items
WHEN old.item_id IS NOT NULL AND new.item_id IS NULL AND new.result='pending'
BEGIN
  UPDATE processing_enrollment_job_items SET result='deleted'
  WHERE job_id=new.job_id AND ordinal=new.ordinal;
END;

CREATE TRIGGER processing_workflow_epoch
AFTER INSERT ON item_workflow_events BEGIN
  UPDATE processing_runtime_state SET workflow_epoch=workflow_epoch+1,
    updated_at=unixepoch()*1000 WHERE singleton=1;
END;

CREATE TRIGGER processing_taxonomy_epoch_tags_insert AFTER INSERT ON tags BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_tags_update AFTER UPDATE ON tags BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_tags_delete AFTER DELETE ON tags BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_item_tags_insert AFTER INSERT ON item_tags BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_item_tags_delete AFTER DELETE ON item_tags BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_topics_insert AFTER INSERT ON topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_topics_update AFTER UPDATE ON topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_topics_delete AFTER DELETE ON topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_item_topics_insert AFTER INSERT ON item_topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_item_topics_update AFTER UPDATE ON item_topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;
CREATE TRIGGER processing_taxonomy_epoch_item_topics_delete AFTER DELETE ON item_topics BEGIN
  UPDATE processing_runtime_state SET taxonomy_epoch=taxonomy_epoch+1,updated_at=unixepoch()*1000 WHERE singleton=1;
END;

-- Permanent guard for binaries that still use the pre-025 INSERT column list.
CREATE TRIGGER items_workflow_raw_initialize
AFTER INSERT ON items
WHEN new.workflow_legacy_baseline=0 AND new.workflow_version=0
  AND new.workflow_status='inbox' AND new.workflow_enrolled_at IS NULL
  AND new.workflow_initialized_at IS NULL AND new.workflow_inbox_entered_at IS NULL
  AND new.workflow_inbox_episode_id IS NULL AND new.workflow_status_changed_at IS NULL
  AND new.workflow_current_done_entered_at IS NULL AND new.workflow_archived_at IS NULL
  AND new.workflow_last_event_uuid IS NULL
BEGIN
  INSERT INTO processing_mutation_receipts(
    mutation_id,scope_type,item_id,scope_key_hash,action_type,request_fingerprint,
    outcome_class,result_code,accepted_event_uuid,accepted_item_version,
    observed_item_version,confirmed_at,created_at)
  VALUES(
    'raw_'||lower(hex(randomblob(16))),'initialization',new.id,
    lower(hex(randomblob(32))),'raw_initialize',lower(hex(randomblob(32))),
    'accepted_effective','raw_initialized',lower(hex(randomblob(16))),1,0,
    unixepoch()*1000,unixepoch()*1000);

  UPDATE items SET
    workflow_version=1,
    workflow_enrolled_at=unixepoch()*1000,
    workflow_initialized_at=unixepoch()*1000,
    workflow_inbox_entered_at=unixepoch()*1000,
    workflow_inbox_episode_id=lower(hex(randomblob(16))),
    workflow_status_changed_at=unixepoch()*1000,
    workflow_last_event_uuid=(SELECT accepted_event_uuid FROM processing_mutation_receipts
      WHERE item_id=new.id AND action_type='raw_initialize' ORDER BY rowid DESC LIMIT 1)
  WHERE id=new.id;

  INSERT INTO item_workflow_events(
    event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
    to_inbox_entered_at,to_inbox_episode_id,to_status_changed_at,
    origin,surface,actor_channel,occurred_at)
  SELECT r.accepted_event_uuid,i.id,1,r.mutation_id,'raw_initialized',NULL,'inbox',
    i.workflow_inbox_entered_at,i.workflow_inbox_episode_id,i.workflow_status_changed_at,
    'raw_guard','raw',
    CASE i.capture_source
      WHEN 'web' THEN 'web' WHEN 'android' THEN 'android'
      WHEN 'extension' THEN 'extension' WHEN 'telegram' THEN 'telegram'
      WHEN 'recall' THEN 'recall' WHEN 'system' THEN 'system'
      ELSE 'unknown_raw' END,
    i.workflow_status_changed_at
  FROM items i JOIN processing_mutation_receipts r ON r.item_id=i.id
  WHERE i.id=new.id AND r.action_type='raw_initialize'
  ORDER BY r.rowid DESC LIMIT 1;
END;

CREATE INDEX items_processing_inbox ON items(workflow_inbox_entered_at,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL AND workflow_status='inbox';
CREATE INDEX items_processing_active_status ON items(workflow_status,workflow_status_changed_at DESC,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL;
CREATE INDEX items_processing_active_capture_channel ON items(capture_source,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL;
CREATE INDEX items_processing_active_captured_at ON items(captured_at,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL;
CREATE INDEX items_processing_done ON items(workflow_current_done_entered_at DESC,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL AND workflow_status='done';
CREATE INDEX items_processing_archived ON items(workflow_archived_at DESC,id)
  WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NOT NULL;
CREATE INDEX workflow_events_item_time ON item_workflow_events(item_id,occurred_at DESC,id DESC);
CREATE INDEX workflow_events_metric ON item_workflow_events(event_type,occurred_at,item_id);
CREATE INDEX processing_receipts_item_time ON processing_mutation_receipts(item_id,created_at DESC);
CREATE INDEX processing_receipts_expiry ON processing_mutation_receipts(expires_at) WHERE item_id IS NULL;
CREATE INDEX processing_undo_expiry ON processing_undo_slots(undo_eligible_until);
CREATE INDEX processing_enrollment_progress ON processing_enrollment_job_items(job_id,result,ordinal);
