# Feature Release A11 Production Deploy And Android Runtime Implementation Plan V2

Created: 2026-06-16 14:17:00 IST
Revises: `FEATURE_RELEASE_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_IMPLEMENTATION_PLAN_V1_2026-06-16_14-15-00_IST.md`

## Execution Plan

1. Record predeploy backup evidence:
   - backup path
   - integrity
   - item count
   - size
2. Bump Android version metadata for a non-stale APK candidate.
3. Run APK build with scoped Java 21 and Android SDK environment.
4. Record APK SHA-256 for Gradle output and published artifact.
5. Deploy web using `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`.
6. Require deploy-script gates to pass:
   - typecheck
   - lint
   - tests
   - env check
   - build
   - build artifact check
   - remote health
   - remote provider check
   - webhook reachability
7. Run production route smoke and service/log summary.
8. Run redacted live Ask SSE proof with a short-lived signed session generated on the production host.
9. Start or reuse Android emulator, install APK, launch app, capture screenshot and activity focus.
10. Update release packet, A10 QA, milestone tracker, and PM tracker.

## Evidence Files

- `UX_v2/execution/UX_V2_A11_PRODUCTION_DEPLOY_AND_ANDROID_RUNTIME_QA_2026-06-16_14-18-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_14-18-00_IST.md`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/postdeploy-locked.png`
- `UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/android-runtime-a11/window-postdeploy.xml`

## Explicit No-Go Gates

- Web production release is no-go if backup, deploy, health, route smoke, provider proof, or live Ask proof fails.
- APK publication is no-go even after build/install until authenticated Android routes, native share, stale-cache recovery, keyboard, and TalkBack evidence pass.
- Evidence docs are no-go if they include raw bearer tokens, session tokens, production PIN, raw Ask answer, raw item titles, or raw item IDs.
