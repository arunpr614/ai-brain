import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSetupUri } from "./setup-uri";
import { buildSetupUri } from "./info";

const GOOD_URL = "https://brain.arunp.in";
const GOOD_TOKEN = "a".repeat(64);

describe("parseSetupUri (tunnel schema)", () => {
  it("round-trips buildSetupUri output", () => {
    const uri = buildSetupUri(GOOD_TOKEN);
    const v = parseSetupUri(uri);
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.url, GOOD_URL);
      assert.equal(v.token, GOOD_TOKEN);
    }
  });

  it("rejects empty input", () => {
    const v = parseSetupUri("");
    assert.equal(v.ok, false);
  });

  it("rejects non-URL garbage", () => {
    const v = parseSetupUri("totally not a url");
    assert.equal(v.ok, false);
  });

  it("rejects http:// scheme (wrong outer scheme)", () => {
    const v = parseSetupUri(`http://setup?url=${encodeURIComponent(GOOD_URL)}&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.ok(v.reason.includes("brain"));
  });

  it("rejects brain:// with wrong host", () => {
    const v = parseSetupUri(`brain://other?url=${encodeURIComponent(GOOD_URL)}&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
  });

  it("rejects legacy ip= parameter (pre-pivot QR)", () => {
    const v = parseSetupUri(`brain://setup?ip=192.168.1.42&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "ip-field-deprecated");
  });

  it("rejects http:// inner url (url-not-https)", () => {
    const v = parseSetupUri(`brain://setup?url=${encodeURIComponent("http://brain.arunp.in")}&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "url-not-https");
  });

  it("rejects malformed url parameter", () => {
    const v = parseSetupUri(`brain://setup?url=not-a-url&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
  });

  it("rejects short token", () => {
    const v = parseSetupUri(`brain://setup?url=${encodeURIComponent(GOOD_URL)}&token=abc`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.ok(v.reason.toLowerCase().includes("token"));
  });

  it("rejects uppercase hex in token", () => {
    const v = parseSetupUri(`brain://setup?url=${encodeURIComponent(GOOD_URL)}&token=${"A".repeat(64)}`);
    assert.equal(v.ok, false);
  });

  it("rejects non-hex chars in token", () => {
    const v = parseSetupUri(`brain://setup?url=${encodeURIComponent(GOOD_URL)}&token=${"z".repeat(64)}`);
    assert.equal(v.ok, false);
  });

  it("rejects missing params", () => {
    assert.equal(parseSetupUri("brain://setup").ok, false);
    assert.equal(parseSetupUri(`brain://setup?url=${encodeURIComponent(GOOD_URL)}`).ok, false);
    assert.equal(parseSetupUri(`brain://setup?token=${GOOD_TOKEN}`).ok, false);
  });

  it("accepts alternate HTTPS hosts (not just brain.arunp.in)", () => {
    for (const host of ["https://example.com", "https://brain.example.org", "https://tunnel-alt.arunp.in"]) {
      const v = parseSetupUri(`brain://setup?url=${encodeURIComponent(host)}&token=${GOOD_TOKEN}`);
      assert.equal(v.ok, true, `failed for ${host}`);
    }
  });
});
