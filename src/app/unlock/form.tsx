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
      <input
        type="password"
        name="pin"
        required
        autoFocus
        minLength={4}
        placeholder="PIN"
        className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-center text-lg tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
      />
      {state?.error && (
        <p className="text-sm text-[var(--danger)]">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-[var(--accent-9)] text-sm font-medium text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-10)] disabled:opacity-60"
      >
        {pending ? "Unlocking..." : "Unlock"}
      </button>
    </form>
  );
}
