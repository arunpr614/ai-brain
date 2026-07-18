import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

import {
  evaluatePrivateA1,
  serializeA1PrivateScore,
  type A1PrivateScorerOptions,
} from "../score-private-a1";
import {
  A1_POSITIVE_ITEM_IDS,
  A1_PRIMARY_ITEM_IDS,
  __testOnlyRunSealedA1CellWithDependencies,
  type A1ItemId,
  type A1OperatorDependencies,
  type A1SealedAuthority,
  type A1SealedChildRequest,
  type A1SealedChildResult,
} from "../run-sealed-a1-cell";

import {
  deriveGate3Result,
  Gate3EvidenceError,
  serializeGate3Result,
  verifyGate3EvidenceChain,
  writeGate3ResultExclusive,
} from "../gate3-evidence";
import {
  DEV_GATE3_BINDING,
  installGate3DevFixture,
} from "../../../spikes/model-harness/tests/gate3-dev-fixture";

function childOption(request: A1SealedChildRequest, flag: string): string {
  const index = request.args.indexOf(flag);
  assert.notEqual(index, -1, `missing child option ${flag}`);
  const value = request.args[index + 1];
  assert.ok(value, `missing child option value for ${flag}`);
  return value;
}

test("derives one canonical 5-positive/4-rejection Gate 3 result and admits only its exact model input", async () => {
  const base = await mkdtemp(path.join(tmpdir(), "gate3-evidence-tool-"));
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  await mkdir(projectRoot, { mode: 0o700 });
  const fixture = await installGate3DevFixture(projectRoot, privateEvidenceRoot);
  const derived = await deriveGate3Result({
    projectRoot,
    privateEvidenceRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });
  const canonicalResultPath = path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json",
  );
  const canonicalResultInfo = await lstat(canonicalResultPath);
  assert.equal(canonicalResultInfo.isFile(), true);
  assert.equal(canonicalResultInfo.isSymbolicLink(), false);
  assert.equal(canonicalResultInfo.mode & 0o777, 0o644);
  assert.equal(canonicalResultInfo.nlink, 1);
  assert.equal(derived.schema_version, "2.1");
  assert.equal(derived.generator_version, "1.1.0");
  assert.deepEqual(derived.items.map((item) => item.item_id), ["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"]);
  assert.deepEqual(derived.rejection_controls.map((item) => item.item_id), ["YT-03", "YT-04", "YT-05", "YT-06"]);
  assert.deepEqual(derived.denominators, {
    gate_1_positive_expected: 5,
    gate_1_positive_passed: 5,
    gate_1_rejection_expected: 4,
    gate_1_rejection_passed: 4,
    gate_3_repeat_expected: 5,
    gate_3_repeat_passed: 5,
  });
  const claimHashes = [
    ...derived.items.flatMap((item) => [
      item.gate_1_attempt_claim_sha256,
      item.gate_3_repeat_attempt_claim_sha256,
    ]),
    ...derived.rejection_controls.map((item) => item.gate_1_attempt_claim_sha256),
  ];
  assert.equal(claimHashes.length, 14);
  assert.equal(new Set(claimHashes).size, 14);
  const resultSchema = JSON.parse(await readFile(path.join(
    process.cwd(),
    "docs/feature-council/youtube-transcript-enrichment/benchmark/model/GATE_3_RESULT.schema.json",
  ), "utf8"));
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const validateResult = ajv.compile(resultSchema);
  assert.equal(validateResult(derived), true);
  const committedFormBytes = await readFile(path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json",
  ));
  assert.equal(committedFormBytes.toString("utf8"), serializeGate3Result(derived));
  await assert.rejects(
    verifyGate3EvidenceChain({
      projectRoot,
      privateEvidenceRoot,
      admittedNormalizedTranscriptPath: fixture.normalizedPath,
      itemId: "YT-01",
      binding: DEV_GATE3_BINDING,
      requireGitBound: false,
    }),
    (error: unknown) => error instanceof Gate3EvidenceError && error.code === "RESULT_INVALID",
  );
  const verified = await verifyGate3EvidenceChain({
    projectRoot,
    privateEvidenceRoot,
    admittedNormalizedTranscriptPath: fixture.normalizedPath,
    itemId: "YT-01",
    binding: DEV_GATE3_BINDING,
    requireGitBound: false,
    executionBoundary: "development_test_only",
  });
  assert.equal(verified.item.exact_run_1_repeat_model_input_file_hash_equal, true);
  assert.equal(verified.item.gate_1_normalized_output_file_sha256, verified.item.gate_3_repeat_normalized_output_file_sha256);
  assert.equal(verified.item.gate_1_normalized_output_file_sha256, verified.item.model_input_normalized_output_file_sha256);
  await assert.rejects(
    writeGate3ResultExclusive(projectRoot, derived),
    (error: unknown) => error instanceof Gate3EvidenceError && error.code === "RESULT_ALREADY_EXISTS",
  );
  assert.equal(
    await lstat(`${canonicalResultPath}.tmp-${process.pid}`).catch(() => null),
    null,
    "a losing exclusive writer must durably remove only its own staging link",
  );

  const claimRoot = path.join(
    projectRoot,
    `docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims/${DEV_GATE3_BINDING.sealCommit}`,
  );
  const deriveAgain = () => deriveGate3Result({
    projectRoot,
    privateEvidenceRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });
  const extraClaim = path.join(claimRoot, "unexpected.publication-safe.json");
  await writeFile(extraClaim, "{}\n", { mode: 0o600 });
  await assert.rejects(deriveAgain(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_INVALID"
  ));
  await rm(extraClaim);

  const terminalRoot = path.join(
    projectRoot,
    `docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-terminals/${DEV_GATE3_BINDING.sealCommit}`,
  );
  await mkdir(terminalRoot, { recursive: true, mode: 0o700 });
  await writeFile(path.join(terminalRoot, "unexpected.publication-safe.json"), "{}\n", { mode: 0o600 });
  await assert.rejects(deriveAgain(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_INVALID"
  ));
  await rm(terminalRoot, { recursive: true });

  const terminalAuthorityRoot = path.dirname(terminalRoot);
  const linkedTerminalTarget = path.join(base, "linked-empty-terminal-root");
  await rm(terminalAuthorityRoot, { recursive: true, force: true });
  await mkdir(linkedTerminalTarget, { mode: 0o700 });
  await symlink(linkedTerminalTarget, terminalAuthorityRoot);
  await assert.rejects(deriveAgain(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_PATH_INVALID"
  ));
  await rm(terminalAuthorityRoot);
  await rm(linkedTerminalTarget, { recursive: true });

  const extraPrivateCell = path.join(
    privateEvidenceRoot,
    `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/EXTRA`,
  );
  await mkdir(extraPrivateCell, { mode: 0o700 });
  await assert.rejects(deriveAgain(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_INVALID"
  ));
  await rm(extraPrivateCell, { recursive: true });

  const canonicalClaim = path.join(claimRoot, "gate1-primary/YT-01.publication-safe.json");
  const canonicalClaimBytes = await readFile(canonicalClaim);
  const linkedTarget = path.join(base, "linked-claim.json");
  await writeFile(linkedTarget, canonicalClaimBytes, { mode: 0o600 });
  await rm(canonicalClaim);
  await symlink(linkedTarget, canonicalClaim);
  await assert.rejects(deriveAgain(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_PATH_INVALID"
  ));
  await rm(canonicalClaim);
  await writeFile(canonicalClaim, canonicalClaimBytes, { mode: 0o600 });

  const unsafeProjectRoot = path.join(base, "unsafe-result-project");
  const unsafeDecisionParent = path.join(
    unsafeProjectRoot,
    "docs/feature-council/youtube-transcript-enrichment",
  );
  const linkedDecisionTarget = path.join(base, "linked-result-decisions");
  await mkdir(unsafeDecisionParent, { recursive: true, mode: 0o755 });
  await mkdir(linkedDecisionTarget, { mode: 0o755 });
  await symlink(linkedDecisionTarget, path.join(unsafeDecisionParent, "decisions"));
  await assert.rejects(
    writeGate3ResultExclusive(unsafeProjectRoot, derived),
    (error: unknown) => error instanceof Gate3EvidenceError && error.code === "EVIDENCE_PATH_INVALID",
  );
  assert.equal(
    await lstat(path.join(linkedDecisionTarget, "GATE_3_RESULT.json")).catch(() => null),
    null,
    "a linked repository parent must not redirect the canonical result write",
  );
});

test("the write-once operator supplies all 14 canonical attempts consumed by Gate 3", async (t) => {
  const base = await realpath(await mkdtemp(path.join(tmpdir(), "gate3-operator-chain-")));
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  await mkdir(projectRoot, { mode: 0o700 });
  const fixture = await installGate3DevFixture(projectRoot, privateEvidenceRoot);
  t.after(() => rm(base, { recursive: true, force: true }));

  type Stage = "gate1-primary" | "gate3-repeat";
  interface CachedHarnessCell {
    exitCode: number;
    report: Buffer;
    normalized: Buffer | null;
    database: Buffer | null;
  }
  const cachedCells = new Map<string, CachedHarnessCell>();
  for (const itemId of A1_PRIMARY_ITEM_IDS) {
    const positive = A1_POSITIVE_ITEM_IDS.some((positiveId) => positiveId === itemId);
    const stages: readonly Stage[] = positive
      ? ["gate1-primary", "gate3-repeat"]
      : ["gate1-primary"];
    for (const stage of stages) {
      const cellRoot = path.join(
        privateEvidenceRoot,
        `outputs/${DEV_GATE3_BINDING.sealCommit}/${stage}/${itemId}`,
      );
      cachedCells.set(`${stage}:${itemId}`, {
        exitCode: itemId === "YT-03" || itemId === "YT-05" || itemId === "YT-06" ? 1 : 0,
        report: await readFile(path.join(cellRoot, "harness-report.publication-safe.json")),
        normalized: positive
          ? await readFile(path.join(cellRoot, "a1-normalized-transcript.private.json"))
          : null,
        database: positive ? await readFile(path.join(cellRoot, "throwaway.sqlite")) : null,
      });
    }
  }

  const ledger = JSON.parse(await readFile(path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/benchmark/REFERENCE_LEDGER.json",
  ), "utf8")) as { items: Array<A1SealedAuthority["ledger"]> };
  const authorities = new Map<A1ItemId, A1SealedAuthority>();
  for (const ledgerItem of ledger.items) {
    const itemId = ledgerItem.item_id;
    const attestationPath = path.join(
      projectRoot,
      `docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/${itemId}.json`,
    );
    authorities.set(itemId, {
      itemId,
      ledger: ledgerItem,
      attestation: JSON.parse(await readFile(attestationPath, "utf8")) as A1SealedAuthority["attestation"],
      attestationPath,
    });
  }

  await rm(path.join(privateEvidenceRoot, "outputs"), { recursive: true, force: true });
  await rm(path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims",
  ), { recursive: true, force: true });
  await rm(path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json",
  ), { force: true });

  let childInvocationCount = 0;
  const runChild = (request: A1SealedChildRequest): A1SealedChildResult => {
    childInvocationCount += 1;
    if (request.kind === "harness") {
      const outputRoot = childOption(request, "--private-output-dir");
      const itemId = path.basename(outputRoot) as A1ItemId;
      const stage = path.basename(path.dirname(outputRoot)) as Stage;
      const cached = cachedCells.get(`${stage}:${itemId}`);
      assert.ok(cached, `missing cached harness cell ${stage}:${itemId}`);
      if (cached.normalized && cached.database) {
        for (const [name, bytes] of [
          ["a1-normalized-transcript.private.json", cached.normalized],
          ["throwaway.sqlite", cached.database],
        ] as const) {
          const destination = path.join(outputRoot, name);
          writeFileSync(destination, bytes, { mode: 0o600 });
          chmodSync(destination, 0o600);
        }
      }
      return {
        exitCode: cached.exitCode,
        signal: null,
        timedOut: false,
        stdout: cached.report,
        stderr: Buffer.alloc(0),
      };
    }

    const scorerOptions = JSON.parse(
      readFileSync(childOption(request, "--options"), "utf8"),
    ) as A1PrivateScorerOptions;
    const score = evaluatePrivateA1(
      readFileSync(childOption(request, "--subtitle")),
      readFileSync(childOption(request, "--anchors")),
      readFileSync(childOption(request, "--normalized-output")),
      scorerOptions,
    );
    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      stdout: Buffer.from(serializeA1PrivateScore(score), "utf8"),
      stderr: Buffer.alloc(0),
    };
  };
  const dependencies: Partial<A1OperatorDependencies> = {
    verifySeal: () => ({
      verifierVersion: "3.3.0",
      contentCommit: DEV_GATE3_BINDING.contentCommit,
      sealCommit: DEV_GATE3_BINDING.sealCommit,
      headCommit: DEV_GATE3_BINDING.sealCommit,
      lockPath:
        "docs/feature-council/youtube-transcript-enrichment/benchmark/LOCK.json",
      lockSha256: DEV_GATE3_BINDING.lockSha256,
      verifiedFrozenFileCount: 100,
      valid: true,
    }),
    loadAuthorities: () => authorities,
    runChild,
    evaluateScore: evaluatePrivateA1,
    serializeScore: serializeA1PrivateScore,
  };

  for (const itemId of A1_PRIMARY_ITEM_IDS) {
    const created = __testOnlyRunSealedA1CellWithDependencies({
      projectRoot,
      privateEvidenceRoot,
      stage: "gate1-primary",
      itemId,
    }, dependencies);
    assert.equal(created.execution_boundary, "development_test_only");
    assert.equal(created.publication_eligible, false);
  }
  for (const itemId of A1_POSITIVE_ITEM_IDS) {
    __testOnlyRunSealedA1CellWithDependencies({
      projectRoot,
      privateEvidenceRoot,
      stage: "gate3-repeat",
      itemId,
    }, dependencies);
  }
  assert.equal(childInvocationCount, 24, "14 harness plus 10 scorer processes must run");

  const derived = await deriveGate3Result({
    projectRoot,
    privateEvidenceRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });
  assert.deepEqual(derived.denominators, {
    gate_1_positive_expected: 5,
    gate_1_positive_passed: 5,
    gate_1_rejection_expected: 4,
    gate_1_rejection_passed: 4,
    gate_3_repeat_expected: 5,
    gate_3_repeat_passed: 5,
  });
  await writeGate3ResultExclusive(projectRoot, derived);
  const verified = await verifyGate3EvidenceChain({
    projectRoot,
    privateEvidenceRoot,
    admittedNormalizedTranscriptPath: fixture.normalizedPath,
    itemId: "YT-01",
    binding: DEV_GATE3_BINDING,
    requireGitBound: false,
    executionBoundary: "development_test_only",
  });
  assert.equal(verified.item.exact_run_1_repeat_model_input_file_hash_equal, true);
});

test("rejects authority role, state, preparation, and format mutations", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "gate3-authority-mutation-"));
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  await mkdir(projectRoot, { mode: 0o700 });
  await installGate3DevFixture(projectRoot, privateEvidenceRoot);
  t.after(() => rm(base, { recursive: true, force: true }));
  const ledgerPath = path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/benchmark/REFERENCE_LEDGER.json",
  );
  const attestationPath = path.join(
    projectRoot,
    "docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/YT-01.json",
  );
  const originalLedger = await readFile(ledgerPath);
  const originalAttestation = await readFile(attestationPath);
  const derive = () => deriveGate3Result({
    projectRoot,
    privateEvidenceRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });
  const mutateLedger = async (mutate: (item: Record<string, unknown>) => void) => {
    const ledger = JSON.parse(originalLedger.toString("utf8")) as {
      items: Array<Record<string, unknown>>;
    };
    mutate(ledger.items.find((item) => item.item_id === "YT-01")!);
    await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    await assert.rejects(derive(), (error: unknown) => (
      error instanceof Gate3EvidenceError && error.code === "INVALID_AUTHORITY"
    ));
    await writeFile(ledgerPath, originalLedger);
  };
  await mutateLedger((item) => { item.reference_role = "a1_safe_rejection_record"; });
  await mutateLedger((item) => { item.state = "expected_structural_rejection"; });
  await mutateLedger((item) => {
    item.preparation_document_sha256 = null;
    item.preparation_private_relative_path = null;
  });

  const attestation = JSON.parse(originalAttestation.toString("utf8")) as {
    source: { private_relative_path: string };
    input_contract: { format: string };
  };
  attestation.input_contract.format = "srt";
  attestation.source.private_relative_path = "inputs/dev/YT-01.srt";
  const mutatedAttestation = Buffer.from(`${JSON.stringify(attestation, null, 2)}\n`);
  await writeFile(attestationPath, mutatedAttestation);
  const ledger = JSON.parse(originalLedger.toString("utf8")) as {
    items: Array<Record<string, unknown>>;
  };
  ledger.items.find((item) => item.item_id === "YT-01")!.attestation_sha256 =
    createHash("sha256").update(mutatedAttestation).digest("hex");
  await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  await assert.rejects(derive(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "INVALID_AUTHORITY"
  ));
});

test("rejects missing or tampered YT-04 private preparation evidence", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "gate3-yt04-preparation-"));
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  await mkdir(projectRoot, { mode: 0o700 });
  await installGate3DevFixture(projectRoot, privateEvidenceRoot);
  t.after(() => rm(base, { recursive: true, force: true }));

  const preparationPath = path.join(privateEvidenceRoot, "references/YT-04.anchors.private.json");
  const original = await readFile(preparationPath);
  const derive = () => deriveGate3Result({
    projectRoot,
    privateEvidenceRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });

  await rm(preparationPath);
  await assert.rejects(derive(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "EVIDENCE_PATH_INVALID"
  ));
  await writeFile(preparationPath, original, { mode: 0o600 });
  await writeFile(preparationPath, "tampered private preparation\n", { mode: 0o600 });
  await assert.rejects(derive(), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "GATE_1_FAILED"
  ));
});

test("Git binding requires result plus all 14 claims and survives a fresh checkout", async (t) => {
  const base = await mkdtemp(path.join(tmpdir(), "gate3-git-binding-"));
  const projectRoot = path.join(base, "project");
  const privateEvidenceRoot = path.join(base, "private-evidence");
  const freshProjectRoot = path.join(base, "fresh-project");
  await mkdir(projectRoot, { mode: 0o700 });
  const fixture = await installGate3DevFixture(projectRoot, privateEvidenceRoot);
  t.after(() => rm(base, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync("git", ["-C", projectRoot, ...args], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  git("init", "-q");
  git("config", "user.name", "Publication Safe Test");
  git("config", "user.email", "publication-safe@example.invalid");
  git("add", "docs/feature-council/youtube-transcript-enrichment/benchmark");
  git("commit", "-q", "-m", "base authorities");
  git("add", "docs/feature-council/youtube-transcript-enrichment/decisions/GATE_3_RESULT.json");
  git("commit", "-q", "-m", "result only");
  const verify = (root: string) => verifyGate3EvidenceChain({
    projectRoot: root,
    privateEvidenceRoot,
    admittedNormalizedTranscriptPath: fixture.normalizedPath,
    itemId: "YT-01",
    binding: DEV_GATE3_BINDING,
    requireGitBound: true,
    executionBoundary: "development_test_only",
  });
  await assert.rejects(verify(projectRoot), (error: unknown) => (
    error instanceof Gate3EvidenceError && error.code === "RESULT_UNCOMMITTED"
  ));
  git("add", "docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims");
  git("commit", "-q", "-m", "bind all attempt claims");
  await verify(projectRoot);

  execFileSync("git", ["clone", "-q", projectRoot, freshProjectRoot]);
  await verify(freshProjectRoot);
});
