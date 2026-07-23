import type { ItemRow } from "@/db/client";
import {
  insertCapturePolicyDecision,
  type CapturePolicyDecisionRow,
  type TranscriptAcquisitionMethod,
  type TranscriptEnvironment,
  type TranscriptPolicyPlatform,
  type TranscriptRetentionClass,
  type TranscriptRightsBasis,
} from "@/db/transcripts";
import {
  classifyDeployment,
  type DeploymentClassification,
} from "@/lib/runtime/deployment";

export type AllowedTranscriptAcquisition = {
  readonly __brand: "AllowedTranscriptAcquisition";
  readonly policyDecisionId: string;
  readonly itemId: string | null;
  readonly sourceUrl: string;
  readonly platform: TranscriptPolicyPlatform;
  readonly environment: TranscriptEnvironment;
  readonly method: TranscriptAcquisitionMethod;
  readonly retentionClass: TranscriptRetentionClass;
  readonly legalApprovalId: string | null;
};

export type TranscriptPolicyResult =
  | {
      status: "allowed";
      decision: CapturePolicyDecisionRow;
      allowed: AllowedTranscriptAcquisition;
    }
  | {
      status: "blocked";
      decision: CapturePolicyDecisionRow;
      blockedReason: string;
    };

export type OfficialYoutubeCaptionRightsBasis =
  | "owned_youtube_channel"
  | "authorized_youtube_video";

export interface DecideTranscriptAcquisitionInput {
  itemId?: string | null;
  sourceUrl: string;
  platform: TranscriptPolicyPlatform;
  /** Deprecated compatibility input; never used as deployment authority. */
  environment?: TranscriptEnvironment;
  rightsBasis: TranscriptRightsBasis;
  method: TranscriptAcquisitionMethod;
  retentionClass: TranscriptRetentionClass;
  legalApprovalId?: string | null;
}

export function currentTranscriptEnvironment(): TranscriptEnvironment {
  const deployment = classifyDeployment();
  if (deployment.explicitProduction) return "production";
  if (
    deployment.configurationState === "valid" &&
    deployment.effectiveDeployment !== "unknown"
  ) {
    return deployment.effectiveDeployment;
  }

  // Compatibility fallback for ordinary schema-026 transcript methods. A
  // legacy lab marker never wins over an actual production runtime.
  if (process.env.NODE_ENV === "production") return "production";
  if (process.env.BRAIN_TRANSCRIPT_ENV === "lab") return "lab";
  if (process.env.NODE_ENV === "test") return "test";
  return "development";
}

export function isYoutubeItem(item: ItemRow): boolean {
  return (
    item.source_type === "youtube" ||
    item.source_platform === "youtube" ||
    item.source_platform === "youtube_short"
  );
}

export function decideTranscriptAcquisition(
  input: DecideTranscriptAcquisitionInput,
): TranscriptPolicyResult {
  const deployment = classifyDeployment();
  const environment = input.method === "lab_public_caption"
    ? restrictedTranscriptEnvironment(deployment)
    : currentTranscriptEnvironment();
  const blockedReason = blockedReasonFor({
    deployment,
    method: input.method,
    retentionClass: input.retentionClass,
    legalApprovalId: input.legalApprovalId ?? null,
  });

  const productionAllowed =
    !blockedReason && input.method !== "lab_public_caption";

  const decision = insertCapturePolicyDecision({
    item_id: input.itemId ?? null,
    source_url: input.sourceUrl,
    platform: input.platform,
    environment,
    rights_basis: blockedReason ? "blocked_unknown_rights" : input.rightsBasis,
    method: input.method,
    retention_class: input.retentionClass,
    blocked_reason: blockedReason,
    production_allowed: productionAllowed,
    legal_approval_id: input.legalApprovalId ?? null,
  });

  if (blockedReason) {
    return {
      status: "blocked",
      decision,
      blockedReason,
    };
  }

  return {
    status: "allowed",
    decision,
    allowed: {
      __brand: "AllowedTranscriptAcquisition",
      policyDecisionId: decision.id,
      itemId: input.itemId ?? null,
      sourceUrl: input.sourceUrl,
      platform: input.platform,
      environment,
      method: input.method,
      retentionClass: input.retentionClass,
      legalApprovalId: input.legalApprovalId ?? null,
    },
  };
}

export function allowUserProvidedTranscriptForItem(
  item: ItemRow,
): TranscriptPolicyResult {
  return decideTranscriptAcquisition({
    itemId: item.id,
    sourceUrl: item.source_url ?? `brain:item:${item.id}`,
    platform: "youtube",
    rightsBasis: "user_provided_transcript",
    method: "user_paste",
    retentionClass: "full_text_allowed",
  });
}

export function allowUploadedTranscriptFileForItem(
  item: ItemRow,
): TranscriptPolicyResult {
  return decideTranscriptAcquisition({
    itemId: item.id,
    sourceUrl: item.source_url ?? `brain:item:${item.id}`,
    platform: "youtube",
    rightsBasis: "user_provided_transcript",
    method: "uploaded_file",
    retentionClass: "full_text_allowed",
  });
}

export function allowOfficialYoutubeCaptionForItem(
  item: ItemRow,
  rightsBasis: OfficialYoutubeCaptionRightsBasis,
): TranscriptPolicyResult {
  return decideTranscriptAcquisition({
    itemId: item.id,
    sourceUrl: item.source_url ?? `brain:item:${item.id}`,
    platform: "youtube",
    rightsBasis,
    method: "youtube_official_caption",
    retentionClass: "full_text_allowed",
  });
}

export function allowOwnedMediaSttForItem(item: ItemRow): TranscriptPolicyResult {
  return decideTranscriptAcquisition({
    itemId: item.id,
    sourceUrl: item.source_url ?? `brain:item:${item.id}`,
    platform: "youtube",
    rightsBasis: "owned_uploaded_media",
    method: "owned_media_stt",
    retentionClass: "full_text_allowed",
  });
}

function blockedReasonFor(input: {
  deployment: DeploymentClassification;
  method: TranscriptAcquisitionMethod;
  retentionClass: TranscriptRetentionClass;
  legalApprovalId: string | null;
}): string | null {
  if (input.method === "lab_public_caption") {
    switch (input.deployment.restrictedCapability) {
      case "denied_production":
        return "lab_public_caption_production_blocked";
      case "denied_missing_authority":
        return "lab_public_caption_deployment_unclassified";
      case "denied_invalid_authority":
        return "lab_public_caption_deployment_invalid";
      case "denied_conflicting_authority":
        return "lab_public_caption_deployment_conflict";
      case "eligible":
        break;
    }
  }

  if (
    input.method === "lab_public_caption" &&
    input.retentionClass === "full_text_allowed" &&
    !input.legalApprovalId
  ) {
    return "lab_public_caption_full_text_requires_legal_approval";
  }

  return null;
}

function restrictedTranscriptEnvironment(
  deployment: DeploymentClassification,
): TranscriptEnvironment {
  if (
    deployment.restrictedCapability === "eligible" &&
    deployment.effectiveDeployment !== "unknown"
  ) {
    return deployment.effectiveDeployment;
  }
  return "production";
}
