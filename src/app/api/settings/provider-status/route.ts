import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { getProviderStatusReport } from "@/lib/providers/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = {
  "cache-control": "no-store, no-cache, must-revalidate",
  pragma: "no-cache",
};

export async function GET(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: HEADERS });
  }

  const report = await getProviderStatusReport();
  return NextResponse.json(report, { status: 200, headers: HEADERS });
}
