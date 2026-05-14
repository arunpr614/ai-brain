# Budget Host Research — v0.6.0 (cheaper than Lightsail)

**Spike:** S-6b | **Date:** 2026-05-12 | **Target:** <$7/mo, ideally <$5

---

## TL;DR recommendation

**Hetzner CX23 Singapore (~$5.35/mo)** beats Lightsail $10 on price, nearly matches it on latency (~60ms India RTT vs ~5ms), and is more reliable than any option in its price class. If latency to Mumbai specifically is required at <$7, Contabo Mumbai at ~$3.92/mo annual is the only viable alternative — with known CPU variability trade-offs.

---

## Why Lightsail $10 was over-spec

S-6 chose Lightsail for three reasons: Mumbai datacenter (~5ms), clean billing, low friction. All valid — but none requires AWS. Brain is a single-user idle-heavy app (2 items lifetime, <1 req/min). We don't need $10 pricing when €4–5 VMs with 4 GB RAM exist. Mumbai proximity matters only for the tunnel-to-origin leg, which Cloudflare SSE already buffers. Lightsail also gives Mumbai only 1.5 TB/month bandwidth vs 3 TB for US regions — a quiet gotcha at the same price.

---

## Contenders

| # | Host | Spec | Monthly | Regions | India RTT | Notes |
|---|------|------|---------|---------|-----------|-------|
| 1 | **Hetzner CX23** | 2 vCPU / 4 GB / 40 GB NVMe | ~$4.90 (EU) / ~$5.35 (SG) | EU + Singapore | 60ms (SG) / 145ms (EU) | CX23 replaced CX22; verified €4.49 EU [vpsbenchmarks.com] |
| 2 | **Hetzner CAX11** | 2 vCPU ARM / 4 GB / 40 GB NVMe | ~$5.45 (EU) / ~$5.95 (SG) | EU + Singapore | same as CX23 | ARM64; slightly pricier; same region options [vpsbenchmarks.com €4.99] |
| 3 | **Contabo VPS 10** | 4 vCPU / 8 GB / 75 GB NVMe | ~$4.90/mo or **~$3.92/mo** annual | EU, US, **Mumbai**, SG | **5ms** (Mumbai) | Best latency under $5; CPU variable; [contabo.com verified €3.60 annual] |
| 4 | **Oracle Free A1** | 4 vCPU ARM / 24 GB / 200 GB | $0 | Mumbai ✓ | 5ms | Signup flaky for Indians; reaping risk; lottery ticket |
| 5 | **IONOS VPS S** | 2 vCPU / 2 GB / 80 GB | $3 promo → **$5 regular** | EU + US only | 145ms+ | 2 GB RAM snug; promo expires after 12 months; no Asia |
| 6 | **Netcup VPS 500 G12** | 2 vCPU / 4 GB / 128 GB NVMe | €5.91 (~$6.45) | EU only | 145ms | Includes 19% German VAT; India non-residents pay no VAT → net ~$5.40 [netcup.com verified] |
| 7 | **Scaleway Stardust** | 1 vCPU / 1 GB / 10 GB | ~€0.10/mo | EU only | 145ms | 1 GB RAM below Brain's floor; often out of stock |
| 8 | **RackNerd KVM** | 1 vCPU / ~768 MB / 12 GB SSD | ~$2.25/mo annual | US + Netherlands | 200ms+ | 1 GB RAM too tight at idle; no Asia PoP |
| 9 | **BuyVM Slice 1024** | 1 vCPU / 1 GB / 20 GB SSD | $3.50/mo | NY / LV / Luxembourg | 180ms+ | 1 GB snug; no Asia PoP |

---

## Deep dive: top 3

### 1. Hetzner CX23, Singapore

**Cost:** €4.49 Germany (verified [vpsbenchmarks.com]); Singapore ~10–15% premium → ~$5.35/mo. Non-EU customers pay no VAT.

- **Pros:** Best reliability in class (no reaping, no billing surprises). 4 GB RAM, NVMe local storage (WAL fsync <0.2ms), 20 TB/mo bandwidth. Singapore added 2024 — ~60ms India RTT. Ubuntu 22.04 x86_64: glibc 2.35, all prebuilt binaries, zero build friction. Hourly billing, no contract.
- **Cons:** Singapore may cost $0.45/mo more than EU; confirm in console before ordering.
- **Reliability:** Top-ranked in budget VPS reliability surveys. <30 min unplanned downtime/quarter typical. No instance reaping.
- **Signup:** Low friction. Indian cards accepted.
- **Brain fit:** Excellent. Identical technical path to prior S-6 Hetzner fallback.

### 2. Contabo VPS 10, Mumbai

**Cost:** €4.50/mo month-to-month; €3.60/mo (~$3.92) on 12-month contract, setup fee waived. Mumbai datacenter confirmed. [contabo.com verified 2026-05-12]

- **Pros:** Mumbai = ~5ms RTT, identical to Lightsail. 4 vCPU / 8 GB RAM — overpowered for Brain. Local NVMe, WAL safe. Cheapest Mumbai option by significant margin.
- **Cons:** Known for CPU overselling on shared hypervisors — performance variable at peak hours. Brain is 99% idle so this rarely surfaces, but enrichment batch runs may be sluggish. 12-month commitment = ~$47 upfront. Read billing terms carefully before paying.
- **Reliability:** Uptime 99.9%+ typical; CPU performance is not predictable. Acceptable for idle-heavy workload.
- **Signup:** Low friction. Indian billing address supported.
- **Brain fit:** Good-enough. The only sub-$5 Mumbai option.

### 3. Oracle Free A1, Mumbai

**Cost:** $0 if signup works and instance survives.

- **Pros:** Free, 24 GB RAM, Mumbai, ARM64 Ubuntu 22.04 (glibc 2.35), WAL-safe block storage.
- **Cons:** Indian user signup failure rate is high — debit cards commonly rejected; "tenancy creation failed" error common; Mumbai A1 capacity often unavailable even after successful signup. **Reaping risk:** Oracle terminates "inactive" Always Free accounts — Brain at ~2 items lifetime could be classified inactive. Policy confirmed active in 2024–2025 community reports. No SLA. OCI UI is complex.
- **Verdict:** Attempt with a Visa/Mastercard credit card (not debit), ≤60 minutes budget. Run alongside Hetzner for 30 days before cutting over; never as standalone primary.

---

## India latency reality check

Brain's Ask UX critical path: phone → Cloudflare Mumbai PoP (~5ms) → tunnel → VM → LLM (Anthropic) → back.

The LLM call itself takes 1,000–2,000ms. The VM origin adds 2× one-way RTT to first token:

| VM location | One-way RTT | Added to first token | % increase on 1,500ms LLM |
|------------|------------|---------------------|--------------------------|
| Mumbai (Lightsail / Contabo) | ~5ms | +10ms | <1% |
| Singapore (Hetzner SG) | ~60ms | +120ms | 8% |
| EU Germany/Finland | ~145ms | +290ms | 19% |

**Singapore is comfortable. EU is noticeable but not blocking.** The streaming nature of SSE means tokens continue to arrive every ~50ms after first token — the latency hit applies once per query, not per token. For a personal knowledge tool this is acceptable. Your current Mac-hosted setup already introduces similar variability from Mac sleep and LAN switching.

---

## The Oracle Free Tier question

**Position: bonus attempt only, not the plan.**

The upside is obvious: free, Mumbai, 24 GB RAM. The downside is operational risk disproportionate to saving $5/month on a tool you use daily. If Oracle reaps your instance overnight, Brain is down until you notice and reprovision. On Hetzner, this doesn't happen. The signup lottery is a real time sink. Oracle's OCI control plane takes longer to debug than Hetzner's clean UI.

**Take it as a secondary experiment, never as the primary host for your only personal Brain.**

---

## SQLite + storage safety per host

| Host | Storage | WAL safe? |
|------|---------|-----------|
| Hetzner CX23/CAX11 | Local NVMe | Yes — best in class |
| Contabo VPS 10 | Local NVMe | Yes |
| Oracle A1 | Block storage (iSCSI, local-behaving) | Yes |
| IONOS / Netcup / RackNerd / BuyVM | Local NVMe / SSD | Yes |
| Fly.io | Networked volume | **No — rejected S-6** |

---

## Reliability + operational risk

1. **Hetzner** — industry benchmark; no reaping; clean billing; strong uptime.
2. **Netcup** — solid German provider; EU only; slightly over $5 with VAT.
3. **IONOS** — acceptable uptime; beware promo pricing cliff at 12 months; EU/US only.
4. **Contabo** — good uptime, variable CPU; fine for idle apps; read billing terms.
5. **Oracle Free** — running instances are fine; signup + reaping risk is the problem.
6. **RackNerd** — works, small shop, annual commitment, no Asia PoP.
7. **BuyVM** — works, 1 GB RAM too tight for Brain.

---

## Rejected tier (and why, in one line each)

- **DigitalOcean $12 Bangalore** — works; just costs $7+ more than Hetzner for equivalent specs.
- **Linode/Akamai Nanode $5** — 1 GB RAM; no meaningful advantage vs Hetzner.
- **AWS Lightsail 1 GB $5** — 1 GB RAM below Brain's floor; same location advantage of $10 tier without the headroom.
- **Vultr $2.50** — 512 MB RAM; below floor.
- **Scaleway Stardust** — 1 GB RAM disqualifier; often out of stock anyway.
- **Fly.io** — networked volume breaks SQLite WAL; rejected in S-6 for cause.
- **Railway/Render** — PaaS, no persistent local disk suitable for sqlite-vec native extensions.

---

## Locked recommendation

**Primary: Hetzner CX23, Singapore (sin1).** Cost: ~$5.35/mo.
**Backup if Singapore capacity unavailable:** Hetzner CX23, Helsinki (hel1) — same price, 145ms India RTT.
**If Mumbai latency is required:** Contabo VPS 10, Mumbai, 12-month at ~$3.92/mo.

**Rationale:** Hetzner Singapore resolves the S-6 latency objection (60ms vs 145ms EU) while remaining $4.65/month cheaper than Lightsail. Hetzner's reliability eliminates the operational risk that makes Oracle unsuitable as a primary. The spec upgrade (4 GB vs Lightsail 2 GB) is a free bonus. Singapore availability (added 2024) makes this a genuinely new option that didn't exist when S-6 was written.

---

## Migration impact vs prior Lightsail plan

**S-7 runbook:** No structural changes. Provision Ubuntu 22.04, copy tunnel credentials JSON, install cloudflared (same amd64 binary), deploy Next.js standalone build, configure rclone + B2 cron backup. SSH destination IP changes; nothing else does.

**Privacy:** Data moves from AWS ToS to Hetzner (GDPR jurisdiction, Germany). Neutral-to-positive for personal notes.

---

## Cost summary delta

| Component | Old (Lightsail Mumbai) | New (Hetzner CX23 SG) | Delta |
|-----------|----------------------|-----------------------|-------|
| VM | $10.00 | ~$5.35 | -$4.65 |
| Anthropic AI calls | $0.26 | $0.26 | $0 |
| Gemini embeddings | $0.00 | $0.00 | $0 |
| Backblaze B2 | $0.00 | $0.00 | $0 |
| **Total monthly** | **$10.26** | **~$5.61** | **-$4.65** |
| **Total annual** | **$123.12** | **~$67.32** | **-$55.80** |

> Contabo Mumbai annual alternative: VM ~$3.92/mo, total ~$4.18/mo, saves $6.08/mo ($72.96/yr).
> Anthropic hard cap ($5/mo) set in S-9: no change needed.
