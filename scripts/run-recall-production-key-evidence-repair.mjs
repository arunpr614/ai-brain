#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const DEFAULT_ENV_FILE = "/etc/brain/.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const DEFAULT_BASE_URL = "https://backend.getrecall.ai/api/v1";
const SYSTEM_ACK =
  "I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence.";
const PRIVATE_ACK =
  "I confirm the Recall API key used for this apply was rotated after chat exposure and stored only in the ignored private Recall env file.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const acknowledgementStatus = summarizeAcknowledgementStatus();
const findings = [];

if (!acknowledgementStatus.systemAcknowledgementExact) {
  findings.push({
    id: acknowledgementStatus.privateAcknowledgementPresent
      ? "private_acknowledgement_wrong_gate"
      : "production_system_acknowledgement_required",
    message: acknowledgementStatus.privateAcknowledgementPresent
      ? "The local private-env key rotation acknowledgement was supplied, but production system env-file evidence repair requires BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK."
      : "Exact BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK is required before the production repair runner can make a read-only Recall auth probe.",
    requiredEnv: "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
  });
}

let remoteRepair = null;
let remoteRepairJson = null;
let remotePostCheck = null;
let remotePostCheckJson = null;

if (findings.length === 0) {
  remoteRepair = runRemote(args, buildRemoteRecorderCommand(args));
  remoteRepairJson = parseMaybeJson(remoteRepair.stdout || remoteRepair.stderr);
  if (remoteRepair.status !== 0 || remoteRepairJson?.ok !== true) {
    findings.push({
      id: "remote_key_evidence_repair_failed",
      message: "Production key-evidence recorder exited nonzero. Evidence was not accepted.",
      exitCode: remoteRepair.status,
      code: remoteRepairJson?.code ?? null,
    });
  }
}

if (findings.length === 0 && !args.skipPostCheck) {
  remotePostCheck = runRemote(args, buildRemoteEvidenceCheckCommand(args));
  remotePostCheckJson = parseMaybeJson(remotePostCheck.stdout || remotePostCheck.stderr);
  if (remotePostCheck.status !== 0 || remotePostCheckJson?.ok !== true) {
    findings.push({
      id: "remote_key_evidence_post_check_failed",
      message: "Production key-evidence post-check did not pass after repair.",
      exitCode: remotePostCheck.status,
    });
  }
}

const repairAttempted = remoteRepair !== null;
const ok = findings.length === 0;
const output = {
  ok,
  status: ok ? "production_system_key_evidence_repair_completed" : "blocked_production_system_key_evidence_repair",
  host: args.host,
  remoteDir: args.remoteDir,
  envFile: args.envFile,
  evidenceFile: args.evidenceFile,
  minRotatedAfterIso: args.minRotatedAfterIso,
  acknowledgementRequired: true,
  acknowledgementStatus,
  noLiveNoWrite: !repairAttempted,
  readOnlyRecallAuthProbeAttempted: repairAttempted,
  privateEvidenceWriteAttempted: repairAttempted,
  aiBrainWriteAttempted: false,
  recallImportAttempted: false,
  schedulerEnablementAttempted: false,
  checkpointMovementAttempted: false,
  remoteRepair: summarizeRemote(remoteRepair, remoteRepairJson),
  remotePostCheck: summarizeRemote(remotePostCheck, remotePostCheckJson),
  findings,
  safetyNote: repairAttempted
    ? "This runner attempted only the production key-evidence repair path: one read-only Recall auth probe plus private evidence recording. It did not import Recall data or write AI Brain rows."
    : "This runner stopped before any live Recall call or private evidence write because the exact production system acknowledgement was not present.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[run-recall-production-key-evidence-repair] blocked");
  console.error(text);
  process.exit(1);
}

process.stdout.write(text);

function buildRemoteRecorderCommand(options) {
  const command = [
    "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
    "=",
    shellQuote(SYSTEM_ACK),
    " ",
    "node -- scripts/record-recall-key-rotation-evidence.mjs",
    " --system-env-file",
    " --env-file ",
    shellQuote(options.envFile),
    " --evidence-file ",
    shellQuote(options.evidenceFile),
    " --min-rotated-after ",
    shellQuote(options.minRotatedAfterIso),
    " --base-url ",
    shellQuote(options.baseUrl),
    " --date-from ",
    shellQuote(options.dateFrom),
    " --date-to ",
    shellQuote(options.dateTo),
  ].join("");
  return `cd ${shellQuote(options.remoteDir)} && ${command}`;
}

function buildRemoteEvidenceCheckCommand(options) {
  return [
    `cd ${shellQuote(options.remoteDir)} &&`,
    "node -- scripts/check-recall-key-rotation-evidence.mjs",
    "--system-env-file",
    "--env-file",
    shellQuote(options.envFile),
    "--evidence-file",
    shellQuote(options.evidenceFile),
    "--min-rotated-after",
    shellQuote(options.minRotatedAfterIso),
  ].join(" ");
}

function runRemote(options, remoteCommand) {
  return spawnSync(options.sshCommand, [options.host, remoteCommand], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function summarizeRemote(result, parsed) {
  if (!result) return null;
  return {
    ok: result.status === 0 && parsed?.ok === true,
    exitCode: result.status,
    mode: parsed?.mode ?? null,
    status: parsed?.status ?? null,
    code: parsed?.code ?? null,
    gateVerdict: parsed?.gateVerdict ?? parsed?.verdict ?? null,
    evidenceSource: parsed?.evidenceSource ?? null,
    liveAuthProbe: parsed?.liveAuthProbe
      ? {
          ok: parsed.liveAuthProbe.ok === true,
          httpStatus: parsed.liveAuthProbe.httpStatus ?? null,
          authenticated: parsed.liveAuthProbe.authenticated ?? null,
          reachable: parsed.liveAuthProbe.reachable ?? null,
          totalCount: parsed.liveAuthProbe.totalCount ?? null,
          resultCount: parsed.liveAuthProbe.resultCount ?? null,
        }
      : null,
    stdoutPreview: preview(result.stdout),
    stderrPreview: preview(result.stderr),
  };
}

function summarizeAcknowledgementStatus() {
  const system = String(process.env.BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK ?? "");
  const privateAck = String(process.env.BRAIN_RECALL_KEY_ROTATION_ACK ?? "");
  return {
    requiredEnv: "BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK",
    systemAcknowledgementExact: system === SYSTEM_ACK,
    systemAcknowledgementPresent: system.length > 0,
    privateAcknowledgementPresent: privateAck.length > 0,
    privateAcknowledgementWasSuppliedToWrongGate: privateAck === PRIVATE_ACK,
  };
}

function preview(value) {
  const text = redact(String(value ?? "").trim());
  return text.length > 3000 ? `${text.slice(0, 3000)}...<truncated>` : text;
}

function redact(value) {
  return value
    .replace(/\bsk_[A-Za-z0-9._-]{12,}\b/g, "<redacted:secret>")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/gi, "Bearer <redacted:token>");
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseArgs(argv) {
  const parsed = {
    host: DEFAULT_HOST,
    remoteDir: DEFAULT_REMOTE_DIR,
    sshCommand:
      process.env.BRAIN_RECALL_PRODUCTION_KEY_EVIDENCE_REPAIR_SSH_COMMAND ||
      process.env.BRAIN_RECALL_PRODUCTION_COMMAND_SSH_COMMAND ||
      "ssh",
    envFile: DEFAULT_ENV_FILE,
    evidenceFile: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    baseUrl: DEFAULT_BASE_URL,
    dateFrom: "2100-01-01T00:00:00.000Z",
    dateTo: "2100-01-02T00:00:00.000Z",
    skipPostCheck: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--host" && next) {
      parsed.host = next;
      i += 1;
    } else if (arg === "--remote-dir" && next) {
      parsed.remoteDir = next;
      i += 1;
    } else if (arg === "--ssh-command" && next) {
      parsed.sshCommand = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFile = next;
      i += 1;
    } else if (arg === "--evidence-file" && next) {
      parsed.evidenceFile = next;
      i += 1;
    } else if (arg === "--min-rotated-after" && next) {
      parsed.minRotatedAfterIso = next;
      i += 1;
    } else if (arg === "--base-url" && next) {
      parsed.baseUrl = next;
      i += 1;
    } else if (arg === "--date-from" && next) {
      parsed.dateFrom = next;
      i += 1;
    } else if (arg === "--date-to" && next) {
      parsed.dateTo = next;
      i += 1;
    } else if (arg === "--skip-post-check") {
      parsed.skipPostCheck = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  assertIso(parsed.minRotatedAfterIso, "--min-rotated-after");
  assertIso(parsed.dateFrom, "--date-from");
  assertIso(parsed.dateTo, "--date-to");
  return parsed;
}

function assertIso(value, label) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
}

function printHelp() {
  console.log(`Recall production system key-evidence repair runner

Usage:
  BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK="${SYSTEM_ACK}" npm run recall:production-key-evidence:repair

This runner executes the production system env-file evidence recorder on the
remote host. It requires exact production-specific acknowledgement before any
read-only Recall auth probe or private evidence write. It does not import
Recall data, write AI Brain rows, deploy, enable a scheduler, or move a
checkpoint.
`);
}
