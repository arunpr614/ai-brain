"use client";

import { FileUp } from "lucide-react";
import { useActionState } from "react";
import { upgradeItemTextAction, type UpgradeTextState } from "./upgrade-actions";

export function UpgradeTextForm({ itemId }: { itemId: string }) {
  const [state, action, pending] = useActionState<UpgradeTextState, FormData>(
    upgradeItemTextAction,
    { status: "idle" },
  );

  return (
    <form id="upgrade-text" action={action} className="mt-4 border-t border-[var(--border)] pt-4">
      <input type="hidden" name="item_id" value={itemId} />
      <label
        htmlFor="upgrade-text-input"
        className="text-xs font-medium text-[var(--text-primary)]"
      >
        Transcript or notes
      </label>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
        Paste the content you want AI Memory to remember for this item.
      </p>
      <textarea
        id="upgrade-text-input"
        name="text"
        maxLength={100_000}
        rows={7}
        disabled={pending}
        className="mt-3 min-h-36 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-60"
        placeholder="Paste transcript or notes..."
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-[var(--accent-9)] px-3 text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)] disabled:opacity-60"
      >
        <FileUp className="h-3.5 w-3.5" strokeWidth={2} />
        {pending ? "Updating..." : "Add text"}
      </button>
      {state?.status === "success" && (
        <p role="status" className="mt-3 text-xs leading-relaxed text-[var(--success)]">
          {state.message}
        </p>
      )}
      {state?.status === "error" && (
        <p role="alert" className="mt-3 text-xs leading-relaxed text-[var(--danger)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
