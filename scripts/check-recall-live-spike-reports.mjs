#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_LABELS = [
  "sample-note",
  "sample-article",
  "sample-youtube",
  "sample-pdf",
  "sample-no-url",
  "sample-long",
];
const VALID_CONTENT_FIDELITY = new Set([
  "complete_enough_for_daily_import",
  "api_chunks_unverified",
  "possibly_truncated",
  "metadata_only",
  "blocked_unknown",
]);
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const findings = [];
const enumeration = readSpikeReport(args.enumerationPath, "SPIKE-013", findings);
const fidelity = readSpikeReport(args.fidelityPath, "SPIKE-014", findings);

if (enumeration && fidelity) {
  runPublicPrivacyScan([args.enumerationPath, args.fidelityPath], findings);
  if (args.manifestPath) {
    runManifestPrivacyScan([args.enumerationPath, args.fidelityPath], args, findings);
  }
  validateEnumerationReport(enumeration, findings);
  validateFidelityReport(fidelity, args, findings);
}

const hasAcceptedFidelityChanges =
  fidelity?.metadata.verdict === "PROCEED-WITH-CHANGES" && args.allowFidelityChanges;
const ok = findings.length === 0;
const verdict = ok
  ? hasAcceptedFidelityChanges
    ? "PASS_WITH_ACCEPTED_FIDELITY_CHANGES"
    : "PASS_LIVE_SPIKE_REPORT_GATE"
  : "DO_NOT_PROCEED";

const result = {
  ok,
  verdict,
  reports: {
    enumeration: enumeration ? summarizeReport(enumeration) : { path: args.enumerationPath, exists: false },
    fidelity: fidelity ? summarizeReport(fidelity) : { path: args.fidelityPath, exists: false },
  },
  acceptedFidelityRisk: args.acceptedFidelityRisk,
  manifestPrivacyScan: {
    required: Boolean(args.manifestPath),
    manifestPath: args.manifestPath,
  },
  findings,
  nextGate: ok
    ? "Run a private production-capable dry-run, then validate it with check:recall-dry-run-report before any apply."
    : "Stop before production dry-run/apply. Resolve findings or rerun SPIKE-013/SPIKE-014.",
};

if (!ok) {
  console.error("[check:recall-live-spike-reports] failed");
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));

function validateEnumerationReport(report, findings) {
  if (report.metadata.spikeId !== "SPIKE-013") {
    findings.push(finding(report, "metadata", "Enumeration report must have Spike ID SPIKE-013."));
  }
  if (report.metadata.verdict !== "CLEAR") {
    findings.push(finding(report, "verdict", "SPIKE-013 must be CLEAR before production dry-run."));
  }
  if (report.evidence.mode !== "recall_rest_enumeration_probe") {
    findings.push(finding(report, "evidence.mode", "SPIKE-013 evidence mode is not recall_rest_enumeration_probe."));
  }
  if (!isRecord(report.evidence.filteredFirst)) {
    findings.push(finding(report, "evidence.filteredFirst", "Filtered date-window result is missing."));
  }
  if (report.evidence.repeatedFilteredStable !== true) {
    findings.push(finding(report, "evidence.repeatedFilteredStable", "Repeated filtered query must be stable."));
  }
  if (hasUnexplainedResultCap(report.evidence.filteredFirst)) {
    findings.push(
      finding(
        report,
        "evidence.filteredFirst",
        "Filtered total_count is greater than returned result count; pagination/cap behavior is not cleared.",
      ),
    );
  }

  const controls = asRecord(report.evidence.expectedControls);
  validateManifestSummary(report, controls.manifest, findings);

  const positiveIds = asArray(controls.positiveIds);
  if (positiveIds.length < REQUIRED_LABELS.length) {
    findings.push(
      finding(report, "evidence.expectedControls.positiveIds", "Expected at least six positive controlled card IDs."),
    );
  }
  for (const [index, control] of positiveIds.entries()) {
    if (asRecord(control).present !== true) {
      findings.push(
        finding(report, `evidence.expectedControls.positiveIds[${index}]`, "Positive controlled card was not present."),
      );
    }
  }

  const negativeIds = asArray(controls.negativeIds);
  if (negativeIds.length < 1) {
    findings.push(
      finding(report, "evidence.expectedControls.negativeIds", "Expected at least one outside-window negative control."),
    );
  }
  for (const [index, control] of negativeIds.entries()) {
    if (asRecord(control).absent !== true) {
      findings.push(
        finding(report, `evidence.expectedControls.negativeIds[${index}]`, "Negative control was not absent."),
      );
    }
  }
}

function validateFidelityReport(report, args, findings) {
  if (report.metadata.spikeId !== "SPIKE-014") {
    findings.push(finding(report, "metadata", "Fidelity report must have Spike ID SPIKE-014."));
  }
  if (!["CLEAR", "PROCEED-WITH-CHANGES"].includes(report.metadata.verdict)) {
    findings.push(
      finding(report, "verdict", "SPIKE-014 must be CLEAR, or PROCEED-WITH-CHANGES with explicit acceptance."),
    );
  }
  if (report.evidence.mode !== "recall_content_fidelity_probe") {
    findings.push(finding(report, "evidence.mode", "SPIKE-014 evidence mode is not recall_content_fidelity_probe."));
  }
  validateManifestSummary(report, report.evidence.expectedControls, findings);

  const cards = asArray(report.evidence.cards);
  if (cards.length < REQUIRED_LABELS.length) {
    findings.push(finding(report, "evidence.cards", "Expected at least six controlled fidelity cards."));
  }

  const labels = new Set(cards.map((card) => asRecord(card).sampleLabel).filter(Boolean));
  for (const label of REQUIRED_LABELS) {
    if (!labels.has(label)) {
      findings.push(finding(report, "evidence.cards", `Missing controlled sample label ${label}.`));
    }
  }

  let policyBlocks = 0;
  for (const [index, cardValue] of cards.entries()) {
    const card = asRecord(cardValue);
    if (!VALID_CONTENT_FIDELITY.has(card.contentFidelity)) {
      findings.push(
        finding(
          report,
          `evidence.cards[${index}].contentFidelity`,
          `Unknown content fidelity value: ${String(card.contentFidelity ?? "<missing>")}`,
        ),
      );
    }
    if (card.contentFidelity === "blocked_unknown") {
      findings.push(finding(report, `evidence.cards[${index}].contentFidelity`, "blocked_unknown fidelity is a blocker."));
    }
    if (card.maxChunksHit === true && card.contentFidelity !== "possibly_truncated") {
      findings.push(
        finding(
          report,
          `evidence.cards[${index}].maxChunksHit`,
          "Max-chunk card must be classified as possibly_truncated.",
        ),
      );
    }
    if (asRecord(card.policy).shouldImport !== true) policyBlocks += 1;
  }

  if (report.metadata.verdict === "CLEAR" && policyBlocks > 0) {
    findings.push(finding(report, "evidence.cards.policy", "CLEAR fidelity report contains policy-blocked cards."));
  }

  if (report.metadata.verdict === "PROCEED-WITH-CHANGES") {
    if (policyBlocks === 0) {
      findings.push(
        finding(
          report,
          "evidence.cards.policy",
          "PROCEED-WITH-CHANGES fidelity report should identify policy-blocked or risky cards.",
        ),
      );
    }
    if (!args.allowFidelityChanges) {
      findings.push(
        finding(
          report,
          "verdict",
          "PROCEED-WITH-CHANGES requires --allow-fidelity-changes after human review.",
        ),
      );
    }
    if (args.allowFidelityChanges && args.acceptedFidelityRisk.length < 12) {
      findings.push(
        finding(
          report,
          "acceptedFidelityRisk",
          "Accepted fidelity risk note must be at least 12 characters.",
        ),
      );
    }
  }
}

function validateManifestSummary(report, value, findings) {
  const manifest = asRecord(value);
  if (manifest.sampleCount < REQUIRED_LABELS.length) {
    findings.push(finding(report, "evidence.expectedControls.sampleCount", "Manifest summary must include six samples."));
  }
  const labels = asArray(manifest.requiredLabels);
  for (const label of REQUIRED_LABELS) {
    if (!labels.includes(label)) {
      findings.push(finding(report, "evidence.expectedControls.requiredLabels", `Missing required label ${label}.`));
    }
  }
  const publicPrivacy = asRecord(manifest.publicPrivacy);
  if (publicPrivacy.titleAllowedCount !== 0 || publicPrivacy.sourceUrlAllowedCount !== 0) {
    findings.push(
      finding(
        report,
        "evidence.expectedControls.publicPrivacy",
        "Public report privacy summary must keep title/source URL exposure counts at zero.",
      ),
    );
  }
}

function readSpikeReport(path, expectedSpikeId, findings) {
  const absolutePath = resolve(path);
  if (!existsSync(absolutePath)) {
    findings.push({ file: path, section: "file", message: `${expectedSpikeId} report is missing.` });
    return null;
  }

  const text = readFileSync(absolutePath, "utf8");
  const metadata = {
    spikeId: readTableField(text, "Spike ID"),
    verdict: readTableField(text, "Verdict"),
  };
  const evidenceText = extractJsonFence(text);
  let evidence = null;
  if (!evidenceText) {
    findings.push({ file: path, section: "evidence", message: "Missing fenced JSON evidence block." });
  } else {
    try {
      evidence = JSON.parse(evidenceText);
    } catch (error) {
      findings.push({
        file: path,
        section: "evidence",
        message: `Evidence JSON did not parse: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  if (!metadata.spikeId) {
    findings.push({ file: path, section: "metadata", message: "Missing Spike ID table field." });
  }
  if (!metadata.verdict) {
    findings.push({ file: path, section: "metadata", message: "Missing Verdict table field." });
  }

  return {
    path,
    absolutePath,
    metadata,
    evidence: evidence ?? {},
  };
}

function runPublicPrivacyScan(paths, findings) {
  const result = spawnSync(process.execPath, [join(SCRIPT_DIR, "check-recall-public-privacy.mjs"), ...paths], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    findings.push({
      file: paths.join(", "),
      section: "public_privacy_scan",
      message: `Public privacy scan failed: ${preview(result.stderr || result.stdout)}`,
    });
  }
}

function runManifestPrivacyScan(paths, args, findings) {
  const result = spawnSync(
    process.execPath,
    [
      join(SCRIPT_DIR, "check-recall-public-manifest-privacy.mjs"),
      ...(args.allowUnsafeManifestForSmoke ? ["--allow-unsafe-manifest-for-smoke"] : []),
      "--manifest",
      args.manifestPath,
      ...paths,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    findings.push({
      file: paths.join(", "),
      section: "public_manifest_privacy_scan",
      message: `Manifest-aware public privacy scan failed: ${preview(result.stderr || result.stdout)}`,
    });
  }
}

function readTableField(text, field) {
  const pattern = new RegExp(`\\| \\*\\*${escapeRegExp(field)}\\*\\* \\|\\s*([^|]+?)\\s*\\|`);
  return text.match(pattern)?.[1]?.trim() ?? null;
}

function extractJsonFence(text) {
  return text.match(/```json\n([\s\S]*?)\n```/)?.[1] ?? null;
}

function summarizeReport(report) {
  return {
    path: report.path,
    spikeId: report.metadata.spikeId,
    verdict: report.metadata.verdict,
    evidenceMode: report.evidence.mode ?? null,
  };
}

function finding(report, section, message) {
  return { file: report.path, section, message };
}

function hasUnexplainedResultCap(value) {
  const filtered = asRecord(value);
  return typeof filtered.totalCount === "number" &&
    typeof filtered.resultCount === "number" &&
    filtered.totalCount > filtered.resultCount;
}

function asRecord(value) {
  return isRecord(value) ? value : {};
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function parseArgs(argv) {
  const parsed = {
    enumerationPath: null,
    fidelityPath: null,
    manifestPath: null,
    allowFidelityChanges: false,
    allowUnsafeManifestForSmoke: false,
    acceptedFidelityRisk: "",
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--enumeration" && next) {
      parsed.enumerationPath = next;
      i += 1;
    } else if (arg === "--fidelity" && next) {
      parsed.fidelityPath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      parsed.manifestPath = next;
      i += 1;
    } else if (arg === "--allow-unsafe-manifest-for-smoke") {
      parsed.allowUnsafeManifestForSmoke = true;
    } else if (arg === "--allow-fidelity-changes") {
      parsed.allowFidelityChanges = true;
    } else if (arg === "--accepted-fidelity-risk" && next) {
      parsed.acceptedFidelityRisk = next;
      i += 1;
    } else if (arg === "--help") {
      parsed.help = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!parsed.help && (!parsed.enumerationPath || !parsed.fidelityPath)) {
    throw new Error("Both --enumeration and --fidelity are required.");
  }
  return parsed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preview(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length > 300 ? `${trimmed.slice(0, 297)}...` : trimmed;
}

function printHelp() {
  console.log(`Recall live spike report gate

Usage:
  npm run check:recall-live-spike-reports -- \\
    --enumeration docs/plans/spikes/SPIKE-013-recall-rest-enumeration-<timestamp>_IST.md \\
    --fidelity docs/plans/spikes/SPIKE-014-recall-content-fidelity-<timestamp>_IST.md \\
    --manifest data/private/recall-live-spikes/controlled-samples.json

If SPIKE-014 is PROCEED-WITH-CHANGES after human review:
  npm run check:recall-live-spike-reports -- \\
    --enumeration <SPIKE-013.md> \\
    --fidelity <SPIKE-014.md> \\
    --manifest data/private/recall-live-spikes/controlled-samples.json \\
    --allow-fidelity-changes \\
    --accepted-fidelity-risk "Reviewed policy-blocked fidelity classes; production dry-run remains no-write."

Offline smoke fixtures that use synthetic temporary manifests may pass:
  --allow-unsafe-manifest-for-smoke

This command does not call the live Recall API and does not write production data.
It verifies the redacted SPIKE-013/SPIKE-014 Markdown reports before any
production-capable dry-run or apply. When --manifest is provided, it also
checks the public reports for exact and normalized private controlled-sample
values without printing those values and requires the manifest file to stay in
the ignored private Recall evidence path unless the explicit smoke-only bypass
is present.
`);
}
