/**
 * Outbox notification surface — v0.6.x offline mode (OFFLINE-8 / plan v3 §5.6).
 *
 * Two responsibilities, both delegated to @capacitor/local-notifications
 * inside the APK and gracefully no-op'd in any other build context:
 *
 *   1. Request POST_NOTIFICATIONS permission on the first SUCCESSFUL
 *      enqueue (plan §5.6 / Q2). This delays the system prompt until
 *      the user has actively used the offline feature, vs interrupting
 *      a fresh app launch with a permission dialog.
 *
 *   2. Fire a notification on the 0 → ≥1 stuck transition (plan §5.6).
 *      Suppress on every-retry / count-fluctuation noise. Debounced 30s
 *      so a flapping connection doesn't spam.
 *
 * Declined-permission path: the inbox sidebar badge (OFFLINE-7) becomes
 * the primary surface; we never alert the user that they declined,
 * since they made the choice.
 *
 * The state is in-memory per ShareHandler effect lifetime. After a cold
 * start, the first call to maybeNotifyStuckTransition with stuck=N>0
 * will fire — that's by design: rehydrating queued+stuck items at app
 * launch IS a "transition" from the user's perspective (they last saw
 * a green Brain; now there's a stuck item to surface).
 */

const NOTIFICATION_DEBOUNCE_MS = 30_000;
const STUCK_NOTIFICATION_ID = 1;

interface NotifierState {
  /** Last observed stuck count. Tracks transitions, not absolute values. */
  lastStuckCount: number;
  /** Wall-clock ms of the last fire — used for the 30s debounce. */
  lastFireAt: number;
  /** Has permission been requested at least once? Flips after first enqueue. */
  permissionRequested: boolean;
  /** Has the system granted the permission? null = unknown. */
  permissionGranted: boolean | null;
}

const state: NotifierState = {
  lastStuckCount: 0,
  lastFireAt: 0,
  permissionRequested: false,
  permissionGranted: null,
};

/** Minimal type shape we need from @capacitor/local-notifications. */
interface LocalNotificationsApi {
  requestPermissions(): Promise<{ display: string }>;
  schedule(opts: {
    notifications: Array<{
      id: number;
      title: string;
      body: string;
      smallIcon?: string;
      ongoing?: boolean;
      autoCancel?: boolean;
      extra?: Record<string, unknown>;
      schedule?: { at?: Date };
    }>;
  }): Promise<unknown>;
  cancel(opts: { notifications: Array<{ id: number }> }): Promise<unknown>;
}

/**
 * Lazy-load the plugin. Falls back to null when not in a Capacitor build,
 * which makes desktop dev / SSR safe.
 */
async function loadPlugin(): Promise<LocalNotificationsApi | null> {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications as unknown as LocalNotificationsApi;
  } catch {
    return null;
  }
}

/**
 * Call this from the share-handler enqueue path AFTER the row was written.
 * Idempotent — only the first invocation actually triggers the system
 * prompt; subsequent calls are no-ops in this session.
 */
export async function ensurePermissionRequested(): Promise<void> {
  if (state.permissionRequested) return;
  state.permissionRequested = true;
  const api = await loadPlugin();
  if (!api) return;
  try {
    const verdict = await api.requestPermissions();
    state.permissionGranted = verdict.display === "granted";
  } catch {
    state.permissionGranted = false;
  }
}

/**
 * Pure: should we fire on this transition? Exported for tests.
 */
export function shouldFireOnTransition(
  prevStuck: number,
  nextStuck: number,
  now: number,
  lastFireAt: number,
  debounceMs: number = NOTIFICATION_DEBOUNCE_MS,
): boolean {
  if (nextStuck === 0) return false;
  if (prevStuck === 0 && nextStuck > 0) {
    // Fresh transition — debounce against accidental repeats.
    return now - lastFireAt >= debounceMs;
  }
  // Already at ≥1; no transition.
  return false;
}

/**
 * Call after each syncOnce + after each enqueue. Fires the notification
 * if the count just crossed 0 → ≥1, debounced so a flapping connection
 * doesn't notify repeatedly.
 *
 * `nextStuckCount` is the count AFTER the operation. The function
 * compares to in-memory state.lastStuckCount to detect transitions.
 *
 * The optional `now` + `api` seams exist for tests; production callers
 * omit them.
 */
export async function maybeNotifyStuckTransition(
  nextStuckCount: number,
  opts?: { now?: number; api?: LocalNotificationsApi | null },
): Promise<void> {
  const now = opts?.now ?? Date.now();
  const prev = state.lastStuckCount;
  state.lastStuckCount = nextStuckCount;

  // 0 → ≥1: fire (if debounce allows).
  if (shouldFireOnTransition(prev, nextStuckCount, now, state.lastFireAt)) {
    state.lastFireAt = now;
    const api = opts?.api === undefined ? await loadPlugin() : opts.api;
    if (!api) return;
    if (state.permissionGranted === false) return;
    const body =
      nextStuckCount === 1
        ? "1 item needs your attention to sync."
        : `${nextStuckCount} items need your attention to sync.`;
    try {
      await api.schedule({
        notifications: [
          {
            id: STUCK_NOTIFICATION_ID,
            title: "Brain · sync needs help",
            body,
            smallIcon: "ic_stat_brain",
            autoCancel: true,
            extra: { route: "/inbox" },
          },
        ],
      });
    } catch {
      // Silently swallow; the in-app badge still surfaces the stuck count.
    }
    return;
  }

  // ≥1 → 0: clear any outstanding notification so the user isn't lied to.
  if (prev > 0 && nextStuckCount === 0) {
    const api = opts?.api === undefined ? await loadPlugin() : opts.api;
    if (!api) return;
    try {
      await api.cancel({
        notifications: [{ id: STUCK_NOTIFICATION_ID }],
      });
    } catch {
      // Best-effort.
    }
  }
}

/**
 * Test-only: reset module state so tests don't bleed into each other.
 */
export function __resetForTests(): void {
  state.lastStuckCount = 0;
  state.lastFireAt = 0;
  state.permissionRequested = false;
  state.permissionGranted = null;
}
