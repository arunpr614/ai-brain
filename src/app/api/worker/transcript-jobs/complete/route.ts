import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import {
  completeTranscriptJobWithWorker,
  type WorkerCompleteInput,
} from "@/db/transcript-jobs";

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Partial<WorkerCompleteInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  if (
    !body.itemId ||
    typeof body.fullText !== "string" ||
    !Array.isArray(body.segments)
  ) {
    return NextResponse.json(
      {
        error: "validation_failed",
        details: "itemId, fullText (string), and segments (array) are required",
      },
      { status: 400 },
    );
  }

  try {
    const result = completeTranscriptJobWithWorker({
      jobId: Number(body.jobId ?? 0),
      itemId: body.itemId,
      fullText: body.fullText,
      language: body.language ?? "en",
      languageProbability: body.languageProbability,
      segments: body.segments,
      workerMetadata: body.workerMetadata ?? {},
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
