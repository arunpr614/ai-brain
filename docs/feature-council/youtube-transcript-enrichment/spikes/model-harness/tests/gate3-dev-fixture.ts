import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

import {
  deriveGate3Result,
  writeGate3ResultExclusive,
  type Gate3SealBinding,
} from "../../../benchmark/tools/gate3-evidence";
import {
  evaluatePrivateA1,
  serializeA1PrivateScore,
  type A1PrivateScorerOptions,
} from "../../../benchmark/tools/score-private-a1";
import {
  preparePrivateReference,
  serializePrivatePreparation,
  type PrivatePreparationOptions,
} from "../../../benchmark/tools/prepare-private-reference";
import { preflightSubtitleBytes } from "../../../benchmark/tools/subtitle-preflight";
import {
  A1_ATTEMPT_RESIDUAL_LIMITATION,
  A1_ATTEMPT_UNIQUENESS_SCOPE,
  A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
  A1_OPERATOR_VERSION,
} from "../../../benchmark/tools/run-sealed-a1-cell";

const POSITIVES = ["YT-01", "YT-02", "YT-07", "YT-08", "YT-09"] as const;
const REJECTIONS = ["YT-03", "YT-04", "YT-05", "YT-06"] as const;
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const PRODUCT_GAPS = [
  "attestation_not_collected_or_enforced_by_current_service",
  "permissive_parser_requires_harness_preflight",
  "retention_and_derivation_not_runtime_enforced",
  "legacy_recovery_queue_coupled_to_youtube_item_insert",
  "normalized_contract_not_fully_persisted",
];

export const DEV_GATE3_BINDING: Gate3SealBinding = Object.freeze({
  contentCommit: "a".repeat(40),
  sealCommit: "b".repeat(40),
  lockSha256: "c".repeat(64),
});

export interface InstalledGate3Fixture {
  normalizedPath: string;
  sourceHash: string;
  attestationPath: string;
  attestationContent: string;
  authorizationItems: Array<Record<string, unknown>>;
}

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function attemptClaim(input: {
  stage: "gate1-primary" | "gate3-repeat";
  itemId: string;
  expectedOutcome: "eligible_pass" | "supported_class_safe_rejection" | "structural_safe_rejection";
}): Record<string, unknown> {
  return {
    schema_version: "1.0",
    operator_version: A1_OPERATOR_VERSION,
    publication_eligible: false,
    seal: {
      content_commit: DEV_GATE3_BINDING.contentCommit,
      seal_commit: DEV_GATE3_BINDING.sealCommit,
      lock_sha256: DEV_GATE3_BINDING.lockSha256,
    },
    cell: {
      stage: input.stage,
      item_id: input.itemId,
      expected_outcome: input.expectedOutcome,
    },
    execution_contract: {
      identity_sha256: A1_EXECUTION_CONTRACT_IDENTITY_SHA256,
      execution_boundary: "development_test_only",
      private_evidence_binding:
        "sealed_source_and_anchor_authorities_no_path_device_or_user_identifier",
    },
    scope: {
      uniqueness: A1_ATTEMPT_UNIQUENESS_SCOPE,
      residual_limitation: A1_ATTEMPT_RESIDUAL_LIMITATION,
    },
  };
}

async function putAttemptClaim(
  project: string,
  input: Parameters<typeof attemptClaim>[0],
): Promise<string> {
  const content = `${JSON.stringify(attemptClaim(input), null, 2)}\n`;
  await put(
    path.join(
      project,
      `docs/feature-council/youtube-transcript-enrichment/decisions/a1-attempt-claims/${DEV_GATE3_BINDING.sealCommit}/${input.stage}/${input.itemId}.publication-safe.json`,
    ),
    content,
  );
  return hash(content);
}

async function createFixtureDatabase(input: {
  databasePath: string;
  itemId: string;
  videoId: string;
  sourceRelativePath: string;
  sourceBytes: number;
  normalized: Buffer;
}): Promise<Buffer> {
  await mkdir(path.dirname(input.databasePath), { recursive: true, mode: 0o700 });
  const normalized = JSON.parse(input.normalized.toString("utf8")) as {
    segments: Array<{ start_ms: number; end_ms: number; text: string }>;
  };
  const body = normalized.segments.map((segment) => segment.text).join("\n\n");
  const itemKey = `item-${input.itemId}`;
  const policyKey = `policy-${input.itemId}`;
  const sourceKey = `source-${input.itemId}`;
  const sourceUrl = `https://www.youtube.com/watch?v=${input.videoId}`;
  const database = new Database(input.databasePath);
  try {
    database.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE items (
        id TEXT PRIMARY KEY, source_type TEXT, capture_source TEXT, source_url TEXT,
        title TEXT, author TEXT, body TEXT, summary TEXT, category TEXT,
        enrichment_state TEXT, extraction_warning TEXT, total_chars INTEGER,
        duration_seconds REAL, source_platform TEXT, capture_quality TEXT,
        extraction_method TEXT, extraction_version TEXT, enriched_at INTEGER, batch_id TEXT
      );
      CREATE TABLE capture_policy_decisions (
        id TEXT PRIMARY KEY, item_id TEXT, source_url TEXT, platform TEXT,
        environment TEXT, rights_basis TEXT, method TEXT, retention_class TEXT,
        blocked_reason TEXT, production_allowed INTEGER, legal_approval_id TEXT
      );
      CREATE TABLE transcript_sources (
        id TEXT PRIMARY KEY, item_id TEXT, policy_decision_id TEXT, source_kind TEXT,
        language_code TEXT, caption_source_class TEXT, timestamp_mode TEXT,
        provenance_json TEXT, retention_class TEXT, text_sha256 TEXT,
        segment_count INTEGER, status TEXT
      );
      CREATE TABLE transcript_segments (
        transcript_source_id TEXT, item_id TEXT, idx INTEGER, start_ms INTEGER,
        duration_ms INTEGER, end_ms INTEGER, text TEXT, text_sha256 TEXT,
        token_count INTEGER, confidence REAL
      );
      CREATE TABLE transcript_jobs (
        id INTEGER PRIMARY KEY, item_id TEXT, source_platform TEXT, video_id TEXT,
        state TEXT, attempts INTEGER, max_attempts INTEGER, claimed_at INTEGER,
        completed_at INTEGER, last_attempt_id TEXT, last_provider TEXT,
        last_error_code TEXT, last_error_message TEXT
      );
      CREATE TABLE transcript_attempts (id INTEGER PRIMARY KEY);
      CREATE TABLE enrichment_jobs (
        id INTEGER PRIMARY KEY, item_id TEXT, state TEXT, attempts INTEGER,
        last_error TEXT, claimed_at INTEGER, completed_at INTEGER
      );
      CREATE TABLE llm_usage (id INTEGER PRIMARY KEY);
      CREATE TABLE embedding_jobs (id INTEGER PRIMARY KEY, item_id TEXT);
    `);
    database.prepare(`
      INSERT INTO items VALUES (?, 'youtube', 'system', ?, 'Isolated A1 sidecar seed',
        NULL, ?, NULL, NULL, 'pending', NULL, ?, 60, 'youtube',
        'user_provided_full_text', 'manual_repair_transcript', 'capture-v0.7.5', NULL, NULL)
    `).run(itemKey, sourceUrl, body, body.length);
    database.prepare(`
      INSERT INTO capture_policy_decisions VALUES (
        ?, ?, ?, 'youtube', 'lab', 'user_provided_transcript', 'uploaded_file',
        'full_text_allowed', NULL, 1, NULL)
    `).run(policyKey, itemKey, sourceUrl);
    const provenance = {
      input_type: "file",
      policy_decision_id: policyKey,
      original_filename: path.basename(input.sourceRelativePath),
      extension: ".vtt",
      content_type: "text/vtt",
      byte_count: input.sourceBytes,
      parser_version: "transcript-file-v1",
      timestamp_mode: "timestamped",
      normalized_char_count: body.length,
      segment_count: normalized.segments.length,
      retention_class: "full_text_allowed",
    };
    database.prepare(`
      INSERT INTO transcript_sources VALUES (
        ?, ?, ?, 'uploaded_file', 'en-us', 'user_provided', 'timestamped', ?,
        'full_text_allowed', ?, ?, 'active')
    `).run(sourceKey, itemKey, policyKey, JSON.stringify(provenance), hash(body), normalized.segments.length);
    const insertSegment = database.prepare(`
      INSERT INTO transcript_segments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);
    for (const [index, segment] of normalized.segments.entries()) {
      insertSegment.run(
        sourceKey,
        itemKey,
        index,
        segment.start_ms,
        segment.end_ms - segment.start_ms,
        segment.end_ms,
        segment.text,
        hash(segment.text),
        segment.text.split(/\s+/).filter(Boolean).length,
      );
    }
    database.prepare(`
      INSERT INTO transcript_jobs VALUES (
        1, ?, 'youtube', NULL, 'pending', 0, 5, NULL, NULL, NULL, NULL, NULL, NULL)
    `).run(itemKey);
    database.prepare(`
      INSERT INTO enrichment_jobs VALUES (1, ?, 'pending', 0, NULL, NULL, NULL)
    `).run(itemKey);
  } finally {
    database.close();
  }
  await chmod(input.databasePath, 0o600);
  return readFile(input.databasePath);
}

async function put(filePath: string, content: string | Buffer, mode = 0o600): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, content, { mode });
  await chmod(filePath, mode);
}

function timestamp(milliseconds: number): string {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function positiveSubtitle(itemId: string): Buffer {
  const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];
  return Buffer.from(`WEBVTT\n\n${starts.map((start, index) => [
    String(index + 1),
    `${timestamp(start)} --> ${timestamp(start + 500)}`,
    `${itemId} deterministic private scoring phrase ${index + 1}`,
  ].join("\n")).join("\n\n")}`, "utf8");
}

function structuralSubtitle(): Buffer {
  return Buffer.from("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n   \n", "utf8");
}

function supportedClassSubtitle(): Buffer {
  const cues: string[] = [];
  for (let index = 0; index < 7_201; index += 1) {
    const start = index * 1_000;
    cues.push(`${index + 1}\n${timestamp(start)} --> ${timestamp(start + 500)}\nboundary phrase ${index + 1}`);
  }
  return Buffer.from(`WEBVTT\n\n${cues.join("\n\n")}`, "utf8");
}

function makeAttestation(input: {
  itemId: string;
  videoId: string;
  rawHash: string;
  cueCount: number;
  durationMs: number;
  lastCueEndMs: number;
  expectedClass: "eligible_supported" | "expected_safe_rejection";
}): Record<string, unknown> {
  return {
    schema_version: "1.2",
    item_id: input.itemId,
    youtube_video_id: input.videoId,
    attested_at: "2026-07-18T00:00:00Z",
    input_contract: {
      format: "vtt",
      language_tag: "en-US",
      declared_duration_ms: input.durationMs,
      expected_cue_count: input.cueCount,
      last_cue_end_ms: input.lastCueEndMs,
      content_completeness: {
        state: "complete",
        basis: "explicit_source_assertion",
        rationale: "Synthetic complete local test input.",
      },
      expected_class: input.expectedClass,
    },
    content_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/rights",
      rationale: "Synthetic local test evidence.",
      review_required: true,
    },
    transcript_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/transcript-rights",
      rationale: "Synthetic local test evidence.",
      review_required: true,
    },
    source: {
      owner: "Synthetic test owner",
      source_page_url: `https://example.invalid/watch/${input.videoId}`,
      sidecar_url: `https://example.invalid/captions/${input.videoId}.vtt`,
      sidecar_sha256: input.rawHash,
      private_relative_path: `inputs/${input.itemId}/${input.itemId}.vtt`,
    },
    retention_and_derivation: {
      full_text_private: true,
      publication: "hashes_and_derived_metrics_only",
      embeddings: "not_created",
      model_upload: "prohibited_in_protocol_v2",
      delete_by: "2026-10-14",
      evidence_url: "https://example.invalid/retention",
      rationale: "Synthetic local test retention.",
    },
    attribution: {
      credit: "Synthetic test owner",
      no_endorsement: true,
      third_party_caveats: [],
    },
    version_equivalence: {
      state: "official_row_level_publication_association",
      evidence: "Synthetic exact local association.",
      youtube_side_verified: false,
    },
    claims_boundary: [
      "input_preservation_only",
      "not_independent_wer_reference",
      "youtube_caption_state_unverified",
    ],
  };
}

function normalizedTranscript(input: {
  itemId: string;
  videoId: string;
  rawHash: string;
  starts: number[];
}): Buffer {
  const value = {
    schema_version: "1.0",
    item_id: input.itemId,
    youtube_video_id: input.videoId,
    source_method: "A1",
    language: "en-US",
    caption_type: "source_provided_unknown_authorship",
    timestamp_mode: "timestamped",
    completeness: {
      state: "complete",
      basis: "explicit_source_assertion",
      source_duration_ms: 60_000,
      last_cue_end_ms: 58_500,
      trailing_gap_ms: 1_500,
    },
    provenance: {
      source_page_url: `https://example.invalid/watch/${input.videoId}`,
      source_asset_url: `https://example.invalid/captions/${input.videoId}.vtt`,
      input_sha256: input.rawHash,
      reference_role: "input_preservation",
      version_equivalence: "official_row_level_publication_association",
      acquired_at: "2026-07-18T00:00:00Z",
    },
    processing_version: "a1-harness-1.0.0+preflight-1.0.0+test-parser",
    segments: input.starts.map((start, index) => ({
      index,
      start_ms: start,
      end_ms: start + 500,
      source_start_ms: start,
      source_end_ms: start + 500,
      text: `${input.itemId} deterministic private scoring phrase ${index + 1}`,
      source_cue_ids: [String(index + 1)],
    })),
    errors: [],
  };
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

function passReport(input: {
  attestationHash: string;
  rawHash: string;
  canonicalHash: string;
  videoId: string;
  normalizedHash: string;
  sourceBytes: number;
  normalizedCharacters: number;
}): Record<string, unknown> {
  return {
    schema_version: "1.0",
    harness_version: "1.0.0",
    execution_class: "SEALED",
    claim_scope: "locked_cell_only",
    status: "pass",
    hashes: {
      attestation_sha256: input.attestationHash,
      attestation_schema_sha256: "d".repeat(64),
      input_sha256: input.rawHash,
      video_id_sha256: hash(input.videoId),
      preflight_canonical_sha256: input.canonicalHash,
      expected_segments_sha256: "e".repeat(64),
      persisted_segments_sha256: "e".repeat(64),
      normalized_transcript_sha256: input.normalizedHash,
      normalized_transcript_schema_sha256: "f".repeat(64),
      benchmark_lock_sha256: DEV_GATE3_BINDING.lockSha256,
    },
    counts: {
      attestation_part_count: 6,
      raw_byte_count: input.sourceBytes,
      normalized_text_character_count: input.normalizedCharacters,
      locked_cue_count: 7,
      declared_duration_ms: 60_000,
      last_cue_end_ms: 58_500,
      persisted_segment_count: 7,
      overlap_count: 0,
      exact_duplicate_count: 0,
      recovery_job_count: 1,
      transcript_provider_attempt_count: 0,
      enrichment_provider_attempt_count: 0,
      llm_provider_attempt_count: 0,
      provider_attempt_count: 0,
      network_attempt_count: 0,
      current_product_gap_count: 5,
    },
    versions: { strict_preflight: "1.0.0", app_file_parser: "transcript-file-v1" },
    classification: {
      locked: "eligible_supported",
      observed: "eligible_supported",
      content_completeness: "complete",
      content_completeness_basis: "explicit_source_assertion",
    },
    network_attempts: [],
    outcomes: {
      isolated_a1_strategy: {
        ingestion_invoked: true,
        feasible: true,
        exact_segment_match: true,
        no_network_attempt: true,
        no_provider_attempt: true,
      },
      current_product: { ready: false, known_gap_codes: PRODUCT_GAPS },
    },
    runtime: { suppressed_console_count: 0, suppressed_console_sha256: EMPTY_SHA256 },
  };
}

function safeRejectionReport(input: {
  attestationHash: string;
  rawHash: string;
  canonicalHash: string;
  videoId: string;
  sourceBytes: number;
  normalizedCharacters: number;
  cueCount: number;
  durationMs: number;
  lastCueEndMs: number;
}): Record<string, unknown> {
  return {
    schema_version: "1.0",
    harness_version: "1.0.0",
    execution_class: "SEALED",
    claim_scope: "locked_cell_only",
    status: "safe_rejection",
    hashes: {
      attestation_sha256: input.attestationHash,
      attestation_schema_sha256: "d".repeat(64),
      input_sha256: input.rawHash,
      video_id_sha256: hash(input.videoId),
      preflight_canonical_sha256: input.canonicalHash,
      normalized_transcript_schema_sha256: "f".repeat(64),
      benchmark_lock_sha256: DEV_GATE3_BINDING.lockSha256,
    },
    counts: {
      attestation_part_count: 6,
      raw_byte_count: input.sourceBytes,
      normalized_text_character_count: input.normalizedCharacters,
      locked_cue_count: input.cueCount,
      declared_duration_ms: input.durationMs,
      last_cue_end_ms: input.lastCueEndMs,
      overlap_count: 0,
      exact_duplicate_count: 0,
      persisted_segment_count: 0,
      recovery_job_count: 0,
      enrichment_provider_attempt_count: 0,
      provider_attempt_count: 0,
      network_attempt_count: 0,
      current_product_gap_count: 5,
    },
    versions: { strict_preflight: "1.0.0" },
    classification: {
      locked: "expected_safe_rejection",
      observed: "expected_safe_rejection",
      content_completeness: "complete",
      content_completeness_basis: "explicit_source_assertion",
    },
    network_attempts: [],
    outcomes: {
      isolated_a1_strategy: {
        ingestion_invoked: false,
        truthful_safe_rejection: true,
        no_network_attempt: true,
        no_provider_attempt: true,
      },
      current_product: { ready: false, known_gap_codes: PRODUCT_GAPS },
    },
    runtime: { suppressed_console_count: 0, suppressed_console_sha256: EMPTY_SHA256 },
  };
}

function operatorReceipt(input: {
  stage: "gate1-primary" | "gate3-repeat";
  itemId: string;
  expectedOutcome: "eligible_pass" | "supported_class_safe_rejection" | "structural_safe_rejection";
  harnessExitCode: number;
  scorerExitCode: number | null;
  harnessReportHash: string;
  normalizedHash: string | null;
  scorerOptionsHash: string | null;
  scorerReportHash: string | null;
  databaseHash: string | null;
  attemptClaimHash: string;
}): Record<string, unknown> {
  return {
    schema_version: "1.1",
    operator_version: A1_OPERATOR_VERSION,
    seal: {
      content_commit: DEV_GATE3_BINDING.contentCommit,
      seal_commit: DEV_GATE3_BINDING.sealCommit,
      lock_sha256: DEV_GATE3_BINDING.lockSha256,
    },
    cell: {
      stage: input.stage,
      item_id: input.itemId,
      expected_outcome: input.expectedOutcome,
    },
    execution_boundary: "development_test_only",
    publication_eligible: false,
    attempt_claim_sha256: input.attemptClaimHash,
    process: {
      harness_exit_code: input.harnessExitCode,
      scorer_exit_code: input.scorerExitCode,
    },
    hashes: {
      harness_report_sha256: input.harnessReportHash,
      normalized_transcript_sha256: input.normalizedHash,
      scorer_options_sha256: input.scorerOptionsHash,
      scorer_report_sha256: input.scorerReportHash,
      database_sha256: input.databaseHash,
    },
    outcomes: {
      expected_outcome_observed: true,
      rerun_policy: "reject_if_claim_or_fixed_cell_receipt_or_terminal_exists_before_any_attempt_write",
      selection_policy: "fixed_seal_stage_item_paths_no_caller_selected_evidence",
    },
  };
}

export async function installGate3DevFixture(project: string, privateRoot: string): Promise<InstalledGate3Fixture> {
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  await chmod(privateRoot, 0o700);
  const ledgerItems: Array<Record<string, unknown>> = [];
  const matrixItems: Array<Record<string, unknown>> = [];
  const authorizationItems: Array<Record<string, unknown>> = [];
  let selected: InstalledGate3Fixture | null = null;
  const starts = [1_000, 8_000, 15_000, 25_000, 35_000, 45_000, 58_000];

  for (const [index, itemId] of POSITIVES.entries()) {
    const videoId = `DEV${String(index + 1).padStart(8, "0")}`;
    const raw = positiveSubtitle(itemId);
    const rawHash = hash(raw);
    const preflight = preflightSubtitleBytes(raw, {
      format: "vtt",
      declaredDurationMs: 60_000,
      expectedRawSha256: rawHash,
      expectedCueCount: 7,
      inputFileIntegrityAttested: true,
      contentCompleteness: "complete",
      contentCompletenessBasis: "explicit_source_assertion",
    });
    const attestation = makeAttestation({
      itemId,
      videoId,
      rawHash,
      cueCount: 7,
      durationMs: 60_000,
      lastCueEndMs: 58_500,
      expectedClass: "eligible_supported",
    });
    const attestationContent = `${JSON.stringify(attestation)}\n`;
    const attestationHash = hash(attestationContent);
    const attestationPath = path.join(project, `docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/${itemId}.json`);
    await put(attestationPath, attestationContent);
    const sourceRelative = `inputs/${itemId}/${itemId}.vtt`;
    await put(path.join(privateRoot, sourceRelative), raw);
    const preparationOptions: PrivatePreparationOptions = {
      schema_version: "1.2",
      format: "vtt",
      declared_duration_ms: 60_000,
      expected_raw_sha256: rawHash,
      expected_cue_count: 7,
      input_file_integrity_attested: true,
      content_completeness: "complete",
      content_completeness_basis: "explicit_source_assertion",
      reference_role: "a1_input_preservation_oracle",
      expected_class: "eligible_supported",
    };
    const anchors = Buffer.from(serializePrivatePreparation(preparePrivateReference(raw, preparationOptions)), "utf8");
    const anchorRelative = `references/${itemId}.anchors.private.json`;
    await put(path.join(privateRoot, anchorRelative), anchors);
    const normalized = normalizedTranscript({ itemId, videoId, rawHash, starts });
    const normalizedHash = hash(normalized);
    const primaryRoot = path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/${itemId}`);
    const repeatRoot = path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/gate3-repeat/${itemId}`);
    const primaryClaimHash = await putAttemptClaim(project, {
      stage: "gate1-primary",
      itemId,
      expectedOutcome: "eligible_pass",
    });
    const repeatClaimHash = await putAttemptClaim(project, {
      stage: "gate3-repeat",
      itemId,
      expectedOutcome: "eligible_pass",
    });
    const baseOptions: A1PrivateScorerOptions = {
      schema_version: "1.0",
      format: "vtt",
      declared_duration_ms: 60_000,
      expected_raw_sha256: rawHash,
      expected_cue_count: 7,
      input_file_integrity_attested: true,
      content_completeness: "complete",
      content_completeness_basis: "explicit_source_assertion",
      reference_role: "a1_input_preservation_oracle",
      expected_anchor_packet_sha256: hash(anchors),
      expected_normalized_transcript_sha256: normalizedHash,
      comparison_canonical_output_sha256: null,
    };
    const firstScore = evaluatePrivateA1(raw, anchors, normalized, baseOptions);
    const repeatScoreOptions = {
      ...baseOptions,
      comparison_canonical_output_sha256: firstScore.hashes.canonical_normalized_output_sha256,
    };
    const secondScore = evaluatePrivateA1(raw, anchors, normalized, repeatScoreOptions);
    const report = passReport({
      attestationHash,
      rawHash,
      canonicalHash: preflight.normalizedSha256,
      videoId,
      normalizedHash,
      sourceBytes: raw.byteLength,
      normalizedCharacters: preflight.normalizedTextCharacterCount,
    });
    const reportContent = `${JSON.stringify(report)}\n`;
    const primaryOptionsContent = `${JSON.stringify(baseOptions, null, 2)}\n`;
    const repeatOptionsContent = `${JSON.stringify(repeatScoreOptions, null, 2)}\n`;
    const primaryScoreContent = serializeA1PrivateScore(firstScore);
    const repeatScoreContent = serializeA1PrivateScore(secondScore);
    for (const root of [primaryRoot, repeatRoot]) {
      await put(path.join(root, "harness-report.publication-safe.json"), reportContent);
      await put(path.join(root, "a1-normalized-transcript.private.json"), normalized);
    }
    const primaryDatabase = await createFixtureDatabase({
      databasePath: path.join(primaryRoot, "throwaway.sqlite"),
      itemId,
      videoId,
      sourceRelativePath: sourceRelative,
      sourceBytes: raw.byteLength,
      normalized,
    });
    const repeatDatabase = await createFixtureDatabase({
      databasePath: path.join(repeatRoot, "throwaway.sqlite"),
      itemId,
      videoId,
      sourceRelativePath: sourceRelative,
      sourceBytes: raw.byteLength,
      normalized,
    });
    await put(path.join(primaryRoot, "a1-score-options.private.json"), primaryOptionsContent);
    await put(path.join(primaryRoot, "a1-score.publication-safe.json"), primaryScoreContent);
    await put(path.join(repeatRoot, "a1-score-options.private.json"), repeatOptionsContent);
    await put(path.join(repeatRoot, "a1-score.publication-safe.json"), repeatScoreContent);
    for (const receipt of [
      operatorReceipt({
        stage: "gate1-primary",
        itemId,
        expectedOutcome: "eligible_pass",
        harnessExitCode: 0,
        scorerExitCode: 0,
        harnessReportHash: hash(reportContent),
        normalizedHash,
        scorerOptionsHash: hash(primaryOptionsContent),
        scorerReportHash: hash(primaryScoreContent),
        databaseHash: hash(primaryDatabase),
        attemptClaimHash: primaryClaimHash,
      }),
      operatorReceipt({
        stage: "gate3-repeat",
        itemId,
        expectedOutcome: "eligible_pass",
        harnessExitCode: 0,
        scorerExitCode: 0,
        harnessReportHash: hash(reportContent),
        normalizedHash,
        scorerOptionsHash: hash(repeatOptionsContent),
        scorerReportHash: hash(repeatScoreContent),
        databaseHash: hash(repeatDatabase),
        attemptClaimHash: repeatClaimHash,
      }),
    ]) {
      const cell = receipt.cell as { stage: string };
      await put(
        path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/operator-receipts/${cell.stage}/${itemId}.publication-safe.json`),
        `${JSON.stringify(receipt, null, 2)}\n`,
      );
    }
    ledgerItems.push({
      item_id: itemId,
      reference_role: "a1_input_preservation_oracle",
      attestation_sha256: attestationHash,
      source_raw_sha256: rawHash,
      source_canonical_sha256: preflight.normalizedSha256,
      source_bytes: raw.byteLength,
      normalized_text_character_count: preflight.normalizedTextCharacterCount,
      cue_count: 7,
      declared_duration_ms: 60_000,
      last_cue_end_ms: 58_500,
      actual_anchor_count: (JSON.parse(anchors.toString("utf8")) as { publication_safe_summary: { anchor_count: number } }).publication_safe_summary.anchor_count,
      base_anchor_target: 10,
      preparation_document_sha256: hash(anchors),
      preparation_private_relative_path: anchorRelative,
      preflight_state: "passed",
      preflight_error_code: null,
      preflight_failure_cue_ordinal: null,
      content_completeness_state: "complete",
      expected_class: "eligible_supported",
      state: "ready",
    });
    matrixItems.push({ item_id: itemId, a1_cell_state: "eligible_supported" });
    authorizationItems.push({
      item_id: itemId,
      attestation_path: `docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/${itemId}.json`,
      attestation_sha256: attestationHash,
      source_raw_sha256: rawHash,
      retention: { private_delete_by: "2026-10-14" },
    });
    if (itemId === "YT-01") {
      selected = {
        normalizedPath: path.join(primaryRoot, "a1-normalized-transcript.private.json"),
        sourceHash: rawHash,
        attestationPath,
        attestationContent,
        authorizationItems,
      };
    }
  }

  for (const itemId of REJECTIONS) {
    const index = REJECTIONS.indexOf(itemId);
    const videoId = `REJ${String(index + 1).padStart(8, "0")}`;
    const raw = itemId === "YT-04" ? supportedClassSubtitle() : structuralSubtitle();
    const rawHash = hash(raw);
    const durationMs = itemId === "YT-04" ? 7_201_000 : 3_000;
    const cueCount = itemId === "YT-04" ? 7_201 : 1;
    const lastCueEndMs = itemId === "YT-04" ? 7_200_500 : 2_000;
    const attestation = makeAttestation({
      itemId,
      videoId,
      rawHash,
      cueCount,
      durationMs,
      lastCueEndMs,
      expectedClass: "expected_safe_rejection",
    });
    const attestationContent = `${JSON.stringify(attestation)}\n`;
    const attestationHash = hash(attestationContent);
    await put(path.join(project, `docs/feature-council/youtube-transcript-enrichment/benchmark/attestations/${itemId}.json`), attestationContent);
    await put(path.join(privateRoot, `inputs/${itemId}/${itemId}.vtt`), raw);
    const primaryRoot = path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/gate1-primary/${itemId}`);
    const rejectionClaimHash = await putAttemptClaim(project, {
      stage: "gate1-primary",
      itemId,
      expectedOutcome: itemId === "YT-04"
        ? "supported_class_safe_rejection"
        : "structural_safe_rejection",
    });
    if (itemId === "YT-04") {
      const preflight = preflightSubtitleBytes(raw, {
        format: "vtt",
        declaredDurationMs: durationMs,
        expectedRawSha256: rawHash,
        expectedCueCount: cueCount,
        inputFileIntegrityAttested: true,
        contentCompleteness: "complete",
        contentCompletenessBasis: "explicit_source_assertion",
      });
      const preparationOptions: PrivatePreparationOptions = {
        schema_version: "1.2",
        format: "vtt",
        declared_duration_ms: durationMs,
        expected_raw_sha256: rawHash,
        expected_cue_count: cueCount,
        input_file_integrity_attested: true,
        content_completeness: "complete",
        content_completeness_basis: "explicit_source_assertion",
        reference_role: "a1_input_preservation_oracle",
        expected_class: "expected_safe_rejection",
      };
      const preparation = Buffer.from(
        serializePrivatePreparation(preparePrivateReference(raw, preparationOptions)),
        "utf8",
      );
      const preparationRelative = `references/${itemId}.anchors.private.json`;
      await put(path.join(privateRoot, preparationRelative), preparation);
      const reportContent = `${JSON.stringify(safeRejectionReport({
        attestationHash,
        rawHash,
        canonicalHash: preflight.normalizedSha256,
        videoId,
        sourceBytes: raw.byteLength,
        normalizedCharacters: preflight.normalizedTextCharacterCount,
        cueCount,
        durationMs,
        lastCueEndMs,
      }))}\n`;
      await put(path.join(primaryRoot, "harness-report.publication-safe.json"), reportContent);
      await put(
        path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/operator-receipts/gate1-primary/${itemId}.publication-safe.json`),
        `${JSON.stringify(operatorReceipt({
          stage: "gate1-primary",
          itemId,
          expectedOutcome: "supported_class_safe_rejection",
          harnessExitCode: 0,
          scorerExitCode: null,
          harnessReportHash: hash(reportContent),
          normalizedHash: null,
          scorerOptionsHash: null,
          scorerReportHash: null,
          databaseHash: null,
          attemptClaimHash: rejectionClaimHash,
        }), null, 2)}\n`,
      );
      ledgerItems.push({
        item_id: itemId,
        reference_role: "a1_safe_rejection_record",
        attestation_sha256: attestationHash,
        source_raw_sha256: rawHash,
        source_canonical_sha256: preflight.normalizedSha256,
        source_bytes: raw.byteLength,
        normalized_text_character_count: preflight.normalizedTextCharacterCount,
        cue_count: cueCount,
        declared_duration_ms: durationMs,
        last_cue_end_ms: lastCueEndMs,
        actual_anchor_count: 0,
        base_anchor_target: 25,
        preparation_document_sha256: hash(preparation),
        preparation_private_relative_path: preparationRelative,
        preflight_state: "passed",
        preflight_error_code: null,
        preflight_failure_cue_ordinal: null,
        content_completeness_state: "complete",
        expected_class: "expected_safe_rejection",
        state: "expected_supported_class_rejection",
      });
      matrixItems.push({ item_id: itemId, a1_cell_state: "expected_supported_class_rejection" });
    } else {
      const reportContent = `${JSON.stringify({
        schema_version: "1.0",
        harness_version: "1.0.0",
        status: "fail",
        error_code: "PREFLIGHT_REJECTED",
        detail_code: "INVALID_STRUCTURE",
        counts: { network_attempt_count: 0, suppressed_console_count: 0 },
        hashes: { suppressed_console_sha256: EMPTY_SHA256 },
        network_attempts: [],
      })}\n`;
      await put(path.join(primaryRoot, "harness-report.publication-safe.json"), reportContent);
      await put(
        path.join(privateRoot, `outputs/${DEV_GATE3_BINDING.sealCommit}/operator-receipts/gate1-primary/${itemId}.publication-safe.json`),
        `${JSON.stringify(operatorReceipt({
          stage: "gate1-primary",
          itemId,
          expectedOutcome: "structural_safe_rejection",
          harnessExitCode: 1,
          scorerExitCode: null,
          harnessReportHash: hash(reportContent),
          normalizedHash: null,
          scorerOptionsHash: null,
          scorerReportHash: null,
          databaseHash: null,
          attemptClaimHash: rejectionClaimHash,
        }), null, 2)}\n`,
      );
      ledgerItems.push({
        item_id: itemId,
        reference_role: "a1_safe_rejection_record",
        attestation_sha256: attestationHash,
        source_raw_sha256: rawHash,
        source_canonical_sha256: null,
        source_bytes: raw.byteLength,
        normalized_text_character_count: null,
        cue_count: cueCount,
        declared_duration_ms: durationMs,
        last_cue_end_ms: lastCueEndMs,
        actual_anchor_count: 0,
        base_anchor_target: 10,
        preparation_document_sha256: null,
        preparation_private_relative_path: null,
        preflight_state: "rejected",
        preflight_error_code: "INVALID_STRUCTURE",
        preflight_failure_cue_ordinal: 1,
        content_completeness_state: "complete",
        expected_class: "expected_safe_rejection",
        state: "expected_structural_rejection",
      });
      matrixItems.push({ item_id: itemId, a1_cell_state: "expected_structural_rejection" });
    }
  }

  const order = ["YT-01", "YT-02", "YT-03", "YT-04", "YT-05", "YT-06", "YT-07", "YT-08", "YT-09"];
  ledgerItems.sort((left, right) => order.indexOf(left.item_id as string) - order.indexOf(right.item_id as string));
  matrixItems.sort((left, right) => order.indexOf(left.item_id as string) - order.indexOf(right.item_id as string));
  matrixItems.push({ item_id: "YT-10", a1_cell_state: "excluded_before_run_no_ingestible_sidecar" });
  await put(
    path.join(project, "docs/feature-council/youtube-transcript-enrichment/benchmark/REFERENCE_LEDGER.json"),
    `${JSON.stringify({ items: ledgerItems })}\n`,
  );
  await put(
    path.join(project, "docs/feature-council/youtube-transcript-enrichment/benchmark/METHOD_ITEM_MATRIX.json"),
    `${JSON.stringify({ items: matrixItems })}\n`,
  );
  const result = await deriveGate3Result({
    projectRoot: project,
    privateEvidenceRoot: privateRoot,
    binding: DEV_GATE3_BINDING,
    createdAt: "2026-07-18T05:59:00Z",
    executionBoundary: "development_test_only",
  });
  await writeGate3ResultExclusive(project, result);
  if (!selected) throw new Error("YT-01 fixture was not created");
  return { ...selected, authorizationItems };
}
