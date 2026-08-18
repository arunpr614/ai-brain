"use client";

import { useEffect, useState } from "react";

export interface WorkerStatusData {
  ok: boolean;
  worker_id: string;
  is_online: boolean;
  last_heartbeat_at: number | null;
  hostname: string | null;
  system_info: string | null;
  pending_jobs_count: number;
  running_jobs_count: number;
}

export function MacWorkerPresenceBadge({
  workerId = "mac-m5-pro",
  pollIntervalMs = 30000,
}: {
  workerId?: string;
  pollIntervalMs?: number;
}) {
  const [status, setStatus] = useState<WorkerStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const res = await fetch(`/api/worker/transcript-jobs/status?worker_id=${encodeURIComponent(workerId)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // Ignore network errors in background badge
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadStatus();
    const interval = setInterval(() => {
      void loadStatus();
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [workerId, pollIntervalMs]);

  if (loading && !status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground animate-pulse">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        Checking Mac...
      </span>
    );
  }

  const isOnline = status?.is_online ?? false;
  const pendingCount = status?.pending_jobs_count ?? 0;
  const runningCount = status?.running_jobs_count ?? 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        isOnline
          ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
          : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800"
      }`}
      title={
        isOnline
          ? `Mac M5 Pro is online and listening for transcription jobs.\n${pendingCount} jobs queued, ${runningCount} currently processing.`
          : `Mac M5 Pro is currently offline or asleep.\n${pendingCount} jobs queued waiting for connection.`
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
        }`}
      />
      <span>
        {isOnline ? "Mac M5 Pro (Online)" : "Mac M5 Pro (Offline)"}
      </span>
      {pendingCount > 0 && (
        <span className="ml-1 px-1.5 py-0.2 bg-zinc-200 dark:bg-zinc-700 rounded-full text-[10px] text-zinc-700 dark:text-zinc-300 font-semibold">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
