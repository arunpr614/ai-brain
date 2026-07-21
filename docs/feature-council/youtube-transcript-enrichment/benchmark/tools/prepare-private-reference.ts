import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GeneratedAnchorFile,
  generateTimestampAnchors,
} from "./generate-anchors";
import {
  SUBTITLE_LIMITS,
  SubtitleFormat,
  preflightSubtitleBytes,
} from "./subtitle-preflight";
import {
  SCORER_LIMITS,
  TranscriptScorerError,
  TimestampReferenceRole,
  normalizeTranscript,
} from "./transcript-scorer";
import { parseJsonWithoutDuplicateKeys } from "./verify-lock";

export const PRIVATE_PREPARATION_VERSION = "1.2.0";
export const PRIVATE_PREPARATION_LIMITS = Object.freeze({
  maxOptionsBytes: 64_000,
  maxSubtitleBytes: SUBTITLE_LIMITS.maxBytes,
});

export type PrivatePreparationErrorCode =
  | "INVALID_OPTIONS"
  | "INVALID_FILE"
  | "LIMIT_EXCEEDED"
  | "PREFLIGHT_FAILED"
  | "CLASSIFICATION_MISMATCH"
  | "ANCHOR_GENERATION_FAILED";

export class PrivatePreparationError extends Error {
  readonly code: PrivatePreparationErrorCode;

  constructor(code: PrivatePreparationErrorCode, message: string) {
    super(message);
    this.name = "PrivatePreparationError";
    this.code = code;
  }
}

export interface PrivatePreparationOptions {
  schema_version: "1.2";
  format: SubtitleFormat;
  declared_duration_ms: number;
  expected_raw_sha256: string;
  expected_cue_count: number;
  input_file_integrity_attested: true;
  content_completeness: "complete" | "partial" | "unknown";
  content_completeness_basis: string;
  reference_role: TimestampReferenceRole;
  expected_class: "eligible_supported" | "expected_safe_rejection";
}

export interface PublicationSafePreparationSummary {
  schema_version: "1.2";
  preparation_version: typeof PRIVATE_PREPARATION_VERSION;
  format: SubtitleFormat;
  duration_ms: number;
  reference_role: TimestampReferenceRole;
  raw_byte_count: number;
  normalized_text_character_count: number;
  normalized_token_count: number | null;
  normalized_token_count_state: "counted" | "not_scored_above_eligible_cap";
  cue_count: number;
  raw_sha256: string;
  canonical_sha256: string;
  input_file_integrity: "attested_locked_hash_and_cue_count_verified";
  content_completeness_state: "complete" | "partial" | "unknown";
  a1_supported_class_state: "eligible_supported" | "expected_safe_rejection";
  a1_supported_class_reasons: readonly string[];
  expected_class: "eligible_supported" | "expected_safe_rejection";
  observed_preparation_class: "eligible_supported" | "expected_safe_rejection";
  source_distinct_timed_start_count: number;
  anchor_count: number;
}

export interface PrivatePreparationOutput {
  private_anchor_packet: GeneratedAnchorFile | null;
  publication_safe_summary: PublicationSafePreparationSummary;
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
  "expected_class",
] as const;

export function parsePrivatePreparationOptions(text: string): PrivatePreparationOptions {
  if (
    typeof text !== "string"
    || Buffer.byteLength(text, "utf8") === 0
    || Buffer.byteLength(text, "utf8") > PRIVATE_PREPARATION_LIMITS.maxOptionsBytes
  ) {
    throw new PrivatePreparationError(
      "INVALID_OPTIONS",
      `options JSON must be from 1 through ${PRIVATE_PREPARATION_LIMITS.maxOptionsBytes} UTF-8 bytes`,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseJsonWithoutDuplicateKeys(text);
  } catch (error) {
    throw new PrivatePreparationError(
      "INVALID_OPTIONS",
      `options JSON failed strict parsing: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PrivatePreparationError("INVALID_OPTIONS", "options JSON must be an object");
  }
  const record = parsed as Record<string, unknown>;
  const actualKeys = Object.keys(record).sort();
  const expectedKeys = [...OPTION_KEYS].sort();
  if (
    actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new PrivatePreparationError(
      "INVALID_OPTIONS",
      "options JSON has missing or additional properties",
    );
  }
  if (record.schema_version !== "1.2") invalidOptions("schema_version must equal 1.2");
  if (record.format !== "srt" && record.format !== "vtt") invalidOptions("format must be srt or vtt");
  if (!Number.isSafeInteger(record.declared_duration_ms)) {
    invalidOptions("declared_duration_ms must be a safe integer");
  }
  if (typeof record.expected_raw_sha256 !== "string") {
    invalidOptions("expected_raw_sha256 must be a string");
  }
  if (!Number.isSafeInteger(record.expected_cue_count)) {
    invalidOptions("expected_cue_count must be a safe integer");
  }
  if (record.input_file_integrity_attested !== true) {
    invalidOptions("input_file_integrity_attested must be true");
  }
  if (!(["complete", "partial", "unknown"] as const).includes(
    record.content_completeness as "complete" | "partial" | "unknown",
  )) {
    invalidOptions("content_completeness must be complete, partial, or unknown");
  }
  if (typeof record.content_completeness_basis !== "string") {
    invalidOptions("content_completeness_basis must be a string");
  }
  if (
    record.reference_role !== "a1_input_preservation_oracle"
    && record.reference_role !== "a3_independent_speech_reference"
  ) {
    invalidOptions("reference_role is invalid");
  }
  if (
    record.expected_class !== "eligible_supported"
    && record.expected_class !== "expected_safe_rejection"
  ) {
    invalidOptions("expected_class must be eligible_supported or expected_safe_rejection");
  }
  return Object.freeze(record as unknown as PrivatePreparationOptions);
}

export function preparePrivateReference(
  rawSubtitleBytes: Uint8Array,
  options: PrivatePreparationOptions,
): PrivatePreparationOutput {
  if (!(rawSubtitleBytes instanceof Uint8Array)) {
    throw new PrivatePreparationError("INVALID_FILE", "subtitle input must be raw bytes");
  }

  let preflight;
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
    throw new PrivatePreparationError(
      "PREFLIGHT_FAILED",
      `strict subtitle preflight failed: ${error instanceof Error ? error.message : "invalid input"}`,
    );
  }

  const observedPreparationClass = (
    preflight.a1SupportedClass.state === "expected_safe_rejection"
    || preflight.contentCompletenessDeclaration.state === "unknown"
  ) ? "expected_safe_rejection" : "eligible_supported";
  if (observedPreparationClass !== options.expected_class) {
    throw new PrivatePreparationError(
      "CLASSIFICATION_MISMATCH",
      `observed preparation class ${observedPreparationClass} does not match expected_class`,
    );
  }

  let normalizedTokenCount: number | null = 0;
  const distinctNonemptyTimedStarts = new Set<number>();
  for (const cue of preflight.cues) {
    let cueTokenCount: number;
    try {
      const normalizedTokens = normalizeTranscript(cue.text).tokens;
      cueTokenCount = normalizedTokens.length;
      if (normalizedTokens.length > 0) distinctNonemptyTimedStarts.add(cue.startMs);
    } catch (error) {
      if (error instanceof TranscriptScorerError && error.code === "LIMIT_EXCEEDED") {
        if (options.expected_class === "expected_safe_rejection") {
          normalizedTokenCount = null;
          distinctNonemptyTimedStarts.add(cue.startMs);
          continue;
        }
        throw new PrivatePreparationError("LIMIT_EXCEEDED", error.message);
      }
      throw new PrivatePreparationError(
        "PREFLIGHT_FAILED",
        `subtitle cue normalization failed: ${error instanceof Error ? error.message : "invalid cue text"}`,
      );
    }
    if (normalizedTokenCount !== null) {
      const nextTokenCount: number = normalizedTokenCount + cueTokenCount;
      if (nextTokenCount > SCORER_LIMITS.maxTokensPerInput) {
        if (options.expected_class === "expected_safe_rejection") {
          normalizedTokenCount = null;
        } else {
          throw new PrivatePreparationError(
            "LIMIT_EXCEEDED",
            `normalized reference exceeds ${SCORER_LIMITS.maxTokensPerInput} tokens`,
          );
        }
      } else {
        normalizedTokenCount = nextTokenCount;
      }
    }
  }

  let privateAnchorPacket: GeneratedAnchorFile | null = null;
  if (options.expected_class === "eligible_supported") {
    try {
      privateAnchorPacket = generateTimestampAnchors(preflight, {
        durationMs: options.declared_duration_ms,
        referenceRole: options.reference_role,
      });
    } catch (error) {
      throw new PrivatePreparationError(
        "ANCHOR_GENERATION_FAILED",
        `deterministic anchor generation failed: ${error instanceof Error ? error.message : "invalid reference"}`,
      );
    }
  }

  const publicationSafeSummary = Object.freeze({
    schema_version: "1.2" as const,
    preparation_version: PRIVATE_PREPARATION_VERSION,
    format: preflight.format,
    duration_ms: preflight.declaredDurationMs,
    reference_role: options.reference_role,
    raw_byte_count: preflight.rawByteLength,
    normalized_text_character_count: preflight.normalizedTextCharacterCount,
    normalized_token_count: normalizedTokenCount,
    normalized_token_count_state: normalizedTokenCount === null
      ? "not_scored_above_eligible_cap" as const
      : "counted" as const,
    cue_count: preflight.cueCount,
    raw_sha256: preflight.rawSha256,
    canonical_sha256: preflight.normalizedSha256,
    input_file_integrity: preflight.inputFileIntegrity,
    content_completeness_state: preflight.contentCompletenessDeclaration.state,
    a1_supported_class_state: preflight.a1SupportedClass.state,
    a1_supported_class_reasons: Object.freeze([...preflight.a1SupportedClass.reasons]),
    expected_class: options.expected_class,
    observed_preparation_class: observedPreparationClass,
    source_distinct_timed_start_count: distinctNonemptyTimedStarts.size,
    anchor_count: privateAnchorPacket?.anchor_count ?? 0,
  });

  return Object.freeze({
    private_anchor_packet: privateAnchorPacket,
    publication_safe_summary: publicationSafeSummary,
  });
}

export function serializePrivatePreparation(output: PrivatePreparationOutput): string {
  return `${JSON.stringify(output, null, 2)}\n`;
}

function invalidOptions(message: string): never {
  throw new PrivatePreparationError("INVALID_OPTIONS", message);
}

function readBoundedRegularFile(path: string, maximumBytes: number, label: string): Buffer {
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(path);
  } catch {
    throw new PrivatePreparationError("INVALID_FILE", `${label} cannot be read`);
  }
  if (
    !stat.isFile()
    || stat.isSymbolicLink()
    || !Number.isSafeInteger(stat.size)
    || stat.size <= 0
    || stat.size > maximumBytes
  ) {
    throw new PrivatePreparationError(
      "INVALID_FILE",
      `${label} must be a non-empty regular non-symlink file no larger than ${maximumBytes} bytes`,
    );
  }
  const bytes = readFileSync(path);
  if (bytes.length !== stat.size || bytes.length > maximumBytes) {
    throw new PrivatePreparationError("INVALID_FILE", `${label} changed while being read`);
  }
  return bytes;
}

function decodeOptionsUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PrivatePreparationError("INVALID_OPTIONS", "options file is not valid UTF-8");
  }
}

function parseCliArguments(args: readonly string[]): { optionsPath: string; subtitlePath: string } {
  let optionsPath: string | null = null;
  let subtitlePath: string | null = null;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value) throw new PrivatePreparationError("INVALID_OPTIONS", `missing value for ${flag ?? "argument"}`);
    if (flag === "--options" && optionsPath === null) optionsPath = value;
    else if (flag === "--subtitle" && subtitlePath === null) subtitlePath = value;
    else throw new PrivatePreparationError("INVALID_OPTIONS", `unknown or duplicate argument ${flag}`);
  }
  if (!optionsPath || !subtitlePath) {
    throw new PrivatePreparationError(
      "INVALID_OPTIONS",
      "exactly --options <json> and --subtitle <srt-or-vtt> are required",
    );
  }
  return { optionsPath, subtitlePath };
}

function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    const paths = parseCliArguments(process.argv.slice(2));
    const optionsBytes = readBoundedRegularFile(
      paths.optionsPath,
      PRIVATE_PREPARATION_LIMITS.maxOptionsBytes,
      "options file",
    );
    const subtitleBytes = readBoundedRegularFile(
      paths.subtitlePath,
      PRIVATE_PREPARATION_LIMITS.maxSubtitleBytes,
      "subtitle file",
    );
    const options = parsePrivatePreparationOptions(decodeOptionsUtf8(optionsBytes));
    process.stdout.write(serializePrivatePreparation(preparePrivateReference(subtitleBytes, options)));
  } catch (error) {
    const code = error instanceof PrivatePreparationError ? error.code : "INVALID_FILE";
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
    process.exitCode = 1;
  }
}
