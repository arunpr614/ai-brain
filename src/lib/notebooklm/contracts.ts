export const NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION = 1;
export const NOTEBOOKLM_MAPPER_VERSION = 1;
export const NOTEBOOKLM_PAYLOAD_MAX_BYTES = 200_000;
export const NOTEBOOKLM_PAYLOAD_MAX_WORDS = 50_000;
export const NOTEBOOKLM_PRE_CREATE_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;
export const NOTEBOOKLM_POST_DISPATCH_RETENTION_MS = 24 * 60 * 60 * 1_000;
export const NOTEBOOKLM_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
export const NOTEBOOKLM_ORPHAN_LEDGER_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;
export const NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS = 5 * 60 * 1_000;
export const NOTEBOOKLM_RETENTION_SWEEP_MS = 60 * 1_000;
export const NOTEBOOKLM_LEASE_MS = 2 * 60 * 1_000;
export const NOTEBOOKLM_MAX_PRECREATE_LEASES = 3;
export const NOTEBOOKLM_RETRY_BACKOFF_MS = 60 * 1_000;
export const NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS = 5 * 60 * 1_000;
export const NOTEBOOKLM_PAIRING_CODE_TTL_MS = 5 * 60 * 1_000;
export const NOTEBOOKLM_DEFAULT_SOURCE_LIMIT = 50;
export const NOTEBOOKLM_SOURCE_RESERVE = 5;
export const NOTEBOOKLM_MIN_SAFE_SOURCE_LIMIT =
  NOTEBOOKLM_DEFAULT_SOURCE_LIMIT - NOTEBOOKLM_SOURCE_RESERVE;
export const NOTEBOOKLM_MAX_SAFE_SOURCE_LIMIT = 259;
export const NOTEBOOKLM_MIN_SOURCE_LIMIT =
  NOTEBOOKLM_MIN_SAFE_SOURCE_LIMIT + NOTEBOOKLM_SOURCE_RESERVE;
export const NOTEBOOKLM_MAX_SOURCE_LIMIT =
  NOTEBOOKLM_MAX_SAFE_SOURCE_LIMIT + NOTEBOOKLM_SOURCE_RESERVE;
export const NOTEBOOKLM_CAPACITY_WARNING_SLOTS = 10;
export const NOTEBOOKLM_SAFE_TARGET_LABEL = "Private NotebookLM target";
export const NOTEBOOKLM_PUBLIC_URL = "https://notebooklm.google/";
export const NOTEBOOKLM_APP_ORIGIN = "https://notebooklm.google.com";

export const NOTEBOOKLM_REQUEST_STATES = [
  "queued",
  "leased",
  "sending",
  "processing",
  "succeeded",
  "authentication_attention",
  "reconciling",
  "reconciliation_required",
  "duplicate_conflict",
  "target_attention",
  "capacity_blocked",
  "retryable_failure",
  "provider_failed",
  "connector_update_required",
  "cancelled",
  "expired",
] as const;

export type NotebookLmRequestState = (typeof NOTEBOOKLM_REQUEST_STATES)[number];
export type NotebookLmRequestPhase = "pre_create" | "create" | "reconcile" | "poll" | "terminal";

export type NotebookLmConnectorEvent =
  | {
      type: "preflight_ok";
      sourceCount: number;
      sourceLimit: number;
      sharingPosture: "private";
    }
  | { type: "authentication_required"; phase: "pre_create" | "reconcile" | "poll" }
  | { type: "target_attention"; reason: "wrong_target" | "shared" | "public" | "unavailable" | "capacity_unknown" }
  | { type: "capacity_blocked"; sourceCount: number; sourceLimit: number }
  | { type: "dispatch_started" }
  | { type: "create_accepted"; sourceAlias: string; providerStatus: "processing" | "ready" }
  | { type: "create_uncertain"; reason: "network" | "timeout" | "rate_limited" | "server" | "protocol" }
  | {
      type: "reconcile_result";
      matches: 0 | 1 | 2;
      sourceAlias?: string;
      providerStatus?: "processing" | "ready" | "failed";
    }
  | { type: "source_status"; providerStatus: "processing" | "ready" | "failed" }
  | { type: "retryable_failure"; reason: "network" | "server" }
  | { type: "connector_update_required"; reason: "protocol_drift" };

export interface NotebookLmClaimDto {
  requestId: string;
  leaseToken: string;
  leaseEpoch: number;
  action: "create" | "reconcile" | "poll";
  target: {
    bindingVersion: number;
    localBindingFingerprint: string;
    sharingPolicy: "private_only";
    sourceLimit: number;
    reserveCount: number;
  };
  source: {
    marker: string;
    title: string | null;
    text: string | null;
    sourceAlias: string | null;
  };
  leaseExpiresAt: string;
  expiresAt: string;
}
