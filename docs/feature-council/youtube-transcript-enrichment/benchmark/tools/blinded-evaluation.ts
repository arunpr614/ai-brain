import { createHash } from "node:crypto";

import { z } from "zod";

import {
  parseNormalizedTranscriptArtifact,
  type NormalizedTranscript,
} from "../../spikes/a1-harness/normalized-transcript";
import {
  buildPrompt,
  validateEnrichmentOutput,
} from "../../spikes/model-harness/harness";
import { parseJsonWithoutDuplicateKeys } from "./verify-lock";

export const BLINDED_EVALUATION_TOOL_VERSION = "1.0.0";
export const CANONICAL_GATE4_ITEM_IDS = [
  "YT-01",
  "YT-02",
  "YT-07",
  "YT-08",
  "YT-09",
] as const;
export const EVALUATOR_ROLES = ["evaluator_a", "evaluator_b"] as const;
export const CLAIMS_BOUNDARY = "ai_evaluated_provisional_pending_human_stakeholder_review" as const;

const SHA256_RE = /^[0-9a-f]{64}$/;
const ISO_DATE_TIME_RE = /^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?(?:Z|[+-][0-9]{2}:[0-9]{2})$/;
const PRIVATE_CONTENT_PATTERNS = [
  /\/(?:Users|home)\/[^\s]+/iu,
  /file:\/\//iu,
  /(?:client[_ -]?secret|api[_ -]?key|authorization)\s*[:=]\s*[^\s]+/iu,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /GOCSPX-[A-Za-z0-9_-]+/u,
  /sk-[A-Za-z0-9_-]{16,}/u,
];

export type CanonicalGate4ItemId = (typeof CANONICAL_GATE4_ITEM_IDS)[number];
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];
export type ClaimSupport = "fully_supported" | "partially_supported" | "unsupported" | "contradicted";
export type CitationAssessment = "correct" | "incorrect" | "missing";
export type KeyPointCause = "supported_by_transcript_and_output" | "output_omission" | "essential_visual_evidence_absent" | "contradicted";

export type BlindedEvaluationErrorCode =
  | "INVALID_DENOMINATOR"
  | "CONTRACT_INVALID"
  | "CONSENT_UNAVAILABLE"
  | "EXECUTION_POSTURE_UNAVAILABLE"
  | "AUTHORIZATION_INVALID"
  | "RUBRIC_INVALID"
  | "ENRICHMENT_INVALID"
  | "PRIVATE_CONTENT_RISK"
  | "EXCERPT_LIMIT"
  | "NON_RECONSTRUCTABLE_BOUNDARY_FAILED"
  | "RESULT_INVALID"
  | "ADJUDICATION_REQUIRED"
  | "ADJUDICATION_INVALID"
  | "AGGREGATE_INVALID";

export class BlindedEvaluationError extends Error {
  readonly code: BlindedEvaluationErrorCode;

  constructor(code: BlindedEvaluationErrorCode, message: string) {
    super(message);
    this.name = "BlindedEvaluationError";
    this.code = code;
  }
}

export interface ConsentAttestation {
  state: "affirmative";
  attestation_id: string;
  recorded_at: string;
  withdrawn: false;
  bounded_excerpt_transfer_authorized: true;
}

export interface ExecutionReadiness {
  pinned_runtime_verified: true;
  pinned_model_verified: true;
  role_prompt_hashes_verified: true;
  deny_network_sandbox_available: true;
  fresh_process_isolation_available: true;
  packet_only_file_binding_available: true;
  local_private_storage_available: true;
  external_content_transfer: false;
  result_attestation_verification_available: true;
  incremental_spend_usd: 0;
}

export interface Gate4PacketSourceItem {
  item_id: CanonicalGate4ItemId;
  normalized_transcript_bytes: string;
  enrichment_output_bytes: string;
  gate_3_result_sha256: string;
  gate_4_attempt_claim_sha256: string;
  gate_4_public_report_sha256: string;
  gate_4_run_id: string;
}

export interface GenerateBlindedPacketsInput {
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  package_attempt_claim_sha256: string;
  packet_generated_at: string;
  execution_contract: unknown;
  runtime_ledger_json: string;
  sandbox_profile_text: string;
  role_system_prompts: {
    evaluator_a: string;
    evaluator_b: string;
    adjudicator: string;
  };
  role_generation_schemas: {
    evaluator_a: string;
    evaluator_b: string;
    adjudicator: string;
  };
  authorization: unknown;
  rubric: unknown;
  consent: ConsentAttestation;
  execution_readiness: ExecutionReadiness;
  items: readonly Gate4PacketSourceItem[];
}

interface EvidenceOutputEntry {
  claim_id?: string;
  key_point_id?: string;
  claim?: string;
  point?: string;
  evidence_segment_ids: string[];
  evidence_start_ms: number;
  evidence_end_ms: number;
}

interface EnrichmentOutput {
  schema_version: "1.0";
  item_id: string;
  input_sha256: string;
  summary: string;
  material_claims: EvidenceOutputEntry[];
  key_points: EvidenceOutputEntry[];
}

export interface BlindedExcerpt {
  excerpt_id: string;
  text: string;
  word_count: number;
  cited_start_ms: number;
  cited_end_ms: number;
  authorized_for_claim_ids: string[];
  authorized_for_generated_key_point_ids: string[];
}

export interface BlindedPacketItem {
  blinded_item_id: string;
  packet_item_sha256: string;
  generated_summary: string;
  claims: Array<{
    claim_id: string;
    claim_text: string;
    citation_id: string;
    cited_start_ms: number;
    cited_end_ms: number;
    evidence_excerpt_ids: string[];
  }>;
  generated_key_points: Array<{
    generated_key_point_id: string;
    point_text: string;
    evidence_excerpt_ids: string[];
  }>;
  rubric_points: Array<{
    rubric_point_id: string;
    kind: "text_groundable" | "visual_only";
    essential_meaning: string;
    contradiction_rule: string;
    weight: 1;
  }>;
  excerpts: BlindedExcerpt[];
  boundary_counts: {
    excerpt_count: number;
    total_excerpt_words: number;
    unique_transcript_word_positions: number;
    transcript_word_positions: number;
    unique_transcript_word_position_fraction: number;
    complete_transcript_included: false;
    reconstructable_transcript_detected: false;
  };
}

export interface BlindedEvaluatorPacket {
  schema_version: "1.0";
  packet_id: string;
  role: EvaluatorRole;
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  execution_contract_sha256: string;
  execution_readiness_sha256: string;
  consent_attestation_sha256: string;
  runtime_ledger_sha256: string;
  role_system_prompt_sha256: string;
  role_generation_schema_sha256: string;
  sandbox_profile_sha256: string;
  ordering_sha256: string;
  transfer_boundary: {
    maximum_excerpts_per_item: 12;
    maximum_words_per_excerpt: 40;
    maximum_total_excerpt_words_per_item: 240;
    maximum_unique_transcript_word_position_fraction: 0.35;
    complete_or_reconstructable_transcript_prohibited: true;
  };
  items: BlindedPacketItem[];
  instructions: {
    score_every_claim_citation_and_rubric_point_once: true;
    no_new_summary_or_claim_text: true;
    use_only_approved_excerpt_ids: true;
    no_tools_network_or_external_calls: true;
    thresholds_computed_by_coordinator: true;
  };
  claims_boundary: typeof CLAIMS_BOUNDARY;
}

export interface CoordinatorManifestItem {
  item_id: CanonicalGate4ItemId;
  normalized_input_sha256: string;
  enrichment_output_sha256: string;
  gate_3_result_sha256: string;
  gate_4_attempt_claim_sha256: string;
  gate_4_public_report_sha256: string;
  gate_4_run_id: string;
  roles: Record<EvaluatorRole, {
    blinded_item_id: string;
    packet_item_sha256: string;
  }>;
}

export interface BlindedPacketBundle {
  schema_version: "1.0";
  tool_version: typeof BLINDED_EVALUATION_TOOL_VERSION;
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  package_attempt_claim_sha256: string;
  execution_contract_sha256: string;
  execution_readiness_sha256: string;
  runtime_ledger_sha256: string;
  sandbox_profile_sha256: string;
  role_system_prompt_sha256: Record<"evaluator_a" | "evaluator_b" | "adjudicator", string>;
  role_generation_schema_sha256: Record<"evaluator_a" | "evaluator_b" | "adjudicator", string>;
  packet_generated_at: string;
  consent_attestation_sha256: string;
  packets: Record<EvaluatorRole, {
    packet: BlindedEvaluatorPacket;
    packet_sha256: string;
  }>;
  coordinator_manifest: {
    classification: "private_do_not_publish";
    item_ids: readonly CanonicalGate4ItemId[];
    items: CoordinatorManifestItem[];
  };
}

interface RubricPointSource {
  rubric_point_id: string;
  essential_meaning: string;
  contradiction_rule: string;
  weight: number;
}

interface RubricItemSource {
  item_id: CanonicalGate4ItemId;
  text_groundable: RubricPointSource[];
  visual_only: RubricPointSource[];
}

interface AuthorizationItemSource {
  item_id: CanonicalGate4ItemId;
  authorized_derivations: string[];
  evaluator_excerpt: {
    maximum_excerpts: number;
    maximum_words_per_excerpt: number;
    maximum_total_words: number;
    maximum_unique_transcript_word_fraction: number;
    selection: string;
    allowed_recipients: string;
    prohibited_content: string;
  };
}

interface PositionedWord {
  position: number;
  text: string;
  segmentId: string;
}

type Gate4NormalizedTranscript = NormalizedTranscript & {
  source_method: "A1";
  completeness: NormalizedTranscript["completeness"] & { state: "complete" | "partial" };
  provenance: NormalizedTranscript["provenance"] & { reference_role: "input_preservation" };
  errors: [];
};

interface EvidenceTarget {
  key: string;
  segmentIds: string[];
  startMs: number;
  endMs: number;
  claimIds: string[];
  keyPointIds: string[];
}

const consentSchema = z.object({
  state: z.literal("affirmative"),
  attestation_id: z.string().regex(/^CONSENT-[A-Za-z0-9._:-]{8,120}$/),
  recorded_at: z.string().max(40).regex(ISO_DATE_TIME_RE),
  withdrawn: z.literal(false),
  bounded_excerpt_transfer_authorized: z.literal(true),
}).strict();

export function validateConsentAttestation(
  value: unknown,
  notAfter: string | Date,
): ConsentAttestation {
  const parsed = consentSchema.safeParse(value);
  const notAfterMs = notAfter instanceof Date
    ? notAfter.getTime()
    : Date.parse(notAfter);
  if (!parsed.success || !Number.isFinite(notAfterMs)) {
    throw new BlindedEvaluationError(
      "CONSENT_UNAVAILABLE",
      "consent must use the exact affirmative, unwithdrawn, bounded-transfer attestation schema",
    );
  }
  const recordedAtMs = Date.parse(parsed.data.recorded_at);
  if (!Number.isFinite(recordedAtMs) || recordedAtMs > notAfterMs) {
    throw new BlindedEvaluationError(
      "CONSENT_UNAVAILABLE",
      "consent must contain a valid timestamp that does not postdate its trusted validation boundary",
    );
  }
  // Return a fresh exact-key object so callers hash and persist only the
  // validated representation, never a caller-controlled object reference.
  return {
    state: parsed.data.state,
    attestation_id: parsed.data.attestation_id,
    recorded_at: parsed.data.recorded_at,
    withdrawn: parsed.data.withdrawn,
    bounded_excerpt_transfer_authorized: parsed.data.bounded_excerpt_transfer_authorized,
  };
}

const readinessSchema = z.object({
  pinned_runtime_verified: z.literal(true),
  pinned_model_verified: z.literal(true),
  role_prompt_hashes_verified: z.literal(true),
  deny_network_sandbox_available: z.literal(true),
  fresh_process_isolation_available: z.literal(true),
  packet_only_file_binding_available: z.literal(true),
  local_private_storage_available: z.literal(true),
  external_content_transfer: z.literal(false),
  result_attestation_verification_available: z.literal(true),
  incremental_spend_usd: z.literal(0),
}).strict();

const executionContractSchema = z.object({
  schema_version: z.literal("1.1"),
  contract_id: z.literal("G4-LOCAL-QWEN-BLINDED-EVALUATION-1.0"),
  workflow: z.object({
    platform: z.literal("local_llama_cpp"),
    role_kind: z.literal("pinned_local_ai_model"),
    evaluator_roles: z.tuple([z.literal("evaluator_a"), z.literal("evaluator_b")]),
    adjudicator_role: z.literal("adjudicator"),
    fresh_process_per_role: z.literal(true),
    separate_locked_prompt_per_role: z.literal(true),
    separate_seed_per_role: z.literal(true),
    separate_blinding_per_role: z.literal(true),
    candidate_identity_hidden_from_roles: z.literal(true),
    candidate_runtime_hidden_from_roles: z.literal(true),
    candidate_price_latency_hidden_from_roles: z.literal(true),
    other_evaluator_result_hidden_until_adjudication: z.literal(true),
    same_model_family_as_candidate: z.literal(true),
    same_model_evaluator_bias: z.literal("disclosed_material_reproducibility_limitation"),
    independent_human_evaluation_claim: z.literal("not_asserted"),
  }).strict(),
  pinned_runtime: z.object({
    runtime_ledger_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json"),
    candidate_id: z.literal("LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"),
    runtime_project: z.literal("ggml-org/llama.cpp"),
    runtime_release_tag: z.literal("b9637"),
    runtime_commit: z.literal("aedb2a5e9ca3d4064148bbb919e0ddc0c1b70ab3"),
    llama_cli_sha256: z.literal("b8c1891d697f72c1e9c05d0613b4f3d091e388acc2c4e1afa535c19df5d50fc3"),
    model_repository: z.literal("Qwen/Qwen3-8B-GGUF"),
    model_revision: z.literal("6a569868d07d3bd59e8b97fb001bf8c0b254bb20"),
    model_filename: z.literal("Qwen3-8B-Q4_K_M.gguf"),
    model_sha256: z.literal("d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785"),
    sandbox_profile_path: z.literal("docs/feature-council/youtube-transcript-enrichment/spikes/model-harness/deny-network.sb"),
    sandbox_profile_sha256: z.literal("28fbf7e712236b6f3baa33f1d85f3312f5ef0d8096b3e5b6c2229d08120811c0"),
  }).strict(),
  role_invocations: z.tuple([
    z.object({ role: z.literal("evaluator_a"), seed: z.literal(424243), system_prompt_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/EVALUATOR_A_SYSTEM_PROMPT.txt"), system_prompt_sha256: z.literal("db09d88dee6a6d26546e300b1bd044261db0279cefb4f4cbbf37916378f74fad"), output_generation_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_EVALUATION_GENERATION.schema.json"), output_generation_schema_sha256: z.literal("6a81f8df59a2795ac7b4450a247996e5c322b35fdd97c90cbe57c8e1f10da0f3"), strict_postparse_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_EVALUATION.schema.json"), strict_postparse_schema_sha256: z.literal("114d266956a663d4ac849591c4bae6e0baaa465596e28f765712e3192407a0e2") }).strict(),
    z.object({ role: z.literal("evaluator_b"), seed: z.literal(424244), system_prompt_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/EVALUATOR_B_SYSTEM_PROMPT.txt"), system_prompt_sha256: z.literal("c30d7e6ec3e1bbdf305afb714ee5818ce904c2ab17ef3731b6eae5160259710b"), output_generation_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_EVALUATION_GENERATION.schema.json"), output_generation_schema_sha256: z.literal("6a81f8df59a2795ac7b4450a247996e5c322b35fdd97c90cbe57c8e1f10da0f3"), strict_postparse_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_EVALUATION.schema.json"), strict_postparse_schema_sha256: z.literal("114d266956a663d4ac849591c4bae6e0baaa465596e28f765712e3192407a0e2") }).strict(),
    z.object({ role: z.literal("adjudicator"), seed: z.literal(424245), system_prompt_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/ADJUDICATOR_SYSTEM_PROMPT.txt"), system_prompt_sha256: z.literal("1118a1683b3f8b2c5d253f2aa0b8e0db02df6601136f2fbbf106fea8998a5ad9"), output_generation_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_ADJUDICATION_GENERATION.schema.json"), output_generation_schema_sha256: z.literal("f0eaa99b6f689a48242b52465334a87f17a7f582d12cabbc7fcfb77ccc800396"), strict_postparse_schema_path: z.literal("docs/feature-council/youtube-transcript-enrichment/benchmark/model/BLINDED_ADJUDICATION.schema.json"), strict_postparse_schema_sha256: z.literal("470e1e606da562b6bae9771038d77b20758aa3bb3e6ee99324d628179f2f78e4") }).strict(),
  ]),
  inference_settings: z.object({
    interface: z.literal("llama-cli_files_only"),
    offline: z.literal(true),
    server_mode: z.literal("prohibited"),
    remote_model_resolution: z.literal("prohibited"),
    temperature: z.literal(0),
    top_k: z.literal(1),
    top_p: z.literal(1),
    min_p: z.literal(0),
    repeat_penalty: z.literal(1),
    context_size: z.literal(16384),
    max_output_tokens: z.literal(4096),
    threads: z.literal(8),
    threads_batch: z.literal(8),
    gpu_layers: z.literal("all"),
    reasoning: z.literal("disabled"),
    attempt_limit_per_role: z.literal(1),
    semantic_or_format_retry: z.literal("prohibited"),
    timeout_ms_per_role: z.literal(1800000),
  }).strict(),
  inference_accounting: z.object({
    candidate_initial_invocations: z.literal(5),
    candidate_format_only_retries_maximum: z.literal(5),
    candidate_invocations_maximum: z.literal(10),
    blinded_evaluator_invocations: z.literal(2),
    adjudicator_invocations_maximum: z.literal(1),
    total_local_inference_invocations_maximum: z.literal(13),
    model_roster_count: z.literal(1),
    external_provider_calls: z.literal(0),
  }).strict(),
  execution_boundary: z.object({
    local_private_machine_only: z.literal(true),
    packet_only_file_binding: z.literal(true),
    deny_network_sandbox_required: z.literal(true),
    tools_available_to_model: z.literal(false),
    network_available_to_model: z.literal(false),
    evaluator_initiated_provider_calls: z.literal(0),
    external_api_calls: z.literal(0),
    external_content_transfer: z.literal(false),
    complete_transcript_in_packet: z.literal(false),
    private_paths_in_packet: z.literal(false),
    credentials_in_packet: z.literal(false),
    incremental_spend_usd: z.literal(0),
    fail_closed_if_runtime_model_prompt_sandbox_consent_or_posture_unavailable: z.literal(true),
  }).strict(),
  transfer_boundary: z.object({
    content: z.literal("generated_enrichment_public_rubric_and_bounded_cited_excerpts_only"),
    maximum_excerpts_per_item: z.literal(12),
    maximum_words_per_excerpt: z.literal(40),
    maximum_total_excerpt_words_per_item: z.literal(240),
    maximum_unique_transcript_word_position_fraction: z.literal(0.35),
    complete_or_reconstructable_transcript_prohibited: z.literal(true),
    additional_content_for_adjudication_prohibited: z.literal(true),
  }).strict(),
  data_posture: z.object({
    external_provider: z.literal("none"),
    external_retention: z.literal("not_applicable_no_external_transfer"),
    external_training: z.literal("not_applicable_no_external_transfer"),
    zero_data_retention: z.literal("not_claimed_not_applicable_local_execution"),
    local_training: z.literal("prohibited_and_not_performed"),
    private_packet_and_result_retention: z.literal("delete_with_private_benchmark_packet_by_2026-10-14"),
    publication: z.literal("hashes_counts_rates_and_provisional_decisions_only"),
    incremental_subscription_or_usage_purchase: z.literal("prohibited"),
  }).strict(),
  consent: z.object({
    basis: z.literal("affirmative_user_authorization_of_local_multi_agent_evaluation_workflow"),
    execution_time_private_consent_attestation_required: z.literal(true),
    consent_attestation_must_predate_packet_generation: z.literal(true),
    fail_closed_if_absent_or_withdrawn: z.literal(true),
  }).strict(),
  claims_boundary: z.literal(CLAIMS_BOUNDARY),
  visual_boundary: z.object({
    visual_method_sealed: z.literal(false),
    rights_authorized_visual_media_set_present: z.literal(false),
    visual_processing_authorized: z.literal(false),
    triggered_state: z.literal("triggered_but_blocked"),
  }).strict(),
}).strict();

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function canonicalJsonSha256(value: unknown): string {
  return sha256(Buffer.from(`${canonicalJson(value)}\n`, "utf8"));
}

function assertSha256(value: string, name: string): void {
  if (!SHA256_RE.test(value)) {
    throw new BlindedEvaluationError("INVALID_DENOMINATOR", `${name} must be a lowercase SHA-256 value`);
  }
}

function assertNoPrivateContent(value: unknown, context: string): void {
  const visit = (entry: unknown): void => {
    if (typeof entry === "string") {
      if (PRIVATE_CONTENT_PATTERNS.some((pattern) => pattern.test(entry))) {
        throw new BlindedEvaluationError("PRIVATE_CONTENT_RISK", `${context} contains a prohibited private-path or credential pattern`);
      }
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (entry && typeof entry === "object") Object.values(entry).forEach(visit);
  };
  visit(value);
}

function requireExactCanonicalIds(items: readonly { item_id: string }[], context: string): void {
  if (
    items.length !== CANONICAL_GATE4_ITEM_IDS.length
    || items.some((item, index) => item.item_id !== CANONICAL_GATE4_ITEM_IDS[index])
    || new Set(items.map((item) => item.item_id)).size !== CANONICAL_GATE4_ITEM_IDS.length
  ) {
    throw new BlindedEvaluationError(
      "INVALID_DENOMINATOR",
      `${context} must contain the exact ordered five-item denominator: ${CANONICAL_GATE4_ITEM_IDS.join(", ")}`,
    );
  }
}

function parseContract(value: unknown): z.infer<typeof executionContractSchema> {
  const result = executionContractSchema.safeParse(value);
  if (!result.success) {
    throw new BlindedEvaluationError("CONTRACT_INVALID", "the evaluator execution contract does not match the frozen Codex posture");
  }
  return result.data;
}

function validateLocalRuntimeBindings(
  contract: z.infer<typeof executionContractSchema>,
  input: GenerateBlindedPacketsInput,
): {
  runtimeLedgerSha256: string;
  sandboxProfileSha256: string;
  rolePromptSha256: Record<"evaluator_a" | "evaluator_b" | "adjudicator", string>;
  roleGenerationSchemaSha256: Record<"evaluator_a" | "evaluator_b" | "adjudicator", string>;
} {
  let ledger: Record<string, unknown>;
  try {
    ledger = parseJsonWithoutDuplicateKeys(input.runtime_ledger_json) as Record<string, unknown>;
  } catch {
    throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", "the pinned local runtime ledger is not valid JSON");
  }
  const runtime = ledger.runtime as Record<string, unknown> | undefined;
  const extracted = runtime?.extracted as Record<string, unknown> | undefined;
  const llamaCli = extracted?.llama_cli as Record<string, unknown> | undefined;
  const model = ledger.model as Record<string, unknown> | undefined;
  const observedModel = model?.observed_file as Record<string, unknown> | undefined;
  const lockedFiles = ledger.locked_files as Record<string, unknown> | undefined;
  const sandbox = lockedFiles?.sandbox_profile as Record<string, unknown> | undefined;
  const runtimeExecution = ledger.execution_contract as Record<string, unknown> | undefined;
  if (
    ledger.schema_version !== "1.0"
    || ledger.candidate_id !== contract.pinned_runtime.candidate_id
    || ledger.seal_state !== "verified_ready_for_content_freeze"
    || runtime?.project !== contract.pinned_runtime.runtime_project
    || runtime?.release_tag !== contract.pinned_runtime.runtime_release_tag
    || runtime?.commit !== contract.pinned_runtime.runtime_commit
    || llamaCli?.sha256 !== contract.pinned_runtime.llama_cli_sha256
    || model?.repository !== contract.pinned_runtime.model_repository
    || model?.revision !== contract.pinned_runtime.model_revision
    || model?.filename !== contract.pinned_runtime.model_filename
    || observedModel?.sha256 !== contract.pinned_runtime.model_sha256
    || sandbox?.path !== contract.pinned_runtime.sandbox_profile_path
    || sandbox?.sha256 !== contract.pinned_runtime.sandbox_profile_sha256
    || runtimeExecution?.interface !== contract.inference_settings.interface
    || runtimeExecution?.network !== "sandbox_exec_deny_network_plus_llama_offline"
    || runtimeExecution?.server_mode !== contract.inference_settings.server_mode
    || runtimeExecution?.remote_model_resolution !== contract.inference_settings.remote_model_resolution
    || runtimeExecution?.temperature !== contract.inference_settings.temperature
    || runtimeExecution?.top_k !== contract.inference_settings.top_k
    || runtimeExecution?.top_p !== contract.inference_settings.top_p
    || runtimeExecution?.min_p !== contract.inference_settings.min_p
    || runtimeExecution?.repeat_penalty !== contract.inference_settings.repeat_penalty
    || runtimeExecution?.context_size !== contract.inference_settings.context_size
    || runtimeExecution?.max_output_tokens !== contract.inference_settings.max_output_tokens
    || runtimeExecution?.threads !== contract.inference_settings.threads
    || runtimeExecution?.threads_batch !== contract.inference_settings.threads_batch
    || runtimeExecution?.gpu_layers !== contract.inference_settings.gpu_layers
    || runtimeExecution?.reasoning !== contract.inference_settings.reasoning
    || runtimeExecution?.timeout_ms_per_attempt !== contract.inference_settings.timeout_ms_per_role
    || runtimeExecution?.incremental_cost_usd !== 0
  ) throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", "the runtime ledger does not match the exact local evaluator contract");

  const sandboxHash = sha256(Buffer.from(input.sandbox_profile_text, "utf8"));
  if (sandboxHash !== contract.pinned_runtime.sandbox_profile_sha256) {
    throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", "the local deny-network sandbox bytes do not match the contract");
  }
  const rolePromptSha256 = {
    evaluator_a: sha256(Buffer.from(input.role_system_prompts.evaluator_a, "utf8")),
    evaluator_b: sha256(Buffer.from(input.role_system_prompts.evaluator_b, "utf8")),
    adjudicator: sha256(Buffer.from(input.role_system_prompts.adjudicator, "utf8")),
  };
  const roleGenerationSchemaSha256 = {
    evaluator_a: sha256(Buffer.from(input.role_generation_schemas.evaluator_a, "utf8")),
    evaluator_b: sha256(Buffer.from(input.role_generation_schemas.evaluator_b, "utf8")),
    adjudicator: sha256(Buffer.from(input.role_generation_schemas.adjudicator, "utf8")),
  };
  for (const invocation of contract.role_invocations) {
    if (rolePromptSha256[invocation.role] !== invocation.system_prompt_sha256) {
      throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", `${invocation.role} prompt bytes do not match the contract`);
    }
    if (roleGenerationSchemaSha256[invocation.role] !== invocation.output_generation_schema_sha256) {
      throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", `${invocation.role} generation-schema bytes do not match the contract`);
    }
  }
  assertNoPrivateContent(input.role_system_prompts, "local evaluator role prompts");
  for (const [role, schemaText] of Object.entries(input.role_generation_schemas)) {
    let schema: unknown;
    try { schema = parseJsonWithoutDuplicateKeys(schemaText); }
    catch { throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", `${role} generation schema is not valid JSON`); }
    const serialized = JSON.stringify(schema);
    if (serialized.includes('"$ref"') || serialized.includes('"$defs"')) {
      throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", `${role} generation schema is not flattened for llama.cpp`);
    }
  }
  return {
    runtimeLedgerSha256: sha256(Buffer.from(input.runtime_ledger_json, "utf8")),
    sandboxProfileSha256: sandboxHash,
    rolePromptSha256,
    roleGenerationSchemaSha256,
  };
}

function parseRubric(value: unknown): RubricItemSource[] {
  if (!value || typeof value !== "object") throw new BlindedEvaluationError("RUBRIC_INVALID", "rubric must be an object");
  const record = value as Record<string, unknown>;
  if (record.schema_version !== "1.0" || !Array.isArray(record.items)) {
    throw new BlindedEvaluationError("RUBRIC_INVALID", "rubric version/items are invalid");
  }
  const items = record.items as Array<Record<string, unknown>>;
  requireExactCanonicalIds(items.map((item) => ({ item_id: String(item.item_id) })), "key-point rubric");
  return items.map((item) => {
    const parsePoints = (kind: "text_groundable" | "visual_only"): RubricPointSource[] => {
      const points = item[kind];
      if (!Array.isArray(points) || points.length < 1) throw new BlindedEvaluationError("RUBRIC_INVALID", `${item.item_id} ${kind} points are missing`);
      const parsed = points.map((point) => {
        if (!point || typeof point !== "object") throw new BlindedEvaluationError("RUBRIC_INVALID", "rubric point must be an object");
        const candidate = point as Record<string, unknown>;
        if (
          typeof candidate.rubric_point_id !== "string"
          || typeof candidate.essential_meaning !== "string"
          || candidate.essential_meaning.length === 0
          || typeof candidate.contradiction_rule !== "string"
          || candidate.contradiction_rule.length === 0
          || candidate.weight !== 1
        ) throw new BlindedEvaluationError("RUBRIC_INVALID", `${item.item_id} has an invalid rubric point`);
        const expectedPattern = new RegExp(`^${item.item_id}:${kind === "text_groundable" ? "TXT" : "VIS"}:[0-9]{2}$`);
        if (!expectedPattern.test(candidate.rubric_point_id)) throw new BlindedEvaluationError("RUBRIC_INVALID", `${item.item_id} has a cross-item or wrong-kind rubric point`);
        return candidate as unknown as RubricPointSource;
      });
      if (new Set(parsed.map((point) => point.rubric_point_id)).size !== parsed.length) {
        throw new BlindedEvaluationError("RUBRIC_INVALID", `${item.item_id} has duplicate rubric points`);
      }
      return parsed;
    };
    return {
      item_id: item.item_id as CanonicalGate4ItemId,
      text_groundable: parsePoints("text_groundable"),
      visual_only: parsePoints("visual_only"),
    };
  });
}

function parseAuthorization(value: unknown): AuthorizationItemSource[] {
  if (!value || typeof value !== "object") throw new BlindedEvaluationError("AUTHORIZATION_INVALID", "authorization must be an object");
  const record = value as Record<string, unknown>;
  const scope = record.authorization_scope as Record<string, unknown> | undefined;
  if (
    record.schema_version !== "1.0"
    || !scope
    || scope.evaluator_excerpt_transfer !== "allowed_with_per_item_limits_and_blinding"
    || scope.external_full_transcript_upload !== "prohibited"
    || scope.training !== "prohibited"
    || !Array.isArray(record.items)
  ) throw new BlindedEvaluationError("AUTHORIZATION_INVALID", "authorization scope does not permit only bounded blinded excerpts");
  const items = record.items as Array<Record<string, unknown>>;
  requireExactCanonicalIds(items.map((item) => ({ item_id: String(item.item_id) })), "local derivation authorization");
  return items.map((item) => {
    const excerpt = item.evaluator_excerpt as Record<string, unknown> | undefined;
    const derivations = item.authorized_derivations;
    if (
      !Array.isArray(derivations)
      || !derivations.includes("bounded_blinded_evaluator_excerpts")
      || !excerpt
      || excerpt.maximum_excerpts !== 12
      || excerpt.maximum_words_per_excerpt !== 40
      || excerpt.maximum_total_words !== 240
      || excerpt.maximum_unique_transcript_word_fraction !== 0.35
      || excerpt.selection !== "claim_or_citation_evidence_windows_only"
      || excerpt.allowed_recipients !== "two_blinded_ai_evaluators_and_threshold_adjudicator_only"
      || excerpt.prohibited_content !== "complete_or_reconstructable_transcript"
    ) throw new BlindedEvaluationError("AUTHORIZATION_INVALID", `${item.item_id} does not carry the exact excerpt authorization`);
    return {
      item_id: item.item_id as CanonicalGate4ItemId,
      authorized_derivations: derivations as string[],
      evaluator_excerpt: excerpt as unknown as AuthorizationItemSource["evaluator_excerpt"],
    };
  });
}

function wordsForTranscript(transcript: NormalizedTranscript): { all: PositionedWord[]; bySegment: Map<string, PositionedWord[]> } {
  const all: PositionedWord[] = [];
  const bySegment = new Map<string, PositionedWord[]>();
  for (const segment of transcript.segments) {
    const segmentId = `${transcript.item_id}:S${String(segment.index).padStart(6, "0")}`;
    const words = Array.from(segment.text.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu)).map((match) => match[0]);
    const positioned = words.map((text) => ({ position: all.length, text, segmentId }));
    all.push(...positioned);
    bySegment.set(segmentId, positioned);
  }
  if (all.length === 0) throw new BlindedEvaluationError("NON_RECONSTRUCTABLE_BOUNDARY_FAILED", `${transcript.item_id} transcript has no transferable word positions`);
  return { all, bySegment };
}

function makeEvidenceTargets(output: EnrichmentOutput): EvidenceTarget[] {
  const targets = new Map<string, EvidenceTarget>();
  const add = (entry: EvidenceOutputEntry, kind: "claim" | "key_point"): void => {
    const key = `${entry.evidence_segment_ids.join("\u0000")}\u0000${entry.evidence_start_ms}\u0000${entry.evidence_end_ms}`;
    let target = targets.get(key);
    if (!target) {
      target = {
        key,
        segmentIds: [...entry.evidence_segment_ids],
        startMs: entry.evidence_start_ms,
        endMs: entry.evidence_end_ms,
        claimIds: [],
        keyPointIds: [],
      };
      targets.set(key, target);
    }
    if (kind === "claim") target.claimIds.push(String(entry.claim_id));
    else target.keyPointIds.push(String(entry.key_point_id));
  };
  output.material_claims.forEach((entry) => add(entry, "claim"));
  output.key_points.forEach((entry) => add(entry, "key_point"));
  return [...targets.values()];
}

function generateExcerpts(transcript: NormalizedTranscript, output: EnrichmentOutput): {
  excerpts: BlindedExcerpt[];
  targetToExcerpt: Map<string, string>;
  boundary: BlindedPacketItem["boundary_counts"];
} {
  const positions = wordsForTranscript(transcript);
  const targets = makeEvidenceTargets(output);
  if (targets.length < 1 || targets.length > 12) {
    throw new BlindedEvaluationError("EXCERPT_LIMIT", `${transcript.item_id} needs ${targets.length} evidence windows; the sealed limit is 1..12`);
  }
  const positionBudget = Math.floor(positions.all.length * 0.35);
  const wordBudget = Math.min(240, positionBudget);
  if (wordBudget < targets.length) {
    throw new BlindedEvaluationError("NON_RECONSTRUCTABLE_BOUNDARY_FAILED", `${transcript.item_id} cannot give every evidence window one word within the 35% position boundary`);
  }
  const baseAllocation = Math.floor(wordBudget / targets.length);
  let allocationRemainder = wordBudget % targets.length;
  const selectedPositions = new Set<number>();
  const targetToExcerpt = new Map<string, string>();
  const excerpts = targets.map((target, index) => {
    const available = target.segmentIds.flatMap((segmentId) => positions.bySegment.get(segmentId) ?? []);
    if (available.length === 0) throw new BlindedEvaluationError("ENRICHMENT_INVALID", `${transcript.item_id} cites an evidence window with no transcript words`);
    const allocated = Math.min(40, baseAllocation + (allocationRemainder > 0 ? 1 : 0));
    allocationRemainder = Math.max(0, allocationRemainder - 1);
    const count = Math.min(allocated, available.length);
    const start = Math.floor((available.length - count) / 2);
    const chosen = available.slice(start, start + count);
    chosen.forEach((word) => selectedPositions.add(word.position));
    const excerptId = `E${String(index + 1).padStart(3, "0")}`;
    targetToExcerpt.set(target.key, excerptId);
    return {
      excerpt_id: excerptId,
      text: chosen.map((word) => word.text).join(" "),
      word_count: chosen.length,
      cited_start_ms: target.startMs,
      cited_end_ms: target.endMs,
      authorized_for_claim_ids: [...target.claimIds],
      authorized_for_generated_key_point_ids: [...target.keyPointIds],
    };
  });
  const totalWords = excerpts.reduce((sum, excerpt) => sum + excerpt.word_count, 0);
  const fraction = selectedPositions.size / positions.all.length;
  if (
    excerpts.length > 12
    || excerpts.some((excerpt) => excerpt.word_count < 1 || excerpt.word_count > 40)
    || totalWords > 240
    || fraction > 0.35
    || selectedPositions.size >= positions.all.length
  ) throw new BlindedEvaluationError("NON_RECONSTRUCTABLE_BOUNDARY_FAILED", `${transcript.item_id} excerpt transfer exceeds the sealed non-reconstructability boundary`);
  return {
    excerpts,
    targetToExcerpt,
    boundary: {
      excerpt_count: excerpts.length,
      total_excerpt_words: totalWords,
      unique_transcript_word_positions: selectedPositions.size,
      transcript_word_positions: positions.all.length,
      unique_transcript_word_position_fraction: fraction,
      complete_transcript_included: false,
      reconstructable_transcript_detected: false,
    },
  };
}

function evidenceKey(entry: EvidenceOutputEntry): string {
  return `${entry.evidence_segment_ids.join("\u0000")}\u0000${entry.evidence_start_ms}\u0000${entry.evidence_end_ms}`;
}

function buildUnblindedPacketItem(
  source: Gate4PacketSourceItem,
  rubric: RubricItemSource,
): Omit<BlindedPacketItem, "blinded_item_id" | "packet_item_sha256"> {
  if (
    Buffer.byteLength(source.normalized_transcript_bytes, "utf8") < 1
    || Buffer.byteLength(source.normalized_transcript_bytes, "utf8") > 1024 * 1024
    || Buffer.byteLength(source.enrichment_output_bytes, "utf8") < 1
    || Buffer.byteLength(source.enrichment_output_bytes, "utf8") > 1024 * 1024
    || source.normalized_transcript_bytes.includes("\u0000")
    || source.enrichment_output_bytes.includes("\u0000")
  ) throw new BlindedEvaluationError("ENRICHMENT_INVALID", `${source.item_id} admitted files are empty, oversized, or contain NUL bytes`);
  let normalizedValue: unknown;
  let enrichmentValue: unknown;
  try {
    normalizedValue = parseJsonWithoutDuplicateKeys(source.normalized_transcript_bytes);
    enrichmentValue = parseJsonWithoutDuplicateKeys(source.enrichment_output_bytes);
  } catch {
    throw new BlindedEvaluationError("ENRICHMENT_INVALID", `${source.item_id} admitted normalized/output bytes are not strict JSON documents`);
  }
  const transcript = parseNormalizedTranscriptArtifact(normalizedValue);
  if (transcript.item_id !== source.item_id) throw new BlindedEvaluationError("INVALID_DENOMINATOR", `${source.item_id} normalized transcript item mismatch`);
  if (
    transcript.source_method !== "A1"
    || !["complete", "partial"].includes(transcript.completeness.state)
    || transcript.provenance.reference_role !== "input_preservation"
    || transcript.errors.length !== 0
  ) throw new BlindedEvaluationError("ENRICHMENT_INVALID", `${source.item_id} is not an admitted Gate 3 A1 model input`);
  const gate4Transcript = transcript as Gate4NormalizedTranscript;
  const normalizedInputSha256 = sha256(Buffer.from(source.normalized_transcript_bytes, "utf8"));
  const prompt = buildPrompt(gate4Transcript, normalizedInputSha256);
  const validation = validateEnrichmentOutput(enrichmentValue, gate4Transcript, prompt.segments, normalizedInputSha256);
  if (validation.shapeErrors.length > 0 || validation.semanticErrors.length > 0) {
    throw new BlindedEvaluationError("ENRICHMENT_INVALID", `${source.item_id} enrichment output failed deterministic validation: ${[...validation.shapeErrors, ...validation.semanticErrors].join(",")}`);
  }
  const output = enrichmentValue as EnrichmentOutput;
  const { excerpts, targetToExcerpt, boundary } = generateExcerpts(transcript, output);
  const claims = output.material_claims.map((entry, index) => ({
    claim_id: String(entry.claim_id),
    claim_text: String(entry.claim),
    citation_id: `Q${String(index + 1).padStart(3, "0")}`,
    cited_start_ms: entry.evidence_start_ms,
    cited_end_ms: entry.evidence_end_ms,
    evidence_excerpt_ids: [targetToExcerpt.get(evidenceKey(entry))!],
  }));
  const generatedKeyPoints = output.key_points.map((entry) => ({
    generated_key_point_id: String(entry.key_point_id),
    point_text: String(entry.point),
    evidence_excerpt_ids: [targetToExcerpt.get(evidenceKey(entry))!],
  }));
  const rubricPoints = [
    ...rubric.text_groundable.map((point, index) => ({
      rubric_point_id: `T${String(index + 1).padStart(3, "0")}`,
      kind: "text_groundable" as const,
      essential_meaning: point.essential_meaning,
      contradiction_rule: point.contradiction_rule,
      weight: 1 as const,
    })),
    ...rubric.visual_only.map((point, index) => ({
      rubric_point_id: `V${String(index + 1).padStart(3, "0")}`,
      kind: "visual_only" as const,
      essential_meaning: point.essential_meaning,
      contradiction_rule: point.contradiction_rule,
      weight: 1 as const,
    })),
  ];
  const item = {
    generated_summary: output.summary,
    claims,
    generated_key_points: generatedKeyPoints,
    rubric_points: rubricPoints,
    excerpts,
    boundary_counts: boundary,
  };
  assertNoPrivateContent(item, `${source.item_id} evaluator packet item`);
  return item;
}

function roleOrder(role: EvaluatorRole, sealCommit: string): CanonicalGate4ItemId[] {
  return [...CANONICAL_GATE4_ITEM_IDS].sort((left, right) => {
    const leftHash = sha256(`G4-EVALUATOR-${role === "evaluator_a" ? "A" : "B"}\u0000${sealCommit}\u0000${left}`);
    const rightHash = sha256(`G4-EVALUATOR-${role === "evaluator_a" ? "A" : "B"}\u0000${sealCommit}\u0000${right}`);
    return leftHash.localeCompare(rightHash);
  });
}

export function generateBlindedPackets(input: GenerateBlindedPacketsInput): BlindedPacketBundle {
  if (!/^[0-9a-f]{40}$/.test(input.content_commit) || !/^[0-9a-f]{40}$/.test(input.seal_commit)) {
    throw new BlindedEvaluationError("INVALID_DENOMINATOR", "content_commit and seal_commit must be full 40-character Git object IDs");
  }
  assertSha256(input.benchmark_lock_sha256, "benchmark_lock_sha256");
  assertSha256(input.package_attempt_claim_sha256, "package_attempt_claim_sha256");
  if (!ISO_DATE_TIME_RE.test(input.packet_generated_at) || Number.isNaN(Date.parse(input.packet_generated_at))) {
    throw new BlindedEvaluationError("CONSENT_UNAVAILABLE", "packet_generated_at must be an RFC3339 timestamp");
  }
  const contract = parseContract(input.execution_contract);
  const runtimeBindings = validateLocalRuntimeBindings(contract, input);
  const consent = validateConsentAttestation(input.consent, input.packet_generated_at);
  if (!readinessSchema.safeParse(input.execution_readiness).success) {
    throw new BlindedEvaluationError("EXECUTION_POSTURE_UNAVAILABLE", "the pinned local runtime/model/prompt/sandbox posture is unavailable");
  }
  const authorization = parseAuthorization(input.authorization);
  const rubric = parseRubric(input.rubric);
  requireExactCanonicalIds(input.items, "packet source items");
  for (const source of input.items) {
    assertSha256(source.gate_3_result_sha256, `${source.item_id} gate_3_result_sha256`);
    assertSha256(source.gate_4_attempt_claim_sha256, `${source.item_id} gate_4_attempt_claim_sha256`);
    assertSha256(source.gate_4_public_report_sha256, `${source.item_id} gate_4_public_report_sha256`);
    if (!new RegExp(`^${source.item_id}-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$`).test(source.gate_4_run_id)) {
      throw new BlindedEvaluationError("INVALID_DENOMINATOR", `${source.item_id} has an invalid fixed Gate 4 run ID`);
    }
  }
  if (new Set(input.items.map((source) => source.gate_3_result_sha256)).size !== 1) {
    throw new BlindedEvaluationError("INVALID_DENOMINATOR", "all five packet sources must bind the same Gate 3 result bytes");
  }

  const contractHash = canonicalJsonSha256(contract);
  const consentHash = canonicalJsonSha256(consent);
  const readiness = readinessSchema.parse(input.execution_readiness);
  const readinessHash = canonicalJsonSha256(readiness);
  const byId = new Map<CanonicalGate4ItemId, Omit<BlindedPacketItem, "blinded_item_id" | "packet_item_sha256">>();
  for (const [index, source] of input.items.entries()) {
    if (authorization[index].item_id !== source.item_id || rubric[index].item_id !== source.item_id) {
      throw new BlindedEvaluationError("INVALID_DENOMINATOR", `${source.item_id} authorization/rubric alignment failed`);
    }
    byId.set(source.item_id, buildUnblindedPacketItem(source, rubric[index]));
  }

  const packetResults = {} as BlindedPacketBundle["packets"];
  const mappingById = new Map<CanonicalGate4ItemId, CoordinatorManifestItem>();
  input.items.forEach((source) => mappingById.set(source.item_id, {
    item_id: source.item_id,
    normalized_input_sha256: sha256(Buffer.from(source.normalized_transcript_bytes, "utf8")),
    enrichment_output_sha256: sha256(Buffer.from(source.enrichment_output_bytes, "utf8")),
    gate_3_result_sha256: source.gate_3_result_sha256,
    gate_4_attempt_claim_sha256: source.gate_4_attempt_claim_sha256,
    gate_4_public_report_sha256: source.gate_4_public_report_sha256,
    gate_4_run_id: source.gate_4_run_id,
    roles: {} as CoordinatorManifestItem["roles"],
  }));

  for (const role of EVALUATOR_ROLES) {
    const order = roleOrder(role, input.seal_commit);
    const letter = role === "evaluator_a" ? "A" : "B";
    const items = order.map((itemId, index) => {
      const blindedItemId = `B${String(index + 1).padStart(3, "0")}`;
      const payload = { blinded_item_id: blindedItemId, ...byId.get(itemId)! };
      const packetItem = { ...payload, packet_item_sha256: canonicalJsonSha256(payload) };
      mappingById.get(itemId)!.roles[role] = {
        blinded_item_id: blindedItemId,
        packet_item_sha256: packetItem.packet_item_sha256,
      };
      return packetItem;
    });
    const packet: BlindedEvaluatorPacket = {
      schema_version: "1.0",
      packet_id: `G4-EVAL-${letter}-${sha256(`G4-EVAL-${letter}\u0000${input.seal_commit}\u0000${contractHash}`).slice(0, 12)}`,
      role,
      content_commit: input.content_commit,
      seal_commit: input.seal_commit,
      benchmark_lock_sha256: input.benchmark_lock_sha256,
      execution_contract_sha256: contractHash,
      execution_readiness_sha256: readinessHash,
      consent_attestation_sha256: consentHash,
      runtime_ledger_sha256: runtimeBindings.runtimeLedgerSha256,
      role_system_prompt_sha256: runtimeBindings.rolePromptSha256[role],
      role_generation_schema_sha256: runtimeBindings.roleGenerationSchemaSha256[role],
      sandbox_profile_sha256: runtimeBindings.sandboxProfileSha256,
      ordering_sha256: canonicalJsonSha256(order),
      transfer_boundary: {
        maximum_excerpts_per_item: 12,
        maximum_words_per_excerpt: 40,
        maximum_total_excerpt_words_per_item: 240,
        maximum_unique_transcript_word_position_fraction: 0.35,
        complete_or_reconstructable_transcript_prohibited: true,
      },
      items,
      instructions: {
        score_every_claim_citation_and_rubric_point_once: true,
        no_new_summary_or_claim_text: true,
        use_only_approved_excerpt_ids: true,
        no_tools_network_or_external_calls: true,
        thresholds_computed_by_coordinator: true,
      },
      claims_boundary: CLAIMS_BOUNDARY,
    };
    assertNoPrivateContent(packet, `${role} packet`);
    packetResults[role] = { packet, packet_sha256: canonicalJsonSha256(packet) };
  }

  return {
    schema_version: "1.0",
    tool_version: BLINDED_EVALUATION_TOOL_VERSION,
    content_commit: input.content_commit,
    seal_commit: input.seal_commit,
    benchmark_lock_sha256: input.benchmark_lock_sha256,
    package_attempt_claim_sha256: input.package_attempt_claim_sha256,
    execution_contract_sha256: contractHash,
    execution_readiness_sha256: readinessHash,
    runtime_ledger_sha256: runtimeBindings.runtimeLedgerSha256,
    sandbox_profile_sha256: runtimeBindings.sandboxProfileSha256,
    role_system_prompt_sha256: runtimeBindings.rolePromptSha256,
    role_generation_schema_sha256: runtimeBindings.roleGenerationSchemaSha256,
    packet_generated_at: input.packet_generated_at,
    consent_attestation_sha256: consentHash,
    packets: packetResults,
    coordinator_manifest: {
      classification: "private_do_not_publish",
      item_ids: CANONICAL_GATE4_ITEM_IDS,
      items: CANONICAL_GATE4_ITEM_IDS.map((itemId) => mappingById.get(itemId)!),
    },
  };
}

export function verifyGeneratedPacketBundle(
  input: GenerateBlindedPacketsInput,
  value: unknown,
): asserts value is BlindedPacketBundle {
  const regenerated = generateBlindedPackets(input);
  if (canonicalJson(value) !== canonicalJson(regenerated)) {
    throw new BlindedEvaluationError("RESULT_INVALID", "blinded packet bundle does not exactly reproduce from the sealed generator inputs");
  }
}

function verifyBundleInternal(bundle: BlindedPacketBundle): void {
  if (
    bundle.schema_version !== "1.0"
    || bundle.tool_version !== BLINDED_EVALUATION_TOOL_VERSION
    || !/^[0-9a-f]{40}$/.test(bundle.content_commit)
    || !/^[0-9a-f]{40}$/.test(bundle.seal_commit)
    || !SHA256_RE.test(bundle.benchmark_lock_sha256)
    || !SHA256_RE.test(bundle.package_attempt_claim_sha256)
    || !SHA256_RE.test(bundle.execution_contract_sha256)
    || !SHA256_RE.test(bundle.execution_readiness_sha256)
    || !SHA256_RE.test(bundle.consent_attestation_sha256)
    || !SHA256_RE.test(bundle.runtime_ledger_sha256)
    || !SHA256_RE.test(bundle.sandbox_profile_sha256)
    || !bundle.role_system_prompt_sha256
    || !bundle.role_generation_schema_sha256
    || bundle.coordinator_manifest.classification !== "private_do_not_publish"
    || canonicalJson(bundle.coordinator_manifest.item_ids) !== canonicalJson(CANONICAL_GATE4_ITEM_IDS)
  ) throw new BlindedEvaluationError("RESULT_INVALID", "packet bundle identity is invalid");
  requireExactCanonicalIds(bundle.coordinator_manifest.items, "coordinator manifest");
  for (const item of bundle.coordinator_manifest.items) {
    if (
      !SHA256_RE.test(item.normalized_input_sha256)
      || !SHA256_RE.test(item.enrichment_output_sha256)
      || !SHA256_RE.test(item.gate_3_result_sha256)
      || !SHA256_RE.test(item.gate_4_attempt_claim_sha256)
      || !SHA256_RE.test(item.gate_4_public_report_sha256)
      || !new RegExp(`^${item.item_id}-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$`).test(item.gate_4_run_id)
    ) throw new BlindedEvaluationError("RESULT_INVALID", `${item.item_id} coordinator evidence binding is invalid`);
  }
  if (new Set(bundle.coordinator_manifest.items.map((item) => item.gate_3_result_sha256)).size !== 1) {
    throw new BlindedEvaluationError("RESULT_INVALID", "coordinator manifest binds multiple Gate 3 result documents");
  }
  for (const role of EVALUATOR_ROLES) {
    const record = bundle.packets[role];
    if (
      !record
      || record.packet.role !== role
      || record.packet.content_commit !== bundle.content_commit
      || record.packet.seal_commit !== bundle.seal_commit
      || record.packet.benchmark_lock_sha256 !== bundle.benchmark_lock_sha256
      || record.packet.execution_contract_sha256 !== bundle.execution_contract_sha256
      || record.packet.execution_readiness_sha256 !== bundle.execution_readiness_sha256
      || record.packet.consent_attestation_sha256 !== bundle.consent_attestation_sha256
      || record.packet.runtime_ledger_sha256 !== bundle.runtime_ledger_sha256
      || record.packet.sandbox_profile_sha256 !== bundle.sandbox_profile_sha256
      || record.packet.role_system_prompt_sha256 !== bundle.role_system_prompt_sha256[role]
      || record.packet.role_generation_schema_sha256 !== bundle.role_generation_schema_sha256[role]
      || record.packet.items.length !== 5
      || canonicalJsonSha256(record.packet) !== record.packet_sha256
    ) throw new BlindedEvaluationError("RESULT_INVALID", `${role} packet identity or hash is invalid`);
    exactUniqueIds(record.packet.items.map((item) => item.blinded_item_id), ["B001", "B002", "B003", "B004", "B005"], `${role} packet items`);
    record.packet.items.forEach((item) => {
      const { packet_item_sha256: packetItemHash, ...payload } = item;
      if (canonicalJsonSha256(payload) !== packetItemHash) throw new BlindedEvaluationError("RESULT_INVALID", `${role}/${item.blinded_item_id} packet-item hash is invalid`);
      const excerptIds = item.excerpts.map((excerpt) => excerpt.excerpt_id);
      exactUniqueIds(excerptIds, excerptIds.map((_, index) => `E${String(index + 1).padStart(3, "0")}`), `${role}/${item.blinded_item_id} excerpts`);
      const actualWords = item.excerpts.map((excerpt) => Array.from(excerpt.text.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu)).length);
      if (
        item.excerpts.length !== item.boundary_counts.excerpt_count
        || item.excerpts.some((excerpt, index) => excerpt.word_count !== actualWords[index] || excerpt.word_count < 1 || excerpt.word_count > 40)
        || item.excerpts.reduce((sum, excerpt) => sum + excerpt.word_count, 0) !== item.boundary_counts.total_excerpt_words
        || item.boundary_counts.total_excerpt_words > 240
        || item.boundary_counts.unique_transcript_word_positions >= item.boundary_counts.transcript_word_positions
        || item.boundary_counts.unique_transcript_word_position_fraction !== item.boundary_counts.unique_transcript_word_positions / item.boundary_counts.transcript_word_positions
        || item.boundary_counts.unique_transcript_word_position_fraction > 0.35
        || item.boundary_counts.complete_transcript_included
        || item.boundary_counts.reconstructable_transcript_detected
      ) throw new BlindedEvaluationError("RESULT_INVALID", `${role}/${item.blinded_item_id} excerpt arithmetic or non-reconstructability record is invalid`);
      const claims = item.claims.map((claim) => claim.claim_id);
      const points = item.generated_key_points.map((point) => point.generated_key_point_id);
      item.excerpts.forEach((excerpt) => {
        if (excerpt.authorized_for_claim_ids.some((id) => !claims.includes(id)) || excerpt.authorized_for_generated_key_point_ids.some((id) => !points.includes(id))) {
          throw new BlindedEvaluationError("RESULT_INVALID", `${role}/${item.blinded_item_id} excerpt authorization references an unknown output element`);
        }
      });
      item.claims.forEach((claim) => excerptRefsAllowed(claim.evidence_excerpt_ids, excerptIds, `${role}/${item.blinded_item_id}/${claim.claim_id}`));
      item.generated_key_points.forEach((point) => excerptRefsAllowed(point.evidence_excerpt_ids, excerptIds, `${role}/${item.blinded_item_id}/${point.generated_key_point_id}`));
    });
    bundle.coordinator_manifest.items.forEach((manifestItem) => {
      const mapping = manifestItem.roles[role];
      const packetItem = record.packet.items.find((item) => item.blinded_item_id === mapping.blinded_item_id);
      if (!packetItem || packetItem.packet_item_sha256 !== mapping.packet_item_sha256) {
        throw new BlindedEvaluationError("RESULT_INVALID", `${role}/${manifestItem.item_id} coordinator mapping does not bind the packet item`);
      }
    });
  }
}

export function verifyBlindedPacketBundle(value: unknown): asserts value is BlindedPacketBundle {
  if (!value || typeof value !== "object") {
    throw new BlindedEvaluationError("RESULT_INVALID", "packet bundle must be an object");
  }
  verifyBundleInternal(value as BlindedPacketBundle);
}

const evaluatorExecutionAttestationSchema = z.object({
  fresh_process: z.literal(true),
  packet_only_file_context: z.literal(true),
  candidate_identity_hidden: z.literal(true),
  candidate_runtime_hidden: z.literal(true),
  price_latency_hidden: z.literal(true),
  other_evaluator_unseen: z.literal(true),
  pinned_runtime_verified: z.literal(true),
  pinned_model_verified: z.literal(true),
  role_prompt_hash_verified: z.literal(true),
  deny_network_sandbox_verified: z.literal(true),
  tools_available: z.literal(false),
  network_available: z.literal(false),
  external_content_transfer: z.literal(false),
  evaluator_initiated_provider_calls: z.literal(0),
  external_api_calls: z.literal(0),
  incremental_spend_usd: z.literal(0),
  local_model_identity: z.literal("LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"),
  same_model_evaluator_bias_acknowledged: z.literal(true),
  training_performed: z.literal(false),
  private_retention_delete_by: z.literal("2026-10-14"),
  contract_accepted: z.literal(true),
  consent_attestation_present: z.literal(true),
}).strict();

const claimScoreSchema = z.object({
  claim_id: z.string().regex(/^C[0-9]{3}$/),
  support: z.enum(["fully_supported", "partially_supported", "unsupported", "contradicted"]),
  evidence_excerpt_ids: z.array(z.string().regex(/^E[0-9]{3}$/)).min(1).max(12),
  rationale: z.string().min(1).max(1200),
}).strict();
const citationScoreSchema = z.object({
  citation_id: z.string().regex(/^Q[0-9]{3}$/),
  assessment: z.enum(["correct", "incorrect", "missing"]),
  evidence_excerpt_ids: z.array(z.string().regex(/^E[0-9]{3}$/)).min(1).max(12),
  rationale: z.string().min(1).max(1200),
}).strict();
const keyPointScoreSchema = z.object({
  rubric_point_id: z.string().regex(/^[TV][0-9]{3}$/),
  kind: z.enum(["text_groundable", "visual_only"]),
  covered: z.boolean(),
  cause: z.enum(["supported_by_transcript_and_output", "output_omission", "essential_visual_evidence_absent", "contradicted"]),
  evidence_excerpt_ids: z.array(z.string().regex(/^E[0-9]{3}$/)).max(12),
  rationale: z.string().min(1).max(1200),
}).strict();
const criticalHallucinationSchema = z.object({
  claim_id: z.string().regex(/^C[0-9]{3}$/),
  category: z.enum(["safety", "rights_policy", "identity_attribution", "quantity", "chronology", "recommended_action", "source_evidence"]),
  evidence_excerpt_ids: z.array(z.string().regex(/^E[0-9]{3}$/)).min(1).max(12),
  rationale: z.string().min(1).max(1200),
}).strict();
const schemaIssueSchema = z.object({
  subject_id: z.string().regex(/^(PACKET|C[0-9]{3}|Q[0-9]{3}|[TV][0-9]{3})$/),
  field_pointer: z.string().min(2).max(300).regex(/^\//),
  rationale: z.string().min(1).max(1200),
}).strict();
const evaluatorItemResultSchema = z.object({
  blinded_item_id: z.string().regex(/^B00[1-5]$/),
  packet_item_sha256: z.string().regex(SHA256_RE),
  claim_scores: z.array(claimScoreSchema).min(1).max(12),
  citation_scores: z.array(citationScoreSchema).min(1).max(12),
  key_point_scores: z.array(keyPointScoreSchema).min(1).max(30),
  critical_hallucinations: z.array(criticalHallucinationSchema).max(12),
  schema_or_reference_issues: z.array(schemaIssueSchema).max(30),
  confidence: z.enum(["low", "medium", "high"]),
}).strict();
const evaluatorResultSchema = z.object({
  schema_version: z.literal("1.1"),
  packet_id: z.string().regex(/^G4-EVAL-[AB]-[0-9a-f]{12}$/),
  packet_sha256: z.string().regex(SHA256_RE),
  execution_contract_sha256: z.string().regex(SHA256_RE),
  role: z.enum(["evaluator_a", "evaluator_b"]),
  execution_attestation: evaluatorExecutionAttestationSchema,
  started_at: z.string().regex(ISO_DATE_TIME_RE),
  completed_at: z.string().regex(ISO_DATE_TIME_RE),
  items: z.array(evaluatorItemResultSchema).length(5),
  claims_boundary: z.literal(CLAIMS_BOUNDARY),
}).strict();

export type BlindedEvaluatorResult = z.infer<typeof evaluatorResultSchema>;

function exactUniqueIds(actual: readonly string[], expected: readonly string[], context: string): void {
  if (
    actual.length !== expected.length
    || actual.some((id, index) => id !== expected[index])
    || new Set(actual).size !== actual.length
  ) throw new BlindedEvaluationError("RESULT_INVALID", `${context} must contain every packet ID exactly once in packet order`);
}

function excerptRefsAllowed(actual: readonly string[], allowed: readonly string[], context: string, permitEmpty = false): void {
  if ((!permitEmpty && actual.length < 1) || new Set(actual).size !== actual.length || actual.some((id) => !allowed.includes(id))) {
    throw new BlindedEvaluationError("RESULT_INVALID", `${context} contains a missing, duplicate, or unapproved excerpt reference`);
  }
}

export function verifyEvaluatorResult(
  value: unknown,
  bundle: BlindedPacketBundle,
  expectedRole: EvaluatorRole,
): BlindedEvaluatorResult {
  verifyBundleInternal(bundle);
  const parsed = evaluatorResultSchema.safeParse(value);
  if (!parsed.success) throw new BlindedEvaluationError("RESULT_INVALID", `the ${expectedRole} result violates the strict result shape`);
  const result = parsed.data;
  const packetRecord = bundle.packets[expectedRole];
  const packet = packetRecord.packet;
  if (
    result.role !== expectedRole
    || result.packet_id !== packet.packet_id
    || result.packet_sha256 !== packetRecord.packet_sha256
    || result.execution_contract_sha256 !== bundle.execution_contract_sha256
    || Number.isNaN(Date.parse(result.started_at))
    || Number.isNaN(Date.parse(result.completed_at))
    || Date.parse(result.completed_at) < Date.parse(result.started_at)
    || Date.parse(result.started_at) < Date.parse(bundle.packet_generated_at)
  ) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole} result identity, posture, or chronology is invalid`);
  exactUniqueIds(result.items.map((item) => item.blinded_item_id), packet.items.map((item) => item.blinded_item_id), `${expectedRole} items`);
  result.items.forEach((item, itemIndex) => {
    const source = packet.items[itemIndex];
    if (item.packet_item_sha256 !== source.packet_item_sha256) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id} packet-item hash mismatch`);
    const excerptIds = source.excerpts.map((excerpt) => excerpt.excerpt_id);
    exactUniqueIds(item.claim_scores.map((score) => score.claim_id), source.claims.map((claim) => claim.claim_id), `${expectedRole}/${item.blinded_item_id} claim scores`);
    exactUniqueIds(item.citation_scores.map((score) => score.citation_id), source.claims.map((claim) => claim.citation_id), `${expectedRole}/${item.blinded_item_id} citation scores`);
    exactUniqueIds(item.key_point_scores.map((score) => score.rubric_point_id), source.rubric_points.map((point) => point.rubric_point_id), `${expectedRole}/${item.blinded_item_id} key-point scores`);
    item.claim_scores.forEach((score, index) => excerptRefsAllowed(score.evidence_excerpt_ids, source.claims[index].evidence_excerpt_ids, `${expectedRole}/${item.blinded_item_id}/${score.claim_id}`));
    item.citation_scores.forEach((score, index) => excerptRefsAllowed(score.evidence_excerpt_ids, source.claims[index].evidence_excerpt_ids, `${expectedRole}/${item.blinded_item_id}/${score.citation_id}`));
    item.key_point_scores.forEach((score, index) => {
      const point = source.rubric_points[index];
      if (score.kind !== point.kind) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id}/${score.rubric_point_id} kind mismatch`);
      excerptRefsAllowed(score.evidence_excerpt_ids, excerptIds, `${expectedRole}/${item.blinded_item_id}/${score.rubric_point_id}`, true);
      if (score.covered !== (score.cause === "supported_by_transcript_and_output")) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id}/${score.rubric_point_id} covered/cause contradiction`);
      if (score.kind === "text_groundable" && score.cause === "essential_visual_evidence_absent") throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id}/${score.rubric_point_id} uses a visual-only cause for text`);
      if (score.covered && score.evidence_excerpt_ids.length === 0) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id}/${score.rubric_point_id} has no approved evidence`);
    });
    const claimIds = source.claims.map((claim) => claim.claim_id);
    const subjectIds = new Set(["PACKET", ...claimIds, ...source.claims.map((claim) => claim.citation_id), ...source.rubric_points.map((point) => point.rubric_point_id)]);
    const hallucinationKeys = new Set<string>();
    item.critical_hallucinations.forEach((finding) => {
      if (!claimIds.includes(finding.claim_id)) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id} hallucination references an unknown claim`);
      const claim = source.claims.find((candidate) => candidate.claim_id === finding.claim_id)!;
      excerptRefsAllowed(finding.evidence_excerpt_ids, claim.evidence_excerpt_ids, `${expectedRole}/${item.blinded_item_id} hallucination`);
      const key = `${finding.claim_id}\u0000${finding.category}`;
      if (hallucinationKeys.has(key)) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id} duplicates a hallucination finding`);
      hallucinationKeys.add(key);
    });
    const issueKeys = new Set<string>();
    item.schema_or_reference_issues.forEach((issue) => {
      if (!subjectIds.has(issue.subject_id)) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id} issue references an unknown subject`);
      const key = `${issue.subject_id}\u0000${issue.field_pointer}`;
      if (issueKeys.has(key)) throw new BlindedEvaluationError("RESULT_INVALID", `${expectedRole}/${item.blinded_item_id} duplicates a schema/reference issue`);
      issueKeys.add(key);
    });
  });
  assertNoPrivateContent(result, `${expectedRole} result`);
  return result;
}

interface CanonicalEvaluatorItem {
  itemId: CanonicalGate4ItemId;
  packetItem: BlindedPacketItem;
  result: BlindedEvaluatorResult["items"][number];
}

function canonicalEvaluatorItems(
  result: BlindedEvaluatorResult,
  bundle: BlindedPacketBundle,
  role: EvaluatorRole,
): CanonicalEvaluatorItem[] {
  return CANONICAL_GATE4_ITEM_IDS.map((itemId) => {
    const mapping = bundle.coordinator_manifest.items.find((item) => item.item_id === itemId)!.roles[role];
    const packetItem = bundle.packets[role].packet.items.find((item) => item.blinded_item_id === mapping.blinded_item_id)!;
    const resultItem = result.items.find((item) => item.blinded_item_id === mapping.blinded_item_id)!;
    return { itemId, packetItem, result: resultItem };
  });
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface EvaluationDispute {
  dispute_id: string;
  item_id: CanonicalGate4ItemId;
  kind: "claim_support" | "citation_accuracy" | "text_key_point" | "visual_key_point" | "critical_hallucinations" | "schema_reference_issues";
  subject_id: string;
  evaluator_a_value: unknown;
  evaluator_b_value: unknown;
  evaluator_a_rationale: string;
  evaluator_b_rationale: string;
  evidence_excerpt_ids: string[];
}

function supportOrdinal(value: ClaimSupport): number {
  return { contradicted: 0, unsupported: 1, partially_supported: 2, fully_supported: 3 }[value];
}

function findingSignature(value: unknown): string {
  return canonicalJson(value);
}

export function deriveRequiredDisputes(
  bundle: BlindedPacketBundle,
  evaluatorAValue: unknown,
  evaluatorBValue: unknown,
): EvaluationDispute[] {
  const evaluatorA = verifyEvaluatorResult(evaluatorAValue, bundle, "evaluator_a");
  const evaluatorB = verifyEvaluatorResult(evaluatorBValue, bundle, "evaluator_b");
  const aItems = canonicalEvaluatorItems(evaluatorA, bundle, "evaluator_a");
  const bItems = canonicalEvaluatorItems(evaluatorB, bundle, "evaluator_b");
  const disputes: EvaluationDispute[] = [];
  const add = (itemId: CanonicalGate4ItemId, kind: EvaluationDispute["kind"], subjectId: string, a: unknown, b: unknown, aRationale: string, bRationale: string, excerptIds: string[]): void => {
    const disputeId = `D${sha256(`${bundle.seal_commit}\u0000${itemId}\u0000${kind}\u0000${subjectId}`).slice(0, 12)}`;
    disputes.push({ dispute_id: disputeId, item_id: itemId, kind, subject_id: subjectId, evaluator_a_value: a, evaluator_b_value: b, evaluator_a_rationale: aRationale, evaluator_b_rationale: bRationale, evidence_excerpt_ids: [...new Set(excerptIds)] });
  };
  CANONICAL_GATE4_ITEM_IDS.forEach((itemId, itemIndex) => {
    const a = aItems[itemIndex].result;
    const b = bItems[itemIndex].result;
    a.claim_scores.forEach((aScore, index) => {
      const bScore = b.claim_scores[index];
      // Every metric disagreement is adjudicated.  Looking only at each
      // evaluator's standalone pass/fail bit is insufficient: A and B can
      // each pass while disagreeing on disjoint subjects, after which the
      // conservative combined score crosses a threshold.  The exact-five
      // adjudicator is still invoked at most once for the complete dispute
      // set.
      if (aScore.support !== bScore.support) {
        add(itemId, "claim_support", aScore.claim_id, aScore.support, bScore.support, aScore.rationale, bScore.rationale, [...aScore.evidence_excerpt_ids, ...bScore.evidence_excerpt_ids]);
      }
    });
    a.citation_scores.forEach((aScore, index) => {
      const bScore = b.citation_scores[index];
      if (aScore.assessment !== bScore.assessment) {
        add(itemId, "citation_accuracy", aScore.citation_id, aScore.assessment, bScore.assessment, aScore.rationale, bScore.rationale, [...aScore.evidence_excerpt_ids, ...bScore.evidence_excerpt_ids]);
      }
    });
    a.key_point_scores.forEach((aScore, index) => {
      const bScore = b.key_point_scores[index];
      const differs = aScore.covered !== bScore.covered || aScore.cause !== bScore.cause;
      if (differs) add(itemId, aScore.kind === "text_groundable" ? "text_key_point" : "visual_key_point", aScore.rubric_point_id, { covered: aScore.covered, cause: aScore.cause }, { covered: bScore.covered, cause: bScore.cause }, aScore.rationale, bScore.rationale, [...aScore.evidence_excerpt_ids, ...bScore.evidence_excerpt_ids]);
    });
    if (findingSignature(a.critical_hallucinations) !== findingSignature(b.critical_hallucinations)) {
      add(itemId, "critical_hallucinations", "ITEM", a.critical_hallucinations, b.critical_hallucinations, "Evaluator A critical-hallucination record.", "Evaluator B critical-hallucination record.", [...a.critical_hallucinations, ...b.critical_hallucinations].flatMap((finding) => finding.evidence_excerpt_ids));
    }
    if (findingSignature(a.schema_or_reference_issues) !== findingSignature(b.schema_or_reference_issues)) {
      add(itemId, "schema_reference_issues", "ITEM", a.schema_or_reference_issues, b.schema_or_reference_issues, "Evaluator A schema/reference record.", "Evaluator B schema/reference record.", []);
    }
  });
  return disputes;
}

export interface AdjudicationPacket {
  schema_version: "1.0";
  packet_id: string;
  role: "adjudicator";
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  execution_contract_sha256: string;
  execution_readiness_sha256: string;
  consent_attestation_sha256: string;
  runtime_ledger_sha256: string;
  role_system_prompt_sha256: string;
  role_generation_schema_sha256: string;
  sandbox_profile_sha256: string;
  source_evaluator_result_sha256: { evaluator_a: string; evaluator_b: string };
  items: Array<{
    blinded_item_id: string;
    disputes: Array<{
      dispute_id: string;
      kind: EvaluationDispute["kind"];
      subject_id: string;
      evaluator_a: { value: unknown; rationale: string };
      evaluator_b: { value: unknown; rationale: string };
      approved_excerpts: Array<{ excerpt_id: string; text: string }>;
    }>;
  }>;
  instructions: {
    select_exactly_one_original_option_per_dispute: true;
    no_new_score_or_additional_evidence: true;
    no_tools_network_or_external_calls: true;
  };
  claims_boundary: typeof CLAIMS_BOUNDARY;
}

export interface AdjudicationPacketBundle {
  state: "not_required" | "required";
  packet: AdjudicationPacket | null;
  packet_sha256: string | null;
  disputes: EvaluationDispute[];
  mapping: Array<{ item_id: CanonicalGate4ItemId; blinded_item_id: string }>;
}

export function buildAdjudicationPacket(
  bundle: BlindedPacketBundle,
  evaluatorAValue: unknown,
  evaluatorBValue: unknown,
): AdjudicationPacketBundle {
  const evaluatorA = verifyEvaluatorResult(evaluatorAValue, bundle, "evaluator_a");
  const evaluatorB = verifyEvaluatorResult(evaluatorBValue, bundle, "evaluator_b");
  const disputes = deriveRequiredDisputes(bundle, evaluatorA, evaluatorB);
  if (disputes.length === 0) return { state: "not_required", packet: null, packet_sha256: null, disputes: [], mapping: [] };
  const order = [...CANONICAL_GATE4_ITEM_IDS].sort((left, right) => sha256(`G4-EVALUATOR-J\u0000${bundle.seal_commit}\u0000${left}`).localeCompare(sha256(`G4-EVALUATOR-J\u0000${bundle.seal_commit}\u0000${right}`)));
  const mapping = order.map((itemId, index) => ({ item_id: itemId, blinded_item_id: `J${String(index + 1).padStart(3, "0")}` }));
  const packet: AdjudicationPacket = {
    schema_version: "1.0",
    packet_id: `G4-EVAL-J-${sha256(`G4-EVAL-J\u0000${bundle.seal_commit}\u0000${canonicalJsonSha256(disputes)}`).slice(0, 12)}`,
    role: "adjudicator",
    content_commit: bundle.content_commit,
    seal_commit: bundle.seal_commit,
    benchmark_lock_sha256: bundle.benchmark_lock_sha256,
    execution_contract_sha256: bundle.execution_contract_sha256,
    execution_readiness_sha256: bundle.execution_readiness_sha256,
    consent_attestation_sha256: bundle.consent_attestation_sha256,
    runtime_ledger_sha256: bundle.runtime_ledger_sha256,
    role_system_prompt_sha256: bundle.role_system_prompt_sha256.adjudicator,
    role_generation_schema_sha256: bundle.role_generation_schema_sha256.adjudicator,
    sandbox_profile_sha256: bundle.sandbox_profile_sha256,
    source_evaluator_result_sha256: { evaluator_a: canonicalJsonSha256(evaluatorA), evaluator_b: canonicalJsonSha256(evaluatorB) },
    items: mapping.map(({ item_id: itemId, blinded_item_id: blindedItemId }) => {
      const itemDisputes = disputes.filter((dispute) => dispute.item_id === itemId);
      const packetItems = EVALUATOR_ROLES.map((role) => {
        const roleMap = bundle.coordinator_manifest.items.find((item) => item.item_id === itemId)!.roles[role];
        return bundle.packets[role].packet.items.find((item) => item.blinded_item_id === roleMap.blinded_item_id)!;
      });
      return {
        blinded_item_id: blindedItemId,
        disputes: itemDisputes.map((dispute) => ({
          dispute_id: dispute.dispute_id,
          kind: dispute.kind,
          subject_id: dispute.subject_id,
          evaluator_a: { value: dispute.evaluator_a_value, rationale: dispute.evaluator_a_rationale },
          evaluator_b: { value: dispute.evaluator_b_value, rationale: dispute.evaluator_b_rationale },
          approved_excerpts: dispute.evidence_excerpt_ids.map((excerptId) => {
            const excerpt = packetItems[0].excerpts.find((candidate) => candidate.excerpt_id === excerptId) ?? packetItems[1].excerpts.find((candidate) => candidate.excerpt_id === excerptId);
            if (!excerpt) throw new BlindedEvaluationError("ADJUDICATION_INVALID", `dispute ${dispute.dispute_id} references an unavailable excerpt`);
            return { excerpt_id: excerptId, text: excerpt.text };
          }),
        })),
      };
    }),
    instructions: {
      select_exactly_one_original_option_per_dispute: true,
      no_new_score_or_additional_evidence: true,
      no_tools_network_or_external_calls: true,
    },
    claims_boundary: CLAIMS_BOUNDARY,
  };
  assertNoPrivateContent(packet, "adjudication packet");
  return { state: "required", packet, packet_sha256: canonicalJsonSha256(packet), disputes, mapping };
}

const adjudicationAttestationSchema = z.object({
  fresh_process: z.literal(true),
  packet_only_file_context: z.literal(true),
  candidate_identity_hidden: z.literal(true),
  candidate_runtime_hidden: z.literal(true),
  price_latency_hidden: z.literal(true),
  both_evaluator_results_seen_only_for_disputes: z.literal(true),
  pinned_runtime_verified: z.literal(true),
  pinned_model_verified: z.literal(true),
  role_prompt_hash_verified: z.literal(true),
  deny_network_sandbox_verified: z.literal(true),
  tools_available: z.literal(false),
  network_available: z.literal(false),
  external_content_transfer: z.literal(false),
  evaluator_initiated_provider_calls: z.literal(0),
  external_api_calls: z.literal(0),
  incremental_spend_usd: z.literal(0),
  local_model_identity: z.literal("LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637"),
  same_model_evaluator_bias_acknowledged: z.literal(true),
  training_performed: z.literal(false),
  private_retention_delete_by: z.literal("2026-10-14"),
  contract_accepted: z.literal(true),
  consent_attestation_present: z.literal(true),
  additional_transcript_content_received: z.literal(false),
}).strict();
const adjudicationResultSchema = z.object({
  schema_version: z.literal("1.0"),
  packet_id: z.string().regex(/^G4-EVAL-J-[0-9a-f]{12}$/),
  packet_sha256: z.string().regex(SHA256_RE),
  execution_contract_sha256: z.string().regex(SHA256_RE),
  role: z.literal("adjudicator"),
  execution_attestation: adjudicationAttestationSchema,
  started_at: z.string().regex(ISO_DATE_TIME_RE),
  completed_at: z.string().regex(ISO_DATE_TIME_RE),
  items: z.array(z.object({
    blinded_item_id: z.string().regex(/^J00[1-5]$/),
    decisions: z.array(z.object({
      dispute_id: z.string().regex(/^D[0-9a-f]{12}$/),
      selected_option: z.enum(["evaluator_a", "evaluator_b"]),
      rationale: z.string().min(1).max(1200),
    }).strict()).max(100),
  }).strict()).length(5),
  claims_boundary: z.literal(CLAIMS_BOUNDARY),
}).strict();
export type BlindedAdjudicationResult = z.infer<typeof adjudicationResultSchema>;

export function verifyAdjudicationResult(value: unknown, adjudication: AdjudicationPacketBundle, packetGeneratedAt: string): BlindedAdjudicationResult {
  if (adjudication.state !== "required" || !adjudication.packet || !adjudication.packet_sha256) throw new BlindedEvaluationError("ADJUDICATION_INVALID", "adjudication is not required for this evaluator pair");
  const parsed = adjudicationResultSchema.safeParse(value);
  if (!parsed.success) throw new BlindedEvaluationError("ADJUDICATION_INVALID", "adjudication result violates the strict exact-five shape");
  const result = parsed.data;
  if (
    result.packet_id !== adjudication.packet.packet_id
    || result.packet_sha256 !== adjudication.packet_sha256
    || result.execution_contract_sha256 !== adjudication.packet.execution_contract_sha256
    || Date.parse(result.started_at) < Date.parse(packetGeneratedAt)
    || Date.parse(result.completed_at) < Date.parse(result.started_at)
  ) throw new BlindedEvaluationError("ADJUDICATION_INVALID", "adjudication identity or chronology mismatch");
  exactUniqueIds(result.items.map((item) => item.blinded_item_id), adjudication.packet.items.map((item) => item.blinded_item_id), "adjudication items");
  result.items.forEach((item, index) => exactUniqueIds(item.decisions.map((decision) => decision.dispute_id), adjudication.packet!.items[index].disputes.map((dispute) => dispute.dispute_id), `${item.blinded_item_id} adjudication decisions`));
  assertNoPrivateContent(result, "adjudication result");
  return result;
}

interface FinalItemScores {
  itemId: CanonicalGate4ItemId;
  claims: BlindedEvaluatorResult["items"][number]["claim_scores"];
  citations: BlindedEvaluatorResult["items"][number]["citation_scores"];
  points: BlindedEvaluatorResult["items"][number]["key_point_scores"];
  hallucinations: BlindedEvaluatorResult["items"][number]["critical_hallucinations"];
  issues: BlindedEvaluatorResult["items"][number]["schema_or_reference_issues"];
}

function chooseConservativeSupport(a: ClaimSupport, b: ClaimSupport): ClaimSupport {
  return supportOrdinal(a) <= supportOrdinal(b) ? a : b;
}

function chosenRoleForDispute(disputeId: string, adjudication: AdjudicationPacketBundle, result: BlindedAdjudicationResult | null): EvaluatorRole | null {
  if (!result) return null;
  const decision = result.items.flatMap((item) => item.decisions).find((candidate) => candidate.dispute_id === disputeId);
  if (!decision || !adjudication.disputes.some((dispute) => dispute.dispute_id === disputeId)) throw new BlindedEvaluationError("ADJUDICATION_INVALID", `missing decision for ${disputeId}`);
  return decision.selected_option;
}

function metricCount(values: readonly boolean[]): { numerator: number; denominator: number; rate: number } {
  if (values.length < 1) throw new BlindedEvaluationError("AGGREGATE_INVALID", "a locked metric has an empty denominator");
  const numerator = values.filter(Boolean).length;
  return { numerator, denominator: values.length, rate: numerator / values.length };
}

export interface Gate4Aggregate {
  schema_version: "1.1";
  finalizer_version: "1.0.0";
  execution_class: "SEALED" | "DEV_TEST";
  publication_eligible: boolean;
  content_commit: string;
  seal_commit: string;
  benchmark_lock_sha256: string;
  evidence_bindings: Gate4EvidenceBindings;
  deterministic_baseline: Gate4DeterministicBaseline;
  evaluator_result_sha256: { evaluator_a: string; evaluator_b: string };
  adjudication: { state: "not_required" | "completed"; required_disputes: number; resolved_disputes: number; result_sha256: string | null };
  denominator: { items: 5; item_ids: readonly CanonicalGate4ItemId[] };
  per_item: Array<{
    item_id: CanonicalGate4ItemId;
    material_claim_support: ReturnType<typeof metricCount>;
    citation_accuracy: ReturnType<typeof metricCount>;
    text_key_point_coverage: ReturnType<typeof metricCount>;
    visual_key_point_coverage: ReturnType<typeof metricCount>;
    critical_hallucinations: number;
    schema_or_reference_issue_count: number;
  }>;
  pooled: {
    material_claim_support: ReturnType<typeof metricCount>;
    citation_accuracy: ReturnType<typeof metricCount>;
    text_key_point_coverage: ReturnType<typeof metricCount>;
    visual_key_point_coverage: ReturnType<typeof metricCount>;
  };
  macro: {
    material_claim_support: { item_count: 5; rate: number };
    citation_accuracy: { item_count: 5; rate: number };
    text_key_point_coverage: { item_count: 5; rate: number };
    visual_key_point_coverage: { item_count: 5; rate: number };
  };
  thresholds: { material_claim_support: 0.95; citation_accuracy: 0.9; text_key_point_coverage: 0.8; visual_key_point_trigger: 0.8; critical_hallucinations: 0 };
  gate_4_qualitative_pass: boolean;
  gate_4_overall_pass: boolean;
  gate_5_trigger: {
    state: "not_triggered" | "triggered_but_blocked";
    execution_state: "not_run";
    macro_visual_coverage: number;
    threshold: 0.8;
    uncovered_visual_points: number;
    uncovered_cause_counts: { output_omission: number; essential_visual_evidence_absent: number; contradicted: number };
    due_solely_to_missing_visual_evidence: boolean;
    trigger_fired: boolean;
    visual_method_sealed: false;
    rights_authorized_visual_media_set_present: false;
    blocked_reasons: [] | ["no_sealed_visual_method", "no_rights_authorized_visual_media_set"];
  };
  claims_boundary: typeof CLAIMS_BOUNDARY;
}

export interface JsonEvidenceHashBinding {
  file_sha256: string;
  canonical_json_sha256: string;
}

export interface Gate4RoleEvidenceBindings {
  public_attempt_claim: JsonEvidenceHashBinding;
  public_terminal: JsonEvidenceHashBinding;
  private_claim: JsonEvidenceHashBinding;
  private_run_report: JsonEvidenceHashBinding;
  private_result: JsonEvidenceHashBinding;
  private_generation_decisions: JsonEvidenceHashBinding;
  raw_stdout_sha256: string;
  raw_stderr_sha256: string;
}

export interface Gate4EvidenceBindings {
  package: {
    public_attempt_claim: JsonEvidenceHashBinding;
    public_terminal: JsonEvidenceHashBinding;
    private_receipt: JsonEvidenceHashBinding;
    private_bundle: JsonEvidenceHashBinding;
  };
  evaluators: {
    evaluator_a: Gate4RoleEvidenceBindings;
    evaluator_b: Gate4RoleEvidenceBindings;
  };
  adjudication: (Gate4RoleEvidenceBindings & { private_packet: JsonEvidenceHashBinding }) | null;
}

export interface Gate4DeterministicBaselineItem {
  item_id: CanonicalGate4ItemId;
  public_report_sha256: string;
  run_id: string;
  attempt_count: 1 | 2;
  first_attempt_schema_valid: boolean;
  final_schema_valid: boolean;
  semantic_reference_valid: boolean;
  truthful_state: boolean;
  latency_resource_measured: boolean;
  zero_external_cost_and_provider_calls: boolean;
}

export interface Gate4DeterministicBaseline {
  items: Gate4DeterministicBaselineItem[];
  summary: {
    first_attempt_schema_validity: ReturnType<typeof metricCount>;
    final_schema_validity: ReturnType<typeof metricCount>;
    semantic_reference_validity: ReturnType<typeof metricCount>;
    truthful_state: ReturnType<typeof metricCount>;
    latency_resource_measured: ReturnType<typeof metricCount>;
    zero_external_cost_and_provider_calls: ReturnType<typeof metricCount>;
  };
  all_required_criteria_pass: boolean;
}

export interface Gate4AggregateFinalizationContext {
  execution_class: "SEALED" | "DEV_TEST";
  publication_eligible: boolean;
  evidence_bindings: Gate4EvidenceBindings;
  deterministic_baseline: Gate4DeterministicBaseline;
}

export function aggregateBlindedEvaluations(
  bundle: BlindedPacketBundle,
  evaluatorAValue: unknown,
  evaluatorBValue: unknown,
  finalization: Gate4AggregateFinalizationContext,
  adjudicationValue?: unknown,
): Gate4Aggregate {
  const evaluatorA = verifyEvaluatorResult(evaluatorAValue, bundle, "evaluator_a");
  const evaluatorB = verifyEvaluatorResult(evaluatorBValue, bundle, "evaluator_b");
  const adjudicationPacket = buildAdjudicationPacket(bundle, evaluatorA, evaluatorB);
  let adjudicationResult: BlindedAdjudicationResult | null = null;
  if (adjudicationPacket.state === "required") {
    if (adjudicationValue === undefined) throw new BlindedEvaluationError("ADJUDICATION_REQUIRED", `${adjudicationPacket.disputes.length} threshold-changing disputes require blinded adjudication`);
    adjudicationResult = verifyAdjudicationResult(adjudicationValue, adjudicationPacket, bundle.packet_generated_at);
  } else if (adjudicationValue !== undefined) {
    throw new BlindedEvaluationError("ADJUDICATION_INVALID", "an adjudication result was supplied when no adjudication is required");
  }
  const aItems = canonicalEvaluatorItems(evaluatorA, bundle, "evaluator_a");
  const bItems = canonicalEvaluatorItems(evaluatorB, bundle, "evaluator_b");
  const disputeBySubject = new Map(adjudicationPacket.disputes.map((dispute) => [`${dispute.item_id}\u0000${dispute.kind}\u0000${dispute.subject_id}`, dispute]));
  const finalItems: FinalItemScores[] = CANONICAL_GATE4_ITEM_IDS.map((itemId, itemIndex) => {
    const a = aItems[itemIndex].result;
    const b = bItems[itemIndex].result;
    const choose = <T>(kind: EvaluationDispute["kind"], subjectId: string, aValue: T, bValue: T, conservative: () => T): T => {
      if (findingSignature(aValue) === findingSignature(bValue)) return aValue;
      const dispute = disputeBySubject.get(`${itemId}\u0000${kind}\u0000${subjectId}`);
      if (!dispute) return conservative();
      const role = chosenRoleForDispute(dispute.dispute_id, adjudicationPacket, adjudicationResult);
      if (!role) throw new BlindedEvaluationError("ADJUDICATION_REQUIRED", `dispute ${dispute.dispute_id} has no resolution`);
      return role === "evaluator_a" ? aValue : bValue;
    };
    return {
      itemId,
      claims: a.claim_scores.map((aScore, index) => {
        const bScore = b.claim_scores[index];
        const support = choose("claim_support", aScore.claim_id, aScore.support, bScore.support, () => chooseConservativeSupport(aScore.support, bScore.support));
        return support === aScore.support ? aScore : bScore;
      }),
      citations: a.citation_scores.map((aScore, index) => {
        const bScore = b.citation_scores[index];
        const assessment = choose("citation_accuracy", aScore.citation_id, aScore.assessment, bScore.assessment, () => aScore.assessment === "correct" && bScore.assessment === "correct" ? "correct" : aScore.assessment === "missing" || bScore.assessment === "missing" ? "missing" : "incorrect");
        return assessment === aScore.assessment ? aScore : bScore;
      }),
      points: a.key_point_scores.map((aScore, index) => {
        const bScore = b.key_point_scores[index];
        const kind = aScore.kind === "text_groundable" ? "text_key_point" : "visual_key_point";
        const selected = choose(kind, aScore.rubric_point_id, { covered: aScore.covered, cause: aScore.cause }, { covered: bScore.covered, cause: bScore.cause }, () => {
          if (!aScore.covered) return { covered: false, cause: aScore.cause };
          if (!bScore.covered) return { covered: false, cause: bScore.cause };
          return { covered: true, cause: "supported_by_transcript_and_output" as const };
        });
        return selected.covered === aScore.covered && selected.cause === aScore.cause ? aScore : bScore;
      }),
      hallucinations: choose("critical_hallucinations", "ITEM", a.critical_hallucinations, b.critical_hallucinations, () => [...a.critical_hallucinations, ...b.critical_hallucinations]),
      issues: choose("schema_reference_issues", "ITEM", a.schema_or_reference_issues, b.schema_or_reference_issues, () => [...a.schema_or_reference_issues, ...b.schema_or_reference_issues]),
    };
  });
  const perItem = finalItems.map((item) => ({
    item_id: item.itemId,
    material_claim_support: metricCount(item.claims.map((score) => score.support === "fully_supported")),
    citation_accuracy: metricCount(item.citations.map((score) => score.assessment === "correct")),
    text_key_point_coverage: metricCount(item.points.filter((score) => score.kind === "text_groundable").map((score) => score.covered)),
    visual_key_point_coverage: metricCount(item.points.filter((score) => score.kind === "visual_only").map((score) => score.covered)),
    critical_hallucinations: item.hallucinations.length,
    schema_or_reference_issue_count: item.issues.length,
  }));
  const pooled = {
    material_claim_support: metricCount(finalItems.flatMap((item) => item.claims.map((score) => score.support === "fully_supported"))),
    citation_accuracy: metricCount(finalItems.flatMap((item) => item.citations.map((score) => score.assessment === "correct"))),
    text_key_point_coverage: metricCount(finalItems.flatMap((item) => item.points.filter((score) => score.kind === "text_groundable").map((score) => score.covered))),
    visual_key_point_coverage: metricCount(finalItems.flatMap((item) => item.points.filter((score) => score.kind === "visual_only").map((score) => score.covered))),
  };
  const macro = {
    material_claim_support: { item_count: 5 as const, rate: average(perItem.map((item) => item.material_claim_support.rate)) },
    citation_accuracy: { item_count: 5 as const, rate: average(perItem.map((item) => item.citation_accuracy.rate)) },
    text_key_point_coverage: { item_count: 5 as const, rate: average(perItem.map((item) => item.text_key_point_coverage.rate)) },
    visual_key_point_coverage: { item_count: 5 as const, rate: average(perItem.map((item) => item.visual_key_point_coverage.rate)) },
  };
  const criticalCount = perItem.reduce((sum, item) => sum + item.critical_hallucinations, 0);
  const issueCount = perItem.reduce((sum, item) => sum + item.schema_or_reference_issue_count, 0);
  const gate4Pass = pooled.material_claim_support.rate >= 0.95 && macro.material_claim_support.rate >= 0.95
    && pooled.citation_accuracy.rate >= 0.9 && macro.citation_accuracy.rate >= 0.9
    && pooled.text_key_point_coverage.rate >= 0.8 && macro.text_key_point_coverage.rate >= 0.8
    && criticalCount === 0 && issueCount === 0;
  const uncoveredVisual = finalItems.flatMap((item) => item.points.filter((score) => score.kind === "visual_only" && !score.covered));
  const causeCounts = {
    output_omission: uncoveredVisual.filter((score) => score.cause === "output_omission").length,
    essential_visual_evidence_absent: uncoveredVisual.filter((score) => score.cause === "essential_visual_evidence_absent").length,
    contradicted: uncoveredVisual.filter((score) => score.cause === "contradicted").length,
  };
  const solelyMissingVisual = uncoveredVisual.length > 0 && causeCounts.essential_visual_evidence_absent === uncoveredVisual.length;
  const gate4OverallPass = gate4Pass && finalization.deterministic_baseline.all_required_criteria_pass;
  const triggerFired = gate4OverallPass && macro.visual_key_point_coverage.rate < 0.8 && solelyMissingVisual;
  const aggregate: Gate4Aggregate = {
    schema_version: "1.1",
    finalizer_version: "1.0.0",
    execution_class: finalization.execution_class,
    publication_eligible: finalization.publication_eligible,
    content_commit: bundle.content_commit,
    seal_commit: bundle.seal_commit,
    benchmark_lock_sha256: bundle.benchmark_lock_sha256,
    evidence_bindings: finalization.evidence_bindings,
    deterministic_baseline: finalization.deterministic_baseline,
    evaluator_result_sha256: { evaluator_a: canonicalJsonSha256(evaluatorA), evaluator_b: canonicalJsonSha256(evaluatorB) },
    adjudication: {
      state: adjudicationResult ? "completed" : "not_required",
      required_disputes: adjudicationPacket.disputes.length,
      resolved_disputes: adjudicationResult ? adjudicationResult.items.flatMap((item) => item.decisions).length : 0,
      result_sha256: adjudicationResult ? canonicalJsonSha256(adjudicationResult) : null,
    },
    denominator: { items: 5, item_ids: CANONICAL_GATE4_ITEM_IDS },
    per_item: perItem,
    pooled,
    macro,
    thresholds: { material_claim_support: 0.95, citation_accuracy: 0.9, text_key_point_coverage: 0.8, visual_key_point_trigger: 0.8, critical_hallucinations: 0 },
    gate_4_qualitative_pass: gate4Pass,
    gate_4_overall_pass: gate4OverallPass,
    gate_5_trigger: {
      state: triggerFired ? "triggered_but_blocked" : "not_triggered",
      execution_state: "not_run",
      macro_visual_coverage: macro.visual_key_point_coverage.rate,
      threshold: 0.8,
      uncovered_visual_points: uncoveredVisual.length,
      uncovered_cause_counts: causeCounts,
      due_solely_to_missing_visual_evidence: solelyMissingVisual,
      trigger_fired: triggerFired,
      visual_method_sealed: false,
      rights_authorized_visual_media_set_present: false,
      blocked_reasons: triggerFired ? ["no_sealed_visual_method", "no_rights_authorized_visual_media_set"] : [],
    },
    claims_boundary: CLAIMS_BOUNDARY,
  };
  verifyGate4Aggregate(aggregate);
  return aggregate;
}

export function verifyGate4Aggregate(value: unknown): asserts value is Gate4Aggregate {
  if (!value || typeof value !== "object") throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate must be an object");
  const aggregate = value as Partial<Gate4Aggregate>;
  const exactTopLevelKeys = [
    "schema_version", "finalizer_version", "execution_class", "publication_eligible", "content_commit", "seal_commit", "benchmark_lock_sha256",
    "evidence_bindings", "deterministic_baseline", "evaluator_result_sha256", "adjudication", "denominator", "per_item", "pooled", "macro", "thresholds", "gate_4_qualitative_pass", "gate_4_overall_pass",
    "gate_5_trigger", "claims_boundary",
  ];
  if (
    aggregate.schema_version !== "1.1"
    || aggregate.finalizer_version !== "1.0.0"
    || !(["SEALED", "DEV_TEST"] as const).includes(aggregate.execution_class as "SEALED" | "DEV_TEST")
    || aggregate.publication_eligible !== (aggregate.execution_class === "SEALED")
    || Object.keys(value).length !== exactTopLevelKeys.length
    || exactTopLevelKeys.some((key) => !Object.hasOwn(value, key))
    || !/^[0-9a-f]{40}$/.test(String(aggregate.content_commit))
    || !/^[0-9a-f]{40}$/.test(String(aggregate.seal_commit))
    || !SHA256_RE.test(String(aggregate.benchmark_lock_sha256))
    || !aggregate.evaluator_result_sha256
    || Object.keys(aggregate.evaluator_result_sha256).length !== 2
    || !SHA256_RE.test(aggregate.evaluator_result_sha256.evaluator_a)
    || !SHA256_RE.test(aggregate.evaluator_result_sha256.evaluator_b)
    || !aggregate.adjudication
    || !verifyGate4EvidenceBindings(aggregate.evidence_bindings)
    || !verifyGate4DeterministicBaseline(aggregate.deterministic_baseline)
    || !aggregate.denominator
    || aggregate.denominator.items !== 5
    || canonicalJson(aggregate.denominator.item_ids) !== canonicalJson(CANONICAL_GATE4_ITEM_IDS)
    || !Array.isArray(aggregate.per_item)
    || aggregate.per_item.length !== 5
    || aggregate.per_item.some((item, index) => item.item_id !== CANONICAL_GATE4_ITEM_IDS[index])
    || !aggregate.pooled
    || !aggregate.macro
    || canonicalJson(aggregate.thresholds) !== canonicalJson({ material_claim_support: 0.95, citation_accuracy: 0.9, text_key_point_coverage: 0.8, visual_key_point_trigger: 0.8, critical_hallucinations: 0 })
    || !aggregate.gate_5_trigger
    || aggregate.claims_boundary !== CLAIMS_BOUNDARY
  ) throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate exact-five identity or shape is invalid");
  const adjudication = aggregate.adjudication;
  if (
    !Number.isInteger(adjudication.required_disputes)
    || !Number.isInteger(adjudication.resolved_disputes)
    || adjudication.required_disputes < 0
    || adjudication.resolved_disputes < 0
    || adjudication.resolved_disputes > adjudication.required_disputes
    || (adjudication.state === "not_required" && (adjudication.required_disputes !== 0 || adjudication.resolved_disputes !== 0 || adjudication.result_sha256 !== null))
    || (adjudication.state === "completed" && (adjudication.required_disputes < 1 || adjudication.resolved_disputes !== adjudication.required_disputes || typeof adjudication.result_sha256 !== "string" || !SHA256_RE.test(adjudication.result_sha256)))
    || !["not_required", "completed"].includes(adjudication.state)
  ) throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate adjudication arithmetic or identity is invalid");
  if (
    aggregate.evidence_bindings.evaluators.evaluator_a.private_result.canonical_json_sha256 !== aggregate.evaluator_result_sha256.evaluator_a
    || aggregate.evidence_bindings.evaluators.evaluator_b.private_result.canonical_json_sha256 !== aggregate.evaluator_result_sha256.evaluator_b
    || (adjudication.state === "not_required" && aggregate.evidence_bindings.adjudication !== null)
    || (adjudication.state === "completed" && (
      aggregate.evidence_bindings.adjudication === null
      || aggregate.evidence_bindings.adjudication.private_result.canonical_json_sha256 !== adjudication.result_sha256
    ))
  ) throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate evidence hashes do not bind the evaluator/adjudicator results");
  if (aggregate.per_item.some((item) =>
    !Number.isInteger(item.critical_hallucinations)
    || item.critical_hallucinations < 0
    || !Number.isInteger(item.schema_or_reference_issue_count)
    || item.schema_or_reference_issue_count < 0)) {
    throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate finding counts must be nonnegative integers");
  }
  const countMetrics = [
    ...aggregate.per_item.flatMap((item) => [item.material_claim_support, item.citation_accuracy, item.text_key_point_coverage, item.visual_key_point_coverage]),
    aggregate.pooled.material_claim_support,
    aggregate.pooled.citation_accuracy,
    aggregate.pooled.text_key_point_coverage,
    aggregate.pooled.visual_key_point_coverage,
  ];
  if (countMetrics.some((metric) => !Number.isInteger(metric.numerator) || !Number.isInteger(metric.denominator) || metric.denominator < 1 || metric.numerator < 0 || metric.numerator > metric.denominator || metric.rate !== metric.numerator / metric.denominator)) {
    throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate contains impossible counts or non-derived rates");
  }
  const expectedPooled = {
    material_claim_support: metricCount(aggregate.per_item.flatMap((item) => Array.from({ length: item.material_claim_support.denominator }, (_, index) => index < item.material_claim_support.numerator))),
    citation_accuracy: metricCount(aggregate.per_item.flatMap((item) => Array.from({ length: item.citation_accuracy.denominator }, (_, index) => index < item.citation_accuracy.numerator))),
    text_key_point_coverage: metricCount(aggregate.per_item.flatMap((item) => Array.from({ length: item.text_key_point_coverage.denominator }, (_, index) => index < item.text_key_point_coverage.numerator))),
    visual_key_point_coverage: metricCount(aggregate.per_item.flatMap((item) => Array.from({ length: item.visual_key_point_coverage.denominator }, (_, index) => index < item.visual_key_point_coverage.numerator))),
  };
  const expectedMacro = {
    material_claim_support: average(aggregate.per_item.map((item) => item.material_claim_support.rate)),
    citation_accuracy: average(aggregate.per_item.map((item) => item.citation_accuracy.rate)),
    text_key_point_coverage: average(aggregate.per_item.map((item) => item.text_key_point_coverage.rate)),
    visual_key_point_coverage: average(aggregate.per_item.map((item) => item.visual_key_point_coverage.rate)),
  };
  if (Object.values(aggregate.macro).some((metric) => !Number.isFinite(metric.rate) || metric.rate < 0 || metric.rate > 1)) {
    throw new BlindedEvaluationError("AGGREGATE_INVALID", "aggregate macro rates must be finite proportions");
  }
  if (canonicalJson(aggregate.pooled) !== canonicalJson(expectedPooled) || Object.entries(expectedMacro).some(([key, rate]) => aggregate.macro![key as keyof typeof aggregate.macro].item_count !== 5 || aggregate.macro![key as keyof typeof aggregate.macro].rate !== rate)) {
    throw new BlindedEvaluationError("AGGREGATE_INVALID", "pooled or macro arithmetic is not derived from the exact five per-item records");
  }
  const criticalCount = aggregate.per_item.reduce((sum, item) => sum + item.critical_hallucinations, 0);
  const issueCount = aggregate.per_item.reduce((sum, item) => sum + item.schema_or_reference_issue_count, 0);
  const expectedGate4 = expectedPooled.material_claim_support.rate >= 0.95 && expectedMacro.material_claim_support >= 0.95
    && expectedPooled.citation_accuracy.rate >= 0.9 && expectedMacro.citation_accuracy >= 0.9
    && expectedPooled.text_key_point_coverage.rate >= 0.8 && expectedMacro.text_key_point_coverage >= 0.8
    && criticalCount === 0 && issueCount === 0;
  const expectedOverallGate4 = expectedGate4 && aggregate.deterministic_baseline.all_required_criteria_pass;
  const trigger = aggregate.gate_5_trigger;
  const triggerCauseValues = Object.values(trigger.uncovered_cause_counts);
  if (triggerCauseValues.some((count) => !Number.isInteger(count) || count < 0) || !Number.isInteger(trigger.uncovered_visual_points) || trigger.uncovered_visual_points < 0) {
    throw new BlindedEvaluationError("AGGREGATE_INVALID", "Gate 5 uncovered counts must be nonnegative integers");
  }
  const causeTotal = trigger.uncovered_cause_counts.output_omission + trigger.uncovered_cause_counts.essential_visual_evidence_absent + trigger.uncovered_cause_counts.contradicted;
  const expectedUncoveredVisual = aggregate.per_item.reduce((sum, item) => sum + item.visual_key_point_coverage.denominator - item.visual_key_point_coverage.numerator, 0);
  const solelyMissing = trigger.uncovered_visual_points > 0 && trigger.uncovered_cause_counts.essential_visual_evidence_absent === trigger.uncovered_visual_points;
  const expectedTrigger = expectedOverallGate4 && expectedMacro.visual_key_point_coverage < 0.8 && solelyMissing;
  if (
    aggregate.gate_4_qualitative_pass !== expectedGate4
    || aggregate.gate_4_overall_pass !== expectedOverallGate4
    || trigger.macro_visual_coverage !== expectedMacro.visual_key_point_coverage
    || trigger.threshold !== 0.8
    || trigger.uncovered_visual_points !== expectedUncoveredVisual
    || trigger.uncovered_visual_points !== causeTotal
    || trigger.due_solely_to_missing_visual_evidence !== solelyMissing
    || trigger.trigger_fired !== expectedTrigger
    || trigger.state !== (expectedTrigger ? "triggered_but_blocked" : "not_triggered")
    || trigger.execution_state !== "not_run"
    || trigger.visual_method_sealed !== false
    || trigger.rights_authorized_visual_media_set_present !== false
    || canonicalJson(trigger.blocked_reasons) !== canonicalJson(expectedTrigger ? ["no_sealed_visual_method", "no_rights_authorized_visual_media_set"] : [])
  ) throw new BlindedEvaluationError("AGGREGATE_INVALID", "Gate 4 decision or Gate 5 trigger is malformed or self-asserted");
}

function jsonEvidenceBindingValid(value: unknown): value is JsonEvidenceHashBinding {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, "file_sha256")
    && Object.hasOwn(value, "canonical_json_sha256")
    && SHA256_RE.test(String((value as JsonEvidenceHashBinding).file_sha256))
    && SHA256_RE.test(String((value as JsonEvidenceHashBinding).canonical_json_sha256));
}

function roleEvidenceBindingsValid(value: unknown, adjudicator: boolean): value is Gate4RoleEvidenceBindings & { private_packet?: JsonEvidenceHashBinding } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const jsonFields = ["public_attempt_claim", "public_terminal", "private_claim", "private_run_report", "private_result", "private_generation_decisions"];
  const expected = [...jsonFields, "raw_stdout_sha256", "raw_stderr_sha256", ...(adjudicator ? ["private_packet"] : [])];
  return Object.keys(record).length === expected.length
    && expected.every((key) => Object.hasOwn(record, key))
    && jsonFields.every((key) => jsonEvidenceBindingValid(record[key]))
    && (!adjudicator || jsonEvidenceBindingValid(record.private_packet))
    && SHA256_RE.test(String(record.raw_stdout_sha256))
    && SHA256_RE.test(String(record.raw_stderr_sha256));
}

function verifyGate4EvidenceBindings(value: unknown): value is Gate4EvidenceBindings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || !Object.hasOwn(record, "package") || !Object.hasOwn(record, "evaluators") || !Object.hasOwn(record, "adjudication")) return false;
  const packageValue = record.package;
  const evaluators = record.evaluators;
  if (!packageValue || typeof packageValue !== "object" || Array.isArray(packageValue) || !evaluators || typeof evaluators !== "object" || Array.isArray(evaluators)) return false;
  const packageRecord = packageValue as Record<string, unknown>;
  const evaluatorRecord = evaluators as Record<string, unknown>;
  const packageFields = ["public_attempt_claim", "public_terminal", "private_receipt", "private_bundle"];
  return Object.keys(packageRecord).length === packageFields.length
    && packageFields.every((key) => Object.hasOwn(packageRecord, key) && jsonEvidenceBindingValid(packageRecord[key]))
    && Object.keys(evaluatorRecord).length === 2
    && roleEvidenceBindingsValid(evaluatorRecord.evaluator_a, false)
    && roleEvidenceBindingsValid(evaluatorRecord.evaluator_b, false)
    && (record.adjudication === null || roleEvidenceBindingsValid(record.adjudication, true));
}

function verifyGate4DeterministicBaseline(value: unknown): value is Gate4DeterministicBaseline {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const baseline = value as Gate4DeterministicBaseline;
  if (Object.keys(value).length !== 3 || !Array.isArray(baseline.items) || baseline.items.length !== 5 || !baseline.summary) return false;
  const itemKeys = ["item_id", "public_report_sha256", "run_id", "attempt_count", "first_attempt_schema_valid", "final_schema_valid", "semantic_reference_valid", "truthful_state", "latency_resource_measured", "zero_external_cost_and_provider_calls"];
  if (baseline.items.some((item, index) =>
    !item || typeof item !== "object" || Object.keys(item).length !== itemKeys.length || itemKeys.some((key) => !Object.hasOwn(item, key))
    || item.item_id !== CANONICAL_GATE4_ITEM_IDS[index]
    || !SHA256_RE.test(item.public_report_sha256)
    || !new RegExp(`^${item.item_id}-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$`).test(item.run_id)
    || !([1, 2] as const).includes(item.attempt_count)
    || [item.first_attempt_schema_valid, item.final_schema_valid, item.semantic_reference_valid, item.truthful_state, item.latency_resource_measured, item.zero_external_cost_and_provider_calls].some((entry) => typeof entry !== "boolean")
  )) return false;
  const summaryKeys = ["first_attempt_schema_validity", "final_schema_validity", "semantic_reference_validity", "truthful_state", "latency_resource_measured", "zero_external_cost_and_provider_calls"] as const;
  if (Object.keys(baseline.summary).length !== summaryKeys.length || summaryKeys.some((key) => !Object.hasOwn(baseline.summary, key))) return false;
  const expected = {
    first_attempt_schema_validity: metricCount(baseline.items.map((item) => item.first_attempt_schema_valid)),
    final_schema_validity: metricCount(baseline.items.map((item) => item.final_schema_valid)),
    semantic_reference_validity: metricCount(baseline.items.map((item) => item.semantic_reference_valid)),
    truthful_state: metricCount(baseline.items.map((item) => item.truthful_state)),
    latency_resource_measured: metricCount(baseline.items.map((item) => item.latency_resource_measured)),
    zero_external_cost_and_provider_calls: metricCount(baseline.items.map((item) => item.zero_external_cost_and_provider_calls)),
  };
  const pass = expected.first_attempt_schema_validity.rate >= 0.9
    && expected.final_schema_validity.rate === 1
    && expected.semantic_reference_validity.rate === 1
    && expected.truthful_state.rate === 1
    && expected.latency_resource_measured.rate === 1
    && expected.zero_external_cost_and_provider_calls.rate === 1;
  return canonicalJson(baseline.summary) === canonicalJson(expected) && baseline.all_required_criteria_pass === pass;
}
