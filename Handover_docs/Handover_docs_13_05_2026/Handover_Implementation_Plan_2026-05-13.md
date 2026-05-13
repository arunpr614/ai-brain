# M0 — Handover Implementation Plan

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/Handover_Implementation_Plan_2026-05-12.md` (full, v0.6.0 mid-flight + dual-lane split baseline)
**Baseline (this package extends):** full mode — stands alone; does NOT require reading the 2026-05-12 package, but the prior package is useful for the split-lane history.
**Package scope:** AI Brain project, state immediately after Lane L offline-mode v0.6.x feature completes (12 OFFLINE-* commits + APK 0.5.5 build) and is ready for device-side manual verification.
**Applies to:** both Lane C (cloud migration v0.6.0) and Lane L (local features) agents
**Status:** COMPLETE (documentation only — not a claim of code shipped, device-verified, or merged to main)

> **For the next agent:** this package replaces the 2026-05-12 baseline because Lane L shipped a major feature (offline mode) since then — 16 commits, all 12 OFFLINE-* IDs from plan v3 §7, 425/425 tests, APK v0.5.5 built. The dual-lane split is still active. **Your first step is identifying which lane you are**, then following the per-lane reading order in `README.md`. "Handover complete" means the 10 docs are written — it does NOT imply the offline mode passes manual verification, the APK has been installed, or `lane-l/feature-work` has been pushed/merged.

---

## 1. Why this handover exists

This session (2026-05-13) shipped enough work to warrant a fresh full-mode handover:

1. **Offline mode v0.6.x complete on Lane L.** 16 commits including all 12 OFFLINE-* IDs from plan v3 §7 (PRE / 1A / 1B / 2 / 3 / 4 / 6 / 7 / 8 / 9 / 10 / 12). Plan v3 closed all 22 self-critique-v2 items + resolved 10 open user questions in a single rewrite.
2. **APK 0.5.5 built but not yet device-verified.** `data/artifacts/brain-debug-0.5.5.apk` (10.9 MB). The 24-scenario manual verification matrix (`docs/test-reports/v0.5.5-offline-mode-manual-matrix.md`) is the gate before the lane-l → main merge.
3. **`lane-l/feature-work` is now 40 commits ahead of `origin/main`** (was 24 at start of session). 16 commits unpushed at handover time.
4. **3 new Capacitor plugin deps** (`@capacitor/network`, `@capacitor/local-notifications`) + 1 runtime + 1 devDep (`idb`, `fake-indexeddb`).
5. **Server contract change:** all three `/api/capture/{url,note,pdf}` routes now validate `X-Brain-Client-Api: 1` header. Missing header is back-compat-accepted; mismatch returns 422 with `code: 'version_mismatch'`. Lane C must preserve `src/lib/auth/api-version.ts` exactly during the v0.6.0 cloud cutover (or knowingly bump the expected version, which will move existing v0.5.5 APKs into stuck:version_mismatch state — by design).
6. **Lane C status unchanged from 12_05_2026 baseline.** Hetzner SSH still blocked at K-1, no new Lane C commits visible to this session.

## 2. What "complete" means here

| Dimension | Definition for this handover |
|---|---|
| Documentation | 10 files filled from this session's conversation + code + git history + prior baselines, quality-checked |
| Code shipped (Lane L) | 16 commits on `lane-l/feature-work` local. **Not yet pushed.** Not yet merged. |
| Device verified | NOT IMPLIED. APK 0.5.5 built but not installed on Pixel. Manual matrix is the gate. |
| Production verified | NOT IMPLIED. Lane C v0.6.0 cutover has not happened. |
| Handover signed off | User sign-off is the final gate — at which point both agents can resume independently. |

## 3. Global rules for every file in this package

1. **Links are repo-relative** from this handover folder. To reach project root: `../../` (up out of `Handover_docs_13_05_2026/` → `Handover_docs/` → project root).
2. **Backticks** for `filenames`, `functions()`, env vars like `BRAIN_LAN_TOKEN`, shell commands like `git fetch`.
3. **Bold** for **Lane C** / **Lane L**, **M0**–**M9** milestones, severity tags (**BLOCKING**, **HIGH**, **MEDIUM**, **LOW**), status (**COMPLETE**, **IN-PROGRESS**, **PENDING**, **BLOCKED**).
4. **`**bold code**`** (bold + backticks) for emphasized commands the next agent MUST run.
5. **No secrets.** Env var names are OK; values are NOT. API keys, tokens, bearer strings: never paste.
6. **Code is source of truth** when code and docs disagree — flagged inline with `**(SoT: code)**`.
7. **Evidence pointer triples** for citations: `[doc](path) (version, **status**) — see [code](path)`.
8. **Procedures are numbered**, not bulleted — AI agents follow numbers more reliably.

## 4. Reading order by audience

- **If you are Lane L (local):** M6 README → M0 (this) → M9 (your section) → M4 → M1 → M2 → M3 → M5 → M8 → M7 (skim).
- **If you are Lane C (cloud):** M6 README → M0 (this) → M9 (your section) → M1 → M7 → M4 → M2 → M3 → M5 → M8.
- **If you are a single serial agent** (kill-switch triggered, lanes collapsed back): M6 → M0 → M1 → M9 (both sections) → rest in order.
- **If you are a human reviewer:** M6 README → M5 retrospective → M9 next actions. Skim the rest.

## 5. The 10 files

| # | File | Purpose | Applies to |
|---|---|---|---|
| M0 | `Handover_Implementation_Plan_2026-05-13.md` (this file) | The rules of this package + reading order | Both lanes |
| M1 | `01_Architecture.md` | System topology, data flow, tech stack, pre/post v0.6.0, **+ outbox layer** | Both lanes |
| M2 | `02_Systems_and_Integrations.md` | External + Capacitor plugins (3 new this session) | Both lanes |
| M3 | `03_Secrets_and_Configuration.md` | Env-var catalog, secrets policy, **+ X-Brain-Client-Api** | Both lanes |
| M4 | `04_Implementation_Roadmap_Consolidated.md` | Phase history, **OFFLINE-* status**, what's next per lane | Both lanes |
| M5 | `05_Project_Retrospective.md` | Decisions locked this session, learnings, what surprised me | Both lanes |
| M6 | `README.md` | Entry point — per-lane read order, quickstart | Both lanes |
| M7 | `07_Deployment_and_Operations.md` | APK build runbook, Hetzner runbook (carries forward) | Lane C primary; Lane L Section 1+2 |
| M8 | `08_Debugging_and_Incident_Response.md` | Known issues + diagnostic recipes for the new outbox surface | Both lanes |
| M9 | `09_Next_Actions_Per_Lane.md` | Lane C backlog (carries forward) + **Lane L manual matrix gate** | Both lanes (read YOUR section) |

## 6. Evidence gathering done for this package

- **Conversation:** today's session transcript covering offline plan v3 → 12 OFFLINE-* commits → YouTube dedup follow-up → APK build → manual matrix template → APK build-fix follow-up.
- **Repo structure:** `src/lib/outbox/` (16 new source/test files), `src/components/{share-handler,outbox-badge}.tsx`, `src/app/inbox/`, `src/app/debug/quota/`, `src/lib/auth/api-version.ts`, `src/lib/capture/youtube-url.ts`, `docs/plans/v0.6.x-offline-mode-apk.md` v3, `docs/plans/v0.7.x-offline-workmanager-roadmap.md`, `docs/research/offline-queue-prior-art.md`, `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md`.
- **Git history:** 16 commits on `lane-l/feature-work` between `c7b8758` (prior session end) and `4a6548a` (this session end). 7100 insertions / 287 deletions across 46 files.
- **Existing docs:** `RUNNING_LOG.md` 31st entry written this session (covers all 16 commits + self-critique). `package.json` 0.5.4 → 0.5.5. Prior-session handover at `Handover_docs/Handover_docs_12_05_2026/`.
- **Bug reports:** none filed by user during the session. Two architectural issues SURFACED + FIXED in-session: YouTube variant dedup gap (`86cefb3`) and bundler client/server import leak (`4a6548a`).
- **Prior handover:** `Handover_docs_12_05_2026/` — the v4 baseline. M1 (Architecture) and M7 (Hetzner runbook) carry forward almost unchanged because Lane C state didn't move; M2/M3/M4/M5/M8/M9 are substantially rewritten for the offline-mode shipment.

## 7. Definition of Done (for this package)

- [x] 10 files created with 7-field metadata header
- [x] All files have `> **For the next agent:**` opener blockquote
- [x] Table-driven organization where applicable
- [x] Per-lane sections labelled clearly where split
- [x] Mermaid diagram in M1 (mandatory)
- [x] SoT tables in M1 (mandatory) + M2/M4 where applicable
- [x] No secrets — placeholder pattern only
- [x] Numbered procedures (not bullets)
- [x] Cross-links validated (repo-relative from this folder)
- [x] M9 has explicit Lane C + Lane L sections
- [ ] User sign-off (the one gate only a human can close)

## 8. What's different from the 2026-05-12 baseline

1. **Lane L offline mode v0.6.x is COMPLETE in code.** All 12 OFFLINE-* IDs from plan v3 §7 implemented with 425/425 tests. Was 0/12 implemented at v4 baseline (plan v2 not even rewritten yet).
2. **APK 0.5.5 built.** `data/artifacts/brain-debug-0.5.5.apk` (10.9 MB) ready for device install. Was 0.5.4 at v4 baseline (Lane L had not yet started).
3. **Server contract added.** `X-Brain-Client-Api` header validation on 3 capture routes via `src/lib/auth/api-version.ts`. The contract is back-compat (missing header = accept) so Chrome extension and pre-OFFLINE-4 APK builds continue to work unchanged.
4. **3 new client-side npm deps:** `@capacitor/network@8.0.1`, `@capacitor/local-notifications@8.1.0`, `idb@8.0.3`. One devDep: `fake-indexeddb@6.2.5`.
5. **`lane-l/feature-work` 40 commits ahead** of `origin/main` (was 24 at v4 baseline). 16 unpushed.
6. **Lane C status static.** Hetzner SSH still blocked at K-1 from v4 baseline. Plan §13.2 of offline plan v3 explicitly defers v0.6.0 tag to Lane C, honored by all 16 Lane L commits this session.
7. **New project doc paths:**
   - `docs/plans/v0.6.x-offline-mode-apk.md` v3 (rewrite of v2)
   - `docs/plans/v0.7.x-offline-workmanager-roadmap.md` (new)
   - `docs/research/offline-queue-prior-art.md` (new)
   - `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` (new)
   - `src/lib/outbox/` directory (16 files)
   - `src/lib/auth/api-version.ts` + test
   - `src/lib/capture/youtube-url.ts` (extracted from `youtube.ts`)
8. **`/inbox` route + sidebar badge** are now live UI surface. Was a "soon" placeholder in v4 baseline.
9. **`/debug/quota` route** ships in 0.5.5 for OFFLINE-PRE measurement. User has not yet run it on the Pixel.
10. **Build-system lesson learned:** any change to a file that is in the client component import graph requires `npm run build:apk` BEFORE commit. `npm test` + `npm run typecheck` + `npm run build` (server-only) do NOT catch jsdom-bundled-into-client-bundle errors. Surfaced by `4a6548a` follow-up to `86cefb3`. Documented in M5 + M8.

## 9. Handover recipient quickstart

If you are picking this up cold:

1. `cd /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain`
2. `git branch --show-current` — note your lane.
3. `git fetch origin` then `git log origin/main..HEAD --oneline | head -20` — see what your lane has that main doesn't.
4. Read `README.md` in this folder for the per-lane reading order.
5. **Lane L specific first action:** push `lane-l/feature-work` to origin (16 commits unpushed). See M9 §3.1.
6. **Lane C specific first action:** unchanged from v4 baseline — resolve K-1 Hetzner SSH, then continue v0.6.0 prep.

## 10. Cross-references

- `RUNNING_LOG.md` — 31st entry covers this session's 16 commits with full self-critique + 7 action items.
- Prior handover: `../Handover_docs_12_05_2026/` — v4 baseline; references this one as supersession.
- `docs/plans/v0.6.x-offline-mode-apk.md` v3 — definitive plan that drove the 12 OFFLINE-* commits.
- `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` — 24-scenario fillable template; the device-side gate.
