import { getDb, newId, type CaptureArtifactRow } from "./client";

export interface InsertCaptureArtifactInput {
  id?: string;
  item_id: string;
  kind: string;
  path?: string | null;
  relative_path?: string | null;
  content_type?: string | null;
  sha256?: string | null;
  size_bytes?: number | null;
  truncated?: boolean | number;
  write_status?: CaptureArtifactRow["write_status"];
  error_message?: string | null;
  created_at?: number;
}

export function insertCaptureArtifact(input: InsertCaptureArtifactInput): CaptureArtifactRow {
  const db = getDb();
  const id = input.id ?? newId();
  const createdAt = input.created_at ?? Date.now();
  db.prepare(
    `INSERT INTO capture_artifacts (
       id, item_id, kind, path, relative_path, content_type, sha256,
       size_bytes, truncated, write_status, error_message, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.item_id,
    input.kind,
    input.path ?? null,
    input.relative_path ?? null,
    input.content_type ?? null,
    input.sha256 ?? null,
    input.size_bytes ?? null,
    input.truncated ? 1 : 0,
    input.write_status ?? "ok",
    input.error_message ?? null,
    createdAt,
  );
  return getCaptureArtifact(id)!;
}

export function getCaptureArtifact(id: string): CaptureArtifactRow | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM capture_artifacts WHERE id = ?")
    .get(id) as CaptureArtifactRow | undefined;
  return row ?? null;
}

export function listCaptureArtifactsForItem(itemId: string): CaptureArtifactRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM capture_artifacts WHERE item_id = ? ORDER BY created_at ASC")
    .all(itemId) as CaptureArtifactRow[];
}

export function deleteCaptureArtifactRowsForItem(itemId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM capture_artifacts WHERE item_id = ?").run(itemId);
}
