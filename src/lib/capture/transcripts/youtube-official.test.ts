import "./youtube-official.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./youtube-official.test.setup";
import { getItem, insertCaptured } from "@/db/items";
import {
  listCapturePolicyDecisionsForItem,
  listTranscriptSegmentsForSource,
  listTranscriptSourcesForItem,
} from "@/db/transcripts";
import {
  attachOfficialYoutubeCaptionToYoutubeItem,
  OfficialYoutubeCaptionError,
} from "./youtube-official";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

const VIDEO_ID = "abcDEF12345";
const TOKEN = "ya29.test-secret-token";

interface FetchCall {
  url: string;
  init?: RequestInit;
}

function insertYoutubeItem(overrides: Partial<Parameters<typeof insertCaptured>[0]> = {}) {
  return insertCaptured({
    source_type: "youtube",
    source_url: `https://www.youtube.com/watch?v=${VIDEO_ID}`,
    title: "Official captions metadata-only video",
    body: "Metadata-only placeholder",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
    ...overrides,
  });
}

function longVttText(): string {
  return `WEBVTT

00:00:01.000 --> 00:00:04.000
This official YouTube caption cue contains enough product discovery context, customer workflow detail, architecture tradeoff notes, validation evidence, and rollout risk language for the repaired item to be useful in search and Ask.

00:00:05.000 --> 00:00:09.000
The second official caption cue adds implementation sequencing, source provenance, token hygiene, transcript segment storage, and future OAuth gating details so the parser has more than enough useful text.
`;
}

function malformedVttText(): string {
  return "WEBVTT\n\nNOTE no cues";
}

function captionResource(input: {
  id: string;
  videoId?: string;
  language?: string;
  trackKind?: string;
  status?: string;
  isDraft?: boolean;
  name?: string;
}) {
  return {
    id: input.id,
    snippet: {
      videoId: input.videoId ?? VIDEO_ID,
      language: input.language ?? "en",
      trackKind: input.trackKind ?? "standard",
      name: input.name ?? "English",
      isAutoSynced: false,
      isCC: true,
      isDraft: input.isDraft ?? false,
      status: input.status ?? "serving",
    },
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function vttResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, {
    headers: { "content-type": "text/vtt" },
    ...init,
  });
}

function mockFetch(responses: Response[]) {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call");
    }
    return response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function authHeader(call: FetchCall): string | null {
  const headers = call.init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get("Authorization");
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === "authorization");
    return found?.[1] ?? null;
  }
  const record = headers as Record<string, string>;
  return record.Authorization ?? record.authorization ?? null;
}

function assertItemUnchanged(itemId: string): void {
  const item = getItem(itemId)!;
  assert.equal(item.body, "Metadata-only placeholder");
  assert.equal(item.capture_quality, "metadata_only");
  assert.equal(item.extraction_warning, "no_transcript");
  assert.equal(listTranscriptSourcesForItem(itemId).length, 0);
}

test("imports an authorized English standard caption with truthful item metadata and token-free provenance", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl, calls } = mockFetch([
    jsonResponse({
      items: [
        captionResource({ id: "cap-es", language: "es", name: "Spanish" }),
        captionResource({ id: "cap-en", language: "en", trackKind: "standard" }),
      ],
    }),
    vttResponse(longVttText()),
  ]);

  const result = await attachOfficialYoutubeCaptionToYoutubeItem({
    itemId: item.id,
    accessToken: TOKEN,
    rightsBasis: "authorized_youtube_video",
    fetchImpl,
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/youtube\/v3\/captions\?part=snippet&videoId=abcDEF12345$/);
  assert.match(calls[1].url, /\/youtube\/v3\/captions\/cap-en\?tfmt=vtt$/);
  assert.equal(authHeader(calls[0]), `Bearer ${TOKEN}`);
  assert.equal(authHeader(calls[1]), `Bearer ${TOKEN}`);

  const updated = getItem(item.id)!;
  assert.equal(updated.capture_quality, "metadata_plus_transcript");
  assert.equal(updated.extraction_method, "youtube_official_caption");
  assert.equal(updated.extraction_warning, null);
  assert.match(updated.body, /official YouTube caption cue/);

  assert.equal(result.liveSmokeStatus, "not_run");
  assert.equal(result.selectedTrack.id, "cap-en");
  assert.equal(result.transcriptSource.source_kind, "youtube_official_caption");
  assert.equal(result.transcriptSource.caption_source_class, "standard");
  assert.equal(result.transcriptSource.language_code, "en");
  assert.equal(result.transcriptSource.segment_count, 2);

  const policies = listCapturePolicyDecisionsForItem(item.id);
  assert.equal(policies.length, 1);
  assert.equal(policies[0].rights_basis, "authorized_youtube_video");
  assert.equal(policies[0].method, "youtube_official_caption");
  assert.equal(policies[0].retention_class, "full_text_allowed");

  const provenance = JSON.parse(result.transcriptSource.provenance_json) as Record<string, unknown>;
  assert.equal(provenance.adapter, "youtube-official-captions-v1");
  assert.equal(provenance.videoId, VIDEO_ID);
  assert.equal(provenance.captionId, "cap-en");
  assert.equal(JSON.stringify(provenance).includes(TOKEN), false);
  assert.equal(JSON.stringify(provenance).includes("Authorization"), false);

  const segments = listTranscriptSegmentsForSource(result.transcriptSource.id);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].start_ms, 1000);
  assert.equal(segments[0].end_ms, 4000);
  assert.match(segments[0].text, /product discovery context/);
});

test("ranking prefers a matching standard track over ASR", async () => {
  const item = insertYoutubeItem({
    source_url: "https://www.youtube.com/watch?v=abcDEF12345&feature=share",
  });
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [
        captionResource({ id: "cap-asr", language: "en", trackKind: "ASR" }),
        captionResource({ id: "cap-standard", language: "en", trackKind: "standard" }),
      ],
    }),
    vttResponse(longVttText()),
  ]);

  const result = await attachOfficialYoutubeCaptionToYoutubeItem({
    itemId: item.id,
    accessToken: TOKEN,
    rightsBasis: "owned_youtube_channel",
    fetchImpl,
  });

  assert.equal(result.selectedTrack.id, "cap-standard");
  assert.equal(result.transcriptSource.caption_source_class, "standard");
});

test("default language preference chooses English from multilingual tracks", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [
        captionResource({ id: "cap-fr", language: "fr", name: "French" }),
        captionResource({ id: "cap-en-us", language: "en-US", name: "English US" }),
      ],
    }),
    vttResponse(longVttText()),
  ]);

  const result = await attachOfficialYoutubeCaptionToYoutubeItem({
    itemId: item.id,
    accessToken: TOKEN,
    rightsBasis: "authorized_youtube_video",
    fetchImpl,
  });

  assert.equal(result.selectedTrack.id, "cap-en-us");
  assert.equal(result.transcriptSource.language_code, "en-us");
});

test("includeAsr=false rejects ASR-only tracks without mutating item text", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl, calls } = mockFetch([
    jsonResponse({
      items: [captionResource({ id: "cap-asr", language: "en", trackKind: "ASR" })],
    }),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      includeAsr: false,
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "no_usable_caption_track",
  );

  assert.equal(calls.length, 1);
  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("candidate tracks for a different video are rejected", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [
        captionResource({
          id: "wrong-video-caption",
          videoId: "zzzZZZ99999",
          language: "en",
        }),
      ],
    }),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "no_usable_caption_track",
  );

  assertItemUnchanged(item.id);
});

test("empty captions.list responses return no_caption_tracks without transcript mutation", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([jsonResponse({ items: [] })]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "no_caption_tracks",
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("draft caption tracks are rejected without transcript mutation", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [captionResource({ id: "draft-caption", isDraft: true })],
    }),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "no_usable_caption_track",
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("non-serving caption tracks are rejected without transcript mutation", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [
        captionResource({ id: "syncing-caption", status: "syncing" }),
        captionResource({ id: "failed-caption", status: "failed" }),
      ],
    }),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "no_usable_caption_track",
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("captions.list 403 keeps token-like response bodies out of errors and leaves item unchanged", async () => {
  const item = insertYoutubeItem();
  const tokenLikeBody = { error: `forbidden ${TOKEN}` };
  const { fetchImpl } = mockFetch([jsonResponse(tokenLikeBody, { status: 403 })]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) => {
      assert.ok(err instanceof OfficialYoutubeCaptionError);
      assert.equal(err.code, "caption_list_failed");
      assert.equal(err.message.includes(TOKEN), false);
      return true;
    },
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("captions.download 403 leaves item body, source, and segments unchanged", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [captionResource({ id: "cap-en", language: "en" })],
    }),
    jsonResponse({ error: `download forbidden ${TOKEN}` }, { status: 403 }),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) => {
      assert.ok(err instanceof OfficialYoutubeCaptionError);
      assert.equal(err.code, "caption_download_failed");
      assert.equal(err.message.includes(TOKEN), false);
      return true;
    },
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("malformed downloaded VTT leaves item body, source, and segments unchanged", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl } = mockFetch([
    jsonResponse({
      items: [captionResource({ id: "cap-en", language: "en" })],
    }),
    vttResponse(malformedVttText()),
  ]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "caption_parse_failed",
  );

  assertItemUnchanged(item.id);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
});

test("non-YouTube items are rejected before policy or network work", async () => {
  const item = insertCaptured({
    source_type: "url",
    source_url: "https://example.com/article",
    title: "Article",
    body: "Article body",
    source_platform: "generic_article",
    capture_quality: "metadata_only",
  });
  const { fetchImpl, calls } = mockFetch([]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: TOKEN,
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "not_youtube_item",
  );

  assert.equal(calls.length, 0);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
});

test("missing token is rejected before policy or network work", async () => {
  const item = insertYoutubeItem();
  const { fetchImpl, calls } = mockFetch([]);

  await assert.rejects(
    attachOfficialYoutubeCaptionToYoutubeItem({
      itemId: item.id,
      accessToken: "   ",
      rightsBasis: "authorized_youtube_video",
      fetchImpl,
    }),
    (err) =>
      err instanceof OfficialYoutubeCaptionError &&
      err.code === "missing_access_token",
  );

  assert.equal(calls.length, 0);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
});
