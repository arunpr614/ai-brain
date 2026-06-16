import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  StickyNote,
  Video,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ItemRow } from "@/db/client";
import { listNeedsUpgradeItems } from "@/db/items";
import { verifySessionCookie } from "@/lib/auth";
import {
  improvementHint,
  needsUpgradeReason,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";

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
  if (item.source_type === "youtube") return <Video className="h-4 w-4" strokeWidth={2} />;
  if (item.source_type === "pdf") return <FileText className="h-4 w-4" strokeWidth={2} />;
  return <StickyNote className="h-4 w-4" strokeWidth={2} />;
}

function nextAction(item: ItemRow): { label: string; href: string; icon: typeof FileText } {
  return {
    label: "Add text",
    href: `/items/${item.id}/repair`,
    icon: FileText,
  };
}

interface NeedsUpgradeViewItem {
  item: ItemRow;
  reason: string;
  hint: string | null;
  action: ReturnType<typeof nextAction>;
}

interface NeedsUpgradeGroup {
  reason: string;
  items: NeedsUpgradeViewItem[];
}

function groupNeedsUpgradeItems(items: ItemRow[]): NeedsUpgradeGroup[] {
  const groups = new Map<string, NeedsUpgradeViewItem[]>();
  for (const item of items) {
    const reason =
      needsUpgradeReason({
        source_platform: item.source_platform,
        capture_quality: item.capture_quality,
        extraction_warning: item.extraction_warning,
      }) ?? "Needs readable text";
    const entry = {
      item,
      reason,
      hint: improvementHint(item.source_platform, item.capture_quality),
      action: nextAction(item),
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

  return (
    <div className="mx-auto max-w-[980px] px-5 pb-28 pt-8 md:px-8 md:pb-10 md:pt-10">
      <Link
        href="/library"
        className="mb-6 inline-flex min-h-11 items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:min-h-0"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs font-medium text-[var(--quality-needs-upgrade)]">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
          Capture quality
        </div>
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          Needs Upgrade
        </h1>
        <p className="mt-2 max-w-[680px] text-sm leading-6 text-[var(--text-secondary)]">
          These saves are still useful as bookmarks, but they do not have enough
          readable source text for reliable search or Ask. Add text or open the source.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-base font-medium text-[var(--text-primary)]">
            No captures need attention.
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            New metadata-only, preview-only, or failed captures will appear here.
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
                    className="text-sm font-semibold text-[var(--text-primary)]"
                  >
                    {group.reason}
                  </h2>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    {group.items.length} {group.items.length === 1 ? "source" : "sources"}
                  </span>
                </div>
                <ul className="flex flex-col gap-3">
                  {group.items.map(({ item, reason, hint, action }) => {
                    const ActionIcon = action.icon;
                    return (
                      <li
                        key={item.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <span className="mt-1 shrink-0 text-[var(--text-muted)]">
                            <SourceIcon item={item} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <Link href={`/items/${item.id}`} className="min-w-0">
                                <h3 className="break-words text-[18px] font-medium leading-7 text-[var(--text-primary)] hover:text-[var(--accent-11)]">
                                  {item.title}
                                </h3>
                              </Link>
                              <span className="rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--quality-needs-upgrade)]">
                                {reason}
                              </span>
                            </div>

                            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                              <span>{platformLabel(item.source_platform, item.source_type)}</span>
                              <span className="text-[var(--text-muted)]">/</span>
                              <span>Via {item.capture_source}</span>
                              <span className="text-[var(--text-muted)]">/</span>
                              <span>{qualityLabel(item.capture_quality)}</span>
                              <span className="text-[var(--text-muted)]">/</span>
                              <span>{formatRelative(item.captured_at)}</span>
                            </p>

                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                              {hint ?? item.description ?? "Open the item to add source text or inspect capture details."}
                            </p>
                          </div>

                          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
                            <Link
                              href={action.href}
                              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] px-3 text-xs font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] sm:h-9 sm:flex-none"
                            >
                              <ActionIcon className="h-3.5 w-3.5" strokeWidth={2} />
                              {action.label}
                            </Link>
                            {item.source_url && (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-9 sm:flex-none"
                              >
                                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                                Source
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
