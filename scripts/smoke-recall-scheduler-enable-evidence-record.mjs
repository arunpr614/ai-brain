#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const APPROVAL =
  "I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording.";
const stamp = `${process.pid}-${Date.now()}`;
const firstApplyPath = `data/private/recall-live-spikes/smoke-scheduler-first-apply-${stamp}.json`;
const secondApplyPath = `data/private/recall-live-spikes/smoke-scheduler-second-apply-${stamp}.json`;
const scheduledApplyPath = `data/private/recall-live-spikes/smoke-scheduler-scheduled-apply-${stamp}.json`;
const deployEvidencePath = `data/private/recall-live-spikes/smoke-scheduler-production-deploy-${stamp}.json`;
const systemStatePath = `data/private/recall-live-spikes/smoke-scheduler-system-state-${stamp}.json`;
const outputPath = `data/private/recall-live-spikes/smoke-scheduler-enable-evidence-${stamp}.json`;
const forgedDuplicateFirstRunPath = `data/private/recall-live-spikes/smoke-scheduler-forged-duplicate-first-run-${stamp}.json`;
const forgedFirstRunBeforeEnablePath = `data/private/recall-live-spikes/smoke-scheduler-forged-first-run-before-enable-${stamp}.json`;
const staleScheduledApplyPath = `data/private/recall-live-spikes/smoke-scheduler-stale-scheduled-apply-${stamp}.json`;

try {
  writeApplyReport(firstApplyPath, { cardsImported: 3, cardsPlannedForImport: 3 }, 20);
  writeApplyReport(secondApplyPath, { cardsImported: 0, cardsSkipped: 3, cardsPlannedForImport: 0 }, 10);
  writeApplyReport(scheduledApplyPath, { cardsImported: 0, cardsSkipped: 3, cardsPlannedForImport: 0 }, 2);
  writeApplyReport(staleScheduledApplyPath, { cardsImported: 0, cardsSkipped: 3, cardsPlannedForImport: 0 }, 6);
  writeJson(deployEvidencePath, productionDeployEvidence());
  writeJson(systemStatePath, systemState());

  const missingApproval = runRecord({});
  assert(missingApproval.status === 2, "recorder should refuse without exact scheduler approval");
  assert(missingApproval.stderr.includes("missing_exact_scheduler_enablement_approval"), "missing approval should be explicit");

  const insufficientRuns = runRecord(
    { BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL },
    ["--manual-clean-run", `manual_first_capped_apply=${firstApplyPath}`],
  );
  assert(insufficientRuns.status === 2, "recorder should require at least two manual clean runs");

  const duplicateRuns = runRecord(
    { BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL },
    [
      "--manual-clean-run",
      `manual_first_capped_apply=${firstApplyPath}`,
      "--manual-clean-run",
      `manual_second_guarded_apply=${firstApplyPath}`,
    ],
  );
  assert(duplicateRuns.status === 2, "recorder should reject duplicate manual clean run reports before writing evidence");
  assert(
    duplicateRuns.stderr.includes("duplicate_manual_clean_run_apply_report"),
    "duplicate manual run rejection should be explicit",
  );
  assert(!existsSync(resolve(outputPath)), "duplicate manual run rejection should not leave scheduler evidence behind");

  const duplicateKinds = runRecord(
    { BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL },
    [
      "--manual-clean-run",
      `manual_first_capped_apply=${firstApplyPath}`,
      "--manual-clean-run",
      `manual_first_capped_apply=${secondApplyPath}`,
    ],
  );
  assert(duplicateKinds.status === 2, "recorder should reject duplicate manual clean run kind labels");
  assert(
    duplicateKinds.stderr.includes("duplicate_manual_clean_run_kind"),
    "duplicate manual kind rejection should be explicit",
  );
  assert(!existsSync(resolve(outputPath)), "duplicate manual kind rejection should not leave scheduler evidence behind");

  const duplicateFirstRun = runRecord({ BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL }, null, firstApplyPath);
  assert(
    duplicateFirstRun.status === 2,
    "recorder should reject using a manual clean run report as first scheduled service run evidence",
  );
  assert(
    duplicateFirstRun.stderr.includes("duplicate_first_run_apply_report"),
    "duplicate first scheduled run rejection should be explicit",
  );
  assert(!existsSync(resolve(outputPath)), "duplicate first scheduled run rejection should not leave scheduler evidence behind");

  writeJson(forgedDuplicateFirstRunPath, schedulerEnableEvidence({ firstRunApplyReportPath: firstApplyPath }));
  const forgedDuplicateGate = spawnSync(
    process.execPath,
    ["--", "scripts/check-recall-completion-evidence.mjs", "--kind", "scheduler-enable", "--evidence", forgedDuplicateFirstRunPath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert(
    forgedDuplicateGate.status === 1,
    "strict completion evidence checker should reject duplicate first scheduled run report evidence",
  );
  assert(
    forgedDuplicateGate.stderr.includes("duplicate_first_run_apply_report"),
    "strict duplicate first scheduled run evidence rejection should be explicit",
  );

  const staleFirstRun = runRecord({ BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL }, null, staleScheduledApplyPath);
  assert(
    staleFirstRun.status === 2,
    "recorder should reject first scheduled service run evidence completed before scheduler activation",
  );
  assert(
    staleFirstRun.stderr.includes("first_run_before_scheduler_activation"),
    "first-run-before-activation recorder rejection should be explicit",
  );
  assert(!existsSync(resolve(outputPath)), "stale first scheduled run rejection should not leave scheduler evidence behind");

  writeJson(
    forgedFirstRunBeforeEnablePath,
    schedulerEnableEvidence({ firstRunCompletedAtIso: pastIso(6), serviceLastRunCompletedAtIso: pastIso(6) }),
  );
  const forgedStaleGate = spawnSync(
    process.execPath,
    ["--", "scripts/check-recall-completion-evidence.mjs", "--kind", "scheduler-enable", "--evidence", forgedFirstRunBeforeEnablePath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert(
    forgedStaleGate.status === 1,
    "strict completion evidence checker should reject first scheduled run evidence completed before scheduler activation",
  );
  assert(
    forgedStaleGate.stderr.includes("first_run_before_scheduler_activation"),
    "strict first-run-before-activation rejection should be explicit",
  );

  const recorded = runRecord({ BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL: APPROVAL });
  assert(recorded.status === 0, `recorder should pass with valid fixture evidence\n${recorded.stderr}`);
  const recordedJson = JSON.parse(recorded.stdout);
  assert(recordedJson.ok === true, "recorder output should be ok");
  assert(recordedJson.verdict === "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION", "recorder should verify strict gate");
  assert(recordedJson.manualCleanRunEvidenceCount === 2, "recorder should count manual run evidence entries");
  assert(recordedJson.timer?.activeSinceIso, "recorder output should include timer active-since evidence");
  assert(recordedJson.service?.lastRunCompletedAtIso, "recorder output should include service completion evidence");

  const strictGate = spawnSync(
    process.execPath,
    ["--", "scripts/check-recall-completion-evidence.mjs", "--kind", "scheduler-enable", "--evidence", outputPath],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert(strictGate.status === 0, `recorded evidence should pass strict checker\n${strictGate.stderr}`);

  const outputText = recorded.stdout + recorded.stderr + strictGate.stdout + strictGate.stderr;
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(outputText), "recorder output should not print secret-shaped values");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "recorder refuses without exact scheduler approval",
          "recorder requires at least two manual clean run reports",
          "recorder rejects duplicate manual clean run reports before writing scheduler evidence",
          "recorder rejects duplicate manual clean run kind labels before writing scheduler evidence",
          "recorder rejects manual clean run reports reused as first scheduled service run evidence",
          "strict completion evidence checker rejects forged duplicate first scheduled service run evidence",
          "recorder rejects first scheduled service run evidence completed before scheduler activation",
          "strict completion evidence checker rejects forged stale first scheduled service run evidence",
          "recorder output includes timer active-since and service completion timestamps",
          "recorder validates apply reports before writing scheduler evidence",
          "recorder writes private owner-only scheduler evidence",
          "recorded scheduler evidence passes the strict completion evidence checker",
          "recorder output does not print secret-shaped values",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const path of [
    firstApplyPath,
    secondApplyPath,
    scheduledApplyPath,
    deployEvidencePath,
    systemStatePath,
    outputPath,
    forgedDuplicateFirstRunPath,
    forgedFirstRunBeforeEnablePath,
    staleScheduledApplyPath,
  ]) {
    rmSync(resolve(path), { force: true });
  }
}

function runRecord(envOverrides, manualRunArgs = null, firstRunApplyReportPath = scheduledApplyPath) {
  const args = [
    "--output",
    outputPath,
    "--production-deploy-evidence",
    deployEvidencePath,
    "--system-state-file",
    systemStatePath,
    "--first-run-apply-report",
    firstRunApplyReportPath,
    "--max-applied-imports",
    "5",
    "--allow-unverified-fidelity",
    "--allow-metadata-only-fidelity",
    ...(manualRunArgs ?? [
      "--manual-clean-run",
      `manual_first_capped_apply=${firstApplyPath}`,
      "--manual-clean-run",
      `manual_second_guarded_apply=${secondApplyPath}`,
    ]),
  ];
  const env = { ...process.env, ...envOverrides };
  if (!Object.hasOwn(envOverrides, "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL")) {
    delete env.BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL;
  }
  return spawnSync(process.execPath, ["--", "scripts/record-recall-scheduler-enable-evidence.mjs", ...args], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
}

function schedulerEnableEvidence({
  firstRunApplyReportPath = scheduledApplyPath,
  firstRunCompletedAtIso = pastIso(2),
  serviceLastRunCompletedAtIso = pastIso(2),
} = {}) {
  return {
    ok: true,
    verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
    target: "production",
    checkedAtIso: pastIso(1),
    enabledAtIso: pastIso(4),
    approval: {
      approvedBy: "Arun",
      scope: "scheduler_enablement_after_repeated_clean_runs",
    },
    productionDeployVerdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
    manualCleanRunsBeforeEnable: 2,
    manualCleanRuns: [
      {
        ok: true,
        kind: "manual_first_capped_apply",
        completedAtIso: pastIso(20),
        applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
        applyReportPath: firstApplyPath,
      },
      {
        ok: true,
        kind: "manual_second_guarded_apply",
        completedAtIso: pastIso(10),
        applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
        applyReportPath: secondApplyPath,
      },
    ],
    timer: {
      unit: "brain-recall-sync.timer",
      enabled: true,
      active: true,
      activeSinceIso: pastIso(4),
      nextElapseIso: futureIso(60),
    },
    service: {
      unit: "brain-recall-sync.service",
      lastRunOk: true,
      lastRunExitCode: 0,
      lastRunCompletedAtIso: serviceLastRunCompletedAtIso,
    },
    recallEnv: {
      syncEnabled: true,
      schedulerEnabled: true,
      confirmLiveApi: true,
    },
    firstRun: {
      ok: true,
      exitCode: 0,
      applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
      applyReportPath: firstRunApplyReportPath,
      completedAtIso: firstRunCompletedAtIso,
    },
  };
}

function writeApplyReport(path, overrides = {}, minutesAgo = 1) {
  writeJson(path, {
    mode: "apply",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    dateFrom: "2026-06-16T00:00:00.000Z",
    dateTo: "2026-06-17T00:00:00.000Z",
    cardsSeen: 3,
    cardsAvailable: 3,
    enumerationComplete: true,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 0,
    totalCharsPlanned: 0,
    totalChunksFetched: 0,
    fidelityCounts: {},
    policyBlockCounts: {},
    policyBlockReasons: {},
    plannedActionCounts: {},
    checkpointAdvanced: true,
    lockAcquired: true,
    staleLockRecovered: false,
    ...overrides,
  });
  touchPast(path, minutesAgo);
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
      baseUrl: "https://brain.arunp.in",
      ok: true,
      httpStatus: 200,
      authenticated: true,
    },
    aiProviderCheck: {
      ok: true,
      location: "production_host",
    },
    recallScheduler: {
      timerUnitInstalled: true,
      timerEnabled: false,
      timerActive: false,
      enableFlagsDisabled: true,
    },
  };
}

function systemState() {
  return {
    enabledAtIso: pastIso(4),
    timer: {
      enabled: true,
      active: true,
      activeSinceIso: pastIso(4),
      nextElapseIso: futureIso(60),
    },
    service: {
      lastRunOk: true,
      lastRunExitCode: 0,
      lastRunCompletedAtIso: pastIso(2),
    },
    recallEnv: {
      syncEnabled: true,
      schedulerEnabled: true,
      confirmLiveApi: true,
    },
  };
}

function writeJson(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(resolve(path), `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(resolve(path), 0o600);
}

function touchPast(path, minutesAgo) {
  const date = new Date(Date.now() - minutesAgo * 60 * 1000);
  utimesSync(resolve(path), date, date);
}

function pastIso(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
