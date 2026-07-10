import { ArrowLeft, FileText, Globe, MessageSquare, StickyNote } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCollection, listItemsInCollection } from "@/db/collections";
import { verifySessionCookie } from "@/lib/auth";
import { platformLabel, qualityLabel } from "@/lib/capture/quality";
import { getScopeHealth } from "@/lib/library/scope-health";

function formatRelative(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function iconFor(type: string) {
  if (type === "pdf") return FileText;
  if (type === "url") return Globe;
  return StickyNote;
}

function excerpt(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= 180) return text;
  return `${text.slice(0, 177).trim()}...`;
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect(`/unlock?next=${encodeURIComponent(`/collections/${id}`)}`);
  }

  const collection = getCollection(id);
  if (!collection) notFound();
  const items = listItemsInCollection(id);
  const scopeHealth = getScopeHealth(items);

  return (
    <div className="mx-auto max-w-[960px] px-5 pb-32 pt-8 md:px-8 md:py-10">
      <Link
        href="/settings/collections"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        All collections
      </Link>

      <header className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
            {collection.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {items.length} item{items.length === 1 ? "" : "s"}
            {collection.kind === "auto" && (
              <span className="ml-2 rounded-sm border border-[var(--border)] px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                auto
              </span>
            )}
          </p>
          {collection.description && (
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-[var(--text-secondary)]">
              {collection.description}
            </p>
          )}
          <ScopeHealthSummary
            total={scopeHealth.total}
            readable={scopeHealth.readable}
            weak={scopeHealth.weak}
          />
        </div>
        {items.length > 0 && (
          <Link
            href={`/ask?scope=collection&collection=${collection.id}`}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] md:h-9 md:w-auto"
          >
            <MessageSquare className="h-4 w-4" strokeWidth={2} />
            Ask collection
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            No items in this collection yet.
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Collections show saved items after they are added from existing
            library controls.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => {
            const Icon = iconFor(it.source_type);
            const platform = platformLabel(it.source_platform, it.source_type);
            const quality = qualityLabel(it.capture_quality);
            return (
              <li key={it.id}>
                <Link
                  href={`/items/${it.id}`}
                  className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]"
                    strokeWidth={2}
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-[16px] font-medium leading-snug text-[var(--text-primary)]">
                      {it.title}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      <span className="uppercase tracking-wide">{platform}</span>
                      <span className="mx-2 text-[var(--text-muted)]">-</span>
                      {quality}
                      <span className="mx-2 text-[var(--text-muted)]">-</span>
                      {formatRelative(it.captured_at)}
                    </p>
                    {it.body && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {excerpt(it.body)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScopeHealthSummary({
  total,
  readable,
  weak,
}: {
  total: number;
  readable: number;
  weak: number;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs">
      <span className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)]">
        {total} {total === 1 ? "item" : "items"}
      </span>
      <span className="inline-flex h-7 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--text-secondary)]">
        {readable} readable
      </span>
      {weak > 0 && (
        <span className="inline-flex h-7 items-center rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-2.5 font-medium text-[var(--quality-needs-upgrade)]">
          {weak} need upgrade
        </span>
      )}
      {weak > 0 && (
        <p className="basis-full text-sm text-[var(--text-secondary)]">
          Some items in this collection may need richer text before scoped Ask can use them well.
        </p>
      )}
    </div>
  );
}
