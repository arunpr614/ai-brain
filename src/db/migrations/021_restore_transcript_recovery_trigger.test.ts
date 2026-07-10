import "./021_restore_transcript_recovery_trigger.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { getDb } from "@/db/client";
import { insertCaptured } from "@/db/items";
import { getTranscriptJobForItem } from "@/db/transcript-jobs";
import { TEST_DB_DIR } from "./021_restore_transcript_recovery_trigger.test.setup";

after(() => rmSync(TEST_DB_DIR, { recursive: true, force: true }));

test("migration 021 restores weak YouTube transcript recovery after the 020 items rebuild", () => {
  const db = getDb();
  const trigger = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'items_enqueue_youtube_transcript_recovery'",
    )
    .get() as { name: string } | undefined;
  assert.equal(trigger?.name, "items_enqueue_youtube_transcript_recovery");

  const weak = insertCaptured({
    source_type: "youtube",
    title: "Weak YouTube",
    body: "metadata only",
    source_url: "https://www.youtube.com/watch?v=migration021",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "youtube_antibot_metadata_only",
  });
  assert.equal(getTranscriptJobForItem(weak.id)?.state, "pending");

  const strong = insertCaptured({
    source_type: "youtube",
    title: "Strong YouTube",
    body: "full transcript text",
    source_url: "https://www.youtube.com/watch?v=migration021full",
    source_platform: "youtube",
    capture_quality: "transcript",
  });
  assert.equal(getTranscriptJobForItem(strong.id), null);
});
