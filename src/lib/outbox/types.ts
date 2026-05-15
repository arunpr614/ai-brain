/**
 * Outbox types — v0.6.x offline mode (OFFLINE-1B / plan v3 §4.3).
 *
 * Discriminated union supports three share kinds with kind-specific
 * payload shapes. PDF entries hold a filesystem path + SHA256, never
 * the bytes — the WebView quota would not survive even a few PDFs in
 * IDB blobs (plan §5.1, A-2 / A-3 critique).
 *
 * IndexedDB stores records via structured clone, NOT JSON. Implementers
 * must NOT JSON.stringify before put(); Dates round-trip natively, and
 * Blobs CAN be stored — but PDFs use filesystem path instead because
 * the bytes survive quota pressure better there (plan §5.1).
 */

/** Outbox row status — five values; `pending` from earlier drafts is dropped. */
export type OutboxStatus = "queued" | "synced" | "stuck" | "duplicate";

/** Reason classifier for `stuck` rows; also annotated on transient retries. */
export type OutboxStatusReason =
  | "auth_bad"
  | "payload_bad"
  | "version_mismatch"
  | "transient";

/** Fields shared by every kind. */
export interface OutboxEntryBase {
  id: string;
  status: OutboxStatus;
  status_reason?: OutboxStatusReason;
  attempts: number;
  created_at: number;
  last_attempt_at?: number;
  last_error?: string;
  next_retry_at?: number;
  server_id?: string;
  /** Per-kind dedup key. See plan §5.2 for the exact derivation per kind. */
  content_hash: string;
}

export interface OutboxUrlEntry extends OutboxEntryBase {
  kind: "url";
  payload: { url: string; title?: string; text?: string };
}

export interface OutboxNoteEntry extends OutboxEntryBase {
  kind: "note";
  payload: { title: string; body: string };
}

export interface OutboxPdfEntry extends OutboxEntryBase {
  kind: "pdf";
  /** App-private filesystem path (Filesystem.Directory.Data). */
  file_path: string;
  file_name: string;
  /** Bytes — used for >25 MB early reject and the (name, size) dedup fallback. */
  file_size: number;
  /** SHA256 hex of the bytes; computed in a Web Worker per plan §5.2 (B-2). */
  expected_sha256: string;
}

export type OutboxEntry = OutboxUrlEntry | OutboxNoteEntry | OutboxPdfEntry;

/** Kind discriminator literal type — useful for indexing by kind. */
export type OutboxKind = OutboxEntry["kind"];
