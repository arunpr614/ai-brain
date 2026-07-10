import { getDb, newId } from "./client";

export type TranscriptPolicyPlatform = "youtube" | "uploaded_media" | "manual";
export type TranscriptEnvironment = "production" | "development" | "test" | "lab";
export type TranscriptRightsBasis =
  | "user_provided_transcript"
  | "owned_youtube_channel"
  | "authorized_youtube_video"
  | "owned_uploaded_media"
  | "public_lab_only"
  | "blocked_unknown_rights";
export type TranscriptAcquisitionMethod =
  | "user_paste"
  | "uploaded_file"
  | "youtube_official_caption"
  | "owned_media_stt"
  | "lab_public_caption";
export type TranscriptRetentionClass =
  | "full_text_allowed"
  | "derived_metrics_only"
  | "metadata_only";
export type TranscriptSourceKind = TranscriptAcquisitionMethod;
export type TranscriptCaptionSourceClass =
  | "manual"
  | "asr"
  | "standard"
  | "forced"
  | "stt"
  | "user_provided"
  | "unknown";
export type TranscriptTimestampMode = "timestamped" | "paragraph_only" | "inferred";
export type TranscriptSourceStatus = "active" | "superseded" | "deleted" | "blocked";

export interface CapturePolicyDecisionRow {
  id: string;
  item_id: string | null;
  source_url: string;
  platform: TranscriptPolicyPlatform;
  environment: TranscriptEnvironment;
  rights_basis: TranscriptRightsBasis;
  method: TranscriptAcquisitionMethod;
  retention_class: TranscriptRetentionClass;
  blocked_reason: string | null;
  production_allowed: 0 | 1;
  legal_approval_id: string | null;
  created_at: number;
}

export interface TranscriptSourceRow {
  id: string;
  item_id: string;
  policy_decision_id: string;
  source_kind: TranscriptSourceKind;
  language_code: string | null;
  caption_source_class: TranscriptCaptionSourceClass;
  timestamp_mode: TranscriptTimestampMode;
  provenance_json: string;
  retention_class: TranscriptRetentionClass;
  text_sha256: string;
  segment_count: number;
  status: TranscriptSourceStatus;
  created_at: number;
}

export interface TranscriptSegmentRow {
  id: string;
  transcript_source_id: string;
  item_id: string;
  idx: number;
  start_ms: number | null;
  duration_ms: number | null;
  end_ms: number | null;
  text: string;
  text_sha256: string;
  token_count: number | null;
  confidence: number | null;
  created_at: number;
}

export interface InsertCapturePolicyDecisionInput {
  item_id?: string | null;
  source_url: string;
  platform: TranscriptPolicyPlatform;
  environment: TranscriptEnvironment;
  rights_basis: TranscriptRightsBasis;
  method: TranscriptAcquisitionMethod;
  retention_class: TranscriptRetentionClass;
  blocked_reason?: string | null;
  production_allowed?: boolean;
  legal_approval_id?: string | null;
  created_at?: number;
}

export interface InsertTranscriptSourceInput {
  item_id: string;
  policy_decision_id: string;
  source_kind: TranscriptSourceKind;
  language_code?: string | null;
  caption_source_class: TranscriptCaptionSourceClass;
  timestamp_mode: TranscriptTimestampMode;
  provenance_json: string;
  retention_class: TranscriptRetentionClass;
  text_sha256: string;
  segment_count?: number;
  status?: TranscriptSourceStatus;
  created_at?: number;
}

export interface InsertTranscriptSegmentInput {
  transcript_source_id: string;
  item_id: string;
  idx: number;
  start_ms?: number | null;
  duration_ms?: number | null;
  end_ms?: number | null;
  text: string;
  text_sha256: string;
  token_count?: number | null;
  confidence?: number | null;
  created_at?: number;
}

export function insertCapturePolicyDecision(
  input: InsertCapturePolicyDecisionInput,
): CapturePolicyDecisionRow {
  const id = newId();
  const createdAt = input.created_at ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO capture_policy_decisions (
         id, item_id, source_url, platform, environment, rights_basis, method,
         retention_class, blocked_reason, production_allowed, legal_approval_id, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.item_id ?? null,
      input.source_url,
      input.platform,
      input.environment,
      input.rights_basis,
      input.method,
      input.retention_class,
      input.blocked_reason ?? null,
      input.production_allowed ? 1 : 0,
      input.legal_approval_id ?? null,
      createdAt,
    );
  return getCapturePolicyDecision(id)!;
}

export function getCapturePolicyDecision(id: string): CapturePolicyDecisionRow | null {
  const row = getDb()
    .prepare("SELECT * FROM capture_policy_decisions WHERE id = ?")
    .get(id) as CapturePolicyDecisionRow | undefined;
  return row ?? null;
}

export function listCapturePolicyDecisionsForItem(
  itemId: string,
): CapturePolicyDecisionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM capture_policy_decisions
       WHERE item_id = ?
       ORDER BY created_at DESC`,
    )
    .all(itemId) as CapturePolicyDecisionRow[];
}

export function insertTranscriptSource(input: InsertTranscriptSourceInput): TranscriptSourceRow {
  const id = newId();
  const createdAt = input.created_at ?? Date.now();
  getDb()
    .prepare(
      `INSERT INTO transcript_sources (
         id, item_id, policy_decision_id, source_kind, language_code,
         caption_source_class, timestamp_mode, provenance_json, retention_class,
         text_sha256, segment_count, status, created_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.item_id,
      input.policy_decision_id,
      input.source_kind,
      input.language_code ?? null,
      input.caption_source_class,
      input.timestamp_mode,
      input.provenance_json,
      input.retention_class,
      input.text_sha256,
      input.segment_count ?? 0,
      input.status ?? "active",
      createdAt,
    );
  return getTranscriptSource(id)!;
}

export function supersedeTranscriptSourcesForItem(itemId: string): number {
  return getDb()
    .prepare(
      `UPDATE transcript_sources
       SET status = 'superseded'
       WHERE item_id = ?
         AND status = 'active'`,
    )
    .run(itemId).changes;
}

export function getTranscriptSource(id: string): TranscriptSourceRow | null {
  const row = getDb()
    .prepare("SELECT * FROM transcript_sources WHERE id = ?")
    .get(id) as TranscriptSourceRow | undefined;
  return row ?? null;
}

export function listTranscriptSourcesForItem(itemId: string): TranscriptSourceRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM transcript_sources
       WHERE item_id = ?
       ORDER BY created_at DESC`,
    )
    .all(itemId) as TranscriptSourceRow[];
}

export function getActiveTranscriptSourceForItem(itemId: string): TranscriptSourceRow | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM transcript_sources
       WHERE item_id = ?
         AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(itemId) as TranscriptSourceRow | undefined;
  return row ?? null;
}

export function insertTranscriptSegments(
  inputs: InsertTranscriptSegmentInput[],
): TranscriptSegmentRow[] {
  if (inputs.length === 0) return [];
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO transcript_segments (
       id, transcript_source_id, item_id, idx, start_ms, duration_ms, end_ms,
       text, text_sha256, token_count, confidence, created_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const ids: string[] = [];
  const tx = db.transaction(() => {
    for (const input of inputs) {
      const id = newId();
      const createdAt = input.created_at ?? Date.now();
      insert.run(
        id,
        input.transcript_source_id,
        input.item_id,
        input.idx,
        input.start_ms ?? null,
        input.duration_ms ?? null,
        input.end_ms ?? null,
        input.text,
        input.text_sha256,
        input.token_count ?? null,
        input.confidence ?? null,
        createdAt,
      );
      ids.push(id);
    }
  });
  tx();
  return ids.map((id) => getTranscriptSegment(id)!);
}

export function getTranscriptSegment(id: string): TranscriptSegmentRow | null {
  const row = getDb()
    .prepare("SELECT * FROM transcript_segments WHERE id = ?")
    .get(id) as TranscriptSegmentRow | undefined;
  return row ?? null;
}

export function deleteTranscriptSegmentsForItem(itemId: string): number {
  return getDb()
    .prepare("DELETE FROM transcript_segments WHERE item_id = ?")
    .run(itemId).changes;
}

export function listTranscriptSegmentsForSource(
  transcriptSourceId: string,
  options: { limit?: number; offset?: number } = {},
): TranscriptSegmentRow[] {
  const { limit = 500, offset = 0 } = options;
  return getDb()
    .prepare(
      `SELECT * FROM transcript_segments
       WHERE transcript_source_id = ?
       ORDER BY idx ASC
       LIMIT ? OFFSET ?`,
    )
    .all(transcriptSourceId, limit, offset) as TranscriptSegmentRow[];
}

export function listActiveTranscriptSegmentsForItem(
  itemId: string,
  options: { limit?: number; offset?: number } = {},
): TranscriptSegmentRow[] {
  const source = getActiveTranscriptSourceForItem(itemId);
  if (!source) return [];
  return listTranscriptSegmentsForSource(source.id, options);
}
