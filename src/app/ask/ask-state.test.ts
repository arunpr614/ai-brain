import test from "node:test";
import assert from "node:assert/strict";
import { buildAskClientStateKey } from "./ask-state";

const baseMessages = [
  { id: "m1", role: "user", content: "What did I save?" },
  { id: "m2", role: "assistant", content: "A note about planning." },
];

test("buildAskClientStateKey changes when the active thread changes", () => {
  assert.notEqual(
    buildAskClientStateKey("thread-a", baseMessages),
    buildAskClientStateKey("thread-b", baseMessages),
  );
});

test("buildAskClientStateKey changes when restored messages change", () => {
  assert.notEqual(
    buildAskClientStateKey("thread-a", baseMessages),
    buildAskClientStateKey("thread-a", [
      ...baseMessages,
      { id: "m3", role: "user", content: "Follow-up" },
    ]),
  );
});

test("buildAskClientStateKey is stable for identical thread payloads", () => {
  assert.equal(
    buildAskClientStateKey("thread-a", baseMessages),
    buildAskClientStateKey("thread-a", baseMessages.map((message) => ({ ...message }))),
  );
});
