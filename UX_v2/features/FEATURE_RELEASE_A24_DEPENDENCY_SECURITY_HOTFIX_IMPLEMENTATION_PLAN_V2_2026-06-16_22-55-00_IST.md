# Feature Release A24 Dependency Security Hotfix Implementation Plan v2

Created: 2026-06-16 22:55:00 IST
Supersedes: `FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_IMPLEMENTATION_PLAN_V1_2026-06-16_22-53-00_IST.md`
Review incorporated: `FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_22-54-00_IST.md`

## Execution Sequence

1. Patch dependencies only:
   - `next` exact pin to `16.2.9`
   - `eslint-config-next` exact pin to `16.2.9`
   - `overrides.postcss` to `8.5.14`
   - `overrides.tar` to `7.5.16`
   - safe `npm audit fix` updates for dev tools
2. Verify resolved versions:
   - `next=16.2.9`
   - `eslint-config-next=16.2.9`
   - `postcss=8.5.14`
   - `tar=7.5.16`
   - `tsx=4.22.4`
3. Validate:
   - `npm audit`
   - `npm audit --omit=dev`
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run check:env`
   - `npm run check:build-artifacts`
   - `ALLOW_REBUILD_SAME_APK_VERSION=1 npm run build:apk`
4. Create A24 governance and evidence docs.
5. Stage with an explicit allow-list. Do not use broad directory staging.
6. Run staged hygiene:
   - `git diff --cached --check`
   - staged path scan for root `RUNNING_LOG.md`, `data/artifacts/`, APK/AAB, keystore, SQLite, `.env`, visual/source evidence, and broad `assets/`
7. Commit A24 dependency hotfix.
8. Record the deployed source commit hash.
9. Deploy the committed hotfix with `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`.
10. Run live smoke:
    - `GET /unlock` returns 200
    - unauthenticated `HEAD /library` redirects to `/unlock?next=...`
    - unauthenticated `POST /api/ask` returns 401
    - unauthenticated `POST /api/telegram/webhook` returns 401
11. Create/update A24 QA, PM tracker, milestone tracker, delivery tracker, release packet, and append-only running log.

## Staging Allow-List

- `package.json`
- `package-lock.json`
- `UX_v2/features/FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_*`
- `UX_v2/execution/UX_V2_A24_DEPENDENCY_SECURITY_HOTFIX_QA_2026-06-16_23-10-00_IST.md`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_23-10-00_IST.md`
- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`

Root `RUNNING_LOG.md` remains append-only and unstaged unless explicitly approved.

## Closure Rule

A24 is closed only when the patched dependency set is deployed to production and the deployed source commit hash is recorded. If a later docs-only commit records deployment evidence, the tracker must distinguish branch head from deployed source commit.
