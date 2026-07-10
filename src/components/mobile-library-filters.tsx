"use client";

import { Filter, MessageSquare, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type FilterOption = {
  value: string;
  label: string;
  href: string;
  active: boolean;
};

export function MobileLibraryFilters({
  activeFilterLabels,
  filteredCount,
  tag,
  tagClearHref,
  askTagHref,
  sourceLabel,
  qualityLabel,
  sourceOptions,
  qualityOptions,
}: {
  activeFilterLabels: string[];
  filteredCount: number;
  tag?: string;
  tagClearHref: string;
  askTagHref?: string;
  sourceLabel: string;
  qualityLabel: string;
  sourceOptions: FilterOption[];
  qualityOptions: FilterOption[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="mb-5 md:hidden">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-library-filter-sheet"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={2} />
          <div className="min-w-0">
            <span className="block text-sm font-medium text-[var(--text-primary)]">
              Filters
            </span>
            <span className="block truncate text-xs text-[var(--text-secondary)]">
              {activeFilterLabels.length > 0
                ? activeFilterLabels.join(", ")
                : "All sources"}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
          {filteredCount}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-library-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-library-filter-title"
            className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 max-h-[72vh] overflow-y-auto rounded-t-lg border border-[var(--border)] bg-[var(--surface)] p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id="mobile-library-filter-title"
                  className="text-sm font-semibold text-[var(--text-primary)]"
                >
                  Filters
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {filteredCount} {filteredCount === 1 ? "source" : "sources"} shown
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4">
              {tag && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Tag
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex h-8 items-center rounded-md border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] px-3 text-sm font-medium text-[var(--control-selected-fg)]">
                      {tag}
                    </span>
                    <Link
                      href={tagClearHref}
                      className="inline-flex h-11 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    >
                      Clear tag
                    </Link>
                    {askTagHref && (
                      <Link
                        href={askTagHref}
                        className="inline-flex h-11 items-center gap-1.5 rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
                        Ask tag
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <MobileFilterGroup
                label="Source"
                activeLabel={sourceLabel}
                options={sourceOptions}
              />
              <MobileFilterGroup
                label="Quality"
                activeLabel={qualityLabel}
                options={qualityOptions}
              />

              {activeFilterLabels.length > 0 && (
                <Link
                  href="/library"
                  className="inline-flex h-11 w-full items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
                >
                  Clear filters
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileFilterGroup({
  label,
  activeLabel,
  options,
}: {
  label: string;
  activeLabel: string;
  options: FilterOption[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {label}
        </p>
        <span className="text-xs text-[var(--text-secondary)]">{activeLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Link
            key={option.value}
            href={option.href}
            aria-current={option.active ? "page" : undefined}
            className={`inline-flex h-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors duration-[var(--duration-fast)] ${
              option.active
                ? "border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
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
