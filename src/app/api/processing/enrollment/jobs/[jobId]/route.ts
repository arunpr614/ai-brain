import type { NextRequest } from "next/server";
import { getEnrollmentJob } from "@/db/processing-enrollment";
import { enrollmentJobIdSchema } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingReadGate } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ jobId: string }> };

export async function GET(req: NextRequest, context: Context) {
  const gate = processingReadGate(req); if (gate) return gate;
  try {
    const { jobId: rawJobId } = await context.params;
    const jobId = enrollmentJobIdSchema.parse(rawJobId);
    const job = getEnrollmentJob(jobId);
    return job ? processingJson({ job }) : processingJson({ error: "not_found" }, { status: 404 });
  } catch (error) { return handleProcessingError(error); }
}
