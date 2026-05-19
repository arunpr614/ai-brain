# M4 — Implementation roadmap consolidated (v0.6.1 T-1..T-4 done delta)

| Field | Value |
|-------|--------|
| **Version** | v1.0 |
| **Date** | 2026-05-19 |
| **Previous version** | n/a |
| **Baseline** | [Handover_docs_19_05_2026_15_21_CUTOVER_DONE/04_Implementation_Roadmap_Consolidated.md](../Handover_docs_19_05_2026_15_21_CUTOVER_DONE/04_Implementation_Roadmap_Consolidated.md) |

> **For the next agent:** v0.6.1 Cloud-Cleanup phase opened today. 4 of 20 tasks deployed. This is the operating doc for the rest of the phase — task table with sequencing constraints + acceptance gate.

## 1. v0.6.1 Cloud-Cleanup task table

Source: [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md).

| ID | Task | Tier | Status | Commit / notes |
|----|------|------|--------|---------------|
| **T-1** | Setup-page false privacy claim → honest copy | DO-THIS-WEEK | ✅ **DEPLOYED** | `5a0f2f1` — `src/app/setup/page.tsx:25` |
| **T-2** | `secure: NODE_ENV==='production'` on session cookie | T1 | ✅ **DEPLOYED** | `7ec050e` — `src/lib/auth.ts:113-119` |
| **T-3** | 4 HTTP security headers (XFO, nosniff, Referrer-Policy, HSTS) | T1 | ✅ **DEPLOYED** | `7ec050e` — `next.config.ts` `headers()` |
| **T-4** | Log `cf-connecting-ip` in bearer rejections | T1 | ✅ **DEPLOYED** | `7ec050e` — `src/proxy.ts:65-100` |
| **T-5** | Stale version/mode strings (sidebar, settings) | T2 | ⏳ pending | `sidebar.tsx:56`, `settings/page.tsx:129,131` |
| **T-6** | Unlock-page recovery copy | T2 | ⏳ pending | `unlock/page.tsx:26` |
| **T-7** | Extension "your Mac" copy (4 strings) | T2 | ⏳ pending | **Sequenced after T-12** |
| **T-8** | `public/offline.html` copy (4 strings) | T2 | ⏳ pending | `public/offline.html:130,147,219,221` |
| **T-9** | Reachability `describeVerdict()` strings | T2 | ⏳ pending | `src/lib/client/reachability.ts:134,136,138` |
| **T-10** | `setup-apk` verify-error copy | T2 | ⏳ pending | `src/app/setup-apk/page.tsx:125-127` |
| **T-11a** | `BRAIN_LAN_TOKEN` → `BRAIN_API_TOKEN` (dual-read) | T2 | ⏳ pending | needs Hetzner `.env` edit; ASK user before deploying |
| **T-12** | `/settings/lan-info` → `/settings/device-pairing` | T2 | ⏳ pending | **MUST PRECEDE T-7** |
| **T-13** | Delete dead `getLanIpv4()` | T2 | ⏳ pending | `src/lib/lan/info.ts:21` |
| **T-14** | `OLLAMA_DOWN_BACKOFF_MS` → `LLM_PROVIDER_DOWN_BACKOFF_MS` | T2 | ⏳ pending | `src/lib/queue/enrichment-worker.ts:37` |
| **T-15** | SwiftBar plugin trim | T2 | ⏳ pending | `scripts/swiftbar/brain-health.30s.sh` |
| **T-16** | `rotate-token.sh` default URL | T2 | ⏳ pending | `scripts/rotate-token.sh:23` |
| **T-17** | `restore-from-backup.sh` Hetzner-only header | T2 | ⏳ pending | `scripts/restore-from-backup.sh` |
| **T-18** | Layout `<meta description>` truthfulness | T2 | ⏳ pending | `src/app/layout.tsx:25` |
| **T-19** | Settings backup-path label honesty | T2 | ⏳ pending | `src/app/settings/page.tsx:94` |
| **T-20** | Smoke + version bump (→ 0.6.1) + tag `v0.6.1` | release | ⏳ pending | gate on T-1..T-19 + 12 acceptance criteria |

## 2. Sequencing DAG (the constraints that matter)

```
T-1, T-2, T-3, T-4 ── done ──────────────────────────────────► …
                                                                  │
T-12 (route rename) ──────► T-7 (extension copy uses new URL)     │
                                                                  ▼
T-5  T-6  T-8  T-9  T-10  T-13  T-14  T-18  T-19 ─── interleavable
                                                                  │
T-15  T-16  T-17 ─── Mac-side scripts                             │
                                                                  ▼
T-11a (env dual-read; ASK user before deploy) ────────────────────►
                                                                  │
                                                                  ▼
                                                              T-20 (release)
```

**Critical:**
1. T-12 before T-7 (extension copy must point at new URL).
2. T-11a is the only task that needs interactive `.env` editing on Hetzner — ASK before deploying.
3. T-20 is the gate; do NOT bump `package.json` to `0.6.1` until all 12 acceptance criteria pass.

## 3. Acceptance gate (12 criteria, plan §4)

| # | Criterion | How verified |
|---|-----------|--------------|
| 1 | Setup page no longer claims "never talks outside your Mac" | Open `/setup` in fresh browser; read |
| 2 | Session cookie has `Secure` attribute in production | DevTools → Application → Cookies |
| 3 | Four security headers present | `curl -I https://brain.arunp.in/` |
| 4 | Bearer-rejection logs include `cf_ip` field | Force a 401, grep `errors.jsonl` |
| 5 | Sidebar reads `v0.6.1 · cloud` | Open any logged-in page |
| 6 | `/settings/device-pairing` resolves | Click Settings → Device Pairing |
| 7 | `/settings/lan-info` 308-redirects to `device-pairing` | `curl -I https://brain.arunp.in/settings/lan-info` |
| 8 | No string "your Mac" / "v0.1.0" / "npm run dev:lan" in user-visible code | `grep -rn` returns only test fixtures |
| 9 | `BRAIN_API_TOKEN` works; `BRAIN_LAN_TOKEN` still works as fallback | health probe with each |
| 10 | All paired devices (APK + extension) still authenticate post-deploy | One probe each |
| 11 | Smoke + typecheck + lint green | `npm run typecheck && npm run lint && npm run smoke` |
| 12 | Tag `v0.6.1` on `main` | `git tag` listing |

**1, 2, 3, 4 already pass at this handover.**

## 4. Out of scope for v0.6.1 (deferred)

| Item | Target |
|------|--------|
| CSP nonce wiring | v0.6.3 |
| B2 off-site backup | v0.6.2 (its own phase) |
| Per-device tokens (audit A+C) | TBD — needs design doc |
| `tsx` removal from Hetzner runtime | v0.6.3 |
| `enrichment-worker.ts` 45-min loop fix | open behavior bug, separate |
| Chrome extension URL configurability | only if multi-deployment |
| Mac better-sqlite3 ABI mismatch | v0.6.3 |
| T-11b (drop fallback) | v0.6.2 |

## 5. Carry-over from cutover-done (still pending)

| Item | Status |
|------|--------|
| **D-15** APK share-target capture | tested, payload didn't land — likely unpaired token; needs retry after pair |
| **D-16** Browser Ask query | not tested |
| **D-17** Overnight 01:00 IST batch fire | pending tonight |
| **D-18** B2 backup script wired | not done; v0.6.2 |
| **Phase E** secret rotation | queued |

## 6. Cross-references

- [`docs/plans/v0.6.1-cloud-cleanup.md`](../../docs/plans/v0.6.1-cloud-cleanup.md) — operating plan
- [`.planning/legacy-feature-audit-v2.md`](../../.planning/legacy-feature-audit-v2.md) — risk × effort source
- [M7 — current status](./06_Handover_Current_Status.md) — exact deployment state
- [`ROADMAP_TRACKER.md`](../../ROADMAP_TRACKER.md) v0.9.3 — public roadmap of record
- [`PROJECT_TRACKER.md`](../../PROJECT_TRACKER.md) v0.9.2 — tactical board
