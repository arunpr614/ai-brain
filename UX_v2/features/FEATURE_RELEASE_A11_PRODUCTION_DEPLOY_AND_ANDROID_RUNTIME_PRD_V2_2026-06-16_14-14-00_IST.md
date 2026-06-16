# Feature Release A11 Production Deploy And Android Runtime PRD V2

Created: 2026-06-16 14:14:00 IST
Revises: `FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_PRD_V1_2026-06-16_14-12-00_IST.md`

## Objective

Ship the UX v2 web experience to production with backup, rollback, live provider, live Ask, route smoke, and observability evidence; separately produce and install a fresh Android APK candidate while keeping final APK publication blocked until full authenticated Android runtime evidence is captured.

## Release Outcomes

| Outcome | Gate |
| --- | --- |
| Web production deploy | May pass after backup, deploy, service health, provider health, live Ask, route smoke, and log review. |
| Fresh APK candidate | May pass after version bump, build, SHA-256 match, install, launch, and locked-screen privacy proof. |
| Final APK publication | No-go until authenticated Android navigation, native share, stale-cache recovery, keyboard, and TalkBack evidence pass. |

## Acceptance Criteria

- Predeploy backup records path, integrity `ok`, item count, and size.
- Deploy script completes successfully and remote service is active with restart count recorded.
- Deploy script records local static gates: typecheck, lint, tests, env check, build, and build-artifact check.
- Local provider failure is allowed only with `BRAIN_AI_PROVIDER_WARN_ONLY=1` because remote production provider preflight passes.
- Production public routes return expected status/content-type.
- Protected production route redirects to unlock without a session.
- Telegram webhook without secret returns 401.
- Production live Ask uses a short-lived signed session generated on the host, returns status 200 SSE, retrieve chunks, token output, done frame, and no errors; raw answer and token are not persisted in docs.
- Fresh APK artifact has version `1.0.3`, code `4`, matching Gradle/artifact hashes, and install succeeds.
- Android emulator launch shows `com.arunprakash.brain/.MainActivity` resumed.
- Postdeploy locked Android screenshot shows no private Needs Upgrade badge/count.
- Release packet explicitly records residual no-go for final APK publication.

## Privacy And Secret Handling

- Do not print or persist production PIN, session token, bearer token, raw Ask answer, raw source titles, or raw item IDs.
- Evidence may store hashes, counts, statuses, frame types, and screenshot paths.

## Residual Android No-Go

Final APK publication remains blocked until the following are validated on an unlocked Android WebView session or physical device:

- Authenticated Library, Ask, Capture, More, Settings, item detail, repair, topics, and collections.
- Native URL/PDF share intents.
- Pairing token/session persistence after app restart.
- Offline fallback and stale-cache recovery.
- Android keyboard and TalkBack accessibility.
