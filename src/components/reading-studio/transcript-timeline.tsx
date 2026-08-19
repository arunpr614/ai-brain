"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  memo,
  type UIEvent,
} from "react";
import { Search, Pin, Copy, Check, Clock, ArrowDownCircle, Lock, Unlock } from "lucide-react";
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

/**
 * Fast O(log N) binary search for the active segment at timestamp currentTimeMs.
 */
function findActiveSegmentIndex(
  segments: TranscriptSegmentRow[],
  currentTimeMs: number,
): number {
  if (!segments.length || currentTimeMs < 0) return -1;
  let low = 0;
  let high = segments.length - 1;
  let candidate = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const seg = segments[mid];
    const start = seg.start_ms ?? 0;
    const end = seg.end_ms ?? (start + (seg.duration_ms ?? 5000));

    if (currentTimeMs >= start && currentTimeMs < end) {
      return mid;
    }
    if (currentTimeMs < start) {
      high = mid - 1;
    } else {
      candidate = mid;
      low = mid + 1;
    }
  }

  return candidate;
}

interface SegmentRowProps {
  seg: TranscriptSegmentRow;
  index: number;
  isCurrent: boolean;
  isCopied: boolean;
  isPinned: boolean;
  onSeek: (timestampMs: number) => void;
  onPin: (seg: TranscriptSegmentRow) => void;
  onCopy: (seg: TranscriptSegmentRow) => void;
}

const SegmentRowItem = memo(function SegmentRowItem({
  seg,
  isCurrent,
  isCopied,
  isPinned,
  onSeek,
  onPin,
  onCopy,
}: SegmentRowProps) {
  return (
    <div
      data-segment-id={seg.id}
      className={`group relative flex items-start gap-3 p-2 rounded-lg transition-colors border ${
        isCurrent
          ? "bg-emerald-950/30 border-emerald-500/60 text-[var(--text-primary)] shadow-xs"
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
            : "bg-[var(--surface)] text-emerald-400 border-[var(--border)] hover:border-emerald-500/60"
        }`}
      >
        {formatTimestamp(seg.start_ms)}
      </button>

      {/* Segment Text */}
      <p
        onClick={() => seg.start_ms != null && onSeek(seg.start_ms)}
        className="flex-1 leading-relaxed cursor-pointer select-text text-xs"
      >
        {seg.text}
      </p>

      {/* Hover Quick Actions */}
      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onPin(seg)}
          title="Pin Quote to Notes with Timestamp Citation"
          aria-label="Pin quote to notes"
          className="p-1 rounded bg-[var(--surface)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-emerald-400 border border-[var(--border)] transition-colors"
        >
          {isPinned ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Pin className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onCopy(seg)}
          title="Copy Quote and Timestamp Citation"
          aria-label="Copy quote and timestamp citation"
          className="p-1 rounded bg-[var(--surface)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
        >
          {isCopied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
});

const ROW_HEIGHT_ESTIMATE = 48; // Estimated avg pixel height per segment
const OVERSCAN_BUFFER = 20; // Number of items buffered above and below viewport

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
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(480);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastActiveIndexRef = useRef<number>(-1);
  const scrollRafRef = useRef<number | null>(null);

  // Filter segments by search query
  const filteredSegments = useMemo(() => {
    if (!query.trim()) return segments;
    const lower = query.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(lower));
  }, [segments, query]);

  // Find active segment index via fast binary search
  const activeIndex = useMemo(() => {
    return findActiveSegmentIndex(filteredSegments, currentTimeMs);
  }, [filteredSegments, currentTimeMs]);

  // Update container height on resize / mount
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 480);
    }
  }, []);

  // Handle scroll events with requestAnimationFrame throttling
  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      setScrollTop(currentScrollTop);
    });
  }, []);

  // Synchronize auto-scroll to follow active playing segment
  useEffect(() => {
    if (
      autoScroll &&
      !query.trim() &&
      activeIndex >= 0 &&
      activeIndex !== lastActiveIndexRef.current &&
      containerRef.current
    ) {
      lastActiveIndexRef.current = activeIndex;
      const targetTop = activeIndex * ROW_HEIGHT_ESTIMATE;
      const currentScroll = containerRef.current.scrollTop;
      const visibleBottom = currentScroll + containerHeight - 96;

      // Only adjust scroll if the active segment is outside or near the edges of the visible viewport
      if (targetTop < currentScroll || targetTop > visibleBottom) {
        containerRef.current.scrollTo({
          top: Math.max(0, targetTop - Math.floor(containerHeight / 3)),
          behavior: "instant",
        });
      }
    }
  }, [activeIndex, autoScroll, query, containerHeight]);

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

  // Calculate virtual window slice bounds
  const totalCount = filteredSegments.length;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT_ESTIMATE) - OVERSCAN_BUFFER,
  );
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT_ESTIMATE) + OVERSCAN_BUFFER,
  );

  const visibleSegments = useMemo(() => {
    return filteredSegments.slice(startIndex, endIndex);
  }, [filteredSegments, startIndex, endIndex]);

  const topSpacerHeight = startIndex * ROW_HEIGHT_ESTIMATE;
  const bottomSpacerHeight = Math.max(0, (totalCount - endIndex) * ROW_HEIGHT_ESTIMATE);

  const jumpToCurrent = () => {
    if (activeIndex >= 0 && containerRef.current) {
      containerRef.current.scrollTo({
        top: Math.max(0, activeIndex * ROW_HEIGHT_ESTIMATE - Math.floor(containerHeight / 3)),
        behavior: "smooth",
      });
    }
  };

  const isRecallVirtual = Boolean(source?.provenance_json?.includes("recall_dialogue_chunks"));

  return (
    <div className="flex flex-col h-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      {/* Transcript Header & Search Toolbar */}
      <div className="p-3 bg-[var(--surface)] border-b border-[var(--border)] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              Interactive Transcript
            </h3>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              isRecallVirtual
                ? "bg-purple-50 text-purple-950 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40"
                : "bg-emerald-50 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40"
            }`}>
              {segments.length} {isRecallVirtual ? "Recall chunks" : "segments"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Scroll Toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll((prev) => !prev)}
              title={autoScroll ? "Auto-scroll following player (Click to unlock)" : "Auto-scroll locked (Click to follow)"}
              aria-label={autoScroll ? "Disable auto-scroll" : "Enable auto-scroll"}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                autoScroll
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
              }`}
            >
              {autoScroll ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              <span>{autoScroll ? "Follow" : "Free Scroll"}</span>
            </button>

            {activeIndex >= 0 && (
              <button
                type="button"
                onClick={jumpToCurrent}
                title="Jump to current playing segment"
                className="p-1 rounded text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-[var(--surface-raised)] border border-[var(--border)] transition-colors"
              >
                <ArrowDownCircle className="h-4 w-4" />
              </button>
            )}

            {source && (
              <span className="hidden sm:inline text-[11px] text-[var(--text-secondary)] font-mono">
                {isRecallVirtual
                  ? "Recall Memory"
                  : source.source_kind === "owned_media_stt"
                    ? "Apple MLX Whisper"
                    : source.source_kind === "youtube_official_caption"
                      ? "YouTube Captions"
                      : "Verbatim ASR"}
              </span>
            )}
          </div>
        </div>

        {isRecallVirtual && (
          <div className="px-2.5 py-1.5 rounded-lg bg-purple-50/60 border border-purple-200/80 dark:bg-purple-950/20 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-300 flex items-center justify-between">
            <span>⚡ Interactive transcript from imported Recall.it memory dialogue.</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {query && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-secondary)] font-mono">
              {filteredSegments.length} match{filteredSegments.length === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      {/* Virtualized Segments List */}
      <div
        ref={containerRef}
        role="region"
        aria-label="Transcript segments"
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 text-xs font-normal relative will-change-scroll"
      >
        {totalCount === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
            {query ? "No segments match your search query." : "No transcript segments available."}
          </div>
        ) : (
          <div className="w-full" style={{ minHeight: `${totalCount * ROW_HEIGHT_ESTIMATE}px` }}>
            {/* Top Virtual Spacer */}
            {topSpacerHeight > 0 && <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />}

            {/* Rendered Window */}
            <div className="space-y-1.5">
              {visibleSegments.map((seg, i) => {
                const absoluteIndex = startIndex + i;
                const isCurrent = absoluteIndex === activeIndex && !query;
                return (
                  <SegmentRowItem
                    key={seg.id}
                    seg={seg}
                    index={absoluteIndex}
                    isCurrent={isCurrent}
                    isCopied={copiedId === seg.id}
                    isPinned={pinnedId === seg.id}
                    onSeek={onSeek}
                    onPin={handlePin}
                    onCopy={handleCopy}
                  />
                );
              })}
            </div>

            {/* Bottom Virtual Spacer */}
            {bottomSpacerHeight > 0 && <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />}
          </div>
        )}
      </div>
    </div>
  );
}
