import type { NextRequest } from "next/server";
import { z } from "zod";
import { bindNotebookLmTarget, NotebookLmExportError } from "@/db/notebooklm-export";
import { notebookLmExportUiEnabled } from "@/lib/notebooklm/flags";
import {
  NotebookLmHttpError,
  notebookLmConnectorAuthGate,
  notebookLmConnectorJson,
  notebookLmConnectorPreflight,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import { notebookLmBindSchema } from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS(req: NextRequest) {
  return notebookLmConnectorPreflight(req);
}

export async function POST(req: NextRequest) {
  const auth = notebookLmConnectorAuthGate(req);
  if (!auth.ok) return auth.response;
  if (!notebookLmExportUiEnabled()) {
    return notebookLmConnectorJson(req, { error: "feature_disabled" }, { status: 503 });
  }
  try {
    const body = notebookLmBindSchema.parse(await readNotebookLmJson(req));
    const target = bindNotebookLmTarget({
      connector: auth.connector,
      observedBindingVersion: body.bindingVersion,
      safeLabel: body.safeLabel,
      localBindingFingerprint: body.localBindingFingerprint,
      subjectFingerprint: body.subjectFingerprint,
      sharingPosture: body.sharingPosture,
      sourceCount: body.sourceCount,
      sourceLimit: body.sourceLimit,
      reserveCount: body.reserveCount,
    });
    return notebookLmConnectorJson(req, {
      bound: true,
      target: {
        bindingVersion: target.binding_version,
        safeLabel: target.safe_label,
        sharingPosture: target.sharing_posture,
        safeSlots: Math.max(
          0,
          target.source_limit - target.reserve_count - (target.source_count ?? target.source_limit),
        ),
        verifiedAt: new Date(target.verified_at!).toISOString(),
      },
    });
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
    console.error("[notebooklm] normalized connector bind failure");
    return notebookLmConnectorJson(req, { error: "unavailable" }, { status: 503 });
  }
}
