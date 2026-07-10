import "./owned-media-stt.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./owned-media-stt.test.setup";
import { getDb } from "@/db/client";
import { getItem, insertCaptured } from "@/db/items";
import {
  getActiveTranscriptSourceForItem,
  listCapturePolicyDecisionsForItem,
  listTranscriptSegmentsForSource,
  listTranscriptSourcesForItem,
} from "@/db/transcripts";
import {
  attachOwnedMediaSttToYoutubeItem,
  MAX_OWNED_MEDIA_STT_SEGMENTS,
  OwnedMediaSttError,
  type OwnedMediaSttProvider,
  type OwnedMediaSttProviderInput,
  type OwnedMediaSttTranscript,
} from "./owned-media-stt";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function youtubeItem(overrides: Partial<Parameters<typeof insertCaptured>[0]> = {}) {
  return insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=ownedStt123",
    title: "Metadata-only owned media video",
    body: "Original metadata-only body",
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_warning: "no_transcript",
    ...overrides,
  });
}

function media(overrides = {}) {
  return {
    filename: "owned-video.mp4",
    contentType: "video/mp4",
    byteLength: 1024 * 1024,
    durationMs: 12_000,
    sha256: "a".repeat(64),
    rightsAttestation: "owned_uploaded_media" as const,
    ...overrides,
  };
}

function transcript(overrides: Partial<OwnedMediaSttTranscript> = {}): OwnedMediaSttTranscript {
  return {
    text: [
      "This owned media speech transcript explains customer workflows, source provenance, policy decisions, validation gates, rollout tradeoffs, and implementation risks.",
      "The second segment covers search indexing, Ask answers, transcript repair, timestamp handling, rollback behavior, privacy constraints, and production blockers.",
    ].join(" "),
    languageCode: "EN-US",
    timestampMode: "timestamped",
    segments: [
      {
        startMs: 1_000,
        endMs: 4_000,
        text: "This owned media speech transcript explains customer workflows, source provenance, policy decisions, validation gates, rollout tradeoffs, and implementation risks.",
        confidence: 0.94,
      },
      {
        startMs: 5_000,
        endMs: 8_000,
        durationMs: 3_000,
        text: "The second segment covers search indexing, Ask answers, transcript repair, timestamp handling, rollback behavior, privacy constraints, and production blockers.",
        confidence: 0.91,
      },
    ],
    model: "mock-stt",
    requestId: "req-123",
    usage: { seconds: 8, inputTokens: 100, outputTokens: 60 },
    ...overrides,
  };
}

function provider(
  output: OwnedMediaSttTranscript | Error,
  options: { maxBytes?: number; providerName?: string; providerVersion?: string } = {},
): OwnedMediaSttProvider & { calls: OwnedMediaSttProviderInput[] } {
  const calls: OwnedMediaSttProviderInput[] = [];
  return {
    providerName: options.providerName ?? "mock-owned-stt",
    providerVersion: options.providerVersion ?? "test-v1",
    maxBytes: options.maxBytes,
    calls,
    async transcribe(input) {
      calls.push(input);
      if (output instanceof Error) throw output;
      return output;
    },
  };
}

test("attaches owned-media STT output with policy, source, segments, and bounded provider input", async () => {
  const item = youtubeItem();
  const mockProvider = provider(transcript());

  const result = await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    title: "Owned STT transcript video",
    media: media({ filename: "/Users/test/private/owned-video.mp4" }),
    provider: mockProvider,
    languageCode: "EN",
  });

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "Owned STT transcript video");
  assert.equal(updated.capture_quality, "metadata_plus_transcript");
  assert.equal(updated.extraction_method, "owned_media_stt");
  assert.equal(updated.extraction_version, "owned-media-stt-v1");
  assert.equal(updated.extraction_warning, null);
  assert.match(updated.body, /customer workflows/);

  assert.equal(mockProvider.calls.length, 1);
  assert.equal(mockProvider.calls[0].media.filename, "owned-video.mp4");
  const providerInputJson = JSON.stringify(result.providerInput);
  assert.equal(providerInputJson.includes("youtube.com"), false);
  assert.equal(providerInputJson.includes("ownedStt123"), false);
  assert.equal(providerInputJson.includes("/Users/test/private"), false);
  assert.equal(providerInputJson.includes("Bearer"), false);

  const policies = listCapturePolicyDecisionsForItem(item.id);
  assert.equal(policies.length, 1);
  assert.equal(policies[0].method, "owned_media_stt");
  assert.equal(policies[0].rights_basis, "owned_uploaded_media");
  assert.equal(policies[0].retention_class, "full_text_allowed");

  const activeSource = getActiveTranscriptSourceForItem(item.id)!;
  assert.equal(activeSource.id, result.transcriptSource.id);
  assert.equal(activeSource.source_kind, "owned_media_stt");
  assert.equal(activeSource.caption_source_class, "stt");
  assert.equal(activeSource.timestamp_mode, "timestamped");
  assert.equal(activeSource.language_code, "en-us");
  assert.equal(activeSource.segment_count, 2);
  assert.match(activeSource.text_sha256, /^[0-9a-f]{64}$/);

  const provenance = JSON.parse(activeSource.provenance_json) as Record<string, unknown>;
  assert.equal(provenance.input_type, "owned_media_stt");
  assert.equal(provenance.media_filename, "owned-video.mp4");
  assert.equal(provenance.media_basename, "owned-video.mp4");
  assert.equal(provenance.provider_name, "mock-owned-stt");
  assert.equal(provenance.adapter_version, "owned-media-stt-v1");
  assert.equal(JSON.stringify(provenance).includes("/Users/test/private"), false);

  const segments = listTranscriptSegmentsForSource(activeSource.id);
  assert.equal(segments.length, 2);
  assert.equal(segments[0].start_ms, 1000);
  assert.equal(segments[0].end_ms, 4000);
  assert.equal(segments[0].duration_ms, 3000);
  assert.equal(segments[0].confidence, 0.94);
});

test("rejects unsupported, oversized, zero-byte, or malformed media before provider call", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/mediaReject123" });
  const mockProvider = provider(transcript(), { maxBytes: 128 });

  for (const badMedia of [
    media({ filename: "audio.exe", contentType: "application/octet-stream" }),
    media({ byteLength: 129 }),
    media({ byteLength: 0 }),
    media({ sha256: "not-a-sha" }),
    media({ durationMs: 1.5 }),
  ]) {
    await assert.rejects(
      () =>
        attachOwnedMediaSttToYoutubeItem({
          itemId: item.id,
          media: badMedia,
          provider: mockProvider,
        }),
      (err) => err instanceof OwnedMediaSttError && err.code === "invalid_media",
    );
  }

  assert.equal(mockProvider.calls.length, 0);
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 0);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
  assert.equal(getItem(item.id)!.capture_quality, "metadata_only");
});

test("rejects non-YouTube items before provider call", async () => {
  const item = insertCaptured({
    source_type: "url",
    title: "Article",
    body: "Metadata",
    source_platform: "generic_article",
    capture_quality: "metadata_only",
  });
  const mockProvider = provider(transcript());

  await assert.rejects(
    () =>
      attachOwnedMediaSttToYoutubeItem({
        itemId: item.id,
        media: media(),
        provider: mockProvider,
      }),
    (err) => err instanceof OwnedMediaSttError && err.code === "not_youtube_item",
  );
  assert.equal(mockProvider.calls.length, 0);
});

test("policy block prevents provider call before media disclosure", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/policyBlock123" });
  const mockProvider = provider(transcript());

  await assert.rejects(
    () =>
      attachOwnedMediaSttToYoutubeItem({
        itemId: item.id,
        media: media(),
        provider: mockProvider,
        policyDecider: () => ({
          status: "blocked",
          decision: null as never,
          blockedReason: "owned_media_stt_disabled_for_test",
        }),
      }),
    (err) =>
      err instanceof OwnedMediaSttError &&
      err.code === "policy_blocked" &&
      err.message === "owned_media_stt_disabled_for_test",
  );

  assert.equal(mockProvider.calls.length, 0);
  const updated = getItem(item.id)!;
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("provider failure leaves item and transcript provenance unchanged after allowed policy preflight", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/providerFail123" });
  const mockProvider = provider(new Error("Bearer sk-secret failed for /tmp/private-audio.mp4"));

  await assert.rejects(
    () =>
      attachOwnedMediaSttToYoutubeItem({
        itemId: item.id,
        media: media(),
        provider: mockProvider,
      }),
    (err) =>
      err instanceof OwnedMediaSttError &&
      err.code === "provider_failed" &&
      err.message === "Owned-media STT provider failed." &&
      !err.message.includes("sk-secret") &&
      !err.message.includes("/tmp/private-audio.mp4"),
  );

  const updated = getItem(item.id)!;
  assert.equal(updated.title, item.title);
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(updated.extraction_warning, "no_transcript");
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("rejects invalid transcript output without database mutation", async () => {
  const cases: Array<[OwnedMediaSttTranscript, OwnedMediaSttError["code"]]> = [
    [transcript({ text: "too short", segments: [{ text: "too short" }], timestampMode: "paragraph_only" }), "text_too_short"],
    [
      transcript({
        timestampMode: "paragraph_only",
        segments: [{ text: "x".repeat(500_001) }],
      }),
      "text_too_large",
    ],
    [transcript({ segments: Array.from({ length: MAX_OWNED_MEDIA_STT_SEGMENTS + 1 }, () => ({ text: "valid segment text" })) }), "too_many_segments"],
    [transcript({ segments: [{ startMs: 5_000, endMs: 4_000, text: "bad timestamp segment" }] }), "invalid_segments"],
    [transcript({ segments: [{ startMs: 1_000, endMs: 2_000, text: "bad confidence segment", confidence: 1.5 }] }), "invalid_segments"],
    [
      transcript({
        segments: [
          { startMs: 5_000, endMs: 6_000, text: "later timestamp segment" },
          { startMs: 4_000, endMs: 5_000, text: "earlier timestamp segment" },
        ],
      }),
      "invalid_segments",
    ],
    [transcript({ segments: [{ startMs: 11_000, endMs: 14_000, text: "beyond duration segment" }] }), "invalid_segments"],
  ];

  for (const [badTranscript, code] of cases) {
    const item = youtubeItem({ source_url: `https://youtu.be/badTranscript${Math.random()}` });
    await assert.rejects(
      () =>
        attachOwnedMediaSttToYoutubeItem({
          itemId: item.id,
          media: media(),
          provider: provider(badTranscript),
        }),
      (err) => err instanceof OwnedMediaSttError && err.code === code,
    );
    assert.equal(getItem(item.id)!.capture_quality, "metadata_only");
    assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
    assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
  }
});

test("uses validated segment text as canonical item body when provider text conflicts", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/conflictingText123" });
  await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    media: media(),
    provider: provider(
      transcript({
        text: "A conflicting provider-level transcript claims something unrelated about finance, sports, and private notes. This should not be stored because segment evidence is canonical.",
      }),
    ),
  });

  const updated = getItem(item.id)!;
  assert.match(updated.body, /customer workflows/);
  assert.equal(updated.body.includes("finance, sports, and private notes"), false);
});

test("keeps policy audit row but rolls back item repair and source writes when segment persistence fails", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/rollbackStt123" });
  const db = getDb();
  db.exec(`
    CREATE TEMP TRIGGER fail_owned_stt_segment_insert
    BEFORE INSERT ON transcript_segments
    BEGIN
      SELECT RAISE(ABORT, 'forced owned-media STT segment failure');
    END;
  `);

  try {
    await assert.rejects(() =>
      attachOwnedMediaSttToYoutubeItem({
        itemId: item.id,
        title: "Should not persist",
        media: media(),
        provider: provider(transcript()),
      }),
    );
  } finally {
    db.exec("DROP TRIGGER IF EXISTS fail_owned_stt_segment_insert;");
  }

  const updated = getItem(item.id)!;
  assert.equal(updated.title, "Metadata-only owned media video");
  assert.equal(updated.body, "Original metadata-only body");
  assert.equal(updated.capture_quality, "metadata_only");
  assert.equal(updated.extraction_warning, "no_transcript");
  assert.equal(listCapturePolicyDecisionsForItem(item.id).length, 1);
  assert.equal(listTranscriptSourcesForItem(item.id).length, 0);
});

test("replacement supersedes old source and removes old active segments", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/replaceStt123" });

  const first = await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    media: media({ sha256: "b".repeat(64) }),
    provider: provider(transcript({ model: "first-model" })),
  });
  const second = await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    media: media({ sha256: "c".repeat(64) }),
    provider: provider(
      transcript({
        text: [
          "A replacement owned media transcript explains stronger customer evidence, additional validation, and updated implementation tradeoffs.",
          "The replacement transcript adds enough useful detail for search, Ask, source provenance, segment display, and rollback confidence.",
        ].join(" "),
        model: "second-model",
      }),
    ),
  });

  const sources = listTranscriptSourcesForItem(item.id);
  assert.equal(sources.length, 2);
  assert.equal(sources.find((source) => source.id === first.transcriptSource.id)?.status, "superseded");
  assert.equal(sources.find((source) => source.id === second.transcriptSource.id)?.status, "active");
  assert.equal(listTranscriptSegmentsForSource(first.transcriptSource.id).length, 0);
  assert.equal(listTranscriptSegmentsForSource(second.transcriptSource.id).length, 2);
});

test("provenance uses an allowlist and redacts path or token-like provider values", async () => {
  const item = youtubeItem({ source_url: "https://youtu.be/provenanceStt123" });
  const result = await attachOwnedMediaSttToYoutubeItem({
    itemId: item.id,
    media: media({
      filename: "/private/tmp/path-secret=abc/owned-secret-video.mp4",
      uploadedMediaId: "/tmp/upload-token=abc",
    }),
    provider: provider(transcript({ model: "api_key=abc123", requestId: "/tmp/request-secret=def456" }), {
      providerName: "Bearer sk-secret",
      providerVersion: "token=provider-secret",
    }),
  });

  const provenance = JSON.parse(result.transcriptSource.provenance_json) as Record<string, unknown>;
  const provenanceJson = JSON.stringify(provenance);
  assert.equal(provenance.media_filename, "owned-secret-video.mp4");
  assert.equal(provenanceJson.includes("/private/tmp"), false);
  assert.equal(provenanceJson.includes("/tmp/"), false);
  assert.equal(provenanceJson.includes("sk-secret"), false);
  assert.equal(provenanceJson.includes("abc123"), false);
  assert.equal(provenanceJson.includes("def456"), false);
  assert.equal(provenanceJson.includes("provider-secret"), false);
  assert.equal(provenanceJson.includes("youtube.com"), false);
});
