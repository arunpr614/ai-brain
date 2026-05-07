import Link from "next/link";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import { countItemsInCollection, listCollections } from "@/db/collections";
import {
  createCollectionAction,
  deleteCollectionAction,
  renameCollectionAction,
} from "@/app/taxonomy-actions";

export default function CollectionsSettingsPage() {
  const collections = listCollections();

  return (
    <div className="mx-auto max-w-[720px] px-8 py-10">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Settings
      </Link>

      <h1 className="mb-6 text-[24px] font-semibold text-[var(--text-primary)]">Collections</h1>

      <form action={createCollectionAction} className="mb-8 flex gap-2">
        <input
          name="name"
          type="text"
          required
          maxLength={120}
          placeholder="New collection name"
          className="h-9 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
        >
          Create
        </button>
      </form>

      {collections.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No collections yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {collections.map((c) => {
            const count = countItemsInCollection(c.id);
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <form action={renameCollectionAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    name="name"
                    defaultValue={c.name}
                    className="flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-sm text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--accent-9)]"
                  />
                  <button
                    type="submit"
                    className="rounded-sm px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                  >
                    Rename
                  </button>
                </form>
                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  {c.kind === "auto" && (
                    <Sparkles className="h-3 w-3 text-[var(--accent-9)]" strokeWidth={2} />
                  )}
                  {count} item{count === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/collections/${c.id}`}
                  className="text-xs text-[var(--accent-11)] hover:underline"
                >
                  View
                </Link>
                <form action={deleteCollectionAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${c.name}`}
                    className="rounded-sm p-1 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--danger)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
