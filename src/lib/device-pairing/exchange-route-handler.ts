import { NextResponse, type NextRequest } from "next/server";
import { BRAIN_TUNNEL_URL } from "@/lib/config/tunnel";
import {
  exchangePairingCode,
  type ExchangePairingCodeResult,
} from "@/lib/device-pairing/codes";
import { NO_STORE_HEADERS } from "./create-route-handler";

const STATUS_BY_REASON: Record<
  Extract<ExchangePairingCodeResult, { ok: false }>["reason"],
  number
> = {
  token_not_configured: 503,
  invalid_code: 401,
  expired_code: 410,
  used_code: 409,
  rate_limited: 429,
};

type ExchangeRouteDeps = {
  exchangeCode?: (code: string) => ExchangePairingCodeResult;
  tunnelUrl?: string;
};

export async function handleDevicePairingExchangePost(
  req: NextRequest,
  deps: ExchangeRouteDeps = {},
): Promise<NextResponse> {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const result = (deps.exchangeCode ?? exchangePairingCode)(code);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason },
      { status: STATUS_BY_REASON[result.reason], headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { url: deps.tunnelUrl ?? BRAIN_TUNNEL_URL, token: result.token },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
