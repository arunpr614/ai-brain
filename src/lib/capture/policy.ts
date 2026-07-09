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
  environment?: TranscriptEnvironment;
  rightsBasis: TranscriptRightsBasis;
  method: TranscriptAcquisitionMethod;
  retentionClass: TranscriptRetentionClass;
  legalApprovalId?: string | null;
}

export function currentTranscriptEnvironment(): TranscriptEnvironment {
  if (process.env.BRAIN_TRANSCRIPT_ENV === "lab") return "lab";
  if (process.env.NODE_ENV === "production") return "production";
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
  const environment = input.environment ?? currentTranscriptEnvironment();
  const blockedReason = blockedReasonFor({
    environment,
    method: input.method,
    retentionClass: input.retentionClass,
    legalApprovalId: input.legalApprovalId ?? null,
  });

  const productionAllowed =
    !blockedReason &&
    (input.method === "lab_public_caption" ? Boolean(input.legalApprovalId) : true);

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
  environment: TranscriptEnvironment;
  method: TranscriptAcquisitionMethod;
  retentionClass: TranscriptRetentionClass;
  legalApprovalId: string | null;
}): string | null {
  if (
    input.environment === "production" &&
    input.method === "lab_public_caption" &&
    !input.legalApprovalId
  ) {
    return "lab_public_caption_requires_legal_approval_in_production";
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
