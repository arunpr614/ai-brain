import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  getNotebookLmConnectionSummary,
  NotebookLmExportError,
  revokeActiveNotebookLmConnector,
} from "@/db/notebooklm-export";
import {
  clearNotebookLmProtocolWriteBlock,
  getNotebookLmRetentionOperationalStatus,
  getNotebookLmRuntimeControl,
  NotebookLmRuntimeControlError,
} from "@/db/notebooklm-export-control";
import { createConnectorPairingCode } from "@/lib/notebooklm/connector-auth";
import {
  notebookLmExportProviderWriteEnabled,
  notebookLmExportQueueEnabled,
  notebookLmExportUiEnabled,
} from "@/lib/notebooklm/flags";
import {
  NotebookLmHttpError,
  notebookLmJson,
  notebookLmSessionReadGate,
  notebookLmSessionWriteGate,
  readNotebookLmJson,
} from "@/lib/notebooklm/http";
import {
  notebookLmEnrollmentCodeSchema,
  notebookLmDisconnectSchema,
  notebookLmRuntimeResetSchema,
} from "@/lib/notebooklm/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = notebookLmSessionReadGate(req);
  if (auth) return auth;
  if (!notebookLmExportUiEnabled()) {
    return notebookLmJson({ error: "not_found" }, { status: 404 });
  }
  return notebookLmJson(settingsStatus());
}

export async function POST(req: NextRequest) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  if (!notebookLmExportUiEnabled()) {
    return notebookLmJson({ error: "not_found" }, { status: 404 });
  }
  try {
    const body = notebookLmEnrollmentCodeSchema.parse(await readNotebookLmJson(req, 256));
    const pairing = createConnectorPairingCode({ label: body.label });
    return notebookLmJson({
      code: pairing.code,
      expiresAt: new Date(pairing.expiresAt).toISOString(),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  try {
    const body = req.body
      ? notebookLmDisconnectSchema.parse(await readNotebookLmJson(req, 256))
      : ({ mode: "safe_disconnect" } as const);
    const emergency = body.mode === "emergency_revoke";
    const disconnected = revokeActiveNotebookLmConnector({ emergency });
    return notebookLmJson({ disconnected, emergency, status: settingsStatus() });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = notebookLmSessionWriteGate(req);
  if (auth) return auth;
  try {
    const body = notebookLmRuntimeResetSchema.parse(await readNotebookLmJson(req, 256));
    const control = clearNotebookLmProtocolWriteBlock({
      acknowledgeConnectorUpdatedAndTargetRevalidated:
        body.acknowledgeConnectorUpdatedAndTargetRevalidated,
    });
    return notebookLmJson({
      cleared: control.provider_write_blocked === 0,
      status: settingsStatus(),
    });
  } catch (error) {
    return handleError(error);
  }
}

function settingsStatus() {
  const connection = getNotebookLmConnectionSummary();
  const runtime = getNotebookLmRuntimeControl();
  const retention = getNotebookLmRetentionOperationalStatus();
  return {
    feature: {
      queueAccepting: notebookLmExportQueueEnabled(),
      providerWritesEnabled: notebookLmExportProviderWriteEnabled(),
      experimental: true,
      runtimeWriteBlocked: runtime.provider_write_blocked === 1,
      runtimeBlockReason: runtime.block_reason,
      protocolFailureStreak: runtime.protocol_failure_streak,
      retentionHealthy: retention.healthy,
      retentionLastSuccessAt:
        retention.lastSuccessAt === null
          ? null
          : new Date(retention.lastSuccessAt).toISOString(),
      retentionLastFailureAt:
        retention.lastFailureAt === null
          ? null
          : new Date(retention.lastFailureAt).toISOString(),
      retentionFailureStreak: retention.failureStreak,
      retentionErrorCode: retention.lastErrorCode,
      physicalPurgePending: retention.physicalPurgePending,
      overdueSnapshots: retention.overdueSnapshots,
      unresolvedOver24h: retention.unresolvedOver24h,
    },
    connection: {
      configured: connection.configured,
      targetLabel: connection.targetLabel,
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
  };
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return notebookLmJson({ error: "invalid_request" }, { status: 400 });
  }
  if (error instanceof NotebookLmHttpError) {
    return notebookLmJson({ error: error.code }, { status: error.status });
  }
  if (error instanceof NotebookLmExportError) {
    return notebookLmJson({ error: error.code }, { status: 409 });
  }
  if (error instanceof NotebookLmRuntimeControlError) {
    return notebookLmJson({ error: error.code }, { status: 409 });
  }
  console.error("[notebooklm] normalized settings failure");
  return notebookLmJson({ error: "unavailable" }, { status: 503 });
}
