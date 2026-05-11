/**
 * YouTube capture unit tests — v0.5.1 T-YT-4+5.
 *
 * Ten cases per the plan §5.5. All network I/O is mocked via a global
 * fetch stub so tests are deterministic. Real fixtures (captured from
 * `jNQXAC9IVRw`) live in __fixtures__/; see the README there for
 * regeneration instructions.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  extractVideoId,
  canonicalYoutubeUrl,
  extractYoutubeVideo,
  parseTimedTextXml,
  formatTranscriptBody,
  msToTimestamp,
  YoutubeCaptureError,
  type TranscriptSegment,
} from "./youtube";

const FIXTURE_DIR = join(
  process.cwd(),
  "src/lib/capture/__fixtures__",
);
const PLAYER_FIXTURE = JSON.parse(
  readFileSync(join(FIXTURE_DIR, "youtube-player-response.json"), "utf8"),
);
const XML_FIXTURE = readFileSync(
  join(FIXTURE_DIR, "youtube-timedtext.xml"),
  "utf8",
);

// ---------------------------------------------------------------------------
// Fetch-mock harness — swaps global fetch for the duration of the test file.
// Each test builds a queue of [predicate, response] pairs; the mock picks
// the first matching predicate for each outgoing request.
// ---------------------------------------------------------------------------
type MockEntry = {
  match: (url: string, init?: RequestInit) => boolean;
  respond: () => Response | Promise<Response>;
};

let originalFetch: typeof fetch;
let queue: MockEntry[] = [];

function installFetchMock() {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    const entry = queue.find((e) => e.match(url, init));
    if (!entry) {
      throw new Error(`[mock] no match for ${init?.method ?? "GET"} ${url}`);
    }
    return entry.respond();
  };
}
function restoreFetchMock() {
  globalThis.fetch = originalFetch;
  queue = [];
}

function queuePlayerResponse(body: unknown, status = 200) {
  queue.push({
    match: (url) => url.includes("/youtubei/v1/player"),
    respond: () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  });
}

function queueTimedTextResponse(xml: string, status = 200) {
  queue.push({
    match: (url) => url.includes("/api/timedtext"),
    respond: () =>
      new Response(xml, {
        status,
        headers: { "content-type": "application/xml" },
      }),
  });
}

// ---------------------------------------------------------------------------
// Helper: a baseUrl the player response points at. We don't care about the
// exact URL shape — only that our mock matches `/api/timedtext` on it.
// ---------------------------------------------------------------------------
const FAKE_BASE_URL =
  "https://www.youtube.com/api/timedtext?v=jNQXAC9IVRw&lang=en";

function playerWithTracks(opts: {
  title?: string;
  author?: string;
  lengthSeconds?: string;
  isLive?: boolean;
  captionBaseUrl?: string | null;
}) {
  const tracks =
    opts.captionBaseUrl === null
      ? []
      : [{ baseUrl: opts.captionBaseUrl ?? FAKE_BASE_URL }];
  return {
    videoDetails: {
      title: opts.title ?? "Test video",
      author: opts.author ?? "Test channel",
      lengthSeconds: opts.lengthSeconds ?? "60",
      isLive: opts.isLive ?? false,
    },
    captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } },
  };
}

// ---------------------------------------------------------------------------
// Case 1 — URL extraction covers all 5 positive shapes
// ---------------------------------------------------------------------------
describe("extractVideoId — positive URL shapes (case 1)", () => {
  it("watch?v=", () => {
    assert.equal(
      extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });
  it("watch?v= with extra params", () => {
    assert.equal(
      extractVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx&index=3",
      ),
      "dQw4w9WgXcQ",
    );
  });
  it("youtu.be/", () => {
    assert.equal(
      extractVideoId("https://youtu.be/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });
  it("youtube.com/shorts/", () => {
    assert.equal(
      extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });
  it("m.youtube.com/watch?v=", () => {
    assert.equal(
      extractVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });
  it("youtube.com/embed/", () => {
    assert.equal(
      extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
      "dQw4w9WgXcQ",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 2 — URL extraction returns null for near-miss shapes
// ---------------------------------------------------------------------------
describe("extractVideoId — negative cases (case 2)", () => {
  it("channel URL returns null", () => {
    assert.equal(
      extractVideoId("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx"),
      null,
    );
  });
  it("playlist URL returns null", () => {
    assert.equal(
      extractVideoId(
        "https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxxxxxx",
      ),
      null,
    );
  });
  it("bare youtu.be/ (no ID) returns null", () => {
    assert.equal(extractVideoId("https://youtu.be/"), null);
  });
  it("non-YouTube HTTPS URL returns null", () => {
    assert.equal(
      extractVideoId("https://example.com/watch?v=dQw4w9WgXcQ"),
      null,
    );
  });
});

// ---------------------------------------------------------------------------
// Case 3 — canonicalYoutubeUrl
// ---------------------------------------------------------------------------
describe("canonicalYoutubeUrl (case 3)", () => {
  it("builds the watch?v= form", () => {
    assert.equal(
      canonicalYoutubeUrl("dQw4w9WgXcQ"),
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });
});

// ---------------------------------------------------------------------------
// Parser unit tests (used by subsequent cases)
// ---------------------------------------------------------------------------
describe("parseTimedTextXml", () => {
  it("parses the real fixture into 6 segments with HTML entities decoded", () => {
    const segs = parseTimedTextXml(XML_FIXTURE);
    assert.equal(segs.length, 6);
    assert.equal(segs[0]?.offset, 1200);
    assert.equal(segs[0]?.duration, 2160);
    assert.match(segs[0]?.text ?? "", /elephants$/);
    // Case 4b inline: HTML entity (&#39;) decoded to apostrophe
    const withEntity = segs.find((s) => s.text.includes("that's cool"));
    assert.ok(withEntity, "segment containing decoded apostrophe exists");
  });
  it("returns empty array for an empty body", () => {
    assert.deepEqual(
      parseTimedTextXml(
        '<?xml version="1.0"?><timedtext format="3"><body></body></timedtext>',
      ),
      [],
    );
  });
});

describe("formatTranscriptBody + msToTimestamp", () => {
  it("groups segments into ~30-second paragraphs", () => {
    const segs: TranscriptSegment[] = [
      { offset: 0, duration: 2000, text: "first" },
      { offset: 15_000, duration: 2000, text: "second" },
      { offset: 35_000, duration: 2000, text: "third" },
      { offset: 70_000, duration: 2000, text: "fourth" },
    ];
    const body = formatTranscriptBody(segs);
    const paragraphs = body.split("\n\n");
    assert.equal(paragraphs.length, 3, "3 paragraphs across 3 30s windows");
    assert.match(paragraphs[0] ?? "", /\[0:00\] first/);
  });
  it("sub-hour formats as M:SS, hour+ formats as H:MM:SS", () => {
    assert.equal(msToTimestamp(0), "0:00");
    assert.equal(msToTimestamp(59_000), "0:59");
    assert.equal(msToTimestamp(3_600_000), "1:00:00");
    assert.equal(msToTimestamp(3_661_000), "1:01:01");
  });
});

// ---------------------------------------------------------------------------
// Case 4 — Happy path with the real fixture
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — happy path (case 4)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("returns CapturedContent with transcript body from the fixture", async () => {
    queuePlayerResponse(PLAYER_FIXTURE);
    queueTimedTextResponse(XML_FIXTURE);
    const result = await extractYoutubeVideo(
      "jNQXAC9IVRw",
      "https://youtu.be/jNQXAC9IVRw",
    );
    assert.equal(result.title, "Me at the zoo");
    assert.equal(result.author, "jawed");
    assert.equal(result.duration_seconds, 19);
    assert.equal(
      result.source_url,
      "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    );
    assert.equal(result.extraction_warning, null);
    assert.match(result.body, /^\[0:01\] All right, so here we are/);
    assert.match(result.body, /\[0:16\] and that's pretty much all there is to/);
  });
});

// ---------------------------------------------------------------------------
// Case 5 — No captions
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — no_captions (case 5)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("saves item with placeholder body when captionTracks is empty", async () => {
    queuePlayerResponse(
      playerWithTracks({
        title: "Silent short",
        author: "Ch",
        captionBaseUrl: null,
      }),
    );
    const result = await extractYoutubeVideo(
      "noCapsxxxxx",
      "https://youtu.be/noCapsxxxxx",
    );
    assert.equal(result.extraction_warning, "no_transcript");
    assert.equal(result.body, "[No transcript available for this video]");
    assert.equal(result.title, "Silent short");
  });
});

// ---------------------------------------------------------------------------
// Case 6 — Video unavailable
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — video_unavailable (case 6)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("throws YoutubeCaptureError when videoDetails missing", async () => {
    queuePlayerResponse({ playabilityStatus: { status: "ERROR" } });
    await assert.rejects(
      () => extractYoutubeVideo("privatexxxx", "https://youtu.be/privatexxxx"),
      (err: unknown) =>
        err instanceof YoutubeCaptureError && err.code === "video_unavailable",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 7 — Live stream
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — live_stream (case 7)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("throws YoutubeCaptureError when isLive=true and no caption tracks", async () => {
    queuePlayerResponse(
      playerWithTracks({
        title: "LIVE: weather",
        isLive: true,
        captionBaseUrl: null,
      }),
    );
    await assert.rejects(
      () => extractYoutubeVideo("livexxxxxxx", "https://youtu.be/livexxxxxxx"),
      (err: unknown) =>
        err instanceof YoutubeCaptureError && err.code === "live_stream",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 8 — Truncation > 7200 segments
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — transcript_truncated_2h (case 8)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("caps segment processing at 7200 and sets warning", async () => {
    // Build synthetic XML with 7300 <p> segments (ms offsets every 1s).
    const parts: string[] = ['<?xml version="1.0"?><timedtext format="3"><body>'];
    for (let i = 0; i < 7300; i++) {
      parts.push(`<p t="${i * 1000}" d="900">seg ${i}</p>`);
    }
    parts.push("</body></timedtext>");
    const bigXml = parts.join("");
    queuePlayerResponse(
      playerWithTracks({ title: "Long lecture", lengthSeconds: "26280" }),
    );
    queueTimedTextResponse(bigXml);

    const result = await extractYoutubeVideo(
      "longxxxxxxx",
      "https://youtu.be/longxxxxxxx",
    );
    assert.equal(result.extraction_warning, "transcript_truncated_2h");
    // 7200 segments * 1s = last kept segment's offset 7199s = 1:59:59
    assert.match(result.body, /\[1:59:59\] seg 7199/);
    assert.ok(
      !result.body.includes("seg 7200"),
      "segment 7200 must NOT be in body",
    );
  });
});

// ---------------------------------------------------------------------------
// Case 9 — fetch_failed on InnerTube 429
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — fetch_failed (case 9)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("wraps 429 response into YoutubeCaptureError", async () => {
    queue.push({
      match: (url) => url.includes("/youtubei/v1/player"),
      respond: () =>
        new Response("too many requests", {
          status: 429,
          headers: { "content-type": "text/plain" },
        }),
    });
    await assert.rejects(
      () =>
        extractYoutubeVideo("ratelimitxx", "https://youtu.be/ratelimitxx"),
      (err: unknown) =>
        err instanceof YoutubeCaptureError &&
        err.code === "fetch_failed" &&
        /429/.test(err.message),
    );
  });
});

// ---------------------------------------------------------------------------
// Case 10 — Zero-segment guard (caption track present, XML empty)
// ---------------------------------------------------------------------------
describe("extractYoutubeVideo — zero-segment guard (case 10)", () => {
  beforeEach(() => installFetchMock());
  afterEach(() => restoreFetchMock());

  it("treats empty caption XML as no_transcript (not NOT NULL violation)", async () => {
    queuePlayerResponse(
      playerWithTracks({ title: "Empty caps", lengthSeconds: "30" }),
    );
    queueTimedTextResponse(
      '<?xml version="1.0"?><timedtext format="3"><body></body></timedtext>',
    );
    const result = await extractYoutubeVideo(
      "emptycapxxx",
      "https://youtu.be/emptycapxxx",
    );
    assert.equal(result.extraction_warning, "no_transcript");
    assert.equal(result.body, "[No transcript available for this video]");
  });
});
