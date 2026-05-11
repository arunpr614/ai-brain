# S-9: Cost optimization + sensitivity analysis

**Estimated effort:** 1 hour
**Depends on:** S-1..8 all complete
**Produces:** the final monthly cost estimate with sensitivity bands + remaining cost-reduction levers to pull if needed.

---

## 0. Why this spike

After all prior spikes, we have a proposed architecture. This spike is the final check: **at Brain's actual (S-1) usage, with the recommended host (S-6) and AI provider (S-4) and enrichment strategy (S-3), what does it cost per month — and where else can we squeeze?**

## 1. Questions to answer

### 1.1 Consolidated monthly cost

Assemble every component from prior spikes into one bill:

| Item | From spike | Monthly $ | Notes |
|---|---|---|---|
| Cloud VM | S-6 | | |
| AI API — enrichment (batch) | S-3 + S-4 | | 50% off list |
| AI API — Ask (realtime) | S-4 | | Full price |
| Embeddings | S-5 | | Local or hosted |
| Backup storage (B2 / S3) | S-7 | | Cents-level |
| Bandwidth overage | S-6 | | Usually $0 |
| **Total** | — | **$X** | |

Give a point estimate plus a "± 30%" band driven by usage variability.

### 1.2 Sensitivity analysis

What happens to the bill if:
- Usage 2× (you get into it)
- Usage 10× (you start sharing with a team — hypothetical)
- Long videos become 40% of captures (transcripts are bigger than articles; drives embedding + enrichment tokens)
- AI provider raises prices 20% (happens; pricing is not contractual)
- Cloud host raises prices 20%
- YouTube blocks the cloud VM IP for the InnerTube call and you have to add a proxy rotation ($10/month)

### 1.3 Cost-reduction levers (ranked by effort × impact)

After the architecture is locked, these are the remaining dials to turn:

1. **Switch to Google Gemini Flash-Lite for enrichment** — if S-4 didn't already pick it, Flash-Lite is often cheapest
2. **Aggressive prompt trimming** — drop `quotes` from enrichment output (saves output tokens); reduce 12k body cap to 8k
3. **Skip enrichment for short items** — <300 chars already skipped; raise to <800
4. **Cache embeddings for repeated content** — dedup by content hash; useful if you re-capture
5. **Run batch at low-demand hours of the provider** — Anthropic's Batches API is 24-hour turnaround regardless; OpenAI same; no win here
6. **Use a cheaper embedding model** — 512 dim instead of 768; may degrade retrieval quality
7. **Cloud-host switch if load is lower than provisioned tier** — "you bought 2 GB; you're using 700 MB"

Each: estimated monthly savings × implementation effort.

### 1.4 "When do I stop squeezing?"

Set a cost-floor beyond which further optimization isn't worth the complexity. Opinion: if total bill is < $5/month, don't optimize further — the engineering time costs more than the $/month savings.

### 1.5 Cost-trigger alerting

- If monthly bill exceeds $X, what alerts fire and where?
- LLM provider usage alert: most providers offer per-month caps (Anthropic yes, OpenAI yes, Gemini yes)
- Cloud host billing alert: all big hosts offer this; configure it

Default policy: hard-cap API spend at 3× expected monthly bill; soft-cap cloud at 2×.

### 1.6 The "whoops I went viral" scenario

Brain is single-user. Even if some link gets shared publicly and 1k requests come in, the tunnel + Cloudflare CDN handle it, and the backend only does work for authenticated bearer requests. **DDoS is unlikely to be expensive because the backend doesn't do expensive work for unauthed requests.** Worth verifying: is `/api/health` expensive? Check.

## 2. Sources to consult

- All prior spike outputs
- Anthropic usage dashboard (for API cap configuration)
- Cloud host billing alerts UI

## 3. Output format

`docs/research/v0.6.0-cost-summary.md`:

```markdown
# v0.6.0 Monthly Cost Summary

## Point estimate
$X.XX/month total.

## Breakdown
[consolidated table]

## Sensitivity
| Scenario | New total |
|---|---|
| Usage 2× | $Y |
| Usage 10× | $Z |
| Price hike 20% | $W |
| Long videos 40% | $V |

## Remaining cost levers (ranked)
1. ...
2. ...
3. ...

## Alerting setup
- Anthropic: monthly cap = $X
- Cloud host: billing alert at $Y
- Bandwidth alert at Z GB

## Stop-squeezing threshold
$5/month — below this, further optimization isn't worth engineering time.
```

## 4. Success criteria

- [ ] Consolidated monthly bill with breakdown
- [ ] Sensitivity across at least 4 scenarios
- [ ] 3+ cost-reduction levers ranked
- [ ] Alert thresholds configured OR documented for setup post-deploy

## 5. Open questions for the user

1. **What's the budget ceiling that triggers "pause and rethink"?** ($15/month? $50?)
2. **Are you OK with 24-hour enrichment delay for the 50% batch discount, or does urgency sometimes matter?** (Already locked — daily batch + manual button. Just confirming.)

## 6. Execution note

This is a spreadsheet spike. One table, some arithmetic, and a ranked list. Produce concrete numbers, not hedged bands without data.
