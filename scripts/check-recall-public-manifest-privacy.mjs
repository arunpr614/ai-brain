#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_MANIFEST_PATH,
  loadControlledSampleManifest,
  validateControlledSampleManifestFileSafety,
} from "./lib/recall-controlled-samples.mjs";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (args.files.length === 0) {
  console.error("[check:recall-public-manifest-privacy] provide at least one public report file.");
  process.exit(2);
}

const manifestFileSafety = args.allowUnsafeManifestForSmoke
  ? null
  : validateControlledSampleManifestFileSafety(args.manifestPath);
if (manifestFileSafety && !manifestFileSafety.ok) {
  console.error("[check:recall-public-manifest-privacy] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        manifestPath: args.manifestPath,
        manifestFileSafetyEnforced: true,
        manifestFileSafety: manifestFileSafety.file,
        findings: manifestFileSafety.findings.map((finding) => ({
          ...finding,
          kind: "unsafe_manifest_file",
        })),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const manifest = loadControlledSampleManifest(args.manifestPath);
const privateValues = collectPrivateValues(manifest);
const findings = [];

for (const filePath of args.files) {
  const resolved = resolve(filePath);
  if (!existsSync(resolved)) {
    findings.push({
      file: filePath,
      line: null,
      kind: "missing_report",
      label: null,
      message: "Report file does not exist.",
    });
    continue;
  }

  const lines = readFileSync(resolved, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const normalizedLine = normalizeForPublicComparison(line);
    for (const privateValue of privateValues) {
      if (line.includes(privateValue.value)) {
        findings.push({
          file: filePath,
          line: index + 1,
          kind: privateValue.kind,
          label: privateValue.label,
          match: "exact",
          message: "Public report contains a private controlled-sample manifest value.",
        });
      } else if (privateValue.normalizedValue && normalizedLine.includes(privateValue.normalizedValue)) {
        findings.push({
          file: filePath,
          line: index + 1,
          kind: privateValue.kind,
          label: privateValue.label,
          match: "normalized",
          message: "Public report contains a normalized private controlled-sample manifest value.",
        });
      }
    }
  });
}

if (findings.length > 0) {
  console.error("[check:recall-public-manifest-privacy] failed");
  console.error(
    JSON.stringify(
      {
        ok: false,
        manifestPath: args.manifestPath,
        manifestFileSafetyEnforced: !args.allowUnsafeManifestForSmoke,
        manifestFileSafety: manifestFileSafety?.file ?? null,
        scannedFiles: args.files.length,
        checkedPrivateValues: privateValues.length,
        findings,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath: args.manifestPath,
      manifestFileSafetyEnforced: !args.allowUnsafeManifestForSmoke,
      manifestFileSafety: manifestFileSafety?.file ?? null,
      scannedFiles: args.files.length,
      checkedPrivateValues: privateValues.length,
    },
    null,
    2,
  ),
);

function collectPrivateValues(manifest) {
  const values = [];
  for (const sample of manifest.samples) {
    addValue(values, sample.label, "card_id", sample.cardId);
    addValue(values, sample.label, "expected_title", sample.expectedTitle);
    addSourceUrlValues(values, sample.label, sample.sourceUrl);
  }
  addValue(values, manifest.negativeControl.label, "negative_card_id", manifest.negativeControl.cardId);
  addValue(
    values,
    manifest.negativeControl.label,
    "negative_expected_title",
    manifest.negativeControl.expectedTitle,
  );
  return dedupe(values);
}

function addSourceUrlValues(values, label, sourceUrl) {
  addValue(values, label, "source_url", sourceUrl);
  if (!sourceUrl) return;
  try {
    const url = new URL(sourceUrl);
    const pathAndQuery = `${url.pathname}${url.search}`;
    if (pathAndQuery !== "/") addValue(values, label, "source_url_path", pathAndQuery);
  } catch {
    // The manifest validator rejects malformed URLs before this checker runs.
  }
}

function addValue(values, label, kind, value) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (trimmed.length < 8) return;
  const normalizedValue = normalizeForPublicComparison(trimmed);
  values.push({
    label,
    kind,
    value: trimmed,
    normalizedValue: normalizedValue.length >= 8 ? normalizedValue : null,
  });
}

function dedupe(values) {
  const seen = new Set();
  return values.filter((entry) => {
    const key = `${entry.kind}:${entry.value}:${entry.normalizedValue ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeForPublicComparison(value) {
  return decodeBasicHtmlEntities(safeDecodeUriComponent(value))
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function safeDecodeUriComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value.replace(/%([0-9a-fA-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  }
}

function decodeBasicHtmlEntities(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#[0-9]+);/g, (entity) => {
    switch (entity) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&quot;":
        return '"';
      case "&apos;":
        return "'";
      default:
        return decodeNumericHtmlEntity(entity);
    }
  });
}

function decodeNumericHtmlEntity(entity) {
  try {
    const hex = entity.match(/^&#x([0-9a-fA-F]+);$/);
    if (hex) return String.fromCodePoint(Number.parseInt(hex[1], 16));
    const decimal = entity.match(/^&#([0-9]+);$/);
    if (decimal) return String.fromCodePoint(Number.parseInt(decimal[1], 10));
    return entity;
  } catch {
    return entity;
  }
}

function parseArgs(argv) {
  const parsed = {
    manifestPath: DEFAULT_MANIFEST_PATH,
    files: [],
    allowUnsafeManifestForSmoke: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") {
      parsed.allowUnsafeManifestForSmoke = true;
    } else if (arg === "--help") {
      parsed.help = true;
    } else if (!arg.startsWith("-")) {
      parsed.files.push(arg);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Recall public manifest privacy scan

Usage:
  node scripts/check-recall-public-manifest-privacy.mjs \\
    --manifest data/private/recall-live-spikes/controlled-samples.json \\
    docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \\
    docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md

  node scripts/check-recall-public-manifest-privacy.mjs \\
    --allow-unsafe-manifest-for-smoke \\
    --manifest <temporary-smoke-manifest.json> \\
    <temporary-smoke-report.md>

This command scans public reports for exact and normalized private
controlled-sample manifest values such as card IDs, expected titles, full source
URLs, URL paths, and the negative-control private values. Normalized matching
catches case, whitespace, HTML-entity, and percent-encoding variants without
printing the private values.

By default, the private manifest file must be under the ignored private Recall
evidence path, untracked, and owner-only. The unsafe-manifest flag is only for
offline smoke fixtures that use temporary manifests with synthetic values.
`);
}
