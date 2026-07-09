const dbPath = process.env.BRAIN_DB_PATH;
const itemId = process.env.A2_REPAIR_ITEM_ID;
const repairText = process.env.A2_REPAIR_TEXT;

if (!dbPath) {
  throw new Error("Set BRAIN_DB_PATH to the A2 repair validation database.");
}
if (!itemId) {
  throw new Error("Set A2_REPAIR_ITEM_ID to the repaired item id.");
}
if (!repairText) {
  throw new Error("Set A2_REPAIR_TEXT to the text submitted during repair.");
}

const validatedDbPath = dbPath;
const validatedItemId = itemId;
const validatedRepairText = repairText;

async function main() {
  const { listCollectionsForItem } = await import("@/db/collections");
  const { getItem, listNeedsUpgradeItems } = await import("@/db/items");
  const { listTagsForItem } = await import("@/db/tags");
  const { isLimitedCaptureQuality } = await import("@/lib/capture/quality");

  const item = getItem(validatedItemId);
  const tags = listTagsForItem(validatedItemId);
  const collections = listCollectionsForItem(validatedItemId);
  const stillNeedsUpgrade = listNeedsUpgradeItems({ limit: 500 }).some(
    (row) => row.id === validatedItemId,
  );

  const checks = [
    {
      name: "item exists",
      ok: Boolean(item),
    },
    {
      name: "body contains repair text",
      ok: Boolean(item?.body.includes(validatedRepairText)),
    },
    {
      name: "quality no longer limited",
      ok: Boolean(item && !isLimitedCaptureQuality(item.capture_quality)),
      value: item?.capture_quality,
    },
    {
      name: "removed from needs upgrade",
      ok: !stillNeedsUpgrade,
    },
    {
      name: "manual tag relation preserved",
      ok: tags.length >= 1,
      value: tags.map((tag) => tag.name),
    },
    {
      name: "collection relation preserved",
      ok: collections.length >= 1,
      value: collections.map((collection) => collection.name),
    },
  ];

  const report = {
    dbPath: validatedDbPath,
    itemId: validatedItemId,
    issueCount: checks.filter((check) => !check.ok).length,
    checks,
  };

  console.log(JSON.stringify(report, null, 2));

  if (report.issueCount > 0) {
    process.exitCode = 1;
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
