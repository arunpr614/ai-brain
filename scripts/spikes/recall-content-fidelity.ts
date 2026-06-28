#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertControlledSampleManifestFileSafety,
  loadControlledSampleManifest,
} from "../lib/recall-controlled-samples.mjs";
import { RecallApiClient } from "../../src/lib/recall/client";
import { evaluateRecallFidelityPolicy } from "../../src/lib/recall/fidelity";
import { mapRecallCardToCapturedInput } from "../../src/lib/recall/mapper";
import type { RecallCardDetail } from "../../src/lib/recall/types";
import { redactError, redactReportValue, redactSensitiveString } from "../../src/lib/security/redaction";
import {
  fencedJson,
  recallSpikeTimestamp,
  writeSpikeMarkdownReport,
  type SpikeVerdict,
} from "./recall-spike-report";

interface Args {
  cardIds: string[];
  fixturePath: string | null;
  manifestPath: string | null;
  sampleLabelsByCardId: Map<string, string>;
  manifestSummary: ManifestSummary | null;
  maxChunks: number;
  baseUrl: string | null;
  allowTitles: boolean;
  allowSourceUrls: boolean;
  allowUnverifiedImport: boolean;
  allowTruncatedImport: boolean;
  allowMetadataOnlyImport: boolean;
  warningUiAvailable: boolean;
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
}

async function main(): Promise<void> {
  const args = applyControlledManifest(parseArgs(process.argv.slice(2)));
  if (args.cardIds.length === 0 && !args.fixturePath) {
    throw new Error("Provide at least one --card-id or an offline --fixture.");
  }
  if (!args.fixturePath && !process.env.RECALL_API_KEY?.trim()) {
    console.error("RECALL_API_KEY is not set. Use --fixture for offline fidelity checks.");
    process.exitCode = 2;
    return;
  }

  const details = args.fixturePath
    ? readFixture(args.fixturePath)
    : await fetchLiveCards(args);

  const report = {
    mode: "recall_content_fidelity_probe",
    maxChunksRequested: args.maxChunks,
    cardCount: details.length,
    policyOptions: {
      allowUnverifiedImport: args.allowUnverifiedImport,
      allowTruncatedImport: args.allowTruncatedImport,
      allowMetadataOnlyImport: args.allowMetadataOnlyImport,
      warningUiAvailable: args.warningUiAvailable,
    },
    expectedControls: args.manifestSummary,
    cards: details.map((detail) => summarizeCard(detail, args)),
  };

  const redactedReport = asRecord(redactReportValue(report, { redactTitles: !args.allowTitles }));
  const markdownReportPath = writeFidelityMarkdownReport(redactedReport, args);

  console.log(JSON.stringify({ ...redactedReport, markdownReportPath }, null, 2));
}

function summarizeCard(detail: RecallCardDetail, args: Args): Record<string, unknown> {
  const mapped = mapRecallCardToCapturedInput(detail);
  const decision = evaluateRecallFidelityPolicy(mapped.sync.content_fidelity, {
    allowUnverifiedImport: args.allowUnverifiedImport,
    allowPossiblyTruncatedImport: args.allowTruncatedImport,
    allowMetadataOnlyImport: args.allowMetadataOnlyImport,
    warningUiAvailable: args.warningUiAvailable,
  });
  const rawTitle = detail.title ?? mapped.item.title;
  return {
    id: redactId(detail.id),
    sampleLabel: args.sampleLabelsByCardId.get(detail.id) ?? null,
    title: args.allowTitles ? redactSensitiveString(rawTitle) : "<redacted:title>",
    sourceUrl: args.allowSourceUrls
      ? redactSensitiveString(detail.source_url ?? "")
      : redactSourceHost(detail.source_url ?? null),
    recallCreatedAt: detail.created_at ?? null,
    sourcePlatform: mapped.item.source_platform ?? null,
    sourceType: mapped.item.source_type,
    chunkCount: mapped.sync.chunk_count,
    maxChunksHit: mapped.sync.chunk_count >= args.maxChunks,
    totalCharsPlanned: mapped.item.total_chars ?? mapped.item.body.length,
    contentFidelity: mapped.sync.content_fidelity,
    extractionWarning: mapped.item.extraction_warning ?? null,
    policy: decision,
  };
}

async function fetchLiveCards(args: Args): Promise<RecallCardDetail[]> {
  const apiKey = process.env.RECALL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RECALL_API_KEY is not set. Use --fixture for offline fidelity checks.");
  }
  const client = new RecallApiClient({
    apiKey,
    baseUrl: args.baseUrl ?? undefined,
  });
  const details: RecallCardDetail[] = [];
  for (const cardId of args.cardIds) {
    details.push(await client.getCardDetail(cardId, { maxChunks: args.maxChunks }));
  }
  return details;
}

function readFixture(path: string): RecallCardDetail[] {
  const parsed = JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;
  const rows =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { cards?: unknown }).cards)
        ? (parsed as { cards: unknown[] }).cards
        : [];
  return rows.map((row, index) => {
    if (!row || typeof row !== "object") throw new Error(`Fixture card ${index} must be an object.`);
    const card = row as Record<string, unknown>;
    if (typeof card.id !== "string" || !card.id.trim()) {
      throw new Error(`Fixture card ${index} is missing id.`);
    }
    return {
      id: card.id,
      title: typeof card.title === "string" ? card.title : null,
      created_at: typeof card.created_at === "string" ? card.created_at : null,
      source_url: typeof card.source_url === "string" ? card.source_url : null,
      image: typeof card.image === "string" ? card.image : null,
      chunks: Array.isArray(card.chunks) ? (card.chunks as RecallCardDetail["chunks"]) : [],
    };
  });
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    cardIds: [],
    fixturePath: null,
    manifestPath: null,
    sampleLabelsByCardId: new Map(),
    manifestSummary: null,
    maxChunks: 50,
    baseUrl: process.env.RECALL_API_BASE_URL?.trim() || null,
    allowTitles: false,
    allowSourceUrls: false,
    allowUnverifiedImport: false,
    allowTruncatedImport: false,
    allowMetadataOnlyImport: false,
    warningUiAvailable: false,
    writeReport: false,
    reportPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--card-id" && next) {
      args.cardIds.push(next);
      i += 1;
    } else if (arg === "--fixture" && next) {
      args.fixturePath = next;
      i += 1;
    } else if (arg === "--manifest" && next) {
      args.manifestPath = next;
      i += 1;
    } else if (arg === "--max-chunks" && next) {
      args.maxChunks = clampMaxChunks(Number(next));
      i += 1;
    } else if (arg === "--base-url" && next) {
      args.baseUrl = next.replace(/\/+$/, "");
      i += 1;
    } else if (arg === "--allow-titles") {
      args.allowTitles = true;
    } else if (arg === "--allow-source-urls") {
      args.allowSourceUrls = true;
    } else if (arg === "--allow-unverified-import") {
      args.allowUnverifiedImport = true;
    } else if (arg === "--allow-truncated-import") {
      args.allowTruncatedImport = true;
    } else if (arg === "--allow-metadata-only-import") {
      args.allowMetadataOnlyImport = true;
    } else if (arg === "--warning-ui-available") {
      args.warningUiAvailable = true;
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
  return args;
}

function applyControlledManifest(args: Args): Args {
  if (!args.manifestPath) return args;
  if (!args.fixturePath) assertControlledSampleManifestFileSafety(args.manifestPath);
  const manifest = loadControlledSampleManifest(args.manifestPath);
  const manifestCardIds = manifest.samples
    .map((sample) => sample.cardId)
    .filter(isNonEmptyString);
  const manifestSampleLabels = manifest.samples
    .map((sample) => sample.label)
    .filter(isNonEmptyString);
  args.cardIds = mergeUnique([...args.cardIds, ...manifestCardIds]);
  args.sampleLabelsByCardId = new Map(
    manifest.samples
      .filter((sample) => isNonEmptyString(sample.cardId) && isNonEmptyString(sample.label))
      .map((sample) => [String(sample.cardId), String(sample.label)] as const),
  );
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
  };
  return args;
}

function writeFidelityMarkdownReport(
  report: Record<string, unknown>,
  args: Args,
): string | null {
  const timestamp = recallSpikeTimestamp();
  return writeSpikeMarkdownReport(
    {
      spikeId: "SPIKE-014",
      title: "Can Recall card details provide safe import fidelity for AI Brain?",
      dateLabel: timestamp.dateLabel,
      triggeredBy: "Recall daily sync Phase B content-fidelity gate",
      blocks: "RDS-014, RDS-026b, RDS-026c, RDS-026e, RDS-027",
      verdict: deriveFidelityVerdict(report),
      question:
        "Can Recall card detail payloads provide enough content, provenance, and fidelity signal for AI Brain to safely import daily snapshots without over-indexing incomplete or private content?",
      method: [
        args.fixturePath
          ? `Loaded an offline Recall card-detail fixture from ${args.fixturePath}.`
          : `Fetched ${args.cardIds.length} live Recall card detail payload(s) using the documented card detail endpoint.`,
        args.manifestPath
          ? "Loaded the private controlled sample manifest and used it as the card-detail sample list."
          : "No controlled sample manifest was supplied; card IDs came only from explicit CLI flags or fixture contents.",
        `Requested max_chunks=${args.maxChunks}; values are clamped to Recall's documented 1-50 range.`,
        "Mapped each card through the same Recall mapper used by the import path.",
        "Evaluated the Recall fidelity policy and generated this Markdown report from the redacted probe object.",
        "Titles are redacted unless --allow-titles was explicitly supplied; source URLs are host-only unless --allow-source-urls was supplied.",
      ].join("\n\n"),
      evidence: fencedJson(report),
      findings: summarizeFidelityFindings(report),
      implementationRecommendation: recommendFidelityNextStep(report),
      risksAndGaps:
        "This report does not prove daily enumeration correctness; SPIKE-013 must still prove the same controlled cards are discoverable in the intended date window. If the sample set does not cover note, article, YouTube, PDF, no-source, and long/truncation candidates, content policy remains under-sampled.",
    },
    {
      enabled: args.writeReport,
      explicitPath: args.reportPath,
      defaultFileName: `SPIKE-014-recall-content-fidelity-${timestamp.fileTimestamp}.md`,
    },
  );
}

function deriveFidelityVerdict(report: Record<string, unknown>): SpikeVerdict {
  const cards = asRecordArray(report.cards);
  if (cards.length === 0) return "BLOCKER";
  const hasUnknown = cards.some((card) => card.contentFidelity === "blocked_unknown");
  if (hasUnknown) return "BLOCKER";
  const maxChunkCards = cards.filter((card) => card.maxChunksHit === true);
  const maxChunkClassified = maxChunkCards.every(
    (card) => card.contentFidelity === "possibly_truncated",
  );
  if (!maxChunkClassified) return "BLOCKER";
  const blockedByPolicy = cards.some((card) => asRecord(card.policy).shouldImport !== true);
  if (blockedByPolicy) return "PROCEED-WITH-CHANGES";
  return "CLEAR";
}

function summarizeFidelityFindings(report: Record<string, unknown>): string {
  const cards = asRecordArray(report.cards);
  const counts = new Map<string, number>();
  let maxChunkHits = 0;
  let importAllowed = 0;
  let retrievalAllowed = 0;
  for (const card of cards) {
    const fidelity = String(card.contentFidelity ?? "unknown");
    counts.set(fidelity, (counts.get(fidelity) ?? 0) + 1);
    if (card.maxChunksHit === true) maxChunkHits += 1;
    const policy = asRecord(card.policy);
    if (policy.shouldImport === true) importAllowed += 1;
    if (policy.shouldIndexForRetrieval === true) retrievalAllowed += 1;
  }
  const countText =
    counts.size > 0
      ? Array.from(counts.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : "none";
  return [
    `Cards evaluated: ${cards.length}.`,
    `Fidelity distribution: ${countText}.`,
    `Cards hitting max chunk count: ${maxChunkHits}.`,
    `Cards allowed for import by the current policy flags: ${importAllowed}/${cards.length}.`,
    `Cards eligible for retrieval indexing by the current policy flags: ${retrievalAllowed}/${cards.length}.`,
  ].join("\n\n");
}

function recommendFidelityNextStep(report: Record<string, unknown>): string {
  const verdict = deriveFidelityVerdict(report);
  if (verdict === "CLEAR") {
    return "Proceed to a redacted production dry-run only after SPIKE-013 has also proved controlled-card enumeration.";
  }
  if (verdict === "PROCEED-WITH-CHANGES") {
    return "Keep production apply blocked by default. Review the blocked fidelity classes, decide which classes may be explicitly approved, and keep retrieval indexing disabled for unverified/truncated/metadata-only imports unless a warning UI exists.";
  }
  if (verdict === "BLOCKER") {
    return "Block production dry-run/apply. Investigate missing detail payloads, unknown fidelity states, or max-chunk cards that were not classified as possibly truncated.";
  }
  return "Rerun SPIKE-014 with the controlled note, article, YouTube, PDF, and long/truncation candidate set.";
}

function clampMaxChunks(value: number): number {
  if (!Number.isFinite(value)) throw new Error("--max-chunks must be a number.");
  return Math.min(50, Math.max(1, Math.trunc(value)));
}

function redactId(id: string): string {
  if (id.length <= 12) return "<redacted:id>";
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function mergeUnique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function redactSourceHost(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "<redacted:source_url>";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === "object" && !Array.isArray(entry),
      )
    : [];
}

function printHelp(): void {
  console.log(`Recall content fidelity spike probe

Usage:
  RECALL_API_KEY=sk_... node --import tsx scripts/spikes/recall-content-fidelity.ts --card-id card_abc123
  node --import tsx scripts/spikes/recall-content-fidelity.ts --fixture data/private/recall-live-spikes/cards.json

Options:
  --card-id <id>                    Recall card ID to fetch. Repeatable.
  --fixture <path>                  Offline card-detail fixture JSON. Does not call Recall.
  --manifest <path>                 Private controlled sample manifest. Supplies live card IDs.
  --max-chunks <n>                  Recall max_chunks request, clamped to 1-50. Default 50.
  --base-url <url>                  Override Recall API base URL.
  --allow-titles                    Print titles after secret redaction. Default redacts titles.
  --allow-source-urls               Print source URLs after secret redaction. Default prints host only.
  --allow-unverified-import         Mark api_chunks_unverified as import-allowed in policy output.
  --allow-truncated-import          Mark possibly_truncated as import-allowed in policy output.
  --allow-metadata-only-import      Mark metadata_only as import-allowed in policy output.
  --warning-ui-available            Mark retrieval eligible for allowed unverified chunks.
  --write-report                    Write a redacted Markdown spike report under docs/plans/spikes/.
  --report-path <path>              Write the redacted Markdown report to an explicit path.
`);
}

main().catch((error) => {
  console.error(JSON.stringify(redactError(error), null, 2));
  process.exit(1);
});
