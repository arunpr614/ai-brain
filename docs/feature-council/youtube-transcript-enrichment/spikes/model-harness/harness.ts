import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  open,
  realpath,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import {
  parseNormalizedTranscriptArtifact,
  type NormalizedTranscript as A1NormalizedTranscript,
} from "../a1-harness/normalized-transcript";
import {
  DEFAULT_LOCK_PATH,
  parseJsonBytesWithoutDuplicateKeys,
  verifyLock,
  type LockVerificationReport,
} from "../../benchmark/tools/verify-lock";
import {
  bindingFromLockReport,
  Gate3EvidenceError,
  verifyGate3EvidenceChain,
  type Gate3PositiveEvidence,
  type Gate3SealBinding,
} from "../../benchmark/tools/gate3-evidence";

export const HARNESS_VERSION = "1.2.0";
const CANDIDATE_ID = "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637";
const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const RUNTIME_LEDGER_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json`;
const PUBLIC_REPORT_DIRECTORY_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-public-runs`;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ISO_DATE_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/;
const ISO_DATE_TIME_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const ITEM_ID_RE = /^YT-[0-9]{2}$/;
const SEGMENT_ID_RE = /^YT-[0-9]{2}:S[0-9]{6}$/;
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_TEXT_BYTES = 24_000;
const MAX_TEXT_CHARACTERS = 50_000;
const MAX_SEGMENTS = 600;
const MAX_CHUNK_TEXT_BYTES = 12_000;
const MAX_CHUNK_SEGMENTS = 128;
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;

type JsonObject = Record<string, unknown>;
export type ExecutionClass = "SEALED" | "DEV_TEST";

export interface HarnessOptions {
  executionClass: ExecutionClass;
  projectRoot: string;
  itemId: string;
  runtimeDir: string;
  modelPath: string;
  authorizationLedgerPath: string;
  attestationPath: string;
  normalizedTranscriptPath: string;
  systemPromptPath: string;
  formatRepairPromptPath: string;
  outputSchemaPath: string;
  keyPointRubricPath: string;
  sandboxProfilePath: string;
  privateOutputDir: string;
  privateEvidenceRoot: string;
  devGate3Binding?: Gate3SealBinding;
  now?: () => Date;
  /** Node-test-only fault injection. SEALED execution rejects this option. */
  devDurabilityFailure?: "claim_file_sync" | "claim_parent_sync" | "report_file_sync" | "report_parent_sync";
}

interface LockedFileEntry {
  path: string;
  sha256: string;
}

interface ExtractedFileEntry {
  relative_path: string;
  role: "license" | "executable" | "runtime_library";
  bytes: number;
  sha256: string;
  mode: "0600" | "0700";
}

interface RuntimeLedger {
  schema_version: "1.0";
  candidate_id: typeof CANDIDATE_ID;
  seal_state: "blocked_pending_local_artifact_verification" | "verified_ready_for_content_freeze";
  runtime: {
    observed_archive: { bytes: number; sha256: string; mode: "0600"; recovery_retries: 0 };
    expected_archive: { bytes: number; sha256: string };
    extracted: {
      llama_cli_relative_path: "llama-cli";
      llama_cli: { bytes: number; sha256: string };
      file_manifest: ExtractedFileEntry[];
      dylib_manifest_hash_algorithm: string;
      dylib_manifest_sha256: string;
      license_sha256: string;
      build_info_hash_algorithm: string;
      build_info_sha256: string;
      build_info: JsonObject;
    };
  };
  model: {
    expected_file: { bytes: number; sha256: string };
    observed_file: { bytes: number; sha256: string; mode: "0600"; recovery_retries: 0 };
  };
  locked_files: {
    system_prompt: LockedFileEntry;
    format_repair_prompt: LockedFileEntry;
    output_schema: LockedFileEntry;
    authorization_ledger: LockedFileEntry;
    key_point_rubric: LockedFileEntry;
    sandbox_profile: LockedFileEntry;
  };
  execution_contract: {
    interface: "llama-cli_files_only";
    network: "sandbox_exec_deny_network_plus_llama_offline";
    server_mode: "prohibited";
    remote_model_resolution: "prohibited";
    temperature: 0;
    seed: 424242;
    top_k: 1;
    top_p: 1;
    min_p: 0;
    repeat_penalty: 1;
    context_size: 16384;
    max_output_tokens: 4096;
    threads: 8;
    threads_batch: 8;
    gpu_layers: "all";
    reasoning: "disabled";
    attempt_limit: 2;
    retry_policy: "one_sealed_format_only_retry_no_semantic_retry";
    timeout_ms_per_attempt: 1800000;
    incremental_cost_usd: 0;
  };
  verification: {
    status: "pending" | "verified";
    ledger_verified_at: string | null;
    locked_files_hashed_at: string | null;
    verified_by: string | null;
    runtime_expected_matches_observed: boolean;
    model_expected_matches_observed: boolean;
    extracted_manifest_complete: boolean;
    blocked_reasons: string[];
  };
}

interface AuthorizationItem {
  item_id: string;
  attestation_path: string;
  attestation_sha256: string;
  source_raw_sha256: string;
  retention: { private_delete_by: string };
}

type NormalizedTranscript = A1NormalizedTranscript & {
  source_method: "A1";
  completeness: A1NormalizedTranscript["completeness"] & { state: "complete" | "partial" };
  provenance: A1NormalizedTranscript["provenance"] & { reference_role: "input_preservation" };
  errors: [];
};

type PromptSegment = NormalizedTranscript["segments"][number] & { segment_id: string };

interface AttemptRecord {
  attempt: number;
  kind: "initial" | "sealed_format_only_retry";
  started_at: string;
  completed_at: string;
  duration_ms: number;
  prompt_sha256: string;
  exit_code: number | null;
  signal: string | null;
  timed_out: boolean;
  maximum_resident_set_size_bytes: number | null;
  peak_memory_footprint_bytes: number | null;
  stdout_bytes: number;
  stdout_retained_bytes: number;
  stdout_sha256: string;
  stderr_bytes: number;
  stderr_retained_bytes: number;
  stderr_sha256: string;
  parse_valid: boolean;
  shape_valid: boolean;
  semantic_reference_valid: boolean;
  error_codes: string[];
}

interface AttemptResult {
  record: AttemptRecord;
  stdout: Buffer;
  stderr: Buffer;
  parsed: unknown;
  shapeErrors: string[];
  semanticErrors: string[];
  metrics: ValidationMetrics;
}

interface ValidationMetrics {
  materialClaimCount: number;
  citationCount: number;
  invalidReferenceCount: number;
  unsafeMarkupCount: number;
}

export interface PublicRunReport extends JsonObject {
  schema_version: "1.1";
  harness_version: typeof HARNESS_VERSION;
  execution_class: ExecutionClass;
  publication_eligible: boolean;
  run_id: string;
  run_state: "succeeded" | "failed";
  item_id: string;
  candidate_id: typeof CANDIDATE_ID;
  started_at: string;
  completed_at: string;
  input: JsonObject;
  gate_3_handoff: JsonObject;
  runtime: JsonObject;
  attempts: AttemptRecord[];
  validation: JsonObject;
  cost: JsonObject;
  privacy: JsonObject;
  retention: JsonObject;
  failure: JsonObject | null;
  claims_boundary: string[];
}

interface Gate3Handoff {
  documentSha256: string;
  contentCommit: string;
  sealCommit: string;
  gitBound: boolean;
  item: Gate3PositiveEvidence;
}

export class HarnessError extends Error {
  constructor(
    public readonly code: string,
    public readonly stage: "preflight" | "execution" | "parse" | "shape_validation" | "semantic_validation" | "retention_cleanup",
    message: string,
    public readonly recoverable = true,
  ) {
    super(message);
    this.name = "HarnessError";
  }
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonObject, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}

function assertAbsolute(candidate: string, label: string): void {
  if (!path.isAbsolute(candidate)) {
    throw new HarnessError("PATH_NOT_ABSOLUTE", "preflight", `${label} must be an absolute path`);
  }
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function readBounded(filePath: string, maxBytes: number, label: string): Promise<Buffer> {
  assertAbsolute(filePath, label);
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) {
    throw new HarnessError("FILE_NOT_REGULAR", "preflight", `${label} must be a regular non-symlink file`);
  }
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      throw new HarnessError("FILE_NOT_REGULAR", "preflight", `${label} must be a regular non-symlink file`);
    }
    if (info.size > maxBytes) {
      throw new HarnessError("FILE_TOO_LARGE", "preflight", `${label} exceeds its byte limit`);
    }
    const bytes = await handle.readFile();
    if (bytes.byteLength !== info.size || bytes.byteLength > maxBytes) {
      throw new HarnessError("FILE_CHANGED_DURING_READ", "preflight", `${label} changed while it was read`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function readJson(filePath: string, label: string, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  const bytes = await readBounded(filePath, maxBytes, label);
  try {
    return parseJsonBytesWithoutDuplicateKeys(bytes);
  } catch {
    throw new HarnessError("INVALID_JSON", "preflight", `${label} is not valid JSON`);
  }
}

function decodeStrictUtf8(bytes: Uint8Array, code: string, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HarnessError(code, "preflight", `${label} is not valid UTF-8`);
  }
}

async function hashRegularFile(filePath: string, label: string): Promise<{ bytes: number; sha256: string; mode: string }> {
  assertAbsolute(filePath, label);
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) {
    throw new HarnessError("FILE_NOT_REGULAR", "preflight", `${label} must be a regular non-symlink file`);
  }
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      throw new HarnessError("FILE_NOT_REGULAR", "preflight", `${label} must be a regular non-symlink file`);
    }
    const digest = createHash("sha256");
    let observedBytes = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      const bytes = chunk as Buffer;
      observedBytes += bytes.byteLength;
      digest.update(bytes);
    }
    if (observedBytes !== info.size) {
      throw new HarnessError("FILE_CHANGED_DURING_READ", "preflight", `${label} changed while it was hashed`);
    }
    return {
      bytes: observedBytes,
      sha256: digest.digest("hex"),
      mode: (info.mode & 0o777).toString(8).padStart(4, "0"),
    };
  } finally {
    await handle.close();
  }
}

function asRuntimeLedger(value: unknown): RuntimeLedger {
  if (!isObject(value) || value.schema_version !== "1.0" || value.candidate_id !== CANDIDATE_ID) {
    throw new HarnessError("RUNTIME_LEDGER_INVALID", "preflight", "runtime ledger identity is invalid");
  }
  return value as unknown as RuntimeLedger;
}

function assertSha(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_RE.test(value) || /^0{64}$/.test(value)) {
    throw new HarnessError("UNVERIFIED_HASH", "preflight", `${label} is missing or uses a sentinel hash`);
  }
}

function verifySealedProject(projectRoot: string, executionClass: ExecutionClass): LockVerificationReport | null {
  if (executionClass === "DEV_TEST") return null;
  if (executionClass !== "SEALED") {
    throw new HarnessError("EXECUTION_CLASS_INVALID", "preflight", "execution class must be SEALED");
  }
  try {
    return verifyLock({ repoRoot: projectRoot, lockPath: DEFAULT_LOCK_PATH });
  } catch {
    throw new HarnessError("SEALED_LOCK_INVALID", "preflight", "the canonical benchmark lock did not verify at the current commit");
  }
}

async function verifyGate3Handoff(
  projectRoot: string,
  itemId: string,
  privateEvidenceRoot: string,
  normalizedTranscriptPath: string,
  lockReport: LockVerificationReport | null,
  devBinding?: Gate3SealBinding,
): Promise<Gate3Handoff> {
  const binding = lockReport ? bindingFromLockReport(lockReport) : devBinding;
  if (!binding) {
    throw new HarnessError(
      "GATE_3_EVIDENCE_INVALID",
      "preflight",
      "DEV_TEST requires an explicit synthetic Gate 3 seal binding",
    );
  }
  try {
    return await verifyGate3EvidenceChain({
      projectRoot,
      privateEvidenceRoot,
      admittedNormalizedTranscriptPath: normalizedTranscriptPath,
      itemId,
      binding,
      requireGitBound: lockReport !== null,
      executionBoundary: lockReport === null ? "development_test_only" : "sealed_default_dependencies",
    });
  } catch (error) {
    const detail = error instanceof Gate3EvidenceError ? error.code : "UNEXPECTED_EVIDENCE_ERROR";
    throw new HarnessError(
      "GATE_3_EVIDENCE_INVALID",
      "preflight",
      `Gate 3 evidence-chain verification failed (${detail})`,
    );
  }
}

function assertRuntimeLedgerReady(ledger: RuntimeLedger): void {
  if (
    ledger.seal_state !== "verified_ready_for_content_freeze" ||
    ledger.verification.status !== "verified" ||
    !ledger.verification.runtime_expected_matches_observed ||
    !ledger.verification.model_expected_matches_observed ||
    !ledger.verification.extracted_manifest_complete ||
    ledger.verification.blocked_reasons.length !== 0
  ) {
    throw new HarnessError("LOCK_INPUT_UNVERIFIED", "preflight", "runtime/model ledger is not verified for content freeze");
  }
  if (
    typeof ledger.verification.ledger_verified_at !== "string" ||
    typeof ledger.verification.locked_files_hashed_at !== "string" ||
    !ISO_DATE_TIME_RE.test(ledger.verification.ledger_verified_at) ||
    !ISO_DATE_TIME_RE.test(ledger.verification.locked_files_hashed_at) ||
    !Number.isFinite(Date.parse(ledger.verification.ledger_verified_at)) ||
    !Number.isFinite(Date.parse(ledger.verification.locked_files_hashed_at)) ||
    Date.parse(ledger.verification.ledger_verified_at) < Date.parse(ledger.verification.locked_files_hashed_at)
  ) {
    throw new HarnessError(
      "RUNTIME_LEDGER_CHRONOLOGY_INVALID",
      "preflight",
      "runtime ledger verification must occur at or after the locked-file hashing evidence",
    );
  }
  if (
    ledger.runtime.expected_archive.bytes !== ledger.runtime.observed_archive.bytes ||
    ledger.runtime.expected_archive.sha256 !== ledger.runtime.observed_archive.sha256 ||
    ledger.model.expected_file.bytes !== ledger.model.observed_file.bytes ||
    ledger.model.expected_file.sha256 !== ledger.model.observed_file.sha256
  ) {
    throw new HarnessError("EXPECTED_OBSERVED_MISMATCH", "preflight", "runtime or model expected/observed identity differs");
  }
  if (ledger.runtime.observed_archive.mode !== "0600" || ledger.runtime.observed_archive.recovery_retries !== 0 ||
      ledger.model.observed_file.mode !== "0600" || ledger.model.observed_file.recovery_retries !== 0) {
    throw new HarnessError("DOWNLOADED_ARTIFACT_BOUNDARY_INVALID", "preflight", "downloaded artifact mode or recovery retry count differs");
  }
  assertSha(ledger.runtime.extracted.llama_cli.sha256, "llama-cli hash");
  assertSha(ledger.runtime.extracted.dylib_manifest_sha256, "dylib manifest hash");
  assertSha(ledger.runtime.extracted.license_sha256, "runtime license hash");
  assertSha(ledger.runtime.extracted.build_info_sha256, "runtime build-info hash");
  for (const entry of Object.values(ledger.locked_files)) assertSha(entry.sha256, `locked file ${entry.path}`);

  const libraries = ledger.runtime.extracted.file_manifest
    .filter((entry) => entry.role === "runtime_library")
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path));
  if (sha256(JSON.stringify(libraries)) !== ledger.runtime.extracted.dylib_manifest_sha256) {
    throw new HarnessError("DYLIB_MANIFEST_HASH_MISMATCH", "preflight", "runtime dylib manifest hash is inconsistent");
  }
  if (sha256(JSON.stringify(ledger.runtime.extracted.build_info)) !== ledger.runtime.extracted.build_info_sha256) {
    throw new HarnessError("BUILD_INFO_HASH_MISMATCH", "preflight", "runtime build-info hash is inconsistent");
  }
}

async function assertLockedFile(
  projectRoot: string,
  suppliedPath: string,
  entry: LockedFileEntry,
  label: string,
): Promise<void> {
  const expectedPath = path.resolve(projectRoot, entry.path);
  if (!expectedPath.startsWith(`${projectRoot}${path.sep}`)) {
    throw new HarnessError("LOCKED_PATH_ESCAPE", "preflight", `${label} ledger path escapes the project root`);
  }
  const [expectedRealPath, suppliedRealPath] = await Promise.all([
    realpath(expectedPath).catch(() => ""),
    realpath(suppliedPath).catch(() => ""),
  ]);
  if (
    expectedRealPath === "" ||
    !expectedRealPath.startsWith(`${projectRoot}${path.sep}`) ||
    suppliedRealPath === "" ||
    suppliedRealPath !== expectedRealPath
  ) {
    throw new HarnessError("LOCKED_PATH_MISMATCH", "preflight", `${label} path does not match the ledger`);
  }
  const observed = await hashRegularFile(suppliedPath, label);
  if (observed.sha256 !== entry.sha256) {
    throw new HarnessError("LOCKED_FILE_HASH_MISMATCH", "preflight", `${label} hash does not match the ledger`);
  }
}

async function verifyRuntimeDirectory(runtimeDir: string, ledger: RuntimeLedger): Promise<string> {
  assertAbsolute(runtimeDir, "runtime directory");
  const info = await lstat(runtimeDir).catch(() => null);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) {
    throw new HarnessError("RUNTIME_DIR_INVALID", "preflight", "runtime directory must be a non-symlink directory");
  }
  const root = await realpath(runtimeDir);
  const manifest = ledger.runtime.extracted.file_manifest;
  if (manifest.length !== 11 || new Set(manifest.map((entry) => entry.relative_path)).size !== 11) {
    throw new HarnessError("RUNTIME_MANIFEST_INVALID", "preflight", "runtime file manifest must contain 11 unique files");
  }
  const licenseEntry = manifest.find((entry) => entry.relative_path === "LICENSE");
  const executableEntry = manifest.find((entry) => entry.relative_path === "llama-cli");
  if (!licenseEntry || licenseEntry.role !== "license" || licenseEntry.sha256 !== ledger.runtime.extracted.license_sha256 ||
      !executableEntry || executableEntry.role !== "executable" ||
      manifest.filter((entry) => entry.role === "runtime_library").length !== 9) {
    throw new HarnessError("RUNTIME_MANIFEST_ROLE_INVALID", "preflight", "runtime manifest roles or license identity are inconsistent");
  }
  for (const entry of manifest) {
    const filePath = path.join(root, entry.relative_path);
    if (path.dirname(filePath) !== root) {
      throw new HarnessError("RUNTIME_PATH_ESCAPE", "preflight", "runtime manifest path escaped its root");
    }
    const observed = await hashRegularFile(filePath, `runtime file ${entry.relative_path}`);
    if (observed.bytes !== entry.bytes || observed.sha256 !== entry.sha256 || observed.mode !== entry.mode) {
      throw new HarnessError("RUNTIME_FILE_MISMATCH", "preflight", `runtime file ${entry.relative_path} failed identity verification`);
    }
  }
  const cliPath = path.join(root, ledger.runtime.extracted.llama_cli_relative_path);
  const cliEntry = manifest.find((entry) => entry.relative_path === ledger.runtime.extracted.llama_cli_relative_path);
  if (
    !cliEntry ||
    cliEntry.bytes !== ledger.runtime.extracted.llama_cli.bytes ||
    cliEntry.sha256 !== ledger.runtime.extracted.llama_cli.sha256
  ) {
    throw new HarnessError("LLAMA_CLI_IDENTITY_MISMATCH", "preflight", "llama-cli identity is inconsistent with the manifest");
  }
  return cliPath;
}

function getAuthorizationItem(value: unknown, itemId: string): AuthorizationItem {
  if (!isObject(value) || value.schema_version !== "1.0" || !isObject(value.authorization_scope)) {
    throw new HarnessError("AUTHORIZATION_LEDGER_INVALID", "preflight", "authorization ledger identity is invalid");
  }
  if (
    value.authorization_scope.state !== "provisional_local_benchmark_only_review_required" ||
    value.authorization_scope.local_full_transcript_inference !== "allowed_in_deny_network_sandbox" ||
    value.authorization_scope.external_full_transcript_upload !== "prohibited"
  ) {
    throw new HarnessError("AUTHORIZATION_SCOPE_INVALID", "preflight", "authorization ledger does not allow local-only inference");
  }
  if (!Array.isArray(value.items)) {
    throw new HarnessError("AUTHORIZATION_LEDGER_INVALID", "preflight", "authorization ledger items are missing");
  }
  const matches = value.items.filter((entry) => isObject(entry) && entry.item_id === itemId);
  if (matches.length !== 1) {
    throw new HarnessError("ITEM_NOT_AUTHORIZED", "preflight", "item must appear exactly once in the authorization ledger");
  }
  const item = matches[0];
  if (
    !isObject(item) ||
    typeof item.attestation_path !== "string" ||
    path.isAbsolute(item.attestation_path) ||
    !SHA256_RE.test(String(item.attestation_sha256)) ||
    !SHA256_RE.test(String(item.source_raw_sha256)) ||
    !isObject(item.retention) ||
    typeof item.retention.private_delete_by !== "string" ||
    !isValidIsoDate(item.retention.private_delete_by)
  ) {
    throw new HarnessError("AUTHORIZATION_ITEM_INVALID", "preflight", "authorized item metadata is invalid");
  }
  return item as unknown as AuthorizationItem;
}

function parseNormalizedTranscript(value: unknown, expectedItemId: string, authorization: AuthorizationItem): NormalizedTranscript {
  let parsed: A1NormalizedTranscript;
  try {
    parsed = parseNormalizedTranscriptArtifact(value);
  } catch {
    throw new HarnessError("NORMALIZED_INPUT_INVALID", "preflight", "normalized transcript does not satisfy the frozen A1 artifact schema");
  }
  if (
    parsed.item_id !== expectedItemId ||
    parsed.source_method !== "A1" ||
    !["complete", "partial"].includes(parsed.completeness.state) ||
    parsed.provenance.reference_role !== "input_preservation" ||
    parsed.provenance.input_sha256 !== authorization.source_raw_sha256 ||
    parsed.segments.length > MAX_SEGMENTS ||
    parsed.errors.length !== 0 ||
    parsed.completeness.last_cue_end_ms > parsed.completeness.source_duration_ms ||
    parsed.completeness.trailing_gap_ms !== parsed.completeness.source_duration_ms - parsed.completeness.last_cue_end_ms ||
    Math.max(...parsed.segments.map((segment) => segment.end_ms)) !== parsed.completeness.last_cue_end_ms
  ) {
    throw new HarnessError("NORMALIZED_INPUT_CONTRACT_FAILED", "preflight", "normalized transcript is outside the authorized A1 contract");
  }

  let totalBytes = 0;
  let totalCharacters = 0;
  for (let index = 0; index < parsed.segments.length; index += 1) {
    const segment = parsed.segments[index];
    if (
      segment.index !== index ||
      segment.source_start_ms !== segment.start_ms ||
      segment.source_end_ms !== segment.end_ms ||
      segment.text.includes("\0") ||
      (index > 0 && segment.start_ms < parsed.segments[index - 1].start_ms)
    ) {
      throw new HarnessError("NORMALIZED_SEGMENT_INVALID", "preflight", "normalized transcript contains an invalid segment");
    }
    const segmentBytes = Buffer.byteLength(segment.text, "utf8");
    if (segmentBytes > MAX_CHUNK_TEXT_BYTES) {
      throw new HarnessError("SEGMENT_TOO_LARGE", "preflight", "one normalized segment exceeds the fixed chunk byte limit");
    }
    totalBytes += segmentBytes;
    totalCharacters += [...segment.text].length;
  }
  if (totalBytes > MAX_TEXT_BYTES || totalCharacters > MAX_TEXT_CHARACTERS) {
    throw new HarnessError("TRANSCRIPT_TEXT_TOO_LARGE", "preflight", "normalized transcript exceeds the fixed enrichment input limit");
  }
  return parsed as NormalizedTranscript;
}

export function buildPrompt(transcript: NormalizedTranscript, inputSha256: string): { prompt: string; segments: PromptSegment[]; chunkCount: number } {
  const segments = transcript.segments.map((segment) => ({
    ...segment,
    segment_id: `${transcript.item_id}:S${String(segment.index).padStart(6, "0")}`,
  }));
  const chunks: PromptSegment[][] = [];
  let current: PromptSegment[] = [];
  let currentBytes = 0;
  for (const segment of segments) {
    const segmentBytes = Buffer.byteLength(segment.text, "utf8");
    if (current.length > 0 && (current.length + 1 > MAX_CHUNK_SEGMENTS || currentBytes + segmentBytes > MAX_CHUNK_TEXT_BYTES)) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(segment);
    currentBytes += segmentBytes;
  }
  if (current.length > 0) chunks.push(current);

  const lines = [
    "REQUEST_SCHEMA_VERSION=1.0",
    `ITEM_ID=${transcript.item_id}`,
    `INPUT_SHA256=${inputSha256}`,
    `LANGUAGE_TAG=${transcript.language}`,
    `TRANSCRIPT_STATUS=${transcript.completeness.state}`,
    `SOURCE_METHOD=${transcript.source_method}`,
    `SEGMENT_COUNT=${segments.length}`,
    "TRANSCRIPT_DATA_BEGIN",
  ];
  chunks.forEach((chunk, chunkIndex) => {
    lines.push(`CHUNK-${String(chunkIndex + 1).padStart(3, "0")} SEGMENTS=${chunk.length}`);
    for (const segment of chunk) {
      lines.push(JSON.stringify({
        segment_id: segment.segment_id,
        start_ms: segment.start_ms,
        end_ms: segment.end_ms,
        text: segment.text,
      }));
    }
  });
  lines.push("TRANSCRIPT_DATA_END");
  return { prompt: `${lines.join("\n")}\n`, segments, chunkCount: chunks.length };
}

function validateStringArray(value: unknown, maxItems: number, maxLength: number): boolean {
  return Array.isArray(value) && value.length <= maxItems && value.every((entry) => typeof entry === "string" && entry.length >= 1 && entry.length <= maxLength);
}

function validateEvidenceObject(value: unknown, idKey: "claim_id" | "key_point_id", textKey: "claim" | "point"): boolean {
  if (!isObject(value)) return false;
  const required = [idKey, textKey, "evidence_segment_ids", "evidence_start_ms", "evidence_end_ms"];
  const prefix = idKey === "claim_id" ? "C" : "K";
  return (
    exactKeys(value, required) &&
    typeof value[idKey] === "string" &&
    new RegExp(`^${prefix}[0-9]{3}$`).test(value[idKey]) &&
    typeof value[textKey] === "string" &&
    value[textKey].length >= 1 &&
    value[textKey].length <= 600 &&
    Array.isArray(value.evidence_segment_ids) &&
    value.evidence_segment_ids.length >= 1 &&
    value.evidence_segment_ids.length <= 8 &&
    value.evidence_segment_ids.every((id) => typeof id === "string" && SEGMENT_ID_RE.test(id)) &&
    Number.isInteger(value.evidence_start_ms) &&
    Number(value.evidence_start_ms) >= 0 &&
    Number.isInteger(value.evidence_end_ms) &&
    Number(value.evidence_end_ms) >= 1
  );
}

function validateOutputShape(value: unknown): string[] {
  const errors: string[] = [];
  const required = [
    "schema_version", "item_id", "input_sha256", "language_tag", "transcript_status", "summary",
    "material_claims", "chapters", "key_points", "concepts", "action_items", "search_terms",
    "user_tags", "ai_categories", "limitations",
  ];
  if (!isObject(value) || !exactKeys(value, required)) return ["OUTPUT_TOP_LEVEL_SHAPE_INVALID"];
  if (
    value.schema_version !== "1.0" ||
    typeof value.item_id !== "string" || !ITEM_ID_RE.test(value.item_id) ||
    typeof value.input_sha256 !== "string" || !SHA256_RE.test(value.input_sha256) ||
    typeof value.language_tag !== "string" || !/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value.language_tag) ||
    !["complete", "partial"].includes(String(value.transcript_status)) ||
    typeof value.summary !== "string" || value.summary.length < 1 || value.summary.length > 2400
  ) errors.push("OUTPUT_HEADER_SHAPE_INVALID");

  if (!Array.isArray(value.material_claims) || value.material_claims.length < 1 || value.material_claims.length > 12 || !value.material_claims.every((entry) => validateEvidenceObject(entry, "claim_id", "claim"))) errors.push("MATERIAL_CLAIMS_SHAPE_INVALID");
  if (!Array.isArray(value.key_points) || value.key_points.length < 1 || value.key_points.length > 24 || !value.key_points.every((entry) => validateEvidenceObject(entry, "key_point_id", "point"))) errors.push("KEY_POINTS_SHAPE_INVALID");
  if (!Array.isArray(value.chapters) || value.chapters.length < 1 || value.chapters.length > 24 || !value.chapters.every((entry) => {
    if (!isObject(entry)) return false;
    return exactKeys(entry, ["chapter_id", "title", "summary", "start_segment_id", "end_segment_id", "start_ms", "end_ms"]) &&
      typeof entry.chapter_id === "string" && /^H[0-9]{3}$/.test(entry.chapter_id) &&
      typeof entry.title === "string" && entry.title.length >= 1 && entry.title.length <= 160 &&
      typeof entry.summary === "string" && entry.summary.length >= 1 && entry.summary.length <= 700 &&
      typeof entry.start_segment_id === "string" && SEGMENT_ID_RE.test(entry.start_segment_id) &&
      typeof entry.end_segment_id === "string" && SEGMENT_ID_RE.test(entry.end_segment_id) &&
      Number.isInteger(entry.start_ms) && Number(entry.start_ms) >= 0 &&
      Number.isInteger(entry.end_ms) && Number(entry.end_ms) >= 1;
  })) errors.push("CHAPTERS_SHAPE_INVALID");
  if (!Array.isArray(value.concepts) || value.concepts.length > 20 || !value.concepts.every((entry) => {
    if (!isObject(entry)) return false;
    return exactKeys(entry, ["concept_id", "label", "explanation", "evidence_segment_ids"]) &&
      typeof entry.concept_id === "string" && /^N[0-9]{3}$/.test(entry.concept_id) &&
      typeof entry.label === "string" && entry.label.length >= 1 && entry.label.length <= 120 &&
      typeof entry.explanation === "string" && entry.explanation.length >= 1 && entry.explanation.length <= 500 &&
      Array.isArray(entry.evidence_segment_ids) && entry.evidence_segment_ids.length >= 1 && entry.evidence_segment_ids.length <= 8 &&
      entry.evidence_segment_ids.every((id) => typeof id === "string" && SEGMENT_ID_RE.test(id));
  })) errors.push("CONCEPTS_SHAPE_INVALID");
  if (!Array.isArray(value.action_items) || value.action_items.length > 12 || !value.action_items.every((entry) => {
    if (!isObject(entry)) return false;
    return exactKeys(entry, ["action_id", "action", "basis", "evidence_segment_ids"]) &&
      typeof entry.action_id === "string" && /^A[0-9]{3}$/.test(entry.action_id) &&
      typeof entry.action === "string" && entry.action.length >= 1 && entry.action.length <= 500 &&
      entry.basis === "explicit_source_action" &&
      Array.isArray(entry.evidence_segment_ids) && entry.evidence_segment_ids.length >= 1 && entry.evidence_segment_ids.length <= 8 &&
      entry.evidence_segment_ids.every((id) => typeof id === "string" && SEGMENT_ID_RE.test(id));
  })) errors.push("ACTION_ITEMS_SHAPE_INVALID");
  if (!validateStringArray(value.search_terms, 24, 100)) errors.push("SEARCH_TERMS_SHAPE_INVALID");
  if (!validateStringArray(value.user_tags, 12, 80)) errors.push("USER_TAGS_SHAPE_INVALID");
  if (!validateStringArray(value.ai_categories, 8, 80)) errors.push("AI_CATEGORIES_SHAPE_INVALID");
  if (!Array.isArray(value.limitations) || value.limitations.length < 1 || value.limitations.length > 8 || !value.limitations.every((entry) => typeof entry === "string" && entry.length >= 1 && entry.length <= 400)) errors.push("LIMITATIONS_SHAPE_INVALID");
  return [...new Set(errors)];
}

function sequentialIds(entries: unknown[], key: string, prefix: string): boolean {
  return entries.every((entry, index) => isObject(entry) && entry[key] === `${prefix}${String(index + 1).padStart(3, "0")}`);
}

function unsafeMarkupCount(value: unknown): number {
  let count = 0;
  const unsafe = /<[a-z!/][^>]*>|!?\[[^\]]*\]\([^)]*\)|javascript:|data:text\/html|[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/iu;
  const visit = (entry: unknown): void => {
    if (typeof entry === "string") {
      if (unsafe.test(entry)) count += 1;
    } else if (Array.isArray(entry)) {
      entry.forEach(visit);
    } else if (isObject(entry)) {
      Object.values(entry).forEach(visit);
    }
  };
  visit(value);
  return count;
}

function validateReferences(value: JsonObject, transcript: NormalizedTranscript, promptSegments: PromptSegment[], inputHash: string): { errors: string[]; metrics: ValidationMetrics } {
  const errors: string[] = [];
  const byId = new Map(promptSegments.map((segment) => [segment.segment_id, segment]));
  let invalidReferenceCount = 0;
  let citationCount = 0;
  if (
    value.item_id !== transcript.item_id || value.input_sha256 !== inputHash ||
    value.language_tag !== transcript.language || value.transcript_status !== transcript.completeness.state
  ) errors.push("OUTPUT_HEADER_ECHO_MISMATCH");

  const claimEntries = value.material_claims as JsonObject[];
  const keyPointEntries = value.key_points as JsonObject[];
  const conceptEntries = value.concepts as JsonObject[];
  const actionEntries = value.action_items as JsonObject[];
  const chapterEntries = value.chapters as JsonObject[];
  if (!sequentialIds(claimEntries, "claim_id", "C")) errors.push("CLAIM_IDS_NOT_SEQUENTIAL");
  if (!sequentialIds(keyPointEntries, "key_point_id", "K")) errors.push("KEY_POINT_IDS_NOT_SEQUENTIAL");
  if (!sequentialIds(conceptEntries, "concept_id", "N")) errors.push("CONCEPT_IDS_NOT_SEQUENTIAL");
  if (!sequentialIds(actionEntries, "action_id", "A")) errors.push("ACTION_IDS_NOT_SEQUENTIAL");
  if (!sequentialIds(chapterEntries, "chapter_id", "H")) errors.push("CHAPTER_IDS_NOT_SEQUENTIAL");

  const validateIds = (ids: unknown, withTimestamps?: JsonObject): void => {
    if (!Array.isArray(ids)) return;
    citationCount += withTimestamps ? 1 : 0;
    const typed = ids as string[];
    const positions = typed.map((id) => promptSegments.findIndex((segment) => segment.segment_id === id));
    const unique = new Set(typed).size === typed.length;
    const ordered = positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1]));
    if (!unique || !ordered || typed.some((id) => !id.startsWith(`${transcript.item_id}:`))) {
      invalidReferenceCount += 1;
      errors.push("SEGMENT_REFERENCES_INVALID");
      return;
    }
    if (withTimestamps) {
      const cited = typed.map((id) => byId.get(id)).filter((segment): segment is PromptSegment => Boolean(segment));
      const expectedStart = Math.min(...cited.map((segment) => segment.start_ms));
      const expectedEnd = Math.max(...cited.map((segment) => segment.end_ms));
      if (withTimestamps.evidence_start_ms !== expectedStart || withTimestamps.evidence_end_ms !== expectedEnd) {
        invalidReferenceCount += 1;
        errors.push("EVIDENCE_TIMESTAMP_MISMATCH");
      }
    }
  };
  claimEntries.forEach((entry) => validateIds(entry.evidence_segment_ids, entry));
  keyPointEntries.forEach((entry) => validateIds(entry.evidence_segment_ids, entry));
  conceptEntries.forEach((entry) => validateIds(entry.evidence_segment_ids));
  actionEntries.forEach((entry) => validateIds(entry.evidence_segment_ids));

  let previousEndIndex = -1;
  for (const chapter of chapterEntries) {
    const start = typeof chapter.start_segment_id === "string" ? byId.get(chapter.start_segment_id) : undefined;
    const end = typeof chapter.end_segment_id === "string" ? byId.get(chapter.end_segment_id) : undefined;
    if (!start || !end || start.index > end.index || start.index <= previousEndIndex || chapter.start_ms !== start.start_ms || chapter.end_ms !== end.end_ms) {
      invalidReferenceCount += 1;
      errors.push("CHAPTER_REFERENCE_INVALID");
    } else {
      previousEndIndex = end.index;
    }
  }
  const unsafeCount = unsafeMarkupCount(value);
  if (unsafeCount > 0) errors.push("UNSAFE_MARKUP");
  return {
    errors: [...new Set(errors)],
    metrics: {
      materialClaimCount: claimEntries.length,
      citationCount,
      invalidReferenceCount,
      unsafeMarkupCount: unsafeCount,
    },
  };
}

export function validateEnrichmentOutput(
  value: unknown,
  transcript: NormalizedTranscript,
  promptSegments: PromptSegment[],
  inputHash: string,
): { shapeErrors: string[]; semanticErrors: string[]; metrics: ValidationMetrics } {
  const shapeErrors = validateOutputShape(value);
  if (shapeErrors.length > 0 || !isObject(value)) {
    return { shapeErrors, semanticErrors: [], metrics: { materialClaimCount: 0, citationCount: 0, invalidReferenceCount: 0, unsafeMarkupCount: 0 } };
  }
  const semantic = validateReferences(value, transcript, promptSegments, inputHash);
  return { shapeErrors, semanticErrors: semantic.errors, metrics: semantic.metrics };
}

function parseExactJson(stdout: Buffer): unknown {
  const parsed = parseJsonBytesWithoutDuplicateKeys(stdout);
  if (!isObject(parsed)) throw new Error("not one JSON object");
  return parsed;
}

function commandArgs(
  ledger: RuntimeLedger,
  llamaCliPath: string,
  modelPath: string,
  schemaPath: string,
  systemPromptPath: string,
  promptPath: string,
  runtimeDir: string,
  runDir: string,
): string[] {
  const config = ledger.execution_contract;
  return [
    "-D", `RUNTIME_DIR=${runtimeDir}`,
    "-D", `MODEL_PATH=${modelPath}`,
    "-D", `OUTPUT_SCHEMA_PATH=${schemaPath}`,
    "-D", `SYSTEM_PROMPT_PATH=${systemPromptPath}`,
    "-D", `PROMPT_PATH=${promptPath}`,
    "-D", `RUN_DIR=${runDir}`,
    "-f", ledger.locked_files.sandbox_profile.path.startsWith("/") ? ledger.locked_files.sandbox_profile.path : "__SANDBOX_PROFILE__",
    llamaCliPath,
    "--model", modelPath,
    "--json-schema-file", schemaPath,
    "--system-prompt-file", systemPromptPath,
    "--file", promptPath,
    "--offline",
    "--no-mmproj",
    "--no-conversation",
    "--single-turn",
    "--simple-io",
    "--no-display-prompt",
    "--no-show-timings",
    "--log-disable",
    "--seed", String(config.seed),
    "--temp", String(config.temperature),
    "--top-k", String(config.top_k),
    "--top-p", String(config.top_p),
    "--min-p", String(config.min_p),
    "--repeat-penalty", String(config.repeat_penalty),
    "--ctx-size", String(config.context_size),
    "--n-predict", String(config.max_output_tokens),
    "--threads", String(config.threads),
    "--threads-batch", String(config.threads_batch),
    "--gpu-layers", config.gpu_layers,
    "--reasoning", "off",
    "--reasoning-budget", "0",
  ];
}

async function executeAttempt(
  attempt: number,
  ledger: RuntimeLedger,
  llamaCliPath: string,
  modelPath: string,
  schemaPath: string,
  systemPromptPath: string,
  sandboxProfilePath: string,
  promptPath: string,
  runDir: string,
  runtimeDir: string,
  now: () => Date,
  transcript: NormalizedTranscript,
  promptSegments: PromptSegment[],
  inputHash: string,
): Promise<AttemptResult> {
  const started = now();
  const promptBefore = await readBounded(promptPath, MAX_JSON_BYTES, `attempt ${attempt} prompt`);
  const promptSha256 = sha256(promptBefore);
  const args = commandArgs(ledger, llamaCliPath, modelPath, schemaPath, systemPromptPath, promptPath, runtimeDir, runDir);
  const profileIndex = args.indexOf("__SANDBOX_PROFILE__");
  if (profileIndex < 0) throw new HarnessError("SANDBOX_PROFILE_INTERNAL_ERROR", "execution", "sandbox profile binding failed");
  args[profileIndex] = sandboxProfilePath;
  const stdoutParts: Buffer[] = [];
  const stderrParts: Buffer[] = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const stdoutDigest = createHash("sha256");
  const stderrDigest = createHash("sha256");
  let overflow = false;
  let timedOut = false;
  let exitCode: number | null = null;
  let signal: string | null = null;

  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    PATH: "/usr/bin:/bin",
    HOME: runDir,
    TMPDIR: runDir,
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    HF_HUB_OFFLINE: "1",
    TRANSFORMERS_OFFLINE: "1",
    LLAMA_ARG_OFFLINE: "1",
    NO_PROXY: "*",
    no_proxy: "*",
    DYLD_LIBRARY_PATH: path.dirname(llamaCliPath),
  };
  await new Promise<void>((resolve, reject) => {
    const child = spawn("/usr/bin/time", ["-l", "/usr/bin/sandbox-exec", ...args], {
      cwd: runDir,
      detached: true,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const killProcessGroup = (): void => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
        else child.kill("SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killProcessGroup();
    }, ledger.execution_contract.timeout_ms_per_attempt);
    const capture = (part: Buffer, target: Buffer[], stream: "stdout" | "stderr"): void => {
      const digest = stream === "stdout" ? stdoutDigest : stderrDigest;
      digest.update(part);
      if (stream === "stdout") stdoutBytes += part.byteLength;
      else stderrBytes += part.byteLength;
      const total = stream === "stdout" ? stdoutBytes : stderrBytes;
      const prior = total - part.byteLength;
      const retainBytes = Math.max(0, Math.min(part.byteLength, MAX_CAPTURE_BYTES - prior));
      if (retainBytes > 0) target.push(part.subarray(0, retainBytes));
      if (total > MAX_CAPTURE_BYTES) {
        overflow = true;
        killProcessGroup();
      }
    };
    child.stdout.on("data", (part: Buffer) => capture(part, stdoutParts, "stdout"));
    child.stderr.on("data", (part: Buffer) => capture(part, stderrParts, "stderr"));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, closeSignal) => {
      clearTimeout(timer);
      exitCode = code;
      signal = closeSignal;
      resolve();
    });
  }).catch(() => {
    throw new HarnessError("PROCESS_START_FAILED", "execution", "local sandboxed model process could not start");
  });

  const completed = now();
  const stdout = Buffer.concat(stdoutParts);
  const stderr = Buffer.concat(stderrParts);
  const stderrText = stderr.toString("utf8");
  const maximumResidentSetSizeMatch = stderrText.match(/^\s*([0-9]+)\s+maximum resident set size\s*$/m);
  const peakMemoryFootprintMatch = stderrText.match(/^\s*([0-9]+)\s+peak memory footprint\s*$/m);
  const maximumResidentSetSizeBytes = maximumResidentSetSizeMatch ? Number(maximumResidentSetSizeMatch[1]) : null;
  const peakMemoryFootprintBytes = peakMemoryFootprintMatch ? Number(peakMemoryFootprintMatch[1]) : null;
  let promptStable = false;
  try {
    const promptAfter = await readBounded(promptPath, MAX_JSON_BYTES, `attempt ${attempt} prompt after execution`);
    promptStable = promptAfter.equals(promptBefore);
  } catch {
    promptStable = false;
  }
  let parsed: unknown = null;
  let parseValid = false;
  let shapeErrors: string[] = [];
  let semanticErrors: string[] = [];
  let metrics: ValidationMetrics = { materialClaimCount: 0, citationCount: 0, invalidReferenceCount: 0, unsafeMarkupCount: 0 };
  const errorCodes: string[] = [];
  if (overflow) errorCodes.push("OUTPUT_LIMIT_EXCEEDED");
  if (timedOut) errorCodes.push("ATTEMPT_TIMEOUT");
  if (exitCode !== 0) errorCodes.push("PROCESS_EXIT_NONZERO");
  if (!promptStable) errorCodes.push("PROMPT_CHANGED_DURING_ATTEMPT");
  if (maximumResidentSetSizeBytes === null || peakMemoryFootprintBytes === null) errorCodes.push("RESOURCE_MEASUREMENT_MISSING");
  if (!overflow && !timedOut && exitCode === 0 && promptStable) {
    try {
      parsed = parseExactJson(stdout);
      parseValid = true;
      const validation = validateEnrichmentOutput(parsed, transcript, promptSegments, inputHash);
      shapeErrors = validation.shapeErrors;
      semanticErrors = validation.semanticErrors;
      metrics = validation.metrics;
      errorCodes.push(...shapeErrors, ...semanticErrors);
    } catch {
      errorCodes.push("OUTPUT_JSON_INVALID");
    }
  }
  const rawBase = path.join(runDir, `attempt-${attempt}`);
  await writePrivateFile(`${rawBase}.stdout`, stdout);
  await writePrivateFile(`${rawBase}.stderr`, stderr);
  const record: AttemptRecord = {
    attempt,
    kind: attempt === 1 ? "initial" : "sealed_format_only_retry",
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
    duration_ms: Math.max(0, completed.getTime() - started.getTime()),
    prompt_sha256: promptSha256,
    exit_code: exitCode,
    signal,
    timed_out: timedOut,
    maximum_resident_set_size_bytes: maximumResidentSetSizeBytes,
    peak_memory_footprint_bytes: peakMemoryFootprintBytes,
    stdout_bytes: stdoutBytes,
    stdout_retained_bytes: stdout.byteLength,
    stdout_sha256: stdoutDigest.digest("hex"),
    stderr_bytes: stderrBytes,
    stderr_retained_bytes: stderr.byteLength,
    stderr_sha256: stderrDigest.digest("hex"),
    parse_valid: parseValid,
    shape_valid: parseValid && shapeErrors.length === 0,
    semantic_reference_valid: parseValid && shapeErrors.length === 0 && semanticErrors.length === 0,
    error_codes: [...new Set(errorCodes)].sort(),
  };
  return { record, stdout, stderr, parsed, shapeErrors, semanticErrors, metrics };
}

async function writePrivateFile(filePath: string, data: Buffer | string): Promise<void> {
  await writeFile(filePath, data, { mode: 0o600, flag: "wx" });
  await chmod(filePath, 0o600);
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function preparePrivateOutputDirectory(projectRoot: string, privateOutputDir: string): Promise<string> {
  const resolved = path.resolve(privateOutputDir);
  if (isWithin(projectRoot, resolved)) {
    throw new HarnessError("PRIVATE_OUTPUT_INSIDE_PROJECT", "preflight", "private output directory must be outside the project worktree");
  }
  if (await lstat(resolved).catch(() => null)) {
    throw new HarnessError("PRIVATE_OUTPUT_ALREADY_EXISTS", "preflight", "private output directory must not exist before the run");
  }
  const parent = path.dirname(resolved);
  const parentInfo = await lstat(parent).catch(() => null);
  if (!parentInfo || !parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new HarnessError("PRIVATE_OUTPUT_PARENT_INVALID", "preflight", "private output parent must be an existing non-symlink directory");
  }
  const parentReal = await realpath(parent);
  if (isWithin(projectRoot, parentReal)) {
    throw new HarnessError("PRIVATE_OUTPUT_INSIDE_PROJECT", "preflight", "private output parent resolves inside the project worktree");
  }
  await mkdir(resolved, { mode: 0o700 });
  const [createdInfo, createdReal] = await Promise.all([lstat(resolved), realpath(resolved)]);
  if (!createdInfo.isDirectory() || createdInfo.isSymbolicLink() || isWithin(projectRoot, createdReal)) {
    throw new HarnessError("PRIVATE_OUTPUT_CREATE_INVALID", "preflight", "private output directory failed its post-create boundary check");
  }
  await chmod(createdReal, 0o700);
  return createdReal;
}

async function canonicalPublicReportPath(projectRoot: string, itemId: string): Promise<string> {
  const decisionsDir = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "decisions");
  const decisionsInfo = await lstat(decisionsDir).catch(() => null);
  if (!decisionsInfo || !decisionsInfo.isDirectory() || decisionsInfo.isSymbolicLink()) {
    throw new HarnessError("PUBLIC_REPORT_PARENT_INVALID", "preflight", "canonical decisions directory must be an existing non-symlink directory");
  }
  const decisionsReal = await realpath(decisionsDir);
  if (!isWithin(projectRoot, decisionsReal)) {
    throw new HarnessError("PUBLIC_REPORT_PATH_ESCAPE", "preflight", "canonical decisions directory escapes the project root");
  }
  const reportDir = path.join(projectRoot, PUBLIC_REPORT_DIRECTORY_RELATIVE_PATH);
  const existing = await lstat(reportDir).catch(() => null);
  let created = false;
  if (!existing) {
    await mkdir(reportDir, { mode: 0o755 }).then(() => {
      created = true;
    }).catch((error: unknown) => {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "EEXIST") throw error;
    });
  }
  const [reportDirInfo, reportDirReal] = await Promise.all([lstat(reportDir), realpath(reportDir)]);
  if (!reportDirInfo.isDirectory() || reportDirInfo.isSymbolicLink() || !isWithin(projectRoot, reportDirReal)) {
    throw new HarnessError("PUBLIC_REPORT_PARENT_INVALID", "preflight", "canonical public-report directory failed its boundary check");
  }
  if (created) {
    await syncDirectory(
      decisionsReal,
      "PUBLIC_REPORT_PARENT_INVALID",
      "preflight",
      "canonical public-report directory entry could not be synchronized durably",
    );
  }
  const reportPath = path.join(reportDirReal, `${itemId}.json`);
  if (await lstat(reportPath).catch(() => null)) {
    throw new HarnessError("PUBLIC_REPORT_ALREADY_EXISTS", "preflight", "canonical public report already exists and will not be replaced");
  }
  return reportPath;
}

interface ModelAttemptClaim {
  schema_version: "1.0";
  claim_type: "canonical_model_harness_attempt";
  harness_version: typeof HARNESS_VERSION;
  execution_class: ExecutionClass;
  content_commit: string;
  seal_commit: string;
  item_id: string;
  gate_3_result_document_sha256: string;
  normalized_transcript_sha256: string;
}

function canonicalAttemptClaimPath(publicReportPath: string, itemId: string): string {
  return path.join(path.dirname(publicReportPath), `${itemId}.attempt-claim.json`);
}

async function claimCanonicalModelAttempt(
  filePath: string,
  claim: ModelAttemptClaim,
  injectedFailure?: "file_sync" | "parent_sync",
): Promise<void> {
  await writeDurableExclusiveJson(filePath, claim, {
    mode: 0o644,
    maximumBytes: MAX_JSON_BYTES,
    failureCode: "MODEL_ATTEMPT_CLAIM_FAILED",
    stage: "preflight",
    existingCode: "MODEL_ATTEMPT_ALREADY_CLAIMED",
    existingMessage: "the canonical item attempt is already claimed and will not start another model process",
    failureMessage: "the canonical item attempt could not be durably recorded without replacement",
    injectedFailure,
  });
}

interface DurableExclusiveJsonOptions {
  mode: number;
  maximumBytes: number;
  failureCode: string;
  stage: HarnessError["stage"];
  existingCode?: string;
  existingMessage?: string;
  failureMessage: string;
  injectedFailure?: "file_sync" | "parent_sync";
}

async function syncDirectory(
  directory: string,
  failureCode: string,
  stage: HarnessError["stage"],
  message: string,
): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new HarnessError(failureCode, stage, message);
  try {
    await handle.sync();
  } catch {
    throw new HarnessError(failureCode, stage, message);
  } finally {
    await handle.close();
  }
}

async function writeDurableExclusiveJson(filePath: string, value: unknown, options: DurableExclusiveJsonOptions): Promise<void> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  if (bytes.byteLength < 1 || bytes.byteLength > options.maximumBytes) {
    throw new HarnessError(options.failureCode, options.stage, options.failureMessage);
  }
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(
      filePath,
      constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      options.mode,
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (options.existingCode && (code === "EEXIST" || code === "ELOOP")) {
      throw new HarnessError(options.existingCode, options.stage, options.existingMessage ?? options.failureMessage);
    }
    throw new HarnessError(options.failureCode, options.stage, options.failureMessage);
  }
  try {
    await handle.writeFile(bytes);
    await handle.chmod(options.mode);
    if (options.injectedFailure === "file_sync") throw new Error("injected file synchronization failure");
    await handle.sync();
    const info = await handle.stat();
    if (
      !info.isFile()
      || info.nlink !== 1
      || info.size !== bytes.byteLength
      || info.size > options.maximumBytes
      || (info.mode & 0o777) !== options.mode
    ) throw new Error("exclusive JSON file identity is invalid");
    const observed = Buffer.alloc(bytes.byteLength);
    let offset = 0;
    while (offset < observed.byteLength) {
      const { bytesRead } = await handle.read(observed, offset, observed.byteLength - offset, offset);
      if (bytesRead < 1) throw new Error("exclusive JSON readback ended early");
      offset += bytesRead;
    }
    if (!observed.equals(bytes)) throw new Error("exclusive JSON readback differs from the intended bytes");
  } catch (error) {
    if (error instanceof HarnessError) throw error;
    throw new HarnessError(options.failureCode, options.stage, options.failureMessage);
  } finally {
    await handle.close();
  }
  if (options.injectedFailure === "parent_sync") {
    throw new HarnessError(options.failureCode, options.stage, options.failureMessage);
  }
  await syncDirectory(path.dirname(filePath), options.failureCode, options.stage, options.failureMessage);
}

async function writeJsonAtomicExclusive(
  filePath: string,
  value: unknown,
  mode: number,
  injectedFailure?: "file_sync" | "parent_sync",
): Promise<void> {
  await writeDurableExclusiveJson(filePath, value, {
    mode,
    maximumBytes: MAX_JSON_BYTES,
    failureCode: "PUBLIC_REPORT_WRITE_FAILED",
    stage: "retention_cleanup",
    failureMessage: "canonical public report could not be durably written without replacement",
    injectedFailure,
  });
}

function toRunId(itemId: string, started: Date, inputHash: string): string {
  const stamp = started.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${itemId}-${stamp}-${sha256(`${itemId}\0${started.toISOString()}\0${inputHash}`).slice(0, 12)}`;
}

function makeFailure(code: string, stage: string, retryConsumed: boolean, detail: string): JsonObject {
  return {
    code,
    stage,
    recoverable: true,
    truthful_user_state: "enrichment_unavailable_transcript_preserved",
    retry_consumed: retryConsumed,
    detail,
  };
}

export async function runLocalModelHarness(options: HarnessOptions): Promise<PublicRunReport> {
  const now = options.now ?? (() => new Date());
  if (options.executionClass !== "SEALED" && options.executionClass !== "DEV_TEST") {
    throw new HarnessError("EXECUTION_CLASS_INVALID", "preflight", "execution class is invalid");
  }
  const durabilityFailures = ["claim_file_sync", "claim_parent_sync", "report_file_sync", "report_parent_sync"] as const;
  if (
    options.devDurabilityFailure !== undefined
    && (
      options.executionClass !== "DEV_TEST"
      || !String(process.env.NODE_TEST_CONTEXT ?? "").startsWith("child")
      || !durabilityFailures.includes(options.devDurabilityFailure)
    )
  ) {
    throw new HarnessError("DEV_TEST_DURABILITY_HOOK_PROHIBITED", "preflight", "durability fault injection is restricted to DEV_TEST under the Node test runner");
  }
  if (!ITEM_ID_RE.test(options.itemId)) throw new HarnessError("ITEM_ID_INVALID", "preflight", "item ID is invalid");
  [options.projectRoot, options.runtimeDir, options.modelPath, options.authorizationLedgerPath,
    options.attestationPath, options.normalizedTranscriptPath, options.systemPromptPath, options.formatRepairPromptPath,
    options.outputSchemaPath, options.keyPointRubricPath, options.sandboxProfilePath, options.privateOutputDir,
    options.privateEvidenceRoot]
    .forEach((candidate, index) => assertAbsolute(candidate, `path argument ${index + 1}`));

  const projectRootInfo = await lstat(options.projectRoot).catch(() => null);
  if (!projectRootInfo || !projectRootInfo.isDirectory() || projectRootInfo.isSymbolicLink()) {
    throw new HarnessError("PROJECT_ROOT_INVALID", "preflight", "project root must be a non-symlink directory");
  }
  const projectRoot = await realpath(options.projectRoot);
  if (options.executionClass === "DEV_TEST") {
    const testTemporaryRoot = await realpath(tmpdir());
    if (
      !String(process.env.NODE_TEST_CONTEXT ?? "").startsWith("child") ||
      !isWithin(testTemporaryRoot, projectRoot)
    ) {
      throw new HarnessError(
        "DEV_TEST_CONTEXT_REQUIRED",
        "preflight",
        "DEV_TEST execution is available only inside the Node test runner and its temporary root",
      );
    }
  }
  const lockReport = verifySealedProject(projectRoot, options.executionClass);
  const runtimeLedgerPath = path.join(projectRoot, RUNTIME_LEDGER_RELATIVE_PATH);
  const ledgerBytes = await readBounded(runtimeLedgerPath, MAX_JSON_BYTES, "runtime ledger");
  let ledgerValue: unknown;
  try { ledgerValue = parseJsonBytesWithoutDuplicateKeys(ledgerBytes); }
  catch { throw new HarnessError("RUNTIME_LEDGER_INVALID", "preflight", "runtime ledger is not valid JSON"); }
  const ledger = asRuntimeLedger(ledgerValue);
  assertRuntimeLedgerReady(ledger);
  await assertLockedFile(projectRoot, options.systemPromptPath, ledger.locked_files.system_prompt, "system prompt");
  await assertLockedFile(projectRoot, options.formatRepairPromptPath, ledger.locked_files.format_repair_prompt, "format repair prompt");
  await assertLockedFile(projectRoot, options.outputSchemaPath, ledger.locked_files.output_schema, "output schema");
  await assertLockedFile(projectRoot, options.authorizationLedgerPath, ledger.locked_files.authorization_ledger, "authorization ledger");
  await assertLockedFile(projectRoot, options.keyPointRubricPath, ledger.locked_files.key_point_rubric, "key-point rubric");
  await assertLockedFile(projectRoot, options.sandboxProfilePath, ledger.locked_files.sandbox_profile, "sandbox profile");
  const sandboxText = decodeStrictUtf8(
    await readBounded(options.sandboxProfilePath, 32 * 1024, "sandbox profile"),
    "SANDBOX_PROFILE_INVALID",
    "sandbox profile",
  ).replace(/\s+/g, " ");
  for (const requiredRule of [
    "(deny network*)",
    "(deny file-read* (subpath \"/Users\"))",
    "(deny file-write* (subpath \"/Users\"))",
    "(allow file-read* (subpath (param \"RUNTIME_DIR\")))",
    "(allow file-read* file-write* (subpath (param \"RUN_DIR\")))",
  ]) {
    if (!sandboxText.includes(requiredRule)) {
      throw new HarnessError("SANDBOX_PROFILE_INVALID", "preflight", "sandbox profile is missing a required network or filesystem boundary");
    }
  }

  const llamaCliPath = await verifyRuntimeDirectory(options.runtimeDir, ledger);
  const runtimeRoot = await realpath(options.runtimeDir);
  const modelObserved = await hashRegularFile(options.modelPath, "model file");
  if (modelObserved.bytes !== ledger.model.observed_file.bytes || modelObserved.sha256 !== ledger.model.observed_file.sha256 || modelObserved.mode !== ledger.model.observed_file.mode) {
    throw new HarnessError("MODEL_FILE_MISMATCH", "preflight", "model file failed identity verification");
  }
  const modelRealPath = await realpath(options.modelPath);

  const authorizationValue = await readJson(options.authorizationLedgerPath, "authorization ledger");
  const authorization = getAuthorizationItem(authorizationValue, options.itemId);
  const expectedAttestationPath = path.resolve(projectRoot, authorization.attestation_path);
  if (!isWithin(projectRoot, expectedAttestationPath) || expectedAttestationPath === projectRoot) {
    throw new HarnessError("ATTESTATION_PATH_ESCAPE", "preflight", "attestation path escapes the project root");
  }
  const [expectedAttestationRealPath, suppliedAttestationRealPath] = await Promise.all([
    realpath(expectedAttestationPath).catch(() => ""),
    realpath(options.attestationPath).catch(() => ""),
  ]);
  if (
    expectedAttestationRealPath === "" ||
    !isWithin(projectRoot, expectedAttestationRealPath) ||
    suppliedAttestationRealPath === "" ||
    suppliedAttestationRealPath !== expectedAttestationRealPath
  ) {
    throw new HarnessError("ATTESTATION_PATH_MISMATCH", "preflight", "attestation path does not match authorization ledger");
  }
  const attestation = await hashRegularFile(options.attestationPath, "attestation");
  if (attestation.sha256 !== authorization.attestation_sha256) {
    throw new HarnessError("ATTESTATION_HASH_MISMATCH", "preflight", "attestation hash does not match authorization ledger");
  }

  const normalizedBytes = await readBounded(options.normalizedTranscriptPath, MAX_JSON_BYTES, "normalized transcript");
  if (normalizedBytes.includes(0)) throw new HarnessError("NORMALIZED_INPUT_NUL", "preflight", "normalized transcript contains a NUL byte");
  let normalizedValue: unknown;
  try { normalizedValue = parseJsonBytesWithoutDuplicateKeys(normalizedBytes); }
  catch { throw new HarnessError("NORMALIZED_INPUT_JSON_INVALID", "preflight", "normalized transcript is not valid JSON"); }
  const transcript = parseNormalizedTranscript(normalizedValue, options.itemId, authorization);
  const inputHash = sha256(normalizedBytes);
  const gate3Handoff = await verifyGate3Handoff(
    projectRoot,
    options.itemId,
    options.privateEvidenceRoot,
    options.normalizedTranscriptPath,
    lockReport,
    options.devGate3Binding,
  );
  if (
    gate3Handoff.item.model_input_normalized_output_file_sha256 !== inputHash
    || gate3Handoff.item.source_raw_sha256 !== authorization.source_raw_sha256
  ) {
    throw new HarnessError(
      "GATE_3_EVIDENCE_INVALID",
      "preflight",
      "admitted normalized bytes or source identity differ from the verified Gate 3 evidence chain",
    );
  }
  const built = buildPrompt(transcript, inputHash);
  const started = now();
  const runId = toRunId(options.itemId, started, inputHash);
  const publicReportPath = await canonicalPublicReportPath(projectRoot, options.itemId);
  const privateOutputRoot = await preparePrivateOutputDirectory(projectRoot, options.privateOutputDir);
  await claimCanonicalModelAttempt(canonicalAttemptClaimPath(publicReportPath, options.itemId), {
    schema_version: "1.0",
    claim_type: "canonical_model_harness_attempt",
    harness_version: HARNESS_VERSION,
    execution_class: options.executionClass,
    content_commit: gate3Handoff.contentCommit,
    seal_commit: gate3Handoff.sealCommit,
    item_id: options.itemId,
    gate_3_result_document_sha256: gate3Handoff.documentSha256,
    normalized_transcript_sha256: inputHash,
  }, options.devDurabilityFailure === "claim_file_sync"
    ? "file_sync"
    : options.devDurabilityFailure === "claim_parent_sync" ? "parent_sync" : undefined);
  const runDir = path.join(privateOutputRoot, runId);
  await mkdir(runDir, { mode: 0o700 });
  await chmod(runDir, 0o700);
  const promptPath = path.join(runDir, "prompt.txt");
  let promptDeleted = false;
  let inputsStableAfterExecution = false;
  const attempts: AttemptResult[] = [];
  let finalResult: AttemptResult | null = null;
  let failure: JsonObject | null = null;
  try {
    await writePrivateFile(promptPath, built.prompt);
    const first = await executeAttempt(1, ledger, llamaCliPath, modelRealPath, options.outputSchemaPath,
      options.systemPromptPath, options.sandboxProfilePath, promptPath, runDir, runtimeRoot, now, transcript, built.segments, inputHash);
    attempts.push(first);
    const formatFailure = first.record.exit_code === 0 && !first.record.timed_out &&
      !first.record.error_codes.includes("OUTPUT_LIMIT_EXCEEDED") &&
      !first.record.error_codes.includes("PROMPT_CHANGED_DURING_ATTEMPT") &&
      !first.record.error_codes.includes("RESOURCE_MEASUREMENT_MISSING") &&
      (!first.record.parse_valid || !first.record.shape_valid);
    if (formatFailure) {
      const repair = await readBounded(options.formatRepairPromptPath, 16 * 1024, "format repair prompt");
      await unlink(promptPath);
      const repairText = decodeStrictUtf8(
        repair,
        "FORMAT_REPAIR_PROMPT_INVALID",
        "format repair prompt",
      );
      await writePrivateFile(promptPath, `${built.prompt}\n${repairText.trimEnd()}\n`);
      const second = await executeAttempt(2, ledger, llamaCliPath, modelRealPath, options.outputSchemaPath,
        options.systemPromptPath, options.sandboxProfilePath, promptPath, runDir, runtimeRoot, now, transcript, built.segments, inputHash);
      attempts.push(second);
      finalResult = second;
    } else finalResult = first;

    if (finalResult.record.semantic_reference_valid) {
      await writePrivateFile(path.join(runDir, "output.json"), `${JSON.stringify(finalResult.parsed, null, 2)}\n`);
    } else {
      const code = finalResult.record.error_codes[0] ?? "MODEL_OUTPUT_INVALID";
      const stage = finalResult.record.exit_code !== 0 || finalResult.record.timed_out ? "execution" :
        !finalResult.record.parse_valid ? "parse" : !finalResult.record.shape_valid ? "shape_validation" : "semantic_validation";
      failure = makeFailure(code, stage, attempts.length === 2, "Local enrichment failed a locked execution or validation check; transcript remains preserved");
    }
  } catch (error) {
    const harnessError = error instanceof HarnessError
      ? error
      : new HarnessError("LOCAL_EXECUTION_INTERNAL_FAILURE", "execution", "local execution failed inside the bounded harness");
    failure = makeFailure(
      harnessError.code,
      harnessError.stage,
      attempts.length === 2,
      "Local execution failed a sealed process or storage check; transcript remains preserved",
    );
  } finally {
    try {
      await unlink(promptPath);
      promptDeleted = true;
    } catch {
      promptDeleted = false;
    }
  }

  try {
    const postLockReport = verifySealedProject(projectRoot, options.executionClass);
    const postLedgerBytes = await readBounded(runtimeLedgerPath, MAX_JSON_BYTES, "runtime ledger after execution");
    if (!postLedgerBytes.equals(ledgerBytes)) throw new Error("runtime ledger changed");
    await assertLockedFile(projectRoot, options.systemPromptPath, ledger.locked_files.system_prompt, "system prompt after execution");
    await assertLockedFile(projectRoot, options.formatRepairPromptPath, ledger.locked_files.format_repair_prompt, "format repair prompt after execution");
    await assertLockedFile(projectRoot, options.outputSchemaPath, ledger.locked_files.output_schema, "output schema after execution");
    await assertLockedFile(projectRoot, options.authorizationLedgerPath, ledger.locked_files.authorization_ledger, "authorization ledger after execution");
    await assertLockedFile(projectRoot, options.keyPointRubricPath, ledger.locked_files.key_point_rubric, "key-point rubric after execution");
    await assertLockedFile(projectRoot, options.sandboxProfilePath, ledger.locked_files.sandbox_profile, "sandbox profile after execution");
    await verifyRuntimeDirectory(runtimeRoot, ledger);
    const postModel = await hashRegularFile(modelRealPath, "model file after execution");
    if (
      postModel.bytes !== modelObserved.bytes ||
      postModel.sha256 !== modelObserved.sha256 ||
      postModel.mode !== modelObserved.mode
    ) throw new Error("model changed");
    const postAttestation = await hashRegularFile(options.attestationPath, "attestation after execution");
    if (postAttestation.sha256 !== attestation.sha256) throw new Error("attestation changed");
    const postNormalizedBytes = await readBounded(options.normalizedTranscriptPath, MAX_JSON_BYTES, "normalized transcript after execution");
    if (!postNormalizedBytes.equals(normalizedBytes)) throw new Error("normalized transcript changed");
    const postGate3 = await verifyGate3Handoff(
      projectRoot,
      options.itemId,
      options.privateEvidenceRoot,
      options.normalizedTranscriptPath,
      postLockReport,
      options.devGate3Binding,
    );
    if (
      postGate3.documentSha256 !== gate3Handoff.documentSha256
      || postGate3.item.model_input_normalized_output_file_sha256 !== inputHash
      || postGate3.item.source_raw_sha256 !== authorization.source_raw_sha256
    ) throw new Error("Gate 3 evidence changed");
    inputsStableAfterExecution = true;
  } catch {
    failure = makeFailure(
      "INPUT_CHANGED_DURING_EXECUTION",
      "execution",
      attempts.length === 2,
      "A sealed runtime, model, benchmark, authorization, or input identity did not survive post-execution verification",
    );
  }

  if (!promptDeleted && !failure) {
    failure = makeFailure("PRIVATE_PROMPT_CLEANUP_FAILED", "retention_cleanup", attempts.length === 2, "Private prompt cleanup could not be confirmed");
  }
  const promptIdentityStable = attempts.length > 0 && attempts.every((attempt) =>
    !attempt.record.error_codes.includes("PROMPT_CHANGED_DURING_ATTEMPT"));
  const resourceMeasurementComplete = attempts.length > 0 && attempts.every((attempt) =>
    attempt.record.maximum_resident_set_size_bytes !== null && attempt.record.peak_memory_footprint_bytes !== null);
  if (!failure && finalResult?.record.semantic_reference_valid === true && (!promptIdentityStable || !resourceMeasurementComplete)) {
    failure = makeFailure(
      "ATTEMPT_EVIDENCE_INCOMPLETE",
      "execution",
      attempts.length === 2,
      "Prompt identity or peak-memory measurement evidence is incomplete",
    );
  }
  const completed = now();
  const finalMetrics = finalResult?.metrics ?? { materialClaimCount: 0, citationCount: 0, invalidReferenceCount: 0, unsafeMarkupCount: 0 };
  const success = failure === null && finalResult?.record.semantic_reference_valid === true && promptDeleted && inputsStableAfterExecution;
  const report: PublicRunReport = {
    schema_version: "1.1",
    harness_version: HARNESS_VERSION,
    execution_class: options.executionClass,
    publication_eligible: options.executionClass === "SEALED",
    run_id: runId,
    run_state: success ? "succeeded" : "failed",
    item_id: options.itemId,
    candidate_id: CANDIDATE_ID,
    started_at: started.toISOString(),
    completed_at: completed.toISOString(),
    input: {
      normalized_transcript_sha256: inputHash,
      source_raw_sha256: authorization.source_raw_sha256,
      segment_count: transcript.segments.length,
      text_character_count: transcript.segments.reduce((total, segment) => total + [...segment.text].length, 0),
      duration_ms: transcript.completeness.source_duration_ms,
      language_tag: transcript.language,
      transcript_status: transcript.completeness.state,
      chunk_count: built.chunkCount,
    },
    gate_3_handoff: {
      result_document_sha256: gate3Handoff.documentSha256,
      content_commit: gate3Handoff.contentCommit,
      seal_commit: gate3Handoff.sealCommit,
      git_bound: gate3Handoff.gitBound,
      model_input_normalized_output_file_sha256: gate3Handoff.item.model_input_normalized_output_file_sha256,
      canonical_normalized_output_sha256: gate3Handoff.item.canonical_normalized_output_sha256,
      token_preservation_rate: gate3Handoff.item.token_preservation_rate,
      timestamp_anchor_match_rate: gate3Handoff.item.timestamp_anchor_match_rate,
    },
    runtime: {
      ledger_sha256: sha256(ledgerBytes),
      llama_cli_sha256: ledger.runtime.extracted.llama_cli.sha256,
      model_sha256: ledger.model.observed_file.sha256,
      system_prompt_sha256: ledger.locked_files.system_prompt.sha256,
      format_repair_prompt_sha256: ledger.locked_files.format_repair_prompt.sha256,
      output_schema_sha256: ledger.locked_files.output_schema.sha256,
      key_point_rubric_sha256: ledger.locked_files.key_point_rubric.sha256,
      sandbox_profile_sha256: ledger.locked_files.sandbox_profile.sha256,
      sampling: {
        temperature: 0, seed: 424242, top_k: 1, top_p: 1, min_p: 0, repeat_penalty: 1,
        context_size: 16384, max_output_tokens: 4096, reasoning: "disabled",
      },
      network_boundary: "sandbox_exec_deny_network_and_user_home_except_bound_inputs_plus_llama_offline",
      post_execution_input_reverification: inputsStableAfterExecution,
    },
    attempts: attempts.map((attempt) => attempt.record),
    validation: {
      output_sha256: success && finalResult ? sha256(`${JSON.stringify(finalResult.parsed, null, 2)}\n`) : null,
      schema_valid: finalResult?.record.shape_valid ?? false,
      semantic_reference_valid: finalResult?.record.semantic_reference_valid ?? false,
      material_claim_count: finalMetrics.materialClaimCount,
      citation_count: finalMetrics.citationCount,
      invalid_reference_count: finalMetrics.invalidReferenceCount,
      unsafe_markup_count: finalMetrics.unsafeMarkupCount,
      prompt_identity_stable: promptIdentityStable,
      resource_measurement_complete: resourceMeasurementComplete,
    },
    cost: {
      incremental_external_service_usd: 0,
      paid_requests: 0,
      provider_requests: 0,
      measurement_scope: "local_wall_clock_only_energy_not_metered",
    },
    privacy: {
      execution_location: "local_process",
      network_denied: true,
      external_transcript_transfer: false,
      server_started: false,
      remote_model_resolution: false,
      raw_text_in_public_report: false,
      public_logs_content_free: true,
      filesystem_boundary: "user_home_denied_except_runtime_model_schema_system_prompt_prompt_and_private_run_directory",
    },
    retention: {
      private_output_delete_by: authorization.retention.private_delete_by,
      private_prompt_deleted_after_run: promptDeleted,
      raw_output_private_only: true,
      normalized_transcript_copied: false,
      public_report_retention: "repository_permanent_hashes_and_metrics_only",
    },
    failure,
    claims_boundary: [
      "local_candidate_only", "ai_evaluated_pending_human_review", "not_production_readiness",
      "no_energy_cost_measurement", "no_external_provider_comparison",
    ],
  };
  await writeJsonAtomicExclusive(
    publicReportPath,
    report,
    0o644,
    options.devDurabilityFailure === "report_file_sync"
      ? "file_sync"
      : options.devDurabilityFailure === "report_parent_sync" ? "parent_sync" : undefined,
  );
  return report;
}
