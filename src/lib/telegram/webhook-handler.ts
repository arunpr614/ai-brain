import { NextResponse, type NextRequest } from "next/server";
import { logError } from "@/lib/errors/sink";
import { sendMessage as realSendMessage } from "@/lib/telegram/client";
import { handleCaptureMessage as realHandleCaptureMessage } from "@/lib/telegram/dispatch";
import type { TelegramUpdate } from "@/lib/telegram/types";

const SECRET_TOKEN_HEADER = "x-telegram-bot-api-secret-token";

export interface WebhookDeps {
  handleCaptureMessage: typeof realHandleCaptureMessage;
  sendMessage: typeof realSendMessage;
}

const defaultDeps: WebhookDeps = {
  handleCaptureMessage: realHandleCaptureMessage,
  sendMessage: realSendMessage,
};

export async function handleTelegramWebhookPost(
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
