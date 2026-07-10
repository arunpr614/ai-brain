# Feature Release A29 - Android Capture Source Attribution Implementation Plan v1

Created: 2026-06-17 00:21:00 IST
Owner: Codex
Status: Draft for adversarial review
PRD: `FEATURE_RELEASE_A29_ANDROID_CAPTURE_SOURCE_ATTRIBUTION_PRD_V2_2026-06-17_00-20-00_IST.md`

## Objective

Patch Android native share capture requests to send the existing trusted Android capture-source header, validate locally, deploy production, and rerun native URL-share proof with a new fixture.

## Implementation Steps

1. Extract helper in `src/components/share-handler.tsx` or a nearby testable module:
   - returns `x-brain-capture-source: android`;
   - can merge with content-type/authorization/checksum headers.
2. Update `postJson()` so URL and note capture requests include the helper output.
3. Update PDF upload fetch so it includes the helper output.
4. Add focused tests for header construction.
5. Run focused tests.
6. Run typecheck, lint, full tests, production build, env check, and build-artifact check.
7. Deploy production with `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`.
8. Force-stop the Android app and send a new native URL share fixture.
9. Verify screenshot/user result, production DB `capture_source=android`, cleanup, and log hygiene.
10. Write A28/A29 QA and tracker docs.
11. Stage only safe files and commit.

## Files Expected To Change

- `src/components/share-handler.tsx`
- New or existing focused test file for Android capture-source header behavior.
- A28/A29 governance, QA, and tracker docs.

## Validation

- Focused tests for header behavior.
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run check:env`
- `npm run check:build-artifacts`
- Production deploy smoke.
- Native Android rerun proof.

## Rollback

The source change is client-side header addition only. If deploy or native proof fails, do not publish APK; keep A29 as blocked and preserve cleanup evidence.
