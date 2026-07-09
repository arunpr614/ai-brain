export type RecallContentFidelity =
  | "complete_enough_for_daily_import"
  | "api_chunks_unverified"
  | "possibly_truncated"
  | "metadata_only"
  | "blocked_unknown";

export interface RecallCardChunk {
  id?: string | null;
  chunk_id?: string | null;
  idx?: number | null;
  index?: number | null;
  order?: number | null;
  content?: string | null;
  text?: string | null;
  body?: string | null;
  markdown?: string | null;
  source?: string | null;
  metadata?: unknown;
}

export interface RecallCardDetail {
  id: string;
  title?: string | null;
  created_at?: string | null;
  source_url?: string | null;
  image?: string | null;
  chunks?: RecallCardChunk[] | null;
}
