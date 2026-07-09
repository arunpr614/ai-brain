#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_SPIKE_DIR = "docs/plans/spikes";
const DEFAULT_MANIFEST_PATH = "data/private/recall-live-spikes/controlled-samples.json";
const DEFAULT_ACCEPTED_FIDELITY_RISK =
  "Live Recall API detail chunks are unverified; keep production import blocked by default unless explicit fidelity flags and review are used.";
const APPROVAL =
  "I approve one additional manual Recall -> AI Brain production verification run before scheduler enablement, using the current deployed Recall sync code, the rotated private Recall env file, explicit live API confirmation, reviewed proof gates, no scheduler timer enablement, and no checkpoint movement beyond what the guarded apply path records.";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const selectedReports = args.enumerationPath && args.fidelityPath
  ? { enumerationPath: args.enumerationPath, fidelityPath: args.fidelityPath, selectedBy: "explicit_paths" }
  : findLatestSpikePair(args.spikeDir);

const liveSpikeGate = args.skipLiveSpikeGate
  ? { ok: true, skipped: true, parsed: null, exitCode: null }
  : runLiveSpikeGate(selectedReports, args);
const readiness = args.skipReadiness
  ? { ok: true, skipped: true, parsed: null, exitCode: null }
  : runJsonCommand(["scripts/check-recall-second-manual-verification-readiness.mjs"]);

const ok = liveSpikeGate.ok && readiness.ok;
const env = {
  BRAIN_RECALL_MANUAL_VERIFICATION_APPROVAL: APPROVAL,
  BRAIN_RECALL_SYNC_ENABLED: "1",
  BRAIN_RECALL_CONFIRM_LIVE_API: "1",
  BRAIN_RECALL_REQUIRE_LIVE_SPIKE_REPORT_PROOF: "1",
  BRAIN_RECALL_LIVE_SPIKE_ENUMERATION_REPORT_PATH: selectedReports.enumerationPath,
  BRAIN_RECALL_LIVE_SPIKE_FIDELITY_REPORT_PATH: selectedReports.fidelityPath,
  BRAIN_RECALL_LIVE_SPIKE_ALLOW_FIDELITY_CHANGES: "1",
  BRAIN_RECALL_LIVE_SPIKE_ACCEPTED_FIDELITY_RISK: args.acceptedFidelityRisk,
  BRAIN_RECALL_ALLOW_UNVERIFIED_IMPORT: "1",
  BRAIN_RECALL_ALLOW_METADATA_ONLY_IMPORT: "1",
  BRAIN_RECALL_WARNING_UI_AVAILABLE: "1",
  BRAIN_RECALL_MAX_IMPORTS: String(args.maxImports),
};
if (args.includeRuntimeManifest) {
  env.BRAIN_RECALL_LIVE_SPIKE_MANIFEST_PATH = args.manifestPath;
}

const result = {
  ok,
  mode: "second_manual_verification_command",
  noLiveNoWrite: true,
  approvalRequired: true,
  liveWriteAllowedNow: false,
  selectedReports,
  manifestPath: args.manifestPath,
  runtimeManifestPath: args.includeRuntimeManifest ? args.manifestPath : null,
  maxImports: args.maxImports,
  liveSpikeGate: summarizeGate(liveSpikeGate),
  readiness: summarizeReadiness(readiness),
  commandEnv: env,
  command: buildCommand(env),
  commandNotes: commandNotes(args),
  findings: [
    ...(liveSpikeGate.ok ? [] : [{ id: "live_spike_gate", message: "Selected SPIKE reports did not pass the live-spike report gate." }]),
    ...(readiness.ok ? [] : [{ id: "second_manual_readiness", message: "Second manual readiness did not pass." }]),
  ],
  safetyNote: args.skipReadiness || args.skipLiveSpikeGate
    ? "This command builder is no-live and no-write. In skip mode it selects proof paths and prints a guarded command; the caller must enforce production runtime proof gates before any Recall API call."
    : "This command builder is no-live and no-write. It validates public proof reports and prints a guarded command; it does not call Recall, import, deploy, enable a scheduler, or advance checkpoints.",
};

const output = args.json ? `${JSON.stringify(result, null, 2)}\n` : toMarkdown(result);

if (!ok) {
  console.error(output);
  process.exit(1);
}

process.stdout.write(output);

function findLatestSpikePair(spikeDir) {
  const files = readdirSync(resolve(spikeDir));
  const enumeration = collectByTimestamp(files, /^SPIKE-013-recall-rest-enumeration-(.+)\.md$/);
  const fidelity = collectByTimestamp(files, /^SPIKE-014-recall-content-fidelity-(.+)\.md$/);
  const commonTimestamps = [...enumeration.keys()].filter((timestamp) => fidelity.has(timestamp)).sort().reverse();
  if (commonTimestamps.length === 0) {
    throw new Error(`No matching SPIKE-013/SPIKE-014 report pair found in ${spikeDir}.`);
  }
  const timestamp = commonTimestamps[0];
  return {
    enumerationPath: join(spikeDir, enumeration.get(timestamp)),
    fidelityPath: join(spikeDir, fidelity.get(timestamp)),
    timestamp,
    selectedBy: "latest_matching_timestamp",
  };
}

function collectByTimestamp(files, pattern) {
  const byTimestamp = new Map();
  for (const file of files) {
    const match = file.match(pattern);
    if (match) byTimestamp.set(match[1], file);
  }
  return byTimestamp;
}

function runLiveSpikeGate(reports, options) {
  return runJsonCommand([
    "scripts/check-recall-live-spike-reports.mjs",
    "--enumeration",
    reports.enumerationPath,
    "--fidelity",
    reports.fidelityPath,
    "--manifest",
    options.manifestPath,
    "--allow-fidelity-changes",
    "--accepted-fidelity-risk",
    options.acceptedFidelityRisk,
    ...(options.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
  ]);
}

function runJsonCommand(commandArgs) {
  const result = spawnSync(process.execPath, ["--", ...commandArgs], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  const text = result.status === 0 ? result.stdout : result.stderr || result.stdout;
  return {
    ok: result.status === 0,
    exitCode: result.status,
    parsed: parseMaybeJson(text),
  };
}

function summarizeGate(result) {
  if (result.skipped) return { ok: true, skipped: true, verdict: "skipped", reports: null };
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    verdict: result.parsed?.verdict ?? null,
    reports: result.parsed?.reports ?? null,
  };
}

function summarizeReadiness(result) {
  if (result.skipped) return { ok: true, skipped: true };
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    status: result.parsed?.status ?? null,
    currentBlockingGate: result.parsed?.currentBlockingGate ?? null,
    liveWriteAllowedNow: result.parsed?.liveWriteAllowedNow ?? null,
    schedulerAllowedNow: result.parsed?.schedulerAllowedNow ?? null,
    checkpointAllowedNow: result.parsed?.checkpointAllowedNow ?? null,
  };
}

function buildCommand(env) {
  const lines = Object.entries(env).map(([key, value]) => `${key}=${shellQuote(value)} \\`);
  return `${lines.join("\n")}\nbash scripts/recall-second-manual-verification-apply.sh`;
}

function commandNotes(options) {
  const notes = [
    "Run only after exact Arun approval is present.",
    "Do not enable the scheduler from this command.",
  ];
  if (options.skipReadiness || options.skipLiveSpikeGate) {
    notes.splice(
      1,
      0,
      "Local readiness and/or live-spike validation were skipped by caller request; use this only when a production runtime preflight and the remote guarded apply path will enforce proof before any Recall API call.",
    );
  } else {
    notes.splice(
      1,
      0,
      "This builder runs full local second-manual readiness; the wrapper reruns a deploy-safe runtime preflight before apply delegation.",
      "The private manifest is used for local proof validation and is omitted from the production command unless --include-runtime-manifest is passed.",
    );
  }
  return notes;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function toMarkdown(result) {
  const lines = [
    "# Recall Second Manual Verification Command",
    "",
    `- No live/no write: \`${result.noLiveNoWrite}\``,
    `- Selected by: \`${result.selectedReports.selectedBy}\``,
    `- SPIKE-013: \`${result.selectedReports.enumerationPath}\``,
    `- SPIKE-014: \`${result.selectedReports.fidelityPath}\``,
    `- Runtime manifest path: \`${result.runtimeManifestPath ?? "omitted"}\``,
    `- Live-spike gate: \`${result.liveSpikeGate.verdict ?? "failed"}\``,
    `- Readiness: \`${result.readiness.status ?? (result.readiness.skipped ? "skipped" : "failed")}\``,
    `- Live write allowed now: \`${result.liveWriteAllowedNow}\``,
    "",
    "## Guarded Command",
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

function parseArgs(argv) {
  const parsed = {
    spikeDir: DEFAULT_SPIKE_DIR,
    manifestPath: DEFAULT_MANIFEST_PATH,
    acceptedFidelityRisk: DEFAULT_ACCEPTED_FIDELITY_RISK,
    maxImports: 5,
    enumerationPath: null,
    fidelityPath: null,
    allowUnsafeManifestForSmoke: false,
    includeRuntimeManifest: false,
    skipReadiness: false,
    skipLiveSpikeGate: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--help") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--spike-dir" && next) {
      parsed.spikeDir = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--max-imports" && next) {
      parsed.maxImports = Number(next);
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") {
      parsed.allowUnsafeManifestForSmoke = true;
    } else if (arg === "--include-runtime-manifest") {
      parsed.includeRuntimeManifest = true;
    } else if (arg === "--skip-readiness") {
      parsed.skipReadiness = true;
    } else if (arg === "--skip-live-spike-gate") {
      parsed.skipLiveSpikeGate = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (Boolean(parsed.enumerationPath) !== Boolean(parsed.fidelityPath)) {
    throw new Error("Pass both --enumeration and --fidelity, or neither.");
  }
  if (!Number.isInteger(parsed.maxImports) || parsed.maxImports < 1) {
    throw new Error("--max-imports must be a positive integer.");
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall second manual verification command builder

Usage:
  npm run recall:second-manual:command
  npm run recall:second-manual:command -- --json
  npm run recall:second-manual:command -- --include-runtime-manifest

This command is no-live and no-write. It selects the latest matching
SPIKE-013/SPIKE-014 report pair, validates it with the live-spike report gate,
runs second-manual readiness unless --skip-readiness is supplied, and prints a
guarded shell command for an approved second manual verification run. Use
--skip-live-spike-gate only from production-runtime tooling that will enforce
the same report proof remotely before any Recall API call.

Use --include-runtime-manifest only when the private manifest path exists from
the production root where the guarded command will run.
`);
}
