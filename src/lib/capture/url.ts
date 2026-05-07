/**
 * URL capture (F-101). Plain `fetch` + Mozilla Readability via jsdom.
 *
 * Config (hard-coded for v0.2.0; exposed in Settings later):
 *   - timeout_ms: 15000
 *   - max_body_bytes: 5 * 1024 * 1024 (5 MB)
 *   - user_agent: Mozilla-ish + AI Brain tag
 *
 * Out of scope for v0.2.0:
 *   - JS-heavy sites requiring Playwright (revisit v0.10.0 if real sites fail)
 *   - Cookie/auth capture (paywalled articles ingest as truncated)
 *
 * Returns `ExtractedArticle` ready to pass into `createCapturedItem`.
 */
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

const TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 AI-Brain/0.2";

export interface ExtractedArticle {
  title: string;
  author: string | null;
  body: string;
  excerpt: string | null;
  source_url: string;
  html_length: number;
  extraction_warning: string | null;
}

export class UrlCaptureError extends Error {
  code: "fetch_failed" | "too_large" | "timeout" | "unreadable" | "invalid_url";
  constructor(
    code: UrlCaptureError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "UrlCaptureError";
  }
}

export async function extractArticleFromUrl(input: string): Promise<ExtractedArticle> {
  const url = normalizeUrl(input);
  const html = await fetchWithCaps(url);

  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    throw new UrlCaptureError(
      "unreadable",
      "Couldn't extract a readable article from this page. It may be paywalled, JS-rendered, or not an article.",
    );
  }

  const title = (article.title ?? dom.window.document.title ?? url).trim();
  const body = article.textContent.replace(/\n{3,}/g, "\n\n").trim();
  const excerpt = article.excerpt?.trim() ?? null;
  const author = article.byline?.trim() || null;

  return {
    title,
    author,
    body,
    excerpt,
    source_url: url,
    html_length: html.length,
    extraction_warning: body.length < 500 ? "short_article" : null,
  };
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new UrlCaptureError("invalid_url", "URL is required");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    // Accept bare "example.com" by defaulting to https
    try {
      url = new URL(`https://${trimmed}`);
    } catch {
      throw new UrlCaptureError("invalid_url", "That doesn't look like a valid URL");
    }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlCaptureError("invalid_url", "Only http:// and https:// URLs are supported");
  }
  return url.toString();
}

async function fetchWithCaps(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
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
    clearTimeout(timeout);
    const e = err as Error;
    if (e.name === "AbortError") {
      throw new UrlCaptureError("timeout", `Request timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw new UrlCaptureError("fetch_failed", `Network error: ${e.message}`);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    throw new UrlCaptureError(
      "fetch_failed",
      `Server returned ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("html") && !contentType.includes("xml")) {
    throw new UrlCaptureError(
      "unreadable",
      `Expected an HTML page but got ${contentType.split(";")[0]}. For PDFs, use the PDF capture flow.`,
    );
  }

  // Stream-decode with a byte cap so we don't OOM on absurd pages.
  const reader = response.body?.getReader();
  if (!reader) {
    return await response.text();
  }
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new UrlCaptureError(
        "too_large",
        `Response exceeded ${MAX_BODY_BYTES / (1024 * 1024)}MB cap`,
      );
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  const charset = parseCharset(contentType) ?? "utf-8";
  return new TextDecoder(charset, { fatal: false }).decode(merged);
}

function parseCharset(contentType: string): string | null {
  const m = contentType.match(/charset=([^;]+)/i);
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}
