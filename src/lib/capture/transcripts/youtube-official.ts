import crypto from "node:crypto";
import { getDb } from "@/db/client";
import { getItem } from "@/db/items";
import {
  deleteTranscriptSegmentsForItem,
  insertTranscriptSegments,
  insertTranscriptSource,
  supersedeTranscriptSourcesForItem,
  type TranscriptCaptionSourceClass,
  type TranscriptSegmentRow,
  type TranscriptSourceRow,
} from "@/db/transcripts";
import {
  allowOfficialYoutubeCaptionForItem,
  isYoutubeItem,
  type AllowedTranscriptAcquisition,
  type OfficialYoutubeCaptionRightsBasis,
} from "@/lib/capture/policy";
import {
  parseTranscriptFile,
  TRANSCRIPT_FILE_PARSER_VERSION,
  TranscriptFileParseError,
} from "@/lib/capture/transcripts/parse-file";
import { canonicalYoutubeUrl, extractVideoId } from "@/lib/capture/youtube-url";
import {
  RepairItemError,
  repairItemWithText,
  type RepairItemWithTextResult,
} from "@/lib/repair/item-repair";

const YOUTUBE_CAPTIONS_API_URL = "https://www.googleapis.com/youtube/v3/captions";
const OFFICIAL_CAPTIONS_ADAPTER_VERSION = "youtube-official-captions-v1";
const DEFAULT_PREFERRED_LANGUAGES = ["en"] as const;

export type OfficialYoutubeCaptionErrorCode =
  | "not_found"
  | "not_youtube_item"
  | "invalid_youtube_url"
  | "missing_access_token"
  | "policy_blocked"
  | "caption_list_failed"
  | "caption_download_failed"
  | "no_caption_tracks"
  | "no_usable_caption_track"
  | "caption_parse_failed"
  | "invalid_title"
  | "text_too_short";

export class OfficialYoutubeCaptionError extends Error {
  constructor(
    readonly code: OfficialYoutubeCaptionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OfficialYoutubeCaptionError";
  }
}

type FetchLike = typeof fetch;

export interface AttachOfficialYoutubeCaptionInput {
  itemId: string;
  accessToken: string;
  rightsBasis: OfficialYoutubeCaptionRightsBasis;
  preferredLanguages?: string[];
  includeAsr?: boolean;
  title?: string | null;
  fetchImpl?: FetchLike;
}

export interface OfficialYoutubeCaptionTrack {
  id: string;
  videoId: string;
  language: string | null;
  trackKind: string | null;
  name: string | null;
  isAutoSynced: boolean | null;
  isCC: boolean | null;
  isDraft: boolean | null;
  status: string | null;
}

export interface AttachOfficialYoutubeCaptionResult {
  repair: RepairItemWithTextResult;
  policyDecisionId: string;
  transcriptSource: TranscriptSourceRow;
  transcriptSegments: TranscriptSegmentRow[];
  selectedTrack: OfficialYoutubeCaptionTrack;
  liveSmokeStatus: "not_run" | "not_applicable";
}

interface YoutubeCaptionListResponse {
  items?: unknown[];
}

interface YoutubeCaptionResource {
  id?: unknown;
  snippet?: {
    videoId?: unknown;
    language?: unknown;
    trackKind?: unknown;
    name?: unknown;
    isAutoSynced?: unknown;
    isCC?: unknown;
    isDraft?: unknown;
    status?: unknown;
  };
}

export async function attachOfficialYoutubeCaptionToYoutubeItem(
  input: AttachOfficialYoutubeCaptionInput,
): Promise<AttachOfficialYoutubeCaptionResult> {
  const existing = getItem(input.itemId);
  if (!existing) {
    throw new OfficialYoutubeCaptionError("not_found", "Item not found.");
  }
  if (!isYoutubeItem(existing)) {
    throw new OfficialYoutubeCaptionError(
      "not_youtube_item",
      "Official captions can only be attached to YouTube items.",
    );
  }

  const videoId = extractVideoId(existing.source_url ?? "");
  if (!videoId) {
    throw new OfficialYoutubeCaptionError(
      "invalid_youtube_url",
      "Item does not have a supported YouTube video URL.",
    );
  }

  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    throw new OfficialYoutubeCaptionError(
      "missing_access_token",
      "A YouTube OAuth access token is required.",
    );
  }

  const policy = allowOfficialYoutubeCaptionForItem(existing, input.rightsBasis);
  if (policy.status === "blocked") {
    throw new OfficialYoutubeCaptionError("policy_blocked", policy.blockedReason);
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const preferredLanguages = normalizeLanguagePreferences(input.preferredLanguages);
  const includeAsr = input.includeAsr ?? true;
  const tracks = await listCaptionTracks({
    fetchImpl,
    accessToken,
    videoId,
  });
  if (tracks.length === 0) {
    throw new OfficialYoutubeCaptionError(
      "no_caption_tracks",
      "No caption tracks were returned for this video.",
    );
  }

  const selectedTrack = selectCaptionTrack(tracks, {
    videoId,
    preferredLanguages,
    includeAsr,
  });
  if (!selectedTrack) {
    throw new OfficialYoutubeCaptionError(
      "no_usable_caption_track",
      "No usable serving caption track matched this video and language preference.",
    );
  }

  const captionBytes = await downloadCaptionTrack({
    fetchImpl,
    accessToken,
    captionId: selectedTrack.id,
  });

  let parsed;
  try {
    parsed = parseTranscriptFile({
      filename: "youtube-official-caption.vtt",
      contentType: "text/vtt",
      bytes: captionBytes,
    });
  } catch (err) {
    if (err instanceof TranscriptFileParseError) {
      throw new OfficialYoutubeCaptionError(
        err.code === "text_too_short" ? "text_too_short" : "caption_parse_failed",
        err.message,
      );
    }
    throw err;
  }

  const tx = getDb().transaction((): AttachOfficialYoutubeCaptionResult => {
    let repair: RepairItemWithTextResult;
    try {
      repair = repairItemWithText({
        itemId: input.itemId,
        title: input.title,
        text: parsed.normalizedText,
        textKind: "transcript",
        captureQuality: "metadata_plus_transcript",
        extractionMethod: "youtube_official_caption",
      });
    } catch (err) {
      if (err instanceof RepairItemError) {
        throw new OfficialYoutubeCaptionError(err.code, err.message);
      }
      throw err;
    }

    supersedeTranscriptSourcesForItem(repair.item.id);
    deleteTranscriptSegmentsForItem(repair.item.id);
    const transcriptSource = insertTranscriptSource({
      item_id: repair.item.id,
      policy_decision_id: policy.allowed.policyDecisionId,
      source_kind: "youtube_official_caption",
      language_code: normalizeLanguageCode(selectedTrack.language),
      caption_source_class: captionSourceClassForTrackKind(selectedTrack.trackKind),
      timestamp_mode: parsed.timestampMode,
      provenance_json: JSON.stringify(
        provenanceForOfficialCaption({
          allowed: policy.allowed,
          videoId,
          selectedTrack,
          preferredLanguages,
          includeAsr,
          normalizedCharCount: parsed.normalizedText.length,
          segmentCount: parsed.segments.length,
        }),
      ),
      retention_class: policy.allowed.retentionClass,
      text_sha256: sha256(parsed.normalizedText),
      segment_count: parsed.segments.length,
      status: "active",
    });

    const transcriptSegments = insertTranscriptSegments(
      parsed.segments.map((segment) => ({
        transcript_source_id: transcriptSource.id,
        item_id: repair.item.id,
        idx: segment.idx,
        start_ms: segment.startMs,
        duration_ms: segment.durationMs,
        end_ms: segment.endMs,
        text: segment.text,
        text_sha256: sha256(segment.text),
        token_count: tokenCount(segment.text),
      })),
    );

    return {
      repair,
      policyDecisionId: policy.allowed.policyDecisionId,
      transcriptSource,
      transcriptSegments,
      selectedTrack,
      liveSmokeStatus: "not_run",
    };
  });

  return tx();
}

async function listCaptionTracks(input: {
  fetchImpl: FetchLike;
  accessToken: string;
  videoId: string;
}): Promise<OfficialYoutubeCaptionTrack[]> {
  const url = new URL(YOUTUBE_CAPTIONS_API_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", input.videoId);

  let res: Response;
  try {
    res = await input.fetchImpl(url.toString(), {
      headers: bearerHeaders(input.accessToken),
    });
  } catch {
    throw new OfficialYoutubeCaptionError(
      "caption_list_failed",
      "Caption list request failed.",
    );
  }
  if (!res.ok) {
    throw new OfficialYoutubeCaptionError(
      "caption_list_failed",
      `Caption list request failed with status ${res.status}.`,
    );
  }

  let parsed: YoutubeCaptionListResponse;
  try {
    parsed = (await res.json()) as YoutubeCaptionListResponse;
  } catch {
    throw new OfficialYoutubeCaptionError(
      "caption_list_failed",
      "Caption list response could not be parsed.",
    );
  }
  if (!Array.isArray(parsed.items)) {
    throw new OfficialYoutubeCaptionError(
      "caption_list_failed",
      "Caption list response did not include an items array.",
    );
  }

  return parsed.items
    .map((item) => normalizeCaptionTrack(item as YoutubeCaptionResource))
    .filter((track): track is OfficialYoutubeCaptionTrack => Boolean(track));
}

async function downloadCaptionTrack(input: {
  fetchImpl: FetchLike;
  accessToken: string;
  captionId: string;
}): Promise<Uint8Array> {
  const url = new URL(`${YOUTUBE_CAPTIONS_API_URL}/${encodeURIComponent(input.captionId)}`);
  url.searchParams.set("tfmt", "vtt");

  let res: Response;
  try {
    res = await input.fetchImpl(url.toString(), {
      headers: bearerHeaders(input.accessToken),
    });
  } catch {
    throw new OfficialYoutubeCaptionError(
      "caption_download_failed",
      "Caption download request failed.",
    );
  }
  if (!res.ok) {
    throw new OfficialYoutubeCaptionError(
      "caption_download_failed",
      `Caption download request failed with status ${res.status}.`,
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

function bearerHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function normalizeCaptionTrack(
  resource: YoutubeCaptionResource,
): OfficialYoutubeCaptionTrack | null {
  const id = stringValue(resource.id);
  const snippet = resource.snippet;
  if (!id || !snippet) return null;
  const videoId = stringValue(snippet.videoId);
  if (!videoId) return null;

  return {
    id,
    videoId,
    language: stringValue(snippet.language),
    trackKind: stringValue(snippet.trackKind),
    name: stringValue(snippet.name),
    isAutoSynced: booleanValue(snippet.isAutoSynced),
    isCC: booleanValue(snippet.isCC),
    isDraft: booleanValue(snippet.isDraft),
    status: stringValue(snippet.status),
  };
}

function selectCaptionTrack(
  tracks: OfficialYoutubeCaptionTrack[],
  options: {
    videoId: string;
    preferredLanguages: string[];
    includeAsr: boolean;
  },
): OfficialYoutubeCaptionTrack | null {
  const candidates = tracks.filter((track) => {
    if (track.videoId !== options.videoId) return false;
    if (track.status !== "serving") return false;
    if (track.isDraft === true) return false;
    const kind = normalizeTrackKind(track.trackKind);
    if (!options.includeAsr && kind === "asr") return false;
    return true;
  });
  if (candidates.length === 0) return null;

  return candidates
    .map((track, inputOrder) => ({
      track,
      score: [
        languageScore(track.language, options.preferredLanguages),
        trackKindScore(track.trackKind),
        inputOrder,
      ] as const,
    }))
    .sort((a, b) => compareScore(a.score, b.score))[0].track;
}

function compareScore(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function normalizeLanguagePreferences(preferredLanguages: string[] | undefined): string[] {
  const normalized = (preferredLanguages && preferredLanguages.length > 0
    ? preferredLanguages
    : DEFAULT_PREFERRED_LANGUAGES
  )
    .map(normalizeLanguageCode)
    .filter((language): language is string => Boolean(language));
  return Array.from(new Set(normalized.length > 0 ? normalized : DEFAULT_PREFERRED_LANGUAGES));
}

function languageScore(language: string | null, preferredLanguages: string[]): number {
  const normalized = normalizeLanguageCode(language);
  if (!normalized) return 10_000;
  for (let i = 0; i < preferredLanguages.length; i += 1) {
    const preferred = preferredLanguages[i];
    if (normalized === preferred) return i;
  }
  for (let i = 0; i < preferredLanguages.length; i += 1) {
    const preferred = preferredLanguages[i];
    if (baseLanguage(normalized) === baseLanguage(preferred)) return 1_000 + i;
  }
  return 10_000;
}

function trackKindScore(trackKind: string | null): number {
  switch (normalizeTrackKind(trackKind)) {
    case "standard":
      return 0;
    case "asr":
      return 1;
    case "forced":
      return 2;
    default:
      return 3;
  }
}

function normalizeTrackKind(trackKind: string | null): string {
  return trackKind?.trim().toLowerCase() ?? "";
}

function captionSourceClassForTrackKind(
  trackKind: string | null,
): TranscriptCaptionSourceClass {
  switch (normalizeTrackKind(trackKind)) {
    case "asr":
      return "asr";
    case "forced":
      return "forced";
    case "standard":
      return "standard";
    default:
      return "unknown";
  }
}

function provenanceForOfficialCaption(input: {
  allowed: AllowedTranscriptAcquisition;
  videoId: string;
  selectedTrack: OfficialYoutubeCaptionTrack;
  preferredLanguages: string[];
  includeAsr: boolean;
  normalizedCharCount: number;
  segmentCount: number;
}): Record<string, unknown> {
  return {
    adapter: OFFICIAL_CAPTIONS_ADAPTER_VERSION,
    api: "youtube-data-api-v3",
    policy_decision_id: input.allowed.policyDecisionId,
    videoId: input.videoId,
    canonicalUrl: canonicalYoutubeUrl(input.videoId),
    captionId: input.selectedTrack.id,
    language: input.selectedTrack.language,
    trackKind: input.selectedTrack.trackKind,
    name: input.selectedTrack.name,
    isAutoSynced: input.selectedTrack.isAutoSynced,
    isCC: input.selectedTrack.isCC,
    isDraft: input.selectedTrack.isDraft,
    status: input.selectedTrack.status,
    preferredLanguages: input.preferredLanguages,
    includeAsr: input.includeAsr,
    downloadFormat: "vtt",
    parserVersion: TRANSCRIPT_FILE_PARSER_VERSION,
    normalizedCharCount: input.normalizedCharCount,
    segmentCount: input.segmentCount,
    quotaCostEstimate: {
      captionsList: 50,
      captionsDownload: 200,
    },
    retention_class: input.allowed.retentionClass,
  };
}

function normalizeLanguageCode(languageCode: string | null | undefined): string | null {
  const cleaned = languageCode?.trim().toLowerCase() ?? "";
  if (!cleaned) return null;
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(cleaned) ? cleaned : null;
}

function baseLanguage(languageCode: string): string {
  return languageCode.split("-")[0] ?? languageCode;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function tokenCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
