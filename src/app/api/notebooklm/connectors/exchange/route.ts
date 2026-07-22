import type { NextRequest } from "next/server";
import { z } from "zod";
import { exchangeConnectorPairingCode } from "@/lib/notebooklm/connector-auth";
import { notebookLmExportUiEnabled } from "@/lib/notebooklm/flags";
import {
  NotebookLmHttpError,
  notebookLmConnectorJson,
  notebookLmConnectorPreflight,
  notebookLmPairingExchangeAllowed,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import { notebookLmPairingExchangeSchema } from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return notebookLmConnectorPreflight(req);
}

export async function POST(req: NextRequest) {
  if (!notebookLmExportUiEnabled()) {
    return notebookLmConnectorJson(req, { error: "feature_disabled" }, { status: 503 });
  }
  if (!notebookLmPairingExchangeAllowed(req)) {
    return notebookLmConnectorJson(
      req,
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  try {
    const body = notebookLmPairingExchangeSchema.parse(await readNotebookLmJson(req, 512));
    const result = exchangeConnectorPairingCode({
      code: body.code,
      origin: req.headers.get("origin"),
      label: body.label,
      protocolVersion: body.protocolVersion,
    });
    if (!result.ok) {
      const status =
        result.reason === "rate_limited" ? 429 :
        result.reason === "expired_code" || result.reason === "used_code" ? 410 :
        result.reason === "unavailable" ? 503 :
        result.reason === "invalid_origin" ? 403 : 400;
      return notebookLmConnectorJson(req, { error: result.reason }, { status });
    }
    return notebookLmConnectorJson(req, result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return notebookLmConnectorJson(req, { error: "invalid_request" }, { status: 400 });
    }
    if (error instanceof NotebookLmHttpError) {
      return notebookLmConnectorJson(req, { error: error.code }, { status: error.status });
    }
    console.error("[notebooklm] normalized connector exchange failure");
    return notebookLmConnectorJson(req, { error: "unavailable" }, { status: 503 });
  }
}
