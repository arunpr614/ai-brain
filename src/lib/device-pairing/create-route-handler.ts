import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookieValue, verifySessionToken } from "@/lib/auth";
import { loadApiToken } from "@/lib/auth/bearer";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import {
  createPairingCode,
  type CreatePairingCodeResult,
} from "@/lib/device-pairing/codes";

export const NO_STORE_HEADERS: Record<string, string> = {
  "cache-control": "no-store, no-cache, must-revalidate",
  pragma: "no-cache",
};

type CreateRouteDeps = {
  createCode?: () => CreatePairingCodeResult;
  loadToken?: () => string | null;
  tunnelUrl?: string;
  verifySession?: (token: string | undefined | null) => boolean;
};

function unauth(): NextResponse {
  return NextResponse.json(
    { error: "unauthenticated" },
    { status: 401, headers: NO_STORE_HEADERS },
  );
}

function hasVerifiedSession(req: NextRequest, deps: CreateRouteDeps): boolean {
  const verifySession = deps.verifySession ?? verifySessionToken;
  return verifySession(getSessionCookieValue(req.cookies));
}

export async function handleDevicePairingGet(
  req: NextRequest,
  deps: CreateRouteDeps = {},
): Promise<NextResponse> {
  if (!hasVerifiedSession(req, deps)) return unauth();

  const token = (deps.loadToken ?? loadApiToken)();
  if (!token) {
    return NextResponse.json(
      { error: "token_not_configured" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { url: deps.tunnelUrl ?? BRAIN_TUNNEL_URL, token },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}

export async function handleDevicePairingPost(
  req: NextRequest,
  deps: CreateRouteDeps = {},
): Promise<NextResponse> {
  if (!hasVerifiedSession(req, deps)) return unauth();

  const result = (deps.createCode ?? createPairingCode)();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      code: result.code,
      expires_at: result.expiresAt,
      url: deps.tunnelUrl ?? BRAIN_TUNNEL_URL,
    },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
