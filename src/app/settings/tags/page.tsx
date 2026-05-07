import Link from "next/link";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";
import {
  deleteTagAction,
  promoteTagAction,
  renameTagAction,
} from "@/app/taxonomy-actions";
import { countItemsForTag, listAllTags } from "@/db/tags";

export default function TagsSettingsPage() {
  const tags = listAllTags();

  return (
    <div className="mx-auto max-w-[720px] px-8 py-10">
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Settings
      </Link>

      <h1 className="mb-1 text-[24px] font-semibold text-[var(--text-primary)]">Tags</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        <Sparkles className="inline h-3 w-3 text-[var(--accent-9)]" strokeWidth={2} /> marks auto-tags created by enrichment. Promote them to lock in (re-enrichment won&rsquo;t clear them).
      </p>

      {tags.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No tags yet. Capture a few items — enrichment will generate tags.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tags.map((t) => {
            const count = countItemsForTag(t.id);
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <form action={renameTagAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  {t.kind === "auto" && (
                    <Sparkles
                      className="h-3.5 w-3.5 shrink-0 text-[var(--accent-9)]"
                      strokeWidth={2}
                    />
                  )}
                  <input
                    name="name"
                    defaultValue={t.name}
                    className="flex-1 rounded-sm border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs text-[var(--text-primary)] hover:border-[var(--border)] focus:border-[var(--accent-9)]"
                  />
                  <button
                    type="submit"
                    className="rounded-sm px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                  >
                    Rename
                  </button>
                </form>
                <span className="text-xs text-[var(--text-muted)]">
                  {count} item{count === 1 ? "" : "s"}
                </span>
                {t.kind === "auto" && (
                  <form action={promoteTagAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button
                      type="submit"
                      className="rounded-sm px-2 py-0.5 text-xs text-[var(--accent-11)] hover:bg-[var(--surface-raised)]"
                    >
                      Promote
                    </button>
                  </form>
                )}
                <form action={deleteTagAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    aria-label={`Delete ${t.name}`}
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
