import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
} from "node:fs/promises";
import path from "node:path";

import { parseJsonBytesWithoutDuplicateKeys } from "./verify-lock";

const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
export const GATE4_EVALUATION_ATTEMPT_CLAIMS_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-evaluation-attempt-claims`;
export const EVALUATION_ROLE_TIMEOUT_MS = 1_800_000 as const;
export const EVALUATION_CLAIMS_BOUNDARY = "ai_evaluated_provisional_pending_human_stakeholder_review" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;
const ISO_DATE_TIME_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const ITEM_IDS = ["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"] as const;
const ROLES = ["evaluator_a", "evaluator_b", "adjudicator"] as const;
const PRIVATE_TEXT_PATTERNS = [
  /\/(?:Users|home|private|tmp)\//iu,
  /file:\/\//iu,
  /(?:client[_ -]?secret|api[_ -]?key|authorization)\s*[:=]/iu,
  /GOCSPX-[A-Za-z0-9_-]+/u,
  /sk-[A-Za-z0-9_-]{16,}/u,
];

type JsonObject = Record<string, unknown>;
export type EvaluationExecutionClass = "SEALED" | "DEV_TEST";
export type EvaluationClaimRole = (typeof ROLES)[number];
export type EvaluationClaimName = "package" | EvaluationClaimRole;

export class Gate4EvaluationClaimError extends Error {
  constructor(
    public readonly code:
      | "PATH_INVALID"
      | "CLAIM_INVALID"
      | "ATTEMPT_ALREADY_CLAIMED"
      | "CLAIM_WRITE_FAILED"
      | "TERMINAL_ALREADY_WRITTEN"
      | "TERMINAL_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "Gate4EvaluationClaimError";
  }
}

export interface PackageAttemptSourceBinding {
  item_id: (typeof ITEM_IDS)[number];
  gate_3_result_sha256: string;
  gate_4_attempt_claim_sha256: string;
  gate_4_public_report_sha256: string;
  normalized_input_sha256: string;
  enrichment_output_sha256: string;
  gate_4_run_id: string;
}

export interface PackageAttemptClaim {
  schema_version: "1.0";
  claim_type: "canonical_blinded_packet_package_attempt";
  operator_version: "1.0.0";
  execution_class: EvaluationExecutionClass;
  publication_eligible: boolean;
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  claimed_at: string;
  timeout_ms_per_role: typeof EVALUATION_ROLE_TIMEOUT_MS;
  retry_policy: "one_package_attempt_and_one_process_per_role_no_retry";
  gate_3_result_sha256: string;
  execution_contract_sha256: string;
  runtime_ledger_sha256: string;
  llama_cli_sha256: string;
  model_sha256: string;
  sandbox_profile_sha256: string;
  role_system_prompt_sha256: Record<EvaluationClaimRole, string>;
  role_generation_schema_sha256: Record<EvaluationClaimRole, string>;
  strict_postparse_schema_sha256: Record<EvaluationClaimRole, string>;
  consent_attestation_sha256: string;
  execution_readiness_sha256: string;
  sources: PackageAttemptSourceBinding[];
  package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package";
  external_provider_calls: 0;
  external_content_transfer: false;
  claims_boundary: typeof EVALUATION_CLAIMS_BOUNDARY;
}

export interface RoleAttemptClaim {
  schema_version: "1.0";
  claim_type: "canonical_blinded_evaluator_role_attempt";
  runner_version: "1.0.0";
  execution_class: EvaluationExecutionClass;
  publication_eligible: boolean;
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  role: EvaluationClaimRole;
  claimed_at: string;
  timeout_ms: typeof EVALUATION_ROLE_TIMEOUT_MS;
  retry_policy: "one_write_once_role_invocation_no_retry";
  public_package_attempt_claim_sha256: string;
  package_receipt_sha256: string;
  bundle_sha256: string;
  packet_id: string;
  packet_sha256: string;
  execution_contract_sha256: string;
  runtime_ledger_sha256: string;
  llama_cli_sha256: string;
  model_sha256: string;
  role_system_prompt_sha256: string;
  role_generation_schema_sha256: string;
  strict_postparse_schema_sha256: string;
  sandbox_profile_sha256: string;
  external_provider_calls: 0;
  external_content_transfer: false;
  claims_boundary: typeof EVALUATION_CLAIMS_BOUNDARY;
}

export interface PackageAttemptTerminal {
  schema_version: "1.0";
  terminal_type: "canonical_blinded_packet_package_terminal";
  operator_version: "1.0.0";
  execution_class: EvaluationExecutionClass;
  publication_eligible: boolean;
  content_commit: string;
  seal_commit: string;
  public_package_attempt_claim_sha256: string;
  state: "succeeded" | "failed";
  completed_at: string;
  bundle_sha256: string | null;
  bundle_file_sha256: string | null;
  package_receipt_sha256: string | null;
  failure_code: string | null;
  external_provider_calls: 0;
  external_content_transfer: false;
  claims_boundary: typeof EVALUATION_CLAIMS_BOUNDARY;
}

export interface RoleAttemptTerminal {
  schema_version: "1.0";
  terminal_type: "canonical_blinded_evaluator_role_terminal";
  runner_version: "1.0.0";
  execution_class: EvaluationExecutionClass;
  publication_eligible: boolean;
  content_commit: string;
  seal_commit: string;
  role: EvaluationClaimRole;
  public_role_attempt_claim_sha256: string;
  public_package_attempt_claim_sha256: string;
  state: "succeeded" | "failed";
  completed_at: string;
  result_sha256: string | null;
  private_role_claim_sha256: string | null;
  private_run_report_sha256: string | null;
  failure_code: string | null;
  process: {
    invocation_count: 0 | 1;
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
  };
  external_provider_calls: 0;
  external_content_transfer: false;
  claims_boundary: typeof EVALUATION_CLAIMS_BOUNDARY;
}

export interface AuthoritativeClaimRecord<T> {
  path: string;
  bytes: Buffer;
  sha256: string;
  value: T;
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

function exactHashMap(value: unknown): value is Record<EvaluationClaimRole, string> {
  return isObject(value)
    && exactKeys(value, ROLES)
    && ROLES.every((role) => typeof value[role] === "string" && SHA256_RE.test(value[role] as string));
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_TIME_RE.test(value) && Number.isFinite(Date.parse(value));
}

function assertPublicationSafe(value: unknown): void {
  const visit = (candidate: unknown): void => {
    if (typeof candidate === "string" && PRIVATE_TEXT_PATTERNS.some((pattern) => pattern.test(candidate))) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", "authoritative evidence contains private path or credential-shaped text");
    }
    if (Array.isArray(candidate)) candidate.forEach(visit);
    else if (isObject(candidate)) Object.values(candidate).forEach(visit);
  };
  visit(value);
}

export function verifyPackageAttemptClaim(value: unknown): asserts value is PackageAttemptClaim {
  const keys = [
    "schema_version", "claim_type", "operator_version", "execution_class", "publication_eligible", "content_commit", "seal_commit",
    "benchmark_lock_sha256", "claimed_at", "timeout_ms_per_role", "retry_policy", "gate_3_result_sha256",
    "execution_contract_sha256", "runtime_ledger_sha256", "llama_cli_sha256", "model_sha256", "sandbox_profile_sha256",
    "role_system_prompt_sha256", "role_generation_schema_sha256", "strict_postparse_schema_sha256",
    "consent_attestation_sha256", "execution_readiness_sha256", "sources", "package_location_policy",
    "external_provider_calls", "external_content_transfer", "claims_boundary",
  ];
  if (
    !isObject(value)
    || !exactKeys(value, keys)
    || value.schema_version !== "1.0"
    || value.claim_type !== "canonical_blinded_packet_package_attempt"
    || value.operator_version !== "1.0.0"
    || !(["SEALED", "DEV_TEST"] as const).includes(value.execution_class as EvaluationExecutionClass)
    || value.publication_eligible !== (value.execution_class === "SEALED")
    || typeof value.content_commit !== "string" || !COMMIT_RE.test(value.content_commit)
    || typeof value.seal_commit !== "string" || !COMMIT_RE.test(value.seal_commit)
    || typeof value.benchmark_lock_sha256 !== "string" || !SHA256_RE.test(value.benchmark_lock_sha256)
    || !validDate(value.claimed_at)
    || value.timeout_ms_per_role !== EVALUATION_ROLE_TIMEOUT_MS
    || value.retry_policy !== "one_package_attempt_and_one_process_per_role_no_retry"
    || typeof value.gate_3_result_sha256 !== "string" || !SHA256_RE.test(value.gate_3_result_sha256)
    || ["execution_contract_sha256", "runtime_ledger_sha256", "llama_cli_sha256", "model_sha256", "sandbox_profile_sha256", "consent_attestation_sha256", "execution_readiness_sha256"]
      .some((key) => typeof value[key] !== "string" || !SHA256_RE.test(value[key] as string))
    || !exactHashMap(value.role_system_prompt_sha256)
    || !exactHashMap(value.role_generation_schema_sha256)
    || !exactHashMap(value.strict_postparse_schema_sha256)
    || !Array.isArray(value.sources)
    || value.sources.length !== ITEM_IDS.length
    || value.sources.some((source, index) => {
      const sourceKeys = ["item_id", "gate_3_result_sha256", "gate_4_attempt_claim_sha256", "gate_4_public_report_sha256", "normalized_input_sha256", "enrichment_output_sha256", "gate_4_run_id"];
      return !isObject(source)
        || !exactKeys(source, sourceKeys)
        || source.item_id !== ITEM_IDS[index]
        || ["gate_3_result_sha256", "gate_4_attempt_claim_sha256", "gate_4_public_report_sha256", "normalized_input_sha256", "enrichment_output_sha256"]
          .some((key) => typeof source[key] !== "string" || !SHA256_RE.test(source[key] as string))
        || source.gate_3_result_sha256 !== value.gate_3_result_sha256
        || typeof source.gate_4_run_id !== "string"
        || !new RegExp(`^${ITEM_IDS[index]}-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$`).test(source.gate_4_run_id);
    })
    || value.package_location_policy !== "private_evidence_root_outputs_seal_gate4_evaluation_package"
    || value.external_provider_calls !== 0
    || value.external_content_transfer !== false
    || value.claims_boundary !== EVALUATION_CLAIMS_BOUNDARY
  ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "package attempt claim does not match the exact authoritative interface");
  assertPublicationSafe(value);
}

export function verifyRoleAttemptClaim(value: unknown, expectedRole?: EvaluationClaimRole): asserts value is RoleAttemptClaim {
  const keys = [
    "schema_version", "claim_type", "runner_version", "execution_class", "publication_eligible", "content_commit", "seal_commit",
    "benchmark_lock_sha256", "role", "claimed_at", "timeout_ms", "retry_policy", "public_package_attempt_claim_sha256",
    "package_receipt_sha256", "bundle_sha256", "packet_id", "packet_sha256", "execution_contract_sha256",
    "runtime_ledger_sha256", "llama_cli_sha256", "model_sha256", "role_system_prompt_sha256",
    "role_generation_schema_sha256", "strict_postparse_schema_sha256", "sandbox_profile_sha256",
    "external_provider_calls", "external_content_transfer", "claims_boundary",
  ];
  if (
    !isObject(value)
    || !exactKeys(value, keys)
    || value.schema_version !== "1.0"
    || value.claim_type !== "canonical_blinded_evaluator_role_attempt"
    || value.runner_version !== "1.0.0"
    || !(["SEALED", "DEV_TEST"] as const).includes(value.execution_class as EvaluationExecutionClass)
    || value.publication_eligible !== (value.execution_class === "SEALED")
    || typeof value.content_commit !== "string" || !COMMIT_RE.test(value.content_commit)
    || typeof value.seal_commit !== "string" || !COMMIT_RE.test(value.seal_commit)
    || typeof value.benchmark_lock_sha256 !== "string" || !SHA256_RE.test(value.benchmark_lock_sha256)
    || !ROLES.includes(value.role as EvaluationClaimRole)
    || (expectedRole !== undefined && value.role !== expectedRole)
    || !validDate(value.claimed_at)
    || value.timeout_ms !== EVALUATION_ROLE_TIMEOUT_MS
    || value.retry_policy !== "one_write_once_role_invocation_no_retry"
    || ["public_package_attempt_claim_sha256", "package_receipt_sha256", "bundle_sha256", "packet_sha256", "execution_contract_sha256", "runtime_ledger_sha256", "llama_cli_sha256", "model_sha256", "role_system_prompt_sha256", "role_generation_schema_sha256", "strict_postparse_schema_sha256", "sandbox_profile_sha256"]
      .some((key) => typeof value[key] !== "string" || !SHA256_RE.test(value[key] as string))
    || typeof value.packet_id !== "string" || !/^G4-EVAL-[ABJ]-[0-9a-f]{12}$/.test(value.packet_id)
    || value.external_provider_calls !== 0
    || value.external_content_transfer !== false
    || value.claims_boundary !== EVALUATION_CLAIMS_BOUNDARY
  ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "role attempt claim does not match the exact authoritative interface");
  assertPublicationSafe(value);
}

function verifyTerminal(value: unknown, kind: "package" | "role"): void {
  if (!isObject(value)) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "terminal evidence must be an object");
  const commonInvalid = value.schema_version !== "1.0"
    || !(["SEALED", "DEV_TEST"] as const).includes(value.execution_class as EvaluationExecutionClass)
    || value.publication_eligible !== (value.execution_class === "SEALED")
    || typeof value.content_commit !== "string" || !COMMIT_RE.test(value.content_commit)
    || typeof value.seal_commit !== "string" || !COMMIT_RE.test(value.seal_commit)
    || !validDate(value.completed_at)
    || !(["succeeded", "failed"] as const).includes(value.state as "succeeded" | "failed")
    || typeof value.public_package_attempt_claim_sha256 !== "string" || !SHA256_RE.test(value.public_package_attempt_claim_sha256)
    || value.external_provider_calls !== 0
    || value.external_content_transfer !== false
    || value.claims_boundary !== EVALUATION_CLAIMS_BOUNDARY
    || (value.state === "succeeded" ? value.failure_code !== null : typeof value.failure_code !== "string")
    || (typeof value.failure_code === "string" && !/^[A-Z0-9_]{3,64}$/.test(value.failure_code));
  if (commonInvalid) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "terminal evidence common bindings are invalid");
  if (kind === "package") {
    const keys = ["schema_version", "terminal_type", "operator_version", "execution_class", "publication_eligible", "content_commit", "seal_commit", "public_package_attempt_claim_sha256", "state", "completed_at", "bundle_sha256", "bundle_file_sha256", "package_receipt_sha256", "failure_code", "external_provider_calls", "external_content_transfer", "claims_boundary"];
    if (
      !exactKeys(value, keys)
      || value.terminal_type !== "canonical_blinded_packet_package_terminal"
      || value.operator_version !== "1.0.0"
      || (value.state === "succeeded" && ([value.bundle_sha256, value.bundle_file_sha256, value.package_receipt_sha256].some((entry) => typeof entry !== "string" || !SHA256_RE.test(entry))))
      || (value.state === "failed" && (value.bundle_sha256 !== null || value.bundle_file_sha256 !== null || value.package_receipt_sha256 !== null))
    ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "package terminal evidence is invalid");
  } else {
    const keys = ["schema_version", "terminal_type", "runner_version", "execution_class", "publication_eligible", "content_commit", "seal_commit", "role", "public_role_attempt_claim_sha256", "public_package_attempt_claim_sha256", "state", "completed_at", "result_sha256", "private_role_claim_sha256", "private_run_report_sha256", "failure_code", "process", "external_provider_calls", "external_content_transfer", "claims_boundary"];
    const processKeys = ["invocation_count", "timeout_ms", "exit_code", "signal", "timed_out", "output_overflow", "stdout_bytes", "stdout_retained_bytes", "stdout_sha256", "stderr_bytes", "stderr_retained_bytes", "stderr_sha256"];
    const processValue = value.process;
    const emptyStreamSha256 = sha256(Buffer.alloc(0));
    if (
      !exactKeys(value, keys)
      || value.terminal_type !== "canonical_blinded_evaluator_role_terminal"
      || value.runner_version !== "1.0.0"
      || !ROLES.includes(value.role as EvaluationClaimRole)
      || typeof value.public_role_attempt_claim_sha256 !== "string" || !SHA256_RE.test(value.public_role_attempt_claim_sha256)
      || (value.state === "succeeded" ? typeof value.result_sha256 !== "string" || !SHA256_RE.test(value.result_sha256) : value.result_sha256 !== null)
      || (value.state === "succeeded" && (
        typeof value.private_role_claim_sha256 !== "string" || !SHA256_RE.test(value.private_role_claim_sha256)
        || typeof value.private_run_report_sha256 !== "string" || !SHA256_RE.test(value.private_run_report_sha256)
      ))
      || (value.state === "failed" && (
        (value.private_role_claim_sha256 !== null && (typeof value.private_role_claim_sha256 !== "string" || !SHA256_RE.test(value.private_role_claim_sha256)))
        || (value.private_run_report_sha256 !== null && (typeof value.private_run_report_sha256 !== "string" || !SHA256_RE.test(value.private_run_report_sha256)))
      ))
      || !isObject(processValue) || !exactKeys(processValue, processKeys)
      || !([0, 1] as const).includes(processValue.invocation_count as 0 | 1)
      || processValue.timeout_ms !== EVALUATION_ROLE_TIMEOUT_MS
      || (processValue.exit_code !== null && (!Number.isSafeInteger(processValue.exit_code) || (processValue.exit_code as number) < 0))
      || (processValue.signal !== null && (typeof processValue.signal !== "string" || !/^SIG[A-Z0-9]+$/.test(processValue.signal)))
      || typeof processValue.timed_out !== "boolean" || typeof processValue.output_overflow !== "boolean"
      || !Number.isSafeInteger(processValue.stdout_bytes) || (processValue.stdout_bytes as number) < 0
      || !Number.isSafeInteger(processValue.stdout_retained_bytes) || (processValue.stdout_retained_bytes as number) < 0 || (processValue.stdout_retained_bytes as number) > 4_194_304 || (processValue.stdout_retained_bytes as number) > (processValue.stdout_bytes as number)
      || typeof processValue.stdout_sha256 !== "string" || !SHA256_RE.test(processValue.stdout_sha256)
      || !Number.isSafeInteger(processValue.stderr_bytes) || (processValue.stderr_bytes as number) < 0
      || !Number.isSafeInteger(processValue.stderr_retained_bytes) || (processValue.stderr_retained_bytes as number) < 0 || (processValue.stderr_retained_bytes as number) > 4_194_304 || (processValue.stderr_retained_bytes as number) > (processValue.stderr_bytes as number)
      || typeof processValue.stderr_sha256 !== "string" || !SHA256_RE.test(processValue.stderr_sha256)
      || (value.state === "succeeded" && (
        processValue.invocation_count !== 1
        || processValue.exit_code !== 0
        || processValue.signal !== null
        || processValue.timed_out !== false
        || processValue.output_overflow !== false
      ))
      || (processValue.invocation_count === 0 && (
        processValue.exit_code !== null
        || processValue.signal !== null
        || processValue.timed_out !== false
        || processValue.output_overflow !== false
        || processValue.stdout_bytes !== 0
        || processValue.stdout_retained_bytes !== 0
        || processValue.stdout_sha256 !== emptyStreamSha256
        || processValue.stderr_bytes !== 0
        || processValue.stderr_retained_bytes !== 0
        || processValue.stderr_sha256 !== emptyStreamSha256
      ))
    ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", "role terminal evidence is invalid");
  }
  assertPublicationSafe(value);
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function requireExactDirectory(candidate: string, label: string): Promise<string> {
  const info = await lstat(candidate).catch(() => null);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) {
    throw new Gate4EvaluationClaimError("PATH_INVALID", `${label} must be an existing non-symlink directory`);
  }
  const resolved = await realpath(candidate);
  if (resolved !== candidate) throw new Gate4EvaluationClaimError("PATH_INVALID", `${label} must use its exact canonical path`);
  return resolved;
}

async function ensureDirectory(candidate: string, parent: string, label: string): Promise<void> {
  try { await mkdir(candidate, { mode: 0o755 }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw new Gate4EvaluationClaimError("PATH_INVALID", `${label} could not be created safely`);
    }
  }
  const parentReal = await realpath(parent);
  if (parentReal !== parent) throw new Gate4EvaluationClaimError("PATH_INVALID", `${label} parent is not canonical`);
  await requireExactDirectory(candidate, label);
  await fsyncDirectory(parent).catch(() => {
    throw new Gate4EvaluationClaimError("PATH_INVALID", `${label} parent directory could not be synchronized`);
  });
}

async function authoritativeSealDirectory(projectRoot: string, sealCommit: string): Promise<string> {
  if (!path.isAbsolute(projectRoot) || !COMMIT_RE.test(sealCommit)) {
    throw new Gate4EvaluationClaimError("PATH_INVALID", "project root or seal commit is invalid");
  }
  const root = path.resolve(projectRoot);
  await requireExactDirectory(root, "project root");
  const decisions = path.join(root, ...`${PROJECT_RELATIVE_ROOT}/decisions`.split("/"));
  if (!isWithin(root, decisions)) throw new Gate4EvaluationClaimError("PATH_INVALID", "authoritative decisions path escapes the project root");
  await requireExactDirectory(decisions, "authoritative decisions directory");
  const claimRoot = path.join(root, ...GATE4_EVALUATION_ATTEMPT_CLAIMS_RELATIVE_ROOT.split("/"));
  await ensureDirectory(claimRoot, decisions, "Gate 4 evaluation claim root");
  const sealDirectory = path.join(claimRoot, sealCommit);
  await ensureDirectory(sealDirectory, claimRoot, "Gate 4 evaluation seal claim directory");
  return sealDirectory;
}

export function authoritativeEvaluationClaimPath(projectRoot: string, sealCommit: string, name: EvaluationClaimName): string {
  if (!path.isAbsolute(projectRoot) || !COMMIT_RE.test(sealCommit) || !(name === "package" || ROLES.includes(name as EvaluationClaimRole))) {
    throw new Gate4EvaluationClaimError("PATH_INVALID", "authoritative claim path inputs are invalid");
  }
  return path.join(path.resolve(projectRoot), ...GATE4_EVALUATION_ATTEMPT_CLAIMS_RELATIVE_ROOT.split("/"), sealCommit, `${name}.json`);
}

export function authoritativeEvaluationTerminalPath(projectRoot: string, sealCommit: string, name: EvaluationClaimName): string {
  return authoritativeEvaluationClaimPath(projectRoot, sealCommit, name).replace(/\.json$/u, ".terminal.json");
}

async function fsyncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { await handle.sync(); }
  finally { await handle.close(); }
}

async function writeExclusivePublicJson<T>(
  filePath: string,
  value: T,
  alreadyCode: "ATTEMPT_ALREADY_CLAIMED" | "TERMINAL_ALREADY_WRITTEN",
  failureCode: "CLAIM_WRITE_FAILED" | "TERMINAL_WRITE_FAILED",
): Promise<AuthoritativeClaimRecord<T>> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  let handle;
  try {
    handle = await open(filePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o644);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Gate4EvaluationClaimError(alreadyCode, `${path.basename(filePath)} already exists; this sealed attempt cannot be rerun`);
    }
    throw new Gate4EvaluationClaimError(failureCode, `${path.basename(filePath)} could not be claimed exclusively`);
  }
  try {
    await handle.writeFile(bytes);
    await handle.chmod(0o644);
    await handle.sync();
    const info = await handle.stat();
    if (!info.isFile() || info.size !== bytes.byteLength || info.nlink !== 1) {
      throw new Gate4EvaluationClaimError(failureCode, `${path.basename(filePath)} did not persist as one exact regular file`);
    }
  } catch (error) {
    if (error instanceof Gate4EvaluationClaimError) throw error;
    throw new Gate4EvaluationClaimError(failureCode, `${path.basename(filePath)} could not be persisted durably`);
  } finally {
    await handle.close();
  }
  await fsyncDirectory(path.dirname(filePath)).catch(() => {
    throw new Gate4EvaluationClaimError(failureCode, `${path.basename(filePath)} parent directory could not be synchronized`);
  });
  return { path: filePath, bytes, sha256: sha256(bytes), value };
}

export async function writePackageAttemptClaim(projectRoot: string, value: PackageAttemptClaim): Promise<AuthoritativeClaimRecord<PackageAttemptClaim>> {
  verifyPackageAttemptClaim(value);
  const directory = await authoritativeSealDirectory(projectRoot, value.seal_commit);
  return writeExclusivePublicJson(path.join(directory, "package.json"), value, "ATTEMPT_ALREADY_CLAIMED", "CLAIM_WRITE_FAILED");
}

export async function writeRoleAttemptClaim(projectRoot: string, value: RoleAttemptClaim): Promise<AuthoritativeClaimRecord<RoleAttemptClaim>> {
  verifyRoleAttemptClaim(value, value.role);
  const directory = await authoritativeSealDirectory(projectRoot, value.seal_commit);
  return writeExclusivePublicJson(path.join(directory, `${value.role}.json`), value, "ATTEMPT_ALREADY_CLAIMED", "CLAIM_WRITE_FAILED");
}

export async function writePackageAttemptTerminal(projectRoot: string, value: PackageAttemptTerminal): Promise<AuthoritativeClaimRecord<PackageAttemptTerminal>> {
  verifyTerminal(value, "package");
  await verifyTerminalClaimBinding(projectRoot, value);
  const directory = await authoritativeSealDirectory(projectRoot, value.seal_commit);
  return writeExclusivePublicJson(path.join(directory, "package.terminal.json"), value, "TERMINAL_ALREADY_WRITTEN", "TERMINAL_WRITE_FAILED");
}

export async function writeRoleAttemptTerminal(projectRoot: string, value: RoleAttemptTerminal): Promise<AuthoritativeClaimRecord<RoleAttemptTerminal>> {
  verifyTerminal(value, "role");
  await verifyTerminalClaimBinding(projectRoot, value);
  const directory = await authoritativeSealDirectory(projectRoot, value.seal_commit);
  return writeExclusivePublicJson(path.join(directory, `${value.role}.terminal.json`), value, "TERMINAL_ALREADY_WRITTEN", "TERMINAL_WRITE_FAILED");
}

export async function readAuthoritativeAttemptClaim(
  projectRoot: string,
  sealCommit: string,
  name: EvaluationClaimName,
): Promise<AuthoritativeClaimRecord<PackageAttemptClaim | RoleAttemptClaim>> {
  const filePath = authoritativeEvaluationClaimPath(projectRoot, sealCommit, name);
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative attempt claim is missing or is a symlink`);
  let bytes: Buffer;
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > 256 * 1024 || before.nlink !== 1) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative attempt claim is not one bounded regular file`);
    }
    bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || bytes.byteLength !== before.size) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative attempt claim changed while it was read`);
    }
  } finally {
    await handle.close();
  }
  let parsed: unknown;
  try { parsed = parseJsonBytesWithoutDuplicateKeys(bytes); }
  catch { throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative attempt claim is not strict JSON`); }
  if (name === "package") verifyPackageAttemptClaim(parsed);
  else verifyRoleAttemptClaim(parsed, name);
  return {
    path: filePath,
    bytes,
    sha256: sha256(bytes),
    value: parsed as PackageAttemptClaim | RoleAttemptClaim,
  };
}

export async function readAuthoritativeAttemptTerminal(
  projectRoot: string,
  sealCommit: string,
  name: EvaluationClaimName,
): Promise<AuthoritativeClaimRecord<PackageAttemptTerminal | RoleAttemptTerminal>> {
  const filePath = authoritativeEvaluationTerminalPath(projectRoot, sealCommit, name);
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative terminal evidence is missing or is a symlink`);
  let bytes: Buffer;
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > 256 * 1024 || before.nlink !== 1) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative terminal evidence is not one bounded regular file`);
    }
    bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || bytes.byteLength !== before.size) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative terminal evidence changed while it was read`);
    }
  } finally {
    await handle.close();
  }
  let parsed: unknown;
  try { parsed = parseJsonBytesWithoutDuplicateKeys(bytes); }
  catch { throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} authoritative terminal evidence is not strict JSON`); }
  verifyTerminal(parsed, name === "package" ? "package" : "role");
  if (name !== "package" && isObject(parsed) && parsed.role !== name) {
    throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} terminal evidence names a different role`);
  }
  await verifyTerminalClaimBinding(projectRoot, parsed as PackageAttemptTerminal | RoleAttemptTerminal);
  return {
    path: filePath,
    bytes,
    sha256: sha256(bytes),
    value: parsed as PackageAttemptTerminal | RoleAttemptTerminal,
  };
}

async function verifyTerminalClaimBinding(
  projectRoot: string,
  terminal: PackageAttemptTerminal | RoleAttemptTerminal,
): Promise<void> {
  const name: EvaluationClaimName = terminal.terminal_type === "canonical_blinded_packet_package_terminal"
    ? "package"
    : terminal.role;
  const claim = await readAuthoritativeAttemptClaim(projectRoot, terminal.seal_commit, name);
  const claimedAt = (claim.value as PackageAttemptClaim | RoleAttemptClaim).claimed_at;
  if (
    Date.parse(terminal.completed_at) < Date.parse(claimedAt)
    || terminal.content_commit !== claim.value.content_commit
    || terminal.seal_commit !== claim.value.seal_commit
    || terminal.execution_class !== claim.value.execution_class
    || terminal.publication_eligible !== claim.value.publication_eligible
  ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${name} terminal evidence does not chronologically bind its authoritative attempt claim`);
  if (terminal.terminal_type === "canonical_blinded_packet_package_terminal") {
    if (terminal.public_package_attempt_claim_sha256 !== claim.sha256) {
      throw new Gate4EvaluationClaimError("CLAIM_INVALID", "package terminal evidence does not bind the authoritative package claim bytes");
    }
    return;
  }
  const roleClaim = claim.value as RoleAttemptClaim;
  if (
    terminal.public_role_attempt_claim_sha256 !== claim.sha256
    || terminal.public_package_attempt_claim_sha256 !== roleClaim.public_package_attempt_claim_sha256
  ) throw new Gate4EvaluationClaimError("CLAIM_INVALID", `${terminal.role} terminal evidence does not bind its role and package attempt claims`);
}
