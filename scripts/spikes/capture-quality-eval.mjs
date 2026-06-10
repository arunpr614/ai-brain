import { resolve } from "node:path";
import urlCapture from "../../src/lib/capture/url.ts";
import youtubeCapture from "../../src/lib/capture/youtube.ts";
import {
  RESULTS_DIR,
  buildScoreRow,
  fixtureVideoId,
  flattenFixtures,
  printSummary,
  readFixtures,
  timestampSlug,
  writeJson,
  writeJsonl,
} from "./capture-quality-lib.mjs";

const { extractArticleFromUrl } = urlCapture;
const { extractYoutubeVideo } = youtubeCapture;

async function captureFixture(fixture) {
  const started = Date.now();
  try {
    if (fixture.platform === "youtube" || fixture.platform === "youtube_shorts") {
      const videoId = fixtureVideoId(fixture.url);
      const captured = await extractYoutubeVideo(videoId, fixture.url);
      return buildScoreRow(
        {
          fixture_id: fixture.id,
          platform: fixture.platform,
          url: fixture.url,
          expected: fixture.expected,
          elapsed_ms: Date.now() - started,
        },
        captured,
      );
    }

    const captured = await extractArticleFromUrl(fixture.url);
    return buildScoreRow(
      {
        fixture_id: fixture.id,
        platform: fixture.platform,
        url: fixture.url,
        expected: fixture.expected,
        elapsed_ms: Date.now() - started,
      },
      {
        ...captured,
        description: captured.excerpt,
      },
    );
  } catch (error) {
    return buildScoreRow(
      {
        fixture_id: fixture.id,
        platform: fixture.platform,
        url: fixture.url,
        expected: fixture.expected,
        elapsed_ms: Date.now() - started,
      },
      {
        title: "",
        author: "",
        body: "",
        source_url: fixture.url,
        error_code: error.code ?? error.name ?? "error",
        extraction_warning: null,
      },
    );
  }
}

const fixtures = flattenFixtures(await readFixtures());
const rows = [];
for (const fixture of fixtures) {
  rows.push(await captureFixture(fixture));
}

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `capture-eval-${stamp}.jsonl`);
const summaryPath = resolve(RESULTS_DIR, `capture-eval-${stamp}.summary.json`);
await writeJsonl(jsonlPath, rows);
await writeJson(summaryPath, {
  generated_at: new Date().toISOString(),
  rows: rows.length,
  results_path: jsonlPath,
  quality_gate_status: captureQualityGateStatus(rows),
  quality_regression: captureQualityGateStatus(rows) !== "pass",
  summary_by_platform: rows.reduce((acc, row) => {
    const key = row.platform;
    acc[key] ??= { count: 0, failures: 0, score_total: 0 };
    acc[key].count += 1;
    acc[key].failures += row.success ? 0 : 1;
    acc[key].score_total += row.score ?? 0;
    return acc;
  }, {}),
});

printSummary(rows);
console.log(`[capture-quality] quality gate: ${captureQualityGateStatus(rows)}`);
console.log(`wrote ${jsonlPath}`);
console.log(`wrote ${summaryPath}`);

function captureQualityGateStatus(rows) {
  const youtubeRows = rows.filter((row) => row.platform === "youtube" || row.platform === "youtube_shorts");
  if (youtubeRows.length === 0) return "pass";
  const transcriptRows = youtubeRows.filter((row) =>
    row.success &&
    (row.capture_quality_guess === "transcript" ||
      row.capture_quality_guess === "full_text" ||
      row.capture_quality_guess === "user_provided_full_text" ||
      row.transcript_timestamp_count >= 5),
  );
  if (transcriptRows.length > 0) return "pass";
  if (youtubeRows.some((row) => row.success && row.capture_quality_guess === "metadata_only")) return "warn";
  return "fail";
}
