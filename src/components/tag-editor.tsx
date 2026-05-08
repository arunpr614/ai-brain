"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import {
  addTagToItemAction,
  removeTagFromItemAction,
} from "@/app/taxonomy-actions";
import type { TagRow } from "@/db/tags";

/**
 * F-302: inline tag editor on the item detail page.
 * Mirrors the CollectionEditor shape so the two cards feel sibling:
 *   - attached tags render as pills with × buttons
 *   - an input + Add button appends a new manual tag
 *   - auto tags get a subtler border so the user can see which tags came
 *     from the LLM vs which they set themselves
 *
 * Dedup is handled server-side by the `upsertTag` unique constraint on
 * (name, kind); we don't pre-check client-side.
 */
export function TagEditor({
  itemId,
  tags,
}: {
  itemId: string;
  tags: TagRow[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const isManual = t.kind === "manual";
          return (
            <form
              key={t.id}
              action={removeTagFromItemAction}
              className="inline-flex items-center gap-1"
            >
              <input type="hidden" name="item_id" value={itemId} />
              <input type="hidden" name="tag_id" value={t.id} />
              <span
                className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs ${
                  isManual
                    ? "border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                    : "border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]"
                }`}
                title={isManual ? "Manual tag" : "Auto-generated tag"}
              >
                {t.name}
                <button
                  type="submit"
                  aria-label={`Remove tag ${t.name}`}
                  className="rounded-full hover:bg-[var(--surface)]"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </span>
            </form>
          );
        })}
        {tags.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">
            No tags yet.
          </span>
        )}
      </div>
      <form
        ref={formRef}
        action={async (formData) => {
          await addTagToItemAction(formData);
          formRef.current?.reset();
        }}
        className="flex gap-1"
      >
        <input type="hidden" name="item_id" value={itemId} />
        <input
          type="text"
          name="tag_name"
          placeholder="+ add tag…"
          maxLength={60}
          required
          className="h-7 flex-1 rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <button
          type="submit"
          className="h-7 rounded-sm bg-[var(--accent-9)] px-2 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
        >
          Add
        </button>
      </form>
    </div>
  );
}
