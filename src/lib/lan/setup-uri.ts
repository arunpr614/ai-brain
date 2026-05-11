/**
 * Setup-URI parser (v0.5.0 T-16; pivoted to tunnel schema T-CF-4).
 *
 * The QR on /settings/lan-info encodes a `brain://setup?url=<tunnel>&token=<token>`
 * URI via `buildSetupUri()` (info.ts). This module parses the decoded QR
 * text back into `{url, token}` with strict validation so the APK never
 * accepts a malformed payload (e.g., a QR from the wrong site, a
 * shortened copy-paste, or a partial decode).
 *
 * Pure module — no DOM, no Capacitor imports. Imported by the QR scanner
 * page to validate decoded text before calling `Preferences.set()`.
 *
 * Validation rules (defence-in-depth):
 *   - scheme must be exactly `brain:`
 *   - host+path must equal `//setup` (i.e., `brain://setup?...`)
 *   - `url` must be an HTTPS URL (http:// rejected — tunnel origin is
 *     always https). A legacy `ip=` parameter from a pre-pivot QR is
 *     rejected explicitly with reason `ip-field-deprecated`.
 *   - `token` must be 64 hex chars (matches MIN_TOKEN_LENGTH=32 from
 *     bearer.ts which generates 32 raw bytes = 64 hex), lowercase
 *
 * Returns `{ok: true, url, token}` or `{ok: false, reason}`. The discriminant
 * is `ok: boolean` (preserved across the pivot so existing `if (!parsed.ok)`
 * call sites continue to compile — see plan v2.1 REVIEW AC-2).
 */

export type SetupUriVerdict =
  | { ok: true; url: string; token: string }
  | { ok: false; reason: string };

const TOKEN_RE = /^[0-9a-f]{64}$/;

export function parseSetupUri(raw: string): SetupUriVerdict {
  if (typeof raw !== "string" || raw.length === 0) {
    return { ok: false, reason: "empty QR payload" };
  }

  let uri: URL;
  try {
    uri = new URL(raw);
  } catch {
    return { ok: false, reason: "QR does not contain a valid URL" };
  }

  if (uri.protocol !== "brain:") {
    return { ok: false, reason: `expected brain:// scheme, got ${uri.protocol}` };
  }

  // URL parser treats `brain://setup` as host="setup". Accept either form
  // defensively — host="setup" (canonical) or pathname includes "setup".
  const isSetup = uri.hostname === "setup" || uri.pathname === "/setup" || uri.pathname === "//setup";
  if (!isSetup) {
    return { ok: false, reason: "QR is not a brain://setup URI" };
  }

  // Reject legacy pre-pivot QRs that use ip=... instead of url=...
  if (uri.searchParams.has("ip")) {
    return { ok: false, reason: "ip-field-deprecated" };
  }

  const urlParam = uri.searchParams.get("url") ?? "";
  const token = uri.searchParams.get("token") ?? "";

  if (!urlParam) {
    return { ok: false, reason: "QR is missing the url parameter" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlParam);
  } catch {
    return { ok: false, reason: "QR url parameter is not a valid URL" };
  }

  if (parsedUrl.protocol !== "https:") {
    return { ok: false, reason: "url-not-https" };
  }
  if (!parsedUrl.hostname) {
    return { ok: false, reason: "QR url has no hostname" };
  }

  if (!TOKEN_RE.test(token)) {
    return { ok: false, reason: "QR is missing or has a malformed token" };
  }

  // Normalize: strip trailing slash from origin so "https://x/" == "https://x"
  const normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.replace(/\/$/, "")}`;

  return { ok: true, url: normalizedUrl, token };
}
