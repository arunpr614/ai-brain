/**
 * GET /api/settings/lan-info (v0.5.0 T-8 / F-038).
 *
 * Returns {ip, token, setup_uri, qr_png_data_uri} for the pairing UI.
 *
 * Auth: cookie-gated (PIN-unlocked browser session). This endpoint is
 * deliberately NOT in BEARER_ROUTES — only the user's already-unlocked
 * browser should ever see the plaintext token.
 *
 * Cache discipline (REVIEW missing-risk): the QR PNG is the bearer token
 * rendered into a scan-able matrix. If any proxy or browser cache retained
 * it, a later user of the same browser (or a screenshot sitting in a photo
 * library) would leak the token. Mandatory headers:
 *   - Cache-Control: no-store, no-cache, must-revalidate
 *   - Pragma: no-cache
 * The QR is inline in the JSON as a data-URI; never persisted to disk.
 */
import { NextResponse, type NextRequest } from "next/server";
import { toDataURL } from "qrcode";
import { SESSION_COOKIE } from "@/lib/auth";
import { loadLanToken } from "@/lib/auth/bearer";
import { buildSetupUri, getLanIpv4 } from "@/lib/lan/info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE: Record<string, string> = {
  "cache-control": "no-store, no-cache, must-revalidate",
  pragma: "no-cache",
};

function unauth(): NextResponse {
  return NextResponse.json(
    { error: "unauthenticated" },
    { status: 401, headers: NO_STORE },
  );
}

export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) return unauth();

  const token = loadLanToken();
  if (!token) {
    return NextResponse.json(
      { error: "token_not_configured" },
      { status: 503, headers: NO_STORE },
    );
  }

  const ip = getLanIpv4();
  if (!ip) {
    return NextResponse.json(
      { error: "no_lan_interface" },
      { status: 503, headers: NO_STORE },
    );
  }

  const setup_uri = buildSetupUri(token);
  const qr_png_data_uri = await toDataURL(setup_uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
  });

  return NextResponse.json(
    { ip, token, setup_uri, qr_png_data_uri },
    { status: 200, headers: NO_STORE },
  );
}
