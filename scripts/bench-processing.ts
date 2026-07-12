import crypto from "node:crypto";
import { existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const SEED = "processing-scale-v1";
const STATUSES = ["inbox", "todo", "in_progress", "done"] as const;
const SOURCE_TYPES = ["url", "pdf", "note", "youtube", "podcast", "epub", "docx", "telegram"] as const;
const CHANNELS = ["web", "android", "extension", "telegram", "system", "recall"] as const;
const QUALITIES = ["full_text", "transcript", "metadata_only", "user_provided_full_text", null] as const;
const ACTOR_TAB = "00000000-0000-4000-8000-000000000000";

function hash(value: string): string {
  return crypto.createHash("sha256").update(`${SEED}:${value}`).digest("hex");
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))] ?? 0;
}

function round(value: number): number { return Math.round(value * 1000) / 1000; }

function fileBytes(path: string): number {
  return existsSync(path) ? statSync(path).size : 0;
}

async function writer(dbPath: string, itemIds: string[]) {
  process.env.BRAIN_DB_PATH = dbPath;
  process.env.BRAIN_PROCESSING_HMAC_SECRET = "benchmark-secret";
  const [{ getDb }, { mutateWorkflow }] = await Promise.all([
    import("../src/db/client"),
    import("../src/db/item-workflow"),
  ]);
  const db = getDb();
  const times: number[] = [];
  let busy = 0;
  for (let index = 0; index < itemIds.length; index++) {
    const id = itemIds[index]!;
    const row = db.prepare("SELECT workflow_version FROM items WHERE id=?").get(id) as { workflow_version: number };
    const started = performance.now();
    try {
      mutateWorkflow(id, {
        mutationId: crypto.randomUUID(), actorTabId: ACTOR_TAB,
        expectedVersion: row.workflow_version, action: { type: "move", status: index % 2 ? "todo" : "in_progress" },
      }, "list");
    } catch (error) {
      if (error instanceof Error && error.message.includes("database is locked")) busy++;
      else throw error;
    }
    times.push(performance.now() - started);
  }
  process.stdout.write(JSON.stringify({ writes: itemIds.length, busy, p95Ms: round(percentile(times, 0.95)), maxMs: round(Math.max(...times)) }));
}

async function seed(db: import("better-sqlite3").Database, size: number, now: number) {
  const insertItem = db.prepare(`INSERT INTO items(
    id,source_type,capture_source,title,body,summary,category,captured_at,capture_quality,
    workflow_status,workflow_version,workflow_legacy_baseline,workflow_enrolled_at,
    workflow_initialized_at,workflow_inbox_entered_at,workflow_inbox_episode_id,
    workflow_status_changed_at,workflow_current_done_entered_at,workflow_archived_at,
    workflow_last_event_uuid)
    VALUES(?,?,?,?,?,?,?,?,?,'inbox',1,0,?,?,?,?,?,NULL,NULL,?)`);
  const insertReceipt = db.prepare(`INSERT INTO processing_mutation_receipts(
    mutation_id,scope_type,item_id,scope_key_hash,action_type,actor_tab_id,request_fingerprint,
    expected_version,outcome_class,result_code,accepted_event_uuid,accepted_item_version,
    observed_item_version,confirmed_at,undo_eligible_until,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insertEvent = db.prepare(`INSERT INTO item_workflow_events(
    event_uuid,item_id,item_version,mutation_id,event_type,from_status,to_status,
    from_archived_at,to_archived_at,from_inbox_entered_at,to_inbox_entered_at,
    from_inbox_episode_id,to_inbox_episode_id,from_status_changed_at,to_status_changed_at,
    from_current_done_entered_at,to_current_done_entered_at,origin,surface,actor_channel,
    actor_tab_id,occurred_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const updateProjection = db.prepare(`UPDATE items SET workflow_status=?,workflow_version=?,
    workflow_inbox_entered_at=?,workflow_inbox_episode_id=?,workflow_status_changed_at=?,
    workflow_current_done_entered_at=?,workflow_archived_at=?,workflow_last_event_uuid=?
    WHERE id=? AND workflow_version=?`);
  const insertTag = db.prepare("INSERT INTO tags(id,name,kind) VALUES(?,?,'manual')");
  const insertAutoTag = db.prepare("INSERT INTO tags(id,name,kind) VALUES(?,?,'auto')");
  const insertTopic = db.prepare("INSERT INTO topics(id,slug,name,source) VALUES(?,?,?,'ai')");
  const attachTag = db.prepare("INSERT INTO item_tags(item_id,tag_id) VALUES(?,?)");
  const attachTopic = db.prepare("INSERT INTO item_topics(item_id,topic_id,confidence,evidence) VALUES(?,?,?,NULL)");

  for (let i = 0; i < 40; i++) insertTag.run(`tag-${String(i).padStart(2, "0")}`, `manual-${String(i).padStart(2, "0")}`);
  for (let i = 0; i < 12; i++) insertAutoTag.run(`auto-${String(i).padStart(2, "0")}`, `auto-${String(i).padStart(2, "0")}`);
  for (let i = 0; i < 30; i++) insertTopic.run(`topic-${String(i).padStart(2, "0")}`, `topic-${i}`, `Topic ${String(i).padStart(2, "0")}`);

  const insertBatch = db.transaction((start: number, end: number) => {
    for (let index = start; index < end; index++) {
      const id = `item-${String(index).padStart(6, "0")}`;
      const capture = now - (index % 121) * 86_400_000 - (index % 17) * 60_000;
      const initializedAt = capture + 1_000;
      const inboxEpisode = `episode-${String(index).padStart(6, "0")}`;
      const initEvent = `event-init-${String(index).padStart(6, "0")}`;
      const initMutation = `mutation-init-${String(index).padStart(6, "0")}`;
      const titleTail = index % 11 === 0 ? ` ${"long-title-segment ".repeat(9)}` : "";
      insertItem.run(
        id, SOURCE_TYPES[index % SOURCE_TYPES.length], CHANNELS[index % CHANNELS.length],
        `Synthetic source ${String(index).padStart(6, "0")}${titleTail}`,
        `Synthetic benchmark body ${index}. No private source content.`,
        index % 3 === 0 ? `Bounded synthetic summary ${index}` : null,
        `category-${index % 9}`, capture, QUALITIES[index % QUALITIES.length],
        initializedAt, initializedAt, initializedAt, inboxEpisode, initializedAt, initEvent,
      );
      insertReceipt.run(
        initMutation, "initialization", id, hash(`scope:${id}`), "initialize", null,
        hash(`init:${id}`), 0, "accepted_effective", "initialized", initEvent, 1, 0,
        initializedAt, null, initializedAt,
      );
      insertEvent.run(
        initEvent, id, 1, initMutation, "initialized", null, "inbox",
        null, null, null, initializedAt, null, inboxEpisode, null, initializedAt,
        null, null, "capture", "api_capture", "system", null, initializedAt,
      );

      // 25% Inbox, 25% To Do, 20% In Progress, 25% active Done, 5% Archived Done.
      const bucket = index % 20;
      const target = bucket < 5 ? "inbox" : bucket < 10 ? "todo" : bucket < 14 ? "in_progress" : "done";
      if (target !== "inbox") {
        const movedAt = Math.min(now - 1000, capture + 3_600_000);
        const event = `event-move-${String(index).padStart(6, "0")}`;
        const mutation = `mutation-move-${String(index).padStart(6, "0")}`;
        insertReceipt.run(
          mutation, "item_workflow", id, hash(`scope:${id}`), `move_${target}`, ACTOR_TAB,
          hash(`move:${id}:${target}`), 1, "accepted_effective", "moved", event, 2, 1,
          movedAt, movedAt + 30_000, movedAt,
        );
        updateProjection.run(target, 2, null, null, movedAt, target === "done" ? movedAt : null, null, event, id, 1);
        insertEvent.run(
          event, id, 2, mutation, "status_changed", "inbox", target,
          null, null, initializedAt, null, inboxEpisode, null, initializedAt, movedAt,
          null, target === "done" ? movedAt : null, "user", "board", "web", ACTOR_TAB, movedAt,
        );
        if (bucket === 19) {
          const archivedAt = Math.min(now, movedAt + 60_000);
          const archiveEvent = `event-archive-${String(index).padStart(6, "0")}`;
          const archiveMutation = `mutation-archive-${String(index).padStart(6, "0")}`;
          insertReceipt.run(
            archiveMutation, "item_workflow", id, hash(`scope:${id}`), "archive", ACTOR_TAB,
            hash(`archive:${id}`), 2, "accepted_effective", "archived", archiveEvent, 3, 2,
            archivedAt, archivedAt + 30_000, archivedAt,
          );
          updateProjection.run("done", 3, null, null, archivedAt, movedAt, archivedAt, archiveEvent, id, 2);
          insertEvent.run(
            archiveEvent, id, 3, archiveMutation, "archived", "done", "done",
            null, archivedAt, null, null, null, null, movedAt, archivedAt,
            movedAt, movedAt, "user", "archived", "web", ACTOR_TAB, archivedAt,
          );
        }
      }

      if (index % 10 < 7) {
        attachTag.run(id, `tag-${String(index % 40).padStart(2, "0")}`);
        if (index % 4 === 0) attachTag.run(id, `tag-${String((index + 7) % 40).padStart(2, "0")}`);
      } else if (index % 13 === 0) {
        attachTag.run(id, `auto-${String(index % 12).padStart(2, "0")}`);
      }
      if (index % 20 < 13) {
        attachTopic.run(id, `topic-${String(index % 30).padStart(2, "0")}`, 0.5 + (index % 50) / 100);
        if (index % 6 === 0) attachTopic.run(id, `topic-${String((index + 11) % 30).padStart(2, "0")}`, 0.75);
      }
    }
  });
  const started = performance.now();
  for (let start = 0; start < size; start += 500) {
    insertBatch(start, Math.min(size, start + 500));
  }
  return performance.now() - started;
}

async function benchmarkSize(size: number) {
  const dir = mkdtempSync(join(tmpdir(), `brain-processing-bench-${size}-`));
  const dbPath = join(dir, "bench.sqlite");
  process.env.BRAIN_DB_PATH = dbPath;
  process.env.BRAIN_PROCESSING_HMAC_SECRET = "benchmark-secret";
  process.env.BRAIN_OWNER_TIMEZONE = "America/New_York";
  process.env.PROCESSING_READ_ENABLED = "1";
  process.env.PROCESSING_WRITE_ENABLED = "1";
  process.env.PROCESSING_NAV_ENABLED = "1";
  const now = Date.now();
  const [{ getDb }, readiness, queries, workflow] = await Promise.all([
    import("../src/db/client"),
    import("../src/db/processing-readiness"),
    import("../src/db/processing-queries"),
    import("../src/db/item-workflow"),
  ]);
  const db = getDb();
  db.pragma("wal_autocheckpoint = 0");
  const seedMs = await seed(db, size, now);
  const beforeAuditBytes = { db: fileBytes(dbPath), wal: fileBytes(`${dbPath}-wal`), shm: fileBytes(`${dbPath}-shm`) };
  const auditStarted = performance.now();
  const audit = readiness.runProcessingDeepAudit({ appSha: "benchmark", migrationHash: hash("migrations"), now });
  const auditMs = performance.now() - auditStarted;
  if (!audit.ok) throw new Error(`deep audit failed: ${audit.failures.join(",")}`);

  const results: Array<Record<string, unknown>> = [];
  const failures: string[] = [];
  function measure(name: string, budgetMs: number, fn: () => unknown, iterations = 20) {
    db.pragma("shrink_memory");
    const coldStart = performance.now();
    const coldValue = fn();
    const coldMs = performance.now() - coldStart;
    const times: number[] = [];
    let value = coldValue;
    for (let i = 0; i < iterations; i++) {
      const started = performance.now();
      value = fn();
      times.push(performance.now() - started);
    }
    const encoded = JSON.stringify(value);
    const row = {
      name, budgetMs, coldMs: round(coldMs), p50Ms: round(percentile(times, 0.5)),
      p95Ms: round(percentile(times, 0.95)), maxMs: round(Math.max(...times)),
      payloadBytes: Buffer.byteLength(encoded), sampleCount: iterations,
    };
    results.push(row);
    if ((row.p95Ms as number) > budgetMs) failures.push(`${name} p95 ${row.p95Ms}ms > ${budgetMs}ms`);
    return value;
  }

  const noFilters = { userTagIds: [], aiTopicIds: [], noUserTags: false, noAiTopics: false };
  const filters = { userTagIds: ["tag-01", "tag-07"], aiTopicIds: ["topic-01"], noUserTags: true, noAiTopics: false };
  measure("hot_readiness", 2, () => readiness.getProcessingReadiness(db), 1000);
  measure("summary_unfiltered", 100, () => queries.getProcessingSummary(noFilters, now));
  measure("summary_filtered", 200, () => queries.getProcessingSummary(filters, now));
  measure("filters", 200, () => queries.getProcessingFilters());
  const inboxFirst = measure("inbox_first_page", 200, () => queries.listProcessingItems({ view: "inbox", sort: "workflow_default", limit: 50, filters: noFilters })) as { nextCursor: string | null };
  if (inboxFirst.nextCursor) measure("inbox_next_page", 200, () => queries.listProcessingItems({ view: "inbox", sort: "workflow_default", limit: 50, filters: noFilters, cursor: inboxFirst.nextCursor! }));
  for (const status of STATUSES) {
    measure(`status_${status}_first_page`, 200, () => queries.listProcessingItems({ view: "list", status, sort: "oldest_captured", limit: 50, filters: noFilters }));
  }
  measure("oldest_captured_filtered", 200, () => queries.listProcessingItems({ view: "list", sort: "oldest_captured", limit: 100, filters }));
  measure("archived_first_page", 200, () => queries.listProcessingItems({ view: "archived", sort: "workflow_default", limit: 50, filters: noFilters }));

  for (const group of ["workflow_status", "user_tag", "ai_topic", "source_type", "capture_channel", "capture_quality", "capture_age", "none"] as const) {
    const groups = measure(`groups_${group}`, 200, () => queries.listProcessingBoardGroups({ group, sort: "oldest_captured", limit: 10, filters, asOfUtc: now })) as { groups: Array<{ key: string }>; asOfUtc: number };
    if (groups.groups[0]) {
      const items = measure(`group_items_${group}`, 200, () => queries.listProcessingBoardItems({ group, groupKey: groups.groups[0]!.key, sort: "oldest_captured", limit: 50, filters, asOfUtc: groups.asOfUtc })) as { nextCursor: string | null };
      if (items.nextCursor) measure(`group_items_${group}_next`, 200, () => queries.listProcessingBoardItems({ group, groupKey: groups.groups[0]!.key, sort: "oldest_captured", limit: 50, filters, asOfUtc: groups.asOfUtc, cursor: items.nextCursor! }));
    }
  }

  const mutationIds = (db.prepare(`SELECT id FROM items WHERE workflow_status='inbox' AND workflow_archived_at IS NULL ORDER BY id LIMIT 30`).all() as Array<{ id: string }>).map((row) => row.id);
  const mutationTimes: number[] = [];
  for (const [index, id] of mutationIds.slice(0, 10).entries()) {
    const version = (db.prepare("SELECT workflow_version FROM items WHERE id=?").get(id) as { workflow_version: number }).workflow_version;
    const started = performance.now();
    workflow.mutateWorkflow(id, {
      mutationId: crypto.randomUUID(), actorTabId: ACTOR_TAB, expectedVersion: version,
      action: { type: "move", status: index % 2 ? "todo" : "in_progress" },
    }, "list");
    mutationTimes.push(performance.now() - started);
  }
  const mutationP95 = round(percentile(mutationTimes, 0.95));
  results.push({ name: "mutation_transaction", budgetMs: 250, coldMs: null, p50Ms: round(percentile(mutationTimes, 0.5)), p95Ms: mutationP95, maxMs: round(Math.max(...mutationTimes)), payloadBytes: 0, sampleCount: mutationTimes.length });
  if (mutationP95 > 250) failures.push(`mutation p95 ${mutationP95}ms > 250ms`);

  const concurrentIds = mutationIds.slice(10, 30);
  const scriptPath = resolve(process.cwd(), "scripts/bench-processing.ts");
  const child = spawn(process.execPath, ["--import", "tsx", scriptPath, "--writer", dbPath, concurrentIds.join(",")], {
    env: { ...process.env, BRAIN_DB_PATH: dbPath }, stdio: ["ignore", "pipe", "pipe"],
  });
  let childOut = "", childErr = "";
  child.stdout.on("data", (chunk) => { childOut += String(chunk); });
  child.stderr.on("data", (chunk) => { childErr += String(chunk); });
  const concurrentReadTimes: number[] = [];
  for (let i = 0; i < 40; i++) {
    const started = performance.now();
    queries.listProcessingItems({ view: "inbox", sort: "workflow_default", limit: 50, filters: noFilters });
    concurrentReadTimes.push(performance.now() - started);
    await new Promise((resolvePromise) => setImmediate(resolvePromise));
  }
  const childCode = await new Promise<number | null>((resolvePromise) => child.on("close", resolvePromise));
  const concurrent = {
    reads: concurrentReadTimes.length,
    readP95Ms: round(percentile(concurrentReadTimes, 0.95)),
    readMaxMs: round(Math.max(...concurrentReadTimes)),
    writer: childCode === 0 ? JSON.parse(childOut) : { error: childErr.slice(-500), code: childCode },
  };
  if (childCode !== 0 || (concurrent.writer as { busy?: number }).busy) failures.push("concurrent writer produced DB-busy/error");

  const planSql: Record<string, string> = {
    inbox: "SELECT id FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL AND workflow_status='inbox' ORDER BY workflow_inbox_entered_at,id LIMIT 50",
    status: "SELECT id FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL AND workflow_status='todo' ORDER BY workflow_status_changed_at DESC,id LIMIT 50",
    archived: "SELECT id FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NOT NULL ORDER BY workflow_archived_at DESC,id LIMIT 50",
    status_counts: "SELECT workflow_status,count(*) FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL GROUP BY workflow_status",
    manual_tag_filter: "SELECT id FROM items i WHERE workflow_enrolled_at IS NOT NULL AND EXISTS(SELECT 1 FROM item_tags it JOIN tags t ON t.id=it.tag_id WHERE it.item_id=i.id AND t.kind='manual' AND t.id='tag-01') LIMIT 50",
    topic_filter: "SELECT id FROM items i WHERE workflow_enrolled_at IS NOT NULL AND EXISTS(SELECT 1 FROM item_topics it WHERE it.item_id=i.id AND it.topic_id='topic-01') LIMIT 50",
    capture_channel_groups: "SELECT capture_source,count(*) FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL GROUP BY capture_source ORDER BY capture_source",
    capture_age_groups: `SELECT CASE WHEN captured_at>=${now - 86400000} THEN 'recent' ELSE 'older' END age,count(*) FROM items WHERE workflow_enrolled_at IS NOT NULL AND workflow_archived_at IS NULL GROUP BY age`,
  };
  const plans = Object.fromEntries(Object.entries(planSql).map(([name, sql]) => [name, (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Array<{ detail: string }>).map((row) => row.detail)]));
  db.pragma("wal_checkpoint(TRUNCATE)");
  const afterBytes = { db: fileBytes(dbPath), wal: fileBytes(`${dbPath}-wal`), shm: fileBytes(`${dbPath}-shm`) };
  const sqliteVersion = (db.prepare("SELECT sqlite_version() version").get() as { version: string }).version;
  const report = {
    size, seed: SEED, generatedAt: new Date().toISOString(),
    runtime: {
      node: process.version, sqlite: sqliteVersion, platform: `${process.platform}/${process.arch}`,
      cpu: os.cpus()[0]?.model ?? "unknown", cpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(),
    },
    seedMs: round(seedMs), deepAuditMs: round(auditMs), deepAuditBudgetMs: 30_000,
    bytesBeforeCheckpoint: beforeAuditBytes, bytesAfterCheckpoint: afterBytes,
    rowCounts: {
      items: (db.prepare("SELECT count(*) n FROM items").get() as { n: number }).n,
      events: (db.prepare("SELECT count(*) n FROM item_workflow_events").get() as { n: number }).n,
      receipts: (db.prepare("SELECT count(*) n FROM processing_mutation_receipts").get() as { n: number }).n,
      itemTags: (db.prepare("SELECT count(*) n FROM item_tags").get() as { n: number }).n,
      itemTopics: (db.prepare("SELECT count(*) n FROM item_topics").get() as { n: number }).n,
    },
    results, concurrent, plans, failures,
  };
  rmSync(dir, { recursive: true, force: true });
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--writer") {
    await writer(args[1]!, args[2]!.split(",").filter(Boolean));
    return;
  }
  if (args[0] === "--worker") {
    const report = await benchmarkSize(Number(args[1]));
    process.stdout.write(JSON.stringify(report));
    if (report.failures.length) process.exitCode = 1;
    return;
  }

  const reports = [];
  let failed = false;
  for (const size of [10_000, 50_000]) {
    const run = spawnSync(process.execPath, ["--import", "tsx", resolve(process.cwd(), "scripts/bench-processing.ts"), "--worker", String(size)], {
      cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
    });
    if (!run.stdout) throw new Error(`benchmark ${size} produced no report (status=${run.status}, signal=${run.signal}): ${run.stderr}`);
    const report = JSON.parse(run.stdout) as { failures: string[] };
    reports.push(report);
    if (run.status !== 0 || report.failures.length) failed = true;
  }
  process.stdout.write(`${JSON.stringify({ seed: SEED, reports }, null, 2)}\n`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
