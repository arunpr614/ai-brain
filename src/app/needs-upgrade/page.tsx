import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileText,
  StickyNote,
  Video,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ItemRow } from "@/db/client";
import { listNeedsUpgradeItems } from "@/db/items";
import { getTranscriptJobForItem } from "@/db/transcript-jobs";
import { verifySessionCookie } from "@/lib/auth";
import {
  captureSourceLabel,
  improvementHint,
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { enqueueItemForAsrAction } from "./actions";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SourceIcon({ item }: { item: ItemRow }) {
  if (item.source_type === "youtube") return <Video className="h-4 w-4 text-red-400" strokeWidth={2} />;
  if (item.source_type === "pdf") return <FileText className="h-4 w-4 text-amber-400" strokeWidth={2} />;
  return <StickyNote className="h-4 w-4 text-emerald-400" strokeWidth={2} />;
}

function qualityBadgeStyle(quality: string | null | undefined): { bg: string; text: string; border: string } {
  switch (quality) {
    case "user_provided_full_text":
    case "full_text":
    case "transcript":
    case "metadata_plus_transcript":
      return { bg: "bg-emerald-950/40", text: "text-emerald-300", border: "border-emerald-800/60" };
    case "paywall_preview":
    case "client_dom":
      return { bg: "bg-amber-950/40", text: "text-amber-300", border: "border-amber-800/60" };
    case "metadata_only":
    case "failed":
    default:
      return { bg: "bg-red-950/40", text: "text-red-300", border: "border-red-800/60" };
  }
}

interface NeedsUpgradeViewItem {
  item: ItemRow;
  reason: string;
  hint: string | null;
  hasJob: boolean;
  isYoutube: boolean;
}

interface NeedsUpgradeGroup {
  reason: string;
  items: NeedsUpgradeViewItem[];
}

function groupNeedsUpgradeItems(items: ItemRow[]): NeedsUpgradeGroup[] {
  const groups = new Map<string, NeedsUpgradeViewItem[]>();
  for (const item of items) {
    const isYoutube =
      item.source_type === "youtube" ||
      item.source_platform === "youtube" ||
      item.source_platform === "youtube_short";
    const job = isYoutube ? getTranscriptJobForItem(item.id) : null;
    const reason =
      needsUpgradeReason({
        source_platform: item.source_platform,
        capture_quality: item.capture_quality,
        extraction_warning: item.extraction_warning,
      }) ?? "Needs readable text";

    const entry: NeedsUpgradeViewItem = {
      item,
      reason,
      hint: improvementHint(item.source_platform, item.capture_quality),
      hasJob: Boolean(job && (job.state === "pending" || job.state === "running")),
      isYoutube,
    };
    groups.set(reason, [...(groups.get(reason) ?? []), entry]);
  }
  return Array.from(groups, ([reason, groupedItems]) => ({
    reason,
    items: groupedItems,
  }));
}

function groupHeadingId(reason: string): string {
  return `needs-upgrade-${reason.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

export default async function NeedsUpgradePage() {
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect("/unlock?next=%2Fneeds-upgrade");
  }

  const items = listNeedsUpgradeItems({ limit: 200 });
  const groups = groupNeedsUpgradeItems(items);

  const totalCount = items.length;
  const youtubeCount = items.filter(
    (i) => i.source_type === "youtube" || i.source_platform?.includes("youtube"),
  ).length;
  const articleCount = totalCount - youtubeCount;

  return (
    <div className="mx-auto max-w-[1020px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10 font-sans">
      <Link
        href="/library"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--quality-needs-upgrade)]">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
              Quality Repair Center & Triage
            </div>
            <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
              Needs Upgrade
            </h1>
            <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--text-secondary)]">
              Identify, isolate, and remediate bookmarks with incomplete metadata or missing transcripts
              to restore searchability and Ask readiness.
            </p>
          </div>

          {/* Quality Health Metrics Widget */}
          <div className="flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] p-3 rounded-xl shadow-sm text-xs">
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-[var(--text-primary)]">{totalCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">Needs Repair</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-red-400">{youtubeCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">No Captions</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)]" />
            <div className="flex flex-col items-center px-2">
              <span className="font-mono text-lg font-bold text-amber-400">{articleCount}</span>
              <span className="text-[10px] text-[var(--text-secondary)] uppercase">Metadata Only</span>
            </div>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-10 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-emerald-300">
            All captures are in prime health!
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Every bookmark in your library currently has full-text content or attached transcripts.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => {
            const headingId = groupHeadingId(group.reason);
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
                    return (
                      <li
                        key={item.id}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--border-strong)] shadow-sm"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <span className="mt-1 shrink-0 p-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
                            <SourceIcon item={item} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <Link href={`/items/${item.id}`} className="min-w-0">
                                <h3 className="break-words text-[17px] font-semibold leading-6 text-[var(--text-primary)] hover:text-emerald-400 transition-colors">
                                  {item.title || "Untitled Capture"}
                                </h3>
                              </Link>
                              <span className="rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--quality-needs-upgrade)]">
                                {reason}
                              </span>
                            </div>

                            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span>{platformLabel(item.source_platform, item.source_type)}</span>
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
                              <form
                                action={async () => {
                                  "use server";
                                  await enqueueItemForAsrAction(item.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  disabled={hasJob}
                                  className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold border transition-all ${
                                    hasJob
                                      ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed"
                                      : "bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/60"
                                  }`}
                                >
                                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                                  {hasJob ? "Queued for Mac ASR" : "Queue Mac ASR"}
                                </button>
                              </form>
                            )}

                            {/* Reading Studio Link */}
                            <Link
                              href={`/library/${item.id}/read`}
                              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-medium text-[var(--text-primary)] hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                            >
                              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                              Studio
                            </Link>

                            {/* Manual Text Repair */}
                            <Link
                              href={`/items/${item.id}/repair`}
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
    </div>
  );
}
