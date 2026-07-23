#!/usr/bin/env node
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import {
  assertStandaloneContentProcessingAllowed,
  resolveStandaloneContentProcessingAuthority,
  StandaloneContentProcessingBlockedError,
} from "./lib/content-processing-containment.mjs";

process.on("uncaughtException", () => {
  console.error("[backfill-prod] failed code=backfill_failed");
  process.exit(1);
});
process.on("unhandledRejection", () => {
  console.error("[backfill-prod] failed code=backfill_failed");
  process.exit(1);
});

loadEnvFile(".env");
loadEnvFile(".env.local");

const EMBED_DIM = 768;
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

if (!args.itemId && !args.failedOnly && !args.missingChunks) {
  console.error("[backfill-prod] target_selector_required");
  usage();
  process.exit(1);
}

if (!args.dryRun && !args.itemId && !args.confirm) {
  console.error("[backfill-prod] confirmation_required");
  process.exit(1);
}

const dbPath = resolve(process.env.BRAIN_DB_PATH || "data/brain.sqlite");
if (!existsSync(dbPath)) {
  console.error("[backfill-prod] database_unavailable");
  process.exit(1);
}

const provider = process.env.EMBED_PROVIDER || "ollama";
const model = process.env.EMBED_MODEL || (provider === "gemini" ? "gemini-embedding-001" : "nomic-embed-text");
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
try {
  sqliteVec.load(db);
} catch {
  console.warn("[backfill-prod] sqlite_vec_unavailable");
}

const initialAuthority = resolveStandaloneContentProcessingAuthority(db);
if (!initialAuthority.allowed) {
  console.error(`[backfill-prod] blocked code=${initialAuthority.code}`);
  db.close();
  process.exit(6);
}

const targets = findTargets();
if (args.dryRun) {
  console.log("[backfill-prod] dry_run_no_provider=true");
  logSummary(targets.length, 0, 0);
  process.exit(0);
}
if (targets.length === 0) {
  logSummary(0, 0, 0);
  process.exit(0);
}

assertStandaloneContentProcessingAllowed(db);
try {
  await preflight();
} catch {
  console.error("[backfill-prod] provider_preflight_failed");
  process.exit(4);
}

let ok = 0;
let failed = 0;
for (const target of targets) {
  const authority = resolveStandaloneContentProcessingAuthority(db);
  if (!authority.allowed) {
    console.error(`[backfill-prod] blocked code=${authority.code}`);
    process.exit(6);
  }
  const result = await embedItem(target.id);
  if (result.ok) {
    ok++;
  } else if (result.blocked) {
    console.error(`[backfill-prod] blocked code=${result.code}`);
    process.exit(6);
  } else {
    failed++;
  }
}

logSummary(targets.length, ok, failed);
if (failed > 0) process.exit(5);

async function preflight() {
  const vectors = await embedTexts(["probe"]);
  if (vectors.length !== 1 || vectors[0]?.length !== EMBED_DIM) {
    throw new Error("provider_response_invalid");
  }
  console.log("[backfill-prod] preflight=ok");
}

function findTargets() {
  const limitSql = args.limit ? `LIMIT ${Number(args.limit)}` : "";
  if (args.itemId) {
    return db.prepare(targetSelect("WHERE i.id = ?") + limitSql).all(args.itemId);
  }
  if (args.failedOnly) {
    return db.prepare(targetSelect("WHERE i.enrichment_state = 'done' AND ej.state = 'error'") + limitSql).all();
  }
  return db.prepare(targetSelect("WHERE i.enrichment_state = 'done' AND c.id IS NULL") + limitSql).all();
}

function targetSelect(where) {
  return `SELECT i.id
            FROM items i
            LEFT JOIN chunks c ON c.item_id = i.id
            LEFT JOIN embedding_jobs ej ON ej.item_id = i.id
           ${where}
           GROUP BY i.id
           ORDER BY i.captured_at ASC `;
}

async function embedItem(itemId) {
  assertStandaloneContentProcessingAllowed(db);
  const item = db.prepare("SELECT id, title, body, summary FROM items WHERE id = ?").get(itemId);
  if (!item) return { ok: false, code: "item_not_found" };
  const existing = db.prepare("SELECT COUNT(*) AS n FROM chunks WHERE item_id = ?").get(itemId).n;
  if (existing > 0 && !args.resetChunks) {
    db.transaction(() => {
      assertStandaloneContentProcessingAllowed(db);
      db.prepare(
        `INSERT INTO embedding_jobs (item_id, state, completed_at)
         VALUES (?, 'done', unixepoch() * 1000)
         ON CONFLICT(item_id) DO UPDATE SET state='done', completed_at=unixepoch() * 1000, last_error=NULL`,
      ).run(itemId);
    })();
    return { ok: true, chunkCount: existing };
  }

  const sourceText = item.summary ? `${item.title}\n\n${item.summary}\n\n${item.body}` : `${item.title}\n\n${item.body}`;
  const chunks = chunkBody(sourceText);
  if (chunks.length === 0) {
    db.transaction(() => {
      assertStandaloneContentProcessingAllowed(db);
      db.prepare(
        `INSERT INTO embedding_jobs (item_id, state, completed_at)
         VALUES (?, 'done', unixepoch() * 1000)
         ON CONFLICT(item_id) DO UPDATE SET state='done', completed_at=unixepoch() * 1000, last_error=NULL`,
      ).run(itemId);
    })();
    return { ok: true, chunkCount: 0 };
  }

  db.transaction(() => {
    assertStandaloneContentProcessingAllowed(db);
    db.prepare(
      `INSERT INTO embedding_jobs (item_id, state, attempts)
       VALUES (?, 'running', 0)
       ON CONFLICT(item_id) DO UPDATE SET state='running', attempts=COALESCE(attempts, 0) + 1`,
    ).run(itemId);
  })();

  try {
    const vectors = [];
    for (let i = 0; i < chunks.length; i += 16) {
      assertStandaloneContentProcessingAllowed(db);
      const batch = chunks.slice(i, i + 16).map((chunk) => chunk.body);
      vectors.push(...(await embedTexts(batch)));
    }
    writeChunksAndComplete(itemId, chunks, vectors);
    return { ok: true, chunkCount: chunks.length };
  } catch (err) {
    if (err instanceof StandaloneContentProcessingBlockedError) {
      return { ok: false, blocked: true, code: err.code };
    }
    db.transaction(() => {
      assertStandaloneContentProcessingAllowed(db);
      db.prepare(
        `UPDATE embedding_jobs
            SET state='error', last_error='embedding_failed'
          WHERE item_id = ?`,
      ).run(itemId);
    })();
    return { ok: false, code: "embedding_failed" };
  }
}

function writeChunksAndComplete(itemId, chunks, vectors) {
  const tx = db.transaction(() => {
    assertStandaloneContentProcessingAllowed(db);
    db.prepare("DELETE FROM chunks_vec WHERE rowid IN (SELECT rowid FROM chunks WHERE item_id = ?)").run(itemId);
    db.prepare("DELETE FROM chunks WHERE item_id = ?").run(itemId);
    const insertChunk = db.prepare("INSERT INTO chunks (id, item_id, idx, body, token_count) VALUES (?, ?, ?, ?, ?)");
    const nextRowid = db.prepare("SELECT COALESCE(MAX(rowid), 0) + 1 AS rowid FROM chunks_rowid");
    const insertRowid = db.prepare("INSERT INTO chunks_rowid (chunk_id, rowid) VALUES (?, ?)");
    const insertVec = db.prepare("INSERT INTO chunks_vec(rowid, embedding) VALUES (?, ?)");
    for (let i = 0; i < chunks.length; i++) {
      const id = newId();
      insertChunk.run(id, itemId, chunks[i].idx, chunks[i].body, chunks[i].token_count);
      const rowid = BigInt(nextRowid.get().rowid);
      insertRowid.run(id, rowid);
      insertVec.run(rowid, Buffer.from(vectors[i].buffer, vectors[i].byteOffset, vectors[i].byteLength));
    }
    db.prepare(
      `UPDATE embedding_jobs
          SET state='done', completed_at=unixepoch() * 1000, last_error=NULL
        WHERE item_id = ?`,
    ).run(itemId);
  });
  tx();
}

async function embedTexts(texts) {
  if (provider === "gemini") return embedGemini(texts);
  if (provider === "ollama") return embedOllama(texts);
  throw new Error("provider_configuration_invalid");
}

async function embedGemini(texts) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("provider_configuration_invalid");
  const out = [];
  for (const [i, text] of texts.entries()) {
    if (i > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, 1100));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:embedContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: EMBED_DIM }),
    });
    if (!res.ok) throw new Error("provider_request_failed");
    const body = await res.json();
    const values = body?.embedding?.values;
    if (!Array.isArray(values) || values.length !== EMBED_DIM) {
      throw new Error("provider_response_invalid");
    }
    out.push(new Float32Array(values));
  }
  return out;
}

async function embedOllama(texts) {
  const host = (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/+$/, "");
  const res = await fetch(`${host}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw new Error("provider_request_failed");
  const body = await res.json();
  const rows = body?.embeddings;
  if (!Array.isArray(rows) || rows.length !== texts.length) {
    throw new Error("provider_response_invalid");
  }
  return rows.map((values) => {
    if (!Array.isArray(values) || values.length !== EMBED_DIM) {
      throw new Error("provider_response_invalid");
    }
    return new Float32Array(values);
  });
}

function chunkBody(text) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const maxChars = 3200;
  if (normalized.length <= maxChars) return [{ idx: 0, body: normalized, token_count: approxTokens(normalized) }];
  const chunks = [];
  let buffer = "";
  for (const block of normalized.split(/\n{2,}/)) {
    const next = buffer ? `${buffer}\n\n${block}` : block;
    if (next.length > maxChars && buffer) {
      chunks.push({ idx: chunks.length, body: buffer, token_count: approxTokens(buffer) });
      buffer = block;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push({ idx: chunks.length, body: buffer, token_count: approxTokens(buffer) });
  return chunks;
}

function approxTokens(text) {
  return Math.ceil(text.length / 4);
}

function parseArgs(argv) {
  const out = {
    itemId: null,
    failedOnly: false,
    missingChunks: false,
    dryRun: false,
    confirm: false,
    resetChunks: false,
    limit: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--item-id") out.itemId = argv[++i];
    else if (arg === "--failed-only") out.failedOnly = true;
    else if (arg === "--missing-chunks") out.missingChunks = true;
    else if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--confirm") out.confirm = true;
    else if (arg === "--reset-chunks") out.resetChunks = true;
    else if (arg === "--limit") out.limit = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") out.help = true;
    else {
      console.error("[backfill-prod] unknown_flag");
      process.exit(1);
    }
  }
  if (out.limit !== null && (!Number.isFinite(out.limit) || out.limit <= 0)) {
    console.error("[backfill-prod] invalid_limit");
    process.exit(1);
  }
  return out;
}

function logSummary(targets, ok, failed) {
  console.log(
    `[backfill-prod] summary targets=${targets} ok=${ok} failed=${failed}`,
  );
}

function usage() {
  console.log(`Usage:
  node scripts/backfill-embeddings-prod.mjs --item-id <id> [--dry-run] [--reset-chunks]
  node scripts/backfill-embeddings-prod.mjs --failed-only --dry-run [--limit N]
  node scripts/backfill-embeddings-prod.mjs --failed-only --confirm [--limit N]
  node scripts/backfill-embeddings-prod.mjs --missing-chunks --dry-run [--limit N]
  node scripts/backfill-embeddings-prod.mjs --missing-chunks --confirm [--limit N]`);
}

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
