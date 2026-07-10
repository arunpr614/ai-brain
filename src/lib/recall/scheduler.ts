import { redactReportValue } from "@/lib/security/redaction";

export const RECALL_SYNC_EXIT_CODES = {
  success: 0,
  unexpected_error: 1,
  config_error: 2,
  partial_failure: 10,
  rate_limited: 69,
  locked: 75,
  auth_failure: 77,
  cap_exceeded: 78,
  policy_blocked: 79,
  remote_changed: 80,
} as const;

export type RecallSyncMode = "dry_run" | "apply";
export type RecallSyncExitCodeName = keyof typeof RECALL_SYNC_EXIT_CODES;

export interface RecallSyncLimits {
  maxCards: number;
  maxImports: number;
  maxTotalChars: number;
  maxTotalChunks: number;
}

export interface RecallSyncTotals {
  cardsSeen: number;
  cardsPlannedForImport: number;
  totalCharsPlanned: number;
  totalChunksFetched: number;
}

export interface RecallSyncWindow {
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_RECALL_SYNC_LIMITS: RecallSyncLimits = {
  maxCards: 100,
  maxImports: 50,
  maxTotalChars: 500_000,
  maxTotalChunks: 2_500,
};

export function computeRecallSyncWindow(input: {
  now: number;
  checkpointIso: string | null;
  firstRunLookbackMs: number;
  overlapMs: number;
}): RecallSyncWindow {
  const now = assertValidMs(input.now, "now");
  const dateTo = new Date(now).toISOString();
  const baseFrom = input.checkpointIso
    ? Date.parse(input.checkpointIso)
    : now - input.firstRunLookbackMs;
  const safeBaseFrom = Number.isFinite(baseFrom) ? baseFrom : now - input.firstRunLookbackMs;
  const dateFromMs = Math.min(now, Math.max(0, safeBaseFrom - input.overlapMs));
  return {
    dateFrom: new Date(dateFromMs).toISOString(),
    dateTo,
  };
}

export function evaluateRecallSyncCaps(
  totals: RecallSyncTotals,
  limits: RecallSyncLimits = DEFAULT_RECALL_SYNC_LIMITS,
): { ok: true; violations: [] } | { ok: false; violations: string[]; exitCode: number } {
  const violations: string[] = [];
  if (totals.cardsSeen > limits.maxCards) {
    violations.push(`cards_seen ${totals.cardsSeen} exceeds max_cards ${limits.maxCards}`);
  }
  if (totals.cardsPlannedForImport > limits.maxImports) {
    violations.push(
      `cards_planned_for_import ${totals.cardsPlannedForImport} exceeds max_imports ${limits.maxImports}`,
    );
  }
  if (totals.totalCharsPlanned > limits.maxTotalChars) {
    violations.push(
      `total_chars_planned ${totals.totalCharsPlanned} exceeds max_total_chars ${limits.maxTotalChars}`,
    );
  }
  if (totals.totalChunksFetched > limits.maxTotalChunks) {
    violations.push(
      `total_chunks_fetched ${totals.totalChunksFetched} exceeds max_total_chunks ${limits.maxTotalChunks}`,
    );
  }
  return violations.length === 0
    ? { ok: true, violations: [] }
    : { ok: false, violations, exitCode: RECALL_SYNC_EXIT_CODES.cap_exceeded };
}

export function shouldAdvanceRecallCheckpoint(input: {
  mode: RecallSyncMode;
  completed: boolean;
  failures: number;
  capExceeded: boolean;
  suspiciousEnumeration: boolean;
}): boolean {
  return (
    input.mode === "apply" &&
    input.completed &&
    input.failures === 0 &&
    !input.capExceeded &&
    !input.suspiciousEnumeration
  );
}

export function classifyRecallSyncError(error: unknown): {
  name: RecallSyncExitCodeName;
  exitCode: number;
} {
  const message = error instanceof Error ? error.message : String(error);
  if (/\b401\b|\b403\b|auth|unauthori[sz]ed|forbidden/i.test(message)) {
    return { name: "auth_failure", exitCode: RECALL_SYNC_EXIT_CODES.auth_failure };
  }
  if (/\b429\b|rate.?limit/i.test(message)) {
    return { name: "rate_limited", exitCode: RECALL_SYNC_EXIT_CODES.rate_limited };
  }
  if (/cap|limit exceeded/i.test(message)) {
    return { name: "cap_exceeded", exitCode: RECALL_SYNC_EXIT_CODES.cap_exceeded };
  }
  return { name: "unexpected_error", exitCode: RECALL_SYNC_EXIT_CODES.unexpected_error };
}

export function sanitizeRecallSyncReport(value: unknown): unknown {
  return redactReportValue(value, {
    redactLongContent: true,
    redactTitles: true,
  });
}

function assertValidMs(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite timestamp`);
  return value;
}
