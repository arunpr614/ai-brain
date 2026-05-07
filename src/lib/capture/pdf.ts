/**
 * PDF capture (F-102). Uses `unpdf@1.6.2` (validated in v0.0.1 empirical
 * sanity morning) to extract per-page text + metadata from a PDF buffer.
 *
 * Paywall / scan detection (per v0.0.1 calibration):
 *   - threshold: avg chars/page < 301 → `possible_paywall_truncation`
 *     (301 = p5 × 0.7 of the known-good 10-PDF Lenny sample)
 *   - scan signal: any page with < 50 chars AND file-size/totalPages > 3 KB
 *     → `possible_scanned_page` (deferred OCR path; warn for now)
 *
 * Header/footer boilerplate is stripped by `stripRepeatingHeadersFooters`
 * (F-103) before we merge pages into the stored body.
 */
import { extractText, getMeta } from "unpdf";
import { pagesToBody } from "./strip";

const PAYWALL_THRESHOLD_CHARS_PER_PAGE = 301;
const SCAN_MIN_CHARS_PER_PAGE = 50;
const SCAN_SIZE_BYTES_PER_PAGE = 3 * 1024;

export interface ExtractedPdf {
  title: string;
  author: string | null;
  body: string;
  total_pages: number;
  total_chars: number;
  created_at: number | null;
  extraction_warning: string | null;
}

export class PdfCaptureError extends Error {
  code: "extract_failed" | "empty";
  constructor(code: PdfCaptureError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "PdfCaptureError";
  }
}

export interface ExtractInput {
  bytes: Uint8Array;
  /** Original filename; used as a fallback title. */
  filename?: string;
}

export async function extractPdf({ bytes, filename }: ExtractInput): Promise<ExtractedPdf> {
  let result: { totalPages: number; text: string[] };
  try {
    result = await extractText(bytes, { mergePages: false });
  } catch (err) {
    throw new PdfCaptureError("extract_failed", (err as Error).message);
  }

  const { totalPages, text: pages } = result;
  if (totalPages === 0 || pages.length === 0) {
    throw new PdfCaptureError("empty", "PDF contains no extractable pages.");
  }

  const body = pagesToBody(pages);
  const total_chars = body.length;
  const avgCharsPerPage = total_chars / totalPages;
  const bytesPerPage = bytes.byteLength / totalPages;

  // Paywall / short-body guard
  let warning: string | null = null;
  if (avgCharsPerPage < PAYWALL_THRESHOLD_CHARS_PER_PAGE) {
    warning = "possible_paywall_truncation";
  }

  // Scanned-page signal (v0.2.0 just flags; OCR is deferred to R-OCR)
  const scanSuspicious = pages.some(
    (p) => p.length < SCAN_MIN_CHARS_PER_PAGE && bytesPerPage > SCAN_SIZE_BYTES_PER_PAGE,
  );
  if (scanSuspicious) {
    warning = warning ? `${warning},possible_scanned_page` : "possible_scanned_page";
  }

  // Metadata (best-effort)
  let title = filename?.replace(/\.pdf$/i, "") ?? "Untitled PDF";
  let author: string | null = null;
  let created_at: number | null = null;
  try {
    const meta = await getMeta(bytes);
    // unpdf returns { info: Record<string, string | undefined>, metadata: ... }
    const info = (meta as { info?: Record<string, string | Date | undefined> })?.info ?? {};
    if (typeof info.Title === "string" && info.Title.trim()) {
      title = info.Title.trim();
    }
    if (typeof info.Author === "string" && info.Author.trim()) {
      author = info.Author.trim();
    }
    if (info.CreationDate instanceof Date) {
      created_at = info.CreationDate.getTime();
    } else if (typeof info.CreationDate === "string") {
      const d = new Date(info.CreationDate);
      if (!Number.isNaN(d.getTime())) created_at = d.getTime();
    }
  } catch {
    // Metadata is not load-bearing; proceed without it.
  }

  return {
    title,
    author,
    body,
    total_pages: totalPages,
    total_chars,
    created_at,
    extraction_warning: warning,
  };
}
