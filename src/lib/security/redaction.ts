export interface RedactStringOptions {
  redactLongContent?: boolean;
  longContentThreshold?: number;
}

export interface RedactReportOptions extends RedactStringOptions {
  redactTitles?: boolean;
}

const DEFAULT_LONG_CONTENT_THRESHOLD = 500;

const SENSITIVE_QUERY_KEYS = [
  "access_token",
  "api_key",
  "apikey",
  "key",
  "refresh_token",
  "signature",
  "sig",
  "token",
  "x-amz-credential",
  "x-amz-security-token",
  "x-amz-signature",
];

const CONTENT_KEYS = new Set([
  "body",
  "chunk",
  "chunks",
  "content",
  "full_text",
  "raw",
  "raw_content",
  "text",
  "transcript",
]);

export function redactSensitiveString(value: string, options: RedactStringOptions = {}): string {
  const threshold = options.longContentThreshold ?? DEFAULT_LONG_CONTENT_THRESHOLD;
  if (options.redactLongContent && value.length > threshold) {
    return redactContent(value);
  }

  return value
    .replace(/^(\s*Cookie\s*:\s*).+$/gim, "$1<redacted:cookie>")
    .replace(
      /(\bAuthorization\s*:\s*Bearer\s+)[^\s"'<>]+/gi,
      "$1<redacted:token>",
    )
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\b(RECALL_API_KEY\s*=\s*)[^\s"'<>]+/gi, "$1<redacted:secret>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(
      /\b((?:api[_-]?key|token|secret|password)\s*=\s*)[^&\s"'<>]+/gi,
      "$1<redacted>",
    )
    .replace(sensitiveQueryPattern(), "$1<redacted>");
}

export function redactContent(value: string): string {
  return `<redacted:content length=${value.length}>`;
}

export function redactTitle(value: string, sensitive = false): string {
  if (sensitive) return "<redacted:title>";
  return redactSensitiveString(value);
}

export function redactError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSensitiveString(error.message),
      ...(error.stack ? { stack: redactSensitiveString(error.stack) } : {}),
    };
  }
  return { message: redactSensitiveString(String(error)) };
}

export function redactReportValue(value: unknown, options: RedactReportOptions = {}): unknown {
  return redactValue(value, options, null);
}

function redactValue(value: unknown, options: RedactReportOptions, key: string | null): unknown {
  if (value instanceof Error) return redactError(value);
  if (typeof value === "string") {
    if (key && CONTENT_KEYS.has(key.toLowerCase())) return redactContent(value);
    if (key?.toLowerCase() === "title" && options.redactTitles) return redactTitle(value, true);
    return redactSensitiveString(value, options);
  }
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, options, key));
  if (!value || typeof value !== "object") return value;

  const redacted: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    redacted[entryKey] = redactValue(entryValue, options, entryKey);
  }
  return redacted;
}

function sensitiveQueryPattern(): RegExp {
  const keys = SENSITIVE_QUERY_KEYS.map(escapeRegExp).join("|");
  return new RegExp(`([?&](?:${keys})=)[^&#\\s"']+`, "gi");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
