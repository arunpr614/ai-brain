# Feature Release A13 Final Ownership And Publication Gate PRD V1

Created: 2026-06-16 19:12 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`

## Problem Statement

UX v2 has substantial web and Android implementation evidence, including A11 web production deploy evidence and A12 authenticated Android runtime evidence. The overall user goal still cannot be marked complete because the release surface is broad, the worktree remains dirty, Android APK publication is not explicitly authorized, README/setup guidance contains stale QR-pairing copy, and accessibility/native-share decisions remain partly open.

A13 exists to close or honestly classify the final ownership and publication gates. It must prevent false completion claims while preserving the already-created evidence trail.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md` | Current Android runtime proof and remaining publication blockers. |
| `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_18-59-00_IST.md` | Explicitly states ownership review remains incomplete. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Delivery gate tracker; bottom section still points to A12 and must be updated after A12 execution. |
| `UX_v2/trackers/milestone_tracker.md` | Milestone status; M7.2 is advanced partial and publication gated. |
| `README.md` | Public setup guidance; first-run Android pairing text still describes QR scanning even though current `/setup-apk` uses pairing-code entry. |
| `src/app/setup-apk/page.tsx` | Current Android setup UI expects a short-lived pairing code. |
| `src/app/settings/device-pairing/page.tsx` | Current web pairing page says Android uses a short-lived code and advanced token flow is for Chrome extension. |
| `android/app/build.gradle`, `capacitor.config.ts`, `android/app/src/main/assets/capacitor.config.json` | Current Android candidate identity and bridge logging behavior. |

## Goals

1. Produce a final ownership/publication audit that separates proven completion from remaining gates.
2. Correct stale publication/tracker guidance that would otherwise send the next agent back to A12.
3. Correct README Android first-run pairing guidance so it matches the current code-entry flow.
4. Re-verify Android candidate artifact identity and secret-log hygiene metadata without exposing tokens.
5. Decide, with evidence, whether `1.0.4/code5` is a debug validation candidate, a publication candidate, or blocked pending external authorization.
6. Capture the remaining full-goal blockers in project tracker and running log.

## Non-Goals

- Do not publish an APK to any external store, device fleet, website, or distribution channel without explicit user authorization.
- Do not sign a release APK or change signing keys.
- Do not rewrite or normalize the broad dirty worktree.
- Do not alter old running-log entries.
- Do not claim full TalkBack spoken-order coverage unless it is actually captured.
- Do not claim URL-share success from the `example.com` A12 fixture; classify it honestly or run a separate proven fixture.
- Do not mutate production data except through explicitly cleanable test fixtures with before/after cleanup proof.

## Users And Stakeholders

| Stakeholder | Need |
| --- | --- |
| Arun | Clear status: what shipped, what is only candidate-validated, and what remains before full completion. |
| Next AI agent | Unambiguous next gate and no stale tracker instructions. |
| Release owner | Artifact identity, risk register, publication authorization status, and exact commands/evidence paths. |
| Future Android tester | Accurate pairing instructions and known limitations. |

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A13-R1 | Final ownership audit | P0 | A13 audit lists A12-authored release-critical source/config/artifact/doc changes separately from pre-existing broad dirty worktree changes; it does not pretend the whole worktree is owned or clean. |
| A13-R2 | Publication authorization classification | P0 | A13 report states that no external APK publication happened unless explicit authorization/evidence exists; if absent, status remains gated. |
| A13-R3 | Android candidate identity | P0 | A13 report verifies `data/artifacts/brain-debug-v1.0.4-code5.apk` and Gradle output SHA match, versionCode/versionName are `5`/`1.0.4`, and `loggingBehavior` is present in source and synced asset config. |
| A13-R4 | Stale QR pairing docs fixed | P1 | README Android first-run pairing describes short-lived Android code flow, not QR scanning, and old "re-scan setup QR" language is updated where it would mislead current testers. |
| A13-R5 | Tracker next gate corrected | P1 | `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` no longer says the next required gate is to create A12; it points to A13 final ownership/publication closure. |
| A13-R6 | Accessibility decision explicit | P1 | A13 report states whether bounded A12 TalkBack launch smoke is sufficient or whether full TalkBack spoken-order audit remains a blocker. If no full audit is captured, it must remain open. |
| A13-R7 | Native share decision explicit | P2 | A13 report distinguishes passed native note share from partial URL-share fixture and records whether dedicated URL-share proof is required. |
| A13-R8 | Evidence hygiene | P0 | No raw bearer token, session cookie, pairing code, signed URL, or private credential is copied into new reports. |
| A13-R9 | Project tracker update | P1 | A13 adds a tracker update with current milestone status, owners, open gates, and next action. |
| A13-R10 | Running log update | P1 | Root `RUNNING_LOG.md` receives an append-only milestone entry at true EOF after A13 execution reaches a meaningful checkpoint. |
| A13-R11 | Goal completion guard | P0 | A13 must explicitly say the overall goal remains active unless all release/publication, QA, ownership, and deployment conditions are satisfied with evidence. |

## Acceptance Tests And Checks

1. `git diff --check` on all A13-created/updated files.
2. `shasum -a 256` on both `1.0.4/code5` APK locations.
3. Static config check that `capacitor.config.ts` and `android/app/src/main/assets/capacitor.config.json` contain `loggingBehavior` set to `none`.
4. README text search for stale QR setup wording in the Android first-run flow.
5. Tracker text search verifying the bottom next gate no longer instructs creating A12.
6. Secret-pattern scan over new A13 Markdown docs for obvious token/session/pairing-code leaks.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A13 becomes paperwork that falsely closes the release | P0 | Keep no-go gates explicit and evidence-backed. |
| README update overreaches old historical runbooks | P2 | Update only current root README setup guidance unless a stale line is directly harmful. |
| Dirty worktree ownership is too broad to close locally | P0 | Attribute known A12/A13 changes and keep final commit ownership open if full attribution is not possible. |
| Full TalkBack audit is infeasible in the current environment | P1 | Mark it open instead of downgrading silently. |
| Publication target is undefined | P0 | Keep APK publication blocked pending explicit owner/target authorization. |

## Release Status Definition

`web_production_deployed_android_candidate_publication_gated` means:

- Web UX v2 is production deployed and smoke-tested based on A11 evidence.
- Android `1.0.4/code5` debug APK is runtime-validated based on A12 evidence.
- External APK publication, signed release distribution, and overall goal completion are not complete.

## Out Of Scope For This PRD

- New UI feature development.
- New production deploy.
- Full release signing setup.
- Git commit, push, or pull request creation unless separately requested.
