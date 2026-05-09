/**
 * POST /api/settings/rotate-token (v0.5.0 T-8 / F-037).
 *
 * Regenerates BRAIN_LAN_TOKEN, writes it to .env, updates process.env for
 * the current server process, and logs `lan.bearer.token-rotated` via the
 * F-050 sink. After rotation every paired APK and extension must re-pair
 * via QR scan (for APK) or options-page paste (for extension) — this
 * endpoint returns 200 once; the UI is responsible for re-rendering
 * /settings/lan-info so the user sees the new QR.
 *
 * Auth: cookie-gated. NOT in BEARER_ROUTES — the whole point of rotation
 * is that the old bearer should become worthless immediately, so the
 * rotation endpoint itself must not be bearer-reachable.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { tokenFingerprint } from "@/lib/auth/bearer";
import { logError } from "@/lib/errors/sink";
import { rotateLanToken } from "@/lib/lan/info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE: Record<string, string> = {
  "cache-control": "no-store, no-cache, must-revalidate",
  pragma: "no-cache",
};

export async function POST(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: NO_STORE },
    );
  }

  const token = rotateLanToken();
  logError({
    type: "lan.bearer.token-rotated",
    fingerprint: tokenFingerprint(token),
    ts: Date.now(),
  });

  return NextResponse.json({ ok: true }, { status: 200, headers: NO_STORE });
}
