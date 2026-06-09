"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resolveBaseUrl } from "@/lib/client/reachability-decision";
import {
  completeSetupApkPairing,
  readExchangeToken,
} from "@/lib/client/setup-apk-pairing";

type Stage =
  | { kind: "entry" }
  | { kind: "verifying"; message: string }
  | { kind: "verify-error"; message: string }
  | { kind: "paired-unreachable"; message: string; token: string }
  | { kind: "paired"; base: string };

async function writePreferences(token: string): Promise<void> {
  const mod = await import("@capacitor/preferences");
  await mod.Preferences.set({ key: "brain_token", value: token });
}

async function clearPreferences(): Promise<void> {
  const mod = await import("@capacitor/preferences");
  await mod.Preferences.remove({ key: "brain_token" });
}

export default function SetupApkPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "entry" });
  const [code, setCode] = useState("");

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStage({ kind: "verifying", message: "Checking pairing code..." });
      try {
        const res = await fetch("/api/settings/device-pairing/exchange", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = formatExchangeError(body.error, res.status);
          setStage({ kind: "verify-error", message });
          return;
        }

        const token = readExchangeToken(body);
        if (!token) {
          setStage({
            kind: "verify-error",
            message: "Brain did not return a valid pairing token.",
          });
          return;
        }

        const result = await completeSetupApkPairing({
          token,
          writeToken: writePreferences,
          resolveBaseUrl,
        });
        setStage(result);
        if (result.kind === "paired") {
          setTimeout(() => router.push("/"), 500);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStage({ kind: "verify-error", message: msg });
      }
    },
    [code, router],
  );

  const retry = useCallback(() => {
    setStage({ kind: "entry" });
  }, []);

  const retryConnection = useCallback(
    async (token: string) => {
      setStage({ kind: "verifying", message: "Checking cloud connection..." });
      try {
        const resolution = await resolveBaseUrl({ token });
        if (!resolution.ok) {
          setStage({ kind: "paired-unreachable", message: resolution.reason, token });
          return;
        }
        setStage({ kind: "paired", base: resolution.base });
        setTimeout(() => router.push("/"), 500);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStage({ kind: "paired-unreachable", message, token });
      }
    },
    [router],
  );

  const resetPairing = useCallback(async () => {
    await clearPreferences();
    setCode("");
    setStage({ kind: "entry" });
  }, []);

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <label
          htmlFor="pairing-code"
          className="text-sm font-medium text-[var(--text-primary)]"
        >
          Pairing code
        </label>
        <input
          id="pairing-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          inputMode="text"
          placeholder="ABCD-EFGH"
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-lg text-[var(--text-primary)] outline-none focus:border-[var(--accent-8)]"
          disabled={stage.kind === "verifying"}
        />
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Open Device pairing in the web app and generate an Android code.
        </p>
        <button
          type="submit"
          disabled={stage.kind === "verifying" || code.trim().length === 0}
          className="mt-4 inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50"
        >
          Pair device
        </button>
      </form>

      {stage.kind === "verify-error" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium text-[var(--text-primary)]">Could not pair</p>
          <p className="mt-1 text-[var(--text-muted)]">{stage.message}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          >
            Try again
          </button>
        </div>
      )}

      {stage.kind === "paired-unreachable" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-medium text-[var(--text-primary)]">
            Paired, but cloud is not reachable
          </p>
          <p className="mt-1 text-[var(--text-muted)]">
            The token is saved on this device. Try the connection again when the
            network is ready.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{stage.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => retryConnection(stage.token)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            >
              Retry connection
            </button>
            <button
              type="button"
              onClick={resetPairing}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
            >
              Reset pairing
            </button>
          </div>
        </div>
      )}

      {stage.kind === "verifying" && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
          {stage.message}
        </div>
      )}

      {stage.kind === "paired" && (
        <div className="rounded-md border border-[var(--accent-7)] bg-[var(--accent-3)] p-4 text-sm">
          <p className="font-medium text-[var(--accent-11)]">
            Paired — redirecting…
          </p>
          <p className="mt-1 text-xs text-[var(--accent-11)] opacity-80">
            Using {stage.base}
          </p>
        </div>
      )}
    </div>
  );
}

function formatExchangeError(error: unknown, status: number): string {
  switch (error) {
    case "expired_code":
      return "That code expired. Generate a fresh code in the web app.";
    case "used_code":
      return "That code was already used. Generate a fresh code.";
    case "rate_limited":
      return "Too many attempts. Wait a few minutes, then generate a fresh code.";
    case "token_not_configured":
      return "Brain is missing its API token. Open settings on the web app first.";
    case "invalid_code":
      return "That code was not recognized. Check it and try again.";
    default:
      return `Pairing failed with HTTP ${status}.`;
  }
}
