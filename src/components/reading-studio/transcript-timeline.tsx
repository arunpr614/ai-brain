"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Pin, Copy, Check, Clock } from "lucide-react";
import type { TranscriptSegmentRow, TranscriptSourceRow } from "@/db/transcripts";

export interface TranscriptTimelineProps {
  itemId: string;
  itemTitle?: string;
  source: TranscriptSourceRow | null;
  segments: TranscriptSegmentRow[];
  currentTimeMs: number;
  onSeek: (timestampMs: number) => void;
  onPinQuote?: (quoteText: string, timestampMs: number) => void;
}

export function formatTimestamp(ms: number | null): string {
  if (ms == null || ms < 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function TranscriptTimeline({
  itemId,
  source,
  segments,
  currentTimeMs,
  onSeek,
  onPinQuote,
}: TranscriptTimelineProps) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Filter segments by query
  const filteredSegments = useMemo(() => {
    if (!query.trim()) return segments;
    const lower = query.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(lower));
  }, [segments, query]);

  // Find active segment index
  const activeIndex = useMemo(() => {
    if (!segments.length) return -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const start = seg.start_ms ?? 0;
      const end = seg.end_ms ?? (start + (seg.duration_ms ?? 5000));
      if (currentTimeMs >= start && currentTimeMs < end) {
        return i;
      }
    }
    return -1;
  }, [segments, currentTimeMs]);

  // Auto-scroll active segment into view when not searching
  useEffect(() => {
    if (!query.trim() && activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeIndex, query]);

  const handleCopy = useCallback((seg: TranscriptSegmentRow) => {
    const timeFormatted = formatTimestamp(seg.start_ms);
    const citation = `"${seg.text}" — [${timeFormatted}]`;
    navigator.clipboard.writeText(citation).then(() => {
      setCopiedId(seg.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const handlePin = useCallback(
    (seg: TranscriptSegmentRow) => {
      const timeFormatted = formatTimestamp(seg.start_ms);
      const formattedQuote = `> "${seg.text}"\n> — *[⏱ ${timeFormatted}](?t=${seg.start_ms})*`;

      if (onPinQuote) {
        onPinQuote(formattedQuote, seg.start_ms ?? 0);
      }

      // Dispatch global custom event for note editor
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("brain:append-note-text", {
            detail: {
              itemId,
              text: formattedQuote,
            },
          }),
        );
      }

      setPinnedId(seg.id);
      setTimeout(() => setPinnedId(null), 2000);
    },
    [itemId, onPinQuote],
  );

  return (
    <div className="flex flex-col h-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      {/* Transcript Header & Search */}
      <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              Interactive Transcript
            </h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
              {segments.length} segments
            </span>
          </div>

          {source && (
            <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
              {source.source_kind === "owned_media_stt"
                ? "Apple MLX Whisper"
                : source.source_kind === "youtube_official_caption"
                  ? "YouTube Captions"
                  : "Verbatim ASR"}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {query && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-tertiary)] font-mono">
              {filteredSegments.length} match{filteredSegments.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      {/* Segments Virtual Timeline */}
      <div
        ref={containerRef}
        role="region"
        aria-label="Transcript segments"
        className="flex-1 overflow-y-auto p-2 space-y-1.5 text-xs font-normal"
      >
        {filteredSegments.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-tertiary)]">
            {query ? "No segments match your search query." : "No transcript segments available."}
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isCurrent = idx === activeIndex && !query;
            return (
              <div
                key={seg.id}
                ref={isCurrent ? activeSegmentRef : null}
                className={`group relative flex items-start gap-3 p-2 rounded-lg transition-all border ${
                  isCurrent
                    ? "bg-emerald-950/20 border-emerald-500/50 text-[var(--text-primary)] shadow-sm"
                    : "border-transparent hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {/* Clickable Timecode */}
                <button
                  type="button"
                  onClick={() => seg.start_ms != null && onSeek(seg.start_ms)}
                  aria-label={`Jump to ${formatTimestamp(seg.start_ms)}`}
                  className={`shrink-0 font-mono text-[11px] font-medium px-1.5 py-0.5 rounded border transition-colors ${
                    isCurrent
                      ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                      : "bg-[var(--surface)] text-emerald-400 border-zinc-800 hover:border-emerald-500/60"
                  }`}
                >
                  {formatTimestamp(seg.start_ms)}
                </button>

                {/* Segment Text */}
                <p
                  onClick={() => seg.start_ms != null && onSeek(seg.start_ms)}
                  className="flex-1 leading-relaxed cursor-pointer select-text"
                >
                  {seg.text}
                </p>

                {/* Hover Quick Actions */}
                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePin(seg)}
                    title="Pin Quote to Notes with Timestamp Citation"
                    aria-label="Pin quote to notes"
                    className="p-1 rounded bg-[var(--surface)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-emerald-400 border border-[var(--border)] transition-colors"
                  >
                    {pinnedId === seg.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Pin className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(seg)}
                    title="Copy Quote and Timestamp Citation"
                    aria-label="Copy quote and timestamp citation"
                    className="p-1 rounded bg-[var(--surface)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
                  >
                    {copiedId === seg.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
