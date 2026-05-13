/**
 * Outbox Transport implementations — v0.6.x offline mode (OFFLINE-4 / plan v3 §4.2).
 *
 * The sync-worker orchestrator is kind-agnostic: it just calls a
 * Transport(entry) → ProbeOutcome and applies the resulting disposition.
 * This file builds the per-kind fetch wrappers — translating each
 * OutboxEntry into the request the existing `/api/capture/{url,note,pdf}`
 * routes expect.
 *
 * Contract: a Transport MUST NOT throw. Network errors are surfaced as
 * `{ kind: 'network-error', message }`; non-JSON success bodies as
 * `{ kind: 'http-non-json', status, contentType }` (plan §5.3 v3 B-3 fix
 * for captive-portal HTML responses); everything else as
 * `{ kind: 'http-json', status, retryAfter, body }`.
 *
 * PDF transport is intentionally absent — PDFs continue to use the
 * existing direct-POST path in share-handler until OFFLINE-9 wires the
 * filesystem-blob outbox path. Plan §7 separates this concern.
 */

import type { ProbeOutcome } from "./classify";
import { deletePdf, readPdfBytes } from "./pdf-storage";
import type { OutboxEntry, OutboxNoteEntry, OutboxPdfEntry, OutboxUrlEntry } from "./types";

/** Headers every outbox POST sends. The X-Brain-Client-Api header
 *  triggers the server-side version check (plan §5.5 / OFFLINE-6).
 */
function buildHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "x-brain-client-api": "1",
  };
}

/**
 * Drive a fetch + JSON parse into a normalized ProbeOutcome. Used by the
 * URL and note transports. PDFs send multipart and don't go through here.
 */
async function probe(
  url: string,
  init: RequestInit,
): Promise<ProbeOutcome> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    return {
      kind: "network-error",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const retryAfter = res.headers.get("retry-after");
  const contentType = res.headers.get("content-type");

  // Treat any 2xx-or-larger response as a candidate for JSON parsing — but
  // bail to http-non-json the moment the parse fails. Captive portals
  // routinely return text/html with status 200 (plan §5.3 v3 B-3).
  let body: unknown;
  try {
    // res.json() throws on empty body, so use text + JSON.parse for control.
    const text = await res.text();
    body = text.length === 0 ? null : JSON.parse(text);
  } catch {
    return {
      kind: "http-non-json",
      status: res.status,
      contentType,
    };
  }

  return {
    kind: "http-json",
    status: res.status,
    retryAfter,
    body,
  };
}

/**
 * URL transport. Uses POST /api/capture/url with {url, title?, text?}.
 * Server returns either {id} on fresh capture or {duplicate: true, itemId}
 * on dedup match. classify.ts maps either to `synced` with serverItemId.
 */
export async function urlTransport(
  entry: OutboxUrlEntry,
  baseUrl: string,
  token: string,
): Promise<ProbeOutcome> {
  return probe(`${baseUrl}/api/capture/url`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(entry.payload),
  });
}

/**
 * Note transport. Uses POST /api/capture/note with {title, body}. Server
 * returns {id} on success.
 */
export async function noteTransport(
  entry: OutboxNoteEntry,
  baseUrl: string,
  token: string,
): Promise<ProbeOutcome> {
  return probe(`${baseUrl}/api/capture/note`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(entry.payload),
  });
}

/**
 * PDF transport. Reads bytes from app-private filesystem, POSTs as
 * multipart/form-data with the X-Expected-Sha256 header (matching the
 * existing capturePdf direct-POST contract), and on 2xx success deletes
 * the filesystem blob per plan §4.4 (PDF bytes deleted on sync; only
 * the metadata row remains).
 *
 * Note: multipart bodies don't carry the X-Brain-Client-Api header
 * elegantly via this Transport's buildHeaders helper because FormData
 * sets its own content-type. We pass the header explicitly here.
 */
export async function pdfTransport(
  entry: OutboxPdfEntry,
  baseUrl: string,
  token: string,
): Promise<ProbeOutcome> {
  let bytes: ArrayBuffer;
  try {
    bytes = await readPdfBytes(entry.file_path);
  } catch (err) {
    return {
      kind: "network-error",
      message: `pdf-read-failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const blob = new Blob([bytes], { type: "application/pdf" });
  const form = new FormData();
  form.append("pdf", blob, entry.file_name);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/capture/pdf`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "x-brain-client-api": "1",
        "x-expected-sha256": entry.expected_sha256,
      },
      body: form,
    });
  } catch (err) {
    return {
      kind: "network-error",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const retryAfter = res.headers.get("retry-after");
  const contentType = res.headers.get("content-type");

  let body: unknown;
  try {
    const text = await res.text();
    body = text.length === 0 ? null : JSON.parse(text);
  } catch {
    return {
      kind: "http-non-json",
      status: res.status,
      contentType,
    };
  }

  // On 2xx success, delete the filesystem blob per plan §4.4. The outbox
  // row's status flip to 'synced' happens later in applyDisposition; the
  // file deletion can race ahead because the bytes are no longer needed.
  if (res.status >= 200 && res.status < 300) {
    void deletePdf(entry.file_path);
  }

  return {
    kind: "http-json",
    status: res.status,
    retryAfter,
    body,
  };
}

/**
 * Multiplexer that the sync-worker can call without knowing the kind.
 */
export function buildTransport(
  baseUrl: string,
  token: string,
): (entry: OutboxEntry) => Promise<ProbeOutcome> {
  return async (entry) => {
    switch (entry.kind) {
      case "url":
        return urlTransport(entry, baseUrl, token);
      case "note":
        return noteTransport(entry, baseUrl, token);
      case "pdf":
        return pdfTransport(entry, baseUrl, token);
    }
  };
}
