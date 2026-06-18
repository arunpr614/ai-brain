import type { ItemRow } from "@/db/client";

export type CaptureResultState =
  | "created_full_text"
  | "created_transcript"
  | "created_preview_only"
  | "created_metadata_only"
  | "created_needs_upgrade"
  | "duplicate_existing"
  | "updated_existing"
  | "error_with_saved_item"
  | "failed_without_saved_item";

export type CaptureResultRecommendedAction =
  | "open_item"
  | "open_existing"
  | "upgrade"
  | "retry"
  | "none";

export interface CaptureResultPayload {
  state: CaptureResultState;
  itemId: string | null;
  existingItemId: string | null;
  sourcePlatform: string | null;
  capturedVia: string | null;
  quality: string | null;
  warningCode: string | null;
  recommendedAction: CaptureResultRecommendedAction;
  message: string;
}

interface CaptureResultContext {
  state?: CaptureResultState;
  itemId?: string | null;
  existingItemId?: string | null;
  sourcePlatform?: string | null;
  capturedVia?: string | null;
  quality?: string | null;
  warningCode?: string | null;
  errorMessage?: string | null;
}

const CAPTURE_RESULT_STATES: readonly CaptureResultState[] = [
  "created_full_text",
  "created_transcript",
  "created_preview_only",
  "created_metadata_only",
  "created_needs_upgrade",
  "duplicate_existing",
  "updated_existing",
  "error_with_saved_item",
  "failed_without_saved_item",
];

export function parseCaptureResultState(
  value: string | null | undefined,
): CaptureResultState | null {
  return CAPTURE_RESULT_STATES.includes(value as CaptureResultState)
    ? (value as CaptureResultState)
    : null;
}

export function inferCaptureResultState(item: ItemRow): CaptureResultState {
  if (item.capture_quality === "transcript" || item.capture_quality === "metadata_plus_transcript") {
    return "created_transcript";
  }
  if (item.capture_quality === "paywall_preview") return "created_preview_only";
  if (item.capture_quality === "metadata_only") return "created_metadata_only";
  if (item.capture_quality === "failed") return "created_needs_upgrade";
  if (item.extraction_warning) return "created_needs_upgrade";
  return "created_full_text";
}

export function toCaptureResultPayload(
  item: ItemRow,
  context: CaptureResultContext = {},
): CaptureResultPayload {
  const state = context.state ?? inferCaptureResultState(item);
  const payload: CaptureResultPayload = {
    state,
    itemId: context.itemId ?? item.id,
    existingItemId: context.existingItemId ?? (state === "duplicate_existing" ? item.id : null),
    sourcePlatform: context.sourcePlatform ?? item.source_platform ?? item.source_type,
    capturedVia: context.capturedVia ?? item.capture_source ?? null,
    quality: context.quality ?? item.capture_quality ?? null,
    warningCode: context.warningCode ?? item.extraction_warning ?? null,
    recommendedAction: recommendedActionForState(state),
    message: "",
  };
  payload.message = messageForPayload(payload, context.errorMessage ?? null);
  return payload;
}

export function toDuplicateCaptureResultPayload(
  existing: ItemRow | null,
  context: CaptureResultContext = {},
): CaptureResultPayload {
  if (existing) {
    return toCaptureResultPayload(existing, {
      ...context,
      state: "duplicate_existing",
      itemId: existing.id,
      existingItemId: existing.id,
    });
  }
  const payload: CaptureResultPayload = {
    state: "duplicate_existing",
    itemId: null,
    existingItemId: context.existingItemId ?? null,
    sourcePlatform: context.sourcePlatform ?? null,
    capturedVia: context.capturedVia ?? null,
    quality: context.quality ?? null,
    warningCode: context.warningCode ?? null,
    recommendedAction: "open_existing",
    message: "This share was already received. No duplicate item was created.",
  };
  return payload;
}

export function toFailedCaptureResultPayload(
  message: string,
  context: CaptureResultContext = {},
): CaptureResultPayload {
  const payload: CaptureResultPayload = {
    state: "failed_without_saved_item",
    itemId: context.itemId ?? null,
    existingItemId: context.existingItemId ?? null,
    sourcePlatform: context.sourcePlatform ?? null,
    capturedVia: context.capturedVia ?? null,
    quality: context.quality ?? null,
    warningCode: context.warningCode ?? null,
    recommendedAction: "retry",
    message,
  };
  return payload;
}

export function isCaptureResultPayload(value: unknown): value is CaptureResultPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    parseCaptureResultState(typeof candidate.state === "string" ? candidate.state : null) !== null &&
    ("itemId" in candidate || "existingItemId" in candidate) &&
    typeof candidate.message === "string"
  );
}

function recommendedActionForState(
  state: CaptureResultState,
): CaptureResultRecommendedAction {
  switch (state) {
    case "duplicate_existing":
      return "open_existing";
    case "created_metadata_only":
    case "created_preview_only":
    case "created_needs_upgrade":
    case "error_with_saved_item":
      return "upgrade";
    case "failed_without_saved_item":
      return "retry";
    case "updated_existing":
    case "created_full_text":
    case "created_transcript":
      return "open_item";
  }
}

function messageForPayload(
  payload: CaptureResultPayload,
  errorMessage: string | null,
): string {
  switch (payload.state) {
    case "created_full_text":
      return "Saved with readable text. This source is ready for search and Ask.";
    case "created_transcript":
      return "Saved with transcript text. This source is ready for search and Ask.";
    case "created_preview_only":
      return "Saved a preview, but the full source text is still missing.";
    case "created_metadata_only":
      return "Saved metadata only. Add readable text or a transcript before relying on Ask.";
    case "created_needs_upgrade":
      return "Saved, but this source needs better text before it will answer well.";
    case "duplicate_existing":
      return "Already saved. No duplicate item was created.";
    case "updated_existing":
      return "Updated the existing source with better captured text. No duplicate was created.";
    case "error_with_saved_item":
      return "Saved the item, but a post-save capture step failed. The item is available, but some supporting capture details may be missing.";
    case "failed_without_saved_item":
      return errorMessage ?? "Capture failed before anything was saved.";
  }
}
