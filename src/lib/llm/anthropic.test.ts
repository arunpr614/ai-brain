// Tests for AnthropicProvider (v0.6.0 B-3, B-4).
//
// We stub the Anthropic API at the HTTP layer using a local server and
// pass `baseURL` to the SDK. This exercises the real SDK code path —
// only the wire is faked — so request/response shape regressions are
// caught.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { AnthropicProvider } from "./anthropic";
import { LLMError } from "./errors";

interface StubReq {
  method: string;
  url: string;
  body: string;
}

function stubServer(
  handler: (req: StubReq, res: ServerResponse) => void,
): Promise<{ baseURL: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const srv: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        handler({ method: req.method ?? "GET", url: req.url ?? "/", body: raw }, res);
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

test("AnthropicProvider.generate: round-trips text + usage", async () => {
  const stub = await stubServer((req, res) => {
    assert.equal(req.method, "POST");
    assert.match(req.url, /\/v1\/messages$/);
    const body = JSON.parse(req.body);
    assert.equal(body.model, "claude-haiku-4-5-20251001");
    assert.equal(body.max_tokens, 1200);
    assert.equal(body.system, "be terse");
    assert.deepEqual(body.messages, [{ role: "user", content: "hi" }]);
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: "hello" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 7, output_tokens: 4 },
      }),
    );
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const out = await p.generate({ prompt: "hi", system: "be terse" });
    assert.equal(out.response, "hello");
    assert.equal(out.metrics.input_tokens, 7);
    assert.equal(out.metrics.output_tokens, 4);
    assert.ok(out.metrics.wall_ms >= 0);
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.generate: HTTP errors wrap to LLMError", async () => {
  const stub = await stubServer((_req, res) => {
    res.statusCode = 429;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { type: "rate_limit", message: "slow down" } }));
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.generate({ prompt: "hi" }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "http");
        assert.equal((err as LLMError).status, 429);
        return true;
      },
    );
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.generateJson: parses valid JSON in one attempt", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: '{"a":1,"b":[2,3]}' }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 9 },
      }),
    );
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const out = await p.generateJson<{ a: number; b: number[] }>({ prompt: "hi" });
    assert.equal(out.attempts, 1);
    assert.deepEqual(out.parsed, { a: 1, b: [2, 3] });
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.generateJson: strips markdown fences", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: '```json\n{"ok":true}\n```' }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 9 },
      }),
    );
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const out = await p.generateJson<{ ok: boolean }>({ prompt: "hi" });
    assert.deepEqual(out.parsed, { ok: true });
    assert.equal(out.attempts, 1);
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.generateJson: retries once on parse failure, then throws with raw on cause", async () => {
  let calls = 0;
  const stub = await stubServer((_req, res) => {
    calls++;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        id: `msg_${calls}`,
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: "not json at all" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 5 },
      }),
    );
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    await assert.rejects(
      () => p.generateJson({ prompt: "hi" }),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "invalid_response");
        const cause = (err as unknown as { cause?: { raw?: string } }).cause;
        assert.equal(cause?.raw, "not json at all");
        return true;
      },
    );
    assert.equal(calls, 2, "should retry exactly once");
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.generateStream: yields text deltas and reports usage", async () => {
  const stub = await stubServer((_req, res) => {
    res.setHeader("content-type", "text/event-stream");
    res.setHeader("cache-control", "no-cache");
    const events = [
      `event: message_start\ndata: ${JSON.stringify({
        type: "message_start",
        message: {
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: "claude-haiku-4-5-20251001",
          content: [],
          stop_reason: null,
          usage: { input_tokens: 11, output_tokens: 0 },
        },
      })}\n\n`,
      `event: content_block_start\ndata: ${JSON.stringify({
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      })}\n\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "hel" },
      })}\n\n`,
      `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: "lo" },
      })}\n\n`,
      `event: content_block_stop\ndata: ${JSON.stringify({
        type: "content_block_stop",
        index: 0,
      })}\n\n`,
      `event: message_delta\ndata: ${JSON.stringify({
        type: "message_delta",
        delta: { stop_reason: "end_turn" },
        usage: { output_tokens: 8 },
      })}\n\n`,
      `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
    ];
    for (const e of events) res.write(e);
    res.end();
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const chunks: string[] = [];
    const usageHolder: { value: { input_tokens: number; output_tokens: number; wall_ms: number } | null } = {
      value: null,
    };
    for await (const piece of p.generateStream({
      prompt: "hi",
      onDone: (m) => {
        usageHolder.value = m;
      },
    })) {
      chunks.push(piece);
    }
    assert.deepEqual(chunks, ["hel", "lo"]);
    assert.ok(usageHolder.value, "onDone should have fired");
    assert.equal(usageHolder.value!.input_tokens, 11);
    assert.equal(usageHolder.value!.output_tokens, 8);
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider construction fails fast without an API key", () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.throws(
      () => new AnthropicProvider({}),
      (err) => {
        assert.ok(err instanceof LLMError);
        assert.equal((err as LLMError).code, "connection");
        return true;
      },
    );
  } finally {
    if (prevKey !== undefined) process.env.ANTHROPIC_API_KEY = prevKey;
  }
});

test("AnthropicProvider.submitBatch: posts mapped requests; pollBatch returns succeeded entries", async () => {
  let createCalls = 0;
  let retrieveCalls = 0;
  let resultsCalls = 0;
  const stub = await stubServer((req, res) => {
    if (req.method === "POST" && req.url.endsWith("/v1/messages/batches")) {
      createCalls++;
      const body = JSON.parse(req.body);
      assert.equal(body.requests.length, 2);
      assert.equal(body.requests[0].custom_id, "item-A");
      assert.equal(body.requests[0].params.model, "claude-haiku-4-5-20251001");
      assert.deepEqual(body.requests[0].params.messages, [
        { role: "user", content: "summarize A" },
      ]);
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "batch_xyz",
          type: "message_batch",
          processing_status: "in_progress",
          request_counts: { processing: 2, succeeded: 0, errored: 0, canceled: 0, expired: 0 },
          ended_at: null,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          archived_at: null,
          cancel_initiated_at: null,
          results_url: null,
        }),
      );
      return;
    }
    if (req.method === "GET" && req.url.endsWith("/v1/messages/batches/batch_xyz")) {
      retrieveCalls++;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "batch_xyz",
          type: "message_batch",
          processing_status: "ended",
          request_counts: { processing: 0, succeeded: 1, errored: 1, canceled: 0, expired: 0 },
          ended_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          archived_at: null,
          cancel_initiated_at: null,
          results_url: `${stub.baseURL}/v1/messages/batches/batch_xyz/results`,
        }),
      );
      return;
    }
    if (req.method === "GET" && req.url.endsWith("/v1/messages/batches/batch_xyz/results")) {
      resultsCalls++;
      res.setHeader("content-type", "application/x-jsonl");
      res.write(
        JSON.stringify({
          custom_id: "item-A",
          result: {
            type: "succeeded",
            message: {
              id: "msg_a",
              type: "message",
              role: "assistant",
              model: "claude-haiku-4-5-20251001",
              content: [{ type: "text", text: "summary A" }],
              stop_reason: "end_turn",
              usage: { input_tokens: 30, output_tokens: 12 },
            },
          },
        }) + "\n",
      );
      res.write(
        JSON.stringify({
          custom_id: "item-B",
          result: {
            type: "errored",
            error: { type: "error", error: { type: "overloaded_error", message: "503" } },
          },
        }) + "\n",
      );
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const submit = await p.submitBatch([
      { custom_id: "item-A", prompt: "summarize A" },
      { custom_id: "item-B", prompt: "summarize B" },
    ]);
    assert.equal(submit.batch_id, "batch_xyz");
    assert.equal(createCalls, 1);

    const poll = await p.pollBatch("batch_xyz");
    assert.equal(poll.status, "ended");
    assert.ok(poll.results, "results should be present when ended");
    assert.equal(poll.results!.length, 2);

    const ok = poll.results!.find((r) => r.custom_id === "item-A");
    assert.ok(ok && ok.type === "succeeded");
    if (ok && ok.type === "succeeded") {
      assert.equal(ok.response, "summary A");
      assert.equal(ok.metrics.input_tokens, 30);
    }

    const err = poll.results!.find((r) => r.custom_id === "item-B");
    assert.ok(err && err.type === "errored");
    if (err && err.type === "errored") {
      assert.match(err.error, /503/);
    }

    // SDK may call retrieve > once (poll + internal results URL lookup);
    // the contract is "we got results", not "exactly one retrieve hit".
    assert.ok(retrieveCalls >= 1);
    assert.equal(resultsCalls, 1);
  } finally {
    await stub.close();
  }
});

test("AnthropicProvider.pollBatch: returns null results while processing", async () => {
  const stub = await stubServer((req, res) => {
    if (req.method === "GET" && req.url.endsWith("/v1/messages/batches/batch_pending")) {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          id: "batch_pending",
          type: "message_batch",
          processing_status: "in_progress",
          request_counts: { processing: 5, succeeded: 0, errored: 0, canceled: 0, expired: 0 },
          ended_at: null,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          archived_at: null,
          cancel_initiated_at: null,
          results_url: null,
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  try {
    const p = new AnthropicProvider({ apiKey: "sk-test", baseURL: stub.baseURL });
    const poll = await p.pollBatch("batch_pending");
    assert.equal(poll.status, "in_progress");
    assert.equal(poll.results, null);
    assert.equal(poll.request_counts.processing, 5);
  } finally {
    await stub.close();
  }
});
