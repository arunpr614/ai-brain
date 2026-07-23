import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { NotebookLmConnectorSetup } from "@/components/notebooklm-connector-setup";
import { getNotebookLmConnectionSummary } from "@/db/notebooklm-export";
import {
  getNotebookLmExportMasterPreference,
  getNotebookLmExportQueuePreference,
  getNotebookLmProviderWritesPreference,
  getNotebookLmRetentionOperationalStatus,
  getNotebookLmRuntimeControl,
} from "@/db/notebooklm-export-control";
import { verifySessionCookie } from "@/lib/auth";
import {
  notebookLmExportProviderWriteEnabled,
  notebookLmExportMasterControlAvailable,
  notebookLmExportMasterEnabled,
  notebookLmExportQueueControlAvailable,
  notebookLmExportQueueEnabled,
  notebookLmExportUiEnabled,
  notebookLmProviderWriteRolloutEnabled,
} from "@/lib/notebooklm/flags";

export const dynamic = "force-dynamic";

export default async function NotebookLmExportSettingsPage() {
  const cookieStore = await cookies();
  if (!verifySessionCookie(cookieStore)) {
    redirect("/unlock?next=/settings/notebooklm-export");
  }
  if (!notebookLmExportUiEnabled()) notFound();

  const connection = getNotebookLmConnectionSummary();
  const runtimeControl = getNotebookLmRuntimeControl();
  const retention = getNotebookLmRetentionOperationalStatus();
  return (
    <main className="mx-auto max-w-[820px] px-4 py-10 sm:px-8">
      <Link
        href="/settings"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:min-h-0"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Settings
      </Link>
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Local Chrome connector</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
          Export to NotebookLM
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Bind one fixed private consumer NotebookLM notebook. Each export deliberately adds the saved source URL when one is available, or a static text source for a note; it is not synchronization.
        </p>
      </div>
      <NotebookLmConnectorSetup
        initialStatus={{
          feature: {
            queueAccepting: notebookLmExportQueueEnabled(),
            queueRequested: getNotebookLmExportQueuePreference(),
            queueAvailable: notebookLmExportQueueControlAvailable(),
            masterEnabled: notebookLmExportMasterEnabled(),
            masterRequested: getNotebookLmExportMasterPreference(),
            masterAvailable: notebookLmExportMasterControlAvailable(),
            providerWritesEnabled: notebookLmExportProviderWriteEnabled(),
            providerWritesRequested: getNotebookLmProviderWritesPreference(),
            providerWritesAvailable: notebookLmProviderWriteRolloutEnabled(),
            experimental: true,
            runtimeWriteBlocked: runtimeControl.provider_write_blocked === 1,
            runtimeBlockReason: runtimeControl.block_reason,
            protocolFailureStreak: runtimeControl.protocol_failure_streak,
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
            safeSourceLimit: connection.safeSourceLimit,
            reserveCount: connection.reserveCount,
            safeSlots: connection.safeSlots,
            connectorOnline: connection.connectorOnline,
            lastCheckedAt:
              connection.targetVerifiedAt === null
                ? null
                : new Date(connection.targetVerifiedAt).toISOString(),
          },
        }}
      />
    </main>
  );
}
