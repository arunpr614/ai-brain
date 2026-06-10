import {
  getCaptureMetadataCache,
  upsertCaptureMetadataCache,
} from "@/db/metadata-cache";

export interface YoutubeDataApiMetadata {
  title: string | null;
  channelTitle: string | null;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  raw: unknown;
}

const CACHE_PLATFORM = "youtube_data_api";
const DEFAULT_TIMEOUT_MS = 3_000;
const DEFAULT_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function fetchYoutubeDataApiMetadata(
  videoId: string,
): Promise<YoutubeDataApiMetadata | null> {
  const key = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!key) return null;

  const cacheKey = `video:${videoId}`;
  const cached = getCaptureMetadataCache(CACHE_PLATFORM, cacheKey);
  if (cached) {
    try {
      const parsed = parseCachedMetadata(cached.payload_json);
      if (parsed) return parsed;
    } catch {
      // Fall through to a fresh fetch if the cache row is malformed.
    }
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,status,statistics");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", key);

  let response: Response;
  try {
    response = await fetchWithTimeout(url.toString(), youtubeDataApiTimeoutMs());
  } catch {
    return null;
  }
  if (!response.ok) return null;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return null;
  }

  const item = firstItem(payload);
  if (!item) return null;
  const snippet = objectValue(item.snippet);
  const contentDetails = objectValue(item.contentDetails);
  const thumbnails = objectValue(snippet?.thumbnails);

  const metadata = {
    title: stringValue(snippet?.title),
    channelTitle: stringValue(snippet?.channelTitle),
    description: stringValue(snippet?.description),
    publishedAt: stringValue(snippet?.publishedAt),
    durationSeconds: parseIso8601Duration(stringValue(contentDetails?.duration)),
    thumbnailUrl: bestThumbnail(thumbnails),
    raw: payload,
  };
  try {
    upsertCaptureMetadataCache({
      platform: CACHE_PLATFORM,
      cache_key: cacheKey,
      payload_json: JSON.stringify(metadata),
      expires_at: Date.now() + youtubeDataApiCacheTtlMs(),
    });
  } catch {
    // Cache failures should never block capture.
  }
  return metadata;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function youtubeDataApiTimeoutMs(): number {
  const raw = Number(process.env.YOUTUBE_DATA_API_TIMEOUT_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TIMEOUT_MS;
}

function youtubeDataApiCacheTtlMs(): number {
  const raw = Number(process.env.YOUTUBE_DATA_API_CACHE_TTL_MS ?? "");
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CACHE_TTL_MS;
}

function parseCachedMetadata(payloadJson: string): YoutubeDataApiMetadata | null {
  const parsed = JSON.parse(payloadJson) as Partial<YoutubeDataApiMetadata>;
  if (!parsed || typeof parsed !== "object") return null;
  return {
    title: typeof parsed.title === "string" ? parsed.title : null,
    channelTitle: typeof parsed.channelTitle === "string" ? parsed.channelTitle : null,
    description: typeof parsed.description === "string" ? parsed.description : null,
    publishedAt: typeof parsed.publishedAt === "string" ? parsed.publishedAt : null,
    durationSeconds:
      typeof parsed.durationSeconds === "number" && Number.isFinite(parsed.durationSeconds)
        ? parsed.durationSeconds
        : null,
    thumbnailUrl: typeof parsed.thumbnailUrl === "string" ? parsed.thumbnailUrl : null,
    raw: parsed.raw ?? null,
  };
}

function firstItem(payload: unknown): Record<string, unknown> | null {
  const root = objectValue(payload);
  const items = root && Array.isArray(root.items) ? root.items : [];
  const first = items[0];
  return objectValue(first);
}

function bestThumbnail(thumbnails: Record<string, unknown> | null): string | null {
  if (!thumbnails) return null;
  for (const key of ["maxres", "standard", "high", "medium", "default"]) {
    const thumb = objectValue(thumbnails[key]);
    const url = stringValue(thumb?.url);
    if (url) return url;
  }
  return null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseIso8601Duration(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
