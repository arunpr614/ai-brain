import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PRIVATE_MANIFEST_VALUE_KEYS = new Set(["cardId", "expectedTitle", "sourceUrl", "notes"]);
const RECALL_API_KEY_PATTERN = /\bsk_[A-Za-z0-9_-]{10,}\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/gi;

export function collectPrivatePreviewValues(paths) {
  const candidates = Array.isArray(paths) ? paths : [paths];
  const values = new Set();
  for (const path of candidates) {
    if (!path || !existsSync(resolve(path))) continue;
    try {
      const parsed = JSON.parse(readFileSync(resolve(path), "utf8"));
      collectManifestValues(parsed, values);
    } catch {
      // Invalid JSON is reported by the validator. Do not echo raw file contents here.
    }
  }
  return Array.from(values).sort((a, b) => b.length - a.length);
}

export function preview(value, privateValues = [], maxChars = 500) {
  const trimmed = redactPreview(value, privateValues).trim();
  if (!trimmed) return "";
  return trimmed.length > maxChars ? `${trimmed.slice(0, maxChars - 3)}...` : trimmed;
}

export function redactPreview(value, privateValues = []) {
  let redacted = String(value ?? "")
    .replace(RECALL_API_KEY_PATTERN, "[REDACTED_RECALL_API_KEY]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED_TOKEN]");

  for (const privateValue of privateValues) {
    redacted = replaceAllLiteral(redacted, privateValue, "[REDACTED_PRIVATE_MANIFEST_VALUE]");
  }

  return redacted;
}

function collectManifestValues(value, values) {
  if (Array.isArray(value)) {
    for (const item of value) collectManifestValues(item, values);
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_MANIFEST_VALUE_KEYS.has(key) && typeof child === "string") {
      addPrivateValue(values, child);
      addSourceUrlPath(values, key, child);
    }
    collectManifestValues(child, values);
  }
}

function addPrivateValue(values, value) {
  const trimmed = value.trim();
  if (trimmed.length >= 4) values.add(trimmed);
}

function addSourceUrlPath(values, key, value) {
  if (key !== "sourceUrl") return;
  try {
    const url = new URL(value);
    addPrivateValue(values, url.pathname);
  } catch {
    // Non-URL values are handled by the regular exact-value redaction path.
  }
}

function replaceAllLiteral(input, literal, replacement) {
  if (!literal) return input;
  return input.split(literal).join(replacement);
}
