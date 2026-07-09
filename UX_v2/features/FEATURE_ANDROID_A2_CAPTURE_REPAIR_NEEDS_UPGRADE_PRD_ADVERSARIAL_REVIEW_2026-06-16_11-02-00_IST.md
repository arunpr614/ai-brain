# Feature Android A2 Capture Repair Needs Upgrade PRD - Adversarial Review

**Created:** 2026-06-16 11:02:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V1_2026-06-16_11-00-00_IST.md`
**Report path:** `/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_ADVERSARIAL_REVIEW_2026-06-16_11-02-00_IST.md`

## Executive Verdict

No-go for implementation from PRD v1. The scope is directionally correct, but it does not yet constrain capture result truth, deterministic fixtures, repair success proof, or mobile action placement tightly enough to prevent false completion claims.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A2_CAPTURE_REPAIR_NEEDS_UPGRADE_PRD_V1_2026-06-16_11-00-00_IST.md`
- `UX_v2/execution/ANDROID_EXPERIENCE_REVAMP_PRD_REVISED_2026-06-15_18-36-33_IST.md`
- `UX_v2/execution/ANDROID_A0_DESIGN_TRUTH_MATRIX_2026-06-16_08-32-30_IST.md`
- Magic Patterns source files:
  - `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileCapture.tsx`
  - `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileRepair.tsx`
  - `UX_v2/execution/ANDROID_A0_MAGIC_PATTERNS_MOBILE_SOURCE_SNAPSHOT_2026-06-16_08-32-30_IST/source/pages/MobileNeedsUpgrade.tsx`
- Current production files:
  - `src/app/capture/page.tsx`
  - `src/app/capture/tabs.tsx`
  - `src/app/capture/pdf-dropzone.tsx`
  - `src/app/capture-actions.ts`
  - `src/app/needs-upgrade/page.tsx`
  - `src/app/items/[id]/repair/repair-form.tsx`
  - `src/app/items/[id]/repair/actions.ts`

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. Capture result acceptance could validate simulated UI instead of real action outcomes

**Evidence:** PRD v1 says result handling may continue to land on item detail with `capture_state`, but it also requires URL duplicate, PDF non-PDF, validation, and success evidence without defining which are action-backed versus fixture-rendered. Magic Patterns `MobileCapture.tsx` uses local `setResult()` simulated states.
**Why it matters:** A2 can pass screenshots while not proving that URL/PDF/note actions still work or that real result banners are connected to persisted items.
**Failure mode:** A mobile-looking Capture page ships, but duplicate/save/error states are either mocked, unreachable, or only visually asserted.
**Recommendation:** PRD v2 must split states into action-backed required states, fixture-rendered route-state smokes, and out-of-scope states. It must require at least one real URL duplicate action, one note save action or focused action test, and one PDF client-side error smoke.

#### 2. Needs Upgrade empty-state proof is underspecified and can pollute fixture databases

**Evidence:** PRD v1 requires empty-state validation with a database that has no weak items, but does not define seeding/cleanup or isolation from the queue fixture. A1 evidence already duplicated fixtures after a restart.
**Why it matters:** A false empty-state pass can hide weak rows or mutate a shared local database, making later evidence unreliable.
**Failure mode:** Screenshots disagree with test counts, or a repair success path removes the wrong fixture from the wrong database.
**Recommendation:** PRD v2 must require separate deterministic queue, empty, and repair-success fixture DBs or explicit reset steps, plus a manifest with item IDs and cleanup rules.

#### 3. Repair success requires data-state verification, not only redirect/banner proof

**Evidence:** Current repair action redirects to `/items/[id]?repair=queued`; PRD v1 says successful repair removes the item from Needs Upgrade, but validation only lists "Repair success path" without specifying DB assertions.
**Why it matters:** The UI can redirect while the item remains weak, tags/collections drop, or capture_quality remains limited.
**Failure mode:** User believes repair succeeded, but Ask/search still treat the item as weak.
**Recommendation:** PRD v2 must require DB-level or route-level proof that repaired item body/quality changed and the item no longer appears in `/needs-upgrade`.

### P2 - Medium Risk

#### 1. Mobile placement and bottom-nav overlap criteria are too broad

**Evidence:** PRD v1 says bottom nav does not cover critical controls but does not name the controls or required viewports for Capture, Needs Upgrade, and Repair.
**Why it matters:** Textarea submit buttons and repair controls are especially likely to sit near the fixed bottom nav.
**Failure mode:** The page looks fine at the top but Save repair, PDF browse, or Add text actions are hidden behind navigation.
**Recommendation:** Name the controls that must remain visible and tappable at 390x844 and 430x932.

#### 2. Forbidden prototype controls need a local A2 scanner

**Evidence:** PRD v1 lists forbidden behavior, but does not require a slice-specific copy/action scanner.
**Why it matters:** A2 touches exactly the surfaces where Magic Patterns includes simulated "Paste Text", "Merge", "Keep both", and completion cards.
**Failure mode:** Prototype-only action labels appear in production without supporting semantics.
**Recommendation:** Add an A2 scanner covering capture, needs-upgrade, repair, and relevant item-detail result surfaces.

### P3 - Low Risk Or Polish

#### 1. Release claim should distinguish local browser completion from prior full-suite gates

**Evidence:** PRD v1 includes the correct final wording, but validation says typecheck/lint/tests/build before release claim without saying whether A2 milestone completion can rely on focused tests plus existing full-suite status.
**Why it matters:** The tracker can overstate what was rerun during A2.
**Failure mode:** Future agents assume a fresh full build/test passed when only focused checks ran.
**Recommendation:** Require QA docs to state exactly which gates were rerun in A2 and which were inherited from prior green gates.

## What The Original Plan Or Work Gets Wrong

- It treats visual state coverage and action outcome coverage as the same kind of proof.
- It does not isolate fixture databases strongly enough after the A1 duplicate-fixture lesson.
- It does not bind the repair success claim to actual weak-source removal evidence.

## Missing Validation

- Deterministic queue/empty/repair fixture manifest.
- Real duplicate URL action proof or focused action coverage.
- Note save action proof or focused action coverage.
- Repair success DB/route proof.
- A2-specific forbidden copy/action scan.
- Explicit bottom-nav overlap checks for Save repair, Add text, Source, PDF browse, and Note save controls.

## Revised Recommendations

Revise the PRD before implementation. The revised PRD can still keep the same scope, but must add fixture isolation, action-backed validation tiers, repair success data proof, and A2 scanner requirements.

## Go / No-Go Recommendation

No-go from PRD v1. Go after PRD v2 incorporates the P1 and P2 revision inputs and the implementation plan turns them into executable tasks.

## Plan Revision Inputs

### Required Deletions

- Remove any ambiguity that inline Capture result cards or Magic Patterns simulated outcomes are required for A2.

### Required Additions

- Add deterministic fixture DB requirements for queue, empty, duplicate, and repair success.
- Add action-backed versus fixture-rendered validation labels.
- Add repair success data-state proof.
- Add A2 forbidden copy/action scanner.

### Required Acceptance Criteria Changes

- Require named critical controls to remain visible/tappable above bottom nav.
- Require exact final evidence label: browser mobile only unless APK evidence is actually captured.

### Required Validation Changes

- Add focused action tests or browser smokes for duplicate URL, note save, PDF error, repair validation, and repair success.

### Required No-Go Gates

- No A2 completion claim if repair does not remove the item from Needs Upgrade.
- No A2 completion claim if screenshots show prototype-only unsupported controls.
- No APK or production completion claim from browser-only evidence.

## Residual Risks

Even after revision, local browser evidence will not prove APK keyboard behavior, Android file picker behavior, or native share behavior. Final Android release still needs APK/device evidence.
