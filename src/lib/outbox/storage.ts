/**
 * Outbox IndexedDB storage layer — v0.6.x offline mode (OFFLINE-1B / plan v3 §4.3).
 *
 * Wraps `idb` (1.19 KB brotli) around a single object store named `outbox`
 * with three indexes: by_status, by_created_at, by_content_hash. The choice
 * to roll our own thin wrapper (vs Workbox) is documented in
 * docs/research/offline-queue-prior-art.md — primarily because the v0.7.x
 * WorkManager bridge (plan §4.10) needs to read this schema unchanged from
 * native Kotlin code.
 *
 * Init lifecycle (plan §5.10 / B-5 race fix):
 *   1. Caller invokes initOutbox() at app boot in a top-level client effect.
 *   2. initOutbox() opens the DB, requests storage.persist(), and resolves
 *      with a status object. The share-handler awaits this Promise BEFORE
 *      attaching its `shareReceived` listener so no event lands at a
 *      not-ready outbox.
 *
 * Quota pre-flight (plan §5.9 / C-3):
 *   - putEntry() throws QuotaWarning if usage/quota > 0.95 at write time.
 *   - The caller (share-handler) catches QuotaWarning explicitly and shows
 *     the "Storage almost full" toast; other errors bubble.
 *
 * Tests live alongside in storage.test.ts and use fake-indexeddb to
 * exercise the real idb code paths without a browser.
 */

import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { OutboxEntry, OutboxStatus } from "./types";

export const DB_NAME = "brain-outbox";
export const DB_VERSION = 1;
export const STORE_NAME = "outbox";

/** Threshold above which putEntry refuses to write. Plan §4.2 / §5.9. */
export const QUOTA_REJECT_RATIO = 0.95;
/** Threshold above which the UI surfaces a non-blocking warning. Plan §8.2. */
export const QUOTA_WARN_RATIO = 0.8;

/**
 * Thrown by putEntry when navigator.storage.estimate() reports
 * usage / quota > QUOTA_REJECT_RATIO. The caller is expected to surface
 * a "Storage almost full" toast and skip enqueue rather than retry.
 */
export class QuotaWarning extends Error {
  readonly usage: number;
  readonly quota: number;

  constructor(usage: number, quota: number) {
    super(
      `Outbox quota near limit (${(usage / quota * 100).toFixed(1)}% used)`,
    );
    this.name = "QuotaWarning";
    this.usage = usage;
    this.quota = quota;
  }
}

interface OutboxSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: OutboxEntry;
    indexes: {
      by_status: OutboxStatus;
      by_created_at: number;
      by_content_hash: string;
    };
  };
}

export type OutboxDb = IDBPDatabase<OutboxSchema>;

/**
 * Result of initOutbox(). Surfaced to the caller so the UI can show a
 * one-time toast if persistence is denied (plan §5.1).
 */
export interface InitResult {
  db: OutboxDb;
  /** True if storage.persist() returned true; false if denied; null if unsupported. */
  persistGranted: boolean | null;
  /** Set when the persistence query threw — informational only. */
  persistError?: string;
}

/**
 * Opens the outbox DB and asks for durable storage. Idempotent at the IDB
 * layer — calling twice opens the same DB. The caller (app layout) is
 * expected to gate share-handler listener registration on this Promise.
 *
 * Tests patch `globalThis.indexedDB` via `fake-indexeddb/auto` before
 * calling initOutbox. Production code reads navigator.storage; the
 * `storage` option is the test seam for the persist() branch.
 */
export async function initOutbox(opts?: {
  storage?: Pick<typeof navigator.storage, "persist">;
}): Promise<InitResult> {
  const db = await openDB<OutboxSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("by_status", "status");
      store.createIndex("by_created_at", "created_at");
      store.createIndex("by_content_hash", "content_hash");
    },
  });

  const storage = opts?.storage ?? (typeof navigator !== "undefined" ? navigator.storage : undefined);
  let persistGranted: boolean | null = null;
  let persistError: string | undefined;
  if (storage && typeof storage.persist === "function") {
    try {
      persistGranted = await storage.persist();
    } catch (err) {
      persistError = err instanceof Error ? err.message : String(err);
    }
  }

  const result: InitResult = { db, persistGranted };
  if (persistError) result.persistError = persistError;
  return result;
}

/**
 * Insert or replace an entry. Pre-flights against navigator.storage.estimate()
 * to fail fast before the IDB write itself trips a QuotaExceededError.
 *
 * Tests pass a `storage` shim to drive the pre-flight branch deterministically;
 * production code reads navigator.storage.
 */
export async function putEntry(
  db: OutboxDb,
  entry: OutboxEntry,
  opts?: { storage?: Pick<typeof navigator.storage, "estimate"> },
): Promise<void> {
  const storage = opts?.storage ?? (typeof navigator !== "undefined" ? navigator.storage : undefined);
  if (storage && typeof storage.estimate === "function") {
    const est = await storage.estimate();
    const usage = typeof est.usage === "number" ? est.usage : 0;
    const quota = typeof est.quota === "number" ? est.quota : 0;
    if (quota > 0 && usage / quota > QUOTA_REJECT_RATIO) {
      throw new QuotaWarning(usage, quota);
    }
  }
  await db.put(STORE_NAME, entry);
}

/** Get a single entry by id, or undefined if absent. */
export async function getEntry(
  db: OutboxDb,
  id: string,
): Promise<OutboxEntry | undefined> {
  return db.get(STORE_NAME, id);
}

/**
 * Find an existing entry by content_hash for the outbox-tier dedup
 * (plan §5.2 step 2). Returns the first match, or undefined.
 */
export async function findByContentHash(
  db: OutboxDb,
  contentHash: string,
): Promise<OutboxEntry | undefined> {
  return db.getFromIndex(STORE_NAME, "by_content_hash", contentHash);
}

/**
 * Iterate entries by status. Used by sync-worker to walk all `queued`
 * rows and by /inbox to render grouped views.
 */
export async function listByStatus(
  db: OutboxDb,
  status: OutboxStatus,
): Promise<OutboxEntry[]> {
  return db.getAllFromIndex(STORE_NAME, "by_status", status);
}

/** Count entries currently in a given status. Used for the nav-bar badge. */
export async function countByStatus(
  db: OutboxDb,
  status: OutboxStatus,
): Promise<number> {
  return db.countFromIndex(STORE_NAME, "by_status", status);
}

/** All entries, oldest first. Used by /inbox cold render. */
export async function listAllByCreatedAt(db: OutboxDb): Promise<OutboxEntry[]> {
  return db.getAllFromIndex(STORE_NAME, "by_created_at");
}

/** Hard delete by id. Used by the Discard action (plan §4.4 / Q3). */
export async function deleteEntry(db: OutboxDb, id: string): Promise<void> {
  await db.delete(STORE_NAME, id);
}

/** Test-only — wipes the entire store. Never call from production code. */
export async function __resetForTests(db: OutboxDb): Promise<void> {
  await db.clear(STORE_NAME);
}
