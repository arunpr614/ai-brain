/**
 * Unit tests for src/lib/outbox/transport.ts (OFFLINE-4).
 *
 * Stubs globalThis.fetch with scripted responses to drive each branch
 * through urlTransport / noteTransport / buildTransport.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { buildTransport, noteTransport, urlTransport } from "./transport";
import type { OutboxEntry, OutboxNoteEntry, OutboxUrlEntry } from "./types";

const ORIGINAL_FETCH = globalThis.fetch;

interface FetchCall {
  url: string;
  init: RequestInit;
}

function stubFetch(responder: (call: FetchCall) => Response | Promise<Response> | Error) {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: FetchCall = { url: String(input), init: init ?? {} };
    calls.push(call);
    const result = await responder(call);
    if (result instanceof Error) throw result;
    return result;
  }) as typeof fetch;
  return calls;
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function htmlResponse(status: number, body: string = "<html>captive portal</html>") {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html" },
  });
}

function emptyResponse(status: number) {
  return new Response(null, { status });
}

const urlEntry: OutboxUrlEntry = {
  id: "u1",
  kind: "url",
  payload: { url: "https://example.com/post", title: "P" },
  status: "queued",
  attempts: 0,
  created_at: 1,
  content_hash: "h1",
};

const noteEntry: OutboxNoteEntry = {
  id: "n1",
  kind: "note",
  payload: { title: "T", body: "B" },
  status: "queued",
  attempts: 0,
  created_at: 1,
  content_hash: "h2",
};

describe("urlTransport", () => {
  let calls: FetchCall[];
  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("POSTs to /api/capture/url with bearer token + JSON body", async () => {
    calls = stubFetch(() => jsonResponse(200, { id: "srv-1" }));
    await urlTransport(urlEntry, "https://brain.test", "TOKEN");
    assert.equal(calls[0].url, "https://brain.test/api/capture/url");
    assert.equal(calls[0].init.method, "POST");
    const headers = calls[0].init.headers as Record<string, string>;
    assert.equal(headers.authorization, "Bearer TOKEN");
    assert.equal(headers["content-type"], "application/json");
    const sentBody = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(sentBody, { url: "https://example.com/post", title: "P" });
  });

  it("returns http-json on a JSON 2xx response", async () => {
    calls = stubFetch(() => jsonResponse(200, { id: "srv-1" }));
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    assert.deepEqual(result, {
      kind: "http-json",
      status: 200,
      retryAfter: null,
      body: { id: "srv-1" },
    });
  });

  it("captures Retry-After header into ProbeOutcome", async () => {
    calls = stubFetch(() => jsonResponse(429, { error: "rate" }, { "retry-after": "60" }));
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    if (result.kind !== "http-json") throw new Error("expected http-json");
    assert.equal(result.retryAfter, "60");
  });

  it("returns http-non-json when body is HTML (captive portal)", async () => {
    calls = stubFetch(() => htmlResponse(200));
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    assert.equal(result.kind, "http-non-json");
    if (result.kind === "http-non-json") {
      assert.equal(result.status, 200);
      assert.equal(result.contentType, "text/html");
    }
  });

  it("returns http-non-json when JSON parse fails", async () => {
    calls = stubFetch(
      () =>
        new Response("{not valid json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    assert.equal(result.kind, "http-non-json");
  });

  it("returns http-json with body=null on empty 204", async () => {
    calls = stubFetch(() => emptyResponse(204));
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    if (result.kind !== "http-json") throw new Error("expected http-json");
    assert.equal(result.body, null);
    assert.equal(result.status, 204);
  });

  it("returns network-error when fetch throws", async () => {
    calls = stubFetch(() => new Error("ECONNREFUSED"));
    const result = await urlTransport(urlEntry, "https://brain.test", "T");
    if (result.kind !== "network-error") throw new Error("expected network-error");
    assert.equal(result.message, "ECONNREFUSED");
  });
});

describe("noteTransport", () => {
  let calls: FetchCall[];
  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("POSTs to /api/capture/note with the note payload", async () => {
    calls = stubFetch(() => jsonResponse(201, { id: "srv-2" }));
    const result = await noteTransport(noteEntry, "https://brain.test", "T");
    assert.equal(calls[0].url, "https://brain.test/api/capture/note");
    const sent = JSON.parse(calls[0].init.body as string);
    assert.deepEqual(sent, { title: "T", body: "B" });
    if (result.kind !== "http-json") throw new Error("expected http-json");
    assert.equal(result.status, 201);
  });
});

describe("buildTransport", () => {
  let calls: FetchCall[];
  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("dispatches url entries to /api/capture/url", async () => {
    calls = stubFetch(() => jsonResponse(200, { id: "x" }));
    const transport = buildTransport("https://brain.test", "T");
    await transport(urlEntry);
    assert.match(calls[0].url, /\/api\/capture\/url$/);
  });

  it("dispatches note entries to /api/capture/note", async () => {
    calls = stubFetch(() => jsonResponse(200, { id: "x" }));
    const transport = buildTransport("https://brain.test", "T");
    await transport(noteEntry);
    assert.match(calls[0].url, /\/api\/capture\/note$/);
  });

  it("returns a network-error for pdf entries (not yet outbox-wired)", async () => {
    const transport = buildTransport("https://brain.test", "T");
    const pdf: OutboxEntry = {
      id: "p1",
      kind: "pdf",
      file_path: "/tmp/x.pdf",
      file_name: "x.pdf",
      file_size: 1,
      expected_sha256: "abc",
      status: "queued",
      attempts: 0,
      created_at: 1,
      content_hash: "h3",
    };
    const result = await transport(pdf);
    if (result.kind !== "network-error") throw new Error("expected network-error");
    assert.match(result.message, /pdf-outbox-not-implemented/);
  });
});
