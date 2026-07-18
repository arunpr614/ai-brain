import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, open, readdir, realpath, unlink } from "node:fs/promises";
import path from "node:path";

import Ajv2020, { type AnySchema, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import {
  CANONICAL_GATE4_ITEM_IDS,
  CLAIMS_BOUNDARY,
  aggregateBlindedEvaluations,
  buildAdjudicationPacket,
  canonicalJson,
  canonicalJsonSha256,
  verifyAdjudicationResult,
  verifyBlindedPacketBundle,
  verifyEvaluatorResult,
  verifyGate4Aggregate,
  type AdjudicationPacket,
  type BlindedAdjudicationResult,
  type BlindedEvaluatorResult,
  type BlindedPacketBundle,
  type Gate4Aggregate,
  type Gate4DeterministicBaseline,
  type Gate4DeterministicBaselineItem,
  type Gate4EvidenceBindings,
  type Gate4RoleEvidenceBindings,
  type JsonEvidenceHashBinding,
} from "./blinded-evaluation";
import { canonicalBlindedPacketPackagePath, verifyGate4AttemptClaim } from "./blinded-packet-operator";
import {
  authoritativeEvaluationClaimPath,
  authoritativeEvaluationTerminalPath,
  readAuthoritativeAttemptClaim,
  readAuthoritativeAttemptTerminal,
  type EvaluationClaimRole,
  type PackageAttemptClaim,
  type PackageAttemptTerminal,
  type RoleAttemptClaim,
  type RoleAttemptTerminal,
} from "./gate4-evaluation-claims";
import type { LocalEvaluatorRunReport } from "./local-blinded-evaluator";
import { parseJsonBytesWithoutDuplicateKeys, verifyLock, type LockVerificationReport } from "./verify-lock";

const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const MODEL_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/benchmark/model`;
const PUBLIC_REPORT_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-public-runs`;
export const GATE4_AGGREGATE_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/decisions/GATE_4_AGGREGATE.json`;
export const GATE4_FINALIZER_VERSION = "1.0.0" as const;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_STREAM_BYTES = 4 * 1024 * 1024;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PRIVATE_TEXT_PATTERNS = [
  /\/(?:Users|home|private|tmp)\//iu,
  /file:\/\//iu,
  /(?:client[_ -]?secret|api[_ -]?key|authorization)\s*[:=]/iu,
  /GOCSPX-[A-Za-z0-9_-]+/u,
  /sk-[A-Za-z0-9_-]{16,}/u,
];

type JsonObject = Record<string, unknown>;
type FinalizerExecutionClass = "SEALED" | "DEV_TEST";

export class Gate4FinalizerError extends Error {
  constructor(
    public readonly code:
      | "PATH_INVALID"
      | "LOCK_INVALID"
      | "PACKAGE_EVIDENCE_INVALID"
      | "PUBLIC_REPORT_INVALID"
      | "ROLE_EVIDENCE_INVALID"
      | "ADJUDICATION_EVIDENCE_INVALID"
      | "AGGREGATE_INVALID"
      | "AGGREGATE_ALREADY_EXISTS"
      | "AGGREGATE_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "Gate4FinalizerError";
  }
}

export interface FinalizeSealedBlindedEvaluationOptions {
  projectRoot: string;
  privateEvidenceRoot: string;
}

/** Test-only boundary. It cannot produce publication-eligible evidence. */
export interface FinalizeBlindedEvaluationForTestsOptions extends FinalizeSealedBlindedEvaluationOptions {
  verifiedLock: Pick<LockVerificationReport, "contentCommit" | "sealCommit" | "lockSha256">;
  devDurabilityFailure?: "staging_file_sync" | "canonical_parent_sync" | "final_parent_sync";
}

export interface Gate4FinalizationResult {
  path: string;
  bytes: Buffer;
  sha256: string;
  aggregate: Gate4Aggregate;
}

interface JsonRecord<T = unknown> {
  path: string;
  bytes: Buffer;
  fileSha256: string;
  canonicalSha256: string;
  value: T;
}

interface FileRecord {
  path: string;
  bytes: Buffer;
  sha256: string;
}

interface VerifiedPackage {
  root: string;
  bundle: BlindedPacketBundle;
  bundleRecord: JsonRecord<BlindedPacketBundle>;
  receiptRecord: JsonRecord<JsonObject>;
  packageClaim: PackageAttemptClaim;
  packageClaimRecord: JsonRecord<PackageAttemptClaim>;
  packageTerminal: PackageAttemptTerminal;
  packageTerminalRecord: JsonRecord<PackageAttemptTerminal>;
}

interface VerifiedRole {
  role: EvaluationClaimRole;
  result: BlindedEvaluatorResult | BlindedAdjudicationResult;
  bindings: Gate4RoleEvidenceBindings;
  claimedAt: string;
  completedAt: string;
  packetRecord?: JsonRecord<AdjudicationPacket>;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonObject, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function projectPath(projectRoot: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === ".." || part.includes("\\"))) {
    throw new Gate4FinalizerError("PATH_INVALID", "a canonical project-relative path is invalid");
  }
  const result = path.join(projectRoot, ...relativePath.split("/"));
  if (!isWithin(projectRoot, result) || result === projectRoot) throw new Gate4FinalizerError("PATH_INVALID", "a canonical project path escapes the worktree");
  return result;
}

async function requireExactDirectory(candidate: string, label: string): Promise<string> {
  if (!path.isAbsolute(candidate)) throw new Gate4FinalizerError("PATH_INVALID", `${label} must be absolute`);
  const info = await lstat(candidate).catch(() => null);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) throw new Gate4FinalizerError("PATH_INVALID", `${label} must be an existing non-symlink directory`);
  const resolved = await realpath(candidate);
  if (resolved !== path.resolve(candidate)) throw new Gate4FinalizerError("PATH_INVALID", `${label} must use its exact canonical path`);
  return resolved;
}

async function assertExactDirectoryEntries(directory: string, files: readonly string[], directories: readonly string[], label: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const expected = [...files.map((name) => `f:${name}`), ...directories.map((name) => `d:${name}`)].sort();
  const observed = entries.map((entry) => {
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) return `x:${entry.name}`;
    return `${entry.isFile() ? "f" : "d"}:${entry.name}`;
  }).sort();
  if (canonicalJson(observed) !== canonicalJson(expected)) {
    throw new Gate4FinalizerError("PATH_INVALID", `${label} contains an extra, missing, mistyped, or symlink entry`);
  }
}

async function assertExactFileSetOneOf(directory: string, fileSets: readonly (readonly string[])[], label: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const observed = entries.map((entry) => entry.isFile() && !entry.isSymbolicLink() ? `f:${entry.name}` : `x:${entry.name}`).sort();
  const matches = fileSets.some((files) => canonicalJson(observed) === canonicalJson(files.map((name) => `f:${name}`).sort()));
  if (!matches) throw new Gate4FinalizerError("PATH_INVALID", `${label} is not one permitted exact regular-file set`);
}

async function readFileRecord(filePath: string, maximumBytes: number, label: string, allowEmpty = false, expectedMode?: number): Promise<FileRecord> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate4FinalizerError("PATH_INVALID", `${label} is missing or is a symlink`);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size > maximumBytes || (!allowEmpty && before.size < 1) || (expectedMode !== undefined && (before.mode & 0o777) !== expectedMode)) {
      throw new Gate4FinalizerError("PATH_INVALID", `${label} is not one bounded regular file`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.byteLength !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new Gate4FinalizerError("PATH_INVALID", `${label} changed while it was read`);
    }
    return { path: filePath, bytes, sha256: sha256(bytes) };
  } finally {
    await handle.close();
  }
}

async function readJsonRecord<T = unknown>(filePath: string, label: string, expectedMode?: number): Promise<JsonRecord<T>> {
  const record = await readFileRecord(filePath, MAX_JSON_BYTES, label, false, expectedMode);
  let value: unknown;
  try { value = parseJsonBytesWithoutDuplicateKeys(record.bytes); }
  catch { throw new Gate4FinalizerError("PATH_INVALID", `${label} is not strict JSON`); }
  return { ...record, fileSha256: record.sha256, canonicalSha256: canonicalJsonSha256(value), value: value as T };
}

function binding(record: JsonRecord): JsonEvidenceHashBinding {
  return { file_sha256: record.fileSha256, canonical_json_sha256: record.canonicalSha256 };
}

function assertPublicationSafe(value: unknown): void {
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string" && PRIVATE_TEXT_PATTERNS.some((pattern) => pattern.test(candidate))) {
      throw new Gate4FinalizerError("AGGREGATE_INVALID", "the public aggregate contains private-path or credential-shaped text");
    }
    if (Array.isArray(candidate)) candidate.forEach(visit);
    else if (isObject(candidate)) Object.values(candidate).forEach(visit);
  };
  visit(value);
}

async function compileSchema(projectRoot: string, relativePath: string, label: string): Promise<ValidateFunction> {
  const schema = (await readJsonRecord(projectPath(projectRoot, relativePath), `${label} schema`)).value;
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    return ajv.compile(schema as AnySchema);
  } catch {
    throw new Gate4FinalizerError("AGGREGATE_INVALID", `${label} schema cannot be compiled strictly`);
  }
}

function canonicalRecord<T>(pathName: string, bytes: Buffer, value: T): JsonRecord<T> {
  return { path: pathName, bytes, fileSha256: sha256(bytes), canonicalSha256: canonicalJsonSha256(value), value };
}

async function publicRecord<T>(projectRoot: string, sealCommit: string, name: "package" | EvaluationClaimRole, terminal: boolean): Promise<JsonRecord<T>> {
  try {
    const source = terminal
      ? await readAuthoritativeAttemptTerminal(projectRoot, sealCommit, name)
      : await readAuthoritativeAttemptClaim(projectRoot, sealCommit, name);
    return canonicalRecord(source.path, source.bytes, source.value as T);
  } catch {
    throw new Gate4FinalizerError(name === "package" ? "PACKAGE_EVIDENCE_INVALID" : "ROLE_EVIDENCE_INVALID", `${name} authoritative ${terminal ? "terminal" : "claim"} evidence is missing or invalid`);
  }
}

async function verifyPackage(
  projectRoot: string,
  privateEvidenceRoot: string,
  lock: Pick<LockVerificationReport, "contentCommit" | "sealCommit" | "lockSha256">,
  executionClass: FinalizerExecutionClass,
): Promise<VerifiedPackage> {
  const packageRootCandidate = canonicalBlindedPacketPackagePath(privateEvidenceRoot, lock.sealCommit);
  const packageRoot = await requireExactDirectory(packageRootCandidate, "canonical blinded packet package");
  if (isWithin(projectRoot, packageRoot)) throw new Gate4FinalizerError("PATH_INVALID", "the private packet package must remain outside the worktree");
  const packageMode = (await lstat(packageRoot)).mode & 0o777;
  if (packageMode !== 0o700) throw new Gate4FinalizerError("PATH_INVALID", "the canonical private packet package must be mode 0700");

  const [bundleRecord, receiptRecord, packageClaimRecord, packageTerminalRecord, validateReceipt] = await Promise.all([
    readJsonRecord<BlindedPacketBundle>(path.join(packageRoot, "coordinator.bundle.json"), "private coordinator bundle", 0o600),
    readJsonRecord<JsonObject>(path.join(packageRoot, "generation-receipt.json"), "private packet receipt", 0o600),
    publicRecord<PackageAttemptClaim>(projectRoot, lock.sealCommit, "package", false),
    publicRecord<PackageAttemptTerminal>(projectRoot, lock.sealCommit, "package", true),
    compileSchema(projectRoot, `${MODEL_RELATIVE_ROOT}/BLINDED_PACKET_PACKAGE_RECEIPT.schema.json`, "packet receipt"),
  ]);
  try { verifyBlindedPacketBundle(bundleRecord.value); }
  catch { throw new Gate4FinalizerError("PACKAGE_EVIDENCE_INVALID", "the private coordinator bundle violates its exact sealed contract"); }
  if (!validateReceipt(receiptRecord.value)) throw new Gate4FinalizerError("PACKAGE_EVIDENCE_INVALID", "the private packet receipt violates its strict schema");

  const bundle = bundleRecord.value;
  const receipt = receiptRecord.value;
  const packageClaim = packageClaimRecord.value;
  const packageTerminal = packageTerminalRecord.value;
  const expectedPublication = executionClass === "SEALED";
  const expectedSources = bundle.coordinator_manifest.items.map((item) => ({
    item_id: item.item_id,
    gate_3_result_sha256: item.gate_3_result_sha256,
    gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
    gate_4_public_report_sha256: item.gate_4_public_report_sha256,
    normalized_input_sha256: item.normalized_input_sha256,
    enrichment_output_sha256: item.enrichment_output_sha256,
    gate_4_run_id: item.gate_4_run_id,
  }));
  if (
    bundle.content_commit !== lock.contentCommit
    || bundle.seal_commit !== lock.sealCommit
    || bundle.benchmark_lock_sha256 !== lock.lockSha256
    || bundle.package_attempt_claim_sha256 !== packageClaimRecord.fileSha256
    || packageClaim.execution_class !== executionClass
    || packageClaim.publication_eligible !== expectedPublication
    || packageClaim.content_commit !== lock.contentCommit
    || packageClaim.seal_commit !== lock.sealCommit
    || packageClaim.benchmark_lock_sha256 !== lock.lockSha256
    || packageClaim.claimed_at !== bundle.packet_generated_at
    || packageClaim.gate_3_result_sha256 !== bundle.coordinator_manifest.items[0]?.gate_3_result_sha256
    || packageClaim.execution_contract_sha256 !== bundle.execution_contract_sha256
    || packageClaim.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
    || packageClaim.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
    || canonicalJson(packageClaim.role_system_prompt_sha256) !== canonicalJson(bundle.role_system_prompt_sha256)
    || canonicalJson(packageClaim.role_generation_schema_sha256) !== canonicalJson(bundle.role_generation_schema_sha256)
    || packageClaim.consent_attestation_sha256 !== bundle.consent_attestation_sha256
    || packageClaim.execution_readiness_sha256 !== bundle.execution_readiness_sha256
    || canonicalJson(packageClaim.sources) !== canonicalJson(expectedSources)
    || packageTerminal.execution_class !== executionClass
    || packageTerminal.publication_eligible !== expectedPublication
    || packageTerminal.content_commit !== lock.contentCommit
    || packageTerminal.seal_commit !== lock.sealCommit
    || packageTerminal.public_package_attempt_claim_sha256 !== packageClaimRecord.fileSha256
    || packageTerminal.state !== "succeeded"
    || packageTerminal.failure_code !== null
    || packageTerminal.bundle_sha256 !== bundleRecord.canonicalSha256
    || packageTerminal.bundle_file_sha256 !== bundleRecord.fileSha256
    || packageTerminal.package_receipt_sha256 !== receiptRecord.fileSha256
    || Date.parse(packageTerminal.completed_at) < Date.parse(packageClaim.claimed_at)
  ) throw new Gate4FinalizerError("PACKAGE_EVIDENCE_INVALID", "the public package claim/terminal and private bundle do not form one exact successful chain");

  if (
    receipt.schema_version !== "1.0"
    || receipt.operator_version !== "1.0.0"
    || receipt.state !== "written_exclusively"
    || receipt.content_commit !== bundle.content_commit
    || receipt.seal_commit !== bundle.seal_commit
    || receipt.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
    || receipt.public_package_attempt_claim_sha256 !== packageClaimRecord.fileSha256
    || receipt.packet_generated_at !== bundle.packet_generated_at
    || receipt.consent_attestation_sha256 !== bundle.consent_attestation_sha256
    || receipt.execution_readiness_sha256 !== bundle.execution_readiness_sha256
    || receipt.bundle_sha256 !== bundleRecord.canonicalSha256
    || !isObject(receipt.packet_sha256)
    || receipt.packet_sha256.evaluator_a !== bundle.packets.evaluator_a.packet_sha256
    || receipt.packet_sha256.evaluator_b !== bundle.packets.evaluator_b.packet_sha256
    || canonicalJson(receipt.evidence) !== canonicalJson(expectedSources)
    || receipt.source_selection !== "canonical_gate3_handoff_and_fixed_first_write_gate4_paths_only"
    || receipt.package_location_policy !== "private_evidence_root_outputs_seal_gate4_evaluation_package"
    || receipt.external_provider_calls !== 0
    || receipt.external_content_transfer !== false
    || receipt.claims_boundary !== CLAIMS_BOUNDARY
  ) throw new Gate4FinalizerError("PACKAGE_EVIDENCE_INVALID", "the private packet receipt does not exactly bind the package claim and bundle");

  const [packetA, packetB, consent, readiness] = await Promise.all([
    readJsonRecord(path.join(packageRoot, "evaluator-a.packet.json"), "evaluator A packet", 0o600),
    readJsonRecord(path.join(packageRoot, "evaluator-b.packet.json"), "evaluator B packet", 0o600),
    readJsonRecord(path.join(packageRoot, "consent-attestation.json"), "private consent attestation", 0o600),
    readJsonRecord(path.join(packageRoot, "execution-readiness.json"), "private execution readiness", 0o600),
  ]);
  if (
    canonicalJson(packetA.value) !== canonicalJson(bundle.packets.evaluator_a.packet)
    || packetA.canonicalSha256 !== bundle.packets.evaluator_a.packet_sha256
    || canonicalJson(packetB.value) !== canonicalJson(bundle.packets.evaluator_b.packet)
    || packetB.canonicalSha256 !== bundle.packets.evaluator_b.packet_sha256
    || consent.canonicalSha256 !== bundle.consent_attestation_sha256
    || readiness.canonicalSha256 !== bundle.execution_readiness_sha256
  ) throw new Gate4FinalizerError("PACKAGE_EVIDENCE_INVALID", "the private evaluator packet files differ from the coordinator bundle");

  return { root: packageRoot, bundle, bundleRecord, receiptRecord, packageClaim, packageClaimRecord, packageTerminal, packageTerminalRecord };
}

function countRate(values: readonly boolean[]): { numerator: number; denominator: number; rate: number } {
  const numerator = values.filter(Boolean).length;
  return { numerator, denominator: values.length, rate: numerator / values.length };
}

async function verifyDeterministicBaseline(
  projectRoot: string,
  verifiedPackage: VerifiedPackage,
  executionClass: FinalizerExecutionClass,
): Promise<Gate4DeterministicBaseline> {
  const validateReport = await compileSchema(projectRoot, `${MODEL_RELATIVE_ROOT}/PUBLIC_RUN_REPORT.schema.json`, "public model run report");
  const items: Gate4DeterministicBaselineItem[] = [];
  for (const [index, itemId] of CANONICAL_GATE4_ITEM_IDS.entries()) {
    const manifest = verifiedPackage.bundle.coordinator_manifest.items[index];
    if (!manifest || manifest.item_id !== itemId) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", "the coordinator manifest denominator is not the exact ordered five");
    const [attemptClaim, reportRecord] = await Promise.all([
      readJsonRecord(projectPath(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.attempt-claim.json`), `${itemId} model attempt claim`),
      readJsonRecord<JsonObject>(projectPath(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.json`), `${itemId} public model run report`),
    ]);
    if (attemptClaim.fileSha256 !== manifest.gate_4_attempt_claim_sha256 || reportRecord.fileSha256 !== manifest.gate_4_public_report_sha256) {
      throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} public claim/report bytes differ from the package manifest`);
    }
    try {
      verifyGate4AttemptClaim(attemptClaim.value, {
        itemId,
        contentCommit: verifiedPackage.bundle.content_commit,
        sealCommit: verifiedPackage.bundle.seal_commit,
        gate3DocumentSha256: manifest.gate_3_result_sha256,
        inputSha256: manifest.normalized_input_sha256,
      });
    } catch {
      throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} model attempt claim is invalid`);
    }
    const report = reportRecord.value;
    if (!validateReport(report)) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} public run report violates its strict schema`);
    const expectedPublication = executionClass === "SEALED";
    const input = report.input;
    const handoff = report.gate_3_handoff;
    const runtime = report.runtime;
    const validation = report.validation;
    const cost = report.cost;
    const privacy = report.privacy;
    const retention = report.retention;
    const attempts = report.attempts;
    if (
      report.schema_version !== "1.1"
      || report.harness_version !== "1.2.0"
      || report.execution_class !== executionClass
      || report.publication_eligible !== expectedPublication
      || report.run_state !== "succeeded"
      || report.item_id !== itemId
      || report.run_id !== manifest.gate_4_run_id
      || report.candidate_id !== "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"
      || !isObject(input) || input.normalized_transcript_sha256 !== manifest.normalized_input_sha256
      || !isObject(handoff)
      || handoff.result_document_sha256 !== manifest.gate_3_result_sha256
      || handoff.content_commit !== verifiedPackage.bundle.content_commit
      || handoff.seal_commit !== verifiedPackage.bundle.seal_commit
      || handoff.model_input_normalized_output_file_sha256 !== manifest.normalized_input_sha256
      || handoff.git_bound !== expectedPublication
      || !isObject(runtime)
      || runtime.ledger_sha256 !== verifiedPackage.packageClaim.runtime_ledger_sha256
      || runtime.llama_cli_sha256 !== verifiedPackage.packageClaim.llama_cli_sha256
      || runtime.model_sha256 !== verifiedPackage.packageClaim.model_sha256
      || runtime.sandbox_profile_sha256 !== verifiedPackage.packageClaim.sandbox_profile_sha256
      || runtime.post_execution_input_reverification !== true
      || !isObject(validation)
      || validation.output_sha256 !== manifest.enrichment_output_sha256
      || !isObject(cost)
      || !isObject(privacy)
      || !isObject(retention)
      || !Array.isArray(attempts)
      || attempts.length < 1 || attempts.length > 2
      || report.failure !== null
    ) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} report does not bind one successful fixed sealed cell`);

    const startedAt = Date.parse(String(report.started_at));
    const completedAt = Date.parse(String(report.completed_at));
    if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt) || completedAt < startedAt || completedAt > Date.parse(verifiedPackage.packageClaim.claimed_at)) {
      throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} report chronology is invalid`);
    }
    let previousCompleted = startedAt;
    for (const [attemptIndex, attemptValue] of attempts.entries()) {
      if (!isObject(attemptValue)) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} attempt is not an object`);
      const attemptStarted = Date.parse(String(attemptValue.started_at));
      const attemptCompleted = Date.parse(String(attemptValue.completed_at));
      if (
        attemptValue.attempt !== attemptIndex + 1
        || attemptValue.kind !== (attemptIndex === 0 ? "initial" : "sealed_format_only_retry")
        || !Number.isFinite(attemptStarted) || !Number.isFinite(attemptCompleted)
        || attemptStarted < previousCompleted || attemptCompleted < attemptStarted || attemptCompleted > completedAt
        || attemptValue.duration_ms !== attemptCompleted - attemptStarted
      ) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} attempt ordering or latency is malformed`);
      previousCompleted = attemptCompleted;
    }
    const first = attempts[0] as JsonObject;
    const final = attempts[attempts.length - 1] as JsonObject;
    const firstSchemaValid = first.parse_valid === true && first.shape_valid === true;
    const finalSchemaValid = validation.schema_valid === true && final.parse_valid === true && final.shape_valid === true;
    const semanticValid = validation.semantic_reference_valid === true && validation.invalid_reference_count === 0 && final.semantic_reference_valid === true;
    if (
      (attempts.length === 2 && firstSchemaValid)
      || (attempts.length === 2 && (finalSchemaValid !== true || semanticValid !== true))
      || (attempts.length === 1 && (finalSchemaValid !== true || semanticValid !== true))
    ) throw new Gate4FinalizerError("PUBLIC_REPORT_INVALID", `${itemId} retry use or final validity is inconsistent with the sealed format-only contract`);
    const latencyResourceMeasured = attempts.every((attempt) => isObject(attempt)
      && Number.isInteger(attempt.duration_ms) && (attempt.duration_ms as number) >= 0
      && Number.isInteger(attempt.maximum_resident_set_size_bytes) && (attempt.maximum_resident_set_size_bytes as number) >= 0
      && Number.isInteger(attempt.peak_memory_footprint_bytes) && (attempt.peak_memory_footprint_bytes as number) >= 0)
      && validation.resource_measurement_complete === true;
    const truthfulState = report.run_state === "succeeded" && report.failure === null
      && validation.schema_valid === finalSchemaValid
      && validation.semantic_reference_valid === semanticValid;
    const zeroExternal = cost.incremental_external_service_usd === 0 && cost.paid_requests === 0 && cost.provider_requests === 0
      && privacy.network_denied === true && privacy.external_transcript_transfer === false;
    items.push({
      item_id: itemId,
      public_report_sha256: reportRecord.fileSha256,
      run_id: manifest.gate_4_run_id,
      attempt_count: attempts.length as 1 | 2,
      first_attempt_schema_valid: firstSchemaValid,
      final_schema_valid: finalSchemaValid,
      semantic_reference_valid: semanticValid,
      truthful_state: truthfulState,
      latency_resource_measured: latencyResourceMeasured,
      zero_external_cost_and_provider_calls: zeroExternal,
    });
  }
  const summary = {
    first_attempt_schema_validity: countRate(items.map((item) => item.first_attempt_schema_valid)),
    final_schema_validity: countRate(items.map((item) => item.final_schema_valid)),
    semantic_reference_validity: countRate(items.map((item) => item.semantic_reference_valid)),
    truthful_state: countRate(items.map((item) => item.truthful_state)),
    latency_resource_measured: countRate(items.map((item) => item.latency_resource_measured)),
    zero_external_cost_and_provider_calls: countRate(items.map((item) => item.zero_external_cost_and_provider_calls)),
  };
  const allRequired = summary.first_attempt_schema_validity.rate >= 0.9
    && summary.final_schema_validity.rate === 1
    && summary.semantic_reference_validity.rate === 1
    && summary.truthful_state.rate === 1
    && summary.latency_resource_measured.rate === 1
    && summary.zero_external_cost_and_provider_calls.rate === 1;
  return { items, summary, all_required_criteria_pass: allRequired };
}

function expectedRolePacket(verifiedPackage: VerifiedPackage, role: EvaluationClaimRole, adjudicationPacket?: AdjudicationPacket): { packetId: string; packetSha256: string } {
  if (role === "adjudicator") {
    if (!adjudicationPacket) throw new Gate4FinalizerError("ADJUDICATION_EVIDENCE_INVALID", "the adjudicator packet is unavailable");
    return { packetId: adjudicationPacket.packet_id, packetSha256: canonicalJsonSha256(adjudicationPacket) };
  }
  const packet = verifiedPackage.bundle.packets[role];
  return { packetId: packet.packet.packet_id, packetSha256: packet.packet_sha256 };
}

function terminalProcessFromReport(report: LocalEvaluatorRunReport): RoleAttemptTerminal["process"] {
  return {
    invocation_count: report.process.invocation_count,
    timeout_ms: report.process.timeout_ms,
    exit_code: report.process.exit_code,
    signal: report.process.signal,
    timed_out: report.process.timed_out,
    output_overflow: report.process.output_overflow,
    stdout_bytes: report.process.stdout_bytes,
    stdout_retained_bytes: report.process.stdout_retained_bytes,
    stdout_sha256: report.process.stdout_sha256,
    stderr_bytes: report.process.stderr_bytes,
    stderr_retained_bytes: report.process.stderr_retained_bytes,
    stderr_sha256: report.process.stderr_sha256,
  };
}

async function verifyRole(
  projectRoot: string,
  verifiedPackage: VerifiedPackage,
  role: EvaluationClaimRole,
  executionClass: FinalizerExecutionClass,
  validateRunReport: ValidateFunction,
  adjudicationPacket?: AdjudicationPacket,
  adjudicationBundle?: ReturnType<typeof buildAdjudicationPacket>,
): Promise<VerifiedRole> {
  const resultRoot = path.join(verifiedPackage.root, "role-results", role);
  const roleRoot = await requireExactDirectory(resultRoot, `${role} private result directory`);
  if (((await lstat(roleRoot)).mode & 0o777) !== 0o700) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} private result directory must be mode 0700`);
  await assertExactDirectoryEntries(
    roleRoot,
    ["claim.json", "generation-decisions.json", "raw.stderr", "raw.stdout", "result.json", "run-report.json"],
    [],
    `${role} private result directory`,
  );
  const [publicClaimRecord, publicTerminalRecord, privateClaimRecord, runReportRecord, resultRecord, decisionsRecord, rawStdout, rawStderr] = await Promise.all([
    publicRecord<RoleAttemptClaim>(projectRoot, verifiedPackage.bundle.seal_commit, role, false),
    publicRecord<RoleAttemptTerminal>(projectRoot, verifiedPackage.bundle.seal_commit, role, true),
    readJsonRecord<JsonObject>(path.join(roleRoot, "claim.json"), `${role} private claim`, 0o600),
    readJsonRecord<LocalEvaluatorRunReport>(path.join(roleRoot, "run-report.json"), `${role} private run report`, 0o600),
    readJsonRecord<BlindedEvaluatorResult | BlindedAdjudicationResult>(path.join(roleRoot, "result.json"), `${role} private result`, 0o600),
    readJsonRecord<JsonObject>(path.join(roleRoot, "generation-decisions.json"), `${role} private generation decisions`, 0o600),
    readFileRecord(path.join(roleRoot, "raw.stdout"), MAX_STREAM_BYTES, `${role} raw stdout`, false, 0o600),
    readFileRecord(path.join(roleRoot, "raw.stderr"), MAX_STREAM_BYTES, `${role} raw stderr`, true, 0o600),
  ]);
  const publicClaim = publicClaimRecord.value;
  const publicTerminal = publicTerminalRecord.value;
  const privateClaim = privateClaimRecord.value;
  const report = runReportRecord.value;
  const expected = expectedRolePacket(verifiedPackage, role, adjudicationPacket);
  const expectedPublication = executionClass === "SEALED";
  const expectedPromptSha = verifiedPackage.bundle.role_system_prompt_sha256[role];
  const expectedGenerationSchemaSha = verifiedPackage.bundle.role_generation_schema_sha256[role];
  const expectedStrictSchemaSha = verifiedPackage.packageClaim.strict_postparse_schema_sha256[role];
  if (
    publicClaim.execution_class !== executionClass
    || publicClaim.publication_eligible !== expectedPublication
    || publicClaim.content_commit !== verifiedPackage.bundle.content_commit
    || publicClaim.seal_commit !== verifiedPackage.bundle.seal_commit
    || publicClaim.benchmark_lock_sha256 !== verifiedPackage.bundle.benchmark_lock_sha256
    || publicClaim.role !== role
    || publicClaim.public_package_attempt_claim_sha256 !== verifiedPackage.packageClaimRecord.fileSha256
    || publicClaim.package_receipt_sha256 !== verifiedPackage.receiptRecord.fileSha256
    || publicClaim.bundle_sha256 !== verifiedPackage.bundleRecord.canonicalSha256
    || publicClaim.packet_id !== expected.packetId
    || publicClaim.packet_sha256 !== expected.packetSha256
    || publicClaim.execution_contract_sha256 !== verifiedPackage.bundle.execution_contract_sha256
    || publicClaim.runtime_ledger_sha256 !== verifiedPackage.bundle.runtime_ledger_sha256
    || publicClaim.llama_cli_sha256 !== verifiedPackage.packageClaim.llama_cli_sha256
    || publicClaim.model_sha256 !== verifiedPackage.packageClaim.model_sha256
    || publicClaim.role_system_prompt_sha256 !== expectedPromptSha
    || publicClaim.role_generation_schema_sha256 !== expectedGenerationSchemaSha
    || publicClaim.strict_postparse_schema_sha256 !== expectedStrictSchemaSha
    || publicClaim.sandbox_profile_sha256 !== verifiedPackage.bundle.sandbox_profile_sha256
    || Date.parse(publicClaim.claimed_at) < Date.parse(verifiedPackage.packageTerminal.completed_at)
  ) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} public attempt claim does not bind the exact successful package and role packet`);

  const privateClaimKeys = ["schema_version", "state", "role", "packet_id", "packet_sha256", "claimed_at", "public_role_attempt_claim_sha256", "public_package_attempt_claim_sha256", "retry_policy"];
  if (
    !exactKeys(privateClaim, privateClaimKeys)
    || privateClaim.schema_version !== "1.0"
    || privateClaim.state !== "claimed_before_inference"
    || privateClaim.role !== role
    || privateClaim.packet_id !== expected.packetId
    || privateClaim.packet_sha256 !== expected.packetSha256
    || privateClaim.claimed_at !== publicClaim.claimed_at
    || privateClaim.public_role_attempt_claim_sha256 !== publicClaimRecord.fileSha256
    || privateClaim.public_package_attempt_claim_sha256 !== verifiedPackage.packageClaimRecord.fileSha256
    || privateClaim.retry_policy !== "one_write_once_role_invocation_no_retry"
  ) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} private claim does not bind its repository-authoritative attempt`);

  if (!validateRunReport(report)) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} private run report violates its strict schema`);
  const reportStarted = Date.parse(report.started_at);
  const reportCompleted = Date.parse(report.completed_at);
  if (
    report.execution_class !== executionClass
    || report.publication_eligible !== expectedPublication
    || report.role !== role
    || report.state !== "succeeded"
    || report.failure_code !== null
    || report.packet_id !== expected.packetId
    || report.packet_sha256 !== expected.packetSha256
    || report.result_sha256 !== resultRecord.canonicalSha256
    || !Number.isFinite(reportStarted) || !Number.isFinite(reportCompleted)
    || reportStarted < Date.parse(publicClaim.claimed_at) || reportCompleted < reportStarted
    || report.duration_ms !== reportCompleted - reportStarted
    || report.process.invocation_count !== 1 || report.process.exit_code !== 0 || report.process.signal !== null
    || report.process.timed_out !== false || report.process.output_overflow !== false
    || report.process.stdout_bytes !== rawStdout.bytes.byteLength || report.process.stdout_retained_bytes !== rawStdout.bytes.byteLength
    || report.process.stdout_sha256 !== rawStdout.sha256
    || report.process.stderr_bytes !== rawStderr.bytes.byteLength || report.process.stderr_retained_bytes !== rawStderr.bytes.byteLength
    || report.process.stderr_sha256 !== rawStderr.sha256
    || (executionClass === "SEALED" && (!Number.isInteger(report.process.maximum_resident_set_size_bytes) || !Number.isInteger(report.process.peak_memory_footprint_bytes)))
    || report.bindings.content_commit !== verifiedPackage.bundle.content_commit
    || report.bindings.seal_commit !== verifiedPackage.bundle.seal_commit
    || report.bindings.benchmark_lock_sha256 !== verifiedPackage.bundle.benchmark_lock_sha256
    || report.bindings.public_package_attempt_claim_sha256 !== verifiedPackage.packageClaimRecord.fileSha256
    || report.bindings.public_role_attempt_claim_sha256 !== publicClaimRecord.fileSha256
    || report.bindings.execution_contract_sha256 !== verifiedPackage.bundle.execution_contract_sha256
    || report.bindings.runtime_ledger_sha256 !== verifiedPackage.bundle.runtime_ledger_sha256
    || report.bindings.llama_cli_sha256 !== verifiedPackage.packageClaim.llama_cli_sha256
    || report.bindings.model_sha256 !== verifiedPackage.packageClaim.model_sha256
    || report.bindings.role_system_prompt_sha256 !== expectedPromptSha
    || report.bindings.role_generation_schema_sha256 !== expectedGenerationSchemaSha
    || report.bindings.strict_postparse_schema_sha256 !== expectedStrictSchemaSha
    || report.bindings.sandbox_profile_sha256 !== verifiedPackage.bundle.sandbox_profile_sha256
    || report.bindings.post_execution_reverified !== true
    || report.boundary.external_provider_calls !== 0
    || report.boundary.external_content_transfer !== false
    || report.boundary.incremental_spend_usd !== 0
  ) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} run report, raw streams, and source bindings are incoherent`);

  if (
    publicTerminal.execution_class !== executionClass
    || publicTerminal.publication_eligible !== expectedPublication
    || publicTerminal.content_commit !== verifiedPackage.bundle.content_commit
    || publicTerminal.seal_commit !== verifiedPackage.bundle.seal_commit
    || publicTerminal.role !== role
    || publicTerminal.public_role_attempt_claim_sha256 !== publicClaimRecord.fileSha256
    || publicTerminal.public_package_attempt_claim_sha256 !== verifiedPackage.packageClaimRecord.fileSha256
    || publicTerminal.state !== "succeeded"
    || publicTerminal.completed_at !== report.completed_at
    || publicTerminal.result_sha256 !== resultRecord.canonicalSha256
    || publicTerminal.private_role_claim_sha256 !== privateClaimRecord.fileSha256
    || publicTerminal.private_run_report_sha256 !== runReportRecord.fileSha256
    || publicTerminal.failure_code !== null
    || canonicalJson(publicTerminal.process) !== canonicalJson(terminalProcessFromReport(report))
  ) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} public terminal does not bind the exact private successful run evidence`);

  let rawDecisions: unknown;
  try { rawDecisions = parseJsonBytesWithoutDuplicateKeys(rawStdout.bytes); }
  catch { throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} raw stdout is not the strict decisions object`); }
  if (
    !isObject(rawDecisions)
    || !exactKeys(rawDecisions, ["schema_version", "items", "claims_boundary"])
    || rawDecisions.schema_version !== "1.0"
    || rawDecisions.claims_boundary !== CLAIMS_BOUNDARY
    || canonicalJson(rawDecisions) !== canonicalJson(decisionsRecord.value)
    || canonicalJson(rawDecisions.items) !== canonicalJson((resultRecord.value as { items: unknown }).items)
  ) throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} raw decisions, preserved decisions, and trusted wrapper result differ`);

  let result: BlindedEvaluatorResult | BlindedAdjudicationResult;
  try {
    result = role === "adjudicator"
      ? verifyAdjudicationResult(resultRecord.value, adjudicationBundle!, verifiedPackage.bundle.packet_generated_at)
      : verifyEvaluatorResult(resultRecord.value, verifiedPackage.bundle, role);
  } catch {
    throw new Gate4FinalizerError(role === "adjudicator" ? "ADJUDICATION_EVIDENCE_INVALID" : "ROLE_EVIDENCE_INVALID", `${role} result violates its exact packet-bound schema`);
  }
  if (result.started_at !== report.started_at || result.completed_at !== report.completed_at || resultRecord.canonicalSha256 !== canonicalJsonSha256(result)) {
    throw new Gate4FinalizerError("ROLE_EVIDENCE_INVALID", `${role} result chronology or canonical hash differs from the trusted run report`);
  }
  return {
    role,
    result,
    claimedAt: publicClaim.claimed_at,
    completedAt: report.completed_at,
    bindings: {
      public_attempt_claim: binding(publicClaimRecord),
      public_terminal: binding(publicTerminalRecord),
      private_claim: binding(privateClaimRecord),
      private_run_report: binding(runReportRecord),
      private_result: binding(resultRecord),
      private_generation_decisions: binding(decisionsRecord),
      raw_stdout_sha256: rawStdout.sha256,
      raw_stderr_sha256: rawStderr.sha256,
    },
  };
}

async function requireAbsent(filePath: string, label: string): Promise<void> {
  if (await lstat(filePath).catch(() => null)) throw new Gate4FinalizerError("ADJUDICATION_EVIDENCE_INVALID", `${label} must be absent when no dispute exists`);
}

async function deriveAggregate(
  projectRoot: string,
  privateEvidenceRoot: string,
  lock: Pick<LockVerificationReport, "contentCommit" | "sealCommit" | "lockSha256">,
  executionClass: FinalizerExecutionClass,
): Promise<Gate4Aggregate> {
  const publicRunsRoot = await requireExactDirectory(
    projectPath(projectRoot, PUBLIC_REPORT_RELATIVE_ROOT),
    "canonical Gate 4 public-runs directory",
  );
  await assertExactDirectoryEntries(
    publicRunsRoot,
    CANONICAL_GATE4_ITEM_IDS.flatMap((itemId) => [`${itemId}.attempt-claim.json`, `${itemId}.json`]),
    [],
    "canonical Gate 4 public-runs directory",
  );
  const evaluationClaimRoot = await requireExactDirectory(
    path.dirname(authoritativeEvaluationClaimPath(projectRoot, lock.sealCommit, "package")),
    "current-seal Gate 4 evaluation claim directory",
  );
  const baseEvaluationClaimFiles = [
    "package.json", "package.terminal.json",
    "evaluator_a.json", "evaluator_a.terminal.json",
    "evaluator_b.json", "evaluator_b.terminal.json",
  ];
  await assertExactFileSetOneOf(
    evaluationClaimRoot,
    [baseEvaluationClaimFiles, [...baseEvaluationClaimFiles, "adjudicator.json", "adjudicator.terminal.json"]],
    "current-seal Gate 4 evaluation claim directory",
  );
  const verifiedPackage = await verifyPackage(projectRoot, privateEvidenceRoot, lock, executionClass);
  const roleResultsRoot = await requireExactDirectory(path.join(verifiedPackage.root, "role-results"), "private role-results directory");
  if (((await lstat(roleResultsRoot)).mode & 0o777) !== 0o700) throw new Gate4FinalizerError("PATH_INVALID", "the private role-results directory must be mode 0700");
  const [deterministicBaseline, validateRunReport] = await Promise.all([
    verifyDeterministicBaseline(projectRoot, verifiedPackage, executionClass),
    compileSchema(projectRoot, `${MODEL_RELATIVE_ROOT}/LOCAL_EVALUATOR_RUN_REPORT.schema.json`, "local evaluator run report"),
  ]);
  const [evaluatorA, evaluatorB] = await Promise.all([
    verifyRole(projectRoot, verifiedPackage, "evaluator_a", executionClass, validateRunReport),
    verifyRole(projectRoot, verifiedPackage, "evaluator_b", executionClass, validateRunReport),
  ]);
  const adjudication = buildAdjudicationPacket(verifiedPackage.bundle, evaluatorA.result, evaluatorB.result);
  let adjudicator: VerifiedRole | null = null;
  let adjudicationBindings: Gate4EvidenceBindings["adjudication"] = null;
  if (adjudication.state === "not_required") {
    await Promise.all([
      requireAbsent(authoritativeEvaluationClaimPath(projectRoot, lock.sealCommit, "adjudicator"), "public adjudicator claim"),
      requireAbsent(authoritativeEvaluationTerminalPath(projectRoot, lock.sealCommit, "adjudicator"), "public adjudicator terminal"),
      requireAbsent(path.join(verifiedPackage.root, "role-results", "adjudicator"), "private adjudicator result directory"),
      requireAbsent(path.join(verifiedPackage.root, "adjudicator.packet.json"), "private adjudicator packet"),
    ]);
    await assertExactDirectoryEntries(
      evaluationClaimRoot,
      baseEvaluationClaimFiles,
      [],
      "current-seal Gate 4 evaluation claim directory",
    );
    await Promise.all([
      assertExactDirectoryEntries(
        verifiedPackage.root,
        ["consent-attestation.json", "coordinator.bundle.json", "evaluator-a.packet.json", "evaluator-b.packet.json", "execution-readiness.json", "generation-receipt.json"],
        ["role-results"],
        "private packet package directory",
      ),
      assertExactDirectoryEntries(path.join(verifiedPackage.root, "role-results"), [], ["evaluator_a", "evaluator_b"], "private role-results directory"),
    ]);
  } else {
    await assertExactDirectoryEntries(
      evaluationClaimRoot,
      [...baseEvaluationClaimFiles, "adjudicator.json", "adjudicator.terminal.json"],
      [],
      "current-seal Gate 4 evaluation claim directory",
    );
    if (!adjudication.packet || !adjudication.packet_sha256) throw new Gate4FinalizerError("ADJUDICATION_EVIDENCE_INVALID", "required adjudication packet is unavailable");
    const packetRecord = await readJsonRecord<AdjudicationPacket>(path.join(verifiedPackage.root, "adjudicator.packet.json"), "private adjudicator packet", 0o600);
    if (packetRecord.canonicalSha256 !== adjudication.packet_sha256 || canonicalJson(packetRecord.value) !== canonicalJson(adjudication.packet)) {
      throw new Gate4FinalizerError("ADJUDICATION_EVIDENCE_INVALID", "the private adjudicator packet differs from the deterministic dispute packet");
    }
    adjudicator = await verifyRole(projectRoot, verifiedPackage, "adjudicator", executionClass, validateRunReport, adjudication.packet, adjudication);
    if (Date.parse(adjudicator.claimedAt) < Math.max(Date.parse(evaluatorA.completedAt), Date.parse(evaluatorB.completedAt))) {
      throw new Gate4FinalizerError("ADJUDICATION_EVIDENCE_INVALID", "the adjudicator was claimed before both evaluator results were terminal");
    }
    adjudicationBindings = { ...adjudicator.bindings, private_packet: binding(packetRecord) };
    await Promise.all([
      assertExactDirectoryEntries(
        verifiedPackage.root,
        ["adjudicator.packet.json", "consent-attestation.json", "coordinator.bundle.json", "evaluator-a.packet.json", "evaluator-b.packet.json", "execution-readiness.json", "generation-receipt.json"],
        ["role-results"],
        "private packet package directory",
      ),
      assertExactDirectoryEntries(path.join(verifiedPackage.root, "role-results"), [], ["adjudicator", "evaluator_a", "evaluator_b"], "private role-results directory"),
    ]);
  }
  const evidenceBindings: Gate4EvidenceBindings = {
    package: {
      public_attempt_claim: binding(verifiedPackage.packageClaimRecord),
      public_terminal: binding(verifiedPackage.packageTerminalRecord),
      private_receipt: binding(verifiedPackage.receiptRecord),
      private_bundle: binding(verifiedPackage.bundleRecord),
    },
    evaluators: { evaluator_a: evaluatorA.bindings, evaluator_b: evaluatorB.bindings },
    adjudication: adjudicationBindings,
  };
  const aggregate = aggregateBlindedEvaluations(
    verifiedPackage.bundle,
    evaluatorA.result,
    evaluatorB.result,
    {
      execution_class: executionClass,
      publication_eligible: executionClass === "SEALED",
      evidence_bindings: evidenceBindings,
      deterministic_baseline: deterministicBaseline,
    },
    adjudicator?.result,
  );
  assertPublicationSafe(aggregate);
  return aggregate;
}

async function fsyncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the aggregate parent directory cannot be opened for synchronization");
  try { await handle.sync(); }
  catch { throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the aggregate parent directory cannot be synchronized"); }
  finally { await handle.close(); }
}

async function writeCanonicalAggregate(
  projectRoot: string,
  aggregate: Gate4Aggregate,
  devDurabilityFailure?: FinalizeBlindedEvaluationForTestsOptions["devDurabilityFailure"],
): Promise<Gate4FinalizationResult> {
  const decisions = projectPath(projectRoot, `${PROJECT_RELATIVE_ROOT}/decisions`);
  await requireExactDirectory(decisions, "authoritative decisions directory");
  const outputPath = projectPath(projectRoot, GATE4_AGGREGATE_RELATIVE_PATH);
  const bytes = Buffer.from(`${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
  const stagingPath = `${outputPath}.staging-${process.pid}-${randomUUID()}`;
  let stagingHandle;
  try {
    stagingHandle = await open(
      stagingPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | constants.O_NOFOLLOW,
      0o644,
    );
  } catch {
    throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the Gate 4 aggregate staging file could not be created exclusively");
  }
  let stagingIdentity: { dev: number; ino: number } | null = null;
  let stagingFailure: unknown = null;
  try {
    await stagingHandle.writeFile(bytes);
    await stagingHandle.chmod(0o644);
    if (devDurabilityFailure === "staging_file_sync") {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "injected Gate 4 staging-file synchronization failure");
    }
    await stagingHandle.sync();
    const info = await stagingHandle.stat();
    const observed = Buffer.alloc(bytes.byteLength);
    const read = await stagingHandle.read(observed, 0, observed.byteLength, 0);
    if (
      !info.isFile()
      || info.nlink !== 1
      || (info.mode & 0o777) !== 0o644
      || info.size !== bytes.byteLength
      || read.bytesRead !== bytes.byteLength
      || !observed.equals(bytes)
    ) {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the Gate 4 aggregate staging file is not one exact durable file");
    }
    stagingIdentity = { dev: info.dev, ino: info.ino };
  } catch (error) {
    stagingFailure = error instanceof Gate4FinalizerError
      ? error
      : new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the Gate 4 aggregate staging file was not persisted durably");
  } finally {
    await stagingHandle.close().catch((error: unknown) => {
      stagingFailure ??= new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", `the Gate 4 staging file could not be closed: ${error instanceof Error ? error.message : "unknown error"}`);
    });
  }
  if (stagingFailure || !stagingIdentity) {
    await unlink(stagingPath).catch(() => undefined);
    await fsyncDirectory(decisions).catch(() => undefined);
    throw stagingFailure ?? new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the Gate 4 staging identity is absent");
  }

  let canonicalHandle: Awaited<ReturnType<typeof open>> | null = null;
  let stagingPresent = true;
  let completionFailure: unknown = null;
  try {
    try {
      await link(stagingPath, outputPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new Gate4FinalizerError("AGGREGATE_ALREADY_EXISTS", "the canonical Gate 4 aggregate already exists; the sealed finalization cannot be rerun");
      }
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the canonical Gate 4 aggregate link could not be created");
    }
    canonicalHandle = await open(outputPath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await canonicalHandle.stat();
    const observed = Buffer.alloc(bytes.byteLength);
    const read = await canonicalHandle.read(observed, 0, observed.byteLength, 0);
    if (
      !info.isFile()
      || info.dev !== stagingIdentity.dev
      || info.ino !== stagingIdentity.ino
      || info.nlink !== 2
      || (info.mode & 0o777) !== 0o644
      || info.size !== bytes.byteLength
      || read.bytesRead !== bytes.byteLength
      || !observed.equals(bytes)
    ) {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the canonical Gate 4 aggregate is not the verified staging inode");
    }
    if (devDurabilityFailure === "canonical_parent_sync") {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "injected Gate 4 canonical-parent synchronization failure");
    }
    await fsyncDirectory(decisions);
    await unlink(stagingPath);
    stagingPresent = false;
    const finalInfo = await canonicalHandle.stat();
    if (finalInfo.dev !== info.dev || finalInfo.ino !== info.ino || finalInfo.nlink !== 1) {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the canonical Gate 4 aggregate link count is invalid");
    }
    if (devDurabilityFailure === "final_parent_sync") {
      throw new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "injected Gate 4 final-parent synchronization failure");
    }
    await fsyncDirectory(decisions);
  } catch (error) {
    completionFailure = error instanceof Gate4FinalizerError
      ? error
      : new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", "the canonical Gate 4 aggregate was not finalized durably");
  } finally {
    await canonicalHandle?.close().catch((error: unknown) => {
      completionFailure ??= new Gate4FinalizerError("AGGREGATE_WRITE_FAILED", `the canonical Gate 4 aggregate could not be closed: ${error instanceof Error ? error.message : "unknown error"}`);
    });
    if (stagingPresent) {
      await unlink(stagingPath).then(() => { stagingPresent = false; }, () => undefined);
      await fsyncDirectory(decisions).catch(() => undefined);
    }
  }
  if (completionFailure) throw completionFailure;
  return { path: outputPath, bytes, sha256: sha256(bytes), aggregate };
}

async function finalizeWithVerifiedLock(
  options: FinalizeSealedBlindedEvaluationOptions
    & Pick<FinalizeBlindedEvaluationForTestsOptions, "devDurabilityFailure">,
  executionClass: FinalizerExecutionClass,
  lock: Pick<LockVerificationReport, "contentCommit" | "sealCommit" | "lockSha256">,
): Promise<Gate4FinalizationResult> {
  const projectRoot = await requireExactDirectory(options.projectRoot, "project root");
  const privateEvidenceRoot = await requireExactDirectory(options.privateEvidenceRoot, "private evidence root");
  if (isWithin(projectRoot, privateEvidenceRoot)) throw new Gate4FinalizerError("PATH_INVALID", "the private evidence root must remain outside the worktree");
  const validateAggregate = await compileSchema(projectRoot, `${MODEL_RELATIVE_ROOT}/GATE_4_AGGREGATE.schema.json`, "Gate 4 aggregate");
  const first = await deriveAggregate(projectRoot, privateEvidenceRoot, lock, executionClass);
  const second = await deriveAggregate(projectRoot, privateEvidenceRoot, lock, executionClass);
  if (canonicalJson(first) !== canonicalJson(second)) throw new Gate4FinalizerError("AGGREGATE_INVALID", "the evidence changed during deterministic pre-write reverification");
  try { verifyGate4Aggregate(second); }
  catch { throw new Gate4FinalizerError("AGGREGATE_INVALID", "the derived aggregate failed deterministic semantic validation"); }
  if (!validateAggregate(second)) throw new Gate4FinalizerError("AGGREGATE_INVALID", "the derived aggregate failed the strict Gate 4 aggregate schema");
  if (executionClass === "SEALED" && (!second.publication_eligible || second.execution_class !== "SEALED")) {
    throw new Gate4FinalizerError("AGGREGATE_INVALID", "SEALED finalization did not derive publication-eligible evidence");
  }
  return writeCanonicalAggregate(projectRoot, second, options.devDurabilityFailure);
}

export async function finalizeSealedBlindedEvaluation(options: FinalizeSealedBlindedEvaluationOptions): Promise<Gate4FinalizationResult> {
  const projectRoot = await requireExactDirectory(options.projectRoot, "project root");
  let lock: LockVerificationReport;
  try { lock = verifyLock({ repoRoot: projectRoot }); }
  catch { throw new Gate4FinalizerError("LOCK_INVALID", "the canonical benchmark lock failed immediately before Gate 4 finalization"); }
  return finalizeWithVerifiedLock({ ...options, projectRoot }, "SEALED", lock);
}

export async function finalizeBlindedEvaluationForTests(options: FinalizeBlindedEvaluationForTestsOptions): Promise<Gate4FinalizationResult> {
  if (!String(process.env.NODE_TEST_CONTEXT ?? "").startsWith("child")) {
    throw new Gate4FinalizerError("LOCK_INVALID", "the DEV_TEST finalization boundary is restricted to the Node test runner");
  }
  if (!/^[0-9a-f]{40}$/.test(options.verifiedLock.contentCommit) || !/^[0-9a-f]{40}$/.test(options.verifiedLock.sealCommit) || !SHA256_RE.test(options.verifiedLock.lockSha256)) {
    throw new Gate4FinalizerError("LOCK_INVALID", "the DEV_TEST verified-lock fixture identity is invalid");
  }
  return finalizeWithVerifiedLock(options, "DEV_TEST", options.verifiedLock);
}
