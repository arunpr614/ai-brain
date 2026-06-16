# Feature Release A26 - Android Share Target Log Hygiene Implementation Plan v2

Created: 2026-06-16 23:39 IST
Status: Approved for execution
PRD: `FEATURE_RELEASE_A26_ANDROID_SHARE_TARGET_LOG_HYGIENE_PRD_V2_2026-06-16_23-36-00_IST.md`

## Execution

1. Add tracked patch script:
   - target: Capgo Android plugin Java source in `node_modules`;
   - replace full payload success log with count-only log;
   - replace URI-bearing error log with static message;
   - assert unsafe string absent after patch.
2. Integrate script in `scripts/build-apk.sh` before `npx cap sync android`.
3. Bump Android to `1.0.5/code6`.
4. Run patch script once locally.
5. Commit tracked patch/build/version/docs changes.
6. Run `npm run build:apk`.
7. Install `data/artifacts/brain-debug-v1.0.5-code6.apk`.
8. Rerun Android URL-share fixture.
9. Save:
   - screenshot/XML;
   - `a26-share-logcat.raw.txt`;
   - `a26-share-logcat-scan.redacted.txt`;
   - installed package metadata;
   - APK SHA-256.
10. Update QA, trackers, and running log.

## No-Go Gates

- Patch script fails or unsafe plugin log remains.
- APK install metadata is not `1.0.5/code6`.
- Focused app/plugin log scan contains raw fixture URL, `brain_token`, bearer token, or app-owned 64-hex token.
- APK publication remains blocked without user authorization.
