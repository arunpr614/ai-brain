import { Plus, Search, StickyNote } from "lucide-react";
import Link from "next/link";
import { LibraryList } from "@/components/library-list";
import { listCollections } from "@/db/collections";
import { listItems } from "@/db/items";

export default function LibraryPage() {
  const items = listItems({ limit: 100 });
  const collections = listCollections("manual");

  return (
    <div className="mx-auto max-w-[960px] px-8 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
            Library
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {items.length} {items.length === 1 ? "item" : "items"} captured
          </p>
        </div>
        <Link
          href="/capture"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--accent-10)]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Capture
        </Link>
      </header>

      <form action="/search" method="get" className="mb-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            strokeWidth={2}
          />
          <input
            name="q"
            type="search"
            placeholder="Search your library..."
            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <LibraryList items={items} collections={collections} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
      <StickyNote className="h-8 w-8 text-[var(--text-muted)]" strokeWidth={1.5} />
      <h2 className="mt-4 text-[18px] font-medium text-[var(--text-primary)]">
        Your library is empty
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Capture a URL, drop a PDF, or write a note.
      </p>
      <Link
        href="/capture"
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--accent-10)]"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Capture
      </Link>
    </div>
  );
}
