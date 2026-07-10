#!/usr/bin/env node
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const PRIVATE_ROOT = "data/private/recall-live-spikes";
const DEFAULT_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_SYSTEM_ENV_FILE = "/etc/brain/.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const REQUIRED_KEY_ROTATION_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";
const REQUIRED_SYSTEM_KEY_ROTATION_ACK =
  "I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const requiredAckEnv = args.systemEnvFile ? "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK" : "BRAIN_RECALL_KEY_ROTATION_ACK";
const requiredAck = args.systemEnvFile ? REQUIRED_SYSTEM_KEY_ROTATION_ACK : REQUIRED_KEY_ROTATION_ACK;

if (process.env[requiredAckEnv] !== requiredAck) {
  fail(
    "missing_exact_key_rotation_ack",
    `Exact ${requiredAckEnv} text is required before recording key rotation evidence.`,
    2,
  );
}

if (!isUnderPrivateRoot(resolve(args.evidenceFilePath))) {
  fail(
    "evidence_file_not_private",
    `Private key rotation evidence file must stay under ${PRIVATE_ROOT}/.`,
    2,
  );
}

const probe = runLiveAuthProbe(args);
if (!probe.ok) {
  fail("live_auth_probe_failed", "Read-only live Recall auth probe failed; not recording evidence.", 1, {
    probe: probe.summary,
  });
}

const createdAtIso = new Date().toISOString();
const evidence = {
  schemaVersion: 1,
  createdAtIso,
  envFile: args.envFilePath,
  envFileKind: args.systemEnvFile ? "system" : "private",
  systemEnvFile: args.systemEnvFile,
  minRotatedAfterIso: new Date(Date.parse(args.minRotatedAfterIso)).toISOString(),
  ackPhraseAccepted: true,
  liveAuthProbe: {
    ok: true,
    mode: "live_read_only_auth_probe",
    endpoint: probe.output.endpoint,
    method: probe.output.method,
    httpStatus: probe.output.result?.httpStatus ?? null,
    authenticated: probe.output.result?.authenticated === true,
    reachable: probe.output.result?.reachable === true,
    totalCount: probe.output.result?.totalCount ?? null,
    resultCount: probe.output.result?.resultCount ?? null,
    responseHadResultsArray: probe.output.result?.responseHadResultsArray === true,
    firstWriteSafety: summarizeFirstWriteSafety(probe.output.firstWriteSafety),
  },
  safetyNotes: [
    "No Recall API key is stored in this evidence file.",
    "No private Recall card IDs, titles, source URLs, chunks, raw response body, dry-run proof payload, apply payload, backup payload, or database rows are stored in this evidence file.",
    args.systemEnvFile
      ? "This evidence file supports the production system-env key evidence gate but does not replace exact second-manual approval."
      : "This evidence file supports the local first-write safety gate but does not replace explicit first capped apply approval.",
  ],
};

mkdirSync(dirname(resolve(args.evidenceFilePath)), { recursive: true });
writeFileSync(resolve(args.evidenceFilePath), `${JSON.stringify(evidence, null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
chmodSync(resolve(args.evidenceFilePath), 0o600);

const gate = spawnSync(
  process.execPath,
  [
    "--",
    "scripts/check-recall-key-rotation-evidence.mjs",
    "--env-file",
    args.envFilePath,
    "--evidence-file",
    args.evidenceFilePath,
    "--min-rotated-after",
    args.minRotatedAfterIso,
    ...(args.systemEnvFile ? ["--system-env-file"] : []),
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
  },
);

if (gate.status !== 0) {
  fail("recorded_evidence_failed_gate", "Recorded private key rotation evidence did not pass the evidence gate.", 1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidenceFile: args.evidenceFilePath,
      mode: args.systemEnvFile
        ? "production_system_env_key_rotation_evidence_recorded"
        : "private_key_rotation_evidence_recorded",
      envFile: args.envFilePath,
      systemEnvFile: args.systemEnvFile,
      liveAuthProbe: evidence.liveAuthProbe,
      gateVerdict: "PASS_RECALL_KEY_ROTATION_EVIDENCE_GATE",
      safetyNotes: evidence.safetyNotes,
    },
    null,
    2,
  ),
);

function runLiveAuthProbe(parsedArgs) {
  const probeArgs = [
    "scripts/run-recall-live-auth-probe.mjs",
    "--env-file",
    parsedArgs.envFilePath,
    "--base-url",
    parsedArgs.baseUrl,
    "--date-from",
    parsedArgs.dateFrom,
    "--date-to",
    parsedArgs.dateTo,
    "--key-rotated-after",
    parsedArgs.minRotatedAfterIso,
    ...(parsedArgs.systemEnvFile ? ["--system-env-file"] : []),
    "--confirm-live-api",
  ];
  const result = spawnSync(process.execPath, ["--", ...probeArgs], {
    cwd: process.cwd(),
    env: { ...process.env, BRAIN_RECALL_CONFIRM_LIVE_API: "1", RECALL_API_KEY: "" },
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stdout || result.stderr;
  const parsed = parseJson(text);
  return {
    ok: result.status === 0 && parsed?.ok === true,
    output: parsed,
    summary: parsed
      ? {
          ok: parsed.ok === true,
          httpStatus: parsed.result?.httpStatus ?? null,
          authenticated: parsed.result?.authenticated ?? null,
          reachable: parsed.result?.reachable ?? null,
        }
      : { ok: false, exitCode: result.status },
  };
}

function summarizeFirstWriteSafety(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    purpose: value.purpose ?? null,
    keyRotationEvidenceGateRun: value.keyRotationEvidenceGateRun === true,
    keyRotatedAfterIso: value.keyRotatedAfterIso ?? null,
    envFilePath: value.envFilePath ?? null,
    envFileLoaded: value.envFileLoaded === true,
    envFileMtimeIso: value.envFileMtimeIso ?? null,
    envFileMtimeAfterCheckpoint:
      typeof value.envFileMtimeAfterCheckpoint === "boolean" ? value.envFileMtimeAfterCheckpoint : null,
    proofRefreshAllowedByThisProbe: value.proofRefreshAllowedByThisProbe === true,
    applyAllowedByThisProbe: value.applyAllowedByThisProbe === true,
  };
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: "https://backend.getrecall.ai/api/v1",
    dateFrom: "2100-01-01T00:00:00.000Z",
    dateTo: "2100-01-02T00:00:00.000Z",
    envFilePath: DEFAULT_ENV_FILE,
    evidenceFilePath: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    systemEnvFile: false,
    envFilePathSpecified: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--base-url" && next) {
      parsed.baseUrl = next;
      i += 1;
    } else if (arg === "--date-from" && next) {
      parsed.dateFrom = next;
      i += 1;
    } else if (arg === "--date-to" && next) {
      parsed.dateTo = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      parsed.envFilePathSpecified = true;
      i += 1;
    } else if (arg === "--evidence-file" && next) {
      parsed.evidenceFilePath = next;
      i += 1;
    } else if (arg === "--min-rotated-after" && next) {
      parsed.minRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--system-env-file") {
      parsed.systemEnvFile = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (parsed.systemEnvFile && !parsed.envFilePathSpecified) {
    parsed.envFilePath = DEFAULT_SYSTEM_ENV_FILE;
  }
  assertIso(parsed.minRotatedAfterIso, "--min-rotated-after");
  assertIso(parsed.dateFrom, "--date-from");
  assertIso(parsed.dateTo, "--date-to");
  return parsed;
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
          "No private Recall card IDs, titles, source URLs, chunks, raw response body, dry-run proof payload, apply payload, backup payload, or database rows were printed.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(exitCode);
}

function parseJson(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function assertIso(value, label) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
}

function isUnderPrivateRoot(filePath) {
  const root = resolve(PRIVATE_ROOT);
  return filePath === root || filePath.startsWith(`${root}${sep}`);
}

function printHelp() {
  console.log(`Record private Recall key rotation evidence

Usage:
  BRAIN_RECALL_KEY_ROTATION_ACK="${REQUIRED_KEY_ROTATION_ACK}" npm run recall:key-rotation-evidence:record
  BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="${REQUIRED_SYSTEM_KEY_ROTATION_ACK}" npm run recall:key-rotation-evidence:record -- --system-env-file --env-file /etc/brain/.env

This command:
  - requires the exact key rotation acknowledgement;
  - runs the read-only live auth probe;
  - writes owner-only private evidence under ${PRIVATE_ROOT}/;
  - stores no Recall API key and no private Recall content;
  - does not apply, deploy, enable the scheduler, refresh proof, or advance a checkpoint.
  - with --system-env-file, validates a production env file such as /etc/brain/.env using restrictive system-file permissions and verifies the evidence gate with --system-env-file.
`);
}
