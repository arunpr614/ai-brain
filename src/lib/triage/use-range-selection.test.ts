import test from "node:test";
import assert from "node:assert/strict";

interface TestItem {
  id: string;
  title: string;
}

function calculateRangeSelection(
  items: TestItem[],
  selectedIds: Set<string>,
  lastSelectedId: string | null,
  targetId: string,
  shiftKey: boolean,
): { newSelectedIds: Set<string>; newLastSelectedId: string } {
  const itemIds = items.map((i) => i.id);
  const next = new Set(selectedIds);

  if (shiftKey && lastSelectedId) {
    const anchorIdx = itemIds.indexOf(lastSelectedId);
    const targetIdx = itemIds.indexOf(targetId);

    if (anchorIdx !== -1 && targetIdx !== -1) {
      const start = Math.min(anchorIdx, targetIdx);
      const end = Math.max(anchorIdx, targetIdx);

      for (let i = start; i <= end; i++) {
        next.add(itemIds[i]);
      }
      return { newSelectedIds: next, newLastSelectedId: targetId };
    }
  }

  if (next.has(targetId)) {
    next.delete(targetId);
  } else {
    next.add(targetId);
  }

  return { newSelectedIds: next, newLastSelectedId: targetId };
}

test("useRangeSelection logic: single item selection toggles on and off", () => {
  const items: TestItem[] = [
    { id: "item-1", title: "Item 1" },
    { id: "item-2", title: "Item 2" },
    { id: "item-3", title: "Item 3" },
  ];

  let selected = new Set<string>();
  let last: string | null = null;

  // Select item-1
  const res1 = calculateRangeSelection(items, selected, last, "item-1", false);
  selected = res1.newSelectedIds;
  last = res1.newLastSelectedId;
  assert.equal(selected.size, 1);
  assert.ok(selected.has("item-1"));
  assert.equal(last, "item-1");

  // Toggle item-1 off
  const res2 = calculateRangeSelection(items, selected, last, "item-1", false);
  selected = res2.newSelectedIds;
  assert.equal(selected.size, 0);
});

test("useRangeSelection logic: Shift + Click selects contiguous range between anchor and target", () => {
  const items: TestItem[] = [
    { id: "item-1", title: "Item 1" },
    { id: "item-2", title: "Item 2" },
    { id: "item-3", title: "Item 3" },
    { id: "item-4", title: "Item 4" },
    { id: "item-5", title: "Item 5" },
  ];

  let selected = new Set<string>();
  let last: string | null = null;

  // 1. Select item-2 as anchor
  const step1 = calculateRangeSelection(items, selected, last, "item-2", false);
  selected = step1.newSelectedIds;
  last = step1.newLastSelectedId;
  assert.deepEqual(Array.from(selected), ["item-2"]);

  // 2. Shift + click item-4 -> selects item-2, item-3, item-4
  const step2 = calculateRangeSelection(items, selected, last, "item-4", true);
  selected = step2.newSelectedIds;
  last = step2.newLastSelectedId;
  assert.equal(selected.size, 3);
  assert.ok(selected.has("item-2"));
  assert.ok(selected.has("item-3"));
  assert.ok(selected.has("item-4"));
  assert.equal(last, "item-4");
});

test("useRangeSelection logic: Shift + Click upward range selection", () => {
  const items: TestItem[] = [
    { id: "item-1", title: "Item 1" },
    { id: "item-2", title: "Item 2" },
    { id: "item-3", title: "Item 3" },
    { id: "item-4", title: "Item 4" },
    { id: "item-5", title: "Item 5" },
  ];

  let selected = new Set<string>();
  let last: string | null = null;

  // 1. Select item-5 as anchor
  const step1 = calculateRangeSelection(items, selected, last, "item-5", false);
  selected = step1.newSelectedIds;
  last = step1.newLastSelectedId;

  // 2. Shift + click item-2 -> selects item-2, item-3, item-4, item-5
  const step2 = calculateRangeSelection(items, selected, last, "item-2", true);
  selected = step2.newSelectedIds;
  assert.equal(selected.size, 4);
  assert.ok(selected.has("item-2"));
  assert.ok(selected.has("item-3"));
  assert.ok(selected.has("item-4"));
  assert.ok(selected.has("item-5"));
});
