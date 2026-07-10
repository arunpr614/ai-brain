import "./route.test.setup";

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { issueSessionToken, setPin } from "@/lib/auth";
import { getItem, insertCaptured, listNeedsUpgradeItems } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listCapturePolicyDecisionsForItem,
  listTranscriptSegmentsForSource,
  listTranscriptSourcesForItem,
} from "@/db/transcripts";

const GOOD_TOKEN = "b".repeat(64);
const ORIGINAL_TOKEN = process.env.BRAIN_API_TOKEN;

function signedSessionCookie(): string {
  return issueSessionToken();
}

function mkReq(
  body: unknown,
  opts: { cookie?: string; bearer?: string; origin?: string; rawBody?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.origin) headers.set("origin", opts.origin);
  return new NextRequest("http://localhost/api/capture/transcript", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  });
}

function mkMultipartReq(
  form: FormData,
  opts: { cookie?: string; bearer?: string; origin?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.origin) headers.set("origin", opts.origin);
  return new NextRequest("http://localhost/api/capture/transcript", {
    method: "POST",
    headers,
    body: form,
  });
}

function mkRawReq(
  body: string,
  contentType: string,
  opts: { cookie?: string; bearer?: string; origin?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": contentType });
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.origin) headers.set("origin", opts.origin);
  return new NextRequest("http://localhost/api/capture/transcript", {
    method: "POST",
    headers,
    body,
  });
}

function transcriptText(): string {
  return [
    "This user supplied transcript has enough useful detail to make the video searchable.",
    "It discusses customer discovery, design tradeoffs, implementation sequencing, validation, and risk management.",
    "The first paste-only release stores this as paragraph-only text and queues enrichment again.",
  ].join(" ");
}

function uploadedVttText(): string {
  return `WEBVTT

00:00:01.000 --> 00:00:04.000
This uploaded transcript cue explains customer discovery, product tradeoffs, implementation sequencing, validation, and risk handling.

00:00:05.000 --> 00:00:08.000
The second cue adds enough detail about search, Ask, indexing, policy provenance, rollback behavior, and transcript panel rendering.
`;
}

describe("/api/capture/transcript", () => {
  before(() => {
    setPin("1234");
    process.env.BRAIN_API_TOKEN = GOOD_TOKEN;
  });

  after(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
    else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  it("returns 401 with no cookie and no bearer", async () => {
    const res = await POST(mkReq({ item_id: "item", text: transcriptText() }));
    assert.equal(res.status, 401);
  });

  it("rejects bearer path with disallowed Origin", async () => {
    const res = await POST(
      mkReq(
        { item_id: "item", text: transcriptText() },
        { bearer: GOOD_TOKEN, origin: "http://evil.example" },
      ),
    );
    assert.equal(res.status, 403);
  });

  it("upgrades an existing YouTube metadata-only item with pasted transcript", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      source_url: "https://www.youtube.com/watch?v=abc123",
      title: "Metadata-only video",
      body: "Metadata placeholder",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });

    const res = await POST(
      mkReq(
        {
          item_id: item.id,
          title: "Transcript-backed video",
          text: transcriptText(),
          language_code: "en",
        },
        { cookie: signedSessionCookie() },
      ),
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, item.id);
    assert.match(body.policy_decision_id, /./);
    assert.match(body.transcript_source_id, /./);
    assert.equal(body.capture_result.state, "updated_existing");
    assert.equal(body.capture_result.itemId, item.id);

    const updated = getItem(item.id)!;
    assert.equal(updated.title, "Transcript-backed video");
    assert.equal(updated.capture_quality, "user_provided_full_text");
    assert.equal(updated.extraction_method, "manual_repair_transcript");
    assert.equal(updated.extraction_warning, null);
    assert.equal(listNeedsUpgradeItems({ limit: 20 }).some((row) => row.id === item.id), false);

    const policies = listCapturePolicyDecisionsForItem(item.id);
    assert.equal(policies.length, 1);
    assert.equal(policies[0].method, "user_paste");

    const sources = listTranscriptSourcesForItem(item.id);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].policy_decision_id, policies[0].id);
    assert.equal(sources[0].source_kind, "user_paste");
    assert.equal(sources[0].timestamp_mode, "paragraph_only");
  });

  it("upgrades an existing YouTube metadata-only item with uploaded VTT transcript", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      source_url: "https://www.youtube.com/watch?v=vtt123",
      title: "Metadata-only video for upload",
      body: "Metadata placeholder",
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    });
    const form = new FormData();
    form.set("item_id", item.id);
    form.set("title", "Uploaded VTT video");
    form.set("language_code", "en");
    form.set("transcript", new File([uploadedVttText()], "transcript.vtt", { type: "text/vtt" }));

    const res = await POST(mkMultipartReq(form, { cookie: signedSessionCookie() }));

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.action, "upgraded");
    assert.equal(body.id, item.id);
    assert.equal(body.segment_count, 2);
    assert.equal(body.timestamp_mode, "timestamped");

    const updated = getItem(item.id)!;
    assert.equal(updated.title, "Uploaded VTT video");
    assert.equal(updated.capture_quality, "user_provided_full_text");

    const source = getActiveTranscriptSourceForItem(item.id)!;
    assert.equal(source.source_kind, "uploaded_file");
    assert.equal(source.segment_count, 2);
    assert.equal(listTranscriptSegmentsForSource(source.id).length, 2);
  });

  it("rejects unsupported content type before body parser confusion", async () => {
    const res = await POST(
      mkRawReq("item_id=x", "application/x-www-form-urlencoded", {
        cookie: signedSessionCookie(),
      }),
    );
    assert.equal(res.status, 415);
    const body = await res.json();
    assert.equal(body.error, "unsupported_content_type");
  });

  it("rejects unsupported transcript file uploads", async () => {
    const item = insertCaptured({
      source_type: "youtube",
      title: "Unsupported upload",
      body: "Metadata",
      source_platform: "youtube",
      capture_quality: "metadata_only",
    });
    const form = new FormData();
    form.set("item_id", item.id);
    form.set("transcript", new File([transcriptText()], "transcript.html", { type: "text/html" }));

    const res = await POST(mkMultipartReq(form, { cookie: signedSessionCookie() }));

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, "unsupported_transcript_file");
  });

  it("rejects non-YouTube items", async () => {
    const item = insertCaptured({
      source_type: "url",
      title: "Article",
      body: "Metadata",
      source_platform: "generic_article",
      capture_quality: "metadata_only",
    });

    const res = await POST(
      mkReq(
        { item_id: item.id, text: transcriptText() },
        { cookie: signedSessionCookie() },
      ),
    );
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, "not_youtube_item");
  });
});
