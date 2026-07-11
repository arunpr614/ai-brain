export type RecallManualActivityState =
  | "queued"
  | "queued_behind_automatic"
  | "running_manual"
  | "running_automatic"
  | "done"
  | "blocked"
  | "error"
  | "partial_failure"
  | "expired";

export type RecallManualSafeReason =
  | "active"
  | "connection_attention"
  | "authentication_attention"
  | "rate_limited"
  | "safety_attention"
  | "worker_unavailable"
  | "internal"
  | "expired";

export interface RecallManualActivity {
  requestId: string | null;
  state: RecallManualActivityState;
  requestedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  heartbeatAt: string | null;
  safeReason: RecallManualSafeReason | null;
  counts: { imported: number; upgraded: number; alreadyCurrent: number } | null;
}

export interface RecallManualSyncStatus {
  enabled: boolean;
  available: boolean;
  activity: RecallManualActivity | null;
  lastSuccessfulSyncAt: string | null;
  nextAutomaticSyncAt: string | null;
  retryAfterSeconds: number;
  observedAt: string;
  idempotencyAcknowledgement: {
    state: "active" | "terminal" | "absent";
    requestId: string | null;
    activityState: RecallManualActivityState | null;
    resolutionAfterMs: number;
  } | null;
  requestAcknowledgement: {
    state: "active" | "terminal" | "absent";
    requestId: string | null;
    activityState: RecallManualActivityState | null;
  } | null;
}

export interface RecallManualSyncAccepted {
  requestId: string;
  state: "queued" | "running";
  deduplicated: boolean;
  observedAt: string;
}

export interface RecallManualSyncTerminalReplay {
  error: "terminal_replay" | "cooldown";
  requestId: string;
  state: Exclude<RecallManualActivityState, "queued" | "queued_behind_automatic" | "running_manual" | "running_automatic">;
  retryAfterSeconds: number;
  observedAt: string;
}

export function formatRecallIst(iso: string | null, nowMs = Date.now()): string {
  if (!iso) return "Not yet synced";
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return "Not yet synced";
  const dateParts = parts(instant);
  const today = parts(new Date(nowMs));
  const yesterday = parts(new Date(nowMs - 24 * 60 * 60 * 1000));
  const time = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant).replace(/\b(am|pm)\b/i, (value) => value.toUpperCase());
  const prefix = sameDay(dateParts, today)
    ? "Today"
    : sameDay(dateParts, yesterday)
      ? "Yesterday"
      : new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(instant);
  return `${prefix}, ${time} IST`;
}

function parts(date: Date): { year: string; month: string; day: string } {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return {
    year: values.find((part) => part.type === "year")!.value,
    month: values.find((part) => part.type === "month")!.value,
    day: values.find((part) => part.type === "day")!.value,
  };
}

function sameDay(a: ReturnType<typeof parts>, b: ReturnType<typeof parts>): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function formatRecallCounts(counts: RecallManualActivity["counts"]): string {
  if (!counts) return "";
  const clauses: string[] = [];
  for (const [count, label] of [
    [counts.imported, "imported"],
    [counts.upgraded, "upgraded"],
    [counts.alreadyCurrent, "already current"],
  ] as const) {
    if (count > 0) clauses.push(`${count} ${count === 1 ? "item" : "items"} ${label}`);
  }
  return clauses.join(" · ");
}
