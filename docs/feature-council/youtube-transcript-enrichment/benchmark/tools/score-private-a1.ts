import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ANCHOR_GENERATOR_VERSION,
  GeneratedAnchorFile,
  generateTimestampAnchors,
} from "./generate-anchors";
import {
  SUBTITLE_LIMITS,
  SUBTITLE_PREFLIGHT_VERSION,
  SubtitleFormat,
  SubtitlePreflightResult,
  preflightSubtitleBytes,
  sha256Hex,
} from "./subtitle-preflight";
import {
  SCORER_LIMITS,
  TRANSCRIPT_SCORER_VERSION,
  TimestampSegment,
  scoreTimestampAnchors,
  scoreTokenPreservation,
} from "./transcript-scorer";
import { parseJsonWithoutDuplicateKeys } from "./verify-lock";

export const A1_PRIVATE_SCORER_VERSION = "1.1.0";
export const A1_PRIVATE_SCORER_LIMITS = Object.freeze({
  maxOptionsBytes: 64_000,
  maxSubtitleBytes: SUBTITLE_LIMITS.maxBytes,
  maxAnchorPacketBytes: 10_000_000,
  maxNormalizedOutputBytes: 10_000_000,
});

export type A1PrivateScorerErrorCode =
  | "INVALID_OPTIONS"
  | "INVALID_FILE"
  | "HASH_MISMATCH"
  | "PREFLIGHT_FAILED"
  | "INVALID_ANCHOR_PACKET"
  | "INVALID_NORMALIZED_OUTPUT"
  | "CANONICAL_OUTPUT_HASH_MISMATCH"
  | "SCORE_FAILED";

export class A1PrivateScorerError extends Error {
  readonly code: A1PrivateScorerErrorCode;

  constructor(code: A1PrivateScorerErrorCode, message: string) {
    super(message);
    this.name = "A1PrivateScorerError";
    this.code = code;
  }
}

export type HarnessCompletenessBasis =
  | "explicit_source_assertion"
  | "source_coverage_record"
  | "user_attestation";

export interface A1PrivateScorerOptions {
  schema_version: "1.0";
  format: SubtitleFormat;
  declared_duration_ms: number;
  expected_raw_sha256: string;
  expected_cue_count: number;
  input_file_integrity_attested: true;
  content_completeness: "complete" | "partial";
  content_completeness_basis: HarnessCompletenessBasis;
  reference_role: "a1_input_preservation_oracle";
  expected_anchor_packet_sha256: string;
  expected_normalized_transcript_sha256: string;
  comparison_canonical_output_sha256: string | null;
}

export interface A1PrivateScoreSummary {
  schema_version: "1.0";
  evaluator_version: typeof A1_PRIVATE_SCORER_VERSION;
  versions: {
    scorer: typeof TRANSCRIPT_SCORER_VERSION;
    subtitle_preflight: typeof SUBTITLE_PREFLIGHT_VERSION;
    anchor_generator: typeof ANCHOR_GENERATOR_VERSION;
  };
  hashes: {
    input_raw_sha256: string;
    input_canonical_sha256: string;
    anchor_packet_sha256: string;
    normalized_output_file_sha256: string;
    canonical_normalized_output_sha256: string;
    canonical_output_comparison: "not_requested" | "verified_equal";
  };
  preservation: {
    reference_token_count: number;
    output_token_count: number;
    lcs_token_count: number;
    token_preservation_rate: number;
  };
  timestamp_anchors: {
    actual_count: number;
    base_target_count: number;
    matched_count: number;
    unmatched_count: number;
    ambiguous_count: number;
    match_rate: number;
    match_rate_wilson_95: {
      successes: number;
      total: number;
      confidence: 0.95;
      lower: number;
      upper: number;
    };
    median_error_ms: number | null;
    p90_error_ms: number | null;
  };
}

interface PrivateHarnessSegment {
  index: number;
  start_ms: number;
  end_ms: number;
  source_start_ms: number;
  source_end_ms: number;
  text: string;
  source_cue_ids: readonly string[];
  speaker?: string | null;
  confidence?: number | null;
}

interface PrivateHarnessTranscript {
  schema_version: "1.0";
  item_id: string;
  youtube_video_id: string;
  source_method: "A1";
  language: string;
  caption_type:
    | "source_provided_unknown_authorship"
    | "human"
    | "automatic"
    | "translated"
    | "unknown";
  timestamp_mode: "timestamped";
  completeness: {
    state: "complete" | "partial";
    basis: HarnessCompletenessBasis;
    source_duration_ms: number;
    last_cue_end_ms: number;
    trailing_gap_ms: number;
    missing_intervals?: readonly {
      start_ms: number;
      end_ms: number;
      reason: string;
    }[];
  };
  provenance: {
    source_page_url: string;
    source_asset_url: string;
    input_sha256: string;
    reference_role: "input_preservation";
    version_equivalence:
      | "official_row_level_publication_association"
      | "owner_verified_exact";
    acquired_at: string;
  };
  processing_version: string;
  segments: readonly PrivateHarnessSegment[];
  errors: readonly never[];
}

const OPTION_KEYS = [
  "schema_version",
  "format",
  "declared_duration_ms",
  "expected_raw_sha256",
  "expected_cue_count",
  "input_file_integrity_attested",
  "content_completeness",
  "content_completeness_basis",
  "reference_role",
  "expected_anchor_packet_sha256",
  "expected_normalized_transcript_sha256",
  "comparison_canonical_output_sha256",
] as const;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const PROHIBITED_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const OFFSET_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseA1PrivateScorerOptions(text: string): A1PrivateScorerOptions {
  if (
    typeof text !== "string"
    || Buffer.byteLength(text, "utf8") === 0
    || Buffer.byteLength(text, "utf8") > A1_PRIVATE_SCORER_LIMITS.maxOptionsBytes
  ) {
    invalidOptions(
      `options JSON must be from 1 through ${A1_PRIVATE_SCORER_LIMITS.maxOptionsBytes} UTF-8 bytes`,
    );
  }
  let parsed: unknown;
  try {
    parsed = parseJsonWithoutDuplicateKeys(text);
  } catch (error) {
    invalidOptions(
      `options JSON failed strict parsing: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
  return validateOptions(parsed);
}

export function parseA1PrivateScorerOptionsBytes(
  bytes: Uint8Array,
): A1PrivateScorerOptions {
  return parseA1PrivateScorerOptions(decodeOptionsUtf8(bytes));
}

export function evaluatePrivateA1(
  rawSubtitleBytes: Uint8Array,
  anchorPacketBytes: Uint8Array,
  normalizedOutputBytes: Uint8Array,
  suppliedOptions: A1PrivateScorerOptions,
): A1PrivateScoreSummary {
  const options = validateOptions(suppliedOptions);
  requireBoundedBytes(
    rawSubtitleBytes,
    A1_PRIVATE_SCORER_LIMITS.maxSubtitleBytes,
    "raw subtitle",
  );
  requireBoundedBytes(
    anchorPacketBytes,
    A1_PRIVATE_SCORER_LIMITS.maxAnchorPacketBytes,
    "anchor packet",
  );
  requireBoundedBytes(
    normalizedOutputBytes,
    A1_PRIVATE_SCORER_LIMITS.maxNormalizedOutputBytes,
    "normalized output",
  );

  const anchorPacketSha256 = sha256Hex(anchorPacketBytes);
  const normalizedOutputFileSha256 = sha256Hex(normalizedOutputBytes);
  if (sha256Hex(rawSubtitleBytes) !== options.expected_raw_sha256) {
    throw new A1PrivateScorerError("HASH_MISMATCH", "raw subtitle SHA-256 does not match options");
  }
  if (anchorPacketSha256 !== options.expected_anchor_packet_sha256) {
    throw new A1PrivateScorerError("HASH_MISMATCH", "anchor packet SHA-256 does not match options");
  }
  if (normalizedOutputFileSha256 !== options.expected_normalized_transcript_sha256) {
    throw new A1PrivateScorerError(
      "HASH_MISMATCH",
      "normalized transcript SHA-256 does not match options",
    );
  }

  let preflight: SubtitlePreflightResult;
  try {
    preflight = preflightSubtitleBytes(rawSubtitleBytes, {
      format: options.format,
      declaredDurationMs: options.declared_duration_ms,
      expectedRawSha256: options.expected_raw_sha256,
      expectedCueCount: options.expected_cue_count,
      inputFileIntegrityAttested: options.input_file_integrity_attested,
      contentCompleteness: options.content_completeness,
      contentCompletenessBasis: options.content_completeness_basis,
    });
  } catch (error) {
    throw new A1PrivateScorerError(
      "PREFLIGHT_FAILED",
      `strict subtitle preflight failed: ${error instanceof Error ? error.message : "invalid input"}`,
    );
  }
  if (preflight.a1SupportedClass.state !== "eligible_supported") {
    throw new A1PrivateScorerError(
      "PREFLIGHT_FAILED",
      "A1 scoring requires an eligible supported input",
    );
  }

  const packet = parseAndValidateAnchorPacket(anchorPacketBytes, preflight);
  const normalizedOutput = parseAndValidateNormalizedOutput(
    normalizedOutputBytes,
    preflight,
    options,
  );
  const canonicalNormalizedOutputSha256 = sha256Hex(
    `${canonicalJson(normalizedOutput)}\n`,
  );
  if (
    options.comparison_canonical_output_sha256 !== null
    && canonicalNormalizedOutputSha256 !== options.comparison_canonical_output_sha256
  ) {
    throw new A1PrivateScorerError(
      "CANONICAL_OUTPUT_HASH_MISMATCH",
      "canonical normalized-output SHA-256 differs from the comparison run",
    );
  }

  const referenceText = preflight.cues.map((cue) => cue.text).join("\n");
  const outputText = normalizedOutput.segments.map((segment) => segment.text).join("\n");
  const outputSegments: TimestampSegment[] = normalizedOutput.segments.map((segment) => ({
    startMs: segment.start_ms,
    endMs: segment.end_ms,
    text: segment.text,
  }));
  let preservation;
  let timestampAnchors;
  try {
    preservation = scoreTokenPreservation(
      referenceText,
      outputText,
      "a1_input_preservation_oracle",
    );
    timestampAnchors = scoreTimestampAnchors(
      packet.anchors,
      outputSegments,
      options.declared_duration_ms,
      "a1_input_preservation_oracle",
      packet.source_distinct_timed_start_count,
    );
  } catch (error) {
    throw new A1PrivateScorerError(
      "SCORE_FAILED",
      `frozen A1 scoring failed: ${error instanceof Error ? error.message : "invalid scoring input"}`,
    );
  }

  return Object.freeze({
    schema_version: "1.0",
    evaluator_version: A1_PRIVATE_SCORER_VERSION,
    versions: Object.freeze({
      scorer: TRANSCRIPT_SCORER_VERSION,
      subtitle_preflight: SUBTITLE_PREFLIGHT_VERSION,
      anchor_generator: ANCHOR_GENERATOR_VERSION,
    }),
    hashes: Object.freeze({
      input_raw_sha256: preflight.rawSha256,
      input_canonical_sha256: preflight.normalizedSha256,
      anchor_packet_sha256: anchorPacketSha256,
      normalized_output_file_sha256: normalizedOutputFileSha256,
      canonical_normalized_output_sha256: canonicalNormalizedOutputSha256,
      canonical_output_comparison: options.comparison_canonical_output_sha256 === null
        ? "not_requested" as const
        : "verified_equal" as const,
    }),
    preservation: Object.freeze({
      reference_token_count: preservation.referenceTokenCount,
      output_token_count: preservation.candidateTokenCount,
      lcs_token_count: preservation.lcsTokenCount,
      token_preservation_rate: preservation.tokenPreservationRate,
    }),
    timestamp_anchors: Object.freeze({
      actual_count: timestampAnchors.anchorCount,
      base_target_count: timestampAnchors.baseAnchorCount,
      matched_count: timestampAnchors.matchedCount,
      unmatched_count: timestampAnchors.unmatchedCount,
      ambiguous_count: timestampAnchors.ambiguousCount,
      match_rate: timestampAnchors.matchRate,
      match_rate_wilson_95: timestampAnchors.matchRateWilson95,
      median_error_ms: timestampAnchors.medianErrorMs,
      p90_error_ms: timestampAnchors.p90ErrorMs,
    }),
  });
}

export function serializeA1PrivateScore(summary: A1PrivateScoreSummary): string {
  return `${JSON.stringify(summary, null, 2)}\n`;
}

function validateOptions(value: unknown): A1PrivateScorerOptions {
  const record = requireRecord(value, "options", "INVALID_OPTIONS");
  requireExactKeys(record, OPTION_KEYS, [], "options", "INVALID_OPTIONS");
  if (record.schema_version !== "1.0") invalidOptions("schema_version must equal 1.0");
  if (record.format !== "srt" && record.format !== "vtt") invalidOptions("format must be srt or vtt");
  if (
    !Number.isSafeInteger(record.declared_duration_ms)
    || (record.declared_duration_ms as number) <= 0
    || (record.declared_duration_ms as number) > SUBTITLE_LIMITS.maxDeclaredDurationMs
  ) invalidOptions("declared_duration_ms is outside the supported range");
  requireSha256(record.expected_raw_sha256, "expected_raw_sha256", "INVALID_OPTIONS");
  if (
    !Number.isSafeInteger(record.expected_cue_count)
    || (record.expected_cue_count as number) < 1
    || (record.expected_cue_count as number) > SUBTITLE_LIMITS.maxCues
  ) invalidOptions("expected_cue_count is outside the supported range");
  if (record.input_file_integrity_attested !== true) {
    invalidOptions("input_file_integrity_attested must be true");
  }
  if (record.content_completeness !== "complete" && record.content_completeness !== "partial") {
    invalidOptions("content_completeness must be complete or partial for A1 scoring");
  }
  if (!isHarnessCompletenessBasis(record.content_completeness_basis)) {
    invalidOptions("content_completeness_basis is not supported by the private A1 harness");
  }
  if (record.reference_role !== "a1_input_preservation_oracle") {
    invalidOptions("reference_role must be a1_input_preservation_oracle");
  }
  requireSha256(
    record.expected_anchor_packet_sha256,
    "expected_anchor_packet_sha256",
    "INVALID_OPTIONS",
  );
  requireSha256(
    record.expected_normalized_transcript_sha256,
    "expected_normalized_transcript_sha256",
    "INVALID_OPTIONS",
  );
  if (
    record.comparison_canonical_output_sha256 !== null
    && !SHA256_PATTERN.test(record.comparison_canonical_output_sha256 as string)
  ) invalidOptions("comparison_canonical_output_sha256 must be null or lowercase SHA-256 hex");
  return Object.freeze(record as unknown as A1PrivateScorerOptions);
}

function parseAndValidateAnchorPacket(
  bytes: Uint8Array,
  preflight: SubtitlePreflightResult,
): GeneratedAnchorFile {
  const parsed = parseStrictUtf8Json(bytes, "anchor packet", "INVALID_ANCHOR_PACKET");
  const root = requireRecord(parsed, "anchor packet", "INVALID_ANCHOR_PACKET");
  requireExactKeys(
    root,
    ["private_anchor_packet", "publication_safe_summary"],
    [],
    "anchor packet",
    "INVALID_ANCHOR_PACKET",
  );
  requireRecord(
    root.publication_safe_summary,
    "anchor publication summary",
    "INVALID_ANCHOR_PACKET",
  );
  const suppliedPacket = requireRecord(
    root.private_anchor_packet,
    "private anchor packet",
    "INVALID_ANCHOR_PACKET",
  );
  let expectedPacket: GeneratedAnchorFile;
  try {
    expectedPacket = generateTimestampAnchors(preflight, {
      durationMs: preflight.declaredDurationMs,
      referenceRole: "a1_input_preservation_oracle",
    });
  } catch (error) {
    throw new A1PrivateScorerError(
      "INVALID_ANCHOR_PACKET",
      `could not regenerate the sealed A1 anchors: ${error instanceof Error ? error.message : "invalid reference"}`,
    );
  }
  if (canonicalJson(suppliedPacket) !== canonicalJson(expectedPacket)) {
    throw new A1PrivateScorerError(
      "INVALID_ANCHOR_PACKET",
      "private anchor packet does not match deterministic regeneration from the locked source",
    );
  }
  return root.private_anchor_packet as GeneratedAnchorFile;
}

function parseAndValidateNormalizedOutput(
  bytes: Uint8Array,
  preflight: SubtitlePreflightResult,
  options: A1PrivateScorerOptions,
): PrivateHarnessTranscript {
  const parsed = parseStrictUtf8Json(bytes, "normalized output", "INVALID_NORMALIZED_OUTPUT");
  const root = requireRecord(parsed, "normalized output", "INVALID_NORMALIZED_OUTPUT");
  requireExactKeys(
    root,
    [
      "schema_version",
      "item_id",
      "youtube_video_id",
      "source_method",
      "language",
      "caption_type",
      "timestamp_mode",
      "completeness",
      "provenance",
      "processing_version",
      "segments",
      "errors",
    ],
    [],
    "normalized output",
    "INVALID_NORMALIZED_OUTPUT",
  );
  if (
    root.schema_version !== "1.0"
    || typeof root.item_id !== "string"
    || !/^YT-[0-9]{2}$/.test(root.item_id)
    || typeof root.youtube_video_id !== "string"
    || !/^[A-Za-z0-9_-]{11}$/.test(root.youtube_video_id)
    || root.source_method !== "A1"
    || typeof root.language !== "string"
    || !LANGUAGE_PATTERN.test(root.language)
    || !(
      [
        "source_provided_unknown_authorship",
        "human",
        "automatic",
        "translated",
        "unknown",
      ] as const
    ).includes(root.caption_type as PrivateHarnessTranscript["caption_type"])
    || root.timestamp_mode !== "timestamped"
    || !isSafeNonemptyString(root.processing_version, 1_024)
  ) invalidOutput("normalized output metadata does not satisfy the frozen harness schema");

  const completeness = requireRecord(
    root.completeness,
    "normalized output completeness",
    "INVALID_NORMALIZED_OUTPUT",
  );
  requireExactKeys(
    completeness,
    ["state", "basis", "source_duration_ms", "last_cue_end_ms", "trailing_gap_ms"],
    ["missing_intervals"],
    "normalized output completeness",
    "INVALID_NORMALIZED_OUTPUT",
  );
  const lastCueEndMs = preflight.cues.at(-1)?.endMs;
  if (
    completeness.state !== options.content_completeness
    || completeness.basis !== options.content_completeness_basis
    || completeness.source_duration_ms !== options.declared_duration_ms
    || completeness.last_cue_end_ms !== lastCueEndMs
    || completeness.trailing_gap_ms !== options.declared_duration_ms - (lastCueEndMs ?? 0)
  ) invalidOutput("normalized output completeness does not match the locked source options");
  if (completeness.missing_intervals !== undefined) {
    validateMissingIntervals(completeness.missing_intervals, options.declared_duration_ms);
  }

  const provenance = requireRecord(
    root.provenance,
    "normalized output provenance",
    "INVALID_NORMALIZED_OUTPUT",
  );
  requireExactKeys(
    provenance,
    [
      "source_page_url",
      "source_asset_url",
      "input_sha256",
      "reference_role",
      "version_equivalence",
      "acquired_at",
    ],
    [],
    "normalized output provenance",
    "INVALID_NORMALIZED_OUTPUT",
  );
  if (
    !isHttpsUrl(provenance.source_page_url)
    || !isHttpsUrl(provenance.source_asset_url)
    || provenance.input_sha256 !== preflight.rawSha256
    || provenance.reference_role !== "input_preservation"
    || !(
      ["official_row_level_publication_association", "owner_verified_exact"] as const
    ).includes(
      provenance.version_equivalence as PrivateHarnessTranscript["provenance"]["version_equivalence"],
    )
    || typeof provenance.acquired_at !== "string"
    || !OFFSET_DATETIME_PATTERN.test(provenance.acquired_at)
    || Number.isNaN(Date.parse(provenance.acquired_at))
  ) invalidOutput("normalized output provenance does not satisfy the frozen harness schema");

  if (!Array.isArray(root.errors) || root.errors.length !== 0) {
    invalidOutput("A1 scoring requires a successful normalized output with no errors");
  }
  const segments = validateOutputSegments(root.segments, preflight);
  return {
    ...(root as unknown as Omit<PrivateHarnessTranscript, "segments" | "errors">),
    segments,
    errors: [],
  };
}

function validateOutputSegments(
  value: unknown,
  preflight: SubtitlePreflightResult,
): readonly PrivateHarnessSegment[] {
  if (
    !Array.isArray(value)
    || value.length !== preflight.cues.length
    || value.length > SCORER_LIMITS.maxSegments
  ) {
    invalidOutput("normalized output must contain exactly one segment per canonical source cue");
  }
  const durationMs = preflight.declaredDurationMs;
  let priorStart = -1;
  let priorSourceStart = -1;
  return Object.freeze(value.map((candidate, arrayIndex): PrivateHarnessSegment => {
    const segment = requireRecord(
      candidate,
      "normalized output segment",
      "INVALID_NORMALIZED_OUTPUT",
    );
    requireExactKeys(
      segment,
      [
        "index",
        "start_ms",
        "end_ms",
        "source_start_ms",
        "source_end_ms",
        "text",
        "source_cue_ids",
      ],
      ["speaker", "confidence"],
      "normalized output segment",
      "INVALID_NORMALIZED_OUTPUT",
    );
    if (
      segment.index !== arrayIndex
      || !Number.isSafeInteger(segment.start_ms)
      || !Number.isSafeInteger(segment.end_ms)
      || !Number.isSafeInteger(segment.source_start_ms)
      || !Number.isSafeInteger(segment.source_end_ms)
      || (segment.start_ms as number) < 0
      || (segment.end_ms as number) <= (segment.start_ms as number)
      || (segment.end_ms as number) > durationMs
      || (segment.start_ms as number) < priorStart
      || (segment.source_start_ms as number) < 0
      || (segment.source_end_ms as number) <= (segment.source_start_ms as number)
      || (segment.source_end_ms as number) > durationMs
      || (segment.source_start_ms as number) < priorSourceStart
      || !isSafeNonemptyString(segment.text, SCORER_LIMITS.maxTextBytes)
    ) invalidOutput("normalized output segment index, timing, or text is invalid");
    if (segment.speaker !== undefined && segment.speaker !== null && !isSafeNonemptyString(segment.speaker, 1_024)) {
      invalidOutput("normalized output segment speaker is invalid");
    }
    if (
      segment.confidence !== undefined
      && segment.confidence !== null
      && (
        typeof segment.confidence !== "number"
        || !Number.isFinite(segment.confidence)
        || segment.confidence < 0
        || segment.confidence > 1
      )
    ) invalidOutput("normalized output segment confidence is invalid");
    if (
      !Array.isArray(segment.source_cue_ids)
      || segment.source_cue_ids.length === 0
      || segment.source_cue_ids.length > 100
      || segment.source_cue_ids.some((identifier) => !isSafeNonemptyString(identifier, 1_024))
      || new Set(segment.source_cue_ids).size !== segment.source_cue_ids.length
    ) invalidOutput("normalized output segment source cue IDs are invalid");

    const canonicalCue = preflight.cues[arrayIndex];
    const canonicalCueId = canonicalCue.identifier ?? `cue-${canonicalCue.ordinal}`;
    if (
      segment.source_cue_ids.length !== 1
      || segment.source_cue_ids[0] !== canonicalCueId
      || segment.source_start_ms !== canonicalCue.startMs
      || segment.source_end_ms !== canonicalCue.endMs
    ) {
      invalidOutput("normalized output segment provenance does not match its canonical source cue");
    }
    if (
      segment.source_start_ms !== segment.start_ms
      || segment.source_end_ms !== segment.end_ms
    ) {
      invalidOutput("A1 input-preservation timing must exactly preserve source timing");
    }
    priorStart = segment.start_ms as number;
    priorSourceStart = segment.source_start_ms as number;
    return segment as unknown as PrivateHarnessSegment;
  }));
}

function validateMissingIntervals(value: unknown, durationMs: number): void {
  if (!Array.isArray(value) || value.length > SCORER_LIMITS.maxSegments) {
    invalidOutput("normalized output missing intervals are invalid");
  }
  for (const candidate of value) {
    const interval = requireRecord(
      candidate,
      "normalized output missing interval",
      "INVALID_NORMALIZED_OUTPUT",
    );
    requireExactKeys(
      interval,
      ["start_ms", "end_ms", "reason"],
      [],
      "normalized output missing interval",
      "INVALID_NORMALIZED_OUTPUT",
    );
    if (
      !Number.isSafeInteger(interval.start_ms)
      || !Number.isSafeInteger(interval.end_ms)
      || (interval.start_ms as number) < 0
      || (interval.end_ms as number) <= (interval.start_ms as number)
      || (interval.end_ms as number) > durationMs
      || !isSafeNonemptyString(interval.reason, 1_024)
    ) invalidOutput("normalized output missing interval is invalid");
  }
}

function parseStrictUtf8Json(
  bytes: Uint8Array,
  label: string,
  code: A1PrivateScorerErrorCode,
): unknown {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new A1PrivateScorerError(code, `${label} is not valid UTF-8`);
  }
  try {
    return parseJsonWithoutDuplicateKeys(text);
  } catch (error) {
    throw new A1PrivateScorerError(
      code,
      `${label} failed strict JSON parsing: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`
    )).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) {
    throw new A1PrivateScorerError(
      "INVALID_NORMALIZED_OUTPUT",
      "normalized output contains a value unsupported by canonical JSON",
    );
  }
  return encoded;
}

function requireRecord(
  value: unknown,
  label: string,
  code: A1PrivateScorerErrorCode,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new A1PrivateScorerError(code, `${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  label: string,
  code: A1PrivateScorerErrorCode,
): void {
  const allowed = new Set([...required, ...optional]);
  const actual = Object.keys(record);
  if (
    required.some((key) => !Object.prototype.hasOwnProperty.call(record, key))
    || actual.some((key) => !allowed.has(key))
  ) throw new A1PrivateScorerError(code, `${label} has missing or additional properties`);
}

function requireSha256(
  value: unknown,
  label: string,
  code: A1PrivateScorerErrorCode,
): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new A1PrivateScorerError(code, `${label} must be lowercase SHA-256 hex`);
  }
}

function requireBoundedBytes(value: unknown, maximum: number, label: string): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength === 0 || value.byteLength > maximum) {
    throw new A1PrivateScorerError(
      "INVALID_FILE",
      `${label} must contain 1 through ${maximum} bytes`,
    );
  }
}

function isHarnessCompletenessBasis(value: unknown): value is HarnessCompletenessBasis {
  return value === "explicit_source_assertion"
    || value === "source_coverage_record"
    || value === "user_attestation";
}

function isSafeNonemptyString(value: unknown, maximumBytes: number): value is string {
  return typeof value === "string"
    && value.length > 0
    && Buffer.byteLength(value, "utf8") <= maximumBytes
    && !PROHIBITED_CONTROL.test(value);
}

function isHttpsUrl(value: unknown): value is string {
  if (!isSafeNonemptyString(value, 4_096)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function invalidOptions(message: string): never {
  throw new A1PrivateScorerError("INVALID_OPTIONS", message);
}

function invalidOutput(message: string): never {
  throw new A1PrivateScorerError("INVALID_NORMALIZED_OUTPUT", message);
}

function readBoundedRegularFile(path: string, maximumBytes: number, label: string): Buffer {
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(path);
  } catch {
    throw new A1PrivateScorerError("INVALID_FILE", `${label} cannot be read`);
  }
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || !Number.isSafeInteger(stat.size)
    || stat.size <= 0
    || stat.size > maximumBytes
  ) {
    throw new A1PrivateScorerError(
      "INVALID_FILE",
      `${label} must be a bounded non-empty regular non-symlink file`,
    );
  }
  const bytes = readFileSync(path);
  if (bytes.length !== stat.size || bytes.length > maximumBytes) {
    throw new A1PrivateScorerError("INVALID_FILE", `${label} changed while being read`);
  }
  return bytes;
}

function parseCliArguments(args: readonly string[]): {
  optionsPath: string;
  subtitlePath: string;
  anchorPacketPath: string;
  normalizedOutputPath: string;
} {
  const values = new Map<string, string>();
  const allowed = new Set(["--options", "--subtitle", "--anchors", "--normalized-output"]);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag || !allowed.has(flag) || values.has(flag) || !value) {
      throw new A1PrivateScorerError("INVALID_OPTIONS", "CLI arguments are missing, unknown, or duplicated");
    }
    values.set(flag, value);
  }
  if (values.size !== allowed.size) {
    throw new A1PrivateScorerError(
      "INVALID_OPTIONS",
      "exactly --options, --subtitle, --anchors, and --normalized-output paths are required",
    );
  }
  return {
    optionsPath: values.get("--options")!,
    subtitlePath: values.get("--subtitle")!,
    anchorPacketPath: values.get("--anchors")!,
    normalizedOutputPath: values.get("--normalized-output")!,
  };
}

function decodeOptionsUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new A1PrivateScorerError("INVALID_OPTIONS", "options file is not valid UTF-8");
  }
}

function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    const paths = parseCliArguments(process.argv.slice(2));
    const options = parseA1PrivateScorerOptions(decodeOptionsUtf8(readBoundedRegularFile(
      paths.optionsPath,
      A1_PRIVATE_SCORER_LIMITS.maxOptionsBytes,
      "options file",
    )));
    const summary = evaluatePrivateA1(
      readBoundedRegularFile(
        paths.subtitlePath,
        A1_PRIVATE_SCORER_LIMITS.maxSubtitleBytes,
        "raw subtitle file",
      ),
      readBoundedRegularFile(
        paths.anchorPacketPath,
        A1_PRIVATE_SCORER_LIMITS.maxAnchorPacketBytes,
        "private anchor packet file",
      ),
      readBoundedRegularFile(
        paths.normalizedOutputPath,
        A1_PRIVATE_SCORER_LIMITS.maxNormalizedOutputBytes,
        "private normalized output file",
      ),
      options,
    );
    process.stdout.write(serializeA1PrivateScore(summary));
  } catch (error) {
    const code = error instanceof A1PrivateScorerError ? error.code : "INVALID_FILE";
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
    process.exitCode = 1;
  }
}
