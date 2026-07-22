#!/usr/bin/env node

import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync, rmSync, statfsSync } from "node:fs";
import { resolve } from "node:path";

const TMPFS_MAGIC = 0x01021994;
const KNOWN_STAGE = /^(?:in-process|offsite|immutable|recall|restore)-backup\.[A-Za-z0-9]{6}(?:[A-Za-z0-9]{2})?$/;
const MISSING_FENCE_GRACE_MS = 60_000;
const WRITER_KILL_GRACE_MS = 2_000;
const ORPHAN_REMOVAL_BOUND_MS = 123_000;
const ACTIVE_STAGE_REMOVAL_BOUND_MS = 244_000;

function processFields(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8").trim();
    const close = stat.lastIndexOf(")");
    if (close < 0) return null;
    const suffix = stat.slice(close + 2).split(/\s+/);
    return { state: suffix[0] ?? null, startTime: suffix[19] ?? null };
  } catch {
    return null;
  }
}

function processStartTime(pid) {
  return processFields(pid)?.startTime ?? null;
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function stageHasOpenFileDescriptors(stage) {
  let pids;
  try {
    pids = readdirSync("/proc").filter((entry) => /^\d+$/.test(entry));
  } catch {
    // Production is Linux. Refusing removal is safer than assuming an inode is
    // closed if procfs unexpectedly becomes unavailable.
    return true;
  }
  for (const pid of pids) {
    let descriptors;
    try {
      descriptors = readdirSync(`/proc/${pid}/fd`);
    } catch {
      continue;
    }
    for (const descriptor of descriptors) {
      try {
        const target = readlinkSync(`/proc/${pid}/fd/${descriptor}`);
        if (target === stage || target.startsWith(`${stage}/`)) return true;
      } catch {
        // The process or descriptor can disappear during the scan.
      }
    }
  }
  return false;
}

function readIdentityMarker(path) {
  try {
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600) {
      return null;
    }
    const match = /^(\d+) (\d+)\n?$/.exec(readFileSync(path, "utf8"));
    return match ? { pid: Number(match[1]), startTime: match[2] } : null;
  } catch {
    return null;
  }
}

function readWriterMarker(path) {
  try {
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile() || info.uid !== process.getuid() || (info.mode & 0o777) !== 0o600) {
      return { exists: true, valid: false };
    }
    const match = /^(\d+) (\d+) (\d+) (\d+)\n?$/.exec(readFileSync(path, "utf8"));
    if (!match) return { exists: true, valid: false };
    return {
      exists: true,
      valid: true,
      pid: Number(match[1]),
      startTime: match[2],
      pgid: Number(match[3]),
      pgidStartTime: match[4],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { exists: false, valid: true };
    }
    return { exists: true, valid: false };
  }
}

function stageOpenFileHolders(stage) {
  const holders = new Map();
  let pids;
  try {
    pids = readdirSync("/proc").filter((entry) => /^\d+$/.test(entry));
  } catch {
    return null;
  }
  for (const pidText of pids) {
    let descriptors;
    try {
      descriptors = readdirSync(`/proc/${pidText}/fd`);
    } catch {
      continue;
    }
    for (const descriptor of descriptors) {
      try {
        const target = readlinkSync(`/proc/${pidText}/fd/${descriptor}`);
        if (target === stage || target.startsWith(`${stage}/`)) {
          const pid = Number(pidText);
          const fields = processFields(pid);
          if (fields) holders.set(pid, fields.startTime);
          break;
        }
      } catch {
        // The process or descriptor can disappear during the scan.
      }
    }
  }
  return holders;
}

function fenceAndVerifyStageWriters(stage, owner = null) {
  const writer = readWriterMarker(resolve(stage, ".writer"));
  if (writer.valid && writer.exists) {
    const group = processFields(writer.pgid);
    if (group?.startTime === writer.pgidStartTime) {
      try {
        process.kill(-writer.pgid, "SIGKILL");
      } catch {
        // The independently timed group may already be gone.
      }
    }
  }
  if (writer.valid && writer.exists && processStartTime(writer.pid) === writer.startTime) {
    try {
      process.kill(writer.pid, "SIGKILL");
    } catch {
      // Already dead is the desired state.
    }
  }
  if (owner && processStartTime(owner.pid) === owner.startTime) {
    try {
      // This also fences a legacy in-process VACUUM and an outer producer
      // suspended between steps; after expiry it must never resume/publish.
      process.kill(owner.pid, "SIGKILL");
    } catch {
      // Already dead is the desired state.
    }
  }
  const holders = stageOpenFileHolders(stage);
  if (holders === null) return false;
  for (const [pid, startTime] of holders) {
    if (processStartTime(pid) !== startTime) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Races with normal process exit are expected.
    }
  }
  const fields = writer.valid && writer.exists ? processFields(writer.pid) : null;
  const writerCannotHoldFiles =
    !writer.valid || !writer.exists || !fields || fields.startTime !== writer.startTime || fields.state === "Z";
  return writerCannotHoldFiles && !stageHasOpenFileDescriptors(stage);
}

export function cleanupVolatileBackupStaging({
  root = process.env.BRAIN_BACKUP_STAGING_DIR || "/run/brain-backup-staging",
  now = Date.now(),
  processStartTimeForPid = processStartTime,
  fenceStageWriters = fenceAndVerifyStageWriters,
  stageCreatedAtForInfo = (info) => (info.birthtimeMs > 0 ? info.birthtimeMs : info.ctimeMs),
  unsafeSkipFilesystemProofForTests = false,
} = {}) {
  const canonical = realpathSync(root);
  const rootInfo = lstatSync(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory() || canonical !== resolve(root)) {
    throw new Error("volatile backup staging root is not a canonical directory");
  }
  if ((rootInfo.mode & 0o777) !== 0o700 || rootInfo.uid !== process.getuid()) {
    throw new Error("volatile backup staging root must be runtime-owned mode 0700");
  }
  if (!unsafeSkipFilesystemProofForTests && statfsSync(canonical, { bigint: true }).type !== BigInt(TMPFS_MAGIC)) {
    throw new Error("volatile backup staging root is not tmpfs");
  }

  let active = 0;
  let removed = 0;
  let grace = 0;
  let expiredActive = 0;
  let writerFenceFailures = 0;
  const pendingWriterClosure = [];
  for (const entry of readdirSync(canonical, { withFileTypes: true })) {
    if (!entry.isDirectory() || !KNOWN_STAGE.test(entry.name)) continue;
    const stage = resolve(canonical, entry.name);
    if (!stage.startsWith(`${canonical}/`)) throw new Error("volatile stage escaped its root");
    const info = lstatSync(stage);
    if (info.isSymbolicLink() || info.uid !== process.getuid()) {
      throw new Error("volatile stage has an unsafe owner or type");
    }
    const owner = readIdentityMarker(resolve(stage, ".owner"));
    const ownerIsLive = Boolean(owner && processStartTimeForPid(owner.pid) === owner.startTime);
    let deadline = null;
    try {
      const deadlinePath = resolve(stage, ".deadline");
      const deadlineInfo = lstatSync(deadlinePath);
      const value = readFileSync(deadlinePath, "utf8").trim();
      const parsed = Number(value);
      const createdAt = deadlineInfo.birthtimeMs > 0 ? deadlineInfo.birthtimeMs : deadlineInfo.ctimeMs;
      if (
        /^\d{13}$/.test(value) &&
        Number.isSafeInteger(parsed) &&
        !deadlineInfo.isSymbolicLink() &&
        deadlineInfo.isFile() &&
        deadlineInfo.uid === process.getuid() &&
        (deadlineInfo.mode & 0o777) === 0o600 &&
        parsed >= createdAt &&
        parsed <= createdAt + 181_000
      ) {
        deadline = parsed;
      }
    } catch {
      // Missing/invalid fences receive only the short creation/upgrade grace.
    }
    const stageCreatedAt = stageCreatedAtForInfo(info, stage);
    if (!Number.isFinite(stageCreatedAt)) throw new Error("volatile stage creation time is invalid");
    const fenceExpired = deadline === null
      ? now - stageCreatedAt >= MISSING_FENCE_GRACE_MS
      : now >= deadline;
    if (ownerIsLive && !fenceExpired) {
      active += 1;
      continue;
    }
    if (!owner && !fenceExpired) {
      grace += 1;
      continue;
    }
    if (ownerIsLive) expiredActive += 1;
    if (!fenceStageWriters(stage, ownerIsLive ? owner : null)) {
      pendingWriterClosure.push({ stage, device: info.dev, inode: info.ino });
      continue;
    }
    rmSync(stage, { recursive: true, force: true });
    removed += 1;
  }
  // All identities are signalled before this single bounded wait, so an
  // arbitrary backlog of bad stages cannot multiply the grace or starve a
  // later stage in the same root.
  const stopAt = Date.now() + WRITER_KILL_GRACE_MS;
  while (
    pendingWriterClosure.some(({ stage }) => stageHasOpenFileDescriptors(stage)) &&
    Date.now() < stopAt
  ) {
    sleepSync(25);
  }
  for (const pending of pendingWriterClosure) {
    if (stageHasOpenFileDescriptors(pending.stage)) {
      writerFenceFailures += 1;
      continue;
    }
    try {
      const current = lstatSync(pending.stage);
      if (current.dev !== pending.device || current.ino !== pending.inode || current.isSymbolicLink()) {
        writerFenceFailures += 1;
        continue;
      }
      rmSync(pending.stage, { recursive: true, force: true });
      removed += 1;
    } catch {
      // A concurrently completed owner may already have removed its stage.
    }
  }
  if (writerFenceFailures !== 0) {
    throw new Error(`failed to fence ${writerFenceFailures} expired volatile backup writer(s)`);
  }
  return {
    root: canonical,
    active,
    expiredActive,
    removed,
    grace,
    orphanRemovalBoundMs: ORPHAN_REMOVAL_BOUND_MS,
    activeStageRemovalBoundMs: ACTIVE_STAGE_REMOVAL_BOUND_MS,
  };
}

function parseCliRoot(argv) {
  if (argv.length === 0) return undefined;
  if (argv.length === 2 && argv[0] === "--root" && argv[1]) return argv[1];
  throw new Error("usage: cleanup-volatile-backup-staging.mjs [--root <tmpfs-directory>]");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const root = parseCliRoot(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify({ ok: true, ...cleanupVolatileBackupStaging(root ? { root } : {}) })}\n`);
  } catch (error) {
    console.error(`[cleanup-volatile-backup-staging] ${error instanceof Error ? error.message : "unknown failure"}`);
    process.exit(1);
  }
}
