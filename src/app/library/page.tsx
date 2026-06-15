import { MessageSquare, Plus, Search, StickyNote } from "lucide-react";
import Link from "next/link";
import { LibraryList } from "@/components/library-list";
import { MobileLibraryFilters } from "@/components/mobile-library-filters";
import { listCollections } from "@/db/collections";
import {
  countItems,
  countNeedsUpgradeItems,
  listItems,
  type LibraryQualityFilter,
  type LibrarySourceFilter,
} from "@/db/items";

const SOURCE_FILTERS: Array<{ value: LibrarySourceFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "youtube", label: "YouTube" },
  { value: "pdf", label: "PDFs" },
  { value: "note", label: "Notes" },
  { value: "telegram", label: "Telegram" },
];

const QUALITY_FILTERS: Array<{ value: LibraryQualityFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "full_text", label: "Full text" },
  { value: "transcript", label: "Transcript" },
  { value: "needs_upgrade", label: "Needs upgrade" },
];

function parseSourceFilter(value: string | undefined): LibrarySourceFilter {
  return SOURCE_FILTERS.some((filter) => filter.value === value)
    ? (value as LibrarySourceFilter)
    : "all";
}

function parseQualityFilter(value: string | undefined): LibraryQualityFilter {
  return QUALITY_FILTERS.some((filter) => filter.value === value)
    ? (value as LibraryQualityFilter)
    : "all";
}

function filterHref({
  source,
  quality,
  tag,
}: {
  source: LibrarySourceFilter;
  quality: LibraryQualityFilter;
  tag?: string;
}): string {
  const params = new URLSearchParams();
  if (source !== "all") params.set("source", source);
  if (quality !== "all") params.set("quality", quality);
  if (tag) params.set("tag", tag);
  const qs = params.toString();
  return qs ? `/library?${qs}` : "/library";
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; quality?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const source = parseSourceFilter(params.source);
  const quality = parseQualityFilter(params.quality);
  const tag = params.tag?.trim() || undefined;
  const items = listItems({ limit: 100, source, quality, tag });
  const totalCount = countItems();
  const filteredCount = countItems({ source, quality, tag });
  const collections = listCollections("manual");
  const needsUpgradeCount = countNeedsUpgradeItems();
  const hasFilters = source !== "all" || quality !== "all" || Boolean(tag);
  const sourceLabel = SOURCE_FILTERS.find((filter) => filter.value === source)?.label ?? "All";
  const qualityLabel =
    QUALITY_FILTERS.find((filter) => filter.value === quality)?.label ?? "All";
  const activeFilterLabels = [
    source !== "all" ? sourceLabel : null,
    quality !== "all" ? qualityLabel : null,
    tag ? `#${tag}` : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <div className="mx-auto max-w-[960px] px-5 py-8 md:px-8 md:py-10">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
            Library
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {hasFilters
              ? `${filteredCount} of ${totalCount} sources shown`
              : `${totalCount} ${totalCount === 1 ? "source" : "sources"} captured`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {needsUpgradeCount > 0 && (
            <Link
              href="/needs-upgrade"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--quality-needs-upgrade)] bg-[var(--surface-raised)] px-3 text-sm font-medium text-[var(--quality-needs-upgrade)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--surface)]"
            >
              {needsUpgradeCount} need upgrade
            </Link>
          )}
          <Link
            href="/capture"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--accent-10)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Capture
          </Link>
        </div>
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

      <MobileLibraryFilters
        sourceLabel={sourceLabel}
        qualityLabel={qualityLabel}
        activeFilterLabels={activeFilterLabels}
        filteredCount={filteredCount}
        tag={tag}
        tagClearHref={filterHref({ source, quality })}
        askTagHref={
          tag && filteredCount > 0
            ? `/ask?scope=tag&tag=${encodeURIComponent(tag)}`
            : undefined
        }
        sourceOptions={SOURCE_FILTERS.map((option) => ({
          ...option,
          href: filterHref({ source: option.value, quality, tag }),
          active: option.value === source,
        }))}
        qualityOptions={QUALITY_FILTERS.map((option) => ({
          ...option,
          href: filterHref({ source, quality: option.value, tag }),
          active: option.value === quality,
        }))}
      />

      <div className="mb-6 hidden space-y-3 border-y border-[var(--border)] py-4 md:block">
        {tag && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Tag
            </span>
            <span className="inline-flex h-8 items-center rounded-md border border-[var(--accent-9)] bg-[var(--accent-3)] px-3 text-sm font-medium text-[var(--accent-11)]">
              {tag}
            </span>
            <Link
              href={filterHref({ source, quality })}
              className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              Clear tag
            </Link>
            {filteredCount > 0 && (
              <Link
                href={`/ask?scope=tag&tag=${encodeURIComponent(tag)}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] hover:bg-[var(--accent-10)]"
              >
                <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                Ask tag
              </Link>
            )}
          </div>
        )}
        <FilterRow
          label="Source"
          options={SOURCE_FILTERS.map((option) => ({
            ...option,
            href: filterHref({ source: option.value, quality, tag }),
            active: option.value === source,
          }))}
        />
        <FilterRow
          label="Quality"
          options={QUALITY_FILTERS.map((option) => ({
            ...option,
            href: filterHref({ source, quality: option.value, tag }),
            active: option.value === quality,
          }))}
        />
      </div>

      {items.length === 0 ? (
        hasFilters ? <FilteredEmptyState /> : <EmptyState />
      ) : (
        <LibraryList items={items} collections={collections} />
      )}
    </div>
  );
}

function FilterRow({
  label,
  options,
}: {
  label: string;
  options: Array<{ value: string; label: string; href: string; active: boolean }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Link
            key={option.value}
            href={option.href}
            aria-current={option.active ? "page" : undefined}
            className={`inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
              option.active
                ? "border-[var(--accent-9)] bg-[var(--accent-3)] text-[var(--accent-11)]"
                : "border-[var(--border)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
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

function FilteredEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
      <StickyNote className="h-8 w-8 text-[var(--text-muted)]" strokeWidth={1.5} />
      <h2 className="mt-4 text-[18px] font-medium text-[var(--text-primary)]">
        No sources match these filters
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Try a different source or quality filter.
      </p>
      <Link
        href="/library"
        className="mt-6 inline-flex h-9 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
      >
        Clear filters
      </Link>
    </div>
  );
}
