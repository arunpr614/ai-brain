import fs from "node:fs";

const dbPath = process.env.BRAIN_DB_PATH;
const scenario = process.env.A2_SCENARIO === "empty" ? "empty" : "queue";

if (!dbPath) {
  throw new Error("Set BRAIN_DB_PATH to a temporary A2 SQLite database path.");
}

if (process.env.A2_RESET_DB === "1") {
  if (!dbPath.startsWith("/tmp/")) {
    throw new Error("A2_RESET_DB=1 is only allowed for /tmp databases.");
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
  const { attachTagToItem, upsertTag } = await import("@/db/tags");

  const now = Date.now();

  const full = insertCaptured({
    source_type: "url",
    title: "A2 full text baseline fixture",
    body:
      "A2 full text baseline body. This source should never appear in Needs Upgrade.",
    source_url: "https://example.test/a2-full-baseline",
    source_platform: "generic_article",
    capture_quality: "full_text",
    captured_at: now - 10 * 60_000,
  });

  const manifest: Record<string, unknown> = {
    scenario,
    dbPath,
    reset: process.env.A2_RESET_DB === "1",
    itemIds: {
      full: full.id,
    },
    routes: {
      captureUrl: "/capture",
      capturePdf: "/capture?tab=pdf",
      captureNote: "/capture?tab=note",
      needsUpgrade: "/needs-upgrade",
    },
  };

  if (scenario === "queue") {
    const duplicateUrl = "https://example.test/a2-duplicate-url";
    const duplicate = insertCaptured({
      source_type: "url",
      title: "A2 duplicate URL fixture",
      body:
        "A2 duplicate URL fixture body with enough readable text for full-text capture.",
      source_url: duplicateUrl,
      source_platform: "generic_article",
      capture_quality: "full_text",
      captured_at: now - 20 * 60_000,
    });

    const repair = insertCaptured({
      source_type: "youtube",
      title: "A2 repair weak fixture",
      body: "Metadata-only repair fixture. Transcript unavailable.",
      source_url: "https://www.youtube.com/watch?v=a2repairfixture",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "youtube_antibot_metadata_only",
      capture_source: "android",
      captured_at: now - 45 * 60_000,
    });

    const preview = insertCaptured({
      source_type: "url",
      title:
        "A2 long preview fixture title that should wrap across mobile Needs Upgrade rows without clipping",
      body: "Preview-only fixture for A2 Needs Upgrade grouping.",
      source_url: "https://example.test/a2-preview-fixture",
      source_platform: "substack",
      capture_quality: "paywall_preview",
      extraction_warning: "paywall_preview",
      captured_at: now - 2 * 60 * 60_000,
    });

    const failed = insertCaptured({
      source_type: "url",
      title: "A2 failed extraction fixture",
      body: "Failed extraction fixture.",
      source_url: "https://example.test/a2-failed-fixture",
      source_platform: "generic_article",
      capture_quality: "failed",
      extraction_warning: "extract_failed",
      captured_at: now - 3 * 60 * 60_000,
    });

    const tag = upsertTag("a2-preserve-tag", "manual");
    attachTagToItem(repair.id, tag.id);
    const collection = createCollection(
      "A2 Preserve Collection",
      "Synthetic collection used to verify repair preserves membership.",
    );
    attachItemToCollection(repair.id, collection.id);

    Object.assign(manifest, {
      duplicateUrl,
      repairText: [
        "A2 repaired source text with enough useful detail to replace a weak capture.",
        "It contains mobile QA evidence, repair success checks, collection preservation, and tag preservation.",
        "This body is intentionally longer than the minimum repair threshold for deterministic validation.",
      ].join(" "),
      tag: {
        id: tag.id,
        name: tag.name,
      },
      collection: {
        id: collection.id,
        name: collection.name,
      },
      itemIds: {
        full: full.id,
        duplicate: duplicate.id,
        repair: repair.id,
        preview: preview.id,
        failed: failed.id,
      },
      routes: {
        captureUrl: `/capture?url=${encodeURIComponent(duplicateUrl)}`,
        capturePdf: "/capture?tab=pdf",
        captureNote: "/capture?tab=note",
        needsUpgrade: "/needs-upgrade",
        repair: `/items/${repair.id}/repair`,
        repairItem: `/items/${repair.id}`,
      },
    });
  }

  console.log(JSON.stringify(manifest, null, 2));
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
