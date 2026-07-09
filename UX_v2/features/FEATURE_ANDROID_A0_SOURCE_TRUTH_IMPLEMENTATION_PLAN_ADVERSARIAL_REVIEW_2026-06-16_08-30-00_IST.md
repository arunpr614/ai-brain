# Feature Android A0 Source Truth Implementation Plan - Adversarial Review

**Created:** 2026-06-16 08:30:00 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_V1_2026-06-16_08-28-00_IST.md`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/phase2/UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_08-30-00_IST.md`

## Executive Verdict

No-go until the plan makes validation exact. The plan follows the revised PRD shape, but its checks can produce false confidence: counting files is not the same as proving every expected source file was captured, and scanning for forbidden terms is not the same as proving those terms were not authorized.

## Evidence Inspected

- `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_V1_2026-06-16_08-28-00_IST.md`
- `UX_v2/features/FEATURE_ANDROID_A0_SOURCE_TRUTH_PRD_V2_2026-06-16_08-25-30_IST.md`
- Magic Patterns `get_design_status` output: 31 files, active artifact `d7eeaec6-0272-40fa-a7ca-4de7871182e7`, `isGenerating=false`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_MAGIC_PATTERNS_SOURCE_SNAPSHOT_2026-06-15_21-48-07_IST/README.md`

## Findings

### P0 - Must Fix Before Execution Or Release

#### 1. Source snapshot validation can pass with the wrong 31 files

**Evidence:** The validation command only counts files with `find ... -type f | wc -l` (`FEATURE_ANDROID_A0_SOURCE_TRUTH_IMPLEMENTATION_PLAN_V1_2026-06-16_08-28-00_IST.md:130`).
**Why it matters:** The Magic Patterns artifact has specific expected file paths. A count of 31 can pass if one required file is missing and another unrelated/generated file exists.
**Failure mode:** A0 is marked complete while `pages/MobileMore.tsx` or `data/sources.ts` is missing, which removes the exact source needed to police fake account/offline/privacy claims.
**Recommendation:** Plan v2 must require exact path comparison between `get_design_status.availableFiles` and the local snapshot manifest. Missing, extra, zero-byte, or failed-capture files must block `Complete`.

#### 2. The plan does not define a reliable truncation/full-capture proof

**Evidence:** The plan asks for `truncation status` (`:32`) and says missing/truncated files block completion (`:34`), but does not say how truncation is detected from Magic Patterns tool responses.
**Why it matters:** The PRD's main adversarial fix was durable full-source capture. If full-capture proof is undefined, a large response can silently truncate and still be saved as "captured."
**Failure mode:** A future agent writes partial source files to disk, truth-maps only the visible parts, and misses unsupported controls lower in a component.
**Recommendation:** Plan v2 must read files in bounded batches, compare requested files to returned files, mark each file as `captured_full` only when the tool returned content for that exact path and the saved byte count is nonzero, and mark any tool truncation/error as `partial_or_failed`.

### P1 - High Risk

#### 1. Forbidden scan can confuse prohibited mentions with authorized behavior

**Evidence:** The plan proposes `rg -n "QR|offline sync|..."` across A0 docs (`:132`). The A0 docs should mention these terms to prohibit them, so raw matches do not prove failure or success.
**Why it matters:** A scan that always returns matches is not a validation gate.
**Failure mode:** The agent records "forbidden scan passed" because terms were found, even if one row says "QR approved" or "offline sync implement."
**Recommendation:** Plan v2 should require a manual authorization audit table and a targeted scan for dangerous action words near forbidden concepts: `approved implementation`, `implement`, `enabled`, `active`, `works`, or `ship` in rows containing QR/offline sync/telemetry/E2EE/etc.

#### 2. Truth-matrix coverage remains manual without a coverage checklist

**Evidence:** Phase 4 defines matrix sections and grain (`:53-75`), but Phase 6 only checks required screens and D-decisions (`:97`). It does not validate visible actions/control groups/statuses/fake fields/mutation affordances.
**Why it matters:** The biggest risk is not missing a screen name; it is missing specific controls within a screen.
**Failure mode:** `MobileMore` appears in the matrix, but privacy controls, fake account identity, app version, offline sync, and device state are not separately classified.
**Recommendation:** Add a coverage checklist appendix generated from source inspection. Completion requires each checklist row to map to a truth-matrix row.

### P2 - Medium Risk

#### 1. Fixed timestamps make reruns awkward

**Evidence:** All output paths are hardcoded to `2026-06-16_08-28-00_IST` (`:20`, `:38`, `:51`, `:79`, `:105`).
**Why it matters:** If execution starts later or must be rerun, stale timestamps make artifacts harder to reason about and risk overwriting a prior run.
**Failure mode:** A second A0 attempt overwrites or conflicts with the first, or the tracker points to a timestamp that does not match actual evidence.
**Recommendation:** Plan v2 should define `<execution_timestamp>` once and require all files from a run to use that timestamp.

### P3 - Low Risk Or Polish

No P3 findings found.

## What The Original Plan Or Work Gets Wrong

The plan is directionally correct but still too trusting of manual validation. It must make source and matrix coverage mechanically auditable enough that future agents cannot accidentally declare A0 complete with a vague matrix or incomplete snapshot.

## Missing Validation

- Exact expected-vs-actual source path comparison.
- Returned-file-name comparison for Magic Patterns reads.
- Nonzero byte count and error/truncation capture.
- Coverage checklist for element/action/control/status grain.
- Dangerous authorization scan rather than broad keyword scan.

## Revised Recommendations

- Introduce `<execution_timestamp>`.
- Read Magic Patterns files in small batches and record request/response status.
- Create `EXPECTED_SOURCE_FILES.txt` from `get_design_status.availableFiles`.
- Validate local snapshot path set equals expected path set.
- Create a source-derived coverage checklist before writing the truth matrix.
- Audit forbidden concepts for action/status columns, not raw mentions.

## Go / No-Go Recommendation

No-go for execution until plan v2 adds exact source path validation, full-capture proof rules, source-derived coverage checklist, and safer forbidden-authorization audit.

## Plan Revision Inputs

### Required Deletions

- Delete file-count-only validation as a completion proof.
- Delete raw forbidden keyword scan as a success/failure proof.

### Required Additions

- `<execution_timestamp>` variable.
- Expected source file list artifact.
- Exact expected-vs-actual path comparison.
- Magic Patterns read batch log.
- Coverage checklist generated from source inspection.
- Dangerous authorization audit for forbidden concepts.

### Required Acceptance Criteria Changes

- A0 `Complete` requires exact source path set equality and no failed/partial captures.
- A0 `Complete` requires every coverage checklist row to have a truth-matrix row.
- A0 `Complete` requires forbidden concepts to be classified as hide/disable/defer/out of scope, never implement/active/ship.

### Required Validation Changes

- Use exact file path comparisons, not counts.
- Record source byte counts and capture status.
- Scan or audit action columns, not just terms.

### Required No-Go Gates

- Any expected source file missing or any extra file unexplained.
- Any source file capture status other than `captured_full`.
- Any coverage checklist row missing from the truth matrix.
- Any forbidden concept with an implementation action of `implement`.

## Residual Risks

Even with plan v2, source truth still depends on correct human/source interpretation. Later code slices must continue to use per-feature review and actual APK/browser evidence before release claims.
