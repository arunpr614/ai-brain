import type { NextRequest } from "next/server";
import { getMutationOutcome } from "@/db/item-workflow";
import { actorTabIdSchema, itemIdSchema, mutationIdSchema } from "@/lib/processing/contracts";
import { handleProcessingError, processingJson, processingReadGate } from "@/lib/processing/http";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ mutationId: string }> };

export async function GET(req: NextRequest, context: Context) {
  const gate = processingReadGate(req); if (gate) return gate;
  try {
    const { mutationId } = await context.params;
    const query = z.object({ itemId: itemIdSchema, actorTabId: actorTabIdSchema }).parse(Object.fromEntries(req.nextUrl.searchParams));
    const outcome = getMutationOutcome(mutationIdSchema.parse(mutationId), query.itemId, query.actorTabId);
    return outcome ? processingJson(outcome) : processingJson({ error: "not_found" }, { status: 404 });
  } catch (error) { return handleProcessingError(error); }
}
