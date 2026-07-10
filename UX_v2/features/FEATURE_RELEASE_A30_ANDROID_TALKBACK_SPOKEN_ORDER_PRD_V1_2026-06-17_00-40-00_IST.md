# Feature Release A30 - Android TalkBack Spoken Order PRD v1

Created: 2026-06-17 00:40:00 IST
Owner: Codex
Status: Draft for adversarial review
Related gates: A12 Android publication gate, A29 native Android URL-share proof

## Problem

The UX v2 web app is deployed and the Android debug candidate `1.0.5/code6` has direct emulator evidence for authenticated routes, native note share, native URL share, offline/recovery, keyboard smoke, and log hygiene. The remaining Android evidence gap is accessibility: A12 enabled TalkBack for a bounded launch smoke, but it did not capture spoken order or screen-reader labels across real app flows.

Without a spoken-order audit, APK publication cannot honestly claim Android accessibility readiness unless Arun explicitly accepts that risk.

## Goal

Close or explicitly keep blocked the `talkback_spoken_order_not_captured` gate by auditing the Android APK candidate's accessible order and labels for core routes and share-result screens.

## Non-Goals

- Do not publish, sign, upload, or distribute an APK.
- Do not change UI copy or accessibility attributes unless the audit finds a release-blocking defect that can be fixed safely in this slice.
- Do not mutate production data.
- Do not stage root `RUNNING_LOG.md`, raw logs, screenshots, APKs, DBs, `.env`, keystores, `assets/`, or `data/artifacts/`.
- Do not claim full Android publication readiness unless publication authorization is separately provided.

## Scope

Audit the installed Android APK `com.arunprakash.brain` on `Brain_API_36` or a clearly named replacement emulator/device. Use APK `1.0.5/code6` unless a code/config fix forces a fresh candidate.

Minimum screens:

1. Locked/unpaired launch screen.
2. Library.
3. Ask.
4. Capture.
5. More.
6. Device pairing.
7. Native share saved-result screen for URL or note.
8. Native share failure/result state if safely reachable without production pollution.

## Requirements

| ID | Requirement | Priority | Evidence |
| --- | --- | --- | --- |
| A30-R1 | Verify APK identity before accessibility evidence. | P0 | Installed package version and APK path/hash are recorded. |
| A30-R2 | Capture an accessibility tree or manual-equivalent checklist for each scoped screen. | P0 | Evidence includes route/screen, element order, role/type when available, expected label, observed label/result, pass/fail, and evidence path. |
| A30-R3 | Confirm bottom navigation order and labels are stable. | P1 | Library, Capture, Ask, and More appear once, in expected order, with useful labels. |
| A30-R4 | Confirm primary actions and forms are announced clearly. | P1 | Unlock/pairing, Ask composer, Capture controls, and share result actions expose names and are reachable. |
| A30-R5 | Confirm private content is not exposed on locked screen. | P0 | Locked screen accessibility content has no private counts, item titles, source names, raw IDs, or queue details. |
| A30-R6 | Preserve secret and production-data hygiene. | P0 | Evidence excludes raw tokens, pairing codes, private item IDs/titles/source text, full private answers, and device serials. |
| A30-R7 | Update release packet, milestone tracker, delivery tracker, PM update, and running log. | P0 | All trackers agree whether TalkBack is passed, blocked, or owner-accepted. |

## Acceptance Criteria

1. A30 completes PRD v1 -> adversarial review -> PRD v2 -> implementation plan v1 -> plan adversarial review -> implementation plan v2 before execution.
2. The QA report records each audited screen as `passed`, `failed`, `blocked`, or `not_applicable`.
3. TalkBack/spoken-order closes only if the evidence is stronger than screenshots alone.
4. If automation cannot observe true spoken output, the report must state the exact equivalent evidence used and the remaining risk.
5. APK publication remains blocked unless publication authorization and signing/distribution target are separately provided.

## No-Go Conditions

- APK identity cannot be confirmed.
- Accessibility order evidence is only screenshots.
- Locked state exposes private data through visible text or accessibility content.
- Evidence includes raw secrets or private production content.
- A blocking accessibility defect is found and not fixed or explicitly owner-accepted.
