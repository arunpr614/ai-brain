export const TRANSCRIPT_SCORER_VERSION = "1.1.0";
export const NORMALIZATION_PROFILE = "unicode-whitespace-v1";

export const SCORER_LIMITS = Object.freeze({
  maxTextBytes: 2_000_000,
  maxTokensPerInput: 50_000,
  maxDynamicProgrammingCells: 25_000_000,
  maxDurationMs: 6 * 60 * 60 * 1_000,
  maxSegments: 10_000,
  maxAnchors: 1_000,
});

export type TranscriptScorerErrorCode =
  | "INVALID_INPUT"
  | "EMPTY_REFERENCE"
  | "LIMIT_EXCEEDED"
  | "INVALID_TIMING"
  | "INVALID_ANCHORS";

export class TranscriptScorerError extends Error {
  readonly code: TranscriptScorerErrorCode;

  constructor(code: TranscriptScorerErrorCode, message: string) {
    super(message);
    this.name = "TranscriptScorerError";
    this.code = code;
  }
}

export interface NormalizedTranscript {
  profile: typeof NORMALIZATION_PROFILE;
  text: string;
  tokens: readonly string[];
}

export interface PreservationScore {
  scorerVersion: typeof TRANSCRIPT_SCORER_VERSION;
  referenceRole: TimestampReferenceRole;
  referenceTokenCount: number;
  candidateTokenCount: number;
  commonPrefixTokenCount: number;
  commonSuffixTokenCount: number;
  comparedReferenceMiddleTokenCount: number;
  comparedCandidateMiddleTokenCount: number;
  lcsTokenCount: number;
  tokenPreservationRate: number;
}

export interface WerScore {
  scorerVersion: typeof TRANSCRIPT_SCORER_VERSION;
  referenceRole: "a3_independent_speech_reference";
  referenceWordCount: number;
  hypothesisWordCount: number;
  substitutions: number;
  deletions: number;
  insertions: number;
  errors: number;
  wer: number;
}

export interface TimestampAnchor {
  id: string;
  referenceStartMs: number;
  utterance: string;
}

export interface TimestampSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface AnchorResult {
  id: string;
  status: "matched" | "not_found" | "ambiguous";
  referenceStartMs: number;
  outputSegmentStartMs: number | null;
  absoluteErrorMs: number | null;
}

export interface WilsonInterval {
  successes: number;
  total: number;
  confidence: 0.95;
  lower: number;
  upper: number;
}

export interface TimestampAnchorScore {
  scorerVersion: typeof TRANSCRIPT_SCORER_VERSION;
  referenceRole: TimestampReferenceRole;
  baseAnchorCount: number;
  sealedDistinctNonemptyReferenceStartCount: number;
  requiredAnchorCount: number;
  anchorCount: number;
  matchedCount: number;
  unmatchedCount: number;
  ambiguousCount: number;
  matchRate: number;
  matchRateWilson95: WilsonInterval;
  medianErrorMs: number | null;
  p90ErrorMs: number | null;
  results: readonly AnchorResult[];
}

interface EditCounts {
  cost: number;
  substitutions: number;
  deletions: number;
  insertions: number;
}

export type TimestampReferenceRole =
  | "a1_input_preservation_oracle"
  | "a3_independent_speech_reference";

const APOSTROPHE_BETWEEN_WORD_CHARACTERS = /([\p{L}\p{M}\p{N}])['\u2018\u2019\u02bc]([\p{L}\p{M}\p{N}])/gu;
const UNICODE_PUNCTUATION = /\p{P}+/gu;
const CONTROL_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

export function normalizeTranscript(text: string): NormalizedTranscript {
  validateText(text, "transcript");

  let normalized = text.normalize("NFKC").toLowerCase();
  let prior: string;
  do {
    prior = normalized;
    normalized = normalized.replace(APOSTROPHE_BETWEEN_WORD_CHARACTERS, "$1$2");
  } while (normalized !== prior);
  normalized = normalized
    .replace(UNICODE_PUNCTUATION, " ")
    .replace(/\s+/gu, " ")
    .trim();

  const tokens = normalized.length === 0 ? [] : normalized.split(" ");
  if (tokens.length > SCORER_LIMITS.maxTokensPerInput) {
    throw new TranscriptScorerError(
      "LIMIT_EXCEEDED",
      `normalized transcript exceeds ${SCORER_LIMITS.maxTokensPerInput} tokens`,
    );
  }

  return Object.freeze({
    profile: NORMALIZATION_PROFILE,
    text: normalized,
    tokens: Object.freeze(tokens),
  });
}

export function scoreTokenPreservation(
  referenceText: string,
  candidateText: string,
  referenceRole: TimestampReferenceRole,
): PreservationScore {
  validateReferenceRole(referenceRole);
  const reference = normalizeTranscript(referenceText).tokens;
  const candidate = normalizeTranscript(candidateText).tokens;
  if (reference.length === 0) {
    throw new TranscriptScorerError("EMPTY_REFERENCE", "reference transcript has no tokens");
  }
  let commonPrefixTokenCount = 0;
  const sharedLength = Math.min(reference.length, candidate.length);
  while (
    commonPrefixTokenCount < sharedLength
    && reference[commonPrefixTokenCount] === candidate[commonPrefixTokenCount]
  ) commonPrefixTokenCount += 1;

  let commonSuffixTokenCount = 0;
  while (
    commonSuffixTokenCount < sharedLength - commonPrefixTokenCount
    && reference[reference.length - commonSuffixTokenCount - 1]
      === candidate[candidate.length - commonSuffixTokenCount - 1]
  ) commonSuffixTokenCount += 1;

  const referenceMiddle = reference.slice(
    commonPrefixTokenCount,
    reference.length - commonSuffixTokenCount,
  );
  const candidateMiddle = candidate.slice(
    commonPrefixTokenCount,
    candidate.length - commonSuffixTokenCount,
  );
  enforceDynamicProgrammingBound(referenceMiddle.length, candidateMiddle.length, "LCS middle");
  const lcsTokenCount = commonPrefixTokenCount
    + lcsLength(referenceMiddle, candidateMiddle)
    + commonSuffixTokenCount;

  return Object.freeze({
    scorerVersion: TRANSCRIPT_SCORER_VERSION,
    referenceRole,
    referenceTokenCount: reference.length,
    candidateTokenCount: candidate.length,
    commonPrefixTokenCount,
    commonSuffixTokenCount,
    comparedReferenceMiddleTokenCount: referenceMiddle.length,
    comparedCandidateMiddleTokenCount: candidateMiddle.length,
    lcsTokenCount,
    tokenPreservationRate: lcsTokenCount / reference.length,
  });
}

export function scoreWer(
  referenceText: string,
  hypothesisText: string,
  referenceRole: "a3_independent_speech_reference",
): WerScore {
  if (referenceRole !== "a3_independent_speech_reference") {
    throw new TranscriptScorerError(
      "INVALID_INPUT",
      "WER requires an A3 independent speech reference; A1 preservation oracles are ineligible",
    );
  }
  const reference = normalizeTranscript(referenceText).tokens;
  const hypothesis = normalizeTranscript(hypothesisText).tokens;
  if (reference.length === 0) {
    throw new TranscriptScorerError("EMPTY_REFERENCE", "WER reference has no words");
  }
  enforceDynamicProgrammingBound(reference.length, hypothesis.length, "WER");
  const counts = levenshteinCounts(reference, hypothesis);

  return Object.freeze({
    scorerVersion: TRANSCRIPT_SCORER_VERSION,
    referenceRole,
    referenceWordCount: reference.length,
    hypothesisWordCount: hypothesis.length,
    substitutions: counts.substitutions,
    deletions: counts.deletions,
    insertions: counts.insertions,
    errors: counts.cost,
    wer: counts.cost / reference.length,
  });
}

export function requiredTimestampAnchorCount(
  durationMs: number,
  sealedDistinctNonemptyReferenceStartCount: number,
): number {
  validateDuration(durationMs);
  if (
    !Number.isSafeInteger(sealedDistinctNonemptyReferenceStartCount)
    || sealedDistinctNonemptyReferenceStartCount < 3
    || sealedDistinctNonemptyReferenceStartCount > SCORER_LIMITS.maxSegments
  ) {
    throw new TranscriptScorerError(
      "INVALID_ANCHORS",
      `sealed distinct nonempty reference-start count must be from 3 through ${SCORER_LIMITS.maxSegments}`,
    );
  }
  const baseAnchorCount = Math.max(10, Math.ceil(durationMs / 300_000));
  return Math.min(baseAnchorCount, sealedDistinctNonemptyReferenceStartCount);
}

export function scoreTimestampAnchors(
  anchors: readonly TimestampAnchor[],
  outputSegments: readonly TimestampSegment[],
  durationMs: number,
  referenceRole: TimestampReferenceRole,
  sealedDistinctNonemptyReferenceStartCount: number,
): TimestampAnchorScore {
  validateReferenceRole(referenceRole);
  validateDuration(durationMs);
  const baseAnchorCount = Math.max(10, Math.ceil(durationMs / 300_000));
  const requiredAnchorCount = requiredTimestampAnchorCount(
    durationMs,
    sealedDistinctNonemptyReferenceStartCount,
  );
  validateAnchors(anchors, durationMs, requiredAnchorCount);
  validateSegments(outputSegments, durationMs);

  const flattenedTokens: string[] = [];
  const tokenSegmentIndexes: number[] = [];
  outputSegments.forEach((segment, segmentIndex) => {
    const tokens = normalizeTranscript(segment.text).tokens;
    for (const token of tokens) {
      flattenedTokens.push(token);
      tokenSegmentIndexes.push(segmentIndex);
    }
  });
  if (flattenedTokens.length > SCORER_LIMITS.maxTokensPerInput) {
    throw new TranscriptScorerError(
      "LIMIT_EXCEEDED",
      `combined output segments exceed ${SCORER_LIMITS.maxTokensPerInput} tokens`,
    );
  }
  if (flattenedTokens.length === 0) {
    throw new TranscriptScorerError("INVALID_INPUT", "output segments contain no tokens");
  }

  const normalizedAnchorTokens = anchors.map((anchor) => normalizeTranscript(anchor.utterance).tokens);
  const anchorComparisonCells = normalizedAnchorTokens.reduce(
    (total, tokens) => total + (tokens.length * flattenedTokens.length),
    0,
  );
  if (
    !Number.isSafeInteger(anchorComparisonCells)
    || anchorComparisonCells > SCORER_LIMITS.maxDynamicProgrammingCells
  ) {
    throw new TranscriptScorerError(
      "LIMIT_EXCEEDED",
      `anchor matching exceeds ${SCORER_LIMITS.maxDynamicProgrammingCells} comparisons`,
    );
  }

  const results = anchors.map((anchor, anchorIndex): AnchorResult => {
    const anchorTokens = normalizedAnchorTokens[anchorIndex];
    const matches = findContiguousMatches(flattenedTokens, anchorTokens);
    if (matches.length === 0) {
      return Object.freeze({
        id: anchor.id,
        status: "not_found",
        referenceStartMs: anchor.referenceStartMs,
        outputSegmentStartMs: null,
        absoluteErrorMs: null,
      });
    }
    if (matches.length > 1) {
      return Object.freeze({
        id: anchor.id,
        status: "ambiguous",
        referenceStartMs: anchor.referenceStartMs,
        outputSegmentStartMs: null,
        absoluteErrorMs: null,
      });
    }
    const segment = outputSegments[tokenSegmentIndexes[matches[0]]];
    return Object.freeze({
      id: anchor.id,
      status: "matched",
      referenceStartMs: anchor.referenceStartMs,
      outputSegmentStartMs: segment.startMs,
      absoluteErrorMs: Math.abs(segment.startMs - anchor.referenceStartMs),
    });
  });

  const errors = results
    .flatMap((result) => result.absoluteErrorMs === null ? [] : [result.absoluteErrorMs])
    .sort((left, right) => left - right);
  const matchedCount = errors.length;
  const ambiguousCount = results.filter((result) => result.status === "ambiguous").length;

  return Object.freeze({
    scorerVersion: TRANSCRIPT_SCORER_VERSION,
    referenceRole,
    baseAnchorCount,
    sealedDistinctNonemptyReferenceStartCount,
    requiredAnchorCount,
    anchorCount: anchors.length,
    matchedCount,
    unmatchedCount: anchors.length - matchedCount,
    ambiguousCount,
    matchRate: matchedCount / anchors.length,
    matchRateWilson95: wilson95(matchedCount, anchors.length),
    medianErrorMs: errors.length === 0 ? null : median(errors),
    p90ErrorMs: errors.length === 0 ? null : nearestRankPercentile(errors, 0.9),
    results: Object.freeze(results),
  });
}

export function wilson95(successes: number, total: number): WilsonInterval {
  if (
    !Number.isSafeInteger(successes)
    || !Number.isSafeInteger(total)
    || total <= 0
    || successes < 0
    || successes > total
  ) {
    throw new TranscriptScorerError(
      "INVALID_INPUT",
      "Wilson interval counts must be safe integers with 0 <= successes <= total and total > 0",
    );
  }

  const z = 1.959963984540054;
  const proportion = successes / total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / total;
  const center = (proportion + zSquared / (2 * total)) / denominator;
  const halfWidth = (
    z
    * Math.sqrt((proportion * (1 - proportion) / total) + (zSquared / (4 * total * total)))
  ) / denominator;

  return Object.freeze({
    successes,
    total,
    confidence: 0.95,
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
  });
}

function validateText(text: string, label: string): void {
  if (typeof text !== "string") {
    throw new TranscriptScorerError("INVALID_INPUT", `${label} must be a string`);
  }
  if (CONTROL_EXCEPT_WHITESPACE.test(text)) {
    throw new TranscriptScorerError("INVALID_INPUT", `${label} contains a prohibited control character`);
  }
  for (let index = 0; index < text.length; index += 1) {
    const codeUnit = text.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new TranscriptScorerError("INVALID_INPUT", `${label} contains an unpaired surrogate`);
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new TranscriptScorerError("INVALID_INPUT", `${label} contains an unpaired surrogate`);
    }
  }
  if (Buffer.byteLength(text, "utf8") > SCORER_LIMITS.maxTextBytes) {
    throw new TranscriptScorerError(
      "LIMIT_EXCEEDED",
      `${label} exceeds ${SCORER_LIMITS.maxTextBytes} UTF-8 bytes`,
    );
  }
}

function validateReferenceRole(role: TimestampReferenceRole): void {
  if (role !== "a1_input_preservation_oracle" && role !== "a3_independent_speech_reference") {
    throw new TranscriptScorerError(
      "INVALID_INPUT",
      "reference role must distinguish A1 preservation from A3 independent speech accuracy",
    );
  }
}

function enforceDynamicProgrammingBound(left: number, right: number, label: string): void {
  const cells = left * right;
  if (!Number.isSafeInteger(cells) || cells > SCORER_LIMITS.maxDynamicProgrammingCells) {
    throw new TranscriptScorerError(
      "LIMIT_EXCEEDED",
      `${label} comparison exceeds ${SCORER_LIMITS.maxDynamicProgrammingCells} cells`,
    );
  }
}

function lcsLength(left: readonly string[], right: readonly string[]): number {
  if (left.length === 0 || right.length === 0) return 0;
  const columns = right.length <= left.length ? right : left;
  const rows = right.length <= left.length ? left : right;
  let previous = new Uint32Array(columns.length + 1);
  let current = new Uint32Array(columns.length + 1);

  for (let row = 1; row <= rows.length; row += 1) {
    for (let column = 1; column <= columns.length; column += 1) {
      current[column] = rows[row - 1] === columns[column - 1]
        ? previous[column - 1] + 1
        : Math.max(previous[column], current[column - 1]);
    }
    [previous, current] = [current, previous];
    current.fill(0);
  }
  return previous[columns.length];
}

function levenshteinCounts(
  reference: readonly string[],
  hypothesis: readonly string[],
): EditCounts {
  let previous: EditCounts[] = Array.from(
    { length: hypothesis.length + 1 },
    (_, insertions) => ({ cost: insertions, substitutions: 0, deletions: 0, insertions }),
  );

  for (let referenceIndex = 1; referenceIndex <= reference.length; referenceIndex += 1) {
    const current: EditCounts[] = [{
      cost: referenceIndex,
      substitutions: 0,
      deletions: referenceIndex,
      insertions: 0,
    }];
    for (let hypothesisIndex = 1; hypothesisIndex <= hypothesis.length; hypothesisIndex += 1) {
      if (reference[referenceIndex - 1] === hypothesis[hypothesisIndex - 1]) {
        current.push(previous[hypothesisIndex - 1]);
        continue;
      }
      const substitution = addEdit(previous[hypothesisIndex - 1], "substitution");
      const deletion = addEdit(previous[hypothesisIndex], "deletion");
      const insertion = addEdit(current[hypothesisIndex - 1], "insertion");
      current.push(bestEditCounts(substitution, deletion, insertion));
    }
    previous = current;
  }
  return previous[hypothesis.length];
}

function addEdit(
  counts: EditCounts,
  edit: "substitution" | "deletion" | "insertion",
): EditCounts {
  return {
    cost: counts.cost + 1,
    substitutions: counts.substitutions + (edit === "substitution" ? 1 : 0),
    deletions: counts.deletions + (edit === "deletion" ? 1 : 0),
    insertions: counts.insertions + (edit === "insertion" ? 1 : 0),
  };
}

function bestEditCounts(...candidates: EditCounts[]): EditCounts {
  return candidates.reduce((best, candidate) => {
    const bestKey = [best.cost, -best.substitutions, best.deletions, best.insertions];
    const candidateKey = [
      candidate.cost,
      -candidate.substitutions,
      candidate.deletions,
      candidate.insertions,
    ];
    for (let index = 0; index < bestKey.length; index += 1) {
      if (candidateKey[index] < bestKey[index]) return candidate;
      if (candidateKey[index] > bestKey[index]) return best;
    }
    return best;
  });
}

function validateDuration(durationMs: number): void {
  if (
    !Number.isSafeInteger(durationMs)
    || durationMs <= 0
    || durationMs > SCORER_LIMITS.maxDurationMs
  ) {
    throw new TranscriptScorerError(
      "INVALID_TIMING",
      `durationMs must be a positive safe integer no greater than ${SCORER_LIMITS.maxDurationMs}`,
    );
  }
}

function validateAnchors(
  anchors: readonly TimestampAnchor[],
  durationMs: number,
  requiredCount: number,
): void {
  if (!Array.isArray(anchors) || anchors.length !== requiredCount || anchors.length > SCORER_LIMITS.maxAnchors) {
    throw new TranscriptScorerError(
      "INVALID_ANCHORS",
      `exactly ${requiredCount} locked anchors are required for this duration`,
    );
  }
  const ids = new Set<string>();
  const utterances = new Set<string>();
  let previousStart = -1;
  const thirds = [false, false, false];

  for (const anchor of anchors) {
    if (!anchor || typeof anchor.id !== "string" || !anchor.id || ids.has(anchor.id)) {
      throw new TranscriptScorerError("INVALID_ANCHORS", "anchor IDs must be non-empty and unique");
    }
    if (
      !Number.isSafeInteger(anchor.referenceStartMs)
      || anchor.referenceStartMs < 0
      || anchor.referenceStartMs >= durationMs
      || anchor.referenceStartMs <= previousStart
    ) {
      throw new TranscriptScorerError(
        "INVALID_ANCHORS",
        "anchor starts must be strictly increasing safe integers within the item duration",
      );
    }
    const normalizedUtterance = normalizeTranscript(anchor.utterance).text;
    if (!normalizedUtterance || utterances.has(normalizedUtterance)) {
      throw new TranscriptScorerError(
        "INVALID_ANCHORS",
        "anchor utterances must normalize to non-empty unique text",
      );
    }
    ids.add(anchor.id);
    utterances.add(normalizedUtterance);
    previousStart = anchor.referenceStartMs;
    thirds[Math.min(2, Math.floor((anchor.referenceStartMs / durationMs) * 3))] = true;
  }
  if (!thirds.every(Boolean)) {
    throw new TranscriptScorerError(
      "INVALID_ANCHORS",
      "anchors must include the beginning, middle, and final third of the duration",
    );
  }
}

function validateSegments(segments: readonly TimestampSegment[], durationMs: number): void {
  if (!Array.isArray(segments) || segments.length === 0 || segments.length > SCORER_LIMITS.maxSegments) {
    throw new TranscriptScorerError(
      "INVALID_INPUT",
      `output must have between 1 and ${SCORER_LIMITS.maxSegments} segments`,
    );
  }
  let previousStart = -1;
  let combinedTextBytes = 0;
  for (const segment of segments) {
    if (
      !segment
      || !Number.isSafeInteger(segment.startMs)
      || !Number.isSafeInteger(segment.endMs)
      || segment.startMs < 0
      || segment.endMs <= segment.startMs
      || segment.endMs > durationMs
      || segment.startMs < previousStart
    ) {
      throw new TranscriptScorerError(
        "INVALID_TIMING",
        "output segment timing must be source-ordered, finite, non-empty, and within duration",
      );
    }
    validateText(segment.text, "output segment text");
    combinedTextBytes += Buffer.byteLength(segment.text, "utf8");
    if (combinedTextBytes > SCORER_LIMITS.maxTextBytes) {
      throw new TranscriptScorerError(
        "LIMIT_EXCEEDED",
        `combined output segment text exceeds ${SCORER_LIMITS.maxTextBytes} UTF-8 bytes`,
      );
    }
    previousStart = segment.startMs;
  }
}

function findContiguousMatches(haystack: readonly string[], needle: readonly string[]): number[] {
  if (needle.length === 0 || needle.length > haystack.length) return [];
  const matches: number[] = [];
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matchesAtStart = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matchesAtStart = false;
        break;
      }
    }
    if (matchesAtStart) matches.push(start);
  }
  return matches;
}

function median(sorted: readonly number[]): number {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function nearestRankPercentile(sorted: readonly number[], percentile: number): number {
  const rank = Math.max(1, Math.ceil(percentile * sorted.length));
  return sorted[rank - 1];
}
