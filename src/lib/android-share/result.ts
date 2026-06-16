import {
  isCaptureResultPayload,
  type CaptureResultPayload,
  type CaptureResultState,
} from "@/lib/capture/result";

export type AndroidShareResultState =
  | "saved_full"
  | "saved_limited"
  | "duplicate_existing"
  | "updated_existing"
  | "unsupported_share"
  | "missing_token"
  | "server_unreachable"
  | "url_capture_failed"
  | "note_capture_failed"
  | "pdf_missing_uri"
  | "pdf_read_failed"
  | "pdf_checksum_failed"
  | "pdf_upload_failed"
  | "multi_pdf_rejected"
  | "expired_result";

export type AndroidShareSourceKind = "url" | "note" | "pdf" | "unknown";

export interface AndroidShareResultPayload {
  state: AndroidShareResultState;
  sourceKind: AndroidShareSourceKind;
  quality?: string;
  itemId?: string;
  existingItemId?: string;
  retryable: boolean;
  createdAt: number;
  expiresAt: number;
  errorCode?: string;
}

export interface NativeSharePayload {
  title?: string;
  texts?: string[];
  files?: Array<{ uri?: string; mimeType?: string; name?: string }>;
}

export type SharePayloadClassification =
  | { kind: "multi_pdf"; sourceKind: "pdf"; pdfCount: number }
  | { kind: "pdf"; sourceKind: "pdf"; file: { uri?: string; mimeType?: string; name?: string } }
  | { kind: "url"; sourceKind: "url"; url: string; title?: string }
  | { kind: "note"; sourceKind: "note"; title: string; body: string }
  | { kind: "unsupported"; sourceKind: "unknown" };

export type ShareResultAction =
  | "open_item"
  | "ask"
  | "add_text"
  | "pair_device"
  | "capture"
  | "library"
  | "done";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_PREFIX = "android-share-result:";
const RESULT_TTL_MS = 30 * 60 * 1000;
const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const STATES: readonly AndroidShareResultState[] = [
  "saved_full",
  "saved_limited",
  "duplicate_existing",
  "updated_existing",
  "unsupported_share",
  "missing_token",
  "server_unreachable",
  "url_capture_failed",
  "note_capture_failed",
  "pdf_missing_uri",
  "pdf_read_failed",
  "pdf_checksum_failed",
  "pdf_upload_failed",
  "multi_pdf_rejected",
  "expired_result",
];

export function classifyNativeSharePayload(
  payload: NativeSharePayload,
): SharePayloadClassification {
  const files = payload.files ?? [];
  const pdfs = files.filter((file) => file.mimeType === "application/pdf");
  if (pdfs.length > 1) {
    return { kind: "multi_pdf", sourceKind: "pdf", pdfCount: pdfs.length };
  }
  if (pdfs.length === 1) {
    return { kind: "pdf", sourceKind: "pdf", file: pdfs[0]! };
  }

  const firstText = payload.texts?.[0]?.trim() ?? "";
  if (firstText && looksLikeHttpUrl(firstText)) {
    return {
      kind: "url",
      sourceKind: "url",
      url: firstText,
      title: payload.title,
    };
  }

  const body = (payload.texts ?? []).join("\n").trim();
  if (body) {
    return {
      kind: "note",
      sourceKind: "note",
      title: payload.title ?? "Shared note",
      body,
    };
  }

  return { kind: "unsupported", sourceKind: "unknown" };
}

export function resultForPreflight(
  classification: SharePayloadClassification,
  hasToken: boolean,
  now = Date.now(),
): AndroidShareResultPayload | null {
  if (classification.kind === "multi_pdf") {
    return createShareResultPayload({
      state: "multi_pdf_rejected",
      sourceKind: "pdf",
      errorCode: "multi_pdf_rejected",
      now,
    });
  }
  if (!hasToken) {
    return createShareResultPayload({
      state: "missing_token",
      sourceKind: classification.sourceKind,
      errorCode: "missing_token",
      now,
    });
  }
  if (classification.kind === "unsupported") {
    return createShareResultPayload({
      state: "unsupported_share",
      sourceKind: "unknown",
      errorCode: "unsupported_share",
      now,
    });
  }
  if (classification.kind === "pdf" && !classification.file.uri) {
    return createShareResultPayload({
      state: "pdf_missing_uri",
      sourceKind: "pdf",
      errorCode: "pdf_missing_uri",
      now,
    });
  }
  return null;
}

export function mapCaptureResponseToShareResult(
  data: unknown,
  sourceKind: Exclude<AndroidShareSourceKind, "unknown">,
  now = Date.now(),
): AndroidShareResultPayload {
  const parsed = parseCaptureResponse(data);
  if (parsed.result) {
    return mapCaptureResultPayload(parsed.result, sourceKind, now);
  }

  if (parsed.legacyDuplicate) {
    return createShareResultPayload({
      state: "duplicate_existing",
      sourceKind,
      itemId: parsed.itemId ?? undefined,
      existingItemId: parsed.itemId ?? undefined,
      errorCode: "legacy_duplicate",
      now,
    });
  }

  if (parsed.itemId) {
    return createShareResultPayload({
      state: "saved_limited",
      sourceKind,
      itemId: parsed.itemId,
      errorCode: "legacy_success_no_capture_result",
      now,
    });
  }

  return createShareResultPayload({
    state: sourceKind === "pdf" ? "pdf_upload_failed" : "server_unreachable",
    sourceKind,
    errorCode: "malformed_capture_response",
    now,
  });
}

export function mapNonOkCaptureResponseToShareResult(
  data: unknown,
  sourceKind: Extract<AndroidShareSourceKind, "url" | "note">,
  now = Date.now(),
): AndroidShareResultPayload | null {
  const parsed = parseCaptureResponse(data);
  if (!parsed.result || parsed.result.state !== "failed_without_saved_item") return null;
  return mapCaptureResultPayload(parsed.result, sourceKind, now);
}

export function mapCaptureFailureToShareResult(
  kind:
    | "url"
    | "note"
    | "pdf_missing_uri"
    | "pdf_read"
    | "pdf_upload"
    | "pdf_checksum",
  now = Date.now(),
): AndroidShareResultPayload {
  switch (kind) {
    case "url":
      return createShareResultPayload({
        state: "server_unreachable",
        sourceKind: "url",
        errorCode: "url_capture_failed",
        now,
      });
    case "note":
      return createShareResultPayload({
        state: "server_unreachable",
        sourceKind: "note",
        errorCode: "note_capture_failed",
        now,
      });
    case "pdf_missing_uri":
      return createShareResultPayload({
        state: "pdf_missing_uri",
        sourceKind: "pdf",
        errorCode: "pdf_missing_uri",
        now,
      });
    case "pdf_read":
      return createShareResultPayload({
        state: "pdf_read_failed",
        sourceKind: "pdf",
        errorCode: "pdf_read_failed",
        now,
      });
    case "pdf_upload":
      return createShareResultPayload({
        state: "pdf_upload_failed",
        sourceKind: "pdf",
        errorCode: "pdf_upload_failed",
        now,
      });
    case "pdf_checksum":
      return createShareResultPayload({
        state: "pdf_checksum_failed",
        sourceKind: "pdf",
        errorCode: "pdf_checksum_failed",
        now,
      });
  }
}

export function createShareResultPayload(input: {
  state: AndroidShareResultState;
  sourceKind: AndroidShareSourceKind;
  itemId?: string | null;
  existingItemId?: string | null;
  quality?: string | null;
  errorCode?: string | null;
  now?: number;
  retryable?: boolean;
}): AndroidShareResultPayload {
  const createdAt = input.now ?? Date.now();
  return {
    state: input.state,
    sourceKind: input.sourceKind,
    ...(input.quality ? { quality: input.quality } : {}),
    ...(input.itemId ? { itemId: input.itemId } : {}),
    ...(input.existingItemId ? { existingItemId: input.existingItemId } : {}),
    retryable: input.retryable ?? isRetryGuidanceState(input.state),
    createdAt,
    expiresAt: createdAt + RESULT_TTL_MS,
    ...(input.errorCode ? { errorCode: stableCode(input.errorCode) } : {}),
  };
}

export function storeShareResult(
  storage: StorageLike,
  payload: AndroidShareResultPayload,
  key = createOpaqueResultKey(),
): string {
  storage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(sanitizePayload(payload)));
  return key;
}

export function loadShareResult(
  storage: StorageLike,
  key: string | null | undefined,
  now = Date.now(),
): AndroidShareResultPayload | null {
  if (!key || !SAFE_ID.test(key)) return null;
  const raw = storage.getItem(`${STORAGE_PREFIX}${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const payload = coercePayload(parsed);
    if (!payload || payload.expiresAt <= now) {
      storage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }
    return payload;
  } catch {
    storage.removeItem(`${STORAGE_PREFIX}${key}`);
    return null;
  }
}

export function shareResultActions(payload: AndroidShareResultPayload): ShareResultAction[] {
  const itemId = payload.itemId ?? payload.existingItemId;
  switch (payload.state) {
    case "saved_full":
      return itemId ? ["open_item", "ask", "done"] : ["done"];
    case "saved_limited":
      return itemId ? ["add_text", "open_item", "done"] : ["done"];
    case "duplicate_existing":
      return itemId ? ["open_item", "ask", "done"] : ["done"];
    case "updated_existing":
      return itemId ? ["open_item", "add_text", "done"] : ["done"];
    case "missing_token":
      return ["pair_device", "done"];
    case "unsupported_share":
      return ["capture", "done"];
    case "server_unreachable":
    case "url_capture_failed":
    case "note_capture_failed":
    case "pdf_missing_uri":
    case "pdf_read_failed":
    case "pdf_checksum_failed":
    case "pdf_upload_failed":
    case "multi_pdf_rejected":
      return ["capture", "done"];
    case "expired_result":
      return ["library", "capture"];
  }
}

export function sanitizeShareLogMessage(code: string, details?: unknown): string {
  const stable = stableCode(code);
  if (typeof details === "number") return `${stable}:status_${details}`;
  return stable;
}

function mapCaptureResultPayload(
  result: CaptureResultPayload,
  sourceKind: Exclude<AndroidShareSourceKind, "unknown">,
  now: number,
): AndroidShareResultPayload {
  const ids = {
    itemId: result.itemId ?? undefined,
    existingItemId: result.existingItemId ?? undefined,
  };
  const base = {
    sourceKind,
    quality: result.quality,
    now,
  };
  switch (result.state) {
    case "created_full_text":
    case "created_transcript":
      return createShareResultPayload({ ...base, ...ids, state: "saved_full" });
    case "created_preview_only":
    case "created_metadata_only":
    case "created_needs_upgrade":
      return createShareResultPayload({ ...base, ...ids, state: "saved_limited" });
    case "duplicate_existing":
      return createShareResultPayload({
        ...base,
        itemId: result.itemId ?? result.existingItemId ?? undefined,
        existingItemId: result.existingItemId ?? result.itemId ?? undefined,
        state: "duplicate_existing",
      });
    case "updated_existing":
      return createShareResultPayload({ ...base, ...ids, state: "updated_existing" });
    case "error_with_saved_item":
      return createShareResultPayload({
        ...base,
        ...ids,
        state: "saved_limited",
        errorCode: "error_with_saved_item",
      });
    case "failed_without_saved_item":
      return createShareResultPayload({
        ...base,
        state: failureStateForSource(sourceKind),
        errorCode: failureStateForSource(sourceKind),
      });
  }
}

function parseCaptureResponse(data: unknown): {
  itemId: string | null;
  result: CaptureResultPayload | null;
  legacyDuplicate: boolean;
} {
  if (!data || typeof data !== "object") {
    return { itemId: null, result: null, legacyDuplicate: false };
  }
  const record = data as {
    id?: unknown;
    itemId?: unknown;
    duplicate?: unknown;
    capture_result?: unknown;
  };
  const result = isCaptureResultPayload(record.capture_result) ? record.capture_result : null;
  const itemId =
    result?.itemId ??
    result?.existingItemId ??
    safeString(record.itemId) ??
    safeString(record.id) ??
    null;
  return {
    itemId,
    result,
    legacyDuplicate: record.duplicate === true,
  };
}

function coercePayload(value: unknown): AndroidShareResultPayload | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isState(record.state) || !isSourceKind(record.sourceKind)) return null;
  if (typeof record.createdAt !== "number" || typeof record.expiresAt !== "number") return null;
  return sanitizePayload({
    state: record.state,
    sourceKind: record.sourceKind,
    ...(safeString(record.quality) ? { quality: safeString(record.quality)! } : {}),
    ...(safeString(record.itemId) ? { itemId: safeString(record.itemId)! } : {}),
    ...(safeString(record.existingItemId)
      ? { existingItemId: safeString(record.existingItemId)! }
      : {}),
    retryable: typeof record.retryable === "boolean" ? record.retryable : false,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    ...(safeString(record.errorCode) ? { errorCode: stableCode(safeString(record.errorCode)!) } : {}),
  });
}

function sanitizePayload(payload: AndroidShareResultPayload): AndroidShareResultPayload {
  return {
    state: payload.state,
    sourceKind: payload.sourceKind,
    ...(safeString(payload.quality) ? { quality: safeString(payload.quality)! } : {}),
    ...(safeString(payload.itemId) ? { itemId: safeString(payload.itemId)! } : {}),
    ...(safeString(payload.existingItemId)
      ? { existingItemId: safeString(payload.existingItemId)! }
      : {}),
    retryable: payload.retryable,
    createdAt: payload.createdAt,
    expiresAt: payload.expiresAt,
    ...(payload.errorCode ? { errorCode: stableCode(payload.errorCode) } : {}),
  };
}

function failureStateForSource(
  sourceKind: Exclude<AndroidShareSourceKind, "unknown">,
): AndroidShareResultState {
  if (sourceKind === "pdf") return "pdf_upload_failed";
  return sourceKind === "note" ? "note_capture_failed" : "url_capture_failed";
}

function isRetryGuidanceState(state: AndroidShareResultState): boolean {
  return [
    "server_unreachable",
    "url_capture_failed",
    "note_capture_failed",
    "pdf_missing_uri",
    "pdf_read_failed",
    "pdf_checksum_failed",
    "pdf_upload_failed",
  ].includes(state);
}

function looksLikeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function createOpaqueResultKey(): string {
  const time = Date.now().toString(36);
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `asr_${time}_${random}`;
}

function stableCode(value: string): string {
  if (/(:\/\/|[/\\]|[a-f0-9]{32,})/i.test(value)) {
    return "android_share_error";
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 128) return trimmed.slice(0, 128);
  return trimmed;
}

function isState(value: unknown): value is AndroidShareResultState {
  return typeof value === "string" && STATES.includes(value as AndroidShareResultState);
}

function isSourceKind(value: unknown): value is AndroidShareSourceKind {
  return value === "url" || value === "note" || value === "pdf" || value === "unknown";
}

export function isCaptureStateMapped(state: CaptureResultState): boolean {
  return [
    "created_full_text",
    "created_transcript",
    "created_preview_only",
    "created_metadata_only",
    "created_needs_upgrade",
    "duplicate_existing",
    "updated_existing",
    "error_with_saved_item",
    "failed_without_saved_item",
  ].includes(state);
}
