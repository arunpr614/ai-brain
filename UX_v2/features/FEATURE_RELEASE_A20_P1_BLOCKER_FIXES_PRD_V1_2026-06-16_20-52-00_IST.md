# Feature Release A20 P1 Blocker Fixes PRD V1

Created: 2026-06-16 20:52:00 IST
Owner: Codex
Status: Draft for adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Depends on: `UX_v2/execution/UX_V2_A19_FINAL_STAGED_CANDIDATE_REVIEW_2026-06-16_20-48-00_IST.md`

## Problem Statement

A19 requested changes on the staged UX v2 release candidate. Two P1 blockers must be fixed before commit consideration:

1. Sensitive private surfaces trust a non-empty `brain-session` cookie instead of verifying its HMAC.
2. Ask history can display or write to the wrong durable thread after navigating between `?thread=` history links.

A20 must fix these two blockers, add regression coverage, restage the changed candidate, and rerun validation. A20 should not broaden into optional P2/P3 polish unless the fix is tiny and low-risk.

## Goals

1. Require verified session tokens for device-pairing token/code surfaces and private server-rendered pages named in A19.
2. Add invalid-cookie regression coverage for the token/code API.
3. Reset or remount Ask client state when the active thread prop changes.
4. Add feasible regression coverage for Ask thread-state reset, or document manual QA if component-level coverage is not practical in the existing test stack.
5. Rerun affected tests, typecheck, lint, full tests, build, and staged diff checks.
6. Update the A19 request-changes status with A20 fixed/revalidated evidence.

## Non-Goals

- Do not publish, deploy, commit, push, or open a PR in A20.
- Do not claim APK publication authorization.
- Do not stage root `RUNNING_LOG.md`.
- Do not fix every legacy presence-only API unless needed to close the confirmed P1 or validation failures.
- Do not hide A19 P2/P3 findings; explicitly defer or resolve them.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A20-R1 | Verified session for sensitive token API | P0 | `GET` and `POST /api/settings/device-pairing` reject missing and invalid cookies; valid signed sessions still work. |
| A20-R2 | Verified session for private server pages | P0 | `/settings/device-pairing`, `/library`, and `/more` verify the session before rendering private data or token UI. |
| A20-R3 | Ask thread reset | P0 | Ask client resets `turns`, pending state, and active thread when `threadId`/initial messages change. |
| A20-R4 | Regression tests | P0 | Token/code API invalid-cookie tests exist; Ask reset has unit-level helper coverage or documented manual QA. |
| A20-R5 | Validation | P0 | Typecheck, lint, affected tests, full tests, build, and staged diff checks pass. |
| A20-R6 | Review continuity | P1 | A20 report/tracker/log update state that A19 P1 blockers are fixed or still blocked. |

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Invalid-session hardening breaks test fixtures using stub cookies | P1 | Start with confirmed token/private page surfaces; update focused tests to use injected verifier or signed sessions. |
| Ask reset drops in-flight response during navigation | P1 | Clear pending state on thread prop change; route navigation should treat old stream as stale UI. |
| Fix invalidates A18 validation | P0 | Rerun validation after staging A20 changes. |

## Completion Definition

A20 is complete when both A19 P1 blockers are fixed or explicitly blocked, regression coverage exists, validation passes, trackers/log are updated, and the release candidate is ready for another final review pass.
