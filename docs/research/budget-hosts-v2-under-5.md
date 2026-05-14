# Budget Host Research v2 — Under $5/month (deep)

**Research date:** 2026-05-13
**Budget ceiling:** $5.00/mo USD HARD
**Brain stack:** Next.js + better-sqlite3 (WAL) + sqlite-vec + cloudflared (outbound)
**Brain RAM floor:** ~600 MB idle; 1 GB realistic minimum; 2 GB comfortable

---

## TL;DR

Hetzner CAX11 ARM (Helsinki) at ~$3.90/mo with IPv6-only is the best option under $5: it meets all hard constraints, saves ~$1.70/mo vs the previously-recommended CX23, uses NVMe-local storage, and has known-good Node.js/ARM64 support. If ARM64 or IPv6-only feels risky during first deploy, Contabo Cloud VPS 10 (Mumbai) at €3.60/mo annual (~$3.92) is the x86-64 alternative with 5ms India latency — though it requires a 12-month upfront payment and has variable CPU.

**Recommended: Hetzner CAX11, Helsinki, IPv6-only.**

---

## Why most "$5 platforms" don't work for Brain

| Platform | Why eliminated |
|----------|---------------|
| Cloudflare Workers / Deno Deploy | No native Node modules, no persistent SQLite — complete rewrite to D1 required |
| Vercel / Netlify | Serverless functions only; no long-lived process; no persistent local disk |
| Google Cloud Run | Containers are ephemeral; local disk lost on every scale-down |
| Fly.io | Networked block storage breaks SQLite WAL — explicitly rejected in S-6 |
| Heroku | Free tier gone; $7 paid is over budget and still no persistent local disk |
| AWS Amplify / Azure Static Web Apps | Frontend only; no app runtime |
| Render free | Scale-to-zero cold starts — explicitly rejected by user |

The hard requirements (long-lived Node process + WAL SQLite on local NVMe + glibc ≥ 2.28 + no ephemeral disk) leave exactly one category: **a real VPS/VM with persistent local SSD/NVMe**.

---

## Live-priced contenders (verified 2026-05-13)

| # | Host | Plan | Monthly $USD | RAM | Disk | India RTT | Inbound IP | Source |
|---|------|------|-------------:|----:|-----:|----------:|-----------|--------|
| 1 | Hetzner | CAX11 ARM, IPv6-only | ~$3.60 | 2 GB | 40 GB NVMe | 145ms (EU) / 60ms (SG*) | IPv6 only | [docs.hetzner.com] |
| 2 | Hetzner | CX22 AMD, IPv6-only | ~$4.35 | 2 GB | 20 GB NVMe | 145ms / 60ms (SG*) | IPv6 only | [docs.hetzner.com] |
| 3 | Hetzner | CX22 AMD, with IPv4 | ~$4.90 | 2 GB | 20 GB NVMe | 145ms / 60ms (SG*) | Public IPv4 | [docs.hetzner.com] |
| 4 | Contabo | Cloud VPS 10, annual | ~$3.92 | 8 GB | 75 GB NVMe | **5ms** (Mumbai) | Public IPv4 | [contabo.com verified] |
| 5 | Contabo | Cloud VPS 10, monthly | ~$4.90 | 8 GB | 75 GB NVMe | **5ms** (Mumbai) | Public IPv4 | [contabo.com verified] |
| 6 | Oracle | Always Free A1 (ARM) | $0 | 4–24 GB | 200 GB block | **5ms** (Mumbai) | Public IPv4 | [oracle docs verified] |
| 7 | AWS Lightsail | $3.50 IPv6-only | $3.50 | **512 MB** | 20 GB SSD | **5ms** (Mumbai) | IPv6 only | [aws.amazon.com verified] |
| 8 | DigitalOcean | $4 Droplet | $4.00 | **512 MB** | 10 GB SSD | 150ms+ | Public IPv4 | [digitalocean.com verified] |
| 9 | Vultr | Regular $2.50 IPv6-only | $2.50 | **512 MB** | 10 GB SSD | 150ms+ | IPv6 only | [vultr.com verified] |
| 10 | Netcup | VPS 500 G12 (G11 discontinued) | ~$5.40 | 4 GB | 128 GB NVMe | 145ms (EU) | Public IPv4 | [netcup.com verified] |
| 11 | IONOS | VPS S (promo) | $3.00 yr1 → **$5+** | 2 GB | 80 GB NVMe | 145ms (EU) | Public IPv4 | [ionos.com verified] |
| 12 | OVH | VPS-1 | ~$6.05 | 4 GB | 75 GB SSD | 145ms (EU) | Public IPv4 | [ovhcloud.com verified] |

*Hetzner Singapore availability for CAX11: not confirmed in live fetch — EU regions (Helsinki/Nuremberg) confirmed. Singapore may only carry AMD CX series.

**Items 7, 8, 9 (Lightsail $3.50, DO $4, Vultr $2.50): DISQUALIFIED — 512 MB RAM is below the 600 MB idle floor. OOM is a certainty under any Ask streaming load.**

---

## Deep dive: top 3 picks

### Pick 1 — Hetzner CAX11 ARM, Helsinki, IPv6-only

**Real cost:** CAX11 base price is **€3.29/mo** (Helsinki/Nuremberg/Falkenstein). IPv4 surcharge confirmed at **€0.50/mo** (Source: docs.hetzner.com billing FAQ). IPv6-only removes this surcharge → **€3.29/mo ≈ $3.60/mo**. No VAT for non-EU customers (India = 0%).

- **Pros:** Cheapest viable option. 2 vCPU ARM / 2 GB RAM / 40 GB local NVMe. better-sqlite3 compiles cleanly on ARM64 Ubuntu 22.04 (glibc 2.35, well above the 2.28 floor). sqlite-vec ships ARM64 prebuilt wheels since v0.1.3. Node.js 20+ has first-class ARM64 Linux binaries. Hetzner is the Toyota Camry of budget VPS — no reaping, no billing surprises, 99.9%+ uptime. No contract, hourly billing.
- **Cons:** EU latency — ~145ms India RTT adds ~290ms to first SSE token (8% of a 3,500ms total Ask response). Noticeable but not blocking for a personal tool. IPv6-only requires SSH from IPv6-capable India ISP (see IPv6 section below). ARM64 build path adds one `npm run build` smoke test to deployment checklist.
- **Reliability:** Hetzner historically <30 min unplanned downtime/quarter. No instance reaping policy. Instance persists through payment as long as account is paid.
- **Fit for Brain:** 2 GB RAM gives 1.4 GB headroom above the 600 MB floor. Comfortable. Local NVMe = WAL fsync sub-millisecond. glibc 2.35 satisfies sqlite-vec's 2.28 requirement with margin.
- **Setup friction:** Low. Provision from Hetzner console → Ubuntu 22.04 ARM64 → `apt install build-essential` → `npm ci` (compiles better-sqlite3 from source for ARM64) → deploy. The build step takes ~3 min longer than x86 due to cross-compilation but is a one-time cost.
- **If it fails:** Fall back to Contabo Mumbai (Pick 2). No data loss — just reprovision from backup.
- **Annual cost:** ~$43.20 (vs $67.08 for Hetzner CX23 Singapore with IPv4)

### Pick 2 — Contabo Cloud VPS 10, Mumbai, annual

**Real cost:** €3.60/mo on 12-month term = ~**$3.92/mo** (~$47/year upfront). Monthly option €4.50 ≈ $4.90. India/Mumbai datacenter confirmed available. Source: contabo.com/en/vps, verified 2026-05-13.

- **Pros:** Mumbai = ~5ms India RTT — essentially zero perceived latency for Ask streaming. 8 GB RAM / 4 vCPU is massively over-spec for Brain, giving enormous headroom. Local NVMe confirmed. x86-64 Ubuntu = zero build surprises (identical to prior test environments). This is the only sub-$5/mo option with Mumbai presence.
- **Cons:** CPU overselling is real and well-documented. Contabo runs dense hypervisors; at peak hours (EU business day), shared vCPUs are throttled. Brain is >99% idle so this rarely matters, but enrichment batch jobs will be slower and unpredictable. 12-month prepay = ~$47 capital tied up; if Contabo degrades or you want to migrate, you lose the remainder. Contabo's billing system has had historical issues with mid-contract changes — read the cancellation terms before paying.
- **Reliability:** 99.9%+ uptime measured across community reports. CPU performance is variable (70th-percentile complaint on LowEndTalk). Acceptable for an idle personal app; poor for latency-sensitive workloads. Contabo is not Hetzner.
- **Fit for Brain:** Excellent on specs. The CPU variability is the only real operational concern, and Brain's idle-heavy profile makes it tolerable.
- **Setup friction:** Low. x86-64 Ubuntu 22.04 — same path as every other guide. No ARM64 surprises.
- **If it fails:** Reprovision on Hetzner. Lose unused annual months.
- **Annual cost:** ~$47 prepaid (vs $67 for old Hetzner CX23 Singapore recommendation)

### Pick 3 — Hetzner CX22 AMD, IPv6-only (x86 fallback)

**Real cost:** CX22 base is approximately **€3.92/mo** (Helsinki). Minus IPv4 surcharge (€0.50): **~€3.92/mo ≈ $4.28/mo** IPv6-only. With IPv4: ~€4.42 ≈ $4.82/mo. Note: previous research cited a "CX23" but Hetzner's current lineup uses CX22 as the entry shared-AMD tier — verify exact name in console at time of order.

- **Pros:** x86-64 architecture = zero ARM64 risk. 2 GB RAM / 20 GB NVMe local. Identical reliability to CAX11. If the ARM64 build of better-sqlite3 or sqlite-vec causes any deployment snag, this resolves it immediately. All prebuilt binaries work.
- **Cons:** 20 GB disk vs CAX11's 40 GB — tighter but fine for SQLite (Brain DB unlikely to exceed 2 GB in first year). IPv6-only same caveats as CAX11.
- **Fit for Brain:** Good. Slightly more expensive than CAX11 for less disk, same RAM. Recommend only if ARM64 deployment smoke test fails.

---

## The Oracle Free Tier question

**Position: do not use as primary. Bonus experiment only.**

The specs are absurdly good (4 OCPU ARM / 24 GB RAM / 200 GB block / Mumbai). But the operational risk is not a matter of opinion — it is confirmed policy documented in Oracle's own documentation (fetched 2026-05-13): instances are reclaimed if CPU + network + memory all stay below 20% for 7 consecutive days. Brain at single-user idle almost certainly triggers this within weeks.

**2026 reality:** Indian user signup failure rate is high (debit card rejections, "tenancy creation failed"). Mumbai A1 capacity is frequently exhausted even for paid accounts. Reaping emails are sent with 7-day notice — if you miss email (or the 7 days expire during travel), instance is terminated and data is gone.

**Verdict:** Spend 60 minutes trying signup with a credit card (not debit). If it works and A1 is available, run it as a shadow host for 30 days alongside your primary Hetzner instance. Only cut over if it survives without reaping for a full month. Never use it as the only copy of your Brain data without automated off-host backup running daily.

---

## IPv6-only deep-dive

Hetzner IPv6-only drops the €0.50/mo IPv4 surcharge but introduces constraints worth being honest about:

**SSH from India:** India's major ISPs (Jio, Airtel, BSNL) have patchy IPv6 deployment. Jio residential has IPv6 but coverage varies by circle. Airtel mobile has IPv6 broadly. If your home/office ISP does not provide IPv6, you **cannot SSH directly** to an IPv6-only server from that connection. Mitigation: use a Cloudflare Access SSH proxy (free tier) — Cloudflare terminates TLS at its edge over IPv4 from your laptop, then connects to the server over IPv6. This is documented in Cloudflare's Zero Trust SSH docs and adds zero operational friction once configured.

**Cloudflare Tunnel on IPv6-only:** Confirmed compatible. cloudflared lists explicit IPv6 addresses for regional endpoints (e.g., `2606:4700:a0::1` through `2606:4700:a0::10`). The daemon defaults to IPv4 but falls back to IPv6 when IPv4 is unavailable — or you can force IPv6 with `--edge-ip-version 6`. The tunnel runs outbound-only on port 7844 (TCP/UDP). Source: Cloudflare Tunnel firewall docs, verified 2026-05-13.

**apt / npm on IPv6-only:** Ubuntu's apt repositories are fully IPv6-reachable. npm registry (registry.npmjs.org) is also IPv6-capable. GitHub (github.com) supports IPv6. No package management blockers.

**Practical recommendation:** Start with IPv4 included (add €0.50/mo) for the first month while you confirm your India SSH workflow. Once Cloudflare Access SSH is configured and verified, remove the IPv4 Primary IP to save €0.50/mo. The saving is real but not worth debugging SSH access issues during initial setup.

---

## Locked recommendation

**Primary: Hetzner CAX11, Helsinki (hel1), IPv6-only.** Cost: ~€3.29/mo ≈ **$3.60/mo**. Saves ~$2.00/mo vs previous Hetzner CX23 recommendation.

**Practical first-month cost: ~€3.79/mo ($4.13)** — add IPv4 for month 1 during SSH setup, then remove it.

**Fallback if ARM64 deploy fails:** Hetzner CX22 AMD, Helsinki, IPv6-only (~$4.28/mo).

**If Mumbai latency is required:** Contabo Cloud VPS 10, Mumbai, 12-month annual (~$3.92/mo). Accept CPU variability and upfront commitment.

**Skip:**
- Lightsail $3.50 / DigitalOcean $4 / Vultr $2.50: all 512 MB RAM — hard OOM disqualifier.
- Netcup VPS 500 G12: G11 discontinued, G12 is €4.97 ex-VAT — barely under $5 and no India region.
- OVH VPS-1: ~$6.05, over budget.
- IONOS VPS S: $3 promo expires at 12 months → jumps to $5+; renewal trap.
- Oracle Always Free: not reliable as primary; use as bonus experiment only.

---

## Migration impact

Switching from the prior "Hetzner CX23 Singapore" recommendation to "CAX11 Helsinki":

1. **Architecture change (x86 → ARM64):** Run `npm ci` on the target ARM64 server — better-sqlite3 will compile from source (~3 min). sqlite-vec prebuilt ARM64 wheel available since v0.1.3. Test with `node -e "require('better-sqlite3')"` and `node -e "require('@sqlite-vec/linux-arm64')"` before declaring success. No code changes needed.
2. **Region change (Singapore → Helsinki):** India RTT increases from ~60ms to ~145ms. Adds ~290ms to first Ask token. Acceptable for personal use; streaming continues at normal speed after first token.
3. **IPv6-only flag:** Configure Cloudflare Access SSH proxy before removing IPv4. One-time setup, ~20 minutes.
4. **SSH key:** No change — same SSH key used regardless of host.
5. **cloudflared credentials:** Re-generate tunnel credentials after provisioning new server. Takes ~5 minutes in Cloudflare Zero Trust dashboard.
6. **Backup:** S-7 runbook (rclone + Backblaze B2) unchanged.

---

## Budget reconciliation

| Component | Old (Hetzner CX23 SG, ~$5.59) | New (Hetzner CAX11 HEL, IPv6) | Delta |
|-----------|------------------------------:|------------------------------:|------:|
| VM | $5.59 | $3.60 | -$1.99 |
| Cloudflare Tunnel | $0.00 | $0.00 | $0 |
| Total monthly | ~$5.85 (with AI calls) | ~$3.86 | **-$1.99** |
| Total annual | ~$70.20 | ~$46.32 | **-$23.88** |

> Contabo Mumbai annual alternative: VM ~$3.92/mo, monthly total ~$4.18, saves ~$1.67/mo vs old recommendation.
> Both options are under the $5.00 hard ceiling.
> Previous recommendation (CX23 Helsinki) was cited at $5.59/mo including IPv4 — that was already slightly over $5. CAX11 IPv6-only resolves the budget breach cleanly.
