import { resolve } from "node:path";
import {
  RESULTS_DIR,
  buildScoreRow,
  candidateFromMetadata,
  cleanText,
  fetchJson,
  fetchText,
  flattenFixtures,
  parseHtml,
  printSummary,
  readFixtures,
  timestampSlug,
  writeJsonl,
} from "./capture-quality-lib.mjs";

async function localReadability(fixture) {
  const page = await fetchText(fixture.url);
  const parsed = parseHtml(page.final_url || fixture.url, page.text);
  return {
    provider: "local_readability",
    http_status: page.status,
    elapsed_ms: page.elapsed_ms,
    candidate: {
      ...candidateFromMetadata(fixture.url, parsed.metadata, parsed.readability.body),
      author: parsed.readability.author || parsed.metadata.author,
      description: parsed.readability.excerpt || parsed.metadata.description,
      link_count: parsed.readability.link_count,
    },
  };
}

async function jinaReader(fixture) {
  const readerUrl = `https://r.jina.ai/${fixture.url}`;
  const page = await fetchText(readerUrl, {
    headers: {
      accept: "text/plain",
      "x-no-cache": "true",
      "x-respond-with": "markdown",
    },
  }, 30000);
  const lines = page.text.split("\n");
  const titleLine = lines.find((line) => /^Title:/i.test(line));
  return {
    provider: "jina_reader",
    http_status: page.status,
    elapsed_ms: page.elapsed_ms,
    candidate: {
      title: cleanText(titleLine?.replace(/^Title:\s*/i, "") ?? ""),
      author: null,
      body: cleanText(page.text),
      source_url: fixture.url,
      description: "",
    },
  };
}

async function firecrawl(fixture) {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return {
      provider: "firecrawl",
      skipped: true,
      reason: "FIRECRAWL_API_KEY not set",
      candidate: { title: "", body: "", source_url: fixture.url, error_code: "provider_skipped" },
    };
  }
  const response = await fetchJson(
    "https://api.firecrawl.dev/v2/scrape",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: fixture.url, formats: ["markdown", "html"] }),
    },
    45000,
  );
  const data = response.json?.data ?? response.json;
  return {
    provider: "firecrawl",
    http_status: response.status,
    elapsed_ms: response.elapsed_ms,
    candidate: {
      title: cleanText(data?.metadata?.title ?? ""),
      author: cleanText(data?.metadata?.author ?? ""),
      body: cleanText(data?.markdown ?? ""),
      source_url: fixture.url,
      description: cleanText(data?.metadata?.description ?? ""),
    },
  };
}

async function browserless(fixture) {
  const endpoint = process.env.BROWSERLESS_ENDPOINT;
  const token = process.env.BROWSERLESS_TOKEN;
  if (!endpoint || !token) {
    return {
      provider: "browserless",
      skipped: true,
      reason: "BROWSERLESS_ENDPOINT/BROWSERLESS_TOKEN not set",
      candidate: { title: "", body: "", source_url: fixture.url, error_code: "provider_skipped" },
    };
  }
  return {
    provider: "browserless",
    skipped: true,
    reason: "endpoint configured but spike does not run remote browser execution without an explicit script review",
    candidate: { title: "", body: "", source_url: fixture.url, error_code: "provider_skipped" },
  };
}

const fixturesRaw = await readFixtures();
const fixtures = [
  ...flattenFixtures(fixturesRaw, ["substack"]).slice(0, 5),
  ...flattenFixtures(fixturesRaw, ["generic"]),
  ...flattenFixtures(fixturesRaw, ["js_heavy"]),
];
const rows = [];

for (const fixture of fixtures) {
  for (const provider of [localReadability, jinaReader, firecrawl, browserless]) {
    const started = Date.now();
    try {
      const result = await provider(fixture);
      rows.push(
        buildScoreRow(
          {
            fixture_id: fixture.id,
            platform: fixture.platform,
            url: fixture.url,
            provider: result.provider,
            skipped: Boolean(result.skipped),
            skip_reason: result.reason ?? null,
            http_status: result.http_status ?? null,
            elapsed_ms: result.elapsed_ms ?? Date.now() - started,
          },
          result.candidate,
        ),
      );
    } catch (error) {
      rows.push(
        buildScoreRow(
          {
            fixture_id: fixture.id,
            platform: fixture.platform,
            url: fixture.url,
            provider: provider.name,
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
}

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `extraction-provider-benchmark-${stamp}.jsonl`);
await writeJsonl(jsonlPath, rows);
printSummary(rows, "provider");
console.log(`FIRECRAWL_API_KEY ${process.env.FIRECRAWL_API_KEY ? "present" : "not set; skipped"}`);
console.log(`BROWSERLESS ${process.env.BROWSERLESS_ENDPOINT && process.env.BROWSERLESS_TOKEN ? "configured; remote execution intentionally skipped" : "not configured; skipped"}`);
console.log(`wrote ${jsonlPath}`);
