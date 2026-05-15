# Cloud Host Matrix — 2026-05-12

**Spike:** S-6 (cloud host selection for ai-brain v0.6.0 migration)
**Researched:** 2026-05-12
**Scope:** Always-on Linux VM; user in India (Mumbai/Bangalore); stack = Next.js 16 + better-sqlite3 + sqlite-vec + cloudflared daemon. RAM floor: 1.5 GB; comfortable: 2 GB.

---

## Top 3 Recommended (latency-weighted for India)

### #1 — AWS Lightsail 2 GB (Mumbai ap-south-1) — $10/mo

- **Monthly:** $10 (IPv6-only) or $12 (public IPv4)
- **vCPU:** 2 | **RAM:** 2 GB | **Disk:** 60 GB SSD | **Transfer:** 1.5 TB/mo (Mumbai region gets half the standard allowance)
- **Region:** ap-south-1 (Mumbai) — physically closest major cloud to Indian users
- **Why #1:** Only evaluated host with a confirmed Mumbai datacenter at a price within the $5–15 budget. Single-digit millisecond LAN latency to the Cloudflare PoP in Mumbai. Well-documented cloudflared setup path. glibc version on Amazon Linux 2023 / Ubuntu 22.04 LTS images is 2.35, well above sqlite-vec's 2.28 minimum. better-sqlite3 builds cleanly on x86_64 Linux with Node 20+. Lightsail is billed cleanly; no surprise egress fees within the transfer bundle.
- **Risks:** Mumbai instances get half the normal bandwidth (1.5 TB vs 3 TB for US regions) — [VERIFIED: aws.amazon.com/lightsail/pricing, fetched 2026-05-12]. At Brain's usage profile (< 1 GB/mo of actual traffic) this is not a real constraint. No ARM option at this tier; x86_64 only for Lightsail.
- **Signup friction:** Standard AWS account; works with Indian credit/debit cards. Lightsail has its own console separate from main AWS, straightforward.

### #2 — Hetzner Cloud CAX11 (ARM, Helsinki/Nuremberg) — ~€3.79/mo (~$4.10)

- **Monthly:** €3.79 (~$4.10 at 1.08 rate)
- **vCPU:** 2 ARM (Ampere Altra) | **RAM:** 4 GB | **Disk:** 40 GB NVMe | **Transfer:** 20 TB/mo (very generous)
- **Region:** EU only (Helsinki, Nuremberg, Falkenstein) — no India/Asia PoP
- **Why #2:** Best pure value; 4 GB RAM for €3.79 is unmatched. The CAX11 (ARM64 Ampere) has NVMe-attached local-style storage (not network-attached), which is ideal for SQLite WAL. better-sqlite3 ships pre-built ARM64 Linux binaries. sqlite-vec ARM64 Linux builds are published in the official GitHub releases. cloudflared has an official ARM64 Linux binary. glibc on Ubuntu 22.04 Arm64 on Hetzner is 2.35. 20 TB/mo bandwidth is essentially unlimited for this use case.
- **India latency caveat:** EU to India is ~120–180 ms RTT [ASSUMED — based on standard EU-Mumbai round-trip times]. For the Ask UX the critical path is: phone → Cloudflare edge (Mumbai PoP, ~5 ms) → tunnel → Hetzner (EU, ~140 ms) → app logic → back. The Cloudflare tunnel leg adds ~140 ms each way vs ~5 ms for Lightsail. For a streaming RAG response where first-token appears at 1–2 s, an extra 280 ms round-trip is noticeable but not blocking. If latency is priority #1, use Lightsail. If cost is priority #1 and 300 ms extra is acceptable, use Hetzner.
- **Risks:** EU jurisdiction (GDPR applies; Brain data is personal notes — this is an advantage, not a risk). Hetzner has had brief EU network incidents in 2024–2025 but generally strong uptime [ASSUMED — based on community reports in training data; not independently verified in this session].

### #3 — Oracle Cloud Free Tier A1 Ampere (Mumbai) — $0/mo (if signup works)

- **Monthly:** $0 (Always Free)
- **vCPU:** 4 ARM | **RAM:** 24 GB | **Disk:** 200 GB block | **Transfer:** 10 TB/mo outbound (free tier)
- **Region:** ap-mumbai-1 available
- **Why #3:** If signup works, this is the obvious answer — 24 GB RAM in Mumbai for free. ARM64 Ubuntu 22.04 image available. Stack compatibility is identical to Hetzner CAX11 (same ARM64 glibc path). cloudflared ARM64 binary works.
- **The catch:** See Oracle Free Tier Reality Check section below. Signup failure rate for Indian users is high enough to make this a "try for 1 hour, fall back to #1 or #2" proposition, not a primary plan.

---

## Full Comparison Matrix

> Pricing as of 2026-05-12. Sources tagged per claim.

| Host | Tier | $/mo | vCPU | RAM | Disk | Arch | BW incl. | India PoP | SQLite compat | cloudflared | Signup friction |
|------|------|------|------|-----|------|------|----------|-----------|--------------|-------------|-----------------|
| **AWS Lightsail** | 2 GB (IPv6) | **$10** | 2 | 2 GB | 60 GB SSD | 1.5 TB | Mumbai ✓ | HIGH [VERIFIED] | x86_64, glibc 2.35 ✓ | Official docs ✓ | Low — standard AWS |
| **AWS Lightsail** | 2 GB (IPv4) | $12 | 2 | 2 GB | 60 GB SSD | 1.5 TB | Mumbai ✓ | HIGH [VERIFIED] | Same | Same | Same |
| **Hetzner CAX11** | ARM Ampere | ~$4.10 | 2 | 4 GB | 40 GB NVMe | 20 TB | EU only | POOR (~150 ms) | ARM64, glibc 2.35 ✓ | Official binary ✓ | Low — card + email |
| **Hetzner CX22** | Intel | ~$4.10 | 2 | 4 GB | 40 GB NVMe | 20 TB | EU only | POOR | x86_64, glibc 2.35 ✓ | Same | Same |
| **Oracle Free** | A1 Ampere | $0 | 4 | 24 GB | 200 GB | 10 TB | Mumbai ✓ | HIGH | ARM64, glibc 2.35 ✓ | Official binary ✓ | VERY HIGH [ASSUMED] |
| **DigitalOcean** | Basic 2 GB | ~$12 | 1 | 2 GB | 50 GB SSD | 2 TB | Bangalore ✓ | HIGH | x86_64, glibc 2.35 ✓ | Documented ✓ | Low |
| **Fly.io** | shared-1x 2 GB | ~$5–7 | 1 | 2 GB | +3 GB vol | variable | Edge/Chennai | MEDIUM | See Fly section | Works | Low |
| **Railway** | Hobby | ~$5 | shared | ~512 MB–1 GB | Ephemeral | Metered | US/EU | POOR | Risky (RAM) | Possible | Low |
| **Render** | Starter | $7 | 0.5 | 512 MB | N/A | N/A | US/EU | POOR | NO — 512 MB insufficient | Possible | Low |

> [VERIFIED: AWS Lightsail pricing] — aws.amazon.com/lightsail/pricing/, fetched 2026-05-12
> All other pricing rows: [ASSUMED — training knowledge, verify against provider pricing pages before purchase]

---

## Host-by-Host Notes

### AWS Lightsail (Mumbai)

**glibc:** Ubuntu 22.04 LTS on Lightsail ships glibc 2.35 [ASSUMED — Ubuntu 22.04 ships 2.35 per Ubuntu release notes; Lightsail uses standard Ubuntu images]. sqlite-vec requires ≥ 2.28. PASS.

**better-sqlite3:** Prebuilt native binary for x86_64 Linux, Node 20. `npm install better-sqlite3` works without compilation. [ASSUMED — confirmed in training data from better-sqlite3 GitHub releases; no live verification this session].

**sqlite-vec:** Official releases publish `vec0.so` for x86_64 Linux. Load via `db.loadExtension('./vec0')`. [ASSUMED — sqlite-vec GitHub releases confirmed ARM64 and x86_64 Linux builds in training data].

**Cloudflare tunnel migration:**
Moving the existing named tunnel (UUID `58339d22-d0be-4fab-94d6-32fd24b04a72`) to a new host requires only copying the credentials JSON — the tunnel UUID and your public hostname (`brain.arunp.in`) are registered in Cloudflare's network, not on the Mac. Steps:
1. Copy `~/.cloudflared/58339d22-d0be-4fab-94d6-32fd24b04a72.json` to the Lightsail VM
2. `curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb && dpkg -i cloudflared.deb`
3. `cloudflared service install` using the credentials JSON
4. Zero client changes — APK and extension still hit `brain.arunp.in`

[CITED: developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-managed-tunnel/ — tunnel credentials are portable; the tunnel config lives in Cloudflare's control plane, not on the origin host. The named tunnel can run on any machine that has the credentials JSON.]

**Disk:** Lightsail uses AWS EBS-backed SSD. EBS has slightly higher write latency than local NVMe (typically 0.5–1 ms vs 0.1–0.2 ms) [ASSUMED]. At Brain's write frequency (< 10 writes/second), this is irrelevant. SQLite WAL works correctly on EBS — it is not network-attached in the same way as NFS/CIFS; each I/O is synchronous from the guest's perspective. [ASSUMED — standard AWS documentation position].

**Scheduled maintenance:** AWS Lightsail instances require occasional reboots for host maintenance, typically < 1/month, with advance notice. [ASSUMED].

---

### Hetzner Cloud CAX11

**NVMe storage:** Hetzner's CAX11 uses NVMe-backed local storage. SQLite WAL performance is excellent. fsync latency < 0.2 ms typical. [ASSUMED — Hetzner documentation describes NVMe-backed cloud volumes; not independently verified this session].

**India latency:** Hetzner has no India or Asia-Pacific regions as of 2026 [ASSUMED — Hetzner datacenter list in training data shows EU + US only]. The Cloudflare tunnel hides this for web browsing, but for Ask (RAG) the extra ~280 ms round-trip (EU ↔ India × 2) is measurable. The Ask flow is SSE-streamed, so first token appears ~300 ms later than with a Mumbai host. For a personal knowledge tool used by a single non-latency-intolerant user this is acceptable. For a tight "instant feel" requirement, use Lightsail.

**Bandwidth:** 20 TB/month included on CAX11 is effectively unlimited for Brain. No egress fees within the included allocation. [ASSUMED — Hetzner pricing page in training data].

**cloudflared:** Official ARM64 Linux binary at github.com/cloudflare/cloudflared/releases. Install identical to Lightsail except `cloudflared-linux-arm64.deb`. [ASSUMED — cloudflared GitHub releases page lists linux-arm64 assets].

---

### DigitalOcean (Bangalore BLR1)

DigitalOcean has a Bangalore (BLR1) region [ASSUMED — confirmed in training data from DigitalOcean regions page]. The Basic 2 GB droplet is ~$12/mo [ASSUMED]. India latency would be comparable to Lightsail Mumbai (both <20 ms to Indian users). DO is slightly more expensive than Lightsail for equivalent specs and has no meaningful technical advantage for this use case. Lightsail Mumbai is preferred over DO Bangalore for the same latency benefit at $10 vs $12. If you have an existing DO account or strong preference, it is a fully valid alternative.

---

### Fly.io

**Persistent SQLite on Fly is a known hazard.** Fly's persistent volume (`fly volumes create`) uses network-attached storage (similar to AWS EBS but with higher latency variability due to the Fly network fabric) [ASSUMED]. SQLite WAL mode (`PRAGMA journal_mode=WAL`) requires `fsync()` to complete reliably before returning success. On Fly volumes, there are community-reported cases of WAL corruption under load due to delayed fsync acknowledgment [ASSUMED — based on reports in fly.io community forum threads in training data, 2024–2025]. The Litestream project (Fly-sponsored) exists partly to work around this for SQLite on Fly.

**For Brain specifically:** DB is tiny (< 5 MB), write rate is < 1 write/minute at typical usage. The risk is low in practice but the setup is more complex (must use a volume, must configure WAL mode correctly, no swap without explicit config). Fly is an excellent platform for stateless apps; for a SQLite-primary app on a $5–7 budget, Lightsail or Hetzner are cleaner.

**Fly machines are not ephemeral by default** when using a persistent volume — the confusion is from the older "always-on app" model vs the newer Machines API. With `[http_service] auto_stop_machines = false` the VM stays running 24/7. But this requires configuration discipline. [ASSUMED — Fly.io documentation in training data].

**Chennai/Mumbai edge:** Fly has edge nodes in Chennai [ASSUMED — Fly regions list in training data shows `maa` = Chennai]. This helps HTTPS termination latency but the VM itself runs in the assigned region, not the edge. For a Cloudflare-tunneled app, Fly's edge is irrelevant — Cloudflare terminates at its own PoP (Mumbai).

**Verdict:** Technically feasible, operationally fiddlier than Lightsail or Hetzner for a SQLite-primary app. Not recommended as primary.

---

### Railway / Render

Both are PaaS with managed Node.js deployments. Neither is suitable as a primary host for Brain:

- **Railway:** No persistent disk volume that survives deploys without explicit configuration. 512 MB–1 GB RAM on hobby tier is below Brain's 1.5 GB floor. Not designed for sqlite-vec native extension loading. [ASSUMED]
- **Render:** Starter tier is 512 MB RAM — insufficient. Even the $25/month "Standard" tier may have file system limitations for SQLite. Render's persistent disk is an add-on. [ASSUMED]

Both are good for stateless API deployments. Brain's SQLite + native extensions requirement makes them a poor fit.

---

## Oracle Free Tier Reality Check

### The offer (as of 2026-05-12)

Oracle Always Free: up to 4 ARM64 vCPUs + 24 GB RAM + 200 GB block storage in the Ampere A1 shape, running indefinitely at $0. Mumbai (ap-mumbai-1) region is available. This would be the ideal host for Brain if it were accessible. [ASSUMED — Oracle Always Free page in training data; not live-verified this session]

### Signup friction for Indian users: DON'T SPEND MORE THAN 1 HOUR

Community reports from r/selfhosted, r/homelab, and Hacker News (2024–2025 threads) indicate:

1. **Card rejection is the most common failure mode.** Oracle's payment verification rejects many Indian debit cards, virtual cards (Razorpay, Instamojo), and some Visa debit cards. Credit cards (Visa/Mastercard) have higher success rates but are not guaranteed. Prepaid cards (including bank-issued prepaid) are almost always rejected. [ASSUMED — training data from community threads; exact success rates are anecdotal]

2. **"Tenancy creation failed" error** after seemingly successful card entry. This is Oracle's internal fraud/risk scoring rejecting the signup. No recourse other than trying a different card or a different email. [ASSUMED]

3. **Free Tier availability is region-dependent.** Oracle "sells out" A1 capacity in popular regions. Mumbai has historically been capacity-constrained; the A1 free tier shape may show as unavailable even after successful signup. [ASSUMED]

4. **Account termination after 30 days of "inactivity"** — Oracle converts inactive accounts to pay-as-you-go. If Brain is idle (which it usually is), some users have reported unexpected charges or account suspension. This requires actively checking the account or ensuring at least one resource is "used" per Oracle's definition. [ASSUMED — community reports]

### Verdict: "Try once, give up quickly"

**Attempt Oracle signup if and only if:**
- You have a Visa or Mastercard credit card (not debit, not virtual, not prepaid)
- You can spend ≤ 60 minutes on signup friction

**If any of these are true, skip Oracle:**
- Only debit cards available
- Received "tenancy creation failed" once
- Mumbai A1 shows as unavailable during VM provisioning

**If Oracle works:** It is the right answer — 4 vCPU / 24 GB / Mumbai / $0. Use it.
**If Oracle fails:** Immediately fall back to Lightsail Mumbai. Do not spend hours fighting Oracle's payment system.

---

## Cloudflare Tunnel Migration Path

**Critical question answered:** YES, the existing named tunnel (UUID `58339d22-d0be-4fab-94d6-32fd24b04a72`) can move to a Linux VM with zero client-side changes.

The tunnel UUID and public hostname (`brain.arunp.in`) are registered in Cloudflare's control plane. The `cloudflared` daemon on the origin host is just a worker that authenticates using a credentials JSON file. Moving the tunnel = copying that credentials file to the new host and starting `cloudflared` there.

[CITED: Cloudflare documentation — "A Named Tunnel's configuration and routing lives in Cloudflare's network. Credentials are bound to the tunnel UUID, not to a specific machine." — developers.cloudflare.com/cloudflare-one/connections/connect-networks/]

### Steps for Lightsail (Ubuntu 22.04, x86_64)

```bash
# On the Lightsail VM:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb

# Transfer credentials from Mac (run on Mac):
scp ~/.cloudflared/58339d22-d0be-4fab-94d6-32fd24b04a72.json \
    ubuntu@<LIGHTSAIL-IP>:/home/ubuntu/

# On VM: install as systemd service
sudo mkdir -p /etc/cloudflared
sudo mv ~/58339d22-d0be-4fab-94d6-32fd24b04a72.json /etc/cloudflared/
# Create config.yml pointing to localhost:3000
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

Validation: `cloudflared tunnel info 58339d22-d0be-4fab-94d6-32fd24b04a72` — should show the running connector on the new VM. `brain.arunp.in` will route to the new VM immediately.

**Confidence:** HIGH — this is the standard named tunnel portability pattern. Zero client changes required. [CITED: developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/]

### Steps for Hetzner CAX11 (Ubuntu 22.04, ARM64)

Identical to Lightsail, but use the ARM64 package:
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb \
  -o /tmp/cloudflared.deb
# rest of steps identical
```

### Steps for Oracle Free (Ubuntu 22.04, ARM64)

Same as Hetzner ARM64 path above.

---

## SQLite Compatibility Matrix

| Stack component | x86_64 Ubuntu 22.04 | ARM64 Ubuntu 22.04 | Notes |
|-----------------|--------------------|--------------------|-------|
| `better-sqlite3` | ✓ prebuilt | ✓ prebuilt | Prebuilt binaries for both arches, Node 20+ |
| `sqlite-vec` vec0.so | ✓ prebuilt | ✓ prebuilt | linux-x86_64 and linux-arm64 published on GitHub releases |
| glibc requirement | 2.35 (≥ 2.28 ✓) | 2.35 (≥ 2.28 ✓) | Ubuntu 22.04 ships glibc 2.35 on both arches |
| SQLite WAL on NVMe | ✓ excellent | ✓ excellent | Local/NVMe path (Hetzner, Oracle) |
| SQLite WAL on EBS | ✓ acceptable | N/A | Lightsail uses EBS; WAL works; fsync ≥ 0.5 ms |

[ASSUMED — glibc version from Ubuntu 22.04 release notes; better-sqlite3 and sqlite-vec binary availability from their respective GitHub release pages in training data. Verify with `ldd --version` after provisioning.]

---

## Latency Summary (India perspective)

| Host | Data center | Est. RTT to Mumbai | Source |
|------|------------|-------------------|--------|
| AWS Lightsail | Mumbai (ap-south-1) | 5–15 ms | [ASSUMED — same-region within India] |
| DigitalOcean | Bangalore (BLR1) | 10–20 ms | [ASSUMED — within India] |
| Oracle Free | Mumbai (ap-mumbai-1) | 5–15 ms | [ASSUMED — same city] |
| Fly.io | Chennai (maa) | 20–40 ms | [ASSUMED — south India region] |
| Hetzner | Helsinki/Nuremberg | 120–180 ms | [ASSUMED — EU to India standard RTT] |
| Railway/Render | US/EU | 150–250 ms | [ASSUMED] |

For the Ask (RAG) UX, the Cloudflare tunnel means the user's phone always exits through the nearest CF PoP (Mumbai, ~5 ms). The tunnel-to-origin leg adds the RTT above. For Lightsail/Oracle/DO the additional latency is negligible. For Hetzner it adds ~300 ms to round-trip latency — perceptible but acceptable for a streaming response.

---

## Recommendation

### Primary: AWS Lightsail 2 GB, Mumbai ap-south-1 — $10/mo

Best combination of: India latency (Mumbai datacenter), confirmed pricing, well-documented Lightsail + cloudflared path, no signup friction beyond a standard AWS account, clean billing, sqlite-vec / better-sqlite3 fully compatible on x86_64 Ubuntu 22.04.

Use IPv6-only ($10) if you're comfortable with IPv6-only egress (the Cloudflare tunnel does not require a public IPv4 on the origin). If you want direct SSH from your Mac without IPv6 configuration, pay the extra $2 for IPv4 ($12/mo).

### Budget alternative: Hetzner CAX11 — ~$4.10/mo

Half the cost, 4 GB RAM (double), 20 TB bandwidth. Accept ~300 ms additional Ask latency vs Lightsail. Technically superior in every dimension except India proximity. If latency is less important than cost, Hetzner wins.

### Free tier path: Oracle A1 Ampere (Mumbai) — $0 if signup works

Attempt first if you have an Indian credit card (Visa/Mastercard). Budget 60 minutes. If it works, it's the right answer. If rejected at card validation or "tenancy creation failed", abandon immediately and go to Lightsail.

---

## Decision Table

| Priority | Choose |
|----------|--------|
| Latency first, cost within $5–15 | **Lightsail Mumbai $10** |
| Cost first, latency acceptable +300 ms | **Hetzner CAX11 ~$4** |
| Free is fine, willing to fight signup | **Oracle Free (Mumbai) → fallback to Lightsail** |
| Already have DO account | **DO Bangalore $12** (equivalent to Lightsail at slightly higher cost) |

---

## Sources

| Source | Confidence | Used For |
|--------|-----------|----------|
| aws.amazon.com/lightsail/pricing/ (fetched 2026-05-12) | VERIFIED | Lightsail pricing, bandwidth, Mumbai note |
| developers.cloudflare.com/cloudflare-one/connections/connect-networks/ | CITED | Tunnel portability claim |
| Hetzner, DO, Oracle, Fly, Railway, Render pricing | ASSUMED | Training data; verify before purchase |
| glibc 2.35 on Ubuntu 22.04 | ASSUMED | Ubuntu release notes in training data |
| better-sqlite3 / sqlite-vec ARM64 support | ASSUMED | Their GitHub release pages in training data |
| Oracle signup friction | ASSUMED | r/selfhosted / HN threads in training data, 2024-2025 |
| India RTT estimates | ASSUMED | Standard networking baselines |

> [ASSUMED] claims above are confident enough for planning purposes but should be spot-checked before commit. The one that most needs live verification: Oracle Free Tier A1 availability in Mumbai in 2026 (capacity may be sold out even if signup succeeds).
