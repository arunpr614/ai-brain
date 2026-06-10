import { canonicalYoutubeUrl, extractVideoId } from "./youtube-url";
import type { CapturePlatform } from "./types";

export interface PlatformDetection {
  platform: CapturePlatform;
  canonicalUrl: string;
  videoId?: string;
  sourceType: "url" | "youtube";
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "trk",
  "trackingId",
  "li_fat_id",
]);

export function detectCapturePlatform(rawUrl: string): PlatformDetection {
  const videoId = extractVideoId(rawUrl);
  if (videoId) {
    return {
      platform: isYoutubeShortUrl(rawUrl) ? "youtube_short" : "youtube",
      canonicalUrl: canonicalYoutubeUrl(videoId),
      videoId,
      sourceType: "youtube",
    };
  }

  const url = parseUrl(rawUrl);
  stripTrackingParams(url);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    return {
      platform: "linkedin",
      canonicalUrl: url.toString(),
      sourceType: "url",
    };
  }

  if (host === "substack.com" || host.endsWith(".substack.com")) {
    return {
      platform: "substack",
      canonicalUrl: url.toString(),
      sourceType: "url",
    };
  }

  return {
    platform: "generic_article",
    canonicalUrl: url.toString(),
    sourceType: "url",
  };
}

function isYoutubeShortUrl(rawUrl: string): boolean {
  try {
    return new URL(rawUrl).pathname.startsWith("/shorts/");
  } catch {
    return /youtube\.com\/shorts\//i.test(rawUrl);
  }
}

function parseUrl(rawUrl: string): URL {
  try {
    return new URL(rawUrl);
  } catch {
    return new URL(`https://${rawUrl}`);
  }
}

function stripTrackingParams(url: URL): void {
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key) || key.toLowerCase().startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  }
  url.hash = "";
}
