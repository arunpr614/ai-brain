# UX v2 A11 Production Deploy And Android Runtime QA

Created: 2026-06-16 14:18:00 IST
Status: Web production deployed; fresh APK candidate built, installed, and launched on emulator; APK publication still gated.

## Backup

| Field | Value |
| --- | --- |
| Backup path | `/opt/brain/data/backups/web-revamp-predeploy-20260616-140305.sqlite` |
| Integrity | `ok` |
| Production item count before deploy | `28` |
| Size | `4476928` bytes |

## Deploy

| Check | Result |
| --- | --- |
| Command | `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh` |
| Typecheck | Passed |
| Lint | Passed with existing warning in `src/lib/queue/enrichment-batch-cron.ts` |
| Tests | Passed, 551 tests / 78 suites |
| Env check | Passed |
| Local provider check | Warn-only failure expected because local Ollama is absent |
| Build | Passed with known `unpdf` warning |
| Build artifact check | Passed |
| Remote health | Passed through deploy script with remote token |
| Remote provider check | Passed: Anthropic enrichment, Anthropic Ask, Gemini embedding |
| Telegram webhook reachability | Passed: unauthenticated POST returned expected 401 |
| Telegram live smoke | Skipped, not in scope because `TELEGRAM_RELEASE=1` was not set |

## Production Smoke

| Route/check | Result |
| --- | --- |
| `GET /unlock` | 200 HTML |
| `GET /setup-apk` | 200 HTML |
| `GET /offline.html` | 200 HTML |
| `GET /ai-memory-logo.png` | 200 image/png |
| `GET /manifest.webmanifest` | 200 manifest JSON |
| `GET /library` without cookie | 307 to `/unlock?next=%2Flibrary&reason=session-expired` |
| `POST /api/telegram/webhook` without secret | 401 JSON |

## Observability

| Check | Result |
| --- | --- |
| Service status | `active` |
| Restart count | `NRestarts=0` |
| Startup log | Next.js ready, migration 017 applied, backup scheduler started, initial snapshot created |
| Non-blocking log observations | Background enrichment/backoff and transcript cooldown warnings were present. Remote provider check and live Ask proof passed, so these are tracked as residual worker/queue observability risk, not a web deploy blocker. |

## Live Ask Proof

Raw session token, raw answer text, source titles, and item IDs were not persisted.

| Field | Value |
| --- | --- |
| Status | 200 |
| Content type | `text/event-stream; charset=utf-8` |
| Body bytes | 1176 |
| SSE data lines | 10 |
| Frame types | `retrieve`, eight `token`, `done` |
| Retrieved chunks | 2 |
| Token characters | 447 |
| Done frame | true |
| Error frames | none |
| Chunk hashes | `948db0351ef4`, `0c834d995ee8` |
| Body hash prefix | `17dc2fad4228d5d8` |

## Fresh APK Candidate

| Field | Value |
| --- | --- |
| Android versionName | `1.0.3` |
| Android versionCode | `4` |
| Artifact | `data/artifacts/brain-debug-v1.0.3-code4.apk` |
| Gradle output | `android/app/build/outputs/apk/debug/brain-debug-v1.0.3-code4.apk` |
| APK SHA-256 | `5c8a3f398886f57ea572be62ab04025cfa716c661af4684d9ffbbbd3e1561440` |
| Size | 7.5 MB |
| Build | Passed with Java 21 and Android SDK scoped through environment variables |
| Install | `adb install -r` succeeded on `Brain_API_36` emulator |
| Runtime focus | `com.arunprakash.brain/.MainActivity` resumed |

## Android Runtime Evidence

| Evidence | Result |
| --- | --- |
| Predeploy APK launch | Showed old production shell because APK loads `https://brain.arunp.in`; old shell still exposed a private bottom-nav count before deploy. |
| Postdeploy app-data-clear + relaunch | Passed |
| Postdeploy locked screenshot | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/postdeploy-locked.png` |
| Postdeploy UI tree | `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/window-postdeploy.xml` |
| Locked-shell privacy | Passed visually: no private Needs Upgrade badge/count appears while locked. |

## Remaining No-Go For APK Publication

- Authenticated Android route flow with a real or test PIN/session.
- Native URL/PDF share intents.
- Pairing token/session persistence after app restart.
- Offline fallback and stale-cache recovery in WebView.
- Android keyboard and TalkBack accessibility evidence.

## Release Status After A11

- Web production deploy: passed.
- Live Ask/provider proof: passed on production.
- Fresh APK candidate: built, installed, launched, and locked-shell privacy passed.
- Final APK publication: not authorized.
- Overall UX v2 goal: not complete until the remaining Android no-go items are cleared and release ownership is finalized.

## Running Log Draft

Do not append without explicit user approval.

```markdown
## Entry #124 - 2026-06-16 14:18 IST - UX v2 A11 production web deploy and Android APK candidate completed

### Summary

Completed A11 production web deployment and postdeploy smoke. Built fresh Android APK candidate `1.0.3/code4`, installed it on the `Brain_API_36` emulator, and confirmed the deployed locked shell no longer leaks the private Needs Upgrade count.

### Evidence

- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-18-00_IST.md`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/postdeploy-locked.png`

### Validation

- Backup integrity: ok.
- Deploy script: passed.
- Production smoke: passed.
- Live Ask SSE proof: passed.
- APK build/install/locked launch: passed.

### Remaining

APK publication remains blocked until authenticated Android route flow, native share, stale-cache recovery, keyboard, and TalkBack evidence pass.
```
