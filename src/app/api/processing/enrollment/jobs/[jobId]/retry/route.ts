import type { NextRequest } from "next/server";
import { retryEnrollmentJob } from "@/db/processing-enrollment";
import { enrollmentActionSchema, enrollmentJobIdSchema } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingWriteGate, readBoundedJson } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ jobId: string }> };

export async function POST(req: NextRequest, context: Context) {
  const gate = processingWriteGate(req); if (gate) return gate;
  try {
    const { jobId: rawJobId } = await context.params;
    const jobId = enrollmentJobIdSchema.parse(rawJobId);
    const result = retryEnrollmentJob(jobId, enrollmentActionSchema.parse(await readBoundedJson(req)));
    return processingJson(result, { status: result.receipt?.outcomeClass === "rejected" ? 409 : 200 });
  } catch (error) { return handleProcessingError(error); }
}
