import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import { recordWorkerHeartbeat } from "@/db/transcript-jobs";

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { workerId?: string; hostname?: string; systemInfo?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const workerId = body.workerId ?? req.headers.get("x-worker-name") ?? "mac-m5-pro";
  const now = Date.now();

  recordWorkerHeartbeat({
    workerId,
    hostname: body.hostname,
    systemInfo: body.systemInfo,
    now,
  });

  return NextResponse.json({ ok: true, timestamp: now });
}
