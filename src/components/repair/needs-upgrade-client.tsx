"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileText,
  StickyNote,
  Video,
  Wrench,
  Zap,
} from "lucide-react";
import type { ItemRow } from "@/db/client";
import {
  captureSourceLabel,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { useRangeSelection } from "@/lib/triage/use-range-selection";
import {
  FloatingBulkDock,
  type FloatingBulkDockAction,
  type FloatingBulkProgress,
} from "./floating-bulk-dock";
import {
  dispatchBatchAsr,
  dispatchBatchAutoHeal,
  dispatchBatchArchive,
} from "@/lib/triage/batch-dispatcher";
import { enqueueItemForAsrAction } from "@/app/needs-upgrade/actions";

export interface NeedsUpgradeViewItem {
  item: ItemRow;
  reason: string;
  hint: string | null;
  hasJob: boolean;
  isYoutube: boolean;
}

export interface NeedsUpgradeGroup {
  reason: string;
  items: NeedsUpgradeViewItem[];
}

export interface NeedsUpgradeClientProps {
  items: ItemRow[];
  groups: NeedsUpgradeGroup[];
  totalCount: number;
  youtubeCount: number;
  articleCount: number;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h > 0 && h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SourceIcon({ item }: { item: ItemRow }) {
  if (item.source_type === "youtube" || item.source_platform?.includes("youtube")) {
    return <Video className="h-4 w-4 text-red-500" strokeWidth={2} />;
  }
  if (item.source_type === "pdf" || item.source_platform === "pdf") {
    return <FileText className="h-4 w-4 text-amber-500" strokeWidth={2} />;
  }
  return <StickyNote className="h-4 w-4 text-cyan-500" strokeWidth={2} />;
}

function qualityBadgeStyle(quality: string | null | undefined): { bg: string; text: string; border: string } {
  switch (quality) {
    case "user_provided_full_text":
    case "full_text":
    case "transcript":
    case "metadata_plus_transcript":
      return { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-300", border: "border-emerald-500/30" };
    case "paywall_preview":
    case "client_dom":
      return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", border: "border-amber-500/30" };
    case "metadata_only":
    case "failed":
    default:
      return { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", border: "border-rose-500/30" };
  }
}

export function NeedsUpgradeClient({
  items,
  groups,
  totalCount,
}: NeedsUpgradeClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<FloatingBulkProgress | undefined>(undefined);
  const [pendingJobIds, setPendingJobIds] = useState<Set<string>>(new Set());

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleItem,
    selectAll,
    clearSelection,
    selectedItems,
  } = useRangeSelection({
    items,
    getId: (item) => item.id,
  });

  const selectedYoutubeCount = items.filter(
    (i) => selectedIds.has(i.id) && (i.source_type === "youtube" || i.source_platform?.includes("youtube")),
  ).length;

  const selectedArticleCount = selectedCount - selectedYoutubeCount;

  const handleBatchAsr = useCallback(async () => {
    const youtubeIds = items
      .filter((i) => selectedIds.has(i.id) && (i.source_type === "youtube" || i.source_platform?.includes("youtube")))
      .map((i) => i.id);

    if (youtubeIds.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: youtubeIds.length, percent: 0, label: "Queuing Mac ASR..." });

    try {
      await dispatchBatchAsr(youtubeIds, (p) => setProgress(p));
      setPendingJobIds((prev) => new Set([...Array.from(prev), ...youtubeIds]));
      clearSelection();
    } finally {
      setIsProcessing(false);
      setProgress(undefined);
    }
  }, [items, selectedIds, clearSelection]);

  const handleBatchAutoHeal = useCallback(async () => {
    const articleIds = items
      .filter((i) => selectedIds.has(i.id) && i.source_type !== "youtube" && !i.source_platform?.includes("youtube"))
      .map((i) => i.id);

    if (articleIds.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: articleIds.length, percent: 0, label: "Auto-healing articles..." });

    try {
      await dispatchBatchAutoHeal(articleIds, (p) => setProgress(p));
      clearSelection();
    } finally {
      setIsProcessing(false);
      setProgress(undefined);
    }
  }, [items, selectedIds, clearSelection]);

  const handleBatchArchive = useCallback(async () => {
    if (selectedCount === 0) return;

    setIsProcessing(true);
    try {
      await dispatchBatchArchive(selectedItems);
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  }, [selectedCount, selectedItems, clearSelection]);

  const handleSingleAsr = async (itemId: string) => {
    setPendingJobIds((prev) => new Set([...Array.from(prev), itemId]));
    await enqueueItemForAsrAction(itemId);
  };

  const dockActions: FloatingBulkDockAction[] = [
    ...(selectedYoutubeCount > 0
      ? [
          {
            id: "asr",
            label: "Queue Mac ASR",
            count: selectedYoutubeCount,
            icon: Zap,
            variant: "primary" as const,
            onClick: handleBatchAsr,
          },
        ]
      : []),
    ...(selectedArticleCount > 0
      ? [
          {
            id: "heal",
            label: "Auto-Heal",
            count: selectedArticleCount,
            icon: Wrench,
            variant: selectedYoutubeCount === 0 ? ("primary" as const) : ("secondary" as const),
            onClick: handleBatchAutoHeal,
          },
        ]
      : []),
    {
      id: "archive",
      label: "Archive",
      count: selectedCount,
      variant: "secondary" as const,
      onClick: handleBatchArchive,
    },
  ];

  return (
    <>
      {items.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-base font-semibold text-emerald-700 dark:text-emerald-300">
            All captures are in prime health!
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Every bookmark in your library currently has full-text content or attached transcripts.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const headingId = `needs-upgrade-${group.reason.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return (
              <section key={group.reason} aria-labelledby={headingId}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id={headingId}
                    className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider"
                  >
                    {group.reason}
                  </h2>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-mono text-[var(--text-secondary)]">
                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {group.items.map(({ item, reason, hint, hasJob, isYoutube }) => {
                    const badge = qualityBadgeStyle(item.capture_quality);
                    const selected = isSelected(item.id);
                    const isQueued = hasJob || pendingJobIds.has(item.id);

                    return (
                      <li
                        key={item.id}
                        onClick={(e) => {
                          // Allow clicking card to select unless clicking button/link
                          if ((e.target as HTMLElement).closest("button, a, input")) return;
                          toggleItem(item.id, e.shiftKey);
                        }}
                        className={`rounded-xl border transition-all shadow-sm p-4 cursor-pointer ${
                          selected
                            ? "border-[var(--accent-9)] bg-[var(--control-selected-bg)] ring-1 ring-[var(--accent-9)]"
                            : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          {/* Selection Checkbox & Source Icon */}
                          <div className="flex items-center gap-3 shrink-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => toggleItem(item.id, (e.nativeEvent as MouseEvent).shiftKey)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${item.title}`}
                              className="h-4 w-4 rounded border-[var(--border)] text-[var(--action-primary-bg)] focus:ring-[var(--accent-9)] cursor-pointer"
                            />
                            <span className="p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                              <SourceIcon item={item} />
                            </span>
                          </div>

                          {/* Content Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <Link href={`/items/${item.id}`} className="min-w-0">
                                <h3 className="break-words text-[16px] font-semibold leading-6 text-[var(--text-primary)] hover:text-emerald-500 transition-colors">
                                  {item.title || "Untitled Capture"}
                                </h3>
                              </Link>
                              <span className="rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--quality-needs-upgrade)]">
                                {reason}
                              </span>
                            </div>

                            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span className="font-medium">{platformLabel(item.source_platform, item.source_type)}</span>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span>via {captureSourceLabel(item.capture_source)}</span>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-mono border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {qualityLabel(item.capture_quality)}
                              </span>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span>{formatRelative(item.captured_at)}</span>
                            </p>

                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                              {hint ?? item.description ?? "Open the item to add source text or inspect capture details."}
                            </p>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
                            {/* Queue ASR Action for YouTube */}
                            {isYoutube && (
                              <button
                                type="button"
                                disabled={isQueued}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleAsr(item.id);
                                }}
                                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold border transition-all ${
                                  isQueued
                                    ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                                }`}
                              >
                                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                                {isQueued ? "Queued for Mac ASR" : "Queue Mac ASR"}
                              </button>
                            )}

                            {/* Reading Studio Link */}
                            <Link
                              href={`/library/${item.id}/read`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-emerald-500/50 hover:text-emerald-500 transition-colors"
                            >
                              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                              Studio
                            </Link>

                            {/* Manual Text Repair */}
                            <Link
                              href={`/items/${item.id}/repair`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" strokeWidth={2} />
                              Repair
                            </Link>

                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Open external source"
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* Sticky Floating Bulk Action Dock */}
      <FloatingBulkDock
        selectedCount={selectedCount}
        totalCount={totalCount}
        actions={dockActions}
        onDeselectAll={clearSelection}
        onSelectAll={selectAll}
        isProcessing={isProcessing}
        progress={progress}
      />
    </>
  );
}
