import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addNoteFocusToUrl,
  hasOwnedNoteFocusState,
  isNoteFocusRequested,
  mergeNoteFocusState,
  normalizeNoteFocusUrl,
  removeNoteFocusFromState,
  removeNoteFocusFromUrl,
} from "./focus-history";

test("focus URL preserves unrelated item query state", () => {
  const url = new URL(
    "https://brain.example/items/abc?capture_state=created&highlight=chunk-1&tab=details",
  );
  const focused = addNoteFocusToUrl(url);

  assert.equal(
    focused.href,
    "https://brain.example/items/abc?capture_state=created&highlight=chunk-1&tab=notes&note_mode=focus",
  );
  assert.equal(url.searchParams.get("tab"), "details");
});

test("source reading focus takes precedence over note focus", () => {
  const url = new URL(
    "https://brain.example/items/abc?mode=focus&tab=notes&note_mode=focus&highlight=chunk-1",
  );

  assert.equal(isNoteFocusRequested(url), false);
  assert.equal(
    normalizeNoteFocusUrl(url).href,
    "https://brain.example/items/abc?mode=focus&tab=notes&highlight=chunk-1",
  );
});

test("removing note focus keeps the Notes tab and unrelated query state", () => {
  const url = new URL(
    "https://brain.example/items/abc?repair=queued&tab=notes&note_mode=focus",
  );

  assert.equal(
    removeNoteFocusFromUrl(url).href,
    "https://brain.example/items/abc?repair=queued&tab=notes",
  );
});

test("history state keeps framework keys and stores only version and token", () => {
  const nextState = { __NA: true, tree: ["items", "abc"] };
  const merged = mergeNoteFocusState(nextState, "focus-token");

  assert.deepEqual(merged, {
    __NA: true,
    tree: ["items", "abc"],
    __brainNoteFocus: { v: 1, token: "focus-token" },
  });
  assert.deepEqual(nextState, { __NA: true, tree: ["items", "abc"] });
  assert.equal(hasOwnedNoteFocusState(merged, "focus-token"), true);
  assert.equal(hasOwnedNoteFocusState(merged, "other-token"), false);
  assert.equal(hasOwnedNoteFocusState({ __brainNoteFocus: { v: 2, token: "focus-token" } }), false);
});

test("removing note focus state restores unrelated framework state", () => {
  const state = {
    __NA: true,
    __brainNoteFocus: { v: 1, token: "focus-token" },
  };

  assert.deepEqual(removeNoteFocusFromState(state), { __NA: true });
  assert.deepEqual(removeNoteFocusFromState(null), {});
});

test("note focus request requires an item path and the exact marker", () => {
  assert.equal(
    isNoteFocusRequested(new URL("https://brain.example/items/abc?note_mode=focus")),
    true,
  );
  assert.equal(
    isNoteFocusRequested(new URL("https://brain.example/library?note_mode=focus")),
    false,
  );
  assert.equal(
    isNoteFocusRequested(new URL("https://brain.example/items/abc?note_mode=other")),
    false,
  );
});
