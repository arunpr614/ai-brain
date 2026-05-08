#!/usr/bin/env node
// R-VEC S-2..S-5 — sqlite-vec benchmark at N=1k/10k/50k chunks, 768-dim vectors.
//
// What it measures:
//   - batch insert wall-time + disk size at each N
//   - query latency min/p50/p95/p99/max over 1000 timed top-k=8 queries (after 10 warm-up)
//   - warm-reopen cost (close + reopen + first-query latency vs steady-state p50)
//   - concurrency sanity (4 parallel workers × 250 queries — throughput + lock errors)
//
// Run: node scripts/spike-vec-bench.mjs
//
// Outputs:
//   tmp/vec-bench-<N>.db                — persisted per-tier DB (gitignored)
//   tmp/vec-bench-results.json          — machine-readable results (gitignored)
//   stdout                              — human-readable summary
//
// Thresholds (from docs/plans/R-VEC-spike.md §1):
//   p50 top-k=8 < 80 ms
//   p95 top-k=8 < 200 ms
//   build(10k) < 30 s cold; warm-reopen first-query near steady-state p50

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const TMP_DIR = path.join(REPO_ROOT, "tmp");
const DIM = 768;
const TOP_K = 8;
const WARMUP = 10;
const TIMED = 1000;
const TIERS = [1_000, 10_000, 50_000];
const CONC_WORKERS = 4;
const CONC_QUERIES_PER_WORKER = 250;

// ---------- worker mode ---------------------------------------------------
if (!isMainThread) {
  const { dbPath, queryVecs } = workerData;
  const db = new Database(dbPath, { readonly: true });
  db.loadExtension(sqliteVec.getLoadablePath());
  const stmt = db.prepare(
    "select rowid from vec_test where embedding match ? order by distance limit ?"
  );
  let locks = 0;
  const t0 = process.hrtime.bigint();
  for (const qv of queryVecs) {
    try {
      stmt.all(Buffer.from(qv), BigInt(TOP_K));
    } catch (e) {
      if (String(e.message).includes("locked")) locks++;
      else throw e;
    }
  }
  const dtMs = Number(process.hrtime.bigint() - t0) / 1e6;
  db.close();
  parentPort.postMessage({ dtMs, count: queryVecs.length, locks });
} else {
  await main();
}

// ---------- main ----------------------------------------------------------
async function main() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  console.log(`R-VEC benchmark — dim=${DIM}, top-k=${TOP_K}, tiers=${TIERS.join("/")}`);
  console.log(`node ${process.version}, better-sqlite3 from ${require_ver("better-sqlite3")}`);
  const vecRuntimeVer = sqliteVecRuntimeVersion();
  const vecPkgVer = pkgVersion("sqlite-vec");
  console.log(`sqlite-vec package: ${vecPkgVer}  runtime: ${vecRuntimeVer}`);
  if (vecPkgVer !== vecRuntimeVer.replace(/^v/, "")) {
    console.log(`  ⚠️  npm package ${vecPkgVer} and loaded dylib ${vecRuntimeVer} DIFFER — F-049 pin did not hold.`);
  }
  console.log(`cpu: ${os.cpus()[0].model} × ${os.cpus().length}`);
  console.log(`mem: ${(os.totalmem() / 1024 ** 3).toFixed(1)} GB`);
  console.log("");

  const results = { env: envSummary(vecPkgVer, vecRuntimeVer), tiers: {} };

  for (const N of TIERS) {
    console.log(`=== N=${N} ===`);
    const dbPath = path.join(TMP_DIR, `vec-bench-${N}.db`);
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    [".db-wal", ".db-shm"].forEach((s) => {
      const p = dbPath.replace(/\.db$/, s);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    const insertResult = buildIndex(dbPath, N);
    console.log(`  insert: ${insertResult.insertMs.toFixed(1)} ms  (${(N / (insertResult.insertMs / 1000)).toFixed(0)} rows/s)`);
    const diskMb = fs.statSync(dbPath).size / 1024 / 1024;
    console.log(`  disk:   ${diskMb.toFixed(2)} MB`);

    const q = queryStats(dbPath);
    console.log(`  query p50/p95/p99/max: ${q.p50.toFixed(2)} / ${q.p95.toFixed(2)} / ${q.p99.toFixed(2)} / ${q.max.toFixed(2)} ms`);

    const reopen = warmReopenCost(dbPath);
    console.log(`  warm-reopen first-query: ${reopen.firstMs.toFixed(2)} ms  (steady p50 ${q.p50.toFixed(2)} ms)`);

    const conc = await concurrencySanity(dbPath);
    console.log(`  concurrency: ${conc.workers}×${conc.perWorker} queries in ${conc.totalMs.toFixed(0)} ms → ${conc.qps.toFixed(0)} qps (locks=${conc.locks})`);

    results.tiers[N] = {
      insertMs: insertResult.insertMs,
      rowsPerSec: N / (insertResult.insertMs / 1000),
      diskMb,
      query: q,
      warmReopenFirstMs: reopen.firstMs,
      concurrency: conc,
    };
    console.log("");
  }

  const outPath = path.join(TMP_DIR, "vec-bench-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`results → ${path.relative(REPO_ROOT, outPath)}`);

  // verdict preview
  const t10k = results.tiers[10_000];
  const p50ok = t10k.query.p50 < 80;
  const p95ok = t10k.query.p95 < 200;
  const buildOk = t10k.insertMs < 30_000;
  console.log("\nThreshold check @ N=10k:");
  console.log(`  p50 < 80 ms:        ${p50ok ? "PASS" : "FAIL"}  (${t10k.query.p50.toFixed(2)} ms)`);
  console.log(`  p95 < 200 ms:       ${p95ok ? "PASS" : "FAIL"}  (${t10k.query.p95.toFixed(2)} ms)`);
  console.log(`  build < 30 000 ms:  ${buildOk ? "PASS" : "FAIL"}  (${t10k.insertMs.toFixed(0)} ms)`);
  const all = p50ok && p95ok && buildOk;
  console.log(`\npreliminary verdict @ 10k: ${all ? "GREEN-candidate" : "not GREEN — see findings doc"}`);
}

// ---------- helpers -------------------------------------------------------
function openDb(dbPath) {
  const db = new Database(dbPath);
  db.loadExtension(sqliteVec.getLoadablePath());
  return db;
}

function randomVector(dim) {
  // unit-normalised random float32 vector from secure bytes
  const bytes = crypto.randomBytes(dim * 4);
  const f = new Float32Array(bytes.buffer, bytes.byteOffset, dim);
  let s = 0;
  for (let i = 0; i < dim; i++) s += f[i] * f[i];
  s = Math.sqrt(s) || 1;
  for (let i = 0; i < dim; i++) f[i] /= s;
  return new Float32Array(f); // detach from crypto buffer
}

function buildIndex(dbPath, N) {
  const db = openDb(dbPath);
  db.exec(`create virtual table vec_test using vec0(embedding float[${DIM}])`);
  const insert = db.prepare("insert into vec_test(rowid, embedding) values (?, ?)");
  const tx = db.transaction((batch, baseId) => {
    for (let i = 0; i < batch.length; i++) {
      insert.run(BigInt(baseId + i), Buffer.from(batch[i].buffer));
    }
  });

  const t0 = process.hrtime.bigint();
  const BATCH = 1000;
  for (let start = 0; start < N; start += BATCH) {
    const end = Math.min(start + BATCH, N);
    const batch = [];
    for (let i = start; i < end; i++) batch.push(randomVector(DIM));
    tx(batch, start + 1);
  }
  const insertMs = Number(process.hrtime.bigint() - t0) / 1e6;
  db.close();
  return { insertMs };
}

function queryStats(dbPath) {
  const db = openDb(dbPath);
  const stmt = db.prepare(
    "select rowid from vec_test where embedding match ? order by distance limit ?"
  );

  const qs = [];
  for (let i = 0; i < 100; i++) qs.push(randomVector(DIM));

  // warm-up
  for (let i = 0; i < WARMUP; i++) {
    stmt.all(Buffer.from(qs[i % qs.length].buffer), BigInt(TOP_K));
  }

  const samples = new Float64Array(TIMED);
  for (let i = 0; i < TIMED; i++) {
    const qv = qs[i % qs.length];
    const t0 = process.hrtime.bigint();
    stmt.all(Buffer.from(qv.buffer), BigInt(TOP_K));
    samples[i] = Number(process.hrtime.bigint() - t0) / 1e6;
  }
  db.close();
  return summarize(samples);
}

function warmReopenCost(dbPath) {
  // open fresh handle, one query, close; simulates cold reopen
  const db = openDb(dbPath);
  const stmt = db.prepare(
    "select rowid from vec_test where embedding match ? order by distance limit ?"
  );
  const qv = randomVector(DIM);
  const t0 = process.hrtime.bigint();
  stmt.all(Buffer.from(qv.buffer), BigInt(TOP_K));
  const firstMs = Number(process.hrtime.bigint() - t0) / 1e6;
  db.close();
  return { firstMs };
}

async function concurrencySanity(dbPath) {
  const workers = [];
  const qsShared = [];
  for (let i = 0; i < CONC_QUERIES_PER_WORKER; i++) {
    qsShared.push(Buffer.from(randomVector(DIM).buffer));
  }
  const t0 = process.hrtime.bigint();
  for (let w = 0; w < CONC_WORKERS; w++) {
    workers.push(
      new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { dbPath, queryVecs: qsShared },
        });
        worker.once("message", resolve);
        worker.once("error", reject);
      })
    );
  }
  const results = await Promise.all(workers);
  const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
  const totalQ = results.reduce((s, r) => s + r.count, 0);
  const locks = results.reduce((s, r) => s + r.locks, 0);
  return {
    workers: CONC_WORKERS,
    perWorker: CONC_QUERIES_PER_WORKER,
    totalMs,
    qps: (totalQ / totalMs) * 1000,
    locks,
  };
}

function summarize(samples) {
  const sorted = Array.from(samples).sort((a, b) => a - b);
  const n = sorted.length;
  const pick = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
  return {
    n,
    min: sorted[0],
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    max: sorted[n - 1],
    mean: sorted.reduce((s, v) => s + v, 0) / n,
  };
}

function pkgVersion(name) {
  const p = path.join(REPO_ROOT, "node_modules", name, "package.json");
  return JSON.parse(fs.readFileSync(p, "utf8")).version;
}
function require_ver(name) {
  return `^${pkgVersion(name)}`;
}
function sqliteVecRuntimeVersion() {
  const db = new Database(":memory:");
  db.loadExtension(sqliteVec.getLoadablePath());
  const { v } = db.prepare("select vec_version() as v").get();
  db.close();
  return v;
}
function envSummary(pkgVer, rtVer) {
  return {
    node: process.version,
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0].model,
    cores: os.cpus().length,
    totalMemGb: +(os.totalmem() / 1024 ** 3).toFixed(1),
    sqliteVecPackage: pkgVer,
    sqliteVecRuntime: rtVer,
    dim: DIM,
    topK: TOP_K,
    warmup: WARMUP,
    timed: TIMED,
    tiers: TIERS,
    concWorkers: CONC_WORKERS,
    concPerWorker: CONC_QUERIES_PER_WORKER,
  };
}
