"use client";

import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import {
  repairItemWithTextAction,
  type RepairFormState,
} from "./actions";

export function RepairForm({
  itemId,
  title,
  defaultTextKind,
  minChars,
}: {
  itemId: string;
  title: string;
  defaultTextKind: "text" | "transcript";
  minChars: number;
}) {
  const [state, action, pending] = useActionState<RepairFormState, FormData>(
    repairItemWithTextAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="item_id" value={itemId} />

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
          defaultValue={title}
          maxLength={500}
          className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm text-[var(--text-primary)]"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">
          Repair type
        </legend>
        <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1">
          <label className="has-[:checked]:bg-[var(--accent-3)] has-[:checked]:text-[var(--accent-11)] inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-[var(--text-secondary)]">
            <input
              type="radio"
              name="text_kind"
              value="text"
              defaultChecked={defaultTextKind === "text"}
              className="sr-only"
            />
            <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            Text
          </label>
          <label className="has-[:checked]:bg-[var(--accent-3)] has-[:checked]:text-[var(--accent-11)] inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-[var(--text-secondary)]">
            <input
              type="radio"
              name="text_kind"
              value="transcript"
              defaultChecked={defaultTextKind === "transcript"}
              className="sr-only"
            />
            <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            Transcript
          </label>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="text"
          className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
        >
          Source text
        </label>
        <textarea
          id="text"
          name="text"
          required
          minLength={minChars}
          rows={16}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-[13px] leading-[1.55] text-[var(--text-primary)]"
        />
        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
          Paste at least {minChars} useful characters. Existing tags and collections stay attached.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-md border border-[var(--danger)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--accent-9)] px-4 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)] disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {pending ? "Saving..." : "Save repair"}
        </button>
        <Link
          href={`/items/${itemId}`}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
