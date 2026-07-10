#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const scratch = mkdtempSync(join(tmpdir(), `recall-goal-completion-audit-${process.pid}-${Date.now()}-`));

try {
  const good = runChecker({
    auditDoc: writeFile("good-audit.md", auditDocFixture()),
    completionStatus: writeJson("good-completion-status.json", completionStatusFixture()),
    prelive: writeJson("good-prelive.json", preliveFixture()),
  });
  assert(good.status === 0, `good current-state audit fixture should pass\n${good.stdout}\n${good.stderr}`);
  const goodJson = JSON.parse(good.stdout);
  assert(goodJson.ok === true, "good current-state audit should report ok true");
  assert(
    goodJson.status === "goal_completion_audit_current_incomplete_state_verified",
    "good current-state audit should report verified status",
  );
  assert(goodJson.currentBlockingGate === "scheduler_enablement", "good audit should expose current gate");
  assert(goodJson.manualCleanRunReadiness.cleanRunCount >= 2, "good audit should expose at least two clean manual runs");
  assert(
    goodJson.manualCleanRunReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence === true,
    "good audit should expose scheduler approval allowed by manual-run evidence",
  );
  assert(
    goodJson.checked.preliveReadiness.localGateResolution.selectedMatchesRemoteLatest === true,
    "good audit should expose pre-live local-gate proof freshness",
  );
  assert(
    goodJson.checked.preliveReadiness.localGateResolution.staleFirstApplyStoppedAt === "approval_gate",
    "good audit should expose stale first-apply approval proof stop point",
  );
  assert(
    goodJson.checked.preliveReadiness.localGateResolution.staleFirstApplyBlockingFindingIds.includes(
      "stale_first_apply_approval",
    ),
    "good audit should expose stale first-apply approval classification",
  );
  assert(
    goodJson.checked.preliveReadiness.localGateResolution.staleFirstApplySelectedMatchesRemoteLatest === true,
    "good audit should expose stale first-apply proof-pair freshness",
  );
  assert(
    goodJson.safeNextCommands?.some(
      (command) => command.includes("timer/flags") && command.includes("first scheduled service run"),
    ),
    "good audit should preserve post-approval timer and first scheduled service-run guidance",
  );
  assert(
    goodJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-evidence:command")) &&
      goodJson.safeNextCommands?.some((command) => command.includes("recall:scheduler-enable-evidence:record")),
    "good audit should preserve first-run evidence handoff before scheduler evidence recording",
  );
  assertNoSecret(good.stdout, "good checker output");

  const extraManualRun = runChecker({
    auditDoc: writeFile("extra-manual-run-audit.md", auditDocFixture()),
    completionStatus: writeJson("extra-manual-run-completion-status.json", completionStatusFixture({ cleanRunCount: 3 })),
    prelive: writeJson("extra-manual-run-prelive.json", preliveFixture()),
  });
  assert(extraManualRun.status === 0, "scheduler audit should accept more than two clean manual runs");
  const extraManualRunJson = JSON.parse(extraManualRun.stdout);
  assert(extraManualRunJson.manualCleanRunReadiness.cleanRunCount === 3, "extra manual run count should be preserved");
  assertNoSecret(extraManualRun.stdout, "extra manual run checker output");

  const finalAudit = runChecker({
    auditDoc: writeFile("final-audit.md", finalAuditDocFixture()),
    completionStatus: writeJson("final-completion-status.json", finalCompletionStatusFixture()),
    prelive: writeJson("final-prelive.json", preliveFixture({ currentBlockingGate: null })),
  });
  assert(finalAudit.status === 0, `final completion audit fixture should pass\n${finalAudit.stdout}\n${finalAudit.stderr}`);
  const finalAuditJson = JSON.parse(finalAudit.stdout);
  assert(finalAuditJson.ok === true, "final completion audit should report ok true");
  assert(
    finalAuditJson.status === "goal_completion_audit_final_state_verified",
    "final completion audit should report final verified status",
  );
  assert(finalAuditJson.completionAchieved === true, "final completion audit should expose completion achieved");
  assert(finalAuditJson.currentBlockingGate === null, "final completion audit should expose no current gate");
  assert(finalAuditJson.safeNextCommands.length === 0, "final completion audit should expose no safe next commands");
  assert(finalAuditJson.checked.auditDoc.declaresSchedulerComplete === true, "final audit doc should declare scheduler complete");
  assertNoSecret(finalAudit.stdout, "final checker output");

  const staleCompleteAudit = runChecker({
    auditDoc: writeFile("stale-complete-audit.md", auditDocFixture({ statusLine: "Status: Complete" })),
    completionStatus: writeJson("stale-complete-completion-status.json", completionStatusFixture()),
    prelive: writeJson("stale-complete-prelive.json", preliveFixture()),
  });
  assert(staleCompleteAudit.status === 1, "stale complete audit should fail");
  assert(
    staleCompleteAudit.stderr.includes("missing_required_snippet"),
    "stale complete audit should fail on missing current-state snippets",
  );
  assertNoSecret(staleCompleteAudit.stdout + staleCompleteAudit.stderr, "stale complete audit output");

  const staleSecondManualGate = runChecker({
    auditDoc: writeFile("stale-second-manual-gate-audit.md", auditDocFixture()),
    completionStatus: writeJson(
      "stale-second-manual-gate-completion-status.json",
      completionStatusFixture({
        status: "blocked_second_manual_verification_run",
        currentBlockingGate: "second_manual_verification_run",
        activeBlockedRequirement: "second_manual_verification",
        externalAction: "approve_second_manual_verification_run_before_scheduler_enablement",
        cleanRunCount: 1,
        needsSecondManualVerificationRun: true,
        schedulerEnablementApprovalAllowedByManualRunEvidence: false,
        blockedActions: ["second_manual_verification", "scheduler", "checkpoint"],
        }),
    ),
    prelive: writeJson("stale-second-manual-gate-prelive.json", preliveFixture()),
  });
  assert(staleSecondManualGate.status === 1, "stale second-manual completion status should fail post-apply audit");
  assert(
    staleSecondManualGate.stderr.includes("stale_second_manual_gate_after_approved_apply"),
    "stale second-manual completion status should name the post-apply gate drift",
  );
  assertNoSecret(staleSecondManualGate.stdout + staleSecondManualGate.stderr, "stale second-manual output");

  const missingDoneRequirement = runChecker({
    auditDoc: writeFile("missing-done-audit.md", auditDocFixture()),
    completionStatus: writeJson(
      "missing-done-completion-status.json",
      completionStatusFixture({ requirementOverrides: { production_deploy: false } }),
    ),
    prelive: writeJson("missing-done-prelive.json", preliveFixture()),
  });
  assert(missingDoneRequirement.status === 1, "missing done requirement should fail");
  assert(
    missingDoneRequirement.stderr.includes("required_done_requirement_not_done") &&
      missingDoneRequirement.stderr.includes("production_deploy"),
    "missing done requirement should name the missing requirement",
  );
  assertNoSecret(missingDoneRequirement.stdout + missingDoneRequirement.stderr, "missing done output");

  const secretAudit = runChecker({
    auditDoc: writeFile("secret-audit.md", `${auditDocFixture()}\nsecret sk_testsecretvalue12345\n`),
    completionStatus: writeJson("secret-completion-status.json", completionStatusFixture()),
    prelive: writeJson("secret-prelive.json", preliveFixture()),
  });
  assert(secretAudit.status === 1, "secret-shaped audit doc should fail");
  assert(secretAudit.stderr.includes("secret_shaped_value"), "secret-shaped audit doc should name privacy failure");

  const stalePrelive = runChecker({
    auditDoc: writeFile("stale-prelive-audit.md", auditDocFixture()),
    completionStatus: writeJson("stale-prelive-completion-status.json", completionStatusFixture()),
    prelive: writeJson(
      "stale-prelive.json",
      preliveFixture({
        currentBlockingGate: "second_manual_verification_run",
      }),
    ),
  });
  assert(stalePrelive.status === 1, "stale scheduler pre-live current gate should fail");
  assert(
    stalePrelive.stderr.includes("prelive_wrong_scheduler_current_gate"),
    "stale pre-live proof should name scheduler current-gate drift",
  );
  assertNoSecret(stalePrelive.stdout + stalePrelive.stderr, "stale pre-live output");

  const staleSchedulerHandoff = runChecker({
    auditDoc: writeFile("stale-scheduler-handoff-audit.md", auditDocFixture()),
    completionStatus: writeJson(
      "stale-scheduler-handoff-completion-status.json",
      completionStatusFixture({
        safeNextCommands: ["npm run recall:daily-sync:completion-status"],
        nextAction:
          "Enable the scheduler only after explicit scheduler approval, then record timer and first-run evidence.",
      }),
    ),
    prelive: writeJson("stale-scheduler-handoff-prelive.json", preliveFixture()),
  });
  assert(staleSchedulerHandoff.status === 1, "stale scheduler handoff guidance should fail");
  assert(
    staleSchedulerHandoff.stderr.includes("missing_scheduler_handoff_safe_next") &&
      staleSchedulerHandoff.stderr.includes("missing_scheduler_handoff_next_action"),
    "stale scheduler handoff guidance should name the missing handoff proof",
  );
  assertNoSecret(staleSchedulerHandoff.stdout + staleSchedulerHandoff.stderr, "stale scheduler handoff output");

  const staleSchedulerSequence = runChecker({
    auditDoc: writeFile("stale-scheduler-sequence-audit.md", auditDocFixture()),
    completionStatus: writeJson(
      "stale-scheduler-sequence-completion-status.json",
      completionStatusFixture({
        safeNextCommands: [
          "Review docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
          "No-live scheduler handoff before approval: run npm run recall:scheduler-enable:command",
          "Only after exact scheduler approval: npm run recall:scheduler-enable-evidence:record",
          "npm run check:recall-scheduler-enable-evidence",
        ],
      }),
    ),
    prelive: writeJson("stale-scheduler-sequence-prelive.json", preliveFixture()),
  });
  assert(staleSchedulerSequence.status === 1, "stale scheduler post-approval sequence should fail");
  assert(
    staleSchedulerSequence.stderr.includes("missing_scheduler_enable_and_first_run_safe_next"),
    "stale scheduler post-approval sequence should name the missing timer and first-run step",
  );
  assertNoSecret(staleSchedulerSequence.stdout + staleSchedulerSequence.stderr, "stale scheduler sequence output");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "current incomplete audit fixture passes",
          "scheduler audit accepts more than two clean manual runs",
          "final completion audit fixture passes",
          "stale complete audit fixture fails",
          "stale second-manual completion status fails the post-apply audit",
          "missing done requirement fails",
          "secret-shaped audit doc fails",
          "stale scheduler pre-live current gate fails",
          "stale scheduler handoff guidance fails",
          "stale scheduler post-approval sequence fails",
          "checker output does not print secret-shaped values for normal fixtures",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function runChecker({ auditDoc, completionStatus, prelive }) {
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-goal-completion-audit.mjs"),
      "--audit-doc",
      auditDoc,
      "--completion-status-result",
      completionStatus,
      "--prelive-result",
      prelive,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
}

function preliveFixture({ currentBlockingGate = "scheduler_enablement", localGateResolution } = {}) {
  const baseLocalGateResolution = {
    ok: true,
    noLiveNoWrite: true,
    liveWriteAttempted: false,
    currentGate: "second_manual_verification_run",
    handoffProgress: {
      stoppedAt: "ready_for_exact_approval",
      readyForExactApproval: true,
      localGateStatus: "not_blocking_production_path",
      remotePreflightPassed: true,
      liveWriteAttempted: false,
    },
    preApplyProgress: {
      status: "blocked_second_manual_production_apply",
      stoppedAt: "approval_gate",
      localPrivateGatesSkippedForProductionPath: true,
      remotePreflightStatus: "ready_for_second_manual_remote_runtime_preflight",
      selectedReports: {
        enumerationPath: "docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-26_21-58-57_IST.md",
        fidelityPath: "docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-26_21-58-57_IST.md",
        timestamp: "2026-06-26_21-58-57_IST",
        selectedBy: "remote_latest_deployed_pair",
      },
      remoteProofReports: {
        enumerationOk: true,
        fidelityOk: true,
      },
      deployedLatestReports: {
        timestamp: "2026-06-26_21-58-57_IST",
        selectedMatchesRemoteLatest: true,
      },
    },
    staleFirstApplyApprovalProgress: {
      status: "blocked_second_manual_production_apply",
      stoppedAt: "approval_gate",
      blockingFindingIds: ["stale_first_apply_approval"],
      localPrivateGatesSkippedForProductionPath: true,
      localGateStatus: "not_blocking_production_path",
      remotePreflightStatus: "ready_for_second_manual_remote_runtime_preflight",
      approvalPresent: false,
      liveWriteAttempted: false,
      deployedLatestReports: {
        timestamp: "2026-06-26_21-58-57_IST",
        selectedMatchesRemoteLatest: true,
      },
    },
  };
  return {
    ok: true,
    nextGate: {
      currentProductionGate: {
        currentBlockingGate,
      },
      localGateResolution: localGateResolution ?? baseLocalGateResolution,
    },
  };
}

function completionStatusFixture({
  status = "blocked_scheduler_enablement",
  currentBlockingGate = "scheduler_enablement",
  activeBlockedRequirement = "scheduler_enablement",
  externalAction = "approve_scheduler_enablement_after_repeated_clean_manual_runs",
  cleanRunCount = 2,
  needsSecondManualVerificationRun = false,
  schedulerEnablementApprovalAllowedByManualRunEvidence = true,
  blockedActions = ["scheduler", "checkpoint"],
  requirementOverrides = {},
  safeNextCommands = [
    "Review docs/plans/recall-sync/RECALL_SCHEDULER_ENABLEMENT_APPROVAL_PACKET_2026-06-26_23-50-00_IST.md",
    "npm run recall:current-gate",
    "No-live scheduler handoff before approval: run npm run recall:scheduler-enable:command",
    "Only after exact scheduler approval: enable the timer/flags, verify first scheduled run, then run npm run recall:scheduler-evidence:command before npm run recall:scheduler-enable-evidence:record",
    "npm run check:recall-scheduler-enable-evidence",
    "npm run recall:daily-sync:completion-status -- --require-complete",
  ],
  nextAction =
    "Run npm run recall:current-gate and confirm status=ready_for_scheduler_enablement_approval, schedulerAllowedNow=true, and noLiveSchedulerHandoffCommand=npm run recall:scheduler-enable:command. Then run npm run recall:scheduler-enable:command as the no-live scheduler handoff and confirm handoffProgress.stoppedAt=ready_for_exact_scheduler_approval, noLiveNoWrite=true, checks.completionStatus.cleanRunCount>=2, checks.prelive.ok=true, and handoffProgress.schedulerEnablementAttempted=false. Only after explicit scheduler approval should the timer/flags be enabled and the first scheduled service run verified; then run npm run recall:scheduler-evidence:command before private evidence is recorded with npm run recall:scheduler-enable-evidence:record and verified with npm run check:recall-scheduler-enable-evidence.",
} = {}) {
  const doneRequirementIds = [
    "live_spike_proof",
    "private_live_diagnostic_proof",
    "approval_packet_and_public_privacy",
    "first_apply_key_and_proof_readiness",
    "first_capped_apply",
    "post_apply_review",
    "scheduler_artifacts",
    "production_deploy",
  ];
  const requirements = doneRequirementIds.map((id) => ({
    id,
    ok: requirementOverrides[id] ?? true,
    status: requirementOverrides[id] === false ? "blocked_or_unverified" : "done",
  }));
  requirements.push({
    id: "scheduler_enablement",
    ok: false,
    status: "missing_scheduler_enablement_evidence",
    evidence: {
      status: "missing_evidence_file",
      manualCleanRunReadiness: {
        requiredManualCleanRunsBeforeSchedulerEnable: 2,
        cleanRunCount,
        needsSecondManualVerificationRun,
        schedulerEnablementApprovalAllowedByManualRunEvidence,
        cleanRuns:
          cleanRunCount >= 2
            ? [
                {
                  kind: "manual_first_capped_apply",
                  applyReportPath: "data/private/recall-live-spikes/first-apply-report.json",
                  verdict: "PASS_POST_APPLY_REVIEW_GATE",
                  ok: true,
                },
                {
                  kind: "manual_second_guarded_apply_candidate",
                  applyReportPath:
                    "data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json",
                  verdict: "PASS_POST_APPLY_REVIEW_GATE",
                  ok: true,
                },
              ]
            : [
                {
                  kind: "manual_first_capped_apply",
                  applyReportPath: "data/private/recall-live-spikes/first-apply-report.json",
                  verdict: "PASS_POST_APPLY_REVIEW_GATE",
                  ok: true,
                },
              ],
      },
    },
  });

  return {
    ok: false,
    completionAchieved: false,
    status,
    noLiveNoWrite: true,
    currentBlockingGate,
    activeBlockedRequirement,
    owner: "Arun",
    externalAction,
    nextGate: {
      currentBlockingGate,
      externalAction,
      nextAction,
    },
    blockedRequirements: ["scheduler_enablement"],
    blockedActions,
    requirements,
    safeNextCommands,
    secondManualVerificationPath:
      currentBlockingGate === "scheduler_enablement"
        ? null
        : {
            localPrivateGatesAreNotThePlannedProductionGate: true,
            noLiveHandoffCommand: "npm run recall:second-manual:production-command",
            applyCommandAfterExactApproval: "npm run recall:second-manual:production-apply",
          },
  };
}

function finalCompletionStatusFixture() {
  const base = completionStatusFixture({ cleanRunCount: 7 });
  const schedulerRequirement = base.requirements.find((entry) => entry.id === "scheduler_enablement");
  schedulerRequirement.ok = true;
  schedulerRequirement.status = "done";
  schedulerRequirement.evidence = {
    ok: true,
    exitCode: 0,
    verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
    evidencePath: "data/private/recall-live-spikes/scheduler-enable-evidence.json",
    status: "accepted",
    summary: {
      timer: {
        unit: "brain-recall-sync.timer",
        enabled: true,
        active: true,
        nextElapseIso: "2026-06-28T20:04:05.000Z",
      },
      firstRun: {
        ok: true,
        exitCode: 0,
        completedAtIso: "2026-06-27T20:03:08.000Z",
        applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
        applyReportPath: "data/private/recall-live-spikes/scheduled-apply-20260627T200306Z.json",
      },
      service: {
        lastRunCompletedAtIso: "2026-06-27T20:03:08.000Z",
      },
      manualCleanRunsBeforeEnable: 6,
      manualCleanRunEvidenceCount: 6,
    },
    manualCleanRunReadiness: {
      requiredManualCleanRunsBeforeSchedulerEnable: 2,
      cleanRunCount: 7,
      needsSecondManualVerificationRun: false,
      schedulerEnablementApprovalAllowedByManualRunEvidence: true,
      cleanRuns: [
        {
          kind: "manual_first_capped_apply",
          applyReportPath: "data/private/recall-live-spikes/first-apply-report.json",
          verdict: "PASS_POST_APPLY_REVIEW_GATE",
          ok: true,
        },
        {
          kind: "manual_second_guarded_apply_candidate",
          applyReportPath: "data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json",
          verdict: "PASS_POST_APPLY_REVIEW_GATE",
          ok: true,
        },
        {
          kind: "manual_second_guarded_apply_candidate",
          applyReportPath: "data/private/recall-live-spikes/scheduled-apply-20260627T200306Z.json",
          verdict: "PASS_POST_APPLY_REVIEW_GATE",
          ok: true,
        },
      ],
    },
  };

  return {
    ...base,
    ok: true,
    completionAchieved: true,
    status: "complete",
    currentBlockingGate: null,
    activeBlockedRequirement: null,
    owner: null,
    externalActionRequired: false,
    externalAction: null,
    blockedRequirements: [],
    blockedActions: ["checkpoint"],
    safeNextCommands: [],
    secondManualVerificationPath: null,
    nextGate: {
      currentBlockingGate: null,
      owner: null,
      externalActionRequired: false,
      externalAction: null,
      nextAction: "No remaining Recall daily sync completion gate.",
    },
  };
}

function auditDocFixture({ statusLine = "Status: Current-state audit, goal not complete" } = {}) {
  return `# Recall Daily Sync Goal Completion Audit

Date: 2026-06-27 08:25:25 IST
Owner: Codex
${statusLine}

The full goal is not complete yet.
The local-private-gate blocker is fixed for the current second-manual production path.
Broad pre-live now carries nextGate.localGateResolution proof.

| Requirement | Current State |
| --- | --- |
| Second manual production verification apply | Done |
| At least two distinct clean manual runs before scheduler | Done |
| Scheduler enablement evidence recorded | Not done |
| Daily scheduler enabled and first run verified | Not done |

- currentBlockingGate: scheduler_enablement
- activeBlockedRequirement: scheduler_enablement
- second manual apply report: data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json
- liveWriteAttempted: true
- manualCleanRunReadiness.cleanRunCount >= 2
- data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json
- data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json
- data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json
- manualCleanRunReadiness.needsSecondManualVerificationRun: false
- manualCleanRunReadiness.schedulerEnablementApprovalAllowedByManualRunEvidence: true
- npm run recall:scheduler-enable:command
- npm run recall:scheduler-evidence:command
- ready_for_exact_scheduler_approval
- nextGate.localGateResolution.preApplyProgress.selectedReports.timestamp: 2026-06-26_21-58-57_IST
- nextGate.localGateResolution.preApplyProgress.deployedLatestReports.selectedMatchesRemoteLatest: true
- nextGate.localGateResolution.staleFirstApplyApprovalProgress.blockingFindingIds: stale_first_apply_approval
- nextGate.localGateResolution.staleFirstApplyApprovalProgress.localPrivateGatesSkippedForProductionPath: true
- nextGate.localGateResolution.staleFirstApplyApprovalProgress.remotePreflightStatus: ready_for_second_manual_remote_runtime_preflight
- nextGate.localGateResolution.staleFirstApplyApprovalProgress.deployedLatestReports.selectedMatchesRemoteLatest: true
- npm run recall:scheduler-enable-evidence:record
- npm run check:recall-scheduler-enable-evidence
- BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL
- The first capped apply approval is already spent

This audit document was updated after the extra approved manual verification run; the follow-up audit/checker updates made no additional live Recall call.
This audit includes no Recall API key or secret value.
`;
}

function finalAuditDocFixture() {
  return `# Recall Daily Sync Goal Completion Audit

Date: 2026-06-28 01:40:12 IST
Owner: Codex
Status: Final audit, goal complete

The full Recall daily-sync goal is complete.

- completionAchieved: true
- status: complete
- currentBlockingGate: null
- activeBlockedRequirement: null
- Scheduler enablement evidence recorded | Done
- Daily scheduler enabled and first run verified | Done
- PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION
- data/private/recall-live-spikes/scheduler-enable-evidence.json
- data/private/recall-live-spikes/scheduler-system-state-20260627T200306Z.json
- data/private/recall-live-spikes/scheduled-apply-20260627T200306Z.json
- brain-recall-sync.timer
- timer.enabled: true
- timer.active: true
- service.lastRunOk: true
- service.lastRunExitCode: 0
- manualCleanRunReadiness.cleanRunCount: 7
- Manual clean runs before enablement: \`6\`
- No remaining Recall daily-sync completion gate is open.
- No manual service start was used as first-run proof

This audit includes no Recall API key or secret value.
`;
}

function writeJson(name, value) {
  return writeFile(name, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(name, value) {
  const path = join(scratch, name);
  writeFileSync(path, value, "utf8");
  return path;
}

function assertNoSecret(value, label) {
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
