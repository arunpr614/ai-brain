# UX v2 A7 Release Readiness Packet

Created: 2026-06-16 13:18:00 IST
Updated: 2026-06-17 08:05:00 IST after A34 private sideload debug APK build
Final release status: `web_production_deployed_a34_android_1_0_6_private_sideload_debug_apk_ready`
Production deploy authorized: Completed
APK publication authorized: Private local sideload build only; no public/store/external distribution

## Summary

The UX v2 web experience is deployed to production. A11 created a verified predeploy backup, ran the deploy script, passed production route smoke, passed remote provider checks, and completed a redacted live Ask SSE proof. A12 superseded the prior Android `1.0.3/code4` candidate with `1.0.4/code5` after finding and fixing Capacitor bridge token logging, then captured authenticated Android routes, pairing, native note-share success with cleanup, offline fallback/recovery, keyboard smoke, and bounded TalkBack launch smoke. A21 found a remaining private SSR session P1 after A20; A22 fixed the class and passed full validation. A23 final staged review returned go, the source candidate was committed as `0655f51`, and A24 patched the postdeploy Next.js dependency security advisory, committed `f9de485`, and redeployed production with a clean remote production audit. A25 committed and deployed `c17f07a` so URL/note share failures render truthful source-specific failures. A26 committed `8577751`, built/installed Android `1.0.5/code6`, and proved native share-target logs are count-only rather than raw payload logs. A27 proved production server/API URL capture success with a deterministic full-text IANA fixture and cleaned it from production. A28 restored Android tooling and proved native user-facing URL-share success, but found `capture_source=unknown`. A29 fixed Android capture-source attribution for native URL/note/PDF share requests, deployed production, reran native URL share, verified `capture_source=android`, and cleaned the fixture. A30 passed a 10-screen Android WebView platform accessibility-order audit with redacted evidence, but did not capture human-heard TalkBack speech. A31 verified the then-current debug APK artifact and created an owner-ready publication authorization packet. A34 implements Arun's private-sideload-only decision: Android is bumped to `1.0.6/code7`, `data/artifacts/brain-debug-v1.0.6-code7.apk` is built with the existing debug keystore, checksum `17030972de432b5448a8898a19b1cc06645c24a943e931daa2e7c355f5fb2c37`, fresh emulator install passed, and separate install notes exist. Android is ready as a local private debug APK, not an externally published or release-signed artifact.

## Gate Table

| Gate | Status | Evidence / note |
| --- | --- | --- |
| Static checks | passed | A11 deploy reran typecheck, lint, tests 551/78, env check, build, and build-artifact check. A15 reran source/config validation. A16 removed the stale eslint suppression in `src/lib/queue/enrichment-batch-cron.ts`; lint is now warning-free and typecheck passes. A20 reran typecheck, lint, full tests 559/78, build, env check, build-artifact check, and APK packaging. A22 reran typecheck, lint, focused auth tests 40/10, full tests 563/78, build, env check, build-artifact check, and APK packaging. A24 reran full and production audits, typecheck, lint, full tests 563/78, build, env check, build-artifact check, and APK packaging after the dependency hotfix. A25 reran focused share-result tests, typecheck, lint, full tests 564/78, and build. A26 reran lint, full tests 564/78, and APK build for `1.0.5/code6`; build retains the known `unpdf` warning. A34 reran the full APK build pipeline for `1.0.6/code7`; TypeScript/Next build, Capacitor sync, share-target privacy patch, and Gradle `assembleDebug` passed with the known `unpdf`, `flatDir`, and Gradle deprecation warnings. |
| Local web integrated QA | passed | `WEB_EXPERIENCE_REVAMP_INTEGRATED_WEB_QA_2026-06-16_00-13-32_IST.md`; browser report had 0 layout issues and 0 console warnings/errors. |
| Android browser-responsive QA | passed locally | A1-A5 QA reports and screenshots. These are browser/mobile evidence, not Android runtime evidence. |
| Android preflight | passed with blockers | A6 JSON/report generated; status includes `runtime_blocked` and `release_blocked`. |
| Code review | passed with release blockers | `UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`; release-review sidecar findings were integrated. The P1 public-shell issue was remediated in A8; operational P1 blockers remain. |
| Dirty-worktree attribution | blocked | Broad dirty state exists across source, Android assets, docs, and scripts. A7 authored only A7 docs/tracker updates; final release needs commit/diff ownership. |
| Secret hygiene | passed for A6/A7/A8 reports | Targeted scan found expected safe references and APK SHA-256 hashes, not raw session/pairing/token values in release artifacts. A8 also redacts A5 seed stdout and restricts full secret manifests to `/tmp`. |
| Public shell privacy | passed locally | A8 gates private Needs Upgrade counts behind verified session state and covers unauthenticated behavior with unit tests. |
| Packaged Android source assets | passed locally | A8 ran Capacitor sync and confirmed packaged `offline.html` matches `public/offline.html`; Android runtime remains blocked. |
| Local web accessibility release sweep | passed | A9 keyboard, focus, touch-target, and 200 percent reflow proxy sweep passed with 0 issues across 11 routes. |
| Live Ask/provider proof | passed | A11 remote provider check passed; live Ask returned 200 SSE, retrieve chunks, token output, done frame, and no errors. A24 deploy saw one transient remote Ask provider timeout under warn-only; immediate rerun passed enrichment, Ask, and embedding. Raw answer/session/source details were not persisted. |
| Backup | passed | Predeploy backup `/opt/brain/data/backups/web-revamp-predeploy-20260616-140305.sqlite`; integrity `ok`, item count `28`, size `4476928` bytes. |
| Rollback | documented | Backup path and restore runbook are recorded; no rollback was executed because deploy smoke passed. |
| Production deploy | passed | `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh` completed and health-checked production in A11, again after A24 source hotfix commit `f9de485`, again after A25 source commit `c17f07a`, and again after A29 Android capture-source attribution. A26 is APK/build-pipeline only and was not web-deployed. |
| Live smoke | passed | `/unlock`, `/setup-apk`, `/offline.html`, logo, manifest, protected `/library` redirect, and Telegram webhook 401 all matched expectations in A11. A24 repeated `/unlock` 200, protected `/library` 307 redirect, unauthenticated `/api/ask` 401, and Telegram webhook 401. A25 repeated `/unlock` 200, protected `/library` 307, unauthenticated `/api/ask` 401, and remote deployed-bundle proof for `url_capture_failed`. |
| Dependency security audit | passed | A24 local `npm audit` and `npm audit --omit=dev` reported 0 vulnerabilities; remote `/opt/brain` reports `next: 16.2.9` and remote `npm audit --omit=dev` reports 0 vulnerabilities. |
| Observability | passed with residual warning | Service active, `NRestarts=0`, startup logs clean. Background enrichment/backoff and transcript cooldown warnings remain residual worker/queue observability risk. |
| Android runtime | private sideload debug APK ready | Previous runtime evidence covers authenticated routes, pairing token persistence, native note share with cleanup, offline/recovery, keyboard smoke, bounded TalkBack launch smoke, honest URL-failure UI, native share-target log hygiene, A29 native URL-share success with `capture_source=android`, and A30 10-screen platform AX accessibility-order proof. A34 adds fresh `1.0.6/code7` APK build and fresh install proof; app launch smoke was inconclusive because Android `monkey` did not focus the app. |
| APK publication | private local sideload only | A34 creates `data/artifacts/brain-debug-v1.0.6-code7.apk` and private install notes. No upload, public distribution, release signing, Google Play submission, or AAB was performed. |
| Final release status | web_production_deployed_a34_android_1_0_6_private_sideload_debug_apk_ready | Web production is deployed; Android private debug APK `1.0.6/code7` is ready locally for fresh install; A30 AX-equivalent residual risk is accepted only for this private sideload channel; public/store release remains a separate future gate. |

## Integrated PM Sidecar Findings

- Completed: web integrated QA, A8/A9 remediation, production deploy/live smoke, production live Ask/provider proof, fresh APK build/install/locked launch, authenticated Android runtime slices, native note share, stale-cache/offline recovery, Android keyboard smoke, honest URL-failure UI, and native share-target log hygiene.
- Remaining blockers: Arun's private sideload/re-pair confirmation if desired, separate public/store publication authorization if desired, and a true spoken TalkBack audit only if a stricter/public channel is selected later.
- Tracker stale rows needed reconciliation; A7 updates the master tracker and milestone tracker accordingly.
- Recommended next milestones: tracker reconciliation/freeze, Android runtime/APK evidence, final release candidate gate.

## Integrated Release-Review Sidecar Findings

- P1 public-shell Needs Upgrade privacy leak: resolved locally by A8 session gating and regression tests.
- P2 A5 seed evidence-hygiene risk: resolved locally by A8 stdout redaction, `/tmp`-only full manifest writes, and `0600` permissions.
- P2 Android packaged offline asset freshness risk: resolved at source/package level by A8 Capacitor sync and asset match check.
- P1 Android release evidence gap: partially reduced by A11 fresh APK build/install/locked launch, but still open for authenticated Android runtime, native share, stale-cache/offline recovery, keyboard, and TalkBack evidence.

## Integrated A10/A11 Provider Proof Findings

- Provider preflight failed for enrichment, Ask, and embedding because configured local Ollama is unreachable.
- `ollama` binary is not installed, no Ollama process is running, and port 11434 is closed.
- A11 resolved this for production by using the production host's approved provider configuration: remote Anthropic/Gemini provider checks passed, and live Ask SSE proof completed with retrieved chunks, token output, done frame, and no errors.

## Integrated A11 Production/Android Findings

- Web production deploy completed with verified backup and postdeploy smoke.
- Fresh APK candidate `data/artifacts/brain-debug-v1.0.3-code4.apk` was built and installed on `Brain_API_36`.
- Postdeploy Android locked-screen screenshot confirms the prior production bottom-nav count leak is gone after the web deploy.
- APK publication remains blocked by authenticated Android, native share, stale-cache, keyboard, and TalkBack evidence gaps.

## Integrated A12 Android Publication-Gate Findings

- A12 found a token-log hygiene issue: Capacitor bridge debug logging exposed `brain_token` values in logcat during pairing/share.
- A12 fixed the issue with `loggingBehavior: "none"` in `capacitor.config.ts`, bumped Android to `1.0.4/code5`, rebuilt, installed, and verified no token-shaped bridge payloads in fresh post-fix logcat.
- A12 captured authenticated Library, Ask, Capture, More, item detail, pairing-token persistence, native note share success with cleanup, offline fallback, online recovery, keyboard smoke, and bounded TalkBack launch smoke.
- Native URL share using `example.com` still produced a capture failure; native note share is the accepted success proof unless a dedicated URL-share success fixture is required.
- APK publication remains gated by final ownership/commit review, explicit distribution decision, and full TalkBack spoken-order audit if required.

## Integrated A13 Final Ownership/Publication Findings

- A13 PRD and implementation-plan governance cycle exists through adversarial review and v2 revision.
- PM sidecar artifact `UX_v2/project_management/AI_BRAIN_UX_V2_PM_STATUS_A13_2026-06-16_19-09-12_IST.md` confirms web is production deployed and Android is advanced but not complete.
- Root README current Android setup guidance was corrected from stale QR-scanner instructions to the current short-lived Android pairing-code flow.
- Delivery tracker stale "Create A12" next-gate text was corrected to A13 final ownership/publication closure.
- APK `1.0.4/code5` remains a debug validation candidate until Arun authorizes a named distribution target.
- Historical A13 no-go labels were `android_publication_authorization_missing`, `dirty_worktree_ownership_incomplete`, `talkback_spoken_order_not_captured`, and `url_share_success_not_proven`; A29/A30 supersede the URL-share and accessibility-order portions with newer evidence, while APK publication authorization remains open.

## Integrated A14 Dirty-Worktree Attribution Findings

- A14 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A14_DIRTY_WORKTREE_ATTRIBUTION_REPORT_2026-06-16_19-28-32_IST.md`.
- A14 recorded both inventory scales: compact `git status --short` entries remained 306, while expanded untracked files were 874 at the A14 snapshot.
- The report includes all 97 tracked modified paths, the 35 high-risk untracked `src` files, owner-review buckets, ignored APK identity policy, and bucket-specific validation gates.
- Dirty-worktree ownership is reduced from unstructured blocker to owner-review map, but final ownership remains open until a release owner accepts or excludes every release-bound bucket.

## Integrated A15 Source/Config Validation Findings

- A15 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A15_SOURCE_CONFIG_VALIDATION_PREFLIGHT_REPORT_2026-06-16_19-41-10_IST.md`.
- Current local source/config validation passed: typecheck, lint, tests, production build, env check, and build-artifact check.
- Lint retained one non-blocking warning for an unused eslint-disable directive in `src/lib/queue/enrichment-batch-cron.ts`.
- Production build retained the known `unpdf` import-meta warning and exited 0.
- Full test suite passed with 551 tests, 78 suites, and 0 failures.
- APK build was intentionally deferred to the Android publication/runtime gate and was not treated as publication evidence.

## Integrated A16 Lint Warning Cleanup Findings

- A16 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A16_LINT_WARNING_CLEANUP_QA_2026-06-16_19-54-00_IST.md`.
- The only product source edit was removing the obsolete `// eslint-disable-next-line no-var` directive in `src/lib/queue/enrichment-batch-cron.ts`.
- Scoped source diff was exactly `1 file changed, 1 deletion(-)`.
- `npm run lint` exited 0 with no warning output.
- `npm run typecheck` exited 0.
- A16 does not close dirty-worktree ownership, APK publication authorization, TalkBack spoken-order, or URL-share gates.

## Integrated A17 Bucket Acceptance Findings

- A17 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A17_RELEASE_BUCKET_ACCEPTANCE_MANIFEST_2026-06-16_20-05-00_IST.md`.
- Current A17 inventory is 310 compact changed/untracked entries, 98 tracked modified paths, 212 compact untracked entries, and 898 expanded untracked files.
- The manifest separates file-only accepted source/config candidates, file-only current governance-doc candidates, review-required heavy evidence patterns, historical/reference deferrals, and excluded/blocked APK/output lanes.
- A17 does not stage, commit, push, deploy, publish, sign, upload, or rebuild APK artifacts.
- Next release action is explicit file-only staging from the manifest, followed by staged validation.

## Integrated A18 Staged Candidate Findings

- A18 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A18_STAGED_RELEASE_CANDIDATE_QA_2026-06-16_20-28-00_IST.md`.
- A18 staged the A17 accepted candidate through literal pathspecs. Final staged index contains 258 approved paths exactly.
- Historical staged governance-doc whitespace was cleaned mechanically after `git diff --cached --check` caught it; the staged diff check then passed.
- Phase 1 validation passed: typecheck, lint without warnings, 551 tests across 78 suites, production build with the known `unpdf` warning, env check, build-artifact check, and APK packaging validation.
- APK validation used the existing `1.0.4/code5` candidate. The first build stopped because the artifact already existed; rerun with `ALLOW_REBUILD_SAME_APK_VERSION=1` passed and produced SHA-256 `a4be82c4d8d51de81345e27441af250bc1a8300f4646388dbd50522875c021b7`.
- Final phase 2 governance staging and staged-index/doc scans passed.
- A18 does not commit, push, deploy, publish, sign, upload, or authorize APK distribution.

## Integrated A19 Final Review Findings

- A19 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A19_FINAL_STAGED_CANDIDATE_REVIEW_2026-06-16_20-48-00_IST.md`.
- A19 reviewed only the staged 258-file candidate and kept A19 governance docs unstaged.
- Verdict is `REQUEST_CHANGES`.
- Confirmed P1 blockers: sensitive private surfaces must verify the session HMAC instead of trusting cookie presence; Ask history must reset/remount thread state on route/query navigation.
- Confirmed non-blocking follow-ups: large tag/topic/collection Ask scopes silently cap at 50, item deletion affordance is missing, IPv6 localhost SW bypass misses `[::1]`, and mobile bulk selection lacks tag/add-to-collection actions.
- A20 fix/revalidation is required before commit consideration.

## Integrated A20 P1 Blocker Fix Findings

- A20 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A20_P1_BLOCKER_FIXES_QA_2026-06-16_21-03-00_IST.md`.
- A20 added shared verified-session cookie helpers in `src/lib/auth.ts` and replaced cookie-presence checks across the first-pass private page/API scope.
- Device pairing token/code, library export, Ask, search, provider status, rotate-token, item export/enrichment/status, thread APIs, `/library`, `/more`, and `/settings/device-pairing` now require verified signed sessions.
- A20 keyed Ask client state by restored thread/message payload so history navigation remounts the stateful chat surface.
- Full validation passed after A20: typecheck, lint, full tests 559/78, production build with known `unpdf` warning, env check, build-artifact check, and APK packaging for `1.0.4/code5`.
- A20 fixed the A19 P1 blockers but still requires a final staged-candidate review before commit/PR consideration.

## Integrated A21 Final Post-A20 Review Findings

- A21 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A21_FINAL_POST_A20_STAGED_REVIEW_2026-06-16_21-20-00_IST.md`.
- A21 product/Ask and public/governance lanes returned go.
- A21 security/privacy returned `REQUEST_CHANGES` for remaining private SSR pages that still loaded data after only the proxy cookie-presence gate.
- A22 fix/revalidation is required before commit consideration.

## Integrated A22 Private SSR Session Hardening Findings

- A22 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A22_PRIVATE_SSR_SESSION_HARDENING_QA_2026-06-16_21-35-00_IST.md`.
- A22 changed the proxy from cookie presence to signed-session verification, hardened `/api/capture/pdf`, and guarded scanned private SSR pages before private DB/provider reads.
- A22 added proxy/PDF regression tests for forged-cookie rejection and bearer compatibility.
- Full validation passed after A22: typecheck, lint, focused auth tests, full tests 563/78, production build with known `unpdf` warning, env check, build-artifact check, and APK packaging for `1.0.4/code5`.
- A22 fixed the A21 P1 blocker but still requires a final post-A22 staged-candidate review before commit/PR consideration.

## Integrated A23 Post-A22 Final Staged Review Findings

- A23 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A23_POST_A22_FINAL_STAGED_REVIEW_2026-06-16_21-46-00_IST.md`.
- Security/privacy, product/Ask, and public/governance lanes returned go for commit consideration only.
- Staged hygiene checks passed before A23 docs were added: 312 staged paths, no whitespace issues, no excluded heavy/runtime artifacts, and no staged root `RUNNING_LOG.md`.
- A23 enabled source commit `0655f51` but does not publish, sign, upload, or authorize APK distribution.

## Integrated A24 Dependency Security Hotfix Findings

- A24 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A24_DEPENDENCY_SECURITY_HOTFIX_QA_2026-06-16_23-10-00_IST.md`.
- A24 patched `next` and `eslint-config-next` to `16.2.9`, added overrides for `postcss=8.5.14` and `tar=7.5.16`, and applied safe development-tool audit fixes.
- Local full audit and production-only audit both report 0 vulnerabilities.
- Validation passed: typecheck, lint, 563 tests across 78 suites, production build with the known `unpdf` warning, env check, build-artifact check, and APK packaging for `1.0.4/code5`.
- Source hotfix commit `f9de485` was deployed to production. Remote `/opt/brain` reports `next: 16.2.9`, remote production audit reports 0 vulnerabilities, service state is active, and live unauthenticated smoke passed.
- A24 does not publish, sign, upload, or authorize APK distribution.

## Integrated A25/A26 Android URL Share Findings

- A25 completed its PRD/review/plan/review cycle and created source commit `c17f07a`.
- A25 added `url_capture_failed` and `note_capture_failed`, mapped URL/note capture failures truthfully, passed focused/full validation, and was deployed to production.
- A25 browser DOM proof and Android runtime screenshot confirm the URL-failure result renders "Link could not be saved" with `Capture manually` and `Done`.
- A25 Android logcat exposed a raw shared URL in `CapacitorShareTarget`, so A26 was created.
- A26 completed its PRD/review/plan/review cycle and created commit `8577751`.
- A26 added a fail-closed build-time patch for the Capgo share-target native plugin, built and installed `1.0.5/code6`, and passed a redacted logcat scan with `share_target_count_only=True` and `share_target_raw_payload=False`.
- A26 does not publish, sign, upload, or authorize APK distribution. A25/A26 prove honest URL failure and log hygiene, not URL-share success.

## Integrated A27 URL Capture Success Findings

- A27 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A27_URL_CAPTURE_SUCCESS_PROOF_QA_2026-06-16_23-59-00_IST.md`.
- A27 local extraction preflight confirmed `https://www.iana.org/help/example-domains?ai_brain_qa=a27-20260616-2355` extracts as `full_text`.
- A27 production capture from host `brain` returned `201`, `action=created`, `capture_result.state=created_full_text`, `quality=full_text`, and `capturedVia=android`.
- A27 verified the production item row and related rows, then cleaned the exact fixture with SQLite foreign keys enabled.
- A27 immediate and delayed cleanup checks returned zero for fixture and related rows.
- A27 by itself did not prove native Android URL-share success because Android tooling was unavailable in that resumed environment; A28/A29 supersede that native-share gap.

## Integrated A28/A29 Native URL Share Findings

- A28 completed its PRD/review/plan/review cycle and restored Android tooling via Homebrew command-line tools and AVD `Brain_API_36`.
- A28 verified installed APK `1.0.5/code6`, ran a real native `ACTION_SEND` URL share, captured saved-result UI, and found the production item as full-text.
- A28 found a metadata blocker: the native item stored `capture_source=unknown`; the fixture and related rows were cleaned to zero.
- A29 completed its PRD/review/plan/review cycle, added Android capture-source request helpers, covered them with focused tests, and updated the native share handler for URL/note/PDF requests.
- A29 validation passed: focused 3 tests, typecheck, lint, full tests 567/79, production build with known `unpdf` warning, env check, and build-artifact check.
- A29 deployed production with `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`; remote health/provider checks passed and remote install reported 0 vulnerabilities.
- A29 force-stopped the Android app, reran a cold native URL share, verified saved UI and production `capture_source=android`, then cleaned the fixture and related rows to zero.
- A29 does not publish, sign, upload, or authorize APK distribution.

## Integrated A30 Android Accessibility Findings

- A30 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_SPOKEN_ORDER_QA_2026-06-17_00-50-00_IST.md`.
- A30 verified installed APK `1.0.5/code6` and used WebView DevTools `Accessibility.getFullAXTree` against the live Android WebView.
- A30 passed 10/10 scoped screens: locked/unlock route, Library, Ask, Capture, More, Device pairing, item detail, item repair, share-result saved, and share-result URL failure.
- A30 retained only redacted accessibility-order evidence in `UX_v2/execution/UX_V2_A30_ANDROID_TALKBACK_AX_SUMMARY_2026-06-17_00-50-00_IST.json`.
- TalkBack service enable/restore probe passed, but no reliable human-heard/audio transcript was captured. Verdict is `platform_ax_equivalent_passed_with_residual_risk`, not `talkback_spoken_passed`.

## Integrated A31 APK Publication Authorization Findings

- A31 completed its PRD/review/plan/review cycle and created `UX_v2/execution/UX_V2_A31_APK_PUBLICATION_AUTHORIZATION_PACKET_2026-06-17_01-15-00_IST.md`.
- A31 freshly verified `data/artifacts/brain-debug-v1.0.5-code6.apk`: size `7856717` bytes and SHA-256 `e7539f1afb8b730b0c5f5808724d960df20a6db9fadc943b90c73ac9979298b7`.
- A31 confirmed `android/app/build.gradle` still reports `versionName "1.0.5"` and `versionCode 6`.
- A31 keeps all owner decisions default-deny: publication `not_authorized`, distribution target `not_selected`, signing mode `not_selected`, accessibility risk `not_accepted`, and repository action `not_selected`.
- A31 status is `apk_publication_authorization_packet_ready`; APK publication remains `apk_publication_authorization_missing`.

## Integrated A34 Private Sideload APK Findings

- A34 completed its PRD/review/plan/review cycle before execution.
- Arun approved a private debug APK build only: no hosted/external distribution, no release signing, no Google Play submission, no public accessibility claim, and no APK binary commit.
- Android version was bumped to `versionName "1.0.6"` and `versionCode 7` in `android/app/build.gradle`.
- `npm run build:apk` passed and produced `data/artifacts/brain-debug-v1.0.6-code7.apk`.
- APK identity: package `com.arunprakash.brain`, size `7856713` bytes, SHA-256 `17030972de432b5448a8898a19b1cc06645c24a943e931daa2e7c355f5fb2c37`.
- Fresh emulator validation passed: uninstall success, install success, installed metadata `versionName=1.0.6` and `versionCode=7`.
- Accessibility decision is A30 AX-equivalent residual risk accepted for this private sideload only, not `talkback_spoken_passed`.
- Install notes were created at `UX_v2/execution/UX_V2_A34_PRIVATE_SIDELOAD_APK_INSTALL_NOTES_2026-06-17_08-05-00_IST.md`.

## Release Blockers To Clear Next

1. Arun privately sideloads `data/artifacts/brain-debug-v1.0.6-code7.apk`, fresh-installs, re-pairs, and reports any device-only issue.
2. Commit and push A34 source/docs only; keep the APK binary, keystore, databases, raw logs, and secrets out of git.
3. If public/store distribution is desired later, create a new PRD/review/plan cycle for release signing, distribution target, rollback posture, and public accessibility requirements.
4. Preserve A29 native URL-share proof, A30 AX-equivalent accessibility proof, and A34 APK install proof as emulator debug APK evidence; do not overclaim signed/public distribution coverage from any of them.

## Running Log Draft

Do not append without explicit user approval.

```markdown
## Entry #120 - 2026-06-16 14:18 IST - UX v2 A7-A11 release readiness updated after production deploy

### Summary

Updated A7 release-readiness packet after A8 privacy/evidence hygiene, A9 accessibility, A10 provider preflight, and A11 production deploy/runtime work. Current release status is `web_production_deployed_android_candidate_partial`: web is live in production, live Ask is proven on production, and a fresh APK candidate installed/launched on emulator, but APK publication remains blocked.

### Evidence

- `UX_v2/execution/UX_V2_A7_CODE_REVIEW_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-18-00_IST.md`
- `UX_v2/execution/UX_V2_A8_PUBLIC_SHELL_PRIVACY_AND_EVIDENCE_HYGIENE_QA_2026-06-16_13-45-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_13-45-00_IST.md`
- `UX_v2/execution/UX_V2_A9_ACCESSIBILITY_FINAL_SWEEP_QA_2026-06-16_14-20-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-20-00_IST.md`
- `UX_v2/execution/UX_V2_A10_LIVE_ASK_PROVIDER_PROOF_QA_2026-06-16_14-36-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-36-00_IST.md`
- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-18-00_IST.md`

### Validation

- A8/A9 gates are green: focused shell/proxy tests, A5 redaction checks, Android offline asset match, A9 accessibility sweep, whitespace, typecheck, lint, tests, and build.
- A11 gates are green: verified backup, deploy script, production smoke, remote providers, live Ask SSE proof, APK build/install/locked launch.

### Release state

- Production deploy: completed.
- APK publication: not authorized.
- Main blockers: authenticated Android runtime evidence including native share, stale-cache/offline recovery, keyboard/TalkBack, and final release ownership review.
```
