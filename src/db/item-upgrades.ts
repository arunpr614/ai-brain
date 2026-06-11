import { getDb, type ItemRow } from "./client";
import { recordManualTranscriptResolutionForItem } from "./transcript-jobs";
import { saveCaptureArtifacts } from "@/lib/capture/artifacts";
import type { CapturedContent } from "@/lib/capture/types";
import { logError } from "@/lib/errors/sink";

export interface UpgradeItemCaptureContentInput {
  itemId: string;
  content: CapturedContent;
  platform?: string | null;
}

export async function upgradeItemCaptureContent(
  input: UpgradeItemCaptureContentInput,
): Promise<ItemRow | null> {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(input.itemId) as
    | ItemRow
    | undefined;
  if (!existing) return null;

  const previousArtifact = {
    kind: "pre_upgrade_item_json",
    content_type: "application/json",
    suggested_filename: "pre-upgrade-item.json",
    body: JSON.stringify(
      {
        previous_title: existing.title,
        previous_body: existing.body,
        previous_quality: existing.capture_quality ?? null,
        previous_extraction_method: existing.extraction_method ?? null,
        previous_warning: existing.extraction_warning ?? null,
        previous_total_chars: existing.total_chars ?? existing.body.length,
        upgraded_at: Date.now(),
      },
      null,
      2,
    ),
  };

  const rowids = db
    .prepare(
      `SELECT chunks_rowid.rowid AS rowid
       FROM chunks
       JOIN chunks_rowid ON chunks_rowid.chunk_id = chunks.id
       WHERE chunks.item_id = ?`,
    )
    .all(input.itemId) as Array<{ rowid: number | bigint }>;

  const tx = db.transaction(() => {
    for (const row of rowids) {
      db.prepare("DELETE FROM chunks_vec WHERE rowid = ?").run(BigInt(row.rowid));
    }
    db.prepare("DELETE FROM chunks WHERE item_id = ?").run(input.itemId);
    db.prepare("DELETE FROM embedding_jobs WHERE item_id = ?").run(input.itemId);
    db.prepare(
      `DELETE FROM item_tags
       WHERE item_id = ?
         AND tag_id IN (SELECT id FROM tags WHERE kind = 'auto')`,
    ).run(input.itemId);

    db.prepare(
      `INSERT INTO enrichment_jobs
         (item_id, state, attempts, last_error, claimed_at, completed_at)
       VALUES (?, 'pending', 0, NULL, NULL, NULL)
       ON CONFLICT(item_id) DO UPDATE SET
         state = 'pending',
         attempts = 0,
         last_error = NULL,
         claimed_at = NULL,
         completed_at = NULL`,
    ).run(input.itemId);

    db.prepare(
      `UPDATE items
       SET source_url = ?,
           title = ?,
           author = ?,
           body = ?,
           summary = NULL,
           quotes = NULL,
           category = NULL,
           enriched_at = NULL,
           enrichment_state = 'pending',
           extraction_warning = ?,
           duration_seconds = ?,
           source_platform = ?,
           capture_quality = ?,
           extraction_method = ?,
           extraction_version = ?,
           published_at = ?,
           thumbnail_url = ?,
           description = ?,
           total_chars = ?,
           batch_id = NULL
       WHERE id = ?`,
    ).run(
      input.content.source_url,
      input.content.title,
      input.content.author ?? null,
      input.content.body,
      input.content.extraction_warning ?? null,
      input.content.duration_seconds ?? null,
      input.content.source_platform ?? input.platform ?? null,
      input.content.capture_quality ?? null,
      input.content.extraction_method ?? null,
      input.content.extraction_version ?? null,
      input.content.published_at ?? null,
      input.content.thumbnail_url ?? null,
      input.content.description ?? null,
      input.content.body.length,
      input.itemId,
    );
  });
  tx();

  try {
    await saveCaptureArtifacts(input.itemId, [
      previousArtifact,
      ...(input.content.artifacts ?? []),
    ]);
  } catch (err) {
    logError({
      type: "capture.artifact-save-failed",
      item_id: input.itemId,
      message: (err as Error).message,
      ts: Date.now(),
    });
  }

  const updated = db.prepare("SELECT * FROM items WHERE id = ?").get(input.itemId) as
    | ItemRow
    | undefined;
  logError({
    type: "capture.upgrade.completed",
    item_id: input.itemId,
    platform: input.content.source_platform ?? input.platform ?? null,
    source_url: input.content.source_url,
    old_quality: existing.capture_quality ?? null,
    new_quality: input.content.capture_quality ?? null,
    extraction_method: input.content.extraction_method ?? null,
    action: "upgraded",
    text_chars: input.content.body.length,
    derived_state_reset: true,
    ts: Date.now(),
  });
  const isYoutube =
    input.content.source_platform === "youtube" ||
    input.content.source_platform === "youtube_short" ||
    input.platform === "youtube" ||
    input.platform === "youtube_short";
  const isManualYoutubeUpgrade =
    isYoutube &&
    (input.content.extraction_method === "youtube_user_provided_text" ||
      input.content.capture_quality === "user_provided_full_text");
  if (isManualYoutubeUpgrade) {
    recordManualTranscriptResolutionForItem({
      itemId: input.itemId,
      provider: "manual_user_text",
      transcriptChars: input.content.body.length,
    });
  }
  return updated ?? null;
}
