import assert from "node:assert/strict";
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
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import Ajv2020 from "ajv/dist/2020";

import {
  CANONICAL_GATE4_ITEM_IDS,
  buildAdjudicationPacket,
  canonicalJsonSha256,
  generateBlindedPackets,
  type BlindedPacketBundle,
  type EvaluatorRole,
  type GenerateBlindedPacketsInput,
} from "../blinded-evaluation";
import {
  EVALUATION_CLAIMS_BOUNDARY,
  EVALUATION_ROLE_TIMEOUT_MS,
  Gate4EvaluationClaimError,
  authoritativeEvaluationClaimPath,
  authoritativeEvaluationTerminalPath,
  readAuthoritativeAttemptClaim,
  readAuthoritativeAttemptTerminal,
  writePackageAttemptClaim,
  writePackageAttemptTerminal,
  type PackageAttemptClaim,
} from "../gate4-evaluation-claims";
import {
  LocalBlindedEvaluatorError,
  runLocalBlindedEvaluator,
  verifyPinnedEvaluatorRuntime,
  type RunLocalBlindedEvaluatorOptions,
} from "../local-blinded-evaluator";

const MODEL_DIRECTORY = fileURLToPath(new URL("../../model/", import.meta.url));
const SOURCE_PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../../../../../../", import.meta.url)));
const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readModel(name: string): string {
  return readFileSync(path.join(MODEL_DIRECTORY, name), "utf8");
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function syntheticInput(packageAttemptClaimSha256 = "e".repeat(64)): GenerateBlindedPacketsInput {
  const items = CANONICAL_GATE4_ITEM_IDS.map((itemId, itemIndex) => {
    const segments = Array.from({ length: 20 }, (_, index) => ({
      index,
      start_ms: index * 1_000,
      end_ms: (index + 1) * 1_000,
      source_start_ms: index * 1_000,
      source_end_ms: (index + 1) * 1_000,
      text: `Synthetic item ${itemIndex + 1} segment ${index + 1} contains bounded grounded evaluator fixture words only`,
      source_cue_ids: [`DEV-${index}`],
    }));
    const normalized = {
      schema_version: "1.0",
      item_id: itemId,
      youtube_video_id: `DEV0000000${itemIndex}`.slice(-11),
      source_method: "A1",
      language: "en-US",
      caption_type: "source_provided_unknown_authorship",
      timestamp_mode: "timestamped",
      completeness: { state: "complete", basis: "source_coverage_record", source_duration_ms: 20_000, last_cue_end_ms: 20_000, trailing_gap_ms: 0 },
      provenance: {
        source_page_url: `https://example.invalid/${itemId}`,
        source_asset_url: `https://example.invalid/${itemId}.vtt`,
        input_sha256: hash(`source-${itemId}`),
        reference_role: "input_preservation",
        version_equivalence: "official_row_level_publication_association",
        acquired_at: "2026-07-18T08:00:00Z",
      },
      processing_version: "DEV-1.0",
      segments,
      errors: [],
    };
    const normalizedBytes = `${JSON.stringify(normalized, null, 2)}\n`;
    const inputSha256 = hash(normalizedBytes);
    const segmentId = `${itemId}:S000000`;
    const output = {
      schema_version: "1.0",
      item_id: itemId,
      input_sha256: inputSha256,
      language_tag: "en-US",
      transcript_status: "complete",
      summary: `Synthetic generated summary ${itemIndex + 1}.`,
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
      gate_4_attempt_claim_sha256: hash(`attempt-claim-${itemId}`),
      gate_4_public_report_sha256: hash(`public-report-${itemId}`),
      gate_4_run_id: `${itemId}-20260718T140000Z-${hash(itemId).slice(0, 12)}`,
    };
  });
  return {
    content_commit: "a".repeat(40),
    seal_commit: "b".repeat(40),
    benchmark_lock_sha256: "c".repeat(64),
    package_attempt_claim_sha256: packageAttemptClaimSha256,
    packet_generated_at: "2026-07-18T14:00:00Z",
    execution_contract: JSON.parse(readModel("EVALUATOR_EXECUTION_CONTRACT.json")),
    runtime_ledger_json: readModel("LOCAL_MODEL_RUNTIME_LEDGER.json"),
    sandbox_profile_text: readFileSync(path.join(SOURCE_PROJECT_ROOT, PROJECT_RELATIVE_ROOT, "spikes/model-harness/deny-network.sb"), "utf8"),
    role_system_prompts: {
      evaluator_a: readModel("EVALUATOR_A_SYSTEM_PROMPT.txt"),
      evaluator_b: readModel("EVALUATOR_B_SYSTEM_PROMPT.txt"),
      adjudicator: readModel("ADJUDICATOR_SYSTEM_PROMPT.txt"),
    },
    role_generation_schemas: {
      evaluator_a: readModel("BLINDED_EVALUATION_GENERATION.schema.json"),
      evaluator_b: readModel("BLINDED_EVALUATION_GENERATION.schema.json"),
      adjudicator: readModel("BLINDED_ADJUDICATION_GENERATION.schema.json"),
    },
    authorization: JSON.parse(readModel("LOCAL_DERIVATION_AUTHORIZATION.json")),
    rubric: JSON.parse(readModel("KEY_POINT_RUBRIC.json")),
    consent: { state: "affirmative", attestation_id: "CONSENT-DEV-RUNNER-001", recorded_at: "2026-07-18T13:00:00Z", withdrawn: false, bounded_excerpt_transfer_authorized: true },
    execution_readiness: {
      pinned_runtime_verified: true, pinned_model_verified: true, role_prompt_hashes_verified: true, deny_network_sandbox_available: true,
      fresh_process_isolation_available: true, packet_only_file_binding_available: true, local_private_storage_available: true,
      external_content_transfer: false, result_attestation_verification_available: true, incremental_spend_usd: 0,
    },
    items,
  };
}

function decisions(bundle: BlindedPacketBundle, role: EvaluatorRole): unknown {
  return {
    schema_version: "1.0",
    items: bundle.packets[role].packet.items.map((item) => ({
      blinded_item_id: item.blinded_item_id,
      packet_item_sha256: item.packet_item_sha256,
      claim_scores: item.claims.map((claim) => ({ claim_id: claim.claim_id, support: "fully_supported", evidence_excerpt_ids: claim.evidence_excerpt_ids, rationale: "The approved bounded excerpt supports this claim." })),
      citation_scores: item.claims.map((claim) => ({ citation_id: claim.citation_id, assessment: "correct", evidence_excerpt_ids: claim.evidence_excerpt_ids, rationale: "The approved bounded excerpt supports this citation." })),
      key_point_scores: item.rubric_points.map((point) => ({
        rubric_point_id: point.rubric_point_id,
        kind: point.kind,
        covered: point.kind === "text_groundable",
        cause: point.kind === "text_groundable" ? "supported_by_transcript_and_output" : "essential_visual_evidence_absent",
        evidence_excerpt_ids: point.kind === "text_groundable" ? [item.excerpts[0].excerpt_id] : [],
        rationale: point.kind === "text_groundable" ? "The output covers the text point." : "Essential visual evidence is absent.",
      })),
      critical_hallucinations: [], schema_or_reference_issues: [], confidence: "high",
    })),
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
}

function disputedDecisions(bundle: BlindedPacketBundle): unknown {
  const value = structuredClone(decisions(bundle, "evaluator_b")) as {
    items: Array<{ claim_scores: Array<{ support: string; rationale: string }> }>;
  };
  value.items[0].claim_scores[0].support = "partially_supported";
  value.items[0].claim_scores[0].rationale = "The approved excerpt supports only part of this bounded synthetic claim.";
  return value;
}

function adjudicatorDecisions(adjudication: ReturnType<typeof buildAdjudicationPacket>): unknown {
  assert.equal(adjudication.state, "required");
  assert.ok(adjudication.packet);
  return {
    schema_version: "1.0",
    items: adjudication.packet.items.map((item) => ({
      blinded_item_id: item.blinded_item_id,
      decisions: item.disputes.map((dispute) => ({
        dispute_id: dispute.dispute_id,
        selected_option: "evaluator_a",
        rationale: "The original evaluator A option is selected from the bounded dispute packet.",
      })),
    })),
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
}

function duplicateTopLevelJsonKey(value: unknown): Buffer {
  const serialized = JSON.stringify(value);
  assert.ok(serialized.startsWith("{"));
  return Buffer.from(`{"schema_version":"1.0",${serialized.slice(1)}`, "utf8");
}

function malformedUtf8InsideRationale(value: unknown): Buffer {
  const serialized = Buffer.from(JSON.stringify(value), "utf8");
  const marker = Buffer.from('"rationale":"', "utf8");
  const markerIndex = serialized.indexOf(marker);
  assert.ok(markerIndex >= 0, "synthetic decisions must contain a rationale string");
  const insertion = markerIndex + marker.byteLength;
  return Buffer.concat([
    serialized.subarray(0, insertion),
    Buffer.from([0xff]),
    serialized.subarray(insertion),
  ]);
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, jsonBytes(value), { mode: 0o600, flag: "wx" });
}

async function createDevProject(base: string): Promise<string> {
  const projectRoot = path.join(base, "project");
  const modelRoot = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "benchmark/model");
  const sandboxRoot = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "spikes/model-harness");
  const decisionsRoot = path.join(projectRoot, PROJECT_RELATIVE_ROOT, "decisions");
  await Promise.all([
    mkdir(modelRoot, { recursive: true, mode: 0o755 }),
    mkdir(sandboxRoot, { recursive: true, mode: 0o755 }),
    mkdir(decisionsRoot, { recursive: true, mode: 0o755 }),
  ]);
  const files = [
    "EVALUATOR_EXECUTION_CONTRACT.json",
    "LOCAL_MODEL_RUNTIME_LEDGER.json",
    "EVALUATOR_A_SYSTEM_PROMPT.txt",
    "EVALUATOR_B_SYSTEM_PROMPT.txt",
    "ADJUDICATOR_SYSTEM_PROMPT.txt",
    "BLINDED_EVALUATION_GENERATION.schema.json",
    "BLINDED_ADJUDICATION_GENERATION.schema.json",
    "BLINDED_EVALUATION.schema.json",
    "BLINDED_ADJUDICATION.schema.json",
    "LOCAL_EVALUATOR_RUN_REPORT.schema.json",
  ];
  await Promise.all(files.map((name) => copyFile(path.join(MODEL_DIRECTORY, name), path.join(modelRoot, name))));
  await copyFile(
    path.join(SOURCE_PROJECT_ROOT, PROJECT_RELATIVE_ROOT, "spikes/model-harness/deny-network.sb"),
    path.join(sandboxRoot, "deny-network.sb"),
  );
  return realpath(projectRoot);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

async function fakeExecutable(base: string): Promise<{ executable: string; marker: string; output: string; pause: string; ready: string }> {
  const executable = path.join(base, "fake-llama-cli");
  const marker = path.join(base, "invocations.txt");
  const output = path.join(base, "fake-output.json");
  const pause = path.join(base, "pause-before-output");
  const ready = path.join(base, "child-ready");
  const script = `#!/bin/sh\n/bin/echo RUN >> ${shellQuote(marker)}\nif [ -f ${shellQuote(pause)} ]; then /usr/bin/touch ${shellQuote(ready)}; while [ -f ${shellQuote(pause)} ]; do /bin/sleep 1; done; fi\n/bin/cat ${shellQuote(output)}\n`;
  await writeFile(executable, script, { mode: 0o700, flag: "wx" });
  await chmod(executable, 0o700);
  return { executable, marker, output, pause, ready };
}

function makePackageClaim(input: GenerateBlindedPacketsInput, llamaCliSha256: string): PackageAttemptClaim {
  const contract = input.execution_contract as { role_invocations: Array<Record<string, string>> };
  const strict = Object.fromEntries(contract.role_invocations.map((entry) => [entry.role, entry.strict_postparse_schema_sha256])) as PackageAttemptClaim["strict_postparse_schema_sha256"];
  return {
    schema_version: "1.0",
    claim_type: "canonical_blinded_packet_package_attempt",
    operator_version: "1.0.0",
    execution_class: "DEV_TEST",
    publication_eligible: false,
    content_commit: input.content_commit,
    seal_commit: input.seal_commit,
    benchmark_lock_sha256: input.benchmark_lock_sha256,
    claimed_at: input.packet_generated_at,
    timeout_ms_per_role: EVALUATION_ROLE_TIMEOUT_MS,
    retry_policy: "one_package_attempt_and_one_process_per_role_no_retry",
    gate_3_result_sha256: input.items[0].gate_3_result_sha256,
    execution_contract_sha256: canonicalJsonSha256(input.execution_contract),
    runtime_ledger_sha256: hash(input.runtime_ledger_json),
    llama_cli_sha256: llamaCliSha256,
    model_sha256: "d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785",
    sandbox_profile_sha256: hash(input.sandbox_profile_text),
    role_system_prompt_sha256: {
      evaluator_a: hash(input.role_system_prompts.evaluator_a),
      evaluator_b: hash(input.role_system_prompts.evaluator_b),
      adjudicator: hash(input.role_system_prompts.adjudicator),
    },
    role_generation_schema_sha256: {
      evaluator_a: hash(input.role_generation_schemas.evaluator_a),
      evaluator_b: hash(input.role_generation_schemas.evaluator_b),
      adjudicator: hash(input.role_generation_schemas.adjudicator),
    },
    strict_postparse_schema_sha256: strict,
    consent_attestation_sha256: canonicalJsonSha256(input.consent),
    execution_readiness_sha256: canonicalJsonSha256(input.execution_readiness),
    sources: input.items.map((item) => ({
      item_id: item.item_id,
      gate_3_result_sha256: item.gate_3_result_sha256,
      gate_4_attempt_claim_sha256: item.gate_4_attempt_claim_sha256,
      gate_4_public_report_sha256: item.gate_4_public_report_sha256,
      normalized_input_sha256: hash(item.normalized_transcript_bytes),
      enrichment_output_sha256: hash(item.enrichment_output_bytes),
      gate_4_run_id: item.gate_4_run_id,
    })),
    package_location_policy: "private_evidence_root_outputs_seal_gate4_evaluation_package",
    external_provider_calls: 0,
    external_content_transfer: false,
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
}

interface PackageFixture {
  bundle: BlindedPacketBundle;
  projectRoot: string;
  packageRoots: [string, string];
  evidenceRoots: [string, string];
  executable: string;
  marker: string;
  output: string;
  pause: string;
  ready: string;
}

async function packageFixture(base: string, role: EvaluatorRole, invalidOutput = false): Promise<PackageFixture> {
  const projectRoot = await createDevProject(base);
  const fake = await fakeExecutable(base);
  const input = syntheticInput();
  const packageClaim = await writePackageAttemptClaim(projectRoot, makePackageClaim(input, hash(await readFile(fake.executable))));
  input.package_attempt_claim_sha256 = packageClaim.sha256;
  const bundle = generateBlindedPackets(input);
  await writeFile(fake.output, JSON.stringify(invalidOutput ? { invalid: true } : decisions(bundle, role)), { mode: 0o600, flag: "wx" });

  const packageA = path.join(base, "package-a");
  const packageB = path.join(base, "package-b");
  const evidenceA = path.join(base, "private-evidence-a");
  const evidenceB = path.join(base, "private-evidence-b");
  await Promise.all([
    mkdir(packageA, { mode: 0o700 }),
    mkdir(evidenceA, { mode: 0o700 }),
    mkdir(evidenceB, { mode: 0o700 }),
  ]);
  const receipt = {
    schema_version: "1.0",
    operator_version: "1.0.0",
    state: "written_exclusively",
    content_commit: bundle.content_commit,
    seal_commit: bundle.seal_commit,
    benchmark_lock_sha256: bundle.benchmark_lock_sha256,
    public_package_attempt_claim_sha256: packageClaim.sha256,
    packet_generated_at: bundle.packet_generated_at,
    consent_attestation_sha256: bundle.consent_attestation_sha256,
    execution_readiness_sha256: bundle.execution_readiness_sha256,
    bundle_sha256: canonicalJsonSha256(bundle),
    packet_sha256: { evaluator_a: bundle.packets.evaluator_a.packet_sha256, evaluator_b: bundle.packets.evaluator_b.packet_sha256 },
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
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  };
  await Promise.all([
    writeJson(path.join(packageA, "evaluator-a.packet.json"), bundle.packets.evaluator_a.packet),
    writeJson(path.join(packageA, "evaluator-b.packet.json"), bundle.packets.evaluator_b.packet),
    writeJson(path.join(packageA, "consent-attestation.json"), input.consent),
    writeJson(path.join(packageA, "execution-readiness.json"), input.execution_readiness),
    writeJson(path.join(packageA, "coordinator.bundle.json"), bundle),
    writeJson(path.join(packageA, "generation-receipt.json"), receipt),
  ]);
  await writePackageAttemptTerminal(projectRoot, {
    schema_version: "1.0",
    terminal_type: "canonical_blinded_packet_package_terminal",
    operator_version: "1.0.0",
    execution_class: "DEV_TEST",
    publication_eligible: false,
    content_commit: bundle.content_commit,
    seal_commit: bundle.seal_commit,
    public_package_attempt_claim_sha256: packageClaim.sha256,
    state: "succeeded",
    completed_at: "2026-07-18T14:00:01Z",
    bundle_sha256: canonicalJsonSha256(bundle),
    bundle_file_sha256: hash(jsonBytes(bundle)),
    package_receipt_sha256: hash(jsonBytes(receipt)),
    failure_code: null,
    external_provider_calls: 0,
    external_content_transfer: false,
    claims_boundary: EVALUATION_CLAIMS_BOUNDARY,
  });
  await cp(packageA, packageB, { recursive: true, preserveTimestamps: true });
  await chmod(packageB, 0o700);
  return {
    bundle,
    projectRoot,
    packageRoots: [packageA, packageB],
    evidenceRoots: [evidenceA, evidenceB],
    executable: fake.executable,
    marker: fake.marker,
    output: fake.output,
    pause: fake.pause,
    ready: fake.ready,
  };
}

function clock(start = "2026-07-18T17:00:00Z"): () => Date {
  let value = Date.parse(start);
  return () => { const result = new Date(value); value += 1_000; return result; };
}

function optionsFor(
  fixture: PackageFixture,
  index: 0 | 1,
  role: RunLocalBlindedEvaluatorOptions["role"],
  now = clock(),
): RunLocalBlindedEvaluatorOptions {
  return {
    executionClass: "DEV_TEST",
    projectRoot: fixture.projectRoot,
    privateEvidenceRoot: fixture.evidenceRoots[index],
    role,
    runtimeDir: path.dirname(fixture.executable),
    modelPath: path.join(path.dirname(fixture.executable), "unused-model.gguf"),
    devExecutablePath: fixture.executable,
    devPacketPackageDirectory: fixture.packageRoots[index],
    now,
  };
}

async function completeDisputedEvaluatorPair(fixture: PackageFixture): Promise<ReturnType<typeof buildAdjudicationPacket>> {
  await writeFile(fixture.output, JSON.stringify(decisions(fixture.bundle, "evaluator_a")), { mode: 0o600 });
  const evaluatorA = await runLocalBlindedEvaluator(optionsFor(fixture, 0, "evaluator_a", clock("2026-07-18T17:00:00Z")));
  assert.ok(evaluatorA.result && evaluatorA.report.state === "succeeded");
  await writeFile(fixture.output, JSON.stringify(disputedDecisions(fixture.bundle)), { mode: 0o600 });
  const evaluatorB = await runLocalBlindedEvaluator(optionsFor(fixture, 0, "evaluator_b", clock("2026-07-18T18:00:00Z")));
  assert.ok(evaluatorB.result && evaluatorB.report.state === "succeeded");
  const adjudication = buildAdjudicationPacket(fixture.bundle, evaluatorA.result, evaluatorB.result);
  assert.equal(adjudication.state, "required");
  return adjudication;
}

async function assertNoAdjudicatorArtifacts(fixture: PackageFixture): Promise<void> {
  const paths = [
    authoritativeEvaluationClaimPath(fixture.projectRoot, fixture.bundle.seal_commit, "adjudicator"),
    authoritativeEvaluationTerminalPath(fixture.projectRoot, fixture.bundle.seal_commit, "adjudicator"),
    path.join(fixture.packageRoots[0], "adjudicator.packet.json"),
    path.join(fixture.packageRoots[0], "role-results", "adjudicator"),
  ];
  for (const candidate of paths) assert.equal(await lstat(candidate).catch(() => null), null, `${candidate} must remain absent`);
  const invocations = (await readFile(fixture.marker, "utf8")).trim().split("\n").filter(Boolean);
  assert.equal(invocations.length, 2, "only evaluator A and evaluator B children may have started");
}

async function waitForPath(filePath: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!await lstat(filePath).catch(() => null)) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path.basename(filePath)}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("two copied private roots racing for the authoritative package claim permit exactly one package attempt", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-package-claim-cross-root-"));
  const projectRoot = await createDevProject(base);
  const [privateA, privateB] = [path.join(base, "private-a"), path.join(base, "private-b")];
  await Promise.all([mkdir(privateA, { mode: 0o700 }), mkdir(privateB, { mode: 0o700 })]);
  const executable = await fakeExecutable(base);
  const input = syntheticInput();
  const claim = makePackageClaim(input, hash(await readFile(executable.executable)));
  const settled = await Promise.allSettled([
    stat(privateA).then(() => writePackageAttemptClaim(projectRoot, claim)),
    stat(privateB).then(() => writePackageAttemptClaim(projectRoot, claim)),
  ]);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  const fulfilled = settled.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof writePackageAttemptClaim>>> => result.status === "fulfilled");
  assert.ok(fulfilled);
  const rejected = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.ok(rejected?.reason instanceof Gate4EvaluationClaimError && rejected.reason.code === "ATTEMPT_ALREADY_CLAIMED");
  const claimText = await readFile(authoritativeEvaluationClaimPath(projectRoot, input.seal_commit, "package"), "utf8");
  assert.equal(claimText.includes(privateA) || claimText.includes(privateB), false);
  const validateClaim = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json")));
  assert.equal(validateClaim(fulfilled.value.value), true, JSON.stringify(validateClaim.errors));
  assert.equal(validateClaim({ ...fulfilled.value.value, publication_eligible: true }), false, "DEV_TEST claim must be explicitly non-publication-eligible");
});

test("trusted wrapper succeeds once and a copied package cannot perform a sequential role rerun", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-sequential-copy-"));
  const fixture = await packageFixture(base, "evaluator_a");
  const first = await runLocalBlindedEvaluator(optionsFor(fixture, 0, "evaluator_a"));
  assert.equal(first.report.state, "succeeded", JSON.stringify(first.report));
  assert.equal(first.report.publication_eligible, false);
  assert.equal(first.report.process.timeout_ms, EVALUATION_ROLE_TIMEOUT_MS);
  const validateReport = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("LOCAL_EVALUATOR_RUN_REPORT.schema.json")));
  assert.equal(validateReport(first.report), true, JSON.stringify(validateReport.errors));
  assert.ok(first.result && "execution_attestation" in first.result);
  assert.equal("execution_attestation" in (decisions(fixture.bundle, "evaluator_a") as Record<string, unknown>), false);
  assert.equal((await stat(fixture.packageRoots[0])).mode & 0o777, 0o700);
  assert.equal((await stat(first.resultDirectory)).mode & 0o777, 0o700);

  await assert.rejects(runLocalBlindedEvaluator(optionsFor(fixture, 1, "evaluator_a")), (error: unknown) =>
    error instanceof LocalBlindedEvaluatorError && error.code === "ROLE_ALREADY_CLAIMED");
  assert.equal((await readFile(fixture.marker, "utf8")).trim().split("\n").length, 1);
  const publicClaim = await readFile(authoritativeEvaluationClaimPath(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_a"), "utf8");
  assert.equal(publicClaim.includes(base), false);
  assert.equal(publicClaim.includes("rationale"), false);
  const publicClaimRecord = await readAuthoritativeAttemptClaim(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_a");
  const packageTerminalRecord = await readAuthoritativeAttemptTerminal(fixture.projectRoot, fixture.bundle.seal_commit, "package");
  const publicTerminalRecord = await readAuthoritativeAttemptTerminal(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_a");
  const validateClaim = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("GATE4_EVALUATION_ATTEMPT_CLAIM.schema.json")));
  const validateTerminal = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("GATE4_EVALUATION_TERMINAL.schema.json")));
  assert.equal(validateClaim(publicClaimRecord.value), true, JSON.stringify(validateClaim.errors));
  assert.equal(validateTerminal(packageTerminalRecord.value), true, JSON.stringify(validateTerminal.errors));
  assert.equal(validateTerminal(publicTerminalRecord.value), true, JSON.stringify(validateTerminal.errors));
  assert.equal((packageTerminalRecord.value as { publication_eligible: boolean }).publication_eligible, false);
  assert.equal((publicClaimRecord.value as { publication_eligible: boolean }).publication_eligible, false);
  const terminalProcess = (publicTerminalRecord.value as { process: Record<string, unknown>; publication_eligible: boolean }).process;
  assert.equal((publicTerminalRecord.value as { publication_eligible: boolean }).publication_eligible, false);
  assert.equal(terminalProcess.stdout_bytes, first.report.process.stdout_bytes);
  assert.equal(terminalProcess.stdout_retained_bytes, first.report.process.stdout_retained_bytes);
  assert.equal(terminalProcess.stderr_bytes, first.report.process.stderr_bytes);
  assert.equal(terminalProcess.stderr_retained_bytes, first.report.process.stderr_retained_bytes);
});

test("an all-true packet posture cannot substitute for missing runtime or model artifacts", async () => {
  const ledger = JSON.parse(readModel("LOCAL_MODEL_RUNTIME_LEDGER.json"));
  await assert.rejects(
    verifyPinnedEvaluatorRuntime("/definitely/missing/runtime", "/definitely/missing/model.gguf", ledger),
    (error: unknown) => error instanceof LocalBlindedEvaluatorError && error.code === "PATH_INVALID",
  );
});

test("two copied packages in distinct private roots permit one and only one fresh role child", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-concurrent-copy-"));
  const fixture = await packageFixture(base, "evaluator_b");
  const settled = await Promise.allSettled([
    runLocalBlindedEvaluator(optionsFor(fixture, 0, "evaluator_b")),
    runLocalBlindedEvaluator(optionsFor(fixture, 1, "evaluator_b")),
  ]);
  assert.equal(settled.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = settled.find((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.ok(rejected?.reason instanceof LocalBlindedEvaluatorError && rejected.reason.code === "ROLE_ALREADY_CLAIMED");
  assert.equal((await readFile(fixture.marker, "utf8")).trim().split("\n").length, 1);
});

test("a post-claim model-output failure writes a publication-safe terminal record and remains non-rerunnable", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-terminal-failure-"));
  const fixture = await packageFixture(base, "evaluator_a", true);
  const first = await runLocalBlindedEvaluator(optionsFor(fixture, 0, "evaluator_a"));
  assert.equal(first.report.state, "failed");
  assert.equal(first.report.failure_code, "MODEL_DECISIONS_INVALID");
  const terminal = await readAuthoritativeAttemptTerminal(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_a");
  assert.equal((terminal.value as { state: string }).state, "failed");
  const validateTerminal = new Ajv2020({ strict: true }).compile(JSON.parse(readModel("GATE4_EVALUATION_TERMINAL.schema.json")));
  assert.equal(validateTerminal(terminal.value), true, JSON.stringify(validateTerminal.errors));
  const terminalText = terminal.bytes.toString("utf8");
  assert.equal(terminalText.includes(base), false);
  assert.equal(terminalText.includes("rationale"), false);
  await assert.rejects(runLocalBlindedEvaluator(optionsFor(fixture, 1, "evaluator_a")), (error: unknown) =>
    error instanceof LocalBlindedEvaluatorError && error.code === "ROLE_ALREADY_CLAIMED");
  assert.equal((await readFile(fixture.marker, "utf8")).trim().split("\n").length, 1);
});

test("every evaluator role rejects duplicate-key and malformed-UTF8 model decisions", async (t) => {
  for (const encodingCase of ["duplicate_key", "malformed_utf8"] as const) {
    for (const role of ["evaluator_a", "evaluator_b", "adjudicator"] as const) {
      await t.test(`${role} ${encodingCase}`, async (child) => {
        const base = await mkdtemp(path.join(tmpdir(), `yt-local-evaluator-${role}-${encodingCase}-`));
        child.after(() => rm(base, { recursive: true, force: true }));
        const fixture = await packageFixture(base, role === "adjudicator" ? "evaluator_a" : role);
        let rawDecisions: unknown;
        if (role === "adjudicator") {
          const adjudication = await completeDisputedEvaluatorPair(fixture);
          rawDecisions = adjudicatorDecisions(adjudication);
        } else {
          rawDecisions = decisions(fixture.bundle, role);
        }
        const rawBytes = encodingCase === "duplicate_key"
          ? duplicateTopLevelJsonKey(rawDecisions)
          : malformedUtf8InsideRationale(rawDecisions);
        await writeFile(fixture.output, rawBytes, { mode: 0o600 });

        const result = await runLocalBlindedEvaluator(optionsFor(
          fixture,
          0,
          role,
          clock(role === "adjudicator" ? "2026-07-18T19:00:00Z" : "2026-07-18T17:00:00Z"),
        ));
        assert.equal(result.report.state, "failed");
        assert.equal(result.report.failure_code, "MODEL_DECISIONS_INVALID");
        assert.equal(result.result, null);
        assert.equal(
          await lstat(path.join(result.resultDirectory, "generation-decisions.json")).catch(() => null),
          null,
          "untrusted decisions must not be preserved as parsed JSON",
        );
        const terminal = await readAuthoritativeAttemptTerminal(
          fixture.projectRoot,
          fixture.bundle.seal_commit,
          role,
        );
        assert.equal((terminal.value as { state: string }).state, "failed");
      });
    }
  }
});

test("adjudication is derived only from two exact successful evaluator evidence chains", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-adjudication-chain-"));
  const fixture = await packageFixture(base, "evaluator_a");
  const adjudication = await completeDisputedEvaluatorPair(fixture);
  await writeFile(fixture.output, JSON.stringify(adjudicatorDecisions(adjudication)), { mode: 0o600 });
  const result = await runLocalBlindedEvaluator(optionsFor(fixture, 0, "adjudicator", clock("2026-07-18T19:00:00Z")));
  assert.equal(result.report.state, "succeeded", JSON.stringify(result.report));
  assert.ok(result.result && result.result.role === "adjudicator");
  assert.equal((await stat(path.join(fixture.packageRoots[0], "adjudicator.packet.json"))).mode & 0o777, 0o600);
  assert.equal((await readFile(fixture.marker, "utf8")).trim().split("\n").length, 3);
});

test("missing, failed, mismatched, nonterminal, or permission-invalid evaluator evidence creates zero adjudicator artifacts", async (t) => {
  async function expectPreclaimRejection(
    label: string,
    mutate: (fixture: PackageFixture) => Promise<void>,
  ): Promise<void> {
    const base = await mkdtemp(path.join(tmpdir(), `yt-local-evaluator-${label}-`));
    const fixture = await packageFixture(base, "evaluator_a");
    const adjudication = await completeDisputedEvaluatorPair(fixture);
    await writeFile(fixture.output, JSON.stringify(adjudicatorDecisions(adjudication)), { mode: 0o600 });
    await mutate(fixture);
    await assert.rejects(
      runLocalBlindedEvaluator(optionsFor(fixture, 0, "adjudicator", clock("2026-07-18T19:00:00Z"))),
      LocalBlindedEvaluatorError,
    );
    await assertNoAdjudicatorArtifacts(fixture);
  }

  await t.test("missing private result", async () => expectPreclaimRejection("missing-result", async (fixture) => {
    await rm(path.join(fixture.packageRoots[0], "role-results/evaluator_b/result.json"));
  }));
  await t.test("failed public terminal", async () => expectPreclaimRejection("failed-terminal", async (fixture) => {
    const terminalPath = authoritativeEvaluationTerminalPath(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_b");
    const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
    terminal.state = "failed";
    terminal.result_sha256 = null;
    terminal.failure_code = "MODEL_DECISIONS_INVALID";
    await writeFile(terminalPath, jsonBytes(terminal), { mode: 0o644 });
  }));
  await t.test("mismatched private result", async () => expectPreclaimRejection("mismatched-result", async (fixture) => {
    const resultPath = path.join(fixture.packageRoots[0], "role-results/evaluator_a/result.json");
    const result = JSON.parse(await readFile(resultPath, "utf8"));
    result.items[0].claim_scores[0].rationale = "Changed after the terminal binding was written.";
    await writeFile(resultPath, jsonBytes(result), { mode: 0o600 });
  }));
  await t.test("public claim without terminal", async () => expectPreclaimRejection("nonterminal", async (fixture) => {
    await rm(authoritativeEvaluationTerminalPath(fixture.projectRoot, fixture.bundle.seal_commit, "evaluator_a"));
  }));
  await t.test("permissive private evidence mode", async () => expectPreclaimRejection("permission", async (fixture) => {
    await chmod(path.join(fixture.packageRoots[0], "role-results/evaluator_a/result.json"), 0o644);
  }));
  await t.test("adjudicator claim predates an evaluator terminal", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-early-adjudicator-"));
    const fixture = await packageFixture(base, "evaluator_a");
    const adjudication = await completeDisputedEvaluatorPair(fixture);
    await writeFile(fixture.output, JSON.stringify(adjudicatorDecisions(adjudication)), { mode: 0o600 });
    await assert.rejects(
      runLocalBlindedEvaluator(optionsFor(fixture, 0, "adjudicator", clock("2026-07-18T17:30:00Z"))),
      (error: unknown) => error instanceof LocalBlindedEvaluatorError && error.code === "PACKET_PACKAGE_INVALID",
    );
    await assertNoAdjudicatorArtifacts(fixture);
  });
});

test("adjudicator post-execution verification rejects an evaluator chain changed during the child", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "yt-local-evaluator-post-chain-change-"));
  const fixture = await packageFixture(base, "evaluator_a");
  const adjudication = await completeDisputedEvaluatorPair(fixture);
  await writeFile(fixture.output, JSON.stringify(adjudicatorDecisions(adjudication)), { mode: 0o600 });
  await writeFile(fixture.pause, "pause\n", { mode: 0o600, flag: "wx" });
  const run = runLocalBlindedEvaluator(optionsFor(fixture, 0, "adjudicator", clock("2026-07-18T19:00:00Z")));
  await waitForPath(fixture.ready);
  const resultPath = path.join(fixture.packageRoots[0], "role-results/evaluator_a/result.json");
  const evaluatorResult = JSON.parse(await readFile(resultPath, "utf8"));
  evaluatorResult.items[0].claim_scores[0].rationale = "Changed while the adjudicator child was isolated.";
  await writeFile(resultPath, jsonBytes(evaluatorResult), { mode: 0o600 });
  await rm(fixture.pause);
  const result = await run;
  assert.equal(result.report.state, "failed");
  assert.equal(result.report.failure_code, "BOUND_INPUT_CHANGED_DURING_EXECUTION");
  assert.equal((await readFile(fixture.marker, "utf8")).trim().split("\n").length, 3);
});
