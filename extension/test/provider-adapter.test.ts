import assert from "node:assert/strict";
import test from "node:test";
import {
  NOTEBOOKLM_PY_WIRE_REVISION,
  NotebookLmProviderAdapter,
  NotebookLmProviderError,
  providerAdapterTestHooks,
} from "../src/notebooklm/provider-adapter.ts";

const NOTEBOOK_ID = "f66923f0-1df4-4ffe-9822-3ed63c558b1c";
const SOURCE_ID = "467b7f67-1b66-45fb-8cc7-6c04723f152d";

test("copied-text request matches current notebooklm-py wire format", () => {
  assert.equal(NOTEBOOKLM_PY_WIRE_REVISION, "45fd4258e608fbb9685496f26cfcea48810c44ee");
  const template = providerAdapterTestHooks.templateBlock();
  assert.deepEqual(template, [
    2,
    null,
    null,
    [1, null, null, null, null, null, null, null, null, null, [1]],
  ]);
  assert.equal((template[3] as unknown[]).length, 11);
  const params = [
    [[null, ["Title", "Content"], null, 2, null, null, null, null, null, null, 1]],
    NOTEBOOK_ID,
    template,
  ];
  assert.deepEqual(providerAdapterTestHooks.encodeRpcRequest("izAoDd", params), [
    [["izAoDd", JSON.stringify(params), null, "generic"]],
  ]);
});

test("URL requests use NotebookLM web and YouTube source slots", async () => {
  async function capturedParams(url: string): Promise<unknown[]> {
    let body = "";
    const metadata = [
      null,
      null,
      null,
      null,
      providerAdapterTestHooks.isYouTubeUrl(url) ? 9 : 5,
      providerAdapterTestHooks.isYouTubeUrl(url) ? [url] : null,
      null,
      [url],
    ];
    const result = [[[[SOURCE_ID], "Imported source", metadata, [null, 2]]]];
    const frame = [["wrb.fr", "izAoDd", JSON.stringify(result), null, null, null, "generic"]];
    const adapter = new NotebookLmProviderAdapter(async (_input, init) => {
      body = String(init?.body);
      return new Response(`)]}'\n${JSON.stringify(frame)}`, { status: 200 });
    });
    assert.deepEqual(
      await adapter.addUrl(
        { csrfToken: "csrf", sessionId: "sid", authUser: null },
        { notebookId: NOTEBOOK_ID, url },
      ),
      { id: SOURCE_ID, title: "Imported source", url, status: "ready" },
    );
    const encoded = /^f\.req=([^&]+)/.exec(body)?.[1];
    assert.ok(encoded);
    const envelope = JSON.parse(decodeURIComponent(encoded)) as unknown[][][];
    return JSON.parse(String(envelope[0]?.[0]?.[1])) as unknown[];
  }

  const webUrl = "https://example.com/article?edition=1";
  assert.deepEqual((await capturedParams(webUrl))[0], [
    [null, null, [webUrl], null, null, null, null, null, null, null, 1],
  ]);

  const youtubeUrl = "https://www.youtube.com/watch?v=t0GiTyz4syY";
  assert.deepEqual((await capturedParams(youtubeUrl))[0], [
    [null, null, null, null, null, null, null, [youtubeUrl], null, null, 1],
  ]);
  assert.equal(providerAdapterTestHooks.isYouTubeUrl("https://youtube.com.evil.test/watch?v=x"), false);
});

test("addUrl performs one provider fetch and never retries a thrown dispatch", async () => {
  let calls = 0;
  const adapter = new NotebookLmProviderAdapter(async () => {
    calls += 1;
    throw new TypeError("connection lost");
  }, 1_000);
  await assert.rejects(
    adapter.addUrl(
      { csrfToken: "csrf", sessionId: "sid", authUser: null },
      { notebookId: NOTEBOOK_ID, url: "https://www.youtube.com/watch?v=t0GiTyz4syY" },
    ),
    (error) => error instanceof NotebookLmProviderError && error.kind === "network",
  );
  assert.equal(calls, 1);
});

test("provider adapter invokes receiver-sensitive native fetch without binding itself", async () => {
  const result = [[[[SOURCE_ID], "Title", [], [null, 2]]]];
  const frame = [["wrb.fr", "izAoDd", JSON.stringify(result), null, null, null, "generic"]];
  let calls = 0;
  const receiverSensitiveFetch = async function (
    this: unknown,
    _input: RequestInfo | URL,
  ): Promise<Response> {
    calls += 1;
    void _input;
    assert.equal(this, undefined);
    return new Response(`)]}'\n${JSON.stringify(frame)}`, { status: 200 });
  } as typeof fetch;
  const adapter = new NotebookLmProviderAdapter(receiverSensitiveFetch);

  assert.deepEqual(
    await adapter.addCopiedText(
      { csrfToken: "csrf", sessionId: "sid", authUser: null },
      { notebookId: NOTEBOOK_ID, title: "Title", text: "Content" },
    ),
    { id: SOURCE_ID, title: "Title", url: null, status: "ready" },
  );
  assert.equal(calls, 1);
});

test("provider timeout remains active while the response body stalls", async () => {
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
    return Promise.resolve(new Response(body, { status: 200 }));
  }) as typeof fetch;
  const adapter = new NotebookLmProviderAdapter(headersThenStalledBody, 5);
  await assert.rejects(
    adapter.addCopiedText(
      { csrfToken: "csrf", sessionId: "sid", authUser: null },
      { notebookId: NOTEBOOK_ID, title: "Title", text: "Content" },
    ),
    (error) => error instanceof NotebookLmProviderError && error.kind === "timeout",
  );
  assert.equal(calls, 1);
});

test("decoder accepts streamed framing and fails closed on RPC drift", () => {
  const result = [[[[SOURCE_ID], "Title", [], [null, 2]]]];
  const frame = [["wrb.fr", "izAoDd", JSON.stringify(result), null, null, null, "generic"]];
  const raw = `)]}'\n\n999999\n${JSON.stringify(frame)}`;
  assert.deepEqual(providerAdapterTestHooks.decodeRpcResponse(raw, "izAoDd"), result);

  const drift = [["wrb.fr", "changedId", JSON.stringify(result), null, null, null, "generic"]];
  assert.throws(
    () => providerAdapterTestHooks.decodeRpcResponse(`)]}'\n1\n${JSON.stringify(drift)}`, "izAoDd"),
    (error) => error instanceof NotebookLmProviderError && error.kind === "protocol",
  );

  const mixed = [
    ["wrb.fr", "changedId", JSON.stringify(result), null, null, null, "generic"],
    ["wrb.fr", "izAoDd", JSON.stringify(result), null, null, null, "generic"],
  ];
  assert.throws(
    () => providerAdapterTestHooks.decodeRpcResponse(`)]}'\n${JSON.stringify(mixed)}`, "izAoDd"),
    (error) => error instanceof NotebookLmProviderError && error.kind === "protocol",
  );
});

test("notebook and sharing preflight require exact target ownership and sole-owner privacy", () => {
  const sourceRow = [[SOURCE_ID], "Title", [], [null, 1]];
  const notebook = [["Private notebook", [sourceRow], NOTEBOOK_ID, "📓", null, [null, false]]];
  assert.deepEqual(providerAdapterTestHooks.parseNotebook(notebook, NOTEBOOK_ID), {
    title: "Private notebook",
    sourceCount: 1,
    sources: [{ id: SOURCE_ID, title: "Title", url: null, status: "processing" }],
  });
  assert.equal(
    providerAdapterTestHooks.parsePrivateSharing([[['owner@example.invalid', 1, [], []]], null, 1000]),
    "owner@example.invalid",
  );
  assert.throws(() => providerAdapterTestHooks.parsePrivateSharing([[['owner@example.invalid', 1]], [true], 1000]));
  assert.throws(() =>
    providerAdapterTestHooks.parsePrivateSharing([
      [
        ["owner@example.invalid", 1],
        ["viewer@example.invalid", 3],
      ],
      null,
      1000,
    ]),
  );
  assert.throws(() =>
    providerAdapterTestHooks.parseNotebook(
      [["Wrong", null, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", null, null, [null, false]]],
      NOTEBOOK_ID,
    ),
  );
});

test("missing or unknown provider source status is protocol drift", () => {
  assert.throws(() => providerAdapterTestHooks.parseSourceEntry([[SOURCE_ID], "Title", []]));
  assert.throws(() => providerAdapterTestHooks.parseSourceEntry([[SOURCE_ID], "Title", [], [null, 99]]));
});

test("addCopiedText performs one provider fetch and never retries a thrown dispatch", async () => {
  let calls = 0;
  const adapter = new NotebookLmProviderAdapter(async () => {
    calls += 1;
    throw new TypeError("connection lost");
  }, 1_000);
  await assert.rejects(
    adapter.addCopiedText(
      { csrfToken: "csrf", sessionId: "sid", authUser: null },
      { notebookId: NOTEBOOK_ID, title: "Title", text: "Content" },
    ),
    (error) => error instanceof NotebookLmProviderError && error.kind === "network",
  );
  assert.equal(calls, 1);
});

test("copied-text payload bounds fail before any provider fetch", async () => {
  let calls = 0;
  const adapter = new NotebookLmProviderAdapter(async () => {
    calls += 1;
    return new Response();
  });
  await assert.rejects(
    adapter.addCopiedText(
      { csrfToken: "csrf", sessionId: "sid", authUser: null },
      { notebookId: NOTEBOOK_ID, title: "Title", text: "🚀".repeat(50_001) },
    ),
    (error) => error instanceof NotebookLmProviderError && error.kind === "protocol",
  );
  assert.equal(calls, 0);
});

test("addCopiedText emits the exact percent-encoded form and parses the current success row", async () => {
  let requestUrl = "";
  let requestBody = "";
  const result = [[[[SOURCE_ID], "Title", [], [null, 2]]]];
  const frame = [["wrb.fr", "izAoDd", JSON.stringify(result), null, null, null, "generic"]];
  const adapter = new NotebookLmProviderAdapter(async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    assert.equal(init?.redirect, "error");
    return new Response(`)]}'\n${JSON.stringify(frame)}`, { status: 200 });
  });
  assert.deepEqual(
    await adapter.addCopiedText(
      { csrfToken: "csrf token", sessionId: "sid", authUser: 2 },
      { notebookId: NOTEBOOK_ID, title: "A title", text: "Body's text" },
    ),
    { id: SOURCE_ID, title: "Title", url: null, status: "ready" },
  );
  const url = new URL(requestUrl);
  assert.equal(url.searchParams.get("rpcids"), "izAoDd");
  assert.equal(url.searchParams.get("authuser"), "2");
  assert.equal(url.searchParams.get("source-path"), `/notebook/${NOTEBOOK_ID}`);
  assert.ok(requestBody.includes("at=csrf%20token&"));
  assert.ok(requestBody.includes("%27"));
  assert.ok(!requestBody.includes("+"));
  const encodedRequest = /^f\.req=([^&]+)/.exec(requestBody)?.[1];
  assert.ok(encodedRequest);
  const envelope = JSON.parse(decodeURIComponent(encodedRequest)) as unknown[][][];
  const params = JSON.parse(String(envelope[0]?.[0]?.[1])) as unknown[];
  assert.deepEqual(params[2], providerAdapterTestHooks.templateBlock());
});
