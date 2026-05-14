# v0.6.0 Privacy & Threat Model Delta

**Produced by:** S-8 spike  
**Date:** 2026-05-12  
**Baseline:** v0.5.0 threat model (`v0.5.0-apk-extension-v2.md §10`)

---

## Data flows (before → after)

| Data type | Today — Mac + Ollama | Post-migration — Cloud VM + Anthropic |
|---|---|---|
| Captured article body | Stored on Mac disk only | Stored on AWS Lightsail EBS disk (ap-south-1); transits Cloudflare tunnel in transit |
| LLM enrichment prompt (article body + metadata) | Mac → Ollama process (loopback, never leaves machine) | Cloud VM → Anthropic API (US endpoints); retained 30 days for abuse monitoring |
| LLM Ask prompt (RAG chunks + question) | Mac → Ollama process (loopback) | Cloud VM → Anthropic API (Sonnet 4.6, real-time); same 30-day retention |
| Embedding vectors (sqlite-vec chunks) | Mac → Ollama nomic-embed-text (loopback) | Cloud VM → Ollama on VM (loopback on remote host) — local Ollama assumed until S-5 spike concludes |
| Web fetches for Readability extraction | Mac IP → source website | Cloud VM IP (AWS ap-south-1) → source website; source sees AWS IP, not user's home IP |
| YouTube InnerTube API calls | Mac IP → YouTube | Cloud VM IP → YouTube; bulk usage may trigger YouTube bot-detection against the VM's IP |
| Database backups | `data/backups/` on Mac local disk | Cloud VM disk → gpg-encrypted tar → Backblaze B2 (us-west-002 region by default) |
| Error/access logs (`data/errors.jsonl`) | Mac local disk | Cloud VM disk; needs rotation/age-out policy to avoid unbounded growth |
| Bearer token (BRAIN_LAN_TOKEN) | Stored in Mac `.env` (chmod 600) | Stored in Lightsail VM `.env` (chmod 600); semantics unchanged |
| Cloudflare tunnel credentials | `~/.cloudflared/*.json` on Mac | Same credentials JSON copied to `/etc/cloudflared/` on VM (chmod 600); tunnel UUID unchanged |

---

## Parties newly trusted

**Pre-migration trust boundary:** Cloudflare (already accepted at v0.5.0 pivot for TLS termination and tunnel transport).

**Net-new parties added in v0.6.0:**

1. **AWS (Amazon Web Services) — ap-south-1 Mumbai**  
   Holds the VM, its attached EBS disk, and therefore the full SQLite database. AWS is contractually prohibited from accessing customer data absent a lawful order, and Lightsail disks are encrypted at rest by default (AWS-managed keys). SOC 2 Type II / ISO 27001 certified. Brain data resides in India under Indian data-residency law.

2. **Anthropic**  
   Receives every enrichment prompt (article body, title, source type) and every Ask query (RAG chunk text + user question). Anthropic's API customer terms explicitly do not train on inputs for paid-tier usage — no opt-in required. Inputs are retained for up to 30 days for abuse monitoring, then deleted. Source: `platform.claude.com` pricing + privacy pages, captured 2026-05-12.

3. **Backblaze B2**  
   Receives encrypted backup archives (gpg-encrypted before upload). Backblaze sees only opaque ciphertext — it cannot read article content, notes, or metadata without the gpg private key, which never leaves the VM. Backblaze is US-based (us-west-002 by default).

---

## Threat register (updated)

| # | Threat | Likelihood | Impact | Mitigation in v0.6.0 |
|---|---|---|---|---|
| T-1 | AWS insider or subpoena: full SQLite DB read from EBS disk | Very low | High — full library exposed | Lightsail EBS encrypted at rest (AWS-managed keys). Belt-and-braces: gpg backup encryption means a copy always exists that AWS cannot read. SQLite SEE not used (see §6). |
| T-2 | Anthropic API subpoena or breach: enrichment/Ask prompts disclosed | Low | Medium — article bodies + personal questions exposed | Chose Anthropic specifically for explicit no-training ToS and 30-day retention cap. Reduce prompt payload where feasible (titles and summaries instead of full bodies for enrichment, where quality permits). |
| T-3 | Anthropic quietly changes data policy without notice | Low (contractual; paid tier) | Medium | Monitor Anthropic changelog; API customer terms govern. If policy changes unfavorably, S-5 Ollama-embedding path and S-3 local-enrichment fallback are viable exits. |
| T-4 | Cloudflare tunnel credentials stolen from VM disk | Low; escalates to Medium if VM is compromised | Critical — attacker controls `brain.arunp.in` subdomain routing | Credentials at `/etc/cloudflared/*.json` chmod 600. Rotate credentials after migration as belt-and-braces (revoke old tunnel token, issue new). Rotate again after any suspected VM compromise. |
| T-5 | Bearer token leaked from phone or extension | Low | High — full write access to capture routes | 256-bit entropy token; `timingSafeEqual` comparison; 30/min rate limit per token. Rotation UX unchanged: `/settings/lan-info` QR + `scripts/rotate-token.sh`. |
| T-6 | Backblaze B2 bucket misconfigured as public-read | Low (single operator error) | Critical if unencrypted; None if encrypted | Backups are gpg-encrypted before upload (mitigation ships in v0.6.0). Paranoid config review: private bucket + no public ACLs. Versioning enabled; object lock considered for paid plan. |
| T-7 | Cloud VM IP flagged by websites as bot/datacenter | Medium — AWS IP ranges are well-known datacenter blocks | Low — capture fails for that URL; no data loss | Documented limitation. User can re-capture manually from Mac if needed. No mitigation planned; acceptable at single-user volume. |
| T-8 | VM compromised end-to-end (kernel exploit, supply chain, etc.) | Very low | Critical — all data + credentials exposed | No mitigation fully closes this; it is the residual risk of any cloud deployment. Compensating controls: OS security updates auto-applied, no open inbound ports (Cloudflare tunnel is outbound-only), no SSH exposed to public internet (use Lightsail browser console or VPC-restricted SSH). |

---

## Explicit downgrades from "local-first"

1. **Captured content now transits three providers instead of staying on one machine.** An article body travels: Mac → Cloudflare tunnel → AWS VM (stored) → Anthropic API (enrichment/Ask) → returns to VM. Any of these hops can fail closed or, in an adversarial scenario, leak. In the v0.5.0 local model, the article body never left the Mac.

2. **LLM inputs are retained by a third party for 30 days.** Anthropic retains API inputs for abuse monitoring. In the Ollama-local model, prompts and completions never left the machine and were never retained by any external party. The 30-day retention is bounded and policy-governed, but it is a real change in exposure.

3. **No offline mode.** With the Mac running Ollama locally, Brain worked on a plane — capture, Ask, enrichment all functioned without internet. Post-migration, the extension and APK require internet connectivity to reach the cloud VM. Offline capture and Ask are not available. Local Ollama on the VM does not help because the VM itself requires the network.

---

## Mitigations shipping in v0.6.0

| # | Mitigation | Effort | Load-bearing? |
|---|---|---|---|
| 1 | **Paid-tier Anthropic API with explicit no-training ToS** — hard filter applied in S-4 | Zero (provider selection) | Yes — eliminates training risk entirely |
| 2 | **Client-side gpg encryption before B2 upload** — backup archive encrypted on VM before leaving; Backblaze sees opaque ciphertext | Medium (backup script change) | Yes — removes B2 as a meaningful data custodian |
| 3 | **AWS Lightsail EBS disk encryption at rest** — enabled by default on all Lightsail instances; AWS-managed keys | Zero (default platform behavior) | Yes — protects against physical disk extraction |
| 4 | **No open inbound ports on VM** — Cloudflare tunnel is the sole ingress path; SSH access via Lightsail browser console or VPC-restricted IP only | Low (firewall config at provisioning) | Yes — eliminates direct internet attack surface on VM |
| 5 | **Bearer token rotation UX unchanged** — `/settings/lan-info` QR + `scripts/rotate-token.sh` accessible as in v0.5.0; rotate after migration and after any suspected compromise | Zero (already shipped) | Partial — limits blast radius if token leaks |
| 6 | **Cloudflare tunnel credential rotation post-migration** — revoke Mac-era token, issue new credentials on VM | Low (one cloudflared command) | Partial — eliminates stale credentials on Mac |

---

## What we decided NOT to do (and why)

- **SQLite SEE (Encryption Extension) for the database.** SEE is a paid Hwaci product ($2,000 license) and adds key-management complexity. AWS EBS encryption at rest achieves the same physical-access protection without application-layer changes. Not worth the cost or complexity for a single-user app.

- **Hosted embeddings (e.g., Voyage AI, OpenAI text-embedding-3).** S-5 is still pending; the decision is to keep Ollama running on the VM until S-5 concludes. This keeps article chunk content off a fourth provider's servers. If S-5 concludes that hosted embeddings are necessary, that decision inherits this threat register and adds a new row to §3.

- **End-to-end client-side encryption of the database before cloud storage.** This would require a client-held key, complex key management across the extension + APK + web UI, and would break server-side Ask/enrichment entirely (the server needs to read the DB). Not compatible with the app's architecture.

- **Zero-trust VPN (e.g., Tailscale) instead of Cloudflare tunnel.** Would eliminate Cloudflare as a party for traffic, but adds a fourth provider (Tailscale) and breaks the existing extension + APK integration that already works via `brain.arunp.in`. Net trust-boundary improvement is negligible; complexity cost is high.

---

## User-facing README update

> **Privacy posture (v0.6.0):** Brain runs on a private AWS cloud server in Mumbai (your data stays in India). Content you capture is stored on that server and sent to Anthropic's API for AI enrichment and search — Anthropic does not train on your data under their paid-API terms, and they delete inputs after 30 days. Backups are encrypted with your own key before they leave the server. Traffic between your phone/browser and the server travels through a Cloudflare tunnel (the same arrangement as v0.5.0). This is a deliberate step away from the original local-only model: your article bodies and search queries now transit three external services (Cloudflare, AWS, Anthropic) instead of staying on your Mac. The specific risks and all mitigations are documented in `docs/research/privacy-threat-delta.md`.
