"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import type { ProcessingGroup, ProcessingSort } from "./types";

export const GROUP_OPTIONS: Array<{ value: ProcessingGroup; label: string }> = [
  { value: "workflow_status", label: "Workflow status" },
  { value: "user_tag", label: "Primary User tag" },
  { value: "ai_topic", label: "Primary AI Topic" },
  { value: "source_type", label: "Source type" },
  { value: "capture_channel", label: "Capture channel" },
  { value: "capture_quality", label: "Capture quality" },
  { value: "capture_age", label: "Capture age" },
  { value: "none", label: "No grouping" },
];

export const SORT_OPTIONS: Array<{ value: ProcessingSort; label: string }> = [
  { value: "workflow_default", label: "Workflow default" },
  { value: "oldest_captured", label: "Oldest captured" },
  { value: "newest_captured", label: "Newest captured" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "title_desc", label: "Title Z–A" },
  { value: "workflow_status", label: "Workflow status" },
  { value: "source_type", label: "Source type" },
  { value: "capture_channel", label: "Capture channel" },
];

export function GroupSort({
  group,
  sort,
  onApply,
}: {
  group: ProcessingGroup;
  sort: ProcessingSort;
  onApply: (group: ProcessingGroup, sort: ProcessingSort) => void;
}) {
  return (
    <>
      <div className="hidden md:block">
        <details className="group relative">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-[18px] w-[18px]" />
            Group &amp; sort
          </summary>
          <div className="absolute right-0 top-11 z-30 w-[322px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-md)]">
            <CompactChoiceFields group={group} sort={sort} onApply={onApply} />
          </div>
        </details>
      </div>
      <div className="md:hidden">
        <MobileGroupSort group={group} sort={sort} onApply={onApply} />
      </div>
    </>
  );
}

function CompactChoiceFields({ group, sort, onApply }: { group: ProcessingGroup; sort: ProcessingSort; onApply: (group: ProcessingGroup, sort: ProcessingSort) => void }) {
  return (
    <div>
      <label className="flex min-h-[50px] items-center gap-3 border-b border-[var(--border)] px-2 text-[13px] text-[var(--text-primary)]">
        <span className="w-20 shrink-0 font-semibold">Group by</span>
        <select value={group} onChange={(event) => onApply(event.currentTarget.value as ProcessingGroup, sort)} className="min-w-0 flex-1 bg-[var(--surface)] text-right text-xs text-[var(--text-secondary)]">
          {GROUP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex min-h-[50px] items-center gap-3 border-b border-[var(--border)] px-2 text-[13px] text-[var(--text-primary)]">
        <span className="w-20 shrink-0 font-semibold">Sort by</span>
        <select value={sort} onChange={(event) => onApply(group, event.currentTarget.value as ProcessingSort)} className="min-w-0 flex-1 bg-[var(--surface)] text-right text-xs text-[var(--text-secondary)]">
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => onApply("workflow_status", "oldest_captured")} className="flex min-h-9 w-full items-center justify-center text-xs font-medium text-[var(--accent-11)] hover:underline">Reset to Status · Oldest</button>
    </div>
  );
}

function MobileGroupSort({
  group,
  sort,
  onApply,
}: {
  group: ProcessingGroup;
  sort: ProcessingSort;
  onApply: (group: ProcessingGroup, sort: ProcessingSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftGroup, setDraftGroup] = useState(group);
  const [draftSort, setDraftSort] = useState(sort);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setDraftGroup(group);
          setDraftSort(sort);
        }
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--text-primary)]">
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          Group &amp; sort
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 max-h-[76vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <Dialog.Title className="pr-12 text-lg font-semibold text-[var(--text-primary)]">Group &amp; sort</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--text-secondary)]">
            Organize the current active-work view. Workflow status never changes here.
          </Dialog.Description>
          <Dialog.Close aria-label="Close Group and sort" className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]">
            <X className="h-5 w-5" />
          </Dialog.Close>
          <ChoiceFields
            group={draftGroup}
            sort={draftSort}
            onDraftGroup={setDraftGroup}
            onDraftSort={setDraftSort}
          />
          <div className="sticky bottom-0 mt-5 flex gap-2 border-t border-[var(--border)] bg-[var(--surface)] pt-4">
            <Dialog.Close className="min-h-11 flex-1 rounded-md border border-[var(--border-strong)] px-4 text-sm font-medium text-[var(--text-primary)]">Cancel</Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onApply(draftGroup, draftSort);
                setOpen(false);
              }}
              className="min-h-11 flex-1 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)]"
            >
              Apply
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ChoiceFields({
  group,
  sort,
  onApply,
  immediate = false,
  onDraftGroup,
  onDraftSort,
}: {
  group: ProcessingGroup;
  sort: ProcessingSort;
  onApply?: (group: ProcessingGroup, sort: ProcessingSort) => void;
  immediate?: boolean;
  onDraftGroup?: (group: ProcessingGroup) => void;
  onDraftSort?: (sort: ProcessingSort) => void;
}) {
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-1">
      <fieldset>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Group</legend>
        {GROUP_OPTIONS.map((option) => (
          <label key={option.value} className="flex min-h-[50px] cursor-pointer items-center justify-between gap-3 border-b border-[var(--border)] text-[13px] text-[var(--text-primary)] last:border-0 md:min-h-[44px]">
            {option.label}
            <input
              type="radio"
              name="processing-group"
              value={option.value}
              checked={group === option.value}
              onChange={() => {
                onDraftGroup?.(option.value);
                if (immediate) onApply?.(option.value, sort);
              }}
              className="h-[18px] w-[18px] accent-[var(--accent-9)]"
            />
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Sort</legend>
        {SORT_OPTIONS.map((option) => (
          <label key={option.value} className="flex min-h-[50px] cursor-pointer items-center justify-between gap-3 border-b border-[var(--border)] text-[13px] text-[var(--text-primary)] last:border-0 md:min-h-[44px]">
            {option.label}
            <input
              type="radio"
              name="processing-sort"
              value={option.value}
              checked={sort === option.value}
              onChange={() => {
                onDraftSort?.(option.value);
                if (immediate) onApply?.(group, option.value);
              }}
              className="h-[18px] w-[18px] accent-[var(--accent-9)]"
            />
          </label>
        ))}
      </fieldset>
      <button
        type="button"
        onClick={() => {
          onDraftGroup?.("workflow_status");
          onDraftSort?.("oldest_captured");
          if (immediate) onApply?.("workflow_status", "oldest_captured");
        }}
        className="justify-self-start text-xs font-medium text-[var(--accent-11)] hover:underline"
      >
        Reset organization
      </button>
    </div>
  );
}
