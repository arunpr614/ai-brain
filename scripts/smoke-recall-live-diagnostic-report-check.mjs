#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const privateSmokeDir = join("data/private/recall-live-spikes", `live-diagnostic-report-check-smoke-${process.pid}`);
const scratch = mkdtempSync(join(tmpdir(), "recall-live-diagnostic-report-check-"));

try {
  const goodPath = writePrivateReport("good.json", baseReport());
  expectPass([goodPath]);

  const postRotationReadyReport = baseReport();
  postRotationReadyReport.statusBeforeProbe = {
    ...postRotationReadyReport.statusBeforeProbe,
    ok: true,
    status: "ready_for_first_capped_apply_approval",
    keyRotationEvidenceOk: true,
    failedChecks: [],
    firstWriteSafety: {
      ...postRotationReadyReport.statusBeforeProbe.firstWriteSafety,
      blockedBeforeProofRefreshOrApply: false,
      applyAllowedNow: true,
    },
  };
  postRotationReadyReport.firstWriteSafety = {
    ...postRotationReadyReport.firstWriteSafety,
    blockedBeforeProofRefreshOrApply: false,
    applyAllowedNow: true,
  };
  const postRotationReadyPath = writePrivateReport("post-rotation-ready.json", postRotationReadyReport);
  expectPass([postRotationReadyPath]);

  const nonPrivatePath = join(scratch, "non-private.json");
  writeReport(nonPrivatePath, baseReport());
  expectFail([nonPrivatePath]);
  expectPass([nonPrivatePath, "--allow-non-private-report", "--allow-non-owner-only-mode", "--skip-ignore-check"]);

  const secretPath = writePrivateReport(
    "secret.json",
    baseReport({
      liveAuthProbe: {
        ...baseReport().liveAuthProbe,
        message: "Bearer sk_secret_live_diagnostic_report_should_fail_12345",
      },
    }),
  );
  expectFail([secretPath]);

  const payloadPath = writePrivateReport(
    "payload.json",
    baseReport({
      liveAuthProbe: {
        ...baseReport().liveAuthProbe,
        result: {
          ...baseReport().liveAuthProbe.result,
          results: [{ title: "Private title must not be in this report" }],
        },
      },
    }),
  );
  expectFail([payloadPath]);

  const writeGrantPath = writePrivateReport(
    "write-grant.json",
    baseReport({
      liveAuthProbe: {
        ...baseReport().liveAuthProbe,
        firstWriteSafety: {
          ...baseReport().liveAuthProbe.firstWriteSafety,
          applyAllowedByThisProbe: true,
        },
      },
    }),
  );
  expectFail([writeGrantPath]);

  const wrongModePath = writePrivateReport("wrong-mode.json", baseReport({ mode: "dry_run" }));
  expectFail([wrongModePath]);

  const wrongStatusReport = baseReport();
  wrongStatusReport.statusBeforeProbe = {
    ...wrongStatusReport.statusBeforeProbe,
    status: "first_write_already_ran",
  };
  const wrongStatusPath = writePrivateReport("wrong-status.json", wrongStatusReport);
  expectFail([wrongStatusPath]);

  const stalePath = writePrivateReport("stale.json", baseReport());
  const staleDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
  utimesSync(stalePath, staleDate, staleDate);
  expectFail([stalePath, "--max-age-minutes", "120"]);

  const futurePath = writePrivateReport("future.json", baseReport());
  const futureDate = new Date(Date.now() + 10 * 60 * 1000);
  utimesSync(futurePath, futureDate, futureDate);
  expectFail([futurePath]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "valid private live diagnostic report passes",
          "post-rotation first-write-readiness diagnostic report passes when the probe itself grants no write permission",
          "non-private report fails by default",
          "non-private fixture can be allowed only with explicit smoke flags",
          "secret-shaped values fail",
          "raw/private payload keys fail",
          "probe-level write permission claims fail",
          "wrong diagnostic mode fails",
          "unknown statusBeforeProbe state fails",
          "stale report fails when max age is requested",
          "future-dated report fails",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(privateSmokeDir, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
}

function baseReport(overrides = {}) {
  const report = {
    ok: true,
    mode: "first_apply_live_read_diagnostic",
    statusBeforeProbe: {
      ok: false,
      status: "blocked_key_rotation_evidence",
      keyRotationEvidenceOk: false,
      failedChecks: ["key_rotation_evidence", "dry_run_report_proof", "backup_proof"],
      firstWriteSafety: {
        keyRotationEvidenceRequired: true,
        blockedBeforeProofRefreshOrApply: true,
        proofRefreshAllowedNow: false,
        applyAllowedNow: false,
      },
    },
    liveReadConnectivity: {
      localGateReady: true,
      verdict: "ready_for_approved_live_spikes",
    },
    firstWriteSafety: {
      keyRotationEvidenceRequired: true,
      blockedBeforeProofRefreshOrApply: true,
      proofRefreshAllowedNow: false,
      applyAllowedNow: false,
    },
    probeCredential: {
      apiKeyEnv: "RECALL_API_KEY",
      envFileMode: "private_env_file",
      envFilePath: "data/private/recall-live-spikes/recall.env",
      processEnvKeyPresent: false,
      secretPrinted: false,
    },
    localPrivateGateHandling: {
      statusLiveGateReady: true,
      statusLiveGateVerdict: "ready_for_approved_live_spikes",
      statusOptionalNoWriteCommandAvailable: true,
      envFileDisabledProbeRequested: false,
      ephemeralProbeCredentialReady: false,
      bypassedLocalLiveGateForReadOnlyProbe: false,
    },
    diagnosticOutputFile: {
      path: "data/private/recall-live-spikes/live-diagnostic-report.json",
      written: true,
      mode: "0600",
      privateRoot: "data/private/recall-live-spikes",
    },
    liveAuthProbe: {
      ok: true,
      code: null,
      endpoint: "/cards",
      method: "GET",
      dateWindow: {
        dateFrom: "2100-01-01T00:00:00.000Z",
        dateTo: "2100-01-02T00:00:00.000Z",
      },
      envFile: {
        path: "data/private/recall-live-spikes/recall.env",
        loaded: true,
        loadedKeyCount: 2,
        fileSafety: {
          underPrivateRecallEvidencePath: true,
          ignored: true,
          tracked: false,
          mode: "600",
          securePermissions: true,
        },
      },
      firstWriteSafety: {
        purpose: "diagnostic_context_only",
        keyRotationEvidenceGateRun: false,
        keyRotatedAfterIso: "2026-06-24T15:54:17.000Z",
        envFilePath: "data/private/recall-live-spikes/recall.env",
        envFileLoaded: true,
        envFileMtimeIso: "2026-06-24T13:30:11.015Z",
        envFileMtimeAfterCheckpoint: false,
        proofRefreshAllowedByThisProbe: false,
        applyAllowedByThisProbe: false,
      },
      result: {
        httpStatus: 200,
        authenticated: true,
        reachable: true,
        durationMs: 123,
        totalCount: 0,
        resultCount: 0,
        responseHadResultsArray: true,
        requestId: null,
      },
    },
    safetyNotes: [
      "Passing this diagnostic does not satisfy key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.",
    ],
    nextGate:
      "If the live diagnostic passed, first-write work is still controlled by key rotation evidence, proof freshness, exact approval, and exact acknowledgement.",
    ...overrides,
  };
  return report;
}

function writePrivateReport(name, report) {
  return writeReport(join(privateSmokeDir, name), report);
}

function writeReport(path, report) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

function expectPass(args) {
  const result = run(args);
  if (result.status !== 0) {
    throw new Error(`Expected pass, got ${result.status}: ${result.stderr || result.stdout}`);
  }
}

function expectFail(args) {
  const result = run(args);
  if (result.status === 0) {
    throw new Error(`Expected failure, got pass: ${result.stdout}`);
  }
}

function run(args) {
  return spawnSync(process.execPath, ["--", resolve("scripts/check-recall-live-diagnostic-report.mjs"), ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}
