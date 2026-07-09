import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import {
  RESULTS_DIR,
  absolutize,
  buildScoreRow,
  candidateFromMetadata,
  cleanText,
  detectPaywall,
  fetchText,
  flattenFixtures,
  parseHtml,
  printSummary,
  readFixtures,
  selectArticleJsonLd,
  timestampSlug,
  writeJsonl,
} from "./capture-quality-lib.mjs";

function feedCandidates(url, alternateFeeds) {
  const parsed = new URL(url);
  const candidates = [
    `${parsed.protocol}//${parsed.host}/feed`,
    `${parsed.protocol}//${parsed.host}/feed/`,
    ...alternateFeeds
      .filter((feed) => /rss|atom|xml/i.test(feed.type) || /feed/i.test(feed.href))
      .map((feed) => feed.href),
  ];
  return [...new Set(candidates.filter(Boolean))];
}

function parseFeed(feedUrl, xml) {
  const dom = new JSDOM(xml, { contentType: "text/xml", url: feedUrl });
  const doc = dom.window.document;
  const nodes = [...doc.querySelectorAll("item, entry")];
  return nodes.map((node) => {
    const pick = (name) => cleanText(node.getElementsByTagName(name)?.[0]?.textContent ?? "");
    const linkNode = node.getElementsByTagName("link")?.[0];
    const href = linkNode?.getAttribute("href") ?? linkNode?.textContent ?? "";
    const encoded =
      node.getElementsByTagName("content:encoded")?.[0]?.textContent ??
      node.getElementsByTagName("content")?.[0]?.textContent ??
      "";
    const description = pick("description") || pick("summary");
    const contentHtml = encoded || description;
    const contentText = contentHtml ? cleanText(new JSDOM(contentHtml).window.document.body.textContent ?? "") : "";
    return {
      title: pick("title"),
      author: pick("dc:creator") || pick("author"),
      published_at: pick("pubDate") || pick("published") || pick("updated"),
      url: absolutize(cleanText(href), feedUrl),
      guid: pick("guid") || pick("id"),
      description: cleanText(new JSDOM(description).window.document.body.textContent ?? description),
      body: contentText,
    };
  });
}

function slugish(value) {
  try {
    const url = new URL(value);
    return url.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop() ?? "";
  } catch {
    return String(value).replace(/\/$/, "").split("/").filter(Boolean).pop() ?? "";
  }
}

function matchFeedEntry(url, entries, canonical = "") {
  const targets = new Set([url, canonical].filter(Boolean).map((value) => value.replace(/\/$/, "")));
  const slug = slugish(url);
  return (
    entries.find((entry) => targets.has((entry.url || entry.guid).replace(/\/$/, ""))) ??
    entries.find((entry) => slug && (entry.url.includes(slug) || entry.guid.includes(slug))) ??
    null
  );
}

const fixtures = flattenFixtures(await readFixtures(), ["substack"]);
const rows = [];

for (const fixture of fixtures) {
  const started = Date.now();
  try {
    const page = await fetchText(fixture.url);
    const parsed = parseHtml(page.final_url || fixture.url, page.text);
    const articleLd = selectArticleJsonLd(parsed.json_ld);
    const candidates = feedCandidates(page.final_url || fixture.url, parsed.alternate_feeds);
    let feedResult = null;
    let feedEntries = [];
    for (const feedUrl of candidates) {
      try {
        const feed = await fetchText(feedUrl);
        if (!feed.ok) continue;
        const entries = parseFeed(feed.final_url || feedUrl, feed.text);
        const matched = matchFeedEntry(
          page.final_url || fixture.url,
          entries,
          parsed.metadata.canonical_url,
        );
        if (matched) {
          feedResult = { feed_url: feed.final_url || feedUrl, matched };
          feedEntries = entries;
          break;
        }
        if (entries.length > 0 && feedEntries.length === 0) feedEntries = entries;
      } catch {
        // Continue through other discovery options.
      }
    }

    const paywall =
      detectPaywall(parsed.readability.body) ||
      detectPaywall(feedResult?.matched?.body ?? "");

    const base = {
      fixture_id: fixture.id,
      platform: "substack",
      url: fixture.url,
      final_url: page.final_url,
      http_status: page.status,
      feed_discovered: candidates.length > 0,
      feed_url: feedResult?.feed_url ?? null,
      feed_entry_count: feedEntries.length,
      rss_entry_matched: Boolean(feedResult?.matched),
      json_ld_count: parsed.json_ld.length,
      suspected_paywall: paywall,
      elapsed_ms: Date.now() - started,
    };

    rows.push(
      buildScoreRow(
        { ...base, candidate: "readability" },
        {
          ...candidateFromMetadata(fixture.url, parsed.metadata, parsed.readability.body),
          author: parsed.readability.author || parsed.metadata.author,
          excerpt: parsed.readability.excerpt,
          link_count: parsed.readability.link_count,
          extraction_warning: paywall ? "paywall_preview" : null,
        },
      ),
    );

    rows.push(
      buildScoreRow(
        { ...base, candidate: "rss_entry" },
        feedResult?.matched
          ? {
              ...feedResult.matched,
              source_url: feedResult.matched.url || fixture.url,
              extraction_warning: paywall ? "paywall_preview" : null,
            }
          : {
              title: parsed.metadata.title,
              body: "",
              source_url: fixture.url,
              error_code: "rss_entry_not_found",
            },
      ),
    );

    rows.push(
      buildScoreRow(
        { ...base, candidate: "json_ld" },
        articleLd
          ? {
              title: articleLd.headline,
              author: articleLd.author,
              body: articleLd.articleBody || articleLd.description,
              description: articleLd.description,
              published_at: articleLd.datePublished,
              source_url: articleLd.url || fixture.url,
              extraction_warning: paywall ? "paywall_preview" : null,
            }
          : {
              title: parsed.metadata.title,
              body: "",
              source_url: fixture.url,
              error_code: "json_ld_article_not_found",
            },
      ),
    );

    const candidatesByQuality = rows
      .filter((row) => row.fixture_id === fixture.id && row.success)
      .sort((a, b) => b.score - a.score || b.body_chars - a.body_chars);
    const best = candidatesByQuality[0];
    if (best) rows.push({ ...best, candidate: "best_of_ladder" });
  } catch (error) {
    rows.push(
      buildScoreRow(
        {
          fixture_id: fixture.id,
          platform: "substack",
          url: fixture.url,
          candidate: "page_fetch",
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

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `substack-extraction-ladder-${stamp}.jsonl`);
await writeJsonl(jsonlPath, rows);
printSummary(rows, "candidate");
console.log(`wrote ${jsonlPath}`);
