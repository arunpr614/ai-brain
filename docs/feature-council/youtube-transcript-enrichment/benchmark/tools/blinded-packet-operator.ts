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
  BLINDED_EVALUATION_TOOL_VERSION,
  CANONICAL_GATE4_ITEM_IDS,
  CLAIMS_BOUNDARY,
  canonicalJsonSha256,
  generateBlindedPackets,
  validateConsentAttestation,
  type BlindedPacketBundle,
  type ConsentAttestation,
  type Gate4PacketSourceItem,
} from "./blinded-evaluation";
import {
  GATE3_RESULT_RELATIVE_PATH,
  bindingFromLockReport,
  verifyGate3EvidenceChain,
} from "./gate3-evidence";
import {
  parseJsonBytesWithoutDuplicateKeys,
  verifyLock,
} from "./verify-lock";
import { verifyPinnedEvaluatorRuntime } from "./local-blinded-evaluator";
import {
  EVALUATION_ROLE_TIMEOUT_MS,
  Gate4EvaluationClaimError,
  writePackageAttemptClaim,
  writePackageAttemptTerminal,
  type PackageAttemptClaim,
} from "./gate4-evaluation-claims";

const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const MODEL_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/benchmark/model`;
const PUBLIC_REPORT_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-public-runs`;
const MAX_JSON_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 128 * 1024;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RUN_ID_RE = /^YT-[0-9]{2}-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$/;

const CANONICAL_FILES = Object.freeze({
  contract: `${MODEL_RELATIVE_ROOT}/EVALUATOR_EXECUTION_CONTRACT.json`,
  runtimeLedger: `${MODEL_RELATIVE_ROOT}/LOCAL_MODEL_RUNTIME_LEDGER.json`,
  authorization: `${MODEL_RELATIVE_ROOT}/LOCAL_DERIVATION_AUTHORIZATION.json`,
  rubric: `${MODEL_RELATIVE_ROOT}/KEY_POINT_RUBRIC.json`,
  evaluatorAPrompt: `${MODEL_RELATIVE_ROOT}/EVALUATOR_A_SYSTEM_PROMPT.txt`,
  evaluatorBPrompt: `${MODEL_RELATIVE_ROOT}/EVALUATOR_B_SYSTEM_PROMPT.txt`,
  adjudicatorPrompt: `${MODEL_RELATIVE_ROOT}/ADJUDICATOR_SYSTEM_PROMPT.txt`,
  evaluationGenerationSchema: `${MODEL_RELATIVE_ROOT}/BLINDED_EVALUATION_GENERATION.schema.json`,
  adjudicationGenerationSchema: `${MODEL_RELATIVE_ROOT}/BLINDED_ADJUDICATION_GENERATION.schema.json`,
  evaluationStrictSchema: `${MODEL_RELATIVE_ROOT}/BLINDED_EVALUATION.schema.json`,
  adjudicationStrictSchema: `${MODEL_RELATIVE_ROOT}/BLINDED_ADJUDICATION.schema.json`,
  publicReportSchema: `${MODEL_RELATIVE_ROOT}/PUBLIC_RUN_REPORT.schema.json`,
  sandboxProfile: `${PROJECT_RELATIVE_ROOT}/spikes/model-harness/deny-network.sb`,
});

type JsonObject = Record<string, unknown>;

export class BlindedPacketOperatorError extends Error {
  constructor(
    public readonly code:
      | "PATH_INVALID"
      | "LOCK_INVALID"
      | "GATE3_INVALID"
      | "GATE4_REPORT_INVALID"
      | "GATE4_PRIVATE_OUTPUT_INVALID"
      | "PACKAGE_ALREADY_CLAIMED"
      | "PACKAGE_ALREADY_EXISTS"
      | "PACKAGE_WRITE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "BlindedPacketOperatorError";
  }
}

export interface GenerateSealedBlindedPacketPackageOptions {
  projectRoot: string;
  privateEvidenceRoot: string;
  gate4PrivateRoot: string;
  runtimeDir: string;
  modelPath: string;
  consent: ConsentAttestation;
}

export interface SealedBlindedPacketPackageReceipt {
  schema_version: "1.0";
  operator_version: typeof BLINDED_EVALUATION_TOOL_VERSION;
  state: "written_exclusively";
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  public_package_attempt_claim_sha256: string;
  packet_generated_at: string;
  consent_attestation_sha256: string;
  execution_readiness_sha256: string;
  bundle_sha256: string;
  packet_sha256: { evaluator_a: string; evaluator_b: string };
  evidence: Array<{
    item_id: string;
    gate_3_result_sha256: string;
    gate_4_attempt_claim_sha256: string;
    gate_4_run_id: string;
    gate_4_public_report_sha256: string;
    normalized_input_sha256: string;
    enrichment_output_sha256: string;
  }>;
  source_selection: "canonical_gate3_handoff_and_fixed_first_write_gate4_paths_only";
  package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package";
  external_provider_calls: 0;
  external_content_transfer: false;
  claims_boundary: typeof CLAIMS_BOUNDARY;
}

export interface SealedBlindedPacketPackageResult {
  directory: string;
  bundle: BlindedPacketBundle;
  receipt: SealedBlindedPacketPackageReceipt;
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
  if (!path.isAbsolute(candidate)) {
    throw new BlindedPacketOperatorError("PATH_INVALID", `${label} must be absolute`);
  }
  const info = await lstat(candidate).catch(() => null);
  if (!info || !info.isDirectory() || info.isSymbolicLink()) {
    throw new BlindedPacketOperatorError("PATH_INVALID", `${label} must be an existing non-symlink directory`);
  }
  return realpath(candidate);
}

function resolveProjectFile(projectRoot: string, relativePath: string): string {
  if (path.isAbsolute(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === ".." || part.includes("\\"))) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "canonical relative path is invalid");
  }
  const absolute = path.join(projectRoot, ...relativePath.split("/"));
  if (!isWithin(projectRoot, absolute) || absolute === projectRoot) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "canonical project path escapes the worktree");
  }
  return absolute;
}

function resolvePrivateRelative(root: string, relativePath: string, label: string): string {
  if (
    path.isAbsolute(relativePath)
    || relativePath.split("/").some((part) => part === "" || part === "." || part === ".." || part.includes("\\"))
  ) throw new BlindedPacketOperatorError("PATH_INVALID", `${label} relative path is invalid`);
  const absolute = path.join(root, ...relativePath.split("/"));
  if (!isWithin(root, absolute) || absolute === root) {
    throw new BlindedPacketOperatorError("PATH_INVALID", `${label} escapes its private root`);
  }
  return absolute;
}

async function readBounded(filePath: string, maximumBytes: number, label: string): Promise<Buffer> {
  const handle = await open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new BlindedPacketOperatorError("PATH_INVALID", `${label} is missing or is a symlink`);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size < 1 || before.size > maximumBytes) {
      throw new BlindedPacketOperatorError("PATH_INVALID", `${label} is not a bounded regular file`);
    }
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.byteLength !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs) {
      throw new BlindedPacketOperatorError("PATH_INVALID", `${label} changed while it was read`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

function parseStrictJson(bytes: Buffer, label: string): unknown {
  try {
    return parseJsonBytesWithoutDuplicateKeys(bytes);
  } catch {
    throw new BlindedPacketOperatorError("PATH_INVALID", `${label} is not strict JSON`);
  }
}

function decodeStrictUtf8(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new BlindedPacketOperatorError("PATH_INVALID", `${label} is not valid UTF-8`);
  }
}

function compilePublicReportSchema(schema: unknown): ValidateFunction {
  try {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    return ajv.compile(schema as AnySchema);
  } catch {
    throw new BlindedPacketOperatorError("GATE4_REPORT_INVALID", "the canonical public-report schema could not be compiled");
  }
}

export function exactGate3PathMap(value: unknown): Map<string, string> {
  if (!isObject(value) || value.schema_version !== "2.1" || value.generator_version !== "1.1.0" || value.state !== "pass" || !Array.isArray(value.items)) {
    throw new BlindedPacketOperatorError("GATE3_INVALID", "the canonical Gate 3 result identity is invalid");
  }
  const items = value.items;
  if (
    items.length !== 5
    || items.some((item, index) => !isObject(item) || item.item_id !== CANONICAL_GATE4_ITEM_IDS[index])
  ) throw new BlindedPacketOperatorError("GATE3_INVALID", "the Gate 3 result does not contain the exact ordered five-item denominator");
  const result = new Map<string, string>();
  for (const item of items) {
    if (!isObject(item) || typeof item.item_id !== "string" || typeof item.model_input_private_root_relative_path !== "string") {
      throw new BlindedPacketOperatorError("GATE3_INVALID", "a Gate 3 model-input path is unavailable");
    }
    result.set(item.item_id, item.model_input_private_root_relative_path);
  }
  return result;
}

function requirePublicReport(
  value: unknown,
  validate: ValidateFunction,
  expected: {
    itemId: string;
    inputSha256: string;
    gate3DocumentSha256: string;
    contentCommit: string;
    sealCommit: string;
    runtimeLedgerSha256: string;
  },
): JsonObject {
  if (!validate(value) || !isObject(value)) {
    throw new BlindedPacketOperatorError("GATE4_REPORT_INVALID", `${expected.itemId} public report violates its sealed schema`);
  }
  const input = value.input;
  const handoff = value.gate_3_handoff;
  const runtime = value.runtime;
  const validation = value.validation;
  const cost = value.cost;
  const privacy = value.privacy;
  const retention = value.retention;
  const attempts = value.attempts;
  if (
    value.schema_version !== "1.1"
    || value.harness_version !== "1.2.0"
    || value.execution_class !== "SEALED"
    || value.publication_eligible !== true
    || value.run_state !== "succeeded"
    || value.item_id !== expected.itemId
    || value.candidate_id !== "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"
    || typeof value.run_id !== "string"
    || !RUN_ID_RE.test(value.run_id)
    || !value.run_id.startsWith(`${expected.itemId}-`)
    || !isObject(input)
    || input.normalized_transcript_sha256 !== expected.inputSha256
    || !isObject(handoff)
    || handoff.result_document_sha256 !== expected.gate3DocumentSha256
    || handoff.content_commit !== expected.contentCommit
    || handoff.seal_commit !== expected.sealCommit
    || handoff.git_bound !== true
    || handoff.model_input_normalized_output_file_sha256 !== expected.inputSha256
    || !isObject(runtime)
    || runtime.ledger_sha256 !== expected.runtimeLedgerSha256
    || runtime.llama_cli_sha256 !== "b8c1891d697f72c1e9c05d0613b4f3d091e388acc2c4e1afa535c19df5d50fc3"
    || runtime.model_sha256 !== "d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785"
    || runtime.post_execution_input_reverification !== true
    || !Array.isArray(attempts)
    || attempts.length < 1
    || attempts.length > 2
    || !isObject(attempts[0])
    || attempts[0].attempt !== 1
    || attempts[0].kind !== "initial"
    || (attempts.length === 2 && (!isObject(attempts[1]) || attempts[1].attempt !== 2 || attempts[1].kind !== "sealed_format_only_retry"))
    || !isObject(attempts[attempts.length - 1])
    || attempts[attempts.length - 1].semantic_reference_valid !== true
    || !isObject(validation)
    || typeof validation.output_sha256 !== "string"
    || !SHA256_RE.test(validation.output_sha256)
    || validation.schema_valid !== true
    || validation.semantic_reference_valid !== true
    || validation.invalid_reference_count !== 0
    || validation.unsafe_markup_count !== 0
    || validation.prompt_identity_stable !== true
    || validation.resource_measurement_complete !== true
    || !isObject(cost)
    || cost.incremental_external_service_usd !== 0
    || cost.paid_requests !== 0
    || cost.provider_requests !== 0
    || !isObject(privacy)
    || privacy.network_denied !== true
    || privacy.external_transcript_transfer !== false
    || privacy.server_started !== false
    || privacy.remote_model_resolution !== false
    || !isObject(retention)
    || retention.raw_output_private_only !== true
    || retention.normalized_transcript_copied !== false
    || value.failure !== null
  ) throw new BlindedPacketOperatorError("GATE4_REPORT_INVALID", `${expected.itemId} public report is not one successful fixed sealed run`);
  return value;
}

export function verifyGate4AttemptClaim(value: unknown, expected: {
  itemId: string;
  contentCommit: string;
  sealCommit: string;
  gate3DocumentSha256: string;
  inputSha256: string;
}): void {
  const requiredKeys = [
    "schema_version",
    "claim_type",
    "harness_version",
    "execution_class",
    "content_commit",
    "seal_commit",
    "item_id",
    "gate_3_result_document_sha256",
    "normalized_transcript_sha256",
  ];
  if (
    !isObject(value)
    || Object.keys(value).length !== requiredKeys.length
    || requiredKeys.some((key) => !Object.hasOwn(value, key))
    || value.schema_version !== "1.0"
    || value.claim_type !== "canonical_model_harness_attempt"
    || value.harness_version !== "1.2.0"
    || value.execution_class !== "SEALED"
    || value.content_commit !== expected.contentCommit
    || value.seal_commit !== expected.sealCommit
    || value.item_id !== expected.itemId
    || value.gate_3_result_document_sha256 !== expected.gate3DocumentSha256
    || value.normalized_transcript_sha256 !== expected.inputSha256
  ) throw new BlindedPacketOperatorError("GATE4_REPORT_INVALID", `${expected.itemId} canonical first-attempt claim is missing or does not match its sealed inputs`);
}

export function canonicalBlindedPacketPackagePath(privateEvidenceRoot: string, sealCommit: string): string {
  if (!path.isAbsolute(privateEvidenceRoot) || !/^[0-9a-f]{40}$/.test(sealCommit)) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "canonical packet package root or seal commit is invalid");
  }
  return path.join(path.resolve(privateEvidenceRoot), "outputs", sealCommit, "gate4-evaluation", "package");
}

async function assertExactGate4PrivateLayout(root: string): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isDirectory() && !entry.isSymbolicLink()).map((entry) => entry.name).sort();
  const expected = [...CANONICAL_GATE4_ITEM_IDS].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected) || entries.some((entry) => !entry.isDirectory() || entry.isSymbolicLink())) {
    throw new BlindedPacketOperatorError("GATE4_PRIVATE_OUTPUT_INVALID", "the Gate 4 private root must contain exactly one fixed directory per canonical item");
  }
}

async function readFixedGate4Output(root: string, itemId: string, runId: string, expectedSha256: string): Promise<Buffer> {
  const itemDirectory = path.join(root, itemId);
  const itemInfo = await lstat(itemDirectory).catch(() => null);
  if (!itemInfo || !itemInfo.isDirectory() || itemInfo.isSymbolicLink() || await realpath(itemDirectory) !== itemDirectory) {
    throw new BlindedPacketOperatorError("GATE4_PRIVATE_OUTPUT_INVALID", `${itemId} fixed private directory is invalid`);
  }
  const children = await readdir(itemDirectory, { withFileTypes: true });
  if (children.length !== 1 || children[0].name !== runId || !children[0].isDirectory() || children[0].isSymbolicLink()) {
    throw new BlindedPacketOperatorError("GATE4_PRIVATE_OUTPUT_INVALID", `${itemId} must contain exactly the public report's first write-once run ID`);
  }
  const runDirectory = path.join(itemDirectory, runId);
  if (await realpath(runDirectory) !== runDirectory) {
    throw new BlindedPacketOperatorError("GATE4_PRIVATE_OUTPUT_INVALID", `${itemId} run directory is not canonical`);
  }
  const outputBytes = await readBounded(path.join(runDirectory, "output.json"), MAX_JSON_BYTES, `${itemId} private output`);
  if (sha256(outputBytes) !== expectedSha256) {
    throw new BlindedPacketOperatorError("GATE4_PRIVATE_OUTPUT_INVALID", `${itemId} private output bytes do not match the canonical public report`);
  }
  return outputBytes;
}

async function createPrivatePackageDirectory(projectRoot: string, privateEvidenceRoot: string, sealCommit: string): Promise<string> {
  const sealRoot = path.join(privateEvidenceRoot, "outputs", sealCommit);
  const verifiedSealRoot = await requireDirectory(sealRoot, "canonical private seal root");
  if (verifiedSealRoot !== sealRoot || isWithin(projectRoot, verifiedSealRoot)) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "canonical private seal root is not an exact outside-worktree directory");
  }
  const evaluationRoot = path.join(sealRoot, "gate4-evaluation");
  try { await mkdir(evaluationRoot, { mode: 0o700 }); }
  catch {
    const info = await lstat(evaluationRoot).catch(() => null);
    if (!info || !info.isDirectory() || info.isSymbolicLink() || await realpath(evaluationRoot) !== evaluationRoot) {
      throw new BlindedPacketOperatorError("PACKAGE_ALREADY_EXISTS", "canonical Gate 4 evaluation root cannot be claimed safely");
    }
  }
  const evaluationInfo = await lstat(evaluationRoot);
  if (!evaluationInfo.isDirectory() || evaluationInfo.isSymbolicLink() || await realpath(evaluationRoot) !== evaluationRoot) {
    throw new BlindedPacketOperatorError("PACKAGE_ALREADY_EXISTS", "canonical Gate 4 evaluation root is not an exact private directory");
  }
  await chmod(evaluationRoot, 0o700);
  await fsyncDirectory(sealRoot, "private seal root");
  const resolved = canonicalBlindedPacketPackagePath(privateEvidenceRoot, sealCommit);
  try { await mkdir(resolved, { mode: 0o700 }); }
  catch { throw new BlindedPacketOperatorError("PACKAGE_ALREADY_EXISTS", "private packet package directory already exists or could not be claimed exclusively"); }
  await chmod(resolved, 0o700);
  await fsyncDirectory(evaluationRoot, "private evaluation root");
  return resolved;
}

async function fsyncDirectory(directory: string, label: string): Promise<void> {
  const handle = await open(directory, constants.O_RDONLY | constants.O_NOFOLLOW).catch(() => null);
  if (!handle) throw new BlindedPacketOperatorError("PACKAGE_WRITE_FAILED", `${label} could not be opened for durable synchronization`);
  try { await handle.sync(); }
  catch { throw new BlindedPacketOperatorError("PACKAGE_WRITE_FAILED", `${label} could not be synchronized durably`); }
  finally { await handle.close(); }
}

async function writeExclusive(filePath: string, value: unknown): Promise<void> {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  const handle = await open(
    filePath,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  ).catch(() => null);
  if (!handle) throw new BlindedPacketOperatorError("PACKAGE_WRITE_FAILED", `fixed package file ${path.basename(filePath)} already exists`);
  try {
    await handle.writeFile(bytes);
    await handle.chmod(0o600);
    await handle.sync();
    const info = await handle.stat();
    if (!info.isFile() || info.size !== bytes.byteLength || info.nlink !== 1) {
      throw new BlindedPacketOperatorError("PACKAGE_WRITE_FAILED", `fixed package file ${path.basename(filePath)} did not persist exactly`);
    }
  } finally {
    await handle.close();
  }
  await fsyncDirectory(path.dirname(filePath), "private packet package directory");
}

export async function generateSealedBlindedPacketPackage(
  options: GenerateSealedBlindedPacketPackageOptions,
): Promise<SealedBlindedPacketPackageResult> {
  let consent: ConsentAttestation;
  try {
    consent = validateConsentAttestation(options.consent, new Date());
  } catch {
    throw new BlindedPacketOperatorError(
      "PACKAGE_WRITE_FAILED",
      "affirmative consent must be exact, unwithdrawn, bounded-transfer authorized, and no later than preclaim validation",
    );
  }
  const projectRoot = await requireDirectory(options.projectRoot, "project root");
  const privateEvidenceRoot = await requireDirectory(options.privateEvidenceRoot, "private Gate 3 evidence root");
  const gate4PrivateRoot = await requireDirectory(options.gate4PrivateRoot, "private Gate 4 output root");
  if (isWithin(projectRoot, privateEvidenceRoot) || isWithin(projectRoot, gate4PrivateRoot)) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "private evidence and output roots must be outside the worktree");
  }

  let lockReport;
  try { lockReport = verifyLock({ repoRoot: projectRoot }); }
  catch { throw new BlindedPacketOperatorError("LOCK_INVALID", "the canonical benchmark lock did not verify at the current HEAD"); }
  const binding = bindingFromLockReport(lockReport);

  const canonicalBytes = await Promise.all(Object.entries(CANONICAL_FILES).map(async ([key, relative]) => [
    key,
    await readBounded(resolveProjectFile(projectRoot, relative), key.endsWith("Prompt") || key === "sandboxProfile" ? MAX_TEXT_BYTES : MAX_JSON_BYTES, relative),
  ] as const));
  const files = new Map(canonicalBytes);
  const get = (key: keyof typeof CANONICAL_FILES): Buffer => files.get(key)!;
  const runtimeLedgerSha256 = sha256(get("runtimeLedger"));
  const runtimeLedger = parseStrictJson(get("runtimeLedger"), "runtime ledger");
  const runtimeIdentity = await verifyPinnedEvaluatorRuntime(options.runtimeDir, options.modelPath, runtimeLedger).catch(() => {
    throw new BlindedPacketOperatorError("LOCK_INVALID", "the actual local runtime or model does not match the pinned evaluator ledger");
  });
  if (isWithin(projectRoot, path.dirname(runtimeIdentity.llamaCliPath)) || isWithin(projectRoot, runtimeIdentity.modelRealPath)) {
    throw new BlindedPacketOperatorError("PATH_INVALID", "runtime and model artifacts must remain outside the benchmark worktree");
  }
  const contractForSchemaBinding = parseStrictJson(get("contract"), "evaluator execution contract");
  if (!isObject(contractForSchemaBinding) || !Array.isArray(contractForSchemaBinding.role_invocations)) {
    throw new BlindedPacketOperatorError("LOCK_INVALID", "evaluator contract role bindings are unavailable");
  }
  for (const invocation of contractForSchemaBinding.role_invocations) {
    if (!isObject(invocation) || typeof invocation.strict_postparse_schema_sha256 !== "string") {
      throw new BlindedPacketOperatorError("LOCK_INVALID", "a strict postparse schema binding is unavailable");
    }
    const observed = sha256(get(invocation.role === "adjudicator" ? "adjudicationStrictSchema" : "evaluationStrictSchema"));
    if (observed !== invocation.strict_postparse_schema_sha256) {
      throw new BlindedPacketOperatorError("LOCK_INVALID", `${String(invocation.role)} strict postparse schema bytes do not match the evaluator contract`);
    }
  }
  for (const executable of ["/usr/bin/sandbox-exec", "/usr/bin/time"]) {
    const info = await lstat(executable).catch(() => null);
    if (!info || !info.isFile() || info.isSymbolicLink() || (info.mode & 0o111) === 0) {
      throw new BlindedPacketOperatorError("LOCK_INVALID", `${executable} is unavailable for the sealed fresh-process posture`);
    }
  }
  const publicReportValidate = compilePublicReportSchema(parseStrictJson(get("publicReportSchema"), "public report schema"));

  const gate3ResultBytes = await readBounded(
    resolveProjectFile(projectRoot, GATE3_RESULT_RELATIVE_PATH),
    MAX_JSON_BYTES,
    "canonical Gate 3 result",
  );
  const gate3DocumentSha256 = sha256(gate3ResultBytes);
  const gate3Paths = exactGate3PathMap(parseStrictJson(gate3ResultBytes, "canonical Gate 3 result"));
  await assertExactGate4PrivateLayout(gate4PrivateRoot);

  const items: Gate4PacketSourceItem[] = [];
  for (const itemId of CANONICAL_GATE4_ITEM_IDS) {
    const normalizedPath = resolvePrivateRelative(privateEvidenceRoot, gate3Paths.get(itemId)!, `${itemId} Gate 3 model input`);
    const verifiedGate3 = await verifyGate3EvidenceChain({
      projectRoot,
      privateEvidenceRoot,
      admittedNormalizedTranscriptPath: normalizedPath,
      itemId,
      binding,
      requireGitBound: true,
    }).catch(() => {
      throw new BlindedPacketOperatorError("GATE3_INVALID", `${itemId} failed the complete committed Gate 3 evidence-chain verification`);
    });
    if (verifiedGate3.documentSha256 !== gate3DocumentSha256 || verifiedGate3.gitBound !== true) {
      throw new BlindedPacketOperatorError("GATE3_INVALID", `${itemId} Gate 3 document or Git binding changed during packet derivation`);
    }
    const normalizedBytes = await readBounded(normalizedPath, MAX_JSON_BYTES, `${itemId} exact normalized input`);
    const inputSha256 = sha256(normalizedBytes);
    if (inputSha256 !== verifiedGate3.item.model_input_normalized_output_file_sha256) {
      throw new BlindedPacketOperatorError("GATE3_INVALID", `${itemId} normalized bytes differ from the verified Gate 3 handoff`);
    }

    const attemptClaimBytes = await readBounded(
      resolveProjectFile(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.attempt-claim.json`),
      MAX_JSON_BYTES,
      `${itemId} canonical first-attempt claim`,
    );
    verifyGate4AttemptClaim(parseStrictJson(attemptClaimBytes, `${itemId} canonical first-attempt claim`), {
      itemId,
      contentCommit: binding.contentCommit,
      sealCommit: binding.sealCommit,
      gate3DocumentSha256,
      inputSha256,
    });

    const reportBytes = await readBounded(
      resolveProjectFile(projectRoot, `${PUBLIC_REPORT_RELATIVE_ROOT}/${itemId}.json`),
      MAX_JSON_BYTES,
      `${itemId} canonical public run report`,
    );
    const report = requirePublicReport(parseStrictJson(reportBytes, `${itemId} public report`), publicReportValidate, {
      itemId,
      inputSha256,
      gate3DocumentSha256,
      contentCommit: binding.contentCommit,
      sealCommit: binding.sealCommit,
      runtimeLedgerSha256,
    });
    const validation = report.validation as JsonObject;
    const runId = report.run_id as string;
    const outputBytes = await readFixedGate4Output(gate4PrivateRoot, itemId, runId, validation.output_sha256 as string);
    items.push({
      item_id: itemId,
      normalized_transcript_bytes: decodeStrictUtf8(normalizedBytes, `${itemId} normalized transcript`),
      enrichment_output_bytes: decodeStrictUtf8(outputBytes, `${itemId} enrichment output`),
      gate_3_result_sha256: gate3DocumentSha256,
      gate_4_attempt_claim_sha256: sha256(attemptClaimBytes),
      gate_4_public_report_sha256: sha256(reportBytes),
      gate_4_run_id: runId,
    });
  }

  const executionReadiness = {
    pinned_runtime_verified: true as const,
    pinned_model_verified: true as const,
    role_prompt_hashes_verified: true as const,
    deny_network_sandbox_available: true as const,
    fresh_process_isolation_available: true as const,
    packet_only_file_binding_available: true as const,
    local_private_storage_available: true as const,
    external_content_transfer: false as const,
    result_attestation_verification_available: true as const,
    incremental_spend_usd: 0 as const,
  };
  const inferenceSettings = contractForSchemaBinding.inference_settings;
  if (!isObject(inferenceSettings) || inferenceSettings.timeout_ms_per_role !== EVALUATION_ROLE_TIMEOUT_MS) {
    throw new BlindedPacketOperatorError("LOCK_INVALID", "the evaluator child timeout is not frozen to 1,800,000 milliseconds");
  }
  const packetGeneratedAt = new Date().toISOString();
  const contractSha256 = canonicalJsonSha256(contractForSchemaBinding);
  const roleSystemPromptSha256 = {
    evaluator_a: sha256(get("evaluatorAPrompt")),
    evaluator_b: sha256(get("evaluatorBPrompt")),
    adjudicator: sha256(get("adjudicatorPrompt")),
  };
  const roleGenerationSchemaSha256 = {
    evaluator_a: sha256(get("evaluationGenerationSchema")),
    evaluator_b: sha256(get("evaluationGenerationSchema")),
    adjudicator: sha256(get("adjudicationGenerationSchema")),
  };
  const strictPostparseSchemaSha256 = {
    evaluator_a: sha256(get("evaluationStrictSchema")),
    evaluator_b: sha256(get("evaluationStrictSchema")),
    adjudicator: sha256(get("adjudicationStrictSchema")),
  };
  const packageClaimValue: PackageAttemptClaim = {
    schema_version: "1.0",
    claim_type: "canonical_blinded_packet_package_attempt",
    operator_version: "1.0.0",
    execution_class: "SEALED",
    publication_eligible: true,
    content_commit: binding.contentCommit,
    seal_commit: binding.sealCommit,
    benchmark_lock_sha256: binding.lockSha256,
    claimed_at: packetGeneratedAt,
    timeout_ms_per_role: EVALUATION_ROLE_TIMEOUT_MS,
    retry_policy: "one_package_attempt_and_one_process_per_role_no_retry",
    gate_3_result_sha256: gate3DocumentSha256,
    execution_contract_sha256: contractSha256,
    runtime_ledger_sha256: runtimeLedgerSha256,
    llama_cli_sha256: runtimeIdentity.llamaCliSha256,
    model_sha256: runtimeIdentity.modelSha256,
    sandbox_profile_sha256: sha256(get("sandboxProfile")),
    role_system_prompt_sha256: roleSystemPromptSha256,
    role_generation_schema_sha256: roleGenerationSchemaSha256,
    strict_postparse_schema_sha256: strictPostparseSchemaSha256,
    consent_attestation_sha256: canonicalJsonSha256(consent),
    execution_readiness_sha256: canonicalJsonSha256(executionReadiness),
    sources: items.map((item) => ({
      item_id: item.item_id,
      gate_3_result_sha256: item.gate_3_result_sha256,
      gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
      gate_4_public_report_sha256: item.gate_4_public_report_sha256,
      normalized_input_sha256: sha256(Buffer.from(item.normalized_transcript_bytes, "utf8")),
      enrichment_output_sha256: sha256(Buffer.from(item.enrichment_output_bytes, "utf8")),
      gate_4_run_id: item.gate_4_run_id,
    })),
    package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package",
    external_provider_calls: 0,
    external_content_transfer: false,
    claims_boundary: CLAIMS_BOUNDARY,
  };
  let packageClaim;
  try { packageClaim = await writePackageAttemptClaim(projectRoot, packageClaimValue); }
  catch (error) {
    if (error instanceof Gate4EvaluationClaimError && error.code === "ATTEMPT_ALREADY_CLAIMED") {
      throw new BlindedPacketOperatorError("PACKAGE_ALREADY_CLAIMED", "the authoritative package attempt is already claimed; copied private roots cannot create another package");
    }
    throw new BlindedPacketOperatorError("PACKAGE_WRITE_FAILED", "the authoritative package attempt claim could not be written safely");
  }

  try {
    const directory = await createPrivatePackageDirectory(projectRoot, privateEvidenceRoot, binding.sealCommit);
    const bundle = generateBlindedPackets({
      content_commit: binding.contentCommit,
      seal_commit: binding.sealCommit,
      benchmark_lock_sha256: binding.lockSha256,
      package_attempt_claim_sha256: packageClaim.sha256,
      packet_generated_at: packetGeneratedAt,
      execution_contract: contractForSchemaBinding,
      runtime_ledger_json: decodeStrictUtf8(get("runtimeLedger"), "runtime ledger"),
      sandbox_profile_text: decodeStrictUtf8(get("sandboxProfile"), "sandbox profile"),
      role_system_prompts: {
        evaluator_a: decodeStrictUtf8(get("evaluatorAPrompt"), "evaluator A prompt"),
        evaluator_b: decodeStrictUtf8(get("evaluatorBPrompt"), "evaluator B prompt"),
        adjudicator: decodeStrictUtf8(get("adjudicatorPrompt"), "adjudicator prompt"),
      },
      role_generation_schemas: {
        evaluator_a: decodeStrictUtf8(get("evaluationGenerationSchema"), "evaluator A generation schema"),
        evaluator_b: decodeStrictUtf8(get("evaluationGenerationSchema"), "evaluator B generation schema"),
        adjudicator: decodeStrictUtf8(get("adjudicationGenerationSchema"), "adjudication generation schema"),
      },
      authorization: parseStrictJson(get("authorization"), "authorization ledger"),
      rubric: parseStrictJson(get("rubric"), "key-point rubric"),
      consent,
      execution_readiness: executionReadiness,
      items,
    });
    const receipt: SealedBlindedPacketPackageReceipt = {
      schema_version: "1.0",
      operator_version: BLINDED_EVALUATION_TOOL_VERSION,
      state: "written_exclusively",
      content_commit: bundle.content_commit,
      seal_commit: bundle.seal_commit,
      benchmark_lock_sha256: bundle.benchmark_lock_sha256,
      public_package_attempt_claim_sha256: packageClaim.sha256,
      packet_generated_at: bundle.packet_generated_at,
      consent_attestation_sha256: bundle.consent_attestation_sha256,
      execution_readiness_sha256: bundle.execution_readiness_sha256,
      bundle_sha256: canonicalJsonSha256(bundle),
      packet_sha256: {
        evaluator_a: bundle.packets.evaluator_a.packet_sha256,
        evaluator_b: bundle.packets.evaluator_b.packet_sha256,
      },
      evidence: bundle.coordinator_manifest.items.map((item) => ({
        item_id: item.item_id,
        gate_3_result_sha256: item.gate_3_result_sha256,
        gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
        gate_4_run_id: item.gate_4_run_id,
        gate_4_public_report_sha256: item.gate_4_public_report_sha256,
        normalized_input_sha256: item.normalized_input_sha256,
        enrichment_output_sha256: item.enrichment_output_sha256,
      })),
      source_selection: "canonical_gate3_handoff_and_fixed_first_write_gate4_paths_only",
      package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package",
      external_provider_calls: 0,
      external_content_transfer: false,
      claims_boundary: CLAIMS_BOUNDARY,
    };

    await writeExclusive(path.join(directory, "evaluator-a.packet.json"), bundle.packets.evaluator_a.packet);
    await writeExclusive(path.join(directory, "evaluator-b.packet.json"), bundle.packets.evaluator_b.packet);
    await writeExclusive(path.join(directory, "consent-attestation.json"), consent);
    await writeExclusive(path.join(directory, "execution-readiness.json"), executionReadiness);
    await writeExclusive(path.join(directory, "coordinator.bundle.json"), bundle);
    await writeExclusive(path.join(directory, "generation-receipt.json"), receipt);
    const bundleBytes = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`, "utf8");
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    await writePackageAttemptTerminal(projectRoot, {
      schema_version: "1.0",
      terminal_type: "canonical_blinded_packet_package_terminal",
      operator_version: "1.0.0",
      execution_class: "SEALED",
      publication_eligible: true,
      content_commit: bundle.content_commit,
      seal_commit: bundle.seal_commit,
      public_package_attempt_claim_sha256: packageClaim.sha256,
      state: "succeeded",
      completed_at: new Date().toISOString(),
      bundle_sha256: canonicalJsonSha256(bundle),
      bundle_file_sha256: sha256(bundleBytes),
      package_receipt_sha256: sha256(receiptBytes),
      failure_code: null,
      external_provider_calls: 0,
      external_content_transfer: false,
      claims_boundary: CLAIMS_BOUNDARY,
    });
    return { directory, bundle, receipt };
  } catch (error) {
    const failureCode = error instanceof BlindedPacketOperatorError
      ? error.code
      : error instanceof Gate4EvaluationClaimError
        ? error.code
        : "PACKAGE_POST_CLAIM_FAILED";
    await writePackageAttemptTerminal(projectRoot, {
      schema_version: "1.0",
      terminal_type: "canonical_blinded_packet_package_terminal",
      operator_version: "1.0.0",
      execution_class: "SEALED",
      publication_eligible: true,
      content_commit: binding.contentCommit,
      seal_commit: binding.sealCommit,
      public_package_attempt_claim_sha256: packageClaim.sha256,
      state: "failed",
      completed_at: new Date().toISOString(),
      bundle_sha256: null,
      bundle_file_sha256: null,
      package_receipt_sha256: null,
      failure_code: failureCode,
      external_provider_calls: 0,
      external_content_transfer: false,
      claims_boundary: CLAIMS_BOUNDARY,
    }).catch(() => undefined);
    throw error;
  }
}
