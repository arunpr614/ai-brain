-- 027_notebooklm_url_sources.sql — preserve and dispatch canonical item URLs

ALTER TABLE notebooklm_export_requests
  ADD COLUMN payload_kind TEXT NOT NULL DEFAULT 'copied_text'
  CHECK (payload_kind IN ('copied_text', 'url'));

ALTER TABLE notebooklm_export_requests
  ADD COLUMN payload_url TEXT
  CHECK (payload_url IS NULL OR length(payload_url) BETWEEN 1 AND 4096);

CREATE TRIGGER notebooklm_url_payload_insert_guard
BEFORE INSERT ON notebooklm_export_requests
WHEN
  (NEW.payload_kind = 'copied_text' AND NEW.payload_url IS NOT NULL)
  OR
  (NEW.payload_kind = 'url' AND
    ((NEW.payload_title IS NULL) != (NEW.payload_url IS NULL)))
BEGIN
  SELECT RAISE(ABORT, 'invalid NotebookLM URL payload');
END;

CREATE TRIGGER notebooklm_url_payload_update_guard
BEFORE UPDATE OF payload_kind, payload_title, payload_text, payload_url
ON notebooklm_export_requests
WHEN
  (NEW.payload_kind = 'copied_text' AND NEW.payload_url IS NOT NULL)
  OR
  (NEW.payload_kind = 'url' AND NEW.payload_title IS NOT NULL AND NEW.payload_url IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'invalid NotebookLM URL payload');
END;

-- A pre-027 runtime does not know about payload_url. If an automatic rollback
-- runs its older retention/backup scrub, clearing the legacy title/text pair
-- must also clear the URL rather than leave a frozen source URL behind.
CREATE TRIGGER notebooklm_url_payload_legacy_purge
AFTER UPDATE OF payload_title, payload_text
ON notebooklm_export_requests
WHEN
  NEW.payload_kind = 'url'
  AND NEW.payload_title IS NULL
  AND NEW.payload_text IS NULL
  AND NEW.payload_url IS NOT NULL
BEGIN
  UPDATE notebooklm_export_requests
  SET payload_url = NULL
  WHERE id = NEW.id;
END;
