# M7 — Current status (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/06_Handover_Current_Status.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/06_Handover_Current_Status.md) |

> **For the next agent:** Load-bearing operational state at handover. Read this first if you only have time for one file. T-1..T-4 are deployed and verified on `brain.arunp.in`. Sixteen v0.6.1 tasks remain. D-15..D-18 user-side validation is still open from the cutover.

## 1. State at handover (2026-05-19 19:34 IST)

### 1.1 Repo

| Property | Value |
|---|---|
| Branch | `main` |
| HEAD | `87d9253` (`docs(v0.6.1): open cloud-cleanup phase + audit reports + tracker updates`) |
| Pushed to origin | ✅ |
| Working tree | **clean** |
| Recent commits this session | `5a0f2f1` (T-1), `7ec050e` (T-2/3/4), `87d9253` (tracker + audit + plan) |

### 1.2 Hetzner (live serving)

| Component | Status | Notes |
|---|---|---|
| `brain.service` | ✅ active | Restarted twice this session; deploys current after both |
| `cloudflared.service` | ✅ active | Tunnel UUID `64fb278e-…`; ingress unchanged |
| `/opt/brain/data/brain.sqlite` | unchanged | 8 items / 81 chunks / 81 vec rows |
| `/opt/brain/.next/static/` | ✅ populated | Was empty pre-fix; required for CSS |
| `/opt/brain/public/` | ✅ populated | Required for sw.js, favicon, offline.html |
| brain.arunp.in `/api/health` | ✅ HTTP 200 in ~0.4s | After all 4 deploys today |
| 4 security headers | ✅ live | XFO DENY, nosniff, Referrer-Policy, HSTS 2y |
| Session cookie `Secure` flag | ✅ in code + NODE_ENV=production | NOT verified interactively in DevTools |
| `errors.jsonl` cf_ip field | ✅ confirmed | IPv6 surfaced from probe |

### 1.3 Mac

| Component | Status | Notes |
|---|---|---|
| `npm run typecheck` | ✅ clean | Verified after T-1 and T-2/3/4 |
| `npm run smoke` | ❌ fails on `better-sqlite3` ABI | **carry-over from cutover handover §1.5; not a regression** |
| `npm run build` | ✅ green | Standalone output produced + rsync'd |
| Mac brain.service | n/a | Stopped during cutover D-14, intentional |

### 1.4 External services

| Service | Status |
|---|---|
| Anthropic API | reachable; spend trajectory unchanged |
| Gemini API | paid tier active |
| Cloudflare | edge HTTPS + tunnel routing stable |
| GitHub origin | up to date with main |

## 2. v0.6.1 task table — what's done, what's open

| ID | Task | Status |
|----|------|--------|
| T-1 | Setup-page privacy claim | ✅ deployed |
| T-2 | `Secure` cookie flag | ✅ deployed |
| T-3 | 4 security headers | ✅ deployed |
| T-4 | `cf_ip` in bearer reject log | ✅ deployed |
| T-5 | Sidebar/settings stale strings | ⏳ pending |
| T-6 | Unlock recovery copy | ⏳ pending |
| T-7 | Extension "your Mac" copy | ⏳ pending (sequenced after T-12) |
| T-8 | offline.html copy | ⏳ pending |
| T-9 | reachability strings | ⏳ pending |
| T-10 | setup-apk verify-error | ⏳ pending |
| T-11a | Env rename phase 1 | ⏳ pending (ASK user before deploy) |
| T-12 | Route rename | ⏳ pending (must precede T-7) |
| T-13 | Delete `getLanIpv4()` | ⏳ pending |
| T-14 | `OLLAMA_DOWN_BACKOFF_MS` rename | ⏳ pending |
| T-15 | SwiftBar plugin trim | ⏳ pending |
| T-16 | `rotate-token.sh` URL | ⏳ pending |
| T-17 | `restore-from-backup.sh` header | ⏳ pending |
| T-18 | Layout meta description | ⏳ pending |
| T-19 | Settings backup-path label | ⏳ pending |
| T-20 | Smoke + version bump + tag `v0.6.1` | ⏳ pending |

## 3. Carry-over from cutover-done (still open)

| ID | Task | Status / who's blocked |
|----|------|------------------------|
| D-15 | APK share-target capture | Tested; payload didn't land. Likely unpaired token. **User retest needed** after pair flow. |
| D-16 | Browser Ask query | Untested. **User action.** |
| D-17 | Overnight 01:00 IST batch fire | Pending tonight. Verify via `journalctl --since "01:00" --until "01:30" \| grep batch-cron`. |
| D-18 | B2 backup smoke | Script not wired. v0.6.2. |
| Phase E | CF_API_TOKEN + 5 other rotations | Queued post-v0.6.1. |
| Mac better-sqlite3 ABI | Smoke broken locally | v0.6.3 backlog item. |

## 4. Immediate next actions (priority order)

1. **[USER] DevTools verification of T-2** — Open `brain.arunp.in/unlock` interactively, log in, check session cookie has `Secure ✓` in DevTools → Application → Cookies. 30-second confirmation.
2. **[AGENT] T-12 first** — `/settings/lan-info` → `/settings/device-pairing` route rename. The only sequencing constraint in the remaining work.
3. **[AGENT] T-7** — extension copy (4 strings); after T-12.
4. **[AGENT] T-5 / T-6 / T-8 / T-9 / T-10 / T-13 / T-14 / T-18 / T-19 bundle** — pure copy/dead-code, can interleave in any order.
5. **[AGENT] T-15 / T-16 / T-17** — Mac-side script cleanup. Can be done anytime; affects only the developer Mac, not production.
6. **[ASK] T-11a env rename** — User must approve the Hetzner `.env` edit before deploy. Plan §T-11.
7. **[USER] D-15 retest** — After Settings → Device Pairing route exists, scan QR from a device, retry the share.
8. **[AGENT] T-20** — Smoke + bump → 0.6.1 + tag.

## 5. Active endpoints (no change from cutover)

| URL | Status |
|---|---|
| `https://brain.arunp.in/api/health` | 200 in ~0.4s with bearer; 401 + cf_ip log without |
| `https://brain.arunp.in/unlock` | renders with CSS (post-T-1 fix) |
| `https://brain-staging.arunp.in/api/*` | mirror of prod |

## 6. Pending decisions for the user

1. **T-11a Phase 11a — when?** Plan currently slots it inside v0.6.1 release. Alternative: defer to v0.6.2.
2. **D-15 retry strategy** — re-pair APK then retest, or invest in adb logcat diagnostic first?
3. **DevTools T-2 verification** — yes/no; if no, document the gap explicitly in M9.

## 7. What this session did NOT touch

- Cutover script `scripts/deploy/cutover.sh`
- Database schema or migrations
- Capacitor config or APK source (just rebuilt with bumped version)
- Cloudflare tunnel config on Hetzner
- node-cron schedules
- Anthropic / Gemini provider integration

## 8. Cross-references

- [M0 — implementation plan](./Handover_Implementation_Plan_2026-05-19_193400.md) — DOD criteria
- [M4 — roadmap](./04_Implementation_Roadmap_Consolidated.md) — task sequencing DAG
- [M8 — deployment](./07_Deployment_and_Operations.md) — corrected rsync recipe
- [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md) — full plan
- [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/06_Handover_Current_Status.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/06_Handover_Current_Status.md) — cutover state
