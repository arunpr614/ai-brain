/**
 * Outbox sync-worker orchestrator — v0.6.x offline mode (OFFLINE-3 / plan v3 §4.2 + §5.3 + §5.8).
 *
 * Walks the outbox `queued` snapshot, attempts a POST per entry, classifies
 * the result, and applies the disposition (mark synced | bump attempts +
 * schedule next retry | mark stuck). All I/O lives behind a `Transport`
 * shape so tests can drive deterministic outcomes without spinning up a
 * fetch mock.
 *
 * What this module does NOT do:
 *   - Build the request body / pick the URL — that's the Transport's job.
 *     Keeps this file pure: input is OutboxEntry, output is the next-state
 *     write, no knowledge of HTTP shape.
 *   - Spawn the Web Worker for PDF SHA256 — that happens earlier in the
 *     enqueue path (share-handler / OFFLINE-4).
 *   - Read network state — triggers.ts (OFFLINE-4) calls
 *     `resetQueuedRetryTimes(db)` on connectivity-regain to wake stalled
 *     rows; the orchestrator itself doesn't care.
 *   - Lock concurrent runs — the caller is responsible for not invoking
 *     syncOnce twice in parallel. In practice triggers.ts uses a single
 *     in-memory flag; tests run serially.
 *
 * Snapshot semantics (plan §5.8 / C-4): syncOnce reads all queued entries
 * once at the start. New entries enqueued during the run join the next
 * cycle, not the current one.
 */

import type { ProbeOutcome, Disposition } from "./classify";
import { classifyOutcome } from "./classify";
import { nextRetryAt, parseRetryAfterMs } from "./backoff";
import { listByStatus, putEntry, type OutboxDb } from "./storage";
import type { OutboxEntry } from "./types";

/**
 * The single dependency the orchestrator has on the network. The
 * production implementation calls fetch with the right URL/headers/body
 * for each kind; tests inject a scripted handler keyed by entry id.
 *
 * Transport functions MUST NOT throw — they should always populate a
 * ProbeOutcome (using `kind: 'network-error'` if fetch threw, or
 * `kind: 'http-non-json'` if the body parse failed). The orchestrator
 * relies on this to keep the per-entry try/catch surface minimal.
 */
export type Transport = (entry: OutboxEntry) => Promise<ProbeOutcome>;

/** Result summary returned by syncOnce — useful for tests + UI badges. */
export interface SyncResult {
  attempted: number;
  synced: number;
  remainedQueued: number;
  becameStuck: number;
  skippedCooldown: number;
}

/** Per-entry update opts so tests can pin time + jitter. */
export interface OrchestratorOpts {
  now?: number;
  rng?: () => number;
}

/**
 * Drain the queued snapshot once. Each entry is attempted at most once;
 * subsequent calls (next foreground / network-change / 30s tick) drain
 * any rows whose next_retry_at has come due.
 */
export async function syncOnce(
  db: OutboxDb,
  transport: Transport,
  opts?: OrchestratorOpts,
): Promise<SyncResult> {
  const now = opts?.now ?? Date.now();
  const snapshot = await listByStatus(db, "queued");

  const result: SyncResult = {
    attempted: 0,
    synced: 0,
    remainedQueued: 0,
    becameStuck: 0,
    skippedCooldown: 0,
  };

  for (const entry of snapshot) {
    if (entry.next_retry_at !== undefined && entry.next_retry_at > now) {
      result.skippedCooldown++;
      continue;
    }
    result.attempted++;
    const outcome = await transport(entry);
    const disposition = classifyOutcome(outcome);
    const nextEntry = applyDisposition(entry, disposition, outcome, {
      now,
      rng: opts?.rng,
    });
    await putEntry(db, nextEntry);
    if (nextEntry.status === "synced") result.synced++;
    else if (nextEntry.status === "stuck") result.becameStuck++;
    else if (nextEntry.status === "queued") result.remainedQueued++;
  }

  return result;
}

/**
 * Pure projection: given an entry, the disposition the classifier produced,
 * and the raw outcome (needed for the 429 Retry-After header), return the
 * entry as it should be written back to IDB. Exposed for testing without
 * the orchestrator.
 *
 * Behavior per plan §5.3:
 *   - synced  → status=synced, attempts=0, last_error/next_retry_at cleared,
 *               server_id populated when the body had one (B-7 reset).
 *   - stuck   → status=stuck, status_reason populated, last_error human copy.
 *   - transient → status stays queued, attempts incremented, next_retry_at
 *               set to now + backoff(attempts) — unless the outcome carries
 *               a Retry-After header (429), in which case that wins.
 */
export function applyDisposition(
  entry: OutboxEntry,
  disposition: Disposition,
  outcome: ProbeOutcome,
  opts: { now: number; rng?: () => number },
): OutboxEntry {
  const { now, rng } = opts;
  const base = { ...entry, last_attempt_at: now };

  if (disposition.kind === "synced") {
    return {
      ...base,
      status: "synced",
      status_reason: undefined,
      attempts: 0,
      last_error: undefined,
      next_retry_at: undefined,
      server_id: disposition.serverItemId ?? base.server_id,
    } as OutboxEntry;
  }

  if (disposition.kind === "stuck") {
    return {
      ...base,
      status: "stuck",
      status_reason: disposition.reason,
      last_error: stuckErrorCopy(disposition.reason),
      next_retry_at: undefined,
    } as OutboxEntry;
  }

  // transient
  const newAttempts = base.attempts + 1;
  const explicitRetryAfter =
    outcome.kind === "http-json"
      ? parseRetryAfterMs(outcome.retryAfter, now)
      : null;
  const computed =
    explicitRetryAfter !== null
      ? now + explicitRetryAfter
      : nextRetryAt(newAttempts, { now, rng });

  return {
    ...base,
    status: "queued",
    status_reason: "transient",
    attempts: newAttempts,
    last_error: disposition.reason,
    next_retry_at: computed,
  } as OutboxEntry;
}

/**
 * Reset next_retry_at on every queued row to now — so the next syncOnce
 * call attempts them all immediately. Intended for triggers.ts to call
 * when @capacitor/network reports the device returned online.
 *
 * Per plan §5.3: "When @capacitor/network reports network-state-change to
 * online, every queued entry's next_retry_at resets to 'now'."
 */
export async function resetQueuedRetryTimes(
  db: OutboxDb,
  opts?: { now?: number },
): Promise<number> {
  const now = opts?.now ?? Date.now();
  const queued = await listByStatus(db, "queued");
  let updated = 0;
  for (const entry of queued) {
    if (entry.next_retry_at !== undefined && entry.next_retry_at > now) {
      await putEntry(db, { ...entry, next_retry_at: now });
      updated++;
    }
  }
  return updated;
}

/**
 * Maps a stuck-reason to user-facing copy. Final wording is polished in
 * OFFLINE-10; these are the placeholder strings the inbox UI renders today.
 * Kept here (not in a strings.ts) so the orchestrator's contract is
 * self-contained — the test asserts these match the §3.3 / §5.3 narrative.
 */
type StuckReason = Extract<Disposition, { kind: "stuck" }>["reason"];

function stuckErrorCopy(reason: StuckReason): string {
  switch (reason) {
    case "auth_bad":
      return "Re-pair your device in Settings.";
    case "version_mismatch":
      return "Update Brain to sync these items.";
    case "payload_bad":
      return "Item couldn't be saved.";
  }
}
