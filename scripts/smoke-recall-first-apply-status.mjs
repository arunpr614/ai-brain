#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";

const scratch = mkdtempSync(join(tmpdir(), "recall-first-apply-status-smoke-"));
const checkpoint = "2026-06-24T15:54:17.000Z";
const staleEnv = "data/private/recall-live-spikes/smoke-first-apply-status-stale.env";
const freshEnv = "data/private/recall-live-spikes/smoke-first-apply-status-fresh.env";
const diagnosticEnv = `data/private/recall-live-spikes/smoke-first-apply-status-diagnostic-${process.pid}.env`;
const diagnosticManifest = `data/private/recall-live-spikes/smoke-first-apply-status-diagnostic-${process.pid}.json`;
const promptDiagnosticOutputFile = `data/private/recall-live-spikes/smoke-first-apply-status-live-diagnostic-report-${process.pid}.json`;
const completedApplyReportPath = `data/private/recall-live-spikes/smoke-first-apply-status-completed-apply-${process.pid}.json`;
const promptDiagnosticCommand =
  `npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file ${promptDiagnosticOutputFile}`;
const diagnosticReportCheckCommand =
  `npm run check:recall-live-diagnostic-report -- --report ${promptDiagnosticOutputFile}`;

try {
  const enumeration = join(scratch, "SPIKE-013.md");
  const fidelity = join(scratch, "SPIKE-014.md");
  const manifest = join(scratch, "controlled-samples.json");
  const dryRunReport = join(scratch, "dry-run-report.json");
  const nearExpiryDryRunReport = join(scratch, "near-expiry-dry-run-report.json");
  const freshBackup = join(scratch, "fresh-backup.sqlite");
  const nearExpiryBackup = join(scratch, "near-expiry-backup.sqlite");

  writePrivateEnv(staleEnv);
  writePrivateEnv(freshEnv);
  writePrivateEnv(diagnosticEnv, { liveConfirmed: true });
  utimesSync(staleEnv, new Date("2026-06-24T15:00:00.000Z"), new Date("2026-06-24T15:00:00.000Z"));
  utimesSync(freshEnv, new Date("2026-06-24T16:00:00.000Z"), new Date("2026-06-24T16:00:00.000Z"));
  utimesSync(diagnosticEnv, new Date("2026-06-24T15:00:00.000Z"), new Date("2026-06-24T15:00:00.000Z"));
  writeManifest(manifest);
  writeManifest(diagnosticManifest);
  chmodSync(diagnosticManifest, 0o600);
  writeLiveDiagnosticReport(promptDiagnosticOutputFile, diagnosticEnv);
  writeReport(enumeration, "SPIKE-013", "CLEAR", enumerationEvidence());
  writeReport(fidelity, "SPIKE-014", "PROCEED-WITH-CHANGES", fidelityEvidence());
  writeFileSync(dryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeFileSync(nearExpiryDryRunReport, `${JSON.stringify(dryRunEvidence(), null, 2)}\n`, "utf8");
  writeSqliteBackup(freshBackup);
  writeSqliteBackup(nearExpiryBackup);
  chmodSync(freshBackup, 0o600);
  chmodSync(nearExpiryBackup, 0o600);
  writeCompletedApplyReport(completedApplyReportPath);
  const nearExpiryDate = new Date(Date.now() - 116 * 60 * 1000);
  utimesSync(nearExpiryBackup, nearExpiryDate, nearExpiryDate);
  utimesSync(nearExpiryDryRunReport, nearExpiryDate, nearExpiryDate);

  const staleKey = runStatus({ envFile: staleEnv, backupPath: freshBackup });
  assert(staleKey.status === 0, "status helper should exit 0 by default for blocker summaries");
  assertStatus(staleKey.stdout, "blocked_key_rotation_evidence");
  assert(staleKey.stdout.includes("npm run recall:first-apply:prepare-plan"), "stale key next command should name no-write prepare plan");
  assert(
    staleKey.stdout.includes("prefer the rotated-key private env writer") &&
      staleKey.stdout.includes("Manual private env editing is fallback-only"),
    "stale key next action should prefer the private env writer and demote manual env editing",
  );
  assert(
    staleKey.stdout.includes("npm run recall:key-rotation:write-env -- --replace-existing"),
    "stale key next command should name the rotated private env writer",
  );
  assert(staleKey.stdout.includes("npm run check:recall-key-rotation-evidence"), "stale key next command should name key gate");
  const staleKeyJson = JSON.parse(staleKey.stdout);
  assert(
    staleKeyJson.gateSummary?.currentBlockingGate === "key_rotation_evidence" &&
      staleKeyJson.gateSummary?.owner === "Arun" &&
      staleKeyJson.gateSummary?.externalActionRequired === true &&
      staleKeyJson.gateSummary?.externalAction === "rotate_recall_api_key_outside_chat",
    "stale key gate summary should identify external key rotation as the owner action",
  );
  assert(
    staleKeyJson.gateSummary?.safeNoWritePreviewCommand === "npm run recall:first-apply:prepare-plan" &&
      staleKeyJson.gateSummary?.writeRotatedPrivateEnvCommand?.includes("recall:key-rotation:write-env") &&
      staleKeyJson.gateSummary?.blockedActions?.includes("proof_refresh") &&
      staleKeyJson.gateSummary?.blockedActions?.includes("first_capped_apply") &&
      staleKeyJson.gateSummary?.blockedActions?.includes("deploy") &&
      staleKeyJson.gateSummary?.blockedActions?.includes("scheduler") &&
      staleKeyJson.gateSummary?.blockedActions?.includes("checkpoint"),
    "stale key gate summary should expose the safe preview and blocked write/deploy actions",
  );
  assert(
    staleKeyJson.gateSummary?.proofRefreshAllowedNow === false &&
      staleKeyJson.gateSummary?.applyAllowedNow === false &&
      staleKeyJson.gateSummary?.deployAllowedNow === false &&
      staleKeyJson.gateSummary?.schedulerAllowedNow === false &&
      staleKeyJson.gateSummary?.checkpointAllowedNow === false,
    "stale key gate summary should deny proof refresh, apply, deploy, scheduler, and checkpoint",
  );
  assert(
    staleKeyJson.diagnostics?.firstWriteSafety?.blockedBeforeProofRefreshOrApply === true,
    "stale key diagnostics should say first-write work is blocked",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand ===
      promptDiagnosticCommand &&
      staleKeyJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCredentialMode ===
        "local_prompt_env_file_disabled",
    "stale key status should use the prompt command as the primary read-only diagnostic when the env-file live gate is not ready",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptCommand ===
      promptDiagnosticCommand,
    "stale key status should still expose the prompt read-only diagnostic with a private output file",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptOutputFile === promptDiagnosticOutputFile,
    "stale key status should expose the private prompt diagnostic output file",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWriteReportCheckCommand ===
      diagnosticReportCheckCommand &&
      staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWriteReportPath === promptDiagnosticOutputFile,
    "stale key status should expose the no-live private diagnostic report checker",
  );
  assertLatestPrivateDiagnosticProof(staleKeyJson, "stale key status");
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.promptDiagnosticBypassesLocalLiveGate === true &&
      staleKeyJson.diagnostics?.liveReadConnectivity?.promptDiagnosticAvailableWithoutLocalLiveGate === true,
    "stale key status should mark the prompt diagnostic as available without the local live gate",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.promptDiagnosticPreKeyGuarded === true,
    "stale key status should mark the prompt diagnostic as guarded before key entry",
  );
  assert(
    staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand === null &&
      staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperOutputFile === null &&
      staleKeyJson.diagnostics?.liveReadConnectivity?.optionalNoWriteCommand === null,
    "stale key status should keep env-file wrapper diagnostics hidden until the local live gate is ready",
  );
  assert(
    staleKeyJson.optionalDiagnosticCommands?.[1]?.id === "first_apply_live_diagnostic_prompt" &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.preKeyGuarded === true &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.guardedBy ===
        "npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test" &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.outputFile === promptDiagnosticOutputFile &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.outputFileMode === "0600" &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.safetyNote?.includes(
        "internal no-live prompt guard before key entry",
      ) &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.safetyNote?.includes("private output file") &&
      staleKeyJson.optionalDiagnosticCommands?.[1]?.safetyNote?.includes("local env-file live gate is not ready"),
    "stale key status should list the real prompt command after the guard and explain local-gate bypass plus private output",
  );
  assert(
    staleKeyJson.optionalDiagnosticCommands?.[2]?.id === "first_apply_live_diagnostic_report_check" &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.command === diagnosticReportCheckCommand &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.mode === "no_live_private_file_check" &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.outputFile === promptDiagnosticOutputFile &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.doesNotSatisfy?.includes("live_connectivity") &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.doesNotSatisfy?.includes("apply") &&
      staleKeyJson.optionalDiagnosticCommands?.[2]?.safetyNote?.includes("without calling Recall"),
    "stale key status should list the no-live private diagnostic report checker as diagnostic-only",
  );
  assertNoSecret(staleKey.stdout, "stale key status output");

  const liveReadyButKeyBlocked = runStatus({
    envFile: diagnosticEnv,
    manifestPath: diagnosticManifest,
    backupPath: freshBackup,
    skipLiveGateStatus: false,
  });
  assert(liveReadyButKeyBlocked.status === 0, "live-ready/key-blocked status should exit 0 by default");
  const liveReadyButKeyBlockedJson = assertStatus(liveReadyButKeyBlocked.stdout, "blocked_key_rotation_evidence");
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteCommand?.includes("npm run recall:live-auth-probe"),
    "diagnostics should expose the optional no-write live auth probe when live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.promptDiagnosticBypassesLocalLiveGate === false,
    "live-ready diagnostics should not mark the prompt command as bypassing the local live gate",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.promptDiagnosticPreKeyGuarded === true,
    "live-ready diagnostics should mark the prompt command as guarded before key entry",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand?.includes(
      "npm run recall:first-apply:live-diagnostic",
    ) &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand?.includes(
        `--output-file ${promptDiagnosticOutputFile}`,
      ),
    "diagnostics should expose the status-preserving no-write live diagnostic wrapper with private output when live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand ===
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand?.includes(
        "npm run recall:first-apply:live-diagnostic",
      ) &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCredentialMode ===
        "private_env_file" &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.promptFallbackReadOnlyDiagnosticCommand ===
        liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptCommand,
    "live-ready diagnostics should prefer the private env-file wrapper and keep the guarded prompt as fallback",
  );
  assert(
    liveReadyButKeyBlockedJson.gateSummary?.safeReadOnlyDiagnosticCommand ===
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand,
    "live-ready gate summary should name the private env-file wrapper as the safe read-only diagnostic command",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperOutputFile ===
      promptDiagnosticOutputFile,
    "diagnostics should expose the private env-file wrapper diagnostic output file when live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptCommand?.includes(
      "npm run recall:first-apply:live-diagnostic:prompt",
    ) &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptCommand?.includes(
        `--output-file ${promptDiagnosticOutputFile}`,
      ),
    "diagnostics should expose the prompt-based no-write live diagnostic command with private output when live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWritePromptOutputFile ===
      promptDiagnosticOutputFile,
    "diagnostics should expose the private prompt diagnostic output file when live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteReportCheckCommand ===
      diagnosticReportCheckCommand &&
      liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.optionalNoWriteReportPath ===
        promptDiagnosticOutputFile,
    "diagnostics should expose the no-live private diagnostic report checker when live gate is ready",
  );
  assertLatestPrivateDiagnosticProof(liveReadyButKeyBlockedJson, "live-ready/key-blocked status");
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.promptGuardSelfTestCommand ===
      "npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test",
    "diagnostics should expose the direct no-live prompt guard self-test command",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.promptGuardSmokeCommand ===
      "npm run smoke:recall-first-apply-live-diagnostic-prompt-guard",
    "diagnostics should expose the no-live prompt guard regression smoke command",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.id === "first_apply_live_diagnostic_prompt_guard" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.mode === "offline_self_test" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.credentialMode === "no_real_key_no_live_api",
    "top-level optional diagnostic commands should put the no-live prompt guard first",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.doesNotSatisfy?.includes("live_connectivity"),
    "top-level prompt guard should say it does not satisfy live connectivity",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.command ===
      "npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[0]?.regressionCommand ===
        "npm run smoke:recall-first-apply-live-diagnostic-prompt-guard",
    "top-level prompt guard should use the direct self-test and retain the regression smoke",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.command?.includes(
      "npm run recall:first-apply:live-diagnostic:prompt",
    ),
    "top-level optional diagnostic commands should put the real prompt command after the guard",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.preferred === false &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.mode === "read_only" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.credentialMode === "local_prompt_env_file_disabled" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.preKeyGuarded === true &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.guardedBy ===
        "npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.outputFile === promptDiagnosticOutputFile &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.outputFileMode === "0600",
    "top-level optional diagnostic prompt command should remain read_only, env-file-disabled, pre-key guarded, private-output, and non-preferred when the env-file wrapper is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[1]?.doesNotSatisfy?.includes("apply"),
    "top-level optional diagnostic prompt should say it does not satisfy apply",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[2]?.id === "first_apply_live_diagnostic" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[2]?.preferred === true &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[2]?.outputFile === promptDiagnosticOutputFile &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[2]?.outputFileMode === "0600" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[2]?.safetyNote?.includes("private output file"),
    "top-level optional diagnostic commands should keep the env-file wrapper as the preferred private-output command when the live gate is ready",
  );
  assert(
    liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.id === "first_apply_live_diagnostic_report_check" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.command === diagnosticReportCheckCommand &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.mode === "no_live_private_file_check" &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.outputFile === promptDiagnosticOutputFile &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.doesNotSatisfy?.includes("live_connectivity") &&
      liveReadyButKeyBlockedJson.optionalDiagnosticCommands?.[3]?.doesNotSatisfy?.includes("checkpoint"),
    "top-level optional diagnostic commands should include the private report checker after the env-file wrapper",
  );
  assert(
    liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
      "npm run recall:first-apply:live-diagnostic",
    ) &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
        "--env-file",
      ) &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
      "npm run recall:first-apply:live-diagnostic:prompt",
    ) &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
        `--output-file ${promptDiagnosticOutputFile}`,
      ) &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes("does not satisfy key rotation evidence") &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
        "Existing private diagnostic proof already passes no-live validation",
      ) &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes("reached Recall with HTTP 200") &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes("internal no-live guard before key entry") &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes("--prompt-guard-self-test") &&
      liveReadyButKeyBlockedJson.readOnlyDiagnosticNextAction?.includes(
        "npm run smoke:recall-first-apply-live-diagnostic-prompt-guard",
      ),
    "read-only diagnostic next action should name the env-file primary command, prompt fallback, private output, not-write caveat, internal guard, direct guard, and smoke guard",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.liveReadConnectivity?.safetyNote?.includes("does not satisfy key-rotation evidence"),
    "diagnostics should say the live auth probe does not satisfy key evidence",
  );
  assert(
    liveReadyButKeyBlockedJson.diagnostics?.firstWriteSafety?.blockedBeforeProofRefreshOrApply === true,
    "live-ready/key-blocked diagnostics should keep first-write work blocked",
  );
  assertNoSecret(liveReadyButKeyBlocked.stdout, "live-ready/key-blocked status output");

  const confirmationMissing = runStatus({
    envFile: freshEnv,
    manifestPath: diagnosticManifest,
    backupPath: freshBackup,
    skipLiveGateStatus: false,
    liveApiConfirmation: false,
  });
  assert(confirmationMissing.status === 0, "confirmation-missing status should exit 0 by default");
  const confirmationMissingJson = assertStatus(confirmationMissing.stdout, "blocked_first_apply_readiness");
  const confirmationMissingLiveRead = confirmationMissingJson.diagnostics?.liveReadConnectivity ?? {};
  assert(
    confirmationMissingJson.gateSummary?.currentBlockingGate === "first_apply_readiness" &&
      confirmationMissingJson.gateSummary?.proofRefreshAllowedNow === false &&
      confirmationMissingJson.gateSummary?.applyAllowedNow === false &&
      confirmationMissingJson.gateSummary?.deployAllowedNow === false &&
      confirmationMissingJson.gateSummary?.schedulerAllowedNow === false &&
      confirmationMissingJson.gateSummary?.checkpointAllowedNow === false,
    "confirmation-missing status should keep first-write, deploy, scheduler, and checkpoint paths blocked",
  );
  assert(
    confirmationMissingLiveRead.localGateReady === false &&
      confirmationMissingLiveRead.verdict === "needs_live_api_confirmation",
    `confirmation-missing status should identify confirmation as the live-read blocker; actual=${JSON.stringify({
      localGateReady: confirmationMissingLiveRead.localGateReady,
      verdict: confirmationMissingLiveRead.verdict,
      readyForApprovedLiveSpikes: confirmationMissingLiveRead.readyForApprovedLiveSpikes,
      envFileLoaded: confirmationMissingLiveRead.envFileLoaded,
      privateEvidenceOk: confirmationMissingLiveRead.privateEvidenceOk,
    })}`,
  );
  assert(
    confirmationMissingLiveRead.envFileDiagnosticAvailableWithExplicitConfirmation === true,
    "confirmation-missing status should mark the env-file diagnostic as available with explicit confirmation",
  );
  assert(
    confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand ===
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCredentialMode ===
        "private_env_file" &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand?.includes(
        "npm run recall:first-apply:live-diagnostic",
      ) &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand?.includes(
        `--env-file ${freshEnv}`,
      ) &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand?.includes(
        "--confirm-live-api",
      ) &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.primarySafeReadOnlyDiagnosticCommand?.includes(
        `--output-file ${promptDiagnosticOutputFile}`,
      ),
    "confirmation-missing status should prefer the private env-file wrapper because the wrapper supplies explicit live confirmation",
  );
  assert(
    confirmationMissingJson.gateSummary?.safeReadOnlyDiagnosticCommand ===
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand,
    "confirmation-missing gate summary should name the env-file wrapper as the safe read-only diagnostic command",
  );
  assert(
    confirmationMissingJson.diagnostics?.liveReadConnectivity?.optionalNoWriteCommand?.includes(
      "npm run recall:live-auth-probe",
    ) &&
      confirmationMissingJson.diagnostics?.liveReadConnectivity?.optionalNoWriteCommand?.includes("--confirm-live-api"),
    "confirmation-missing status should expose the lower-level read-only probe with explicit confirmation",
  );
  assert(
    confirmationMissingJson.optionalDiagnosticCommands?.some(
      (command) =>
        command?.id === "first_apply_live_diagnostic" &&
        command?.preferred === true &&
        command?.command === confirmationMissingJson.diagnostics?.liveReadConnectivity?.optionalNoWriteWrapperCommand,
    ),
    "confirmation-missing optional diagnostic commands should mark the env-file wrapper as preferred",
  );
  assert(
    confirmationMissingJson.readOnlyDiagnosticNextAction?.includes(
      "npm run recall:first-apply:live-diagnostic",
    ) &&
      confirmationMissingJson.readOnlyDiagnosticNextAction?.includes("--confirm-live-api") &&
      confirmationMissingJson.readOnlyDiagnosticNextAction?.includes("does not satisfy key rotation evidence"),
    "confirmation-missing read-only next action should name the env-file wrapper and preserve write-gate caveats",
  );
  assertNoSecret(confirmationMissing.stdout, "confirmation-missing status output");

  const staleKeyRequireReady = runStatus({ envFile: staleEnv, backupPath: freshBackup, requireReady: true });
  assert(staleKeyRequireReady.status === 1, "--require-ready should exit nonzero while blocked");

  const refreshNeeded = runStatus({ envFile: freshEnv, backupPath: nearExpiryBackup });
  assert(refreshNeeded.status === 0, "refresh-needed status should exit 0 by default");
  const refreshNeededJson = assertStatus(refreshNeeded.stdout, "needs_no_write_proof_refresh");
  assert(
    refreshNeededJson.gateSummary?.currentBlockingGate === "proof_freshness" &&
      refreshNeededJson.gateSummary?.owner === "Codex" &&
      refreshNeededJson.gateSummary?.externalActionRequired === false &&
      refreshNeededJson.gateSummary?.proofRefreshAllowedNow === true &&
      refreshNeededJson.gateSummary?.applyAllowedNow === false,
    "refresh-needed gate summary should allow only no-write proof refresh",
  );
  assert(
    refreshNeeded.stdout.includes("BRAIN_RECALL_KEY_ROTATION_ACK=") &&
      refreshNeeded.stdout.includes("npm run recall:first-apply:refresh-if-needed"),
    "refresh-needed output should point to acknowledgement-prefixed refresh-if-needed",
  );
  assertNoSecret(refreshNeeded.stdout, "refresh-needed status output");

  const dryRunRefreshNeeded = runStatus({
    envFile: freshEnv,
    dryRunReportPath: nearExpiryDryRunReport,
    backupPath: freshBackup,
  });
  assert(dryRunRefreshNeeded.status === 0, "dry-run refresh-needed status should exit 0 by default");
  const dryRunRefreshNeededJson = assertStatus(dryRunRefreshNeeded.stdout, "needs_no_write_proof_refresh");
  assert(
    dryRunRefreshNeededJson.gateSummary?.currentBlockingGate === "proof_freshness" &&
      dryRunRefreshNeededJson.gateSummary?.proofRefreshAllowedNow === true &&
      dryRunRefreshNeededJson.gateSummary?.failedChecks?.includes("dry_run_report_proof"),
    "dry-run freshness-floor finding should make status refreshable",
  );
  assertNoSecret(dryRunRefreshNeeded.stdout, "dry-run refresh-needed status output");

  const ready = runStatus({ envFile: freshEnv, backupPath: freshBackup });
  assert(ready.status === 0, "ready status should exit 0");
  const readyJson = assertStatus(ready.stdout, "ready_for_first_capped_apply_approval");
  assert(readyJson.ok === true, "ready status should set ok true");
  assert(
    readyJson.gateSummary?.currentBlockingGate === "first_write_approval" &&
      readyJson.gateSummary?.owner === "Arun" &&
      readyJson.gateSummary?.externalActionRequired === true &&
      readyJson.gateSummary?.externalAction === "approve_first_capped_apply_with_exact_packet_text" &&
      readyJson.gateSummary?.applyAllowedNow === false,
    "ready gate summary should still require exact owner approval before apply",
  );
  assert(
    ready.stdout.includes("RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md"),
    "ready output should point to the approval packet",
  );
  assert(
    ready.stdout.includes("BRAIN_RECALL_FIRST_APPLY_APPROVAL=") &&
      ready.stdout.includes("BRAIN_RECALL_KEY_ROTATION_ACK=") &&
      ready.stdout.includes("npm run recall:first-capped-apply"),
    "ready output should point to guarded wrapper with approval and acknowledgement placeholders",
  );
  assertNoSecret(ready.stdout, "ready status output");

  const readyRequireReady = runStatus({ envFile: freshEnv, backupPath: freshBackup, requireReady: true });
  assert(readyRequireReady.status === 0, "--require-ready should pass when ready");

  const completed = runStatus({
    envFile: staleEnv,
    backupPath: nearExpiryBackup,
    completedApplyReportPath,
    skipCompletedApplyCheck: false,
  });
  assert(completed.status === 0, "completed first-apply status should exit 0 even when stale pre-apply proof exists");
  const completedJson = assertStatus(completed.stdout, "first_capped_apply_completed");
  assert(completedJson.ok === true, "completed first-apply status should set ok true");
  assert(completedJson.firstApplyCompleted === true, "completed first-apply status should mark firstApplyCompleted");
  assert(
    completedJson.gateSummary?.currentBlockingGate === "second_manual_verification_run" &&
      completedJson.gateSummary?.owner === "Arun" &&
      completedJson.gateSummary?.externalActionRequired === true &&
      completedJson.gateSummary?.externalAction === "approve_second_manual_verification_run_before_scheduler_enablement",
    "completed first-apply status should point to the second manual verification gate",
  );
  assert(
    completedJson.gateSummary?.safeNoWritePreviewCommand === "npm run recall:second-manual:readiness" &&
      completedJson.gateSummary?.blockedActions?.includes("second_manual_verification") &&
      completedJson.gateSummary?.blockedActions?.includes("scheduler") &&
      completedJson.gateSummary?.blockedActions?.includes("checkpoint"),
    "completed first-apply status should expose second-manual readiness and keep later actions blocked",
  );
  assert(
    completedJson.gateSummary?.proofRefreshAllowedNow === false &&
      completedJson.gateSummary?.applyAllowedNow === false &&
      completedJson.gateSummary?.deployAllowedNow === false &&
      completedJson.gateSummary?.schedulerAllowedNow === false &&
      completedJson.gateSummary?.checkpointAllowedNow === false,
    "completed first-apply status should not authorize proof refresh, duplicate apply, deploy, scheduler, or checkpoint",
  );
  assert(
    completedJson.keyRotationEvidence?.skipped === true &&
      completedJson.keyRotationEvidence?.reason === "first_capped_apply_already_completed" &&
      completedJson.readiness?.skipped === true &&
      completedJson.readiness?.reason === "first_capped_apply_already_completed",
    "completed first-apply status should skip stale historical pre-apply gates",
  );
  assert(
    completedJson.completedApplyReport?.verdict === "PASS_POST_APPLY_REVIEW_GATE" &&
      completedJson.completedApplyReport?.cardsSeen === 2 &&
      completedJson.completedApplyReport?.cardsImported === 2 &&
      completedJson.completedApplyReport?.cardsPlannedForImport === 2 &&
      completedJson.completedApplyReport?.checkpointAdvanced === true,
    "completed first-apply status should summarize the post-apply report without raw payload",
  );
  assert(
    completedJson.nextAction?.includes("First capped apply is already complete") &&
      completedJson.nextCommands?.includes("npm run recall:second-manual:readiness") &&
      completedJson.nextCommands?.some((command) =>
        command.includes("RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md"),
      ),
    "completed first-apply status should name second-manual readiness and approval packet",
  );
  assertNoSecret(completed.stdout, "completed first-apply status output");

  const completedRequireReady = runStatus({
    envFile: staleEnv,
    backupPath: nearExpiryBackup,
    completedApplyReportPath,
    requireReady: true,
    skipCompletedApplyCheck: false,
  });
  assert(completedRequireReady.status === 0, "--require-ready should pass after first apply is completed");

  console.log(
    JSON.stringify(
      {
        ok: true,
        checked: [
          "stale key evidence reports blocked_key_rotation_evidence",
          "stale key gate summary identifies external key rotation and keeps write/deploy actions blocked",
          "stale key status names the rotated private env writer before key evidence refresh",
          "stale key next action prefers the private env writer and makes manual env editing fallback-only",
          "live-ready but stale key evidence exposes the optional no-write live auth probe without unblocking first-write work",
          "live-ready but stale key evidence exposes the status-preserving no-write live diagnostic wrapper with private output",
          "status exposes a no-live private live-diagnostic report checker that does not satisfy write gates",
    "status summarizes an existing private live diagnostic proof without rerunning a live call",
    "live-ready but stale key evidence prefers the private env-file read-only diagnostic and keeps the prompt command as fallback",
    "confirmation-missing status still prefers the explicit-confirmation env-file diagnostic wrapper",
    "live-ready but stale key evidence exposes the no-live prompt guard self-test command",
          "live-ready but stale key evidence lists the prompt guard before the real prompt command in top-level optional diagnostic commands",
          "status marks the real prompt command as guarded before key entry and owner-only private-output producing",
          "live-ready but stale key evidence includes a private-output read-only diagnostic next action",
          "require-ready exits nonzero while blocked",
          "fresh key with near-expiry proof reports needs_no_write_proof_refresh",
          "fresh key with near-expiry dry-run proof reports needs_no_write_proof_refresh",
          "refresh-needed gate summary allows only no-write proof refresh",
          "fresh key with fresh proof reports ready_for_first_capped_apply_approval",
          "ready gate summary requires exact first-write approval before apply",
          "ready status points to the approval packet and guarded wrapper with approval plus acknowledgement",
          "completed first apply report suppresses stale pre-apply blockers and points to second manual readiness",
          "require-ready exits zero after the completed first apply report passes",
          "status output does not print env contents or secret-shaped values",
          "temp artifacts cleaned up",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(staleEnv, { force: true });
  rmSync(freshEnv, { force: true });
  rmSync(diagnosticEnv, { force: true });
  rmSync(diagnosticManifest, { force: true });
  rmSync(promptDiagnosticOutputFile, { force: true });
  rmSync(completedApplyReportPath, { force: true });
}

function runStatus({
  envFile,
  manifestPath = join(scratch, "controlled-samples.json"),
  dryRunReportPath = join(scratch, "dry-run-report.json"),
  backupPath,
  requireReady = false,
  skipLiveGateStatus = true,
  liveApiConfirmation = true,
  completedApplyReportPath = null,
  skipCompletedApplyCheck = true,
}) {
  const env = { ...process.env };
  if (liveApiConfirmation) {
    env.BRAIN_RECALL_CONFIRM_LIVE_API = "1";
  } else {
    delete env.BRAIN_RECALL_CONFIRM_LIVE_API;
  }
  return spawnSync(
    process.execPath,
    [
      "--",
      resolve("scripts/check-recall-first-apply-status.mjs"),
      ...(requireReady ? ["--require-ready"] : []),
      "--skip-private-ignore",
      ...(skipLiveGateStatus ? ["--skip-live-gate-status"] : []),
      "--skip-approval-packet",
      "--skip-public-docs-privacy",
      "--allow-unsafe-manifest-for-smoke",
      "--allow-non-private-dry-run-report",
      "--allow-non-private-backup",
      "--env-file",
      envFile,
      "--key-rotated-after",
      checkpoint,
      "--enumeration",
      join(scratch, "SPIKE-013.md"),
      "--fidelity",
      join(scratch, "SPIKE-014.md"),
      "--manifest",
      manifestPath,
      "--dry-run-report",
      dryRunReportPath,
      "--backup-path",
      backupPath,
      ...(skipCompletedApplyCheck ? ["--skip-completed-apply-check"] : []),
      ...(completedApplyReportPath ? ["--completed-apply-report", completedApplyReportPath] : []),
      "--live-diagnostic-report",
      promptDiagnosticOutputFile,
    ],
    {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    },
  );
}

function assertStatus(stdout, expectedStatus) {
  const parsed = JSON.parse(stdout);
  assert(parsed.status === expectedStatus, `expected ${expectedStatus}, got ${parsed.status}`);
  return parsed;
}

function assertNoSecret(value, label) {
  assert(!String(value).includes("RECALL_API_KEY="), `${label} printed env contents`);
  assert(!/\bsk_[A-Za-z0-9._-]{12,}\b/.test(String(value)), `${label} printed secret-shaped value`);
}

function assertLatestPrivateDiagnosticProof(parsed, label) {
  const proof = parsed.diagnostics?.liveReadConnectivity?.latestPrivateDiagnosticProof;
  assert(proof?.ok === true, `${label} should summarize a passing private diagnostic proof`);
  assert(proof?.verdict === "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT", `${label} should surface checker verdict`);
  assert(proof?.configuredReportPath === promptDiagnosticOutputFile, `${label} should use the configured private report path`);
  assert(proof?.checkCommand === diagnosticReportCheckCommand, `${label} should surface the no-live checker command`);
  assert(proof?.mode === "first_apply_live_read_diagnostic", `${label} should surface diagnostic mode`);
  assert(proof?.statusBeforeProbe === "blocked_key_rotation_evidence", `${label} should preserve pre-probe blocked status`);
  assert(proof?.diagnosticOutputFile?.path === promptDiagnosticOutputFile, `${label} should point to the private diagnostic proof file`);
  assert(proof?.diagnosticOutputFile?.mode === "0600", `${label} should report owner-only written mode`);
  assert(proof?.diagnosticOutputFile?.statMode === "600", `${label} should report owner-only stat mode`);
  assert(proof?.liveAuthProbe?.ok === true, `${label} should surface live auth probe success`);
  assert(proof?.liveAuthProbe?.endpoint === "/cards", `${label} should surface read-only endpoint`);
  assert(proof?.liveAuthProbe?.method === "GET", `${label} should surface read-only method`);
  assert(proof?.liveAuthProbe?.httpStatus === 200, `${label} should surface HTTP 200`);
  assert(proof?.liveAuthProbe?.authenticated === true, `${label} should surface authenticated true`);
  assert(proof?.liveAuthProbe?.reachable === true, `${label} should surface reachable true`);
  assert(proof?.liveAuthProbe?.totalCount === 0, `${label} should surface total count`);
  assert(proof?.liveAuthProbe?.resultCount === 0, `${label} should surface result count`);
  assert(proof?.firstWriteSafety?.proofRefreshAllowedNow === false, `${label} should keep proof refresh blocked`);
  assert(proof?.firstWriteSafety?.applyAllowedNow === false, `${label} should keep apply blocked`);
  assert(proof?.firstWriteSafety?.proofRefreshAllowedByThisProbe === false, `${label} should not allow proof refresh by probe`);
  assert(proof?.firstWriteSafety?.applyAllowedByThisProbe === false, `${label} should not allow apply by probe`);
  assert(proof?.doesNotAuthorize?.includes("key_rotation_evidence"), `${label} should not authorize key evidence`);
  assert(proof?.doesNotAuthorize?.includes("proof_freshness"), `${label} should not authorize proof freshness`);
  assert(proof?.doesNotAuthorize?.includes("first_write_approval"), `${label} should not authorize first-write approval`);
  assert(proof?.doesNotAuthorize?.includes("apply"), `${label} should not authorize apply`);
  assert(proof?.doesNotAuthorize?.includes("deploy"), `${label} should not authorize deploy`);
  assert(proof?.doesNotAuthorize?.includes("scheduler"), `${label} should not authorize scheduler`);
  assert(proof?.doesNotAuthorize?.includes("checkpoint"), `${label} should not authorize checkpoint`);
  assert(proof?.safetyNote?.includes("without calling Recall"), `${label} should identify the proof check as no-live`);
}

function writePrivateEnv(path, { liveConfirmed = false } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `RECALL_API_KEY=<redacted-test-value>\nBRAIN_RECALL_CONFIRM_LIVE_API=${liveConfirmed ? "1" : "0"}\n`,
    "utf8",
  );
  chmodSync(path, 0o600);
}

function writeLiveDiagnosticReport(path, envFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
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
          privateRoot: "data/private/recall-live-spikes",
          mode: "0600",
        },
        liveAuthProbe: {
          ok: true,
          endpoint: "/cards",
          method: "GET",
          dateWindow: {
            dateFrom: "2026-06-24T00:00:00.000Z",
            dateTo: "2026-06-24T23:59:59.999Z",
          },
          envFile: {
            path: envFile,
            loaded: true,
            mode: "0600",
            mtimeIso: "2026-06-24T15:00:00.000Z",
          },
          firstWriteSafety: {
            purpose: "diagnostic_context_only",
            keyRotationEvidenceGateRun: false,
            proofRefreshAllowedByThisProbe: false,
            applyAllowedByThisProbe: false,
            envFileMtimeAfterCheckpoint: false,
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
    ),
    "utf8",
  );
  chmodSync(path, 0o600);
}

function writeCompletedApplyReport(path) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify(
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
    ),
    "utf8",
  );
  chmodSync(path, 0o600);
}

function writeSqliteBackup(path) {
  const db = new Database(path);
  try {
    db.exec("CREATE TABLE proof (id INTEGER PRIMARY KEY, label TEXT); INSERT INTO proof (label) VALUES ('ok');");
  } finally {
    db.close();
  }
}

function writeManifest(path) {
  writeFileSync(
    path,
    JSON.stringify(
      {
        dateWindow: { dateFrom: "2026-06-24T00:00:00Z", dateTo: "2026-06-24T23:59:59Z" },
        samples: requiredLabels().map((label, index) => ({
          label,
          contentType: label === "sample-no-url" ? "no_url" : label.replace("sample-", ""),
          cardId: `card-first-apply-status-${index + 1}`,
          expectedTitle: `First apply status ${label}`,
          createdAt: "2026-06-24T12:00:00Z",
          sourceUrl: label === "sample-no-url" ? null : `https://example.com/first-apply-status/${label}`,
          allowTitleInPublicReport: false,
          allowSourceUrlInPublicReport: false,
        })),
        negativeControl: {
          label: "outside-window",
          cardId: "card-first-apply-status-outside-window",
          createdAt: "2026-06-23T12:00:00Z",
          expectedTitle: "First apply status outside window",
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}

function writeReport(path, spikeId, verdict, evidence) {
  writeFileSync(
    path,
    `# ${spikeId} - First apply status smoke report

| Field | Value |
|---|---|
| **Spike ID** | ${spikeId} |
| **Date** | 2026-06-24 00:00 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Smoke |
| **Triggered by** | Smoke |
| **Blocks** | Smoke |
| **Verdict** | ${verdict} |

## Evidence

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`
`,
    "utf8",
  );
}

function enumerationEvidence() {
  return {
    mode: "recall_rest_enumeration_probe",
    filteredFirst: { resultCount: 6, totalCount: 6 },
    filteredSecond: { resultCount: 6, totalCount: 6 },
    repeatedFilteredStable: true,
    expectedControls: {
      manifest: manifestSummary(),
      positiveIds: requiredLabels().map((label) => ({ id: `<redacted:${label}>`, present: true })),
      negativeIds: [{ id: "<redacted:outside-window>", absent: true }],
      positiveTitles: [],
    },
  };
}

function fidelityEvidence() {
  return {
    mode: "recall_content_fidelity_probe",
    cardCount: 6,
    expectedControls: manifestSummary(),
    cards: requiredLabels().map((label, index) => ({
      id: `<redacted:${label}>`,
      sampleLabel: label,
      contentFidelity: index === 5 ? "api_chunks_unverified" : "complete_enough_for_daily_import",
      maxChunksHit: false,
      policy: {
        shouldImport: index !== 5,
        shouldIndexForRetrieval: index !== 5,
      },
    })),
  };
}

function dryRunEvidence() {
  return {
    mode: "dry_run",
    state: "done",
    exitCode: 0,
    errorName: null,
    lastError: null,
    dateFrom: "2026-06-24T00:00:00.000Z",
    dateTo: "2026-06-24T23:59:59.000Z",
    cardsSeen: 1,
    cardsAvailable: 1,
    enumerationComplete: true,
    cardsImported: 0,
    cardsUpgraded: 0,
    cardsSkipped: 0,
    cardsChangedRemote: 0,
    cardsBlocked: 0,
    cardsPlannedForImport: 1,
    totalCharsPlanned: 1200,
    totalChunksFetched: 1,
    fidelityCounts: { api_chunks_unverified: 1 },
    policyBlockCounts: {},
    policyBlockReasons: [],
    plannedActionCounts: { imported: 1 },
    checkpointAdvanced: false,
    lockAcquired: true,
    staleLockRecovered: false,
  };
}

function manifestSummary() {
  return {
    ok: true,
    sampleCount: 6,
    requiredLabels: requiredLabels(),
    publicPrivacy: { titleAllowedCount: 0, sourceUrlAllowedCount: 0 },
  };
}

function requiredLabels() {
  return ["sample-note", "sample-article", "sample-youtube", "sample-pdf", "sample-no-url", "sample-long"];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
