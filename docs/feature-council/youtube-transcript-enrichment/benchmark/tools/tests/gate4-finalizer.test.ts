import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  chmod,
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import Ajv2020 from "ajv/dist/2020";

import {
  CANONICAL_GATE4_ITEM_IDS,
  CLAIMS_BOUNDARY,
  buildAdjudicationPacket,
  canonicalJsonSha256,
  generateBlindedPackets,
  type BlindedAdjudicationResult,
  type BlindedEvaluatorResult,
  type BlindedPacketBundle,
  type EvaluatorRole,
  type GenerateBlindedPacketsInput,
} from "../blinded-evaluation";
import {
  GATE4_AGGREGATE_RELATIVE_PATH,
  Gate4FinalizerError,
  finalizeBlindedEvaluationForTests,
} from "../gate4-finalizer";
import {
  EVALUATION_CLAIMS_BOUNDARY,
  EVALUATION_ROLE_TIMEOUT_MS,
  authoritativeEvaluationClaimPath,
  authoritativeEvaluationTerminalPath,
  writePackageAttemptClaim,
  writePackageAttemptTerminal,
  writeRoleAttemptClaim,
  writeRoleAttemptTerminal,
  type PackageAttemptClaim,
  type RoleAttemptClaim,
  type RoleAttemptTerminal,
} from "../gate4-evaluation-claims";

const MODEL_DIRECTORY = fileURLToPath(new URL("../../model/", import.meta.url));
const CLI_PATH = fileURLToPath(new URL("../blinded-evaluation-cli.ts", import.meta.url));
const SOURCE_PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../../../../../../", import.meta.url)));
const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";
const CONTENT_COMMIT = "a".repeat(40);
const SEAL_COMMIT = "b".repeat(40);
const LOCK_SHA256 = "c".repeat(64);

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readModel(name: string): string {
  return readFileSync(path.join(MODEL_DIRECTORY, name), "utf8");
}

async function writeJson(filePath: string, value: unknown): Promise<string> {
  const bytes = jsonBytes(value);
  await writeFile(filePath, bytes, { mode: 0o600, flag: "wx" });
  return hash(bytes);
}

async function createProject(base: string): Promise<string> {
  const projectRoot = path.join(base, "project");
  const modelRoot = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "benchmark/model");
  const publicRoot = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "decisions/gate4-public-runs");
  await Promise.all([
    mkdir(modelRoot, { recursive: true, mode: 0o755 }),
    mkdir(publicRoot, { recursive: true, mode: 0o755 }),
  ]);
  await Promise.all([
    "BLINDED_PACKET_PACKAGE_RECEIPT.schema.json",
    "PUBLIC_RUN_REPORT.schema.json",
    "LOCAL_EVALUATOR_RUN_REPORT.schema.json",
    "GATE_4_AGGREGATE.schema.json",
  ].map((name) => copyFile(path.join(MODEL_DIRECTORY, name), path.join(modelRoot, name))));
  return projectRoot;
}

function sourceItems(): GenerateBlindedPacketsInput["items"] {
  return CANONICAL_GATE4_ITEM_IDS.map((itemId, itemIndex) => {
    const segments = Array.from({ length: 20 }, (_, index) => ({
      index,
      start_ms: index * 1_000,
      end_ms: (index + 1) * 1_000,
      source_start_ms: index * 1_000,
      source_end_ms: (index + 1) * 1_000,
      text: `Private synthetic transcript phrase ${itemIndex + 1} segment ${index + 1} for finalizer evidence testing only`,
      source_cue_ids: [`DEV-${index}`],
    }));
    const normalized = {
      schema_version: "1.0", item_id: itemId, youtube_video_id: `DEV0000000${itemIndex}`.slice(-11), source_method: "A1",
      language: "en-US", caption_type: "source_provided_unknown_authorship", timestamp_mode: "timestamped",
      completeness: { state: "complete", basis: "source_coverage_record", source_duration_ms: 20_000, last_cue_end_ms: 20_000, trailing_gap_ms: 0 },
      provenance: {
        source_page_url: `https://example.invalid/${itemId}`, source_asset_url: `https://example.invalid/${itemId}.vtt`,
        input_sha256: hash(`source-${itemId}`), reference_role: "input_preservation", version_equivalence: "official_row_level_publication_association", acquired_at: "2026-07-18T08:00:00Z",
      },
      processing_version: "DEV-1.0", segments, errors: [],
    };
    const normalizedBytes = `${JSON.stringify(normalized, null, 2)}\n`;
    const inputSha256 = hash(normalizedBytes);
    const segmentId = `${itemId}:S000000`;
    const output = {
      schema_version: "1.0", item_id: itemId, input_sha256: inputSha256, language_tag: "en-US", transcript_status: "complete",
      summary: `Private synthetic generated summary ${itemIndex + 1}.`,
      material_claims: [{ claim_id: "C001", claim: `Synthetic grounded claim ${itemIndex + 1}.`, evidence_segment_ids: [segmentId], evidence_start_ms: 0, evidence_end_ms: 1_000 }],
      chapters: [{ chapter_id: "H001", title: "Synthetic", summary: "Synthetic chapter.", start_segment_id: segmentId, end_segment_id: segmentId, start_ms: 0, end_ms: 1_000 }],
      key_points: [{ key_point_id: "K001", point: `Synthetic grounded point ${itemIndex + 1}.`, evidence_segment_ids: [segmentId], evidence_start_ms: 0, evidence_end_ms: 1_000 }],
      concepts: [{ concept_id: "N001", label: "Synthetic", explanation: "Synthetic concept.", evidence_segment_ids: [segmentId] }],
      action_items: [], search_terms: ["synthetic"], user_tags: [], ai_categories: ["test"], limitations: ["Development fixture only."],
    };
    return {
      item_id: itemId,
      normalized_transcript_bytes: normalizedBytes,
      enrichment_output_bytes: `${JSON.stringify(output, null, 2)}\n`,
      gate_3_result_sha256: "d".repeat(64),
      gate_4_attempt_claim_sha256: "e".repeat(64),
      gate_4_public_report_sha256: "f".repeat(64),
      gate_4_run_id: `${itemId}-20260718T130000Z-${hash(itemId).slice(0, 12)}`,
    };
  });
}

function publicReport(item: GenerateBlindedPacketsInput["items"][number], retry: boolean): Record<string, unknown> {
  const attempt = (number: 1 | 2, valid: boolean, startSecond: number) => ({
    attempt: number,
    kind: number === 1 ? "initial" : "sealed_format_only_retry",
    started_at: `2026-07-18T13:00:${String(startSecond).padStart(2, "0")}Z`,
    completed_at: `2026-07-18T13:00:${String(startSecond + 1).padStart(2, "0")}Z`,
    duration_ms: 1_000,
    prompt_sha256: hash(`prompt-${item.item_id}-${number}`),
    exit_code: 0, signal: null, timed_out: false,
    maximum_resident_set_size_bytes: 1_000_000, peak_memory_footprint_bytes: 2_000_000,
    stdout_bytes: 100, stdout_retained_bytes: 100, stdout_sha256: hash(`stdout-${item.item_id}-${number}`),
    stderr_bytes: 10, stderr_retained_bytes: 10, stderr_sha256: hash(`stderr-${item.item_id}-${number}`),
    parse_valid: valid, shape_valid: valid, semantic_reference_valid: valid,
    error_codes: valid ? [] : ["INVALID_JSON"],
  });
  const attempts = retry ? [attempt(1, false, 1), attempt(2, true, 3)] : [attempt(1, true, 1)];
  return {
    schema_version: "1.1", harness_version: "1.2.0", execution_class: "DEV_TEST", publication_eligible: false,
    run_id: item.gate_4_run_id, run_state: "succeeded", item_id: item.item_id, candidate_id: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637",
    started_at: "2026-07-18T13:00:00Z", completed_at: "2026-07-18T13:00:10Z",
    input: {
      normalized_transcript_sha256: hash(item.normalized_transcript_bytes), source_raw_sha256: hash(`raw-${item.item_id}`), segment_count: 20,
      text_character_count: 1_000, duration_ms: 20_000, language_tag: "en-US", transcript_status: "complete", chunk_count: 1,
    },
    gate_3_handoff: {
      result_document_sha256: item.gate_3_result_sha256, content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, git_bound: false,
      model_input_normalized_output_file_sha256: hash(item.normalized_transcript_bytes), canonical_normalized_output_sha256: hash(item.normalized_transcript_bytes),
      token_preservation_rate: 1, timestamp_anchor_match_rate: 1,
    },
    runtime: {
      ledger_sha256: hash(readModel("LOCAL_MODEL_RUNTIME_LEDGER.json")), llama_cli_sha256: hash("dev-llama"), model_sha256: hash("dev-model"),
      system_prompt_sha256: hash(readModel("SYSTEM_PROMPT.txt")), format_repair_prompt_sha256: hash(readModel("FORMAT_REPAIR_PROMPT.txt")),
      output_schema_sha256: hash(readModel("ENRICHMENT_OUTPUT.schema.json")), key_point_rubric_sha256: hash(readModel("KEY_POINT_RUBRIC.json")),
      sandbox_profile_sha256: hash(readFileSync(path.join(SOURCE_PROJECT_ROOT, PROJECT_RELATIVE_ROOT, "spikes/model-harness/deny-network.sb"))),
      sampling: { temperature: 0, seed: 424242, top_k: 1, top_p: 1, min_p: 0, repeat_penalty: 1, context_size: 16384, max_output_tokens: 4096, reasoning: "disabled" },
      network_boundary: "sandbox_exec_deny_network_and_user_home_except_bound_inputs_plus_llama_offline", post_execution_input_reverification: true,
    },
    attempts,
    validation: {
      output_sha256: hash(item.enrichment_output_bytes), schema_valid: true, semantic_reference_valid: true, material_claim_count: 1, citation_count: 1,
      invalid_reference_count: 0, unsafe_markup_count: 0, prompt_identity_stable: true, resource_measurement_complete: true,
    },
    cost: { incremental_external_service_usd: 0, paid_requests: 0, provider_requests: 0, measurement_scope: "local_wall_clock_only_energy_not_metered" },
    privacy: {
      execution_location: "local_process", network_denied: true, external_transcript_transfer: false, server_started: false, remote_model_resolution: false,
      raw_text_in_public_report: false, public_logs_content_free: true,
      filesystem_boundary: "user_home_denied_except_runtime_model_schema_system_prompt_prompt_and_private_run_directory",
    },
    retention: {
      private_output_delete_by: "2026-10-14", private_prompt_deleted_after_run: true, raw_output_private_only: true, normalized_transcript_copied: false,
      public_report_retention: "repository_permanent_hashes_and_metrics_only",
    },
    failure: null,
    claims_boundary: ["local_candidate_only", "ai_evaluated_pending_human_review", "not_production_readiness", "no_energy_cost_measurement", "no_external_provider_comparison"],
  };
}

function basePacketInput(items: GenerateBlindedPacketsInput["items"]): GenerateBlindedPacketsInput {
  return {
    content_commit: CONTENT_COMMIT,
    seal_commit: SEAL_COMMIT,
    benchmark_lock_sha256: LOCK_SHA256,
    package_attempt_claim_sha256: "0".repeat(64),
    packet_generated_at: "2026-07-18T14:00:00Z",
    execution_contract: JSON.parse(readModel("EVALUATOR_EXECUTION_CONTRACT.json")),
    runtime_ledger_json: readModel("LOCAL_MODEL_RUNTIME_LEDGER.json"),
    sandbox_profile_text: readFileSync(path.join(SOURCE_PROJECT_ROOT, PROJECT_RELATIVE_ROOT, "spikes/model-harness/deny-network.sb"), "utf8"),
    role_system_prompts: {
      evaluator_a: readModel("EVALUATOR_A_SYSTEM_PROMPT.txt"), evaluator_b: readModel("EVALUATOR_B_SYSTEM_PROMPT.txt"), adjudicator: readModel("ADJUDICATOR_SYSTEM_PROMPT.txt"),
    },
    role_generation_schemas: {
      evaluator_a: readModel("BLINDED_EVALUATION_GENERATION.schema.json"), evaluator_b: readModel("BLINDED_EVALUATION_GENERATION.schema.json"), adjudicator: readModel("BLINDED_ADJUDICATION_GENERATION.schema.json"),
    },
    authorization: JSON.parse(readModel("LOCAL_DERIVATION_AUTHORIZATION.json")),
    rubric: JSON.parse(readModel("KEY_POINT_RUBRIC.json")),
    consent: { state: "affirmative", attestation_id: "CONSENT-DEV-FINALIZER-001", recorded_at: "2026-07-18T12:00:00Z", withdrawn: false, bounded_excerpt_transfer_authorized: true },
    execution_readiness: {
      pinned_runtime_verified: true, pinned_model_verified: true, role_prompt_hashes_verified: true, deny_network_sandbox_available: true,
      fresh_process_isolation_available: true, packet_only_file_binding_available: true, local_private_storage_available: true,
      external_content_transfer: false, result_attestation_verification_available: true, incremental_spend_usd: 0,
    },
    items,
  };
}

function packageClaim(input: GenerateBlindedPacketsInput): PackageAttemptClaim {
  const contract = input.execution_contract as { role_invocations: Array<Record<string, string>> };
  const strict = Object.fromEntries(contract.role_invocations.map((entry) => [entry.role, entry.strict_postparse_schema_sha256])) as PackageAttemptClaim["strict_postparse_schema_sha256"];
  return {
    schema_version: "1.0", claim_type: "canonical_blinded_packet_package_attempt", operator_version: "1.0.0", execution_class: "DEV_TEST", publication_eligible: false,
    content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, benchmark_lock_sha256: LOCK_SHA256, claimed_at: input.packet_generated_at,
    timeout_ms_per_role: EVALUATION_ROLE_TIMEOUT_MS, retry_policy: "one_package_attempt_and_one_process_per_role_no_retry", gate_3_result_sha256: input.items[0].gate_3_result_sha256,
    execution_contract_sha256: canonicalJsonSha256(input.execution_contract), runtime_ledger_sha256: hash(input.runtime_ledger_json), llama_cli_sha256: hash("dev-llama"), model_sha256: hash("dev-model"),
    sandbox_profile_sha256: hash(input.sandbox_profile_text),
    role_system_prompt_sha256: { evaluator_a: hash(input.role_system_prompts.evaluator_a), evaluator_b: hash(input.role_system_prompts.evaluator_b), adjudicator: hash(input.role_system_prompts.adjudicator) },
    role_generation_schema_sha256: { evaluator_a: hash(input.role_generation_schemas.evaluator_a), evaluator_b: hash(input.role_generation_schemas.evaluator_b), adjudicator: hash(input.role_generation_schemas.adjudicator) },
    strict_postparse_schema_sha256: strict,
    consent_attestation_sha256: canonicalJsonSha256(input.consent), execution_readiness_sha256: canonicalJsonSha256(input.execution_readiness),
    sources: input.items.map((item) => ({
      item_id: item.item_id, gate_3_result_sha256: item.gate_3_result_sha256, gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
      gate_4_public_report_sha256: item.gate_4_public_report_sha256, normalized_input_sha256: hash(item.normalized_transcript_bytes),
      enrichment_output_sha256: hash(item.enrichment_output_bytes), gate_4_run_id: item.gate_4_run_id,
    })),
    package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package", external_provider_calls: 0, external_content_transfer: false,
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
}

function evaluatorAttestation(): BlindedEvaluatorResult["execution_attestation"] {
  return {
    fresh_process: true, packet_only_file_context: true, candidate_identity_hidden: true, candidate_runtime_hidden: true, price_latency_hidden: true,
    other_evaluator_unseen: true, pinned_runtime_verified: true, pinned_model_verified: true, role_prompt_hash_verified: true, deny_network_sandbox_verified: true,
    tools_available: false, network_available: false, external_content_transfer: false, evaluator_initiated_provider_calls: 0, external_api_calls: 0, incremental_spend_usd: 0,
    local_model_identity: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637", same_model_evaluator_bias_acknowledged: true, training_performed: false,
    private_retention_delete_by: "2026-10-14", contract_accepted: true, consent_attestation_present: true,
  };
}

function evaluatorResult(bundle: BlindedPacketBundle, role: EvaluatorRole, dispute: boolean): BlindedEvaluatorResult {
  const result: BlindedEvaluatorResult = {
    schema_version: "1.1", packet_id: bundle.packets[role].packet.packet_id, packet_sha256: bundle.packets[role].packet_sha256,
    execution_contract_sha256: bundle.execution_contract_sha256, role, execution_attestation: evaluatorAttestation(),
    started_at: role === "evaluator_a" ? "2026-07-18T15:00:00Z" : "2026-07-18T15:10:00Z",
    completed_at: role === "evaluator_a" ? "2026-07-18T15:01:00Z" : "2026-07-18T15:11:00Z",
    items: bundle.packets[role].packet.items.map((item) => ({
      blinded_item_id: item.blinded_item_id, packet_item_sha256: item.packet_item_sha256,
      claim_scores: item.claims.map((claim) => ({ claim_id: claim.claim_id, support: "fully_supported" as const, evidence_excerpt_ids: claim.evidence_excerpt_ids, rationale: "The approved excerpt supports this claim." })),
      citation_scores: item.claims.map((claim) => ({ citation_id: claim.citation_id, assessment: "correct" as const, evidence_excerpt_ids: claim.evidence_excerpt_ids, rationale: "The approved excerpt supports this citation." })),
      key_point_scores: item.rubric_points.map((point) => ({
        rubric_point_id: point.rubric_point_id, kind: point.kind, covered: point.kind === "text_groundable",
        cause: point.kind === "text_groundable" ? "supported_by_transcript_and_output" as const : "essential_visual_evidence_absent" as const,
        evidence_excerpt_ids: point.kind === "text_groundable" ? [item.excerpts[0].excerpt_id] : [],
        rationale: point.kind === "text_groundable" ? "The output covers the text point." : "Essential visual evidence is absent.",
      })),
      critical_hallucinations: [], schema_or_reference_issues: [], confidence: "high" as const,
    })),
    claims_boundary: CLAIMS_BOUNDARY,
  };
  if (dispute && role === "evaluator_b") {
    result.items[0].claim_scores[0].support = "contradicted";
    result.items[0].claim_scores[0].rationale = "Evaluator B records the synthetic dispute.";
  }
  return result;
}

function adjudicatorResult(bundle: BlindedPacketBundle, evaluatorA: BlindedEvaluatorResult, evaluatorB: BlindedEvaluatorResult): { packet: NonNullable<ReturnType<typeof buildAdjudicationPacket>["packet"]>; result: BlindedAdjudicationResult } {
  const adjudication = buildAdjudicationPacket(bundle, evaluatorA, evaluatorB);
  assert.equal(adjudication.state, "required");
  const packet = adjudication.packet!;
  return {
    packet,
    result: {
      schema_version: "1.0", packet_id: packet.packet_id, packet_sha256: adjudication.packet_sha256!, execution_contract_sha256: bundle.execution_contract_sha256, role: "adjudicator",
      execution_attestation: {
        fresh_process: true, packet_only_file_context: true, candidate_identity_hidden: true, candidate_runtime_hidden: true, price_latency_hidden: true,
        both_evaluator_results_seen_only_for_disputes: true, pinned_runtime_verified: true, pinned_model_verified: true, role_prompt_hash_verified: true,
        deny_network_sandbox_verified: true, tools_available: false, network_available: false, external_content_transfer: false, evaluator_initiated_provider_calls: 0,
        external_api_calls: 0, incremental_spend_usd: 0, local_model_identity: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637", same_model_evaluator_bias_acknowledged: true,
        training_performed: false, private_retention_delete_by: "2026-10-14", contract_accepted: true, consent_attestation_present: true, additional_transcript_content_received: false,
      },
      started_at: "2026-07-18T16:00:00Z", completed_at: "2026-07-18T16:01:00Z",
      items: packet.items.map((item) => ({
        blinded_item_id: item.blinded_item_id,
        decisions: item.disputes.map((entry) => ({ dispute_id: entry.dispute_id, selected_option: "evaluator_a" as const, rationale: "The approved evaluator A option is selected." })),
      })),
      claims_boundary: CLAIMS_BOUNDARY,
    },
  };
}

async function writeRoleEvidence(
  projectRoot: string,
  packageRoot: string,
  bundle: BlindedPacketBundle,
  packageClaimValue: PackageAttemptClaim,
  packageClaimSha256: string,
  receiptSha256: string,
  role: "evaluator_a" | "evaluator_b" | "adjudicator",
  result: BlindedEvaluatorResult | BlindedAdjudicationResult,
  packetId: string,
  packetSha256: string,
): Promise<void> {
  const claimedAt = role === "evaluator_a" ? "2026-07-18T14:10:00Z" : role === "evaluator_b" ? "2026-07-18T14:20:00Z" : "2026-07-18T15:20:00Z";
  const roleClaim: RoleAttemptClaim = {
    schema_version: "1.0", claim_type: "canonical_blinded_evaluator_role_attempt", runner_version: "1.0.0", execution_class: "DEV_TEST", publication_eligible: false,
    content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, benchmark_lock_sha256: LOCK_SHA256, role, claimed_at: claimedAt,
    timeout_ms: EVALUATION_ROLE_TIMEOUT_MS, retry_policy: "one_write_once_role_invocation_no_retry", public_package_attempt_claim_sha256: packageClaimSha256,
    package_receipt_sha256: receiptSha256, bundle_sha256: canonicalJsonSha256(bundle), packet_id: packetId, packet_sha256: packetSha256,
    execution_contract_sha256: bundle.execution_contract_sha256, runtime_ledger_sha256: bundle.runtime_ledger_sha256,
    llama_cli_sha256: packageClaimValue.llama_cli_sha256, model_sha256: packageClaimValue.model_sha256,
    role_system_prompt_sha256: bundle.role_system_prompt_sha256[role], role_generation_schema_sha256: bundle.role_generation_schema_sha256[role],
    strict_postparse_schema_sha256: packageClaimValue.strict_postparse_schema_sha256[role], sandbox_profile_sha256: bundle.sandbox_profile_sha256,
    external_provider_calls: 0, external_content_transfer: false, claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
  const publicClaim = await writeRoleAttemptClaim(projectRoot, roleClaim);
  const roleRoot = path.join(packageRoot, "role-results", role);
  await mkdir(roleRoot, { recursive: true, mode: 0o700 });
  await chmod(roleRoot, 0o700);
  const privateClaim = {
    schema_version: "1.0", state: "claimed_before_inference", role, packet_id: packetId, packet_sha256: packetSha256, claimed_at: claimedAt,
    public_role_attempt_claim_sha256: publicClaim.sha256, public_package_attempt_claim_sha256: packageClaimSha256, retry_policy: "one_write_once_role_invocation_no_retry",
  };
  const privateClaimSha256 = await writeJson(path.join(roleRoot, "claim.json"), privateClaim);
  const decisions = { schema_version: "1.0", items: result.items, claims_boundary: CLAIMS_BOUNDARY };
  const rawStdout = Buffer.from(JSON.stringify(decisions), "utf8");
  const rawStderr = Buffer.alloc(0);
  await Promise.all([
    writeFile(path.join(roleRoot, "raw.stdout"), rawStdout, { mode: 0o600, flag: "wx" }),
    writeFile(path.join(roleRoot, "raw.stderr"), rawStderr, { mode: 0o600, flag: "wx" }),
    writeJson(path.join(roleRoot, "generation-decisions.json"), decisions),
    writeJson(path.join(roleRoot, "result.json"), result),
  ]);
  const startedAt = result.started_at;
  const completedAt = result.completed_at;
  const process = {
    invocation_count: 1 as const, timeout_ms: EVALUATION_ROLE_TIMEOUT_MS, exit_code: 0, signal: null, timed_out: false, output_overflow: false,
    stdout_bytes: rawStdout.byteLength, stdout_retained_bytes: rawStdout.byteLength, stdout_sha256: hash(rawStdout),
    stderr_bytes: 0, stderr_retained_bytes: 0, stderr_sha256: hash(rawStderr), maximum_resident_set_size_bytes: null, peak_memory_footprint_bytes: null,
  };
  const report = {
    schema_version: "1.0", runner_version: "1.0.0", execution_class: "DEV_TEST", publication_eligible: false, role, state: "succeeded",
    packet_id: packetId, packet_sha256: packetSha256, result_sha256: canonicalJsonSha256(result), started_at: startedAt, completed_at: completedAt,
    duration_ms: Date.parse(completedAt) - Date.parse(startedAt), process,
    bindings: {
      content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, benchmark_lock_sha256: LOCK_SHA256,
      public_package_attempt_claim_sha256: packageClaimSha256, public_role_attempt_claim_sha256: publicClaim.sha256,
      execution_contract_sha256: bundle.execution_contract_sha256, runtime_ledger_sha256: bundle.runtime_ledger_sha256,
      llama_cli_sha256: packageClaimValue.llama_cli_sha256, model_sha256: packageClaimValue.model_sha256,
      role_system_prompt_sha256: bundle.role_system_prompt_sha256[role], role_generation_schema_sha256: bundle.role_generation_schema_sha256[role],
      strict_postparse_schema_sha256: packageClaimValue.strict_postparse_schema_sha256[role], sandbox_profile_sha256: bundle.sandbox_profile_sha256,
      post_execution_reverified: true,
    },
    boundary: {
      local_private_process: true, fresh_process: true, packet_only_file_context: true, network_denied: true, tools_available: false,
      external_provider_calls: 0, external_content_transfer: false, incremental_spend_usd: 0, training_performed: false,
      same_model_evaluator_bias: "disclosed_material_reproducibility_limitation",
    },
    failure_code: null, claims_boundary: CLAIMS_BOUNDARY,
  };
  const runReportSha256 = await writeJson(path.join(roleRoot, "run-report.json"), report);
  const terminalProcess: RoleAttemptTerminal["process"] = {
    invocation_count: 1, timeout_ms: EVALUATION_ROLE_TIMEOUT_MS, exit_code: 0, signal: null, timed_out: false, output_overflow: false,
    stdout_bytes: rawStdout.byteLength, stdout_retained_bytes: rawStdout.byteLength, stdout_sha256: hash(rawStdout),
    stderr_bytes: 0, stderr_retained_bytes: 0, stderr_sha256: hash(rawStderr),
  };
  await writeRoleAttemptTerminal(projectRoot, {
    schema_version: "1.0", terminal_type: "canonical_blinded_evaluator_role_terminal", runner_version: "1.0.0", execution_class: "DEV_TEST", publication_eligible: false,
    content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, role, public_role_attempt_claim_sha256: publicClaim.sha256,
    public_package_attempt_claim_sha256: packageClaimSha256, state: "succeeded", completed_at: completedAt,
    result_sha256: canonicalJsonSha256(result), private_role_claim_sha256: privateClaimSha256, private_run_report_sha256: runReportSha256,
    failure_code: null, process: terminalProcess, external_provider_calls: 0, external_content_transfer: false, claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  });
}

interface Fixture {
  projectRoot: string;
  privateRoots: [string, string];
  packageRoot: string;
  bundle: BlindedPacketBundle;
}

async function createFixture(base: string, options: { adjudication?: boolean; retryItem?: boolean } = {}): Promise<Fixture> {
  base = await realpath(base);
  const projectRoot = await createProject(base);
  const publicRoot = path.join(projectRoot, PUBLIC_REPORT_RELATIVE_ROOT);
  const items = sourceItems();
  for (const [index, item] of items.entries()) {
    const attemptClaim = {
      schema_version: "1.0", claim_type: "canonical_model_harness_attempt", harness_version: "1.2.0", execution_class: "SEALED",
      content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, item_id: item.item_id, gate_3_result_document_sha256: item.gate_3_result_sha256,
      normalized_transcript_sha256: hash(item.normalized_transcript_bytes),
    };
    item.gate_4_attempt_claim_sha256 = await writeJson(path.join(publicRoot, `${item.item_id}.attempt-claim.json`), attemptClaim);
    item.gate_4_public_report_sha256 = await writeJson(path.join(publicRoot, `${item.item_id}.json`), publicReport(item, options.retryItem === true && index === 0));
  }
  const input = basePacketInput(items);
  const packageClaimRecord = await writePackageAttemptClaim(projectRoot, packageClaim(input));
  input.package_attempt_claim_sha256 = packageClaimRecord.sha256;
  const bundle = generateBlindedPackets(input);
  const packageClaimValue = packageClaim(input);
  const privateA = path.join(base, "private-a");
  const packageRoot = path.join(privateA, "outputs", SEAL_COMMIT, "gate4-evaluation", "package");
  await mkdir(packageRoot, { recursive: true, mode: 0o700 });
  await chmod(packageRoot, 0o700);
  const receipt = {
    schema_version: "1.0", operator_version: "1.0.0", state: "written_exclusively", content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT,
    benchmark_lock_sha256: LOCK_SHA256, public_package_attempt_claim_sha256: packageClaimRecord.sha256, packet_generated_at: bundle.packet_generated_at,
    consent_attestation_sha256: bundle.consent_attestation_sha256, execution_readiness_sha256: bundle.execution_readiness_sha256,
    bundle_sha256: canonicalJsonSha256(bundle), packet_sha256: { evaluator_a: bundle.packets.evaluator_a.packet_sha256, evaluator_b: bundle.packets.evaluator_b.packet_sha256 },
    evidence: bundle.coordinator_manifest.items.map((item) => ({
      item_id: item.item_id, gate_3_result_sha256: item.gate_3_result_sha256, gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
      gate_4_run_id: item.gate_4_run_id, gate_4_public_report_sha256: item.gate_4_public_report_sha256,
      normalized_input_sha256: item.normalized_input_sha256, enrichment_output_sha256: item.enrichment_output_sha256,
    })),
    source_selection: "canonical_gate3_handoff_and_fixed_first_write_gate4_paths_only",
    package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package", external_provider_calls: 0, external_content_transfer: false,
    claims_boundary: CLAIMS_BOUNDARY,
  };
  await Promise.all([
    writeJson(path.join(packageRoot, "evaluator-a.packet.json"), bundle.packets.evaluator_a.packet),
    writeJson(path.join(packageRoot, "evaluator-b.packet.json"), bundle.packets.evaluator_b.packet),
    writeJson(path.join(packageRoot, "consent-attestation.json"), input.consent),
    writeJson(path.join(packageRoot, "execution-readiness.json"), input.execution_readiness),
    writeJson(path.join(packageRoot, "coordinator.bundle.json"), bundle),
    writeJson(path.join(packageRoot, "generation-receipt.json"), receipt),
  ]);
  await writePackageAttemptTerminal(projectRoot, {
    schema_version: "1.0", terminal_type: "canonical_blinded_packet_package_terminal", operator_version: "1.0.0", execution_class: "DEV_TEST", publication_eligible: false,
    content_commit: CONTENT_COMMIT, seal_commit: SEAL_COMMIT, public_package_attempt_claim_sha256: packageClaimRecord.sha256, state: "succeeded",
    completed_at: "2026-07-18T14:01:00Z", bundle_sha256: canonicalJsonSha256(bundle), bundle_file_sha256: hash(jsonBytes(bundle)),
    package_receipt_sha256: hash(jsonBytes(receipt)), failure_code: null, external_provider_calls: 0, external_content_transfer: false,
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  });
  const evaluatorA = evaluatorResult(bundle, "evaluator_a", false);
  const evaluatorB = evaluatorResult(bundle, "evaluator_b", options.adjudication === true);
  await writeRoleEvidence(projectRoot, packageRoot, bundle, packageClaimValue, packageClaimRecord.sha256, hash(jsonBytes(receipt)), "evaluator_a", evaluatorA, bundle.packets.evaluator_a.packet.packet_id, bundle.packets.evaluator_a.packet_sha256);
  await writeRoleEvidence(projectRoot, packageRoot, bundle, packageClaimValue, packageClaimRecord.sha256, hash(jsonBytes(receipt)), "evaluator_b", evaluatorB, bundle.packets.evaluator_b.packet.packet_id, bundle.packets.evaluator_b.packet_sha256);
  if (options.adjudication) {
    const adjudicator = adjudicatorResult(bundle, evaluatorA, evaluatorB);
    const packetSha256 = await writeJson(path.join(packageRoot, "adjudicator.packet.json"), adjudicator.packet);
    assert.equal(canonicalJsonSha256(adjudicator.packet), canonicalJsonSha256(JSON.parse((await readFile(path.join(packageRoot, "adjudicator.packet.json"), "utf8")))));
    await writeRoleEvidence(projectRoot, packageRoot, bundle, packageClaimValue, packageClaimRecord.sha256, hash(jsonBytes(receipt)), "adjudicator", adjudicator.result, adjudicator.packet.packet_id, canonicalJsonSha256(adjudicator.packet));
    assert.ok(packetSha256);
  }
  const privateB = path.join(base, "private-b");
  await cp(privateA, privateB, { recursive: true, preserveTimestamps: true });
  await chmod(path.join(privateB, "outputs", SEAL_COMMIT, "gate4-evaluation", "package"), 0o700);
  return { projectRoot, privateRoots: [privateA, privateB], packageRoot, bundle };
}

const PUBLIC_REPORT_RELATIVE_ROOT = `${PROJECT_RELATIVE_ROOT}/decisions/gate4-public-runs`;

function finalize(
  fixture: Fixture,
  index: 0 | 1 = 0,
  devDurabilityFailure?: "staging_file_sync" | "canonical_parent_sync" | "final_parent_sync",
) {
  return finalizeBlindedEvaluationForTests({
    projectRoot: fixture.projectRoot,
    privateEvidenceRoot: fixture.privateRoots[index],
    verifiedLock: { contentCommit: CONTENT_COMMIT, sealCommit: SEAL_COMMIT, lockSha256: LOCK_SHA256 },
    devDurabilityFailure,
  });
}

test("the SEALED finalize CLI rejects any caller-selected output or evidence path", () => {
  const run = spawnSync(process.execPath, [
    "--import", "tsx", CLI_PATH, "finalize",
    "--project-root", "/not-used",
    "--private-evidence-root", "/not-used",
    "--output", "/forbidden",
  ], { encoding: "utf8" });
  assert.equal(run.status, 1);
  const failure = JSON.parse(run.stderr.trim());
  assert.equal(failure.state, "failed");
  assert.equal(failure.external_provider_calls, 0);
  assert.equal(failure.external_content_transfer, false);
});

test("finalizes one no-dispute exact-five aggregate without publishing private text", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-no-dispute-"));
  const fixture = await createFixture(base);
  const result = await finalize(fixture);
  assert.equal(result.aggregate.adjudication.state, "not_required");
  assert.equal(result.aggregate.evidence_bindings.adjudication, null);
  assert.equal(result.aggregate.gate_4_qualitative_pass, true);
  assert.equal(result.aggregate.gate_4_overall_pass, true);
  assert.equal(result.aggregate.gate_5_trigger.state, "triggered_but_blocked");
  const text = result.bytes.toString("utf8");
  assert.equal(text.includes("Private synthetic transcript phrase"), false);
  assert.equal(text.includes("Private synthetic generated summary"), false);
  assert.equal(text.includes(base), false);
  assert.equal(text.includes("rationale"), false);
  const validate = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("GATE_4_AGGREGATE.schema.json")));
  assert.equal(validate(result.aggregate), true, JSON.stringify(validate.errors));
});

test("finalizes one required adjudication chain and binds its packet, claim, report, result, and terminal", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-adjudication-"));
  const fixture = await createFixture(base, { adjudication: true });
  const result = await finalize(fixture);
  assert.equal(result.aggregate.adjudication.state, "completed");
  assert.ok(result.aggregate.adjudication.required_disputes >= 1);
  assert.ok(result.aggregate.evidence_bindings.adjudication);
  assert.match(result.aggregate.evidence_bindings.adjudication!.private_packet.file_sha256, /^[0-9a-f]{64}$/);
});

test("a structurally repaired cell records 4/5 first-attempt validity and suppresses Gate 5", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-retry-"));
  const fixture = await createFixture(base, { retryItem: true });
  const result = await finalize(fixture);
  assert.equal(result.aggregate.deterministic_baseline.summary.first_attempt_schema_validity.rate, 0.8);
  assert.equal(result.aggregate.deterministic_baseline.all_required_criteria_pass, false);
  assert.equal(result.aggregate.gate_4_qualitative_pass, true);
  assert.equal(result.aggregate.gate_4_overall_pass, false);
  assert.equal(result.aggregate.gate_5_trigger.state, "not_triggered");
});

test("two copied private roots racing yield one canonical output and a rerun remains prohibited", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-copy-race-"));
  const fixture = await createFixture(base);
  const settled = await Promise.allSettled([finalize(fixture, 0), finalize(fixture, 1)]);
  assert.equal(settled.filter((entry) => entry.status === "fulfilled").length, 1);
  const rejected = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
  assert.ok(rejected?.reason instanceof Gate4FinalizerError && rejected.reason.code === "AGGREGATE_ALREADY_EXISTS");
  const winner = settled.find((entry): entry is PromiseFulfilledResult<Awaited<ReturnType<typeof finalize>>> => entry.status === "fulfilled")!;
  const publicBytes = await readFile(path.join(fixture.projectRoot, ...GATE4_AGGREGATE_RELATIVE_PATH.split("/")));
  assert.deepEqual(publicBytes, winner.value.bytes);
  await assert.rejects(finalize(fixture, 0), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "AGGREGATE_ALREADY_EXISTS");
});

test("a partial pre-existing aggregate remains fail-closed instead of being repaired or overwritten", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-partial-"));
  const fixture = await createFixture(base);
  const aggregatePath = path.join(fixture.projectRoot, ...GATE4_AGGREGATE_RELATIVE_PATH.split("/"));
  await writeFile(aggregatePath, "{\n", { mode: 0o644, flag: "wx" });
  await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "AGGREGATE_ALREADY_EXISTS");
  assert.equal(await readFile(aggregatePath, "utf8"), "{\n");
});

test("durability faults never leave a partial canonical aggregate or staging alternative", async (t) => {
  await t.test("staging-file sync failure leaves no canonical path and permits one clean retry", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-staging-sync-"));
    const fixture = await createFixture(base);
    const aggregatePath = path.join(fixture.projectRoot, ...GATE4_AGGREGATE_RELATIVE_PATH.split("/"));
    await assert.rejects(
      finalize(fixture, 0, "staging_file_sync"),
      (error: unknown) => error instanceof Gate4FinalizerError && error.code === "AGGREGATE_WRITE_FAILED",
    );
    assert.equal(await lstat(aggregatePath).catch(() => null), null);
    const decisions = path.dirname(aggregatePath);
    assert.deepEqual((await readdir(decisions)).filter((name) => name.includes(".staging-")), []);
    const retry = await finalize(fixture);
    assert.deepEqual(await readFile(aggregatePath), retry.bytes);
  });

  for (const fault of ["canonical_parent_sync", "final_parent_sync"] as const) {
    await t.test(`${fault} leaves only the complete canonical inode`, async () => {
      const base = await mkdtemp(path.join(tmpdir(), `yt-g4-finalize-${fault}-`));
      const fixture = await createFixture(base);
      const aggregatePath = path.join(fixture.projectRoot, ...GATE4_AGGREGATE_RELATIVE_PATH.split("/"));
      await assert.rejects(
        finalize(fixture, 0, fault),
        (error: unknown) => error instanceof Gate4FinalizerError && error.code === "AGGREGATE_WRITE_FAILED",
      );
      const aggregateBytes = await readFile(aggregatePath);
      const aggregate = JSON.parse(aggregateBytes.toString("utf8"));
      assert.equal(aggregate.schema_version, "1.1");
      const info = await stat(aggregatePath);
      assert.equal(info.isFile(), true);
      assert.equal(info.nlink, 1);
      assert.equal(info.mode & 0o777, 0o644);
      assert.deepEqual((await readdir(path.dirname(aggregatePath))).filter((name) => name.includes(".staging-")), []);
      await assert.rejects(
        finalize(fixture),
        (error: unknown) => error instanceof Gate4FinalizerError && error.code === "AGGREGATE_ALREADY_EXISTS",
      );
    });
  }
});

test("missing, failed, or hash-mismatched role chains fail closed", async (t) => {
  await t.test("missing terminal", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-missing-"));
    const fixture = await createFixture(base);
    await rm(authoritativeEvaluationTerminalPath(fixture.projectRoot, SEAL_COMMIT, "evaluator_b"));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("failed terminal", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-failed-"));
    const fixture = await createFixture(base);
    const terminalPath = authoritativeEvaluationTerminalPath(fixture.projectRoot, SEAL_COMMIT, "evaluator_b");
    const terminal = JSON.parse(await readFile(terminalPath, "utf8")) as RoleAttemptTerminal;
    await writeFile(terminalPath, jsonBytes({ ...terminal, state: "failed", result_sha256: null, failure_code: "MODEL_DECISIONS_INVALID" }));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("changed result", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-result-change-"));
    const fixture = await createFixture(base);
    const resultPath = path.join(fixture.packageRoot, "role-results/evaluator_a/result.json");
    const result = JSON.parse(await readFile(resultPath, "utf8"));
    result.items[0].claim_scores[0].rationale = "Changed after the terminal was committed.";
    await writeFile(resultPath, jsonBytes(result));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("changed report", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-report-change-"));
    const fixture = await createFixture(base);
    const reportPath = path.join(fixture.packageRoot, "role-results/evaluator_a/run-report.json");
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    report.process.maximum_resident_set_size_bytes = 1;
    await writeFile(reportPath, jsonBytes(report));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("changed terminal result binding", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-terminal-change-"));
    const fixture = await createFixture(base);
    const terminalPath = authoritativeEvaluationTerminalPath(fixture.projectRoot, SEAL_COMMIT, "evaluator_a");
    const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
    terminal.result_sha256 = "9".repeat(64);
    await writeFile(terminalPath, jsonBytes(terminal));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("changed private packet", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-packet-change-"));
    const fixture = await createFixture(base);
    const packetPath = path.join(fixture.packageRoot, "evaluator-a.packet.json");
    const packet = JSON.parse(await readFile(packetPath, "utf8"));
    packet.instructions.thresholds_computed_by_coordinator = false;
    await writeFile(packetPath, jsonBytes(packet));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
  await t.test("changed package receipt", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-receipt-change-"));
    const fixture = await createFixture(base);
    const receiptPath = path.join(fixture.packageRoot, "generation-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    receipt.bundle_sha256 = "8".repeat(64);
    await writeFile(receiptPath, jsonBytes(receipt));
    await assert.rejects(finalize(fixture), Gate4FinalizerError);
  });
});

test("an unnecessary adjudicator artifact is rejected when deterministic disputes are absent", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-unnecessary-adjudicator-"));
  const fixture = await createFixture(base);
  await writeFile(authoritativeEvaluationClaimPath(fixture.projectRoot, SEAL_COMMIT, "adjudicator"), "{}\n", { mode: 0o644, flag: "wx" });
  await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
});

test("extra entries, symlinks, and permissive private-file modes are rejected", async (t) => {
  await t.test("extra package file", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-extra-"));
    const fixture = await createFixture(base);
    await writeFile(path.join(fixture.packageRoot, "selectable-alternative.json"), "{}\n", { mode: 0o600, flag: "wx" });
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("symlink in role directory", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-symlink-"));
    const fixture = await createFixture(base);
    await symlink("result.json", path.join(fixture.packageRoot, "role-results/evaluator_a/selectable-result.json"));
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("permissive private evidence mode", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-mode-"));
    const fixture = await createFixture(base);
    await chmod(path.join(fixture.packageRoot, "role-results/evaluator_a/result.json"), 0o644);
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("extra canonical public-run file", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-public-extra-"));
    const fixture = await createFixture(base);
    const publicRoot = path.join(fixture.projectRoot, PUBLIC_REPORT_RELATIVE_ROOT);
    await writeFile(path.join(publicRoot, "post-selected.json"), "{}\n", { mode: 0o644, flag: "wx" });
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("unexpected canonical public-run subdirectory", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-public-subdir-"));
    const fixture = await createFixture(base);
    const publicRoot = path.join(fixture.projectRoot, PUBLIC_REPORT_RELATIVE_ROOT);
    await mkdir(path.join(publicRoot, "alternate"));
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("symlinked canonical public-run entry", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-public-symlink-"));
    const fixture = await createFixture(base);
    const publicRoot = path.join(fixture.projectRoot, PUBLIC_REPORT_RELATIVE_ROOT);
    const expectedPath = path.join(publicRoot, "YT-01.json");
    await rm(expectedPath);
    await symlink("YT-02.json", expectedPath);
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("directory substituted for canonical public-run file", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-public-wrong-type-"));
    const fixture = await createFixture(base);
    const publicRoot = path.join(fixture.projectRoot, PUBLIC_REPORT_RELATIVE_ROOT);
    const expectedPath = path.join(publicRoot, "YT-01.attempt-claim.json");
    await rm(expectedPath);
    await mkdir(expectedPath);
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("extra current-seal evaluation claim file", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-claim-extra-"));
    const fixture = await createFixture(base);
    const claimRoot = path.dirname(authoritativeEvaluationClaimPath(fixture.projectRoot, SEAL_COMMIT, "package"));
    await writeFile(path.join(claimRoot, "alternate.json"), "{}\n", { mode: 0o644, flag: "wx" });
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("unexpected current-seal evaluation claim subdirectory", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-claim-subdir-"));
    const fixture = await createFixture(base);
    const claimRoot = path.dirname(authoritativeEvaluationClaimPath(fixture.projectRoot, SEAL_COMMIT, "package"));
    await mkdir(path.join(claimRoot, "alternate"));
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("symlinked current-seal evaluation claim entry", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-claim-symlink-"));
    const fixture = await createFixture(base);
    const claimPath = authoritativeEvaluationClaimPath(fixture.projectRoot, SEAL_COMMIT, "evaluator_a");
    await rm(claimPath);
    await symlink("evaluator_b.json", claimPath);
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
  await t.test("directory substituted for current-seal evaluation terminal", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-g4-finalize-claim-wrong-type-"));
    const fixture = await createFixture(base);
    const terminalPath = authoritativeEvaluationTerminalPath(fixture.projectRoot, SEAL_COMMIT, "evaluator_a");
    await rm(terminalPath);
    await mkdir(terminalPath);
    await assert.rejects(finalize(fixture), (error: unknown) => error instanceof Gate4FinalizerError && error.code === "PATH_INVALID");
  });
});
