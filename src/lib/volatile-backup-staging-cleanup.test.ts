import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { cleanupVolatileBackupStaging } from "../../scripts/cleanup-volatile-backup-staging.mjs";

test("volatile backup janitor preserves active work and bounds orphan cleanup", () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "brain-backup-janitor-test."));
  chmodSync(root, 0o700);
  const now = Date.now();
  const makeStage = (name: string, owner?: string, ageMs = 0, deadline?: number) => {
    const stage = join(root, name);
    mkdirSync(stage, { mode: 0o700 });
    if (owner) writeFileSync(join(stage, ".owner"), `${owner}\n`, { mode: 0o600 });
    if (deadline) writeFileSync(join(stage, ".deadline"), `${deadline}\n`, { mode: 0o600 });
    const time = new Date(now - ageMs);
    utimesSync(stage, time, time);
    return stage;
  };
  const active = makeStage("in-process-backup.ABC123", "42 9001", 0, now + 180_000);
  const expiredActive = makeStage("restore-backup.LATE1234", "44 9004", 0, now + 10_000);
  const dead = makeStage("offsite-backup.ABC12345", "43 9002");
  const recentUnmarked = makeStage("immutable-backup.DEF45678", undefined, 30_000);
  const oldUnmarked = makeStage("recall-backup.XYZ789", undefined, 61_000);
  const fencedOwnerPids: Array<number | null> = [];

  try {
    const result = cleanupVolatileBackupStaging({
      root,
      now: now + 10_001,
      unsafeSkipFilesystemProofForTests: true,
      processStartTimeForPid: (pid: number) => (pid === 42 ? "9001" : pid === 44 ? "9004" : null),
      stageCreatedAtForInfo: (info: { mtimeMs: number }) => info.mtimeMs,
      fenceStageWriters: (_stage: string, owner?: { pid: number } | null) => {
        fencedOwnerPids.push(owner?.pid ?? null);
        return true;
      },
    });
    assert.deepEqual(
      {
        active: result.active,
        expiredActive: result.expiredActive,
        removed: result.removed,
        grace: result.grace,
        orphanBound: result.orphanRemovalBoundMs,
        activeBound: result.activeStageRemovalBoundMs,
      },
      { active: 1, expiredActive: 1, removed: 3, grace: 1, orphanBound: 123_000, activeBound: 244_000 },
    );
    assert.ok(existsSync(active));
    assert.ok(!existsSync(dead));
    assert.ok(existsSync(recentUnmarked));
    assert.ok(!existsSync(oldUnmarked));
    assert.ok(!existsSync(expiredActive));
    assert.ok(fencedOwnerPids.includes(44), "expired live owner must be fenced before unlink");

    const afterGrace = cleanupVolatileBackupStaging({
      root,
      now: now + 31_001,
      unsafeSkipFilesystemProofForTests: true,
      processStartTimeForPid: (pid: number) => (pid === 42 ? "9001" : null),
      stageCreatedAtForInfo: (info: { mtimeMs: number }) => info.mtimeMs,
      fenceStageWriters: () => true,
    });
    assert.equal(afterGrace.removed, 1);
    assert.ok(!existsSync(recentUnmarked));
    assert.ok(existsSync(active));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
