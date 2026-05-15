/**
 * Unit tests for src/lib/outbox/classify.ts (OFFLINE-2 / plan v3 §5.3).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyOutcome } from "./classify";

describe("classifyOutcome — network errors", () => {
  it("network-error → transient", () => {
    const out = classifyOutcome({ kind: "network-error", message: "ECONNREFUSED" });
    assert.equal(out.kind, "transient");
    assert.match(
      out.kind === "transient" ? out.reason : "",
      /ECONNREFUSED/,
    );
  });
});

describe("classifyOutcome — non-JSON HTTP responses (captive portal proxy, B-3 fix)", () => {
  it("200 OK with text/html body is transient (captive portal proxy)", () => {
    const out = classifyOutcome({
      kind: "http-non-json",
      status: 200,
      contentType: "text/html",
    });
    assert.equal(out.kind, "transient");
  });

  it("any non-JSON status is transient regardless of code", () => {
    for (const status of [200, 301, 302, 401, 500]) {
      const out = classifyOutcome({
        kind: "http-non-json",
        status,
        contentType: "text/html",
      });
      assert.equal(out.kind, "transient", `status=${status}`);
    }
  });

  it("includes content-type in the reason", () => {
    const out = classifyOutcome({
      kind: "http-non-json",
      status: 200,
      contentType: "text/html",
    });
    assert.match(
      out.kind === "transient" ? out.reason : "",
      /text\/html/,
    );
  });
});

describe("classifyOutcome — 5xx", () => {
  it("500 → transient", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 500,
      retryAfter: null,
      body: {},
    });
    assert.equal(out.kind, "transient");
  });

  it("502, 503, 504 → transient", () => {
    for (const status of [502, 503, 504]) {
      const out = classifyOutcome({
        kind: "http-json",
        status,
        retryAfter: null,
        body: {},
      });
      assert.equal(out.kind, "transient");
    }
  });
});

describe("classifyOutcome — 429", () => {
  it("429 → transient with rate_limited reason", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 429,
      retryAfter: "60",
      body: {},
    });
    assert.equal(out.kind, "transient");
    assert.equal(out.kind === "transient" ? out.reason : "", "rate_limited");
  });
});

describe("classifyOutcome — terminal 4xx", () => {
  it("401 → stuck:auth_bad", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 401,
      retryAfter: null,
      body: { error: "unauthenticated" },
    });
    assert.deepEqual(out, { kind: "stuck", reason: "auth_bad" });
  });

  it("403 → stuck:auth_bad", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 403,
      retryAfter: null,
      body: {},
    });
    assert.deepEqual(out, { kind: "stuck", reason: "auth_bad" });
  });

  it("422 with code='version_mismatch' → stuck:version_mismatch", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 422,
      retryAfter: null,
      body: { code: "version_mismatch", message: "Update Brain" },
    });
    assert.deepEqual(out, { kind: "stuck", reason: "version_mismatch" });
  });

  it("422 without version_mismatch code → stuck:payload_bad", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 422,
      retryAfter: null,
      body: { issues: ["bad field"] },
    });
    assert.deepEqual(out, { kind: "stuck", reason: "payload_bad" });
  });

  it("400 → stuck:payload_bad", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 400,
      retryAfter: null,
      body: {},
    });
    assert.deepEqual(out, { kind: "stuck", reason: "payload_bad" });
  });
});

describe("classifyOutcome — 2xx success", () => {
  it("200 with itemId → synced with serverItemId", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 200,
      retryAfter: null,
      body: { itemId: "abc123" },
    });
    assert.deepEqual(out, { kind: "synced", serverItemId: "abc123" });
  });

  it("201 with id → synced with serverItemId", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 201,
      retryAfter: null,
      body: { id: "fresh1" },
    });
    assert.deepEqual(out, { kind: "synced", serverItemId: "fresh1" });
  });

  it("200 with duplicate=true and itemId → synced", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 200,
      retryAfter: null,
      body: { duplicate: true, itemId: "existing-id" },
    });
    assert.deepEqual(out, { kind: "synced", serverItemId: "existing-id" });
  });

  it("204 with empty body → synced without serverItemId", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 204,
      retryAfter: null,
      body: {},
    });
    assert.deepEqual(out, { kind: "synced" });
  });
});

describe("classifyOutcome — unexpected status codes", () => {
  it("3xx (after fetch redirect) → transient", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 304,
      retryAfter: null,
      body: {},
    });
    assert.equal(out.kind, "transient");
  });

  it("100-series → transient", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 100,
      retryAfter: null,
      body: {},
    });
    assert.equal(out.kind, "transient");
  });
});

describe("classifyOutcome — body shape robustness", () => {
  it("null body on 200 → synced without serverItemId", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 200,
      retryAfter: null,
      body: null,
    });
    assert.deepEqual(out, { kind: "synced" });
  });

  it("non-string itemId is ignored", () => {
    const out = classifyOutcome({
      kind: "http-json",
      status: 200,
      retryAfter: null,
      body: { itemId: 123 },
    });
    assert.deepEqual(out, { kind: "synced" });
  });
});
