import type { NextRequest } from "next/server";
import { handleDevicePairingExchangePost } from "@/lib/device-pairing/exchange-route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleDevicePairingExchangePost(req);
}
