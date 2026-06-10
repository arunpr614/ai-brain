import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeUserProvidedText, buildUserProvidedBody } from "./user-provided";

describe("user-provided capture text", () => {
  it("removes only the source URL while preserving paragraphs, bullets, timestamps, and secondary links", () => {
    const source = "https://www.youtube.com/watch?v=abc12345678";
    const analysis = analyzeUserProvidedText(
      `${source}

[00:01] First paragraph has enough words to be useful.

- Bullet with context
- Secondary link https://example.com/context remains`,
      source,
      source,
    );

    assert.equal(analysis.isMeaningful, true);
    assert.doesNotMatch(analysis.text, /youtube\.com\/watch/);
    assert.match(analysis.text, /\[00:01\] First paragraph/);
    assert.match(analysis.text, /\n\n- Bullet with context/);
    assert.match(analysis.text, /https:\/\/example\.com\/context/);
  });

  it("rejects text below the meaningful-word threshold", () => {
    const analysis = analyzeUserProvidedText(
      "https://example.com/post tiny note",
      "https://example.com/post",
    );
    assert.equal(analysis.isMeaningful, false);
    assert.equal(analysis.wordCount, 2);
  });

  it("builds a provenance header that names user paste", () => {
    const body = buildUserProvidedBody({
      title: "Video",
      platform: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=abc12345678",
      text: "This pasted transcript has enough context to remember.",
    });
    assert.match(body, /Capture quality: user_provided_full_text/);
    assert.match(body, /Provided by: user paste/);
    assert.match(body, /Pasted text:/);
  });
});
