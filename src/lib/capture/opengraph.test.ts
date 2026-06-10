import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractOpenGraph } from "./opengraph";

describe("extractOpenGraph", () => {
  it("extracts title, description, image, and canonical URL", () => {
    const meta = extractOpenGraph(
      `<html><head>
        <meta property="og:title" content="Post title">
        <meta property="og:description" content="Post description">
        <meta property="og:image" content="/image.png">
        <link rel="canonical" href="/canonical">
      </head></html>`,
      "https://example.com/post",
    );
    assert.equal(meta.title, "Post title");
    assert.equal(meta.description, "Post description");
    assert.equal(meta.image, "https://example.com/image.png");
    assert.equal(meta.canonicalUrl, "https://example.com/canonical");
  });
});
