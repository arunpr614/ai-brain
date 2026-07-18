import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

export const LOCK_VERIFIER_VERSION = "3.3.0";
export const DEFAULT_LOCK_PATH = "docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json";

export interface FrozenFileRecord {
  path: string;
  sha256: string;
}

export interface BenchmarkLock {
  schema_version: "1.4";
  protocol_version: "2.4";
  content_commit: string;
  seal_created_at: string;
  frozen_files: FrozenFileRecord[];
  corpus: {
    rights_screened_real_items: 10;
    real_unavailable_private_controls: 0;
    source_sidecar_records: 9;
    a1_preservation_reference_items: 5;
    safe_rejection_records: 4;
    independent_speech_reference_items: 0;
  };
  denominators: {
    a1_primary_positive_cells: 5;
    a1_expected_safe_rejection_cells: 4;
    a2_primary_cells: 0;
    a3_primary_positive_cells: 0;
    a3_expected_safe_rejection_cells: 0;
    rights_screened_real_items: 10;
  };
  gate_states: {
    gate_1: GateState;
    gate_2: GateState;
    gate_3: GateState;
    gate_4: GateState;
    gate_5: GateState;
    gate_6: GateState;
  };
  runtime: RuntimeRecord;
  limits: {
    max_videos: 12;
    max_acquisition_methods: 3;
    max_stt_methods: 2;
    max_models: 4;
    max_visual_methods: 1;
    max_recovery_attempts: 2;
    max_recovery_minutes: 60;
    max_spend_usd: 0;
    max_new_subscriptions: 0;
    max_a1_input_bytes: 2_000_000;
    max_a1_text_chars: 500_000;
    max_a1_cues: 7_200;
    max_duration_ms: 21_600_000;
  };
}

export type GateState = "eligible" | "not_triggered" | "eligible_conditional";

type A1CellState =
  | "eligible_supported"
  | "expected_structural_rejection"
  | "expected_supported_class_rejection"
  | "excluded_before_run_no_ingestible_sidecar";

type ReferenceLedgerState =
  | "ready"
  | "expected_structural_rejection"
  | "expected_supported_class_rejection";

interface MethodItemMatrixItem {
  item_id: string;
  rights_screened: true;
  authorized_ingestible_sidecar: boolean;
  independently_authorized_source_media: boolean;
  a1_cell_state: A1CellState;
  a2_cell_state: "excluded_before_run_no_editor_authorization";
  a3_cell_state: "excluded_before_run_gate_2_not_triggered";
  reference_ledger_state: ReferenceLedgerState | null;
}

interface MethodItemMatrix {
  $schema: "https://brain.arunp.in/schemas/youtube-method-item-matrix-v1.1.json";
  schema_version: "1.1";
  authority: "prospective_primary_method_item_and_gate_authority";
  items: MethodItemMatrixItem[];
  denominators: BenchmarkLock["denominators"];
  gate_2_trigger: {
    rule: "no_authorized_ingestible_sidecar_and_independently_authorized_source_media";
    qualifying_item_ids: ["YT-10"];
    qualifying_item_count: 1;
    corpus_item_count: 10;
    qualifying_percentage_basis_points: 1000;
    minimum_qualifying_item_count: 2;
    minimum_qualifying_percentage_basis_points: 2000;
    count_threshold_met: false;
    percentage_threshold_met: false;
    triggered: false;
    claim_scope: "prospective_corpus_work_allocation_not_prevalence";
  };
  gate_states: BenchmarkLock["gate_states"];
  conditional_gate_rules: {
    gate_3: "run_only_after_gate_1_passes";
    gate_4: "run_only_after_gates_1_and_3_pass_and_local_model_package_is_frozen";
    gate_5: "if_valid_gate_4_transcript_only_baseline_is_below_80_percent_due_solely_to_missing_visual_evidence_record_triggered_but_blocked_no_visual_method_or_media_sealed_no_post_result_addition";
  };
  conditional_artifacts: {
    gate_4_model_package_tree: string;
    gate_4_model_harness_tree: string;
  };
}

interface ReferenceLedgerItem {
  item_id: string;
  state: ReferenceLedgerState;
  reference_role: "a1_input_preservation_oracle" | "a1_safe_rejection_record";
  reference_independence: "not_independent_speech_reference" | "not_a_scoring_reference";
  attestation_sha256: string;
  source_raw_sha256: string;
  source_canonical_sha256: string | null;
  source_bytes: number;
  source_token_count: number | null;
  source_token_count_state:
    | "counted"
    | "not_scored_above_eligible_cap"
    | "not_scored_strict_preflight_rejection";
  normalized_text_character_count: number | null;
  cue_count: number;
  declared_duration_ms: number;
  last_cue_end_ms: number;
  distinct_timed_start_count: number | null;
  base_anchor_target: number;
  actual_anchor_count: number;
  preparation_document_sha256: string | null;
  preparation_private_relative_path: string | null;
  expected_class: "eligible_supported" | "expected_safe_rejection";
  preflight_state: "passed" | "rejected";
  preflight_error_code: "INVALID_STRUCTURE" | null;
  preflight_failure_cue_ordinal: number | null;
  content_completeness_state: "complete" | "partial" | "unknown";
  rights_review_state: "provisionally_allowed_for_private_benchmark_review_required";
  production_legal_policy_review_required: true;
}

interface ReferenceLedger {
  schema_version: "1.2";
  preparation_version: "1.2.0";
  preflight_version: "1.0.0";
  anchor_generator_version: "1.1.0";
  normalization_profile: "unicode-whitespace-v1";
  prepared_at: string;
  creation_procedure: "strict_preflight_then_deterministic_private_anchor_generation_no_candidate_output";
  independence_boundary: typeof REFERENCE_LEDGER_INDEPENDENCE_BOUNDARY;
  review: {
    status: "independent_prelock_review_complete";
    reviewer_role: "independent_adversarial_reviewer";
    reviewed_at: string;
    review_artifact_path: string;
  };
  items: ReferenceLedgerItem[];
}

export interface RuntimeRecord {
  node_version: string;
  v8_version: string;
  unicode_version: string;
  icu_version: string;
  tsx_version: string;
  platform: NodeJS.Platform;
  arch: string;
}

export interface LockVerificationOptions {
  repoRoot: string;
  lockPath?: string;
}

export interface LockDraftGenerationOptions {
  repoRoot: string;
  contentCommit: string;
  protocolVersion: string;
  sealCreatedAt: string;
  lockPath?: string;
}

export interface LockVerificationReport {
  verifierVersion: typeof LOCK_VERIFIER_VERSION;
  contentCommit: string;
  sealCommit: string;
  headCommit: string;
  lockPath: string;
  lockSha256: string;
  verifiedFrozenFileCount: number;
  valid: true;
}

export type LockVerificationErrorCode =
  | "INVALID_JSON"
  | "DUPLICATE_JSON_KEY"
  | "INVALID_SCHEMA"
  | "INVALID_PATH"
  | "NOT_A_GIT_REPOSITORY"
  | "CONTENT_COMMIT_MISSING"
  | "CONTENT_NOT_ANCESTOR"
  | "LOCK_UNCOMMITTED"
  | "LOCK_HISTORY_INVALID"
  | "SEAL_PARENT_MISMATCH"
  | "SEAL_CHANGESET_INVALID"
  | "LOCK_EXISTED_IN_CONTENT_COMMIT"
  | "RUNTIME_MISMATCH"
  | "FROZEN_FILE_MISSING"
  | "FROZEN_HASH_MISMATCH"
  | "FROZEN_SEAL_MISMATCH"
  | "FROZEN_HISTORY_MUTATION"
  | "FROZEN_WORKTREE_MISMATCH";

export class LockVerificationError extends Error {
  readonly code: LockVerificationErrorCode;

  constructor(code: LockVerificationErrorCode, message: string) {
    super(message);
    this.name = "LockVerificationError";
    this.code = code;
  }
}

const ROOT_KEYS = [
  "schema_version",
  "protocol_version",
  "content_commit",
  "seal_created_at",
  "frozen_files",
  "corpus",
  "denominators",
  "gate_states",
  "runtime",
  "limits",
] as const;

const DENOMINATOR_KEYS = [
  "a1_primary_positive_cells",
  "a1_expected_safe_rejection_cells",
  "a2_primary_cells",
  "a3_primary_positive_cells",
  "a3_expected_safe_rejection_cells",
  "rights_screened_real_items",
] as const;

const GATE_KEYS = [
  "gate_1",
  "gate_2",
  "gate_3",
  "gate_4",
  "gate_5",
  "gate_6",
] as const;

const RUNTIME_KEYS = [
  "node_version",
  "v8_version",
  "unicode_version",
  "icu_version",
  "tsx_version",
  "platform",
  "arch",
] as const;

const REFERENCE_LEDGER_ITEM_KEYS = [
  "item_id",
  "reference_role",
  "reference_independence",
  "attestation_sha256",
  "source_raw_sha256",
  "source_canonical_sha256",
  "source_bytes",
  "source_token_count",
  "source_token_count_state",
  "normalized_text_character_count",
  "cue_count",
  "declared_duration_ms",
  "last_cue_end_ms",
  "distinct_timed_start_count",
  "base_anchor_target",
  "actual_anchor_count",
  "preparation_document_sha256",
  "preparation_private_relative_path",
  "preflight_state",
  "preflight_error_code",
  "preflight_failure_cue_ordinal",
  "content_completeness_state",
  "expected_class",
  "rights_review_state",
  "production_legal_policy_review_required",
  "state",
] as const;

const REQUIRED_FROZEN_BASENAMES = [
  "BENCHMARK_PROTOCOL.md",
  "CORPUS_MANIFEST.md",
  "EVALUATOR_FORM.md",
  "LOCK.schema.json",
  "METHOD_ITEM_MATRIX.json",
  "METHOD_ITEM_MATRIX.md",
  "METHOD_ITEM_MATRIX.schema.json",
  "PRESEAL_READINESS.json",
  "PRESEAL_READINESS.schema.json",
  "REFERENCE_LEDGER.json",
  "REFERENCE_LEDGER.schema.json",
  "RUN_PLAN.md",
  "SAFETY_FIXTURES.json",
] as const;

const REQUIRED_A1_MODEL_ARTIFACTS = [
  {
    relativePath: "model/A1_EXECUTION_CONTRACT.json",
    sha256: "7601a0335c32c230ad13311ff88475102db52112a4f13c437742e13173a81f3e",
    identityField: "$schema",
    identity: "https://brain.arunp.in/schemas/youtube-a1-execution-contract-v1.json",
  },
  {
    relativePath: "model/A1_EXECUTION_CONTRACT.schema.json",
    sha256: "79bfe4332dea8d62520e9328cc4b78cbb8c935263506f8658ec2fda322bd18e1",
    identityField: "$id",
    identity: "https://brain.arunp.in/schemas/youtube-a1-execution-contract-v1.json",
  },
  {
    relativePath: "model/A1_OPERATOR_RECEIPT.schema.json",
    sha256: "21d7c4bda4eacdda796032304924a5a663517f319b9b181465bf627951bbfc14",
    identityField: "$id",
    identity: "https://brain.arunp.in/schemas/youtube-a1-operator-receipt-v1.1.json",
  },
  {
    relativePath: "model/A1_ATTEMPT_CLAIM.schema.json",
    sha256: "44309ab2a86a14834502d8dfdc01c88a0a7bdb103c12b4816eb81fa984631b72",
    identityField: "$id",
    identity: "https://brain.arunp.in/schemas/youtube-a1-attempt-claim-v1.json",
  },
  {
    relativePath: "model/A1_ATTEMPT_TERMINAL.schema.json",
    sha256: "b8f1ed573dd090c1e80deb241b6aeca3f770d0ac3834555774c3d1df0998275a",
    identityField: "$id",
    identity: "https://brain.arunp.in/schemas/youtube-a1-attempt-terminal-v1.json",
  },
] as const;

const REQUIRED_ROOT_FROZEN_PATHS = [
  "package-lock.json",
  "package.json",
  "tsconfig.json",
] as const;

const REQUIRED_PRODUCTION_MODULES = [
  "src/db/client.ts",
  "src/db/items.ts",
  "src/db/transcripts.ts",
  "src/lib/capture/transcripts/parse-file.ts",
  "src/lib/capture/transcripts/user-provided.ts",
] as const;

const REQUIRED_MODEL_RESEARCH_FILES = [
  "research/2026-07-16_model-screening-stop-record.md",
  "research/MODEL_COMPARISON.md",
] as const;

const LIMITS = Object.freeze({
  max_videos: 12,
  max_acquisition_methods: 3,
  max_stt_methods: 2,
  max_models: 4,
  max_visual_methods: 1,
  max_recovery_attempts: 2,
  max_recovery_minutes: 60,
  max_spend_usd: 0,
  max_new_subscriptions: 0,
  max_a1_input_bytes: 2_000_000,
  max_a1_text_chars: 500_000,
  max_a1_cues: 7_200,
  max_duration_ms: 21_600_000,
});

const SHA1_PATTERN = /^[0-9a-f]{40}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const EXPECTED_DENOMINATORS = Object.freeze({
  a1_primary_positive_cells: 5,
  a1_expected_safe_rejection_cells: 4,
  a2_primary_cells: 0,
  a3_primary_positive_cells: 0,
  a3_expected_safe_rejection_cells: 0,
  rights_screened_real_items: 10,
} satisfies BenchmarkLock["denominators"]);

const EXPECTED_GATE_STATES = Object.freeze({
  gate_1: "eligible",
  gate_2: "not_triggered",
  gate_3: "eligible_conditional",
  gate_4: "eligible_conditional",
  gate_5: "not_triggered",
  gate_6: "eligible",
} satisfies BenchmarkLock["gate_states"]);

const EXPECTED_CONDITIONAL_GATE_RULES = Object.freeze({
  gate_3: "run_only_after_gate_1_passes",
  gate_4: "run_only_after_gates_1_and_3_pass_and_local_model_package_is_frozen",
  gate_5: "if_valid_gate_4_transcript_only_baseline_is_below_80_percent_due_solely_to_missing_visual_evidence_record_triggered_but_blocked_no_visual_method_or_media_sealed_no_post_result_addition",
});

const EXPECTED_MATRIX_ITEM_IDS = Object.freeze(
  Array.from({ length: 10 }, (_, index) => `YT-${String(index + 1).padStart(2, "0")}`),
);
const EXPECTED_LEDGER_ITEM_IDS = Object.freeze(EXPECTED_MATRIX_ITEM_IDS.slice(0, 9));
const EXPECTED_PRESERVATION_ITEM_IDS = Object.freeze([
  "YT-01",
  "YT-02",
  "YT-07",
  "YT-08",
  "YT-09",
]);
const EXPECTED_A1_STATES: Readonly<Record<string, A1CellState>> = Object.freeze({
  "YT-01": "eligible_supported",
  "YT-02": "eligible_supported",
  "YT-03": "expected_structural_rejection",
  "YT-04": "expected_supported_class_rejection",
  "YT-05": "expected_structural_rejection",
  "YT-06": "expected_structural_rejection",
  "YT-07": "eligible_supported",
  "YT-08": "eligible_supported",
  "YT-09": "eligible_supported",
  "YT-10": "excluded_before_run_no_ingestible_sidecar",
});
const EXPECTED_LEDGER_STATES: Readonly<Record<string, ReferenceLedgerState>> = Object.freeze({
  "YT-01": "ready",
  "YT-02": "ready",
  "YT-03": "expected_structural_rejection",
  "YT-04": "expected_supported_class_rejection",
  "YT-05": "expected_structural_rejection",
  "YT-06": "expected_structural_rejection",
  "YT-07": "ready",
  "YT-08": "ready",
  "YT-09": "ready",
});
const EXPECTED_STRUCTURAL_FAILURE_ORDINALS: Readonly<Record<string, number>> = Object.freeze({
  "YT-03": 88,
  "YT-05": 723,
  "YT-06": 2,
});
const REFERENCE_LEDGER_INDEPENDENCE_BOUNDARY =
  "eligible_a1_inputs_are_preservation_oracles_not_independent_speech_references";
const PRESEAL_READINESS_SCHEMA =
  "https://brain.arunp.in/schemas/youtube-preseal-readiness-v1.json";
const PRESEAL_CLOSURE_MARKER = "prelock_review_closure_complete";
const PRESEAL_VALIDATION_KEYS = [
  "benchmark_tool_tests_passed",
  "benchmark_tool_tests_total",
  "a1_harness_tests_passed",
  "a1_harness_tests_total",
  "model_harness_tests_passed",
  "model_harness_tests_total",
  "targeted_tests_passed",
  "targeted_tests_total",
  "typecheck_passed",
  "targeted_lint_passed",
  "strict_schema_validation_passed",
  "markdown_links_passed",
  "privacy_scan_passed",
  "git_diff_check_passed",
] as const;
const PRESEAL_IMMUTABLE_AUTHORITIES = [
  "docs/feature-council/youtube-transcript-enrichment/benchmark/BENCHMARK_PROTOCOL.md",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/RUN_PLAN.md",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/METHOD_ITEM_MATRIX.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/REFERENCE_LEDGER.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/EVALUATOR_EXECUTION_CONTRACT.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/A1_EXECUTION_CONTRACT.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/A1_EXECUTION_CONTRACT.schema.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/A1_OPERATOR_RECEIPT.schema.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/A1_ATTEMPT_CLAIM.schema.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/model/A1_ATTEMPT_TERMINAL.schema.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/PRESEAL_READINESS.json",
  "docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json",
] as const;
const PRESEAL_MUTABLE_STATUS_DOCUMENTS = [
  "RUNNING_LOG.md",
  "docs/feature-council/youtube-transcript-enrichment/MASTER_EXECUTION_INDEX.md",
  "docs/feature-council/youtube-transcript-enrichment/TRACKER.md",
  "docs/feature-council/youtube-transcript-enrichment/DECISION_LOG.md",
  "docs/feature-council/youtube-transcript-enrichment/spikes/SPIKE_REGISTER.md",
  "docs/feature-council/youtube-transcript-enrichment/technical/RISK_REGISTER.md",
] as const;
const EXPECTED_GATE_2_INPUTS: Readonly<Record<string, readonly [boolean, boolean]>> = Object.freeze({
  "YT-01": [true, false],
  "YT-02": [true, false],
  "YT-03": [false, false],
  "YT-04": [false, false],
  "YT-05": [false, false],
  "YT-06": [false, false],
  "YT-07": [true, false],
  "YT-08": [true, false],
  "YT-09": [true, false],
  "YT-10": [false, true],
});
const requireFromVerifier = createRequire(import.meta.url);

export function getCurrentRuntimeRecord(): RuntimeRecord {
  let tsxVersion: unknown;
  try {
    const tsxPackage = requireFromVerifier("tsx/package.json") as unknown;
    tsxVersion = requireRecord(tsxPackage, "installed tsx package").version;
  } catch (error) {
    if (error instanceof LockVerificationError) throw error;
    throw new LockVerificationError(
      "RUNTIME_MISMATCH",
      "the installed tsx package version cannot be resolved",
    );
  }
  const unicodeVersion = process.versions.unicode;
  const icuVersion = process.versions.icu;
  if (
    typeof tsxVersion !== "string"
    || tsxVersion.length === 0
    || typeof unicodeVersion !== "string"
    || unicodeVersion.length === 0
    || typeof icuVersion !== "string"
    || icuVersion.length === 0
  ) {
    throw new LockVerificationError(
      "RUNTIME_MISMATCH",
      "Node, Unicode, ICU, and tsx runtime versions must all be available",
    );
  }
  return Object.freeze({
    node_version: process.versions.node,
    v8_version: process.versions.v8,
    unicode_version: unicodeVersion,
    icu_version: icuVersion,
    tsx_version: tsxVersion,
    platform: process.platform,
    arch: process.arch,
  });
}

export function parseLockJson(text: string): BenchmarkLock {
  const parsed = parseJsonWithoutDuplicateKeys(text);
  validateLockSchema(parsed);
  return parsed;
}

export function parseLockJsonBytes(bytes: Uint8Array): BenchmarkLock {
  const parsed = parseJsonBytesWithoutDuplicateKeys(bytes);
  validateLockSchema(parsed);
  return parsed;
}

export function parseJsonWithoutDuplicateKeys(text: string): unknown {
  if (typeof text !== "string") {
    throw new LockVerificationError("INVALID_JSON", "JSON content must be a string");
  }
  assertNoDuplicateJsonKeys(text);
  try {
    return JSON.parse(text);
  } catch {
    throw new LockVerificationError("INVALID_JSON", "content is not valid JSON");
  }
}

export function parseJsonBytesWithoutDuplicateKeys(bytes: Uint8Array): unknown {
  if (!(bytes instanceof Uint8Array)) {
    throw new LockVerificationError("INVALID_JSON", "JSON content must be bytes");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new LockVerificationError("INVALID_JSON", "JSON content is not valid UTF-8");
  }
  return parseJsonWithoutDuplicateKeys(text);
}

function parseSingleMarkdownVersion(text: string, field: "Protocol version" | "Protocol", label: string): string {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...text.matchAll(new RegExp(
    `^\\*\\*${escapedField}:\\*\\*\\s+([0-9]+(?:\\.[0-9]+)*)(?:<br>)?\\s*$`,
    "gm",
  ))];
  if (matches.length !== 1 || typeof matches[0][1] !== "string") {
    invalidSchema(`${label} must contain exactly one ${field} header`);
  }
  return matches[0][1];
}

export function generateLockDraft(options: LockDraftGenerationOptions): BenchmarkLock {
  if (!options || typeof options.repoRoot !== "string" || !options.repoRoot) {
    throw new LockVerificationError("INVALID_PATH", "repoRoot is required");
  }
  if (typeof options.contentCommit !== "string" || !SHA1_PATTERN.test(options.contentCommit)) {
    invalidSchema("contentCommit must be a full lowercase 40-character Git SHA");
  }
  if (typeof options.protocolVersion !== "string" || options.protocolVersion.trim().length === 0) {
    invalidSchema("protocolVersion must be a non-empty string");
  }
  if (typeof options.sealCreatedAt !== "string" || !isValidRfc3339(options.sealCreatedAt)) {
    invalidSchema("sealCreatedAt must be an explicit valid RFC 3339 date-time");
  }

  const repoRoot = resolveExactRepoRoot(options.repoRoot);
  const lockPath = options.lockPath ?? DEFAULT_LOCK_PATH;
  validateRelativeGitPath(lockPath, "lockPath");
  if (gitStatus(repoRoot, ["cat-file", "-e", `${options.contentCommit}^{commit}`]) !== 0) {
    throw new LockVerificationError(
      "CONTENT_COMMIT_MISSING",
      `content commit ${options.contentCommit} does not exist locally`,
    );
  }
  if (gitStatus(repoRoot, ["cat-file", "-e", `${options.contentCommit}:${lockPath}`]) === 0) {
    throw new LockVerificationError(
      "LOCK_EXISTED_IN_CONTENT_COMMIT",
      "LOCK.json must be absent from Commit A before draft generation",
    );
  }

  const benchmarkDirectory = gitPathDirectory(lockPath);
  const matrixPath = joinGitPath(benchmarkDirectory, "METHOD_ITEM_MATRIX.json");
  const ledgerPath = joinGitPath(benchmarkDirectory, "REFERENCE_LEDGER.json");
  const protocolPath = joinGitPath(benchmarkDirectory, "BENCHMARK_PROTOCOL.md");
  const runPlanPath = joinGitPath(benchmarkDirectory, "RUN_PLAN.md");
  const matrix = parseMethodItemMatrixJsonBytes(
    gitBytes(repoRoot, ["show", `${options.contentCommit}:${matrixPath}`], "FROZEN_FILE_MISSING"),
  );
  const ledger = parseReferenceLedgerJsonBytes(
    gitBytes(repoRoot, ["show", `${options.contentCommit}:${ledgerPath}`], "FROZEN_FILE_MISSING"),
  );
  const frozenProtocolVersion = parseSingleMarkdownVersion(
    gitBytes(repoRoot, ["show", `${options.contentCommit}:${protocolPath}`], "FROZEN_FILE_MISSING").toString("utf8"),
    "Protocol version",
    "BENCHMARK_PROTOCOL.md",
  );
  const frozenRunPlanProtocolVersion = parseSingleMarkdownVersion(
    gitBytes(repoRoot, ["show", `${options.contentCommit}:${runPlanPath}`], "FROZEN_FILE_MISSING").toString("utf8"),
    "Protocol",
    "RUN_PLAN.md",
  );
  requireExactValue(frozenProtocolVersion, "2.4", "Commit-A BENCHMARK_PROTOCOL.md version");
  requireExactValue(frozenRunPlanProtocolVersion, frozenProtocolVersion, "Commit-A RUN_PLAN.md protocol version");
  requireExactValue(options.protocolVersion, frozenProtocolVersion, "requested protocolVersion");
  const frozenFiles = collectCommitAFrozenPaths(repoRoot, options.contentCommit, lockPath)
    .map((path) => ({
      path,
      sha256: sha256(
        gitBytes(repoRoot, ["show", `${options.contentCommit}:${path}`], "FROZEN_FILE_MISSING"),
      ),
    }));

  const lock: BenchmarkLock = {
    schema_version: "1.4",
    protocol_version: "2.4",
    content_commit: options.contentCommit,
    seal_created_at: options.sealCreatedAt,
    frozen_files: frozenFiles,
    corpus: {
      rights_screened_real_items: 10,
      real_unavailable_private_controls: 0,
      source_sidecar_records: 9,
      a1_preservation_reference_items: 5,
      safe_rejection_records: 4,
      independent_speech_reference_items: 0,
    },
    denominators: { ...matrix.denominators },
    gate_states: { ...matrix.gate_states },
    runtime: getCurrentRuntimeRecord(),
    limits: { ...LIMITS },
  };

  requireExactValue(matrix.items.length, 10, "generated matrix item count");
  requireExactValue(ledger.items.length, 9, "generated reference-ledger item count");
  validateLockSchema(lock);
  requireFrozenArtifactsForLockPath(lock, lockPath);
  requireCommitAFrozenCoverage(repoRoot, lock, lockPath);
  verifyCommitAAuthorities(repoRoot, lock, lockPath);
  return lock;
}

export function verifyLock(options: LockVerificationOptions): LockVerificationReport {
  if (!options || typeof options.repoRoot !== "string" || !options.repoRoot) {
    throw new LockVerificationError("INVALID_PATH", "repoRoot is required");
  }
  const repoRoot = resolveExactRepoRoot(options.repoRoot);
  const lockPath = options.lockPath ?? DEFAULT_LOCK_PATH;
  validateRelativeGitPath(lockPath, "lockPath");
  const lockAbsolutePath = resolveWithinRepo(repoRoot, lockPath);
  assertRegularNonSymlink(lockAbsolutePath, "lock file", "LOCK_UNCOMMITTED");

  const lockBytes = readFileSync(lockAbsolutePath);
  const lock = parseLockJsonBytes(lockBytes);
  requireFrozenArtifactsForLockPath(lock, lockPath);
  verifyCurrentRuntime(lock.runtime);

  if (gitStatus(repoRoot, ["cat-file", "-e", `${lock.content_commit}^{commit}`]) !== 0) {
    throw new LockVerificationError(
      "CONTENT_COMMIT_MISSING",
      `content commit ${lock.content_commit} does not exist locally`,
    );
  }

  requireCommitAFrozenCoverage(repoRoot, lock, lockPath);
  verifyCommitAAuthorities(repoRoot, lock, lockPath);

  const headCommit = gitText(repoRoot, ["rev-parse", "HEAD"], "NOT_A_GIT_REPOSITORY");
  if (gitStatus(repoRoot, ["merge-base", "--is-ancestor", lock.content_commit, headCommit]) !== 0) {
    throw new LockVerificationError(
      "CONTENT_NOT_ANCESTOR",
      "content commit is not an ancestor of HEAD",
    );
  }

  const committedLock = gitBytes(repoRoot, ["show", `${headCommit}:${lockPath}`], "LOCK_UNCOMMITTED");
  if (!lockBytes.equals(committedLock)) {
    throw new LockVerificationError(
      "LOCK_UNCOMMITTED",
      "working-tree LOCK.json differs from the committed HEAD copy",
    );
  }

  const lockHistory = gitText(
    repoRoot,
    ["log", "--format=%H", "--", lockPath],
    "LOCK_HISTORY_INVALID",
  ).split("\n").filter(Boolean);
  if (lockHistory.length !== 1) {
    throw new LockVerificationError(
      "LOCK_HISTORY_INVALID",
      "LOCK.json must be added once in Commit B and never modified",
    );
  }
  const sealCommit = lockHistory[0];
  if (gitStatus(repoRoot, ["merge-base", "--is-ancestor", sealCommit, headCommit]) !== 0) {
    throw new LockVerificationError("LOCK_HISTORY_INVALID", "seal commit is not an ancestor of HEAD");
  }
  const sealChange = gitText(
    repoRoot,
    ["diff-tree", "--no-commit-id", "--name-status", "-r", sealCommit, "--", lockPath],
    "LOCK_HISTORY_INVALID",
  );
  if (sealChange !== `A\t${lockPath}`) {
    throw new LockVerificationError(
      "LOCK_HISTORY_INVALID",
      "Commit B must add a previously absent LOCK.json",
    );
  }

  const sealLineage = gitText(
    repoRoot,
    ["rev-list", "--parents", "-n", "1", sealCommit],
    "LOCK_HISTORY_INVALID",
  ).split(" ");
  if (sealLineage.length !== 2 || sealLineage[1] !== lock.content_commit) {
    throw new LockVerificationError(
      "SEAL_PARENT_MISMATCH",
      "Commit B must have Commit A as its single direct parent",
    );
  }

  validateSealChangeset(repoRoot, sealCommit, lockPath);

  if (gitStatus(repoRoot, ["cat-file", "-e", `${lock.content_commit}:${lockPath}`]) === 0) {
    throw new LockVerificationError(
      "LOCK_EXISTED_IN_CONTENT_COMMIT",
      "LOCK.json must not exist in Commit A",
    );
  }

  verifyProtectedPostSealState(
    repoRoot,
    lock.content_commit,
    headCommit,
    protectedCodePrefixes(lockPath),
  );

  for (const frozenFile of lock.frozen_files) {
    validateRelativeGitPath(frozenFile.path, "frozen file path");
    if (frozenFile.path === lockPath) {
      throw new LockVerificationError("INVALID_SCHEMA", "LOCK.json cannot hash itself");
    }

    const contentBytes = gitBytes(
      repoRoot,
      ["show", `${lock.content_commit}:${frozenFile.path}`],
      "FROZEN_FILE_MISSING",
    );
    if (sha256(contentBytes) !== frozenFile.sha256) {
      throw new LockVerificationError(
        "FROZEN_HASH_MISMATCH",
        `${frozenFile.path} does not match its Commit A SHA-256`,
      );
    }

    const sealBytes = gitBytes(
      repoRoot,
      ["show", `${sealCommit}:${frozenFile.path}`],
      "FROZEN_FILE_MISSING",
    );
    if (!sealBytes.equals(contentBytes)) {
      throw new LockVerificationError(
        "FROZEN_SEAL_MISMATCH",
        `${frozenFile.path} changed in Commit B`,
      );
    }

    const laterMutations = gitText(
      repoRoot,
      ["log", "--format=%H", `${lock.content_commit}..${headCommit}`, "--", frozenFile.path],
      "FROZEN_HISTORY_MUTATION",
    );
    if (laterMutations.length > 0) {
      throw new LockVerificationError(
        "FROZEN_HISTORY_MUTATION",
        `${frozenFile.path} was modified after Commit A`,
      );
    }

    const currentPath = resolveWithinRepo(repoRoot, frozenFile.path);
    assertRegularNonSymlink(currentPath, frozenFile.path, "FROZEN_FILE_MISSING");
    if (!readFileSync(currentPath).equals(contentBytes)) {
      throw new LockVerificationError(
        "FROZEN_WORKTREE_MISMATCH",
        `${frozenFile.path} differs from the frozen Commit A bytes`,
      );
    }
  }

  return Object.freeze({
    verifierVersion: LOCK_VERIFIER_VERSION,
    contentCommit: lock.content_commit,
    sealCommit,
    headCommit,
    lockPath,
    lockSha256: sha256(lockBytes),
    verifiedFrozenFileCount: lock.frozen_files.length,
    valid: true,
  });
}

function validateLockSchema(value: unknown): asserts value is BenchmarkLock {
  const lock = requireRecord(value, "LOCK.json root");
  requireExactKeys(lock, ROOT_KEYS, "LOCK.json root");
  if (lock.schema_version !== "1.4") invalidSchema("schema_version must equal 1.4");
  requireExactValue(lock.protocol_version, "2.4", "protocol_version");
  if (typeof lock.content_commit !== "string" || !SHA1_PATTERN.test(lock.content_commit)) {
    invalidSchema("content_commit must be a full lowercase 40-character Git SHA");
  }
  if (typeof lock.seal_created_at !== "string" || !isValidRfc3339(lock.seal_created_at)) {
    invalidSchema("seal_created_at must be a valid RFC 3339 date-time");
  }

  if (!Array.isArray(lock.frozen_files) || lock.frozen_files.length === 0) {
    invalidSchema("frozen_files must be a non-empty array");
  }
  const frozenPaths = new Set<string>();
  let priorPath = "";
  for (const [index, item] of lock.frozen_files.entries()) {
    const record = requireRecord(item, `frozen_files[${index}]`);
    requireExactKeys(record, ["path", "sha256"], `frozen_files[${index}]`);
    if (typeof record.path !== "string") invalidSchema(`frozen_files[${index}].path must be a string`);
    validateRelativeGitPath(record.path, `frozen_files[${index}].path`);
    if (record.path <= priorPath) {
      invalidSchema("frozen_files must be path-sorted and contain no duplicate paths");
    }
    priorPath = record.path;
    if (frozenPaths.has(record.path)) invalidSchema(`duplicate frozen path ${record.path}`);
    frozenPaths.add(record.path);
    if (typeof record.sha256 !== "string" || !SHA256_PATTERN.test(record.sha256)) {
      invalidSchema(`frozen_files[${index}].sha256 must be lowercase SHA-256 hex`);
    }
  }
  for (const requiredBasename of REQUIRED_FROZEN_BASENAMES) {
    if (![...frozenPaths].some((path) => path.split("/").at(-1) === requiredBasename)) {
      invalidSchema(`${requiredBasename} must be included in frozen_files`);
    }
  }

  const corpus = requireRecord(lock.corpus, "corpus");
  requireExactKeys(
    corpus,
    [
      "rights_screened_real_items",
      "real_unavailable_private_controls",
      "source_sidecar_records",
      "a1_preservation_reference_items",
      "safe_rejection_records",
      "independent_speech_reference_items",
    ],
    "corpus",
  );
  requireExactValue(corpus.rights_screened_real_items, 10, "corpus.rights_screened_real_items");
  requireExactValue(
    corpus.real_unavailable_private_controls,
    0,
    "corpus.real_unavailable_private_controls",
  );
  requireExactValue(corpus.source_sidecar_records, 9, "corpus.source_sidecar_records");
  requireExactValue(corpus.a1_preservation_reference_items, 5, "corpus.a1_preservation_reference_items");
  requireExactValue(corpus.safe_rejection_records, 4, "corpus.safe_rejection_records");
  requireExactValue(
    corpus.independent_speech_reference_items,
    0,
    "corpus.independent_speech_reference_items",
  );

  const denominators = requireRecord(lock.denominators, "denominators");
  requireExactKeys(denominators, DENOMINATOR_KEYS, "denominators");
  for (const key of DENOMINATOR_KEYS) {
    requireExactValue(denominators[key], EXPECTED_DENOMINATORS[key], `denominators.${key}`);
  }
  const gateStates = requireRecord(lock.gate_states, "gate_states");
  requireExactKeys(gateStates, GATE_KEYS, "gate_states");
  for (const key of GATE_KEYS) {
    requireExactValue(gateStates[key], EXPECTED_GATE_STATES[key], `gate_states.${key}`);
  }

  const runtime = requireRecord(lock.runtime, "runtime");
  requireExactKeys(runtime, RUNTIME_KEYS, "runtime");
  for (const key of RUNTIME_KEYS) {
    if (typeof runtime[key] !== "string" || runtime[key].length === 0) {
      invalidSchema(`runtime.${key} must be a non-empty string`);
    }
  }

  const limits = requireRecord(lock.limits, "limits");
  requireExactKeys(limits, Object.keys(LIMITS), "limits");
  for (const [key, expected] of Object.entries(LIMITS)) {
    if (limits[key] !== expected) invalidSchema(`limits.${key} must equal ${expected}`);
  }

  if (corpus.rights_screened_real_items !== denominators.rights_screened_real_items) {
    invalidSchema("corpus and denominator rights-screened real-item totals must be equal");
  }
}

function requireFrozenArtifactsForLockPath(lock: BenchmarkLock, lockPath: string): void {
  const benchmarkDirectory = gitPathDirectory(lockPath);
  const projectDirectory = gitPathDirectory(benchmarkDirectory);
  const inBenchmarkDirectory = (path: string): string => (
    joinGitPath(benchmarkDirectory, path)
  );
  const requiredPaths = [
    ...REQUIRED_FROZEN_BASENAMES.map(inBenchmarkDirectory),
    ...REQUIRED_A1_MODEL_ARTIFACTS.map(({ relativePath }) => (
      inBenchmarkDirectory(relativePath)
    )),
    inBenchmarkDirectory("tools/generate-anchors.ts"),
    inBenchmarkDirectory("tools/prepare-private-reference.ts"),
    inBenchmarkDirectory("tools/score-private-a1.ts"),
    inBenchmarkDirectory("tools/subtitle-preflight.ts"),
    inBenchmarkDirectory("tools/transcript-scorer.ts"),
    inBenchmarkDirectory("tools/verify-lock.ts"),
    joinGitPath(projectDirectory, "SOURCE_INVENTORY.md"),
    ...REQUIRED_MODEL_RESEARCH_FILES.map((path) => joinGitPath(projectDirectory, path)),
    ...REQUIRED_ROOT_FROZEN_PATHS,
    ...REQUIRED_PRODUCTION_MODULES,
  ];
  const frozenPaths = new Set(lock.frozen_files.map((record) => record.path));
  for (const requiredPath of requiredPaths) {
    if (!frozenPaths.has(requiredPath)) {
      throw new LockVerificationError(
        "INVALID_SCHEMA",
        `${requiredPath} must be frozen relative to LOCK.json`,
      );
    }
  }
}

function verifyCommitAA1ModelArtifacts(
  repoRoot: string,
  contentCommit: string,
  benchmarkDirectory: string,
): void {
  for (const artifact of REQUIRED_A1_MODEL_ARTIFACTS) {
    const artifactPath = joinGitPath(benchmarkDirectory, artifact.relativePath);
    const bytes = gitBytes(
      repoRoot,
      ["show", `${contentCommit}:${artifactPath}`],
      "FROZEN_FILE_MISSING",
    );
    if (sha256(bytes) !== artifact.sha256) {
      invalidSchema(`${artifactPath} does not match its required A1 contract identity`);
    }
    const parsed = requireRecord(
      parseJsonBytesWithoutDuplicateKeys(bytes),
      `${artifactPath} root`,
    );
    requireExactValue(
      parsed[artifact.identityField],
      artifact.identity,
      `${artifactPath}.${artifact.identityField}`,
    );
  }
}

function requireCommitAFrozenCoverage(
  repoRoot: string,
  lock: BenchmarkLock,
  lockPath: string,
): void {
  const requiredPaths = collectCommitAFrozenPaths(
    repoRoot,
    lock.content_commit,
    lockPath,
  );
  const frozenPaths = new Set(lock.frozen_files.map((record) => record.path));
  for (const requiredPath of requiredPaths) {
    if (!frozenPaths.has(requiredPath)) {
      throw new LockVerificationError(
        "INVALID_SCHEMA",
        `${requiredPath} is tracked at Commit A or explicitly required and must be frozen`,
      );
    }
  }
}

function collectCommitAFrozenPaths(
  repoRoot: string,
  contentCommit: string,
  lockPath: string,
): string[] {
  const benchmarkDirectory = gitPathDirectory(lockPath);
  const projectDirectory = gitPathDirectory(benchmarkDirectory);
  const scopedPaths = [
    benchmarkDirectory,
    joinGitPath(projectDirectory, "audit"),
    joinGitPath(projectDirectory, "research"),
    joinGitPath(projectDirectory, "reviews"),
    joinGitPath(projectDirectory, "spikes/a1-harness"),
    joinGitPath(projectDirectory, "spikes/model-harness"),
    "src",
  ];
  const trackedAtCommitA = gitBytes(
    repoRoot,
    ["ls-tree", "-rz", "--name-only", contentCommit, "--", ...scopedPaths],
    "FROZEN_FILE_MISSING",
  ).toString("utf8").split("\0").filter(Boolean);
  const requiredPaths = new Set([
    ...trackedAtCommitA,
    joinGitPath(projectDirectory, "SOURCE_INVENTORY.md"),
    ...REQUIRED_MODEL_RESEARCH_FILES.map((path) => joinGitPath(projectDirectory, path)),
    ...REQUIRED_ROOT_FROZEN_PATHS,
    ...REQUIRED_PRODUCTION_MODULES,
  ]);
  return [...requiredPaths].sort();
}

function protectedCodePrefixes(lockPath: string): string[] {
  const benchmarkDirectory = gitPathDirectory(lockPath);
  const projectDirectory = gitPathDirectory(benchmarkDirectory);
  return [
    "src",
    joinGitPath(benchmarkDirectory, "model"),
    joinGitPath(benchmarkDirectory, "tools"),
    joinGitPath(projectDirectory, "spikes/a1-harness"),
    joinGitPath(projectDirectory, "spikes/model-harness"),
  ];
}

function verifyProtectedPostSealState(
  repoRoot: string,
  contentCommit: string,
  headCommit: string,
  protectedPrefixes: readonly string[],
): void {
  const laterHistory = gitText(
    repoRoot,
    [
      "log",
      "--format=%H",
      "--full-history",
      `${contentCommit}..${headCommit}`,
      "--",
      ...protectedPrefixes,
    ],
    "FROZEN_HISTORY_MUTATION",
  );
  if (laterHistory.length > 0) {
    throw new LockVerificationError(
      "FROZEN_HISTORY_MUTATION",
      "a protected source, benchmark tool, or A1 harness path changed after Commit A",
    );
  }

  const worktreeState = gitBytes(
    repoRoot,
    [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--",
      ...protectedPrefixes,
    ],
    "FROZEN_WORKTREE_MISMATCH",
  );
  if (worktreeState.length > 0) {
    throw new LockVerificationError(
      "FROZEN_WORKTREE_MISMATCH",
      "a protected source, benchmark tool, or A1 harness path has a worktree change",
    );
  }
}

function verifyCurrentRuntime(expected: RuntimeRecord): void {
  const actual = getCurrentRuntimeRecord();
  for (const key of RUNTIME_KEYS) {
    if (actual[key] !== expected[key]) {
      throw new LockVerificationError(
        "RUNTIME_MISMATCH",
        `runtime.${key} does not match the sealed runtime`,
      );
    }
  }
}

export function parseMethodItemMatrixJson(text: string): MethodItemMatrix {
  const parsed = parseJsonWithoutDuplicateKeys(text);
  validateMethodItemMatrix(parsed);
  return parsed;
}

export function parseMethodItemMatrixJsonBytes(bytes: Uint8Array): MethodItemMatrix {
  const parsed = parseJsonBytesWithoutDuplicateKeys(bytes);
  validateMethodItemMatrix(parsed);
  return parsed;
}

export function parseReferenceLedgerJson(text: string): ReferenceLedger {
  const parsed = parseJsonWithoutDuplicateKeys(text);
  validateReferenceLedger(parsed);
  return parsed;
}

export function parseReferenceLedgerJsonBytes(bytes: Uint8Array): ReferenceLedger {
  const parsed = parseJsonBytesWithoutDuplicateKeys(bytes);
  validateReferenceLedger(parsed);
  return parsed;
}

function validateMethodItemMatrix(value: unknown): asserts value is MethodItemMatrix {
  const matrix = requireRecord(value, "METHOD_ITEM_MATRIX.json root");
  requireExactKeys(
    matrix,
    [
      "$schema",
      "schema_version",
      "authority",
      "items",
      "denominators",
      "gate_2_trigger",
      "gate_states",
      "conditional_gate_rules",
      "conditional_artifacts",
    ],
    "METHOD_ITEM_MATRIX.json root",
  );
  requireExactValue(
    matrix.$schema,
    "https://brain.arunp.in/schemas/youtube-method-item-matrix-v1.1.json",
    "METHOD_ITEM_MATRIX.json.$schema",
  );
  requireExactValue(matrix.schema_version, "1.1", "METHOD_ITEM_MATRIX.json.schema_version");
  requireExactValue(
    matrix.authority,
    "prospective_primary_method_item_and_gate_authority",
    "METHOD_ITEM_MATRIX.json.authority",
  );
  if (!Array.isArray(matrix.items) || matrix.items.length !== EXPECTED_MATRIX_ITEM_IDS.length) {
    invalidSchema("METHOD_ITEM_MATRIX.json must contain exactly ten rights-screened real items");
  }

  const matrixItems = matrix.items as unknown[];
  const seenIds = new Set<string>();
  let eligibleCount = 0;
  let safeRejectionCount = 0;
  let excludedCount = 0;
  const gate2QualifyingItemIds: string[] = [];
  for (const [index, valueAtIndex] of matrixItems.entries()) {
    const item = requireRecord(valueAtIndex, `METHOD_ITEM_MATRIX.json.items[${index}]`);
    requireExactKeys(
      item,
      [
        "item_id",
        "rights_screened",
        "authorized_ingestible_sidecar",
        "independently_authorized_source_media",
        "a1_cell_state",
        "a2_cell_state",
        "a3_cell_state",
        "reference_ledger_state",
      ],
      `METHOD_ITEM_MATRIX.json.items[${index}]`,
    );
    const expectedId = EXPECTED_MATRIX_ITEM_IDS[index];
    requireExactValue(item.item_id, expectedId, `METHOD_ITEM_MATRIX.json.items[${index}].item_id`);
    if (typeof item.item_id !== "string" || seenIds.has(item.item_id)) {
      invalidSchema("METHOD_ITEM_MATRIX.json item IDs must be unique");
    }
    seenIds.add(item.item_id);
    requireExactValue(item.rights_screened, true, `${expectedId}.rights_screened`);
    const expectedGate2Inputs = EXPECTED_GATE_2_INPUTS[expectedId];
    requireExactValue(
      item.authorized_ingestible_sidecar,
      expectedGate2Inputs[0],
      `${expectedId}.authorized_ingestible_sidecar`,
    );
    requireExactValue(
      item.independently_authorized_source_media,
      expectedGate2Inputs[1],
      `${expectedId}.independently_authorized_source_media`,
    );
    if (item.authorized_ingestible_sidecar === false && item.independently_authorized_source_media === true) {
      gate2QualifyingItemIds.push(expectedId);
    }
    const expectedA1State = EXPECTED_A1_STATES[expectedId];
    requireExactValue(item.a1_cell_state, expectedA1State, `${expectedId}.a1_cell_state`);
    requireExactValue(
      item.a2_cell_state,
      "excluded_before_run_no_editor_authorization",
      `${expectedId}.a2_cell_state`,
    );
    requireExactValue(
      item.a3_cell_state,
      "excluded_before_run_gate_2_not_triggered",
      `${expectedId}.a3_cell_state`,
    );
    const expectedLedgerState = EXPECTED_LEDGER_STATES[expectedId] ?? null;
    requireExactValue(
      item.reference_ledger_state,
      expectedLedgerState,
      `${expectedId}.reference_ledger_state`,
    );

    if (expectedA1State === "eligible_supported") eligibleCount += 1;
    else if (
      expectedA1State === "expected_structural_rejection"
      || expectedA1State === "expected_supported_class_rejection"
    ) safeRejectionCount += 1;
    else excludedCount += 1;
  }
  if (eligibleCount !== 5 || safeRejectionCount !== 4 || excludedCount !== 1) {
    invalidSchema("METHOD_ITEM_MATRIX.json must classify A1 as exactly 5 eligible, 4 safe rejection, and 1 excluded");
  }

  const denominators = requireRecord(matrix.denominators, "METHOD_ITEM_MATRIX.json.denominators");
  requireExactKeys(denominators, DENOMINATOR_KEYS, "METHOD_ITEM_MATRIX.json.denominators");
  const computedDenominators = {
    a1_primary_positive_cells: eligibleCount,
    a1_expected_safe_rejection_cells: safeRejectionCount,
    a2_primary_cells: 0,
    a3_primary_positive_cells: 0,
    a3_expected_safe_rejection_cells: 0,
    rights_screened_real_items: matrixItems.length,
  };
  for (const key of DENOMINATOR_KEYS) {
    requireExactValue(
      denominators[key],
      EXPECTED_DENOMINATORS[key],
      `METHOD_ITEM_MATRIX.json.denominators.${key}`,
    );
    requireExactValue(
      denominators[key],
      computedDenominators[key],
      `METHOD_ITEM_MATRIX.json computed denominator ${key}`,
    );
  }

  const gate2Trigger = requireRecord(matrix.gate_2_trigger, "METHOD_ITEM_MATRIX.json.gate_2_trigger");
  requireExactKeys(
    gate2Trigger,
    [
      "rule",
      "qualifying_item_ids",
      "qualifying_item_count",
      "corpus_item_count",
      "qualifying_percentage_basis_points",
      "minimum_qualifying_item_count",
      "minimum_qualifying_percentage_basis_points",
      "count_threshold_met",
      "percentage_threshold_met",
      "triggered",
      "claim_scope",
    ],
    "METHOD_ITEM_MATRIX.json.gate_2_trigger",
  );
  const qualifyingPercentageBasisPoints = Math.floor(
    (gate2QualifyingItemIds.length * 10_000) / matrixItems.length,
  );
  const countThresholdMet = gate2QualifyingItemIds.length >= 2;
  const percentageThresholdMet = qualifyingPercentageBasisPoints >= 2_000;
  const gate2Triggered = countThresholdMet && percentageThresholdMet;
  requireExactValue(
    gate2Trigger.rule,
    "no_authorized_ingestible_sidecar_and_independently_authorized_source_media",
    "METHOD_ITEM_MATRIX.json.gate_2_trigger.rule",
  );
  if (
    !Array.isArray(gate2Trigger.qualifying_item_ids)
    || gate2Trigger.qualifying_item_ids.length !== gate2QualifyingItemIds.length
    || gate2Trigger.qualifying_item_ids.some((itemId, index) => itemId !== gate2QualifyingItemIds[index])
  ) {
    invalidSchema("METHOD_ITEM_MATRIX.json gate-2 qualifying item IDs do not match the per-item booleans");
  }
  requireExactValue(gate2Trigger.qualifying_item_count, gate2QualifyingItemIds.length, "METHOD_ITEM_MATRIX.json.gate_2_trigger.qualifying_item_count");
  requireExactValue(gate2Trigger.corpus_item_count, matrixItems.length, "METHOD_ITEM_MATRIX.json.gate_2_trigger.corpus_item_count");
  requireExactValue(gate2Trigger.qualifying_percentage_basis_points, qualifyingPercentageBasisPoints, "METHOD_ITEM_MATRIX.json.gate_2_trigger.qualifying_percentage_basis_points");
  requireExactValue(gate2Trigger.minimum_qualifying_item_count, 2, "METHOD_ITEM_MATRIX.json.gate_2_trigger.minimum_qualifying_item_count");
  requireExactValue(gate2Trigger.minimum_qualifying_percentage_basis_points, 2_000, "METHOD_ITEM_MATRIX.json.gate_2_trigger.minimum_qualifying_percentage_basis_points");
  requireExactValue(gate2Trigger.count_threshold_met, countThresholdMet, "METHOD_ITEM_MATRIX.json.gate_2_trigger.count_threshold_met");
  requireExactValue(gate2Trigger.percentage_threshold_met, percentageThresholdMet, "METHOD_ITEM_MATRIX.json.gate_2_trigger.percentage_threshold_met");
  requireExactValue(gate2Trigger.triggered, gate2Triggered, "METHOD_ITEM_MATRIX.json.gate_2_trigger.triggered");
  requireExactValue(gate2Trigger.claim_scope, "prospective_corpus_work_allocation_not_prevalence", "METHOD_ITEM_MATRIX.json.gate_2_trigger.claim_scope");

  const gateStates = requireRecord(matrix.gate_states, "METHOD_ITEM_MATRIX.json.gate_states");
  requireExactKeys(gateStates, GATE_KEYS, "METHOD_ITEM_MATRIX.json.gate_states");
  for (const key of GATE_KEYS) {
    requireExactValue(
      gateStates[key],
      EXPECTED_GATE_STATES[key],
      `METHOD_ITEM_MATRIX.json.gate_states.${key}`,
    );
  }
  requireExactValue(
    gateStates.gate_2,
    gate2Triggered ? "eligible_conditional" : "not_triggered",
    "METHOD_ITEM_MATRIX.json derived gate_states.gate_2",
  );

  const conditionalGateRules = requireRecord(
    matrix.conditional_gate_rules,
    "METHOD_ITEM_MATRIX.json.conditional_gate_rules",
  );
  requireExactKeys(
    conditionalGateRules,
    ["gate_3", "gate_4", "gate_5"],
    "METHOD_ITEM_MATRIX.json.conditional_gate_rules",
  );
  for (const key of ["gate_3", "gate_4", "gate_5"] as const) {
    requireExactValue(
      conditionalGateRules[key],
      EXPECTED_CONDITIONAL_GATE_RULES[key],
      `METHOD_ITEM_MATRIX.json.conditional_gate_rules.${key}`,
    );
  }

  const conditionalArtifacts = requireRecord(
    matrix.conditional_artifacts,
    "METHOD_ITEM_MATRIX.json.conditional_artifacts",
  );
  requireExactKeys(
    conditionalArtifacts,
    ["gate_4_model_package_tree", "gate_4_model_harness_tree"],
    "METHOD_ITEM_MATRIX.json.conditional_artifacts",
  );
  for (const key of ["gate_4_model_package_tree", "gate_4_model_harness_tree"] as const) {
    if (typeof conditionalArtifacts[key] !== "string") {
      invalidSchema(`METHOD_ITEM_MATRIX.json.conditional_artifacts.${key} must be a path`);
    }
    validateRelativeGitPath(
      conditionalArtifacts[key] as string,
      `METHOD_ITEM_MATRIX.json.conditional_artifacts.${key}`,
    );
  }
}

function validateReferenceLedger(value: unknown): asserts value is ReferenceLedger {
  const ledger = requireRecord(value, "REFERENCE_LEDGER.json root");
  requireExactKeys(
    ledger,
    [
      "schema_version",
      "preparation_version",
      "preflight_version",
      "anchor_generator_version",
      "normalization_profile",
      "prepared_at",
      "creation_procedure",
      "independence_boundary",
      "review",
      "items",
    ],
    "REFERENCE_LEDGER.json root",
  );
  requireExactValue(ledger.schema_version, "1.2", "REFERENCE_LEDGER.json.schema_version");
  requireExactValue(ledger.preparation_version, "1.2.0", "REFERENCE_LEDGER.json.preparation_version");
  requireExactValue(ledger.preflight_version, "1.0.0", "REFERENCE_LEDGER.json.preflight_version");
  requireExactValue(
    ledger.anchor_generator_version,
    "1.1.0",
    "REFERENCE_LEDGER.json.anchor_generator_version",
  );
  requireExactValue(
    ledger.normalization_profile,
    "unicode-whitespace-v1",
    "REFERENCE_LEDGER.json.normalization_profile",
  );
  requireExactValue(
    ledger.creation_procedure,
    "strict_preflight_then_deterministic_private_anchor_generation_no_candidate_output",
    "REFERENCE_LEDGER.json.creation_procedure",
  );
  requireExactValue(
    ledger.independence_boundary,
    REFERENCE_LEDGER_INDEPENDENCE_BOUNDARY,
    "REFERENCE_LEDGER.json.independence_boundary",
  );
  if (typeof ledger.prepared_at !== "string" || !isValidRfc3339(ledger.prepared_at)) {
    invalidSchema("REFERENCE_LEDGER.json.prepared_at must be a valid RFC 3339 date-time");
  }

  const review = requireRecord(ledger.review, "REFERENCE_LEDGER.json.review");
  requireExactKeys(
    review,
    ["status", "reviewer_role", "reviewed_at", "review_artifact_path"],
    "REFERENCE_LEDGER.json.review",
  );
  requireExactValue(
    review.status,
    "independent_prelock_review_complete",
    "REFERENCE_LEDGER.json.review.status",
  );
  requireExactValue(
    review.reviewer_role,
    "independent_adversarial_reviewer",
    "REFERENCE_LEDGER.json.review.reviewer_role",
  );
  if (typeof review.reviewed_at !== "string" || !isValidRfc3339(review.reviewed_at)) {
    invalidSchema("REFERENCE_LEDGER.json.review.reviewed_at must be a completed RFC 3339 date-time");
  }
  if (
    typeof review.review_artifact_path !== "string"
    || !review.review_artifact_path.endsWith(".md")
  ) {
    invalidSchema("REFERENCE_LEDGER.json.review.review_artifact_path must identify a Markdown review");
  }
  validateRelativeGitPath(review.review_artifact_path as string, "REFERENCE_LEDGER.json review path");

  if (!Array.isArray(ledger.items) || ledger.items.length !== EXPECTED_LEDGER_ITEM_IDS.length) {
    invalidSchema("REFERENCE_LEDGER.json must contain exactly the nine source-sidecar preparation records");
  }
  const ledgerItems = ledger.items as unknown[];
  const seenIds = new Set<string>();
  for (const [index, valueAtIndex] of ledgerItems.entries()) {
    const item = requireRecord(valueAtIndex, `REFERENCE_LEDGER.json.items[${index}]`);
    requireExactKeys(
      item,
      REFERENCE_LEDGER_ITEM_KEYS,
      `REFERENCE_LEDGER.json.items[${index}]`,
    );
    const expectedId = EXPECTED_LEDGER_ITEM_IDS[index];
    requireExactValue(item.item_id, expectedId, `REFERENCE_LEDGER.json.items[${index}].item_id`);
    if (typeof item.item_id !== "string" || seenIds.has(item.item_id)) {
      invalidSchema("REFERENCE_LEDGER.json item IDs must be unique");
    }
    seenIds.add(item.item_id);
    const expectedState = EXPECTED_LEDGER_STATES[expectedId];
    requireExactValue(item.state, expectedState, `${expectedId}.state`);
    const isPreservationReference = expectedState === "ready";
    requireExactValue(item.reference_role, isPreservationReference ? "a1_input_preservation_oracle" : "a1_safe_rejection_record", `${expectedId}.reference_role`);
    requireExactValue(item.reference_independence, isPreservationReference ? "not_independent_speech_reference" : "not_a_scoring_reference", `${expectedId}.reference_independence`);
    requireExactValue(
      item.rights_review_state,
      "provisionally_allowed_for_private_benchmark_review_required",
      `${expectedId}.rights_review_state`,
    );
    requireExactValue(
      item.production_legal_policy_review_required,
      true,
      `${expectedId}.production_legal_policy_review_required`,
    );
    requireSha256(item.attestation_sha256, `${expectedId}.attestation_sha256`);
    requireSha256(item.source_raw_sha256, `${expectedId}.source_raw_sha256`);

    const isStructural = expectedState === "expected_structural_rejection";
    const isSupportedClassRejection = expectedState === "expected_supported_class_rejection";
    const expectedClass = expectedState === "ready" ? "eligible_supported" : "expected_safe_rejection";
    requireExactValue(item.expected_class, expectedClass, `${expectedId}.expected_class`);
    requireExactValue(item.preflight_state, isStructural ? "rejected" : "passed", `${expectedId}.preflight_state`);
    requireExactValue(
      item.preflight_error_code,
      isStructural ? "INVALID_STRUCTURE" : null,
      `${expectedId}.preflight_error_code`,
    );
    requireExactValue(
      item.preflight_failure_cue_ordinal,
      isStructural ? EXPECTED_STRUCTURAL_FAILURE_ORDINALS[expectedId] : null,
      `${expectedId}.preflight_failure_cue_ordinal`,
    );

    requireIntegerInRange(item.source_bytes, 1, LIMITS.max_a1_input_bytes, `${expectedId}.source_bytes`);
    requireIntegerInRange(item.cue_count, 1, 10_000, `${expectedId}.cue_count`);
    requireIntegerInRange(
      item.declared_duration_ms,
      1,
      LIMITS.max_duration_ms,
      `${expectedId}.declared_duration_ms`,
    );
    requireIntegerInRange(
      item.last_cue_end_ms,
      0,
      item.declared_duration_ms as number,
      `${expectedId}.last_cue_end_ms`,
    );
    const expectedBaseAnchorTarget = Math.max(
      10,
      Math.ceil((item.declared_duration_ms as number) / 300_000),
    );
    requireExactValue(
      item.base_anchor_target,
      expectedBaseAnchorTarget,
      `${expectedId}.base_anchor_target`,
    );
    if (!(item.content_completeness_state === "complete"
      || item.content_completeness_state === "partial"
      || item.content_completeness_state === "unknown")) {
      invalidSchema(`${expectedId}.content_completeness_state is invalid`);
    }

    if (isStructural) {
      requireExactValue(item.source_canonical_sha256, null, `${expectedId}.source_canonical_sha256`);
      requireExactValue(item.source_token_count, null, `${expectedId}.source_token_count`);
      requireExactValue(
        item.source_token_count_state,
        "not_scored_strict_preflight_rejection",
        `${expectedId}.source_token_count_state`,
      );
      requireExactValue(
        item.normalized_text_character_count,
        null,
        `${expectedId}.normalized_text_character_count`,
      );
      requireExactValue(
        item.distinct_timed_start_count,
        null,
        `${expectedId}.distinct_timed_start_count`,
      );
      requireExactValue(item.actual_anchor_count, 0, `${expectedId}.actual_anchor_count`);
      requireExactValue(
        item.preparation_document_sha256,
        null,
        `${expectedId}.preparation_document_sha256`,
      );
      requireExactValue(
        item.preparation_private_relative_path,
        null,
        `${expectedId}.preparation_private_relative_path`,
      );
      if ((item.preflight_failure_cue_ordinal as number) > (item.cue_count as number)) {
        invalidSchema(`${expectedId}.preflight_failure_cue_ordinal must not exceed cue_count`);
      }
      continue;
    }

    requireSha256(item.source_canonical_sha256, `${expectedId}.source_canonical_sha256`);
    requireIntegerInRange(item.source_token_count, 1, 50_000, `${expectedId}.source_token_count`);
    requireExactValue(item.source_token_count_state, "counted", `${expectedId}.source_token_count_state`);
    requireIntegerInRange(
      item.normalized_text_character_count,
      1,
      LIMITS.max_a1_text_chars,
      `${expectedId}.normalized_text_character_count`,
    );
    requireIntegerInRange(
      item.distinct_timed_start_count,
      1,
      item.cue_count as number,
      `${expectedId}.distinct_timed_start_count`,
    );
    requireSha256(item.preparation_document_sha256, `${expectedId}.preparation_document_sha256`);
    requireExactValue(
      item.preparation_private_relative_path,
      `references/${expectedId}.anchors.private.json`,
      `${expectedId}.preparation_private_relative_path`,
    );

    if (isSupportedClassRejection) {
      requireExactValue(expectedId, "YT-04", "supported-class rejection item identity");
      requireExactValue(item.content_completeness_state, "unknown", "YT-04.content_completeness_state");
      requireExactValue(item.actual_anchor_count, 0, "YT-04.actual_anchor_count");
      if ((item.cue_count as number) <= LIMITS.max_a1_cues) {
        invalidSchema("YT-04 cue_count must exceed the sealed 7,200-cue supported-class limit");
      }
      continue;
    }

    if ((item.cue_count as number) > LIMITS.max_a1_cues) {
      invalidSchema(`${expectedId}.cue_count must remain inside the sealed supported class`);
    }
    if (!(item.content_completeness_state === "complete" || item.content_completeness_state === "partial")) {
      invalidSchema(`${expectedId}.content_completeness_state must be complete or partial`);
    }
    requireIntegerInRange(
      item.distinct_timed_start_count,
      3,
      item.cue_count as number,
      `${expectedId}.distinct_timed_start_count`,
    );
    requireExactValue(
      item.actual_anchor_count,
      Math.min(expectedBaseAnchorTarget, item.distinct_timed_start_count as number),
      `${expectedId}.actual_anchor_count`,
    );
  }
}

function verifyCommitAReferenceContracts(
  repoRoot: string,
  contentCommit: string,
  benchmarkDirectory: string,
  ledger: ReferenceLedger,
): void {
  const ledgerById = new Map(ledger.items.map((item) => [item.item_id, item]));
  const attestedSourceContracts = new Map<string, {
    owner: unknown;
    sourcePageUrl: unknown;
  }>();
  for (const expectedId of EXPECTED_LEDGER_ITEM_IDS) {
    const ledgerItem = ledgerById.get(expectedId);
    if (!ledgerItem) invalidSchema(`${expectedId} must have a reference-ledger record`);
    const attestationPath = joinGitPath(benchmarkDirectory, `attestations/${expectedId}.json`);
    const attestationBytes = gitBytes(
      repoRoot,
      ["show", `${contentCommit}:${attestationPath}`],
      "FROZEN_FILE_MISSING",
    );
    requireExactValue(
      sha256(attestationBytes),
      ledgerItem.attestation_sha256,
      `${expectedId} Commit-A attestation hash`,
    );
    const attestation = requireRecord(
      parseJsonBytesWithoutDuplicateKeys(attestationBytes),
      `${expectedId} attestation root`,
    );
    requireExactKeys(
      attestation,
      [
        "schema_version",
        "item_id",
        "youtube_video_id",
        "attested_at",
        "content_rights",
        "transcript_rights",
        "source",
        "input_contract",
        "retention_and_derivation",
        "attribution",
        "version_equivalence",
        "claims_boundary",
      ],
      `${expectedId} attestation root`,
    );
    requireExactValue(attestation.schema_version, "1.2", `${expectedId} attestation schema_version`);
    requireExactValue(attestation.item_id, expectedId, `${expectedId} attestation item_id`);
    if (typeof attestation.attested_at !== "string" || !isValidRfc3339(attestation.attested_at)) {
      invalidSchema(`${expectedId} attested_at must be a valid RFC 3339 date-time`);
    }
    if (Date.parse(attestation.attested_at as string) > Date.parse(ledger.prepared_at)) {
      invalidSchema(`${expectedId} attestation must precede reference-ledger preparation`);
    }

    for (const rightsField of ["content_rights", "transcript_rights"] as const) {
      const rights = requireRecord(attestation[rightsField], `${expectedId}.${rightsField}`);
      requireExactKeys(
        rights,
        ["state", "evidence_url", "rationale", "review_required"],
        `${expectedId}.${rightsField}`,
      );
      requireExactValue(
        rights.state,
        ledgerItem.rights_review_state,
        `${expectedId}.${rightsField}.state`,
      );
      requireExactValue(rights.review_required, true, `${expectedId}.${rightsField}.review_required`);
    }

    const source = requireRecord(attestation.source, `${expectedId}.source`);
    requireExactKeys(
      source,
      ["owner", "source_page_url", "sidecar_url", "sidecar_sha256", "private_relative_path"],
      `${expectedId}.source`,
    );
    requireExactValue(
      source.sidecar_sha256,
      ledgerItem.source_raw_sha256,
      `${expectedId}.source.sidecar_sha256`,
    );
    if (typeof source.owner !== "string" || source.owner.length === 0) {
      invalidSchema(`${expectedId}.source.owner must be nonempty`);
    }
    if (typeof source.source_page_url !== "string" || !source.source_page_url.startsWith("https://")) {
      invalidSchema(`${expectedId}.source.source_page_url must be an HTTPS URL`);
    }
    attestedSourceContracts.set(expectedId, {
      owner: source.owner,
      sourcePageUrl: source.source_page_url,
    });
    if (typeof source.private_relative_path !== "string") {
      invalidSchema(`${expectedId}.source.private_relative_path must be a path`);
    }
    validateRelativeGitPath(
      source.private_relative_path as string,
      `${expectedId}.source.private_relative_path`,
    );
    if (!(source.private_relative_path as string).startsWith("inputs/")) {
      invalidSchema(`${expectedId}.source.private_relative_path must stay under inputs/`);
    }

    const inputContract = requireRecord(attestation.input_contract, `${expectedId}.input_contract`);
    requireExactKeys(
      inputContract,
      [
        "format",
        "language_tag",
        "declared_duration_ms",
        "expected_cue_count",
        "last_cue_end_ms",
        "content_completeness",
        "expected_class",
      ],
      `${expectedId}.input_contract`,
    );
    if (!(inputContract.format === "srt" || inputContract.format === "vtt")) {
      invalidSchema(`${expectedId}.input_contract.format must be srt or vtt`);
    }
    if (!(source.private_relative_path as string).endsWith(`.${inputContract.format}`)) {
      invalidSchema(`${expectedId} source path extension must match the attested format`);
    }
    requireExactValue(
      inputContract.declared_duration_ms,
      ledgerItem.declared_duration_ms,
      `${expectedId}.input_contract.declared_duration_ms`,
    );
    requireExactValue(
      inputContract.expected_cue_count,
      ledgerItem.cue_count,
      `${expectedId}.input_contract.expected_cue_count`,
    );
    requireExactValue(
      inputContract.last_cue_end_ms,
      ledgerItem.last_cue_end_ms,
      `${expectedId}.input_contract.last_cue_end_ms`,
    );
    requireExactValue(
      inputContract.expected_class,
      ledgerItem.expected_class,
      `${expectedId}.input_contract.expected_class`,
    );
    const completeness = requireRecord(
      inputContract.content_completeness,
      `${expectedId}.input_contract.content_completeness`,
    );
    requireExactKeys(
      completeness,
      ["state", "basis", "rationale"],
      `${expectedId}.input_contract.content_completeness`,
    );
    requireExactValue(
      completeness.state,
      ledgerItem.content_completeness_state,
      `${expectedId}.input_contract.content_completeness.state`,
    );
  }

  const authorizationPath = joinGitPath(
    benchmarkDirectory,
    "model/LOCAL_DERIVATION_AUTHORIZATION.json",
  );
  const authorization = requireRecord(
    parseJsonBytesWithoutDuplicateKeys(
      gitBytes(
        repoRoot,
        ["show", `${contentCommit}:${authorizationPath}`],
        "FROZEN_FILE_MISSING",
      ),
    ),
    "LOCAL_DERIVATION_AUTHORIZATION.json root",
  );
  requireExactKeys(
    authorization,
    ["schema_version", "prepared_at", "authorization_scope", "review_boundary", "items"],
    "LOCAL_DERIVATION_AUTHORIZATION.json root",
  );
  requireExactValue(
    authorization.schema_version,
    "1.0",
    "LOCAL_DERIVATION_AUTHORIZATION.json.schema_version",
  );
  if (!Array.isArray(authorization.items)
    || authorization.items.length !== EXPECTED_PRESERVATION_ITEM_IDS.length) {
    invalidSchema("LOCAL_DERIVATION_AUTHORIZATION.json must contain exactly five eligible A1 items");
  }
  for (const [index, authorizationValue] of (authorization.items as unknown[]).entries()) {
    const expectedId = EXPECTED_PRESERVATION_ITEM_IDS[index];
    const authorizationItem = requireRecord(
      authorizationValue,
      `LOCAL_DERIVATION_AUTHORIZATION.json.items[${index}]`,
    );
    requireExactKeys(
      authorizationItem,
      [
        "item_id",
        "attestation_path",
        "attestation_sha256",
        "source_raw_sha256",
        "official_source_page_url",
        "rights_evidence_url",
        "source_owner",
        "authorized_derivations",
        "evaluator_excerpt",
        "retention",
        "claims_boundary",
      ],
      `LOCAL_DERIVATION_AUTHORIZATION.json.items[${index}]`,
    );
    requireExactValue(authorizationItem.item_id, expectedId, `${expectedId} authorization item_id`);
    requireExactValue(
      authorizationItem.attestation_path,
      joinGitPath(benchmarkDirectory, `attestations/${expectedId}.json`),
      `${expectedId} authorization attestation_path`,
    );
    const ledgerItem = ledgerById.get(expectedId);
    if (!ledgerItem || ledgerItem.state !== "ready") {
      invalidSchema(`${expectedId} authorization must map to an eligible reference-ledger item`);
    }
    requireExactValue(
      authorizationItem.attestation_sha256,
      ledgerItem.attestation_sha256,
      `${expectedId} authorization attestation_sha256`,
    );
    requireExactValue(
      authorizationItem.source_raw_sha256,
      ledgerItem.source_raw_sha256,
      `${expectedId} authorization source_raw_sha256`,
    );
    const attestedSource = attestedSourceContracts.get(expectedId);
    if (!attestedSource) invalidSchema(`${expectedId} attested source contract is missing`);
    requireExactValue(
      authorizationItem.official_source_page_url,
      attestedSource.sourcePageUrl,
      `${expectedId} authorization official_source_page_url`,
    );
    requireExactValue(
      authorizationItem.source_owner,
      attestedSource.owner,
      `${expectedId} authorization source_owner`,
    );
  }
}

function verifyCommitAAuthorities(
  repoRoot: string,
  lock: BenchmarkLock,
  lockPath: string,
): void {
  const benchmarkDirectory = gitPathDirectory(lockPath);
  const projectDirectory = gitPathDirectory(benchmarkDirectory);
  const matrixPath = joinGitPath(benchmarkDirectory, "METHOD_ITEM_MATRIX.json");
  const ledgerPath = joinGitPath(benchmarkDirectory, "REFERENCE_LEDGER.json");
  const readinessPath = joinGitPath(benchmarkDirectory, "PRESEAL_READINESS.json");
  const runtimeLedgerPath = joinGitPath(
    benchmarkDirectory,
    "model/LOCAL_MODEL_RUNTIME_LEDGER.json",
  );
  const protocolPath = joinGitPath(benchmarkDirectory, "BENCHMARK_PROTOCOL.md");
  const runPlanPath = joinGitPath(benchmarkDirectory, "RUN_PLAN.md");
  verifyCommitAA1ModelArtifacts(repoRoot, lock.content_commit, benchmarkDirectory);
  const matrix = parseMethodItemMatrixJsonBytes(
    gitBytes(repoRoot, ["show", `${lock.content_commit}:${matrixPath}`], "FROZEN_FILE_MISSING"),
  );
  const ledger = parseReferenceLedgerJsonBytes(
    gitBytes(repoRoot, ["show", `${lock.content_commit}:${ledgerPath}`], "FROZEN_FILE_MISSING"),
  );
  const readiness = validatePresealReadiness(
    parseJsonBytesWithoutDuplicateKeys(
      gitBytes(
        repoRoot,
        ["show", `${lock.content_commit}:${readinessPath}`],
        "FROZEN_FILE_MISSING",
      ),
    ),
  );
  validateRuntimeLedgerChronology(
    parseJsonBytesWithoutDuplicateKeys(
      gitBytes(
        repoRoot,
        ["show", `${lock.content_commit}:${runtimeLedgerPath}`],
        "FROZEN_FILE_MISSING",
      ),
    ),
  );
  verifyCommitAReferenceContracts(repoRoot, lock.content_commit, benchmarkDirectory, ledger);
  const protocolText = gitBytes(
    repoRoot,
    ["show", `${lock.content_commit}:${protocolPath}`],
    "FROZEN_FILE_MISSING",
  ).toString("utf8");
  const frozenProtocolVersion = parseSingleMarkdownVersion(
    protocolText,
    "Protocol version",
    "BENCHMARK_PROTOCOL.md",
  );
  const frozenRunPlanProtocolVersion = parseSingleMarkdownVersion(
    gitBytes(repoRoot, ["show", `${lock.content_commit}:${runPlanPath}`], "FROZEN_FILE_MISSING").toString("utf8"),
    "Protocol",
    "RUN_PLAN.md",
  );
  requireExactValue(lock.protocol_version, frozenProtocolVersion, "LOCK.json protocol-version reconciliation");
  requireExactValue(frozenRunPlanProtocolVersion, frozenProtocolVersion, "RUN_PLAN.md protocol-version reconciliation");
  const requiredReadyChecklistLines = [
    "- [x] Scorers, schemas, safety fixtures, reference ledger, write-once A1 operator, Gate 3 generator/verifier, exact-five packet/result/adjudication contracts, deterministic aggregate/Gate 5 calculator, evaluator execution contract/runner, local model package/harness, pre-seal readiness authority, candidate-tree inventory, and exact run plan complete and internally validated.",
    "- [x] Protocol and all lock inputs pass independent adversarial review.",
  ];
  for (const checklistLine of requiredReadyChecklistLines) {
    if (!protocolText.split("\n").includes(checklistLine)) {
      invalidSchema(`BENCHMARK_PROTOCOL.md pre-seal checklist is incomplete: ${checklistLine.slice(6)}`);
    }
  }

  for (const key of DENOMINATOR_KEYS) {
    requireExactValue(
      lock.denominators[key],
      matrix.denominators[key],
      `LOCK.json denominators.${key} reconciliation`,
    );
  }
  for (const key of GATE_KEYS) {
    requireExactValue(
      lock.gate_states[key],
      matrix.gate_states[key],
      `LOCK.json gate_states.${key} reconciliation`,
    );
  }
  requireExactValue(
    lock.corpus.rights_screened_real_items,
    matrix.items.length,
    "LOCK.json rights-screened real-item reconciliation",
  );
  requireExactValue(lock.corpus.source_sidecar_records, ledger.items.length, "LOCK.json source-sidecar-record reconciliation");
  const preservationReferenceCount = ledger.items.filter((item) => item.state === "ready").length;
  const safeRejectionRecordCount = ledger.items.filter((item) => item.state !== "ready").length;
  requireExactValue(lock.corpus.a1_preservation_reference_items, preservationReferenceCount, "LOCK.json A1-preservation-reference reconciliation");
  requireExactValue(lock.corpus.safe_rejection_records, safeRejectionRecordCount, "LOCK.json safe-rejection-record reconciliation");

  const ledgerById = new Map(ledger.items.map((item) => [item.item_id, item]));
  for (const matrixItem of matrix.items) {
    const ledgerItem = ledgerById.get(matrixItem.item_id);
    if (matrixItem.reference_ledger_state === null) {
      if (ledgerItem) invalidSchema(`${matrixItem.item_id} must be absent from REFERENCE_LEDGER.json`);
      continue;
    }
    if (!ledgerItem || ledgerItem.state !== matrixItem.reference_ledger_state) {
      invalidSchema(`${matrixItem.item_id} matrix and reference-ledger states do not reconcile`);
    }
  }

  const expectedModelPackageTree = joinGitPath(benchmarkDirectory, "model");
  const expectedModelHarnessTree = joinGitPath(projectDirectory, "spikes/model-harness");
  requireExactValue(
    matrix.conditional_artifacts.gate_4_model_package_tree,
    expectedModelPackageTree,
    "Gate 4 model-package tree",
  );
  requireExactValue(
    matrix.conditional_artifacts.gate_4_model_harness_tree,
    expectedModelHarnessTree,
    "Gate 4 model-harness tree",
  );

  const frozenPaths = new Set(lock.frozen_files.map((record) => record.path));
  requireNonemptyTrackedFrozenTree(
    repoRoot,
    lock.content_commit,
    expectedModelPackageTree,
    frozenPaths,
  );
  requireNonemptyTrackedFrozenTree(
    repoRoot,
    lock.content_commit,
    expectedModelHarnessTree,
    frozenPaths,
  );

  const reviewPath = ledger.review.review_artifact_path;
  const expectedReviewPrefix = `${joinGitPath(projectDirectory, "reviews")}/`;
  if (!reviewPath.startsWith(expectedReviewPrefix)) {
    invalidSchema("REFERENCE_LEDGER.json review artifact must be inside the project reviews tree");
  }
  if (Date.parse(ledger.review.reviewed_at) > Date.parse(lock.seal_created_at)) {
    invalidSchema("REFERENCE_LEDGER.json independent review must complete before seal creation");
  }
  requireExactValue(
    readiness.reviewPath,
    reviewPath,
    "PRESEAL_READINESS.json and REFERENCE_LEDGER.json review artifact reconciliation",
  );
  if (Date.parse(readiness.validatedAt) > Date.parse(ledger.review.reviewed_at)) {
    invalidSchema("PRESEAL_READINESS.json validation must complete before independent review closure");
  }
  if (
    gitStatus(repoRoot, ["cat-file", "-e", `${lock.content_commit}:${reviewPath}`]) !== 0
    || !frozenPaths.has(reviewPath)
  ) {
    invalidSchema("REFERENCE_LEDGER.json completed review artifact must exist at Commit A and be frozen");
  }
  const reviewText = gitBytes(
    repoRoot,
    ["show", `${lock.content_commit}:${reviewPath}`],
    "FROZEN_FILE_MISSING",
  ).toString("utf8");
  if (!reviewText.split(/\r?\n/).includes(`**Machine closure marker:** ${readiness.closureMarker}`)) {
    invalidSchema("independent pre-lock review artifact is missing the required same-reviewer closure marker");
  }

  const primaryEvidenceAtCommitA = gitBytes(
    repoRoot,
    [
      "ls-tree",
      "-rz",
      "--name-only",
      lock.content_commit,
      "--",
      joinGitPath(projectDirectory, "decisions"),
      joinGitPath(projectDirectory, "council"),
    ],
    "FROZEN_FILE_MISSING",
  ).toString("utf8").split("\0").filter(Boolean);
  if (primaryEvidenceAtCommitA.length !== 0) {
    invalidSchema("Commit A must not contain primary decision, Gate 3, Gate 4, Gate 6, or council output");
  }
}

function validatePresealReadiness(value: unknown): {
  validatedAt: string;
  reviewPath: string;
  closureMarker: string;
} {
  const readiness = requireRecord(value, "PRESEAL_READINESS.json root");
  requireExactKeys(
    readiness,
    [
      "$schema",
      "schema_version",
      "authority",
      "status",
      "validated_at",
      "validation",
      "independent_review",
      "prohibitions",
      "authority_boundary",
    ],
    "PRESEAL_READINESS.json root",
  );
  requireExactValue(readiness.$schema, PRESEAL_READINESS_SCHEMA, "PRESEAL_READINESS.json $schema");
  requireExactValue(readiness.schema_version, "1.0", "PRESEAL_READINESS.json schema_version");
  requireExactValue(
    readiness.authority,
    "commit_a_preseal_readiness_and_governance_boundary",
    "PRESEAL_READINESS.json authority",
  );
  requireExactValue(readiness.status, "ready_for_commit_a", "PRESEAL_READINESS.json status");
  if (typeof readiness.validated_at !== "string" || !isValidRfc3339(readiness.validated_at)) {
    invalidSchema("PRESEAL_READINESS.json validated_at must be valid RFC 3339");
  }

  const validation = requireRecord(readiness.validation, "PRESEAL_READINESS.json validation");
  requireExactKeys(validation, PRESEAL_VALIDATION_KEYS, "PRESEAL_READINESS.json validation");
  const suitePairs = [
    ["benchmark_tool_tests_passed", "benchmark_tool_tests_total"],
    ["a1_harness_tests_passed", "a1_harness_tests_total"],
    ["model_harness_tests_passed", "model_harness_tests_total"],
  ] as const;
  let derivedTargetedTotal = 0;
  for (const [passedKey, totalKey] of suitePairs) {
    requireIntegerInRange(validation[passedKey], 1, Number.MAX_SAFE_INTEGER, `validation.${passedKey}`);
    requireIntegerInRange(validation[totalKey], 1, Number.MAX_SAFE_INTEGER, `validation.${totalKey}`);
    requireExactValue(validation[passedKey], validation[totalKey], `validation.${passedKey} reconciliation`);
    derivedTargetedTotal += validation[totalKey] as number;
  }
  requireExactValue(
    validation.targeted_tests_total,
    derivedTargetedTotal,
    "validation.targeted_tests_total derived sum",
  );
  requireExactValue(
    validation.targeted_tests_passed,
    derivedTargetedTotal,
    "validation.targeted_tests_passed derived sum",
  );
  for (const key of PRESEAL_VALIDATION_KEYS.slice(8)) {
    requireExactValue(validation[key], true, `validation.${key}`);
  }

  const review = requireRecord(readiness.independent_review, "PRESEAL_READINESS.json independent_review");
  requireExactKeys(
    review,
    ["artifact_path", "same_reviewer_required", "required_closure_marker"],
    "PRESEAL_READINESS.json independent_review",
  );
  if (typeof review.artifact_path !== "string") {
    invalidSchema("PRESEAL_READINESS.json independent_review.artifact_path must be a string");
  }
  validateRelativeGitPath(review.artifact_path, "PRESEAL_READINESS.json independent_review.artifact_path");
  requireExactValue(review.same_reviewer_required, true, "independent_review.same_reviewer_required");
  requireExactValue(
    review.required_closure_marker,
    PRESEAL_CLOSURE_MARKER,
    "independent_review.required_closure_marker",
  );

  const prohibitions = requireRecord(readiness.prohibitions, "PRESEAL_READINESS.json prohibitions");
  requireExactKeys(
    prohibitions,
    [
      "primary_outputs_present",
      "lock_present_at_commit_a",
      "request_counter_scope",
      "primary_benchmark_external_requests",
      "primary_benchmark_provider_calls",
      "model_inference_calls",
      "incremental_spend_usd",
    ],
    "PRESEAL_READINESS.json prohibitions",
  );
  requireExactValue(prohibitions.primary_outputs_present, false, "prohibitions.primary_outputs_present");
  requireExactValue(prohibitions.lock_present_at_commit_a, false, "prohibitions.lock_present_at_commit_a");
  requireExactValue(
    prohibitions.request_counter_scope,
    "gate_1_through_gate_5_primary_execution_only_excludes_public_source_research_artifact_acquisition_and_repository_delivery_metadata",
    "prohibitions.request_counter_scope",
  );
  requireExactValue(
    prohibitions.primary_benchmark_external_requests,
    0,
    "prohibitions.primary_benchmark_external_requests",
  );
  requireExactValue(
    prohibitions.primary_benchmark_provider_calls,
    0,
    "prohibitions.primary_benchmark_provider_calls",
  );
  requireExactValue(prohibitions.model_inference_calls, 0, "prohibitions.model_inference_calls");
  requireExactValue(prohibitions.incremental_spend_usd, 0, "prohibitions.incremental_spend_usd");

  const boundary = requireRecord(readiness.authority_boundary, "PRESEAL_READINESS.json authority_boundary");
  requireExactKeys(
    boundary,
    [
      "immutable_claim_authorities",
      "post_seal_mutable_status_documents",
      "mutable_document_policy",
      "conflict_rule",
    ],
    "PRESEAL_READINESS.json authority_boundary",
  );
  requireExactStringArray(
    boundary.immutable_claim_authorities,
    PRESEAL_IMMUTABLE_AUTHORITIES,
    "authority_boundary.immutable_claim_authorities",
  );
  requireExactStringArray(
    boundary.post_seal_mutable_status_documents,
    PRESEAL_MUTABLE_STATUS_DOCUMENTS,
    "authority_boundary.post_seal_mutable_status_documents",
  );
  requireExactValue(
    boundary.mutable_document_policy,
    "result_status_evidence_links_and_append_only_history_only_no_redefinition_of_frozen_claims",
    "authority_boundary.mutable_document_policy",
  );
  requireExactValue(
    boundary.conflict_rule,
    "verified_lock_and_frozen_machine_authorities_control_over_mutable_governance_status",
    "authority_boundary.conflict_rule",
  );

  return {
    validatedAt: readiness.validated_at,
    reviewPath: review.artifact_path,
    closureMarker: review.required_closure_marker as string,
  };
}

function requireExactStringArray(
  value: unknown,
  expected: readonly string[],
  label: string,
): void {
  if (
    !Array.isArray(value)
    || value.length !== expected.length
    || value.some((entry, index) => entry !== expected[index])
  ) {
    invalidSchema(`${label} must equal the fixed ordered authority list`);
  }
}

function validateRuntimeLedgerChronology(value: unknown): void {
  const ledger = requireRecord(value, "LOCAL_MODEL_RUNTIME_LEDGER.json root");
  const verification = requireRecord(
    ledger.verification,
    "LOCAL_MODEL_RUNTIME_LEDGER.json verification",
  );
  requireExactValue(
    verification.status,
    "verified",
    "LOCAL_MODEL_RUNTIME_LEDGER.json verification.status",
  );
  const verifiedAt = verification.ledger_verified_at;
  const hashedAt = verification.locked_files_hashed_at;
  if (typeof verifiedAt !== "string" || !isValidRfc3339(verifiedAt)) {
    invalidSchema(
      "LOCAL_MODEL_RUNTIME_LEDGER.json verification.ledger_verified_at must be valid RFC 3339",
    );
  }
  if (typeof hashedAt !== "string" || !isValidRfc3339(hashedAt)) {
    invalidSchema(
      "LOCAL_MODEL_RUNTIME_LEDGER.json verification.locked_files_hashed_at must be valid RFC 3339",
    );
  }
  if (Date.parse(verifiedAt) < Date.parse(hashedAt)) {
    invalidSchema(
      "LOCAL_MODEL_RUNTIME_LEDGER.json verification must not predate locked-file hashing",
    );
  }
}

function requireNonemptyTrackedFrozenTree(
  repoRoot: string,
  contentCommit: string,
  treePath: string,
  frozenPaths: ReadonlySet<string>,
): void {
  const trackedFiles = gitBytes(
    repoRoot,
    ["ls-tree", "-rz", "--name-only", contentCommit, "--", treePath],
    "FROZEN_FILE_MISSING",
  ).toString("utf8").split("\0").filter(Boolean);
  if (trackedFiles.length === 0) {
    invalidSchema(`${treePath} must be a nonempty tracked Gate 4 artifact tree at Commit A`);
  }
  for (const trackedFile of trackedFiles) {
    if (!trackedFile.startsWith(`${treePath}/`) || !frozenPaths.has(trackedFile)) {
      invalidSchema(`${trackedFile} in Gate 4 artifact tree must be frozen`);
    }
  }
}

function gitPathDirectory(path: string): string {
  const separator = path.lastIndexOf("/");
  return separator === -1 ? "" : path.slice(0, separator);
}

function joinGitPath(prefix: string, suffix: string): string {
  return prefix ? `${prefix}/${suffix}` : suffix;
}

function validateSealChangeset(
  repoRoot: string,
  sealCommit: string,
  lockPath: string,
): void {
  const changes = gitText(
    repoRoot,
    ["diff-tree", "--no-commit-id", "--name-status", "-r", sealCommit],
    "SEAL_CHANGESET_INVALID",
  ).split("\n").filter(Boolean);

  if (changes.length !== 1 || changes[0] !== `A\t${lockPath}`) {
    throw new LockVerificationError(
      "SEAL_CHANGESET_INVALID",
      "Commit B must add only the previously absent LOCK.json and change no other path",
    );
  }
}

function isValidRfc3339(value: string): boolean {
  const match = value.match(RFC3339_PATTERN);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = Number(match[8] ?? "0");
  const offsetMinute = Number(match[9] ?? "0");
  if (
    month < 1
    || month > 12
    || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    || hour > 23
    || minute > 59
    || second > 59
    || offsetHour > 23
    || offsetMinute > 59
  ) return false;
  return true;
}

function requireExactValue(value: unknown, expected: unknown, label: string): void {
  if (!Object.is(value, expected)) {
    invalidSchema(`${label} must equal ${JSON.stringify(expected)}`);
  }
}

function requireSha256(value: unknown, label: string): void {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    invalidSchema(`${label} must be lowercase SHA-256 hex`);
  }
}

function requireIntegerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): void {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    invalidSchema(`${label} must be a safe integer from ${minimum} through ${maximum}`);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalidSchema(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalidSchema(`${label} has missing or additional properties`);
  }
}

function invalidSchema(message: string): never {
  throw new LockVerificationError("INVALID_SCHEMA", message);
}

function validateRelativeGitPath(path: string, label: string): void {
  if (
    typeof path !== "string"
    || path.length === 0
    || path.startsWith("/")
    || path.startsWith("-")
    || path.includes("\\")
    || path.includes(":")
    || /[\u0000-\u001f\u007f]/u.test(path)
  ) {
    throw new LockVerificationError("INVALID_PATH", `${label} is not a safe relative POSIX path`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment === ".git")) {
    throw new LockVerificationError("INVALID_PATH", `${label} contains an unsafe path segment`);
  }
}

function resolveExactRepoRoot(path: string): string {
  const repoRoot = resolve(path);
  const discoveredRoot = gitText(
    repoRoot,
    ["rev-parse", "--show-toplevel"],
    "NOT_A_GIT_REPOSITORY",
  );
  try {
    if (realpathSync(repoRoot) !== realpathSync(discoveredRoot)) {
      throw new LockVerificationError(
        "NOT_A_GIT_REPOSITORY",
        "repoRoot must be the exact Git worktree root",
      );
    }
  } catch (error) {
    if (error instanceof LockVerificationError) throw error;
    throw new LockVerificationError("NOT_A_GIT_REPOSITORY", "repository root cannot be resolved");
  }
  return repoRoot;
}

function resolveWithinRepo(repoRoot: string, path: string): string {
  const absolute = resolve(repoRoot, ...path.split("/"));
  const prefix = repoRoot.endsWith(sep) ? repoRoot : `${repoRoot}${sep}`;
  if (!absolute.startsWith(prefix)) {
    throw new LockVerificationError("INVALID_PATH", `${path} escapes the repository root`);
  }
  return absolute;
}

function assertRegularNonSymlink(
  path: string,
  label: string,
  errorCode: LockVerificationErrorCode,
): void {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
  } catch {
    throw new LockVerificationError(errorCode, `${label} must be a regular, non-symlink file`);
  }
}

function gitText(
  repoRoot: string,
  args: string[],
  errorCode: LockVerificationErrorCode,
): string {
  return gitBytes(repoRoot, args, errorCode).toString("utf8").trim();
}

function gitBytes(
  repoRoot: string,
  args: string[],
  errorCode: LockVerificationErrorCode,
): Buffer {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "buffer",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new LockVerificationError(errorCode, `git ${args[0]} verification failed`);
  }
}

function gitStatus(repoRoot: string, args: string[]): number {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "ignore", "ignore"],
  });
  return result.status ?? 1;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertNoDuplicateJsonKeys(text: string): void {
  let position = 0;

  const fail = (message: string): never => {
    throw new LockVerificationError("INVALID_JSON", `${message} at byte ${position}`);
  };
  const whitespace = (): void => {
    while (position < text.length && /\s/u.test(text[position])) position += 1;
  };
  const parseString = (): string => {
    if (text[position] !== '"') fail("expected JSON string");
    const start = position;
    position += 1;
    while (position < text.length) {
      const character = text[position];
      if (character === '"') {
        position += 1;
        try {
          return JSON.parse(text.slice(start, position));
        } catch {
          fail("invalid JSON string");
        }
      }
      if (character === "\\") {
        position += 1;
        if (position >= text.length) fail("unterminated JSON escape");
        if (text[position] === "u") {
          const hex = text.slice(position + 1, position + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("invalid Unicode escape");
          position += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(text[position])) fail("invalid JSON escape");
        position += 1;
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) fail("unescaped control character");
      position += 1;
    }
    return fail("unterminated JSON string");
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
        if (keys.has(key)) {
          throw new LockVerificationError(
            "DUPLICATE_JSON_KEY",
            `duplicate JSON object key ${JSON.stringify(key)}`,
          );
        }
        keys.add(key);
        whitespace();
        if (text[position] !== ":") fail("expected colon");
        position += 1;
        parseValue();
        whitespace();
        if (text[position] === "}") {
          position += 1;
          return;
        }
        if (text[position] !== ",") fail("expected object comma");
        position += 1;
      }
      fail("unterminated JSON object");
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
        if (text[position] !== ",") fail("expected array comma");
        position += 1;
      }
      fail("unterminated JSON array");
    }
    if (character === '"') {
      parseString();
      return;
    }
    const remainder = text.slice(position);
    const token = remainder.match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/)?.[0];
    if (!token) return fail("invalid JSON value");
    position += token.length;
  };

  parseValue();
  whitespace();
  if (position !== text.length) fail("trailing JSON content");
}

function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  return resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    if (process.argv[2] === "--generate-draft") {
      const draft = generateLockDraft({
        repoRoot: process.argv[3] ?? "",
        contentCommit: process.argv[4] ?? "",
        protocolVersion: process.argv[5] ?? "",
        sealCreatedAt: process.argv[6] ?? "",
        lockPath: process.argv[7] ?? DEFAULT_LOCK_PATH,
      });
      process.stdout.write(`${JSON.stringify(draft, null, 2)}\n`);
    } else {
      const report = verifyLock({
        repoRoot: process.argv[2] ?? process.cwd(),
        lockPath: process.argv[3] ?? DEFAULT_LOCK_PATH,
      });
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    }
  } catch (error) {
    const code = error instanceof LockVerificationError ? error.code : "UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`${JSON.stringify({ valid: false, code, message })}\n`);
    process.exitCode = 1;
  }
}
