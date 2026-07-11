# Recall manual sync discovery report

## Baseline and verification

- Repository origin: `https://github.com/arunpr614/ai-brain.git`.
- Clean worktree: branch `feat/recall-manual-sync` from `origin/main` at `1cb5d36`.
- Existing source checkout and unrelated worktrees were preserved.
- Baseline typecheck and focused lint pass.
- All 25 focused Recall migration, scheduler, and runner tests pass before feature changes.
- GitHub.com authentication is available; the unrelated enterprise-host credential is invalid but not needed.

## Current synchronization behavior

The automatic timer starts a hardened oneshot service. The service invokes `scripts/recall-scheduled-apply.sh`, which gates enablement/credentials/proofs, performs a dry run, validates its report/caps, creates a fresh SQLite backup, executes a proof-backed apply, validates the apply report, and emits private operational evidence. Both dry and apply call the same packaged `runRecallSync` pipeline.

`runRecallSync` computes an overlapped checkpoint-to-now window, acquires the shared database lock, enumerates and maps Recall cards, enforces fidelity/caps, plans or applies per-card transactions, persists a sanitized terminal run, advances the checkpoint only on safe apply completion, and releases the lock.

## Existing entry points

| Concern | Entry point |
| --- | --- |
| Settings | `src/app/settings/page.tsx` |
| Session auth | `src/lib/auth.ts`, `src/proxy.ts` |
| Same-origin/private response pattern | `src/lib/notes/http.ts` |
| Recall state, runs, checkpoint, lock | `src/db/recall-sync.ts`, migration `020_recall_sync.sql` |
| Import orchestration | `src/lib/recall/sync-runner.ts` |
| Client, mapping, fidelity, importer | `src/lib/recall/` |
| Caps, window, error and redaction | `src/lib/recall/scheduler.ts` |
| Guarded production sequence | `scripts/recall-scheduled-apply.sh` |
| Packaging | `scripts/build-recall-cli.mjs` |
| Automatic units | `scripts/deploy/brain-recall-sync.service`, `.timer` |
| Deployment gates | `scripts/deploy.sh` |
| Current wiki | `docs/wiki/Recall-Synchronization.md` and linked architecture/API/data/operations pages |

## Current sources of sync status

- `checkpoint:last_successful_to` is durable UTC coverage state and controls the next overlap window. It is not wall-clock completion.
- `recall_sync_runs` holds terminal dry/apply rows and aggregate counts. Rows are written before the wrapper’s final validator.
- `recall_sync_items.last_synced_at` is per-card processing state, not global success.
- `lock:recall_sync` signals an active core invocation but not the full wrapper lifecycle.
- Private reports/journal are useful to operators but must not be read by the browser or exposed through the API.

Therefore “last successful sync” is not yet safely available as a product field. A trusted post-validator completion marker is required.

## Existing trigger and concurrency behavior

- Automatic trigger: daily systemd timer at 20:00 UTC with up to ten minutes randomized delay.
- Historical operator-only manual verification wrappers exist but are not a product trigger and require explicit approval text.
- No owner-facing trigger, queue, idempotency key, cooldown, or request lifecycle exists.
- The core DB lock prevents concurrent runner invocations, but it is released between the wrapper’s dry-run and apply calls. Whole-wrapper serialization is missing.
- Card ID/content hash/source URL checks already provide item-level deduplication and safe retry defense in depth.

## Persistence and failure gaps

- No `recall_sync_requests` table or request-to-run correlation.
- No in-progress run insertion, heartbeat, or incremental aggregate persistence.
- A later per-card exception can occur after earlier writes; the outer error path can persist a zero-count report.
- The shared SQLite WAL database will become multi-process. Immediate transactions, a bounded busy timeout, and race tests are needed.
- Worker/service crash recovery and 30-minute unclaimed expiry are absent.
- A full-wrapper success marker and trusted exact next-timer snapshot are absent.

## Security and privacy

Reusable controls include owner-session verification, exact same-origin mutation checks, private/no-store headers, server-only credentials, report redaction, constrained product reason categories, and hardened systemd services.

Critical discovery: checked-in web and Recall services currently run as the same user and load the same environment file. Before production enablement, Recall credential delivery must be split and proven inaccessible to the web process. The manual route must never accept operational parameters, commands, paths, credentials, dates, caps, or policy flags, and must return only allowlisted states/timestamps/counts/reasons/request ID.

## Design-system and responsive findings

The current semantic tokens, settings panels, 680px content width, fixed mobile bottom navigation, safe-area padding, and Radix Dialog dependency are sufficient. The supplied composition should be retained, but its custom palette/shell, focus behavior, touch sizes, and missing states must be corrected. A focused revised state prototype is required.

## Tests and operational conventions

Existing protection includes client, fidelity, importer, scheduler, sync-runner, migration, CLI bundle, wrapper, report, privacy, scheduler-artifact, deployment, type, lint, test, and production-build gates. New tests must cover request migration/repository races, route auth/origin/body/flag behavior, worker claim/recovery, outer lock, partial writes, post-validator success, timer invariance, polling/visibility/offline/auth/multi-tab, IST boundaries, dialog/accessibility, responsive layout, and source-safe schemas.

## Wiki and documentation gaps

The current wiki accurately says Recall is a guarded one-way scheduled import with no general UI. It must be updated after implementation across feature catalog, Recall feature, architecture, APIs, data model, deployment/operations, configuration, repository map, troubleshooting, limitations, documentation changelog, and agent onboarding. The separate wiki repository must be updated with preserved history and verified from a fresh clone.

## Recommended v1 scope

Implement the owner-only Settings panel, exact IST last-success status, durable single-active request, trusted path/timer worker, full-wrapper reuse, outer and inner lock coordination, truthful progress/partial outcomes, safe route/status mapping, responsive accessible state controller, feature flag default off, complete automated/manual evidence, docs/wiki, and review-ready PR.

Exclude custom windows/caps/policies, cancellation, history UI, per-item results, two-way Recall mutation, operator commands, general job execution, WebSockets, Redis, third-party analytics, scheduler changes, merge, deployment, and production enablement.
