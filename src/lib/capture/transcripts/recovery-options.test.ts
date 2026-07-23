import "./recovery-options.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./recovery-options.test.setup";
import type { ItemRow } from "@/db/client";
import { getDb } from "@/db/client";
import type { TranscriptSourceRow } from "@/db/transcripts";
import { buildYoutubeTranscriptRecoveryStatus } from "./recovery-options";

const DEPLOYMENT_KEYS = [
  "BRAIN_DEPLOYMENT_ENV",
  "BRAIN_PRODUCTION_RUNTIME",
  "BRAIN_TRANSCRIPT_ENV",
  "NODE_ENV",
] as const;

function withDeployment<T>(
  values: Partial<Record<(typeof DEPLOYMENT_KEYS)[number], string>>,
  run: () => T,
): T {
  const saved = Object.fromEntries(
    DEPLOYMENT_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof DEPLOYMENT_KEYS)[number], string | undefined>;
  for (const key of DEPLOYMENT_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) Reflect.set(process.env, key, value);
  }
  try {
    return run();
  } finally {
    for (const key of DEPLOYMENT_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else Reflect.set(process.env, key, value);
    }
  }
}

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

function item(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: "item-recovery-1",
    source_type: "youtube",
    capture_source: "web",
    source_url: "https://www.youtube.com/watch?v=recovery12345",
    title: "Metadata-only video",
    author: null,
    body: "Metadata-only placeholder",
    summary: null,
    quotes: null,
    category: null,
    captured_at: 1,
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: "no_transcript",
    total_pages: null,
    total_chars: null,
    duration_seconds: null,
    source_platform: "youtube",
    capture_quality: "metadata_only",
    extraction_method: "youtube_metadata",
    extraction_version: "test",
    published_at: null,
    thumbnail_url: null,
    description: null,
    batch_id: null,
    ...overrides,
  };
}

function activeTranscriptSource(
  overrides: Partial<TranscriptSourceRow> = {},
): Pick<
  TranscriptSourceRow,
  "source_kind" | "caption_source_class" | "timestamp_mode" | "segment_count" | "language_code"
> {
  return {
    source_kind: "uploaded_file",
    caption_source_class: "user_provided",
    timestamp_mode: "timestamped",
    segment_count: 12,
    language_code: "en",
    ...overrides,
  };
}

test("builds stable recovery options for YouTube metadata-only captures", () => {
  const status = buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
    repairHref: "/items/item-recovery-1/repair",
  });

  assert.equal(status.isYoutube, true);
  assert.equal(status.status, "needs_transcript");
  assert.equal(status.hasActiveTranscript, false);
  assert.equal(status.primaryActionLabel, "Add transcript");
  assert.deepEqual(
    status.options.map((option) => option.id),
    [
      "paste_transcript",
      "upload_transcript_file",
      "official_youtube_captions",
      "owned_media_stt",
      "public_extraction",
    ],
  );

  const [paste, upload, official, stt, publicExtraction] = status.options;
  assert.equal(paste.status, "available");
  assert.equal(paste.method, "user_paste");
  assert.equal(paste.href, "/items/item-recovery-1/repair#text");
  assert.equal(upload.status, "available");
  assert.equal(upload.method, "uploaded_file");
  assert.equal(upload.href, "/items/item-recovery-1/repair#transcript_file");
  assert.equal(official.status, "gated");
  assert.equal(official.method, "youtube_official_caption");
  assert.match(official.requires, /owned or authorized/i);
  assert.equal(official.href, undefined);
  assert.equal(stt.status, "gated");
  assert.equal(stt.method, "owned_media_stt");
  assert.match(stt.requires, /Owned-media upload UX/i);
  assert.equal(stt.href, undefined);
  assert.equal(publicExtraction.status, "blocked");
  assert.equal(publicExtraction.method, "lab_public_caption");
  assert.match(publicExtraction.blocker ?? "", /legal\/platform-approved/i);
  assert.equal(publicExtraction.href, undefined);
});

test("returns not applicable status for non-YouTube items", () => {
  const status = buildYoutubeTranscriptRecoveryStatus({
    item: item({
      id: "article-1",
      source_type: "url",
      source_platform: "generic_article",
      source_url: "https://example.com/post",
      title: "Article",
    }),
    environment: "production",
  });

  assert.equal(status.isYoutube, false);
  assert.equal(status.status, "not_applicable");
  assert.equal(status.primaryActionLabel, "Add text");
  assert.deepEqual(status.options, []);
});

test("uses shared YouTube detection when source platform is sparse", () => {
  const status = buildYoutubeTranscriptRecoveryStatus({
    item: item({ source_type: "youtube", source_platform: null }),
    environment: "production",
  });

  assert.equal(status.isYoutube, true);
  assert.equal(status.options[0].id, "paste_transcript");
});

test("reflects active transcript source independently of capture quality", () => {
  const status = buildYoutubeTranscriptRecoveryStatus({
    item: item({
      capture_quality: "user_provided_full_text",
      extraction_method: "manual_repair_transcript",
    }),
    activeTranscriptSource: activeTranscriptSource(),
    environment: "production",
  });

  assert.equal(status.status, "has_transcript");
  assert.equal(status.hasActiveTranscript, true);
  assert.equal(status.primaryActionLabel, "Replace transcript");
  assert.match(status.summary, /already has an active transcript source/i);
  assert.equal(status.options[0].label, "Replace with pasted transcript");
});

test("gated and blocked options never expose actions", () => {
  const status = withDeployment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "0",
  }, () => buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
    labPublicExtractionApproved: true,
    officialCaptionsWired: true,
    ownedMediaSttWired: true,
  }));

  for (const option of status.options) {
    if (option.status === "available") continue;
    assert.equal(option.href, undefined, `${option.id} should not have href`);
    assert.equal(option.actionLabel, undefined, `${option.id} should not have action label`);
    assert.ok(option.blocker, `${option.id} should explain the blocker`);
  }
  assert.equal(status.options.find((option) => option.id === "public_extraction")?.status, "gated");
});

test("does not present public extraction as a normal production route", () => {
  const production = withDeployment({
    BRAIN_DEPLOYMENT_ENV: "production",
    BRAIN_PRODUCTION_RUNTIME: "1",
  }, () => buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "lab",
    labPublicExtractionApproved: true,
  }));
  const lab = withDeployment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "0",
  }, () => buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
    labPublicExtractionApproved: true,
  }));

  const productionPublic = production.options.find((option) => option.id === "public_extraction")!;
  const labPublic = lab.options.find((option) => option.id === "public_extraction")!;
  assert.equal(productionPublic.status, "blocked");
  assert.equal(productionPublic.href, undefined);
  assert.equal(labPublic.status, "gated");
  assert.equal(labPublic.href, undefined);
  assert.match(labPublic.description, /not a production recovery route/i);
});

test("caller and legacy environment inputs cannot promote public extraction", () => {
  const deniedDeployments = [
    {},
    {
      BRAIN_DEPLOYMENT_ENV: "production",
      BRAIN_PRODUCTION_RUNTIME: "1",
    },
    {
      BRAIN_DEPLOYMENT_ENV: "production",
    },
    {
      BRAIN_PRODUCTION_RUNTIME: "1",
    },
    {
      BRAIN_DEPLOYMENT_ENV: "production",
      BRAIN_PRODUCTION_RUNTIME: "0",
    },
    {
      BRAIN_DEPLOYMENT_ENV: "lab",
      BRAIN_PRODUCTION_RUNTIME: "1",
    },
    {
      BRAIN_DEPLOYMENT_ENV: "LAB",
      BRAIN_PRODUCTION_RUNTIME: "0",
    },
    {
      BRAIN_DEPLOYMENT_ENV: "lab",
      BRAIN_PRODUCTION_RUNTIME: "false",
    },
  ] as const;

  for (const deployment of deniedDeployments) {
    const status = withDeployment({
      ...deployment,
      BRAIN_TRANSCRIPT_ENV: "lab",
      NODE_ENV: "development",
    }, () => buildYoutubeTranscriptRecoveryStatus({
      item: item(),
      environment: "lab",
      labPublicExtractionApproved: true,
    }));
    const option = status.options.find(
      (candidate) => candidate.id === "public_extraction",
    )!;
    assert.equal(option.status, "blocked");
    assert.equal(option.href, undefined);
    assert.equal(option.actionLabel, undefined);
  }
});

test("only an authoritative lab can show the approved no-action gated display", () => {
  for (const deployment of ["development", "test"] as const) {
    const status = withDeployment({
      BRAIN_DEPLOYMENT_ENV: deployment,
      BRAIN_PRODUCTION_RUNTIME: "0",
    }, () => buildYoutubeTranscriptRecoveryStatus({
      item: item(),
      environment: "lab",
      labPublicExtractionApproved: true,
    }));
    const option = status.options.find(
      (candidate) => candidate.id === "public_extraction",
    )!;
    assert.equal(option.status, "blocked");
  }

  const lab = withDeployment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "0",
  }, () => buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
    labPublicExtractionApproved: true,
  }));
  const option = lab.options.find(
    (candidate) => candidate.id === "public_extraction",
  )!;
  assert.equal(option.status, "gated");
  assert.equal(option.href, undefined);
  assert.equal(option.actionLabel, undefined);
});

test("option text does not describe unsafe automatic behavior as available", () => {
  const status = buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
  });
  const text = JSON.stringify(status.options).toLowerCase();

  assert.equal(text.includes("cookie"), false);
  assert.equal(text.includes("browser state"), false);
  assert.equal(text.includes("remote media download"), false);
  assert.equal(text.includes("automatic public youtube transcript fetching"), false);
  assert.equal(
    status.options
      .filter((option) => option.status === "available")
      .some((option) => /public|oauth|stt|media/i.test(`${option.label} ${option.description}`)),
    false,
  );
});

test("status model does not insert policy decisions", () => {
  const db = getDb();
  const before = db
    .prepare("SELECT COUNT(*) AS count FROM capture_policy_decisions")
    .get() as { count: number };

  buildYoutubeTranscriptRecoveryStatus({
    item: item(),
    environment: "production",
    officialCaptionsWired: true,
    ownedMediaSttWired: true,
    labPublicExtractionApproved: true,
  });

  const afterCount = db
    .prepare("SELECT COUNT(*) AS count FROM capture_policy_decisions")
    .get() as { count: number };
  assert.equal(afterCount.count, before.count);
});
