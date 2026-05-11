/**
 * Tests for resolveBaseUrl() — single-probe pattern (T-CF-6).
 *
 * Post-pivot the decision collapses to "probe the tunnel, report the
 * verdict". Cases: green, timeout, unauthorized, token passthrough,
 * custom timeout.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveBaseUrl } from "./reachability-decision";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
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

describe("resolveBaseUrl — single-probe tunnel check", () => {
  it("returns ok with the tunnel base when probe succeeds", async () => {
    const calls: string[] = [];
    const probe: ProbeFn = async ({ baseUrl }) => {
      calls.push(baseUrl);
      return okVerdict();
    };
    const v = await resolveBaseUrl({ token: "tok", probe });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.base, BRAIN_TUNNEL_URL);
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0], BRAIN_TUNNEL_URL);
  });

  it("returns not-ok on timeout, with tunnel URL in reason", async () => {
    const probe: ProbeFn = async () => failVerdict("timeout");
    const v = await resolveBaseUrl({ token: "tok", probe });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.ok(v.reason.includes(BRAIN_TUNNEL_URL));
    }
  });

  it("returns not-ok on unauthorized, surfaces re-scan message", async () => {
    const probe: ProbeFn = async () => failVerdict("unauthorized");
    const v = await resolveBaseUrl({ token: "tok", probe });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.ok(v.reason.toLowerCase().includes("re-scan") || v.reason.toLowerCase().includes("rotated"));
    }
  });

  it("returns not-ok on network error", async () => {
    const probe: ProbeFn = async () => failVerdict("network");
    const v = await resolveBaseUrl({ token: "tok", probe });
    assert.equal(v.ok, false);
  });

  it("passes bearerToken through to probe", async () => {
    const tokens: Array<string | null | undefined> = [];
    const probe: ProbeFn = async ({ bearerToken }) => {
      tokens.push(bearerToken);
      return okVerdict();
    };
    await resolveBaseUrl({ token: "my-token", probe });
    assert.deepEqual(tokens, ["my-token"]);
  });

  it("honors custom timeoutMs", async () => {
    const timeouts: Array<number | undefined> = [];
    const probe: ProbeFn = async ({ timeoutMs }) => {
      timeouts.push(timeoutMs);
      return okVerdict();
    };
    await resolveBaseUrl({ token: "t", probe, timeoutMs: 500 });
    assert.deepEqual(timeouts, [500]);
  });
});
