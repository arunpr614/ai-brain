import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeItem } from "./api";

describe("normalizeItem", () => {
  it("maps the bounded backend DTO without dropping workflow truth", () => {
    const item = normalizeItem({
      itemId: "source-1",
      title: "A source",
      excerpt: "Bounded excerpt",
      sourceType: "article",
      captureChannel: "web",
      captureQuality: "full_text",
      capturedAt: 1_720_000_000_000,
      status: "in_progress",
      version: 4,
      inboxEnteredAt: null,
      archivedAt: null,
      userTags: [{ id: "tag-1", label: "Research" }],
      aiTopics: [{ id: "topic-1", label: "AI" }],
    });

    assert.equal(item.id, "source-1");
    assert.equal(item.workflowStatus, "in_progress");
    assert.equal(item.workflowVersion, 4);
    assert.deepEqual(item.userTags, [{ id: "tag-1", name: "Research" }]);
    assert.deepEqual(item.aiTopics, [{ id: "topic-1", name: "AI" }]);
  });

  it("merges a projection shape using top-level status and version", () => {
    const item = normalizeItem({
      id: "source-2",
      title: "Existing title",
      status: "done",
      version: 8,
      archivedAt: 1_720_000_100_000,
    });

    assert.equal(item.id, "source-2");
    assert.equal(item.title, "Existing title");
    assert.equal(item.workflowStatus, "done");
    assert.equal(item.workflowVersion, 8);
    assert.equal(item.archivedAt, 1_720_000_100_000);
  });

});
