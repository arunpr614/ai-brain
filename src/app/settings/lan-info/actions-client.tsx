"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Check } from "lucide-react";

/**
 * Client-only affordances for /settings/lan-info:
 *   - "Copy token" with visual confirmation
 *   - "Rotate token" button posting to /api/settings/rotate-token;
 *     reloads the page on success so the new QR renders server-side.
 *
 * The token value is already in the HTML this component receives; no new
 * network call is needed to display it. Rotation is the only reason this
 * needs to be a client component.
 */
export function LanInfoActions({ token }: { token: string }) {
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
