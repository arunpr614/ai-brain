#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_MANIFEST = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_PRODUCTION_DEPLOY_EVIDENCE = "data/private/recall-live-spikes/production-deploy-evidence.json";
const FIRST_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/first-apply-report.json";
const SECOND_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json";
const ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json";
const PREVIOUS_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json";
const LATEST_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json";
const CURRENT_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json";
const FIRST_SCHEDULED_RUN_REPORT_PLACEHOLDER =
  "data/private/recall-live-spikes/<first-scheduled-service-run-apply-report>.json";
const APPROVAL_ENV = "BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL";
const APPROVAL =
  "I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const currentGate = args.skipChecksForSmoke
  ? skippedJson("current_gate_skipped_for_smoke", currentGateFixture(args))
  : runJsonCommand(["scripts/check-recall-current-gate.mjs"]);
const completionStatus = args.skipChecksForSmoke
  ? skippedJson("completion_status_skipped_for_smoke", completionFixture(args))
  : runJsonCommand(["scripts/check-recall-daily-sync-completion-status.mjs"]);
const productionDeployEvidence = args.skipChecksForSmoke
  ? skippedJson("production_deploy_evidence_skipped_for_smoke", { ok: true, verdict: "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION" })
  : runJsonCommand([
      "scripts/check-recall-completion-evidence.mjs",
      "--kind",
      "production-deploy",
      "--evidence",
      args.productionDeployEvidencePath,
    ]);
const schedulerArtifacts = args.skipChecksForSmoke
  ? skippedProcess("scheduler_artifacts_skipped_for_smoke")
  : runProcess(["scripts/check-recall-scheduler-artifacts.mjs"]);
const publicDocsPrivacy = args.skipChecksForSmoke
  ? skippedJson("public_docs_privacy_skipped_for_smoke", { ok: true, scannedFiles: 130 })
  : runJsonCommand(["scripts/check-recall-public-docs-privacy.mjs"]);
const prelive = args.skipPrelive
  ? skippedJson("prelive_skipped", { ok: true, status: "prelive_skipped" })
  : args.skipChecksForSmoke
    ? skippedJson("prelive_skipped_for_smoke", preliveFixture())
    : runJsonCommand(["scripts/check-recall-prelive-readiness.mjs", "--manifest", args.manifestPath]);

const approvalStatus = {
  requiredEnv: APPROVAL_ENV,
  exactApprovalPresent: process.env[APPROVAL_ENV] === APPROVAL,
  approvalTextPrinted: true,
};

const checks = {
  currentGate: summarizeCurrentGate(currentGate),
  completionStatus: summarizeCompletionStatus(completionStatus),
  productionDeployEvidence: summarizeJsonResult(productionDeployEvidence, ["ok", "verdict"]),
  schedulerArtifacts: summarizeProcess(schedulerArtifacts),
  publicDocsPrivacy: summarizeJsonResult(publicDocsPrivacy, ["ok", "scannedFiles"]),
  prelive: summarizePrelive(prelive),
};
const manualCleanRuns = extractManualCleanRuns(completionStatus.parsed);

const findings = [
  ...currentGateFindings(checks.currentGate),
  ...completionFindings(checks.completionStatus),
  ...manualCleanRunConsistencyFindings(checks.currentGate, checks.completionStatus),
  ...simpleCheckFindings("production_deploy_evidence", checks.productionDeployEvidence),
  ...simpleCheckFindings("scheduler_artifacts", checks.schedulerArtifacts),
  ...simpleCheckFindings("public_docs_privacy", checks.publicDocsPrivacy),
  ...preliveFindings(checks.prelive),
];

const ok = findings.length === 0;
const handoffProgress = {
  stoppedAt: ok ? "ready_for_exact_scheduler_approval" : "scheduler_handoff_precheck_failed",
  readyForExactSchedulerApproval: ok,
  blockingFindingIds: findings.map((finding) => finding.id),
  approvalRequiredEnv: APPROVAL_ENV,
  exactApprovalAlreadyPresent: approvalStatus.exactApprovalPresent,
  schedulerEnablementAttempted: false,
  liveWriteAttempted: false,
  checkpointAdvanced: false,
  liveCallNotAttemptedBecause: ok
    ? "this handoff is no-live/no-write; exact scheduler approval is the next required action before enabling the timer"
    : "scheduler handoff prechecks failed before printing the approved sequence as ready",
};

const result = {
  ok,
  mode: "scheduler_enablement_command_handoff",
  noLiveNoWrite: true,
  approvalRequired: true,
  approvalStatus,
  host: args.host,
  manifestPath: args.manifestPath,
  requiredManualCleanRunsBeforeSchedulerEnable: 2,
  manualCleanRuns,
  checks,
  handoffProgress,
  commands: ok ? buildCommands(manualCleanRuns) : null,
  commandNotes: [
    "Printing this handoff is not approval and does not run the scheduler.",
    `Run the production enablement commands only after Arun provides the exact ${APPROVAL_ENV} text.`,
    "After timer/flag enablement and the first scheduled service run, run npm run recall:scheduler-evidence:command to print the read-only first-run inspection and evidence-recording sequence.",
    "The evidence recorder validates and records private evidence only; it does not enable timers, call Recall, apply imports, deploy, or advance checkpoints.",
    "Replace the first scheduled service run apply-report placeholder with the actual private report created by the first scheduler/service run.",
  ],
  findings,
  safetyNote:
    "This handoff command is no-live/no-write. It does not call Recall, import data, deploy, enable a scheduler, write evidence, or advance checkpoints.",
};

const output = args.json ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result);
if (!ok) {
  console.error(output);
  process.exit(1);
}

process.stdout.write(output);

function buildCommands(manualRuns) {
  const approval = `${APPROVAL_ENV}=${shellQuote(APPROVAL)}`;
  const enableCommand = [
    `${approval} \\`,
    `ssh ${shellQuote(args.host)} ${shellQuote(
      [
        `${schedulerEnvUpsertCommand({
          syncEnabled: "1",
          schedulerEnabled: "1",
          confirmLiveApi: "1",
          requireDryRunProof: "1",
          requireBackupProof: "1",
          allowUnverifiedImport: "1",
          allowMetadataOnlyImport: "1",
          warningUiAvailable: "1",
        })} &&`,
        "sudo systemctl daemon-reload &&",
        "sudo systemctl enable --now brain-recall-sync.timer &&",
        "systemctl list-timers brain-recall-sync.timer",
      ].join(" \\\n"),
    )}`,
  ].join("\n");

  return {
    noLivePrechecks: [
      "npm run recall:current-gate",
      `npm run check:recall-prelive -- --manifest ${args.manifestPath}`,
      "npm run recall:daily-sync:completion-status",
    ],
    schedulerEnablement: enableCommand,
    firstRunEvidenceHandoff: "npm run recall:scheduler-evidence:command",
    evidenceRecording: [
      `${approval} \\`,
      "npm run recall:scheduler-enable-evidence:record -- \\",
      `  --ssh-host ${shellQuote(args.host)} \\`,
      ...manualRuns.map((run) => `  --manual-clean-run ${run.kind}=${shellQuote(run.applyReportPath)} \\`),
      `  --first-run-apply-report ${shellQuote(FIRST_SCHEDULED_RUN_REPORT_PLACEHOLDER)} \\`,
      "  --allow-unverified-fidelity \\",
      "  --allow-metadata-only-fidelity",
    ].join("\n"),
    verification: [
      "npm run check:recall-scheduler-enable-evidence -- --evidence data/private/recall-live-spikes/scheduler-enable-evidence.json",
      "npm run recall:daily-sync:completion-status -- --require-complete",
      "npm run check:recall-goal-completion-audit",
    ],
    emergencyDisable: `ssh ${shellQuote(args.host)} ${shellQuote(
      [
        "sudo systemctl disable --now brain-recall-sync.timer || true &&",
        `${schedulerEnvUpsertCommand({
          syncEnabled: "0",
          schedulerEnabled: "0",
          confirmLiveApi: "0",
          requireDryRunProof: "1",
          requireBackupProof: "1",
          allowUnverifiedImport: "0",
          allowMetadataOnlyImport: "0",
          warningUiAvailable: "0",
        })} &&`,
        "sudo systemctl daemon-reload",
      ].join(" \\\n"),
    )}`,
  };
}

function schedulerEnvUpsertCommand({
  syncEnabled,
  schedulerEnabled,
  confirmLiveApi,
  requireDryRunProof,
  requireBackupProof,
  allowUnverifiedImport,
  allowMetadataOnlyImport,
  warningUiAvailable,
}) {
  const script = [
    "set -e",
    "file=/etc/brain/.env",
    "backup=/etc/brain/.env.scheduler-$(date -u +%Y%m%dT%H%M%SZ).bak",
    'cp "$file" "$backup"',
    "upsert() {",
    '  key="$1"',
    '  value="$2"',
    '  if grep -Eq "^(export[[:space:]]+)?${key}=" "$file"; then',
    '    sed -i -E "s|^(export[[:space:]]+)?${key}=.*|export ${key}=${value}|" "$file"',
    "  else",
    '    printf "\\nexport %s=%s\\n" "$key" "$value" >> "$file"',
    "  fi",
    "}",
    `upsert BRAIN_RECALL_SYNC_ENABLED ${syncEnabled}`,
    `upsert BRAIN_RECALL_SCHEDULER_ENABLED ${schedulerEnabled}`,
    `upsert BRAIN_RECALL_CONFIRM_LIVE_API ${confirmLiveApi}`,
    `upsert BRAIN_RECALL_REQUIRE_DRY_RUN_PROOF ${requireDryRunProof}`,
    `upsert BRAIN_RECALL_REQUIRE_BACKUP_PROOF ${requireBackupProof}`,
    `upsert BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT ${allowUnverifiedImport}`,
    `upsert BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT ${allowMetadataOnlyImport}`,
    `upsert BRAIN_RECALL_WARNING_UI_AVAILABLE ${warningUiAvailable}`,
    'chmod 640 "$file"',
  ].join("\n");
  return `sudo sh -c ${shellQuote(script)}`;
}

function summarizeCurrentGate(result) {
  const readiness =
    result.parsed?.manualCleanRunReadiness ?? result.parsed?.requiredBeforeScheduler?.manualCleanRunReadiness ?? {};
  return {
    ok:
      result.exitCode === 0 &&
      result.parsed?.ok === true &&
      result.parsed?.status === "ready_for_scheduler_enablement_approval" &&
      result.parsed?.currentBlockingGate === "scheduler_enablement" &&
      result.parsed?.schedulerAllowedNow === true &&
      result.parsed?.approvalRequiredEnv === APPROVAL_ENV &&
      readiness.cleanRunCount >= 2 &&
      readiness.needsSecondManualVerificationRun === false &&
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence === true,
    skipped: result.skipped === true,
    exitCode: result.exitCode,
    status: result.parsed?.status ?? null,
    currentBlockingGate: result.parsed?.currentBlockingGate ?? null,
    approvalRequiredEnv: result.parsed?.approvalRequiredEnv ?? null,
    schedulerAllowedNow: result.parsed?.schedulerAllowedNow ?? null,
    noLiveNoWrite: result.parsed?.noLiveNoWrite ?? null,
    cleanRunCount: readiness.cleanRunCount ?? null,
    needsSecondManualVerificationRun: readiness.needsSecondManualVerificationRun ?? null,
    schedulerEnablementApprovalAllowedByManualRunEvidence:
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
  };
}

function summarizeCompletionStatus(result) {
  const schedulerRequirement = result.parsed?.requirements?.find?.((entry) => entry.id === "scheduler_enablement");
  const readiness =
    result.parsed?.nextGate?.manualCleanRunReadiness ?? schedulerRequirement?.evidence?.manualCleanRunReadiness ?? {};
  const cleanRunEvidenceCount = Array.isArray(readiness.cleanRuns) ? readiness.cleanRuns.length : 0;
  return {
    ok:
      result.exitCode === 0 &&
      result.parsed?.status === "blocked_scheduler_enablement" &&
      result.parsed?.activeBlockedRequirement === "scheduler_enablement" &&
      readiness.cleanRunCount >= 2 &&
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence === true &&
      cleanRunEvidenceCount === readiness.cleanRunCount,
    skipped: result.skipped === true,
    exitCode: result.exitCode,
    status: result.parsed?.status ?? null,
    completionAchieved: result.parsed?.completionAchieved ?? null,
    activeBlockedRequirement: result.parsed?.activeBlockedRequirement ?? null,
    blockedActions: result.parsed?.blockedActions ?? null,
    schedulerEvidenceStatus: schedulerRequirement?.evidence?.status ?? null,
    cleanRunCount: readiness.cleanRunCount ?? null,
    cleanRunEvidenceCount,
    schedulerEnablementApprovalAllowedByManualRunEvidence:
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
  };
}

function summarizePrelive(result) {
  return {
    ok:
      result.skipped === true ||
      (result.exitCode === 0 &&
        result.parsed?.ok === true &&
        result.parsed?.nextGate?.currentProductionGate?.currentBlockingGate === "scheduler_enablement"),
    skipped: result.skipped === true,
    status: result.parsed?.status ?? result.status ?? null,
    currentBlockingGate: result.parsed?.nextGate?.currentProductionGate?.currentBlockingGate ?? null,
    resultCount: result.parsed?.results?.length ?? null,
    failed: result.parsed?.results?.filter?.((entry) => entry.status !== "passed").map((entry) => entry.id) ?? [],
  };
}

function summarizeJsonResult(result, fields) {
  const summary = {
    ok: result.exitCode === 0 && result.parsed?.ok === true,
    skipped: result.skipped === true,
    exitCode: result.exitCode,
  };
  for (const field of fields) summary[field] = result.parsed?.[field] ?? null;
  return summary;
}

function summarizeProcess(result) {
  return {
    ok: result.exitCode === 0,
    skipped: result.skipped === true,
    exitCode: result.exitCode,
    status: result.status ?? null,
  };
}

function currentGateFindings(summary) {
  return summary.ok
    ? []
    : [
        {
          id: "current_gate_not_ready_for_scheduler_approval",
          message: "Current gate must be ready_for_scheduler_enablement_approval before scheduler handoff is ready.",
          status: summary.status,
          currentBlockingGate: summary.currentBlockingGate,
        },
      ];
}

function completionFindings(summary) {
  return summary.ok
    ? []
    : [
        {
          id: "completion_status_not_scheduler_ready",
          message:
            "Completion status must be blocked only on scheduler_enablement and expose evidence for every counted clean manual run.",
          status: summary.status,
          cleanRunCount: summary.cleanRunCount,
          cleanRunEvidenceCount: summary.cleanRunEvidenceCount,
        },
      ];
}

function manualCleanRunConsistencyFindings(currentGateSummary, completionSummary) {
  if (!currentGateSummary.ok || !completionSummary.ok) return [];
  if (currentGateSummary.cleanRunCount === completionSummary.cleanRunCount) return [];
  return [
    {
      id: "manual_clean_run_count_mismatch",
      message: "Current-gate and completion-status clean manual run counts must match before scheduler handoff.",
      currentGateCleanRunCount: currentGateSummary.cleanRunCount,
      completionStatusCleanRunCount: completionSummary.cleanRunCount,
    },
  ];
}

function simpleCheckFindings(id, summary) {
  return summary.ok ? [] : [{ id: `${id}_failed`, message: `${id} check failed before scheduler handoff.`, summary }];
}

function preliveFindings(summary) {
  return summary.ok ? [] : [{ id: "prelive_not_scheduler_ready", message: "Pre-live must pass and expose scheduler_enablement as current gate.", summary }];
}

function runJsonCommand(args) {
  const result = runProcess(args);
  return {
    ...result,
    parsed: parseJson(result.stdout) ?? parseJson(result.stderr) ?? {},
  };
}

function runProcess(args) {
  const result = spawnSync(process.execPath, ["--", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { exitCode: result.status, stdout: redact(result.stdout), stderr: redact(result.stderr) };
}

function skippedJson(status, parsed) {
  return { skipped: true, status, exitCode: 0, stdout: "", stderr: "", parsed };
}

function skippedProcess(status) {
  return { skipped: true, status, exitCode: 0, stdout: "", stderr: "" };
}

function currentGateFixture(options = {}) {
  const cleanRunCount = options.smokeCurrentGateCleanRunCount ?? 6;
  return {
    ok: true,
    status: "ready_for_scheduler_enablement_approval",
    currentBlockingGate: "scheduler_enablement",
    schedulerAllowedNow: true,
    approvalRequiredEnv: APPROVAL_ENV,
    noLiveNoWrite: true,
    manualCleanRunReadiness: {
      requiredManualCleanRunsBeforeSchedulerEnable: 2,
      cleanRunCount,
      needsSecondManualVerificationRun: false,
      schedulerEnablementApprovalAllowedByManualRunEvidence: true,
    },
  };
}

function completionFixture(options = {}) {
  const cleanRunCount = options.smokeCompletionCleanRunCount ?? 6;
  return {
    ok: false,
    status: "blocked_scheduler_enablement",
    completionAchieved: false,
    activeBlockedRequirement: "scheduler_enablement",
    blockedActions: ["scheduler", "checkpoint"],
    requirements: [
      {
        id: "scheduler_enablement",
        evidence: {
          status: "missing_evidence_file",
          manualCleanRunReadiness: {
            cleanRunCount,
            schedulerEnablementApprovalAllowedByManualRunEvidence: true,
            cleanRuns: [
              {
                kind: "manual_first_capped_apply",
                applyReportPath: FIRST_MANUAL_RUN_REPORT,
              },
              {
                kind: "manual_second_guarded_apply_candidate",
                applyReportPath: SECOND_MANUAL_RUN_REPORT,
              },
              {
                kind: "manual_second_guarded_apply_candidate",
                applyReportPath: ADDITIONAL_MANUAL_RUN_REPORT,
              },
              {
                kind: "manual_second_guarded_apply_candidate",
                applyReportPath: PREVIOUS_ADDITIONAL_MANUAL_RUN_REPORT,
              },
              {
                kind: "manual_second_guarded_apply_candidate",
                applyReportPath: LATEST_ADDITIONAL_MANUAL_RUN_REPORT,
              },
              {
                kind: "manual_second_guarded_apply_candidate",
                applyReportPath: CURRENT_ADDITIONAL_MANUAL_RUN_REPORT,
              },
            ],
          },
        },
      },
    ],
  };
}

function extractManualCleanRuns(parsed) {
  const schedulerRequirement = parsed?.requirements?.find?.((entry) => entry.id === "scheduler_enablement");
  const readiness = parsed?.nextGate?.manualCleanRunReadiness ?? schedulerRequirement?.evidence?.manualCleanRunReadiness ?? {};
  const cleanRuns = Array.isArray(readiness.cleanRuns) ? readiness.cleanRuns : [];
  const sourceRuns =
    cleanRuns.length > 0
      ? cleanRuns
      : [
          { kind: "manual_first_capped_apply", applyReportPath: FIRST_MANUAL_RUN_REPORT },
          { kind: "manual_second_guarded_apply_candidate", applyReportPath: SECOND_MANUAL_RUN_REPORT },
        ];
  const usedKinds = new Set();
  return sourceRuns.map((run, index) => {
    const kind = uniqueManualRunKind(run?.kind, index, usedKinds);
    return {
      kind,
      sourceKind: run?.kind ?? null,
      applyReportPath: normalizeApplyReportPath(run?.applyReportPath ?? ""),
    };
  });
}

function uniqueManualRunKind(sourceKind, index, usedKinds) {
  let base;
  if (index === 0) base = "manual_first_capped_apply";
  else if (index === 1) base = "manual_second_guarded_apply";
  else {
    const sanitized = sanitizeKind(sourceKind);
    base =
      sanitized === "manual_second_guarded_apply_candidate"
        ? `manual_additional_guarded_apply_${index}`
        : sanitized || `manual_additional_guarded_apply_${index}`;
  }
  let candidate = base;
  let suffix = 2;
  while (usedKinds.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKinds.add(candidate);
  return candidate;
}

function sanitizeKind(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeApplyReportPath(path) {
  const text = String(path ?? "").trim();
  if (!text) return text;
  const resolved = resolve(text);
  const relativePath = relative(process.cwd(), resolved);
  return relativePath && !relativePath.startsWith("..") ? relativePath : text;
}

function preliveFixture() {
  return {
    ok: true,
    status: "offline_readiness_passed",
    results: [{ id: "fixture", status: "passed" }],
    nextGate: { currentProductionGate: { currentBlockingGate: "scheduler_enablement" } },
  };
}

function parseArgs(argv) {
  const parsed = {
    host: DEFAULT_HOST,
    manifestPath: DEFAULT_MANIFEST,
    productionDeployEvidencePath: DEFAULT_PRODUCTION_DEPLOY_EVIDENCE,
    json: false,
    skipChecksForSmoke: false,
    smokeCurrentGateCleanRunCount: null,
    smokeCompletionCleanRunCount: null,
    skipPrelive: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--skip-checks-for-smoke") parsed.skipChecksForSmoke = true;
    else if (arg === "--smoke-current-gate-clean-run-count" && next) {
      parsed.smokeCurrentGateCleanRunCount = parsePositiveInteger(next, arg);
      i += 1;
    } else if (arg === "--smoke-completion-clean-run-count" && next) {
      parsed.smokeCompletionCleanRunCount = parsePositiveInteger(next, arg);
      i += 1;
    } else if (arg === "--skip-prelive") parsed.skipPrelive = true;
    else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--production-deploy-evidence" && next) {
      parsed.productionDeployEvidencePath = next;
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (
    !parsed.skipChecksForSmoke &&
    (parsed.smokeCurrentGateCleanRunCount !== null || parsed.smokeCompletionCleanRunCount !== null)
  ) {
    throw new Error("Smoke fixture overrides require --skip-checks-for-smoke");
  }
  return parsed;
}

function parsePositiveInteger(value, flag) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return number;
}

function toMarkdown(result) {
  const lines = [
    "# Recall Scheduler Enablement Command Handoff",
    "",
    `Status: \`${result.handoffProgress.stoppedAt}\``,
    `No-live/no-write: \`${result.noLiveNoWrite}\``,
    `Approval env: \`${APPROVAL_ENV}\``,
    "",
    "## Checks",
    "",
    `- Current gate: \`${result.checks.currentGate.status}\``,
    `- Completion status: \`${result.checks.completionStatus.status}\``,
    `- Clean manual runs: \`${result.checks.completionStatus.cleanRunCount}\``,
    `- Production deploy evidence: \`${result.checks.productionDeployEvidence.ok}\``,
    `- Scheduler artifacts: \`${result.checks.schedulerArtifacts.ok}\``,
    `- Public docs privacy: \`${result.checks.publicDocsPrivacy.ok}\``,
    `- Pre-live: \`${result.checks.prelive.ok}\``,
    "",
    "## Notes",
    "",
    ...result.commandNotes.map((note) => `- ${note}`),
  ];

  if (result.commands) {
    lines.push(
      "",
      "## No-Live Prechecks",
      "",
      "```bash",
      ...result.commands.noLivePrechecks,
      "```",
      "",
      "## Approved Scheduler Enablement Command",
      "",
      "```bash",
      result.commands.schedulerEnablement,
      "```",
      "",
      "## Evidence Recording Command",
      "",
      "```bash",
      result.commands.evidenceRecording,
      "```",
      "",
      "## Verification Commands",
      "",
      "```bash",
      ...result.commands.verification,
      "```",
      "",
      "## Emergency Disable",
      "",
      "```bash",
      result.commands.emergencyDisable,
      "```",
    );
  } else {
    lines.push("", "## Findings", "", ...result.findings.map((finding) => `- ${finding.id}: ${finding.message}`));
  }

  lines.push("", "## Safety", "", result.safetyNote, "");
  return `${lines.join("\n")}\n`;
}

function parseJson(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function redact(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bRECALL_API_KEY\s*=\s*[^\s"'<>]+/gi, "RECALL_API_KEY=<redacted>");
}

function printHelp() {
  console.log(`Recall scheduler enablement command handoff

Usage:
  npm run recall:scheduler-enable:command
  npm run recall:scheduler-enable:command -- --json

This command is no-live/no-write. It verifies the scheduler approval gate and
prints the exact post-approval sequence, but it does not enable timers, call
Recall, write scheduler evidence, or advance checkpoints.
`);
}
