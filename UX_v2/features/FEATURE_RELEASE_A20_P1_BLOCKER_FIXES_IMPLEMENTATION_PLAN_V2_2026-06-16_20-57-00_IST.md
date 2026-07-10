# Feature Release A20 P1 Blocker Fixes Implementation Plan V2

Created: 2026-06-16 20:57:00 IST
Owner: Codex
Status: Approved for scoped execution
PRD: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_PRD_V2_2026-06-16_20-54-00_IST.md`
Supersedes: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_V1_2026-06-16_20-55-00_IST.md`
Adversarial review: `FEATURE_RELEASE_A20_P1_BLOCKER_FIXES_IMPLEMENTATION_PLAN_ADVERSARIAL_REVIEW_2026-06-16_20-56-00_IST.md`

## First-Pass Hardening Scope

Pages:

- `src/app/settings/device-pairing/page.tsx`
- `src/app/library/page.tsx`
- `src/app/more/page.tsx`

APIs/routes:

- `src/lib/device-pairing/create-route-handler.ts`
- `src/app/api/ask/route.ts`
- `src/app/api/library/export.zip/route.ts`
- `src/app/api/search/route.ts`
- `src/app/api/settings/provider-status/route.ts`
- `src/app/api/settings/rotate-token/route.ts`
- `src/app/api/items/[id]/export.md/route.ts`
- `src/app/api/items/[id]/enrich/route.ts`
- `src/app/api/items/[id]/enrichment-status/route.ts`
- `src/app/api/threads/route.ts`
- `src/app/api/threads/[id]/route.ts`
- `src/app/api/threads/[id]/messages/route.ts`

Any remaining presence-only private route discovered during implementation must be listed in the A20 QA report.

## Step Plan

1. Add verified-session helpers in `src/lib/auth.ts`.
2. Replace cookie-presence checks in the first-pass scope with verified-session helper.
3. Update focused route tests to use signed session tokens or injected verifier overrides.
4. Add invalid-cookie tests for device pairing and library export.
5. Add Ask client reset logic and pure helper coverage.
6. Run focused tests for changed auth/Ask routes.
7. Run full validation: typecheck, lint, `npm test`, build, env, build-artifacts. APK build only if Android/public packaging changes.
8. Restage changed source/test/governance paths explicitly.
9. Verify final staged path count, `git diff --cached --check`, staged exclusion scan, and no root `RUNNING_LOG.md` staged.
10. Create A20 QA report, PM update, tracker updates, and running-log entry.

## No-Go Conditions

- Any first-pass route/page still returns sensitive data for an invalid stub cookie.
- Ask client still keeps stale `activeThreadId` after thread prop changes.
- Focused or full validation fails without documented blocker.
- Changed source/test files are not staged into the candidate.
- A20 claims release completion, APK publication, or deployment.
