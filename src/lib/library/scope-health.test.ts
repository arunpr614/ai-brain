import { test } from "node:test";
import assert from "node:assert/strict";
import { getScopeHealth, isWeakScopeItem } from "./scope-health";

test("getScopeHealth counts readable full-text and null-quality body items", () => {
  const health = getScopeHealth([
    { body: "Full article", capture_quality: "full_text" },
    { body: "Older captured item", capture_quality: null },
    { body: "Metadata only", capture_quality: "metadata_only" },
    { body: "", capture_quality: "full_text" },
  ]);

  assert.deepEqual(health, { total: 4, readable: 2, weak: 1 });
});

test("isWeakScopeItem treats known warning-only metadata states as weak", () => {
  assert.equal(
    isWeakScopeItem({
      body: "Only metadata",
      capture_quality: null,
      extraction_warning: "youtube_transcript_fetch_metadata_only",
    }),
    true,
  );
  assert.equal(
    isWeakScopeItem({
      body: "Long transcript excerpt",
      capture_quality: "transcript",
      extraction_warning: "transcript_truncated_2h",
    }),
    false,
  );
});
