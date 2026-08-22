"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookOpen, Quote, Sparkles, X } from "lucide-react";
import { platformLabel, qualityLabel } from "@/lib/capture/quality";
import { YouTubeIcon } from "@/components/youtube-icon";

export interface CitationPreviewData {
  chunkId: string;
  itemId: string;
  itemTitle: string;
  excerpt?: string;
  sourcePlatform?: string | null;
  sourceType?: string | null;
  captureQuality?: string | null;
  sourceKind?: "legacy_item_context" | "original_content" | "ai_summary" | "manual_note";
  similarity?: number;
  timestampMs?: number;
}

export interface CitationPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: CitationPreviewData | null;
}

export function CitationPreviewDrawer({
  isOpen,
  onClose,
  citation,
}: CitationPreviewDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !citation) return null;

  const platform = platformLabel(citation.sourcePlatform, citation.sourceType ?? undefined);
  const quality = qualityLabel(citation.captureQuality);
  const isYouTube = citation.sourcePlatform === "youtube" || citation.sourceType === "youtube";

  const sourceKindLabel =
    citation.sourceKind === "manual_note"
      ? "Personal Note"
      : citation.sourceKind === "ai_summary"
        ? "AI Executive Brief"
        : citation.sourceKind === "original_content"
          ? "Original Source Text"
          : "Retrieved Ground Truth";

  const jumpHref =
    citation.sourceKind === "manual_note"
      ? `/items/${citation.itemId}?tab=notes`
      : citation.timestampMs && citation.timestampMs > 0
        ? `/items/${citation.itemId}/read?t=${Math.floor(citation.timestampMs / 1000)}`
        : `/items/${citation.itemId}/read?highlight=${encodeURIComponent(citation.chunkId)}#chunk-${encodeURIComponent(citation.chunkId)}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Citation Preview"
        className="relative z-10 w-full rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl pb-[max(env(safe-area-inset-bottom),1.25rem)] animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
      >
        {/* Touch Handle */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--line-strong)] opacity-60" />

        {/* Top Bar with Title & Close */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent-11)] border border-[var(--border)]">
                <Sparkles className="h-3 w-3" />
                <span>{sourceKindLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)]">
                {isYouTube ? <YouTubeIcon className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                <span>{platform}</span>
              </span>
              {quality && (
                <span className="rounded-md bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)] border border-[var(--border)]">
                  {quality}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)] line-clamp-2">
              {citation.itemTitle || "Untitled Source"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close citation preview"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Passage / Excerpt Content */}
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-3.5 text-xs text-[var(--text-primary)] leading-relaxed space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <Quote className="h-3.5 w-3.5" />
            <span>Retrieved Passage</span>
          </div>
          <p className="whitespace-pre-line font-serif text-[13.5px] leading-relaxed text-[var(--text-primary)]">
            {citation.excerpt || "Cited ground-truth excerpt indexed from document body."}
          </p>
          {typeof citation.similarity === "number" && (
            <div className="text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
              Relevance Similarity: {(citation.similarity * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Action Button: Jump to Passage in Reader */}
        <div className="flex flex-col gap-2">
          <Link
            href={jumpHref}
            onClick={onClose}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--action-primary-bg)] font-semibold text-sm text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)]"
          >
            <BookOpen className="h-4 w-4" />
            <span>Jump to Passage in Reader</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
