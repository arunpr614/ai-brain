import { getDb, newId, type CaptureMetadataCacheRow } from "./client";

export interface UpsertCaptureMetadataCacheInput {
  platform: string;
  cache_key: string;
  payload_json: string;
  status?: string;
  expires_at: number;
}

export function getCaptureMetadataCache(
  platform: string,
  cacheKey: string,
  now = Date.now(),
): CaptureMetadataCacheRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM capture_metadata_cache
       WHERE platform = ? AND cache_key = ? AND expires_at > ?
       LIMIT 1`,
    )
    .get(platform, cacheKey, now) as CaptureMetadataCacheRow | undefined;
  return row ?? null;
}

export function upsertCaptureMetadataCache(
  input: UpsertCaptureMetadataCacheInput,
): CaptureMetadataCacheRow {
  const db = getDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO capture_metadata_cache (
       id, platform, cache_key, payload_json, status, expires_at, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(platform, cache_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       status = excluded.status,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`,
  ).run(
    id,
    input.platform,
    input.cache_key,
    input.payload_json,
    input.status ?? "ok",
    input.expires_at,
    now,
    now,
  );
  return getCaptureMetadataCache(input.platform, input.cache_key, now - 1)!;
}

export function deleteExpiredCaptureMetadataCache(now = Date.now()): number {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM capture_metadata_cache WHERE expires_at <= ?")
    .run(now);
  return result.changes;
}

