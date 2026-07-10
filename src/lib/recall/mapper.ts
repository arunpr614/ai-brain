import { createHash } from "node:crypto";
import type { InsertCapturedInput, SourceType } from "@/db/items";
import { detectCapturePlatform } from "@/lib/capture/platform";
import type { CapturePlatform, CaptureQuality } from "@/lib/capture/types";
import type { RecallCardDetail, RecallContentFidelity } from "./types";

export const RECALL_IMPORT_EXTRACTION_VERSION = "recall-sync-v0.1";

export interface RecallMappedCard {
  item: InsertCapturedInput;
  sync: {
    recall_card_id: string;
    recall_created_at: string | null;
    recall_source_url: string | null;
    recall_title: string;
    recall_image_url: string | null;
    content_hash: string;
    content_fidelity: RecallContentFidelity;
    chunk_count: number;
    metadata_json: string;
  };
}

export function mapRecallCardToCapturedInput(
  detail: RecallCardDetail,
  options: { importedAt?: number; verifiedComplete?: boolean } = {},
): RecallMappedCard {
  const cardId = normalizeRequiredString(detail.id, "Recall card id");
  const title = normalizeString(detail.title) ?? "Untitled Recall card";
  const sourceUrl = normalizeString(detail.source_url);
  const createdAt = normalizeString(detail.created_at);
  const imageUrl = normalizeString(detail.image);
  const importedAt = options.importedAt ?? Date.now();
  const chunks = normalizeChunks(detail.chunks);
  const contentFidelity = inferContentFidelity(chunks.length, Boolean(options.verifiedComplete));
  const source = inferSource(sourceUrl);
  const warning = extractionWarningForFidelity(contentFidelity);
  const body = buildRecallBody({
    cardId,
    title,
    createdAt,
    sourceUrl,
    contentFidelity,
    importedAt,
    chunks,
  });
  const contentHash = hashRecallContent({
    cardId,
    title,
    createdAt,
    sourceUrl,
    chunks,
  });

  return {
    item: {
      source_type: source.sourceType,
      capture_source: "recall",
      title,
      body,
      source_url: sourceUrl,
      total_chars: body.length,
      extraction_warning: warning,
      source_platform: source.platform,
      capture_quality: captureQualityForFidelity(contentFidelity),
      extraction_method: "recall_api_card_chunks",
      extraction_version: RECALL_IMPORT_EXTRACTION_VERSION,
      thumbnail_url: imageUrl,
      description: `Recall snapshot. Content fidelity: ${contentFidelity}.`,
      captured_at: importedAt,
    },
    sync: {
      recall_card_id: cardId,
      recall_created_at: createdAt,
      recall_source_url: sourceUrl,
      recall_title: title,
      recall_image_url: imageUrl,
      content_hash: contentHash,
      content_fidelity: contentFidelity,
      chunk_count: chunks.length,
      metadata_json: JSON.stringify({
        source: "recall_api",
        mapper_version: RECALL_IMPORT_EXTRACTION_VERSION,
        source_type: source.sourceType,
        source_platform: source.platform,
        has_source_url: Boolean(sourceUrl),
        has_image: Boolean(imageUrl),
        chunk_count: chunks.length,
        content_fidelity: contentFidelity,
      }),
    },
  };
}

export function inferContentFidelity(
  chunkCount: number,
  verifiedComplete = false,
): RecallContentFidelity {
  if (chunkCount <= 0) return "metadata_only";
  if (verifiedComplete) return "complete_enough_for_daily_import";
  if (chunkCount >= 50) return "possibly_truncated";
  return "api_chunks_unverified";
}

function normalizeChunks(chunks: RecallCardDetail["chunks"]): string[] {
  return (chunks ?? [])
    .map((chunk, originalIndex) => ({
      order:
        numberOrNull(chunk.order) ??
        numberOrNull(chunk.index) ??
        numberOrNull(chunk.idx) ??
        originalIndex,
      text: normalizeChunkText(chunk),
    }))
    .filter((chunk): chunk is { order: number; text: string } => Boolean(chunk.text))
    .sort((a, b) => a.order - b.order)
    .map((chunk) => chunk.text);
}

function normalizeChunkText(chunk: NonNullable<RecallCardDetail["chunks"]>[number]): string | null {
  return (
    normalizeString(chunk.content) ??
    normalizeString(chunk.markdown) ??
    normalizeString(chunk.text) ??
    normalizeString(chunk.body)
  );
}

function buildRecallBody(input: {
  cardId: string;
  title: string;
  createdAt: string | null;
  sourceUrl: string | null;
  contentFidelity: RecallContentFidelity;
  importedAt: number;
  chunks: string[];
}): string {
  const provenance = [
    "Imported from Recall",
    `Recall card id: ${input.cardId}`,
    `Recall created_at: ${input.createdAt ?? "unknown"}`,
    `Original source: ${input.sourceUrl ?? "unknown"}`,
    `Content fidelity: ${input.contentFidelity}`,
    `Imported at: ${new Date(input.importedAt).toISOString()}`,
  ];
  const content =
    input.chunks.length > 0
      ? input.chunks.join("\n\n---\n\n")
      : `No Recall API chunks were available for this card. Title: ${input.title}`;
  return `${provenance.join("\n")}\n\n---\n\n${content}`;
}

function inferSource(sourceUrl: string | null): {
  sourceType: SourceType;
  platform: CapturePlatform;
} {
  if (!sourceUrl) return { sourceType: "note", platform: "note" };
  if (isPdfUrl(sourceUrl)) return { sourceType: "pdf", platform: "pdf" };

  try {
    const detected = detectCapturePlatform(sourceUrl);
    return {
      sourceType: detected.sourceType,
      platform: detected.platform,
    };
  } catch {
    return { sourceType: "url", platform: "generic_article" };
  }
}

function captureQualityForFidelity(fidelity: RecallContentFidelity): CaptureQuality {
  return fidelity === "metadata_only" || fidelity === "blocked_unknown"
    ? "metadata_only"
    : "full_text";
}

function extractionWarningForFidelity(fidelity: RecallContentFidelity): string | null {
  switch (fidelity) {
    case "api_chunks_unverified":
      return "recall_api_chunks_unverified";
    case "possibly_truncated":
      return "recall_api_chunks_possibly_truncated";
    case "metadata_only":
      return "recall_api_metadata_only";
    case "blocked_unknown":
      return "recall_api_blocked_unknown";
    case "complete_enough_for_daily_import":
      return null;
  }
}

function hashRecallContent(input: {
  cardId: string;
  title: string;
  createdAt: string | null;
  sourceUrl: string | null;
  chunks: string[];
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        cardId: input.cardId,
        title: input.title,
        createdAt: input.createdAt,
        sourceUrl: input.sourceUrl,
        chunks: input.chunks,
      }),
    )
    .digest("hex");
}

function normalizeRequiredString(value: unknown, field: string): string {
  const normalized = normalizeString(value);
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function normalizeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isPdfUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return /\.pdf(?:$|[?#])/i.test(rawUrl);
  }
}
