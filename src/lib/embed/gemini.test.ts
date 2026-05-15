// Tests for GeminiEmbedProvider (v0.6.0 B-10).
//
// Stubs the Gemini wire at the HTTP layer via baseURL override so the real
// fetch + parse + dim-validation path is exercised.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { GeminiEmbedProvider } from "./gemini";
import { EmbedError } from "./client";
import { EMBED_OUTPUT_DIM } from "./types";

function stubServer(
  handler: (req: { method: string; url: string; body: string; headers: IncomingMessage["headers"] }, res: ServerResponse) => void,
): Promise<{ baseURL: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const srv: Server = createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        handler({ method: req.method ?? "GET", url: req.url ?? "/", body: raw, headers: req.headers }, res);
      });
    });
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as AddressInfo;
      resolve({
        baseURL: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => srv.close(() => r())),
      });
    });
  });
}

function fakeRow(): number[] {
  return new Array(EMBED_OUTPUT_DIM).fill(0).map((_, i) => i / EMBED_OUTPUT_DIM);
}

test("GeminiEmbedProvider.embed: round-trips inputs to 768-dim Float32Arrays", async () => {
  type CapturedBody = { requests?: Array<{ model: string; outputDimensionality: number }> };
  const captured: { value: CapturedBody | null } = { value: null };
  const stub = await stubServer((req, res) => {
    assert.equal(req.method, "POST");
    assert.match(req.url, /\/v1beta\/models\/text-embedding-004:batchEmbedContents\?key=k-test$/);
    captured.value = JSON.parse(req.body) as CapturedBody;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        embeddings: [{ values: fakeRow() }, { values: fakeRow() }],
      }),
    );
  });
  try {
    const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: stub.baseURL });
    const out = await p.embed(["hello", "world"]);
    assert.equal(out.length, 2);
    assert.ok(out[0] instanceof Float32Array);
    assert.equal(out[0].length, EMBED_OUTPUT_DIM);
    assert.equal(out[1].length, EMBED_OUTPUT_DIM);
    assert.ok(captured.value);
    assert.equal(captured.value!.requests?.length, 2);
    assert.equal(captured.value!.requests?.[0].model, "models/text-embedding-004");
    assert.equal(captured.value!.requests?.[0].outputDimensionality, EMBED_OUTPUT_DIM);
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider.embed: empty input array returns empty without HTTP call", async () => {
  let calls = 0;
  const stub = await stubServer((_req, res) => {
    calls++;
    res.end("{}");
  });
  try {
    const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: stub.baseURL });
    const out = await p.embed([]);
    assert.deepEqual(out, []);
    assert.equal(calls, 0);
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider.embed: HTTP errors wrap to EmbedError(EMBED_HTTP)", async () => {
  const stub = await stubServer((_req, res) => {
    res.statusCode = 429;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { code: 429, message: "rate limit", status: "RESOURCE_EXHAUSTED" } }));
  });
  try {
    const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.embed(["x"]),
      (err) => {
        assert.ok(err instanceof EmbedError);
        assert.equal((err as EmbedError).code, "EMBED_HTTP");
        assert.equal((err as EmbedError).status, 429);
        assert.match((err as Error).message, /rate limit/);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider.embed: count mismatch → EMBED_INVALID_RESPONSE", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ embeddings: [{ values: fakeRow() }] }));
  });
  try {
    const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.embed(["a", "b"]),
      (err) => {
        assert.ok(err instanceof EmbedError);
        assert.equal((err as EmbedError).code, "EMBED_INVALID_RESPONSE");
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider.embed: dim mismatch → EMBED_INVALID_RESPONSE (no silent truncation)", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        embeddings: [{ values: new Array(1024).fill(0) }],
      }),
    );
  });
  try {
    const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.embed(["x"]),
      (err) => {
        assert.ok(err instanceof EmbedError);
        assert.equal((err as EmbedError).code, "EMBED_INVALID_RESPONSE");
        assert.match((err as Error).message, /dim 1024.*expected 768/);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider.isAlive: 200 → true; 401 → false", async () => {
  const stub = await stubServer((req, res) => {
    if (req.url.includes("k-bad")) {
      res.statusCode = 401;
      res.end("{}");
    } else {
      res.setHeader("content-type", "application/json");
      res.end('{"name":"models/text-embedding-004"}');
    }
  });
  try {
    const good = new GeminiEmbedProvider({ apiKey: "k-good", baseURL: stub.baseURL });
    const bad = new GeminiEmbedProvider({ apiKey: "k-bad", baseURL: stub.baseURL });
    assert.equal(await good.isAlive(), true);
    assert.equal(await bad.isAlive(), false);
  } finally {
    await stub.close();
  }
});

test("GeminiEmbedProvider construction fails fast without an API key", () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    assert.throws(
      () => new GeminiEmbedProvider({}),
      (err) => {
        assert.ok(err instanceof EmbedError);
        assert.equal((err as EmbedError).code, "EMBED_CONNECTION");
        return true;
      },
    );
  } finally {
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  }
});

test("GeminiEmbedProvider.getInfo reports model + dim 768", () => {
  const p = new GeminiEmbedProvider({ apiKey: "k-test", baseURL: "http://x" });
  const info = p.getInfo();
  assert.equal(info.provider, "gemini");
  assert.equal(info.model, "text-embedding-004");
  assert.equal(info.dim, 768);
});
