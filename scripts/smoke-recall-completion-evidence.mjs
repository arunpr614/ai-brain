#!/usr/bin/env node
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const scratch = mkdtempSync(join(tmpdir(), "recall-completion-evidence-"));

try {
  const deployPath = writeEvidence("deploy.json", productionDeployEvidence());
  const schedulerPath = writeEvidence("scheduler.json", schedulerEnableEvidence());
  expectPass(["--kind", "production-deploy", "--evidence", deployPath, "--allow-non-private-evidence", "--skip-ignore-check"]);
  expectPass(["--kind", "scheduler-enable", "--evidence", schedulerPath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const looseDeployPath = writeEvidence("loose-deploy.json", {
    ok: true,
    verdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION",
  });
  expectFail(["--kind", "production-deploy", "--evidence", looseDeployPath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const timerEnabledPath = writeEvidence(
    "timer-enabled-deploy.json",
    productionDeployEvidence({
      recallScheduler: {
        timerUnitInstalled: true,
        timerEnabled: true,
        timerActive: false,
        enableFlagsDisabled: true,
      },
    }),
  );
  expectFail(["--kind", "production-deploy", "--evidence", timerEnabledPath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const insufficientRunsPath = writeEvidence(
    "insufficient-runs.json",
    schedulerEnableEvidence({ manualCleanRunsBeforeEnable: 1 }),
  );
  expectFail(["--kind", "scheduler-enable", "--evidence", insufficientRunsPath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const missingRunEvidencePath = writeEvidence("missing-run-evidence.json", {
    ...schedulerEnableEvidence(),
    manualCleanRuns: undefined,
  });
  expectFail([
    "--kind",
    "scheduler-enable",
    "--evidence",
    missingRunEvidencePath,
    "--allow-non-private-evidence",
    "--skip-ignore-check",
  ]);

  const duplicateRunEvidencePath = writeEvidence("duplicate-run-evidence.json", {
    ...schedulerEnableEvidence(),
    manualCleanRuns: [
      manualCleanRun("manual_first_capped_apply", "data/private/recall-live-spikes/first-apply-report.json", 60),
      manualCleanRun("manual_second_guarded_apply", "data/private/recall-live-spikes/first-apply-report.json", 30),
    ],
  });
  expectFail([
    "--kind",
    "scheduler-enable",
    "--evidence",
    duplicateRunEvidencePath,
    "--allow-non-private-evidence",
    "--skip-ignore-check",
  ]);

  const firstRunBeforeEnablePath = writeEvidence(
    "first-run-before-enable.json",
    schedulerEnableEvidence({
      firstRun: {
        ...schedulerEnableEvidence().firstRun,
        completedAtIso: pastIso(12),
      },
      service: {
        ...schedulerEnableEvidence().service,
        lastRunCompletedAtIso: pastIso(12),
      },
    }),
  );
  expectFail([
    "--kind",
    "scheduler-enable",
    "--evidence",
    firstRunBeforeEnablePath,
    "--allow-non-private-evidence",
    "--skip-ignore-check",
  ]);

  const secretPath = writeEvidence("secret.json", {
    ...productionDeployEvidence(),
    note: "Bearer sk_secretshouldnotleak12345",
  });
  const secretFailure = expectFail([
    "--kind",
    "production-deploy",
    "--evidence",
    secretPath,
    "--allow-non-private-evidence",
    "--skip-ignore-check",
  ]);
  assert(!secretFailure.stderr.includes("sk_secretshouldnotleak12345"), "secret-shaped failure output must be redacted");

  const rawPayloadPath = writeEvidence("raw-payload.json", {
    ...schedulerEnableEvidence(),
    firstRun: {
      ...schedulerEnableEvidence().firstRun,
      title: "private title should not be here",
    },
  });
  expectFail(["--kind", "scheduler-enable", "--evidence", rawPayloadPath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const futurePath = writeEvidence("future.json", {
    ...productionDeployEvidence(),
    checkedAtIso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  expectFail(["--kind", "production-deploy", "--evidence", futurePath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  const insecurePath = writeEvidence("insecure.json", productionDeployEvidence());
  chmodSync(insecurePath, 0o644);
  expectFail(["--kind", "production-deploy", "--evidence", insecurePath, "--allow-non-private-evidence", "--skip-ignore-check"]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "production deploy evidence passes with strict shape",
          "scheduler enablement evidence passes with strict shape",
          "loose verdict-only deploy evidence fails",
          "deploy evidence with enabled timer before scheduler fails",
          "scheduler evidence with insufficient manual clean runs fails",
          "scheduler evidence without manual clean run report evidence fails",
          "scheduler evidence with duplicate manual clean run reports fails",
          "scheduler evidence with first scheduled run before enablement fails",
          "secret-shaped evidence fails with redacted output",
          "raw private payload keys fail",
          "future-dated evidence fails",
          "group-readable evidence fails",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function productionDeployEvidence(overrides = {}) {
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
    ...overrides,
  };
}

function schedulerEnableEvidence(overrides = {}) {
  return {
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
    ...overrides,
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

function writeEvidence(name, value) {
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

function expectPass(args) {
  const result = run(args);
  if (result.status !== 0) throw new Error(`Expected pass, got ${result.status}: ${result.stderr || result.stdout}`);
  return result;
}

function expectFail(args) {
  const result = run(args);
  if (result.status === 0) throw new Error(`Expected failure, got pass: ${result.stdout}`);
  return result;
}

function run(args) {
  return spawnSync(process.execPath, ["scripts/check-recall-completion-evidence.mjs", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
