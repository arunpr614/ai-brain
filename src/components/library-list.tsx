"use client";

import { FileText, Globe, StickyNote, Trash2, Video, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  bulkAttachCollectionAction,
  bulkDeleteItemsAction,
  bulkTagItemsAction,
} from "@/app/actions";
import type { CollectionRow } from "@/db/collections";
import type { ItemRow } from "@/db/client";
import { ItemEnrichmentWatch } from "./item-enrichment-watch";

/**
 * F-207 library bulk-select UI.
 *
 * Selection state (Set<string> of ids) is local to this client component.
 * Checkboxes render next to each row but are only visible when any item
 * is selected OR the row is hovered — keeps the default "clean library"
 * feel from v0.1.0.
 *
 * The floating BulkBar appears once selectedIds.size > 0 and offers three
 * actions: Tag, Add to collection, Delete. All three go through the server
 * actions in src/app/actions.ts and use useTransition() for back-pressure
 * (F-053).
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
  return "⚠ warning";
}

function SourceIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText className="h-4 w-4" strokeWidth={2} />;
  if (type === "url") return <Globe className="h-4 w-4" strokeWidth={2} />;
  if (type === "youtube") return <Video className="h-4 w-4" strokeWidth={2} />;
  return <StickyNote className="h-4 w-4" strokeWidth={2} />;
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
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const clear = useCallback(() => setSelectedIds(new Set()), []);

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
          setFlash(
            `Tagged ${res.count} ${res.count === 1 ? "item" : "items"} with “${tagName}”.`,
          );
          clear();
          router.refresh();
        } else {
          setFlash(`Error: ${res.error}`);
        }
      });
    },
    [selectedIds, clear, router],
  );

  const handleBulkCollection = useCallback(
    (collectionId: string) => {
      const ids = Array.from(selectedIds);
      const c = collections.find((x) => x.id === collectionId);
      startTransition(async () => {
        const res = await bulkAttachCollectionAction(ids, collectionId);
        if (res.ok) {
          setFlash(
            `Added ${res.count} ${res.count === 1 ? "item" : "items"} to “${c?.name ?? "collection"}”.`,
          );
          clear();
          router.refresh();
        } else {
          setFlash(`Error: ${res.error}`);
        }
      });
    },
    [selectedIds, collections, clear, router],
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    const n = ids.length;
    if (!window.confirm(`Delete ${n} ${n === 1 ? "item" : "items"}? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const res = await bulkDeleteItemsAction(ids);
      if (res.ok) {
        setFlash(`Deleted ${res.count} ${res.count === 1 ? "item" : "items"}.`);
        clear();
        router.refresh();
      } else {
        setFlash(`Error: ${res.error}`);
      }
    });
  }, [selectedIds, clear, router]);

  // Auto-dismiss flash after 3s.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(t);
  }, [flash]);

  const anySelected = selectedIds.size > 0;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((it) => {
          const checked = selectedIds.has(it.id);
          return (
            <li key={it.id} className="group/row">
              <div
                className={`flex items-start gap-3 rounded-lg border bg-[var(--surface)] p-4 transition-colors duration-[var(--duration-fast)] ${
                  checked
                    ? "border-[var(--accent-9)] bg-[var(--surface-raised)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <label
                  className={`mt-0.5 shrink-0 cursor-pointer ${
                    anySelected ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
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
                      <h2 className="truncate text-[18px] font-medium leading-[1.55] text-[var(--text-primary)]">
                        {it.title}
                      </h2>
                      <span className="shrink-0">
                        <ItemEnrichmentWatch
                          itemId={it.id}
                          initialState={it.enrichment_state}
                        />
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <span className="uppercase tracking-wide">{it.source_type}</span>
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

      {anySelected && (
        <BulkBar
          count={selectedIds.size}
          collections={collections}
          disabled={isPending}
          onTag={handleBulkTag}
          onAddToCollection={handleBulkCollection}
          onDelete={handleBulkDelete}
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

function BulkBar({
  count,
  collections,
  disabled,
  onTag,
  onAddToCollection,
  onDelete,
  onClear,
}: {
  count: number;
  collections: CollectionRow[];
  disabled: boolean;
  onTag: (tagName: string) => void;
  onAddToCollection: (collectionId: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [tagValue, setTagValue] = useState("");

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2 shadow-lg"
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {count} selected
      </span>

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
          className="h-7 rounded-sm bg-[var(--accent-9)] px-2 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)] disabled:opacity-50"
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
        onClick={onDelete}
        disabled={disabled}
        className="inline-flex h-7 items-center gap-1 rounded-sm border border-[var(--danger)] bg-transparent px-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--surface)] disabled:opacity-50"
      >
        <Trash2 className="h-3 w-3" strokeWidth={2} />
        Delete
      </button>

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
  );
}
