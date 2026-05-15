"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface Status {
  state: "pending" | "running" | "batched" | "done" | "error";
  /**
   * v0.6.0 Phase C-8: present only when state='batched' (Anthropic
   * Message Batch in flight). Shown via tooltip for the rare power-user
   * who wants to inspect the underlying batch.
   */
  batch_id?: string | null;
  last_error: string | null;
  updated_at: number;
  /** F-046: retry attempts from enrichment_jobs; 0 when job row missing. */
  attempts: number;
}

// Mirrors MAX_ATTEMPTS in src/lib/queue/enrichment-worker.ts. Kept as a
// literal here so the client bundle doesn't pull in the server-only module.
const MAX_ATTEMPTS = 3;

/**
 * Polls /api/items/[id]/enrichment-status every 3s while state is
 * pending|running. Calls onDone() when state transitions to done so the
 * parent can refresh (typically router.refresh()).
 *
 * When state === 'done' the component returns null — a finished item has
 * no pill. When state === 'error', shows a static red pill.
 */
export function EnrichingPill({
  itemId,
  initialState,
  onDone,
  compact = false,
}: {
  itemId: string;
  initialState: "pending" | "running" | "batched" | "done" | "error";
  onDone?: () => void;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Status>(() => ({
    state: initialState,
    last_error: null,
    updated_at: Date.now(),
    attempts: 0,
  }));

  useEffect(() => {
    if (status.state === "done" || status.state === "error") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/items/${itemId}/enrichment-status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as Status;
        if (cancelled) return;
        setStatus(data);
        if (data.state === "done" && onDone) onDone();
      } catch {
        /* transient, try again next tick */
      }
    };
    const interval = setInterval(poll, 3000);
    void poll();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [itemId, status.state, onDone]);

  if (status.state === "done") return null;

  if (status.state === "error") {
    return (
      <span
        title={status.last_error ?? "Enrichment failed"}
        className={`inline-flex items-center gap-1 rounded-full border border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] ${
          compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
        }`}
      >
        <AlertCircle className="h-3 w-3" strokeWidth={2} />
        enrichment failed
      </span>
    );
  }

  const retrying = status.attempts > 1;
  const label = retrying
    ? `retrying ${status.attempts}/${MAX_ATTEMPTS}…`
    : status.state === "running"
      ? "enriching…"
      : status.state === "batched"
        ? "queued for tonight's batch"
        : "queued";

  // v0.6.0 Phase C-9: 'batched' uses a distinct tooltip carrying the
  // Anthropic batch_id (when present) so a power-user can correlate
  // with the daily cron log without breaking the visual rhythm.
  const tooltip =
    status.state === "batched" && status.batch_id
      ? `Anthropic batch ${status.batch_id}`
      : undefined;

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 rounded-full bg-[var(--surface-raised)] text-[var(--text-secondary)] ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs"
      }`}
    >
      <Sparkles
        className="h-3 w-3 animate-pulse text-[var(--accent-9)]"
        strokeWidth={2}
      />
      {label}
    </span>
  );
}
