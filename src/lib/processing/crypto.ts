import crypto from "node:crypto";

const ephemeralSecret = crypto.randomBytes(32);

function secret(): Buffer {
  // Production already persists BRAIN_API_TOKEN across restarts. A dedicated
  // secret may override it, but never derive cursors/scope hashes from content.
  const configured = process.env.BRAIN_PROCESSING_HMAC_SECRET?.trim()
    || process.env.BRAIN_API_TOKEN?.trim();
  return configured ? Buffer.from(configured, "utf8") : ephemeralSecret;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function scopeHash(scope: string): string {
  return crypto.createHmac("sha256", secret()).update(`processing-scope-v1\0${scope}`).digest("hex");
}

export function signCursor(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(`processing-cursor-v1\0${payload}`).digest("base64url");
}

export function newUuid(): string {
  return crypto.randomUUID();
}
