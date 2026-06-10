/**
 * Shared capture content contract — v0.5.1 T-YT-4+5.
 *
 * Both `extractArticleFromUrl` (URL/article) and `extractYoutubeVideo`
 * return this shape so the route handler in `/api/capture/url` never
 * needs to narrow a union type. `insertCaptured` accepts the same fields
 * directly.
 *
 * `ExtractedArticle` in `url.ts` is structurally a superset (it has
 * `excerpt` and `html_length` on top of these required fields). That's
 * fine — the route + insert path only reads the fields declared here.
 */
export type CapturePlatform =
  | "youtube"
  | "youtube_short"
  | "substack"
  | "linkedin"
  | "generic_article"
  | "pdf"
  | "note";

export type CaptureQuality =
  | "full_text"
  | "transcript"
  | "metadata_plus_transcript"
  | "metadata_only"
  | "paywall_preview"
  | "user_provided_full_text"
  | "client_dom"
  | "email_body"
  | "failed";

export interface CaptureArtifactCandidate {
  kind: string;
  content_type: string;
  body: string | Uint8Array;
  suggested_filename: string;
}

export interface CapturedContent {
  title: string;
  body: string;
  author: string | null;
  source_url: string;
  extraction_warning: string | null;
  /** Present for YouTube items; absent for articles. Null allowed for videos
   *  whose duration wasn't in the InnerTube response. */
  duration_seconds?: number | null;
  source_platform?: CapturePlatform | null;
  capture_quality?: CaptureQuality | null;
  extraction_method?: string | null;
  extraction_version?: string | null;
  published_at?: number | null;
  thumbnail_url?: string | null;
  description?: string | null;
  artifacts?: CaptureArtifactCandidate[];
}
