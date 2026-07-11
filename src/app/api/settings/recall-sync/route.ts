import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifySessionCookie } from "@/lib/auth";
import { isExactSameOrigin } from "@/lib/notes/http";
import {
  RecallSyncBusyError,
  RecallSyncCooldownError,
  RecallSyncTerminalReplayError,
} from "@/db/recall-manual-sync";
import {
  acceptRecallManualSync,
  recallManualSyncAvailable,
  recallManualSyncStatus,
  wakeRecallManualWorker,
} from "@/lib/recall/manual-sync-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "cache-control": "private, no-store, no-cache, must-revalidate", pragma: "no-cache" };
const schema = z.object({ idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/) }).strict();
const keySchema = z.string().regex(/^[A-Za-z0-9_-]{16,96}$/);
const requestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,96}$/);
const MAX_BODY_BYTES = 256;

function json(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: { ...headers, ...init.headers } });
}

export async function GET(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) return json({ error: "unauthenticated" }, { status: 401 });
  const lookup = req.headers.get("x-recall-idempotency-key");
  const requestId = req.headers.get("x-recall-request-id");
  if (lookup && !keySchema.safeParse(lookup).success) return json({ error: "invalid_request" }, { status: 400 });
  if (requestId && !requestIdSchema.safeParse(requestId).success) {
    return json({ error: "invalid_request" }, { status: 400 });
  }
  return json(recallManualSyncStatus(Date.now(), lookup, requestId));
}

export async function POST(req: NextRequest) {
  if (!verifySessionCookie(req.cookies)) return json({ error: "unauthenticated" }, { status: 401 });
  if (!recallManualSyncAvailable()) return json({ error: "unavailable" }, { status: 503 });
  if (!isExactSameOrigin(req)) return json({ error: "cross_origin_forbidden" }, { status: 403 });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "invalid_request" }, { status: 400 });
  }
  try {
    const raw = await readBoundedBody(req, MAX_BODY_BYTES);
    const body = schema.parse(JSON.parse(raw));
    const now = Date.now();
    const result = await acceptRecallManualSync({ idempotencyKey: body.idempotencyKey, now });
    const activated = wakeRecallManualWorker();
    console.info(JSON.stringify({
      type: activated ? "recall.manual.accepted" : "recall.manual.activation_failed",
      requestId: result.request.id,
      deduplicated: result.deduplicated,
      transition: result.request.state,
    }));
    return json(
      {
        requestId: result.request.id,
        state: result.request.state === "running" ? "running" : "queued",
        deduplicated: result.deduplicated,
        observedAt: new Date(now).toISOString(),
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof RecallSyncCooldownError) {
      return json(
        { error: "cooldown", retryAfterSeconds: error.retryAfterSeconds },
        { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } },
      );
    }
    if (error instanceof RecallSyncTerminalReplayError) {
      const body = {
        error: error.retryAfterSeconds > 0 ? "cooldown" : "terminal_replay",
        requestId: error.request.id,
        state: error.request.state,
        retryAfterSeconds: error.retryAfterSeconds,
        observedAt: new Date().toISOString(),
      };
      return json(body, {
        status: error.retryAfterSeconds > 0 ? 429 : 409,
        headers: error.retryAfterSeconds > 0 ? { "retry-after": String(error.retryAfterSeconds) } : undefined,
      });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof RequestBodyError) {
      return json({ error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof RecallSyncBusyError) return json({ error: "unavailable" }, { status: 503 });
    console.error(JSON.stringify({ type: "recall.manual.persistence_failure", safeReason: "internal" }));
    return json({ error: "unavailable" }, { status: 503 });
  }
}

class RequestBodyError extends Error {}

async function readBoundedBody(req: NextRequest, maxBytes: number): Promise<string> {
  const declared = req.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new RequestBodyError("invalid content length");
    if (Number(declared) > maxBytes) throw new RequestBodyError("request body is too large");
  }
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}
