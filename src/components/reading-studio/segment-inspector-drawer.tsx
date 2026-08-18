"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Check, Copy, ExternalLink, Search, X, Clock, Layers } from "lucide-react";
import type { TranscriptSegmentRow } from "@/db/transcripts";
import { formatTimestamp } from "./transcript-timeline";

export interface SegmentInspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle?: string;
  segments: TranscriptSegmentRow[];
  onSeek?: (timestampMs: number) => void;
}

export function SegmentInspectorDrawer({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  segments,
  onSeek,
}: SegmentInspectorDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Close on Escape key
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

  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(q) ||
        formatTimestamp(s.start_ms).toLowerCase().includes(q),
    );
  }, [segments, searchQuery]);

  const handleCopySegment = useCallback((seg: TranscriptSegmentRow) => {
    const text = `[${formatTimestamp(seg.start_ms)}] "${seg.text}"`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(seg.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="segment-inspector-title"
    >
      {/* Backdrop click dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-over Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface-raised)] shadow-2xl animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4 bg-[var(--surface)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="rounded-lg bg-emerald-950/40 p-2 text-emerald-400 border border-emerald-800/40 shrink-0">
              <Layers className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 id="segment-inspector-title" className="text-sm font-semibold text-[var(--text-primary)] truncate">
                Transcript Segments Inspector
              </h2>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {itemTitle || itemId} • {segments.length} total segments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close segment inspector"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--control-hover-bg)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filter Search Input */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-base)]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript segments or timestamps (e.g. 03:15)..."
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-9)] focus:outline-none"
            />
          </div>
        </div>

        {/* Segments List Stream */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-[var(--border)] space-y-3">
          {filteredSegments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No matching segments found for &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredSegments.map((seg, idx) => (
              <div
                key={seg.id || idx}
                className="pt-3 first:pt-0 group flex flex-col gap-1.5 text-xs hover:bg-[var(--surface)]/50 p-2 rounded-lg transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-800/30">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(seg.start_ms)}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleCopySegment(seg)}
                      aria-label="Copy segment"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--control-hover-bg)] hover:text-[var(--text-primary)]"
                    >
                      {copiedId === seg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onSeek && (
                      <button
                        type="button"
                        onClick={() => {
                          onSeek(seg.start_ms ?? 0);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 hover:bg-indigo-950/30"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Seek</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[var(--text-primary)] leading-relaxed">{seg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--surface)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Showing {filteredSegments.length} of {segments.length} segments</span>
          <span className="font-mono text-[10px]">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
}
