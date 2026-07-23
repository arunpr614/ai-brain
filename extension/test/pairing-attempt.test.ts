import assert from "node:assert/strict";
import test from "node:test";
import { executePairingAttempt, PairingAttemptGate } from "../src/notebooklm/pairing-attempt.ts";

const credential = {
  connectorId: "d".repeat(24),
  token: "b".repeat(64),
  protocolVersion: 2 as const,
  pairedAt: 1,
};

test("pairing gate permits exactly one same-page attempt at a time", async () => {
  const gate = new PairingAttemptGate();
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const first = gate.run(async () => {
    calls += 1;
    await blocked;
  });
  const second = await gate.run(async () => {
    calls += 1;
  });
  assert.equal(second, false);
  assert.equal(calls, 1);
  release();
  assert.equal(await first, true);
  assert.equal(await gate.run(async () => {
    calls += 1;
  }), true);
  assert.equal(calls, 2);
});

test("pairing flow catches Chrome permission and storage failures at one safe boundary", async () => {
  const permissionFailure = new Error("SECRET_PERMISSION_FAILURE");
  let exchanges = 0;
  const permissionResult = await executePairingAttempt({
    code: "ABCD-EFGH",
    hasBrainAccess: async () => { throw permissionFailure; },
    getCredential: async () => null,
    exchange: async () => { exchanges += 1; return credential; },
    storeCredential: async () => {},
  });
  assert.deepEqual(permissionResult, { status: "failed", error: permissionFailure });
  assert.equal(exchanges, 0);

  const storageFailure = new Error("SECRET_STORAGE_FAILURE");
  let stores = 0;
  const storageResult = await executePairingAttempt({
    code: "ABCD-EFGH",
    hasBrainAccess: async () => true,
    getCredential: async () => null,
    exchange: async () => { exchanges += 1; return credential; },
    storeCredential: async () => { stores += 1; throw storageFailure; },
  });
  assert.deepEqual(storageResult, { status: "failed", error: storageFailure });
  assert.equal(exchanges, 1);
  assert.equal(stores, 1);
});

test("pairing flow reports success only after the credential is durably stored", async () => {
  let stored: typeof credential | null = null;
  const result = await executePairingAttempt({
    code: "ABCD-EFGH",
    hasBrainAccess: async () => true,
    getCredential: async () => null,
    exchange: async () => credential,
    storeCredential: async (value) => { stored = value; },
  });
  assert.deepEqual(result, { status: "paired" });
  assert.deepEqual(stored, credential);
});

test("pairing flow stops before exchange when prerequisites are missing", async () => {
  let exchanges = 0;
  const input = {
    getCredential: async () => null,
    exchange: async () => { exchanges += 1; return credential; },
    storeCredential: async () => {},
  };
  assert.deepEqual(
    await executePairingAttempt({ ...input, code: "", hasBrainAccess: async () => true }),
    { status: "empty" },
  );
  assert.deepEqual(
    await executePairingAttempt({ ...input, code: "ABCD-EFGH", hasBrainAccess: async () => false }),
    { status: "brain_access_needed" },
  );
  assert.deepEqual(
    await executePairingAttempt({
      ...input,
      code: "ABCD-EFGH",
      hasBrainAccess: async () => true,
      getCredential: async () => credential,
    }),
    { status: "already_paired" },
  );
  assert.equal(exchanges, 0);
});
