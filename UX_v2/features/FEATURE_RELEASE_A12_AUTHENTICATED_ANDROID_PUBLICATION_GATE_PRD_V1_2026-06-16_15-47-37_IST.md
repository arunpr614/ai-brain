# Feature Release A12 Authenticated Android Publication Gate PRD V1

Created: 2026-06-16 15:47:37 IST
Owner: Main Codex execution agent
Status: Draft for adversarial review
Source handover: `Handover_docs/AI_MEMORY_UX_V2_PRODUCTION_ANDROID_HANDOVER_2026-06-16_15-04-24_IST.md`

## Objective

Close, or explicitly keep blocked, the remaining Android publication gate for UX v2 by gathering direct APK/WebView evidence for authenticated runtime behavior, native share entry paths, session and pairing persistence, offline/stale-cache recovery, Android keyboard behavior, TalkBack accessibility, and final release ownership. A12 must not treat browser-mobile screenshots, static preflight, or locked-screen launch as sufficient proof for APK publication.

## Current State

| Area | Evidence today | A12 interpretation |
| --- | --- | --- |
| Web production | A11 deployed production, ran route smoke, provider proof, live Ask SSE proof, backup, and observability checks. | Web production is not the blocker. Do not redeploy unless A12 uncovers a web fix that must ship. |
| APK candidate | A11 built `brain-debug-v1.0.3-code4.apk`, installed it on `Brain_API_36`, launched it, and captured locked-shell privacy evidence. | Candidate exists, but publication remains blocked. |
| Android A1-A5 feature QA | Browser-mobile evidence exists for shell/library/more/offline, capture/repair/needs-upgrade, Ask/item detail, topic/collection, login/pairing/session. | Useful regression context only; not APK-publication proof. |
| Android A6 preflight | Runtime and client-state preflight exists. | Preflight does not prove authenticated runtime, native share, stale-cache recovery, keyboard, or TalkBack behavior. |
| Release packet | A7/A11 release packet says `web_production_deployed_android_candidate_partial`. | A12 must either move release to APK-publication-ready with evidence or leave it blocked. |

## Goals

1. Prove authenticated Android WebView route behavior on the installed APK candidate without persisting raw production credentials, cookies, pairing codes, tokens, item IDs, or private content.
2. Prove native Android share entry behavior for URL/text, single PDF, and multi-PDF/rejection paths, including result screens and failure handling.
3. Prove session and pairing persistence after app force-stop/relaunch and no private-count leakage while locked.
4. Prove WebView offline fallback and stale-cache recovery behavior using the deployed production origin and packaged fallback assets.
5. Prove Android keyboard usability for PIN/unlock, Ask composer, Capture, and Repair inputs.
6. Capture TalkBack/accessibility evidence for core navigation and forms, or record exact blocker if the local environment cannot run it.
7. Perform final release ownership review of the broad dirty worktree before any APK publication or final goal-complete claim.
8. Update the release packet, milestone tracker, project tracker, running log, and final handover/QA evidence.

## Non-Goals

- Do not redesign UI or reopen completed web feature implementation unless A12 finds a blocking Android runtime defect.
- Do not mutate Magic Patterns designs or publish Magic Patterns artifacts.
- Do not change Android package ID, signing scheme, distribution channel, or version metadata unless the implementation plan requires a fresh candidate after code changes.
- Do not publish or share an APK if any A12 P0/P1 publication gate is missing, failed, or only indirectly evidenced.
- Do not print, store, or screenshot raw secrets, production PINs, signed sessions, bearer tokens, pairing codes, device serials, private item titles, raw item IDs, or raw Ask answers.

## Stakeholders

| Stakeholder | Need |
| --- | --- |
| Arun | Confidence that the Android APK behaves correctly enough to publish/use, not just that the web app is deployed. |
| Future AI agent | Evidence and exact blockers that survive handoff without chat history. |
| Release owner | Clean release verdict, rollback path, artifact hash, and residual risk list. |

## Evidence Levels

| Evidence label | Definition | Can satisfy APK publication? |
| --- | --- | --- |
| `browser_mobile_only` | Responsive browser screenshot or local browser script. | No. |
| `static_preflight_only` | File/config/build inspection without installed APK route proof. | No. |
| `android_locked_shell` | Installed APK launches to locked/unauthenticated WebView shell. | No, except locked privacy gate. |
| `android_authenticated_route` | Installed APK WebView is authenticated and route-specific UI/console/network evidence is captured. | Yes for protected route gates. |
| `android_native_entry` | Android OS intent entry path is invoked against installed APK and result behavior is captured. | Yes for share/deep-link gates. |
| `android_accessibility_runtime` | Keyboard/TalkBack or equivalent Android runtime accessibility proof is captured. | Yes for accessibility gate. |
| `blocked_with_reason` | Environment/tooling/auth/device limitation prevents proof. | No; keeps publication blocked. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A12-R1 | Establish an Android runtime harness for `Brain_API_36` or another explicit emulator/device target. | P0 | Evidence records emulator/device target, APK path, install state, app focus, WebView DevTools/socket availability if used, and cleanup state. |
| A12-R2 | Authenticate the installed APK WebView without exposing secrets. | P0 | Evidence records redacted method, cookie/session injection or pairing/unlock path, protected-route access, and no raw cookie/PIN/token in files. |
| A12-R3 | Validate authenticated protected routes: `/library`, `/ask`, `/capture`, `/more`, `/settings`, `/settings/device-pairing`, `/items/[id]`, `/items/[id]/repair`, `/topics/[slug]`, and `/collections/[id]`. | P0 | Per-route screenshot or UI tree plus console/network summary, all from installed APK WebView. |
| A12-R4 | Validate native URL/text share intent. | P0 | Android intent command, result route/state, screenshot/UI tree, and no token/URL secret leakage. |
| A12-R5 | Validate single-PDF share intent. | P0 | Staged test PDF path, grantable URI or documented Android-safe path, result state, screenshot/UI tree, and cleanup. |
| A12-R6 | Validate multi-PDF share handling. | P1 | Result state proves approved rejection or supported behavior; no silent success claim. |
| A12-R7 | Validate session/pairing persistence after force-stop/relaunch. | P0 | Before/after evidence for app restart; session remains valid or expired state is truthful; pairing token remains usable or failure is clear. |
| A12-R8 | Validate locked privacy after session expiry/logout/relaunch. | P0 | Locked shell has no private counts, item names, source names, raw IDs, or private queue details. |
| A12-R9 | Validate offline fallback and stale-cache recovery in WebView. | P0 | Network-offline or CDP-emulated offline proof, bundled fallback display, no false offline queue/sync claim, recovery after network restore/reload. |
| A12-R10 | Validate keyboard behavior for PIN/unlock, Ask composer, Capture note/URL/PDF as applicable, and Repair text input. | P1 | Runtime screenshots/UI observations show keyboard-safe layout, reachable submit controls, and no critical overlap. |
| A12-R11 | Validate TalkBack or equivalent Android accessibility for bottom navigation, primary actions, forms, and sheets. | P1 | TalkBack labels/order evidence or exact tooling blocker; blocker prevents publication-ready claim unless explicitly accepted. |
| A12-R12 | Run final release ownership review against the dirty worktree. | P0 | Report lists UX v2-owned tracked/untracked changes, unrelated changes, commit/staging recommendation, and unresolved ownership risks. |
| A12-R13 | Update release packet and trackers. | P0 | A7 release packet, milestone tracker, PM tracker, A12 QA report, and running log reflect final A12 result. |
| A12-R14 | Keep secret hygiene enforceable. | P0 | Redaction scan over A12 evidence finds no raw sessions, tokens, pairing codes, PINs, private item IDs, or device serials. |

## Acceptance Criteria

1. A12 PRD and implementation plan complete the PRD v1 -> adversarial review -> PRD v2 -> implementation plan v1 -> adversarial review -> implementation plan v2 cycle.
2. A12 QA report records one status for each required gate: `passed`, `failed`, `blocked`, or `deferred_by_explicit_decision`.
3. APK publication remains `blocked` if any P0 requirement is not `passed`.
4. APK publication remains `blocked` if any P1 requirement is not `passed`, unless the final release packet explicitly records owner acceptance and why user trust/safety is not compromised.
5. Evidence is direct enough to support the claim: authenticated Android claims require installed APK/WebView evidence, and native share claims require OS intent evidence.
6. Any code or config change discovered during A12 gets its own focused validation and may require a fresh APK candidate before publication evidence can pass.
7. No raw secrets or private production content are persisted in markdown, JSON, screenshots, terminal transcripts, or tracker files.
8. Final release packet states one of:
   - `apk_publication_ready`
   - `apk_publication_blocked`
   - `apk_publication_deferred_by_owner`

## Release Decision Rules

| Condition | Decision |
| --- | --- |
| All P0/P1 Android runtime gates pass and ownership review has no P0/P1 blockers | APK may be marked publication-ready. |
| Any P0 gate is failed/missing/blocked | APK publication remains blocked. |
| Any P1 gate is failed/missing/blocked | APK publication remains blocked unless explicitly owner-accepted in the release packet. |
| A12 requires app code changes | Rebuild APK, reinstall, and rerun affected Android evidence before publication-ready status. |
| Evidence contains raw secrets/private data | Evidence package is invalid until removed/redacted via a new correction artifact. |

## QA And Tooling Expectations

- Prefer installed APK/WebView evidence through emulator/CDP where feasible.
- Use `adb`/emulator commands with environment-scoped Android SDK paths from the handover.
- Use screenshots and UI trees saved under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/`.
- Redact or hash sensitive identifiers before writing docs.
- Record cleanup: emulator stopped or left intentionally running, `adb forward` removed, temporary PDFs removed, temporary production objects cleaned up if created.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Session injection bypasses a real user path and gives false confidence | P1 | Prefer real pairing/unlock if feasible; if CDP injection is used, also validate logout/expiry and pairing surface truth. |
| Android share PDF URI setup becomes more complex than expected | P1 | Treat as blocked rather than approximating with browser upload. |
| Offline/stale-cache proof disrupts emulator state | P2 | Use a dedicated emulator profile/state and document cleanup/recovery. |
| TalkBack automation may be unavailable in the local environment | P1 | Capture manual-equivalent evidence or mark blocked; do not silently waive. |
| Broad dirty worktree obscures release ownership | P0 | A12 must include final ownership review before publication-ready claim. |

## Out Of Scope Deferred Items

- QR pairing unless separately approved.
- Biometric unlock.
- True offline item library/sync.
- Telemetry/product analytics.
- Android package ID migration.
- Embedded media player.

## Completion Statement

A12 is complete only when the QA report, final release packet, trackers, and running log agree on the APK-publication verdict and that verdict is backed by direct evidence. A blocked verdict is a valid A12 outcome but does not complete the user's full project goal.
