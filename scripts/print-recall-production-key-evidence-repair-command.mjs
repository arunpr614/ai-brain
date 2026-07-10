#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const DEFAULT_HOST = process.env.BRAIN_SSH_HOST || "brain";
const DEFAULT_REMOTE_DIR = process.env.BRAIN_REMOTE_DIR || "/opt/brain";
const DEFAULT_ENV_FILE = "/etc/brain/.env";
const DEFAULT_EVIDENCE_FILE = "data/private/recall-live-spikes/key-rotation-evidence.json";
const DEFAULT_MIN_ROTATED_AFTER_ISO = "2026-06-24T15:54:17.000Z";
const SYSTEM_ACK =
  "I confirm the Recall API key in the production Recall system env file was rotated after chat exposure and should be verified by a read-only live auth probe before recording production key-rotation evidence.";
const INSTALL_ACK =
  "I confirm the rotated Recall API key in the ignored local private Recall env file should be installed into the production Recall system env file and verified with a read-only Recall auth probe.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const remoteEvidence = args.skipRemoteCheckForSmoke
  ? skippedResult("remote_key_evidence_check_skipped_for_smoke")
  : runRemoteEvidenceCheck(args);
const remoteEnvContract = args.skipRemoteCheckForSmoke
  ? skippedResult("remote_env_contract_check_skipped_for_smoke")
  : runRemoteEnvContractCheck(args);
const remoteEvidenceSummary = summarizeRemoteEvidence(remoteEvidence);
const remoteEnvContractSummary = summarizeRemoteEnvContract(remoteEnvContract);
const command = buildRepairCommand();
const installCommand = buildInstallCommand();
const findings = [];

if (!remoteEvidence.skipped && remoteEvidence.parsed === null) {
  findings.push({
    id: "remote_key_evidence_check_unreadable",
    message: "Remote key-evidence check did not return parseable JSON; do not run the repair command until SSH/runtime output is understood.",
    exitCode: remoteEvidence.exitCode,
  });
}

const ok = findings.length === 0;
const result = {
  ok,
  mode: "production_system_key_evidence_repair_command_handoff",
  noLiveNoWrite: true,
  acknowledgementRequired: true,
  acknowledgementTextPrinted: true,
  host: args.host,
  remoteDir: args.remoteDir,
  envFile: args.envFile,
  evidenceFile: args.evidenceFile,
  minRotatedAfterIso: args.minRotatedAfterIso,
  remoteEvidence: remoteEvidenceSummary,
  remoteEnvContract: remoteEnvContractSummary,
  command,
  installCommand,
  commandNotes: [
    "Printing this command is not acknowledgement and does not run it.",
    "If remoteEnvContract.hasRecallApiKey is false, install the rotated local private Recall key into production first with installCommand.",
    "Run it only after the production Recall API key in /etc/brain/.env has truly been rotated after chat exposure.",
    "The repair runner still refuses without exact BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK.",
    "The repair runner performs one read-only Recall auth probe and writes private key-rotation evidence if the probe passes.",
    "The repair runner does not import Recall data, write AI Brain rows, deploy, enable a scheduler, or move a checkpoint.",
    "After repair, rerun npm run recall:second-manual:production-command before any second-manual approval.",
  ],
  findings,
  safetyNote:
    "This handoff is no-live and no-write. It checks only remote key-evidence metadata when not skipped and prints the guarded repair runner command.",
};

const output = args.json ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result);
if (!ok) {
  console.error(output);
  process.exit(1);
}

process.stdout.write(output);

function runRemoteEvidenceCheck(options) {
  const remoteCommand = [
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
  const result = spawnSync(options.sshCommand, [options.host, remoteCommand], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    skipped: false,
    exitCode: result.status,
    parsed: parseMaybeJson(result.stdout || result.stderr),
  };
}

function runRemoteEnvContractCheck(options) {
  const remoteScript = `
const fs = require("fs");
const path = ${JSON.stringify(options.envFile)};
const exists = fs.existsSync(path);
const keys = [];
if (exists) {
  for (const line of fs.readFileSync(path, "utf8").split(/\\r?\\n/)) {
    const match = line.match(/^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=/);
    if (match) keys.push(match[1]);
  }
}
console.log(JSON.stringify({
  ok: exists,
  envFile: path,
  exists,
  hasRecallApiKey: keys.includes("RECALL_API_KEY"),
  hasBrainRecallConfirmLiveApi: keys.includes("BRAIN_RECALL_CONFIRM_LIVE_API"),
  recallOrBrainKeyNames: keys.filter((key) => /RECALL|BRAIN/.test(key)).sort(),
  keyValuesPrinted: false
}, null, 2));
process.exit(exists ? 0 : 1);
`;
  const remoteCommand = `node -e ${shellQuote(remoteScript)}`;
  const result = spawnSync(options.sshCommand, [options.host, remoteCommand], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    skipped: false,
    exitCode: result.status,
    parsed: parseMaybeJson(result.stdout || result.stderr),
  };
}

function summarizeRemoteEvidence(result) {
  if (result.skipped) {
    return {
      ok: true,
      skipped: true,
      status: result.status,
      repairStatus: "unknown_smoke_skip",
    };
  }
  const rules = Array.isArray(result.parsed?.findings) ? result.parsed.findings.map((finding) => finding.rule) : [];
  const ok = result.exitCode === 0 && result.parsed?.ok === true;
  return {
    ok,
    exitCode: result.exitCode,
    verdict: result.parsed?.verdict ?? null,
    evidenceSource: result.parsed?.evidenceSource ?? null,
    repairStatus: ok ? "already_satisfied" : "needs_repair_or_operator_review",
    envFile: result.parsed?.summary?.envFile ?? args.envFile,
    evidenceFile: result.parsed?.summary?.evidenceFile ?? args.evidenceFile,
    systemEnvFile: result.parsed?.summary?.systemEnvFile ?? true,
    findingRules: rules,
  };
}

function summarizeRemoteEnvContract(result) {
  if (result.skipped) {
    return {
      ok: true,
      skipped: true,
      status: result.status,
      hasRecallApiKey: null,
    };
  }
  return {
    ok: result.exitCode === 0 && result.parsed?.ok === true,
    exitCode: result.exitCode,
    envFile: result.parsed?.envFile ?? args.envFile,
    exists: result.parsed?.exists === true,
    hasRecallApiKey: result.parsed?.hasRecallApiKey === true,
    hasBrainRecallConfirmLiveApi: result.parsed?.hasBrainRecallConfirmLiveApi === true,
    recallOrBrainKeyNames: Array.isArray(result.parsed?.recallOrBrainKeyNames)
      ? result.parsed.recallOrBrainKeyNames
      : [],
    keyValuesPrinted: false,
  };
}

function skippedResult(status) {
  return {
    skipped: true,
    exitCode: 0,
    status,
    parsed: null,
  };
}

function buildRepairCommand() {
  return [
    `BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK=${shellQuote(SYSTEM_ACK)} \\`,
    "npm run recall:production-key-evidence:repair",
  ].join("\n");
}

function buildInstallCommand() {
  return [
    `BRAIN_RECALL_PRODUCTION_KEY_INSTALL_ACK=${shellQuote(INSTALL_ACK)} \\`,
    "npm run recall:production-env-key:install",
  ].join("\n");
}

function toMarkdown(result) {
  const lines = [
    "# Recall Production System Key-Evidence Repair Command",
    "",
    `- No live/no write: \`${result.noLiveNoWrite}\``,
    `- Remote evidence status: \`${result.remoteEvidence.repairStatus}\``,
    `- Production has RECALL_API_KEY: \`${result.remoteEnvContract.hasRecallApiKey ?? "unknown"}\``,
    `- Finding rules: \`${(result.remoteEvidence.findingRules ?? []).join(", ") || "none"}\``,
    "",
    "## Guarded Production Key Install Command",
    "",
    "```bash",
    result.installCommand,
    "```",
    "",
    "## Guarded Repair Runner Command",
    "",
    "```bash",
    result.command,
    "```",
    "",
    "## Notes",
    "",
    ...result.commandNotes.map((note) => `- ${note}`),
    "",
    result.safetyNote,
  ];
  return `${lines.join("\n")}\n`;
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
      process.env.BRAIN_RECALL_PRODUCTION_KEY_EVIDENCE_COMMAND_SSH_COMMAND ||
      process.env.BRAIN_RECALL_REMOTE_PREFLIGHT_SSH_COMMAND ||
      "ssh",
    envFile: DEFAULT_ENV_FILE,
    evidenceFile: DEFAULT_EVIDENCE_FILE,
    minRotatedAfterIso: DEFAULT_MIN_ROTATED_AFTER_ISO,
    skipRemoteCheckForSmoke: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
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
    } else if (arg === "--skip-remote-check-for-smoke") {
      parsed.skipRemoteCheckForSmoke = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  assertIso(parsed.minRotatedAfterIso, "--min-rotated-after");
  return parsed;
}

function assertIso(value, label) {
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
}

function printHelp() {
  console.log(`Recall production key-evidence repair command handoff

Usage:
  npm run recall:production-key-evidence:command
  npm run recall:production-key-evidence:command -- --json

This command is no-live and no-write. It checks the remote production key
evidence gate and prints the guarded repair runner command. Printing the
command is not acknowledgement. The runner still refuses unless exact
BRAIN_RECALL_SYSTEM_KEY_ROTATION_ACK is present.
`);
}
