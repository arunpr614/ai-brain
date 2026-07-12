# Kanban Card Processing — implementation security and adversarial review

**Review date:** 2026-07-12
**Reviewers:** independent application-security and release-safety agents; coordinator performed integration verification
**Scope:** migration/schema, workflow domain, private APIs, frontend data boundary, readiness/configuration, CI artifacts, immutable activation, backup, rollback
**Final verdict:** **GO for PR/CI integration. Production remains gated on rehearsal, staged deployment, and live verification.**

## Initial adversarial result

The first implementation review correctly returned **NO-GO** for release operations. It found:

- one P0 database-identity defect: the application could migrate a configured database different from the hard-coded backup/compatibility target;
- post-cutover failures that exited without returning to the prior release;
- rollback that restored only the current symlink while leaving candidate release metadata and systemd units;
- artifact-controlled filenames interpolated into privileged remote shell commands;
- self-consistent artifact hashes without protected-main provenance;
- unverified local bootstrap tools installed as root outside the immutable artifact trust chain;
- archive verification that admitted symlink/special-entry and expanded-size risk;
- a migration manifest not proven to match runtime migration bytes;
- a nominal readiness `status` command that could initialize/migrate through `getDb()`;
- no strict production HMAC/timezone/public-origin readiness proof.

The independent application review found no P0/P1. It held two P2 abuse concerns: full request buffering before a 16 KiB check, and no valid-session write throttle bounding durable rejected/no-op receipt growth.

## Disposition

| Finding | Resolution | Verification |
|---|---|---|
| Backup/runtime database identity split | One canonical absolute existing DB path is resolved from the root-owned EnvironmentFile and bound through path SHA-256 plus device/inode across backup, activate, switch, audit, and rollback | Release-script review, syntax, full artifact rehearsal |
| Post-cutover failure leaves candidate live | Every candidate health/readiness/timer/boundary failure invokes verified switch-back and authenticated prior-release health | Release-script control-flow review and smoke fixtures |
| Partial rollback state | Activate/switch snapshot and restore current link, `release.env`, service/audit units, daemon state, timer enable state, timer active state, and application service | Transactional rollback implementation review |
| Privileged filename injection | Exactly one SHA-derived archive/manifest name is accepted; transfer uses a random private directory and fixed validated server paths | Filename guards and shell syntax review |
| Artifact provenance gap | PR runs verify only; deployable artifacts are protected-main/workflow-dispatch outputs with GitHub provenance attestations. Deploy verifies repository, pinned workflow, main ref, builder source SHA, and non-self-hosted builder | Pinned workflow YAML and deploy verifier review |
| Bootstrap substitution | Local tool bytes must match the attested manifest; remote bytes are rehashed into immutable builder-SHA tool sets selected atomically | Artifact manifest/tool-set checks |
| Archive link/special/bomb risk | Builder and verifier accept regular files only; activation validates member paths/types/count/expanded bytes and extracts as unprivileged `brain:brain-data` before root promotion | 20-check release smoke and 3,612-file full artifact verification |
| Migration manifest/runtime split | Builder compares source and runtime migrations exactly; verifier rehashes runtime files; `_migrations.sha256` records/backfills the verified baseline and stores new hashes atomically; activation/switch/readiness reject mismatches | Migration test, readiness smoke, full artifact verification |
| Mutating status command | Status opens only an existing SQLite file through an explicit read-only connection and never imports the migration-running client; a file-hash assertion proves no change | 17-check readiness smoke |
| Missing production configuration proof | Pre-activation and strict audit require dedicated 64-hex HMAC, valid effective IANA timezone, exact HTTPS public origin, and valid flag ordering | Readiness configuration negative test and deploy preflight |
| Buffered oversized body | `readBoundedJson` counts stream bytes incrementally, cancels above 16 KiB, and never accumulates an oversized body | Streamed multi-chunk 413 route test |
| Receipt-flood abuse | Exact session and origin checks precede a rolling per-valid-session write cap; excess requests return private 429/`Retry-After` before parsing or durable work | Rate-limit route test |

## Positive security properties retained

- Every Processing route performs handler-level session verification; bearer-only and bearer-plus-invalid-cookie requests fail.
- Every response class uses `private, no-store`, `Vary: Cookie`, `nosniff`, and allow-listed JSON.
- Writes fail closed without the exact configured origin.
- Query inputs use enum/ID/array/page/cursor/body bounds and parameterized SQL; dynamic clauses come only from allow-listed enums.
- Mutation IDs are fingerprint-bound; replay cannot change an action or replace a receipt.
- Expected versions prevent lost updates; conflict responses install current projection truth.
- Undo is actor-tab/item/event/version/expiry scoped and rejects cross-item, superseded, expired, and Undo-of-Undo targets.
- DTOs exclude body, URL, notes, provider payloads, SQL, secrets, and generic event internals.
- Raw-insert, projection, event, receipt, and retained-history triggers fail closed.
- Artifacts contain no raw environment files or database data.

## Validation evidence

- Application security targeted suite: 7/7 passed after remediation.
- Readiness smoke: 17 checks passed.
- Release artifact smoke: 20 checks passed.
- Final standalone release build/verify: 3,613 regular files, 71,973,337 bytes expanded, 27 migrations including the restored historical production identity and 025, no raw environment files.
- Typecheck, lint, workflow YAML parsing, shell syntax, and whitespace validation passed in the release-safety lane.

This review authorizes integration and CI, not a claim of production safety already observed. Production-copy migration/rollback rehearsal, protected-main attestation verification, staged owner rollout, live private-header/security negatives, synthetic cleanup, and rollback health remain mandatory evidence.
