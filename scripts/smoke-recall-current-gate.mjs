#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const scratch = mkdtempSync(join(tmpdir(), `recall-current-gate-${process.pid}-${Date.now()}-`));

try {
  const ready = runChecker({
    audit: writeJson("ready-audit.json", goalAuditFixture()),
  });
  assert(ready.status === 0, "ready fixture should pass");
  const readyJson = JSON.parse(ready.stdout);
  assert(readyJson.ok === true, "ready fixture should report ok true");
  assert(readyJson.status === "ready_for_scheduler_enablement_approval", "ready fixture should report scheduler status");
  assert(readyJson.currentBlockingGate === "scheduler_enablement", "ready fixture should expose scheduler gate");
  assert(readyJson.schedulerAllowedNow === true, "ready fixture should expose scheduler approval readiness");
  assert(
    readyJson.manualCleanRunReadiness?.cleanRunCount === 2 &&
      readyJson.manualCleanRunReadiness?.schedulerEnablementApprovalAllowedByManualRunEvidence === true,
    "ready fixture should expose manual clean-run readiness at top level",
  );
  assert(
    readyJson.approvalRequiredEnv === "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL",
    "ready fixture should expose scheduler approval env",
  );
  assert(readyJson.liveWriteAttempted === false, "ready fixture must not attempt a live write");
  assert(
    readyJson.requiredBeforeScheduler?.manualCleanRunReadiness?.cleanRunCount === 2 &&
      readyJson.requiredBeforeScheduler?.manualCleanRunReadiness?.needsSecondManualVerificationRun === false,
    "ready fixture should expose manual clean-run readiness in requiredBeforeScheduler",
  );
  assert(
    readyJson.requiredBeforeScheduler?.recordEvidenceCommand === "npm run recall:scheduler-enable-evidence:record",
    "ready fixture should require scheduler evidence recording",
  );
  assert(
    readyJson.requiredBeforeScheduler?.noLiveSchedulerHandoffCommand === "npm run recall:scheduler-enable:command",
    "ready fixture should require the no-live scheduler command handoff before approval",
  );
  assert(
    readyJson.requiredBeforeScheduler?.postEnableFirstRunEvidenceHandoffCommand ===
      "npm run recall:scheduler-evidence:command",
    "ready fixture should expose the post-enable first-run evidence handoff",
  );
  assert(
    readyJson.requiredBeforeScheduler?.postApprovalSequence?.some((step) =>
      step.includes("timer/flag enablement command"),
    ) &&
      readyJson.requiredBeforeScheduler?.postApprovalSequence?.some((step) =>
        step.includes("first scheduled service run completed after scheduler timer activation"),
      ) &&
      readyJson.requiredBeforeScheduler?.postApprovalSequence?.some((step) =>
        step.includes("recall:scheduler-evidence:command"),
      ) &&
      readyJson.requiredBeforeScheduler?.postApprovalSequence?.some((step) =>
        step.includes("record and verify private scheduler evidence"),
      ),
    "ready fixture should require the post-approval timer, first-run, evidence handoff, and evidence sequence",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-enable:command")),
    "ready fixture should include no-live scheduler handoff command",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("timer/flag enablement command")),
    "ready fixture should include scheduler timer/flag enablement guidance",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("first scheduled service run")),
    "ready fixture should include first scheduled service-run guidance before evidence recording",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-evidence:command")),
    "ready fixture should include post-enable first-run evidence handoff guidance",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-enable-evidence:record")),
    "ready fixture should include scheduler evidence record command",
  );
  assert(
    readyJson.safeNextCommands?.some((command) => command.includes("check:recall-scheduler-enable-evidence")),
    "ready fixture should include scheduler evidence verification command",
  );
  assertNoSecret(ready.stdout, "ready output");

  const extraManualRunReady = runChecker({
    audit: writeJson("extra-manual-run-ready-audit.json", goalAuditFixture({ cleanRunCount: 3 })),
  });
  assert(extraManualRunReady.status === 0, "ready scheduler gate should accept more than two clean manual runs");
  const extraManualRunReadyJson = JSON.parse(extraManualRunReady.stdout);
  assert(
    extraManualRunReadyJson.checked.goalCompletionAudit.manualCleanRunCount === 3,
    "ready scheduler gate should preserve the extra manual clean-run count",
  );
  assert(
    extraManualRunReadyJson.manualCleanRunReadiness?.cleanRunCount === 3 &&
      extraManualRunReadyJson.requiredBeforeScheduler?.manualCleanRunReadiness?.cleanRunCount === 3,
    "ready scheduler gate should expose extra manual clean-run count in operator fields",
  );
  assertNoSecret(extraManualRunReady.stdout, "extra manual run ready output");

  const complete = runChecker({
    audit: writeJson("complete-audit.json", finalGoalAuditFixture()),
  });
  assert(complete.status === 0, `complete fixture should pass\n${complete.stdout}\n${complete.stderr}`);
  const completeJson = JSON.parse(complete.stdout);
  assert(completeJson.ok === true, "complete fixture should report ok true");
  assert(completeJson.status === "complete", "complete fixture should report complete status");
  assert(completeJson.currentBlockingGate === null, "complete fixture should expose no current gate");
  assert(completeJson.approvalRequiredEnv === null, "complete fixture should not require an approval env");
  assert(completeJson.safeNextCommands.length === 0, "complete fixture should expose no safe next commands");
  assert(completeJson.nextAction === "No remaining Recall daily sync completion gate.", "complete fixture should expose final next action");
  assertNoSecret(complete.stdout, "complete output");

  const staleAudit = runChecker({
    audit: writeJson(
      "stale-audit.json",
      goalAuditFixture({
        status: "blocked_goal_completion_audit",
        ok: false,
        currentBlockingGate: "second_manual_verification_run",
        activeBlockedRequirement: "second_manual_verification",
        cleanRunCount: 1,
        needsSecondManualVerificationRun: true,
        schedulerEnablementApprovalAllowedByManualRunEvidence: false,
      }),
    ),
  });
  assert(staleAudit.status === 1, "stale audit fixture should fail");
  assert(
    staleAudit.stderr.includes("audit_not_ok"),
    "stale audit fixture should name audit drift",
  );
  assertNoSecret(staleAudit.stdout + staleAudit.stderr, "stale audit output");

  const localGateRegression = runChecker({
    audit: writeJson("local-gate-audit.json", secondManualGoalAuditFixture()),
    handoff: writeJson(
      "local-gate-handoff.json",
      productionHandoffFixture({
        handoffProgress: {
          localPrivateGatesSkippedForProductionPath: false,
          localGateStatus: "blocked_by_local_private_gate",
        },
      }),
    ),
  });
  assert(localGateRegression.status === 1, "local gate regression should fail");
  assert(
    localGateRegression.stderr.includes("local_private_gates_not_skipped") &&
      localGateRegression.stderr.includes("local_gate_status_not_ready"),
    "local gate regression should name local gate failure",
  );
  assertNoSecret(localGateRegression.stdout + localGateRegression.stderr, "local gate regression output");

  const remotePreflightBlocked = runChecker({
    audit: writeJson("remote-preflight-audit.json", secondManualGoalAuditFixture()),
    handoff: writeJson(
      "remote-preflight-handoff.json",
      productionHandoffFixture({
        handoffProgress: {
          stoppedAt: "remote_preflight",
          readyForExactApproval: false,
          remotePreflightPassed: false,
          remotePreflightStatus: "blocked_second_manual_remote_runtime_preflight",
        },
        remotePreflight: {
          liveApplyDelegationAllowed: false,
        },
      }),
    ),
  });
  assert(remotePreflightBlocked.status === 1, "remote preflight blocked fixture should fail");
  assert(
    remotePreflightBlocked.stderr.includes("wrong_handoff_stop") &&
      remotePreflightBlocked.stderr.includes("remote_preflight_not_passed") &&
      remotePreflightBlocked.stderr.includes("live_apply_delegation_not_ready"),
    "remote preflight fixture should name remote readiness failure",
  );
  assertNoSecret(remotePreflightBlocked.stdout + remotePreflightBlocked.stderr, "remote preflight output");

  const staleFirstApplyApproval = runChecker({
    audit: writeJson("stale-first-apply-approval-audit.json", secondManualGoalAuditFixture()),
    handoff: writeJson(
      "stale-first-apply-approval-handoff.json",
      productionHandoffFixture({
        approvalStatus: {
          firstApplyApprovalPresent: true,
        },
      }),
    ),
  });
  assert(staleFirstApplyApproval.status === 1, "stale first-apply approval fixture should fail");
  assert(
    staleFirstApplyApproval.stderr.includes("stale_first_apply_approval_present"),
    "stale first-apply approval fixture should name the approval mismatch",
  );
  assertNoSecret(staleFirstApplyApproval.stdout + staleFirstApplyApproval.stderr, "stale first-apply approval output");

  const wrongEnvApproval = runChecker({
    audit: writeJson("wrong-env-approval-audit.json", secondManualGoalAuditFixture()),
    handoff: writeJson(
      "wrong-env-approval-handoff.json",
      productionHandoffFixture({
        approvalStatus: {
          secondManualApprovalTextPresent: true,
          manualVerificationApprovalExact: false,
        },
      }),
    ),
  });
  assert(wrongEnvApproval.status === 1, "wrong-env approval fixture should fail");
  assert(
    wrongEnvApproval.stderr.includes("second_manual_approval_wrong_env"),
    "wrong-env approval fixture should name the required approval env",
  );
  assertNoSecret(wrongEnvApproval.stdout + wrongEnvApproval.stderr, "wrong-env approval output");

  const approvalAlreadyPresent = runChecker({
    audit: writeJson("approval-present-audit.json", secondManualGoalAuditFixture()),
    handoff: writeJson(
      "approval-present-handoff.json",
      productionHandoffFixture({
        approvalStatus: {
          manualVerificationApprovalExact: true,
          secondManualApprovalTextPresent: true,
        },
        handoffProgress: {
          exactApprovalAlreadyPresent: true,
        },
      }),
    ),
  });
  assert(approvalAlreadyPresent.status === 1, "approval-present fixture should fail");
  assert(
    approvalAlreadyPresent.stderr.includes("approval_already_present"),
    "approval-present fixture should stop ambiguous pre-approval status",
  );
  assertNoSecret(approvalAlreadyPresent.stdout + approvalAlreadyPresent.stderr, "approval-present output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "scheduler current-gate fixture passes",
          "complete current-gate fixture passes",
          "stale goal audit fixture fails",
          "local private-gate regression fails",
          "remote preflight blocked fixture fails",
          "stale first-apply approval fixture fails",
          "second-manual approval in wrong env fixture fails",
          "approval already present fixture fails",
        "ready output requires scheduler evidence recording",
        "ready output exposes manual clean-run readiness for scheduler approval",
        "ready output requires post-approval timer/first-run/evidence-handoff/evidence sequence",
        "ready output requires scheduler evidence verification",
          "normal checker output does not print secret-shaped values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runChecker({ audit, handoff }) {
  const args = [
    "--",
    resolve("scripts/check-recall-current-gate.mjs"),
    "--goal-audit-result",
    audit,
  ];
  if (handoff) {
    args.push("--production-command-result", handoff);
  }
  return spawnSync(
    process.execPath,
    args,
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function goalAuditFixture({
  ok = true,
  status = "goal_completion_audit_current_incomplete_state_verified",
  currentBlockingGate = "scheduler_enablement",
  activeBlockedRequirement = "scheduler_enablement",
  cleanRunCount = 2,
  needsSecondManualVerificationRun = false,
  schedulerEnablementApprovalAllowedByManualRunEvidence = true,
  blockedActions = ["scheduler", "checkpoint"],
} = {}) {
  return {
    ok,
    status,
    noLiveNoWrite: true,
    completionAchieved: false,
    currentBlockingGate,
    activeBlockedRequirement,
    blockedRequirements: ["scheduler_enablement"],
    blockedActions,
    manualCleanRunReadiness: {
      requiredManualCleanRunsBeforeSchedulerEnable: 2,
      cleanRunCount,
      needsSecondManualVerificationRun,
      schedulerEnablementApprovalAllowedByManualRunEvidence,
    },
  };
}

function secondManualGoalAuditFixture() {
  return goalAuditFixture({
    currentBlockingGate: "second_manual_verification_run",
    activeBlockedRequirement: "second_manual_verification",
    cleanRunCount: 1,
    needsSecondManualVerificationRun: true,
    schedulerEnablementApprovalAllowedByManualRunEvidence: false,
    blockedActions: ["second_manual_verification", "scheduler", "checkpoint"],
  });
}

function finalGoalAuditFixture() {
  return {
    ok: true,
    status: "goal_completion_audit_final_state_verified",
    noLiveNoWrite: true,
    completionAchieved: true,
    currentBlockingGate: null,
    activeBlockedRequirement: null,
    blockedRequirements: [],
    blockedActions: ["checkpoint"],
    manualCleanRunReadiness: {
      requiredManualCleanRunsBeforeSchedulerEnable: 2,
      cleanRunCount: 7,
      needsSecondManualVerificationRun: false,
      schedulerEnablementApprovalAllowedByManualRunEvidence: true,
    },
  };
}

function productionHandoffFixture(overrides = {}) {
  return deepMerge(
    {
      ok: true,
      mode: "second_manual_production_apply_command_handoff",
      noLiveNoWrite: true,
      approvalRequired: true,
      approvalStatus: {
        requiredEnv: "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
        requiredApprovalKind: "second_manual_verification",
        currentGate: "second_manual_verification_run",
        manualVerificationApprovalExact: false,
        firstApplyApprovalPresent: false,
        secondManualApprovalTextPresent: false,
      },
      remotePreflight: {
        ok: true,
        status: "ready_for_second_manual_remote_runtime_preflight",
        timer: {
          enabled: false,
          active: false,
        },
        envFlags: "recall_remote_enable_flags_disabled",
        liveApplyDelegationAllowed: true,
        deployedLatestReports: {
          selectedMatchesRemoteLatest: true,
        },
      },
      handoffProgress: {
        stoppedAt: "ready_for_exact_approval",
        readyForExactApproval: true,
        currentCompletionGate: "second_manual_verification_run",
        localPrivateGatesSkippedForProductionPath: true,
        localGateStatus: "not_blocking_production_path",
        remotePreflightPassed: true,
        remotePreflightStatus: "ready_for_second_manual_remote_runtime_preflight",
        exactApprovalAlreadyPresent: false,
        liveWriteAttempted: false,
      },
    },
    overrides,
  );
}

function deepMerge(base, overrides) {
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function writeJson(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function assertNoSecret(value, label) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
