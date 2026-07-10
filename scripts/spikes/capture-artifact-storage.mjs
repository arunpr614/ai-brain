import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Database from "better-sqlite3";
import {
  REPO_ROOT,
  fetchText,
  fetchYoutubeOEmbed,
  fixtureVideoId,
  flattenFixtures,
  readFixtures,
  timestampSlug,
  writeJson,
} from "./capture-quality-lib.mjs";

const root = resolve(REPO_ROOT, "data/spikes/capture-artifacts");
const stamp = timestampSlug();
const runDir = resolve(root, `run-${stamp}`);
const artifactRoot = resolve(runDir, "artifacts");
const dbPath = resolve(runDir, "spike.sqlite");
const sqlPath = resolve(root, "014_capture_artifacts_prototype.sql");
await mkdir(artifactRoot, { recursive: true });
await writeFile(
  sqlPath,
  `CREATE TABLE IF NOT EXISTS capture_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_capture_artifacts_item_id ON capture_artifacts(item_id);
`,
);

const db = new Database(dbPath);
db.exec(`
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_platform TEXT NOT NULL
);
CREATE TABLE capture_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  source_platform TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
);
`);

const insertItem = db.prepare(
  "INSERT INTO items (title, source_url, source_platform) VALUES (?, ?, ?)",
);
const insertArtifact = db.prepare(
  "INSERT INTO capture_artifacts (item_id, kind, source_platform, relative_path, byte_size) VALUES (?, ?, ?, ?, ?)",
);

async function writeArtifact(itemId, platform, kind, filename, content) {
  const relativePath = `${itemId}/${filename}`;
  const fullPath = resolve(artifactRoot, relativePath);
  await mkdir(resolve(artifactRoot, String(itemId)), { recursive: true });
  await writeFile(fullPath, content);
  const size = (await stat(fullPath)).size;
  insertArtifact.run(itemId, kind, platform, relativePath, size);
  return size;
}

const fixtures = await readFixtures();
const selected = [
  ...flattenFixtures(fixtures, ["youtube", "youtube_shorts"]).slice(0, 5),
  ...flattenFixtures(fixtures, ["substack"]).slice(0, 5),
  ...flattenFixtures(fixtures, ["linkedin"]).slice(0, 3),
];
const itemStats = [];

for (const fixture of selected) {
  const platform = fixture.platform.startsWith("youtube") ? "youtube" : fixture.platform;
  const itemId = Number(insertItem.run(fixture.id, fixture.url, platform).lastInsertRowid);
  const sizes = [];
  if (platform === "youtube") {
    const videoId = fixtureVideoId(fixture.url);
    const oembed = await fetchYoutubeOEmbed(videoId);
    sizes.push(
      await writeArtifact(
        itemId,
        platform,
        "youtube_oembed_json",
        "oembed.json",
        JSON.stringify(oembed.json ?? { status: oembed.status, error: oembed.status_text }, null, 2),
      ),
    );
  } else {
    try {
      const page = await fetchText(fixture.url);
      sizes.push(await writeArtifact(itemId, platform, "html", "page.html", page.text));
      sizes.push(
        await writeArtifact(
          itemId,
          platform,
          "response_metadata_json",
          "response.json",
          JSON.stringify(
            {
              status: page.status,
              final_url: page.final_url,
              content_type: page.content_type,
              elapsed_ms: page.elapsed_ms,
            },
            null,
            2,
          ),
        ),
      );
    } catch (error) {
      sizes.push(
        await writeArtifact(
          itemId,
          platform,
          "fetch_error_json",
          "error.json",
          JSON.stringify({ error: error.message }, null, 2),
        ),
      );
    }
  }
  itemStats.push({
    item_id: itemId,
    fixture_id: fixture.id,
    platform,
    artifact_bytes: sizes.reduce((sum, size) => sum + size, 0),
    artifact_count: sizes.length,
  });
}

const deleted = itemStats[0];
if (deleted) {
  db.prepare("DELETE FROM items WHERE id = ?").run(deleted.item_id);
  const orphanRows = db
    .prepare("SELECT COUNT(*) AS count FROM capture_artifacts WHERE item_id = ?")
    .get(deleted.item_id).count;
  await rm(resolve(artifactRoot, String(deleted.item_id)), { recursive: true, force: true });
  deleted.deleted_for_cleanup_check = true;
  deleted.db_rows_after_item_delete = orphanRows;
  deleted.file_cleanup_strategy = "application deletes artifact directory after deleting item";
}

const artifactRows = db.prepare("SELECT source_platform, COUNT(*) AS count, SUM(byte_size) AS bytes FROM capture_artifacts GROUP BY source_platform").all();
const dbBytes = (await stat(dbPath)).size;
const totalBytes = itemStats.reduce((sum, item) => sum + item.artifact_bytes, 0);
const report = {
  generated_at: new Date().toISOString(),
  run_dir: runDir,
  db_path: dbPath,
  prototype_sql_path: sqlPath,
  items_sampled: itemStats.length,
  total_artifact_bytes_before_cleanup: totalBytes,
  average_artifact_bytes_per_item: Math.round(totalBytes / itemStats.length),
  max_artifact_bytes_per_item: Math.max(...itemStats.map((item) => item.artifact_bytes)),
  sqlite_db_bytes: dbBytes,
  artifact_rows_by_platform: artifactRows,
  deletion_check: deleted,
  item_stats: itemStats,
};

const reportPath = resolve(runDir, "artifact-storage-summary.json");
await writeJson(reportPath, report);
db.close();
console.log(JSON.stringify(report, null, 2));
