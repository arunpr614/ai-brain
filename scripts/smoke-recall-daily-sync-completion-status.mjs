#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const privateRoot = resolve("data/private/recall-live-spikes");
mkdirSync(privateRoot, { recursive: true });
const scratch = mkdtempSync(join(privateRoot, "completion-status-smoke-"));

try {
  const blockedFixtures = writeFixtures("blocked", {
    firstApplyStatus: {
      ok: false,
      status: "blocked_key_rotation_evidence",
      gateSummary: {
        currentBlockingGate: "key_rotation_evidence",
        owner: "Arun",
        externalActionRequired: true,
        externalAction: "rotate_recall_api_key_outside_chat",
        failedChecks: ["key_rotation_evidence", "dry_run_report_proof", "backup_proof"],
        blockedActions: ["proof_refresh", "first_capped_apply", "deploy", "scheduler", "checkpoint"],
        proofRefreshAllowedNow: false,
        applyAllowedNow: false,
        deployAllowedNow: false,
        schedulerAllowedNow: false,
        checkpointAllowedNow: false,
      },
      readiness: {
        failedChecks: ["key_rotation_evidence", "dry_run_report_proof", "backup_proof"],
      },
      diagnostics: {
        liveReadConnectivity: {
          latestPrivateDiagnosticProof: latestPrivateDiagnosticProof(),
        },
      },
      nextAction:
        "Rotate the Recall API key outside chat, then prefer the rotated-key private env writer to store it only in the ignored private Recall env file before rerunning key evidence. Manual private env editing is fallback-only.",
      nextCommands: [
        "npm run recall:first-apply:prepare-plan",
        "npm run check:recall-key-rotation-evidence",
      ],
    },
    applyReport: {
      ok: false,
      verdict: "DO_NOT_DEPLOY_OR_SCHEDULE",
      reportPath: "data/private/recall-live-spikes/first-apply-report.json",
      findings: [{ rule: "missing_report", message: "Apply report does not exist." }],
    },
    productionDeployEvidence: null,
    schedulerEnablementEvidence: null,
  });

  const blocked = runCompletion(blockedFixtures);
  assert(blocked.status === 0, "incomplete status should exit 0 by default");
  const blockedJson = JSON.parse(blocked.stdout);
  assert(blockedJson.ok === false, "blocked fixture should not be complete");
  assert(blockedJson.completionAchieved === false, "blocked fixture should set completionAchieved false");
  assert(blockedJson.status === "blocked_key_rotation_evidence", "blocked fixture should preserve key rotation blocker");
  assert(blockedJson.noLiveNoWrite === true, "completion status should identify itself as no-live/no-write");
  assert(blockedJson.currentBlockingGate === "key_rotation_evidence", "blocked fixture should expose current gate");
  assert(blockedJson.owner === "Arun", "blocked fixture should expose gate owner");
  assert(blockedJson.blockedRequirements.includes("first_apply_key_and_proof_readiness"), "blocked fixture should block readiness");
  assert(blockedJson.blockedRequirements.includes("first_capped_apply"), "blocked fixture should block first apply");
  assert(blockedJson.blockedRequirements.includes("production_deploy"), "blocked fixture should block deploy evidence");
  assert(blockedJson.blockedRequirements.includes("scheduler_enablement"), "blocked fixture should block scheduler evidence");
  assert(
    blockedJson.requirements.find((entry) => entry.id === "private_live_diagnostic_proof")?.ok === true,
    "blocked fixture should still count private live diagnostic proof as done",
  );
  assert(
    blockedJson.requirements.find((entry) => entry.id === "private_live_diagnostic_proof")?.evidence?.doesNotAuthorize?.includes("apply"),
    "private diagnostic proof should remain non-authorizing",
  );
  assert(
    blockedJson.nextGate?.currentBlockingGate === "key_rotation_evidence",
    "blocked fixture should put first-apply gate in nextGate",
  );
  assert(
    blockedJson.requirements
      .find((entry) => entry.id === "first_apply_key_and_proof_readiness")
      ?.nextAction?.includes("prefer the rotated-key private env writer") &&
      blockedJson.requirements
        .find((entry) => entry.id === "first_apply_key_and_proof_readiness")
        ?.nextAction?.includes("Manual private env editing is fallback-only"),
    "blocked fixture should preserve helper-first/fallback-only next action from first-apply status",
  );
  assertNoSecret(blocked.stdout, "blocked completion output");

  const blockedRequire = runCompletion(blockedFixtures, ["--require-complete"]);
  assert(blockedRequire.status === 1, "--require-complete should fail while incomplete");
  assertNoSecret(blockedRequire.stdout + blockedRequire.stderr, "blocked require-complete output");

  const schedulerOnlyFixtures = writeFixtures("scheduler-only", {
    firstApplyStatus: {
      ok: true,
      status: "ready_for_first_capped_apply_approval",
      gateSummary: {
        currentBlockingGate: "first_write_approval",
        owner: "Arun",
        externalActionRequired: true,
        blockedActions: ["first_capped_apply", "deploy", "scheduler", "checkpoint"],
      },
      readiness: { failedChecks: [] },
      diagnostics: {
        liveReadConnectivity: {
          latestPrivateDiagnosticProof: latestPrivateDiagnosticProof(),
        },
      },
      nextCommands: ["npm run recall:first-apply:prepare-plan"],
    },
    applyReport: passedApplyReport(),
    productionDeployEvidence: productionDeployEvidence(),
    schedulerEnablementEvidence: null,
  });

  const schedulerOnly = runCompletion(schedulerOnlyFixtures);
  assert(schedulerOnly.status === 0, "scheduler-only fixture should exit 0 by default");
  const schedulerOnlyJson = JSON.parse(schedulerOnly.stdout);
  assert(schedulerOnlyJson.ok === false, "scheduler-only fixture should not be complete");
  assert(
    schedulerOnlyJson.status === "blocked_second_manual_verification_run",
    "scheduler-only fixture should report the active second manual verification status",
  );
  assert(
    schedulerOnlyJson.activeBlockedRequirement === "second_manual_verification",
    "scheduler-only fixture should expose second manual verification as the active blocked requirement",
  );
  assert(
    schedulerOnlyJson.blockedRequirements.length === 1 &&
      schedulerOnlyJson.blockedRequirements[0] === "scheduler_enablement",
    "scheduler-only fixture should block only scheduler evidence",
  );
  assert(
    schedulerOnlyJson.blockedRequirements.length === 1 &&
      schedulerOnlyJson.blockedRequirements[0] === "scheduler_enablement",
    "scheduler-only fixture should expose the scheduler completion requirement",
  );
  assert(schedulerOnlyJson.owner === "Arun", "scheduler-only fixture should expose scheduler owner");
  assert(schedulerOnlyJson.externalActionRequired === true, "scheduler-only fixture should require approval");
  assert(
    schedulerOnlyJson.currentBlockingGate === "second_manual_verification_run",
    "scheduler-only fixture should expose second manual verification as the top-level current gate",
  );
  assert(
    schedulerOnlyJson.nextGate?.currentBlockingGate === "second_manual_verification_run",
    "scheduler-only fixture should make the second manual verification run the active prerequisite gate",
  );
  assert(
    schedulerOnlyJson.nextGate?.externalAction === "approve_second_manual_verification_run_before_scheduler_enablement",
    "scheduler-only fixture should request second manual verification approval before scheduler approval",
  );
  assert(
    JSON.stringify(schedulerOnlyJson.blockedActions) === JSON.stringify(["second_manual_verification", "scheduler", "checkpoint"]),
    "scheduler-only fixture should block second manual verification, scheduler, and checkpoint actions",
  );
  assert(
    schedulerOnlyJson.requirements.find((entry) => entry.id === "scheduler_enablement")?.evidence?.manualCleanRunReadiness
      ?.cleanRunCount === 1,
    "scheduler-only fixture should count only the first clean manual run",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.some((command) =>
      command.includes("RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md"),
    ),
    "scheduler-only fixture should point to the second manual verification approval packet",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.includes("npm run recall:current-gate"),
    "scheduler-only fixture should require the current-gate command before readiness and production handoff",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.includes(
      "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
    ),
    "scheduler-only fixture should require manifest-enforced pre-live before readiness and production handoff",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.includes("npm run recall:second-manual:readiness"),
    "scheduler-only fixture should require the second manual readiness command before the production runner",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.some((command) => command.includes("npm run recall:second-manual:production-command")),
    "scheduler-only fixture should point to the no-live production command handoff before approval",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.some((command) => command.includes("npm run recall:second-manual:production-apply")),
    "scheduler-only fixture should point to the guarded second manual production runner",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.some((command) =>
      command.includes("npm run recall:production-key-evidence:command"),
    ),
    "scheduler-only fixture should point to the production key-evidence repair handoff if remote preflight blocks",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.some((command) =>
      command.includes("npm run recall:production-env-key:install"),
    ),
    "scheduler-only fixture should point to the production Recall key install when production lacks RECALL_API_KEY",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("npm run recall:current-gate") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("status=ready_for_second_manual_exact_approval") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("firstApplyApprovalPresent=false") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("secondManualApprovalInWrongEnv=false"),
    "scheduler-only fixture next action should require current-gate approval mismatch checks before handoff",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("npm run recall:second-manual:production-command"),
    "scheduler-only fixture next action should name the no-live production command handoff after current-gate",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes(
      "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
    ) &&
      schedulerOnlyJson.nextGate?.nextAction?.includes(
        "nextGate.localGateResolution.preApplyProgress.stoppedAt=approval_gate",
      ) &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("selectedMatchesRemoteLatest=true"),
    "scheduler-only fixture next action should require manifest-enforced pre-live local-gate proof",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("handoffProgress.stoppedAt=ready_for_exact_approval") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("handoffProgress.localGateStatus=not_blocking_production_path") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("handoffProgress.remotePreflightPassed=true") &&
      schedulerOnlyJson.nextGate?.nextAction?.includes("handoffProgress.liveWriteAttempted=false"),
    "scheduler-only fixture next action should name the ready handoff progress checks",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("npm run recall:production-key-evidence:command"),
    "scheduler-only fixture next action should name the production key-evidence repair handoff before approval when remote preflight blocks",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("npm run recall:production-env-key:install"),
    "scheduler-only fixture next action should name production Recall key install before approval when the production env lacks RECALL_API_KEY",
  );
  assert(
    schedulerOnlyJson.nextGate?.nextAction?.includes("npm run recall:second-manual:production-apply"),
    "scheduler-only fixture next action should name the guarded production runner",
  );
  assert(
    schedulerOnlyJson.safeNextCommands.every((command) => !command.includes("first-apply")),
    "scheduler-only fixture should not expose stale first-apply helper commands",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.status ===
      "requires_no_live_production_handoff_then_exact_approval",
    "scheduler-only fixture should expose the second manual no-live handoff then exact approval path",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.currentGateCommand === "npm run recall:current-gate",
    "scheduler-only fixture should expose the current-gate command in the second manual path",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.manifestPreLiveCommand ===
      "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
    "scheduler-only fixture should expose the manifest-enforced pre-live command in the second manual path",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.requiredBeforeApply?.requiredPreLiveProof
      ?.selectedMatchesRemoteLatest === true,
    "scheduler-only fixture should expose the required latest deployed proof-pair evidence before apply",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.status ===
      "ready_for_second_manual_exact_approval" &&
      schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.firstApplyApprovalPresent === false &&
      schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.secondManualApprovalInWrongEnv === false &&
      schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.localGateStatus ===
        "not_blocking_production_path" &&
      schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.remotePreflightPassed === true &&
      schedulerOnlyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.liveWriteAttempted === false,
    "scheduler-only fixture should define exact current-gate proof fields",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.readyHandoffMustShow?.stoppedAt ===
      "ready_for_exact_approval" &&
      schedulerOnlyJson.secondManualVerificationPath?.readyHandoffMustShow?.localGateStatus ===
        "not_blocking_production_path" &&
      schedulerOnlyJson.secondManualVerificationPath?.readyHandoffMustShow?.remotePreflightPassed === true &&
      schedulerOnlyJson.secondManualVerificationPath?.readyHandoffMustShow?.liveWriteAttempted === false,
    "scheduler-only fixture should define the exact ready handoff proof fields",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.localPrivateGatesAreNotThePlannedProductionGate === true,
    "scheduler-only fixture should state local private gates are not the planned production gate",
  );
  assert(
    schedulerOnlyJson.secondManualVerificationPath?.staleApprovalWarning?.includes("First capped apply approval is already spent"),
    "scheduler-only fixture should warn that first-apply approval is stale for the second manual run",
  );
  assertCompletedFirstApplyReadinessEvidence(schedulerOnlyJson, "scheduler-only fixture");
  assertNoSecret(schedulerOnly.stdout, "scheduler-only completion output");

  const staleHistoricalApplyFixtures = writeFixtures("stale-historical-apply", {
    firstApplyStatus: {
      ok: false,
      status: "blocked_first_apply_readiness",
      gateSummary: {
        currentBlockingGate: "first_apply_readiness",
        owner: "Codex",
        externalActionRequired: false,
        failedChecks: ["live_gate_status", "dry_run_report_proof", "backup_proof"],
        blockedActions: ["proof_refresh", "first_capped_apply", "deploy", "scheduler", "checkpoint"],
      },
      readiness: { failedChecks: ["live_gate_status", "dry_run_report_proof", "backup_proof"] },
      diagnostics: {
        liveReadConnectivity: {
          latestPrivateDiagnosticProof: latestPrivateDiagnosticProof(),
        },
      },
      nextCommands: ["npm run check:recall-first-apply-readiness"],
    },
    applyReport: passedApplyReport(),
    productionDeployEvidence: productionDeployEvidence(),
    schedulerEnablementEvidence: null,
    staleRawFirstApplyReport: true,
  });

  const staleHistoricalApply = runCompletion(staleHistoricalApplyFixtures, [], { useApplyReportResult: false });
  assert(staleHistoricalApply.status === 0, "stale historical apply fixture should exit 0 by default");
  const staleHistoricalApplyJson = JSON.parse(staleHistoricalApply.stdout);
  assert(
    staleHistoricalApplyJson.status === "blocked_second_manual_verification_run",
    "stale historical apply fixture should report the active second manual verification status",
  );
  assert(
    staleHistoricalApplyJson.activeBlockedRequirement === "second_manual_verification",
    "stale historical apply fixture should expose second manual verification as the active blocked requirement",
  );
  assert(
    staleHistoricalApplyJson.requirements.find((entry) => entry.id === "first_apply_key_and_proof_readiness")?.ok ===
      true,
    "stale historical apply fixture should treat first-apply readiness as done once durable apply evidence exists",
  );
  assertCompletedFirstApplyReadinessEvidence(staleHistoricalApplyJson, "stale historical apply fixture");
  assert(
    staleHistoricalApplyJson.requirements.find((entry) => entry.id === "first_capped_apply")?.ok === true &&
      staleHistoricalApplyJson.requirements.find((entry) => entry.id === "post_apply_review")?.ok === true,
    "stale historical apply fixture should keep first apply and post-apply review done despite stale report mtime",
  );
  assert(
    staleHistoricalApplyJson.currentBlockingGate === "second_manual_verification_run" &&
      staleHistoricalApplyJson.nextGate?.currentBlockingGate === "second_manual_verification_run",
    "stale historical apply fixture should not let stale pre-apply proof mask the second manual verification gate",
  );
  assert(
    staleHistoricalApplyJson.safeNextCommands.includes("npm run recall:second-manual:readiness"),
    "stale historical apply fixture should still point to the second manual readiness command",
  );
  assert(
    staleHistoricalApplyJson.safeNextCommands.includes("npm run recall:current-gate"),
    "stale historical apply fixture should still point to the current-gate command before readiness",
  );
  assert(
    staleHistoricalApplyJson.safeNextCommands.includes(
      "npm run check:recall-prelive -- --manifest data/private/recall-live-spikes/controlled-samples.json",
    ),
    "stale historical apply fixture should still point to manifest-enforced pre-live before readiness",
  );
  assert(
    staleHistoricalApplyJson.safeNextCommands.some((command) =>
      command.includes("npm run recall:second-manual:production-command"),
    ),
    "stale historical apply fixture should still point to the no-live production command handoff",
  );
  assert(
    staleHistoricalApplyJson.secondManualVerificationPath?.readyCurrentGateMustShow?.firstApplyApprovalPresent ===
      false &&
      staleHistoricalApplyJson.secondManualVerificationPath?.readyCurrentGateMustShow
        ?.secondManualApprovalInWrongEnv === false,
    "stale historical apply fixture should preserve current-gate approval mismatch guidance",
  );
  assert(
    staleHistoricalApplyJson.secondManualVerificationPath?.readyHandoffMustShow?.localGateStatus ===
      "not_blocking_production_path",
    "stale historical apply fixture should preserve local private gates not blocking guidance",
  );
  assert(
    staleHistoricalApplyJson.secondManualVerificationPath?.requiredBeforeApply?.requiredPreLiveProof
      ?.selectedMatchesRemoteLatest === true,
    "stale historical apply fixture should preserve latest deployed proof-pair guidance",
  );
  assertNoSecret(staleHistoricalApply.stdout, "stale historical apply completion output");

  const schedulerReadyFixtures = writeFixtures("scheduler-ready", {
    firstApplyStatus: {
      ok: true,
      status: "ready_for_first_capped_apply_approval",
      gateSummary: {
        currentBlockingGate: "first_write_approval",
        owner: "Arun",
        externalActionRequired: true,
        blockedActions: ["first_capped_apply", "deploy", "scheduler", "checkpoint"],
      },
      readiness: { failedChecks: [] },
      diagnostics: {
        liveReadConnectivity: {
          latestPrivateDiagnosticProof: latestPrivateDiagnosticProof(),
        },
      },
      nextCommands: ["npm run recall:first-apply:prepare-plan"],
    },
    applyReport: passedApplyReport(),
    productionDeployEvidence: productionDeployEvidence(),
    schedulerEnablementEvidence: null,
    extraScheduledApplyReports: [
      {
        name: "scheduled-apply-20260626T190000Z.json",
        value: rawCleanApplyReport(),
      },
    ],
  });

  const schedulerReady = runCompletion(schedulerReadyFixtures);
  assert(schedulerReady.status === 0, "scheduler-ready fixture should exit 0 by default");
  const schedulerReadyJson = JSON.parse(schedulerReady.stdout);
  assert(schedulerReadyJson.ok === false, "scheduler-ready fixture should still be incomplete without scheduler evidence");
  assert(
    schedulerReadyJson.status === "blocked_scheduler_enablement",
    "scheduler-ready fixture should report scheduler enablement as the active status after two clean runs",
  );
  assert(
    schedulerReadyJson.activeBlockedRequirement === "scheduler_enablement",
    "scheduler-ready fixture should expose scheduler enablement as the active blocked requirement",
  );
  assert(
    schedulerReadyJson.nextGate?.currentBlockingGate === "scheduler_enablement",
    "scheduler-ready fixture should promote scheduler approval after two clean runs exist",
  );
  assert(
    schedulerReadyJson.nextGate?.externalAction === "approve_scheduler_enablement_after_repeated_clean_manual_runs",
    "scheduler-ready fixture should request scheduler approval after repeated clean runs",
  );
  assert(
    schedulerReadyJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-enable:command")),
    "scheduler-ready fixture should point to the no-live scheduler command handoff",
  );
  assert(
    schedulerReadyJson.safeNextCommands?.some((command) =>
      command.includes("recall:scheduler-enable-evidence:record"),
    ),
    "scheduler-ready fixture should point to scheduler evidence recording only after approval",
  );
  assert(
    schedulerReadyJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-evidence:command")),
    "scheduler-ready fixture should point to the no-live first-run evidence handoff before evidence recording",
  );
  assert(
    schedulerReadyJson.safeNextCommands?.some(
      (command) =>
        command.includes("timer/flags") &&
        command.includes("first scheduled service run completed after scheduler timer activation"),
    ) &&
      schedulerReadyJson.nextGate?.nextAction?.includes(
        "first scheduled service run completed after scheduler timer activation",
      ),
    "scheduler-ready fixture should require timer/flag enablement and first scheduled service-run completion before evidence recording",
  );
  assert(
    schedulerReadyJson.nextGate?.nextAction?.includes("recall:scheduler-evidence:command"),
    "scheduler-ready fixture should require the first-run evidence handoff before private evidence recording",
  );
  assert(
    schedulerReadyJson.safeNextCommands?.some((command) =>
      command.includes("check:recall-scheduler-enable-evidence"),
    ),
    "scheduler-ready fixture should point to scheduler evidence verification",
  );
  assert(
    schedulerReadyJson.nextGate?.nextAction?.includes("npm run recall:scheduler-enable:command") &&
      schedulerReadyJson.nextGate?.nextAction?.includes("ready_for_exact_scheduler_approval") &&
      schedulerReadyJson.nextGate?.nextAction?.includes("schedulerEnablementAttempted=false"),
    "scheduler-ready fixture should require the no-live scheduler handoff before timer enablement",
  );
  assert(
    JSON.stringify(schedulerReadyJson.blockedActions) === JSON.stringify(["scheduler", "checkpoint"]),
    "scheduler-ready fixture should block only scheduler and checkpoint actions",
  );
  assert(
    schedulerReadyJson.requirements.find((entry) => entry.id === "scheduler_enablement")?.evidence?.manualCleanRunReadiness
      ?.cleanRunCount >= 2,
    "scheduler-ready fixture should count the first and second clean manual runs",
  );
  assertCompletedFirstApplyReadinessEvidence(schedulerReadyJson, "scheduler-ready fixture");
  assertNoSecret(schedulerReady.stdout, "scheduler-ready completion output");

  const completeFixtures = writeFixtures("complete", {
    firstApplyStatus: {
      ok: true,
      status: "ready_for_first_capped_apply_approval",
      gateSummary: {
        currentBlockingGate: "first_write_approval",
        owner: "Arun",
        externalActionRequired: true,
        blockedActions: ["first_capped_apply", "deploy", "scheduler", "checkpoint"],
      },
      readiness: { failedChecks: [] },
      diagnostics: {
        liveReadConnectivity: {
          latestPrivateDiagnosticProof: latestPrivateDiagnosticProof(),
        },
      },
      nextCommands: [],
    },
    applyReport: passedApplyReport(),
    productionDeployEvidence: productionDeployEvidence(),
    schedulerEnablementEvidence: {
      ok: true,
      verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
      target: "production",
      checkedAtIso: pastIso(5),
      enabledAtIso: pastIso(10),
      approval: {
        approvedBy: "Arun",
        scope: "scheduler_enablement_after_repeated_clean_runs",
      },
      productionDeployVerdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
      manualCleanRunsBeforeEnable: 2,
      manualCleanRuns: [
        manualCleanRun("manual_first_capped_apply", "data/private/recall-live-spikes/first-apply-report.json", 60),
        manualCleanRun("manual_second_guarded_apply", "data/private/recall-live-spikes/manual-apply-20260626T190000Z.json", 30),
      ],
      timer: {
        unit: "brain-recall-sync.timer",
        enabled: true,
        active: true,
        activeSinceIso: pastIso(10),
        nextElapseIso: futureIso(60),
      },
      service: {
        unit: "brain-recall-sync.service",
        lastRunOk: true,
        lastRunExitCode: 0,
        lastRunCompletedAtIso: pastIso(7),
      },
      recallEnv: {
        syncEnabled: true,
        schedulerEnabled: true,
        confirmLiveApi: true,
      },
      firstRun: {
        ok: true,
        exitCode: 0,
        completedAtIso: pastIso(7),
        applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
        applyReportPath: "data/private/recall-live-spikes/scheduled-apply-20260625T023500Z.json",
      },
    },
  });

  const complete = runCompletion(completeFixtures, ["--require-complete"]);
  assert(complete.status === 0, "complete fixture should pass --require-complete");
  const completeJson = JSON.parse(complete.stdout);
  assert(completeJson.ok === true, "complete fixture should set ok true");
  assert(completeJson.completionAchieved === true, "complete fixture should set completionAchieved true");
  assert(completeJson.status === "complete", "complete fixture should report complete");
  assert(completeJson.blockedRequirements.length === 0, "complete fixture should have no blocked requirements");
  assert(
    completeJson.requirements.every((entry) => entry.ok === true && entry.status === "done"),
    "complete fixture should mark every requirement done",
  );
  assert(
    completeJson.requirements.find((entry) => entry.id === "production_deploy")?.evidence?.summary?.recallScheduler
      ?.timerEnabled === false,
    "complete fixture should require production deploy evidence with the Recall timer still disabled",
  );
  assert(
    completeJson.requirements.find((entry) => entry.id === "scheduler_enablement")?.evidence?.summary?.timer?.enabled ===
      true,
    "complete fixture should require scheduler evidence with the timer enabled",
  );
  assertCompletedFirstApplyReadinessEvidence(completeJson, "complete fixture");
  assertNoSecret(complete.stdout, "complete completion output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "blocked current-state fixture exits 0 by default",
          "blocked current-state fixture exposes key rotation as the next gate",
          "blocked current-state fixture preserves helper-first/fallback-only key storage guidance",
          "blocked current-state fixture preserves private diagnostic proof as diagnostic-only",
          "blocked current-state fixture blocks first apply, deploy, and scheduler completion",
          "require-complete exits nonzero while incomplete",
          "scheduler-only fixture promotes the second manual verification run as the active scheduler prerequisite",
          "scheduler-only fixture reports second manual verification as the active blocked requirement",
          "scheduler-only fixture points to the second manual readiness command",
          "scheduler-only fixture points to the guarded second manual production runner",
          "scheduler-only fixture exposes ready handoff proof fields before approval",
          "scheduler-only fixture states local private gates are not the planned production gate",
          "scheduler-only fixture points to key-evidence repair before approval when remote preflight blocks",
          "scheduler-only fixture points to production Recall key install when the production env lacks RECALL_API_KEY",
          "scheduler-only fixture next action names the guarded production runner",
          "stale historical apply evidence does not regress completion status to first-apply readiness",
          "completed first-apply readiness evidence suppresses stale pre-apply failed checks",
          "scheduler-ready fixture promotes scheduler enablement after two distinct clean manual runs are visible",
          "scheduler-ready fixture reports scheduler enablement as the active blocked requirement",
          "scheduler-ready fixture points to the no-live scheduler command handoff before approval",
          "scheduler-ready fixture requires post-approval timer/first-run sequence before evidence recording",
          "complete fixture exits 0 with require-complete",
          "complete fixture requires apply report, deploy evidence, and scheduler enablement evidence",
          "complete fixture validates deploy and scheduler evidence through strict private evidence checkers",
          "completion status output does not print secret-shaped values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function writeFixtures(prefix, overrides) {
  const applyReportFixture = { ...overrides.applyReport };
  let rawFirstApplyPath = null;
  if (applyReportFixture.ok === true) {
    rawFirstApplyPath = writeJson(`${prefix}-raw-first-apply-report.json`, rawCleanApplyReport());
    if (overrides.staleRawFirstApplyReport) {
      const staleDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      utimesSync(rawFirstApplyPath, staleDate, staleDate);
    }
    applyReportFixture.reportPath = rawFirstApplyPath;
  }

  const paths = {
    firstApplyStatus: writeJson(`${prefix}-first-apply-status.json`, overrides.firstApplyStatus),
    liveSpikeProof: writeJson(`${prefix}-live-spike-proof.json`, {
      ok: true,
      verdict: "PASS_WITH_ACCEPTED_FIDELITY_CHANGES",
    }),
    liveDiagnostic: writeJson(`${prefix}-live-diagnostic.json`, {
      ok: true,
      verdict: "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT",
      summary: {
        mode: "first_apply_live_read_diagnostic",
        liveAuthProbe: {
          ok: true,
          endpoint: "/cards",
          method: "GET",
          httpStatus: 200,
          authenticated: true,
          reachable: true,
          totalCount: 0,
          resultCount: 0,
        },
      },
    }),
    approvalPacket: writeJson(`${prefix}-approval-packet.json`, {
      ok: true,
      checkedDocs: [],
      scriptCheck: { requiredScripts: 48, missingScripts: 0 },
    }),
    publicDocsPrivacy: writeJson(`${prefix}-public-docs-privacy.json`, {
      ok: true,
      scannedFiles: 51,
    }),
    applyReport: writeJson(`${prefix}-apply-report.json`, applyReportFixture),
    rawFirstApplyReport: rawFirstApplyPath,
    schedulerArtifacts: writeJson(`${prefix}-scheduler-artifacts.json`, {
      ok: true,
      verdict: "PASS_RECALL_SCHEDULER_ARTIFACTS_STATIC_CHECK",
    }),
    productionDeployEvidence: overrides.productionDeployEvidence
      ? writeJson(`${prefix}-production-deploy-evidence.json`, overrides.productionDeployEvidence)
      : join(scratch, `${prefix}-missing-production-deploy-evidence.json`),
    schedulerEnablementEvidence: overrides.schedulerEnablementEvidence
      ? writeJson(`${prefix}-scheduler-enable-evidence.json`, overrides.schedulerEnablementEvidence)
      : join(scratch, `${prefix}-missing-scheduler-enable-evidence.json`),
  };
  for (const report of overrides.extraScheduledApplyReports ?? []) {
    writeJson(report.name, report.value);
  }
  return paths;
}

function runCompletion(paths, extraArgs = [], { useApplyReportResult = true } = {}) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-daily-sync-completion-status.mjs"),
      "--first-apply-status-result",
      paths.firstApplyStatus,
      "--live-spike-proof-result",
      paths.liveSpikeProof,
      "--live-diagnostic-result",
      paths.liveDiagnostic,
      "--approval-packet-result",
      paths.approvalPacket,
      "--public-docs-privacy-result",
      paths.publicDocsPrivacy,
      ...(useApplyReportResult ? ["--apply-report-result", paths.applyReport] : ["--apply-report", paths.rawFirstApplyReport]),
      "--scheduler-artifacts-result",
      paths.schedulerArtifacts,
      ...(paths.productionDeployEvidence ? ["--production-deploy-evidence", paths.productionDeployEvidence] : []),
      ...(paths.schedulerEnablementEvidence ? ["--scheduler-enable-evidence", paths.schedulerEnablementEvidence] : []),
      ...extraArgs,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function latestPrivateDiagnosticProof() {
  return {
    ok: true,
    verdict: "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT",
    configuredReportPath: "data/private/recall-live-spikes/live-diagnostic-report.json",
    diagnosticOutputFile: {
      path: "data/private/recall-live-spikes/live-diagnostic-report.json",
      mode: "0600",
      statMode: "600",
      sizeBytes: 7288,
      mtimeIso: "2026-06-25T01:01:51.705Z",
    },
    liveAuthProbe: {
      endpoint: "/cards",
      method: "GET",
      httpStatus: 200,
      authenticated: true,
      reachable: true,
      resultCount: 0,
    },
    doesNotAuthorize: [
      "key_rotation_evidence",
      "proof_freshness",
      "first_write_approval",
      "apply",
      "deploy",
      "scheduler",
      "checkpoint",
    ],
  };
}

function passedApplyReport() {
  return {
    ok: true,
    verdict: "PASS_POST_APPLY_REVIEW_GATE",
    reportPath: "data/private/recall-live-spikes/first-apply-report.json",
    summary: {
      cardsSeen: 3,
      cardsImported: 3,
      cardsPlannedForImport: 3,
    },
  };
}

function productionDeployEvidence() {
  return {
    ok: true,
    verdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
    target: "production",
    checkedAtIso: pastIso(5),
    deployedAtIso: pastIso(10),
    approval: {
      approvedBy: "Arun",
      scope: "production_deploy_after_post_apply_review",
    },
    source: {
      postApplyReviewVerdict: "PASS_POST_APPLY_REVIEW_GATE",
      firstApplyReportPath: "data/private/recall-live-spikes/first-apply-report.json",
    },
    localGates: {
      checkRecallPreliveOk: true,
      checkRecallSchedulerOk: true,
      completionStatusBeforeDeployOk: false,
    },
    deployment: {
      artifactSynced: true,
      serviceRestarted: true,
      buildArtifactsChecked: true,
    },
    healthCheck: {
      ok: true,
      baseUrl: "https://brain.arunp.in",
      httpStatus: 200,
      authenticated: true,
    },
    aiProviderCheck: {
      ok: true,
    },
    recallScheduler: {
      timerUnitInstalled: true,
      timerEnabled: false,
      timerActive: false,
      enableFlagsDisabled: true,
    },
  };
}

function rawCleanApplyReport() {
  return {
    mode: "apply",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    cardsSeen: 3,
    cardsAvailable: 3,
    enumerationComplete: true,
    cardsImported: 3,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 3,
    totalCharsPlanned: 123,
    totalChunksFetched: 3,
    fidelityCounts: {},
    policyBlockCounts: {},
    plannedActionCounts: {},
    checkpointAdvanced: true,
  };
}

function manualCleanRun(kind, applyReportPath, minutesAgo) {
  return {
    ok: true,
    kind,
    completedAtIso: pastIso(minutesAgo),
    applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
    applyReportPath,
  };
}

function writeJson(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  chmodSync(path, 0o600);
  return path;
}

function pastIso(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function assertNoSecret(value, label) {
  assert(!String(value).includes("RECALL_API_KEY="), `${label} printed env contents`);
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assertCompletedFirstApplyReadinessEvidence(json, label) {
  const readiness = json.requirements.find((entry) => entry.id === "first_apply_key_and_proof_readiness");
  assert(readiness?.ok === true, `${label} should mark first-apply readiness done`);
  assert(
    readiness?.evidence?.status === "satisfied_by_completed_first_apply",
    `${label} should summarize first-apply readiness from completed apply evidence`,
  );
  assert(
    readiness?.evidence?.applyReport?.verdict === "PASS_POST_APPLY_REVIEW_GATE",
    `${label} should include the completed first apply report verdict`,
  );
  assert(
    !("failedChecks" in (readiness?.evidence ?? {})),
    `${label} should not expose stale pre-apply failed checks after first apply is complete`,
  );
  assert(
    !("gateSummary" in (readiness?.evidence ?? {})),
    `${label} should not expose stale pre-apply gate summaries after first apply is complete`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
