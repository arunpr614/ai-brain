import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { embed, EmbedError, EMBED_DIM } from "./client";

function stubOllama(
  handler: (body: { model: string; input: string[] }) => { status: number; payload: unknown },
): Promise<{ host: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const srv: Server = createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const body = raw ? JSON.parse(raw) : {};
        const { status, payload } = handler(body);
        res.statusCode = status;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(payload));
      });
    });
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as AddressInfo;
      resolve({
        host: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => srv.close(() => r())),
      });
    });
  });
}

test("embed returns Float32Arrays of correct dim", async () => {
  const vec = Array.from({ length: EMBED_DIM }, (_, i) => i / EMBED_DIM);
  const srv = await stubOllama(() => ({
    status: 200,
    payload: { embeddings: [vec] },
  }));
  try {
    const [got] = await embed(["hello"], { host: srv.host });
    assert.equal(got.length, EMBED_DIM);
    assert.ok(got instanceof Float32Array);
  } finally {
    await srv.close();
  }
});

test("empty input returns [] without hitting network", async () => {
  const result = await embed([], { host: "http://broken-host" });
  assert.deepEqual(result, []);
});

test("embed throws EMBED_MODEL_NOT_INSTALLED on 404 with 'not found'", async () => {
  const srv = await stubOllama(() => ({
    status: 404,
    payload: { error: 'model "nomic-embed-text" not found, try: ollama pull nomic-embed-text' },
  }));
  try {
    await embed(["x"], { host: srv.host });
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof EmbedError);
    assert.equal((err as EmbedError).code, "EMBED_MODEL_NOT_INSTALLED");
    assert.match((err as EmbedError).message, /ollama pull nomic-embed-text/);
    assert.equal((err as EmbedError).pullCommand, "ollama pull nomic-embed-text");
  } finally {
    await srv.close();
  }
});

test("embed throws EMBED_INVALID_RESPONSE on wrong dim", async () => {
  const srv = await stubOllama(() => ({
    status: 200,
    payload: { embeddings: [[0.1, 0.2, 0.3]] }, // wrong dim
  }));
  try {
    await embed(["x"], { host: srv.host });
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof EmbedError);
    assert.equal((err as EmbedError).code, "EMBED_INVALID_RESPONSE");
  } finally {
    await srv.close();
  }
});

test("embed throws EMBED_CONNECTION on unreachable host", async () => {
  try {
    await embed(["x"], { host: "http://127.0.0.1:1" });
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof EmbedError);
    assert.equal((err as EmbedError).code, "EMBED_CONNECTION");
  }
});

test("embed throws EMBED_INVALID_RESPONSE on length mismatch", async () => {
  const srv = await stubOllama(() => ({
    status: 200,
    payload: { embeddings: [Array(EMBED_DIM).fill(0)] },
  }));
  try {
    await embed(["a", "b"], { host: srv.host });
    assert.fail("should have thrown");
  } catch (err) {
    assert.equal((err as EmbedError).code, "EMBED_INVALID_RESPONSE");
  } finally {
    await srv.close();
  }
});
