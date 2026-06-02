/**
 * POST /api/telegram/webhook — Telegram bot webhook handler (v0.6.5).
 *
 * Receives Update payloads from Telegram, verifies the secret-token
 * header + sender allowlist, and dispatches to the capture pipeline.
 *
 * Auth model (two checks, both must pass):
 * 1. `x-telegram-bot-api-secret-token` header matches our pre-shared
 *    secret (TELEGRAM_WEBHOOK_SECRET). Defends against random POSTs
 *    to our public webhook URL.
 * 2. `update.message.from.id === TELEGRAM_OWNER_USER_ID`. Defends
 *    against the case where someone messages our bot directly. We
 *    silently drop non-owner messages (return 200 so Telegram stops
 *    retrying) — never reply, never log spam.
 *
 * Failure semantics: ALWAYS return 200 to Telegram once the secret
 * token check has passed. If we return non-2xx, Telegram retries up
 * to 24h, which we want for the "brain.service is down" case (Telegram
 * naturally queues messages until brain comes back). But once we've
 * accepted the message, downstream errors are our problem to log,
 * not Telegram's to retry.
 *
 * The handler does NOT call `validateOrigin` like the other capture
 * routes — Telegram's webhook POSTs have no Origin header (they come
 * from server-to-server, not browser-to-server). The secret-token
 * header is the equivalent defense.
 *
 * Test seam: `__handlePost(req, deps)` lets tests pass stubbed
 * dispatch + sendMessage without ESM module-namespace mocking. The
 * real POST handler uses the production wiring.
 */

import { NextResponse, type NextRequest } from "next/server";
import { handleCaptureMessage as realHandleCaptureMessage } from "@/lib/telegram/dispatch";
import { sendMessage as realSendMessage } from "@/lib/telegram/client";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { logError } from "@/lib/errors/sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_TOKEN_HEADER = "x-telegram-bot-api-secret-token";

export interface WebhookDeps {
  handleCaptureMessage: typeof realHandleCaptureMessage;
  sendMessage: typeof realSendMessage;
}

const defaultDeps: WebhookDeps = {
  handleCaptureMessage: realHandleCaptureMessage,
  sendMessage: realSendMessage,
};

export async function __handlePost(
  req: NextRequest | Request,
  deps: WebhookDeps = defaultDeps,
): Promise<NextResponse> {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    logError({
      type: "telegram.webhook.misconfigured",
      reason: "TELEGRAM_WEBHOOK_SECRET not set",
      ts: Date.now(),
    });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 503 });
  }
  if (req.headers.get(SECRET_TOKEN_HEADER) !== expectedSecret) {
    logError({
      type: "telegram.webhook.bad-secret",
      ts: Date.now(),
    });
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    // Malformed body — accept-and-ignore.
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg) {
    return NextResponse.json({ ok: true });
  }

  const ownerId = Number(process.env.TELEGRAM_OWNER_USER_ID ?? "0");
  if (!ownerId || msg.from?.id !== ownerId) {
    logError({
      type: "telegram.webhook.non-owner",
      from_id: msg.from?.id ?? null,
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await deps.handleCaptureMessage(msg);
  } catch (err) {
    logError({
      type: "telegram.capture.unhandled",
      message: (err as Error).message,
      ts: Date.now(),
    });
    await deps.sendMessage(
      msg.chat.id,
      `⚠️ Capture failed: ${(err as Error).message.slice(0, 200)}`,
    ).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  return __handlePost(req);
}
