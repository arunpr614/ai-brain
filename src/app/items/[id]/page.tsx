import { ArrowLeft, Download, ExternalLink, MessageSquare, Quote, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteItemAction } from "@/app/actions";
import { CollectionEditor } from "@/components/collection-editor";
import { ItemEnrichmentWatch } from "@/components/item-enrichment-watch";
import { RelatedItems } from "@/components/related-items";
import { ScrollToHash } from "@/components/scroll-to-hash";
import { TagEditor } from "@/components/tag-editor";
import {
  listCollections,
  listCollectionsForItem,
} from "@/db/collections";
import { listChunksForItem } from "@/db/chunks";
import { getItem } from "@/db/items";
import { listTagsForItem } from "@/db/tags";
import { findRelatedItems } from "@/lib/related";

function parseQuotes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export default async function ItemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { id } = await params;
  const { highlight } = await searchParams;
  const item = getItem(id);
  if (!item) notFound();

  const captured = new Date(item.captured_at).toLocaleString();
  const tags = listTagsForItem(item.id);
  const attachedCollections = listCollectionsForItem(item.id);
  const availableCollections = listCollections("manual");
  const quotes = parseQuotes(item.quotes);
  const hasDigest =
    item.enrichment_state === "done" && (item.summary || quotes.length > 0);
  const hasAnyCollections =
    attachedCollections.length > 0 || availableCollections.length > 0;

  // T-12: when arriving via an Ask citation chip, resolve the chunk body so
  // we can render a highlight panel with an anchor the scroll-to-hash hook
  // can find. Silently ignore invalid/foreign chunk_ids — the chip just
  // looks like a regular item link.
  const highlightedChunk = highlight
    ? listChunksForItem(item.id).find((c) => c.id === highlight) ?? null
    : null;

  // T-15 (EXP-3): pure DB operation — no network / Ollama. Safe on every
  // item-detail render. Returns [] if this item has no embedded chunks yet,
  // and RelatedItems component renders nothing in that case.
  const related = findRelatedItems(item.id, { limit: 5 });

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      <ScrollToHash />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to Library
      </Link>

      {highlightedChunk && (
        <aside
          id={`chunk-${highlightedChunk.id}`}
          className="mb-8 rounded-lg border border-[var(--accent-9)] bg-[var(--accent-3)] p-4"
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--accent-11)]">
            <Quote className="h-3.5 w-3.5" strokeWidth={2} />
            Cited passage
          </div>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
            {highlightedChunk.body}
          </p>
        </aside>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,68ch)_360px]">
        {/* LEFT: original content */}
        <article className="article">
          <header className="mb-6 border-b border-[var(--border)] pb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-sans text-[28px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-primary)]">
                {item.title}
              </h1>
              <ItemEnrichmentWatch
                itemId={item.id}
                initialState={item.enrichment_state}
              />
            </div>
            <p className="mt-2 font-sans text-xs text-[var(--text-secondary)]">
              <span className="uppercase tracking-wide">{item.source_type}</span>
              {item.author && (
                <>
                  <span className="mx-2 text-[var(--text-muted)]">·</span>
                  <span>{item.author}</span>
                </>
              )}
              <span className="mx-2 text-[var(--text-muted)]">·</span>
              <span>captured {captured}</span>
              {item.total_pages && (
                <>
                  <span className="mx-2 text-[var(--text-muted)]">·</span>
                  <span>{item.total_pages} pages</span>
                </>
              )}
              {item.total_chars && (
                <>
                  <span className="mx-2 text-[var(--text-muted)]">·</span>
                  <span>{item.total_chars.toLocaleString()} chars</span>
                </>
              )}
            </p>

            {item.source_url && (
              <p className="mt-2">
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-sans text-xs text-[var(--accent-11)] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  {new URL(item.source_url).hostname}
                </a>
              </p>
            )}

            {item.extraction_warning && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--warning)] bg-[var(--surface)] px-2 py-1 font-sans text-xs text-[var(--warning)]">
                ⚠ {item.extraction_warning}
              </p>
            )}
          </header>

          <div className="whitespace-pre-wrap">{item.body}</div>

          <footer className="mt-12 flex items-center gap-3 border-t border-[var(--border)] pt-6">
            <Link
              href={`/items/${item.id}/ask`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
              Ask this item
            </Link>
            <a
              href={`/api/items/${item.id}/export.md`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Export as .md
            </a>
            <form
              action={async () => {
                "use server";
                await deleteItemAction(item.id);
              }}
              className="ml-auto"
            >
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 font-sans text-sm font-medium text-[var(--danger)] transition-colors hover:border-[var(--danger)] hover:bg-[var(--surface)]"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                Delete
              </button>
            </form>
          </footer>
        </article>

        {/* RIGHT: Collections + AI digest */}
        <aside className="flex flex-col gap-6 font-sans text-sm lg:sticky lg:top-8 lg:self-start">
          {/* F-302: inline tag editor — always visible so the user can
              attach/detach tags without going to /settings/tags. */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Tags
            </p>
            <TagEditor itemId={item.id} tags={tags} />
          </div>

          {/* T-15 (EXP-3): related items by semantic similarity. Hidden
              when the item has no embeddings yet. */}
          <RelatedItems items={related} />

          {/* F-301: Collections editor — always visible so the user can
              attach/detach without waiting for enrichment to finish. */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              Collections
            </p>
            {hasAnyCollections ? (
              <CollectionEditor
                itemId={item.id}
                attached={attachedCollections}
                available={availableCollections}
              />
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Create one in{" "}
                <Link
                  href="/settings/collections"
                  className="text-[var(--accent-11)] hover:underline"
                >
                  Settings → Collections
                </Link>{" "}
                to start organizing.
              </p>
            )}
          </div>

          {hasDigest ? (
            <div className="flex flex-col gap-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              {item.category && (
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Category
                  </p>
                  <span className="inline-flex rounded-full bg-[var(--accent-3)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-11)]">
                    {item.category}
                  </span>
                </div>
              )}

              {item.summary && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Summary
                  </p>
                  <div className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)]">
                    {item.summary}
                  </div>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Key quotes
                  </p>
                  <ul className="flex flex-col gap-2">
                    {quotes.map((q, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[var(--accent-9)] pl-3 italic text-[var(--text-secondary)]"
                      >
                        &ldquo;{q}&rdquo;
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-[var(--text-muted)]">
                Auto-generated by Ollama (local).
              </p>
            </div>
          ) : (
            <DigestPlaceholder state={item.enrichment_state} />
          )}
        </aside>
      </div>
    </div>
  );
}

function DigestPlaceholder({
  state,
}: {
  state: "pending" | "running" | "done" | "error";
}) {
  const copy =
    state === "error"
      ? "Enrichment failed. Check the Ollama server log."
      : state === "running"
        ? "AI digest will appear here once the enrichment worker finishes."
        : "AI digest will appear here once the enrichment worker picks this item up.";
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 font-sans text-sm text-[var(--text-secondary)]">
      {copy}
    </div>
  );
}
