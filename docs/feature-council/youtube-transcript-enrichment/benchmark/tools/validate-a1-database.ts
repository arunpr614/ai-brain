import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { basename } from "node:path";

import Database from "better-sqlite3";

import { parseNormalizedTranscriptArtifact } from "../../spikes/a1-harness/normalized-transcript";
import { parseJsonWithoutDuplicateKeys } from "./verify-lock";

export const A1_DATABASE_VALIDATOR_VERSION = "1.0.0";
export const A1_DATABASE_MAX_BYTES = 64 * 1024 * 1024;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CAPTURE_EXTRACTION_VERSION = "capture-v0.7.5";
const TRANSCRIPT_FILE_PARSER_VERSION = "transcript-file-v1";

export interface A1DatabaseValidationInput {
  databasePath: string;
  normalizedTranscriptBytes: Uint8Array;
  itemId: string;
  youtubeVideoId: string;
  language: string;
  format: "srt" | "vtt";
  declaredDurationMs: number;
  expectedCueCount: number;
  sourcePrivateRelativePath: string;
  sourcePageUrl: string;
  sourceAssetUrl: string;
  sourceRawSha256: string;
  sourceByteCount: number;
}

export interface A1DatabaseValidationResult {
  validator_version: typeof A1_DATABASE_VALIDATOR_VERSION;
  valid: true;
  item_count: 1;
  transcript_source_count: 1;
  transcript_segment_count: number;
  transcript_recovery_job_count: 1;
  transcript_provider_attempt_count: 0;
  enrichment_provider_attempt_count: 0;
  llm_provider_attempt_count: 0;
}

export class A1DatabaseEvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "A1DatabaseEvidenceError";
  }
}

type Row = Record<string, unknown>;

export function validateA1Database(
  input: A1DatabaseValidationInput,
): A1DatabaseValidationResult {
  validateInput(input);
  assertSafeDatabaseFile(input.databasePath);
  const normalized = parseNormalized(input.normalizedTranscriptBytes);
  if (
    normalized.item_id !== input.itemId
    || normalized.youtube_video_id !== input.youtubeVideoId
    || normalized.source_method !== "A1"
    || normalized.language !== input.language
    || normalized.provenance.source_page_url !== input.sourcePageUrl
    || normalized.provenance.source_asset_url !== input.sourceAssetUrl
    || normalized.provenance.input_sha256 !== input.sourceRawSha256
    || normalized.segments.length !== input.expectedCueCount
    || normalized.completeness.source_duration_ms !== input.declaredDurationMs
    || normalized.errors.length !== 0
  ) fail("normalized transcript identity differs from the database authority");

  // The application transcript-file service preserves cue boundaries in the
  // repaired item body as paragraphs, while the normalized artifact preserves
  // the same cue texts as individual segment records.
  const expectedBody = normalized.segments.map((segment) => segment.text).join("\n\n");
  const canonicalSourceUrl = `https://www.youtube.com/watch?v=${input.youtubeVideoId}`;
  let database: Database.Database | null = null;
  try {
    database = new Database(input.databasePath, { readonly: true, fileMustExist: true });
    database.pragma("query_only = ON");
    assertIntegrity(database);
    assertRequiredTables(database);

    const items = rows(database, `
      SELECT id, source_type, capture_source, source_url, title, author, body,
             summary, category, enrichment_state, extraction_warning, total_chars,
             duration_seconds, source_platform, capture_quality, extraction_method,
             extraction_version, enriched_at, batch_id
      FROM items ORDER BY id
    `);
    if (items.length !== 1) fail("database must contain exactly one isolated item");
    const item = items[0];
    const databaseItemId = stringField(item, "id");
    if (
      item.source_type !== "youtube"
      || item.capture_source !== "system"
      || item.source_url !== canonicalSourceUrl
      || item.title !== "Isolated A1 sidecar seed"
      || item.author !== null
      || item.body !== expectedBody
      || item.summary !== null
      || item.category !== null
      || item.enrichment_state !== "pending"
      || item.extraction_warning !== null
      || item.total_chars !== expectedBody.length
      || item.duration_seconds !== input.declaredDurationMs / 1_000
      || item.source_platform !== "youtube"
      || item.capture_quality !== "user_provided_full_text"
      || item.extraction_method !== "manual_repair_transcript"
      || item.extraction_version !== CAPTURE_EXTRACTION_VERSION
      || item.enriched_at !== null
      || item.batch_id !== null
    ) fail("isolated item row differs from the source and normalized authority");

    const policies = rows(database, `
      SELECT id, item_id, source_url, platform, environment, rights_basis, method,
             retention_class, blocked_reason, production_allowed, legal_approval_id
      FROM capture_policy_decisions ORDER BY id
    `);
    if (policies.length !== 1) fail("database must contain exactly one transcript policy decision");
    const policy = policies[0];
    const policyId = stringField(policy, "id");
    if (
      policy.item_id !== databaseItemId
      || policy.source_url !== canonicalSourceUrl
      || policy.platform !== "youtube"
      || policy.environment !== "lab"
      || policy.rights_basis !== "user_provided_transcript"
      || policy.method !== "uploaded_file"
      || policy.retention_class !== "full_text_allowed"
      || policy.blocked_reason !== null
      || policy.production_allowed !== 1
      || policy.legal_approval_id !== null
    ) fail("transcript policy row differs from the isolated uploaded-file contract");

    const sources = rows(database, `
      SELECT id, item_id, policy_decision_id, source_kind, language_code,
             caption_source_class, timestamp_mode, provenance_json, retention_class,
             text_sha256, segment_count, status
      FROM transcript_sources ORDER BY id
    `);
    if (sources.length !== 1) fail("database must contain exactly one transcript source");
    const source = sources[0];
    const transcriptSourceId = stringField(source, "id");
    if (
      source.item_id !== databaseItemId
      || source.policy_decision_id !== policyId
      || source.source_kind !== "uploaded_file"
      || source.language_code !== input.language.toLowerCase()
      || source.caption_source_class !== "user_provided"
      || source.timestamp_mode !== "timestamped"
      || source.retention_class !== "full_text_allowed"
      || source.text_sha256 !== sha256(expectedBody)
      || source.segment_count !== input.expectedCueCount
      || source.status !== "active"
    ) fail("transcript source row differs from the isolated source authority");
    assertSourceProvenance(source.provenance_json, input, policyId, expectedBody.length);

    const segments = rows(database, `
      SELECT transcript_source_id, item_id, idx, start_ms, duration_ms, end_ms,
             text, text_sha256, token_count, confidence
      FROM transcript_segments ORDER BY idx
    `);
    if (segments.length !== normalized.segments.length) {
      fail("database transcript-segment denominator differs from normalized output");
    }
    for (const [index, expected] of normalized.segments.entries()) {
      const actual = segments[index];
      if (
        actual.transcript_source_id !== transcriptSourceId
        || actual.item_id !== databaseItemId
        || actual.idx !== index
        || actual.start_ms !== expected.start_ms
        || actual.duration_ms !== expected.end_ms - expected.start_ms
        || actual.end_ms !== expected.end_ms
        || actual.text !== expected.text
        || actual.text_sha256 !== sha256(expected.text)
        || actual.token_count !== tokenCount(expected.text)
        || actual.confidence !== null
      ) fail("database transcript segment differs from normalized timing or text");
    }

    const transcriptJobs = rows(database, `
      SELECT item_id, source_platform, video_id, state, attempts, max_attempts,
             claimed_at, completed_at, last_attempt_id, last_provider,
             last_error_code, last_error_message
      FROM transcript_jobs ORDER BY id
    `);
    if (transcriptJobs.length !== 1) fail("isolated database must retain exactly one inert recovery job");
    const transcriptJob = transcriptJobs[0];
    if (
      transcriptJob.item_id !== databaseItemId
      || transcriptJob.source_platform !== "youtube"
      || transcriptJob.video_id !== null
      || transcriptJob.state !== "pending"
      || transcriptJob.attempts !== 0
      || transcriptJob.max_attempts !== 5
      || transcriptJob.claimed_at !== null
      || transcriptJob.completed_at !== null
      || transcriptJob.last_attempt_id !== null
      || transcriptJob.last_provider !== null
      || transcriptJob.last_error_code !== null
      || transcriptJob.last_error_message !== null
    ) fail("recovery job was absent, activated, attempted, or mutated");

    if (count(database, "SELECT COUNT(*) AS count FROM transcript_attempts") !== 0) {
      fail("transcript provider attempt evidence exists");
    }
    if (count(database, "SELECT COUNT(*) AS count FROM llm_usage") !== 0) {
      fail("LLM provider attempt evidence exists");
    }
    const enrichmentJobs = rows(database, `
      SELECT item_id, state, attempts, last_error, claimed_at, completed_at
      FROM enrichment_jobs ORDER BY id
    `);
    if (enrichmentJobs.length !== 1) fail("database must contain one inert enrichment queue row");
    const enrichmentJob = enrichmentJobs[0];
    if (
      enrichmentJob.item_id !== databaseItemId
      || enrichmentJob.state !== "pending"
      || enrichmentJob.attempts !== 0
      || enrichmentJob.last_error !== null
      || enrichmentJob.claimed_at !== null
      || enrichmentJob.completed_at !== null
    ) fail("enrichment provider job was activated, attempted, or mutated");
    if (count(database, "SELECT COUNT(*) AS count FROM embedding_jobs") !== 0) {
      fail("embedding provider job evidence exists");
    }

    return {
      validator_version: A1_DATABASE_VALIDATOR_VERSION,
      valid: true,
      item_count: 1,
      transcript_source_count: 1,
      transcript_segment_count: segments.length,
      transcript_recovery_job_count: 1,
      transcript_provider_attempt_count: 0,
      enrichment_provider_attempt_count: 0,
      llm_provider_attempt_count: 0,
    };
  } catch (error) {
    if (error instanceof A1DatabaseEvidenceError) throw error;
    return fail("SQLite evidence could not be queried under the frozen semantic contract");
  } finally {
    database?.close();
  }
}

function validateInput(input: A1DatabaseValidationInput): void {
  if (
    !/^YT-[0-9]{2}$/.test(input.itemId)
    || !/^[A-Za-z0-9_-]{11}$/.test(input.youtubeVideoId)
    || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(input.language)
    || (input.format !== "srt" && input.format !== "vtt")
    || !Number.isSafeInteger(input.declaredDurationMs)
    || input.declaredDurationMs <= 0
    || !Number.isSafeInteger(input.expectedCueCount)
    || input.expectedCueCount <= 0
    || !SHA256_PATTERN.test(input.sourceRawSha256)
    || !Number.isSafeInteger(input.sourceByteCount)
    || input.sourceByteCount <= 0
    || !isSafeRelativePath(input.sourcePrivateRelativePath)
    || !isHttpsUrl(input.sourcePageUrl)
    || !isHttpsUrl(input.sourceAssetUrl)
  ) fail("database validator authority is invalid");
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function assertSafeDatabaseFile(databasePath: string): void {
  try {
    const info = lstatSync(databasePath);
    if (
      !info.isFile()
      || info.isSymbolicLink()
      || info.nlink !== 1
      || info.size < 1
      || info.size > A1_DATABASE_MAX_BYTES
      || (info.mode & 0o077) !== 0
      || realpathSync(databasePath) !== databasePath
    ) throw new Error("unsafe database file");
  } catch {
    fail("SQLite evidence is missing, unsafe, non-private, or outside its byte cap");
  }
}

function parseNormalized(bytes: Uint8Array) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseNormalizedTranscriptArtifact(parseJsonWithoutDuplicateKeys(text));
  } catch {
    return fail("normalized transcript is not unambiguous frozen-schema JSON");
  }
}

function assertIntegrity(database: Database.Database): void {
  const integrity = database.pragma("integrity_check(1)") as Array<Record<string, unknown>>;
  if (integrity.length !== 1 || integrity[0].integrity_check !== "ok") {
    fail("SQLite integrity check failed");
  }
  if ((database.pragma("foreign_key_check") as unknown[]).length !== 0) {
    fail("SQLite foreign-key check failed");
  }
}

function assertRequiredTables(database: Database.Database): void {
  const required = [
    "capture_policy_decisions",
    "embedding_jobs",
    "enrichment_jobs",
    "items",
    "llm_usage",
    "transcript_attempts",
    "transcript_jobs",
    "transcript_segments",
    "transcript_sources",
  ];
  const actual = new Set((database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
  ).all() as Array<{ name: string }>).map((row) => row.name));
  if (required.some((name) => !actual.has(name))) fail("SQLite evidence lacks a required frozen table");
}

function assertSourceProvenance(
  value: unknown,
  input: A1DatabaseValidationInput,
  policyId: string,
  normalizedCharacterCount: number,
): void {
  if (typeof value !== "string") fail("transcript-source provenance is not JSON text");
  let parsed: unknown;
  try {
    parsed = parseJsonWithoutDuplicateKeys(value);
  } catch {
    return fail("transcript-source provenance JSON is ambiguous or invalid");
  }
  const expected = {
    input_type: "file",
    policy_decision_id: policyId,
    original_filename: basename(input.sourcePrivateRelativePath),
    extension: `.${input.format}`,
    content_type: input.format === "vtt" ? "text/vtt" : "application/x-subrip",
    byte_count: input.sourceByteCount,
    parser_version: TRANSCRIPT_FILE_PARSER_VERSION,
    timestamp_mode: "timestamped",
    normalized_char_count: normalizedCharacterCount,
    segment_count: input.expectedCueCount,
    retention_class: "full_text_allowed",
  };
  if (canonicalJson(parsed) !== canonicalJson(expected)) {
    fail("transcript-source provenance differs from the sealed file authority");
  }
}

function rows(database: Database.Database, sql: string): Row[] {
  return database.prepare(sql).all() as Row[];
}

function count(database: Database.Database, sql: string): number {
  const row = database.prepare(sql).get() as { count?: unknown } | undefined;
  if (!row || !Number.isSafeInteger(row.count) || (row.count as number) < 0) {
    fail("SQLite evidence count is invalid");
  }
  return row.count as number;
}

function stringField(row: Row, field: string): string {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) fail("SQLite identity field is invalid");
  return value;
}

function tokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  )).join(",")}}`;
}

function isSafeRelativePath(value: string): boolean {
  return value.length > 0
    && !value.startsWith("/")
    && !value.includes("\\")
    && !value.includes("\0")
    && value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function fail(message: string): never {
  throw new A1DatabaseEvidenceError(message);
}
