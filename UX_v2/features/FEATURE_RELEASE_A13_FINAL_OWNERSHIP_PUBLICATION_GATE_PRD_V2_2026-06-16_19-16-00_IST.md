# Feature Release A13 Final Ownership And Publication Gate PRD V2

Created: 2026-06-16 19:16 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_V1_2026-06-16_19-12-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A13_FINAL_OWNERSHIP_PUBLICATION_GATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_19-13-00_IST.md`

## Problem Statement

UX v2 has substantial web and Android implementation evidence, including A11 web production deploy evidence and A12 authenticated Android runtime evidence. The overall user goal still cannot be marked complete because the release surface is broad, the worktree remains dirty, Android APK publication is not explicitly authorized by the user, README/setup guidance contains stale QR-pairing copy, and accessibility/native-share decisions remain partly open.

A13 exists to close or honestly classify the final ownership and publication gates. It must prevent false completion claims while preserving the already-created evidence trail.

## Source Evidence

| Source | Relevance |
| --- | --- |
| `UX_v2/execution/UX_V2_A12_ANDROID_PUBLICATION_GATE_QA_2026-06-16_18-59-00_IST.md` | Current Android runtime proof and remaining publication blockers. |
| `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_2026-06-16_18-59-00_IST.md` | Explicitly states ownership review remains incomplete. |
| `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` | Delivery gate tracker; bottom section still points to A12 and must be updated after A12 execution. |
| `UX_v2/trackers/milestone_tracker.md` | Milestone status; M7.2 is advanced partial and publication gated. |
| `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md` | Release packet that must either be updated or explicitly superseded by A13. |
| `README.md` | Current setup guidance; first-run Android pairing text still describes QR scanning even though current `/setup-apk` uses pairing-code entry. |
| `src/app/setup-apk/page.tsx` | Current Android setup UI expects a short-lived pairing code. |
| `src/app/settings/device-pairing/page.tsx` | Current web pairing page says Android uses a short-lived code and advanced token flow is for Chrome extension. |
| `android/app/build.gradle`, `capacitor.config.ts`, `android/app/src/main/assets/capacitor.config.json` | Current Android candidate identity and bridge logging behavior. |
| PM sidecar artifact, if produced before final tracker/log updates | Independent milestone and risk review requested by the user. |

## Goals

1. Produce a final ownership/publication audit that separates proven completion from remaining gates.
2. Correct stale publication/tracker guidance that would otherwise send the next agent back to A12.
3. Correct root README Android first-run pairing and reinstall guidance so it matches the current code-entry flow.
4. Re-verify Android candidate artifact identity and cite A12 post-fix token-log PASS evidence without exposing tokens.
5. Classify `1.0.4/code5` as a debug validation candidate unless the user gives explicit distribution-target authorization.
6. Capture the remaining full-goal blockers in project tracker, release packet, PM status, and running log.

## Non-Goals

- Do not publish an APK to any external store, device fleet, website, or distribution channel without explicit user authorization and a named target.
- Do not sign a release APK or change signing keys.
- Do not rewrite, normalize, stage, commit, or revert the broad dirty worktree unless separately requested.
- Do not alter old running-log entries.
- Do not claim full TalkBack spoken-order coverage unless it is actually captured.
- Do not claim URL-share success from the `example.com` A12 fixture; classify it honestly or require a separate deterministic fixture.
- Do not mutate production data except through explicitly cleanable test fixtures with before/after cleanup proof.
- Do not update historical runbooks unless they are presented as the current setup path.

## Stakeholders

| Stakeholder | Need |
| --- | --- |
| Arun | Clear status: what shipped, what is only candidate-validated, and what remains before full completion. |
| Next AI agent | Unambiguous next gate and no stale tracker instructions. |
| Release owner | Artifact identity, risk register, publication authorization status, and exact commands/evidence paths. |
| Future Android tester | Accurate current pairing instructions and known limitations. |

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A13-R1 | Final ownership inventory | P0 | A13 audit includes changed-file count, tracked/untracked category summary, A12/A13-owned file list, inherited dirty-worktree categories, and a no-go if full ownership cannot be proven. |
| A13-R2 | Non-delegable publication authorization | P0 | A13 states that external APK publication is blocked unless Arun provides explicit authorization and names the distribution target. Codex may classify only local debug validation status. |
| A13-R3 | Android candidate identity | P0 | A13 verifies `data/artifacts/brain-debug-v1.0.4-code5.apk` and Gradle output SHA match, versionCode/versionName are `5`/`1.0.4`, and `loggingBehavior` is present in source and synced asset config. |
| A13-R4 | Token-log regression evidence | P0 | A13 cites A12 post-fix token-log PASS evidence and says whether any fresh runtime log scan was or was not rerun. Static config alone must not be described as runtime proof. |
| A13-R5 | Root README current setup fixed | P1 | Root README current Android first-run pairing and reinstall guidance describes short-lived Android code flow, not QR scanning or "re-scan setup QR". Historical runbooks may remain historical. |
| A13-R6 | Tracker next gate corrected | P1 | `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md` no longer says the next required gate is to create A12; it points to A13 final ownership/publication closure. |
| A13-R7 | Release packet synchronized | P1 | A7 release readiness packet is updated with A13 status or explicitly points to the A13 final audit as the superseding source. |
| A13-R8 | Accessibility no-go explicit | P1 | A13 uses status `talkback_spoken_order_not_captured` if no full spoken-order audit is captured; no full Android accessibility/publication claim may rely on bounded launch smoke alone. |
| A13-R9 | Native share decision explicit | P2 | A13 distinguishes passed native note share from partial URL-share fixture; any future URL-share proof must use a deterministic, cleanable fixture endpoint. |
| A13-R10 | PM sidecar integration | P1 | If the project-manager sidecar returns before final tracker/log updates, A13 cites its artifact and incorporates non-conflicting findings. If it does not return in time, A13 records that it is still pending. |
| A13-R11 | Evidence hygiene | P0 | No raw bearer token, session cookie, pairing code, signed URL, or private credential is copied into new reports. |
| A13-R12 | Project tracker update | P1 | A13 adds a tracker update with current milestone status, owners, open gates, and next action. |
| A13-R13 | Running log update | P1 | Root `RUNNING_LOG.md` receives an append-only milestone entry at true EOF after A13 execution reaches a meaningful checkpoint. |
| A13-R14 | Goal completion guard | P0 | A13 explicitly says the overall goal remains active unless all release/publication, QA, ownership, and deployment conditions are satisfied with evidence. |

## Acceptance Tests And Checks

1. `git status --short` inventory captured in the A13 audit with changed-file counts and ownership categories.
2. `git diff --check` on all A13-created/updated files.
3. `shasum -a 256` on both `1.0.4/code5` APK locations.
4. Static config check that `capacitor.config.ts` and `android/app/src/main/assets/capacitor.config.json` contain `loggingBehavior` set to `none`.
5. A12 post-fix token-log PASS artifact cited by path; no raw token values copied.
6. Root README current Android setup section no longer instructs QR scanning or setup-QR re-scan as the current flow.
7. Delivery tracker bottom next-gate text no longer instructs creating A12.
8. A7 release readiness packet either contains A13 status or links to the A13 audit as superseding evidence.
9. Secret-pattern scan over new A13 Markdown docs for obvious token/session/pairing-code leaks.
10. PM sidecar result polled before final tracker/log update when feasible.

## Required Status Labels

| Label | Meaning |
| --- | --- |
| `web_production_deployed` | A11 web production deploy and smoke evidence stands. |
| `android_debug_candidate_validated` | A12 validates the debug APK candidate locally/emulator-side. |
| `android_publication_authorization_missing` | No human-approved external distribution target is recorded. |
| `dirty_worktree_ownership_incomplete` | Broad worktree ownership remains unresolved. |
| `talkback_spoken_order_not_captured` | Bounded TalkBack launch smoke exists, but full spoken-order evidence does not. |
| `url_share_success_not_proven` | Native note share passed; deterministic URL-share success remains unproven. |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| A13 becomes paperwork that falsely closes the release | P0 | Keep no-go gates explicit and evidence-backed. |
| README update overreaches old historical runbooks | P2 | Update only current root README setup guidance unless a stale line is directly harmful. |
| Dirty worktree ownership is too broad to close locally | P0 | Attribute known A12/A13 changes and keep final commit ownership open if full attribution is not possible. |
| Full TalkBack audit is infeasible in the current environment | P1 | Mark `talkback_spoken_order_not_captured` instead of downgrading silently. |
| Publication target is undefined | P0 | Keep `android_publication_authorization_missing` pending explicit owner/target authorization. |

## Release Status Definition

`web_production_deployed_android_debug_candidate_validated_publication_gated` means:

- Web UX v2 is production deployed and smoke-tested based on A11 evidence.
- Android `1.0.4/code5` debug APK is runtime-validated based on A12 evidence.
- External APK publication, signed release distribution, and overall goal completion are not complete.

## Out Of Scope For This PRD

- New UI feature development.
- New production deploy.
- Full release signing setup.
- Git commit, push, or pull request creation unless separately requested.
