import type { NextRequest } from "next/server";
import { getProcessingSummary } from "@/db/processing-queries";
import { parseFilterParams } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingReadGate } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = processingReadGate(req); if (gate) return gate;
  try { return processingJson(getProcessingSummary(parseFilterParams(req.nextUrl.searchParams))); }
  catch (error) { return handleProcessingError(error); }
}
