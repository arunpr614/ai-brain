/**
 * Pure YouTube URL helpers — no server dependencies.
 *
 * Extracted from src/lib/capture/youtube.ts so client-side code can
 * canonicalize variants without dragging the JSDOM / fetch / Innertube
 * machinery into the browser bundle. The full capture module re-exports
 * these for back-compat with server callers.
 *
 * Patterns must stay in sync between this file and youtube.ts; the
 * re-export below is the contract.
 */

/**
 * Recognized YouTube URL shapes. The capture group is the 11-char video
 * ID. Order doesn't matter — extractVideoId tries them all and returns
 * the first match.
 */
export const YOUTUBE_PATTERNS: ReadonlyArray<RegExp> = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch[^#]*[?&]v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&#/].*)?$/,
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:m\.)?youtube\.com\/watch[^#]*[?&]v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract the 11-char YouTube video ID from any of the known URL shapes.
 * Returns null for non-YouTube URLs OR near-miss shapes (channel,
 * playlist, bare `youtu.be/`) so the caller can fall through to the
 * article path.
 */
export function extractVideoId(url: string): string | null {
  for (const re of YOUTUBE_PATTERNS) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Normalize any recognized YouTube URL variant to the canonical watch?v= form. */
export function canonicalYoutubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
