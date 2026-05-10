# AI Brain — Backlog

| Field | Value |
|-------|--------|
| **Document version** | v7.0-backlog (v0.5.0 pivoted to Cloudflare Tunnel) |
| **Date** | 2026-05-10 |
| **Owner** | Arun |
| **Update cadence** | at every phase kickoff; whenever an item is promoted, deferred, or closed |
| **Revision** | v7.0 — v0.5.0 PIVOTED 2026-05-10 from LAN-only to Cloudflare named tunnel (user reported firewall complexity at T-21 gate). v1.3 LAN plan archived at `docs/archive/v0.5.0-lan-approach/`. New plan v2.0 drafting underway. Task numbering shifts from T-N → T-CF-N. v6.0 history preserved below |

> Single source of truth for work that is **not in the active phase plan** but is known-needed, nice-to-have, or idea-captured. Items promoted from here land in `BUILD_PLAN.md` under a phase heading. Items closed here get a strikethrough and a closing commit SHA.

---

## 1. Active phase — v0.5.0 APK + Chrome extension (PIVOTED to Cloudflare Tunnel 2026-05-10)

### Current state (as of 2026-05-10)

v0.4.0 closed 2026-05-09 (tag `v0.4.0`). v0.5.0 began same day with the **LAN-only plan v1.3** (37 tasks, T-0..T-18 shipped). **PIVOTED 2026-05-10** at T-21 gate when user reported macOS firewall configuration was too complex; option menu resolved to Cloudflare **named tunnel** via user's `arunp.in` domain.

**Active plan v2.0 (Cloudflare Tunnel) — drafting in progress:**

- [`docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md`](./docs/plans/v0.5.0-CLOUDFLARE-RESEARCH.md) (R-CFT, 662 lines) — research spike; verdict PROCEED-WITH-CHANGES; major finding: quick tunnels block SSE, so pivoted to named tunnel.
- [`docs/plans/v0.5.0-CLOUDFLARE-RESEARCH-CRITIQUE.md`](./docs/plans/v0.5.0-CLOUDFLARE-RESEARCH-CRITIQUE.md) (425 lines) — 5 blockers + 4 HIGH + gaps; B-5 ALLOWED_ORIGINS fix absorbed in commit `279ec9c` ahead of plan v2.0.
- [`docs/plans/spikes/`](./docs/plans/spikes/) — 5 spike reports (SPIKE-001..005) written during DNS-propagation waiting window on 2026-05-10.
- **Plan v2.0 document pending** (Stage 3 of planning pipeline).
- DNS propagation for `arunp.in` (GoDaddy → Cloudflare) in flight at 2026-05-10 20:00; completion expected within 30 min.
- Next concrete user action: `brew install cloudflared` after DNS propagates.

**Archived under `docs/archive/v0.5.0-lan-approach/`:**

- v0.5.0-RESEARCH.md (R-0.5.0, LAN-era)
- v0.5.0-RESEARCH-CRITIQUE.md (LAN-era)
- v0.5.0-apk-extension.md (v1.3, final LAN-era plan)
- v0.5.0-apk-extension-REVIEW.md (cross-AI review of v1.1 → v1.1 patches)
- See `docs/archive/v0.5.0-lan-approach/README.md` for pivot rationale.

### Code that survives the pivot (shipped under v1.3, unchanged)

Bearer auth, proxy layered auth, rate limiter, Origin validation (update to named-tunnel origin landed in `279ec9c`), share-handler, dedup, capture endpoints (URL/PDF/note), reachability probe, offline page, QR scanner, keystore pipeline (T-19 + T-20), debug signingConfig in `android/app/build.gradle`.

### Code to delete per pivot (owned by future T-CF-* tasks)

- `src/lib/lan/mdns.ts` + `.test.ts` — T-CF-2
- `bonjour-service` npm dep — T-CF-2
- `src/instrumentation.ts` mDNS wiring — T-CF-2
- `android/app/src/main/res/xml/network_security_config.xml` — T-CF-3
- AndroidManifest `android:networkSecurityConfig` attribute — T-CF-3
- `src/lib/client/reachability-decision.ts` two-probe tree (simplify to single probe) — T-CF-6
- QR schema `ip=` parameter (replace with `url=`) — T-CF-4
- `share-handler.tsx` `getBrainUrl()` Preferences lookup (replace with hardcoded `https://brain.arunp.in`) — T-CF-2 or T-CF-12
- README "Android APK" section — T-CF-10

### Historical (v0.3.1 snapshot, for reference — all closed; see §5)

Full plan: [`docs/plans/v0.3.1-polish.md`](./docs/plans/v0.3.1-polish.md) (v2.0). Critique source: [`docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md`](./docs/plans/SELF_CRITIQUE_2026-05-08_10-14-16.md).

### 1a. Polish (carried from v0.3.0)

| ID | Title | Source | Size | Severity | Notes |
|---|---|---|---|---|---|
| F-207 | Library bulk-select UI (multi-select + batch tag/collection/delete) | v0.3.0 scope | M | — | Backend primitives exist; plan §T-B-5. |
| B-301 | Title hyphenation post-processor | v0.3.0 QA finding | S | — | **Heuristic tightened per critique P-1**: fire only on `0 spaces && ≥ 2 hyphens`. |
| F-301 | Wire `CollectionEditor` into item detail | v0.3.0 partial | XS | — | Component exists at [`src/components/collection-editor.tsx`](./src/components/collection-editor.tsx). |
| F-302 | Inline tag editor on item detail | v0.3.1 polish | S | — | Reuse `addTagToItemAction` + `removeTagFromItemAction`. |

### 1b. Hardening (absorbed from 2026-05-08 self-critique)

| ID | Title | Critique ref | Severity | Track |
|---|---|---|---|---|
| F-042 | Bind Next dev server to `127.0.0.1` | A-1 | **P0** | §4A T-A-1 |
| F-043 | Session cookie expiry + `SameSite=Strict` | A-5 | P1 | §4A T-A-8 |
| F-044 | `globalThis` worker-boot guard (HMR-safe) | A-2 | P1 | §4A T-A-3 |
| F-045 | Periodic `sweepStaleClaims()` inside loop | A-3 | P1 | §4A T-A-4 |
| F-046 | Expose `attempts` on enrichment status endpoint | A-4 | P2 | §4A T-A-6 |
| F-047 | Log non-nodejs `instrumentation.ts` branch | A-11 | P2 | §4A T-A-5 |
| F-048 | Force `WAL` + `synchronous=NORMAL` per-connection | A-6 | P1 | §4A T-A-2 |
| F-034 | DB restore script + runbook (promoted from v0.10.0) | A-7 | P1 | §4A T-A-9 |
| F-049 | Exact-pin `sqlite-vec@0.1.6` before R-VEC | A-9 | P1 | §4A T-A-10 |
| F-050 | `data/errors.jsonl` rotation | A-10 | P2 | §4A T-A-11 |
| F-051 | Adopt `node:test` + `npm test` precedent | P-2 | P1 | §4A T-A-7 |
| F-052 | `scripts/smoke-v0.3.1.mjs` end-to-end smoke | P-4 | P1 | §4A T-A-13 |
| F-053 | Bulk actions revalidate `/collections/[id]` + `/settings/tags` | P-6 | P1 | §4B T-B-5b |
| F-054 | Release guard (clean tree + revert rehearsal) | P-12, M-4 | P1 | §4B T-B-6 |
| F-055 | Per-task `RUNNING_LOG.md` breadcrumbs | M-1 | P1 | Cross-cutting (append after every `T-*` commit) |
| F-056 | Refuse PIN overwrite without reset flag | A-12 | P2 | §4A T-A-12 |

### 1c. Deliberately deferred from critique to v0.4.0+

| Critique ref | Why deferred |
|---|---|
| A-8 (FTS5 LIKE fallback cleanup) | Revisit when hybrid search stresses FTS5 in v0.4.0 |
| P-11 (BACKLOG.md §5 archive rotation) | Not urgent before §5 has > ~20 closed items |
| P-5 (plan provenance nits) | Cosmetic; folded into v2.0 plan header |
| M-3 (cross-AI review) | Run if `gsd-review` is available; otherwise user spot-checks |

---

## 2. Research spikes queued

| ID | Question | Blocks | Priority | Plan |
|---|---|---|---|---|
| ~~R-VEC~~ | ~~sqlite-vec perf at 10k+ chunks on M1 Pro~~ | ~~v0.4.0~~ | — | **Closed 2026-05-08 GREEN** — see §5 |
| R-FSRS | SRS algorithm choice (SM-2 / FSRS) | v0.8.0 | P1 | — |
| R-CLUSTER | Topic clustering (JS vs Python vs LLM-only) | v0.6.0 | P2 | — |
| R-YT | yt-dlp reliability on YouTube auto-subs | v0.10.0 | P2 | — |
| R-WHISPER | whisper.cpp vs faster-whisper on M1 Pro | v0.10.0 | P2 | — |

---

## 3. Open self-critique findings

25 of 35 findings from [`docs/research/SELF_CRITIQUE.md`](./docs/research/SELF_CRITIQUE.md) remain open. Address opportunistically per phase rather than as a dedicated sprint — capture fix commit SHAs in that file, not here.

---

## 4. Ideas / seeds (not scheduled)

| ID | Idea | Notes |
|---|---|---|
| I-01 | Auto-collection suggestion from enrichment tags | Would sit behind a user toggle; needs R-CLUSTER first. |
| I-02 | Per-item "regenerate enrichment" button | Already safe: `enrichItem` is idempotent. UI work only. |
| I-03 | Export Obsidian vault directly (not just zip) | Requires D-4 (Obsidian vault path) — still open. |
| ~~F-057~~ | ~~Audit `sqlite-vec` resolved version on install~~ | **Closed 2026-05-08** under v0.4.0 T-0 (`e8f104a`): pinned to 0.1.9 with explicit overrides for all five platform sub-packages. `npm ls` shows `sqlite-vec-darwin-arm64@0.1.9 overridden`. |

---

## 5. Recently closed

Rotated 2026-05-09 under v0.5.0 T-0. Prior closure sets:

- **v0.4.0 Ask (RAG)** — 21 tasks (T-0..T-19) + T-20 tracker update → [`docs/archive/BACKLOG_ARCHIVE_2026-05-09.md`](./docs/archive/BACKLOG_ARCHIVE_2026-05-09.md)
- **v0.3.1 Polish + Hardening + R-VEC spike + F-057** → [`docs/archive/BACKLOG_ARCHIVE_2026-05.md`](./docs/archive/BACKLOG_ARCHIVE_2026-05.md)

New v0.5.0 closures accumulate below as tasks land (rule of thumb: rotate when this section crosses ~20 items).

### v0.5.0 closures (in progress)

_None yet — T-0 rotation is this commit._

---

## 6. Update rules

1. **Promote:** when an item enters an active phase plan, move its row into that phase's `BUILD_PLAN.md` section and leave a one-line breadcrumb here with a `→ promoted to v0.X.Y` note.
2. **Close:** strike through the row and add closing commit SHA, e.g. `~~F-302~~ Inline tag editor (closed abc1234)`. Move closed items into §5 at next phase rollover.
3. **Defer:** if a planned item is bumped to a later phase, record the new target version and the reason in a nested bullet.
4. **Never delete rows** — history matters for retrospectives.
