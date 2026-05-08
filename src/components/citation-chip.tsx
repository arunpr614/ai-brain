"use client";

import Link from "next/link";
import type { AskRetrievedChunk } from "@/lib/client/use-ask-stream";

interface CitationChipProps {
  chunk_id: string;
  chunks: AskRetrievedChunk[];
}

/**
 * Inline chip rendered in place of `[CITE:<chunk_id>]`. Links to the item
 * detail page with a `?highlight=<chunk_id>` query + `#chunk-<chunk_id>`
 * fragment — the item page reads both to render + scroll to the chunk.
 *
 * Shows a numeric index (position in the retrieved list) as the visible
 * label; full title on hover via `title` attr. Unknown chunk_ids (shouldn't
 * occur — filterCitations dropped them server-side) render as a muted
 * chip with a `?` label so the user sees there was a citation intent.
 */
export function CitationChip({ chunk_id, chunks }: CitationChipProps) {
  const idx = chunks.findIndex((c) => c.chunk_id === chunk_id);
  const chunk = idx >= 0 ? chunks[idx] : null;
  const label = idx >= 0 ? String(idx + 1) : "?";

  if (!chunk) {
    return (
      <span
        className="mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 text-[10px] text-[var(--text-muted)] align-middle"
        title="Citation not in retrieved chunks"
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={`/items/${chunk.item_id}?highlight=${encodeURIComponent(chunk_id)}#chunk-${encodeURIComponent(chunk_id)}`}
      className="mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[var(--accent-9)] bg-[var(--accent-3)] px-1.5 text-[10px] font-medium text-[var(--accent-11)] no-underline align-middle hover:bg-[var(--accent-3)] hover:border-[var(--accent-10)]"
      title={chunk.item_title}
    >
      {label}
    </Link>
  );
}
