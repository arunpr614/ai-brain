#!/usr/bin/env node
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertRecallEnvFileSafety,
  DEFAULT_RECALL_ENV_FILE_PATH,
  loadRecallEnvFile,
} from "./lib/recall-env-file.mjs";

const DEFAULT_BASE_URL = "https://backend.getrecall.ai/api/v1";
const DEFAULT_DATE_FROM = "2100-01-01T00:00:00.000Z";
const DEFAULT_DATE_TO = "2100-01-02T00:00:00.000Z";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_KEY_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!isLiveApiConfirmed(args)) {
  fail(
    "missing_live_api_confirmation",
    "Live Recall auth probe requires --confirm-live-api or BRAIN_RECALL_CONFIRM_LIVE_API=1 after approval.",
    2,
  );
}

const envFileSummary = loadPrivateEnvFileIfPresent(args.envFilePath);
const firstWriteSafety = buildFirstWriteSafetyContext(envFileSummary, args);
const apiKey = process.env[args.apiKeyEnv]?.trim() ?? "";
if (!apiKey) {
  fail(
    "missing_api_key",
    `${args.apiKeyEnv} is not set. Provide an ignored private env file or a temporary shell env value.`,
    2,
    { envFile: envFileSummary, firstWriteSafety },
  );
}

const url = new URL(`${args.baseUrl.replace(/\/+$/, "")}/cards`);
url.searchParams.set("date_from", args.dateFrom);
url.searchParams.set("date_to", args.dateTo);

try {
  const startedAt = Date.now();
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  const parsed = parseJsonObject(text);

  const output = {
    ok: response.ok,
    mode: "live_read_only_auth_probe",
    endpoint: "/cards",
    method: "GET",
    baseUrl: args.baseUrl,
    dateWindow: {
      dateFrom: args.dateFrom,
      dateTo: args.dateTo,
    },
    envFile: envFileSummary,
    firstWriteSafety,
    result: summarizeResponse(response, parsed, durationMs),
    safetyNotes: [
      "This command made exactly one read-only Recall API request.",
      "It did not fetch card details.",
      "It did not print card IDs, titles, source URLs, chunks, or raw response bodies.",
      "It did not read or write the AI Brain database.",
      "It did not create dry-run proof, apply proof, backup proof, deploy, enable a scheduler, or advance a checkpoint.",
      "Passing this probe does not satisfy first-apply key-rotation evidence or write approval gates.",
    ],
    nextGate: response.ok
      ? "Live Recall auth/read connectivity is reachable. First capped apply still requires key rotation evidence, fresh proof, exact approval, and exact acknowledgement."
      : "Resolve the Recall auth/connectivity error before any production dry-run or apply.",
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(response.ok ? 0 : statusToExitCode(response.status));
} catch (error) {
  fail("live_probe_error", error instanceof Error ? error.message : String(error), 1, {
    envFile: envFileSummary,
    firstWriteSafety,
  });
}

function loadPrivateEnvFileIfPresent(envFilePath) {
  if (!envFilePath) {
    return {
      path: null,
      loaded: false,
      loadedKeyCount: 0,
      note: "No env file requested; using process environment only.",
    };
  }

  if (!existsSync(resolve(envFilePath))) {
    return {
      path: envFilePath,
      loaded: false,
      loadedKeyCount: 0,
      note: "Requested env file does not exist; using process environment only.",
    };
  }

  const fileSafety = args.systemEnvFile
    ? assertSystemEnvFileSafety(envFilePath)
    : assertRecallEnvFileSafety(envFilePath);
  const loaded = loadRecallEnvFile(envFilePath);
  const stats = statSync(resolve(envFilePath));
  return {
    path: envFilePath,
    loaded: true,
    loadedKeyCount: loaded.loadedKeyCount,
    mtimeIso: stats.mtime.toISOString(),
    fileSafety: {
      underPrivateRecallEvidencePath: fileSafety.underPrivateRecallEvidencePath,
      ignored: fileSafety.ignored,
      tracked: fileSafety.tracked,
      mode: fileSafety.mode,
      securePermissions: fileSafety.securePermissions,
      systemEnvFile: args.systemEnvFile,
    },
  };
}

function assertSystemEnvFileSafety(envFilePath) {
  const stats = statSync(resolve(envFilePath));
  const mode = stats.mode & 0o777;
  const securePermissions = hasSecureSystemEnvFileMode(mode);
  if (!securePermissions) {
    const error = new Error("[recall-env-file] unsafe system Recall env file");
    error.code = "RECALL_SYSTEM_ENV_FILE_UNSAFE";
    error.envFilePath = resolve(envFilePath);
    error.fileSafety = {
      path: envFilePath,
      exists: true,
      underPrivateRecallEvidencePath: null,
      ignored: null,
      tracked: null,
      mode: mode.toString(8).padStart(3, "0"),
      securePermissions,
      systemEnvFile: true,
    };
    error.findings = [
      {
        path: "$.envFilePath",
        message:
          "System Recall env file must be owner-readable with no group write/execute and no other permissions, for example mode 0600 or 0640.",
      },
    ];
    throw error;
  }
  return {
    path: envFilePath,
    exists: true,
    underPrivateRecallEvidencePath: null,
    ignored: null,
    tracked: null,
    mode: mode.toString(8).padStart(3, "0"),
    securePermissions,
    systemEnvFile: true,
  };
}

function hasSecureSystemEnvFileMode(mode) {
  return (mode & 0o027) === 0 && (mode & 0o400) !== 0;
}

function buildFirstWriteSafetyContext(envFileSummary, parsedArgs) {
  const keyRotatedAfterMs = Date.parse(parsedArgs.keyRotatedAfterIso);
  const envFileMtimeMs = envFileSummary?.mtimeIso ? Date.parse(envFileSummary.mtimeIso) : NaN;
  const envFileMtimeAfterCheckpoint =
    Number.isFinite(keyRotatedAfterMs) && Number.isFinite(envFileMtimeMs)
      ? envFileMtimeMs >= keyRotatedAfterMs
      : null;

  return {
    purpose: "diagnostic_context_only",
    keyRotationEvidenceGateRun: false,
    keyRotatedAfterIso: Number.isFinite(keyRotatedAfterMs)
      ? new Date(keyRotatedAfterMs).toISOString()
      : parsedArgs.keyRotatedAfterIso,
    envFilePath: envFileSummary?.path ?? null,
    envFileLoaded: envFileSummary?.loaded === true,
    envFileMtimeIso: envFileSummary?.mtimeIso ?? null,
    envFileMtimeAfterCheckpoint,
    proofRefreshAllowedByThisProbe: false,
    applyAllowedByThisProbe: false,
    safetyNote:
      envFileMtimeAfterCheckpoint === false
        ? "The loaded env file is older than the key-rotation checkpoint. This read-only probe may still test connectivity, but write preparation remains blocked until key-rotation evidence passes."
        : "This read-only probe does not run or satisfy the first-write key-rotation evidence gate. Run the dedicated key-evidence/status commands before proof refresh or apply.",
  };
}

function summarizeResponse(response, parsed, durationMs) {
  const results = Array.isArray(parsed?.results) ? parsed.results : null;
  return {
    httpStatus: response.status,
    authenticated: response.status !== 401 && response.status !== 403,
    reachable: true,
    durationMs,
    totalCount: Number.isInteger(parsed?.total_count) ? parsed.total_count : null,
    resultCount: results ? results.length : null,
    responseHadResultsArray: Array.isArray(parsed?.results),
    errorMessage: response.ok ? null : redact(secretSafeErrorMessage(parsed, response)),
    requestId: response.ok ? null : stringOrNull(parseJsonObject(parsed?.detail)?.request_id) ?? stringOrNull(parsed?.request_id),
  };
}

function secretSafeErrorMessage(parsed, response) {
  const detail = parseJsonObject(parsed?.detail);
  return (
    stringOrNull(detail?.message) ??
    stringOrNull(parsed?.message) ??
    response.statusText ??
    "Recall API request failed"
  );
}

function statusToExitCode(status) {
  if (status === 401 || status === 403) return 77;
  if (status === 429) return 69;
  if (status >= 400 && status < 500) return 2;
  return 1;
}

function fail(code, message, exitCode, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        mode: "live_read_only_auth_probe",
        code,
        message: redact(message),
        ...extra,
        safetyNotes: [
          "No card IDs, titles, source URLs, chunks, or raw response bodies were printed.",
          "No AI Brain database writes, apply, deploy, scheduler enablement, or checkpoint advancement were attempted.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function isLiveApiConfirmed(parsedArgs) {
  return parsedArgs.confirmLiveApi || process.env.BRAIN_RECALL_CONFIRM_LIVE_API === "1";
}

function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function stringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function redact(value) {
  return String(value)
    .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s"'<>]+/gi, "Authorization: Bearer <redacted:token>")
    .replace(/\bBearer\s+[^\s"'<>]+/gi, "Bearer <redacted:token>")
    .replace(/\b(RECALL_API_KEY\s*=\s*)[^\s"'<>]+/gi, "$1<redacted:secret>")
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>");
}

function parseArgs(argv) {
  const parsed = {
    apiKeyEnv: "RECALL_API_KEY",
    baseUrl: DEFAULT_BASE_URL,
    confirmLiveApi: false,
    dateFrom: DEFAULT_DATE_FROM,
    dateTo: DEFAULT_DATE_TO,
    envFilePath: DEFAULT_RECALL_ENV_FILE_PATH,
    help: false,
    keyRotatedAfterIso: DEFAULT_KEY_ROTATED_AFTER_ISO,
    systemEnvFile: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") {
      parsed.help = true;
    } else if (arg === "--api-key-env" && next) {
      parsed.apiKeyEnv = next;
      i += 1;
    } else if (arg === "--base-url" && next) {
      parsed.baseUrl = next;
      i += 1;
    } else if (arg === "--confirm-live-api") {
      parsed.confirmLiveApi = true;
    } else if (arg === "--date-from" && next) {
      parsed.dateFrom = next;
      i += 1;
    } else if (arg === "--date-to" && next) {
      parsed.dateTo = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--key-rotated-after" && next) {
      parsed.keyRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--no-env-file") {
      parsed.envFilePath = null;
    } else if (arg === "--system-env-file") {
      parsed.systemEnvFile = true;
    } else if (arg === "--timeout-ms" && next) {
      parsed.timeoutMs = parsePositiveInt(arg, next);
      i += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  assertIsoWindow(parsed.dateFrom, parsed.dateTo);
  assertIsoTimestamp("--key-rotated-after", parsed.keyRotatedAfterIso);
  return parsed;
}

function parsePositiveInt(label, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function assertIsoTimestamp(label, value) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
}

function assertIsoWindow(dateFrom, dateTo) {
  const fromMs = Date.parse(dateFrom);
  const toMs = Date.parse(dateTo);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
    throw new Error("--date-from and --date-to must be valid ISO timestamps.");
  }
  if (fromMs > toMs) {
    throw new Error("--date-from must be before or equal to --date-to.");
  }
}

function printHelp() {
  console.log(`Recall live auth/read probe

Runs exactly one read-only GET /cards request and prints only auth/connectivity metadata.

Usage:
  npm run recall:live-auth-probe -- --confirm-live-api
  npm run recall:live-auth-probe -- --env-file data/private/recall-live-spikes/recall.env --confirm-live-api
  npm run recall:live-auth-probe -- --env-file /etc/brain/.env --system-env-file --confirm-live-api
  npm run recall:live-auth-probe -- --no-env-file --confirm-live-api

Safety:
  - Default date window is ${DEFAULT_DATE_FROM} to ${DEFAULT_DATE_TO}.
  - No card IDs, titles, source URLs, chunks, or raw response body are printed.
  - No AI Brain database writes, apply, deploy, scheduler, proof refresh, or checkpoint change occurs.
  - Passing this probe does not satisfy first-apply key-rotation evidence.
  - Use --system-env-file only for production env files such as /etc/brain/.env; it still checks restrictive permissions and prints no key material.
  - The default key-rotation context checkpoint is ${DEFAULT_KEY_ROTATED_AFTER_ISO}; override with --key-rotated-after when the project checkpoint changes.
`);
}
