import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStartOfDay,
  getStartOfWeek,
  getStartOfMonth,
  filterCompletedJobs,
  calculatePresetCounts,
  formatLiveHeartbeat,
} from "./date-filters";

test("getStartOfDay calculates midnight of given timestamp", () => {
  const baseTime = new Date("2026-08-19T17:30:00.000Z").getTime();
  const midnight = getStartOfDay(baseTime);
  const midnightDate = new Date(midnight);
  assert.equal(midnightDate.getHours(), 0);
  assert.equal(midnightDate.getMinutes(), 0);
  assert.equal(midnightDate.getSeconds(), 0);
  assert.equal(midnightDate.getMilliseconds(), 0);
  assert.ok(midnight <= baseTime);
});

test("filterCompletedJobs filters correctly by preset intervals", () => {
  const now = new Date("2026-08-19T12:00:00.000Z").getTime();
  const jobs = [
    { id: 1, completed_at: now - 1000 * 60 * 30 }, // 30 mins ago (today)
    { id: 2, completed_at: now - 1000 * 60 * 60 * 4 }, // 4 hours ago (today)
    { id: 3, completed_at: now - 1000 * 60 * 60 * 48 }, // 2 days ago (this week)
    { id: 4, completed_at: now - 1000 * 60 * 60 * 24 * 15 }, // 15 days ago (this month)
    { id: 5, completed_at: now - 1000 * 60 * 60 * 24 * 45 }, // 45 days ago (older)
  ];

  const todayJobs = filterCompletedJobs(jobs, "today", now);
  assert.equal(todayJobs.length, 2);

  const weekJobs = filterCompletedJobs(jobs, "week", now);
  assert.equal(weekJobs.length, 3);

  const monthJobs = filterCompletedJobs(jobs, "month", now);
  assert.equal(monthJobs.length, 4);

  const allJobs = filterCompletedJobs(jobs, "all", now);
  assert.equal(allJobs.length, 5);
});

test("calculatePresetCounts counts items across all intervals accurately", () => {
  const now = new Date("2026-08-19T12:00:00.000Z").getTime();
  const jobs = [
    { completed_at: now - 1000 * 60 * 10 },
    { completed_at: now - 1000 * 60 * 60 * 2 },
    { completed_at: now - 1000 * 60 * 60 * 72 },
    { completed_at: now - 1000 * 60 * 60 * 24 * 20 },
    { completed_at: now - 1000 * 60 * 60 * 24 * 50 },
  ];

  const counts = calculatePresetCounts(jobs, now);
  assert.equal(counts.today, 2);
  assert.equal(counts.week, 3);
  assert.equal(counts.month, 4);
  assert.equal(counts.all, 5);
});

test("formatLiveHeartbeat transitions across online, stale, and offline states", () => {
  const now = 1787140000000;

  // 1. Fresh online (< 15s)
  const fresh = formatLiveHeartbeat(now - 3000, now);
  assert.equal(fresh.status, "online");
  assert.equal(fresh.isOnline, true);
  assert.equal(fresh.ageSeconds, 3);
  assert.ok(fresh.sublabel.includes("Seen 3s ago"));

  // 2. Stale online (15s - 45s)
  const stale = formatLiveHeartbeat(now - 30000, now);
  assert.equal(stale.status, "stale");
  assert.equal(stale.isOnline, true);
  assert.equal(stale.ageSeconds, 30);
  assert.ok(stale.sublabel.includes("Seen 30s ago"));

  // 3. Offline (> 45s)
  const offline = formatLiveHeartbeat(now - 120000, now);
  assert.equal(offline.status, "offline");
  assert.equal(offline.isOnline, false);
  assert.ok(offline.sublabel.includes("Last seen 2m ago"));

  // 4. Null / Missing
  const missing = formatLiveHeartbeat(null, now);
  assert.equal(missing.status, "offline");
  assert.equal(missing.isOnline, false);
  assert.equal(missing.sublabel, "No heartbeat received");
});
