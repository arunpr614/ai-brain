import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, it } from "node:test";

import {
  BenchmarkLock,
  generateLockDraft,
  getCurrentRuntimeRecord,
  LOCK_VERIFIER_VERSION,
  LockVerificationError,
  parseJsonBytesWithoutDuplicateKeys,
  parseLockJson,
  parseMethodItemMatrixJson,
  parseReferenceLedgerJson,
  verifyLock,
} from "../verify-lock";

it("keeps the operational README verifier heading synchronized with the implementation", () => {
  const readmePath = fileURLToPath(new URL("../README.md", import.meta.url));
  assert.match(readFileSync(readmePath, "utf8"), new RegExp(`^### Lock verifier v${LOCK_VERIFIER_VERSION}$`, "m"));
});

const LOCK_PATH = "benchmark/LOCK.json";
const requireFromTest = createRequire(import.meta.url);
const TRACKER_PATH = "docs/feature-council/youtube-transcript-enrichment/TRACKER.md";
const ATTESTATION_PATHS = Array.from(
  { length: 9 },
  (_, index) => `benchmark/attestations/YT-${String(index + 1).padStart(2, "0")}.json`,
);
const A1_MODEL_ARTIFACT_PATHS = [
  "benchmark/model/A1_EXECUTION_CONTRACT.json",
  "benchmark/model/A1_EXECUTION_CONTRACT.schema.json",
  "benchmark/model/A1_OPERATOR_RECEIPT.schema.json",
  "benchmark/model/A1_ATTEMPT_CLAIM.schema.json",
  "benchmark/model/A1_ATTEMPT_TERMINAL.schema.json",
] as const;
const REQUIRED_BENCHMARK_FILES = [
  "benchmark/BENCHMARK_PROTOCOL.md",
  "benchmark/CORPUS_MANIFEST.md",
  "benchmark/EVALUATOR_FORM.md",
  "benchmark/LOCK.schema.json",
  "benchmark/METHOD_ITEM_MATRIX.json",
  "benchmark/METHOD_ITEM_MATRIX.md",
  "benchmark/METHOD_ITEM_MATRIX.schema.json",
  "benchmark/PRESEAL_READINESS.json",
  "benchmark/PRESEAL_READINESS.schema.json",
  "benchmark/REFERENCE_LEDGER.json",
  "benchmark/REFERENCE_LEDGER.schema.json",
  "benchmark/RUN_PLAN.md",
  "benchmark/SAFETY_FIXTURES.json",
  "benchmark/model/MODEL_PACKAGE.json",
  "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
  "benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
  "benchmark/model/EVALUATOR_EXECUTION_CONTRACT.json",
  ...A1_MODEL_ARTIFACT_PATHS,
  "benchmark/model/enrichment-output.schema.json",
  "benchmark/tools/generate-anchors.ts",
  "benchmark/tools/prepare-private-reference.ts",
  "benchmark/tools/score-private-a1.ts",
  "benchmark/tools/subtitle-preflight.ts",
  "benchmark/tools/transcript-scorer.ts",
  "benchmark/tools/verify-lock.ts",
  ...ATTESTATION_PATHS,
];
const REQUIRED_PRODUCTION_MODULES = [
  "src/db/client.ts",
  "src/db/items.ts",
  "src/db/transcripts.ts",
  "src/lib/capture/transcripts/parse-file.ts",
  "src/lib/capture/transcripts/user-provided.ts",
];
const REQUIRED_FILES = [
  ...REQUIRED_BENCHMARK_FILES,
  "audit/current-state.md",
  "research/method-screen.md",
  "reviews/prelock-review.md",
  "research/2026-07-16_model-screening-stop-record.md",
  "research/MODEL_COMPARISON.md",
  "spikes/a1-harness/README.md",
  "spikes/a1-harness/cli.ts",
  "spikes/a1-harness/tests/cli.test.ts",
  "spikes/model-harness/runner.ts",
  "spikes/model-harness/tests/runner.test.ts",
  "SOURCE_INVENTORY.md",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
  ...REQUIRED_PRODUCTION_MODULES,
  "src/other-production.ts",
].sort();

const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const path of temporaryRepositories.splice(0)) rmSync(path, { recursive: true, force: true });
});

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

function write(root: string, path: string, content: string): void {
  const absolute = join(root, ...path.split("/"));
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function hashFile(root: string, path: string): string {
  return createHash("sha256").update(readFileSync(join(root, ...path.split("/")))).digest("hex");
}

function fixtureItemFacts(itemId: string): {
  cueCount: number;
  durationMs: number;
  lastCueEndMs: number;
  completeness: "complete" | "partial" | "unknown";
  expectedClass: "eligible_supported" | "expected_safe_rejection";
} {
  if (itemId === "YT-03") {
    return { cueCount: 108, durationMs: 478_293, lastCueEndMs: 478_293, completeness: "complete", expectedClass: "expected_safe_rejection" };
  }
  if (itemId === "YT-04") {
    return { cueCount: 8_974, durationMs: 12_077_589, lastCueEndMs: 11_971_826, completeness: "unknown", expectedClass: "expected_safe_rejection" };
  }
  if (itemId === "YT-05") {
    return { cueCount: 814, durationMs: 3_550_037, lastCueEndMs: 3_504_466, completeness: "partial", expectedClass: "expected_safe_rejection" };
  }
  if (itemId === "YT-06") {
    return { cueCount: 15, durationMs: 77_525, lastCueEndMs: 77_525, completeness: "complete", expectedClass: "expected_safe_rejection" };
  }
  return { cueCount: 10, durationMs: 60_000, lastCueEndMs: 59_000, completeness: "complete", expectedClass: "eligible_supported" };
}

function makeAttestation(itemId: string): Record<string, unknown> {
  const facts = fixtureItemFacts(itemId);
  return {
    schema_version: "1.2",
    item_id: itemId,
    youtube_video_id: "AAAAAAAAAAA",
    attested_at: "2026-07-14T00:00:00Z",
    content_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/evidence",
      rationale: "fixture rights rationale",
      review_required: true,
    },
    transcript_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/evidence",
      rationale: "fixture transcript rationale",
      review_required: true,
    },
    source: {
      owner: "NASA Goddard Space Flight Center",
      source_page_url: "https://svs.gsfc.nasa.gov/1/",
      sidecar_url: "https://example.invalid/input.vtt",
      sidecar_sha256: "2".repeat(64),
      private_relative_path: `inputs/test/${itemId}.vtt`,
    },
    input_contract: {
      format: "vtt",
      language_tag: "en-US",
      declared_duration_ms: facts.durationMs,
      expected_cue_count: facts.cueCount,
      last_cue_end_ms: facts.lastCueEndMs,
      content_completeness: {
        state: facts.completeness,
        basis: facts.completeness === "partial" ? "source_coverage_record" : facts.completeness === "unknown" ? "unknown" : "explicit_source_assertion",
        rationale: "fixture completeness rationale",
      },
      expected_class: facts.expectedClass,
    },
    retention_and_derivation: {
      full_text_private: true,
      publication: "hashes_and_derived_metrics_only",
      embeddings: "not_created",
      model_upload: "prohibited_in_protocol_v2",
      delete_by: "2026-10-14",
      evidence_url: "https://example.invalid/retention",
      rationale: "fixture retention rationale",
    },
    attribution: {
      credit: "NASA",
      no_endorsement: true,
      third_party_caveats: [],
    },
    version_equivalence: {
      state: "official_row_level_publication_association",
      evidence: "fixture row association",
      youtube_side_verified: false,
    },
    claims_boundary: [
      "input_preservation_only",
      "not_independent_wer_reference",
      "youtube_caption_state_unverified",
    ],
  };
}

function serializedAttestation(itemId: string): string {
  return `${JSON.stringify(makeAttestation(itemId), null, 2)}\n`;
}

function attestationHash(itemId: string): string {
  return createHash("sha256").update(serializedAttestation(itemId)).digest("hex");
}

function makeMatrix(): Record<string, unknown> {
  const eligible = new Set(["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"]);
  const structural = new Set(["YT-03", "YT-05", "YT-06"]);
  const items = Array.from({ length: 10 }, (_, index) => {
    const itemId = `YT-${String(index + 1).padStart(2, "0")}`;
    const a1CellState = eligible.has(itemId)
      ? "eligible_supported"
      : structural.has(itemId)
        ? "expected_structural_rejection"
        : itemId === "YT-04"
          ? "expected_supported_class_rejection"
          : "excluded_before_run_no_ingestible_sidecar";
    const referenceLedgerState = itemId === "YT-10"
      ? null
      : eligible.has(itemId)
        ? "ready"
        : structural.has(itemId)
          ? "expected_structural_rejection"
          : "expected_supported_class_rejection";
    return {
      item_id: itemId,
      rights_screened: true,
      authorized_ingestible_sidecar: eligible.has(itemId),
      independently_authorized_source_media: itemId === "YT-10",
      a1_cell_state: a1CellState,
      a2_cell_state: "excluded_before_run_no_editor_authorization",
      a3_cell_state: "excluded_before_run_gate_2_not_triggered",
      reference_ledger_state: referenceLedgerState,
    };
  });
  return {
    $schema: "https://brain.arunp.in/schemas/youtube-method-item-matrix-v1.1.json",
    schema_version: "1.1",
    authority: "prospective_primary_method_item_and_gate_authority",
    items,
    denominators: {
      a1_primary_positive_cells: 5,
      a1_expected_safe_rejection_cells: 4,
      a2_primary_cells: 0,
      a3_primary_positive_cells: 0,
      a3_expected_safe_rejection_cells: 0,
      rights_screened_real_items: 10,
    },
    gate_2_trigger: {
      rule: "no_authorized_ingestible_sidecar_and_independently_authorized_source_media",
      qualifying_item_ids: ["YT-10"],
      qualifying_item_count: 1,
      corpus_item_count: 10,
      qualifying_percentage_basis_points: 1000,
      minimum_qualifying_item_count: 2,
      minimum_qualifying_percentage_basis_points: 2000,
      count_threshold_met: false,
      percentage_threshold_met: false,
      triggered: false,
      claim_scope: "prospective_corpus_work_allocation_not_prevalence",
    },
    gate_states: {
      gate_1: "eligible",
      gate_2: "not_triggered",
      gate_3: "eligible_conditional",
      gate_4: "eligible_conditional",
      gate_5: "not_triggered",
      gate_6: "eligible",
    },
    conditional_gate_rules: {
      gate_3: "run_only_after_gate_1_passes",
      gate_4: "run_only_after_gates_1_and_3_pass_and_local_model_package_is_frozen",
      gate_5: "if_valid_gate_4_transcript_only_baseline_is_below_80_percent_due_solely_to_missing_visual_evidence_record_triggered_but_blocked_no_visual_method_or_media_sealed_no_post_result_addition",
    },
    conditional_artifacts: {
      gate_4_model_package_tree: "benchmark/model",
      gate_4_model_harness_tree: "spikes/model-harness",
    },
  };
}

function makeReferenceLedger(
  reviewStatus: "independent_prelock_review_complete" | "pending_independent_prelock_review" = "independent_prelock_review_complete",
): Record<string, unknown> {
  const eligible = new Set(["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"]);
  const structuralOrdinals: Record<string, number> = {
    "YT-03": 88,
    "YT-05": 723,
    "YT-06": 2,
  };
  const items = Array.from({ length: 9 }, (_, index) => {
    const itemId = `YT-${String(index + 1).padStart(2, "0")}`;
    const facts = fixtureItemFacts(itemId);
    const isEligible = eligible.has(itemId);
    const isStructural = itemId in structuralOrdinals;
    const state = isEligible
      ? "ready"
      : isStructural
        ? "expected_structural_rejection"
        : "expected_supported_class_rejection";
    return {
      item_id: itemId,
      reference_role: isEligible ? "a1_input_preservation_oracle" : "a1_safe_rejection_record",
      reference_independence: isEligible ? "not_independent_speech_reference" : "not_a_scoring_reference",
      attestation_sha256: attestationHash(itemId),
      source_raw_sha256: "2".repeat(64),
      source_canonical_sha256: isStructural ? null : "3".repeat(64),
      source_bytes: itemId === "YT-04" ? 511_823 : 100,
      source_token_count: isStructural ? null : itemId === "YT-04" ? 34_169 : 10,
      source_token_count_state: isStructural ? "not_scored_strict_preflight_rejection" : "counted",
      normalized_text_character_count: isStructural ? null : itemId === "YT-04" ? 189_847 : 50,
      cue_count: facts.cueCount,
      declared_duration_ms: facts.durationMs,
      last_cue_end_ms: facts.lastCueEndMs,
      distinct_timed_start_count: isStructural ? null : itemId === "YT-04" ? facts.cueCount : 10,
      base_anchor_target: Math.max(10, Math.ceil(facts.durationMs / 300_000)),
      actual_anchor_count: isEligible ? 10 : 0,
      preparation_document_sha256: isStructural ? null : "4".repeat(64),
      preparation_private_relative_path: isStructural ? null : `references/${itemId}.anchors.private.json`,
      preflight_state: isStructural ? "rejected" : "passed",
      preflight_error_code: isStructural ? "INVALID_STRUCTURE" : null,
      preflight_failure_cue_ordinal: isStructural ? structuralOrdinals[itemId] : null,
      content_completeness_state: facts.completeness,
      expected_class: facts.expectedClass,
      rights_review_state: "provisionally_allowed_for_private_benchmark_review_required",
      production_legal_policy_review_required: true,
      state,
    };
  });
  const complete = reviewStatus === "independent_prelock_review_complete";
  return {
    schema_version: "1.2",
    preparation_version: "1.2.0",
    preflight_version: "1.0.0",
    anchor_generator_version: "1.1.0",
    normalization_profile: "unicode-whitespace-v1",
    prepared_at: "2026-07-15T00:00:00Z",
    creation_procedure: "strict_preflight_then_deterministic_private_anchor_generation_no_candidate_output",
    independence_boundary: "eligible_a1_inputs_are_preservation_oracles_not_independent_speech_references",
    review: {
      status: reviewStatus,
      reviewer_role: "independent_adversarial_reviewer",
      reviewed_at: complete ? "2026-07-15T01:00:00Z" : null,
      review_artifact_path: complete ? "reviews/prelock-review.md" : null,
    },
    items,
  };
}

function makeLocalDerivationAuthorization(): Record<string, unknown> {
  const eligibleIds = ["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"];
  return {
    schema_version: "1.0",
    prepared_at: "2026-07-15T00:00:00Z",
    authorization_scope: {
      state: "provisional_local_benchmark_only_review_required",
      local_full_transcript_inference: "allowed_in_deny_network_sandbox",
      external_full_transcript_upload: "prohibited",
      evaluator_excerpt_transfer: "allowed_with_per_item_limits_and_blinding",
      publication: "hashes_metrics_and_public_safe_rubric_only",
      training: "prohibited",
      embeddings: "not_created",
      media_processing: "prohibited",
    },
    review_boundary: {
      legal_approval: false,
      production_approval: false,
      independent_prelock_review_required: true,
      human_stakeholder_review_required: true,
    },
    items: eligibleIds.map((itemId) => ({
      item_id: itemId,
      attestation_path: `benchmark/attestations/${itemId}.json`,
      attestation_sha256: attestationHash(itemId),
      source_raw_sha256: "2".repeat(64),
      official_source_page_url: "https://svs.gsfc.nasa.gov/1/",
      rights_evidence_url: "https://example.invalid/rights",
      source_owner: "NASA Goddard Space Flight Center",
      authorized_derivations: [
        "private_local_enrichment_output",
        "publication_safe_aggregate_metrics",
        "publication_safe_hashes",
        "bounded_blinded_evaluator_excerpts",
      ],
      evaluator_excerpt: {
        maximum_excerpts: 12,
        maximum_words_per_excerpt: 40,
        maximum_total_words: 240,
        maximum_unique_transcript_word_fraction: 0.35,
        selection: "claim_or_citation_evidence_windows_only",
        allowed_recipients: "two_blinded_ai_evaluators_and_threshold_adjudicator_only",
        prohibited_content: "complete_or_reconstructable_transcript",
        retention: "delete_with_private_benchmark_packet",
      },
      retention: {
        private_delete_by: "2026-10-14",
        public_artifacts: "hashes_metrics_rubric_and_decision_records_only",
        raw_model_output: "private_delete_by_deadline",
      },
      claims_boundary: [
        "not_legal_approval",
        "not_production_authorization",
        "not_training_authorization",
        "not_full_transcript_external_upload_authorization",
        "not_youtube_caption_equivalence_proof",
      ],
    })),
  };
}

function makeRuntimeLedger(
  ledgerVerifiedAt = "2026-07-15T00:01:00Z",
  lockedFilesHashedAt = "2026-07-15T00:00:00Z",
): Record<string, unknown> {
  return {
    schema_version: "1.0",
    candidate_id: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637",
    verification: {
      status: "verified",
      ledger_verified_at: ledgerVerifiedAt,
      locked_files_hashed_at: lockedFilesHashedAt,
    },
  };
}

function makePresealReadiness(): Record<string, unknown> {
  return {
    $schema: "https://brain.arunp.in/schemas/youtube-preseal-readiness-v1.json",
    schema_version: "1.0",
    authority: "commit_a_preseal_readiness_and_governance_boundary",
    status: "ready_for_commit_a",
    validated_at: "2026-07-15T00:30:00Z",
    validation: {
      benchmark_tool_tests_passed: 1,
      benchmark_tool_tests_total: 1,
      a1_harness_tests_passed: 1,
      a1_harness_tests_total: 1,
      model_harness_tests_passed: 1,
      model_harness_tests_total: 1,
      targeted_tests_passed: 3,
      targeted_tests_total: 3,
      typecheck_passed: true,
      targeted_lint_passed: true,
      strict_schema_validation_passed: true,
      markdown_links_passed: true,
      privacy_scan_passed: true,
      git_diff_check_passed: true,
    },
    independent_review: {
      artifact_path: "reviews/prelock-review.md",
      same_reviewer_required: true,
      required_closure_marker: "prelock_review_closure_complete",
    },
    prohibitions: {
      primary_outputs_present: false,
      lock_present_at_commit_a: false,
      request_counter_scope: "gate_1_through_gate_5_primary_execution_only_excludes_public_source_research_artifact_acquisition_and_repository_delivery_metadata",
      primary_benchmark_external_requests: 0,
      primary_benchmark_provider_calls: 0,
      model_inference_calls: 0,
      incremental_spend_usd: 0,
    },
    authority_boundary: {
      immutable_claim_authorities: [
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
      ],
      post_seal_mutable_status_documents: [
        "RUNNING_LOG.md",
        "docs/feature-council/youtube-transcript-enrichment/MASTER_EXECUTION_INDEX.md",
        "docs/feature-council/youtube-transcript-enrichment/TRACKER.md",
        "docs/feature-council/youtube-transcript-enrichment/DECISION_LOG.md",
        "docs/feature-council/youtube-transcript-enrichment/spikes/SPIKE_REGISTER.md",
        "docs/feature-council/youtube-transcript-enrichment/technical/RISK_REGISTER.md",
      ],
      mutable_document_policy: "result_status_evidence_links_and_append_only_history_only_no_redefinition_of_frozen_claims",
      conflict_rule: "verified_lock_and_frozen_machine_authorities_control_over_mutable_governance_status",
    },
  };
}

function createContentCommit(extraTrackedFiles: readonly string[] = []): {
  root: string;
  contentCommit: string;
} {
  const root = mkdtempSync(join(tmpdir(), "youtube-benchmark-lock-test-"));
  temporaryRepositories.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.name", "Publication Safe Test");
  git(root, "config", "user.email", "publication-safe@example.invalid");
  for (const path of [...REQUIRED_FILES, ...extraTrackedFiles]) {
    write(root, path, `frozen fixture: ${path}\n`);
  }
  for (const artifactPath of A1_MODEL_ARTIFACT_PATHS) {
    const basename = artifactPath.split("/").at(-1);
    assert.ok(basename);
    write(
      root,
      artifactPath,
      readFileSync(fileURLToPath(new URL(`../../model/${basename}`, import.meta.url)), "utf8"),
    );
  }
  for (let index = 1; index <= 9; index += 1) {
    const itemId = `YT-${String(index).padStart(2, "0")}`;
    write(root, `benchmark/attestations/${itemId}.json`, serializedAttestation(itemId));
  }
  write(root, "benchmark/METHOD_ITEM_MATRIX.json", `${JSON.stringify(makeMatrix(), null, 2)}\n`);
  write(root, "benchmark/REFERENCE_LEDGER.json", `${JSON.stringify(makeReferenceLedger(), null, 2)}\n`);
  write(
    root,
    "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
    `${JSON.stringify(makeLocalDerivationAuthorization(), null, 2)}\n`,
  );
  write(
    root,
    "benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
    `${JSON.stringify(makeRuntimeLedger(), null, 2)}\n`,
  );
  write(
    root,
    "benchmark/PRESEAL_READINESS.json",
    `${JSON.stringify(makePresealReadiness(), null, 2)}\n`,
  );
  write(
    root,
    "benchmark/BENCHMARK_PROTOCOL.md",
    [
      "# Test protocol",
      "",
      "**Protocol version:** 2.4",
      "",
      "- [x] Scorers, schemas, safety fixtures, reference ledger, write-once A1 operator, Gate 3 generator/verifier, exact-five packet/result/adjudication contracts, deterministic aggregate/Gate 5 calculator, evaluator execution contract/runner, local model package/harness, pre-seal readiness authority, candidate-tree inventory, and exact run plan complete and internally validated.",
      "- [x] Protocol and all lock inputs pass independent adversarial review.",
      "",
    ].join("\n"),
  );
  write(root, "benchmark/RUN_PLAN.md", "# Test run plan\n\n**Protocol:** 2.4\n");
  write(
    root,
    "reviews/prelock-review.md",
    "# Closed pre-lock review\n\n**Machine closure marker:** prelock_review_closure_complete\n",
  );
  write(root, TRACKER_PATH, "tracker baseline\n");
  write(root, "docs/feature-council/youtube-transcript-enrichment/DECISION_LOG.md", "decision baseline\n");
  write(root, "RUNNING_LOG.md", "running baseline\n");
  git(root, "add", ".");
  git(root, "commit", "-q", "-m", "Commit A: freeze benchmark content");
  return { root, contentCommit: git(root, "rev-parse", "HEAD") };
}

function makeLock(root: string, contentCommit: string): BenchmarkLock {
  return {
    schema_version: "1.4",
    protocol_version: "2.4",
    content_commit: contentCommit,
    seal_created_at: "2026-07-16T00:00:00Z",
    frozen_files: REQUIRED_FILES.map((path) => ({ path, sha256: hashFile(root, path) })),
    corpus: {
      rights_screened_real_items: 10,
      real_unavailable_private_controls: 0,
      source_sidecar_records: 9,
      a1_preservation_reference_items: 5,
      safe_rejection_records: 4,
      independent_speech_reference_items: 0,
    },
    denominators: {
      a1_primary_positive_cells: 5,
      a1_expected_safe_rejection_cells: 4,
      a2_primary_cells: 0,
      a3_primary_positive_cells: 0,
      a3_expected_safe_rejection_cells: 0,
      rights_screened_real_items: 10,
    },
    gate_states: {
      gate_1: "eligible",
      gate_2: "not_triggered",
      gate_3: "eligible_conditional",
      gate_4: "eligible_conditional",
      gate_5: "not_triggered",
      gate_6: "eligible",
    },
    runtime: getCurrentRuntimeRecord(),
    limits: {
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
    },
  };
}

function addSealCommit(root: string, lock: BenchmarkLock): string {
  write(root, LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
  git(root, "add", LOCK_PATH);
  git(root, "commit", "-q", "-m", "Commit B: seal benchmark");
  return git(root, "rev-parse", "HEAD");
}

function amendContentCommit(root: string, path: string, content: string): string {
  write(root, path, content);
  git(root, "add", path);
  git(root, "commit", "--amend", "-q", "--no-edit");
  return git(root, "rev-parse", "HEAD");
}

function replaceWithMalformedUtf8(bytes: Uint8Array, marker: string): Buffer {
  const result = Buffer.from(bytes);
  const markerIndex = result.indexOf(Buffer.from(marker, "utf8"));
  assert.notEqual(markerIndex, -1, `fixture marker must exist: ${marker}`);
  result[markerIndex] = 0xff;
  return result;
}

function amendContentCommitBytes(root: string, path: string, content: Uint8Array): string {
  const absolute = join(root, ...path.split("/"));
  writeFileSync(absolute, content);
  git(root, "add", path);
  git(root, "commit", "--amend", "-q", "--no-edit");
  return git(root, "rev-parse", "HEAD");
}

function expectCode(action: () => unknown, code: LockVerificationError["code"]): void {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof LockVerificationError);
    assert.equal(error.code, code);
    return true;
  });
}

describe("generateLockDraft", () => {
  it("deterministically derives schema 1.4 and protocol 2.4 from Commit A without reading primary outputs", () => {
    const { root, contentCommit } = createContentCommit();
    const options = {
      repoRoot: root,
      contentCommit,
      protocolVersion: "2.4",
      sealCreatedAt: "2026-07-16T00:00:00Z",
      lockPath: LOCK_PATH,
    } as const;

    const first = generateLockDraft(options);
    write(root, "benchmark/results/primary.private.json", "must not affect lock generation\n");
    const second = generateLockDraft(options);

    assert.deepEqual(second, first);
    assert.equal(existsSync(join(root, LOCK_PATH)), false);
    assert.equal(first.schema_version, "1.4");
    assert.equal(first.protocol_version, "2.4");
    assert.deepEqual(first.denominators, {
      a1_primary_positive_cells: 5,
      a1_expected_safe_rejection_cells: 4,
      a2_primary_cells: 0,
      a3_primary_positive_cells: 0,
      a3_expected_safe_rejection_cells: 0,
      rights_screened_real_items: 10,
    });
    assert.deepEqual(first.gate_states, {
      gate_1: "eligible",
      gate_2: "not_triggered",
      gate_3: "eligible_conditional",
      gate_4: "eligible_conditional",
      gate_5: "not_triggered",
      gate_6: "eligible",
    });
    assert.deepEqual(first.frozen_files.map(({ path }) => path), REQUIRED_FILES);
  });

  it("refuses to generate a draft when LOCK.json already exists in Commit A", () => {
    const { root } = createContentCommit();
    write(root, LOCK_PATH, "{}\n");
    git(root, "add", LOCK_PATH);
    git(root, "commit", "--amend", "-q", "--no-edit");
    const contentCommit = git(root, "rev-parse", "HEAD");

    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "LOCK_EXISTED_IN_CONTENT_COMMIT",
    );
  });

  it("rejects a caller protocol version that disagrees with frozen protocol 2.4", () => {
    const { root, contentCommit } = createContentCommit();
    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.5",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_SCHEMA",
    );
  });

  it("rejects malformed UTF-8 in the Commit-A matrix Git blob before schema validation", () => {
    const { root } = createContentCommit();
    const matrixPath = "benchmark/METHOD_ITEM_MATRIX.json";
    const malformedMatrix = replaceWithMalformedUtf8(
      readFileSync(join(root, matrixPath)),
      "prospective_primary_method_item_and_gate_authority",
    );
    const contentCommit = amendContentCommitBytes(root, matrixPath, malformedMatrix);

    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_JSON",
    );
  });

  it("rejects malformed UTF-8 in a generic frozen machine-authority Git blob", () => {
    const { root } = createContentCommit();
    const readinessPath = "benchmark/PRESEAL_READINESS.json";
    const malformedReadiness = replaceWithMalformedUtf8(
      readFileSync(join(root, readinessPath)),
      "ready_for_commit_a",
    );
    const contentCommit = amendContentCommitBytes(root, readinessPath, malformedReadiness);

    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_JSON",
    );
  });

  for (const artifactPath of A1_MODEL_ARTIFACT_PATHS) {
    it(`rejects Commit-A identity drift in mandatory A1 artifact ${artifactPath}`, () => {
      const { root } = createContentCommit();
      const original = readFileSync(join(root, ...artifactPath.split("/")), "utf8");
      const contentCommit = amendContentCommit(root, artifactPath, `${original}\n`);
      expectCode(
        () => generateLockDraft({
          repoRoot: root,
          contentCommit,
          protocolVersion: "2.4",
          sealCreatedAt: "2026-07-16T00:00:00Z",
          lockPath: LOCK_PATH,
        }),
        "INVALID_SCHEMA",
      );
    });
  }

  it("rejects a Commit-A run plan whose protocol version disagrees with the protocol", () => {
    const { root } = createContentCommit();
    const contentCommit = amendContentCommit(root, "benchmark/RUN_PLAN.md", "# Test run plan\n\n**Protocol:** 2.5\n");
    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_SCHEMA",
    );
  });

  it("rejects a runtime ledger whose verification predates locked-file hashing", () => {
    const { root } = createContentCommit();
    const contentCommit = amendContentCommit(
      root,
      "benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
      `${JSON.stringify(
        makeRuntimeLedger("2026-07-15T00:00:00Z", "2026-07-15T00:00:01Z"),
        null,
        2,
      )}\n`,
    );
    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_SCHEMA",
    );
  });

  it("rejects an incomplete machine-readable pre-seal readiness state", () => {
    const { root } = createContentCommit();
    const readiness = makePresealReadiness();
    readiness.status = "remediation_in_progress";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/PRESEAL_READINESS.json",
      `${JSON.stringify(readiness, null, 2)}\n`,
    );
    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_SCHEMA",
    );
  });

  it("rejects self-asserted targeted-test totals that do not derive from the three suites", () => {
    const { root } = createContentCommit();
    const readiness = makePresealReadiness() as { validation: Record<string, unknown> };
    readiness.validation.targeted_tests_passed = 999;
    readiness.validation.targeted_tests_total = 999;
    const contentCommit = amendContentCommit(
      root,
      "benchmark/PRESEAL_READINESS.json",
      `${JSON.stringify(readiness, null, 2)}\n`,
    );
    expectCode(
      () => generateLockDraft({
        repoRoot: root,
        contentCommit,
        protocolVersion: "2.4",
        sealCreatedAt: "2026-07-16T00:00:00Z",
        lockPath: LOCK_PATH,
      }),
      "INVALID_SCHEMA",
    );
  });
});

describe("verifyLock", () => {
  it("records the exact active Node and installed tsx runtime", () => {
    const tsxPackage = requireFromTest("tsx/package.json") as { version: string };
    assert.deepEqual(getCurrentRuntimeRecord(), {
      node_version: process.versions.node,
      v8_version: process.versions.v8,
      unicode_version: process.versions.unicode,
      icu_version: process.versions.icu,
      tsx_version: tsxPackage.version,
      platform: process.platform,
      arch: process.arch,
    });
  });

  it("verifies a direct two-commit seal and every frozen byte", () => {
    const { root, contentCommit } = createContentCommit();
    const sealCommit = addSealCommit(root, makeLock(root, contentCommit));

    const report = verifyLock({ repoRoot: root, lockPath: LOCK_PATH });

    assert.equal(report.valid, true);
    assert.equal(report.contentCommit, contentCommit);
    assert.equal(report.sealCommit, sealCommit);
    assert.equal(report.verifiedFrozenFileCount, REQUIRED_FILES.length);
  });

  it("rejects malformed UTF-8 in the working-tree LOCK before replacement decoding", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    const lockAbsolute = join(root, LOCK_PATH);
    writeFileSync(
      lockAbsolute,
      replaceWithMalformedUtf8(readFileSync(lockAbsolute), '"1.4"'),
    );

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_JSON");
  });

  it("rejects a pending reference-ledger review before Commit B can seal", () => {
    const { root } = createContentCommit();
    const contentCommit = amendContentCommit(
      root,
      "benchmark/REFERENCE_LEDGER.json",
      `${JSON.stringify(makeReferenceLedger("pending_independent_prelock_review"), null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a completed ledger review without the same-reviewer machine closure marker", () => {
    const { root } = createContentCommit();
    const contentCommit = amendContentCommit(
      root,
      "reviews/prelock-review.md",
      "# Review without closure\n",
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects primary decision evidence already present in Commit A", () => {
    const primaryPath = "decisions/GATE_3_RESULT.json";
    const { root } = createContentCommit([primaryPath]);
    const contentCommit = git(root, "rev-parse", "HEAD");
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a matrix with a mismatched item identity", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as { items: Array<Record<string, unknown>> };
    matrix.items[8].item_id = "YT-10";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a reference-ledger item state that disagrees with the matrix", () => {
    const { root } = createContentCommit();
    const ledger = makeReferenceLedger() as { items: Array<Record<string, unknown>> };
    ledger.items[0].state = "expected_structural_rejection";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/REFERENCE_LEDGER.json",
      `${JSON.stringify(ledger, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a Commit-A attestation blob whose bytes do not match the ledger hash", () => {
    const { root } = createContentCommit();
    const attestation = makeAttestation("YT-01") as { attribution: Record<string, unknown> };
    attestation.attribution.credit = "changed fixture credit";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/attestations/YT-01.json",
      `${JSON.stringify(attestation, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects an attestation input contract that disagrees with the reference ledger", () => {
    const { root } = createContentCommit();
    const attestation = makeAttestation("YT-01") as { input_contract: Record<string, unknown> };
    attestation.input_contract.declared_duration_ms = 59_999;
    const attestationText = `${JSON.stringify(attestation, null, 2)}\n`;
    write(root, "benchmark/attestations/YT-01.json", attestationText);
    const nextAttestationHash = createHash("sha256").update(attestationText).digest("hex");
    const ledger = makeReferenceLedger() as { items: Array<Record<string, unknown>> };
    ledger.items[0].attestation_sha256 = nextAttestationHash;
    write(root, "benchmark/REFERENCE_LEDGER.json", `${JSON.stringify(ledger, null, 2)}\n`);
    const authorization = makeLocalDerivationAuthorization() as { items: Array<Record<string, unknown>> };
    authorization.items[0].attestation_sha256 = nextAttestationHash;
    write(
      root,
      "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
      `${JSON.stringify(authorization, null, 2)}\n`,
    );
    git(
      root,
      "add",
      "benchmark/attestations/YT-01.json",
      "benchmark/REFERENCE_LEDGER.json",
      "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
    );
    git(root, "commit", "--amend", "-q", "--no-edit");
    const contentCommit = git(root, "rev-parse", "HEAD");
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects eligible authorization hashes that disagree with the reference ledger", () => {
    const { root } = createContentCommit();
    const authorization = makeLocalDerivationAuthorization() as { items: Array<Record<string, unknown>> };
    authorization.items[0].source_raw_sha256 = "5".repeat(64);
    const contentCommit = amendContentCommit(
      root,
      "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
      `${JSON.stringify(authorization, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects an eligible authorization source contract that disagrees with its attestation", () => {
    const { root } = createContentCommit();
    const authorization = makeLocalDerivationAuthorization() as { items: Array<Record<string, unknown>> };
    authorization.items[0].official_source_page_url = "https://svs.gsfc.nasa.gov/2/";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
      `${JSON.stringify(authorization, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a matrix gate that disagrees with the prospective gate authority", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as { gate_states: Record<string, unknown> };
    matrix.gate_states.gate_4 = "not_triggered";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a Gate 2 authorization boolean that differs from the frozen corpus worksheet", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as { items: Array<Record<string, unknown>> };
    matrix.items[9].independently_authorized_source_media = false;
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a Gate 2 trigger summary that does not derive from the per-item booleans", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as { gate_2_trigger: Record<string, unknown> };
    matrix.gate_2_trigger.qualifying_item_ids = [];
    matrix.gate_2_trigger.qualifying_item_count = 0;
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a matrix that weakens a conditional gate rule", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as { conditional_gate_rules: Record<string, unknown> };
    matrix.conditional_gate_rules.gate_5 = "run_unconditionally";
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  it("rejects a matrix that changes the exact ten-item rights-screened total", () => {
    const { root } = createContentCommit();
    const matrix = makeMatrix() as {
      items: Array<Record<string, unknown>>;
      denominators: Record<string, unknown>;
    };
    matrix.items.pop();
    matrix.denominators.rights_screened_real_items = 9;
    const contentCommit = amendContentCommit(
      root,
      "benchmark/METHOD_ITEM_MATRIX.json",
      `${JSON.stringify(matrix, null, 2)}\n`,
    );
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
  });

  for (const authorityPath of [
    "benchmark/METHOD_ITEM_MATRIX.json",
    "benchmark/REFERENCE_LEDGER.json",
    "benchmark/PRESEAL_READINESS.json",
    "benchmark/BENCHMARK_PROTOCOL.md",
    "benchmark/RUN_PLAN.md",
    "benchmark/model/LOCAL_DERIVATION_AUTHORIZATION.json",
    "benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
    "benchmark/model/EVALUATOR_EXECUTION_CONTRACT.json",
  ]) {
    it(`rejects a post-seal worktree tamper of ${authorityPath}`, () => {
      const { root, contentCommit } = createContentCommit();
      addSealCommit(root, makeLock(root, contentCommit));
      write(root, authorityPath, `${readFileSync(join(root, authorityPath), "utf8")} `);

      expectCode(
        () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
        "FROZEN_WORKTREE_MISMATCH",
      );
    });
  }

  it("rejects a frozen working-tree modification", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    write(root, REQUIRED_FILES[0], "tampered after seal\n");

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_WORKTREE_MISMATCH",
    );
  });

  it("rejects an uncommitted lock modification", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    write(
      root,
      LOCK_PATH,
      `${JSON.stringify({ ...makeLock(root, contentCommit), seal_created_at: "2026-07-16T00:00:01Z" })}\n`,
    );

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "LOCK_UNCOMMITTED");
  });

  it("rejects an intervening commit between Commit A and Commit B", () => {
    const { root, contentCommit } = createContentCommit();
    write(root, "allowed-log.md", "intervening commit\n");
    git(root, "add", "allowed-log.md");
    git(root, "commit", "-q", "-m", "intervening commit");
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "SEAL_PARENT_MISMATCH");
  });

  it("rejects even a strictly append-only tracker update in Commit B", () => {
    const { root, contentCommit } = createContentCommit();
    write(root, TRACKER_PATH, "tracker baseline\nseal appended line\n");
    git(root, "add", TRACKER_PATH);
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "SEAL_CHANGESET_INVALID",
    );
  });

  it("rejects any Commit B file outside the lock", () => {
    const { root, contentCommit } = createContentCommit();
    write(root, "benchmark/results.json", "{}\n");
    git(root, "add", "benchmark/results.json");
    addSealCommit(root, makeLock(root, contentCommit));

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "SEAL_CHANGESET_INVALID",
    );
  });

  it("rejects a later committed lock edit", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    const changed = {
      ...makeLock(root, contentCommit),
      seal_created_at: "2026-07-16T00:00:01Z",
    };
    write(root, LOCK_PATH, `${JSON.stringify(changed, null, 2)}\n`);
    git(root, "add", LOCK_PATH);
    git(root, "commit", "-q", "-m", "invalid lock mutation");

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "LOCK_HISTORY_INVALID");
  });

  it("rejects a frozen file changed and later restored after Commit A", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    const original = readFileSync(join(root, ...REQUIRED_FILES[0].split("/")), "utf8");
    write(root, REQUIRED_FILES[0], "temporary mutation\n");
    git(root, "add", REQUIRED_FILES[0]);
    git(root, "commit", "-q", "-m", "invalid frozen mutation");
    write(root, REQUIRED_FILES[0], original);
    git(root, "add", REQUIRED_FILES[0]);
    git(root, "commit", "-q", "-m", "restore bytes");

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_HISTORY_MUTATION",
    );
  });

  it("rejects a frozen hash that does not match Commit A", () => {
    const { root, contentCommit } = createContentCommit();
    const lock = makeLock(root, contentCommit);
    lock.frozen_files[0] = { ...lock.frozen_files[0], sha256: "0".repeat(64) };
    addSealCommit(root, lock);

    expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "FROZEN_HASH_MISMATCH");
  });

  for (const omittedPath of [
    "benchmark/additional-protocol-input.md",
    "audit/additional-audit.md",
    "research/additional-research.md",
    "reviews/additional-review.md",
    "spikes/a1-harness/additional-harness-module.ts",
    "spikes/model-harness/additional-model-harness-module.ts",
    "src/additional-production.ts",
  ]) {
    it(`rejects omission of tracked Commit-A file ${omittedPath}`, () => {
      const { root, contentCommit } = createContentCommit([omittedPath]);
      addSealCommit(root, makeLock(root, contentCommit));

      expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
    });
  }

  for (const omittedPath of [
    "SOURCE_INVENTORY.md",
    "benchmark/METHOD_ITEM_MATRIX.json",
    "benchmark/METHOD_ITEM_MATRIX.schema.json",
    "benchmark/REFERENCE_LEDGER.json",
    "benchmark/REFERENCE_LEDGER.schema.json",
    "benchmark/RUN_PLAN.md",
    "benchmark/model/MODEL_PACKAGE.json",
    ...A1_MODEL_ARTIFACT_PATHS,
    "spikes/model-harness/runner.ts",
    "research/2026-07-16_model-screening-stop-record.md",
    "research/MODEL_COMPARISON.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    ...REQUIRED_PRODUCTION_MODULES,
  ]) {
    it(`rejects omission of explicitly required file ${omittedPath}`, () => {
      const { root, contentCommit } = createContentCommit();
      const lock = makeLock(root, contentCommit);
      lock.frozen_files = lock.frozen_files.filter((record) => record.path !== omittedPath);
      addSealCommit(root, lock);

      expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "INVALID_SCHEMA");
    });
  }

  it("rejects a later committed source change", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    write(root, "src/other-production.ts", "changed after Commit A\n");
    git(root, "add", "src/other-production.ts");
    git(root, "commit", "-q", "-m", "prohibited source change");

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_HISTORY_MUTATION",
    );
  });

  it("rejects a later committed source deletion", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    rmSync(join(root, "src/other-production.ts"));
    git(root, "add", "src/other-production.ts");
    git(root, "commit", "-q", "-m", "prohibited source deletion");

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_HISTORY_MUTATION",
    );
  });

  for (const addedPath of [
    "src/later-source.ts",
    "benchmark/model/later-model-artifact.json",
    "benchmark/tools/later-tool.ts",
    "spikes/a1-harness/later-harness.ts",
    "spikes/model-harness/later-model-harness.ts",
  ]) {
    it(`rejects later committed protected addition ${addedPath}`, () => {
      const { root, contentCommit } = createContentCommit();
      addSealCommit(root, makeLock(root, contentCommit));
      write(root, addedPath, "added after Commit A\n");
      git(root, "add", addedPath);
      git(root, "commit", "-q", "-m", "prohibited protected addition");

      expectCode(
        () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
        "FROZEN_HISTORY_MUTATION",
      );
    });
  }

  it("rejects an untracked protected worktree addition", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    write(root, "src/untracked-source.ts", "untracked after Commit A\n");

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_WORKTREE_MISMATCH",
    );
  });

  it("rejects a protected worktree deletion", () => {
    const { root, contentCommit } = createContentCommit();
    addSealCommit(root, makeLock(root, contentCommit));
    rmSync(join(root, "src/other-production.ts"));

    expectCode(
      () => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }),
      "FROZEN_WORKTREE_MISMATCH",
    );
  });

  for (const runtimeKey of [
    "node_version",
    "v8_version",
    "unicode_version",
    "icu_version",
    "tsx_version",
    "platform",
    "arch",
  ] as const) {
    it(`rejects a sealed ${runtimeKey} runtime mismatch`, () => {
      const { root, contentCommit } = createContentCommit();
      const lock = makeLock(root, contentCommit);
      const mismatchedRuntime = {
        ...lock.runtime,
        [runtimeKey]: `${lock.runtime[runtimeKey]}-mismatch`,
      } as unknown as BenchmarkLock["runtime"];
      lock.runtime = mismatchedRuntime;
      addSealCommit(root, lock);

      expectCode(() => verifyLock({ repoRoot: root, lockPath: LOCK_PATH }), "RUNTIME_MISMATCH");
    });
  }
});

describe("Commit-A authority parsing", () => {
  it("rejects duplicate keys in the machine-readable method-item matrix", () => {
    expectCode(
      () => parseMethodItemMatrixJson('{"schema_version":"1.0","schema_version":"1.0"}'),
      "DUPLICATE_JSON_KEY",
    );
  });

  it("rejects duplicate keys in the private-reference ledger", () => {
    expectCode(
      () => parseReferenceLedgerJson('{"schema_version":"1.2","schema_version":"1.2"}'),
      "DUPLICATE_JSON_KEY",
    );
  });

  for (const [label, mutate] of [
    ["a non-frozen preflight version", (ledger: Record<string, unknown>) => { ledger.preflight_version = "1.0.1"; }],
    ["a non-frozen anchor-generator version", (ledger: Record<string, unknown>) => { ledger.anchor_generator_version = "1.1.1"; }],
    ["the overbroad legacy independence boundary", (ledger: Record<string, unknown>) => { ledger.independence_boundary = "a1_inputs_are_preservation_oracles_not_independent_speech_references"; }],
    ["a missing eligible canonical hash", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].source_canonical_sha256 = null; }],
    ["an out-of-bounds source byte count", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].source_bytes = 0; }],
    ["a last cue after the declared duration", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].last_cue_end_ms = 60_001; }],
    ["a non-derived base anchor target", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].base_anchor_target = 11; }],
    ["a non-derived eligible actual anchor count", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].actual_anchor_count = 9; }],
    ["a cross-item preparation path", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[0].preparation_private_relative_path = "references/YT-02.anchors.private.json"; }],
    ["a structural rejection with a timed-start count", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[2].distinct_timed_start_count = 0; }],
    ["a structural failure ordinal after the final cue", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[2].preflight_failure_cue_ordinal = 109; }],
    ["YT-04 inside the eligible cue limit", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[3].cue_count = 7_200; }],
    ["YT-04 mislabeled as complete", (ledger: Record<string, unknown>) => { (ledger.items as Array<Record<string, unknown>>)[3].content_completeness_state = "complete"; }],
  ] as Array<[string, (ledger: Record<string, unknown>) => void]>) {
    it(`rejects ${label}`, () => {
      const ledger = structuredClone(makeReferenceLedger());
      mutate(ledger);
      expectCode(() => parseReferenceLedgerJson(JSON.stringify(ledger)), "INVALID_SCHEMA");
    });
  }
});

describe("parseLockJson", () => {
  it("rejects duplicate-key and malformed-UTF8 JSON bytes before decoding can normalize them", () => {
    expectCode(
      () => parseJsonBytesWithoutDuplicateKeys(Buffer.from('{"value":1,"value":2}', "utf8")),
      "DUPLICATE_JSON_KEY",
    );
    expectCode(
      () => parseJsonBytesWithoutDuplicateKeys(Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d])),
      "INVALID_JSON",
    );
  });

  it("rejects duplicate JSON keys before JSON.parse can overwrite them", () => {
    expectCode(
      () => parseLockJson('{"schema_version":"1.4","schema_version":"1.4"}'),
      "DUPLICATE_JSON_KEY",
    );
  });

  it("rejects extra root properties", () => {
    const { root, contentCommit } = createContentCommit();
    const value = { ...makeLock(root, contentCommit), unexpected: true };
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_SCHEMA");
  });

  it("requires protocol version 2.4", () => {
    const { root, contentCommit } = createContentCommit();
    const value = makeLock(root, contentCommit) as unknown as Record<string, unknown>;
    value.protocol_version = "2.5";
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_SCHEMA");
  });

  it("rejects unsafe frozen paths", () => {
    const { root, contentCommit } = createContentCommit();
    const value = makeLock(root, contentCommit);
    value.frozen_files[0] = { path: "../escape", sha256: "0".repeat(64) };
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_PATH");
  });

  it("rejects control characters in frozen paths", () => {
    const { root, contentCommit } = createContentCommit();
    const value = makeLock(root, contentCommit);
    value.frozen_files[0] = { path: "src/unsafe\npath.ts", sha256: "0".repeat(64) };
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_PATH");
  });

  it("rejects an unsorted frozen manifest", () => {
    const { root, contentCommit } = createContentCommit();
    const value = makeLock(root, contentCommit);
    [value.frozen_files[0], value.frozen_files[1]] = [
      value.frozen_files[1],
      value.frozen_files[0],
    ];
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_SCHEMA");
  });

  it("rejects a calendar-invalid RFC 3339 seal timestamp", () => {
    const { root, contentCommit } = createContentCommit();
    const value = makeLock(root, contentCommit);
    value.seal_created_at = "2026-02-30T00:00:00Z";
    expectCode(() => parseLockJson(JSON.stringify(value)), "INVALID_SCHEMA");
  });

  it("requires the exact six denominator keys", () => {
    const { root, contentCommit } = createContentCommit();
    const missing = makeLock(root, contentCommit) as unknown as {
      denominators: Record<string, unknown>;
    };
    delete missing.denominators.a2_primary_cells;
    expectCode(() => parseLockJson(JSON.stringify(missing)), "INVALID_SCHEMA");

    const extra = makeLock(root, contentCommit) as unknown as {
      denominators: Record<string, unknown>;
    };
    extra.denominators.post_hoc_cell = 1;
    expectCode(() => parseLockJson(JSON.stringify(extra)), "INVALID_SCHEMA");
  });

  it("requires exactly Gate 1 through Gate 6", () => {
    const { root, contentCommit } = createContentCommit();
    const missing = makeLock(root, contentCommit) as unknown as {
      gate_states: Record<string, unknown>;
    };
    delete missing.gate_states.gate_3;
    expectCode(() => parseLockJson(JSON.stringify(missing)), "INVALID_SCHEMA");

    const extra = makeLock(root, contentCommit) as unknown as {
      gate_states: Record<string, unknown>;
    };
    extra.gate_states.gate_7 = "eligible";
    expectCode(() => parseLockJson(JSON.stringify(extra)), "INVALID_SCHEMA");
  });

  it("rejects obsolete 8/1 and 6/3 A1 denominator splits", () => {
    const { root, contentCommit } = createContentCommit();
    for (const [eligible, rejected] of [[8, 1], [6, 3]] as const) {
      const stale = makeLock(root, contentCommit) as unknown as {
        denominators: Record<string, unknown>;
      };
      stale.denominators.a1_primary_positive_cells = eligible;
      stale.denominators.a1_expected_safe_rejection_cells = rejected;
      expectCode(() => parseLockJson(JSON.stringify(stale)), "INVALID_SCHEMA");
    }
  });

  it("requires the exact 5/4/0/0/0/10 denominator and corpus authority", () => {
    const { root, contentCommit } = createContentCommit();
    const wrongTotal = makeLock(root, contentCommit) as unknown as {
      corpus: Record<string, unknown>;
      denominators: Record<string, unknown>;
    };
    wrongTotal.corpus.rights_screened_real_items = 9;
    wrongTotal.denominators.rights_screened_real_items = 9;
    expectCode(() => parseLockJson(JSON.stringify(wrongTotal)), "INVALID_SCHEMA");

    const a2Run = makeLock(root, contentCommit) as unknown as {
      denominators: Record<string, unknown>;
    };
    a2Run.denominators.a2_primary_cells = 1;
    expectCode(() => parseLockJson(JSON.stringify(a2Run)), "INVALID_SCHEMA");

    const a3Run = makeLock(root, contentCommit) as unknown as {
      denominators: Record<string, unknown>;
    };
    a3Run.denominators.a3_primary_positive_cells = 1;
    expectCode(() => parseLockJson(JSON.stringify(a3Run)), "INVALID_SCHEMA");
  });

  it("requires the exact prospective Gate 1 through Gate 6 states", () => {
    const { root, contentCommit } = createContentCommit();
    const wrongGate = makeLock(root, contentCommit) as unknown as {
      gate_states: Record<string, unknown>;
    };
    wrongGate.gate_states.gate_4 = "blocked_not_run";
    expectCode(() => parseLockJson(JSON.stringify(wrongGate)), "INVALID_SCHEMA");
  });

  it("requires an exact, non-empty runtime record", () => {
    const { root, contentCommit } = createContentCommit();
    const missingLock = makeLock(root, contentCommit);
    missingLock.runtime = { ...missingLock.runtime };
    const missing = missingLock as unknown as {
      runtime: Record<string, unknown>;
    };
    delete missing.runtime.tsx_version;
    expectCode(() => parseLockJson(JSON.stringify(missing)), "INVALID_SCHEMA");

    const empty = makeLock(root, contentCommit);
    empty.runtime = { ...empty.runtime, icu_version: "" };
    expectCode(() => parseLockJson(JSON.stringify(empty)), "INVALID_SCHEMA");
  });
});
