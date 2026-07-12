import type { NextRequest } from "next/server";
import { getProcessingTimezone, setProcessingTimezone } from "@/db/processing-preferences";
import { timezoneMutationSchema } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingReadGate, processingWriteGate, readBoundedJson } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = processingReadGate(req); if (gate) return gate;
  return processingJson(getProcessingTimezone());
}

export async function PUT(req: NextRequest) {
  const gate = processingWriteGate(req); if (gate) return gate;
  try {
    const result = setProcessingTimezone(timezoneMutationSchema.parse(await readBoundedJson(req)));
    return processingJson(result, { status: result.receipt.resultCode === "version_conflict" ? 409 : 200 });
  } catch (error) { return handleProcessingError(error); }
}
