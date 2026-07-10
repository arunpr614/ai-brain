#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve, sep } from "node:path";
import {
  assertControlledSampleManifestFileSafety,
  DEFAULT_MANIFEST_PATH,
  loadControlledSampleManifest,
  summarizeControlledSampleManifest,
} from "./lib/recall-controlled-samples.mjs";
import { assertRecallEnvFileSafety, loadRecallEnvFile } from "./lib/recall-env-file.mjs";

const DEFAULT_REPORT_DIR = "docs/plans/spikes";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const hasEnumerationFixture = Boolean(args.enumerationFixture);
const hasFidelityFixture = Boolean(args.fidelityFixture);
const isFixtureMode = hasEnumerationFixture && hasFidelityFixture;
const isLiveMode = !isFixtureMode;

if (hasEnumerationFixture !== hasFidelityFixture) {
  console.error(
    "Offline rehearsal requires both --enumeration-fixture and --fidelity-fixture. Mixed fixture/live mode is not allowed.",
  );
  process.exit(2);
}

const envFile = isLiveMode && args.envFilePath ? loadLiveEnvFile(args.envFilePath) : null;

if (isLiveMode && !process.env.RECALL_API_KEY?.trim()) {
  console.error(
    "RECALL_API_KEY is not set. Provide both --enumeration-fixture and --fidelity-fixture for offline rehearsal, or export RECALL_API_KEY locally for approved live spikes.",
  );
  process.exit(2);
}

if (isLiveMode && !isLiveApiConfirmed(args)) {
  console.error(
    "Live Recall API run requires explicit confirmation. Pass --confirm-live-api or set BRAIN_RECALL_CONFIRM_LIVE_API=1 after approval.",
  );
  process.exit(2);
}

if (isLiveMode && !isPublicSpikeReportDir(args.reportDir)) {
  console.error(
    `Live Recall report directory must be ${DEFAULT_REPORT_DIR} or a child directory. Refusing: ${args.reportDir}`,
  );
  process.exit(2);
}

runCommand(["scripts/check-recall-private-ignore.mjs"], "Recall private evidence ignore check");
const manifestFileSafety = isLiveMode ? requireLiveManifestFileSafety(args.manifestPath) : null;

const manifest = loadControlledSampleManifest(args.manifestPath);
const timestamp = args.timestamp ?? recallSpikeTimestamp();
mkdirSync(resolve(args.reportDir), { recursive: true });

const enumerationReportPath = resolve(
  args.reportDir,
  `SPIKE-013-recall-rest-enumeration-${timestamp}_IST.md`,
);
const fidelityReportPath = resolve(
  args.reportDir,
  `SPIKE-014-recall-content-fidelity-${timestamp}_IST.md`,
);

const enumeration = runJsonCommand(
  [
    "--import",
    "tsx",
    "scripts/spikes/recall-rest-enumeration.ts",
    ...(args.enumerationFixture ? ["--fixture", args.enumerationFixture] : []),
    "--manifest",
    args.manifestPath,
    "--write-report",
    "--report-path",
    enumerationReportPath,
  ],
  "SPIKE-013",
);

const fidelity = runJsonCommand(
  [
    "--import",
    "tsx",
    "scripts/spikes/recall-content-fidelity.ts",
    ...(args.fidelityFixture ? ["--fixture", args.fidelityFixture] : []),
    "--manifest",
    args.manifestPath,
    "--max-chunks",
    String(args.maxChunks),
    "--write-report",
    "--report-path",
    fidelityReportPath,
  ],
  "SPIKE-014",
);

runCommand(
  ["scripts/check-recall-public-privacy.mjs", enumerationReportPath, fidelityReportPath],
  "Recall public privacy scan",
);
runCommand(
  [
    "scripts/check-recall-public-manifest-privacy.mjs",
    ...(isFixtureMode ? ["--allow-unsafe-manifest-for-smoke"] : []),
    "--manifest",
    args.manifestPath,
    enumerationReportPath,
    fidelityReportPath,
  ],
  "Recall public manifest privacy scan",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: isFixtureMode ? "offline_fixture_rehearsal" : "live_recall_api",
      liveApiConfirmed: isLiveMode,
      envFile,
      manifest: {
        ...summarizeControlledSampleManifest(manifest),
        fileSafety: manifestFileSafety,
      },
      reports: {
        enumeration: {
          path: enumerationReportPath,
          verdict: readVerdict(enumeration),
          markdownReportPath: enumeration.markdownReportPath ?? null,
        },
        fidelity: {
          path: fidelityReportPath,
          verdict: readVerdict(fidelity),
          markdownReportPath: fidelity.markdownReportPath ?? null,
        },
      },
      privacyScan: {
        ok: true,
        scannedFiles: 2,
      },
      manifestPrivacyScan: {
        ok: true,
        scannedFiles: 2,
      },
      nextGate:
        isFixtureMode
          ? "Offline rehearsal passed. Approved live run still requires local RECALL_API_KEY and real controlled sample cards."
          : "Run check:recall-live-spike-reports on the generated SPIKE-013/SPIKE-014 reports before any production dry-run or apply.",
    },
    null,
    2,
  ),
);

function requireLiveManifestFileSafety(manifestPath) {
  try {
    return assertControlledSampleManifestFileSafety(manifestPath);
  } catch (error) {
    console.error(
      "Live Recall API run requires the private controlled sample manifest to be ignored, untracked, under data/private/recall-live-spikes/, and owner-only.",
    );
    if (Array.isArray(error?.findings)) {
      console.error(
        JSON.stringify(
          {
            manifestPath: error.manifestPath ?? manifestPath,
            findings: error.findings,
          },
          null,
          2,
        ),
      );
    }
    process.exit(2);
  }
}

function loadLiveEnvFile(envFilePath) {
  try {
    const fileSafety = assertRecallEnvFileSafety(envFilePath);
    const loaded = loadRecallEnvFile(envFilePath);
    return {
      path: envFilePath,
      fileSafety,
      loaded: true,
      loadedKeyCount: loaded.loadedKeyCount,
    };
  } catch (error) {
    console.error(
      "Live Recall API run requires the private Recall env file to be ignored, untracked, under data/private/recall-live-spikes/, and owner-only before it can be loaded.",
    );
    if (Array.isArray(error?.findings)) {
      console.error(
        JSON.stringify(
          {
            envFilePath: error.envFilePath ?? envFilePath,
            findings: error.findings,
          },
          null,
          2,
        ),
      );
    }
    process.exit(2);
  }
}

function parseArgs(argv) {
  const parsed = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    reportDir: DEFAULT_REPORT_DIR,
    enumerationFixture: null,
    fidelityFixture: null,
    envFilePath: null,
    maxChunks: 50,
    timestamp: null,
    confirmLiveApi: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--report-dir" && next) {
      parsed.reportDir = next;
      i += 1;
    } else if (arg === "--enumeration-fixture" && next) {
      parsed.enumerationFixture = next;
      i += 1;
    } else if (arg === "--fidelity-fixture" && next) {
      parsed.fidelityFixture = next;
      i += 1;
    } else if (arg === "--env-file" && next) {
      parsed.envFilePath = next;
      i += 1;
    } else if (arg === "--max-chunks" && next) {
      parsed.maxChunks = clampMaxChunks(Number(next));
      i += 1;
    } else if (arg === "--timestamp" && next) {
      parsed.timestamp = normalizeTimestamp(next);
      i += 1;
    } else if (arg === "--confirm-live-api") {
      parsed.confirmLiveApi = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function isPublicSpikeReportDir(reportDir) {
  const allowedRoot = resolve(DEFAULT_REPORT_DIR);
  const target = resolve(reportDir);
  return target === allowedRoot || target.startsWith(`${allowedRoot}${sep}`);
}

function normalizeTimestamp(value) {
  const normalized = value.replace(/_IST$/, "");
  if (!/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("--timestamp must use YYYY-MM-DD_HH-MM-SS with optional _IST suffix.");
  }
  return normalized;
}

function isLiveApiConfirmed(parsedArgs) {
  return parsedArgs.confirmLiveApi || process.env.BRAIN_RECALL_CONFIRM_LIVE_API === "1";
}

function runJsonCommand(args, label) {
  const stdout = runCommand(args, label);
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function runCommand(args, label) {
  const result = spawnSync(process.execPath, nodeArgsWithScriptSeparator(args), {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function nodeArgsWithScriptSeparator(args) {
  if (args[0] === "--import" && args[1]) {
    return ["--import", args[1], "--", ...args.slice(2)];
  }
  return ["--", ...args];
}

function readVerdict(report) {
  const controls = report.expectedControls;
  if (report.mode === "recall_rest_enumeration_probe") {
    const missingPositive = (controls?.positiveIds ?? []).some((entry) => entry.present !== true);
    const failedNegative = (controls?.negativeIds ?? []).some((entry) => entry.absent !== true);
    if (!report.filteredFirst) return "INCONCLUSIVE";
    if (report.repeatedFilteredStable === false || missingPositive || failedNegative) return "BLOCKER";
    return "CLEAR";
  }
  if (report.mode === "recall_content_fidelity_probe") {
    const cards = Array.isArray(report.cards) ? report.cards : [];
    if (cards.length === 0) return "BLOCKER";
    if (cards.some((card) => card.contentFidelity === "blocked_unknown")) return "BLOCKER";
    if (cards.some((card) => card.policy?.shouldImport !== true)) return "PROCEED-WITH-CHANGES";
    return "CLEAR";
  }
  return "INCONCLUSIVE";
}

function recallSpikeTimestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date())
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}_${parts.hour}-${parts.minute}-${parts.second}`;
}

function clampMaxChunks(value) {
  if (!Number.isFinite(value)) throw new Error("--max-chunks must be a number.");
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function printHelp() {
  console.log(`Recall live spike runner

Usage:
  npm run recall:live-spikes -- --manifest data/private/recall-live-spikes/controlled-samples.json --confirm-live-api

Offline rehearsal:
  node scripts/run-recall-live-spikes.mjs \\
    --manifest <private-or-temp-manifest.json> \\
    --enumeration-fixture <list-fixture.json> \\
    --fidelity-fixture <detail-fixture.json> \\
    --report-dir <temp-report-dir>

Options:
  --manifest <path>              Private controlled sample manifest.
  --report-dir <path>            Output directory for public SPIKE-013/SPIKE-014 reports. Defaults to ${DEFAULT_REPORT_DIR}.
  --enumeration-fixture <path>   Offline SPIKE-013 fixture. Avoids Recall API calls.
  --fidelity-fixture <path>      Offline SPIKE-014 fixture. Avoids Recall API calls.
  --env-file <path>              Load a checked private env file before live Recall API calls.
  --max-chunks <n>               SPIKE-014 max_chunks request, clamped to 1-50. Default 50.
  --timestamp <stamp>            Optional report timestamp without _IST suffix.
  --confirm-live-api             Required for live Recall API runs. Not required with both fixtures.
`);
}
