-- 010_device_pairing_codes.sql — v0.7.1 temporary Android pairing codes
--
-- Codes are generated in the unlocked web UI, typed into the Android setup
-- screen, and exchanged once for the configured BRAIN_API_TOKEN. Store only a
-- keyed hash of the code; never persist the plaintext code.

CREATE TABLE IF NOT EXISTS device_pairing_codes (
  id              TEXT PRIMARY KEY,
  code_hash       TEXT NOT NULL UNIQUE,
  label           TEXT,
  created_at      INTEGER NOT NULL,
  expires_at      INTEGER NOT NULL,
  used_at         INTEGER,
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_attempt_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_device_pairing_codes_expires_at
  ON device_pairing_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_device_pairing_codes_used_at
  ON device_pairing_codes(used_at);
