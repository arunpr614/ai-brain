import "./policy.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./policy.test.setup";
import { insertCaptured } from "@/db/items";
import { listCapturePolicyDecisionsForItem } from "@/db/transcripts";
import {
  allowUserProvidedTranscriptForItem,
  decideTranscriptAcquisition,
} from "./policy";

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("user-provided transcript creates an allowed full-text policy decision", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=abc123",
    title: "Video",
    body: "Metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
  });

  const result = allowUserProvidedTranscriptForItem(item);

  assert.equal(result.status, "allowed");
  if (result.status !== "allowed") throw new Error("expected allowed");
  assert.equal(result.allowed.__brand, "AllowedTranscriptAcquisition");
  assert.equal(result.allowed.method, "user_paste");
  assert.equal(result.allowed.retentionClass, "full_text_allowed");
  assert.equal(result.decision.production_allowed, 1);

  const rows = listCapturePolicyDecisionsForItem(item.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rights_basis, "user_provided_transcript");
  assert.equal(rows[0].blocked_reason, null);
});

test("public lab caption acquisition is blocked in production without legal approval", () => {
  const result = decideTranscriptAcquisition({
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    platform: "youtube",
    environment: "production",
    rightsBasis: "public_lab_only",
    method: "lab_public_caption",
    retentionClass: "derived_metrics_only",
  });

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") throw new Error("expected blocked");
  assert.equal(
    result.blockedReason,
    "lab_public_caption_requires_legal_approval_in_production",
  );
  assert.equal(result.decision.production_allowed, 0);
  assert.equal(result.decision.rights_basis, "blocked_unknown_rights");
});

test("public lab caption full-text retention is blocked without legal approval", () => {
  const result = decideTranscriptAcquisition({
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    platform: "youtube",
    environment: "lab",
    rightsBasis: "public_lab_only",
    method: "lab_public_caption",
    retentionClass: "full_text_allowed",
  });

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") throw new Error("expected blocked");
  assert.equal(
    result.blockedReason,
    "lab_public_caption_full_text_requires_legal_approval",
  );
  assert.equal(result.decision.production_allowed, 0);
});
