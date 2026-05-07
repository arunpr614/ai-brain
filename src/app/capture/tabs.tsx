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
}: {
  active: Tab;
  prefilledUrl: string;
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
        className="mb-6 inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors",
              active === id
                ? "bg-[var(--accent-3)] text-[var(--accent-11)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {active === "url" && <UrlPanel prefilled={prefilledUrl} />}
      {active === "pdf" && <PdfDropzone />}
      {active === "note" && <NotePanel />}
    </div>
  );
}

function UrlPanel({ prefilled }: { prefilled: string }) {
  const [state, action, pending] = useActionState<CaptureState, FormData>(
    captureUrlAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
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
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          autoFocus
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Paste a public article URL. AI Brain fetches, extracts clean text, and saves.
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
          <div className="mt-2 flex gap-3">
            <Link
              href={`/items/${state.itemId}`}
              className="text-[var(--accent-11)] underline"
            >
              Open existing
            </Link>
            <button
              type="submit"
              name="allow_duplicate"
              value="1"
              className="text-[var(--text-secondary)] underline hover:text-[var(--text-primary)]"
            >
              Save again anyway
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)] disabled:opacity-60"
        >
          {pending ? "Fetching..." : "Save URL"}
        </button>
        <Link
          href="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)]"
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
          rows={14}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-[13px] leading-[1.55] text-[var(--text-primary)]"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save note"}
        </button>
        <Link
          href="/"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
