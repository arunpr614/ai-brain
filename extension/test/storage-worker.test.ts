import assert from "node:assert/strict";
import test from "node:test";
import type { BrainConnectorClient } from "../src/notebooklm/brain-client.ts";
import { NotebookLmProviderError, type NotebookLmProviderAdapter } from "../src/notebooklm/provider-adapter.ts";
import {
  BINDING_KEY,
  CONNECTOR_CREDENTIAL_KEY,
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
      kind: "copied_text",
      marker: "brain_req_1234567890",
      title: "Approved title",
      text: "Approved content",
      url: null,
      urlHash: null,
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

test("protocol-1 credentials upgrade in place without re-pairing", async () => {
  const area = new MemoryStorage();
  const legacyCredential = {
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 1,
    pairedAt: 123,
  };
  area.values[CONNECTOR_CREDENTIAL_KEY] = legacyCredential;

  const restored = await new ConnectorStore(area).getCredential();

  assert.deepEqual(restored, { ...legacyCredential, protocolVersion: 2 });
  assert.deepEqual(area.values[CONNECTOR_CREDENTIAL_KEY], restored);
});

test("stored bindings accept the configured ceiling and reject out-of-range capacity", async () => {
  const area = new MemoryStorage();
  area.values[BINDING_KEY] = { ...binding(), sourceLimit: 264 };
  assert.equal((await new ConnectorStore(area).getBinding())?.sourceLimit, 264);

  area.values[BINDING_KEY] = { ...binding(), sourceLimit: 265 };
  assert.equal(await new ConnectorStore(area).getBinding(), null);
});

test("worker journals before dispatch and never blindly retries a possibly-delivered create", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 2,
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

test("worker dispatches a YouTube item as the exact URL source", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 2,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  const youtubeUrl = "https://www.youtube.com/watch?v=t0GiTyz4syY";
  const urlClaim = claim();
  urlClaim.source = {
    kind: "url",
    marker: urlClaim.source.marker,
    title: null,
    text: null,
    url: youtubeUrl,
    urlHash: "30dd20d77fc4605cbbb25255ffaa36b86d1213e0e22b1465aa42a7c2c2b4c362",
    sourceAlias: null,
  };
  const events: ConnectorEvent[] = [];
  const fakeBrain = {
    async claim() {
      return urlClaim;
    },
    async sendEvent(_credential: unknown, _claim: unknown, event: ConnectorEvent) {
      events.push(event);
    },
  } as unknown as BrainConnectorClient;
  let copiedTextCalls = 0;
  const addedUrls: string[] = [];
  const fakeProvider = {
    async inspectTarget() {
      return inspection();
    },
    async addCopiedText() {
      copiedTextCalls += 1;
      throw new Error("copied-text dispatch must not run for URL claims");
    },
    async addUrl(_session: unknown, input: { notebookId: string; url: string }) {
      assert.equal(input.notebookId, NOTEBOOK_ID);
      addedUrls.push(input.url);
      return {
        id: "9dff7ca9-8581-4ee9-830b-312041092d67",
        title: "Provider-generated YouTube title",
        url: input.url,
        status: "ready" as const,
      };
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
  assert.deepEqual(addedUrls, [youtubeUrl]);
  assert.equal(copiedTextCalls, 0);
  assert.equal(events.at(-1)?.type, "create_accepted");
  assert.equal(await store.getJournal(urlClaim.requestId), null);
});

test("claim capacity policy must exactly match the locally approved binding", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 2,
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
    protocolVersion: 2,
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
    protocolVersion: 2,
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
      url: null,
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

test("URL reconciliation uses the retained hash after the private URL snapshot is purged", async () => {
  const area = new MemoryStorage();
  const store = new ConnectorStore(area);
  await store.setCredential({
    connectorId: "3".repeat(24),
    token: "c".repeat(64),
    protocolVersion: 2,
    pairedAt: 1,
  });
  await store.setBinding(binding());
  const youtubeUrl = "https://www.youtube.com/watch?v=t0GiTyz4syY";
  const reconcileClaim = claim();
  reconcileClaim.action = "reconcile";
  reconcileClaim.source = {
    kind: "url",
    marker: reconcileClaim.source.marker,
    title: null,
    text: null,
    url: null,
    urlHash: "30dd20d77fc4605cbbb25255ffaa36b86d1213e0e22b1465aa42a7c2c2b4c362",
    sourceAlias: null,
  };
  await store.markPossiblyDelivered({
    requestId: reconcileClaim.requestId,
    targetFingerprint: TARGET_FINGERPRINT,
    marker: reconcileClaim.source.marker,
    now: 10,
  });
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
  inspected.inspection.sourceCount = 2;
  inspected.inspection.sources = [
    {
      id: "9dff7ca9-8581-4ee9-830b-312041092d66",
      title: `Misleading title · ${reconcileClaim.source.marker}`,
      url: "https://www.youtube.com/watch?v=different",
      status: "ready",
    },
    {
      id: "9dff7ca9-8581-4ee9-830b-312041092d67",
      title: "Provider-generated YouTube title",
      url: youtubeUrl,
      status: "ready",
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
  assert.equal(event.providerStatus, "ready");
  assert.equal(await store.getJournal(reconcileClaim.requestId), null);
});
