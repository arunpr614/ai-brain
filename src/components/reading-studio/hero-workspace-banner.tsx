"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Layers,
  Maximize2,
  Play,
  Sparkles,
  Video,
  AlertTriangle,
} from "lucide-react";
import type { ItemRow } from "@/db/client";
import type { TranscriptSegmentRow } from "@/db/transcripts";
import { AsrRecoveryCallout } from "./asr-recovery-callout";
import { SegmentInspectorDrawer } from "./segment-inspector-drawer";

export interface HeroWorkspaceBannerProps {
  item: ItemRow;
  segmentCount?: number;
  qualityLevel?: "gold" | "degraded" | "article";
  qualityLabel?: string;
  diagnosticWarning?: string;
  onInspectSegments?: () => void;
  className?: string;
  segments?: TranscriptSegmentRow[];
}

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
  qualityLevel: propQualityLevel,
  qualityLabel: propQualityLabel,
  diagnosticWarning,
  onInspectSegments,
  className = "",
  segments = [],
}: HeroWorkspaceBannerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isYoutube =
    item.source_type === "youtube" ||
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short";

  const isPdf = item.source_type === "pdf" || item.source_platform === "pdf";

  // Determine fidelity quality level
  const qualityLevel: "gold" | "degraded" | "article" =
    propQualityLevel ??
    (isYoutube
      ? segmentCount > 0 || item.capture_quality === "transcript" || item.capture_quality === "metadata_plus_transcript"
        ? "gold"
        : "degraded"
      : "article");

  const durationStr = formatDuration(item.duration_seconds);

  const handleCopyLink = useCallback(() => {
    const canonicalUrl = typeof window !== "undefined" ? window.location.href : "";
    if (canonicalUrl) {
      navigator.clipboard.writeText(canonicalUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  }, []);

  const handleOpenDrawer = useCallback(() => {
    if (onInspectSegments) {
      onInspectSegments();
    } else {
      setDrawerOpen(true);
    }
  }, [onInspectSegments]);

  return (
    <div
      role="region"
      aria-label="Reading Studio Hero Workspace"
      className={`my-6 overflow-hidden rounded-2xl border transition-all shadow-sm ${
        qualityLevel === "degraded"
          ? "border-rose-500/40 bg-[var(--surface-raised)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]"
      } ${className}`}
    >
      <div className="flex flex-col gap-6 p-5 md:p-6">
        {/* Top Region: Media Poster & Core Metadata */}
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* Left Side: Thumbnail Poster / Media Preview */}
          <div className="flex items-start gap-4">
            <div className="relative flex h-24 w-36 sm:h-28 sm:w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] shadow-inner">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              ) : isYoutube ? (
                <div className="flex flex-col items-center justify-center gap-1.5 text-red-500">
                  <Video className="h-7 w-7" />
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">{durationStr}</span>
                </div>
              ) : isPdf ? (
                <div className="flex flex-col items-center justify-center gap-1.5 text-amber-500">
                  <FileText className="h-7 w-7" />
                  <span className="font-mono text-[10px]">PDF Document</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 text-cyan-500">
                  <FileText className="h-7 w-7" />
                  <span className="font-mono text-[10px]">Web Article</span>
                </div>
              )}

              {/* Monospace Duration Badge */}
              {isYoutube && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-2 py-0.5 font-mono text-[10px] font-semibold text-white shadow-xs">
                  {durationStr}
                </span>
              )}
            </div>

            {/* Headline, Fidelity Chips & Provenance */}
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Platform Origin Badge (Variation A subtle platform origin) */}
                <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  {isYoutube ? (
                    <>
                      <Video className="h-3 w-3 text-red-500" />
                      <span>YouTube</span>
                    </>
                  ) : isPdf ? (
                    <>
                      <FileText className="h-3 w-3 text-amber-500" />
                      <span>PDF Paper</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3 w-3 text-cyan-500" />
                      <span>Web Article</span>
                    </>
                  )}
                </span>

                {/* Quality Fidelity Chip */}
                {qualityLevel === "gold" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>{propQualityLabel || "Full Transcript • High Fidelity"}</span>
                  </span>
                )}

                {qualityLevel === "degraded" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                    <AlertTriangle className="h-3 w-3 text-rose-500" />
                    <span>{propQualityLabel || "Metadata Only • Missing Transcript"}</span>
                  </span>
                )}

                {qualityLevel === "article" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                    <Sparkles className="h-3 w-3 text-sky-500" />
                    <span>{propQualityLabel || "Full Text • Grounded Reading"}</span>
                  </span>
                )}

                {/* Timed Segments Count */}
                {segmentCount > 0 && (
                  <span className="rounded-md bg-emerald-950/30 border border-emerald-800/40 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-400">
                    {segmentCount} timed segments
                  </span>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold leading-snug text-[var(--text-primary)]">
                {item.title || "Reading Studio & Knowledge Workspace"}
              </h2>

              <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {item.description ||
                  "Open the dedicated full-page workspace for synchronized media playback, real-time transcript scrubbing, and multi-layer synthesis notes."}
              </p>
            </div>
          </div>

          {/* Right Side: Primary CTA & Action Rail */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 shrink-0">
            <Link
              href={`/library/${encodeURIComponent(item.id)}/read`}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-[var(--action-primary-bg)] px-6 text-sm font-semibold text-[var(--action-primary-fg)] shadow-sm transition-all hover:bg-[var(--action-primary-bg-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-primary-focus)] active:scale-[0.98]"
            >
              {isYoutube ? <Play className="h-4 w-4 fill-current" /> : <BookOpen className="h-4 w-4" />}
              <span>Launch Reading Studio</span>
              <span className="hidden lg:inline-flex rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-mono font-normal">
                ⌘↵
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            {/* Secondary Actions Row */}
            <div className="flex items-center gap-2 self-center md:self-end text-xs">
              {segmentCount > 0 && (
                <button
                  type="button"
                  onClick={handleOpenDrawer}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Inspect Segments</span>
                </button>
              )}

              <Link
                href={`/items/${encodeURIComponent(item.id)}?mode=focus`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Focus Mode</span>
              </Link>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open original source"
                  className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Degraded State ASR Recovery Callout */}
        {qualityLevel === "degraded" && isYoutube && (
          <AsrRecoveryCallout
            itemId={item.id}
            diagnosticWarning={diagnosticWarning || item.extraction_warning}
          />
        )}
      </div>

      {/* Slide-over Drawer */}
      <SegmentInspectorDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        itemId={item.id}
        itemTitle={item.title}
        segments={segments}
      />
    </div>
  );
}
