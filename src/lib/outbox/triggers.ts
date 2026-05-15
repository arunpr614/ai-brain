/**
 * Outbox retry triggers — v0.6.x offline mode (OFFLINE-4 / plan v3 §4.2 + §5.4).
 *
 * Wires four sync triggers to the sync-worker. All four are foreground-only
 * — Android freezes the WebView ~30s after backgrounding (plan §3.1
 * empirical evidence), so timer-based retries are unreliable beyond that.
 * The v0.7.x WorkManager plan (§4.10) covers the closed-app case.
 *
 *   1. @capacitor/network → networkStatusChange to connected:
 *        reset all queued rows' next_retry_at to now, then drain
 *   2. @capacitor/app → appStateChange to active:
 *        drain (no reset; honors per-row cooldown)
 *   3. 30s in-app interval (only ticks while WebView unfrozen):
 *        drain
 *   4. User-driven: caller invokes runOnce() directly from a "Sync now"
 *      button (OFFLINE-7)
 *
 * Concurrency: a single in-memory `running` flag prevents two drains from
 * overlapping. A trigger that fires during a running drain is ignored —
 * the next trigger after completion will pick up any new work. This is
 * sufficient because the triggers are coarse (foreground / network up /
 * 30s) and the orchestrator's snapshot semantics (§5.8) already prevent
 * mid-run mutations from being lost.
 *
 * Lifecycle: install() returns an unsubscribe function the caller must
 * invoke on unmount. ShareHandler does this in its cleanup.
 */

import { countByStatus, type OutboxDb } from "./storage";
import { maybeNotifyStuckTransition } from "./notifications";
import { resetQueuedRetryTimes, syncOnce, type Transport } from "./sync-worker";

/** Re-checks every 30 seconds while the app is foreground. */
export const FOREGROUND_TICK_MS = 30_000;

export interface TriggerInstall {
  /** Manually fire a sync — call from a "Sync now" button. */
  runOnce: () => Promise<void>;
  /** Tear down the listeners + interval. Idempotent. */
  uninstall: () => void;
}

/**
 * Install retry triggers. The transport is built once at the call site
 * (e.g. inside ShareHandler's effect) so the bearer token + base URL
 * resolution happens once per session. If the bearer rotates mid-session
 * you should `uninstall()` and re-install with the new transport.
 */
export async function installTriggers(
  db: OutboxDb,
  transport: Transport,
): Promise<TriggerInstall> {
  let running = false;
  let disposed = false;
  const cleanups: Array<() => void> = [];

  async function drainOnce(): Promise<void> {
    if (disposed || running) return;
    running = true;
    try {
      await syncOnce(db, transport);
      // Notify on the 0 → ≥1 stuck transition (plan §5.6 / OFFLINE-8).
      const stuckCount = await countByStatus(db, "stuck");
      await maybeNotifyStuckTransition(stuckCount);
    } finally {
      running = false;
    }
  }

  async function drainAfterReset(): Promise<void> {
    if (disposed) return;
    await resetQueuedRetryTimes(db);
    await drainOnce();
  }

  // 1. Network status changes.
  try {
    const mod = await import("@capacitor/network");
    const handle = await mod.Network.addListener("networkStatusChange", (status) => {
      if (status.connected) {
        void drainAfterReset();
      }
    });
    cleanups.push(() => {
      handle.remove().catch(() => undefined);
    });
  } catch {
    // Plugin unavailable in this build — fall back to browser online event.
    if (typeof window !== "undefined") {
      const onOnline = () => {
        void drainAfterReset();
      };
      window.addEventListener("online", onOnline);
      cleanups.push(() => window.removeEventListener("online", onOnline));
    }
  }

  // 2. App foreground transitions. @capacitor/app is not yet a build dep
  //    (deferred — plan §7 only lists @capacitor/network for this commit).
  //    Until then, the browser visibilitychange event is sufficient inside
  //    a Capacitor WebView since Android fires it on activity resume.
  if (typeof document !== "undefined") {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void drainOnce();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
  }

  // 3. Foreground tick — only ticks while the WebView is unfrozen.
  const intervalId =
    typeof window !== "undefined"
      ? window.setInterval(() => {
          void drainOnce();
        }, FOREGROUND_TICK_MS)
      : null;
  if (intervalId !== null) {
    cleanups.push(() => window.clearInterval(intervalId));
  }

  // Initial drain on install — covers the case where the app booted with
  // queued rows already in the outbox (re-open after offline saves).
  void drainOnce();

  return {
    runOnce: drainOnce,
    uninstall: () => {
      if (disposed) return;
      disposed = true;
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          // Best-effort cleanup.
        }
      }
    },
  };
}
