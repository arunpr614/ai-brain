#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_DRY_RUN_REPORT = "data/private/recall-live-spikes/dry-run-report.json";
const DEFAULT_BACKUP_PATH =
  "data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const RECORDABLE_KEY_EVIDENCE_RULES = new Set([
  "env_file_not_rotated_after_checkpoint",
  "missing_key_rotation_evidence_file",
  "key_rotation_evidence_file_not_after_checkpoint",
  "key_rotation_evidence_created_before_checkpoint",
  "key_rotation_evidence_missing_ack",
  "key_rotation_evidence_missing_live_auth_probe",
  "invalid_key_rotation_evidence_json",
]);

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const steps = [];

if (args.planOnly) {
  const status = runStatus("plan_status");
  console.log(JSON.stringify(buildPlan(status), null, 2));
  process.exit(0);
}

if (process.env.BRAIN_RECALL_KEY_ROTATION_ACK !== REQUIRED_KEY_ROTATION_ACK) {
  fail("missing_exact_key_rotation_ack", "Exact BRAIN_RECALL_KEY_ROTATION_ACK text is required before post-rotation first-apply preparation.", 2, {
    steps,
  });
}

let status = runStatus("initial_status");

if (status.parsed?.status === "blocked_key_rotation_evidence") {
  const rules = status.parsed?.keyRotationEvidence?.findings?.map((finding) => finding.rule).filter(Boolean) ?? [];
  const nonRecordableRules = rules.filter((rule) => !RECORDABLE_KEY_EVIDENCE_RULES.has(rule));
  if (nonRecordableRules.length > 0) {
    fail(
      "non_recordable_key_evidence_failure",
      "Key rotation evidence failed on file-safety or env-file rules that the recorder must not bypass.",
      1,
      {
        steps,
        nonRecordableRules,
        nextCommands: ["npm run check:recall-key-rotation-evidence"],
      },
    );
  }

  requirePrepareConfirm("record private key rotation evidence");
  const recorded = runRecorder();
  if (!recorded.ok) {
    fail("private_key_rotation_evidence_record_failed", "Private key rotation evidence recording failed.", recorded.exitCode || 1, {
      steps,
      recorder: recorded.summary,
    });
  }
  status = runStatus("status_after_record");
}

if (status.parsed?.status === "needs_no_write_proof_refresh") {
  requirePrepareConfirm("refresh stale first-apply proof without apply");
  const refreshed = runReadyOrRefresh();
  if (!refreshed.ok) {
    fail("no_write_proof_refresh_failed", "No-write proof refresh failed.", refreshed.exitCode || 1, {
      steps,
      refresh: refreshed.summary,
    });
  }
  status = runStatus("status_after_refresh");
}

if (status.parsed?.status !== "ready_for_first_capped_apply_approval") {
  fail("first_apply_not_ready", "Post-rotation first-apply preparation did not reach machine readiness.", 1, {
    steps,
    finalStatus: summarizeStatus(status.parsed),
    nextCommands: status.parsed?.nextCommands ?? ["npm run recall:first-apply:status"],
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: "first_apply_prepared_after_rotation",
      steps,
      finalStatus: summarizeStatus(status.parsed),
      nextGate:
        "Machine readiness passed. Run the guarded first capped apply wrapper only after exact first-write approval and key rotation acknowledgement.",
      safetyNotes: [
        "No production apply was run.",
        "No production deploy was run.",
        "No scheduler was enabled.",
        "No checkpoint was advanced by this wrapper.",
      ],
    },
    null,
    2,
  ),
);

function buildPlan(status) {
  const currentStatus = summarizeStatus(status.parsed);
  const plannedActions = [
    {
      order: 1,
      id: "external_key_rotation_required",
      action:
        "Rotate the Recall API key outside chat and store the rotated key only in the ignored private Recall env file.",
      requiredBeforeRealPrepare: true,
      writes: [],
      liveRecallApi: false,
    },
    {
      order: 2,
      id: "record_private_key_rotation_evidence_if_needed",
      action:
        "If key evidence still reports missing or stale metadata, record ignored owner-only private key-rotation evidence through the existing recorder.",
      requiredBeforeRealPrepare: false,
      writes: [args.evidenceFilePath],
      liveRecallApi: "one read-only future-window /cards auth probe",
      willNot: ["store the Recall API key", "print private Recall content", "write the AI Brain database", "apply"],
    },
    {
      order: 3,
      id: "refresh_private_proof_if_needed",
      action:
        "If key evidence passes but dry-run or backup proof is stale, refresh proof through the existing no-write ready-or-refresh wrapper.",
      requiredBeforeRealPrepare: false,
      writes: [args.dryRunReportPath, args.backupPath],
      liveRecallApi: "production-capable dry-run reads only, after key evidence passes",
      willNot: ["pass --apply", "advance a checkpoint", "deploy", "enable the scheduler"],
    },
    {
      order: 4,
      id: "stop_at_first_apply_approval",
      action:
        "Stop when machine status reaches ready_for_first_capped_apply_approval; the guarded first capped apply still requires exact write approval.",
      requiredBeforeRealPrepare: false,
      writes: [],
      liveRecallApi: false,
    },
  ];

  return {
    ok: true,
    mode: "first_apply_prepare_after_rotation_plan",
    currentStatus,
    currentGateSummary: status.parsed?.gateSummary ?? null,
    steps,
    realPrepareCommand:
      `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`,
    requiredBeforeRealPrepare: [
      "Recall API key rotated outside chat.",
      "Rotated key stored only in the ignored private Recall env file.",
      "Exact BRAIN_RECALL_KEY_ROTATION_ACK text set.",
      "BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 set.",
    ],
    plannedActions,
    safetyNotes: [
      "Plan mode does not require the key rotation acknowledgement.",
      "Plan mode does not require prepare confirmation.",
      "Plan mode does not record private key-rotation evidence.",
      "Plan mode does not refresh proof.",
      "Plan mode does not call Recall.",
      "Plan mode does not apply, deploy, enable the scheduler, or advance a checkpoint.",
      "Plan mode does not satisfy key-rotation evidence, proof freshness, write approval, apply, deploy, scheduler, or checkpoint gates.",
    ],
    nextGate:
      "Rotate the Recall API key outside chat, then run the real prepare command only with exact acknowledgement and prepare confirmation.",
  };
}

function runStatus(id) {
  const commandArgs = [
    script("check-recall-first-apply-status.mjs"),
    "--enumeration",
    args.enumerationPath,
    "--fidelity",
    args.fidelityPath,
    "--manifest",
    args.manifestPath,
    "--env-file",
    args.envFilePath,
    "--key-rotation-evidence-file",
    args.evidenceFilePath,
    "--key-rotated-after",
    args.keyRotatedAfterIso,
    "--dry-run-report",
    args.dryRunReportPath,
    "--backup-path",
    args.backupPath,
    "--skip-completed-apply-check",
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
    ...smokeStatusArgs(),
  ];
  const result = runNode(commandArgs);
  steps.push({ id, ok: result.ok, exitCode: result.exitCode, status: result.parsed?.status ?? null });
  return result;
}

function runRecorder() {
  const commandArgs = [
    script("record-recall-key-rotation-evidence.mjs"),
    "--env-file",
    args.envFilePath,
    "--evidence-file",
    args.evidenceFilePath,
    "--min-rotated-after",
    args.keyRotatedAfterIso,
    "--base-url",
    args.liveAuthProbeBaseUrl,
    "--date-from",
    args.liveAuthProbeDateFrom,
    "--date-to",
    args.liveAuthProbeDateTo,
  ];
  const result = runNode(commandArgs, {
    ...process.env,
    BRAIN_RECALL_KEY_ROTATION_ACK: REQUIRED_KEY_ROTATION_ACK,
  });
  steps.push({ id: "record_private_key_rotation_evidence", ok: result.ok, exitCode: result.exitCode });
  return {
    ...result,
    summary: {
      ok: result.parsed?.ok === true,
      code: result.parsed?.code ?? null,
      message: result.parsed?.message ?? null,
      evidenceFile: result.parsed?.evidenceFile ?? args.evidenceFilePath,
      gateVerdict: result.parsed?.gateVerdict ?? null,
      probe: result.parsed?.probe ?? null,
      liveAuthProbe: result.parsed?.liveAuthProbe
        ? {
            ok: result.parsed.liveAuthProbe.ok === true,
            httpStatus: result.parsed.liveAuthProbe.httpStatus ?? null,
            authenticated: result.parsed.liveAuthProbe.authenticated ?? null,
            reachable: result.parsed.liveAuthProbe.reachable ?? null,
          }
        : null,
    },
  };
}

function runReadyOrRefresh() {
  const result = spawnSync("bash", ["scripts/recall-first-apply-ready-or-refresh.sh"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BRAIN_RECALL_KEY_ROTATION_ACK: REQUIRED_KEY_ROTATION_ACK,
      BRAIN_RECALL_FIRST_APPLY_READY_REFRESH_CONFIRM: "1",
      BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE: args.evidenceFilePath,
      BRAIN_RECALL_FIRST_APPLY_ENV_FILE: args.envFilePath,
      BRAIN_RECALL_KEY_ROTATED_AFTER_ISO: args.keyRotatedAfterIso,
      BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH: args.enumerationPath,
      BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH: args.fidelityPath,
      BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH: args.manifestPath,
      BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH: args.dryRunReportPath,
      BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH: args.backupPath,
      BRAIN_RECALL_FIRST_APPLY_ACCEPTED_FIDELITY_RISK: args.acceptedFidelityRisk,
      BRAIN_RECALL_FIRST_APPLY_MAX_IMPORTS: String(args.maxPlannedImports),
      BRAIN_RECALL_FIRST_APPLY_DRY_RUN_MAX_AGE_MINUTES: String(args.dryRunReportMaxAgeMinutes),
      BRAIN_RECALL_FIRST_APPLY_BACKUP_MAX_AGE_MINUTES: String(args.backupMaxAgeMinutes),
      BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES: String(args.minFreshnessRemainingMinutes),
      ...(args.fixturePath ? { BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH: args.fixturePath } : {}),
      ...(args.allowSmokePaths ? { BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS: "1" } : {}),
    },
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const ok = result.status === 0;
  steps.push({
    id: "no_write_ready_or_refresh",
    ok,
    exitCode: result.status,
    refreshed: output.includes("[recall-first-apply-proof-refresh] done"),
  });
  return {
    ok,
    exitCode: result.status,
    summary: {
      refreshed: output.includes("[recall-first-apply-proof-refresh] done"),
      readyWithoutRefresh: output.includes("[recall-first-apply-ready-or-refresh] ready_without_refresh"),
      completed: output.includes("[recall-first-apply-ready-or-refresh] refreshed"),
    },
  };
}

function requirePrepareConfirm(action) {
  if (process.env.BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM !== "1") {
    fail("missing_prepare_confirmation", `Set BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 to ${action}.`, 2, {
      steps,
      nextCommands: [
        `BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 npm run recall:first-apply:prepare-after-rotation`,
      ],
    });
  }
}

function smokeStatusArgs() {
  if (!args.allowSmokePaths) return [];
  return [
    "--allow-unsafe-manifest-for-smoke",
    "--allow-non-private-dry-run-report",
    "--allow-non-private-backup",
    "--skip-private-ignore",
    "--skip-live-gate-status",
    "--skip-approval-packet",
    "--skip-public-docs-privacy",
  ];
}

function runNode(commandArgs, env = process.env) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(text),
  };
}

function summarizeStatus(parsed) {
  if (!parsed) return null;
  return {
    ok: parsed.ok === true,
    status: parsed.status ?? null,
    keyRotationEvidenceOk: parsed.keyRotationEvidence?.ok === true,
    readinessOk: parsed.readiness?.ok === true,
    failedChecks: parsed.readiness?.failedChecks ?? [],
    nextCommands: parsed.nextCommands ?? [],
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
          "No private Recall card IDs, titles, source URLs, chunks, raw response body, dry-run payload, apply payload, backup payload, or database rows were printed by this wrapper.",
          "No production apply, deploy, scheduler enablement, or checkpoint advancement was performed by this wrapper.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const latestSpikeReports = resolveLatestRecallSpikeReportPair();
  const parsed = {
    enumerationPath: process.env.BRAIN_RECALL_FIRST_APPLY_ENUMERATION_REPORT_PATH ?? latestSpikeReports.enumerationPath,
    fidelityPath: process.env.BRAIN_RECALL_FIRST_APPLY_FIDELITY_REPORT_PATH ?? latestSpikeReports.fidelityPath,
    manifestPath: process.env.BRAIN_RECALL_FIRST_APPLY_MANIFEST_PATH ?? DEFAULT_MANIFEST,
    envFilePath: process.env.BRAIN_RECALL_FIRST_APPLY_ENV_FILE ?? DEFAULT_ENV_FILE,
    evidenceFilePath: process.env.BRAIN_RECALL_KEY_ROTATION_EVIDENCE_FILE ?? DEFAULT_EVIDENCE_FILE,
    keyRotatedAfterIso: process.env.BRAIN_RECALL_KEY_ROTATED_AFTER_ISO ?? DEFAULT_MIN_ROTATED_AFTER_ISO,
    dryRunReportPath: process.env.BRAIN_RECALL_FIRST_APPLY_DRY_RUN_REPORT_PATH ?? DEFAULT_DRY_RUN_REPORT,
    backupPath: process.env.BRAIN_RECALL_FIRST_APPLY_BACKUP_PATH ?? DEFAULT_BACKUP_PATH,
    acceptedFidelityRisk: process.env.BRAIN_RECALL_FIRST_APPLY_ACCEPTED_FIDELITY_RISK ?? DEFAULT_ACCEPTED_FIDELITY_RISK,
    maxPlannedImports: Number(process.env.BRAIN_RECALL_FIRST_APPLY_MAX_IMPORTS ?? 5),
    dryRunReportMaxAgeMinutes: Number(process.env.BRAIN_RECALL_FIRST_APPLY_DRY_RUN_MAX_AGE_MINUTES ?? 120),
    backupMaxAgeMinutes: Number(process.env.BRAIN_RECALL_FIRST_APPLY_BACKUP_MAX_AGE_MINUTES ?? 120),
    minFreshnessRemainingMinutes: Number(process.env.BRAIN_RECALL_FIRST_APPLY_MIN_FRESHNESS_REMAINING_MINUTES ?? 5),
    liveAuthProbeBaseUrl: "https://backend.getrecall.ai/api/v1",
    liveAuthProbeDateFrom: "2100-01-01T00:00:00.000Z",
    liveAuthProbeDateTo: "2100-01-02T00:00:00.000Z",
    fixturePath: process.env.BRAIN_RECALL_FIRST_APPLY_FIXTURE_PATH ?? null,
    allowSmokePaths: process.env.BRAIN_RECALL_FIRST_APPLY_ALLOW_SMOKE_PATHS === "1",
    planOnly: process.env.BRAIN_RECALL_FIRST_APPLY_PREPARE_PLAN_ONLY === "1",
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--enumeration" && next) parsed.enumerationPath = consume(argv, ++i);
    else if (arg === "--fidelity" && next) parsed.fidelityPath = consume(argv, ++i);
    else if (arg === "--manifest" && next) parsed.manifestPath = consume(argv, ++i);
    else if (arg === "--env-file" && next) parsed.envFilePath = consume(argv, ++i);
    else if (arg === "--key-rotation-evidence-file" && next) parsed.evidenceFilePath = consume(argv, ++i);
    else if (arg === "--key-rotated-after" && next) parsed.keyRotatedAfterIso = consume(argv, ++i);
    else if (arg === "--dry-run-report" && next) parsed.dryRunReportPath = consume(argv, ++i);
    else if (arg === "--backup-path" && next) parsed.backupPath = consume(argv, ++i);
    else if (arg === "--accepted-fidelity-risk" && next) parsed.acceptedFidelityRisk = consume(argv, ++i);
    else if (arg === "--max-planned-imports" && next) parsed.maxPlannedImports = Number(consume(argv, ++i));
    else if (arg === "--dry-run-report-max-age-minutes" && next) parsed.dryRunReportMaxAgeMinutes = Number(consume(argv, ++i));
    else if (arg === "--backup-max-age-minutes" && next) parsed.backupMaxAgeMinutes = Number(consume(argv, ++i));
    else if (arg === "--min-freshness-remaining-minutes" && next) parsed.minFreshnessRemainingMinutes = Number(consume(argv, ++i));
    else if (arg === "--live-auth-probe-base-url" && next) parsed.liveAuthProbeBaseUrl = consume(argv, ++i);
    else if (arg === "--live-auth-probe-date-from" && next) parsed.liveAuthProbeDateFrom = consume(argv, ++i);
    else if (arg === "--live-auth-probe-date-to" && next) parsed.liveAuthProbeDateTo = consume(argv, ++i);
    else if (arg === "--fixture" && next) parsed.fixturePath = consume(argv, ++i);
    else if (arg === "--allow-smoke-paths") parsed.allowSmokePaths = true;
    else if (arg === "--plan-only") parsed.planOnly = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  for (const [label, value] of [
    ["--max-planned-imports", parsed.maxPlannedImports],
    ["--dry-run-report-max-age-minutes", parsed.dryRunReportMaxAgeMinutes],
    ["--backup-max-age-minutes", parsed.backupMaxAgeMinutes],
    ["--min-freshness-remaining-minutes", parsed.minFreshnessRemainingMinutes],
  ]) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative number.`);
  }
  for (const [label, value] of [
    ["--key-rotated-after", parsed.keyRotatedAfterIso],
    ["--live-auth-probe-date-from", parsed.liveAuthProbeDateFrom],
    ["--live-auth-probe-date-to", parsed.liveAuthProbeDateTo],
  ]) {
    if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid ISO timestamp.`);
  }

  return parsed;
}

function consume(argv, index) {
  return argv[index];
}

function script(name) {
  return resolve("scripts", name);
}

function printHelp() {
  console.log(`Prepare first capped Recall apply after key rotation without applying

Usage:
  npm run recall:first-apply:prepare-plan

  BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" \\
  BRAIN_RECALL_FIRST_APPLY_PREPARE_CONFIRM=1 \\
  npm run recall:first-apply:prepare-after-rotation

This wrapper:
  - supports --plan-only for a no-live/no-write preview of post-rotation actions;
  - requires the exact key rotation acknowledgement;
  - records private key-rotation evidence only for stale/missing private evidence blockers;
  - delegates stale proof refresh to the existing no-write ready-or-refresh wrapper;
  - exits ready only when first-apply machine readiness passes;
  - never runs production apply, deploy, scheduler enablement, or checkpoint advancement.
`);
}
