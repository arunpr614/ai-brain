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
          className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-base text-[var(--text-primary)] md:h-9 md:text-sm"
        />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[var(--text-primary)]">
          Repair type
        </legend>
        <div className="grid w-full grid-cols-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 sm:inline-grid sm:w-auto">
          <label className="has-[:checked]:bg-[var(--control-selected-bg)] has-[:checked]:text-[var(--control-selected-fg)] inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium text-[var(--text-secondary)] sm:h-8">
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
          <label className="has-[:checked]:bg-[var(--control-selected-bg)] has-[:checked]:text-[var(--control-selected-fg)] inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium text-[var(--text-secondary)] sm:h-8">
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
          rows={14}
          className="min-h-[240px] w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-mono text-[13px] leading-[1.55] text-[var(--text-primary)] md:min-h-[360px]"
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

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-4 text-sm font-medium text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60 sm:h-9"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {pending ? "Saving..." : "Save repair"}
        </button>
        <Link
          href={`/items/${itemId}`}
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] sm:h-auto sm:border-0 sm:px-0"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
