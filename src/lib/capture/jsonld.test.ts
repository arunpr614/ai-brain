import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractArticleJsonLd } from "./jsonld";

describe("extractArticleJsonLd", () => {
  it("extracts Article metadata from JSON-LD", () => {
    const article = extractArticleJsonLd(`
      <script type="application/ld+json">
        {
          "@type": "BlogPosting",
          "headline": "A post",
          "author": {"name": "Author"},
          "datePublished": "2026-01-01T00:00:00Z",
          "image": {"url": "https://example.com/img.png"},
          "description": "Summary"
        }
      </script>
    `);
    assert.equal(article?.headline, "A post");
    assert.equal(article?.author, "Author");
    assert.equal(article?.description, "Summary");
  });
});
