import { ArrowLeft, FileText, StickyNote, Globe } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySessionCookie } from "@/lib/auth";
import { getEmbedProvider } from "@/lib/embed/factory";
import { searchUnifiedDetailed, type SearchMode } from "@/lib/search";

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
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(searchNextPath({ q, mode: modeParam }))}`);
  }

  const query = q.trim();
  const mode: SearchMode = (VALID_MODES as string[]).includes(modeParam ?? "")
    ? (modeParam as SearchMode)
    : "fts";

  const needsEmbed = mode === "semantic" || mode === "hybrid";
  const ollamaDown = needsEmbed && !(await getEmbedProvider().isAlive());

  const results = query && !ollamaDown ? await searchUnifiedDetailed(query, { mode, limit: 100 }) : [];

  return (
    <div className="mx-auto max-w-[960px] px-8 py-10">
      <Link
        href="/library"
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
                  ? "border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
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
            AI search is unavailable
          </div>
          <p className="text-[var(--text-primary)]">
            Semantic and hybrid search need the local AI service to be reachable.
            Check AI services in Settings, or switch to Full-text search.
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
                    href={`/items/${it.id}${it.matchedSources.includes("manual_note") ? "?tab=notes" : ""}`}
                    className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                  >
                    <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">
                      <Icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-[16px] font-medium leading-snug text-[var(--text-primary)]">
                        {it.title}
                      </h2>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        <span className="uppercase">{it.source_type}</span>
                        <span className="mx-2 text-[var(--text-muted)]">·</span>
                        {formatRelative(it.captured_at)}
                      </p>
                      {it.matchedSources.includes("manual_note") && (
                        <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
                          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent-11)]">
                            Matched in My notes
                          </p>
                          {it.noteSnippet && (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                              {it.noteSnippet}
                            </p>
                          )}
                        </div>
                      )}
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

function searchNextPath(params: { q?: string; mode?: string }): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.mode) qs.set("mode", params.mode);
  const query = qs.toString();
  return query ? `/search?${query}` : "/search";
}
