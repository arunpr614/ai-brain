"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Filter, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { ProcessingFilters } from "./types";

export function ProcessingFilterBar({
  filters,
  loading,
  error,
  selectedUserTags,
  selectedAiTopics,
  onChange,
  onRetry,
}: {
  filters: ProcessingFilters;
  loading: boolean;
  error: boolean;
  selectedUserTags: string[];
  selectedAiTopics: string[];
  onChange: (userTags: string[], aiTopics: string[]) => void;
  onRetry: () => void;
}) {
  const active = selectedUserTags.length + selectedAiTopics.length;
  const [mobileOpen, setMobileOpen] = useState(false);

  if (error) {
    return (
      <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-[var(--warning)] bg-[var(--surface)] px-3 text-xs text-[var(--text-secondary)]">
        Filter choices unavailable. Current valid filters are unchanged.
        <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center gap-1.5 font-medium text-[var(--text-primary)]">
          <RotateCcw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="hidden flex-wrap items-start gap-2 md:flex">
        <FacetDetails
          label="User tags"
          options={filters.userTags}
          selected={selectedUserTags}
          loading={loading}
          onChange={(values) => onChange(values, selectedAiTopics)}
        />
        <FacetDetails
          label="AI Topics"
          options={filters.aiTopics}
          selected={selectedAiTopics}
          loading={loading}
          onChange={(values) => onChange(selectedUserTags, values)}
        />
      </div>
      <div className="md:hidden">
        <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)]">
              <Filter className="h-4 w-4" /> Filters {active > 0 && `(${active})`}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
            <Dialog.Content className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[76vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
              <Dialog.Title className="text-lg font-semibold text-[var(--text-primary)]">Filter Processing</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">Match any value within a facet and both facets together.</Dialog.Description>
              <Dialog.Close aria-label="Close filters" className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)]">
                <X className="h-5 w-5" />
              </Dialog.Close>
              <div className="mt-4 grid gap-5">
                <FacetChoices label="User tags" options={filters.userTags} selected={selectedUserTags} loading={loading} onChange={(values) => onChange(values, selectedAiTopics)} />
                <FacetChoices label="AI Topics" options={filters.aiTopics} selected={selectedAiTopics} loading={loading} onChange={(values) => onChange(selectedUserTags, values)} />
              </div>
              <Dialog.Close className="sticky bottom-0 mt-5 min-h-11 w-full rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)]">Show matching sources</Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {active > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {selectedUserTags.map((id) => (
            <FilterChip key={`tag-${id}`} label={filters.userTags.find((option) => option.id === id)?.label ?? "Removed User tag"} onRemove={() => onChange(selectedUserTags.filter((value) => value !== id), selectedAiTopics)} />
          ))}
          {selectedAiTopics.map((id) => (
            <FilterChip key={`topic-${id}`} label={filters.aiTopics.find((option) => option.id === id)?.label ?? "Removed AI Topic"} onRemove={() => onChange(selectedUserTags, selectedAiTopics.filter((value) => value !== id))} />
          ))}
          <button type="button" onClick={() => onChange([], [])} className="min-h-9 px-2 text-xs font-medium text-[var(--accent-11)] hover:underline">Clear all</button>
        </div>
      )}
    </div>
  );
}

function FacetDetails(props: FacetProps) {
  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
        <Filter className="h-3.5 w-3.5" /> {props.label} {props.selected.length > 0 && `(${props.selected.length})`}
      </summary>
      <div className="absolute left-0 top-11 z-30 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-md)]">
        <FacetChoices {...props} />
      </div>
    </details>
  );
}

interface FacetProps {
  label: string;
  options: Array<{ id: string; label: string; count?: number }>;
  selected: string[];
  loading: boolean;
  onChange: (values: string[]) => void;
}

function FacetChoices({ label, options, selected, loading, onChange }: FacetProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</legend>
      {loading ? (
        <p className="py-3 text-xs text-[var(--text-muted)]">Loading choices…</p>
      ) : options.length === 0 ? (
        <p className="py-3 text-xs text-[var(--text-muted)]">No {label.toLowerCase()} yet.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-[var(--border)] text-sm text-[var(--text-primary)] last:border-0 md:min-h-10">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={(event) => onChange(event.currentTarget.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))}
                className="h-4 w-4 accent-[var(--accent-9)]"
              />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {typeof option.count === "number" && <span className="text-xs text-[var(--text-muted)]">{option.count}</span>}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--control-selected-border)] bg-[var(--control-selected-bg)] pl-3 pr-1 text-xs text-[var(--control-selected-fg)]">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`} className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-raised)]">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
