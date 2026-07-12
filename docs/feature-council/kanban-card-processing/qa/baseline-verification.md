# Kanban Card Processing — baseline verification

**Date:** 2026-07-12
**Branch:** `feat/kanban-card-processing`
**Baseline:** `origin/main` at `5b92e68ec09ceb03f010db1c4fb14be5348a54bf`
**Purpose:** establish the clean pre-feature quality and production-operating baseline. This is not feature verification.

## Repository safety

- Origin matches `https://github.com/arunpr614/ai-brain.git`.
- The supplied checkout was inspected before mutation and retained its untracked `Kanban-designs/` source package.
- The implementation worktree was created from the fetched latest `origin/main` on `feat/kanban-card-processing`.
- No source checkout was reset, cleaned, overwritten, moved, or deleted.

## Locked dependency baseline

`npm ci` completed successfully using Node `v22.22.3` and npm `10.9.8`:

- 675 packages installed;
- dependency audit reported 0 vulnerabilities;
- the only install warning was the upstream `prebuild-install@7.1.3` deprecation notice.

## Clean-main verification ledger

| Gate | Result | Evidence |
|---|---|---|
| TypeScript | Passed | `npm run typecheck`, exit 0 |
| Lint | Passed | `npm run lint`, exit 0 |
| Repository tests | Passed | 843 tests, 92 suites, 0 failed/skipped/cancelled |
| Production build | Passed | Next.js 16.2.9 standalone build completed and emitted the route manifest |

The build emitted the existing `unpdf` warning about direct `import.meta` access through the PDF capture path. It did not fail compilation and predates this feature branch.

## Fresh database baseline

The repository test suite repeatedly created isolated databases and successfully applied all migration files through `024_recall_manual_sync.sql`. The current-state discovery lane separately confirmed a fresh isolated database with:

- `PRAGMA integrity_check = ok`;
- no `PRAGMA foreign_key_check` rows.

## Production read-only baseline

Read-only operator checks against the existing deployment confirmed:

| Signal | Baseline result |
|---|---|
| Application service | active |
| Runtime | Node `v22.22.3` |
| Authenticated loopback health | `{ok:true}` |
| SQLite size | 7,520,256 bytes |
| Retained `items` rows | 129 |
| Applied migration files | 26 |
| Latest migration | `024_recall_manual_sync.sql` |
| SQLite quick check | `ok` |
| Foreign-key check | no rows |
| Free space on data filesystem | approximately 30,362,880 KB |

No production content, title, URL, note, credential, environment value, or token was read into an artifact. No production state was changed.

## Interpretation

- Subsequent type/lint/test/build regressions can be compared against a fully green starting point.
- The current production database is small enough that the proposed additive migration should be operationally modest, but production size is not the scale ceiling.
- Synthetic 10k and 50k realistic tag/topic fan-out tests remain mandatory for query plans, latency, bounded payloads, and focus behavior.
- This baseline proves current health only. It does not prove the feature, its migration, release readiness, deployment, or live user experience.
