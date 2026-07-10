#!/usr/bin/env node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const privateRoot = resolve("data/private/recall-live-spikes");
mkdirSync(privateRoot, { recursive: true });
const scratch = mkdtempSync(join(privateRoot, "local-gate-resolution-smoke-"));

try {
  const cleanScanRoot = join(scratch, "clean-scripts");
  mkdirSync(cleanScanRoot, { recursive: true });
  writeFileSync(
    join(cleanScanRoot, "safe.mjs"),
    "console.log('local private gates are not blocking the production path');\n",
    "utf8",
  );

  const staleScanRoot = join(scratch, "stale-scripts");
  mkdirSync(staleScanRoot, { recursive: true });
  const stalePhrase = ["local private gates", "stopped first"].join(" ");
  writeFileSync(
    join(staleScanRoot, "stale.mjs"),
    `console.log('${stalePhrase}');\n`,
    "utf8",
  );

  const good = writeFixtureSet("good", {
    completionStatus: completionStatusFixture(),
    handoff: handoffFixture(),
    apply: applyFixture(),
    staleFirstApply: staleFirstApplyFixture(),
  });
  const goodRun = runChecker(good, cleanScanRoot);
  assert(goodRun.status === 0, `good fixtures should pass\n${goodRun.stderr}`);
  const goodJson = JSON.parse(goodRun.stdout);
  assert(goodJson.ok === true, "good fixtures should set ok true");
  assert(goodJson.noLiveNoWrite === true, "checker should report no-live/no-write");
  assert(goodJson.liveWriteAttempted === false, "checker should report no live write attempted");
  assert(goodJson.currentGate === "second_manual_verification_run", "checker should preserve current gate");
  assert(
    goodJson.checked.completionStatus.status === "blocked_second_manual_verification_run",
    "checker should summarize explicit second-manual status",
  );
  assert(
    goodJson.checked.completionStatus.activeBlockedRequirement === "second_manual_verification",
    "checker should summarize active blocked requirement",
  );
  assert(
    goodJson.checked.handoffProgress.stoppedAt === "ready_for_exact_approval",
    "checker should summarize ready handoff",
  );
  assert(
    goodJson.checked.preApplyProgress.stoppedAt === "approval_gate",
    "checker should summarize approval-gate apply stop",
  );
  assert(
    goodJson.checked.preApplyProgress.localPrivateGatesSkippedForProductionPath === true,
    "checker should summarize normal no-approval local-gate bypass proof",
  );
  assert(
    goodJson.checked.preApplyProgress.remotePreflightStatus === "ready_for_second_manual_remote_runtime_preflight",
    "checker should summarize ready remote preflight status",
  );
  assert(
    goodJson.checked.preApplyProgress.selectedReports.timestamp === "2026-06-26_21-58-57_IST",
    "checker should summarize selected deployed proof-pair timestamp",
  );
  assert(
    goodJson.checked.preApplyProgress.remoteProofReports.enumerationOk === true &&
      goodJson.checked.preApplyProgress.remoteProofReports.fidelityOk === true,
    "checker should summarize remote proof readiness",
  );
  assert(
    goodJson.checked.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest === true,
    "checker should summarize selected proof-pair freshness",
  );
  assert(
    goodJson.checked.staleFirstApplyApprovalProgress.stoppedAt === "approval_gate",
    "checker should summarize stale first-apply approval stop point",
  );
  assert(
    goodJson.checked.staleFirstApplyApprovalProgress.blockingFindingIds.includes("stale_first_apply_approval"),
    "checker should summarize stale first-apply approval finding",
  );
  assert(
    goodJson.checked.staleFirstApplyApprovalProgress.remotePreflightPassed === true,
    "checker should prove stale first-apply approval reaches remote preflight before approval classification",
  );
  assert(
    goodJson.checked.staleFirstApplyApprovalProgress.localPrivateGatesSkippedForProductionPath === true,
    "checker should summarize stale first-apply local-gate bypass proof",
  );
  assert(goodJson.checked.staleWordingScan.findingCount === 0, "clean scan root should have no stale wording findings");
  assertNoSecret(goodRun.stdout, "good checker output");

  const complete = writeFixtureSet("complete", {
    completionStatus: finalCompletionStatusFixture(),
    handoff: handoffFixture(),
    apply: applyFixture(),
    staleFirstApply: staleFirstApplyFixture(),
  });
  const completeRun = runChecker(complete, cleanScanRoot);
  assert(completeRun.status === 0, `complete fixture should pass\n${completeRun.stderr}`);
  const completeJson = JSON.parse(completeRun.stdout);
  assert(completeJson.ok === true, "complete fixture should set ok true");
  assert(completeJson.currentGate === null, "complete fixture should expose no active gate");
  assert(
    completeJson.checked.handoffProgress.ok === false &&
      completeJson.checked.preApplyProgress.status === null &&
      completeJson.checked.staleFirstApplyApprovalProgress.status === null,
    "complete fixture should skip obsolete second-manual probes",
  );
  assertNoSecret(completeRun.stdout, "complete checker output");

  const staleRun = runChecker(good, staleScanRoot);
  assert(staleRun.status === 1, "stale wording fixture should fail");
  const staleJson = parseMaybeJson(staleRun.stderr);
  assert(
    staleJson.findings.some((finding) => finding.id === "local_private_gates_stopped_first"),
    "stale wording fixture should identify local_private_gates_stopped_first",
  );
  assertNoSecret(staleRun.stderr, "stale wording checker output");

  const badCompletionStatus = writeFixtureSet("bad-completion-status", {
    completionStatus: completionStatusFixture({
      status: "blocked_deploy_or_scheduler_verification",
      activeBlockedRequirement: null,
      blockedActions: ["scheduler", "checkpoint"],
    }),
    handoff: handoffFixture(),
    apply: applyFixture(),
    staleFirstApply: staleFirstApplyFixture(),
  });
  const badCompletionStatusRun = runChecker(badCompletionStatus, cleanScanRoot);
  assert(badCompletionStatusRun.status === 1, "bad completion-status fixture should fail");
  const badCompletionStatusJson = parseMaybeJson(badCompletionStatusRun.stderr);
  assert(
    badCompletionStatusJson.findings.some((finding) => finding.id === "completion_status_wrong_status") &&
      badCompletionStatusJson.findings.some((finding) => finding.id === "completion_status_wrong_active_requirement") &&
      badCompletionStatusJson.findings.some((finding) => finding.id === "completion_status_missing_second_manual_blocked_action"),
    "bad completion-status fixture should identify stale active gate summary",
  );
  assertNoSecret(badCompletionStatusRun.stderr, "bad completion-status checker output");

  const badApply = writeFixtureSet("bad-apply", {
    completionStatus: completionStatusFixture(),
    handoff: handoffFixture(),
    apply: applyFixture({
      preApplyProgress: {
        ...applyFixture().preApplyProgress,
        stoppedAt: "local_command_builder_gate",
        localGateStatus: "skipped",
        remotePreflightPassed: false,
        liveCallNotAttemptedBecause: "local command builder failed before remote preflight",
      },
    }),
    staleFirstApply: staleFirstApplyFixture(),
  });
  const badApplyRun = runChecker(badApply, cleanScanRoot);
  assert(badApplyRun.status === 1, "bad apply fixture should fail");
  const badApplyJson = parseMaybeJson(badApplyRun.stderr);
  assert(
    badApplyJson.findings.some((finding) => finding.id === "apply_wrong_stop_point") &&
      badApplyJson.findings.some((finding) => finding.id === "apply_local_gate_ambiguous") &&
      badApplyJson.findings.some((finding) => finding.id === "apply_remote_preflight_not_passed"),
    "bad apply fixture should identify local-gate/remote-preflight regression",
  );
  assertNoSecret(badApplyRun.stderr, "bad apply checker output");

  const badProofPair = writeFixtureSet("bad-proof-pair", {
    completionStatus: completionStatusFixture(),
    handoff: handoffFixture(),
    apply: applyFixture({
      selectedReports: {
        enumerationPath: "",
        fidelityPath: "",
        timestamp: null,
        selectedBy: "local_command_builder",
      },
      remotePreflight: {
        ...applyFixture().remotePreflight,
        proofReports: {
          enumeration: { ok: false },
          fidelity: { ok: false },
        },
        deployedLatestReports: {
          timestamp: "2026-06-25_00-00-00_IST",
          selectedMatchesRemoteLatest: false,
        },
      },
    }),
    staleFirstApply: staleFirstApplyFixture(),
  });
  const badProofPairRun = runChecker(badProofPair, cleanScanRoot);
  assert(badProofPairRun.status === 1, "bad proof-pair fixture should fail");
  const badProofPairJson = parseMaybeJson(badProofPairRun.stderr);
  assert(
    badProofPairJson.findings.some((finding) => finding.id === "apply_missing_selected_deployed_proof_pair") &&
      badProofPairJson.findings.some((finding) => finding.id === "apply_selected_proof_pair_not_remote_latest") &&
      badProofPairJson.findings.some((finding) => finding.id === "apply_remote_enumeration_proof_not_ready") &&
      badProofPairJson.findings.some((finding) => finding.id === "apply_remote_fidelity_proof_not_ready") &&
      badProofPairJson.findings.some((finding) => finding.id === "apply_selected_proof_pair_not_current"),
    "bad proof-pair fixture should identify missing or stale deployed proof selection",
  );
  assertNoSecret(badProofPairRun.stderr, "bad proof-pair checker output");

  const badStaleFirstApply = writeFixtureSet("bad-stale-first-apply", {
    completionStatus: completionStatusFixture(),
    handoff: handoffFixture(),
    apply: applyFixture(),
    staleFirstApply: staleFirstApplyFixture({
      approvalStatus: {
        firstApplyApprovalPresent: false,
        manualVerificationApprovalExact: false,
      },
      preApplyProgress: {
        ...staleFirstApplyFixture().preApplyProgress,
        stoppedAt: "local_command_builder_gate",
        blockingFindingIds: ["command_builder"],
        localGateStatus: "skipped",
        remotePreflightPassed: false,
        liveCallNotAttemptedBecause: "local command builder failed before remote preflight",
      },
      remotePreflight: {
        ...staleFirstApplyFixture().remotePreflight,
        deployedLatestReports: {
          timestamp: "2026-06-25_00-00-00_IST",
          selectedMatchesRemoteLatest: false,
        },
      },
    }),
  });
  const badStaleFirstApplyRun = runChecker(badStaleFirstApply, cleanScanRoot);
  assert(badStaleFirstApplyRun.status === 1, "bad stale first-apply fixture should fail");
  const badStaleFirstApplyJson = parseMaybeJson(badStaleFirstApplyRun.stderr);
  assert(
    badStaleFirstApplyJson.findings.some((finding) => finding.id === "stale_first_apply_not_classified") &&
      badStaleFirstApplyJson.findings.some((finding) => finding.id === "stale_first_apply_wrong_stop_point") &&
      badStaleFirstApplyJson.findings.some((finding) => finding.id === "stale_first_apply_remote_preflight_not_passed") &&
      badStaleFirstApplyJson.findings.some((finding) => finding.id === "stale_first_apply_selected_proof_pair_not_current"),
    "bad stale first-apply fixture should identify approval classification and preflight regressions",
  );
  assertNoSecret(badStaleFirstApplyRun.stderr, "bad stale first-apply checker output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "local-gate resolution checker accepts ready handoff plus approval-gate apply stop",
          "local-gate resolution checker accepts final complete state without obsolete probes",
          "local-gate resolution checker proves local private gates are not the production blocker",
          "local-gate resolution checker proves second manual verification is the active blocked requirement",
          "local-gate resolution checker rejects stale local-gate stopped-first wording",
          "local-gate resolution checker rejects stale broad completion-status wording",
          "local-gate resolution checker rejects apply output that stops before remote preflight",
          "local-gate resolution checker proves deployed proof-pair selection and readiness",
          "local-gate resolution checker rejects missing or stale deployed proof-pair selection",
          "local-gate resolution checker proves stale first-apply approval reaches remote preflight before approval_gate",
          "local-gate resolution checker rejects stale first-apply approval regressions that stop before remote preflight",
          "local-gate resolution checker output is no-live/no-write and no-secret",
        ],
        noLiveNoWrite: true,
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function writeFixtureSet(prefix, fixtures) {
  return {
    completionStatus: writeJson(`${prefix}-completion-status.json`, fixtures.completionStatus),
    handoff: writeJson(`${prefix}-handoff.json`, fixtures.handoff),
    apply: writeJson(`${prefix}-apply.json`, fixtures.apply),
    staleFirstApply: writeJson(`${prefix}-stale-first-apply.json`, fixtures.staleFirstApply),
  };
}

function runChecker(paths, scanRoot) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-second-manual-local-gate-resolution.mjs"),
      "--completion-status-result",
      paths.completionStatus,
      "--handoff-result",
      paths.handoff,
      "--apply-result",
      paths.apply,
      "--stale-first-apply-result",
      paths.staleFirstApply,
      "--script-scan-root",
      scanRoot,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
}

function writeJson(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function completionStatusFixture(overrides = {}) {
  return {
    ok: false,
    completionAchieved: false,
    status: "blocked_second_manual_verification_run",
    noLiveNoWrite: true,
    currentBlockingGate: "second_manual_verification_run",
    activeBlockedRequirement: "second_manual_verification",
    blockedRequirements: ["scheduler_enablement"],
    blockedActions: ["second_manual_verification", "scheduler", "checkpoint"],
    secondManualVerificationPath: {
      status: "requires_no_live_production_handoff_then_exact_approval",
      currentGate: "second_manual_verification_run",
      noLiveHandoffCommand: "npm run recall:second-manual:production-command",
      approvalPacket: "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md",
      applyCommandAfterExactApproval: "npm run recall:second-manual:production-apply",
      readyHandoffMustShow: {
        stoppedAt: "ready_for_exact_approval",
        readyForExactApproval: true,
        localPrivateGatesSkippedForProductionPath: true,
        localGateStatus: "not_blocking_production_path",
        remotePreflightPassed: true,
        liveWriteAttempted: false,
      },
      liveWriteGateAfterReadyHandoff: "exact BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
      localPrivateGatesAreNotThePlannedProductionGate: true,
      staleApprovalWarning: "First capped apply approval is already spent and does not authorize this second manual verification run.",
    },
    ...overrides,
  };
}

function finalCompletionStatusFixture() {
  return {
    ok: true,
    completionAchieved: true,
    status: "complete",
    noLiveNoWrite: true,
    currentBlockingGate: null,
    activeBlockedRequirement: null,
    blockedRequirements: [],
    blockedActions: ["checkpoint"],
  };
}

function handoffFixture() {
  return {
    ok: true,
    noLiveNoWrite: true,
    completionStatus: {
      currentBlockingGate: "second_manual_verification_run",
    },
    handoffProgress: {
      stoppedAt: "ready_for_exact_approval",
      readyForExactApproval: true,
      localPrivateGatesSkippedForProductionPath: true,
      localGateStatus: "not_blocking_production_path",
      remotePreflightPassed: true,
      liveWriteAttempted: false,
      liveCallNotAttemptedBecause:
        "this handoff is no-live/no-write; exact second-manual approval is the next required action after production remote preflight passed",
    },
  };
}

function applyFixture(overrides = {}) {
  return {
    ok: false,
    status: "blocked_second_manual_production_apply",
    noLiveNoWrite: true,
    liveWriteAttempted: false,
    preApplyProgress: {
      stoppedAt: "approval_gate",
      blockingFindingIds: ["approval_required"],
      localPrivateGatesSkippedForProductionPath: true,
      localGateStatus: "not_blocking_production_path",
      remotePreflightPassed: true,
      remotePreflightStatus: "ready_for_second_manual_remote_runtime_preflight",
      approvalPresent: false,
      liveWriteAttempted: false,
      liveCallNotAttemptedBecause: "exact second-manual approval is missing after production remote preflight passed",
    },
    selectedReports: {
      enumerationPath: "docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md",
      fidelityPath: "docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md",
      timestamp: "2026-06-26_21-58-57_IST",
      selectedBy: "remote_latest_deployed_pair",
    },
    remotePreflight: {
      proofReports: {
        enumeration: { ok: true },
        fidelity: { ok: true },
      },
      deployedLatestReports: {
        timestamp: "2026-06-26_21-58-57_IST",
        selectedMatchesRemoteLatest: true,
      },
    },
    ...overrides,
  };
}

function staleFirstApplyFixture(overrides = {}) {
  return applyFixture({
    approvalStatus: {
      firstApplyApprovalPresent: true,
      manualVerificationApprovalExact: false,
    },
    preApplyProgress: {
      ...applyFixture().preApplyProgress,
      blockingFindingIds: ["stale_first_apply_approval"],
    },
    ...overrides,
  });
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return JSON.parse(trimmed.slice(start, end + 1));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertNoSecret(text, label) {
  const value = String(text ?? "");
  if (/\bsk_[A-Za-z0-9._-]{12,}\b/.test(value)) throw new Error(`${label} printed secret-shaped sk_ value`);
  if (/\bBearer\s+[A-Za-z0-9._-]{12,}\b/i.test(value)) throw new Error(`${label} printed bearer token`);
}
