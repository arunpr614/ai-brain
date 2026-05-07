"use client";

import { X } from "lucide-react";
import type { CollectionRow } from "@/db/collections";
import {
  attachCollectionAction,
  detachCollectionAction,
} from "@/app/taxonomy-actions";

export function CollectionEditor({
  itemId,
  attached,
  available,
}: {
  itemId: string;
  attached: CollectionRow[];
  available: CollectionRow[];
}) {
  const unattached = available.filter(
    (c) => !attached.some((a) => a.id === c.id),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {attached.map((c) => (
          <form
            key={c.id}
            action={detachCollectionAction}
            className="inline-flex items-center gap-1"
          >
            <input type="hidden" name="item_id" value={itemId} />
            <input type="hidden" name="collection_id" value={c.id} />
            <span className="inline-flex items-center gap-1 rounded-sm border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs text-[var(--text-primary)]">
              {c.name}
              <button
                type="submit"
                aria-label={`Remove from ${c.name}`}
                className="rounded-full hover:bg-[var(--surface)]"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            </span>
          </form>
        ))}
        {attached.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">No collections yet.</span>
        )}
      </div>
      {unattached.length > 0 && (
        <form action={attachCollectionAction} className="flex gap-1">
          <input type="hidden" name="item_id" value={itemId} />
          <select
            name="collection_id"
            defaultValue=""
            className="h-7 flex-1 rounded-sm border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-xs text-[var(--text-primary)]"
          >
            <option value="" disabled>
              + add to collection…
            </option>
            {unattached.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-7 rounded-sm bg-[var(--accent-9)] px-2 text-xs font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
