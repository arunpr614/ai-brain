#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { assertRecallEnvFileSafety } from "./lib/recall-env-file.mjs";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const DEFAULT_LOCAL_ENV_FILE = "data/private/recall-live-spikes/recall.env";
const DEFAULT_REMOTE_ENV_FILE = "/etc/brain/.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const DEFAULT_BASE_URL = "https://backend.getrecall.ai/api/v1";
const ACK =
  "I confirm the rotated Recall API key in the ignored local private Recall env file should be installed into the production Recall system env file and verified with a read-only Recall auth probe.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
if (process.env.BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK !== ACK) {
  findings.push({
    id: "production_key_install_ack_required",
    message:
      "Exact BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK is required before reading the local private Recall key or writing the production env file.",
    requiredEnv: "BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK",
  });
}

let localEnvSummary = null;
let apiKey = "";
if (findings.length === 0) {
  localEnvSummary = inspectLocalEnv(args.localEnvFile, args.minRotatedAfterIso);
  if (!localEnvSummary.ok) findings.push(...localEnvSummary.findings);
}

if (findings.length === 0) {
  apiKey = readRecallApiKey(args.localEnvFile);
  if (!/^sk_[A-Za-z0-9._-]{12,}$/.test(apiKey)) {
    findings.push({
      id: "invalid_local_recall_api_key_shape",
      message: "Local private Recall env file does not contain a single-line Recall sk_ API key.",
    });
  }
}

let remote = null;
let remoteJson = null;
if (findings.length === 0) {
  remote = runRemoteInstall(args, apiKey);
  apiKey = "";
  remoteJson = parseMaybeJson(remote.stdout || remote.stderr);
  if (remote.status !== 0 || remoteJson?.ok !== true) {
    findings.push({
      id: "remote_production_key_install_failed",
      message: "Production Recall key install or read-only auth probe failed.",
      exitCode: remote.status,
      remoteStatus: remoteJson?.status ?? null,
      remoteCode: remoteJson?.code ?? null,
    });
  }
}

apiKey = "";

const ok = findings.length === 0;
const output = {
  ok,
  status: ok ? "production_recall_key_installed_and_live_probe_passed" : "blocked_production_recall_key_install",
  host: args.host,
  remoteDir: args.remoteDir,
  localEnvFile: localEnvSummary ? summarizeLocalEnv(localEnvSummary) : { path: args.localEnvFile, read: false },
  remoteEnvFile: args.remoteEnvFile,
  minRotatedAfterIso: args.minRotatedAfterIso,
  acknowledgementRequired: true,
  productionEnvWriteAttempted: remote !== null,
  readOnlyRecallAuthProbeAttempted: remoteJson?.readOnlyRecallAuthProbeAttempted === true,
  aiBrainWriteAttempted: false,
  recallImportAttempted: false,
  schedulerEnablementAttempted: false,
  checkpointMovementAttempted: false,
  remote: summarizeRemote(remote, remoteJson),
  findings,
  safetyNote: remote
    ? "This command installed only the Recall API key into the production system env file, kept live confirmation disabled by default, and attempted one read-only Recall auth probe. It did not import Recall data or write AI Brain rows."
    : "This command stopped before reading key material or contacting production because the required acknowledgement or local private env checks failed.",
};

const text = `${JSON.stringify(output, null, 2)}\n`;
if (!ok) {
  console.error("[run-recall-production-env-key-install] blocked");
  console.error(text);
  process.exit(1);
}

process.stdout.write(text);

function inspectLocalEnv(path, minRotatedAfterIso) {
  const findingsList = [];
  let safety = null;
  try {
    safety = assertRecallEnvFileSafety(path);
  } catch (error) {
    findingsList.push({
      id: "unsafe_local_private_recall_env",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const stats = statSync(resolve(path));
  const minMs = Date.parse(minRotatedAfterIso);
  const mtimeIso = stats.mtime.toISOString();
  if (Number.isFinite(minMs) && stats.mtimeMs < minMs) {
    findingsList.push({
      id: "local_private_env_not_rotated_after_checkpoint",
      message: "The local private Recall env file mtime is older than the required key-rotation checkpoint.",
      mtimeIso,
      minRotatedAfterIso: new Date(minMs).toISOString(),
    });
  }

  return {
    ok: findingsList.length === 0,
    path,
    mtimeIso,
    mode: (stats.mode & 0o777).toString(8).padStart(3, "0"),
    underPrivateRecallEvidencePath: safety?.underPrivateRecallEvidencePath ?? null,
    ignored: safety?.ignored ?? null,
    tracked: safety?.tracked ?? null,
    findings: findingsList,
  };
}

function summarizeLocalEnv(summary) {
  return {
    path: summary.path,
    read: summary.ok,
    mode: summary.mode,
    mtimeIso: summary.mtimeIso,
    underPrivateRecallEvidencePath: summary.underPrivateRecallEvidencePath,
    ignored: summary.ignored,
    tracked: summary.tracked,
    containsRecallApiKey: summary.ok,
    keyPrinted: false,
  };
}

function readRecallApiKey(path) {
  const text = readFileSync(resolve(path), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed?.key === "RECALL_API_KEY") return parsed.value.trim();
  }
  return "";
}

function parseEnvLine(line) {
  const withoutComment = stripUnquotedComment(line).trim();
  if (!withoutComment) return null;
  const match = withoutComment.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  return { key: match[1], value: unquoteEnvValue(match[2].trim()) };
}

function stripUnquotedComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === "#" && !quote) return value.slice(0, index);
  }
  return value;
}

function unquoteEnvValue(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function runRemoteInstall(options, key) {
  const remoteCommand = `cd ${shellQuote(options.remoteDir)} && ${options.remoteNodeCommand} --input-type=module -`;
  return spawnSync(options.sshCommand, [options.host, remoteCommand], {
    input: remoteInstallScript(options, key),
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function remoteInstallScript(options, key) {
  return `
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const KEY = ${JSON.stringify(key)};
const REMOTE_ENV_FILE = ${JSON.stringify(options.remoteEnvFile)};
const EVIDENCE_FILE = ${JSON.stringify(options.evidenceFile)};
const MIN_ROTATED_AFTER_ISO = ${JSON.stringify(options.minRotatedAfterIso)};
const BASE_URL = ${JSON.stringify(options.baseUrl)};
const DATE_FROM = ${JSON.stringify(options.dateFrom)};
const DATE_TO = ${JSON.stringify(options.dateTo)};
const SKIP_LIVE_PROBE = ${JSON.stringify(options.skipLiveProbe)};

const startedAtIso = new Date().toISOString();
const beforeText = existsSync(REMOTE_ENV_FILE) ? readFileSync(REMOTE_ENV_FILE, "utf8") : "";
const beforeKeys = envKeys(beforeText);
const backupPath = existsSync(REMOTE_ENV_FILE)
  ? REMOTE_ENV_FILE + ".recall-key-install-" + startedAtIso.replace(/[:.]/g, "-") + ".bak"
  : null;
if (backupPath) copyFileSync(REMOTE_ENV_FILE, backupPath);

mkdirSync(dirname(REMOTE_ENV_FILE), { recursive: true });
const nextText = rewriteEnv(beforeText, KEY);
writeFileSync(REMOTE_ENV_FILE, nextText, { encoding: "utf8", mode: existingModeOrDefault(REMOTE_ENV_FILE) });
chmodSync(REMOTE_ENV_FILE, existingModeOrDefault(REMOTE_ENV_FILE));

const afterStats = statSync(REMOTE_ENV_FILE);
const afterText = readFileSync(REMOTE_ENV_FILE, "utf8");
const afterKeys = envKeys(afterText);

let liveAuthProbe = null;
if (!SKIP_LIVE_PROBE) {
  const probeRaw = spawnSync(process.execPath, [
    "--",
    "scripts/run-recall-live-auth-probe.mjs",
    "--system-env-file",
    "--env-file",
    REMOTE_ENV_FILE,
    "--base-url",
    BASE_URL,
    "--date-from",
    DATE_FROM,
    "--date-to",
    DATE_TO,
    "--key-rotated-after",
    MIN_ROTATED_AFTER_ISO,
    "--confirm-live-api",
  ], {
    env: { ...process.env, RECALL_API_KEY: "", BRAIN_RECALL_CONFIRM_LIVE_API: "1" },
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  liveAuthProbe = summarizeChild(probeRaw);
}

const keyEvidenceRaw = spawnSync(process.execPath, [
  "--",
  "scripts/check-recall-key-rotation-evidence.mjs",
  "--system-env-file",
  "--env-file",
  REMOTE_ENV_FILE,
  "--evidence-file",
  EVIDENCE_FILE,
  "--min-rotated-after",
  MIN_ROTATED_AFTER_ISO,
], {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});
const keyEvidence = summarizeChild(keyEvidenceRaw);

const ok = (SKIP_LIVE_PROBE || liveAuthProbe?.ok === true) && keyEvidence.ok === true;
console.log(JSON.stringify({
  ok,
  status: ok ? "production_recall_key_installed_and_live_probe_passed" : "blocked_production_recall_key_install",
  remoteEnvFile: REMOTE_ENV_FILE,
  backupPath,
  before: {
    hadRecallApiKey: beforeKeys.includes("RECALL_API_KEY"),
    hadLiveConfirmDefault: beforeKeys.includes("BRAIN_RECALL_CONFIRM_LIVE_API"),
    keyCount: beforeKeys.length,
  },
  after: {
    hasRecallApiKey: afterKeys.includes("RECALL_API_KEY"),
    hasLiveConfirmDefault: afterKeys.includes("BRAIN_RECALL_CONFIRM_LIVE_API"),
    liveConfirmDefault: valueForKey(afterText, "BRAIN_RECALL_CONFIRM_LIVE_API"),
    mode: (afterStats.mode & 0o777).toString(8).padStart(3, "0"),
    mtimeIso: afterStats.mtime.toISOString(),
    keyCount: afterKeys.length,
  },
  readOnlyRecallAuthProbeAttempted: !SKIP_LIVE_PROBE,
  liveAuthProbe,
  keyEvidence,
  safetyNotes: [
    "No Recall API key was printed.",
    "Production live confirmation remains disabled in the system env file.",
    "The live probe used GET /cards only.",
    "No Recall import, AI Brain database write, scheduler enablement, or checkpoint movement was attempted."
  ],
}, null, 2));
process.exit(ok ? 0 : 1);

function rewriteEnv(text, key) {
  const lines = text.split(/\\r?\\n/);
  const out = [];
  let sawKey = false;
  let sawConfirm = false;
  for (const line of lines) {
    const keyName = keyForLine(line);
    if (keyName === "RECALL_API_KEY") {
      out.push("export RECALL_API_KEY=" + JSON.stringify(key));
      sawKey = true;
    } else if (keyName === "BRAIN_RECALL_CONFIRM_LIVE_API") {
      out.push("export BRAIN_RECALL_CONFIRM_LIVE_API=0");
      sawConfirm = true;
    } else {
      out.push(line);
    }
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  if (!sawKey || !sawConfirm) {
    if (out.length > 0) out.push("");
    out.push("# Recall daily sync credentials. Managed by recall:production-env-key:install.");
    if (!sawKey) out.push("export RECALL_API_KEY=" + JSON.stringify(key));
    if (!sawConfirm) out.push("export BRAIN_RECALL_CONFIRM_LIVE_API=0");
  }
  return out.join("\\n") + "\\n";
}

function existingModeOrDefault(path) {
  if (!existsSync(path)) return 0o640;
  const mode = statSync(path).mode & 0o777;
  return mode || 0o640;
}

function envKeys(text) {
  return text.split(/\\r?\\n/)
    .map((line) => keyForLine(line))
    .filter(Boolean)
    .sort();
}

function keyForLine(line) {
  const match = String(line).match(/^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=/);
  return match?.[1] ?? null;
}

function valueForKey(text, key) {
  for (const line of text.split(/\\r?\\n/)) {
    if (keyForLine(line) === key) {
      return line.replace(/^\\s*(?:export\\s+)?[A-Za-z_][A-Za-z0-9_]*\\s*=\\s*/, "").replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

function summarizeChild(result) {
  const parsed = parseMaybeJson(result.stdout || result.stderr);
  return {
    ok: result.status === 0 && parsed?.ok === true,
    exitCode: result.status,
    mode: parsed?.mode ?? null,
    status: parsed?.status ?? null,
    verdict: parsed?.verdict ?? parsed?.gateVerdict ?? null,
    evidenceSource: parsed?.evidenceSource ?? null,
    code: parsed?.code ?? null,
    result: parsed?.result
      ? {
          httpStatus: parsed.result.httpStatus ?? null,
          authenticated: parsed.result.authenticated ?? null,
          reachable: parsed.result.reachable ?? null,
          totalCount: parsed.result.totalCount ?? null,
          resultCount: parsed.result.resultCount ?? null,
        }
      : null,
    findings: Array.isArray(parsed?.findings)
      ? parsed.findings.map((finding) => ({ rule: finding.rule ?? finding.id ?? null, message: finding.message ?? null }))
      : [],
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
`;
}

function summarizeRemote(result, parsed) {
  if (!result) return null;
  return {
    ok: result.status === 0 && parsed?.ok === true,
    exitCode: result.status,
    status: parsed?.status ?? null,
    remoteEnvFile: parsed?.remoteEnvFile ?? null,
    backupCreated: Boolean(parsed?.backupPath),
    before: parsed?.before ?? null,
    after: parsed?.after ?? null,
    liveAuthProbe: parsed?.liveAuthProbe
      ? {
          ok: parsed.liveAuthProbe.ok === true,
          exitCode: parsed.liveAuthProbe.exitCode ?? null,
          mode: parsed.liveAuthProbe.mode ?? null,
          code: parsed.liveAuthProbe.code ?? null,
          result: parsed.liveAuthProbe.result ?? null,
        }
      : null,
    keyEvidence: parsed?.keyEvidence
      ? {
          ok: parsed.keyEvidence.ok === true,
          exitCode: parsed.keyEvidence.exitCode ?? null,
          verdict: parsed.keyEvidence.verdict ?? null,
          evidenceSource: parsed.keyEvidence.evidenceSource ?? null,
          findings: parsed.keyEvidence.findings ?? [],
        }
      : null,
    stdoutPreview: preview(result.stdout),
    stderrPreview: preview(result.stderr),
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
      process.env.BRAIN_RECALL_PRODUCTION_KEY_INSTALL_SSH_COMMAND ||
      process.env.BRAIN_RECALL_PRODUCTION_KEY_EVIDENCE_REPAIR_SSH_COMMAND ||
      "ssh",
    remoteNodeCommand: process.env.BRAIN_RECALL_PRODUCTION_KEY_INSTALL_REMOTE_NODE_COMMAND || "sudo -n node",
    localEnvFile: DEFAULT_LOCAL_ENV_FILE,
    remoteEnvFile: DEFAULT_REMOTE_ENV_FILE,
    evidenceFile: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    baseUrl: DEFAULT_BASE_URL,
    dateFrom: "2100-01-01T00:00:00.000Z",
    dateTo: "2100-01-02T00:00:00.000Z",
    skipLiveProbe: false,
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
    } else if (arg === "--remote-node-command" && next) {
      parsed.remoteNodeCommand = next;
      i += 1;
    } else if (arg === "--local-env-file" && next) {
      parsed.localEnvFile = next;
      i += 1;
    } else if (arg === "--remote-env-file" && next) {
      parsed.remoteEnvFile = next;
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
    } else if (arg === "--skip-live-probe") {
      parsed.skipLiveProbe = true;
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
  console.log(`Install rotated Recall key into production system env

Usage:
  BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK="${ACK}" npm run recall:production-env-key:install

This command reads the ignored local private Recall env file, installs only
RECALL_API_KEY into the production system env file, keeps
BRAIN_RECALL_CONFIRM_LIVE_API=0, runs one read-only /cards auth probe, and
reruns the production key evidence gate. It prints no key material and does not
import Recall data, write AI Brain rows, enable a scheduler, or move a checkpoint.
`);
}
