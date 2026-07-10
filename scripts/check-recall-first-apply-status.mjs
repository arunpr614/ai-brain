#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_RECALL_ENUMERATION_REPORT,
  DEFAULT_RECALL_FIDELITY_REPORT,
  resolveLatestRecallSpikeReportPair,
} from "./lib/recall-latest-spike-reports.mjs";

const DEFAULT_ENUMERATION_REPORT = DEFAULT_RECALL_ENUMERATION_REPORT;
const DEFAULT_FIDELITY_REPORT = DEFAULT_RECALL_FIDELITY_REPORT;
const DEFAULT_MANIFEST = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_KEY_ROTATION_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_DRY_RUN_REPORT = "data/private/recall-live-spikes/dry-run-report.json";
const DEFAULT_BACKUP_PATH =
  "data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite";
const DEFAULT_APPLY_REPORT = "data/private/recall-live-spikes/first-apply-report.json";
const DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES = 10 * 365 * 24 * 60;
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const APPROVAL_PACKET_PATH =
  "docs/plans/recall-sync/RECALL_FIRST_CAPPED_APPLY_APPROVAL_PACKET_2026-06-24_19-28-07_IST.md";
const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const REQUIRED_FIRST_APPLY_APPROVAL =
  "I approve the first capped Recall -> AI Brain apply for the 2026-06-16 window, capped at 5 planned imports, using the accepted live-spike proof, reviewed dry-run proof, backup proof, and explicit fidelity flags for unverified and metadata-only Recall content.";
const SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET =
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md";
const SECOND_MANUAL_VERIFICATION_READINESS_COMMAND = "npm run recall:second-manual:readiness";
const PROMPT_GUARD_SELF_TEST_COMMAND =
  "npm run recall:first-apply:live-diagnostic:prompt -- --prompt-guard-self-test";
const PROMPT_GUARD_SMOKE_COMMAND = "npm run smoke:recall-first-apply-live-diagnostic-prompt-guard";
const DEFAULT_PROMPT_LIVE_DIAGNOSTIC_OUTPUT =
  "data/private/recall-live-spikes/live-diagnostic-report.json";
const DEFAULT_ENV_FILE_LIVE_DIAGNOSTIC_OUTPUT = DEFAULT_PROMPT_LIVE_DIAGNOSTIC_OUTPUT;
const LIVE_DIAGNOSTIC_REPORT_CHECK_COMMAND =
  buildLiveDiagnosticReportCheckCommand(DEFAULT_ENV_FILE_LIVE_DIAGNOSTIC_OUTPUT);

const REFRESHABLE_CHECKS = new Set(["dry_run_report_proof", "backup_proof"]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const completedApplyReport = checkCompletedApplyReport();
if (completedApplyReport.ok === true) {
  const output = buildCompletedFirstApplyOutput(completedApplyReport);
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

const keyEvidence = args.skipKeyRotationEvidence
  ? { skipped: true, ok: true }
  : runJsonCommand([
      script("check-recall-key-rotation-evidence.mjs"),
      "--env-file",
      args.envFilePath,
      "--evidence-file",
      args.keyRotationEvidenceFilePath,
      "--min-rotated-after",
      args.keyRotatedAfterIso,
    ]);

const readinessArgs = [
  script("check-recall-first-apply-readiness.mjs"),
  "--enumeration",
  args.enumerationPath,
  "--fidelity",
  args.fidelityPath,
  "--manifest",
  args.manifestPath,
  "--env-file",
  args.envFilePath,
  "--key-rotation-evidence-file",
  args.keyRotationEvidenceFilePath,
  "--key-rotated-after",
  args.keyRotatedAfterIso,
  "--dry-run-report",
  args.dryRunReportPath,
  "--backup-path",
  args.backupPath,
  "--accepted-fidelity-risk",
  args.acceptedFidelityRisk,
  "--max-planned-imports",
  String(args.maxPlannedImports),
  "--dry-run-report-max-age-minutes",
  String(args.dryRunReportMaxAgeMinutes),
  "--backup-max-age-minutes",
  String(args.backupMaxAgeMinutes),
  "--min-freshness-remaining-minutes",
  String(args.minFreshnessRemainingMinutes),
  "--allow-fidelity-changes",
  "--allow-unverified-fidelity",
  "--allow-metadata-only-fidelity",
  ...(args.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
  ...(args.allowNonPrivateDryRunReport ? ["--allow-non-private-dry-run-report"] : []),
  ...(args.allowNonPrivateBackup ? ["--allow-non-private-backup"] : []),
  ...(args.skipPrivateIgnore ? ["--skip-private-ignore"] : []),
  ...(args.skipLiveGateStatus ? ["--skip-live-gate-status"] : []),
  ...(args.skipKeyRotationEvidence ? ["--skip-key-rotation-evidence"] : []),
  ...(args.skipApprovalPacket ? ["--skip-approval-packet"] : []),
  ...(args.skipPublicDocsPrivacy ? ["--skip-public-docs-privacy"] : []),
];

const readiness = runJsonCommand(readinessArgs);
const readinessParsed = readiness.parsed ?? {};
const liveDiagnosticProof = runJsonCommand([
  script("check-recall-live-diagnostic-report.mjs"),
  "--report",
  args.liveDiagnosticReportPath,
]);
const failedChecks = readinessFailureIds(readinessParsed);
const refreshableOnly =
  failedChecks.length > 0 && failedChecks.every((id) => REFRESHABLE_CHECKS.has(id));
const keyEvidenceOk = keyEvidence.ok === true && readinessKeyEvidenceOk(readinessParsed);

const status = decideStatus({ keyEvidenceOk, readinessOk: readiness.ok === true, refreshableOnly });
const diagnostics = buildDiagnostics(status, readinessParsed, liveDiagnosticProof);
const gateSummary = buildGateSummary(status, readinessParsed, diagnostics);
const output = {
  ok: status === "ready_for_first_capped_apply_approval",
  status,
  gateSummary,
  keyRotationEvidence: summarizeKeyEvidence(keyEvidence),
  readiness: summarizeReadiness(readiness),
  diagnostics,
  optionalDiagnosticCommands: buildOptionalDiagnosticCommands(diagnostics),
  readOnlyDiagnosticNextAction: readOnlyDiagnosticNextAction(diagnostics),
  nextAction: nextAction(status),
  nextCommands: nextCommands(status),
};

console.log(JSON.stringify(output, null, 2));

if (args.requireReady && !output.ok) {
  process.exit(1);
}

function decideStatus({ keyEvidenceOk, readinessOk, refreshableOnly }) {
  if (!keyEvidenceOk) return "blocked_key_rotation_evidence";
  if (readinessOk) return "ready_for_first_capped_apply_approval";
  if (refreshableOnly) return "needs_no_write_proof_refresh";
  return "blocked_first_apply_readiness";
}

function checkCompletedApplyReport() {
  if (args.skipCompletedApplyCheck) {
    return { ok: false, skipped: true, reason: "skip_completed_apply_check" };
  }
  if (!existsSync(resolve(args.applyReportPath))) {
    return { ok: false, skipped: false, reason: "missing_completed_apply_report", reportPath: args.applyReportPath };
  }
  return runJsonCommand([
    script("check-recall-apply-report.mjs"),
    "--report",
    args.applyReportPath,
    "--max-applied-imports",
    String(args.maxPlannedImports),
    "--max-age-minutes",
    String(args.applyReportMaxAgeMinutes),
    "--require-private-path",
    "--require-cards-seen",
    "--require-applied-imports",
    "--allow-unverified-fidelity",
    "--allow-metadata-only-fidelity",
  ]);
}

function buildCompletedFirstApplyOutput(completedApplyReport) {
  return {
    ok: true,
    status: "first_capped_apply_completed",
    noLiveNoWrite: true,
    firstApplyCompleted: true,
    gateSummary: {
      currentBlockingGate: "second_manual_verification_run",
      owner: "Arun",
      externalActionRequired: true,
      externalAction: "approve_second_manual_verification_run_before_scheduler_enablement",
      failedChecks: [],
      safeNoWritePreviewCommand: SECOND_MANUAL_VERIFICATION_READINESS_COMMAND,
      safeReadOnlyDiagnosticCommand: null,
      realPrepareCommand: null,
      blockedActions: ["second_manual_verification", "scheduler", "checkpoint"],
      proofRefreshAllowedNow: false,
      applyAllowedNow: false,
      deployAllowedNow: false,
      schedulerAllowedNow: false,
      checkpointAllowedNow: false,
      safetyNote:
        "First capped apply already passed post-apply review. Do not rerun first-apply proof refresh or the first capped apply; proceed only through the second manual verification approval gate.",
    },
    completedApplyReport: summarizeCompletedApplyReport(completedApplyReport),
    keyRotationEvidence: {
      skipped: true,
      ok: true,
      reason: "first_capped_apply_already_completed",
      safetyNote:
        "Historical first-write key/proof gates are not rerun for status after the completed apply report has passed post-apply review.",
    },
    readiness: {
      skipped: true,
      ok: true,
      reason: "first_capped_apply_already_completed",
      safetyNote:
        "Stale pre-apply dry-run or backup proof must not reopen the completed first-apply gate.",
    },
    diagnostics: {
      firstWriteSafety: {
        keyRotationEvidenceRequired: false,
        blockedBeforeProofRefreshOrApply: false,
        proofRefreshAllowedNow: false,
        applyAllowedNow: false,
        safetyNote:
          "The first capped apply is complete. Additional writes require the separate second-manual verification approval gate.",
      },
    },
    optionalDiagnosticCommands: [],
    readOnlyDiagnosticNextAction: null,
    nextAction:
      "First capped apply is already complete. Run the no-live second-manual readiness gate and wait for exact Arun approval before any additional production write.",
    nextCommands: [
      SECOND_MANUAL_VERIFICATION_READINESS_COMMAND,
      `Review ${SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET}`,
    ],
  };
}

function summarizeCompletedApplyReport(result) {
  const parsed = result.parsed ?? {};
  const summary = parsed.summary ?? {};
  return {
    ok: result.ok === true && parsed.ok === true,
    verdict: parsed.verdict ?? null,
    reportPath: parsed.reportPath ?? args.applyReportPath,
    maxAppliedImports: parsed.maxAppliedImports ?? args.maxPlannedImports,
    maxAgeMinutes: parsed.maxAgeMinutes ?? args.applyReportMaxAgeMinutes,
    cardsSeen: summary.cardsSeen ?? null,
    cardsImported: summary.cardsImported ?? null,
    cardsUpgraded: summary.cardsUpgraded ?? null,
    cardsSkipped: summary.cardsSkipped ?? null,
    cardsBlocked: summary.cardsBlocked ?? null,
    cardsChangedRemote: summary.cardsChangedRemote ?? null,
    cardsPlannedForImport: summary.cardsPlannedForImport ?? null,
    checkpointAdvanced: summary.checkpointAdvanced ?? null,
  };
}

function readinessKeyEvidenceOk(parsed) {
  if (args.skipKeyRotationEvidence) return true;
  if (!parsed || !Array.isArray(parsed.checked)) return keyEvidence.ok === true;
  const check = parsed.checked.find((entry) => entry?.id === "key_rotation_evidence");
  return check?.ok === true;
}

function nextAction(status) {
  if (status === "blocked_key_rotation_evidence") {
    return "Rotate the Recall API key outside chat, then prefer the rotated-key private env writer to store it only in the ignored private Recall env file before rerunning key evidence. Manual private env editing is fallback-only. If env-file mtime remains stale after real rotation, record ignored private evidence with the exact key rotation acknowledgement before proof refresh or apply.";
  }
  if (status === "needs_no_write_proof_refresh") {
    return "Key evidence passed, but private proof is stale or near expiry. Run the no-write ready-or-refresh wrapper, then rerun readiness.";
  }
  if (status === "ready_for_first_capped_apply_approval") {
    return "Machine readiness passed. Use the guarded first capped apply wrapper only after exact Arun approval and key rotation acknowledgement.";
  }
  return "Resolve the non-refreshable readiness blockers, then rerun first-apply status.";
}

function nextCommands(status) {
  if (status === "blocked_key_rotation_evidence") {
    return [
      "npm run recall:first-apply:prepare-plan",
      rotatedEnvWriterCommand(),
      "npm run check:recall-key-rotation-evidence",
      `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`,
      `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation-evidence:record`,
      "npm run recall:first-apply:status",
    ];
  }
  if (status === "needs_no_write_proof_refresh") {
    return [
      `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:first-apply:refresh-if-needed`,
      `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM=1 npm run recall:first-apply:ready-or-refresh`,
      "npm run check:recall-first-apply-readiness",
      "npm run recall:first-apply:status",
    ];
  }
  if (status === "ready_for_first_capped_apply_approval") {
    return [
      `Review ${APPROVAL_PACKET_PATH} before running the guarded wrapper`,
      "npm run check:recall-first-apply-readiness",
      `BRAIN_RECALL_SYNC_ENABLED=1 BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_APPROVAL="${REQUIRED_FIRST_APPLY_APPROVAL}" npm run recall:first-capped-apply`,
    ];
  }
  return ["npm run check:recall-first-apply-readiness"];
}

function buildGateSummary(status, readinessParsed, diagnostics) {
  const failedChecks = readinessFailureIds(readinessParsed);
  const safeNoWritePreviewCommand = status === "blocked_key_rotation_evidence"
    ? "npm run recall:first-apply:prepare-plan"
    : null;
  const realPrepareCommand =
    `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`;
  const writeRotatedPrivateEnvCommand = rotatedEnvWriterCommand();
  const firstWriteBlockedActions = ["proof_refresh", "first_capped_apply", "deploy", "scheduler", "checkpoint"];

  if (status === "blocked_key_rotation_evidence") {
    return {
      currentBlockingGate: "key_rotation_evidence",
      owner: "Arun",
      externalActionRequired: true,
      externalAction: "rotate_recall_api_key_outside_chat",
      failedChecks,
      safeNoWritePreviewCommand,
      writeRotatedPrivateEnvCommand,
      safeReadOnlyDiagnosticCommand: diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand,
      realPrepareCommand,
      blockedActions: firstWriteBlockedActions,
      proofRefreshAllowedNow: false,
      applyAllowedNow: false,
      deployAllowedNow: false,
      schedulerAllowedNow: false,
      checkpointAllowedNow: false,
      safetyNote:
        "Only the no-write preview and read-only diagnostics are safe now. Proof refresh, first capped apply, deploy, scheduler, and checkpoint movement remain blocked until post-chat key rotation evidence passes.",
    };
  }

  if (status === "needs_no_write_proof_refresh") {
    return {
      currentBlockingGate: "proof_freshness",
      owner: "Codex",
      externalActionRequired: false,
      externalAction: null,
      failedChecks,
      safeNoWritePreviewCommand: null,
      safeReadOnlyDiagnosticCommand: diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand,
      realPrepareCommand,
      blockedActions: ["first_capped_apply", "deploy", "scheduler", "checkpoint"],
      proofRefreshAllowedNow: true,
      applyAllowedNow: false,
      deployAllowedNow: false,
      schedulerAllowedNow: false,
      checkpointAllowedNow: false,
      safetyNote:
        "Key rotation evidence passed, but private proof must be refreshed without apply before any first-write approval path.",
    };
  }

  if (status === "ready_for_first_capped_apply_approval") {
    return {
      currentBlockingGate: "first_write_approval",
      owner: "Arun",
      externalActionRequired: true,
      externalAction: "approve_first_capped_apply_with_exact_packet_text",
      failedChecks,
      safeNoWritePreviewCommand: null,
      safeReadOnlyDiagnosticCommand: diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand,
      realPrepareCommand: null,
      blockedActions: ["first_capped_apply", "deploy", "scheduler", "checkpoint"],
      proofRefreshAllowedNow: false,
      applyAllowedNow: false,
      deployAllowedNow: false,
      schedulerAllowedNow: false,
      checkpointAllowedNow: false,
      safetyNote:
        "Machine readiness passed, but the guarded first capped apply still requires exact owner approval before any write, deploy, scheduler, or checkpoint path.",
    };
  }

  return {
    currentBlockingGate: "first_apply_readiness",
    owner: "Codex",
    externalActionRequired: false,
    externalAction: null,
    failedChecks,
    safeNoWritePreviewCommand: null,
    safeReadOnlyDiagnosticCommand: diagnostics.liveReadConnectivity.primarySafeReadOnlyDiagnosticCommand,
    realPrepareCommand,
    blockedActions: firstWriteBlockedActions,
    proofRefreshAllowedNow: false,
    applyAllowedNow: false,
    deployAllowedNow: false,
    schedulerAllowedNow: false,
    checkpointAllowedNow: false,
    safetyNote:
      "Resolve non-refreshable readiness blockers before proof refresh, first capped apply, deploy, scheduler, or checkpoint movement.",
  };
}

function rotatedEnvWriterCommand() {
  return `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation:write-env -- --replace-existing`;
}

function buildDiagnostics(status, readinessParsed, liveDiagnosticProof) {
  const liveGate = Array.isArray(readinessParsed?.checked)
    ? readinessParsed.checked.find((entry) => entry?.id === "live_gate_status")
    : null;
  const liveGateDetails = liveGate?.details ?? null;
  const liveDiagnosticReportCheckCommand = buildLiveDiagnosticReportCheckCommand(args.liveDiagnosticReportPath);
  const liveReadDiagnosticAvailable =
    liveGate?.ok === true && liveGateDetails?.readyForApprovedLiveSpikes === true && args.envFilePath;
  const envFileDiagnosticAvailableWithExplicitConfirmation =
    Boolean(args.envFilePath) &&
    liveGate?.verdict === "needs_live_api_confirmation" &&
    liveGateDetails?.privateEvidenceOk === true &&
    liveGateDetails?.envFileLoaded === true;
  const envFileReadDiagnosticAvailable =
    liveReadDiagnosticAvailable || envFileDiagnosticAvailableWithExplicitConfirmation;
  const optionalLiveAuthProbeCommand = envFileReadDiagnosticAvailable
    ? `npm run recall:live-auth-probe -- --env-file ${args.envFilePath} --confirm-live-api`
    : null;
  const optionalFirstApplyLiveDiagnosticCommand = envFileReadDiagnosticAvailable
    ? `npm run recall:first-apply:live-diagnostic -- --env-file ${args.envFilePath} --confirm-live-api --output-file ${args.liveDiagnosticReportPath}`
    : null;
  const optionalFirstApplyLiveDiagnosticPromptCommand =
    `npm run recall:first-apply:live-diagnostic:prompt -- --confirm-live-api --output-file ${args.liveDiagnosticReportPath}`;
  const primarySafeReadOnlyDiagnosticCommand =
    optionalFirstApplyLiveDiagnosticCommand ?? optionalFirstApplyLiveDiagnosticPromptCommand;
  const primarySafeReadOnlyDiagnosticCredentialMode = optionalFirstApplyLiveDiagnosticCommand
    ? "private_env_file"
    : "local_prompt_env_file_disabled";
  const promptFallbackReadOnlyDiagnosticCommand = optionalFirstApplyLiveDiagnosticCommand
    ? optionalFirstApplyLiveDiagnosticPromptCommand
    : null;
  const promptDiagnosticBypassesLocalLiveGate = !liveReadDiagnosticAvailable;
  return {
    liveReadConnectivity: {
      localGateReady: liveGate?.ok === true,
      verdict: liveGate?.verdict ?? null,
      readyForApprovedLiveSpikes: liveGateDetails?.readyForApprovedLiveSpikes ?? null,
      privateEvidenceOk: liveGateDetails?.privateEvidenceOk ?? null,
      envFileLoaded: liveGateDetails?.envFileLoaded ?? null,
      envFileDiagnosticAvailableWithExplicitConfirmation,
      promptGuardSelfTestCommand: PROMPT_GUARD_SELF_TEST_COMMAND,
      promptGuardSmokeCommand: PROMPT_GUARD_SMOKE_COMMAND,
      primarySafeReadOnlyDiagnosticCommand,
      primarySafeReadOnlyDiagnosticCredentialMode,
      promptFallbackReadOnlyDiagnosticCommand,
      optionalNoWritePromptCommand: optionalFirstApplyLiveDiagnosticPromptCommand,
      optionalNoWritePromptOutputFile: args.liveDiagnosticReportPath,
      optionalNoWriteWrapperOutputFile: envFileReadDiagnosticAvailable ? args.liveDiagnosticReportPath : null,
      optionalNoWriteReportCheckCommand: liveDiagnosticReportCheckCommand,
      optionalNoWriteReportPath: args.liveDiagnosticReportPath,
      latestPrivateDiagnosticProof: summarizeLiveDiagnosticProof(
        liveDiagnosticProof,
        args.liveDiagnosticReportPath,
        liveDiagnosticReportCheckCommand,
      ),
      promptDiagnosticAvailableWithoutLocalLiveGate: true,
      promptDiagnosticBypassesLocalLiveGate,
      promptDiagnosticRequiresLocalKeyEntry: true,
      promptDiagnosticPreKeyGuarded: true,
      optionalNoWriteWrapperCommand: optionalFirstApplyLiveDiagnosticCommand,
      optionalNoWriteCommand: optionalLiveAuthProbeCommand,
      safetyNote: optionalLiveAuthProbeCommand
        ? "Optional diagnostic only: runs one read-only future-window Recall /cards request and does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates. If the local live gate only lacks explicit confirmation, the env-file wrapper is still the preferred command because it supplies --confirm-live-api and reruns local guards before probing. Prefer optionalNoWritePromptCommand only when the persisted env file is stale or intentionally not trusted; it writes sanitized proof only to the private prompt output file. The prompt command itself runs the internal no-live guard before key entry; run promptGuardSelfTestCommand first to verify that preflight and unsafe probe override rejection without reading a key."
        : "Optional prompt diagnostic is still available because it asks for a key locally, runs the internal no-live guard before key entry, forces env-file-disabled probing, and writes sanitized proof only to the private prompt output file. Env-file wrapper diagnostics are hidden until the local live gate is ready. promptGuardSelfTestCommand is safe to run because it does not use the Recall API, load an env file, or read a real key.",
    },
    firstWriteSafety: {
      keyRotationEvidenceRequired: !args.skipKeyRotationEvidence,
      blockedBeforeProofRefreshOrApply: status === "blocked_key_rotation_evidence",
      proofRefreshAllowedNow: status === "needs_no_write_proof_refresh",
      applyAllowedNow: status === "ready_for_first_capped_apply_approval",
      safetyNote:
        "First-write proof refresh and apply remain separate from live-read connectivity and must not run until key evidence and exact acknowledgements pass.",
    },
  };
}

function buildOptionalDiagnosticCommands(diagnostics) {
  const liveRead = diagnostics?.liveReadConnectivity ?? {};
  const commands = [];
  if (liveRead.promptGuardSelfTestCommand) {
    commands.push({
      id: "first_apply_live_diagnostic_prompt_guard",
      command: liveRead.promptGuardSelfTestCommand,
      mode: "offline_self_test",
      preferred: false,
      credentialMode: "no_real_key_no_live_api",
      doesNotSatisfy: [
        "live_connectivity",
        "key_rotation_evidence",
        "proof_freshness",
        "first_write_approval",
        "apply",
        "deploy",
        "scheduler",
        "checkpoint",
      ],
      safetyNote:
        "No-live self-test: runs the prompt wrapper's direct guard self-test. It verifies the internal preflight before key entry and does not call Recall, load an env file, or read a real key.",
      regressionCommand: liveRead.promptGuardSmokeCommand ?? null,
    });
  }
  if (liveRead.optionalNoWritePromptCommand) {
    commands.push({
      id: "first_apply_live_diagnostic_prompt",
      command: liveRead.optionalNoWritePromptCommand,
      mode: "read_only",
      preferred: liveRead.primarySafeReadOnlyDiagnosticCommand === liveRead.optionalNoWritePromptCommand,
      credentialMode: "local_prompt_env_file_disabled",
      preKeyGuarded: true,
      guardedBy: liveRead.promptGuardSelfTestCommand ?? null,
      outputFile: liveRead.optionalNoWritePromptOutputFile ?? null,
      outputFileMode: "0600",
      doesNotSatisfy: [
        "key_rotation_evidence",
        "proof_freshness",
        "first_write_approval",
        "apply",
        "deploy",
        "scheduler",
        "checkpoint",
      ],
      safetyNote:
        liveRead.promptDiagnosticBypassesLocalLiveGate
          ? "Runs the internal no-live prompt guard before key entry, prompts locally for the Recall key, forces the read-only probe to ignore env files, writes sanitized JSON only to the private output file, and may continue even when the local env-file live gate is not ready. First-write gates remain blocked."
          : "Runs the internal no-live prompt guard before key entry, prompts locally for the Recall key, forces the read-only probe to ignore env files, writes sanitized JSON only to the private output file, then runs the status-preserving first-apply diagnostic.",
    });
  }
  if (liveRead.optionalNoWriteWrapperCommand) {
    commands.push({
      id: "first_apply_live_diagnostic",
      command: liveRead.optionalNoWriteWrapperCommand,
      mode: "read_only",
      preferred: liveRead.primarySafeReadOnlyDiagnosticCommand === liveRead.optionalNoWriteWrapperCommand,
      outputFile: liveRead.optionalNoWriteWrapperOutputFile ?? null,
      outputFileMode: liveRead.optionalNoWriteWrapperOutputFile ? "0600" : null,
      doesNotSatisfy: [
        "key_rotation_evidence",
        "proof_freshness",
        "first_write_approval",
        "apply",
        "deploy",
        "scheduler",
        "checkpoint",
      ],
      safetyNote:
        "Runs the status-preserving first-apply diagnostic wrapper, writes sanitized JSON only to the private output file when supplied, then exactly one read-only Recall /cards auth probe.",
    });
  }
  if (liveRead.optionalNoWriteReportCheckCommand) {
    commands.push({
      id: "first_apply_live_diagnostic_report_check",
      command: liveRead.optionalNoWriteReportCheckCommand,
      mode: "no_live_private_file_check",
      preferred: false,
      outputFile: liveRead.optionalNoWriteReportPath ?? null,
      doesNotSatisfy: [
        "live_connectivity",
        "key_rotation_evidence",
        "proof_freshness",
        "first_write_approval",
        "apply",
        "deploy",
        "scheduler",
        "checkpoint",
      ],
      safetyNote:
        "Validates an existing private live diagnostic report without calling Recall. Passing this check must not be used as key evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint permission.",
    });
  }
  if (liveRead.optionalNoWriteCommand) {
    commands.push({
      id: "live_auth_probe",
      command: liveRead.optionalNoWriteCommand,
      mode: "read_only",
      preferred: false,
      doesNotSatisfy: [
        "key_rotation_evidence",
        "proof_freshness",
        "first_write_approval",
        "apply",
        "deploy",
        "scheduler",
        "checkpoint",
      ],
      safetyNote:
        "Lower-level read-only Recall /cards auth probe. Prefer first_apply_live_diagnostic_prompt when using first-apply status output.",
    });
  }
  return commands;
}

function readOnlyDiagnosticNextAction(diagnostics) {
  const liveRead = diagnostics?.liveReadConnectivity ?? {};
  const command =
    liveRead.primarySafeReadOnlyDiagnosticCommand ??
    liveRead.optionalNoWritePromptCommand ??
    liveRead.optionalNoWriteWrapperCommand;
  if (!command) return null;
  const usingPrompt = command === liveRead.optionalNoWritePromptCommand;
  const proof = liveRead.latestPrivateDiagnosticProof;
  const existingProof = proof?.ok
    ? ` Existing private diagnostic proof already passes no-live validation at ${proof.diagnosticOutputFile?.path ?? proof.reportPath}; it reached Recall with HTTP ${proof.liveAuthProbe?.httpStatus}. Rerun only if fresher read-only proof is needed.`
    : "";
  const fallback = !usingPrompt && liveRead.promptFallbackReadOnlyDiagnosticCommand
    ? ` Prompt fallback when the persisted env file is stale or intentionally not trusted: ${liveRead.promptFallbackReadOnlyDiagnosticCommand}.`
    : "";
  const guard = liveRead.promptGuardSelfTestCommand
    ? ` The prompt command also runs its internal no-live guard before key entry. Optional no-live prompt self-test before entering a key: ${liveRead.promptGuardSelfTestCommand}. Regression smoke: ${liveRead.promptGuardSmokeCommand}.`
    : "";
  return `Optional read-only live diagnostic is available: ${command}. This does not satisfy key rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.${existingProof}${fallback}${guard}`;
}

function summarizeLiveDiagnosticProof(result, reportPath, checkCommand) {
  const parsed = result?.parsed ?? {};
  const summary = parsed.summary ?? {};
  const proofOk = result?.ok === true && parsed.ok === true && parsed.verdict === "PASS_RECALL_LIVE_DIAGNOSTIC_REPORT";
  return {
    ok: proofOk,
    verdict: parsed.verdict ?? null,
    reportPath: parsed.reportPath ?? resolve(reportPath),
    configuredReportPath: reportPath,
    checkCommand,
    mode: summary.mode ?? null,
    statusBeforeProbe: summary.statusBeforeProbe ?? null,
    failedChecks: Array.isArray(summary.failedChecks) ? summary.failedChecks : [],
    diagnosticOutputFile: summary.diagnosticOutputFile
      ? {
          path: summary.diagnosticOutputFile.path ?? null,
          written: summary.diagnosticOutputFile.written === true,
          mode: summary.diagnosticOutputFile.mode ?? null,
          statMode: summary.diagnosticOutputFile.statMode ?? null,
          sizeBytes: summary.diagnosticOutputFile.sizeBytes ?? null,
          mtimeIso: summary.diagnosticOutputFile.mtimeIso ?? null,
        }
      : null,
    liveAuthProbe: summary.liveAuthProbe
      ? {
          ok: summary.liveAuthProbe.ok === true,
          endpoint: summary.liveAuthProbe.endpoint ?? null,
          method: summary.liveAuthProbe.method ?? null,
          httpStatus: summary.liveAuthProbe.httpStatus ?? null,
          authenticated: summary.liveAuthProbe.authenticated ?? null,
          reachable: summary.liveAuthProbe.reachable ?? null,
          totalCount: summary.liveAuthProbe.totalCount ?? null,
          resultCount: summary.liveAuthProbe.resultCount ?? null,
          envFileMtimeAfterCheckpoint: summary.liveAuthProbe.envFileMtimeAfterCheckpoint ?? null,
        }
      : null,
    firstWriteSafety: summary.firstWriteSafety
      ? {
          proofRefreshAllowedNow: summary.firstWriteSafety.proofRefreshAllowedNow ?? null,
          applyAllowedNow: summary.firstWriteSafety.applyAllowedNow ?? null,
          proofRefreshAllowedByThisProbe: summary.firstWriteSafety.proofRefreshAllowedByThisProbe ?? null,
          applyAllowedByThisProbe: summary.firstWriteSafety.applyAllowedByThisProbe ?? null,
        }
      : null,
    doesNotAuthorize: [
      "key_rotation_evidence",
      "proof_freshness",
      "first_write_approval",
      "apply",
      "deploy",
      "scheduler",
      "checkpoint",
    ],
    findings: summarizeFindings(parsed.findings),
    safetyNote:
      "This summarizes an existing private diagnostic report without calling Recall. It proves only that the artifact checker accepted the prior read-only diagnostic report; it must not authorize proof refresh, first capped apply, deploy, scheduler, or checkpoint movement.",
  };
}

function summarizeKeyEvidence(result) {
  if (result.skipped) return { skipped: true, ok: true };
  const parsed = result.parsed ?? {};
  return {
    ok: result.ok === true,
    verdict: parsed.verdict ?? null,
    envFile: parsed.summary?.envFile ?? null,
    evidenceFile: parsed.summary?.evidenceFile ?? null,
    minRotatedAfterIso: parsed.summary?.minRotatedAfterIso ?? null,
    mtimeIso: parsed.summary?.mtimeIso ?? null,
    mode: parsed.summary?.mode ?? null,
    underPrivateRecallEvidencePath: parsed.summary?.underPrivateRecallEvidencePath ?? null,
    ignored: parsed.summary?.ignored ?? null,
    tracked: parsed.summary?.tracked ?? null,
    privateEvidenceFile: parsed.summary?.privateEvidenceFile ?? null,
    findings: summarizeFindings(parsed.findings),
  };
}

function summarizeReadiness(result) {
  const parsed = result.parsed ?? {};
  const checked = Array.isArray(parsed.checked)
    ? parsed.checked.map((check) => ({
        id: check.id,
        ok: check.ok === true,
        verdict: check.verdict ?? null,
        details: summarizeCheckDetails(check),
      }))
    : [];
  return {
    ok: result.ok === true,
    verdict: parsed.verdict ?? null,
    failedChecks: readinessFailureIds(parsed),
    checked,
    findings: summarizeFindings(parsed.findings),
  };
}

function readinessFailureIds(parsed) {
  const ids = new Set();
  if (Array.isArray(parsed?.checked)) {
    for (const check of parsed.checked) {
      if (check?.ok !== true && check?.id) ids.add(check.id);
    }
  }
  if (Array.isArray(parsed?.findings)) {
    for (const finding of parsed.findings) {
      if (finding?.id) ids.add(finding.id);
    }
  }
  return [...ids];
}

function summarizeCheckDetails(check) {
  if (check.id === "dry_run_report_proof") {
    return {
      cardsSeen: check.details?.cardsSeen ?? null,
      cardsPlannedForImport: check.details?.cardsPlannedForImport ?? null,
      checkpointAdvanced: check.details?.checkpointAdvanced ?? null,
      proofFreshness: check.details?.proofFreshness ?? null,
    };
  }
  if (check.id === "backup_proof") {
    return {
      sizeBytes: check.sizeBytes ?? null,
      mtimeIso: check.mtimeIso ?? null,
      mode: check.mode ?? null,
      ageMinutes: check.ageMinutes ?? null,
      maxAgeMinutes: check.maxAgeMinutes ?? null,
      freshnessRemainingMinutes: check.freshnessRemainingMinutes ?? null,
      futureSkewMinutes: check.futureSkewMinutes ?? null,
      integrity: check.integrity ?? null,
    };
  }
  if (check.id === "key_rotation_evidence") {
    return {
      envFile: check.details?.envFile ?? null,
      minRotatedAfterIso: check.details?.minRotatedAfterIso ?? null,
      mtimeIso: check.details?.mtimeIso ?? null,
      mode: check.details?.mode ?? null,
      underPrivateRecallEvidencePath: check.details?.underPrivateRecallEvidencePath ?? null,
      ignored: check.details?.ignored ?? null,
      tracked: check.details?.tracked ?? null,
    };
  }
  return check.details ?? null;
}

function summarizeFindings(findings) {
  if (!Array.isArray(findings)) return [];
  return findings.map((finding) => ({
    id: finding.id ?? null,
    rule: finding.rule ?? null,
    message: redact(String(finding.message ?? "")),
  }));
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
    envFilePath: DEFAULT_ENV_FILE,
    keyRotationEvidenceFilePath: DEFAULT_KEY_ROTATION_EVIDENCE_FILE,
    keyRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    dryRunReportPath: DEFAULT_DRY_RUN_REPORT,
    backupPath: DEFAULT_BACKUP_PATH,
    applyReportPath: DEFAULT_APPLY_REPORT,
    applyReportMaxAgeMinutes: DEFAULT_DURABLE_APPLY_REPORT_EVIDENCE_MAX_AGE_MINUTES,
    liveDiagnosticReportPath: DEFAULT_ENV_FILE_LIVE_DIAGNOSTIC_OUTPUT,
    acceptedFidelityRisk: DEFAULT_ACCEPTED_FIDELITY_RISK,
    maxPlannedImports: 5,
    dryRunReportMaxAgeMinutes: 120,
    backupMaxAgeMinutes: 120,
    minFreshnessRemainingMinutes: 5,
    allowUnsafeManifestForSmoke: false,
    allowNonPrivateDryRunReport: false,
    allowNonPrivateBackup: false,
    skipPrivateIgnore: false,
    skipLiveGateStatus: false,
    skipKeyRotationEvidence: false,
    skipApprovalPacket: false,
    skipPublicDocsPrivacy: false,
    skipCompletedApplyCheck: false,
    requireReady: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--require-ready") parsed.requireReady = true;
    else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--key-rotation-evidence-file" && next) {
      parsed.keyRotationEvidenceFilePath = next;
      i += 1;
    } else if (arg === "--key-rotated-after" && next) {
      parsed.keyRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--dry-run-report" && next) {
      parsed.dryRunReportPath = next;
      i += 1;
    } else if (arg === "--backup-path" && next) {
      parsed.backupPath = next;
      i += 1;
    } else if ((arg === "--completed-apply-report" || arg === "--apply-report") && next) {
      parsed.applyReportPath = next;
      i += 1;
    } else if (arg === "--apply-report-max-age-minutes" && next) {
      parsed.applyReportMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if ((arg === "--live-diagnostic-report" || arg === "--live-diagnostic-report-path") && next) {
      parsed.liveDiagnosticReportPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--max-planned-imports" && next) {
      parsed.maxPlannedImports = parseNonNegativeInt(arg, next);
      i += 1;
    } else if (arg === "--dry-run-report-max-age-minutes" && next) {
      parsed.dryRunReportMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--backup-max-age-minutes" && next) {
      parsed.backupMaxAgeMinutes = parsePositiveNumber(arg, next);
      i += 1;
    } else if (arg === "--min-freshness-remaining-minutes" && next) {
      parsed.minFreshnessRemainingMinutes = parseNonNegativeNumber(arg, next);
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") parsed.allowUnsafeManifestForSmoke = true;
    else if (arg === "--allow-non-private-dry-run-report") parsed.allowNonPrivateDryRunReport = true;
    else if (arg === "--allow-non-private-backup") parsed.allowNonPrivateBackup = true;
    else if (arg === "--skip-private-ignore") parsed.skipPrivateIgnore = true;
    else if (arg === "--skip-live-gate-status") parsed.skipLiveGateStatus = true;
    else if (arg === "--skip-key-rotation-evidence") parsed.skipKeyRotationEvidence = true;
    else if (arg === "--skip-approval-packet") parsed.skipApprovalPacket = true;
    else if (arg === "--skip-public-docs-privacy") parsed.skipPublicDocsPrivacy = true;
    else if (arg === "--skip-completed-apply-check") parsed.skipCompletedApplyCheck = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return parsed;
}

function script(name) {
  return resolve("scripts", name);
}

function buildLiveDiagnosticReportCheckCommand(reportPath) {
  return `npm run check:recall-live-diagnostic-report -- --report ${reportPath}`;
}

function parsePositiveNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be a positive number.`);
  return parsed;
}

function parseNonNegativeNumber(label, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative number.`);
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
  console.log(`Recall first capped apply status helper

Usage:
  npm run recall:first-apply:status
  npm run recall:first-apply:status -- --require-ready
  npm run recall:first-apply:status -- --completed-apply-report data/private/recall-live-spikes/first-apply-report.json
  npm run recall:first-apply:status -- --live-diagnostic-report data/private/recall-live-spikes/live-diagnostic-report.json

This command does not call live Recall APIs, does not refresh proof, does not
apply, and does not advance a checkpoint. It runs the local key-rotation
evidence gate, first-apply readiness gate, and optional no-live private
diagnostic report checker, then prints a no-secret next action summary. If the
durable first-apply report already passed post-apply review, stale pre-apply
proof is ignored and the command points to the second manual verification gate.
`);
}
