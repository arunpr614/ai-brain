# Feature Release A12 Authenticated Android Publication Gate PRD V2

Created: 2026-06-16 15:52:00 IST
Owner: Main Codex execution agent
Status: Approved for implementation planning after adversarial review closure
Supersedes: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_V1_2026-06-16_15-47-37_IST.md`
Adversarial review: `FEATURE_RELEASE_A12_AUTHENTICATED_ANDROID_PUBLICATION_GATE_PRD_ADVERSARIAL_REVIEW_2026-06-16_15-48-59_IST.md`
Source handover: `Handover_docs/AI_MEMORY_UX_V2_PRODUCTION_ANDROID_HANDOVER_2026-06-16_15-04-24_IST.md`
PM tracker: `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`

## Objective

Close, or explicitly keep blocked, the remaining Android publication gate for UX v2 by gathering direct APK/WebView evidence for authenticated runtime behavior, native share entry paths, session and pairing persistence, offline/stale-cache recovery, Android keyboard behavior, TalkBack accessibility, APK candidate identity, mutation cleanup, and final release ownership. A12 must not treat browser-mobile screenshots, static preflight, CDP session injection, or locked-screen launch as sufficient proof for APK publication.

## Adversarial Review Closure

| Review finding | V2 resolution |
| --- | --- |
| Production share/capture tests can pollute the real library | Adds A12-R15 mutation isolation/cleanup as a P0 publication gate. Native share proof must record temporary fixture policy, redacted item handle/hash, cleanup result, and post-cleanup verification or keep publication blocked. |
| APK candidate freshness/hash matching is not a first-class gate | Adds A12-R16 APK identity/freshness as a P0 gate with version, artifact paths, SHA-256 chain, install package version when available, source HEAD, and rebuild/reinstall rule after code/config changes. |
| Authenticated route proof can be mistaken for pairing/session proof | Splits evidence labels into `android_authenticated_route_via_session` and `android_pairing_token_runtime`; CDP/session injection cannot satisfy pairing-token persistence. |
| TalkBack "or equivalent" is too vague | Defines acceptable TalkBack alternatives as a manual/recorded checklist with route, element order, expected spoken label, actual result, and pass/fail. Screenshot-only evidence cannot satisfy TalkBack. |
| Offline/stale-cache acceptance lacks stale-version proof | Adds cache-version/update/reload evidence to A12-R9 and an explicit stale-shell recovery gate. |
| Final release ownership review lacks output path | Adds required ownership report path `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_<timestamp>.md`. |

## Current State

| Area | Evidence today | A12 interpretation |
| --- | --- | --- |
| Web production | A11 deployed production, ran route smoke, provider proof, live Ask SSE proof, backup, and observability checks. | Web production is not the blocker. Do not redeploy unless A12 uncovers a web fix that must ship. |
| APK candidate | A11 built `brain-debug-v1.0.3-code4.apk`, installed it on `Brain_API_36`, launched it, and captured locked-shell privacy evidence. | Candidate exists, but A12 must re-confirm the artifact/hash/source/install chain before any publication-ready claim. |
| Android A1-A5 feature QA | Browser-mobile evidence exists for shell/library/more/offline, capture/repair/needs-upgrade, Ask/item detail, topic/collection, login/pairing/session. | Useful regression context only; not APK-publication proof. |
| Android A6 preflight | Runtime and client-state preflight exists. | Preflight does not prove authenticated runtime, native share, stale-cache recovery, keyboard, or TalkBack behavior. |
| Release packet | A7/A11 release packet says `web_production_deployed_android_candidate_partial`. | A12 must either move release to APK-publication-ready with evidence or leave it blocked. |
| Delivery tracker | PM sidecar created `UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`. | Treat this as the current PM evidence map for A12 tracking. |

## Goals

1. Prove authenticated Android WebView route behavior on the installed APK candidate without persisting raw production credentials, cookies, pairing codes, tokens, item IDs, or private content.
2. Prove native Android share entry behavior for URL/text, single PDF, and multi-PDF/rejection paths, including result screens, failure handling, and production mutation cleanup.
3. Prove session persistence separately from pairing-token persistence. CDP/session injection can prove route rendering only; it cannot prove pairing-token runtime behavior.
4. Prove no private-count leakage while locked, expired, logged out, or relaunched.
5. Prove WebView offline fallback and stale-cache recovery using deployed production origin, service-worker/cache evidence, and packaged fallback assets.
6. Prove Android keyboard usability for PIN/unlock, Ask composer, Capture, and Repair inputs.
7. Capture TalkBack evidence or an acceptable manual/recorded checklist; otherwise mark the gate blocked.
8. Prove APK candidate identity and freshness before publication-ready status.
9. Perform final release ownership review of the broad dirty worktree before any APK publication or final goal-complete claim.
10. Update the release packet, milestone tracker, project tracker, running log, and final handover/QA evidence.

## Non-Goals

- Do not redesign UI or reopen completed web feature implementation unless A12 finds a blocking Android runtime defect.
- Do not mutate Magic Patterns designs or publish Magic Patterns artifacts.
- Do not change Android package ID, signing scheme, distribution channel, or version metadata unless the implementation plan requires a fresh candidate after code/config changes.
- Do not publish or share an APK if any A12 P0/P1 publication gate is missing, failed, blocked, stale, only indirectly evidenced, or invalidated by dirty-worktree ownership risk.
- Do not print, store, or screenshot raw secrets, production PINs, signed sessions, bearer tokens, pairing codes, device serials, private item titles, raw item IDs, raw Ask answers, or full production test URLs that expose private context.

## Stakeholders

| Stakeholder | Need |
| --- | --- |
| Arun | Confidence that the Android APK behaves correctly enough to publish/use, not just that the web app is deployed. |
| Future AI agent | Evidence and exact blockers that survive handoff without chat history. |
| Release owner | Clean release verdict, rollback path, artifact hash, ownership review, and residual risk list. |

## Evidence Levels

| Evidence label | Definition | Can satisfy APK publication? |
| --- | --- | --- |
| `browser_mobile_only` | Responsive browser screenshot or local browser script. | No. |
| `static_preflight_only` | File/config/build inspection without installed APK route proof. | No. |
| `android_locked_shell` | Installed APK launches to locked/unauthenticated WebView shell. | No, except locked privacy gate. |
| `android_authenticated_route_via_session` | Installed APK WebView is authenticated through a redacted web session and route-specific UI/console/network evidence is captured. | Yes for protected route rendering only. |
| `android_pairing_token_runtime` | Installed APK completes or preserves a pairing-token path through Capacitor/native state and proves behavior after relaunch. | Yes for pairing/persistence only. |
| `android_native_entry` | Android OS intent entry path is invoked against installed APK and result behavior is captured. | Yes for share/deep-link gates. |
| `android_accessibility_runtime` | TalkBack transcript/video/manual checklist or keyboard runtime proof with route, element, expected behavior, actual behavior, and pass/fail. | Yes for accessibility gate. |
| `apk_identity_verified` | Source HEAD, APK paths, version, SHA-256 chain, and installed package version evidence agree. | Required for any publication-ready claim. |
| `mutation_cleanup_verified` | Temporary production object policy, redacted handle/hash, cleanup action, and post-cleanup verification are recorded. | Required for native share mutation gates. |
| `blocked_with_reason` | Environment/tooling/auth/device limitation prevents proof. | No; keeps publication blocked. |

## Requirements

| ID | Requirement | Priority | Acceptance evidence |
| --- | --- | --- | --- |
| A12-R1 | Establish an Android runtime harness for `Brain_API_36` or another explicit emulator/device target. | P0 | Evidence records emulator/device target, APK path, install state, app focus, WebView DevTools/socket availability if used, and cleanup state. |
| A12-R2 | Authenticate the installed APK WebView without exposing secrets. | P0 | Evidence records redacted method, session-auth route access, and no raw cookie/PIN/token in files. This satisfies only route rendering, not pairing-token persistence. |
| A12-R3 | Validate authenticated protected routes: `/library`, `/ask`, `/capture`, `/more`, `/settings`, `/settings/device-pairing`, `/items/[id]`, `/items/[id]/repair`, `/topics/[slug]`, and `/collections/[id]`. | P0 | Per-route screenshot or UI tree plus console/network summary, all from installed APK WebView. |
| A12-R4 | Validate native URL/text share intent. | P0 | Android intent command, result route/state, screenshot/UI tree, no token/URL secret leakage, and mutation cleanup proof if an item is created or updated. |
| A12-R5 | Validate single-PDF share intent. | P0 | Staged test PDF path, grantable URI or documented Android-safe path, result state, screenshot/UI tree, and cleanup of emulator file and production item if created. |
| A12-R6 | Validate multi-PDF share handling. | P1 | Result state proves approved rejection or supported behavior; no silent success claim; cleanup proof if any item is created. |
| A12-R7 | Validate session persistence after force-stop/relaunch. | P0 | Before/after evidence for app restart; session remains valid or expired state is truthful. |
| A12-R8 | Validate pairing-token runtime separately from session persistence. | P0 | Real pairing exchange or existing redacted token-preservation proof survives relaunch. If only CDP/session injection is used, this requirement is blocked. |
| A12-R9 | Validate locked privacy after session expiry/logout/relaunch. | P0 | Locked shell has no private counts, item names, source names, raw IDs, or private queue details. |
| A12-R10 | Validate offline fallback and stale-cache recovery in WebView. | P0 | Network-offline or CDP-emulated offline proof, bundled fallback display, no false offline queue/sync claim, current cache/version evidence, update/reload path, and recovery after network restore. |
| A12-R11 | Validate keyboard behavior for PIN/unlock, Ask composer, Capture note/URL/PDF as applicable, and Repair text input. | P1 | Runtime screenshots/UI observations show keyboard-safe layout, reachable submit controls, and no critical overlap. |
| A12-R12 | Validate TalkBack or acceptable Android accessibility checklist. | P1 | TalkBack transcript/video, or manual checklist with route, element order, expected spoken label, actual result, and pass/fail. Screenshot-only evidence is insufficient. |
| A12-R13 | Run final release ownership review against the dirty worktree. | P0 | `UX_v2/execution/UX_V2_A12_RELEASE_OWNERSHIP_REVIEW_<timestamp>.md` lists UX v2-owned tracked/untracked changes, unrelated changes, commit/staging recommendation, and unresolved ownership risks. |
| A12-R14 | Update release packet and trackers. | P0 | A7 release packet, milestone tracker, PM tracker, A12 QA report, and running log reflect final A12 result. |
| A12-R15 | Keep secret hygiene enforceable. | P0 | Redaction scan over A12 evidence finds no raw sessions, tokens, pairing codes, PINs, private item IDs, device serials, or private source text. |
| A12-R16 | Verify production mutation isolation and cleanup for share tests. | P0 | Temporary fixture naming policy, redacted item handles/hashes, result classification, cleanup action, and post-cleanup verification are recorded; otherwise share publication gate remains blocked. |
| A12-R17 | Verify APK identity/freshness chain. | P0 | Source HEAD, worktree ownership caveat, `versionName`, `versionCode`, Gradle output path, published artifact path, SHA-256 for both, install package version when available, and rebuild/reinstall after code/config changes. |

## Acceptance Criteria

1. A12 PRD and implementation plan complete the PRD v1 -> adversarial review -> PRD v2 -> implementation plan v1 -> adversarial review -> implementation plan v2 cycle.
2. A12 QA report records one status for each required gate: `passed`, `failed`, `blocked`, or `deferred_by_explicit_decision`.
3. APK publication remains `blocked` if any P0 requirement is not `passed`.
4. APK publication remains `blocked` if any P1 requirement is not `passed`, unless the final release packet explicitly records owner acceptance and why user trust/safety is not compromised.
5. Evidence is direct enough to support the claim: authenticated Android claims require installed APK/WebView evidence, native share claims require OS intent evidence, and pairing persistence requires pairing-token runtime evidence.
6. Any code or config change discovered during A12 gets its own focused validation and requires a fresh APK candidate plus affected Android evidence rerun before publication-ready status.
7. No raw secrets or private production content are persisted in markdown, JSON, screenshots, UI trees, terminal transcripts, or tracker files.
8. Final release packet states one of:
   - `apk_publication_ready`
   - `apk_publication_blocked`
   - `apk_publication_deferred_by_owner`
9. APK publication cannot be `ready` unless `apk_identity_verified` and `mutation_cleanup_verified` are either passed or not applicable with evidence.
10. CDP/session injection can satisfy route rendering only. It cannot satisfy A12-R8 pairing-token runtime.

## Release Decision Rules

| Condition | Decision |
| --- | --- |
| All P0/P1 Android runtime gates pass, APK identity is verified, mutation cleanup is verified, and ownership review has no P0/P1 blockers | APK may be marked publication-ready. |
| Any P0 gate is failed/missing/blocked | APK publication remains blocked. |
| Any P1 gate is failed/missing/blocked | APK publication remains blocked unless explicitly owner-accepted in the release packet. |
| A12 uses CDP/session injection but no real pairing-token proof | Authenticated routes may pass; pairing/session publication gate remains blocked. |
| A12 requires app code/config changes | Rebuild APK, reinstall, and rerun affected Android evidence before publication-ready status. |
| Evidence contains raw secrets/private data | Evidence package is invalid until removed/redacted via a new correction artifact. |
| Production mutation cleanup is missing | Native share publication gate remains blocked even if screenshots look correct. |

## QA And Tooling Expectations

- Prefer installed APK/WebView evidence through emulator/CDP where feasible.
- Use `adb`/emulator commands with environment-scoped Android SDK paths from the handover.
- Use screenshots and UI trees saved under `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a12/`.
- Use a clearly named temporary share URL/PDF fixture that is safe to delete or verify as duplicate.
- Redact or hash sensitive identifiers before writing docs.
- Record cleanup: emulator stopped or intentionally left running, `adb forward` removed, temporary PDFs removed, temporary production objects cleaned up if created, and temporary session invalidated if feasible.
- Record APK SHA-256 and installed package metadata before route/share claims.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Session injection bypasses a real user path and gives false confidence | P1 | Split route-auth and pairing-token evidence; CDP injection cannot satisfy pairing-token persistence. |
| Android share PDF URI setup becomes more complex than expected | P1 | Treat as blocked rather than approximating with browser upload. |
| Production share proof creates test library pollution | P1 | Require mutation isolation/cleanup proof before share gate can pass. |
| Offline/stale-cache proof disrupts emulator state | P2 | Use a dedicated emulator profile/state and document cleanup/recovery. |
| TalkBack automation may be unavailable in the local environment | P1 | Capture manual checklist or mark blocked; do not silently waive. |
| Broad dirty worktree obscures release ownership | P0 | A12 must include final ownership review before publication-ready claim. |
| APK candidate may not match current source | P1 | Require APK identity/freshness chain and rebuild/reinstall after any source/config change. |

## Out Of Scope Deferred Items

- QR pairing unless separately approved.
- Biometric unlock.
- True offline item library/sync.
- Telemetry/product analytics.
- Android package ID migration.
- Embedded media player.

## Completion Statement

A12 is complete only when the QA report, final release packet, trackers, and running log agree on the APK-publication verdict and that verdict is backed by direct evidence. A blocked verdict is a valid A12 outcome but does not complete the user's full project goal.
