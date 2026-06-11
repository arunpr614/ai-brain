import type { ItemRow } from "@/db/client";
import type { CapturePlatform, CaptureQuality } from "./types";

export type CaptureUpgradeAction =
  | "create"
  | "upgrade"
  | "duplicate"
  | "rejected_too_short"
  | "unsupported";

export interface IncomingCaptureUpgrade {
  platform?: CapturePlatform | string | null;
  quality?: CaptureQuality | string | null;
  hasMeaningfulText?: boolean;
  hasUserText?: boolean;
}

export interface CaptureUpgradeDecision {
  action: CaptureUpgradeAction;
  reason: string;
}

const FULL_TEXT_QUALITIES = new Set<string>([
  "full_text",
  "metadata_plus_transcript",
  "transcript",
  "user_provided_full_text",
  "email_body",
  "client_dom",
]);

const USER_TEXT_UPGRADE_PLATFORMS = new Set<string>([
  "youtube",
  "youtube_short",
  "linkedin",
]);

const SELECTED_TEXT_UPGRADE_PLATFORMS = new Set<string>([
  "youtube",
  "youtube_short",
  "linkedin",
  "substack",
  "generic_article",
]);

export function classifyCaptureUpgrade(
  existing: Pick<ItemRow, "source_platform" | "source_type" | "capture_quality"> | null,
  incoming: IncomingCaptureUpgrade,
): CaptureUpgradeDecision {
  if (!existing) return { action: "create", reason: "no_existing_item" };

  const hasUserText = incoming.hasUserText === true;
  const hasMeaningfulText = incoming.hasMeaningfulText === true;
  if (hasUserText && !hasMeaningfulText) {
    return { action: "rejected_too_short", reason: "user_text_too_short" };
  }
  if (!hasMeaningfulText) {
    return { action: "duplicate", reason: "existing_item" };
  }

  const platform = normalizedPlatform(existing, incoming.platform);
  const existingQuality = existing.capture_quality ?? null;
  const incomingQuality = incoming.quality ?? null;

  if (
    existingQuality === "metadata_only" &&
    incomingQuality === "user_provided_full_text" &&
    USER_TEXT_UPGRADE_PLATFORMS.has(platform)
  ) {
    return { action: "upgrade", reason: "weak_capture_user_text" };
  }

  if (
    (existingQuality === "metadata_only" || existingQuality === "paywall_preview") &&
    incomingQuality === "client_dom" &&
    SELECTED_TEXT_UPGRADE_PLATFORMS.has(platform)
  ) {
    return { action: "upgrade", reason: "weak_capture_selected_text" };
  }

  if (FULL_TEXT_QUALITIES.has(String(existingQuality))) {
    return { action: "duplicate", reason: "existing_capture_is_strong" };
  }

  if (existingQuality === "paywall_preview") {
    return { action: "unsupported", reason: "paywall_preview_upgrade_not_supported" };
  }

  if (existingQuality === "failed") {
    return { action: "unsupported", reason: "failed_capture_upgrade_not_supported" };
  }

  return { action: "duplicate", reason: "existing_item" };
}

export function isWeakCapture(
  item: Pick<ItemRow, "capture_quality">,
): boolean {
  return item.capture_quality === "metadata_only" || item.capture_quality === "paywall_preview";
}

export function isNeedsUpgrade(
  item: Pick<ItemRow, "source_platform" | "source_type" | "capture_quality">,
): boolean {
  const platform = normalizedPlatform(item, null);
  if (
    item.capture_quality === "metadata_only" &&
    USER_TEXT_UPGRADE_PLATFORMS.has(platform)
  ) {
    return true;
  }
  return item.capture_quality === "paywall_preview" && platform === "substack";
}

export function canUpgradeWithPastedText(
  item: Pick<ItemRow, "source_platform" | "source_type" | "capture_quality">,
): boolean {
  const platform = normalizedPlatform(item, null);
  return item.capture_quality === "metadata_only" && USER_TEXT_UPGRADE_PLATFORMS.has(platform);
}

export function isFullTextCapture(
  item: Pick<ItemRow, "capture_quality">,
): boolean {
  return FULL_TEXT_QUALITIES.has(String(item.capture_quality));
}

function normalizedPlatform(
  item: Pick<ItemRow, "source_platform" | "source_type">,
  incomingPlatform: string | null | undefined,
): string {
  if (item.source_platform) return item.source_platform;
  if (incomingPlatform) return incomingPlatform;
  if (item.source_type === "youtube") return "youtube";
  if (item.source_type === "url") return "generic_article";
  return item.source_type;
}
