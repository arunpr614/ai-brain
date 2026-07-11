# Recall manual sync source and design assessment

## Sources and precedence

1. Supplied `RECALL_MANUAL_SYNC_SETTINGS_PRD_2026-07-10.md`.
2. Rendered `desktop.html`, `mobile.html`, and `states.html` prototypes.
3. Current `main` architecture, settings patterns, semantic tokens, tests, and deployment units.
4. Current canonical wiki and historical Recall delivery records.

All inputs were readable. The repository baseline is `1cb5d36`. The three HTML files were rendered, not merely read, at desktop and narrow mobile widths. Captures are under `visual-evidence/`.

## What the supplied product input establishes

- Owner-only Settings control.
- Browser enqueues; trusted worker executes.
- Complete existing guarded wrapper is reused.
- Durable single-active request, idempotency, cooldown, expiry, background continuation, and two-second active polling.
- Most recent successful apply is shown; failed/partial attempts do not replace it.
- UTC server instants are rendered in fixed `Asia/Kolkata`/IST.
- Full result truth includes imported, current, blocked, zero-write failure, and partial failure.
- Daily schedule, caps, fidelity rules, credentials, reports, and checkpoint authority remain server/operator owned.

## Rendered design assessment

The desktop design correctly places a restrained Recall panel after AI services in the existing 680px Settings column. The ready card uses a recognizable identity row, semantic badge, status summary, persistent metadata, action, and quiet safety reminder. Mobile appropriately stacks metadata and makes the action full width. The state board clearly differentiates ready, queued, running, imported, current, blocked, failed, and partial outcomes.

Material gaps found in rendered inspection:

- Loading, never-synced, automatic-running, long-running, rate-limited, expired, unavailable, offline/status-unknown, and session-expired states are absent.
- Queued, running, and partial cards replace last-success/next-schedule facts instead of retaining them.
- Prototype copy says “Last synced” rather than the authoritative “Last successful sync,” and its timestamp strings do not follow the exact PRD formatter.
- The custom dialog permits focus to escape and does not reliably restore the opener.
- Mobile Sync/Start are 42px, Cancel is 34px, and close is 30px rather than the required 44px minimum.
- Muted prototype text on white is about 3.06:1 and is too weak at its small size.
- Prototype colors and shell are parallel approximations, not the current project tokens and safe-area navigation.

## Current-code assessment

Existing strengths:

- Settings authenticates owner sessions and already contains responsive panels and semantic tokens.
- Exact same-origin protection and private no-store response headers are reusable.
- `runRecallSync`, client, mapper, fidelity policy, importer, caps, checkpoint, report sanitization, and `tryAcquireRecallSyncLock` are implemented and covered by tests.
- The shell wrapper performs dry run, report validation, backup proof, apply, and final report validation.
- The daily systemd service/timer and deployment gates exist.

Missing or insufficient:

- No request queue, manual API, worker, activation, feature panel, or safe status contract.
- Checkpoint is a coverage boundary, not completion time.
- Terminal apply rows are written before final wrapper validation.
- The core lock is released between dry-run and apply wrapper stages.
- Runs are inserted only at terminal return despite a `running` schema state.
- Per-card writes can partially succeed before a later exception, while the outer catch can persist zero counts.
- Web and Recall services currently share a user/environment, so credential separation is not proven.
- No trusted persisted exact timer next-elapse exists.

## Conflict resolutions

| Conflict | Resolution |
| --- | --- |
| Device-local default versus explicit IST PRD | Fixed IST wins. |
| Recall placement versus conditional My notes | AI services → Recall sync → My notes → Data & Privacy. |
| Unauthorized `401` versus flag-off `404` language | Authenticate first; unauthenticated is always `401`. |
| New/existing request `202` versus `200` | `202` new, `200` deduplicated active. |
| Exact next time versus randomized timer | Trusted persisted next-elapse or “Schedule unavailable.” |
| Core `done` versus complete wrapper success | Post-validator marker is normative success source. |
| Internal `partial_failure` name versus product partial writes | Product partial requires persisted non-zero writes. |
| Active-run coalescing versus queue-after | Queue-after in v1 unless coverage/linkage can be proven; no false coalescing. |

## Scope recommendation

Proceed with the narrow durable-request feature and a focused prototype revision. Do not add custom sync options, history UI, cancellation, scheduler controls, browser-side execution, general service privileges, a second importer, third-party analytics, Redis, or a Settings redesign.
