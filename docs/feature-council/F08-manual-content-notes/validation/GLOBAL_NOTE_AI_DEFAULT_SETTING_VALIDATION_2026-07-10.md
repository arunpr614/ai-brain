# Global Note AI Inclusion Default - Release Validation

**Date:** 2026-07-10
**Branch:** `codex/note-ai-default-setting`
**Base:** `origin/main` at `840c06e`
**Status:** Production released and read-only smoke verified.

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
- Production retained the preference absent/off, so the deployment changed no existing note and no future note inherits AI inclusion until the owner enables the setting.
- Existing notes are never backfilled or rewritten.
- Rollback is application-only: deploy the previous source. The unknown settings key is inert to older code.
- Provider consent remained unchanged during deployment validation.

## GitHub and production release evidence

- Improvement reports were committed at `203e0f6`; implementation and evidence were committed at `d4f3932`.
- GitHub PR #12 passed its required documentation check and merged to `main` at `01721d1c2bbb686b9768d38c688352f78933205f`.
- The deployed feature tree and the merge commit have the same Git tree, `ee8b1e9982ee42cf2e1ff70585d527065d5d3607`.
- The first guarded deploy attempt stopped before build/sync because local Ollama was unavailable. This was a safe pre-deploy stop after a verified backup.
- The documented warning-only local-provider path then completed the full 796-test release gate, build, artifact sync, native dependency repair, service restart, authenticated health check, and webhook reachability check.
- A separate strict production-host provider check passed for Anthropic generation/Ask and Gemini embeddings.
- `brain` is active; `brain-recall-sync.timer` remains enabled and active; all existing manual-note rollout flags were preserved.
- The production route bundle exists and authenticated read-only API/UI smokes passed.
- Production state after release: global preference absent/off, effective default off, two disclosed providers, provider policy eligible from two existing owner approvals. The deployment neither added nor revoked those approvals.

## Remaining follow-up

- Publish the final canonical wiki update with the normal remote-SHA concurrency gate and fresh-clone byte comparison.
- Consider a future focus/visibility refresh for an already-open Settings page after out-of-band provider revocation. Server enforcement is already fail-closed.
