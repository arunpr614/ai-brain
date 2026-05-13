/**
 * Outbox dedup-key computation — v0.6.x offline mode (OFFLINE-2 / plan v3 §5.2).
 *
 * Computes the per-kind `content_hash` value stored on each OutboxEntry.
 * The 10-minute outbox-tier dedup (plan §5.2 step 2) queries the
 * by_content_hash index in storage.ts to discover whether the user has
 * already enqueued the same logical share.
 *
 * Three kinds:
 *   url   → SHA256 hex of normalize_url(payload.url) — strips tracking
 *           params (utm_*, fbclid, gclid, ref, source) and fragments,
 *           lowercases the host, removes trailing slash, sorts remaining
 *           query params for stability.
 *   note  → SHA256 hex of `${title}${body}` (unit-separator joins
 *           the two strings unambiguously).
 *   pdf   → SHA256 hex of the bytes; computed by sha256-worker.ts off the
 *           UI thread and passed in here. The shape of the hex string is
 *           the only contract — this module doesn't compute it.
 *
 * URL normalization rules — refined from the inline plan §5.2 sketch:
 *   - Lowercase host (case-insensitive in DNS).
 *   - Strip the fragment (#section anchors aren't a unique resource).
 *   - Strip params whose name matches: utm_*, fbclid, gclid, ref, source,
 *     mc_eid, mc_cid, _hsenc, _hsmi, ck_subscriber_id.
 *   - Sort the remaining params by name for stable hashing.
 *   - Strip the trailing slash from the pathname (but NOT for "/" itself).
 *
 * Path case is preserved (servers commonly differ between case-sensitive
 * and case-insensitive paths; we don't pretend to know which).
 */

import { canonicalYoutubeUrl, extractVideoId } from "@/lib/capture/youtube-url";
import type { OutboxEntry, OutboxKind } from "./types";

/** Param-name tokens stripped during URL normalization (lowercase). */
export const STRIP_PARAM_PREFIXES: readonly string[] = ["utm_"];
export const STRIP_PARAM_NAMES: readonly string[] = [
  "fbclid",
  "gclid",
  "ref",
  "source",
  "mc_eid",
  "mc_cid",
  "_hsenc",
  "_hsmi",
  "ck_subscriber_id",
];

/**
 * Canonicalize a URL for dedup-key purposes. Throws if the input cannot
 * be parsed by the URL constructor — caller is responsible for calling
 * a more permissive parser before this if needed.
 *
 * YouTube special case: any recognized variant (youtube.com/watch?v=,
 * youtu.be/, /shorts/, /embed/, etc.) collapses to the canonical
 * watch?v= form BEFORE the generic param-stripping logic runs. This
 * mirrors the server-side behavior in /api/capture/url:71-72 so the
 * client-side outbox dedup tier sees what the server sees: one share
 * per video, regardless of which surface the user shared from. Without
 * this collapse, sharing the same Short two ways while offline would
 * enqueue two rows that both later flip to `synced` with the same
 * server_id (correct, but cosmetically duplicated in /inbox).
 */
export function normalizeUrlForDedup(input: string): string {
  const trimmed = input.trim();
  const videoId = extractVideoId(trimmed);
  if (videoId) return canonicalYoutubeUrl(videoId);

  const url = new URL(trimmed);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();

  const keepParams = new Map<string, string[]>();
  for (const [name, value] of url.searchParams) {
    const lname = name.toLowerCase();
    if (STRIP_PARAM_PREFIXES.some((p) => lname.startsWith(p))) continue;
    if (STRIP_PARAM_NAMES.includes(lname)) continue;
    const arr = keepParams.get(name) ?? [];
    arr.push(value);
    keepParams.set(name, arr);
  }

  url.search = "";
  const sortedNames = [...keepParams.keys()].sort();
  for (const name of sortedNames) {
    const values = keepParams.get(name);
    if (!values) continue;
    for (const value of values) {
      url.searchParams.append(name, value);
    }
  }

  let serialized = url.toString();
  // Drop trailing slash except for the root path. URL.toString() always
  // emits a path, so we know there's at least "/" present.
  if (
    url.pathname.length > 1 &&
    url.pathname.endsWith("/") &&
    !url.search &&
    !url.hash
  ) {
    serialized = serialized.replace(/\/$/, "");
  }
  return serialized;
}

/**
 * SHA256 hex of a string. Wraps node:crypto so call sites read clearly.
 * Used for url/note dedup keys; PDF hashes are computed in a Web Worker
 * (sha256-worker.ts) and passed in via the `pdf` overload of
 * computeContentHash.
 */
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute the content_hash field for a URL entry.
 */
export async function urlContentHash(rawUrl: string): Promise<string> {
  const normalized = normalizeUrlForDedup(rawUrl);
  return sha256Hex(normalized);
}

/**
 * Compute the content_hash field for a note entry. Title and body are
 * separated by ASCII unit-separator () to prevent ambiguity
 * between e.g. {title="A B", body=""} and {title="A", body=" B"}.
 */
export async function noteContentHash(title: string, body: string): Promise<string> {
  return sha256Hex(`${title}${body}`);
}

/**
 * Compute the content_hash field for a PDF entry given the bytes hash
 * already computed by the Web Worker. This is just a passthrough for
 * symmetry with the url/note functions; we keep it as its own export so
 * callers don't have to know whether the hash is computed inline or
 * delegated.
 */
export function pdfContentHashFromBytes(sha256OfBytes: string): string {
  return sha256OfBytes;
}

/**
 * Convenience: derive content_hash for any kind from the bare inputs
 * the share-handler already has at enqueue time. PDF bytes-hash is
 * passed in because it is computed asynchronously in a Web Worker.
 */
export type ContentHashInput =
  | { kind: "url"; url: string }
  | { kind: "note"; title: string; body: string }
  | { kind: "pdf"; bytesSha256: string };

export async function computeContentHash(input: ContentHashInput): Promise<string> {
  switch (input.kind) {
    case "url":
      return urlContentHash(input.url);
    case "note":
      return noteContentHash(input.title, input.body);
    case "pdf":
      return pdfContentHashFromBytes(input.bytesSha256);
  }
}

/**
 * Pull the content_hash off an existing OutboxEntry. Useful for
 * sync-worker / inbox view code that needs to render the dedup key.
 */
export function entryContentHash(entry: OutboxEntry): string {
  return entry.content_hash;
}

/** Keys that exist for OFFLINE-2 — used by tests + future code-tour. */
export const SUPPORTED_KINDS: readonly OutboxKind[] = ["url", "note", "pdf"];
