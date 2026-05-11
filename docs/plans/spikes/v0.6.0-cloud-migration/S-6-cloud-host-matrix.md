# S-6: Cloud host matrix (cheap VM only)

**Estimated effort:** 2 hours (web research + VM trial signup for the top-2 candidates)
**Depends on:** S-5 (RAM floor for whatever embedding strategy we pick)
**Produces:** ranked cloud-host recommendations with monthly cost, suitability, operational risk.

---

## 0. Why this spike

There are a lot of cheap VM options. We want the cheapest one that runs Brain's stack (Next.js + SQLite + `better-sqlite3` + `sqlite-vec` + possibly Ollama for embeddings) reliably with good enough bandwidth and backup options. A $3 VM with 500 MB RAM that OOMs twice a week is worse than a $5 VM that just works.

## 1. Questions to answer

### 1.1 Host shortlist

Evaluate these:
- **Hetzner Cloud** — CX22 (€3.79 Intel), CPX11 (€3.79 AMD), CAX11 (€3.79 ARM). 2 GB RAM, 40 GB disk. EU data centers.
- **Fly.io** — shared-cpu-1x + 1 GB = ~$1.94/mo. Global, worker/machine abstraction. Edge-deployed.
- **DigitalOcean** — Basic droplet 1 GB = $6/mo, 2 GB = $12/mo. Reliable, US/EU regions.
- **AWS Lightsail** — 1 GB = $5/mo, 2 GB = $10/mo. Simpler AWS.
- **Oracle Cloud Free Tier** — A1 Ampere: 4 ARM cores + 24 GB RAM free forever. Too good to skip, despite infamous signup friction.
- **Railway** — $5 hobby plan with $5 usage credit, ~$5 net/mo for small apps. Node.js-native deploys.
- **Render** — Node backend $7/mo + disk + Postgres addon. Simpler than AWS.
- **Vercel** — not applicable (serverless; can't run persistent SQLite).

### 1.2 Per-host facts to collect

- Monthly cost (cheapest tier that fits Brain's RAM + disk requirement from S-5)
- CPU architecture (x86_64 vs ARM) — `better-sqlite3` and `sqlite-vec` both have ARM64 builds, but verify
- Disk type (NVMe? network-attached?) — SQLite WAL performance depends on this
- Bandwidth included + overage cost
- Static public IP availability
- Public DNS / load-balancer story (we're using Cloudflare tunnel, so host DNS doesn't matter)
- Backup options (snapshot? volume attach? what's restore cost?)
- Known data-center locations relevant to you (latency to your location matters for Ask UX)
- Setup friction (credit card required? phone verification? waitlist?)
- Billing model (hourly? monthly? prepay?)
- Scheduled maintenance policy (how often does the host require reboot?)

### 1.3 Brain-specific compatibility checks

- Can `better-sqlite3` install on the host's Node.js runtime? (Yes on all x86_64 and ARM64 Linux; some hosts like Fly have native-build quirks.)
- Can `sqlite-vec` extension load? (Yes on Linux/ARM64 Linux; confirm host image glibc version is compatible — sqlite-vec's pre-built binaries require glibc ≥ 2.28.)
- Does the host support long-running HTTP connections for SSE? (Some PaaS like Vercel kill streams at 30s — irrelevant for Brain since we're on a raw VM everywhere.)
- Does the Cloudflare tunnel `cloudflared` binary run cleanly? (Yes on ARM64 + x86_64; confirm.)
- Can we install `systemd` timers, or node-cron? (Depends on host — Fly machines are ephemeral; Hetzner is a full VM.)

### 1.4 Reliability / operational risk

- Historical uptime (independent tracker — NOT the host's SLA page)
- Subreddit / Hacker News sentiment for the last 6 months
- Billing surprises (DDoS bandwidth charges? Egress fees? Storage overage?)

### 1.5 Oracle Free Tier special evaluation

- Real vs myth: does the A1 Ampere Free Tier actually survive, or do accounts get reaped?
- Signup friction (requires credit card; known to reject many cards)
- Deploy friction (cloud-init? no, you do it manually; Ubuntu ARM64 only)
- 24 GB RAM is absurdly generous — if this works, it's the free-forever answer

If Oracle works, it's essentially $0 compute forever. If you can't get through signup, it's worth an hour of trying before giving up.

### 1.6 Cloudflare tunnel compatibility

The current Brain topology uses `cloudflared` running on the Mac as a service. On the cloud VM, same pattern:
- Install cloudflared
- Keep the same tunnel UUID (just move the credentials to new host)
- URL stays `brain.arunp.in`; clients (APK + extension) don't change
- This is worth confirming step-by-step for the top-3 host candidates

## 2. Sources to consult

- https://www.hetzner.com/cloud
- https://fly.io/docs/about/pricing
- https://www.digitalocean.com/pricing/droplets
- https://aws.amazon.com/lightsail/pricing
- https://www.oracle.com/cloud/free/#always-free
- https://railway.com/pricing
- https://render.com/pricing
- https://www.cloudflarestatus.com/ — (tunnel reliability; orthogonal)
- Recent Hacker News threads about each host (last 6 months)
- r/selfhosted — real-user reports

## 3. Output format

`docs/research/cloud-host-matrix.md`:

```markdown
# Cloud Host Matrix — <date>

## Top 3 recommended

### #1 <Host + Tier>
- Monthly: $X
- Why: ...
- Risks: ...

### #2 Budget runner-up
### #3 "If Oracle Free Tier works, use this" special case

## Full matrix

| Host | Tier | $/mo | vCPU | RAM | Disk | Arch | Bandwidth | Uptime record | Signup friction | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

## Oracle Free Tier go / no-go

- Attempted signup: <succeeded / failed / in progress>
- If succeeded: VM provisioned and verified running Brain-stack deps
- If failed: exact failure reason (card rejected, region unavailable, etc.)

## Cloudflare tunnel path

For each top-3 host, the exact steps to move `cloudflared` + credentials from the Mac. Validated by:
<one of: "tested on a trial instance" / "docs confirm"/ "assumed working based on platform-general Linux support">

## Recommendation

Primary: <Host + tier>. Rationale.
Budget alternative: <Host>. Rationale.
```

## 4. Success criteria

- [ ] Oracle Free Tier signup actually attempted (not just documented as possible)
- [ ] At least top-2 hosts validated empirically (sign up, deploy a basic Next.js + SQLite hello-world, confirm)
- [ ] Dated pricing for all rows
- [ ] One concrete recommendation for the plan

## 5. Open questions for the user

1. **Preferred region for latency?** US West / US East / EU / India / Singapore? The Cloudflare tunnel hides host location from the client, but Ask latency (Mac → tunnel → VM → API → VM → tunnel → phone) is bottlenecked by the VM ↔ AI-API round-trip, which is faster in US/EU than other regions.
2. **Can I provide a credit card that works with Oracle?** (Oracle's signup famously rejects many Indian / prepaid / debit / virtual cards.)
3. **Any vendor preferences or allergies?** (Some people strongly prefer / reject AWS. Fine to scope them out.)

## 6. Execution note

**The Oracle Free Tier attempt should happen first.** If it succeeds, we're done with this spike — the answer is "Oracle." If it fails, we have 6 paid alternatives to pick from, and the cheapest-that-works rule applies.

Second-priority: test one paid alternative (recommend Hetzner) end-to-end with a Next.js + SQLite + cloudflared deploy. A $4 VM for a day (~$0.15) beats any theoretical analysis.
