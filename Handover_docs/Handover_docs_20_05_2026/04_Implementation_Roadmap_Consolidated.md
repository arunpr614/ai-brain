# M4 — Implementation Roadmap (consolidated)

| Field | Value |
|-------|-------|
| **Version** | v6 |
| **Date** | 2026-05-20 |
| **Previous version** | v5 baseline |
| **Mode** | Delta — v0.6.2 split rationale + orphan sequencing |

> **For the next agent:** This file contains the substantive planning guidance. Read §1 for the v0.6.2 split rationale, §2 for the orphan plans, §3 for the shipping queue.

---

## 1. v0.6.2 split-phase rationale

### 1.1 Why the existing draft is wrong-shaped

`../../docs/plans/v0.6.2-backup-and-retrieval.md` (untracked, 380 lines, 9 tasks) bundles:

| Concern | Type | Effort | User impact when broken |
|---|---|---|---|
| T-1 Anthropic 529 retry | P1 reliability | ~60 min code + tests | Every Ask query during overload windows hangs UI silently |
| T-2..T-5 B2 off-site backup | Durability infrastructure | 2–3 days (B2 setup + GPG keypair + escrow + runbook + cron + 24h soak) | Disaster recovery posture |
| T-6 retrieve JOIN | P2 correctness | ~30 min code + tests | 1-chunk items + generic queries fail |
| T-7 enrich-log hygiene | P2 cleanup | 30–45 min | Log noise only |
| T-8 T-11b legacy env drop | Hygiene | 15 min | None (one-week-soak gated) |

**The mismatch:** the user hitting an Anthropic 529 right now would wait through B2 provisioning + GPG escrow + runbook before getting their fix shipped. That's wrong sequencing.

### 1.2 Recommended split

```
v0.6.1.1 hotfix         T-1 (Anthropic retry) + T-6 (retrieve JOIN)        ~2 hours total
   ↓
v0.6.2 backup           T-2..T-5 (B2 + GPG + cron + runbook) + T-8 T-11b   ~2-3 days
   ↓
v0.6.3 hygiene          T-7 (enrich log) + CSP nonces + Mac sqlite ABI     ~1 day
```

### 1.3 Why this ordering

- **v0.6.1.1 first** — closes the user-visible reliability gap fast. Both fixes have unit tests already mapped out. Smallest possible scope.
- **v0.6.2 second** — focused durability work. B2 setup is the longest-pole dependency; it deserves dedicated attention not interleaved with reliability fixes.
- **v0.6.3 third** — hygiene tail. Log spam, nonces, dev-convenience. Lowest user-facing impact.

### 1.4 Alternative — keep bundled

If the user prefers a single phase: rewrite the existing draft to (a) remove the `fetchWithRetry` implementation sketch (it's executor work), (b) reframe §6 ASK questions as actual trade-offs not pre-anchored answers, (c) tighten total to ~200 lines. T-1 still ships first within the bundled phase, just labeled v0.6.2 instead of v0.6.1.1.

### 1.5 Decision is the user's

Don't rewrite the plan in the next session before asking. Frame as the binary in `Handover_Implementation_Plan_2026-05-20.md` §3.

---

## 2. ROADMAP §3.5 orphan-plan sequencing

Three plans exist with detailed task lists but no version slot. From today's audit:

| Plan | Tasks | Days drafted | Recommended slot | Why |
|---|---|---|---|---|
| `v0.6.x-augmented-browsing.md` v2.0 | AUG-1..7 (~5 commits) | 2026-05-12 | **v0.7.5 companion** | Shadow-DOM highlights inherit new palette; pairs naturally with GenLink |
| `v0.6.x-graph-view.md` v2.1 | GRAPH-1..10 (~10 commits) | 2026-05-13 | **v0.8.x or v0.10.0** | Heaviest plan; sigma.js library benchmark required; pairs with SRS for neighborhood navigation |
| `v0.6.x-library-offline-from-db.md` DRAFT | LIBOFF-1..12 (~10 commits) | 2026-05-15 | **v0.6.3** | Highest user-value of the three; unblocks airplane-mode reads |

**Reclassified:** `v0.6.x-offline-mode-apk.md` is **already shipped** in v0.5.5 + v0.5.6 (12 OFFLINE-* commits via lane L). Plan doc remains for posterity.

### 2.1 Three independent yes/no decisions

The user's call, not the agent's:

1. **LIBOFF → v0.6.3?** Yes / No / Defer to FUT-*
2. **AUG → v0.7.5 companion?** Yes / No / Defer
3. **GRAPH → v0.8.x or v0.10.0?** v0.8.x / v0.10.0 / Defer

Not blocking on each other; can be answered independently.

---

## 3. Shipping queue (post-decisions)

### 3.1 If v0.6.1.1 hotfix path approved

| Step | What | Owner | Effort |
|---|---|---|---|
| 1 | Draft `docs/plans/v0.6.1.1-hotfix.md` with T-1 + T-6 only | next agent | 30 min |
| 2 | User approves plan | user | — |
| 3 | Code: T-1 retry-on-5xx + tests | next agent | 60 min |
| 4 | Code: T-6 JOIN push-down + tests | next agent | 30 min |
| 5 | Smoke + deploy + tag `v0.6.1.1` | next agent | 30 min |
| 6 | Verify against live 529 window | user | observation |
| 7 | RUNNING_LOG entry #53 | next agent | 15 min |

Total: ~3 hours active work + user approval gate.

### 3.2 If bundled v0.6.2 path approved

| Step | What | Effort |
|---|---|---|
| 1 | Restructure existing draft per §1.4 | 1 hour |
| 2 | User approves restructured plan | — |
| 3 | T-1 retry code + tests | 60 min |
| 4 | T-6 retrieve fix + tests | 30 min |
| 5 | T-2 B2 + rclone setup on Hetzner (manual) | 1–2 hours |
| 6 | T-2c GPG keypair + escrow + runbook | 1 hour |
| 7 | T-2d backup script | 45 min |
| 8 | T-3 systemd timer | 15 min |
| 9 | T-4 recovery runbook + round-trip verify | 1 hour |
| 10 | T-5 retention | 10 min |
| 11 | T-7 enrich log fix | 45 min |
| 12 | T-8 T-11b legacy env drop (gated 2026-05-26+) | 15 min |
| 13 | Smoke + deploy + tag `v0.6.2` | 30 min |
| 14 | RUNNING_LOG entry #53 | 15 min |

Total: ~9–10 hours of active work over 2–3 sessions.

### 3.3 Either path — what to defer regardless

These are NOT in v0.6.1.1 / v0.6.2 / v0.6.3 scope:

- v0.7.0 Structured Calm Green visual refresh (committed plan, awaiting G-3 + G-4 user gates)
- v0.7.5 GenLink (renumbered from v0.7.0)
- v0.8.0 Review (SRS, blocked on R-FSRS spike)
- v0.6.5 GenPage + clusters (blocked on R-CLUSTER spike)
- All FUT-* items in ROADMAP §3

---

## 4. Carry-overs to track in next session

| Item | Phase target | Source |
|---|---|---|
| Mac better-sqlite3 ABI mismatch | v0.6.3 | RUNNING_LOG #46, BACKLOG §1 |
| CSP nonce wiring | v0.6.3 | v0.6.1 plan §6 |
| `tsx` removal from Hetzner runtime | v0.6.3 | v0.6.1 plan §6 |
| Backup healthcheck alert | v0.6.2.1 or v0.6.3 | v0.6.2 draft §7 |
| R-EMBED-QUALITY rerank investigation | v0.7.x or v0.8.x | BACKLOG §2 |
| 25 of 35 SELF_CRITIQUE.md findings | opportunistic per-phase | BACKLOG §3 |
| 4 v0.7.0 deferred items (tertiary-rose, Newsreader, chip animation, surface-dim/bright) | v0.7.x / v0.8.0 / v1.0.0 | BACKLOG v7.4 revision note |
