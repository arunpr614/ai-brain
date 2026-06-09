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
 * Tests exercise the webhook logic through `src/lib/telegram/webhook-handler`
 * so this route file keeps only exports allowed by Next.js.
 */

import type { NextRequest } from "next/server";
import { handleTelegramWebhookPost } from "@/lib/telegram/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleTelegramWebhookPost(req);
}
