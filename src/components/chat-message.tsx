"use client";

/**
 * Chat message renderer with T-12 citation chips.
 *
 * Assistant text passes through parseCitations(); `[CITE:id]` markers
 * render as <CitationChip> linking to `/items/<item_id>?highlight=...#chunk-...`.
 * User text renders verbatim (no markers expected).
 */
import { Fragment } from "react";
import type { AskRetrievedChunk } from "@/lib/client/use-ask-stream";
import { parseCitations } from "@/lib/ask/parse-citations";
import {
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { CitationChip } from "./citation-chip";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  chunks?: AskRetrievedChunk[];
  onSelectCitation?: (chunk: AskRetrievedChunk) => void;
}

export function ChatMessage({ role, content, chunks, onSelectCitation }: ChatMessageProps) {
  const isUser = role === "user";
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        isUser
          ? "ml-10 border-[var(--border)] bg-[var(--surface-raised)]"
          : "mr-10 border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {isUser ? "You" : "AI Memory"}
      </div>
      <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
        {content ? (
          isUser ? (
            content
          ) : (
            parseCitations(content).map((seg, i) =>
              seg.type === "text" ? (
                <Fragment key={i}>{seg.text}</Fragment>
              ) : (
                <CitationChip
                  key={i}
                  chunk_id={seg.chunk_id}
                  chunks={chunks ?? []}
                  onSelectCitation={onSelectCitation}
                />
              ),
            )
          )
        ) : isUser ? (
          ""
        ) : (
          <span className="text-[var(--text-muted)]">…</span>
        )}
      </div>
      {!isUser && chunks && chunks.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-2">
          <div className="mb-1 text-[11px] text-[var(--text-muted)]">
            Retrieved from {chunks.length} chunk{chunks.length === 1 ? "" : "s"}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {chunks.slice(0, 6).map((c, i) => (
              <RetrievedSourceChip
                key={c.chunk_id}
                chunk={c}
                index={i}
                onSelect={onSelectCitation}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RetrievedSourceChip({
  chunk,
  index,
  onSelect,
}: {
  chunk: AskRetrievedChunk;
  index: number;
  onSelect?: (chunk: AskRetrievedChunk) => void;
}) {
  const platform = platformLabel(chunk.item_source_platform, chunk.item_source_type);
  const quality = qualityLabel(chunk.item_capture_quality);
  const reason = needsUpgradeReason({
    source_platform: chunk.item_source_platform,
    capture_quality: chunk.item_capture_quality,
    extraction_warning: chunk.item_extraction_warning,
  });
  const sourceLabel =
    chunk.source_kind === "manual_note"
      ? "Your note"
      : chunk.source_kind === "ai_summary"
        ? "AI digest"
        : chunk.source_kind === "original_content"
          ? "Original source"
          : "Saved item context";

  const content = (
    <>
      <span className="mr-1 font-mono text-[var(--text-muted)]">{index + 1}.</span>
      <span>{chunk.item_title}</span>
      <span className="mx-1 text-[var(--text-muted)]">·</span>
      <span>{sourceLabel}</span>
      <span className="mx-1 text-[var(--text-muted)]">·</span>
      <span>{platform}</span>
    </>
  );

  const className = `max-w-full rounded-full border bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] transition-colors ${
    reason
      ? "border-[var(--quality-needs-upgrade)] text-[var(--quality-needs-upgrade)]"
      : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
  }`;
  const title = `${sourceLabel} · ${platform} · ${quality} · similarity ${chunk.similarity.toFixed(3)}`;

  if (onSelect) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(chunk)}
          className={`${className} cursor-pointer text-left active:scale-95`}
          title={title}
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className={className} title={title}>
      {content}
    </li>
  );
}
