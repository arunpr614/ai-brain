# UX v2 Production Release

Created: 2026-06-15 13:05 IST
Owner: Codex lead integrator
Release source: `codex/ai-brain-ux-v2-main-ready`
Production URL: `https://brain.arunp.in`
Release status: **deployed and post-deploy smoke passed**

## Approval And Scope

User approval was granted on 2026-06-15 with: `Approved for production. proceed continue goal`.

Approval was applied as follows:

- Release owner: Codex lead integrator for deploy, smoke, rollback watch, Android emulator validation, and documentation closure.
- Release source: clean PR worktree `/private/tmp/ai-brain-ux-v2-main-ready`, branch `codex/ai-brain-ux-v2-main-ready`, PR [#6](https://github.com/arunpr614/ai-brain/pull/6).
- Production smoke: production-first smoke accepted by the approval message because no separate staging target was supplied.
- Product decisions: open Decision Bundle A remains deferred; no decision-gated PRD behavior was silently implemented.
- APK publication: version was bumped and published as `versionName` `1.0.2`, `versionCode` `3`; no same-version overwrite was used.

## Release Source

| Item | Value |
| --- | --- |
| Branch | `codex/ai-brain-ux-v2-main-ready` |
| PR | [#6 UX v2 approved local release candidate](https://github.com/arunpr614/ai-brain/pull/6) |
| Final deployed code head | `7c28ba5 fix(ux-v2): attribute android share captures` |
| Integration base | `origin/main` `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` |
| Original project worktree | Preserved dirty; not used as release source |
| Closure evidence | This report plus `RUNNING_LOG.md` entry #114 and updated tracker/gate docs |

## Release Changes After Deploy-Ready Gate

| Commit | Purpose |
| --- | --- |
| `4fce843 chore(ux-v2): bump android release metadata` | Published Android release artifact as `AI Memory`, `1.0.2` / code `3`. |
| `5761d6a fix(ux-v2): finish ai memory brand copy` | Removed stale runtime `AI Brain` / `Your Brain` product copy from approved UI paths. |
| `a85fd42 fix(ux-v2): serve unauthenticated brand logo` | Allowed `/ai-memory-logo.png` through the proxy so locked and APK setup surfaces render the logo. |
| `7c28ba5 fix(ux-v2): attribute android share captures` | Added Android capture-source attribution for paired share captures and covered it with tests. |

## Validation Summary

| Gate | Result | Notes |
| --- | --- | --- |
| Typecheck | Pass | Final code validation passed before deploy. |
| Lint | Pass with known warnings | Existing unused-disable warnings remain in `src/lib/client/register-sw.ts` and `src/lib/queue/enrichment-batch-cron.ts`. |
| Full tests | Pass | Final deploy validation ran 505 tests across 77 suites with 0 failures. |
| Build | Pass with known warning | Known `unpdf` import warning remains. |
| Deploy script | Pass | Local Ollama provider check was warn-only because local Ollama was unavailable; remote providers passed strict checks. |
| Remote providers | Pass | Anthropic enrichment/ask and Gemini embeddings checked on the production host. |
| Service | Pass | `brain.service` active, `MainPID=267169`, `NRestarts=0`, active since `Mon 2026-06-15 12:44:46 IST`. |
| Public web smoke | Pass | `/unlock`, `/setup-apk`, `/offline.html`, and `/ai-memory-logo.png` returned 200 after deploy. |
| Data cleanup | Pass | Production item count returned to 15 after Android share smoke row cleanup. |

## Production Backups

All listed backups were created before production deploy steps and verified with `PRAGMA integrity_check` returning `ok`.

| Backup | Size | Item count | Purpose |
| --- | --- | --- | --- |
| `/opt/brain/data/backups/ux-v2-predeploy-2026-06-15_062428.sqlite` | 4022272 bytes | 15 | First release deploy attempt. |
| `/opt/brain/data/backups/ux-v2-predeploy-brandfix-2026-06-15_063824.sqlite` | 4030464 bytes | 15 | Brand copy deploy. |
| `/opt/brain/data/backups/ux-v2-predeploy-logo-fix-2026-06-15_122213.sqlite` | 4030464 bytes | 15 | Public logo proxy fix deploy. |
| `/opt/brain/data/backups/ux-v2-predeploy-android-share-source-2026-06-15_124103.sqlite` | 4030464 bytes | 15 | Android share-source attribution deploy. |

Offsite backup script was not installed at `/opt/brain/scripts/backup-offsite.sh`; this is recorded as a non-blocking release caveat.

## Production Smoke

| Check | Result |
| --- | --- |
| `/unlock` | 200, HTML returned. |
| `/setup-apk` | 200, HTML returned. |
| `/offline.html` | 200, HTML returned. |
| `/ai-memory-logo.png` | 200, `image/png`, 2837864 bytes. |
| Authenticated `/api/health` | 200 during final deploy smoke. |
| Stale brand scan | No live `AI Brain`, `Your Brain`, `Ask AI Brain`, or `Unlock AI Brain` matches on the checked live HTML surfaces. |
| Production service | Active after deploy with 0 restarts. |

## Android Emulator Validation

Artifact validated:

- APK: `data/artifacts/brain-debug-v1.0.2-code3.apk`
- SHA-256: `897627f6b71180de3766f2731f9bc478c746c3ae5e992a7381d8d657a6c3ebd0`
- Package: `com.arunprakash.brain`
- Version: `1.0.2` / code `3`
- Label: `AI Memory`
- Signing key SHA-256: `7d4580091b1c222cc004b6e195b267dcb4ef4ec200e0c803125d2cbc38cda94a`

| Required check | Result | Evidence |
| --- | --- | --- |
| Install | Pass | APK installed successfully on emulator. |
| Launch | Pass | `UX_v2/execution/evidence/android/2026-06-15-production/03-launch-logo-fixed-delayed.png` |
| Relaunch | Pass | `UX_v2/execution/evidence/android/2026-06-15-production/04-relaunch.png` |
| Pairing | Pass | Single-use pairing code was generated, consumed, and token persistence was confirmed with the token redacted. Evidence: `08-pairing-after-submit.png`. |
| Share | Pass | Paired Android text share created a production item with `capture_source=android`; smoke row was deleted and count returned to 15. Evidence: `13-share-smoke-android-source.png`. |
| Offline fallback | Pass for current bundled asset after data clear | `15-offline-fallback-cleared-data.png` shows the current `AI Memory needs the server` fallback. |
| Online after offline | Pass for recovery to live app | `16-online-after-offline.png`; app returns to the unlock surface after data clear, as expected. |
| APK flow | Pass | Versioned artifact was built, copied, installed, launched, paired, shared from, and retested offline. |

Android note: direct Android VIEW intents to `/setup-apk` still land on the app root because the APK does not declare a deep-link filter. Pairing was validated by navigating the installed WebView to `/setup-apk` through WebView debugging. This is recorded as follow-up technical debt, not an approved QR/deep-link implementation.

## Data Safety And Rollback

- No database schema migration was introduced for this release.
- PRD-10 repair remains transactional and preserves manual organization metadata.
- Production smoke created only disposable test data; the Android share smoke row was removed after validation.
- Rollback path remains: redeploy the previous known-good source through `scripts/deploy.sh`; if database rollback is required, stop `brain.service`, restore one of the verified snapshots with the existing restore script pattern, restart, then smoke.
- Previous production DB snapshots are available under `/opt/brain/data/backups/`.

## Residual Caveats

| Severity | Caveat | Release handling |
| --- | --- | --- |
| P2 | Existing Android WebView cache may retain the old offline fallback for users who already loaded it. | Current bundled fallback was verified after clearing app data. Existing installs may need cache/data clear or reinstall to force the new offline page. |
| P3 | No physical Android device was available. | Mandatory Android validation was completed on emulator with screenshots. |
| P3 | Local Ollama provider check was warn-only during deploy. | Production provider checks passed on the remote host. |
| P3 | Offsite backup script is not installed on production. | Multiple verified on-host SQLite backups exist; offsite backup remains follow-up ops work. |
| P3 | PR #6 remains a GitHub integration artifact and may still be draft until updated separately. | Production was deployed from the clean branch; PR state is not a live-release blocker after approval. |

## Final Verdict

Approved UX_Final_Plan scope is implemented or explicitly deferred, production was deployed after user approval, post-deploy smoke passed, Android emulator validation passed with documented caveats, and production data was backed up before deploy steps. The UX v2 goal is complete for the approved release scope.
