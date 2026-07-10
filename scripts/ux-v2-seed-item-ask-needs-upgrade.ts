import { attachItemToCollection, createCollection } from "@/db/collections";
import { insertCaptured } from "@/db/items";
import { attachTagToItem, upsertTag } from "@/db/tags";
import { replaceTopicsForItem, topicSlug, upsertTopic } from "@/db/topics";

const now = Date.now();

const fullItem = insertCaptured({
  source_type: "url",
  title: "UX v2 item detail full-text fixture",
  body:
    "IANU full text beacon. This synthetic article validates item detail reading, focus mode, Ask item scope, organization panels, and export-safe content without private data.",
  source_url: "https://example.test/ux-v2-item-full-text",
  author: "UX Fixture Author",
  source_platform: "generic_article",
  capture_quality: "full_text",
  extraction_method: "fixture_full_text",
  captured_at: now - 10 * 60_000,
});

const weakMetadataItem = insertCaptured({
  source_type: "youtube",
  title: "UX v2 needs transcript fixture",
  body: "Metadata-only YouTube fixture. Transcript unavailable.",
  source_url: "https://www.youtube.com/watch?v=uxv2needs01",
  source_platform: "youtube",
  capture_quality: "metadata_only",
  extraction_warning: "youtube_antibot_metadata_only",
  duration_seconds: 932,
  captured_at: now - 30 * 60_000,
});

const weakPreviewItem = insertCaptured({
  source_type: "url",
  title: "UX v2 preview-only fixture",
  body:
    "Preview-only Substack fixture with limited text. Full newsletter body is not available yet.",
  source_url: "https://example.test/ux-v2-preview-only",
  source_platform: "substack",
  capture_quality: "paywall_preview",
  extraction_method: "fixture_preview",
  captured_at: now - 50 * 60_000,
});

const repairTargetItem = insertCaptured({
  source_type: "url",
  title: "UX v2 repair target fixture",
  body: "Metadata-only LinkedIn fixture. Pasted post text is required.",
  source_url: "https://www.linkedin.com/posts/ux-v2-repair-target",
  source_platform: "linkedin",
  capture_quality: "metadata_only",
  extraction_warning: "metadata_only_fixture",
  captured_at: now - 70 * 60_000,
});

const tag = upsertTag("ux-v2-item-ask", "manual");
for (const item of [fullItem, weakMetadataItem]) {
  attachTagToItem(item.id, tag.id);
}

const collection = createCollection(
  "UX v2 Item Ask Collection",
  "Synthetic collection for item detail, Ask scope, and repair QA.",
);
for (const item of [fullItem, weakMetadataItem]) {
  attachItemToCollection(item.id, collection.id);
}

const topicName = "UX v2 Item Ask Topic";
const topic = upsertTopic(topicName, {
  description: "Synthetic generated topic for item detail and Ask scope QA.",
  source: "ai",
});
for (const item of [fullItem, weakMetadataItem]) {
  replaceTopicsForItem(item.id, [topicName], {
    source: "ai",
    evidence: "Synthetic item/ask/needs-upgrade QA fixture evidence.",
  });
}

const selectedIds = [fullItem.id, weakMetadataItem.id].join(",");
const topicRouteSlug = topicSlug(topic.name);

const manifest = {
  dbPath: process.env.BRAIN_DB_PATH ?? "data/brain.sqlite",
  tagName: tag.name,
  topicSlug: topicRouteSlug,
  collectionId: collection.id,
  itemIds: {
    fullItem: fullItem.id,
    weakMetadataItem: weakMetadataItem.id,
    weakPreviewItem: weakPreviewItem.id,
    repairTargetItem: repairTargetItem.id,
  },
  routes: {
    fullItem: `/items/${fullItem.id}`,
    weakItem: `/items/${weakMetadataItem.id}`,
    weakFocus: `/items/${weakMetadataItem.id}?mode=focus`,
    repairTarget: `/items/${repairTargetItem.id}/repair`,
    needsUpgrade: "/needs-upgrade",
    askLibrary: "/ask",
    askItem: `/items/${fullItem.id}/ask`,
    askSelected: `/ask?scope=selected&ids=${encodeURIComponent(selectedIds)}`,
    askTag: `/ask?scope=tag&tag=${encodeURIComponent(tag.name)}`,
    askTopic: `/ask?scope=topic&topic=${encodeURIComponent(topicRouteSlug)}`,
    askCollection: `/ask?scope=collection&collection=${collection.id}`,
    askMissingSelected: "/ask?scope=selected&ids=missing-ux-v2-item",
    askMissingTopic: "/ask?scope=topic&topic=missing-ux-v2-topic",
    askMissingCollection: "/ask?scope=collection&collection=missing-ux-v2-collection",
  },
};

console.log(JSON.stringify(manifest, null, 2));
