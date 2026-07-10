"use client";

import { FileText, Globe, StickyNote } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { cn } from "@/lib/cn";
import {
  captureUrlAction,
  type CaptureState,
} from "@/app/capture-actions";
import { createNoteAction, type FormState } from "@/app/actions";
import { PdfDropzone } from "./pdf-dropzone";

type Tab = "url" | "pdf" | "note";

const TABS: { id: Tab; label: string; icon: typeof Globe }[] = [
  { id: "url", label: "URL", icon: Globe },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "note", label: "Note", icon: StickyNote },
];

export function CaptureTabs({
  active,
  prefilledUrl,
  initialDuplicate,
}: {
  active: Tab;
  prefilledUrl: string;
  initialDuplicate: { itemId: string; url: string } | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const setTab = (id: Tab) => {
    const qs = new URLSearchParams(params);
    qs.set("tab", id);
    router.replace(`/capture?${qs.toString()}`);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Capture source"
        className="mb-6 grid w-full grid-cols-3 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 md:inline-grid md:w-auto"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium transition-colors md:h-8 md:px-3",
              active === id
                ? "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {active === "url" && (
        <UrlPanel prefilled={prefilledUrl} initialDuplicate={initialDuplicate} />
      )}
      {active === "pdf" && <PdfDropzone />}
      {active === "note" && <NotePanel />}
    </div>
  );
}

function UrlPanel({
  prefilled,
  initialDuplicate,
}: {
  prefilled: string;
  initialDuplicate: { itemId: string; url: string } | null;
}) {
  const [state, action, pending] = useActionState<CaptureState, FormData>(
    captureUrlAction,
    initialDuplicate
      ? {
          status: "duplicate",
          itemId: initialDuplicate.itemId,
          url: initialDuplicate.url,
        }
      : null,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="url"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={prefilled}
          placeholder="https://example.com/article"
          className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] md:h-9 md:text-sm"
          autoFocus
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Paste a public article URL. AI Memory fetches, extracts clean text, and saves.
        </p>
      </div>

      {state?.status === "error" && (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      )}

      {state?.status === "duplicate" && (
        <div className="rounded-md border border-[var(--warning)] bg-[var(--surface)] p-3 text-sm">
          <p className="text-[var(--text-primary)]">
            You&rsquo;ve already saved this URL.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Link
              href={`/items/${state.itemId}`}
              className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] sm:h-9"
            >
              Open existing
            </Link>
            <button
              type="submit"
              name="allow_duplicate"
              value="1"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-9"
            >
              Save again anyway
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60 sm:h-9"
        >
          {pending ? "Fetching..." : "Save URL"}
        </button>
        <Link
          href="/library"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-auto sm:border-0 sm:px-0"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function NotePanel() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createNoteAction,
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text-primary)] md:h-9 md:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="body"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Body
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={12}
          className="min-h-[220px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-[13px] leading-[1.55] text-[var(--text-primary)] md:min-h-[320px]"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      )}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60 sm:h-9"
        >
          {pending ? "Saving..." : "Save note"}
        </button>
        <Link
          href="/library"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-auto sm:border-0 sm:px-0"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
