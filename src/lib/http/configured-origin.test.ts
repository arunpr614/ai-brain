import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateConfiguredRequestOrigin,
  isExactConfiguredRequestOrigin,
  parseConfiguredPublicOrigin,
  privateNoStoreHeaders,
} from "./configured-origin";

describe("configured public origin", () => {
  it("accepts one exact HTTP or HTTPS origin and normalizes host case and default ports", () => {
    const https = parseConfiguredPublicOrigin(
      "HTTPS://Brain.Example.COM:443/",
    );
    assert.deepEqual(https, {
      ok: true,
      value: {
        origin: "https://brain.example.com",
        protocol: "https:",
        hostname: "brain.example.com",
        effectivePort: "443",
      },
    });
    assert.equal(Object.isFrozen(https), true);
    assert.equal(https.ok && Object.isFrozen(https.value), true);

    const http = parseConfiguredPublicOrigin("http://LOCALHOST:80");
    assert.deepEqual(http, {
      ok: true,
      value: {
        origin: "http://localhost",
        protocol: "http:",
        hostname: "localhost",
        effectivePort: "80",
      },
    });
  });

  it("preserves and compares non-default effective ports exactly", () => {
    const configured = parseConfiguredPublicOrigin(
      "https://brain.example.com:8443",
    );
    assert.equal(
      isExactConfiguredRequestOrigin(
        new Headers({ Origin: "https://BRAIN.example.com:8443/" }),
        configured,
      ),
      true,
    );
    assert.equal(
      isExactConfiguredRequestOrigin(
        new Headers({ Origin: "https://brain.example.com" }),
        configured,
      ),
      false,
    );
  });

  it("rejects missing, malformed, null, credential-bearing, and non-origin configuration", () => {
    const invalid = [
      null,
      "null",
      " NULL ",
      "brain.example.com",
      "ftp://brain.example.com",
      "chrome-extension://abcdefghijklmnop",
      "https://user@brain.example.com",
      "https://user:secret@brain.example.com",
      "https://brain.example.com/path",
      "https://brain.example.com/.",
      "https://brain.example.com//",
      "https://brain.example.com?",
      "https://brain.example.com?x=1",
      "https://brain.example.com#fragment",
      "https://brain.example.com,https://evil.example",
      "https://brain.example.com https://evil.example",
      " https://brain.example.com",
      "https://brain.example.com ",
      "https:\\\\brain.example.com",
      "https://brain.example.com:",
    ];

    assert.deepEqual(parseConfiguredPublicOrigin(undefined), {
      ok: false,
      code: "configured_origin_missing",
    });
    assert.deepEqual(parseConfiguredPublicOrigin(""), {
      ok: false,
      code: "configured_origin_missing",
    });
    for (const value of invalid) {
      assert.deepEqual(
        parseConfiguredPublicOrigin(value),
        { ok: false, code: "configured_origin_invalid" },
        String(value),
      );
    }
  });

  it("rejects missing, null, multiple, credential-bearing, path, and foreign request origins", () => {
    const configured = parseConfiguredPublicOrigin(
      "https://brain.example.com",
    );
    const cases: Array<[string | null, string]> = [
      [null, "request_origin_missing"],
      ["", "request_origin_missing"],
      ["null", "request_origin_invalid"],
      [
        "https://brain.example.com, https://evil.example",
        "request_origin_invalid",
      ],
      ["https://user@brain.example.com", "request_origin_invalid"],
      ["https://brain.example.com/path", "request_origin_invalid"],
      ["http://brain.example.com", "request_origin_mismatch"],
      ["https://evil.example.com", "request_origin_mismatch"],
      ["https://brain.example.com:444", "request_origin_mismatch"],
    ];

    for (const [origin, code] of cases) {
      const headers = new Headers();
      if (origin !== null) headers.set("Origin", origin);
      assert.deepEqual(
        evaluateConfiguredRequestOrigin(headers, configured),
        { ok: false, code },
        String(origin),
      );
    }
  });

  it("ignores Host and forwarding headers for both acceptance and rejection", () => {
    const configured = parseConfiguredPublicOrigin(
      "https://brain.example.com",
    );
    const accepted = new Headers({
      Origin: "https://brain.example.com",
      Host: "evil.example",
      "X-Forwarded-Host": "evil.example",
      "X-Forwarded-Proto": "http",
    });
    const rejected = new Headers({
      Origin: "https://evil.example",
      Host: "brain.example.com",
      "X-Forwarded-Host": "brain.example.com",
      "X-Forwarded-Proto": "https",
    });

    assert.deepEqual(
      evaluateConfiguredRequestOrigin(accepted, configured),
      { ok: true, code: "origin_allowed" },
    );
    assert.deepEqual(
      evaluateConfiguredRequestOrigin(rejected, configured),
      { ok: false, code: "request_origin_mismatch" },
    );
  });

  it("returns content-free configuration failures without reflecting origin values", () => {
    const sentinel = "private-origin-sentinel.example";
    const configured = parseConfiguredPublicOrigin(`https://${sentinel}/path`);
    const decision = evaluateConfiguredRequestOrigin(
      new Headers({ Origin: `https://${sentinel}` }),
      configured,
    );

    assert.equal(JSON.stringify(configured).includes(sentinel), false);
    assert.equal(JSON.stringify(decision).includes(sentinel), false);
  });

  it("enforces private, no-store, nosniff headers and preserves unrelated Vary fields", () => {
    const headers = privateNoStoreHeaders({
      "Cache-Control": "public, max-age=86400",
      Pragma: "cache",
      Vary: "Accept-Encoding, origin",
      "X-Content-Type-Options": "sniff",
      "X-Test": "kept",
    });

    assert.equal(
      headers.get("Cache-Control"),
      "private, no-store, max-age=0",
    );
    assert.equal(headers.get("Pragma"), "no-cache");
    assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(headers.get("Vary"), "Accept-Encoding, origin, Cookie");
    assert.equal(headers.get("X-Test"), "kept");
    assert.equal(privateNoStoreHeaders({ Vary: "*" }).get("Vary"), "*");
  });
});
