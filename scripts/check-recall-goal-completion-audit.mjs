#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_AUDIT_DOC =
  "docs/plans/recall-sync/RECALL_DAILY_SYNC_FINAL_COMPLETION_AUDIT_2026-06-28_01-40-12_IST.md";
const SECOND_MANUAL_STATUS = "blocked_second_manual_verification_run";
const SECOND_MANUAL_GATE = "second_manual_verification_run";
const SECOND_MANUAL_ACTIVE_REQUIREMENT = "second_manual_verification";
const SECOND_MANUAL_EXTERNAL_ACTION = "approve_second_manual_verification_run_before_scheduler_enablement";
const SCHEDULER_STATUS = "blocked_scheduler_enablement";
const SCHEDULER_GATE = "scheduler_enablement";
const SCHEDULER_ACTIVE_REQUIREMENT = "scheduler_enablement";
const SCHEDULER_EXTERNAL_ACTION = "approve_scheduler_enablement_after_repeated_clean_manual_runs";
const SCHEDULER_HANDOFF_COMMAND = "npm run recall:scheduler-enable:command";
const SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND = "npm run recall:scheduler-evidence:command";
const SCHEDULER_EVIDENCE_RECORD_COMMAND = "npm run recall:scheduler-enable-evidence:record";
const SCHEDULER_EVIDENCE_VERIFY_COMMAND = "npm run check:recall-scheduler-enable-evidence";
const REQUIRED_DONE_REQUIREMENTS = [
  "live_spike_proof",
  "private_live_diagnostic_proof",
  "approval_packet_and_public_privacy",
  "first_apply_key_and_proof_readiness",
  "first_capped_apply",
  "post_apply_review",
  "scheduler_artifacts",
  "production_deploy",
];
const REQUIRED_FINAL_DONE_REQUIREMENTS = [...REQUIRED_DONE_REQUIREMENTS, "scheduler_enablement"];
const REQUIRED_BLOCKED_ACTIONS = ["second_manual_verification", "scheduler", "checkpoint"];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
const auditText = readFile(args.auditDocPath, findings);
const completionStatus = readResultOrRun(args.completionStatusResultPath, () =>
  runJsonCommand(["scripts/check-recall-daily-sync-completion-status.mjs"]),
);
const preliveReadiness = args.preliveResultPath
  ? readResultOrRun(args.preliveResultPath, () => skippedResult("prelive_result_not_requested"))
  : skippedResult("prelive_result_not_requested");
const completion = completionStatus.parsed ?? {};
const finalAuditMode = completion.completionAchieved === true;

validateAuditDoc(auditText, findings, { finalAuditMode });
validateCompletionStatus(completion, completionStatus, findings);
validatePreliveReadiness(
  preliveReadiness.parsed ?? null,
  preliveReadiness,
  findings,
  completion.currentBlockingGate ?? null,
);

const ok = findings.length === 0;
const schedulerReadiness = extractSchedulerManualReadiness(completion);
const output = {
  ok,
  status: ok
    ? finalAuditMode
      ? "goal_completion_audit_final_state_verified"
      : "goal_completion_audit_current_incomplete_state_verified"
    : "blocked_goal_completion_audit",
  noLiveNoWrite: true,
  auditDocPath: args.auditDocPath,
  completionAchieved: completion.completionAchieved === true,
  currentBlockingGate: completion.currentBlockingGate ?? null,
  activeBlockedRequirement: completion.activeBlockedRequirement ?? null,
  blockedRequirements: Array.isArray(completion.blockedRequirements) ? completion.blockedRequirements : [],
  blockedActions: Array.isArray(completion.blockedActions) ? completion.blockedActions : [],
  manualCleanRunReadiness: schedulerReadiness
    ? {
        requiredManualCleanRunsBeforeSchedulerEnable:
          schedulerReadiness.requiredManualCleanRunsBeforeSchedulerEnable ?? null,
        cleanRunCount: schedulerReadiness.cleanRunCount ?? null,
        needsSecondManualVerificationRun: schedulerReadiness.needsSecondManualVerificationRun ?? null,
        schedulerEnablementApprovalAllowedByManualRunEvidence:
          schedulerReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
      }
    : null,
  checked: {
    auditDoc: summarizeAuditDoc(auditText),
    completionStatus: {
      exitCode: completionStatus.exitCode,
      noLiveNoWrite: completion.noLiveNoWrite === true,
      status: completion.status ?? null,
      currentBlockingGate: completion.currentBlockingGate ?? null,
      activeBlockedRequirement: completion.activeBlockedRequirement ?? null,
    },
    preliveReadiness: summarizePreliveReadiness(preliveReadiness),
  },
  findings,
  safeNextCommands: safeNextCommandsFor(completion),
  safetyNote:
    "This checker is no-live/no-write. It reads the public audit document and no-live completion status only.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[check:recall-goal-completion-audit] failed");
  console.error(text);
  process.exit(1);
}

console.log(text);

function parseArgs(argv) {
  const parsed = {
    auditDocPath: DEFAULT_AUDIT_DOC,
    completionStatusResultPath: null,
    preliveResultPath: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--audit-doc" && next) {
      parsed.auditDocPath = next;
      i += 1;
    } else if (arg === "--completion-status-result" && next) {
      parsed.completionStatusResultPath = next;
      i += 1;
    } else if (arg === "--prelive-result" && next) {
      parsed.preliveResultPath = next;
      i += 1;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function readFile(filePath, findings) {
  try {
    return readFileSync(resolve(filePath), "utf8");
  } catch (error) {
    findings.push({
      id: "audit_doc",
      rule: "audit_doc_unreadable",
      message: `Could not read audit doc at ${filePath}: ${error.message}`,
    });
    return "";
  }
}

function validateAuditDoc(text, findings, { finalAuditMode }) {
  const requiredSnippets = finalAuditMode
    ? [
        "# Recall Daily Sync Goal Completion Audit",
        "Status: Final audit, goal complete",
        "The full Recall daily-sync goal is complete.",
        "completionAchieved: true",
        "status: complete",
        "currentBlockingGate: null",
        "activeBlockedRequirement: null",
        "Scheduler enablement evidence recorded | Done",
        "Daily scheduler enabled and first run verified | Done",
        "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
        "data/private/recall-live-spikes/scheduler-enable-evidence.json",
        "data/private/recall-live-spikes/scheduler-system-state-20260627T200306Z.json",
        "data/private/recall-live-spikes/scheduled-apply-20260627T200306Z.json",
        "brain-recall-sync.timer",
        "timer.enabled: true",
        "timer.active: true",
        "service.lastRunOk: true",
        "service.lastRunExitCode: 0",
        "manualCleanRunReadiness.cleanRunCount: 7",
        "Manual clean runs before enablement: `6`",
        "No remaining Recall daily-sync completion gate is open.",
        "No manual service start was used as first-run proof",
        "This audit includes no Recall API key or secret value.",
      ]
    : [
        "# Recall Daily Sync Goal Completion Audit",
        "Status: Current-state audit, goal not complete",
        "The full goal is not complete yet",
        "Second manual production verification apply | Done",
        "At least two distinct clean manual runs before scheduler | Done",
        "Scheduler enablement evidence recorded | Not done",
        "Daily scheduler enabled and first run verified | Not done",
        "The local-private-gate blocker is fixed for the current second-manual production path.",
        "Broad pre-live now carries nextGate.localGateResolution proof",
        "second manual apply report: data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json",
        "liveWriteAttempted: true",
        "manualCleanRunReadiness.cleanRunCount >= 2",
        "data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json",
        "data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json",
        "data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json",
        "manualCleanRunReadiness.needsSecondManualVerificationRun: false",
        "manualCleanRunReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence: true",
        "nextGate.localGateResolution.preApplyProgress.selectedReports.timestamp: 2026-06-26_21-58-57_IST",
        "nextGate.localGateResolution.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest: true",
        "nextGate.localGateResolution.staleFirstApplyApprovalProgress.blockingFindingIds: stale_first_apply_approval",
        "nextGate.localGateResolution.staleFirstApplyApprovalProgress.localPrivateGatesSkippedForProductionPath: true",
        "nextGate.localGateResolution.staleFirstApplyApprovalProgress.remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight",
        "nextGate.localGateResolution.staleFirstApplyApprovalProgress.deployedLatestReports.selectedMatchesRemoteLatest: true",
        "currentBlockingGate: scheduler_enablement",
        "activeBlockedRequirement: scheduler_enablement",
        "recall:scheduler-enable:command",
        "recall:scheduler-evidence:command",
        "ready_for_exact_scheduler_approval",
        "recall:scheduler-enable-evidence:record",
        "check:recall-scheduler-enable-evidence",
        "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL",
        "The first capped apply approval is already spent",
        "the follow-up audit/checker updates made no additional live Recall call",
        "This audit includes no Recall API key or secret value.",
      ];

  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) {
      findings.push({
        id: "audit_doc",
        rule: "missing_required_snippet",
        message: `Audit doc is missing required snippet: ${snippet}`,
      });
    }
  }

  if (/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text)) {
    findings.push({
      id: "audit_doc",
      rule: "secret_shaped_value",
      message: "Audit doc contains a secret-shaped value.",
    });
  }
}

function validatePreliveReadiness(parsed, result, findings, expectedCurrentGate) {
  if (result.skipped === true) return;
  if (result.ok !== true || !parsed || typeof parsed !== "object") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_unavailable",
      message: "Pre-live readiness result must be readable JSON when --prelive-result is supplied.",
      exitCode: result.exitCode,
    });
    return;
  }
  if (parsed.ok !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_not_ok",
      message: "Pre-live readiness must report ok true.",
    });
  }
  const nextGate = parsed.nextGate ?? {};
  if (expectedCurrentGate === SCHEDULER_GATE) {
    if (nextGate.currentProductionGate?.currentBlockingGate !== SCHEDULER_GATE) {
      findings.push({
        id: "prelive_readiness",
        rule: "prelive_wrong_scheduler_current_gate",
        message: "Post-second-manual pre-live current production gate must be scheduler_enablement.",
        currentBlockingGate: nextGate.currentProductionGate?.currentBlockingGate ?? null,
      });
    }
    return;
  }
  if (expectedCurrentGate === null) {
    return;
  }
  const localGate = nextGate.localGateResolution ?? {};
  const preApply = localGate.preApplyProgress ?? {};
  const staleFirstApply = localGate.staleFirstApplyApprovalProgress ?? {};
  if (nextGate.currentProductionGate?.currentBlockingGate !== SECOND_MANUAL_GATE) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_wrong_current_gate",
      message: "Pre-live current production gate must be second_manual_verification_run.",
      currentBlockingGate: nextGate.currentProductionGate?.currentBlockingGate ?? null,
    });
  }
  if (localGate.noLiveNoWrite !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_not_no_live",
      message: "Pre-live localGateResolution must be no-live/no-write.",
    });
  }
  if (localGate.liveWriteAttempted !== false) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_live_write_attempted",
      message: "Pre-live localGateResolution must report liveWriteAttempted false.",
    });
  }
  if (localGate.currentGate !== SECOND_MANUAL_GATE) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_wrong_gate",
      message: "Pre-live localGateResolution must name second_manual_verification_run.",
      currentGate: localGate.currentGate ?? null,
    });
  }
  if (preApply.stoppedAt !== "approval_gate") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_wrong_stop",
      message: "Pre-live localGateResolution must preserve approval_gate stop.",
      stoppedAt: preApply.stoppedAt ?? null,
    });
  }
  if (preApply.localPrivateGatesSkippedForProductionPath !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_bypass_not_preserved",
      message: "Pre-live localGateResolution must preserve local-private-gate bypass proof.",
    });
  }
  if (preApply.remotePreflightStatus !== "ready_for_second_manual_remote_runtime_preflight") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_wrong_remote_preflight",
      message: "Pre-live localGateResolution must preserve ready remote preflight status.",
      remotePreflightStatus: preApply.remotePreflightStatus ?? null,
    });
  }
  if (preApply.selectedReports?.selectedBy !== "remote_latest_deployed_pair") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_wrong_selected_by",
      message: "Pre-live localGateResolution must preserve remote latest deployed proof-pair selection.",
      selectedBy: preApply.selectedReports?.selectedBy ?? null,
    });
  }
  if (!preApply.selectedReports?.timestamp) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_missing_selected_timestamp",
      message: "Pre-live localGateResolution must expose selected proof-pair timestamp.",
    });
  }
  if (preApply.remoteProofReports?.enumerationOk !== true || preApply.remoteProofReports?.fidelityOk !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_proof_not_ready",
      message: "Pre-live localGateResolution must preserve passing SPIKE proof readiness.",
    });
  }
  if (preApply.deployedLatestReports?.selectedMatchesRemoteLatest !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_local_gate_not_latest",
      message: "Pre-live localGateResolution must prove selected proof pair matches the latest deployed pair.",
    });
  }
  if (staleFirstApply.stoppedAt !== "approval_gate") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_wrong_stop",
      message: "Pre-live stale-first-apply proof must preserve approval_gate stop.",
      stoppedAt: staleFirstApply.stoppedAt ?? null,
    });
  }
  if (
    !Array.isArray(staleFirstApply.blockingFindingIds) ||
    !staleFirstApply.blockingFindingIds.includes("stale_first_apply_approval")
  ) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_missing_finding",
      message: "Pre-live stale-first-apply proof must classify stale_first_apply_approval.",
    });
  }
  if (staleFirstApply.localPrivateGatesSkippedForProductionPath !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_local_gate_bypass_not_preserved",
      message: "Pre-live stale-first-apply proof must preserve local-private-gate bypass proof.",
    });
  }
  if (staleFirstApply.localGateStatus !== "not_blocking_production_path") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_local_gate_ambiguous",
      message: "Pre-live stale-first-apply proof must report localGateStatus: not_blocking_production_path.",
      localGateStatus: staleFirstApply.localGateStatus ?? null,
    });
  }
  if (staleFirstApply.remotePreflightStatus !== "ready_for_second_manual_remote_runtime_preflight") {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_wrong_remote_preflight",
      message: "Pre-live stale-first-apply proof must preserve ready remote preflight status.",
      remotePreflightStatus: staleFirstApply.remotePreflightStatus ?? null,
    });
  }
  if (staleFirstApply.liveWriteAttempted !== false) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_live_write_attempted",
      message: "Pre-live stale-first-apply proof must report liveWriteAttempted false.",
    });
  }
  if (staleFirstApply.deployedLatestReports?.selectedMatchesRemoteLatest !== true) {
    findings.push({
      id: "prelive_readiness",
      rule: "prelive_stale_first_apply_not_latest",
      message: "Pre-live stale-first-apply proof must prove selected proof pair matches the latest deployed pair.",
    });
  }
}

function validateCompletionStatus(status, result, findings) {
  if (result.ok !== true || !status || typeof status !== "object") {
    findings.push({
      id: "completion_status",
      rule: "completion_status_unavailable",
      message: "Completion status command/result must be readable JSON and exit successfully.",
      exitCode: result.exitCode,
    });
    return;
  }
  if (status.noLiveNoWrite !== true) {
    findings.push({
      id: "completion_status",
      rule: "completion_status_not_no_live",
      message: "Completion status must identify itself as no-live/no-write.",
    });
  }
  if (status.completionAchieved === true) {
    validateFinalCompletionStatus(status, findings);
    return;
  }
  if (status.completionAchieved !== false) {
    findings.push({
      id: "completion_status",
      rule: "completion_status_not_current_incomplete_state",
      message: "The current incomplete-goal audit is stale if completionAchieved is no longer false.",
    });
  }

  if (status.currentBlockingGate === SECOND_MANUAL_GATE) {
    findings.push({
      id: "completion_status",
      rule: "stale_second_manual_gate_after_approved_apply",
      message: "The current audit is post-second-manual; completion status must now be waiting at scheduler_enablement.",
    });
  } else if (status.currentBlockingGate === SCHEDULER_GATE) {
    validateSchedulerCompletionStatus(status, findings);
  } else {
    findings.push({
      id: "completion_status",
      rule: "wrong_status",
      message: `Expected ${SECOND_MANUAL_STATUS} or ${SCHEDULER_STATUS}, got ${String(status.status)}.`,
    });
    findings.push({
      id: "completion_status",
      rule: "wrong_current_gate",
      message: `Expected currentBlockingGate ${SECOND_MANUAL_GATE} or ${SCHEDULER_GATE}, got ${String(status.currentBlockingGate)}.`,
    });
  }

  if (!Array.isArray(status.blockedRequirements) || !status.blockedRequirements.includes("scheduler_enablement")) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_blocked_requirement",
      message: "Completion status must preserve scheduler_enablement as the broader remaining requirement.",
    });
  }

  const requirements = Array.isArray(status.requirements) ? status.requirements : [];
  for (const id of REQUIRED_DONE_REQUIREMENTS) {
    const requirement = requirements.find((entry) => entry?.id === id);
    if (requirement?.ok !== true) {
      findings.push({
        id: "completion_status",
        rule: "required_done_requirement_not_done",
        message: `Requirement ${id} must be done for the current audit state.`,
      });
    }
  }

  const schedulerRequirement = requirements.find((entry) => entry?.id === "scheduler_enablement");
  if (schedulerRequirement?.ok !== false) {
    findings.push({
      id: "completion_status",
      rule: "scheduler_requirement_not_pending",
      message: "Scheduler enablement must still be pending for this current-state audit.",
    });
  }
  if (schedulerRequirement?.status !== "missing_scheduler_enablement_evidence") {
    findings.push({
      id: "completion_status",
      rule: "wrong_scheduler_requirement_status",
      message: "Scheduler enablement requirement must report missing_scheduler_enablement_evidence.",
    });
  }
}

function validateFinalCompletionStatus(status, findings) {
  if (status.status !== "complete") {
    findings.push({
      id: "completion_status",
      rule: "wrong_final_status",
      message: `Expected final status complete, got ${String(status.status)}.`,
    });
  }
  if (status.currentBlockingGate !== null) {
    findings.push({
      id: "completion_status",
      rule: "final_current_gate_not_clear",
      message: "Final completion status must have no current blocking gate.",
      currentBlockingGate: status.currentBlockingGate ?? null,
    });
  }
  if (status.activeBlockedRequirement !== null) {
    findings.push({
      id: "completion_status",
      rule: "final_active_requirement_not_clear",
      message: "Final completion status must have no active blocked requirement.",
      activeBlockedRequirement: status.activeBlockedRequirement ?? null,
    });
  }
  if (status.externalActionRequired !== false) {
    findings.push({
      id: "completion_status",
      rule: "final_external_action_required",
      message: "Final completion status must not require an external action.",
    });
  }
  if (Array.isArray(status.blockedRequirements) && status.blockedRequirements.length > 0) {
    findings.push({
      id: "completion_status",
      rule: "final_blocked_requirements_not_clear",
      message: "Final completion status must have no blocked requirements.",
      blockedRequirements: status.blockedRequirements,
    });
  }
  const blockedActions = Array.isArray(status.blockedActions) ? status.blockedActions : [];
  for (const action of ["second_manual_verification", "scheduler"]) {
    if (blockedActions.includes(action)) {
      findings.push({
        id: "completion_status",
        rule: "final_blocked_action_still_open",
        message: `Final completion status must not block ${action}.`,
      });
    }
  }

  const requirements = Array.isArray(status.requirements) ? status.requirements : [];
  for (const id of REQUIRED_FINAL_DONE_REQUIREMENTS) {
    const requirement = requirements.find((entry) => entry?.id === id);
    if (requirement?.ok !== true || requirement?.status !== "done") {
      findings.push({
        id: "completion_status",
        rule: "final_required_requirement_not_done",
        message: `Requirement ${id} must be done in the final audit state.`,
      });
    }
  }

  const schedulerRequirement = requirements.find((entry) => entry?.id === "scheduler_enablement");
  if (schedulerRequirement?.evidence?.verdict !== "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION") {
    findings.push({
      id: "completion_status",
      rule: "final_scheduler_evidence_verdict_missing",
      message: "Final scheduler requirement must include the accepted scheduler enablement verdict.",
    });
  }
  const summary = schedulerRequirement?.evidence?.summary ?? {};
  if (summary.timer?.enabled !== true || summary.timer?.active !== true) {
    findings.push({
      id: "completion_status",
      rule: "final_scheduler_timer_not_active",
      message: "Final scheduler evidence must show brain-recall-sync.timer enabled and active.",
    });
  }
  if (summary.firstRun?.ok !== true || summary.firstRun?.applyReportVerdict !== "PASS_POST_APPLY_REVIEW_GATE") {
    findings.push({
      id: "completion_status",
      rule: "final_first_scheduled_run_not_verified",
      message: "Final scheduler evidence must show the first scheduled service-run report passed review.",
    });
  }
  if (summary.manualCleanRunsBeforeEnable < 2 || summary.manualCleanRunEvidenceCount < 2) {
    findings.push({
      id: "completion_status",
      rule: "final_insufficient_manual_clean_runs",
      message: "Final scheduler evidence must preserve at least two manual clean runs before enablement.",
    });
  }

  const readiness = schedulerRequirement?.evidence?.manualCleanRunReadiness ?? null;
  if (!readiness || readiness.needsSecondManualVerificationRun !== false) {
    findings.push({
      id: "completion_status",
      rule: "final_manual_readiness_not_settled",
      message: "Final scheduler evidence must preserve that the second manual verification is no longer needed.",
    });
  }
  if (readiness && readiness.schedulerEnablementApprovalAllowedByManualRunEvidence !== true) {
    findings.push({
      id: "completion_status",
      rule: "final_scheduler_manual_readiness_not_allowed",
      message: "Final scheduler evidence must preserve that scheduler approval was allowed by manual-run evidence.",
    });
  }

  const cleanRuns = Array.isArray(readiness?.cleanRuns) ? readiness.cleanRuns : [];
  const hasFirstScheduledReport = cleanRuns.some((run) =>
    String(run?.applyReportPath ?? "").includes("scheduled-apply-20260627T200306Z.json"),
  );
  if (!hasFirstScheduledReport) {
    findings.push({
      id: "completion_status",
      rule: "final_first_run_report_not_current",
      message: "Final scheduler readiness must reference the first real scheduled service-run report.",
    });
  }
  if (Array.isArray(status.safeNextCommands) && status.safeNextCommands.length > 0) {
    findings.push({
      id: "completion_status",
      rule: "final_safe_next_commands_not_empty",
      message: "Final completion status must not have remaining safe next commands.",
    });
  }
  const nextAction = String(status.nextGate?.nextAction ?? "");
  if (!nextAction.includes("No remaining Recall daily sync completion gate.")) {
    findings.push({
      id: "completion_status",
      rule: "final_next_action_not_clear",
      message: "Final next action must state that no Recall daily sync completion gate remains.",
    });
  }
}

function validateSecondManualCompletionStatus(status, findings) {
  if (status.status !== SECOND_MANUAL_STATUS) {
    findings.push({
      id: "completion_status",
      rule: "wrong_status",
      message: `Expected ${SECOND_MANUAL_STATUS}, got ${String(status.status)}.`,
    });
  }
  if (status.activeBlockedRequirement !== SECOND_MANUAL_ACTIVE_REQUIREMENT) {
    findings.push({
      id: "completion_status",
      rule: "wrong_active_requirement",
      message: `Expected activeBlockedRequirement ${SECOND_MANUAL_ACTIVE_REQUIREMENT}.`,
    });
  }
  if (status.externalAction !== SECOND_MANUAL_EXTERNAL_ACTION) {
    findings.push({
      id: "completion_status",
      rule: "wrong_external_action",
      message: `Expected externalAction ${SECOND_MANUAL_EXTERNAL_ACTION}.`,
    });
  }
  for (const action of ["second_manual_verification", "scheduler", "checkpoint"]) {
    if (!Array.isArray(status.blockedActions) || !status.blockedActions.includes(action)) {
      findings.push({
        id: "completion_status",
        rule: "missing_blocked_action",
        message: `Completion status must block ${action}.`,
      });
    }
  }
  const readiness = extractSchedulerManualReadiness(status);
  if (!readiness || typeof readiness !== "object") {
    findings.push({
      id: "completion_status",
      rule: "manual_clean_run_readiness_missing",
      message: "Scheduler requirement must include manual clean-run readiness.",
    });
  } else {
    if (readiness.requiredManualCleanRunsBeforeSchedulerEnable !== 2) {
      findings.push({
        id: "completion_status",
        rule: "wrong_required_manual_clean_runs",
        message: "Scheduler enablement must require exactly two manual clean runs.",
      });
    }
    if (readiness.cleanRunCount !== 1) {
      findings.push({
        id: "completion_status",
        rule: "wrong_current_manual_clean_run_count",
        message: "This current-state audit expects exactly one clean manual run.",
      });
    }
    if (readiness.needsSecondManualVerificationRun !== true) {
      findings.push({
        id: "completion_status",
        rule: "second_manual_run_not_needed",
        message: "This current-state audit expects the second manual verification run to still be needed.",
      });
    }
    if (readiness.schedulerEnablementApprovalAllowedByManualRunEvidence !== false) {
      findings.push({
        id: "completion_status",
        rule: "scheduler_approval_unexpectedly_allowed",
        message: "Scheduler approval must not be allowed by manual-run evidence yet.",
      });
    }
  }

  const secondManualPath = status.secondManualVerificationPath ?? {};
  if (secondManualPath.localPrivateGatesAreNotThePlannedProductionGate !== true) {
    findings.push({
      id: "completion_status",
      rule: "local_gate_fix_not_exposed",
      message: "Completion status must expose that local private gates are not the planned production gate.",
    });
  }
  if (secondManualPath.noLiveHandoffCommand !== "npm run recall:second-manual:production-command") {
    findings.push({
      id: "completion_status",
      rule: "missing_current_handoff_command",
      message: "Completion status must expose the current no-live production handoff command.",
    });
  }
  if (secondManualPath.applyCommandAfterExactApproval !== "npm run recall:second-manual:production-apply") {
    findings.push({
      id: "completion_status",
      rule: "missing_current_apply_command",
      message: "Completion status must expose the guarded production apply command.",
    });
  }
}

function validateSchedulerCompletionStatus(status, findings) {
  if (status.status !== SCHEDULER_STATUS) {
    findings.push({
      id: "completion_status",
      rule: "wrong_status",
      message: `Expected ${SCHEDULER_STATUS}, got ${String(status.status)}.`,
    });
  }
  if (status.activeBlockedRequirement !== SCHEDULER_ACTIVE_REQUIREMENT) {
    findings.push({
      id: "completion_status",
      rule: "wrong_active_requirement",
      message: `Expected activeBlockedRequirement ${SCHEDULER_ACTIVE_REQUIREMENT}.`,
    });
  }
  if (status.externalAction !== SCHEDULER_EXTERNAL_ACTION) {
    findings.push({
      id: "completion_status",
      rule: "wrong_external_action",
      message: `Expected externalAction ${SCHEDULER_EXTERNAL_ACTION}.`,
    });
  }
  for (const action of ["scheduler", "checkpoint"]) {
    if (!Array.isArray(status.blockedActions) || !status.blockedActions.includes(action)) {
      findings.push({
        id: "completion_status",
        rule: "missing_blocked_action",
        message: `Completion status must block ${action}.`,
      });
    }
  }
  if (Array.isArray(status.blockedActions) && status.blockedActions.includes("second_manual_verification")) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_still_blocked_after_clean_run",
      message: "Second manual verification must no longer be blocked after the second clean manual apply report is counted.",
    });
  }

  const readiness = extractSchedulerManualReadiness(status);
  if (!readiness || typeof readiness !== "object") {
    findings.push({
      id: "completion_status",
      rule: "manual_clean_run_readiness_missing",
      message: "Scheduler requirement must include manual clean-run readiness.",
    });
    return;
  }
  if (readiness.requiredManualCleanRunsBeforeSchedulerEnable !== 2) {
    findings.push({
      id: "completion_status",
      rule: "wrong_required_manual_clean_runs",
      message: "Scheduler enablement must require exactly two manual clean runs.",
    });
  }
  if (typeof readiness.cleanRunCount !== "number" || readiness.cleanRunCount < 2) {
    findings.push({
      id: "completion_status",
      rule: "wrong_current_manual_clean_run_count",
      message: "Current post-apply audit expects at least two clean manual runs.",
    });
  }
  if (readiness.needsSecondManualVerificationRun !== false) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_run_still_needed",
      message: "Current post-apply audit expects the second manual verification run to be complete.",
    });
  }
  if (readiness.schedulerEnablementApprovalAllowedByManualRunEvidence !== true) {
    findings.push({
      id: "completion_status",
      rule: "scheduler_approval_not_allowed_by_manual_run_evidence",
      message: "Scheduler approval must now be allowed by two clean manual-run reports.",
    });
  }

  const cleanRuns = Array.isArray(readiness.cleanRuns) ? readiness.cleanRuns : [];
  const firstRun = cleanRuns.find((entry) => entry?.kind === "manual_first_capped_apply");
  const secondRun = cleanRuns.find((entry) => entry?.kind === "manual_second_guarded_apply_candidate");
  if (firstRun?.verdict !== "PASS_POST_APPLY_REVIEW_GATE" || firstRun?.ok !== true) {
    findings.push({
      id: "completion_status",
      rule: "first_manual_clean_run_missing",
      message: "Scheduler readiness must include the first capped apply as a reviewed clean manual run.",
    });
  }
  if (secondRun?.verdict !== "PASS_POST_APPLY_REVIEW_GATE" || secondRun?.ok !== true) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_clean_run_missing",
      message: "Scheduler readiness must include the second guarded apply as a reviewed clean manual run.",
    });
  }
  if (!String(secondRun?.applyReportPath ?? "").includes("scheduled-apply-20260627T050448Z.json")) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_apply_report_not_current",
      message: "Scheduler readiness must point at the reviewed second-manual apply report from this approved live run.",
    });
  }
  if (status.secondManualVerificationPath !== null) {
    findings.push({
      id: "completion_status",
      rule: "second_manual_path_still_exposed",
      message: "Second manual command path should be null once the active gate has advanced to scheduler_enablement.",
    });
  }
  const safeNext = Array.isArray(status.safeNextCommands) ? status.safeNextCommands : [];
  if (!safeNext.some((command) => command.includes(SCHEDULER_HANDOFF_COMMAND))) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_handoff_safe_next",
      message: "Scheduler-ready completion status must point to the no-live scheduler command handoff before approval.",
    });
  }
  if (!safeNext.some((command) => command.includes(SCHEDULER_EVIDENCE_RECORD_COMMAND))) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_evidence_record_safe_next",
      message: "Scheduler-ready completion status must point to scheduler evidence recording after exact approval.",
    });
  }
  if (!safeNext.some((command) => command.includes(SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND))) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_first_run_evidence_handoff_safe_next",
      message:
        "Scheduler-ready completion status must point to the no-live first-run evidence handoff before evidence recording.",
    });
  }
  if (
    !safeNext.some(
      (command) =>
        command.includes("timer/flags") &&
        (command.includes("first scheduled run") || command.includes("first scheduled service run")),
    )
  ) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_enable_and_first_run_safe_next",
      message:
        "Scheduler-ready completion status must keep timer/flag enablement and first scheduled run verification before evidence recording.",
    });
  }
  if (!safeNext.some((command) => command.includes(SCHEDULER_EVIDENCE_VERIFY_COMMAND))) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_evidence_verify_safe_next",
      message: "Scheduler-ready completion status must point to scheduler evidence verification.",
    });
  }
  const nextAction = String(status.nextGate?.nextAction ?? "");
  if (!nextAction.includes(SCHEDULER_HANDOFF_COMMAND) || !nextAction.includes("ready_for_exact_scheduler_approval")) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_handoff_next_action",
      message: "Scheduler-ready next action must require the no-live scheduler handoff proof before timer enablement.",
    });
  }
  if (!nextAction.includes(SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND)) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_first_run_evidence_handoff_next_action",
      message:
        "Scheduler-ready next action must require the first-run evidence handoff before scheduler evidence recording.",
    });
  }
  if (!nextAction.includes("schedulerEnablementAttempted=false")) {
    findings.push({
      id: "completion_status",
      rule: "missing_scheduler_no_mutation_next_action",
      message: "Scheduler-ready next action must prove the no-live handoff did not attempt scheduler enablement.",
    });
  }
}

function extractSchedulerManualReadiness(status) {
  return status?.requirements?.find((entry) => entry?.id === "scheduler_enablement")?.evidence
    ?.manualCleanRunReadiness ?? null;
}

function summarizeAuditDoc(text) {
  return {
    bytes: Buffer.byteLength(text, "utf8"),
    declaresGoalComplete: text.includes("Status: Final audit, goal complete"),
    declaresGoalNotComplete: text.includes("Status: Current-state audit, goal not complete"),
    declaresSecondManualComplete: text.includes("Second manual production verification apply | Done"),
    declaresSchedulerPending: text.includes("Scheduler enablement evidence recorded | Not done"),
    declaresSchedulerComplete: text.includes("Scheduler enablement evidence recorded | Done"),
    declaresFirstScheduledRunVerified: text.includes("Daily scheduler enabled and first run verified | Done"),
    declaresPreliveLocalGateResolution: text.includes("Broad pre-live now carries nextGate.localGateResolution proof"),
    declaresNoAdditionalLiveCall: text.includes("the follow-up audit/checker updates made no additional live Recall call"),
  };
}

function safeNextCommandsFor(completion) {
  if (completion.completionAchieved === true) {
    return [];
  }
  if (completion.currentBlockingGate === SCHEDULER_GATE) {
    return [
      "Review docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
      `No-live scheduler handoff before approval: run ${SCHEDULER_HANDOFF_COMMAND}`,
      "Only after exact scheduler approval: enable the timer/flags and verify the first scheduled service run completed after scheduler timer activation",
      `After the first scheduled service run completes after scheduler timer activation: ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND}`,
      `After first scheduled service-run verification: ${SCHEDULER_EVIDENCE_RECORD_COMMAND}`,
      SCHEDULER_EVIDENCE_VERIFY_COMMAND,
      "npm run recall:daily-sync:completion-status -- --require-complete",
    ];
  }
  return [
    "npm run recall:daily-sync:completion-status",
    "npm run recall:second-manual:production-command",
    "Only after exact second-manual approval: npm run recall:second-manual:production-apply",
  ];
}

function summarizePreliveReadiness(result) {
  if (result.skipped === true) {
    return {
      skipped: true,
      status: result.status,
    };
  }
  const localGate = result.parsed?.nextGate?.localGateResolution ?? {};
  const preApply = localGate.preApplyProgress ?? {};
  const staleFirstApply = localGate.staleFirstApplyApprovalProgress ?? {};
  return {
    skipped: false,
    exitCode: result.exitCode,
    ok: result.parsed?.ok === true,
    currentBlockingGate: result.parsed?.nextGate?.currentProductionGate?.currentBlockingGate ?? null,
    localGateResolution: {
      noLiveNoWrite: localGate.noLiveNoWrite ?? null,
      liveWriteAttempted: localGate.liveWriteAttempted ?? null,
      currentGate: localGate.currentGate ?? null,
      stoppedAt: preApply.stoppedAt ?? null,
      remotePreflightStatus: preApply.remotePreflightStatus ?? null,
      selectedTimestamp: preApply.selectedReports?.timestamp ?? null,
      selectedBy: preApply.selectedReports?.selectedBy ?? null,
      selectedMatchesRemoteLatest: preApply.deployedLatestReports?.selectedMatchesRemoteLatest ?? null,
      staleFirstApplyStoppedAt: staleFirstApply.stoppedAt ?? null,
      staleFirstApplyBlockingFindingIds: Array.isArray(staleFirstApply.blockingFindingIds)
        ? staleFirstApply.blockingFindingIds
        : [],
      staleFirstApplyLocalPrivateGatesSkipped:
        staleFirstApply.localPrivateGatesSkippedForProductionPath ?? null,
      staleFirstApplyRemotePreflightStatus: staleFirstApply.remotePreflightStatus ?? null,
      staleFirstApplySelectedMatchesRemoteLatest:
        staleFirstApply.deployedLatestReports?.selectedMatchesRemoteLatest ?? null,
    },
  };
}

function readResultOrRun(resultPath, run) {
  if (!resultPath) return run();
  try {
    const parsed = JSON.parse(readFileSync(resolve(resultPath), "utf8"));
    return { ok: true, exitCode: 0, parsed };
  } catch (error) {
    return {
      ok: false,
      exitCode: 1,
      parsed: null,
      error: error.message,
    };
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
  console.log(`Usage: node scripts/check-recall-goal-completion-audit.mjs [options]

No-live/no-write checker that verifies the current Recall daily-sync completion audit matches completion status.

Options:
  --audit-doc <path>                  Audit Markdown file to validate.
  --completion-status-result <path>   Read completion-status JSON from a fixture/file instead of running the command.
  --prelive-result <path>             Optional pre-live JSON to validate nextGate.localGateResolution proof.
  --help                              Show this help.
`);
}
