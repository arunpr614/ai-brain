# Definitive Wiki Source Inventory

**Inventory date:** 2026-07-11
**Application baseline:** `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34` (`origin/main`)
**Verified deployed application baseline:** `6858529ef179a51442d319c6c58e5ace79757619`
**Existing wiki baseline:** `3d578c3f66e61de3f124a855253e713758f6a49b`

## Evidence hierarchy applied

1. Current code, configuration, migrations, and tests at the application baseline.
2. Dated runtime/deployment evidence, most recently the Note Focus release record.
3. Approved decisions and final specifications.
4. Existing wiki and maintained repository documentation.
5. Feature Council recommendations and plans.
6. Research, prototypes, PRDs, mockups, and exploratory notes.
7. Older or undated planning material.

Code proves implementation, not deployment. A migration proves persistence support, not a complete user feature. Planning material never upgrades a capability to Implemented.

## Source groups

| Source group | Role | Reliability | Publication treatment |
|---|---|---|---|
| Current `origin/main` at `23868faf…` | Canonical implementation source | Highest for code status | Cite with pinned repository links |
| Tests under `src/**/*.test.ts` | Behavioral evidence | High | Cite by module; do not overstate untested runtime behavior |
| Migrations `001`–`023` | Schema history | High for storage support | Reconcile duplicate historical migration number `017` |
| Release evidence for `6858529…` | Latest verified deployed application tree | High for the explicitly tested release behavior | Record date and scope; do not infer later runtime changes |
| Existing GitHub Wiki at `3d578c3…` | Published documentation baseline | Medium; internally consistent but partly stale | Preserve history and valuable content, then reconcile |
| `docs/agent-docs/` | Earlier agent documentation, ledgers, and safety registry | Medium-high but old baselines | Update baseline-dependent claims |
| `docs/feature-council/` | Product/UX/technical planning and review history | Medium for intent, low for implementation status | Publish only with lifecycle labels |
| UX v2 execution evidence | Historical runtime and implementation proof | Medium-high when commit/date scoped | Summarize selectively after privacy review |
| Recall exploration programs | Deep exploratory evidence | Medium for feasibility and history | Keep separate from current-product claims |
| Original Recall App planning folder | Historical product ancestry | Low for current behavior | Preserve as historical context only |

## Coverage baseline

The current tracked tree contains 2,449 files, including 439 under `src/`, 543 under `docs/`, 191 under `scripts/`, 53 under `android/`, 13 under `extension/`, 127 test files, 24 SQL migration files, 23 application pages, and 28 API routes. Detailed route, module, command, and feature traceability remains in `docs/agent-docs/source-inventory.md`, `feature-coverage-ledger.md`, and `command-safety-registry.md`; this project updates their stale baseline assumptions.

## Exclusions

Generated dependencies/build output, caches, coverage, vendored material, `.git`, raw databases, private evidence, raw device logs, credentials/configuration handovers, and real production-write instructions are excluded from publication. The three discovered PDFs are seed fixtures in a Recall exploration folder, not source documentation.
