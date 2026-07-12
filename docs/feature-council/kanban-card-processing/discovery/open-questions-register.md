# Kanban Card Processing — open-questions register

**Date:** 2026-07-12
**Rule:** routine ambiguity has a safe autonomous default; none of these currently blocks implementation.

| ID | Question / evidence gap | Safe v1 default | Reopen/decision gate | Owner |
|---|---|---|---|---|
| OQ-01 | Do users understand Processing faster than Inbox or Queue? | Processing section, Inbox landing | Rename only after material comprehension failure | Product/Growth |
| OQ-02 | Is More + Library summary discoverable on real mobile? | Ship both entry paths plus capture feedback | Promote to bottom nav if >20% fail unaided | UX/Growth |
| OQ-03 | Does read-only quick preview improve decision confidence? | Omit from production v1 | Add only with measured value and no duplicate note/edit contract | Product/UX |
| OQ-04 | Is recent enrollment cap 25 appropriate for actual backlog? | 30 days/newest 25 plus explicit All | Adjust after preview/dogfood evidence | Product/Data |
| OQ-05 | Do weekly Added/Processed/Completed feel useful without guilt? | Neutral weekly hierarchy; Today secondary/transient | Change presentation, not event truth, if dogfood shows pressure/gaming | Product/Growth |
| OQ-06 | Can pointer drag pass AT/cancel/focus/reduced-motion gates? | Keep drag disabled; native Move primary | Enable only after full manual matrix passes | Accessibility/UX |
| OQ-07 | Is virtualization needed at first release? | Keyset pagination without virtualization | Add only if measured DOM/performance needs it and focus proof passes | Architecture/QA |
| OQ-08 | What exact owner-timezone setting UI is least disruptive? | Initialize one IANA timezone from browser and expose in Processing settings/help | Reopen on timezone mismatch/usability evidence | Product/Data |
| OQ-09 | Should user-facing Board/List expose every handoff grouping option immediately? | Implement accepted list but keep compact/default stable | Remove low-value choices only through recorded post-dogfood decision | Product/UX |
| OQ-10 | What production feature-flag sequence best fits current environment? | Separate navigation/read/write readiness gates, all disabled for first schema deploy | Finalize in technical/release v2 before deploy | Architecture/Release |
| OQ-11 | Is an external product analytics sink permitted? | No external analytics; content-free local canonical/operational events only | Add only with explicit privacy decision | Security/Product |
| OQ-12 | Can current item detail return context protect every unsaved-note path? | Use canonical route and existing note safety; never duplicate editor | Block release on any note-loss/remount finding | UX/Implementation |
| OQ-13 | Does production host class meet proposed 50k p95 budgets? | Retain ≤100ms unfiltered summary, ≤200ms filtered/page targets | Replace estimates with measured host-class evidence | Data/Release |

## Closed by current evidence

- Feature name/direction for implementation: Direction B, Processing/Inbox-first.
- Workflow states/transitions: four any-to-any active states; same-state no-op.
- Existing items: dormant plus explicit enrollment.
- Archive: separate Done-only Processing attribute; Restore and Reprocess.
- Metric semantics: capture-only Added, per-entry-episode Processed, first-lifetime Completed headline.
- Ordering: deterministic; no rank.
- Scope: no batch, project-management fields, or offline mutation queue.

## Escalation rule

Escalate only if new evidence would materially change data safety, privacy, authorized scope, or the production rollout. Otherwise apply the safe default and record the decision in `../decisions/decision-log.md`.
