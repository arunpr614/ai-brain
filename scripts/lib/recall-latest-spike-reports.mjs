import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_RECALL_SPIKE_REPORT_DIR = "docs/plans/spikes";
export const DEFAULT_RECALL_ENUMERATION_REPORT =
  "docs/plans/spikes/SPIKE-013-recall-rest-enumeration-2026-06-24_20-03-34_IST.md";
export const DEFAULT_RECALL_FIDELITY_REPORT =
  "docs/plans/spikes/SPIKE-014-recall-content-fidelity-2026-06-24_20-03-34_IST.md";

const ENUMERATION_RE = /^SPIKE-013-recall-rest-enumeration-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_IST\.md$/;
const FIDELITY_RE = /^SPIKE-014-recall-content-fidelity-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})_IST\.md$/;

export function resolveLatestRecallSpikeReportPair(options = {}) {
  const reportDir = options.reportDir ?? DEFAULT_RECALL_SPIKE_REPORT_DIR;
  const enumerationFallback = options.enumerationFallback ?? DEFAULT_RECALL_ENUMERATION_REPORT;
  const fidelityFallback = options.fidelityFallback ?? DEFAULT_RECALL_FIDELITY_REPORT;
  const absoluteReportDir = resolve(reportDir);

  if (!existsSync(absoluteReportDir)) {
    return fallbackPair(reportDir, enumerationFallback, fidelityFallback, "report_dir_missing");
  }

  const enumerationByTimestamp = new Map();
  const fidelityByTimestamp = new Map();
  for (const entry of readdirSync(absoluteReportDir)) {
    const enumeration = entry.match(ENUMERATION_RE);
    if (enumeration) {
      enumerationByTimestamp.set(enumeration[1], join(reportDir, entry));
      continue;
    }

    const fidelity = entry.match(FIDELITY_RE);
    if (fidelity) {
      fidelityByTimestamp.set(fidelity[1], join(reportDir, entry));
    }
  }

  const pairedTimestamps = [...enumerationByTimestamp.keys()]
    .filter((timestamp) => fidelityByTimestamp.has(timestamp))
    .sort();
  const timestamp = pairedTimestamps.at(-1) ?? null;

  if (!timestamp) {
    return fallbackPair(reportDir, enumerationFallback, fidelityFallback, "paired_reports_missing");
  }

  const enumerationPath = enumerationByTimestamp.get(timestamp);
  const fidelityPath = fidelityByTimestamp.get(timestamp);
  return {
    ok: true,
    source: "latest_paired_spike_reports",
    reportDir,
    timestamp,
    enumerationPath,
    fidelityPath,
    enumerationMtimeIso: fileMtimeIso(enumerationPath),
    fidelityMtimeIso: fileMtimeIso(fidelityPath),
    enumerationFallback,
    fidelityFallback,
  };
}

function fallbackPair(reportDir, enumerationFallback, fidelityFallback, reason) {
  return {
    ok: existsSync(resolve(enumerationFallback)) && existsSync(resolve(fidelityFallback)),
    source: "fallback_spike_reports",
    reason,
    reportDir,
    timestamp: timestampFromPath(enumerationFallback),
    enumerationPath: enumerationFallback,
    fidelityPath: fidelityFallback,
    enumerationMtimeIso: fileMtimeIso(enumerationFallback),
    fidelityMtimeIso: fileMtimeIso(fidelityFallback),
    enumerationFallback,
    fidelityFallback,
  };
}

function timestampFromPath(path) {
  const enumeration = basename(path).match(ENUMERATION_RE);
  if (enumeration) return enumeration[1];
  const fidelity = basename(path).match(FIDELITY_RE);
  return fidelity ? fidelity[1] : null;
}

function fileMtimeIso(path) {
  try {
    return statSync(resolve(path)).mtime.toISOString();
  } catch {
    return null;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const pair = resolveLatestRecallSpikeReportPair(args);
  if (args.field === "enumeration") {
    process.stdout.write(`${pair.enumerationPath}\n`);
  } else if (args.field === "fidelity") {
    process.stdout.write(`${pair.fidelityPath}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(pair, null, 2)}\n`);
  }
}

function parseArgs(argv) {
  const parsed = {
    reportDir: DEFAULT_RECALL_SPIKE_REPORT_DIR,
    enumerationFallback: DEFAULT_RECALL_ENUMERATION_REPORT,
    fidelityFallback: DEFAULT_RECALL_FIDELITY_REPORT,
    field: "json",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--report-dir" && next) {
      parsed.reportDir = next;
      i += 1;
    } else if (arg === "--enumeration-fallback" && next) {
      parsed.enumerationFallback = next;
      i += 1;
    } else if (arg === "--fidelity-fallback" && next) {
      parsed.fidelityFallback = next;
      i += 1;
    } else if (arg === "--field" && next) {
      parsed.field = next;
      i += 1;
    } else if (arg === "--json") {
      parsed.field = "json";
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}
