import type { NextRequest } from "next/server";
import { z } from "zod";
import { getItem } from "@/db/items";
import {
  cancelNotebookLmExportRequest,
  createNotebookLmExportRequest,
  getActiveNotebookLmTarget,
  getExactNotebookLmExportForItem,
  getNotebookLmExportByIdempotencyKey,
  getLatestNotebookLmExportForItem,
  getLatestSucceededNotebookLmExportForItem,
  getNotebookLmConnectionSummary,
  NotebookLmExportError,
  stopCheckingNotebookLmExportRequest,
} from "@/db/notebooklm-export";
import { getNotebookLmRuntimeControl } from "@/db/notebooklm-export-control";
import { NOTEBOOKLM_PUBLIC_URL } from "@/lib/notebooklm/contracts";
import {
  notebookLmExportProviderWriteEnabled,
  notebookLmExportQueueEnabled,
  notebookLmExportUiEnabled,
} from "@/lib/notebooklm/flags";
import { mapItemToNotebookLm, type NotebookLmMappingResult } from "@/lib/notebooklm/formatter";
import {
  NotebookLmHttpError,
  notebookLmJson,
  notebookLmSessionReadGate,
  notebookLmSessionWriteGate,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import { notebookLmRequestDto } from "@/lib/notebooklm/presentation";
import { recordNotebookLmOperationalEvent } from "@/lib/notebooklm/operations";
import {
  notebookLmExportCancelSchema,
  notebookLmExportCreateSchema,
} from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
const itemIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,96}$/);

export async function GET(req: NextRequest, context: Context) {
  const auth = notebookLmSessionReadGate(req);
  if (auth) return auth;
  if (!notebookLmExportUiEnabled()) {
    return notebookLmJson({ error: "not_found" }, { status: 404 });
  }
  try {
    const { id: rawId } = await context.params;
    const itemId = itemIdSchema.parse(rawId);
    const item = getItem(itemId);
    if (!item) return notebookLmJson({ error: "not_found" }, { status: 404 });
    const lookupKey = req.headers.get("x-notebooklm-idempotency-key");
    if (lookupKey && !idempotencyKeySchema.safeParse(lookupKey).success) {
      return notebookLmJson({ error: "invalid_request" }, { status: 400 });
    }
    const correlated = lookupKey ? getNotebookLmExportByIdempotencyKey(lookupKey) : null;
    return notebookLmJson(
      buildStatus(item, correlated?.item_id === item.id ? correlated : null, Boolean(lookupKey)),
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest, context: Context) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  try {
    const { id: rawId } = await context.params;
    const itemId = itemIdSchema.parse(rawId);
    const item = getItem(itemId);
    if (!item) return notebookLmJson({ error: "not_found" }, { status: 404 });
    const body = notebookLmExportCreateSchema.parse(await readNotebookLmJson(req, 512));
    const replay = getNotebookLmExportByIdempotencyKey(body.idempotencyKey);
    const mapped = mapItemToNotebookLm(item, {
      confirmLimitedCapture: body.confirmLimitedCapture || replay?.limited_capture === 1,
    });
    if (!mapped.ok) return mappingFailure(mapped);
    if (!notebookLmExportQueueEnabled()) {
      if (replay) {
        const accepted = createNotebookLmExportRequest({
          itemId,
          idempotencyKey: body.idempotencyKey,
          sourceKind: mapped.sourceKind,
          sourceUrl: mapped.safeSourceUrl,
          mappedTitle: mapped.title,
          mappedText: mapped.text,
          contentHash: mapped.contentHash,
          payloadBytes: mapped.bytes,
          payloadWords: mapped.words,
          limitedCapture: mapped.limitedCapture,
          confirmUpdatedVersion: body.confirmUpdatedVersion,
        });
        return notebookLmJson(
          {
            accepted: true,
            deduplicated: true,
            request: notebookLmRequestDto(accepted.request),
          },
          { status: 202 },
        );
      }
      return notebookLmJson({ error: "export_queue_disabled" }, { status: 503 });
    }
    const accepted = createNotebookLmExportRequest({
      itemId,
      idempotencyKey: body.idempotencyKey,
      sourceKind: mapped.sourceKind,
      sourceUrl: mapped.safeSourceUrl,
      mappedTitle: mapped.title,
      mappedText: mapped.text,
      contentHash: mapped.contentHash,
      payloadBytes: mapped.bytes,
      payloadWords: mapped.words,
      limitedCapture: mapped.limitedCapture,
      confirmUpdatedVersion: body.confirmUpdatedVersion,
    });
    return notebookLmJson(
      {
        accepted: true,
        deduplicated: accepted.deduplicated,
        request: notebookLmRequestDto(accepted.request),
      },
      { status: 202 },
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  if (!notebookLmExportUiEnabled()) {
    return notebookLmJson({ error: "not_found" }, { status: 404 });
  }
  try {
    const { id: rawId } = await context.params;
    const itemId = itemIdSchema.parse(rawId);
    z.object({ event: z.literal("export_viewed") })
      .strict()
      .parse(await readNotebookLmJson(req, 128));
    if (!getItem(itemId)) return notebookLmJson({ error: "not_found" }, { status: 404 });
    recordNotebookLmOperationalEvent({ eventType: "notebooklm.export_viewed" });
    return notebookLmJson({ recorded: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  try {
    const { id: rawId } = await context.params;
    const itemId = itemIdSchema.parse(rawId);
    if (!getItem(itemId)) return notebookLmJson({ error: "not_found" }, { status: 404 });
    const body = notebookLmExportCancelSchema.parse(await readNotebookLmJson(req, 256));
    const request =
      body.mode === "cancel"
        ? cancelNotebookLmExportRequest({ requestId: body.requestId, itemId })
        : stopCheckingNotebookLmExportRequest({
            requestId: body.requestId,
            itemId,
            acknowledgeSourceMayExist: body.acknowledgeSourceMayExist,
          });
    return notebookLmJson({
      cancelled: body.mode === "cancel",
      checkingStopped: body.mode === "stop_checking",
      request: notebookLmRequestDto(request),
    });
  } catch (error) {
    return handleError(error);
  }
}

function buildStatus(
  item: NonNullable<ReturnType<typeof getItem>>,
  correlatedRequest: ReturnType<typeof getNotebookLmExportByIdempotencyKey> = null,
  correlationRequested = false,
) {
  const connection = getNotebookLmConnectionSummary();
  const runtime = getNotebookLmRuntimeControl();
  const target = getActiveNotebookLmTarget();
  const firstMapping = mapItemToNotebookLm(item);
  const mapping =
    !firstMapping.ok && firstMapping.reason === "limited_confirmation_required"
      ? mapItemToNotebookLm(item, { confirmLimitedCapture: true })
      : firstMapping;
  const latest = target
    ? getLatestNotebookLmExportForItem(item.id, target.id, target.binding_version)
    : null;
  const exact =
    mapping.ok && target
      ? getExactNotebookLmExportForItem({
          itemId: item.id,
          targetId: target.id,
          bindingVersion: target.binding_version,
          contentHash: mapping.contentHash,
        })
      : null;
  const latestSucceeded =
    target === null
      ? null
      : getLatestSucceededNotebookLmExportForItem(
          item.id,
          target.id,
          target.binding_version,
        );
  return {
    feature: {
      queueAccepting: notebookLmExportQueueEnabled(),
      providerWritesEnabled: notebookLmExportProviderWriteEnabled(),
      experimental: true,
      runtimeWriteBlocked: runtime.provider_write_blocked === 1,
      runtimeBlockReason: runtime.block_reason,
    },
    destination: {
      configured: connection.configured,
      label: connection.targetLabel,
      sharingPosture: connection.sharingPosture,
      healthStatus: connection.healthStatus,
      healthReason: connection.healthReason,
      safeSlots: connection.safeSlots,
      connectorOnline: connection.connectorOnline,
      lastCheckedAt:
        connection.targetVerifiedAt === null
          ? null
          : new Date(connection.targetVerifiedAt).toISOString(),
    },
    item: {
      eligible: mapping.ok,
      exportKind: mapping.ok ? mapping.sourceKind : null,
      ineligibleReason: mapping.ok ? null : mapping.reason,
      requiresLimitedConfirmation:
        !firstMapping.ok && firstMapping.reason === "limited_confirmation_required",
      changedContent:
        Boolean(mapping.ok && latestSucceeded && latestSucceeded.content_hash !== mapping.contentHash),
      alreadyExported: Boolean(exact?.state === "succeeded"),
      requestMatchesCurrentVersion: Boolean(exact && latest && exact.id === latest.id),
      hasUnresolvedDifferentVersion: Boolean(
        latest && latest.phase !== "terminal" && (!exact || exact.id !== latest.id),
      ),
    },
    request: correlatedRequest
      ? notebookLmRequestDto(correlatedRequest)
      : latest
        ? notebookLmRequestDto(latest)
        : null,
    idempotencyAcknowledgement: correlationRequested
      ? correlatedRequest
        ? "accepted"
        : "absent"
      : null,
    setupPath: "/settings/notebooklm-export",
    notebookLmUrl: NOTEBOOKLM_PUBLIC_URL,
    disclosure:
      mapping.ok && mapping.sourceKind === "url"
        ? "Adds the saved source URL to NotebookLM. NotebookLM imports and processes that link."
        : "Sends a static copy of the saved text. Changes do not sync automatically.",
  };
}

function mappingFailure(result: Exclude<NotebookLmMappingResult, { ok: true }>) {
  const status = result.reason === "payload_too_large" ? 413 : 422;
  return notebookLmJson(
    {
      error: result.reason,
      ...(result.bytes === undefined ? {} : { bytes: result.bytes }),
      ...(result.words === undefined ? {} : { words: result.words }),
    },
    { status },
  );
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return notebookLmJson({ error: "invalid_request" }, { status: 400 });
  }
  if (error instanceof NotebookLmHttpError) {
    return notebookLmJson({ error: error.code }, { status: error.status });
  }
  if (error instanceof NotebookLmExportError) {
    const status =
      error.code === "request_not_found" ? 404 :
      error.code === "marker_secret_unavailable" ||
      error.code === "connector_not_configured" ||
      error.code === "runtime_write_blocked" ? 503 :
      409;
    return notebookLmJson({ error: error.code }, { status });
  }
  if (error instanceof Error && error.message.includes("database is locked")) {
    return notebookLmJson({ error: "temporarily_unavailable" }, { status: 503 });
  }
  console.error("[notebooklm] normalized item export failure");
  return notebookLmJson({ error: "export_unavailable" }, { status: 503 });
}
