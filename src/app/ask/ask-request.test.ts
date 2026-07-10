import test from "node:test";
import assert from "node:assert/strict";
import { buildAskRequestBody } from "./ask-request";

test("buildAskRequestBody creates an item scope request", () => {
  assert.deepEqual(
    buildAskRequestBody({
      question: "What did I save?",
      itemId: "item-1",
      threadId: "thread-1",
    }),
    {
      question: "What did I save?",
      scope: "item",
      item_id: "item-1",
      thread_id: "thread-1",
    },
  );
});

test("buildAskRequestBody creates a unique item-set scope request", () => {
  assert.deepEqual(
    buildAskRequestBody({
      question: "Summarize these",
      itemIds: ["item-1", "", "item-2", "item-1"],
    }),
    {
      question: "Summarize these",
      scope: "items",
      item_ids: ["item-1", "item-2"],
    },
  );
});

test("buildAskRequestBody prefers item-set scope over item scope", () => {
  assert.deepEqual(
    buildAskRequestBody({
      question: "Summarize scope",
      itemId: "single-item",
      itemIds: ["item-1", "item-2"],
      threadId: "thread-2",
    }),
    {
      question: "Summarize scope",
      scope: "items",
      item_ids: ["item-1", "item-2"],
      thread_id: "thread-2",
    },
  );
});

test("buildAskRequestBody creates a library request when no item scope exists", () => {
  assert.deepEqual(
    buildAskRequestBody({
      question: "What is in my library?",
      threadId: "thread-3",
    }),
    {
      question: "What is in my library?",
      thread_id: "thread-3",
    },
  );
});
