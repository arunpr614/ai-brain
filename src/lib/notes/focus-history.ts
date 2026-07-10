export const NOTE_FOCUS_STATE_KEY = "__brainNoteFocus";

export interface NoteFocusHistoryState {
  v: 1;
  token: string;
}

function cloneUrl(url: URL): URL {
  return new URL(url.href);
}

function isItemPath(pathname: string): boolean {
  return /^\/items\/[^/]+$/.test(pathname);
}

function recordState(state: unknown): Record<string, unknown> {
  if (!state || typeof state !== "object" || Array.isArray(state)) return {};
  return { ...(state as Record<string, unknown>) };
}

export function isNoteFocusRequested(url: URL): boolean {
  return (
    isItemPath(url.pathname) &&
    url.searchParams.get("mode") !== "focus" &&
    url.searchParams.get("note_mode") === "focus"
  );
}

export function addNoteFocusToUrl(url: URL): URL {
  const next = cloneUrl(url);
  if (!isItemPath(next.pathname) || next.searchParams.get("mode") === "focus") {
    next.searchParams.delete("note_mode");
    return next;
  }
  next.searchParams.set("tab", "notes");
  next.searchParams.set("note_mode", "focus");
  return next;
}

export function removeNoteFocusFromUrl(url: URL): URL {
  const next = cloneUrl(url);
  next.searchParams.delete("note_mode");
  return next;
}

export function normalizeNoteFocusUrl(url: URL): URL {
  return isNoteFocusRequested(url) ? cloneUrl(url) : removeNoteFocusFromUrl(url);
}

export function mergeNoteFocusState(state: unknown, token: string): Record<string, unknown> {
  return {
    ...recordState(state),
    [NOTE_FOCUS_STATE_KEY]: { v: 1, token } satisfies NoteFocusHistoryState,
  };
}

export function removeNoteFocusFromState(state: unknown): Record<string, unknown> {
  const next = recordState(state);
  delete next[NOTE_FOCUS_STATE_KEY];
  return next;
}

export function hasOwnedNoteFocusState(state: unknown, token?: string): boolean {
  if (!state || typeof state !== "object" || Array.isArray(state)) return false;
  const marker = (state as Record<string, unknown>)[NOTE_FOCUS_STATE_KEY];
  if (!marker || typeof marker !== "object" || Array.isArray(marker)) return false;
  const candidate = marker as Record<string, unknown>;
  if (candidate.v !== 1 || typeof candidate.token !== "string" || !candidate.token) return false;
  return token === undefined || candidate.token === token;
}
