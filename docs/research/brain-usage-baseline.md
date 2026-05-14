# Brain Usage Baseline — S-1 output

**Date measured:** 2026-05-12
**Data source:** `data/brain.sqlite` + `data/backups/2026-05-11_2344.sqlite` (the most recent full-journal backup)

---

## Punchline

**Brain has essentially zero production usage.** 2 items (1 note, 1 URL) across 2 active days in 2 months of existence. 14 total LLM calls ever (11 Ask + 3 enrichment). 1 chunk in the vector index. Zero chat threads. No YouTube items yet.

**Implication for the cloud migration:** cost projections for AI APIs at current usage are pennies, not dollars. The cloud VM cost dominates. Even a 100× usage increase post-migration still sits in the "< $10/month" envelope.

## Snapshot

| Metric | Value |
|---|---|
| DB file size (live) | 184 KB |
| DB file size (latest backup with real content) | 3.4 MB (mostly pre-allocated sqlite-vec empty pages; actual data ~40 KB) |
| Total items | 2 (note: 1, url: 1, youtube: 0, pdf: 0) |
| First capture | 2026-05-07 |
| Last capture | 2026-05-11 |
| Active days (≥1 capture) | 2 |
| Total chunks | 1 |
| Chat threads | 0 |
| Chat messages | 0 |

## LLM usage to date (entire lifetime)

| Purpose | Calls | Input tokens | Output tokens |
|---|---|---|---|
| ask | 11 | 1,687 | 287 |
| enrichment | 3 | 2,804 | 826 |
| **Total** | **14** | **4,491** | **1,113** |

At Claude Haiku 4.5 rates (2026-05-12: $1/M in, $5/M out), that's:
- 4,491 × $1/M = $0.0045
- 1,113 × $5/M = $0.0056
- **Lifetime cost: ~$0.01 if we had been using the API**

## Hourly distribution

- Captures between 21:00–22:00 local. No other hours populated. Too little data to derive a real pattern.

## Projected volume post-migration

Usage today is so low that "daily rate" is meaningless. Sensible projections for cost modeling:

| Scenario | Captures/mo | Enrichment tokens/mo | Ask tokens/mo | Cost @ Haiku rates |
|---|---|---|---|---|
| Low use (like today) | 5 | 10k | 5k | $0.05 |
| Moderate use (1/day) | 30 | 60k | 30k | $0.30 |
| Heavy use (5/day) | 150 | 300k | 150k | $1.50 |
| Very heavy (YouTube bulk) | 500 | 1M | 500k | $5 |

**Takeaway: API cost is noise.** The cloud host is the real cost driver (€3.79–10/month).

## Storage growth projection

Actual content is ~40 KB for 2 items = 20 KB/item. Over-generous projection: 100 KB/item (for future YouTube transcripts, which are larger). At 5 items/day:
- 1 month: 15 MB
- 1 year: 180 MB
- 5 years: 900 MB

Any cloud VM with a default 40 GB disk has 5+ years of headroom.

## Idle-window pattern

Not enough data to derive an idle window. Since usage is effectively zero, the VM is idle 99% of the time. Auto-sleep / scale-to-zero strategies would save almost the full VM cost, but add operational complexity (cold-start latency when you capture something). Recommendation: don't bother at this scale; pay the $5/month and keep it simple.

## Confidence caveats

1. **The 2-item dataset is not representative of post-migration usage.** The user held back because Brain requires an awake Mac. Post-migration rate could be 10–50× higher as friction drops.
2. **YouTube capture just shipped (v0.5.1, 2026-05-12).** Zero items of that type in the baseline. Transcripts are 5–50× larger than article bodies; this shifts enrichment cost upward.

## Conclusion

**S-1 is effectively done early** because the answer is "any cloud architecture at $3–10/month is cheap relative to even the wildest usage you're likely to throw at Brain in year 1."

**S-2 (current shadow cost)** is also short-circuited: Brain has consumed negligible electricity / GPU time on the Mac. The shadow cost is < $1/month. Any cloud path is a strict increase in direct cost, offset by the "always-on" value.

**S-9 (cost optimization)** collapses to a right-sizing exercise — pick the cheapest VM tier that runs the stack reliably; don't over-engineer cost controls.

**What still matters:** S-3 (enrichment flow design — user wants it), S-4 (AI provider quality), S-6 (cloud host choice), S-7 (migration runbook), S-8 (privacy ToS).
