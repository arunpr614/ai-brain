"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plus, RefreshCw } from "lucide-react";

/**
 * Client-only affordances for /settings/device-pairing.
 */
export function AndroidPairingCodeActions() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expiresAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  async function createCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/device-pairing", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setCode(body.code);
      setExpiresAt(body.expires_at);
      setNow(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create code");
    } finally {
      setLoading(false);
    }
  }

  const expiryCopy =
    expiresAt === null
      ? null
      : new Date(expiresAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
  const secondsRemaining = useMemo(() => {
    if (expiresAt === null) return null;
    return Math.max(0, Math.ceil((expiresAt - now) / 1_000));
  }, [expiresAt, now]);
  const expired = secondsRemaining === 0;
  const remainingCopy =
    secondsRemaining === null ? null : formatRemaining(secondsRemaining);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Android app
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Generate a temporary code, then enter it in the Android app.
          </p>
        </div>
        <button
          type="button"
          onClick={createCode}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)] disabled:opacity-50"
        >
          {code ? (
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2} />
          )}
          {loading
            ? "Generating..."
            : code
              ? expired
                ? "Generate new code"
                : "Regenerate"
              : "Add Android device"}
        </button>
      </div>

      {code && (
        <div
          className={`mt-4 rounded-md border px-4 py-3 ${
            expired
              ? "border-[var(--danger)] bg-[var(--surface)]"
              : "border-[var(--border)] bg-[var(--background)]"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Pairing code
          </p>
          <p
            className={`mt-1 font-mono text-[32px] font-semibold leading-none ${
              expired ? "text-[var(--text-muted)]" : "text-[var(--text-primary)]"
            }`}
          >
            {code}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            {expired
              ? "Expired. Generate a new code."
              : `Expires in ${remainingCopy}. The code works once.`}
            {!expired && expiryCopy ? ` Expires at ${expiryCopy}.` : ""}
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function DevicePairingActions({ token }: { token: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can throw in insecure contexts; ignore — user can
      // select the text manually.
    }
  }

  async function onRotate() {
    const ok = window.confirm(
      "Rotating will invalidate the current token. Your paired APK and " +
        "Chrome extension will stop working until re-paired. Continue?",
    );
    if (!ok) return;
    setRotating(true);
    setRotateError(null);
    try {
      const res = await fetch("/api/settings/rotate-token", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setRotateError(err instanceof Error ? err.message : "rotation failed");
    } finally {
      setRotating(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-[var(--text-primary)]">
          {token}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-[var(--border)] px-2 text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)]"
          aria-label="Copy token"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2} /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy
            </>
          )}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          Rotate after any suspected leak. All paired devices must re-pair.
        </p>
        <button
          type="button"
          onClick={onRotate}
          disabled={rotating}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${rotating ? "animate-spin" : ""}`}
            strokeWidth={2}
          />
          {rotating ? "Rotating…" : "Rotate token"}
        </button>
      </div>

      {rotateError && (
        <p className="mt-2 text-xs text-[var(--danger)]">{rotateError}</p>
      )}
    </>
  );
}
