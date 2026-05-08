import { test } from "node:test";
import assert from "node:assert/strict";
import {
  echoGenerator,
  encodeSSE,
  orchestrateAsk,
  toSSEStream,
  type AskFrame,
} from "./sse";
import type { RetrievedChunk } from "@/lib/retrieve";

function stubChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunk_id: "c1",
    item_id: "i1",
    item_title: "Stub",
    body: "body",
    similarity: 0.9,
    ...overrides,
  };
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value);
  }
  return out;
}

function parseFrames(body: string): AskFrame[] {
  return body
    .split("\n\n")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("data: "))
    .map((s) => JSON.parse(s.slice(6)) as AskFrame);
}

test("encodeSSE produces data: <json>\\n\\n", () => {
  const encoded = encodeSSE({ type: "token", text: "hi" });
  assert.equal(encoded, 'data: {"type":"token","text":"hi"}\n\n');
});

test("orchestrateAsk emits retrieve → token* → done in order", async () => {
  const chunks = [stubChunk(), stubChunk({ chunk_id: "c2", item_title: "Two" })];
  async function* gen() {
    yield "hello ";
    yield "world";
  }
  const frames: AskFrame[] = [];
  for await (const f of orchestrateAsk({
    question: "q",
    chunks,
    generator: () => gen(),
  })) {
    frames.push(f);
  }
  assert.equal(frames[0].type, "retrieve");
  assert.equal(frames[1].type, "token");
  assert.equal(frames[2].type, "token");
  assert.equal(frames[frames.length - 1].type, "done");
  if (frames[0].type === "retrieve") {
    assert.equal(frames[0].chunks.length, 2);
    // Must not leak chunk bodies into the retrieve frame.
    assert.equal((frames[0].chunks[0] as Record<string, unknown>).body, undefined);
  }
});

test("toSSEStream auto-appends done if generator never emits one", async () => {
  async function* raw(): AsyncIterable<AskFrame> {
    yield { type: "token", text: "x" };
  }
  const stream = toSSEStream(raw());
  const body = await drain(stream);
  const frames = parseFrames(body);
  assert.equal(frames[frames.length - 1].type, "done");
});

test("toSSEStream catches generator errors into an error frame", async () => {
  async function* bad(): AsyncIterable<AskFrame> {
    yield { type: "token", text: "start" };
    throw new Error("boom");
  }
  const stream = toSSEStream(bad());
  const body = await drain(stream);
  const frames = parseFrames(body);
  assert.equal(frames[0].type, "token");
  assert.equal(frames[1].type, "error");
  if (frames[1].type === "error") {
    assert.equal(frames[1].code, "STREAM_FAILED");
    assert.match(frames[1].message, /boom/);
  }
});

test("echoGenerator returns reply referencing top chunk", async () => {
  const chunks = [stubChunk({ item_title: "React hooks" })];
  const out: string[] = [];
  for await (const t of echoGenerator({ question: "how do hooks work?", chunks })) {
    out.push(t);
  }
  const reply = out.join("");
  assert.match(reply, /React hooks/);
  assert.match(reply, /how do hooks work/);
});

test("echoGenerator handles empty chunks gracefully", async () => {
  const out: string[] = [];
  for await (const t of echoGenerator({ question: "q", chunks: [] })) {
    out.push(t);
  }
  assert.match(out.join(""), /No matching chunks/);
});

test("AbortSignal aborts orchestrateAsk mid-generation", async () => {
  const controller = new AbortController();
  let yielded = 0;
  async function* slow(): AsyncIterable<string> {
    for (let i = 0; i < 10; i++) {
      yielded++;
      if (i === 2) controller.abort();
      yield `t${i} `;
    }
  }
  const frames: AskFrame[] = [];
  for await (const f of orchestrateAsk({
    question: "q",
    chunks: [],
    generator: () => slow(),
    signal: controller.signal,
  })) {
    frames.push(f);
  }
  assert.ok(yielded <= 4, `generator should stop quickly after abort, got ${yielded}`);
  assert.equal(frames[frames.length - 1].type, "done");
});
