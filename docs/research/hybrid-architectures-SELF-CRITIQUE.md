# Hybrid Architectures — Self-critique

**Date:** 2026-05-13
**Critiquing:** `docs/research/hybrid-free-tier-architectures.md`
**Commit pinned:** `ec579ef66f7e680ebb4323b0109df5c44dc8feaf`
**Critic:** independent agent, adversarial mode
**Severity scale:** 🔴 BLOCKER (must fix before plan adoption) / 🟠 MAJOR (changes recommendation) / 🟡 MINOR (nuance worth noting) / 🟢 OK (verified-good)

---

## TL;DR

Two verified factual errors change the plan's arithmetic — R2 Class-A ops is 1M/month, not 10M, and CF Cron Triggers are capped at 5 per account, not unlimited — but neither is a show-stopper for Brain's actual usage (300 req/month is nowhere near 1M ops, and Brain only needs 1 cron job). The migration effort estimate of 85 AI-paired hours (derived from the "1.5–2.5 wks" language) is materially under-stated for a non-technical user, with a realistic P90 of 200–250 hours. The security/privacy regression from single-VM to five-vendor data spread is not acknowledged anywhere in the plan. The final recommendation ("stay on Hetzner") is probably still correct but for the wrong stated reason — the math ignores the user's Hetzner SSH failure and the user's explicit $5/month ceiling.

---

## Findings by category

### 1. Factual claims (live-verified)

- 🟢 **Vercel Hobby max duration = 300s (Fluid Compute):** Confirmed from `vercel.com/docs/functions/limitations` (last updated 2026-02-24). Default AND maximum for Hobby with Fluid compute is 300s. The plan's claim is correct. The legacy limit (pre-April 23, 2025) was 60s for Hobby; the plan correctly notes this.

- 🟢 **Vercel Hobby = 1M invocations/month:** Confirmed from `vercel.com/docs/limits`. Invocations included = 1 million. Correct.

- 🟢 **Turso free = 5 GB / 500M reads / 10M writes:** Confirmed from `turso.tech/pricing`. Correct. Connection limits not stated on the pricing page (separate risk, see §4).

- 🔴 **R2 free = 10M Class-A ops/month — WRONG.** Live-verified at `developers.cloudflare.com/r2/pricing/`: Class-A (writes) = **1 million/month** on the free tier. Class-B (reads) = 10 million/month. The plan has them inverted. The table in §Hybrid 5 headroom says "R2 Class-A ops ~300/mo | 10M/mo free | 0.003% used" — the 10M limit is wrong; correct is 1M. Brain's 300 writes/month is still well within 1M, so the headroom conclusion is unchanged, but the stated limit is wrong and must be corrected. Any reader who cites this plan will propagate the error.

- 🔴 **CF Cron Triggers = "unlimited free" — WRONG.** Live-verified at `developers.cloudflare.com/workers/platform/limits/`: Cron Triggers are limited to **5 per account** on the free tier (250 on paid). The plan states "Unlimited (free)" in the layer table and again in the Hybrid 5 headroom table. For Brain this is fine (1 cron needed), but the claim is factually wrong. Brain could hit the 5-account-wide cap if other Workers projects are added. The plan's stated justification for preferring CF Cron over GitHub Actions ("unlimited vs 2 jobs/day cap") was also slightly confused — Vercel Hobby cron is 2 jobs *per project* per day per the dashboard docs, not a 2 total cap.

- 🟢 **Workers AI free = 10k neurons/day:** Confirmed from `developers.cloudflare.com/workers-ai/platform/pricing/`. Correct.

- 🟡 **`@cf/baai/bge-base-en-v1.5` = 768-dim:** Confirmed. But the model page also shows **max 512 input tokens** and costs $0.067 per million tokens at paid tier — irrelevant at Brain's volume, but the token ceiling is worth knowing: articles longer than 512 tokens would be silently truncated per chunk. Brain currently chunks at ~200–300 tokens (inferred from 30 chunks/capture typical), so this is likely fine, but it was not mentioned.

- 🟡 **Cross-provider proxy = 50–120ms from India:** This is a reasonable engineering estimate, not a live-measured value. The plan presents it as if verified. It is directionally correct but the actual latency depends on whether CF's India PoP routes to Vercel's `sin1` (Singapore) or `iad1` (US-East) — which depends on where Vercel deploys the function. Vercel Hobby defaults to `iad1` (US-East) unless overridden. Singapore PoP to US-East is ~180ms alone, making the 50–120ms estimate optimistic for the worst-case hop.

---

### 2. Migration effort estimates

- 🔴 **"1.5–2.5 wks AI-paired" (i.e., ~60–100 hours) is structurally under-stated.** The plan enumerates four tasks but omits the hidden cost of each:
  - `better-sqlite3` → `@libsql/client`: The codebase has ~40+ call sites where sync DB calls must become async. In a codebase the user cannot read or debug without AI, every asyncification cascade that breaks a smoke test is a full debug session. Realistic: 3–5 days, not 2.
  - Environment variable wiring across TWO platforms (Vercel + Cloudflare): Auth tokens for R2, CF API token, Turso URL + auth token, Anthropic key, Gemini key. Any mismatch is a runtime error only visible in production logs (Vercel runtime logs expire after 1 hour on Hobby — see §6). Realistic: 1–2 days of credential-hunting.
  - APK update: Rebuilding and sideloading the APK every time a base URL changes requires the full `npm run build:apk` + adb sideload cycle. The handover docs confirm the Capacitor Android pipeline is fragile. Add 1–2 days.
  - Chrome extension: `host_permissions` in `manifest.json` must include the new Vercel domain. Not mentioned in the migration plan at all (see §10). Add 0.5 days.
  - Vector schema migration: exporting `chunks_vec float[768]` from sqlite-vec and re-inserting as `F32_BLOB(768)` in Turso requires a custom script, a dry-run on a copy of the DB, and validation that cosine similarity results are numerically equivalent. For 1,116+ Lenny chunks + Brain chunks this is non-trivial. Realistic: 1–2 days.
  - Integration smoke tests (end-to-end APK → Vercel → Turso → R2 → Anthropic Ask): at Brain's complexity this is 2–3 days of testing with the physical device.

- 🟠 **1.5× AI-paired multiplier is too aggressive.** For a user who cannot read stack traces or interpret TypeScript errors without AI mediation, the realistic multiplier for a non-technical user is **2–3×**, not 1.5×. The cited prior work (S-7 migration runbook) was a simpler same-host migration with no new data layer.

- 🟠 **No maintenance cost accounted for.** Vercel and Cloudflare both make breaking changes in their free tiers. The plan acknowledges "one new operational surface" but nowhere estimates ongoing maintenance. Historical: Vercel changed the Hobby max duration from 60s to 300s in April 2025 — that broke any hardcoded assumptions in older deploys. CF made R2 pricing changes in 2024. Each breaking change = 1–3 hour debug session for a non-technical user. At 2 incidents/year × 2 hours = 4 hours/year minimum.

- 🔴 **Realistic P90 estimate: 200–250 hours total (Year 1).** This includes the initial migration (100–120 hours at 2× multiplier), integration testing (30–40 hours), APK + extension updates (15–20 hours), and Year 1 maintenance (10–20 hours). At any reasonable opportunity-cost rate (even $20/hour), that's $4,000–$5,000 in time to save $67/year in hosting.

---

### 3. UX claims

- 🟡 **Vercel cold start timing is plan-tier-specific.** The plan says "~1s cold start after dormancy." The Vercel docs say functions are archived after 2 weeks of no invocations, adding ~1s extra on first invoke. For a user who checks Brain daily this is rarely hit — this part is accurate. However, after any Vercel deployment (every code push), functions cold-start on the first request. For the APK share flow, the user captures a URL and has to wait for the cold-started function. Perceived UX: intermittent 1–2s delays on capture after deploys.

- 🟠 **India latency: Vercel defaults to US-East (`iad1`), not Singapore.** The plan's latency table shows "200–350ms" from India for Vercel with no explanation of why. The actual reason: `iad1` is Virginia, US-East. Mumbai to Virginia round-trip is ~180–220ms base, plus function execution. Singapore (`sin1`) would be 40–80ms. Vercel Hobby does not let you choose region — it uses `iad1` by default for Next.js App Router functions. The 200–350ms figure is directionally correct but the plan does not tell the user *why*, which means the user cannot evaluate whether Vercel adds a Singapore region (which would halve the latency) or whether they could use edge middleware to route closer.

- 🟡 **CF Cron Trigger vs node-cron behavioral difference:** CF Cron fires a Worker, which POSTs to Vercel. If the Vercel function returns a non-2xx response or times out, CF Cron does not retry (unlike GitHub Actions, which can be configured to retry). The plan says "CF Cron Trigger has no firing skew (unlike GitHub Actions ~10-min delay)" as a pure advantage, without noting the no-retry failure behavior. For nightly enrichment, one silent failure = 24 hours of missed enrichment.

- 🟡 **R2 PUT latency from Vercel not quantified.** The plan says "R2 blob writes happen async after content save — no perceivable capture latency increase." This is architecturally correct only if the R2 PUT is truly fire-and-forget in the code. If the Vercel function awaits the R2 PUT before returning 200 to the APK, capture latency increases by ~30–80ms (Vercel US-East → CF R2 US-East is minimal, but the async assert is a code-level claim, not verified by reading the proposed implementation).

---

### 4. Data layer risks

- 🟠 **Turso connection limits: not stated on free tier pricing page.** The pricing page does not publish a per-token or per-database connection limit. Turso's libSQL HTTP protocol is stateless (each query is an HTTP request), so traditional TCP connection pool limits are less relevant — but concurrent request limits could still apply. For Vercel serverless, each cold function instance opens a fresh HTTP connection to Turso. At Brain's volume (single user, <300 req/month) this is very unlikely to be a problem, but the plan presents "no connection pool issues" as a known fact when it is actually an unstated assumption.

- 🟠 **Latency Vercel US-East → Turso: not addressed.** Turso's default region when you create a new database is not documented prominently. If it defaults to `us-east-1`, Vercel→Turso is a same-region HTTP call (~5–10ms). If Turso places the DB in a different region (e.g., `eu-west`, which some accounts default to), every DB call from Vercel adds ~80–120ms. The plan silently assumes co-location. The user should explicitly set the Turso DB region to match Vercel's `iad1` deployment — not mentioned.

- 🟡 **libSQL vector vs sqlite-vec migration: syntax change is real, not trivial.** The prior research doc correctly lists the syntax differences. However, the insert format change from `vec_f32(blob)` to `vector32('[...]')` or raw float array means the entire embedding pipeline must produce a different format. The scripts in `src/lib/embed/` and `src/lib/ask/` will both need changes. For the existing 1,116 Lenny chunks already imported, a one-time migration script must correctly re-encode the float32 blobs. If a single row is mis-encoded, the vector index silently returns wrong results (no schema error, just bad retrieval). The plan calls this "a script that runs in seconds" — that's the execution time, not the validation time.

- 🟡 **Turso free tier longevity risk:** Turso raised a Series A (2024 per the prior research). VC-backed free tiers historically survive 2–4 years, then get monetized. PlanetScale shut its free tier in 2024; Railway shut in 2023. The plan mentions this in the prior doc but buries it. Given that the plan's final recommendation is to consider Hybrid 5 in 2027+, the user should factor in a meaningful probability that Turso's free tier changes between 2026 and 2028.

- 🟢 **5 GB Turso ceiling:** Brain DB is ~180 KB today. Even at 10× growth over 5 years = ~2 MB. YouTube transcripts add more; even at 100 transcripts/month × 50 KB average = 5 MB/month = 60 MB/year. After 5 years: ~300 MB. Well under 5 GB. This concern is genuinely not a risk at Brain's scale.

---

### 5. Failure-mode gaps

- 🟠 **Vercel deploys broken commit → APK gets 500. Silent failure path.** Vercel runtime logs on Hobby expire after **1 hour** (confirmed from `vercel.com/docs/limits`: "Runtime logs are stored for 1 hour on Hobby"). A deployment failure at 3 PM that the user doesn't notice until 9 PM = no logs, no root cause. The plan lists "Vercel down: entire app breaks" but does not address the more common case of a bad deploy that *looks* up but returns errors. There is no recommended monitoring/alerting strategy.

- 🟠 **Vercel Hobby invocation limit exceeded: account suspended, not auto-billed.** The pricing page lists invocations as "1 million included" with no on-demand pricing row for Hobby (unlike Pro). This implies Hobby accounts are hard-limited and requests fail when the cap is hit — not billed. The plan says nothing about what happens at the ceiling, leaving the user unaware that Brain would silently return errors for the rest of the billing month if somehow the 1M limit were hit (e.g., an APK bug causing a request loop). The plan's headroom calc (0.03%) makes this very unlikely, but the failure mode should be stated.

- 🟡 **CF R2 outage → backups fail, PDFs fail, CF Cron still fires → Vercel function gets called but R2 PUT errors.** The plan says "R2 blobs unreachable (PDF storage), nightly batch skips one night (retries next day)." This is incomplete: the Vercel function that does the capture will error on the R2 PUT, potentially failing the entire capture if the code does not handle R2 errors gracefully. The plan assumes fire-and-forget async R2 writes, but that must be true in the implementation, not just assumed.

- 🟡 **Anthropic key quota exhaustion: Ask silently fails.** Current architecture has the same problem (no Anthropic usage alerts configured). The plan mentions this implicitly in the "Failure modes" section only for enrichment, not for Ask. An Ask failure returns a 500 to the APK with no user notification beyond the stream dying.

- 🟢 **Bearer token leak exposure:** Brain uses `Authorization: Bearer` header, not URL query params. Vercel logs the URL but not the Authorization header by default. Query-param-based sensitive data (e.g., `?q=patient+records`) would be logged, but for Brain's use case (article URLs, search terms) this is low-sensitivity. The concern is acknowledged and proportionate.

---

### 6. Security / privacy regressions

- 🔴 **S-8 (privacy threat delta) was written for Hetzner. It is not re-evaluated for Hybrid 5.** The plan does not acknowledge this gap at all. Under Hetzner: data is on a single VM the user controls; only Cloudflare sees traffic metadata. Under Hybrid 5: Turso holds the full DB (all articles, chat history, all vector chunks); Vercel holds ephemeral function logs including request URLs, captured article URLs, and query strings; R2 holds PDF blobs; Anthropic receives every Ask prompt plus retrieved chunks; Gemini receives every article's full text for embedding. This is a qualitatively different trust boundary with five vendors instead of one. The privacy analysis needs to be re-done.

- 🟠 **Vercel runtime logs on Hobby are 1 hour only — but during that hour, captured URLs and search queries ARE in the logs.** For Brain's current usage (personal knowledge, personal research), this is low-risk. But the plan should acknowledge it rather than claim the bearer-header safety makes logging a non-issue.

- 🟡 **R2 backup snapshots contain the full decrypted DB.** The current architecture uses gpg client-side encryption before uploading to Backblaze B2 (confirmed in `02_Systems_and_Integrations.md`, §5: "gpg --encrypt... client-side encryption... B2 sees only ciphertext"). The Hybrid 5 plan proposes "GitHub Actions → rclone → R2: backup cron" with no mention of client-side encryption. If backups to R2 are stored in plaintext, this is a privacy regression from the current B2 approach. The plan does not address encryption at rest for R2 backups.

---

### 7. Cost-creep risk

- 🟢 **Turso row reads metric:** Verified behavior — each row fetched counts as one row read. A SELECT returning 10 rows = 10 reads. Brain's Ask retrieval fetches ~30 chunks top-k = 30 reads per Ask. At 300 Asks/month = 9,000 reads, plus list queries. ~10–50k reads/month vs 500M limit — effectively zero risk.

- 🔴 **R2 Class-A ops: plan states 10M free, actual is 1M free.** See §1. Brain's ~300 writes/month stays well inside 1M, but the stated headroom of "0.003% used" is calculated against the wrong denominator. Correct is still 0.03% — negligible, but the table is wrong.

- 🟡 **Workers AI neurons per embedding call: not quantified in plan.** The plan says "~30/day (900 chunks/mo)" uses neurons at 0.3% of 10k/day, implying ~30 neurons/day. That means ~1 neuron per embedding call (900 calls/month ÷ 30 days = 30/day). The Workers AI docs confirm neurons measure "GPU compute per request" but don't publish a per-model neuron rate for `bge-base-en-v1.5` in the free tier docs. The plan's math assumes 1 neuron per embedding — this may be correct for a small model but is unverified from primary source. If it's 10 neurons per call, daily limit is hit at 1,000 embedding calls/day. At Brain's volume (30 captures/month), even 10 neurons/call = 300 neurons/month, negligible.

- 🟢 **No auto-billing for Vercel Hobby on limit exceedance.** The pricing page shows Hobby invocations as "included" with no on-demand pricing row — hard cap, no unexpected charges.

- 🟢 **CF R2 no egress fees:** Confirmed. Reads from R2 via R2's public API are free. No surprise egress charges.

---

### 8. The "stay on Hetzner" argument

- 🟠 **The recommendation ignores that Hetzner is currently broken.** The handover docs (`02_Systems_and_Integrations.md` §6) state: "SSH key attached: NO (yellow-warning was skipped at create time) — currently unreachable." CAX11 is sold out; the server provisioned is CX23 at $5.59/month (not $3.60 as used in the break-even math). The break-even math in the plan uses $67/yr (CAX11 at $5.60/month), but the actual planned server is $5.59/month × 12 = $67/yr, so this is consistent. However the "0 migration effort" claim for Hetzner is false: there is still a non-trivial SSH resolution + provisioning effort ahead for Hetzner (estimated 2–4 hours in S-7 runbook), plus the same Lane C feature development. The plan treats Hetzner as "already done" when it is not.

- 🟡 **The plan correctly identifies the break-even problem but then concludes "stay on Hetzner" as if $67/yr is an ongoing committed cost.** The user's explicit constraint (confirmed in memory: "max $5", "not going for annual plan") means Hetzner at $5.59/month (already over $5) is itself not a clean answer. The plan doesn't acknowledge this tension.

- 🟢 **The mathematical case for "stay on Hetzner" is sound as stated**, given the 85-hour estimate. But with the corrected P90 of 200–250 hours, the break-even recedes to 10–15 years even under generous assumptions — making the recommendation even stronger, not weaker.

---

### 9. Worst-case cost-reconciliation

| Path | Year-1 hosting | Migration (P90, AI-paired hours) | Effective cost at $0/hr opportunity cost | 5-year total |
|---|---|---|---|---|
| Hetzner CX23 (current target, not yet working) | $67 | ~4 hrs (SSH fix + provision) | $67 + 4 hrs | $335 + 4 hrs |
| Pure Shape B (Vercel + Turso) | ~$0 | 150–200 hrs | 0 + 150–200 hrs | $0 + ~30 hrs/yr maintenance |
| Hybrid 5 (Vercel + CF data) | ~$0 | 200–250 hrs | 0 + 200–250 hrs | $0 + ~40 hrs/yr maintenance |
| Hybrid 4 (specialty all-CF) | ~$0 | 350–450 hrs | 0 + 350–450 hrs | $0 + ~60 hrs/yr maintenance |

The plan's best-case multiplier (1.5×) gives Hybrid 5 at 127 hours. The realistic P90 (2.5×, accounting for non-technical user + cross-platform debug + APK pipeline) gives 212 hours. At any positive value of the user's time, Hetzner dominates by a large margin in Year 1. The plan's math supports its recommendation but understates the gap.

---

### 10. What the plan didn't address

- 🔴 **Chrome extension `host_permissions` update not mentioned.** The extension currently has `host_permissions` for `brain.arunp.in` in `manifest.json`. Moving to Vercel changes the effective origin. Even if `brain.arunp.in` CNAME still works, MV3 extensions require `host_permissions` for the *actual* request target, not just the domain alias. This is a required code change to the extension that the migration plan skips entirely.

- 🟠 **Migration cutover procedure is missing.** The "two-week plan" lists tasks but not the cutover sequence: at what point does the APK start pointing at Vercel? Before or after the DB is migrated? If the APK points at Vercel before Turso is populated with the full DB migration, the user's Brain is empty for the duration. There is no stated rollback path if the Turso migration is corrupted.

- 🟠 **Backup encryption for R2 not addressed.** As noted in §6, the current B2 backup strategy uses gpg client-side encryption. The proposed GitHub Actions → R2 backup does not mention encryption. If this is a direct rclone copy of the SQLite file, R2 sees plaintext DB contents. This is a security regression.

- 🟡 **APK `NEXT_PUBLIC_BASE_URL` build-time bake.** The Capacitor APK bakes the base URL at build time (`npm run build:apk`). Moving to Vercel requires a full APK rebuild and sideload. The plan mentions this ("update APK + extension to `brain.arunp.in` CNAME") but does not account for the turnaround time of the Capacitor build pipeline or the need to physically sideload the new APK on the user's device.

- 🟡 **No CI/CD setup cost.** The plan assumes a working Vercel deployment pipeline via GitHub push. Setting up a new repo connection, configuring environment variables in the Vercel dashboard, and wiring the correct `NEXT_PUBLIC_BASE_URL` for production vs preview deployments has a first-time setup cost not included in the estimate.

- 🟢 **Authentication extensibility (spouse sharing):** Not addressed in the plan, but correctly out of scope — Brain is explicitly single-user with bearer = god-mode. This would require a full auth overhaul regardless of hosting choice.

---

## Severity summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1a | R2 Class-A ops stated as 10M, actual 1M | 🔴 | Correct table in plan (headroom unchanged) |
| 1b | CF Cron Triggers stated as "unlimited", actual 5/account | 🔴 | Correct claim; note 5-cron account cap |
| 2a | Migration estimate 60–100 hrs; realistic P90 = 200–250 hrs | 🔴 | Revise effort estimates; update break-even calc |
| 2b | 1.5× multiplier too low for non-technical user | 🟠 | Use 2.5× for planning |
| 3a | Vercel defaults to US-East (`iad1`) — not stated | 🟡 | Add note on region selection |
| 3b | CF Cron no-retry on failure not mentioned | 🟡 | Add retry/alerting requirement |
| 4a | Turso default DB region not stated; co-location not guaranteed | 🟠 | Specify explicit region selection step |
| 4b | Vector migration validation risk understated | 🟡 | Add validation step to migration plan |
| 5a | Vercel runtime logs expire in 1hr on Hobby; debugging window is tiny | 🟠 | Add external error monitoring recommendation |
| 5b | Vercel Hobby at 1M cap: hard stop, not auto-bill | 🟡 | Document cap enforcement behavior |
| 6a | S-8 privacy threat delta not re-evaluated for five-vendor Hybrid 5 | 🔴 | Re-run S-8 analysis for new trust boundary |
| 6b | R2 backup plan omits client-side encryption | 🟠 | Add gpg encryption step to R2 backup workflow |
| 7a | R2 Class-A free limit wrong in cost table | 🔴 | See 1a |
| 8a | Hetzner "0 migration effort" ignores SSH fix + provisioning work | 🟠 | Correct to ~4 hrs |
| 8b | Break-even uses $3.60/mo; actual server is $5.59/mo (CX23) | 🟡 | Confirm — math is correct per handover docs |
| 9 | Best-case P90 comparison table uses 1.5× multiplier | 🟠 | Revise with 2.5× for non-technical user |
| 10a | Chrome extension `host_permissions` update not in migration plan | 🔴 | Add to migration checklist |
| 10b | Cutover sequence and rollback path missing | 🟠 | Add to migration plan |
| 10c | R2 backup encryption omitted | 🟠 | See 6b |

---

## Verdict

**Plan needs revision before adoption.**

The final recommendation (stay on Hetzner for v0.6.0) is correct, but two of the factual claims used to support the plan (R2 Class-A ops, CF Cron Triggers "unlimited") are wrong and will propagate if the plan is cited. More importantly, if the user proceeds to Hybrid 5 in 2027 as suggested, the plan as written omits the Chrome extension manifest change (a hard blocker), the R2 backup encryption regression (a security gap), and the migration cutover sequence (a data-integrity risk). These must be fixed before the plan is treated as an implementation guide.

---

## What changes if user proceeds anyway

1. Explicitly set Turso DB region to `us-east-1` to co-locate with Vercel `iad1`.
2. Add client-side gpg encryption to the R2 backup workflow (mirror the B2 gpg approach from the current Hetzner plan).
3. Update Chrome extension `manifest.json` `host_permissions` as part of the migration checklist.
4. Add a migration cutover order: (a) migrate DB to Turso and validate, (b) deploy to Vercel in shadow mode with production still on Hetzner, (c) smoke-test on Vercel, (d) point DNS CNAME to Vercel, (e) rebuild + sideload APK.
5. Add external error monitoring (Sentry free tier or Vercel's own monitoring) before go-live, given the 1-hour log retention on Hobby.
6. Correct the R2 Class-A ops limit to 1M/month in all tables.
7. Correct "CF Cron Triggers: unlimited" to "5 per account (free tier)."
8. Re-run S-8 privacy threat delta analysis scoped to the five-vendor trust boundary.

---

## Questions the user must answer before committing

1. **Is Brain's Hetzner SSH problem actually unsolvable?** If yes (CAX11 sold out, CX23 SSH inaccessible, no workaround), Hybrid 5 becomes the *only* viable path, not a deferred option — and the effort estimate becomes moot.
2. **Are the 1,116 Lenny PDFs and their embeddings stored in the local SQLite, or in Recall.it?** If they are in the local SQLite `chunks_vec`, the vector migration script is not "seconds" — it's migrating 1,116 × ~30 chunks = ~33,000 rows. If they are only in Recall.it (separate service), Brain's local DB is still ~180 KB and the migration is fast.
3. **Is Turso's VC-backed free tier an acceptable single point of failure for a 4+-year commitment?** If not, what is the contingency (self-hosted sqld, Neon, etc.)?
4. **Does the user want to maintain client-side encryption on backups?** If yes, the R2 backup workflow must include gpg encryption, adding complexity to the GitHub Actions workflow.
5. **At what point does "free but complex" become worse than "$5/month but simple"?** The user has stated "$5 max" but Hetzner at $5.59/month already exceeds this. This needs a definitive answer before any architecture is chosen.
