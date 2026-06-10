import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { captureLinkedInUserText, extractLinkedInMetadataFromUrl } from "./linkedin";
import { meaningfulUserText } from "./capture-url";

let originalFetch: typeof fetch;

describe("LinkedIn capture adapter", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("captures user-provided LinkedIn text as full text without fetching", () => {
    const result = captureLinkedInUserText(
      "https://www.linkedin.com/posts/example",
      "This is a compact but complete post body supplied by the user.",
    );
    assert.equal(result.source_platform, "linkedin");
    assert.equal(result.capture_quality, "user_provided_full_text");
    assert.equal(result.extraction_method, "user_paste");
    assert.match(result.body, /Post text:/);
  });

  it("extracts metadata-only capture from Open Graph", async () => {
    globalThis.fetch = async () =>
      new Response(
        `<html><head>
          <meta property="og:title" content="LinkedIn post title">
          <meta property="og:description" content="LinkedIn preview">
          <meta property="og:url" content="https://www.linkedin.com/posts/example">
        </head></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );

    const result = await extractLinkedInMetadataFromUrl("https://www.linkedin.com/posts/example");
    assert.equal(result.capture_quality, "metadata_only");
    assert.equal(result.title, "LinkedIn post title");
    assert.match(result.body, /Preview:\nLinkedIn preview/);
    assert.deepEqual(
      result.artifacts?.map((artifact) => artifact.kind),
      ["metadata_json"],
    );
    assert.doesNotMatch(JSON.stringify(result.artifacts), /html_snapshot|<html/i);
  });

  it("preserves pasted text paragraphs and secondary links while removing only the captured URL", () => {
    const cleaned = meaningfulUserText(
      `https://www.linkedin.com/posts/example

First paragraph with enough words to be useful.

- Bullet with context
- Another bullet with https://example.com/context`,
      "https://www.linkedin.com/posts/example",
    );

    assert.ok(cleaned);
    assert.doesNotMatch(cleaned, /linkedin\.com\/posts\/example/);
    assert.match(cleaned, /First paragraph[\s\S]*\n\n- Bullet/);
    assert.match(cleaned, /https:\/\/example\.com\/context/);
  });
});
