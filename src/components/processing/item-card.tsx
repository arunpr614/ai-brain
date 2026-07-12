"use client";

import { ArrowUpRight, Check, Circle, FileText, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { STATUS_LABELS, type ProcessingItem, type WorkflowMutationResult } from "./types";
import { WorkflowControls } from "./workflow-controls";

export function ProcessingItemCard({
  item,
  selected,
  onSelect,
  onResult,
  onError,
  dense = false,
}: {
  item: ProcessingItem;
  selected: boolean;
  onSelect: () => void;
  onResult: (result: WorkflowMutationResult, message: string) => void;
  onError: (message: string, kind: "error" | "conflict" | "unknown") => void;
  dense?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const captured = relativeTime(item.capturedAt);
  const entered = item.inboxEnteredAt ? relativeTime(item.inboxEnteredAt) : null;
  const returnContext = `${pathname}${searchParams.size ? `?${searchParams}` : ""}`;
  const href = `/items/${encodeURIComponent(item.id)}?return=${encodeURIComponent(returnContext)}&anchor=${encodeURIComponent(item.id)}`;

  return (
    <li
      id={`processing-item-${item.id}`}
      tabIndex={-1}
      className={`group scroll-mb-24 rounded-lg border bg-[var(--surface)] transition-colors duration-[var(--duration-fast)] ${
        selected
          ? "border-[var(--control-selected-border)] bg-[var(--control-selected-bg)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      } ${dense ? "p-3" : "p-4"}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`Select ${item.title} for processing`}
          className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] md:h-8 md:w-8"
        >
          {selected ? <Check className="h-4 w-4" strokeWidth={2.2} /> : <MousePointer2 className="h-4 w-4" strokeWidth={2} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">
                {item.title}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {sourceLabel(item.sourceType)}
                </span>
                <span>Captured {captured}</span>
                {entered && item.workflowStatus === "inbox" && <span>Waiting {entered}</span>}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
              {item.workflowStatus === "done" ? (
                <Check className="h-3 w-3 text-[var(--success)]" />
              ) : (
                <Circle className="h-2.5 w-2.5 fill-current text-[var(--text-muted)]" />
              )}
              {item.archivedAt ? "Archived" : STATUS_LABELS[item.workflowStatus]}
            </span>
          </div>

          {!dense && item.excerpt && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
              {item.excerpt}
            </p>
          )}

          {(item.userTags.length > 0 || item.aiTopics.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.userTags.slice(0, 2).map((tag) => (
                <span key={`tag-${tag.id}`} className="rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  {tag.name}
                </span>
              ))}
              {item.aiTopics.slice(0, 2).map((topic) => (
                <span key={`topic-${topic.id}`} className="rounded-md bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  {topic.name}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
            <Link
              href={href}
              aria-label={`Open ${item.title}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] md:min-h-9"
            >
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <WorkflowControls item={item} compact onResult={onResult} onError={onError} />
          </div>
        </div>
      </div>
    </li>
  );
}

function sourceLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function relativeTime(value: string | number): string {
  const raw = typeof value === "number" ? value : Date.parse(value);
  const timestamp = raw < 10_000_000_000 ? raw * 1000 : raw;
  if (!Number.isFinite(timestamp)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
