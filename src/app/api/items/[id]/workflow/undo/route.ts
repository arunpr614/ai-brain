import type { NextRequest } from "next/server";
import { undoWorkflow } from "@/db/item-workflow";
import { itemIdSchema, workflowSurfaceSchema, workflowUndoSchema } from "@/lib/processing/contracts";
import { handleProcessingError, mutationStatus, processingJson, processingWriteGate, readBoundedJson } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Context) {
  const gate = processingWriteGate(req); if (gate) return gate;
  try {
    const { id: rawId } = await context.params;
    const id = itemIdSchema.parse(rawId);
    const body = workflowUndoSchema.parse(await readBoundedJson(req));
    const result = undoWorkflow(id, body, workflowSurfaceSchema.parse(req.nextUrl.searchParams.get("surface") ?? "detail"));
    return processingJson(result, { status: mutationStatus(result) });
  } catch (error) { return handleProcessingError(error); }
}
