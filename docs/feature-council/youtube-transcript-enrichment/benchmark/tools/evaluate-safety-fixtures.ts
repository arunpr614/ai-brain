import { lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractVideoId } from "../../../../../src/lib/capture/youtube-url";
import { isPrivateAddress } from "../../../../../src/lib/capture/url-safety";
import {
  SUBTITLE_LIMITS,
  SubtitlePreflightError,
  preflightSubtitleBytes,
  sha256Hex,
} from "./subtitle-preflight";
import {
  SCORER_LIMITS,
  TranscriptScorerError,
  normalizeTranscript,
} from "./transcript-scorer";

export const SAFETY_FIXTURE_EVALUATOR_VERSION = "1.0.0";
export const DEFAULT_SAFETY_FIXTURES_PATH = fileURLToPath(
  new URL("../SAFETY_FIXTURES.json", import.meta.url),
);

const MAX_FIXTURE_FILE_BYTES = 256 * 1024;
const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,95}$/;
const FIXTURE_ID_PATTERN = /^SAFE-(?:URL|STATE|TXT|FILE)-\d{2}$/;
const EXPECTED_PATTERN = /^[a-z][a-z0-9_]{2,127}$/;

export type SafetyResultStatus = "pass" | "known_gap" | "not_applicable";
export type SafetyFamily = "url" | "state" | "text" | "file";
export type ExecutableCheckName =
  | "youtube_url_unrecognized"
  | "private_literal_blocked"
  | "youtube_unrecognized_and_private_literal_blocked"
  | "repetitive_text_rejected_by_scorer"
  | "invalid_utf8_rejected_by_preflight"
  | "mixed_malformed_rejected_by_preflight"
  | "oversized_subtitle_rejected_by_preflight"
  | "excessive_cues_rejected_by_preflight";

export interface ExecutableOracle {
  kind: "executable_check";
  check: ExecutableCheckName;
  pass_reason_code: string;
  mismatch_reason_code: string;
}

export interface ExactExistingTestOracle {
  kind: "exact_existing_test";
  path: string;
  name: string;
}

export interface KnownGapOracle {
  kind: "known_gap";
  reason_code: string;
}

export interface NotExecutedOracle {
  kind: "not_executed";
  reason_code: string;
}

export type SafetyOracle =
  | ExecutableOracle
  | ExactExistingTestOracle
  | KnownGapOracle
  | NotExecutedOracle;

export interface SafetyFixture {
  id: string;
  family: SafetyFamily;
  class: string;
  input: unknown;
  expected: string;
  oracle: SafetyOracle;
}

export interface SafetyFixtureSet {
  schema_version: "1.2";
  status: "final_prelock_review_ready";
  primary_denominator: false;
  publication_safe: true;
  result_statuses: ["pass", "known_gap", "not_applicable"];
  fixtures: SafetyFixture[];
}

export interface SafetyEvaluationResult {
  id: string;
  status: SafetyResultStatus;
  reason_code: string;
}

export interface SafetyEvaluationReport {
  evaluator_version: typeof SAFETY_FIXTURE_EVALUATOR_VERSION;
  fixture_schema_version: "1.2";
  status: "complete" | "complete_with_known_gaps";
  counts: {
    total: number;
    pass: number;
    known_gap: number;
    not_applicable: number;
  };
  results: SafetyEvaluationResult[];
}

export type SafetyFixtureErrorCode =
  | "ARGUMENT_INVALID"
  | "DUPLICATE_JSON_KEY"
  | "INPUT_FILE_INVALID"
  | "INPUT_FILE_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_SCHEMA";

export class SafetyFixtureError extends Error {
  readonly code: SafetyFixtureErrorCode;

  constructor(code: SafetyFixtureErrorCode, message: string) {
    super(message);
    this.name = "SafetyFixtureError";
    this.code = code;
  }
}

type OracleContract =
  | {
    kind: "executable_check";
    check: ExecutableCheckName;
    passReason: string;
    mismatchReason: string;
  }
  | {
    kind: "exact_existing_test";
    path: string;
    name: string;
  }
  | {
    kind: "known_gap" | "not_executed";
    reason: string;
  };

interface FixtureContract {
  family: SafetyFamily;
  className: string;
  expected: string;
  oracle: OracleContract;
}

const HOSTILE_DATA_TEST_PATH =
  "docs/feature-council/youtube-transcript-enrichment/spikes/a1-harness/tests/cli.integration.test.ts";
const HOSTILE_DATA_TEST_NAME =
  "DEV integration: instruction/tool/exfiltration-looking cue text remains inert data";

const FIXTURE_CONTRACTS = Object.freeze({
  "SAFE-URL-01": executable("url", "unsupported_host", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_UNSUPPORTED_HOST", "YOUTUBE_HELPER_ACCEPTED_UNSUPPORTED_HOST"),
  "SAFE-URL-02": executable("url", "malformed_video_id", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_MALFORMED_ID", "YOUTUBE_HELPER_ACCEPTED_MALFORMED_ID"),
  "SAFE-URL-03": gap("url", "playlist", "explicit_unsupported_state_without_iteration", "known_gap", "PLAYLIST_FALLS_THROUGH_GENERIC_CAPTURE"),
  "SAFE-URL-04": executable("url", "loopback", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_IPV4_LOOPBACK", "PRIVATE_HELPER_ALLOWED_IPV4_LOOPBACK"),
  "SAFE-URL-05": executable("url", "ipv6_loopback", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_IPV6_LOOPBACK", "PRIVATE_HELPER_ALLOWED_IPV6_LOOPBACK"),
  "SAFE-URL-06": executable("url", "ipv4_mapped_ipv6", "private_literal_helper_blocks_after_url_canonicalization", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_MAPPED_IPV6", "PRIVATE_HELPER_MISSED_CANONICAL_MAPPED_IPV6"),
  "SAFE-URL-07": executable("url", "link_local_metadata", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_METADATA_ADDRESS", "PRIVATE_HELPER_ALLOWED_METADATA_ADDRESS"),
  "SAFE-URL-08": executable("url", "private_ipv4_10", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_PRIVATE_10", "PRIVATE_HELPER_ALLOWED_PRIVATE_10"),
  "SAFE-URL-09": executable("url", "private_ipv4_172", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_PRIVATE_172", "PRIVATE_HELPER_ALLOWED_PRIVATE_172"),
  "SAFE-URL-10": executable("url", "private_ipv4_192", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_PRIVATE_192", "PRIVATE_HELPER_ALLOWED_PRIVATE_192"),
  "SAFE-URL-11": executable("url", "ipv6_link_local", "private_literal_helper_blocks", "private_literal_blocked", "PRIVATE_HELPER_BLOCKED_IPV6_LINK_LOCAL", "PRIVATE_HELPER_ALLOWED_IPV6_LINK_LOCAL"),
  "SAFE-URL-12": executable("url", "userinfo_host_confusion", "youtube_helper_rejects_and_private_literal_helper_blocks", "youtube_unrecognized_and_private_literal_blocked", "HELPERS_BLOCKED_USERINFO_HOST_CONFUSION", "HELPERS_MISSED_USERINFO_HOST_CONFUSION"),
  "SAFE-URL-13": executable("url", "unsupported_media", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_UNSUPPORTED_MEDIA", "YOUTUBE_HELPER_ACCEPTED_UNSUPPORTED_MEDIA"),
  "SAFE-URL-14": gap("url", "redirect_to_private_mock", "validate_every_hop_and_reject_private_destination", "known_gap", "REDIRECT_HOPS_NOT_REVALIDATED"),
  "SAFE-URL-15": gap("url", "dns_rebinding_mock", "pin_or_revalidate_resolution_and_reject_private_destination", "known_gap", "DNS_RESOLUTION_NOT_PINNED_OR_REVALIDATED"),
  "SAFE-URL-16": executable("url", "hostname_suffix_confusion", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_SUFFIX_CONFUSION", "YOUTUBE_HELPER_ACCEPTED_SUFFIX_CONFUSION"),
  "SAFE-URL-17": executable("url", "non_http_scheme", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_NON_HTTP_SCHEME", "YOUTUBE_HELPER_ACCEPTED_NON_HTTP_SCHEME"),
  "SAFE-URL-18": executable("url", "overlong_video_id", "youtube_helper_rejects", "youtube_url_unrecognized", "YOUTUBE_HELPER_REJECTED_OVERLONG_ID", "YOUTUBE_HELPER_ACCEPTED_OVERLONG_ID_PREFIX"),
  "SAFE-STATE-01": gap("state", "scheduled_premiere_mock", "truthful_not_ready_without_caption_or_media_attempt", "known_gap", "NO_EXPLICIT_SCHEDULED_PREMIERE_CONTRACT"),
  "SAFE-STATE-02": gap("state", "active_live_stream_mock", "truthful_deferred_or_unsupported_without_stream_capture", "known_gap", "LIVE_RETRY_HAS_NO_HARD_LIFETIME_BUDGET"),
  "SAFE-STATE-03": exactTest("state", "unavailable_private_mock", "terminal_manual_needed_without_retry", "src/lib/capture/youtube-transcript/recovery.test.ts", "treats unavailable videos as terminal manual-needed failures"),
  "SAFE-TXT-01": exactTest("text", "instruction_override", "a1_ingestion_preserves_as_inert_data_without_provider_or_network_attempt", HOSTILE_DATA_TEST_PATH, HOSTILE_DATA_TEST_NAME),
  "SAFE-TXT-02": exactTest("text", "tool_trigger", "a1_ingestion_preserves_as_inert_data_without_provider_or_network_attempt", HOSTILE_DATA_TEST_PATH, HOSTILE_DATA_TEST_NAME),
  "SAFE-TXT-03": gap("text", "malicious_markup", "sanitize_for_every_rendering_and_export_sink", "known_gap", "TRANSCRIPT_OUTPUT_SANITIZATION_NOT_END_TO_END_TESTED"),
  "SAFE-TXT-04": gap("text", "false_timestamp", "reject_nonexistent_enrichment_reference", "not_executed", "GATE4_NOT_RUN_NO_CITATION_VALIDATOR_RUN"),
  "SAFE-TXT-05": exactTest("text", "credential_exfiltration", "a1_ingestion_preserves_as_inert_data_without_provider_or_network_attempt", HOSTILE_DATA_TEST_PATH, HOSTILE_DATA_TEST_NAME),
  "SAFE-TXT-06": executable("text", "repetitive_resource_exhaustion", "benchmark_scorer_rejects_before_quadratic_processing", "repetitive_text_rejected_by_scorer", "SCORER_REJECTED_REPETITION_BEFORE_DP", "SCORER_ACCEPTED_REPETITION_ABOVE_TOKEN_LIMIT"),
  "SAFE-TXT-07": gap("text", "enrichment_prompt_boundary", "transcript_data_is_separated_from_model_instructions_and_cannot_trigger_tools", "not_executed", "GATE4_NOT_RUN_NO_MODEL_PROMPT_BOUNDARY_RUN"),
  "SAFE-FILE-01": executable("file", "invalid_utf8", "strict_preflight_fails_closed_without_replacement", "invalid_utf8_rejected_by_preflight", "PREFLIGHT_REJECTED_INVALID_UTF8", "PREFLIGHT_ACCEPTED_INVALID_UTF8"),
  "SAFE-FILE-02": executable("file", "mixed_valid_invalid_cues", "strict_preflight_fails_closed_without_cue_drop", "mixed_malformed_rejected_by_preflight", "PREFLIGHT_REJECTED_MIXED_MALFORMED_FILE", "PREFLIGHT_ACCEPTED_MIXED_MALFORMED_FILE"),
  "SAFE-FILE-03": executable("file", "oversized_bytes", "strict_preflight_rejects_before_decode_or_parse", "oversized_subtitle_rejected_by_preflight", "PREFLIGHT_REJECTED_OVERSIZED_BYTES", "PREFLIGHT_ACCEPTED_OVERSIZED_BYTES"),
  "SAFE-FILE-04": executable("file", "excessive_cues", "strict_preflight_rejects_excessive_cues", "excessive_cues_rejected_by_preflight", "PREFLIGHT_REJECTED_EXCESSIVE_CUES", "PREFLIGHT_ACCEPTED_EXCESSIVE_CUES"),
  "SAFE-FILE-05": exactTest("file", "false_completeness", "truthful_safe_rejection_before_database_or_application_import", HOSTILE_DATA_TEST_PATH, "DEV integration: unknown completeness is a truthful safe rejection before DB/app imports"),
} satisfies Record<string, FixtureContract>);

const EXPECTED_FIXTURE_IDS = Object.freeze(Object.keys(FIXTURE_CONTRACTS));

export function parseSafetyFixturesJson(text: string): SafetyFixtureSet {
  if (typeof text !== "string") {
    throw new SafetyFixtureError("INVALID_JSON", "fixture JSON must be a string");
  }
  assertNoDuplicateJsonKeys(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SafetyFixtureError("INVALID_JSON", "fixture content is not valid JSON");
  }
  validateFixtureSet(parsed);
  return parsed;
}

export function parseSafetyFixturesBytes(bytes: Uint8Array): SafetyFixtureSet {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SafetyFixtureError("INVALID_JSON", "fixture content is not valid UTF-8");
  }
  return parseSafetyFixturesJson(text);
}

export function evaluateSafetyFixtures(set: SafetyFixtureSet): SafetyEvaluationReport {
  validateFixtureSet(set);
  const results = set.fixtures.map(evaluateFixture);
  const counts = {
    total: results.length,
    pass: results.filter((result) => result.status === "pass").length,
    known_gap: results.filter((result) => result.status === "known_gap").length,
    not_applicable: results.filter((result) => result.status === "not_applicable").length,
  };
  return {
    evaluator_version: SAFETY_FIXTURE_EVALUATOR_VERSION,
    fixture_schema_version: set.schema_version,
    status: counts.known_gap === 0 ? "complete" : "complete_with_known_gaps",
    counts,
    results,
  };
}

export function evaluateSafetyFixturesJson(text: string): SafetyEvaluationReport {
  return evaluateSafetyFixtures(parseSafetyFixturesJson(text));
}

export function readAndEvaluateSafetyFixtures(path = DEFAULT_SAFETY_FIXTURES_PATH): SafetyEvaluationReport {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    throw new SafetyFixtureError("INPUT_FILE_INVALID", "fixture path is not readable");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new SafetyFixtureError(
      "INPUT_FILE_INVALID",
      "fixture path must be a regular non-symlink file",
    );
  }
  if (stat.size > MAX_FIXTURE_FILE_BYTES) {
    throw new SafetyFixtureError(
      "INPUT_FILE_TOO_LARGE",
      `fixture file exceeds ${MAX_FIXTURE_FILE_BYTES} bytes`,
    );
  }
  return evaluateSafetyFixtures(parseSafetyFixturesBytes(readFileSync(path)));
}

function evaluateFixture(fixture: SafetyFixture): SafetyEvaluationResult {
  const oracle = fixture.oracle;
  if (oracle.kind === "known_gap") {
    return { id: fixture.id, status: "known_gap", reason_code: oracle.reason_code };
  }
  if (oracle.kind === "not_executed") {
    return { id: fixture.id, status: "not_applicable", reason_code: oracle.reason_code };
  }
  if (oracle.kind === "exact_existing_test") {
    return {
      id: fixture.id,
      status: "not_applicable",
      reason_code: "EXACT_EXISTING_TEST_REQUIRES_SEPARATE_EXECUTION",
    };
  }

  let passed = false;
  try {
    passed = executeCheck(oracle.check, fixture.input);
  } catch {
    return {
      id: fixture.id,
      status: "known_gap",
      reason_code: "EXECUTABLE_CHECK_ERRORED_FAIL_CLOSED",
    };
  }
  return passed
    ? { id: fixture.id, status: "pass", reason_code: oracle.pass_reason_code }
    : { id: fixture.id, status: "known_gap", reason_code: oracle.mismatch_reason_code };
}

function executeCheck(check: ExecutableCheckName, input: unknown): boolean {
  if (check === "youtube_url_unrecognized") {
    return extractVideoId(requireShortString(input)) === null;
  }
  if (check === "private_literal_blocked") {
    return privateLiteralIsBlocked(requireShortString(input));
  }
  if (check === "youtube_unrecognized_and_private_literal_blocked") {
    const value = requireShortString(input);
    return extractVideoId(value) === null && privateLiteralIsBlocked(value);
  }
  if (check === "repetitive_text_rejected_by_scorer") {
    requireSentinel(input, "generated_at_scorer_token_limit_plus_one");
    try {
      normalizeTranscript("token ".repeat(SCORER_LIMITS.maxTokensPerInput + 1));
      return false;
    } catch (error) {
      return error instanceof TranscriptScorerError && error.code === "LIMIT_EXCEEDED";
    }
  }
  if (check === "invalid_utf8_rejected_by_preflight") {
    requireSentinel(input, "binary_fixture_generated_in_memory");
    const bytes = Uint8Array.from([0x31, 0x0a, 0xff, 0x0a]);
    return preflightRejects(bytes, 1, 1_000, "INVALID_UTF8");
  }
  if (check === "mixed_malformed_rejected_by_preflight") {
    requireSentinel(input, "mixed_fixture_generated_in_memory");
    const bytes = Buffer.from([
      "1",
      "00:00:00,000 --> 00:00:01,000",
      "publication safe cue",
      "",
      "2",
      "not-a-timestamp",
      "must reject the complete file",
    ].join("\n"), "utf8");
    return preflightRejects(bytes, 2, 2_000, "INVALID_TIMESTAMP");
  }
  if (check === "oversized_subtitle_rejected_by_preflight") {
    requireSentinel(input, "generated_at_preflight_byte_limit_plus_one");
    const bytes = new Uint8Array(SUBTITLE_LIMITS.maxBytes + 1);
    return preflightRejects(bytes, 1, 1_000, "INPUT_TOO_LARGE");
  }
  if (check === "excessive_cues_rejected_by_preflight") {
    requireSentinel(input, "generated_at_parser_cue_limit_plus_one");
    const blocks = Array.from(
      { length: SUBTITLE_LIMITS.maxCues + 1 },
      (_, index) => `${index + 1}\n00:00:00,000 --> 00:00:00,001\nx`,
    );
    const bytes = Buffer.from(blocks.join("\n\n"), "utf8");
    return preflightRejects(bytes, SUBTITLE_LIMITS.maxCues, 1_000, "TOO_MANY_CUES");
  }
  return assertNever(check);
}

function privateLiteralIsBlocked(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return isPrivateAddress(hostname);
}

function preflightRejects(
  bytes: Uint8Array,
  expectedCueCount: number,
  declaredDurationMs: number,
  expectedCode: SubtitlePreflightError["code"],
): boolean {
  try {
    preflightSubtitleBytes(bytes, {
      format: "srt",
      declaredDurationMs,
      expectedRawSha256: sha256Hex(bytes),
      expectedCueCount,
      inputFileIntegrityAttested: true,
      contentCompleteness: "complete",
      contentCompletenessBasis: "publication_safe_in_memory_safety_fixture",
    });
    return false;
  } catch (error) {
    return error instanceof SubtitlePreflightError && error.code === expectedCode;
  }
}

function validateFixtureSet(value: unknown): asserts value is SafetyFixtureSet {
  const root = requireRecord(value, "fixture set");
  requireExactKeys(root, [
    "schema_version",
    "status",
    "primary_denominator",
    "publication_safe",
    "result_statuses",
    "fixtures",
  ], "fixture set");
  if (
    root.schema_version !== "1.2"
    || root.status !== "final_prelock_review_ready"
    || root.primary_denominator !== false
    || root.publication_safe !== true
  ) {
    invalidSchema("fixture-set version, status, denominator, or publication flag is invalid");
  }
  if (
    !Array.isArray(root.result_statuses)
    || root.result_statuses.length !== 3
    || root.result_statuses[0] !== "pass"
    || root.result_statuses[1] !== "known_gap"
    || root.result_statuses[2] !== "not_applicable"
  ) {
    invalidSchema("result_statuses must be the exact frozen status list");
  }
  if (!Array.isArray(root.fixtures) || root.fixtures.length !== EXPECTED_FIXTURE_IDS.length) {
    invalidSchema("fixtures must contain the complete frozen ID set");
  }
  root.fixtures.forEach((fixture, index) => validateFixture(fixture, EXPECTED_FIXTURE_IDS[index]));
}

function validateFixture(value: unknown, expectedId: string): void {
  const fixture = requireRecord(value, `fixture ${expectedId}`);
  requireExactKeys(fixture, ["id", "family", "class", "input", "expected", "oracle"], `fixture ${expectedId}`);
  if (
    fixture.id !== expectedId
    || typeof fixture.id !== "string"
    || !FIXTURE_ID_PATTERN.test(fixture.id)
  ) invalidSchema(`fixture order or ID is invalid for ${expectedId}`);
  const contract = FIXTURE_CONTRACTS[expectedId as keyof typeof FIXTURE_CONTRACTS];
  if (
    fixture.family !== contract.family
    || fixture.class !== contract.className
    || fixture.expected !== contract.expected
    || typeof fixture.expected !== "string"
    || !EXPECTED_PATTERN.test(fixture.expected)
  ) invalidSchema(`fixture contract is invalid for ${expectedId}`);
  validateFixtureInput(fixture.input, contract.family, expectedId);
  validateOracle(fixture.oracle, contract.oracle, expectedId);
}

function validateFixtureInput(input: unknown, family: SafetyFamily, id: string): void {
  if (family === "url" && (id === "SAFE-URL-14" || id === "SAFE-URL-15")) {
    const mock = requireRecord(input, `${id} input`);
    requireExactKeys(mock, ["url", "resolution_sequence"], `${id} input`);
    if (
      typeof mock.url !== "string"
      || !mock.url.startsWith("mock://")
      || !Array.isArray(mock.resolution_sequence)
      || mock.resolution_sequence.length !== 2
      || mock.resolution_sequence.some((address) => typeof address !== "string")
    ) invalidSchema(`${id} mock input is invalid`);
    return;
  }
  if (family === "state") {
    const state = requireRecord(input, `${id} input`);
    const keys = id === "SAFE-STATE-03"
      ? ["video_id", "http_status", "reason"]
      : ["video_id", "live_broadcast_content"];
    requireExactKeys(state, keys, `${id} input`);
    if (typeof state.video_id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(state.video_id)) {
      invalidSchema(`${id} state video ID is invalid`);
    }
    if (id === "SAFE-STATE-03") {
      if (state.http_status !== 404 || state.reason !== "videoNotFound_or_privateVideo") {
        invalidSchema(`${id} unavailable-state input is invalid`);
      }
    } else if (state.live_broadcast_content !== (id === "SAFE-STATE-01" ? "upcoming" : "live")) {
      invalidSchema(`${id} broadcast-state input is invalid`);
    }
    return;
  }
  if (typeof input !== "string" || input.length === 0 || input.length > 4_096) {
    invalidSchema(`${id} input must be a bounded publication-safe string or sentinel`);
  }
}

function validateOracle(value: unknown, contract: OracleContract, id: string): void {
  const oracle = requireRecord(value, `${id} oracle`);
  if (contract.kind === "executable_check") {
    requireExactKeys(oracle, ["kind", "check", "pass_reason_code", "mismatch_reason_code"], `${id} oracle`);
    if (
      oracle.kind !== contract.kind
      || oracle.check !== contract.check
      || oracle.pass_reason_code !== contract.passReason
      || oracle.mismatch_reason_code !== contract.mismatchReason
    ) invalidSchema(`${id} executable oracle does not match its frozen mapping`);
    requireReasonCode(oracle.pass_reason_code, `${id} pass reason`);
    requireReasonCode(oracle.mismatch_reason_code, `${id} mismatch reason`);
    return;
  }
  if (contract.kind === "exact_existing_test") {
    requireExactKeys(oracle, ["kind", "path", "name"], `${id} oracle`);
    if (
      oracle.kind !== contract.kind
      || oracle.path !== contract.path
      || oracle.name !== contract.name
    ) invalidSchema(`${id} exact-test oracle does not match its frozen mapping`);
    return;
  }
  requireExactKeys(oracle, ["kind", "reason_code"], `${id} oracle`);
  if (oracle.kind !== contract.kind || oracle.reason_code !== contract.reason) {
    invalidSchema(`${id} gap oracle does not match its frozen mapping`);
  }
  requireReasonCode(oracle.reason_code, `${id} reason`);
}

function executable(
  family: SafetyFamily,
  className: string,
  expected: string,
  check: ExecutableCheckName,
  passReason: string,
  mismatchReason: string,
): FixtureContract {
  return { family, className, expected, oracle: { kind: "executable_check", check, passReason, mismatchReason } };
}

function exactTest(
  family: SafetyFamily,
  className: string,
  expected: string,
  path: string,
  name: string,
): FixtureContract {
  return { family, className, expected, oracle: { kind: "exact_existing_test", path, name } };
}

function gap(
  family: SafetyFamily,
  className: string,
  expected: string,
  kind: "known_gap" | "not_executed",
  reason: string,
): FixtureContract {
  return { family, className, expected, oracle: { kind, reason } };
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalidSchema(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(record).sort();
  const canonical = [...expected].sort();
  if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
    invalidSchema(`${label} has missing or additional fields`);
  }
}

function requireReasonCode(value: unknown, label: string): void {
  if (typeof value !== "string" || !REASON_CODE_PATTERN.test(value)) {
    invalidSchema(`${label} must be a stable uppercase reason code`);
  }
}

function requireShortString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4_096) {
    throw new SafetyFixtureError("INVALID_SCHEMA", "executable input is not a bounded string");
  }
  return value;
}

function requireSentinel(value: unknown, expected: string): void {
  if (value !== expected) {
    throw new SafetyFixtureError("INVALID_SCHEMA", "generated fixture sentinel is invalid");
  }
}

function invalidSchema(message: string): never {
  throw new SafetyFixtureError("INVALID_SCHEMA", message);
}

function assertNever(value: never): never {
  throw new SafetyFixtureError("INVALID_SCHEMA", `unknown executable check ${String(value)}`);
}

function assertNoDuplicateJsonKeys(text: string): void {
  let position = 0;
  const fail = (message: string): never => {
    throw new SafetyFixtureError("INVALID_JSON", `${message} at byte ${position}`);
  };
  const whitespace = (): void => {
    while (position < text.length && /\s/u.test(text[position])) position += 1;
  };
  const parseString = (): string => {
    if (text[position] !== '"') fail("expected JSON string");
    const start = position;
    position += 1;
    while (position < text.length) {
      const character = text[position];
      if (character === '"') {
        position += 1;
        try {
          return JSON.parse(text.slice(start, position)) as string;
        } catch {
          return fail("invalid JSON string");
        }
      }
      if (character === "\\") {
        position += 1;
        if (position >= text.length) fail("unterminated JSON escape");
        if (text[position] === "u") {
          const hex = text.slice(position + 1, position + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) fail("invalid Unicode escape");
          position += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(text[position])) fail("invalid JSON escape");
        position += 1;
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) fail("unescaped control character");
      position += 1;
    }
    return fail("unterminated JSON string");
  };
  const parseValue = (): void => {
    whitespace();
    const character = text[position];
    if (character === "{") {
      position += 1;
      whitespace();
      const keys = new Set<string>();
      if (text[position] === "}") {
        position += 1;
        return;
      }
      while (position < text.length) {
        whitespace();
        const key = parseString();
        if (keys.has(key)) {
          throw new SafetyFixtureError("DUPLICATE_JSON_KEY", "duplicate JSON object key");
        }
        keys.add(key);
        whitespace();
        if (text[position] !== ":") fail("expected colon");
        position += 1;
        parseValue();
        whitespace();
        if (text[position] === "}") {
          position += 1;
          return;
        }
        if (text[position] !== ",") fail("expected object comma");
        position += 1;
      }
      fail("unterminated JSON object");
    }
    if (character === "[") {
      position += 1;
      whitespace();
      if (text[position] === "]") {
        position += 1;
        return;
      }
      while (position < text.length) {
        parseValue();
        whitespace();
        if (text[position] === "]") {
          position += 1;
          return;
        }
        if (text[position] !== ",") fail("expected array comma");
        position += 1;
      }
      fail("unterminated JSON array");
    }
    if (character === '"') {
      parseString();
      return;
    }
    const token = text.slice(position).match(
      /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/,
    )?.[0];
    if (token === undefined) return fail("invalid JSON value");
    position += token.length;
  };

  parseValue();
  whitespace();
  if (position !== text.length) fail("trailing JSON content");
}

function isDirectInvocation(): boolean {
  return Boolean(process.argv[1])
    && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
}

if (isDirectInvocation()) {
  try {
    if (process.argv.length > 3) {
      throw new SafetyFixtureError("ARGUMENT_INVALID", "expected zero or one fixture path");
    }
    const report = readAndEvaluateSafetyFixtures(process.argv[2]);
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } catch (error) {
    const errorCode = error instanceof SafetyFixtureError
      ? error.code
      : "UNEXPECTED_ERROR";
    process.stdout.write(`${JSON.stringify({
      evaluator_version: SAFETY_FIXTURE_EVALUATOR_VERSION,
      status: "error",
      error_code: errorCode,
    })}\n`);
    process.exitCode = 1;
  }
}
