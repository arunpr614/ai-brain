/**
 * Date filtering utilities and heartbeat telemetry formatting for Mac ASR Workstation Deck (Phase 6 / Issue #118).
 */

export type DateRangePreset = "today" | "week" | "month" | "all";

export interface CompletedJobLike {
  completed_at?: number | null;
}

export function getStartOfDay(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getStartOfWeek(nowMs = Date.now()): number {
  // 7 full days rolling window or beginning of calendar week
  return nowMs - 7 * 86_400_000;
}

export function getStartOfMonth(nowMs = Date.now()): number {
  // 30 full days rolling window or beginning of calendar month
  return nowMs - 30 * 86_400_000;
}

export function filterCompletedJobs<T extends CompletedJobLike>(
  jobs: T[],
  preset: DateRangePreset,
  nowMs = Date.now(),
): T[] {
  if (!jobs || jobs.length === 0) return [];
  if (preset === "all") return jobs;

  let minTimestamp = 0;
  if (preset === "today") minTimestamp = getStartOfDay(nowMs);
  else if (preset === "week") minTimestamp = getStartOfWeek(nowMs);
  else if (preset === "month") minTimestamp = getStartOfMonth(nowMs);

  return jobs.filter((job) => {
    const ts = job.completed_at;
    if (typeof ts !== "number" || isNaN(ts)) return false;
    return ts >= minTimestamp;
  });
}

export function calculatePresetCounts<T extends CompletedJobLike>(
  jobs: T[],
  nowMs = Date.now(),
): Record<DateRangePreset, number> {
  const safeJobs = jobs || [];
  const startOfDay = getStartOfDay(nowMs);
  const startOfWeek = getStartOfWeek(nowMs);
  const startOfMonth = getStartOfMonth(nowMs);

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  for (const job of safeJobs) {
    const ts = job.completed_at;
    if (typeof ts === "number" && !isNaN(ts)) {
      if (ts >= startOfDay) todayCount++;
      if (ts >= startOfWeek) weekCount++;
      if (ts >= startOfMonth) monthCount++;
    }
  }

  return {
    today: todayCount,
    week: weekCount,
    month: monthCount,
    all: safeJobs.length,
  };
}

export interface LiveHeartbeatStatus {
  status: "online" | "stale" | "offline";
  isOnline: boolean;
  label: string;
  sublabel: string;
  badgeClass: string;
  dotColorClass: string;
  ageSeconds: number | null;
}

export function formatLiveHeartbeat(
  lastHeartbeatMs: number | null | undefined,
  nowMs = Date.now(),
): LiveHeartbeatStatus {
  if (!lastHeartbeatMs || isNaN(lastHeartbeatMs)) {
    return {
      status: "offline",
      isOnline: false,
      label: "Worker Offline",
      sublabel: "No heartbeat received",
      badgeClass: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400",
      dotColorClass: "bg-zinc-400",
      ageSeconds: null,
    };
  }

  const ageSeconds = Math.max(0, Math.floor((nowMs - lastHeartbeatMs) / 1000));
  const timeFormatted = new Date(lastHeartbeatMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  if (ageSeconds < 15) {
    return {
      status: "online",
      isOnline: true,
      label: "Mac M5 Pro (ANE) Online",
      sublabel: `Seen ${ageSeconds}s ago • ${timeFormatted}`,
      badgeClass: "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
      dotColorClass: "bg-emerald-500",
      ageSeconds,
    };
  }

  if (ageSeconds <= 45) {
    return {
      status: "stale",
      isOnline: true,
      label: "Mac M5 Pro (ANE) Online",
      sublabel: `Seen ${ageSeconds}s ago • ${timeFormatted}`,
      badgeClass: "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
      dotColorClass: "bg-amber-500",
      ageSeconds,
    };
  }

  const minutesAgo = Math.floor(ageSeconds / 60);
  const ageLabel = minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;

  return {
    status: "offline",
    isOnline: false,
    label: "Worker Offline",
    sublabel: `Last seen ${ageLabel} • ${timeFormatted}`,
    badgeClass: "border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
    dotColorClass: "bg-rose-500",
    ageSeconds,
  };
}
