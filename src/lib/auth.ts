/**
 * Local single-user auth (v0.1.0 + F-043 hardening).
 * A PIN is set on first run; a session cookie grants access.
 * src/proxy.ts checks presence; this module verifies the HMAC.
 *
 * Hash: PBKDF2-HMAC-SHA-256 × 200k iterations via Node crypto.
 *   - Avoids a native dep (argon2id via @node-rs/argon2 requires
 *     platform-specific binaries that conflict with Capacitor packaging).
 *   - Timing-safe comparison via crypto.timingSafeEqual.
 *
 * Session: HMAC-signed token in a cookie valid 30 days (SESSION_TTL_MS).
 * Token format: `<expiresMs>.<hmacHex>`. `verifySessionToken` rejects if
 * the expiry has passed OR the HMAC doesn't verify. No external JWT.
 *
 * Cookie attributes: HttpOnly + SameSite=Lax + Path=/ (see
 * SESSION_COOKIE_OPTIONS). Secure omitted pre-v0.5.0 because dev runs on
 * plain http://127.0.0.1; v0.5.0 F-037 adds LAN TLS + cookie rotation.
 *
 * SameSite was Strict until 2026-05-12; switched to Lax as a defensive
 * improvement. HISTORICAL CORRECTION: the commit that made this change
 * (89dd61d) claimed it would fix the APK PIN-unlock loop — that claim
 * was wrong. The actual fix was disabling `CapacitorHttp` in
 * capacitor.config.ts (commit 9712dd5), which stopped Capacitor's
 * native HTTP client from racing the cookie flush against the
 * POST /unlock → 303 → GET / redirect. Lax is retained here because
 * it is the more defensible default for an app served through a
 * WebView + tunnel (Strict offers no practical protection over Lax
 * for a PIN-gated single-tenant app), not because Strict was the
 * cookie-loss culprit. See RUNNING_LOG.md entry 2026-05-12 Lane L
 * for the full post-mortem.
 *
 * Key rotation policy (pre-v0.5.0): the signing key is generated once at
 * first PIN setup and persisted in `settings`. It is NOT rotated
 * automatically. If the key is suspected leaked, the only recovery path
 * is the setup flow with the reset flag (F-056) — which generates a new
 * signing key and invalidates all outstanding tokens. Full rotation
 * (F-037) ships in v0.5.0 alongside LAN bearer tokens.
 */
import crypto from "node:crypto";
import { getJsonSetting, setJsonSetting } from "@/db/settings";

const PBKDF2_ITERATIONS = 200_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = "sha256";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface PinSetting {
  salt: string; // hex
  hash: string; // hex
  signing_key: string; // hex, used for session HMAC
}

export const SESSION_COOKIE = "brain-session";

export function isPinConfigured(): boolean {
  const s = getJsonSetting<PinSetting | null>("auth.pin", null);
  return s !== null && !!s.hash;
}

export function setPin(pin: string): void {
  if (pin.length < 4) throw new Error("PIN must be at least 4 characters");
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  const signing_key = crypto.randomBytes(32).toString("hex");
  setJsonSetting<PinSetting>("auth.pin", { salt, hash, signing_key });
}

export function verifyPin(pin: string): boolean {
  const s = getJsonSetting<PinSetting | null>("auth.pin", null);
  if (!s) return false;
  const hash = crypto
    .pbkdf2Sync(pin, s.salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString("hex");
  const a = Buffer.from(s.hash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function issueSessionToken(): string {
  const s = getJsonSetting<PinSetting | null>("auth.pin", null);
  if (!s) throw new Error("PIN not configured");
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${expires}`;
  const mac = crypto
    .createHmac("sha256", Buffer.from(s.signing_key, "hex"))
    .update(payload)
    .digest("hex");
  return `${payload}.${mac}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const s = getJsonSetting<PinSetting | null>("auth.pin", null);
  if (!s) return false;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return false;
  const expected = crypto
    .createHmac("sha256", Buffer.from(s.signing_key, "hex"))
    .update(payload)
    .digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return true;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
  // Secure left off — v0.1.0 runs on http://localhost. v0.5.0 adds an option for LAN TLS.
};
