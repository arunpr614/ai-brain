# Recall manual sync council findings

## Consolidated recommendation

Proceed with a deterministic, owner-only manual request over the complete guarded daily pipeline. The feature should optimize confidence and time-to-value, not click frequency or operational control. SQLite remains the durable authority; the browser never receives Recall credentials, raw reports, source identifiers, commands, host paths, or unsanitized errors.

## Perspective summaries

### Growth and engagement

- Settings placement and a single **Sync now** action are sufficiently discoverable for the owner.
- Retain confirmation in v1 because the action can write library data.
- Count “no new eligible items” as a successful freshness check.
- Measure request-to-start latency, success/current rates, deduplication, and cooldown encounters, not raw click volume.

### Platform and data

- Add one durable request queue, one atomic claimer, one active manual request, one full-wrapper lock, and the existing core lock/checkpoint.
- Derive freshness only from a post-validator success marker.
- Persist progress after each card transaction so partial failure is truthful.
- Use path activation plus a 60-second safety poll; SQLite, not the marker, is authority.
- Split Recall credential delivery from the web process before enablement.

### Power user and workflow

- The trusted path is confirmation → queued → running → terminal, recoverable after refresh, navigation, page closure, restart, and another tab.
- Distinguish request-not-accepted, accepted-but-status-unknown, sync failure, and session expiration.
- Retain last-success through every non-success outcome.
- Do not auto-submit after offline recovery or auto-create a new request after failure.

### Technical architecture

- Reuse `recall-scheduled-apply.sh` and `runRecallSync`; reject route-side execution, web-spawned shell commands, and a second importer.
- Add whole-wrapper serialization because the current lock has a dry-run/apply gap.
- Add immediate SQLite transactions, busy handling, stable run/request correlation, in-progress persistence, heartbeat, recovery, post-validator completion, and trusted timer status.
- Keep feature flag off until service credential/access and unit readiness are proven.

### UX and accessibility

- Preserve the supplied card anatomy and current Settings visual language.
- Add all missing states and retain persistent metadata across transient/failure states.
- Use Radix Dialog, stable transition-only live region, 44px mobile targets, current semantic tokens, bottom-nav clearance, and reduced-motion behavior.
- Produce a focused revised prototype and implementation screenshots at desktop, 390px, and 320px.

### AI expert council

No generative model belongs in the runtime. State explanation is a deterministic allowlisted mapping problem. AI-authored summaries, predictions, proactive prompts, and anomaly explanations would add privacy, latency, and ambiguity without improving v1.

## Release-blocking gates

1. Full wrapper, not only the core runner, is reused and serialized.
2. Last-success is written only after final validator success.
3. Non-zero partial writes survive later error/process recovery and never advance checkpoint/last-success.
4. Simultaneous tabs/workers create one active request and at most one apply.
5. The route is owner-only, exact-origin protected, body bounded, flag-gated, and strictly allowlisted.
6. The web process cannot read the Recall credential before production enablement.
7. Lost wake, stale claim, long-running, offline, auth-expired, and automatic overlap behavior is tested.
8. Timer configuration/next occurrence is not mutated by manual outcomes or rollback.
9. Desktop/mobile/keyboard/reduced-motion/contrast verification passes.
10. Wiki and repository docs accurately distinguish review-ready, flag-off implementation from deployed runtime.
