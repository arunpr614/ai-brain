import type { NextRequest } from "next/server";
import { z } from "zod";
import { claimNotebookLmExportRequest, NotebookLmExportError } from "@/db/notebooklm-export";
import { notebookLmExportProviderWriteEnabled } from "@/lib/notebooklm/flags";
import {
  NotebookLmHttpError,
  notebookLmConnectorAuthGate,
  notebookLmConnectorEmpty,
  notebookLmConnectorJson,
  notebookLmConnectorPreflight,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import { notebookLmClaimSchema } from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return notebookLmConnectorPreflight(req);
}

export async function POST(req: NextRequest) {
  const auth = notebookLmConnectorAuthGate(req);
  if (!auth.ok) return auth.response;
  try {
    notebookLmClaimSchema.parse(await readNotebookLmJson(req, 128));
    const claim = claimNotebookLmExportRequest({
      connector: auth.connector,
      allowCreate: notebookLmExportProviderWriteEnabled(),
    });
    if (!claim) return notebookLmConnectorEmpty(req, 204, { "Retry-After": "15" });
    return notebookLmConnectorJson(req, { claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return notebookLmConnectorJson(req, { error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof NotebookLmHttpError) {
      return notebookLmConnectorJson(req, { error: error.code }, { status: error.status });
    }
    if (error instanceof NotebookLmExportError) {
      return notebookLmConnectorJson(req, { error: error.code }, { status: 409 });
    }
    console.error("[notebooklm] normalized connector claim failure");
    return notebookLmConnectorJson(req, { error: "unavailable" }, { status: 503 });
  }
}
