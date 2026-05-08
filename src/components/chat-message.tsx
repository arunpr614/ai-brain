"use client";

/**
 * Chat message renderer (T-11 skeleton; T-12 upgrades citations → chips).
 *
 * For T-11 the assistant body is rendered verbatim including any `[CITE:id]`
 * markers. T-12 replaces the raw-text path with a parser that slices out
 * markers and renders clickable chips linking to `/items/<item_id>`.
 */
import type { AskRetrievedChunk } from "@/lib/client/use-ask-stream";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  chunks?: AskRetrievedChunk[];
}

export function ChatMessage({ role, content, chunks }: ChatMessageProps) {
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
        {isUser ? "You" : "Brain"}
      </div>
      <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
        {content || (isUser ? "" : <span className="text-[var(--text-muted)]">…</span>)}
      </div>
      {!isUser && chunks && chunks.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-2">
          <div className="mb-1 text-[11px] text-[var(--text-muted)]">
            Retrieved from {chunks.length} chunk{chunks.length === 1 ? "" : "s"}
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {chunks.slice(0, 6).map((c) => (
              <li
                key={c.chunk_id}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                title={`similarity ${c.similarity.toFixed(3)}`}
              >
                {c.item_title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
