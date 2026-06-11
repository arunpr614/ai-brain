import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  SearchX,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { platformLabel, qualityLabel } from "@/lib/capture/quality";
import {
  listAttentionItems,
  summarizeAttentionItems,
  type ReviewItem,
  type ReviewReason,
  type ReviewReasonCode,
} from "@/lib/review/attention";
import { deleteReviewItemAction } from "./actions";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function sourceHost(url: string | null): string {
  if (!url) return "source";
  try {
    return new URL(url).hostname;
  } catch {
    return "source";
  }
}

function reasonTone(code: ReviewReasonCode): string {
  if (code === "add_text" || code === "substack_preview" || code === "metadata_only") {
    return "border-[var(--warning)] text-[var(--warning)]";
  }
  if (code === "capture_failed" || code === "summary_failed" || code === "semantic_failed") {
    return "border-[var(--danger)] text-[var(--danger)]";
  }
  return "border-[var(--border-strong)] text-[var(--text-secondary)]";
}

function primaryAction(item: ReviewItem, reason: ReviewReason): { href: string; label: string; external: boolean } {
  if (reason.code === "add_text") {
    return { href: `/items/${item.id}#upgrade-text`, label: reason.actionLabel, external: false };
  }
  if (reason.code === "substack_preview" && item.source_url) {
    return { href: item.source_url, label: reason.actionLabel, external: true };
  }
  return { href: `/items/${item.id}`, label: reason.actionLabel, external: false };
}

export default function ReviewPage() {
  const items = listAttentionItems({ limit: 300 });
  const summary = summarizeAttentionItems(items);
  const textUpgrades = summary.add_text + summary.substack_preview + summary.metadata_only;
  const failures = summary.capture_failed + summary.summary_failed + summary.semantic_failed;
  const searchIssues = summary.semantic_missing;
  const duplicates = summary.duplicate_source;

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.2] text-[var(--text-primary)]">
            Review
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {items.length} {items.length === 1 ? "capture" : "captures"} need attention
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          Library
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
        </Link>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Review summary">
        <SummaryStat icon={FileText} label="Need text" value={textUpgrades} />
        <SummaryStat icon={AlertTriangle} label="Failures" value={failures} />
        <SummaryStat icon={SearchX} label="Search gaps" value={searchIssues} />
        <SummaryStat icon={Link2} label="Duplicates" value={duplicates} />
      </section>

      {items.length === 0 ? (
        <EmptyReview />
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <ReviewRow key={item.id} item={item} />
          ))}
        </ol>
      )}
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-secondary)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div>
        <p className="text-[20px] font-semibold leading-none text-[var(--text-primary)]">{value}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{label}</p>
      </div>
    </div>
  );
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const primary = item.attention_reasons[0];
  const action = primary ? primaryAction(item, primary) : null;

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.attention_reasons.map((reason) => (
              <span
                key={reason.code}
                className={`inline-flex h-6 items-center rounded-full border px-2 text-[11px] font-medium ${reasonTone(reason.code)}`}
              >
                {reason.label}
              </span>
            ))}
          </div>

          <Link
            href={`/items/${item.id}`}
            className="mt-3 block truncate text-[18px] font-medium leading-[1.45] text-[var(--text-primary)] hover:text-[var(--accent-11)]"
          >
            {item.title}
          </Link>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {platformLabel(item.source_platform, item.source_type)}
            <span className="mx-2 text-[var(--text-muted)]">·</span>
            {qualityLabel(item.capture_quality)}
            <span className="mx-2 text-[var(--text-muted)]">·</span>
            {formatRelative(item.captured_at)}
            {item.total_chars !== null && (
              <>
                <span className="mx-2 text-[var(--text-muted)]">·</span>
                {item.total_chars.toLocaleString()} chars
              </>
            )}
          </p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {item.attention_reasons.map((reason) => (
              <li key={`${item.id}-${reason.code}`} className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {reason.detail}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[300px] lg:justify-end">
          {action && action.external ? (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)]"
            >
              {action.label}
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          ) : (
            action && (
              <Link
                href={action.href}
                className="inline-flex h-8 items-center gap-2 rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)]"
              >
                {action.label}
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            )
          )}

          <Link
            href={`/items/${item.id}`}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            Open item
          </Link>

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              title={sourceHost(item.source_url)}
            >
              Source
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}

          <form action={deleteReviewItemAction}>
            <input type="hidden" name="item_id" value={item.id} />
            <button
              type="submit"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--surface-raised)]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              Delete
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

function EmptyReview() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <CheckCircle2 className="h-9 w-9 text-[var(--success)]" strokeWidth={1.6} />
      <h2 className="mt-4 text-[18px] font-medium text-[var(--text-primary)]">
        Nothing needs attention
      </h2>
      <p className="mt-1 max-w-[440px] text-sm leading-relaxed text-[var(--text-secondary)]">
        Weak captures, failed processing, search gaps, and duplicate source URLs will appear here.
      </p>
    </div>
  );
}
