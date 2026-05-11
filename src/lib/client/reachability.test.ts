/**
 * Tests for reachability.ts probe (v0.5.0 T-14).
 *
 * Pure module, so tests use fetchFn injection + a fake clock — no real
 * network calls, no timing flakes.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { probeReachability, describeVerdict } from "./reachability";

function fakeNow(): () => number {
  let t = 0;
  return () => {
    const current = t;
    t += 50; // each call advances 50 ms
    return current;
  };
}

function mockFetchReturning(init: ResponseInit & { body?: string }): typeof fetch {
  return (async () =>
    new Response(init.body ?? "", init)) as unknown as typeof fetch;
}

function mockFetchThrowing(err: Error): typeof fetch {
  return (async () => {
    throw err;
  }) as unknown as typeof fetch;
}

describe("probeReachability", () => {
  it("returns ok=true on HTTP 200", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchReturning({ status: 200 }),
      now: fakeNow(),
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.status, 200);
      assert.equal(typeof v.latencyMs, "number");
    }
  });

  it("returns unauthorized on 401", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchReturning({ status: 401 }),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "unauthorized");
  });

  it("returns forbidden on 403", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchReturning({ status: 403 }),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "forbidden");
  });

  it("returns server-error on 500", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchReturning({ status: 503 }),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.reason, "server-error");
      assert.equal(v.status, 503);
    }
  });

  it("returns unexpected-status on other non-200", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchReturning({ status: 418 }),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.reason, "unexpected-status");
      assert.equal(v.status, 418);
    }
  });

  it("returns network on thrown TypeError (DNS / connection refused)", async () => {
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchThrowing(new TypeError("fetch failed")),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.reason, "network");
      assert.ok(v.message?.includes("fetch failed"));
    }
  });

  it("returns timeout on AbortError", async () => {
    const abortErr = new Error("The operation was aborted.");
    abortErr.name = "AbortError";
    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn: mockFetchThrowing(abortErr),
      now: fakeNow(),
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "timeout");
  });

  it("actually aborts via AbortController when timeout elapses", async () => {
    // Real timer, but with a 20ms fetch that never resolves, 10ms timeout.
    let aborted = false;
    const fetchFn = ((url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          aborted = true;
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      })) as unknown as typeof fetch;

    const v = await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn,
      timeoutMs: 10,
      now: fakeNow(),
    });
    assert.equal(aborted, true);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "timeout");
  });

  it("sends Authorization header when bearerToken provided", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchFn = ((url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    await probeReachability({
      baseUrl: "https://brain.arunp.in",
      bearerToken: "a".repeat(64),
      fetchFn,
      now: fakeNow(),
    });
    assert.equal(capturedHeaders?.authorization, `Bearer ${"a".repeat(64)}`);
  });

  it("omits Authorization header when bearerToken absent", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchFn = ((url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    await probeReachability({
      baseUrl: "https://brain.arunp.in",
      fetchFn,
      now: fakeNow(),
    });
    assert.equal(capturedHeaders?.authorization, undefined);
  });

  it("strips trailing slash from baseUrl before appending /api/health", async () => {
    let capturedUrl: string | undefined;
    const fetchFn = ((url: string) => {
      capturedUrl = url;
      return Promise.resolve(new Response("", { status: 200 }));
    }) as unknown as typeof fetch;

    await probeReachability({
      baseUrl: "https://brain.arunp.in///",
      fetchFn,
      now: fakeNow(),
    });
    assert.equal(capturedUrl, "https://brain.arunp.in/api/health");
  });
});

describe("describeVerdict", () => {
  it("human-readable for each failure mode", () => {
    assert.ok(describeVerdict({ ok: true, status: 200, latencyMs: 42 }).includes("Connected"));
    assert.ok(
      describeVerdict({ ok: false, reason: "timeout", latencyMs: 2000 }).includes("2 s"),
    );
    assert.ok(
      describeVerdict({ ok: false, reason: "unauthorized", status: 401, latencyMs: 20 }).includes("rotated"),
    );
    assert.ok(
      describeVerdict({ ok: false, reason: "network", message: "fetch failed", latencyMs: 5 }).includes(
        "fetch failed",
      ),
    );
  });
});
