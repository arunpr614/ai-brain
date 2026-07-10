#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  DEFAULT_MANIFEST_PATH,
  inspectControlledSampleManifestFile,
  loadControlledSampleManifest,
  summarizeControlledSampleManifest,
  validateControlledSampleManifestFileSafety,
} from "./lib/recall-controlled-samples.mjs";
import { collectPrivatePreviewValues, preview } from "./lib/recall-prelive-output.mjs";

const args = parseArgs(process.argv.slice(2));
const privatePreviewValues = collectPrivatePreviewValues(args.manifestPath ?? DEFAULT_MANIFEST_PATH);

if (args.help) {
  printHelp();
  process.exit(0);
}

const steps = [
  {
    id: "private_ignore",
    description: "Recall private evidence paths are ignored and untracked.",
    command: ["npm", "run", "check:recall-private-ignore"],
    required: true,
  },
  {
    id: "controlled_samples",
    description: args.manifestPath
      ? "Private controlled sample manifest validates."
      : "Private controlled sample manifest validation skipped because --manifest was not provided.",
    command: args.manifestPath
      ? ["npm", "run", "check:recall-controlled-samples", "--", args.manifestPath]
      : null,
    required: args.requireManifest,
  },
  {
    id: "prelive_output_smoke",
    description: "Pre-live status previews redact private manifest values and token-shaped strings.",
    command: ["npm", "run", "smoke:recall-prelive-output"],
    required: true,
  },
  {
    id: "controlled_samples_init_smoke",
    description: "Private controlled sample manifest initializer refuses unsafe paths and cleans up temp files.",
    command: ["npm", "run", "smoke:recall-controlled-samples-init"],
    required: true,
  },
  {
    id: "controlled_samples_guide_smoke",
    description: "Controlled sample setup guide stays no-secret and synchronized with manifest labels.",
    command: ["npm", "run", "smoke:recall-controlled-samples-guide"],
    required: true,
  },
  {
    id: "recall_env_init_smoke",
    description: "Private Recall env template initializer writes only an empty-key, confirmation-disabled template.",
    command: ["npm", "run", "smoke:recall-env-init"],
    required: true,
  },
  {
    id: "key_rotation_env_writer_smoke",
    description: "Rotated-key private env writer keeps secrets private, live confirmation disabled, and key metadata gates checked.",
    command: ["npm", "run", "smoke:recall-key-rotation-env-writer"],
    required: true,
  },
  {
    id: "live_gate_status_smoke",
    description: "Live gate status summary reports next action without leaking secrets.",
    command: ["npm", "run", "smoke:recall-live-gate-status"],
    required: true,
  },
  {
    id: "approval_packet_consistency",
    description: "No-secret approval packet keeps live gates, redaction rules, and stop conditions aligned.",
    command: ["npm", "run", "check:recall-approval-packet"],
    required: true,
  },
  {
    id: "live_diagnostic_report_gate_smoke",
    description: "Read-only live diagnostic report checker accepts post-rotation diagnostics without granting write authority.",
    command: ["npm", "run", "smoke:recall-live-diagnostic-report-check"],
    required: true,
  },
  {
    id: "first_apply_live_diagnostic_smoke",
    description: "First-apply read-only live diagnostic can still run a guarded probe when status-helper checks are inconclusive.",
    command: ["npm", "run", "smoke:recall-first-apply-live-diagnostic"],
    required: true,
  },
  {
    id: "first_apply_live_diagnostic_prompt_guard_smoke",
    description: "First-apply read-only live diagnostic prompt guard rejects credential overrides before key entry.",
    command: ["npm", "run", "smoke:recall-first-apply-live-diagnostic-prompt-guard"],
    required: true,
  },
  {
    id: "key_rotation_handoff_smoke",
    description: "Key-rotation handoff command prints a no-secret operator checklist without live calls or writes.",
    command: ["npm", "run", "smoke:recall-key-rotation-handoff"],
    required: true,
  },
  {
    id: "key_rotation_handoff_snapshot",
    description: "Key-rotation handoff snapshot surfaces the current production phase and safe next commands.",
    command: ["npm", "run", "recall:key-rotation:handoff", "--", "--json"],
    required: true,
  },
  {
    id: "post_rotation_prepare_smoke",
    description: "Post-rotation prepare wrapper can safely record evidence and refresh stale proof without apply.",
    command: ["npm", "run", "smoke:recall-first-apply-prepare-after-rotation"],
    required: true,
  },
  {
    id: "live_spike_rehearsal",
    description: "Manifest-driven SPIKE-013/SPIKE-014 report path works offline.",
    command: ["npm", "run", "smoke:recall-live-spikes"],
    required: true,
  },
  {
    id: "live_spike_report_gate_smoke",
    description: "Post-live SPIKE-013/SPIKE-014 report acceptance gate catches blocker and privacy cases.",
    command: ["npm", "run", "smoke:recall-live-spike-reports"],
    required: true,
  },
  {
    id: "public_privacy_scan_smoke",
    description: "Public report privacy scanner fails closed when required files are missing and redacts leak previews.",
    command: ["npm", "run", "smoke:recall-public-privacy"],
    required: true,
  },
  {
    id: "public_docs_privacy_scan_smoke",
    description: "Current public approval/runbook docs privacy scanner fails closed and redacts leak previews.",
    command: ["npm", "run", "smoke:recall-public-docs-privacy"],
    required: true,
  },
  {
    id: "public_manifest_privacy_scan_smoke",
    description: "Manifest-aware public report privacy scanner catches exact and normalized private-value leaks.",
    command: ["npm", "run", "smoke:recall-public-manifest-privacy"],
    required: true,
  },
  {
    id: "public_privacy_scan",
    description: "Public SPIKE-013/SPIKE-014 reports have no obvious secret leaks.",
    command: ["npm", "run", "check:recall-public-privacy"],
    required: true,
  },
  {
    id: "public_docs_privacy_scan",
    description: "Current public approval/runbook docs have no obvious secret leaks.",
    command: ["npm", "run", "check:recall-public-docs-privacy"],
    required: true,
  },
  {
    id: "dry_run_report_review_gate",
    description: "Dry-run report apply-readiness validator catches unsafe apply inputs.",
    command: ["npm", "run", "smoke:recall-dry-run-report"],
    required: true,
  },
  {
    id: "apply_report_review_gate",
    description: "Apply report post-apply validator catches unsafe deploy and scheduler inputs.",
    command: ["npm", "run", "smoke:recall-apply-report"],
    required: true,
  },
  {
    id: "scheduler_static_safety",
    description: "Scheduler artifacts remain disabled and guarded.",
    command: ["npm", "run", "check:recall-scheduler"],
    required: true,
  },
  {
    id: "production_cli_build",
    description: "Production Recall CLI bundle builds.",
    command: ["npm", "run", "build:recall-cli"],
    required: true,
  },
  {
    id: "production_cli_bundle_smoke",
    description: "Packaged Recall CLI runs fixture dry-run/apply smoke without src/.",
    command: ["npm", "run", "smoke:recall-cli:bundle"],
    required: true,
  },
  {
    id: "scheduled_wrapper_smoke",
    description: "Disabled scheduler wrapper can execute the future dry-run/proof/apply sequence with fixtures.",
    command: ["npm", "run", "smoke:recall-scheduler-wrapper"],
    required: true,
  },
  {
    id: "manual_verification_apply_smoke",
    description: "Second manual verification wrapper requires approval and delegates to guarded scheduled apply without enabling timers.",
    command: ["npm", "run", "smoke:recall-manual-verification-apply"],
    required: true,
  },
  {
    id: "second_manual_runtime_preflight_smoke",
    description: "Second manual verification production runtime preflight validates deployed proof inputs and helper availability without live calls.",
    command: ["npm", "run", "smoke:recall-second-manual-runtime-preflight"],
    required: true,
  },
  {
    id: "second_manual_remote_runtime_preflight_smoke",
    description: "Second manual verification remote runtime preflight verifier can prove production-shaped SSH checks without live calls.",
    command: ["npm", "run", "smoke:recall-second-manual-remote-runtime-preflight"],
    required: true,
  },
  {
    id: "second_manual_production_command_handoff_smoke",
    description: "Second manual production command handoff prints the guarded runner command without live calls.",
    command: ["npm", "run", "smoke:recall-second-manual-production-command"],
    required: true,
  },
  {
    id: "second_manual_production_apply_runner_smoke",
    description: "Second manual production apply runner refuses without exact approval and reaches remote wrapper only after preflight.",
    command: ["npm", "run", "smoke:recall-second-manual-production-apply"],
    required: true,
  },
  {
    id: "second_manual_local_gate_resolution_smoke",
    description: "Second manual local-gate resolution checker proves local gates are not the production blocker.",
    command: ["npm", "run", "smoke:recall-second-manual-local-gate-resolution"],
    required: true,
  },
  {
    id: "second_manual_local_gate_resolution_check",
    description:
      "Second manual local-gate resolution checker proves approval-gate stop, remote preflight, and deployed proof-pair freshness.",
    command: ["npm", "run", "check:recall-second-manual-local-gate-resolution"],
    required: true,
  },
  {
    id: "production_key_evidence_repair_smoke",
    description: "Production system key-evidence repair path refuses without exact acknowledgement and only records private evidence after a read-only auth probe.",
    command: ["npm", "run", "smoke:recall-production-key-evidence-repair"],
    required: true,
  },
  {
    id: "production_env_key_install_smoke",
    description: "Production Recall key installer repairs a missing system env key without printing it and proves one read-only auth probe.",
    command: ["npm", "run", "smoke:recall-production-env-key-install"],
    required: true,
  },
  {
    id: "second_manual_readiness_smoke",
    description: "Second manual verification readiness gate points at approval only when prerequisite evidence is satisfied.",
    command: ["npm", "run", "smoke:recall-second-manual-readiness"],
    required: true,
  },
  {
    id: "second_manual_command_smoke",
    description: "Second manual verification command builder prints concrete proof paths without live calls or placeholders.",
    command: ["npm", "run", "smoke:recall-second-manual-command"],
    required: true,
  },
  {
    id: "daily_sync_completion_status_smoke",
    description: "Whole-goal completion status smoke proves blocked and complete states without live calls or writes.",
    command: ["npm", "run", "smoke:recall-daily-sync-completion-status"],
    required: true,
  },
  {
    id: "goal_completion_audit_smoke",
    description: "Goal completion audit checker keeps the current incomplete-goal audit aligned with completion status.",
    command: ["npm", "run", "smoke:recall-goal-completion-audit"],
    required: true,
  },
  {
    id: "goal_completion_audit_check",
    description: "Current Recall goal completion audit matches the no-live completion-status gate.",
    command: ["npm", "run", "check:recall-goal-completion-audit"],
    required: true,
  },
  {
    id: "current_gate_smoke",
    description: "Current-gate checker combines goal audit and production handoff without live writes.",
    command: ["npm", "run", "smoke:recall-current-gate"],
    required: true,
  },
  {
    id: "current_gate_check",
    description: "Current Recall gate is ready for exact second-manual approval and not blocked by local gates.",
    command: ["npm", "run", "recall:current-gate"],
    required: true,
  },
  {
    id: "scheduler_enable_evidence_recorder_smoke",
    description: "Scheduler enablement evidence recorder requires approval and repeated clean-run proof without enabling timers.",
    command: ["npm", "run", "smoke:recall-scheduler-enable-evidence-record"],
    required: true,
  },
  {
    id: "scheduler_enable_command_handoff_smoke",
    description: "Scheduler enablement command handoff prints the approved sequence without enabling timers or writing evidence.",
    command: ["npm", "run", "smoke:recall-scheduler-enable-command"],
    required: true,
  },
  {
    id: "scheduler_evidence_command_handoff_smoke",
    description: "Scheduler first-run evidence handoff prints read-only inspection, candidate review, and evidence commands without running them.",
    command: ["npm", "run", "smoke:recall-scheduler-evidence-command"],
    required: true,
  },
  {
    id: "daily_sync_completion_status_snapshot",
    description: args.liveConfirmedStatusPreview
      ? "Whole-goal completion status reports live-confirmed first-write approval gate without authorizing it."
      : "Whole-goal completion status reports remaining first apply, deploy, and scheduler gates without authorizing them.",
    command: ["npm", "run", "recall:daily-sync:completion-status"],
    env: args.liveConfirmedStatusPreview ? { BRAIN_RECALL_CONFIRM_LIVE_API: "1" } : null,
    required: true,
  },
];

const results = [];
for (const step of steps) {
  if (!step.command) {
    const skipped = {
      id: step.id,
      description: step.description,
      status: step.required ? "failed" : "skipped",
      required: step.required,
    };
    results.push(skipped);
    if (step.required) break;
    continue;
  }
  results.push(runStep(step));
  if (results.at(-1).status !== "passed") break;
}

const failed = results.filter((step) => step.status === "failed");
const skippedRequired = results.filter((step) => step.required && step.status === "skipped");
const defaultManifest = args.manifestPath ? null : inspectDefaultManifestWhenOmitted();
const nextGateSummary = nextGate(args, defaultManifest, results);

if (failed.length > 0 || skippedRequired.length > 0) {
  console.error("[check:recall-prelive-readiness] failed");
  console.error(JSON.stringify({ ok: false, manifestPath: args.manifestPath, results }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath: args.manifestPath,
      defaultManifest,
      results,
      nextGate: nextGateSummary,
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    manifestPath: null,
    requireManifest: false,
    liveConfirmedStatusPreview: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      parsed.requireManifest = true;
      i += 1;
    } else if (arg === "--require-manifest") {
      parsed.requireManifest = true;
    } else if (arg === "--live-confirmed-status-preview") {
      parsed.liveConfirmedStatusPreview = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function runStep(step) {
  const startedAt = Date.now();
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: process.cwd(),
    env: step.env ? { ...process.env, ...step.env } : process.env,
    encoding: "utf8",
  });
  const parsedOutput = parseMaybeJson(result.status === 0 ? result.stdout : result.stderr || result.stdout);
  const statusSummary =
    step.id === "daily_sync_completion_status_snapshot" ? summarizeCompletionStatus(parsedOutput) : null;
  const localGateResolutionSummary =
    step.id === "second_manual_local_gate_resolution_check" ? summarizeLocalGateResolution(parsedOutput) : null;
  return {
    id: step.id,
    description: step.description,
    command: step.command.join(" "),
    envPreview: step.env ? Object.fromEntries(Object.keys(step.env).map((key) => [key, "<set>"])) : null,
    required: step.required,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    stdoutPreview: preview(result.stdout, privatePreviewValues),
    stderrPreview: preview(result.stderr, privatePreviewValues),
    ...(statusSummary ? { statusSummary } : {}),
    ...(localGateResolutionSummary ? { localGateResolutionSummary } : {}),
  };
}

function inspectDefaultManifestWhenOmitted() {
  const fileSafety = inspectControlledSampleManifestFile(DEFAULT_MANIFEST_PATH);
  const base = {
    path: DEFAULT_MANIFEST_PATH,
    exists: fileSafety.exists,
    validationEnforced: false,
    validationRequiredBeforeLiveApi: true,
  };

  if (!fileSafety.exists) {
    return {
      ...base,
      status: "missing",
      valid: false,
    };
  }

  const safety = validateControlledSampleManifestFileSafety(DEFAULT_MANIFEST_PATH);
  if (!safety.ok) {
    return {
      ...base,
      status: "unsafe_file",
      valid: false,
      fileSafety: safety.file,
      findings: sanitizeFindings(safety.findings),
    };
  }

  try {
    const summary = summarizeControlledSampleManifest(loadControlledSampleManifest(DEFAULT_MANIFEST_PATH));
    return {
      ...base,
      status: "valid",
      valid: true,
      validationRequiredBeforeLiveApi: false,
      fileSafety,
      dateWindow: summary.dateWindow,
      sampleCount: summary.sampleCount,
      requiredLabels: summary.requiredLabels,
      negativeControl: summary.negativeControl,
      publicPrivacy: summary.publicPrivacy,
    };
  } catch (error) {
    return {
      ...base,
      status: "invalid",
      valid: false,
      fileSafety,
      findings: sanitizeFindings(error?.findings),
    };
  }
}

function sanitizeFindings(findings) {
  if (!Array.isArray(findings)) return [];
  return findings.map((finding) => ({
    path: finding.path,
    message: finding.message,
  }));
}

function nextGate(parsedArgs, defaultManifest, results) {
  const completionStatus = results.find((step) => step.id === "daily_sync_completion_status_snapshot")?.statusSummary ?? null;
  const localGateResolution =
    results.find((step) => step.id === "second_manual_local_gate_resolution_check")?.localGateResolutionSummary ?? null;
  const manifestStatus = manifestGateStatus(parsedArgs, defaultManifest);
  if (completionStatus?.currentBlockingGate) {
    return {
      status: "offline_readiness_passed",
      manifest: manifestStatus,
      currentProductionGate: completionStatus,
      localGateResolution,
      nextAction: completionStatus.nextAction ?? nextActionForCompletionStatus(completionStatus),
      safetyNote:
        "Pre-live is no-live/no-write. It does not approve live writes, scheduler enablement, or checkpoint movement.",
    };
  }
  if (completionStatus?.completionAchieved === true) {
    return {
      status: "complete",
      manifest: manifestStatus,
      currentProductionGate: completionStatus,
      localGateResolution,
      nextAction: "No remaining Recall daily sync completion gate.",
      safetyNote: "Pre-live is no-live/no-write.",
    };
  }

  if (parsedArgs.manifestPath) {
    return {
      status: "offline_readiness_passed",
      manifest: manifestStatus,
      currentProductionGate: null,
      localGateResolution,
      nextAction:
        "Offline readiness passed with manifest. Approved live work still requires the relevant exact approval and checked private Recall credentials.",
      safetyNote: "Pre-live is no-live/no-write.",
    };
  }
  if (defaultManifest?.exists && defaultManifest.valid === true) {
    return {
      status: "manifest_not_enforced",
      manifest: manifestStatus,
      currentProductionGate: null,
      localGateResolution,
      nextAction: `Offline readiness passed without enforcing the default manifest. Rerun with --manifest ${DEFAULT_MANIFEST_PATH} before live API access.`,
      safetyNote: "Pre-live is no-live/no-write.",
    };
  }
  if (defaultManifest?.exists) {
    return {
      status: "manifest_not_enforced",
      manifest: manifestStatus,
      currentProductionGate: null,
      localGateResolution,
      nextAction: `Offline readiness passed without enforcing the default manifest. The default manifest is ${defaultManifest.status}; fill/fix it and rerun with --manifest ${DEFAULT_MANIFEST_PATH} before live API access.`,
      safetyNote: "Pre-live is no-live/no-write.",
    };
  }
  return {
    status: "manifest_missing",
    manifest: manifestStatus,
    currentProductionGate: null,
    localGateResolution,
    nextAction: "Offline readiness passed without manifest. Populate and validate the private manifest before live API access.",
    safetyNote: "Pre-live is no-live/no-write.",
  };
}

function manifestGateStatus(parsedArgs, defaultManifest) {
  if (parsedArgs.manifestPath) {
    return {
      validationEnforced: true,
      path: parsedArgs.manifestPath,
      status: "validated",
    };
  }
  return {
    validationEnforced: false,
    path: DEFAULT_MANIFEST_PATH,
    status: defaultManifest?.status ?? "missing",
    valid: defaultManifest?.valid ?? false,
  };
}

function summarizeCompletionStatus(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const manualReadiness = parsed.requirements?.find((entry) => entry?.id === "scheduler_enablement")?.evidence
    ?.manualCleanRunReadiness;
  const secondManualVerificationPath = summarizeSecondManualVerificationPath(parsed.secondManualVerificationPath);
  return {
    ok: parsed.ok === true,
    completionAchieved: parsed.completionAchieved === true,
    status: parsed.status ?? null,
    currentBlockingGate: parsed.currentBlockingGate ?? null,
    activeBlockedRequirement: parsed.activeBlockedRequirement ?? null,
    owner: parsed.owner ?? null,
    externalActionRequired: parsed.externalActionRequired ?? null,
    externalAction: parsed.externalAction ?? null,
    blockedRequirements: Array.isArray(parsed.blockedRequirements) ? parsed.blockedRequirements : [],
    blockedActions: Array.isArray(parsed.blockedActions) ? parsed.blockedActions : [],
    safeNextCommands: Array.isArray(parsed.safeNextCommands) ? parsed.safeNextCommands : [],
    nextAction: parsed.nextGate?.nextAction ?? null,
    secondManualVerificationPath,
    manualCleanRunReadiness: manualReadiness
      ? {
          requiredManualCleanRunsBeforeSchedulerEnable:
            manualReadiness.requiredManualCleanRunsBeforeSchedulerEnable ?? null,
          cleanRunCount: manualReadiness.cleanRunCount ?? null,
          needsSecondManualVerificationRun: manualReadiness.needsSecondManualVerificationRun ?? null,
          schedulerEnablementApprovalAllowedByManualRunEvidence:
            manualReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
          secondManualVerificationApprovalPacket: manualReadiness.secondManualVerificationApprovalPacket ?? null,
        }
      : null,
  };
}

function summarizeSecondManualVerificationPath(path) {
  if (!path || typeof path !== "object" || Array.isArray(path)) return null;
  const ready = path.readyHandoffMustShow ?? {};
  const readyCurrentGate = path.readyCurrentGateMustShow ?? {};
  const requiredBeforeApply = path.requiredBeforeApply ?? {};
  const requiredPreLiveProof = requiredBeforeApply.requiredPreLiveProof ?? {};
  return {
    status: path.status ?? null,
    currentGate: path.currentGate ?? null,
    currentGateCommand: path.currentGateCommand ?? null,
    manifestPreLiveCommand: path.manifestPreLiveCommand ?? null,
    noLiveHandoffCommand: path.noLiveHandoffCommand ?? null,
    approvalPacket: path.approvalPacket ?? null,
    applyCommandAfterExactApproval: path.applyCommandAfterExactApproval ?? null,
    requiredBeforeApply: {
      currentGateCommand: requiredBeforeApply.currentGateCommand ?? null,
      manifestPreLiveCommand: requiredBeforeApply.manifestPreLiveCommand ?? null,
      noLiveProductionHandoffCommand: requiredBeforeApply.noLiveProductionHandoffCommand ?? null,
      applyCommandAfterExactApproval: requiredBeforeApply.applyCommandAfterExactApproval ?? null,
      approvalEnv: requiredBeforeApply.approvalEnv ?? null,
      requiredPreLiveProof: {
        localGateResolutionStoppedAt: requiredPreLiveProof.localGateResolutionStoppedAt ?? null,
        remotePreflightStatus: requiredPreLiveProof.remotePreflightStatus ?? null,
        selectedBy: requiredPreLiveProof.selectedBy ?? null,
        selectedMatchesRemoteLatest: requiredPreLiveProof.selectedMatchesRemoteLatest ?? null,
      },
    },
    readyCurrentGateMustShow: {
      status: readyCurrentGate.status ?? null,
      currentBlockingGate: readyCurrentGate.currentBlockingGate ?? null,
      activeBlockedRequirement: readyCurrentGate.activeBlockedRequirement ?? null,
      approvalRequiredEnv: readyCurrentGate.approvalRequiredEnv ?? null,
      exactApprovalPresent: readyCurrentGate.exactApprovalPresent ?? null,
      firstApplyApprovalPresent: readyCurrentGate.firstApplyApprovalPresent ?? null,
      secondManualApprovalInWrongEnv: readyCurrentGate.secondManualApprovalInWrongEnv ?? null,
      localGateStatus: readyCurrentGate.localGateStatus ?? null,
      remotePreflightPassed: readyCurrentGate.remotePreflightPassed ?? null,
      liveWriteAttempted: readyCurrentGate.liveWriteAttempted ?? null,
    },
    readyHandoffMustShow: {
      stoppedAt: ready.stoppedAt ?? null,
      readyForExactApproval: ready.readyForExactApproval ?? null,
      localPrivateGatesSkippedForProductionPath: ready.localPrivateGatesSkippedForProductionPath ?? null,
      localGateStatus: ready.localGateStatus ?? null,
      remotePreflightPassed: ready.remotePreflightPassed ?? null,
      liveWriteAttempted: ready.liveWriteAttempted ?? null,
    },
    liveWriteGateAfterReadyHandoff: path.liveWriteGateAfterReadyHandoff ?? null,
    localPrivateGatesAreNotThePlannedProductionGate:
      path.localPrivateGatesAreNotThePlannedProductionGate ?? null,
    staleApprovalWarning: path.staleApprovalWarning ?? null,
    schedulerStillBlockedUntil: path.schedulerStillBlockedUntil ?? null,
  };
}

function summarizeLocalGateResolution(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const preApply = parsed.checked?.preApplyProgress ?? {};
  const staleFirstApply = parsed.checked?.staleFirstApplyApprovalProgress ?? {};
  const handoff = parsed.checked?.handoffProgress ?? {};
  const staleWording = parsed.checked?.staleWordingScan ?? {};
  return {
    ok: parsed.ok === true,
    mode: parsed.mode ?? null,
    noLiveNoWrite: parsed.noLiveNoWrite ?? null,
    liveWriteAttempted: parsed.liveWriteAttempted ?? null,
    currentGate: parsed.currentGate ?? null,
    handoffProgress: {
      stoppedAt: handoff.stoppedAt ?? null,
      readyForExactApproval: handoff.readyForExactApproval ?? null,
      localGateStatus: handoff.localGateStatus ?? null,
      remotePreflightPassed: handoff.remotePreflightPassed ?? null,
      liveWriteAttempted: handoff.liveWriteAttempted ?? null,
    },
    preApplyProgress: summarizeProductionApplyProgress(preApply),
    staleFirstApplyApprovalProgress: summarizeProductionApplyProgress(staleFirstApply),
    staleWordingScan: {
      scannedFiles: staleWording.scannedFiles ?? null,
      findingCount: staleWording.findingCount ?? null,
    },
  };
}

function summarizeProductionApplyProgress(progress) {
  return {
    status: progress.status ?? null,
    stoppedAt: progress.stoppedAt ?? null,
    blockingFindingIds: Array.isArray(progress.blockingFindingIds) ? progress.blockingFindingIds : [],
    localPrivateGatesSkippedForProductionPath: progress.localPrivateGatesSkippedForProductionPath ?? null,
    localGateStatus: progress.localGateStatus ?? null,
    remotePreflightPassed: progress.remotePreflightPassed ?? null,
    remotePreflightStatus: progress.remotePreflightStatus ?? null,
    approvalPresent: progress.approvalPresent ?? null,
    liveWriteAttempted: progress.liveWriteAttempted ?? null,
    liveCallNotAttemptedBecause: progress.liveCallNotAttemptedBecause ?? null,
    selectedReports: progress.selectedReports
      ? {
          enumerationPath: progress.selectedReports.enumerationPath ?? null,
          fidelityPath: progress.selectedReports.fidelityPath ?? null,
          timestamp: progress.selectedReports.timestamp ?? null,
          selectedBy: progress.selectedReports.selectedBy ?? null,
        }
      : null,
    remoteProofReports: progress.remoteProofReports
      ? {
          enumerationOk: progress.remoteProofReports.enumerationOk ?? null,
          fidelityOk: progress.remoteProofReports.fidelityOk ?? null,
        }
      : null,
    deployedLatestReports: progress.deployedLatestReports
      ? {
          timestamp: progress.deployedLatestReports.timestamp ?? null,
          selectedMatchesRemoteLatest: progress.deployedLatestReports.selectedMatchesRemoteLatest ?? null,
        }
      : null,
  };
}

function nextActionForCompletionStatus(status) {
  if (status.currentBlockingGate === "second_manual_verification_run") {
    return "Run npm run recall:current-gate first and confirm ready_for_second_manual_exact_approval, firstApplyApprovalPresent=false, secondManualApprovalInWrongEnv=false, and localGateStatus=not_blocking_production_path; then run npm run recall:second-manual:readiness and npm run recall:second-manual:production-command, confirm handoffProgress.stoppedAt=ready_for_exact_approval and handoffProgress.localGateStatus=not_blocking_production_path, then wait for exact Arun approval before the second manual verification apply.";
  }
  if (status.currentBlockingGate === "scheduler_enablement") {
    return "Wait for exact scheduler enablement approval, then record private scheduler evidence after the scheduled run verifies cleanly.";
  }
  return "Resolve the current production gate reported by recall:daily-sync:completion-status.";
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

function printHelp() {
  console.log(`Recall pre-live readiness check

Usage:
  npm run check:recall-prelive
  npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json
  npm run check:recall-prelive -- --live-confirmed-status-preview

Options:
  --manifest <path>       Validate the private controlled sample manifest as part of readiness.
  --require-manifest      Fail if --manifest is omitted.
  --live-confirmed-status-preview
                         Run only the embedded completion-status snapshot with
                         BRAIN_RECALL_CONFIRM_LIVE_API=1. This remains no-live
                         and no-write; it only changes status-gate reporting.

This command does not call the live Recall API and does not write production data.
It runs private ignore, optional manifest validation, controlled sample
output-redaction smoke, controlled sample initializer smoke, controlled sample
guide smoke, env template initializer smoke, live gate status smoke, approval
packet consistency, live-spike rehearsal, public privacy scan, live spike
report gate smoke, current public-doc privacy scan, dry-run report validator
smoke, scheduler static safety, packaged CLI smoke, and scheduled wrapper smoke
gates.

When --manifest is omitted, this command does not enforce controlled sample
validation. If the default private manifest exists, it reports a redacted
defaultManifest status and still requires rerunning with --manifest before
live Recall API access.
`);
}
