import "./openai-owned-media-stt.test.setup";

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { after, test } from "node:test";
import { getItem, insertCaptured } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listTranscriptSegmentsForSource,
} from "@/db/transcripts";
import { attachOwnedMediaSttToYoutubeItem } from "./owned-media-stt";
import {
  createOpenAiOwnedMediaSttProvider,
  OPENAI_AUDIO_TRANSCRIPTIONS_URL,
  OpenAiOwnedMediaSttProviderError,
  type CreateOpenAiOwnedMediaSttProviderInput,
} from "./openai-owned-media-stt";
import { TEST_DB_DIR } from "./openai-owned-media-stt.test.setup";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

const transcriptText = [
  "This owned media transcript explains customer discovery, policy decisions, transcript provenance, validation gates, production rollout planning, and implementation risks.",
  "It also covers search indexing, Ask answers, repair workflows, privacy constraints, source evidence, safe failure handling, and the remaining upload and credential work.",
].join(" ");

const mediaBytes = new TextEncoder().encode("fake owned video bytes for mocked OpenAI transcription");
const mediaHash = sha256(mediaBytes);

function providerInput(overrides: Partial<Parameters<ReturnType<typeof createOpenAiOwnedMediaSttProvider>["transcribe"]>[0]> = {}) {
  return {
    media: {
      filename: "owned-video.mp4",
      contentType: "video/mp4",
      byteLength: mediaBytes.byteLength,
      durationMs: 12_000,
      sha256: mediaHash,
      uploadedMediaId: "upload-123",
    },
    languageCode: "en",
    ...overrides,
  };
}

function makeProvider(options: Partial<CreateOpenAiOwnedMediaSttProviderInput> = {}) {
  return createOpenAiOwnedMediaSttProvider({
    apiKey: "sk-test-openai",
    mediaBytes,
    filename: "/private/tmp/owned-video.mp4",
    contentType: "video/mp4; charset=binary",
    fetchImpl: async () =>
      jsonResponse({
        text: transcriptText,
        usage: {
          type: "tokens",
          input_tokens: 14,
          output_tokens: 45,
          total_tokens: 59,
          input_token_details: { audio_tokens: 14 },
        },
      }),
    ...options,
  });
}

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_mock_123",
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  });
}

test("sends native multipart request without manual content-type and maps JSON text to paragraph-only output", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const provider = makeProvider({
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        text: transcriptText,
        usage: { type: "tokens", input_tokens: 22, output_tokens: 88 },
      });
    },
  });

  const transcript = await provider.transcribe(providerInput());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, OPENAI_AUDIO_TRANSCRIPTIONS_URL);
  assert.equal(calls[0].init.method, "POST");

  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get("authorization"), "Bearer sk-test-openai");
  assert.equal(headers.has("content-type"), false);

  assert.ok(calls[0].init.body instanceof FormData);
  const form = calls[0].init.body;
  assert.equal(form.get("model"), "gpt-4o-transcribe");
  assert.equal(form.get("response_format"), "json");
  assert.equal(form.get("language"), "en");

  const file = form.get("file");
  assert.ok(file instanceof Blob);
  assert.equal(file.size, mediaBytes.byteLength);
  assert.equal(file.type, "video/mp4");
  if ("name" in file) {
    assert.equal(file.name, "owned-video.mp4");
  }

  for (const [key, value] of form.entries()) {
    assert.equal(key.includes("sk-test-openai"), false);
    if (typeof value === "string") {
      assert.equal(value.includes("sk-test-openai"), false);
    }
  }

  assert.equal(transcript.timestampMode, "paragraph_only");
  assert.equal(transcript.segments.length, 1);
  assert.equal(transcript.segments[0].startMs, undefined);
  assert.equal(transcript.segments[0].text, transcriptText);
  assert.equal(transcript.model, "gpt-4o-transcribe");
  assert.equal(transcript.requestId, "req_mock_123");
  assert.deepEqual(transcript.usage, { inputTokens: 22, outputTokens: 88 });
});

test("rejects SHA, byte-length, filename, and content-type mismatches before fetch", async () => {
  const calls: RequestInit[] = [];
  const provider = makeProvider({
    fetchImpl: async (_url, init) => {
      calls.push(init);
      return jsonResponse({ text: transcriptText });
    },
  });

  for (const badInput of [
    providerInput({ media: { ...providerInput().media, sha256: "a".repeat(64) } }),
    providerInput({ media: { ...providerInput().media, byteLength: mediaBytes.byteLength + 1 } }),
    providerInput({ media: { ...providerInput().media, filename: "other-video.mp4" } }),
    providerInput({ media: { ...providerInput().media, contentType: "audio/mpeg" } }),
  ]) {
    await assert.rejects(
      () => provider.transcribe(badInput),
      (err) =>
        err instanceof OpenAiOwnedMediaSttProviderError && err.code === "media_mismatch",
    );
  }

  assert.equal(calls.length, 0);
});

test("rejects invalid static configuration before fetch can be called", () => {
  const fetchImpl = async () => jsonResponse({ text: transcriptText });

  for (const options of [
    { apiKey: " " },
    { model: "whisper-1" as never },
    { model: "gpt-4o-transcribe-diarize" as never },
    { timeoutMs: 0 },
    { timeoutMs: 1.5 },
    { mediaBytes: new Uint8Array() },
    { filename: "   " },
  ]) {
    assert.throws(
      () => makeProvider({ fetchImpl, ...options }),
      (err) =>
        err instanceof OpenAiOwnedMediaSttProviderError &&
        err.code === "invalid_configuration",
    );
  }
});

test("aborts timed-out requests with sanitized provider error", async () => {
  const provider = makeProvider({
    timeoutMs: 5,
    fetchImpl: async (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const err = new Error("Bearer sk-secret /tmp/private audio timed out");
          err.name = "AbortError";
          reject(err);
        });
      }),
  });

  await assert.rejects(
    () => provider.transcribe(providerInput()),
    (err) =>
      err instanceof OpenAiOwnedMediaSttProviderError &&
      err.code === "timeout" &&
      err.message === "OpenAI transcription request timed out." &&
      !err.message.includes("sk-secret") &&
      !err.message.includes("/tmp/private"),
  );
});

test("non-OK responses preserve safe diagnostics without leaking raw body or secrets", async () => {
  const provider = makeProvider({
    fetchImpl: async () =>
      new Response("Bearer sk-secret /tmp/private youtube.com/watch?v=abc raw body", {
        status: 429,
        headers: { "openai-request-id": "/tmp/request-token=secret" },
      }),
  });

  await assert.rejects(
    () => provider.transcribe(providerInput()),
    (err) =>
      err instanceof OpenAiOwnedMediaSttProviderError &&
      err.code === "api_error" &&
      err.details.status === 429 &&
      err.details.requestId === "<redacted>" &&
      err.message === "OpenAI transcription request failed." &&
      !err.message.includes("sk-secret") &&
      !err.message.includes("/tmp/private") &&
      !err.message.includes("youtube.com") &&
      !err.message.includes("raw body"),
  );
});

test("rejects malformed or empty OpenAI JSON responses", async () => {
  for (const response of [
    new Response("not-json", { status: 200, headers: { "x-request-id": "req_bad_json" } }),
    jsonResponse({}),
    jsonResponse({ text: "   \n\t   " }),
  ]) {
    const provider = makeProvider({
      fetchImpl: async () => response.clone(),
    });
    await assert.rejects(
      () => provider.transcribe(providerInput()),
      (err) =>
        err instanceof OpenAiOwnedMediaSttProviderError &&
        err.code === "invalid_response",
    );
  }
});

test("maps duration and token usage to safe scalar fields only", async () => {
  const durationProvider = makeProvider({
    fetchImpl: async () =>
      jsonResponse({ text: transcriptText, usage: { type: "duration", seconds: 27 } }),
  });
  assert.deepEqual((await durationProvider.transcribe(providerInput())).usage, {
    seconds: 27,
  });

  const tokenProvider = makeProvider({
    fetchImpl: async () =>
      jsonResponse({
        text: transcriptText,
        usage: {
          type: "tokens",
          input_tokens: 14,
          output_tokens: 45,
          total_tokens: 59,
          input_token_details: { audio_tokens: 14 },
        },
      }),
  });
  assert.deepEqual((await tokenProvider.transcribe(providerInput())).usage, {
    inputTokens: 14,
    outputTokens: 45,
  });
});

test("integrates with owned-media STT persistence without leaking paths, tokens, URLs, or bytes", async () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=openAiOwned123",
    title: "Metadata-only OpenAI owned media video",
    body: "Original metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
  });
  const provider = makeProvider({
    filename: "/private/tmp/path-token=secret/owned-video.mp4",
    fetchImpl: async () =>
      jsonResponse({
        text: transcriptText,
        usage: { type: "duration", seconds: 12 },
      }),
  });

  const result = await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    title: "OpenAI owned STT transcript video",
    media: {
      filename: "/private/tmp/path-token=secret/owned-video.mp4",
      contentType: "video/mp4",
      byteLength: mediaBytes.byteLength,
      durationMs: 12_000,
      sha256: mediaHash,
      uploadedMediaId: "upload-openai-123",
      rightsAttestation: "owned_uploaded_media",
    },
    provider,
    languageCode: "en",
  });

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "OpenAI owned STT transcript video");
  assert.equal(updated.capture_quality, "metadata_plus_transcript");
  assert.equal(updated.extraction_method, "owned_media_stt");
  assert.match(updated.body, /customer discovery/);

  const activeSource = getActiveTranscriptSourceForItem(item.id)!;
  assert.equal(activeSource.id, result.transcriptSource.id);
  assert.equal(activeSource.source_kind, "owned_media_stt");
  assert.equal(activeSource.timestamp_mode, "paragraph_only");
  assert.equal(activeSource.segment_count, 1);
  assert.equal(activeSource.language_code, "en");

  const segments = listTranscriptSegmentsForSource(activeSource.id);
  assert.equal(segments.length, 1);
  assert.equal(segments[0].start_ms, null);
  assert.equal(segments[0].end_ms, null);
  assert.equal(segments[0].text, transcriptText);

  const providerInputJson = JSON.stringify(result.providerInput);
  const provenanceJson = activeSource.provenance_json;
  const combined = `${providerInputJson}\n${provenanceJson}`;
  assert.equal(providerInputJson.includes("owned-video.mp4"), true);
  for (const forbidden of [
    "/private/tmp",
    "path-token",
    "sk-test-openai",
    "youtube.com",
    "openAiOwned123",
    "fake owned video bytes",
    "raw body",
    "remote media",
  ]) {
    assert.equal(combined.includes(forbidden), false, forbidden);
  }

  const provenance = JSON.parse(provenanceJson) as Record<string, unknown>;
  assert.equal(provenance.media_filename, "owned-video.mp4");
  assert.equal(provenance.provider_name, "openai-audio-transcriptions");
  assert.equal(provenance.provider_model, "gpt-4o-transcribe");
  assert.deepEqual(provenance.usage, { seconds: 12 });
});

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
