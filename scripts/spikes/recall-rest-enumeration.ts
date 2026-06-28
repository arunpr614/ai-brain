#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertControlledSampleManifestFileSafety,
  loadControlledSampleManifest,
} from "../lib/recall-controlled-samples.mjs";
import { redactError, redactReportValue, redactSensitiveString } from "../../src/lib/security/redaction";
import {
  fencedJson,
  recallSpikeTimestamp,
  writeSpikeMarkdownReport,
  type SpikeVerdict,
} from "./recall-spike-report";

interface RecallCardPreview {
  id?: unknown;
  title?: unknown;
  created_at?: unknown;
  source_url?: unknown;
}

interface RecallCardListResponse {
  results?: RecallCardPreview[];
  total_count?: unknown;
}

interface Args {
  dateFrom: string | null;
  dateTo: string | null;
  expectIds: string[];
  negativeIds: string[];
  expectTitles: string[];
  allowTitles: boolean;
  allowSourceUrls: boolean;
  baseUrl: string;
  fixturePath: string | null;
  manifestPath: string | null;
  manifestSummary: ManifestSummary | null;
  writeReport: boolean;
  reportPath: string | null;
}

interface ManifestSummary {
  sampleLabels: string[];
  requiredLabels: string[];
  sampleCount: number;
  publicPrivacy: {
    titleAllowedCount: number;
    sourceUrlAllowedCount: number;
  };
  titleAllowedCount: number;
  sourceUrlAllowedCount: number;
  negativeControlLabel: string;
}

interface EnumerationFixture {
  unfiltered: RecallCardListResponse;
  filteredFirst: RecallCardListResponse;
  filteredSecond: RecallCardListResponse;
}

const DEFAULT_BASE_URL = "https://backend.getrecall.ai/api/v1";

async function main(): Promise<void> {
  const args = applyControlledManifest(parseArgs(process.argv.slice(2)));
  const filteredParams =
    args.dateFrom && args.dateTo ? { date_from: args.dateFrom, date_to: args.dateTo } : null;

  const fixture = args.fixturePath ? readEnumerationFixture(args.fixturePath) : null;
  const apiKey = process.env.RECALL_API_KEY?.trim();
  if (!fixture && !apiKey) {
    console.error(
      "RECALL_API_KEY is not set. Export it locally before running this live Recall API spike.",
    );
    process.exitCode = 2;
    return;
  }
  const liveApiKey = apiKey ?? "";

  const unfiltered = fixture ? fixture.unfiltered : await fetchCards(args.baseUrl, liveApiKey, {});
  const filteredA = filteredParams
    ? fixture
      ? fixture.filteredFirst
      : await fetchCards(args.baseUrl, liveApiKey, filteredParams)
    : null;
  const filteredB = filteredParams
    ? fixture
      ? fixture.filteredSecond
      : await fetchCards(args.baseUrl, liveApiKey, filteredParams)
    : null;

  const report = {
    mode: "recall_rest_enumeration_probe",
    dateWindow: filteredParams,
    unfiltered: summarizeList(unfiltered, args),
    filteredFirst: filteredA ? summarizeList(filteredA, args) : null,
    filteredSecond: filteredB ? summarizeList(filteredB, args) : null,
    repeatedFilteredStable:
      filteredA && filteredB ? stableIds(filteredA.results, filteredB.results) : null,
    expectedControls: filteredA
      ? {
          manifest: args.manifestSummary,
          positiveIds: args.expectIds.map((id) => ({
            id: redactId(id),
            present: hasCardId(filteredA.results, id),
          })),
          negativeIds: args.negativeIds.map((id) => ({
            id: redactId(id),
            absent: !hasCardId(filteredA.results, id),
          })),
          positiveTitles: args.expectTitles.map((title) => ({
            title: args.allowTitles ? redactSensitiveString(title) : "<redacted:title>",
            present: hasCardTitle(filteredA.results, title),
          })),
        }
      : null,
  };

  const redactedReport = asRecord(redactReportValue(report, { redactTitles: !args.allowTitles }));
  const markdownReportPath = writeEnumerationMarkdownReport(redactedReport, args);

  console.log(JSON.stringify({ ...redactedReport, markdownReportPath }, null, 2));
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dateFrom: null,
    dateTo: null,
    expectIds: [],
    negativeIds: [],
    expectTitles: [],
    allowTitles: false,
    allowSourceUrls: false,
    baseUrl: process.env.RECALL_API_BASE_URL?.trim() || DEFAULT_BASE_URL,
    fixturePath: null,
    manifestPath: null,
    manifestSummary: null,
    writeReport: false,
    reportPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--date-from" && next) {
      args.dateFrom = next;
      i += 1;
    } else if (arg === "--date-to" && next) {
      args.dateTo = next;
      i += 1;
    } else if (arg === "--expect-id" && next) {
      args.expectIds.push(next);
      i += 1;
    } else if (arg === "--negative-id" && next) {
      args.negativeIds.push(next);
      i += 1;
    } else if (arg === "--expect-title" && next) {
      args.expectTitles.push(next);
      i += 1;
    } else if (arg === "--allow-titles") {
      args.allowTitles = true;
    } else if (arg === "--allow-source-urls") {
      args.allowSourceUrls = true;
    } else if (arg === "--base-url" && next) {
      args.baseUrl = next.replace(/\/+$/, "");
      i += 1;
    } else if (arg === "--fixture" && next) {
      args.fixturePath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      args.manifestPath = next;
      i += 1;
    } else if (arg === "--write-report") {
      args.writeReport = true;
    } else if (arg === "--report-path" && next) {
      args.writeReport = true;
      args.reportPath = next;
      i += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if ((args.dateFrom && !args.dateTo) || (!args.dateFrom && args.dateTo)) {
    throw new Error("--date-from and --date-to must be provided together.");
  }
  return args;
}

function applyControlledManifest(args: Args): Args {
  if (!args.manifestPath) return args;
  if (!args.fixturePath) assertControlledSampleManifestFileSafety(args.manifestPath);
  const manifest = loadControlledSampleManifest(args.manifestPath);
  args.dateFrom = args.dateFrom ?? manifest.dateWindow.dateFrom;
  args.dateTo = args.dateTo ?? manifest.dateWindow.dateTo;
  const manifestSampleIds = manifest.samples
    .map((sample) => sample.cardId)
    .filter(isNonEmptyString);
  const manifestSampleTitles = manifest.samples
    .map((sample) => sample.expectedTitle)
    .filter(isNonEmptyString);
  const manifestSampleLabels = manifest.samples
    .map((sample) => sample.label)
    .filter(isNonEmptyString);
  args.expectIds = mergeUnique([
    ...args.expectIds,
    ...manifestSampleIds,
  ]);
  if (isNonEmptyString(manifest.negativeControl.cardId)) {
    args.negativeIds = mergeUnique([...args.negativeIds, manifest.negativeControl.cardId]);
  }
  args.expectTitles = mergeUnique([
    ...args.expectTitles,
    ...manifestSampleTitles,
  ]);
  args.manifestSummary = {
    sampleLabels: manifestSampleLabels,
    requiredLabels: manifestSampleLabels,
    sampleCount: manifest.samples.length,
    publicPrivacy: {
      titleAllowedCount: manifest.samples.filter((sample) => sample.allowTitleInPublicReport).length,
      sourceUrlAllowedCount: manifest.samples.filter((sample) => sample.allowSourceUrlInPublicReport)
        .length,
    },
    titleAllowedCount: manifest.samples.filter((sample) => sample.allowTitleInPublicReport).length,
    sourceUrlAllowedCount: manifest.samples.filter((sample) => sample.allowSourceUrlInPublicReport)
      .length,
    negativeControlLabel: isNonEmptyString(manifest.negativeControl.label)
      ? manifest.negativeControl.label
      : "outside-window",
  };
  return args;
}

function writeEnumerationMarkdownReport(
  report: Record<string, unknown>,
  args: Args,
): string | null {
  const timestamp = recallSpikeTimestamp();
  return writeSpikeMarkdownReport(
    {
      spikeId: "SPIKE-013",
      title: "Can Recall REST enumeration discover controlled daily-sync cards safely?",
      dateLabel: timestamp.dateLabel,
      triggeredBy: "Recall daily sync Phase B live API gate",
      blocks: "RDS-013, RDS-014, RDS-026b, RDS-026c, RDS-026e, RDS-027",
      verdict: deriveEnumerationVerdict(report),
      question:
        "Can AI Brain enumerate newly added Recall cards through the documented REST API with a controlled date window, stable repeated results, and privacy-safe evidence?",
      method: [
        args.fixturePath
          ? `Loaded an offline Recall list fixture from ${args.fixturePath}.`
          : "Ran the Recall REST enumeration probe against /cards using the documented Authorization header.",
        args.manifestPath
          ? "Loaded the private controlled sample manifest and used it for date window, positive controls, negative control, and private title checks."
          : "No controlled sample manifest was supplied; controls came only from explicit CLI flags.",
        args.dateFrom && args.dateTo
          ? `Queried a controlled window from ${args.dateFrom} to ${args.dateTo} and repeated the same filtered query to check stability.`
          : "No controlled date window was supplied; this report can only describe unfiltered enumeration behavior.",
        "Compared returned IDs/titles against any supplied positive and negative controls.",
        "Generated this Markdown report from the redacted probe object; titles are redacted unless --allow-titles was explicitly supplied, and source URLs are host-only unless --allow-source-urls was explicitly supplied.",
      ].join("\n\n"),
      evidence: fencedJson(report),
      findings: summarizeEnumerationFindings(report),
      implementationRecommendation: recommendEnumerationNextStep(report),
      risksAndGaps:
        "This report is only as strong as the controlled sample set supplied at runtime. If no note, article, YouTube, PDF, no-source, and long/truncation candidates were included, SPIKE-014 still must classify content fidelity before production dry-run or apply.",
    },
    {
      enabled: args.writeReport,
      explicitPath: args.reportPath,
      defaultFileName: `SPIKE-013-recall-rest-enumeration-${timestamp.fileTimestamp}.md`,
    },
  );
}

function deriveEnumerationVerdict(report: Record<string, unknown>): SpikeVerdict {
  const filtered = recordOrNull(report.filteredFirst);
  const expected = recordOrNull(report.expectedControls);
  const positiveIds = asRecordArray(expected?.positiveIds);
  const negativeIds = asRecordArray(expected?.negativeIds);
  const positiveTitles = asRecordArray(expected?.positiveTitles);
  const missingPositive =
    positiveIds.some((entry) => entry.present !== true) ||
    positiveTitles.some((entry) => entry.present !== true);
  const failedNegative = negativeIds.some((entry) => entry.absent !== true);
  if (!filtered) return "INCONCLUSIVE";
  if (report.repeatedFilteredStable === false || missingPositive || failedNegative) {
    return "BLOCKER";
  }
  if (hasUnexplainedResultCap(filtered)) return "PROCEED-WITH-CHANGES";
  if (positiveIds.length === 0 && positiveTitles.length === 0) return "INCONCLUSIVE";
  return "CLEAR";
}

function summarizeEnumerationFindings(report: Record<string, unknown>): string {
  const filtered = recordOrNull(report.filteredFirst);
  const expected = recordOrNull(report.expectedControls);
  const lines = [
    `Repeated filtered query stable: ${String(report.repeatedFilteredStable ?? "not checked")}.`,
  ];
  if (filtered) {
    lines.push(`Filtered result count: ${String(filtered.resultCount ?? "unknown")}.`);
    lines.push(`Filtered total count: ${String(filtered.totalCount ?? "unknown")}.`);
    if (hasUnexplainedResultCap(filtered)) {
      lines.push(
        "The API reported more total results than returned rows; pagination or cap behavior must be handled before production apply.",
      );
    }
  } else {
    lines.push("No filtered date-window query was supplied, so daily-window correctness is not proven.");
  }
  const positiveIds = asRecordArray(expected?.positiveIds);
  const negativeIds = asRecordArray(expected?.negativeIds);
  const positiveTitles = asRecordArray(expected?.positiveTitles);
  if (positiveIds.length + positiveTitles.length + negativeIds.length > 0) {
    lines.push(
      `Positive ID controls present: ${positiveIds.filter((entry) => entry.present === true).length}/${positiveIds.length}.`,
    );
    lines.push(
      `Positive title controls present: ${positiveTitles.filter((entry) => entry.present === true).length}/${positiveTitles.length}.`,
    );
    lines.push(
      `Negative ID controls absent: ${negativeIds.filter((entry) => entry.absent === true).length}/${negativeIds.length}.`,
    );
  } else {
    lines.push("No explicit positive or negative controls were supplied.");
  }
  return lines.join("\n\n");
}

function recommendEnumerationNextStep(report: Record<string, unknown>): string {
  const verdict = deriveEnumerationVerdict(report);
  if (verdict === "CLEAR") {
    return "Proceed to SPIKE-014 content fidelity for the same controlled Recall card set before any production dry-run.";
  }
  if (verdict === "PROCEED-WITH-CHANGES") {
    return "Do not run production apply yet. Add or verify Recall pagination/cap handling, then rerun SPIKE-013 until total-count/result-count behavior is explained.";
  }
  if (verdict === "BLOCKER") {
    return "Block production dry-run/apply. Resolve missing controls, unstable filtered results, or negative-control leakage before continuing.";
  }
  return "Rerun SPIKE-013 with a controlled date window and explicit positive controls for the Recall cards that will also be used in SPIKE-014.";
}

function readEnumerationFixture(path: string): EnumerationFixture {
  const parsed = JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;
  const directList = normalizeListResponse(parsed);
  if (directList) {
    return {
      unfiltered: directList,
      filteredFirst: directList,
      filteredSecond: directList,
    };
  }

  const fixture = recordOrNull(parsed);
  if (!fixture) throw new Error("Enumeration fixture must be a list response or object.");

  const unfiltered =
    normalizeListResponse(fixture.unfiltered) ??
    normalizeListResponse(fixture.filteredFirst) ??
    normalizeListResponse(fixture.filtered) ??
    normalizeListResponse(fixture.filteredSecond);
  if (!unfiltered) {
    throw new Error(
      "Enumeration fixture must include unfiltered, filtered, filteredFirst, or a direct results array.",
    );
  }

  return {
    unfiltered,
    filteredFirst:
      normalizeListResponse(fixture.filteredFirst) ??
      normalizeListResponse(fixture.filtered) ??
      unfiltered,
    filteredSecond:
      normalizeListResponse(fixture.filteredSecond) ??
      normalizeListResponse(fixture.filteredFirst) ??
      normalizeListResponse(fixture.filtered) ??
      unfiltered,
  };
}

function normalizeListResponse(value: unknown): RecallCardListResponse | null {
  if (Array.isArray(value)) {
    return {
      results: value as RecallCardPreview[],
      total_count: value.length,
    };
  }
  const record = recordOrNull(value);
  if (!record) return null;
  if (!Array.isArray(record.results)) return null;
  return {
    results: record.results as RecallCardPreview[],
    total_count: record.total_count ?? record.results.length,
  };
}

async function fetchCards(
  baseUrl: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<RecallCardListResponse> {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/cards`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  try {
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Recall API ${res.status}: ${text.slice(0, 500)}`);
    }
    return JSON.parse(text) as RecallCardListResponse;
  } catch (error) {
    console.error(JSON.stringify(redactError(error), null, 2));
    process.exit(1);
  }
}

function summarizeList(response: RecallCardListResponse, args: Args): Record<string, unknown> {
  const results = Array.isArray(response.results) ? response.results : [];
  const createdValues = results
    .map((card) => safeString(card.created_at))
    .filter((value): value is string => Boolean(value));
  return {
    totalCount: typeof response.total_count === "number" ? response.total_count : response.total_count ?? null,
    resultCount: results.length,
    firstId: redactId(safeString(results[0]?.id)),
    lastId: redactId(safeString(results.at(-1)?.id)),
    createdAtMin: createdValues.slice().sort()[0] ?? null,
    createdAtMax: createdValues.slice().sort().at(-1) ?? null,
    sample: results.slice(0, 5).map((card) => ({
      id: redactId(safeString(card.id)),
      title: args.allowTitles ? redactSensitiveString(safeString(card.title) ?? "") : "<redacted:title>",
      created_at: safeString(card.created_at),
      source_url: args.allowSourceUrls
        ? redactSensitiveString(safeString(card.source_url) ?? "")
        : redactSourceHost(safeString(card.source_url)),
    })),
  };
}

function stableIds(a: RecallCardPreview[] | undefined, b: RecallCardPreview[] | undefined): boolean {
  const left = (a ?? []).map((card) => safeString(card.id) ?? "");
  const right = (b ?? []).map((card) => safeString(card.id) ?? "");
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function hasCardId(results: RecallCardPreview[] | undefined, id: string): boolean {
  return (results ?? []).some((card) => safeString(card.id) === id);
}

function hasCardTitle(results: RecallCardPreview[] | undefined, title: string): boolean {
  return (results ?? []).some((card) => safeString(card.title) === title);
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return recordOrNull(value) ?? {};
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

function hasUnexplainedResultCap(summary: Record<string, unknown>): boolean {
  return (
    typeof summary.totalCount === "number" &&
    typeof summary.resultCount === "number" &&
    summary.totalCount > summary.resultCount
  );
}

function mergeUnique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function redactId(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 12) return "<redacted:id>";
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function redactSourceHost(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "<redacted:source_url>";
  }
}

function printHelp(): void {
  console.log(`Recall REST enumeration spike probe

Usage:
  RECALL_API_KEY=sk_... node --import tsx scripts/spikes/recall-rest-enumeration.ts \\
    --date-from 2026-06-24T00:00:00Z \\
    --date-to 2026-06-24T23:59:59Z \\
    --expect-title "Controlled test card"

Options:
  --date-from <iso>       Start of controlled date window.
  --date-to <iso>         End of controlled date window.
  --expect-id <id>        Positive control card id. Repeatable.
  --negative-id <id>      Negative control card id expected outside the window. Repeatable.
  --expect-title <title>  Positive control title. Repeatable.
  --manifest <path>       Private controlled sample manifest. Supplies date window and controls.
  --allow-titles          Print titles after secret redaction. Default redacts titles.
  --allow-source-urls     Print source URLs after secret redaction. Default prints host only.
  --base-url <url>        Override Recall API base URL. Defaults to ${DEFAULT_BASE_URL}.
  --fixture <path>        Offline list fixture JSON. Does not call Recall or require an API key.
  --write-report          Write a redacted Markdown spike report under docs/plans/spikes/.
  --report-path <path>    Write the redacted Markdown report to an explicit path.
`);
}

main().catch((error) => {
  console.error(JSON.stringify(redactError(error), null, 2));
  process.exit(1);
});
