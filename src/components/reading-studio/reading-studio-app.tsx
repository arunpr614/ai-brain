"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ExternalLink, FileText } from "lucide-react";
import { YouTubePlayerSync } from "./youtube-player-sync";
import { TranscriptTimeline } from "./transcript-timeline";
import { MultiLayerCompanionTabs } from "./multi-layer-companion-tabs";
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
    // fallback regex
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
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [seekTargetMs, setSeekTargetMs] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<"reader" | "notes">("reader");

  const videoId = extractYouTubeVideoId(item.source_url);
  const isYouTube = Boolean(videoId);

  const handleSeek = useCallback((timestampMs: number) => {
    setCurrentTimeMs(timestampMs);
    setSeekTargetMs(timestampMs);
  }, []);

  const handleSeekHandled = useCallback(() => {
    setSeekTargetMs(null);
  }, []);

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

          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 shrink-0">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <h1 className="font-semibold text-sm truncate max-w-[280px] sm:max-w-md md:max-w-lg">
              {item.title || "Untitled Workspace"}
            </h1>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ASR Badge */}
          {transcriptSource && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <span>
                {transcriptSource.source_kind === "owned_media_stt"
                  ? "Apple MLX Whisper"
                  : transcriptSource.source_kind === "youtube_official_caption"
                    ? "Official Captions"
                    : "ASR Ground Truth"}
              </span>
            </span>
          )}

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
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-950 p-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => setMobileTab("reader")}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileTab === "reader"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Media & Transcript
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("notes")}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mobileTab === "notes"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Companion Notes
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Studio Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Media Player & Synchronized Transcript */}
        <section
          aria-label="Source Media & Transcript"
          className={`lg:col-span-7 flex flex-col gap-4 ${
            mobileTab === "reader" ? "flex" : "hidden lg:flex"
          }`}
        >
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
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                <FileText className="h-4 w-4" />
                <span>Source Content</span>
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{item.title}</h2>
              {item.body && (
                <div className="prose dark:prose-invert max-w-none text-xs text-[var(--text-secondary)] leading-relaxed max-h-96 overflow-y-auto pr-2">
                  <p className="whitespace-pre-line">{item.body}</p>
                </div>
              )}
            </div>
          )}

          {/* Interactive Transcript Timeline (Height constrained for split layout) */}
          <div className="h-[480px]">
            <TranscriptTimeline
              itemId={item.id}
              itemTitle={item.title}
              source={transcriptSource}
              segments={segments}
              currentTimeMs={currentTimeMs}
              onSeek={handleSeek}
            />
          </div>
        </section>

        {/* Right Pane: Multi-Layer Companion Tabs (Notes, AI Brief, Recall) */}
        <aside
          aria-label="Multi-Layer Companion Studio"
          className={`lg:col-span-5 flex flex-col h-[760px] sticky top-16 ${
            mobileTab === "notes" ? "flex" : "hidden lg:flex"
          }`}
        >
          <MultiLayerCompanionTabs
            item={item}
            topics={topics}
            tags={tags}
            parsedQuotes={parsedQuotes}
          />
        </aside>
      </main>
    </div>
  );
}
