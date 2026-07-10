#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

const DEFAULT_ENUMERATION_REPORT =
  "docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md";
const DEFAULT_FIDELITY_REPORT =
  "docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md";
const DEFAULT_MANIFEST = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_KEY_ROTATION_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_DRY_RUN_REPORT = "data/private/recall-live-spikes/dry-run-report.json";
const DEFAULT_BACKUP_PATH =
  "data/private/recall-live-spikes/backups/recall-first-apply-20260624T134927Z.sqlite";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const DEFAULT_BASE_URL = "https://backend.getrecall.ai/api/v1";
const DEFAULT_DATE_FROM = "2100-01-01T00:00:00.000Z";
const DEFAULT_DATE_TO = "2100-01-02T00:00:00.000Z";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const DEFAULT_API_KEY_ENV = "RECALL_API_KEY";
const PRIVATE_ROOT = "data/private/recall-live-spikes";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.outputFilePath && !isUnderPrivateRoot(resolve(args.outputFilePath))) {
  fail("output_file_not_private", `Live diagnostic output file must stay under ${PRIVATE_ROOT}/.`, 2);
}

if (!args.confirmLiveApi && process.env.BRAIN_RECALL_CONFIRM_LIVE_API !== "1") {
  fail(
    "missing_live_api_confirmation",
    "Set --confirm-live-api or BRAIN_RECALL_CONFIRM_LIVE_API=1 before running the read-only live diagnostic.",
    2,
  );
}

const ephemeralProbeCredentialReady =
  args.probeNoEnvFile && Boolean(process.env[args.probeApiKeyEnv]?.trim());
const status = runStatus();
let statusParsed = status.parsed;
let statusHelperFailure = null;
if (!status.ok && ephemeralProbeCredentialReady) {
  statusHelperFailure = summarizeStatusHelperFailure(status);
  statusParsed = fallbackStatusForReadOnlyProbe(statusHelperFailure);
}
if (!status.ok && !ephemeralProbeCredentialReady) {
  fail("first_apply_status_failed", "The no-write first-apply status helper failed before the live diagnostic.", status.exitCode || 1, {
    status: summarizeStatus(status.parsed),
  });
}

const liveReadConnectivity = statusParsed?.diagnostics?.liveReadConnectivity ?? null;
const localPrivateGateHandling = summarizeLocalPrivateGateHandling({
  liveReadConnectivity,
  ephemeralProbeCredentialReady,
  statusHelperFailure,
});
if (args.probeNoEnvFile && !ephemeralProbeCredentialReady) {
  fail(
    "missing_ephemeral_probe_api_key",
    `${args.probeApiKeyEnv} is not set. Use a private terminal-only value or omit --probe-no-env-file to use the ignored private env file.`,
    2,
    {
      status: summarizeStatus(statusParsed),
      liveReadConnectivity,
      probeCredential: summarizeProbeCredential(),
      localPrivateGateHandling,
    },
  );
}

if (liveReadConnectivity?.optionalNoWriteCommand == null && !ephemeralProbeCredentialReady) {
  fail(
    "live_read_diagnostic_not_available",
    "The status helper did not expose an optional no-write live auth probe command, and no env-file-disabled ephemeral probe credential was available.",
    1,
    {
      status: summarizeStatus(statusParsed),
      liveReadConnectivity,
      probeCredential: summarizeProbeCredential(),
      localPrivateGateHandling,
    },
  );
}

const probe = runLiveAuthProbe();
if (!probe.ok) {
  fail("live_auth_probe_failed", "The read-only live auth probe failed.", probe.exitCode || 1, {
    status: summarizeStatus(statusParsed),
    liveReadConnectivity,
    firstWriteSafety: statusParsed?.diagnostics?.firstWriteSafety ?? null,
    probeCredential: summarizeProbeCredential(),
    liveAuthProbe: summarizeLiveProbe(probe.parsed),
  });
}

const output = {
  ok: true,
  mode: "first_apply_live_read_diagnostic",
  statusHelper: {
    ok: status.ok === true,
    exitCode: status.exitCode,
    failureBypassedForReadOnlyProbe: statusHelperFailure != null,
    failureCode: statusHelperFailure?.code ?? null,
    safetyNote: statusHelperFailure
      ? "The local status helper failed before the probe, but the read-only probe was allowed because env-file loading was disabled and a terminal-only credential was present. First-write gates remain blocked."
      : "The local status helper completed before the read-only probe.",
  },
  statusBeforeProbe: summarizeStatus(statusParsed),
  liveReadConnectivity,
  firstWriteSafety: statusParsed?.diagnostics?.firstWriteSafety ?? null,
  probeCredential: summarizeProbeCredential(),
  localPrivateGateHandling,
  diagnosticOutputFile: {
    path: args.outputFilePath ?? null,
    written: Boolean(args.outputFilePath),
    mode: args.outputFilePath ? "0600" : null,
    privateRoot: args.outputFilePath ? PRIVATE_ROOT : null,
  },
  liveAuthProbe: summarizeLiveProbe(probe.parsed),
  safetyNotes: [
    "This wrapper ran the no-write first-apply status helper before the live diagnostic.",
    "It then ran exactly one read-only Recall /cards auth probe.",
    args.probeNoEnvFile
      ? "The read-only probe was forced to ignore Recall env files and use only the named process environment variable."
      : "The read-only probe used the ignored private Recall env file path supplied to this wrapper.",
    localPrivateGateHandling.bypassedLocalLiveGateForReadOnlyProbe
      ? "Local Recall env-file readiness was treated as diagnostic context only because an env-file-disabled ephemeral credential was present for the read-only probe."
      : "Local Recall env-file readiness was not bypassed unless an env-file-disabled ephemeral credential was present.",
    statusHelperFailure
      ? "A local status-helper failure was treated as diagnostic context only for the env-file-disabled read-only probe; it still blocks proof refresh, apply, deploy, scheduler, and checkpoint paths."
      : "The local status helper did not fail before this probe.",
    args.outputFilePath
      ? "It wrote sanitized diagnostic JSON only to the requested private output file with owner-only mode 0600."
      : "It did not write a durable diagnostic output file; use --output-file under data/private/recall-live-spikes/ when a private artifact is needed.",
    "It did not create or refresh proof files.",
    "It did not read or write the AI Brain database.",
    "It did not apply, deploy, enable a scheduler, or advance a checkpoint.",
    "Passing this diagnostic does not satisfy key-rotation evidence, proof freshness, first-write approval, apply, deploy, scheduler, or checkpoint gates.",
  ],
  nextGate:
    "If the live diagnostic passed, first-write work is still controlled by key rotation evidence, proof freshness, exact approval, and exact acknowledgement.",
};

if (args.outputFilePath) {
  writeOutputFile(args.outputFilePath, `${JSON.stringify(output, null, 2)}\n`);
}

console.log(JSON.stringify(output, null, 2));

function runStatus() {
  return runNode([
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
    args.keyRotationEvidenceFilePath,
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
    ...(args.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
    ...(args.allowNonPrivateDryRunReport ? ["--allow-non-private-dry-run-report"] : []),
    ...(args.allowNonPrivateBackup ? ["--allow-non-private-backup"] : []),
    ...(args.skipPrivateIgnore ? ["--skip-private-ignore"] : []),
    ...(args.skipApprovalPacket ? ["--skip-approval-packet"] : []),
    ...(args.skipPublicDocsPrivacy ? ["--skip-public-docs-privacy"] : []),
  ]);
}

function runLiveAuthProbe() {
  const commandArgs = [
    script("run-recall-live-auth-probe.mjs"),
    "--api-key-env",
    args.probeApiKeyEnv,
    "--base-url",
    args.baseUrl,
    "--date-from",
    args.dateFrom,
    "--date-to",
    args.dateTo,
    "--key-rotated-after",
    args.keyRotatedAfterIso,
    "--timeout-ms",
    String(args.timeoutMs),
    "--confirm-live-api",
  ];
  if (args.probeNoEnvFile) {
    commandArgs.push("--no-env-file");
  } else {
    commandArgs.push("--env-file", args.probeEnvFilePath);
  }
  return runNode(commandArgs);
}

function summarizeProbeCredential() {
  return {
    apiKeyEnv: args.probeApiKeyEnv,
    envFileMode: args.probeNoEnvFile ? "disabled_for_probe" : "private_env_file",
    envFilePath: args.probeNoEnvFile ? null : args.probeEnvFilePath,
    processEnvKeyPresent: Boolean(process.env[args.probeApiKeyEnv]?.trim()),
    secretPrinted: false,
  };
}

function summarizeLocalPrivateGateHandling({ liveReadConnectivity, ephemeralProbeCredentialReady, statusHelperFailure }) {
  const optionalStatusCommandAvailable = liveReadConnectivity?.optionalNoWriteCommand != null;
  const bypassedLocalLiveGateForReadOnlyProbe =
    args.probeNoEnvFile &&
    ephemeralProbeCredentialReady &&
    (!optionalStatusCommandAvailable || statusHelperFailure != null);
  return {
    statusLiveGateReady: liveReadConnectivity?.localGateReady === true,
    statusLiveGateVerdict: liveReadConnectivity?.verdict ?? null,
    statusHelperSucceeded: statusHelperFailure == null,
    statusHelperFailureCode: statusHelperFailure?.code ?? null,
    statusHelperFailureExitCode: statusHelperFailure?.exitCode ?? null,
    statusOptionalNoWriteCommandAvailable: optionalStatusCommandAvailable,
    envFileDisabledProbeRequested: args.probeNoEnvFile === true,
    ephemeralProbeCredentialReady,
    bypassedLocalLiveGateForReadOnlyProbe,
    safetyNote: bypassedLocalLiveGateForReadOnlyProbe
      ? "The read-only probe was allowed to continue with the terminal-only credential even though local env-file readiness did not expose an optional status command or the status helper failed locally. First-write gates remain blocked."
      : "The read-only probe only continues when the status live-read command is available or an env-file-disabled ephemeral credential is present.",
  };
}

function summarizeStatus(parsed) {
  if (!parsed) return null;
  return {
    ok: parsed.ok === true,
    status: parsed.status ?? null,
    keyRotationEvidenceOk: parsed.keyRotationEvidence?.ok === true,
    failedChecks: parsed.readiness?.failedChecks ?? [],
    firstWriteSafety: parsed.diagnostics?.firstWriteSafety ?? null,
  };
}

function summarizeLiveProbe(parsed) {
  if (!parsed) return null;
  return {
    ok: parsed.ok === true,
    code: parsed.code ?? null,
    message: parsed.message ? redact(parsed.message) : null,
    mode: parsed.mode ?? null,
    endpoint: parsed.endpoint ?? null,
    method: parsed.method ?? null,
    dateWindow: parsed.dateWindow ?? null,
    envFile: parsed.envFile
      ? {
          path: parsed.envFile.path ?? null,
          loaded: parsed.envFile.loaded === true,
          loadedKeyCount: parsed.envFile.loadedKeyCount ?? null,
          mtimeIso: parsed.envFile.mtimeIso ?? null,
          fileSafety: parsed.envFile.fileSafety ?? null,
        }
      : null,
    firstWriteSafety: parsed.firstWriteSafety ?? null,
    result: parsed.result
      ? {
          httpStatus: parsed.result.httpStatus ?? null,
          authenticated: parsed.result.authenticated ?? null,
          reachable: parsed.result.reachable ?? null,
          durationMs: parsed.result.durationMs ?? null,
          totalCount: parsed.result.totalCount ?? null,
          resultCount: parsed.result.resultCount ?? null,
          responseHadResultsArray: parsed.result.responseHadResultsArray ?? null,
          requestId: parsed.result.requestId ?? null,
        }
      : null,
  };
}

function runNode(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    env: childEnv(),
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(text),
  };
}

function summarizeStatusHelperFailure(statusResult) {
  return {
    code: statusResult.parsed?.code ?? statusResult.parsed?.status ?? "status_helper_failed",
    exitCode: statusResult.exitCode ?? null,
    parsed: statusResult.parsed ? summarizeStatus(statusResult.parsed) : null,
    safetyNote:
      "This failure is only bypassable for an explicitly confirmed, env-file-disabled, read-only probe with a terminal-only credential. It never authorizes proof refresh or apply.",
  };
}

function fallbackStatusForReadOnlyProbe(statusHelperFailure) {
  return {
    ok: false,
    status: "local_private_gate_status_failed",
    readiness: {
      failedChecks: ["status_helper_execution"],
    },
    diagnostics: {
      firstWriteSafety: {
        keyRotationEvidenceRequired: true,
        blockedBeforeProofRefreshOrApply: true,
        proofRefreshAllowedNow: false,
        applyAllowedNow: false,
        safetyNote:
          "The local status helper failed before the read-only probe. Treat all first-write, proof-refresh, deploy, scheduler, and checkpoint paths as blocked.",
      },
      liveReadConnectivity: {
        localGateReady: false,
        verdict: "status_helper_failed_before_live_probe",
        readyForApprovedLiveSpikes: false,
        optionalNoWriteCommand: null,
        promptDiagnosticAvailableWithoutLocalLiveGate: true,
        promptDiagnosticBypassesLocalLiveGate: true,
        promptDiagnosticRequiresLocalKeyEntry: true,
        promptDiagnosticPreKeyGuarded: true,
        statusHelperFailure,
        safetyNote:
          "Local first-apply status checks failed before env-file readiness could be proven. Env-file-disabled prompt or ephemeral probing remains diagnostic-only when explicitly confirmed.",
      },
    },
  };
}

function childEnv() {
  if (!args.confirmLiveApi) return process.env;
  return { ...process.env, BRAIN_RECALL_CONFIRM_LIVE_API: "1" };
}

function fail(code, message, exitCode, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        mode: "first_apply_live_read_diagnostic",
        code,
        message: redact(message),
        ...extra,
        safetyNotes: [
          "No Recall API key was printed.",
          "No private Recall card IDs, titles, source URLs, chunks, raw response bodies, proof payloads, apply payloads, backup payloads, or database rows were printed by this wrapper.",
          "No proof refresh, production apply, deploy, scheduler enablement, or checkpoint advancement was performed by this wrapper.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const parsed = {
    enumerationPath: DEFAULT_ENUMERATION_REPORT,
    fidelityPath: DEFAULT_FIDELITY_REPORT,
    manifestPath: DEFAULT_MANIFEST,
    envFilePath: DEFAULT_ENV_FILE,
    probeApiKeyEnv: DEFAULT_API_KEY_ENV,
    probeEnvFilePath: DEFAULT_ENV_FILE,
    probeNoEnvFile: false,
    keyRotationEvidenceFilePath: DEFAULT_KEY_ROTATION_EVIDENCE_FILE,
    keyRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    dryRunReportPath: DEFAULT_DRY_RUN_REPORT,
    backupPath: DEFAULT_BACKUP_PATH,
    acceptedFidelityRisk: DEFAULT_ACCEPTED_FIDELITY_RISK,
    maxPlannedImports: 5,
    dryRunReportMaxAgeMinutes: 120,
    backupMaxAgeMinutes: 120,
    minFreshnessRemainingMinutes: 5,
    baseUrl: DEFAULT_BASE_URL,
    confirmLiveApi: false,
    dateFrom: DEFAULT_DATE_FROM,
    dateTo: DEFAULT_DATE_TO,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    allowUnsafeManifestForSmoke: false,
    allowNonPrivateDryRunReport: false,
    allowNonPrivateBackup: false,
    skipPrivateIgnore: false,
    skipApprovalPacket: false,
    skipPublicDocsPrivacy: false,
    outputFilePath: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--confirm-live-api") parsed.confirmLiveApi = true;
    else if (arg === "--enumeration" && next) parsed.enumerationPath = consume(argv, ++i);
    else if (arg === "--fidelity" && next) parsed.fidelityPath = consume(argv, ++i);
    else if (arg === "--manifest" && next) parsed.manifestPath = consume(argv, ++i);
    else if (arg === "--env-file" && next) {
      parsed.envFilePath = consume(argv, ++i);
      parsed.probeEnvFilePath = parsed.envFilePath;
    }
    else if (arg === "--probe-env-file" && next) parsed.probeEnvFilePath = consume(argv, ++i);
    else if (arg === "--probe-no-env-file") parsed.probeNoEnvFile = true;
    else if (arg === "--probe-api-key-env" && next) parsed.probeApiKeyEnv = consume(argv, ++i);
    else if (arg === "--key-rotation-evidence-file" && next) parsed.keyRotationEvidenceFilePath = consume(argv, ++i);
    else if (arg === "--key-rotated-after" && next) parsed.keyRotatedAfterIso = consume(argv, ++i);
    else if (arg === "--dry-run-report" && next) parsed.dryRunReportPath = consume(argv, ++i);
    else if (arg === "--backup-path" && next) parsed.backupPath = consume(argv, ++i);
    else if (arg === "--accepted-fidelity-risk" && next) parsed.acceptedFidelityRisk = consume(argv, ++i);
    else if (arg === "--max-planned-imports" && next) parsed.maxPlannedImports = parseNonNegativeInt(arg, consume(argv, ++i));
    else if (arg === "--dry-run-report-max-age-minutes" && next) {
      parsed.dryRunReportMaxAgeMinutes = parsePositiveNumber(arg, consume(argv, ++i));
    } else if (arg === "--backup-max-age-minutes" && next) {
      parsed.backupMaxAgeMinutes = parsePositiveNumber(arg, consume(argv, ++i));
    } else if (arg === "--min-freshness-remaining-minutes" && next) {
      parsed.minFreshnessRemainingMinutes = parseNonNegativeNumber(arg, consume(argv, ++i));
    } else if (arg === "--base-url" && next) parsed.baseUrl = consume(argv, ++i);
    else if (arg === "--date-from" && next) parsed.dateFrom = consume(argv, ++i);
    else if (arg === "--date-to" && next) parsed.dateTo = consume(argv, ++i);
    else if (arg === "--timeout-ms" && next) parsed.timeoutMs = parsePositiveInt(arg, consume(argv, ++i));
    else if (arg === "--output-file" && next) parsed.outputFilePath = consume(argv, ++i);
    else if (arg === "--allow-unsafe-manifest-for-smoke") parsed.allowUnsafeManifestForSmoke = true;
    else if (arg === "--allow-non-private-dry-run-report") parsed.allowNonPrivateDryRunReport = true;
    else if (arg === "--allow-non-private-backup") parsed.allowNonPrivateBackup = true;
    else if (arg === "--skip-private-ignore") parsed.skipPrivateIgnore = true;
    else if (arg === "--skip-approval-packet") parsed.skipApprovalPacket = true;
    else if (arg === "--skip-public-docs-privacy") parsed.skipPublicDocsPrivacy = true;
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }

  assertIsoTimestamp("--key-rotated-after", parsed.keyRotatedAfterIso);
  assertIsoWindow(parsed.dateFrom, parsed.dateTo);
  return parsed;
}

function consume(argv, index) {
  return argv[index];
}

function script(name) {
  return resolve("scripts", name);
}

function writeOutputFile(outputFilePath, output) {
  const resolved = resolve(outputFilePath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, output, { encoding: "utf8", mode: 0o600 });
  chmodSync(resolved, 0o600);
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

function parsePositiveInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
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

function assertIsoTimestamp(label, value) {
  if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} must be a valid ISO timestamp.`);
}

function assertIsoWindow(dateFrom, dateTo) {
  const fromMs = Date.parse(dateFrom);
  const toMs = Date.parse(dateTo);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error("--date-from and --date-to must be valid ISO timestamps.");
  }
  if (fromMs > toMs) throw new Error("--date-from must be before or equal to --date-to.");
}

function redact(value) {
  return String(value)
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s"'<>]+/gi, "Authorization: Bearer <redacted:token>")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\b(RECALL_API_KEY\s*=\s*)[^\s"'<>]+/gi, "$1<redacted:secret>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function printHelp() {
  console.log(`Recall first-apply live diagnostic

Runs the no-write first-apply status helper, then runs exactly one read-only
Recall /cards auth probe when the live-read gate is available.

Usage:
  npm run recall:first-apply:live-diagnostic -- --confirm-live-api
  npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
  npm run recall:first-apply:live-diagnostic -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api --output-file data/private/recall-live-spikes/live-diagnostic-report.json
  RECALL_EPHEMERAL_API_KEY="<set outside chat>" npm run recall:first-apply:live-diagnostic -- --probe-no-env-file --probe-api-key-env RECALL_EPHEMERAL_API_KEY --confirm-live-api

Safety:
  - No proof refresh, apply, deploy, scheduler enablement, or checkpoint change occurs.
  - Passing this diagnostic does not satisfy key-rotation evidence or first-write approval.
  - Use --probe-no-env-file with a private terminal-only API-key variable when the local env file is stale or intentionally not trusted for diagnostics.
  - Optional --output-file must stay under ${PRIVATE_ROOT}/ and is written owner-only.
  - Default live date window is ${DEFAULT_DATE_FROM} to ${DEFAULT_DATE_TO}.
`);
}
