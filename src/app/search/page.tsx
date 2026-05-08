import { ArrowLeft, FileText, StickyNote, Globe } from "lucide-react";
import Link from "next/link";
import { isOllamaAlive } from "@/lib/llm/ollama";
import { searchUnified, type SearchMode } from "@/lib/search";

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

const VALID_MODES: SearchMode[] = ["fts", "semantic", "hybrid"];

function modeLabel(m: SearchMode): string {
  if (m === "fts") return "Full-text";
  if (m === "semantic") return "Semantic";
  return "Hybrid";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q = "", mode: modeParam } = await searchParams;
  const query = q.trim();
  const mode: SearchMode = (VALID_MODES as string[]).includes(modeParam ?? "")
    ? (modeParam as SearchMode)
    : "fts";

  const needsOllama = mode === "semantic" || mode === "hybrid";
  const ollamaDown = needsOllama && !(await isOllamaAlive());

  const results = query && !ollamaDown ? await searchUnified(query, { mode, limit: 100 }) : [];

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
      <form action="/search" method="get" className="mb-4">
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Find items by title or content..."
          autoFocus
          className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <input type="hidden" name="mode" value={mode} />
      </form>

      <div className="mb-8 flex items-center gap-1.5">
        {VALID_MODES.map((m) => {
          const active = m === mode;
          const href = `/search?q=${encodeURIComponent(query)}&mode=${m}`;
          return (
            <Link
              key={m}
              href={href}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]"
                  : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {modeLabel(m)}
            </Link>
          );
        })}
      </div>

      {ollamaDown ? (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)]">
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider">
            Ollama offline
          </div>
          <p className="text-[var(--text-primary)]">
            Semantic and hybrid modes need a running Ollama daemon. Start it with{" "}
            <code className="font-mono">ollama serve</code> and refresh.
          </p>
        </div>
      ) : !query ? (
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
            </span>{" "}
            · {modeLabel(mode).toLowerCase()}
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
