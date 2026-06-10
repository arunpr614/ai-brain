import { NextResponse, type NextRequest } from "next/server";
import {
  claimTelegramUpdate as realClaimTelegramUpdate,
  markTelegramUpdateCaptured as realMarkTelegramUpdateCaptured,
  markTelegramUpdateFailed as realMarkTelegramUpdateFailed,
  markTelegramUpdateIgnored as realMarkTelegramUpdateIgnored,
} from "@/db/telegram-updates";
import { logError } from "@/lib/errors/sink";
import { sendMessage as realSendMessage } from "@/lib/telegram/client";
import { handleCaptureMessage as realHandleCaptureMessage } from "@/lib/telegram/dispatch";
import { parseTelegramUpdate } from "@/lib/telegram/schema";
import {
  badSecretRateLimit,
  badSecretRateLimitKey,
} from "@/lib/telegram/webhook-rate-limit";

const SECRET_TOKEN_HEADER = "x-telegram-bot-api-secret-token";

export interface WebhookDeps {
  handleCaptureMessage: typeof realHandleCaptureMessage;
  sendMessage: typeof realSendMessage;
  claimTelegramUpdate: typeof realClaimTelegramUpdate;
  markTelegramUpdateCaptured: typeof realMarkTelegramUpdateCaptured;
  markTelegramUpdateFailed: typeof realMarkTelegramUpdateFailed;
  markTelegramUpdateIgnored: typeof realMarkTelegramUpdateIgnored;
}

const defaultDeps: WebhookDeps = {
  handleCaptureMessage: realHandleCaptureMessage,
  sendMessage: realSendMessage,
  claimTelegramUpdate: realClaimTelegramUpdate,
  markTelegramUpdateCaptured: realMarkTelegramUpdateCaptured,
  markTelegramUpdateFailed: realMarkTelegramUpdateFailed,
  markTelegramUpdateIgnored: realMarkTelegramUpdateIgnored,
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
    const limitKey = badSecretRateLimitKey(req.headers);
    const limited = badSecretRateLimit(limitKey);
    logError({
      type: "telegram.webhook.bad-secret",
      key: limitKey,
      limited: limited.limited,
      ts: Date.now(),
    });
    if (limited.limited) {
      return NextResponse.json(
        { error: "too_many_requests" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const update = parseTelegramUpdate(raw);
  if (!update) {
    logError({
      type: "telegram.webhook.invalid-payload",
      ts: Date.now(),
    });
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

  if (msg.chat.type !== "private") {
    logError({
      type: "telegram.webhook.non-private-chat",
      chat_id: msg.chat.id,
      chat_type: msg.chat.type,
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true });
  }

  const claimed = deps.claimTelegramUpdate({
    update_id: update.update_id,
    message_id: msg.message_id,
    chat_id: msg.chat.id,
    from_id: msg.from?.id ?? null,
    file_unique_id: msg.document?.file_unique_id ?? null,
  });
  if (claimed === "duplicate") {
    logError({
      type: "telegram.webhook.duplicate-update",
      update_id: update.update_id,
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await deps.handleCaptureMessage(msg);
    if (result.status === "captured") {
      deps.markTelegramUpdateCaptured(update.update_id, result.itemId);
    } else if (result.status === "failed") {
      deps.markTelegramUpdateFailed(update.update_id, result.reason);
      if (result.retryable) {
        return NextResponse.json({ error: "retryable_capture_failure" }, { status: 503 });
      }
    } else {
      deps.markTelegramUpdateIgnored(update.update_id, result.reason);
    }
  } catch (err) {
    deps.markTelegramUpdateFailed(update.update_id, "telegram.capture.unhandled");
    logError({
      type: "telegram.capture.unhandled",
      message: (err as Error).message,
      ts: Date.now(),
    });
    await deps.sendMessage(
      msg.chat.id,
      "Capture failed. I logged the details in Brain.",
    ).catch(() => {});
    return NextResponse.json({ error: "retryable_capture_failure" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
