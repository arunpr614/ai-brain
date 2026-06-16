# UX v2 A7 Code Review

Created: 2026-06-16 13:18:00 IST
Updated: 2026-06-16 14:20:00 IST after release-review sidecar completion, A8 remediation, and A9 accessibility sweep
Reviewer: Main Codex execution agent
Status: Release-blocking review complete; release-review sidecar findings integrated; A8 privacy/evidence fixes completed locally.

## Findings

| Severity | Finding | Evidence | Required resolution |
| --- | --- | --- | --- |
| P1 | Android runtime and APK evidence are still missing, so Android-complete and production release claims are blocked. | A6 reports `preflight_passed`, `runtime_blocked`, and `release_blocked`; `adb` was not found; existing APKs are stale or unproven; direct VIEW `/setup-apk` is unsupported. See `UX_v2/execution/ANDROID_A6_RUNTIME_CLIENT_STATE_QA_2026-06-16_13-04-00_IST.md:29`, `:34`, `:36`, `:39`, `:43`, `:44`, `:45`. | Install/connect Android tooling and device/emulator; run fresh local APK validation or version-bumped APK publication; capture install/relaunch, WebView asset pickup, authenticated routes, share, pairing persistence, offline, and stale-cache evidence. |
| P1 | Production deploy safety gates have not run. | A6 tracker update still lists code review/release packet, backup/rollback, production deploy, live smoke, and observability as remaining work. See `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-04-00_IST.md:51` through `:56`. | Before deploy, create verified production backup, integrity check, item-count sanity, rollback command, deploy run, live smoke, and observability proof. |
| P1 | Android runtime accessibility proof remains open; local web accessibility is closed. | A9 closed keyboard, focus, touch-target, and 200 percent reflow proxy checks locally with 0 sweep issues. See `UX_v2/execution/UX_V2_A9_ACCESSIBILITY_FINAL_SWEEP_QA_2026-06-16_14-20-00_IST.md`. | Keep Android TalkBack/APK keyboard evidence in the Android runtime gate before Android-complete or production-release claims. |
| P1 | Live Ask citation/provider proof remains pending. | Integrated QA lists “Live Ask citations with reachable AI provider” as pending. See `UX_v2/execution/WEB_EXPERIENCE_REVAMP_INTEGRATED_WEB_QA_2026-06-16_00-13-32_IST.md:69` through `:78`. | Validate live Ask/provider behavior with redacted evidence or block release claim for Ask quality. |
| P1 | Public routes could expose private library state through the global Needs Upgrade sidebar count. | Release-review sidecar found public routes such as `/setup-apk` inherited the root shell and sidebar count. A8 added verified-session gating in `src/app/layout.tsx` through `src/lib/shell/private-counts.ts`. | Resolved locally in A8; keep regression coverage in `src/lib/shell/private-counts.test.ts` and proxy public-route tests. |
| P2 | The worktree is too broad/dirty for a clean all-diff release review without attribution. | The master tracker’s original snapshot was stale while later overlays show implementation through A6; broad modified/untracked source, docs, Android assets, and scripts exist. See stale snapshot rows at `UX_v2/project_management/UX_V2_PROJECT_TRACKER_2026-06-15_21-46-45_IST.md:24` through `:34` and corrected overlay rows at `:40` through `:64`. | Release packet must separate current A7-authored docs from previous/user/agent changes and require final commit/diff ownership before production deploy. |
| P2 | A5 seed evidence could print or write raw auth material when used carelessly. | Release-review sidecar flagged raw session/pairing fields in the seed manifest path. A8 redacts stdout, restricts full secret manifest writes to `/tmp`, and enforces `0600` permissions. | Resolved locally in A8; keep redaction and non-`/tmp` guard checks in the A8 QA evidence. |
| P2 | Packaged Android public assets needed source-level freshness proof. | Release-review sidecar flagged potential drift between `public/offline.html` and packaged Android assets. A8 ran Capacitor sync and confirmed the packaged offline asset matches source. | Resolved at source/package asset level; Android runtime proof remains blocked until device/emulator validation exists. |

## Reviewed Scope

- Release-critical UX v2 routes/components/client/offline/service-worker/Android contracts.
- Android share result flow, setup/pairing surfaces, proxy public/auth paths, service worker/offline fallback, Android manifest/build metadata, and A6 preflight report.
- Generated A6/A7 evidence for obvious secret leakage.

## Positive Checks

- A6 validation passed: preflight, whitespace, typecheck, lint, tests, and build.
- Latest full-suite validation after A6 passed: 549 tests, 77 suites; build passed with the known `unpdf` warning.
- A8 validation passed after remediations: focused public-shell/proxy tests, A5 seed redaction checks, Android offline asset match, whitespace, typecheck, lint, full tests at 551 tests / 78 suites, and build with the known `unpdf` warning.
- A9 validation passed after accessibility fixes: accessibility sweep 0 issues, whitespace, typecheck, lint, full tests at 551 tests / 78 suites, and build with the known `unpdf` warning.
- Proxy tests cover public `/setup-apk`, `/capture/share-result`, `/offline.html`, manifest/icons, pairing exchange, session, bearer, and unauthenticated behavior.
- Android share result payloads store opaque keys in `sessionStorage` and sanitize error codes before storage.
- A5/A6 evidence search did not find raw session tokens, bearer tokens, or pairing codes in the committed QA markdown/JSON reports; SHA-256 APK hashes are expected non-secret matches.

## Sidecar Status

- PM sidecar completed and was integrated into A7 tracker/release packet.
- Release-review sidecar completed after the initial bounded wait. Its P1 public-shell privacy finding and P2 evidence-hygiene findings were routed into A8, remediated locally, and recorded in `UX_v2/execution/UX_V2_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_QA_2026-06-16_13-45-00_IST.md`.

## Verdict

The sidecar-confirmed P1 public-shell code issue has been resolved locally in A8, and local web accessibility follow-ups have been resolved in A9. Production release still remains blocked by P1 operational/runtime evidence gaps: Android runtime/APK proof including TalkBack/APK keyboard evidence, backup/rollback, production deploy/live smoke, observability, and live Ask/provider proof. Current safe status: `local_candidate_only`.
