"use client";

/**
 * /inbox client component — outbox state surface (OFFLINE-7 / plan v3 §5.7).
 *
 * Reads the outbox via IDB and renders rows grouped by status. Per
 * plan §5.7 + v3 C-7 accessibility contract:
 *   - Semantic <ul> / <li> with role="list".
 *   - Action buttons are real <button> elements (not <div onClick>).
 *   - aria-labels describe the action AND the target.
 *   - Status communicated via icon+text+aria-label, not color alone.
 *   - Discard button has aria-describedby pointing to a destructive hint.
 *
 * Actions:
 *   - Sync now (global): drains the queued snapshot via syncOnce + the
 *     existing transport. Shows a transient "Synced N" status line.
 *   - Retry (per-row): bumps the row's next_retry_at to now and runs
 *     syncOnce. Effectively a one-row "sync now."
 *   - Discard (per-row): hard-deletes the row + its filesystem PDF
 *     (when OFFLINE-9 lands; for now URL/note rows only).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import {
  deleteEntry,
  initOutbox,
  listAllByCreatedAt,
  putEntry,
  type OutboxDb,
} from "@/lib/outbox/storage";
import { deletePdf } from "@/lib/outbox/pdf-storage";
import { syncOnce } from "@/lib/outbox/sync-worker";
import { buildTransport } from "@/lib/outbox/transport";
import type { OutboxEntry, OutboxStatus } from "@/lib/outbox/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; entries: OutboxEntry[] }
  | { kind: "error"; message: string };

const STATUS_ORDER: OutboxStatus[] = ["stuck", "queued", "synced", "duplicate"];

const STATUS_LABEL: Record<OutboxStatus, string> = {
  stuck: "Needs attention",
  queued: "Pending sync",
  synced: "Synced",
  duplicate: "Duplicates",
};

const DISCARD_HINT_ID = "inbox-discard-hint";

async function getBearerToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: "brain_token" });
    return value ?? null;
  } catch {
    return null;
  }
}

function entryTitle(entry: OutboxEntry): string {
  switch (entry.kind) {
    case "url":
      return entry.payload.title?.trim() || entry.payload.url;
    case "note":
      return entry.payload.title || "Untitled note";
    case "pdf":
      return entry.file_name;
  }
}

function entrySubtitle(entry: OutboxEntry): string {
  switch (entry.kind) {
    case "url":
      return entry.payload.url;
    case "note":
      return entry.payload.body.slice(0, 120);
    case "pdf":
      return `${(entry.file_size / 1024).toFixed(0)} KB · PDF`;
  }
}

function relativeTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export function InboxClient() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const dbRef = useRef<OutboxDb | null>(null);
  const tokenRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dbRef.current) return;
    try {
      const all = await listAllByCreatedAt(dbRef.current);
      // Newest first inside each status bucket.
      all.sort((a, b) => b.created_at - a.created_at);
      setState({ kind: "ready", entries: all });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const init = await initOutbox();
        if (cancelled) {
          init.db.close();
          return;
        }
        dbRef.current = init.db;
        tokenRef.current = await getBearerToken();
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, [refresh]);

  const onSyncNow = useCallback(async () => {
    if (busy || !dbRef.current || !tokenRef.current) return;
    setBusy(true);
    setStatusLine(null);
    try {
      const transport = buildTransport(BRAIN_TUNNEL_URL, tokenRef.current);
      const result = await syncOnce(dbRef.current, transport);
      const parts: string[] = [];
      if (result.synced > 0) parts.push(`Synced ${result.synced}`);
      if (result.becameStuck > 0) parts.push(`${result.becameStuck} need attention`);
      if (result.remainedQueued > 0) parts.push(`${result.remainedQueued} still pending`);
      if (result.skippedCooldown > 0) parts.push(`${result.skippedCooldown} in cooldown`);
      setStatusLine(parts.length > 0 ? parts.join(" · ") : "Nothing to sync.");
      await refresh();
    } catch (err) {
      setStatusLine(`Sync failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  const onRetryRow = useCallback(
    async (entry: OutboxEntry) => {
      if (busy || !dbRef.current || !tokenRef.current) return;
      setBusy(true);
      try {
        // Force the row to be due immediately, then drain.
        await putEntry(dbRef.current, { ...entry, next_retry_at: Date.now(), status: "queued" });
        const transport = buildTransport(BRAIN_TUNNEL_URL, tokenRef.current);
        await syncOnce(dbRef.current, transport);
        await refresh();
      } catch {
        // Errors surface in the row's last_error after refresh.
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh],
  );

  const onDiscardRow = useCallback(
    async (entry: OutboxEntry) => {
      if (busy || !dbRef.current) return;
      setBusy(true);
      try {
        // PDF rows hold their bytes on the filesystem; delete those too
        // so a discard truly frees the storage (plan §4.4 / Q3).
        if (entry.kind === "pdf") {
          await deletePdf(entry.file_path).catch(() => undefined);
        }
        await deleteEntry(dbRef.current, entry.id);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh],
  );

  const grouped = useMemo(() => {
    if (state.kind !== "ready") return null;
    const buckets = new Map<OutboxStatus, OutboxEntry[]>();
    for (const status of STATUS_ORDER) buckets.set(status, []);
    for (const entry of state.entries) {
      const list = buckets.get(entry.status);
      if (list) list.push(entry);
    }
    return buckets;
  }, [state]);

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InboxIcon className="h-6 w-6 text-[var(--text-secondary)]" />
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Inbox
          </h1>
        </div>
        <button
          type="button"
          onClick={onSyncNow}
          disabled={busy || state.kind !== "ready"}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync now"}
        </button>
      </header>

      {statusLine && (
        <p
          aria-live="polite"
          className="mb-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"
        >
          {statusLine}
        </p>
      )}

      <p id={DISCARD_HINT_ID} className="sr-only">
        This permanently removes the item; you cannot undo this action.
      </p>

      {state.kind === "loading" && (
        <p className="text-sm text-[var(--text-secondary)]">Loading outbox…</p>
      )}

      {state.kind === "error" && (
        <p className="text-sm text-[var(--accent-9,#dc2626)]">
          Could not load outbox: {state.message}
        </p>
      )}

      {state.kind === "ready" && grouped && (
        <>
          {STATUS_ORDER.map((status) => {
            const entries = grouped.get(status) ?? [];
            if (entries.length === 0) return null;
            return (
              <section key={status} className="mb-8">
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                  {STATUS_LABEL[status]} ({entries.length})
                </h2>
                <ul role="list" className="space-y-2">
                  {entries.map((entry) => (
                    <InboxRow
                      key={entry.id}
                      entry={entry}
                      now={Date.now()}
                      onRetry={onRetryRow}
                      onDiscard={onDiscardRow}
                      busy={busy}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          {state.entries.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">
              Outbox is empty. Shared items will appear here while syncing.
            </p>
          )}
        </>
      )}
    </div>
  );
}

interface InboxRowProps {
  entry: OutboxEntry;
  now: number;
  onRetry: (entry: OutboxEntry) => void | Promise<void>;
  onDiscard: (entry: OutboxEntry) => void | Promise<void>;
  busy: boolean;
}

function InboxRow({ entry, now, onRetry, onDiscard, busy }: InboxRowProps) {
  const title = entryTitle(entry);
  const subtitle = entrySubtitle(entry);

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-start gap-3">
        <span
          aria-label={`Status: ${STATUS_LABEL[entry.status]}`}
          className="mt-0.5 inline-flex h-5 items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]"
        >
          {entry.kind}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">{subtitle}</p>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            {entry.last_attempt_at
              ? `Last tried ${relativeTime(entry.last_attempt_at, now)}`
              : `Saved ${relativeTime(entry.created_at, now)}`}
            {entry.last_error && ` · ${entry.last_error}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {(entry.status === "queued" || entry.status === "stuck") && (
            <button
              type="button"
              onClick={() => void onRetry(entry)}
              disabled={busy}
              aria-label={`Retry sync for ${title}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Retry
            </button>
          )}
          {entry.status !== "synced" && (
            <button
              type="button"
              onClick={() => void onDiscard(entry)}
              disabled={busy}
              aria-label={`Discard ${title}`}
              aria-describedby={DISCARD_HINT_ID}
              className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Discard
            </button>
          )}
          {entry.status === "synced" && entry.server_id && (
            <a
              href={`/items/${entry.server_id}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              View
            </a>
          )}
        </div>
      </div>
    </li>
  );
}
