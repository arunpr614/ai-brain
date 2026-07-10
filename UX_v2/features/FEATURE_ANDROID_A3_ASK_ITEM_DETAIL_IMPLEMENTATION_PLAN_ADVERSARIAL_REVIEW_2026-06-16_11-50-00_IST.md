# Feature Android A3 Ask Item Detail Implementation Plan - Adversarial Review

**Created:** 2026-06-16 11:50:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_V1_2026-06-16_11-48-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_11-50-00_IST.md`

## Executive Verdict

No-go for execution from plan v1. The work packages align with PRD v2, but the plan under-specifies the two things most likely to make validation fake: how to create real related-item vector data and how to render provider-error evidence without introducing a production fake state.

## Evidence Inspected

- `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_IMPLEMENTATION_PLAN_V1_2026-06-16_11-48-00_IST.md`
- `FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V2_2026-06-16_11-46-00_IST.md`
- `src/components/related-items.tsx`
- `src/db/chunks.ts`
- `src/lib/related/index.ts`
- `src/app/ask/ask-client.tsx`
- `src/components/ask-input.tsx`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Related fixture plan omits `chunks_vec`, so related evidence can be empty or non-deterministic

**Evidence:** Plan v1 says "Seed temporary DB with full, related, weak, and no-related fixtures" but does not say how to write embeddings. `findRelatedItems` reads from `chunks_vec` joined through `chunks_rowid` and `chunks` before returning related items.
**Why it matters:** Without deterministic vector rows, the Related tab either stays empty or depends on enrichment worker/provider behavior. That would make A3 evidence flaky and could let a visual tab pass without real related data.
**Failure mode:** Browser report captures a Related tab with no rows, or rows differ by run, while the milestone claims related-state coverage.
**Recommendation:** Plan v2 must define deterministic vector seeding using `insertChunkWithRowid` plus direct `chunks_vec` inserts inside a temporary DB transaction. It must avoid enrichment workers and providers.

#### 2. Provider-error browser proof has no concrete mechanism and risks shipping fake UI

**Evidence:** Plan v1 says "Add a local-only browser QA mechanism to render an Ask provider-error state" but does not define how it is gated, what files change, or how it avoids production reachability.
**Why it matters:** A test-only path in app code can become an accidental production backdoor or a misleading user-visible error trigger.
**Failure mode:** A query parameter or route state that anyone can hit renders fake provider errors in production, or the browser harness cannot trigger the state at all.
**Recommendation:** Plan v2 must use a non-production-safe mechanism: either seed initial messages into durable local thread history with an assistant error-like turn if supported, or use a browser-only mocked API response by intercepting `/api/ask` in the CDP script. If app code changes are needed, guard it behind `NODE_ENV !== "production"` and scanner/test it.

#### 3. The mobile tabs plan risks a large rewrite inside an already dirty item-detail file

**Evidence:** Plan v1 lists `src/app/items/[id]/page.tsx` but does not define an extraction strategy. The file already contains capture banners, highlighted chunks, repair panels, tags/topics/collections, related items, digest panels, and focus mode.
**Why it matters:** A broad inline rewrite in a dirty file risks breaking capture-result banners and repair success states from A2.
**Failure mode:** A3 tab work regresses `?capture_state=...`, `?repair=queued`, highlight anchors, or focus mode while browser QA only covers happy item tabs.
**Recommendation:** Plan v2 must keep capture/repair/highlight banners above tabs, extract only small helper render functions if needed, and add browser states for capture/repair banner persistence or state explicitly that they remain unchanged outside the tab body.

### P2 - Medium Risk

#### 1. Validation commands omit the browser script's setup requirements

**Evidence:** Plan v1 lists local preview and `node --import tsx scripts/ux-v2-browser-android-a3-ask-item-detail.ts`, but A2 required a temporary Chrome CDP instance and explicit port cleanup.
**Why it matters:** Future agents cannot reproduce evidence from the plan alone.
**Failure mode:** Browser script fails with no CDP target, or leaves preview/Chrome running.
**Recommendation:** Add exact CDP launch command, cleanup checks for ports 3027 and 9333, and report paths.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The plan assumes "seed related data" and "render provider error" are simple, but both sit behind real runtime mechanisms. Those mechanisms must be specified or the evidence will be weak.

## Missing Validation

- Deterministic vector fixture verification.
- Browser API interception or other concrete provider-error proof.
- Regression coverage for item-detail banners/highlight/focus interactions.
- CDP setup/cleanup instructions.

## Revised Recommendations

1. Add a deterministic vector seeding section with exact database APIs and direct `chunks_vec` insert.
2. Use CDP/API interception for provider-error browser evidence instead of app code fake state.
3. Keep item capture/repair/highlight banners outside tab restructuring.
4. Add a small item-detail copy/action scanner.
5. Document exact browser setup and cleanup.

## Go / No-Go Recommendation

No-go until plan v2 includes deterministic related fixtures, a concrete provider-error harness, and guardrails for the dirty item-detail file.

## Plan Revision Inputs

### Required Deletions

- Remove vague "local-only browser QA mechanism" wording.
- Remove unspecified "seed full/related fixtures" wording.

### Required Additions

- Direct vector fixture implementation details.
- CDP request interception or equivalent provider-error mechanism.
- Item-detail preservation constraints for capture result, repair queued, and highlighted citation states.
- Browser setup/cleanup commands.

### Required Acceptance Criteria Changes

- Related tab coverage must be backed by a script report proving at least one related row exists before browser QA.
- Provider error must be proven without adding production fake-state UI.

### Required Validation Changes

- Seed script report includes full item id, related item id, weak item id, no-related item id, and related count.
- Browser report includes state count and issue count.
- Port cleanup check after browser QA.

### Required No-Go Gates

- No execution if related fixture cannot be seeded deterministically.
- No completion if provider-error proof requires production-reachable fake UI.

## Residual Risks

Item Detail is already a complex shared file with many prior changes. Even with a careful plan, full `npm test` and broad browser smoke are needed before claiming local completion.
