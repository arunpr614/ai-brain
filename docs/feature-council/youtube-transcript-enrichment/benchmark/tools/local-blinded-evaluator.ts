import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
} from "node:fs/promises";
import path from "node:path";

import Ajv2020, { type AnySchema, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";

import {
  CLAIMS_BOUNDARY,
  CANONICAL_GATE4_ITEM_IDS,
  buildAdjudicationPacket,
  canonicalJson,
  canonicalJsonSha256,
  verifyAdjudicationResult,
  verifyBlindedPacketBundle,
  verifyEvaluatorResult,
  type AdjudicationPacket,
  type AdjudicationPacketBundle,
  type BlindedAdjudicationResult,
  type BlindedEvaluatorPacket,
  type BlindedEvaluatorResult,
  type BlindedPacketBundle,
  type EvaluatorRole,
} from "./blinded-evaluation";
import { GATE3_RESULT_RELATIVE_PATH } from "./gate3-evidence";
import { parseJsonBytesWithoutDuplicateKeys, verifyLock } from "./verify-lock";
import {
  EVALUATION_ROLE_TIMEOUT_MS,
  Gate4EvaluationClaimError,
  authoritativeEvaluationClaimPath,
  readAuthoritativeAttemptClaim,
  readAuthoritativeAttemptTerminal,
  writeRoleAttemptClaim,
  writeRoleAttemptTerminal,
  type PackageAttemptClaim,
  type RoleAttemptClaim,
  type RoleAttemptTerminal,
} from "./gate4-evaluation-claims";

const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const MODEL_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/benchmark/model`;
const CONTRACT_RELATIVE_PATH = `${MODEL_RELATIVE_ROOT}/EVALUATOR_EXECUTION_CONTRACT.json`;
const RUNTIME_LEDGER_RELATIVE_PATH = `${MODEL_RELATIVE_ROOT}/LOCAL_MODEL_RUNTIME_LEDGER.json`;
const SANDBOX_RELATIVE_PATH = `${PROJECT_RELATIVE_ROOT}/spikes/model-harness/deny-network.sb`;
const PUBLIC_REPORT_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-public-runs`;
const LOCAL_RUN_REPORT_SCHEMA_RELATIVE_PATH = `${MODEL_RELATIVE_ROOT}/LOCAL_EVALUATOR_RUN_REPORT.schema.json`;
const MAX_JSON_BYTES = 16 * 1024 * 1024;
const MAX_CAPTURE_BYTES = 4 * 1024 * 1024;

type JsonObject = Record<string, unknown>;
export type LocalEvaluatorExecutionClass = "SEALED" | "DEV_TEST";
export type LocalEvaluatorRole = EvaluatorRole | "adjudicator";

export class LocalBlindedEvaluatorError extends Error {
  constructor(
    public readonly code:
      | "PATH_INVALID"
      | "PACKET_PACKAGE_INVALID"
      | "LOCK_INVALID"
      | "RUNTIME_INVALID"
      | "ROLE_ALREADY_CLAIMED"
      | "ADJUDICATION_NOT_REQUIRED"
      | "PROCESS_FAILED"
      | "OUTPUT_INVALID"
      | "RESULT_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "LocalBlindedEvaluatorError";
  }
}

export interface RunLocalBlindedEvaluatorOptions {
  executionClass: LocalEvaluatorExecutionClass;
  projectRoot: string;
  privateEvidenceRoot: string;
  role: LocalEvaluatorRole;
  runtimeDir: string;
  modelPath: string;
  /** Test-only executable. The public CLI never exposes DEV_TEST. */
  devExecutablePath?: string;
  /** Test-only synthetic package. SEALED always derives its canonical path. */
  devPacketPackageDirectory?: string;
  /** Test-only clock. SEALED always uses the system clock. */
  now?: () => Date;
}

export interface LocalEvaluatorRunReport {
  schema_version: "1.0";
  runner_version: "1.0.0";
  execution_class: LocalEvaluatorExecutionClass;
  publication_eligible: boolean;
  role: LocalEvaluatorRole;
  state: "succeeded" | "failed";
  packet_id: string;
  packet_sha256: string;
  result_sha256: string | null;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  process: {
    invocation_count: 1;
    timeout_ms: typeof EVALUATION_ROLE_TIMEOUT_MS;
    exit_code: number | null;
    signal: string | null;
    timed_out: boolean;
    output_overflow: boolean;
    stdout_bytes: number;
    stdout_retained_bytes: number;
    stdout_sha256: string;
    stderr_bytes: number;
    stderr_retained_bytes: number;
    stderr_sha256: string;
    maximum_resident_set_size_bytes: number | null;
    peak_memory_footprint_bytes: number | null;
  };
  bindings: {
    content_commit: string;
    seal_commit: string;
    benchmark_lock_sha256: string;
    public_package_attempt_claim_sha256: string;
    public_role_attempt_claim_sha256: string;
    execution_contract_sha256: string;
    runtime_ledger_sha256: string;
    llama_cli_sha256: string;
    model_sha256: string;
    role_system_prompt_sha256: string;
    role_generation_schema_sha256: string;
    strict_postparse_schema_sha256: string;
    sandbox_profile_sha256: string;
    post_execution_reverified: boolean;
  };
  boundary: {
    local_private_process: true;
    fresh_process: true;
    packet_only_file_context: true;
    network_denied: true;
    tools_available: false;
    external_provider_calls: 0;
    external_content_transfer: false;
    incremental_spend_usd: 0;
    training_performed: false;
    same_model_evaluator_bias: "disclosed_material_reproducibility_limitation";
  };
  failure_code: string | null;
  claims_boundary: typeof CLAIMS_BOUNDARY;
}

export interface LocalEvaluatorRunResult {
  report: LocalEvaluatorRunReport;
  result: BlindedEvaluatorResult | BlindedAdjudicationResult | null;
  resultDirectory: string;
}

interface RoleInvocation {
  role: LocalEvaluatorRole;
  seed: number;
  system_prompt_path: string;
  system_prompt_sha256: string;
  output_generation_schema_path: string;
  output_generation_schema_sha256: string;
  strict_postparse_schema_path: string;
  strict_postparse_schema_sha256: string;
}

interface PreparedRole {
  bundle: BlindedPacketBundle;
  receipt: JsonObject;
  receiptBytes: Buffer;
  receiptSha256: string;
  packageAttemptClaim: PackageAttemptClaim;
  packet: BlindedEvaluatorPacket | AdjudicationPacket;
  packetSha256: string;
  packetPath: string;
  adjudication: AdjudicationPacketBundle | null;
  contract: JsonObject;
  contractBytes: Buffer;
  ledger: JsonObject;
  ledgerBytes: Buffer;
  invocation: RoleInvocation;
  promptPath: string;
  promptBytes: Buffer;
  schemaPath: string;
  schemaBytes: Buffer;
  strictSchemaPath: string;
  strictSchemaBytes: Buffer;
  sandboxPath: string;
  sandboxBytes: Buffer;
  llamaCliPath: string;
  llamaCliSha256: string;
  modelRealPath: string;
  modelSha256: string;
  adjudicationSources: VerifiedEvaluatorPair | null;
}

interface VerifiedEvaluatorRoleEvidence {
  result: BlindedEvaluatorResult;
  claimedAt: string;
  completedAt: string;
  chainSha256: string;
}

interface VerifiedEvaluatorPair {
  evaluatorA: VerifiedEvaluatorRoleEvidence;
  evaluatorB: VerifiedEvaluatorRoleEvidence;
  latestCompletedAt: string;
  pairSha256: string;
}

interface ProcessEvidence {
  started: Date;
  completed: Date;
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  overflow: boolean;
  stdout: Buffer;
  stderr: Buffer;
  stdoutBytes: number;
  stderrBytes: number;
  stdoutSha256: string;
  stderrSha256: string;
  maximumResidentSetSizeBytes: number | null;
  peakMemoryFootprintBytes: number | null;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function requireDirectory(candidate: string, label: string): Promise<string> {
  if (!path.isAbsolute(candidate)) throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} must be absolute`);
  const info = await lstat(candidate).catch(() => null);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} must be an existing non-symlink directory`);
  }
  return realpath(candidate);
}

function projectFile(projectRoot: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === ".." || part.includes("\\"))) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", "a canonical project-relative path is invalid");
  }
  const absolute = path.join(projectRoot, ...relativePath.split("/"));
  if (!isWithin(projectRoot, absolute) || absolute === projectRoot) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", "a canonical project path escapes the worktree");
  }
  return absolute;
}

async function readBounded(
  filePath: string,
  maximumBytes: number,
  label: string,
  allowEmpty = false,
  expectedMode?: number,
): Promise<Buffer> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} is missing or is a symlink`);
  try {
    const before = await handle.stat();
    if (
      !before.isFile()
      || before.nlink !== 1
      || (!allowEmpty && before.size < 1)
      || before.size > maximumBytes
      || (expectedMode !== undefined && (before.mode & 0o777) !== expectedMode)
    ) {
      throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} is not a bounded regular file`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.byteLength !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} changed while it was read`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function strictJson(bytes: Buffer, label: string): unknown {
  try { return parseJsonBytesWithoutDuplicateKeys(bytes); }
  catch { throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${label} is not strict JSON`); }
}

function exactKeys(value: JsonObject, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

async function assertExactDirectoryEntries(
  directory: string,
  files: readonly string[],
  directories: readonly string[],
  label: string,
  expectedMode: number | readonly number[] = 0o700,
): Promise<void> {
  const info = await lstat(directory).catch(() => null);
  const expectedModes = Array.isArray(expectedMode) ? expectedMode : [expectedMode];
  if (
    !info
    || !info.isDirectory()
    || info.isSymbolicLink()
    || !expectedModes.includes(info.mode & 0o777)
    || await realpath(directory) !== path.resolve(directory)
  ) throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} is not an exact canonical directory with the required mode`);
  const entries = await readdir(directory, { withFileTypes: true });
  const observed = entries.map((entry) => {
    if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) return `x:${entry.name}`;
    return `${entry.isFile() ? "f" : "d"}:${entry.name}`;
  }).sort();
  const expected = [...files.map((name) => `f:${name}`), ...directories.map((name) => `d:${name}`)].sort();
  if (canonicalJson(observed) !== canonicalJson(expected)) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", `${label} contains an extra, missing, mistyped, or symlink entry`);
  }
}

interface LocalJsonEvidence<T = unknown> {
  bytes: Buffer;
  fileSha256: string;
  canonicalSha256: string;
  value: T;
}

async function readJsonEvidence<T>(filePath: string, label: string, expectedMode: number): Promise<LocalJsonEvidence<T>> {
  const bytes = await readBounded(filePath, MAX_JSON_BYTES, label, false, expectedMode);
  const value = strictJson(bytes, label);
  return { bytes, fileSha256: sha256(bytes), canonicalSha256: canonicalJsonSha256(value), value: value as T };
}

async function compileLocalRunReportSchema(projectRoot: string): Promise<ValidateFunction> {
  const schema = strictJson(
    await readBounded(projectFile(projectRoot, LOCAL_RUN_REPORT_SCHEMA_RELATIVE_PATH), MAX_JSON_BYTES, "local evaluator run-report schema"),
    "local evaluator run-report schema",
  );
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    return ajv.compile(schema as AnySchema);
  } catch {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "local evaluator run-report schema cannot be compiled strictly");
  }
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

async function verifyCompletedEvaluatorRoleEvidence(
  projectRoot: string,
  packageRoot: string,
  bundle: BlindedPacketBundle,
  receiptSha256: string,
  packageAttemptClaim: PackageAttemptClaim,
  packageAttemptClaimSha256: string,
  packageTerminalCompletedAt: string,
  executionClass: LocalEvaluatorExecutionClass,
  role: EvaluatorRole,
  validateRunReport: ValidateFunction,
): Promise<VerifiedEvaluatorRoleEvidence> {
  const roleRoot = path.join(packageRoot, "role-results", role);
  await assertExactDirectoryEntries(
    roleRoot,
    ["claim.json", "generation-decisions.json", "raw.stderr", "raw.stdout", "result.json", "run-report.json"],
    [],
    `${role} completed private evidence directory`,
  );
  let publicClaimRecord;
  let publicTerminalRecord;
  try {
    [publicClaimRecord, publicTerminalRecord] = await Promise.all([
      readAuthoritativeAttemptClaim(projectRoot, bundle.seal_commit, role),
      readAuthoritativeAttemptTerminal(projectRoot, bundle.seal_commit, role),
    ]);
  } catch {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} successful public claim-to-terminal evidence is unavailable`);
  }
  const [publicClaimBytes, publicTerminalBytes, privateClaimRecord, runReportRecord, resultRecord, decisionsRecord, rawStdout, rawStderr] = await Promise.all([
    readBounded(publicClaimRecord.path, 256 * 1024, `${role} public claim`, false, 0o644),
    readBounded(publicTerminalRecord.path, 256 * 1024, `${role} public terminal`, false, 0o644),
    readJsonEvidence<JsonObject>(path.join(roleRoot, "claim.json"), `${role} private claim`, 0o600),
    readJsonEvidence<LocalEvaluatorRunReport>(path.join(roleRoot, "run-report.json"), `${role} private run report`, 0o600),
    readJsonEvidence<BlindedEvaluatorResult>(path.join(roleRoot, "result.json"), `${role} private result`, 0o600),
    readJsonEvidence<JsonObject>(path.join(roleRoot, "generation-decisions.json"), `${role} private generation decisions`, 0o600),
    readBounded(path.join(roleRoot, "raw.stdout"), MAX_CAPTURE_BYTES, `${role} raw stdout`, false, 0o600),
    readBounded(path.join(roleRoot, "raw.stderr"), MAX_CAPTURE_BYTES, `${role} raw stderr`, true, 0o600),
  ]);
  if (!publicClaimBytes.equals(publicClaimRecord.bytes) || !publicTerminalBytes.equals(publicTerminalRecord.bytes)) {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} public claim or terminal changed during verification`);
  }
  const publicClaim = publicClaimRecord.value as RoleAttemptClaim;
  const publicTerminal = publicTerminalRecord.value as RoleAttemptTerminal;
  const privateClaim = privateClaimRecord.value;
  const report = runReportRecord.value;
  const expectedPacket = bundle.packets[role];
  const expectedPublication = executionClass === "SEALED";
  const expectedPromptSha256 = bundle.role_system_prompt_sha256[role];
  const expectedGenerationSchemaSha256 = bundle.role_generation_schema_sha256[role];
  const expectedStrictSchemaSha256 = packageAttemptClaim.strict_postparse_schema_sha256[role];
  if (
    publicClaim.execution_class !== executionClass
    || publicClaim.publication_eligible !== expectedPublication
    || publicClaim.content_commit !== bundle.content_commit
    || publicClaim.seal_commit !== bundle.seal_commit
    || publicClaim.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
    || publicClaim.role !== role
    || publicClaim.public_package_attempt_claim_sha256 !== packageAttemptClaimSha256
    || publicClaim.package_receipt_sha256 !== receiptSha256
    || publicClaim.bundle_sha256 !== canonicalJsonSha256(bundle)
    || publicClaim.packet_id !== expectedPacket.packet.packet_id
    || publicClaim.packet_sha256 !== expectedPacket.packet_sha256
    || publicClaim.execution_contract_sha256 !== bundle.execution_contract_sha256
    || publicClaim.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
    || publicClaim.llama_cli_sha256 !== packageAttemptClaim.llama_cli_sha256
    || publicClaim.model_sha256 !== packageAttemptClaim.model_sha256
    || publicClaim.role_system_prompt_sha256 !== expectedPromptSha256
    || publicClaim.role_generation_schema_sha256 !== expectedGenerationSchemaSha256
    || publicClaim.strict_postparse_schema_sha256 !== expectedStrictSchemaSha256
    || publicClaim.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
    || Date.parse(publicClaim.claimed_at) < Date.parse(packageTerminalCompletedAt)
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} public claim does not bind the exact successful package and packet`);

  const privateClaimKeys = ["schema_version", "state", "role", "packet_id", "packet_sha256", "claimed_at", "public_role_attempt_claim_sha256", "public_package_attempt_claim_sha256", "retry_policy"];
  if (
    !exactKeys(privateClaim, privateClaimKeys)
    || privateClaim.schema_version !== "1.0"
    || privateClaim.state !== "claimed_before_inference"
    || privateClaim.role !== role
    || privateClaim.packet_id !== expectedPacket.packet.packet_id
    || privateClaim.packet_sha256 !== expectedPacket.packet_sha256
    || privateClaim.claimed_at !== publicClaim.claimed_at
    || privateClaim.public_role_attempt_claim_sha256 !== publicClaimRecord.sha256
    || privateClaim.public_package_attempt_claim_sha256 !== packageAttemptClaimSha256
    || privateClaim.retry_policy !== "one_write_once_role_invocation_no_retry"
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} private claim does not bind its public attempt`);

  let result: BlindedEvaluatorResult;
  try { result = verifyEvaluatorResult(resultRecord.value, bundle, role); }
  catch { throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} result violates its exact packet-bound schema`); }
  if (!validateRunReport(report)) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} private run report violates its strict schema`);
  const reportStarted = Date.parse(report.started_at);
  const reportCompleted = Date.parse(report.completed_at);
  const rawStdoutSha256 = sha256(rawStdout);
  const rawStderrSha256 = sha256(rawStderr);
  if (
    report.execution_class !== executionClass
    || report.publication_eligible !== expectedPublication
    || report.role !== role
    || report.state !== "succeeded"
    || report.failure_code !== null
    || report.packet_id !== expectedPacket.packet.packet_id
    || report.packet_sha256 !== expectedPacket.packet_sha256
    || report.result_sha256 !== resultRecord.canonicalSha256
    || !Number.isFinite(reportStarted) || !Number.isFinite(reportCompleted)
    || reportStarted < Date.parse(publicClaim.claimed_at) || reportCompleted < reportStarted
    || report.duration_ms !== reportCompleted - reportStarted
    || report.process.invocation_count !== 1 || report.process.exit_code !== 0 || report.process.signal !== null
    || report.process.timed_out !== false || report.process.output_overflow !== false
    || report.process.stdout_bytes !== rawStdout.byteLength || report.process.stdout_retained_bytes !== rawStdout.byteLength
    || report.process.stdout_sha256 !== rawStdoutSha256
    || report.process.stderr_bytes !== rawStderr.byteLength || report.process.stderr_retained_bytes !== rawStderr.byteLength
    || report.process.stderr_sha256 !== rawStderrSha256
    || (executionClass === "SEALED" && (!Number.isInteger(report.process.maximum_resident_set_size_bytes) || !Number.isInteger(report.process.peak_memory_footprint_bytes)))
    || report.bindings.content_commit !== bundle.content_commit
    || report.bindings.seal_commit !== bundle.seal_commit
    || report.bindings.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
    || report.bindings.public_package_attempt_claim_sha256 !== packageAttemptClaimSha256
    || report.bindings.public_role_attempt_claim_sha256 !== publicClaimRecord.sha256
    || report.bindings.execution_contract_sha256 !== bundle.execution_contract_sha256
    || report.bindings.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
    || report.bindings.llama_cli_sha256 !== packageAttemptClaim.llama_cli_sha256
    || report.bindings.model_sha256 !== packageAttemptClaim.model_sha256
    || report.bindings.role_system_prompt_sha256 !== expectedPromptSha256
    || report.bindings.role_generation_schema_sha256 !== expectedGenerationSchemaSha256
    || report.bindings.strict_postparse_schema_sha256 !== expectedStrictSchemaSha256
    || report.bindings.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
    || report.bindings.post_execution_reverified !== true
    || report.boundary.local_private_process !== true
    || report.boundary.fresh_process !== true
    || report.boundary.packet_only_file_context !== true
    || report.boundary.network_denied !== true
    || report.boundary.tools_available !== false
    || report.boundary.external_provider_calls !== 0
    || report.boundary.external_content_transfer !== false
    || report.boundary.incremental_spend_usd !== 0
    || report.boundary.training_performed !== false
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} successful process report, streams, or bindings are incoherent`);

  if (
    publicTerminal.execution_class !== executionClass
    || publicTerminal.publication_eligible !== expectedPublication
    || publicTerminal.content_commit !== bundle.content_commit
    || publicTerminal.seal_commit !== bundle.seal_commit
    || publicTerminal.role !== role
    || publicTerminal.public_role_attempt_claim_sha256 !== publicClaimRecord.sha256
    || publicTerminal.public_package_attempt_claim_sha256 !== packageAttemptClaimSha256
    || publicTerminal.state !== "succeeded"
    || publicTerminal.completed_at !== report.completed_at
    || publicTerminal.result_sha256 !== resultRecord.canonicalSha256
    || publicTerminal.private_role_claim_sha256 !== privateClaimRecord.fileSha256
    || publicTerminal.private_run_report_sha256 !== runReportRecord.fileSha256
    || publicTerminal.failure_code !== null
    || canonicalJson(publicTerminal.process) !== canonicalJson(terminalProcessFromReport(report))
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} public terminal does not bind the exact private successful evidence`);

  let rawDecisions: unknown;
  try { rawDecisions = parseJsonBytesWithoutDuplicateKeys(rawStdout); }
  catch { throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} raw stdout is not strict decisions JSON`); }
  if (
    !isObject(rawDecisions)
    || !exactKeys(rawDecisions, ["schema_version", "items", "claims_boundary"])
    || rawDecisions.schema_version !== "1.0"
    || rawDecisions.claims_boundary !== CLAIMS_BOUNDARY
    || canonicalJson(rawDecisions) !== canonicalJson(decisionsRecord.value)
    || canonicalJson(rawDecisions.items) !== canonicalJson(result.items)
    || result.started_at !== report.started_at
    || result.completed_at !== report.completed_at
    || resultRecord.canonicalSha256 !== canonicalJsonSha256(result)
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} raw decisions, preserved decisions, result, or chronology differ`);

  const chainSha256 = canonicalJsonSha256({
    public_claim: publicClaimRecord.sha256,
    public_terminal: publicTerminalRecord.sha256,
    private_claim: privateClaimRecord.fileSha256,
    private_run_report: runReportRecord.fileSha256,
    private_result: resultRecord.fileSha256,
    private_generation_decisions: decisionsRecord.fileSha256,
    raw_stdout: rawStdoutSha256,
    raw_stderr: rawStderrSha256,
  });
  return { result, claimedAt: publicClaim.claimed_at, completedAt: report.completed_at, chainSha256 };
}

async function verifyCompletedEvaluatorPair(
  projectRoot: string,
  packageRoot: string,
  bundle: BlindedPacketBundle,
  receiptSha256: string,
  packageAttemptClaim: PackageAttemptClaim,
  packageAttemptClaimSha256: string,
  packageTerminalCompletedAt: string,
  executionClass: LocalEvaluatorExecutionClass,
  phase: "pre_adjudication" | "post_adjudication",
): Promise<VerifiedEvaluatorPair> {
  if (phase === "pre_adjudication") {
    await assertExactDirectoryEntries(
      packageRoot,
      ["consent-attestation.json", "coordinator.bundle.json", "evaluator-a.packet.json", "evaluator-b.packet.json", "execution-readiness.json", "generation-receipt.json"],
      ["role-results"],
      "pre-adjudication private packet package",
    );
    await assertExactDirectoryEntries(
      path.join(packageRoot, "role-results"),
      [],
      ["evaluator_a", "evaluator_b"],
      "pre-adjudication private role-results directory",
    );
    await assertExactDirectoryEntries(
      path.dirname(authoritativeEvaluationClaimPath(projectRoot, bundle.seal_commit, "package")),
      ["package.json", "package.terminal.json", "evaluator_a.json", "evaluator_a.terminal.json", "evaluator_b.json", "evaluator_b.terminal.json"],
      [],
      "pre-adjudication current-seal public claim directory",
      [0o700, 0o755],
    );
  }
  const validateRunReport = await compileLocalRunReportSchema(projectRoot);
  const [evaluatorA, evaluatorB] = await Promise.all([
    verifyCompletedEvaluatorRoleEvidence(projectRoot, packageRoot, bundle, receiptSha256, packageAttemptClaim, packageAttemptClaimSha256, packageTerminalCompletedAt, executionClass, "evaluator_a", validateRunReport),
    verifyCompletedEvaluatorRoleEvidence(projectRoot, packageRoot, bundle, receiptSha256, packageAttemptClaim, packageAttemptClaimSha256, packageTerminalCompletedAt, executionClass, "evaluator_b", validateRunReport),
  ]);
  const latestCompletedAt = Date.parse(evaluatorA.completedAt) >= Date.parse(evaluatorB.completedAt) ? evaluatorA.completedAt : evaluatorB.completedAt;
  return {
    evaluatorA,
    evaluatorB,
    latestCompletedAt,
    pairSha256: canonicalJsonSha256({ evaluator_a: evaluatorA.chainSha256, evaluator_b: evaluatorB.chainSha256 }),
  };
}

async function verifySealedPackageEvidence(projectRoot: string, bundle: BlindedPacketBundle, receipt: JsonObject): Promise<void> {
  const gate3Bytes = await readBounded(projectFile(projectRoot, GATE3_RESULT_RELATIVE_PATH), MAX_JSON_BYTES, "canonical Gate 3 result");
  const gate3Sha256 = sha256(gate3Bytes);
  if (!Array.isArray(receipt.evidence) || receipt.evidence.length !== 5) {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "package receipt lacks the exact five evidence bindings");
  }
  const claimKeys = [
    "schema_version", "claim_type", "harness_version", "execution_class", "content_commit", "seal_commit",
    "item_id", "gate_3_result_document_sha256", "normalized_transcript_sha256",
  ];
  for (const [index, itemId] of CANONICAL_GATE4_ITEM_IDS.entries()) {
    const manifest = bundle.coordinator_manifest.items[index];
    const receiptItem = receipt.evidence[index];
    if (
      manifest.item_id !== itemId
      || manifest.gate_3_result_sha256 !== gate3Sha256
      || !isObject(receiptItem)
      || receiptItem.item_id !== itemId
      || receiptItem.gate_3_result_sha256 !== manifest.gate_3_result_sha256
      || receiptItem.gate_4_attempt_claim_sha256 !== manifest.gate_4_attempt_claim_sha256
      || receiptItem.gate_4_public_report_sha256 !== manifest.gate_4_public_report_sha256
      || receiptItem.gate_4_run_id !== manifest.gate_4_run_id
      || receiptItem.normalized_input_sha256 !== manifest.normalized_input_sha256
      || receiptItem.enrichment_output_sha256 !== manifest.enrichment_output_sha256
    ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${itemId} receipt evidence does not match the coordinator manifest`);

    const claimBytes = await readBounded(
      projectFile(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.attempt-claim.json`),
      MAX_JSON_BYTES,
      `${itemId} canonical attempt claim`,
    );
    const claim = strictJson(claimBytes, `${itemId} canonical attempt claim`);
    if (
      sha256(claimBytes) !== manifest.gate_4_attempt_claim_sha256
      || !isObject(claim)
      || Object.keys(claim).length !== claimKeys.length
      || claimKeys.some((key) => !Object.hasOwn(claim, key))
      || claim.schema_version !== "1.0"
      || claim.claim_type !== "canonical_model_harness_attempt"
      || claim.harness_version !== "1.2.0"
      || claim.execution_class !== "SEALED"
      || claim.content_commit !== bundle.content_commit
      || claim.seal_commit !== bundle.seal_commit
      || claim.item_id !== itemId
      || claim.gate_3_result_document_sha256 !== gate3Sha256
      || claim.normalized_transcript_sha256 !== manifest.normalized_input_sha256
    ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${itemId} canonical first-attempt claim was tampered or mismatched`);

    const reportBytes = await readBounded(
      projectFile(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.json`),
      MAX_JSON_BYTES,
      `${itemId} canonical public run report`,
    );
    const report = strictJson(reportBytes, `${itemId} canonical public run report`);
    if (
      sha256(reportBytes) !== manifest.gate_4_public_report_sha256
      || !isObject(report)
      || report.execution_class !== "SEALED"
      || report.publication_eligible !== true
      || report.run_state !== "succeeded"
      || report.item_id !== itemId
      || report.run_id !== manifest.gate_4_run_id
      || !isObject(report.input)
      || report.input.normalized_transcript_sha256 !== manifest.normalized_input_sha256
      || !isObject(report.gate_3_handoff)
      || report.gate_3_handoff.result_document_sha256 !== gate3Sha256
      || report.gate_3_handoff.content_commit !== bundle.content_commit
      || report.gate_3_handoff.seal_commit !== bundle.seal_commit
      || !isObject(report.validation)
      || report.validation.output_sha256 !== manifest.enrichment_output_sha256
      || report.failure !== null
    ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${itemId} canonical run report was tampered or mismatched`);
  }
}

function contractInvocation(contract: JsonObject, role: LocalEvaluatorRole): RoleInvocation {
  if (
    contract.schema_version !== "1.1"
    || contract.contract_id !== "G4-LOCAL-QWEN-BLINDED-EVALUATION-1.0"
    || !Array.isArray(contract.role_invocations)
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "evaluator execution contract identity is invalid");
  const matches = contract.role_invocations.filter((entry) => isObject(entry) && entry.role === role);
  if (matches.length !== 1) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${role} invocation is not uniquely frozen`);
  return matches[0] as unknown as RoleInvocation;
}

async function hashFile(filePath: string, label: string): Promise<{ sha256: string; bytes: number; mode: string }> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", `${label} is missing or is a symlink`);
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", `${label} is not a regular file`);
    const digest = createHash("sha256");
    let observed = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      const bytes = chunk as Buffer;
      observed += bytes.byteLength;
      digest.update(bytes);
    }
    if (observed !== info.size) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", `${label} changed while it was hashed`);
    return { sha256: digest.digest("hex"), bytes: observed, mode: (info.mode & 0o777).toString(8).padStart(4, "0") };
  } finally {
    await handle.close();
  }
}

async function verifySealedRuntime(runtimeDir: string, modelPath: string, ledger: JsonObject): Promise<{ llamaCliPath: string; llamaCliSha256: string; modelRealPath: string; modelSha256: string }> {
  const runtimeRoot = await requireDirectory(runtimeDir, "runtime directory");
  const runtime = ledger.runtime;
  const model = ledger.model;
  if (
    ledger.schema_version !== "1.0"
    || ledger.candidate_id !== "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"
    || ledger.seal_state !== "verified_ready_for_content_freeze"
    || !isObject(runtime)
    || !isObject(runtime.extracted)
    || !Array.isArray(runtime.extracted.file_manifest)
    || !isObject(runtime.extracted.llama_cli)
    || !isObject(model)
    || !isObject(model.observed_file)
  ) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "the pinned runtime ledger is not verified and complete");
  const manifest = runtime.extracted.file_manifest;
  const entries = await readdir(runtimeRoot, { withFileTypes: true });
  const expectedNames = manifest.map((entry) => isObject(entry) ? String(entry.relative_path) : "").sort();
  const observedNames = entries.map((entry) => entry.name).sort();
  if (manifest.length !== 11 || new Set(expectedNames).size !== 11 || canonicalJson(expectedNames) !== canonicalJson(observedNames)) {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "runtime directory differs from the exact 11-file manifest");
  }
  for (const entry of manifest) {
    if (!isObject(entry) || typeof entry.relative_path !== "string" || entry.relative_path.includes("/") || entry.relative_path.includes("\\")) {
      throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "runtime manifest contains an invalid path");
    }
    const observed = await hashFile(path.join(runtimeRoot, entry.relative_path), `runtime file ${entry.relative_path}`);
    if (observed.sha256 !== entry.sha256 || observed.bytes !== entry.bytes || observed.mode !== entry.mode) {
      throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", `runtime file ${entry.relative_path} failed its exact identity check`);
    }
  }
  const llamaCliPath = path.join(runtimeRoot, String(runtime.extracted.llama_cli_relative_path));
  const llama = await hashFile(llamaCliPath, "llama-cli");
  if (llama.sha256 !== runtime.extracted.llama_cli.sha256 || llama.sha256 !== "b8c1891d697f72c1e9c05d0613b4f3d091e388acc2c4e1afa535c19df5d50fc3") {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "llama-cli does not match the evaluator contract");
  }
  const modelRealPath = await realpath(modelPath).catch(() => "");
  if (modelRealPath === "") throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "model path is unavailable");
  const observedModel = await hashFile(modelRealPath, "model file");
  if (
    observedModel.sha256 !== model.observed_file.sha256
    || observedModel.sha256 !== "d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785"
    || observedModel.bytes !== model.observed_file.bytes
    || observedModel.mode !== model.observed_file.mode
  ) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "model file does not match the evaluator contract");
  return { llamaCliPath, llamaCliSha256: llama.sha256, modelRealPath, modelSha256: observedModel.sha256 };
}

export async function verifyPinnedEvaluatorRuntime(
  runtimeDir: string,
  modelPath: string,
  ledgerValue: unknown,
): Promise<{ llamaCliPath: string; llamaCliSha256: string; modelRealPath: string; modelSha256: string }> {
  if (!isObject(ledgerValue)) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "runtime ledger must be an object");
  return verifySealedRuntime(runtimeDir, modelPath, ledgerValue);
}

async function verifyDevExecutable(candidate: string | undefined): Promise<string> {
  if (!candidate || !path.isAbsolute(candidate)) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "DEV_TEST requires an absolute fake executable path");
  const info = await lstat(candidate).catch(() => null);
  if (!info || !info.isFile() || info.isSymbolicLink() || (info.mode & 0o111) === 0) {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "DEV_TEST fake executable must be an executable non-symlink file");
  }
  return realpath(candidate);
}

async function prepareRole(options: RunLocalBlindedEvaluatorOptions, projectRoot: string, packageRoot: string): Promise<PreparedRole> {
  const bundleBytes = await readBounded(path.join(packageRoot, "coordinator.bundle.json"), MAX_JSON_BYTES, "coordinator bundle");
  const bundleValue = strictJson(bundleBytes, "coordinator bundle");
  verifyBlindedPacketBundle(bundleValue);
  const bundle = bundleValue;
  const receiptBytes = await readBounded(path.join(packageRoot, "generation-receipt.json"), MAX_JSON_BYTES, "packet generation receipt");
  const receiptSha256 = sha256(receiptBytes);
  const receipt = strictJson(receiptBytes, "packet generation receipt");
  let packageAttemptRecord;
  let packageTerminalRecord;
  try {
    [packageAttemptRecord, packageTerminalRecord] = await Promise.all([
      readAuthoritativeAttemptClaim(projectRoot, bundle.seal_commit, "package"),
      readAuthoritativeAttemptTerminal(projectRoot, bundle.seal_commit, "package"),
    ]);
  } catch {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "the authoritative package claim or successful terminal evidence is unavailable");
  }
  const packageAttemptClaim = packageAttemptRecord.value as PackageAttemptClaim;
  const packageTerminal = packageTerminalRecord.value;
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
    !isObject(receipt)
    || !isObject(packageTerminal)
    || receipt.schema_version !== "1.0"
    || receipt.operator_version !== "1.0.0"
    || receipt.state !== "written_exclusively"
    || receipt.bundle_sha256 !== canonicalJsonSha256(bundle)
    || receipt.content_commit !== bundle.content_commit
    || receipt.seal_commit !== bundle.seal_commit
    || receipt.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
    || receipt.public_package_attempt_claim_sha256 !== bundle.package_attempt_claim_sha256
    || receipt.consent_attestation_sha256 !== bundle.consent_attestation_sha256
    || receipt.execution_readiness_sha256 !== bundle.execution_readiness_sha256
    || receipt.packet_generated_at !== bundle.packet_generated_at
    || !isObject(receipt.packet_sha256)
    || receipt.packet_sha256.evaluator_a !== bundle.packets.evaluator_a.packet_sha256
    || receipt.packet_sha256.evaluator_b !== bundle.packets.evaluator_b.packet_sha256
    || receipt.source_selection !== "canonical_gate3_handoff_and_fixed_first_write_gate4_paths_only"
    || receipt.package_location_policy !== "private_evidence_root_outputs_seal_gate4_evaluation_package"
    || receipt.external_provider_calls !== 0
    || receipt.external_content_transfer !== false
    || receipt.claims_boundary !== CLAIMS_BOUNDARY
    || packageAttemptRecord.sha256 !== bundle.package_attempt_claim_sha256
    || packageAttemptClaim.execution_class !== options.executionClass
    || packageAttemptClaim.content_commit !== bundle.content_commit
    || packageAttemptClaim.seal_commit !== bundle.seal_commit
    || packageAttemptClaim.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
    || packageAttemptClaim.claimed_at !== bundle.packet_generated_at
    || packageAttemptClaim.execution_contract_sha256 !== bundle.execution_contract_sha256
    || packageAttemptClaim.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
    || packageAttemptClaim.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
    || canonicalJson(packageAttemptClaim.role_system_prompt_sha256) !== canonicalJson(bundle.role_system_prompt_sha256)
    || canonicalJson(packageAttemptClaim.role_generation_schema_sha256) !== canonicalJson(bundle.role_generation_schema_sha256)
    || packageAttemptClaim.consent_attestation_sha256 !== bundle.consent_attestation_sha256
    || packageAttemptClaim.execution_readiness_sha256 !== bundle.execution_readiness_sha256
    || canonicalJson(packageAttemptClaim.sources) !== canonicalJson(expectedSources)
    || packageTerminal.state !== "succeeded"
    || packageTerminal.public_package_attempt_claim_sha256 !== packageAttemptRecord.sha256
    || packageTerminal.bundle_sha256 !== canonicalJsonSha256(bundle)
    || packageTerminal.bundle_file_sha256 !== sha256(bundleBytes)
    || packageTerminal.package_receipt_sha256 !== receiptSha256
    || packageTerminal.execution_class !== options.executionClass
    || packageTerminal.content_commit !== bundle.content_commit
    || packageTerminal.seal_commit !== bundle.seal_commit
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "packet generation receipt does not bind the coordinator bundle");
  if (options.executionClass === "SEALED") await verifySealedPackageEvidence(projectRoot, bundle, receipt);
  const consent = strictJson(await readBounded(path.join(packageRoot, "consent-attestation.json"), MAX_JSON_BYTES, "consent attestation"), "consent attestation");
  const readiness = strictJson(await readBounded(path.join(packageRoot, "execution-readiness.json"), MAX_JSON_BYTES, "execution readiness"), "execution readiness");
  if (canonicalJsonSha256(consent) !== bundle.consent_attestation_sha256 || canonicalJsonSha256(readiness) !== bundle.execution_readiness_sha256) {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "private consent/readiness bytes do not match the packet bundle");
  }

  const contractPath = projectFile(projectRoot, CONTRACT_RELATIVE_PATH);
  const ledgerPath = projectFile(projectRoot, RUNTIME_LEDGER_RELATIVE_PATH);
  const sandboxPath = projectFile(projectRoot, SANDBOX_RELATIVE_PATH);
  const [contractBytes, ledgerBytes, sandboxBytes] = await Promise.all([
    readBounded(contractPath, MAX_JSON_BYTES, "evaluator execution contract"),
    readBounded(ledgerPath, MAX_JSON_BYTES, "runtime ledger"),
    readBounded(sandboxPath, 128 * 1024, "deny-network sandbox profile"),
  ]);
  const contractValue = strictJson(contractBytes, "evaluator execution contract");
  const ledgerValue = strictJson(ledgerBytes, "runtime ledger");
  if (!isObject(contractValue) || !isObject(ledgerValue)) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "contract or runtime ledger is not an object");
  const contract = contractValue;
  const ledger = ledgerValue;
  const invocation = contractInvocation(contract, options.role);
  const inferenceSettings = contract.inference_settings;
  const allInvocations = (["evaluator_a", "evaluator_b", "adjudicator"] as const).map((role) => contractInvocation(contract, role));
  const strictPostparseBindings = Object.fromEntries(allInvocations.map((entry) => [entry.role, entry.strict_postparse_schema_sha256]));
  if (
    !isObject(inferenceSettings)
    || inferenceSettings.timeout_ms_per_role !== EVALUATION_ROLE_TIMEOUT_MS
    || canonicalJson(packageAttemptClaim.strict_postparse_schema_sha256) !== canonicalJson(strictPostparseBindings)
  ) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "the authoritative package claim does not bind the exact strict schemas and child timeout");
  const promptPath = projectFile(projectRoot, invocation.system_prompt_path);
  const schemaPath = projectFile(projectRoot, invocation.output_generation_schema_path);
  const strictSchemaPath = projectFile(projectRoot, invocation.strict_postparse_schema_path);
  const [promptBytes, schemaBytes, strictSchemaBytes] = await Promise.all([
    readBounded(promptPath, 128 * 1024, `${options.role} system prompt`),
    readBounded(schemaPath, MAX_JSON_BYTES, `${options.role} generation schema`),
    readBounded(strictSchemaPath, MAX_JSON_BYTES, `${options.role} strict postparse schema`),
  ]);
  if (
    canonicalJsonSha256(contract) !== bundle.execution_contract_sha256
    || sha256(ledgerBytes) !== bundle.runtime_ledger_sha256
    || sha256(sandboxBytes) !== bundle.sandbox_profile_sha256
    || sha256(promptBytes) !== invocation.system_prompt_sha256
    || sha256(schemaBytes) !== invocation.output_generation_schema_sha256
    || sha256(strictSchemaBytes) !== invocation.strict_postparse_schema_sha256
  ) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "contract, runtime, prompt, schema, or sandbox bytes differ from the packet binding");
  const schemaText = JSON.stringify(strictJson(schemaBytes, `${options.role} generation schema`));
  if (schemaText.includes('"$ref"') || schemaText.includes('"$defs"')) {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "llama.cpp generation schema is not flattened");
  }
  let sandboxText: string;
  try {
    sandboxText = new TextDecoder("utf-8", { fatal: true }).decode(sandboxBytes).replace(/\s+/g, " ");
  } catch {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "sandbox profile is not valid UTF-8");
  }
  for (const required of ["(deny network*)", "(deny file-read* (subpath \"/Users\"))", "(deny file-write* (subpath \"/Users\"))"]) {
    if (!sandboxText.includes(required)) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "deny-network sandbox profile is incomplete");
  }

  let packet: BlindedEvaluatorPacket | AdjudicationPacket;
  let packetSha256: string;
  let packetPath: string;
  let adjudication: AdjudicationPacketBundle | null = null;
  let adjudicationSources: VerifiedEvaluatorPair | null = null;
  if (options.role === "adjudicator") {
    adjudicationSources = await verifyCompletedEvaluatorPair(
      projectRoot,
      packageRoot,
      bundle,
      receiptSha256,
      packageAttemptClaim,
      packageAttemptRecord.sha256,
      String(packageTerminal.completed_at),
      options.executionClass,
      "pre_adjudication",
    );
    adjudication = buildAdjudicationPacket(bundle, adjudicationSources.evaluatorA.result, adjudicationSources.evaluatorB.result);
    if (adjudication.state !== "required" || !adjudication.packet || !adjudication.packet_sha256) {
      throw new LocalBlindedEvaluatorError("ADJUDICATION_NOT_REQUIRED", "the deterministic A/B comparison does not require an adjudicator invocation");
    }
    packet = adjudication.packet;
    packetSha256 = adjudication.packet_sha256;
    packetPath = path.join(packageRoot, "adjudicator.packet.json");
  } else {
    const name = options.role === "evaluator_a" ? "evaluator-a.packet.json" : "evaluator-b.packet.json";
    packetPath = path.join(packageRoot, name);
    const packetValue = strictJson(await readBounded(packetPath, MAX_JSON_BYTES, `${options.role} packet`), `${options.role} packet`);
    const expected = bundle.packets[options.role];
    if (canonicalJson(packetValue) !== canonicalJson(expected.packet) || canonicalJsonSha256(packetValue) !== expected.packet_sha256) {
      throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${options.role} packet bytes do not match the coordinator bundle`);
    }
    packet = expected.packet;
    packetSha256 = expected.packet_sha256;
  }
  if (
    packet.execution_contract_sha256 !== bundle.execution_contract_sha256
    || packet.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
    || packet.role_system_prompt_sha256 !== invocation.system_prompt_sha256
    || packet.role_generation_schema_sha256 !== invocation.output_generation_schema_sha256
    || packet.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
  ) throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", `${options.role} packet does not bind the exact execution inputs`);

  let runtimeIdentity: { llamaCliPath: string; llamaCliSha256: string; modelRealPath: string; modelSha256: string };
  if (options.executionClass === "SEALED") {
    let lock;
    try { lock = verifyLock({ repoRoot: projectRoot }); }
    catch { throw new LocalBlindedEvaluatorError("LOCK_INVALID", "the canonical benchmark lock did not verify before evaluator inference"); }
    if (lock.contentCommit !== bundle.content_commit || lock.sealCommit !== bundle.seal_commit || lock.lockSha256 !== bundle.benchmark_lock_sha256) {
      throw new LocalBlindedEvaluatorError("LOCK_INVALID", "the packet package names a different benchmark seal");
    }
    runtimeIdentity = await verifySealedRuntime(options.runtimeDir, options.modelPath, ledger);
  } else {
    const executable = await verifyDevExecutable(options.devExecutablePath);
    runtimeIdentity = {
      llamaCliPath: executable,
      llamaCliSha256: sha256(await readBounded(executable, MAX_JSON_BYTES, "DEV_TEST executable")),
      modelRealPath: path.resolve(options.modelPath),
      modelSha256: "d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785",
    };
  }
  if (
    packageAttemptClaim.llama_cli_sha256 !== runtimeIdentity.llamaCliSha256
    || packageAttemptClaim.model_sha256 !== runtimeIdentity.modelSha256
  ) throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "the actual evaluator runtime differs from the authoritative package attempt binding");
  return {
    bundle,
    receipt,
    receiptBytes,
    receiptSha256,
    packageAttemptClaim,
    packet,
    packetSha256,
    packetPath,
    adjudication,
    contract,
    contractBytes,
    ledger,
    ledgerBytes,
    invocation,
    promptPath,
    promptBytes,
    schemaPath,
    schemaBytes,
    strictSchemaPath,
    strictSchemaBytes,
    sandboxPath,
    sandboxBytes,
    ...runtimeIdentity,
    adjudicationSources,
  };
}

async function createRoleClaim(
  packageRoot: string,
  role: LocalEvaluatorRole,
  packetId: string,
  packetSha256: string,
  claimedAt: string,
  publicRoleAttemptClaimSha256: string,
  publicPackageAttemptClaimSha256: string,
): Promise<{ directory: string; claimSha256: string }> {
  const parent = path.join(packageRoot, "role-results");
  try { await mkdir(parent, { mode: 0o700 }); }
  catch (error) {
    const info = await lstat(parent).catch(() => null);
    if (!info || !info.isDirectory() || info.isSymbolicLink()) throw error;
  }
  await chmod(parent, 0o700);
  await fsyncDirectory(packageRoot, "private packet package directory");
  const parentInfo = await lstat(parent);
  if ((parentInfo.mode & 0o777) !== 0o700 || await realpath(parent) !== parent) {
    throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", "canonical role-results root is not a private exact directory");
  }
  const directory = path.join(parent, role);
  try { await mkdir(directory, { mode: 0o700 }); }
  catch { throw new LocalBlindedEvaluatorError("ROLE_ALREADY_CLAIMED", `${role} has already been claimed; no rerun is permitted`); }
  await chmod(directory, 0o700);
  await fsyncDirectory(parent, "private role-results directory");
  const directoryInfo = await lstat(directory);
  if ((directoryInfo.mode & 0o777) !== 0o700 || await realpath(directory) !== directory) {
    throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", `${role} result claim directory is not private and canonical`);
  }
  const claimSha256 = await writeExclusiveJson(path.join(directory, "claim.json"), {
    schema_version: "1.0",
    state: "claimed_before_inference",
    role,
    packet_id: packetId,
    packet_sha256: packetSha256,
    claimed_at: claimedAt,
    public_role_attempt_claim_sha256: publicRoleAttemptClaimSha256,
    public_package_attempt_claim_sha256: publicPackageAttemptClaimSha256,
    retry_policy: "one_write_once_role_invocation_no_retry",
  });
  return { directory, claimSha256 };
}

async function fsyncDirectory(directory: string, label: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", `${label} could not be opened for durable synchronization`);
  try { await handle.sync(); }
  catch { throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", `${label} could not be synchronized durably`); }
  finally { await handle.close(); }
}

async function writeExclusiveBytes(filePath: string, bytes: Buffer): Promise<string> {
  const handle = await open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600).catch(() => null);
  if (!handle) throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", `${path.basename(filePath)} could not be written exclusively`);
  try {
    await handle.writeFile(bytes);
    await handle.chmod(0o600);
    await handle.sync();
    const info = await handle.stat();
    if (!info.isFile() || info.size !== bytes.byteLength || info.nlink !== 1) {
      throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", `${path.basename(filePath)} did not persist as one exact regular file`);
    }
  }
  finally { await handle.close(); }
  await fsyncDirectory(path.dirname(filePath), "private evaluator result directory");
  return sha256(bytes);
}

async function writeExclusiveJson(filePath: string, value: unknown): Promise<string> {
  return writeExclusiveBytes(filePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"));
}

function commandArgs(prepared: PreparedRole): string[] {
  const settings = prepared.contract.inference_settings as JsonObject;
  return [
    "--model", prepared.modelRealPath,
    "--json-schema-file", prepared.schemaPath,
    "--system-prompt-file", prepared.promptPath,
    "--file", prepared.packetPath,
    "--offline", "--no-mmproj", "--no-conversation", "--single-turn", "--simple-io",
    "--no-display-prompt", "--no-show-timings", "--log-disable",
    "--seed", String(prepared.invocation.seed),
    "--temp", String(settings.temperature),
    "--top-k", String(settings.top_k),
    "--top-p", String(settings.top_p),
    "--min-p", String(settings.min_p),
    "--repeat-penalty", String(settings.repeat_penalty),
    "--ctx-size", String(settings.context_size),
    "--n-predict", String(settings.max_output_tokens),
    "--threads", String(settings.threads),
    "--threads-batch", String(settings.threads_batch),
    "--gpu-layers", String(settings.gpu_layers),
    "--reasoning", "off", "--reasoning-budget", "0",
  ];
}

async function executeRole(prepared: PreparedRole, options: RunLocalBlindedEvaluatorOptions, resultDirectory: string, now: () => Date): Promise<ProcessEvidence> {
  const started = now();
  const baseArgs = commandArgs(prepared);
  const executable = options.executionClass === "SEALED" ? "/usr/bin/time" : prepared.llamaCliPath;
  const args = options.executionClass === "SEALED" ? [
    "-l", "/usr/bin/sandbox-exec",
    "-D", `RUNTIME_DIR=${path.dirname(prepared.llamaCliPath)}`,
    "-D", `MODEL_PATH=${prepared.modelRealPath}`,
    "-D", `OUTPUT_SCHEMA_PATH=${prepared.schemaPath}`,
    "-D", `SYSTEM_PROMPT_PATH=${prepared.promptPath}`,
    "-D", `PROMPT_PATH=${prepared.packetPath}`,
    "-D", `RUN_DIR=${resultDirectory}`,
    "-f", prepared.sandboxPath,
    prepared.llamaCliPath,
    ...baseArgs,
  ] : baseArgs;
  const settings = prepared.contract.inference_settings as JsonObject;
  const stdoutParts: Buffer[] = [];
  const stderrParts: Buffer[] = [];
  const stdoutDigest = createHash("sha256");
  const stderrDigest = createHash("sha256");
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let timedOut = false;
  let overflow = false;
  let exitCode: number | null = null;
  let signal: string | null = null;
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    PATH: "/usr/bin:/bin",
    HOME: resultDirectory,
    TMPDIR: resultDirectory,
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    HF_HUB_OFFLINE: "1",
    TRANSFORMERS_OFFLINE: "1",
    LLAMA_ARG_OFFLINE: "1",
    DYLD_LIBRARY_PATH: path.dirname(prepared.llamaCliPath),
  };
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { cwd: resultDirectory, detached: true, env, stdio: ["ignore", "pipe", "pipe"] });
    const killGroup = (): void => {
      try { if (child.pid) process.kill(-child.pid, "SIGKILL"); else child.kill("SIGKILL"); }
      catch { child.kill("SIGKILL"); }
    };
    const timer = setTimeout(() => { timedOut = true; killGroup(); }, Number(settings.timeout_ms_per_role));
    const capture = (chunk: Buffer, parts: Buffer[], stream: "stdout" | "stderr"): void => {
      const digest = stream === "stdout" ? stdoutDigest : stderrDigest;
      digest.update(chunk);
      if (stream === "stdout") stdoutBytes += chunk.byteLength; else stderrBytes += chunk.byteLength;
      const total = stream === "stdout" ? stdoutBytes : stderrBytes;
      const retainedBefore = parts.reduce((sum, part) => sum + part.byteLength, 0);
      const take = Math.min(chunk.byteLength, Math.max(0, MAX_CAPTURE_BYTES - retainedBefore));
      if (take > 0) parts.push(chunk.subarray(0, take));
      if (total > MAX_CAPTURE_BYTES) { overflow = true; killGroup(); }
    };
    child.stdout.on("data", (chunk: Buffer) => capture(chunk, stdoutParts, "stdout"));
    child.stderr.on("data", (chunk: Buffer) => capture(chunk, stderrParts, "stderr"));
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, closeSignal) => {
      clearTimeout(timer);
      exitCode = code;
      signal = closeSignal;
      resolve();
    });
  }).catch(() => { throw new LocalBlindedEvaluatorError("PROCESS_FAILED", "the fresh local evaluator process could not start"); });
  const completed = now();
  const stderr = Buffer.concat(stderrParts);
  const stderrText = stderr.toString("utf8");
  const rss = stderrText.match(/^\s*([0-9]+)\s+maximum resident set size\s*$/m);
  const peak = stderrText.match(/^\s*([0-9]+)\s+peak memory footprint\s*$/m);
  return {
    started,
    completed,
    exitCode,
    signal,
    timedOut,
    overflow,
    stdout: Buffer.concat(stdoutParts),
    stderr,
    stdoutBytes,
    stderrBytes,
    stdoutSha256: stdoutDigest.digest("hex"),
    stderrSha256: stderrDigest.digest("hex"),
    maximumResidentSetSizeBytes: rss ? Number(rss[1]) : null,
    peakMemoryFootprintBytes: peak ? Number(peak[1]) : null,
  };
}

function makeAttestation(role: LocalEvaluatorRole): JsonObject {
  const common = {
    fresh_process: true,
    packet_only_file_context: true,
    candidate_identity_hidden: true,
    candidate_runtime_hidden: true,
    price_latency_hidden: true,
    pinned_runtime_verified: true,
    pinned_model_verified: true,
    role_prompt_hash_verified: true,
    deny_network_sandbox_verified: true,
    tools_available: false,
    network_available: false,
    external_content_transfer: false,
    evaluator_initiated_provider_calls: 0,
    external_api_calls: 0,
    incremental_spend_usd: 0,
    local_model_identity: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637",
    same_model_evaluator_bias_acknowledged: true,
    training_performed: false,
    private_retention_delete_by: "2026-10-14",
    contract_accepted: true,
    consent_attestation_present: true,
  };
  return role === "adjudicator"
    ? { ...common, both_evaluator_results_seen_only_for_disputes: true, additional_transcript_content_received: false }
    : { ...common, other_evaluator_unseen: true };
}

function wrapAndVerify(prepared: PreparedRole, role: LocalEvaluatorRole, decisions: unknown, process: ProcessEvidence): BlindedEvaluatorResult | BlindedAdjudicationResult {
  if (!isObject(decisions) || decisions.schema_version !== "1.0" || !Array.isArray(decisions.items) || decisions.claims_boundary !== CLAIMS_BOUNDARY) {
    throw new LocalBlindedEvaluatorError("OUTPUT_INVALID", "model output is not the locked decisions-only object");
  }
  const schema = strictJson(prepared.schemaBytes, `${role} generation schema`);
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema as AnySchema);
  if (!validate(decisions)) throw new LocalBlindedEvaluatorError("OUTPUT_INVALID", "model output violates the flattened generation schema");
  const strictPostparseSchema = strictJson(prepared.strictSchemaBytes, `${role} strict postparse schema`);
  const strictAjv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(strictAjv);
  const validateStrictResult = strictAjv.compile(strictPostparseSchema as AnySchema);
  if (role === "adjudicator") {
    if (!prepared.adjudication) throw new LocalBlindedEvaluatorError("OUTPUT_INVALID", "adjudication packet binding is unavailable");
    const result = {
      schema_version: "1.0",
      packet_id: prepared.packet.packet_id,
      packet_sha256: prepared.packetSha256,
      execution_contract_sha256: prepared.bundle.execution_contract_sha256,
      role: "adjudicator",
      execution_attestation: makeAttestation(role),
      started_at: process.started.toISOString(),
      completed_at: process.completed.toISOString(),
      items: decisions.items,
      claims_boundary: CLAIMS_BOUNDARY,
    };
    const verified = verifyAdjudicationResult(result, prepared.adjudication, prepared.bundle.packet_generated_at);
    if (!validateStrictResult(verified)) throw new LocalBlindedEvaluatorError("OUTPUT_INVALID", "trusted adjudication wrapper result violates the sealed postparse schema");
    return verified;
  }
  const result = {
    schema_version: "1.1",
    packet_id: prepared.packet.packet_id,
    packet_sha256: prepared.packetSha256,
    execution_contract_sha256: prepared.bundle.execution_contract_sha256,
    role,
    execution_attestation: makeAttestation(role),
    started_at: process.started.toISOString(),
    completed_at: process.completed.toISOString(),
    items: decisions.items,
    claims_boundary: CLAIMS_BOUNDARY,
  };
  const verified = verifyEvaluatorResult(result, prepared.bundle, role);
  if (!validateStrictResult(verified)) throw new LocalBlindedEvaluatorError("OUTPUT_INVALID", "trusted evaluator wrapper result violates the sealed postparse schema");
  return verified;
}

async function postVerify(
  prepared: PreparedRole,
  options: RunLocalBlindedEvaluatorOptions,
  projectRoot: string,
  publicRoleAttemptClaimSha256: string,
): Promise<boolean> {
  try {
  const [contract, ledger, prompt, schema, strictSchema, sandbox, packet, bundle, receipt, packageClaim, packageTerminal, roleClaim] = await Promise.all([
      readBounded(projectFile(projectRoot, CONTRACT_RELATIVE_PATH), MAX_JSON_BYTES, "contract after execution"),
      readBounded(projectFile(projectRoot, RUNTIME_LEDGER_RELATIVE_PATH), MAX_JSON_BYTES, "ledger after execution"),
      readBounded(prepared.promptPath, 128 * 1024, "role prompt after execution"),
      readBounded(prepared.schemaPath, MAX_JSON_BYTES, "generation schema after execution"),
      readBounded(prepared.strictSchemaPath, MAX_JSON_BYTES, "strict schema after execution"),
      readBounded(prepared.sandboxPath, 128 * 1024, "sandbox after execution"),
      readBounded(prepared.packetPath, MAX_JSON_BYTES, "packet after execution"),
      readBounded(path.join(path.dirname(prepared.packetPath), "coordinator.bundle.json"), MAX_JSON_BYTES, "bundle after execution"),
      readBounded(path.join(path.dirname(prepared.packetPath), "generation-receipt.json"), MAX_JSON_BYTES, "receipt after execution"),
      readAuthoritativeAttemptClaim(projectRoot, prepared.bundle.seal_commit, "package"),
      readAuthoritativeAttemptTerminal(projectRoot, prepared.bundle.seal_commit, "package"),
      readAuthoritativeAttemptClaim(projectRoot, prepared.bundle.seal_commit, options.role),
    ]);
    if (
      !contract.equals(prepared.contractBytes)
      || !ledger.equals(prepared.ledgerBytes)
      || !prompt.equals(prepared.promptBytes)
      || !schema.equals(prepared.schemaBytes)
      || !strictSchema.equals(prepared.strictSchemaBytes)
      || !sandbox.equals(prepared.sandboxBytes)
      || canonicalJsonSha256(strictJson(packet, "packet after execution")) !== prepared.packetSha256
      || canonicalJsonSha256(strictJson(bundle, "bundle after execution")) !== canonicalJsonSha256(prepared.bundle)
      || !receipt.equals(prepared.receiptBytes)
      || packageClaim.sha256 !== prepared.bundle.package_attempt_claim_sha256
      || !isObject(packageTerminal.value)
      || packageTerminal.value.state !== "succeeded"
      || roleClaim.sha256 !== publicRoleAttemptClaimSha256
    ) return false;
    if (options.executionClass === "SEALED") {
      const lock = verifyLock({ repoRoot: projectRoot });
      if (lock.contentCommit !== prepared.bundle.content_commit || lock.sealCommit !== prepared.bundle.seal_commit || lock.lockSha256 !== prepared.bundle.benchmark_lock_sha256) return false;
      await verifySealedPackageEvidence(projectRoot, prepared.bundle, prepared.receipt);
      const runtime = await verifySealedRuntime(options.runtimeDir, options.modelPath, prepared.ledger);
      if (runtime.llamaCliSha256 !== prepared.llamaCliSha256 || runtime.modelSha256 !== prepared.modelSha256) return false;
    }
    if (options.role === "adjudicator") {
      if (!prepared.adjudicationSources || !prepared.adjudication) return false;
      const postSources = await verifyCompletedEvaluatorPair(
        projectRoot,
        path.dirname(prepared.packetPath),
        prepared.bundle,
        prepared.receiptSha256,
        prepared.packageAttemptClaim,
        prepared.bundle.package_attempt_claim_sha256,
        String((packageTerminal.value as JsonObject).completed_at),
        options.executionClass,
        "post_adjudication",
      );
      const postAdjudication = buildAdjudicationPacket(prepared.bundle, postSources.evaluatorA.result, postSources.evaluatorB.result);
      if (
        postSources.pairSha256 !== prepared.adjudicationSources.pairSha256
        || postAdjudication.state !== "required"
        || !postAdjudication.packet
        || postAdjudication.packet_sha256 !== prepared.packetSha256
        || canonicalJson(postAdjudication.packet) !== canonicalJson(prepared.packet)
      ) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function runLocalBlindedEvaluator(options: RunLocalBlindedEvaluatorOptions): Promise<LocalEvaluatorRunResult> {
  if (!(["SEALED", "DEV_TEST"] as const).includes(options.executionClass) || !(["evaluator_a", "evaluator_b", "adjudicator"] as const).includes(options.role)) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", "execution class or evaluator role is invalid");
  }
  if (options.executionClass === "DEV_TEST" && !String(process.env.NODE_TEST_CONTEXT ?? "").startsWith("child")) {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "DEV_TEST is restricted to the Node test runner");
  }
  if (options.executionClass === "SEALED" && (options.devExecutablePath || options.devPacketPackageDirectory || options.now)) {
    throw new LocalBlindedEvaluatorError("RUNTIME_INVALID", "test-only executable, package, and clock injection are prohibited for SEALED execution");
  }
  const projectRoot = await requireDirectory(options.projectRoot, "project root");
  const privateEvidenceRoot = await requireDirectory(options.privateEvidenceRoot, "private evidence root");
  if (isWithin(projectRoot, privateEvidenceRoot)) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", "private evidence root must remain outside the worktree");
  }
  let packageCandidate: string;
  if (options.executionClass === "SEALED") {
    let lock;
    try { lock = verifyLock({ repoRoot: projectRoot }); }
    catch { throw new LocalBlindedEvaluatorError("LOCK_INVALID", "the canonical benchmark lock did not verify before package selection"); }
    packageCandidate = path.join(privateEvidenceRoot, "outputs", lock.sealCommit, "gate4-evaluation", "package");
  } else {
    if (!options.devPacketPackageDirectory) throw new LocalBlindedEvaluatorError("PATH_INVALID", "DEV_TEST requires its synthetic packet package directory");
    packageCandidate = options.devPacketPackageDirectory;
  }
  const packageRoot = await requireDirectory(packageCandidate, "packet package directory");
  if (isWithin(projectRoot, packageRoot)) throw new LocalBlindedEvaluatorError("PATH_INVALID", "packet package must remain outside the worktree");
  const packageInfo = await lstat(packageRoot);
  if ((packageInfo.mode & 0o777) !== 0o700 || await realpath(packageRoot) !== packageRoot) {
    throw new LocalBlindedEvaluatorError("PATH_INVALID", "canonical packet package must be an exact private mode-0700 directory");
  }
  if (options.executionClass === "SEALED") {
    const [runtimeRoot, modelRealPath] = await Promise.all([
      requireDirectory(options.runtimeDir, "runtime directory"),
      realpath(options.modelPath).catch(() => ""),
    ]);
    if (isWithin(projectRoot, runtimeRoot) || modelRealPath === "" || isWithin(projectRoot, modelRealPath)) {
      throw new LocalBlindedEvaluatorError("PATH_INVALID", "runtime, model, and package roots must remain outside the worktree");
    }
  }
  const prepared = await prepareRole(options, projectRoot, packageRoot);
  const now = options.now ?? (() => new Date());
  const claimTime = now();
  if (Date.parse(claimTime.toISOString()) < Date.parse(prepared.bundle.packet_generated_at)) {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "role claim cannot predate packet generation");
  }
  if (
    options.role === "adjudicator"
    && (
      !prepared.adjudicationSources
      || Date.parse(claimTime.toISOString()) < Date.parse(prepared.adjudicationSources.latestCompletedAt)
    )
  ) {
    throw new LocalBlindedEvaluatorError("PACKET_PACKAGE_INVALID", "adjudicator claim cannot precede both verified evaluator terminals");
  }
  const roleClaimValue: RoleAttemptClaim = {
    schema_version: "1.0",
    claim_type: "canonical_blinded_evaluator_role_attempt",
    runner_version: "1.0.0",
    execution_class: options.executionClass,
    publication_eligible: options.executionClass === "SEALED",
    content_commit: prepared.bundle.content_commit,
    seal_commit: prepared.bundle.seal_commit,
    benchmark_lock_sha256: prepared.bundle.benchmark_lock_sha256,
    role: options.role,
    claimed_at: claimTime.toISOString(),
    timeout_ms: EVALUATION_ROLE_TIMEOUT_MS,
    retry_policy: "one_write_once_role_invocation_no_retry",
    public_package_attempt_claim_sha256: prepared.bundle.package_attempt_claim_sha256,
    package_receipt_sha256: prepared.receiptSha256,
    bundle_sha256: canonicalJsonSha256(prepared.bundle),
    packet_id: prepared.packet.packet_id,
    packet_sha256: prepared.packetSha256,
    execution_contract_sha256: prepared.bundle.execution_contract_sha256,
    runtime_ledger_sha256: prepared.bundle.runtime_ledger_sha256,
    llama_cli_sha256: prepared.llamaCliSha256,
    model_sha256: prepared.modelSha256,
    role_system_prompt_sha256: prepared.invocation.system_prompt_sha256,
    role_generation_schema_sha256: prepared.invocation.output_generation_schema_sha256,
    strict_postparse_schema_sha256: prepared.invocation.strict_postparse_schema_sha256,
    sandbox_profile_sha256: prepared.bundle.sandbox_profile_sha256,
    external_provider_calls: 0,
    external_content_transfer: false,
    claims_boundary: CLAIMS_BOUNDARY,
  };
  let publicRoleAttemptClaim;
  try { publicRoleAttemptClaim = await writeRoleAttemptClaim(projectRoot, roleClaimValue); }
  catch (error) {
    if (error instanceof Gate4EvaluationClaimError && error.code === "ATTEMPT_ALREADY_CLAIMED") {
      throw new LocalBlindedEvaluatorError("ROLE_ALREADY_CLAIMED", `${options.role} is already claimed in the authoritative worktree; copied packages cannot rerun it`);
    }
    throw new LocalBlindedEvaluatorError("RESULT_WRITE_FAILED", "the authoritative role attempt could not be claimed safely");
  }

  let resultDirectory: string | null = null;
  let privateRoleClaimSha256: string | null = null;
  let privateRunReportSha256: string | null = null;
  let processEvidence: ProcessEvidence | null = null;
  let invocationCount: 0 | 1 = 0;
  try {
    const privateClaim = await createRoleClaim(
      packageRoot,
      options.role,
      prepared.packet.packet_id,
      prepared.packetSha256,
      claimTime.toISOString(),
      publicRoleAttemptClaim.sha256,
      prepared.bundle.package_attempt_claim_sha256,
    );
    resultDirectory = privateClaim.directory;
    privateRoleClaimSha256 = privateClaim.claimSha256;
    if (options.role === "adjudicator") await writeExclusiveJson(prepared.packetPath, prepared.packet);

    invocationCount = 1;
    try { processEvidence = await executeRole(prepared, options, resultDirectory, now); }
    catch {
      const completed = now();
      const emptyHash = sha256(Buffer.alloc(0));
      processEvidence = {
        started: claimTime,
        completed,
        exitCode: null,
        signal: null,
        timedOut: false,
        overflow: false,
        stdout: Buffer.alloc(0),
        stderr: Buffer.alloc(0),
        stdoutBytes: 0,
        stderrBytes: 0,
        stdoutSha256: emptyHash,
        stderrSha256: emptyHash,
        maximumResidentSetSizeBytes: null,
        peakMemoryFootprintBytes: null,
      };
    }
    await writeExclusiveBytes(path.join(resultDirectory, "raw.stdout"), processEvidence.stdout);
    await writeExclusiveBytes(path.join(resultDirectory, "raw.stderr"), processEvidence.stderr);

    const postVerified = await postVerify(prepared, options, projectRoot, publicRoleAttemptClaim.sha256);
    let result: BlindedEvaluatorResult | BlindedAdjudicationResult | null = null;
    let decisions: unknown = null;
    let failureCode: string | null = null;
    if (processEvidence.timedOut) failureCode = "PROCESS_TIMEOUT";
    else if (processEvidence.overflow) failureCode = "PROCESS_OUTPUT_OVERFLOW";
    else if (processEvidence.exitCode !== 0) failureCode = "PROCESS_EXIT_NONZERO";
    else if (options.executionClass === "SEALED" && (processEvidence.maximumResidentSetSizeBytes === null || processEvidence.peakMemoryFootprintBytes === null)) failureCode = "RESOURCE_MEASUREMENT_MISSING";
    else if (!postVerified) failureCode = "BOUND_INPUT_CHANGED_DURING_EXECUTION";
    else {
      try {
        decisions = strictJson(processEvidence.stdout, "model decisions");
        result = wrapAndVerify(prepared, options.role, decisions, processEvidence);
      } catch {
        failureCode = "MODEL_DECISIONS_INVALID";
      }
    }
    if (decisions !== null) await writeExclusiveJson(path.join(resultDirectory, "generation-decisions.json"), decisions);
    if (result) await writeExclusiveJson(path.join(resultDirectory, "result.json"), result);
    const report: LocalEvaluatorRunReport = {
      schema_version: "1.0",
      runner_version: "1.0.0",
      execution_class: options.executionClass,
      publication_eligible: options.executionClass === "SEALED",
      role: options.role,
      state: result ? "succeeded" : "failed",
      packet_id: prepared.packet.packet_id,
      packet_sha256: prepared.packetSha256,
      result_sha256: result ? canonicalJsonSha256(result) : null,
      started_at: processEvidence.started.toISOString(),
      completed_at: processEvidence.completed.toISOString(),
      duration_ms: Math.max(0, processEvidence.completed.getTime() - processEvidence.started.getTime()),
      process: {
        invocation_count: 1,
        timeout_ms: EVALUATION_ROLE_TIMEOUT_MS,
        exit_code: processEvidence.exitCode,
        signal: processEvidence.signal,
        timed_out: processEvidence.timedOut,
        output_overflow: processEvidence.overflow,
        stdout_bytes: processEvidence.stdoutBytes,
        stdout_retained_bytes: processEvidence.stdout.byteLength,
        stdout_sha256: processEvidence.stdoutSha256,
        stderr_bytes: processEvidence.stderrBytes,
        stderr_retained_bytes: processEvidence.stderr.byteLength,
        stderr_sha256: processEvidence.stderrSha256,
        maximum_resident_set_size_bytes: processEvidence.maximumResidentSetSizeBytes,
        peak_memory_footprint_bytes: processEvidence.peakMemoryFootprintBytes,
      },
      bindings: {
        content_commit: prepared.bundle.content_commit,
        seal_commit: prepared.bundle.seal_commit,
        benchmark_lock_sha256: prepared.bundle.benchmark_lock_sha256,
        public_package_attempt_claim_sha256: prepared.bundle.package_attempt_claim_sha256,
        public_role_attempt_claim_sha256: publicRoleAttemptClaim.sha256,
        execution_contract_sha256: prepared.bundle.execution_contract_sha256,
        runtime_ledger_sha256: prepared.bundle.runtime_ledger_sha256,
        llama_cli_sha256: prepared.llamaCliSha256,
        model_sha256: prepared.modelSha256,
        role_system_prompt_sha256: prepared.invocation.system_prompt_sha256,
        role_generation_schema_sha256: prepared.invocation.output_generation_schema_sha256,
        strict_postparse_schema_sha256: prepared.invocation.strict_postparse_schema_sha256,
        sandbox_profile_sha256: prepared.bundle.sandbox_profile_sha256,
        post_execution_reverified: postVerified,
      },
      boundary: {
        local_private_process: true,
        fresh_process: true,
        packet_only_file_context: true,
        network_denied: true,
        tools_available: false,
        external_provider_calls: 0,
        external_content_transfer: false,
        incremental_spend_usd: 0,
        training_performed: false,
        same_model_evaluator_bias: "disclosed_material_reproducibility_limitation",
      },
      failure_code: failureCode,
      claims_boundary: CLAIMS_BOUNDARY,
    };
    privateRunReportSha256 = await writeExclusiveJson(path.join(resultDirectory, "run-report.json"), report);
    await writeRoleAttemptTerminal(projectRoot, {
      schema_version: "1.0",
      terminal_type: "canonical_blinded_evaluator_role_terminal",
      runner_version: "1.0.0",
      execution_class: options.executionClass,
      publication_eligible: options.executionClass === "SEALED",
      content_commit: prepared.bundle.content_commit,
      seal_commit: prepared.bundle.seal_commit,
      role: options.role,
      public_role_attempt_claim_sha256: publicRoleAttemptClaim.sha256,
      public_package_attempt_claim_sha256: prepared.bundle.package_attempt_claim_sha256,
      state: result ? "succeeded" : "failed",
      completed_at: processEvidence.completed.toISOString(),
      result_sha256: result ? canonicalJsonSha256(result) : null,
      private_role_claim_sha256: privateRoleClaimSha256,
      private_run_report_sha256: privateRunReportSha256,
      failure_code: result ? null : failureCode ?? "ROLE_FAILED",
      process: {
        invocation_count: 1,
        timeout_ms: EVALUATION_ROLE_TIMEOUT_MS,
        exit_code: processEvidence.exitCode,
        signal: processEvidence.signal,
        timed_out: processEvidence.timedOut,
        output_overflow: processEvidence.overflow,
        stdout_bytes: processEvidence.stdoutBytes,
        stdout_retained_bytes: processEvidence.stdout.byteLength,
        stdout_sha256: processEvidence.stdoutSha256,
        stderr_bytes: processEvidence.stderrBytes,
        stderr_retained_bytes: processEvidence.stderr.byteLength,
        stderr_sha256: processEvidence.stderrSha256,
      },
      external_provider_calls: 0,
      external_content_transfer: false,
      claims_boundary: CLAIMS_BOUNDARY,
    });
    return { report, result, resultDirectory };
  } catch (error) {
    const emptyHash = sha256(Buffer.alloc(0));
    const completed = processEvidence?.completed ?? now();
    const failureCode = error instanceof LocalBlindedEvaluatorError
      ? error.code
      : error instanceof Gate4EvaluationClaimError
        ? error.code
        : "ROLE_POST_CLAIM_FAILED";
    await writeRoleAttemptTerminal(projectRoot, {
      schema_version: "1.0",
      terminal_type: "canonical_blinded_evaluator_role_terminal",
      runner_version: "1.0.0",
      execution_class: options.executionClass,
      publication_eligible: options.executionClass === "SEALED",
      content_commit: prepared.bundle.content_commit,
      seal_commit: prepared.bundle.seal_commit,
      role: options.role,
      public_role_attempt_claim_sha256: publicRoleAttemptClaim.sha256,
      public_package_attempt_claim_sha256: prepared.bundle.package_attempt_claim_sha256,
      state: "failed",
      completed_at: completed.toISOString(),
      result_sha256: null,
      private_role_claim_sha256: privateRoleClaimSha256,
      private_run_report_sha256: privateRunReportSha256,
      failure_code: failureCode,
      process: {
        invocation_count: invocationCount,
        timeout_ms: EVALUATION_ROLE_TIMEOUT_MS,
        exit_code: processEvidence?.exitCode ?? null,
        signal: processEvidence?.signal ?? null,
        timed_out: processEvidence?.timedOut ?? false,
        output_overflow: processEvidence?.overflow ?? false,
        stdout_bytes: processEvidence?.stdoutBytes ?? 0,
        stdout_retained_bytes: processEvidence?.stdout.byteLength ?? 0,
        stdout_sha256: processEvidence?.stdoutSha256 ?? emptyHash,
        stderr_bytes: processEvidence?.stderrBytes ?? 0,
        stderr_retained_bytes: processEvidence?.stderr.byteLength ?? 0,
        stderr_sha256: processEvidence?.stderrSha256 ?? emptyHash,
      },
      external_provider_calls: 0,
      external_content_transfer: false,
      claims_boundary: CLAIMS_BOUNDARY,
    }).catch(() => undefined);
    throw error;
  }
}
