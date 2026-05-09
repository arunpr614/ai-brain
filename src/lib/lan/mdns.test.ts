/**
 * Unit tests for src/lib/lan/mdns.ts (v0.5.0 T-6 / F-035).
 *
 * Uses an injected fake publisher so tests do NOT open multicast UDP
 * sockets — real bonjour-service keeps the event loop alive indefinitely,
 * which would hang `npm test`. The "real mDNS actually advertises" path
 * is covered at T-7 manual smoke (`dns-sd -G v4 brain.local`) and T-22
 * Pixel smoke.
 */
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  __resetMdnsForTests,
  publishMdns,
  registerMdnsShutdownHandlers,
} from "./mdns";

function makeFakePublisher() {
  const calls = {
    publish: [] as Array<{ name: string; type: string; port: number }>,
    unpublishAll: 0,
    destroy: 0,
  };
  const publisher = {
    publish(opts: { name: string; type: string; port: number }) {
      calls.publish.push(opts);
      return { opts };
    },
    unpublishAll(cb?: () => void) {
      calls.unpublishAll++;
      cb?.();
    },
    destroy() {
      calls.destroy++;
    },
  };
  return { publisher, calls, factory: async () => publisher };
}

describe("mdns — publish lifecycle with fake factory", () => {
  afterEach(() => __resetMdnsForTests());

  it("publishMdns registers the Brain._http._tcp service on port 3000 by default", async () => {
    const fake = makeFakePublisher();
    let publishedCount = 0;
    await publishMdns({
      factory: fake.factory,
      onPublished: () => publishedCount++,
    });
    assert.equal(fake.calls.publish.length, 1);
    assert.deepEqual(fake.calls.publish[0], { name: "Brain", type: "http", port: 3000 });
    assert.equal(publishedCount, 1);
  });

  it("publishMdns honours a custom port", async () => {
    const fake = makeFakePublisher();
    await publishMdns({ factory: fake.factory, port: 13000 });
    assert.equal(fake.calls.publish[0].port, 13000);
  });

  it("publishMdns is idempotent — second call returns the same disposer", async () => {
    const fake = makeFakePublisher();
    let publishedCount = 0;
    const c1 = await publishMdns({
      factory: fake.factory,
      onPublished: () => publishedCount++,
    });
    const c2 = await publishMdns({
      factory: fake.factory,
      onPublished: () => publishedCount++,
    });
    assert.equal(c1, c2, "both calls return the same disposer");
    assert.equal(fake.calls.publish.length, 1, "publisher.publish called exactly once");
    assert.equal(publishedCount, 1, "onPublished fires only on first success");
  });

  it("disposer calls unpublishAll + destroy", async () => {
    const fake = makeFakePublisher();
    const cleanup = await publishMdns({ factory: fake.factory });
    cleanup();
    assert.equal(fake.calls.unpublishAll, 1);
    assert.equal(fake.calls.destroy, 1);
  });

  it("disposer is safe to call twice", async () => {
    const fake = makeFakePublisher();
    const cleanup = await publishMdns({ factory: fake.factory });
    cleanup();
    cleanup();
    // Second call hits the `if (!activeInstance) return` short-circuit.
    assert.equal(fake.calls.unpublishAll, 1);
    assert.equal(fake.calls.destroy, 1);
  });

  it("factory throwing surfaces via onError and returns a no-op disposer", async () => {
    let onErrorCalls = 0;
    const cleanup = await publishMdns({
      factory: async () => {
        throw new Error("simulated multicast permission denied");
      },
      onError: (err) => {
        onErrorCalls++;
        assert.match(err.message, /simulated/);
      },
    });
    assert.equal(onErrorCalls, 1);
    assert.doesNotThrow(() => cleanup());
  });
});

describe("mdns — shutdown hooks", () => {
  afterEach(() => __resetMdnsForTests());

  it("registerMdnsShutdownHandlers invokes cleanup on SIGTERM", () => {
    let cleaned = 0;
    let teardownFired = 0;
    registerMdnsShutdownHandlers(
      () => cleaned++,
      () => teardownFired++,
    );
    process.emit("SIGTERM");
    assert.equal(cleaned, 1);
    assert.equal(teardownFired, 1);
  });

  it("handlers are once-only — second SIGTERM does not re-trigger the same registration", () => {
    let cleaned = 0;
    registerMdnsShutdownHandlers(() => cleaned++);
    process.emit("SIGTERM");
    process.emit("SIGTERM");
    assert.equal(cleaned, 1, "process.once semantics prevent double-fire");
  });

  it("onTeardown still runs even if cleanup throws", () => {
    let teardownFired = 0;
    registerMdnsShutdownHandlers(
      () => {
        throw new Error("boom");
      },
      () => teardownFired++,
    );
    assert.throws(() => process.emit("SIGINT"));
    assert.equal(teardownFired, 1);
  });
});
