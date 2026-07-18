import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  SubtitleCue,
  SubtitlePreflightResult,
  canonicalSubtitleSha256,
} from "./subtitle-preflight";
import {
  NORMALIZATION_PROFILE,
  SCORER_LIMITS,
  TimestampAnchor,
  TimestampReferenceRole,
  normalizeTranscript,
  requiredTimestampAnchorCount,
  scoreTimestampAnchors,
} from "./transcript-scorer";
import { parseJsonBytesWithoutDuplicateKeys } from "./verify-lock";

export const ANCHOR_GENERATOR_VERSION = "1.1.0";
export const ANCHOR_SELECTION_POLICY = Object.freeze({
  targets: "midpoint-of-equal-duration-bins",
  requiredCount: "min(max(10,ceil(duration_ms/300000)),distinct-nonempty-reference-starts)",
  nearestTieBreak: "source-order",
  maxExpansionCues: 8,
  match: "exactly-one-contiguous-normalized-token-occurrence",
  ordering: "strictly-increasing-reference-start",
});

export type AnchorGeneratorErrorCode =
  | "INVALID_INPUT"
  | "LIMIT_EXCEEDED"
  | "UNIQUE_DISTRIBUTED_ANCHORS_UNAVAILABLE";

export interface AnchorGeneratorInput {
  preflight: SubtitlePreflightResult;
  durationMs: number;
  referenceRole: TimestampReferenceRole;
}

export function parseAnchorGeneratorInputBytes(bytes: Uint8Array): AnchorGeneratorInput {
  return parseJsonBytesWithoutDuplicateKeys(bytes) as AnchorGeneratorInput;
}

export class AnchorGeneratorError extends Error {
  readonly code: AnchorGeneratorErrorCode;

  constructor(code: AnchorGeneratorErrorCode, message: string) {
    super(message);
    this.name = "AnchorGeneratorError";
    this.code = code;
  }
}

export interface AnchorGeneratorOptions {
  durationMs: number;
  referenceRole: TimestampReferenceRole;
}

export interface GeneratedTimestampAnchor extends TimestampAnchor {
  targetMs: number;
  sourceCueOrdinals: readonly number[];
}

export interface GeneratedAnchorFile {
  schema_version: "1.1";
  generator_version: typeof ANCHOR_GENERATOR_VERSION;
  normalization_profile: typeof NORMALIZATION_PROFILE;
  reference_role: TimestampReferenceRole;
  duration_ms: number;
  source_raw_sha256: string;
  source_normalized_sha256: string;
  source_distinct_timed_start_count: number;
  source_content_completeness: SubtitlePreflightResult["contentCompletenessDeclaration"];
  selection_policy: typeof ANCHOR_SELECTION_POLICY;
  anchor_count: number;
  anchors: readonly GeneratedTimestampAnchor[];
}

interface CandidateAnchor {
  referenceStartMs: number;
  utterance: string;
  sourceCueOrdinals: number[];
  occurrenceStart: number;
}

export function generateTimestampAnchors(
  preflight: SubtitlePreflightResult,
  options: AnchorGeneratorOptions,
): GeneratedAnchorFile {
  validateGeneratorInput(preflight, options);

  const cueTokens = preflight.cues.map((cue) => normalizeTranscript(cue.text).tokens);
  const cueTokenStarts: number[] = [];
  const flattenedReference: string[] = [];
  for (const tokens of cueTokens) {
    cueTokenStarts.push(flattenedReference.length);
    flattenedReference.push(...tokens);
    if (flattenedReference.length > SCORER_LIMITS.maxTokensPerInput) {
      throw new AnchorGeneratorError(
        "LIMIT_EXCEEDED",
        `reference exceeds ${SCORER_LIMITS.maxTokensPerInput} normalized tokens`,
      );
    }
  }
  if (flattenedReference.length === 0) {
    throw new AnchorGeneratorError("INVALID_INPUT", "reference cues normalize to no tokens");
  }

  const sourceDistinctTimedStartCount = new Set(
    preflight.cues
      .filter((_, index) => cueTokens[index].length > 0)
      .map((cue) => cue.startMs),
  ).size;
  let requiredCount: number;
  try {
    requiredCount = requiredTimestampAnchorCount(
      options.durationMs,
      sourceDistinctTimedStartCount,
    );
  } catch (error) {
    throw new AnchorGeneratorError(
      "UNIQUE_DISTRIBUTED_ANCHORS_UNAVAILABLE",
      `reference must provide at least three distinct nonempty timed starts: ${error instanceof Error ? error.message : "invalid reference"}`,
    );
  }
  const targets = Array.from(
    { length: requiredCount },
    (_, index) => Math.floor((((2 * index) + 1) * options.durationMs) / (2 * requiredCount)),
  );
  const selected: GeneratedTimestampAnchor[] = [];
  const selectedUtterances = new Set<string>();
  const selectedOccurrences = new Set<number>();
  let priorReferenceStart = -1;
  let searchComparisons = 0;

  for (let anchorIndex = 0; anchorIndex < requiredCount; anchorIndex += 1) {
    const targetMs = targets[anchorIndex];
    const remainingAfterThis = requiredCount - anchorIndex - 1;
    const candidateIndexes = preflight.cues
      .map((_, index) => index)
      .filter((index) => cueTokens[index].length > 0 && preflight.cues[index].startMs > priorReferenceStart)
      .sort((left, right) => {
        const distanceDifference = Math.abs(preflight.cues[left].startMs - targetMs)
          - Math.abs(preflight.cues[right].startMs - targetMs);
        return distanceDifference || left - right;
      });

    let chosen: CandidateAnchor | null = null;
    for (const cueIndex of candidateIndexes) {
      const candidate = createCandidateForCue(
        preflight.cues,
        cueTokens,
        cueTokenStarts,
        flattenedReference,
        cueIndex,
        (needleLength) => {
          const nextComparisons = searchComparisons + (flattenedReference.length * needleLength);
          if (!Number.isSafeInteger(nextComparisons)) {
            throw new AnchorGeneratorError("LIMIT_EXCEEDED", "anchor search size is not a safe integer");
          }
          searchComparisons = nextComparisons;
          if (searchComparisons > SCORER_LIMITS.maxDynamicProgrammingCells) {
            throw new AnchorGeneratorError(
              "LIMIT_EXCEEDED",
              `anchor search exceeds ${SCORER_LIMITS.maxDynamicProgrammingCells} token-window comparisons`,
            );
          }
        },
      );
      if (
        !candidate
        || candidate.referenceStartMs <= priorReferenceStart
        || selectedUtterances.has(candidate.utterance)
        || selectedOccurrences.has(candidate.occurrenceStart)
      ) continue;

      const laterDistinctStarts = new Set(
        preflight.cues
          .filter((cue, index) => (
            cueTokens[index].length > 0 && cue.startMs > candidate.referenceStartMs
          ))
          .map((cue) => cue.startMs),
      ).size;
      if (laterDistinctStarts < remainingAfterThis) continue;
      chosen = candidate;
      break;
    }

    if (!chosen) {
      throw new AnchorGeneratorError(
        "UNIQUE_DISTRIBUTED_ANCHORS_UNAVAILABLE",
        `could not form unique anchor ${anchorIndex + 1} of ${requiredCount}`,
      );
    }

    const id = `ANCHOR-${String(anchorIndex + 1).padStart(Math.max(2, String(requiredCount).length), "0")}`;
    selected.push(Object.freeze({
      id,
      targetMs,
      referenceStartMs: chosen.referenceStartMs,
      utterance: chosen.utterance,
      sourceCueOrdinals: Object.freeze(chosen.sourceCueOrdinals),
    }));
    selectedUtterances.add(chosen.utterance);
    selectedOccurrences.add(chosen.occurrenceStart);
    priorReferenceStart = chosen.referenceStartMs;
  }

  try {
    const verification = scoreTimestampAnchors(
      selected,
      preflight.cues,
      options.durationMs,
      options.referenceRole,
      sourceDistinctTimedStartCount,
    );
    if (verification.matchedCount !== requiredCount || verification.ambiguousCount !== 0) {
      throw new Error("generated anchors did not verify uniquely");
    }
  } catch (error) {
    if (error instanceof AnchorGeneratorError) throw error;
    throw new AnchorGeneratorError(
      "UNIQUE_DISTRIBUTED_ANCHORS_UNAVAILABLE",
      `generated anchor set failed deterministic scorer validation: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  return Object.freeze({
    schema_version: "1.1",
    generator_version: ANCHOR_GENERATOR_VERSION,
    normalization_profile: NORMALIZATION_PROFILE,
    reference_role: options.referenceRole,
    duration_ms: options.durationMs,
    source_raw_sha256: preflight.rawSha256,
    source_normalized_sha256: preflight.normalizedSha256,
    source_distinct_timed_start_count: sourceDistinctTimedStartCount,
    source_content_completeness: preflight.contentCompletenessDeclaration,
    selection_policy: ANCHOR_SELECTION_POLICY,
    anchor_count: selected.length,
    anchors: Object.freeze(selected),
  });
}

export function serializeGeneratedAnchors(result: GeneratedAnchorFile): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

function createCandidateForCue(
  cues: readonly SubtitleCue[],
  cueTokens: readonly (readonly string[])[],
  cueTokenStarts: readonly number[],
  flattenedReference: readonly string[],
  cueIndex: number,
  recordSearch: (needleLength: number) => void,
): CandidateAnchor | null {
  const maximumWidth = Math.min(ANCHOR_SELECTION_POLICY.maxExpansionCues, cues.length);
  for (let width = 1; width <= maximumWidth; width += 1) {
    const firstWindowStart = Math.max(0, cueIndex - width + 1);
    const lastWindowStart = Math.min(cueIndex, cues.length - width);
    for (let windowStart = firstWindowStart; windowStart <= lastWindowStart; windowStart += 1) {
      const nonemptyIndexes = Array.from(
        { length: width },
        (_, offset) => windowStart + offset,
      ).filter((index) => cueTokens[index].length > 0);
      if (nonemptyIndexes.length === 0) continue;
      const firstNonempty = nonemptyIndexes[0];
      const windowTokens = nonemptyIndexes.flatMap((index) => [...cueTokens[index]]);
      recordSearch(windowTokens.length);
      const occurrences = findContiguousMatches(flattenedReference, windowTokens);
      const occurrenceStart = cueTokenStarts[firstNonempty];
      if (occurrences.length !== 1 || occurrences[0] !== occurrenceStart) continue;
      return {
        referenceStartMs: cues[firstNonempty].startMs,
        utterance: windowTokens.join(" "),
        sourceCueOrdinals: nonemptyIndexes.map((index) => cues[index].ordinal),
        occurrenceStart,
      };
    }
  }
  return null;
}

function findContiguousMatches(haystack: readonly string[], needle: readonly string[]): number[] {
  if (needle.length === 0 || needle.length > haystack.length) return [];
  const matches: number[] = [];
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let equal = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        equal = false;
        break;
      }
    }
    if (equal) matches.push(start);
  }
  return matches;
}

function validateGeneratorInput(
  preflight: SubtitlePreflightResult,
  options: AnchorGeneratorOptions,
): void {
  if (
    !preflight
    || preflight.inputFileIntegrity !== "attested_locked_hash_and_cue_count_verified"
    || !Array.isArray(preflight.cues)
    || preflight.cues.length === 0
    || preflight.cueCount !== preflight.cues.length
  ) {
    throw new AnchorGeneratorError(
      "INVALID_INPUT",
      "a successful locked-file-integrity subtitle preflight is required",
    );
  }
  if (
    !/^[0-9a-f]{64}$/.test(preflight.rawSha256)
    || !Number.isSafeInteger(preflight.rawByteLength)
    || preflight.rawByteLength <= 0
    || preflight.rawByteLength > 2_000_000
    || canonicalSubtitleSha256(
      preflight.format,
      preflight.declaredDurationMs,
      preflight.cues,
    ) !== preflight.normalizedSha256
  ) {
    throw new AnchorGeneratorError(
      "INVALID_INPUT",
      "preflight cue data does not match its canonical source hash",
    );
  }
  const completeness = preflight.contentCompletenessDeclaration;
  if (
    !completeness
    || !(["complete", "partial", "unknown"] as const).includes(completeness.state)
    || typeof completeness.basis !== "string"
    || completeness.basis.trim().length === 0
    || completeness.source !== "caller_supplied_not_inferred"
  ) {
    throw new AnchorGeneratorError(
      "INVALID_INPUT",
      "preflight must retain an explicit caller-supplied content-completeness state and basis",
    );
  }
  if (!options || options.durationMs !== preflight.declaredDurationMs) {
    throw new AnchorGeneratorError(
      "INVALID_INPUT",
      "durationMs must exactly match the preflight declared duration",
    );
  }
  if (
    options.referenceRole !== "a1_input_preservation_oracle"
    && options.referenceRole !== "a3_independent_speech_reference"
  ) {
    throw new AnchorGeneratorError("INVALID_INPUT", "a valid reference role is required");
  }
  if (
    options.referenceRole === "a1_input_preservation_oracle"
    && (
      completeness.state === "unknown"
      || preflight.a1SupportedClass?.state !== "eligible_supported"
      || preflight.rawByteLength > 2_000_000
      || !Number.isSafeInteger(preflight.normalizedTextCharacterCount)
      || preflight.normalizedTextCharacterCount > 500_000
      || preflight.cues.length > 7_200
      || preflight.declaredDurationMs > 21_600_000
    )
  ) {
    throw new AnchorGeneratorError(
      "INVALID_INPUT",
      "A1 anchors cannot be generated for an expected-safe-rejection input class",
    );
  }
}

function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    if (!process.argv[2]) throw new Error("input JSON path is required");
    const inputStat = lstatSync(process.argv[2]);
    const inputBytes = inputStat.size;
    if (
      !inputStat.isFile()
      || inputStat.isSymbolicLink()
      || !Number.isSafeInteger(inputBytes)
      || inputBytes <= 0
      || inputBytes > 10_000_000
    ) {
      throw new Error("input JSON must be a non-empty regular file no larger than 10,000,000 bytes");
    }
    const input = parseAnchorGeneratorInputBytes(readFileSync(process.argv[2]));
    const result = generateTimestampAnchors(input.preflight, {
      durationMs: input.durationMs,
      referenceRole: input.referenceRole,
    });
    process.stdout.write(serializeGeneratedAnchors(result));
  } catch (error) {
    const code = error instanceof AnchorGeneratorError ? error.code : "INVALID_INPUT";
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
    process.exitCode = 1;
  }
}
