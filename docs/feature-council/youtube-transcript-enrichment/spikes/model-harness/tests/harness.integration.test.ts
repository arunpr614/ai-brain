import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, link, lstat, mkdir, mkdtemp, readFile, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { HarnessError, runLocalModelHarness, type HarnessOptions } from "../harness";
import { DEV_GATE3_BINDING, installGate3DevFixture } from "./gate3-dev-fixture";

const CRASH_WORKER_PATH = fileURLToPath(new URL("./harness-crash-worker.ts", import.meta.url));

type FakeBehavior = "valid" | "format-retry" | "duplicate-json-keys" | "invalid-utf8" | "semantic-invalid" | "overflow" | "mutate-evidence";

const runtimeFiles = [
  ["LICENSE", "license", "0600"],
  ["llama-cli", "executable", "0700"],
  ["libllama-cli-impl.dylib", "runtime_library", "0700"],
  ["libllama-common.0.0.9637.dylib", "runtime_library", "0700"],
  ["libllama.0.0.9637.dylib", "runtime_library", "0700"],
  ["libggml.0.15.1.dylib", "runtime_library", "0700"],
  ["libggml-base.0.15.1.dylib", "runtime_library", "0700"],
  ["libggml-cpu.0.15.1.dylib", "runtime_library", "0700"],
  ["libggml-metal.0.15.1.dylib", "runtime_library", "0700"],
  ["libggml-blas.0.15.1.dylib", "runtime_library", "0700"],
  ["libggml-rpc.0.15.1.dylib", "runtime_library", "0700"],
] as const;

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function put(filePath: string, content: string, mode = 0o600): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, content, { mode });
  await chmod(filePath, mode);
}

function fakeExecutable(behavior: FakeBehavior, evidenceMutationPath: string): string {
  const semanticStart = behavior === "semantic-invalid" ? 1_001 : 1_000;
  if (evidenceMutationPath.includes("'")) throw new Error("unsafe synthetic mutation path");
  return `#!/bin/sh
prompt=""
printf '%s\n' BEGIN "$@" >> "$HOME/invocations.txt"
/usr/bin/env | /usr/bin/sort > "$HOME/environment.txt"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--file" ]; then prompt="$2"; shift 2; else shift; fi
done
if [ "${behavior}" = "overflow" ]; then
  /bin/dd if=/dev/zero bs=1048576 count=5 2>/dev/null
  exit 0
fi
if [ "${behavior}" = "format-retry" ] && ! /usr/bin/grep -q "FORMAT-ONLY RETRY" "$prompt"; then
  printf '%s\n' 'not-json'
  exit 0
fi
if [ "${behavior}" = "mutate-evidence" ]; then
  printf ' ' >> '${evidenceMutationPath}'
fi
duplicate_summary=""
if [ "${behavior}" = "duplicate-json-keys" ]; then
  duplicate_summary='"summary":"Duplicate last-write-wins summary.",'
fi
invalid_utf8=""
if [ "${behavior}" = "invalid-utf8" ]; then
  invalid_utf8='\\377'
fi
input_hash=$(/usr/bin/sed -n 's/^INPUT_SHA256=//p' "$prompt")
printf '{"schema_version":"1.0","item_id":"YT-01","input_sha256":"%s","language_tag":"en-US","transcript_status":"complete","summary":"Synthetic%b summary.",%s"material_claims":[{"claim_id":"C001","claim":"Synthetic grounded claim.","evidence_segment_ids":["YT-01:S000000"],"evidence_start_ms":${semanticStart},"evidence_end_ms":1500}],"chapters":[{"chapter_id":"H001","title":"Synthetic chapter","summary":"Synthetic chapter summary.","start_segment_id":"YT-01:S000000","end_segment_id":"YT-01:S000000","start_ms":1000,"end_ms":1500}],"key_points":[{"key_point_id":"K001","point":"Synthetic grounded point.","evidence_segment_ids":["YT-01:S000000"],"evidence_start_ms":1000,"evidence_end_ms":1500}],"concepts":[{"concept_id":"N001","label":"Synthetic concept","explanation":"Synthetic explanation.","evidence_segment_ids":["YT-01:S000000"]}],"action_items":[],"search_terms":["synthetic"],"user_tags":[],"ai_categories":["test"],"limitations":["Transcript-only synthetic test."]}\n' "$input_hash" "$invalid_utf8" "$duplicate_summary"
`;
}

async function fixture(behavior: FakeBehavior, blocked = false): Promise<{ options: HarnessOptions; base: string; privateDir: string }> {
  const base = await mkdtemp(path.join(tmpdir(), "gate4-model-harness-"));
  const project = path.join(base, "project");
  const privateDir = path.join(base, "private");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  const runtimeDir = path.join(base, "runtime");
  const modelPath = path.join(base, "model.gguf");
  await mkdir(project, { recursive: true, mode: 0o700 });
  await mkdir(runtimeDir, { mode: 0o700 });
  await put(modelPath, "DEV-MODEL", 0o600);

  const modelRoot = path.join(project, "docs/feature-council/youtube-transcript-enrichment/benchmark/model");
  const systemPromptPath = path.join(modelRoot, "SYSTEM_PROMPT.txt");
  const repairPromptPath = path.join(modelRoot, "FORMAT_REPAIR_PROMPT.txt");
  const outputSchemaPath = path.join(modelRoot, "ENRICHMENT_OUTPUT.schema.json");
  const rubricPath = path.join(modelRoot, "KEY_POINT_RUBRIC.json");
  const authorizationPath = path.join(modelRoot, "LOCAL_DERIVATION_AUTHORIZATION.json");
  const ledgerPath = path.join(modelRoot, "LOCAL_MODEL_RUNTIME_LEDGER.json");
  const sandboxPath = path.join(project, "docs/feature-council/youtube-transcript-enrichment/spikes/model-harness/deny-network.sb");
  const gate3Fixture = await installGate3DevFixture(project, privateEvidenceRoot);
  const { attestationPath, normalizedPath } = gate3Fixture;
  await put(systemPromptPath, "DEV SYSTEM PROMPT\n");
  await put(repairPromptPath, "FORMAT-ONLY RETRY\n");
  await put(outputSchemaPath, "{}\n");
  await put(rubricPath, "{}\n");
  const sandboxContent = `(version 1)
(allow default)
(deny network*)
(deny file-read* (subpath "/Users"))
(deny file-write* (subpath "/Users"))
(allow file-read* (subpath (param "RUNTIME_DIR")))
(allow file-read* (literal (param "MODEL_PATH")))
(allow file-read* (literal (param "OUTPUT_SCHEMA_PATH")))
(allow file-read* (literal (param "SYSTEM_PROMPT_PATH")))
(allow file-read* (literal (param "PROMPT_PATH")))
(allow file-read* file-write* (subpath (param "RUN_DIR")))
`;
  await put(sandboxPath, sandboxContent);
  const authorization = {
    schema_version: "1.0",
    authorization_scope: {
      state: "provisional_local_benchmark_only_review_required",
      local_full_transcript_inference: "allowed_in_deny_network_sandbox",
      external_full_transcript_upload: "prohibited",
    },
    items: gate3Fixture.authorizationItems,
  };
  await put(authorizationPath, `${JSON.stringify(authorization)}\n`);

  const extractedManifest: Array<{ relative_path: string; role: string; bytes: number; sha256: string; mode: string }> = [];
  const mutationTarget = path.join(
    privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/YT-03/harness-report.publication-safe.json`,
  );
  for (const [name, role, mode] of runtimeFiles) {
    const content = name === "llama-cli" ? fakeExecutable(behavior, mutationTarget) : `DEV-${name}\n`;
    await put(path.join(runtimeDir, name), content, Number.parseInt(mode, 8));
    extractedManifest.push({ relative_path: name, role, bytes: Buffer.byteLength(content), sha256: hash(content), mode });
  }
  const cli = extractedManifest.find((entry) => entry.relative_path === "llama-cli")!;
  const libraries = extractedManifest.filter((entry) => entry.role === "runtime_library")
    .sort((a, b) => a.relative_path.localeCompare(b.relative_path));
  const buildInfo = { version_output: "DEV", compiler: "DEV", platform: "Darwin", architecture: "arm64", codesign: { identifier: "llama-cli", signature: "adhoc", team_identifier: "not set" } };
  const locked = (filePath: string) => ({
    path: path.relative(project, filePath),
    sha256: hash(requireContent(filePath, {
      [systemPromptPath]: "DEV SYSTEM PROMPT\n",
      [repairPromptPath]: "FORMAT-ONLY RETRY\n",
      [outputSchemaPath]: "{}\n",
      [rubricPath]: "{}\n",
      [authorizationPath]: `${JSON.stringify(authorization)}\n`,
      [sandboxPath]: sandboxContent,
    })),
  });
  const archiveHash = hash("DEV-ARCHIVE");
  const modelHash = hash("DEV-MODEL");
  const ledger = {
    schema_version: "1.0",
    candidate_id: "LOCAL-QWEN3-8B-Q4_K_M-LLAMA_CPP-B9637",
    seal_state: blocked ? "blocked_pending_local_artifact_verification" : "verified_ready_for_content_freeze",
    runtime: {
      expected_archive: { bytes: 11, sha256: archiveHash },
      observed_archive: { bytes: 11, sha256: archiveHash, mode: "0600", recovery_retries: 0 },
      extracted: {
        llama_cli_relative_path: "llama-cli",
        llama_cli: { bytes: cli.bytes, sha256: cli.sha256 },
        file_manifest: extractedManifest,
        dylib_manifest_hash_algorithm: "sha256_utf8_json_stringify_runtime_library_entries_sorted_by_relative_path",
        dylib_manifest_sha256: hash(JSON.stringify(libraries)),
        license_sha256: extractedManifest[0].sha256,
        build_info_hash_algorithm: "sha256_utf8_json_stringify",
        build_info_sha256: hash(JSON.stringify(buildInfo)),
        build_info: buildInfo,
      },
    },
    model: {
      expected_file: { bytes: 9, sha256: modelHash },
      observed_file: { bytes: 9, sha256: modelHash, mode: "0600", recovery_retries: 0 },
    },
    locked_files: {
      system_prompt: locked(systemPromptPath),
      format_repair_prompt: locked(repairPromptPath),
      output_schema: locked(outputSchemaPath),
      authorization_ledger: locked(authorizationPath),
      key_point_rubric: locked(rubricPath),
      sandbox_profile: locked(sandboxPath),
    },
    execution_contract: {
      interface: "llama-cli_files_only",
      network: "sandbox_exec_deny_network_plus_llama_offline",
      server_mode: "prohibited",
      remote_model_resolution: "prohibited",
      temperature: 0,
      seed: 424242,
      top_k: 1,
      top_p: 1,
      min_p: 0,
      repeat_penalty: 1,
      context_size: 16384,
      max_output_tokens: 4096,
      threads: 8,
      threads_batch: 8,
      gpu_layers: "all",
      reasoning: "disabled",
      attempt_limit: 2,
      retry_policy: "one_sealed_format_only_retry_no_semantic_retry",
      timeout_ms_per_attempt: 30000,
      incremental_cost_usd: 0,
    },
    verification: {
      status: blocked ? "pending" : "verified",
      ledger_verified_at: blocked ? null : "2026-07-18T06:05:00Z",
      locked_files_hashed_at: blocked ? null : "2026-07-18T06:04:00Z",
      verified_by: blocked ? null : "Synthetic test verifier",
      runtime_expected_matches_observed: true,
      model_expected_matches_observed: true,
      extracted_manifest_complete: true,
      blocked_reasons: blocked ? ["DEV blocked"] : [],
    },
  };
  await put(ledgerPath, `${JSON.stringify(ledger)}\n`);
  const options: HarnessOptions = {
    executionClass: "DEV_TEST",
    projectRoot: project,
    itemId: "YT-01",
    runtimeDir,
    modelPath,
    authorizationLedgerPath: authorizationPath,
    attestationPath,
    normalizedTranscriptPath: normalizedPath,
    systemPromptPath,
    formatRepairPromptPath: repairPromptPath,
    outputSchemaPath,
    keyPointRubricPath: rubricPath,
    sandboxProfilePath: sandboxPath,
    privateOutputDir: privateDir,
    privateEvidenceRoot,
    devGate3Binding: DEV_GATE3_BINDING,
    now: () => new Date("2026-07-18T06:00:00.000Z"),
  };
  return { options, base, privateDir };
}

function requireContent(filePath: string, values: Record<string, string>): string {
  const value = values[filePath];
  if (value === undefined) throw new Error(`Missing test content for ${filePath}`);
  return value;
}

async function expectedRunId(options: HarnessOptions, startedAt: string): Promise<string> {
  const inputHash = hash(await readFile(options.normalizedTranscriptPath));
  const stamp = startedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `${options.itemId}-${stamp}-${hash(`${options.itemId}\0${startedAt}\0${inputHash}`).slice(0, 12)}`;
}

function publicRunPaths(options: HarnessOptions): { claim: string; report: string } {
  const root = path.join(options.projectRoot, "docs/feature-council/youtube-transcript-enrichment/decisions/gate4-public-runs");
  return {
    claim: path.join(root, `${options.itemId}.attempt-claim.json`),
    report: path.join(root, `${options.itemId}.json`),
  };
}

async function collectWorker(child: ReturnType<typeof spawn>): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

test("runs a verified fake llama-cli through the deny-network file interface and emits only public-safe evidence", async () => {
  const { options, privateDir } = await fixture("valid");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "succeeded");
  assert.equal(report.publication_eligible, false);
  assert.equal(report.attempts.length, 1);
  assert.equal(report.attempts[0].semantic_reference_valid, true);
  assert.match(report.attempts[0].prompt_sha256, /^[0-9a-f]{64}$/);
  assert.ok((report.attempts[0].maximum_resident_set_size_bytes ?? 0) > 0);
  assert.ok((report.attempts[0].peak_memory_footprint_bytes ?? 0) > 0);
  const publicPaths = publicRunPaths(options);
  for (const [label, filePath] of Object.entries(publicPaths)) {
    const info = await stat(filePath);
    assert.equal(info.isFile(), true, `${label} must be a regular file`);
    assert.equal(info.nlink, 1, `${label} must have one link`);
    assert.equal(info.mode & 0o777, 0o644, `${label} must be mode 0644`);
    assert.ok(info.size > 0 && info.size <= 1024 * 1024, `${label} must remain bounded`);
    JSON.parse(await readFile(filePath, "utf8"));
  }
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("DEV PRIVATE PHRASE"), false);
  assert.equal(serialized.includes("Synthetic grounded claim"), false);
  const runDir = path.join(privateDir, report.run_id as string);
  const invocations = await readFile(path.join(runDir, "invocations.txt"), "utf8");
  assert.match(invocations, /--json-schema-file/);
  assert.match(invocations, /--system-prompt-file/);
  assert.match(invocations, /--file/);
  assert.match(invocations, /--offline/);
  assert.doesNotMatch(invocations, /--model-url|-hf|--server/);
  const childEnvironment = await readFile(path.join(runDir, "environment.txt"), "utf8");
  assert.doesNotMatch(childEnvironment, /OPENROUTER_API_KEY=|HF_TOKEN=|GOOGLE_APPLICATION_CREDENTIALS=|HTTP_PROXY=|HTTPS_PROXY=|http_proxy=|https_proxy=/);
  assert.match(childEnvironment, /HF_HUB_OFFLINE=1/);
  assert.match(childEnvironment, /LLAMA_ARG_OFFLINE=1/);
  await assert.rejects(readFile(path.join(runDir, "prompt.txt")), /ENOENT/);
});

test("consumes exactly one sealed retry for parse or structural failure", async () => {
  const { options, privateDir } = await fixture("format-retry");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "succeeded");
  assert.deepEqual(report.attempts.map((attempt) => attempt.kind), ["initial", "sealed_format_only_retry"]);
  assert.equal(report.attempts[0].parse_valid, false);
  assert.equal(report.attempts[1].semantic_reference_valid, true);
  const invocations = await readFile(path.join(privateDir, report.run_id as string, "invocations.txt"), "utf8");
  assert.equal(invocations.match(/^BEGIN$/gm)?.length, 2);
});

test("rejects duplicate generated JSON keys without publishing a successful output", async () => {
  const { options, privateDir } = await fixture("duplicate-json-keys");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "failed");
  assert.equal(report.attempts.length, 2);
  assert.deepEqual(report.attempts.map((attempt) => attempt.parse_valid), [false, false]);
  assert.ok(report.attempts.every((attempt) => attempt.error_codes.includes("OUTPUT_JSON_INVALID")));
  await assert.rejects(
    readFile(path.join(privateDir, report.run_id as string, "output.json")),
    /ENOENT/,
  );
});

test("rejects malformed UTF-8 model output without publishing a successful output", async () => {
  const { options, privateDir } = await fixture("invalid-utf8");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "failed");
  assert.equal(report.attempts.length, 2);
  assert.deepEqual(report.attempts.map((attempt) => attempt.parse_valid), [false, false]);
  assert.ok(report.attempts.every((attempt) => attempt.error_codes.includes("OUTPUT_JSON_INVALID")));
  await assert.rejects(
    readFile(path.join(privateDir, report.run_id as string, "output.json")),
    /ENOENT/,
  );
});

test("does not retry a semantic timestamp-reference failure", async () => {
  const { options } = await fixture("semantic-invalid");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "failed");
  assert.equal(report.attempts.length, 1);
  assert.equal(report.attempts[0].shape_valid, true);
  assert.equal(report.attempts[0].semantic_reference_valid, false);
  assert.ok(report.attempts[0].error_codes.includes("EVIDENCE_TIMESTAMP_MISMATCH"));
  assert.equal((report.failure as Record<string, unknown>).truthful_user_state, "enrichment_unavailable_transcript_preserved");
});

test("a pending runtime ledger blocks before the fake executable starts", async () => {
  const { options, privateDir } = await fixture("valid", true);
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "LOCK_INPUT_UNVERIFIED",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("malformed UTF-8 runtime-ledger bytes fail before the fake executable starts", async () => {
  const { options, privateDir } = await fixture("valid");
  const ledgerPath = path.join(
    options.projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
  );
  await writeFile(
    ledgerPath,
    Uint8Array.of(0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d),
  );
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "RUNTIME_LEDGER_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("binds the model input bytes to the committed-form Gate 3 handoff", async () => {
  const { options, privateDir } = await fixture("valid");
  const normalized = JSON.parse(await readFile(options.normalizedTranscriptPath, "utf8")) as Record<string, unknown>;
  const segments = normalized.segments as Array<Record<string, unknown>>;
  segments[0].text = "A different but schema-valid private transcript phrase.";
  await writeFile(options.normalizedTranscriptPath, `${JSON.stringify(normalized)}\n`, { mode: 0o600 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects the former structurally plausible but fabricated Gate 3 success fixture", async () => {
  const { options, privateDir } = await fixture("valid");
  const resultPath = path.join(
    options.projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json",
  );
  const result = JSON.parse(await readFile(resultPath, "utf8")) as {
    items: Array<Record<string, unknown>>;
  };
  result.items[0].gate_1_score_summary_sha256 = hash("SCORE1-YT-01");
  result.items[0].gate_3_repeat_score_summary_sha256 = hash("SCORE2-YT-01");
  result.items[0].canonical_normalized_output_sha256 = hash("CANONICAL-YT-01");
  await writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o644 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects altered score-summary bytes even when the Gate 3 document is unchanged", async () => {
  const { options, privateDir } = await fixture("valid");
  const scorePath = path.join(
    options.privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/YT-02/a1-score.publication-safe.json`,
  );
  const score = JSON.parse(await readFile(scorePath, "utf8")) as {
    preservation: Record<string, unknown>;
  };
  score.preservation.token_preservation_rate = 0.999;
  await writeFile(scorePath, `${JSON.stringify(score, null, 2)}\n`, { mode: 0o600 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects a missing rejection-control report from the exact Gate 1 denominator", async () => {
  const { options, privateDir } = await fixture("valid");
  await unlink(path.join(
    options.privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/YT-05/harness-report.publication-safe.json`,
  ));
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects an operator receipt that does not bind the same A/B seal and exact report", async () => {
  const { options, privateDir } = await fixture("valid");
  const receiptPath = path.join(
    options.privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/operator-receipts/gate1-primary/YT-03.publication-safe.json`,
  );
  const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
    seal: Record<string, unknown>;
    hashes: Record<string, unknown>;
  };
  receipt.seal.content_commit = "d".repeat(40);
  receipt.hashes.harness_report_sha256 = hash("selected-alternative-report");
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects duplicated evidence in distinct run roles", async () => {
  const { options, privateDir } = await fixture("valid");
  const primary = path.join(
    options.privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/YT-01/harness-report.publication-safe.json`,
  );
  const repeat = path.join(
    options.privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate3-repeat/YT-01/harness-report.publication-safe.json`,
  );
  await unlink(repeat);
  await link(primary, repeat);
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects a post-selected copy instead of the exact Gate 1 model-input file", async () => {
  const { options, base, privateDir } = await fixture("valid");
  const selectedCopy = path.join(base, "selected-normalized-copy.json");
  await copyFile(options.normalizedTranscriptPath, selectedCopy);
  await chmod(selectedCopy, 0o600);
  options.normalizedTranscriptPath = selectedCopy;
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "GATE_3_EVIDENCE_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rechecks the complete Gate 1 and Gate 3 evidence chain after model execution", async () => {
  const { options } = await fixture("mutate-evidence");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "failed");
  assert.equal(report.attempts.length, 1);
  assert.equal((report.failure as Record<string, unknown>).code, "INPUT_CHANGED_DURING_EXECUTION");
  assert.equal((report.runtime as Record<string, unknown>).post_execution_input_reverification, false);
});

test("rejects runtime-ledger verification chronology before any process starts", async () => {
  const { options, privateDir } = await fixture("valid");
  const ledgerPath = path.join(
    options.projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/benchmark/model/LOCAL_MODEL_RUNTIME_LEDGER.json",
  );
  const ledger = JSON.parse(await readFile(ledgerPath, "utf8")) as {
    verification: Record<string, unknown>;
  };
  ledger.verification.ledger_verified_at = "2026-07-18T06:03:59Z";
  ledger.verification.locked_files_hashed_at = "2026-07-18T06:04:00Z";
  await writeFile(ledgerPath, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "RUNTIME_LEDGER_CHRONOLOGY_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects malformed normalized metadata before any process starts", async () => {
  const { options, privateDir } = await fixture("valid");
  const normalized = JSON.parse(await readFile(options.normalizedTranscriptPath, "utf8")) as Record<string, unknown>;
  normalized.language = "en-US\nINJECTED";
  await writeFile(options.normalizedTranscriptPath, `${JSON.stringify(normalized)}\n`, { mode: 0o600 });
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "NORMALIZED_INPUT_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});

test("rejects a symlinked private-output parent", async () => {
  const { options, base } = await fixture("valid");
  const actualParent = path.join(base, "actual-private-parent");
  const parentLink = path.join(base, "private-parent-link");
  await mkdir(actualParent, { mode: 0o700 });
  await symlink(actualParent, parentLink);
  options.privateOutputDir = path.join(parentLink, "run-root");
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "PRIVATE_OUTPUT_PARENT_INVALID",
  );
});

test("never replaces an existing canonical public report", async () => {
  const { options, base } = await fixture("valid");
  const first = await runLocalModelHarness(options);
  assert.equal(first.run_state, "succeeded");
  options.privateOutputDir = path.join(base, "private-second");
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "PUBLIC_REPORT_ALREADY_EXISTS",
  );
  await assert.rejects(readFile(options.privateOutputDir), /ENOENT|EISDIR/);
});

test("atomically claims one canonical item attempt before any concurrent or crash rerun can start a child", async () => {
  const { options, base } = await fixture("valid");
  const firstPrivateDir = options.privateOutputDir;
  const secondPrivateDir = path.join(base, "private-concurrent-second");
  const settled = await Promise.allSettled([
    runLocalModelHarness(options),
    runLocalModelHarness({ ...options, privateOutputDir: secondPrivateDir }),
  ]);
  const fulfilled = settled.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof runLocalModelHarness>>> =>
    result.status === "fulfilled");
  const rejected = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0].reason instanceof HarnessError
      && ["MODEL_ATTEMPT_ALREADY_CLAIMED", "PUBLIC_REPORT_ALREADY_EXISTS"].includes(rejected[0].reason.code),
    rejected[0].reason instanceof Error ? `${rejected[0].reason.name}: ${rejected[0].reason.message}` : String(rejected[0].reason),
  );

  const report = fulfilled[0].value;
  const invocationCounts = await Promise.all([firstPrivateDir, secondPrivateDir].map(async (privateDir) => {
    const text = await readFile(path.join(privateDir, report.run_id as string, "invocations.txt"), "utf8").catch(() => "");
    return text.match(/^BEGIN$/gm)?.length ?? 0;
  }));
  assert.equal(invocationCounts.reduce((total, count) => total + count, 0), 1);

  const publicReportDir = path.join(
    options.projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/gate4-public-runs",
  );
  const claim = JSON.parse(await readFile(path.join(publicReportDir, "YT-01.attempt-claim.json"), "utf8")) as Record<string, unknown>;
  assert.deepEqual(Object.keys(claim), [
    "schema_version", "claim_type", "harness_version", "execution_class", "content_commit", "seal_commit",
    "item_id", "gate_3_result_document_sha256", "normalized_transcript_sha256",
  ]);
  assert.equal(claim.content_commit, DEV_GATE3_BINDING.contentCommit);
  assert.equal(claim.seal_commit, DEV_GATE3_BINDING.sealCommit);
  assert.equal(claim.item_id, "YT-01");
  assert.equal(claim.normalized_transcript_sha256, hash(await readFile(options.normalizedTranscriptPath)));

  await unlink(path.join(publicReportDir, "YT-01.json"));
  const crashRerunPrivateDir = path.join(base, "private-crash-rerun");
  await assert.rejects(
    runLocalModelHarness({ ...options, privateOutputDir: crashRerunPrivateDir }),
    (error: unknown) => error instanceof HarnessError && error.code === "MODEL_ATTEMPT_ALREADY_CLAIMED",
  );
  await assert.rejects(
    readFile(path.join(crashRerunPrivateDir, report.run_id as string, "invocations.txt")),
    /ENOENT/,
  );
});

test("a hard kill after the durable item claim but before child spawn remains a non-rerunnable no-child attempt", async () => {
  const { options, base, privateDir } = await fixture("valid");
  const workerOptionsPath = path.join(base, "crash-worker-options.json");
  const claimedMarker = path.join(base, "claim-synchronized.marker");
  await writeFile(workerOptionsPath, `${JSON.stringify(options)}\n`, { mode: 0o600, flag: "wx" });
  const worker = spawn(process.execPath, ["--import", "tsx", CRASH_WORKER_PATH, workerOptionsPath, claimedMarker], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["ignore", "ignore", "pipe"],
  });
  const stderr: Buffer[] = [];
  worker.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
  const outcome = await collectWorker(worker);
  assert.equal(outcome.signal, "SIGKILL", Buffer.concat(stderr).toString("utf8"));
  assert.equal(await readFile(claimedMarker, "utf8"), "claimed-and-synchronized\n");
  const publicPaths = publicRunPaths(options);
  const claimInfo = await stat(publicPaths.claim);
  assert.equal(claimInfo.nlink, 1);
  assert.equal(claimInfo.mode & 0o777, 0o644);
  assert.equal(await lstat(publicPaths.report).catch(() => null), null);
  const crashRunId = await expectedRunId(options, "2026-07-18T20:00:00.000Z");
  assert.equal(await lstat(path.join(privateDir, crashRunId, "invocations.txt")).catch(() => null), null);

  const rerunPrivate = path.join(base, "private-after-hard-kill");
  await assert.rejects(
    runLocalModelHarness({ ...options, privateOutputDir: rerunPrivate }),
    (error: unknown) => error instanceof HarnessError && error.code === "MODEL_ATTEMPT_ALREADY_CLAIMED",
  );
  const rerunId = await expectedRunId(options, "2026-07-18T06:00:00.000Z");
  assert.equal(await lstat(path.join(rerunPrivate, rerunId, "invocations.txt")).catch(() => null), null);
});

test("file and parent synchronization failures fail closed for both the claim and public report", async (t) => {
  for (const failure of ["claim_file_sync", "claim_parent_sync"] as const) {
    await t.test(failure, async () => {
      const { options, base, privateDir } = await fixture("valid");
      options.devDurabilityFailure = failure;
      await assert.rejects(
        runLocalModelHarness(options),
        (error: unknown) => error instanceof HarnessError && error.code === "MODEL_ATTEMPT_CLAIM_FAILED",
      );
      const publicPaths = publicRunPaths(options);
      assert.ok(await lstat(publicPaths.claim));
      assert.equal(await lstat(publicPaths.report).catch(() => null), null);
      const runId = await expectedRunId(options, "2026-07-18T06:00:00.000Z");
      assert.equal(await lstat(path.join(privateDir, runId, "invocations.txt")).catch(() => null), null);
      await assert.rejects(
        runLocalModelHarness({ ...options, devDurabilityFailure: undefined, privateOutputDir: path.join(base, "claim-sync-rerun") }),
        (error: unknown) => error instanceof HarnessError && error.code === "MODEL_ATTEMPT_ALREADY_CLAIMED",
      );
    });
  }
  for (const failure of ["report_file_sync", "report_parent_sync"] as const) {
    await t.test(failure, async () => {
      const { options, base, privateDir } = await fixture("valid");
      options.devDurabilityFailure = failure;
      await assert.rejects(
        runLocalModelHarness(options),
        (error: unknown) => error instanceof HarnessError && error.code === "PUBLIC_REPORT_WRITE_FAILED",
      );
      const publicPaths = publicRunPaths(options);
      const [claimInfo, reportInfo] = await Promise.all([stat(publicPaths.claim), stat(publicPaths.report)]);
      assert.equal(claimInfo.nlink, 1);
      assert.equal(reportInfo.nlink, 1);
      assert.equal(reportInfo.mode & 0o777, 0o644);
      const runId = await expectedRunId(options, "2026-07-18T06:00:00.000Z");
      assert.match(await readFile(path.join(privateDir, runId, "invocations.txt"), "utf8"), /^BEGIN$/m);
      await assert.rejects(
        runLocalModelHarness({ ...options, devDurabilityFailure: undefined, privateOutputDir: path.join(base, "report-sync-rerun") }),
        (error: unknown) => error instanceof HarnessError && error.code === "PUBLIC_REPORT_ALREADY_EXISTS",
      );
    });
  }
});

test("SEALED execution rejects the DEV_TEST durability fault hook", async () => {
  const { options } = await fixture("valid");
  options.executionClass = "SEALED";
  options.devDurabilityFailure = "claim_file_sync";
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "DEV_TEST_DURABILITY_HOOK_PROHIBITED",
  );
});

test("treats output overflow as a non-retryable resource failure", async () => {
  const { options } = await fixture("overflow");
  const report = await runLocalModelHarness(options);
  assert.equal(report.run_state, "failed");
  assert.equal(report.attempts.length, 1);
  assert.ok(report.attempts[0].error_codes.includes("OUTPUT_LIMIT_EXCEEDED"));
  assert.equal(report.attempts[0].stdout_retained_bytes, 4 * 1024 * 1024);
  assert.ok(report.attempts[0].stdout_bytes > report.attempts[0].stdout_retained_bytes);
});

test("SEALED execution fails closed before private input when the canonical lock is absent", async () => {
  const { options, privateDir } = await fixture("valid");
  options.executionClass = "SEALED";
  await assert.rejects(
    runLocalModelHarness(options),
    (error: unknown) => error instanceof HarnessError && error.code === "SEALED_LOCK_INVALID",
  );
  await assert.rejects(readFile(privateDir), /ENOENT|EISDIR/);
});
