import { createHash } from "node:crypto";

export const SUBTITLE_PREFLIGHT_VERSION = "1.0.0";

export const SUBTITLE_LIMITS = Object.freeze({
  maxBytes: 2_000_000,
  maxCues: 10_000,
  maxDeclaredDurationMs: 6 * 60 * 60 * 1_000,
  maxCueDurationMs: 6 * 60 * 60 * 1_000,
  maxCueTextBytes: 2_000_000,
});

export const A1_SUPPORTED_CLASS_LIMITS = Object.freeze({
  maxInputBytes: 2_000_000,
  maxNormalizedTextCharacters: 500_000,
  maxCues: 7_200,
  maxDurationMs: 21_600_000,
});

export const SUBTITLE_HANDLING_POLICY = Object.freeze({
  overlaps: "preserve",
  exactDuplicates: "preserve",
  sourceOrder: "preserve",
  decreasingStartTime: "reject",
  transforms: "never-sort-merge-deduplicate-or-drop-cues",
});

export type SubtitleFormat = "srt" | "vtt";

export interface SubtitlePreflightOptions {
  format: SubtitleFormat;
  declaredDurationMs: number;
  expectedRawSha256: string;
  expectedCueCount: number;
  inputFileIntegrityAttested: true;
  contentCompleteness: "complete" | "partial" | "unknown";
  contentCompletenessBasis: string;
}

export interface SubtitleCue {
  ordinal: number;
  identifier: string | null;
  sourceTiming: string;
  startMs: number;
  endMs: number;
  text: string;
  settings: string | null;
}

export interface SubtitlePreflightResult {
  version: typeof SUBTITLE_PREFLIGHT_VERSION;
  format: SubtitleFormat;
  rawByteLength: number;
  rawSha256: string;
  normalizedSha256: string;
  declaredDurationMs: number;
  cueCount: number;
  normalizedTextCharacterCount: number;
  overlapCount: number;
  exactDuplicateCount: number;
  inputFileIntegrity: "attested_locked_hash_and_cue_count_verified";
  contentCompletenessDeclaration: {
    state: "complete" | "partial" | "unknown";
    basis: string;
    source: "caller_supplied_not_inferred";
  };
  a1SupportedClass: {
    state: "eligible_supported" | "expected_safe_rejection";
    reasons: readonly string[];
  };
  cues: readonly SubtitleCue[];
}

export type SubtitlePreflightErrorCode =
  | "INVALID_OPTIONS"
  | "INPUT_TOO_LARGE"
  | "INVALID_UTF8"
  | "INVALID_STRUCTURE"
  | "INVALID_TIMESTAMP"
  | "CUE_OUT_OF_BOUNDS"
  | "CUE_TEXT_TOO_LARGE"
  | "TOO_MANY_CUES"
  | "EMPTY_TRANSCRIPT"
  | "NON_MONOTONIC_ORDER"
  | "RAW_HASH_MISMATCH"
  | "CUE_COUNT_MISMATCH";

export class SubtitlePreflightError extends Error {
  readonly code: SubtitlePreflightErrorCode;

  constructor(code: SubtitlePreflightErrorCode, message: string) {
    super(message);
    this.name = "SubtitlePreflightError";
    this.code = code;
  }
}

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SRT_TIMESTAMP = /(\d{2,6}):([0-5]\d):([0-5]\d),(\d{3})/;
const VTT_TIMESTAMP = /(?:(\d{2,6}):)?([0-5]\d):([0-5]\d)\.(\d{3})/;
const PROHIBITED_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function canonicalSubtitleSha256(
  format: SubtitleFormat,
  declaredDurationMs: number,
  cues: readonly SubtitleCue[],
): string {
  const canonical = JSON.stringify({
    format,
    declared_duration_ms: declaredDurationMs,
    cues: cues.map((cue) => ({
      ordinal: cue.ordinal,
      identifier: cue.identifier,
      source_timing: cue.sourceTiming,
      start_ms: cue.startMs,
      end_ms: cue.endMs,
      text: cue.text,
      settings: cue.settings,
    })),
  });
  return sha256Hex(canonical);
}

export function preflightSubtitleBytes(
  input: Uint8Array,
  options: SubtitlePreflightOptions,
): SubtitlePreflightResult {
  validateOptions(options);

  if (!(input instanceof Uint8Array)) {
    throw new SubtitlePreflightError("INVALID_OPTIONS", "input must be a Uint8Array");
  }
  if (input.byteLength === 0) {
    throw new SubtitlePreflightError("EMPTY_TRANSCRIPT", "subtitle input is empty");
  }
  if (input.byteLength > SUBTITLE_LIMITS.maxBytes) {
    throw new SubtitlePreflightError(
      "INPUT_TOO_LARGE",
      `subtitle input exceeds ${SUBTITLE_LIMITS.maxBytes} bytes`,
    );
  }

  const rawSha256 = sha256Hex(input);
  if (rawSha256 !== options.expectedRawSha256) {
    throw new SubtitlePreflightError(
      "RAW_HASH_MISMATCH",
      "subtitle bytes do not match the locked raw SHA-256",
    );
  }

  const decoded = decodeUtf8(input);
  const normalizedNewlines = normalizeNewlines(decoded);
  const cues = options.format === "srt"
    ? parseSrt(normalizedNewlines)
    : parseVtt(normalizedNewlines);

  if (cues.length === 0) {
    throw new SubtitlePreflightError("EMPTY_TRANSCRIPT", "subtitle contains no cues");
  }
  if (cues.length > SUBTITLE_LIMITS.maxCues) {
    throw new SubtitlePreflightError(
      "TOO_MANY_CUES",
      `subtitle exceeds ${SUBTITLE_LIMITS.maxCues} cues`,
    );
  }
  if (cues.length !== options.expectedCueCount) {
    throw new SubtitlePreflightError(
      "CUE_COUNT_MISMATCH",
      `parsed ${cues.length} cues; locked count is ${options.expectedCueCount}`,
    );
  }

  validateCues(cues, options.declaredDurationMs);

  let overlapCount = 0;
  let exactDuplicateCount = 0;
  const seen = new Set<string>();
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const previous = cues[index - 1];
    if (previous && cue.startMs < previous.endMs) overlapCount += 1;
    const key = JSON.stringify([cue.startMs, cue.endMs, cue.text, cue.settings]);
    if (seen.has(key)) exactDuplicateCount += 1;
    seen.add(key);
  }

  const normalizedTextCharacterCount = Array.from(
    cues.map((cue) => cue.text.normalize("NFKC")).join("\n"),
  ).length;
  const classReasons: string[] = [];
  if (input.byteLength > A1_SUPPORTED_CLASS_LIMITS.maxInputBytes) classReasons.push("input_bytes");
  if (normalizedTextCharacterCount > A1_SUPPORTED_CLASS_LIMITS.maxNormalizedTextCharacters) {
    classReasons.push("normalized_text_characters");
  }
  if (cues.length > A1_SUPPORTED_CLASS_LIMITS.maxCues) classReasons.push("cue_count");
  if (options.declaredDurationMs > A1_SUPPORTED_CLASS_LIMITS.maxDurationMs) {
    classReasons.push("duration");
  }

  return Object.freeze({
    version: SUBTITLE_PREFLIGHT_VERSION,
    format: options.format,
    rawByteLength: input.byteLength,
    rawSha256,
    normalizedSha256: canonicalSubtitleSha256(options.format, options.declaredDurationMs, cues),
    declaredDurationMs: options.declaredDurationMs,
    cueCount: cues.length,
    normalizedTextCharacterCount,
    overlapCount,
    exactDuplicateCount,
    inputFileIntegrity: "attested_locked_hash_and_cue_count_verified",
    contentCompletenessDeclaration: Object.freeze({
      state: options.contentCompleteness,
      basis: options.contentCompletenessBasis,
      source: "caller_supplied_not_inferred",
    }),
    a1SupportedClass: Object.freeze({
      state: classReasons.length === 0 ? "eligible_supported" : "expected_safe_rejection",
      reasons: Object.freeze(classReasons),
    }),
    cues: Object.freeze(cues.map((cue) => Object.freeze({ ...cue }))),
  });
}

function validateOptions(options: SubtitlePreflightOptions): void {
  if (!options || (options.format !== "srt" && options.format !== "vtt")) {
    throw new SubtitlePreflightError("INVALID_OPTIONS", "format must be srt or vtt");
  }
  if (
    !Number.isSafeInteger(options.declaredDurationMs)
    || options.declaredDurationMs <= 0
    || options.declaredDurationMs > SUBTITLE_LIMITS.maxDeclaredDurationMs
  ) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      `declaredDurationMs must be a positive safe integer no greater than ${SUBTITLE_LIMITS.maxDeclaredDurationMs}`,
    );
  }
  if (!SHA256_PATTERN.test(options.expectedRawSha256)) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      "expectedRawSha256 must be a lowercase SHA-256 hex digest",
    );
  }
  if (
    !Number.isSafeInteger(options.expectedCueCount)
    || options.expectedCueCount < 1
    || options.expectedCueCount > SUBTITLE_LIMITS.maxCues
  ) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      `expectedCueCount must be between 1 and ${SUBTITLE_LIMITS.maxCues}`,
    );
  }
  if (options.inputFileIntegrityAttested !== true) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      "inputFileIntegrityAttested must be explicitly true",
    );
  }
  if (!(["complete", "partial", "unknown"] as const).includes(options.contentCompleteness)) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      "contentCompleteness must be complete, partial, or unknown",
    );
  }
  if (
    typeof options.contentCompletenessBasis !== "string"
    || options.contentCompletenessBasis.trim().length === 0
    || Buffer.byteLength(options.contentCompletenessBasis, "utf8") > 1_024
    || PROHIBITED_CONTROL.test(options.contentCompletenessBasis)
  ) {
    throw new SubtitlePreflightError(
      "INVALID_OPTIONS",
      "contentCompletenessBasis must be a non-empty safe string of at most 1,024 UTF-8 bytes",
    );
  }
}

function decodeUtf8(input: Uint8Array): string {
  const startsWithUtf8Bom = input.byteLength >= 3
    && input[0] === 0xef
    && input[1] === 0xbb
    && input[2] === 0xbf;
  const bytes = startsWithUtf8Bom ? input.subarray(3) : input;
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (PROHIBITED_CONTROL.test(value)) {
      throw new SubtitlePreflightError(
        "INVALID_UTF8",
        "subtitle contains a prohibited control character",
      );
    }
    return value;
  } catch (error) {
    if (error instanceof SubtitlePreflightError) throw error;
    throw new SubtitlePreflightError(
      "INVALID_UTF8",
      "subtitle is not valid UTF-8; replacement decoding is prohibited",
    );
  }
}

function normalizeNewlines(input: string): string {
  const crlfNormalized = input.replace(/\r\n/g, "\n");
  if (crlfNormalized.includes("\r")) {
    throw new SubtitlePreflightError(
      "INVALID_STRUCTURE",
      "bare carriage returns are not accepted",
    );
  }
  return crlfNormalized;
}

function parseSrt(input: string): SubtitleCue[] {
  const blocks = splitCueBlocks(input);
  assertCueBlockLimit(blocks);
  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    if (lines.length < 3 || !/^\d+$/.test(lines[0])) {
      throw new SubtitlePreflightError(
        "INVALID_STRUCTURE",
        `SRT cue ${blockIndex + 1} must have a numeric index, timing, and text`,
      );
    }
    const sourceIndex = Number(lines[0]);
    if (!Number.isSafeInteger(sourceIndex) || sourceIndex !== blockIndex + 1) {
      throw new SubtitlePreflightError(
        "INVALID_STRUCTURE",
        `SRT cue indices must be exactly 1..N; found ${lines[0]} at cue ${blockIndex + 1}`,
      );
    }
    const timing = parseSrtTiming(lines[1], blockIndex + 1);
    const text = lines.slice(2).join("\n");
    validateCueText(text, blockIndex + 1);
    return {
      ordinal: blockIndex + 1,
      identifier: lines[0],
      sourceTiming: lines[1],
      ...timing,
      text,
      settings: null,
    };
  });
}

function parseVtt(input: string): SubtitleCue[] {
  const firstNewline = input.indexOf("\n");
  if (firstNewline === -1) {
    throw new SubtitlePreflightError(
      "INVALID_STRUCTURE",
      "VTT input must contain a WEBVTT header followed by a blank line",
    );
  }
  const header = input.slice(0, firstNewline);
  if (!/^WEBVTT(?:[ \t]+[^\n]*)?$/.test(header) || header.includes("-->")) {
    throw new SubtitlePreflightError("INVALID_STRUCTURE", "invalid WEBVTT header");
  }
  const remainder = input.slice(firstNewline + 1);
  if (!remainder.startsWith("\n")) {
    throw new SubtitlePreflightError(
      "INVALID_STRUCTURE",
      "VTT metadata blocks are unsupported; WEBVTT must be followed by a blank line",
    );
  }
  const blocks = splitCueBlocks(remainder.slice(1));
  assertCueBlockLimit(blocks);
  return blocks.map((block, blockIndex) => {
    const lines = block.split("\n");
    if (lines[0] === "STYLE" || lines[0] === "REGION" || lines[0].startsWith("NOTE")) {
      throw new SubtitlePreflightError(
        "INVALID_STRUCTURE",
        `unsupported VTT non-cue block at position ${blockIndex + 1}`,
      );
    }

    let identifier: string | null = null;
    let timingLineIndex = 0;
    if (!lines[0].includes("-->")) {
      identifier = lines[0];
      timingLineIndex = 1;
      if (!identifier || identifier.includes("-->")) {
        throw new SubtitlePreflightError(
          "INVALID_STRUCTURE",
          `invalid VTT cue identifier at position ${blockIndex + 1}`,
        );
      }
    }
    if (lines.length < timingLineIndex + 2) {
      throw new SubtitlePreflightError(
        "INVALID_STRUCTURE",
        `VTT cue ${blockIndex + 1} must contain timing and text`,
      );
    }
    const timing = parseVttTiming(lines[timingLineIndex], blockIndex + 1);
    const text = lines.slice(timingLineIndex + 1).join("\n");
    validateCueText(text, blockIndex + 1);
    return {
      ordinal: blockIndex + 1,
      identifier,
      sourceTiming: lines[timingLineIndex],
      startMs: timing.startMs,
      endMs: timing.endMs,
      text,
      settings: timing.settings,
    };
  });
}

function splitCueBlocks(input: string): string[] {
  if (input.length === 0 || input.startsWith("\n")) {
    throw new SubtitlePreflightError("INVALID_STRUCTURE", "subtitle cue body is empty or starts blank");
  }
  const withoutTerminalBlankLines = input.replace(/(?:\n[ \t]*)+$/g, "");
  if (withoutTerminalBlankLines.length === 0) {
    throw new SubtitlePreflightError("EMPTY_TRANSCRIPT", "subtitle contains no cues");
  }
  return withoutTerminalBlankLines.split(/\n[ \t]*\n(?:[ \t]*\n)*/);
}

function assertCueBlockLimit(blocks: readonly string[]): void {
  if (blocks.length > SUBTITLE_LIMITS.maxCues) {
    throw new SubtitlePreflightError(
      "TOO_MANY_CUES",
      `subtitle exceeds ${SUBTITLE_LIMITS.maxCues} cues`,
    );
  }
}

function parseSrtTiming(line: string, cueNumber: number): { startMs: number; endMs: number } {
  const match = line.match(new RegExp(`^${SRT_TIMESTAMP.source}[ \\t]+-->[ \\t]+${SRT_TIMESTAMP.source}$`));
  if (!match) {
    throw new SubtitlePreflightError(
      "INVALID_TIMESTAMP",
      `invalid SRT timing at cue ${cueNumber}`,
    );
  }
  return {
    startMs: timestampPartsToMs(match.slice(1, 5), cueNumber),
    endMs: timestampPartsToMs(match.slice(5, 9), cueNumber),
  };
}

function parseVttTiming(
  line: string,
  cueNumber: number,
): { startMs: number; endMs: number; settings: string | null } {
  const match = line.match(
    new RegExp(`^(${VTT_TIMESTAMP.source})[ \\t]+-->[ \\t]+(${VTT_TIMESTAMP.source})(?:[ \\t]+(.+))?$`),
  );
  if (!match) {
    throw new SubtitlePreflightError(
      "INVALID_TIMESTAMP",
      `invalid VTT timing at cue ${cueNumber}`,
    );
  }

  const start = parseVttTimestamp(match[1], cueNumber);
  const end = parseVttTimestamp(match[6], cueNumber);
  const settings = match[11] ?? null;
  if (settings?.includes("-->")) {
    throw new SubtitlePreflightError(
      "INVALID_TIMESTAMP",
      `invalid VTT cue settings at cue ${cueNumber}`,
    );
  }
  validateVttSettings(settings, cueNumber);
  return { startMs: start, endMs: end, settings };
}

function validateVttSettings(settings: string | null, cueNumber: number): void {
  if (settings === null) return;
  const seen = new Set<string>();
  for (const setting of settings.split(/[ \t]+/)) {
    const separator = setting.indexOf(":");
    if (separator <= 0 || separator === setting.length - 1) {
      throw new SubtitlePreflightError(
        "INVALID_TIMESTAMP",
        `malformed VTT cue setting at cue ${cueNumber}`,
      );
    }
    const key = setting.slice(0, separator);
    const value = setting.slice(separator + 1);
    if (seen.has(key)) {
      throw new SubtitlePreflightError(
        "INVALID_TIMESTAMP",
        `duplicate VTT ${key} setting at cue ${cueNumber}`,
      );
    }
    seen.add(key);

    const valid = key === "vertical"
      ? /^(?:rl|lr)$/.test(value)
      : key === "line"
        ? /^(?:auto|-?\d+(?:\.\d+)?%?)(?:,(?:start|center|end))?$/.test(value)
        : key === "position"
          ? isBoundedPercentageSetting(value, /^(\d+(?:\.\d+)?)%(?:,(?:line-left|center|line-right|auto))?$/)
          : key === "size"
            ? isBoundedPercentageSetting(value, /^(\d+(?:\.\d+)?)%$/)
            : key === "align"
              ? /^(?:start|center|end|left|right)$/.test(value)
              : key === "region"
                ? /^[A-Za-z0-9_-]+$/.test(value)
                : false;
    if (!valid) {
      throw new SubtitlePreflightError(
        "INVALID_TIMESTAMP",
        `unsupported or invalid VTT ${key} setting at cue ${cueNumber}`,
      );
    }
  }
}

function isBoundedPercentageSetting(value: string, pattern: RegExp): boolean {
  const match = value.match(pattern);
  return Boolean(match && Number(match[1]) >= 0 && Number(match[1]) <= 100);
}

function parseVttTimestamp(value: string, cueNumber: number): number {
  const match = value.match(new RegExp(`^${VTT_TIMESTAMP.source}$`));
  if (!match) {
    throw new SubtitlePreflightError(
      "INVALID_TIMESTAMP",
      `invalid VTT timestamp at cue ${cueNumber}`,
    );
  }
  const hours = match[1] ?? "0";
  return timestampPartsToMs([hours, match[2], match[3], match[4]], cueNumber);
}

function timestampPartsToMs(parts: string[], cueNumber: number): number {
  const [hoursText, minutesText, secondsText, millisText] = parts;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);
  const millis = Number(millisText);
  const total = (((hours * 60) + minutes) * 60 + seconds) * 1_000 + millis;
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new SubtitlePreflightError(
      "INVALID_TIMESTAMP",
      `timestamp is not a safe finite integer at cue ${cueNumber}`,
    );
  }
  return total;
}

function validateCueText(text: string, cueNumber: number): void {
  if (text.trim().length === 0) {
    throw new SubtitlePreflightError("INVALID_STRUCTURE", `empty cue text at cue ${cueNumber}`);
  }
  const byteLength = Buffer.byteLength(text, "utf8");
  if (byteLength > SUBTITLE_LIMITS.maxCueTextBytes) {
    throw new SubtitlePreflightError(
      "CUE_TEXT_TOO_LARGE",
      `cue ${cueNumber} exceeds ${SUBTITLE_LIMITS.maxCueTextBytes} text bytes`,
    );
  }
}

function validateCues(cues: SubtitleCue[], declaredDurationMs: number): void {
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    if (
      !Number.isSafeInteger(cue.startMs)
      || !Number.isSafeInteger(cue.endMs)
      || cue.startMs < 0
      || cue.endMs <= cue.startMs
      || cue.endMs > declaredDurationMs
      || cue.endMs - cue.startMs > SUBTITLE_LIMITS.maxCueDurationMs
    ) {
      throw new SubtitlePreflightError(
        "CUE_OUT_OF_BOUNDS",
        `cue ${cue.ordinal} has unsafe, empty, overlong, or out-of-duration timing`,
      );
    }
    const previous = cues[index - 1];
    if (previous && cue.startMs < previous.startMs) {
      throw new SubtitlePreflightError(
        "NON_MONOTONIC_ORDER",
        `cue ${cue.ordinal} starts before the preceding cue; reordering is prohibited`,
      );
    }
  }
}
