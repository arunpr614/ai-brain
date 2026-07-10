import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { captureSourceLabel, improvementHint, platformLabel, qualityLabel } from "./quality";

describe("capture quality labels", () => {
  it("renders human labels for platform and quality", () => {
    assert.equal(platformLabel("youtube_short"), "YouTube Short");
    assert.equal(platformLabel("linkedin"), "LinkedIn");
    assert.equal(qualityLabel("metadata_plus_transcript"), "Transcript");
    assert.equal(qualityLabel("user_provided_full_text"), "Full text");
  });

  it("suggests repair hints for weak captures", () => {
    assert.match(improvementHint("linkedin", "metadata_only") ?? "", /Paste the post text/);
    assert.match(improvementHint("substack", "paywall_preview") ?? "", /email-body capture/);
    assert.equal(improvementHint("generic_article", "full_text"), null);
  });

  it("renders human labels for capture sources", () => {
    assert.equal(captureSourceLabel("recall"), "Recall");
    assert.equal(captureSourceLabel("android"), "Android");
    assert.equal(captureSourceLabel("unknown-source"), "Unknown");
  });
});
