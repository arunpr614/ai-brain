import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  link,
  mkdir,
  open,
  readFile,
  readdir,
  realpath,
  unlink,
} from "node:fs/promises";
import path from "node:path";

import {
  parseLockedA1Attestation,
  type A1Attestation,
} from "../../spikes/a1-harness/attestation";
import {
  evaluatePrivateA1,
  parseA1PrivateScorerOptionsBytes,
  serializeA1PrivateScore,
  type A1PrivateScoreSummary,
  type A1PrivateScorerOptions,
} from "./score-private-a1";
import {
  preflightSubtitleBytes,
  SubtitlePreflightError,
} from "./subtitle-preflight";
import {
  parseJsonBytesWithoutDuplicateKeys,
  type LockVerificationReport,
} from "./verify-lock";
import {
  A1_ATTEMPT_RESIDUAL_LIMITATION,
  A1_ATTEMPT_UNIQUENESS_SCOPE,
  A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
  A1_OPERATOR_VERSION,
  A1_PRIMARY_ITEM_IDS,
  parseA1AttemptClaim,
  type A1AttemptClaim,
  type A1ExecutionBoundary,
} from "./run-sealed-a1-cell";
import {
  A1_DATABASE_MAX_BYTES,
  validateA1Database,
} from "./validate-a1-database";
import { validateA1SealedAuthoritySemantics } from "./validate-a1-sealed-authority";

export const GATE3_EVIDENCE_GENERATOR_VERSION = "1.1.0";
export const GATE3_RESULT_SCHEMA_ID =
  "https://brain.arunp.in/schemas/youtube-gate-3-result-v2.1.json";
export const GATE3_RESULT_RELATIVE_PATH =
  "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json";

export const GATE3_POSITIVE_ITEM_IDS = Object.freeze([
  "YT-01",
  "YT-02",
  "YT-07",
  "YT-08",
  "YT-09",
] as const);
export const GATE1_REJECTION_ITEM_IDS = Object.freeze([
  "YT-03",
  "YT-04",
  "YT-05",
  "YT-06",
] as const);

type PositiveItemId = (typeof GATE3_POSITIVE_ITEM_IDS)[number];
type RejectionItemId = (typeof GATE1_REJECTION_ITEM_IDS)[number];
type JsonObject = Record<string, unknown>;

const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const REFERENCE_LEDGER_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/benchmark/REFERENCE_LEDGER.json`;
const METHOD_MATRIX_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/benchmark/METHOD_ITEM_MATRIX.json`;
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_SHA_RE = /^[0-9a-f]{40}$/;
const RFC3339_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const MAX_JSON_BYTES = 10_000_000;
const MAX_SUBTITLE_BYTES = 2_000_000;
const MAX_DATABASE_BYTES = A1_DATABASE_MAX_BYTES;
const CURRENT_PRODUCT_GAP_CODES = Object.freeze([
  "attestation_not_collected_or_enforced_by_current_service",
  "permissive_parser_requires_harness_preflight",
  "retention_and_derivation_not_runtime_enforced",
  "legacy_recovery_queue_coupled_to_youtube_item_insert",
  "normalized_contract_not_fully_persisted",
] as const);

interface LedgerItem {
  item_id: string;
  reference_role: "a1_input_preservation_oracle" | "a1_safe_rejection_record";
  attestation_sha256: string;
  source_raw_sha256: string;
  source_canonical_sha256: string | null;
  source_bytes: number;
  normalized_text_character_count: number | null;
  cue_count: number;
  declared_duration_ms: number;
  last_cue_end_ms: number;
  actual_anchor_count: number;
  base_anchor_target: number;
  preparation_document_sha256: string | null;
  preparation_private_relative_path: string | null;
  preflight_state: "passed" | "rejected";
  preflight_error_code: "INVALID_STRUCTURE" | null;
  preflight_failure_cue_ordinal: number | null;
  content_completeness_state: "complete" | "partial" | "unknown";
  expected_class: "eligible_supported" | "expected_safe_rejection";
  state: "ready" | "expected_structural_rejection" | "expected_supported_class_rejection";
}

interface AuthorityItem {
  ledger: LedgerItem;
  attestation: A1Attestation;
  attestationBytes: Buffer;
}

export interface Gate3SealBinding {
  contentCommit: string;
  sealCommit: string;
  lockSha256: string;
}

export interface Gate3PositiveEvidence {
  item_id: PositiveItemId;
  source_raw_sha256: string;
  gate_1_attempt_claim_sha256: string;
  gate_1_operator_receipt_sha256: string;
  gate_1_harness_report_sha256: string;
  gate_1_normalized_output_file_sha256: string;
  gate_1_score_options_sha256: string;
  gate_1_score_summary_sha256: string;
  gate_1_database_sha256: string;
  gate_3_repeat_attempt_claim_sha256: string;
  gate_3_repeat_operator_receipt_sha256: string;
  gate_3_repeat_harness_report_sha256: string;
  gate_3_repeat_normalized_output_file_sha256: string;
  gate_3_repeat_score_options_sha256: string;
  gate_3_repeat_score_summary_sha256: string;
  gate_3_repeat_database_sha256: string;
  model_input_private_root_relative_path: string;
  model_input_normalized_output_file_sha256: string;
  canonical_normalized_output_sha256: string;
  exact_run_1_repeat_model_input_file_hash_equal: true;
  canonical_output_comparison: "verified_equal";
  token_preservation_rate: number;
  timestamp_anchor_match_rate: number;
  source_to_normalized_timing_equal: true;
  provenance_equal: true;
  network_attempts: 0;
  provider_requests: 0;
}

export interface Gate1RejectionEvidence {
  item_id: RejectionItemId;
  source_raw_sha256: string;
  gate_1_attempt_claim_sha256: string;
  gate_1_operator_receipt_sha256: string;
  gate_1_harness_report_sha256: string;
  expected_outcome: "structural_rejection" | "supported_class_rejection";
  observed_outcome: "PREFLIGHT_REJECTED_INVALID_STRUCTURE" | "safe_rejection";
  private_normalized_output_absent: true;
  private_database_absent: true;
  network_attempts: 0;
  provider_requests: 0;
}

export interface Gate3Result {
  $schema: typeof GATE3_RESULT_SCHEMA_ID;
  schema_version: "2.1";
  generator_version: typeof GATE3_EVIDENCE_GENERATOR_VERSION;
  gate: "gate_3";
  state: "pass";
  claim_scope: "exact_five_sealed_a1_items_plus_four_gate_1_rejection_controls";
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  verified_lock: true;
  execution_boundary: A1ExecutionBoundary;
  publication_eligible: boolean;
  evidence_layout: {
    private_root_publication: "not_published";
    seal_relative_root: string;
    gate_1_primary_relative_root: string;
    gate_3_repeat_relative_root: string;
    operator_receipt_relative_root: string;
    attempt_claim_relative_root: string;
    attempt_terminal_relative_root: string;
    selection_policy: "fixed_seal_and_item_paths_no_caller_selected_evidence";
    model_input_policy: "exact_gate_1_primary_normalized_file";
    operator_receipt_policy: "mandatory_14_write_once_receipts_bound_to_same_seal_and_exact_evidence_hashes";
    attempt_claim_policy: "mandatory_14_canonical_repository_claims_bound_to_fixed_execution_contract_and_receipts";
    attempt_uniqueness_scope: typeof A1_ATTEMPT_UNIQUENESS_SCOPE;
    attempt_residual_limitation: typeof A1_ATTEMPT_RESIDUAL_LIMITATION;
  };
  denominators: {
    gate_1_positive_expected: 5;
    gate_1_positive_passed: 5;
    gate_1_rejection_expected: 4;
    gate_1_rejection_passed: 4;
    gate_3_repeat_expected: 5;
    gate_3_repeat_passed: 5;
  };
  gate_1_state: "pass";
  gate_3_state: "pass";
  network_attempts: 0;
  provider_requests: 0;
  created_at: string;
  items: Gate3PositiveEvidence[];
  rejection_controls: Gate1RejectionEvidence[];
}

export interface Gate3VerificationResult {
  documentSha256: string;
  contentCommit: string;
  sealCommit: string;
  gitBound: boolean;
  item: Gate3PositiveEvidence;
}

export class Gate3EvidenceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_AUTHORITY"
      | "INVALID_PRIVATE_ROOT"
      | "EVIDENCE_MISSING"
      | "EVIDENCE_PATH_INVALID"
      | "EVIDENCE_DUPLICATED"
      | "EVIDENCE_INVALID"
      | "GATE_1_FAILED"
      | "GATE_3_FAILED"
      | "RESULT_INVALID"
      | "RESULT_UNCOMMITTED"
      | "RESULT_ALREADY_EXISTS"
      | "RESULT_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "Gate3EvidenceError";
  }
}

interface PrivateEvidenceContext {
  root: string;
  identities: Map<string, string>;
}

interface EvidenceBytes {
  bytes: Buffer;
  sha256: string;
  relativePath: string;
  absolutePath: string;
}

interface OperatorReceipt {
  schema_version: "1.1";
  operator_version: typeof A1_OPERATOR_VERSION;
  seal: {
    content_commit: string;
    seal_commit: string;
    lock_sha256: string;
  };
  cell: {
    stage: "gate1-primary" | "gate3-repeat";
    item_id: string;
    expected_outcome: "eligible_pass" | "supported_class_safe_rejection" | "structural_safe_rejection";
  };
  execution_boundary: A1ExecutionBoundary;
  publication_eligible: boolean;
  attempt_claim_sha256: string;
  process: {
    harness_exit_code: number;
    scorer_exit_code: number | null;
  };
  hashes: {
    harness_report_sha256: string;
    normalized_transcript_sha256: string | null;
    scorer_options_sha256: string | null;
    scorer_report_sha256: string | null;
    database_sha256: string | null;
  };
  outcomes: {
    expected_outcome_observed: true;
    rerun_policy: "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write";
    selection_policy: "fixed_seal_stage_item_paths_no_caller_selected_evidence";
  };
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonObject, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => allowed.has(key));
}

function requireObject(value: unknown, label: string): JsonObject {
  if (!isObject(value)) throw new Gate3EvidenceError("EVIDENCE_INVALID", `${label} must be an object`);
  return value;
}

function requireSha(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256_RE.test(value) || /^0{64}$/.test(value)) {
    throw new Gate3EvidenceError("EVIDENCE_INVALID", `${label} must be a non-sentinel SHA-256`);
  }
  return value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as JsonObject;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function parseStrictJson(bytes: Buffer, label: string): unknown {
  try {
    return parseJsonBytesWithoutDuplicateKeys(bytes);
  } catch {
    throw new Gate3EvidenceError("EVIDENCE_INVALID", `${label} is not unambiguous JSON`);
  }
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function assertSafeRelative(relativePath: string): void {
  if (
    relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", "private evidence uses an unsafe relative path");
  }
}

async function preparePrivateEvidenceContext(projectRoot: string, suppliedRoot: string): Promise<PrivateEvidenceContext> {
  if (!path.isAbsolute(suppliedRoot)) {
    throw new Gate3EvidenceError("INVALID_PRIVATE_ROOT", "private evidence root must be absolute");
  }
  const [rootInfo, rootReal, projectReal] = await Promise.all([
    lstat(suppliedRoot).catch(() => null),
    realpath(suppliedRoot).catch(() => ""),
    realpath(projectRoot).catch(() => ""),
  ]);
  if (
    !rootInfo
    || !rootInfo.isDirectory()
    || rootInfo.isSymbolicLink()
    || (rootInfo.mode & 0o077) !== 0
    || rootReal === ""
    || projectReal === ""
    || rootReal === projectReal
    || isWithin(projectReal, rootReal)
    || isWithin(rootReal, projectReal)
  ) {
    throw new Gate3EvidenceError(
      "INVALID_PRIVATE_ROOT",
      "private evidence root must be a mode-0700 non-symlink directory outside the repository",
    );
  }
  return { root: rootReal, identities: new Map() };
}

async function readPrivateEvidence(
  context: PrivateEvidenceContext,
  relativePath: string,
  maximumBytes: number,
  label: string,
): Promise<EvidenceBytes> {
  assertSafeRelative(relativePath);
  const absolute = path.join(context.root, ...relativePath.split("/"));
  const canonical = await realpath(absolute).catch(() => "");
  if (canonical === "" || canonical !== absolute || !isWithin(context.root, canonical)) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} is missing or traverses a link`);
  }
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate3EvidenceError("EVIDENCE_MISSING", `${label} is missing`);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size < 1 || info.size > maximumBytes || info.nlink !== 1) {
      throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} is not a bounded unique regular file`);
    }
    const identity = `${info.dev}:${info.ino}`;
    const prior = context.identities.get(identity);
    if (prior !== undefined) {
      throw new Gate3EvidenceError(
        "EVIDENCE_DUPLICATED",
        `${label} aliases another evidence role`,
      );
    }
    context.identities.set(identity, relativePath);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.byteLength !== info.size
      || after.size !== info.size
      || after.mtimeMs !== info.mtimeMs
      || after.ino !== info.ino
      || after.dev !== info.dev
    ) {
      throw new Gate3EvidenceError("EVIDENCE_INVALID", `${label} changed while it was read`);
    }
    return { bytes, sha256: sha256(bytes), relativePath, absolutePath: absolute };
  } finally {
    await handle.close();
  }
}

async function assertPrivateFileAbsent(context: PrivateEvidenceContext, relativePath: string, label: string): Promise<void> {
  assertSafeRelative(relativePath);
  if (await lstat(path.join(context.root, ...relativePath.split("/"))).catch(() => null)) {
    throw new Gate3EvidenceError("GATE_1_FAILED", `${label} must be absent for a rejection control`);
  }
}

async function readProjectJson(projectRoot: string, relativePath: string, label: string): Promise<unknown> {
  const absolute = path.join(projectRoot, ...relativePath.split("/"));
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate3EvidenceError("INVALID_AUTHORITY", `${label} is missing`);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size < 1 || info.size > MAX_JSON_BYTES) {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${label} is not a bounded regular file`);
    }
    return parseStrictJson(await handle.readFile(), label);
  } finally {
    await handle.close();
  }
}

function asLedgerItem(value: unknown, expectedId: string): LedgerItem {
  const item = requireObject(value, `reference ledger ${expectedId}`);
  if (item.item_id !== expectedId) {
    throw new Gate3EvidenceError("INVALID_AUTHORITY", "reference ledger item order is invalid");
  }
  for (const field of ["attestation_sha256", "source_raw_sha256"] as const) requireSha(item[field], `${expectedId} ${field}`);
  if (item.source_canonical_sha256 !== null) requireSha(item.source_canonical_sha256, `${expectedId} source canonical hash`);
  if (item.preparation_document_sha256 !== null) requireSha(item.preparation_document_sha256, `${expectedId} preparation hash`);
  for (const field of [
    "source_bytes", "cue_count", "declared_duration_ms", "last_cue_end_ms", "actual_anchor_count", "base_anchor_target",
  ] as const) {
    if (!Number.isSafeInteger(item[field]) || (item[field] as number) < 0) {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${expectedId} ${field} is invalid`);
    }
  }
  return item as unknown as LedgerItem;
}

async function loadAuthorities(projectRoot: string): Promise<Map<string, AuthorityItem>> {
  const [ledgerValue, matrixValue] = await Promise.all([
    readProjectJson(projectRoot, REFERENCE_LEDGER_RELATIVE_PATH, "reference ledger"),
    readProjectJson(projectRoot, METHOD_MATRIX_RELATIVE_PATH, "method/item matrix"),
  ]);
  const ledger = requireObject(ledgerValue, "reference ledger");
  const matrix = requireObject(matrixValue, "method/item matrix");
  if (!Array.isArray(ledger.items) || ledger.items.length !== 9 || !Array.isArray(matrix.items) || matrix.items.length !== 10) {
    throw new Gate3EvidenceError("INVALID_AUTHORITY", "sealed authorities do not contain the exact denominators");
  }
  const expectedNine = ["YT-01", "YT-02", "YT-03", "YT-04", "YT-05", "YT-06", "YT-07", "YT-08", "YT-09"];
  const expectedStates = new Map<string, string>([
    ["YT-01", "eligible_supported"], ["YT-02", "eligible_supported"],
    ["YT-03", "expected_structural_rejection"], ["YT-04", "expected_supported_class_rejection"],
    ["YT-05", "expected_structural_rejection"], ["YT-06", "expected_structural_rejection"],
    ["YT-07", "eligible_supported"], ["YT-08", "eligible_supported"], ["YT-09", "eligible_supported"],
    ["YT-10", "excluded_before_run_no_ingestible_sidecar"],
  ]);
  for (const [index, expectedId] of [...expectedNine, "YT-10"].entries()) {
    const matrixItem = requireObject(matrix.items[index], `matrix ${expectedId}`);
    if (matrixItem.item_id !== expectedId || matrixItem.a1_cell_state !== expectedStates.get(expectedId)) {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", "method/item matrix denominator or order is invalid");
    }
  }
  const result = new Map<string, AuthorityItem>();
  for (const [index, itemId] of expectedNine.entries()) {
    const ledgerItem = asLedgerItem(ledger.items[index], itemId);
    const attestationRelativePath = `${PROJECT_RELATIVE_ROOT}/benchmark/attestations/${itemId}.json`;
    const absolute = path.join(projectRoot, ...attestationRelativePath.split("/"));
    const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
    if (!handle) throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} attestation is missing`);
    let attestationBytes: Buffer;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size < 1 || info.size > 256_000) {
        throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} attestation is invalid`);
      }
      attestationBytes = await handle.readFile();
    } finally {
      await handle.close();
    }
    let attestation: A1Attestation;
    try {
      attestation = parseLockedA1Attestation(attestationBytes, ledgerItem.attestation_sha256).attestation;
    } catch {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} attestation does not match the sealed ledger`);
    }
    try {
      validateA1SealedAuthoritySemantics({ expectedItemId: itemId, ledger: ledgerItem, attestation });
    } catch {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} attestation and ledger semantics differ`);
    }
    result.set(itemId, { ledger: ledgerItem, attestation, attestationBytes });
  }
  return result;
}

function assertRuntimeEvidence(value: unknown): void {
  const runtime = requireObject(value, "A1 harness runtime evidence");
  if (
    !exactKeys(runtime, ["suppressed_console_count", "suppressed_console_sha256"])
    || !Number.isSafeInteger(runtime.suppressed_console_count)
    || (runtime.suppressed_console_count as number) < 0
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "A1 harness runtime evidence is invalid");
  requireSha(runtime.suppressed_console_sha256, "A1 suppressed console hash");
  if (runtime.suppressed_console_count === 0 && runtime.suppressed_console_sha256 !== EMPTY_SHA256) {
    throw new Gate3EvidenceError("GATE_1_FAILED", "empty suppressed console evidence has the wrong hash");
  }
}

function assertKnownProductBoundary(value: unknown): void {
  const outcomes = requireObject(value, "A1 outcomes");
  const currentProduct = requireObject(outcomes.current_product, "A1 current-product outcome");
  if (
    !exactKeys(currentProduct, ["ready", "known_gap_codes"])
    || currentProduct.ready !== false
    || !Array.isArray(currentProduct.known_gap_codes)
    || canonicalJson(currentProduct.known_gap_codes) !== canonicalJson(CURRENT_PRODUCT_GAP_CODES)
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "A1 current-product boundary is invalid");
}

function reproducePreflight(
  rawBytes: Buffer,
  authority: AuthorityItem,
): ReturnType<typeof preflightSubtitleBytes> {
  try {
    return preflightSubtitleBytes(rawBytes, {
      format: authority.attestation.input_contract.format,
      declaredDurationMs: authority.ledger.declared_duration_ms,
      expectedRawSha256: authority.ledger.source_raw_sha256,
      expectedCueCount: authority.ledger.cue_count,
      inputFileIntegrityAttested: true,
      contentCompleteness: authority.attestation.input_contract.content_completeness.state,
      contentCompletenessBasis: authority.attestation.input_contract.content_completeness.basis,
    });
  } catch {
    throw new Gate3EvidenceError("GATE_1_FAILED", "scoreable source did not reproduce its sealed preflight");
  }
}

function assertPositiveHarnessReport(
  bytes: Buffer,
  authority: AuthorityItem,
  normalized: EvidenceBytes,
  lockSha256: string,
  preflight: ReturnType<typeof preflightSubtitleBytes>,
): void {
  const report = requireObject(parseStrictJson(bytes, "eligible A1 harness report"), "eligible A1 harness report");
  if (
    !exactKeys(report, [
      "schema_version", "harness_version", "execution_class", "claim_scope", "status", "hashes", "counts",
      "versions", "classification", "network_attempts", "outcomes", "runtime",
    ])
    || report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.execution_class !== "SEALED"
    || report.claim_scope !== "locked_cell_only"
    || report.status !== "pass"
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 harness report contract failed");
  const hashes = requireObject(report.hashes, "eligible A1 hashes");
  if (
    !exactKeys(hashes, [
      "attestation_sha256", "attestation_schema_sha256", "input_sha256", "video_id_sha256",
      "preflight_canonical_sha256", "expected_segments_sha256", "persisted_segments_sha256",
      "normalized_transcript_sha256", "normalized_transcript_schema_sha256", "benchmark_lock_sha256",
    ])
    || hashes.attestation_sha256 !== authority.ledger.attestation_sha256
    || hashes.input_sha256 !== authority.ledger.source_raw_sha256
    || hashes.preflight_canonical_sha256 !== authority.ledger.source_canonical_sha256
    || hashes.normalized_transcript_sha256 !== normalized.sha256
    || hashes.benchmark_lock_sha256 !== lockSha256
    || hashes.expected_segments_sha256 !== hashes.persisted_segments_sha256
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 report hashes do not bind the sealed inputs and output");
  for (const key of [
    "attestation_schema_sha256", "video_id_sha256", "expected_segments_sha256", "persisted_segments_sha256",
    "normalized_transcript_schema_sha256",
  ]) requireSha(hashes[key], `eligible A1 ${key}`);
  if (hashes.video_id_sha256 !== sha256(authority.attestation.youtube_video_id)) {
    throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 video identity differs");
  }
  const counts = requireObject(report.counts, "eligible A1 counts");
  if (
    !exactKeys(counts, [
      "attestation_part_count", "raw_byte_count", "normalized_text_character_count",
      "locked_cue_count", "declared_duration_ms", "last_cue_end_ms", "persisted_segment_count",
      "overlap_count", "exact_duplicate_count", "recovery_job_count",
      "transcript_provider_attempt_count", "enrichment_provider_attempt_count",
      "llm_provider_attempt_count", "provider_attempt_count", "network_attempt_count",
      "current_product_gap_count",
    ])
    || counts.attestation_part_count !== 6
    || counts.overlap_count !== preflight.overlapCount
    || counts.exact_duplicate_count !== preflight.exactDuplicateCount
    || counts.raw_byte_count !== authority.ledger.source_bytes
    || counts.normalized_text_character_count !== authority.ledger.normalized_text_character_count
    || counts.locked_cue_count !== authority.ledger.cue_count
    || counts.declared_duration_ms !== authority.ledger.declared_duration_ms
    || counts.last_cue_end_ms !== authority.ledger.last_cue_end_ms
    || counts.persisted_segment_count !== authority.ledger.cue_count
    || counts.recovery_job_count !== 1
    || counts.transcript_provider_attempt_count !== 0
    || counts.enrichment_provider_attempt_count !== 0
    || counts.llm_provider_attempt_count !== 0
    || counts.provider_attempt_count !== 0
    || counts.network_attempt_count !== 0
    || counts.current_product_gap_count !== CURRENT_PRODUCT_GAP_CODES.length
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 report counts failed the Gate 1 oracle");
  const classification = requireObject(report.classification, "eligible A1 classification");
  const versions = requireObject(report.versions, "eligible A1 versions");
  if (
    !exactKeys(classification, ["locked", "observed", "content_completeness", "content_completeness_basis"])
    || !exactKeys(versions, ["strict_preflight", "app_file_parser"])
    || classification.locked !== "eligible_supported"
    || classification.observed !== "eligible_supported"
    || classification.content_completeness !== authority.attestation.input_contract.content_completeness.state
    || classification.content_completeness_basis !== authority.attestation.input_contract.content_completeness.basis
    || versions.strict_preflight !== "1.0.0"
    || versions.app_file_parser !== "transcript-file-v1"
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 classification differs from the sealed cell");
  const outcomes = requireObject(report.outcomes, "eligible A1 outcomes");
  const isolated = requireObject(outcomes.isolated_a1_strategy, "eligible A1 isolated outcome");
  if (
    !exactKeys(outcomes, ["isolated_a1_strategy", "current_product"])
    || !exactKeys(isolated, [
      "ingestion_invoked", "feasible", "exact_segment_match", "no_network_attempt", "no_provider_attempt",
    ])
    || isolated.ingestion_invoked !== true
    || isolated.feasible !== true
    || isolated.exact_segment_match !== true
    || isolated.no_network_attempt !== true
    || isolated.no_provider_attempt !== true
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "eligible A1 isolated outcome failed");
  assertKnownProductBoundary(outcomes);
  assertRuntimeEvidence(report.runtime);
}

function assertSafeRejectionReport(
  bytes: Buffer,
  authority: AuthorityItem,
  lockSha256: string,
  preflight: ReturnType<typeof preflightSubtitleBytes>,
): void {
  const report = requireObject(parseStrictJson(bytes, "safe-rejection harness report"), "safe-rejection harness report");
  if (
    !exactKeys(report, [
      "schema_version", "harness_version", "execution_class", "claim_scope", "status", "hashes", "counts",
      "versions", "classification", "network_attempts", "outcomes", "runtime",
    ])
    || report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.execution_class !== "SEALED"
    || report.claim_scope !== "locked_cell_only"
    || report.status !== "safe_rejection"
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "supported-class rejection report contract failed");
  const hashes = requireObject(report.hashes, "safe-rejection hashes");
  if (
    !exactKeys(hashes, [
      "attestation_sha256", "attestation_schema_sha256", "input_sha256", "video_id_sha256",
      "preflight_canonical_sha256", "normalized_transcript_schema_sha256", "benchmark_lock_sha256",
    ])
    || hashes.attestation_sha256 !== authority.ledger.attestation_sha256
    || hashes.input_sha256 !== authority.ledger.source_raw_sha256
    || hashes.preflight_canonical_sha256 !== authority.ledger.source_canonical_sha256
    || hashes.benchmark_lock_sha256 !== lockSha256
    || hashes.video_id_sha256 !== sha256(authority.attestation.youtube_video_id)
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "safe-rejection hashes differ from the sealed cell");
  requireSha(hashes.attestation_schema_sha256, "safe-rejection attestation schema hash");
  requireSha(hashes.normalized_transcript_schema_sha256, "safe-rejection normalized schema hash");
  const counts = requireObject(report.counts, "safe-rejection counts");
  if (
    !exactKeys(counts, [
      "attestation_part_count", "raw_byte_count", "normalized_text_character_count",
      "locked_cue_count", "declared_duration_ms", "last_cue_end_ms", "overlap_count",
      "exact_duplicate_count", "persisted_segment_count", "recovery_job_count",
      "enrichment_provider_attempt_count", "provider_attempt_count", "network_attempt_count",
      "current_product_gap_count",
    ])
    || counts.attestation_part_count !== 6
    || counts.overlap_count !== preflight.overlapCount
    || counts.exact_duplicate_count !== preflight.exactDuplicateCount
    || counts.raw_byte_count !== authority.ledger.source_bytes
    || counts.normalized_text_character_count !== authority.ledger.normalized_text_character_count
    || counts.locked_cue_count !== authority.ledger.cue_count
    || counts.declared_duration_ms !== authority.ledger.declared_duration_ms
    || counts.last_cue_end_ms !== authority.ledger.last_cue_end_ms
    || counts.persisted_segment_count !== 0
    || counts.recovery_job_count !== 0
    || counts.enrichment_provider_attempt_count !== 0
    || counts.provider_attempt_count !== 0
    || counts.network_attempt_count !== 0
    || counts.current_product_gap_count !== CURRENT_PRODUCT_GAP_CODES.length
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "safe-rejection counts failed the Gate 1 oracle");
  const classification = requireObject(report.classification, "safe-rejection classification");
  const versions = requireObject(report.versions, "safe-rejection versions");
  if (
    !exactKeys(classification, ["locked", "observed", "content_completeness", "content_completeness_basis"])
    || !exactKeys(versions, ["strict_preflight"])
    || classification.locked !== "expected_safe_rejection"
    || classification.observed !== "expected_safe_rejection"
    || classification.content_completeness !== authority.attestation.input_contract.content_completeness.state
    || classification.content_completeness_basis !== authority.attestation.input_contract.content_completeness.basis
    || versions.strict_preflight !== "1.0.0"
  ) {
    throw new Gate3EvidenceError("GATE_1_FAILED", "safe-rejection classification is invalid");
  }
  const outcomes = requireObject(report.outcomes, "safe-rejection outcomes");
  const isolated = requireObject(outcomes.isolated_a1_strategy, "safe-rejection isolated outcome");
  if (
    !exactKeys(outcomes, ["isolated_a1_strategy", "current_product"])
    || !exactKeys(isolated, [
      "ingestion_invoked", "truthful_safe_rejection", "no_network_attempt", "no_provider_attempt",
    ])
    || isolated.ingestion_invoked !== false
    || isolated.truthful_safe_rejection !== true
    || isolated.no_network_attempt !== true
    || isolated.no_provider_attempt !== true
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "safe-rejection outcome is invalid");
  assertKnownProductBoundary(outcomes);
  assertRuntimeEvidence(report.runtime);
}

function assertStructuralRejectionReport(bytes: Buffer): void {
  const report = requireObject(parseStrictJson(bytes, "structural-rejection harness report"), "structural-rejection harness report");
  if (
    !exactKeys(report, ["schema_version", "harness_version", "status", "error_code", "detail_code", "counts", "hashes", "network_attempts"])
    || report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.status !== "fail"
    || report.error_code !== "PREFLIGHT_REJECTED"
    || report.detail_code !== "INVALID_STRUCTURE"
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "structural-rejection report contract failed");
  const counts = requireObject(report.counts, "structural-rejection counts");
  const hashes = requireObject(report.hashes, "structural-rejection hashes");
  if (
    !exactKeys(counts, ["network_attempt_count", "suppressed_console_count"])
    || counts.network_attempt_count !== 0
    || !Number.isSafeInteger(counts.suppressed_console_count)
    || (counts.suppressed_console_count as number) < 0
    || !exactKeys(hashes, ["suppressed_console_sha256"])
  ) throw new Gate3EvidenceError("GATE_1_FAILED", "structural-rejection report counters are invalid");
  requireSha(hashes.suppressed_console_sha256, "structural-rejection suppressed console hash");
}

function assertNormalizedIdentity(bytes: Buffer, authority: AuthorityItem): void {
  const normalized = requireObject(parseStrictJson(bytes, "normalized transcript"), "normalized transcript");
  const provenance = requireObject(normalized.provenance, "normalized provenance");
  if (
    normalized.item_id !== authority.attestation.item_id
    || normalized.youtube_video_id !== authority.attestation.youtube_video_id
    || provenance.source_page_url !== authority.attestation.source.source_page_url
    || provenance.source_asset_url !== authority.attestation.source.sidecar_url
    || provenance.input_sha256 !== authority.ledger.source_raw_sha256
  ) throw new Gate3EvidenceError("GATE_3_FAILED", "normalized transcript identity or provenance differs from the sealed attestation");
}

function assertDatabaseEvidence(
  database: EvidenceBytes,
  normalized: EvidenceBytes,
  authority: AuthorityItem,
): void {
  try {
    validateA1Database({
      databasePath: database.absolutePath,
      normalizedTranscriptBytes: normalized.bytes,
      itemId: authority.attestation.item_id,
      youtubeVideoId: authority.attestation.youtube_video_id,
      language: authority.attestation.input_contract.language_tag,
      format: authority.attestation.input_contract.format,
      declaredDurationMs: authority.ledger.declared_duration_ms,
      expectedCueCount: authority.ledger.cue_count,
      sourcePrivateRelativePath: authority.attestation.source.private_relative_path,
      sourcePageUrl: authority.attestation.source.source_page_url,
      sourceAssetUrl: authority.attestation.source.sidecar_url,
      sourceRawSha256: authority.ledger.source_raw_sha256,
      sourceByteCount: authority.ledger.source_bytes,
    });
  } catch {
    throw new Gate3EvidenceError(
      "GATE_3_FAILED",
      `${authority.attestation.item_id} SQLite evidence differs from the frozen semantic contract`,
    );
  }
}

function assertOptions(
  options: A1PrivateScorerOptions,
  authority: AuthorityItem,
  normalizedHash: string,
  anchorHash: string,
  comparison: string | null,
): void {
  const contract = authority.attestation.input_contract;
  if (
    options.format !== contract.format
    || options.declared_duration_ms !== contract.declared_duration_ms
    || options.expected_raw_sha256 !== authority.ledger.source_raw_sha256
    || options.expected_cue_count !== contract.expected_cue_count
    || options.input_file_integrity_attested !== true
    || options.content_completeness !== contract.content_completeness.state
    || options.content_completeness_basis !== contract.content_completeness.basis
    || options.reference_role !== "a1_input_preservation_oracle"
    || options.expected_anchor_packet_sha256 !== anchorHash
    || options.expected_normalized_transcript_sha256 !== normalizedHash
    || options.comparison_canonical_output_sha256 !== comparison
  ) throw new Gate3EvidenceError("GATE_3_FAILED", "A1 score options do not bind the exact sealed evidence role");
}

function recomputeScore(
  raw: Buffer,
  anchors: Buffer,
  normalized: Buffer,
  optionsBytes: Buffer,
  summaryBytes: Buffer,
): { options: A1PrivateScorerOptions; summary: A1PrivateScoreSummary } {
  let options: A1PrivateScorerOptions;
  let summary: A1PrivateScoreSummary;
  try {
    options = parseA1PrivateScorerOptionsBytes(optionsBytes);
    summary = evaluatePrivateA1(raw, anchors, normalized, options);
  } catch {
    throw new Gate3EvidenceError("GATE_3_FAILED", "frozen A1 scorer could not reproduce the score evidence");
  }
  if (!summaryBytes.equals(Buffer.from(serializeA1PrivateScore(summary), "utf8"))) {
    throw new Gate3EvidenceError("GATE_3_FAILED", "score-summary bytes differ from deterministic scorer output");
  }
  return { options, summary };
}

function primaryRelativeRoot(sealCommit: string): string {
  return `outputs/${sealCommit}/gate1-primary`;
}

function repeatRelativeRoot(sealCommit: string): string {
  return `outputs/${sealCommit}/gate3-repeat`;
}

function cellPath(stageRoot: string, itemId: string, fileName: string): string {
  return `${stageRoot}/${itemId}/${fileName}`;
}

function receiptPath(sealCommit: string, stage: "gate1-primary" | "gate3-repeat", itemId: string): string {
  return `outputs/${sealCommit}/operator-receipts/${stage}/${itemId}.publication-safe.json`;
}

function claimRelativePath(
  sealCommit: string,
  stage: "gate1-primary" | "gate3-repeat",
  itemId: string,
): string {
  return `${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-claims/${sealCommit}/${stage}/${itemId}.publication-safe.json`;
}

function terminalRelativePath(
  sealCommit: string,
  stage: "gate1-primary" | "gate3-repeat",
  itemId: string,
): string {
  return `${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-terminals/${sealCommit}/${stage}/${itemId}.publication-safe.json`;
}

async function readAttemptClaim(
  projectRoot: string,
  binding: Gate3SealBinding,
  stage: "gate1-primary" | "gate3-repeat",
  itemId: string,
  expectedOutcome: A1AttemptClaim["cell"]["expected_outcome"],
  executionBoundary: A1ExecutionBoundary,
): Promise<{ claim: A1AttemptClaim; sha256: string }> {
  const relativePath = claimRelativePath(binding.sealCommit, stage, itemId);
  const absolute = path.join(projectRoot, ...relativePath.split("/"));
  const canonical = await realpath(absolute).catch(() => "");
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => "");
  const expectedCanonical = canonicalProjectRoot === ""
    ? ""
    : path.join(canonicalProjectRoot, ...relativePath.split("/"));
  if (canonical !== expectedCanonical) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${itemId} ${stage} attempt claim is missing or linked`);
  }
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate3EvidenceError("EVIDENCE_MISSING", `${itemId} ${stage} attempt claim is missing`);
  let bytes: Buffer;
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.nlink !== 1 || info.size < 1 || info.size > MAX_JSON_BYTES) {
      throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${itemId} ${stage} attempt claim is not unique and bounded`);
    }
    bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.dev !== info.dev || after.ino !== info.ino || after.size !== info.size || after.mtimeMs !== info.mtimeMs) {
      throw new Gate3EvidenceError("EVIDENCE_INVALID", `${itemId} ${stage} attempt claim changed while read`);
    }
  } finally {
    await handle.close();
  }
  let claim: A1AttemptClaim;
  try {
    claim = parseA1AttemptClaim(bytes);
  } catch {
    throw new Gate3EvidenceError("EVIDENCE_INVALID", `${itemId} ${stage} attempt claim contract is invalid`);
  }
  if (
    claim.seal.content_commit !== binding.contentCommit
    || claim.seal.seal_commit !== binding.sealCommit
    || claim.seal.lock_sha256 !== binding.lockSha256
    || claim.cell.stage !== stage
    || claim.cell.item_id !== itemId
    || claim.cell.expected_outcome !== expectedOutcome
    || claim.execution_contract.identity_sha256 !== A1_EXECUTION_CONTRACT_IDENTITY_SHA256
    || claim.execution_contract.execution_boundary !== executionBoundary
    || claim.publication_eligible !== (executionBoundary === "sealed_default_dependencies")
  ) throw new Gate3EvidenceError("EVIDENCE_INVALID", `${itemId} ${stage} attempt claim does not bind the sealed cell`);
  const terminalAbsolute = path.join(
    projectRoot,
    ...terminalRelativePath(binding.sealCommit, stage, itemId).split("/"),
  );
  if (await inspectCanonicalPathPrefix(projectRoot, terminalAbsolute, `${itemId} ${stage} terminal path`)) {
    throw new Gate3EvidenceError("GATE_1_FAILED", `${itemId} ${stage} has a canonical failure terminal`);
  }
  return { claim, sha256: sha256(bytes) };
}

async function inspectCanonicalPathPrefix(
  canonicalRoot: string,
  absolutePath: string,
  label: string,
): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  const suppliedRoot = path.resolve(canonicalRoot);
  const realRoot = await realpath(suppliedRoot).catch(() => "");
  if (realRoot === "") {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} has no canonical root`);
  }
  const relativePath = path.relative(suppliedRoot, path.resolve(absolutePath));
  if (
    relativePath === ""
    || relativePath.startsWith("..")
    || path.isAbsolute(relativePath)
  ) throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} escapes its canonical root`);
  let current = realRoot;
  const segments = relativePath.split(path.sep);
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const info = await lstat(current).catch(() => null);
    if (!info) return null;
    const canonical = await realpath(current).catch(() => "");
    if (
      info.isSymbolicLink()
      || canonical !== current
      || (index < segments.length - 1 && !info.isDirectory())
    ) throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} contains a linked or noncanonical ancestor`);
    if (index === segments.length - 1) return info;
  }
  return null;
}

async function assertExactDirectory(
  directory: string,
  expected: ReadonlyMap<string, "file" | "directory">,
  label: string,
): Promise<void> {
  const info = await lstat(directory).catch(() => null);
  const canonical = await realpath(directory).catch(() => "");
  if (!info || !info.isDirectory() || info.isSymbolicLink() || canonical !== directory) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} is missing, linked, or not a directory`);
  }
  const entries = await readdir(directory, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expectedNames = [...expected.keys()].sort();
  if (canonicalJson(names) !== canonicalJson(expectedNames)) {
    throw new Gate3EvidenceError("EVIDENCE_INVALID", `${label} has a missing or additional entry`);
  }
  for (const entry of entries) {
    const kind = expected.get(entry.name);
    if (
      entry.isSymbolicLink()
      || (kind === "file" && !entry.isFile())
      || (kind === "directory" && !entry.isDirectory())
    ) throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} contains an entry of the wrong type`);
  }
}

function expectedFiles(names: readonly string[]): ReadonlyMap<string, "file"> {
  return new Map(names.map((name) => [name, "file"] as const));
}

function expectedDirectories(names: readonly string[]): ReadonlyMap<string, "directory"> {
  return new Map(names.map((name) => [name, "directory"] as const));
}

async function assertExactGate3EvidenceLayout(
  projectRoot: string,
  privateRoot: string,
  sealCommit: string,
): Promise<void> {
  const allItemIds = [
    "YT-01", "YT-02", "YT-03", "YT-04", "YT-05", "YT-06", "YT-07", "YT-08", "YT-09",
  ];
  const canonicalProjectRoot = await realpath(projectRoot).catch(() => "");
  if (canonicalProjectRoot === "") {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", "project root is missing or noncanonical");
  }
  const claimSealRoot = path.join(
    canonicalProjectRoot,
    ...`${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-claims/${sealCommit}`.split("/"),
  );
  await assertExactDirectory(
    claimSealRoot,
    expectedDirectories(["gate1-primary", "gate3-repeat"]),
    "seal-scoped attempt-claim root",
  );
  await assertExactDirectory(
    path.join(claimSealRoot, "gate1-primary"),
    expectedFiles(allItemIds.map((itemId) => `${itemId}.publication-safe.json`)),
    "Gate 1 attempt-claim denominator",
  );
  await assertExactDirectory(
    path.join(claimSealRoot, "gate3-repeat"),
    expectedFiles(GATE3_POSITIVE_ITEM_IDS.map((itemId) => `${itemId}.publication-safe.json`)),
    "Gate 3 attempt-claim denominator",
  );

  const terminalSealRoot = path.join(
    canonicalProjectRoot,
    ...`${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-terminals/${sealCommit}`.split("/"),
  );
  const terminalInfo = await inspectCanonicalPathPrefix(
    canonicalProjectRoot,
    terminalSealRoot,
    "seal-scoped attempt-terminal root",
  );
  if (terminalInfo) {
    await assertExactDirectory(
      terminalSealRoot,
      new Map(),
      "seal-scoped attempt-terminal root",
    );
  }

  const outputs = path.join(privateRoot, "outputs", sealCommit);
  await assertExactDirectory(
    outputs,
    expectedDirectories(["gate1-primary", "gate3-repeat", "operator-receipts"]),
    "private seal-scoped output root",
  );
  const gate1Root = path.join(outputs, "gate1-primary");
  const repeatRoot = path.join(outputs, "gate3-repeat");
  await assertExactDirectory(gate1Root, expectedDirectories(allItemIds), "private Gate 1 denominator");
  await assertExactDirectory(
    repeatRoot,
    expectedDirectories(GATE3_POSITIVE_ITEM_IDS),
    "private Gate 3 denominator",
  );
  const positiveCellFiles = expectedFiles([
    "a1-normalized-transcript.private.json",
    "a1-score-options.private.json",
    "a1-score.publication-safe.json",
    "harness-report.publication-safe.json",
    "throwaway.sqlite",
  ]);
  for (const itemId of GATE3_POSITIVE_ITEM_IDS) {
    await assertExactDirectory(path.join(gate1Root, itemId), positiveCellFiles, `${itemId} Gate 1 cell`);
    await assertExactDirectory(path.join(repeatRoot, itemId), positiveCellFiles, `${itemId} Gate 3 cell`);
  }
  for (const itemId of GATE1_REJECTION_ITEM_IDS) {
    await assertExactDirectory(
      path.join(gate1Root, itemId),
      expectedFiles(["harness-report.publication-safe.json"]),
      `${itemId} rejection cell`,
    );
  }
  const receipts = path.join(outputs, "operator-receipts");
  await assertExactDirectory(
    receipts,
    expectedDirectories(["gate1-primary", "gate3-repeat"]),
    "operator-receipt root",
  );
  await assertExactDirectory(
    path.join(receipts, "gate1-primary"),
    expectedFiles(allItemIds.map((itemId) => `${itemId}.publication-safe.json`)),
    "Gate 1 operator-receipt denominator",
  );
  await assertExactDirectory(
    path.join(receipts, "gate3-repeat"),
    expectedFiles(GATE3_POSITIVE_ITEM_IDS.map((itemId) => `${itemId}.publication-safe.json`)),
    "Gate 3 operator-receipt denominator",
  );
}

function parseOperatorReceipt(bytes: Buffer): OperatorReceipt {
  const root = requireObject(parseStrictJson(bytes, "sealed operator receipt"), "sealed operator receipt");
  if (
    !exactKeys(root, [
      "schema_version", "operator_version", "seal", "cell", "execution_boundary",
      "publication_eligible", "attempt_claim_sha256", "process", "hashes", "outcomes",
    ])
    || root.schema_version !== "1.1"
    || root.operator_version !== A1_OPERATOR_VERSION
  ) throw new Gate3EvidenceError("EVIDENCE_INVALID", "sealed operator receipt identity is invalid");
  const seal = requireObject(root.seal, "operator receipt seal");
  const cell = requireObject(root.cell, "operator receipt cell");
  const process = requireObject(root.process, "operator receipt process");
  const hashes = requireObject(root.hashes, "operator receipt hashes");
  const outcomes = requireObject(root.outcomes, "operator receipt outcomes");
  if (
    !exactKeys(seal, ["content_commit", "seal_commit", "lock_sha256"])
    || !exactKeys(cell, ["stage", "item_id", "expected_outcome"])
    || !exactKeys(process, ["harness_exit_code", "scorer_exit_code"])
    || !exactKeys(hashes, [
      "harness_report_sha256", "normalized_transcript_sha256", "scorer_options_sha256",
      "scorer_report_sha256", "database_sha256",
    ])
    || !exactKeys(outcomes, ["expected_outcome_observed", "rerun_policy", "selection_policy"])
    || !GIT_SHA_RE.test(String(seal.content_commit))
    || !GIT_SHA_RE.test(String(seal.seal_commit))
    || !SHA256_RE.test(String(seal.lock_sha256))
    || !["gate1-primary", "gate3-repeat"].includes(String(cell.stage))
    || typeof cell.item_id !== "string"
    || !["eligible_pass", "supported_class_safe_rejection", "structural_safe_rejection"].includes(String(cell.expected_outcome))
    || !Number.isSafeInteger(process.harness_exit_code)
    || (process.harness_exit_code as number) < 0
    || (process.scorer_exit_code !== null && (!Number.isSafeInteger(process.scorer_exit_code) || (process.scorer_exit_code as number) < 0))
    || outcomes.expected_outcome_observed !== true
    || outcomes.rerun_policy !== "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write"
    || outcomes.selection_policy !== "fixed_seal_stage_item_paths_no_caller_selected_evidence"
    || !["sealed_default_dependencies", "development_test_only"].includes(String(root.execution_boundary))
    || root.publication_eligible
      !== (root.execution_boundary === "sealed_default_dependencies")
  ) throw new Gate3EvidenceError("EVIDENCE_INVALID", "sealed operator receipt semantics are invalid");
  requireSha(root.attempt_claim_sha256, "operator receipt attempt-claim hash");
  requireSha(hashes.harness_report_sha256, "operator receipt harness-report hash");
  for (const key of [
    "normalized_transcript_sha256", "scorer_options_sha256", "scorer_report_sha256", "database_sha256",
  ] as const) {
    if (hashes[key] !== null) requireSha(hashes[key], `operator receipt ${key}`);
  }
  return root as unknown as OperatorReceipt;
}

function assertOperatorReceipt(input: {
  receipt: OperatorReceipt;
  binding: Gate3SealBinding;
  stage: "gate1-primary" | "gate3-repeat";
  itemId: string;
  expectedOutcome: OperatorReceipt["cell"]["expected_outcome"];
  executionBoundary: A1ExecutionBoundary;
  attemptClaimSha256: string;
  harnessReportHash: string;
  normalizedHash: string | null;
  scorerOptionsHash: string | null;
  scorerReportHash: string | null;
  databaseHash: string | null;
}): void {
  const expectedHarnessExit = input.expectedOutcome === "structural_safe_rejection" ? 1 : 0;
  const expectedScorerExit = input.expectedOutcome === "eligible_pass" ? 0 : null;
  if (
    input.receipt.seal.content_commit !== input.binding.contentCommit
    || input.receipt.seal.seal_commit !== input.binding.sealCommit
    || input.receipt.seal.lock_sha256 !== input.binding.lockSha256
    || input.receipt.cell.stage !== input.stage
    || input.receipt.cell.item_id !== input.itemId
    || input.receipt.cell.expected_outcome !== input.expectedOutcome
    || input.receipt.execution_boundary !== input.executionBoundary
    || input.receipt.publication_eligible
      !== (input.executionBoundary === "sealed_default_dependencies")
    || input.receipt.attempt_claim_sha256 !== input.attemptClaimSha256
    || input.receipt.process.harness_exit_code !== expectedHarnessExit
    || input.receipt.process.scorer_exit_code !== expectedScorerExit
    || input.receipt.hashes.harness_report_sha256 !== input.harnessReportHash
    || input.receipt.hashes.normalized_transcript_sha256 !== input.normalizedHash
    || input.receipt.hashes.scorer_options_sha256 !== input.scorerOptionsHash
    || input.receipt.hashes.scorer_report_sha256 !== input.scorerReportHash
    || input.receipt.hashes.database_sha256 !== input.databaseHash
  ) throw new Gate3EvidenceError("EVIDENCE_INVALID", "sealed operator receipt does not bind the exact run evidence and seal");
}

function assertSealBinding(binding: Gate3SealBinding): void {
  if (
    !GIT_SHA_RE.test(binding.contentCommit)
    || /^0{40}$/.test(binding.contentCommit)
    || !GIT_SHA_RE.test(binding.sealCommit)
    || /^0{40}$/.test(binding.sealCommit)
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 seal binding uses an invalid Git commit");
  requireSha(binding.lockSha256, "benchmark lock hash");
}

export function bindingFromLockReport(report: LockVerificationReport): Gate3SealBinding {
  return {
    contentCommit: report.contentCommit,
    sealCommit: report.sealCommit,
    lockSha256: report.lockSha256,
  };
}

export async function deriveGate3Result(options: {
  projectRoot: string;
  privateEvidenceRoot: string;
  binding: Gate3SealBinding;
  createdAt: string;
  executionBoundary?: A1ExecutionBoundary;
}): Promise<Gate3Result> {
  assertSealBinding(options.binding);
  const executionBoundary = options.executionBoundary ?? "sealed_default_dependencies";
  if (executionBoundary === "development_test_only" && !process.env.NODE_TEST_CONTEXT) {
    throw new Gate3EvidenceError("RESULT_INVALID", "development Gate 3 boundary requires node:test");
  }
  if (
    !RFC3339_RE.test(options.createdAt)
    || !Number.isFinite(Date.parse(options.createdAt))
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 creation time must be valid RFC 3339");
  const [authorities, privateContext] = await Promise.all([
    loadAuthorities(options.projectRoot),
    preparePrivateEvidenceContext(options.projectRoot, options.privateEvidenceRoot),
  ]);
  await assertExactGate3EvidenceLayout(
    options.projectRoot,
    privateContext.root,
    options.binding.sealCommit,
  );
  const primaryRoot = primaryRelativeRoot(options.binding.sealCommit);
  const repeatRoot = repeatRelativeRoot(options.binding.sealCommit);
  const positiveResults: Gate3PositiveEvidence[] = [];

  for (const itemId of GATE3_POSITIVE_ITEM_IDS) {
    const authority = authorities.get(itemId);
    if (!authority || authority.ledger.state !== "ready" || authority.ledger.expected_class !== "eligible_supported") {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} is not an eligible sealed authority`);
    }
    const gate1Claim = await readAttemptClaim(
      options.projectRoot,
      options.binding,
      "gate1-primary",
      itemId,
      "eligible_pass",
      executionBoundary,
    );
    const repeatClaim = await readAttemptClaim(
      options.projectRoot,
      options.binding,
      "gate3-repeat",
      itemId,
      "eligible_pass",
      executionBoundary,
    );
    const raw = await readPrivateEvidence(
      privateContext,
      authority.attestation.source.private_relative_path,
      MAX_SUBTITLE_BYTES,
      `${itemId} source input`,
    );
    if (raw.sha256 !== authority.ledger.source_raw_sha256 || raw.bytes.byteLength !== authority.ledger.source_bytes) {
      throw new Gate3EvidenceError("GATE_1_FAILED", `${itemId} source bytes differ from the sealed authority`);
    }
    const anchorRelativePath = authority.ledger.preparation_private_relative_path;
    if (!anchorRelativePath || !authority.ledger.preparation_document_sha256) {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} lacks its sealed private preservation reference`);
    }
    const anchors = await readPrivateEvidence(privateContext, anchorRelativePath, MAX_JSON_BYTES, `${itemId} anchors`);
    if (anchors.sha256 !== authority.ledger.preparation_document_sha256) {
      throw new Gate3EvidenceError("GATE_1_FAILED", `${itemId} anchor bytes differ from the sealed authority`);
    }

    const run1Report = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "harness-report.publication-safe.json"), MAX_JSON_BYTES, `${itemId} Gate 1 report`);
    const run1Normalized = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "a1-normalized-transcript.private.json"), MAX_JSON_BYTES, `${itemId} Gate 1 normalized output`);
    const run1Options = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "a1-score-options.private.json"), 64_000, `${itemId} Gate 1 score options`);
    const run1Score = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "a1-score.publication-safe.json"), MAX_JSON_BYTES, `${itemId} Gate 1 score`);
    const run1Database = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "throwaway.sqlite"), MAX_DATABASE_BYTES, `${itemId} Gate 1 database`);
    const run1Receipt = await readPrivateEvidence(
      privateContext,
      receiptPath(options.binding.sealCommit, "gate1-primary", itemId),
      MAX_JSON_BYTES,
      `${itemId} Gate 1 operator receipt`,
    );
    const repeatReport = await readPrivateEvidence(privateContext, cellPath(repeatRoot, itemId, "harness-report.publication-safe.json"), MAX_JSON_BYTES, `${itemId} Gate 3 report`);
    const repeatNormalized = await readPrivateEvidence(privateContext, cellPath(repeatRoot, itemId, "a1-normalized-transcript.private.json"), MAX_JSON_BYTES, `${itemId} Gate 3 normalized output`);
    const repeatOptions = await readPrivateEvidence(privateContext, cellPath(repeatRoot, itemId, "a1-score-options.private.json"), 64_000, `${itemId} Gate 3 score options`);
    const repeatScore = await readPrivateEvidence(privateContext, cellPath(repeatRoot, itemId, "a1-score.publication-safe.json"), MAX_JSON_BYTES, `${itemId} Gate 3 score`);
    const repeatDatabase = await readPrivateEvidence(privateContext, cellPath(repeatRoot, itemId, "throwaway.sqlite"), MAX_DATABASE_BYTES, `${itemId} Gate 3 database`);
    const repeatReceipt = await readPrivateEvidence(
      privateContext,
      receiptPath(options.binding.sealCommit, "gate3-repeat", itemId),
      MAX_JSON_BYTES,
      `${itemId} Gate 3 operator receipt`,
    );

    assertNormalizedIdentity(run1Normalized.bytes, authority);
    assertNormalizedIdentity(repeatNormalized.bytes, authority);
    assertDatabaseEvidence(run1Database, run1Normalized, authority);
    assertDatabaseEvidence(repeatDatabase, repeatNormalized, authority);
    const preflight = reproducePreflight(raw.bytes, authority);
    assertPositiveHarnessReport(
      run1Report.bytes,
      authority,
      run1Normalized,
      options.binding.lockSha256,
      preflight,
    );
    assertPositiveHarnessReport(
      repeatReport.bytes,
      authority,
      repeatNormalized,
      options.binding.lockSha256,
      preflight,
    );
    const first = recomputeScore(raw.bytes, anchors.bytes, run1Normalized.bytes, run1Options.bytes, run1Score.bytes);
    assertOptions(first.options, authority, run1Normalized.sha256, anchors.sha256, null);
    const second = recomputeScore(raw.bytes, anchors.bytes, repeatNormalized.bytes, repeatOptions.bytes, repeatScore.bytes);
    assertOptions(
      second.options,
      authority,
      repeatNormalized.sha256,
      anchors.sha256,
      first.summary.hashes.canonical_normalized_output_sha256,
    );
    assertOperatorReceipt({
      receipt: parseOperatorReceipt(run1Receipt.bytes),
      binding: options.binding,
      stage: "gate1-primary",
      itemId,
      expectedOutcome: "eligible_pass",
      executionBoundary,
      attemptClaimSha256: gate1Claim.sha256,
      harnessReportHash: run1Report.sha256,
      normalizedHash: run1Normalized.sha256,
      scorerOptionsHash: run1Options.sha256,
      scorerReportHash: run1Score.sha256,
      databaseHash: run1Database.sha256,
    });
    assertOperatorReceipt({
      receipt: parseOperatorReceipt(repeatReceipt.bytes),
      binding: options.binding,
      stage: "gate3-repeat",
      itemId,
      expectedOutcome: "eligible_pass",
      executionBoundary,
      attemptClaimSha256: repeatClaim.sha256,
      harnessReportHash: repeatReport.sha256,
      normalizedHash: repeatNormalized.sha256,
      scorerOptionsHash: repeatOptions.sha256,
      scorerReportHash: repeatScore.sha256,
      databaseHash: repeatDatabase.sha256,
    });
    if (
      !run1Normalized.bytes.equals(repeatNormalized.bytes)
      || run1Normalized.sha256 !== repeatNormalized.sha256
      || first.summary.hashes.normalized_output_file_sha256 !== run1Normalized.sha256
      || second.summary.hashes.normalized_output_file_sha256 !== repeatNormalized.sha256
      || first.summary.hashes.input_raw_sha256 !== authority.ledger.source_raw_sha256
      || second.summary.hashes.input_raw_sha256 !== authority.ledger.source_raw_sha256
      || first.summary.hashes.input_canonical_sha256 !== authority.ledger.source_canonical_sha256
      || second.summary.hashes.input_canonical_sha256 !== authority.ledger.source_canonical_sha256
      || first.summary.hashes.anchor_packet_sha256 !== authority.ledger.preparation_document_sha256
      || second.summary.hashes.anchor_packet_sha256 !== authority.ledger.preparation_document_sha256
      || first.summary.hashes.canonical_normalized_output_sha256 !== second.summary.hashes.canonical_normalized_output_sha256
      || first.summary.hashes.canonical_output_comparison !== "not_requested"
      || second.summary.hashes.canonical_output_comparison !== "verified_equal"
      || first.summary.preservation.token_preservation_rate < 0.95
      || second.summary.preservation.token_preservation_rate < 0.95
      || first.summary.timestamp_anchors.match_rate < 0.90
      || second.summary.timestamp_anchors.match_rate < 0.90
      || first.summary.timestamp_anchors.actual_count !== authority.ledger.actual_anchor_count
      || second.summary.timestamp_anchors.actual_count !== authority.ledger.actual_anchor_count
      || first.summary.timestamp_anchors.base_target_count !== authority.ledger.base_anchor_target
      || second.summary.timestamp_anchors.base_target_count !== authority.ledger.base_anchor_target
      || first.summary.preservation.token_preservation_rate !== second.summary.preservation.token_preservation_rate
      || first.summary.timestamp_anchors.match_rate !== second.summary.timestamp_anchors.match_rate
    ) throw new Gate3EvidenceError("GATE_3_FAILED", `${itemId} did not pass exact deterministic repeat and score thresholds`);

    positiveResults.push({
      item_id: itemId,
      source_raw_sha256: authority.ledger.source_raw_sha256,
      gate_1_attempt_claim_sha256: gate1Claim.sha256,
      gate_1_operator_receipt_sha256: run1Receipt.sha256,
      gate_1_harness_report_sha256: run1Report.sha256,
      gate_1_normalized_output_file_sha256: run1Normalized.sha256,
      gate_1_score_options_sha256: run1Options.sha256,
      gate_1_score_summary_sha256: run1Score.sha256,
      gate_1_database_sha256: run1Database.sha256,
      gate_3_repeat_attempt_claim_sha256: repeatClaim.sha256,
      gate_3_repeat_operator_receipt_sha256: repeatReceipt.sha256,
      gate_3_repeat_harness_report_sha256: repeatReport.sha256,
      gate_3_repeat_normalized_output_file_sha256: repeatNormalized.sha256,
      gate_3_repeat_score_options_sha256: repeatOptions.sha256,
      gate_3_repeat_score_summary_sha256: repeatScore.sha256,
      gate_3_repeat_database_sha256: repeatDatabase.sha256,
      model_input_private_root_relative_path: run1Normalized.relativePath,
      model_input_normalized_output_file_sha256: run1Normalized.sha256,
      canonical_normalized_output_sha256: first.summary.hashes.canonical_normalized_output_sha256,
      exact_run_1_repeat_model_input_file_hash_equal: true,
      canonical_output_comparison: "verified_equal",
      token_preservation_rate: first.summary.preservation.token_preservation_rate,
      timestamp_anchor_match_rate: first.summary.timestamp_anchors.match_rate,
      source_to_normalized_timing_equal: true,
      provenance_equal: true,
      network_attempts: 0,
      provider_requests: 0,
    });
  }

  const rejectionResults: Gate1RejectionEvidence[] = [];
  for (const itemId of GATE1_REJECTION_ITEM_IDS) {
    const authority = authorities.get(itemId);
    if (!authority || authority.ledger.expected_class !== "expected_safe_rejection") {
      throw new Gate3EvidenceError("INVALID_AUTHORITY", `${itemId} is not a sealed rejection control`);
    }
    const expectedClaimOutcome = itemId === "YT-04"
      ? "supported_class_safe_rejection" as const
      : "structural_safe_rejection" as const;
    const gate1Claim = await readAttemptClaim(
      options.projectRoot,
      options.binding,
      "gate1-primary",
      itemId,
      expectedClaimOutcome,
      executionBoundary,
    );
    const raw = await readPrivateEvidence(
      privateContext,
      authority.attestation.source.private_relative_path,
      MAX_SUBTITLE_BYTES,
      `${itemId} rejection source`,
    );
    if (raw.sha256 !== authority.ledger.source_raw_sha256 || raw.bytes.byteLength !== authority.ledger.source_bytes) {
      throw new Gate3EvidenceError("GATE_1_FAILED", `${itemId} rejection source differs from the sealed authority`);
    }
    if (itemId === "YT-04") {
      const preparationRelativePath = authority.ledger.preparation_private_relative_path;
      const preparationSha256 = authority.ledger.preparation_document_sha256;
      if (!preparationRelativePath || !preparationSha256) {
        throw new Gate3EvidenceError("INVALID_AUTHORITY", "YT-04 lacks its sealed private preparation record");
      }
      const preparation = await readPrivateEvidence(
        privateContext,
        preparationRelativePath,
        MAX_JSON_BYTES,
        "YT-04 private preparation record",
      );
      if (preparation.sha256 !== preparationSha256) {
        throw new Gate3EvidenceError("GATE_1_FAILED", "YT-04 private preparation bytes differ from the sealed authority");
      }
    }
    const report = await readPrivateEvidence(privateContext, cellPath(primaryRoot, itemId, "harness-report.publication-safe.json"), MAX_JSON_BYTES, `${itemId} rejection report`);
    const receipt = await readPrivateEvidence(
      privateContext,
      receiptPath(options.binding.sealCommit, "gate1-primary", itemId),
      MAX_JSON_BYTES,
      `${itemId} rejection operator receipt`,
    );
    const normalizedPath = cellPath(primaryRoot, itemId, "a1-normalized-transcript.private.json");
    const databasePath = cellPath(primaryRoot, itemId, "throwaway.sqlite");
    await assertPrivateFileAbsent(privateContext, normalizedPath, `${itemId} normalized output`);
    await assertPrivateFileAbsent(privateContext, databasePath, `${itemId} database`);
    await assertPrivateFileAbsent(privateContext, cellPath(primaryRoot, itemId, "a1-score.publication-safe.json"), `${itemId} score`);
    await assertPrivateFileAbsent(privateContext, cellPath(primaryRoot, itemId, "a1-score-options.private.json"), `${itemId} score options`);

    if (itemId === "YT-04") {
      const preflight = reproducePreflight(raw.bytes, authority);
      if (
        authority.ledger.state !== "expected_supported_class_rejection"
        || preflight.a1SupportedClass.state !== "expected_safe_rejection"
        || preflight.cueCount <= 7_200
      ) throw new Gate3EvidenceError("GATE_1_FAILED", "YT-04 supported-class boundary is invalid");
      assertSafeRejectionReport(report.bytes, authority, options.binding.lockSha256, preflight);
      assertOperatorReceipt({
        receipt: parseOperatorReceipt(receipt.bytes),
        binding: options.binding,
        stage: "gate1-primary",
        itemId,
        expectedOutcome: "supported_class_safe_rejection",
        executionBoundary,
        attemptClaimSha256: gate1Claim.sha256,
        harnessReportHash: report.sha256,
        normalizedHash: null,
        scorerOptionsHash: null,
        scorerReportHash: null,
        databaseHash: null,
      });
      rejectionResults.push({
        item_id: itemId,
        source_raw_sha256: authority.ledger.source_raw_sha256,
        gate_1_attempt_claim_sha256: gate1Claim.sha256,
        gate_1_operator_receipt_sha256: receipt.sha256,
        gate_1_harness_report_sha256: report.sha256,
        expected_outcome: "supported_class_rejection",
        observed_outcome: "safe_rejection",
        private_normalized_output_absent: true,
        private_database_absent: true,
        network_attempts: 0,
        provider_requests: 0,
      });
    } else {
      let failure: SubtitlePreflightError | null = null;
      try {
        preflightSubtitleBytes(raw.bytes, {
          format: authority.attestation.input_contract.format,
          declaredDurationMs: authority.ledger.declared_duration_ms,
          expectedRawSha256: authority.ledger.source_raw_sha256,
          expectedCueCount: authority.ledger.cue_count,
          inputFileIntegrityAttested: true,
          contentCompleteness: authority.attestation.input_contract.content_completeness.state,
          contentCompletenessBasis: authority.attestation.input_contract.content_completeness.basis,
        });
      } catch (error) {
        if (error instanceof SubtitlePreflightError) failure = error;
      }
      if (
        authority.ledger.state !== "expected_structural_rejection"
        || authority.ledger.preflight_error_code !== "INVALID_STRUCTURE"
        || failure?.code !== "INVALID_STRUCTURE"
      ) throw new Gate3EvidenceError("GATE_1_FAILED", `${itemId} did not reproduce its strict structural rejection`);
      assertStructuralRejectionReport(report.bytes);
      assertOperatorReceipt({
        receipt: parseOperatorReceipt(receipt.bytes),
        binding: options.binding,
        stage: "gate1-primary",
        itemId,
        expectedOutcome: "structural_safe_rejection",
        executionBoundary,
        attemptClaimSha256: gate1Claim.sha256,
        harnessReportHash: report.sha256,
        normalizedHash: null,
        scorerOptionsHash: null,
        scorerReportHash: null,
        databaseHash: null,
      });
      rejectionResults.push({
        item_id: itemId,
        source_raw_sha256: authority.ledger.source_raw_sha256,
        gate_1_attempt_claim_sha256: gate1Claim.sha256,
        gate_1_operator_receipt_sha256: receipt.sha256,
        gate_1_harness_report_sha256: report.sha256,
        expected_outcome: "structural_rejection",
        observed_outcome: "PREFLIGHT_REJECTED_INVALID_STRUCTURE",
        private_normalized_output_absent: true,
        private_database_absent: true,
        network_attempts: 0,
        provider_requests: 0,
      });
    }
  }

  return {
    $schema: GATE3_RESULT_SCHEMA_ID,
    schema_version: "2.1",
    generator_version: GATE3_EVIDENCE_GENERATOR_VERSION,
    gate: "gate_3",
    state: "pass",
    claim_scope: "exact_five_sealed_a1_items_plus_four_gate_1_rejection_controls",
    content_commit: options.binding.contentCommit,
    seal_commit: options.binding.sealCommit,
    benchmark_lock_sha256: options.binding.lockSha256,
    verified_lock: true,
    execution_boundary: executionBoundary,
    publication_eligible: executionBoundary === "sealed_default_dependencies",
    evidence_layout: {
      private_root_publication: "not_published",
      seal_relative_root: `outputs/${options.binding.sealCommit}`,
      gate_1_primary_relative_root: primaryRoot,
      gate_3_repeat_relative_root: repeatRoot,
      operator_receipt_relative_root: `outputs/${options.binding.sealCommit}/operator-receipts`,
      attempt_claim_relative_root:
        `${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-claims/${options.binding.sealCommit}`,
      attempt_terminal_relative_root:
        `${PROJECT_RELATIVE_ROOT}/decisions/a1-attempt-terminals/${options.binding.sealCommit}`,
      selection_policy: "fixed_seal_and_item_paths_no_caller_selected_evidence",
      model_input_policy: "exact_gate_1_primary_normalized_file",
      operator_receipt_policy: "mandatory_14_write_once_receipts_bound_to_same_seal_and_exact_evidence_hashes",
      attempt_claim_policy:
        "mandatory_14_canonical_repository_claims_bound_to_fixed_execution_contract_and_receipts",
      attempt_uniqueness_scope: A1_ATTEMPT_UNIQUENESS_SCOPE,
      attempt_residual_limitation: A1_ATTEMPT_RESIDUAL_LIMITATION,
    },
    denominators: {
      gate_1_positive_expected: 5,
      gate_1_positive_passed: 5,
      gate_1_rejection_expected: 4,
      gate_1_rejection_passed: 4,
      gate_3_repeat_expected: 5,
      gate_3_repeat_passed: 5,
    },
    gate_1_state: "pass",
    gate_3_state: "pass",
    network_attempts: 0,
    provider_requests: 0,
    created_at: options.createdAt,
    items: positiveResults,
    rejection_controls: rejectionResults,
  };
}

export function serializeGate3Result(result: Gate3Result): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

async function readGate3ResultBytes(projectRoot: string): Promise<Buffer> {
  const absolute = path.join(projectRoot, ...GATE3_RESULT_RELATIVE_PATH.split("/"));
  const handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate3EvidenceError("RESULT_INVALID", "canonical Gate 3 result is missing");
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size < 1 || info.size > MAX_JSON_BYTES) {
      throw new Gate3EvidenceError("RESULT_INVALID", "canonical Gate 3 result is not a bounded regular file");
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

function asGate3Result(value: unknown): Gate3Result {
  const root = requireObject(value, "Gate 3 result");
  if (
    root.$schema !== GATE3_RESULT_SCHEMA_ID
    || root.schema_version !== "2.1"
    || root.generator_version !== GATE3_EVIDENCE_GENERATOR_VERSION
    || root.gate !== "gate_3"
    || root.state !== "pass"
    || root.verified_lock !== true
    || (root.execution_boundary !== "sealed_default_dependencies"
      && root.execution_boundary !== "development_test_only")
    || root.publication_eligible
      !== (root.execution_boundary === "sealed_default_dependencies")
    || typeof root.created_at !== "string"
    || !RFC3339_RE.test(root.created_at)
    || !Number.isFinite(Date.parse(root.created_at))
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 result identity is invalid");
  return root as unknown as Gate3Result;
}

async function assertCommittedGate3Evidence(
  projectRoot: string,
  bytes: Buffer,
  sealCommit: string,
): Promise<void> {
  const claimPaths = [
    ...A1_PRIMARY_ITEM_IDS.map((itemId) => claimRelativePath(
      sealCommit,
      "gate1-primary",
      itemId,
    )),
    ...GATE3_POSITIVE_ITEM_IDS.map((itemId) => claimRelativePath(
      sealCommit,
      "gate3-repeat",
      itemId,
    )),
  ];
  const evidencePaths = [GATE3_RESULT_RELATIVE_PATH, ...claimPaths];
  try {
    const status = execFileSync(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=all", "--", ...evidencePaths],
      { cwd: projectRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    if (status.trim() !== "") throw new Error("dirty Gate 3 evidence");
    for (const evidencePath of evidencePaths) {
      const committed = execFileSync(
        "git",
        ["show", `HEAD:${evidencePath}`],
        { cwd: projectRoot, encoding: "buffer", stdio: ["ignore", "pipe", "ignore"] },
      );
      const worktree = evidencePath === GATE3_RESULT_RELATIVE_PATH
        ? bytes
        : await readFile(path.join(projectRoot, ...evidencePath.split("/")));
      if (!Buffer.from(committed).equals(worktree)) throw new Error("evidence differs from HEAD");
    }
  } catch {
    throw new Gate3EvidenceError(
      "RESULT_UNCOMMITTED",
      "Gate 3 result and all 14 attempt claims must be tracked, clean, and byte-identical to HEAD",
    );
  }
}

export async function verifyGate3EvidenceChain(options: {
  projectRoot: string;
  privateEvidenceRoot: string;
  admittedNormalizedTranscriptPath: string;
  itemId: string;
  binding: Gate3SealBinding;
  requireGitBound: boolean;
  executionBoundary?: A1ExecutionBoundary;
}): Promise<Gate3VerificationResult> {
  const bytes = await readGate3ResultBytes(options.projectRoot);
  const parsed = asGate3Result(parseStrictJson(bytes, "Gate 3 result"));
  const executionBoundary = options.executionBoundary ?? "sealed_default_dependencies";
  if (
    parsed.execution_boundary !== executionBoundary
    || (executionBoundary === "development_test_only" && !process.env.NODE_TEST_CONTEXT)
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 execution boundary is not production-eligible");
  if (
    parsed.content_commit !== options.binding.contentCommit
    || parsed.seal_commit !== options.binding.sealCommit
    || parsed.benchmark_lock_sha256 !== options.binding.lockSha256
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 result names a different verified seal");
  const derived = await deriveGate3Result({
    projectRoot: options.projectRoot,
    privateEvidenceRoot: options.privateEvidenceRoot,
    binding: options.binding,
    createdAt: parsed.created_at,
    executionBoundary,
  });
  if (
    canonicalJson(parsed) !== canonicalJson(derived)
    || !bytes.equals(Buffer.from(serializeGate3Result(derived), "utf8"))
  ) throw new Gate3EvidenceError("RESULT_INVALID", "Gate 3 result is not the deterministic evidence-derived document");
  const item = derived.items.find((candidate) => candidate.item_id === options.itemId);
  if (!item) throw new Gate3EvidenceError("RESULT_INVALID", "requested item is outside the exact Gate 3 denominator");
  const privateRoot = await realpath(options.privateEvidenceRoot).catch(() => "");
  const admitted = await realpath(options.admittedNormalizedTranscriptPath).catch(() => "");
  const expected = privateRoot === ""
    ? ""
    : path.join(privateRoot, ...item.model_input_private_root_relative_path.split("/"));
  if (admitted === "" || admitted !== expected) {
    throw new Gate3EvidenceError(
      "RESULT_INVALID",
      "model input must be the exact Gate 1 primary normalized evidence file, not a copy or selected alternative",
    );
  }
  if (options.requireGitBound) {
    await assertCommittedGate3Evidence(options.projectRoot, bytes, options.binding.sealCommit);
  }
  return {
    documentSha256: sha256(bytes),
    contentCommit: derived.content_commit,
    sealCommit: derived.seal_commit,
    gitBound: options.requireGitBound,
    item,
  };
}

function hasFileSystemCode(error: unknown, expected: string): boolean {
  return error instanceof Error
    && "code" in error
    && error.code === expected;
}

function normalizeGate3ResultWriteError(error: unknown, message: string): Gate3EvidenceError {
  return error instanceof Gate3EvidenceError
    ? error
    : new Gate3EvidenceError("RESULT_WRITE_FAILED", message);
}

async function inspectGate3ResultDirectory(directory: string, label: string) {
  const [info, canonical] = await Promise.all([
    lstat(directory).catch(() => null),
    realpath(directory).catch(() => ""),
  ]);
  if (
    !info
    || !info.isDirectory()
    || info.isSymbolicLink()
    || canonical !== directory
  ) {
    throw new Gate3EvidenceError(
      "EVIDENCE_PATH_INVALID",
      `${label} is missing, linked, or noncanonical`,
    );
  }
  return info;
}

async function syncGate3ResultDirectory(directory: string, label: string): Promise<void> {
  const expected = await inspectGate3ResultDirectory(directory, label);
  let handle;
  try {
    handle = await open(
      directory,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY,
    );
  } catch (error) {
    throw normalizeGate3ResultWriteError(error, `${label} could not be opened for synchronization`);
  }
  try {
    const observed = await handle.stat();
    if (
      !observed.isDirectory()
      || observed.dev !== expected.dev
      || observed.ino !== expected.ino
    ) {
      throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", `${label} changed during synchronization`);
    }
    await handle.sync();
  } catch (error) {
    throw normalizeGate3ResultWriteError(error, `${label} could not be synchronized durably`);
  } finally {
    await handle.close().catch(() => undefined);
  }
}

async function prepareGate3ResultDestination(projectRoot: string): Promise<{
  absolute: string;
  parent: string;
}> {
  const resolvedRoot = path.resolve(projectRoot);
  const [suppliedRootInfo, canonicalRoot] = await Promise.all([
    lstat(resolvedRoot).catch(() => null),
    realpath(resolvedRoot).catch(() => ""),
  ]);
  if (
    !suppliedRootInfo
    || !suppliedRootInfo.isDirectory()
    || suppliedRootInfo.isSymbolicLink()
    || canonicalRoot === ""
  ) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", "Gate 3 project root is missing or linked");
  }
  await inspectGate3ResultDirectory(canonicalRoot, "Gate 3 canonical project root");
  const absolute = path.join(canonicalRoot, ...GATE3_RESULT_RELATIVE_PATH.split("/"));
  const parent = path.dirname(absolute);
  const relativeParent = path.relative(canonicalRoot, parent);
  if (
    relativeParent === ""
    || relativeParent === ".."
    || relativeParent.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeParent)
  ) {
    throw new Gate3EvidenceError("EVIDENCE_PATH_INVALID", "Gate 3 result destination escapes the project root");
  }

  let current = canonicalRoot;
  for (const segment of relativeParent.split(path.sep)) {
    const containingDirectory = current;
    current = path.join(current, segment);
    let created = false;
    try {
      await mkdir(current, { mode: 0o755 });
      created = true;
    } catch (error) {
      if (!hasFileSystemCode(error, "EEXIST")) {
        throw normalizeGate3ResultWriteError(error, "a Gate 3 result parent could not be created");
      }
    }
    await inspectGate3ResultDirectory(current, "Gate 3 result parent");
    if (created) {
      await syncGate3ResultDirectory(containingDirectory, "Gate 3 containing directory");
      await syncGate3ResultDirectory(current, "Gate 3 created result parent");
    }
  }
  return { absolute, parent };
}

export async function writeGate3ResultExclusive(projectRoot: string, result: Gate3Result): Promise<string> {
  const { absolute, parent } = await prepareGate3ResultDestination(projectRoot);
  const expectedBytes = Buffer.from(serializeGate3Result(result), "utf8");
  const temporary = `${absolute}.tmp-${process.pid}`;
  let stagingHandle;
  try {
    stagingHandle = await open(
      temporary,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
      0o644,
    );
  } catch (error) {
    if (hasFileSystemCode(error, "EEXIST")) {
      throw new Gate3EvidenceError("RESULT_ALREADY_EXISTS", "exclusive Gate 3 staging file already exists");
    }
    throw normalizeGate3ResultWriteError(error, "exclusive Gate 3 staging file could not be created");
  }

  let stagingIdentity: { dev: number; ino: number } | null = null;
  let stagingFailure: unknown = null;
  try {
    await stagingHandle.chmod(0o644);
    await stagingHandle.writeFile(expectedBytes);
    await stagingHandle.sync();
    const info = await stagingHandle.stat();
    if (
      !info.isFile()
      || info.nlink !== 1
      || (info.mode & 0o777) !== 0o644
      || info.size !== expectedBytes.byteLength
    ) {
      throw new Gate3EvidenceError("RESULT_WRITE_FAILED", "Gate 3 staging file identity is unsafe");
    }
    stagingIdentity = { dev: info.dev, ino: info.ino };
  } catch (error) {
    stagingFailure = normalizeGate3ResultWriteError(error, "Gate 3 staging file could not be written durably");
  } finally {
    await stagingHandle.close().catch((error: unknown) => {
      stagingFailure ??= normalizeGate3ResultWriteError(error, "Gate 3 staging file could not be closed");
    });
  }
  if (stagingFailure || !stagingIdentity) {
    await unlink(temporary).catch(() => undefined);
    await syncGate3ResultDirectory(parent, "Gate 3 result parent").catch(() => undefined);
    throw stagingFailure ?? new Gate3EvidenceError("RESULT_WRITE_FAILED", "Gate 3 staging file identity is absent");
  }

  let canonicalHandle: Awaited<ReturnType<typeof open>> | null = null;
  let stagingEntryPresent = true;
  let completionFailure: unknown = null;
  try {
    try {
      await link(temporary, absolute);
    } catch (error) {
      if (hasFileSystemCode(error, "EEXIST")) {
        throw new Gate3EvidenceError("RESULT_ALREADY_EXISTS", "canonical Gate 3 result already exists");
      }
      throw normalizeGate3ResultWriteError(error, "canonical Gate 3 result link could not be created");
    }

    canonicalHandle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await canonicalHandle.stat();
    if (
      !before.isFile()
      || before.dev !== stagingIdentity.dev
      || before.ino !== stagingIdentity.ino
      || before.nlink !== 2
      || (before.mode & 0o777) !== 0o644
      || before.size !== expectedBytes.byteLength
    ) {
      throw new Gate3EvidenceError("RESULT_WRITE_FAILED", "canonical Gate 3 result is not the verified staging inode");
    }
    const observedBytes = await canonicalHandle.readFile();
    const afterRead = await canonicalHandle.stat();
    if (
      !observedBytes.equals(expectedBytes)
      || afterRead.dev !== before.dev
      || afterRead.ino !== before.ino
      || afterRead.size !== before.size
      || afterRead.mtimeMs !== before.mtimeMs
    ) {
      throw new Gate3EvidenceError("RESULT_WRITE_FAILED", "canonical Gate 3 result bytes changed during verification");
    }

    // First make the canonical hard link durable. If a crash follows, the
    // canonical entry remains authoritative even if the staging link survives.
    await syncGate3ResultDirectory(parent, "Gate 3 result parent");
    await unlink(temporary);
    stagingEntryPresent = false;
    const afterUnlink = await canonicalHandle.stat();
    if (
      afterUnlink.dev !== before.dev
      || afterUnlink.ino !== before.ino
      || afterUnlink.nlink !== 1
    ) {
      throw new Gate3EvidenceError("RESULT_WRITE_FAILED", "canonical Gate 3 result link count is invalid");
    }
    await syncGate3ResultDirectory(parent, "Gate 3 result parent");
  } catch (error) {
    completionFailure = normalizeGate3ResultWriteError(error, "Gate 3 result could not be finalized durably");
  } finally {
    if (canonicalHandle) {
      await canonicalHandle.close().catch((error: unknown) => {
        completionFailure ??= normalizeGate3ResultWriteError(error, "canonical Gate 3 result could not be closed");
      });
    }
    if (stagingEntryPresent) {
      await unlink(temporary).then(
        () => { stagingEntryPresent = false; },
        () => undefined,
      );
      await syncGate3ResultDirectory(parent, "Gate 3 result parent").catch(() => undefined);
    }
  }
  if (completionFailure) {
    throw completionFailure;
  }
  return absolute;
}
