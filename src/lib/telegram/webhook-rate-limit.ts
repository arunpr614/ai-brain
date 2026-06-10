const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function badSecretRateLimit(
  key: string,
  opts: { now?: number; limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return { limited: existing.count > limit, retryAfterSeconds };
}

export function badSecretRateLimitKey(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function __resetTelegramWebhookRateLimitForTests(): void {
  buckets.clear();
}
