# Free-tier Architecture Redesign — thought experiment

**Research date:** 2026-05-13
**Question:** Can Brain run indefinitely free + user-provided AI keys + same UX?
**TL;DR:** Conditionally yes — Shape B (Vercel Hobby + Turso) is the most viable path, with the fewest rewrites and genuinely free-forever hosting. The load-bearing trade-off is that `better-sqlite3` must be replaced with a libSQL HTTP client (all DB calls become async), the `sqlite-vec` extension must be replaced with Turso's native vector, and the SSE Ask endpoint must complete within Vercel's 300-second function cap. All three are solvable, but each is a real rewrite week. Against Hetzner CAX11 at $3.60/month, the migration only breaks even after ~2.5 years — so this is worth doing only if you plan to run Brain for 4+ years or want the portfolio/skill gain.

---

## The triangle: persistent SQLite + always-on Node + free

Brain's current architecture is built around three properties that pull in opposite directions on free tiers:

1. **Persistent SQLite on local NVMe** — WAL mode requires a real, writable, local filesystem. No free serverless platform provides this. This single constraint eliminates Cloudflare Workers, Vercel, Netlify, Deno Deploy, and Google Cloud Run in their native forms.

2. **Always-on Node process** — `next start` runs forever. Free tiers that spin down after inactivity (Render Free: sleeps after 15 min; Supabase: pauses after 7 days) break capture UX. The only free exception is Cloudflare Workers/Pages, which are stateless edge functions with <50 ms cold starts — but they have no local filesystem.

3. **Free (indefinitely)** — not free-trial. This rules out Oracle Always Free (instance reaping risk), Railway (no free tier since 2023), PlanetScale (shut free tier in 2024), and any promotional pricing that expires.

The escape hatch: **replace the local SQLite file with a hosted libSQL database (Turso)**. Turso speaks SQLite-compatible SQL over HTTPS, supports native vector search, has a genuine free tier (verified 2026-05-13: 5 GB storage, 500M row reads/month, 10M row writes/month, 100 databases), and never sleeps. This decouples the app from "must have local NVMe" and unlocks serverless deployment. The cost is that every DB call becomes async HTTP — a real rewrite, not a swap.

---

## Current pillars — what we're redesigning around

| Pillar | Current | Free-tier alternative | Rewrite required? |
|---|---|---|---|
| Compute | Long-lived `next start` on Hetzner VM | Vercel Hobby functions (serverless Next.js) OR Cloudflare Workers | Medium — no persistent process |
| Database | `better-sqlite3` WAL on local NVMe | `@libsql/client` → Turso HTTP API | Yes — all DB calls async |
| Vector search | `sqlite-vec` extension (`vec_distance_cosine`) | Turso native `vector_top_k()` + `vector_distance_cos()` | Yes — syntax change, same semantics |
| Public endpoint | Cloudflare Named Tunnel → `brain.arunp.in` | `*.vercel.app` OR `*.workers.dev` OR keep `arunp.in` ($10/yr) | Optional — tunnel not needed |
| Cron (nightly batch) | `node-cron` in-process | GitHub Actions scheduled workflow (free 2k min/month) | Low — move cron call to GH Actions |
| AI (Ask + enrich) | Anthropic API (user key) | Unchanged — user provides key | None |
| Embeddings | Gemini free tier (user key) | Unchanged | None |
| Backups | rclone + gpg → Backblaze B2 | GitHub Actions → rclone → B2 (same) OR Turso's 1-day free snapshots | Low |
| SSE streaming | Long-lived SSE from `next start` | Vercel: max 300s per function (sufficient for Ask) | Verify per-session |

---

## Free-tier landscape 2026 — verified pricing

| Layer | Service | Hard limits (free) | Sleep/pause? | Source verified |
|---|---|---|---|---|
| **Compute** | Cloudflare Workers | 100k req/day, 10ms CPU/req, 128MB RAM | No sleep (<50ms cold start) | 2026-05-13 |
| **Compute** | Cloudflare Pages Functions | Same as Workers (shares quota) | No sleep | 2026-05-13 |
| **Compute** | Vercel Hobby | 1M invocations/mo, 360 GB-hrs memory, **300s max function duration**, 100 GB bandwidth | No sleep (edge CDN; functions archive after 2 weeks but unarchive on invoke with ~1s extra cold start) | 2026-05-13 |
| **Compute** | Render Free | 750 hrs/month (≈1 service always-on), **sleeps after 15 min idle, ~60s cold start** | Yes — 15 min | 2026-05-13 |
| **Compute** | Koyeb | Joining Mistral AI — free tier status unclear 2026; 5 hr/month Postgres only | Unclear | 2026-05-13 |
| **Database** | Turso (libSQL) | **5 GB storage**, 500M row reads/mo, 10M row writes/mo, 100 DBs, 1-day point-in-time restore | No sleep | 2026-05-13 |
| **Database** | Cloudflare D1 | 5 GB storage, 5M reads/day, 100k writes/day — no extensions (no sqlite-vec) | No sleep | 2026-05-13 |
| **Database** | Supabase Free | 500 MB DB, 1 GB storage, **pauses after 7 days inactivity**, pgvector available | Yes — 7 days | 2026-05-13 |
| **Vector** | Turso native vector | `vector_top_k()` table function, up to 65,536 dims, cosine + L2, free tier included | No sleep | 2026-05-13 |
| **Vector** | Cloudflare Vectorize | 100 indexes, 10M vectors/index, 1536 dims max (768 fits), free tier unclear on query limit | No sleep | 2026-05-13 |
| **Object storage** | Cloudflare R2 | 10 GB free, 10M Class-A ops/month, S3-compatible | No sleep | 2026-05-13 |
| **Object storage** | Backblaze B2 | 10 GB free, 1 GB/day egress | No sleep | Current Brain |
| **Cron** | GitHub Actions | 2,000 min/month free (private repo) | N/A | 2026-05-13 |
| **Cron** | Vercel Cron (Hobby) | 2 cron jobs/day — too few for daily batch + retries | N/A | 2026-05-13 |
| **Cron** | Cloudflare Cron Triggers | Unlimited on free Workers plan | N/A | 2026-05-13 |

---

## Five architecture shapes

### Shape A — Cloudflare-native (Workers + Turso + Vectorize + R2)

```
APK / Extension / Browser
         │
  *.workers.dev (or custom domain via Cloudflare)
         │
  Cloudflare Worker (Hono or itty-router)
  ├── @libsql/client HTTP → Turso (free 5GB)
  ├── Vectorize API → vector search (OR Turso native vector)
  ├── R2 → PDF/attachment storage
  └── Cloudflare Cron Triggers → nightly batch job
         │
  Anthropic API / Gemini API (user keys via Worker Secrets)
```

**Migration lift:** Highest. Next.js App Router on Cloudflare Workers requires `@cloudflare/next-on-pages` adapter — it supports dynamic routes and server components but has known gaps with native Node.js modules and stream APIs (as of 2026, App Router SSE works via the Web Streams API, not Node.js `res.write` patterns). All `better-sqlite3` calls → `@libsql/client` async. All `sqlite-vec` queries → Turso native vector syntax or Vectorize API. `node-cron` → Cloudflare Cron Triggers. Estimated effort: 3–4 weeks AI-paired.

**Free-tier headroom for Brain (30 captures/month):**
- Workers: 30 captures × ~5 requests each = 150 req/day vs 100k/day limit → **0.15% used**
- Turso: ~100 writes/month vs 10M/month limit → **0.001% used**
- Vectorize: ~900 vector inserts/month (30 captures × 30 chunks) vs 10M/index → **0.009% used**

**UX impact:**
- Cold start: <50ms (Workers never sleep) — excellent
- Ask streaming: Workers SSE works with no hard duration limit as long as client is connected — excellent
- CPU limit: 10ms CPU per request is the sharp edge. An Ask request that does vector retrieval + prompt assembly + streaming back Anthropic tokens may exceed 10ms CPU. Mitigation: Durable Objects (free tier: 100k requests/day) for long-lived streaming, but this adds complexity. **This is the dealbreaker risk for Shape A.**

**Pros:** No cold starts. Cloudflare global edge. No domain needed (workers.dev works).
**Cons:** 10ms CPU/req limit is a real ceiling for Ask streaming. `next-on-pages` adapter adds deployment complexity. Highest rewrite effort. Cloudflare Vectorize free query limits unverified — potential surprise.

---

### Shape B — Vercel Hobby + Turso (recommended)

```
APK / Extension / Browser
         │
  *.vercel.app (or brain.arunp.in via Vercel DNS — no tunnel needed)
         │
  Next.js on Vercel Hobby (serverless functions)
  ├── @libsql/client HTTP → Turso (free 5GB)
  ├── Turso native vector_top_k() → vector search
  └── Vercel Env Vars → Anthropic + Gemini keys
         │
  GitHub Actions (cron: daily 3 AM UTC) → POST /api/enrich/batch trigger
  Anthropic Batch API ← enrichment
  Gemini API ← embeddings at capture
```

**Migration lift:** Medium. Next.js runs natively on Vercel — no adapter. Rewrites needed:
1. `better-sqlite3` → `@libsql/client` (all async) — ~2 days
2. `sqlite-vec` queries → Turso native vector syntax — ~1 day
3. Remove `node-cron` from in-process; replace with GitHub Actions HTTP trigger — ~0.5 day
4. Remove cloudflared tunnel; update APK + extension to point to `*.vercel.app` URL — ~0.5 day
5. SSE Ask endpoint: Vercel max duration is 300 seconds — sufficient for Anthropic streaming (typical Ask = 3–15s). No rewrite needed, just verify. ~0 days
Estimated effort: 1–2 weeks AI-paired.

**Free-tier headroom for Brain:**
- Vercel invocations: ~300/month (30 captures × 5 req + 30 Ask queries × 5 req) vs 1M/month → **0.03% used**
- Vercel bandwidth: < 50 MB/month vs 100 GB limit → **0.05% used**
- Turso storage: Brain DB is ~180 KB today; even at 10× growth for 5 years = ~2 MB vs 5 GB limit → **0.04% used**
- Turso row reads: ~10k/month (Ask retrieval + library list) vs 500M/month → **0.002% used**
- GitHub Actions: nightly cron = 1 min/day × 30 days = 30 min/month vs 2k/month → **1.5% used**

**All free-tier limits are at <1% Brain projected volume. Headroom is effectively unlimited at this usage level.**

**UX impact:**
- Cold start: Vercel functions are archived after 2 weeks of no invocations, adding ~1s on the very first request after a dormant period. After that, warm. For a single-user tool checked daily, this is almost never hit.
- Ask streaming: 300s max duration is 20× the expected Ask duration (3–15s) — not a practical limit.
- Capture: same as today. POST → Next.js function → Turso write → Gemini embed → 200 OK. No meaningfully different latency.
- Domain: Vercel Hobby supports custom domains. Can keep `brain.arunp.in` by pointing DNS to Vercel (no tunnel required — saves $0 since domain is already paid). Or use `brain.vercel.app` for free.

**Pros:** Lowest migration effort of viable shapes. Next.js native (no adapter). Vercel's 300s timeout fits Ask. Free ToS allows personal use. All limits 100×+ above Brain's volume.
**Cons:** Vercel Hobby is personal-use only (no commercial). If Brain ever monetizes, must upgrade. No persistent filesystem — Turso is the only DB option. `better-sqlite3` → `@libsql/client` rewrite is the main risk: it touches every DB call in the codebase.

---

### Shape C — Cloudflare Pages + Turso

Structurally identical to Shape A but using Pages instead of Workers for compute. Pages Functions share the same CPU limits as Workers (10ms CPU/req) and the same 100k requests/day free limit. The only meaningful difference is that Pages has a friendlier Next.js deployment story (`@cloudflare/next-on-pages` is the officially supported path) vs raw Workers.

**Verdict:** Same CPU ceiling risk as Shape A. Same rewrite effort. No meaningful advantage over Shape B. **Skip — Shape B dominates this shape on every axis.**

---

### Shape D — Render Free + Turso (cold-start honest)

```
APK / Extension / Browser
         │
  brain.onrender.com (or custom domain)
         │
  Next.js on Render Free Web Service (sleeps after 15 min idle)
  ├── @libsql/client HTTP → Turso
  └── Turso native vector search
```

**The cold-start problem:** Render Free sleeps after 15 minutes of no traffic. Cold start is ~60 seconds (confirmed 2026-05-13). Capture UX: user shares URL from APK → Render wakes → 60s loading screen → save completes. This is a broken UX for a capture tool. There is no workaround that doesn't violate Render's ToS or burn the 750 free hours:
- UptimeRobot pings every 14 min: keeps the service warm but consumes the 750 hrs/month equivalent, leaving no headroom for actual use.
- Paid Render ($7/month) removes sleep — but then it's not free and costs more than Hetzner.

**Verdict: disqualified for Brain's use case.** 750 hrs/month = 31.25 days exactly — one service can be "always on" on paper, but the sleep policy defeats the purpose unless you use the ping workaround, which violates the spirit of the free tier.

---

### Shape E — Other options (dismissed)

| Option | Why dismissed |
|---|---|
| **GitHub Codespaces** | Not a hosting platform. 60 free hrs/month. Designed for dev, not serving |
| **Railway** | Shut free tier in 2023. Paid only |
| **PlanetScale** | Shut free tier in 2024. Postgres-incompatible anyway |
| **Supabase Free** | Pauses after 7 days inactivity. Kills Brain for a user who travels. pgvector works but pause policy is fatal |
| **Neon Free** | 0.5 GB Postgres, scales to zero. pgvector available. Would require full Postgres migration (schema + queries). Overkill rewrite for marginal benefit |
| **Oracle Always Free** | Mumbai location is ideal but instance reaping risk (confirmed: <20% CPU/RAM/network for 7 days = reclaim). Brain at idle always triggers this |
| **Fly.io** | Networked block storage breaks SQLite WAL (confirmed in S-6). Limited free tier in 2026 |

---

## Comparison matrix

| Shape | Migration effort | Free headroom | UX score | Future portability |
|---|---|---|---|---|
| **A — Cloudflare Workers + Turso** | 3–4 wks AI-paired | >100× margin | B (10ms CPU risk on Ask) | High (Workers standard) |
| **B — Vercel Hobby + Turso** | 1–2 wks AI-paired | >100× margin | A- (300s timeout, ~1s cold start after dormancy) | High (standard Next.js) |
| **C — CF Pages + Turso** | 3–4 wks AI-paired | >100× margin | B (same CPU risk as A) | High | 
| **D — Render Free + Turso** | 1–2 wks AI-paired | Adequate | D (60s cold start kills capture UX) | High |
| **E — Various** | N/A | N/A | F (all disqualified) | N/A |

---

## Vector search compatibility

Brain uses `sqlite-vec` with `vec_distance_cosine()` on a `chunks_vec float[768]` virtual table. Turso's libSQL native vector is a near-drop-in replacement:

| Aspect | Current (sqlite-vec) | Turso native vector |
|---|---|---|
| Column type | `float[768]` in virtual table | `F32_BLOB(768)` in regular column |
| Insert | `vec_f32(blob)` helper | `vector32('[...]')` or raw float array |
| Top-K ANN query | manual ORDER BY + LIMIT | `vector_top_k('idx_name', vector32('[...]'), k)` table-valued function |
| Distance function | `vec_distance_cosine(a, b)` | `vector_distance_cos(a, b)` |
| Index | Implicit in vec0 virtual table | `CREATE INDEX ON table(libsql_vector_idx(col))` |
| Dimensions | Up to 65,536 | Up to 65,536 |
| 768-dim Gemini compat | Yes | Yes — confirmed |

The migration is a syntax refactor, not a semantic change. The underlying math (cosine distance, float32 precision) is identical. Existing 768-dim Gemini embeddings in the DB require a one-time data migration: export vectors, re-insert into the new schema. For Brain's current ~180 KB DB, this is a script that runs in seconds.

---

## SSE streaming compatibility

| Platform | SSE support | Duration limit | Notes |
|---|---|---|---|
| **Hetzner + Next.js** (current) | Full | Unlimited | `res.write()` persistent connection |
| **Vercel Hobby** | Full (Web Streams API) | **300 seconds max** | 300s = 20× typical Ask duration (15s). Practical for Brain. Anthropic streaming closes naturally well before limit |
| **Cloudflare Workers** | Full (Web Streams API) | No hard duration limit while client connected | BUT: 10ms CPU/req is the ceiling. CPU is paused during `await fetch()` calls, so streaming Anthropic chunks back doesn't count against CPU. In practice, Workers SSE may work — but it requires testing |
| **Render Free** | Full | Unlimited during wake period | Moot — cold start makes it unusable |

**Vercel's 300s is not a practical constraint for Brain.** Anthropic's Claude Sonnet streaming responses close naturally in 3–30s. The only scenario that hits 300s is a pathologically long Ask query, which is a bug anyway.

---

## Recommended architecture (if going free)

**Shape B: Vercel Hobby + Turso**

**Why this beats the others:**
- Lowest rewrite effort (Next.js runs natively; no adapter)
- 300s function timeout covers SSE Ask with massive margin
- Turso free tier (5 GB, 500M reads/month) covers Brain at 1000× projected growth
- No cold-start problem in practice for a daily-use personal tool
- GitHub Actions cron replaces node-cron with zero cognitive overhead
- Vercel's free personal-use ToS is unambiguous for a single-user personal tool

**Load-bearing decisions:**
1. Replace `better-sqlite3` with `@libsql/client` — every DB module in `src/db/` becomes async. This is the largest change.
2. Replace `sqlite-vec` queries in `src/lib/ask/` and `src/lib/embed/` with Turso `vector_top_k()` syntax. Run a one-time migration script to re-insert existing vectors into the new schema.
3. Remove `node-cron` from `src/db/client.ts`. Add a GitHub Actions workflow: `schedule: cron: '0 3 * * *'` → `curl -X POST $BRAIN_URL/api/enrich/batch -H "Authorization: Bearer $TOKEN"`.
4. Remove cloudflared tunnel. Update `NEXT_PUBLIC_BASE_URL` in APK and extension to the Vercel deployment URL. Keep `brain.arunp.in` pointed at Vercel via a CNAME (no tunnel needed on Vercel — it's already public).
5. Move `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `BRAIN_BEARER_TOKEN`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` to Vercel Environment Variables.

**2-week migration outline (AI-paired):**
- Week 1: DB layer. Replace all `better-sqlite3` calls with `@libsql/client`. Create Turso DB. Run migration scripts. Verify CRUD and vector search locally against Turso.
- Week 2: Deployment. Deploy to Vercel. Update APK + extension URLs. Wire GitHub Actions cron. Smoke-test capture → Ask → enrich flow end-to-end.

**Risks:**
- `better-sqlite3` → `@libsql/client` is not mechanical — async propagates upward through every function that touches the DB. Estimated 40+ call sites.
- Turso free tier TOS could change. Turso is a VC-backed startup (raised Series A 2024). If it shuts or raises prices, migration is back to a paid DB or re-hosting SQLite on a paid VM. Mitigation: keep a periodic `turso db dump` → B2 backup (same GitHub Actions workflow).
- Vercel Hobby ToS says personal, non-commercial use. If Brain ever becomes a shared or commercial product, must upgrade to Pro ($20/month) or migrate.

---

## When to actually do this

**DON'T do it if:**
- You plan to run Brain for fewer than 3 years — the $3.60/month Hetzner CAX11 costs less than the ~80-hour migration over any period under ~3 years.
- You want the quickest path to a working v0.6.0 — do the Hetzner migration first (already planned, 2-hour lift), then consider free-tier as v1.0.0+ optimization.
- You're not willing to lose `better-sqlite3` — the synchronous, in-process DB is the single biggest DX advantage of the current stack. Giving it up has ongoing cost (async debugging, network errors to handle).

**DO it if:**
- You commit to Brain for 4+ years — at 4 years, free-tier saves $173 vs Hetzner CAX11 (before subtracting migration cost; roughly break-even at ~3.5 years).
- It becomes a portfolio piece — "runs on free tier with self-provided AI keys" is a meaningful technical demo.
- You want to remove the last recurring bill — even $3.60/month is a monthly mental overhead. Zero is zero.
- Turso + libSQL async is something you want to learn — it's a transferable skill for any serverless + SQLite stack.

---

## Cost reconciliation

| Path | Year-1 | Year-3 | Year-5 | Est. migration effort | UX |
|---|---|---|---|---|---|
| Hetzner CAX11 IPv6-only (current target) | ~$43 | ~$130 | ~$216 | 0 (already planned) | A |
| Free-tier Shape B (Vercel + Turso) | ~$0* | ~$0* | ~$0* | ~80 hrs AI-paired | A- |
| Render Free + Turso | ~$0* | ~$0* | ~$0* | ~60 hrs AI-paired | D (cold start) |
| Oracle Always Free (bonus experiment) | ~$0* | ~$0* | ~$0* | ~40 hrs | A (if it survives) |

*"$0" = hosting only. AI API costs (~$0.26/month at 30 captures/month) apply to all paths. Domain ($10/year) is optional but already owned.

**Hidden cost that makes "free" less free:** 80 hours of AI-paired development at any reasonable opportunity-cost rate exceeds the 5-year Hetzner savings (~$216). The math only favors free-tier if you count the learning and portfolio value, or if you plan to run Brain indefinitely.

---

## Open questions

1. **Turso free tier longevity:** Turso is VC-backed. What is the plan-B if Turso shuts the free tier in 2027–2028? (Answer: rclone DB dump → re-host on Hetzner or another libSQL-compatible service. The `@libsql/client` SDK works against any libSQL server, including a self-hosted one.)

2. **Cloudflare Workers CPU limit in practice:** Does Brain's Ask endpoint (vector retrieval + prompt construction + streaming Anthropic chunks) stay under 10ms CPU? This needs an empirical test before committing to Shape A. Not tested as of this writing.

3. **`@cloudflare/next-on-pages` maturity:** Does it support all of Brain's dynamic routes and App Router patterns without gaps in 2026? Worth a spike if Shape A is reconsidered.

4. **Turso vector migration script:** Is there a tooled path to export `chunks_vec` float data from sqlite-vec format and re-insert as Turso `F32_BLOB(768)` columns, or does it require a custom script?

5. **Vercel Hobby function archiving at 2 weeks:** For a daily-use tool this is rarely hit. But if Brain is untouched for 3 weeks (vacation), the first capture on return pays a ~1s cold-start penalty. Acceptable?

---

## Final recommendation for the user

Stay on Hetzner CAX11 ($3.60/month) for v0.6.0 — the planned migration is already low-lift and the free-tier rewrite does not break even for ~3.5 years. If you're still running Brain in 2029 and want to eliminate the last hosting bill, Shape B (Vercel Hobby + Turso) is the cleanest migration path: 1–2 weeks AI-paired, all current UX preserved, free-forever with >100× headroom on every limit. Don't attempt this until v0.6.0 is stable and you have 6+ months of production data confirming Brain is worth the investment.
