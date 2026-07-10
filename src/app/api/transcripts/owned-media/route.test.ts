import "./route.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { TEST_DB_DIR } from "./route.test.setup";
import { POST } from "./route";
import { getItem, insertCaptured } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listCapturePolicyDecisionsForItem,
  listTranscriptSegmentsForSource,
  listTranscriptSourcesForItem,
} from "@/db/transcripts";
import { issueSessionToken, setPin } from "@/lib/auth";
import { isBearerRoute } from "@/lib/auth/bearer";
import { createMockOwnedMediaSttProvider } from "@/lib/capture/transcripts/mock-owned-media-stt";
import {
  OwnedMediaUploadError,
  prepareOwnedMediaUpload,
  transcribeOwnedMediaUploadForYoutubeItem,
} from "@/lib/capture/transcripts/owned-media-stt-route-service";
import {
  DEFAULT_OWNED_MEDIA_STT_MAX_BYTES,
  OwnedMediaSttError,
} from "@/lib/capture/transcripts/owned-media-stt";

const GOOD_TOKEN = "c".repeat(64);
const ORIGINAL_TOKEN = process.env.BRAIN_API_TOKEN;
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;
const ORIGINAL_STT_PROVIDER = process.env.BRAIN_OWNED_MEDIA_STT_PROVIDER;
const ORIGINAL_STT_LIVE = process.env.BRAIN_OWNED_MEDIA_STT_LIVE;

before(() => {
  setPin("1234");
  process.env.BRAIN_API_TOKEN = GOOD_TOKEN;
});

after(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.BRAIN_API_TOKEN;
  else process.env.BRAIN_API_TOKEN = ORIGINAL_TOKEN;
  if (ORIGINAL_OPENAI_KEY === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY;
  if (ORIGINAL_STT_PROVIDER === undefined) delete process.env.BRAIN_OWNED_MEDIA_STT_PROVIDER;
  else process.env.BRAIN_OWNED_MEDIA_STT_PROVIDER = ORIGINAL_STT_PROVIDER;
  if (ORIGINAL_STT_LIVE === undefined) delete process.env.BRAIN_OWNED_MEDIA_STT_LIVE;
  else process.env.BRAIN_OWNED_MEDIA_STT_LIVE = ORIGINAL_STT_LIVE;
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function signedSessionCookie(): string {
  return issueSessionToken();
}

function mediaBytes(): Uint8Array {
  return new TextEncoder().encode("tiny synthetic owned media bytes for route tests");
}

function fileFromBytes(
  bytes: Uint8Array,
  name = "owned-video.mp4",
  type = "video/mp4",
): File {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new File([buffer], name, { type });
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function youtubeItem(overrides: Partial<Parameters<typeof insertCaptured>[0]> = {}) {
  return insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=ownedUpload123",
    title: "Metadata-only owned media upload",
    body: "Original metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
    ...overrides,
  });
}

function multipartForm(overrides: {
  itemId?: string;
  media?: File | null;
  rightsAttestation?: string | null;
  title?: string;
  languageCode?: string;
  durationMs?: string;
} = {}): FormData {
  const form = new FormData();
  form.set("item_id", overrides.itemId ?? "item-123");
  if (overrides.media !== null) {
    form.set("media", overrides.media ?? fileFromBytes(mediaBytes()));
  }
  if (overrides.rightsAttestation !== null) {
    form.set("rights_attestation", overrides.rightsAttestation ?? "owned_uploaded_media");
  }
  if (overrides.title) form.set("title", overrides.title);
  if (overrides.languageCode) form.set("language_code", overrides.languageCode);
  if (overrides.durationMs) form.set("media_duration_ms", overrides.durationMs);
  return form;
}

function mkReq(
  body: BodyInit | null,
  opts: { cookie?: string; bearer?: string; expectedSha?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (opts.cookie) headers.set("cookie", `brain-session=${opts.cookie}`);
  if (opts.bearer) headers.set("authorization", `Bearer ${opts.bearer}`);
  if (opts.expectedSha) headers.set("x-expected-sha256", opts.expectedSha);
  return new NextRequest("http://localhost/api/transcripts/owned-media", {
    method: "POST",
    headers,
    body,
  });
}

test("owned-media route is cookie-only and not admitted as a bearer route", async () => {
  assert.equal(isBearerRoute("/api/transcripts/owned-media"), false);

  const unauth = await POST(mkReq(multipartForm()));
  assert.equal(unauth.status, 401);

  const bearerOnly = await POST(mkReq(multipartForm(), { bearer: GOOD_TOKEN }));
  assert.equal(bearerOnly.status, 401);
});

test("runtime route validates upload then stops at provider_disabled without OpenAI activation", async () => {
  process.env.OPENAI_API_KEY = "sk-test-should-not-be-used";
  process.env.BRAIN_OWNED_MEDIA_STT_PROVIDER = "openai";
  process.env.BRAIN_OWNED_MEDIA_STT_LIVE = "1";
  const item = youtubeItem();
  const bytes = mediaBytes();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network must not be called");
  };

  try {
    const res = await POST(
      mkReq(
        multipartForm({
          itemId: item.id,
          media: fileFromBytes(bytes, "/tmp/private-client-meeting.mp4"),
          durationMs: "12000",
        }),
        { cookie: signedSessionCookie(), expectedSha: sha256(bytes) },
      ),
    );

    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error, "provider_disabled");
    assert.equal(body.provider_mode, "disabled");
    assert.equal(getItem(item.id)!.capture_quality, "metadata_only");
    assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
    assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runtime route rejects malformed and unsafe inputs before provider work", async () => {
  const cookie = signedSessionCookie();
  const invalidMultipart = await POST(mkReq("not multipart", { cookie }));
  assert.equal(invalidMultipart.status, 400);
  assert.equal((await invalidMultipart.json()).error, "invalid_multipart");

  const missingFile = await POST(mkReq(multipartForm({ media: null }), { cookie }));
  assert.equal(missingFile.status, 400);
  assert.equal((await missingFile.json()).error, "missing_media_file");

  const emptyFile = await POST(
    mkReq(multipartForm({ media: fileFromBytes(new Uint8Array(), "empty.mp4") }), {
      cookie,
    }),
  );
  assert.equal(emptyFile.status, 400);
  assert.equal((await emptyFile.json()).error, "missing_media_file");

  const oversizeFile = await POST(
    mkReq(
      multipartForm({
        media: fileFromBytes(
          new Uint8Array(DEFAULT_OWNED_MEDIA_STT_MAX_BYTES + 1),
          "too-large.mp4",
        ),
      }),
      { cookie },
    ),
  );
  assert.equal(oversizeFile.status, 400);
  assert.equal((await oversizeFile.json()).error, "invalid_media");

  const missingAttestation = await POST(
    mkReq(multipartForm({ rightsAttestation: null }), { cookie }),
  );
  assert.equal(missingAttestation.status, 400);
  assert.equal((await missingAttestation.json()).error, "missing_rights_attestation");

  const badAttestation = await POST(
    mkReq(multipartForm({ rightsAttestation: "public_video" }), { cookie }),
  );
  assert.equal(badAttestation.status, 422);
  assert.equal((await badAttestation.json()).error, "invalid_rights_attestation");

  const unsupported = await POST(
    mkReq(
      multipartForm({
        media: fileFromBytes(mediaBytes(), "owned-video.exe", "application/octet-stream"),
      }),
      { cookie },
    ),
  );
  assert.equal(unsupported.status, 400);
  assert.equal((await unsupported.json()).error, "invalid_media");

  const invalidDuration = await POST(
    mkReq(multipartForm({ durationMs: "1.5" }), { cookie }),
  );
  assert.equal(invalidDuration.status, 400);
  assert.equal((await invalidDuration.json()).error, "invalid_duration");

  const bytes = mediaBytes();
  const shaMismatch = await POST(
    mkReq(multipartForm({ media: fileFromBytes(bytes) }), {
      cookie,
      expectedSha: "0".repeat(64),
    }),
  );
  assert.equal(shaMismatch.status, 422);
  const shaMismatchBody = await shaMismatch.json();
  assert.equal(shaMismatchBody.error, "sha256_mismatch");
  assert.equal(shaMismatchBody.actual, sha256(bytes));
});

test("service validation rejects zero bytes and oversize media before provider invocation", () => {
  const prepared = prepareOwnedMediaUpload({
    itemId: "item",
    filename: "owned-video.mp4",
    contentType: "video/mp4",
    bytes: mediaBytes(),
    rightsAttestation: "owned_uploaded_media",
  });
  assert.equal(Object.prototype.hasOwnProperty.call(prepared, "bytes"), false);

  assert.throws(
    () =>
      prepareOwnedMediaUpload({
        itemId: "item",
        filename: "empty.mp4",
        contentType: "video/mp4",
        bytes: new Uint8Array(),
        rightsAttestation: "owned_uploaded_media",
      }),
    (err) => err instanceof OwnedMediaUploadError && err.code === "missing_media_file",
  );

  assert.throws(
    () =>
      prepareOwnedMediaUpload({
        itemId: "item",
        filename: "too-large.mp4",
        contentType: "video/mp4",
        bytes: mediaBytes(),
        rightsAttestation: "owned_uploaded_media",
        maxBytes: 4,
      }),
    (err) => err instanceof OwnedMediaUploadError && err.code === "invalid_media",
  );
});

test("test-injected mock provider upgrades a YouTube item and keeps logs/provenance safe", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/mockUpload123" });
  const events: Array<Record<string, unknown>> = [];
  const provider = createMockOwnedMediaSttProvider();

  const result = await transcribeOwnedMediaUploadForYoutubeItem({
    itemId: item.id,
    title: "Owned media transcript from injected provider",
    filename: "/tmp/private-client-name-board-meeting.mp4",
    contentType: "video/mp4",
    bytes: mediaBytes(),
    rightsAttestation: "owned_uploaded_media",
    durationMs: 12_000,
    languageCode: "EN",
    provider,
    logger: (entry) => events.push(entry),
  });

  assert.equal(provider.calls.length, 1);
  assert.equal(result.segmentCount, 1);
  const updated = getItem(item.id)!;
  assert.equal(updated.title, "Owned media transcript from injected provider");
  assert.equal(updated.capture_quality, "metadata_plus_transcript");
  assert.match(updated.body, /MOCK OWNED MEDIA STT TRANSCRIPT/);
  assert.equal(updated.body.includes("private-client-name-board-meeting"), false);
  assert.equal(updated.body.includes("/tmp"), false);

  const source = getActiveTranscriptSourceForItem(item.id)!;
  assert.equal(source.source_kind, "owned_media_stt");
  assert.equal(source.timestamp_mode, "paragraph_only");
  assert.equal(source.segment_count, 1);
  assert.equal(listTranscriptSegmentsForSource(source.id).length, 1);

  const provenanceJson = source.provenance_json;
  assert.equal(provenanceJson.includes("/tmp"), false);
  assert.equal(provenanceJson.includes("youtube.com"), false);
  assert.equal(provenanceJson.includes("mockUpload123"), false);
  assert.equal(provenanceJson.includes("raw media"), false);

  const logJson = JSON.stringify(events);
  assert.match(logJson, /capture\.transcript\.owned_media\.saved/);
  assert.equal(logJson.includes("private-client-name-board-meeting"), false);
  assert.equal(logJson.includes("/tmp"), false);
  assert.equal(logJson.includes("youtube.com"), false);
  assert.equal(logJson.includes("MOCK OWNED MEDIA STT TRANSCRIPT"), false);
});

test("service rejects non-YouTube items without provider call", async () => {
  const item = insertCaptured({
    source_type: "url",
    title: "Article",
    body: "Metadata",
    source_platform: "generic_article",
    capture_quality: "metadata_only",
  });
  const provider = createMockOwnedMediaSttProvider();

  await assert.rejects(
    () =>
      transcribeOwnedMediaUploadForYoutubeItem({
        itemId: item.id,
        filename: "owned-video.mp4",
        contentType: "video/mp4",
        bytes: mediaBytes(),
        rightsAttestation: "owned_uploaded_media",
        provider,
      }),
    (err) => err instanceof OwnedMediaSttError && err.code === "not_youtube_item",
  );

  assert.equal(provider.calls.length, 0);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("policy block prevents injected provider invocation", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/policyBlockedRoute123" });
  const provider = createMockOwnedMediaSttProvider();

  await assert.rejects(
    () =>
      transcribeOwnedMediaUploadForYoutubeItem({
        itemId: item.id,
        filename: "owned-video.mp4",
        contentType: "video/mp4",
        bytes: mediaBytes(),
        rightsAttestation: "owned_uploaded_media",
        provider,
        policyDecider: () => ({
          status: "blocked",
          decision: null as never,
          blockedReason: "owned_media_stt_disabled_for_test",
        }),
      }),
    (err) => err instanceof OwnedMediaSttError && err.code === "policy_blocked",
  );

  assert.equal(provider.calls.length, 0);
  assert.equal(getItem(item.id)!.capture_quality, "metadata_only");
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("provider failure leaves only the allowed policy audit row and no transcript mutation", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/providerFailedRoute123" });
  const events: Array<Record<string, unknown>> = [];
  const provider = createMockOwnedMediaSttProvider({
    error: new Error("Bearer sk-secret failed for /tmp/private-client.mp4"),
  });

  await assert.rejects(
    () =>
      transcribeOwnedMediaUploadForYoutubeItem({
        itemId: item.id,
        filename: "/tmp/private-client.mp4",
        contentType: "video/mp4",
        bytes: mediaBytes(),
        rightsAttestation: "owned_uploaded_media",
        provider,
        logger: (entry) => events.push(entry),
      }),
    (err) =>
      err instanceof OwnedMediaUploadError &&
      err.code === "provider_failed" &&
      !err.message.includes("sk-secret") &&
      !err.message.includes("/tmp/private-client.mp4"),
  );

  assert.equal(provider.calls.length, 1);
  const updated = getItem(item.id)!;
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);

  const logJson = JSON.stringify(events);
  assert.match(logJson, /capture\.transcript\.owned_media\.provider_failed/);
  assert.equal(logJson.includes("private-client"), false);
  assert.equal(logJson.includes("sk-secret"), false);
  assert.equal(logJson.includes("/tmp"), false);
});
