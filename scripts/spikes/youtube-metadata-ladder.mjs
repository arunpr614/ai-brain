import { resolve } from "node:path";
import youtubeCapture from "../../src/lib/capture/youtube.ts";
import {
  RESULTS_DIR,
  buildScoreRow,
  cleanText,
  fetchYoutubeDataApi,
  fetchYoutubeOEmbed,
  fixtureVideoId,
  flattenFixtures,
  printSummary,
  readFixtures,
  timestampSlug,
  writeJsonl,
} from "./capture-quality-lib.mjs";

const { extractYoutubeVideo } = youtubeCapture;

function parseIsoDurationSeconds(raw) {
  if (!raw) return null;
  const match = raw.match(/^P(?:([0-9]+)D)?T?(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?$/);
  if (!match) return null;
  const [, days = "0", hours = "0", minutes = "0", seconds = "0"] = match;
  return (
    Number(days) * 86400 +
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds)
  );
}

function dataApiMetadata(json) {
  const item = json?.items?.[0];
  if (!item) return null;
  const snippet = item.snippet ?? {};
  return {
    title: cleanText(snippet.title ?? ""),
    author: cleanText(snippet.channelTitle ?? ""),
    description: cleanText(snippet.description ?? ""),
    published_at: cleanText(snippet.publishedAt ?? ""),
    thumbnail:
      snippet.thumbnails?.maxres?.url ??
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.default?.url ??
      "",
    duration_seconds: parseIsoDurationSeconds(item.contentDetails?.duration),
    privacy_status: item.status?.privacyStatus ?? "",
    embeddable: item.status?.embeddable ?? null,
    view_count: item.statistics?.viewCount ?? "",
    tags: Array.isArray(snippet.tags) ? snippet.tags.slice(0, 12) : [],
  };
}

function metadataHeader(metadata) {
  const lines = [
    metadata.title ? `Title: ${metadata.title}` : "",
    metadata.author ? `Channel: ${metadata.author}` : "",
    metadata.published_at ? `Published: ${metadata.published_at}` : "",
    metadata.duration_seconds !== null && metadata.duration_seconds !== undefined
      ? `Duration: ${metadata.duration_seconds} seconds`
      : "",
    metadata.view_count ? `Views: ${metadata.view_count}` : "",
    metadata.tags?.length ? `Tags: ${metadata.tags.join(", ")}` : "",
    metadata.description ? `Description: ${metadata.description}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

const fixtures = flattenFixtures(await readFixtures(), ["youtube", "youtube_shorts"]);
const rows = [];
const dataApiKey = process.env.YOUTUBE_DATA_API_KEY ?? "";

for (const fixture of fixtures) {
  const started = Date.now();
  const videoId = fixtureVideoId(fixture.url);
  let current = null;
  let currentError = null;
  try {
    current = await extractYoutubeVideo(videoId, fixture.url);
  } catch (error) {
    currentError = error;
  }

  const oembed = await fetchYoutubeOEmbed(videoId);
  const dataApi = await fetchYoutubeDataApi(videoId, dataApiKey);
  const dataMeta = dataApi.json ? dataApiMetadata(dataApi.json) : null;
  const oembedMeta = oembed.json
    ? {
        title: cleanText(oembed.json.title ?? ""),
        author: cleanText(oembed.json.author_name ?? ""),
        description: "",
        published_at: "",
        thumbnail: cleanText(oembed.json.thumbnail_url ?? ""),
        duration_seconds: null,
        tags: [],
      }
    : null;
  const bestMeta = {
    ...(oembedMeta ?? {}),
    ...(current
      ? {
          title: current.title,
          author: current.author ?? oembedMeta?.author ?? "",
          duration_seconds: current.duration_seconds ?? oembedMeta?.duration_seconds ?? null,
        }
      : {}),
    ...(dataMeta ?? {}),
  };

  const base = {
    fixture_id: fixture.id,
    platform: fixture.platform,
    video_id: videoId,
    url: fixture.url,
    elapsed_ms: Date.now() - started,
    oembed_status: oembed.status ?? null,
    data_api_status: dataApi.status ?? null,
    data_api_skipped: Boolean(dataApi.skipped),
    data_api_skip_reason: dataApi.reason ?? null,
    data_api_fields_present: Boolean(dataMeta),
    current_error: currentError?.code ?? null,
  };

  rows.push(
    buildScoreRow(
      { ...base, candidate: "current_capture" },
      current ?? {
        title: oembedMeta?.title ?? "",
        author: oembedMeta?.author ?? "",
        body: "",
        source_url: fixture.url,
        error_code: currentError?.code ?? "capture_failed",
      },
    ),
  );

  const header = metadataHeader(bestMeta);
  rows.push(
    buildScoreRow(
      { ...base, candidate: "metadata_header_plus_current_body" },
      {
        title: bestMeta.title ?? "",
        author: bestMeta.author ?? "",
        description: bestMeta.description ?? "",
        published_at: bestMeta.published_at ?? "",
        thumbnail: bestMeta.thumbnail ?? "",
        body: [header, current?.body ?? ""].filter(Boolean).join("\n\n"),
        source_url: fixture.url,
        extraction_warning: current?.extraction_warning ?? null,
      },
    ),
  );

  rows.push(
    buildScoreRow(
      { ...base, candidate: "metadata_only" },
      {
        title: bestMeta.title ?? "",
        author: bestMeta.author ?? "",
        description: bestMeta.description ?? "",
        published_at: bestMeta.published_at ?? "",
        thumbnail: bestMeta.thumbnail ?? "",
        body: header || "[No metadata available]",
        source_url: fixture.url,
        extraction_warning: "metadata_only",
      },
    ),
  );
}

const stamp = timestampSlug();
const jsonlPath = resolve(RESULTS_DIR, `youtube-metadata-ladder-${stamp}.jsonl`);
await writeJsonl(jsonlPath, rows);
printSummary(rows, "candidate");
console.log(`YOUTUBE_DATA_API_KEY ${dataApiKey ? "present" : "not set; partial mode"}`);
console.log(`wrote ${jsonlPath}`);
