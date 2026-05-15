/**
 * Unit tests for src/lib/outbox/storage.ts (OFFLINE-1B / plan v3 §4.3).
 *
 * Uses fake-indexeddb/auto to install a pure-JS IDB into globalThis,
 * letting the real idb library exercise actual schema/index/transaction
 * paths without a browser. Each test opens its own freshly-deleted DB
 * for isolation — the layer is otherwise stateful at the global level.
 */
import "fake-indexeddb/auto";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  DB_NAME,
  QuotaWarning,
  countByStatus,
  deleteEntry,
  findByContentHash,
  getEntry,
  initOutbox,
  listAllByCreatedAt,
  listByStatus,
  putEntry,
  type OutboxDb,
} from "./storage";
import type { OutboxEntry } from "./types";

// Each test owns its own DB. The handle is closed in afterEach so the
// next deleteDatabase() doesn't block on an open connection.
let activeDb: OutboxDb | null = null;

async function freshDb(): Promise<OutboxDb> {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
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
    id: "id-url-1",
    kind: "url",
    payload: { url: "https://example.com/post" },
    status: "queued",
    attempts: 0,
    created_at: 1_000_000,
    content_hash: "hash-url-1",
    ...overrides,
  } as OutboxEntry;
}

function noteEntry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: "id-note-1",
    kind: "note",
    payload: { title: "T", body: "B" },
    status: "queued",
    attempts: 0,
    created_at: 1_000_001,
    content_hash: "hash-note-1",
    ...overrides,
  } as OutboxEntry;
}

function pdfEntry(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    id: "id-pdf-1",
    kind: "pdf",
    file_path: "/data/files/foo.pdf",
    file_name: "foo.pdf",
    file_size: 1024,
    expected_sha256: "abc",
    status: "queued",
    attempts: 0,
    created_at: 1_000_002,
    content_hash: "hash-pdf-1",
    ...overrides,
  } as OutboxEntry;
}

// Boot helper that clears any existing DB and calls initOutbox with the
// provided storage shim. Used by initOutbox tests that need to override
// the persist() branch.
async function bootWith(storage: { persist?: () => Promise<boolean> }) {
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
  const result = await initOutbox({
    storage: storage as { persist: () => Promise<boolean> },
  });
  activeDb = result.db;
  return result;
}

describe("initOutbox", () => {
  afterEach(teardown);

  it("creates the store and indexes on first open", async () => {
    const db = await freshDb();
    assert.ok(db.objectStoreNames.contains("outbox"));
    const tx = db.transaction("outbox", "readonly");
    const idxNames = Array.from(tx.store.indexNames);
    assert.deepEqual(idxNames.sort(), ["by_content_hash", "by_created_at", "by_status"]);
  });

  it("returns persistGranted=true when storage.persist resolves true", async () => {
    const result = await bootWith({ persist: async () => true });
    assert.equal(result.persistGranted, true);
    assert.equal(result.persistError, undefined);
  });

  it("returns persistGranted=false when storage.persist resolves false", async () => {
    const result = await bootWith({ persist: async () => false });
    assert.equal(result.persistGranted, false);
  });

  it("captures persistError when storage.persist throws", async () => {
    const result = await bootWith({
      persist: async () => {
        throw new Error("denied-by-policy");
      },
    });
    assert.equal(result.persistGranted, null);
    assert.equal(result.persistError, "denied-by-policy");
  });

  it("returns persistGranted=null when storage.persist is unavailable", async () => {
    const result = await bootWith({});
    assert.equal(result.persistGranted, null);
  });
});

describe("putEntry / getEntry", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("round-trips a URL entry", async () => {
    const entry = urlEntry();
    await putEntry(db, entry);
    const got = await getEntry(db, entry.id);
    assert.deepEqual(got, entry);
  });

  it("round-trips a note entry", async () => {
    const entry = noteEntry();
    await putEntry(db, entry);
    const got = await getEntry(db, entry.id);
    assert.deepEqual(got, entry);
  });

  it("round-trips a PDF entry with filesystem path metadata", async () => {
    const entry = pdfEntry();
    await putEntry(db, entry);
    const got = await getEntry(db, entry.id);
    assert.deepEqual(got, entry);
  });

  it("replaces on duplicate id (keyPath: id)", async () => {
    await putEntry(db, urlEntry({ id: "same", attempts: 0 }));
    await putEntry(db, urlEntry({ id: "same", attempts: 5 }));
    const got = await getEntry(db, "same");
    assert.equal(got?.attempts, 5);
  });

  it("getEntry returns undefined for a missing id", async () => {
    const got = await getEntry(db, "nope");
    assert.equal(got, undefined);
  });
});

describe("putEntry quota pre-flight", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("writes when usage/quota is below the reject ratio", async () => {
    const storage = {
      estimate: async () => ({ usage: 100, quota: 1000 }), // 10%
    };
    await putEntry(db, urlEntry(), { storage });
    const got = await getEntry(db, "id-url-1");
    assert.ok(got);
  });

  it("throws QuotaWarning when usage/quota exceeds 0.95", async () => {
    const storage = {
      estimate: async () => ({ usage: 960, quota: 1000 }), // 96%
    };
    await assert.rejects(
      () => putEntry(db, urlEntry(), { storage }),
      (err) => err instanceof QuotaWarning && err.usage === 960 && err.quota === 1000,
    );
  });

  it("does not pre-flight when quota is 0 (fresh / unsupported)", async () => {
    const storage = {
      estimate: async () => ({ usage: 0, quota: 0 }),
    };
    await putEntry(db, urlEntry(), { storage });
    const got = await getEntry(db, "id-url-1");
    assert.ok(got);
  });

  it("does not pre-flight when storage.estimate is missing", async () => {
    await putEntry(db, urlEntry(), { storage: undefined });
    const got = await getEntry(db, "id-url-1");
    assert.ok(got);
  });
});

describe("findByContentHash", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("returns the entry whose content_hash matches", async () => {
    await putEntry(db, urlEntry({ id: "a", content_hash: "h1" }));
    await putEntry(db, urlEntry({ id: "b", content_hash: "h2" }));
    const got = await findByContentHash(db, "h2");
    assert.equal(got?.id, "b");
  });

  it("returns undefined when no entry matches", async () => {
    await putEntry(db, urlEntry({ content_hash: "h1" }));
    const got = await findByContentHash(db, "nope");
    assert.equal(got, undefined);
  });
});

describe("listByStatus / countByStatus", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("returns only entries with the requested status", async () => {
    await putEntry(db, urlEntry({ id: "q1", status: "queued" }));
    await putEntry(db, urlEntry({ id: "q2", status: "queued", content_hash: "h-q2" }));
    await putEntry(db, urlEntry({ id: "s1", status: "synced", content_hash: "h-s1" }));
    const queued = await listByStatus(db, "queued");
    assert.equal(queued.length, 2);
    assert.deepEqual(queued.map((e) => e.id).sort(), ["q1", "q2"]);
  });

  it("countByStatus tallies correctly", async () => {
    await putEntry(db, urlEntry({ id: "a", status: "stuck", content_hash: "ha" }));
    await putEntry(db, urlEntry({ id: "b", status: "stuck", content_hash: "hb" }));
    await putEntry(db, urlEntry({ id: "c", status: "synced", content_hash: "hc" }));
    assert.equal(await countByStatus(db, "stuck"), 2);
    assert.equal(await countByStatus(db, "synced"), 1);
    assert.equal(await countByStatus(db, "queued"), 0);
  });
});

describe("listAllByCreatedAt", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("returns entries in created_at order", async () => {
    await putEntry(db, urlEntry({ id: "newer", created_at: 2_000, content_hash: "hn" }));
    await putEntry(db, urlEntry({ id: "older", created_at: 1_000, content_hash: "ho" }));
    await putEntry(db, urlEntry({ id: "middle", created_at: 1_500, content_hash: "hm" }));
    const all = await listAllByCreatedAt(db);
    assert.deepEqual(all.map((e) => e.id), ["older", "middle", "newer"]);
  });
});

describe("deleteEntry", () => {
  let db: Awaited<ReturnType<typeof freshDb>>;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(teardown);

  it("removes an entry by id", async () => {
    await putEntry(db, urlEntry());
    await deleteEntry(db, "id-url-1");
    assert.equal(await getEntry(db, "id-url-1"), undefined);
  });

  it("is a no-op for a missing id", async () => {
    await deleteEntry(db, "ghost");
    assert.equal(await countByStatus(db, "queued"), 0);
  });
});

describe("QuotaWarning", () => {
  it("formats a useful message and exposes usage/quota", () => {
    const err = new QuotaWarning(950, 1000);
    assert.equal(err.name, "QuotaWarning");
    assert.equal(err.usage, 950);
    assert.equal(err.quota, 1000);
    assert.match(err.message, /95\.0%/);
  });

  it("is an instance of Error for try/catch interop", () => {
    const err = new QuotaWarning(1, 100);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof QuotaWarning);
  });
});
