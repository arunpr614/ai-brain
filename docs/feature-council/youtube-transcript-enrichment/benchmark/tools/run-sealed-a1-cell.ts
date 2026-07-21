#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  constants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { A1Attestation } from "../../spikes/a1-harness/attestation";
import {
  parseLockedA1Attestation,
  sha256Hex,
} from "../../spikes/a1-harness/attestation";
import {
  A1_PRIVATE_SCORER_LIMITS,
  type A1PrivateScorerOptions,
  type A1PrivateScoreSummary,
  evaluatePrivateA1,
  parseA1PrivateScorerOptionsBytes,
  serializeA1PrivateScore,
} from "./score-private-a1";
import { preflightSubtitleBytes } from "./subtitle-preflight";
import {
  A1_DATABASE_MAX_BYTES,
  validateA1Database,
} from "./validate-a1-database";
import { validateA1SealedAuthoritySemantics } from "./validate-a1-sealed-authority";
import {
  type LockVerificationReport,
  parseJsonBytesWithoutDuplicateKeys,
  parseLockJsonBytes,
  parseReferenceLedgerJsonBytes,
  verifyLock,
} from "./verify-lock";

export const A1_OPERATOR_VERSION = "1.1.0";
export const A1_CHILD_TIMEOUT_MS = 120_000;
export const A1_EXECUTION_CONTRACT_IDENTITY_SHA256 =
  "7601a0335c32c230ad13311ff88475102db52112a4f13c437742e13173a81f3e";
export const A1_ATTEMPT_UNIQUENESS_SCOPE = "authoritative_worktree_only";
export const A1_ATTEMPT_RESIDUAL_LIMITATION =
  "copied_repositories_malicious_claim_deletion_or_same_user_forgery_require_procedural_external_audit";

const BENCHMARK_ROOT = "docs/feature-council/youtube-transcript-enrichment/benchmark";
const DECISIONS_ROOT = "docs/feature-council/youtube-transcript-enrichment/decisions";
const ATTEMPT_CLAIMS_ROOT = `${DECISIONS_ROOT}/a1-attempt-claims`;
const ATTEMPT_TERMINALS_ROOT = `${DECISIONS_ROOT}/a1-attempt-terminals`;
const LEDGER_PATH = `${BENCHMARK_ROOT}/REFERENCE_LEDGER.json`;
const A1_EXECUTION_CONTRACT_PATH = `${BENCHMARK_ROOT}/model/A1_EXECUTION_CONTRACT.json`;
const HARNESS_CLI_PATH =
  "docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness/cli.ts";
const SCORER_CLI_PATH = `${BENCHMARK_ROOT}/tools/score-private-a1.ts`;
const SANDBOX_EXECUTABLE = "/usr/bin/sandbox-exec";
const ENV_EXECUTABLE = "/usr/bin/env";
const NODE_EXECUTABLE = "/opt/homebrew/opt/node@22/bin/node";
const SEALED_PATH =
  "/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin";
const SANDBOX_BASE_PROFILE =
  "(version 1) (allow default) (deny network*) (deny file-read*) (deny file-write*)";
const MAX_REPORT_BYTES = 2_000_000;
const MAX_DATABASE_BYTES = A1_DATABASE_MAX_BYTES;
const MAX_INPUT_BYTES = 2_000_000;
const MAX_ATTESTATION_BYTES = 256_000;
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const CURRENT_PRODUCT_GAP_CODES = Object.freeze([
  "attestation_not_collected_or_enforced_by_current_service",
  "permissive_parser_requires_harness_preflight",
  "retention_and_derivation_not_runtime_enforced",
  "legacy_recovery_queue_coupled_to_youtube_item_insert",
  "normalized_contract_not_fully_persisted",
] as const);

export type A1ExecutionBoundary = "sealed_default_dependencies" | "development_test_only";

export const A1_PRIMARY_ITEM_IDS = Object.freeze([
  "YT-01", "YT-02", "YT-03", "YT-04", "YT-05", "YT-06", "YT-07", "YT-08", "YT-09",
] as const);
export const A1_POSITIVE_ITEM_IDS = Object.freeze([
  "YT-01", "YT-02", "YT-07", "YT-08", "YT-09",
] as const);
export const A1_REJECTION_ITEM_IDS = Object.freeze([
  "YT-03", "YT-04", "YT-05", "YT-06",
] as const);

export type A1ItemId = (typeof A1_PRIMARY_ITEM_IDS)[number];
export type A1PositiveItemId = (typeof A1_POSITIVE_ITEM_IDS)[number];
export type A1OperatorStage = "gate1-primary" | "gate3-repeat";
export type A1ExpectedOutcome =
  | "eligible_pass"
  | "supported_class_safe_rejection"
  | "structural_safe_rejection";

export interface A1OperatorReceipt {
  schema_version: "1.1";
  operator_version: typeof A1_OPERATOR_VERSION;
  seal: {
    content_commit: string;
    seal_commit: string;
    lock_sha256: string;
  };
  cell: {
    stage: A1OperatorStage;
    item_id: A1ItemId;
    expected_outcome: A1ExpectedOutcome;
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

export interface A1AttemptClaim {
  schema_version: "1.0";
  operator_version: typeof A1_OPERATOR_VERSION;
  publication_eligible: boolean;
  seal: A1OperatorReceipt["seal"];
  cell: A1OperatorReceipt["cell"];
  execution_contract: {
    identity_sha256: typeof A1_EXECUTION_CONTRACT_IDENTITY_SHA256;
    execution_boundary: A1ExecutionBoundary;
    private_evidence_binding:
      "sealed_source_and_anchor_authorities_no_path_device_or_user_identifier";
  };
  scope: {
    uniqueness: typeof A1_ATTEMPT_UNIQUENESS_SCOPE;
    residual_limitation: typeof A1_ATTEMPT_RESIDUAL_LIMITATION;
  };
}

interface A1ChildTerminalEvidence {
  exit_code: number | null;
  signal: string | null;
  timed_out: boolean;
  stdout_sha256: string;
  stdout_byte_count: number;
  stdout_truncated: boolean;
  stderr_sha256: string;
  stderr_byte_count: number;
  stderr_truncated: boolean;
}

export interface A1AttemptTerminalFailure {
  schema_version: "1.0";
  operator_version: typeof A1_OPERATOR_VERSION;
  seal: A1OperatorReceipt["seal"];
  cell: A1OperatorReceipt["cell"];
  execution_boundary: A1ExecutionBoundary;
  publication_eligible: boolean;
  attempt_claim_sha256: string;
  terminal: {
    state: "failed";
    error_code: A1OperatorErrorCode;
    harness: A1ChildTerminalEvidence | null;
    scorer: A1ChildTerminalEvidence | null;
  };
  outcomes: {
    rerun_permitted: false;
    raw_child_content_published: false;
    claim_without_terminal_after_hard_termination: "aborted_no_pass";
  };
}

export type A1OperatorErrorCode =
  | "A1_OPERATOR_ARGUMENT_INVALID"
  | "A1_OPERATOR_SEAL_INVALID"
  | "A1_OPERATOR_AUTHORITY_INVALID"
  | "A1_OPERATOR_PRIVATE_ROOT_INVALID"
  | "A1_OPERATOR_PRIVATE_EVIDENCE_INVALID"
  | "A1_OPERATOR_ATTEMPT_CLAIM_EXISTS"
  | "A1_OPERATOR_ATTEMPT_CLAIM_INVALID"
  | "A1_OPERATOR_RERUN_REJECTED"
  | "A1_OPERATOR_GATE1_INCOMPLETE"
  | "A1_OPERATOR_CHILD_FAILED"
  | "A1_OPERATOR_ORACLE_FAILED"
  | "A1_OPERATOR_TIMEOUT"
  | "A1_OPERATOR_TERMINAL_WRITE_FAILED"
  | "A1_OPERATOR_WRITE_FAILED";

export class A1OperatorError extends Error {
  readonly code: A1OperatorErrorCode;

  constructor(code: A1OperatorErrorCode, message: string) {
    super(message);
    this.name = "A1OperatorError";
    this.code = code;
  }
}

export interface A1SealedCellCliOptions {
  projectRoot: string;
  privateEvidenceRoot: string;
  stage: A1OperatorStage;
  itemId: A1ItemId;
}

interface LedgerItem {
  item_id: A1ItemId;
  state: "ready" | "expected_structural_rejection" | "expected_supported_class_rejection";
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
  expected_class: "eligible_supported" | "expected_safe_rejection";
  content_completeness_state: "complete" | "partial" | "unknown";
}

export interface A1SealedAuthority {
  itemId: A1ItemId;
  ledger: LedgerItem;
  attestation: A1Attestation;
  attestationPath: string;
}

interface PreparedPrivateAuthority {
  authority: A1SealedAuthority;
  inputPath: string;
  inputBytes: Buffer;
  anchorPath: string | null;
  anchorBytes: Buffer | null;
}

interface A1Gate1Comparison {
  canonicalNormalizedSha256: string;
  normalizedFileSha256: string;
}

export interface A1SealedChildRequest {
  kind: "harness" | "scorer";
  executable: typeof SANDBOX_EXECUTABLE;
  args: readonly string[];
  cwd: string;
  maximumStdoutBytes: number;
  timeoutMs: typeof A1_CHILD_TIMEOUT_MS;
}

export interface A1SealedChildResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  stdout: Buffer;
  stderr: Buffer;
  stdoutTruncated?: boolean;
  stderrTruncated?: boolean;
}

export interface A1OperatorDependencies {
  verifySeal(repoRoot: string): LockVerificationReport;
  loadAuthorities(repoRoot: string): ReadonlyMap<A1ItemId, A1SealedAuthority>;
  runChild(request: A1SealedChildRequest): A1SealedChildResult;
  evaluateScore(
    subtitleBytes: Uint8Array,
    anchorBytes: Uint8Array,
    normalizedBytes: Uint8Array,
    options: A1PrivateScorerOptions,
  ): A1PrivateScoreSummary;
  serializeScore(summary: A1PrivateScoreSummary): string;
}

export interface A1OperatorSuccess {
  state: "created";
  operator_version: typeof A1_OPERATOR_VERSION;
  seal: A1OperatorReceipt["seal"];
  cell: A1OperatorReceipt["cell"];
  execution_boundary: A1ExecutionBoundary;
  publication_eligible: boolean;
  attempt_claim_sha256: string;
  process: A1OperatorReceipt["process"];
  hashes: A1OperatorReceipt["hashes"];
}

const DEFAULT_DEPENDENCIES: A1OperatorDependencies = Object.freeze({
  verifySeal: (repoRoot: string) => verifyLock({ repoRoot }),
  loadAuthorities: loadSealedAuthorities,
  runChild: runSealedChild,
  evaluateScore: evaluatePrivateA1,
  serializeScore: serializeA1PrivateScore,
});

export function parseSealedA1CellCli(argv: readonly string[]): A1SealedCellCliOptions {
  const allowed = new Set(["--project-root", "--private-evidence-root", "--stage", "--item-id"]);
  const values = new Map<string, string>();
  if (argv.length !== allowed.size * 2) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "exactly four fixed operator options are required");
  }
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag || !allowed.has(flag) || values.has(flag) || !value || value.startsWith("--")) {
      operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "operator options are missing, unknown, or duplicated");
    }
    values.set(flag, value);
  }
  const stage = values.get("--stage");
  const itemId = values.get("--item-id");
  if (stage !== "gate1-primary" && stage !== "gate3-repeat") {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "stage is not a sealed A1 stage");
  }
  if (!isPrimaryItemId(itemId)) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "item ID is not in the fixed A1 denominator");
  }
  if (stage === "gate3-repeat" && !isPositiveItemId(itemId)) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "Gate 3 contains only the five fixed positive items");
  }
  return {
    projectRoot: resolve(values.get("--project-root")!),
    privateEvidenceRoot: resolve(values.get("--private-evidence-root")!),
    stage,
    itemId,
  };
}

export function parseA1OperatorReceipt(input: string | Uint8Array): A1OperatorReceipt {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  const root = requireRecord(parseStrictJson(bytes, MAX_REPORT_BYTES, "operator receipt"), "operator receipt");
  requireExactKeys(
    root,
    [
      "schema_version", "operator_version", "seal", "cell", "execution_boundary",
      "publication_eligible", "attempt_claim_sha256", "process", "hashes", "outcomes",
    ],
    "operator receipt",
  );
  if (root.schema_version !== "1.1" || root.operator_version !== A1_OPERATOR_VERSION) {
    oracleFail("operator receipt identity is invalid");
  }
  const seal = requireRecord(root.seal, "operator receipt seal");
  const cell = requireRecord(root.cell, "operator receipt cell");
  const process = requireRecord(root.process, "operator receipt process");
  const hashes = requireRecord(root.hashes, "operator receipt hashes");
  const outcomes = requireRecord(root.outcomes, "operator receipt outcomes");
  requireExactKeys(seal, ["content_commit", "seal_commit", "lock_sha256"], "operator receipt seal");
  requireExactKeys(cell, ["stage", "item_id", "expected_outcome"], "operator receipt cell");
  requireExactKeys(process, ["harness_exit_code", "scorer_exit_code"], "operator receipt process");
  requireExactKeys(hashes, [
    "harness_report_sha256",
    "normalized_transcript_sha256",
    "scorer_options_sha256",
    "scorer_report_sha256",
    "database_sha256",
  ], "operator receipt hashes");
  requireExactKeys(
    outcomes,
    ["expected_outcome_observed", "rerun_policy", "selection_policy"],
    "operator receipt outcomes",
  );
  if (
    typeof seal.content_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.content_commit)
    || typeof seal.seal_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.seal_commit)
    || typeof seal.lock_sha256 !== "string"
    || !SHA256_PATTERN.test(seal.lock_sha256)
    || (cell.stage !== "gate1-primary" && cell.stage !== "gate3-repeat")
    || !isPrimaryItemId(cell.item_id)
    || !isExpectedOutcome(cell.expected_outcome)
    || (root.execution_boundary !== "sealed_default_dependencies"
      && root.execution_boundary !== "development_test_only")
    || root.publication_eligible
      !== (root.execution_boundary === "sealed_default_dependencies")
    || typeof root.attempt_claim_sha256 !== "string"
    || !SHA256_PATTERN.test(root.attempt_claim_sha256)
    || !isNonNegativeInteger(process.harness_exit_code)
    || (process.scorer_exit_code !== null && !isNonNegativeInteger(process.scorer_exit_code))
    || outcomes.expected_outcome_observed !== true
    || outcomes.rerun_policy !== "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write"
    || outcomes.selection_policy !== "fixed_seal_stage_item_paths_no_caller_selected_evidence"
  ) {
    oracleFail("operator receipt semantics are invalid");
  }
  for (const key of [
    "harness_report_sha256",
    "normalized_transcript_sha256",
    "scorer_options_sha256",
    "scorer_report_sha256",
    "database_sha256",
  ] as const) {
    const value = hashes[key];
    if (key === "harness_report_sha256") {
      requireSha256(value, `receipt ${key}`);
    } else if (value !== null) {
      requireSha256(value, `receipt ${key}`);
    }
  }
  return root as unknown as A1OperatorReceipt;
}

export function parseA1AttemptClaim(input: string | Uint8Array): A1AttemptClaim {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  const root = requireRecord(parseStrictJson(bytes, MAX_REPORT_BYTES, "attempt claim"), "attempt claim");
  requireExactKeys(
    root,
    [
      "schema_version", "operator_version", "publication_eligible", "seal", "cell",
      "execution_contract", "scope",
    ],
    "attempt claim",
  );
  if (root.schema_version !== "1.0" || root.operator_version !== A1_OPERATOR_VERSION) {
    operatorFail("A1_OPERATOR_ATTEMPT_CLAIM_INVALID", "attempt claim identity is invalid");
  }
  const seal = requireRecord(root.seal, "attempt claim seal");
  const cell = requireRecord(root.cell, "attempt claim cell");
  const execution = requireRecord(root.execution_contract, "attempt claim execution contract");
  const scope = requireRecord(root.scope, "attempt claim scope");
  requireExactKeys(seal, ["content_commit", "seal_commit", "lock_sha256"], "attempt claim seal");
  requireExactKeys(cell, ["stage", "item_id", "expected_outcome"], "attempt claim cell");
  requireExactKeys(
    execution,
    ["identity_sha256", "execution_boundary", "private_evidence_binding"],
    "attempt claim execution contract",
  );
  requireExactKeys(scope, ["uniqueness", "residual_limitation"], "attempt claim scope");
  if (
    typeof seal.content_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.content_commit)
    || typeof seal.seal_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.seal_commit)
    || typeof seal.lock_sha256 !== "string"
    || !SHA256_PATTERN.test(seal.lock_sha256)
    || (cell.stage !== "gate1-primary" && cell.stage !== "gate3-repeat")
    || !isPrimaryItemId(cell.item_id)
    || !isExpectedOutcome(cell.expected_outcome)
    || execution.identity_sha256 !== A1_EXECUTION_CONTRACT_IDENTITY_SHA256
    || (execution.execution_boundary !== "sealed_default_dependencies"
      && execution.execution_boundary !== "development_test_only")
    || execution.private_evidence_binding
      !== "sealed_source_and_anchor_authorities_no_path_device_or_user_identifier"
    || root.publication_eligible
      !== (execution.execution_boundary === "sealed_default_dependencies")
    || scope.uniqueness !== A1_ATTEMPT_UNIQUENESS_SCOPE
    || scope.residual_limitation !== A1_ATTEMPT_RESIDUAL_LIMITATION
  ) operatorFail("A1_OPERATOR_ATTEMPT_CLAIM_INVALID", "attempt claim semantics are invalid");
  return root as unknown as A1AttemptClaim;
}

export function parseA1AttemptTerminalFailure(
  input: string | Uint8Array,
): A1AttemptTerminalFailure {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  const root = requireRecord(
    parseStrictJson(bytes, MAX_REPORT_BYTES, "attempt terminal"),
    "attempt terminal",
  );
  requireExactKeys(
    root,
    [
      "schema_version", "operator_version", "seal", "cell", "execution_boundary",
      "publication_eligible", "attempt_claim_sha256", "terminal", "outcomes",
    ],
    "attempt terminal",
  );
  const seal = requireRecord(root.seal, "attempt terminal seal");
  const cell = requireRecord(root.cell, "attempt terminal cell");
  const terminal = requireRecord(root.terminal, "attempt terminal state");
  const outcomes = requireRecord(root.outcomes, "attempt terminal outcomes");
  requireExactKeys(seal, ["content_commit", "seal_commit", "lock_sha256"], "attempt terminal seal");
  requireExactKeys(cell, ["stage", "item_id", "expected_outcome"], "attempt terminal cell");
  requireExactKeys(terminal, ["state", "error_code", "harness", "scorer"], "attempt terminal state");
  requireExactKeys(
    outcomes,
    ["rerun_permitted", "raw_child_content_published", "claim_without_terminal_after_hard_termination"],
    "attempt terminal outcomes",
  );
  if (
    root.schema_version !== "1.0"
    || root.operator_version !== A1_OPERATOR_VERSION
    || typeof seal.content_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.content_commit)
    || typeof seal.seal_commit !== "string"
    || !GIT_COMMIT_PATTERN.test(seal.seal_commit)
    || typeof seal.lock_sha256 !== "string"
    || !SHA256_PATTERN.test(seal.lock_sha256)
    || (cell.stage !== "gate1-primary" && cell.stage !== "gate3-repeat")
    || !isPrimaryItemId(cell.item_id)
    || !isExpectedOutcome(cell.expected_outcome)
    || (root.execution_boundary !== "sealed_default_dependencies"
      && root.execution_boundary !== "development_test_only")
    || root.publication_eligible
      !== (root.execution_boundary === "sealed_default_dependencies")
    || typeof root.attempt_claim_sha256 !== "string"
    || !SHA256_PATTERN.test(root.attempt_claim_sha256)
    || terminal.state !== "failed"
    || !isOperatorErrorCode(terminal.error_code)
    || outcomes.rerun_permitted !== false
    || outcomes.raw_child_content_published !== false
    || outcomes.claim_without_terminal_after_hard_termination !== "aborted_no_pass"
  ) oracleFail("attempt terminal semantics are invalid");
  validateChildTerminalEvidence(terminal.harness, "attempt terminal harness");
  validateChildTerminalEvidence(terminal.scorer, "attempt terminal scorer");
  return root as unknown as A1AttemptTerminalFailure;
}

export function runSealedA1Cell(options: A1SealedCellCliOptions): A1OperatorSuccess {
  return runSealedA1CellCore(options, DEFAULT_DEPENDENCIES, "sealed_default_dependencies");
}

/** Builds the same verified repository read boundary used by production children. */
export function buildA1VerifiedRepositoryReadSandboxProfile(
  projectRootInput: string,
  seal: LockVerificationReport,
): string {
  const projectRoot = resolveExistingDirectory(
    projectRootInput,
    false,
    "A1_OPERATOR_SEAL_INVALID",
  );
  assertSealReport(seal);
  return sandboxProfile(projectRoot, loadVerifiedSandboxReadSet(projectRoot, seal), [], []);
}

/**
 * Synthetic process seams for node:test only. Claims and receipts emitted by
 * this entrypoint are permanently marked development_test_only and are not
 * eligible for the production Gate 3 chain.
 */
export function __testOnlyRunSealedA1CellWithDependencies(
  options: A1SealedCellCliOptions,
  suppliedDependencies: Partial<A1OperatorDependencies>,
): A1OperatorSuccess {
  if (!process.env.NODE_TEST_CONTEXT) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "test-only operator boundary requires node:test");
  }
  const dependencies: A1OperatorDependencies = { ...DEFAULT_DEPENDENCIES, ...suppliedDependencies };
  return runSealedA1CellCore(options, dependencies, "development_test_only");
}

/** Executes the production child capture boundary under node:test. */
export function __testOnlyRunSealedChild(
  request: A1SealedChildRequest,
): A1SealedChildResult {
  if (!process.env.NODE_TEST_CONTEXT) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "test-only child boundary requires node:test");
  }
  return runSealedChild(request);
}

function runSealedA1CellCore(
  options: A1SealedCellCliOptions,
  dependencies: A1OperatorDependencies,
  executionBoundary: A1ExecutionBoundary,
): A1OperatorSuccess {
  const projectRoot = resolveExistingDirectory(options.projectRoot, false, "A1_OPERATOR_SEAL_INVALID");
  let seal: LockVerificationReport;
  try {
    seal = dependencies.verifySeal(projectRoot);
  } catch {
    operatorFail("A1_OPERATOR_SEAL_INVALID", "the benchmark lock did not verify");
  }
  assertSealReport(seal);
  let repositorySandboxReadSet: SandboxRepositoryReadSet | null = null;
  if (executionBoundary === "sealed_default_dependencies") {
    try {
      repositorySandboxReadSet = loadVerifiedSandboxReadSet(projectRoot, seal);
    } catch {
      operatorFail("A1_OPERATOR_SEAL_INVALID", "the verified lock could not define the sandbox read set");
    }
  }

  let authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>;
  try {
    authorities = dependencies.loadAuthorities(projectRoot);
  } catch (error) {
    if (error instanceof A1OperatorError) throw error;
    operatorFail("A1_OPERATOR_AUTHORITY_INVALID", "the sealed A1 authorities are invalid");
  }
  assertCompleteAuthoritySet(authorities);
  const authority = authorities.get(options.itemId)!;
  const expectedOutcome = expectedOutcomeFor(authority);
  if (options.stage === "gate3-repeat" && expectedOutcome !== "eligible_pass") {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "Gate 3 cannot run a rejection control");
  }

  const privateRoot = resolvePrivateRoot(options.privateEvidenceRoot, projectRoot);
  const prepared = preparePrivateAuthority(privateRoot, authority);
  let gate1ComparisonHash: string | null = null;
  let gate1NormalizedFileHash: string | null = null;
  if (options.stage === "gate3-repeat") {
    const comparisons = assertGate1Complete(
      projectRoot,
      privateRoot,
      seal,
      authorities,
      dependencies,
      executionBoundary,
    );
    const comparison = comparisons.get(options.itemId as A1PositiveItemId) ?? null;
    gate1ComparisonHash = comparison?.canonicalNormalizedSha256 ?? null;
    gate1NormalizedFileHash = comparison?.normalizedFileSha256 ?? null;
    requireSha256(gate1ComparisonHash, "Gate 1 comparison hash");
    requireSha256(gate1NormalizedFileHash, "Gate 1 normalized file hash");
  }

  const cellRelative = `outputs/${seal.sealCommit}/${options.stage}/${options.itemId}`;
  const receiptRelative =
    `outputs/${seal.sealCommit}/operator-receipts/${options.stage}/${options.itemId}.publication-safe.json`;
  const cellPath = privatePath(privateRoot, cellRelative);
  const receiptPath = privatePath(privateRoot, receiptRelative);
  const claimPath = attemptClaimPath(projectRoot, seal.sealCommit, options.stage, options.itemId);
  const terminalPath = attemptTerminalPath(projectRoot, seal.sealCommit, options.stage, options.itemId);

  // The seal-scoped repository claim is the authoritative-worktree write-once
  // boundary. Private cell/receipt checks remain defense in depth.
  if (pathEntryExists(claimPath)) {
    operatorFail("A1_OPERATOR_ATTEMPT_CLAIM_EXISTS", "the canonical seal-scoped attempt is consumed");
  }
  if (pathEntryExists(cellPath) || pathEntryExists(receiptPath) || pathEntryExists(terminalPath)) {
    operatorFail("A1_OPERATOR_RERUN_REJECTED", "the fixed cell or receipt already exists");
  }

  ensureRepositoryClaimParent(projectRoot, dirname(claimPath));
  const claim = buildAttemptClaim(seal, options.stage, options.itemId, expectedOutcome, executionBoundary);
  const claimBytes = Buffer.from(`${JSON.stringify(claim, null, 2)}\n`, "utf8");
  parseA1AttemptClaim(claimBytes);
  writeExclusiveRepositoryFile(claimPath, claimBytes, "A1_OPERATOR_ATTEMPT_CLAIM_EXISTS");
  const attemptClaimSha256 = sha256Hex(claimBytes);

  let harnessResult: A1SealedChildResult | null = null;
  let scorerResult: A1SealedChildResult | null = null;
  try {
    // Winning the canonical public claim must precede every private mutation.
    // In particular, a concurrent loser must not create even private parent
    // directories before O_EXCL establishes the sole authoritative attempt.
    ensurePrivateParent(privateRoot, cellRelative.split("/").slice(0, -1));
    ensurePrivateParent(privateRoot, receiptRelative.split("/").slice(0, -1));
    createPrivateDirectoryExclusive(cellPath);
    const harnessTemporaryPath = join(cellPath, "harness-tmp");
    createPrivateDirectoryExclusive(harnessTemporaryPath);
    const priorEvidence = snapshotPriorEvidence(projectRoot, privateRoot, cellPath);
    harnessResult = invokeChild(
      dependencies,
      buildHarnessRequest(
        projectRoot,
        prepared,
        cellPath,
        harnessTemporaryPath,
        repositorySandboxReadSet,
      ),
    );
    assertPriorEvidenceUnchanged(projectRoot, privateRoot, cellPath, priorEvidence);
    assertChildCompleted(harnessResult, "harness");
    const harnessReport = parseStrictJson(
      harnessResult.stdout,
      MAX_REPORT_BYTES,
      "harness report",
    );
    if (harnessResult.stderr.byteLength !== 0) childFail("the harness emitted unexpected stderr");

    const harnessReportPath = join(cellPath, "harness-report.publication-safe.json");
    let normalizedHash: string | null = null;
    let scorerOptionsHash: string | null = null;
    let scorerReportHash: string | null = null;
    let databaseHash: string | null = null;
    let scorerExitCode: number | null = null;

    if (expectedOutcome === "eligible_pass") {
      if (harnessResult.exitCode !== 0) oracleFail("an eligible harness cell exited nonzero");
      const normalizedPath = join(cellPath, "a1-normalized-transcript.private.json");
      const databasePath = join(cellPath, "throwaway.sqlite");
      const normalizedBytes = readUniquePrivateFile(
        normalizedPath,
        A1_PRIVATE_SCORER_LIMITS.maxNormalizedOutputBytes,
        "normalized transcript",
      );
      const databaseBytes = readUniquePrivateFile(databasePath, MAX_DATABASE_BYTES, "throwaway database");
      normalizedHash = sha256Hex(normalizedBytes);
      if (options.stage === "gate3-repeat" && normalizedHash !== gate1NormalizedFileHash) {
        oracleFail("the repeat normalized file bytes differ from Gate 1");
      }
      databaseHash = sha256Hex(databaseBytes);
      validatePositiveHarnessReport(
        harnessReport,
        authority,
        seal.lockSha256,
        normalizedHash,
        preflightCounts(prepared),
      );
      validateDatabaseEvidence(databasePath, normalizedBytes, authority);
      writeExclusivePrivateFile(harnessReportPath, harnessResult.stdout);
      rmdirPrivateTemporaryDirectory(harnessTemporaryPath);

      if (!prepared.anchorPath || !prepared.anchorBytes || !authority.ledger.preparation_document_sha256) {
        authorityFail("eligible cell lacks its fixed anchor authority");
      }
      const scorerOptions: A1PrivateScorerOptions = {
        schema_version: "1.0",
        format: authority.attestation.input_contract.format,
        declared_duration_ms: authority.ledger.declared_duration_ms,
        expected_raw_sha256: authority.ledger.source_raw_sha256,
        expected_cue_count: authority.ledger.cue_count,
        input_file_integrity_attested: true,
        content_completeness: requireScoreableCompleteness(
          authority.attestation.input_contract.content_completeness.state,
        ),
        content_completeness_basis: requireScoreableBasis(
          authority.attestation.input_contract.content_completeness.basis,
        ),
        reference_role: "a1_input_preservation_oracle",
        expected_anchor_packet_sha256: authority.ledger.preparation_document_sha256,
        expected_normalized_transcript_sha256: normalizedHash,
        comparison_canonical_output_sha256: gate1ComparisonHash,
      };
      const scorerOptionsBytes = Buffer.from(`${JSON.stringify(scorerOptions, null, 2)}\n`, "utf8");
      parseA1PrivateScorerOptionsBytes(scorerOptionsBytes);
      const scorerOptionsPath = join(cellPath, "a1-score-options.private.json");
      writeExclusivePrivateFile(scorerOptionsPath, scorerOptionsBytes);
      scorerOptionsHash = sha256Hex(scorerOptionsBytes);
      const scorerTemporaryPath = join(cellPath, "scorer-tmp");
      createPrivateDirectoryExclusive(scorerTemporaryPath);
      const beforeScorer = snapshotPriorEvidence(projectRoot, privateRoot, scorerTemporaryPath);
      scorerResult = invokeChild(
        dependencies,
        buildScorerRequest(
          projectRoot,
          scorerOptionsPath,
          prepared.inputPath,
          prepared.anchorPath,
          normalizedPath,
          scorerTemporaryPath,
          repositorySandboxReadSet,
        ),
      );
      assertPriorEvidenceUnchanged(projectRoot, privateRoot, scorerTemporaryPath, beforeScorer);
      assertChildCompleted(scorerResult, "scorer");
      scorerExitCode = scorerResult.exitCode;
      if (scorerResult.exitCode !== 0 || scorerResult.stderr.byteLength !== 0) {
        childFail("the frozen scorer did not exit cleanly");
      }
      parseStrictJson(scorerResult.stdout, MAX_REPORT_BYTES, "scorer report");
      const expectedScore = dependencies.evaluateScore(
        prepared.inputBytes,
        prepared.anchorBytes,
        normalizedBytes,
        scorerOptions,
      );
      const expectedScoreBytes = Buffer.from(dependencies.serializeScore(expectedScore), "utf8");
      if (!scorerResult.stdout.equals(expectedScoreBytes)) {
        oracleFail("scorer stdout differs from the frozen deterministic evaluator");
      }
      assertScoreThresholds(expectedScore, options.stage, authority);
      if (
        sha256Hex(readUniquePrivateFile(normalizedPath, A1_PRIVATE_SCORER_LIMITS.maxNormalizedOutputBytes, "normalized transcript"))
          !== normalizedHash
        || sha256Hex(readUniquePrivateFile(databasePath, MAX_DATABASE_BYTES, "throwaway database"))
          !== databaseHash
      ) oracleFail("the scorer changed harness evidence");
      const scorerReportPath = join(cellPath, "a1-score.publication-safe.json");
      writeExclusivePrivateFile(scorerReportPath, scorerResult.stdout);
      scorerReportHash = sha256Hex(scorerResult.stdout);
      rmdirPrivateTemporaryDirectory(scorerTemporaryPath);
      assertExactDirectoryEntries(cellPath, [
        "a1-normalized-transcript.private.json",
        "a1-score-options.private.json",
        "a1-score.publication-safe.json",
        "harness-report.publication-safe.json",
        "throwaway.sqlite",
      ]);
    } else {
      const expectedExitCode = expectedOutcome === "structural_safe_rejection" ? 1 : 0;
      if (harnessResult.exitCode !== expectedExitCode) {
        oracleFail("a fixed rejection control returned the wrong process status");
      }
      if (expectedOutcome === "structural_safe_rejection") {
        validateStructuralRejectionReport(harnessReport);
      } else {
        validateSupportedRejectionReport(
          harnessReport,
          authority,
          seal.lockSha256,
          preflightCounts(prepared),
        );
      }
      assertRejectedArtifactsAbsent(cellPath);
      writeExclusivePrivateFile(harnessReportPath, harnessResult.stdout);
      rmdirPrivateTemporaryDirectory(harnessTemporaryPath);
      assertExactDirectoryEntries(cellPath, ["harness-report.publication-safe.json"]);
    }

    const receipt: A1OperatorReceipt = {
      schema_version: "1.1",
      operator_version: A1_OPERATOR_VERSION,
      seal: {
        content_commit: seal.contentCommit,
        seal_commit: seal.sealCommit,
        lock_sha256: seal.lockSha256,
      },
      cell: {
        stage: options.stage,
        item_id: options.itemId,
        expected_outcome: expectedOutcome,
      },
      execution_boundary: executionBoundary,
      publication_eligible: publicationEligibleFor(executionBoundary),
      attempt_claim_sha256: attemptClaimSha256,
      process: {
        harness_exit_code: harnessResult.exitCode,
        scorer_exit_code: scorerExitCode,
      },
      hashes: {
        harness_report_sha256: sha256Hex(harnessResult.stdout),
        normalized_transcript_sha256: normalizedHash,
        scorer_options_sha256: scorerOptionsHash,
        scorer_report_sha256: scorerReportHash,
        database_sha256: databaseHash,
      },
      outcomes: {
        expected_outcome_observed: true,
        rerun_policy: "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write",
        selection_policy: "fixed_seal_stage_item_paths_no_caller_selected_evidence",
      },
    };
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    parseA1OperatorReceipt(receiptBytes);
    writeExclusivePrivateFile(receiptPath, receiptBytes);

    return {
      state: "created",
      operator_version: A1_OPERATOR_VERSION,
      seal: receipt.seal,
      cell: receipt.cell,
      execution_boundary: executionBoundary,
      publication_eligible: publicationEligibleFor(executionBoundary),
      attempt_claim_sha256: attemptClaimSha256,
      process: receipt.process,
      hashes: receipt.hashes,
    };
  } catch (error) {
    const operatorError = error instanceof A1OperatorError
      ? error
      : new A1OperatorError("A1_OPERATOR_ORACLE_FAILED", "claimed attempt failed internally");
    try {
      ensureRepositoryClaimParent(projectRoot, dirname(terminalPath));
      writeAttemptTerminalFailure(
        terminalPath,
        buildAttemptTerminalFailure(
          seal,
          options.stage,
          options.itemId,
          expectedOutcome,
          executionBoundary,
          attemptClaimSha256,
          operatorError.code,
          harnessResult,
          scorerResult,
        ),
      );
    } catch {
      operatorFail("A1_OPERATOR_TERMINAL_WRITE_FAILED", "claimed failure terminal could not be preserved");
    }
    throw operatorError;
  }
}

function loadSealedAuthorities(repoRoot: string): ReadonlyMap<A1ItemId, A1SealedAuthority> {
  const ledgerAbsolutePath = join(repoRoot, ...LEDGER_PATH.split("/"));
  const ledgerBytes = readUniqueFile(ledgerAbsolutePath, MAX_REPORT_BYTES, "reference ledger", false);
  const ledger = parseReferenceLedgerJsonBytes(ledgerBytes) as unknown as {
    items: LedgerItem[];
  };
  if (!Array.isArray(ledger.items) || ledger.items.length !== A1_PRIMARY_ITEM_IDS.length) {
    authorityFail("the reference ledger does not contain the fixed nine A1 items");
  }
  const result = new Map<A1ItemId, A1SealedAuthority>();
  for (const [index, itemId] of A1_PRIMARY_ITEM_IDS.entries()) {
    const ledgerItem = ledger.items[index];
    if (!ledgerItem || ledgerItem.item_id !== itemId) {
      authorityFail("the reference-ledger item order is invalid");
    }
    validateLedgerItem(ledgerItem);
    const attestationPath = join(repoRoot, ...`${BENCHMARK_ROOT}/attestations/${itemId}.json`.split("/"));
    const attestationBytes = readUniqueFile(
      attestationPath,
      MAX_ATTESTATION_BYTES,
      "sealed attestation",
      false,
    );
    let attestation: A1Attestation;
    try {
      attestation = parseLockedA1Attestation(
        attestationBytes,
        ledgerItem.attestation_sha256,
      ).attestation;
    } catch {
      authorityFail("a sealed attestation differs from its ledger digest or schema");
    }
    try {
      validateA1SealedAuthoritySemantics({ expectedItemId: itemId, ledger: ledgerItem, attestation });
    } catch {
      authorityFail("an attestation and reference-ledger row disagree");
    }
    result.set(itemId, { itemId, ledger: ledgerItem, attestation, attestationPath });
  }
  return result;
}

function validateLedgerItem(item: LedgerItem): void {
  requireSha256(item.attestation_sha256, "ledger attestation hash");
  requireSha256(item.source_raw_sha256, "ledger source hash");
  if (item.source_canonical_sha256 !== null) {
    requireSha256(item.source_canonical_sha256, "ledger canonical source hash");
  }
  for (const value of [
    item.source_bytes,
    item.cue_count,
    item.declared_duration_ms,
    item.last_cue_end_ms,
    item.actual_anchor_count,
    item.base_anchor_target,
  ]) {
    if (!Number.isSafeInteger(value) || value < 0) authorityFail("a ledger count is invalid");
  }
  if (item.preparation_document_sha256 !== null) {
    requireSha256(item.preparation_document_sha256, "ledger anchor hash");
  }
}

function assertCompleteAuthoritySet(
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>,
): void {
  if (authorities.size !== A1_PRIMARY_ITEM_IDS.length) {
    authorityFail("the authority set is not the fixed nine-item denominator");
  }
  for (const itemId of A1_PRIMARY_ITEM_IDS) {
    const authority = authorities.get(itemId);
    if (!authority || authority.itemId !== itemId) {
      authorityFail("a fixed A1 authority is absent");
    }
  }
}

function preparePrivateAuthority(
  privateRoot: string,
  authority: A1SealedAuthority,
): PreparedPrivateAuthority {
  const inputPath = privatePath(privateRoot, authority.attestation.source.private_relative_path);
  const inputBytes = readUniquePrivateFile(inputPath, MAX_INPUT_BYTES, "sealed private input");
  if (
    inputBytes.byteLength !== authority.ledger.source_bytes
    || sha256Hex(inputBytes) !== authority.ledger.source_raw_sha256
  ) privateEvidenceFail("the private input differs from the sealed authority");

  let anchorPath: string | null = null;
  let anchorBytes: Buffer | null = null;
  if (expectedOutcomeFor(authority) !== "structural_safe_rejection") {
    if (
      !authority.ledger.preparation_private_relative_path
      || !authority.ledger.preparation_document_sha256
    ) authorityFail("the sealed authority has no fixed private preparation document");
    anchorPath = privatePath(privateRoot, authority.ledger.preparation_private_relative_path);
    anchorBytes = readUniquePrivateFile(
      anchorPath,
      A1_PRIVATE_SCORER_LIMITS.maxAnchorPacketBytes,
      "sealed private preparation document",
    );
    if (sha256Hex(anchorBytes) !== authority.ledger.preparation_document_sha256) {
      privateEvidenceFail("the private preparation document differs from the sealed authority");
    }
  }
  return { authority, inputPath, inputBytes, anchorPath, anchorBytes };
}

function assertGate1Complete(
  projectRoot: string,
  privateRoot: string,
  seal: LockVerificationReport,
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>,
  dependencies: A1OperatorDependencies,
  executionBoundary: A1ExecutionBoundary,
): ReadonlyMap<A1PositiveItemId, A1Gate1Comparison> {
  const comparisons = new Map<A1PositiveItemId, A1Gate1Comparison>();
  for (const itemId of A1_PRIMARY_ITEM_IDS) {
    const authority = authorities.get(itemId)!;
    const prepared = preparePrivateAuthority(privateRoot, authority);
    const cellRelative = `outputs/${seal.sealCommit}/gate1-primary/${itemId}`;
    const cellPath = privatePath(privateRoot, cellRelative);
    const receiptPath = privatePath(
      privateRoot,
      `outputs/${seal.sealCommit}/operator-receipts/gate1-primary/${itemId}.publication-safe.json`,
    );
    const claimPath = attemptClaimPath(projectRoot, seal.sealCommit, "gate1-primary", itemId);
    const terminalPath = attemptTerminalPath(projectRoot, seal.sealCommit, "gate1-primary", itemId);
    if (pathEntryExists(terminalPath)) gate1Incomplete("a Gate 1 attempt has terminal failure evidence");
    let claimBytes: Buffer;
    let claim: A1AttemptClaim;
    try {
      claimBytes = readUniqueFile(claimPath, MAX_REPORT_BYTES, "Gate 1 attempt claim", false);
      claim = parseA1AttemptClaim(claimBytes);
    } catch {
      gate1Incomplete("a fixed Gate 1 attempt claim is missing or invalid");
    }
    let receipt: A1OperatorReceipt;
    try {
      receipt = parseA1OperatorReceipt(
        readUniquePrivateFile(receiptPath, MAX_REPORT_BYTES, "Gate 1 operator receipt"),
      );
    } catch {
      gate1Incomplete("a fixed Gate 1 operator receipt is missing or invalid");
    }
    const outcome = expectedOutcomeFor(authority);
    assertAttemptClaimBinding(
      claim,
      seal,
      "gate1-primary",
      itemId,
      outcome,
      executionBoundary,
    );
    const claimHash = sha256Hex(claimBytes);
    if (outcome === "eligible_pass") {
      assertExactDirectoryEntries(cellPath, [
        "a1-normalized-transcript.private.json",
        "a1-score-options.private.json",
        "a1-score.publication-safe.json",
        "harness-report.publication-safe.json",
        "throwaway.sqlite",
      ]);
      const harnessBytes = readUniquePrivateFile(
        join(cellPath, "harness-report.publication-safe.json"),
        MAX_REPORT_BYTES,
        "Gate 1 harness report",
      );
      const normalizedBytes = readUniquePrivateFile(
        join(cellPath, "a1-normalized-transcript.private.json"),
        A1_PRIVATE_SCORER_LIMITS.maxNormalizedOutputBytes,
        "Gate 1 normalized transcript",
      );
      const optionsBytes = readUniquePrivateFile(
        join(cellPath, "a1-score-options.private.json"),
        A1_PRIVATE_SCORER_LIMITS.maxOptionsBytes,
        "Gate 1 score options",
      );
      const scoreBytes = readUniquePrivateFile(
        join(cellPath, "a1-score.publication-safe.json"),
        MAX_REPORT_BYTES,
        "Gate 1 score report",
      );
      const databaseBytes = readUniquePrivateFile(
        join(cellPath, "throwaway.sqlite"),
        MAX_DATABASE_BYTES,
        "Gate 1 throwaway database",
      );
      const normalizedHash = sha256Hex(normalizedBytes);
      validatePositiveHarnessReport(
        parseStrictJson(harnessBytes, MAX_REPORT_BYTES, "Gate 1 harness report"),
        authority,
        seal.lockSha256,
        normalizedHash,
        preflightCounts(prepared),
      );
      validateDatabaseEvidence(join(cellPath, "throwaway.sqlite"), normalizedBytes, authority);
      const scorerOptions = parseA1PrivateScorerOptionsBytes(optionsBytes);
      assertExpectedScoreOptions(scorerOptions, authority, normalizedHash, null);
      if (!prepared.anchorBytes) gate1Incomplete("a Gate 1 positive anchor packet is absent");
      const score = dependencies.evaluateScore(
        prepared.inputBytes,
        prepared.anchorBytes,
        normalizedBytes,
        scorerOptions,
      );
      if (!scoreBytes.equals(Buffer.from(dependencies.serializeScore(score), "utf8"))) {
        gate1Incomplete("a Gate 1 score is not the frozen deterministic result");
      }
      assertScoreThresholds(score, "gate1-primary", authority);
      assertReceiptBinding(receipt, seal, itemId, outcome, claimHash, executionBoundary, {
        harness_report_sha256: sha256Hex(harnessBytes),
        normalized_transcript_sha256: normalizedHash,
        scorer_options_sha256: sha256Hex(optionsBytes),
        scorer_report_sha256: sha256Hex(scoreBytes),
        database_sha256: sha256Hex(databaseBytes),
      });
      comparisons.set(itemId as A1PositiveItemId, {
        canonicalNormalizedSha256: score.hashes.canonical_normalized_output_sha256,
        normalizedFileSha256: normalizedHash,
      });
    } else {
      assertExactDirectoryEntries(cellPath, ["harness-report.publication-safe.json"]);
      const harnessBytes = readUniquePrivateFile(
        join(cellPath, "harness-report.publication-safe.json"),
        MAX_REPORT_BYTES,
        "Gate 1 rejection report",
      );
      const report = parseStrictJson(harnessBytes, MAX_REPORT_BYTES, "Gate 1 rejection report");
      if (outcome === "structural_safe_rejection") {
        validateStructuralRejectionReport(report);
      } else {
        validateSupportedRejectionReport(
          report,
          authority,
          seal.lockSha256,
          preflightCounts(prepared),
        );
      }
      assertReceiptBinding(receipt, seal, itemId, outcome, claimHash, executionBoundary, {
        harness_report_sha256: sha256Hex(harnessBytes),
        normalized_transcript_sha256: null,
        scorer_options_sha256: null,
        scorer_report_sha256: null,
        database_sha256: null,
      });
    }
  }
  if (comparisons.size !== A1_POSITIVE_ITEM_IDS.length) {
    gate1Incomplete("Gate 1 did not pass its complete fixed denominator");
  }
  return comparisons;
}

function buildHarnessRequest(
  projectRoot: string,
  prepared: PreparedPrivateAuthority,
  cellPath: string,
  temporaryPath: string,
  repositorySandboxReadSet: SandboxRepositoryReadSet | null,
): A1SealedChildRequest {
  const { authority } = prepared;
  const contract = authority.attestation.input_contract;
  return {
    kind: "harness",
    executable: SANDBOX_EXECUTABLE,
    cwd: projectRoot,
    maximumStdoutBytes: MAX_REPORT_BYTES,
    timeoutMs: A1_CHILD_TIMEOUT_MS,
    args: [
      "-p",
      sandboxProfile(
        projectRoot,
        repositorySandboxReadSet,
        [
          { kind: "literal", path: authority.attestationPath },
          { kind: "literal", path: prepared.inputPath },
          { kind: "subpath", path: cellPath },
          { kind: "subpath", path: temporaryPath },
        ],
        [cellPath],
      ),
      ENV_EXECUTABLE,
      "-i",
      `PATH=${SEALED_PATH}`,
      `HOME=${temporaryPath}`,
      `TMPDIR=${temporaryPath}`,
      "TSX_DISABLE_CACHE=1",
      "GIT_CONFIG_NOSYSTEM=1",
      "GIT_CONFIG_GLOBAL=/dev/null",
      "GIT_OPTIONAL_LOCKS=0",
      `BRAIN_DB_PATH=${join(cellPath, "throwaway.sqlite")}`,
      "BRAIN_TRANSCRIPT_ENV=lab",
      "YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED=0",
      "YOUTUBE_TRANSCRIPT_WORKER_ENABLED=0",
      NODE_EXECUTABLE,
      "--import",
      "tsx",
      HARNESS_CLI_PATH,
      "--execution-class",
      "SEALED",
      "--attestation",
      authority.attestationPath,
      "--expected-attestation-sha256",
      authority.ledger.attestation_sha256,
      "--input",
      prepared.inputPath,
      "--expected-input-sha256",
      authority.ledger.source_raw_sha256,
      "--expected-video-id",
      authority.attestation.youtube_video_id,
      "--format",
      contract.format,
      "--expected-cue-count",
      String(authority.ledger.cue_count),
      "--declared-duration-ms",
      String(authority.ledger.declared_duration_ms),
      "--expected-last-cue-end-ms",
      String(authority.ledger.last_cue_end_ms),
      "--language",
      contract.language_tag,
      "--input-file-integrity-attested",
      "true",
      "--content-completeness",
      contract.content_completeness.state,
      "--content-completeness-basis",
      contract.content_completeness.basis,
      "--expected-class",
      contract.expected_class,
      "--private-output-dir",
      cellPath,
    ],
  };
}

function buildScorerRequest(
  projectRoot: string,
  optionsPath: string,
  inputPath: string,
  anchorPath: string,
  normalizedPath: string,
  temporaryPath: string,
  repositorySandboxReadSet: SandboxRepositoryReadSet | null,
): A1SealedChildRequest {
  return {
    kind: "scorer",
    executable: SANDBOX_EXECUTABLE,
    cwd: projectRoot,
    maximumStdoutBytes: MAX_REPORT_BYTES,
    timeoutMs: A1_CHILD_TIMEOUT_MS,
    args: [
      "-p",
      sandboxProfile(
        projectRoot,
        repositorySandboxReadSet,
        [
          { kind: "literal", path: optionsPath },
          { kind: "literal", path: inputPath },
          { kind: "literal", path: anchorPath },
          { kind: "literal", path: normalizedPath },
          { kind: "subpath", path: temporaryPath },
        ],
        [temporaryPath],
      ),
      ENV_EXECUTABLE,
      "-i",
      `PATH=${SEALED_PATH}`,
      `HOME=${temporaryPath}`,
      `TMPDIR=${temporaryPath}`,
      "TSX_DISABLE_CACHE=1",
      NODE_EXECUTABLE,
      "--import",
      "tsx",
      SCORER_CLI_PATH,
      "--options",
      optionsPath,
      "--subtitle",
      inputPath,
      "--anchors",
      anchorPath,
      "--normalized-output",
      normalizedPath,
    ],
  };
}

function runSealedChild(request: A1SealedChildRequest): A1SealedChildResult {
  const result = spawnSync(request.executable, [...request.args], {
    cwd: request.cwd,
    // env(1) immediately clears this bootstrap value; the sealed child receives
    // only the exact assignments in request.args.
    env: { NODE_ENV: "production" },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: request.maximumStdoutBytes,
    timeout: request.timeoutMs,
    killSignal: "SIGKILL",
  });
  const rawStdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout ?? "");
  const rawStderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr ?? "");
  const errorCode = result.error && "code" in result.error ? result.error.code : null;
  const timedOut = errorCode === "ETIMEDOUT";
  const maxBufferExceeded = errorCode === "ENOBUFS";
  if (result.error && !timedOut && !maxBufferExceeded) {
    childFail("the sealed child process could not complete");
  }
  let stdoutTruncated = rawStdout.byteLength > request.maximumStdoutBytes;
  let stderrTruncated = rawStderr.byteLength > request.maximumStdoutBytes;
  if (maxBufferExceeded && !stdoutTruncated && !stderrTruncated) {
    const stdoutReachedBound = rawStdout.byteLength >= request.maximumStdoutBytes;
    const stderrReachedBound = rawStderr.byteLength >= request.maximumStdoutBytes;
    if (stdoutReachedBound !== stderrReachedBound) {
      stdoutTruncated = stdoutReachedBound;
      stderrTruncated = stderrReachedBound;
    } else {
      // ENOBUFS does not identify its stream. If captured lengths cannot do so
      // either, mark both conservatively rather than asserting completeness.
      stdoutTruncated = true;
      stderrTruncated = true;
    }
  }
  const stdout = Buffer.from(rawStdout.subarray(0, request.maximumStdoutBytes));
  const stderr = Buffer.from(rawStderr.subarray(0, request.maximumStdoutBytes));
  return {
    exitCode: result.status,
    signal: result.signal,
    timedOut,
    stdout,
    stderr,
    stdoutTruncated,
    stderrTruncated,
  };
}

function invokeChild(
  dependencies: A1OperatorDependencies,
  request: A1SealedChildRequest,
): A1SealedChildResult {
  let result: A1SealedChildResult;
  try {
    result = dependencies.runChild(request);
  } catch (error) {
    if (error instanceof A1OperatorError) throw error;
    childFail("the sealed child boundary failed");
  }
  if (
    (result.exitCode !== null && (!Number.isSafeInteger(result.exitCode) || result.exitCode < 0))
    || (result.signal !== null && typeof result.signal !== "string")
    || typeof result.timedOut !== "boolean"
    || !Buffer.isBuffer(result.stdout)
    || !Buffer.isBuffer(result.stderr)
    || (result.stdoutTruncated !== undefined && typeof result.stdoutTruncated !== "boolean")
    || (result.stderrTruncated !== undefined && typeof result.stderrTruncated !== "boolean")
    || result.stdout.byteLength > request.maximumStdoutBytes
    || result.stderr.byteLength > MAX_REPORT_BYTES
  ) childFail("the sealed child result is invalid or unbounded");
  return result;
}

function assertChildCompleted(result: A1SealedChildResult, label: string): void {
  if (result.timedOut) operatorFail("A1_OPERATOR_TIMEOUT", `${label} exceeded the frozen timeout`);
  if (result.signal !== null || result.exitCode === null) childFail(`${label} terminated without an exit code`);
  if (result.stdout.byteLength < 1) childFail(`${label} emitted no publication-safe stdout`);
}

interface A1PreflightCounts {
  overlapCount: number;
  exactDuplicateCount: number;
}

function preflightCounts(prepared: PreparedPrivateAuthority): A1PreflightCounts {
  const contract = prepared.authority.attestation.input_contract;
  try {
    const result = preflightSubtitleBytes(prepared.inputBytes, {
      format: contract.format,
      declaredDurationMs: prepared.authority.ledger.declared_duration_ms,
      expectedRawSha256: prepared.authority.ledger.source_raw_sha256,
      expectedCueCount: prepared.authority.ledger.cue_count,
      inputFileIntegrityAttested: true,
      contentCompleteness: contract.content_completeness.state,
      contentCompletenessBasis: contract.content_completeness.basis,
    });
    return {
      overlapCount: result.overlapCount,
      exactDuplicateCount: result.exactDuplicateCount,
    };
  } catch {
    oracleFail("the scoreable private source did not reproduce its frozen preflight counts");
  }
}

function validatePositiveHarnessReport(
  value: unknown,
  authority: A1SealedAuthority,
  lockSha256: string,
  normalizedSha256: string,
  preflight: A1PreflightCounts,
): void {
  const report = requireRecord(value, "eligible harness report");
  requireExactKeys(report, [
    "schema_version", "harness_version", "execution_class", "claim_scope", "status", "hashes",
    "counts", "versions", "classification", "network_attempts", "outcomes", "runtime",
  ], "eligible harness report");
  if (
    report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.execution_class !== "SEALED"
    || report.claim_scope !== "locked_cell_only"
    || report.status !== "pass"
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) oracleFail("eligible harness report identity is invalid");
  const hashes = requireRecord(report.hashes, "eligible harness hashes");
  requireExactKeys(hashes, [
    "attestation_sha256", "attestation_schema_sha256", "input_sha256", "video_id_sha256",
    "preflight_canonical_sha256", "expected_segments_sha256", "persisted_segments_sha256",
    "normalized_transcript_sha256", "normalized_transcript_schema_sha256", "benchmark_lock_sha256",
  ], "eligible harness hashes");
  if (
    hashes.attestation_sha256 !== authority.ledger.attestation_sha256
    || hashes.input_sha256 !== authority.ledger.source_raw_sha256
    || hashes.preflight_canonical_sha256 !== authority.ledger.source_canonical_sha256
    || hashes.normalized_transcript_sha256 !== normalizedSha256
    || hashes.benchmark_lock_sha256 !== lockSha256
    || hashes.expected_segments_sha256 !== hashes.persisted_segments_sha256
    || hashes.video_id_sha256 !== sha256Hex(authority.attestation.youtube_video_id)
  ) oracleFail("eligible harness hashes do not bind the sealed cell");
  for (const key of [
    "attestation_schema_sha256", "video_id_sha256", "expected_segments_sha256",
    "persisted_segments_sha256", "normalized_transcript_schema_sha256",
  ]) requireSha256(hashes[key], `eligible harness ${key}`);
  const counts = requireRecord(report.counts, "eligible harness counts");
  requireExactKeys(counts, [
    "attestation_part_count", "raw_byte_count", "normalized_text_character_count",
    "locked_cue_count", "declared_duration_ms", "last_cue_end_ms", "persisted_segment_count",
    "overlap_count", "exact_duplicate_count", "recovery_job_count",
    "transcript_provider_attempt_count", "enrichment_provider_attempt_count",
    "llm_provider_attempt_count", "provider_attempt_count", "network_attempt_count",
    "current_product_gap_count",
  ], "eligible harness counts");
  if (
    counts.attestation_part_count !== 6
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
  ) oracleFail("eligible harness counters do not satisfy the sealed oracle");
  const classification = requireRecord(report.classification, "eligible harness classification");
  requireExactKeys(
    classification,
    ["locked", "observed", "content_completeness", "content_completeness_basis"],
    "eligible harness classification",
  );
  const versions = requireRecord(report.versions, "eligible harness versions");
  requireExactKeys(versions, ["strict_preflight", "app_file_parser"], "eligible harness versions");
  if (
    classification.locked !== "eligible_supported"
    || classification.observed !== "eligible_supported"
    || classification.content_completeness
      !== authority.attestation.input_contract.content_completeness.state
    || classification.content_completeness_basis
      !== authority.attestation.input_contract.content_completeness.basis
    || versions.strict_preflight !== "1.0.0"
    || versions.app_file_parser !== "transcript-file-v1"
  ) oracleFail("eligible harness classification is invalid");
  validateNoActivityOutcomes(report.outcomes, true);
  validateRuntime(report.runtime);
}

function validateSupportedRejectionReport(
  value: unknown,
  authority: A1SealedAuthority,
  lockSha256: string,
  preflight: A1PreflightCounts,
): void {
  const report = requireRecord(value, "supported rejection report");
  requireExactKeys(report, [
    "schema_version", "harness_version", "execution_class", "claim_scope", "status", "hashes",
    "counts", "versions", "classification", "network_attempts", "outcomes", "runtime",
  ], "supported rejection report");
  if (
    report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.execution_class !== "SEALED"
    || report.claim_scope !== "locked_cell_only"
    || report.status !== "safe_rejection"
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) oracleFail("supported-class rejection identity is invalid");
  const hashes = requireRecord(report.hashes, "supported rejection hashes");
  requireExactKeys(hashes, [
    "attestation_sha256", "attestation_schema_sha256", "input_sha256", "video_id_sha256",
    "preflight_canonical_sha256", "normalized_transcript_schema_sha256", "benchmark_lock_sha256",
  ], "supported rejection hashes");
  if (
    hashes.attestation_sha256 !== authority.ledger.attestation_sha256
    || hashes.input_sha256 !== authority.ledger.source_raw_sha256
    || hashes.preflight_canonical_sha256 !== authority.ledger.source_canonical_sha256
    || hashes.benchmark_lock_sha256 !== lockSha256
    || hashes.video_id_sha256 !== sha256Hex(authority.attestation.youtube_video_id)
  ) oracleFail("supported-class rejection hashes do not bind the sealed cell");
  requireSha256(hashes.attestation_schema_sha256, "supported rejection attestation schema hash");
  requireSha256(hashes.normalized_transcript_schema_sha256, "supported rejection normalized schema hash");
  const counts = requireRecord(report.counts, "supported rejection counts");
  requireExactKeys(counts, [
    "attestation_part_count", "raw_byte_count", "normalized_text_character_count",
    "locked_cue_count", "declared_duration_ms", "last_cue_end_ms", "overlap_count",
    "exact_duplicate_count", "persisted_segment_count", "recovery_job_count",
    "enrichment_provider_attempt_count", "provider_attempt_count", "network_attempt_count",
    "current_product_gap_count",
  ], "supported rejection counts");
  if (
    counts.attestation_part_count !== 6
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
  ) oracleFail("supported-class rejection counters are invalid");
  const classification = requireRecord(report.classification, "supported rejection classification");
  requireExactKeys(
    classification,
    ["locked", "observed", "content_completeness", "content_completeness_basis"],
    "supported rejection classification",
  );
  const versions = requireRecord(report.versions, "supported rejection versions");
  requireExactKeys(versions, ["strict_preflight"], "supported rejection versions");
  if (
    classification.locked !== "expected_safe_rejection"
    || classification.observed !== "expected_safe_rejection"
    || classification.content_completeness
      !== authority.attestation.input_contract.content_completeness.state
    || classification.content_completeness_basis
      !== authority.attestation.input_contract.content_completeness.basis
    || versions.strict_preflight !== "1.0.0"
  ) oracleFail("supported-class rejection classification is invalid");
  validateNoActivityOutcomes(report.outcomes, false);
  validateRuntime(report.runtime);
}

function validateStructuralRejectionReport(value: unknown): void {
  const report = requireRecord(value, "structural rejection report");
  requireExactKeys(report, [
    "schema_version", "harness_version", "status", "error_code", "detail_code", "counts", "hashes",
    "network_attempts",
  ], "structural rejection report");
  const counts = requireRecord(report.counts, "structural rejection counts");
  const hashes = requireRecord(report.hashes, "structural rejection hashes");
  requireExactKeys(counts, ["network_attempt_count", "suppressed_console_count"], "structural counts");
  requireExactKeys(hashes, ["suppressed_console_sha256"], "structural hashes");
  if (
    report.schema_version !== "1.0"
    || report.harness_version !== "1.0.0"
    || report.status !== "fail"
    || report.error_code !== "PREFLIGHT_REJECTED"
    || report.detail_code !== "INVALID_STRUCTURE"
    || counts.network_attempt_count !== 0
    || !isNonNegativeInteger(counts.suppressed_console_count)
    || !Array.isArray(report.network_attempts)
    || report.network_attempts.length !== 0
  ) oracleFail("structural rejection did not match its predeclared oracle");
  requireSha256(hashes.suppressed_console_sha256, "structural suppressed-console hash");
}

function validateNoActivityOutcomes(value: unknown, eligible: boolean): void {
  const outcomes = requireRecord(value, "harness outcomes");
  const isolated = requireRecord(outcomes.isolated_a1_strategy, "isolated A1 outcome");
  const current = requireRecord(outcomes.current_product, "current-product outcome");
  requireExactKeys(outcomes, ["isolated_a1_strategy", "current_product"], "harness outcomes");
  requireExactKeys(
    isolated,
    eligible
      ? ["ingestion_invoked", "feasible", "exact_segment_match", "no_network_attempt", "no_provider_attempt"]
      : ["ingestion_invoked", "truthful_safe_rejection", "no_network_attempt", "no_provider_attempt"],
    "isolated A1 outcome",
  );
  requireExactKeys(current, ["ready", "known_gap_codes"], "current-product outcome");
  if (
    isolated.ingestion_invoked !== eligible
    || isolated.no_network_attempt !== true
    || isolated.no_provider_attempt !== true
    || (eligible && (isolated.feasible !== true || isolated.exact_segment_match !== true))
    || (!eligible && isolated.truthful_safe_rejection !== true)
    || current.ready !== false
    || !Array.isArray(current.known_gap_codes)
    || JSON.stringify(current.known_gap_codes) !== JSON.stringify(CURRENT_PRODUCT_GAP_CODES)
  ) oracleFail("harness outcomes do not preserve the no-activity boundary");
}

function validateRuntime(value: unknown): void {
  const runtime = requireRecord(value, "harness runtime");
  requireExactKeys(runtime, ["suppressed_console_count", "suppressed_console_sha256"], "harness runtime");
  if (!isNonNegativeInteger(runtime.suppressed_console_count)) oracleFail("runtime count is invalid");
  requireSha256(runtime.suppressed_console_sha256, "runtime suppressed-console hash");
  if (runtime.suppressed_console_count === 0 && runtime.suppressed_console_sha256 !== EMPTY_SHA256) {
    oracleFail("empty suppressed-console evidence has the wrong digest");
  }
}

function assertExpectedScoreOptions(
  options: A1PrivateScorerOptions,
  authority: A1SealedAuthority,
  normalizedHash: string,
  comparisonHash: string | null,
): void {
  const contract = authority.attestation.input_contract;
  if (
    options.format !== contract.format
    || options.declared_duration_ms !== authority.ledger.declared_duration_ms
    || options.expected_raw_sha256 !== authority.ledger.source_raw_sha256
    || options.expected_cue_count !== authority.ledger.cue_count
    || options.input_file_integrity_attested !== true
    || options.content_completeness !== contract.content_completeness.state
    || options.content_completeness_basis !== contract.content_completeness.basis
    || options.reference_role !== "a1_input_preservation_oracle"
    || options.expected_anchor_packet_sha256 !== authority.ledger.preparation_document_sha256
    || options.expected_normalized_transcript_sha256 !== normalizedHash
    || options.comparison_canonical_output_sha256 !== comparisonHash
  ) gate1Incomplete("Gate 1 scorer options differ from the sealed authority");
}

function assertScoreThresholds(
  summary: A1PrivateScoreSummary,
  stage: A1OperatorStage,
  authority: A1SealedAuthority,
): void {
  if (
    summary.preservation.token_preservation_rate < 0.95
    || summary.timestamp_anchors.match_rate < 0.90
    || summary.timestamp_anchors.actual_count !== authority.ledger.actual_anchor_count
    || summary.timestamp_anchors.base_target_count !== authority.ledger.base_anchor_target
    || !SHA256_PATTERN.test(summary.hashes.canonical_normalized_output_sha256)
    || summary.hashes.canonical_output_comparison
      !== (stage === "gate1-primary" ? "not_requested" : "verified_equal")
  ) oracleFail("the frozen scorer thresholds or comparison state failed");
}

function assertReceiptBinding(
  receipt: A1OperatorReceipt,
  seal: LockVerificationReport,
  itemId: A1ItemId,
  outcome: A1ExpectedOutcome,
  attemptClaimSha256: string,
  executionBoundary: A1ExecutionBoundary,
  hashes: A1OperatorReceipt["hashes"],
): void {
  const expectedHarnessExit = outcome === "structural_safe_rejection" ? 1 : 0;
  const expectedScorerExit = outcome === "eligible_pass" ? 0 : null;
  if (
    receipt.seal.content_commit !== seal.contentCommit
    || receipt.seal.seal_commit !== seal.sealCommit
    || receipt.seal.lock_sha256 !== seal.lockSha256
    || receipt.cell.stage !== "gate1-primary"
    || receipt.cell.item_id !== itemId
    || receipt.cell.expected_outcome !== outcome
    || receipt.execution_boundary !== executionBoundary
    || receipt.publication_eligible !== publicationEligibleFor(executionBoundary)
    || receipt.attempt_claim_sha256 !== attemptClaimSha256
    || receipt.process.harness_exit_code !== expectedHarnessExit
    || receipt.process.scorer_exit_code !== expectedScorerExit
    || JSON.stringify(receipt.hashes) !== JSON.stringify(hashes)
  ) gate1Incomplete("a Gate 1 receipt does not bind its exact fixed evidence");
}

function buildAttemptClaim(
  seal: LockVerificationReport,
  stage: A1OperatorStage,
  itemId: A1ItemId,
  expectedOutcome: A1ExpectedOutcome,
  executionBoundary: A1ExecutionBoundary,
): A1AttemptClaim {
  return {
    schema_version: "1.0",
    operator_version: A1_OPERATOR_VERSION,
    publication_eligible: publicationEligibleFor(executionBoundary),
    seal: {
      content_commit: seal.contentCommit,
      seal_commit: seal.sealCommit,
      lock_sha256: seal.lockSha256,
    },
    cell: { stage, item_id: itemId, expected_outcome: expectedOutcome },
    execution_contract: {
      identity_sha256: A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
      execution_boundary: executionBoundary,
      private_evidence_binding:
        "sealed_source_and_anchor_authorities_no_path_device_or_user_identifier",
    },
    scope: {
      uniqueness: A1_ATTEMPT_UNIQUENESS_SCOPE,
      residual_limitation: A1_ATTEMPT_RESIDUAL_LIMITATION,
    },
  };
}

function assertAttemptClaimBinding(
  claim: A1AttemptClaim,
  seal: LockVerificationReport,
  stage: A1OperatorStage,
  itemId: A1ItemId,
  expectedOutcome: A1ExpectedOutcome,
  executionBoundary: A1ExecutionBoundary,
): void {
  if (
    claim.seal.content_commit !== seal.contentCommit
    || claim.seal.seal_commit !== seal.sealCommit
    || claim.seal.lock_sha256 !== seal.lockSha256
    || claim.cell.stage !== stage
    || claim.cell.item_id !== itemId
    || claim.cell.expected_outcome !== expectedOutcome
    || claim.execution_contract.execution_boundary !== executionBoundary
    || claim.publication_eligible !== publicationEligibleFor(executionBoundary)
  ) gate1Incomplete("an attempt claim does not bind the exact sealed execution contract");
}

function attemptClaimPath(
  projectRoot: string,
  sealCommit: string,
  stage: A1OperatorStage,
  itemId: A1ItemId,
): string {
  return join(
    projectRoot,
    ...`${ATTEMPT_CLAIMS_ROOT}/${sealCommit}/${stage}/${itemId}.publication-safe.json`.split("/"),
  );
}

function attemptTerminalPath(
  projectRoot: string,
  sealCommit: string,
  stage: A1OperatorStage,
  itemId: A1ItemId,
): string {
  return join(
    projectRoot,
    ...`${ATTEMPT_TERMINALS_ROOT}/${sealCommit}/${stage}/${itemId}.publication-safe.json`.split("/"),
  );
}

function buildAttemptTerminalFailure(
  seal: LockVerificationReport,
  stage: A1OperatorStage,
  itemId: A1ItemId,
  expectedOutcome: A1ExpectedOutcome,
  executionBoundary: A1ExecutionBoundary,
  attemptClaimSha256: string,
  errorCode: A1OperatorErrorCode,
  harnessResult: A1SealedChildResult | null,
  scorerResult: A1SealedChildResult | null,
): A1AttemptTerminalFailure {
  return {
    schema_version: "1.0",
    operator_version: A1_OPERATOR_VERSION,
    seal: {
      content_commit: seal.contentCommit,
      seal_commit: seal.sealCommit,
      lock_sha256: seal.lockSha256,
    },
    cell: { stage, item_id: itemId, expected_outcome: expectedOutcome },
    execution_boundary: executionBoundary,
    publication_eligible: publicationEligibleFor(executionBoundary),
    attempt_claim_sha256: attemptClaimSha256,
    terminal: {
      state: "failed",
      error_code: errorCode,
      harness: childTerminalEvidence(harnessResult),
      scorer: childTerminalEvidence(scorerResult),
    },
    outcomes: {
      rerun_permitted: false,
      raw_child_content_published: false,
      claim_without_terminal_after_hard_termination: "aborted_no_pass",
    },
  };
}

function childTerminalEvidence(
  result: A1SealedChildResult | null,
): A1ChildTerminalEvidence | null {
  if (!result) return null;
  return {
    exit_code: result.exitCode,
    signal: result.signal,
    timed_out: result.timedOut,
    stdout_sha256: sha256Hex(result.stdout),
    stdout_byte_count: result.stdout.byteLength,
    stdout_truncated: result.stdoutTruncated ?? false,
    stderr_sha256: sha256Hex(result.stderr),
    stderr_byte_count: result.stderr.byteLength,
    stderr_truncated: result.stderrTruncated ?? false,
  };
}

function validateChildTerminalEvidence(value: unknown, label: string): void {
  if (value === null) return;
  const evidence = requireRecord(value, label);
  requireExactKeys(
    evidence,
    [
      "exit_code", "signal", "timed_out", "stdout_sha256", "stdout_byte_count",
      "stdout_truncated", "stderr_sha256", "stderr_byte_count", "stderr_truncated",
    ],
    label,
  );
  if (
    (evidence.exit_code !== null && !isNonNegativeInteger(evidence.exit_code))
    || (evidence.signal !== null && typeof evidence.signal !== "string")
    || typeof evidence.timed_out !== "boolean"
    || !isNonNegativeInteger(evidence.stdout_byte_count)
    || typeof evidence.stdout_truncated !== "boolean"
    || !isNonNegativeInteger(evidence.stderr_byte_count)
    || typeof evidence.stderr_truncated !== "boolean"
  ) oracleFail(`${label} semantics are invalid`);
  requireSha256(evidence.stdout_sha256, `${label} stdout hash`);
  requireSha256(evidence.stderr_sha256, `${label} stderr hash`);
}

function writeAttemptTerminalFailure(
  path: string,
  terminal: A1AttemptTerminalFailure,
): void {
  const bytes = Buffer.from(`${JSON.stringify(terminal, null, 2)}\n`, "utf8");
  parseA1AttemptTerminalFailure(bytes);
  writeExclusiveRepositoryFile(path, bytes, "A1_OPERATOR_TERMINAL_WRITE_FAILED");
}

function validateDatabaseEvidence(
  databasePath: string,
  normalizedTranscriptBytes: Uint8Array,
  authority: A1SealedAuthority,
): void {
  try {
    validateA1Database({
      databasePath,
      normalizedTranscriptBytes,
      itemId: authority.itemId,
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
    oracleFail("the SQLite evidence differs from the sealed semantic contract");
  }
}

interface SandboxReadPath {
  kind: "literal" | "subpath";
  path: string;
}

interface SandboxRepositoryReadSet {
  frozenDataPaths: readonly SandboxReadPath[];
  directoryDataPaths: readonly string[];
  ignoreDataPaths: readonly SandboxReadPath[];
}

function loadVerifiedSandboxReadSet(
  projectRoot: string,
  seal: LockVerificationReport,
): SandboxRepositoryReadSet {
  const nodeModulesPath = join(projectRoot, "node_modules");
  const nodeModulesInfo = lstatSync(nodeModulesPath);
  if (
    !nodeModulesInfo.isDirectory()
    || nodeModulesInfo.isSymbolicLink()
    || realpathSync(nodeModulesPath) !== nodeModulesPath
  ) throw new Error("production node_modules must be a canonical local directory");
  const lockAbsolutePath = repositoryLiteralPath(projectRoot, seal.lockPath);
  const lockBytes = readUniqueFile(lockAbsolutePath, MAX_REPORT_BYTES, "verified lock", false);
  if (sha256Hex(lockBytes) !== seal.lockSha256) throw new Error("lock changed after verification");
  const lock = parseLockJsonBytes(lockBytes);
  if (
    lock.content_commit !== seal.contentCommit
    || lock.frozen_files.length !== seal.verifiedFrozenFileCount
  ) throw new Error("lock and verifier report disagree");
  const executionContractPath = repositoryLiteralPath(projectRoot, A1_EXECUTION_CONTRACT_PATH);
  const executionContractBytes = readUniqueFile(
    executionContractPath,
    MAX_REPORT_BYTES,
    "A1 execution contract",
    false,
  );
  if (
    sha256Hex(executionContractBytes) !== A1_EXECUTION_CONTRACT_IDENTITY_SHA256
    || !lock.frozen_files.some((file) => (
      file.path === A1_EXECUTION_CONTRACT_PATH
      && file.sha256 === A1_EXECUTION_CONTRACT_IDENTITY_SHA256
    ))
  ) throw new Error("A1 execution contract is not the exact frozen identity artifact");
  const frozenDataPaths: SandboxReadPath[] = [{ kind: "literal", path: lockAbsolutePath }];
  for (const frozenFile of lock.frozen_files) {
    const absolutePath = repositoryLiteralPath(projectRoot, frozenFile.path);
    const bytes = readUniqueFile(absolutePath, MAX_DATABASE_BYTES, "frozen sandbox input", false);
    if (sha256Hex(bytes) !== frozenFile.sha256) throw new Error("frozen file changed after verification");
    frozenDataPaths.push({ kind: "literal", path: absolutePath });
  }
  const { directoryDataPaths, ignoreDataPaths } = collectRepositoryMetadataInputs(projectRoot);
  return Object.freeze({
    frozenDataPaths: Object.freeze(frozenDataPaths),
    directoryDataPaths: Object.freeze(directoryDataPaths),
    ignoreDataPaths: Object.freeze(ignoreDataPaths),
  });
}

function collectRepositoryMetadataInputs(projectRoot: string): {
  directoryDataPaths: string[];
  ignoreDataPaths: SandboxReadPath[];
} {
  const directories = new Set<string>([projectRoot]);
  const ignoreFiles = new Set<string>();
  const relativeRoots = [
    "src",
    "docs/feature-council/youtube-transcript-enrichment/audit",
    "docs/feature-council/youtube-transcript-enrichment/research",
    "docs/feature-council/youtube-transcript-enrichment/reviews",
    "docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness",
    "docs/feature-council/youtube-transcript-enrichment/spikes/model-harness",
    BENCHMARK_ROOT,
  ];
  const visit = (directory: string): void => {
    let info;
    try {
      info = lstatSync(directory);
      if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(directory) !== directory) return;
    } catch {
      return;
    }
    directories.add(directory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(absolutePath);
      if (entry.isFile() && entry.name === ".gitignore") {
        const ignoreInfo = lstatSync(absolutePath);
        if (
          ignoreInfo.isFile()
          && !ignoreInfo.isSymbolicLink()
          && ignoreInfo.nlink === 1
          && realpathSync(absolutePath) === absolutePath
        ) ignoreFiles.add(absolutePath);
      }
    }
  };
  const addIgnore = (directory: string): void => {
    directories.add(directory);
    const ignorePath = join(directory, ".gitignore");
    if (!pathEntryExists(ignorePath)) return;
    const info = lstatSync(ignorePath);
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || realpathSync(ignorePath) !== ignorePath) {
      throw new Error("unsafe repository ignore file");
    }
    ignoreFiles.add(ignorePath);
  };
  addIgnore(projectRoot);
  for (const relativeRoot of relativeRoots) {
    let ancestor = projectRoot;
    for (const segment of relativeRoot.split("/").slice(0, -1)) {
      ancestor = join(ancestor, segment);
      if (pathEntryExists(ancestor)) addIgnore(ancestor);
    }
    visit(repositoryLiteralPath(projectRoot, relativeRoot));
  }
  return {
    directoryDataPaths: [...directories].sort(),
    ignoreDataPaths: [...ignoreFiles].sort().map((path) => ({ kind: "literal", path })),
  };
}

function repositoryLiteralPath(projectRoot: string, relativePath: string): string {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) throw new Error("unsafe repository path");
  const absolutePath = join(projectRoot, ...relativePath.split("/"));
  if (!isWithin(projectRoot, absolutePath)) throw new Error("repository path escaped root");
  return absolutePath;
}

function sandboxProfile(
  projectRoot: string,
  repositorySandboxReadSet: SandboxRepositoryReadSet | null,
  cellReadPaths: readonly SandboxReadPath[],
  writablePaths: readonly string[],
): string {
  const commonReadPaths: SandboxReadPath[] = [
    // dyld's shared-cache CacheFinder enumerates the filesystem root before
    // resolving the otherwise explicit /System cache path on current macOS.
    { kind: "literal", path: "/" },
    { kind: "subpath", path: "/System" },
    { kind: "subpath", path: "/usr" },
    { kind: "subpath", path: "/bin" },
    { kind: "subpath", path: "/sbin" },
    { kind: "subpath", path: "/Library" },
    { kind: "subpath", path: "/opt/homebrew" },
    { kind: "subpath", path: "/private/etc" },
    { kind: "subpath", path: "/dev" },
    { kind: "subpath", path: join(projectRoot, "node_modules") },
    ...gitReadPaths(projectRoot),
  ];
  const developmentProjectReadPaths: SandboxReadPath[] = [
    { kind: "subpath", path: join(projectRoot, "src") },
    { kind: "subpath", path: join(projectRoot, ...`${BENCHMARK_ROOT}`.split("/")) },
    {
      kind: "subpath",
      path: join(
        projectRoot,
        ..."docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness".split("/"),
      ),
    },
    { kind: "literal", path: join(projectRoot, "package.json") },
    { kind: "literal", path: join(projectRoot, "tsconfig.json") },
  ];
  const projectReadPaths = repositorySandboxReadSet
    ? [...repositorySandboxReadSet.frozenDataPaths, ...repositorySandboxReadSet.ignoreDataPaths]
    : developmentProjectReadPaths;
  const expandedReadPaths = [...commonReadPaths, ...projectReadPaths, ...cellReadPaths]
    .flatMap(expandSandboxReadPath);
  const readRules = expandedReadPaths
    .map(({ kind, path }) => `(allow file-read* (${kind} "${escapeSandboxPath(path)}"))`);
  const ancestorMetadataRules = [...new Set([
    ...expandedReadPaths.map(({ path }) => path),
    ...writablePaths,
  ].flatMap(pathAncestorDirectories))]
    .map((path) => `(allow file-read-metadata (literal "${escapeSandboxPath(path)}"))`);
  const repositoryMetadataRules = repositorySandboxReadSet
    ? [
      `(allow file-read-metadata (subpath "${escapeSandboxPath(projectRoot)}"))`,
      ...repositorySandboxReadSet.directoryDataPaths
        .flatMap((path) => expandSandboxReadPath({ kind: "literal", path }))
        .map(({ path }) => `(allow file-read-data (literal "${escapeSandboxPath(path)}"))`),
    ]
    : [];
  const writeRules = writablePaths
    .flatMap((path) => expandSandboxReadPath({ kind: "subpath", path }))
    .map(({ path }) => `(allow file-write* (subpath "${escapeSandboxPath(path)}"))`);
  return [
    SANDBOX_BASE_PROFILE,
    `(allow file-write* (literal "/dev/null"))`,
    ...ancestorMetadataRules,
    ...new Set(repositoryMetadataRules),
    ...new Set(readRules),
    ...new Set(writeRules),
  ].join(" ");
}

function pathAncestorDirectories(path: string): string[] {
  const result: string[] = [];
  let current = dirname(resolve(path));
  while (current !== "/" && current !== dirname(current)) {
    result.push(current);
    current = dirname(current);
  }
  return result;
}

function expandSandboxReadPath(input: SandboxReadPath): SandboxReadPath[] {
  const absolute = resolve(input.path);
  const result: SandboxReadPath[] = [{ ...input, path: absolute }];
  try {
    const real = realpathSync(absolute);
    if (real !== absolute) result.push({ ...input, path: real });
  } catch {
    // Some system paths are platform-specific. The sealed macOS runner still
    // has an explicit rule; absent paths do not broaden the profile.
  }
  return result;
}

function gitReadPaths(projectRoot: string): SandboxReadPath[] {
  const dotGit = join(projectRoot, ".git");
  const result: SandboxReadPath[] = [{ kind: "literal", path: dotGit }];
  try {
    const info = lstatSync(dotGit);
    if (info.isDirectory() && !info.isSymbolicLink()) {
      result.push({ kind: "subpath", path: dotGit });
      return result;
    }
    const pointer = readFileSync(dotGit, "utf8");
    const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(pointer);
    if (!match) return result;
    const gitDirectory = resolve(projectRoot, match[1]!);
    result.push({ kind: "subpath", path: gitDirectory });
    const commonPointer = join(gitDirectory, "commondir");
    if (pathEntryExists(commonPointer)) {
      const commonRelative = readFileSync(commonPointer, "utf8").trim();
      if (commonRelative) result.push({ kind: "subpath", path: resolve(gitDirectory, commonRelative) });
    }
  } catch {
    // verifyLock remains the authority; this merely avoids broad home-directory reads.
  }
  return result;
}

function escapeSandboxPath(path: string): string {
  if (!isAbsolute(path) || path.includes("\0")) {
    operatorFail("A1_OPERATOR_ARGUMENT_INVALID", "sandbox allowlist path is invalid");
  }
  return path.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

type EvidenceSnapshot = ReadonlyMap<string, string>;

function snapshotPriorEvidence(
  projectRoot: string,
  privateRoot: string,
  writableSubtree: string,
): EvidenceSnapshot {
  const snapshot = new Map<string, string>();
  snapshotEvidenceTree(
    join(projectRoot, ...ATTEMPT_CLAIMS_ROOT.split("/")),
    "claims",
    writableSubtree,
    snapshot,
  );
  snapshotEvidenceTree(
    join(projectRoot, ...ATTEMPT_TERMINALS_ROOT.split("/")),
    "terminals",
    writableSubtree,
    snapshot,
  );
  snapshotEvidenceTree(join(privateRoot, "outputs"), "outputs", writableSubtree, snapshot);
  return snapshot;
}

function assertPriorEvidenceUnchanged(
  projectRoot: string,
  privateRoot: string,
  writableSubtree: string,
  before: EvidenceSnapshot,
): void {
  const after = snapshotPriorEvidence(projectRoot, privateRoot, writableSubtree);
  if (JSON.stringify([...before]) !== JSON.stringify([...after])) {
    oracleFail("a child process changed prior evidence outside its exact writable subtree");
  }
}

function snapshotEvidenceTree(
  root: string,
  label: string,
  excluded: string,
  snapshot: Map<string, string>,
): void {
  if (!pathEntryExists(root)) return;
  const visit = (current: string): void => {
    if (current === excluded || isWithin(excluded, current)) return;
    let info;
    try {
      info = lstatSync(current);
      if (info.isSymbolicLink() || realpathSync(current) !== current) throw new Error("unsafe path");
    } catch {
      oracleFail("prior evidence contains an unsafe path");
    }
    const key = `${label}/${relative(root, current).split(sep).join("/") || "."}`;
    if (info.isDirectory()) {
      snapshot.set(key, `directory:${info.mode & 0o777}`);
      for (const entry of readdirSync(current).sort()) visit(join(current, entry));
      return;
    }
    if (!info.isFile() || info.nlink !== 1 || info.size < 1 || info.size > MAX_DATABASE_BYTES) {
      const reason = !info.isFile()
        ? "not_regular"
        : info.nlink !== 1
          ? "unexpected_link_count"
          : info.size < 1
            ? "empty"
            : "oversized";
      oracleFail(
        `prior evidence contains an invalid or unbounded file (${reason}; evidence_key_sha256=${sha256Hex(Buffer.from(key, "utf8"))})`,
      );
    }
    snapshot.set(key, `file:${info.mode & 0o777}:${info.size}:${sha256Hex(readFileSync(current))}`);
  };
  visit(root);
}

function isOperatorErrorCode(value: unknown): value is A1OperatorErrorCode {
  return typeof value === "string" && [
    "A1_OPERATOR_ARGUMENT_INVALID",
    "A1_OPERATOR_SEAL_INVALID",
    "A1_OPERATOR_AUTHORITY_INVALID",
    "A1_OPERATOR_PRIVATE_ROOT_INVALID",
    "A1_OPERATOR_PRIVATE_EVIDENCE_INVALID",
    "A1_OPERATOR_ATTEMPT_CLAIM_EXISTS",
    "A1_OPERATOR_ATTEMPT_CLAIM_INVALID",
    "A1_OPERATOR_RERUN_REJECTED",
    "A1_OPERATOR_GATE1_INCOMPLETE",
    "A1_OPERATOR_CHILD_FAILED",
    "A1_OPERATOR_ORACLE_FAILED",
    "A1_OPERATOR_TIMEOUT",
    "A1_OPERATOR_TERMINAL_WRITE_FAILED",
    "A1_OPERATOR_WRITE_FAILED",
  ].includes(value);
}

function expectedOutcomeFor(authority: A1SealedAuthority): A1ExpectedOutcome {
  if (authority.ledger.state === "ready") return "eligible_pass";
  if (authority.ledger.state === "expected_supported_class_rejection") {
    return "supported_class_safe_rejection";
  }
  return "structural_safe_rejection";
}

function assertSealReport(report: LockVerificationReport): void {
  if (
    report.valid !== true
    || !GIT_COMMIT_PATTERN.test(report.contentCommit)
    || !GIT_COMMIT_PATTERN.test(report.sealCommit)
    || !SHA256_PATTERN.test(report.lockSha256)
  ) operatorFail("A1_OPERATOR_SEAL_INVALID", "the lock verifier returned an invalid seal binding");
}

function resolvePrivateRoot(suppliedRoot: string, projectRoot: string): string {
  if (!isAbsolute(suppliedRoot)) privateRootFail("private evidence root must be absolute");
  let root: string;
  try {
    const info = lstatSync(suppliedRoot);
    root = realpathSync(suppliedRoot);
    if (
      !info.isDirectory()
      || info.isSymbolicLink()
      || (info.mode & 0o777) !== 0o700
      || root !== resolve(suppliedRoot)
    ) throw new Error("unsafe root");
  } catch {
    privateRootFail("private evidence root must be an existing mode-0700 non-symlink directory");
  }
  if (
    root === projectRoot
    || isWithin(projectRoot, root)
    || isWithin(root, projectRoot)
  ) privateRootFail("private evidence root must be outside the repository");
  return root;
}

function resolveExistingDirectory(
  suppliedPath: string,
  privateMode: boolean,
  code: A1OperatorErrorCode,
): string {
  try {
    const resolved = resolve(suppliedPath);
    const real = realpathSync(resolved);
    const info = lstatSync(resolved);
    if (
      resolved !== real
      || !info.isDirectory()
      || info.isSymbolicLink()
      || (privateMode && (info.mode & 0o077) !== 0)
    ) throw new Error("unsafe directory");
    return real;
  } catch {
    operatorFail(code, "required directory is missing or unsafe");
  }
}

function ensureRepositoryClaimParent(projectRoot: string, targetParent: string): void {
  if (!isWithin(projectRoot, targetParent)) writeFail("repository claim parent escaped the project root");
  const segments = relative(projectRoot, targetParent).split(sep);
  let current = projectRoot;
  for (const segment of segments) {
    assertSafeSegment(segment);
    const parent = current;
    current = join(current, segment);
    let created = false;
    try {
      mkdirSync(current, { mode: 0o755 });
      created = true;
    } catch (error) {
      if (!isAlreadyExists(error)) writeFail("a repository claim parent could not be created");
    }
    assertRepositoryDirectory(current);
    if (created) {
      fsyncDirectory(parent);
      fsyncDirectory(current);
    }
  }
}

function assertRepositoryDirectory(path: string): void {
  try {
    const info = lstatSync(path);
    if (!info.isDirectory() || info.isSymbolicLink() || realpathSync(path) !== path) {
      throw new Error("unsafe directory");
    }
  } catch {
    writeFail("a repository claim directory is unsafe");
  }
}

function writeExclusiveRepositoryFile(
  path: string,
  bytes: Uint8Array,
  existsCode: A1OperatorErrorCode,
): void {
  let descriptor: number | null = null;
  let completed = false;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const info = fstatSync(descriptor);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o077) !== 0) {
      throw new Error("unsafe created repository file");
    }
    completed = true;
  } catch (error) {
    if (isAlreadyExists(error)) operatorFail(existsCode, "a canonical write-once record already exists");
    writeFail("an exclusive repository record could not be written");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  if (!completed) writeFail("an exclusive repository record was incomplete");
  fsyncDirectory(dirname(path));
}

function fsyncDirectory(path: string): void {
  let descriptor: number | null = null;
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY,
    );
    const info = fstatSync(descriptor);
    if (!info.isDirectory()) throw new Error("not a directory");
    fsyncSync(descriptor);
  } catch {
    writeFail("an evidence parent directory could not be synchronized durably");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function ensurePrivateParent(root: string, segments: readonly string[]): void {
  let current = root;
  for (const segment of segments) {
    assertSafeSegment(segment);
    const parent = current;
    current = join(current, segment);
    let created = false;
    try {
      mkdirSync(current, { mode: 0o700 });
      created = true;
    } catch (error) {
      if (!isAlreadyExists(error)) writeFail("a private output parent could not be created");
    }
    assertPrivateDirectory(current);
    if (created) {
      fsyncDirectory(parent);
      fsyncDirectory(current);
    }
  }
}

function createPrivateDirectoryExclusive(path: string): void {
  try {
    mkdirSync(path, { mode: 0o700 });
    chmodSync(path, 0o700);
  } catch {
    if (pathEntryExists(path)) {
      operatorFail("A1_OPERATOR_RERUN_REJECTED", "the fixed write-once cell was claimed concurrently");
    }
    writeFail("the private cell directory could not be created");
  }
  assertPrivateDirectory(path);
  fsyncDirectory(dirname(path));
  fsyncDirectory(path);
}

function assertPrivateDirectory(path: string): void {
  try {
    const info = lstatSync(path);
    if (
      !info.isDirectory()
      || info.isSymbolicLink()
      || (info.mode & 0o777) !== 0o700
      || realpathSync(path) !== path
    ) throw new Error("unsafe directory");
  } catch {
    writeFail("a private output directory is unsafe");
  }
}

function writeExclusivePrivateFile(path: string, bytes: Uint8Array): void {
  let descriptor: number | null = null;
  let completed = false;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    const info = fstatSync(descriptor);
    if (!info.isFile() || info.nlink !== 1 || (info.mode & 0o777) !== 0o600) {
      throw new Error("unsafe created file");
    }
    completed = true;
  } catch (error) {
    if (isAlreadyExists(error)) {
      operatorFail("A1_OPERATOR_RERUN_REJECTED", "a fixed write-once file already exists");
    }
    writeFail("an exclusive private evidence file could not be written");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  if (!completed) writeFail("an exclusive private evidence file was incomplete");
  fsyncDirectory(dirname(path));
}

function readUniquePrivateFile(path: string, maximumBytes: number, label: string): Buffer {
  return readUniqueFile(path, maximumBytes, label, true);
}

function readUniqueFile(
  path: string,
  maximumBytes: number,
  label: string,
  requirePrivate: boolean,
): Buffer {
  let descriptor: number | null = null;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (
      !before.isFile()
      || before.nlink !== 1
      || before.size < 1
      || before.size > maximumBytes
      || (requirePrivate && (before.mode & 0o077) !== 0)
      || realpathSync(path) !== path
    ) throw new Error("unsafe evidence file");
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    if (
      bytes.byteLength !== before.size
      || after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
    ) throw new Error("evidence changed while read");
    return bytes;
  } catch {
    if (requirePrivate) {
      return privateEvidenceFail(`${label} is missing, unsafe, or changed while read`);
    }
    return authorityFail(`${label} is missing, unsafe, or changed while read`);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function privatePath(root: string, relativePath: string): string {
  assertSafeRelativePath(relativePath);
  const result = join(root, ...relativePath.split("/"));
  if (!isWithin(root, result)) privateEvidenceFail("private evidence path escaped its root");
  return result;
}

function assertSafeRelativePath(path: string): void {
  if (
    !path
    || path.includes("\\")
    || path.includes("\0")
    || isAbsolute(path)
    || path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) privateEvidenceFail("a sealed private relative path is unsafe");
}

function assertSafeSegment(segment: string): void {
  if (!segment || segment === "." || segment === ".." || segment.includes(sep) || segment.includes("\0")) {
    writeFail("an output path segment is unsafe");
  }
}

function assertRejectedArtifactsAbsent(cellPath: string): void {
  for (const fileName of [
    "a1-normalized-transcript.private.json",
    "a1-score-options.private.json",
    "a1-score.publication-safe.json",
    "throwaway.sqlite",
  ]) {
    if (pathEntryExists(join(cellPath, fileName))) {
      oracleFail("a rejection control created a prohibited private artifact");
    }
  }
}

function assertExactDirectoryEntries(path: string, expected: readonly string[]): void {
  let actual: string[];
  try {
    assertPrivateDirectory(path);
    actual = readdirSync(path).sort();
  } catch (error) {
    if (error instanceof A1OperatorError) throw error;
    privateEvidenceFail("a fixed evidence cell is missing or unsafe");
  }
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    oracleFail("an evidence cell contains a missing or additional path");
  }
}

function rmdirPrivateTemporaryDirectory(path: string): void {
  try {
    assertPrivateDirectory(path);
    if (readdirSync(path).length !== 0) throw new Error("temporary directory is not empty");
    rmdirSync(path);
    fsyncDirectory(dirname(path));
  } catch {
    oracleFail("the sealed temporary directory was not empty after the child process");
  }
}

function parseStrictJson(bytes: Buffer, maximumBytes: number, label: string): unknown {
  if (bytes.byteLength < 1 || bytes.byteLength > maximumBytes) {
    oracleFail(`${label} is empty or exceeds its fixed bound`);
  }
  try {
    return parseJsonBytesWithoutDuplicateKeys(bytes);
  } catch {
    oracleFail(`${label} is not unambiguous UTF-8 JSON`);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    oracleFail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
): void {
  if (
    Object.keys(value).length !== keys.length
    || keys.some((key) => !Object.hasOwn(value, key))
  ) oracleFail(`${label} has missing or additional fields`);
}

function requireSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    oracleFail(`${label} is not lowercase SHA-256 hex`);
  }
}

function requireScoreableCompleteness(value: "complete" | "partial" | "unknown"): "complete" | "partial" {
  if (value !== "complete" && value !== "partial") authorityFail("eligible completeness is not scoreable");
  return value;
}

function requireScoreableBasis(
  value: "explicit_source_assertion" | "source_coverage_record" | "user_attestation" | "unknown",
): "explicit_source_assertion" | "source_coverage_record" | "user_attestation" {
  if (value === "unknown") authorityFail("eligible completeness basis is not scoreable");
  return value;
}

function isPrimaryItemId(value: unknown): value is A1ItemId {
  return typeof value === "string" && (A1_PRIMARY_ITEM_IDS as readonly string[]).includes(value);
}

function isPositiveItemId(value: unknown): value is A1PositiveItemId {
  return typeof value === "string" && (A1_POSITIVE_ITEM_IDS as readonly string[]).includes(value);
}

function isExpectedOutcome(value: unknown): value is A1ExpectedOutcome {
  return value === "eligible_pass"
    || value === "supported_class_safe_rejection"
    || value === "structural_safe_rejection";
}

function publicationEligibleFor(boundary: A1ExecutionBoundary): boolean {
  return boundary === "sealed_default_dependencies";
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isWithin(parent: string, candidate: string): boolean {
  const result = relative(parent, candidate);
  return result !== "" && result !== ".." && !result.startsWith(`..${sep}`) && !isAbsolute(result);
}

function pathEntryExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    writeFail("an output destination could not be inspected safely");
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isAlreadyExists(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function operatorFail(code: A1OperatorErrorCode, message: string): never {
  throw new A1OperatorError(code, message);
}

function authorityFail(message: string): never {
  operatorFail("A1_OPERATOR_AUTHORITY_INVALID", message);
}

function privateRootFail(message: string): never {
  operatorFail("A1_OPERATOR_PRIVATE_ROOT_INVALID", message);
}

function privateEvidenceFail(message: string): never {
  operatorFail("A1_OPERATOR_PRIVATE_EVIDENCE_INVALID", message);
}

function gate1Incomplete(message: string): never {
  operatorFail("A1_OPERATOR_GATE1_INCOMPLETE", message);
}

function childFail(message: string): never {
  operatorFail("A1_OPERATOR_CHILD_FAILED", message);
}

function oracleFail(message: string): never {
  operatorFail("A1_OPERATOR_ORACLE_FAILED", message);
}

function writeFail(message: string): never {
  operatorFail("A1_OPERATOR_WRITE_FAILED", message);
}

function isDirectInvocation(): boolean {
  return Boolean(process.argv[1])
    && resolve(process.argv[1]!) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    process.umask(0o077);
    const result = runSealedA1Cell(parseSealedA1CellCli(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof A1OperatorError ? error.code : "A1_OPERATOR_WRITE_FAILED";
    process.stderr.write(`${JSON.stringify({ state: "failed", code })}\n`);
    process.exitCode = 1;
  }
}
