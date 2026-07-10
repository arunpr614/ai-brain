# SPIKE-011 — Should Brain Add Third-Party Extraction Providers?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-011 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 4-8h; actual about 45m with keys missing for paid providers |
| **Triggered by** | Recommendation to evaluate Jina, Firecrawl, and Browserless |
| **Blocks** | Optional provider fallback decision |
| **Verdict** | DEFER |

## Question

Do Jina Reader, Firecrawl, or Browserless improve enough public-page captures to justify adding them as optional fallbacks?

## Method

Created spike script:

```text
scripts/spikes/extraction-provider-benchmark.mjs
```

Ran against:

- 5 public Substack posts
- 3 generic articles/docs
- 3 JS-heavy public pages

Providers attempted:

1. Local Brain Readability.
2. Jina Reader.
3. Firecrawl if `FIRECRAWL_API_KEY` exists.
4. Browserless if `BROWSERLESS_ENDPOINT` and `BROWSERLESS_TOKEN` exist.

Evidence file:

```text
data/spikes/capture-quality/results/extraction-provider-benchmark-2026-06-10_11-13-07.jsonl
```

Docs checked:

- Jina Reader converts URLs by adding `r.jina.ai` in front and has unauthenticated/basic usage limits: https://jina.ai/reader/
- Firecrawl scrape can return markdown/html/metadata but needs hosted API configuration for this benchmark: https://docs.firecrawl.dev/api-reference/endpoint/scrape

## Evidence

| Provider | Fixtures | Failures/Skipped | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Local Readability | 11 | 0 | 4.45 | 14,038 |
| Jina Reader | 11 | 0 | 4.00 | 35,248 |
| Firecrawl | 11 | 11 skipped | 0.00 | 0 |
| Browserless | 11 | 11 skipped | 0.00 | 0 |

Best-provider highlights:

| Fixture | Local Score | Jina Score | Winner |
|---|---:|---:|---|
| `substack-toolkit` | 5 | 4 | Local |
| `substack-slow-ai-comments` | 5 | 4 | Local |
| `substack-post-office-ai` | 5 | 4 | Local |
| `substack-quit-chatgpt` | 5 | 4 | Local |
| `substack-ai-freaking-out` | 5 | 4 | Local |
| `generic-paul-graham` | 5 | 4 | Local |
| `generic-nngroup-heuristics` | 5 | 4 | Local |
| `generic-chrome-activetab` | 3 | 4 | Jina |
| `js-react-learn` | 5 | 4 | Local |
| `js-notion-product` | 2 | 4 | Jina |
| `js-airtable-platform` | 4 | 4 | Tie |

Firecrawl and Browserless were not run because credentials/endpoints were not configured.

## Findings

Do not add a third-party provider as a default capture path.

Local Readability already performs well on the user's likely public Substack/generic article sources. Jina helps on some docs/JS-heavy marketing pages, especially Notion and Chrome docs, but it did not beat local extraction broadly enough to justify always sending URLs through a third-party service.

Jina is a plausible optional fallback for public URLs after local capture is weak or failed. It should not receive:

- LinkedIn pages
- private browser DOM
- pasted/selected content
- email captures
- anything with cookies/session data

Firecrawl and Browserless remain unvalidated until keys/endpoints are provided. Browserless is likely too heavy for the default personal capture path unless JavaScript rendering becomes a repeated blocker.

## Implementation Recommendation

Defer provider integration for v0.7.5 default capture.

If implemented later, add an optional provider fallback with strict gates:

- User-enabled setting.
- Public URLs only.
- Local capture runs first.
- Provider called only when local score is weak/failed.
- Never used for LinkedIn by default.
- Never used for user-provided private text/email/browser content.
- Store provider name and warning on the captured item.

Likely files if later:

```text
src/lib/capture/providers/jina.ts
src/lib/capture/provider-fallback.ts
src/app/settings/page.tsx
.env.example
```

## Risks / Gaps Surfaced

- Jina output is often longer and may include more boilerplate than local Readability.
- Provider privacy/cost tradeoffs remain real.
- Firecrawl/Browserless were not validated without credentials.
- Provider latency was noticeably higher during the live benchmark.
- Using third-party providers can make capture quality less reproducible.
