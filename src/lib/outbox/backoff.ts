/**
 * Outbox retry backoff math — v0.6.x offline mode (OFFLINE-2 / plan v3 §5.3).
 *
 * Pure functions: no fetches, no IDB, no globals beyond the rng injected
 * by tests. The sync-worker calls `nextRetryAt(attempts, now)` after a
 * transient failure to compute the row's `next_retry_at` field.
 *
 * Schedule (plan §5.3):
 *   attempt 1  → +10s
 *   attempt 2  → +20s
 *   attempt 3  → +40s
 *   attempt 4  → +80s
 *   attempt 5  → +160s (~3 min)
 *   attempt 6  → +320s (~5 min)
 *   attempt 7  → +640s (~10 min)
 *   attempt 8  → +1280s (~21 min)
 *   attempt 9+ → +3600s (1 hour cap)
 *
 * Jitter is ±25% of the base delay, applied multiplicatively. Tests pass
 * a deterministic rng via the `rng` option to assert exact values.
 */

/** Base delay before jitter, in milliseconds. */
export const BASE_DELAY_MS = 10_000;
/** Maximum delay before jitter — caps the exponential. 1 hour. */
export const MAX_DELAY_MS = 3_600_000;
/** Jitter is ±25% of the base delay. Symmetric so the long-run mean is unbiased. */
export const JITTER_RATIO = 0.25;

/**
 * Compute the additive delay (ms) for a given attempt count, before jitter.
 * `attempts` is the number of retries already made — so attempts=1 means
 * "this is the first retry," giving the +10s schedule entry above.
 *
 * Numbers <1 are clamped to 1 (defensive against caller bugs).
 */
export function baseDelayMs(attempts: number): number {
  const a = Math.max(1, Math.floor(attempts));
  // Plan §5.3 schedule: attempts 1..8 follow exponential 2^(a-1) * 10s;
  // attempts 9+ are flat at the 1-hour cap. The pure-exponential form
  // would only reach the cap at attempt 10 (2^9 * 10s = 5120s > 3600s),
  // but the plan explicitly says "attempt 9+ → +3600s." Honor the plan.
  if (a >= 9) return MAX_DELAY_MS;
  const factor = 2 ** (a - 1);
  return BASE_DELAY_MS * factor;
}

/**
 * Apply ±25% jitter to a delay. `rng` returns a value in [0, 1) — defaults
 * to Math.random; tests inject a fixed value for determinism.
 */
export function applyJitter(
  delayMs: number,
  rng: () => number = Math.random,
): number {
  const r = rng();
  // r in [0, 1) → jitter in [-JITTER_RATIO, +JITTER_RATIO)
  const jitter = (r * 2 - 1) * JITTER_RATIO;
  return Math.max(0, Math.round(delayMs * (1 + jitter)));
}

/**
 * Compute the next_retry_at timestamp (ms epoch) for a row whose `attempts`
 * counter is about to be set to the value passed in. Tests inject
 * `rng` and `now`; production callers omit both.
 */
export function nextRetryAt(
  attempts: number,
  opts?: { now?: number; rng?: () => number },
): number {
  const now = opts?.now ?? Date.now();
  const delay = applyJitter(baseDelayMs(attempts), opts?.rng);
  return now + delay;
}

/**
 * If a 429 response carries a Retry-After header, the sync-worker should
 * use that exact value instead of the exponential schedule. This helper
 * parses the header (seconds OR HTTP-date), returning ms or null when the
 * header is absent / unparseable. The caller falls back to the regular
 * schedule on null.
 */
export function parseRetryAfterMs(
  header: string | null,
  now: number = Date.now(),
): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed) return null;
  // Numeric form takes precedence. If the input parses as a finite number
  // we treat that as authoritative — positive ⇒ seconds, negative ⇒ reject
  // (do NOT fall through to Date.parse, which would interpret "-5" as a
  // year and return a wildly wrong timestamp).
  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds)) {
    return asSeconds >= 0 ? Math.round(asSeconds * 1000) : null;
  }
  // Try HTTP-date (RFC 7231).
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - now);
  }
  return null;
}
