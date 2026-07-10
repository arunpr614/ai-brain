# Global Note AI Default - Adversarial Review Disposition

**Date:** 2026-07-10
**Review:** `ReviewReport/F08_GLOBAL_NOTE_AI_DEFAULT_SETTING_RECENT_WORK_ADVERSARIAL_REVIEW_2026-07-10_20-22-27_IST.md`
**Final disposition:** Conditional no-go findings closed; release candidate GO.

## Finding disposition

| Finding | Severity | Resolution | Evidence |
|---|---:|---|---|
| Keep default off did not persist false when a stored preference was paused | P1 | Closed. The action now uses the authoritative false PATCH and leaves the permission panel visible if saving fails. | `src/components/note-ai-default-setting.tsx`; jsdom interaction regression |
| Privacy-critical consent interaction lacked client behavior tests | P1 | Closed. Added blocked-enable/cancel persistence and two-provider approval/enable interaction tests. | `src/components/note-ai-default-setting.test.ts` |
| Open Settings page may be stale after revocation in another tab | P2 | Accepted follow-up. Server creation remains fail-closed and provider revocation clears the stored preference atomically. No in-product revocation surface currently creates this state in another tab. | `src/lib/notes/provider-policy.ts`; `src/lib/notes/default-ai-policy.ts` |
| Route negative coverage omitted auth, malformed body, and disabled-write state | P2 | Closed. Added 401, strict-schema 400, and rollout-gated 503 assertions. | `src/app/api/settings/note-ai-default/route.test.ts` |
| Project tracker named the superseded branch | P3 | Closed. Tracker now separates the original release branch from the active follow-on branch. | `PROJECT_TRACKER.md` |

## Revalidation

- 796 tests across 92 suites passed with zero failures.
- Full TypeScript and ESLint checks passed.
- Next.js production build passed; the pre-existing `unpdf` `import.meta` warning is unchanged.
- Standalone artifact privacy check passed.
- Documentation generation, privacy, structure, and coverage checks passed.
- Production dependency audit reported zero vulnerabilities.

## Residual risk

An already-open Settings page can briefly display stale eligibility after an out-of-band or another-tab provider revocation until reload. This cannot enable transmission: the stored preference is cleared on revocation, every first save recomputes effective eligibility server-side, and all note retrieval/provider paths retain their existing policy checks.
