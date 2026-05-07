import { FileText, Globe, Plus, Search, StickyNote } from "lucide-react";
import Link from "next/link";
import { ItemEnrichmentWatch } from "@/components/item-enrichment-watch";
import { listItems } from "@/db/items";

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

function SourceIcon({ type }: { type: string }) {
  if (type === "pdf") return <FileText className="h-4 w-4" strokeWidth={2} />;
  if (type === "url") return <Globe className="h-4 w-4" strokeWidth={2} />;
  return <StickyNote className="h-4 w-4" strokeWidth={2} />;
}

export default function LibraryPage() {
  const items = listItems({ limit: 100 });

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
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/items/${it.id}`}
                className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors duration-[var(--duration-fast)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
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
                        <span className="text-[var(--warning)]" title={it.extraction_warning}>
                          ⚠ warning
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
