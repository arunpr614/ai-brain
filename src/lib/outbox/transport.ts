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
import type { OutboxEntry, OutboxNoteEntry, OutboxUrlEntry } from "./types";

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
 * Multiplexer that the sync-worker can call without knowing the kind.
 * Throws on PDF entries — they are not yet outbox-wired (OFFLINE-9).
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
        // PDF outbox wiring lands in OFFLINE-9. Until then any pdf entry
        // surfacing here is a programmer error — the share-handler routes
        // PDFs through the direct-POST capturePdf() path.
        return {
          kind: "network-error",
          message: "pdf-outbox-not-implemented",
        };
    }
  };
}
