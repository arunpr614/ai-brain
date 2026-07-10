#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const DEFAULT_SCRIPT_SCAN_ROOT = "scripts";
const FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";
const STALE_WORDING_PATTERNS = [
  {
    id: "local_private_gates_stopped_first",
    pattern: /\blocal private gates stopped first\b/i,
  },
  {
    id: "local_status_helper_gates_fail_first",
    pattern: /\blocal status helper gates fail first\b/i,
  },
  {
    id: "local_private_gates_failed",
    pattern: /\blocal private gates failed\b/i,
  },
  {
    id: "blocked_by_local_private_gates",
    pattern: /\bblocked by local private gates\b/i,
  },
  {
    id: "stale_private_gates",
    pattern: /\bstale private gates\b/i,
  },
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const completionStatus = readResultOrRun(args.completionStatusResult, () =>
  runJsonCommand([script("check-recall-daily-sync-completion-status.mjs")]),
);
const finalComplete =
  completionStatus.parsed?.completionAchieved === true &&
  completionStatus.parsed?.status === "complete" &&
  completionStatus.parsed?.currentBlockingGate === null;
const handoff = finalComplete
  ? skippedResult("goal_complete_no_second_manual_handoff")
  : readResultOrRun(args.handoffResult, () =>
      runJsonCommand([script("print-recall-second-manual-production-apply-command.mjs"), "--json"]),
    );
const noApprovalApply = finalComplete
  ? skippedResult("goal_complete_no_second_manual_apply_probe")
  : readResultOrRun(args.applyResult, () =>
      runJsonCommand([script("run-recall-second-manual-production-apply.mjs")], noApprovalEnv()),
    );
const staleFirstApplyApproval = finalComplete
  ? skippedResult("goal_complete_no_stale_first_apply_probe")
  : readResultOrRun(args.staleFirstApplyResult, () =>
      runJsonCommand([script("run-recall-second-manual-production-apply.mjs")], staleFirstApplyApprovalEnv()),
    );
const staleWordingScan = args.skipScriptScan
  ? { ok: true, skipped: true, findings: [], roots: args.scriptScanRoots }
  : scanForStaleWording(args.scriptScanRoots);
const currentCompletionGate = completionStatus.parsed?.currentBlockingGate ?? null;

const findings = [
  ...validateCompletionStatus(completionStatus.parsed),
  ...(finalComplete || currentCompletionGate === "scheduler_enablement" ? [] : validateHandoff(handoff.parsed)),
  ...(finalComplete ? [] : validateNoApprovalApply(noApprovalApply.parsed)),
  ...(finalComplete ? [] : validateStaleFirstApplyApprovalApply(staleFirstApplyApproval.parsed)),
  ...staleWordingScan.findings,
];

const ok = findings.length === 0;
const output = {
  ok,
  mode: "second_manual_local_gate_resolution_check",
  noLiveNoWrite: true,
  liveWriteAttempted:
    noApprovalApply.parsed?.liveWriteAttempted === true || staleFirstApplyApproval.parsed?.liveWriteAttempted === true,
  currentGate: completionStatus.parsed?.currentBlockingGate ?? handoff.parsed?.completionStatus?.currentBlockingGate ?? null,
  checked: {
    completionStatus: summarizeCompletionStatus(completionStatus.parsed),
    handoffProgress: summarizeHandoffProgress(handoff.parsed),
    preApplyProgress: summarizePreApplyProgress(noApprovalApply.parsed),
    staleFirstApplyApprovalProgress: summarizePreApplyProgress(staleFirstApplyApproval.parsed),
    staleWordingScan: summarizeStaleWordingScan(staleWordingScan),
  },
  findings,
  safetyNote:
    "This checker is no-live/no-write. It runs no production apply without exact approval and treats the no-approval apply runner's approval_gate stop as the expected proof boundary.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[check:recall-second-manual-local-gate-resolution] failed");
  console.error(text);
  process.exit(1);
}

process.stdout.write(text);

function validateCompletionStatus(parsed) {
  const findings = [];
  if (!parsed || typeof parsed !== "object") {
    return [finding("completion_status_unparseable", "Completion status did not produce parseable JSON.")];
  }
  if (parsed.noLiveNoWrite !== true) {
    findings.push(finding("completion_status_not_no_live", "Completion status must report noLiveNoWrite: true."));
  }
  if (parsed.completionAchieved === true) {
    if (parsed.status !== "complete") {
      findings.push(
        finding("completion_status_wrong_status", "Completed local-gate check must report status: complete.", {
          status: parsed.status ?? null,
        }),
      );
    }
    if (parsed.currentBlockingGate !== null || parsed.activeBlockedRequirement !== null) {
      findings.push(
        finding("completion_status_final_gate_not_clear", "Completed local-gate check must have no active production gate.", {
          currentBlockingGate: parsed.currentBlockingGate ?? null,
          activeBlockedRequirement: parsed.activeBlockedRequirement ?? null,
        }),
      );
    }
    if (Array.isArray(parsed.blockedActions) && parsed.blockedActions.includes("second_manual_verification")) {
      findings.push(
        finding(
          "completion_status_second_manual_still_blocked",
          "Completed local-gate check must not keep second manual verification blocked.",
        ),
      );
    }
    return findings;
  }
  if (parsed.currentBlockingGate === "scheduler_enablement") {
    if (parsed.status !== "blocked_scheduler_enablement") {
      findings.push(
        finding("completion_status_wrong_status", "Post-second-manual status must report blocked_scheduler_enablement.", {
          status: parsed.status ?? null,
        }),
      );
    }
    if (parsed.activeBlockedRequirement !== "scheduler_enablement") {
      findings.push(
        finding(
          "completion_status_wrong_active_requirement",
          "Post-second-manual status must expose activeBlockedRequirement: scheduler_enablement.",
          { activeBlockedRequirement: parsed.activeBlockedRequirement ?? null },
        ),
      );
    }
    if (!Array.isArray(parsed.blockedActions) || !parsed.blockedActions.includes("scheduler")) {
      findings.push(
        finding("completion_status_missing_scheduler_blocked_action", "Completion status blockedActions must include scheduler."),
      );
    }
    if (Array.isArray(parsed.blockedActions) && parsed.blockedActions.includes("second_manual_verification")) {
      findings.push(
        finding(
          "completion_status_second_manual_still_blocked",
          "Second manual verification must not remain blocked after scheduler_enablement becomes the active gate.",
        ),
      );
    }
    const readiness = parsed.requirements?.find((entry) => entry?.id === "scheduler_enablement")?.evidence
      ?.manualCleanRunReadiness;
    const requiredCleanRuns = readiness?.requiredManualCleanRunsBeforeSchedulerEnable ?? 2;
    if (
      typeof readiness?.cleanRunCount !== "number" ||
      readiness.cleanRunCount < requiredCleanRuns ||
      readiness?.needsSecondManualVerificationRun !== false
    ) {
      findings.push(
        finding(
          "completion_status_manual_clean_runs_not_complete",
          "Scheduler gate must expose at least the required clean manual runs and no remaining second manual verification need.",
          {
            requiredManualCleanRunsBeforeSchedulerEnable: requiredCleanRuns,
            cleanRunCount: readiness?.cleanRunCount ?? null,
            needsSecondManualVerificationRun: readiness?.needsSecondManualVerificationRun ?? null,
          },
        ),
      );
    }
    return findings;
  }
  if (parsed.status !== "blocked_second_manual_verification_run") {
    findings.push(
      finding(
        "completion_status_wrong_status",
        "Completion status must explicitly report blocked_second_manual_verification_run while the second manual gate is active.",
        { status: parsed.status ?? null },
      ),
    );
  }
  if (parsed.currentBlockingGate !== "second_manual_verification_run") {
    findings.push(
      finding("completion_status_wrong_gate", "Completion status must be waiting at second_manual_verification_run.", {
        currentBlockingGate: parsed.currentBlockingGate ?? null,
      }),
    );
  }
  if (parsed.activeBlockedRequirement !== "second_manual_verification") {
    findings.push(
      finding(
        "completion_status_wrong_active_requirement",
        "Completion status must expose activeBlockedRequirement: second_manual_verification.",
        { activeBlockedRequirement: parsed.activeBlockedRequirement ?? null },
      ),
    );
  }
  if (!Array.isArray(parsed.blockedRequirements) || !parsed.blockedRequirements.includes("scheduler_enablement")) {
    findings.push(
      finding(
        "completion_status_missing_scheduler_completion_requirement",
        "Completion status must preserve scheduler_enablement as the broader remaining completion requirement.",
      ),
    );
  }
  if (!Array.isArray(parsed.blockedActions) || !parsed.blockedActions.includes("second_manual_verification")) {
    findings.push(
      finding(
        "completion_status_missing_second_manual_blocked_action",
        "Completion status blockedActions must include second_manual_verification.",
      ),
    );
  }
  const path = parsed.secondManualVerificationPath ?? {};
  const ready = path.readyHandoffMustShow ?? {};
  if (path.status !== "requires_no_live_production_handoff_then_exact_approval") {
    findings.push(finding("completion_status_missing_second_manual_path", "Completion status must expose secondManualVerificationPath."));
  }
  if (path.localPrivateGatesAreNotThePlannedProductionGate !== true) {
    findings.push(
      finding(
        "completion_status_local_gate_ambiguous",
        "Completion status must state local private gates are not the planned production gate.",
      ),
    );
  }
  findings.push(...validateReadyHandoffFields(ready, "completion_status_ready_handoff"));
  return findings;
}

function validateHandoff(parsed) {
  const findings = [];
  if (!parsed || typeof parsed !== "object") {
    return [finding("handoff_unparseable", "Production handoff did not produce parseable JSON.")];
  }
  if (parsed.noLiveNoWrite !== true) {
    findings.push(finding("handoff_not_no_live", "Production handoff must be no-live/no-write."));
  }
  if (parsed.ok !== true) {
    findings.push(finding("handoff_not_ready", "Production handoff must pass before exact approval.", { status: parsed.status ?? null }));
  }
  const progress = parsed.handoffProgress ?? {};
  if (progress.stoppedAt !== "ready_for_exact_approval") {
    findings.push(
      finding("handoff_not_ready_for_exact_approval", "Handoff must stop at ready_for_exact_approval.", {
        stoppedAt: progress.stoppedAt ?? null,
      }),
    );
  }
  if (progress.readyForExactApproval !== true) {
    findings.push(finding("handoff_exact_approval_not_next", "Handoff must mark exact approval as the next action."));
  }
  findings.push(...validateReadyHandoffFields(progress, "handoff_progress"));
  if (!String(progress.liveCallNotAttemptedBecause ?? "").includes("exact second-manual approval")) {
    findings.push(
      finding(
        "handoff_no_live_reason_ambiguous",
        "Handoff no-live reason must name exact second-manual approval after production remote preflight.",
      ),
    );
  }
  return findings;
}

function validateNoApprovalApply(parsed) {
  const findings = [];
  if (!parsed || typeof parsed !== "object") {
    return [finding("apply_unparseable", "No-approval production apply did not produce parseable JSON.")];
  }
  if (parsed.status !== "blocked_second_manual_production_apply") {
    findings.push(finding("apply_unexpected_status", "No-approval production apply must be blocked.", { status: parsed.status ?? null }));
  }
  if (parsed.liveWriteAttempted !== false) {
    findings.push(finding("apply_attempted_live_write", "No-approval production apply must not attempt the live write."));
  }
  const progress = parsed.preApplyProgress ?? {};
  if (progress.stoppedAt !== "approval_gate") {
    findings.push(
      finding("apply_wrong_stop_point", "No-approval production apply must stop at approval_gate after remote preflight.", {
        stoppedAt: progress.stoppedAt ?? null,
      }),
    );
  }
  if (!Array.isArray(progress.blockingFindingIds) || !progress.blockingFindingIds.includes("approval_required")) {
    findings.push(finding("apply_missing_approval_required_finding", "No-approval production apply must name approval_required."));
  }
  if (progress.localPrivateGatesSkippedForProductionPath !== true) {
    findings.push(
      finding(
        "apply_local_gates_not_skipped",
        "No-approval production apply must prove broad local private gates were skipped for the production path.",
      ),
    );
  }
  if (progress.localGateStatus !== "not_blocking_production_path") {
    findings.push(
      finding("apply_local_gate_ambiguous", "No-approval production apply must report localGateStatus: not_blocking_production_path.", {
        localGateStatus: progress.localGateStatus ?? null,
      }),
    );
  }
  if (progress.remotePreflightPassed !== true) {
    findings.push(finding("apply_remote_preflight_not_passed", "No-approval production apply must pass remote preflight before approval gate."));
  }
  if (progress.remotePreflightStatus !== "ready_for_second_manual_remote_runtime_preflight") {
    findings.push(
      finding(
        "apply_wrong_remote_preflight_status",
        "No-approval production apply must expose ready second-manual remote runtime preflight status.",
        { remotePreflightStatus: progress.remotePreflightStatus ?? null },
      ),
    );
  }
  const selectedReports = parsed.selectedReports ?? {};
  if (!selectedReports.enumerationPath || !selectedReports.fidelityPath || !selectedReports.timestamp) {
    findings.push(
      finding(
        "apply_missing_selected_deployed_proof_pair",
        "No-approval production apply must expose the selected deployed SPIKE proof pair.",
        { selectedReports },
      ),
    );
  }
  if (selectedReports.selectedBy !== "remote_latest_deployed_pair") {
    findings.push(
      finding(
        "apply_selected_proof_pair_not_remote_latest",
        "No-approval production apply must select the remote latest deployed SPIKE proof pair.",
        { selectedBy: selectedReports.selectedBy ?? null },
      ),
    );
  }
  if (parsed.remotePreflight?.proofReports?.enumeration?.ok !== true) {
    findings.push(
      finding(
        "apply_remote_enumeration_proof_not_ready",
        "No-approval production apply must expose passing remote SPIKE-013 proof readiness.",
      ),
    );
  }
  if (parsed.remotePreflight?.proofReports?.fidelity?.ok !== true) {
    findings.push(
      finding(
        "apply_remote_fidelity_proof_not_ready",
        "No-approval production apply must expose passing remote SPIKE-014 proof readiness.",
      ),
    );
  }
  if (parsed.remotePreflight?.deployedLatestReports?.selectedMatchesRemoteLatest !== true) {
    findings.push(
      finding(
        "apply_selected_proof_pair_not_current",
        "No-approval production apply must prove the selected SPIKE proof pair matches the latest deployed remote pair.",
      ),
    );
  }
  if (!String(progress.liveCallNotAttemptedBecause ?? "").includes("exact second-manual approval is missing")) {
    findings.push(
      finding("apply_no_live_reason_ambiguous", "No-approval production apply must name missing exact second-manual approval."),
    );
  }
  return findings;
}

function validateStaleFirstApplyApprovalApply(parsed) {
  const findings = [];
  if (!parsed || typeof parsed !== "object") {
    return [finding("stale_first_apply_unparseable", "Stale first-apply approval production probe did not produce parseable JSON.")];
  }
  if (parsed.status !== "blocked_second_manual_production_apply") {
    findings.push(
      finding("stale_first_apply_unexpected_status", "Stale first-apply approval probe must be blocked.", {
        status: parsed.status ?? null,
      }),
    );
  }
  if (parsed.liveWriteAttempted !== false) {
    findings.push(
      finding(
        "stale_first_apply_attempted_live_write",
        "Stale first-apply approval probe must not attempt the live write.",
      ),
    );
  }
  if (parsed.approvalStatus?.firstApplyApprovalPresent !== true) {
    findings.push(
      finding(
        "stale_first_apply_not_classified",
        "Stale first-apply approval probe must classify the supplied approval as first_capped_apply.",
      ),
    );
  }
  if (parsed.approvalStatus?.manualVerificationApprovalExact !== false) {
    findings.push(
      finding(
        "stale_first_apply_exact_approval_leaked",
        "Stale first-apply approval probe must run with exact second-manual approval absent.",
      ),
    );
  }
  const progress = parsed.preApplyProgress ?? {};
  if (progress.stoppedAt !== "approval_gate") {
    findings.push(
      finding(
        "stale_first_apply_wrong_stop_point",
        "Stale first-apply approval probe must stop at approval_gate after remote preflight.",
        { stoppedAt: progress.stoppedAt ?? null },
      ),
    );
  }
  if (!Array.isArray(progress.blockingFindingIds) || !progress.blockingFindingIds.includes("stale_first_apply_approval")) {
    findings.push(
      finding(
        "stale_first_apply_missing_finding",
        "Stale first-apply approval probe must name stale_first_apply_approval.",
      ),
    );
  }
  if (progress.localPrivateGatesSkippedForProductionPath !== true) {
    findings.push(
      finding(
        "stale_first_apply_local_gates_not_skipped",
        "Stale first-apply approval probe must prove broad local private gates were skipped for the production path.",
      ),
    );
  }
  if (progress.localGateStatus !== "not_blocking_production_path") {
    findings.push(
      finding(
        "stale_first_apply_local_gate_ambiguous",
        "Stale first-apply approval probe must report localGateStatus: not_blocking_production_path.",
        { localGateStatus: progress.localGateStatus ?? null },
      ),
    );
  }
  if (progress.remotePreflightPassed !== true) {
    findings.push(
      finding(
        "stale_first_apply_remote_preflight_not_passed",
        "Stale first-apply approval probe must pass remote preflight before approval classification blocks.",
      ),
    );
  }
  if (progress.remotePreflightStatus !== "ready_for_second_manual_remote_runtime_preflight") {
    findings.push(
      finding(
        "stale_first_apply_wrong_remote_preflight_status",
        "Stale first-apply approval probe must expose ready second-manual remote runtime preflight status.",
        { remotePreflightStatus: progress.remotePreflightStatus ?? null },
      ),
    );
  }
  if (!String(progress.liveCallNotAttemptedBecause ?? "").includes("exact second-manual approval is missing")) {
    findings.push(
      finding(
        "stale_first_apply_no_live_reason_ambiguous",
        "Stale first-apply approval probe must name missing exact second-manual approval after remote preflight.",
      ),
    );
  }
  if (parsed.remotePreflight?.deployedLatestReports?.selectedMatchesRemoteLatest !== true) {
    findings.push(
      finding(
        "stale_first_apply_selected_proof_pair_not_current",
        "Stale first-apply approval probe must prove the selected SPIKE proof pair matches the latest deployed remote pair.",
      ),
    );
  }
  return findings;
}

function validateReadyHandoffFields(fields, prefix) {
  const findings = [];
  const expected = {
    localPrivateGatesSkippedForProductionPath: true,
    localGateStatus: "not_blocking_production_path",
    remotePreflightPassed: true,
    liveWriteAttempted: false,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (fields?.[key] !== value) {
      findings.push(
        finding(`${prefix}_${key}`, `Expected ${prefix}.${key} to be ${JSON.stringify(value)}.`, {
          actual: fields?.[key] ?? null,
        }),
      );
    }
  }
  return findings;
}

function scanForStaleWording(roots) {
  const findings = [];
  const targets = [];
  for (const root of roots) {
    const resolved = resolve(root);
    if (!existsSync(resolved)) {
      findings.push(finding("scan_root_missing", "A stale wording scan root is missing.", { path: root }));
      continue;
    }
    for (const filePath of collectScriptFiles(resolved)) targets.push(filePath);
  }
  for (const filePath of targets) {
    const text = readFileSync(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const entry of STALE_WORDING_PATTERNS) {
        if (entry.pattern.test(line)) {
          findings.push(
            finding(entry.id, "Stale local-gate blocker wording remains in a current script.", {
              file: relative(process.cwd(), filePath),
              line: index + 1,
              preview: line.trim().slice(0, 180),
            }),
          );
        }
      }
    });
  }
  return {
    ok: findings.length === 0,
    skipped: false,
    roots,
    scannedFiles: targets.length,
    findings,
  };
}

function* collectScriptFiles(path) {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (isScannableScript(path)) yield path;
    return;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) yield* collectScriptFiles(fullPath);
    else if (entry.isFile() && isScannableScript(fullPath)) yield fullPath;
  }
}

function isScannableScript(path) {
  return /\.(mjs|js|ts|tsx|sh)$/.test(path);
}

function summarizeCompletionStatus(parsed) {
  const path = parsed?.secondManualVerificationPath ?? {};
  return {
    ok: parsed?.ok === true,
    status: parsed?.status ?? null,
    currentBlockingGate: parsed?.currentBlockingGate ?? null,
    activeBlockedRequirement: parsed?.activeBlockedRequirement ?? null,
    blockedRequirements: Array.isArray(parsed?.blockedRequirements) ? parsed.blockedRequirements : [],
    blockedActions: Array.isArray(parsed?.blockedActions) ? parsed.blockedActions : [],
    noLiveNoWrite: parsed?.noLiveNoWrite ?? null,
    secondManualPathStatus: path.status ?? null,
    localPrivateGatesAreNotThePlannedProductionGate: path.localPrivateGatesAreNotThePlannedProductionGate ?? null,
    readyHandoffMustShow: path.readyHandoffMustShow ?? null,
  };
}

function summarizeHandoffProgress(parsed) {
  const progress = parsed?.handoffProgress ?? {};
  return {
    ok: parsed?.ok === true,
    stoppedAt: progress.stoppedAt ?? null,
    readyForExactApproval: progress.readyForExactApproval ?? null,
    localGateStatus: progress.localGateStatus ?? null,
    remotePreflightPassed: progress.remotePreflightPassed ?? null,
    liveWriteAttempted: progress.liveWriteAttempted ?? null,
    liveCallNotAttemptedBecause: progress.liveCallNotAttemptedBecause ?? null,
  };
}

function summarizePreApplyProgress(parsed) {
  const progress = parsed?.preApplyProgress ?? {};
  return {
    status: parsed?.status ?? null,
    stoppedAt: progress.stoppedAt ?? null,
    blockingFindingIds: progress.blockingFindingIds ?? [],
    localPrivateGatesSkippedForProductionPath: progress.localPrivateGatesSkippedForProductionPath ?? null,
    localGateStatus: progress.localGateStatus ?? null,
    remotePreflightPassed: progress.remotePreflightPassed ?? null,
    remotePreflightStatus: progress.remotePreflightStatus ?? null,
    approvalPresent: progress.approvalPresent ?? null,
    liveWriteAttempted: progress.liveWriteAttempted ?? null,
    liveCallNotAttemptedBecause: progress.liveCallNotAttemptedBecause ?? null,
    selectedReports: parsed?.selectedReports ?? null,
    remoteProofReports: {
      enumerationOk: parsed?.remotePreflight?.proofReports?.enumeration?.ok ?? null,
      fidelityOk: parsed?.remotePreflight?.proofReports?.fidelity?.ok ?? null,
    },
    deployedLatestReports: parsed?.remotePreflight?.deployedLatestReports
      ? {
          timestamp: parsed.remotePreflight.deployedLatestReports.timestamp ?? null,
          selectedMatchesRemoteLatest: parsed.remotePreflight.deployedLatestReports.selectedMatchesRemoteLatest ?? null,
        }
      : null,
  };
}

function summarizeStaleWordingScan(scan) {
  return {
    ok: scan.ok === true,
    skipped: scan.skipped === true,
    roots: scan.roots,
    scannedFiles: scan.scannedFiles ?? null,
    findingCount: scan.findings.length,
  };
}

function readResultOrRun(filePath, run) {
  if (!filePath) return run();
  const parsed = parseMaybeJson(readFileSync(resolve(filePath), "utf8"));
  return {
    ok: parsed?.ok === true,
    exitCode: parsed?.ok === true ? 0 : 1,
    parsed,
  };
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

function runJsonCommand(commandArgs, envOverrides = {}) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envOverrides,
    },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout),
  };
}

function noApprovalEnv() {
  return {
    BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: "",
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: "",
    BRAIN_RECALL_APPROVAL_TEXT: "",
  };
}

function staleFirstApplyApprovalEnv() {
  return {
    ...noApprovalEnv(),
    BRAIN_RECALL_FIRST_APPLY_APPROVAL: FIRST_APPLY_APPROVAL,
  };
}

function parseMaybeJson(text) {
  const trimmed = String(text ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function finding(id, message, extra = {}) {
  return { id, message, ...extra };
}

function parseArgs(argv) {
  const parsed = {
    completionStatusResult: null,
    handoffResult: null,
    applyResult: null,
    staleFirstApplyResult: null,
    scriptScanRoots: [DEFAULT_SCRIPT_SCAN_ROOT],
    skipScriptScan: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--completion-status-result" && next) {
      parsed.completionStatusResult = next;
      i += 1;
    } else if (arg === "--handoff-result" && next) {
      parsed.handoffResult = next;
      i += 1;
    } else if (arg === "--apply-result" && next) {
      parsed.applyResult = next;
      i += 1;
    } else if (arg === "--stale-first-apply-result" && next) {
      parsed.staleFirstApplyResult = next;
      i += 1;
    } else if (arg === "--script-scan-root" && next) {
      parsed.scriptScanRoots = [next];
      i += 1;
    } else if (arg === "--skip-script-scan") {
      parsed.skipScriptScan = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function script(name) {
  return resolve("scripts", name);
}

function printHelp() {
  console.log(`Recall second manual local-gate resolution checker

Usage:
  npm run check:recall-second-manual-local-gate-resolution

Fixture mode:
  node scripts/check-recall-second-manual-local-gate-resolution.mjs \\
    --completion-status-result <json> \\
    --handoff-result <json> \\
    --apply-result <json> \\
    --stale-first-apply-result <json> \\
    --script-scan-root <dir>

This command is no-live/no-write. By default it runs the no-live completion
status, no-live production command handoff, and the no-approval production apply
probe plus a stale first-apply approval production probe. The expected current
proof boundary is:

- handoffProgress.stoppedAt=ready_for_exact_approval
- completionStatus.status=blocked_second_manual_verification_run
- completionStatus.activeBlockedRequirement=second_manual_verification
- handoffProgress.localGateStatus=not_blocking_production_path
- preApplyProgress.stoppedAt=approval_gate
- preApplyProgress.remotePreflightPassed=true
- preApplyProgress.liveWriteAttempted=false
- staleFirstApplyApprovalProgress.stoppedAt=approval_gate
- staleFirstApplyApprovalProgress.blockingFindingIds includes stale_first_apply_approval
`);
}
