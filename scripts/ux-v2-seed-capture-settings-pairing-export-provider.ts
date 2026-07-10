import { attachItemToCollection, createCollection } from "@/db/collections";
import { insertCaptured } from "@/db/items";
import { attachTagToItem, upsertTag } from "@/db/tags";

const now = Date.now();
const duplicateUrl = "https://example.test/ux-v2-capture-duplicate";

const duplicateExistingItem = insertCaptured({
  source_type: "url",
  title: "UX v2 capture duplicate fixture",
  body:
    "Capture duplicate beacon. This synthetic article is already saved so browser QA can verify the duplicate-existing result without fetching the network.",
  source_url: duplicateUrl,
  author: "UX Fixture Author",
  source_platform: "generic_article",
  capture_quality: "full_text",
  extraction_method: "fixture_duplicate",
  captured_at: now - 5 * 60_000,
});

const fullTextItem = insertCaptured({
  source_type: "url",
  title: "UX v2 capture full-text fixture",
  body:
    "Capture full-text beacon. This synthetic article validates the saved-full-text banner, settings export, and provider-health walkthrough.",
  source_url: "https://example.test/ux-v2-capture-full-text",
  author: "UX Fixture Author",
  source_platform: "generic_article",
  capture_quality: "full_text",
  extraction_method: "fixture_full_text",
  captured_at: now - 10 * 60_000,
});

const metadataOnlyItem = insertCaptured({
  source_type: "url",
  title: "UX v2 capture metadata-only fixture",
  body:
    "Metadata-only fixture. Pasted post text is required before this item can reliably answer questions.",
  source_url: "https://www.linkedin.com/posts/ux-v2-capture-metadata",
  source_platform: "linkedin",
  capture_quality: "metadata_only",
  extraction_warning: "metadata_only_fixture",
  extraction_method: "fixture_metadata_only",
  captured_at: now - 15 * 60_000,
});

const previewOnlyItem = insertCaptured({
  source_type: "url",
  title: "UX v2 capture preview-only fixture",
  body:
    "Preview-only fixture. The full newsletter body is intentionally absent from this synthetic source.",
  source_url: "https://example.test/ux-v2-capture-preview",
  source_platform: "substack",
  capture_quality: "paywall_preview",
  extraction_method: "fixture_preview",
  captured_at: now - 20 * 60_000,
});

const pdfItem = insertCaptured({
  source_type: "pdf",
  title: "UX v2 capture PDF fixture",
  body:
    "PDF capture beacon. This synthetic document validates the PDF saved state, export grouping, and mobile capture tab layout.",
  author: "UX Fixture Author",
  total_pages: 4,
  source_platform: "pdf",
  capture_quality: "full_text",
  extraction_method: "pdf_fixture",
  captured_at: now - 25 * 60_000,
});

const noteItem = insertCaptured({
  source_type: "note",
  title: "UX v2 capture note fixture",
  body:
    "Note capture beacon. This synthetic note validates the manual note capture panel and export path.",
  source_platform: "note",
  capture_quality: "user_provided_full_text",
  extraction_method: "manual_note",
  captured_at: now - 30 * 60_000,
});

const exportCollisionOne = insertCaptured({
  source_type: "note",
  title: "UX v2 export collision",
  body: "First synthetic note with a colliding export filename.",
  source_platform: "note",
  capture_quality: "user_provided_full_text",
  extraction_method: "manual_note",
  captured_at: now - 35 * 60_000,
});

const exportCollisionTwo = insertCaptured({
  source_type: "note",
  title: "UX v2 export collision!",
  body: "Second synthetic note with a colliding export filename.",
  source_platform: "note",
  capture_quality: "user_provided_full_text",
  extraction_method: "manual_note",
  captured_at: now - 40 * 60_000,
});

const tag = upsertTag("ux-v2-capture-settings", "manual");
for (const item of [
  duplicateExistingItem,
  fullTextItem,
  metadataOnlyItem,
  previewOnlyItem,
  pdfItem,
  noteItem,
]) {
  attachTagToItem(item.id, tag.id);
}

const collection = createCollection(
  "UX v2 Capture Settings Collection",
  "Synthetic collection for capture, settings, pairing, export, and provider-health QA.",
);
for (const item of [fullTextItem, metadataOnlyItem, pdfItem, noteItem]) {
  attachItemToCollection(item.id, collection.id);
}

const manifest = {
  dbPath: process.env.BRAIN_DB_PATH ?? "data/brain.sqlite",
  tagName: tag.name,
  collectionId: collection.id,
  itemIds: {
    duplicateExistingItem: duplicateExistingItem.id,
    fullTextItem: fullTextItem.id,
    metadataOnlyItem: metadataOnlyItem.id,
    previewOnlyItem: previewOnlyItem.id,
    pdfItem: pdfItem.id,
    noteItem: noteItem.id,
    exportCollisionOne: exportCollisionOne.id,
    exportCollisionTwo: exportCollisionTwo.id,
  },
  routes: {
    captureUrlPrefilled: `/capture?url=${encodeURIComponent(duplicateUrl)}`,
    capturePdf: "/capture?tab=pdf",
    captureNote: "/capture?tab=note",
    savedFullText: `/items/${fullTextItem.id}?capture_state=created_full_text`,
    savedMetadataOnly: `/items/${metadataOnlyItem.id}?capture_state=created_metadata_only`,
    savedPreviewOnly: `/items/${previewOnlyItem.id}?capture_state=created_preview_only`,
    duplicateExisting: `/items/${duplicateExistingItem.id}?capture_state=duplicate_existing`,
    savedWithIssue: `/items/${fullTextItem.id}?capture_state=error_with_saved_item`,
    pdfSaved: `/items/${pdfItem.id}?capture_state=created_full_text`,
    needsUpgrade: "/needs-upgrade",
    settings: "/settings",
    settingsTags: "/settings/tags",
    settingsCollections: "/settings/collections",
    devicePairing: "/settings/device-pairing",
    exportZip: "/api/library/export.zip",
    providerStatus: "/api/settings/provider-status",
  },
  nonScreenshotStates: {
    failedWithoutSavedItem:
      "Validated by API/form behavior only because no item detail page exists when capture saves nothing.",
  },
};

console.log(JSON.stringify(manifest, null, 2));
