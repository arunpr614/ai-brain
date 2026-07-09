# SPIKE-012 — Should Brain Capture Paid Substack From Email?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-012 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 4-6h; actual about 25m because no real user emails were provided |
| **Triggered by** | Paid/subscriber Substack capture recommendation |
| **Blocks** | Manual email capture, later Gmail/inbound email decision |
| **Verdict** | INCONCLUSIVE-BUT-PROMISING |

## Question

Is email ingestion the best way to capture full paid/subscriber Substack posts?

## Method

Created synthetic sanitized samples:

```text
data/spikes/substack-email/samples/public-synthetic-newsletter.txt
data/spikes/substack-email/samples/paid-synthetic-newsletter.txt
```

Created parser spike:

```text
scripts/spikes/substack-email-ingestion.mjs
```

The parser extracts:

- subject as title
- sender as author/publication
- date
- canonical Substack URL
- cleaned body
- footer removal signal
- link count
- score

Evidence file:

```text
data/spikes/capture-quality/results/substack-email-ingestion-2026-06-10_11-13-28.jsonl
```

## Evidence

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Email body | 2 | 0 | 4.00 | 624 |

Both samples were synthetic and marked with:

```text
synthetic_sample = true
explicit_user_action = true
```

Both samples successfully produced:

- title
- sender
- date
- canonical URL
- cleaned body
- footer removed
- high-quality user-provided body score

## Findings

The parser mechanics are straightforward, and the user-provided email body path scores well.

However, this spike cannot prove real paid Substack value because no real sanitized paid emails were provided. The correct conclusion is promising but not proven.

The product path still looks right:

1. Start with manual email paste/upload.
2. Validate on real sanitized user examples.
3. Add Gmail/inbound automation only if manual capture is valuable but too annoying.

Manual email capture has strong privacy advantages over a Gmail integration:

- No mailbox-wide access.
- No recurring background sync.
- No OAuth/storage complexity.
- User explicitly chooses exactly what to save.

## Implementation Recommendation

Do not build Gmail integration yet.

Proceed with a small manual email/paste capture only after receiving 3-5 sanitized real examples from the user.

Recommended first implementation:

- `Paste email/article text` capture mode.
- Optional `source URL` field.
- Title field defaults from email subject or first line.
- Capture quality: `email_body` or `user_provided_full_text`.
- Store only cleaned body and user-supplied URL.
- Do not store full raw `.eml` by default.

Likely files:

```text
src/lib/capture/email.ts
src/lib/capture/substack-email.ts
src/app/api/capture/email/route.ts
src/app/capture/page.tsx
src/lib/capture/email.test.ts
```

## Risks / Gaps Surfaced

- Synthetic samples cannot validate real Substack email boilerplate.
- HTML emails need more careful link/image/body extraction than plain text.
- Paid email capture may include sensitive/private content; default raw artifact storage should be off.
- Gmail integration should require a separate explicit user decision.
