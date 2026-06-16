# Feature Release A20 P1 Blocker Fixes PRD V2

Created: 2026-06-16 20:54:00 IST
Owner: Codex
Status: Approved for implementation planning after adversarial review
Branch: `codex/ai-brain-ux-v2-execution`
Supersedes: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V1_2026-06-16_20-52-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_ADVERSARIAL_REVIEW_2026-06-16_20-53-00_IST.md`

## Problem Statement

A19 requested changes on the staged UX v2 release candidate. Two P1 blockers must be fixed before commit consideration:

1. Sensitive private surfaces trust a non-empty `brain-session` cookie instead of verifying its HMAC.
2. Ask history can display or write to the wrong durable thread after navigating between `?thread=` history links.

A20 must fix these blockers, add regression coverage, restage the changed candidate, and rerun validation.

## Goals

1. Add shared verified-session helpers for request cookies and server cookie values.
2. Require verified session tokens for confirmed token/code API and private server-rendered pages.
3. Extend verified-session enforcement to staged private data APIs that currently rely on cookie presence where tests can be safely updated in A20.
4. Add invalid-cookie regression coverage for device pairing and at least one private data API.
5. Reset Ask client state when the active thread prop changes.
6. Add regression coverage for the Ask reset path through a small pure helper or component-level test if available.
7. Rerun affected tests, typecheck, lint, full tests, build, staged diff check, and APK build if Android/public source changed.
8. Update the A19 request-changes status with A20 fixed/revalidated evidence.

## Non-Goals

- Do not publish, deploy, commit, push, or open a PR in A20.
- Do not claim APK publication authorization.
- Do not stage root `RUNNING_LOG.md`.
- Do not fix P2/P3 polish unless it is low-risk and does not distract from the P1s.
- Do not silently defer remaining presence-only private APIs; record any remaining routes as explicit follow-up risk.

## Requirements

| ID | Requirement | Priority | Acceptance Criteria |
| --- | --- | --- | --- |
| A20-R1 | Shared verified-session helpers | P0 | Private routes/pages use reusable helpers rather than ad hoc cookie presence checks. |
| A20-R2 | Token API hardening | P0 | `GET` and `POST /api/settings/device-pairing` reject missing and invalid cookies; valid signed sessions or injected valid verifiers still work. |
| A20-R3 | Private page hardening | P0 | `/settings/device-pairing`, `/library`, and `/more` verify session tokens before rendering private data. |
| A20-R4 | Private API hardening | P1 | Staged private data APIs touched by the release use verified-session helper, or remaining routes are listed as follow-up risk. |
| A20-R5 | Ask thread reset | P0 | Ask client resets `turns`, pending state, and active thread when `threadId`/initial messages change. |
| A20-R6 | Regression tests | P0 | Invalid-cookie tests and Ask reset helper/component tests exist. |
| A20-R7 | Validation | P0 | Typecheck, lint, affected tests, full tests, build, and staged diff checks pass. |
| A20-R8 | Review continuity | P1 | A20 report/tracker/log update state that A19 P1 blockers are fixed or still blocked. |

## Completion Definition

A20 is complete when both A19 P1 blockers are fixed or explicitly blocked, regression coverage exists, validation passes, trackers/log are updated, and the release candidate is ready for another final review pass.
