#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_CURRENT_GATE = "second_manual_verification_run";
const REQUIRED_ACTIVE_REQUIREMENT = "second_manual_verification";
const SCHEDULER_GATE = "scheduler_enablement";
const SCHEDULER_ACTIVE_REQUIREMENT = "scheduler_enablement";
const REQUIRED_HANDOFF_STOP = "ready_for_exact_approval";
const REQUIRED_LOCAL_GATE_STATUS = "not_blocking_production_path";
const REQUIRED_REMOTE_PREFLIGHT_STATUS = "ready_for_second_manual_remote_runtime_preflight";
const REQUIRED_APPROVAL_ENV = "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL";
const SCHEDULER_APPROVAL_ENV = "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL";
const APPROVAL_PACKET =
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md";
const CURRENT_GATE_COMMAND = "npm run recall:current-gate";
const MANIFEST_PREFLIGHT_COMMAND =
  "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json";
const PRODUCTION_HANDOFF_COMMAND = "npm run recall:second-manual:production-command";
const PRODUCTION_APPLY_COMMAND = "npm run recall:second-manual:production-apply";
const SCHEDULER_HANDOFF_COMMAND = "npm run recall:scheduler-enable:command";
const SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND = "npm run recall:scheduler-evidence:command";
const SCHEDULER_EVIDENCE_RECORD_COMMAND = "npm run recall:scheduler-enable-evidence:record";
const SCHEDULER_EVIDENCE_VERIFY_COMMAND = "npm run check:recall-scheduler-enable-evidence";
const COMPLETION_STATUS_COMMAND = "npm run recall:daily-sync:completion-status";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
const audit = readResultOrRun(args.goalAuditResultPath, () =>
  runJsonCommand(["scripts/check-recall-goal-completion-audit.mjs"]),
);
const auditGate = audit.parsed?.currentBlockingGate ?? null;
const auditComplete = audit.parsed?.completionAchieved === true;
const productionHandoff =
  (auditComplete || auditGate === SCHEDULER_GATE) && !args.productionCommandResultPath
    ? skippedResult(auditComplete ? "goal_complete_no_current_gate" : "second_manual_completed_scheduler_gate")
    : readResultOrRun(args.productionCommandResultPath, () =>
        runNpmJsonCommand(["run", "-s", "recall:second-manual:production-command", "--", "--json"]),
      );

validateGoalAudit(audit.parsed ?? {}, audit, findings);
if (audit.parsed?.currentBlockingGate === REQUIRED_CURRENT_GATE) {
  validateProductionHandoff(productionHandoff.parsed ?? {}, productionHandoff, findings);
} else if (audit.parsed?.currentBlockingGate === SCHEDULER_GATE) {
  validateSchedulerGate(audit.parsed ?? {}, productionHandoff, findings);
}

const ok = findings.length === 0;
const handoff = productionHandoff.parsed ?? {};
const currentGate = audit.parsed?.currentBlockingGate ?? handoff.handoffProgress?.currentCompletionGate ?? null;
const finalComplete = audit.parsed?.completionAchieved === true && currentGate === null;
const schedulerGate = currentGate === SCHEDULER_GATE;
const output = {
  ok,
  status: ok
    ? finalComplete
      ? "complete"
      : schedulerGate
      ? "ready_for_scheduler_enablement_approval"
      : "ready_for_second_manual_exact_approval"
    : "blocked_recall_current_gate",
  noLiveNoWrite: true,
  currentBlockingGate: currentGate,
  activeBlockedRequirement: audit.parsed?.activeBlockedRequirement ?? null,
  approvalRequiredEnv: finalComplete ? null : schedulerGate ? SCHEDULER_APPROVAL_ENV : REQUIRED_APPROVAL_ENV,
  exactApprovalPresent: handoff.handoffProgress?.exactApprovalAlreadyPresent === true,
  firstApplyApprovalPresent: handoff.approvalStatus?.firstApplyApprovalPresent === true,
  secondManualApprovalInWrongEnv:
    handoff.approvalStatus?.secondManualApprovalTextPresent === true &&
    handoff.approvalStatus?.manualVerificationApprovalExact !== true,
  localGateStatus: schedulerGate
    ? "not_applicable_after_second_manual_completed"
    : handoff.handoffProgress?.localGateStatus ?? null,
  remotePreflightPassed: schedulerGate ? null : handoff.handoffProgress?.remotePreflightPassed === true,
  liveWriteAttempted: schedulerGate ? false : handoff.handoffProgress?.liveWriteAttempted === true,
  schedulerAllowedNow:
    finalComplete
      ? false
      :
    schedulerGate &&
    audit.parsed?.manualCleanRunReadiness?.schedulerEnablementApprovalAllowedByManualRunEvidence === true,
  checkpointAllowedNow: false,
  manualCleanRunReadiness: summarizeManualCleanRunReadiness(audit.parsed?.manualCleanRunReadiness),
  checked: {
    goalCompletionAudit: {
      exitCode: audit.exitCode,
      ok: audit.parsed?.ok === true,
      status: audit.parsed?.status ?? null,
      completionAchieved: audit.parsed?.completionAchieved ?? null,
      currentBlockingGate: audit.parsed?.currentBlockingGate ?? null,
      activeBlockedRequirement: audit.parsed?.activeBlockedRequirement ?? null,
      manualCleanRunCount: audit.parsed?.manualCleanRunReadiness?.cleanRunCount ?? null,
    },
    productionHandoff: {
      skipped: productionHandoff.skipped === true,
      status: productionHandoff.status ?? handoff.status ?? null,
      exitCode: productionHandoff.exitCode,
      ok: productionHandoff.skipped === true || handoff.ok === true,
      mode: handoff.mode ?? null,
      noLiveNoWrite: productionHandoff.skipped === true || handoff.noLiveNoWrite === true,
      approvalRequiredEnv: handoff.approvalStatus?.requiredEnv ?? null,
      requiredApprovalKind: handoff.approvalStatus?.requiredApprovalKind ?? null,
      firstApplyApprovalPresent: handoff.approvalStatus?.firstApplyApprovalPresent ?? null,
      secondManualApprovalTextPresent: handoff.approvalStatus?.secondManualApprovalTextPresent ?? null,
      manualVerificationApprovalExact: handoff.approvalStatus?.manualVerificationApprovalExact ?? null,
      stoppedAt: handoff.handoffProgress?.stoppedAt ?? null,
      localGateStatus: handoff.handoffProgress?.localGateStatus ?? null,
      remotePreflightPassed: handoff.handoffProgress?.remotePreflightPassed ?? null,
      remotePreflightStatus: handoff.handoffProgress?.remotePreflightStatus ?? null,
      liveWriteAttempted: handoff.handoffProgress?.liveWriteAttempted ?? null,
      timerEnabled: handoff.remotePreflight?.timer?.enabled ?? null,
      timerActive: handoff.remotePreflight?.timer?.active ?? null,
      liveApplyDelegationAllowed: handoff.remotePreflight?.liveApplyDelegationAllowed ?? null,
    },
  },
  requiredBeforeApply: schedulerGate
    ? null
    : finalComplete
    ? null
    : {
        approvalPacket: APPROVAL_PACKET,
        currentGateCommand: CURRENT_GATE_COMMAND,
        manifestPreLiveCommand: MANIFEST_PREFLIGHT_COMMAND,
        noLiveProductionHandoffCommand: PRODUCTION_HANDOFF_COMMAND,
        applyCommandAfterExactApproval: PRODUCTION_APPLY_COMMAND,
        approvalEnv: REQUIRED_APPROVAL_ENV,
        requiredPreLiveProof: {
          localGateResolutionStoppedAt: "approval_gate",
          remotePreflightStatus: REQUIRED_REMOTE_PREFLIGHT_STATUS,
          selectedBy: "remote_latest_deployed_pair",
          selectedMatchesRemoteLatest: true,
        },
      },
  findings,
  requiredBeforeScheduler: finalComplete
    ? null
    : schedulerGate
    ? {
        approvalPacket:
          "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
        manualCleanRunReadiness: summarizeManualCleanRunReadiness(audit.parsed?.manualCleanRunReadiness),
        approvalEnv: SCHEDULER_APPROVAL_ENV,
        noLiveSchedulerHandoffCommand: SCHEDULER_HANDOFF_COMMAND,
        postEnableFirstRunEvidenceHandoffCommand: SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND,
        recordEvidenceCommand: SCHEDULER_EVIDENCE_RECORD_COMMAND,
        verifyEvidenceCommand: SCHEDULER_EVIDENCE_VERIFY_COMMAND,
        completionStatusCommand: COMPLETION_STATUS_COMMAND,
        postApprovalSequence: [
          `run the timer/flag enablement command printed by ${SCHEDULER_HANDOFF_COMMAND}`,
          "verify the first scheduled service run completed after scheduler timer activation",
          `run the no-live first-run evidence handoff: ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND}`,
          "record and verify private scheduler evidence",
        ],
      }
    : null,
  safeNextCommands: finalComplete
    ? []
    : schedulerGate
    ? [
        "Review docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
        `No-live handoff before approval: ${SCHEDULER_HANDOFF_COMMAND}`,
        `Only after exact scheduler approval in ${SCHEDULER_APPROVAL_ENV}: run the timer/flag enablement command printed by ${SCHEDULER_HANDOFF_COMMAND}`,
        `After the first scheduled service run completes after scheduler timer activation: ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND}`,
        `After first scheduled service-run verification: ${SCHEDULER_EVIDENCE_RECORD_COMMAND}`,
        SCHEDULER_EVIDENCE_VERIFY_COMMAND,
        `${COMPLETION_STATUS_COMMAND} -- --require-complete`,
      ]
    : [
        `Review ${APPROVAL_PACKET}`,
        CURRENT_GATE_COMMAND,
        MANIFEST_PREFLIGHT_COMMAND,
        `No-live handoff before approval: ${PRODUCTION_HANDOFF_COMMAND}`,
        `Only after exact second-manual approval in ${REQUIRED_APPROVAL_ENV}: ${PRODUCTION_APPLY_COMMAND}`,
      ],
  nextAction: ok
    ? finalComplete
      ? "No remaining Recall daily sync completion gate."
      : schedulerGate
      ? `Current no-live gate is ready for exact scheduler enablement approval. Before enabling the timer, run ${SCHEDULER_HANDOFF_COMMAND}; after exact ${SCHEDULER_APPROVAL_ENV}, use its timer/flag enablement command, verify the first scheduled service run completed after timer activation, run ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND}, then record and verify private scheduler evidence.`
      : `Current no-live gate is ready for exact second-manual approval. Before any approved apply, rerun ${MANIFEST_PREFLIGHT_COMMAND} and ${PRODUCTION_HANDOFF_COMMAND}; then run ${PRODUCTION_APPLY_COMMAND} only after exact ${REQUIRED_APPROVAL_ENV} is present.`
    : `Do not run production apply or scheduler enablement. Resolve current-gate findings, then rerun ${CURRENT_GATE_COMMAND}.`,
  safetyNote:
    "This current-gate checker is no-live/no-write. It does not call Recall, import data, deploy, enable a scheduler, or advance checkpoints.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[check:recall-current-gate] failed");
  console.error(text);
  process.exit(1);
}

console.log(text);

function parseArgs(argv) {
  const parsed = {
    goalAuditResultPath: null,
    productionCommandResultPath: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--goal-audit-result" && next) {
      parsed.goalAuditResultPath = next;
      i += 1;
    } else if (arg === "--production-command-result" && next) {
      parsed.productionCommandResultPath = next;
      i += 1;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function validateGoalAudit(audit, result, findings) {
  if (result.ok !== true || !audit || typeof audit !== "object") {
    findings.push({
      id: "goal_completion_audit",
      rule: "audit_unavailable",
      message: "Goal completion audit checker must pass before current gate can be ready.",
      exitCode: result.exitCode,
    });
    return;
  }
  if (audit.ok !== true) {
    findings.push({
      id: "goal_completion_audit",
      rule: "audit_not_ok",
      message: "Goal completion audit checker did not report ok true.",
    });
  }
  if (audit.completionAchieved === true) {
    if (audit.status !== "goal_completion_audit_final_state_verified") {
      findings.push({
        id: "goal_completion_audit",
        rule: "wrong_final_audit_status",
        message: "Final goal completion audit must verify the completed state.",
      });
    }
    if (audit.currentBlockingGate !== null || audit.activeBlockedRequirement !== null) {
      findings.push({
        id: "goal_completion_audit",
        rule: "final_gate_not_clear",
        message: "Final goal completion audit must have no current gate or active blocked requirement.",
      });
    }
    return;
  }
  if (audit.status !== "goal_completion_audit_current_incomplete_state_verified") {
    findings.push({
      id: "goal_completion_audit",
      rule: "wrong_audit_status",
      message: "Goal completion audit must verify the current incomplete state.",
    });
  }
  if (audit.completionAchieved !== false) {
    findings.push({
      id: "goal_completion_audit",
      rule: "completion_already_achieved",
      message: "Current gate checker is stale if completion has already been achieved.",
    });
  }
  if (audit.currentBlockingGate !== REQUIRED_CURRENT_GATE) {
    if (audit.currentBlockingGate !== SCHEDULER_GATE) {
      findings.push({
        id: "goal_completion_audit",
        rule: "wrong_current_gate",
        message: `Expected current gate ${REQUIRED_CURRENT_GATE} or ${SCHEDULER_GATE}.`,
      });
    }
  }
  if (audit.currentBlockingGate === REQUIRED_CURRENT_GATE) {
    if (audit.activeBlockedRequirement !== REQUIRED_ACTIVE_REQUIREMENT) {
      findings.push({
        id: "goal_completion_audit",
        rule: "wrong_active_requirement",
        message: `Expected active blocked requirement ${REQUIRED_ACTIVE_REQUIREMENT}.`,
      });
    }
    if (audit.manualCleanRunReadiness?.cleanRunCount !== 1) {
      findings.push({
        id: "goal_completion_audit",
        rule: "unexpected_manual_clean_run_count",
        message: "Second-manual gate expects exactly one clean manual run before verification.",
      });
    }
    if (audit.manualCleanRunReadiness?.needsSecondManualVerificationRun !== true) {
      findings.push({
        id: "goal_completion_audit",
        rule: "second_manual_run_not_needed",
        message: "Second-manual gate expects the second manual verification run to still be needed.",
      });
    }
  }
  if (audit.currentBlockingGate === SCHEDULER_GATE) {
    if (audit.activeBlockedRequirement !== SCHEDULER_ACTIVE_REQUIREMENT) {
      findings.push({
        id: "goal_completion_audit",
        rule: "wrong_active_requirement",
        message: `Expected active blocked requirement ${SCHEDULER_ACTIVE_REQUIREMENT}.`,
      });
    }
    if (
      typeof audit.manualCleanRunReadiness?.cleanRunCount !== "number" ||
      audit.manualCleanRunReadiness.cleanRunCount < 2
    ) {
      findings.push({
        id: "goal_completion_audit",
        rule: "unexpected_manual_clean_run_count",
        message: "Scheduler gate expects at least two clean manual runs.",
      });
    }
    if (audit.manualCleanRunReadiness?.needsSecondManualVerificationRun !== false) {
      findings.push({
        id: "goal_completion_audit",
        rule: "second_manual_run_still_needed",
        message: "Scheduler gate expects the second manual verification run to be complete.",
      });
    }
    if (audit.manualCleanRunReadiness?.schedulerEnablementApprovalAllowedByManualRunEvidence !== true) {
      findings.push({
        id: "goal_completion_audit",
        rule: "scheduler_approval_not_allowed_by_manual_runs",
        message: "Scheduler gate expects manual-run evidence to allow explicit scheduler approval.",
      });
    }
  }
}

function validateSchedulerGate(audit, productionHandoff, findings) {
  if (productionHandoff.skipped !== true && productionHandoff.exitCode === 0) {
    findings.push({
      id: "production_handoff",
      rule: "second_manual_handoff_unexpectedly_ready_after_apply",
      message: "Second-manual production handoff should not remain the active gate after the second clean apply is counted.",
    });
  }
  if (!Array.isArray(audit.blockedActions) || !audit.blockedActions.includes("scheduler")) {
    findings.push({
      id: "goal_completion_audit",
      rule: "scheduler_not_blocked",
      message: "Scheduler gate must keep scheduler action blocked until exact scheduler approval and evidence recording.",
    });
  }
  if (!Array.isArray(audit.blockedActions) || !audit.blockedActions.includes("checkpoint")) {
    findings.push({
      id: "goal_completion_audit",
      rule: "checkpoint_not_blocked",
      message: "Scheduler gate must keep checkpoint action blocked until scheduler evidence passes.",
    });
  }
  if (Array.isArray(audit.blockedActions) && audit.blockedActions.includes("second_manual_verification")) {
    findings.push({
      id: "goal_completion_audit",
      rule: "second_manual_still_blocked_after_apply",
      message: "Second manual verification must not remain blocked after the reviewed second apply report is counted.",
    });
  }
}

function validateProductionHandoff(handoff, result, findings) {
  if (result.ok !== true || !handoff || typeof handoff !== "object") {
    findings.push({
      id: "production_handoff",
      rule: "handoff_unavailable",
      message: "Second-manual production command handoff must pass before current gate can be ready.",
      exitCode: result.exitCode,
    });
    return;
  }
  if (handoff.ok !== true) {
    findings.push({
      id: "production_handoff",
      rule: "handoff_not_ok",
      message: "Production handoff did not report ok true.",
    });
  }
  if (handoff.noLiveNoWrite !== true) {
    findings.push({
      id: "production_handoff",
      rule: "handoff_not_no_live",
      message: "Production handoff must be no-live/no-write.",
    });
  }
  if (handoff.approvalRequired !== true) {
    findings.push({
      id: "production_handoff",
      rule: "approval_not_required",
      message: "Production handoff must require exact approval.",
    });
  }
  if (handoff.approvalStatus?.requiredEnv !== REQUIRED_APPROVAL_ENV) {
    findings.push({
      id: "production_handoff",
      rule: "wrong_approval_env",
      message: `Production handoff must require ${REQUIRED_APPROVAL_ENV}.`,
    });
  }
  if (handoff.approvalStatus?.requiredApprovalKind !== "second_manual_verification") {
    findings.push({
      id: "production_handoff",
      rule: "wrong_approval_kind",
      message: "Production handoff must require second_manual_verification approval.",
    });
  }
  if (handoff.approvalStatus?.firstApplyApprovalPresent === true) {
    findings.push({
      id: "production_handoff",
      rule: "stale_first_apply_approval_present",
      message:
        "First capped apply approval is present in the environment, but the current gate is second manual verification. Unset stale first-apply approval before checking the current gate.",
    });
  }
  if (
    handoff.approvalStatus?.secondManualApprovalTextPresent === true &&
    handoff.approvalStatus?.manualVerificationApprovalExact !== true
  ) {
    findings.push({
      id: "production_handoff",
      rule: "second_manual_approval_wrong_env",
      message:
        "Second manual approval text is present outside BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL. Put exact approval in the required env var before running the approved apply.",
    });
  }
  if (handoff.approvalStatus?.manualVerificationApprovalExact === true) {
    findings.push({
      id: "production_handoff",
      rule: "approval_already_present",
      message: "Exact approval is already present in the environment; stop and run the approved apply intentionally.",
    });
  }
  if (handoff.handoffProgress?.stoppedAt !== REQUIRED_HANDOFF_STOP) {
    findings.push({
      id: "production_handoff",
      rule: "wrong_handoff_stop",
      message: `Production handoff must stop at ${REQUIRED_HANDOFF_STOP}.`,
    });
  }
  if (handoff.handoffProgress?.readyForExactApproval !== true) {
    findings.push({
      id: "production_handoff",
      rule: "not_ready_for_exact_approval",
      message: "Production handoff must report readyForExactApproval true.",
    });
  }
  if (handoff.handoffProgress?.localPrivateGatesSkippedForProductionPath !== true) {
    findings.push({
      id: "production_handoff",
      rule: "local_private_gates_not_skipped",
      message: "Production handoff must skip broad local private gates for the production remote-runtime path.",
    });
  }
  if (handoff.handoffProgress?.localGateStatus !== REQUIRED_LOCAL_GATE_STATUS) {
    findings.push({
      id: "production_handoff",
      rule: "local_gate_status_not_ready",
      message: `Production handoff localGateStatus must be ${REQUIRED_LOCAL_GATE_STATUS}.`,
    });
  }
  if (handoff.handoffProgress?.remotePreflightPassed !== true) {
    findings.push({
      id: "production_handoff",
      rule: "remote_preflight_not_passed",
      message: "Production handoff must pass remote preflight.",
    });
  }
  if (handoff.handoffProgress?.remotePreflightStatus !== REQUIRED_REMOTE_PREFLIGHT_STATUS) {
    findings.push({
      id: "production_handoff",
      rule: "wrong_remote_preflight_status",
      message: `Remote preflight status must be ${REQUIRED_REMOTE_PREFLIGHT_STATUS}.`,
    });
  }
  if (handoff.handoffProgress?.liveWriteAttempted !== false) {
    findings.push({
      id: "production_handoff",
      rule: "live_write_attempted",
      message: "Current gate checker must not attempt a live write.",
    });
  }
  if (handoff.remotePreflight?.timer?.enabled !== false || handoff.remotePreflight?.timer?.active !== false) {
    findings.push({
      id: "production_handoff",
      rule: "timer_not_disabled",
      message: "Scheduler timer must remain disabled/inactive before scheduler approval.",
    });
  }
  if (handoff.remotePreflight?.envFlags !== "recall_remote_enable_flags_disabled") {
    findings.push({
      id: "production_handoff",
      rule: "remote_enable_flags_not_disabled",
      message: "Remote Recall enable flags must remain disabled before exact approval/scheduler enablement.",
    });
  }
  if (handoff.remotePreflight?.liveApplyDelegationAllowed !== true) {
    findings.push({
      id: "production_handoff",
      rule: "live_apply_delegation_not_ready",
      message: "Remote preflight must allow live apply delegation after exact approval.",
    });
  }
  if (handoff.remotePreflight?.deployedLatestReports?.selectedMatchesRemoteLatest !== true) {
    findings.push({
      id: "production_handoff",
      rule: "deployed_proof_pair_not_current",
      message: "Production handoff must use the latest deployed proof pair.",
    });
  }
}

function summarizeManualCleanRunReadiness(readiness) {
  if (!readiness || typeof readiness !== "object") return null;
  return {
    requiredManualCleanRunsBeforeSchedulerEnable:
      readiness.requiredManualCleanRunsBeforeSchedulerEnable ?? null,
    cleanRunCount: readiness.cleanRunCount ?? null,
    needsSecondManualVerificationRun: readiness.needsSecondManualVerificationRun ?? null,
    schedulerEnablementApprovalAllowedByManualRunEvidence:
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
  };
}

function readResultOrRun(resultPath, run) {
  if (!resultPath) return run();
  try {
    const parsed = JSON.parse(readFileSync(resolve(resultPath), "utf8"));
    return { ok: true, exitCode: 0, parsed };
  } catch (error) {
    return { ok: false, exitCode: 1, parsed: null, error: error.message };
  }
}

function skippedResult(status) {
  return {
    ok: true,
    skipped: true,
    status,
    exitCode: 0,
    parsed: null,
  };
}

function runJsonCommand(args) {
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return parseCommandResult(result);
}

function runNpmJsonCommand(args) {
  const result = spawnSync("npm", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return parseCommandResult(result);
}

function parseCommandResult(result) {
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseJsonObject(text),
  };
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text).match(/\{[\s\S]*\}\s*$/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function printHelp() {
  console.log(`Usage: node scripts/check-recall-current-gate.mjs [options]

No-live/no-write current-gate checker that combines the goal completion audit and second-manual production handoff.

Options:
  --goal-audit-result <path>          Read goal-audit checker JSON from a fixture/file.
  --production-command-result <path>  Read production-command handoff JSON from a fixture/file.
  --help                              Show this help.
`);
}
