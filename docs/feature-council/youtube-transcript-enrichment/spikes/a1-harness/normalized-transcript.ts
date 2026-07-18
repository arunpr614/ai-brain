import { z } from "zod";

import type { A1Attestation } from "./attestation";
import { A1HarnessError } from "./errors";

const language = z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/);
const interval = z.object({
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().nonnegative(),
  reason: z.string().min(1),
}).strict();

const normalizedTranscriptSchema = z.object({
  schema_version: z.literal("1.0"),
  item_id: z.string().regex(/^YT-[0-9]{2}$/),
  youtube_video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  source_method: z.enum(["A1", "A2", "A3"]),
  language,
  caption_type: z.enum([
    "source_provided_unknown_authorship",
    "human",
    "automatic",
    "translated",
    "unknown",
  ]),
  timestamp_mode: z.literal("timestamped"),
  completeness: z.object({
    state: z.enum(["complete", "partial", "unknown"]),
    basis: z.enum(["explicit_source_assertion", "source_coverage_record", "user_attestation", "unknown"]),
    source_duration_ms: z.number().int().positive(),
    last_cue_end_ms: z.number().int().nonnegative(),
    trailing_gap_ms: z.number().int().nonnegative(),
    missing_intervals: z.array(interval).optional(),
  }).strict(),
  provenance: z.object({
    source_page_url: z.string().url().refine(isHttps),
    source_asset_url: z.string().url().refine(isHttps),
    input_sha256: z.string().regex(/^[0-9a-f]{64}$/),
    reference_role: z.enum(["input_preservation", "independent_speech"]),
    version_equivalence: z.enum([
      "official_row_level_publication_association",
      "owner_verified_exact",
    ]),
    acquired_at: z.string().datetime({ offset: true }),
  }).strict(),
  processing_version: z.string().min(1),
  segments: z.array(z.object({
    index: z.number().int().nonnegative(),
    start_ms: z.number().int().nonnegative(),
    end_ms: z.number().int().nonnegative(),
    source_start_ms: z.number().int().nonnegative(),
    source_end_ms: z.number().int().nonnegative(),
    text: z.string().min(1),
    speaker: z.string().nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    source_cue_ids: z.array(z.string().min(1)).min(1)
      .refine((items) => new Set(items).size === items.length),
  }).strict()).min(1),
  errors: z.array(z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    recoverable: z.boolean(),
  }).strict()),
}).strict().superRefine((transcript, context) => {
  for (const [index, segment] of transcript.segments.entries()) {
    if (segment.end_ms <= segment.start_ms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "normalized segment timing must have positive duration",
        path: ["segments", index, "end_ms"],
      });
    }
    if (segment.source_end_ms <= segment.source_start_ms) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source segment timing must have positive duration",
        path: ["segments", index, "source_end_ms"],
      });
    }
    if (
      segment.end_ms > transcript.completeness.source_duration_ms
      || segment.source_end_ms > transcript.completeness.source_duration_ms
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "segment timing exceeds the declared source duration",
        path: ["segments", index],
      });
    }
    if (
      transcript.source_method === "A1"
      && (
        segment.source_start_ms !== segment.start_ms
        || segment.source_end_ms !== segment.end_ms
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A1 source and normalized timing must be identical",
        path: ["segments", index],
      });
    }
  }
});

export type NormalizedTranscript = z.infer<typeof normalizedTranscriptSchema>;

export function parseNormalizedTranscriptArtifact(value: unknown): NormalizedTranscript {
  const result = normalizedTranscriptSchema.safeParse(value);
  if (!result.success) {
    throw new A1HarnessError(
      "PERSISTED_SEGMENT_MISMATCH",
      "The private normalized artifact does not satisfy its frozen schema.",
    );
  }
  return result.data;
}

export interface StrictCue {
  ordinal: number;
  identifier: string | null;
  startMs: number;
  endMs: number;
  text: string;
}

export interface PersistedSegmentProjection {
  idx: number;
  start_ms: number | null;
  duration_ms: number | null;
  end_ms: number | null;
  text: string;
}

export interface CanonicalPersistedSegment {
  index: number;
  start_ms: number;
  duration_ms: number;
  end_ms: number;
  text: string;
}

export function expectedPersistedSegments(
  cues: readonly StrictCue[],
): CanonicalPersistedSegment[] {
  return cues.map((cue, index) => ({
    index,
    start_ms: cue.startMs,
    duration_ms: cue.endMs - cue.startMs,
    end_ms: cue.endMs,
    text: cue.text,
  }));
}

export function canonicalizePersistedSegments(
  segments: readonly PersistedSegmentProjection[],
): CanonicalPersistedSegment[] {
  return segments.map((segment) => {
    if (
      segment.start_ms === null
      || segment.duration_ms === null
      || segment.end_ms === null
    ) {
      throw new A1HarnessError(
        "PERSISTED_SEGMENT_MISMATCH",
        "The service persisted a non-timestamped segment.",
      );
    }
    return {
      index: segment.idx,
      start_ms: segment.start_ms,
      duration_ms: segment.duration_ms,
      end_ms: segment.end_ms,
      text: segment.text,
    };
  });
}

export function assertExactPersistedSegments(
  expected: readonly CanonicalPersistedSegment[],
  persisted: readonly CanonicalPersistedSegment[],
): void {
  if (stableJson(expected) !== stableJson(persisted)) {
    throw new A1HarnessError(
      "PERSISTED_SEGMENT_MISMATCH",
      "Persisted segments differ from the strict preflight representation.",
    );
  }
}

export function buildNormalizedTranscript(input: {
  attestation: A1Attestation;
  language: string;
  declaredDurationMs: number;
  contentCompleteness: "complete" | "partial" | "unknown";
  contentCompletenessBasis:
    | "explicit_source_assertion"
    | "source_coverage_record"
    | "user_attestation"
    | "unknown";
  cues: readonly StrictCue[];
  persistedSegments: readonly CanonicalPersistedSegment[];
  processingVersion: string;
}): NormalizedTranscript {
  const lastCueEndMs = input.cues[input.cues.length - 1]?.endMs ?? 0;
  const candidate: NormalizedTranscript = {
    schema_version: "1.0",
    item_id: input.attestation.item_id,
    youtube_video_id: input.attestation.youtube_video_id,
    source_method: "A1",
    language: input.language,
    caption_type: "source_provided_unknown_authorship",
    timestamp_mode: "timestamped",
    completeness: {
      state: input.contentCompleteness,
      basis: input.contentCompletenessBasis,
      source_duration_ms: input.declaredDurationMs,
      last_cue_end_ms: lastCueEndMs,
      trailing_gap_ms: input.declaredDurationMs - lastCueEndMs,
      ...(input.contentCompleteness === "partial"
        && input.contentCompletenessBasis === "source_coverage_record"
        && lastCueEndMs < input.declaredDurationMs
        ? {
            missing_intervals: [{
              start_ms: lastCueEndMs,
              end_ms: input.declaredDurationMs,
              reason: "source_sidecar_uncovered_tail",
            }],
          }
        : {}),
    },
    provenance: {
      source_page_url: input.attestation.source.source_page_url,
      source_asset_url: input.attestation.source.sidecar_url,
      input_sha256: input.attestation.source.sidecar_sha256,
      reference_role: "input_preservation",
      version_equivalence: input.attestation.version_equivalence.state,
      acquired_at: input.attestation.attested_at,
    },
    processing_version: input.processingVersion,
    segments: input.persistedSegments.map((segment, index) => ({
      index: segment.index,
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      source_start_ms: segment.start_ms,
      source_end_ms: segment.end_ms,
      text: segment.text,
      source_cue_ids: [input.cues[index]?.identifier ?? `cue-${index + 1}`],
    })),
    errors: [],
  };

  const result = normalizedTranscriptSchema.safeParse(candidate);
  if (!result.success) {
    throw new A1HarnessError(
      "PERSISTED_SEGMENT_MISMATCH",
      "The private normalized artifact does not satisfy its frozen schema.",
    );
  }
  return result.data;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
