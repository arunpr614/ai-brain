/**
 * Shared content-free operational event sink.
 *
 * `logError` deliberately accepts only a closed event-code union. It owns the
 * timestamp and never serializes caller-provided records, errors, identifiers,
 * paths, URLs, hashes, sizes, or messages.
 *
 * Two-file rotation: at 5 MB, rename errors.jsonl → errors.jsonl.1,
 * dropping whatever was previously at .1.
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
} from "node:fs";
import { dirname } from "node:path";
import { brainDataPath } from "@/lib/data-root";
import {
  createContainmentDiagnostic,
  type ContainmentDiagnostic,
} from "@/lib/runtime/containment-diagnostics";

export const ERRORS_LOG_PATH = brainDataPath("errors.jsonl");
export const ERRORS_LOG_MAX_BYTES = 5 * 1024 * 1024;

export const ERROR_EVENT_CODES = [
  "capture.artifact-save-failed",
  "capture.created",
  "capture.duplicate",
  "capture.selected_text.rejected",
  "capture.transcript.multipart-unexpected-failure",
  "capture.transcript.owned_media.invalid_request",
  "capture.transcript.owned_media.provider_disabled",
  "capture.transcript.owned_media.provider_failed",
  "capture.transcript.owned_media.saved",
  "capture.transcript.owned_media.sha256_mismatch",
  "capture.transcript.owned_media.unexpected_failure",
  "capture.transcript.unexpected-failure",
  "capture.transcript_recovery.queued",
  "capture.upgrade.completed",
  "capture.upgrade.rejected",
  "capture.upgrade.started",
  "client.error.received",
  "lan.bearer.reject-length-mismatch",
  "lan.bearer.reject-malformed-header",
  "lan.bearer.reject-missing-header",
  "lan.bearer.reject-origin",
  "lan.bearer.reject-server-token-too-short",
  "lan.bearer.reject-server-token-unconfigured",
  "lan.bearer.reject-token-mismatch",
  "lan.bearer.token-generated",
  "lan.bearer.token-rotated",
  "lan.ratelimit.triggered",
  "orphan_citation",
  "repair.item.unexpected-failure",
  "share.http.capture-failed",
  "share.intent.duplicate",
  "share.pdf.sha256-mismatch",
  "share.pdf.upload-failed",
  "telegram.ack.failed",
  "telegram.capture.pdf-failed",
  "telegram.capture.unhandled",
  "telegram.capture.url-failed",
  "telegram.webhook.bad-secret",
  "telegram.webhook.duplicate-update",
  "telegram.webhook.invalid-payload",
  "telegram.webhook.misconfigured",
  "telegram.webhook.non-owner",
  "telegram.webhook.non-private-chat",
] as const;

export type ErrorEventCode = (typeof ERROR_EVENT_CODES)[number];

const ERROR_EVENT_CODE_SET = new Set<string>(ERROR_EVENT_CODES);

export function isErrorEventCode(value: unknown): value is ErrorEventCode {
  return typeof value === "string" && ERROR_EVENT_CODE_SET.has(value);
}

/**
 * Persist one allowlisted event code. Invalid runtime input is ignored without
 * inspecting object properties, so an untyped or accessor-bearing value cannot
 * widen the persisted shape.
 */
export function logError(code: ErrorEventCode): void {
  if (!isErrorEventCode(code)) return;
  appendEntry({
    event_code: code,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Revalidate and normalize a containment diagnostic at the persistence
 * boundary. TypeScript types are not an authority here: JavaScript callers,
 * casts, and accessor-bearing objects must still pass the runtime contract.
 * Invalid input is ignored and never reaches serialization.
 */
export function logContainmentDiagnostic(entry: ContainmentDiagnostic): void {
  let normalized: ContainmentDiagnostic;
  try {
    normalized = createContainmentDiagnostic(entry);
  } catch {
    return;
  }
  appendEntry(normalized);
}

function appendEntry(entry: object): void {
  try {
    mkdirSync(dirname(ERRORS_LOG_PATH), { recursive: true });
    if (existsSync(ERRORS_LOG_PATH)) {
      const { size } = statSync(ERRORS_LOG_PATH);
      if (size >= ERRORS_LOG_MAX_BYTES) {
        renameSync(ERRORS_LOG_PATH, `${ERRORS_LOG_PATH}.1`);
      }
    }
    appendFileSync(ERRORS_LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch {
    console.warn("[errors-sink] write_failed");
  }
}
