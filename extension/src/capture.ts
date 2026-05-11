/**
 * Shared capture helper — used by popup (T-CF-17) and service worker (T-CF-18).
 *
 * Reads the bearer token from chrome.storage.local, POSTs the page's URL +
 * title + optional note to https://brain.arunp.in/api/capture/url, and
 * returns a discriminated-union result so callers can render specific
 * messages for auth / rate-limit / network failures without string parsing.
 */

export const BRAIN_BASE_URL = "https://brain.arunp.in";
export const TOKEN_KEY = "brain_token";
export const INFLIGHT_KEY = "brain_inflight_until";
const INFLIGHT_WINDOW_MS = 2_000;

export type CaptureInput = {
  url: string;
  title?: string;
  note?: string;
};

export type CaptureResult =
  | { ok: true; itemId: string | null; duplicate: boolean }
  | { ok: false; reason: "no-token" }
  | { ok: false; reason: "unauthorized"; status: number }
  | { ok: false; reason: "rate-limited"; status: 429 }
  | { ok: false; reason: "server-error"; status: number; body: string }
  | { ok: false; reason: "network"; message: string }
  | { ok: false; reason: "inflight" };

/** Read the saved bearer token from chrome.storage.local. */
export async function getToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(TOKEN_KEY);
  const raw = stored[TOKEN_KEY];
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** Write the bearer token to chrome.storage.local. */
export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token });
}

/**
 * Double-submit guard — the popup save button and context-menu click can
 * both fire within ~200ms if the user is frantic. We stash a millisecond
 * timestamp in chrome.storage.session; any new capture within the window
 * short-circuits with `inflight`. session storage clears on browser close.
 */
async function claimInflightLock(): Promise<boolean> {
  const now = Date.now();
  const stored = await chrome.storage.session.get(INFLIGHT_KEY);
  const until = typeof stored[INFLIGHT_KEY] === "number" ? stored[INFLIGHT_KEY] : 0;
  if (now < until) return false;
  await chrome.storage.session.set({ [INFLIGHT_KEY]: now + INFLIGHT_WINDOW_MS });
  return true;
}

/**
 * POST the URL to /api/capture/url. Handles all the status codes the
 * server can return; callers render the CaptureResult verbatim.
 */
export async function captureUrl(input: CaptureInput): Promise<CaptureResult> {
  const token = await getToken();
  if (!token) return { ok: false, reason: "no-token" };

  if (!(await claimInflightLock())) return { ok: false, reason: "inflight" };

  let res: Response;
  try {
    res = await fetch(`${BRAIN_BASE_URL}/api/capture/url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        url: input.url,
        title: input.title,
        note: input.note,
      }),
    });
  } catch (err) {
    return { ok: false, reason: "network", message: (err as Error).message };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: "unauthorized", status: res.status };
  }
  if (res.status === 429) {
    return { ok: false, reason: "rate-limited", status: 429 };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const body = typeof parsed === "object" && parsed !== null ? JSON.stringify(parsed) : "";
    return { ok: false, reason: "server-error", status: res.status, body };
  }

  const payload = parsed as { id?: string; itemId?: string; duplicate?: boolean };
  return {
    ok: true,
    itemId: payload.id ?? payload.itemId ?? null,
    duplicate: payload.duplicate === true,
  };
}

/**
 * Ping /api/health with the supplied token. Used by the Options page
 * "Test connection" button. Returns a discriminated result the UI can
 * render without inspecting HTTP status.
 */
export type TestConnectionResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "network"; message: string }
  | { ok: false; reason: "server-error"; status: number };

export async function testConnection(token: string): Promise<TestConnectionResult> {
  let res: Response;
  try {
    res = await fetch(`${BRAIN_BASE_URL}/api/health`, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch (err) {
    return { ok: false, reason: "network", message: (err as Error).message };
  }
  if (res.status === 200) return { ok: true };
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized" };
  return { ok: false, reason: "server-error", status: res.status };
}
