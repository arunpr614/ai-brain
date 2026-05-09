/**
 * POST /api/errors/client — client-side error sink (v0.5.0 T-5 / REVIEW P2-3).
 *
 * Accepts namespaced error events from the Android APK WebView and the
 * Chrome MV3 extension. Appends to `data/errors.jsonl` via the existing
 * F-050 logError() helper so server + client errors share one timeline.
 *
 * Auth:
 *   - In BEARER_ROUTES — proxy.ts already verifies the bearer token and
 *     applies rate-limiting BEFORE this handler runs. This route does
 *     NOT re-verify the token (defense-in-depth lives at the proxy).
 *   - Origin-header validation runs here per D-v0.5.0-7: extensions can
 *     submit (chrome-extension://*) and APK WebView can submit (same-origin
 *     to brain.local:3000 or localhost:3000); everything else is rejected.
 *
 * Schema:
 *   - namespace: matches `/^(lan|share|ext)\.[a-z0-9.-]+$/` — allow-lists
 *     the three v0.5.0 namespaces (Conventions §6.1) and rejects attempts
 *     to impersonate server-side namespaces (enrich.*, ask.*, etc.).
 *   - message: non-empty string, max 2 KB (room for stack traces).
 *   - context: optional plain object; JSON-serialised and stored as-is.
 *     Max 64 KB total request body to bound disk growth.
 *
 * Logged event shape:
 *   {type: <namespace>, message, context, source: "client", ts}
 */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateOrigin } from "@/lib/auth/bearer";
import { logError } from "@/lib/errors/sink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAMESPACE_RE = /^(lan|share|ext)\.[a-z0-9.-]+$/;
const MAX_BODY_BYTES = 64 * 1024;

const ClientErrorBody = z.object({
  namespace: z.string().regex(NAMESPACE_RE, "namespace must match (lan|share|ext).<name>"),
  message: z.string().min(1).max(2048),
  context: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  if (!validateOrigin(req.headers.get("origin"))) {
    logError({
      type: "lan.bearer.reject-origin",
      path: "/api/errors/client",
      origin: req.headers.get("origin"),
      ts: Date.now(),
    });
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = ClientErrorBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { namespace, message, context } = parsed.data;
  logError({
    type: namespace,
    message,
    context: context ?? null,
    source: "client",
    ts: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
