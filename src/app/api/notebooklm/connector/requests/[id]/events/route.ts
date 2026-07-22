import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyNotebookLmConnectorEvent, NotebookLmExportError } from "@/db/notebooklm-export";
import { notebookLmExportProviderWriteEnabled } from "@/lib/notebooklm/flags";
import {
  NotebookLmHttpError,
  notebookLmConnectorAuthGate,
  notebookLmConnectorJson,
  notebookLmConnectorPreflight,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import { notebookLmRequestDto } from "@/lib/notebooklm/presentation";
import { notebookLmConnectorEventEnvelopeSchema } from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const requestIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

export function OPTIONS(req: NextRequest) {
  return notebookLmConnectorPreflight(req);
}

export async function POST(req: NextRequest, context: Context) {
  const auth = notebookLmConnectorAuthGate(req);
  if (!auth.ok) return auth.response;
  try {
    const { id: rawId } = await context.params;
    const requestId = requestIdSchema.parse(rawId);
    const body = notebookLmConnectorEventEnvelopeSchema.parse(
      await readNotebookLmJson(req, 2_048),
    );
    const providerWritesEnabled = notebookLmExportProviderWriteEnabled();
    if (body.event.type === "dispatch_started" && !providerWritesEnabled) {
      return notebookLmConnectorJson(
        req,
        { error: "provider_writes_disabled" },
        { status: 503 },
      );
    }
    const request = applyNotebookLmConnectorEvent({
      connector: auth.connector,
      requestId,
      leaseToken: body.leaseToken,
      leaseEpoch: body.leaseEpoch,
      event: body.event,
      allowProviderWrite: providerWritesEnabled,
    });
    return notebookLmConnectorJson(req, {
      accepted: true,
      dispatchAuthorized: body.event.type === "dispatch_started",
      request: notebookLmRequestDto(request),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return notebookLmConnectorJson(req, { error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof NotebookLmHttpError) {
      return notebookLmConnectorJson(req, { error: error.code }, { status: error.status });
    }
    if (error instanceof NotebookLmExportError) {
      const status =
        error.code === "request_not_found"
          ? 404
          : error.code === "runtime_write_blocked"
            ? 503
            : 409;
      return notebookLmConnectorJson(req, { error: error.code }, { status });
    }
    console.error("[notebooklm] normalized connector event failure");
    return notebookLmConnectorJson(req, { error: "unavailable" }, { status: 503 });
  }
}
