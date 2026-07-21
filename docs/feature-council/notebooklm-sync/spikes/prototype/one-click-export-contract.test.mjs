import assert from "node:assert/strict";
import test from "node:test";

import {
  FakeNotebookLmAdapter,
  OneClickExportCoordinator,
  prepareOneClickSnapshot,
} from "./one-click-export-contract.mjs";

const MAPPING_KEY = "synthetic-mapping-key-not-a-real-secret";
const TARGET_BINDING_ID = "synthetic-target-binding-v1";

function item(overrides = {}) {
  return {
    // Reuse the URL identity from the shared ten-item synthetic catalog so
    // this focused spike does not expand the global fixture count.
    id: "000000000000000000000002",
    title: "A useful saved article",
    body: "The exact text captured by AI Brain.",
    sourceUrl: "https://example.com/article",
    author: "Synthetic Author",
    publishedAt: "2026-07-20",
    captureQuality: "full_text",
    summary: "Generated summary that is private by default.",
    quotes: ["A private highlight"],
    attachedNote: "A private note",
    brainId: "brain-secret-id",
    thumbnailUrl: "https://signed.example/private?token=do-not-export",
    ...overrides,
  };
}

function coordinator(overrides = {}) {
  let tick = 1_000;
  return new OneClickExportCoordinator({
    targetBinding: {
      bindingId: overrides.bindingId ?? TARGET_BINDING_ID,
      notebookId: overrides.notebookId ?? "remote-notebook-private-id",
      enabled: true,
    },
    mappingKey: MAPPING_KEY,
    now: () => tick++,
  });
}

function enqueue(service, overrides = {}) {
  return service.enqueue({
    item: item(overrides.item),
    idempotencyKey: overrides.idempotencyKey ?? "click_abcdefghijklmnop",
    confirmLimitedCapture: overrides.confirmLimitedCapture ?? false,
  });
}

test("builds a deterministic copied-text snapshot without private AI Brain fields", () => {
  const first = prepareOneClickSnapshot(item(), {
    mappingKey: MAPPING_KEY,
    targetBindingId: TARGET_BINDING_ID,
  });
  const second = prepareOneClickSnapshot(item(), {
    mappingKey: MAPPING_KEY,
    targetBindingId: TARGET_BINDING_ID,
  });

  assert.equal(first.eligible, true);
  assert.equal(first.payloadHash, second.payloadHash);
  assert.equal(first.marker, second.marker);
  assert.match(first.providerTitle, /\[abx1_[A-Za-z0-9_-]{27}\]$/);
  assert.match(first.providerContent, /The exact text captured by AI Brain\./);

  for (const forbidden of [
    "000000000000000000000002",
    "brain-secret-id",
    "Generated summary",
    "private highlight",
    "private note",
    "signed.example",
    "do-not-export",
  ]) {
    assert.equal(first.providerContent.includes(forbidden), false, forbidden);
    assert.equal(first.providerTitle.includes(forbidden), false, forbidden);
  }
});

test("drops non-public or credential-bearing source URLs", () => {
  for (const sourceUrl of [
    "http://localhost/private",
    "http://10.0.0.7/private",
    "https://user:password@example.com/private",
    "https://example.com/article?token=secret",
  ]) {
    const snapshot = prepareOneClickSnapshot(item({ sourceUrl }), {
      mappingKey: MAPPING_KEY,
      targetBindingId: TARGET_BINDING_ID,
    });
    assert.equal(snapshot.providerContent.includes("Public source:"), false, sourceUrl);
  }
});

test("requires explicit confirmation for weak captures and rejects empty content", async () => {
  for (const captureQuality of ["metadata_only", "paywall_preview", "failed"]) {
    assert.equal(
      prepareOneClickSnapshot(item({ captureQuality }), {
        mappingKey: MAPPING_KEY,
        targetBindingId: TARGET_BINDING_ID,
      }).reason,
      "confirmation_required_for_weak_capture",
    );
  }
  assert.equal(
    prepareOneClickSnapshot(item({ body: "  " }), {
      mappingKey: MAPPING_KEY,
      targetBindingId: TARGET_BINDING_ID,
    }).reason,
    "text_unavailable",
  );
  const service = coordinator();
  const confirmed = enqueue(service, {
    item: { captureQuality: "metadata_only" },
    idempotencyKey: "click_confirm_abcdefgh",
    confirmLimitedCapture: true,
  });
  assert.equal(confirmed.state, "queued");
  const adapter = new FakeNotebookLmAdapter();
  await service.process(confirmed.requestId, adapter);
  assert.match(adapter.sources[0].content, /The exact text captured by AI Brain\./);
});

test("resolves the exact notebook server-side and never accepts a browser notebook id", async () => {
  const service = coordinator();
  const queued = service.enqueue({
    item: item(),
    targetAlias: "attacker-controlled-alias",
    idempotencyKey: "click_exacttarget_1234",
    notebookId: "attacker-controlled-id",
  });
  const adapter = new FakeNotebookLmAdapter();

  const result = await service.process(queued.requestId, adapter);

  assert.equal(result.state, "succeeded");
  assert.equal(adapter.sources[0].notebookId, "remote-notebook-private-id");

  const reboundService = coordinator({ bindingId: "synthetic-target-binding-v2" });
  const rebound = enqueue(reboundService, { idempotencyKey: "click_rebound_abcdefgh" });
  const reboundAdapter = new FakeNotebookLmAdapter();
  await reboundService.process(rebound.requestId, reboundAdapter);
  assert.notEqual(reboundAdapter.sources[0].title, adapter.sources[0].title);
});

test("coalesces a double-click before any provider write", async () => {
  const service = coordinator();
  const first = enqueue(service);
  const second = enqueue(service);
  const adapter = new FakeNotebookLmAdapter();

  assert.equal(second.requestId, first.requestId);
  assert.equal(second.deduplicated, true);
  await service.process(first.requestId, adapter);
  await service.process(second.requestId, adapter);
  assert.equal(adapter.writeCalls, 1);
});

test("coalesces a later click for unchanged item content", () => {
  const service = coordinator();
  const first = enqueue(service, { idempotencyKey: "click_first_abcdefgh" });
  const second = enqueue(service, { idempotencyKey: "click_second_abcdefg" });

  assert.equal(second.requestId, first.requestId);
  assert.equal(second.deduplicated, true);
});

test("creates a new export version after item content changes", () => {
  const service = coordinator();
  const first = enqueue(service, { idempotencyKey: "click_first_abcdefgh" });
  const second = enqueue(service, {
    idempotencyKey: "click_changed_abcdef",
    item: { body: "Updated exact text." },
  });

  assert.notEqual(second.requestId, first.requestId);
  assert.equal(second.deduplicated, false);
});

test("does not claim success until NotebookLM reports the source ready", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter({ mode: "processing" });

  const initial = await service.process(queued.requestId, adapter);
  assert.equal(initial.state, "processing");
  adapter.getFault = "authentication";
  const attention = await service.process(queued.requestId, adapter);
  assert.equal(attention.state, "authentication_attention");
  assert.equal(attention.action, "reconnect");
  service.resumeAfterAuthentication(queued.requestId);
  adapter.getFault = null;
  adapter.markReady(adapter.sources[0].id);
  const ready = await service.process(queued.requestId, adapter);
  assert.equal(ready.state, "succeeded");
});

test("reconciles an accepted-but-response-lost write without creating a duplicate", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter({ mode: "accepted_response_lost" });

  const uncertain = await service.process(queued.requestId, adapter);
  assert.equal(uncertain.state, "reconciling");
  assert.equal(adapter.writeCalls, 1);

  adapter.listFault = "network_with_sensitive_provider_text";
  const readUnavailable = await service.process(queued.requestId, adapter);
  assert.equal(readUnavailable.state, "reconciling");
  assert.equal(JSON.stringify(readUnavailable).includes("sensitive_provider_text"), false);
  assert.equal(adapter.writeCalls, 1);
  adapter.listFault = null;
  const recovered = await service.process(queued.requestId, adapter);
  assert.equal(recovered.state, "succeeded");
  assert.equal(adapter.writeCalls, 1);
  assert.equal(adapter.sources.length, 1);
});

test("keeps an inconclusive lost response unresolved instead of blindly retrying", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter({ mode: "accepted_response_lost" });

  await service.process(queued.requestId, adapter);
  adapter.sources.length = 0;
  const unresolved = await service.process(queued.requestId, adapter);

  assert.equal(unresolved.state, "reconciling");
  assert.equal(unresolved.action, "checking_result");
  assert.equal(adapter.writeCalls, 1);
});

test("fails closed when more than one remote source carries the marker", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter({ mode: "accepted_response_lost" });

  await service.process(queued.requestId, adapter);
  adapter.sources.push({ ...adapter.sources[0], id: "source-duplicate" });
  const conflict = await service.process(queued.requestId, adapter);

  assert.equal(conflict.state, "conflict");
  assert.equal(adapter.writeCalls, 1);
});

test("surfaces expired authentication as a reconnect action without leaking provider data", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter({ mode: "authentication_before_send" });

  const result = await service.process(queued.requestId, adapter);

  assert.deepEqual(Object.keys(result).sort(), [
    "action",
    "deduplicated",
    "observedAt",
    "requestId",
    "state",
  ]);
  assert.equal(result.state, "authentication_attention");
  assert.equal(result.action, "reconnect");

  const repeated = enqueue(service, { idempotencyKey: "click_authrepeat_abcd" });
  assert.equal(repeated.requestId, queued.requestId);
  service.resumeAfterAuthentication(queued.requestId);
  adapter.mode = "success";
  const recoveredBeforeSend = await service.process(queued.requestId, adapter);
  assert.equal(recoveredBeforeSend.state, "succeeded");
  assert.equal(adapter.sources.length, 1);

  const uncertainService = coordinator();
  const uncertainQueued = enqueue(uncertainService, {
    idempotencyKey: "click_authunknown_abcd",
  });
  const uncertainAdapter = new FakeNotebookLmAdapter({ mode: "authentication_unknown_outcome" });
  const uncertainAttention = await uncertainService.process(
    uncertainQueued.requestId,
    uncertainAdapter,
  );
  assert.equal(uncertainAttention.state, "authentication_attention");
  assert.equal(uncertainAdapter.writeCalls, 1);
  uncertainService.resumeAfterAuthentication(uncertainQueued.requestId);
  const reconciled = await uncertainService.process(uncertainQueued.requestId, uncertainAdapter);
  assert.equal(reconciled.state, "succeeded");
  assert.equal(uncertainAdapter.writeCalls, 1);
  assert.equal(uncertainAdapter.sources.length, 1);
});

test("public status and event logs exclude notebook ids, source ids, titles, bodies, URLs, and tokens", async () => {
  const service = coordinator();
  const queued = enqueue(service);
  const adapter = new FakeNotebookLmAdapter();
  const result = await service.process(queued.requestId, adapter);
  const exposed = JSON.stringify({ result, events: service.events });

  for (const forbidden of [
    "remote-notebook-private-id",
    "synthetic-target-binding-v1",
    "source-1",
    "A useful saved article",
    "The exact text",
    "https://example.com",
    "synthetic-mapping-key",
  ]) {
    assert.equal(exposed.includes(forbidden), false, forbidden);
  }
});
