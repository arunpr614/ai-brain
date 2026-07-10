import crypto from "node:crypto";
import type { ItemRow } from "@/db/client";
import { logError } from "@/lib/errors/sink";
import {
  attachOwnedMediaSttToYoutubeItem,
  DEFAULT_OWNED_MEDIA_STT_MAX_BYTES,
  OwnedMediaSttError,
  validateOwnedMediaSttMedia,
  type AttachOwnedMediaSttResult,
  type OwnedMediaSttMedia,
  type OwnedMediaSttProvider,
} from "./owned-media-stt";
import { type TranscriptPolicyResult } from "@/lib/capture/policy";

export type OwnedMediaUploadErrorCode =
  | "missing_item_id"
  | "missing_media_file"
  | "missing_rights_attestation"
  | "invalid_rights_attestation"
  | "invalid_duration"
  | "invalid_expected_sha256"
  | "sha256_mismatch"
  | "invalid_media"
  | "provider_failed"
  | "provider_disabled";

export class OwnedMediaUploadError extends Error {
  constructor(
    readonly code: OwnedMediaUploadErrorCode,
    message: string,
    readonly details: { status: number; expected?: string; actual?: string } = { status: 400 },
  ) {
    super(message);
    this.name = "OwnedMediaUploadError";
  }
}

export interface PrepareOwnedMediaUploadInput {
  itemId: string;
  filename: string;
  contentType?: string | null;
  bytes: Uint8Array;
  rightsAttestation?: string | null;
  title?: string | null;
  languageCode?: string | null;
  durationMs?: number | null;
  expectedSha256?: string | null;
  maxBytes?: number;
}

export interface PreparedOwnedMediaUpload {
  itemId: string;
  title: string | null;
  languageCode: string | null;
  media: OwnedMediaSttMedia;
  logFields: OwnedMediaUploadLogFields;
}

export interface OwnedMediaUploadLogFields {
  item_id: string;
  media_extension: string | null;
  media_sha_prefix: string;
  media_byte_count: number;
  media_content_type: string | null;
  media_duration_ms: number | null;
}

export type OwnedMediaUploadLogger = (entry: Record<string, unknown>) => void;

export interface TranscribeOwnedMediaUploadInput extends PrepareOwnedMediaUploadInput {
  provider: OwnedMediaSttProvider;
  logger?: OwnedMediaUploadLogger;
  policyDecider?: (item: ItemRow) => TranscriptPolicyResult;
}

export interface TranscribeOwnedMediaUploadResult {
  repairItemId: string;
  policyDecisionId: string;
  transcriptSourceId: string;
  segmentCount: number;
  timestampMode: string;
  result: AttachOwnedMediaSttResult;
}

export function prepareOwnedMediaUpload(
  input: PrepareOwnedMediaUploadInput,
): PreparedOwnedMediaUpload {
  const itemId = input.itemId.trim();
  if (!itemId) {
    throw new OwnedMediaUploadError("missing_item_id", "Item id is required.");
  }
  if (!input.filename.trim() || input.bytes.byteLength === 0) {
    throw new OwnedMediaUploadError("missing_media_file", "Choose an owned media file first.");
  }
  const rightsAttestation = input.rightsAttestation?.trim() ?? "";
  if (!rightsAttestation) {
    throw new OwnedMediaUploadError(
      "missing_rights_attestation",
      "Confirm that this is owned or authorized media.",
    );
  }
  if (rightsAttestation !== "owned_uploaded_media") {
    throw new OwnedMediaUploadError(
      "invalid_rights_attestation",
      "Owned-media STT requires owned media attestation.",
      { status: 422 },
    );
  }

  const expected = normalizeExpectedSha(input.expectedSha256);
  const actual = sha256Bytes(input.bytes);
  if (expected && expected !== actual) {
    throw new OwnedMediaUploadError(
      "sha256_mismatch",
      "Owned media upload was corrupted in transit.",
      { status: 422, expected, actual },
    );
  }

  const durationMs = normalizeDurationMs(input.durationMs);
  const media: OwnedMediaSttMedia = {
    filename: input.filename,
    contentType: input.contentType,
    byteLength: input.bytes.byteLength,
    durationMs,
    sha256: actual,
    rightsAttestation: "owned_uploaded_media",
  };

  try {
    validateOwnedMediaSttMedia(media, input.maxBytes ?? DEFAULT_OWNED_MEDIA_STT_MAX_BYTES);
  } catch (err) {
    if (err instanceof OwnedMediaSttError) {
      throw new OwnedMediaUploadError("invalid_media", err.message, { status: 400 });
    }
    throw err;
  }

  return {
    itemId,
    title: normalizeOptionalString(input.title),
    languageCode: normalizeOptionalString(input.languageCode),
    media,
    logFields: {
      item_id: itemId,
      media_extension: extensionForFilename(input.filename),
      media_sha_prefix: actual.slice(0, 12),
      media_byte_count: input.bytes.byteLength,
      media_content_type: normalizeContentType(input.contentType),
      media_duration_ms: durationMs,
    },
  };
}

export async function transcribeOwnedMediaUploadForYoutubeItem(
  input: TranscribeOwnedMediaUploadInput,
): Promise<TranscribeOwnedMediaUploadResult> {
  const logger = input.logger ?? logError;
  const prepared = prepareOwnedMediaUpload(input);
  const startedAt = Date.now();

  try {
    const result = await attachOwnedMediaSttToYoutubeItem({
      itemId: prepared.itemId,
      title: prepared.title,
      languageCode: prepared.languageCode,
      media: prepared.media,
      provider: input.provider,
      policyDecider: input.policyDecider,
    });
    logger({
      type: "capture.transcript.owned_media.saved",
      ...prepared.logFields,
      provider: input.provider.providerName,
      transcript_source_id: result.transcriptSource.id,
      segment_count: result.transcriptSource.segment_count,
      elapsed_ms: Date.now() - startedAt,
      ts: Date.now(),
    });
    return {
      repairItemId: result.repair.item.id,
      policyDecisionId: result.policyDecisionId,
      transcriptSourceId: result.transcriptSource.id,
      segmentCount: result.transcriptSource.segment_count,
      timestampMode: result.transcriptSource.timestamp_mode,
      result,
    };
  } catch (err) {
    if (err instanceof OwnedMediaSttError && err.code === "provider_failed") {
      logger({
        type: "capture.transcript.owned_media.provider_failed",
        ...prepared.logFields,
        provider: input.provider.providerName,
        elapsed_ms: Date.now() - startedAt,
        ts: Date.now(),
      });
      throw new OwnedMediaUploadError(
        "provider_failed",
        "Owned-media STT provider failed.",
        { status: 502 },
      );
    }
    throw err;
  }
}

export function logOwnedMediaUploadEvent(
  type: string,
  fields: Partial<OwnedMediaUploadLogFields> & Record<string, unknown>,
  logger: OwnedMediaUploadLogger = logError,
): void {
  logger({ type, ...fields, ts: Date.now() });
}

function normalizeDurationMs(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new OwnedMediaUploadError(
      "invalid_duration",
      "Media duration must be a non-negative integer in milliseconds.",
    );
  }
  return value;
}

function normalizeExpectedSha(value: string | null | undefined): string | null {
  const cleaned = value?.trim().toLowerCase() ?? "";
  if (!cleaned) return null;
  if (!/^[0-9a-f]{64}$/.test(cleaned)) {
    throw new OwnedMediaUploadError(
      "invalid_expected_sha256",
      "Expected SHA-256 must be a 64-character hex digest.",
    );
  }
  return cleaned;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const cleaned = value?.trim() ?? "";
  return cleaned || null;
}

function normalizeContentType(value: string | null | undefined): string | null {
  const cleaned = value?.split(";")[0]?.trim().toLowerCase() ?? "";
  return cleaned || null;
}

function extensionForFilename(filename: string): string | null {
  const basename = filename.trim().split(/[\\/]/).filter(Boolean).pop() ?? "";
  const dot = basename.lastIndexOf(".");
  const extension = dot >= 0 ? basename.slice(dot).toLowerCase() : "";
  return /^[.][a-z0-9]{1,10}$/.test(extension) ? extension : null;
}

function sha256Bytes(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
