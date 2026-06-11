import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canUpgradeWithPastedText,
  classifyCaptureUpgrade,
  isFullTextCapture,
  isNeedsUpgrade,
} from "./upgrade-policy";
import type { ItemRow } from "@/db/client";

function item(overrides: Partial<ItemRow>): ItemRow {
  return {
    id: "item",
    source_type: "url",
    capture_source: "web",
    source_url: "https://example.com",
    title: "Item",
    author: null,
    body: "Body",
    summary: null,
    quotes: null,
    category: null,
    captured_at: 0,
    enriched_at: null,
    enrichment_state: "pending",
    extraction_warning: null,
    total_pages: null,
    total_chars: 4,
    duration_seconds: null,
    source_platform: "linkedin",
    capture_quality: "metadata_only",
    extraction_method: null,
    extraction_version: null,
    published_at: null,
    thumbnail_url: null,
    description: null,
    batch_id: null,
    ...overrides,
  };
}

describe("capture upgrade policy", () => {
  it("allows weak YouTube and LinkedIn captures to upgrade with meaningful user text", () => {
    for (const platform of ["youtube", "youtube_short", "linkedin"]) {
      const decision = classifyCaptureUpgrade(item({ source_platform: platform }), {
        platform,
        quality: "user_provided_full_text",
        hasMeaningfulText: true,
        hasUserText: true,
      });
      assert.equal(decision.action, "upgrade");
    }
  });

  it("does not overwrite strong captures with casual pasted text", () => {
    for (const quality of ["full_text", "metadata_plus_transcript", "transcript", "user_provided_full_text"]) {
      const decision = classifyCaptureUpgrade(item({ capture_quality: quality }), {
        platform: "linkedin",
        quality: "user_provided_full_text",
        hasMeaningfulText: true,
        hasUserText: true,
      });
      assert.equal(decision.action, "duplicate");
      assert.equal(decision.reason, "existing_capture_is_strong");
    }
  });

  it("rejects too-short user text before extraction", () => {
    const decision = classifyCaptureUpgrade(item({}), {
      platform: "linkedin",
      quality: "user_provided_full_text",
      hasMeaningfulText: false,
      hasUserText: true,
    });
    assert.equal(decision.action, "rejected_too_short");
  });

  it("classifies library review buckets", () => {
    assert.equal(isNeedsUpgrade(item({ source_platform: "youtube", capture_quality: "metadata_only" })), true);
    assert.equal(isNeedsUpgrade(item({ source_platform: "substack", capture_quality: "paywall_preview" })), true);
    assert.equal(isNeedsUpgrade(item({ source_platform: "generic_article", capture_quality: "metadata_only" })), false);
    assert.equal(isFullTextCapture(item({ capture_quality: "email_body" })), true);
  });

  it("only enables pasted-text upgrade for platforms the submit path supports", () => {
    assert.equal(canUpgradeWithPastedText(item({ source_platform: "youtube", capture_quality: "metadata_only" })), true);
    assert.equal(canUpgradeWithPastedText(item({ source_platform: "youtube_short", capture_quality: "metadata_only" })), true);
    assert.equal(canUpgradeWithPastedText(item({ source_platform: "linkedin", capture_quality: "metadata_only" })), true);
    assert.equal(canUpgradeWithPastedText(item({ source_platform: "substack", capture_quality: "paywall_preview" })), false);
    assert.equal(canUpgradeWithPastedText(item({ source_platform: "youtube", capture_quality: "metadata_plus_transcript" })), false);
  });

  it("selected browser text can upgrade weak web captures", () => {
    assert.deepEqual(
      classifyCaptureUpgrade(
        item({ source_platform: "substack", capture_quality: "paywall_preview" }),
        { platform: "substack", quality: "client_dom", hasMeaningfulText: true, hasUserText: true },
      ),
      { action: "upgrade", reason: "weak_capture_selected_text" },
    );
    assert.deepEqual(
      classifyCaptureUpgrade(
        item({ source_platform: "generic_article", capture_quality: "metadata_only" }),
        {
          platform: "generic_article",
          quality: "client_dom",
          hasMeaningfulText: true,
          hasUserText: true,
        },
      ),
      { action: "upgrade", reason: "weak_capture_selected_text" },
    );
    assert.equal(
      classifyCaptureUpgrade(
        item({ source_platform: "substack", capture_quality: "full_text" }),
        { platform: "substack", quality: "client_dom", hasMeaningfulText: true, hasUserText: true },
      ).action,
      "duplicate",
    );
  });
});
