import fs from "node:fs";

const dbPath = process.env.BRAIN_DB_PATH;

if (!dbPath) {
  throw new Error("Set BRAIN_DB_PATH to a temporary A4 SQLite database path.");
}

if (process.env.A4_RESET_DB === "1") {
  if (!dbPath.startsWith("/tmp/")) {
    throw new Error("A4_RESET_DB=1 is only allowed for /tmp databases.");
  }
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(`${dbPath}${suffix}`, { force: true });
    } catch {}
  }
}

async function main() {
  const { attachItemToCollection, createCollection } = await import(
    "@/db/collections"
  );
  const { insertCaptured } = await import("@/db/items");
  const { attachTopicToItem, upsertTopic } = await import("@/db/topics");

  const now = Date.now();

  const full = insertCaptured({
    source_type: "url",
    title: "A4 topic collection full source",
    body: [
      "A4 mobile Topic and Collection evidence verifies scoped Ask entry points, safe item rows, and empty route states.",
      "This full source should appear in populated Topic and Collection pages and in scoped Ask banners.",
      "The row copy is intentionally long enough to verify wrapping without horizontal overflow.",
    ].join(" "),
    source_url: "https://example.test/a4-topic-collection-full",
    author: "A4 Fixture Author",
    source_platform: "generic_article",
    capture_quality: "full_text",
    extraction_method: "a4-fixture",
    extraction_version: "ux-v2-a4",
    captured_at: now - 10 * 60_000,
  });

  const weak = insertCaptured({
    source_type: "youtube",
    title: "A4 weak source in scope",
    body: "Metadata-only A4 fixture for scope health warning.",
    source_url: "https://www.youtube.com/watch?v=a4weakfixture",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "youtube_antibot_metadata_only",
    capture_source: "android",
    captured_at: now - 20 * 60_000,
  });

  const topic = upsertTopic("A4 Mobile QA Topic", {
    description: "Synthetic topic used for Android A4 mobile QA.",
    source: "system",
  });
  const emptyTopic = upsertTopic("A4 Empty Topic", {
    description: "Synthetic empty topic used for Android A4 empty-state QA.",
    source: "system",
  });
  attachTopicToItem(full.id, topic.id, {
    confidence: 0.97,
    evidence: "A4 fixture full source belongs to this topic.",
  });
  attachTopicToItem(weak.id, topic.id, {
    confidence: 0.88,
    evidence: "A4 fixture weak source belongs to this topic.",
  });

  const collection = createCollection(
    "A4 Mobile QA Collection",
    "Synthetic collection used for Android A4 mobile QA.",
  );
  const emptyCollection = createCollection(
    "A4 Empty Collection",
    "Synthetic empty collection used for Android A4 empty-state QA.",
  );
  attachItemToCollection(full.id, collection.id);
  attachItemToCollection(weak.id, collection.id);

  const manifest = {
    dbPath,
    reset: process.env.A4_RESET_DB === "1",
    itemIds: {
      full: full.id,
      weak: weak.id,
    },
    topic: {
      id: topic.id,
      slug: topic.slug,
      name: topic.name,
    },
    emptyTopic: {
      id: emptyTopic.id,
      slug: emptyTopic.slug,
      name: emptyTopic.name,
    },
    collection: {
      id: collection.id,
      name: collection.name,
    },
    emptyCollection: {
      id: emptyCollection.id,
      name: emptyCollection.name,
    },
    routes: {
      topic: `/topics/${topic.slug}`,
      emptyTopic: `/topics/${emptyTopic.slug}`,
      topicAsk: `/ask?scope=topic&topic=${topic.slug}`,
      collection: `/collections/${collection.id}`,
      emptyCollection: `/collections/${emptyCollection.id}`,
      collectionAsk: `/ask?scope=collection&collection=${collection.id}`,
    },
  };

  console.log(JSON.stringify(manifest, null, 2));
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
