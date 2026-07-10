# Feature Android Library Compact Card Source Logos PRD - Adversarial Review

**Created:** 2026-06-17 14:25:30 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_V1_2026-06-17_14-24-30_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_LIBRARY_COMPACT_CARD_SOURCE_LOGOS_PRD_ADVERSARIAL_REVIEW_2026-06-17_14-25-30_IST.md`

## Executive Verdict

Conditional go for revision. The PRD has the correct user-facing target, but V1 does not lock down test fixtures, source-logo provenance, duplicate-warning semantics, or measurable mobile card-height evidence tightly enough.

## Evidence Inspected

- PRD V1 target.
- Handover: `Handover_docs/AI_MEMORY_ANDROID_LIBRARY_COMPACT_CARD_HANDOVER_2026-06-17_14-05-19_IST.md`.
- V2 source plan: `UX_v2/execution/ANDROID_LIBRARY_COMPACT_CARD_OPTION_A_IMPLEMENTATION_PLAN_V2_2026-06-17_11-02-23_IST.md`.
- `src/components/library-list.tsx` current single shared card body.
- `src/components/item-enrichment-watch.tsx` missing compact prop.
- `src/components/enriching-pill.tsx` existing compact prop.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Fixture strategy is not strong enough to prove the bug is fixed

**Evidence:** PRD lists scenarios but not how fixtures are created, selected, or identified for browser and Android screenshots.
**Why it matters:** The original failure depends on real long titles and metadata combinations.
**Failure mode:** QA captures easy items and misses the exact tall-card state.
**Recommendation:** Require a deterministic fixture plan or documented real-item IDs for long YouTube, long generic article, LinkedIn, Substack, PDF, Note, enrichment error, metadata-only, and selected/BulkBar states.

#### 2. Logo provenance and accessibility are under-specified

**Evidence:** PRD says local/bundled logos but does not require provenance comments or decorative accessibility treatment.
**Why it matters:** Brand marks can create licensing, trust, or screen-reader noise.
**Failure mode:** Remote or inaccurate logos ship, or screen readers announce meaningless SVG labels before text.
**Recommendation:** Require inline/local SVG provenance comments, decorative `aria-hidden`, and adjacent text as the only accessible source name.

### P2 - Medium Risk

#### 1. Metadata warning suppression needs a product rule

**Evidence:** PRD says suppress duplicate warnings but does not define which warnings duplicate quality/enrichment.
**Why it matters:** Ad hoc string handling can hide meaningful extraction warnings.
**Failure mode:** Users lose important warnings or see redundant metadata-only noise.
**Recommendation:** Define a helper with an explicit allow/suppress list for known duplicate warnings and leave unknown warnings visible.

#### 2. Desktop protection needs measurable evidence

**Evidence:** PRD says desktop unchanged but does not require screenshot paths or before/after notes.
**Why it matters:** `LibraryList` is shared.
**Failure mode:** Desktop card shifts silently while Android bug is fixed.
**Recommendation:** Require desktop before/after screenshots or a written visual diff in the QA report.

### P3 - Low Risk Or Polish

#### 1. Version bump rule is conditional but not operational

**Evidence:** PRD says bump if shared, but not who decides or where install notes go.
**Why it matters:** Existing APK `1.0.6/code7` predates this fix.
**Failure mode:** User installs an old APK or a rebuilt APK without checksum context.
**Recommendation:** Require a private sideload note if any APK is built for sharing.

## What The Original Plan Or Work Gets Wrong

The PRD treats "look compact" as mostly visual, but this bug needs deterministic content fixtures, source-logo mapping proof, selection proof, and Android-specific evidence.

## Missing Validation

- Deterministic fixture IDs or seed script.
- Logo provenance and accessibility checks.
- Explicit warning suppression table.
- Desktop before/after evidence paths.
- Android APK install/version/checksum record if built.

## Revised Recommendations

Revise PRD to add fixture source, logo accessibility/provenance, warning helper semantics, evidence file requirements, and APK operational gates.

## Go / No-Go Recommendation

Go to PRD V2 after revisions. Do not ship from PRD V1.

## Plan Revision Inputs

### Required Deletions

- Delete any implication that browser responsive evidence can close the Android bug.

### Required Additions

- Add fixture plan.
- Add logo provenance and decorative accessibility rules.
- Add warning suppression matrix.
- Add screenshot/evidence path requirements.

### Required Acceptance Criteria Changes

- Require documented fixture IDs or seed data.
- Require desktop visual diff.
- Require Android evidence before done.

### Required Validation Changes

- Add selected/BulkBar Android proof from zero selected state.

### Required No-Go Gates

- No shareable APK without version bump, checksum, and install/rollback notes.

## Residual Risks

Brand mark rendering at very small sizes may vary on Android; QA should inspect actual device pixels, not only DOM class names.
