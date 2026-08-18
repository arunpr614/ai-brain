"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { type AsrPipelineDashboardData } from "@/db/transcript-jobs";

interface AsrDeckClientProps {
  initialData: AsrPipelineDashboardData;
}

export function AsrDeckClient({ initialData }: AsrDeckClientProps) {
  const [data, setData] = useState<AsrPipelineDashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  const refreshData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/worker/transcript-jobs/dashboard?worker_id=mac-m5-pro");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch {
      // Ignore polling errors
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshData, 4000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleAction = async (action: "retry" | "ignore" | "prioritize" | "enqueue", itemId: string) => {
    try {
      setActionLoadingId(itemId);
      const res = await fetch("/api/worker/transcript-jobs/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId }),
      });
      if (res.ok) {
        await refreshData();
      }
    } catch {
      // Ignore
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBacklog = data.backlog.filter((job) =>
    job.title.toLowerCase().includes(filterQuery.toLowerCase()),
  );

  const formatTimestamp = (timestampMs: number | null | undefined) => {
    if (!timestampMs) return "—";
    const date = new Date(timestampMs);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* 🟢 TOP HARDWARE TELEMETRY STRIP */}
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Worker Presence Badge */}
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 ${
                data.worker.is_online
                  ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400"
              }`}
            >
              <span className="relative flex h-3 w-3">
                {data.worker.is_online && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex h-3 w-3 rounded-full ${
                    data.worker.is_online ? "bg-emerald-500" : "bg-zinc-400"
                  }`}
                ></span>
              </span>
              <div>
                <div className="text-xs font-semibold tracking-wide uppercase">
                  {data.worker.is_online ? "Mac M5 Pro (ANE) Online" : "Worker Offline"}
                </div>
                <div className="text-[11px] opacity-75">
                  {data.worker.is_online ? "Apple Silicon CoreML / MLX" : `Last seen ${formatTimestamp(data.worker.last_heartbeat_at)}`}
                </div>
              </div>
            </div>

            {/* Model Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-50 px-3.5 py-2 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
              <span className="text-base">⚡</span>
              <div>
                <div className="text-xs font-semibold">Whisper Large v3 Turbo</div>
                <div className="text-[11px] opacity-75">1.5B parameters • In-Memory PyAV</div>
              </div>
            </div>

            {/* Speedup Multiplier */}
            <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-50 px-3.5 py-2 text-sky-900 dark:bg-sky-950/30 dark:text-sky-300">
              <span className="text-base">🚀</span>
              <div>
                <div className="text-xs font-semibold">16.8x Real-Time Speedup</div>
                <div className="text-[11px] opacity-75">Zero Disk I/O Transcode</div>
              </div>
            </div>
          </div>

          {/* Aggregate Stats & Refresh */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {data.stats.total_completed_today} Completed Today
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {data.stats.total_queued} Queued • {data.stats.total_completed_all_time} Total All-Time
              </div>
            </div>

            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 active:scale-95 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              title="Refresh Pipeline Status"
            >
              <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 3-COLUMN NEURAL DECK KANBAN */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* COLUMN 1: QUEUE BACKLOG */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Queue Backlog
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {data.backlog.length}
              </span>
            </div>
            <Link
              href="/needs-upgrade"
              className="text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              + Batch Queue →
            </Link>
          </div>

          {/* Search filter if backlog is large */}
          {data.backlog.length > 3 && (
            <input
              type="text"
              placeholder="Filter pending items..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="mb-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-purple-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          )}

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[620px] pr-1">
            {filteredBacklog.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                <span className="text-2xl mb-1">📭</span>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  No items in backlog queue
                </p>
              </div>
            ) : (
              filteredBacklog.map((job) => (
                <div
                  key={job.job_id}
                  className="group relative rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-xs transition hover:border-purple-400/60 dark:border-zinc-800 dark:bg-zinc-800/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/items/${job.item_id}`}
                        className="block truncate text-xs font-semibold text-zinc-900 hover:text-purple-600 dark:text-zinc-100 dark:hover:text-purple-400"
                      >
                        {job.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>Queued {formatTimestamp(job.created_at)}</span>
                        {job.priority > 20 && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            P1 Priority
                          </span>
                        )}
                        {job.state === "retryable_error" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Retry #{job.attempts}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleAction("prioritize", job.item_id)}
                        disabled={actionLoadingId === job.item_id}
                        title="Bump to Top Priority"
                        className="rounded p-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      >
                        ⚡
                      </button>
                      <button
                        onClick={() => handleAction("ignore", job.item_id)}
                        disabled={actionLoadingId === job.item_id}
                        title="Skip / Cancel"
                        className="rounded p-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {job.last_error_message && (
                    <div className="mt-2 rounded bg-amber-50 p-1.5 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                      ⚠️ {job.last_error_message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: TRANSCRIBING NOW */}
        <div className="flex flex-col rounded-2xl border border-purple-300/40 bg-purple-50/20 p-4 shadow-sm backdrop-blur dark:border-purple-900/40 dark:bg-purple-950/10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Transcribing Now
              </h2>
              {data.in_progress && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.in_progress ? "Active Inference" : "Worker Idle"}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {data.in_progress ? (
              <div className="space-y-4 rounded-2xl border border-purple-200 bg-white p-5 shadow-md dark:border-purple-900/60 dark:bg-zinc-900">
                {/* Soundwave Animation */}
                <div className="flex h-16 items-center justify-center gap-1.5 rounded-xl bg-purple-950/10 p-3 dark:bg-purple-950/40">
                  <span className="h-6 w-1.5 animate-pulse rounded-full bg-purple-500"></span>
                  <span className="h-10 w-1.5 animate-bounce rounded-full bg-purple-400"></span>
                  <span className="h-14 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
                  <span className="h-8 w-1.5 animate-bounce rounded-full bg-purple-400"></span>
                  <span className="h-12 w-1.5 animate-pulse rounded-full bg-purple-500"></span>
                  <span className="h-5 w-1.5 animate-bounce rounded-full bg-purple-400"></span>
                  <span className="h-11 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
                </div>

                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-purple-600 uppercase dark:text-purple-400">
                    Active MLX Worker Stream
                  </div>
                  <h3 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {data.in_progress.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>⏱️ {data.in_progress.elapsed_seconds}s elapsed</span>
                    <span>Model: {data.in_progress.preferred_model}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                  <Link
                    href={`/items/${data.in_progress.item_id}`}
                    className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400"
                  >
                    Open Item Details →
                  </Link>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    ⚡ Apple Silicon GPU Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-2">
                  ✓
                </div>
                <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Worker Standing By
                </h3>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
                  Mac ASR daemon is polling every 5s for pending audio jobs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: COMPLETED STREAM */}
        <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Completed History
              </h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {data.completed_history.length}
              </span>
            </div>
            <span className="text-xs text-zinc-400">Live Timeline</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[620px] pr-1">
            {data.completed_history.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
                <span className="text-2xl mb-1">⏳</span>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  No completed jobs recorded yet
                </p>
              </div>
            ) : (
              data.completed_history.map((job) => (
                <div
                  key={job.job_id}
                  className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs transition hover:border-emerald-400/60 dark:border-zinc-800 dark:bg-zinc-800/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/items/${job.item_id}/read`}
                        className="block truncate text-xs font-semibold text-zinc-900 hover:text-emerald-600 dark:text-zinc-100 dark:hover:text-emerald-400"
                      >
                        {job.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ {formatTimestamp(job.completed_at)}
                        </span>
                        <span>•</span>
                        <span>{job.word_count.toLocaleString()} words</span>
                        <span>•</span>
                        <span>{formatDuration(job.duration_seconds)} audio</span>
                      </div>
                    </div>

                    <Link
                      href={`/items/${job.item_id}/read`}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300"
                    >
                      Studio ↗
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
