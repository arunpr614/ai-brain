# SPIKE-009 — What Is The Safe LinkedIn Capture Path?

| Field | Value |
|---|---|
| **Spike ID** | SPIKE-009 |
| **Date** | 2026-06-10 11:16 IST |
| **Author** | AI agent (Codex) |
| **Time box** | Planned 4-8h; actual about 35m because no browser-DOM scraping was attempted |
| **Triggered by** | LinkedIn capture quality recommendation and platform risk |
| **Blocks** | LinkedIn adapter, save-selection strategy |
| **Verdict** | PROCEED-WITH-CHANGES |

## Question

Should Brain support full LinkedIn capture through server scraping, browser DOM extraction, manual paste, or selected-text capture?

## Method

Created spike script:

```text
scripts/spikes/linkedin-metadata-baseline.mjs
```

The script ran two safe validations:

1. Server metadata baseline for 5 public LinkedIn post URLs.
2. User-paste prototype using 3 synthetic LinkedIn post bodies.

It did not automate LinkedIn scrolling, login, DOM scraping, likes, comments, or feed traversal.

Evidence file:

```text
data/spikes/capture-quality/results/linkedin-safe-capture-2026-06-10_11-11-50.jsonl
```

Policy/technical docs checked:

- LinkedIn says it does not permit third-party crawlers, bots, browser plug-ins, or browser extensions that scrape, modify, or automate LinkedIn: https://www.linkedin.com/help/linkedin/answer/a1341387
- Chrome `activeTab` grants temporary access only after a user gesture: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome content scripts can read the page DOM, which is exactly why LinkedIn-specific extraction should be treated carefully: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

## Evidence

| Candidate | Fixtures | Failures | Avg Score | Avg Body Chars |
|---|---:|---:|---:|---:|
| Server metadata | 5 | 0 | 3.00 | 1,495 |
| User paste | 3 | 0 | 4.00 | 258 |

Server metadata rows all showed login-wall indicators, but still produced useful Open Graph/page preview text:

| Fixture | Score | Quality | Body Chars | Login-Wall Indicators |
|---|---:|---|---:|---|
| `linkedin-openai-privacy` | 3 | preview | 1,158 | yes |
| `linkedin-openai-collaboration` | 3 | preview | 1,573 | yes |
| `linkedin-chatgpt-posts` | 3 | preview | 1,078 | yes |
| `linkedin-atlas-use-cases` | 3 | preview | 1,439 | yes |
| `linkedin-federal-sales` | 3 | preview | 2,228 | yes |

User-paste rows:

| Fixture | Score | Quality | Body Chars |
|---|---:|---|---:|
| `linkedin-paste-synthetic-1` | 4 | user_provided_full_text | 268 |
| `linkedin-paste-synthetic-2` | 4 | user_provided_full_text | 263 |
| `linkedin-paste-synthetic-3` | 4 | user_provided_full_text | 242 |

## Findings

Server-side LinkedIn capture is good enough for a bookmark/preview, not a deep knowledge capture.

Explicit user-provided text gives the best quality with the least platform risk. The key product move is not "scrape LinkedIn better"; it is "make it effortless for the user to save exactly the visible text they care about."

Chrome's `activeTab` and content script model could support a generic "Save selected text + URL + title" action after a user gesture. That should be built as a generic web capture feature, not as LinkedIn-specific DOM extraction.

LinkedIn-specific browser DOM extraction remains blocked unless the user explicitly accepts the platform risk later. Even then, it should not be the default path.

## Implementation Recommendation

Proceed with:

1. LinkedIn URL adapter that saves server metadata as `metadata_only` or `preview`.
2. Manual paste capture for LinkedIn posts.
3. Generic save-selection capture:
   - URL
   - page title
   - selected text only
   - explicit user action
   - no LinkedIn-specific selectors
   - no cookies/session storage
   - no feed traversal

Recommended files:

```text
src/lib/capture/linkedin.ts
src/lib/capture/opengraph.ts
src/lib/capture/user-provided.ts
src/app/api/capture/note/route.ts
src/app/api/capture/url/route.ts
```

Potential later extension files:

```text
extensions/chrome/manifest.json
extensions/chrome/service-worker.ts
extensions/chrome/content-script.ts
```

## Risks / Gaps Surfaced

- LinkedIn metadata may drift or become more restricted.
- The paste examples were synthetic, not user-provided real posts.
- A browser extension can still be risky if it is LinkedIn-specific or auto-extracts DOM.
- The UI must clearly label server-side LinkedIn captures as preview/metadata, not full text.
