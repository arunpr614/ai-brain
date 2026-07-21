import { createHash } from "node:crypto";
import { TextDecoder } from "node:util";

import { z } from "zod";

import { A1HarnessError } from "./errors";

export const A1_ATTESTATION_SCHEMA_ID =
  "https://brain.arunp.in/schemas/youtube-a1-attestation-v1.2.json";

export const A1_ATTESTATION_PARTS = Object.freeze([
  "content_rights",
  "transcript_rights",
  "source",
  "retention_and_derivation",
  "attribution",
  "version_equivalence",
] as const);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ITEM_ID_PATTERN = /^YT-[0-9]{2}$/;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const nonEmpty = z.string().min(1);
const httpsUrl = z.string().url().refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
});
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});

const evidenceDecisionSchema = z.object({
  state: z.literal("provisionally_allowed_for_private_benchmark_review_required"),
  evidence_url: httpsUrl,
  rationale: nonEmpty,
  review_required: z.literal(true),
}).strict();

const completenessStateSchema = z.enum(["complete", "partial", "unknown"]);
const completenessBasisSchema = z.enum([
  "explicit_source_assertion",
  "source_coverage_record",
  "user_attestation",
  "unknown",
]);
const expectedClassSchema = z.enum(["eligible_supported", "expected_safe_rejection"]);

const claims = [
  "input_preservation_only",
  "not_independent_wer_reference",
  "youtube_caption_state_unverified",
  "not_legal_approval",
  "not_production_readiness",
] as const;

const attestationSchema = z.object({
  schema_version: z.literal("1.2"),
  item_id: z.string().regex(ITEM_ID_PATTERN),
  youtube_video_id: z.string().regex(VIDEO_ID_PATTERN),
  attested_at: z.string().datetime({ offset: true }),
  input_contract: z.object({
    format: z.enum(["srt", "vtt"]),
    language_tag: z.string().regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
    declared_duration_ms: z.number().int().min(1).max(21_600_000),
    expected_cue_count: z.number().int().min(1).max(10_000),
    last_cue_end_ms: z.number().int().min(1).max(21_600_000),
    content_completeness: z.object({
      state: completenessStateSchema,
      basis: completenessBasisSchema,
      rationale: z.string().min(1).max(1_024),
    }).strict(),
    expected_class: expectedClassSchema,
  }).strict().superRefine((contract, context) => {
    if (contract.last_cue_end_ms > contract.declared_duration_ms) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "last cue exceeds duration" });
    }
    if (
      contract.expected_class === "eligible_supported"
      && (
        contract.content_completeness.state === "unknown"
        || contract.content_completeness.basis === "unknown"
      )
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "eligible completeness is unknown" });
    }
    if (
      contract.content_completeness.state === "partial"
      && contract.content_completeness.basis !== "source_coverage_record"
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "partial requires coverage record" });
    }
    if (
      contract.content_completeness.state === "unknown"
      && contract.expected_class !== "expected_safe_rejection"
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "unknown requires safe rejection" });
    }
  }),
  content_rights: evidenceDecisionSchema,
  transcript_rights: evidenceDecisionSchema,
  source: z.object({
    owner: nonEmpty,
    source_page_url: httpsUrl,
    sidecar_url: httpsUrl,
    sidecar_sha256: z.string().regex(SHA256_PATTERN),
    private_relative_path: z.string()
      .regex(/^inputs\/[^/]+\/.+\.(?:vtt|srt)$/)
      .refine(isSafePrivateRelativePath),
  }).strict(),
  retention_and_derivation: z.object({
    full_text_private: z.literal(true),
    publication: z.literal("hashes_and_derived_metrics_only"),
    embeddings: z.literal("not_created"),
    model_upload: z.literal("prohibited_in_protocol_v2"),
    delete_by: calendarDate,
    evidence_url: httpsUrl,
    rationale: nonEmpty,
  }).strict(),
  attribution: z.object({
    credit: nonEmpty,
    no_endorsement: z.literal(true),
    third_party_caveats: z.array(nonEmpty),
  }).strict(),
  version_equivalence: z.object({
    state: z.literal("official_row_level_publication_association"),
    evidence: nonEmpty,
    youtube_side_verified: z.literal(false),
  }).strict(),
  claims_boundary: z.array(z.enum(claims))
    .min(3)
    .refine((items) => new Set(items).size === items.length)
    .refine((items) => items.includes("input_preservation_only"))
    .refine((items) => items.includes("not_independent_wer_reference"))
    .refine((items) => items.includes("youtube_caption_state_unverified")),
}).strict();

export type A1Attestation = z.infer<typeof attestationSchema>;

export interface LockedA1Attestation {
  attestation: A1Attestation;
  rawSha256: string;
  attestationPartCount: 6;
}

export function parseLockedA1Attestation(
  bytes: Uint8Array,
  expectedSha256: string,
): LockedA1Attestation {
  const rawSha256 = sha256Hex(bytes);
  if (rawSha256 !== expectedSha256) {
    throw new A1HarnessError(
      "ATTESTATION_LOCK_MISMATCH",
      "The attestation bytes do not match the caller's locked digest.",
    );
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    assertNoDuplicateJsonObjectKeys(text);
    parsed = JSON.parse(text);
  } catch {
    throw new A1HarnessError(
      "ATTESTATION_SCHEMA_INVALID",
      "The attestation must be unambiguous, valid UTF-8 JSON.",
    );
  }

  const result = attestationSchema.safeParse(parsed);
  if (!result.success) {
    throw new A1HarnessError(
      "ATTESTATION_SCHEMA_INVALID",
      "The attestation does not satisfy A1_ATTESTATION.schema.json.",
    );
  }

  return {
    attestation: result.data,
    rawSha256,
    attestationPartCount: A1_ATTESTATION_PARTS.length,
  };
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isSafePrivateRelativePath(value: string): boolean {
  if (value.includes("\\") || value.includes("\0") || value.startsWith("/")) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

/** A small recursive JSON scanner used only to reject ambiguous duplicate keys. */
function assertNoDuplicateJsonObjectKeys(text: string): void {
  let position = 0;
  const fail = (): never => {
    throw new Error("invalid or ambiguous JSON");
  };
  const whitespace = (): void => {
    while (position < text.length && /\s/u.test(text[position])) position += 1;
  };
  const parseString = (): string => {
    if (text[position] !== '"') fail();
    const start = position++;
    while (position < text.length) {
      const character = text[position];
      if (character === '"') {
        position += 1;
        return JSON.parse(text.slice(start, position)) as string;
      }
      if (character === "\\") {
        position += 1;
        if (position >= text.length) fail();
        if (text[position] === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(position + 1, position + 5))) fail();
          position += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(text[position])) fail();
        position += 1;
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) fail();
      position += 1;
    }
    return fail();
  };
  const parseValue = (): void => {
    whitespace();
    const character = text[position];
    if (character === "{") {
      position += 1;
      whitespace();
      const keys = new Set<string>();
      if (text[position] === "}") {
        position += 1;
        return;
      }
      while (position < text.length) {
        whitespace();
        const key = parseString();
        if (keys.has(key)) fail();
        keys.add(key);
        whitespace();
        if (text[position++] !== ":") fail();
        parseValue();
        whitespace();
        if (text[position] === "}") {
          position += 1;
          return;
        }
        if (text[position++] !== ",") fail();
      }
      fail();
    }
    if (character === "[") {
      position += 1;
      whitespace();
      if (text[position] === "]") {
        position += 1;
        return;
      }
      while (position < text.length) {
        parseValue();
        whitespace();
        if (text[position] === "]") {
          position += 1;
          return;
        }
        if (text[position++] !== ",") fail();
      }
      fail();
    }
    if (character === '"') {
      parseString();
      return;
    }
    const token = text.slice(position).match(
      /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/,
    )?.[0];
    if (token === undefined) return fail();
    position += token.length;
  };

  parseValue();
  whitespace();
  if (position !== text.length) fail();
}
