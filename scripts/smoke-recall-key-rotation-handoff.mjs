#!/usr/bin/env node
import { chmodSync, mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const checkpoint = "2026-06-24T15:54:17.000Z";
const staleEnv = `data/private/recall-live-spikes/smoke-key-rotation-handoff-stale-${process.pid}.env`;
const freshEnv = `data/private/recall-live-spikes/smoke-key-rotation-handoff-fresh-${process.pid}.env`;
const staleEvidence = `data/private/recall-live-spikes/smoke-key-rotation-handoff-stale-${process.pid}.json`;
const freshEvidence = `data/private/recall-live-spikes/smoke-key-rotation-handoff-fresh-${process.pid}.json`;
const liveDiagnosticReport = `data/private/recall-live-spikes/smoke-key-rotation-handoff-live-diagnostic-${process.pid}.json`;
const completedApplyReport = `data/private/recall-live-spikes/smoke-key-rotation-handoff-completed-apply-${process.pid}.json`;

try {
  writeEnv(staleEnv);
  writeEnv(freshEnv);
  writeEvidence(staleEvidence, staleEnv, "2026-06-24T15:00:00.000Z");
  writeEvidence(freshEvidence, staleEnv, "2026-06-24T16:00:00.000Z");
  writeLiveDiagnosticReport(liveDiagnosticReport);
  writeCompletedApplyReport(completedApplyReport);
  const staleDate = new Date("2026-06-24T15:00:00.000Z");
  const freshDate = new Date("2026-06-24T16:00:00.000Z");
  utimesSync(staleEnv, staleDate, staleDate);
  utimesSync(freshEnv, freshDate, freshDate);
  utimesSync(staleEvidence, staleDate, staleDate);
  utimesSync(freshEvidence, freshDate, freshDate);

  const blocked = runHandoff(["--json", "--skip-status", "--env-file", staleEnv, "--evidence-file", staleEvidence]);
  assert(blocked.status === 0, "blocked handoff should exit 0");
  const blockedJson = JSON.parse(blocked.stdout);
  assert(blockedJson.noLiveNoWrite === true, "blocked handoff should be no-live/no-write");
  assert(blockedJson.currentGate.keyRotationEvidenceOk === false, "blocked handoff should report failed key evidence");
  assert(
    blockedJson.currentGate.failedRules.includes("env_file_not_rotated_after_checkpoint"),
    "blocked handoff should name stale env mtime",
  );
  assert(
    blockedJson.currentGate.failedRules.includes("key_rotation_evidence_file_not_after_checkpoint") ||
      blockedJson.currentGate.failedRules.includes("key_rotation_evidence_created_before_checkpoint"),
    "blocked handoff should name stale private evidence",
  );
  assert(
    blockedJson.commands.realPrepareAfterRotation.includes("BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1"),
    "blocked handoff should include guarded prepare command",
  );
  assert(
    blockedJson.commands.writeRotatedPrivateEnv.includes("recall:key-rotation:write-env") &&
      blockedJson.commands.writeRotatedPrivateEnv.includes("--replace-existing"),
    "blocked handoff should include the rotated private env writer command",
  );
  const storeStep = blockedJson.checklist.find((item) => item.id === "store_rotated_key_privately");
  const writeStep = blockedJson.checklist.find((item) => item.id === "write_rotated_key_with_helper");
  assert(
    storeStep?.action?.includes("preferred storage is the next helper command") &&
      storeStep?.action?.includes("Manual editing is fallback-only"),
    "blocked handoff should make manual env editing fallback-only",
  );
  assert(
    writeStep?.action?.includes("Preferred local storage helper") &&
      writeStep?.action?.includes("does not run the live Recall API"),
    "blocked handoff should describe the helper as no-live local storage",
  );
  assert(
    blockedJson.blockedUntilKeyEvidencePasses.includes("first_capped_apply") &&
      blockedJson.blockedUntilKeyEvidencePasses.includes("production_deploy") &&
      blockedJson.blockedUntilKeyEvidencePasses.includes("scheduler_enablement"),
    "blocked handoff should list blocked write/deploy/scheduler actions",
  );
  assertNoSecret(blocked.stdout, "blocked JSON handoff");

  const blockedWithStatus = runHandoff([
    "--json",
    "--env-file",
    staleEnv,
    "--evidence-file",
    staleEvidence,
    "--live-diagnostic-report",
    liveDiagnosticReport,
    "--skip-completed-apply-check",
  ]);
  assert(blockedWithStatus.status === 0, "blocked handoff with status should exit 0");
  const blockedWithStatusJson = JSON.parse(blockedWithStatus.stdout);
  const readOnlyDiagnostic = blockedWithStatusJson.currentGate.readOnlyLiveDiagnostic;
  assert(readOnlyDiagnostic?.status === "read_only_live_diagnostic_already_succeeded", "handoff should surface prior read-only live diagnostic success");
  assert(readOnlyDiagnostic?.existingPrivateProofOk === true, "handoff should mark the private diagnostic proof as passing");
  assert(readOnlyDiagnostic?.proof?.liveAuthProbe?.httpStatus === 200, "handoff should summarize the read-only HTTP status");
  assert(readOnlyDiagnostic?.proof?.liveAuthProbe?.authenticated === true, "handoff should summarize read-only authentication");
  assert(
    readOnlyDiagnostic?.proof?.doesNotAuthorize?.includes("apply") &&
      readOnlyDiagnostic?.proof?.doesNotAuthorize?.includes("scheduler"),
    "handoff should keep the live diagnostic separate from write/deploy/scheduler permission",
  );
  assert(
    blockedWithStatusJson.currentGate.firstApplyStatus.blockedActions.includes("first_capped_apply"),
    "first-write actions should remain blocked while read-only diagnostic proof is surfaced",
  );
  assertNoSecret(blockedWithStatus.stdout, "blocked JSON handoff with read-only diagnostic");

  const completedWithStatus = runHandoff([
    "--json",
    "--env-file",
    freshEnv,
    "--evidence-file",
    freshEvidence,
    "--completed-apply-report",
    completedApplyReport,
  ]);
  assert(completedWithStatus.status === 0, "completed handoff with status should exit 0");
  const completedWithStatusJson = JSON.parse(completedWithStatus.stdout);
  assert(
    completedWithStatusJson.currentPhase === "first_apply_completed" &&
      completedWithStatusJson.currentGate.status === "first_capped_apply_completed" &&
      completedWithStatusJson.currentGate.firstApplyCompleted === true,
    "completed handoff should surface completed first-apply phase",
  );
  assert(
    completedWithStatusJson.requiredExternalAction?.action ===
      "approve_second_manual_verification_run_before_scheduler_enablement",
    "completed handoff should point at second manual verification approval",
  );
  assert(
    completedWithStatusJson.checklist.some((item) => item.id === "run_second_manual_readiness") &&
      completedWithStatusJson.commands.secondManualReadiness === "npm run recall:second-manual:readiness",
    "completed handoff should include second-manual readiness",
  );
  assert(
    completedWithStatusJson.checklist.some((item) => item.id === "print_second_manual_production_command") &&
      completedWithStatusJson.commands.secondManualProductionCommand === "npm run recall:second-manual:production-command",
    "completed handoff should include the no-live second-manual production command handoff",
  );
  assert(
    completedWithStatusJson.blockedUntilCurrentApproval.includes("second_manual_verification") &&
      completedWithStatusJson.blockedUntilCurrentApproval.includes("scheduler_enablement") &&
      completedWithStatusJson.blockedUntilCurrentApproval.includes("checkpoint_advancement"),
    "completed handoff should keep second manual, scheduler, and checkpoint blocked",
  );
  assertNoSecret(completedWithStatus.stdout, "completed JSON handoff with status");

  const markdown = runHandoff(["--skip-status", "--env-file", staleEnv, "--evidence-file", staleEvidence]);
  assert(markdown.status === 0, "markdown handoff should exit 0");
  assert(markdown.stdout.includes("# Recall Key Rotation Handoff"), "markdown handoff should include title");
  assert(markdown.stdout.includes("## Blocked Until Key Evidence Passes"), "markdown should include blocked section");
  assert(markdown.stdout.includes("npm run recall:key-rotation:write-env"), "markdown should include rotated env writer command");
  assert(markdown.stdout.includes("Manual editing is fallback-only"), "markdown should demote manual env editing to fallback-only");
  assert(markdown.stdout.includes("npm run check:recall-key-rotation-evidence"), "markdown should include key evidence command");
  assertNoSecret(markdown.stdout, "markdown handoff");

  const fresh = runHandoff(["--json", "--skip-status", "--env-file", freshEnv, "--evidence-file", freshEvidence]);
  assert(fresh.status === 0, "fresh handoff should exit 0");
  const freshJson = JSON.parse(fresh.stdout);
  assert(freshJson.currentGate.keyRotationEvidenceOk === true, "fresh handoff should report passing key evidence");
  assert(freshJson.currentGate.failedRules.length === 0, "fresh handoff should have no failed rules");
  assertNoSecret(fresh.stdout, "fresh JSON handoff");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "blocked key-rotation handoff exits 0 and names stale key-rotation evidence gates",
          "blocked handoff surfaces prior read-only live diagnostic proof separately from first-write permission",
          "completed handoff surfaces second manual verification as the current approval gate",
          "completed handoff includes the no-live second manual production command handoff",
          "handoff includes rotated private env writer command",
          "handoff makes manual private env editing fallback-only behind the helper",
          "markdown handoff includes operator checklist and blocked-action section",
          "fresh key-rotation metadata reports passing evidence",
          "handoff output does not print env file contents or secret-shaped values",
          "smoke uses no live Recall API call",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(staleEnv, { force: true });
  rmSync(freshEnv, { force: true });
  rmSync(staleEvidence, { force: true });
  rmSync(freshEvidence, { force: true });
  rmSync(liveDiagnosticReport, { force: true });
  rmSync(completedApplyReport, { force: true });
}

function writeEnv(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=0\n", "utf8");
  chmodSync(path, 0o600);
}

function writeEvidence(path, envFile, createdAtIso) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        createdAtIso,
        envFile,
        minRotatedAfterIso: checkpoint,
        ackPhraseAccepted: true,
        liveAuthProbe: {
          ok: true,
          httpStatus: 200,
          authenticated: true,
          reachable: true,
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
}

function writeLiveDiagnosticReport(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ok: true,
        mode: "first_apply_live_read_diagnostic",
        statusBeforeProbe: {
          status: "blocked_key_rotation_evidence",
          failedChecks: ["key_rotation_evidence", "dry_run_report_proof", "backup_proof"],
          firstWriteSafety: {
            proofRefreshAllowedNow: false,
            applyAllowedNow: false,
          },
        },
        firstWriteSafety: {
          proofRefreshAllowedNow: false,
          applyAllowedNow: false,
        },
        diagnosticOutputFile: {
          path,
          written: true,
          mode: "0600",
          privateRoot: "data/private/recall-live-spikes",
        },
        liveAuthProbe: {
          ok: true,
          endpoint: "/cards",
          method: "GET",
          dateWindow: {
            dateFrom: "2100-01-01T00:00:00.000Z",
            dateTo: "2100-01-02T00:00:00.000Z",
          },
          envFile: {
            loaded: true,
            path: staleEnv,
            fileSafety: {
              safe: true,
            },
          },
          firstWriteSafety: {
            purpose: "diagnostic_context_only",
            keyRotationEvidenceGateRun: false,
            proofRefreshAllowedByThisProbe: false,
            applyAllowedByThisProbe: false,
          },
          result: {
            httpStatus: 200,
            authenticated: true,
            reachable: true,
            responseHadResultsArray: true,
            totalCount: 0,
            resultCount: 0,
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
}

function writeCompletedApplyReport(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        mode: "apply",
        state: "done",
        exitCode: 0,
        errorName: null,
        lastError: null,
        dateFrom: "2026-06-16T00:00:00.000Z",
        dateTo: "2026-06-16T23:59:59.999Z",
        cardsSeen: 2,
        cardsAvailable: 2,
        enumerationComplete: true,
        cardsImported: 2,
        cardsUpgraded: 0,
        cardsSkipped: 0,
        cardsChangedRemote: 0,
        cardsBlocked: 0,
        cardsPlannedForImport: 2,
        totalCharsPlanned: 1200,
        totalChunksFetched: 2,
        fidelityCounts: {
          complete_enough_for_daily_import: 2,
        },
        policyBlockCounts: {},
        policyBlockReasons: [],
        plannedActionCounts: {
          imported: 2,
        },
        checkpointAdvanced: true,
        lockAcquired: true,
        staleLockRecovered: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
}

function runHandoff(extraArgs) {
  return spawnSync(process.execPath, ["--", "scripts/print-recall-key-rotation-handoff.mjs", ...extraArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function assertNoSecret(text, label) {
  assert(!/\bRECALL_API_KEY\s*=/.test(text), `${label} should not print env assignments`);
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(text), `${label} should not print sk-shaped secrets`);
  assert(!/\bBearer\s+[A-Za-z0-9._-]{12,}/i.test(text), `${label} should not print bearer tokens`);
  assert(!/redacted-test-value/.test(text), `${label} should not print test env values`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
