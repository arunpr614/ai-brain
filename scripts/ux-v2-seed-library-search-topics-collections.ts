import { attachItemToCollection, createCollection } from "@/db/collections";
import { insertCaptured } from "@/db/items";
import { attachTagToItem, upsertTag } from "@/db/tags";
import { replaceTopicsForItem, topicSlug, upsertTopic } from "@/db/topics";

const now = Date.now();

const article = insertCaptured({
  source_type: "url",
  title: "UX v2 library fixture article",
  body:
    "LSTC search beacon. A full-text article about library filtering, topic health, and scoped answers for the AI Memory QA fixture.",
  source_url: "https://example.test/ux-v2-library-fixture",
  source_platform: "generic_article",
  capture_quality: "full_text",
  captured_at: now - 5 * 60_000,
});

const note = insertCaptured({
  source_type: "note",
  title: "UX v2 selected ask fixture note",
  body:
    "Synthetic note content for selected Ask, manual tagging, and collection membership checks. The route evidence should never contain private notes.",
  source_platform: "note",
  capture_quality: "user_provided_full_text",
  captured_at: now - 15 * 60_000,
});

const youtube = insertCaptured({
  source_type: "youtube",
  title: "UX v2 transcript fixture video",
  body:
    "Transcript fixture about search modes, semantic retrieval, and source quality badges.",
  source_url: "https://www.youtube.com/watch?v=uxv2fixture01",
  source_platform: "youtube",
  capture_quality: "transcript",
  duration_seconds: 612,
  captured_at: now - 45 * 60_000,
});

const pdf = insertCaptured({
  source_type: "pdf",
  title: "UX v2 PDF fixture brief",
  body:
    "PDF fixture body with enough readable text to validate PDF source rows and collection pages.",
  source_platform: "pdf",
  capture_quality: "full_text",
  total_pages: 8,
  captured_at: now - 2 * 60 * 60_000,
});

const weak = insertCaptured({
  source_type: "youtube",
  title: "UX v2 weak metadata fixture",
  body: "Metadata-only fixture. Transcript unavailable.",
  source_url: "https://www.youtube.com/watch?v=uxv2weak01",
  source_platform: "youtube",
  capture_quality: "metadata_only",
  extraction_warning: "youtube_antibot_metadata_only",
  captured_at: now - 3 * 60 * 60_000,
});

const stress = insertCaptured({
  source_type: "url",
  title:
    "UX v2 long title stress fixture for wrapping behavior across library rows, search rows, topic rows, and collection rows",
  body:
    "A long-title fixture that keeps content synthetic while exercising row wrapping, truncation, metadata layout, and visual stability at compact widths.",
  source_url: "https://example.test/ux-v2-long-title-fixture",
  source_platform: "generic_article",
  capture_quality: "full_text",
  captured_at: now - 6 * 60 * 60_000,
});

const tag = upsertTag("ux-v2-fixture", "manual");
for (const item of [article, note, weak]) {
  attachTagToItem(item.id, tag.id);
}

const populatedCollection = createCollection(
  "UX v2 Fixture Collection",
  "Synthetic collection used for Library/Search/Topic/Collection browser QA.",
);
for (const item of [article, note, weak]) {
  attachItemToCollection(item.id, populatedCollection.id);
}

const emptyCollection = createCollection(
  "UX v2 Empty Fixture Collection",
  "Synthetic empty collection for browser QA.",
);

const topicName = "UX v2 Source Health";
const topic = upsertTopic(topicName, {
  description:
    "Synthetic generated topic covering readable and weak source health states.",
  source: "ai",
});
for (const item of [article, weak, stress]) {
  replaceTopicsForItem(item.id, [topicName], {
    source: "ai",
    evidence: "Synthetic QA fixture topic evidence.",
  });
}

const manifest = {
  dbPath: process.env.BRAIN_DB_PATH ?? "data/brain.sqlite",
  searchHitQuery: "LSTC search beacon",
  searchMissQuery: "no-result-lstc-fixture-zzzz",
  tagName: tag.name,
  topicSlug: topicSlug(topic.name),
  populatedCollectionId: populatedCollection.id,
  emptyCollectionId: emptyCollection.id,
  itemIds: {
    article: article.id,
    note: note.id,
    youtube: youtube.id,
    pdf: pdf.id,
    weak: weak.id,
    stress: stress.id,
  },
  routes: {
    library: "/library",
    libraryTagged: `/library?tag=${encodeURIComponent(tag.name)}`,
    searchEmpty: "/search",
    searchHit: `/search?q=${encodeURIComponent("LSTC search beacon")}`,
    searchMiss: `/search?q=${encodeURIComponent("no-result-lstc-fixture-zzzz")}`,
    searchProviderDown: `/search?q=${encodeURIComponent("LSTC search beacon")}&mode=semantic`,
    topicPopulated: `/topics/${topicSlug(topic.name)}`,
    topicMissing: "/topics/missing-lstc-fixture-topic",
    collectionPopulated: `/collections/${populatedCollection.id}`,
    collectionEmpty: `/collections/${emptyCollection.id}`,
    collectionMissing: "/collections/missing-lstc-fixture-collection",
  },
};

console.log(JSON.stringify(manifest, null, 2));
