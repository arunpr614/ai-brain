import type { NextRequest } from "next/server";
import { getWorkflowProjection, mutateWorkflow } from "@/db/item-workflow";
import { itemIdSchema, workflowMutationSchema, workflowSurfaceSchema } from "@/lib/processing/contracts";
import { handleProcessingError, mutationStatus, processingJson, processingReadGate, processingWriteGate, readBoundedJson } from "@/lib/processing/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Context) {
  const gate = processingReadGate(req); if (gate) return gate;
  try {
    const { id: rawId } = await context.params;
    const item = getWorkflowProjection(itemIdSchema.parse(rawId));
    return item ? processingJson({ item }) : processingJson({ error: "not_found" }, { status: 404 });
  } catch (error) { return handleProcessingError(error); }
}

export async function PATCH(req: NextRequest, context: Context) {
  const gate = processingWriteGate(req); if (gate) return gate;
  try {
    const { id: rawId } = await context.params;
    const id = itemIdSchema.parse(rawId);
    const body = workflowMutationSchema.parse(await readBoundedJson(req));
    const result = mutateWorkflow(id, body, workflowSurfaceSchema.parse(req.nextUrl.searchParams.get("surface") ?? "detail"));
    return processingJson(result, { status: mutationStatus(result) });
  } catch (error) { return handleProcessingError(error); }
}
