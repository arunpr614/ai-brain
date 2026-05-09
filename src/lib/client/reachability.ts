/**
 * Reachability probe — v0.5.0 T-14 / F-020 / REVIEW P1-3.
 *
 * Pure module: no DOM, no React, no Capacitor imports. Importable from:
 *   - `share-handler.tsx` (native share path — pre-capture check)
 *   - `public/offline.html` (retry button inline script)
 *   - Any future client/extension code that needs a liveness check
 *
 * The share-handler CALLS this module; this module does NOT import
 * share-handler — enforces the dependency direction per REVIEW P1-3 so
 * the offline screen continues to work even if share-handler is broken.
 *
 * Shape: async function returning a tagged-union Verdict. No exceptions
 * thrown — all failure modes (timeout, network, HTTP non-200, unpaired)
 * resolve with a `.ok=false` case. Callers switch on `.reason`.
 *
 * Timeout: 2s default, matches the decision-tree step in plan §3.2.
 * AbortController drives both the fetch and the timeout race; the signal
 * fires via `setTimeout` so the fetch is actually aborted rather than
 * just the promise going un-awaited.
 */

export interface ReachabilityOk {
  ok: true;
  status: 200;
  latencyMs: number;
}

export interface ReachabilityFail {
  ok: false;
  reason:
    | "timeout"
    | "network"
    | "unauthorized" // 401 — token rotated or not paired
    | "forbidden" // 403 — origin rejected by server
    | "server-error" // 5xx
    | "unexpected-status"; // any other non-200
  status?: number;
  message?: string;
  latencyMs: number;
}

export type ReachabilityVerdict = ReachabilityOk | ReachabilityFail;

export interface ProbeOptions {
  /** Absolute URL of the Brain server, no trailing slash. */
  baseUrl: string;
  /** Bearer token for the APK/extension paths. Optional — cookie paths work without it. */
  bearerToken?: string | null;
  /** Total timeout in ms, default 2000. */
  timeoutMs?: number;
  /** Injectable fetch for testing; defaults to global fetch. */
  fetchFn?: typeof fetch;
  /** Injectable clock for latency testing; defaults to `performance.now` when available, else `Date.now`. */
  now?: () => number;
}

const DEFAULT_TIMEOUT_MS = 2000;

function defaultNow(): () => number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return () => performance.now();
  }
  return () => Date.now();
}

export async function probeReachability(
  opts: ProbeOptions,
): Promise<ReachabilityVerdict> {
  const {
    baseUrl,
    bearerToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchFn = fetch,
    now = defaultNow(),
  } = opts;

  const url = `${baseUrl.replace(/\/+$/, "")}/api/health`;
  const headers: Record<string, string> = {};
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = now();

  try {
    const res = await fetchFn(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      cache: "no-store",
    });
    const latencyMs = now() - started;

    if (res.status === 200) {
      return { ok: true, status: 200, latencyMs };
    }
    if (res.status === 401) {
      return { ok: false, reason: "unauthorized", status: 401, latencyMs };
    }
    if (res.status === 403) {
      return { ok: false, reason: "forbidden", status: 403, latencyMs };
    }
    if (res.status >= 500) {
      return { ok: false, reason: "server-error", status: res.status, latencyMs };
    }
    return { ok: false, reason: "unexpected-status", status: res.status, latencyMs };
  } catch (err) {
    const latencyMs = now() - started;
    const message = err instanceof Error ? err.message : String(err);
    // AbortError from AbortController.abort() surfaces as DOMException with name "AbortError".
    const isAbort =
      (err instanceof Error && err.name === "AbortError") ||
      message.toLowerCase().includes("abort");
    return {
      ok: false,
      reason: isAbort ? "timeout" : "network",
      message,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Convenience: human-readable diagnostic for UI rendering. Matches the
 * SC-11 acceptance criteria (user sees "what went wrong, what to try").
 */
export function describeVerdict(v: ReachabilityVerdict): string {
  if (v.ok) return `Connected (${Math.round(v.latencyMs)} ms).`;
  switch (v.reason) {
    case "timeout":
      return "Brain did not respond within 2 s. Is your Mac awake and on the same Wi-Fi?";
    case "network":
      return `Cannot reach Brain (${v.message ?? "network error"}). Check Wi-Fi and that Brain is running.`;
    case "unauthorized":
      return "Brain rejected the token. It may have been rotated — re-scan the QR from Brain settings.";
    case "forbidden":
      return "Brain rejected the request origin. Check your pairing and try again.";
    case "server-error":
      return `Brain returned an error (HTTP ${v.status}). Check the Brain error log.`;
    case "unexpected-status":
      return `Brain returned an unexpected status (HTTP ${v.status}).`;
  }
}
