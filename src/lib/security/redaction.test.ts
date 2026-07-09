import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  redactContent,
  redactError,
  redactReportValue,
  redactSensitiveString,
  redactTitle,
} from "./redaction";

describe("redaction helpers", () => {
  it("redacts Recall API keys and bearer headers", () => {
    assert.equal(
      redactSensitiveString("RECALL_API_KEY=sk_abc123456789abcdef"),
      "RECALL_API_KEY=<redacted:secret>",
    );
    assert.equal(
      redactSensitiveString("Authorization: Bearer sk_abc123456789abcdef"),
      "Authorization: Bearer <redacted:token>",
    );
    assert.equal(
      redactSensitiveString("failed with Bearer sk_abc123456789abcdef"),
      "failed with Bearer <redacted:token>",
    );
  });

  it("redacts sensitive query-string values", () => {
    assert.equal(
      redactSensitiveString("https://example.com/a?token=abc&signature=def&keep=yes"),
      "https://example.com/a?token=<redacted>&signature=<redacted>&keep=yes",
    );
    assert.equal(
      redactSensitiveString("https://files.example.com/doc.pdf?X-Amz-Signature=abc"),
      "https://files.example.com/doc.pdf?X-Amz-Signature=<redacted>",
    );
  });

  it("redacts cookies, full content, and sensitive titles", () => {
    assert.equal(redactSensitiveString("Cookie: session=abc; recall=def"), "Cookie: <redacted:cookie>");
    assert.equal(redactContent("private chunk body"), "<redacted:content length=18>");
    assert.equal(redactTitle("Private medical note", true), "<redacted:title>");
  });

  it("redacts error messages and stacks", () => {
    const error = new Error("fetch failed: Authorization: Bearer sk_abc123456789abcdef");
    const redacted = redactError(error);
    assert.equal(
      redacted.message,
      "fetch failed: Authorization: Bearer <redacted:token>",
    );
    assert.equal(String(redacted.stack).includes("sk_abc123456789abcdef"), false);
  });

  it("recursively redacts report values", () => {
    const report = redactReportValue(
      {
        title: "Private medical note",
        source_url: "https://example.com/a?token=abc&keep=yes",
        detail: {
          body: "this is the private Recall card body",
          chunks: ["chunk one", "chunk two"],
          error: "Bearer sk_abc123456789abcdef",
        },
      },
      { redactTitles: true },
    ) as Record<string, unknown>;

    assert.equal(report.title, "<redacted:title>");
    assert.equal(report.source_url, "https://example.com/a?token=<redacted>&keep=yes");
    assert.deepEqual(report.detail, {
      body: "<redacted:content length=36>",
      chunks: ["<redacted:content length=9>", "<redacted:content length=9>"],
      error: "Bearer <redacted:token>",
    });
  });

  it("can redact long strings when asked", () => {
    assert.equal(
      redactSensitiveString("x".repeat(8), { redactLongContent: true, longContentThreshold: 5 }),
      "<redacted:content length=8>",
    );
  });
});
