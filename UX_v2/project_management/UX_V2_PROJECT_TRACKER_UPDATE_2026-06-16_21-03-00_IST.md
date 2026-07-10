# UX v2 Project Tracker Update - A20 P1 Blocker Fixes

Created: 2026-06-16 21:03:00 IST
Owner: PM sidecar
Status: P1 blockers fixed; final release review still pending

## Summary

A20 fixed and revalidated the two A19 P1 blockers in the staged release candidate:

1. Private sensitive surfaces now verify the signed session token instead of trusting cookie presence.
2. Ask history now remounts state when the active restored thread payload changes.

## Tracker Changes

| Area | Previous state | A20 state |
| --- | --- | --- |
| A19 verdict | `REQUEST_CHANGES` because two P1 blockers were confirmed | A20 fixes implemented and validated; request a new final staged-candidate review |
| Session-cookie auth | Stub cookies could pass selected private route/page gates | A20 first-pass private surfaces use `verifySessionCookie` or injected test verifier |
| Ask history | Client state initialized once and could stay on the wrong durable thread | `AskClient` is keyed by restored thread/message payload and remounts state on navigation |
| Validation | A18 validation passed before blockers were found | Full validation passed after A20 changes; tests now 559/78 |
| APK candidate | `1.0.4/code5`, debug candidate only | Revalidated by build-apk; same SHA-256 `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7` |

## Evidence

- PRD v2: `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V2_2026-06-16_20-54-00_IST.md`
- Plan v2: `UX_v2/features/FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_V2_2026-06-16_20-57-00_IST.md`
- QA report: `UX_v2/execution/UX_V2_A20_P1_BLOCKER_FIXES_QA_2026-06-16_21-03-00_IST.md`

## Remaining Gates

1. Restage exact A20 source/test/governance paths and rerun staged-index checks.
2. Run a new final staged-candidate review after A20 is staged.
3. Obtain explicit APK publication/distribution authorization.
4. Decide whether full TalkBack spoken-order audit and URL-share success proof are required before publication.
5. Keep root `RUNNING_LOG.md` append-only and unstaged unless explicitly approved for a log-only staging slice.
