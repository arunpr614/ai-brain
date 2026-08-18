import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import {
  getAsrPipelineDashboardData,
  retryTranscriptJobNow,
  ignoreTranscriptJob,
  setTranscriptJobPriority,
  enqueueTranscriptJobForExistingYoutubeItem,
} from "@/db/transcript-jobs";

export async function GET(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workerId = searchParams.get("worker_id") ?? "mac-m5-pro";

  const data = getAsrPipelineDashboardData(workerId);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    action: "retry" | "ignore" | "prioritize" | "enqueue";
    itemId: string;
    priority?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.action || !body.itemId) {
    return NextResponse.json(
      { error: "action and itemId are required" },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "retry": {
      const job = retryTranscriptJobNow(body.itemId);
      return NextResponse.json({ ok: Boolean(job), job });
    }
    case "ignore": {
      const job = ignoreTranscriptJob(body.itemId);
      return NextResponse.json({ ok: Boolean(job), job });
    }
    case "prioritize": {
      const priority = body.priority ?? 100;
      const job = setTranscriptJobPriority(body.itemId, priority);
      return NextResponse.json({ ok: Boolean(job), job });
    }
    case "enqueue": {
      const job = enqueueTranscriptJobForExistingYoutubeItem(
        body.itemId,
        "dashboard_manual_trigger",
        { priority: body.priority ?? 50, force: true },
      );
      return NextResponse.json({ ok: Boolean(job), job });
    }
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
}
