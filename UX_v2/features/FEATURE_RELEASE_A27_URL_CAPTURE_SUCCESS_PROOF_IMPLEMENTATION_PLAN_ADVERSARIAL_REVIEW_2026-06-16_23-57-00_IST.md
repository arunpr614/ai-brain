# Feature Release A27 URL Capture Success Proof Implementation Plan - Adversarial Review

**Created:** 2026-06-16 23:57:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A27_URL_CAPTURE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_V1_2026-06-16_23-56-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_RELEASE_A27_URL_CAPTURE_SUCCESS_PROOF_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_23-57-00_IST.md`

## Executive Verdict

Conditional go. The plan is executable for server/API proof, but it needs stronger cleanup verification and must avoid committing transient proof artifacts unless they are deliberately redacted and small.

## Evidence Inspected

- A27 PRD v2.
- A27 implementation plan v1.
- `src/app/api/capture/url/route.ts`.
- `src/db/items.ts`.
- Current delivery tracker A25/A26 status.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Cleanup verification only checks `items`, not related rows

**Evidence:** Plan v1 checks item count but does not inspect chunks, embedding jobs, capture artifacts, or link tables for captured item ids.
**Why it matters:** The fixture can appear deleted while related rows remain, especially if SQLite foreign keys are not enabled in the CLI.
**Failure mode:** Production accumulates hidden QA leftovers and release docs claim cleanup passed.
**Recommendation:** Capture fixture item ids before deletion; after cleanup, verify no `items` row remains and, where tables exist, no `chunks`, `embedding_jobs`, `enrichment_jobs`, or `capture_artifacts` rows remain for those ids.

### P2 - Medium Risk

#### 1. Response artifact could accidentally become a token sink

**Evidence:** The plan writes a response artifact but does not say how shell commands avoid echoing headers.
**Why it matters:** Bearer tokens in command output or JSON files are release blockers.
**Failure mode:** A tracked proof file or terminal output contains a secret.
**Recommendation:** Use shell variables sourced from `.env`, do not run verbose curl, do not persist request headers, and write only selected response fields.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The plan assumes `x-brain-capture-source: android` in a direct API call is enough to make the proof Android-like. It is useful metadata, but it still is not native Android proof.

## Missing Validation

- Related-row cleanup checks.
- Explicit staged exclusion scan pattern.
- Explicit note that generated redacted proof can remain untracked if too specific or sensitive.

## Revised Recommendations

1. Add related-row cleanup verification for known fixture item ids.
2. Write only bounded redacted proof artifacts.
3. Keep native Android URL-share proof open.
4. Treat missing Android tools as an environmental limitation, not a product pass.

## Go / No-Go Recommendation

Go for execution after plan revision. No-go for closing native Android URL-share success.

## Plan Revision Inputs

### Required Deletions

- Delete any implication that `x-brain-capture-source: android` makes the proof native Android coverage.

### Required Additions

- Add related-row cleanup queries.
- Add a token-safety command rule.

### Required Acceptance Criteria Changes

- Cleanup must include exact item ids and related-row counts.

### Required Validation Changes

- Add staged exclusion scan before commit.

### Required No-Go Gates

- Do not commit if redacted proof contains a bearer token or token-shaped value.
- Do not close native URL-share proof without device/emulator evidence.

## Residual Risks

Production background workers could create related rows after the first verification if cleanup races with enrichment. A short post-cleanup recheck reduces but does not eliminate that risk.
