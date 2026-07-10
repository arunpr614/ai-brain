# Global Note AI Inclusion Default - Release Validation

**Date:** 2026-07-10
**Branch:** `codex/note-ai-default-setting`
**Base:** `origin/main` at `840c06e`
**Status:** Local release candidate GO; GitHub integration and production deployment pending.

## Delivered behavior

- Settings > My notes exposes **Include in AI & connections by default**.
- The stored preference defaults off.
- The preference is applied only to a note's first canonical save and deliberate recreation.
- Existing notes and subsequent edits preserve their current per-note choice.
- Exact note search remains available regardless of the default or per-note AI inclusion.
- A true preference is effective only while every active note-consuming provider is eligible.
- Remote providers are named before acknowledgement; a blocked enable cannot persist true.
- Provider revocation clears the global preference and retains the existing synchronous retrieval block and semantic purge behavior.
- **Keep default off** persists false, including after provider configuration drift leaves a stored preference paused.

## Implementation map

| Surface | Implementation |
|---|---|
| Preference storage | `src/lib/notes/ai-default-preference.ts` |
| Effective provider-gated resolver | `src/lib/notes/default-ai-policy.ts` |
| First-save/recreate application | `src/db/item-notes.ts` |
| Provider revocation reset | `src/lib/notes/provider-policy.ts` |
| Authenticated setting API | `src/app/api/settings/note-ai-default/route.ts` |
| Settings interaction | `src/components/note-ai-default-setting.tsx`, `src/app/settings/page.tsx` |

## Privacy and failure behavior

| Scenario | Expected result | Verified |
|---|---|---:|
| Default absent | New note stores `include_in_ai=0` | Yes |
| Default true, local/approved providers | New or recreated note stores `include_in_ai=1` | Yes |
| Default true, any provider ineligible | Effective default is false | Yes |
| Global preference changes after note creation | Existing note choice remains unchanged | Yes |
| Provider consent revoked | Preference clears and purge is queued | Yes |
| Enable mutation lacks auth or exact origin | 401/403, no preference change | Yes |
| Payload is malformed or writes are disabled | 400/503, no preference change | Yes |
| User rejects renewed provider permission | Authoritative false PATCH is persisted | Yes |
| One or more provider acknowledgements fail | Default is not enabled | Yes by fail-closed client/server flow |

## Test evidence

- Full suite: **796 tests**, **92 suites**, **0 failures**.
- Repository behavior: new-note inheritance, recreate inheritance, and existing-note non-retroactivity.
- Provider behavior: active-provider eligibility and revocation reset.
- Route behavior: private/no-store auth, exact-origin mutation, strict payload validation, rollout flag, provider acknowledgement, enable, and disable.
- Client behavior: paused stored preference -> 409 -> **Keep default off** -> false PATCH; two-provider acknowledgement -> true PATCH -> enabled control.

## Release gates

| Gate | Result |
|---|---:|
| `npm test` | Pass: 796 / 796 |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| `npm run check:build-artifacts` | Pass |
| `npm run check:env` | Pass |
| `npm run check:agent-docs` | Pass |
| `npm audit --omit=dev` | Pass: 0 vulnerabilities |
| `git diff --check` | Pass before documentation closeout; rerun required before commit |

## Adversarial review

The review issued a conditional no-go with two P1 findings. Both are closed: rejection now persists false and the interaction has client-level regression coverage. The missing route negatives and stale branch metadata are also closed. Cross-tab display freshness remains a documented P2 follow-up; server behavior is fail-closed.

## Rollout and rollback

- No schema migration is required; the preference uses the existing settings store.
- Production starts with the preference absent/off, so deploying the code does not change any existing or future note until the owner enables the setting.
- Existing notes are never backfilled or rewritten.
- Rollback is application-only: deploy the previous source. The unknown settings key is inert to older code.
- Provider consent must remain unchanged during deployment validation. A read-only production smoke should confirm the setting is off and the app/Recall timer remain healthy.

## Remaining release steps

1. Commit and push the documentation and implementation.
2. Open, validate, and merge the GitHub pull request.
3. Publish the canonical wiki update with a remote-SHA concurrency check and fresh-clone verification.
4. Run the guarded deployment while preserving completed Recall and enabled manual-note flags.
5. Confirm health, route presence, setting-off state, provider-consent state, and unchanged scheduler status.
