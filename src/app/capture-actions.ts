"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { extractPdf, PdfCaptureError } from "@/lib/capture/pdf";
import { extractUrlCapture } from "@/lib/capture/capture-url";
import { UrlCaptureError } from "@/lib/capture/url";
import { YoutubeCaptureError } from "@/lib/capture/youtube";
import { saveCaptureArtifacts } from "@/lib/capture/artifacts";
import { findItemByUrl, insertCaptured, type CaptureSource } from "@/db/items";
import { logError } from "@/lib/errors/sink";

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

  let extracted;
  try {
    extracted = await extractUrlCapture({ url: parsed.data.url });
  } catch (err) {
    if (err instanceof UrlCaptureError || err instanceof YoutubeCaptureError) {
      return { status: "error", error: err.message };
    }
    return { status: "error", error: (err as Error).message };
  }

  if (!parsed.data.allow_duplicate) {
    const existing = findItemByUrl(extracted.content.source_url);
    if (existing) {
      return { status: "duplicate", itemId: existing.id, url: extracted.content.source_url };
    }
  }

  const item = insertCaptured({
    source_type: extracted.source_type,
    title: extracted.content.title,
    body: extracted.content.body,
    author: extracted.content.author,
    source_url: extracted.content.source_url,
    extraction_warning: extracted.content.extraction_warning,
    duration_seconds: extracted.content.duration_seconds ?? null,
    source_platform: extracted.content.source_platform ?? extracted.detection.platform,
    capture_quality: extracted.content.capture_quality ?? null,
    extraction_method: extracted.content.extraction_method ?? null,
    extraction_version: extracted.content.extraction_version ?? null,
    published_at: extracted.content.published_at ?? null,
    thumbnail_url: extracted.content.thumbnail_url ?? null,
    description: extracted.content.description ?? null,
  });
  try {
    await saveCaptureArtifacts(item.id, extracted.content.artifacts);
  } catch (err) {
    logError({
      type: "capture.artifact-save-failed",
      item_id: item.id,
      message: (err as Error).message,
      ts: Date.now(),
    });
  }
  revalidatePath("/");
  redirect(`/items/${item.id}`);
}

/**
 * Route-handler driven: PDFs come in as multipart form posts to
 * /api/capture/pdf (see src/app/api/capture/pdf/route.ts). This server
 * action is the small-enough <= 4.5MB path that form actions allow.
 */
const PDF_MAX_BYTES = 50 * 1024 * 1024;

export async function capturePdfAction(
  formData: FormData,
  opts: { capture_source?: CaptureSource } = {},
): Promise<{ id: string }> {
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
    capture_source: opts.capture_source ?? "web",
    title: extracted.title,
    body: extracted.body,
    author: extracted.author,
    total_pages: extracted.total_pages,
    total_chars: extracted.total_chars,
    extraction_warning: extracted.extraction_warning,
    captured_at: extracted.created_at ?? undefined,
    source_platform: "pdf",
    capture_quality: "full_text",
    extraction_method: "pdf",
    extraction_version: "capture-v0.7.5",
  });
  revalidatePath("/");
  return { id: item.id };
}
