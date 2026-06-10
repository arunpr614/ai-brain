import "../../db/items.test.setup";

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchYoutubeDataApiMetadata } from "./youtube-metadata";

let originalFetch: typeof fetch;
let originalKey: string | undefined;
let originalTimeout: string | undefined;
let originalTtl: string | undefined;

const apiPayload = {
  items: [
    {
      snippet: {
        title: "Cached title",
        channelTitle: "Cached channel",
        description: "Description",
        publishedAt: "2026-01-01T00:00:00Z",
        thumbnails: {
          high: { url: "https://i.ytimg.com/high.jpg" },
        },
      },
      contentDetails: {
        duration: "PT1M05S",
      },
    },
  ],
};

describe("YouTube Data API metadata", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalKey = process.env.YOUTUBE_DATA_API_KEY;
    originalTimeout = process.env.YOUTUBE_DATA_API_TIMEOUT_MS;
    originalTtl = process.env.YOUTUBE_DATA_API_CACHE_TTL_MS;
    process.env.YOUTUBE_DATA_API_KEY = "test-key";
    process.env.YOUTUBE_DATA_API_TIMEOUT_MS = "3000";
    process.env.YOUTUBE_DATA_API_CACHE_TTL_MS = "60000";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreEnv("YOUTUBE_DATA_API_KEY", originalKey);
    restoreEnv("YOUTUBE_DATA_API_TIMEOUT_MS", originalTimeout);
    restoreEnv("YOUTUBE_DATA_API_CACHE_TTL_MS", originalTtl);
  });

  it("caches successful metadata responses by video id", async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json(apiPayload);
    };

    const first = await fetchYoutubeDataApiMetadata("cache-hit-video");
    assert.equal(first?.title, "Cached title");
    assert.equal(first?.durationSeconds, 65);

    globalThis.fetch = async () => {
      throw new Error("network should not be called on cache hit");
    };
    const second = await fetchYoutubeDataApiMetadata("cache-hit-video");
    assert.equal(second?.title, "Cached title");
    assert.equal(calls, 1);
  });

  it("returns null on timeout", async () => {
    process.env.YOUTUBE_DATA_API_TIMEOUT_MS = "1";
    globalThis.fetch = async (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });

    const result = await fetchYoutubeDataApiMetadata("timeout-video");
    assert.equal(result, null);
  });

  it("returns null on quota or auth failure", async () => {
    globalThis.fetch = async () => new Response("quota", { status: 403 });
    const result = await fetchYoutubeDataApiMetadata("quota-video");
    assert.equal(result, null);
  });

  it("returns null on malformed JSON", async () => {
    globalThis.fetch = async () =>
      new Response("{not json", { status: 200, headers: { "content-type": "application/json" } });
    const result = await fetchYoutubeDataApiMetadata("malformed-video");
    assert.equal(result, null);
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

