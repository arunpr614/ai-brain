/**
 * Tests for resolveBaseUrl() — D-v0.5.0-3 decision tree.
 *
 * Uses a stub probe factory to drive the four cases: mDNS-green,
 * IP-green-after-mDNS-fail, both-red, and call-ordering (mDNS must
 * be tried first; IP is a fallback, not a parallel race).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBaseUrl } from "./reachability-decision";
import type { ReachabilityVerdict } from "./reachability";

type ProbeFn = (opts: { baseUrl: string; bearerToken?: string | null; timeoutMs?: number }) => Promise<ReachabilityVerdict>;

function okVerdict(latencyMs = 50): ReachabilityVerdict {
  return { ok: true, status: 200, latencyMs };
}

function failVerdict(reason: "timeout" | "network" | "unauthorized"): ReachabilityVerdict {
  return reason === "unauthorized"
    ? { ok: false, reason: "unauthorized", status: 401, latencyMs: 20 }
    : { ok: false, reason, latencyMs: 2000 };
}

/**
 * Stub that routes by baseUrl. Records call order so ordering tests can
 * assert mDNS-first semantics.
 */
function mkProbe(
  plan: { mdns?: ReachabilityVerdict; ip?: ReachabilityVerdict },
  calls: string[] = [],
): ProbeFn {
  return async ({ baseUrl }) => {
    calls.push(baseUrl);
    if (baseUrl.includes("brain.local")) {
      if (!plan.mdns) throw new Error(`unexpected mdns probe (baseUrl=${baseUrl})`);
      return plan.mdns;
    }
    if (!plan.ip) throw new Error(`unexpected ip probe (baseUrl=${baseUrl})`);
    return plan.ip;
  };
}

describe("resolveBaseUrl — D-v0.5.0-3 decision tree", () => {
  it("returns mdns on mDNS-green (never probes IP)", async () => {
    const calls: string[] = [];
    const probe = mkProbe({ mdns: okVerdict() }, calls);
    const v = await resolveBaseUrl({ ip: "192.168.1.42", token: "tok", probe });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.via, "mdns");
      assert.equal(v.base, "http://brain.local:3000");
    }
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes("brain.local"));
  });

  it("falls back to IP when mDNS fails, and marks via='ip'", async () => {
    const calls: string[] = [];
    const probe = mkProbe(
      { mdns: failVerdict("timeout"), ip: okVerdict(120) },
      calls,
    );
    const v = await resolveBaseUrl({ ip: "10.0.0.5", token: "tok", probe });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.via, "ip");
      assert.equal(v.base, "http://10.0.0.5:3000");
    }
    assert.equal(calls.length, 2);
    assert.ok(calls[0].includes("brain.local"));
    assert.ok(calls[1].includes("10.0.0.5"));
  });

  it("returns not-ok when both mDNS and IP fail", async () => {
    const probe = mkProbe({
      mdns: failVerdict("timeout"),
      ip: failVerdict("timeout"),
    });
    const v = await resolveBaseUrl({ ip: "192.168.1.42", token: "tok", probe });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.ok(v.reason.includes("brain.local"));
      assert.ok(v.reason.includes("192.168.1.42"));
      assert.ok(v.reason.toLowerCase().includes("2 s") || v.reason.toLowerCase().includes("respond"));
    }
  });

  it("surfaces the IP verdict (not mDNS) in the failure reason — IP is more diagnostic", async () => {
    const probe = mkProbe({
      mdns: failVerdict("timeout"),
      ip: failVerdict("unauthorized"),
    });
    const v = await resolveBaseUrl({ ip: "192.168.1.42", token: "tok", probe });
    assert.equal(v.ok, false);
    if (!v.ok) {
      // Unauthorized path of describeVerdict says "re-scan the QR"
      assert.ok(v.reason.toLowerCase().includes("re-scan") || v.reason.toLowerCase().includes("rotated"));
    }
  });

  it("passes bearerToken to both probe attempts", async () => {
    const tokens: Array<string | null | undefined> = [];
    const probe: ProbeFn = async ({ baseUrl, bearerToken }) => {
      tokens.push(bearerToken);
      return baseUrl.includes("brain.local")
        ? failVerdict("timeout")
        : okVerdict();
    };
    await resolveBaseUrl({ ip: "192.168.1.42", token: "my-token", probe });
    assert.deepEqual(tokens, ["my-token", "my-token"]);
  });

  it("honors custom timeoutMs on both probes", async () => {
    const timeouts: Array<number | undefined> = [];
    const probe: ProbeFn = async ({ timeoutMs, baseUrl }) => {
      timeouts.push(timeoutMs);
      return baseUrl.includes("brain.local")
        ? failVerdict("timeout")
        : okVerdict();
    };
    await resolveBaseUrl({ ip: "192.168.1.42", token: "t", probe, timeoutMs: 500 });
    assert.deepEqual(timeouts, [500, 500]);
  });
});
