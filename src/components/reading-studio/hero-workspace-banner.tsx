"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Play, Sparkles, Video, FileText } from "lucide-react";
import type { ItemRow } from "@/db/client";

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "Video";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h > 0) {
    return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function HeroWorkspaceBanner({
  item,
  segmentCount = 0,
}: {
  item: ItemRow;
  segmentCount?: number;
}) {
  const isYoutube =
    item.source_type === "youtube" ||
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short";

  const durationStr = formatDuration(item.duration_seconds);

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm transition-all hover:border-[var(--border-strong)]">
      <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
        {/* Left Side: Thumbnail / Visual Badge & Information */}
        <div className="flex items-start gap-4">
          <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] shadow-inner">
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            ) : isYoutube ? (
              <div className="flex flex-col items-center justify-center gap-1 text-red-500">
                <Video className="h-6 w-6" />
                <span className="font-mono text-[10px] text-[var(--text-secondary)]">{durationStr}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-[var(--text-secondary)]">
                <FileText className="h-6 w-6" />
                <span className="font-mono text-[10px]">Document</span>
              </div>
            )}

            {isYoutube && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
                {durationStr}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                Interactive Studio
              </span>
              {segmentCount > 0 && (
                <span className="rounded-md bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  {segmentCount} timed segments
                </span>
              )}
            </div>

            <h3 className="mt-1.5 text-base font-semibold leading-snug text-[var(--text-primary)]">
              Reading Studio & Knowledge Workspace
            </h3>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              Open the dedicated full-page workspace for synchronized video playback, real-time transcript searching, and multi-layer notes.
            </p>
          </div>
        </div>

        {/* Right Side: Launch Full-Page Studio CTA */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/library/${encodeURIComponent(item.id)}/read`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--action-primary-bg)] px-5 text-sm font-semibold text-[var(--action-primary-fg)] shadow-sm transition-all hover:bg-[var(--action-primary-bg-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-primary-focus)] active:scale-[0.98]"
          >
            {isYoutube ? <Play className="h-4 w-4 fill-current" /> : <BookOpen className="h-4 w-4" />}
            Launch Reading Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
