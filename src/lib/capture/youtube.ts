/**
 * YouTube video capture — v0.5.1 T-YT-4+5.
 *
 * Drives InnerTube's `/youtubei/v1/player` POST directly (ANDROID client
 * context; see the fixtures README for the current pin) and parses
 * timedtext XML inline. Zero new dependencies — uses `jsdom` that was
 * already added in v0.2.0 for Readability.
 *
 * Contract: `extractYoutubeVideo(videoId, originalUrl)` returns a
 * `CapturedContent`-compatible object that `insertCaptured` accepts
 * directly. Errors are wrapped as `YoutubeCaptureError` with a typed
 * code; the route handler maps them to HTTP 422.
 *
 * Design notes:
 * - Body is pure timestamped transcript. Enrichment context (channel,
 *   duration) is injected via the composed title in the enrichment
 *   worker — see `src/lib/queue/enrichment-worker.ts`. Keeping body
 *   clean matters because it feeds the chunker + vector retriever.
 * - 7200-segment (~2 h) cap prevents giant transcripts from stressing
 *   the enrichment + embedding pipelines. Truncation warning is honest.
 * - XML shape is the current `<timedtext format="3">` with `<p t="ms"
 *   d="ms">` — NOT the legacy `<transcript><text start="s" dur="s">`.
 *   Captured 2026-05-11 from `jNQXAC9IVRw` fixture.
 */
import { JSDOM } from "jsdom";
import type { CapturedContent } from "./types";
import { CAPTURE_EXTRACTION_VERSION } from "./quality";
import { buildYoutubeBody } from "./youtube-body";
import { fetchYoutubeDataApiMetadata } from "./youtube-metadata";
import { canonicalYoutubeUrl } from "./youtube-url";
// Re-export the pure URL helpers so existing server-side callers
// (e.g. /api/capture/url) keep their import paths. New client-side
// callers should import from ./youtube-url directly to avoid pulling
// jsdom into the browser bundle.
export { canonicalYoutubeUrl, extractVideoId, YOUTUBE_PATTERNS } from "./youtube-url";

const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/player";
const INNERTUBE_CLIENT = {
  clientName: "ANDROID",
  clientVersion: "20.10.38",
  hl: "en",
  gl: "US",
} as const;

const MAX_SEGMENTS = 7_200; // ~2 h at 1 s/segment
const WINDOW_MS = 30_000;
const FETCH_TIMEOUT_MS = 15_000;
export const YOUTUBE_ANTIBOT_METADATA_WARNING = "youtube_antibot_metadata_only";
export const YOUTUBE_TRANSCRIPT_FETCH_METADATA_WARNING =
  "youtube_transcript_fetch_metadata_only";

export type YoutubeCaptureCode =
  | "no_captions"
  | "video_unavailable"
  | "live_stream"
  | "fetch_failed"
  | "invalid_url";

export class YoutubeCaptureError extends Error {
  code: YoutubeCaptureCode;
  constructor(code: YoutubeCaptureCode, message: string) {
    super(message);
    this.code = code;
    this.name = "YoutubeCaptureError";
  }
}

export interface YoutubeExtracted extends CapturedContent {
  author: string | null;
  duration_seconds: number | null;
}

export interface TranscriptSegment {
  /** Start offset in milliseconds. */
  offset: number;
  /** Duration in milliseconds. */
  duration: number;
  text: string;
}

/** Parse `<timedtext format="3"><body><p t="ms" d="ms">text</p>...</body></timedtext>`. */
export function parseTimedTextXml(xml: string): TranscriptSegment[] {
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const nodes = dom.window.document.querySelectorAll("p");
  const segments: TranscriptSegment[] = [];
  nodes.forEach((node) => {
    const tAttr = node.getAttribute("t");
    const dAttr = node.getAttribute("d");
    if (tAttr === null) return;
    const offset = parseInt(tAttr, 10);
    const duration = dAttr !== null ? parseInt(dAttr, 10) : 0;
    if (!Number.isFinite(offset)) return;
    // textContent collapses <p>line<br/>more</p> newlines — we want them preserved.
    // Walk children; join text nodes with spaces; <br> becomes \n; rely on textContent
    // for HTML-entity decoding (&#39; → ').
    const raw = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (raw.length === 0) return;
    segments.push({ offset, duration, text: raw });
  });
  return segments;
}

export function formatTranscriptBody(segments: TranscriptSegment[]): string {
  let windowStart = 0;
  const paragraphs: string[] = [];
  let lines: string[] = [];
  for (const seg of segments) {
    if (seg.offset - windowStart > WINDOW_MS && lines.length > 0) {
      paragraphs.push(lines.join("\n"));
      lines = [];
      windowStart = seg.offset;
    }
    lines.push(`[${msToTimestamp(seg.offset)}] ${seg.text}`);
  }
  if (lines.length > 0) paragraphs.push(lines.join("\n"));
  return paragraphs.join("\n\n");
}

export function msToTimestamp(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchInnerTubePlayer(videoId: string): Promise<unknown> {
  const body = {
    videoId,
    context: { client: INNERTUBE_CLIENT },
  };
  let res: Response;
  try {
    res = await fetchWithTimeout(
      INNERTUBE_URL,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      FETCH_TIMEOUT_MS,
    );
  } catch (err) {
    throw new YoutubeCaptureError(
      "fetch_failed",
      `InnerTube fetch failed: ${(err as Error).message}`,
    );
  }
  if (!res.ok) {
    throw new YoutubeCaptureError(
      "fetch_failed",
      `InnerTube returned ${res.status}`,
    );
  }
  try {
    return (await res.json()) as unknown;
  } catch (err) {
    throw new YoutubeCaptureError(
      "fetch_failed",
      `InnerTube JSON parse failed: ${(err as Error).message}`,
    );
  }
}

interface InnerTubeVideoDetails {
  title?: string;
  author?: string;
  lengthSeconds?: string;
  isLive?: boolean;
  isLiveContent?: boolean;
}
interface InnerTubeCaptionTrack {
  baseUrl?: string;
}
interface InnerTubePlayer {
  playabilityStatus?: {
    status?: string;
    reason?: string;
    messages?: string[];
  };
  videoDetails?: InnerTubeVideoDetails;
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: InnerTubeCaptionTrack[];
    };
  };
}

interface YoutubeOEmbedResponse {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

/**
 * Main entrypoint. Throws `YoutubeCaptureError` on unrecoverable failures
 * (route handler maps to 422). Returns a populated `YoutubeExtracted` on
 * success — including the `no_captions` case where the item is still
 * saved with a placeholder body and an `extraction_warning`.
 */
export async function extractYoutubeVideo(
  videoId: string,
  originalUrl: string,
): Promise<YoutubeExtracted> {
  const player = (await fetchInnerTubePlayer(videoId)) as InnerTubePlayer;
  const sourcePlatform = isShortUrl(originalUrl) ? "youtube_short" : "youtube";

  if (!player.videoDetails) {
    if (isYoutubeAntiBotChallenge(player)) {
      const fallback = await fetchYoutubeOEmbed(videoId);
      if (fallback) {
        return antiBotMetadataOnlyResult(videoId, fallback, sourcePlatform);
      }
      throw new YoutubeCaptureError(
        "video_unavailable",
        "YouTube blocked transcript extraction with a sign-in challenge, and metadata fallback failed.",
      );
    }

    const reason = playabilityReason(player);
    throw new YoutubeCaptureError(
      "video_unavailable",
      reason
        ? `Video is unavailable: ${reason}`
        : "Video is private, deleted, or unavailable.",
    );
  }

  const dataApi = await fetchYoutubeDataApiMetadata(videoId);
  const title = dataApi?.title ??
    (typeof player.videoDetails.title === "string" && player.videoDetails.title
      ? player.videoDetails.title
      : videoId);
  const author = dataApi?.channelTitle ??
    (typeof player.videoDetails.author === "string" && player.videoDetails.author
      ? player.videoDetails.author
      : null);
  const duration_seconds =
    dataApi?.durationSeconds ?? parseDurationSeconds(player.videoDetails.lengthSeconds);
  const description = dataApi?.description ?? null;
  const published_at = dataApi?.publishedAt ? Date.parse(dataApi.publishedAt) : null;
  const thumbnail_url = dataApi?.thumbnailUrl ?? null;

  const canonicalUrl = canonicalYoutubeUrl(videoId);
  const dataApiArtifact = dataApi
    ? [{
        kind: "youtube_data_api_json",
        content_type: "application/json",
        suggested_filename: "youtube-data-api.json",
        body: JSON.stringify(dataApi.raw, null, 2),
      }]
    : [];

  // Live-stream detection: isLive true OR isLiveContent true with no caption
  // tracks (post-stream VODs eventually get captions; active streams don't).
  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (player.videoDetails.isLive === true && tracks.length === 0) {
    throw new YoutubeCaptureError(
      "live_stream",
      "Live stream — transcript not available yet. Try again after the stream ends.",
    );
  }

  if (tracks.length === 0) {
    return noTranscriptResult({
      title,
      author,
      duration_seconds,
      source_url: canonicalUrl,
      source_platform: sourcePlatform,
      description,
      published_at: Number.isFinite(published_at) ? published_at : null,
      thumbnail_url,
      artifacts: dataApiArtifact,
    });
  }

  const baseUrl = tracks[0]?.baseUrl;
  if (!baseUrl) {
    return noTranscriptResult({
      title,
      author,
      duration_seconds,
      source_url: canonicalUrl,
      source_platform: sourcePlatform,
      description,
      published_at: Number.isFinite(published_at) ? published_at : null,
      thumbnail_url,
      artifacts: dataApiArtifact,
    });
  }

  let xmlRes: Response;
  try {
    xmlRes = await fetchWithTimeout(baseUrl, {}, FETCH_TIMEOUT_MS);
  } catch (err) {
    return transcriptFetchMetadataOnlyResult({
      title,
      author,
      duration_seconds,
      source_url: canonicalUrl,
      source_platform: sourcePlatform,
      description,
      published_at: Number.isFinite(published_at) ? published_at : null,
      thumbnail_url,
      artifacts: dataApiArtifact,
      reason: `Timed-text fetch failed: ${(err as Error).message}`,
    });
  }
  if (!xmlRes.ok) {
    return transcriptFetchMetadataOnlyResult({
      title,
      author,
      duration_seconds,
      source_url: canonicalUrl,
      source_platform: sourcePlatform,
      description,
      published_at: Number.isFinite(published_at) ? published_at : null,
      thumbnail_url,
      artifacts: dataApiArtifact,
      reason: `Timed-text returned ${xmlRes.status}`,
    });
  }
  const xml = await xmlRes.text();

  const allSegments = parseTimedTextXml(xml);
  if (allSegments.length === 0) {
    return noTranscriptResult({
      title,
      author,
      duration_seconds,
      source_url: canonicalUrl,
      source_platform: sourcePlatform,
      description,
      published_at: Number.isFinite(published_at) ? published_at : null,
      thumbnail_url,
      artifacts: dataApiArtifact,
    });
  }

  const truncated = allSegments.length > MAX_SEGMENTS;
  const segments = truncated ? allSegments.slice(0, MAX_SEGMENTS) : allSegments;
  const transcript = formatTranscriptBody(segments);
  const body = buildYoutubeBody({
    title,
    channel: author,
    publishedAt: Number.isFinite(published_at) ? published_at : null,
    durationSeconds: duration_seconds,
    sourceUrl: canonicalUrl,
    description,
    transcript,
    captureQuality: "metadata_plus_transcript",
  });

  return {
    title,
    author,
    duration_seconds,
    source_url: canonicalUrl,
    body,
    extraction_warning: truncated ? "transcript_truncated_2h" : null,
    source_platform: sourcePlatform,
    capture_quality: "metadata_plus_transcript",
    extraction_method: "youtube_innertube_timedtext",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: Number.isFinite(published_at) ? published_at : null,
    thumbnail_url,
    description,
    artifacts: [
      ...dataApiArtifact,
      {
        kind: "youtube_timedtext_xml",
        content_type: "application/xml",
        suggested_filename: "youtube-timedtext.xml",
        body: xml,
      },
    ],
  };
}

function parseDurationSeconds(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function playabilityReason(player: InnerTubePlayer): string | null {
  const reason = player.playabilityStatus?.reason?.trim();
  if (reason) return reason;
  const messages = player.playabilityStatus?.messages
    ?.map((message) => message.trim())
    .filter(Boolean);
  return messages && messages.length > 0 ? messages.join(" ") : null;
}

function isYoutubeAntiBotChallenge(player: InnerTubePlayer): boolean {
  if (player.playabilityStatus?.status !== "LOGIN_REQUIRED") return false;
  const reason = playabilityReason(player)?.toLowerCase() ?? "";
  return reason.includes("not a bot") || reason.includes("sign in to confirm");
}

function youtubeOEmbedUrl(videoId: string): string {
  const url = new URL("https://www.youtube.com/oembed");
  url.searchParams.set("format", "json");
  url.searchParams.set("url", canonicalYoutubeUrl(videoId));
  return url.toString();
}

async function fetchYoutubeOEmbed(
  videoId: string,
): Promise<YoutubeOEmbedResponse | null> {
  let res: Response;
  try {
    res = await fetchWithTimeout(youtubeOEmbedUrl(videoId), {}, FETCH_TIMEOUT_MS);
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let parsed: unknown;
  try {
    parsed = (await res.json()) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as YoutubeOEmbedResponse;
  return typeof candidate.title === "string" && candidate.title.trim()
    ? candidate
    : null;
}

function noTranscriptResult(input: {
  title: string,
  author: string | null,
  duration_seconds: number | null,
  source_url: string,
  source_platform: "youtube" | "youtube_short",
  description: string | null,
  published_at: number | null,
  thumbnail_url: string | null,
  artifacts?: YoutubeExtracted["artifacts"],
}): YoutubeExtracted {
  return {
    title: input.title,
    author: input.author,
    duration_seconds: input.duration_seconds,
    source_url: input.source_url,
    body: buildYoutubeBody({
      title: input.title,
      channel: input.author,
      publishedAt: input.published_at,
      durationSeconds: input.duration_seconds,
      sourceUrl: input.source_url,
      description: input.description,
      transcript: null,
      captureQuality: "metadata_only",
    }),
    extraction_warning: "no_transcript",
    source_platform: input.source_platform,
    capture_quality: "metadata_only",
    extraction_method: "youtube_innertube_timedtext",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: input.published_at,
    thumbnail_url: input.thumbnail_url,
    description: input.description,
    artifacts: input.artifacts,
  };
}

function transcriptFetchMetadataOnlyResult(input: {
  title: string,
  author: string | null,
  duration_seconds: number | null,
  source_url: string,
  source_platform: "youtube" | "youtube_short",
  description: string | null,
  published_at: number | null,
  thumbnail_url: string | null,
  artifacts?: YoutubeExtracted["artifacts"],
  reason: string,
}): YoutubeExtracted {
  return {
    title: input.title,
    author: input.author,
    duration_seconds: input.duration_seconds,
    source_url: input.source_url,
    body: buildYoutubeBody({
      title: input.title,
      channel: input.author,
      publishedAt: input.published_at,
      durationSeconds: input.duration_seconds,
      sourceUrl: input.source_url,
      description: input.description,
      transcript: `[Transcript unavailable: ${input.reason}]`,
      captureQuality: "metadata_only",
    }),
    extraction_warning: YOUTUBE_TRANSCRIPT_FETCH_METADATA_WARNING,
    source_platform: input.source_platform,
    capture_quality: "metadata_only",
    extraction_method: "youtube_innertube_timedtext",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: input.published_at,
    thumbnail_url: input.thumbnail_url,
    description: input.description,
    artifacts: input.artifacts,
  };
}

function antiBotMetadataOnlyResult(
  videoId: string,
  oembed: YoutubeOEmbedResponse,
  source_platform: "youtube" | "youtube_short",
): YoutubeExtracted {
  const title = oembed.title?.trim() || videoId;
  const author = oembed.author_name?.trim() || null;
  const sourceUrl = canonicalYoutubeUrl(videoId);
  return {
    title,
    author,
    duration_seconds: null,
    source_url: sourceUrl,
    body: buildYoutubeBody({
      title,
      channel: author,
      publishedAt: null,
      durationSeconds: null,
      sourceUrl,
      description: null,
      transcript:
        "[Transcript unavailable: YouTube blocked AI Memory's server transcript request with an anti-bot sign-in check.]",
      captureQuality: "metadata_only",
    }),
    extraction_warning: YOUTUBE_ANTIBOT_METADATA_WARNING,
    source_platform,
    capture_quality: "metadata_only",
    extraction_method: "youtube_oembed_metadata",
    extraction_version: CAPTURE_EXTRACTION_VERSION,
    published_at: null,
    thumbnail_url: oembed.thumbnail_url?.trim() || null,
    description: null,
    artifacts: [
      {
        kind: "youtube_oembed_json",
        content_type: "application/json",
        suggested_filename: "youtube-oembed.json",
        body: JSON.stringify(oembed, null, 2),
      },
    ],
  };
}

function isShortUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/shorts/");
  } catch {
    return /youtube\.com\/shorts\//i.test(url);
  }
}
