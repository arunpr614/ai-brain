#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  watch,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const temp = mkdtempSync(join(tmpdir(), "brain-recall-process-"));
const modulePath = "./src/db/recall-manual-sync.ts";
const clientPath = "./src/db/client.ts";
const syncModulePath = "./src/db/recall-sync.ts";
const baseEnv = {
  ...process.env,
  BRAIN_MIGRATIONS_DIR: resolve(root, "src/db/migrations"),
};
const flockCommand = await resolveFlockCommand();

try {
  await sqliteProcessRace();
  await realOuterLockTrace();
  await killedHeartbeatTrace();
  await crashStageMatrix();
  await expiredClaimWorkerDoesNotSpawn();
  await wakeAndTimerInvariantTrace();
  console.log("[test:recall-manual-sync-process] 6 fixture groups passed");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

async function sqliteProcessRace() {
  const db = join(temp, "race.sqlite");
  await runNode(`const {getDb}=(await import(${JSON.stringify(clientPath)})).default; getDb();`, { BRAIN_DB_PATH: db });
  const enqueueCode = `
    const {enqueueRecallSyncRequest}=(await import(${JSON.stringify(modulePath)})).default;
    const result=await enqueueRecallSyncRequest({idempotencyKey:process.env.KEY,ownerId:'owner',now:Number(process.env.NOW)});
    console.log(JSON.stringify({id:result.request.id,deduplicated:result.deduplicated}));
  `;
  const [a, b] = await Promise.all([
    runNode(enqueueCode, { BRAIN_DB_PATH: db, KEY: "process_key_abcdefghijkl", NOW: "2000000000000" }),
    runNode(enqueueCode, { BRAIN_DB_PATH: db, KEY: "process_key_qrstuvwxyz12", NOW: "2000000000000" }),
  ]);
  const first = JSON.parse(lastLine(a.stdout));
  const second = JSON.parse(lastLine(b.stdout));
  assert.equal(first.id, second.id, "two SQLite processes must converge on one active request");
  assert.equal(Number(first.deduplicated) + Number(second.deduplicated), 1);

  const claimCode = `
    const {claimRecallSyncRequest}=(await import(${JSON.stringify(modulePath)})).default;
    const row=await claimRecallSyncRequest(2000000000001);
    console.log(JSON.stringify(row&&{id:row.id,state:row.state}));
  `;
  const claims = await Promise.all([
    runNode(claimCode, { BRAIN_DB_PATH: db }),
    runNode(claimCode, { BRAIN_DB_PATH: db }),
  ]);
  const values = claims.map((result) => JSON.parse(lastLine(result.stdout)));
  assert.equal(values.filter(Boolean).length, 1, "two worker processes must claim at most once");
  assert.equal(values.find(Boolean)?.state, "claimed");
}

async function realOuterLockTrace() {
  const lock = join(temp, "outer.lock");
  const trace = join(temp, "outer.trace");
  const timer = resolve(root, "scripts/deploy/brain-recall-sync.timer");
  const timerBefore = sha(timer);
  const deployGuard = spawn(flockCommand, ["-x", lock, "bash", "-lc", 'printf "guard:acquired\\nswitch:bundles\\n" >> "$TRACE"; sleep 0.08; printf "switch:permissions\\n" >> "$TRACE"; sleep 0.08; printf "switch:daemon-reload\\nguard:release\\n" >> "$TRACE"'], {
    env: { ...process.env, TRACE: trace },
    stdio: "ignore",
  });
  await waitUntil(() => existsSync(trace) && readFileSync(trace, "utf8").includes("guard:acquired"), 3_000);
  const quickManual = await run(flockCommand, ["-w", "0.02", lock, "true"], {});
  assert.notEqual(quickManual.code, 0, "manual lock wait must requeue under contention");
  const automatic = run(flockCommand, ["-w", "1", lock, "bash", "-lc", 'printf "automatic:entered\\nautomatic:done\\n" >> "$TRACE"'], {
    TRACE: trace,
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 40));
  assert.doesNotMatch(readFileSync(trace, "utf8"), /automatic:entered/, "automatic work cannot enter during runtime switch");
  await exited(deployGuard);
  const automaticResult = await automatic;
  assert.equal(automaticResult.code, 0, "automatic occurrence must wait and still run");
  assert.deepEqual(readFileSync(trace, "utf8").trim().split("\n"), [
    "guard:acquired",
    "switch:bundles",
    "switch:permissions",
    "switch:daemon-reload",
    "guard:release",
    "automatic:entered",
    "automatic:done",
  ]);
  assert.equal(sha(timer), timerBefore, "guarded runtime switch must preserve the automatic timer definition");
}

async function killedHeartbeatTrace() {
  const db = join(temp, "heartbeat.sqlite");
  const lock = join(temp, "heartbeat.lock");
  await runNode(`const {getDb}=(await import(${JSON.stringify(clientPath)})).default; getDb();`, { BRAIN_DB_PATH: db });
  const childScript = `
    const {startRecallSyncExecution,heartbeatRecallExecution}=(await import(${JSON.stringify(modulePath)})).default;
    const result=startRecallSyncExecution({occurrenceKey:'automatic:killed-fixture',trigger:'automatic',now:Date.now()});
    console.log(result.execution.id);
    setInterval(()=>heartbeatRecallExecution(result.execution.id,Date.now()),20);
  `;
  const child = spawn(flockCommand, ["-x", lock, process.execPath, "--import", "tsx", "--input-type=module", "--eval", childScript], {
    cwd: root,
    env: { ...baseEnv, BRAIN_DB_PATH: db },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const executionId = await firstLine(child);
  const held = await run(flockCommand, ["-n", lock, "true"], {});
  assert.notEqual(held.code, 0, "live heartbeat process must retain the outer lock");
  child.kill("SIGKILL");
  await exited(child);
  const reconcileCode = `
    const {getRecallExecution,reconcileStaleRecallExecution,RECALL_HEARTBEAT_STALE_MS}=(await import(${JSON.stringify(modulePath)})).default;
    const before=getRecallExecution(process.env.EXECUTION_ID);
    const result=reconcileStaleRecallExecution({id:before.id,now:before.heartbeat_at+RECALL_HEARTBEAT_STALE_MS,outerLockConfirmedFree:true});
    console.log(JSON.stringify({state:result?.state,stage:result?.stage}));
  `;
  const reconciled = await run(
    flockCommand,
    ["-n", lock, process.execPath, "--import", "tsx", "--input-type=module", "--eval", reconcileCode],
    { ...baseEnv, BRAIN_DB_PATH: db, EXECUTION_ID: executionId },
  );
  assert.equal(reconciled.code, 0);
  assert.deepEqual(JSON.parse(lastLine(reconciled.stdout)), { state: "error", stage: "terminal" });
  const proof = await runNode(`
    const {getDb}=(await import(${JSON.stringify(clientPath)})).default; const db=getDb();
    console.log(JSON.stringify({executions:db.prepare('select count(*) value from recall_sync_executions').get().value,runs:db.prepare('select count(*) value from recall_sync_runs').get().value}));
  `, { BRAIN_DB_PATH: db });
  assert.deepEqual(JSON.parse(lastLine(proof.stdout)), { executions: 1, runs: 0 });
}

async function wakeAndTimerInvariantTrace() {
  const timer = resolve(root, "scripts/deploy/brain-recall-sync.timer");
  const timerBefore = sha(timer);
  const fakeTimerState = join(temp, "fake-systemd-timer-state.json");
  writeFileSync(fakeTimerState, JSON.stringify({ enabled: true, active: true, next: "fixture-next" }));
  const timerStateBefore = sha(fakeTimerState);
  const path = await runFakeSystemdActivation("path");
  assert.ok(path.activationMs <= 500, `path activation exceeded injected healthy bound: ${path.activationMs}ms`);
  assert.deepEqual(path.states, ["queued", "claimed", "running", "error"]);
  const fallback = await runFakeSystemdActivation("fallback");
  assert.ok(fallback.activationMs <= 75, `fallback activation exceeded injected bound: ${fallback.activationMs}ms`);
  assert.deepEqual(fallback.states, ["queued", "claimed", "running", "error"]);
  assert.equal(sha(timer), timerBefore, "fake systemd must not mutate the automatic timer definition");
  assert.equal(sha(fakeTimerState), timerStateBefore, "fake systemd must not mutate timer enabled/active state");
}

async function runFakeSystemdActivation(kind) {
  const db = join(temp, `fake-systemd-${kind}.sqlite`);
  const spool = join(temp, `fake-systemd-${kind}-spool`);
  const marker = join(spool, "wake");
  const invocation = join(temp, `fake-systemd-${kind}-invocations.log`);
  const wrapper = join(temp, `fake-systemd-${kind}-wrapper.sh`);
  const worker = resolve(root, "scripts/dist/recall-manual-sync-worker-prod.mjs");
  const lifecycle = resolve(root, "scripts/dist/recall-sync-lifecycle-prod.mjs");
  assert.ok(existsSync(worker) && existsSync(lifecycle), "build:recall-cli must precede fake-systemd fixtures");
  mkdirSync(spool, { recursive: true });
  writeFileSync(wrapper, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "${kind}:wrapper" >> "$BRAIN_RECALL_TEST_INVOCATION_LOG"
started="$("$BRAIN_RECALL_TEST_NODE" "$BRAIN_RECALL_LIFECYCLE_PATH" start --trigger manual_ui --occurrence-key "$BRAIN_RECALL_OCCURRENCE_KEY" --request-id "$BRAIN_RECALL_REQUEST_ID" --db-path "$BRAIN_DB_PATH" --migrations-dir "$BRAIN_MIGRATIONS_DIR")"
execution_id="\${started#created:}"
sleep 0.08
"$BRAIN_RECALL_TEST_NODE" "$BRAIN_RECALL_LIFECYCLE_PATH" fail --execution-id "$execution_id" --safe-reason internal --db-path "$BRAIN_DB_PATH" --migrations-dir "$BRAIN_MIGRATIONS_DIR"
`);
  chmodSync(wrapper, 0o700);
  const requestedAt = Date.now();
  await runNode(`
    const api=(await import(${JSON.stringify(modulePath)})).default;
    await api.enqueueRecallSyncRequest({idempotencyKey:${JSON.stringify(`fake-systemd-${kind}-key`)},ownerId:'owner',now:${requestedAt}});
  `, { BRAIN_DB_PATH: db });
  atomicMarker(marker);
  const states = ["queued"];
  const startedAt = performance.now();
  let activationAt = null;
  let workerRun;
  let workerResult = null;
  const invokeWorker = () => {
    if (workerRun) return;
    activationAt = performance.now();
    writeFileSync(invocation, `${kind}:worker\n`, { flag: "a" });
    workerRun = run(process.execPath, [worker], {
      ...baseEnv,
      NODE_ENV: "test",
      BRAIN_DB_PATH: db,
      BRAIN_RECALL_MANUAL_WORKER_ENABLED: "1",
      BRAIN_RECALL_WAKE_MARKER: marker,
      BRAIN_RECALL_OUTER_LOCK_PATH: join(temp, `fake-systemd-${kind}.lock`),
      BRAIN_RECALL_FLOCK_COMMAND: flockCommand,
      BRAIN_RECALL_LIFECYCLE_PATH: lifecycle,
      BRAIN_RECALL_WRAPPER_PATH: wrapper,
      BRAIN_RECALL_PROCESS_FIXTURE: "1",
      BRAIN_RECALL_FIXTURE_AFTER_CLAIM_MS: "60",
      BRAIN_RECALL_TEST_INVOCATION_LOG: invocation,
      BRAIN_RECALL_TEST_NODE: process.execPath,
      BRAIN_RECALL_BASH_PATH: "/bin/bash",
    });
  };
  let watcher;
  let fallbackTimer;
  if (kind === "path") {
    rmSync(marker, { force: true });
    watcher = watch(spool, () => {
      if (existsSync(marker)) invokeWorker();
    });
    setTimeout(() => atomicMarker(marker), 10);
  } else {
    fallbackTimer = setTimeout(invokeWorker, 30);
  }
  try {
    await waitUntil(() => Boolean(workerRun), 1_000);
    while (workerRun) {
      const state = readSingleRequestState(db);
      if (states.at(-1) !== state) states.push(state);
      const settled = await Promise.race([
        workerRun.then((result) => ({ done: true, result })),
        new Promise((resolveWait) => setTimeout(() => resolveWait({ done: false }), 5)),
      ]);
      if (settled.done) {
        assert.equal(settled.result.code, 0, settled.result.stderr);
        workerResult = settled.result;
        workerRun = null;
      }
    }
  } finally {
    watcher?.close();
    if (fallbackTimer) clearTimeout(fallbackTimer);
  }
  const finalState = readSingleRequestState(db);
  if (states.at(-1) !== finalState) states.push(finalState);
  const invocationText = existsSync(invocation) ? readFileSync(invocation, "utf8") : "";
  assert.match(invocationText, new RegExp(`${kind}:worker`), `${kind} activation did not invoke the built worker`);
  assert.match(
    invocationText,
    new RegExp(`${kind}:wrapper`),
    `${kind} worker did not invoke the controlled wrapper; states=${states.join(",")} stderr=${workerResult?.stderr ?? ""}`,
  );
  return { activationMs: activationAt - startedAt, states };
}

function readSingleRequestState(path) {
  const db = new Database(path, { readonly: true });
  try {
    return db.prepare("SELECT state FROM recall_sync_requests LIMIT 1").get().state;
  } finally {
    db.close();
  }
}

async function crashStageMatrix() {
  const cases = [
    ["starting", "error", 0, false],
    ["dry_run", "error", 0, false],
    ["backup", "error", 0, false],
    ["apply_running", "partial_failure", 1, false],
    ["apply_done", "partial_failure", 1, false],
    ["apply_validated", "done", 1, true],
  ];
  for (const [name, expectedState, expectedImported, expectedValidated] of cases) {
    const db = join(temp, `crash-${name}.sqlite`);
    const lock = join(temp, `crash-${name}.lock`);
    await runNode(`const {getDb}=(await import(${JSON.stringify(clientPath)})).default; getDb();`, { BRAIN_DB_PATH: db });
    const childCode = `
      const api=(await import(${JSON.stringify(modulePath)})).default;
      const sync=(await import(${JSON.stringify(syncModulePath)})).default;
      const started=api.startRecallSyncExecution({occurrenceKey:${JSON.stringify(`automatic:crash-${name}`)},trigger:'automatic',now:Date.now()});
      const id=started.execution.id;
      const now=Date.now();
      const insert=(runId,mode,state,imported)=>sync.insertRecallSyncRun({id:runId,mode,started_at:now,completed_at:state==='running'?null:now+1,state,date_from:null,date_to:null,cards_seen:imported,cards_imported:imported,cards_upgraded:0,cards_skipped:0,cards_changed_remote:0,cards_blocked:0,total_chars_planned:0,total_chunks_fetched:0,last_error:null,report_json:'{}',execution_id:id,trigger:'automatic',request_id:null});
      const fixture=${JSON.stringify(name)};
      if(fixture==='dry_run'){api.updateRecallExecutionStage({id,stage:'dry_run',runId:'dry',now});insert('dry','dry_run','running',0);}
      if(fixture==='backup'){api.updateRecallExecutionStage({id,stage:'dry_run',runId:'dry',now});insert('dry','dry_run','done',0);api.updateRecallExecutionStage({id,stage:'dry_run_validated',now:now+1});api.updateRecallExecutionStage({id,stage:'backup',now:now+2});}
      if(fixture.startsWith('apply')){api.updateRecallExecutionStage({id,stage:'apply',runId:'apply',now});insert('apply','apply',fixture==='apply_running'?'running':'done',1);if(fixture==='apply_validated')api.updateRecallExecutionStage({id,stage:'apply_validated',now:now+2});}
      console.log(id);
      setInterval(()=>api.heartbeatRecallExecution(id,Date.now()),20);
    `;
    const child = spawn(flockCommand, ["-x", lock, process.execPath, "--import", "tsx", "--input-type=module", "--eval", childCode], {
      cwd: root,
      env: { ...baseEnv, BRAIN_DB_PATH: db },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const executionId = await firstLine(child);
    child.kill("SIGKILL");
    await exited(child);
    const reconcileCode = `
      const api=(await import(${JSON.stringify(modulePath)})).default;
      const before=api.getRecallExecution(process.env.EXECUTION_ID);
      const result=api.reconcileStaleRecallExecution({id:before.id,now:before.heartbeat_at+api.RECALL_HEARTBEAT_STALE_MS,outerLockConfirmedFree:true});
      const duplicate=api.startRecallSyncExecution({occurrenceKey:${JSON.stringify(`automatic:crash-${name}`)},trigger:'automatic',now:before.heartbeat_at+api.RECALL_HEARTBEAT_STALE_MS+1});
      console.log(JSON.stringify({state:result.state,imported:result.cards_imported??0,validated:Boolean(result.wrapper_validated_at),duplicate:duplicate.kind}));
    `;
    const reconciled = await run(flockCommand, ["-n", lock, process.execPath, "--import", "tsx", "--input-type=module", "--eval", reconcileCode], {
      ...baseEnv,
      BRAIN_DB_PATH: db,
      EXECUTION_ID: executionId,
    });
    assert.equal(reconciled.code, 0, reconciled.stderr);
    assert.deepEqual(JSON.parse(lastLine(reconciled.stdout)), {
      state: expectedState,
      imported: expectedImported,
      validated: expectedValidated,
      duplicate: "existing_terminal",
    }, `crash stage ${name}`);
    const counts = await runNode(`
      const {getDb}=(await import(${JSON.stringify(clientPath)})).default;const db=getDb();
      console.log(JSON.stringify({executions:db.prepare('select count(*) value from recall_sync_executions').get().value,applyRuns:db.prepare("select count(*) value from recall_sync_runs where mode='apply'").get().value}));
    `, { BRAIN_DB_PATH: db });
    const proof = JSON.parse(lastLine(counts.stdout));
    assert.equal(proof.executions, 1);
    assert.ok(proof.applyRuns <= 1);
  }
}

async function expiredClaimWorkerDoesNotSpawn() {
  const db = join(temp, "expired-worker.sqlite");
  const marker = join(temp, "expired-worker-wake");
  const invocation = join(temp, "unexpected-wrapper-invocation");
  const wrapper = join(temp, "fixture-wrapper.sh");
  const worker = resolve(root, "scripts/dist/recall-manual-sync-worker-prod.mjs");
  const lifecycle = resolve(root, "scripts/dist/recall-sync-lifecycle-prod.mjs");
  assert.ok(existsSync(worker) && existsSync(lifecycle), "build:recall-cli must precede process fixtures");
  writeFileSync(wrapper, `#!/usr/bin/env bash\nprintf invoked > ${JSON.stringify(invocation)}\n`);
  chmodSync(wrapper, 0o700);
  atomicMarker(marker);
  await runNode(`
    const api=(await import(${JSON.stringify(modulePath)})).default;
    const {getDb}=(await import(${JSON.stringify(clientPath)})).default;
    const queued=await api.enqueueRecallSyncRequest({idempotencyKey:'expired_process_key_123',ownerId:'owner',now:1000});
    await api.claimRecallSyncRequest(1001);
    getDb().prepare('update recall_sync_requests set heartbeat_at=0 where id=?').run(queued.request.id);
  `, { BRAIN_DB_PATH: db });
  const result = await run(process.execPath, [worker], {
    ...baseEnv,
    BRAIN_DB_PATH: db,
    BRAIN_RECALL_MANUAL_WORKER_ENABLED: "1",
    BRAIN_RECALL_WAKE_MARKER: marker,
    BRAIN_RECALL_OUTER_LOCK_PATH: join(temp, "expired-worker.lock"),
    BRAIN_RECALL_FLOCK_COMMAND: flockCommand,
    BRAIN_RECALL_LIFECYCLE_PATH: lifecycle,
    BRAIN_RECALL_WRAPPER_PATH: wrapper,
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(existsSync(invocation), false, "an expired stale claim must never spawn the wrapper");
  const state = await runNode(`
    const {getDb}=(await import(${JSON.stringify(clientPath)})).default;
    console.log(getDb().prepare('select state from recall_sync_requests limit 1').get().state);
  `, { BRAIN_DB_PATH: db });
  assert.equal(lastLine(state.stdout), "expired");
}

function atomicMarker(marker) {
  const temporary = `${marker}.${process.pid}.tmp`;
  const fd = openSync(temporary, "wx", 0o660);
  closeSync(fd);
  renameSync(temporary, marker);
}

function sha(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

async function runNode(code, env) {
  const result = await run(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", code], { ...baseEnv, ...env });
  if (result.code !== 0) throw new Error(`fixture child failed: ${result.stderr || result.stdout}`);
  return result;
}

function run(command, args, env) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

function firstLine(child) {
  return new Promise((resolveLine, reject) => {
    let text = "";
    const timeout = setTimeout(() => reject(new Error("child did not report its execution")), 5_000);
    child.stdout.on("data", (chunk) => {
      text += chunk;
      if (!text.includes("\n")) return;
      clearTimeout(timeout);
      resolveLine(text.slice(0, text.indexOf("\n")).trim());
    });
    child.on("error", reject);
  });
}

function exited(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolveExit) => child.once("exit", resolveExit));
}

function lastLine(value) {
  return value.trim().split("\n").at(-1);
}

async function waitUntil(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("fixture condition timed out");
    await new Promise((resolveWait) => setTimeout(resolveWait, 5));
  }
}

async function resolveFlockCommand() {
  const located = await run("sh", ["-c", "command -v flock"], {});
  if (located.code === 0 && located.stdout.trim()) return located.stdout.trim();
  const source = join(temp, "fixture-flock.c");
  const binary = join(temp, "fixture-flock");
  writeFileSync(source, String.raw`
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/file.h>
#include <time.h>
#include <unistd.h>

static double now_seconds(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (double)ts.tv_sec + (double)ts.tv_nsec / 1000000000.0;
}

int main(int argc, char **argv) {
  int index = 1;
  int nonblocking = 0;
  double wait_seconds = -1.0;
  if (index < argc && strcmp(argv[index], "-x") == 0) index++;
  if (index < argc && strcmp(argv[index], "-n") == 0) { nonblocking = 1; index++; }
  if (index < argc && strcmp(argv[index], "-w") == 0) {
    if (++index >= argc) return 2;
    wait_seconds = atof(argv[index++]);
  }
  if (index + 1 >= argc) return 2;
  int fd = open(argv[index++], O_CREAT | O_RDWR, 0660);
  if (fd < 0) return 2;
  int acquired = 0;
  if (!nonblocking && wait_seconds < 0) acquired = flock(fd, LOCK_EX) == 0;
  else {
    double deadline = now_seconds() + (wait_seconds < 0 ? 0.0 : wait_seconds);
    do {
      if (flock(fd, LOCK_EX | LOCK_NB) == 0) { acquired = 1; break; }
      if (errno != EWOULDBLOCK) break;
      struct timespec pause = {0, 10000000};
      nanosleep(&pause, NULL);
    } while (now_seconds() < deadline);
  }
  if (!acquired) return 1;
  execvp(argv[index], &argv[index]);
  return 127;
}
`);
  const compiled = await run("cc", [source, "-o", binary], {});
  if (compiled.code !== 0) throw new Error(`unable to build flock fixture: ${compiled.stderr}`);
  return binary;
}
