import type { NextRequest } from "next/server";
import { getProcessingFilters } from "@/db/processing-queries";
import { handleProcessingError, processingJson, processingReadGate } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = processingReadGate(req); if (gate) return gate;
  try { return processingJson(getProcessingFilters()); }
  catch (error) { return handleProcessingError(error); }
}
