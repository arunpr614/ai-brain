/**
 * Unit tests for /api/telegram/webhook route handler (v0.6.5).
 *
 * Covers the auth gates (secret-token header + sender allowlist) and
 * the dispatch happy-path. Uses the handler test seam to inject
 * stubbed dispatch + sendMessage without real DB or Telegram API.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  handleTelegramWebhookPost,
  type WebhookDeps,
} from "@/lib/telegram/webhook-handler";
import type { TelegramUpdate, TelegramMessage } from "@/lib/telegram/types";

const OWNER_ID = 943125412;
const SECRET = "test-webhook-secret-deadbeef";

interface DispatchCall {
  msg: TelegramMessage;
}

interface SendCall {
  chatId: number;
  text: string;
}

function buildDeps(opts: { dispatchThrows?: Error } = {}) {
  const dispatchCalls: DispatchCall[] = [];
  const sendCalls: SendCall[] = [];
  const deps: WebhookDeps = {
    handleCaptureMessage: async (msg) => {
      dispatchCalls.push({ msg });
      if (opts.dispatchThrows) throw opts.dispatchThrows;
    },
    sendMessage: async (chatId, text) => {
      sendCalls.push({ chatId, text });
      return {
        message_id: 1,
        chat: { id: chatId, type: "private" as const },
        date: 0,
      };
    },
  };
  return { deps, dispatchCalls, sendCalls };
}

function buildRequest(body: unknown, headerSecret: string | null = SECRET): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (headerSecret !== null) {
    headers["x-telegram-bot-api-secret-token"] = headerSecret;
  }
  return new Request("https://brain.arunp.in/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function ownerUpdate(extra: Partial<TelegramMessage> = {}): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 100,
      chat: { id: 1, type: "private" },
      date: Math.floor(Date.now() / 1000),
      from: { id: OWNER_ID, is_bot: false, first_name: "Arun" },
      ...extra,
    },
  };
}

describe("telegram/webhook handleTelegramWebhookPost", () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    process.env.TELEGRAM_OWNER_USER_ID = String(OWNER_ID);
  });

  afterEach(() => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_OWNER_USER_ID;
  });

  it("returns 401 when secret-token header is missing", async () => {
    const t = buildDeps();
    const res = await handleTelegramWebhookPost(buildRequest(ownerUpdate(), null), t.deps);
    assert.equal(res.status, 401);
    assert.equal(t.dispatchCalls.length, 0);
  });

  it("returns 401 when secret-token header is wrong", async () => {
    const t = buildDeps();
    const res = await handleTelegramWebhookPost(
      buildRequest(ownerUpdate(), "wrong-secret"),
      t.deps,
    );
    assert.equal(res.status, 401);
    assert.equal(t.dispatchCalls.length, 0);
  });

  it("returns 503 when TELEGRAM_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    const t = buildDeps();
    const res = await handleTelegramWebhookPost(buildRequest(ownerUpdate()), t.deps);
    assert.equal(res.status, 503);
  });

  it("returns 200 silent when sender is not the owner", async () => {
    const t = buildDeps();
    const update = ownerUpdate();
    update.message!.from!.id = 99999999;
    const res = await handleTelegramWebhookPost(buildRequest(update), t.deps);
    assert.equal(res.status, 200);
    assert.equal(t.dispatchCalls.length, 0);
    assert.equal(t.sendCalls.length, 0);
  });

  it("returns 200 silent when message is missing (e.g. channel_post)", async () => {
    const t = buildDeps();
    const res = await handleTelegramWebhookPost(buildRequest({ update_id: 1 }), t.deps);
    assert.equal(res.status, 200);
    assert.equal(t.dispatchCalls.length, 0);
  });

  it("dispatches to handleCaptureMessage on valid owner update", async () => {
    const t = buildDeps();
    const res = await handleTelegramWebhookPost(
      buildRequest(ownerUpdate({ text: "hello" })),
      t.deps,
    );
    assert.equal(res.status, 200);
    assert.equal(t.dispatchCalls.length, 1);
    assert.equal(t.dispatchCalls[0].msg.text, "hello");
    assert.equal(t.dispatchCalls[0].msg.from?.id, OWNER_ID);
  });

  it("returns 200 even when dispatch throws — tries to ack failure to user", async () => {
    const t = buildDeps({ dispatchThrows: new Error("boom") });
    const res = await handleTelegramWebhookPost(
      buildRequest(ownerUpdate({ text: "trigger" })),
      t.deps,
    );
    assert.equal(res.status, 200);
    assert.equal(t.sendCalls.length, 1);
    assert.match(t.sendCalls[0].text, /Capture failed: boom/);
  });

  it("returns 200 silent when body is malformed JSON", async () => {
    const t = buildDeps();
    const req = new Request("https://brain.arunp.in/api/telegram/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": SECRET,
      },
      body: "not-json{{{",
    });
    const res = await handleTelegramWebhookPost(req, t.deps);
    assert.equal(res.status, 200);
    assert.equal(t.dispatchCalls.length, 0);
  });
});
