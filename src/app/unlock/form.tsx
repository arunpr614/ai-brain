"use client";

import { useActionState } from "react";
import { unlockAction, type AuthState } from "@/app/auth-actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    unlockAction,
    null,
  );

  return (
    <form action={action} className="mt-8 flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label
        htmlFor="unlock-pin"
        className="text-sm font-medium text-[var(--text-primary)]"
      >
        PIN
      </label>
      <input
        id="unlock-pin"
        type="password"
        name="pin"
        required
        autoFocus
        minLength={4}
        inputMode="numeric"
        autoComplete="current-password"
        enterKeyHint="done"
        placeholder="Enter PIN"
        aria-invalid={state?.error ? "true" : undefined}
        aria-describedby={state?.error ? "unlock-pin-error" : undefined}
        className="h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-center text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      {state?.error && (
        <p
          id="unlock-pin-error"
          role="alert"
          className="rounded-md border border-[var(--danger)]/40 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-md bg-[var(--action-primary-bg)] text-sm font-medium text-[var(--action-primary-fg)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {pending ? "Unlocking..." : "Unlock"}
      </button>
    </form>
  );
}
