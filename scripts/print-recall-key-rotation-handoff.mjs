#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_LIVE_DIAGNOSTIC_REPORT = "data/private/recall-live-spikes/live-diagnostic-report.json";
const DEFAULT_KEY_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const DEFAULT_COMPLETED_APPLY_REPORT = "data/private/recall-live-spikes/first-apply-report.json";
const SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET =
  "docs/plans/recall-sync/RECALL_SECOND_MANUAL_VERIFICATION_APPLY_APPROVAL_PACKET_2026-06-27_00-14-29_IST.md";
const SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND = "npm run recall:second-manual:production-command";
const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const handoff = buildHandoff();

if (args.json) {
  console.log(JSON.stringify(handoff, null, 2));
} else {
  console.log(toMarkdown(handoff));
}

function buildHandoff() {
  const keyGate = runKeyGate();
  const firstApplyStatus = args.skipStatus ? null : runFirstApplyStatus();
  const firstApplyCompleted = firstApplyStatus?.parsed?.status === "first_capped_apply_completed";
  const keySummary = keyGate.parsed?.summary ?? {};
  const privateEvidenceFile = keySummary.privateEvidenceFile ?? {};
  const failedRules = keyGate.ok
    ? []
    : (keyGate.parsed?.findings ?? []).map((finding) => finding.rule).filter(Boolean);
  const status = firstApplyStatus?.parsed?.status ?? (keyGate.ok ? "key_rotation_evidence_passed" : "blocked_key_rotation_evidence");

  return {
    ok: true,
    mode: "recall_key_rotation_handoff",
    noLiveNoWrite: true,
    currentPhase: firstApplyCompleted ? "first_apply_completed" : "pre_first_apply_key_rotation",
    currentGate: {
      status,
      firstApplyCompleted,
      keyRotationEvidenceOk: keyGate.ok,
      failedRules,
      envFile: {
        path: args.envFile,
        exists: keySummary.exists ?? null,
        mtimeIso: keySummary.mtimeIso ?? null,
        mode: keySummary.mode ?? null,
        ignored: keySummary.ignored ?? null,
        tracked: keySummary.tracked ?? null,
        underPrivateRecallEvidencePath: keySummary.underPrivateRecallEvidencePath ?? null,
      },
      evidenceFile: {
        path: args.evidenceFile,
        exists: privateEvidenceFile.exists ?? null,
        mtimeIso: privateEvidenceFile.mtimeIso ?? null,
        mode: privateEvidenceFile.mode ?? null,
        ignored: privateEvidenceFile.ignored ?? null,
        tracked: privateEvidenceFile.tracked ?? null,
        underPrivateRecallEvidencePath: privateEvidenceFile.underPrivateRecallEvidencePath ?? null,
      },
      firstApplyStatus: firstApplyStatus?.parsed
        ? {
            ok: firstApplyStatus.parsed.ok === true,
            status: firstApplyStatus.parsed.status ?? null,
            currentBlockingGate: firstApplyStatus.parsed.gateSummary?.currentBlockingGate ?? null,
            blockedActions: firstApplyStatus.parsed.gateSummary?.blockedActions ?? [],
            completedApplyReport: firstApplyStatus.parsed.completedApplyReport ?? null,
          }
        : null,
      readOnlyLiveDiagnostic: summarizeReadOnlyLiveDiagnostic(firstApplyStatus?.parsed),
    },
    requiredExternalAction: firstApplyCompleted
      ? {
          owner: "Arun",
          action: "approve_second_manual_verification_run_before_scheduler_enablement",
          approvalPacket: SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET,
        }
      : {
          owner: "Arun",
          action: "rotate_recall_api_key_outside_chat",
          acknowledgement: REQUIRED_KEY_ROTATION_ACK,
          privateEnvFile: args.envFile,
          privateEvidenceFile: args.evidenceFile,
          keyRotatedAfterIso: args.keyRotatedAfterIso,
        },
    checklist: firstApplyCompleted ? secondManualChecklist() : [
      {
        id: "rotate_key_outside_chat",
        owner: "Arun",
        action: "Rotate the Recall API key outside chat.",
      },
      {
        id: "store_rotated_key_privately",
        owner: "Arun",
        action:
          `Keep the rotated key out of chat and public docs; preferred storage is the next helper command, which writes only ${args.envFile}. Manual editing is fallback-only.`,
      },
      {
        id: "write_rotated_key_with_helper",
        owner: "Arun",
        action:
          "Preferred local storage helper after external rotation: prompts for or reads the rotated key locally, writes it into the ignored private env file with live confirmation disabled, and does not run the live Recall API.",
        command: rotatedEnvWriterCommand(),
      },
      {
        id: "verify_private_file",
        owner: "Codex or Arun",
        action: "Confirm the env file remains ignored, untracked, and owner-only.",
        command: "npm run check:recall-private-ignore",
      },
      {
        id: "run_key_evidence_gate",
        owner: "Codex or Arun",
        action: "Rerun the key-rotation evidence gate.",
        command: "npm run check:recall-key-rotation-evidence",
      },
      {
        id: "prepare_after_rotation",
        owner: "Codex or Arun",
        action:
          "Only after the real external rotation, run the guarded post-rotation prepare command to record private evidence if needed and refresh stale no-write proof.",
        command: realPrepareCommand(),
      },
      {
        id: "stop_before_first_write",
        owner: "Codex",
        action: "Stop at first capped apply approval; do not apply until Arun gives the exact first-write approval text.",
      },
    ],
    commands: {
      noLiveHandoff: "npm run recall:key-rotation:handoff",
      keyEvidenceCheck: "npm run check:recall-key-rotation-evidence",
      privateIgnoreCheck: "npm run check:recall-private-ignore",
      firstApplyStatus: "npm run recall:first-apply:status",
      secondManualReadiness: "npm run recall:second-manual:readiness",
      secondManualProductionCommand: SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND,
      secondManualApprovalPacket: SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET,
      dailySyncCompletionStatus: "npm run recall:daily-sync:completion-status",
      preparePlan: "npm run recall:first-apply:prepare-plan",
      writeRotatedPrivateEnv: rotatedEnvWriterCommand(),
      realPrepareAfterRotation: realPrepareCommand(),
      lowerLevelEvidenceRecorder:
        `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation-evidence:record`,
    },
    blockedUntilKeyEvidencePasses: firstApplyCompleted
      ? []
      : [
          "proof_refresh",
          "first_capped_apply",
          "production_deploy",
          "scheduler_enablement",
          "checkpoint_advancement",
        ],
    blockedUntilCurrentApproval: firstApplyCompleted
      ? ["second_manual_verification", "scheduler_enablement", "checkpoint_advancement"]
      : [],
    safetyNotes: [
      "This handoff command is no-live and no-write.",
      "It does not read, print, store, rotate, or validate the Recall API key value.",
      "It does not record private key-rotation evidence.",
      "It does not refresh proof.",
      "It does not apply, deploy, enable a scheduler, or advance a checkpoint.",
      firstApplyCompleted
        ? "First capped apply is already complete; key-rotation handoff details are historical context, not the current production gate."
        : "The chat-pasted Recall API key must not be used; use only the ignored private env-file path after external rotation.",
    ],
  };
}

function secondManualChecklist() {
  return [
    {
      id: "confirm_completed_first_apply",
      owner: "Codex or Arun",
      action: "Confirm first capped apply remains complete through the first-apply status helper.",
      command: "npm run recall:first-apply:status",
    },
    {
      id: "run_second_manual_readiness",
      owner: "Codex or Arun",
      action: "Run the no-live second manual verification readiness gate.",
      command: "npm run recall:second-manual:readiness",
    },
    {
      id: "print_second_manual_production_command",
      owner: "Codex or Arun",
      action:
        "Run the no-live production command handoff to verify the remote runtime path and print the guarded runner command.",
      command: SECOND_MANUAL_VERIFICATION_PRODUCTION_COMMAND,
    },
    {
      id: "review_second_manual_approval_packet",
      owner: "Arun",
      action: "Review the exact approval packet before any additional production write.",
      command: SECOND_MANUAL_VERIFICATION_APPROVAL_PACKET,
    },
    {
      id: "stop_before_second_manual_write",
      owner: "Codex",
      action:
        "Stop until Arun gives exact second-manual verification approval; do not enable the scheduler or move checkpoints outside the guarded apply path.",
    },
  ];
}

function runKeyGate() {
  return runJsonCommand([
    script("check-recall-key-rotation-evidence.mjs"),
    "--env-file",
    args.envFile,
    "--evidence-file",
    args.evidenceFile,
    "--min-rotated-after",
    args.keyRotatedAfterIso,
  ]);
}

function runFirstApplyStatus() {
  return runJsonCommand([
    script("check-recall-first-apply-status.mjs"),
    "--env-file",
    args.envFile,
    "--key-rotation-evidence-file",
    args.evidenceFile,
    "--key-rotated-after",
    args.keyRotatedAfterIso,
    "--completed-apply-report",
    args.completedApplyReport,
    "--live-diagnostic-report",
    args.liveDiagnosticReport,
    ...(args.skipCompletedApplyCheck ? ["--skip-completed-apply-check"] : []),
  ]);
}

function runJsonCommand(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    exitCode: result.status ?? 1,
    parsed: parseJsonFrom(result.stdout) ?? parseJsonFrom(result.stderr),
  };
}

function parseJsonFrom(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

function realPrepareCommand() {
  return `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`;
}

function rotatedEnvWriterCommand() {
  return `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation:write-env -- --replace-existing`;
}

function summarizeReadOnlyLiveDiagnostic(statusParsed) {
  const live = statusParsed?.diagnostics?.liveReadConnectivity ?? null;
  if (!live) return null;

  const proof = live.latestPrivateDiagnosticProof ?? null;
  const proofOk =
    proof?.ok === true &&
    proof?.liveAuthProbe?.httpStatus === 200 &&
    proof?.liveAuthProbe?.authenticated === true &&
    proof?.liveAuthProbe?.reachable === true;
  const preferredCommand =
    live.primarySafeReadOnlyDiagnosticCommand ??
    live.optionalNoWritePromptCommand ??
    live.optionalNoWriteWrapperCommand ??
    null;

  return {
    status: proofOk
      ? "read_only_live_diagnostic_already_succeeded"
      : preferredCommand
        ? "read_only_live_diagnostic_available"
        : "read_only_live_diagnostic_not_available",
    existingPrivateProofOk: proofOk,
    preferredCommand,
    promptFallbackCommand: live.promptFallbackReadOnlyDiagnosticCommand ?? null,
    reportCheckCommand: live.optionalNoWriteReportCheckCommand ?? null,
    proof: proof
      ? {
          verdict: proof.verdict ?? null,
          reportPath: proof.configuredReportPath ?? proof.reportPath ?? null,
          mode: proof.mode ?? null,
          statusBeforeProbe: proof.statusBeforeProbe ?? null,
          failedChecks: Array.isArray(proof.failedChecks) ? proof.failedChecks : [],
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
                ok: proof.liveAuthProbe.ok === true,
                endpoint: proof.liveAuthProbe.endpoint ?? null,
                method: proof.liveAuthProbe.method ?? null,
                httpStatus: proof.liveAuthProbe.httpStatus ?? null,
                authenticated: proof.liveAuthProbe.authenticated ?? null,
                reachable: proof.liveAuthProbe.reachable ?? null,
                totalCount: proof.liveAuthProbe.totalCount ?? null,
                resultCount: proof.liveAuthProbe.resultCount ?? null,
                envFileMtimeAfterCheckpoint: proof.liveAuthProbe.envFileMtimeAfterCheckpoint ?? null,
              }
            : null,
          doesNotAuthorize: Array.isArray(proof.doesNotAuthorize) ? proof.doesNotAuthorize : [],
        }
      : null,
    firstWriteSafety: statusParsed?.diagnostics?.firstWriteSafety
      ? {
          proofRefreshAllowedNow: statusParsed.diagnostics.firstWriteSafety.proofRefreshAllowedNow ?? null,
          applyAllowedNow: statusParsed.diagnostics.firstWriteSafety.applyAllowedNow ?? null,
          blockedBeforeProofRefreshOrApply:
            statusParsed.diagnostics.firstWriteSafety.blockedBeforeProofRefreshOrApply ?? null,
        }
      : null,
    safetyNote:
      "Read-only live diagnostics are allowed diagnostic context only; they do not satisfy key rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.",
  };
}

function script(name) {
  return `scripts/${name}`;
}

function toMarkdown(handoff) {
  const gate = handoff.currentGate;
  const failedRules = gate.failedRules.length > 0 ? gate.failedRules.map((rule) => `- \`${rule}\``) : ["- None"];
  const lines = [
    "# Recall Key Rotation Handoff",
    "",
    "This handoff is safe to print because it contains no Recall API key, private Recall titles, source URLs, card IDs, chunks, dry-run payloads, apply payloads, or database rows.",
    "",
    "## Current Gate",
    "",
    `- Current phase: \`${handoff.currentPhase}\``,
    `- Status: \`${gate.status}\``,
    `- First apply completed: \`${gate.firstApplyCompleted}\``,
    `- Key rotation evidence passed: \`${gate.keyRotationEvidenceOk}\``,
    `- Env file: \`${gate.envFile.path}\``,
    `- Env file mtime: \`${gate.envFile.mtimeIso ?? "missing"}\``,
    `- Evidence file: \`${gate.evidenceFile.path}\``,
    `- Evidence file exists: \`${gate.evidenceFile.exists}\``,
    "",
    "## Read-only Live Diagnostic",
    "",
    ...readOnlyDiagnosticMarkdown(gate.readOnlyLiveDiagnostic),
    "",
    "## Failed Rules",
    "",
    ...failedRules,
    "",
    "## Checklist",
    "",
    ...handoff.checklist.map((item, index) => {
      const command = item.command ? ` Command: \`${item.command}\`.` : "";
      return `${index + 1}. ${item.action}${command}`;
    }),
    "",
    "## Commands",
    "",
    "```text",
    handoff.commands.privateIgnoreCheck,
    handoff.commands.writeRotatedPrivateEnv,
    handoff.commands.keyEvidenceCheck,
    handoff.commands.preparePlan,
    handoff.commands.realPrepareAfterRotation,
    handoff.commands.firstApplyStatus,
    handoff.commands.secondManualReadiness,
    handoff.commands.secondManualProductionCommand,
    handoff.commands.dailySyncCompletionStatus,
    "```",
    "",
    "## Blocked Until Key Evidence Passes",
    "",
    ...(handoff.blockedUntilKeyEvidencePasses.length > 0
      ? handoff.blockedUntilKeyEvidencePasses.map((item) => `- \`${item}\``)
      : ["- None"]),
    "",
    "## Blocked Until Current Approval",
    "",
    ...(handoff.blockedUntilCurrentApproval.length > 0
      ? handoff.blockedUntilCurrentApproval.map((item) => `- \`${item}\``)
      : ["- None"]),
    "",
    "## Safety Notes",
    "",
    ...handoff.safetyNotes.map((note) => `- ${note}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const parsed = {
    envFile: DEFAULT_ENV_FILE,
    evidenceFile: DEFAULT_EVIDENCE_FILE,
    liveDiagnosticReport: DEFAULT_LIVE_DIAGNOSTIC_REPORT,
    completedApplyReport: DEFAULT_COMPLETED_APPLY_REPORT,
    keyRotatedAfterIso: DEFAULT_KEY_ROTATED_AFTER_ISO,
    json: false,
    skipStatus: false,
    skipCompletedApplyCheck: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--skip-status") {
      parsed.skipStatus = true;
    } else if (arg === "--skip-completed-apply-check") {
      parsed.skipCompletedApplyCheck = true;
    } else if (arg === "--env-file" && next) {
      parsed.envFile = next;
      index += 1;
    } else if (arg === "--evidence-file" && next) {
      parsed.evidenceFile = next;
      index += 1;
    } else if ((arg === "--live-diagnostic-report" || arg === "--live-diagnostic-report-path") && next) {
      parsed.liveDiagnosticReport = next;
      index += 1;
    } else if ((arg === "--completed-apply-report" || arg === "--apply-report") && next) {
      parsed.completedApplyReport = next;
      index += 1;
    } else if (arg === "--key-rotated-after" && next) {
      parsed.keyRotatedAfterIso = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  return parsed;
}

function readOnlyDiagnosticMarkdown(diagnostic) {
  if (!diagnostic) {
    return ["- Status: `not_checked`", "- Existing private proof: `not_checked`"];
  }

  const proof = diagnostic.proof ?? {};
  const probe = proof.liveAuthProbe ?? {};
  const outputFile = proof.diagnosticOutputFile ?? {};
  const lines = [
    `- Status: \`${diagnostic.status}\``,
    `- Existing private proof passed: \`${diagnostic.existingPrivateProofOk}\``,
  ];
  if (outputFile.path || proof.reportPath) {
    lines.push(`- Private proof file: \`${outputFile.path ?? proof.reportPath}\``);
  }
  if (probe.httpStatus != null) {
    lines.push(
      `- Last read-only probe: \`${probe.method ?? "GET"} ${probe.endpoint ?? "/cards"}\` HTTP \`${probe.httpStatus}\`, authenticated \`${probe.authenticated}\`, reachable \`${probe.reachable}\``,
    );
  }
  if (diagnostic.preferredCommand) {
    lines.push(`- Preferred rerun command: \`${diagnostic.preferredCommand}\``);
  }
  if (Array.isArray(proof.doesNotAuthorize) && proof.doesNotAuthorize.length > 0) {
    lines.push(`- Does not authorize: ${proof.doesNotAuthorize.map((item) => `\`${item}\``).join(", ")}`);
  }
  lines.push(`- Safety note: ${diagnostic.safetyNote}`);
  return lines;
}

function printHelp() {
  console.log(`Recall key rotation handoff

Usage:
  npm run recall:key-rotation:handoff
  node scripts/print-recall-key-rotation-handoff.mjs --json
  node scripts/print-recall-key-rotation-handoff.mjs --skip-status --env-file data/private/recall-live-spikes/recall.env

Prints a no-live/no-write handoff for the current key-rotation or post-first-apply gate.
It never reads or prints the Recall API key.
`);
}
