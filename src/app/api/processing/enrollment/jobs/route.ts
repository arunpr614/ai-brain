import type { NextRequest } from "next/server";
import { startEnrollmentPreview } from "@/db/processing-enrollment";
import { enrollmentPreviewSchema } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingWriteGate, readBoundedJson } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = processingWriteGate(req); if (gate) return gate;
  try { return processingJson({ job: startEnrollmentPreview(enrollmentPreviewSchema.parse(await readBoundedJson(req))) }, { status: 201 }); }
  catch (error) { return handleProcessingError(error); }
}
