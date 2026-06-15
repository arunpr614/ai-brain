import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileText,
  StickyNote,
  Video,
} from "lucide-react";
import Link from "next/link";
import type { ItemRow } from "@/db/client";
import { listNeedsUpgradeItems } from "@/db/items";
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

export default function NeedsUpgradePage() {
  const items = listNeedsUpgradeItems({ limit: 200 });

  return (
    <div className="mx-auto max-w-[980px] px-8 py-10">
      <Link
        href="/library"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
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
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const action = nextAction(item);
            const ActionIcon = action.icon;
            const reason =
              needsUpgradeReason({
                source_platform: item.source_platform,
                capture_quality: item.capture_quality,
                extraction_warning: item.extraction_warning,
              }) ?? "Needs readable text";
            const hint = improvementHint(item.source_platform, item.capture_quality);

            return (
              <li
                key={item.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 shrink-0 text-[var(--text-muted)]">
                    <SourceIcon item={item} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link href={`/items/${item.id}`} className="min-w-0">
                        <h2 className="truncate text-[18px] font-medium leading-7 text-[var(--text-primary)] hover:text-[var(--accent-11)]">
                          {item.title}
                        </h2>
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

                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Link
                      href={action.href}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[var(--accent-9)] px-3 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
                    >
                      <ActionIcon className="h-3.5 w-3.5" strokeWidth={2} />
                      {action.label}
                    </Link>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
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
      )}
    </div>
  );
}
