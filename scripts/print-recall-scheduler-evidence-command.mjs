#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const FIRST_SCHEDULED_RUN_REPORT_PLACEHOLDER =
  "data/private/recall-live-spikes/<first-scheduled-service-run-apply-report>.json";
const FIRST_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/first-apply-report.json";
const SECOND_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T050448Z.json";
const ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T063340Z.json";
const PREVIOUS_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T073114Z.json";
const LATEST_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T075410Z.json";
const CURRENT_ADDITIONAL_MANUAL_RUN_REPORT = "data/private/recall-live-spikes/scheduled-apply-20260627T082621Z.json";
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
const publicDocsPrivacy = args.skipChecksForSmoke
  ? skippedJson("public_docs_privacy_skipped_for_smoke", { ok: true, scannedFiles: 130 })
  : runJsonCommand(["scripts/check-recall-public-docs-privacy.mjs"]);

const checks = {
  currentGate: summarizeCurrentGate(currentGate),
  completionStatus: summarizeCompletionStatus(completionStatus),
  publicDocsPrivacy: summarizeJsonResult(publicDocsPrivacy, ["ok", "scannedFiles"]),
};
const manualCleanRuns = extractManualCleanRuns(completionStatus.parsed);
const findings = [
  ...currentGateFindings(checks.currentGate),
  ...completionFindings(checks.completionStatus),
  ...manualCleanRunConsistencyFindings(checks.currentGate, checks.completionStatus),
  ...simpleCheckFindings("public_docs_privacy", checks.publicDocsPrivacy),
];
const ok = findings.length === 0;

const result = {
  ok,
  mode: "scheduler_first_run_evidence_command_handoff",
  noLiveNoWrite: true,
  approvalRequiredEnv: APPROVAL_ENV,
  exactApprovalAlreadyPresent: process.env[APPROVAL_ENV] === APPROVAL,
  host: args.host,
  firstRunApplyReportPath: args.firstRunApplyReportPath,
  manualCleanRuns,
  checks,
  handoffProgress: {
    stoppedAt: ok ? "ready_for_post_enable_first_run_evidence" : "first_run_evidence_handoff_precheck_failed",
    blockingFindingIds: findings.map((finding) => finding.id),
    schedulerEnablementAttempted: false,
    liveWriteAttempted: false,
    checkpointAdvanced: false,
    evidenceRecorded: false,
  },
  commands: ok ? buildCommands(manualCleanRuns) : null,
  commandNotes: [
    "Run this after exact scheduler approval, timer/flag enablement, and the first scheduled service run.",
    "This handoff only prints read-only inspection and evidence-recording commands; it does not run them.",
    "The first scheduled service-run apply report must be new, distinct from all pre-enable manual reports, and completed after scheduler timer activation.",
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
  const firstRunPath = args.firstRunApplyReportPath;
  return {
    readOnlyFirstRunInspection: `ssh ${shellQuote(args.host)} ${shellQuote(
      [
        "set -e",
        "systemctl is-enabled brain-recall-sync.timer",
        "systemctl is-active brain-recall-sync.timer",
        "systemctl show brain-recall-sync.timer --property=ActiveEnterTimestamp --value",
        "systemctl show brain-recall-sync.service --property=ExecMainExitTimestamp --value",
        "cd /opt/brain",
        'find data/private/recall-live-spikes -maxdepth 1 -name "scheduled-apply-*.json" -printf "%T@ %p\\n" | sort -nr | head -5',
      ].join(" && "),
    )}`,
    reviewCandidateFirstRunReport: `ssh ${shellQuote(args.host)} ${shellQuote(
      [
        "cd /opt/brain",
        [
          "node",
          "--",
          "scripts/check-recall-apply-report.mjs",
          "--report",
          firstRunPath,
          "--max-applied-imports",
          "20",
          "--require-private-path",
          "--allow-unverified-fidelity",
          "--allow-metadata-only-fidelity",
        ]
          .map(shellQuote)
          .join(" "),
      ].join(" && "),
    )}`,
    evidenceRecording: [
      `${approval} \\`,
      "npm run recall:scheduler-enable-evidence:record -- \\",
      `  --ssh-host ${shellQuote(args.host)} \\`,
      ...manualRuns.map((run) => `  --manual-clean-run ${run.kind}=${shellQuote(run.applyReportPath)} \\`),
      `  --first-run-apply-report ${shellQuote(firstRunPath)} \\`,
      "  --allow-unverified-fidelity \\",
      "  --allow-metadata-only-fidelity",
    ].join("\n"),
    verification: [
      "npm run check:recall-scheduler-enable-evidence -- --evidence data/private/recall-live-spikes/scheduler-enable-evidence.json",
      "npm run recall:daily-sync:completion-status -- --require-complete",
      "npm run check:recall-goal-completion-audit",
    ],
  };
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
      readiness.cleanRunCount >= 2 &&
      readiness.needsSecondManualVerificationRun === false &&
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence === true,
    skipped: result.skipped === true,
    exitCode: result.exitCode,
    status: result.parsed?.status ?? null,
    currentBlockingGate: result.parsed?.currentBlockingGate ?? null,
    schedulerAllowedNow: result.parsed?.schedulerAllowedNow ?? null,
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
    activeBlockedRequirement: result.parsed?.activeBlockedRequirement ?? null,
    cleanRunCount: readiness.cleanRunCount ?? null,
    cleanRunEvidenceCount,
    schedulerEnablementApprovalAllowedByManualRunEvidence:
      readiness.schedulerEnablementApprovalAllowedByManualRunEvidence ?? null,
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

function currentGateFindings(summary) {
  return summary.ok
    ? []
    : [
        {
          id: "current_gate_not_scheduler_ready",
          message: "Current gate must be ready_for_scheduler_enablement_approval before first-run evidence handoff is ready.",
          status: summary.status,
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
            "Completion status must be blocked only on scheduler_enablement and expose every counted manual clean-run report.",
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
      message: "Current-gate and completion-status clean manual run counts must match before first-run evidence handoff.",
      currentGateCleanRunCount: currentGateSummary.cleanRunCount,
      completionStatusCleanRunCount: completionSummary.cleanRunCount,
    },
  ];
}

function simpleCheckFindings(id, summary) {
  return summary.ok ? [] : [{ id: `${id}_failed`, message: `${id} check failed before first-run evidence handoff.`, summary }];
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
          { kind: "manual_second_guarded_apply_candidate", applyReportPath: ADDITIONAL_MANUAL_RUN_REPORT },
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

function currentGateFixture(options = {}) {
  const cleanRunCount = options.smokeCurrentGateCleanRunCount ?? 6;
  return {
    ok: true,
    status: "ready_for_scheduler_enablement_approval",
    currentBlockingGate: "scheduler_enablement",
    schedulerAllowedNow: true,
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
    activeBlockedRequirement: "scheduler_enablement",
    requirements: [
      {
        id: "scheduler_enablement",
        evidence: {
          manualCleanRunReadiness: {
            cleanRunCount,
            schedulerEnablementApprovalAllowedByManualRunEvidence: true,
            cleanRuns: [
              { kind: "manual_first_capped_apply", applyReportPath: FIRST_MANUAL_RUN_REPORT },
              { kind: "manual_second_guarded_apply_candidate", applyReportPath: SECOND_MANUAL_RUN_REPORT },
              { kind: "manual_second_guarded_apply_candidate", applyReportPath: ADDITIONAL_MANUAL_RUN_REPORT },
              { kind: "manual_second_guarded_apply_candidate", applyReportPath: PREVIOUS_ADDITIONAL_MANUAL_RUN_REPORT },
              { kind: "manual_second_guarded_apply_candidate", applyReportPath: LATEST_ADDITIONAL_MANUAL_RUN_REPORT },
              { kind: "manual_second_guarded_apply_candidate", applyReportPath: CURRENT_ADDITIONAL_MANUAL_RUN_REPORT },
            ],
          },
        },
      },
    ],
  };
}

function parseArgs(argv) {
  const parsed = {
    host: DEFAULT_HOST,
    firstRunApplyReportPath: FIRST_SCHEDULED_RUN_REPORT_PLACEHOLDER,
    json: false,
    skipChecksForSmoke: false,
    smokeCurrentGateCleanRunCount: null,
    smokeCompletionCleanRunCount: null,
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
    } else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--first-run-apply-report" && next) {
      parsed.firstRunApplyReportPath = next;
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

function printHelp() {
  console.log(`Usage: node scripts/print-recall-scheduler-evidence-command.mjs [options]

Prints the no-live/no-write post-enable first scheduled service-run evidence handoff.

Options:
  --json
  --host <ssh-host>                         Default: ${DEFAULT_HOST}
  --first-run-apply-report <private-path>   Default: ${FIRST_SCHEDULED_RUN_REPORT_PLACEHOLDER}
`);
}

function toMarkdown(value) {
  const commands = value.commands ?? {};
  return `# Recall Scheduler First-Run Evidence Handoff

- Mode: ${value.mode}
- No-live/no-write: ${value.noLiveNoWrite}
- Status: ${value.handoffProgress.stoppedAt}
- Manual clean runs: ${value.manualCleanRuns.length}

## Read-Only First-Run Inspection

\`\`\`bash
${commands.readOnlyFirstRunInspection ?? "# unavailable until prechecks pass"}
\`\`\`

## Candidate Apply Report Review

\`\`\`bash
${commands.reviewCandidateFirstRunReport ?? "# unavailable until prechecks pass"}
\`\`\`

## Evidence Recording

\`\`\`bash
${commands.evidenceRecording ?? "# unavailable until prechecks pass"}
\`\`\`

## Verification

\`\`\`bash
${(commands.verification ?? []).join("\n")}
\`\`\`

${value.safetyNote}
`;
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

function redact(value) {
  return String(value ?? "")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/gi, "Bearer [REDACTED]");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
