import test from "node:test";
import assert from "node:assert/strict";
import {
  needsUpgradeReason,
  improvementHint,
  platformLabel,
  qualityLabel,
  isLimitedCaptureQuality,
} from "../capture/quality";
import { isNeedsUpgrade, isFullTextCapture } from "../capture/upgrade-policy";

test("Capture Quality & Needs Upgrade Triage Unit Tests", async (t) => {
  await t.test("identifies degraded metadata-only capture", () => {
    const item = {
      source_type: "youtube" as const,
      source_platform: "youtube",
      capture_quality: "metadata_only",
      extraction_warning: "no_transcript",
    };
    const reason = needsUpgradeReason(item);
    assert.equal(reason, "Needs transcript");
    assert.equal(isNeedsUpgrade(item), true);
    assert.equal(isFullTextCapture(item), false);
    assert.equal(isLimitedCaptureQuality(item.capture_quality), true);
  });

  await t.test("identifies gold full-text transcript capture", () => {
    const item = {
      source_type: "youtube" as const,
      source_platform: "youtube",
      capture_quality: "user_provided_full_text",
      extraction_warning: null,
    };
    const reason = needsUpgradeReason(item);
    assert.equal(reason, null);
    assert.equal(isNeedsUpgrade(item), false);
    assert.equal(isFullTextCapture(item), true);
    assert.equal(isLimitedCaptureQuality(item.capture_quality), false);
  });

  await t.test("formats platform and quality labels correctly", () => {
    assert.equal(platformLabel("youtube", "youtube"), "YouTube");
    assert.equal(platformLabel("generic_article", "url"), "Article");
    assert.equal(platformLabel("pdf", "pdf"), "PDF");
    assert.equal(qualityLabel("user_provided_full_text"), "Full text");
    assert.equal(qualityLabel("metadata_only"), "Metadata only");
    assert.equal(qualityLabel("paywall_preview"), "Preview only");
  });

  await t.test("generates actionable improvement hints", () => {
    const hint = improvementHint("youtube", "metadata_only");
    assert.ok(hint && hint.includes("transcript"));
  });
});
