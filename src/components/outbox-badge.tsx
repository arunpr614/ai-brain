"use client";

/**
 * Sidebar Inbox-count badge — v0.6.x offline mode (OFFLINE-7 / plan v3 §4.2 + §5.7).
 *
 * Lightweight client component: opens the outbox IDB (reusing the same
 * brain-outbox database the share-handler already initialized), reads
 * the count of `queued` + `stuck` rows, and renders a small numeric
 * pill next to the Inbox sidebar label.
 *
 * Strategy: the badge polls every 10s while the page is visible. The
 * outbox is small (well under 1000 rows in steady state) and IDB count
 * queries are O(log n) over a B-tree index, so polling cost is
 * negligible compared to a BroadcastChannel subscription. Polling is
 * paused when document.visibilityState !== 'visible' to keep the
 * background tab cost at zero.
 *
 * On non-Capacitor browsers (desktop), the outbox is not actively
 * populated (the feature is APK-only per plan §6) but it's safe to
 * read — the count just stays at 0. Rendering null when the count
 * is 0 avoids visual noise.
 */

import { useEffect, useState } from "react";
import { countByStatus, initOutbox, type OutboxDb } from "@/lib/outbox/storage";

const POLL_INTERVAL_MS = 10_000;

interface Counts {
  queued: number;
  stuck: number;
}

async function readCounts(db: OutboxDb): Promise<Counts> {
  const [queued, stuck] = await Promise.all([
    countByStatus(db, "queued"),
    countByStatus(db, "stuck"),
  ]);
  return { queued, stuck };
}

export function OutboxBadge() {
  const [counts, setCounts] = useState<Counts>({ queued: 0, stuck: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let db: OutboxDb | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function refresh() {
      if (!db || cancelled) return;
      try {
        const next = await readCounts(db);
        if (!cancelled) setCounts(next);
      } catch {
        // IDB read failed (rare). Leave counts unchanged; next tick retries.
      }
    }

    function start() {
      if (timer || !db || cancelled) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible") {
          void refresh();
        }
      }, POLL_INTERVAL_MS);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    }

    (async () => {
      try {
        const init = await initOutbox();
        if (cancelled) {
          init.db.close();
          return;
        }
        db = init.db;
        await refresh();
        start();
        document.addEventListener("visibilitychange", onVisibility);
      } catch {
        // Without an outbox, badge is permanently 0 — render nothing.
      }
    })();

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      if (db) db.close();
    };
  }, []);

  const total = counts.queued + counts.stuck;
  if (total === 0) return null;

  // Stuck takes priority for color (red); queued-only is muted.
  const tone = counts.stuck > 0 ? "stuck" : "queued";
  const label =
    counts.stuck > 0
      ? `${counts.queued + counts.stuck} pending — ${counts.stuck} need attention`
      : `${counts.queued} pending sync`;

  return (
    <span
      aria-label={label}
      className={
        tone === "stuck"
          ? "ml-auto rounded-full bg-[var(--accent-9,#dc2626)] px-1.5 py-0.5 text-[10px] font-semibold text-white"
          : "ml-auto rounded-full bg-[var(--surface-raised)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]"
      }
    >
      {total}
    </span>
  );
}
