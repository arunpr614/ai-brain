import type { NotebookLmExportRequestRow } from "@/db/notebooklm-export";

export type NotebookLmUserState =
  | "queued"
  | "sending"
  | "processing"
  | "ready"
  | "authentication_attention"
  | "reconciling"
  | "reconciliation_required"
  | "conflict"
  | "target_attention"
  | "capacity_blocked"
  | "retryable_failure"
  | "processing_failed"
  | "connector_update_required"
  | "cancelled"
  | "expired";

export interface NotebookLmRequestDto {
  requestId: string;
  state: NotebookLmUserState;
  phase: NotebookLmExportRequestRow["phase"];
  reason: string | null;
  canCancel: boolean;
  canStopChecking: boolean;
  possiblyDelivered: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export function notebookLmRequestDto(row: NotebookLmExportRequestRow): NotebookLmRequestDto {
  const state: NotebookLmUserState = (() => {
    switch (row.state) {
      case "leased": {
        switch (row.phase) {
          case "pre_create": return "queued";
          case "create": return "sending";
          case "reconcile": return "reconciling";
          case "poll": return "processing";
          default: return "connector_update_required";
        }
      }
      case "sending": return "sending";
      case "succeeded": return "ready";
      case "duplicate_conflict": return "conflict";
      case "provider_failed": return "processing_failed";
      default: return row.state;
    }
  })();
  return {
    requestId: row.id,
    state,
    phase: row.phase,
    reason: row.safe_reason,
    canCancel:
      row.phase === "pre_create" &&
      row.create_dispatched_at === null &&
      row.completed_at === null,
    canStopChecking: row.create_dispatched_at !== null && row.phase !== "terminal",
    possiblyDelivered: row.create_dispatched_at !== null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    completedAt: row.completed_at === null ? null : new Date(row.completed_at).toISOString(),
  };
}
