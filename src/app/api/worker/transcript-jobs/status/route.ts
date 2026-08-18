import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import { getWorkerPresenceStatus } from "@/db/transcript-jobs";

export async function GET(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workerId = searchParams.get("worker_id") ?? "mac-m5-pro";

  const status = getWorkerPresenceStatus(workerId);
  return NextResponse.json({ ok: true, ...status });
}
