# SPIKE-006 — Can Brain Score Capture Quality Repeatably?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-006 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 3-4h; actual about 45m including harness iteration |
| **Triggered by** | Capture quality recommendation report and user request to execute spikes |
| **Blocks** | v0.7.5 capture-quality data model, platform router, regression checks |
| **Verdict** | CLEAR |

## Question

Can Brain objectively measure capture quality across YouTube videos, YouTube Shorts, LinkedIn links, Substack links, generic articles, JS-heavy pages, and expected failures without mutating production data?

## Method

Created public fixture manifest:

```text
data/spikes/capture-quality/fixtures.json
```

Created spike harness:

```text
scripts/spikes/capture-quality-lib.mjs
scripts/spikes/capture-quality-eval.mjs
```

The harness runs the current Brain extractors against each fixture and records JSONL evidence with:

- success/failure
- body length and word count
- title/author/source URL presence
- published date, thumbnail, and description presence
- transcript timestamp count
- capture-quality guess
- 0-5 score
- error code and elapsed time

Two baseline runs were completed after scoring adjustments:

```text
data/spikes/capture-quality/results/capture-eval-2026-06-10_11-10-12.jsonl
data/spikes/capture-quality/results/capture-eval-2026-06-10_11-13-53.jsonl
```

The second run is the canonical evidence file for this report.

## Evidence

Baseline summary from `capture-eval-2026-06-10_11-13-53.jsonl`:

| Platform | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| YouTube videos | 5 | 0 | 3.60 | 14,880 |
| YouTube Shorts | 5 | 0 | 1.80 | 1,586 |
| Substack | 8 | 0 | 4.38 | 8,431 |
| LinkedIn | 5 | 0 | 3.00 | 2,202 |
| Generic articles | 3 | 0 | 4.33 | 25,950 |
| JS-heavy pages | 3 | 0 | 3.67 | 5,470 |
| Expected failures | 3 | 1 | 1.33 | 79 |

The first and second baseline runs produced the same platform averages except for a small LinkedIn body-length drift caused by live page content changing from 2,195 to 2,202 average characters.

The scoring rubric originally underrated short user-provided social/email bodies. The harness was adjusted so explicit user action with at least 20 words becomes `user_provided_full_text` and scores 4. This matters for LinkedIn selection capture and Substack email capture.

## Findings

The harness is good enough to become the backbone of capture regression testing.

It cleanly separates:

- transcript-rich YouTube videos
- weak Shorts
- strong article captures
- metadata/preview captures
- invalid URL failures
- explicit user-provided content

The fixture set is intentionally public. Private/personal examples still need sanitized additions before finalizing production acceptance thresholds.

The biggest measurement lesson is that "long body" cannot be the only proxy for quality. A complete 60-word LinkedIn post is a better capture than a 1,000-word login-wall scrape. The scoring model now accounts for that by considering extraction method and user intent.

## Implementation Recommendation

Proceed with a productionized version of the harness as a non-user-facing regression tool.

Recommended follow-up:

- Move score logic into `src/lib/capture/quality.ts`.
- Add `source_platform`, `capture_quality`, and `extraction_method` fields to captured item metadata.
- Keep spike fixtures public and add sanitized private examples only when the user explicitly provides them.
- Add a script such as `npm run smoke:capture-quality` that runs without touching `data/brain.sqlite`.
- Use this harness before changing YouTube, Substack, LinkedIn, or provider fallback behavior.

## Risks / Gaps Surfaced

- The score is deterministic but still heuristic.
- Live web pages can drift, especially LinkedIn and Substack.
- Private paid Substack emails were not available.
- No real user-provided LinkedIn text was used; paste samples were synthetic.
- Scores should be reviewed once real capture-quality labels exist in the app.
