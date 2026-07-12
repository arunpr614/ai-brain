import type { NextRequest } from "next/server";
import { listProcessingBoardGroups } from "@/db/processing-queries";
import { boardGroupsQuerySchema, parseFilterParams } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingReadGate } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = processingReadGate(req); if (gate) return gate;
  try {
    const query = boardGroupsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    return processingJson(listProcessingBoardGroups({ ...query, filters: parseFilterParams(req.nextUrl.searchParams) }));
  } catch (error) { return handleProcessingError(error); }
}
