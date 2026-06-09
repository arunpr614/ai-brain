import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  completeSetupApkPairing,
  readExchangeToken,
} from "./setup-apk-pairing";

describe("setup APK pairing completion", () => {
  it("extracts only non-empty token strings", () => {
    assert.equal(readExchangeToken({ token: "abc" }), "abc");
    assert.equal(readExchangeToken({ token: "" }), null);
    assert.equal(readExchangeToken({ token: 123 }), null);
    assert.equal(readExchangeToken(null), null);
  });

  it("stores the token before probing reachability", async () => {
    const calls: string[] = [];
    const result = await completeSetupApkPairing({
      token: "token-1",
      writeToken: async () => {
        calls.push("write");
      },
      resolveBaseUrl: async () => {
        calls.push("probe");
        return { ok: true, base: "https://example.test" };
      },
    });

    assert.deepEqual(calls, ["write", "probe"]);
    assert.deepEqual(result, {
      kind: "paired",
      base: "https://example.test",
    });
  });

  it("keeps the stored token available when the probe fails", async () => {
    const result = await completeSetupApkPairing({
      token: "token-2",
      writeToken: async () => {},
      resolveBaseUrl: async () => ({
        ok: false,
        reason: "cloud temporarily unreachable",
      }),
    });

    assert.deepEqual(result, {
      kind: "paired-unreachable",
      message: "cloud temporarily unreachable",
      token: "token-2",
    });
  });
});
