/**
 * LAN bearer-token auth + rate limiter — v0.5.0 F-016.
 *
 * Sister module to the PIN/session layer in src/lib/auth.ts. The session
 * cookie path authenticates the web UI (WebView nav, browser). This module
 * authenticates programmatic clients that cannot carry a SameSite=Strict
 * cookie: the Android APK's native share-intent handler (POSTing from
 * WebView JS via CapacitorHttp) and the Chrome MV3 extension.
 *
 * Plan decisions encoded here:
 *   - D-v0.5.0-5: native/programmatic paths use Authorization: Bearer header.
 *   - D-v0.5.0-6: rate limiter keyed on sha256(token).slice(0,16), NOT
 *     client IP (IP is trivially spoofable on LAN without a trusted proxy).
 *   - D-v0.5.0-7: no destructive GETs; enforced by the no-destructive-GETs
 *     audit at T-5, not here.
 *
 * Threat framing (v1.1 per REVIEW P2-1):
 *   - The rate limiter is NOT the primary brute-force defence. 256-bit
 *     token entropy already makes brute force infeasible (~10^71 years).
 *   - The rate limiter's real job is to cap damage from runaway client
 *     bugs (extension retry loop, misconfigured share target, etc).
 *   - Limit is env-configurable via BRAIN_LAN_RATE_LIMIT (default 30/min).
 *
 * Empty/short token guard (REVIEW B-1 / H-1):
 *   - verifyBearerToken refuses any comparison when the server's configured
 *     BRAIN_LAN_TOKEN is absent or < MIN_TOKEN_LENGTH hex chars. This
 *     defends against the case where the env var is unset and an attacker
 *     submits Authorization: Bearer  (empty), which would otherwise
 *     equal the empty expected string.
 */
import crypto from "node:crypto";
import * as nodeFs from "node:fs";
import * as nodePath from "node:path";

/**
 * Minimum acceptable length for a bearer token. 32 hex chars = 128 bits.
 * Matches the smallest secure value; the auto-generator always produces 64.
 */
export const MIN_TOKEN_LENGTH = 32;

/**
 * Window (ms) and default limit (requests) for the per-token rate limiter.
 * Override the limit via BRAIN_LAN_RATE_LIMIT.
 */
export const RATE_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT = 30;

export type BearerRejection =
  | "missing-header"
  | "malformed-header"
  | "server-token-unconfigured"
  | "server-token-too-short"
  | "length-mismatch"
  | "token-mismatch";

export type BearerVerdict = { ok: true } | { ok: false; reason: BearerRejection };

/**
 * Routes that accept bearer-token auth. src/proxy.ts (T-4) will consult
 * this list to decide whether to fall through to bearer verification when
 * the session cookie is absent.
 *
 * GET routes here are shared read-only endpoints used by the APK reachability
 * probe and extension duplicate-check; POST routes are the capture endpoints
 * and the client-error logger.
 */
export const BEARER_ROUTES: ReadonlyArray<string> = [
  "/api/capture/url",
  "/api/capture/pdf",
  "/api/capture/note",
  "/api/items",
  "/api/health",
  "/api/errors/client",
];

/** True if the request path is in the BEARER_ROUTES allow-list. */
export function isBearerRoute(pathname: string): boolean {
  return BEARER_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Load BRAIN_LAN_TOKEN from env. If missing OR shorter than MIN_TOKEN_LENGTH,
 * returns null — verification will reject all bearer attempts in that state.
 * The server is intentionally permissive about "no LAN auth configured yet"
 * so pre-T-3 deployments keep working; bearer routes simply reject everything
 * until an operator sets the var.
 *
 * Callers that need to generate a fresh token should use generateLanToken()
 * and write the result to .env (T-17's rotation script does exactly this).
 */
export function loadLanToken(): string | null {
  const raw = process.env.BRAIN_LAN_TOKEN ?? "";
  if (raw.length < MIN_TOKEN_LENGTH) return null;
  return raw;
}

/** 32-byte hex = 64 chars = 256 bits of entropy. */
export function generateLanToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Boot-time helper (T-4). Called from `src/instrumentation.ts#register`.
 * If BRAIN_LAN_TOKEN is already set to a valid value, returns false and does
 * nothing. Otherwise generates a fresh 32-byte hex token, writes (or updates)
 * the `BRAIN_LAN_TOKEN=...` line in `.env` at the repo root, sets
 * `process.env.BRAIN_LAN_TOKEN` for the running process, and returns true.
 *
 * Writes to the real `.env`, never `.env.example`. Preserves other lines in
 * `.env` via simple line-based replace/append. If `.env` doesn't exist, a new
 * file is created with a single `BRAIN_LAN_TOKEN=...` line.
 *
 * The return value tells the caller whether to log `lan.bearer.token-generated`.
 *
 * Not tested directly (side-effecting fs); covered by T-4 integration path
 * and verified at T-22 Pixel smoke (first real server boot).
 */
export function ensureLanToken(options?: {
  envPath?: string;
  onGenerate?: (token: string) => void;
}): boolean {
  if (loadLanToken() !== null) return false;

  const envPath = options?.envPath ?? nodePath.resolve(process.cwd(), ".env");
  const token = generateLanToken();
  const line = `BRAIN_LAN_TOKEN=${token}`;

  let body = "";
  if (nodeFs.existsSync(envPath)) {
    body = nodeFs.readFileSync(envPath, "utf8");
  }

  if (/^BRAIN_LAN_TOKEN=.*$/m.test(body)) {
    body = body.replace(/^BRAIN_LAN_TOKEN=.*$/m, line);
  } else {
    // Append with a preceding newline if the file exists and doesn't end in one.
    if (body.length > 0 && !body.endsWith("\n")) body += "\n";
    body += `${line}\n`;
  }

  nodeFs.writeFileSync(envPath, body, { mode: 0o600 });
  process.env.BRAIN_LAN_TOKEN = token;
  options?.onGenerate?.(token);
  return true;
}

/**
 * Verify a bearer header. Returns { ok: true } on match, { ok: false, reason }
 * otherwise. Uses timingSafeEqual for the final comparison to avoid a string-
 * equality timing oracle, even though the LAN-local threat model makes this
 * largely belt-and-braces.
 *
 * The header must be exactly `Bearer <token>` with a single space separator.
 */
export function verifyBearerToken(authHeader: string | null | undefined): BearerVerdict {
  if (!authHeader) return { ok: false, reason: "missing-header" };
  if (!authHeader.startsWith("Bearer ")) return { ok: false, reason: "malformed-header" };
  const provided = authHeader.slice("Bearer ".length);
  if (provided.length === 0) return { ok: false, reason: "malformed-header" };

  const expected = loadLanToken();
  if (expected === null) {
    // We can't distinguish "unset" from "too short" without re-reading env
    // here, but the rejection reason is most useful for ops; re-read.
    const raw = process.env.BRAIN_LAN_TOKEN ?? "";
    return {
      ok: false,
      reason: raw.length === 0 ? "server-token-unconfigured" : "server-token-too-short",
    };
  }

  if (provided.length !== expected.length) {
    return { ok: false, reason: "length-mismatch" };
  }

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (!crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "token-mismatch" };
  }
  return { ok: true };
}

/**
 * Rate-limiter state, keyed by token fingerprint (D-v0.5.0-6).
 *
 * In-process Map; resets on server restart. Acceptable for a single-user
 * home tool. Bounded size — in practice one key (the single LAN token)
 * unless the operator has manually rotated without restart, in which case
 * the old key times out of the window naturally.
 */
const RATE_STATE = new Map<string, number[]>();

function getConfiguredLimit(): number {
  const raw = process.env.BRAIN_LAN_RATE_LIMIT;
  if (!raw) return DEFAULT_RATE_LIMIT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RATE_LIMIT;
  return Math.floor(n);
}

/**
 * Derive the rate-limit bucket key from the token. sha256 + truncation to
 * 16 hex chars (64 bits) is ample uniqueness for a single-bucket map and
 * leaks nothing useful about the underlying token.
 */
export function tokenFingerprint(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
}

/**
 * Check the rate limit for a bearer-authenticated request. Call AFTER
 * verifyBearerToken returns ok. If the caller is rate-limited, returns
 * false (and the proxy/route handler should respond 429). Otherwise
 * records the timestamp and returns true.
 */
export function checkBearerRateLimit(token: string, now: number = Date.now()): boolean {
  const key = tokenFingerprint(token);
  const limit = getConfiguredLimit();
  const prior = RATE_STATE.get(key) ?? [];
  const recent = prior.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= limit) {
    // Write-through so the Map doesn't grow stale entries over time.
    RATE_STATE.set(key, recent);
    return false;
  }
  recent.push(now);
  RATE_STATE.set(key, recent);
  return true;
}

/** Test-only helper. Not used in production; exported for unit tests. */
export function __resetRateLimiterForTests(): void {
  RATE_STATE.clear();
}

/**
 * Origin-header validation (v0.5.0 T-5 / F-036 / D-v0.5.0-7).
 * Updated 2026-05-10 for the Cloudflare Tunnel pivot (R-CFT critique §8 R-5):
 * LAN-era `http://brain.local:3000` replaced by `https://brain.arunp.in`
 * (the named Cloudflare tunnel URL; stable, HTTPS, no mDNS).
 *
 * Applies to bearer-authenticated cross-origin callers. The WebView APK
 * loads `https://brain.arunp.in` and issues fetch() requests from that
 * origin; the Chrome extension runs at `chrome-extension://<id>` and is
 * legitimately cross-origin. Server-side fetch() calls (curl smokes,
 * scripts) send no Origin header at all, which we must permit for CLI
 * tooling.
 *
 * Accepted origins:
 *   - null / missing  (server-to-server, CLI, curl; no browser context)
 *   - http://localhost:3000         (dev server, local browser)
 *   - http://127.0.0.1:3000         (dev server, loopback IP)
 *   - https://brain.arunp.in        (named Cloudflare tunnel; APK)
 *   - chrome-extension://<any-id>   (MV3 extensions — random install ID)
 *
 * Rejections are logged by the caller as `lan.bearer.reject-origin` via
 * logError(). Route handlers that want Origin checks call validateOrigin()
 * AFTER verifyBearerToken() returns ok.
 *
 * CSRF posture: bearer tokens on non-mutating GETs are already rejected
 * by the BEARER_ROUTES allow-list; origin validation on POST paths is
 * belt-and-braces defense-in-depth.
 */
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://brain.arunp.in",
]);

export function validateOrigin(originHeader: string | null | undefined): boolean {
  if (!originHeader) return true;
  if (ALLOWED_ORIGINS.has(originHeader)) return true;
  if (originHeader.startsWith("chrome-extension://")) return true;
  return false;
}
