# AI Brain: Deployment and operations (handover — 2026-05-07, post-v0.3.0)

| Field | Value |
|-------|--------|
| **Version** | **1.0** |
| **Date** | May 7, 2026 |
| **Previous version** | (none) |
| **Baseline** | (none) |

> **For the next agent:** This file contains every procedure needed to run and ship AI Brain. **Pre-v1.0.0 there is no cloud deploy** — operations = local dev + SQLite file management + Ollama process. Follow numbered steps exactly.

> **Guardrail:** Do not push to any hosting platform (Vercel, Fly, Render, etc.) before v1.0.0. Do not commit values from `.env.local`. Do not commit `data/*.sqlite`.

## 1. Prerequisites

1. **Node.js 20+** installed (`node --version` ≥ 20).
2. **Ollama** installed and running:
   ```bash
   # Install: https://ollama.com/download
   ollama serve &                 # starts the daemon on localhost:11434
   ollama pull qwen2.5:7b-instruct  # default enrichment model (~4.7 GB)
   ollama list                    # verify presence
   ```
3. **Repo cloned** with SSH or HTTPS from `github.com/arunpr614/ai-brain`.
4. **Install deps** (first time and after any `package.json` change):
   ```bash
   cd ai-brain
   npm install
   ```

## 2. Start local dev server

### 2.1 First-run setup

1. Start Ollama (see §1).
2. From `ai-brain/`:
   ```bash
   npm run dev
   ```
   This runs `NODE_OPTIONS='--max-old-space-size=8192' next dev` (Turbopack).
3. Open `http://localhost:3000`. You will be redirected to `/setup` on first run.
4. Enter a PIN. `src/lib/auth.ts` writes `auth.pin_hash`, `auth.pin_salt`, and `auth.session_secret` to the SQLite `settings` table.
5. You are now at `/` — the Library page.

### 2.2 Subsequent runs

1. Ensure Ollama is running.
2. `npm run dev` and open `http://localhost:3000`. You'll land at `/unlock` — enter the PIN.

### 2.3 After any schema change

Migrations in `src/db/migrations/NNN_*.sql` run automatically on server boot via `src/db/client.ts`. The `_migrations` table tracks which have applied.

1. Stop the dev server (Ctrl-C).
2. Add your migration file as `NNN+1_<name>.sql`.
3. `npm run dev` — migrations apply on first DB access; check logs for `[db] applied migration NNN+1`.

### 2.4 After native-module changes (`better-sqlite3`, `sqlite-vec`)

If you see `NODE_MODULE_VERSION` mismatch errors:

1. `rm -rf node_modules package-lock.json`
2. `npm install`
3. `npm run dev`

## 3. Production build (local smoke only — do NOT deploy)

```bash
npm run build     # produces .next/ optimized bundle
npm run start     # serves the built app on :3000
```

At `5d1c390` the build emits 14 routes + 4 API endpoints with zero TS or lint errors.

## 4. Smoke checks

### 4.1 Enrichment pipeline end-to-end

1. Start Ollama and the dev server (§2).
2. On the Library page, click `+ Capture` → URL tab → paste `https://en.wikipedia.org/wiki/Local-first_software` → submit.
3. The item should appear immediately in the Library with an `EnrichingPill` indicating "pending" → "running".
4. Within ~15–30s the pill disappears and the card shows a title + category tag.
5. Click the card; the item detail page shows a dual-pane view with summary, quotes, auto-tags, and the original body.

### 4.2 Database + backup

1. Verify `data/brain.sqlite` exists and grows.
2. After 6h of uptime, verify `data/backups/brain-<timestamp>.sqlite` files appear.
3. `sqlite3 data/brain.sqlite '.tables'` should list: `items`, `items_fts`, `item_tags`, `tags`, `collections`, `item_collections`, `chunks`, `cards`, `chat_sessions`, `chat_messages`, `llm_usage`, `enrichment_jobs`, `settings`, `_migrations` (~14 tables).

### 4.3 Ollama reachable

```bash
curl -s http://127.0.0.1:11434/api/tags | jq '.models[].name'
# Expected: "qwen2.5:7b-instruct" (and any others pulled)
```

If this returns empty or a connection error, the enrichment worker will back off for 30 s and log `[ollama] connection refused, backing off`.

### 4.4 FTS5 search

1. Capture at least 3 items.
2. Go to `/search` and type a distinctive word from one of them.
3. The matching item should appear. If nothing appears, FTS5 might be de-synced — see [08_Debugging_and_Incident_Response.md](./08_Debugging_and_Incident_Response.md).

## 5. Pre-commit checklist

- [ ] `git diff --cached` shows no files under `data/` or `.env.local`
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes (first time on a branch; optional on every commit)
- [ ] Manual smoke of the code path you changed
- [ ] `RUNNING_LOG.md` entry appended for any milestone (use the `running-log-updater` skill)
- [ ] `PROJECT_TRACKER.md` updated if a phase status changed
- [ ] Commit message follows existing style — `type(scope): short summary` (see `git log --oneline` for examples)

## 6. Common deployment mistakes

| Severity | Mistake | Recovery |
|----------|---------|----------|
| **P0** | Committed `data/brain.sqlite` | `git rm --cached data/brain.sqlite` + rotate session secret via `/setup`. Re-push. |
| **P0** | Committed `.env.local` with secrets (shouldn't happen — no real secrets pre-v1.0.0, but still) | Rotate any leaked value; force-replace the commit. |
| **P0** | Deployed to Vercel/Fly/etc. before v1.0.0 | Take it down immediately. The app was not designed for multi-tenant hosting and leaks all user data. |
| **P1** | Removed `serverExternalPackages: ["better-sqlite3", "sqlite-vec"]` from `next.config.ts` | Restore the config; Turbopack cannot bundle native modules. |
| **P1** | Removed `NODE_OPTIONS='--max-old-space-size=8192'` from scripts | Restore it. V8 OOMs after ~38 min of dev without the larger heap. |
| **P1** | Left Ollama running with a non-local `OLLAMA_HOST` | Reset to `http://127.0.0.1:11434`. Non-local = data leaves the machine. |
| **P2** | Stale Turbopack cache after a major rename produces ghost errors | `rm -rf .next/dev .next/cache && npm run dev` |
| **P2** | Migrations out of order (skipped numbers) | Rename to contiguous `NNN_` sequence. The runner expects contiguous application. |

## 7. Rollback (high level)

AI Brain pre-v1.0.0 has **no production environment** — "rollback" means reverting code on `main`.

1. Identify the last good commit: `git log --oneline` and pick one before the regression.
2. `git revert <bad-commit>` (produces a clean revert commit; safer than `reset --hard`).
3. Verify smoke checks (§4).
4. If the revert involved a DB migration: find the matching snapshot in `data/backups/brain-<timestamp>.sqlite` (the scheduler keeps 28 × 6h = ~7 days of history), stop the dev server, copy the snapshot over `data/brain.sqlite`, and restart.
5. Append a `RUNNING_LOG.md` entry describing the revert and the trigger.

## 8. Capacitor APK build (v0.5.0, deferred)

Not yet scaffolded at v0.3.0. When v0.5.0 starts:

1. Install JDK 21 (Capacitor 8 requires it — not 17).
2. `npm install @capacitor/core @capacitor/cli @capacitor/android @capgo/capacitor-share-target@^8.0.30`.
3. `npx cap init "AI Brain" "com.arun.aibrain" --web-dir=out`.
4. Follow `docs/research/android-share.md` for share-intent registration.
5. Build APK: `npx cap sync android && cd android && ./gradlew assembleDebug`.
6. Sideload to phone: `adb install app/build/outputs/apk/debug/app-debug.apk`.

Full procedure will be written as part of v0.5.0 implementation, not now.
