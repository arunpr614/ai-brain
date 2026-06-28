#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  DEFAULT_RECALL_ENUMERATION_REPORT,
  DEFAULT_RECALL_FIDELITY_REPORT,
  resolveLatestRecallSpikeReportPair,
} from "./lib/recall-latest-spike-reports.mjs";

const DEFAULT_ENUMERATION_REPORT = DEFAULT_RECALL_ENUMERATION_REPORT;
const DEFAULT_FIDELITY_REPORT = DEFAULT_RECALL_FIDELITY_REPORT;
const DEFAULT_MANIFEST = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const DEFAULT_LIVE_DIAGNOSTIC_REPORT = "data/private/recall-live-spikes/live-diagnostic-report.json";
const DEFAULT_APPLY_REPORT = "data/private/recall-live-spikes/first-apply-report.json";
const DEFAULT_PRODUCTION_DEPLOY_EVIDENCE = "data/private/recall-live-spikes/production-deploy-evidence.json";
const DEFAULT_SCHEDULER_ENABLEMENT_EVIDENCE = "data/private/recall-live-spikes/scheduler-enable-evidence.json";
const DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES = 10 * 365 * 24 * 60;
const SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET =
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md";
const SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND = "npm run recall:current-gate";
const SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND =
  "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json";
const SECOND_MANUAL_VERIFICATION_READINESS_COMMAND = "npm run recall:second-manual:readiness";
const SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND = "npm run recall:second-manual:production-command";
const SECOND_MANUAL_VERIFICATION_PRODUCTION_APPLY_COMMAND = "npm run recall:second-manual:production-apply";
const PRODUCTION_KEY_EVIDENCE_REPAIR_COMMAND = "npm run recall:production-key-evidence:command";
const PRODUCTION_ENV_KEY_INSTALL_COMMAND = "npm run recall:production-env-key:install";
const SCHEDULER_ENABLEMENT_APPROVAL_PACKET =
  "docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md";
const SCHEDULER_ENABLEMENT_COMMAND_HANDOFF = "npm run recall:scheduler-enable:command";
const SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND = "npm run recall:scheduler-evidence:command";
const SCHEDULER_ENABLEMENT_EVIDENCE_RECORD_COMMAND = "npm run recall:scheduler-enable-evidence:record";
const SCHEDULER_ENABLEMENT_EVIDENCE_VERIFY_COMMAND = "npm run check:recall-scheduler-enable-evidence";
const REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE = 2;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const firstApplyStatus = readResultOrRun(args.firstApplyStatusResultPath, () =>
  runJsonCommand([script("check-recall-first-apply-status.mjs")]),
);
const liveSpikeProof = readResultOrRun(args.liveSpikeProofResultPath, () =>
  runJsonCommand([
    script("check-recall-live-spike-reports.mjs"),
    "--enumeration",
    args.enumerationPath,
    "--fidelity",
    args.fidelityPath,
    "--manifest",
    args.manifestPath,
    "--allow-fidelity-changes",
    "--accepted-fidelity-risk",
    args.acceptedFidelityRisk,
  ]),
);
const liveDiagnosticProof = readResultOrRun(args.liveDiagnosticResultPath, () =>
  runJsonCommand([script("check-recall-live-diagnostic-report.mjs"), "--report", args.liveDiagnosticReportPath]),
);
const approvalPacket = readResultOrRun(args.approvalPacketResultPath, () =>
  runJsonCommand([script("check-recall-approval-packet.mjs")]),
);
const publicDocsPrivacy = readResultOrRun(args.publicDocsPrivacyResultPath, () =>
  runJsonCommand([script("check-recall-public-docs-privacy.mjs")]),
);
const applyReport = readResultOrRun(args.applyReportResultPath, () =>
  runJsonCommand([
    script("check-recall-apply-report.mjs"),
    "--report",
    args.applyReportPath,
    "--max-applied-imports",
    String(args.maxAppliedImports),
    "--max-age-minutes",
    String(args.applyReportMaxAgeMinutes),
    "--require-private-path",
    "--require-cards-seen",
    "--require-applied-imports",
    "--allow-unverified-fidelity",
    "--allow-metadata-only-fidelity",
  ]),
);
const schedulerArtifacts = readResultOrRun(args.schedulerArtifactsResultPath, () => {
  const result = spawnSync(process.execPath, ["--", script("check-recall-scheduler-artifacts.mjs")], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: {
      ok: result.status === 0,
      verdict: result.status === 0 ? "PASS_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK" : "FAIL_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK",
      stdout: redact(result.stdout),
      stderr: redact(result.stderr),
    },
  };
});
const productionDeployEvidence = runOptionalEvidenceValidator(
  args.productionDeployEvidencePath,
  "production-deploy",
  "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
);
const schedulerEnablementEvidence = runOptionalEvidenceValidator(
  args.schedulerEnablementEvidencePath,
  "scheduler-enable",
  "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
);

const firstApplyStatusJson = firstApplyStatus.parsed ?? {};
const liveDiagnosticFromStatus = firstApplyStatusJson.diagnostics?.liveReadConnectivity?.latestPrivateDiagnosticProof ?? null;
const firstApplyStatusName = firstApplyStatusJson.status ?? "unknown";
const firstApplyGate = firstApplyStatusJson.gateSummary ?? {};
const liveSpikeProofOk = liveSpikeProof.ok === true && liveSpikeProof.parsed?.ok === true;
const liveDiagnosticProofOk =
  (liveDiagnosticProof.ok === true && liveDiagnosticProof.parsed?.ok === true) || liveDiagnosticFromStatus?.ok === true;
const approvalPacketOk = approvalPacket.ok === true && approvalPacket.parsed?.ok === true;
const publicDocsPrivacyOk = publicDocsPrivacy.ok === true && publicDocsPrivacy.parsed?.ok === true;
const schedulerArtifactsOk = schedulerArtifacts.ok === true && schedulerArtifacts.parsed?.ok === true;
const applyReportOk = applyReport.ok === true && applyReport.parsed?.ok === true;
const productionDeployOk = productionDeployEvidence.ok === true;
const schedulerEnablementOk = schedulerEnablementEvidence.ok === true;
const firstApplyReadyForApproval = firstApplyStatusName === "ready_for_first_capped_apply_approval";
const firstApplyDone = applyReportOk;
const firstApplyReportPathForManualCleanRun = applyReport.parsed?.reportPath ?? args.applyReportPath;
const manualCleanRunReadiness = summarizeManualCleanRunReadiness({
  firstApplyDone,
  firstApplyReportPath: firstApplyReportPathForManualCleanRun,
  firstApplyReport: applyReport,
  maxAppliedImports: args.maxAppliedImports,
});

const requirements = [
  requirement({
    id: "live_spike_proof",
    label: "Live SPIKE-013/SPIKE-014 proof is accepted",
    ok: liveSpikeProofOk,
    statusWhenFalse: "blocked_or_unverified",
    evidence: summarizeCommandResult(liveSpikeProof, ["ok", "verdict"]),
    nextAction: liveSpikeProofOk ? null : "Rerun and validate the accepted live SPIKE report pair before first apply.",
  }),
  requirement({
    id: "private_live_diagnostic_proof",
    label: "Private read-only live diagnostic proof is available",
    ok: liveDiagnosticProofOk,
    statusWhenFalse: "blocked_or_unverified",
    evidence:
      liveDiagnosticFromStatus?.ok === true
        ? summarizeLatestPrivateDiagnosticProof(liveDiagnosticFromStatus)
        : summarizeCommandResult(liveDiagnosticProof, ["ok", "verdict"]),
    nextAction: liveDiagnosticProofOk
      ? null
      : "Run the read-only first-apply live diagnostic only if fresh connectivity proof is needed.",
  }),
  requirement({
    id: "approval_packet_and_public_privacy",
    label: "Approval docs and public no-secret privacy gates pass",
    ok: approvalPacketOk && publicDocsPrivacyOk,
    statusWhenFalse: "blocked_or_unverified",
    evidence: {
      approvalPacket: summarizeCommandResult(approvalPacket, ["ok"]),
      publicDocsPrivacy: summarizeCommandResult(publicDocsPrivacy, ["ok", "scannedFiles"]),
    },
    nextAction: approvalPacketOk && publicDocsPrivacyOk
      ? null
      : "Fix the approval packet or public-doc privacy findings before any production action.",
  }),
  requirement({
    id: "first_apply_key_and_proof_readiness",
    label: firstApplyDone
      ? "First-apply key evidence and private proof were satisfied before the completed write"
      : "First-apply key evidence and private proof are ready for write approval",
    ok: firstApplyReadyForApproval || firstApplyDone,
    statusWhenFalse: firstApplyStatusName,
    evidence: firstApplyDone
      ? summarizeCompletedFirstApplyReadiness({ applyReport, firstApplyStatusName })
      : {
          status: firstApplyStatusName,
          failedChecks: firstApplyStatusJson.readiness?.failedChecks ?? [],
          gateSummary: firstApplyGate,
        },
    nextAction: firstApplyReadyForApproval || firstApplyDone
      ? null
      : firstApplyStatusJson.nextAction ?? "Resolve first-apply status blockers.",
  }),
  requirement({
    id: "first_capped_apply",
    label: "First capped Recall -> AI Brain apply succeeded",
    ok: firstApplyDone,
    statusWhenFalse: "blocked_pending_first_apply",
    evidence: summarizeCommandResult(applyReport, ["ok", "verdict", "reportPath"]),
    nextAction: firstApplyDone
      ? null
      : "After key rotation evidence and fresh proof pass, run the guarded first capped apply with exact approval.",
  }),
  requirement({
    id: "post_apply_review",
    label: "Private post-apply report passed review gate",
    ok: applyReportOk,
    statusWhenFalse: "blocked_pending_apply_report",
    evidence: summarizeCommandResult(applyReport, ["ok", "verdict", "reportPath"]),
    nextAction: applyReportOk
      ? null
      : "Validate the private first-apply report with check:recall-apply-report before deploy or scheduler decisions.",
  }),
  requirement({
    id: "scheduler_artifacts",
    label: "Scheduler/deploy guard artifacts are statically packaged and disabled by default",
    ok: schedulerArtifactsOk,
    statusWhenFalse: "blocked_static_scheduler_gate",
    evidence: summarizeCommandResult(schedulerArtifacts, ["ok", "verdict"]),
    nextAction: schedulerArtifactsOk ? null : "Fix scheduler artifact checker findings before deploy.",
  }),
  requirement({
    id: "production_deploy",
    label: "Production deploy completed and was verified",
    ok: productionDeployOk,
    statusWhenFalse: "missing_production_deploy_evidence",
    evidence: productionDeployEvidence.summary,
    nextAction: productionDeployOk ? null : "Deploy only after first apply and post-apply review pass, then record deploy verification evidence.",
  }),
  requirement({
    id: "scheduler_enablement",
    label: "Daily scheduler was explicitly enabled and first run verified",
    ok: schedulerEnablementOk,
    statusWhenFalse: "missing_scheduler_enablement_evidence",
    evidence: {
      ...schedulerEnablementEvidence.summary,
      manualCleanRunReadiness,
    },
    nextAction: schedulerEnablementOk
      ? null
      : schedulerNextAction(manualCleanRunReadiness),
  }),
];

const completionAchieved = requirements.every((entry) => entry.ok === true);
const blockedRequirements = requirements.filter((entry) => entry.ok !== true);
const activeGate = activeBlockingGate({
  completionAchieved,
  firstApplyDone,
  firstApplyGate,
  blockedRequirements,
  manualCleanRunReadiness,
});
const status = completionStatusFor({
  completionAchieved,
  firstApplyStatusName,
  firstApplyDone,
  blockedRequirements,
  manualCleanRunReadiness,
  activeGate,
});
const activeBlockedActions = blockedActionsFor({
  firstApplyDone,
  firstApplyGate,
  blockedRequirements,
  manualCleanRunReadiness,
});

const output = {
  ok: completionAchieved,
  completionAchieved,
  status,
  generatedAtIso: new Date().toISOString(),
  noLiveNoWrite: true,
  currentBlockingGate: activeGate?.currentBlockingGate ?? null,
  activeBlockedRequirement: activeBlockedRequirementFor({
    activeGate,
    blockedRequirements,
    manualCleanRunReadiness,
  }),
  owner: activeGate?.owner ?? null,
  externalActionRequired: activeGate?.externalActionRequired ?? null,
  externalAction: activeGate?.externalAction ?? null,
  blockedRequirements: blockedRequirements.map((entry) => entry.id),
  blockedActions: activeBlockedActions,
  requirements,
  safeNextCommands: safeNextCommandsFor({
    firstApplyDone,
    firstApplyStatusJson,
    blockedRequirements,
    manualCleanRunReadiness,
  }),
  secondManualVerificationPath: summarizeSecondManualVerificationPath({
    activeGate,
    manualCleanRunReadiness,
  }),
  nextGate: activeGate,
  safetyNote:
    "This completion status command is no-live and no-write. It does not rotate keys, refresh proof, apply, deploy, enable a scheduler, or advance checkpoints.",
};

console.log(JSON.stringify(output, null, 2));

if (args.requireComplete && !completionAchieved) {
  process.exit(1);
}

function requirement({ id, label, ok, statusWhenFalse, evidence, nextAction }) {
  return {
    id,
    label,
    ok: ok === true,
    status: ok === true ? "done" : statusWhenFalse,
    evidence,
    nextAction,
  };
}

function activeBlockingGate({ completionAchieved, firstApplyDone, firstApplyGate, blockedRequirements, manualCleanRunReadiness }) {
  if (completionAchieved) {
    return {
      currentBlockingGate: null,
      owner: null,
      externalActionRequired: false,
      externalAction: null,
      nextAction: "No remaining Recall daily sync completion gate.",
    };
  }
  if (!firstApplyDone && firstApplyGate?.currentBlockingGate) return firstApplyGate;
  const firstBlocked = blockedRequirements[0];
  if (!firstBlocked) return null;
  const schedulerGate = firstBlocked.id === "scheduler_enablement";
  if (schedulerGate && manualCleanRunReadiness.needsSecondManualVerificationRun) {
    return {
      currentBlockingGate: "second_manual_verification_run",
      owner: "Arun",
      externalActionRequired: true,
      externalAction: "approve_second_manual_verification_run_before_scheduler_enablement",
      nextAction: firstBlocked.nextAction,
    };
  }
  return {
    currentBlockingGate: firstBlocked.id,
    owner: schedulerGate ? "Arun" : "Codex",
    externalActionRequired: schedulerGate,
    externalAction: schedulerGate ? "approve_scheduler_enablement_after_repeated_clean_manual_runs" : null,
    nextAction: firstBlocked.nextAction,
  };
}

function completionStatusFor({
  completionAchieved,
  firstApplyStatusName,
  firstApplyDone,
  blockedRequirements,
  manualCleanRunReadiness,
  activeGate,
}) {
  if (completionAchieved) return "complete";
  if (firstApplyStatusName === "blocked_key_rotation_evidence") return "blocked_key_rotation_evidence";
  if (
    firstApplyDone &&
    activeGate?.currentBlockingGate === "second_manual_verification_run" &&
    manualCleanRunReadiness.needsSecondManualVerificationRun === true
  ) {
    return "blocked_second_manual_verification_run";
  }
  const firstBlocked = blockedRequirements[0];
  if (firstApplyDone && firstBlocked?.id === "scheduler_enablement") return "blocked_scheduler_enablement";
  if (firstApplyDone) return "blocked_deploy_or_scheduler_verification";
  return "incomplete";
}

function activeBlockedRequirementFor({ activeGate, blockedRequirements, manualCleanRunReadiness }) {
  if (
    activeGate?.currentBlockingGate === "second_manual_verification_run" &&
    manualCleanRunReadiness.needsSecondManualVerificationRun === true
  ) {
    return "second_manual_verification";
  }
  return blockedRequirements[0]?.id ?? null;
}

function blockedActionsFor({ firstApplyDone, firstApplyGate, blockedRequirements, manualCleanRunReadiness }) {
  if (!firstApplyDone && Array.isArray(firstApplyGate?.blockedActions)) return firstApplyGate.blockedActions;
  const blockedIds = new Set(blockedRequirements.map((entry) => entry.id));
  if (blockedIds.has("first_capped_apply") || blockedIds.has("post_apply_review")) {
    return ["first_capped_apply", "deploy", "scheduler", "checkpoint"];
  }
  if (blockedIds.has("production_deploy")) return ["deploy", "scheduler", "checkpoint"];
  if (blockedIds.has("scheduler_enablement")) {
    return manualCleanRunReadiness.needsSecondManualVerificationRun
      ? ["second_manual_verification", "scheduler", "checkpoint"]
      : ["scheduler", "checkpoint"];
  }
  return ["checkpoint"];
}

function safeNextCommandsFor({ firstApplyDone, firstApplyStatusJson, blockedRequirements, manualCleanRunReadiness }) {
  if (!firstApplyDone) return firstApplyStatusJson.nextCommands ?? [];
  const firstBlocked = blockedRequirements[0];
  if (!firstBlocked) return [];
  if (firstBlocked.id === "production_deploy") return ["npm run check:recall-production-deploy-evidence"];
  if (firstBlocked.id === "scheduler_enablement" && manualCleanRunReadiness.needsSecondManualVerificationRun) {
    return [
      `Review ${SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET}`,
      SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND,
      SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND,
      SECOND_MANUAL_VERIFICATION_READINESS_COMMAND,
      `No-live handoff before approval: run ${SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND}`,
      `If the no-live handoff reports key_rotation_evidence, missing_api_key, or remote_preflight_not_ready, run ${PRODUCTION_KEY_EVIDENCE_REPAIR_COMMAND}; if it reports production has no RECALL_API_KEY, install the rotated key with ${PRODUCTION_ENV_KEY_INSTALL_COMMAND} before approval.`,
      `Only after exact approval: run ${SECOND_MANUAL_VERIFICATION_PRODUCTION_APPLY_COMMAND}`,
      "npm run recall:daily-sync:completion-status",
    ];
  }
  if (firstBlocked.id === "scheduler_enablement") {
    return [
      `Review ${SCHEDULER_ENABLEMENT_APPROVAL_PACKET}`,
      SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND,
      `No-live scheduler handoff before approval: run ${SCHEDULER_ENABLEMENT_COMMAND_HANDOFF}`,
      "Only after exact scheduler approval: enable the timer/flags and verify the first scheduled service run completed after scheduler timer activation",
      `After the first scheduled service run completes after scheduler timer activation: run ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND}`,
      `After first scheduled service-run verification: run ${SCHEDULER_ENABLEMENT_EVIDENCE_RECORD_COMMAND}`,
      SCHEDULER_ENABLEMENT_EVIDENCE_VERIFY_COMMAND,
      "npm run recall:daily-sync:completion-status -- --require-complete",
    ];
  }
  return [];
}

function schedulerNextAction(manualCleanRunReadiness) {
  if (manualCleanRunReadiness.needsSecondManualVerificationRun) {
    return `Run ${SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND} first and confirm status=ready_for_second_manual_exact_approval, firstApplyApprovalPresent=false, secondManualApprovalInWrongEnv=false, localGateStatus=not_blocking_production_path, remotePreflightPassed=true, and liveWriteAttempted=false. Then run ${SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND} and confirm nextGate.localGateResolution.preApplyProgress.stoppedAt=approval_gate, remotePreflightStatus=ready_for_second_manual_remote_runtime_preflight, selectedBy=remote_latest_deployed_pair, and selectedMatchesRemoteLatest=true. Then run ${SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND} as the no-live command handoff before approval. The ready handoff must report handoffProgress.stoppedAt=ready_for_exact_approval, handoffProgress.localGateStatus=not_blocking_production_path, handoffProgress.remotePreflightPassed=true, and handoffProgress.liveWriteAttempted=false. If it reports key_rotation_evidence, missing_api_key, or remote_preflight_not_ready instead, run ${PRODUCTION_KEY_EVIDENCE_REPAIR_COMMAND}; if production has no RECALL_API_KEY, install the rotated key with ${PRODUCTION_ENV_KEY_INSTALL_COMMAND}, otherwise complete truthful production key-evidence repair, then rerun the no-live production handoff. After remote preflight is ready, approve the second manual verification run using ${SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET}, then run ${SECOND_MANUAL_VERIFICATION_PRODUCTION_APPLY_COMMAND} only after exact approval. Only after ${REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE} distinct clean manual runs exist should scheduler enablement be approved and recorded.`;
  }
  return `Run ${SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND} and confirm status=ready_for_scheduler_enablement_approval, schedulerAllowedNow=true, and noLiveSchedulerHandoffCommand=${SCHEDULER_ENABLEMENT_COMMAND_HANDOFF}. Then run ${SCHEDULER_ENABLEMENT_COMMAND_HANDOFF} as the no-live scheduler handoff and confirm handoffProgress.stoppedAt=ready_for_exact_scheduler_approval, noLiveNoWrite=true, checks.completionStatus.cleanRunCount>=${REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE}, checks.prelive.ok=true, and handoffProgress.schedulerEnablementAttempted=false. Only after explicit scheduler approval should the timer/flags be enabled and the first scheduled service run completed after scheduler timer activation; then run ${SCHEDULER_FIRST_RUN_EVIDENCE_HANDOFF_COMMAND} to inspect the first scheduled run and print the evidence command before private evidence is recorded with ${SCHEDULER_ENABLEMENT_EVIDENCE_RECORD_COMMAND} and verified with ${SCHEDULER_ENABLEMENT_EVIDENCE_VERIFY_COMMAND}.`;
}

function summarizeSecondManualVerificationPath({ activeGate, manualCleanRunReadiness }) {
  if (
    activeGate?.currentBlockingGate !== "second_manual_verification_run" ||
    manualCleanRunReadiness.needsSecondManualVerificationRun !== true
  ) {
    return null;
  }
  return {
    status: "requires_no_live_production_handoff_then_exact_approval",
    currentGate: "second_manual_verification_run",
    currentGateCommand: SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND,
    manifestPreLiveCommand: SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND,
    noLiveHandoffCommand: SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND,
    approvalPacket: SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET,
    applyCommandAfterExactApproval: SECOND_MANUAL_VERIFICATION_PRODUCTION_APPLY_COMMAND,
    requiredBeforeApply: {
      currentGateCommand: SECOND_MANUAL_VERIFICATION_CURRENT_GATE_COMMAND,
      manifestPreLiveCommand: SECOND_MANUAL_VERIFICATION_MANIFEST_PRELIVE_COMMAND,
      noLiveProductionHandoffCommand: SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND,
      applyCommandAfterExactApproval: SECOND_MANUAL_VERIFICATION_PRODUCTION_APPLY_COMMAND,
      approvalEnv: "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
      requiredPreLiveProof: {
        localGateResolutionStoppedAt: "approval_gate",
        remotePreflightStatus: "ready_for_second_manual_remote_runtime_preflight",
        selectedBy: "remote_latest_deployed_pair",
        selectedMatchesRemoteLatest: true,
      },
    },
    readyCurrentGateMustShow: {
      status: "ready_for_second_manual_exact_approval",
      currentBlockingGate: "second_manual_verification_run",
      activeBlockedRequirement: "second_manual_verification",
      approvalRequiredEnv: "BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL",
      exactApprovalPresent: false,
      firstApplyApprovalPresent: false,
      secondManualApprovalInWrongEnv: false,
      localGateStatus: "not_blocking_production_path",
      remotePreflightPassed: true,
      liveWriteAttempted: false,
    },
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
    schedulerStillBlockedUntil:
      `${REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE} distinct clean manual runs and separate scheduler approval/evidence exist.`,
  };
}

function summarizeManualCleanRunReadiness({ firstApplyDone, firstApplyReportPath, firstApplyReport, maxAppliedImports }) {
  const candidates = [];
  const seen = new Set();

  if (firstApplyDone) {
    const resolvedFirstApplyPath = resolve(firstApplyReportPath);
    candidates.push({
      kind: "manual_first_capped_apply",
      applyReportPath: firstApplyReportPath,
      resolvedPath: resolvedFirstApplyPath,
      verdict: firstApplyReport.parsed?.verdict ?? null,
      ok: true,
      mtimeIso: statIso(resolvedFirstApplyPath),
    });
    seen.add(resolvedFirstApplyPath);
  }

  for (const path of discoverScheduledApplyReportPaths(firstApplyReportPath)) {
    const resolvedPath = resolve(path);
    if (seen.has(resolvedPath)) continue;
    const result = runJsonCommand([
      script("check-recall-apply-report.mjs"),
      "--report",
      path,
      "--max-applied-imports",
      String(maxAppliedImports),
      "--max-age-minutes",
      String(DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES),
      "--require-private-path",
      "--allow-unverified-fidelity",
      "--allow-metadata-only-fidelity",
    ]);
    const parsed = result.parsed ?? {};
    if (result.ok === true && parsed.ok === true && parsed.verdict === "PASS_POST_APPLY_REVIEW_GATE") {
      candidates.push({
        kind: "manual_second_guarded_apply_candidate",
        applyReportPath: path,
        resolvedPath,
        verdict: parsed.verdict,
        ok: true,
        mtimeIso: statIso(resolvedPath),
      });
      seen.add(resolvedPath);
    }
  }

  const cleanRuns = candidates
    .sort((a, b) => String(a.mtimeIso ?? "").localeCompare(String(b.mtimeIso ?? "")))
    .map(({ resolvedPath: _resolvedPath, ...candidate }) => candidate);

  return {
    requiredManualCleanRunsBeforeSchedulerEnable: REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE,
    cleanRunCount: cleanRuns.length,
    needsSecondManualVerificationRun: cleanRuns.length < REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE,
    secondManualVerificationApprovalPacket: SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET,
    schedulerEnablementApprovalAllowedByManualRunEvidence: cleanRuns.length >= REQUIRED_MANUAL_CLEAN_RUNS_BEFORE_SCHEDULER_ENABLE,
    cleanRuns,
  };
}

function discoverScheduledApplyReportPaths(firstApplyReportPath) {
  const firstApplyDir = dirname(resolve(firstApplyReportPath));
  const defaultPrivateDir = resolve("data/private/recall-live-spikes");
  const searchDirs = new Set([firstApplyDir]);
  if (firstApplyDir === defaultPrivateDir) {
    searchDirs.add(defaultPrivateDir);
  }
  const reports = [];
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/^scheduled-apply-\d{8}T\d{6}Z\.json$/.test(name)) continue;
      reports.push(join(dir, name));
    }
  }
  return [...new Set(reports)].sort();
}

function statIso(path) {
  try {
    return statSync(path).mtime.toISOString();
  } catch {
    return null;
  }
}

function summarizeCommandResult(result, fields) {
  const parsed = result.parsed ?? {};
  const summary = {
    ok: result.ok === true && parsed.ok !== false,
    exitCode: result.exitCode ?? null,
  };
  for (const field of fields) {
    summary[field] = parsed[field] ?? null;
  }
  if (Array.isArray(parsed.findings) && parsed.findings.length > 0) {
    summary.findings = parsed.findings.map((finding) => ({
      rule: finding.rule ?? finding.id ?? null,
      message: redact(String(finding.message ?? "")),
    }));
  }
  return summary;
}

function summarizeCompletedFirstApplyReadiness({ applyReport, firstApplyStatusName }) {
  return {
    status: "satisfied_by_completed_first_apply",
    satisfiedBy: "first capped apply passed post-apply review",
    firstApplyStatusSnapshot: firstApplyStatusName,
    applyReport: summarizeCommandResult(applyReport, ["ok", "verdict", "reportPath"]),
    note:
      "Pre-apply proof freshness may become stale after the approved write; completion status uses the completed first apply report as durable historical evidence.",
  };
}

function summarizeLatestPrivateDiagnosticProof(proof) {
  return {
    ok: proof.ok === true,
    verdict: proof.verdict ?? null,
    reportPath: proof.configuredReportPath ?? proof.reportPath ?? null,
    diagnosticOutputFile: proof.diagnosticOutputFile
      ? {
          path: proof.diagnosticOutputFile.path ?? null,
          mode: proof.diagnosticOutputFile.mode ?? null,
          statMode: proof.diagnosticOutputFile.statMode ?? null,
          sizeBytes: proof.diagnosticOutputFile.sizeBytes ?? null,
          mtimeIso: proof.diagnosticOutputFile.mtimeIso ?? null,
        }
      : null,
    liveAuthProbe: proof.liveAuthProbe
      ? {
          endpoint: proof.liveAuthProbe.endpoint ?? null,
          method: proof.liveAuthProbe.method ?? null,
          httpStatus: proof.liveAuthProbe.httpStatus ?? null,
          authenticated: proof.liveAuthProbe.authenticated ?? null,
          reachable: proof.liveAuthProbe.reachable ?? null,
          resultCount: proof.liveAuthProbe.resultCount ?? null,
        }
      : null,
    doesNotAuthorize: Array.isArray(proof.doesNotAuthorize) ? proof.doesNotAuthorize : [],
  };
}

function runOptionalEvidenceValidator(filePath, kind, requiredVerdict) {
  if (!filePath) {
    return {
      ok: false,
      summary: {
        ok: false,
        verdict: null,
        evidencePath: null,
        status: "missing_evidence_path",
      },
    };
  }
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    return {
      ok: false,
      summary: {
        ok: false,
        verdict: null,
        evidencePath: filePath,
        status: "missing_evidence_file",
      },
    };
  }

  const result = runJsonCommand([script("check-recall-completion-evidence.mjs"), "--kind", kind, "--evidence", filePath]);
  const parsed = result.parsed ?? {};
  const ok = result.ok === true && parsed.ok === true && parsed.verdict === requiredVerdict;
  return {
    ok,
    summary: {
      ok,
      exitCode: result.exitCode ?? null,
      verdict: parsed.verdict ?? null,
      evidencePath: filePath,
      status: ok ? "accepted" : "invalid_evidence",
      checkedAtIso: parsed.summary?.checkedAtIso ?? null,
      summary: parsed.summary ?? null,
      findings: Array.isArray(parsed.findings)
        ? parsed.findings.map((finding) => ({
            rule: finding.rule ?? null,
            message: redact(String(finding.message ?? "")),
          }))
        : [],
    },
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

function runJsonCommand(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(text),
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

function parseArgs(argv) {
  const latestSpikeReports = resolveLatestRecallSpikeReportPair();
  const parsed = {
    enumerationPath: process.env.BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH ?? latestSpikeReports.enumerationPath,
    fidelityPath: process.env.BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH ?? latestSpikeReports.fidelityPath,
    manifestPath: DEFAULT_MANIFEST,
    acceptedFidelityRisk: DEFAULT_ACCEPTED_FIDELITY_RISK,
    liveDiagnosticReportPath: DEFAULT_LIVE_DIAGNOSTIC_REPORT,
    applyReportPath: DEFAULT_APPLY_REPORT,
    maxAppliedImports: 5,
    applyReportMaxAgeMinutes: DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES,
    productionDeployEvidencePath: DEFAULT_PRODUCTION_DEPLOY_EVIDENCE,
    schedulerEnablementEvidencePath: DEFAULT_SCHEDULER_ENABLEMENT_EVIDENCE,
    firstApplyStatusResultPath: null,
    liveSpikeProofResultPath: null,
    liveDiagnosticResultPath: null,
    approvalPacketResultPath: null,
    publicDocsPrivacyResultPath: null,
    applyReportResultPath: null,
    schedulerArtifactsResultPath: null,
    requireComplete: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--require-complete") parsed.requireComplete = true;
    else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if ((arg === "--live-diagnostic-report" || arg === "--live-diagnostic-report-path") && next) {
      parsed.liveDiagnosticReportPath = next;
      i += 1;
    } else if ((arg === "--apply-report" || arg === "--apply-report-path") && next) {
      parsed.applyReportPath = next;
      i += 1;
    } else if (arg === "--max-applied-imports" && next) {
      parsed.maxAppliedImports = parseNonNegativeInt(arg, next);
      i += 1;
    } else if (arg === "--apply-report-max-age-minutes" && next) {
      parsed.applyReportMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--production-deploy-evidence" && next) {
      parsed.productionDeployEvidencePath = next;
      i += 1;
    } else if (arg === "--scheduler-enable-evidence" && next) {
      parsed.schedulerEnablementEvidencePath = next;
      i += 1;
    } else if (arg === "--first-apply-status-result" && next) {
      parsed.firstApplyStatusResultPath = next;
      i += 1;
    } else if (arg === "--live-spike-proof-result" && next) {
      parsed.liveSpikeProofResultPath = next;
      i += 1;
    } else if (arg === "--live-diagnostic-result" && next) {
      parsed.liveDiagnosticResultPath = next;
      i += 1;
    } else if (arg === "--approval-packet-result" && next) {
      parsed.approvalPacketResultPath = next;
      i += 1;
    } else if (arg === "--public-docs-privacy-result" && next) {
      parsed.publicDocsPrivacyResultPath = next;
      i += 1;
    } else if (arg === "--apply-report-result" && next) {
      parsed.applyReportResultPath = next;
      i += 1;
    } else if (arg === "--scheduler-artifacts-result" && next) {
      parsed.schedulerArtifactsResultPath = next;
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function script(name) {
  return resolve("scripts", name);
}

function parsePositiveNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function parseNonNegativeInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer.`);
  return parsed;
}

function redact(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bRECALL_API_KEY\s*=\s*[^\s"'<>]+/gi, "RECALL_API_KEY=<redacted>");
}

function printHelp() {
  console.log(`Recall daily sync completion status

Usage:
  npm run recall:daily-sync:completion-status
  npm run recall:daily-sync:completion-status -- --require-complete
  npm run recall:daily-sync:completion-status -- --production-deploy-evidence data/private/recall-live-spikes/production-deploy-evidence.json --scheduler-enable-evidence data/private/recall-live-spikes/scheduler-enable-evidence.json

This command is no-live and no-write. It summarizes current completion evidence
for the Recall daily sync goal and reports incomplete gates without refreshing
proof, applying, deploying, enabling a scheduler, or advancing checkpoints.

Apply reports are treated as durable historical completion evidence here. Fresh
apply-report and backup proof checks still belong to the guarded apply/deploy
validators before any new production action.
`);
}
