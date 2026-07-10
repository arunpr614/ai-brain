# Feature Release A26 - Android Share Target Log Hygiene Implementation Plan v1

Created: 2026-06-16 23:37 IST
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V2_2026-06-16_23-36-00_IST.md`

## Steps

1. Add `scripts/patch-capgo-share-target-privacy.mjs`.
2. Replace the unsafe full-payload success log with count-only logging.
3. Replace URI-bearing error logging with static text.
4. Wire the patch script into `scripts/build-apk.sh` before Capacitor sync.
5. Bump Android `versionName`/`versionCode` to `1.0.5`/`6`.
6. Run `npm run build:apk`.
7. Install the APK and rerun A25 URL-share fixture.
8. Write QA and tracker updates.

## No-Go Gates

- Unsafe plugin log remains after patch.
- APK still logs raw fixture URL in app/plugin lines.
- APK version metadata does not report `1.0.5/code6`.
