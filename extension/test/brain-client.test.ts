import assert from "node:assert/strict";
import test from "node:test";
import {
  BrainConnectorClient,
  BrainConnectorError,
  brainConnectorSetupMessage,
  brainContractTestHooks,
} from "../src/notebooklm/brain-client.ts";

const FINGERPRINT = "a".repeat(64);

test("claim parser pins the server protocol DTO", () => {
  const claim = brainContractTestHooks.parseClaim({
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "create",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      marker: "brain_req_1234567890",
      title: "Title · brain_req_1234567890",
      text: "Content",
      sourceAlias: null,
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  });
  assert.equal(claim.action, "create");
  assert.throws(() => brainContractTestHooks.parseClaim({ ...claim, action: "write_again" }));
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      source: { ...claim.source, title: "Title without the reconciliation marker" },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      action: "reconcile",
      source: { ...claim.source, sourceAlias: null },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      source: { ...claim.source, text: "🚀".repeat(50_001) },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      target: { ...claim.target, sourceLimit: 300 },
    }),
  );
});

test("first binding sends observed version 0 and accepts authoritative version 1", async () => {
  let requestBody: unknown;
  const client = new BrainConnectorClient(async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json(
      { bound: true, target: { bindingVersion: 1 } },
      { headers: { "x-notebooklm-connector-protocol": "1" } },
    );
  });
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 1 as const,
    pairedAt: 1,
  };
  assert.deepEqual(
    await client.bind(credential, {
      bindingVersion: 0,
      safeLabel: "Private notebook",
      localBindingFingerprint: FINGERPRINT,
      subjectFingerprint: "c".repeat(64),
      sharingPosture: "private",
      sourceCount: 2,
      sourceLimit: 50,
      reserveCount: 5,
    }),
    { bindingVersion: 1 },
  );
  assert.equal((requestBody as { bindingVersion: number }).bindingVersion, 0);
});

test("lost-response bind retry accepts the server's newer authoritative version", async () => {
  const client = new BrainConnectorClient(async () =>
    Response.json({ bound: true, target: { bindingVersion: 2 } }),
  );
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 1 as const,
    pairedAt: 1,
  };
  assert.deepEqual(
    await client.bind(credential, {
      bindingVersion: 1,
      safeLabel: "Private notebook",
      localBindingFingerprint: FINGERPRINT,
      subjectFingerprint: "c".repeat(64),
      sharingPosture: "private",
      sourceCount: 2,
      sourceLimit: 50,
      reserveCount: 5,
    }),
    { bindingVersion: 2 },
  );
});

test("bind conflicts preserve safe, actionable setup outcomes", async () => {
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 1 as const,
    pairedAt: 1,
  };
  const input = {
    bindingVersion: 1,
    safeLabel: "Private notebook",
    localBindingFingerprint: FINGERPRINT,
    subjectFingerprint: "c".repeat(64),
    sharingPosture: "private" as const,
    sourceCount: 2,
    sourceLimit: 50,
    reserveCount: 5,
  };
  const cases = [
    ["target_has_active_work", "active_work", "Finish or explicitly stop every unresolved export"],
    ["invalid_binding", "stale_binding", "saved notebook binding is stale"],
    ["target_not_private", "target_not_private", "owner-only private notebook"],
    ["target_capacity_exhausted", "target_capacity", "too close to its source limit"],
    ["unexpected_conflict", "protocol", "incompatible connector protocols"],
  ] as const;

  for (const [serverCode, expectedKind, expectedMessage] of cases) {
    const client = new BrainConnectorClient(async () =>
      Response.json({ error: serverCode }, { status: 409 }),
    );
    await assert.rejects(client.bind(credential, input), (error: unknown) => {
      assert.ok(error instanceof BrainConnectorError);
      assert.equal(error.kind, expectedKind);
      assert.match(brainConnectorSetupMessage(error), new RegExp(expectedMessage));
      return true;
    });
  }
});

test("dispatch requires an explicit durable authorization acknowledgement", async () => {
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 1 as const,
    pairedAt: 1,
  };
  let capturedBody: unknown;
  const client = new BrainConnectorClient(async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body));
    return Response.json({ accepted: true, dispatchAuthorized: true });
  });
  await client.sendEvent(
    credential,
    { requestId: "1".repeat(24), leaseToken: "2".repeat(64), leaseEpoch: 1 },
    { type: "dispatch_started" },
  );
  assert.deepEqual(capturedBody, {
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    event: { type: "dispatch_started" },
  });

  const rejected = new BrainConnectorClient(async () =>
    Response.json({ accepted: true, dispatchAuthorized: false }),
  );
  await assert.rejects(
    rejected.sendEvent(
      credential,
      { requestId: "1".repeat(24), leaseToken: "2".repeat(64), leaseEpoch: 1 },
      { type: "dispatch_started" },
    ),
  );
});

test("claim endpoint unwraps the server claim envelope", async () => {
  const claim = {
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "poll",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      marker: "brain_req_1234567890",
      title: null,
      text: null,
      sourceAlias: "e".repeat(64),
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
  const client = new BrainConnectorClient(async () => Response.json({ claim }));
  assert.deepEqual(
    await client.claim({
      connectorId: "d".repeat(24),
      token: "b".repeat(64),
      protocolVersion: 1,
      pairedAt: 1,
    }),
    claim,
  );
});
