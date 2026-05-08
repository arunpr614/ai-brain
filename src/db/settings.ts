/**
 * Settings (key-value store). Typed at the call site; settings table
 * persists strings only — serialize JSON if you need structure.
 */
import { getDb } from "./client";

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, unixepoch() * 1000)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value);
}

export function getJsonSetting<T>(key: string, fallback: T): T {
  const raw = getSetting(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJsonSetting<T>(key: string, value: T): void {
  setSetting(key, JSON.stringify(value));
}

/**
 * Delete a setting row. Used by F-056 reset path to wipe auth.pin before
 * setup re-runs. Idempotent — missing rows are a no-op.
 */
export function deleteSetting(key: string): void {
  getDb().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
