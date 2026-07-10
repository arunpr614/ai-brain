# Feature Android A3 Ask Item Detail PRD - Adversarial Review

**Created:** 2026-06-16 11:44:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V1_2026-06-16_11-42-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-44-00_IST.md`

## Executive Verdict

No-go for execution from PRD v1. The scope is correctly bounded to local browser-mobile evidence, but v1 leaves the two highest-risk behaviors underspecified: empty Ask behavior and the data/mutation model for mobile Item Detail tabs. If executed as written, the team could create a prettier mobile shell while silently regressing real Ask submission and item metadata controls.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A3_ASK_ITEM_DETAIL_PRD_V1_2026-06-16_11-42-00_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`
- `UX_v2/execution/ANDROID_REDESIGN_IMPLEMENTATION_PLAN_REVISED_2026-06-15_17-28-12_IST.md`
- `src/components/ask-input.tsx`
- `src/app/ask/ask-client.tsx`
- `src/app/items/[id]/page.tsx`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Empty Ask acceptance contradicts the current implementation and could validate a silent no-op

**Evidence:** PRD v1 says empty send must provide "an observable nudge or stable disabled state" at lines 49-51 and 77-82. The current Ask input only applies `opacity-40` when empty and returns from submit without UI feedback in `src/components/ask-input.tsx:29-31` and `src/components/ask-input.tsx:75-82`.
**Why it matters:** Android users tapping a faded but still clickable send button get no explanation. If the PRD accepts "stable disabled state" without requiring actual disabled semantics or feedback, QA can pass a confusing control.
**Failure mode:** Browser evidence shows a send icon, the user taps it, nothing happens, and the feature is still marked complete because no turn was created.
**Recommendation:** PRD v2 must require either a real disabled button with `disabled`/`aria-disabled` and non-clickable semantics, or an explicit inline empty-question nudge. Browser/DOM evidence must prove the chosen behavior.

#### 2. Item Detail tab model does not define where real tag/collection editors live

**Evidence:** PRD v1 requires tabs at lines 54 and 71-74 but only says existing mutation controls "may remain" at line 58. Current item detail renders TagEditor and CollectionEditor in the right rail at `src/app/items/[id]/page.tsx:292-301` and collection controls further down the same aside.
**Why it matters:** On mobile, moving content into tabs can accidentally hide or duplicate real mutation controls, or expose them without enough screen clearance. The D-005 item tab approval is for WebView organization using existing data, not for losing existing tag/collection semantics.
**Failure mode:** Original/Digest/Details tabs ship visually, but tags/collections become unreachable, duplicated, or placed inside the wrong tab with no mutation validation.
**Recommendation:** PRD v2 must specify a deterministic tab mapping: Original contains source text and repair affordance; Digest contains summary/quotes/category; Ask is an entry point to scoped Ask; Related contains related items or empty related copy; Details contains capture metadata, tags, topics, and collections using existing controls only. It must require at least smoke evidence that existing controls render without overlap.

#### 3. Related/no-related acceptance is too easy to satisfy with weak fixtures

**Evidence:** PRD v1 allows "browser evidence covers an item with related results and an item without related results, or a documented fixture proves no-related state" at line 57. Current `RelatedItems` hides itself when no related items exist, as implied by `src/app/items/[id]/page.tsx:305-307`.
**Why it matters:** If no-related state is just absence of a panel, users cannot tell whether related content is loading, unavailable, or broken.
**Failure mode:** The no-related fixture shows no Related tab content, but the report calls it "documented" and passes.
**Recommendation:** PRD v2 must require a visible empty state in the Related tab for no-related items.

### P2 - Medium Risk

#### 1. Provider-offline validation can be faked by unit copy without testing the visible mobile path

**Evidence:** PRD v1 allows "browser evidence or focused test" for provider-offline copy at line 51. Current error rendering lives inside `AskClient` turn rendering at `src/app/ask/ask-client.tsx:166-183`.
**Why it matters:** A string-level test does not prove the mobile message fits, is visible above the composer, or is associated with the failed turn.
**Failure mode:** Tests pass while the mobile error card is clipped or hidden behind the composer.
**Recommendation:** Require browser-mobile evidence for at least one rendered error card, even if the provider is mocked or seeded through a test harness route/state.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

PRD v1 treats "tabs exist" as the core Item Detail outcome. The real risk is not tab labels; it is whether the existing item capabilities remain accessible and truthful after being reorganized for mobile.

## Missing Validation

- DOM-level empty-send proof for disabled semantics or inline nudge.
- Visible Related empty state proof.
- Mobile error-card proof for provider unavailable.
- Tab mapping proof for tags, topics, collections, and capture metadata.

## Revised Recommendations

1. Add a required mobile empty-send behavior with DOM-verifiable acceptance.
2. Define exact tab-to-data mapping before implementation.
3. Require a visible Related empty state.
4. Require browser-mobile evidence for provider-offline or mocked Ask error rendering.
5. Keep existing tag/collection controls in Details only unless separately tested elsewhere.

## Go / No-Go Recommendation

No-go until PRD v2 resolves all P1 findings and the implementation plan includes fixture/script support for these states.

## Plan Revision Inputs

### Required Deletions

- Delete the ambiguous acceptance phrase "observable nudge or stable disabled state" unless the chosen behavior is specified precisely.
- Delete the "documented fixture proves no-related state" shortcut.

### Required Additions

- Add deterministic Item Detail tab mapping.
- Add visible no-related empty state acceptance.
- Add provider-error mobile evidence acceptance.
- Add DOM proof for empty-send behavior.

### Required Acceptance Criteria Changes

- Empty send must be either disabled in DOM or show an inline nudge.
- Related tab must show either related rows or a visible empty state.
- Details tab must contain capture metadata and existing tag/topic/collection controls.

### Required Validation Changes

- Add A3 browser QA states for Ask empty, Ask provider error, item tabs full, item tabs weak, related empty, and focus.
- Add scanner for forbidden Ask/Item Detail actions and copy.

### Required No-Go Gates

- No execution if tab mapping is not explicit.
- No completion if only browser routes load but Ask/error/focus interactions are not exercised.

## Residual Risks

Even after v2, APK keyboard evidence will remain pending. Local browser evidence can validate layout and DOM behavior, but final Android-complete claims still require authenticated APK evidence.
