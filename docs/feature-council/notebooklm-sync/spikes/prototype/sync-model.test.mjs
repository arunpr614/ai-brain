import assert from "node:assert/strict";
import test from "node:test";

import {
  FakeProvider,
  SimulatedCrashError,
  SyncEngine,
  acquireLease,
  appendOutboxItem,
  assertCurrentLease,
  createSyncState,
  deriveItemMarker,
  deriveSourceMarker,
  durableSnapshot,
  evaluateSyntheticAuth,
  mapSyntheticItem,
  modelCapacity,
  normalizeProviderError,
  projectSafeStatus,
  recoverInterruptedWrites,
  sanitizePublicUrl,
  sha256,
} from "./sync-model.mjs";
import { SYNTHETIC_CONNECTION_KEY, SYNTHETIC_ITEMS, SYNTHETIC_TARGET } from "./synthetic-fixtures.mjs";

function makeHarness({ path = "enterprise", items = [SYNTHETIC_ITEMS[0]] } = {}) {
  const state = createSyncState();
  for (const [index, item] of items.entries()) appendOutboxItem(state, item, 1_000 + index);
  const provider = new FakeProvider();
  const engine = new SyncEngine({
    state,
    provider,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: SYNTHETIC_TARGET,
    strategy: path === "drive" ? "rolling_doc" : "daily_digest",
    path,
  });
  return { state, provider, engine };
}

function rows(state) {
  return Object.values(state.syncItems).sort((a, b) => a.outboxSequence - b.outboxSequence);
}

test("fixture catalog remains within the global ten-item limit", () => {
  assert.equal(SYNTHETIC_ITEMS.length, 10);
  assert.ok(SYNTHETIC_ITEMS.length <= 10);
  assert.equal(new Set(SYNTHETIC_ITEMS.map((item) => item.id)).size, SYNTHETIC_ITEMS.length);
});

test("mapper covers reachable, policy-blocked, and schema-only items without leaking correlators", () => {
  const mapped = SYNTHETIC_ITEMS.map((item) =>
    mapSyntheticItem(item, {
      connectionKey: SYNTHETIC_CONNECTION_KEY,
      targetAlias: SYNTHETIC_TARGET,
      strategy: "daily_digest",
      path: "enterprise",
    }),
  );
  assert.deepEqual(
    mapped.map((entry) => entry.state),
    [
      "prepared",
      "prepared",
      "prepared",
      "prepared",
      "prepared",
      "blocked_policy",
      "unsupported",
      "unsupported",
      "unsupported",
      "unsupported",
    ],
  );
  for (let index = 0; index < 5; index += 1) {
    const entry = mapped[index];
    const item = SYNTHETIC_ITEMS[index];
    assert.ok(entry.payload.includes(entry.operationKey));
    assert.ok(!entry.payload.includes(item.id));
    assert.ok(!entry.payload.includes(entry.desiredHash));
    assert.ok(!entry.payload.includes("synthetic-local-hmac-key"));
    assert.ok(!entry.payload.includes("captureSource"));
  }
  assert.equal(mapped[1].canonicalEntry.publicUrl, null);
  assert.ok(!mapped[1].payload.includes("TOPSECRET"));
  assert.ok(!mapped[1].payload.includes("signature="));
  assert.ok(!mapped[1].payload.includes("utm_source"));
  assert.ok(mapped[2].payload.includes("https://www.youtube.com/watch?v=AbCdEfGhI12"));
  assert.ok(!mapped[2].payload.includes("SECRET"));
  assert.ok(!mapped[3].payload.toLowerCase().includes("telegram"));
  assert.ok(mapped[4].payload.includes("Synthetic verified Recall content only."));
  assert.ok(!mapped[4].payload.includes("Recall card id:"));
  assert.ok(!mapped[4].payload.includes("rc-private-42"));
  assert.ok(!mapped[4].payload.includes("signature"));
  assert.equal(mapped[5].reason, "insufficient_fidelity");
  assert.equal(mapped[6].reason, "legacy_unmapped_type");
  assert.equal(mapped[7].reason, "schema_only_or_unreachable_type");
  assert.equal(mapped[8].reason, "schema_only_or_unreachable_type");
  assert.equal(mapped[9].reason, "schema_only_or_unreachable_type");

  const sensitiveVariant = mapSyntheticItem(
    { ...SYNTHETIC_ITEMS[0], syncEligible: false, sensitive: true },
    {
      connectionKey: SYNTHETIC_CONNECTION_KEY,
      targetAlias: SYNTHETIC_TARGET,
      strategy: "daily_digest",
      path: "enterprise",
    },
  );
  assert.equal(sensitiveVariant.state, "blocked_policy");
  assert.equal(sensitiveVariant.payload, null);
});

test("mapper contains malformed text and URL-host poisons without leaking or throwing", () => {
  const malformed = mapSyntheticItem(
    { ...SYNTHETIC_ITEMS[0], body: null },
    {
      connectionKey: SYNTHETIC_CONNECTION_KEY,
      targetAlias: SYNTHETIC_TARGET,
      strategy: "daily_digest",
      path: "enterprise",
    },
  );
  assert.equal(malformed.state, "unsupported");
  assert.equal(malformed.reason, "text_unavailable");
  assert.equal(malformed.payload, null);
  const malformedRecall = mapSyntheticItem(
    { ...SYNTHETIC_ITEMS[4], body: "Imported from Recall\nRecall card id: still-private" },
    {
      connectionKey: SYNTHETIC_CONNECTION_KEY,
      targetAlias: SYNTHETIC_TARGET,
      strategy: "daily_digest",
      path: "enterprise",
    },
  );
  assert.equal(malformedRecall.state, "unsupported");
  assert.equal(malformedRecall.reason, "recall_provenance_malformed");
  assert.equal(malformedRecall.payload, null);
  for (const prefix of ["\n  ", "\uFEFF"]) {
    const prefixedRecall = mapSyntheticItem(
      { ...SYNTHETIC_ITEMS[4], body: `${prefix}${SYNTHETIC_ITEMS[4].body}` },
      {
        connectionKey: SYNTHETIC_CONNECTION_KEY,
        targetAlias: SYNTHETIC_TARGET,
        strategy: "daily_digest",
        path: "enterprise",
      },
    );
    assert.equal(prefixedRecall.state, "prepared");
    assert.ok(prefixedRecall.payload.includes("Synthetic verified Recall content only."));
    assert.ok(!prefixedRecall.payload.includes("Recall card id:"));
    assert.ok(!prefixedRecall.payload.includes("rc-private-42"));
    assert.ok(!prefixedRecall.payload.includes("signature=fake"));
  }
  assert.equal(sanitizePublicUrl("https://notyoutube.com/watch?v=AbCdEfGhI12"), null);
  assert.equal(sanitizePublicUrl("https://[fd00::1]/internal"), null);
  assert.equal(sanitizePublicUrl("https://127.0.0.1/internal"), null);
  assert.equal(sanitizePublicUrl("https://localhost./internal"), null);
  assert.equal(sanitizePublicUrl("https://localhost../internal"), null);
  assert.equal(sanitizePublicUrl("https://foo.local./internal"), null);
  assert.equal(sanitizePublicUrl("https://svc.internal./internal"), null);
});

test("HMAC markers match fixed vectors and never expose raw IDs or hashes", () => {
  const contentHash = sha256("fixture-01");
  assert.equal(contentHash, "15c490f5cc213d5975926f647a4655f22c102fc31b44901554dc12605eb3f501");
  const marker = deriveItemMarker({
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    itemId: "000000000000000000000001",
    contentHash,
  });
  assert.equal(marker, "ab1_E3oJJeXbX1CGwnEo4Nem7tzKcF-1YBlski4PzPOmBtg");
  assert.ok(!marker.includes("000000000000000000000001"));
  assert.ok(!marker.includes(contentHash));
  const mutated = deriveItemMarker({
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    itemId: "000000000000000000000001",
    contentHash: "65fc8436f5633eca18ea1d4afbf4a5d532d3093fb9d1c98227b5af25c2823bc3",
  });
  assert.equal(mutated, "ab1_fRUlKd-q7kLPrGaOyidCuCSQn0_NSgj98tDeGyPQezk");
  const sourceMarker = deriveSourceMarker({
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: "test-target",
    strategy: "daily",
    period: "2026-07-21",
    orderedItemMarkers: [marker, mutated],
  });
  assert.match(sourceMarker, /^ab1b_[A-Za-z0-9_-]{43}$/);
  assert.equal(sourceMarker, "ab1b_Es8tZFHLQBihRw8o4UaCTX5fEVVbF3wkTqGJAVWb0Tw");
  assert.equal(
    sourceMarker,
    deriveSourceMarker({
      connectionKey: SYNTHETIC_CONNECTION_KEY,
      targetAlias: "test-target",
      strategy: "daily",
      period: "2026-07-21",
      orderedItemMarkers: [marker, mutated],
    }),
  );
});

test("monotonic outbox handles equal captured timestamps and delayed old captures", () => {
  const { state, engine } = makeHarness({ items: [SYNTHETIC_ITEMS[0], SYNTHETIC_ITEMS[1], SYNTHETIC_ITEMS[3]] });
  assert.equal(SYNTHETIC_ITEMS[0].capturedAt, SYNTHETIC_ITEMS[1].capturedAt);
  assert.ok(SYNTHETIC_ITEMS[3].capturedAt < SYNTHETIC_ITEMS[0].capturedAt);
  assert.equal(engine.discover(), 3);
  assert.equal(state.discoveryCursors[SYNTHETIC_TARGET], 3);
  assert.deepEqual(rows(state).map((row) => row.outboxSequence), [1, 2, 3]);
  assert.deepEqual(rows(state).map((row) => row.itemId), [
    "000000000000000000000001",
    "000000000000000000000002",
    "000000000000000000000004",
  ]);
  assert.equal(engine.discover(), 0);
});

test("each target owns an independent discovery cursor", () => {
  const state = createSyncState();
  appendOutboxItem(state, SYNTHETIC_ITEMS[0], 1_000);
  const first = new SyncEngine({
    state,
    provider: new FakeProvider(),
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: "target-a",
    strategy: "daily_digest",
  });
  const second = new SyncEngine({
    state,
    provider: new FakeProvider(),
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: "target-b",
    strategy: "daily_digest",
  });
  assert.equal(first.discover(), 1);
  assert.equal(second.discover(), 1);
  assert.equal(state.discoveryCursors["target-a"], 1);
  assert.equal(state.discoveryCursors["target-b"], 1);
});

test("exact rerun creates one provider object", () => {
  const { state, provider, engine } = makeHarness();
  assert.equal(projectSafeStatus(state, SYNTHETIC_TARGET, "enterprise").terminalLabel, null);
  assert.equal(engine.run({ trigger: "manual", owner: "worker-a", now: 10_000 }).state, "done");
  assert.equal(engine.run({ trigger: "daily", owner: "worker-b", now: 20_000 }).state, "done");
  assert.equal(provider.sources.length, 1);
  assert.equal(provider.calls.filter((call) => call.method === "create").length, 1);
  assert.equal(rows(state)[0].state, "synced");
  assert.equal(state.targetStatus[SYNTHETIC_TARGET].lastSuccessfulSyncAt, 20_000);
});

test("accepted create with lost response reconciles to one source before retry", () => {
  const { state, provider, engine } = makeHarness();
  engine.discover();
  provider.setOutcomes(rows(state)[0].operationKey, ["accept_then_timeout"]);
  assert.equal(engine.run({ trigger: "manual", owner: "worker-a", now: 10_000 }).state, "partial_failure");
  assert.equal(rows(state)[0].state, "needs_reconcile");
  assert.equal(provider.sources.length, 1);
  assert.equal(engine.run({ trigger: "daily", owner: "worker-b", now: 20_000 }).state, "done");
  assert.equal(rows(state)[0].state, "synced");
  assert.equal(provider.sources.length, 1);
  assert.equal(provider.calls.filter((call) => call.method === "create").length, 1);
});

test("crash before provider call does not treat an unconstrained zero as proof for retry", () => {
  const first = makeHarness();
  first.engine.discover();
  const operationKey = rows(first.state)[0].operationKey;
  assert.throws(
    () => first.engine.run({ trigger: "manual", owner: "worker-a", now: 10_000, crashPoint: "before_call", crashOperationKey: operationKey }),
    SimulatedCrashError,
  );
  assert.equal(first.provider.sources.length, 0);
  const recoveredState = durableSnapshot(first.state);
  assert.equal(recoverInterruptedWrites(recoveredState), 1);
  const recovered = new SyncEngine({
    state: recoveredState,
    provider: first.provider,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: SYNTHETIC_TARGET,
    strategy: "daily_digest",
  });
  assert.equal(recovered.run({ trigger: "daily", owner: "worker-b", now: 20_000 }).state, "partial_failure");
  assert.equal(rows(recoveredState)[0].state, "manual_reconcile");
  assert.equal(recovered.run({ trigger: "daily", owner: "worker-b", now: 22_000 }).state, "partial_failure");
  assert.equal(first.provider.sources.length, 0);
  assert.equal(first.provider.calls.filter((call) => call.method === "create").length, 0);
});

test("crash after provider response and before local commit reconciles without duplication", () => {
  const first = makeHarness();
  first.engine.discover();
  const operationKey = rows(first.state)[0].operationKey;
  assert.throws(
    () =>
      first.engine.run({
        trigger: "manual",
        owner: "worker-a",
        now: 10_000,
        crashPoint: "after_response_before_commit",
        crashOperationKey: operationKey,
      }),
    SimulatedCrashError,
  );
  assert.equal(first.provider.sources.length, 1);
  const recoveredState = durableSnapshot(first.state);
  recoverInterruptedWrites(recoveredState);
  const recovered = new SyncEngine({
    state: recoveredState,
    provider: first.provider,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: SYNTHETIC_TARGET,
    strategy: "daily_digest",
  });
  assert.equal(recovered.run({ trigger: "daily", owner: "worker-b", now: 20_000 }).state, "done");
  assert.equal(first.provider.sources.length, 1);
  assert.equal(first.provider.calls.filter((call) => call.method === "create").length, 1);
});

test("one permanent poison item does not prevent a newer healthy item", () => {
  const { state, provider, engine } = makeHarness({ items: [SYNTHETIC_ITEMS[0], SYNTHETIC_ITEMS[1]] });
  engine.discover();
  provider.setOutcomes(rows(state)[0].operationKey, ["permanent_error"]);
  const result = engine.run({ trigger: "daily", owner: "worker-a", now: 10_000 });
  assert.equal(result.state, "partial_failure");
  assert.equal(rows(state)[0].state, "permanent_failure");
  assert.equal(rows(state)[1].state, "synced");
  assert.equal(provider.sources.length, 1);
  assert.equal(state.targetStatus[SYNTHETIC_TARGET], undefined);
  assert.equal(state.discoveryCursors[SYNTHETIC_TARGET], 2);
});

test("manual and daily triggers coalesce, and stale workers cannot commit", () => {
  const state = createSyncState();
  const manualLease = acquireLease(state, { targetAlias: SYNTHETIC_TARGET, owner: "manual-worker", now: 1_000, ttlMs: 100 });
  assert.ok(manualLease);
  const provider = new FakeProvider();
  const engine = new SyncEngine({
    state,
    provider,
    connectionKey: SYNTHETIC_CONNECTION_KEY,
    targetAlias: SYNTHETIC_TARGET,
    strategy: "daily_digest",
  });
  assert.equal(engine.run({ trigger: "daily", owner: "daily-worker", now: 1_050 }).state, "coalesced");
  const replacement = acquireLease(state, { targetAlias: SYNTHETIC_TARGET, owner: "daily-worker", now: 1_101, ttlMs: 100 });
  assert.ok(replacement);
  assert.equal(replacement.fence, manualLease.fence + 1);
  assert.throws(() => assertCurrentLease(state, manualLease, 1_101), /stale_fence/);
  assert.doesNotThrow(() => assertCurrentLease(state, replacement, 1_101));
});

test("the in-memory scaffold also rejects retry limits above two", () => {
  assert.throws(
    () =>
      new SyncEngine({
        state: createSyncState(),
        provider: new FakeProvider(),
        connectionKey: SYNTHETIC_CONNECTION_KEY,
        targetAlias: SYNTHETIC_TARGET,
        strategy: "daily_digest",
        maxRetries: 3,
      }),
    /invalid_retry_limit/,
  );
});

test("fencing is rechecked after provider acceptance and stale response cannot bind", () => {
  const { state, provider, engine } = makeHarness();
  engine.discover();
  provider.setCreateHook(() => {
    acquireLease(state, { targetAlias: SYNTHETIC_TARGET, owner: "takeover", now: 50_000, ttlMs: 30_000 });
    provider.setCreateHook(null);
  });
  assert.throws(() => engine.run({ trigger: "manual", owner: "stale-worker", now: 10_000 }), /stale_fence/);
  assert.equal(rows(state)[0].state, "creating");
  assert.equal(provider.sources.length, 1);
  recoverInterruptedWrites(state);
  delete state.leases[SYNTHETIC_TARGET];
  assert.equal(engine.run({ trigger: "daily", owner: "fresh-worker", now: 60_000 }).state, "done");
  assert.equal(provider.sources.length, 1);
  assert.equal(rows(state)[0].state, "synced");
});

test("pending Enterprise source is not success until COMPLETE", () => {
  const { state, provider, engine } = makeHarness();
  engine.discover();
  provider.setOutcomes(rows(state)[0].operationKey, ["pending"]);
  assert.equal(engine.run({ trigger: "manual", owner: "worker-a", now: 10_000 }).state, "partial_failure");
  assert.equal(rows(state)[0].state, "processing");
  assert.equal(state.targetStatus[SYNTHETIC_TARGET], undefined);
  provider.setStatus(rows(state)[0].sourceId, "COMPLETE");
  assert.equal(engine.run({ trigger: "daily", owner: "worker-b", now: 20_000 }).state, "done");
  assert.equal(rows(state)[0].state, "synced");
  assert.equal(state.targetStatus[SYNTHETIC_TARGET].lastSuccessfulSyncAt, 20_000);
});

test("Drive lane never claims NotebookLM synchronization", () => {
  const { state, engine } = makeHarness({ path: "drive" });
  assert.equal(projectSafeStatus(state, SYNTHETIC_TARGET, "drive").terminalLabel, null);
  assert.equal(engine.run({ trigger: "manual", owner: "worker-a", now: 10_000 }).state, "done");
  assert.equal(rows(state)[0].state, "drive_updated_unverified");
  assert.equal(state.targetStatus[SYNTHETIC_TARGET].lastValidatedRunAt, 10_000);
  assert.equal(state.targetStatus[SYNTHETIC_TARGET].lastSuccessfulSyncAt, null);
  const projected = projectSafeStatus(state, SYNTHETIC_TARGET, "drive");
  assert.equal(projected.lastSuccessfulSyncAt, null);
  assert.equal(projected.terminalLabel, "Drive document updated — NotebookLM refresh unverified");
});

test("synthetic authorization state machine fails closed without echoing credential data", () => {
  const base = {
    credential: { state: "valid", fakeToken: "fake-token-must-not-echo" },
    refreshOutcome: null,
    subjectAlias: "subject-a",
    expectedSubjectAlias: "subject-a",
    requiredScopes: ["drive.file"],
    grantedScopes: ["drive.file"],
    licenseOk: true,
    targetPermissionOk: true,
    driveAccessOk: true,
    aclDigest: "acl-a",
    expectedAclDigest: "acl-a",
  };
  const cases = [
    [{ ...base, credential: { state: "missing" } }, "reauth_required", "missing_authorization"],
    [{ ...base, credential: { state: "expired" }, refreshOutcome: "valid" }, "authorized", "ok"],
    [{ ...base, credential: { state: "expired" }, refreshOutcome: "invalid_grant" }, "reauth_required", "invalid_grant"],
    [{ ...base, credential: { state: "revoked" } }, "reauth_required", "invalid_grant"],
    [{ ...base, subjectAlias: "subject-b" }, "blocked_identity", "subject_mismatch"],
    [{ ...base, grantedScopes: [] }, "blocked_permission", "insufficient_scope"],
    [{ ...base, licenseOk: false }, "blocked_permission", "license_required"],
    [{ ...base, targetPermissionOk: false }, "blocked_permission", "target_permission_required"],
    [{ ...base, driveAccessOk: false }, "blocked_permission", "drive_access_required"],
    [{ ...base, aclDigest: "acl-b" }, "blocked_identity", "acl_changed"],
  ];
  for (const [input, state, reason] of cases) {
    const result = evaluateSyntheticAuth(input);
    assert.equal(result.state, state);
    assert.equal(result.reason, reason);
    assert.ok(!JSON.stringify(result).includes("fake-token-must-not-echo"));
    assert.ok(!Object.hasOwn(result, "credential"));
  }
});

test("provider errors are normalized without raw message content", () => {
  const raw = { status: 429, message: "Bearer fake-secret and private title" };
  const normalized = normalizeProviderError(raw);
  assert.deepEqual(normalized, { code: "rate_limited", retryable: true });
  assert.ok(!JSON.stringify(normalized).includes("fake-secret"));
  assert.deepEqual(normalizeProviderError({ status: 503 }), { code: "provider_unavailable", retryable: true });
  assert.deepEqual(normalizeProviderError({ status: 403 }), { code: "permission_or_license", retryable: false });
});

test("capacity model applies occupancy, headroom, character limit, and bounded aggregation", () => {
  const result = modelCapacity({
    lane: "drive",
    itemsPerDay: 10,
    days: 365,
    averageWordsPerItem: 250,
    averageCharactersPerItem: 1_500,
    wordLimit: 500_000,
    charLimit: 1_020_000,
    headroomRatio: 0.9,
    sourceLimit: 300,
    existingSources: 10,
    pendingDeletionSources: 2,
    reservedHeadroom: 20,
  });
  assert.equal(result.usableSources, 268);
  assert.equal(result.rollingFullDays, 61);
  assert.equal(result.bindingLimit, "characters");
  assert.deepEqual(result.sources, {
    perItem: 3_650,
    daily: 365,
    weekly: 53,
    rollingRetained: 6,
    rollingActive: 1,
  });
  assert.equal(result.exceeds.perItem, true);
  assert.equal(result.exceeds.daily, true);
  assert.equal(result.exceeds.weekly, false);
  assert.equal(result.exceeds.rollingRetained, false);
  assert.equal(result.manualRotations, 5);
});

test("large Drive aggregates shard daily and weekly instead of exceeding a document", () => {
  const result = modelCapacity({
    lane: "drive",
    itemsPerDay: 100,
    days: 365,
    averageWordsPerItem: 2_500,
    averageCharactersPerItem: 15_000,
    wordLimit: 500_000,
    charLimit: 1_020_000,
    headroomRatio: 0.8,
    sourceLimit: 600,
    existingSources: 0,
    pendingDeletionSources: 0,
    reservedHeadroom: 0,
  });
  assert.equal(result.maxItemsPerSource, 54);
  assert.equal(result.rollingFullDays, 0);
  assert.equal(result.dailyShards, 2);
  assert.equal(result.sources.daily, 730);
  assert.equal(result.sources.weekly, 678);
  assert.equal(result.sources.rollingRetained, 676);
  assert.equal(result.exceeds.daily, true);
  assert.equal(result.exceeds.weekly, true);
  assert.equal(result.exceeds.rollingRetained, true);
});

test("source budget subtracts occupancy, pending deletion, and reserved headroom", () => {
  const boundaries = [
    [50, 12, 1, 5, 32],
    [300, 30, 5, 30, 235],
    [600, 599, 1, 1, 0],
  ];
  for (const [sourceLimit, existingSources, pendingDeletionSources, reservedHeadroom, expected] of boundaries) {
    const result = modelCapacity({
      lane: "enterprise",
      itemsPerDay: 10,
      days: 30,
      averageWordsPerItem: 1_000,
      averageCharactersPerItem: 6_000,
      wordLimit: 500_000,
      charLimit: 1_020_000,
      headroomRatio: 0.8,
      sourceLimit,
      existingSources,
      pendingDeletionSources,
      reservedHeadroom,
    });
    assert.equal(result.usableSources, expected);
  }
});
