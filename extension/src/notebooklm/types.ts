export const CONNECTOR_PROTOCOL_VERSION = 2 as const;
export const BRAIN_PERMISSION = "https://brain.arunp.in/*" as const;
export const NOTEBOOKLM_PERMISSION = "https://notebooklm.google.com/*" as const;
export const NOTEBOOKLM_PUBLIC_LOGIN_URL = "https://notebooklm.google/" as const;
export const DEFAULT_SOURCE_LIMIT = 50;
export const DEFAULT_SOURCE_RESERVE = 5;
export const DEFAULT_SAFE_SOURCE_LIMIT =
  DEFAULT_SOURCE_LIMIT - DEFAULT_SOURCE_RESERVE;
export const MIN_SAFE_SOURCE_LIMIT = DEFAULT_SAFE_SOURCE_LIMIT;
export const MAX_SAFE_SOURCE_LIMIT = 259;
export const MIN_SOURCE_LIMIT =
  MIN_SAFE_SOURCE_LIMIT + DEFAULT_SOURCE_RESERVE;
export const MAX_SOURCE_LIMIT =
  MAX_SAFE_SOURCE_LIMIT + DEFAULT_SOURCE_RESERVE;
export const BRAIN_SAFE_TARGET_LABEL = "Private NotebookLM target";

export function isSupportedSafeSourceLimit(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= MIN_SAFE_SOURCE_LIMIT &&
    Number(value) <= MAX_SAFE_SOURCE_LIMIT
  );
}

export function isSupportedSourceLimit(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    Number(value) >= MIN_SOURCE_LIMIT &&
    Number(value) <= MAX_SOURCE_LIMIT
  );
}

export type ConnectorCredential = {
  connectorId: string;
  token: string;
  protocolVersion: 2;
  pairedAt: number;
};

export type LocalBinding = {
  connectorId: string;
  bindingVersion: number;
  notebookId: string;
  authUser: number | null;
  targetUrl: string;
  localBindingFingerprint: string;
  subjectFingerprint: string;
  safeLabel: string;
  sourceLimit: number;
  reserveCount: number;
  verifiedAt: number;
};

export type SourceStatus = "processing" | "ready" | "failed";

export type ProviderSource = {
  id: string;
  title: string | null;
  url: string | null;
  status: SourceStatus;
};

export type TargetInspection = {
  notebookId: string;
  safeLabel: string;
  subjectFingerprint: string;
  sharingPosture: "private";
  sourceCount: number;
  sources: ProviderSource[];
};

export type NotebookLmClaim = {
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
    kind: "url" | "copied_text";
    marker: string;
    title: string | null;
    text: string | null;
    url: string | null;
    urlHash: string | null;
    sourceAlias: string | null;
  };
  leaseExpiresAt: string;
  expiresAt: string;
};

export type ConnectorEvent =
  | {
      type: "preflight_ok";
      sourceCount: number;
      sourceLimit: number;
      sharingPosture: "private";
    }
  | { type: "authentication_required"; phase: "pre_create" | "reconcile" | "poll" }
  | {
      type: "target_attention";
      reason: "wrong_target" | "shared" | "public" | "unavailable" | "capacity_unknown";
    }
  | { type: "capacity_blocked"; sourceCount: number; sourceLimit: number }
  | { type: "dispatch_started" }
  | { type: "create_accepted"; sourceAlias: string; providerStatus: "processing" | "ready" }
  | {
      type: "create_uncertain";
      reason: "network" | "timeout" | "rate_limited" | "server" | "protocol";
    }
  | {
      type: "reconcile_result";
      matches: 0 | 1 | 2;
      sourceAlias?: string;
      providerStatus?: "processing" | "ready" | "failed";
    }
  | { type: "source_status"; providerStatus: "processing" | "ready" | "failed" }
  | { type: "retryable_failure"; reason: "network" | "server" }
  | { type: "connector_update_required"; reason: "protocol_drift" };

export type DeliveryJournalEntry = {
  requestId: string;
  targetFingerprint: string;
  marker: string;
  phase: "possibly_delivered" | "accepted";
  sourceId?: string;
  sourceAlias?: string;
  providerStatus?: "processing" | "ready";
  createdAt: number;
  updatedAt: number;
};

export type LocalSourceReference = {
  sourceId: string;
  targetFingerprint: string;
  marker: string;
  updatedAt: number;
};

export type WorkerStatus = {
  state: "idle" | "working" | "attention" | "error";
  detail: string;
  updatedAt: number;
  lastRequestId?: string;
};
