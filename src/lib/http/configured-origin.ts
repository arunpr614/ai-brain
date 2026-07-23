/**
 * Exact configured-origin authority for cookie-authenticated writes.
 *
 * Request host and forwarding headers are deliberately absent from this API.
 * The only authorities are the startup configuration and the request Origin
 * header.
 */

export interface ConfiguredPublicOrigin {
  readonly origin: string;
  readonly protocol: "http:" | "https:";
  readonly hostname: string;
  readonly effectivePort: string;
}

export type ConfiguredOriginFailureCode =
  | "configured_origin_missing"
  | "configured_origin_invalid";

export type ConfiguredOriginResult =
  | { readonly ok: true; readonly value: ConfiguredPublicOrigin }
  | { readonly ok: false; readonly code: ConfiguredOriginFailureCode };

export type RequestOriginDecision =
  | { readonly ok: true; readonly code: "origin_allowed" }
  | {
      readonly ok: false;
      readonly code:
        | ConfiguredOriginFailureCode
        | "request_origin_missing"
        | "request_origin_invalid"
        | "request_origin_mismatch";
    };

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
} as const;

export function parseConfiguredPublicOrigin(
  raw: unknown = process.env.BRAIN_PUBLIC_ORIGIN,
): ConfiguredOriginResult {
  if (raw === undefined || raw === "") {
    return Object.freeze({
      ok: false,
      code: "configured_origin_missing",
    });
  }
  const parsed = parseExactOrigin(raw);
  if (!parsed) {
    return Object.freeze({
      ok: false,
      code: "configured_origin_invalid",
    });
  }
  return Object.freeze({ ok: true, value: parsed });
}

export function evaluateConfiguredRequestOrigin(
  headers: Pick<Headers, "get">,
  configured: ConfiguredOriginResult = parseConfiguredPublicOrigin(),
): RequestOriginDecision {
  if (!configured.ok) return configured;

  const requestOrigin = headers.get("origin");
  if (requestOrigin === null || requestOrigin === "") {
    return { ok: false, code: "request_origin_missing" };
  }
  const parsedRequestOrigin = parseExactOrigin(requestOrigin);
  if (!parsedRequestOrigin) {
    return { ok: false, code: "request_origin_invalid" };
  }
  if (parsedRequestOrigin.origin !== configured.value.origin) {
    return { ok: false, code: "request_origin_mismatch" };
  }
  return { ok: true, code: "origin_allowed" };
}

export function isExactConfiguredRequestOrigin(
  headers: Pick<Headers, "get">,
  configured: ConfiguredOriginResult = parseConfiguredPublicOrigin(),
): boolean {
  return evaluateConfiguredRequestOrigin(headers, configured).ok;
}

/**
 * Build response headers whose privacy requirements cannot be weakened by
 * caller-supplied headers.
 */
export function privateNoStoreHeaders(initial?: HeadersInit): Headers {
  const headers = new Headers(initial);
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    headers.set(name, value);
  }
  headers.set("Vary", mergeVary(headers.get("Vary"), ["Cookie", "Origin"]));
  return headers;
}

function parseExactOrigin(raw: unknown): ConfiguredPublicOrigin | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (raw !== raw.trim() || /[\u0000-\u0020\u007f]/.test(raw)) return null;
  if (!/^https?:\/\//i.test(raw)) return null;

  const schemeEnd = raw.indexOf("://") + 3;
  const remainderStart = raw.slice(schemeEnd).search(/[/?#]/);
  const remainder =
    remainderStart === -1 ? "" : raw.slice(schemeEnd + remainderStart);
  if (remainder !== "" && remainder !== "/") return null;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.hostname === "" ||
    parsed.origin === "null" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    return null;
  }

  const authority = remainderStart === -1
    ? raw.slice(schemeEnd)
    : raw.slice(schemeEnd, schemeEnd + remainderStart);
  if (authority.endsWith(":")) return null;

  return Object.freeze({
    origin: parsed.origin,
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    effectivePort:
      parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
  });
}

function mergeVary(current: string | null, required: readonly string[]): string {
  const values = (current ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.includes("*")) return "*";
  const lower = new Set(values.map((value) => value.toLowerCase()));
  for (const value of required) {
    if (!lower.has(value.toLowerCase())) {
      values.push(value);
      lower.add(value.toLowerCase());
    }
  }
  return values.join(", ");
}
