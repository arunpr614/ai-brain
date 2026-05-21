// Tests for off-site backup upload (v0.6.2 D-18).
//
// The local VACUUM INTO + retention path is exercised in production by
// the existing 6h scheduler. These tests cover the new off-site path:
// gpg encrypt → B2 upload, with the failure modes spelled out in the
// v0.6.2 plan (missing env, upload throw, cleartext-still-present).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  readFileSync,
  rmSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { uploadOffsite, type OffsiteDeps } from "./backup";

interface UploadCall {
  keyId: string;
  appKey: string;
  bucket: string;
  fileName: string;
  data: Buffer;
}

function makeDeps(opts: {
  uploadImpl?: (c: UploadCall) => Promise<void>;
} = {}): { deps: OffsiteDeps; calls: UploadCall[]; encrypts: string[] } {
  const calls: UploadCall[] = [];
  const encrypts: string[] = [];
  const deps: OffsiteDeps = {
    encrypt: (src) => {
      encrypts.push(src);
      const out = `${src}.gpg`;
      // Real gpg writes a binary blob; the stub just copies the source so
      // the upload step has *something* to read.
      copyFileSync(src, out);
      return out;
    },
    uploader: {
      upload: async (c) => {
        calls.push(c);
        if (opts.uploadImpl) await opts.uploadImpl(c);
      },
    },
  };
  return { deps, calls, encrypts };
}

function withSnapshot(
  fn: (snap: string) => Promise<void>,
): () => Promise<void> {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), "brain-backup-test-"));
    const snap = join(dir, "2026-05-21_1200.sqlite");
    writeFileSync(snap, "fake sqlite bytes");
    try {
      await fn(snap);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

const ENV_KEYS = [
  "B2_KEY_ID",
  "B2_APP_KEY",
  "B2_BUCKET",
  "BACKUP_GPG_RECIPIENT",
] as const;

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>) {
  const prior: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    prior[k] = process.env[k];
    if (values[k] !== undefined) process.env[k] = values[k]!;
    else delete process.env[k];
  }
  return () => {
    for (const k of ENV_KEYS) {
      if (prior[k] === undefined) delete process.env[k];
      else process.env[k] = prior[k];
    }
  };
}

test(
  "uploadOffsite: encrypts, uploads encrypted artifact, removes .gpg, retains cleartext",
  withSnapshot(async (snap) => {
    const restore = setEnv({
      B2_KEY_ID: "kid",
      B2_APP_KEY: "appkey",
      B2_BUCKET: "brain-backups",
      BACKUP_GPG_RECIPIENT: "ops@example.com",
    });
    const { deps, calls, encrypts } = makeDeps();
    try {
      await uploadOffsite(snap, deps);
      assert.equal(encrypts.length, 1);
      assert.equal(encrypts[0], snap);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].bucket, "brain-backups");
      assert.equal(calls[0].keyId, "kid");
      assert.equal(calls[0].appKey, "appkey");
      assert.equal(calls[0].fileName, "2026-05-21_1200.sqlite.gpg");
      assert.ok(calls[0].data.length > 0);
      // Cleartext local snapshot is the authoritative backup; must still exist.
      assert.equal(existsSync(snap), true);
      // Encrypted intermediate is removed after upload.
      assert.equal(existsSync(`${snap}.gpg`), false);
    } finally {
      restore();
    }
  }),
);

test(
  "uploadOffsite: missing env logs warning + returns without throw",
  withSnapshot(async (snap) => {
    // No env set at all → first missing var (B2_KEY_ID) wins.
    const restore = setEnv({});
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    const { deps, calls, encrypts } = makeDeps();
    try {
      await uploadOffsite(snap, deps);
      assert.equal(encrypts.length, 0);
      assert.equal(calls.length, 0);
      assert.ok(
        logs.some((l) => l.includes("off-site disabled") && l.includes("B2_KEY_ID")),
        `expected disabled warning, got: ${JSON.stringify(logs)}`,
      );
    } finally {
      console.log = orig;
      restore();
    }
  }),
);

test(
  "uploadOffsite: B2 upload throw propagates, .gpg still cleaned up",
  withSnapshot(async (snap) => {
    const restore = setEnv({
      B2_KEY_ID: "kid",
      B2_APP_KEY: "appkey",
      B2_BUCKET: "brain-backups",
      BACKUP_GPG_RECIPIENT: "ops@example.com",
    });
    const { deps } = makeDeps({
      uploadImpl: async () => {
        throw new Error("503 Service Unavailable");
      },
    });
    try {
      await assert.rejects(
        () => uploadOffsite(snap, deps),
        /503 Service Unavailable/,
      );
      // The .gpg intermediate should have been removed via the finally block,
      // even though the upload itself threw.
      assert.equal(existsSync(`${snap}.gpg`), false);
      // Cleartext local snapshot is preserved.
      assert.equal(existsSync(snap), true);
    } finally {
      restore();
    }
  }),
);

test(
  "uploadOffsite: missing single var (BACKUP_GPG_RECIPIENT) is reported by name",
  withSnapshot(async (snap) => {
    const restore = setEnv({
      B2_KEY_ID: "kid",
      B2_APP_KEY: "appkey",
      B2_BUCKET: "brain-backups",
      // BACKUP_GPG_RECIPIENT intentionally absent
    });
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    const { deps, calls } = makeDeps();
    try {
      await uploadOffsite(snap, deps);
      assert.equal(calls.length, 0);
      assert.ok(
        logs.some(
          (l) =>
            l.includes("off-site disabled") &&
            l.includes("BACKUP_GPG_RECIPIENT"),
        ),
        `expected BACKUP_GPG_RECIPIENT warning, got: ${JSON.stringify(logs)}`,
      );
    } finally {
      console.log = orig;
      restore();
    }
  }),
);

test(
  "uploadOffsite: encrypted payload (not cleartext) is what reaches the uploader",
  withSnapshot(async (snap) => {
    const restore = setEnv({
      B2_KEY_ID: "kid",
      B2_APP_KEY: "appkey",
      B2_BUCKET: "brain-backups",
      BACKUP_GPG_RECIPIENT: "ops@example.com",
    });
    // Override encrypt to produce a clearly-distinct payload, so we can
    // assert the uploader gets the encrypted file content rather than the
    // cleartext source.
    const calls: UploadCall[] = [];
    const deps: OffsiteDeps = {
      encrypt: (src) => {
        const out = `${src}.gpg`;
        writeFileSync(out, "ENCRYPTED-PAYLOAD-MARKER");
        return out;
      },
      uploader: {
        upload: async (c) => {
          calls.push(c);
        },
      },
    };
    try {
      await uploadOffsite(snap, deps);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].data.toString(), "ENCRYPTED-PAYLOAD-MARKER");
      // Cleartext source untouched.
      assert.equal(readFileSync(snap, "utf8"), "fake sqlite bytes");
    } finally {
      restore();
    }
  }),
);
