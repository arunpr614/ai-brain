import crypto from "node:crypto";
import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import {
  deleteTranscriptSegmentsForItem,
  insertTranscriptSegments,
  insertTranscriptSource,
  supersedeTranscriptSourcesForItem,
  type TranscriptSegmentRow,
  type TranscriptSourceRow,
} from "@/db/transcripts";
import {
  allowUploadedTranscriptFileForItem,
  allowUserProvidedTranscriptForItem,
  isYoutubeItem,
  type AllowedTranscriptAcquisition,
} from "@/lib/capture/policy";
import {
  parseTranscriptFile,
  TRANSCRIPT_FILE_PARSER_VERSION,
  TranscriptFileParseError,
} from "@/lib/capture/transcripts/parse-file";
import {
  MIN_REPAIR_TEXT_CHARS,
  RepairItemError,
  repairItemWithText,
  type RepairItemWithTextResult,
} from "@/lib/repair/item-repair";

export const MAX_PASTED_TRANSCRIPT_CHARS = 500_000;

export type UserProvidedTranscriptErrorCode =
  | "not_found"
  | "not_youtube_item"
  | "text_too_short"
  | "text_too_large"
  | "unsupported_transcript_file"
  | "transcript_file_too_large"
  | "too_many_segments"
  | "malformed_transcript_file"
  | "policy_blocked"
  | "invalid_title";

export class UserProvidedTranscriptError extends Error {
  constructor(
    readonly code: UserProvidedTranscriptErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "UserProvidedTranscriptError";
  }
}

export interface AttachUserProvidedTranscriptInput {
  itemId: string;
  text: string;
  title?: string | null;
  languageCode?: string | null;
}

export interface AttachUserProvidedTranscriptResult {
  repair: RepairItemWithTextResult;
  policyDecisionId: string;
  transcriptSource: TranscriptSourceRow;
}

export interface AttachUploadedTranscriptFileInput {
  itemId: string;
  filename: string;
  contentType?: string | null;
  bytes: Uint8Array;
  title?: string | null;
  languageCode?: string | null;
}

export interface AttachUploadedTranscriptFileResult {
  repair: RepairItemWithTextResult;
  policyDecisionId: string;
  transcriptSource: TranscriptSourceRow;
  transcriptSegments: TranscriptSegmentRow[];
}

export function attachUserProvidedTranscriptToYoutubeItem(
  input: AttachUserProvidedTranscriptInput,
): AttachUserProvidedTranscriptResult {
  const existing = getItem(input.itemId);
  if (!existing) {
    throw new UserProvidedTranscriptError("not_found", "Item not found.");
  }
  if (!isYoutubeItem(existing)) {
    throw new UserProvidedTranscriptError(
      "not_youtube_item",
      "Transcripts can only be attached to YouTube items in this flow.",
    );
  }

  const normalizedText = normalizePastedTranscriptText(input.text);
  if (normalizedText.length > MAX_PASTED_TRANSCRIPT_CHARS) {
    throw new UserProvidedTranscriptError(
      "text_too_large",
      `Paste at most ${MAX_PASTED_TRANSCRIPT_CHARS.toLocaleString("en-US")} characters.`,
    );
  }
  if (usefulTextLength(normalizedText) < MIN_REPAIR_TEXT_CHARS) {
    throw new UserProvidedTranscriptError(
      "text_too_short",
      `Paste at least ${MIN_REPAIR_TEXT_CHARS} useful characters so this can replace weak captured text.`,
    );
  }

  const tx = getDb().transaction((): AttachUserProvidedTranscriptResult => {
    const policy = allowUserProvidedTranscriptForItem(existing);
    if (policy.status === "blocked") {
      throw new UserProvidedTranscriptError("policy_blocked", policy.blockedReason);
    }

    let repair: RepairItemWithTextResult;
    try {
      repair = repairItemWithText({
        itemId: input.itemId,
        title: input.title,
        text: normalizedText,
        textKind: "transcript",
      });
    } catch (err) {
      if (err instanceof RepairItemError) {
        throw new UserProvidedTranscriptError(err.code, err.message);
      }
      throw err;
    }

    supersedeTranscriptSourcesForItem(repair.item.id);
    deleteTranscriptSegmentsForItem(repair.item.id);
    const transcriptSource = insertTranscriptSource({
      item_id: repair.item.id,
      policy_decision_id: policy.allowed.policyDecisionId,
      source_kind: "user_paste",
      language_code: normalizeLanguageCode(input.languageCode),
      caption_source_class: "user_provided",
      timestamp_mode: "paragraph_only",
      provenance_json: JSON.stringify(provenanceForPaste(policy.allowed, normalizedText)),
      retention_class: policy.allowed.retentionClass,
      text_sha256: sha256(normalizedText),
      segment_count: 0,
      status: "active",
    });

    return {
      repair,
      policyDecisionId: policy.allowed.policyDecisionId,
      transcriptSource,
    };
  });

  return tx();
}

export function attachUploadedTranscriptFileToYoutubeItem(
  input: AttachUploadedTranscriptFileInput,
): AttachUploadedTranscriptFileResult {
  const existing = getItem(input.itemId);
  if (!existing) {
    throw new UserProvidedTranscriptError("not_found", "Item not found.");
  }
  if (!isYoutubeItem(existing)) {
    throw new UserProvidedTranscriptError(
      "not_youtube_item",
      "Transcript files can only be attached to YouTube items in this flow.",
    );
  }

  let parsed;
  try {
    parsed = parseTranscriptFile({
      filename: input.filename,
      contentType: input.contentType,
      bytes: input.bytes,
    });
  } catch (err) {
    if (err instanceof TranscriptFileParseError) {
      throw new UserProvidedTranscriptError(err.code, err.message);
    }
    throw err;
  }

  const tx = getDb().transaction((): AttachUploadedTranscriptFileResult => {
    const policy = allowUploadedTranscriptFileForItem(existing);
    if (policy.status === "blocked") {
      throw new UserProvidedTranscriptError("policy_blocked", policy.blockedReason);
    }

    let repair: RepairItemWithTextResult;
    try {
      repair = repairItemWithText({
        itemId: input.itemId,
        title: input.title,
        text: parsed.normalizedText,
        textKind: "transcript",
      });
    } catch (err) {
      if (err instanceof RepairItemError) {
        throw new UserProvidedTranscriptError(err.code, err.message);
      }
      throw err;
    }

    supersedeTranscriptSourcesForItem(repair.item.id);
    deleteTranscriptSegmentsForItem(repair.item.id);
    const transcriptSource = insertTranscriptSource({
      item_id: repair.item.id,
      policy_decision_id: policy.allowed.policyDecisionId,
      source_kind: "uploaded_file",
      language_code: normalizeLanguageCode(input.languageCode),
      caption_source_class: "user_provided",
      timestamp_mode: parsed.timestampMode,
      provenance_json: JSON.stringify(provenanceForFile(policy.allowed, parsed, input.bytes)),
      retention_class: policy.allowed.retentionClass,
      text_sha256: sha256(parsed.normalizedText),
      segment_count: parsed.segments.length,
      status: "active",
    });

    const transcriptSegments = insertTranscriptSegments(
      parsed.segments.map((segment) => ({
        transcript_source_id: transcriptSource.id,
        item_id: repair.item.id,
        idx: segment.idx,
        start_ms: segment.startMs,
        duration_ms: segment.durationMs,
        end_ms: segment.endMs,
        text: segment.text,
        text_sha256: sha256(segment.text),
        token_count: tokenCount(segment.text),
      })),
    );

    return {
      repair,
      policyDecisionId: policy.allowed.policyDecisionId,
      transcriptSource,
      transcriptSegments,
    };
  });

  return tx();
}

export function normalizePastedTranscriptText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
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

function normalizeLanguageCode(languageCode: string | null | undefined): string | null {
  const cleaned = languageCode?.trim().toLowerCase() ?? "";
  if (!cleaned) return null;
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(cleaned) ? cleaned : null;
}

function provenanceForPaste(
  allowed: AllowedTranscriptAcquisition,
  normalizedText: string,
): Record<string, unknown> {
  return {
    input_type: "paste",
    policy_decision_id: allowed.policyDecisionId,
    timestamp_mode: "paragraph_only",
    normalized_char_count: normalizedText.length,
    retention_class: allowed.retentionClass,
  };
}

function provenanceForFile(
  allowed: AllowedTranscriptAcquisition,
  parsed: ReturnType<typeof parseTranscriptFile>,
  bytes: Uint8Array,
): Record<string, unknown> {
  return {
    input_type: "file",
    policy_decision_id: allowed.policyDecisionId,
    original_filename: parsed.originalFilename,
    extension: parsed.extension,
    content_type: parsed.contentType,
    byte_count: bytes.byteLength,
    parser_version: TRANSCRIPT_FILE_PARSER_VERSION,
    timestamp_mode: parsed.timestampMode,
    normalized_char_count: parsed.normalizedText.length,
    segment_count: parsed.segments.length,
    retention_class: allowed.retentionClass,
  };
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function tokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
