/**
 * Unit tests for src/lib/outbox/notifications.ts (OFFLINE-8 / plan v3 §5.6).
 *
 * Most logic lives in shouldFireOnTransition (pure function). The
 * transition observer maybeNotifyStuckTransition is exercised through a
 * stub plugin to assert schedule/cancel calls without spinning up
 * Capacitor.
 */
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  __resetForTests,
  maybeNotifyStuckTransition,
  shouldFireOnTransition,
} from "./notifications";

interface ScheduledCall {
  id: number;
  title: string;
  body: string;
}

interface CancelCall {
  id: number;
}

function stubApi() {
  const scheduled: ScheduledCall[] = [];
  const cancelled: CancelCall[] = [];
  return {
    api: {
      requestPermissions: async () => ({ display: "granted" }),
      schedule: async (opts: { notifications: ScheduledCall[] }) => {
        scheduled.push(...opts.notifications);
      },
      cancel: async (opts: { notifications: CancelCall[] }) => {
        cancelled.push(...opts.notifications);
      },
    },
    scheduled,
    cancelled,
  };
}

describe("shouldFireOnTransition", () => {
  it("fires on the 0 → 1 transition", () => {
    assert.equal(shouldFireOnTransition(0, 1, 100_000, 0), true);
  });

  it("fires on the 0 → N>1 transition", () => {
    assert.equal(shouldFireOnTransition(0, 5, 100_000, 0), true);
  });

  it("does NOT fire on N → N+1 (already showing)", () => {
    assert.equal(shouldFireOnTransition(2, 3, 100_000, 0), false);
  });

  it("does NOT fire on N → 0 (we cancel instead)", () => {
    assert.equal(shouldFireOnTransition(2, 0, 100_000, 0), false);
  });

  it("does NOT fire when nextStuck=0 even from 0", () => {
    assert.equal(shouldFireOnTransition(0, 0, 100_000, 0), false);
  });

  it("debounces back-to-back fires within 30s", () => {
    // 0 → 1 fired at t=0; another 0 → 1 at t=15s should be suppressed.
    assert.equal(shouldFireOnTransition(0, 1, 15_000, 0), false);
  });

  it("allows fires after the debounce window", () => {
    assert.equal(shouldFireOnTransition(0, 1, 31_000, 0), true);
  });
});

describe("maybeNotifyStuckTransition", () => {
  beforeEach(() => __resetForTests());

  it("schedules a notification on 0 → 1", async () => {
    const { api, scheduled } = stubApi();
    await maybeNotifyStuckTransition(1, { now: 100_000, api });
    assert.equal(scheduled.length, 1);
    assert.match(scheduled[0].title, /Brain/);
    assert.match(scheduled[0].body, /1 item needs/);
  });

  it("uses plural copy when stuck count > 1", async () => {
    const { api, scheduled } = stubApi();
    await maybeNotifyStuckTransition(3, { now: 100_000, api });
    assert.match(scheduled[0].body, /3 items need/);
  });

  it("does not schedule on 0 → 0", async () => {
    const { api, scheduled } = stubApi();
    await maybeNotifyStuckTransition(0, { now: 100_000, api });
    assert.equal(scheduled.length, 0);
  });

  it("cancels the notification on N → 0", async () => {
    const { api, scheduled, cancelled } = stubApi();
    // First push count to 1 (so the next call sees prev=1)
    await maybeNotifyStuckTransition(1, { now: 100_000, api });
    assert.equal(scheduled.length, 1);
    // Then drop to 0
    await maybeNotifyStuckTransition(0, { now: 200_000, api });
    assert.equal(cancelled.length, 1);
  });

  it("debounces a second 0 → 1 within 30s", async () => {
    const { api, scheduled } = stubApi();
    await maybeNotifyStuckTransition(1, { now: 100_000, api });
    // Drop to 0 (so prev=0 again next time)
    await maybeNotifyStuckTransition(0, { now: 105_000, api });
    // Back to 1 within debounce window from the FIRST fire
    await maybeNotifyStuckTransition(1, { now: 110_000, api });
    assert.equal(scheduled.length, 1, "second fire should be debounced");
  });

  it("allows a second fire after the debounce window", async () => {
    const { api, scheduled } = stubApi();
    await maybeNotifyStuckTransition(1, { now: 100_000, api });
    await maybeNotifyStuckTransition(0, { now: 105_000, api });
    await maybeNotifyStuckTransition(1, { now: 200_000, api });
    assert.equal(scheduled.length, 2);
  });

  it("is a no-op when api is null (non-Capacitor build)", async () => {
    await maybeNotifyStuckTransition(1, { now: 100_000, api: null });
    // No throw, no observable side effect.
    assert.ok(true);
  });
});
