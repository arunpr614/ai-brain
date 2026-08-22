/**
 * View Mode helpers shared between server first paint and client controls.
 * Supports:
 *   - 'auto': Responsive CSS media queries & standalone PWA detection
 *   - 'mobile': Enforces Mobile PWA Companion interface (bottom nav, mobile header, Reading Studio routing)
 *   - 'desktop': Enforces Desktop Workbench interface (sidebar rail, metadata panels, keyboard shortcuts)
 */
export type ViewMode = "auto" | "mobile" | "desktop";

export const VIEW_MODE_COOKIE = "brain_view_mode";
export const VIEW_MODE_STORAGE_KEY = "ai-memory-view-mode";
export const VIEW_MODE_EVENT = "ai-memory-view-mode-change";
export const VIEW_MODE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isViewMode(v: unknown): v is ViewMode {
  return v === "auto" || v === "mobile" || v === "desktop";
}

export function resolveViewModePreference(value: unknown): ViewMode {
  if (value === "mobile" || value === "pwa") return "mobile";
  if (value === "desktop") return "desktop";
  return "auto";
}

export function serializeViewModeCookie(mode: ViewMode): string {
  return `${VIEW_MODE_COOKIE}=${mode}; path=/; max-age=${VIEW_MODE_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function parseViewModeFromUrl(urlOrSearch: string | URLSearchParams): ViewMode | null {
  if (typeof urlOrSearch === "string") {
    try {
      const parsedUrl = new URL(urlOrSearch, "https://brain.local");
      const param = parsedUrl.searchParams.get("mode") || parsedUrl.searchParams.get("view");
      if (param) return resolveViewModePreference(param);
    } catch {
      const match = urlOrSearch.match(/[?&](?:mode|view)=(auto|mobile|pwa|desktop)(?:&|$)/);
      if (match) return resolveViewModePreference(match[1]);
    }
    return null;
  }
  const param = urlOrSearch.get("mode") || urlOrSearch.get("view");
  if (param) return resolveViewModePreference(param);
  return null;
}
