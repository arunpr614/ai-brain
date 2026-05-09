/**
 * 2-second share-dedup window (v0.5.0 T-12 / F-041).
 *
 * The Capgo share-target plugin double-fires `shareReceived` on APK cold
 * start (v0.0.1 S-003 observation): once in onCreate(), once again in
 * onNewIntent() when the WebView is ready. Without dedup the user sees
 * their URL captured twice.
 *
 * Same shape used on both client (WebView JS before POST) and server
 * (defense-in-depth before insertCaptured). Keying on a hash of the
 * payload so two legitimate shares of the same URL 3 seconds apart
 * still both land; only the <2s retriggers are collapsed.
 *
 * In-process Map resets on server restart / WebView reload. Bounded by
 * the implicit TTL sweep on every check.
 */

const DEDUP_WINDOW_MS = 2000;

interface DedupStore {
  has(key: string, now: number): boolean;
  record(key: string, now: number): void;
}

/** Default singleton — one per process. */
const GLOBAL_STORE = new Map<string, number>();

function sweep(store: Map<string, number>, now: number): void {
  for (const [k, t] of store) {
    if (now - t > DEDUP_WINDOW_MS) store.delete(k);
  }
}

/**
 * Returns true if the payload was seen within DEDUP_WINDOW_MS and the
 * caller should drop this share; false if the payload is fresh. Records
 * the key on a false return.
 */
export function isDuplicateShare(
  key: string,
  options?: { now?: number; store?: Map<string, number> },
): boolean {
  const store = options?.store ?? GLOBAL_STORE;
  const now = options?.now ?? Date.now();
  sweep(store, now);
  if (store.has(key)) return true;
  store.set(key, now);
  return false;
}

/**
 * Build a stable dedup key for a URL/note/PDF share. Uses the primary
 * content identifier only — URL for URLs, body hash for notes, filename
 * + size for PDFs. Callers prefix with the source_type to avoid
 * collisions across types.
 */
export function shareDedupKey(
  source: "url" | "note" | "pdf",
  primary: string,
): string {
  return `${source}:${primary}`;
}

/** Test-only helper to clear the global store between tests. */
export function __resetDedupForTests(): void {
  GLOBAL_STORE.clear();
}

export { DEDUP_WINDOW_MS };
export type { DedupStore };
