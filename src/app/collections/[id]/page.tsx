import { ArrowLeft, FileText, Globe, StickyNote } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollection, listItemsInCollection } from "@/db/collections";

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

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) notFound();
  const items = listItemsInCollection(id);

  return (
    <div className="mx-auto max-w-[960px] px-8 py-10">
      <Link
        href="/settings/collections"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        All collections
      </Link>

      <header className="mb-6">
        <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
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
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No items in this collection yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => {
            const Icon = iconFor(it.source_type);
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
                    <h2 className="truncate text-[16px] font-medium text-[var(--text-primary)]">
                      {it.title}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      <span className="uppercase tracking-wide">{it.source_type}</span>
                      <span className="mx-2 text-[var(--text-muted)]">·</span>
                      {formatRelative(it.captured_at)}
                    </p>
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
