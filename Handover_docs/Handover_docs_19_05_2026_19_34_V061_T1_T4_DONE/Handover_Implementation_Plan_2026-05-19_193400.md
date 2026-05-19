# M0 — Handover Implementation Plan (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a (new tranche) |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE) (v2 of cutover-day; itself a delta over the 13:47 baseline) |
| **Mode** | DELTA — extends two prior tranches from earlier same day |
| **Author** | AI agent (Claude Opus 4.7) |
| **Tranche identifier** | `Handover_docs_19_05_2026_19_34_V061_T1_T4_DONE` |

> **For the next agent:** v0.6.0 cutover happened earlier today. This tranche covers the afternoon/evening session that opened the **v0.6.1 Cloud-Cleanup** phase, audited the legacy LAN/Mac surface, and shipped the first 4 of 20 planned tasks. Read this M0, then [M7 current status](./06_Handover_Current_Status.md), then [M4 roadmap](./04_Implementation_Roadmap_Consolidated.md) — those three give you "where we are + what's next" in 10 minutes.

## 1. What this tranche extends

**Required prior reading (in order):**
1. [`Handover_docs_19_05_2026_13:47/`](../Handover_docs_19_05_2026_13:47) — pre-cutover baseline (architecture, secrets, original cutover runbook).
2. [`Handover_docs_19_05_2026_15_21_CUTOVER_DONE/`](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE) — Mac→Hetzner cutover shipped (D-12 + D-13 + D-14 complete).
3. **This tranche** — v0.6.1 phase opened, audits written, T-1..T-4 deployed.

**What this delta adds vs the cutover-done baseline:**

| Topic | Cutover-done (15:21) | This delta (19:34) |
|-------|----------------------|---------------------|
| Phase | v0.6.0 SHIPPED, D-15..D-18 user-side pending | **v0.6.1 Cloud-Cleanup OPENED**, T-1..T-4 deployed |
| Setup-page privacy claim | "AI Brain never talks to anything outside your Mac in v0.1.0." (false) | **Honest disclosure** — Hetzner storage + Anthropic + Google APIs |
| Session cookie | `Secure` deferred since v0.5.0 | **`secure: NODE_ENV==='production'`** in `auth.ts:113-119` |
| HTTP security headers | None | **4 headers live** — XFO DENY, nosniff, Referrer-Policy, HSTS 2y |
| Bearer-rejection logs | No client IP | **`cf_ip` field** (cf-connecting-ip / x-forwarded-for) in 3 reject paths |
| Legacy-feature inventory | unsystematic | **Two audit passes** — v1 (Android-heavy, 17 features) + v2.1 (web/server/extension, 16 findings, risk×effort re-ranked) |
| Phase plan | none | [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md) (20 tasks, 12-criterion gate) |
| Mac unit tests | broken (carry-over) | **Documented as deferred** to v0.6.3 in BACKLOG |
| Deploy recipe | `.next/standalone/` only (incomplete) | **Corrected** — must rsync 3 trees: standalone + `.next/static/` + `public/` |

## 2. State at handover

| Property | Value |
|---|---|
| HEAD | `87d9253` on `main`, pushed |
| Working tree | **clean** |
| `package.json` version | `0.6.0` (will bump to `0.6.1` at T-20 release gate) |
| Latest tag | `v0.6.0` (cutover) — no v0.6.1 tag yet |
| brain.arunp.in | 200 in ~0.4s with all 4 security headers |
| Hetzner DB | unchanged from cutover: 8 items / 81 chunks / 81 vec rows |
| RUNNING_LOG | entry #45 written |
| Memory state | unchanged from cutover-done (no new memory files) |

## 3. The reading order

For the receiving agent, fastest "ready to continue" path:

1. **This M0 file** — orients you on what's new and what's next.
2. **[M7 — current status](./06_Handover_Current_Status.md)** — exactly what's done, what's open, who's blocked on what.
3. **[M4 — roadmap consolidated](./04_Implementation_Roadmap_Consolidated.md)** — v0.6.1 task table with sequencing.
4. **[M9 — debugging](./08_Debugging_and_Incident_Response.md)** — four new symptom→cause rows from today.
5. **[M5 — retrospective](./05_Project_Retrospective.md)** — patterns and watch-outs (especially the "3-option-menu" recurrence and the CSS-deploy lesson).
6. **[M8 — deployment](./07_Deployment_and_Operations.md)** — the corrected 3-tree rsync recipe is now load-bearing.

## 4. Definition-of-done for this handover

| # | Criterion | Status |
|---|-----------|--------|
| 1 | All 10 files created | ✅ |
| 2 | M1 surfaces only NEW architectural elements (security headers + Secure cookie) | ✅ |
| 3 | M3 covers the BRAIN_API_TOKEN rename queue (T-11) | ✅ |
| 4 | M4 has the 20-task v0.6.1 table with current status | ✅ |
| 5 | M5 names today's 3 self-critique pivots honestly | ✅ |
| 6 | M7 shows T-1..T-4 ✅ + T-5..T-20 ⏳ + D-15..D-18 ⏳ | ✅ |
| 7 | M8 deploy procedure has the 3-tree rsync GOTCHA | ✅ |
| 8 | M9 has 4 new symptom→cause rows | ✅ |
| 9 | All file links repo-relative | ✅ |
| 10 | No secrets pasted | ✅ |

**What "complete" means here:** documentation reflects the codebase + deploy state at HEAD `87d9253`. It does NOT mean v0.6.1 is shipped, the smoke suite is passing on Mac, D-15..D-18 are validated, or T-5..T-20 have started.

## 5. Global rules (rendering style + path conventions)

- **Repo root from this folder:** `../../`
- **File links inside this tranche:** plain `./0X_…md` form.
- **Cross-tranche links:** `../Handover_docs_<id>/0X_…md`.
- **Code citations:** `path/to/file.ts:line` so the next agent can jump there.
- **Markdown style:** backticks for filenames/functions/env vars (`brain.service`); bold for milestones / severity / status (**HIGH** / **DEPLOYED** / **PENDING**).
- **Numbered lists** for procedures (deploy, debug, rotation). Bullets for inventories.
- **Tables** for status, file inventories, comparison.

## 6. Out-of-scope items (carried forward, not done in this delta)

| Item | Disposition |
|------|-------------|
| T-5..T-20 of v0.6.1 | Plan-defined; pending |
| D-15 APK share-target | User test — diagnosed cause is unpaired token; not retried |
| D-16 Ask query | User test — pending |
| D-17 overnight batch | Automated — pending 01:00 IST tonight |
| D-18 B2 backup script | Not wired; deferred to v0.6.2 |
| Phase E secret rotation | Carry-over from cutover-done |
| Mac better-sqlite3 ABI mismatch | New entry in BACKLOG; deferred to v0.6.3 |
| CSP nonce wiring | Plan §1, deferred to v0.6.3 |
| Per-device tokens (audit A+C) | Plan §1, deferred — needs design doc |
| `tsx` removal from Hetzner runtime | Plan §1, v0.6.3 |
| `enrichment-worker.ts` 45-min unreachable loop | Open behavior bug |
