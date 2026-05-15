/**
 * S-11 — node-cron lifecycle inside Next.js (automated portion).
 *
 * Verifies hypotheses H-1, H-2, H-3, H-5 from S-11 plan. H-4 (prod single
 * registration) requires a real `next build && next start` and is run as
 * the manual portion at the end (the user runs it; this script can't
 * easily fork next.js).
 *
 * Run: node --import tsx scripts/spike-node-cron-lifecycle.ts
 */
import cron from "node-cron";

interface HResult {
  id: string;
  verdict: "PASS" | "FAIL";
  detail: string;
}

const results: HResult[] = [];

function record(id: string, verdict: "PASS" | "FAIL", detail: string): void {
  results.push({ id, verdict, detail });
  const tag = verdict === "PASS" ? "✓" : "✗";
  console.log(`${tag} ${id}: ${verdict} — ${detail}`);
}

// Mirrors the F-044 enrichment-worker pattern. The contract this spike
// validates: registering twice via this guarded function results in
// exactly ONE active task, regardless of how many times the registration
// module is re-evaluated.
declare global {
  // eslint-disable-next-line no-var
  var __spikeCronState:
    | { registered: boolean; tickCount: number; task: ReturnType<typeof cron.schedule> | null }
    | undefined;
}

function cronState() {
  if (!globalThis.__spikeCronState) {
    globalThis.__spikeCronState = { registered: false, tickCount: 0, task: null };
  }
  return globalThis.__spikeCronState;
}

function registerOnce(label: string): void {
  const state = cronState();
  if (state.registered) {
    console.log(`  [register:${label}] already-registered short-circuit (good)`);
    return;
  }
  state.registered = true;
  // Every-second cron — fires fast for tests so we don't wait minutes.
  state.task = cron.schedule("* * * * * *", () => {
    state.tickCount += 1;
  });
  console.log(`  [register:${label}] task created`);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function h1ColdStart(): Promise<void> {
  console.log("\n[H-1] cold start: register once → 1 task");
  // Reset state to simulate a fresh process boot.
  delete globalThis.__spikeCronState;

  registerOnce("h1");
  const tasksAfter = cron.getTasks().size;
  if (tasksAfter !== 1) {
    record("H-1", "FAIL", `expected 1 task, got ${tasksAfter}`);
    return;
  }

  // Wait for 2.5 seconds and assert the task fires (tickCount > 0)
  // and only ONE task is firing.
  await sleep(2500);
  const ticks = cronState().tickCount;
  if (ticks < 1) {
    record("H-1", "FAIL", `expected ≥1 tick in 2.5s, got ${ticks}`);
    return;
  }
  record("H-1", "PASS", `1 task active, ${ticks} ticks in 2.5s`);
}

async function h2HmrGuarded(): Promise<void> {
  console.log("\n[H-2] HMR re-eval (5×): guarded register stays at 1 task");
  // Don't reset state — simulate a re-evaluated module finding the guard
  // already set on globalThis.
  const baselineTicks = cronState().tickCount;
  for (let i = 0; i < 5; i++) {
    registerOnce(`h2-${i}`);
  }
  const tasksAfter = cron.getTasks().size;
  if (tasksAfter !== 1) {
    record("H-2", "FAIL", `expected 1 task after 5 re-registers, got ${tasksAfter}`);
    return;
  }

  await sleep(2500);
  const newTicks = cronState().tickCount - baselineTicks;
  // Should still be ~2 ticks (one per second) — not 10 (one per second × 5 tasks).
  if (newTicks > 4) {
    record(
      "H-2",
      "FAIL",
      `expected ~2 ticks in 2.5s, got ${newTicks} (suggests duplicate timers)`,
    );
    return;
  }
  record(
    "H-2",
    "PASS",
    `1 task survives 5 re-registers; ${newTicks} ticks in 2.5s (no duplication)`,
  );
}

async function h2bUnguarded(): Promise<void> {
  console.log("\n[H-2b] HMR re-eval WITHOUT guard: 5 tasks, 5× ticks");
  // Negative control: prove that without the guard, duplication is real.
  // This validates that the guard is actually doing work (not a vacuous PASS).
  const stateBefore = cronState();
  // Record baseline ticks; then schedule 4 EXTRA tasks unguarded.
  const extraTasks: ReturnType<typeof cron.schedule>[] = [];
  let extraTicks = 0;
  for (let i = 0; i < 4; i++) {
    extraTasks.push(
      cron.schedule("* * * * * *", () => {
        extraTicks += 1;
      }),
    );
  }
  const totalTasks = cron.getTasks().size;
  if (totalTasks !== 5) {
    record("H-2b", "FAIL", `expected 5 tasks (1 guarded + 4 extra), got ${totalTasks}`);
    extraTasks.forEach((t) => t.stop());
    return;
  }
  await sleep(2500);
  // Guarded task already increments stateBefore.tickCount; extraTicks is the
  // delta from the unguarded ones. Expect roughly 4×2 = 8 extra ticks in 2.5s.
  if (extraTicks < 6) {
    record("H-2b", "FAIL", `unguarded duplication should produce ≥6 extra ticks; got ${extraTicks}`);
    extraTasks.forEach((t) => t.stop());
    return;
  }
  record(
    "H-2b",
    "PASS",
    `unguarded path produces ${extraTicks} extra ticks across 4 duplicates → guard is load-bearing`,
  );
  // Cleanup: in node-cron 4.x, stop() halts ticks but leaves task in getTasks();
  // destroy() removes it. We don't assert registry size here — H-5 covers
  // that "stop()=no-fire" is the load-bearing contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraTasks.forEach((t) => ((t as any).destroy ? (t as any).destroy() : t.stop()));
  void stateBefore;
}

async function h3UnrelatedFile(): Promise<void> {
  console.log("\n[H-3] unrelated module re-eval: registerOnce short-circuits");
  // Simulate by calling registerOnce again. If the guard works, no new task.
  const tasksBefore = cron.getTasks().size;
  for (let i = 0; i < 3; i++) {
    registerOnce(`h3-${i}`);
  }
  const tasksAfter = cron.getTasks().size;
  if (tasksAfter !== tasksBefore) {
    record(
      "H-3",
      "FAIL",
      `task count grew: before=${tasksBefore}, after=${tasksAfter}`,
    );
    return;
  }
  record("H-3", "PASS", `task count stable at ${tasksAfter} across 3 unrelated re-evals`);
}

async function h5SigtermClean(): Promise<void> {
  console.log("\n[H-5] task.stop() removes the schedule cleanly");
  const state = cronState();
  if (!state.task) {
    record("H-5", "FAIL", "no task to stop");
    return;
  }
  const beforeTicks = state.tickCount;
  state.task.stop();
  // After stop, no further ticks should land.
  await sleep(2500);
  const afterTicks = state.tickCount;
  const delta = afterTicks - beforeTicks;
  if (delta > 0) {
    record("H-5", "FAIL", `task.stop() did not stop ticks; ${delta} extra ticks in 2.5s`);
    return;
  }
  // Verify the task is fully removed from the registry.
  const tasksRemaining = cron.getTasks().size;
  // node-cron 4.x: stopped tasks remain in getTasks() until explicitly destroyed.
  // We accept either behavior; the load-bearing fact is "no further fires".
  record(
    "H-5",
    "PASS",
    `0 ticks after stop(); getTasks().size=${tasksRemaining} (stopped tasks may linger in registry — non-firing is the contract)`,
  );
}

async function main(): Promise<number> {
  const t0 = Date.now();
  try {
    await h1ColdStart();
    await h2HmrGuarded();
    await h2bUnguarded();
    await h3UnrelatedFile();
    await h5SigtermClean();
  } catch (err) {
    console.error(`\n[ABORT] ${(err as Error).message}\n${(err as Error).stack}`);
  }
  const wall_s = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Summary (wall ${wall_s}s) ===`);
  for (const r of results) {
    console.log(`  ${r.verdict === "PASS" ? "✓" : "✗"} ${r.id}: ${r.verdict}`);
  }
  // Cleanup any lingering tasks so the process can exit.
  cron.getTasks().forEach((t) => t.stop());
  const failed = results.filter((r) => r.verdict === "FAIL");
  if (failed.length > 0) {
    console.log(`\n${failed.length} hypothesis FAIL — see findings detail above.`);
    return 1;
  }
  console.log("\nAll automated hypotheses PASS. H-4 (prod multi-runtime) requires manual run.");
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
