# PRD-06-FU Code Review

Created: 2026-06-14 11:10 IST
Reviewer: Codex lead integrator
Scope: PRD-06-FU capture result contract implementation only
Verdict: APPROVE after one P2 finding was fixed

## Reviewed Files

- `src/lib/capture/result.ts`
- `src/lib/capture/result.test.ts`
- `src/app/api/capture/url/route.ts`
- `src/app/api/capture/url/route.test.ts`
- `src/app/api/capture/note/route.ts`
- `src/app/api/capture/note/route.test.ts`
- `src/app/api/capture/pdf/route.ts`
- `src/app/api/capture/pdf/route.test.ts`
- `src/app/capture-actions.ts`
- `src/app/actions.ts`
- `src/app/capture/pdf-dropzone.tsx`
- `src/components/share-handler.tsx`
- `src/app/items/[id]/page.tsx`
- `src/db/items.ts`
- `src/lib/capture/quality.test.ts`

## Review Frame

The workspace had a large dirty state before this execution, so this review intentionally focused on the PRD-06 slice owned by this milestone rather than all local git changes. The review checked the approved PRD-06-FU requirements: canonical state vocabulary, DB-derived banner truth, legacy compatibility, duplicate/update/error distinctions, typed share-handler parsing, and no unapproved PRD-13 Android result UI.

## Findings

### P0

No P0 findings.

### P1

No P1 findings.

### P2

1. Fixed: `error_with_saved_item` could expose raw post-save exception text in the client-facing payload message.

   Evidence: `src/lib/capture/result.ts` used `context.errorMessage` in the message returned by `toCaptureResultPayload(..., { state: "error_with_saved_item" })`. URL artifact-save failures pass raw exception messages to that context after already logging them.

   Risk: A saved item could return unnecessary filesystem/provider/internal write details to Android or extension clients. This is not a broad public leak because the capture APIs are authenticated, but it is avoidable user-facing/internal detail exposure.

   Resolution: The user/API message is now generic: "Saved the item, but a post-save capture step failed..." Raw detail remains in structured logs. `src/lib/capture/result.test.ts` now asserts that the raw `"artifact write failed"` text does not appear in the payload message.

### P3

No remaining P3 findings.

## Verification After Fix

- `node --import tsx --test src/lib/capture/result.test.ts src/lib/capture/quality.test.ts` passed: 6 tests.
- `node --import tsx --test src/app/api/capture/url/route.test.ts src/app/api/capture/note/route.test.ts src/app/api/capture/pdf/route.test.ts` passed: 16 tests.
- `npm run typecheck` passed.

## Non-Findings / Deferred Gates

- Android share result UI is intentionally not implemented here; PRD-13 owns the durable Android result surface and remains device-gated.
- `failed_without_saved_item` responses have no item page to open. Current Android paths still use existing alerts for hard failures; this is acceptable for PRD-06 and should be revisited in PRD-13.
- Query param `capture_state` can still be stale or user-edited, but the banner derives platform, captured-via, quality, and warning from the saved DB item. This matches the PRD-06 v2 constraint.
- No database migration was added. Production backup/rollback validation remains a release-gate item, not a code-review finding.

## Approval Rationale

The implementation now satisfies the approved PRD-06 slice without coding gated PRD-13 behavior. Legacy response fields and legacy `capture=url|pdf|note` item links remain supported, weak captures no longer display generic success, duplicate and updated-existing states are distinct, and the remaining Android/device limitations are tracked outside this code slice.
