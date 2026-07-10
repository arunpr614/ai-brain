"use client";

import {
  FileText,
  Globe,
  MessageCircle,
  StickyNote,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  bulkAttachCollectionAction,
  bulkTagItemsAction,
} from "@/app/actions";
import type { CollectionRow } from "@/db/collections";
import type { ItemRow } from "@/db/client";
import {
  captureSourceLabel,
  isLimitedCaptureQuality,
  platformLabel,
  qualityLabel,
} from "@/lib/capture/quality";
import { isFullTextCapture, isNeedsUpgrade } from "@/lib/capture/upgrade-policy";
import { getAskSelectedActionState } from "@/lib/library/selected-actions";
import { ItemEnrichmentWatch } from "./item-enrichment-watch";
import { SourceLogo } from "./source-logo";

/**
 * F-207 library bulk-select UI.
 *
 * Selection state (Set<string> of ids) is local to this client component.
 * Checkboxes render next to each row. They stay visible on small screens
 * and appear on hover once there is enough room for a cleaner list view.
 *
 * The floating BulkBar appears once selectedIds.size > 0 and offers Ask,
 * Tag, and Add to collection. Mutating actions go through the server actions
 * in src/app/actions.ts and use useTransition() for back-pressure (F-053).
 */

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

/** Human label for extraction_warning values. v0.5.1 adds YouTube-specific
 *  codes (no_transcript, transcript_truncated_2h); older codes fall through
 *  to the generic label. The raw code remains visible via the title tooltip. */
function warningLabel(code: string): string {
  if (code === "no_transcript") return "⚠ no transcript";
  if (code === "transcript_truncated_2h") return "⚠ truncated at 2h";
  if (code === "youtube_antibot_metadata_only") return "⚠ metadata only";
  if (code === "youtube_transcript_fetch_metadata_only") return "⚠ metadata only";
  return "⚠ warning";
}

const DUPLICATE_METADATA_WARNING_CODES = new Set([
  "youtube_antibot_metadata_only",
  "youtube_transcript_fetch_metadata_only",
]);

function shouldShowMobileWarning(
  code: string | null | undefined,
  quality: string | null | undefined,
): code is string {
  if (!code) return false;
  if (quality === "metadata_only" && DUPLICATE_METADATA_WARNING_CODES.has(code)) {
    return false;
  }
  return true;
}

function SourceIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText className="h-4 w-4" strokeWidth={2} />;
  if (type === "url") return <Globe className="h-4 w-4" strokeWidth={2} />;
  if (type === "youtube") return <Video className="h-4 w-4" strokeWidth={2} />;
  return <StickyNote className="h-4 w-4" strokeWidth={2} />;
}

type LibraryFilter = "all" | "needs-upgrade" | "full-text" | "metadata-only";

function QualityBadge({ quality }: { quality: string | null | undefined }) {
  const limited = isLimitedCaptureQuality(quality);
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        limited
          ? "border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] text-[var(--quality-needs-upgrade)]"
          : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]"
      }`}
    >
      {qualityLabel(quality)}
    </span>
  );
}

export function LibraryList({
  items,
  collections,
}: {
  items: ItemRow[];
  collections: CollectionRow[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const clear = useCallback(() => setSelectedIds(new Set()), []);
  const showFlash = useCallback((message: string) => {
    setFlash(message);
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Esc clears selection.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds.size, clear]);

  const handleBulkTag = useCallback(
    (tagName: string) => {
      const ids = Array.from(selectedIds);
      startTransition(async () => {
        const res = await bulkTagItemsAction(ids, tagName);
        if (res.ok) {
          showFlash(
            `Applied tag to ${res.count} selected ${res.count === 1 ? "item" : "items"}.`,
          );
          clear();
        } else {
          showFlash(`Error: ${res.error}`);
        }
      });
    },
    [selectedIds, clear, showFlash],
  );

  const handleBulkCollection = useCallback(
    (collectionId: string) => {
      const ids = Array.from(selectedIds);
      const c = collections.find((x) => x.id === collectionId);
      startTransition(async () => {
        const res = await bulkAttachCollectionAction(ids, collectionId);
        if (res.ok) {
          showFlash(
            `Added ${res.count} selected ${res.count === 1 ? "item" : "items"} to “${c?.name ?? "collection"}”.`,
          );
          clear();
        } else {
          showFlash(`Error: ${res.error}`);
        }
      });
    },
    [selectedIds, collections, clear, showFlash],
  );

  const handleAskSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || ids.length > 50) return;
    const params = new URLSearchParams();
    params.set("scope", "selected");
    params.set("ids", ids.join(","));
    router.push(`/ask?${params.toString()}`);
  }, [selectedIds, router]);

  // Auto-dismiss flash after 3s.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const anySelected = selectedIds.size > 0;
  const filteredItems = items.filter((item) => matchesFilter(item, filter));

  return (
    <>
      <LibraryFilterBar
        active={filter}
        counts={{
          all: items.length,
          needsUpgrade: items.filter((item) => matchesFilter(item, "needs-upgrade")).length,
          fullText: items.filter((item) => matchesFilter(item, "full-text")).length,
          metadataOnly: items.filter((item) => matchesFilter(item, "metadata-only")).length,
        }}
        onChange={(next) => {
          setFilter(next);
          clear();
        }}
      />
      <ul className="flex flex-col gap-3">
        {filteredItems.map((it) => {
          const checked = selectedIds.has(it.id);
          const cardStateClass = checked
            ? "border-[var(--control-selected-border)] bg-[var(--control-selected-bg)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]";
          const mobileWarning = shouldShowMobileWarning(
            it.extraction_warning,
            it.capture_quality,
          )
            ? it.extraction_warning
            : null;
          return (
            <li key={it.id} className="group/row">
              <div
                className={`rounded-lg border bg-[var(--surface)] p-3.5 transition-colors duration-[var(--duration-fast)] md:hidden ${cardStateClass}`}
              >
                <div className="flex items-start gap-2.5">
                  <label
                    className="inline-flex w-8 min-w-8 shrink-0 cursor-pointer items-start justify-center pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(it.id)}
                      aria-label={`Select ${it.title}`}
                      className="h-[18px] w-[18px] cursor-pointer accent-[var(--accent-9)]"
                    />
                  </label>
                  <Link href={`/items/${it.id}`} className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 overflow-hidden text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
                      {it.title}
                    </h2>
                    <div className="mt-2 flex max-h-[52px] flex-wrap items-center gap-x-1.5 gap-y-1 overflow-hidden text-[11px] leading-4 text-[var(--text-secondary)]">
                      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                        <SourceLogo
                          platform={it.source_platform}
                          type={it.source_type}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className="truncate">
                          {platformLabel(it.source_platform, it.source_type)}
                        </span>
                      </span>
                      <QualityBadge quality={it.capture_quality} />
                      <ItemEnrichmentWatch
                        itemId={it.id}
                        initialState={it.enrichment_state}
                        compact
                      />
                      <span className="shrink-0">{formatRelative(it.captured_at)}</span>
                      {mobileWarning && (
                        <span
                          className="min-w-0 truncate text-[var(--warning)]"
                          title={mobileWarning}
                        >
                          {warningLabel(mobileWarning)}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              </div>
              <div
                className={`hidden items-start gap-3 rounded-lg border bg-[var(--surface)] p-4 transition-colors duration-[var(--duration-fast)] md:flex ${cardStateClass}`}
              >
                <label
                  className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-start justify-center pt-1 ${
                    anySelected
                      ? "opacity-100"
                      : "opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
                  } transition-opacity`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(it.id)}
                    aria-label={`Select ${it.title}`}
                    className="h-4 w-4 cursor-pointer accent-[var(--accent-9)]"
                  />
                </label>
                <Link
                  href={`/items/${it.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3"
                >
                  <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                    <SourceIcon type={it.source_type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="break-words text-[18px] font-medium leading-[1.55] text-[var(--text-primary)]">
                        {it.title}
                      </h2>
                      <span className="shrink-0">
                        <ItemEnrichmentWatch
                          itemId={it.id}
                          initialState={it.enrichment_state}
                        />
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span>{platformLabel(it.source_platform, it.source_type)}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span>via {captureSourceLabel(it.capture_source)}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <QualityBadge quality={it.capture_quality} />
                      <span className="text-[var(--text-muted)]">·</span>
                      <span>{formatRelative(it.captured_at)}</span>
                      {it.total_chars !== null && (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span>{it.total_chars.toLocaleString()} chars</span>
                        </>
                      )}
                      {it.extraction_warning && (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span
                            className="text-[var(--warning)]"
                            title={it.extraction_warning}
                          >
                            {warningLabel(it.extraction_warning)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {filteredItems.length === 0 && (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
          No items match this filter.
        </p>
      )}

      {anySelected && (
        <BulkBar
          count={selectedIds.size}
          collections={collections}
          disabled={isPending}
          onTag={handleBulkTag}
          onAddToCollection={handleBulkCollection}
          onAskSelected={handleAskSelected}
          onClear={clear}
        />
      )}

      {flash && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 rounded-md border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2 text-sm text-[var(--text-primary)] shadow-lg"
        >
          {flash}
        </div>
      )}
    </>
  );
}

function matchesFilter(item: ItemRow, filter: LibraryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "needs-upgrade") return isNeedsUpgrade(item);
  if (filter === "full-text") return isFullTextCapture(item);
  return item.capture_quality === "metadata_only";
}

function LibraryFilterBar({
  active,
  counts,
  onChange,
}: {
  active: LibraryFilter;
  counts: {
    all: number;
    needsUpgrade: number;
    fullText: number;
    metadataOnly: number;
  };
  onChange: (filter: LibraryFilter) => void;
}) {
  const options: Array<{ id: LibraryFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: counts.all },
    { id: "needs-upgrade", label: "Needs upgrade", count: counts.needsUpgrade },
    { id: "full-text", label: "Full text", count: counts.fullText },
    { id: "metadata-only", label: "Metadata only", count: counts.metadataOnly },
  ];

  return (
    <div
      role="tablist"
      aria-label="Library filter"
      className="mb-4 flex flex-wrap gap-2"
    >
      {options.map((option) => {
        const selected = option.id === active;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`inline-flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors ${
              selected
                ? "border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]"
                : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>{option.label}</span>
            <span className="text-[var(--text-muted)]">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function BulkBar({
  count,
  collections,
  disabled,
  onTag,
  onAddToCollection,
  onAskSelected,
  onClear,
}: {
  count: number;
  collections: CollectionRow[];
  disabled: boolean;
  onTag: (tagName: string) => void;
  onAddToCollection: (collectionId: string) => void;
  onAskSelected: () => void;
  onClear: () => void;
}) {
  const [tagValue, setTagValue] = useState("");
  const askState = getAskSelectedActionState(count);
  const askDisabled = disabled || askState.disabled;

  return (
    <>
      <div
        role="toolbar"
        aria-label="Selected source actions"
        className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 shadow-lg md:hidden"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {count} selected
        </span>
        <button
          type="button"
          onClick={onAskSelected}
          disabled={askDisabled}
          title={askState.title}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-50"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} />
          {askState.label}
        </button>
        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          disabled={disabled}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="fixed bottom-6 left-1/2 z-40 hidden max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2 shadow-lg md:flex"
      >
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {count} selected
        </span>

        <button
          type="button"
          onClick={onAskSelected}
          disabled={askDisabled}
          title={askState.title}
          className="inline-flex h-7 items-center gap-1 rounded-sm bg-[var(--action-primary-bg)] px-2 text-xs font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-50"
        >
          <MessageCircle className="h-3 w-3" strokeWidth={2} />
          {askState.label}
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = tagValue.trim();
            if (!name) return;
            onTag(name);
            setTagValue("");
          }}
          className="flex items-center gap-1"
        >
          <input
            type="text"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            placeholder="tag name"
            maxLength={60}
            disabled={disabled}
            className="h-7 w-28 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || !tagValue.trim()}
            className="h-7 rounded-sm bg-[var(--action-primary-bg)] px-2 text-xs font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-50"
          >
            Tag
          </button>
        </form>

        <div className="flex items-center gap-1">
          <select
            defaultValue=""
            disabled={disabled || collections.length === 0}
            onChange={(e) => {
              if (e.target.value) {
                onAddToCollection(e.target.value);
                e.currentTarget.value = "";
              }
            }}
            className="h-7 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-primary)] disabled:opacity-50"
            title={
              collections.length === 0
                ? "Create a collection in Settings first"
                : "Add selected items to a collection"
            }
          >
            <option value="" disabled>
              + collection
            </option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          aria-label="Clear selection"
          onClick={onClear}
          disabled={disabled}
          className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    </>
  );
}
