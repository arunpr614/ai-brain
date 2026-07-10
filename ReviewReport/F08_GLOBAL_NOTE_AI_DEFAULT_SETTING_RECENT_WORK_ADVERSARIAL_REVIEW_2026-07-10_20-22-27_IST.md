# F08 Global Note AI Default Setting - Adversarial Review

**Created:** 2026-07-10 20:22:27 IST
**Reviewer stance:** Brutally honest adversarial review
**Reviewed target:** Uncommitted recent-work diff on `codex/note-ai-default-setting` from `origin/main` `840c06e`
**Report path:** `/Users/arun.prakash/Documents/arunvault/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/Phase3/ReviewReport/F08_GLOBAL_NOTE_AI_DEFAULT_SETTING_RECENT_WORK_ADVERSARIAL_REVIEW_2026-07-10_20-22-27_IST.md`

## Executive Verdict

**Conditional no-go.** The server-side preference, provider gate, first-save/recreate semantics, and revocation behavior are materially correct, but the Settings UI has one privacy-significant false-success path: in the stale-preference/provider-change state, choosing **Keep default off** does not actually persist off. Release is blocked until that action saves `false` and the client interaction is regression-tested. A cross-tab freshness gap and stale tracker metadata are non-blocking follow-ups.

## Evidence Inspected

- `git status --short --branch`, `git diff --stat`, targeted source diff, and line-numbered current files.
- `src/components/note-ai-default-setting.tsx` lines 20-159.
- `src/app/api/settings/note-ai-default/route.ts` lines 15-82 and its route tests.
- `src/lib/notes/ai-default-preference.ts`, `default-ai-policy.ts`, and provider-policy revocation path.
- `src/db/item-notes.ts` lines 371-423 and new/recreate/non-retroactivity tests.
- F08 README, decision log, project tracker, canonical wiki, and milestone running-log entry.
- Full local gates: 793 tests / 92 suites, typecheck, full ESLint, production build, build-artifact check, environment check, documentation privacy/structure/coverage checks, and production dependency audit.

## Findings

### P0 - Must Fix Before Execution Or Release

No P0 findings found.

### P1 - High Risk

#### 1. “Keep default off” can leave the stored default on

**Evidence:** `src/components/note-ai-default-setting.tsx:82` intentionally renders effective state as `enabled && eligible`. When a previously enabled preference becomes ineligible after a provider configuration change, the checkbox renders off and the renewal flow appears. The **Keep default off** handler at lines 145-154 only clears local dialog state and writes a notice; it never calls the PATCH endpoint with `false`.
**Why it matters:** This is a privacy/trust control. The user is explicitly told the default remains off, but the stored preference can remain `true`.
**Failure mode:** Provider configuration changes while the stored preference is true -> UI renders effective off -> user reviews the provider prompt and selects **Keep default off** -> preference remains true -> providers later become eligible through another consent path -> new notes silently begin inheriting AI inclusion despite the user's explicit choice.
**Recommendation:** Make the button call the same authoritative `saveDefault(false)` path, preserve the dialog on failure, and add a client interaction regression test covering initial `enabled=true`, `eligible=false`, a 409 enable attempt, and the subsequent false PATCH.

#### 2. The privacy-critical consent interaction has no client behavior test

**Evidence:** Route tests cover authentication, origin, provider eligibility, enable, and disable, but no test renders `NoteAiDefaultSetting` or exercises its controlled checkbox, consent dialog, partial failure, or cancellation behavior. The build proves compilation, not runtime event behavior.
**Why it matters:** Finding P1-1 survived 793 green tests because server coverage cannot detect a misleading client control.
**Failure mode:** Copy, state, and network behavior can diverge while API/repository tests remain green.
**Recommendation:** Add a jsdom/React interaction test with mocked fetch responses for enable-blocked, keep-off persistence, provider approval, and network failure. Treat this as a release gate for future privacy-control changes.

### P2 - Medium Risk

#### 1. An open Settings page can display stale effective state after another tab revokes consent

**Evidence:** The component initializes `enabled` and `eligible` once from server props and refreshes them only after this component's own PATCH. Provider revocation correctly clears the preference in `src/lib/notes/provider-policy.ts:151-153`, but no focus, visibility, or cross-tab refresh updates an already-open Settings page.
**Why it matters:** Server enforcement remains safe, but the control may claim on until reload after a separate-tab revocation.
**Failure mode:** Revoke provider permission elsewhere while Settings is open -> server blocks new-note inheritance -> Settings still appears enabled.
**Recommendation:** Re-fetch the setting on window focus/visibility change or publish a small cross-tab settings event. This does not block release because the server fails closed.

#### 2. Route negative coverage omits malformed payloads and disabled-write rollout state

**Evidence:** `src/app/api/settings/note-ai-default/route.test.ts` covers auth only for GET, origin checks, consent blocking, enable, and disable. It does not assert PATCH authentication, strict-schema rejection, or `MANUAL_NOTES_WRITE_ENABLED=0`.
**Why it matters:** These are established route contract gates and should not rely solely on copied implementation patterns.
**Failure mode:** A future refactor could weaken rollout/auth validation without failing this route's tests.
**Recommendation:** Add focused 401, 400, and 503 assertions.

### P3 - Low Risk Or Polish

#### 1. The current project tracker still names the superseded implementation branch

**Evidence:** `docs/feature-council/F08-manual-content-notes/PROJECT_TRACKER.md:6` says `codex/manual-content-notes`, while the active follow-on branch is `codex/note-ai-default-setting`.
**Why it matters:** Cold-start handoffs can inspect or publish the wrong branch.
**Failure mode:** A later agent assumes the tracker branch is current and misses the follow-on diff.
**Recommendation:** Add an explicit follow-on branch field or update the current branch field before publication.

## What The Original Plan Or Work Gets Wrong

The work correctly distinguished configured preference from effective eligibility, but the UI implementation did not carry that distinction through the cancellation action. It overclaims “New notes remain excluded ... by default” without persisting the user's choice in the one state where configured and effective values differ. The validation plan also treated API and build success as sufficient for an interaction whose correctness lives in client state transitions.

## Missing Validation

- Client interaction coverage for effective-off/stored-on renewal cancellation.
- Client interaction coverage for provider approval and partial approval failure.
- PATCH unauthenticated, malformed-body, and write-flag-disabled route tests.
- A fresh rendered Settings interaction check at desktop and narrow width. Product Design browser policy requires the user's chosen browser before that visual pass.
- Post-deploy read-only authenticated verification that production reports the preference off and provider policy ineligible without altering real consent.

## Revised Recommendations

1. Persist `false` when **Keep default off** is selected.
2. Add jsdom/React client interaction coverage for the consent/cancel state machine.
3. Add the missing API negative cases.
4. Update tracker branch metadata and write a focused validation report with the final test count.
5. Re-run the full gates, then publish and deploy only if no P0/P1 remains.

## Go / No-Go Recommendation

**No-go until P1-1 and P1-2 are closed.** After the cancellation path is authoritative and client-tested, the server-side design is suitable for release. P2 cross-tab refresh may follow because server enforcement remains fail-closed, but it should be tracked explicitly.

## Plan Revision Inputs

### Required Deletions

- Delete the local-only **Keep default off** handler that merely hides the permission panel.
- Delete any release claim based only on route/repository tests and compilation.

### Required Additions

- Authoritative false PATCH from the cancel action.
- Client state-machine regression tests.
- Focused route negative tests.
- Final validation/disposition evidence.

### Required Acceptance Criteria Changes

- “Keep default off” means the persisted preference is false, including after provider configuration drift.
- A success notice may appear only after the authoritative PATCH succeeds.
- Existing notes remain unchanged in stored per-note inclusion when the global preference changes.

### Required Validation Changes

- Render and interact with the client component under mocked 409/200/error responses.
- Assert every setting mutation remains authenticated, same-origin, schema-valid, and rollout-gated.
- Re-run the complete release gate after remediation.

### Required No-Go Gates

- Any UI path that claims off without persisting false.
- Any ability for a global preference to bypass current provider eligibility.
- Any retroactive rewrite of existing note inclusion.
- Any failing full test, lint, typecheck, build, privacy, documentation, or dependency gate.

## Residual Risks

Even after remediation, another open tab can briefly show stale eligibility until reload, and partial multi-provider approval can persist a subset of approvals. Both states remain server-safe because effective eligibility requires all active providers and first-save evaluation is authoritative. Production provider configuration changes still require a deliberate renewed-acknowledgement check before the default becomes effective.
