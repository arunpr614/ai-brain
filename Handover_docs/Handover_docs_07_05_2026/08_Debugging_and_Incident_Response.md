# AI Brain: Debugging and incident response (handover — 2026-05-07, post-v0.3.0)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** Use this file when something breaks. Start with the **symptom table** (§3) for quick triage, then use **outside-in layers** (§2) for systematic diagnosis.

## 1. Primary playbooks

| Doc | Use when |
|-----|----------|
| [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) | First check — most "it doesn't work" cases are Ollama not running or stale Turbopack cache. |
| [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) | Auth or session cookie failures. |
| [`docs/research/SELF_CRITIQUE.md`](../../docs/research/SELF_CRITIQUE.md) | Historical RCA reference for known gaps in research assumptions. |
| [`RUNNING_LOG.md`](../../RUNNING_LOG.md) | Narrative of what changed recently — often reveals what caused a regression. |

## 2. Outside-in diagnostic layers

| Layer | What fails | Typical signature | First fix |
|-------|-----------|-------------------|-----------|
| **Network / DNS** | URL capture can't fetch external pages | "fetch failed" in `[capture]` logs; offline | Check network; some sites block `jsdom`'s default UA — set a browser-like UA in the fetch. |
| **Ollama process** | Enrichment jobs stuck `pending` | `[ollama] connection refused`; worker logs back-off every 30s | `ollama serve` and `ollama list` — confirm model pulled. See `OLLAMA_HOST` in M3. |
| **LLM output** | Enrichment jobs go to `failed` after 3 attempts | `generateJson` retry + zod validation errors | Inspect `enrichment_jobs.last_error`. If Qwen 3: confirm `think:false` is at top level. If Qwen 2.5: try capping input length (some very long articles exceed context). |
| **Auth / session** | Redirected to `/unlock` unexpectedly | Cookie missing or HMAC fails in `[auth]` logs | Clear `brain_session` cookie in browser DevTools; re-enter PIN. If HMAC key rotated, all sessions invalidate — expected. |
| **Edge proxy** | Every request 404s or loops | `src/proxy.ts` misnamed or function export not `proxy` | Confirm file is `src/proxy.ts` (not `middleware.ts`) and `export function proxy(...)`. |
| **Next.js build** | TypeScript errors on start | `ItemRow` or `BodyInit` type errors | `ItemRow` lives in `@/db/client`. JSZip stream: use `uint8array` + `new Blob([new Uint8Array(buf)])`. |
| **Native modules** | `NODE_MODULE_VERSION` mismatch | Startup crash mentioning `better-sqlite3` | `rm -rf node_modules package-lock.json && npm install`. |
| **Turbopack cache** | "Module not found" for files that exist | Stale after a large rename or move | `rm -rf .next/dev .next/cache && npm run dev`. |
| **DB schema** | `no such column` or `no such table` errors | Migration didn't run, or ran against a stale DB | Check `_migrations` table: `sqlite3 data/brain.sqlite 'SELECT * FROM _migrations;'`. Compare to files in `src/db/migrations/`. |
| **FTS5 de-sync** | Search returns no results for known content | `items_fts` out of sync with `items` | Rebuild: `INSERT INTO items_fts(items_fts) VALUES('rebuild');` via `sqlite3`. |
| **V8 heap** | Dev server crashes after ~30 min | "JavaScript heap out of memory" | Confirm `NODE_OPTIONS='--max-old-space-size=8192'` is in the active `package.json` script. |
| **React 19 lint** | Build fails on a component | "useState initializer must be pure" | Lazy-init: `useState(() => ({ ... }))`. |
| **SSR hydration** | Red warning in console about `data-theme` mismatch | Pre-hydration theme script runs before React hydrates | `suppressHydrationWarning` on `<html>` in `src/app/layout.tsx` — already in place at v0.3.0. |

### Quick API verification

```bash
# Dev server is up:
curl -s http://localhost:3000/api/items/non-existent/enrichment-status
# Expected: 401 JSON (no session) or 404 JSON (authenticated but no such item)

# Ollama is up:
curl -s http://127.0.0.1:11434/api/tags | jq '.models[0].name'
# Expected: "qwen2.5:7b-instruct" (or similar)

# Trigger a trivial generate (CLI sanity):
curl -s http://127.0.0.1:11434/api/generate -d '{"model":"qwen2.5:7b-instruct","prompt":"hi","stream":false,"think":false}' | jq '.response'
```

## 3. Symptom → quick reference

| Symptom | Likely cause | Pointer |
|---------|-------------|---------|
| "Enriching…" pill never goes away | Ollama down OR job stuck in `running` past 90s stale-claim threshold | M2 §2 worker; `sqlite3 data/brain.sqlite 'SELECT * FROM enrichment_jobs WHERE status IN ("pending","running");'` |
| Summary/title missing, category empty | Job went to `failed` | `enrichment_jobs.last_error` column has the message |
| JSON parse error in worker logs for new model | Qwen 3 `<think>` truncation | `src/lib/llm/ollama.ts` — confirm top-level `think:false` |
| Capture succeeds but no enrichment job appears | AFTER INSERT trigger missing or migration 003 not applied | `sqlite3 data/brain.sqlite "SELECT name FROM sqlite_master WHERE type='trigger';"` — expect `items_enqueue_enrichment` |
| Library search returns nothing for a known word | FTS5 de-sync | `INSERT INTO items_fts(items_fts) VALUES('rebuild');` |
| PDF upload succeeds but body is empty | Paywalled PDF (below 301 chars/page) | `src/lib/capture/pdf.ts` paywall guard — `PAYWALL_CPP_THRESHOLD` |
| Title looks like `Growth-Loops-Messy-Draft` | Known Qwen 2.5 quirk on filename slugs | Deferred v0.3.1 post-processor; manually rename via Settings → Tags/Title for now |
| Cannot load `/` → redirected to `/unlock` | Missing/expired `brain_session` cookie | Re-enter PIN; expected flow |
| First-time setup loop (`/setup` → `/setup`) | `settings` table missing `auth.*` rows after a bad migration | Back up DB; re-run migrations from clean state or restore latest `data/backups/` snapshot |
| `NODE_MODULE_VERSION` crash at boot | Native module built for a different Node | `rm -rf node_modules package-lock.json && npm install` |
| Dev server `EADDRINUSE :3000` | Prior Next process didn't exit | `lsof -i :3000` → `kill <pid>`; or use `--port 3001` |
| Edge route returns 500 referencing `node:crypto` | Code that needs Node runtime running under Edge | Move logic out of `src/proxy.ts`; Edge only checks cookie presence |
| ZIP export 500 | `BodyInit` type mismatch | Wrap JSZip output: `new Blob([new Uint8Array(buf)], { type: "application/zip" })` |

## 4. Logging / observability

No external logger is wired at v0.3.0 — everything is `console.*` to the dev terminal.

| Prefix | Component | Use for |
|--------|-----------|---------|
| `[enrich]` | `src/lib/queue/enrichment-worker.ts` | Job lifecycle: claim / run / complete / fail / sweep-reclaim |
| `[backup]` | `src/lib/backup.ts` | Backup start/end + retention sweep |
| `[ollama]` | `src/lib/llm/ollama.ts` | Request errors + retry attempts + back-off |
| `[auth]` | `src/lib/auth.ts` | Setup / verify / session rotation |
| `[db]` | `src/db/client.ts` | Migration application |
| `[capture]` | `src/lib/capture/*` | Extraction outcome + strip summary |

Filter:

```bash
npm run dev 2>&1 | grep -E '\[(enrich|ollama|backup|auth|db|capture)\]'
```

## 5. Filing new bugs

There is no formal `Bug_Report/` directory yet. When filing a bug:

1. Append a `RUNNING_LOG.md` entry (use the `running-log-updater` skill) with the symptom, steps, and evidence.
2. If the fix needs tracking across sessions, add a row to `PROJECT_TRACKER.md` §5 Blockers.
3. If it represents a research gap, add it to `docs/research/SELF_CRITIQUE.md` findings list.

For rigorous RCAs, follow the **symptom → expected → steps → evidence → root cause** pattern and save as `docs/bugs/Bug_Report_YYYY-MM-DD_HHMMSS.md`. (Directory doesn't exist yet — create when first needed.)

## 6. Related handover files

- [03_Secrets_and_Configuration.md](./03_Secrets_and_Configuration.md) — session and config failures
- [06_Handover_Current_Status.md](./06_Handover_Current_Status.md) — current HEAD and known deferred items
- [07_Deployment_and_Operations.md](./07_Deployment_and_Operations.md) — deploy / rollback procedures
