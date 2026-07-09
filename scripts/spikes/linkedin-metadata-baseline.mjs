import { resolve } from "node:path";
import {
  RESULTS_DIR,
  buildScoreRow,
  candidateFromMetadata,
  cleanText,
  fetchText,
  flattenFixtures,
  parseHtml,
  printSummary,
  readFixtures,
  timestampSlug,
  writeJsonl,
} from "./capture-quality-lib.mjs";

const pastedSamples = [
  {
    id: "linkedin-paste-synthetic-1",
    url: "https://www.linkedin.com/posts/example_ai-capture-quality-activity-0000000000000000000-demo",
    title: "Synthetic LinkedIn post about capture quality",
    text: "I tested four ways to save web content into my personal knowledge base. The highest quality path for social posts was explicit user selection: URL, title, and the exact text I wanted to remember. Server fetches were useful as bookmarks, but not enough for deep recall.",
  },
  {
    id: "linkedin-paste-synthetic-2",
    url: "https://www.linkedin.com/posts/example_substack-youtube-linkedin-activity-0000000000000000001-demo",
    title: "Synthetic LinkedIn post about YouTube and Substack",
    text: "My capture flow needs to treat YouTube, YouTube Shorts, LinkedIn, and Substack differently. Video links need transcript status, Shorts need richer metadata, Substack needs RSS or email fallback, and LinkedIn should rely on user-provided text rather than scraping.",
  },
  {
    id: "linkedin-paste-synthetic-3",
    url: "https://www.linkedin.com/posts/example_manual-save-selection-activity-0000000000000000002-demo",
    title: "Synthetic LinkedIn post about manual save selection",
    text: "A generic Save Selection action feels safer and clearer than a site-specific LinkedIn importer. The user highlights the text they can see, Brain saves that text with the source URL, and the capture quality label says full text from selection.",
  },
];

const fixtures = flattenFixtures(await readFixtures(), ["linkedin"]);
const rows = [];

for (const fixture of fixtures) {
  const started = Date.now();
  try {
    const page = await fetchText(fixture.url);
    const parsed = parseHtml(page.final_url || fixture.url, page.text);
    const loginWall = /authwall|login|sign in|join linkedin|trk=guest/i.test(page.text);
    rows.push(
      buildScoreRow(
        {
          fixture_id: fixture.id,
          platform: "linkedin",
          url: fixture.url,
          candidate: "server_metadata",
          http_status: page.status,
          final_url: page.final_url,
          login_wall_indicators: loginWall,
          elapsed_ms: Date.now() - started,
        },
        {
          ...candidateFromMetadata(
            fixture.url,
            parsed.metadata,
            parsed.metadata.description || parsed.readability.body,
          ),
          extraction_warning: "metadata_only",
        },
      ),
    );
  } catch (error) {
    rows.push(
      buildScoreRow(
        {
          fixture_id: fixture.id,
          platform: "linkedin",
          url: fixture.url,
          candidate: "server_metadata",
          elapsed_ms: Date.now() - started,
        },
        {
          title: "",
          body: "",
          source_url: fixture.url,
          error_code: error.code ?? error.name ?? "error",
        },
      ),
    );
  }
}

for (const sample of pastedSamples) {
  rows.push(
    buildScoreRow(
      {
        fixture_id: sample.id,
        platform: "linkedin",
        url: sample.url,
        candidate: "user_paste",
        explicit_user_action: true,
        elapsed_ms: 0,
      },
      {
        title: sample.title,
        author: null,
        body: cleanText(sample.text),
        source_url: sample.url,
        extraction_warning: null,
      },
    ),
  );
}

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `linkedin-safe-capture-${stamp}.jsonl`);
await writeJsonl(jsonlPath, rows);
printSummary(rows, "candidate");
console.log(`wrote ${jsonlPath}`);
