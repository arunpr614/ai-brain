import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import Database from "better-sqlite3";

import type { A1Attestation } from "../../../spikes/a1-harness/attestation";
import type {
  A1PrivateScorerOptions,
  A1PrivateScoreSummary,
} from "../score-private-a1";
import { serializeA1PrivateScore } from "../score-private-a1";
import {
  preparePrivateReference,
  serializePrivatePreparation,
} from "../prepare-private-reference";
import { validateA1Database } from "../validate-a1-database";
import {
  generateLockDraft,
  type LockVerificationReport,
  verifyLock,
} from "../verify-lock";
import {
  A1OperatorError,
  A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
  A1_OPERATOR_VERSION,
  A1_POSITIVE_ITEM_IDS,
  A1_PRIMARY_ITEM_IDS,
  type A1ItemId,
  type A1OperatorDependencies,
  type A1SealedAuthority,
  type A1SealedChildRequest,
  type A1SealedChildResult,
  __testOnlyRunSealedA1CellWithDependencies,
  __testOnlyRunSealedChild,
  buildA1VerifiedRepositoryReadSandboxProfile,
  parseA1AttemptClaim,
  parseA1AttemptTerminalFailure,
  parseA1OperatorReceipt,
  parseSealedA1CellCli,
  runSealedA1Cell,
} from "../run-sealed-a1-cell";

const CONTENT_COMMIT = "1".repeat(40);
const SEAL_COMMIT = "2".repeat(40);
const LOCK_SHA256 = "3".repeat(64);
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const PRODUCT_GAPS = [
  "attestation_not_collected_or_enforced_by_current_service",
  "permissive_parser_requires_harness_preflight",
  "retention_and_derivation_not_runtime_enforced",
  "legacy_recovery_queue_coupled_to_youtube_item_insert",
  "normalized_contract_not_fully_persisted",
];
const SOURCE_PROJECT_ROOT = realpathSync(fileURLToPath(new URL("../../../../../../", import.meta.url)));
const PROJECT_RELATIVE_ROOT = "docs/feature-council/youtube-transcript-enrichment";

interface TestContext {
  base: string;
  projectRoot: string;
  privateRoot: string;
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>;
  requests: A1SealedChildRequest[];
  dependencies: Partial<A1OperatorDependencies>;
}

interface SnapshotEntry {
  kind: "directory" | "file";
  mode: number;
  nlink: number;
  bytes?: string;
}

test("exported A1 execution-contract identity matches the frozen contract bytes", () => {
  const contractBytes = readFileSync(
    join(
      SOURCE_PROJECT_ROOT,
      PROJECT_RELATIVE_ROOT,
      "benchmark/model/A1_EXECUTION_CONTRACT.json",
    ),
  );
  assert.equal(
    createHash("sha256").update(contractBytes).digest("hex"),
    A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
  );
});

const IS_CONCURRENCY_WORKER = process.env.A1_OPERATOR_CONCURRENCY_WORKER === "1";
const IS_CRASH_WORKER = process.env.A1_OPERATOR_CRASH_WORKER === "1";

if (IS_CRASH_WORKER) {
  runCrashWorker();
} else if (IS_CONCURRENCY_WORKER) {
  runConcurrencyWorker();
} else {
  test("the CLI exposes no caller-selected evidence or command path", () => {
    const parsed = parseSealedA1CellCli([
      "--project-root", "/tmp/project",
      "--private-evidence-root", "/tmp/private",
      "--stage", "gate1-primary",
      "--item-id", "YT-01",
    ]);
    assert.deepEqual(Object.keys(parsed).sort(), [
      "itemId", "privateEvidenceRoot", "projectRoot", "stage",
    ]);
    for (const forbidden of ["--input", "--output", "--report", "--options", "--command"]) {
      assert.throws(
        () => parseSealedA1CellCli([
          "--project-root", "/tmp/project",
          "--private-evidence-root", "/tmp/private",
          "--stage", "gate1-primary",
          forbidden, "/tmp/selected",
        ]),
        hasCode("A1_OPERATOR_ARGUMENT_INVALID"),
      );
    }
    assert.throws(
      () => parseSealedA1CellCli([
        "--project-root", "/tmp/project",
        "--private-evidence-root", "/tmp/private",
        "--stage", "gate3-repeat",
        "--item-id", "YT-04",
      ]),
      hasCode("A1_OPERATOR_ARGUMENT_INVALID"),
    );
  });

  test("production SEALED sandbox completes the harness's full inner lock verification", {
    skip: process.platform !== "darwin"
      || !existsSync("/usr/bin/sandbox-exec")
      || !existsSync("/opt/homebrew/opt/node@22/bin/node"),
    timeout: 240_000,
  }, (t) => {
    const base = realpathSync(mkdtempSync(join(tmpdir(), "sealed-a1-production-sandbox-")));
    chmodSync(base, 0o700);
    const projectRoot = join(base, "project");
    const privateRoot = join(base, "private-evidence");
    mkdirPrivate(projectRoot);
    mkdirPrivate(privateRoot);
    t.after(() => rmSync(base, { recursive: true, force: true }));

    cpSync(
      join(SOURCE_PROJECT_ROOT, PROJECT_RELATIVE_ROOT),
      join(projectRoot, PROJECT_RELATIVE_ROOT),
      { recursive: true },
    );
    cpSync(join(SOURCE_PROJECT_ROOT, "src"), join(projectRoot, "src"), { recursive: true });
    for (const rootFile of ["package.json", "package-lock.json", "tsconfig.json", ".gitignore"]) {
      cpSync(join(SOURCE_PROJECT_ROOT, rootFile), join(projectRoot, rootFile));
    }
    rmSync(join(projectRoot, PROJECT_RELATIVE_ROOT, "decisions"), { recursive: true, force: true });
    rmSync(join(projectRoot, PROJECT_RELATIVE_ROOT, "council"), { recursive: true, force: true });

    const benchmarkRoot = join(projectRoot, PROJECT_RELATIVE_ROOT, "benchmark");
    const malformedInput = Buffer.from(
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n   \n",
      "utf8",
    );
    const attestationPath = join(benchmarkRoot, "attestations/YT-03.json");
    const attestation = JSON.parse(readFileSync(attestationPath, "utf8")) as {
      source: { sidecar_sha256: string; private_relative_path: string };
    };
    attestation.source.sidecar_sha256 = sha256(malformedInput);
    attestation.source.private_relative_path = "inputs/sandbox/YT-03.vtt";
    const attestationBytes = Buffer.from(`${JSON.stringify(attestation, null, 2)}\n`, "utf8");
    writeFileSync(attestationPath, attestationBytes);

    const eligibleInput = Buffer.from(`WEBVTT

00:00:00.000 --> 00:00:04.000
Synthetic eligible transcript preserves a local application import path and deterministic database evidence.

00:00:04.000 --> 00:00:08.000
The second distinct cue verifies native SQLite persistence while all recovery and provider behavior stays disabled.

00:00:08.000 --> 00:00:11.000
The third distinct cue provides a unique deterministic timestamp anchor for the sealed scorer boundary.
`, "utf8");
    const eligiblePreparation = preparePrivateReference(eligibleInput, {
      schema_version: "1.2",
      format: "vtt",
      declared_duration_ms: 12_000,
      expected_raw_sha256: sha256(eligibleInput),
      expected_cue_count: 3,
      input_file_integrity_attested: true,
      content_completeness: "complete",
      content_completeness_basis: "user_attestation",
      reference_role: "a1_input_preservation_oracle",
      expected_class: "eligible_supported",
    });
    assert.ok(eligiblePreparation.private_anchor_packet);
    const eligiblePreparationBytes = Buffer.from(
      serializePrivatePreparation(eligiblePreparation),
      "utf8",
    );
    const eligibleAttestationPath = join(benchmarkRoot, "attestations/YT-01.json");
    const eligibleAttestation = JSON.parse(readFileSync(eligibleAttestationPath, "utf8")) as {
      youtube_video_id: string;
      input_contract: {
        format: string;
        language_tag: string;
        declared_duration_ms: number;
        expected_cue_count: number;
        last_cue_end_ms: number;
        content_completeness: { state: string; basis: string; rationale: string };
        expected_class: string;
      };
      source: {
        owner: string;
        source_page_url: string;
        sidecar_url: string;
        sidecar_sha256: string;
        private_relative_path: string;
      };
    };
    eligibleAttestation.youtube_video_id = "DEVtest0001";
    Object.assign(eligibleAttestation.input_contract, {
      format: "vtt",
      language_tag: "en-US",
      declared_duration_ms: 12_000,
      expected_cue_count: 3,
      last_cue_end_ms: 11_000,
      content_completeness: {
        state: "complete",
        basis: "user_attestation",
        rationale: "Wholly synthetic eligible production-sandbox fixture.",
      },
      expected_class: "eligible_supported",
    });
    Object.assign(eligibleAttestation.source, {
      owner: "Synthetic production-sandbox fixture",
      source_page_url: "https://example.invalid/eligible-source",
      sidecar_url: "https://example.invalid/eligible-source.vtt",
      sidecar_sha256: sha256(eligibleInput),
      private_relative_path: "inputs/sandbox/YT-01.vtt",
    });
    const eligibleAttestationBytes = Buffer.from(
      `${JSON.stringify(eligibleAttestation, null, 2)}\n`,
      "utf8",
    );
    writeFileSync(eligibleAttestationPath, eligibleAttestationBytes);

    const ledgerPath = join(benchmarkRoot, "REFERENCE_LEDGER.json");
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      review: Record<string, unknown>;
      items: Array<Record<string, unknown>>;
    };
    ledger.review = {
      status: "independent_prelock_review_complete",
      reviewer_role: "independent_adversarial_reviewer",
      reviewed_at: "2026-07-18T13:30:00+05:30",
      review_artifact_path:
        `${PROJECT_RELATIVE_ROOT}/reviews/YOUTUBE_TRANSCRIPT_ENRICHMENT_PROSPECTIVE_BENCHMARK_PRE_LOCK_PACKAGE_ADVERSARIAL_REVIEW_2026-07-18_12-57-42_IST.md`,
    };
    const ledgerItem = ledger.items.find((item) => item.item_id === "YT-03")!;
    ledgerItem.attestation_sha256 = sha256(attestationBytes);
    ledgerItem.source_raw_sha256 = sha256(malformedInput);
    ledgerItem.source_bytes = malformedInput.byteLength;
    const eligibleLedgerItem = ledger.items.find((item) => item.item_id === "YT-01")!;
    Object.assign(eligibleLedgerItem, {
      attestation_sha256: sha256(eligibleAttestationBytes),
      source_raw_sha256: sha256(eligibleInput),
      source_canonical_sha256: eligiblePreparation.publication_safe_summary.canonical_sha256,
      source_bytes: eligibleInput.byteLength,
      source_token_count: eligiblePreparation.publication_safe_summary.normalized_token_count,
      source_token_count_state: "counted",
      normalized_text_character_count:
        eligiblePreparation.publication_safe_summary.normalized_text_character_count,
      cue_count: 3,
      declared_duration_ms: 12_000,
      last_cue_end_ms: 11_000,
      distinct_timed_start_count: 3,
      base_anchor_target: 10,
      actual_anchor_count: 3,
      preparation_document_sha256: sha256(eligiblePreparationBytes),
      preparation_private_relative_path: "references/YT-01.anchors.private.json",
      preflight_state: "passed",
      preflight_error_code: null,
      preflight_failure_cue_ordinal: null,
      content_completeness_state: "complete",
      expected_class: "eligible_supported",
      state: "ready",
    });
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");

    const authorizationPath = join(benchmarkRoot, "model/LOCAL_DERIVATION_AUTHORIZATION.json");
    const authorization = JSON.parse(readFileSync(authorizationPath, "utf8")) as {
      items: Array<Record<string, unknown>>;
    };
    const eligibleAuthorization = authorization.items.find((item) => item.item_id === "YT-01")!;
    Object.assign(eligibleAuthorization, {
      attestation_sha256: sha256(eligibleAttestationBytes),
      source_raw_sha256: sha256(eligibleInput),
      official_source_page_url: "https://example.invalid/eligible-source",
      source_owner: "Synthetic production-sandbox fixture",
    });
    const authorizationBytes = Buffer.from(`${JSON.stringify(authorization, null, 2)}\n`, "utf8");
    writeFileSync(authorizationPath, authorizationBytes);

    const readinessPath = join(benchmarkRoot, "PRESEAL_READINESS.json");
    const readiness = JSON.parse(readFileSync(readinessPath, "utf8")) as {
      status: string;
      validated_at: string | null;
      validation: Record<string, unknown>;
      independent_review: { artifact_path: string };
    };
    readiness.status = "ready_for_commit_a";
    readiness.validated_at = "2026-07-18T13:00:00+05:30";
    Object.assign(readiness.validation, {
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
    });
    const reviewPath = join(projectRoot, readiness.independent_review.artifact_path);
    writeFileSync(
      reviewPath,
      `${readFileSync(reviewPath, "utf8").trimEnd()}\n\n**Machine closure marker:** prelock_review_closure_complete\n`,
      "utf8",
    );
    writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`, "utf8");

    const runtimeLedgerPath = join(benchmarkRoot, "model/LOCAL_MODEL_RUNTIME_LEDGER.json");
    const runtimeLedger = JSON.parse(readFileSync(runtimeLedgerPath, "utf8")) as {
      locked_files: { authorization_ledger: { sha256: string } };
      verification: { ledger_verified_at: string; locked_files_hashed_at: string };
    };
    runtimeLedger.locked_files.authorization_ledger.sha256 = sha256(authorizationBytes);
    runtimeLedger.verification.ledger_verified_at = new Date(
      Date.parse(runtimeLedger.verification.locked_files_hashed_at) + 1_000,
    ).toISOString();
    writeFileSync(runtimeLedgerPath, `${JSON.stringify(runtimeLedger, null, 2)}\n`, "utf8");

    const protocolPath = join(benchmarkRoot, "BENCHMARK_PROTOCOL.md");
    const protocol = readFileSync(protocolPath, "utf8")
      .replace(
        "- [ ] Scorers, schemas, safety fixtures, reference ledger, write-once A1 operator, Gate 3 generator/verifier, exact-five packet/result/adjudication contracts, deterministic aggregate/Gate 5 calculator, evaluator execution contract/runner, local model package/harness, pre-seal readiness authority, candidate-tree inventory, and exact run plan complete and internally validated.",
        "- [x] Scorers, schemas, safety fixtures, reference ledger, write-once A1 operator, Gate 3 generator/verifier, exact-five packet/result/adjudication contracts, deterministic aggregate/Gate 5 calculator, evaluator execution contract/runner, local model package/harness, pre-seal readiness authority, candidate-tree inventory, and exact run plan complete and internally validated.",
      )
      .replace(
        "- [ ] Protocol and all lock inputs pass independent adversarial review.",
        "- [x] Protocol and all lock inputs pass independent adversarial review.",
      );
    writeFileSync(protocolPath, protocol, "utf8");
    writeFileSync(join(projectRoot, "unfrozen-secret.txt"), "must remain unreadable\n", "utf8");

    execFileSync("git", ["init", "-q", projectRoot]);
    execFileSync("git", ["-C", projectRoot, "config", "user.name", "Publication Safe Test"]);
    execFileSync("git", ["-C", projectRoot, "config", "user.email", "publication-safe@example.invalid"]);
    execFileSync("git", ["-C", projectRoot, "add", "."]);
    execFileSync("git", ["-C", projectRoot, "commit", "-q", "-m", "Commit A"]);
    const contentCommit = execFileSync(
      "git",
      ["-C", projectRoot, "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).trim();
    const lock = generateLockDraft({
      repoRoot: projectRoot,
      contentCommit,
      protocolVersion: "2.4",
      sealCreatedAt: "2026-07-18T14:00:00+05:30",
    });
    const lockPath = join(benchmarkRoot, "LOCK.json");
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
    execFileSync("git", ["-C", projectRoot, "add", lockPath]);
    execFileSync("git", ["-C", projectRoot, "commit", "-q", "-m", "Commit B"]);
    execFileSync("/bin/cp", [
      "-cR",
      join(SOURCE_PROJECT_ROOT, "node_modules"),
      join(projectRoot, "node_modules"),
    ]);

    writePrivateExclusive(join(privateRoot, "inputs/sandbox/YT-03.vtt"), malformedInput);
    writePrivateExclusive(join(privateRoot, "inputs/sandbox/YT-01.vtt"), eligibleInput);
    writePrivateExclusive(
      join(privateRoot, "references/YT-01.anchors.private.json"),
      eligiblePreparationBytes,
    );
    const seal = verifyLock({ repoRoot: projectRoot });
    const profile = buildA1VerifiedRepositoryReadSandboxProfile(projectRoot, seal);
    const probeTemporary = join(privateRoot, "lock-probe-tmp");
    mkdirPrivate(probeTemporary);
    const probeProfile = `${profile} (allow file-read* (subpath "${probeTemporary}")) (allow file-write* (subpath "${probeTemporary}"))`;
    const probe = spawnSync(
      "/usr/bin/sandbox-exec",
      [
        "-p", probeProfile,
        "/usr/bin/env", "-i",
        "PATH=/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin",
        `HOME=${probeTemporary}`,
        `TMPDIR=${probeTemporary}`,
        "TSX_DISABLE_CACHE=1",
        "GIT_CONFIG_NOSYSTEM=1",
        "GIT_CONFIG_GLOBAL=/dev/null",
        "GIT_OPTIONAL_LOCKS=0",
        "/opt/homebrew/opt/node@22/bin/node",
        "--import", "tsx",
        "-e",
        "const {execFileSync}=require('node:child_process'); const {verifyLock}=require('./docs/feature-council/youtube-transcript-enrichment/benchmark/tools/verify-lock.ts'); const git=execFileSync('/usr/bin/which',['git'],{encoding:'utf8'}).trim(); const state=verifyLock({repoRoot:process.cwd()}).valid ? 'valid' : 'invalid'; process.stdout.write(`${git}\\n${state}\\n`)",
      ],
      { cwd: projectRoot, encoding: "utf8", timeout: 120_000 },
    );
    assert.equal(probe.status, 0, probe.stderr);
    assert.equal(
      probe.stdout,
      "/Library/Developer/CommandLineTools/usr/bin/git\nvalid\n",
      "the clean SEALED environment must resolve Git to the root-owned CLT binary",
    );
    const result = runSealedA1Cell({
      projectRoot,
      privateEvidenceRoot: privateRoot,
      stage: "gate1-primary",
      itemId: "YT-03",
    });
    assert.equal(result.execution_boundary, "sealed_default_dependencies");
    assert.equal(result.publication_eligible, true);
    assert.equal(result.process.harness_exit_code, 1);

    const eligibleCell = join(
      privateRoot,
      "outputs",
      seal.sealCommit,
      "gate1-primary",
      "YT-01",
    );
    const eligibleReceiptPath = join(
      privateRoot,
      "outputs",
      seal.sealCommit,
      "operator-receipts",
      "gate1-primary",
      "YT-01.publication-safe.json",
    );
    let eligibleResult: ReturnType<typeof runSealedA1Cell>;
    try {
      eligibleResult = runSealedA1Cell({
        projectRoot,
        privateEvidenceRoot: privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      });
    } catch (error) {
      try {
        validateA1Database({
          databasePath: join(eligibleCell, "throwaway.sqlite"),
          normalizedTranscriptBytes: readFileSync(
            join(eligibleCell, "a1-normalized-transcript.private.json"),
          ),
          itemId: "YT-01",
          youtubeVideoId: eligibleAttestation.youtube_video_id,
          language: eligibleAttestation.input_contract.language_tag,
          format: "vtt",
          declaredDurationMs: 12_000,
          expectedCueCount: 3,
          sourcePrivateRelativePath: eligibleAttestation.source.private_relative_path,
          sourcePageUrl: eligibleAttestation.source.source_page_url,
          sourceAssetUrl: eligibleAttestation.source.sidecar_url,
          sourceRawSha256: sha256(eligibleInput),
          sourceByteCount: eligibleInput.byteLength,
        });
      } catch (validationError) {
        throw new Error(
          `eligible production database diagnostic: ${validationError instanceof Error ? validationError.message : "unknown validation failure"}`,
          { cause: error },
        );
      }
      throw error;
    }
    assert.equal(eligibleResult.execution_boundary, "sealed_default_dependencies");
    assert.equal(eligibleResult.publication_eligible, true);
    assert.equal(eligibleResult.process.harness_exit_code, 0);
    assert.equal(eligibleResult.process.scorer_exit_code, 0);
    const eligibleReceipt = parseA1OperatorReceipt(readFileSync(
      eligibleReceiptPath,
    ));
    assert.equal(eligibleReceipt.hashes.database_sha256, eligibleResult.hashes.database_sha256);
    assert.match(eligibleReceipt.hashes.scorer_report_sha256!, /^[0-9a-f]{64}$/);
    const eligibleDatabasePath = join(eligibleCell, "throwaway.sqlite");
    const eligibleDatabase = new Database(eligibleDatabasePath, { readonly: true });
    try {
      assert.equal(
        (eligibleDatabase.prepare("SELECT COUNT(*) AS count FROM transcript_segments").get() as { count: number }).count,
        3,
      );
      assert.equal(
        (eligibleDatabase.prepare("SELECT COUNT(*) AS count FROM transcript_attempts").get() as { count: number }).count,
        0,
      );
      assert.equal(
        (eligibleDatabase.prepare("SELECT COUNT(*) AS count FROM llm_usage").get() as { count: number }).count,
        0,
      );
    } finally {
      eligibleDatabase.close();
    }

    const allowed = spawnSync(
      "/usr/bin/sandbox-exec",
      ["-p", profile, "/bin/cat", join(projectRoot, "package.json")],
      { encoding: "utf8" },
    );
    assert.equal(allowed.status, 0, allowed.stderr);
    const denied = spawnSync(
      "/usr/bin/sandbox-exec",
      ["-p", profile, "/bin/cat", join(projectRoot, "unfrozen-secret.txt")],
      { encoding: "utf8" },
    );
    assert.notEqual(denied.status, 0, "unfrozen repository file data must remain denied");
  });

  test("eligible cell uses fixed sandbox commands and a rerun changes no byte", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const result = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot: context.projectRoot,
      privateEvidenceRoot: context.privateRoot,
      stage: "gate1-primary",
      itemId: "YT-01",
    }, context.dependencies);

    assert.equal(result.state, "created");
    assert.equal(result.cell.expected_outcome, "eligible_pass");
    assert.equal(context.requests.length, 2);
    assertFixedHarnessCommand(context.requests[0]);
    assertFixedScorerCommand(context.requests[1]);

    const receiptPath = receiptAbsolute(context.privateRoot, "gate1-primary", "YT-01");
    const receipt = parseA1OperatorReceipt(readFileSync(receiptPath));
    assert.equal(receipt.operator_version, A1_OPERATOR_VERSION);
    assert.equal(receipt.execution_boundary, "development_test_only");
    assert.equal(receipt.publication_eligible, false);
    assert.equal(receipt.process.harness_exit_code, 0);
    assert.equal(receipt.process.scorer_exit_code, 0);
    assert.match(receipt.hashes.database_sha256!, /^[0-9a-f]{64}$/);
    const claim = parseA1AttemptClaim(readFileSync(claimAbsolute(
      context.projectRoot,
      "gate1-primary",
      "YT-01",
    )));
    assert.equal(claim.execution_contract.execution_boundary, "development_test_only");
    assert.equal(claim.publication_eligible, false);

    const before = snapshotTree(join(context.privateRoot, "outputs"));
    const claimsBefore = snapshotTree(join(
      context.projectRoot,
      "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims",
    ));
    const requestCount = context.requests.length;
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, context.dependencies),
      hasCode("A1_OPERATOR_ATTEMPT_CLAIM_EXISTS"),
    );
    assert.deepEqual(snapshotTree(join(context.privateRoot, "outputs")), before);
    assert.deepEqual(snapshotTree(join(
      context.projectRoot,
      "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims",
    )), claimsBefore);
    assert.equal(context.requests.length, requestCount, "rerun must not reach either child");
  });

  test("both fixed rejection classes preserve only exact child report bytes", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));

    const structural = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot: context.projectRoot,
      privateEvidenceRoot: context.privateRoot,
      stage: "gate1-primary",
      itemId: "YT-03",
    }, context.dependencies);
    const supported = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot: context.projectRoot,
      privateEvidenceRoot: context.privateRoot,
      stage: "gate1-primary",
      itemId: "YT-04",
    }, context.dependencies);

    assert.equal(structural.process.harness_exit_code, 1);
    assert.equal(structural.process.scorer_exit_code, null);
    assert.equal(supported.process.harness_exit_code, 0);
    assert.equal(supported.process.scorer_exit_code, null);
    for (const itemId of ["YT-03", "YT-04"] as const) {
      const cell = cellAbsolute(context.privateRoot, "gate1-primary", itemId);
      assert.deepEqual(readdirSync(cell), ["harness-report.publication-safe.json"]);
      const receipt = parseA1OperatorReceipt(
        readFileSync(receiptAbsolute(context.privateRoot, "gate1-primary", itemId)),
      );
      assert.deepEqual(receipt.hashes, {
        harness_report_sha256: sha256(readFileSync(join(cell, "harness-report.publication-safe.json"))),
        normalized_transcript_sha256: null,
        scorer_options_sha256: null,
        scorer_report_sha256: null,
        database_sha256: null,
      });
    }
  });

  test("YT-04 rejects a missing or tampered private preparation before claim or child", (t) => {
    const contexts: TestContext[] = [];
    t.after(() => {
      for (const context of contexts) rmSync(context.base, { recursive: true, force: true });
    });

    for (const mutation of ["missing", "tampered"] as const) {
      const context = createTestContext();
      contexts.push(context);
      const authority = context.authorities.get("YT-04")!;
      assert.ok(authority.ledger.preparation_private_relative_path);
      const preparationPath = join(
        context.privateRoot,
        ...authority.ledger.preparation_private_relative_path.split("/"),
      );
      if (mutation === "missing") {
        rmSync(preparationPath);
      } else {
        writeFileSync(preparationPath, "tampered private preparation\n", { mode: 0o600 });
      }

      assert.throws(
        () => __testOnlyRunSealedA1CellWithDependencies({
          projectRoot: context.projectRoot,
          privateEvidenceRoot: context.privateRoot,
          stage: "gate1-primary",
          itemId: "YT-04",
        }, context.dependencies),
        hasCode("A1_OPERATOR_PRIVATE_EVIDENCE_INVALID"),
      );
      assert.equal(existsSync(claimAbsolute(context.projectRoot, "gate1-primary", "YT-04")), false);
      assert.equal(existsSync(join(context.privateRoot, "outputs")), false);
      assert.equal(context.requests.length, 0);
    }
  });

  test("timeout preserves one hash-only terminal and permanently consumes the claim", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const privateChildText = "private child transcript must not be published";
    const dependencies: Partial<A1OperatorDependencies> = {
      ...context.dependencies,
      runChild: () => ({
        exitCode: null,
        signal: "SIGKILL",
        timedOut: true,
        stdout: Buffer.from(privateChildText),
        stderr: Buffer.from("private stderr"),
      }),
    };
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_TIMEOUT"),
    );
    const terminalPath = terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01");
    const terminalBytes = readFileSync(terminalPath);
    const terminal = parseA1AttemptTerminalFailure(terminalBytes);
    assert.equal(terminal.terminal.error_code, "A1_OPERATOR_TIMEOUT");
    assert.equal(terminal.terminal.harness?.timed_out, true);
    assert.equal(terminal.terminal.harness?.stdout_sha256, sha256(privateChildText));
    assert.equal(terminal.terminal.harness?.stdout_byte_count, Buffer.byteLength(privateChildText));
    assert.equal(terminalBytes.includes(privateChildText), false);
    assert.equal(existsSync(receiptAbsolute(context.privateRoot, "gate1-primary", "YT-01")), false);

    const before = snapshotTree(context.base);
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_ATTEMPT_CLAIM_EXISTS"),
    );
    assert.deepEqual(snapshotTree(context.base), before);
  });

  test("ENOBUFS preserves bounded stream evidence in a terminal and consumes the claim", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const overflow = __testOnlyRunSealedChild({
      kind: "harness",
      executable: process.execPath as A1SealedChildRequest["executable"],
      args: ["-e", "process.stdout.write(Buffer.alloc(8192, 120))"],
      cwd: context.projectRoot,
      maximumStdoutBytes: 128,
      timeoutMs: 120_000,
    });
    assert.equal(overflow.exitCode, null);
    assert.equal(overflow.timedOut, false);
    assert.equal(overflow.stdout.byteLength, 128);
    assert.equal(overflow.stdoutTruncated, true);
    assert.equal(overflow.stderrTruncated, false);

    const dependencies: Partial<A1OperatorDependencies> = {
      ...context.dependencies,
      runChild: () => overflow,
    };
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_CHILD_FAILED"),
    );
    const terminalBytes = readFileSync(
      terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01"),
    );
    const terminal = parseA1AttemptTerminalFailure(terminalBytes);
    assert.equal(terminal.terminal.error_code, "A1_OPERATOR_CHILD_FAILED");
    assert.equal(terminal.terminal.harness?.exit_code, null);
    assert.equal(terminal.terminal.harness?.signal, overflow.signal);
    assert.equal(terminal.terminal.harness?.timed_out, false);
    assert.equal(terminal.terminal.harness?.stdout_byte_count, 128);
    assert.equal(terminal.terminal.harness?.stdout_sha256, sha256(overflow.stdout));
    assert.equal(terminal.terminal.harness?.stdout_truncated, true);
    assert.equal(terminal.terminal.harness?.stderr_truncated, false);
    assert.equal(terminalBytes.includes(Buffer.alloc(128, 120)), false);
    assert.equal(existsSync(receiptAbsolute(context.privateRoot, "gate1-primary", "YT-01")), false);
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_ATTEMPT_CLAIM_EXISTS"),
    );
  });

  test("public claim is durable before a private-parent validation failure", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const unsafeOutputs = join(context.privateRoot, "outputs");
    mkdirSync(unsafeOutputs, { mode: 0o755 });
    chmodSync(unsafeOutputs, 0o755);

    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, context.dependencies),
      hasCode("A1_OPERATOR_WRITE_FAILED"),
    );

    assert.equal(existsSync(claimAbsolute(context.projectRoot, "gate1-primary", "YT-01")), true);
    const terminal = parseA1AttemptTerminalFailure(readFileSync(
      terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01"),
    ));
    assert.equal(terminal.terminal.error_code, "A1_OPERATOR_WRITE_FAILED");
    assert.equal(context.requests.length, 0, "private-parent failure must not reach a child");
    assert.deepEqual(readdirSync(unsafeOutputs), [], "operator must not create a private child path");
  });

  test("stderr-only ENOBUFS attributes truncation to stderr in the terminal", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const overflow = __testOnlyRunSealedChild({
      kind: "harness",
      executable: process.execPath as A1SealedChildRequest["executable"],
      args: ["-e", "process.stderr.write(Buffer.alloc(8192, 121))"],
      cwd: context.projectRoot,
      maximumStdoutBytes: 128,
      timeoutMs: 120_000,
    });
    assert.equal(overflow.exitCode, null);
    assert.equal(overflow.stdout.byteLength, 0);
    assert.equal(overflow.stderr.byteLength, 128);
    assert.equal(overflow.stdoutTruncated, false);
    assert.equal(overflow.stderrTruncated, true);
    const dependencies: Partial<A1OperatorDependencies> = {
      ...context.dependencies,
      runChild: () => overflow,
    };
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_CHILD_FAILED"),
    );
    const terminal = parseA1AttemptTerminalFailure(readFileSync(
      terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01"),
    ));
    assert.equal(terminal.terminal.harness?.stdout_byte_count, 0);
    assert.equal(terminal.terminal.harness?.stdout_truncated, false);
    assert.equal(terminal.terminal.harness?.stderr_byte_count, 128);
    assert.equal(terminal.terminal.harness?.stderr_sha256, sha256(overflow.stderr));
    assert.equal(terminal.terminal.harness?.stderr_truncated, true);
  });

  test("operator rejects normalized page/asset provenance drift before issuing a receipt", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const dependencies: Partial<A1OperatorDependencies> = {
      ...context.dependencies,
      runChild: (request) => {
        if (request.kind !== "harness") throw new Error("scorer must not run");
        return runTamperedPositiveHarness(request, context.authorities, (normalized) => {
          (normalized.provenance as Record<string, unknown>).source_page_url =
            "https://example.invalid/wrong-sealed-page";
          (normalized.provenance as Record<string, unknown>).source_asset_url =
            "https://example.invalid/wrong-sealed-asset.vtt";
        });
      },
    };
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, dependencies),
      hasCode("A1_OPERATOR_ORACLE_FAILED"),
    );
    const terminal = parseA1AttemptTerminalFailure(readFileSync(
      terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01"),
    ));
    assert.equal(terminal.terminal.error_code, "A1_OPERATOR_ORACLE_FAILED");
    assert.equal(existsSync(receiptAbsolute(context.privateRoot, "gate1-primary", "YT-01")), false);
  });

  test("operator rejects semantic SQLite mutation and supported-report counter drift", (t) => {
    const databaseContext = createTestContext();
    const reportContext = createTestContext();
    t.after(() => {
      rmSync(databaseContext.base, { recursive: true, force: true });
      rmSync(reportContext.base, { recursive: true, force: true });
    });
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: databaseContext.projectRoot,
        privateEvidenceRoot: databaseContext.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, {
        ...databaseContext.dependencies,
        runChild: (request) => {
          const result = runSyntheticChild(request, databaseContext.authorities);
          if (request.kind === "harness") {
            const database = new Database(join(
              optionValue(request.args, "--private-output-dir"),
              "throwaway.sqlite",
            ));
            try {
              database.prepare("UPDATE transcript_jobs SET attempts = 1").run();
            } finally {
              database.close();
            }
          }
          return result;
        },
      }),
      hasCode("A1_OPERATOR_ORACLE_FAILED"),
    );
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: reportContext.projectRoot,
        privateEvidenceRoot: reportContext.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-04",
      }, {
        ...reportContext.dependencies,
        runChild: () => {
          const authority = reportContext.authorities.get("YT-04")!;
          const report = supportedHarnessReport(authority) as {
            counts: Record<string, unknown>;
          };
          report.counts.attestation_part_count = 5;
          report.counts.overlap_count = -1;
          return childResult(0, report);
        },
      }),
      hasCode("A1_OPERATOR_ORACLE_FAILED"),
    );
  });

  test("symlinked private authority is rejected before a claim or child", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const inputPath = join(context.privateRoot, "inputs/YT-01.vtt");
    const targetPath = join(context.privateRoot, "inputs/YT-02.vtt");
    rmSync(inputPath);
    symlinkSync(targetPath, inputPath);
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, context.dependencies),
      hasCode("A1_OPERATOR_PRIVATE_EVIDENCE_INVALID"),
    );
    assert.equal(context.requests.length, 0);
    assert.equal(existsSync(claimAbsolute(context.projectRoot, "gate1-primary", "YT-01")), false);
  });

  test("hard termination after the exclusive claim is an aborted no-pass attempt", async (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    const worker = spawn(process.execPath, [
      "--import", "tsx", fileURLToPath(import.meta.url), context.projectRoot, context.privateRoot,
    ], {
      cwd: process.cwd(),
      env: { ...process.env, A1_OPERATOR_CRASH_WORKER: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const result = await collectChild(worker);
    assert.notEqual(result.exitCode, 0);
    assert.equal(existsSync(claimAbsolute(context.projectRoot, "gate1-primary", "YT-01")), true);
    assert.equal(existsSync(terminalAbsolute(context.projectRoot, "gate1-primary", "YT-01")), false);
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId: "YT-01",
      }, context.dependencies),
      hasCode("A1_OPERATOR_ATTEMPT_CLAIM_EXISTS"),
    );
  });

  test("Gate 3 is unavailable before 9/9 Gate 1 and derives comparison from fixed Gate 1", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate3-repeat",
        itemId: "YT-01",
      }, context.dependencies),
      hasCode("A1_OPERATOR_GATE1_INCOMPLETE"),
    );

    for (const itemId of A1_PRIMARY_ITEM_IDS) {
      __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId,
      }, context.dependencies);
    }
    const primaryScore = JSON.parse(readFileSync(join(
      cellAbsolute(context.privateRoot, "gate1-primary", "YT-01"),
      "a1-score.publication-safe.json",
    ), "utf8")) as A1PrivateScoreSummary;

    const repeat = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot: context.projectRoot,
      privateEvidenceRoot: context.privateRoot,
      stage: "gate3-repeat",
      itemId: "YT-01",
    }, context.dependencies);
    assert.equal(repeat.cell.stage, "gate3-repeat");
    const repeatOptions = JSON.parse(readFileSync(join(
      cellAbsolute(context.privateRoot, "gate3-repeat", "YT-01"),
      "a1-score-options.private.json",
    ), "utf8")) as A1PrivateScorerOptions;
    assert.equal(
      repeatOptions.comparison_canonical_output_sha256,
      primaryScore.hashes.canonical_normalized_output_sha256,
    );
    const repeatScore = JSON.parse(readFileSync(join(
      cellAbsolute(context.privateRoot, "gate3-repeat", "YT-01"),
      "a1-score.publication-safe.json",
    ), "utf8")) as A1PrivateScoreSummary;
    assert.equal(repeatScore.hashes.canonical_output_comparison, "verified_equal");
  });

  test("repeat rejects semantically equal normalized JSON when its exact bytes differ", (t) => {
    const context = createTestContext();
    t.after(() => rmSync(context.base, { recursive: true, force: true }));
    for (const itemId of A1_PRIMARY_ITEM_IDS) {
      __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate1-primary",
        itemId,
      }, context.dependencies);
    }
    const requestsBefore = context.requests.length;
    assert.throws(
      () => __testOnlyRunSealedA1CellWithDependencies({
        projectRoot: context.projectRoot,
        privateEvidenceRoot: context.privateRoot,
        stage: "gate3-repeat",
        itemId: "YT-01",
      }, {
        ...context.dependencies,
        runChild: (request) => runTamperedPositiveHarness(
          request,
          context.authorities,
          () => undefined,
          true,
        ),
      }),
      hasCode("A1_OPERATOR_ORACLE_FAILED"),
    );
    assert.equal(context.requests.length, requestsBefore);
    const primaryBytes = readFileSync(join(
      cellAbsolute(context.privateRoot, "gate1-primary", "YT-01"),
      "a1-normalized-transcript.private.json",
    ));
    const repeatBytes = readFileSync(join(
      cellAbsolute(context.privateRoot, "gate3-repeat", "YT-01"),
      "a1-normalized-transcript.private.json",
    ));
    assert.deepEqual(JSON.parse(repeatBytes.toString("utf8")), JSON.parse(primaryBytes.toString("utf8")));
    assert.notEqual(sha256(repeatBytes), sha256(primaryBytes));
    const terminal = parseA1AttemptTerminalFailure(readFileSync(
      terminalAbsolute(context.projectRoot, "gate3-repeat", "YT-01"),
    ));
    assert.equal(terminal.terminal.error_code, "A1_OPERATOR_ORACLE_FAILED");
  });

  test("two concurrent private roots atomically admit exactly one authoritative-worktree attempt", async (t) => {
    const context = createTestContext();
    const markerRoot = join(context.base, "concurrency-markers");
    const secondPrivateRoot = join(context.base, "second-private-evidence");
    mkdirPrivate(markerRoot);
    mkdirPrivate(secondPrivateRoot);
    seedPrivateRootFromAuthorities(context.privateRoot, secondPrivateRoot, context.authorities);
    t.after(() => rmSync(context.base, { recursive: true, force: true }));

    const workers = [
      spawnConcurrencyWorker(context, markerRoot),
      spawnConcurrencyWorker(context, markerRoot, true, secondPrivateRoot),
    ];
    await waitUntil(() => readdirSync(markerRoot).filter((name) => name.startsWith("ready-")).length === 2);
    writePrivateExclusive(join(markerRoot, "release"), Buffer.from("release\n"));
    const results = await Promise.all(workers.map(collectChild));

    assert.deepEqual(results.map((result) => result.exitCode).sort(), [0, 1]);
    assert.equal(
      readdirSync(markerRoot).filter((name) => name.startsWith("child-")).length,
      1,
      "only the exclusive cell winner may begin the harness",
    );
    const loser = results.find((result) => result.exitCode === 1)!;
    assert.match(loser.stdout, /A1_OPERATOR_ATTEMPT_CLAIM_EXISTS/);

    const winningPrivateRoot = [context.privateRoot, secondPrivateRoot].find((root) =>
      existsSync(cellAbsolute(root, "gate1-primary", "YT-03")))!;
    assert.ok(winningPrivateRoot);
    const losingPrivateRoot = winningPrivateRoot === context.privateRoot
      ? secondPrivateRoot
      : context.privateRoot;
    assert.equal(
      existsSync(join(losingPrivateRoot, "outputs")),
      false,
      "the public-claim loser must not create any private output parent",
    );
    const cell = cellAbsolute(winningPrivateRoot, "gate1-primary", "YT-03");
    assert.deepEqual(readdirSync(cell), ["harness-report.publication-safe.json"]);
    const winnerSnapshot = snapshotTree(join(winningPrivateRoot, "outputs"));

    const third = spawnConcurrencyWorker(context, markerRoot, false, winningPrivateRoot);
    const thirdResult = await collectChild(third);
    assert.equal(thirdResult.exitCode, 1);
    assert.deepEqual(snapshotTree(join(winningPrivateRoot, "outputs")), winnerSnapshot);
    assert.equal(readdirSync(markerRoot).filter((name) => name.startsWith("child-")).length, 1);
  });
}

function createTestContext(): TestContext {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "sealed-a1-operator-")));
  chmodSync(base, 0o700);
  const projectRoot = join(base, "project");
  const privateRoot = join(base, "private-evidence");
  mkdirPrivate(projectRoot);
  mkdirPrivate(privateRoot);
  const authorities = buildAuthorities(projectRoot, privateRoot, true);
  const requests: A1SealedChildRequest[] = [];
  const dependencies: Partial<A1OperatorDependencies> = {
    verifySeal: () => syntheticSeal(),
    loadAuthorities: () => authorities,
    evaluateScore: syntheticScore,
    serializeScore: serializeA1PrivateScore,
    runChild: (request) => {
      requests.push(request);
      return runSyntheticChild(request, authorities);
    },
  };
  return { base, projectRoot, privateRoot, authorities, requests, dependencies };
}

function buildAuthorities(
  projectRoot: string,
  privateRoot: string,
  seedFiles: boolean,
): ReadonlyMap<A1ItemId, A1SealedAuthority> {
  if (seedFiles) {
    mkdirPrivate(join(privateRoot, "inputs"));
    mkdirPrivate(join(privateRoot, "references"));
    mkdirPrivate(join(projectRoot, "attestations"));
  }
  const result = new Map<A1ItemId, A1SealedAuthority>();
  for (const [index, itemId] of A1_PRIMARY_ITEM_IDS.entries()) {
    const inputBytes = Buffer.from(`WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n${itemId}\n`, "utf8");
    const anchorBytes = Buffer.from(`{"anchors":"${itemId}"}\n`, "utf8");
    const positive = (A1_POSITIVE_ITEM_IDS as readonly string[]).includes(itemId);
    const supported = itemId === "YT-04";
    const inputRelativePath = `inputs/${itemId}.vtt`;
    const hasPreparation = positive || supported;
    const anchorRelativePath = hasPreparation ? `references/${itemId}.anchors.private.json` : null;
    const attestationPath = join(projectRoot, "attestations", `${itemId}.json`);
    if (seedFiles) {
      writePrivateExclusive(join(privateRoot, inputRelativePath), inputBytes);
      if (anchorRelativePath) writePrivateExclusive(join(privateRoot, anchorRelativePath), anchorBytes);
      writePrivateExclusive(attestationPath, Buffer.from(`{"item_id":"${itemId}"}\n`));
    }
    const sourceCanonicalSha256 = positive || supported
      ? sha256(Buffer.from(`canonical-${itemId}`))
      : null;
    const attestation = {
      item_id: itemId,
      youtube_video_id: `TESTVID${String(index + 1).padStart(4, "0")}`,
      source: {
        private_relative_path: inputRelativePath,
        sidecar_sha256: sha256(inputBytes),
        source_page_url: `https://example.invalid/watch/${itemId}`,
        sidecar_url: `https://example.invalid/captions/${itemId}.vtt`,
      },
      input_contract: {
        format: "vtt",
        language_tag: "en-US",
        declared_duration_ms: 1_000,
        expected_cue_count: 1,
        last_cue_end_ms: 1_000,
        content_completeness: {
          state: supported ? "unknown" : "complete",
          basis: supported ? "unknown" : "explicit_source_assertion",
        },
        expected_class: positive ? "eligible_supported" : "expected_safe_rejection",
      },
    } as unknown as A1Attestation;
    result.set(itemId, {
      itemId,
      attestation,
      attestationPath,
      ledger: {
        item_id: itemId,
        state: positive
          ? "ready"
          : supported
            ? "expected_supported_class_rejection"
            : "expected_structural_rejection",
        reference_role: positive
          ? "a1_input_preservation_oracle"
          : "a1_safe_rejection_record",
        attestation_sha256: sha256(Buffer.from(`attestation-${itemId}`)),
        source_raw_sha256: sha256(inputBytes),
        source_canonical_sha256: sourceCanonicalSha256,
        source_bytes: inputBytes.byteLength,
        normalized_text_character_count: positive || supported ? itemId.length : null,
        cue_count: 1,
        declared_duration_ms: 1_000,
        last_cue_end_ms: 1_000,
        actual_anchor_count: positive ? 1 : 0,
        base_anchor_target: positive ? 1 : 10,
        preparation_document_sha256: hasPreparation ? sha256(anchorBytes) : null,
        preparation_private_relative_path: anchorRelativePath,
        expected_class: positive ? "eligible_supported" : "expected_safe_rejection",
        content_completeness_state: supported ? "unknown" : "complete",
      },
    } as A1SealedAuthority);
  }
  return result;
}

function seedPrivateRootFromAuthorities(
  sourceRoot: string,
  targetRoot: string,
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>,
): void {
  mkdirPrivate(join(targetRoot, "inputs"));
  mkdirPrivate(join(targetRoot, "references"));
  for (const authority of authorities.values()) {
    const inputRelative = authority.attestation.source.private_relative_path;
    writePrivateExclusive(
      join(targetRoot, inputRelative),
      readFileSync(join(sourceRoot, inputRelative)),
    );
    const anchorRelative = authority.ledger.preparation_private_relative_path;
    if (anchorRelative) {
      writePrivateExclusive(
        join(targetRoot, anchorRelative),
        readFileSync(join(sourceRoot, anchorRelative)),
      );
    }
  }
}

function runSyntheticChild(
  request: A1SealedChildRequest,
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>,
): A1SealedChildResult {
  if (request.kind === "harness") {
    const attestationPath = optionValue(request.args, "--attestation");
    const itemId = basename(attestationPath, ".json") as A1ItemId;
    const authority = authorities.get(itemId)!;
    const cellPath = optionValue(request.args, "--private-output-dir");
    if ((A1_POSITIVE_ITEM_IDS as readonly string[]).includes(itemId)) {
      const normalizedBytes = syntheticNormalizedTranscript(authority);
      writePrivateExclusive(join(cellPath, "a1-normalized-transcript.private.json"), normalizedBytes);
      createSyntheticDatabase(join(cellPath, "throwaway.sqlite"), authority, normalizedBytes);
      return childResult(0, positiveHarnessReport(authority, normalizedBytes));
    }
    if (itemId === "YT-04") return childResult(0, supportedHarnessReport(authority));
    return childResult(1, structuralHarnessReport());
  }

  const options = JSON.parse(
    readFileSync(optionValue(request.args, "--options"), "utf8"),
  ) as A1PrivateScorerOptions;
  const normalizedBytes = readFileSync(optionValue(request.args, "--normalized-output"));
  return childResult(0, syntheticScore(Buffer.from("input"), Buffer.from("anchors"), normalizedBytes, options), true);
}

function runTamperedPositiveHarness(
  request: A1SealedChildRequest,
  authorities: ReadonlyMap<A1ItemId, A1SealedAuthority>,
  mutate: (normalized: Record<string, unknown>) => void,
  pretty = false,
): A1SealedChildResult {
  assert.equal(request.kind, "harness");
  const itemId = basename(optionValue(request.args, "--attestation"), ".json") as A1ItemId;
  const authority = authorities.get(itemId)!;
  const normalized = JSON.parse(
    syntheticNormalizedTranscript(authority).toString("utf8"),
  ) as Record<string, unknown>;
  mutate(normalized);
  const normalizedBytes = Buffer.from(
    `${JSON.stringify(normalized, null, pretty ? 2 : undefined)}\n`,
    "utf8",
  );
  const cellPath = optionValue(request.args, "--private-output-dir");
  writePrivateExclusive(join(cellPath, "a1-normalized-transcript.private.json"), normalizedBytes);
  createSyntheticDatabase(join(cellPath, "throwaway.sqlite"), authority, normalizedBytes);
  return childResult(0, positiveHarnessReport(authority, normalizedBytes));
}

function syntheticNormalizedTranscript(authority: A1SealedAuthority): Buffer {
  const value = {
    schema_version: "1.0",
    item_id: authority.itemId,
    youtube_video_id: authority.attestation.youtube_video_id,
    source_method: "A1",
    language: "en-US",
    caption_type: "source_provided_unknown_authorship",
    timestamp_mode: "timestamped",
    completeness: {
      state: "complete",
      basis: "explicit_source_assertion",
      source_duration_ms: 1_000,
      last_cue_end_ms: 1_000,
      trailing_gap_ms: 0,
    },
    provenance: {
      source_page_url: authority.attestation.source.source_page_url,
      source_asset_url: authority.attestation.source.sidecar_url,
      input_sha256: authority.ledger.source_raw_sha256,
      reference_role: "input_preservation",
      version_equivalence: "official_row_level_publication_association",
      acquired_at: "2026-07-18T00:00:00Z",
    },
    processing_version: "a1-harness-1.0.0+preflight-1.0.0+test-parser",
    segments: [{
      index: 0,
      start_ms: 0,
      end_ms: 1_000,
      source_start_ms: 0,
      source_end_ms: 1_000,
      text: authority.itemId,
      source_cue_ids: ["1"],
    }],
    errors: [],
  };
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function createSyntheticDatabase(
  databasePath: string,
  authority: A1SealedAuthority,
  normalizedBytes: Buffer,
): void {
  const normalized = JSON.parse(normalizedBytes.toString("utf8")) as {
    segments: Array<{ start_ms: number; end_ms: number; text: string }>;
  };
  const body = normalized.segments.map((segment) => segment.text).join("\n\n");
  const itemKey = `item-${authority.itemId}`;
  const policyKey = `policy-${authority.itemId}`;
  const sourceKey = `source-${authority.itemId}`;
  const sourceUrl = `https://www.youtube.com/watch?v=${authority.attestation.youtube_video_id}`;
  const database = new Database(databasePath);
  try {
    database.exec(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY, source_type TEXT, capture_source TEXT, source_url TEXT,
        title TEXT, author TEXT, body TEXT, summary TEXT, category TEXT,
        enrichment_state TEXT, extraction_warning TEXT, total_chars INTEGER,
        duration_seconds REAL, source_platform TEXT, capture_quality TEXT,
        extraction_method TEXT, extraction_version TEXT, enriched_at INTEGER, batch_id TEXT
      );
      CREATE TABLE capture_policy_decisions (
        id TEXT PRIMARY KEY, item_id TEXT, source_url TEXT, platform TEXT,
        environment TEXT, rights_basis TEXT, method TEXT, retention_class TEXT,
        blocked_reason TEXT, production_allowed INTEGER, legal_approval_id TEXT
      );
      CREATE TABLE transcript_sources (
        id TEXT PRIMARY KEY, item_id TEXT, policy_decision_id TEXT, source_kind TEXT,
        language_code TEXT, caption_source_class TEXT, timestamp_mode TEXT,
        provenance_json TEXT, retention_class TEXT, text_sha256 TEXT,
        segment_count INTEGER, status TEXT
      );
      CREATE TABLE transcript_segments (
        transcript_source_id TEXT, item_id TEXT, idx INTEGER, start_ms INTEGER,
        duration_ms INTEGER, end_ms INTEGER, text TEXT, text_sha256 TEXT,
        token_count INTEGER, confidence REAL
      );
      CREATE TABLE transcript_jobs (
        id INTEGER PRIMARY KEY, item_id TEXT, source_platform TEXT, video_id TEXT,
        state TEXT, attempts INTEGER, max_attempts INTEGER, claimed_at INTEGER,
        completed_at INTEGER, last_attempt_id TEXT, last_provider TEXT,
        last_error_code TEXT, last_error_message TEXT
      );
      CREATE TABLE transcript_attempts (id INTEGER PRIMARY KEY);
      CREATE TABLE enrichment_jobs (
        id INTEGER PRIMARY KEY, item_id TEXT, state TEXT, attempts INTEGER,
        last_error TEXT, claimed_at INTEGER, completed_at INTEGER
      );
      CREATE TABLE llm_usage (id INTEGER PRIMARY KEY);
      CREATE TABLE embedding_jobs (id INTEGER PRIMARY KEY, item_id TEXT);
    `);
    database.prepare(`
      INSERT INTO items VALUES (?, 'youtube', 'system', ?, 'Isolated A1 sidecar seed',
        NULL, ?, NULL, NULL, 'pending', NULL, ?, 1, 'youtube',
        'user_provided_full_text', 'manual_repair_transcript', 'capture-v0.7.5', NULL, NULL)
    `).run(itemKey, sourceUrl, body, body.length);
    database.prepare(`
      INSERT INTO capture_policy_decisions VALUES (
        ?, ?, ?, 'youtube', 'lab', 'user_provided_transcript', 'uploaded_file',
        'full_text_allowed', NULL, 1, NULL)
    `).run(policyKey, itemKey, sourceUrl);
    const provenance = {
      input_type: "file",
      policy_decision_id: policyKey,
      original_filename: basename(authority.attestation.source.private_relative_path),
      extension: ".vtt",
      content_type: "text/vtt",
      byte_count: authority.ledger.source_bytes,
      parser_version: "transcript-file-v1",
      timestamp_mode: "timestamped",
      normalized_char_count: body.length,
      segment_count: normalized.segments.length,
      retention_class: "full_text_allowed",
    };
    database.prepare(`
      INSERT INTO transcript_sources VALUES (
        ?, ?, ?, 'uploaded_file', 'en-us', 'user_provided', 'timestamped', ?,
        'full_text_allowed', ?, 1, 'active')
    `).run(sourceKey, itemKey, policyKey, JSON.stringify(provenance), sha256(body));
    database.prepare(`
      INSERT INTO transcript_segments VALUES (?, ?, 0, 0, 1000, 1000, ?, ?, 1, NULL)
    `).run(sourceKey, itemKey, body, sha256(body));
    database.prepare(`
      INSERT INTO transcript_jobs VALUES (
        1, ?, 'youtube', NULL, 'pending', 0, 5, NULL, NULL, NULL, NULL, NULL, NULL)
    `).run(itemKey);
    database.prepare(`
      INSERT INTO enrichment_jobs VALUES (1, ?, 'pending', 0, NULL, NULL, NULL)
    `).run(itemKey);
  } finally {
    database.close();
  }
  chmodSync(databasePath, 0o600);
}

function positiveHarnessReport(authority: A1SealedAuthority, normalizedBytes: Buffer): unknown {
  return {
    schema_version: "1.0",
    harness_version: "1.0.0",
    execution_class: "SEALED",
    claim_scope: "locked_cell_only",
    status: "pass",
    hashes: {
      attestation_sha256: authority.ledger.attestation_sha256,
      attestation_schema_sha256: "4".repeat(64),
      input_sha256: authority.ledger.source_raw_sha256,
      video_id_sha256: sha256(authority.attestation.youtube_video_id),
      preflight_canonical_sha256: authority.ledger.source_canonical_sha256,
      expected_segments_sha256: "5".repeat(64),
      persisted_segments_sha256: "5".repeat(64),
      normalized_transcript_sha256: sha256(normalizedBytes),
      normalized_transcript_schema_sha256: "6".repeat(64),
      benchmark_lock_sha256: LOCK_SHA256,
    },
    counts: {
      attestation_part_count: 6,
      raw_byte_count: authority.ledger.source_bytes,
      normalized_text_character_count: authority.ledger.normalized_text_character_count,
      locked_cue_count: authority.ledger.cue_count,
      declared_duration_ms: authority.ledger.declared_duration_ms,
      last_cue_end_ms: authority.ledger.last_cue_end_ms,
      persisted_segment_count: authority.ledger.cue_count,
      overlap_count: 0,
      exact_duplicate_count: 0,
      recovery_job_count: 1,
      transcript_provider_attempt_count: 0,
      enrichment_provider_attempt_count: 0,
      llm_provider_attempt_count: 0,
      provider_attempt_count: 0,
      network_attempt_count: 0,
      current_product_gap_count: 5,
    },
    versions: { strict_preflight: "1.0.0", app_file_parser: "transcript-file-v1" },
    classification: {
      locked: "eligible_supported",
      observed: "eligible_supported",
      content_completeness: authority.attestation.input_contract.content_completeness.state,
      content_completeness_basis: authority.attestation.input_contract.content_completeness.basis,
    },
    network_attempts: [],
    outcomes: {
      isolated_a1_strategy: {
        ingestion_invoked: true,
        feasible: true,
        exact_segment_match: true,
        no_network_attempt: true,
        no_provider_attempt: true,
      },
      current_product: { ready: false, known_gap_codes: PRODUCT_GAPS },
    },
    runtime: { suppressed_console_count: 0, suppressed_console_sha256: EMPTY_SHA256 },
  };
}

function supportedHarnessReport(authority: A1SealedAuthority): unknown {
  return {
    schema_version: "1.0",
    harness_version: "1.0.0",
    execution_class: "SEALED",
    claim_scope: "locked_cell_only",
    status: "safe_rejection",
    hashes: {
      attestation_sha256: authority.ledger.attestation_sha256,
      attestation_schema_sha256: "4".repeat(64),
      input_sha256: authority.ledger.source_raw_sha256,
      video_id_sha256: sha256(authority.attestation.youtube_video_id),
      preflight_canonical_sha256: authority.ledger.source_canonical_sha256,
      normalized_transcript_schema_sha256: "6".repeat(64),
      benchmark_lock_sha256: LOCK_SHA256,
    },
    counts: {
      attestation_part_count: 6,
      raw_byte_count: authority.ledger.source_bytes,
      normalized_text_character_count: authority.ledger.normalized_text_character_count,
      locked_cue_count: authority.ledger.cue_count,
      declared_duration_ms: authority.ledger.declared_duration_ms,
      last_cue_end_ms: authority.ledger.last_cue_end_ms,
      overlap_count: 0,
      exact_duplicate_count: 0,
      persisted_segment_count: 0,
      recovery_job_count: 0,
      enrichment_provider_attempt_count: 0,
      provider_attempt_count: 0,
      network_attempt_count: 0,
      current_product_gap_count: 5,
    },
    versions: { strict_preflight: "1.0.0" },
    classification: {
      locked: "expected_safe_rejection",
      observed: "expected_safe_rejection",
      content_completeness: "unknown",
      content_completeness_basis: "unknown",
    },
    network_attempts: [],
    outcomes: {
      isolated_a1_strategy: {
        ingestion_invoked: false,
        truthful_safe_rejection: true,
        no_network_attempt: true,
        no_provider_attempt: true,
      },
      current_product: { ready: false, known_gap_codes: PRODUCT_GAPS },
    },
    runtime: { suppressed_console_count: 0, suppressed_console_sha256: EMPTY_SHA256 },
  };
}

function structuralHarnessReport(): unknown {
  return {
    schema_version: "1.0",
    harness_version: "1.0.0",
    status: "fail",
    error_code: "PREFLIGHT_REJECTED",
    detail_code: "INVALID_STRUCTURE",
    counts: { network_attempt_count: 0, suppressed_console_count: 0 },
    hashes: { suppressed_console_sha256: EMPTY_SHA256 },
    network_attempts: [],
  };
}

function syntheticScore(
  _subtitleBytes: Uint8Array,
  _anchorBytes: Uint8Array,
  normalizedBytes: Uint8Array,
  options: A1PrivateScorerOptions,
): A1PrivateScoreSummary {
  const normalizedHash = sha256(normalizedBytes);
  const canonicalHash = sha256(Buffer.from(`canonical-${normalizedHash}`));
  if (
    options.comparison_canonical_output_sha256 !== null
    && options.comparison_canonical_output_sha256 !== canonicalHash
  ) throw new Error("comparison mismatch");
  return {
    schema_version: "1.0",
    evaluator_version: "1.1.0",
    versions: { scorer: "1.1.0", subtitle_preflight: "1.0.0", anchor_generator: "1.1.0" },
    hashes: {
      input_raw_sha256: options.expected_raw_sha256,
      input_canonical_sha256: "7".repeat(64),
      anchor_packet_sha256: options.expected_anchor_packet_sha256,
      normalized_output_file_sha256: normalizedHash,
      canonical_normalized_output_sha256: canonicalHash,
      canonical_output_comparison: options.comparison_canonical_output_sha256 === null
        ? "not_requested"
        : "verified_equal",
    },
    preservation: {
      reference_token_count: 1,
      output_token_count: 1,
      lcs_token_count: 1,
      token_preservation_rate: 1,
    },
    timestamp_anchors: {
      actual_count: 1,
      base_target_count: 1,
      matched_count: 1,
      unmatched_count: 0,
      ambiguous_count: 0,
      match_rate: 1,
      match_rate_wilson_95: { successes: 1, total: 1, confidence: 0.95, lower: 0.2, upper: 1 },
      median_error_ms: 0,
      p90_error_ms: 0,
    },
  };
}

function childResult(exitCode: number, value: unknown, score = false): A1SealedChildResult {
  const stdout = score
    ? Buffer.from(serializeA1PrivateScore(value as A1PrivateScoreSummary), "utf8")
    : Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  return { exitCode, signal: null, timedOut: false, stdout, stderr: Buffer.alloc(0) };
}

function syntheticSeal(): LockVerificationReport {
  return {
    verifierVersion: "3.3.0",
    contentCommit: CONTENT_COMMIT,
    sealCommit: SEAL_COMMIT,
    headCommit: SEAL_COMMIT,
    lockPath: "docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json",
    lockSha256: LOCK_SHA256,
    verifiedFrozenFileCount: 100,
    valid: true,
  };
}

function assertFixedHarnessCommand(request: A1SealedChildRequest): void {
  assert.equal(request.kind, "harness");
  assert.equal(request.executable, "/usr/bin/sandbox-exec");
  assert.equal(request.args[0], "-p");
  assert.match(request.args[1]!, /^\(version 1\).*\(deny network\*\).*\(deny file-read\*\).*\(deny file-write\*\)/);
  assert.equal(request.args[2], "/usr/bin/env");
  assert.equal(request.args[3], "-i");
  assert.equal(
    request.args[4],
    "PATH=/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin",
  );
  assert.match(request.args[5]!, /^HOME=/);
  assert.match(request.args[6]!, /^TMPDIR=/);
  assert.equal(request.args[7], "TSX_DISABLE_CACHE=1");
  assert.equal(request.timeoutMs, 120_000);
  assert.ok(request.args.includes("BRAIN_TRANSCRIPT_ENV=lab"));
  assert.ok(request.args.includes("YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED=0"));
  assert.ok(request.args.includes("YOUTUBE_TRANSCRIPT_WORKER_ENABLED=0"));
  assert.equal(optionValue(request.args, "--execution-class"), "SEALED");
}

function assertFixedScorerCommand(request: A1SealedChildRequest): void {
  assert.equal(request.kind, "scorer");
  assert.equal(request.executable, "/usr/bin/sandbox-exec");
  assert.equal(request.args[0], "-p");
  assert.match(request.args[1]!, /^\(version 1\).*\(deny network\*\).*\(deny file-read\*\).*\(deny file-write\*\)/);
  assert.equal(request.args[2], "/usr/bin/env");
  assert.equal(request.args[3], "-i");
  assert.equal(
    request.args[4],
    "PATH=/Library/Developer/CommandLineTools/usr/bin:/usr/bin:/bin",
  );
  assert.match(request.args[5]!, /^HOME=/);
  assert.match(request.args[6]!, /^TMPDIR=/);
  assert.equal(request.args[7], "TSX_DISABLE_CACHE=1");
  assert.equal(request.args[8], "/opt/homebrew/opt/node@22/bin/node");
  assert.equal(request.args[9], "--import");
  assert.equal(request.timeoutMs, 120_000);
  assert.ok(request.args.includes("docs/feature-council/youtube-transcript-enrichment/benchmark/tools/score-private-a1.ts"));
}

function optionValue(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  assert.notEqual(index, -1, `missing ${flag}`);
  const value = args[index + 1];
  assert.ok(value, `missing value for ${flag}`);
  return value;
}

function mkdirPrivate(path: string): void {
  mkdirSync(path, { mode: 0o700 });
  chmodSync(path, 0o700);
}

function writePrivateExclusive(path: string, bytes: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const descriptor = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, bytes);
  } finally {
    closeSync(descriptor);
  }
  chmodSync(path, 0o600);
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function cellAbsolute(root: string, stage: string, itemId: string): string {
  return join(root, "outputs", SEAL_COMMIT, stage, itemId);
}

function receiptAbsolute(root: string, stage: string, itemId: string): string {
  return join(
    root,
    "outputs",
    SEAL_COMMIT,
    "operator-receipts",
    stage,
    `${itemId}.publication-safe.json`,
  );
}

function claimAbsolute(root: string, stage: string, itemId: string): string {
  return join(
    root,
    "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims",
    SEAL_COMMIT,
    stage,
    `${itemId}.publication-safe.json`,
  );
}

function terminalAbsolute(root: string, stage: string, itemId: string): string {
  return join(
    root,
    "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-terminals",
    SEAL_COMMIT,
    stage,
    `${itemId}.publication-safe.json`,
  );
}

function snapshotTree(root: string): Record<string, SnapshotEntry> {
  const result: Record<string, SnapshotEntry> = {};
  const walk = (path: string, relativePath: string): void => {
    const info = lstatSync(path);
    if (info.isDirectory()) {
      result[relativePath || "."] = {
        kind: "directory",
        mode: info.mode & 0o777,
        nlink: info.nlink,
      };
      for (const name of readdirSync(path).sort()) walk(join(path, name), join(relativePath, name));
    } else {
      result[relativePath] = {
        kind: "file",
        mode: info.mode & 0o777,
        nlink: info.nlink,
        bytes: readFileSync(path).toString("base64"),
      };
    }
  };
  walk(root, "");
  return result;
}

function hasCode(code: string): (error: unknown) => boolean {
  return (error: unknown) => error instanceof A1OperatorError && error.code === code;
}

function spawnConcurrencyWorker(
  context: TestContext,
  markerRoot: string,
  barrier = true,
  privateRoot = context.privateRoot,
) {
  return spawn(process.execPath, [
    "--import",
    "tsx",
    fileURLToPath(import.meta.url),
    context.projectRoot,
    privateRoot,
    markerRoot,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      A1_OPERATOR_CONCURRENCY_WORKER: "1",
      A1_OPERATOR_CONCURRENCY_BARRIER: barrier ? "1" : "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function collectChild(child: ReturnType<typeof spawn>): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
  return await new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolvePromise({
      exitCode: code ?? -1,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    }));
  });
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("concurrency workers did not reach their barrier");
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
}

function runConcurrencyWorker(): void {
  const [projectRoot, privateRoot, markerRoot] = process.argv.slice(2);
  if (!projectRoot || !privateRoot || !markerRoot) {
    process.stdout.write(`${JSON.stringify({ state: "failed", code: "WORKER_ARGUMENT_INVALID" })}\n`);
    process.exitCode = 2;
    return;
  }
  const authorities = buildAuthorities(projectRoot, privateRoot, false);
  const barrier = process.env.A1_OPERATOR_CONCURRENCY_BARRIER === "1";
  const dependencies: Partial<A1OperatorDependencies> = {
    verifySeal: () => syntheticSeal(),
    loadAuthorities: () => {
      if (barrier) {
        writePrivateExclusive(join(markerRoot, `ready-${process.pid}`), Buffer.from("ready\n"));
        const view = new Int32Array(new SharedArrayBuffer(4));
        const deadline = Date.now() + 10_000;
        while (!existsSync(join(markerRoot, "release"))) {
          if (Date.now() > deadline) throw new Error("barrier timeout");
          Atomics.wait(view, 0, 0, 10);
        }
      }
      return authorities;
    },
    evaluateScore: syntheticScore,
    serializeScore: serializeA1PrivateScore,
    runChild: (request) => {
      writePrivateExclusive(join(markerRoot, `child-${process.pid}`), Buffer.from("child\n"));
      return runSyntheticChild(request, authorities);
    },
  };
  try {
    const result = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot,
      privateEvidenceRoot: privateRoot,
      stage: "gate1-primary",
      itemId: "YT-03",
    }, dependencies);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    const code = error instanceof A1OperatorError ? error.code : "WORKER_INTERNAL_ERROR";
    process.stdout.write(`${JSON.stringify({ state: "failed", code })}\n`);
    process.exitCode = 1;
  }
}

function runCrashWorker(): void {
  const [projectRoot, privateRoot] = process.argv.slice(2);
  if (!projectRoot || !privateRoot) {
    process.exitCode = 2;
    return;
  }
  const authorities = buildAuthorities(projectRoot, privateRoot, false);
  __testOnlyRunSealedA1CellWithDependencies({
    projectRoot,
    privateEvidenceRoot: privateRoot,
    stage: "gate1-primary",
    itemId: "YT-01",
  }, {
    verifySeal: () => syntheticSeal(),
    loadAuthorities: () => authorities,
    evaluateScore: syntheticScore,
    serializeScore: serializeA1PrivateScore,
    runChild: () => {
      process.kill(process.pid, "SIGKILL");
      throw new Error("unreachable");
    },
  });
}
