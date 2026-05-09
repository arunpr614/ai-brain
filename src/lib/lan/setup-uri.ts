/**
 * Setup-URI parser (v0.5.0 T-16).
 *
 * The QR on /settings/lan-info encodes a `brain://setup?ip=<ip>&token=<token>`
 * URI via `buildSetupUri()` (info.ts). This module parses the decoded QR
 * text back into `{ip, token}` with strict validation so the APK never
 * accepts a malformed payload (e.g., a QR from the wrong site, a
 * shortened copy-paste, or a partial decode).
 *
 * Pure module — no DOM, no Capacitor imports. Imported by the QR scanner
 * page to validate decoded text before calling `Preferences.set()`.
 *
 * Validation rules (defence-in-depth; the scanner is already a privileged
 * UX path — user intentionally pointed the camera — but we defend anyway):
 *   - scheme must be exactly `brain:`
 *   - host+path must equal `//setup` (i.e., `brain://setup?...`)
 *   - `ip` must be a dotted-quad IPv4; octets 0..255, no leading zeros beyond 0 itself
 *   - `token` must be 64 hex chars (matches MIN_TOKEN_LENGTH=32 from bearer.ts
 *     which generates 32 raw bytes = 64 hex), lowercase
 *
 * Returns `{ok: true, ip, token}` or `{ok: false, reason}`. The reason
 * strings are intentionally user-friendly-ish so the setup page can
 * surface them inline without further mapping.
 */

export type SetupUriVerdict =
  | { ok: true; ip: string; token: string }
  | { ok: false; reason: string };

const IPV4_RE = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;

export function parseSetupUri(raw: string): SetupUriVerdict {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "empty QR payload" };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "QR does not contain a valid URL" };
  }

  if (url.protocol !== "brain:") {
    return { ok: false, reason: `expected brain:// scheme, got ${url.protocol}` };
  }

  // URL parser treats `brain://setup` as host="setup". Accept either form
  // defensively — host="setup" (canonical) or pathname includes "setup".
  const isSetup = url.hostname === "setup" || url.pathname === "/setup" || url.pathname === "//setup";
  if (!isSetup) {
    return { ok: false, reason: "QR is not a brain://setup URI" };
  }

  const ip = url.searchParams.get("ip") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!IPV4_RE.test(ip)) {
    return { ok: false, reason: "QR is missing or has a malformed IP" };
  }
  if (!TOKEN_RE.test(token)) {
    return { ok: false, reason: "QR is missing or has a malformed token" };
  }

  return { ok: true, ip, token };
}
