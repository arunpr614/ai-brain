/**
 * GET /api/health — liveness probe (v0.5.0 T-14 / F-020).
 *
 * Purpose: the APK share-handler and Chrome extension call this BEFORE
 * attempting a capture POST so a dead-Mac / asleep-Mac case surfaces as
 * the offline screen (D-v0.5.0-2, SC-11) instead of a silent discard.
 *
 * Auth: allow-listed in BEARER_ROUTES (src/lib/auth/bearer.ts) — the
 * proxy verifies the bearer token and applies rate-limiting BEFORE this
 * handler runs, so a 401 from here means "token mismatch" (server token
 * rotated, likely) and a 200 means "Brain is up AND paired correctly".
 * A cookie-authed browser hit also works (T-7 pre-Pixel verification uses
 * Android Chrome without a bearer header; cookie is absent in that path,
 * so the proxy's bearer check kicks in with whatever bearer Chrome sends,
 * or if absent, returns 401 — which is itself diagnostic).
 *
 * Body: `{ok: true, ts}`. No DB round-trip — a live SQLite check would
 * defeat the point (we need this to return in <100ms; the probe has a
 * 2s total timeout per reachability.ts).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { "cache-control": "no-store" } },
  );
}
