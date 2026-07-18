import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const DEV_VIDEO_ID = "DEVtest0001";
export const DEV_VTT = `WEBVTT

dev-cue-1
00:00:00.000 --> 00:00:04.000
Synthetic development transcript text describes a completely local workflow, deterministic validation, strict timestamp preservation, and publication-safe evidence without contacting any remote service.

dev-cue-2
00:00:04.000 --> 00:00:09.000
This second synthetic cue adds enough useful words for the current repair service while covering provenance, retention boundaries, exact segment comparison, provider isolation, and fail-closed behavior.
`;

export interface DevInputContract {
  format: "srt" | "vtt";
  languageTag: string;
  declaredDurationMs: number;
  expectedCueCount: number;
  lastCueEndMs: number;
  contentCompleteness: "complete" | "partial" | "unknown";
  contentCompletenessBasis:
    | "explicit_source_assertion"
    | "source_coverage_record"
    | "user_attestation"
    | "unknown";
  expectedClass: "eligible_supported" | "expected_safe_rejection";
}

export const DEFAULT_DEV_INPUT_CONTRACT: DevInputContract = Object.freeze({
  format: "vtt",
  languageTag: "en",
  declaredDurationMs: 10_000,
  expectedCueCount: 2,
  lastCueEndMs: 9_000,
  contentCompleteness: "complete",
  contentCompletenessBasis: "user_attestation",
  expectedClass: "eligible_supported",
});

export interface DevWorkspace {
  root: string;
  privateOutputDir: string;
  dbPath: string;
  inputPath: string;
  attestationPath: string;
  inputSha256: string;
  attestationSha256: string;
  inputContract: DevInputContract;
}

export function makeDevWorkspace(
  vtt = DEV_VTT,
  contractOverrides: Partial<DevInputContract> = {},
): DevWorkspace {
  const root = mkdtempSync(join(tmpdir(), "a1-harness-DEV-"));
  chmodSync(root, 0o700);
  const privateOutputDir = join(root, "private-output");
  mkdirSync(privateOutputDir, { mode: 0o700 });
  const inputPath = join(root, "DEV-input.vtt");
  writeFileSync(inputPath, vtt, { mode: 0o600 });
  const inputSha256 = sha256(vtt);
  const inputContract = { ...DEFAULT_DEV_INPUT_CONTRACT, ...contractOverrides };
  const attestation = validDevAttestation(inputSha256, inputContract);
  const attestationText = `${JSON.stringify(attestation, null, 2)}\n`;
  const attestationPath = join(root, "DEV-attestation.json");
  writeFileSync(attestationPath, attestationText, { mode: 0o600 });

  return {
    root,
    privateOutputDir,
    dbPath: join(privateOutputDir, "throwaway.sqlite"),
    inputPath,
    attestationPath,
    inputSha256,
    attestationSha256: sha256(attestationText),
    inputContract,
  };
}

export function validDevAttestation(
  inputSha256 = "0".repeat(64),
  inputContract: DevInputContract = DEFAULT_DEV_INPUT_CONTRACT,
): Record<string, unknown> {
  return {
    schema_version: "1.2",
    item_id: "YT-99",
    youtube_video_id: DEV_VIDEO_ID,
    attested_at: "2026-07-16T18:00:00Z",
    input_contract: {
      format: inputContract.format,
      language_tag: inputContract.languageTag,
      declared_duration_ms: inputContract.declaredDurationMs,
      expected_cue_count: inputContract.expectedCueCount,
      last_cue_end_ms: inputContract.lastCueEndMs,
      content_completeness: {
        state: inputContract.contentCompleteness,
        basis: inputContract.contentCompletenessBasis,
        rationale: "Synthetic DEV completeness declaration.",
      },
      expected_class: inputContract.expectedClass,
    },
    content_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/DEV/content-rights",
      rationale: "Wholly synthetic DEV fixture.",
      review_required: true,
    },
    transcript_rights: {
      state: "provisionally_allowed_for_private_benchmark_review_required",
      evidence_url: "https://example.invalid/DEV/transcript-rights",
      rationale: "Wholly synthetic DEV fixture.",
      review_required: true,
    },
    source: {
      owner: "A1 harness synthetic fixture",
      source_page_url: "https://example.invalid/DEV/source-page",
      sidecar_url: "https://example.invalid/DEV/fixture.vtt",
      sidecar_sha256: inputSha256,
      private_relative_path: "inputs/DEV/fixture.vtt",
    },
    retention_and_derivation: {
      full_text_private: true,
      publication: "hashes_and_derived_metrics_only",
      embeddings: "not_created",
      model_upload: "prohibited_in_protocol_v2",
      delete_by: "2026-08-15",
      evidence_url: "https://example.invalid/DEV/retention",
      rationale: "Synthetic DEV fixture with temporary local retention.",
    },
    attribution: {
      credit: "Synthetic A1 harness fixture",
      no_endorsement: true,
      third_party_caveats: [],
    },
    version_equivalence: {
      state: "official_row_level_publication_association",
      evidence: "Synthetic source row and sidecar were created together.",
      youtube_side_verified: false,
    },
    claims_boundary: [
      "input_preservation_only",
      "not_independent_wer_reference",
      "youtube_caption_state_unverified",
      "not_legal_approval",
      "not_production_readiness",
    ],
  };
}

export function cliArgs(workspace: DevWorkspace): string[] {
  const contract = workspace.inputContract;
  return [
    "--execution-class", "DEV",
    "--attestation", workspace.attestationPath,
    "--expected-attestation-sha256", workspace.attestationSha256,
    "--input", workspace.inputPath,
    "--expected-input-sha256", workspace.inputSha256,
    "--expected-video-id", DEV_VIDEO_ID,
    "--format", contract.format,
    "--expected-cue-count", String(contract.expectedCueCount),
    "--declared-duration-ms", String(contract.declaredDurationMs),
    "--expected-last-cue-end-ms", String(contract.lastCueEndMs),
    "--language", contract.languageTag,
    "--input-file-integrity-attested", "true",
    "--content-completeness", contract.contentCompleteness,
    "--content-completeness-basis", contract.contentCompletenessBasis,
    "--expected-class", contract.expectedClass,
    "--private-output-dir", workspace.privateOutputDir,
  ];
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
