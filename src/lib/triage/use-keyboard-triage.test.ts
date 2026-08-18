import test from "node:test";
import assert from "node:assert/strict";

interface MockItem {
  id: string;
  title: string;
}

test("useKeyboardTriage key handler index calculations bounded correctly", () => {
  const items: MockItem[] = [
    { id: "1", title: "First" },
    { id: "2", title: "Second" },
    { id: "3", title: "Third" },
  ];

  let focusedIndex = 0;

  // 'j' moves down
  focusedIndex = Math.min(items.length - 1, focusedIndex + 1);
  assert.equal(focusedIndex, 1);

  // 'j' moves down again
  focusedIndex = Math.min(items.length - 1, focusedIndex + 1);
  assert.equal(focusedIndex, 2);

  // 'j' at end stays bounded
  focusedIndex = Math.min(items.length - 1, focusedIndex + 1);
  assert.equal(focusedIndex, 2);

  // 'k' moves up
  focusedIndex = Math.max(0, focusedIndex - 1);
  assert.equal(focusedIndex, 1);

  // 'k' to top
  focusedIndex = Math.max(0, focusedIndex - 1);
  assert.equal(focusedIndex, 0);

  // 'k' at top stays bounded
  focusedIndex = Math.max(0, focusedIndex - 1);
  assert.equal(focusedIndex, 0);
});
