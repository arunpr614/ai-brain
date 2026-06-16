"use client";

import { useActionState } from "react";
import { setupAction, type AuthState } from "@/app/auth-actions";

export function SetupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    setupAction,
    null,
  );

  return (
    <form action={action} className="mt-8 flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label
        htmlFor="setup-pin"
        className="text-sm font-medium text-[var(--text-primary)]"
      >
        Choose PIN
      </label>
      <input
        id="setup-pin"
        type="password"
        name="pin"
        required
        minLength={4}
        autoFocus
        inputMode="numeric"
        autoComplete="new-password"
        enterKeyHint="next"
        placeholder="Choose a PIN"
        aria-invalid={state?.error ? "true" : undefined}
        aria-describedby={state?.error ? "setup-pin-error" : undefined}
        className="h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-center text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      <label
        htmlFor="setup-confirm"
        className="text-sm font-medium text-[var(--text-primary)]"
      >
        Confirm PIN
      </label>
      <input
        id="setup-confirm"
        type="password"
        name="confirm"
        required
        minLength={4}
        inputMode="numeric"
        autoComplete="new-password"
        enterKeyHint="done"
        placeholder="Confirm PIN"
        aria-invalid={state?.error ? "true" : undefined}
        aria-describedby={state?.error ? "setup-pin-error" : undefined}
        className="h-12 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-center text-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      {state?.error && (
        <p
          id="setup-pin-error"
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
        {pending ? "Setting up..." : "Create PIN"}
      </button>
    </form>
  );
}
