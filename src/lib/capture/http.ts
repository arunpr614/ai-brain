import { assertPublicHttpUrl, UrlSafetyError } from "./url-safety";

const TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 AI-Brain/0.7.5";

export class CaptureFetchError extends Error {
  code: "fetch_failed" | "too_large" | "timeout" | "unreadable" | "invalid_url";
  constructor(code: CaptureFetchError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "CaptureFetchError";
  }
}

export function normalizeHttpUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new CaptureFetchError("invalid_url", "URL is required");
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new CaptureFetchError("invalid_url", "Only http:// and https:// URLs are supported");
    }
    return url.toString();
  } catch (err) {
    if (err instanceof CaptureFetchError) throw err;
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch {
      throw new CaptureFetchError("invalid_url", "That doesn't look like a valid URL");
    }
  }
}

export async function fetchPublicHtml(url: string): Promise<string> {
  const normalized = normalizeHttpUrl(url);
  try {
    await assertPublicHttpUrl(normalized);
  } catch (err) {
    if (err instanceof UrlSafetyError) {
      throw new CaptureFetchError("invalid_url", err.message);
    }
    throw err;
  }

  const response = await fetchWithTimeout(normalized);
  if (!response.ok) {
    throw new CaptureFetchError(
      "fetch_failed",
      `Server returned ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
    throw new CaptureFetchError(
      "unreadable",
      `Expected an HTML page but got ${contentType.split(";")[0]}.`,
    );
  }

  return readResponseWithCap(response, contentType);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") {
      throw new CaptureFetchError("timeout", `Request timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw new CaptureFetchError("fetch_failed", `Network error: ${e.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseWithCap(response: Response, contentType: string): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new CaptureFetchError(
        "too_large",
        `Response exceeded ${MAX_BODY_BYTES / (1024 * 1024)}MB cap`,
      );
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const charset = parseCharset(contentType) ?? "utf-8";
  return new TextDecoder(charset, { fatal: false }).decode(merged);
}

function parseCharset(contentType: string): string | null {
  const match = contentType.match(/charset=([^;]+)/i);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}
