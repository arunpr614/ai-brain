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
  videoDetails?: InnerTubeVideoDetails;
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: InnerTubeCaptionTrack[];
    };
  };
}

/**
 * Main entrypoint. Throws `YoutubeCaptureError` on unrecoverable failures
 * (route handler maps to 422). Returns a populated `YoutubeExtracted` on
 * success — including the `no_captions` case where the item is still
 * saved with a placeholder body and an `extraction_warning`.
 */
export async function extractYoutubeVideo(
  videoId: string,
  _originalUrl: string,
): Promise<YoutubeExtracted> {
  const player = (await fetchInnerTubePlayer(videoId)) as InnerTubePlayer;

  if (!player.videoDetails) {
    throw new YoutubeCaptureError(
      "video_unavailable",
      "Video is private, deleted, or unavailable.",
    );
  }

  const title =
    typeof player.videoDetails.title === "string" && player.videoDetails.title
      ? player.videoDetails.title
      : videoId;
  const author =
    typeof player.videoDetails.author === "string" && player.videoDetails.author
      ? player.videoDetails.author
      : null;
  const duration_seconds = parseDurationSeconds(
    player.videoDetails.lengthSeconds,
  );

  const canonicalUrl = canonicalYoutubeUrl(videoId);

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
    return noTranscriptResult(title, author, duration_seconds, canonicalUrl);
  }

  const baseUrl = tracks[0]?.baseUrl;
  if (!baseUrl) {
    return noTranscriptResult(title, author, duration_seconds, canonicalUrl);
  }

  let xmlRes: Response;
  try {
    xmlRes = await fetchWithTimeout(baseUrl, {}, FETCH_TIMEOUT_MS);
  } catch (err) {
    throw new YoutubeCaptureError(
      "fetch_failed",
      `Timed-text fetch failed: ${(err as Error).message}`,
    );
  }
  if (!xmlRes.ok) {
    throw new YoutubeCaptureError(
      "fetch_failed",
      `Timed-text returned ${xmlRes.status}`,
    );
  }
  const xml = await xmlRes.text();

  const allSegments = parseTimedTextXml(xml);
  if (allSegments.length === 0) {
    return noTranscriptResult(title, author, duration_seconds, canonicalUrl);
  }

  const truncated = allSegments.length > MAX_SEGMENTS;
  const segments = truncated ? allSegments.slice(0, MAX_SEGMENTS) : allSegments;
  const body = formatTranscriptBody(segments);

  return {
    title,
    author,
    duration_seconds,
    source_url: canonicalUrl,
    body,
    extraction_warning: truncated ? "transcript_truncated_2h" : null,
  };
}

function parseDurationSeconds(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function noTranscriptResult(
  title: string,
  author: string | null,
  duration_seconds: number | null,
  source_url: string,
): YoutubeExtracted {
  return {
    title,
    author,
    duration_seconds,
    source_url,
    body: "[No transcript available for this video]",
    extraction_warning: "no_transcript",
  };
}
