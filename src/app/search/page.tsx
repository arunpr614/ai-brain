import { ArrowLeft, FileText, StickyNote, Globe } from "lucide-react";
import Link from "next/link";
import { searchItems } from "@/db/items";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function iconFor(type: string) {
  if (type === "pdf") return FileText;
  if (type === "url") return Globe;
  return StickyNote;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? searchItems(query, 100) : [];

  return (
    <div className="mx-auto max-w-[960px] px-8 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      <h1 className="mb-2 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Search
      </h1>
      <form action="/search" method="get" className="mb-8">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Find items by title or content..."
          autoFocus
          className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </form>

      {!query ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Type a query and press Enter.
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No matches for <span className="font-mono">&ldquo;{query}&rdquo;</span>.
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            {results.length} {results.length === 1 ? "result" : "results"} for{" "}
            <span className="font-mono text-[var(--text-secondary)]">
              &ldquo;{query}&rdquo;
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {results.map((it) => {
              const Icon = iconFor(it.source_type);
              return (
                <li key={it.id}>
                  <Link
                    href={`/items/${it.id}`}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                  >
                    <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[16px] font-medium text-[var(--text-primary)]">
                        {it.title}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        <span className="uppercase">{it.source_type}</span>
                        <span className="mx-2 text-[var(--text-muted)]">·</span>
                        {formatRelative(it.captured_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
