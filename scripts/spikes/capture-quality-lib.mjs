import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const FIXTURE_PATH = resolve(REPO_ROOT, "data/spikes/capture-quality/fixtures.json");
export const RESULTS_DIR = resolve(REPO_ROOT, "data/spikes/capture-quality/results");
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 AI-Brain-Spike/0.1";

export async function readFixtures(path = FIXTURE_PATH) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function flattenFixtures(fixtures, keys = Object.keys(fixtures)) {
  return keys.flatMap((platform) =>
    (fixtures[platform] ?? []).map((fixture) => ({
      platform,
      ...fixture,
    })),
  );
}

export function timestampSlug(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export async function writeJsonl(path, rows) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "en-US,en;q=0.9",
        ...(options.headers ?? {}),
      },
    });
    return {
      response,
      elapsed_ms: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url, options = {}, timeoutMs = 15000) {
  const { response, elapsed_ms } = await fetchWithTimeout(url, options, timeoutMs);
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    status_text: response.statusText,
    final_url: response.url,
    content_type: response.headers.get("content-type") ?? null,
    text,
    elapsed_ms,
  };
}

export async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const fetched = await fetchText(url, options, timeoutMs);
  if (!fetched.ok) return { ...fetched, json: null };
  try {
    return { ...fetched, json: JSON.parse(fetched.text) };
  } catch (error) {
    return { ...fetched, json: null, parse_error: error.message };
  }
}

export function parseHtml(url, html) {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const metadata = extractMetadata(document, url);
  const reader = new Readability(document.cloneNode(true));
  const article = reader.parse();
  const body = cleanText(article?.textContent ?? "");
  return {
    metadata,
    readability: {
      title: cleanText(article?.title ?? metadata.title ?? ""),
      author: cleanText(article?.byline ?? metadata.author ?? ""),
      excerpt: cleanText(article?.excerpt ?? metadata.description ?? ""),
      body,
      html_length: html.length,
      link_count: document.querySelectorAll("a[href]").length,
    },
    json_ld: extractJsonLd(document),
    alternate_feeds: [...document.querySelectorAll('link[rel~="alternate"]')]
      .map((node) => ({
        type: node.getAttribute("type") ?? "",
        href: absolutize(node.getAttribute("href") ?? "", url),
        title: node.getAttribute("title") ?? "",
      }))
      .filter((entry) => entry.href),
  };
}

export function extractMetadata(document, url) {
  const meta = (name) =>
    document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ??
    document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ??
    "";
  const canonical =
    document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  return {
    title: cleanText(meta("og:title") || meta("twitter:title") || document.title || ""),
    description: cleanText(
      meta("og:description") || meta("twitter:description") || meta("description") || "",
    ),
    author: cleanText(meta("author") || meta("article:author") || ""),
    published_at: cleanText(meta("article:published_time") || meta("date") || ""),
    image: absolutize(meta("og:image") || meta("twitter:image") || "", url),
    canonical_url: absolutize(canonical, url),
    site_name: cleanText(meta("og:site_name") || ""),
  };
}

export function extractJsonLd(document) {
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const parsed = [];
  for (const script of scripts) {
    const raw = script.textContent?.trim();
    if (!raw) continue;
    try {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) parsed.push(...value);
      else parsed.push(value);
    } catch {
      // Ignore invalid JSON-LD. The spike records field presence, not parser strictness.
    }
  }
  const flattened = parsed.flatMap((entry) => {
    if (entry?.["@graph"] && Array.isArray(entry["@graph"])) return entry["@graph"];
    return [entry];
  });
  return flattened.map((entry) => ({
    type: Array.isArray(entry?.["@type"]) ? entry["@type"].join(",") : entry?.["@type"] ?? "",
    headline: cleanText(entry?.headline ?? entry?.name ?? ""),
    author: jsonLdAuthor(entry?.author),
    datePublished: cleanText(entry?.datePublished ?? entry?.dateCreated ?? ""),
    description: cleanText(entry?.description ?? ""),
    url: cleanText(entry?.url ?? entry?.mainEntityOfPage?.["@id"] ?? ""),
    articleBody: cleanText(entry?.articleBody ?? ""),
  }));
}

function jsonLdAuthor(author) {
  if (!author) return "";
  if (typeof author === "string") return cleanText(author);
  if (Array.isArray(author)) return cleanText(author.map((entry) => entry?.name ?? entry).join(", "));
  return cleanText(author.name ?? "");
}

export function cleanText(text) {
  return String(text ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(text) {
  const clean = cleanText(text);
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

export function countTranscriptTimestamps(text) {
  return (text.match(/^\[\d{1,2}:\d{2}(?::\d{2})?\]/gm) ?? []).length;
}

export function guessCaptureQuality(row) {
  if (row.error_code || row.success === false) return "failed";
  const warning = row.extraction_warning ?? "";
  const body = row.body ?? "";
  const words = row.word_count ?? countWords(body);
  const transcriptCount =
    row.transcript_timestamp_count ?? countTranscriptTimestamps(body);
  if (row.explicit_user_action && words >= 20) return "user_provided_full_text";
  if (warning === "youtube_antibot_metadata_only") return "metadata_only";
  if (warning === "youtube_transcript_fetch_metadata_only") return "metadata_only";
  if (warning === "no_transcript") return "metadata_only";
  if (warning === "paywall_preview") return "paywall_preview";
  if (transcriptCount >= 10) return "transcript";
  if (words >= 500) return "full_text";
  if (words >= 120) return "preview";
  if (row.title_present && (row.author_present || row.description_present)) {
    return "metadata_only";
  }
  return words > 0 ? "weak_text" : "failed";
}

export function scoreCapture(row) {
  if (row.error_code || row.success === false) return 0;
  const quality = row.capture_quality_guess ?? guessCaptureQuality(row);
  const words = row.word_count ?? countWords(row.body ?? "");
  const metadataFields = [
    row.title_present,
    row.author_present,
    row.published_at_present,
    row.description_present,
    row.thumbnail_present,
  ].filter(Boolean).length;
  if (quality === "user_provided_full_text" && words >= 20) return 4;
  if (quality === "transcript" && words >= 500 && metadataFields >= 2) return 5;
  if (quality === "full_text" && words >= 800 && metadataFields >= 2) return 5;
  if ((quality === "transcript" || quality === "full_text") && words >= 250) return 4;
  if (quality === "preview" || quality === "paywall_preview") return 3;
  if (quality === "metadata_only" && row.title_present) return 2;
  if (words >= 30 || row.title_present) return 1;
  return 0;
}

export function buildScoreRow(base, candidate) {
  const body = cleanText(candidate.body ?? "");
  const row = {
    ...base,
    title: cleanText(candidate.title ?? ""),
    author: cleanText(candidate.author ?? ""),
    body,
    body_chars: body.length,
    word_count: countWords(body),
    title_present: Boolean(cleanText(candidate.title ?? "")),
    author_present: Boolean(cleanText(candidate.author ?? "")),
    source_url_present: Boolean(cleanText(candidate.source_url ?? base.url ?? "")),
    published_at_present: Boolean(cleanText(candidate.published_at ?? "")),
    thumbnail_present: Boolean(cleanText(candidate.thumbnail ?? candidate.image ?? "")),
    description_present: Boolean(cleanText(candidate.description ?? candidate.excerpt ?? "")),
    transcript_timestamp_count: countTranscriptTimestamps(body),
    link_count: candidate.link_count ?? 0,
    extraction_warning: candidate.extraction_warning ?? null,
    error_code: candidate.error_code ?? null,
    success: !candidate.error_code,
  };
  row.capture_quality_guess = guessCaptureQuality(row);
  row.score = scoreCapture(row);
  return row;
}

export function summarizeRows(rows, groupKey = "platform") {
  const groups = new Map();
  for (const row of rows) {
    const key = row[groupKey] ?? "unknown";
    const group =
      groups.get(key) ??
      {
        group: key,
        count: 0,
        successes: 0,
        failures: 0,
        avg_score: 0,
        avg_body_chars: 0,
        scores: [],
      };
    group.count += 1;
    if (row.success) group.successes += 1;
    else group.failures += 1;
    group.scores.push(row.score ?? 0);
    group.avg_score += row.score ?? 0;
    group.avg_body_chars += row.body_chars ?? 0;
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    avg_score: round(group.avg_score / group.count),
    avg_body_chars: Math.round(group.avg_body_chars / group.count),
  }));
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function printSummary(rows, groupKey = "platform") {
  console.table(summarizeRows(rows, groupKey));
}

export function absolutize(value, base) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

export function fixtureVideoId(url) {
  const parsed = new URL(url);
  if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
  if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] ?? "";
  return parsed.searchParams.get("v") ?? "";
}

export async function fetchYoutubeOEmbed(videoId) {
  const oembed = new URL("https://www.youtube.com/oembed");
  oembed.searchParams.set("format", "json");
  oembed.searchParams.set("url", `https://www.youtube.com/watch?v=${videoId}`);
  return await fetchJson(oembed.toString(), {}, 15000);
}

export async function fetchYoutubeDataApi(videoId, key) {
  if (!key) {
    return {
      skipped: true,
      reason: "YOUTUBE_DATA_API_KEY not set",
    };
  }
  const api = new URL("https://www.googleapis.com/youtube/v3/videos");
  api.searchParams.set("part", "snippet,contentDetails,status,statistics,player");
  api.searchParams.set("id", videoId);
  api.searchParams.set("key", key);
  return await fetchJson(api.toString(), {}, 15000);
}

export function selectArticleJsonLd(jsonLd) {
  return (
    jsonLd.find((entry) =>
      /article|blogposting|newsarticle/i.test(String(entry.type ?? "")),
    ) ?? jsonLd[0] ?? null
  );
}

export function candidateFromMetadata(url, metadata, body = "") {
  return {
    title: metadata.title,
    author: metadata.author || metadata.site_name || null,
    body,
    source_url: metadata.canonical_url || url,
    description: metadata.description,
    published_at: metadata.published_at,
    image: metadata.image,
  };
}

export function detectPaywall(text) {
  return /paid subscribers|this post is for paid|subscribe to keep reading|subscribe to continue reading|sign in to continue|subscriber-only|unlock this post|become a paid subscriber/i.test(
    text,
  );
}
