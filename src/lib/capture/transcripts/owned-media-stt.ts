import crypto from "node:crypto";
import { getDb, type ItemRow } from "@/db/client";
import { getItem } from "@/db/items";
import {
  deleteTranscriptSegmentsForItem,
  insertTranscriptSegments,
  insertTranscriptSource,
  supersedeTranscriptSourcesForItem,
  type TranscriptSegmentRow,
  type TranscriptSourceRow,
  type TranscriptTimestampMode,
} from "@/db/transcripts";
import {
  allowOwnedMediaSttForItem,
  isYoutubeItem,
  type AllowedTranscriptAcquisition,
  type TranscriptPolicyResult,
} from "@/lib/capture/policy";
import {
  MIN_REPAIR_TEXT_CHARS,
  RepairItemError,
  repairItemWithText,
  type RepairItemWithTextResult,
} from "@/lib/repair/item-repair";

export const OWNED_MEDIA_STT_ADAPTER_VERSION = "owned-media-stt-v1";
export const DEFAULT_OWNED_MEDIA_STT_MAX_BYTES = 25 * 1024 * 1024;
export const MAX_OWNED_MEDIA_STT_TEXT_CHARS = 500_000;
export const MAX_OWNED_MEDIA_STT_SEGMENTS = 7_200;
export const SEGMENT_DURATION_TOLERANCE_MS = 100;
export const MEDIA_DURATION_TOLERANCE_MS = 1_000;

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".wav",
  ".webm",
]);

const ALLOWED_MEDIA_CONTENT_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/mpga",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/webm",
  "video/mp4",
  "video/mpeg",
  "video/webm",
]);

export type OwnedMediaSttErrorCode =
  | "not_found"
  | "not_youtube_item"
  | "invalid_media"
  | "provider_failed"
  | "policy_blocked"
  | "text_too_short"
  | "text_too_large"
  | "too_many_segments"
  | "invalid_segments"
  | "invalid_title";

export class OwnedMediaSttError extends Error {
  constructor(
    readonly code: OwnedMediaSttErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OwnedMediaSttError";
  }
}

export interface OwnedMediaSttMedia {
  filename: string;
  contentType?: string | null;
  byteLength: number;
  durationMs?: number | null;
  sha256: string;
  uploadedMediaId?: string | null;
  rightsAttestation: "owned_uploaded_media";
}

export interface OwnedMediaSttProviderInput {
  media: {
    filename: string;
    contentType: string | null;
    byteLength: number;
    durationMs: number | null;
    sha256: string;
    uploadedMediaId: string | null;
  };
  languageCode: string | null;
}

export interface OwnedMediaSttProvider {
  providerName: string;
  providerVersion: string;
  maxBytes?: number;
  transcribe(input: OwnedMediaSttProviderInput): Promise<OwnedMediaSttTranscript>;
}

export interface OwnedMediaSttTranscript {
  text: string;
  languageCode?: string | null;
  timestampMode: TranscriptTimestampMode;
  segments: OwnedMediaSttTranscriptSegment[];
  model?: string | null;
  requestId?: string | null;
  usage?: {
    seconds?: number;
    inputTokens?: number;
    outputTokens?: number;
  } | null;
}

export interface OwnedMediaSttTranscriptSegment {
  startMs?: number | null;
  endMs?: number | null;
  durationMs?: number | null;
  text: string;
  confidence?: number | null;
}

export interface AttachOwnedMediaSttInput {
  itemId: string;
  media: OwnedMediaSttMedia;
  provider: OwnedMediaSttProvider;
  title?: string | null;
  languageCode?: string | null;
  policyDecider?: (item: ItemRow) => TranscriptPolicyResult;
}

export interface AttachOwnedMediaSttResult {
  repair: RepairItemWithTextResult;
  policyDecisionId: string;
  transcriptSource: TranscriptSourceRow;
  transcriptSegments: TranscriptSegmentRow[];
  providerInput: OwnedMediaSttProviderInput;
}

export interface ValidatedOwnedMediaSttMedia {
  filename: string;
  basename: string;
  contentType: string | null;
  byteLength: number;
  durationMs: number | null;
  sha256: string;
  uploadedMediaId: string | null;
  maxBytes: number;
}

interface ValidatedTranscript {
  normalizedText: string;
  languageCode: string | null;
  timestampMode: TranscriptTimestampMode;
  segments: Array<{
    idx: number;
    startMs: number | null;
    endMs: number | null;
    durationMs: number | null;
    text: string;
    confidence: number | null;
  }>;
  model: string | null;
  requestId: string | null;
  usage: Record<string, number> | null;
}

export async function attachOwnedMediaSttToYoutubeItem(
  input: AttachOwnedMediaSttInput,
): Promise<AttachOwnedMediaSttResult> {
  const existing = getItem(input.itemId);
  if (!existing) {
    throw new OwnedMediaSttError("not_found", "Item not found.");
  }
  if (!isYoutubeItem(existing)) {
    throw new OwnedMediaSttError(
      "not_youtube_item",
      "Owned-media STT can only be attached to YouTube items in this flow.",
    );
  }

  const media = validateOwnedMediaSttMedia(input.media, input.provider.maxBytes);
  const languageCode = normalizeLanguageCode(input.languageCode);
  const policy = (input.policyDecider ?? allowOwnedMediaSttForItem)(existing);
  if (policy.status === "blocked") {
    throw new OwnedMediaSttError("policy_blocked", policy.blockedReason);
  }
  const providerInput: OwnedMediaSttProviderInput = {
    media: {
      filename: media.basename,
      contentType: media.contentType,
      byteLength: media.byteLength,
      durationMs: media.durationMs,
      sha256: media.sha256,
      uploadedMediaId: media.uploadedMediaId,
    },
    languageCode,
  };

  let transcript: OwnedMediaSttTranscript;
  try {
    transcript = await input.provider.transcribe(providerInput);
  } catch {
    throw new OwnedMediaSttError("provider_failed", "Owned-media STT provider failed.");
  }

  const validatedTranscript = validateTranscript(transcript, media.durationMs);

  const tx = getDb().transaction((): AttachOwnedMediaSttResult => {
    let repair: RepairItemWithTextResult;
    try {
      repair = repairItemWithText({
        itemId: input.itemId,
        title: input.title,
        text: validatedTranscript.normalizedText,
        textKind: "transcript",
        captureQuality: "metadata_plus_transcript",
        extractionMethod: "owned_media_stt",
        extractionVersion: OWNED_MEDIA_STT_ADAPTER_VERSION,
      });
    } catch (err) {
      if (err instanceof RepairItemError) {
        throw new OwnedMediaSttError(err.code, err.message);
      }
      throw err;
    }

    supersedeTranscriptSourcesForItem(repair.item.id);
    deleteTranscriptSegmentsForItem(repair.item.id);
    const transcriptSource = insertTranscriptSource({
      item_id: repair.item.id,
      policy_decision_id: policy.allowed.policyDecisionId,
      source_kind: "owned_media_stt",
      language_code: validatedTranscript.languageCode,
      caption_source_class: "stt",
      timestamp_mode: validatedTranscript.timestampMode,
      provenance_json: JSON.stringify(
        provenanceForOwnedMediaStt({
          allowed: policy.allowed,
          media,
          provider: input.provider,
          transcript: validatedTranscript,
        }),
      ),
      retention_class: policy.allowed.retentionClass,
      text_sha256: sha256(validatedTranscript.normalizedText),
      segment_count: validatedTranscript.segments.length,
      status: "active",
    });

    const transcriptSegments = insertTranscriptSegments(
      validatedTranscript.segments.map((segment) => ({
        transcript_source_id: transcriptSource.id,
        item_id: repair.item.id,
        idx: segment.idx,
        start_ms: segment.startMs,
        duration_ms: segment.durationMs,
        end_ms: segment.endMs,
        text: segment.text,
        text_sha256: sha256(segment.text),
        token_count: tokenCount(segment.text),
        confidence: segment.confidence,
      })),
    );

    return {
      repair,
      policyDecisionId: policy.allowed.policyDecisionId,
      transcriptSource,
      transcriptSegments,
      providerInput,
    };
  });

  return tx();
}

export function validateOwnedMediaSttMedia(
  input: OwnedMediaSttMedia,
  providerMaxBytes?: number,
): ValidatedOwnedMediaSttMedia {
  if (input.rightsAttestation !== "owned_uploaded_media") {
    throw new OwnedMediaSttError("invalid_media", "Owned-media STT requires owned media attestation.");
  }

  const filename = input.filename.trim();
  const basename = sanitizeBasename(filename);
  const extension = extensionForFilename(basename);
  if (!basename || !extension || !ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
    throw new OwnedMediaSttError(
      "invalid_media",
      "Use an mp3, mp4, mpeg, mpga, m4a, wav, or webm media file.",
    );
  }

  const contentType = normalizeContentType(input.contentType);
  if (contentType && !ALLOWED_MEDIA_CONTENT_TYPES.has(contentType)) {
    throw new OwnedMediaSttError("invalid_media", "Unsupported owned media content type.");
  }

  const maxBytes = validMaxBytes(providerMaxBytes);
  if (!Number.isSafeInteger(input.byteLength) || input.byteLength <= 0) {
    throw new OwnedMediaSttError("invalid_media", "Owned media must have a positive byte length.");
  }
  if (input.byteLength > maxBytes) {
    throw new OwnedMediaSttError("invalid_media", "Owned media exceeds the configured STT size limit.");
  }

  const sha = input.sha256.trim();
  if (!/^[0-9a-f]{64}$/.test(sha)) {
    throw new OwnedMediaSttError("invalid_media", "Owned media must include a SHA-256 digest.");
  }

  const durationMs = nullableMediaDuration(input.durationMs);
  if (durationMs !== null && durationMs < 0) {
    throw new OwnedMediaSttError("invalid_media", "Owned media duration must be non-negative.");
  }

  return {
    filename,
    basename,
    contentType,
    byteLength: input.byteLength,
    durationMs,
    sha256: sha,
    uploadedMediaId: sanitizeIdentifier(input.uploadedMediaId),
    maxBytes,
  };
}

function validateTranscript(
  transcript: OwnedMediaSttTranscript,
  mediaDurationMs: number | null,
): ValidatedTranscript {
  const timestampMode = transcript.timestampMode;
  if (
    timestampMode !== "timestamped" &&
    timestampMode !== "paragraph_only" &&
    timestampMode !== "inferred"
  ) {
    throw new OwnedMediaSttError("invalid_segments", "Unsupported STT timestamp mode.");
  }

  if (!Array.isArray(transcript.segments) || transcript.segments.length === 0) {
    throw new OwnedMediaSttError("invalid_segments", "STT output must include transcript segments.");
  }
  if (transcript.segments.length > MAX_OWNED_MEDIA_STT_SEGMENTS) {
    throw new OwnedMediaSttError("too_many_segments", "STT output has too many segments for this version.");
  }

  const segments = transcript.segments.map((segment, idx) =>
    validateSegment({
      segment,
      idx,
      timestampMode,
      previous: idx > 0 ? transcript.segments[idx - 1] : null,
      mediaDurationMs,
    }),
  );
  validateMonotonicSegments(segments, timestampMode);

  const segmentText = segments.map((segment) => segment.text).join("\n\n").trim();
  const normalizedText = segmentText;
  if (normalizedText.length > MAX_OWNED_MEDIA_STT_TEXT_CHARS) {
    throw new OwnedMediaSttError("text_too_large", "STT transcript text is too large.");
  }
  if (usefulTextLength(normalizedText) < MIN_REPAIR_TEXT_CHARS) {
    throw new OwnedMediaSttError("text_too_short", "STT transcript needs more useful text.");
  }

  return {
    normalizedText,
    languageCode: normalizeLanguageCode(transcript.languageCode),
    timestampMode,
    segments,
    model: sanitizeIdentifier(transcript.model),
    requestId: sanitizeIdentifier(transcript.requestId),
    usage: sanitizeUsage(transcript.usage),
  };
}

function validateSegment(input: {
  segment: OwnedMediaSttTranscriptSegment;
  idx: number;
  timestampMode: TranscriptTimestampMode;
  previous: OwnedMediaSttTranscriptSegment | null;
  mediaDurationMs: number | null;
}): ValidatedTranscript["segments"][number] {
  const text = normalizeTranscriptText(input.segment.text);
  if (!text) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment text cannot be empty.");
  }

  const confidence = nullableNumber(input.segment.confidence);
  if (confidence !== null && (confidence < 0 || confidence > 1)) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment confidence must be between 0 and 1.");
  }

  if (input.timestampMode === "paragraph_only") {
    return {
      idx: input.idx,
      startMs: null,
      endMs: null,
      durationMs: null,
      text,
      confidence,
    };
  }

  const startMs = nullableInteger(input.segment.startMs);
  const endMs = nullableInteger(input.segment.endMs);
  const suppliedDurationMs = nullableInteger(input.segment.durationMs);

  if (input.timestampMode === "timestamped" && (startMs === null || endMs === null)) {
    throw new OwnedMediaSttError("invalid_segments", "Timestamped STT segments require start and end times.");
  }
  if (startMs !== null && startMs < 0) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment start time must be non-negative.");
  }
  if (endMs !== null && endMs < 0) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment end time must be non-negative.");
  }
  if (startMs !== null && endMs !== null && endMs < startMs) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment end time cannot be before start time.");
  }
  if (suppliedDurationMs !== null && suppliedDurationMs < 0) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment duration must be non-negative.");
  }
  if (startMs !== null && endMs !== null && suppliedDurationMs !== null) {
    const expected = endMs - startMs;
    if (Math.abs(suppliedDurationMs - expected) > SEGMENT_DURATION_TOLERANCE_MS) {
      throw new OwnedMediaSttError("invalid_segments", "STT segment duration does not match its timestamps.");
    }
  }
  if (
    input.mediaDurationMs !== null &&
    endMs !== null &&
    endMs > input.mediaDurationMs + MEDIA_DURATION_TOLERANCE_MS
  ) {
    throw new OwnedMediaSttError("invalid_segments", "STT segment exceeds owned media duration.");
  }

  return {
    idx: input.idx,
    startMs,
    endMs,
    durationMs: startMs !== null && endMs !== null ? endMs - startMs : suppliedDurationMs,
    text,
    confidence,
  };
}

function validateMonotonicSegments(
  segments: ValidatedTranscript["segments"],
  timestampMode: TranscriptTimestampMode,
): void {
  if (timestampMode === "paragraph_only") return;
  let previousStart: number | null = null;
  for (const segment of segments) {
    if (segment.startMs === null) continue;
    if (previousStart !== null && segment.startMs < previousStart) {
      throw new OwnedMediaSttError("invalid_segments", "STT segment timestamps must be monotonic.");
    }
    previousStart = segment.startMs;
  }
}

function provenanceForOwnedMediaStt(input: {
  allowed: AllowedTranscriptAcquisition;
  media: ValidatedOwnedMediaSttMedia;
  provider: OwnedMediaSttProvider;
  transcript: ValidatedTranscript;
}): Record<string, unknown> {
  return {
    input_type: "owned_media_stt",
    policy_decision_id: input.allowed.policyDecisionId,
    media_filename: input.media.basename,
    media_basename: input.media.basename,
    media_content_type: input.media.contentType,
    media_byte_count: input.media.byteLength,
    media_sha256: input.media.sha256,
    media_duration_ms: input.media.durationMs,
    media_uploaded_id: input.media.uploadedMediaId,
    provider_name: sanitizeIdentifier(input.provider.providerName),
    provider_version: sanitizeIdentifier(input.provider.providerVersion),
    provider_model: input.transcript.model,
    provider_request_id: input.transcript.requestId,
    usage: input.transcript.usage,
    timestamp_mode: input.transcript.timestampMode,
    language_code: input.transcript.languageCode,
    normalized_char_count: input.transcript.normalizedText.length,
    segment_count: input.transcript.segments.length,
    adapter_version: OWNED_MEDIA_STT_ADAPTER_VERSION,
    retention_class: input.allowed.retentionClass,
  };
}

function extensionForFilename(filename: string): string | null {
  const lower = filename.trim().toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : null;
}

function normalizeContentType(contentType: string | null | undefined): string | null {
  const cleaned = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  return cleaned || null;
}

function validMaxBytes(providerMaxBytes: number | null | undefined): number {
  if (
    typeof providerMaxBytes !== "number" ||
    !Number.isSafeInteger(providerMaxBytes) ||
    providerMaxBytes <= 0
  ) {
    return DEFAULT_OWNED_MEDIA_STT_MAX_BYTES;
  }
  return providerMaxBytes;
}

function nullableInteger(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new OwnedMediaSttError("invalid_segments", "STT timestamps must be finite integer milliseconds.");
  }
  return value;
}

function nullableMediaDuration(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new OwnedMediaSttError("invalid_media", "Owned media duration must be finite integer milliseconds.");
  }
  return value;
}

function nullableNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) {
    throw new OwnedMediaSttError("invalid_segments", "STT numeric fields must be finite.");
  }
  return value;
}

function sanitizeBasename(filename: string): string {
  return filename.trim().split(/[\\/]/).filter(Boolean).pop() ?? "";
}

function sanitizeIdentifier(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  if (!cleaned) return null;
  return cleaned
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()!
    .replace(/Bearer\s+\S+/gi, "Bearer <redacted>")
    .replace(/(?:api[_-]?key|token|secret|password)=\S+/gi, "<redacted>")
    .slice(0, 160);
}

function sanitizeUsage(
  usage: OwnedMediaSttTranscript["usage"],
): Record<string, number> | null {
  if (!usage) return null;
  const cleaned: Record<string, number> = {};
  if (Number.isFinite(usage.seconds) && usage.seconds! >= 0) cleaned.seconds = usage.seconds!;
  if (Number.isFinite(usage.inputTokens) && usage.inputTokens! >= 0) {
    cleaned.input_tokens = usage.inputTokens!;
  }
  if (Number.isFinite(usage.outputTokens) && usage.outputTokens! >= 0) {
    cleaned.output_tokens = usage.outputTokens!;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function normalizeLanguageCode(languageCode: string | null | undefined): string | null {
  const cleaned = languageCode?.trim().toLowerCase() ?? "";
  if (!cleaned) return null;
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(cleaned) ? cleaned : null;
}

function normalizeTranscriptText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function usefulTextLength(text: string): number {
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, "")
    .length;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function tokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
