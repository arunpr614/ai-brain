import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSetupUri } from "./setup-uri";
import { buildSetupUri } from "./info";

const GOOD_IP = "192.168.1.42";
const GOOD_TOKEN = "a".repeat(64); // 64 hex chars matches generateLanToken() output shape

describe("parseSetupUri", () => {
  it("round-trips buildSetupUri output", () => {
    const uri = buildSetupUri(GOOD_IP, GOOD_TOKEN);
    const v = parseSetupUri(uri);
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.ip, GOOD_IP);
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

  it("rejects http:// scheme", () => {
    const v = parseSetupUri(`http://setup?ip=${GOOD_IP}&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.ok(v.reason.includes("brain"));
  });

  it("rejects brain:// with wrong host", () => {
    const v = parseSetupUri(`brain://other?ip=${GOOD_IP}&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
  });

  it("rejects malformed IP (octet > 255)", () => {
    const v = parseSetupUri(`brain://setup?ip=192.168.1.999&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.ok(v.reason.toLowerCase().includes("ip"));
  });

  it("rejects non-dotted-quad IP", () => {
    const v = parseSetupUri(`brain://setup?ip=not-an-ip&token=${GOOD_TOKEN}`);
    assert.equal(v.ok, false);
  });

  it("rejects short token", () => {
    const v = parseSetupUri(`brain://setup?ip=${GOOD_IP}&token=abc`);
    assert.equal(v.ok, false);
    if (!v.ok) assert.ok(v.reason.toLowerCase().includes("token"));
  });

  it("rejects uppercase hex in token", () => {
    const v = parseSetupUri(`brain://setup?ip=${GOOD_IP}&token=${"A".repeat(64)}`);
    assert.equal(v.ok, false);
  });

  it("rejects non-hex chars in token", () => {
    const v = parseSetupUri(`brain://setup?ip=${GOOD_IP}&token=${"z".repeat(64)}`);
    assert.equal(v.ok, false);
  });

  it("rejects missing params", () => {
    assert.equal(parseSetupUri("brain://setup").ok, false);
    assert.equal(parseSetupUri(`brain://setup?ip=${GOOD_IP}`).ok, false);
    assert.equal(parseSetupUri(`brain://setup?token=${GOOD_TOKEN}`).ok, false);
  });

  it("accepts realistic LAN IPs", () => {
    for (const ip of ["10.0.0.1", "172.16.0.1", "192.168.0.1", "10.255.255.254"]) {
      const v = parseSetupUri(`brain://setup?ip=${ip}&token=${GOOD_TOKEN}`);
      assert.equal(v.ok, true, `failed for ${ip}`);
    }
  });
});
