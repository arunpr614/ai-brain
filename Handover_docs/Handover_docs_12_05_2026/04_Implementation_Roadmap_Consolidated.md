# M4 — Implementation Roadmap (consolidated)

**Version:** 1.0
**Date:** 2026-05-12
**Previous version:** `Handover_docs_11_05_2026/04_Implementation_Roadmap_Consolidated.md`
**Baseline:** full
**Scope:** what shipped, what's shipping next, per-lane
**Applies to:** both lanes
**Status:** COMPLETE (documentation)

> **For the next agent:** this file collapses `BUILD_PLAN.md`, `ROADMAP_TRACKER.md`, `PROJECT_TRACKER.md`, and all per-phase plan docs into a single "what happened, what's next" view, split by lane. When those source docs contradict this one, they win — this is a snapshot-in-time. Branch status at snapshot: `main @ 5ebd903` (unchanged), `lane-c/v0.6.0-cloud @ 60481fb` (docs only), `lane-l/feature-work @ 5ebd903` (empty, ready).

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

**Current HEAD on main:** `5ebd903` ("fix(v0.5.0, F3): unblock Ask streaming over Cloudflare tunnel") — this is the production-equivalent state.

**Note on tag/commit mismatch:** the v0.5.1 ship commit `cee808c` includes version bump but did not move origin/main in the prior session's push sequence. Whoever merges lane-c or lane-l should verify `origin/main` is at the actual v0.5.1 HEAD before rebasing. Check: `git log --oneline origin/main | head -5`.

## 2. Phase in-flight

### 2.1 v0.6.0 — Cloud migration (Lane C)

**Research: COMPLETE.** 9 spikes + budget-host follow-up.

**Plan draft: NOT STARTED.** Next concrete Lane C task: draft `docs/plans/v0.6.0-cloud-migration.md`.

**Execution: PARTIALLY STARTED.**
- Hetzner server provisioned (Helsinki CX23, $5.59/mo, IP `204.168.155.44`)
- SSH access BLOCKED (key wasn't attached at create time — see M8 §2)
- Nothing installed on server yet
- No migration to cutover yet

**Success gate (v0.6.0 ship):**
- Hetzner server hardened + app running
- DB migrated from Mac with hash-verified integrity
- Cloudflare tunnel re-pointed to Helsinki
- Anthropic Batch enrichment wired + first nightly batch succeeds
- Gemini embeddings swapped in; retrieval quality validated
- Backblaze B2 backups running; one successful encrypted restore test
- README updated with v0.6.0 privacy paragraph
- Tagged `v0.6.0`

### 2.2 Lane L — Local feature work (parallel)

**Status: NOT STARTED.** Branch `lane-l/feature-work` exists; no commits.

**First task pending user confirmation.** Recommended P1 = Chrome extension error-surface polish. Details in `docs/plans/LANE-L-BOOTSTRAP.md §3`.

## 3. Lane C — detailed task breakdown

Tasks to execute on `lane-c/v0.6.0-cloud` before tagging v0.6.0:

### Phase A — Server setup (today, partly done)
- [x] A1: Hetzner CX23 Helsinki provisioned
- [ ] A2: Resolve SSH key issue (web-console paste OR rebuild server)
- [ ] A3: SSH in as root; run Step 5a hardening (create `brain` user, disable root, disable password auth)
- [ ] A4: Verify `brain@` user login in second terminal
- [ ] A5: Hetzner Cloud firewall: allow SSH only from user's IP
- [ ] A6: Install Node 20 + sqlite3 + git + build-essential
- [ ] A7: Install cloudflared (deb package)
- [ ] A8: Create `/var/lib/brain` + `/opt/brain` owned by `brain`
- [ ] A9: Clone repo into `/opt/brain`; `npm ci`
- [ ] A10: Smoke-test: Node can load sqlite-vec extension on this VM (glibc check)

### Phase B — Plan + review (needs full conversation context)
- [ ] B1: Draft `docs/plans/v0.6.0-cloud-migration.md` v1.0 — full task tree
- [ ] B2: Stage 4 cross-AI review → `v0.6.0-cloud-migration-REVIEW.md`
- [ ] B3: Self-critique → `v0.6.0-cloud-migration-SELF-CRITIQUE.md`
- [ ] B4: Revise plan to v1.2
- [ ] B5: Present plan to user; get sign-off

### Phase C — Code changes (before cutover)
- [ ] C1: Add migration `008_enrichment_batch.sql` — `batch_id`, `batch_submitted_at` columns on `items`; `triggered_by` on `enrichment_jobs`
- [ ] C2: Add `src/lib/embed/gemini.ts` + env-flag dispatcher in `src/lib/embed/index.ts`
- [ ] C3: Add `src/lib/enrich/batch.ts` (Anthropic Batch API client) + scheduler (node-cron)
- [ ] C4: Add `src/app/api/items/[id]/enrich/route.ts` realtime manual mode
- [ ] C5: Add UI "Enrich now" button on item detail page
- [ ] C6: Add `scripts/backup-to-b2.sh` + gpg wrapper
- [ ] C7: Add `scripts/migrate-to-cloud.sh` (Mac-side cutover script)
- [ ] C8: Add `.env.cloud.example` documenting new vars (without values)
- [ ] C9: Add deps to `package.json`: `@anthropic-ai/sdk`, `@google/generative-ai`, `node-cron`
- [ ] C10: Local test: run with `EMBED_PROVIDER=gemini` + `BRAIN_ENRICH_BATCH_MODE=true` on Mac against Hetzner-sized DB

### Phase D — Cutover (03:00 IST user-scheduled window)
- [ ] D1: Stop Mac server + cloudflared
- [ ] D2: `.backup` Mac DB + sha256sum
- [ ] D3: scp to Hetzner + verify hash
- [ ] D4: Start app on Hetzner with new `.env.cloud`
- [ ] D5: Copy `/etc/cloudflared/config.yml` + credentials to Hetzner; install systemd unit
- [ ] D6: Start cloudflared on Hetzner; verify tunnel healthy
- [ ] D7: Test one capture from APK + extension
- [ ] D8: Fire one manual Enrich-now to validate Anthropic path
- [ ] D9: Wait for 3 AM UTC cron; verify first batch submitted
- [ ] D10: 24h later: verify batch completed + items enriched

### Phase E — Release
- [ ] E1: Update `README.md` with v0.6.0 privacy paragraph (from S-8)
- [ ] E2: Tag `v0.6.0`; push
- [ ] E3: Update `ROADMAP_TRACKER.md` + `PROJECT_TRACKER.md`
- [ ] E4: Running-log entry tagged `[Lane C]` documenting ship
- [ ] E5: Flip `RUNNING_LOG.md` OWNERSHIP BLOCK — release Lane C's shared-file locks

### Phase F — Lane collapse (after E5)
- [ ] F1: Merge `lane-c/v0.6.0-cloud` → `main`
- [ ] F2: Lane L rebases `lane-l/feature-work` onto new `main`
- [ ] F3: Update `MEMORY.md`: mark dual-lane memory stale
- [ ] F4: Decide: continue dual-lane for v0.6.1 or collapse back to single-agent

## 4. Lane L — backlog (pending user priority confirmation)

### P1 — Chrome extension error polish (recommended starting point)
- [ ] L1: Map all failure modes in `extension/capture.ts` (tunnel down, 401, 403, 500, network offline, timeout)
- [ ] L2: Wire each to a specific popup message
- [ ] L3: Options page: add "Clear bearer + re-pair" button
- [ ] L4: Right-click menu: add "Save page as article" alternative to "Save link"
- [ ] L5: Smoke: manual test matrix across all 6 error cases

### P2 — APK bug fixes
Reactive; no pre-defined list. User files bugs, Lane L triages + fixes.

### P3 — Next feature from FEATURE_INVENTORY.md
Candidates (user to pick):
- **Tags:** per-item free-form tags + tag-based filtering (schema migration 009)
- **Collections:** user-defined groupings (schema migration 010)
- **Export:** single item or whole library as Markdown (no schema change)

## 5. Cross-lane dependency graph

```
Lane C timeline:           Lane L timeline (can run anytime):

A1..A10 (server setup)     L1..L5 (extension polish)
   ↓                          ↓
B1..B5 (plan + review)     APK bugs as filed
   ↓                          ↓
C1..C10 (code changes) ←── [waits for nothing from Lane C]
   ↓                          ↓
D1..D10 (cutover)          [optional: Tags feature L6..Lx]
   ↓                          ↓
E1..E5 (release)           [rebase on new main]
   ↓                          ↓
F1..F4 (collapse) ←─────────┘
```

Lane L does NOT wait for Lane C. Lane L's only hard-stop is: after Lane C merges to main, Lane L must rebase. If Lane L has finished features, merging them before Lane C ships v0.6.0 is fine — they'll become part of the v0.6.0 release tag by virtue of being on main.

## 6. Release sequencing

**Only Lane C bumps version until v0.6.0 ships.** Lane L's merged features land in v0.6.0 automatically. After v0.6.0:
- v0.6.1: Lane L can tag if it has a standalone feature
- v0.7.x onward: return to normal single-version-per-phase cadence

## 7. What's deferred

From `FEATURE_INVENTORY.md` — features explicitly postponed past v0.6.0:

- Multi-user / sharing
- Email capture
- Web-clipper beyond Chrome (Firefox, Safari)
- Audio transcription
- PDF full-text OCR (deferred to R-OCR future phase)
- Tailscale-based pairing (v0.10.0 option — superseded by Cloudflare tunnel for most use cases)
- Native iOS APK

## 8. Milestones next 30 days (target)

| Date | Milestone | Owner |
|---|---|---|
| 2026-05-12 | v0.6.0 plan drafted + reviewed | Lane C |
| 2026-05-13 | Cutover executed; tagged v0.6.0 | Lane C |
| 2026-05-14 | B2 backup verified + first restore test | Lane C |
| 2026-05-15..20 | Lane L extension polish + 1 feature | Lane L |
| 2026-05-20 | Dual-lane retro: keep or collapse? | user + both lanes |

Dates aspirational, not commitments.
