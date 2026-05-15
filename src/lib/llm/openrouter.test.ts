// Tests for OpenRouterProvider (v0.6.0 B-5, B-6).
//
// Privacy invariant: every outbound request body MUST contain
//   provider.order, provider.allow_fallbacks: false, provider.data_collection: "deny"
// The first test below pins this; if it goes red, do NOT loosen it —
// fix the provider implementation. See docs/research/openrouter-provider-evaluation.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { OpenRouterProvider } from "./openrouter";
import { LLMError } from "./errors";

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
        baseURL: `http://127.0.0.1:${addr.port}/v1`,
        close: () => new Promise((r) => srv.close(() => r())),
      });
    });
  });
}

test("OpenRouterProvider: every request includes provider pin block (data_collection deny + no fallbacks)", async () => {
  let bodyJson: Record<string, unknown> | null = null;
  const stub = await stubServer((req, res) => {
    bodyJson = JSON.parse(req.body);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 3, completion_tokens: 1 },
      }),
    );
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    await p.generate({ prompt: "hi" });
    assert.ok(bodyJson, "request body should have been captured");
    const provider = (bodyJson as { provider?: Record<string, unknown> }).provider;
    assert.ok(provider, "request must carry a `provider` block");
    assert.deepEqual(provider!.order, ["Anthropic"]);
    assert.equal(provider!.allow_fallbacks, false);
    assert.equal(provider!.data_collection, "deny");
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider.generate: round-trips text + usage", async () => {
  const stub = await stubServer((req, res) => {
    assert.equal(req.method, "POST");
    assert.match(req.url, /\/v1\/chat\/completions$/);
    assert.equal(req.headers.authorization, "Bearer or-test");
    const body = JSON.parse(req.body);
    assert.equal(body.model, "anthropic/claude-sonnet-4-6");
    assert.equal(body.stream, false);
    assert.deepEqual(body.messages, [
      { role: "system", content: "be terse" },
      { role: "user", content: "hi" },
    ]);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "hello" } }],
        usage: { prompt_tokens: 7, completion_tokens: 4 },
      }),
    );
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    const out = await p.generate({ prompt: "hi", system: "be terse" });
    assert.equal(out.response, "hello");
    assert.equal(out.metrics.input_tokens, 7);
    assert.equal(out.metrics.output_tokens, 4);
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider.generate: HTTP errors wrap to LLMError", async () => {
  const stub = await stubServer((_req, res) => {
    res.statusCode = 402;
    res.end('{"error":"insufficient credits"}');
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.generate({ prompt: "hi" }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "http");
        assert.equal((err as LLMError).status, 402);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider.generateJson: parses valid JSON in one attempt", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: '{"a":1}' } }],
        usage: { prompt_tokens: 5, completion_tokens: 5 },
      }),
    );
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    const out = await p.generateJson<{ a: number }>({ prompt: "hi" });
    assert.equal(out.attempts, 1);
    assert.deepEqual(out.parsed, { a: 1 });
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider.generateJson: retries once on parse failure, then throws with raw on cause", async () => {
  let calls = 0;
  const stub = await stubServer((_req, res) => {
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: "not json" } }],
        usage: { prompt_tokens: 5, completion_tokens: 3 },
      }),
    );
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.generateJson({ prompt: "hi" }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "invalid_response");
        const cause = (err as unknown as { cause?: { raw?: string } }).cause;
        assert.equal(cause?.raw, "not json");
        return true;
      },
    );
    assert.equal(calls, 2);
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider.generateStream: parses SSE delta frames + final usage", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "text/event-stream");
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "hel" } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n\n`);
    res.write(
      `data: ${JSON.stringify({
        choices: [{ delta: {} }],
        usage: { prompt_tokens: 11, completion_tokens: 8 },
      })}\n\n`,
    );
    res.write("data: [DONE]\n\n");
    res.end();
  });
  try {
    const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: stub.baseURL });
    const chunks: string[] = [];
    const usage: { value: { input_tokens: number; output_tokens: number; wall_ms: number } | null } = {
      value: null,
    };
    for await (const piece of p.generateStream({
      prompt: "hi",
      onDone: (m) => {
        usage.value = m;
      },
    })) {
      chunks.push(piece);
    }
    assert.deepEqual(chunks, ["hel", "lo"]);
    assert.ok(usage.value);
    assert.equal(usage.value!.input_tokens, 11);
    assert.equal(usage.value!.output_tokens, 8);
  } finally {
    await stub.close();
  }
});

test("OpenRouterProvider construction fails fast without an API key", () => {
  const prev = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  try {
    assert.throws(
      () => new OpenRouterProvider({}),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "connection");
        return true;
      },
    );
  } finally {
    if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev;
  }
});

test("OpenRouterProvider does not expose batch operations (B-6)", () => {
  const p = new OpenRouterProvider({ apiKey: "or-test", baseURL: "http://x/v1" });
  // Optional methods on LLMProvider — present on Anthropic, absent on OR.
  // Phase C's enrichment-batch.ts gates on this exact check.
  const submit = (p as unknown as { submitBatch?: unknown }).submitBatch;
  const poll = (p as unknown as { pollBatch?: unknown }).pollBatch;
  assert.notEqual(typeof submit, "function");
  assert.notEqual(typeof poll, "function");
});
