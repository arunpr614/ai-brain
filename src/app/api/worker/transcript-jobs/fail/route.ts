import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import {
  failTranscriptJobWithWorker,
  type WorkerFailInput,
} from "@/db/transcript-jobs";

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Partial<WorkerFailInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!body.itemId || !body.errorMessage) {
    return NextResponse.json(
      {
        error: "validation_failed",
        details: "itemId and errorMessage are required",
      },
      { status: 400 },
    );
  }

  try {
    const result = failTranscriptJobWithWorker({
      jobId: Number(body.jobId ?? 0),
      itemId: body.itemId,
      errorCode: body.errorCode ?? "worker_error",
      errorMessage: body.errorMessage,
      retryable: body.retryable ?? true,
      workerName: body.workerName ?? req.headers.get("x-worker-name") ?? "mac-m5-pro",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "processing_error", message: (err as Error).message },
      { status: 500 },
    );
  }
}
