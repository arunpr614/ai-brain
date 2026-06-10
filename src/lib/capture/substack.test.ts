import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractSubstackFromUrl } from "./substack";

let originalFetch: typeof fetch;

const ARTICLE_TEXT =
  "This is a public Substack article body with enough words to be considered a full text capture. ".repeat(20);

describe("Substack capture adapter", () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("uses Readability body with JSON-LD metadata enrichment", async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/feed")) {
        return new Response("<rss><channel></channel></rss>", {
          status: 200,
          headers: { "content-type": "application/xml" },
        });
      }
      return new Response(
        `<html><head>
          <title>Fallback title</title>
          <script type="application/ld+json">
            {"@type":"BlogPosting","headline":"Substack title","author":{"name":"Writer"},"datePublished":"2026-01-01T00:00:00Z","description":"Summary"}
          </script>
        </head><body><article><h1>Substack title</h1><p>${ARTICLE_TEXT}</p></article></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    };

    const result = await extractSubstackFromUrl("https://example.substack.com/p/post");
    assert.equal(result.source_platform, "substack");
    assert.equal(result.capture_quality, "full_text");
    assert.equal(result.author, "Writer");
    assert.equal(result.description, "Summary");
    assert.match(result.body, /Article:\n[\s\S]*This is a public Substack article/);
  });

  it("labels long paid previews as paywall previews instead of full text", async () => {
    const longPreview = "This is teaser text that looks substantial but is still only a subscriber preview. ".repeat(80);
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.endsWith("/feed")) {
        return new Response("<rss><channel></channel></rss>", {
          status: 200,
          headers: { "content-type": "application/xml" },
        });
      }
      return new Response(
        `<html><head>
          <title>Paid post</title>
          <meta property="og:description" content="Preview only">
        </head><body>
          <article><h1>Paid post</h1><p>${longPreview}</p></article>
          <div>Subscribe to continue reading. This post is for paid subscribers.</div>
        </body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    };

    const result = await extractSubstackFromUrl("https://example.substack.com/p/paid");
    assert.equal(result.capture_quality, "paywall_preview");
    assert.equal(result.extraction_warning, "paywall_preview");
    assert.match(result.body, /Capture quality: paywall_preview/);
    const metadata = result.artifacts?.find((artifact) => artifact.kind === "metadata_json");
    assert.ok(metadata);
    assert.equal(JSON.parse(String(metadata.body)).paywall_signal, true);
  });
});
