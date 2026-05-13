# Handover Package — 2026-05-13 (offline mode v0.6.x complete on Lane L)

**Version:** 1.0
**Date:** 2026-05-13
**Previous package:** `../Handover_docs_12_05_2026/` (full, v0.6.0 mid-flight + dual-lane split)
**Baseline:** full — stands alone
**Scope:** state of AI Brain immediately after Lane L completes offline mode v0.6.x (12 OFFLINE-* commits + APK 0.5.5 built)
**Applies to:** both Lane C (cloud) and Lane L (local features)
**Status:** COMPLETE (documentation) — awaiting user sign-off; APK awaiting device-side verification

> **For the next agent:** you are picking up AI Brain immediately after a productive Lane L session. **Lane C state is unchanged from v4 baseline** (Hetzner SSH still blocked). **Lane L shipped 16 commits this session implementing the entire v0.6.x offline mode** — 12 OFFLINE-* IDs + 2 follow-up fixes. The APK at `data/artifacts/brain-debug-0.5.5.apk` is built but NOT yet installed on the Pixel. **Your first step is identifying which lane you are**, then following the per-lane reading order below. The big new thing to read is `09_Next_Actions_Per_Lane.md` — the recommended Lane L start is "install the APK and run the manual matrix" before anything else.

---

## 1. Which lane are you?

Run this:

```bash
git branch --show-current
```

- `lane-c/v0.6.0-cloud` → **You are Lane C.** Read order: §2.
- `lane-l/feature-work` → **You are Lane L.** Read order: §3.
- `main` → Ask the user which lane. Do not default.
- Any other branch → Probably an old branch. Ask the user.

---

## 2. Read order — Lane C (cloud migration v0.6.0)

Lane C state is unchanged from the 2026-05-12 baseline. Treat that package as authoritative for runbook + Hetzner specifics; this package is the snapshot of what Lane L just shipped that you'll need to NOT break during cutover.

1. **[Start here]** `README.md` — this file
2. `Handover_Implementation_Plan_2026-05-13.md` (M0) — rules of this package
3. `01_Architecture.md` (M1) — **read §3 carefully** for the new offline-mode layer; you must preserve `/api/capture/{url,note,pdf}` route behavior + the `X-Brain-Client-Api` header check during cutover
4. **`09_Next_Actions_Per_Lane.md` §Lane C** — your backlog (mostly carries forward from v4 baseline)
5. `07_Deployment_and_Operations.md` (M7) — Hetzner runbook (stable; carries forward)
6. `04_Implementation_Roadmap_Consolidated.md` (M4) — see §4.2 for your lane scope
7. `02_Systems_and_Integrations.md` (M2) — note the 3 new client-side Capacitor plugins (don't affect Lane C, but be aware)
8. `03_Secrets_and_Configuration.md` (M3) — env vars for the new providers (carries forward)
9. `05_Project_Retrospective.md` (M5) — what Lane L shipped + the surprises
10. `08_Debugging_and_Incident_Response.md` (M8) — known issues (K-1 still BLOCKING you)

**Your owned files (unchanged):**
- `docs/plans/v0.6.0-*.md` (you'll write `v0.6.0-cloud-migration.md` next)
- `src/db/migrations/008_*.sql`
- `src/lib/enrich/batch*`, `src/lib/embed/gemini*`
- `scripts/migrate-*`, `scripts/backup-to-b2*`
- `.env.cloud.example`

**Your forbidden files (unchanged):**
- Anything under `src/components/**`, `extension/**`, `android/**` (Lane L)
- `src/db/migrations/009_*` and higher (Lane L)
- **NEW:** `src/lib/outbox/**` (entire dir Lane L; treat as a stable contract surface)
- **NEW:** `src/lib/auth/api-version.ts` — preserve verbatim during cutover OR knowingly bump `EXPECTED_CLIENT_API` (M3 §3 explains the consequence)

**Your catch-up protocol every session:**
```bash
git fetch origin
git checkout lane-c/v0.6.0-cloud
git rebase origin/main
git log --oneline origin/main ^HEAD | head -20   # what Lane L shipped
grep -A 5 "Lane L" RUNNING_LOG.md | tail -80     # read recent Lane L entries
```

---

## 3. Read order — Lane L (local feature development)

Lane L just shipped a major feature. Your immediate-next-action is **NOT** to start a new feature — it's to verify the current shipment.

1. **[Start here]** `README.md` — this file
2. `Handover_Implementation_Plan_2026-05-13.md` (M0) — rules of this package
3. **`09_Next_Actions_Per_Lane.md` §Lane L** — your backlog; **§3.1 is "install the APK and run the manual matrix" before doing anything else**
4. `04_Implementation_Roadmap_Consolidated.md` (M4) — OFFLINE-* status at §2; v0.6.x roadmap at §4
5. `01_Architecture.md` (M1) — the new outbox layer at §3 + topology at §5
6. `02_Systems_and_Integrations.md` (M2) — the 3 new Capacitor plugins
7. `03_Secrets_and_Configuration.md` (M3) — no new env vars; new constants at §3
8. `05_Project_Retrospective.md` (M5) — read carefully — at least 5 things ship slightly off
9. `08_Debugging_and_Incident_Response.md` (M8) — new failure modes for the outbox surface
10. `07_Deployment_and_Operations.md` (M7) — APK build runbook at §1 (unchanged)

**Your owned files:**
- `src/components/**`, `src/app/**` (except `/api/items/*/enrich`)
- `src/lib/capture/**`, `extension/**`, `android/**`
- `src/db/migrations/009_*` and higher
- **NEW:** `src/lib/outbox/**` (the entire offline-mode subsystem)
- **NEW:** `src/lib/auth/api-version.ts` (Lane L authored; Lane C inherits it for cloud)
- **NEW:** `src/lib/capture/youtube-url.ts` (extracted by Lane L; back-compat re-export in `youtube.ts`)
- **NEW:** `docs/plans/v0.6.x-*.md`, `docs/plans/v0.7.x-*.md`, `docs/research/offline-queue-prior-art.md`, `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md`

**Your forbidden files:**
- Anything under Lane C's owned list (see §2)

**Your catch-up protocol every session:**
```bash
git fetch origin
git checkout lane-l/feature-work
git status   # check for the uncommitted 009_edges.sql from prior session
git log --oneline origin/main ^HEAD | head -20   # 40 commits ahead at handover time
grep -A 5 "Lane C" RUNNING_LOG.md | tail -40     # any Lane C entries since last session
```

---

## 4. Quickstart — what to do in the first 30 minutes

### 4.1 Lane L

1. Confirm branch + 40-commits-ahead state.
2. **Push** `lane-l/feature-work` to origin (16 commits unpushed). See M9 §3.1.
3. `npm install` (the 3 new plugins should already be in `package.json`; `npm install` reconciles `node_modules`).
4. `npm test` — confirm 425/425 still green.
5. `npm run build:apk` — confirm APK 0.5.5 still builds; output at `data/artifacts/brain-debug-0.5.5.apk`.
6. `adb install -r data/artifacts/brain-debug-0.5.5.apk` (Pixel must be connected via USB + ADB authorized).
7. Open `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` and run **Bucket A** (4 scenarios; ~5 min). MUST-pass items: A1, A2, A3.
8. If Bucket A passes: continue Buckets B + C + F-1 for the full MUST-pass set.
9. If anything fails: see M8 + the matrix's §10 escalation procedure.

### 4.2 Lane C

1. Catch-up protocol (see above).
2. Resolve K-1 Hetzner SSH (see M8 §2 from 2026-05-12 baseline; carried forward to this M8 §2).
3. Continue v0.6.0 cloud-migration prep per v4 baseline §4.2.
4. **DO NOT** rebase Lane L's offline-mode work into your branch until Lane L pushes + merges.

---

## 5. Glossary (terms used heavily in this package)

| Term | Meaning |
|---|---|
| **Outbox** | The IDB store `brain-outbox.outbox` that holds offline shares; the orchestrator's queue |
| **OFFLINE-N** | A roadmap ID from `docs/plans/v0.6.x-offline-mode-apk.md` v3 §7 (e.g. OFFLINE-1B = storage layer) |
| **Plan v3** | The offline-mode plan rewrite (`v0.6.x-offline-mode-apk.md`); supersedes v1+v2 |
| **Manual matrix** | `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` — 24 scenarios for device-side verification |
| **Lane L tiered rule** | Commit `48967cd` — patch bumps allowed for either lane; minor/major/tag = Lane C only |
| **K-N** | Known-issue ID from M8 (e.g., K-1 = Hetzner SSH blocker) |
| **`X-Brain-Client-Api`** | New header all outbox POSTs send; server validates against `EXPECTED_CLIENT_API` constant |
| **WebView freezing** | Android freezes Brain's WebView ~30s after backgrounding — empirical (see plan v3 §3.1) |
| **Subway story** | "Auto-sync within 30s of signal returning while in pocket" — explicitly NOT delivered by v0.6.x; v0.7.x WorkManager territory |
| **Pixel** | User's Pixel 7 Pro Android device |
| **Mac** | User's M1 Pro / 32 GB / 455 GB free; current prod host |

## 6. Cross-references

- `RUNNING_LOG.md` 31st entry — narrative of this session's 16 commits
- `docs/plans/v0.6.x-offline-mode-apk.md` v3 — the plan that drove the work
- `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` — the gate before merge to main
- Prior handover: `../Handover_docs_12_05_2026/` — for the Hetzner runbook + cloud research baseline
- Auto-memory at `~/.claude/projects/-Users-arun-prakash-Documents-GitHub-arun-cursor/memory/` — persistent agent memory; cited by name in entries that use it

## 7. Sign-off gate

The user is the only person who can close the sign-off gate. The gate is:

1. ✅ APK 0.5.5 installs cleanly on the Pixel
2. ✅ Manual matrix MUST-pass items (A1, A2, A3, B1, B2, C1, F1) all green
3. ✅ User accepts: "ready to push lane-l/feature-work to origin and propose merge to main"

Until those three are true, **no Lane L code change should land on `main`**.
