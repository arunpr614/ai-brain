"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createNoteAction, type FormState } from "@/app/actions";

export function NewNoteForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createNoteAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
          placeholder="A short descriptive title"
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
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
          placeholder="Write anything. Markdown supported."
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-[13px] leading-[1.55] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--accent-10)] disabled:opacity-60"
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
