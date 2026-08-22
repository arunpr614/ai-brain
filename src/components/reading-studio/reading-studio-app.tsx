"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, ExternalLink, FileText, Maximize2, Minimize2 } from "lucide-react";
import { ItemOfflineToggle } from "@/components/item-offline-toggle";
import { YouTubePlayerSync } from "./youtube-player-sync";
import { TranscriptTimeline } from "./transcript-timeline";
import { MultiLayerCompanionTabs } from "./multi-layer-companion-tabs";
import { SplitPaneContainer, type SplitRatio } from "./split-pane-container";

import type { ItemRow } from "@/db/client";
import type { TranscriptSegmentRow, TranscriptSourceRow } from "@/db/transcripts";
import type { ItemTopicRow } from "@/db/topics";
import type { TagRow } from "@/db/tags";

export interface ReadingStudioAppProps {
  item: ItemRow;
  transcriptSource: TranscriptSourceRow | null;
  segments: TranscriptSegmentRow[];
  topics: ItemTopicRow[];
  tags: TagRow[];
  parsedQuotes: string[];
}

function extractYouTubeVideoId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  }
  return null;
}

export function ReadingStudioApp({
  item,
  transcriptSource,
  segments,
  topics,
  tags,
  parsedQuotes,
}: ReadingStudioAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial time from query param ?t=180
  const initialTimeParam = searchParams.get("t");
  const initialTimeMs = initialTimeParam ? parseInt(initialTimeParam, 10) * (initialTimeParam.length > 5 ? 1 : 1000) : 0;

  const [currentTimeMs, setCurrentTimeMs] = useState(initialTimeMs || 0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(initialTimeMs || null);
  const [mobileTab, setMobileTab] = useState<"reader" | "notes">("reader");
  const [splitRatio, setSplitRatio] = useState<SplitRatio>("60:40");
  const [isFocusMode, setIsFocusMode] = useState(false);

  const videoId = extractYouTubeVideoId(item.source_url);
  const isYouTube = Boolean(videoId);

  const handleSeek = useCallback((timestampMs: number) => {
    setCurrentTimeMs(timestampMs);
    setSeekTargetMs(timestampMs);
  }, []);

  const handleSeekHandled = useCallback(() => {
    setSeekTargetMs(null);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => !prev);
  }, []);

  // Global keyboard shortcuts (⌥F for Focus Mode, Esc to return to item details)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌥F (Option + F / Alt + F) -> Toggle Focus Mode
      if (e.altKey && (e.key === "f" || e.key === "F" || e.code === "KeyF")) {
        e.preventDefault();
        toggleFocusMode();
      }
      // Esc -> Back to item detail if not focused in an input
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        router.push(`/items/${item.id}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFocusMode, router, item.id]);

  const leftPaneContent = (
    <>
      {/* Video Player or Article Header */}
      {isYouTube && videoId ? (
        <YouTubePlayerSync
          videoId={videoId}
          sourceUrl={item.source_url || ""}
          title={item.title || "YouTube Video"}
          onTimeUpdate={setCurrentTimeMs}
          seekTargetMs={seekTargetMs}
          onSeekHandled={handleSeekHandled}
        />
      ) : (
        <div className="p-5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider">
            <FileText className="h-4 w-4" />
            <span>Full-Text Article</span>
          </div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h2>
          {item.body && (
            <div className="prose dark:prose-invert max-w-none text-xs text-[var(--text-secondary)] leading-relaxed max-h-96 overflow-y-auto pr-2">
              <p className="whitespace-pre-line">{item.body}</p>
            </div>
          )}
        </div>
      )}

      {/* Interactive Transcript Timeline */}
      <div className="h-[520px]">
        <TranscriptTimeline
          itemId={item.id}
          itemTitle={item.title}
          source={transcriptSource}
          segments={segments}
          currentTimeMs={currentTimeMs}
          onSeek={handleSeek}
        />
      </div>
    </>
  );

  const rightPaneContent = (
    <MultiLayerCompanionTabs
      item={item}
      topics={topics}
      tags={tags}
      parsedQuotes={parsedQuotes}
    />
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
      {/* Top Reading Studio Header */}
      <header className="sticky top-0 z-40 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border)] px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/items/${item.id}`}
            aria-label="Back to item details"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to Item</span>
          </Link>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <h1 className="font-semibold text-sm truncate max-w-[280px] sm:max-w-md md:max-w-lg">
              {item.title || "Untitled Workspace"}
            </h1>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ASR Ground Truth Badge */}
          {transcriptSource && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-950 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>
                {transcriptSource.source_kind === "owned_media_stt"
                  ? "Apple MLX Whisper"
                  : transcriptSource.source_kind === "youtube_official_caption"
                    ? "Official Captions"
                    : "ASR Ground Truth"}
              </span>
            </span>
          )}

          {/* Focus Mode Toggle */}
          <button
            type="button"
            onClick={toggleFocusMode}
            aria-pressed={isFocusMode}
            aria-label={isFocusMode ? "Exit Focus Mode (Option+F)" : "Enter Focus Mode (Option+F)"}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors ${
              isFocusMode
                ? "bg-indigo-50 text-indigo-950 border-indigo-300 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60 shadow-xs"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] font-medium"
            }`}
          >
            {isFocusMode ? <Minimize2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{isFocusMode ? "Exit Focus (⌥F)" : "Focus Mode (⌥F)"}</span>
          </button>

          {/* Offline Availability Toggle */}
          <ItemOfflineToggle itemId={item.id} variant="header" />

          {/* Source Link */}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open original source URL"
              className="p-1.5 rounded-lg bg-[var(--surface-raised)] hover:bg-[var(--control-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </header>


      {/* Mobile Segmented Switcher */}
      <div className="lg:hidden p-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-base)] p-1 border border-[var(--border)]">
          <button
            type="button"
            onClick={() => setMobileTab("reader")}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileTab === "reader"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Media & Transcript
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("notes")}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileTab === "notes"
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Companion Notes & AI
          </button>
        </div>
      </div>


      {/* Split Pane Container */}
      <SplitPaneContainer
        leftPane={leftPaneContent}
        rightPane={rightPaneContent}
        defaultRatio={splitRatio}
        onRatioChange={setSplitRatio}
        isFocusMode={isFocusMode}
        onToggleFocusMode={toggleFocusMode}
        mobileTab={mobileTab === "reader" ? "left" : "right"}
      />
    </div>
  );
}
