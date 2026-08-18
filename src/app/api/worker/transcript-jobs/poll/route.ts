import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import { pollNextTranscriptJobForWorker } from "@/db/transcript-jobs";

export async function GET(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workerName =
    searchParams.get("worker_name") ??
    req.headers.get("x-worker-name") ??
    "mac-m5-pro";

  const job = pollNextTranscriptJobForWorker(workerName);
  if (!job) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ job });
}
