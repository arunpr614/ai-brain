# Feature Release A24 Dependency Security Hotfix Implementation Plan v1

Created: 2026-06-16 22:53:00 IST
PRD: `FEATURE_RELEASE_A24_DEPENDENCY_SECURITY_HOTFIX_PRD_V2_2026-06-16_22-52-00_IST.md`

## Sequence

1. Confirm audit findings from the deployed dependency set.
2. Patch `next` and `eslint-config-next` to `16.2.9`.
3. Add targeted overrides for nested vulnerable production dependencies:
   - `postcss: 8.5.14`
   - `tar: 7.5.16`
4. Run safe `npm audit fix` for remaining development-tool advisories.
5. Verify resolved versions:
   - `next=16.2.9`
   - `eslint-config-next=16.2.9`
   - `postcss=8.5.14`
   - `tar=7.5.16`
   - `tsx=4.22.4`
6. Run validation:
   - full and production audits
   - typecheck
   - lint
   - full tests
   - production build
   - env/build-artifact checks
   - APK packaging
7. Create A24 evidence and tracker updates.
8. Stage only dependency files and A24 docs/tracker files.
9. Commit A24.
10. Redeploy with `BRAIN_AI_PROVIDER_WARN_ONLY=1 bash scripts/deploy.sh`.
11. Run live smoke:
    - `/unlock` returns 200
    - `/library` redirects to unlock when unauthenticated
    - `/api/ask` returns 401 unauthenticated
    - `/api/telegram/webhook` returns 401 unauthenticated
12. Append running log milestone.

## Rollback Plan

If validation fails before deploy, do not deploy. Revert only the A24 dependency patch or choose the minimum compatible patched version.

If deploy fails after commit, keep the old production deployment running or restore from the existing deploy rollback procedure. Do not claim A24 closure.

## Files Expected To Change

- `package.json`
- `package-lock.json`
- `UX_v2/features/FEATURE_RELEASE_A24_*`
- `UX_v2/execution/UX_V2_A24_*`
- `UX_v2/project_management/UX_V2_PROJECT_TRACKER_UPDATE_2026-06-16_23-10-00_IST.md`
- `UX_v2/trackers/milestone_tracker.md`
- `UX_v2/project_management/UX_V2_DELIVERY_GATE_TRACKER_2026-06-16_15-45-27_IST.md`
- `UX_v2/execution/UX_V2_A7_RELEASE_READINESS_PACKET_2026-06-16_13-18-00_IST.md`
- `RUNNING_LOG.md` append only; keep unstaged unless explicitly approved.

## Stop Conditions

- Any audit still reports a production vulnerability.
- Any full validation command fails.
- Deploy script fails.
- Live smoke contradicts expected auth behavior.
