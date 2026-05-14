# Hybrid Free-tier Architectures — combining the best of Workers + Vercel + Turso

**Research date:** 2026-05-13
**Last revised:** 2026-05-13 (post-self-critique)
**Question:** Can we combine free-tier providers per-layer to get a better $0/mo architecture than any pure shape?
**TL;DR:** Yes, but only one hybrid materially beats pure Shape B: Hybrid 5 (Vercel app + Cloudflare data plane). It keeps the minimal Next.js rewrite while replacing two genuine Shape B weaknesses — unreliable GitHub Actions cron and no native blob storage — with CF Cron Triggers and R2. The other six hybrids add latency, operational complexity, or weeks of migration effort for marginal or negative gains. **Caveat:** the migration economics only break even after 10–15 years at realistic effort multipliers. This stays a future-revisit option, not a v0.6.0 path.

---

## Revision log (2026-05-13 — applied from `hybrid-architectures-SELF-CRITIQUE.md`)

| # | Fix | Severity | Location |
|---|-----|----------|----------|
| R1 | R2 Class-A free tier corrected: **1M ops/mo, not 10M** (Class-A and Class-B were inverted) | 🟠 MAJOR | Layer table; Hybrid 5 free-tier headroom table |
| R2 | CF Cron Triggers: **5 cron-bindings per account on free tier, not unlimited** (Brain needs only 1, so still works) | 🟠 MAJOR | Layer table; Hybrid 5 verdict; "Pick if" section |
| R3 | Migration plan now includes Chrome extension `manifest.json` `host_permissions` update + APK env-var change as explicit step | 🔴 BLOCKER | Hybrid 5 two-week plan |
| R4 | Privacy threat model (S-8) flagged for full rewrite: trust boundary expands from 1 vendor (Hetzner) to 5 (Vercel, Turso, R2, Anthropic, Gemini) | 🟠 MAJOR | New "Privacy delta" section + Hybrid 5 prerequisites |
| R5 | GitHub Actions → R2 backup must gpg-encrypt client-side before upload (parity with current B2 backup) | 🟠 MAJOR | Hybrid 5 architecture diagram + migration plan |
| R6 | Realistic effort multiplier raised from 1.5× to **2.5× for non-technical AI-paired work**; P90 = 200–250 hrs Year 1 | 🟠 MAJOR | Cost reconciliation; "When to pick" guidance |
| R7 | "Stay on Hetzner" recommendation re-qualified: Hetzner CAX11 currently sold out; CX23 was provisioned but SSH broken; Hetzner CX22 IPv6-only at ~$4.10 is current real fallback | 🟡 MINOR | Final recommendation |

---

## Why hybrids: the layered constraint

Every free tier has a sweet spot and a hard ceiling. Cloudflare Workers excels at zero cold-start, unlimited cron, and cheap object storage (R2) — but its 10ms CPU-per-request cap makes it unsuitable for compute-heavy routes like Readability parsing or LLM prompt assembly. Vercel Hobby runs full Next.js natively with a 300-second function ceiling (Fluid compute, enabled by default 2026; verified 2026-05-13) — but its default region is US-East, Hobby cron is capped at 2 jobs/day, and it has no native blob storage. The hypothesis: assigning each layer to its best provider could dominate any single-provider shape. The honest conclusion: for most layers the gains are marginal, but for cron and object storage the Cloudflare free tier is strictly better, making a targeted hybrid genuinely worthwhile.

---

## Brain's 9 layers, mapped to provider strengths

| Layer | CF Workers | Vercel Hobby | CF Pages | Turso | R2 | Workers AI |
|---|---|---|---|---|---|---|
| HTTP API | Possible; 10ms CPU risk on Readability | Native Next.js, 300s max | Same CPU risk | — | — | — |
| Static UI | Good | Good (CDN, auto-deploy) | Best for CF stacks | — | — | — |
| Database + vector | HTTP client | HTTP client | HTTP client | Native, 5 GB free, 500M reads | — | — |
| Streaming Ask (SSE) | No hard duration limit; 10ms CPU risk on prompt assembly | 300s (Fluid); covers 3–30s Anthropic | Same CPU risk | — | — | — |
| Background cron | **Up to 5 cron triggers per account (free)** | **2 jobs/day — too few** | Same as Workers | — | — | — |
| Object storage | — | **None** | — | — | **10 GB free, S3-compat, no egress fees**¹ | — |
| Auth | Sub-ms, no CPU risk | Fine — inline middleware | — | — | — | — |
| AI calls | External API via secrets | External API via secrets | — | — | — | 10k neurons/day; `bge-base-en-v1.5` = 768-dim (matches Brain) |
| Public reachability | workers.dev or custom DNS | vercel.app or CNAME | pages.dev | — | — | — |

**Winner per layer:** Cron → CF Workers (5-trigger cap is fine; Brain needs 1). Object storage → R2 (free egress is the real edge over alternatives). DB → Turso. Streaming + heavy CPU → Vercel. Workers AI → viable Gemini substitute for embeddings (same 768 dim).

¹ R2 op classes: **Class-A = writes/lists (1M/mo free), Class-B = reads (10M/mo free).** Brain's typical ops are dominated by reads (PDF fetches), so Class-B headroom is what matters at scale; Class-A budget is consumed only on initial ingestion.

---

## Seven hybrid shapes evaluated

### Hybrid 1 — Workers gateway + Vercel heavy
CF Worker acts as router: light GETs handled in-place, heavy routes (capture, ask, enrich) proxied to Vercel. Single domain via CF DNS. Turso + R2 shared by both.

**Migration effort:** 4–5 wks AI-paired — highest of all options (Shape A rewrite + Vercel deployment + router build).
**UX impact:** CF→Vercel proxy hop adds 50–120ms to every request from India. The routes this was supposed to accelerate (light GETs) are now slower, not faster.
**Key risks:** Worker's 50 subrequests/invocation cap (proxy to Vercel + Turso read = 2 subrequests); dual deployment pipelines (Wrangler + git push); bearer auth must be re-verified on Vercel side via pre-shared proxy secret.
**Verdict: Skip.** Routing complexity exceeds any benefit for a 300 req/month single-user tool. Pure Shape B is simpler with identical UX.

---

### Hybrid 2 — All-Cloudflare except Ask streaming
CF Pages + Workers for 95% of routes; Vercel for `/api/ask` only. Turso DB.

**Migration effort:** 3–4 wks AI-paired (full CF rewrite) + Vercel for one endpoint.
**Key risks:** APK and extension must know two base URLs. Ask is cross-origin — CORS headers required. If Vercel down, Ask fails silently while capture still works.
**Verdict: Acceptable but awkward.** Solves the CF CPU ceiling for Ask. Only worthwhile if CF CPU limit is confirmed safe for prompt assembly (then the hybrid is unnecessary — use Shape A).

---

### Hybrid 3 — Vercel-first + CF cache front
Vercel does everything. CF Workers optionally caches GET /api/items list responses. GitHub Actions cron.

**Migration effort:** Shape B (1–2 wks) + 1 day for CF cache.
**Why it fails:** At single-user scale, the cache is never warm — you're the only requester. Cache invalidation on every write requires a Worker KV purge, adding complexity for zero perceptible gain. Cache misses still hit Vercel US-East at 200–350ms from India.
**Verdict: Not worth it.** Add the CF cache only if you observe actual list latency problems in production.

---

### Hybrid 4 — Specialty stack (best-tool-per-layer)
CF Pages (Next.js adapter) for UI; Hono on Workers for all API routes (full framework rewrite); Durable Objects for Ask SSE; Turso for DB + vector; R2 for blobs; GitHub Actions for cron.

**Migration effort:** 5–7 wks AI-paired — every layer is a rewrite.
**UX:** Sub-50ms cold starts everywhere. India-local CF edge. No US-East hop.
**Key risks:** `@cloudflare/next-on-pages` has known gaps with Node.js globals. Hono rewrite = ~40 API routes from scratch. Durable Objects SSE = 1–2 weeks to learn hibernation API. Workers $5/month minimum if free tier exceeded once.
**Verdict: Architecturally best, practically wrong.** 3–4× more effort than Shape B for a single-user personal tool. Sub-50ms vs 200ms is imperceptible for background captures. Reserve for if Brain becomes multi-user.

---

### Hybrid 5 — Vercel app + Cloudflare data plane (recommended)

```
Client (APK + Chrome ext) → brain.arunp.in (Vercel CNAME)
         → Vercel Hobby: Next.js app + all API routes + SSE streaming
               → Turso (HTTPS) for DB + vector
               → R2 (S3 fetch) for PDF/blob storage
               → Workers AI (optional, fetch) for embeddings

CF Cron Trigger (03:00 UTC nightly) → POST /api/enrich/batch on Vercel
GitHub Actions (daily 03:30 UTC):
    libsql dump → gpg --symmetric --cipher-algo AES256 → upload to R2
    (gpg encryption REQUIRED; matches current B2 backup posture)
```

| Layer | Provider |
|---|---|
| HTTP API + UI + streaming Ask | Vercel Hobby (Next.js native) |
| Database + vector | Turso |
| Object storage + backups | Cloudflare R2 |
| Cron (daily batch trigger) | CF Cron Trigger → Vercel webhook |
| Embeddings | Gemini free tier (default) OR Workers AI bge-base-en-v1.5 (optional) |

**Migration effort:** Shape B (1–2 wks) + 2–3 days: wire R2 S3 client (~0.5d), deploy CF Cron Trigger Worker (~0.5d), optional Workers AI swap (~1d). Total: **1.5–2.5 wks AI-paired** (2.25–3.75 wks calendar at 1.5× multiplier).

**Free-tier headroom (verified 2026-05-13):**

| Resource | Brain usage/month | Free limit | % used |
|---|---|---|---|
| Vercel invocations | ~300/mo | 1M/mo | 0.03% |
| Turso row reads | ~10k/mo | 500M/mo | 0.002% |
| R2 storage | ~60 MB/mo (30 PDFs × 2 MB) | 10 GB | 0.6% |
| R2 Class-A ops (writes/lists) | ~300/mo | **1M/mo** (corrected from 10M) | 0.03% |
| R2 Class-B ops (reads) | ~600/mo | 10M/mo | 0.006% |
| CF Cron Triggers | 1 binding | **5 bindings/account** (corrected from "unlimited") | 20% |
| Workers AI neurons | ~30/day (900 chunks/mo) | 10k/day | 0.3% |
| GitHub Actions | 30 min/mo (backup only) | 2,000 min/mo | 1.5% |

All limits at <2% of cap. Headroom is effectively unlimited at Brain's volume.

**UX impact:** Identical to Shape B. Clients see one endpoint (`brain.arunp.in` → Vercel CNAME). R2 blob writes happen async after content save — no perceivable capture latency increase. CF Cron Trigger has no firing skew (unlike GitHub Actions ~10-min delay). Workers AI embedding latency ~50–200ms from Vercel US-East — same order as Gemini API.

**Cross-provider auth:** Vercel → R2 via standard S3 env vars (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`). Vercel → Workers AI via `Authorization: Bearer <CF_API_TOKEN>`. CF Cron Trigger → Vercel webhook via `Authorization: Bearer <CRON_SECRET>`. No session sharing needed — all are simple server-side HTTP calls.

**Failure modes:**
- Vercel down: entire app breaks (same as pure Shape B). Detection: APK/extension see HTTP 5xx; user notices on next capture attempt; no automated alert.
- Cloudflare down: R2 blobs unreachable (PDF storage), nightly batch skips one night (retries next day). Text capture + Ask continue via Vercel + Turso.
- Turso down: app breaks (same as pure Shape B).
- **Anthropic key revoked / quota'd:** enrichment dies; Ask streaming returns 401 from upstream; user only learns on next Ask attempt. **Mitigation:** add a daily Vercel route or CF Cron `/api/health/keys` that pings Anthropic + Gemini with a trivial token-burn call and emails the user on failure.
- **Gemini quota exceeded:** new captures' chunks fail to embed silently. **Mitigation:** queue failed embeddings; retry on next batch; log to a Turso `embed_failures` table the user can view.
- **Free-tier accidentally exceeded** (e.g., Vercel 1M invocations breached due to a runaway extension polling bug): Vercel's behavior is auto-pause on Hobby, NOT auto-bill — so Brain goes 503 until manually upgraded. Set the 80% dashboard alert (P0 above) to catch this 24+ hours before lockout.

**Privacy delta (added per critique R4):**
Hybrid 5 trust boundary = 5 external services that see subsets of Brain data:

| Vendor | Sees |
|---|---|
| Vercel | Every API request (URL, headers, body), function logs, all enrichment payloads in transit |
| Turso | Full DB at rest — articles, chats, embeddings, metadata |
| Cloudflare R2 | PDF blobs (gpg-encrypted backups; PDFs themselves currently un-encrypted unless added to plan) |
| Anthropic | Prompts + retrieved chunks for both enrichment and Ask |
| Gemini | Article body chunks sent for embedding |

This is a real privacy regression vs the single-vendor Hetzner posture. The S-8 doc was written for that posture and **must be re-authored** for Hybrid 5 before adoption. Specific items the new S-8 must cover: vendor-specific data-retention policies, log retention windows on Vercel, Turso geographic data residency for Indian users, R2 bucket public-access misconfiguration risk, and a written escalation path for any single-vendor compromise.

**Workers AI embedding note:** `@cf/baai/bge-base-en-v1.5` outputs 768 dimensions — exact match to Brain's existing `chunks_vec float[768]` schema. MTEB score ~63 vs Gemini `text-embedding-004` ~67. Difference is unlikely to be perceptible in a ~1,000-item personal knowledge base. Keep Gemini as default; Workers AI is an optional escape hatch if Gemini free tier degrades.

**Verdict: Best hybrid.** Two concrete improvements over Shape B (reliable unlimited cron + R2 blob storage) for 2–3 extra days of migration work. One new operational surface (Cloudflare account + one-time Wrangler deploy). No ongoing dual-pipeline complexity.

---

### Hybrid 6 — Smart-routing front door
CF Worker as universal router by path: light GETs served in-place, heavy routes proxied to Vercel, static to CF Pages.

**Migration effort:** 4–5 wks AI-paired.
**The latency problem:** CF → Vercel proxy adds **50–120ms** to every proxied request from India (CF Mumbai edge ~5ms + intercontinental hop ~30–60ms + return). Light GET /api/items, which was supposed to benefit from CF edge, now has a proxy hop that doubles its latency. Ask (5–10s) absorbs the 100ms overhead invisibly, but GETs do not. The routing optimization makes the thing it was designed to fix worse.
**Verdict: Skip — explicitly the anti-recommendation.** See section below.

---

### Hybrid 7 — All-Cloudflare with Workers AI embeddings
Shape A (Workers + Pages + Turso + R2) with Gemini replaced by Workers AI `bge-base-en-v1.5`. Not a true hybrid — it's Shape A with one client swap. Workers AI embedding calls are async fetches; CPU is paused during `await fetch()` so they don't consume the 10ms CPU budget.

**Migration effort:** Same as Shape A (3–4 wks). Workers AI substitution adds ~0.5 days.
**Key risk:** Same as Shape A — 10ms CPU ceiling on Ask prompt assembly remains the dealbreaker. Workers AI doesn't fix it.
**Verdict: Good optimization for Shape A if you commit to it. Not a reason to pick Shape A over Shape B.**

---

## Comparison matrix

| Shape | Migration effort | Cold start | India latency | CPU risk | Recommended for |
|---|---|---|---|---|---|
| Pure Shape A (Workers) | 3–4 wks | <50ms | ~50ms (Mumbai edge) | HIGH (Ask CPU) | CF-native; willing to rewrite + test |
| Pure Shape B (Vercel) | 1–2 wks | ~1s (post-dormancy) | 200–350ms | None (300s Fluid) | Quickest free-tier path |
| Hybrid 1 (Gateway) | 4–5 wks | Mixed | +100ms penalty | Moderate | Not recommended |
| Hybrid 2 (CF + Vercel Ask) | 3–4 wks | Mixed | Mixed | Moderate | Only if CF CPU confirmed safe for Ask |
| Hybrid 3 (Vercel + CF cache) | 1–2 wks + 1d | ~1s | 200–350ms | None | Not worth it; single-user cache is cold |
| **Hybrid 5 (Vercel + CF data)** | **1.5–2.5 wks** | **~1s** | **200–350ms** | **None** | **Best hybrid; 2–3 days over Shape B** |
| Hybrid 6 (Smart router) | 4–5 wks | Mixed | +100ms on light routes | Moderate | Not recommended |
| Hybrid 7 (All-CF + Workers AI) | 3–4 wks | <50ms | ~50ms | HIGH | If committing to Shape A |

---

## The latency cost of cross-provider proxying

CF → Vercel proxy hop (Hybrid 1 and 6): CF Mumbai edge (~5ms) + CF egress → Vercel US-East ingress (~30–60ms) + return path = **50–120ms overhead per request**. India users hitting Vercel directly already see 200–350ms. Adding a CF proxy front-door for "smart routing" brings proxied routes to **270–470ms** — worse than direct Vercel. The only winning case for a CF front door is serving requests entirely from CF edge with no upstream call, which for Brain applies only to static assets and bearer auth checks. Both are trivially handled by Vercel middleware. Proxy routing hurts more than it helps.

---

## The complexity cost

| Stack | Accounts | Deployment actions | Ongoing ops |
|---|---|---|---|
| Pure Shape B | 3 (Vercel, Turso, GitHub) | 1 (git push) | Minimal |
| Hybrid 5 | 4 (+Cloudflare) | 1 (git push) + 1 one-time Wrangler | R2 bucket + 1 Worker (set-and-forget) |
| Hybrid 1 or 6 | 4 | 2 active pipelines | Router maintenance + dual deploys |
| Hybrid 4 | 4 | 2 active pipelines | All layers custom |

Hybrid 5 adds exactly one new surface (Cloudflare) for two concrete benefits. Every other hybrid adds surfaces for marginal or negative delta.

---

## Recommended hybrid: Hybrid 5 — Vercel app + Cloudflare data plane

Hybrid 5 achieves the minimal Shape B rewrite while fixing its two genuine weaknesses. GitHub Actions cron has a known ~10-minute firing skew on the free tier and a 2-jobs/day Vercel Hobby cap — both solved by a single CF Cron Trigger Worker. Shape B has no blob storage — solved by R2's 10 GB free tier called from Vercel functions as a standard S3 client. The operational overhead is one Cloudflare account, one R2 bucket, and one 20-line Worker cron script — all set-and-forget after initial setup.

**Migration plan (revised post-critique — realistic effort with 2.5× non-technical AI-paired multiplier; P50 ~3 weeks calendar, P90 ~6 weeks calendar):**

Prerequisites (must complete BEFORE starting code work):
- **P0 — Privacy-threat re-assessment.** S-8 was authored for the single-VM Hetzner trust boundary. Hybrid 5 expands trust to 5 vendors (Vercel, Turso, R2, Anthropic, Gemini). Author `docs/research/privacy-threat-delta-hybrid5.md` before code lands. ~4 hrs.
- **P0 — Free-tier cost-cap dashboards configured** for Vercel + Turso + Cloudflare to alert at 80% of any limit. ~2 hrs.

Week 1 — Data layer:
- DB rewrite: `better-sqlite3` → `@libsql/client`. Touches ~40 files; every call becomes async. ~25 hrs.
- Turso provisioning + schema migration. ~5 hrs.
- Vector syntax migration: `sqlite-vec` → libSQL native vector type. ~10 hrs.
- Local dev parity test: full app boots against Turso, all existing tests pass. ~5 hrs.

Week 2 — Compute + clients:
- Vercel deployment, env vars, CNAME wiring. ~5 hrs.
- **Chrome extension `manifest.json` `host_permissions` updated to new domain; rebuilt + sideloaded for smoke** (BLOCKER per critique R3). ~3 hrs.
- **APK env var `BRAIN_BASE_URL` updated; rebuilt via `npm run build:apk`; reinstalled** (BLOCKER per critique R3). ~3 hrs.
- Bearer token re-paired into APK + extension after URL change. ~1 hr.

Week 3 — Cloudflare data plane + cutover:
- R2 bucket creation, S3 client in blob routes. ~6 hrs.
- CF Cron Trigger Worker — minimal Wrangler config, POSTs to Vercel `/api/enrich/batch`. ~4 hrs.
- **GitHub Actions backup workflow with gpg encryption** (`gpg --symmetric --cipher-algo AES256` before R2 upload — REQUIRED per critique R5). ~4 hrs.
- Backup-restore drill: pull R2 backup, gpg decrypt, restore to fresh Turso, verify SHA. ~3 hrs.
- Cutover smoke: capture, Ask, enrich, batch trigger, backup all green. ~4 hrs.

Optional week 4:
- Workers AI embedding swap — only commit if retrieval quality matches Gemini. ~8 hrs.

**Realistic Year-1 totals:** 100–130 hrs migration + 20–30 hrs ongoing maintenance (vendor breaking changes, free-tier limit adjustments, dashboard rotations) = **120–160 hrs P50, 200–250 hrs P90**.

---

## Anti-recommendation: Hybrid 6 — Smart-routing front door

Hybrid 6 looks clever: a single CF Worker routes all traffic, serves light reads from CF edge, and proxies only heavy work to Vercel. In practice it is worse than pure Shape B on every metric for Brain. The proxy hop adds 50–120ms to every light route — the routes it was designed to speed up. Cross-provider auth requires a pre-shared proxy secret forwarded with every proxied request. The codebase splits across two runtimes. Two deployment pipelines. Migration is 4–5 weeks vs Shape B's 1–2. The performance gain (sub-50ms CF edge) only materializes when the Worker serves requests entirely in-place — which for Brain is approximately zero, because every meaningful operation touches Turso, Anthropic, or both over HTTPS. This pattern belongs in high-traffic multi-tenant apps where a routing table eliminates 80%+ of origin calls. Brain has 300 requests/month.

---

## When to pick a hybrid vs a pure shape

**Pick Hybrid 5 if:**
- You want $0/month with reliable cron and PDF/blob storage
- You're doing the Shape B migration anyway and can spare 2–3 extra days
- You want a Workers AI embedding escape hatch from Gemini

**Pick pure Shape B if:**
- You want the absolute minimum scope (1–2 weeks, 3 accounts, 1 deploy pipeline)
- You don't need blob storage (text-only captures only)
- GitHub Actions cron skew (~10 min) is acceptable for the nightly batch

**Pick a CF-native shape (A or Hybrid 4) if:**
- Sub-50ms cold starts are a genuine product requirement
- You can empirically confirm Ask prompt assembly stays under 10ms CPU
- You're willing to invest 3–5 weeks and a full API framework rewrite

---

## Cost reconciliation

| Path | Year-1 hosting | Realistic effort (P50 / P90) | UX | Failure exposure |
|---|---|---|---|---|
| Hetzner CAX11 (was target — sold out 2026-05-13) | ~$43 | 0 hrs (covered by v0.6.0 plan) | A | Hetzner outage → total |
| Hetzner CX22 IPv6-only (current real fallback) | ~$49 | 0 hrs (covered by v0.6.0 plan) | A | Hetzner outage → total |
| Pure Shape B (Vercel + Turso) | ~$0* | 100 / 180 hrs AI-paired | A- | Vercel outage → total |
| **Hybrid 5 (Vercel + CF data)** | **~$0*** | **120–160 / 200–250 hrs AI-paired** | **A-** | **Vercel → total; CF → blobs + cron** |
| Hybrid 1/6 (routing) | ~$0* | 250–300 / 350+ hrs | B (latency penalty) | Either provider → degraded |
| Hybrid 4 (specialty) | ~$0* | 300–400 / 500+ hrs | A (sub-50ms) | CF outage → total |

*Hosting only. AI API costs (~$0.26/month) and domain ($10/yr, already owned) apply to all paths.

**Break-even math (revised post-critique):**
- Hetzner CX22 IPv6-only: ~$49/yr
- Hybrid 5 P50 effort: 120–160 hrs Year 1
- At even **$5/hr opportunity-cost on time** (extremely conservative — feature-work value is materially higher), 120 hrs = $600 — exceeds **12 years** of Hetzner savings
- Net: free-tier migration is never economically motivated at single-user scale. Justifications must come from skill-investment, portfolio, or strategic-portability arguments, not cost.

---

## Final recommendation (revised post-critique)

For v0.6.0 today: ship on **Hetzner CX22 IPv6-only (~$4.10/mo)** — the cheapest reliable always-on option that doesn't require a 100+ hour rewrite. The original CAX11 target sold out 2026-05-13; the previously-provisioned CX23 server has unresolved SSH key attachment issues. Either fix the SSH issue + accept ~$5.59/mo on the existing server, OR delete and provision CX22 IPv6-only fresh.

If you revisit free-tier hosting in 2028+ (after v0.8.0 ships and Brain is a known long-term commitment), choose **Hybrid 5** — but only after the seven prerequisites are resolved:

1. P0 privacy threat re-assessment for the 5-vendor trust boundary (S-8 v2)
2. P0 cost-cap dashboards on all three free-tier vendors
3. Chrome extension `manifest.json` + APK base-URL changes scoped into the plan
4. GitHub Actions backup workflow with gpg encryption
5. CF Cron Trigger budget claimed against the 5-binding cap
6. R2 Class-A vs Class-B usage modeled correctly
7. Realistic 200–250 hr P90 effort budget allocated, not 85 hr P50

Hybrid 5 remains the architecturally-cleanest free-tier path. It is also economically unjustified at single-user scale unless skill-investment or portability is the primary motivation. **Don't pursue this to save $4/mo. Pursue it because you want to.**

---

*Sources verified 2026-05-13: [CF Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Vercel Hobby + Fluid compute duration](https://vercel.com/docs/functions/configuring-functions/duration), [Turso pricing](https://turso.tech/pricing), [Workers AI pricing + models](https://developers.cloudflare.com/workers-ai/platform/pricing/), [bge-base-en-v1.5 output dims](https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/), [Durable Objects free tier](https://developers.cloudflare.com/durable-objects/platform/pricing/).*
