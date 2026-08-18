import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedWorkerOrSession } from "@/lib/auth/worker-auth";
import { enqueueTranscriptJobForExistingYoutubeItem } from "@/db/transcript-jobs";

export async function POST(req: NextRequest) {
  if (!isAuthorizedWorkerOrSession(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { itemId?: string; priority?: number; preferredModel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  if (!body.itemId) {
    return NextResponse.json(
      { error: "validation_failed", details: "itemId is required" },
      { status: 400 },
    );
  }

  const job = enqueueTranscriptJobForExistingYoutubeItem(
    body.itemId,
    "user_or_worker_trigger",
    {
      priority: body.priority ?? 50,
      preferredModel: body.preferredModel,
    },
  );

  if (!job) {
    return NextResponse.json(
      { error: "item_not_eligible_or_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, job });
}
