"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractPdf, PdfCaptureError } from "@/lib/capture/pdf";
import { extractArticleFromUrl, UrlCaptureError } from "@/lib/capture/url";
import { findItemByUrl, insertCaptured } from "@/db/items";

export type CaptureState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "duplicate"; itemId: string; url: string }
  | null;

const UrlInput = z.object({
  url: z.string().trim().min(1, "URL is required").max(2048),
  allow_duplicate: z.string().optional(),
});

export async function captureUrlAction(
  _prev: CaptureState,
  formData: FormData,
): Promise<CaptureState> {
  const parsed = UrlInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let article;
  try {
    article = await extractArticleFromUrl(parsed.data.url);
  } catch (err) {
    if (err instanceof UrlCaptureError) {
      return { status: "error", error: err.message };
    }
    return { status: "error", error: (err as Error).message };
  }

  if (!parsed.data.allow_duplicate) {
    const existing = findItemByUrl(article.source_url);
    if (existing) {
      return { status: "duplicate", itemId: existing.id, url: article.source_url };
    }
  }

  const item = insertCaptured({
    source_type: "url",
    title: article.title,
    body: article.body,
    author: article.author,
    source_url: article.source_url,
    extraction_warning: article.extraction_warning,
  });
  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

/**
 * Route-handler driven: PDFs come in as multipart form posts to
 * /api/capture/pdf (see src/app/api/capture/pdf/route.ts). This server
 * action is the small-enough <= 4.5MB path that form actions allow.
 */
const PDF_MAX_BYTES = 50 * 1024 * 1024;

export async function capturePdfAction(formData: FormData): Promise<{ id: string }> {
  const file = formData.get("pdf");
  if (!(file instanceof File)) {
    throw new PdfCaptureError("extract_failed", "No file uploaded.");
  }
  if (file.size === 0) {
    throw new PdfCaptureError("empty", "Uploaded file is empty.");
  }
  if (file.size > PDF_MAX_BYTES) {
    throw new PdfCaptureError(
      "extract_failed",
      `File exceeds ${PDF_MAX_BYTES / (1024 * 1024)}MB cap.`,
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extracted = await extractPdf({ bytes, filename: file.name });

  const item = insertCaptured({
    source_type: "pdf",
    title: extracted.title,
    body: extracted.body,
    author: extracted.author,
    total_pages: extracted.total_pages,
    total_chars: extracted.total_chars,
    extraction_warning: extracted.extraction_warning,
    captured_at: extracted.created_at ?? undefined,
  });
  revalidatePath("/");
  return { id: item.id };
}
