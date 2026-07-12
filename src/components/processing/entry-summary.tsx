"use client";

import { ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PROCESSING_INBOX_UPDATED_EVENT } from "@/lib/processing/events";

type State =
  | { kind: "loading" }
  | { kind: "ready"; count: number; oldestAgeMs: number | null }
  | { kind: "unavailable" };

export function ProcessingEntrySummary({ variant }: { variant: "more" | "library" }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = () => {
    setState({ kind: "loading" });
    fetch("/api/processing/summary", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((body: unknown) => {
        const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const data = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : raw;
        setState({
          kind: "ready",
          count: typeof data.inboxNow === "number" ? data.inboxNow : 0,
          oldestAgeMs: typeof data.oldestCurrentInboxAgeMs === "number" ? data.oldestCurrentInboxAgeMs : null,
        });
      })
      .catch(() => setState({ kind: "unavailable" }));
  };

  useEffect(() => {
    queueMicrotask(load);
    window.addEventListener(PROCESSING_INBOX_UPDATED_EVENT, load);
    return () => window.removeEventListener(PROCESSING_INBOX_UPDATED_EVENT, load);
  }, []);

  const copy =
    state.kind === "loading"
      ? "Checking Inbox…"
      : state.kind === "unavailable"
        ? "Processing unavailable"
        : state.count === 0
          ? "Nothing waiting"
          : `${state.count} waiting · oldest ${formatAge(state.oldestAgeMs)}`;

  if (variant === "more") {
    return (
      <Link href="/processing" className="flex min-h-14 items-center gap-3 px-4 py-3 text-[var(--text-primary)] hover:bg-[var(--surface-raised)]">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]"><Inbox className="h-4 w-4" strokeWidth={2} /></span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Processing</span><span className="block text-xs text-[var(--text-secondary)]">{copy}</span></span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      </Link>
    );
  }

  return (
    <section className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Processing Inbox summary">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]"><Inbox className="h-4 w-4" /></span>
        <div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Processing Inbox</h2><p className="text-xs text-[var(--text-secondary)]">{copy}</p></div>
      </div>
      {state.kind === "unavailable" ? (
        <button type="button" onClick={load} className="min-h-9 self-start rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] sm:self-auto">Retry</button>
      ) : (
        <Link href="/processing" className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] md:min-h-9">Open Inbox</Link>
      )}
    </section>
  );
}

function formatAge(value: number | null): string {
  if (value === null) return "recently";
  const minutes = Math.floor(value / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
