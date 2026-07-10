import { isLimitedCaptureQuality } from "@/lib/capture/quality";

export interface ScopeHealthItem {
  body?: string | null;
  capture_quality?: string | null;
  extraction_warning?: string | null;
}

const WEAK_WARNING_CODES = new Set([
  "no_transcript",
  "youtube_antibot_metadata_only",
  "youtube_transcript_fetch_metadata_only",
]);

export interface ScopeHealth {
  total: number;
  readable: number;
  weak: number;
}

function hasReadableBody(item: ScopeHealthItem): boolean {
  return Boolean(item.body?.trim());
}

function hasWeakWarning(item: ScopeHealthItem): boolean {
  return item.extraction_warning
    ? WEAK_WARNING_CODES.has(item.extraction_warning)
    : false;
}

export function isWeakScopeItem(item: ScopeHealthItem): boolean {
  return isLimitedCaptureQuality(item.capture_quality) || hasWeakWarning(item);
}

export function getScopeHealth(items: ScopeHealthItem[]): ScopeHealth {
  return items.reduce<ScopeHealth>(
    (health, item) => {
      const weak = isWeakScopeItem(item);
      return {
        total: health.total + 1,
        readable:
          health.readable + (hasReadableBody(item) && !weak ? 1 : 0),
        weak: health.weak + (weak ? 1 : 0),
      };
    },
    { total: 0, readable: 0, weak: 0 },
  );
}
