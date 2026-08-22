"use client";

import Link from "next/link";
import type { AskRetrievedChunk } from "@/lib/client/use-ask-stream";
import { platformLabel, qualityLabel } from "@/lib/capture/quality";

interface CitationChipProps {
  chunk_id: string;
  chunks: AskRetrievedChunk[];
  onSelectCitation?: (chunk: AskRetrievedChunk) => void;
}

/**
 * Inline chip rendered in place of `[CITE:<chunk_id>]`. Links to the item
 * detail page with a `?highlight=<chunk_id>` query + `#chunk-<chunk_id>`
 * fragment — the item page reads both to render + scroll to the chunk.
 * If onSelectCitation is provided (e.g. mobile drawer mode), clicking opens the drawer.
 */
export function CitationChip({ chunk_id, chunks, onSelectCitation }: CitationChipProps) {
  const idx = chunks.findIndex((c) => c.chunk_id === chunk_id);
  const chunk = idx >= 0 ? chunks[idx] : null;
  const label = idx >= 0 ? String(idx + 1) : "?";
  const sourceLabel =
    chunk?.source_kind === "manual_note"
      ? "Your note"
      : chunk?.source_kind === "ai_summary"
        ? "AI digest"
        : chunk?.source_kind === "original_content"
          ? "Original source"
          : "Saved item context";

  if (!chunk) {
    return (
      <span
        className="mx-0.5 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 text-[10px] text-[var(--text-muted)] align-middle"
        title="Citation not in retrieved chunks"
      >
        {label}
      </span>
    );
  }

  if (onSelectCitation) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onSelectCitation(chunk);
        }}
        className="mx-0.5 inline-flex h-[20px] min-w-[20px] cursor-pointer items-center justify-center rounded-full border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] px-1.5 text-[10px] font-medium text-[var(--control-selected-fg)] align-middle hover:border-[var(--action-primary-focus)] active:scale-95 transition-transform"
        title={`${sourceLabel} · ${chunk.item_title} · ${platformLabel(chunk.item_source_platform, chunk.item_source_type)} · ${qualityLabel(chunk.item_capture_quality)}`}
      >
        {label}
      </button>
    );
  }

  return (
    <Link
      href={
        chunk.source_kind === "manual_note"
          ? `/items/${chunk.item_id}?tab=notes`
          : `/items/${chunk.item_id}?highlight=${encodeURIComponent(chunk_id)}#chunk-${encodeURIComponent(chunk_id)}`
      }
      className="mx-0.5 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] px-1.5 text-[10px] font-medium text-[var(--control-selected-fg)] no-underline align-middle hover:border-[var(--action-primary-focus)]"
      title={`${sourceLabel} · ${chunk.item_title} · ${platformLabel(chunk.item_source_platform, chunk.item_source_type)} · ${qualityLabel(chunk.item_capture_quality)}`}
    >
      {label}
    </Link>
  );
}
