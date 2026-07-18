import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  BlindedEvaluationError,
  CANONICAL_GATE4_ITEM_IDS,
  aggregateBlindedEvaluations,
  buildAdjudicationPacket,
  canonicalJsonSha256,
  generateBlindedPackets,
  validateConsentAttestation,
  verifyAdjudicationResult,
  verifyEvaluatorResult,
  verifyGate4Aggregate,
  verifyGeneratedPacketBundle,
  type BlindedAdjudicationResult,
  type BlindedEvaluatorResult,
  type BlindedPacketBundle,
  type EvaluatorRole,
  type Gate4AggregateFinalizationContext,
  type GenerateBlindedPacketsInput,
} from "../blinded-evaluation";
import {
  BlindedPacketOperatorError,
  canonicalBlindedPacketPackagePath,
  exactGate3PathMap,
  verifyGate4AttemptClaim,
} from "../blinded-packet-operator";

const MODEL_DIRECTORY = fileURLToPath(new URL("../../model/", import.meta.url));

function loadJson(name: string): unknown {
  return JSON.parse(readFileSync(`${MODEL_DIRECTORY}${name}`, "utf8"));
}

function finalizationContext(bundle: BlindedPacketBundle, evaluatorA: unknown, evaluatorB: unknown, firstAttemptPasses = 5): Gate4AggregateFinalizationContext {
  const binding = (label: string) => ({
    file_sha256: canonicalJsonSha256({ label, representation: "file", seal: bundle.seal_commit }),
    canonical_json_sha256: canonicalJsonSha256({ label, representation: "canonical", seal: bundle.seal_commit }),
  });
  const role = (label: string) => ({
    public_attempt_claim: binding(`${label}-public-claim`),
    public_terminal: binding(`${label}-public-terminal`),
    private_claim: binding(`${label}-private-claim`),
    private_run_report: binding(`${label}-private-report`),
    private_result: binding(`${label}-private-result`),
    private_generation_decisions: binding(`${label}-private-decisions`),
    raw_stdout_sha256: canonicalJsonSha256({ label, stream: "stdout" }),
    raw_stderr_sha256: canonicalJsonSha256({ label, stream: "stderr" }),
  });
  const items = CANONICAL_GATE4_ITEM_IDS.map((itemId, index) => ({
    item_id: itemId,
    public_report_sha256: canonicalJsonSha256({ itemId, kind: "public-report" }),
    run_id: `${itemId}-20260718T140000Z-${canonicalJsonSha256({ itemId }).slice(0, 12)}`,
    attempt_count: (index < firstAttemptPasses ? 1 : 2) as 1 | 2,
    first_attempt_schema_valid: index < firstAttemptPasses,
    final_schema_valid: true,
    semantic_reference_valid: true,
    truthful_state: true,
    latency_resource_measured: true,
    zero_external_cost_and_provider_calls: true,
  }));
  const metric = (values: boolean[]) => ({ numerator: values.filter(Boolean).length, denominator: values.length, rate: values.filter(Boolean).length / values.length });
  const summary = {
    first_attempt_schema_validity: metric(items.map((item) => item.first_attempt_schema_valid)),
    final_schema_validity: metric(items.map((item) => item.final_schema_valid)),
    semantic_reference_validity: metric(items.map((item) => item.semantic_reference_valid)),
    truthful_state: metric(items.map((item) => item.truthful_state)),
    latency_resource_measured: metric(items.map((item) => item.latency_resource_measured)),
    zero_external_cost_and_provider_calls: metric(items.map((item) => item.zero_external_cost_and_provider_calls)),
  };
  const evaluatorABindings = role("evaluator-a");
  const evaluatorBBindings = role("evaluator-b");
  evaluatorABindings.private_result.canonical_json_sha256 = canonicalJsonSha256(evaluatorA);
  evaluatorBBindings.private_result.canonical_json_sha256 = canonicalJsonSha256(evaluatorB);
  return {
    execution_class: "DEV_TEST",
    publication_eligible: false,
    evidence_bindings: {
      package: {
        public_attempt_claim: binding("package-public-claim"),
        public_terminal: binding("package-public-terminal"),
        private_receipt: binding("package-private-receipt"),
        private_bundle: binding("package-private-bundle"),
      },
      evaluators: { evaluator_a: evaluatorABindings, evaluator_b: evaluatorBBindings },
      adjudication: null,
    },
    deterministic_baseline: { items, summary, all_required_criteria_pass: firstAttemptPasses === 5 },
  };
}

function syntheticInput(): GenerateBlindedPacketsInput {
  const items = CANONICAL_GATE4_ITEM_IDS.map((itemId, itemIndex) => {
    const segments = Array.from({ length: 20 }, (_, segmentIndex) => ({
      index: segmentIndex,
      start_ms: segmentIndex * 1_000,
      end_ms: (segmentIndex + 1) * 1_000,
      source_start_ms: segmentIndex * 1_000,
      source_end_ms: (segmentIndex + 1) * 1_000,
      text: `Synthetic item ${itemIndex + 1} segment ${segmentIndex + 1} carries grounded words for blinded evaluator development only`,
      source_cue_ids: [`DEV-CUE-${segmentIndex}`],
    }));
    const normalized = {
      schema_version: "1.0",
      item_id: itemId,
      youtube_video_id: `DEV0000000${itemIndex}`.slice(-11),
      source_method: "A1",
      language: "en-US",
      caption_type: "source_provided_unknown_authorship",
      timestamp_mode: "timestamped",
      completeness: {
        state: "complete",
        basis: "source_coverage_record",
        source_duration_ms: 20_000,
        last_cue_end_ms: 20_000,
        trailing_gap_ms: 0,
      },
      provenance: {
        source_page_url: `https://example.invalid/${itemId}`,
        source_asset_url: `https://example.invalid/${itemId}.vtt`,
        input_sha256: canonicalJsonSha256({ itemId, kind: "source" }),
        reference_role: "input_preservation",
        version_equivalence: "official_row_level_publication_association",
        acquired_at: "2026-07-18T08:00:00Z",
      },
      processing_version: "DEV-1.0",
      segments,
      errors: [],
    };
    const normalizedBytes = `${JSON.stringify(normalized, null, 2)}\n`;
    const inputHash = createHash("sha256").update(normalizedBytes).digest("hex");
    const segmentId = `${itemId}:S000000`;
    const output = {
      schema_version: "1.0",
      item_id: itemId,
      input_sha256: inputHash,
      language_tag: "en-US",
      transcript_status: "complete",
      summary: `Synthetic generated summary for blinded item ${itemIndex + 1}.`,
      material_claims: [{
        claim_id: "C001",
        claim: `Synthetic grounded claim for item ${itemIndex + 1}.`,
        evidence_segment_ids: [segmentId],
        evidence_start_ms: 0,
        evidence_end_ms: 1_000,
      }],
      chapters: [{
        chapter_id: "H001",
        title: "Synthetic chapter",
        summary: "Synthetic chapter summary.",
        start_segment_id: segmentId,
        end_segment_id: segmentId,
        start_ms: 0,
        end_ms: 1_000,
      }],
      key_points: [{
        key_point_id: "K001",
        point: `Synthetic grounded key point for item ${itemIndex + 1}.`,
        evidence_segment_ids: [segmentId],
        evidence_start_ms: 0,
        evidence_end_ms: 1_000,
      }],
      concepts: [{
        concept_id: "N001",
        label: "Synthetic concept",
        explanation: "Synthetic explanation.",
        evidence_segment_ids: [segmentId],
      }],
      action_items: [],
      search_terms: ["synthetic"],
      user_tags: [],
      ai_categories: ["test"],
      limitations: ["Synthetic development fixture only."],
    };
    return {
      item_id: itemId,
      normalized_transcript_bytes: normalizedBytes,
      enrichment_output_bytes: `${JSON.stringify(output, null, 2)}\n`,
      gate_3_result_sha256: "d".repeat(64),
      gate_4_attempt_claim_sha256: createHash("sha256").update(`synthetic-attempt-claim-${itemId}`).digest("hex"),
      gate_4_public_report_sha256: createHash("sha256").update(`synthetic-public-report-${itemId}`).digest("hex"),
      gate_4_run_id: `${itemId}-20260718T140000Z-${createHash("sha256").update(itemId).digest("hex").slice(0, 12)}`,
    };
  });
  return {
    content_commit: "a".repeat(40),
    seal_commit: "b".repeat(40),
    benchmark_lock_sha256: "c".repeat(64),
    package_attempt_claim_sha256: "e".repeat(64),
    packet_generated_at: "2026-07-18T14:00:00Z",
    execution_contract: loadJson("EVALUATOR_EXECUTION_CONTRACT.json"),
    runtime_ledger_json: readFileSync(`${MODEL_DIRECTORY}LOCAL_MODEL_RUNTIME_LEDGER.json`, "utf8"),
    sandbox_profile_text: readFileSync(fileURLToPath(new URL("../../../spikes/model-harness/deny-network.sb", import.meta.url)), "utf8"),
    role_system_prompts: {
      evaluator_a: readFileSync(`${MODEL_DIRECTORY}EVALUATOR_A_SYSTEM_PROMPT.txt`, "utf8"),
      evaluator_b: readFileSync(`${MODEL_DIRECTORY}EVALUATOR_B_SYSTEM_PROMPT.txt`, "utf8"),
      adjudicator: readFileSync(`${MODEL_DIRECTORY}ADJUDICATOR_SYSTEM_PROMPT.txt`, "utf8"),
    },
    role_generation_schemas: {
      evaluator_a: readFileSync(`${MODEL_DIRECTORY}BLINDED_EVALUATION_GENERATION.schema.json`, "utf8"),
      evaluator_b: readFileSync(`${MODEL_DIRECTORY}BLINDED_EVALUATION_GENERATION.schema.json`, "utf8"),
      adjudicator: readFileSync(`${MODEL_DIRECTORY}BLINDED_ADJUDICATION_GENERATION.schema.json`, "utf8"),
    },
    authorization: loadJson("LOCAL_DERIVATION_AUTHORIZATION.json"),
    rubric: loadJson("KEY_POINT_RUBRIC.json"),
    consent: {
      state: "affirmative",
      attestation_id: "CONSENT-DEV-20260718-001",
      recorded_at: "2026-07-18T13:00:00Z",
      withdrawn: false,
      bounded_excerpt_transfer_authorized: true,
    },
    execution_readiness: {
      pinned_runtime_verified: true,
      pinned_model_verified: true,
      role_prompt_hashes_verified: true,
      deny_network_sandbox_available: true,
      fresh_process_isolation_available: true,
      packet_only_file_binding_available: true,
      local_private_storage_available: true,
      external_content_transfer: false,
      result_attestation_verification_available: true,
      incremental_spend_usd: 0,
    },
    items,
  };
}

function makeEvaluatorResult(bundle: BlindedPacketBundle, role: EvaluatorRole): BlindedEvaluatorResult {
  const packet = bundle.packets[role];
  return {
    schema_version: "1.1",
    packet_id: packet.packet.packet_id,
    packet_sha256: packet.packet_sha256,
    execution_contract_sha256: bundle.execution_contract_sha256,
    role,
    execution_attestation: {
      fresh_process: true,
      packet_only_file_context: true,
      candidate_identity_hidden: true,
      candidate_runtime_hidden: true,
      price_latency_hidden: true,
      other_evaluator_unseen: true,
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
    },
    started_at: "2026-07-18T15:00:00Z",
    completed_at: "2026-07-18T15:10:00Z",
    items: packet.packet.items.map((item) => ({
      blinded_item_id: item.blinded_item_id,
      packet_item_sha256: item.packet_item_sha256,
      claim_scores: item.claims.map((claim) => ({
        claim_id: claim.claim_id,
        support: "fully_supported" as const,
        evidence_excerpt_ids: claim.evidence_excerpt_ids,
        rationale: "The bounded cited excerpt supports the packet claim.",
      })),
      citation_scores: item.claims.map((claim) => ({
        citation_id: claim.citation_id,
        assessment: "correct" as const,
        evidence_excerpt_ids: claim.evidence_excerpt_ids,
        rationale: "The citation points to the approved evidence window.",
      })),
      key_point_scores: item.rubric_points.map((point) => ({
        rubric_point_id: point.rubric_point_id,
        kind: point.kind,
        covered: point.kind === "text_groundable",
        cause: point.kind === "text_groundable" ? "supported_by_transcript_and_output" as const : "essential_visual_evidence_absent" as const,
        evidence_excerpt_ids: point.kind === "text_groundable" ? [item.excerpts[0].excerpt_id] : [],
        rationale: point.kind === "text_groundable" ? "The generated output covers this text-groundable point." : "The transcript-only packet lacks essential visual evidence.",
      })),
      critical_hallucinations: [],
      schema_or_reference_issues: [],
      confidence: "high" as const,
    })),
    claims_boundary: "ai_evaluated_provisional_pending_human_stakeholder_review",
  };
}

function assertCode(action: () => unknown, code: BlindedEvaluationError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof BlindedEvaluationError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("blinded Gate 4 packet generation", () => {
  it("admits only the remediated Gate 3 v2.1 / generator v1.1 handoff", () => {
    const value = {
      schema_version: "2.1",
      generator_version: "1.1.0",
      state: "pass",
      items: CANONICAL_GATE4_ITEM_IDS.map((itemId) => ({ item_id: itemId, model_input_private_root_relative_path: `outputs/${"b".repeat(40)}/gate3/${itemId}.json` })),
    };
    assert.equal(exactGate3PathMap(value).size, 5);
    assert.throws(() => exactGate3PathMap({ ...value, schema_version: "2.0" }), BlindedPacketOperatorError);
  });

  it("uses flattened decision-only generation schemas and explicit 13-invocation accounting", () => {
    for (const name of ["BLINDED_EVALUATION_GENERATION.schema.json", "BLINDED_ADJUDICATION_GENERATION.schema.json"]) {
      const serialized = JSON.stringify(loadJson(name));
      assert.equal(serialized.includes('"$ref"'), false);
      assert.equal(serialized.includes('"$defs"'), false);
      assert.equal(serialized.includes("execution_attestation"), false);
    }
    const contract = loadJson("EVALUATOR_EXECUTION_CONTRACT.json") as { inference_accounting: Record<string, number> };
    assert.deepEqual(contract.inference_accounting, {
      candidate_initial_invocations: 5,
      candidate_format_only_retries_maximum: 5,
      candidate_invocations_maximum: 10,
      blinded_evaluator_invocations: 2,
      adjudicator_invocations_maximum: 1,
      total_local_inference_invocations_maximum: 13,
      model_roster_count: 1,
      external_provider_calls: 0,
    });
  });

  it("binds the exact canonical Gate 4 attempt claim and rejects tampering", () => {
    const expected = {
      itemId: "YT-01",
      contentCommit: "a".repeat(40),
      sealCommit: "b".repeat(40),
      gate3DocumentSha256: "c".repeat(64),
      inputSha256: "d".repeat(64),
    };
    const claim = {
      schema_version: "1.0",
      claim_type: "canonical_model_harness_attempt",
      harness_version: "1.2.0",
      execution_class: "SEALED",
      content_commit: expected.contentCommit,
      seal_commit: expected.sealCommit,
      item_id: expected.itemId,
      gate_3_result_document_sha256: expected.gate3DocumentSha256,
      normalized_transcript_sha256: expected.inputSha256,
    };
    assert.doesNotThrow(() => verifyGate4AttemptClaim(claim, expected));
    assert.throws(
      () => verifyGate4AttemptClaim({ ...claim, normalized_transcript_sha256: "e".repeat(64) }, expected),
      (error: unknown) => error instanceof BlindedPacketOperatorError && error.code === "GATE4_REPORT_INVALID",
    );
    assert.equal(
      canonicalBlindedPacketPackagePath("/private/evidence", expected.sealCommit),
      `/private/evidence/outputs/${expected.sealCommit}/gate4-evaluation/package`,
    );
  });

  it("deterministically produces separate exact-five packets within every excerpt boundary", () => {
    const input = syntheticInput();
    const first = generateBlindedPackets(input);
    const second = generateBlindedPackets(input);
    assert.deepEqual(first, second);
    assert.notEqual(first.packets.evaluator_a.packet.ordering_sha256, first.packets.evaluator_b.packet.ordering_sha256);
    assert.ok(first.coordinator_manifest.items.every((item) => /^[0-9a-f]{64}$/.test(item.gate_4_attempt_claim_sha256)));
    for (const role of ["evaluator_a", "evaluator_b"] as const) {
      const packet = first.packets[role];
      assert.equal(packet.packet.items.length, 5);
      assert.equal(packet.packet_sha256, canonicalJsonSha256(packet.packet));
      packet.packet.items.forEach((item) => {
        assert.ok(item.boundary_counts.excerpt_count <= 12);
        assert.ok(item.boundary_counts.total_excerpt_words <= 240);
        assert.ok(item.boundary_counts.unique_transcript_word_position_fraction <= 0.35);
        assert.equal(item.boundary_counts.complete_transcript_included, false);
        assert.equal(item.boundary_counts.reconstructable_transcript_detected, false);
        assert.ok(item.excerpts.every((excerpt) => excerpt.word_count <= 40));
      });
    }
    assert.doesNotThrow(() => verifyGeneratedPacketBundle(input, first));
  });

  it("validates and sanitizes only the exact bounded affirmative consent object", () => {
    const source = { ...syntheticInput().consent };
    const validated = validateConsentAttestation(source, "2026-07-18T14:00:00Z");
    assert.deepEqual(validated, source);
    assert.notEqual(validated, source, "validation must return an isolated exact-key object");
    source.attestation_id = "CONSENT-MUTATED-AFTER-VALIDATION";
    assert.equal(validated.attestation_id, "CONSENT-DEV-20260718-001");

    for (const invalid of [
      null,
      {},
      { ...validated, attestation_id: "CONSENT-short" },
      { ...validated, recorded_at: "not-a-timestamp" },
      { ...validated, recorded_at: "2026-07-18T14:00:01Z" },
      { ...validated, withdrawn: true },
      { ...validated, bounded_excerpt_transfer_authorized: false },
      { ...validated, extra: "not allowed" },
    ]) {
      assertCode(
        () => validateConsentAttestation(invalid, "2026-07-18T14:00:00Z"),
        "CONSENT_UNAVAILABLE",
      );
    }
  });

  it("rejects a one-item denominator and unavailable consent/posture", () => {
    const input = syntheticInput();
    assertCode(() => generateBlindedPackets({ ...input, items: input.items.slice(0, 1) }), "INVALID_DENOMINATOR");
    assertCode(() => generateBlindedPackets({ ...input, consent: { ...input.consent, recorded_at: "2026-07-18T15:00:00Z" } }), "CONSENT_UNAVAILABLE");
    assertCode(() => generateBlindedPackets({ ...input, execution_readiness: { ...input.execution_readiness, fresh_process_isolation_available: false } as never }), "EXECUTION_POSTURE_UNAVAILABLE");
    assertCode(() => generateBlindedPackets({ ...input, sandbox_profile_text: `${input.sandbox_profile_text}\n; tampered` }), "EXECUTION_POSTURE_UNAVAILABLE");
    assertCode(() => generateBlindedPackets({ ...input, role_system_prompts: { ...input.role_system_prompts, evaluator_a: `${input.role_system_prompts.evaluator_a}\nTampered` } }), "EXECUTION_POSTURE_UNAVAILABLE");
    assertCode(() => generateBlindedPackets({ ...input, role_generation_schemas: { ...input.role_generation_schemas, evaluator_b: `${input.role_generation_schemas.evaluator_b}\n` } }), "EXECUTION_POSTURE_UNAVAILABLE");
    const tamperedLedger = JSON.parse(input.runtime_ledger_json) as { model: { observed_file: { sha256: string } } };
    tamperedLedger.model.observed_file.sha256 = "0".repeat(64);
    assertCode(() => generateBlindedPackets({ ...input, runtime_ledger_json: `${JSON.stringify(tamperedLedger, null, 2)}\n` }), "EXECUTION_POSTURE_UNAVAILABLE");
  });

  it("rejects a packet that no longer reproduces from the sealed inputs", () => {
    const input = syntheticInput();
    const packet = structuredClone(generateBlindedPackets(input));
    packet.packets.evaluator_a.packet.items[0].generated_summary = "Mutated summary";
    assertCode(() => verifyGeneratedPacketBundle(input, packet), "RESULT_INVALID");
  });
});

describe("strict A/B result verification", () => {
  it("accepts exact packet-bound results and rejects a one-item result", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const result = makeEvaluatorResult(bundle, "evaluator_a");
    assert.doesNotThrow(() => verifyEvaluatorResult(result, bundle, "evaluator_a"));
    const oneItem = structuredClone(result) as unknown as Record<string, unknown>;
    oneItem.items = result.items.slice(0, 1);
    assertCode(() => verifyEvaluatorResult(oneItem, bundle, "evaluator_a"), "RESULT_INVALID");
  });

  it("rejects duplicate or missing rubric points and unapproved excerpts", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const duplicate = structuredClone(makeEvaluatorResult(bundle, "evaluator_a"));
    duplicate.items[0].key_point_scores[1] = structuredClone(duplicate.items[0].key_point_scores[0]);
    assertCode(() => verifyEvaluatorResult(duplicate, bundle, "evaluator_a"), "RESULT_INVALID");

    const missing = structuredClone(makeEvaluatorResult(bundle, "evaluator_a"));
    missing.items[0].key_point_scores.pop();
    assertCode(() => verifyEvaluatorResult(missing, bundle, "evaluator_a"), "RESULT_INVALID");

    const unapproved = structuredClone(makeEvaluatorResult(bundle, "evaluator_a"));
    unapproved.items[0].claim_scores[0].evidence_excerpt_ids = ["E999"];
    assertCode(() => verifyEvaluatorResult(unapproved, bundle, "evaluator_a"), "RESULT_INVALID");
  });

  it("rejects evaluator-invented summary fields instead of treating them as evidence", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const invented = structuredClone(makeEvaluatorResult(bundle, "evaluator_a")) as unknown as { items: Array<Record<string, unknown>> };
    invented.items[0].summary = "Evaluator-authored replacement summary";
    assertCode(() => verifyEvaluatorResult(invented, bundle, "evaluator_a"), "RESULT_INVALID");
  });
});

describe("adjudication and deterministic aggregation", () => {
  it("adjudicates crossed metric disagreements even when A and B each pass alone", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    const failTextPoints = (result: BlindedEvaluatorResult, role: EvaluatorRole, itemIds: readonly string[]): void => {
      for (const itemId of itemIds) {
        const blindedId = bundle.coordinator_manifest.items.find((item) => item.item_id === itemId)!.roles[role].blinded_item_id;
        const resultItem = result.items.find((item) => item.blinded_item_id === blindedId)!;
        const point = resultItem.key_point_scores.find((candidate) => candidate.kind === "text_groundable" && candidate.covered)!;
        point.covered = false;
        point.cause = "output_omission";
        point.evidence_excerpt_ids = [];
        point.rationale = `${role} records a synthetic omission for the crossed-disagreement regression.`;
      }
    };
    failTextPoints(evaluatorA, "evaluator_a", ["YT-01", "YT-02", "YT-07"]);
    failTextPoints(evaluatorB, "evaluator_b", ["YT-08", "YT-09"]);

    const bMatchingA = makeEvaluatorResult(bundle, "evaluator_b");
    failTextPoints(bMatchingA, "evaluator_b", ["YT-01", "YT-02", "YT-07"]);
    const aMatchingB = makeEvaluatorResult(bundle, "evaluator_a");
    failTextPoints(aMatchingB, "evaluator_a", ["YT-08", "YT-09"]);
    assert.equal(aggregateBlindedEvaluations(bundle, evaluatorA, bMatchingA, finalizationContext(bundle, evaluatorA, bMatchingA)).gate_4_qualitative_pass, true);
    assert.equal(aggregateBlindedEvaluations(bundle, aMatchingB, evaluatorB, finalizationContext(bundle, aMatchingB, evaluatorB)).gate_4_qualitative_pass, true);
    const adjudication = buildAdjudicationPacket(bundle, evaluatorA, evaluatorB);
    assert.equal(adjudication.state, "required");
    assert.equal(adjudication.disputes.filter((dispute) => dispute.kind === "text_key_point").length, 5);
    assertCode(() => aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, finalizationContext(bundle, evaluatorA, evaluatorB)), "ADJUDICATION_REQUIRED");
  });

  it("builds an exact-five adjudication contract and accepts only original A/B choices", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    evaluatorB.items[0].claim_scores[0].support = "contradicted";
    evaluatorB.items[0].claim_scores[0].rationale = "Evaluator B sees a contradiction.";
    const adjudication = buildAdjudicationPacket(bundle, evaluatorA, evaluatorB);
    assert.equal(adjudication.state, "required");
    assert.equal(adjudication.packet!.items.length, 5);
    assert.ok(adjudication.disputes.length >= 1);
    const result: BlindedAdjudicationResult = {
      schema_version: "1.0",
      packet_id: adjudication.packet!.packet_id,
      packet_sha256: adjudication.packet_sha256!,
      execution_contract_sha256: bundle.execution_contract_sha256,
      role: "adjudicator",
      execution_attestation: {
        fresh_process: true,
        packet_only_file_context: true,
        candidate_identity_hidden: true,
        candidate_runtime_hidden: true,
        price_latency_hidden: true,
        both_evaluator_results_seen_only_for_disputes: true,
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
        additional_transcript_content_received: false,
      },
      started_at: "2026-07-18T16:00:00Z",
      completed_at: "2026-07-18T16:10:00Z",
      items: adjudication.packet!.items.map((item) => ({
        blinded_item_id: item.blinded_item_id,
        decisions: item.disputes.map((dispute) => ({
          dispute_id: dispute.dispute_id,
          selected_option: "evaluator_a" as const,
          rationale: "The approved A option is better supported by the bounded evidence.",
        })),
      })),
      claims_boundary: "ai_evaluated_provisional_pending_human_stakeholder_review",
    };
    assert.doesNotThrow(() => verifyAdjudicationResult(result, adjudication, bundle.packet_generated_at));
    const context = finalizationContext(bundle, evaluatorA, evaluatorB);
    const adjudicationRole = {
      ...structuredClone(context.evidence_bindings.evaluators.evaluator_a),
      private_packet: context.evidence_bindings.package.private_bundle,
    };
    adjudicationRole.private_result.canonical_json_sha256 = canonicalJsonSha256(result);
    context.evidence_bindings.adjudication = adjudicationRole;
    const aggregate = aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, context, result);
    assert.equal(aggregate.gate_4_qualitative_pass, true);
  });

  it("derives pooled and macro arithmetic and records the fired visual trigger as blocked", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    const aggregate = aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, finalizationContext(bundle, evaluatorA, evaluatorB));
    assert.equal(aggregate.denominator.items, 5);
    assert.equal(aggregate.pooled.material_claim_support.rate, 1);
    assert.equal(aggregate.macro.material_claim_support.rate, 1);
    assert.equal(aggregate.gate_5_trigger.state, "triggered_but_blocked");
    assert.equal(aggregate.gate_5_trigger.trigger_fired, true);
    assert.deepEqual(aggregate.gate_5_trigger.blocked_reasons, ["no_sealed_visual_method", "no_rights_authorized_visual_media_set"]);
  });

  it("suppresses Gate 5 when a format retry makes first-attempt validity 4/5", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    const aggregate = aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, finalizationContext(bundle, evaluatorA, evaluatorB, 4));
    assert.equal(aggregate.gate_4_qualitative_pass, true);
    assert.equal(aggregate.deterministic_baseline.summary.first_attempt_schema_validity.rate, 0.8);
    assert.equal(aggregate.gate_4_overall_pass, false);
    assert.equal(aggregate.gate_5_trigger.trigger_fired, false);
    assert.equal(aggregate.gate_5_trigger.state, "not_triggered");
  });

  it("computes not_triggered when the visual gap is not solely missing visual evidence", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    for (const result of [evaluatorA, evaluatorB]) {
      result.items.forEach((item) => item.key_point_scores.filter((point) => point.kind === "visual_only").forEach((point) => {
        point.cause = "output_omission";
        point.rationale = "The output omitted the visual-only rubric point for a non-visual-evidence reason.";
      }));
    }
    const aggregate = aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, finalizationContext(bundle, evaluatorA, evaluatorB));
    assert.equal(aggregate.gate_5_trigger.state, "not_triggered");
    assert.equal(aggregate.gate_5_trigger.trigger_fired, false);
  });

  it("rejects impossible counts and malformed/self-asserted trigger states", () => {
    const bundle = generateBlindedPackets(syntheticInput());
    const evaluatorA = makeEvaluatorResult(bundle, "evaluator_a");
    const evaluatorB = makeEvaluatorResult(bundle, "evaluator_b");
    const aggregate = aggregateBlindedEvaluations(bundle, evaluatorA, evaluatorB, finalizationContext(bundle, evaluatorA, evaluatorB));
    const impossible = structuredClone(aggregate);
    impossible.per_item[0].material_claim_support.numerator = impossible.per_item[0].material_claim_support.denominator + 1;
    assertCode(() => verifyGate4Aggregate(impossible), "AGGREGATE_INVALID");

    const malformed = structuredClone(aggregate);
    malformed.gate_5_trigger.state = "not_triggered";
    assertCode(() => verifyGate4Aggregate(malformed), "AGGREGATE_INVALID");

    const selfAssertedThreshold = structuredClone(aggregate);
    selfAssertedThreshold.thresholds.citation_accuracy = 0.8 as 0.9;
    assertCode(() => verifyGate4Aggregate(selfAssertedThreshold), "AGGREGATE_INVALID");

    const malformedAdjudication = structuredClone(aggregate);
    malformedAdjudication.adjudication.required_disputes = 1;
    assertCode(() => verifyGate4Aggregate(malformedAdjudication), "AGGREGATE_INVALID");
  });
});
