# PRD-10 Limited Repair Code Review

Created: 2026-06-14 11:30 IST
Reviewer: Codex lead integrator
Scope: PRD-10 add-text/transcript repair slice only
Verdict: APPROVE for local deploy-ready state; production release remains gated

## Reviewed Files

- `src/lib/repair/item-repair.ts`
- `src/lib/repair/item-repair.test.ts`
- `src/lib/repair/item-repair.test.setup.ts`
- `src/app/items/[id]/repair/actions.ts`
- `src/app/items/[id]/repair/repair-form.tsx`
- `src/app/items/[id]/repair/page.tsx`
- `src/app/needs-upgrade/page.tsx`
- `src/app/items/[id]/page.tsx`
- `UX_v2/execution/PRD_10_REPAIR_SMOKE_2026-06-14.md`

## Review Frame

The workspace had a large dirty state before this execution, so this review was scoped to the PRD-10 files owned by this milestone. The review checked the approved limited repair scope: add text/transcript repair, weak-source entry points, stale retrieval cleanup, enrichment/embedding requeue, preservation of manual organization metadata, and no coding of gated features such as mark-good-enough, duplicate merge, native Android offline repair queue, analytics, or PRD-13 share result UI.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

No P2 findings.

### P3

1. Fixed: item detail route formatting drifted around the newly wired repair/capture banners.

   Evidence: `src/app/items/[id]/page.tsx` had tab-indented props and JSX around `searchParams`, `repairQueued`, and the repair CTA.

   Risk: No runtime risk was observed, but the drift made future review noisier in a file that now owns multiple UX result states.

   Resolution: Normalized the touched blocks and reran focused and broad validation.

## Data-Safety Review

- No schema migration was added.
- Repair runs in a single SQLite transaction.
- Stale `chunks_vec` rows are deleted before deleting `chunks`.
- The item body, title, capture quality, extraction method/version, warning, summary, quotes, category, enrichment fields, chunks, vectors, auto tags, topics, embedding job, and enrichment job are updated/reset together.
- Manual tags, collections, source URL, source platform, capture source, author, and source metadata are preserved.
- Old embedding jobs are deleted so the existing trigger can create a new pending embedding job after enrichment completes.
- Rollback is code-only: reverting the repair route/action/helper/UI leaves repaired rows as valid user-provided full-text items.
- Production DB backup remains mandatory before release.

## Verification

- `node --import tsx --test src/lib/repair/item-repair.test.ts src/lib/capture/result.test.ts src/lib/capture/quality.test.ts` passed: 8 tests.
- `npm run typecheck` passed.
- `npm run lint` passed with the existing `src/lib/queue/enrichment-batch-cron.ts:49` unused-disable warning.
- `npm test` passed: 455 tests, 65 suites, 0 failures.
- `npm run build` passed; known `unpdf` warning remains.
- Server-render smoke passed for Needs Upgrade -> repair route -> repaired item banner -> removal from Needs Upgrade; details saved in `UX_v2/execution/PRD_10_REPAIR_SMOKE_2026-06-14.md`.

## Non-Findings / Deferred Gates

- Mark-good-enough remains blocked by D-004 and was not implemented.
- Duplicate merge was not implemented.
- Native Android offline repair queue was not implemented.
- PRD-13 Android share result surface was not implemented.
- Browser visual/form submission smoke was limited by in-app Browser/CDP timeouts; server-render and direct helper smoke covered the route output and state transition, but a real browser/device form submission remains a final QA item.
- Android mandatory validation remains blocked by no attached device/emulator.
- Production/live deploy has not been requested or performed.

## Approval Rationale

The limited repair implementation satisfies the approved PRD-10 slice without crossing open decision gates. The critical data-safety path is covered by unit tests that verify stale retrieval removal, manual metadata preservation, queue reset, Needs Upgrade removal, and embedding requeue behavior. No P0/P1/P2 release-blocking code findings remain for this slice.
