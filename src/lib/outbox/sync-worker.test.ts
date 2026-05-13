/**
 * Unit tests for src/lib/outbox/sync-worker.ts (OFFLINE-3 / plan v3 §4.2 + §5.3 + §5.8).
 */
import "fake-indexeddb/auto";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { applyDisposition, resetQueuedRetryTimes, syncOnce, type Transport } from "./sync-worker";
import {
  DB_NAME,
  countByStatus,
  getEntry,
  initOutbox,
  listByStatus,
  putEntry,
  type OutboxDb,
} from "./storage";
import type { OutboxEntry } from "./types";
import type { Disposition, ProbeOutcome } from "./classify";

let activeDb: OutboxDb | null = null;

async function freshDb(): Promise<OutboxDb> {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  const result = await initOutbox({ storage: { persist: async () => true } });
  activeDb = result.db;
  return result.db;
}

async function teardown(): Promise<void> {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
}

function urlEntry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: "id-1",
    kind: "url",
    payload: { url: "https://example.com/post" },
    status: "queued",
    attempts: 0,
    created_at: 1_000_000,
    content_hash: "hash-1",
    ...overrides,
  } as OutboxEntry;
}

describe("applyDisposition — synced", () => {
  it("clears retry state and stores serverItemId", () => {
    const entry = urlEntry({
      attempts: 5,
      last_error: "boom",
      next_retry_at: 999,
      status: "queued",
    });
    const disposition: Disposition = { kind: "synced", serverItemId: "srv-1" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 201,
      retryAfter: null,
      body: { id: "srv-1" },
    };
    const result = applyDisposition(entry, disposition, outcome, { now: 5_000 });
    assert.equal(result.status, "synced");
    assert.equal(result.attempts, 0);
    assert.equal(result.last_error, undefined);
    assert.equal(result.next_retry_at, undefined);
    assert.equal(result.server_id, "srv-1");
    assert.equal(result.last_attempt_at, 5_000);
  });

  it("keeps existing server_id when disposition omits it", () => {
    const entry = urlEntry({ server_id: "old-srv" });
    const disposition: Disposition = { kind: "synced" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 204,
      retryAfter: null,
      body: {},
    };
    const result = applyDisposition(entry, disposition, outcome, { now: 1 });
    assert.equal(result.server_id, "old-srv");
  });
});

describe("applyDisposition — stuck", () => {
  it("auth_bad gets the re-pair copy", () => {
    const entry = urlEntry();
    const disposition: Disposition = { kind: "stuck", reason: "auth_bad" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 401,
      retryAfter: null,
      body: {},
    };
    const result = applyDisposition(entry, disposition, outcome, { now: 1 });
    assert.equal(result.status, "stuck");
    assert.equal(result.status_reason, "auth_bad");
    assert.match(result.last_error ?? "", /Re-pair/);
  });

  it("version_mismatch gets the update copy", () => {
    const entry = urlEntry();
    const disposition: Disposition = { kind: "stuck", reason: "version_mismatch" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 422,
      retryAfter: null,
      body: { code: "version_mismatch" },
    };
    const result = applyDisposition(entry, disposition, outcome, { now: 1 });
    assert.equal(result.status_reason, "version_mismatch");
    assert.match(result.last_error ?? "", /Update Brain/);
  });

  it("payload_bad gets the generic save-failed copy", () => {
    const entry = urlEntry();
    const disposition: Disposition = { kind: "stuck", reason: "payload_bad" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 422,
      retryAfter: null,
      body: {},
    };
    const result = applyDisposition(entry, disposition, outcome, { now: 1 });
    assert.equal(result.status_reason, "payload_bad");
    assert.match(result.last_error ?? "", /couldn't be saved/i);
  });
});

describe("applyDisposition — transient", () => {
  it("bumps attempts + sets next_retry_at via backoff", () => {
    const entry = urlEntry({ attempts: 0 });
    const disposition: Disposition = { kind: "transient", reason: "http_500" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 500,
      retryAfter: null,
      body: {},
    };
    const result = applyDisposition(entry, disposition, outcome, {
      now: 0,
      rng: () => 0.5,
    });
    assert.equal(result.status, "queued");
    assert.equal(result.attempts, 1);
    assert.equal(result.next_retry_at, 10_000); // attempt 1 + jitter 0
    assert.equal(result.last_error, "http_500");
    assert.equal(result.status_reason, "transient");
  });

  it("uses Retry-After header from 429 instead of backoff schedule", () => {
    const entry = urlEntry({ attempts: 0 });
    const disposition: Disposition = { kind: "transient", reason: "rate_limited" };
    const outcome: ProbeOutcome = {
      kind: "http-json",
      status: 429,
      retryAfter: "60", // seconds
      body: {},
    };
    const result = applyDisposition(entry, disposition, outcome, {
      now: 100_000,
      rng: () => 0.5,
    });
    assert.equal(result.next_retry_at, 100_000 + 60_000);
  });

  it("network-error has no Retry-After source so falls back to backoff", () => {
    const entry = urlEntry({ attempts: 2 });
    const disposition: Disposition = {
      kind: "transient",
      reason: "network: ECONNREFUSED",
    };
    const outcome: ProbeOutcome = {
      kind: "network-error",
      message: "ECONNREFUSED",
    };
    const result = applyDisposition(entry, disposition, outcome, {
      now: 0,
      rng: () => 0.5,
    });
    assert.equal(result.attempts, 3);
    assert.equal(result.next_retry_at, 40_000); // attempt 3 schedule
  });
});

describe("syncOnce — orchestration", () => {
  let db: OutboxDb;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("processes only queued rows", async () => {
    await putEntry(db, urlEntry({ id: "q1", status: "queued", content_hash: "h1" }));
    await putEntry(db, urlEntry({ id: "s1", status: "synced", content_hash: "h2" }));
    await putEntry(db, urlEntry({ id: "k1", status: "stuck", content_hash: "h3" }));
    const seen: string[] = [];
    const transport: Transport = async (entry) => {
      seen.push(entry.id);
      return {
        kind: "http-json",
        status: 200,
        retryAfter: null,
        body: { itemId: `srv-${entry.id}` },
      };
    };
    await syncOnce(db, transport, { now: 1, rng: () => 0.5 });
    assert.deepEqual(seen, ["q1"]);
  });

  it("skips queued rows whose next_retry_at is still in the future", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "future",
        status: "queued",
        next_retry_at: 100_000,
        content_hash: "hf",
      }),
    );
    let called = false;
    const transport: Transport = async () => {
      called = true;
      return {
        kind: "http-json",
        status: 200,
        retryAfter: null,
        body: {},
      };
    };
    const result = await syncOnce(db, transport, { now: 0, rng: () => 0.5 });
    assert.equal(called, false);
    assert.equal(result.skippedCooldown, 1);
    assert.equal(result.attempted, 0);
  });

  it("attempts due rows whose next_retry_at <= now", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "due",
        status: "queued",
        next_retry_at: 5,
        content_hash: "hd",
      }),
    );
    let called = false;
    const transport: Transport = async () => {
      called = true;
      return {
        kind: "http-json",
        status: 200,
        retryAfter: null,
        body: {},
      };
    };
    await syncOnce(db, transport, { now: 100, rng: () => 0.5 });
    assert.equal(called, true);
    const after = await getEntry(db, "due");
    assert.equal(after?.status, "synced");
  });

  it("counts synced / remainedQueued / becameStuck", async () => {
    await putEntry(db, urlEntry({ id: "ok", status: "queued", content_hash: "h-ok" }));
    await putEntry(db, urlEntry({ id: "tx", status: "queued", content_hash: "h-tx" }));
    await putEntry(db, urlEntry({ id: "kk", status: "queued", content_hash: "h-kk" }));
    const transport: Transport = async (entry) => {
      if (entry.id === "ok") return { kind: "http-json", status: 200, retryAfter: null, body: {} };
      if (entry.id === "tx") return { kind: "http-json", status: 503, retryAfter: null, body: {} };
      return { kind: "http-json", status: 401, retryAfter: null, body: {} };
    };
    const result = await syncOnce(db, transport, { now: 0, rng: () => 0.5 });
    assert.equal(result.attempted, 3);
    assert.equal(result.synced, 1);
    assert.equal(result.remainedQueued, 1);
    assert.equal(result.becameStuck, 1);
  });

  it("handles network-error transport outcome (no fetch throw)", async () => {
    await putEntry(db, urlEntry({ id: "off", status: "queued", content_hash: "ho" }));
    const transport: Transport = async () => ({
      kind: "network-error",
      message: "offline",
    });
    const result = await syncOnce(db, transport, { now: 0, rng: () => 0.5 });
    assert.equal(result.synced, 0);
    assert.equal(result.remainedQueued, 1);
    const after = await getEntry(db, "off");
    assert.equal(after?.status, "queued");
    assert.equal(after?.attempts, 1);
  });

  it("snapshot semantics: items added during run are not picked up this cycle", async () => {
    await putEntry(db, urlEntry({ id: "first", status: "queued", content_hash: "h1" }));
    const seen: string[] = [];
    const transport: Transport = async (entry) => {
      seen.push(entry.id);
      // Inject a new entry mid-run; it should not appear in `seen`.
      await putEntry(
        db,
        urlEntry({
          id: "injected",
          status: "queued",
          content_hash: "h-injected",
        }),
      );
      return { kind: "http-json", status: 200, retryAfter: null, body: {} };
    };
    await syncOnce(db, transport, { now: 0, rng: () => 0.5 });
    assert.deepEqual(seen, ["first"]);
    // The injected row remains queued.
    const queued = await listByStatus(db, "queued");
    assert.deepEqual(queued.map((e) => e.id), ["injected"]);
  });
});

describe("resetQueuedRetryTimes", () => {
  let db: OutboxDb;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("resets next_retry_at on rows whose value is in the future", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "a",
        status: "queued",
        next_retry_at: 1_000_000,
        content_hash: "ha",
      }),
    );
    const updated = await resetQueuedRetryTimes(db, { now: 5_000 });
    assert.equal(updated, 1);
    const after = await getEntry(db, "a");
    assert.equal(after?.next_retry_at, 5_000);
  });

  it("leaves rows whose next_retry_at is already past untouched", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "past",
        status: "queued",
        next_retry_at: 1,
        content_hash: "hp",
      }),
    );
    const updated = await resetQueuedRetryTimes(db, { now: 100 });
    assert.equal(updated, 0);
  });

  it("ignores non-queued rows", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "synced",
        status: "synced",
        next_retry_at: 1_000_000,
        content_hash: "hs",
      }),
    );
    const updated = await resetQueuedRetryTimes(db, { now: 100 });
    assert.equal(updated, 0);
  });

  it("does not touch rows with no next_retry_at", async () => {
    await putEntry(db, urlEntry({ id: "fresh", status: "queued", content_hash: "hf" }));
    const updated = await resetQueuedRetryTimes(db, { now: 100 });
    assert.equal(updated, 0);
  });
});

describe("syncOnce + resetQueuedRetryTimes integration", () => {
  let db: OutboxDb;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("after reset on connectivity-regain, all rows attempt next cycle", async () => {
    await putEntry(
      db,
      urlEntry({
        id: "stalled",
        status: "queued",
        next_retry_at: 999_999,
        attempts: 3,
        content_hash: "hst",
      }),
    );
    // First syncOnce: rows in cooldown — skipped.
    let attempted = 0;
    const transport: Transport = async () => {
      attempted++;
      return { kind: "http-json", status: 200, retryAfter: null, body: {} };
    };
    await syncOnce(db, transport, { now: 0, rng: () => 0.5 });
    assert.equal(attempted, 0);
    // Connectivity regained — reset.
    await resetQueuedRetryTimes(db, { now: 1_000 });
    // Second syncOnce: row is due now.
    await syncOnce(db, transport, { now: 1_000, rng: () => 0.5 });
    assert.equal(attempted, 1);
    assert.equal(await countByStatus(db, "synced"), 1);
  });
});
