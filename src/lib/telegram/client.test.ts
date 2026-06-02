/**
 * Unit tests for src/lib/telegram/client.ts (v0.6.5).
 *
 * Stubs global fetch — no real Telegram traffic in CI. Verifies request
 * shape, response unwrapping, and error surfacing.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { downloadFile, editMessageText, getFile, sendMessage } from "./client";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function stubFetch(response: unknown, status = 200): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init });
    return new Response(typeof response === "string" ? response : JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

function stubFetchBinary(bytes: Uint8Array, status = 200): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input.toString();
    calls.push({ url, init: undefined });
    return new Response(bytes as unknown as BodyInit, { status });
  }) as typeof fetch;
  return calls;
}

describe("telegram/client", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = ORIGINAL_TOKEN;
    }
  });

  it("sendMessage posts to /sendMessage and unwraps result", async () => {
    const calls = stubFetch({
      ok: true,
      result: { message_id: 42, chat: { id: 1, type: "private" }, date: 0 },
    });
    const msg = await sendMessage(1, "hello");
    assert.equal(msg.message_id, 42);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/bottest-token\/sendMessage$/);
    const body = JSON.parse(calls[0].init?.body as string);
    assert.equal(body.chat_id, 1);
    assert.equal(body.text, "hello");
    assert.equal(body.disable_web_page_preview, true);
  });

  it("sendMessage surfaces telegram error_code on ok:false", async () => {
    stubFetch({ ok: false, error_code: 400, description: "Bad Request: chat not found" });
    await assert.rejects(() => sendMessage(1, "hi"), /telegram\.sendMessage failed: 400 Bad Request/);
  });

  it("editMessageText posts to /editMessageText", async () => {
    const calls = stubFetch({ ok: true, result: true });
    await editMessageText(1, 99, "edited");
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/editMessageText$/);
    const body = JSON.parse(calls[0].init?.body as string);
    assert.equal(body.message_id, 99);
    assert.equal(body.text, "edited");
  });

  it("getFile returns the file metadata", async () => {
    stubFetch({ ok: true, result: { file_id: "x", file_unique_id: "y", file_path: "documents/foo.pdf" } });
    const file = await getFile("x");
    assert.equal(file.file_path, "documents/foo.pdf");
  });

  it("downloadFile fetches the file content URL and returns ArrayBuffer", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const calls = stubFetchBinary(bytes);
    const buf = await downloadFile("documents/foo.pdf");
    assert.equal(new Uint8Array(buf).length, 4);
    assert.match(calls[0].url, /\/file\/bottest-token\/documents\/foo\.pdf$/);
  });

  it("throws if TELEGRAM_BOT_TOKEN is not set", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    await assert.rejects(() => sendMessage(1, "hi"), /TELEGRAM_BOT_TOKEN not set/);
  });
});
