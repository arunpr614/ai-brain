/**
 * Local single-user auth (v0.1.0). A PIN is set on first run; a session
 * cookie grants access. Middleware (src/middleware.ts) enforces this.
 *
 * Hash: PBKDF2-HMAC-SHA-256 × 200k iterations via Node crypto.
 *   - Avoids a native dep (argon2id via @node-rs/argon2 requires
 *     platform-specific binaries that conflict with Capacitor packaging).
 *   - Timing-safe comparison via crypto.timingSafeEqual.
 *
 * Session: HMAC-signed token in a cookie valid 30 days. No external JWT.
 *
 * v0.5.0 will layer bearer-token LAN auth + optional WebAuthn/TouchID
 * on top of this; v0.1.0 ships the PIN floor.
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
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
  // Secure left off — v0.1.0 runs on http://localhost. v0.5.0 adds an option for LAN TLS.
};
