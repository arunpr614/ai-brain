import type { NextRequest } from "next/server";
import {
  handleDevicePairingGet,
  handleDevicePairingPost,
} from "@/lib/device-pairing/create-route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleDevicePairingGet(req);
}

export async function POST(req: NextRequest) {
  return handleDevicePairingPost(req);
}
