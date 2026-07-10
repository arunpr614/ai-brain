import { randomUUID } from "node:crypto";
import { getDb } from "../src/db/client";
import { insertCaptured } from "../src/db/items";
import { isPinConfigured, setPin } from "../src/lib/auth";
import { saveItemNote } from "../src/db/item-notes";

if (!isPinConfigured()) setPin("1234");

const item = insertCaptured({
  source_type: "url",
  source_url: `https://example.com/manual-notes-visual-qa-${Date.now()}`,
  title: "Designing a durable personal knowledge practice",
  author: "Synthetic QA Fixture",
  body: [
    "A useful knowledge practice separates what the source said from what the reader concluded.",
    "",
    "The source layer should stay stable. Personal interpretation can evolve, be searched in the reader's own words, and remain visibly attributed to the reader.",
    "",
    "Reliable tools make interruption, offline work, and conflicting browser tabs explicit instead of silently choosing a winner.",
  ].join("\n"),
  source_platform: "generic_article",
  capture_quality: "full_text",
});

getDb()
  .prepare(
    `UPDATE items SET
       summary = ?, category = 'Learning', enrichment_state = 'done', enriched_at = ?
     WHERE id = ?`,
  )
  .run(
    "Durable knowledge tools keep captured material, AI output, and personal interpretation separate while making recovery trustworthy.",
    Date.now(),
    item.id,
  );
getDb()
  .prepare(
    `UPDATE enrichment_jobs SET state = 'done', completed_at = ? WHERE item_id = ?`,
  )
  .run(Date.now(), item.id);
getDb()
  .prepare(
    `UPDATE embedding_jobs SET state = 'done', completed_at = ? WHERE item_id = ?`,
  )
  .run(Date.now(), item.id);

saveItemNote({
  itemId: item.id,
  editorInstanceId: "visual-qa-seed",
  mutationId: randomUUID(),
  epoch: null,
  baseGeneration: null,
  saveKind: "manual",
  contentMarkdown: [
    "## My takeaway",
    "",
    "The trust model matters more than a fancy editor. I want the system to preserve **my wording** and make conflicts visible.",
    "",
    "- [x] Keep original content separate",
    "- [ ] Test a two-tab conflict",
    "- [ ] Revisit this idea next week",
    "",
    "> Search should find the item through language I used here.",
  ].join("\n"),
});

process.stdout.write(`${JSON.stringify({ itemId: item.id, pin: "1234" })}\n`);
