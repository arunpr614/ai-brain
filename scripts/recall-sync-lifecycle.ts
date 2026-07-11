#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  completeRecallSyncExecution,
  failRecallSyncExecution,
  heartbeatRecallExecution,
  reconcileStaleRecallExecution,
  requeueStaleClaimedRecallRequest,
  setRecallScheduleSnapshot,
  startRecallSyncExecution,
  updateRecallExecutionStage,
  type RecallExecutionStage,
  type SafeRecallReason,
} from "../src/db/recall-manual-sync";

function value(name: string, required = true): string | null {
  const index = process.argv.indexOf(`--${name}`);
  const result = index >= 0 ? process.argv[index + 1] : null;
  if (required && !result) throw new Error(`--${name} is required`);
  return result;
}

function configureDb(): void {
  const path = value("db-path", false);
  const migrations = value("migrations-dir", false);
  if (path) process.env.BRAIN_DB_PATH = path;
  if (migrations) process.env.BRAIN_MIGRATIONS_DIR = migrations;
}

function reportRunId(path: string): string {
  const report = JSON.parse(readFileSync(path, "utf8")) as { runId?: unknown };
  if (typeof report.runId !== "string" || !report.runId) throw new Error("report has no runId");
  return report.runId;
}

function parseNextElapse(output: string): string | null {
  const raw = output.trim();
  if (!raw || raw === "n/a") return null;
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  try {
    // systemd renders this property in the host timezone (for example, an
    // `IST` suffix), and V8 does not recognize every systemd abbreviation.
    // GNU date already uses the host timezone database, so normalize the
    // trusted systemctl value without invoking a shell.
    const normalized = execFileSync("date", ["--date", raw, "--iso-8601=seconds"], {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    const normalizedTimestamp = Date.parse(normalized);
    return Number.isFinite(normalizedTimestamp) ? new Date(normalizedTimestamp).toISOString() : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command) throw new Error("lifecycle command is required");
  configureDb();
  const now = Date.now();

  if (command === "start") {
    const trigger = value("trigger") as "automatic" | "manual_ui";
    if (trigger !== "automatic" && trigger !== "manual_ui") throw new Error("invalid trigger");
    const result = startRecallSyncExecution({
      occurrenceKey: value("occurrence-key")!,
      trigger,
      requestId: value("request-id", false),
      now,
    });
    process.stdout.write(`${result.kind}:${result.execution.id}\n`);
    return;
  }

  if (command === "stage") {
    const stage = value("stage") as RecallExecutionStage;
    const runId = value("run-id", false) ?? undefined;
    updateRecallExecutionStage({ id: value("execution-id")!, stage, runId, now });
    return;
  }

  if (command === "heartbeat") {
    if (!heartbeatRecallExecution(value("execution-id")!, now)) process.exitCode = 3;
    return;
  }

  if (command === "complete") {
    completeRecallSyncExecution({
      id: value("execution-id")!,
      applyRunId: value("apply-run-id", false) ?? reportRunId(value("apply-report")!),
      now,
    });
    return;
  }

  if (command === "fail") {
    failRecallSyncExecution({
      id: value("execution-id")!,
      applyRunId: value("apply-run-id", false),
      safeReason: (value("safe-reason", false) ?? "internal") as SafeRecallReason,
      now,
    });
    return;
  }

  if (command === "reconcile") {
    if (value("outer-lock-confirmed-free", false) !== "1") {
      throw new Error("trusted outer-lock proof is required");
    }
    const reconciled = reconcileStaleRecallExecution({
      id: value("execution-id")!,
      now,
      outerLockConfirmedFree: true,
    });
    if (!reconciled) {
      process.stdout.write("not_stale\n");
      process.exitCode = 75;
      return;
    }
    process.stdout.write(`terminal:${reconciled.id}:${reconciled.state}\n`);
    return;
  }

  if (command === "recover-claim") {
    if (value("outer-lock-confirmed-free", false) !== "1") {
      throw new Error("trusted outer-lock proof is required");
    }
    process.stdout.write(`${requeueStaleClaimedRecallRequest(now, true)}\n`);
    return;
  }

  if (command === "schedule") {
    const timerName = value("timer-name", false) ?? "brain-recall-sync.timer";
    let next: string | null = null;
    try {
      const output = execFileSync("systemctl", ["show", timerName, "--property=NextElapseUSecRealtime", "--value"], {
        encoding: "utf8",
        timeout: 10_000,
      });
      next = parseNextElapse(output);
    } catch {
      // A missing snapshot is deliberately represented as unavailable.
    }
    if (next) setRecallScheduleSnapshot({ timerName, nextElapseAt: next, observedAt: now });
    return;
  }

  throw new Error(`unknown lifecycle command: ${command}`);
}

main().catch(() => {
  console.error(JSON.stringify({ type: "recall.lifecycle.failure", safeReason: "internal" }));
  process.exitCode = 1;
});
