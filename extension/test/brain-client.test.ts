import assert from "node:assert/strict";
import test from "node:test";
import {
  BrainConnectorClient,
  BrainConnectorError,
  brainConnectorSetupMessage,
  brainContractTestHooks,
} from "../src/notebooklm/brain-client.ts";

const FINGERPRINT = "a".repeat(64);

test("pairing invokes receiver-sensitive native fetch without binding the client instance", async () => {
  let calls = 0;
  const receiverSensitiveFetch = async function (
    this: unknown,
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    calls += 1;
    assert.equal(this, undefined);
    assert.equal(init?.credentials, "omit");
    assert.equal(init?.redirect, "error");
    return Response.json({
      ok: true,
      connectorId: "d".repeat(24),
      connectorToken: "b".repeat(64),
      protocolVersion: 2,
    }, { status: 201 });
  } as typeof fetch;
  const client = new BrainConnectorClient(receiverSensitiveFetch);

  const credential = await client.exchangePairingCode("ABCD-EFGH");
  assert.equal(credential.connectorId, "d".repeat(24));
  assert.equal(credential.token, "b".repeat(64));
  assert.equal(credential.protocolVersion, 2);
  assert.equal(typeof credential.pairedAt, "number");
  assert.equal(calls, 1);
});

test("pairing classifies every allowlisted exchange failure without echoing server text", async () => {
  const cases = [
    [400, "invalid_code", "invalid_code", "did not recognize"],
    [410, "expired_code", "expired_code", "code expired"],
    [410, "used_code", "used_code", "already used"],
    [403, "invalid_origin", "invalid_origin", "verify this extension"],
  ] as const;
  for (const [status, serverError, expectedKind, expectedMessage] of cases) {
    const secretSentinel = "SECRET_SHAPED_SENTINEL_DO_NOT_RENDER";
    const client = new BrainConnectorClient(async () =>
      Response.json({ error: serverError, detail: secretSentinel }, { status }),
    );
    await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
      assert.ok(error instanceof BrainConnectorError);
      assert.equal(error.kind, expectedKind);
      const message = brainConnectorSetupMessage(error);
      assert.match(message, new RegExp(expectedMessage, "i"));
      assert.equal(message.includes(secretSentinel), false);
      return true;
    });
  }
});

test("pairing format validation happens before fetch and reports exact recovery", async () => {
  let calls = 0;
  const client = new BrainConnectorClient(async () => {
    calls += 1;
    return new Response();
  });
  await assert.rejects(client.exchangePairingCode("BAD"), (error: unknown) => {
    assert.ok(error instanceof BrainConnectorError);
    assert.equal(error.kind, "invalid_format");
    assert.match(brainConnectorSetupMessage(error), /8-character code/);
    return true;
  });
  assert.equal(calls, 0);
});

test("pairing times out once without retrying", async () => {
  let calls = 0;
  const neverCompletesUntilAbort = ((_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), {
        once: true,
      });
    });
  }) as typeof fetch;
  const client = new BrainConnectorClient(neverCompletesUntilAbort, "https://brain.arunp.in", 5);
  await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
    assert.ok(error instanceof BrainConnectorError);
    assert.equal(error.kind, "timeout");
    assert.match(brainConnectorSetupMessage(error), /15 seconds/);
    return true;
  });
  assert.equal(calls, 1);
});

test("pairing timeout remains active while a response body stalls", async () => {
  let calls = 0;
  const headersThenStalledBody = ((_input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    const body = new ReadableStream({
      start(controller) {
        init?.signal?.addEventListener("abort", () => {
          controller.error(new DOMException("aborted", "AbortError"));
        }, { once: true });
      },
    });
    return Promise.resolve(new Response(body, {
      status: 201,
      headers: { "content-type": "application/json" },
    }));
  }) as typeof fetch;
  const client = new BrainConnectorClient(headersThenStalledBody, "https://brain.arunp.in", 5);
  await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
    assert.ok(error instanceof BrainConnectorError);
    assert.equal(error.kind, "timeout");
    return true;
  });
  assert.equal(calls, 1);
});

test("pairing treats a response-body transport reset as uncertain network failure", async () => {
  const interruptedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"ok":true'));
      controller.error(new TypeError("SECRET_STREAM_RESET"));
    },
  });
  const client = new BrainConnectorClient(async () => new Response(interruptedBody, {
    status: 201,
    headers: { "content-type": "application/json" },
  }));
  await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
    assert.ok(error instanceof BrainConnectorError);
    assert.equal(error.kind, "network");
    const message = brainConnectorSetupMessage(error);
    assert.match(message, /did not receive confirmation/);
    assert.equal(message.includes("SECRET_STREAM_RESET"), false);
    return true;
  });
});

test("pairing maps network, rate-limit, server, and unexpected responses without retrying", async () => {
  const cases: Array<{
    response: Response | Error;
    kind: "network" | "rate_limited" | "server" | "protocol";
    message: RegExp;
  }> = [
    { response: new TypeError("SECRET_NETWORK_DETAIL"), kind: "network", message: /site access for brain\.arunp\.in/ },
    { response: Response.json({ error: "rate_limited" }, { status: 429 }), kind: "rate_limited", message: /Wait 60 seconds/ },
    { response: Response.json({ error: "SECRET_SERVER_DETAIL" }, { status: 503 }), kind: "server", message: /temporarily unavailable/ },
    { response: Response.json({ error: "unknown_exchange_error" }, { status: 400 }), kind: "protocol", message: /out of date or incompatible/ },
  ];

  for (const testCase of cases) {
    let calls = 0;
    const client = new BrainConnectorClient(async () => {
      calls += 1;
      if (testCase.response instanceof Error) throw testCase.response;
      return testCase.response;
    });
    await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
      assert.ok(error instanceof BrainConnectorError);
      assert.equal(error.kind, testCase.kind);
      const message = brainConnectorSetupMessage(error);
      assert.match(message, testCase.message);
      assert.equal(message.includes("SECRET_"), false);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("pairing rejects a malformed success credential and never exposes returned values", async () => {
  const secretSentinel = "SECRET_MALFORMED_CREDENTIAL";
  const client = new BrainConnectorClient(async () =>
    Response.json({
      ok: true,
      connectorId: "bad",
      connectorToken: secretSentinel,
      protocolVersion: 2,
    }, { status: 201 }),
  );
  await assert.rejects(client.exchangePairingCode("ABCD-EFGH"), (error: unknown) => {
    assert.ok(error instanceof BrainConnectorError);
    assert.equal(error.kind, "protocol");
    assert.equal(brainConnectorSetupMessage(error).includes(secretSentinel), false);
    return true;
  });
});

test("claim parser pins the server protocol DTO", () => {
  const claim = brainContractTestHooks.parseClaim({
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "create",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      kind: "copied_text",
      marker: "brain_req_1234567890",
      title: "Title · brain_req_1234567890",
      text: "Content",
      url: null,
      urlHash: null,
      sourceAlias: null,
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  });
  assert.equal(claim.action, "create");
  assert.equal(
    brainContractTestHooks.parseClaim({
      ...claim,
      target: { ...claim.target, sourceLimit: 264 },
    }).target.sourceLimit,
    264,
  );
  assert.throws(() => brainContractTestHooks.parseClaim({ ...claim, action: "write_again" }));
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      source: { ...claim.source, title: "Title without the reconciliation marker" },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      action: "reconcile",
      source: { ...claim.source, sourceAlias: null },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      source: { ...claim.source, text: "🚀".repeat(50_001) },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      target: { ...claim.target, sourceLimit: 265 },
    }),
  );
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...claim,
      target: { ...claim.target, sourceLimit: 49 },
    }),
  );
});

test("URL claims require a retained hash and reconcile safely after URL snapshot purge", () => {
  const url = "https://www.youtube.com/watch?v=t0GiTyz4syY";
  const base = {
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "create",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      kind: "url",
      marker: "brain_req_1234567890",
      title: null,
      text: null,
      url,
      urlHash: "30dd20d77fc4605cbbb25255ffaa36b86d1213e0e22b1465aa42a7c2c2b4c362",
      sourceAlias: null,
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
  assert.equal(brainContractTestHooks.parseClaim(base).source.url, url);
  assert.throws(() =>
    brainContractTestHooks.parseClaim({
      ...base,
      source: { ...base.source, urlHash: null },
    }),
  );
  const purged = brainContractTestHooks.parseClaim({
    ...base,
    action: "reconcile",
    source: { ...base.source, url: null },
  });
  assert.equal(purged.source.url, null);
  assert.equal(purged.source.urlHash, base.source.urlHash);
});

test("first binding sends observed version 0 and accepts authoritative version 1", async () => {
  let requestBody: unknown;
  const client = new BrainConnectorClient(async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return Response.json(
      { bound: true, target: { bindingVersion: 1 } },
      { headers: { "x-notebooklm-connector-protocol": "2" } },
    );
  });
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 2 as const,
    pairedAt: 1,
  };
  assert.deepEqual(
    await client.bind(credential, {
      bindingVersion: 0,
      safeLabel: "Private notebook",
      localBindingFingerprint: FINGERPRINT,
      subjectFingerprint: "c".repeat(64),
      sharingPosture: "private",
      sourceCount: 2,
      sourceLimit: 50,
      reserveCount: 5,
    }),
    { bindingVersion: 1 },
  );
  assert.equal((requestBody as { bindingVersion: number }).bindingVersion, 0);
});

test("binding accepts the internal envelope for a 259 safe limit and rejects values outside the safe range", async () => {
  const client = new BrainConnectorClient(async () =>
    Response.json({ bound: true, target: { bindingVersion: 1 } }),
  );
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 2 as const,
    pairedAt: 1,
  };
  const input = {
    bindingVersion: 0,
    safeLabel: "Private notebook",
    localBindingFingerprint: FINGERPRINT,
    subjectFingerprint: "c".repeat(64),
    sharingPosture: "private" as const,
    sourceCount: 2,
    sourceLimit: 264,
    reserveCount: 5,
  };

  assert.deepEqual(await client.bind(credential, input), { bindingVersion: 1 });
  await assert.rejects(client.bind(credential, { ...input, sourceLimit: 49 }));
  await assert.rejects(client.bind(credential, { ...input, sourceLimit: 265 }));
});

test("lost-response bind retry accepts the server's newer authoritative version", async () => {
  const client = new BrainConnectorClient(async () =>
    Response.json({ bound: true, target: { bindingVersion: 2 } }),
  );
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 2 as const,
    pairedAt: 1,
  };
  assert.deepEqual(
    await client.bind(credential, {
      bindingVersion: 1,
      safeLabel: "Private notebook",
      localBindingFingerprint: FINGERPRINT,
      subjectFingerprint: "c".repeat(64),
      sharingPosture: "private",
      sourceCount: 2,
      sourceLimit: 50,
      reserveCount: 5,
    }),
    { bindingVersion: 2 },
  );
});

test("bind conflicts preserve safe, actionable setup outcomes", async () => {
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 2 as const,
    pairedAt: 1,
  };
  const input = {
    bindingVersion: 1,
    safeLabel: "Private notebook",
    localBindingFingerprint: FINGERPRINT,
    subjectFingerprint: "c".repeat(64),
    sharingPosture: "private" as const,
    sourceCount: 2,
    sourceLimit: 50,
    reserveCount: 5,
  };
  const cases = [
    ["target_has_active_work", "active_work", "Finish or explicitly stop every unresolved export"],
    ["invalid_binding", "stale_binding", "saved notebook binding is stale"],
    ["target_not_private", "target_not_private", "owner-only private notebook"],
    ["target_capacity_exhausted", "target_capacity", "too close to its source limit"],
    ["unexpected_conflict", "protocol", "out of date or incompatible"],
  ] as const;

  for (const [serverCode, expectedKind, expectedMessage] of cases) {
    const client = new BrainConnectorClient(async () =>
      Response.json({ error: serverCode }, { status: 409 }),
    );
    await assert.rejects(client.bind(credential, input), (error: unknown) => {
      assert.ok(error instanceof BrainConnectorError);
      assert.equal(error.kind, expectedKind);
      assert.match(brainConnectorSetupMessage(error), new RegExp(expectedMessage));
      return true;
    });
  }
});

test("dispatch requires an explicit durable authorization acknowledgement", async () => {
  const credential = {
    connectorId: "d".repeat(24),
    token: "b".repeat(64),
    protocolVersion: 2 as const,
    pairedAt: 1,
  };
  let capturedBody: unknown;
  const client = new BrainConnectorClient(async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body));
    return Response.json({ accepted: true, dispatchAuthorized: true });
  });
  await client.sendEvent(
    credential,
    { requestId: "1".repeat(24), leaseToken: "2".repeat(64), leaseEpoch: 1 },
    { type: "dispatch_started" },
  );
  assert.deepEqual(capturedBody, {
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    event: { type: "dispatch_started" },
  });

  const rejected = new BrainConnectorClient(async () =>
    Response.json({ accepted: true, dispatchAuthorized: false }),
  );
  await assert.rejects(
    rejected.sendEvent(
      credential,
      { requestId: "1".repeat(24), leaseToken: "2".repeat(64), leaseEpoch: 1 },
      { type: "dispatch_started" },
    ),
  );
});

test("claim endpoint unwraps the server claim envelope", async () => {
  const claim = {
    requestId: "1".repeat(24),
    leaseToken: "2".repeat(64),
    leaseEpoch: 1,
    action: "poll",
    target: {
      bindingVersion: 1,
      localBindingFingerprint: FINGERPRINT,
      sharingPolicy: "private_only",
      sourceLimit: 50,
      reserveCount: 5,
    },
    source: {
      kind: "copied_text",
      marker: "brain_req_1234567890",
      title: null,
      text: null,
      url: null,
      urlHash: null,
      sourceAlias: "e".repeat(64),
    },
    leaseExpiresAt: "2030-01-01T00:02:00.000Z",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };
  const client = new BrainConnectorClient(async () => Response.json({ claim }));
  assert.deepEqual(
    await client.claim({
      connectorId: "d".repeat(24),
      token: "b".repeat(64),
      protocolVersion: 2,
      pairedAt: 1,
    }),
    claim,
  );
});
