import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecallFidelityPolicy } from "./fidelity";

test("complete Recall content can import and index", () => {
  assert.deepEqual(evaluateRecallFidelityPolicy("complete_enough_for_daily_import"), {
    contentFidelity: "complete_enough_for_daily_import",
    shouldImport: true,
    shouldIndexForRetrieval: true,
    requiresExplicitApproval: false,
    reason: "Recall content is verified complete enough for daily import.",
  });
});

test("unverified Recall chunks are review-gated by default", () => {
  const decision = evaluateRecallFidelityPolicy("api_chunks_unverified");
  assert.equal(decision.shouldImport, false);
  assert.equal(decision.shouldIndexForRetrieval, false);
  assert.equal(decision.requiresExplicitApproval, true);

  const allowed = evaluateRecallFidelityPolicy("api_chunks_unverified", {
    allowUnverifiedImport: true,
    warningUiAvailable: true,
  });
  assert.equal(allowed.shouldImport, true);
  assert.equal(allowed.shouldIndexForRetrieval, true);
});

test("possibly truncated and metadata-only Recall content stay retrieval-blocked", () => {
  const truncated = evaluateRecallFidelityPolicy("possibly_truncated", {
    allowPossiblyTruncatedImport: true,
  });
  assert.equal(truncated.shouldImport, true);
  assert.equal(truncated.shouldIndexForRetrieval, false);
  assert.equal(truncated.requiresExplicitApproval, true);

  const metadataOnly = evaluateRecallFidelityPolicy("metadata_only");
  assert.equal(metadataOnly.shouldImport, false);
  assert.equal(metadataOnly.shouldIndexForRetrieval, false);
  assert.equal(metadataOnly.requiresExplicitApproval, true);
});

test("unknown Recall fidelity is blocked", () => {
  const decision = evaluateRecallFidelityPolicy("blocked_unknown");
  assert.equal(decision.shouldImport, false);
  assert.equal(decision.shouldIndexForRetrieval, false);
  assert.equal(decision.requiresExplicitApproval, true);
});
