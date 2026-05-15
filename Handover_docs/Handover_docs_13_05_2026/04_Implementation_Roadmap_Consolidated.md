# M4 — Implementation Roadmap (consolidated)

**Version:** 1.0
**Date:** 2026-05-13
**Previous version:** `Handover_docs_12_05_2026/04_Implementation_Roadmap_Consolidated.md`
**Baseline:** full
**Scope:** what shipped, what's shipping next, per-lane
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** this file collapses `BUILD_PLAN.md`, `ROADMAP_TRACKER.md`, `PROJECT_TRACKER.md`, and per-phase plan docs into a single "what happened, what's next" view, split by lane. **Major delta vs v4 baseline:** Lane L's offline-mode v0.6.x is COMPLETE in code (12 OFFLINE-* commits + APK 0.5.5 built). Lane C is unchanged from v4 baseline (Hetzner SSH still blocked at K-1; no new commits visible). Branch status at snapshot: `main` (unchanged), `lane-c/v0.6.0-cloud` (unchanged from v4), `lane-l/feature-work @ 4a6548a` (40 commits ahead of `origin/main`; **16 unpushed**).

---

## 1. Phase history (shipped)

| Phase | Version | Shipped | Highlights | Tag |
|---|---|---|---|---|
| Planning | v0.0.x | 2026-05-07 | BUILD_PLAN, DESIGN, 4 research spikes kicked off | — |
| Foundation | v0.1.0 | 2026-04-xx | Next.js + SQLite + first capture → article save | v0.1.0 |
| Vector | v0.2.0 | 2026-04-xx | sqlite-vec + Ollama embeddings + retrieval | v0.2.0 |
| Polish | v0.3.1 | 2026-04-xx | UX iteration, restore-from-backup tooling | v0.3.1 |
| Ask | v0.4.0 | 2026-04-xx | SSE Ask with retrieval-augmented generation | v0.4.0 |
| APK + Extension | v0.5.0 | 2026-05-08 | Android APK (Capacitor) + Chrome MV3 extension + Cloudflare tunnel pivot | v0.5.0 |
| YouTube | v0.5.1 | 2026-05-11 | YouTube transcript capture via InnerTube | v0.5.1 |
| Hot-fixes | v0.5.2..v0.5.4 | 2026-05-12..13 | SameSite cookie fix, CapacitorHttp disabled, embed-worker wiring, PDF share read | (no tags per Lane L tiered rule) |
| **Offline mode (Lane L)** | **v0.5.5** | **2026-05-13** (this session) | **All 12 OFFLINE-* IDs from plan v3 §7 + APK built** | **(no tag)** |

## 2. Offline mode v0.6.x — OFFLINE-* status (Lane L, NEW this session)

| ID | Description | Commit | Status | Tests |
|---|---|---|---|---|
| **OFFLINE-PRE** | `/debug/quota` Next.js measurement route (storage / persist / SW / Worker probes) | `a5aeb38` | **shipped — awaiting device run** | (manual) |
| **OFFLINE-1A** | Prior-art spike → `idb` chosen; Workbox + 3 alts rejected | `6ebb583` | **shipped (docs)** | n/a |
| **OFFLINE-1B** | IDB outbox storage layer (`storage.ts` + `types.ts`) | `64bb8d6` | **shipped** | 23 |
| **OFFLINE-2** | Dedup keys + Web Worker SHA256 + classifier + backoff | `82379b7` | **shipped** | 68 |
| **OFFLINE-3** | Sync-worker orchestrator | `38398b2` | **shipped** | 19 |
| **OFFLINE-4** | Share-handler + retry triggers (merged v2's commits 5+6 per C-5 fix) | `90711f3` | **shipped** | 11 |
| **OFFLINE-6** | `X-Brain-Client-Api` header + 3-route validation | `93ce9e8` | **shipped** | 6 |
| **OFFLINE-7** | `/inbox` page + sidebar badge + a11y | `c785ab2` | **shipped** | (manual) |
| **OFFLINE-8** | Android local notifications for stuck transitions | `4ebae02` | **shipped** | 14 |
| **OFFLINE-9** | PDF filesystem-blob outbox path + cleanup-on-synced | `fd8a72d` | **shipped** | 16 |
| **OFFLINE-10** | Plain-language toast copy + 0.5.5 release | `c56ea90` | **shipped** | (UI manual) |
| **OFFLINE-11** | Manual verification matrix gate | `09be658` (template only) | **PENDING device run** | n/a |
| **OFFLINE-12** | v0.7.x WorkManager roadmap doc | `6bb26af` | **shipped (docs)** | n/a |

**Two follow-ups:**

| Issue | Commit | Severity | Note |
|---|---|---|---|
| YouTube variants share one outbox dedup key | `86cefb3` | LOW (cosmetic) | Surfaced by user review post-OFFLINE-12 |
| Build fix: split youtube URL helpers from jsdom-importing module | `4a6548a` | HIGH (broke APK build) | `86cefb3` introduced jsdom into client bundle; lesson in M5 + M8 |

## 3. Test count progression this session

| Stage | Tests | Suites |
|---|---|---|
| Session start (v4 baseline) | 260 | 49 |
| After OFFLINE-1B | 283 (+23) | — |
| After OFFLINE-2 | 351 (+68) | — |
| After OFFLINE-3 | 370 (+19) | — |
| After OFFLINE-4 | 381 (+11) | — |
| After OFFLINE-6 | 387 (+6) | — |
| After OFFLINE-7 | 387 (+0) | — |
| After OFFLINE-8 | 401 (+14) | — |
| After OFFLINE-9 | 417 (+16) | — |
| After OFFLINE-10 | 417 (+0) | — |
| After YouTube dedup fix | 425 (+8) | — |
| **Final (this session)** | **425** | **95** |

**Net:** +165 tests this session. Tracker: `npm test` from project root. Lint: 0 errors throughout (17 pre-existing warnings).

## 4. v0.6.x feature roadmap (carry-over from prior sessions)

Per `docs/plans/v0.6.x-*.md`:

| Feature | Plan doc | Status | Lane |
|---|---|---|---|
| Offline mode | `v0.6.x-offline-mode-apk.md` v3 | **DONE in code; pending device verification** | Lane L |
| Graph view | `v0.6.x-graph-view.md` v2.1 | LOCKED, ready to execute (GRAPH-1..N) | Lane L |
| Augmented browsing | `v0.6.x-augmented-browsing.md` v2 | LOCKED, ready to execute (AUG-1..7) | Lane L |
| Cloud migration | (Lane C will draft) | research complete; plan not yet written | Lane C |

### 4.1 Lane L scope after offline mode

Once the manual matrix passes:

1. **Push lane-l/feature-work to origin** (16 commits unpushed; 40 ahead of main).
2. **Lane L self-merge to main** via PR for audit trail (per handover §4.2).
3. **GRAPH-1 execution** — `src/db/migrations/009_edges.sql` is already in working tree from prior session; pick up plan v2.1.
4. **AUG-1..7** if user prioritizes augmented browsing over graph.
5. **APK regression smoke test** that exercises auto-embed path (carried forward from prior session action item #5; would have caught the v0.4.0 SC-1 regression).

### 4.2 Lane C scope (unchanged from v4 baseline)

Carried forward verbatim:

| Phase | What | Status | Blocker |
|---|---|---|---|
| Phase A | Hetzner SSH unblock | BLOCKED | K-1 (see M8) |
| Phase B | Server hardening (brain user, disable root, firewall) | not started | unblocked once K-1 closes |
| Phase C | Cloud env (Anthropic + Gemini + B2 + gpg keys) | not started | depends on B |
| Phase D | Migration script + cutover | not started | depends on C |
| Phase E | Post-cutover verification + monitoring | not started | depends on D |

## 5. Tracker file alignment

| Tracker | Status | Updated this session? |
|---|---|---|
| `BUILD_PLAN.md` | Last updated pre-session | NO — should be touched at end of v0.6.x to record OFFLINE shipment |
| `ROADMAP_TRACKER.md` | OFFLINE-* IDs not yet promoted | NO — action item for next session |
| `PROJECT_TRACKER.md` | R-GEMMA still listed; OFFLINE rows pending | NO — same as above |
| `BACKLOG.md` | GEMMA-1, GEMMA-2 in §4 | unchanged |
| `RUNNING_LOG.md` | 31st entry written this session | YES |
| `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` | NEW; awaiting fill-in | created (template) |

**Action item M9 §3.4** to update the trackers post-merge.

## 6. Source plans / drafts authored this session

| Doc | Type | LOC | Notes |
|---|---|---|---|
| `docs/plans/v0.6.x-offline-mode-apk.md` v3 | Plan rewrite (v2 → v3) | 661 | All 22 critique-v2 items + 10 questions resolved |
| `docs/plans/v0.7.x-offline-workmanager-roadmap.md` | New roadmap | 215 | Closes v3 cross-references; Option C design sketch |
| `docs/research/offline-queue-prior-art.md` | New spike | 178 | Picks `idb`; rejects Workbox + 3 alts |
| `docs/test-reports/v0.5.5-offline-mode-manual-matrix.md` | New test report | 617 | 24 scenarios, fillable; ship gate |

## 7. Cross-references

- M0 §6 — evidence list for this package
- M1 §3 — outbox component map
- M2 §3 — npm dep delta
- M9 — exact next commands for each lane
- `RUNNING_LOG.md` 31st entry — full narrative + 7 action items
