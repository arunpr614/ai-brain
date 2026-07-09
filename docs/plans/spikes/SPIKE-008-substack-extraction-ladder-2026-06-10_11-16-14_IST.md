# SPIKE-008 — Should Substack Capture Be RSS-First?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-008 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 4-6h; actual about 50m including paywall detector fix |
| **Triggered by** | Substack capture quality recommendation |
| **Blocks** | Substack adapter design |
| **Verdict** | PROCEED-WITH-CHANGES |

## Question

Does RSS + JSON-LD materially outperform Brain's current generic Readability capture for public Substack posts?

## Method

Created spike script:

```text
scripts/spikes/substack-extraction-ladder.mjs
```

Ran against 8 public Substack-style fixtures from:

```text
data/spikes/capture-quality/fixtures.json
```

For each fixture, the script:

1. Fetched the page HTML.
2. Parsed Open Graph/meta tags.
3. Parsed JSON-LD.
4. Ran Readability.
5. Tried feed discovery:
   - `https://<host>/feed`
   - alternate feed links from page HTML
6. Tried to match RSS entry by canonical URL or slug.
7. Scored `readability`, `rss_entry`, `json_ld`, and `best_of_ladder`.

Evidence file:

```text
data/spikes/capture-quality/results/substack-extraction-ladder-2026-06-10_11-15-34.jsonl
```

Official Substack support says publication RSS feeds are available at `https://your.substack.com/feed`: https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication

## Evidence

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Readability | 8 | 0 | 4.13 | 8,431 |
| RSS entry | 8 | 7 | 0.38 | 971 |
| JSON-LD | 8 | 0 | 1.88 | 85 |
| Best of ladder | 8 | 0 | 4.13 | 8,575 |

Fixture-level highlights:

| Fixture | Readability Score | RSS Matched | JSON-LD Useful? | Best Source |
|---|---:|---|---|---|
| `substack-toolkit` | 3 | yes | weak | RSS, but only modestly |
| `substack-slow-ai-comments` | 5 | no | metadata only | Readability |
| `substack-post-office-ai` | 5 | no | metadata only | Readability |
| `substack-quit-chatgpt` | 5 | no | metadata only | Readability |
| `substack-ai-freaking-out` | 5 | no | metadata only | Readability |
| `substack-paid-example` | 3 | no | metadata only | Readability preview |
| `substack-chris-best` | 3 | no | metadata only | Readability preview |
| `substack-note-url` | 3 | no | empty | Readability preview |

The first pass over-reported paywalls because the full Substack page shell contains publication phrases like "paid subscribers." The script was corrected to detect paywalls from extracted article/feed body instead of raw page shell.

## Findings

The recommendation should change from "RSS-first" to "Readability-first with RSS/JSON-LD enrichment."

In this fixture set, current Readability was surprisingly strong for public Substack posts. RSS discovery was real, but matching a feed entry back to a specific post was brittle. Only 1 of 8 fixtures produced a matched RSS entry.

JSON-LD was consistently useful for metadata presence but rarely contained the full body. It should not be used as the body source unless it contains meaningful `articleBody`.

The best implementation is a ladder:

1. Fetch page.
2. Run Readability.
3. Extract Open Graph/meta/JSON-LD for title, author, date, image, description.
4. Try RSS as enrichment or fallback, not as the primary body source.
5. Label likely paid previews honestly.

## Implementation Recommendation

Proceed with a Substack adapter, but do not make RSS the primary source yet.

Recommended behavior:

- Detect Substack hosts and `substack.com/@...` URLs.
- Keep Readability as primary body extraction.
- Use JSON-LD/Open Graph to improve metadata.
- Attempt `/feed` and alternate feed discovery in the background.
- Use RSS only when it clearly matches the canonical post and produces a longer/cleaner body.
- Add `capture_quality = paywall_preview` only when the extracted body itself indicates locked content.

Likely files:

```text
src/lib/capture/substack.ts
src/lib/capture/opengraph.ts
src/lib/capture/jsonld.ts
src/lib/capture/rss.ts
src/lib/capture/substack.test.ts
```

## Risks / Gaps Surfaced

- The RSS matcher is too brittle for production as-is.
- Custom-domain Substacks need more real fixtures.
- Paid/subscriber posts were not validated with real user emails.
- Substack notes have different structure from posts and may deserve a separate path.
- Paywall detection should be conservative to avoid downgrading full public posts.
