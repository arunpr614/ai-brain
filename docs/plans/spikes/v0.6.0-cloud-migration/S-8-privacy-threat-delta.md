# S-8: Privacy + threat model delta

**Estimated effort:** 1 hour
**Depends on:** S-4 (AI providers chosen), S-6 (cloud host chosen)
**Produces:** an updated threat model + the specific mitigations shipping in v0.6.0.

---

## 0. Why this spike

"Local-first" was a founding principle. Moving Brain to a cloud VM with API-based LLM calls breaks that in specific, namable ways. We should be honest about what changes, document it, and mitigate the parts that can be mitigated. Don't hand-wave.

## 1. Questions to answer

### 1.1 What leaves your hardware that didn't before?

List every data flow that changes:

| Data | Today (Mac + Ollama) | Post-migration |
|---|---|---|
| Captured article body | On Mac only | Sits on cloud VM; transits tunnel |
| LLM prompts (enrichment) | Mac → Ollama (local) | Cloud VM → Anthropic/OpenAI/etc. |
| LLM prompts (Ask questions) | Mac → Ollama (local) | Cloud VM → API |
| Embeddings (chunks → vectors) | Mac → Ollama (local) | Cloud VM → Ollama if kept; else → hosted embedding provider |
| Web fetches (Readability) | Mac → source website | Cloud VM → source website (your IP changes → website sees cloud IP) |
| YouTube InnerTube calls | Mac → YouTube | Cloud VM → YouTube (relevant to S-4's bulk-limit concern) |
| Backups | Local `data/backups/` | Cloud VM + possibly third-party object storage |
| Logs (`data/errors.jsonl`) | Mac local | Cloud VM; rotate + age-out policy needed |

### 1.2 Whom are we trusting now that we weren't?

- **Cloud host provider** — sees your VM's disk contents if they choose to inspect. Varies: Hetzner says they don't; Oracle similarly committed; Fly/AWS contractually obligated not to absent subpoena.
- **LLM API provider** — sees prompts + completions. Privacy terms per provider captured in S-4.
- **Embedding provider (if hosted)** — sees chunks. From S-5.
- **Object storage provider (if we use B2/S3 for backup)** — holds encrypted-or-not copies.
- **Cloudflare** — already in the trust boundary since v0.5.0; sees TLS metadata + traffic volumes. Doesn't see content because TLS termination is on the cloud VM.

### 1.3 Threat register — updated for cloud

| Threat | Likelihood | Impact | Mitigation (in v0.6.0) |
|---|---|---|---|
| Cloud host insider access to VM disk | Very low | High (full DB read) | Disk encryption at rest if host offers; else compensating backup encryption |
| LLM API provider subpoenaed → discloses prompts | Low | Medium (depends on content) | Provider choice (Anthropic's policies > some alternatives); don't send PII we don't need |
| LLM API provider quietly trains on inputs | Low (paid tier) | Medium | Hard provider-selection filter: "no training" confirmed in T&Cs |
| Cloudflare tunnel credentials stolen | Medium if VM compromised | Critical (full control of subdomain) | Credentials in `/etc/cloudflared/` 600 perms; rotate after any compromise |
| Bearer token leaked (from phone/extension) | Low | High (full write access to library) | Same mitigations as today; add rotation UI improvements |
| Cloud VM breaches the tunnel and acts maliciously | Low | Critical | Cloud VM is in your trust boundary; if it's compromised, everything is compromised. No mitigation beyond choosing a reputable host. |
| Backup bucket misconfigured (public read) | Low | Critical | Paranoid config review; versioning on; object-lock if paid |
| Website scraping bot-flags the cloud VM IP | Medium | Low | Documented limitation; can manually re-capture |

### 1.4 Data-at-rest encryption story

- VM disk: most hosts use whole-disk encryption (Hetzner yes, DO yes, Lightsail yes). Verify.
- SQLite DB: SQLite has optional encryption via SEE extension but it's paid + complex. Rely on disk encryption instead.
- Backups to B2/S3: enable server-side encryption (SSE-S3 / B2 default). Client-side encryption (gpg on the backup file) is stronger and worth considering.
- Logs: same as DB; disk encryption suffices.

### 1.5 Key rotation policy

- Bearer token: currently user-triggerable via `/settings/lan-info`. Keep this; no change.
- Cloudflare tunnel credentials: currently tied to the tunnel UUID. On migration, same credentials move to cloud VM; rotate after migration as belt-and-braces (revoke old, create new).
- API keys (AI provider): env var on cloud VM; document rotation procedure.

### 1.6 Explicit downgrades from "local-first"

Write them out plainly so they're never a surprise:

1. **Captured content transits cloud infrastructure.** An article you capture leaves your Mac → tunnel → cloud VM (stored) → LLM API (for enrichment) → returns to cloud VM. Three hops; any can fail closed or leak.
2. **Metadata collection.** LLM providers log API requests (token counts, timestamps, IP) per their own operational needs even if they don't train on content. This is a privacy deterioration even with "no training."
3. **No offline mode.** Today, Brain works if you're on a plane (Mac is local). Post-migration, the extension and APK stop working without internet. Ollama-local-fallback would preserve offline but costs complexity.

### 1.7 Mitigations we can actually ship

Rank by value:
1. Choose an LLM provider with explicit no-training terms (hard filter in S-4)
2. Use paid tier, not free tier (free tiers often have different data terms)
3. Encrypt backups client-side before uploading to B2/S3
4. Keep bearer token rotation UX accessible (already in v0.5.0)
5. Don't send full bodies to LLM if not needed (prompt-trim — may or may not be feasible given enrichment needs the body)
6. Document the trust boundary in the README so future-you knows what's exposed

## 2. Sources to consult

- Previous threat model in `v0.5.0-apk-extension-v2.md` §10 (just updated for tunnel; use as baseline)
- `src/lib/auth/bearer.ts` — current bearer semantics
- Anthropic / OpenAI / Gemini data usage & retention pages (capture dates in S-4)
- Cloud host data-center certifications (SOC 2 / ISO 27001 — mostly cosmetic for a single-user app but confirms a policy baseline)
- Litestream (if chosen in S-7) — confirm it supports encryption-at-rest

## 3. Output format

`docs/research/privacy-threat-delta.md`:

```markdown
# v0.6.0 Privacy & Threat Model Delta

## Data flows (before → after)
[table]

## Parties newly trusted
[list]

## Threat register (updated)
[table]

## Explicit downgrades from "local-first"
1. ...
2. ...
3. ...

## Mitigations shipping in v0.6.0

| # | Mitigation | Effort | Load-bearing? |
|---|---|---|---|

## What we decided NOT to do (and why)
[list]

## User-facing README update

<draft paragraph to add to README.md describing the new privacy story honestly>
```

## 4. Success criteria

- [ ] Every data flow that changes is enumerated
- [ ] Every new trusted party is named
- [ ] At least 5 threats with mitigations (not 15 hand-wavy ones)
- [ ] User-facing honest description of the downgrade (README update ready to paste)

## 5. Open questions for the user

1. **Will you accept "paid API with no-training ToS" as sufficient privacy?** (If not, hybrid options in S-5 become critical.)
2. **Client-side backup encryption (requires key management) or host-side encryption (trust host)?**
3. **Is offline-mode important?** (E.g., you're on a plane, want to read items locally but not capture / Ask.)

## 6. Execution note

This spike is ink-on-paper. No benchmarks. The output is a README paragraph + a threat table. 1 hour max.
