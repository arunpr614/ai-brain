import { deleteSetting, getJsonSetting, setJsonSetting } from "@/db/settings";
import { logError } from "@/lib/errors/sink";

export const YOUTUBE_TIMEDTEXT_PROVIDER_KEY = "youtube_timedtext";
export const YOUTUBE_TIMEDTEXT_PROVIDER_NAME = "youtube_innertube_timedtext";

export const YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS = 45 * 60_000;
export const YOUTUBE_TIMEDTEXT_COOLDOWN_JITTER_MS = 15 * 60_000;

const YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING =
  "provider_health.youtube_timedtext";

export interface YoutubeTimedTextProviderHealth {
  providerKey: typeof YOUTUBE_TIMEDTEXT_PROVIDER_KEY;
  providerName: typeof YOUTUBE_TIMEDTEXT_PROVIDER_NAME;
  cooldownUntil: number | null;
  failureCount: number;
  lastFailureAt: number | null;
  lastFailureCode: string | null;
  lastStatusCode: number | null;
  lastSuccessAt: number | null;
  updatedAt: number;
}

export interface YoutubeTimedTextCooldownStatus {
  providerKey: typeof YOUTUBE_TIMEDTEXT_PROVIDER_KEY;
  active: boolean;
  cooldownUntil: number | null;
  remainingMs: number;
  lastFailureCode: string | null;
  lastStatusCode: number | null;
  failureCount: number;
}

export interface YoutubeTimedTextProviderOutcome {
  state: "success" | "retryable_error" | "manual_needed";
  retryable: boolean;
  errorCode?: string | null;
  statusCode?: number | null;
  now?: number;
}

const DEFAULT_HEALTH: YoutubeTimedTextProviderHealth = {
  providerKey: YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
  providerName: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
  cooldownUntil: null,
  failureCount: 0,
  lastFailureAt: null,
  lastFailureCode: null,
  lastStatusCode: null,
  lastSuccessAt: null,
  updatedAt: 0,
};

export function getYoutubeTimedTextProviderHealth(): YoutubeTimedTextProviderHealth {
  return normalizeHealth(
    getJsonSetting<Partial<YoutubeTimedTextProviderHealth>>(
      YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING,
      DEFAULT_HEALTH,
    ),
  );
}

export function getYoutubeTimedTextCooldown(
  now = Date.now(),
): YoutubeTimedTextCooldownStatus {
  const health = getYoutubeTimedTextProviderHealth();
  const cooldownUntil = health.cooldownUntil ?? null;
  const remainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  return {
    providerKey: YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
    active: remainingMs > 0,
    cooldownUntil,
    remainingMs,
    lastFailureCode: health.lastFailureCode,
    lastStatusCode: health.lastStatusCode,
    failureCount: health.failureCount,
  };
}

export function recordYoutubeTimedTextProviderOutcome(
  outcome: YoutubeTimedTextProviderOutcome,
): YoutubeTimedTextProviderHealth {
  const now = outcome.now ?? Date.now();
  const previous = getYoutubeTimedTextProviderHealth();

  if (outcome.state === "success") {
    const next = {
      ...previous,
      cooldownUntil: null,
      failureCount: 0,
      lastFailureAt: null,
      lastFailureCode: null,
      lastStatusCode: null,
      lastSuccessAt: now,
      updatedAt: now,
    };
    setJsonSetting(YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING, next);
    return next;
  }

  const failureCount = previous.failureCount + 1;
  const throttled = isYoutubeTimedTextProviderThrottled(outcome);
  const cooldownUntil = throttled
    ? Math.max(
        previous.cooldownUntil ?? 0,
        now + youtubeTimedTextCooldownDelayMs(),
      )
    : previous.cooldownUntil;

  const next = {
    ...previous,
    cooldownUntil,
    failureCount,
    lastFailureAt: now,
    lastFailureCode: outcome.errorCode ?? null,
    lastStatusCode: outcome.statusCode ?? null,
    updatedAt: now,
  };
  setJsonSetting(YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING, next);
  return next;
}

export function isYoutubeTimedTextProviderThrottled(
  outcome: Pick<YoutubeTimedTextProviderOutcome, "errorCode" | "statusCode">,
): boolean {
  return (
    outcome.statusCode === 429 ||
    outcome.errorCode === "timedtext_http_429" ||
    outcome.errorCode === "youtube_antibot_metadata_only"
  );
}

export function youtubeTimedTextCooldownDelayMs(
  random = Math.random,
): number {
  const jitter = Math.floor(random() * YOUTUBE_TIMEDTEXT_COOLDOWN_JITTER_MS);
  return YOUTUBE_TIMEDTEXT_COOLDOWN_MIN_MS + jitter;
}

export function logTranscriptProviderEvent(
  entry: Record<string, unknown>,
): void {
  logError({
    type: "transcript.provider",
    ts: Date.now(),
    ...entry,
  });
}

export function clearYoutubeTimedTextProviderHealthForTests(): void {
  deleteSetting(YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING);
}

export function setYoutubeTimedTextProviderHealthForTests(
  patch: Partial<YoutubeTimedTextProviderHealth>,
): YoutubeTimedTextProviderHealth {
  const next = normalizeHealth({
    ...DEFAULT_HEALTH,
    ...patch,
    updatedAt: patch.updatedAt ?? Date.now(),
  });
  setJsonSetting(YOUTUBE_TIMEDTEXT_PROVIDER_HEALTH_SETTING, next);
  return next;
}

function normalizeHealth(
  value: Partial<YoutubeTimedTextProviderHealth>,
): YoutubeTimedTextProviderHealth {
  return {
    providerKey: YOUTUBE_TIMEDTEXT_PROVIDER_KEY,
    providerName: YOUTUBE_TIMEDTEXT_PROVIDER_NAME,
    cooldownUntil: numericOrNull(value.cooldownUntil),
    failureCount: Math.max(0, Number(value.failureCount ?? 0)),
    lastFailureAt: numericOrNull(value.lastFailureAt),
    lastFailureCode:
      typeof value.lastFailureCode === "string" ? value.lastFailureCode : null,
    lastStatusCode: numericOrNull(value.lastStatusCode),
    lastSuccessAt: numericOrNull(value.lastSuccessAt),
    updatedAt: Number(value.updatedAt ?? 0),
  };
}

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
