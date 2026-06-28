#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const PRIVATE_ROOT = "data/private/recall-live-spikes";
const DEFAULT_OUTPUT = "data/private/recall-live-spikes/scheduler-enable-evidence.json";
const DEFAULT_PRODUCTION_DEPLOY_EVIDENCE = "data/private/recall-live-spikes/production-deploy-evidence.json";
const MAX_SERVICE_REPORT_SKEW_MS = 10 * 60 * 1000;
const MAX_TIMESTAMP_SKEW_MS = 60 * 1000;
const REQUIRED_APPROVAL =
  "I approve enabling the production Recall -> AI Brain daily scheduler after at least two clean manual runs, using the deployed scheduler artifacts, the rotated private Recall env file, explicit live API confirmation, production timer brain-recall-sync.timer, and private scheduler enablement evidence recording.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (process.env.BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL !== REQUIRED_APPROVAL) {
  fail(
    "missing_exact_scheduler_enablement_approval",
    "Exact BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL text is required before recording scheduler enablement evidence.",
    2,
  );
}

if (!isUnderPrivateRoot(resolve(args.outputPath))) {
  fail("output_not_private", `Scheduler enablement evidence must stay under ${PRIVATE_ROOT}/.`, 2);
}

if (args.manualCleanRuns.length < 2) {
  fail("insufficient_manual_clean_run_args", "At least two --manual-clean-run kind=path entries are required.", 2);
}
validateDistinctManualCleanRunArgs(args.manualCleanRuns);

if (!args.firstRunApplyReportPath) {
  fail("missing_first_run_apply_report", "--first-run-apply-report is required.", 2);
}
validateFirstRunApplyReportArgDistinct(args.firstRunApplyReportPath, args.manualCleanRuns);

const deployProof = validateProductionDeployEvidence(args.productionDeployEvidencePath);
const manualCleanRuns = args.manualCleanRuns.map((entry) => validateApplyReport(entry.kind, entry.applyReportPath, args));
const firstRunApplyReport = validateApplyReport("first_scheduled_service_run", args.firstRunApplyReportPath, args);
const systemState = args.systemStateFilePath ? readSystemStateFile(args.systemStateFilePath) : collectRemoteState(args.sshHost);
validateFirstRunTiming(firstRunApplyReport, systemState);

const checkedAtIso = new Date().toISOString();
const evidence = {
  ok: true,
  verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
  target: "production",
  checkedAtIso,
  enabledAtIso: systemState.enabledAtIso ?? checkedAtIso,
  approval: {
    approvedBy: args.approvedBy,
    scope: "scheduler_enablement_after_repeated_clean_runs",
  },
  productionDeployVerdict: deployProof.verdict,
  manualCleanRunsBeforeEnable: manualCleanRuns.length,
  manualCleanRuns,
  timer: {
    unit: "brain-recall-sync.timer",
    enabled: systemState.timer.enabled === true,
    active: systemState.timer.active === true,
    activeSinceIso: systemState.timer.activeSinceIso,
    nextElapseIso: systemState.timer.nextElapseIso,
  },
  service: {
    unit: "brain-recall-sync.service",
    lastRunOk: systemState.service.lastRunOk === true,
    lastRunExitCode: systemState.service.lastRunExitCode,
    lastRunCompletedAtIso: systemState.service.lastRunCompletedAtIso,
  },
  recallEnv: {
    syncEnabled: systemState.recallEnv.syncEnabled === true,
    schedulerEnabled: systemState.recallEnv.schedulerEnabled === true,
    confirmLiveApi: systemState.recallEnv.confirmLiveApi === true,
  },
  firstRun: {
    ok: firstRunApplyReport.ok === true && systemState.service.lastRunOk === true,
    exitCode: systemState.service.lastRunExitCode,
    applyReportVerdict: firstRunApplyReport.applyReportVerdict,
    applyReportPath: firstRunApplyReport.applyReportPath,
    completedAtIso: firstRunApplyReport.completedAtIso,
  },
};

mkdirSync(dirname(resolve(args.outputPath)), { recursive: true });
writeFileSync(resolve(args.outputPath), `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
chmodSync(resolve(args.outputPath), 0o600);

const gate = spawnSync(
  process.execPath,
  ["--", "scripts/check-recall-completion-evidence.mjs", "--kind", "scheduler-enable", "--evidence", args.outputPath],
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (gate.status !== 0) {
  fail("recorded_scheduler_evidence_failed_gate", "Recorded scheduler enablement evidence did not pass the strict gate.", 1, {
    gate: parseJson(gate.stderr || gate.stdout) ?? { exitCode: gate.status },
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceFile: args.outputPath,
      verdict: "PASS_RECALL_SCHEDULER_ENABLEMENT_VERIFICATION",
      manualCleanRunEvidenceCount: manualCleanRuns.length,
      firstRunApplyReportPath: firstRunApplyReport.applyReportPath,
      timer: evidence.timer,
      service: evidence.service,
      recallEnv: evidence.recallEnv,
      safetyNotes: [
        "No Recall API key was printed or stored.",
        "No raw Recall content, source URLs, titles, chunks, or private payload fields were printed or stored.",
        "This command records evidence only; it does not enable timers, call Recall, apply, deploy, or advance checkpoints.",
      ],
    },
    null,
    2,
  ),
);

function validateProductionDeployEvidence(path) {
  const result = spawnSync(
    process.execPath,
    ["--", "scripts/check-recall-completion-evidence.mjs", "--kind", "production-deploy", "--evidence", path],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail("production_deploy_evidence_invalid", "Production deploy evidence must pass before scheduler evidence is recorded.", 1, {
      gate: parseJson(result.stderr || result.stdout) ?? { exitCode: result.status },
    });
  }
  const parsed = parseJson(result.stdout);
  return { verdict: parsed?.verdict ?? "PASS_RECALL_PRODUCTION_DEPLOY_VERIFICATION" };
}

function validateApplyReport(kind, reportPath, parsedArgs) {
  const checkerArgs = [
    "scripts/check-recall-apply-report.mjs",
    "--report",
    reportPath,
    "--max-applied-imports",
    String(parsedArgs.maxAppliedImports),
    "--max-age-minutes",
    String(parsedArgs.applyReportMaxAgeMinutes),
    "--require-private-path",
  ];
  if (parsedArgs.allowWeakUpgrades) checkerArgs.push("--allow-weak-upgrades");
  if (parsedArgs.allowUnverifiedFidelity) checkerArgs.push("--allow-unverified-fidelity");
  if (parsedArgs.allowPossiblyTruncatedFidelity) checkerArgs.push("--allow-possibly-truncated-fidelity");
  if (parsedArgs.allowMetadataOnlyFidelity) checkerArgs.push("--allow-metadata-only-fidelity");
  if (parsedArgs.allowNoCheckpointAdvance) checkerArgs.push("--allow-no-checkpoint-advance");

  const result = parsedArgs.sshHost
    ? runRemoteNode(parsedArgs.sshHost, checkerArgs)
    : spawnSync(process.execPath, ["--", ...checkerArgs], { cwd: process.cwd(), encoding: "utf8" });

  if (result.status !== 0) {
    fail("apply_report_invalid", `Apply report for ${kind} did not pass post-apply review.`, 1, {
      reportPath,
      checker: parseJson(result.stderr || result.stdout) ?? { exitCode: result.status },
    });
  }

  const completedAtIso = parsedArgs.sshHost ? remoteFileMtimeIso(parsedArgs.sshHost, reportPath) : localFileMtimeIso(reportPath);
  return {
    ok: true,
    kind,
    completedAtIso,
    applyReportVerdict: "PASS_POST_APPLY_REVIEW_GATE",
    applyReportPath: reportPath,
  };
}

function validateDistinctManualCleanRunArgs(manualCleanRuns) {
  const seenApplyReportPaths = new Map();
  const seenKinds = new Set();
  for (const run of manualCleanRuns) {
    if (seenKinds.has(run.kind)) {
      fail(
        "duplicate_manual_clean_run_kind",
        "Manual clean-run evidence must use distinct kind labels before scheduler enablement.",
        2,
        {
          duplicateKind: run.kind,
        },
      );
    }
    seenKinds.add(run.kind);

    const normalizedPath = resolve(run.applyReportPath);
    if (seenApplyReportPaths.has(normalizedPath)) {
      fail(
        "duplicate_manual_clean_run_apply_report",
        "Manual clean-run evidence must reference distinct reviewed apply reports before scheduler enablement.",
        2,
        {
          firstKind: seenApplyReportPaths.get(normalizedPath),
          duplicateKind: run.kind,
        },
      );
    }
    seenApplyReportPaths.set(normalizedPath, run.kind);
  }
}

function validateFirstRunApplyReportArgDistinct(firstRunApplyReportPath, manualCleanRuns) {
  const normalizedFirstRunPath = resolve(firstRunApplyReportPath);
  for (const run of manualCleanRuns) {
    if (resolve(run.applyReportPath) === normalizedFirstRunPath) {
      fail(
        "duplicate_first_run_apply_report",
        "First scheduled service-run evidence must reference a distinct apply report from the pre-enable manual clean runs.",
        2,
        {
          duplicateManualRunKind: run.kind,
        },
      );
    }
  }
}

function validateFirstRunTiming(firstRunApplyReport, systemState) {
  const firstRunCompletedAtMs = Date.parse(firstRunApplyReport.completedAtIso);
  const timerActiveSinceMs = Date.parse(systemState.timer.activeSinceIso);
  const serviceCompletedAtMs = Date.parse(systemState.service.lastRunCompletedAtIso);

  if (firstRunCompletedAtMs + MAX_TIMESTAMP_SKEW_MS < timerActiveSinceMs) {
    fail(
      "first_run_before_scheduler_activation",
      "First scheduled service-run apply report must be completed after the scheduler timer is active.",
      2,
      {
        firstRunCompletedAtIso: firstRunApplyReport.completedAtIso,
        timerActiveSinceIso: systemState.timer.activeSinceIso,
      },
    );
  }

  if (serviceCompletedAtMs + MAX_TIMESTAMP_SKEW_MS < timerActiveSinceMs) {
    fail(
      "service_run_before_scheduler_activation",
      "The latest brain-recall-sync.service completion must be after scheduler timer activation.",
      2,
      {
        serviceLastRunCompletedAtIso: systemState.service.lastRunCompletedAtIso,
        timerActiveSinceIso: systemState.timer.activeSinceIso,
      },
    );
  }

  if (Math.abs(serviceCompletedAtMs - firstRunCompletedAtMs) > MAX_SERVICE_REPORT_SKEW_MS) {
    fail(
      "first_run_apply_report_not_latest_service_run",
      "First scheduled service-run apply report mtime must align with the latest successful brain-recall-sync.service run.",
      2,
      {
        firstRunCompletedAtIso: firstRunApplyReport.completedAtIso,
        serviceLastRunCompletedAtIso: systemState.service.lastRunCompletedAtIso,
        maxSkewMinutes: MAX_SERVICE_REPORT_SKEW_MS / 60 / 1000,
      },
    );
  }
}

function readSystemStateFile(path) {
  if (!existsSync(resolve(path))) {
    fail("missing_system_state_file", `System state fixture does not exist: ${path}`, 2);
  }
  const state = parseJson(readFileSync(resolve(path), "utf8"));
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    fail("invalid_system_state_file", "System state fixture must be a JSON object.", 2);
  }
  return normalizeSystemState(state);
}

function collectRemoteState(sshHost) {
  if (!sshHost) {
    fail(
      "missing_state_source",
      "Provide --ssh-host for production inspection or --system-state-file for offline smoke recording.",
      2,
    );
  }
  const timerEnabled = remoteText(sshHost, "systemctl is-enabled brain-recall-sync.timer 2>/dev/null || true").trim();
  const timerActive = remoteText(sshHost, "systemctl is-active brain-recall-sync.timer 2>/dev/null || true").trim();
  const timerActiveSinceIso = remoteSystemdIso(
    sshHost,
    "systemctl show brain-recall-sync.timer --property=ActiveEnterTimestamp --value 2>/dev/null || true",
    "timer active timestamp",
  );
  const serviceResult = remoteText(
    sshHost,
    "systemctl show brain-recall-sync.service --property=Result --value 2>/dev/null || true",
  ).trim();
  const serviceStatusRaw = remoteText(
    sshHost,
    "systemctl show brain-recall-sync.service --property=ExecMainStatus --value 2>/dev/null || true",
  ).trim();
  const serviceCompletedAtIso = remoteSystemdIso(
    sshHost,
    "systemctl show brain-recall-sync.service --property=ExecMainExitTimestamp --value 2>/dev/null || true",
    "service last run completion timestamp",
  );
  const nextElapseIso = remoteSystemdIso(
    sshHost,
    "systemctl show brain-recall-sync.timer --property=NextElapseUSecRealtime --value 2>/dev/null || true",
    "timer next elapse timestamp",
  );
  const envLines = remoteText(
    sshHost,
    "sudo bash -lc 'set -a; source /etc/brain/.env; set +a; printf \"%s\\n%s\\n%s\\n\" \"${BRAIN_RECALL_SYNC_ENABLED:-0}\" \"${BRAIN_RECALL_SCHEDULER_ENABLED:-0}\" \"${BRAIN_RECALL_CONFIRM_LIVE_API:-0}\"'",
  )
    .split(/\r?\n/)
    .map((line) => line.trim());
  return normalizeSystemState({
    enabledAtIso: timerActiveSinceIso,
    timer: {
      enabled: timerEnabled === "enabled",
      active: timerActive === "active",
      activeSinceIso: timerActiveSinceIso,
      nextElapseIso,
    },
    service: {
      lastRunOk: serviceResult === "success" && Number(serviceStatusRaw) === 0,
      lastRunExitCode: Number(serviceStatusRaw),
      lastRunCompletedAtIso: serviceCompletedAtIso,
    },
    recallEnv: {
      syncEnabled: envLines[0] === "1",
      schedulerEnabled: envLines[1] === "1",
      confirmLiveApi: envLines[2] === "1",
    },
  });
}

function normalizeSystemState(state) {
  const normalized = {
    enabledAtIso: state.enabledAtIso ?? new Date().toISOString(),
    timer: state.timer ?? {},
    service: state.service ?? {},
    recallEnv: state.recallEnv ?? {},
  };
  assertIso(normalized.enabledAtIso, "enabledAtIso");
  assertIso(normalized.timer.nextElapseIso, "timer.nextElapseIso");
  assertIso(normalized.timer.activeSinceIso, "timer.activeSinceIso");
  if (typeof normalized.timer.enabled !== "boolean") fail("invalid_timer_enabled", "timer.enabled must be boolean.", 2);
  if (typeof normalized.timer.active !== "boolean") fail("invalid_timer_active", "timer.active must be boolean.", 2);
  if (typeof normalized.service.lastRunOk !== "boolean") {
    fail("invalid_service_last_run_ok", "service.lastRunOk must be boolean.", 2);
  }
  if (!Number.isInteger(normalized.service.lastRunExitCode)) {
    fail("invalid_service_last_run_exit_code", "service.lastRunExitCode must be an integer.", 2);
  }
  assertIso(normalized.service.lastRunCompletedAtIso, "service.lastRunCompletedAtIso");
  for (const key of ["syncEnabled", "schedulerEnabled", "confirmLiveApi"]) {
    if (typeof normalized.recallEnv[key] !== "boolean") {
      fail("invalid_recall_env_flag", `recallEnv.${key} must be boolean.`, 2);
    }
  }
  return normalized;
}

function localFileMtimeIso(path) {
  if (!existsSync(resolve(path))) fail("missing_apply_report", `Apply report does not exist: ${path}`, 2);
  return statSync(resolve(path)).mtime.toISOString();
}

function remoteFileMtimeIso(sshHost, path) {
  const epoch = Number(remoteText(sshHost, `cd /opt/brain && stat -c %Y ${shellQuote(path)}`).trim());
  if (!Number.isFinite(epoch)) fail("remote_apply_report_stat_failed", `Could not stat remote apply report: ${path}`, 1);
  return new Date(epoch * 1000).toISOString();
}

function runRemoteNode(sshHost, args) {
  const command = `cd /opt/brain && ${["node", "--", ...args].map(shellQuote).join(" ")}`;
  return spawnSync("ssh", [sshHost, command], { cwd: process.cwd(), encoding: "utf8" });
}

function remoteText(sshHost, command) {
  const result = spawnSync("ssh", [sshHost, command], { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) {
    fail("remote_command_failed", "Failed to collect remote scheduler state.", 1, {
      command: redact(command),
      exitCode: result.status,
      stderr: redact(result.stderr),
    });
  }
  return result.stdout;
}

function parseArgs(argv) {
  const parsed = {
    outputPath: DEFAULT_OUTPUT,
    productionDeployEvidencePath: DEFAULT_PRODUCTION_DEPLOY_EVIDENCE,
    approvedBy: "Arun scheduler enablement approval in Codex thread",
    manualCleanRuns: [],
    firstRunApplyReportPath: null,
    systemStateFilePath: null,
    sshHost: null,
    maxAppliedImports: 20,
    applyReportMaxAgeMinutes: 10080,
    allowWeakUpgrades: false,
    allowUnverifiedFidelity: false,
    allowPossiblyTruncatedFidelity: false,
    allowMetadataOnlyFidelity: false,
    allowNoCheckpointAdvance: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if ((arg === "--output" || arg === "--evidence-file") && next) {
      parsed.outputPath = next;
      i += 1;
    } else if (arg === "--production-deploy-evidence" && next) {
      parsed.productionDeployEvidencePath = next;
      i += 1;
    } else if (arg === "--approved-by" && next) {
      parsed.approvedBy = next;
      i += 1;
    } else if (arg === "--manual-clean-run" && next) {
      parsed.manualCleanRuns.push(parseManualCleanRunArg(next));
      i += 1;
    } else if (arg === "--first-run-apply-report" && next) {
      parsed.firstRunApplyReportPath = next;
      i += 1;
    } else if (arg === "--system-state-file" && next) {
      parsed.systemStateFilePath = next;
      i += 1;
    } else if (arg === "--ssh-host" && next) {
      parsed.sshHost = next;
      i += 1;
    } else if (arg === "--max-applied-imports" && next) {
      parsed.maxAppliedImports = parseNonNegativeInt(arg, next);
      i += 1;
    } else if (arg === "--apply-report-max-age-minutes" && next) {
      parsed.applyReportMaxAgeMinutes = parsePositiveInt(arg, next);
      i += 1;
    } else if (arg === "--allow-weak-upgrades") parsed.allowWeakUpgrades = true;
    else if (arg === "--allow-unverified-fidelity") parsed.allowUnverifiedFidelity = true;
    else if (arg === "--allow-possibly-truncated-fidelity") parsed.allowPossiblyTruncatedFidelity = true;
    else if (arg === "--allow-metadata-only-fidelity") parsed.allowMetadataOnlyFidelity = true;
    else if (arg === "--allow-no-checkpoint-advance") parsed.allowNoCheckpointAdvance = true;
    else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (parsed.systemStateFilePath && parsed.sshHost) {
    throw new Error("Use either --system-state-file or --ssh-host, not both.");
  }
  return parsed;
}

function parseManualCleanRunArg(value) {
  const splitAt = value.indexOf("=");
  if (splitAt <= 0 || splitAt === value.length - 1) {
    throw new Error("--manual-clean-run must use kind=path format.");
  }
  return {
    kind: value.slice(0, splitAt),
    applyReportPath: value.slice(splitAt + 1),
  };
}

function remoteSystemdIso(sshHost, systemctlCommand, label) {
  const command = [
    "set -euo pipefail",
    `ts="$(${systemctlCommand})"`,
    'if [ -z "$ts" ] || [ "$ts" = "n/a" ]; then exit 42; fi',
    'date -u -d "$ts" "+%Y-%m-%dT%H:%M:%S.%3NZ"',
  ].join("; ");
  const value = remoteText(sshHost, `bash -lc ${shellQuote(command)}`).trim();
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  fail("invalid_remote_iso_timestamp", `Remote host did not return a valid ISO timestamp for ${label}.`, 1, {
    timestampPreview: redact(value),
  });
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

function assertIso(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    fail("invalid_iso", `${label} must be a valid ISO timestamp.`, 2);
  }
}

function parseNonNegativeInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${label} must be a non-negative integer.`);
  return parsed;
}

function parsePositiveInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function fail(code, message, exitCode, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code,
        message,
        ...extra,
        safetyNotes: [
          "No Recall API key was printed.",
          "No raw Recall content, source URLs, titles, chunks, or private payload fields were printed.",
          "No scheduler timer was enabled by this command.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function redact(value) {
  return String(value)
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bRECALL_API_KEY\s*=\s*[^\s"'<>]+/gi, "RECALL_API_KEY=<redacted>");
}

function printHelp() {
  console.log(`Record private Recall scheduler enablement evidence

Usage:
  BRAIN_RECALL_SCHEDULER_ENABLE_APPROVAL="${REQUIRED_APPROVAL}" \\
    npm run recall:scheduler-enable-evidence:record -- \\
      --ssh-host brain \\
      --manual-clean-run manual_first_capped_apply=data/private/recall-live-spikes/first-apply-report.json \\
      --manual-clean-run manual_second_guarded_apply=data/private/recall-live-spikes/<second-apply-report>.json \\
      --first-run-apply-report data/private/recall-live-spikes/<scheduled-apply-report>.json \\
      --allow-unverified-fidelity --allow-metadata-only-fidelity

This command records evidence only. It does not enable systemd timers, call Recall,
apply imports, deploy, or advance checkpoints.
`);
}
