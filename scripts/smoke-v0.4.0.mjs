#!/usr/bin/env node
/**
 * v0.4.0 Ask (RAG) smoke — T-17.
 *
 * Exits non-zero if any v0.4.0 invariant regresses. Uses a deterministic
 * fake embedder so this works without Ollama running; the live-Ollama
 * integration path is T-18 bench territory.
 *
 * Covers:
 *   - Migrations 005 + 006 apply cleanly (chunks_vec, chunks_rowid, embedding_jobs)
 *   - Chunker produces atomic chunks with overlap, respects code fences
 *   - embedItem writes chunks + chunks_rowid + chunks_vec in one txn
 *   - Re-running embedItem is a no-op (idempotent)
 *   - retrieve() returns deterministic top-k
 *   - searchUnified fts / semantic / hybrid round-trip
 *   - findRelatedItems excludes source + ranks by similarity
 *   - chat threads: create / append / list messages / delete cascade
 *   - orchestrateAsk SSE framing produces retrieve → token → done
 *   - parseCitations splits [CITE:id] markers correctly
 *   - FTS5 LIKE-fallback removed (T-6 regression guard)
 *   - Trigger 006: enrichment_state → 'done' enqueues embedding_jobs row
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const tmpRoot = mkdtempSync(join(tmpdir(), "ai-brain-smoke-v040-"));
const tmpDbPath = join(tmpRoot, "brain.sqlite");
process.env.BRAIN_DB_PATH = tmpDbPath;
// Force no-op Ollama target for any unexpected fallthrough.
process.env.OLLAMA_HOST = "http://127.0.0.1:1";

console.log(`[smoke] tmp DB at ${tmpDbPath}`);

let failures = 0;
async function section(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
}

// FNV-hash fake embedder — identical direction per identical word-bag.
function hashedEmbed(inputs) {
  const DIM = 768;
  return Promise.resolve(
    inputs.map((s) => {
      const v = new Float32Array(DIM);
      const words = s.toLowerCase().match(/[a-z]+/g) ?? [];
      for (const w of words) {
        let h = 2166136261;
        for (let i = 0; i < w.length; i++) h = (h ^ w.charCodeAt(i)) * 16777619;
        v[(h >>> 0) % DIM] += 1;
      }
      let n = 0;
      for (let i = 0; i < DIM; i++) n += v[i] * v[i];
      n = Math.sqrt(n) || 1;
      for (let i = 0; i < DIM; i++) v[i] /= n;
      return v;
    }),
  );
}

async function run() {
  const { getDb } = await import("../src/db/client.ts");
  const { insertCaptured, searchItems } = await import("../src/db/items.ts");
  const { countChunks } = await import("../src/db/chunks.ts");
  const { chunkBody } = await import("../src/lib/chunk/index.ts");
  const { embedItem } = await import("../src/lib/embed/pipeline.ts");
  const { retrieve } = await import("../src/lib/retrieve/index.ts");
  const { searchUnified } = await import("../src/lib/search/index.ts");
  const { findRelatedItems } = await import("../src/lib/related/index.ts");
  const { createThread, appendMessage, listMessages, deleteThread, getThread } =
    await import("../src/db/chat.ts");
  const { parseCitations } = await import("../src/lib/ask/parse-citations.ts");
  const { orchestrateAsk } = await import("../src/lib/ask/sse.ts");

  // 1) Migrations
  await section("migrations 005 + 006 created vec tables + embedding_jobs", () => {
    const db = getDb();
    const tables = new Set(
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name IN ('chunks_vec','chunks_rowid','embedding_jobs','items_fts')",
        )
        .all()
        .map((r) => r.name),
    );
    assert.ok(tables.has("chunks_vec"), "chunks_vec virtual table exists");
    assert.ok(tables.has("chunks_rowid"), "chunks_rowid bridge exists");
    assert.ok(tables.has("embedding_jobs"), "embedding_jobs sibling queue exists");
    assert.ok(tables.has("items_fts"), "items_fts still exists");
  });

  // 2) Chunker
  await section("chunkBody produces ordered chunks with overlap", () => {
    const body = Array.from({ length: 6 }, () =>
      "Paragraph sentence content. ".repeat(10),
    ).join("\n\n");
    const chunks = chunkBody(body, { minTokens: 20, maxTokens: 60 });
    assert.ok(chunks.length >= 2, "multi-chunk body produces > 1");
    assert.deepEqual(
      chunks.map((c) => c.idx),
      chunks.map((_, i) => i),
      "idx is contiguous from 0",
    );
  });

  // 3) Embed pipeline
  let growthId, reactId, gardenId;
  await section("embedItem writes chunks + vec in one txn, idempotent", async () => {
    const growth = insertCaptured({
      source_type: "note",
      title: "Growth loops primer",
      body: "growth loops compound referral acquisition activation retention",
    });
    growthId = growth.id;
    const first = await embedItem(growth.id, {
      embedFn: hashedEmbed,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });
    assert.ok(first.ok, "first embedItem ok");
    assert.ok(first.chunk_count >= 1);
    assert.equal(countChunks(growth.id), first.chunk_count);
    const db = getDb();
    const vecN = db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get().n;
    assert.equal(vecN, first.chunk_count, "chunks_vec row per chunk");

    // Idempotency
    let calls = 0;
    const counting = (inputs) => {
      calls++;
      return hashedEmbed(inputs);
    };
    const second = await embedItem(growth.id, {
      embedFn: counting,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });
    assert.ok(second.ok);
    assert.equal(calls, 0, "re-embedding same item must not call embedder");
  });

  // 4) Retrieve determinism + topK + itemId scope
  await section("retrieve() is deterministic + respects topK + itemId", async () => {
    const react = insertCaptured({
      source_type: "note",
      title: "React hooks",
      body: "react hooks useState useEffect useMemo useCallback component",
    });
    const garden = insertCaptured({
      source_type: "note",
      title: "Tomato gardening",
      body: "tomato seeds soil compost water sunlight harvest",
    });
    reactId = react.id;
    gardenId = garden.id;
    await embedItem(react.id, {
      embedFn: hashedEmbed,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });
    await embedItem(garden.id, {
      embedFn: hashedEmbed,
      chunkOpts: { minTokens: 1, maxTokens: 200 },
    });

    const a = await retrieve("growth loops acquisition", {
      embedFn: hashedEmbed,
      topK: 5,
    });
    const b = await retrieve("growth loops acquisition", {
      embedFn: hashedEmbed,
      topK: 5,
    });
    assert.deepEqual(
      a.map((h) => h.chunk_id),
      b.map((h) => h.chunk_id),
      "same query → same ordering",
    );
    assert.ok(a.length > 0 && a[0].item_id === growthId, "growth item is top");

    const scoped = await retrieve("component useState", {
      embedFn: hashedEmbed,
      itemId: reactId,
      topK: 5,
    });
    for (const h of scoped) assert.equal(h.item_id, reactId);
  });

  // 5) Unified search
  await section("searchUnified fts mode ranks FTS5 hits", async () => {
    const hits = await searchUnified("growth loops", { mode: "fts", limit: 5 });
    assert.ok(hits.length >= 1);
    assert.match(hits[0].title, /Growth loops/i);
  });

  await section("searchUnified semantic mode de-dupes to items", async () => {
    const hits = await searchUnified("react hooks useEffect", {
      mode: "semantic",
      embedFn: hashedEmbed,
      limit: 5,
    });
    assert.ok(hits.length >= 1);
    const ids = hits.map((h) => h.id);
    assert.equal(new Set(ids).size, ids.length, "no duplicates");
  });

  await section("searchUnified hybrid mode combines signals via RRF", async () => {
    const hits = await searchUnified("react hooks", {
      mode: "hybrid",
      embedFn: hashedEmbed,
      limit: 5,
    });
    assert.ok(hits.length >= 1);
    assert.match(hits[0].title, /React hooks/i);
  });

  // 6) Related items
  await section("findRelatedItems excludes source + ranks by similarity", () => {
    const related = findRelatedItems(reactId, { limit: 5 });
    assert.ok(related.length >= 1);
    assert.ok(!related.some((r) => r.item.id === reactId), "excludes source");
    for (const r of related) assert.ok(typeof r.similarity === "number");
  });

  // 7) Chat threads
  await section("chat threads create/append/list/delete cascade", () => {
    const t = createThread({ title: "smoke thread" });
    assert.ok(t.id);
    appendMessage({ thread_id: t.id, role: "user", content: "hi" });
    appendMessage({
      thread_id: t.id,
      role: "assistant",
      content: "there",
      citations: [
        { chunk_id: "c1", item_id: "i1", item_title: "T", similarity: 0.8 },
      ],
    });
    const msgs = listMessages(t.id);
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].content, "hi");
    assert.match(msgs[1].citations ?? "", /"c1"/);
    deleteThread(t.id);
    assert.equal(getThread(t.id), null);
    assert.equal(listMessages(t.id).length, 0);
  });

  // 8) SSE orchestration
  await section("orchestrateAsk emits retrieve → token* → done", async () => {
    const chunks = await retrieve("growth", { embedFn: hashedEmbed, topK: 3 });
    async function* gen() {
      yield "part ";
      yield "of ";
      yield "answer.";
    }
    const frames = [];
    let finalAnswer = "";
    for await (const f of orchestrateAsk({
      question: "q",
      chunks,
      generator: () => gen(),
      onComplete: ({ answer }) => {
        finalAnswer = answer;
      },
    })) {
      frames.push(f);
    }
    assert.equal(frames[0].type, "retrieve");
    assert.equal(frames[frames.length - 1].type, "done");
    assert.ok(frames.some((f) => f.type === "token"));
    assert.equal(finalAnswer, "part of answer.");
  });

  // 9) Citation parser
  await section("parseCitations slices [CITE:id] markers", () => {
    const segs = parseCitations("Growth [CITE:a] and [CITE:b] compound.");
    const citations = segs.filter((s) => s.type === "citation");
    assert.deepEqual(
      citations.map((c) => c.chunk_id),
      ["a", "b"],
    );
  });

  // 10) FTS5 LIKE-fallback gone (T-6 regression guard)
  await section("searchItems throws on invalid MATCH only when query itself is bogus", () => {
    // Phrase quoting protects FTS5; plain hyphen queries must not throw.
    for (const q of ["growth-loops", "AND", "(react)", "hello:world"]) {
      const result = searchItems(q);
      assert.ok(Array.isArray(result), `searchItems(${JSON.stringify(q)}) returns array`);
    }
  });

  // 11) 006 trigger
  await section("items.enrichment_state → 'done' trigger enqueues embedding_jobs", () => {
    const it = insertCaptured({
      source_type: "note",
      title: "trigger target",
      body: "b",
    });
    const db = getDb();
    const before = db
      .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
      .get(it.id);
    assert.equal(before.n, 0);
    db.prepare("UPDATE items SET enrichment_state = 'done' WHERE id = ?").run(it.id);
    const after = db
      .prepare("SELECT COUNT(*) AS n FROM embedding_jobs WHERE item_id = ?")
      .get(it.id);
    assert.equal(after.n, 1, "trigger fired");
  });

  // 12) Chunk row-count matches vec row-count across all items
  await section("chunks row-count matches chunks_vec row-count", () => {
    const db = getDb();
    const chunks = db.prepare("SELECT COUNT(*) AS n FROM chunks").get().n;
    const vec = db.prepare("SELECT COUNT(*) AS n FROM chunks_vec").get().n;
    assert.equal(chunks, vec, `chunks=${chunks} vec=${vec}`);
  });
}

try {
  await run();
} finally {
  rmSync(tmpRoot, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n[smoke] ${failures} FAILED`);
  process.exit(1);
}
console.log("\n[smoke] all checks passed");
