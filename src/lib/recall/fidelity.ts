import type { RecallContentFidelity } from "./types";

export interface RecallFidelityPolicyOptions {
  allowUnverifiedImport?: boolean;
  allowPossiblyTruncatedImport?: boolean;
  allowMetadataOnlyImport?: boolean;
  warningUiAvailable?: boolean;
}

export interface RecallFidelityDecision {
  contentFidelity: RecallContentFidelity;
  shouldImport: boolean;
  shouldIndexForRetrieval: boolean;
  requiresExplicitApproval: boolean;
  reason: string;
}

export function evaluateRecallFidelityPolicy(
  contentFidelity: RecallContentFidelity,
  options: RecallFidelityPolicyOptions = {},
): RecallFidelityDecision {
  switch (contentFidelity) {
    case "complete_enough_for_daily_import":
      return {
        contentFidelity,
        shouldImport: true,
        shouldIndexForRetrieval: true,
        requiresExplicitApproval: false,
        reason: "Recall content is verified complete enough for daily import.",
      };
    case "api_chunks_unverified":
      return {
        contentFidelity,
        shouldImport: options.allowUnverifiedImport === true,
        shouldIndexForRetrieval:
          options.allowUnverifiedImport === true && options.warningUiAvailable === true,
        requiresExplicitApproval: options.allowUnverifiedImport !== true,
        reason:
          options.allowUnverifiedImport === true
            ? "Recall chunks are unverified; import is explicitly allowed, retrieval remains warning-gated."
            : "Recall chunks are unverified; live sample review is required before import.",
      };
    case "possibly_truncated":
      return {
        contentFidelity,
        shouldImport: options.allowPossiblyTruncatedImport === true,
        shouldIndexForRetrieval: false,
        requiresExplicitApproval: true,
        reason:
          options.allowPossiblyTruncatedImport === true
            ? "Recall returned the max chunk count; import is explicitly approved but retrieval remains blocked."
            : "Recall returned the max chunk count; block by default because content may be truncated.",
      };
    case "metadata_only":
      return {
        contentFidelity,
        shouldImport: options.allowMetadataOnlyImport === true,
        shouldIndexForRetrieval: false,
        requiresExplicitApproval: true,
        reason:
          options.allowMetadataOnlyImport === true
            ? "Recall returned metadata only; import is explicitly approved but retrieval remains blocked."
            : "Recall returned metadata only; block by default.",
      };
    case "blocked_unknown":
      return {
        contentFidelity,
        shouldImport: false,
        shouldIndexForRetrieval: false,
        requiresExplicitApproval: true,
        reason: "Recall content fidelity is unknown; block until investigated.",
      };
  }
}
