# UX v2 Magic Patterns Production Release

Created: 2026-06-15 17:10 IST
Owner: Codex lead integrator
Release branch: `codex/ai-brain-ux-v2-magic-patterns`
Release commit: `3bead0cc4dbad3ba870bd55517057b6b8d7955e9`
Production URL: `https://brain.arunp.in`
Release status: **deployed and smoked**

## Scope

This release implements the approved Magic Patterns web/responsive Android WebView UI candidate from the final plan and live Magic Patterns references. It does not silently close D-001 through D-014.

Implemented:

- Web/mobile shell refresh with AI Memory identity, bottom nav, More route, Pair Device link, Needs Upgrade badge, and collapsible desktop sidebar.
- `/library` route with filters, mobile filter sheet, bulk select, and Ask selected.
- Item detail/focus refresh with topics, collections/tags, related items, repair affordance, Ask item, and focus mode shell hiding.
- Ask selected/tag/topic/collection scopes and scope/citation/history UI within approved persistence boundaries.
- Additive topics schema/UI: `018_topics.sql`, topic repository, topic detail route, enrichment-derived topics.
- Collection detail route with scoped Ask.
- AI Memory web icons and manifest.

Deferred / not implemented:

- D-001/D-002/D-003 Ask attachments, high-quality-only Ask, and persisted scope-history semantics.
- D-004 mark-good-enough.
- D-005 native Android item-detail tabs.
- D-006 raised Capture behavior on More.
- D-007 active offline queues/download controls.
- D-008 QR pairing.
- D-009/D-010 transcript ops/fallback tracks.
- D-011 product analytics.
- D-012 Chrome extension redesign.
- D-013 Android package-ID migration.
- D-014 embedded YouTube player/media treatment.

## Predeploy Backup

Fresh production SQLite backup was created before deploy.

| Field | Value |
| --- | --- |
| Backup | `/opt/brain/data/backups/ux-v2-magic-patterns-predeploy-2026-06-15_143927.sqlite` |
| Integrity | `ok` |
| Item count | `15` |
| Size | `4030464` bytes |

Rollback remains:

1. Redeploy previous known-good source with `scripts/deploy.sh` for code-only rollback.
2. If schema/data rollback is required, stop `brain.service`, restore the verified SQLite snapshot using the established restore pattern, restart, and smoke.
3. Because `018_topics.sql` is additive, code rollback can leave the unused `topics` and `item_topics` tables in place unless a DB restore is explicitly required.

## Deploy Result

Command:

```bash
BRAIN_AI_PROVIDER_WARN_ONLY=1 \
BRAIN_BASE_URL=https://brain.arunp.in \
BRAIN_SSH_HOST=brain \
BRAIN_REMOTE_DIR=/opt/brain \
bash scripts/deploy.sh
```

Deploy script completed successfully.

| Gate | Result | Notes |
| --- | --- | --- |
| Toolchain/env preflight | Pass | Remote `/etc/brain/.env` token present. |
| Typecheck | Pass | `tsc --noEmit`. |
| Lint | Pass with known warnings | Unused-disable warnings in `src/lib/client/register-sw.ts` and `src/lib/queue/enrichment-batch-cron.ts`. |
| Full tests | Pass | 515 tests, 77 suites, 0 failures. |
| Env check | Pass | `.env` gitignore/tracking hygiene OK. |
| Local AI provider check | Warn-only | Local Ollama unavailable; same accepted caveat as prior release. |
| Build | Pass with known warning | Known `unpdf` warning. |
| Build artifact check | Pass | No `.next/standalone/data` packaged. |
| Sync/restart | Pass | Standalone/static/public assets synced; `brain.service` restarted. |
| Authenticated health | Pass | Remote token health check passed. |
| Remote AI providers | Pass | Anthropic enrichment/Ask and Gemini embeddings reachable. |
| Telegram reachability | Pass | Webhook returned expected unauthenticated 401. |
| Telegram live smoke | Skipped | `TELEGRAM_RELEASE` not set; unchanged from prior release handling. |

## Postdeploy Web Smoke

| Check | Result |
| --- | --- |
| `/unlock` | 200 |
| `/setup-apk` | 200 |
| `/offline.html` | 200 |
| `/ai-memory-logo.png` | 200, `image/png` |
| `/library` with smoke session cookie | 200 |
| `/ask` with smoke session cookie | 200 |
| `/capture` with smoke session cookie | 200 |
| `/needs-upgrade` with smoke session cookie | 200 |
| `/more` with smoke session cookie | 200 |
| `/settings/device-pairing` with smoke session cookie | 200 |
| Stale copy scan | No checked `AI Brain`, `Your Brain`, `Ask AI Brain`, or `Unlock AI Brain` on `/unlock`, `/library`, `/ask`, `/more`, `/settings/device-pairing`. |
| Service | `active`; `MainPID=269122`; `NRestarts=0`; active since `Mon 2026-06-15 14:43:06 IST`. |
| Production DB | `PRAGMA integrity_check` = `ok`; item count returned to `15` after smoke cleanup. |
| Topics migration | `topics` and `item_topics` tables present. |

## Android Runtime Validation

Evidence directory:

`UX_v2/execution/evidence/android/2026-06-15-magic-patterns/`

Artifact used:

- `data/artifacts/brain-debug-v1.0.2-code3.apk`
- Package: `com.arunprakash.brain`
- Version: `1.0.2` / code `3`

| Check | Result | Evidence / notes |
| --- | --- | --- |
| Install | Pass | Existing safe versioned APK installed with `adb install -r`; no new same-version artifact was published. |
| Fresh launch after data clear | Pass | `01-launch-fresh.png` shows deployed `Unlock AI Memory` shell and Magic Patterns bottom nav. |
| Relaunch | Pass | `02-relaunch-after-cdp-reset.png`; app relaunched after a transient WebView CDP socket reset. |
| Direct `/setup-apk` Android VIEW intent | Known caveat | `03-view-setup-apk-intent.png`; still lands at app root/unlock because APK has no deep-link filter. Same caveat as previous release. |
| Pairing exchange | Pass with redacted-token method | Production pairing code was created and exchanged; token was persisted to the same Capacitor Preferences file used by setup UI. Token was not printed. CDP WebView socket rejected JS control, so setup-page form automation was not used. |
| Paired Android share capture | Pass | Shared `https://example.com/?ai_memory_magic_patterns_android_share=<ts>` from Android; production row `657de46c4440c1f7cdcbbe5f` saved with `capture_source=android`, `source_type=url`, title `Example Domain`. Row was deleted after validation. Evidence: `06-share-url-200-after-intent.png`. |
| Smoke-data cleanup | Pass | Production item count returned to `15`. |
| Offline fallback after data clear | Pass | `07-offline-fallback-after-data-clear.png` shows `AI Memory needs the server`, with no offline queue overclaim. |
| Online relaunch after offline | Pass | `08-online-relaunch-after-offline.png` returns to `Unlock AI Memory` shell and bottom nav. |

Android caveat:

- Authenticated protected Android routes such as `/library` were not navigated inside the APK with a real PIN session because the WebView CDP page socket repeatedly reset and no PIN was supplied in this run. This is nonblocking for this release because the Android shell demonstrably loaded the deployed assets, browser mobile screenshots validate the responsive protected routes, and pairing/share/offline Android runtime paths passed.

## Evidence

Browser screenshots:

- `UX_v2/execution/evidence/screenshots/2026-06-15-magic-patterns/`
- `UX_v2/execution/evidence/screenshots/2026-06-15-magic-patterns-seeded/`

Android screenshots:

- `UX_v2/execution/evidence/android/2026-06-15-magic-patterns/01-launch-fresh.png`
- `UX_v2/execution/evidence/android/2026-06-15-magic-patterns/03-view-setup-apk-intent.png`
- `UX_v2/execution/evidence/android/2026-06-15-magic-patterns/06-share-url-200-after-intent.png`
- `UX_v2/execution/evidence/android/2026-06-15-magic-patterns/07-offline-fallback-after-data-clear.png`
- `UX_v2/execution/evidence/android/2026-06-15-magic-patterns/08-online-relaunch-after-offline.png`

## Final Verdict

Release gates passed for production deployment. Web UX v2 Magic Patterns UI is live. Android WebView loads the deployed AI Memory assets, pairing exchange/token persistence passed, paired Android share capture passed, offline fallback passed, and smoke data was cleaned up. D-001 through D-014 remain explicitly deferred/nonblocking as recorded.
