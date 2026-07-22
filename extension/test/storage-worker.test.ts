import assert from "node:assert/strict";
import test from "node:test";
import type { BrainConnectorClient } from "../src/notebooklm/brain-client.ts";
import { NotebookLmProviderError, type NotebookLmProviderAdapter } from "../src/notebooklm/provider-adapter.ts";
import {
  BINDING_KEY,
  ConnectorStore,
  JOURNAL_KEY,
  type StorageArea,
} from "../src/notebooklm/storage.ts";
import type {
  ConnectorEvent,
  LocalBinding,
  NotebookLmClaim,
} from "../src/notebooklm/types.ts";
import { NotebookLmConnectorWorker } from "../src/notebooklm/worker.ts";

const NOTEBOOK_ID = "f66923f0-1df4-4ffe-9822-3ed63c558b1c";
const TARGET_FINGERPRINT = "a".repeat(64);
const SUBJECT_FINGERPRINT = "b".repeat(64);

class MemoryStorage implements StorageArea {
  readonly values: Record<string, unknown> = {};
  readonly trace: string[] = [];

  async get(keys: string | string[]): Promise<Record<string, unknown>> {
    const selected = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(selected.map((key) => [key, this.values[key]]));
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, structuredClone(items));
    if (JOURNAL_KEY in items) {
      const entries = items[JOURNAL_KEY] as Record<string, { phase?: string }>;
      if (Object.values(entries).some((entry) => entry.phase === "possibly_delivered")) {
        this.trace.push("journal:possibly_delivered");
      }
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) delete this.values[key];
  }
}

function binding(): LocalBinding {
  return {
    connectorId: "3".repeat(24),
    bindingVersion: 1,
    notebookId: NOTEBOOK_ID,
    authUser: null,
    targetUrl: `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}`,
    localBindingFingerprint: TARGET_FINGERPRINT,
    subjectFingerprint: SUBJECT_FINGERPRINT,
    safeLabel: "Private notebook",
    sourceLimit: 50,
    reserveCount: 5,
    verifiedAt: 1,
  };
}

function claim(): NotebookLmClaim {
  return {
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "create",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: TARGET_FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      marker: "brain_req_1234567890",
      title: "Approved title",
      text: "Approved content",
      sourceAlias: null,
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
}

function inspection() {
  return {
    session: { csrfToken: "ephemeral", sessionId: "ephemeral", authUser: null },
    inspection: {
      notebookId: NOTEBOOK_ID,
      safeLabel: "Private notebook",
      subjectFingerprint: SUBJECT_FINGERPRINT,
      sharingPosture: "private" as const,
      sourceCount: 0,
      sources: [],
    },
  };
}

test("possibly-delivered journal contains no content and is idempotent", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  const first = await store.markPossiblyDelivered({
    requestId: "1".repeat(24),
    targetFingerprint: TARGET_FINGERPRINT,
    marker: "brain_req_1234567890",
    now: 10,
  });
  const second = await store.markPossiblyDelivered({
    requestId: "1".repeat(24),
    targetFingerprint: TARGET_FINGERPRINT,
    marker: "different_marker_1234",
    now: 20,
  });
  assert.deepEqual(second, first);
  const serialized = JSON.stringify(area.values[JOURNAL_KEY]);
  assert.ok(!serialized.includes("content"));
  assert.ok(!serialized.includes("csrf"));
  assert.ok(!serialized.includes(NOTEBOOK_ID));
});

test("legacy default-account bindings normalize without changing their target proof", async () => {
  const area = new MemoryStorage();
  const { authUser, ...legacy } = binding();
  assert.equal(authUser, null);
  area.values[BINDING_KEY] = legacy;
  const restored = await new ConnectorStore(area).getBinding();
  assert.equal(restored?.authUser, null);
  assert.equal(restored?.localBindingFingerprint, TARGET_FINGERPRINT);
});

test("worker journals before dispatch and never blindly retries a possibly-delivered create", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 1,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  const events: ConnectorEvent[] = [];
  const fakeBrain = {
    async claim() {
      return claim();
    },
    async sendEvent(_credential: unknown, _claim: unknown, event: ConnectorEvent) {
      events.push(event);
      area.trace.push(`event:${event.type}`);
    },
  } as unknown as BrainConnectorClient;
  let addCalls = 0;
  let inspectCalls = 0;
  const fakeProvider = {
    async inspectTarget() {
      inspectCalls += 1;
      return inspection();
    },
    async addCopiedText() {
      addCalls += 1;
      area.trace.push("provider:add");
      throw new NotebookLmProviderError("network", "lost response");
    },
  } as unknown as NotebookLmProviderAdapter;
  const worker = new NotebookLmConnectorWorker(store, fakeBrain, fakeProvider, async () => true, () => 1_000);

  assert.equal(await worker.runOnce(), "handled");
  assert.equal(addCalls, 1);
  assert.ok(
    area.trace.indexOf("event:dispatch_started") < area.trace.indexOf("journal:possibly_delivered"),
  );
  assert.ok(area.trace.indexOf("journal:possibly_delivered") < area.trace.indexOf("provider:add"));
  assert.equal(events.at(-1)?.type, "create_uncertain");

  assert.equal(await worker.runOnce(), "handled");
  assert.equal(addCalls, 1, "a journaled create must never call ADD_SOURCE again");
  assert.equal(inspectCalls, 1, "the second create claim must go straight to reconciliation state");
  assert.equal(events.at(-1)?.type, "create_uncertain");
});

test("claim capacity policy must exactly match the locally approved binding", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 1,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  const mismatchedClaim = claim();
  mismatchedClaim.target.sourceLimit = 100;
  const events: ConnectorEvent[] = [];
  const fakeBrain = {
    async claim() {
      return mismatchedClaim;
    },
    async sendEvent(_credential: unknown, _claim: unknown, event: ConnectorEvent) {
      events.push(event);
    },
  } as unknown as BrainConnectorClient;
  let providerReads = 0;
  const fakeProvider = {
    async inspectTarget() {
      providerReads += 1;
      return inspection();
    },
  } as unknown as NotebookLmProviderAdapter;
  const worker = new NotebookLmConnectorWorker(store, fakeBrain, fakeProvider, async () => true, () => 1_000);

  assert.equal(await worker.runOnce(), "attention");
  assert.equal(providerReads, 0);
  assert.deepEqual(events, [{ type: "target_attention", reason: "wrong_target" }]);
});

test("zero-match reconciliation retains the journal past snapshot retention", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 1,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  await store.markPossiblyDelivered({
    requestId: "1".repeat(24),
    targetFingerprint: TARGET_FINGERPRINT,
    marker: "brain_req_1234567890",
    now: 10,
  });
  const reconcileClaim = claim();
  reconcileClaim.action = "reconcile";
  reconcileClaim.source.title = null;
  reconcileClaim.source.text = null;
  reconcileClaim.expiresAt = "1970-01-01T00:00:00.000Z";
  const events: ConnectorEvent[] = [];
  const fakeBrain = {
    async claim() {
      return reconcileClaim;
    },
    async sendEvent(_credential: unknown, _claim: unknown, event: ConnectorEvent) {
      events.push(event);
    },
  } as unknown as BrainConnectorClient;
  const fakeProvider = {
    async inspectTarget() {
      return inspection();
    },
  } as unknown as NotebookLmProviderAdapter;
  const worker = new NotebookLmConnectorWorker(store, fakeBrain, fakeProvider, async () => true, () => 1_000);

  assert.equal(await worker.runOnce(), "handled");
  assert.deepEqual(events, [{ type: "reconcile_result", matches: 0 }]);
  assert.equal((await store.getJournal(reconcileClaim.requestId))?.phase, "possibly_delivered");
});

test("unique failed reconciliation reports the terminal provider status and clears the journal", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 1,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  await store.markPossiblyDelivered({
    requestId: "1".repeat(24),
    targetFingerprint: TARGET_FINGERPRINT,
    marker: "brain_req_1234567890",
    now: 10,
  });
  const reconcileClaim = claim();
  reconcileClaim.action = "reconcile";
  reconcileClaim.source.title = null;
  reconcileClaim.source.text = null;
  const events: ConnectorEvent[] = [];
  const fakeBrain = {
    async claim() {
      return reconcileClaim;
    },
    async sendEvent(_credential: unknown, _claim: unknown, event: ConnectorEvent) {
      events.push(event);
    },
  } as unknown as BrainConnectorClient;
  const inspected = inspection();
  inspected.inspection.sourceCount = 1;
  inspected.inspection.sources = [
    {
      id: "9dff7ca9-8581-4ee9-830b-312041092d67",
      title: `Approved title · ${reconcileClaim.source.marker}`,
      status: "failed",
    },
  ];
  const fakeProvider = {
    async inspectTarget() {
      return inspected;
    },
  } as unknown as NotebookLmProviderAdapter;
  const worker = new NotebookLmConnectorWorker(
    store,
    fakeBrain,
    fakeProvider,
    async () => true,
    () => 1_000,
  );

  assert.equal(await worker.runOnce(), "handled");
  assert.equal(events.length, 1);
  const event = events[0] as Extract<ConnectorEvent, { type: "reconcile_result" }>;
  assert.equal(event.type, "reconcile_result");
  assert.equal(event.matches, 1);
  assert.equal(event.providerStatus, "failed");
  assert.match(event.sourceAlias ?? "", /^[a-f0-9]{64}$/);
  assert.equal(await store.getJournal(reconcileClaim.requestId), null);
});
