import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  allocateGeneratedItemInstance,
  ItemInstanceAllocationExhaustedError,
} from "./item-instance-allocation";

test("draws one internal 128-bit candidate lazily and stops after acceptance", () => {
  let persistCount = 0;
  const allocation = allocateGeneratedItemInstance((generatedCandidate) => {
    persistCount += 1;
    assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
    return { kind: "accepted", value: { rowId: 17 } };
  });

  assert.match(allocation.itemInstanceId, /^[0-9a-f]{32}$/u);
  assert.deepEqual(allocation.value, { rowId: 17 });
  assert.equal(persistCount, 1);
});

test("retries only live uniqueness collisions and returns the later candidate", () => {
  const observedCandidates: string[] = [];
  const allocation = allocateGeneratedItemInstance((generatedCandidate) => {
    assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
    observedCandidates.push(generatedCandidate);
    if (observedCandidates.length < 3) {
      return { kind: "live_uniqueness_collision" };
    }
    return { kind: "accepted", value: "persisted" };
  });

  assert.equal(observedCandidates.length, 3);
  assert.equal(allocation.itemInstanceId, observedCandidates[2]);
  assert.equal(allocation.value, "persisted");
});

test("throws the stable content-free error after exactly eight collisions", () => {
  let persistCount = 0;
  assert.throws(
    () =>
      allocateGeneratedItemInstance((generatedCandidate) => {
        persistCount += 1;
        assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
        if (persistCount > 8) {
          throw new Error("unexpected_ninth_persistence_attempt");
        }
        return { kind: "live_uniqueness_collision" };
      }),
    (error: unknown) => {
      assert.ok(error instanceof ItemInstanceAllocationExhaustedError);
      assert.equal(error.code, "item_instance_allocation_exhausted");
      assert.equal(error.message, "item_instance_allocation_exhausted");
      assert.equal(error.name, "ItemInstanceAllocationExhaustedError");
      return true;
    },
  );

  assert.equal(persistCount, 8);
});

test("propagates persistence errors unchanged and does not retry", () => {
  const persistenceFailure = new Error("fixed_persistence_failure");
  let persistCount = 0;
  assert.throws(
    () =>
      allocateGeneratedItemInstance(() => {
        persistCount += 1;
        throw persistenceFailure;
      }),
    (error: unknown) => error === persistenceFailure,
  );

  assert.equal(persistCount, 1);
});

test("does not dereference caller-mutated crypto exports between attempts", () => {
  const mutableCrypto = crypto as {
    randomBytes: typeof crypto.randomBytes;
  };
  const originalRandomBytes = mutableCrypto.randomBytes;
  const forcedFirst = "42";
  const forcedSecond = "7a".repeat(16);
  const observedCandidates: string[] = [];

  try {
    mutableCrypto.randomBytes = (() =>
      Buffer.from(forcedFirst, "hex")) as typeof crypto.randomBytes;

    const allocation = allocateGeneratedItemInstance((generatedCandidate) => {
      observedCandidates.push(generatedCandidate);
      assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
      if (observedCandidates.length === 1) {
        mutableCrypto.randomBytes = (() =>
          Buffer.from(forcedSecond, "hex")) as typeof crypto.randomBytes;
        return { kind: "live_uniqueness_collision" };
      }
      return { kind: "accepted", value: "captured-native-entropy" };
    });

    assert.equal(observedCandidates.length, 2);
    assert.notEqual(observedCandidates[0], forcedFirst);
    assert.notEqual(observedCandidates[1], forcedSecond);
    assert.equal(allocation.itemInstanceId, observedCandidates[1]);
    assert.equal(allocation.value, "captured-native-entropy");
  } finally {
    mutableCrypto.randomBytes = originalRandomBytes;
  }
});

test("keeps no cross-call candidate history or nonreuse state", () => {
  let firstPersistCount = 0;
  let secondPersistCount = 0;

  const first = allocateGeneratedItemInstance((generatedCandidate) => {
    firstPersistCount += 1;
    assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
    return { kind: "accepted", value: "first" };
  });
  const second = allocateGeneratedItemInstance((generatedCandidate) => {
    secondPersistCount += 1;
    assert.match(generatedCandidate, /^[0-9a-f]{32}$/u);
    return { kind: "accepted", value: "second" };
  });

  assert.equal(firstPersistCount, 1);
  assert.equal(secondPersistCount, 1);
  assert.equal(first.value, "first");
  assert.equal(second.value, "second");
});
