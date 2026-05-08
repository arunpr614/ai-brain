# BACKLOG archive — 2026-05

Archived closed items rotated out of [`BACKLOG.md`](../../BACKLOG.md) §5 on 2026-05-08 (per plan T-2 / critique P-11). Append new archive files per month as §5 grows; never rewrite past archives.

---

## R-VEC spike (GREEN, closed 2026-05-08)

- ~~R-VEC~~ sqlite-vec performance benchmark at 1k/10k/50k chunks on M1 Pro — **GREEN verdict**, all four thresholds pass with ≥ 10× headroom. v0.4.0 Ask/RAG unblocked. Findings: [`docs/research/vector-bench.md`](../research/vector-bench.md). Scripts: [`scripts/spike-vec-smoke.mjs`](../../scripts/spike-vec-smoke.mjs), [`scripts/spike-vec-bench.mjs`](../../scripts/spike-vec-bench.mjs). Follow-up F-057 (version-drift audit for `sqlite-vec`) — closed under T-0 of v0.4.0 plan (commit `e8f104a`, pinned to 0.1.9 with explicit sub-package override).

---

## v0.3.1 Polish + Hardening (shipped 2026-05-08)

Release commit: `6fd645e`. Tag: `v0.3.1`. Self-critique source: [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](../plans/SELF_CRITIQUE_2026-05-08_10-14-16.md). 17 work items across two tracks.

### Polish (§4B)

- ~~F-207~~ Library multi-select + bulk tag/collection/delete (`1f38423` actions · `844e741` UI · `f158c63` smoke)
- ~~F-301~~ Wire `CollectionEditor` into item detail (`666cb14`)
- ~~F-302~~ Inline tag editor on item detail (`f2b0b0e`)
- ~~B-301~~ Title de-hyphenation, tightened heuristic (`3c4b08c`)

### Hardening (§4A)

- ~~F-042~~ Bind dev server to `127.0.0.1` — P0 (`54bc92f`)
- ~~F-043~~ Session cookie expiry + `SameSite=Strict` + auth tests (`9431332`)
- ~~F-044~~ `globalThis` worker guard (HMR-safe) (`d4ae435`)
- ~~F-045~~ Periodic `sweepStaleClaims()` + exported `shouldSweep()` (`9cffda4`)
- ~~F-046~~ Retry attempts on enrichment status + pill (`db01434`)
- ~~F-047~~ Non-nodejs instrumentation skip log (`6316361`)
- ~~F-048~~ WAL + `synchronous=NORMAL` post-condition (`0da8dcd`)
- ~~F-034~~ DB restore script + runbook (`7d4a259`)
- ~~F-049~~ Exact-pin `sqlite-vec@0.1.6` (`3bbf1a7`) — later superseded by F-057 pin to 0.1.9 (`e8f104a`)
- ~~F-050~~ `errors.jsonl` 5MB-rotation error sink (`1fd3b08`)
- ~~F-051~~ `node:test` runner + `tsx` + first tests (`92e0d0f`)
- ~~F-052~~ `scripts/smoke-v0.3.1.mjs` + `npm run smoke` (`ce6de9c`, `f158c63`)
- ~~F-053~~ Bulk actions revalidate collection + tag paths (rolled into `1f38423`)
- ~~F-054~~ Release guard — tree-clean + revert rehearsal (T-B-6 gate)
- ~~F-055~~ Per-task `RUNNING_LOG.md` breadcrumbs (applied throughout)
- ~~F-056~~ PIN overwrite guard + `deleteSetting` helper (`6580a11`)
