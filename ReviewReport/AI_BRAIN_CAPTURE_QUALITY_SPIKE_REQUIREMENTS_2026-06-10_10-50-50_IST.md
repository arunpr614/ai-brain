# AI Brain Capture Quality Spike Requirements

**Created:** 2026-06-10 10:50:50 IST  
**Author:** Codex  
**Based on:** `ReviewReport/AI_BRAIN_CAPTURE_QUALITY_RECOMMENDATIONS_2026-06-10_10-44-28_IST.md`  
**Purpose:** Decide which capture-quality recommendations need validation spikes, then define detailed spike designs and execution requirements.  
**Scope:** YouTube videos, YouTube Shorts, LinkedIn links, Substack links, capture-quality data model, raw capture artifacts, optional extraction providers, and evaluation harness.

---

## 1. Executive Answer

Yes, Brain should run spikes before implementing the full capture-quality roadmap.

The recommendation report contains two kinds of work:

1. **Low-risk product plumbing that can be implemented directly.**
   - Platform router.
   - Basic capture-quality labels.
   - Library/detail UI badges.
   - Telegram acknowledgement language.
   - LinkedIn metadata-only server fallback.

2. **Unknowns that should be validated before committing to a bigger design.**
   - How much value YouTube Data API metadata adds beyond InnerTube/oEmbed.
   - How often Substack RSS contains full content versus preview/truncated content.
   - Whether LinkedIn full-text capture should be manual paste only, browser-extension based, or deferred for compliance reasons.
   - Whether raw artifact storage is worth the schema and backup cost.
   - Whether Firecrawl/Jina/Browserless improve enough public-page captures to justify privacy/cost/dependency tradeoffs.
   - Whether Substack email ingestion is the best paid-newsletter path.
   - How to measure "capture quality" objectively enough to prevent regressions.

Recommended sequencing:

1. Run **CQ-SPIKE-001 Capture Evaluation Harness** first.
2. Run **CQ-SPIKE-002 YouTube Metadata Ladder** and **CQ-SPIKE-003 Substack RSS/JSON-LD Ladder** next.
3. Run **CQ-SPIKE-004 LinkedIn Safe Capture Path** before building any LinkedIn full-text capture.
4. Run **CQ-SPIKE-005 Raw Artifact Storage** before adding artifact persistence.
5. Run **CQ-SPIKE-006 Third-Party Extraction Provider Benchmark** only after local/source-specific extraction has baseline scores.
6. Run **CQ-SPIKE-007 Substack Email Ingestion** if paid/subscriber Substack captures are important immediately.

---

## 2. What Does Not Need A Spike

These are safe to implement directly because they are local, reversible, and already supported by the codebase shape.

| Recommendation | Spike Needed? | Reason |
|---|---:|---|
| Add `source_platform` detection for YouTube/Substack/LinkedIn/generic | No | Pure URL classification; deterministic unit tests are enough. |
| Add `capture_quality` labels to DB and UI | No | Straightforward schema/UI plumbing; values can be refined later. |
| Show metadata-only/full-text/transcript labels in Library and detail pages | No | Low-risk display work. |
| Save LinkedIn server captures as metadata-only when body is not available | No | This is safer than current generic failure/unreadable behavior. |
| Improve Telegram messages for weak captures | No | Copy/UX update with tests. |
| Keep v0.7.4 YouTube oEmbed anti-bot fallback | No | Already implemented locally and covered by tests. |

These should be part of the next implementation plan even if spikes are still running.

---

## 3. Spike Index

| Spike ID | Title | Decision It Unlocks | Time Box | Expected Verdict Type |
|---|---|---|---:|---|
| CQ-SPIKE-001 | Capture Evaluation Harness | How to score capture quality before changing extractors | 3-4h | CLEAR / PROCEED |
| CQ-SPIKE-002 | YouTube Metadata Ladder | Whether to add YouTube Data API and structured metadata body | 4-6h | PROCEED / SKIP API |
| CQ-SPIKE-003 | Substack RSS + JSON-LD Ladder | Whether RSS-first extraction is materially better than Readability | 4-6h | PROCEED / MODIFY |
| CQ-SPIKE-004 | LinkedIn Safe Capture Path | Whether full LinkedIn capture should be paste, extension, or deferred | 4-8h | PROCEED / BLOCKER |
| CQ-SPIKE-005 | Raw Artifact Storage | Whether artifact persistence belongs in v0.7.5 or later | 3-5h | PROCEED / DEFER |
| CQ-SPIKE-006 | Third-Party Extraction Provider Benchmark | Whether Jina/Firecrawl/Browserless should be optional fallbacks | 4-8h | PROCEED / DEFER |
| CQ-SPIKE-007 | Substack Email Ingestion | Whether email ingestion is the best paid Substack path | 4-6h | PROCEED / DEFER |

---

## 4. Shared Spike Execution Rules

### Safety Rules

- Do not commit, deploy, or mutate production data during spikes.
- Do not store real cookies, tokens, LinkedIn session data, Gmail credentials, or Substack session data.
- Do not use fake accounts.
- Do not run automated LinkedIn scraping from Hetzner.
- Do not create permanent Library items unless the spike explicitly says to use a temporary SQLite DB.
- Use `BRAIN_DB_PATH` pointing at a temporary DB for any capture-pipeline execution.
- If a spike uses live external services, record exact URLs tested and the timestamp.

### Output Rules

Each executed spike should produce one follow-up report in:

```text
docs/plans/spikes/
```

Suggested naming:

```text
SPIKE-006-capture-evaluation-harness.md
SPIKE-007-youtube-metadata-ladder.md
SPIKE-008-substack-extraction-ladder.md
SPIKE-009-linkedin-safe-capture-path.md
SPIKE-010-capture-artifact-storage.md
SPIKE-011-extraction-provider-benchmark.md
SPIKE-012-substack-email-ingestion.md
```

Use the existing spike report structure from `docs/plans/spikes/README.md`.

### Fixture Rules

Create a local fixture manifest:

```text
data/spikes/capture-quality/fixtures.json
```

Do not check in private/personal fixture content unless it is intentionally sanitized.

Fixture shape:

```json
{
  "youtube": [
    {
      "id": "yt-public-transcript-1",
      "url": "https://www.youtube.com/watch?v=...",
      "expected": ["title", "channel", "duration", "transcript"]
    }
  ],
  "substack": [],
  "linkedin": [],
  "generic": []
}
```

---

## 5. CQ-SPIKE-001 — Capture Evaluation Harness

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-001 |
| **Title** | Capture Evaluation Harness |
| **Time box** | 3-4 hours |
| **Blocks** | All capture-quality implementation decisions |
| **Primary question** | How will Brain objectively measure whether a capture is good enough? |
| **Recommended verdict target** | CLEAR |

### Hypothesis

Brain can score capture quality with a small deterministic harness that checks completeness, body quality, metadata presence, and extraction method. This harness will make YouTube/Substack/LinkedIn spike results comparable.

### Why This Spike Is Needed

Without a scoring harness, each platform spike becomes subjective. The recommendation report talks about `full_text`, `metadata_only`, `paywall_preview`, `transcript`, and `client_dom`, but the code needs concrete acceptance gates.

### Inputs

- Current extractors:
  - `src/lib/capture/url.ts`
  - `src/lib/capture/youtube.ts`
- Current tests:
  - `src/lib/capture/youtube.test.ts`
  - existing URL capture route tests
- Recommendation report:
  - `ReviewReport/AI_BRAIN_CAPTURE_QUALITY_RECOMMENDATIONS_2026-06-10_10-44-28_IST.md`

### Required Fixture Set

Minimum fixtures:

- 3 YouTube videos with transcripts.
- 3 YouTube Shorts.
- 5 public Substack posts.
- 3 LinkedIn public URLs.
- 3 generic articles that currently work with Readability.
- 3 pages expected to fail or produce metadata-only output.

Use public links first. Private examples may be represented by sanitized saved HTML/text files.

### Execution Design

Create a spike-only script:

```text
scripts/spikes/capture-quality-eval.mjs
```

The script should:

1. Read `data/spikes/capture-quality/fixtures.json`.
2. Run the current capture method for each fixture.
3. Produce JSONL output:

```text
data/spikes/capture-quality/results/capture-eval-<timestamp>.jsonl
```

4. Compute these metrics:
   - `success`: boolean
   - `body_chars`
   - `word_count`
   - `title_present`
   - `author_present`
   - `source_url_present`
   - `published_at_present`
   - `thumbnail_present`
   - `description_present`
   - `transcript_timestamp_count`
   - `link_count`
   - `capture_quality_guess`
   - `error_code`
   - `elapsed_ms`

5. Print a summary table by platform.

### Suggested Scoring Rubric

| Score | Label | Definition |
|---:|---|---|
| 5 | Excellent | Full body/transcript plus useful metadata; ready for RAG. |
| 4 | Good | Full body/transcript but sparse metadata; usable. |
| 3 | Acceptable | Meaningful preview or metadata-rich capture; searchable but weak for deep Ask. |
| 2 | Weak | Metadata-only with title/URL/author; useful only as bookmark. |
| 1 | Poor | Very short, boilerplate, or ambiguous capture. |
| 0 | Failed | No item could be captured. |

### Expected Results

- A repeatable baseline for current Brain capture quality.
- A clear "before" score for YouTube, Shorts, LinkedIn, and Substack.
- A reusable harness for later spikes.

### Decision Gates

Proceed to platform adapters if:

- The harness can run without production mutation.
- Results are stable across two runs for static fixtures.
- The scoring output can distinguish transcript/full text/metadata-only/failure.

Modify the harness if:

- Scores are mostly subjective.
- The fixture set is too small to reveal platform differences.

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-006-capture-evaluation-harness.md
```

Include:

- fixture list
- script path
- sample result rows
- baseline scores
- changes recommended for later implementation plans

---

## 6. CQ-SPIKE-002 — YouTube Metadata Ladder

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-002 |
| **Title** | YouTube Metadata Ladder |
| **Time box** | 4-6 hours |
| **Blocks** | YouTube rich metadata adapter and Shorts quality work |
| **Primary question** | Does YouTube Data API metadata materially improve capture quality over InnerTube + oEmbed? |
| **Recommended verdict target** | PROCEED-WITH-CHANGES |

### Hypothesis

Adding YouTube Data API metadata and a structured body header will improve retrieval quality for both normal videos and Shorts, even when transcripts are unavailable.

### Why This Spike Is Needed

The recommendation report suggests YouTube Data API metadata, but the current code already has InnerTube metadata and oEmbed fallback. The spike should prove whether the official API adds enough value to justify adding an API key, caching, quota handling, and new tests.

### Prerequisites

- Optional: a Google Cloud API key with YouTube Data API enabled.
- If no API key is available, run the spike in "partial mode" with:
  - current InnerTube
  - current timed-text transcript
  - oEmbed
  - no official Data API comparison

### Fixture Set

Minimum:

- 3 normal YouTube videos with captions.
- 3 normal YouTube videos without captions or where captions are unavailable.
- 5 Shorts.
- 2 videos that trigger Hetzner anti-bot metadata-only fallback if possible.
- 1 live/recent stream if available.

Include the three real IDs from the root-cause report if still useful:

```text
1PXH0mRhbwk
Owv503rTqYY
ib74sLgjIBM
```

### Execution Design

Create spike-only script:

```text
scripts/spikes/youtube-metadata-ladder.mjs
```

For each fixture:

1. Fetch oEmbed.
2. Fetch current InnerTube player result.
3. Fetch timed-text transcript if available.
4. If `YOUTUBE_DATA_API_KEY` exists, call `videos.list` for:
   - `snippet`
   - `contentDetails`
   - `status`
   - `statistics`
   - `player`
5. Build candidate body versions:
   - `current_transcript_only`
   - `metadata_header_plus_transcript`
   - `metadata_only`
6. Score each candidate using CQ-SPIKE-001 harness.

### Data To Record

For each video:

- URL and video ID.
- Source shape:
  - oEmbed fields present.
  - InnerTube fields present.
  - Data API fields present.
  - transcript present.
- duration from each source.
- title/channel agreement across sources.
- whether description contains chapters.
- candidate body char count and score.
- quota/cost estimate.
- errors and status codes.

### Expected Results

Likely:

- Data API adds description, published date, thumbnails, privacy/embeddable status, and sometimes better duration/status.
- InnerTube remains enough for transcript.
- oEmbed remains enough for fallback title/author.
- Shorts benefit disproportionately from Data API metadata because transcripts are often absent or too short.

### Decision Gates

Add YouTube Data API adapter if:

- At least 60% of sampled items gain useful metadata not already available from InnerTube/oEmbed.
- Shorts metadata-only score improves by at least 1 point on the 0-5 rubric.
- API failure can gracefully fall back without capture failure.

Skip/defer Data API if:

- InnerTube already provides nearly all useful metadata.
- API key/quota setup is too much friction for small gains.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/lib/capture/youtube-metadata.ts
src/lib/capture/youtube.ts
src/lib/capture/youtube.test.ts
.env.example
scripts/smoke-youtube-prod.mjs
```

Add:

- `YOUTUBE_DATA_API_KEY`
- metadata cache artifact
- structured YouTube body builder
- Shorts-specific `source_platform = youtube_short`

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-007-youtube-metadata-ladder.md
```

---

## 7. CQ-SPIKE-003 — Substack RSS + JSON-LD Extraction Ladder

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-003 |
| **Title** | Substack RSS + JSON-LD Extraction Ladder |
| **Time box** | 4-6 hours |
| **Blocks** | Substack adapter |
| **Primary question** | Does RSS + JSON-LD materially outperform generic Readability for public Substack posts? |
| **Recommended verdict target** | PROCEED-WITH-CHANGES |

### Hypothesis

Public Substack posts can be captured more reliably by combining RSS feed entries, JSON-LD/Open Graph metadata, and Readability rather than using Readability alone.

### Why This Spike Is Needed

Substack exposes RSS feeds, but the report does not prove:

- whether feeds include full content for the user's likely newsletters
- whether custom-domain Substacks are easy to resolve
- whether RSS body or Readability body is cleaner
- how paywalled/subscriber posts present from server fetches

### Fixture Set

Minimum:

- 8 public Substack posts across at least 4 publications.
- 2 custom-domain Substack publications if available.
- 2 `substack.com/@author/p/...` links.
- 2 paid/subscriber-only links if the user can provide examples; if not, use public posts known to have preview-only behavior.

### Execution Design

Create spike-only script:

```text
scripts/spikes/substack-extraction-ladder.mjs
```

For each fixture:

1. Detect URL shape.
2. Try RSS discovery:
   - `https://<host>/feed`
   - page `<link rel="alternate" type="application/rss+xml">`
3. Match feed entry by canonical URL or slug.
4. Parse RSS:
   - title
   - author
   - published date
   - content/description
5. Fetch page HTML.
6. Parse JSON-LD Article/BlogPosting.
7. Parse Open Graph tags.
8. Run existing Readability.
9. Compare candidate bodies:
   - RSS content
   - Readability text
   - longest clean body
10. Score output using CQ-SPIKE-001 rubric.

### Data To Record

For each post:

- host
- URL form
- feed discovered: yes/no
- RSS entry matched: yes/no
- RSS body chars
- Readability body chars
- JSON-LD fields present
- author/date agreement
- suspected paywall/truncation indicators
- best candidate body source
- score
- elapsed time

### Expected Results

Likely:

- RSS improves metadata and publish date accuracy.
- RSS may provide cleaner text for many public posts.
- Readability remains needed for some posts.
- Paid posts will likely remain previews unless captured from email or logged-in browser.

### Decision Gates

Build Substack adapter if:

- RSS is discoverable and matchable for at least 70% of sampled public posts.
- RSS or JSON-LD improves metadata/body quality versus Readability in at least half the sample.
- Paywall previews can be detected consistently enough to label honestly.

Modify/defer if:

- RSS is inconsistent across the user's real target Substacks.
- Matching feed entry to post URL is brittle.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/lib/capture/substack.ts
src/lib/capture/rss.ts
src/lib/capture/jsonld.ts
src/lib/capture/opengraph.ts
src/lib/capture/substack.test.ts
src/app/api/capture/url/route.ts
```

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-008-substack-extraction-ladder.md
```

---

## 8. CQ-SPIKE-004 — LinkedIn Safe Capture Path

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-004 |
| **Title** | LinkedIn Safe Capture Path |
| **Time box** | 4-8 hours |
| **Blocks** | LinkedIn full-text capture strategy |
| **Primary question** | What is the safest, highest-quality LinkedIn capture path Brain should support? |
| **Recommended verdict target** | PROCEED-WITH-CHANGES or BLOCKER |

### Hypothesis

Server-side LinkedIn capture should be metadata-only. Full-text LinkedIn capture should come from explicit user-provided content, initially paste/selection, not a server scraper.

### Why This Spike Is Needed

The recommendation report is intentionally cautious. LinkedIn explicitly discourages crawlers, bots, and browser extensions that scrape or automate LinkedIn. Before building a browser extension or any DOM extraction targeted at LinkedIn, Brain needs a product/compliance decision.

### Non-Negotiable Rules

- Do not run automated LinkedIn scraping from the server.
- Do not use a fake account.
- Do not store LinkedIn cookies, local storage, or session data.
- Do not automate likes, comments, messages, scrolling, or feed traversal.
- Do not build a bulk LinkedIn feed importer.
- Any full-text capture test must be initiated by an explicit user action and limited to content the user provides or can see.

### Fixture Set

Minimum:

- 5 LinkedIn post URLs.
- 2 LinkedIn article/pulse URLs.
- 2 LinkedIn URLs that are only visible when logged in.
- 3 manually pasted post bodies with associated URLs.

Private examples must be sanitized in the spike report.

### Execution Design

Break the spike into three parts.

#### Part A: Server Metadata Baseline

Create spike-only script:

```text
scripts/spikes/linkedin-metadata-baseline.mjs
```

For each LinkedIn URL:

1. Fetch with existing URL fetch pattern.
2. Extract:
   - Open Graph title
   - Open Graph description
   - image
   - canonical URL
   - HTTP status
3. Do not try to parse logged-in DOM or bypass protections.
4. Score metadata-only usefulness.

Expected result:

- Many LinkedIn links will produce only metadata or login-wall content.
- This validates metadata-only server capture as the safe default.

#### Part B: User Paste Flow Prototype

Use no browser automation.

Prototype a parser function:

```text
src/lib/capture/linkedin-paste.ts
```

Input:

```ts
{
  url: string;
  text: string;
  title?: string;
}
```

Output:

```ts
{
  source_platform: "linkedin";
  capture_quality: "full_text";
  extraction_method: "user_paste";
  title: string;
  body: string;
  source_url: string;
}
```

Test against sanitized pasted samples.

Expected result:

- User paste likely gives the highest quality with the lowest risk.

#### Part C: Browser Extension Feasibility Review

Do not implement LinkedIn scraping. Instead, document feasibility:

- Can Brain extension use `activeTab` safely for generic pages?
- Can selected text capture be generic, without LinkedIn-specific scraping selectors?
- Could the extension send only `window.getSelection().toString()` plus URL/title?

Expected recommendation:

- Build "Save selection + URL" first.
- Defer "extract visible LinkedIn post DOM" unless user explicitly accepts the platform risk.

### Data To Record

- For metadata:
  - title/description/image/canonical present
  - body chars
  - login-wall indicators
- For paste:
  - body chars
  - title derivation quality
  - duplicate detection behavior
- For extension feasibility:
  - exact permissions required
  - whether `activeTab` + `scripting` is enough
  - whether selected-text-only capture avoids LinkedIn-specific scraping

### Decision Gates

Proceed with LinkedIn metadata-only adapter if:

- Server metadata is available for most links.
- The UI copy can honestly explain limitations.

Proceed with user-paste capture if:

- Pasted examples produce 4+ quality scores.
- URL + pasted body can be stored cleanly in current data model.

Proceed with generic selected-text extension if:

- It does not need LinkedIn-specific DOM scraping.
- It works for any page where the user highlights text.

Block LinkedIn browser-DOM extraction if:

- It requires LinkedIn-specific selectors, automation, or scraping-like behavior.
- The user has not explicitly accepted the risk.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/lib/capture/linkedin.ts
src/lib/capture/opengraph.ts
src/lib/capture/linkedin-paste.ts
src/app/api/capture/url/route.ts
src/app/api/capture/note/route.ts
src/lib/telegram/dispatch.ts
```

Potential later extension files:

```text
extensions/chrome/manifest.json
extensions/chrome/service-worker.ts
extensions/chrome/content-script.ts
```

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-009-linkedin-safe-capture-path.md
```

---

## 9. CQ-SPIKE-005 — Raw Artifact Storage

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-005 |
| **Title** | Raw Artifact Storage |
| **Time box** | 3-5 hours |
| **Blocks** | `capture_artifacts` table and artifact file storage |
| **Primary question** | Should Brain persist raw/sanitized capture artifacts now, and what is the storage/backup impact? |
| **Recommended verdict target** | PROCEED or DEFER |

### Hypothesis

Storing sanitized artifacts for platform captures will enable reprocessing and debugging at a small enough storage cost for a personal app.

### Why This Spike Is Needed

The recommendation report proposes an artifact table and files under `data/artifacts/captures/<item_id>/`. That is a durable schema/storage choice. The spike should validate:

- file sizes
- backup impact
- cleanup/deletion behavior
- privacy/sanitization requirements
- whether artifacts should be DB blobs or filesystem files

### Fixture Set

Use outputs from CQ-SPIKE-002 and CQ-SPIKE-003:

- 5 YouTube artifacts:
  - oEmbed JSON
  - Data API JSON if available
  - timed-text XML if available
- 5 Substack artifacts:
  - RSS entry XML/JSON
  - HTML
  - JSON-LD
- 3 LinkedIn metadata artifacts:
  - Open Graph JSON
  - sanitized HTML preview if safe

### Execution Design

Create throwaway temp DB:

```text
data/spikes/capture-artifacts/spike.sqlite
```

Create prototype migration SQL:

```text
data/spikes/capture-artifacts/014_capture_artifacts_prototype.sql
```

Prototype repository:

```text
scripts/spikes/capture-artifact-storage.mjs
```

Script should:

1. Create item rows in temp DB.
2. Write artifact files under:

```text
data/spikes/capture-artifacts/artifacts/<item_id>/
```

3. Insert artifact metadata rows.
4. Compute:
   - count files
   - total bytes
   - max item artifact bytes
   - average artifact bytes by platform
   - SQLite DB size
   - backup size estimate
5. Delete one item and verify artifact cleanup design.

### Design Questions To Answer

- Should artifact files be deleted by application code when an item is deleted?
- Should artifact paths be relative, not absolute?
- Should artifacts be included in the existing DB backup path or backed up separately?
- Should artifact storage be capped per item?
- Should raw HTML be optional, while JSON metadata is always stored?

### Expected Results

Likely:

- JSON/XML metadata artifacts are tiny.
- Raw HTML can be large but still manageable for personal use if capped.
- Filesystem storage is better than DB blobs.
- A cleanup function is needed because SQLite cascading deletes will not delete files.

### Decision Gates

Proceed if:

- Average artifact size is acceptable.
- Deleting an item has a clear cleanup path.
- No secrets/cookies appear in stored artifacts.

Defer if:

- Storage/backup impact is unclear.
- Sanitization is not defined.
- Artifact cleanup creates too much complexity for v0.7.5.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/db/migrations/014_capture_artifacts.sql
src/db/capture-artifacts.ts
src/lib/capture/artifacts.ts
src/db/items.ts
scripts/backup-offsite.sh or backup docs if artifact backups are separate
```

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-010-capture-artifact-storage.md
```

---

## 10. CQ-SPIKE-006 — Third-Party Extraction Provider Benchmark

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-006 |
| **Title** | Third-Party Extraction Provider Benchmark |
| **Time box** | 4-8 hours |
| **Blocks** | Optional provider fallback decision |
| **Primary question** | Do Jina Reader, Firecrawl, or Browserless improve enough public-page captures to justify adding them as optional fallbacks? |
| **Recommended verdict target** | DEFER unless gains are obvious |

### Hypothesis

Third-party extraction providers may improve generic article and public Substack captures, but they should remain optional because they add cost, privacy, configuration, and dependency risk.

### Why This Spike Is Needed

The recommendation report names Jina, Firecrawl, and Browserless, but does not prove they beat local extraction for the user's actual sources. A benchmark prevents adding a dependency just because it sounds useful.

### Prerequisites

- Jina Reader can be tested with public URLs.
- Firecrawl requires an API key if the hosted API is tested.
- Browserless requires an API key/endpoint if the hosted service is tested.
- If keys are not available, test only Jina and document Firecrawl/Browserless as not run.

### Fixture Set

Use the harness from CQ-SPIKE-001:

- 5 Substack public posts.
- 5 generic articles.
- 3 JS-heavy public pages.
- Do not use LinkedIn for provider benchmarking unless the user explicitly requests it and accepts platform risk.

### Execution Design

Create spike-only script:

```text
scripts/spikes/extraction-provider-benchmark.mjs
```

For each public fixture:

1. Run local Readability.
2. Run Jina Reader.
3. Run Firecrawl if `FIRECRAWL_API_KEY` exists.
4. Run Browserless if `BROWSERLESS_TOKEN` exists.
5. Score results using CQ-SPIKE-001.
6. Record:
   - body chars
   - visible boilerplate estimate
   - title/author/date presence
   - links retained
   - latency
   - cost estimate
   - failure mode

### Data To Record

Provider matrix:

| Fixture | Local | Jina | Firecrawl | Browserless | Best | Notes |
|---|---:|---:|---:|---:|---|---|

For each provider:

- setup friction
- runtime dependencies
- privacy concerns
- estimated monthly cost for personal use
- API failure behavior

### Expected Results

Likely:

- Jina/Firecrawl may beat local Readability on some complex public pages.
- Local Readability will remain adequate for many pages.
- Browserless is heavier than needed unless JavaScript rendering is essential.
- None should be used for LinkedIn as a default.

### Decision Gates

Add optional provider fallback if:

- It improves failed/weak public captures by at least 25 percentage points.
- It can be disabled by default.
- It never receives private/client-DOM/email captures.
- Error handling and cost limits are clear.

Defer if:

- Gains are small.
- Setup keys or cost are not worth it.
- Privacy concerns dominate.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/lib/capture/providers/jina.ts
src/lib/capture/providers/firecrawl.ts
src/lib/capture/providers/browserless.ts
src/lib/capture/provider-fallback.ts
.env.example
src/app/settings/page.tsx or provider status endpoint
```

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-011-extraction-provider-benchmark.md
```

---

## 11. CQ-SPIKE-007 — Substack Email Ingestion

| Field | Value |
|---|---|
| **Spike ID** | CQ-SPIKE-007 |
| **Title** | Substack Email Ingestion |
| **Time box** | 4-6 hours |
| **Blocks** | Paid/subscriber Substack capture strategy |
| **Primary question** | Is email ingestion the best way to capture full paid/subscribed Substack posts? |
| **Recommended verdict target** | PROCEED-WITH-CHANGES if user values paid Substack capture |

### Hypothesis

For paid or subscriber-only Substack, the newsletter email body gives the highest-quality, most user-authorized capture path. A manual `.eml` or pasted-email flow can validate this before Gmail integration.

### Why This Spike Is Needed

The recommendation report says email ingestion may be the best paid Substack path, but Brain currently has no email parser. Before adding Gmail or inbound email infrastructure, validate the content quality from sample emails.

### Prerequisites

- User provides 3-5 sanitized Substack email examples, preferably:
  - one free public post email
  - one paid/subscriber post email
  - one post with images/links
  - one post with footers/comments/share boilerplate
- If real emails cannot be shared, use manually pasted/sanitized body text.

### Execution Design

Create spike-only parser:

```text
scripts/spikes/substack-email-ingestion.mjs
```

Input formats:

- `.eml` file if available
- copied HTML
- copied plain text

Parser should attempt:

1. Extract subject as title.
2. Extract sender as author/publication.
3. Extract date.
4. Extract canonical post URL from links.
5. Remove email footer boilerplate.
6. Preserve main body links.
7. Convert HTML to Markdown/plain text.
8. Score with CQ-SPIKE-001.

### Data To Record

For each email:

- input type
- subject
- sender
- date
- canonical URL found yes/no
- body chars before/after cleaning
- footer removed yes/no
- link count
- image references retained yes/no
- score

### Expected Results

Likely:

- Email body has better paid-post content than server HTML.
- Boilerplate cleanup is needed but manageable.
- Manual upload/paste can prove value before Gmail API work.

### Decision Gates

Proceed with manual email capture if:

- Paid email examples score 4+.
- Canonical URL can be extracted or manually supplied.
- Boilerplate cleanup is acceptable.

Proceed with Gmail integration later if:

- Manual email capture is valuable but too much friction.
- User explicitly wants Gmail access connected.

Defer if:

- User does not care about paid Substack capture yet.
- Email parsing quality is too inconsistent.

### Implementation Follow-Up If Proceeding

Files likely:

```text
src/lib/capture/email.ts
src/lib/capture/substack-email.ts
src/app/api/capture/email/route.ts
src/app/capture/page.tsx
src/lib/capture/email.test.ts
```

Possible later:

```text
src/lib/integrations/gmail/
```

### Deliverable

Create:

```text
docs/plans/spikes/SPIKE-012-substack-email-ingestion.md
```

---

## 12. Recommended Execution Order

### Batch 1: Must Run Before v0.7.5 Design

1. **CQ-SPIKE-001 Capture Evaluation Harness**
2. **CQ-SPIKE-003 Substack RSS + JSON-LD Ladder**
3. **CQ-SPIKE-004 LinkedIn Safe Capture Path**

Reason:

- These determine the foundation of the platform-aware capture plan.
- They reduce the risk of building the wrong LinkedIn/Substack path.

### Batch 2: Run During Or Before YouTube Rich Metadata Work

4. **CQ-SPIKE-002 YouTube Metadata Ladder**

Reason:

- YouTube can already be improved incrementally, but Data API key/value needs proof.

### Batch 3: Optional / Depends On User Priority

5. **CQ-SPIKE-005 Raw Artifact Storage**
6. **CQ-SPIKE-006 Third-Party Extraction Provider Benchmark**
7. **CQ-SPIKE-007 Substack Email Ingestion**

Reason:

- Artifact storage is useful but not required for the first platform router.
- Third-party providers should be optional.
- Email ingestion matters most if paid Substack is a major capture source.

---

## 13. What To Expect From The Spikes

### Expected Positive Outcomes

- A clear baseline showing current capture quality by platform.
- A concrete scoring rubric that can become regression tests.
- Evidence that public Substack should be RSS-first.
- Evidence that LinkedIn should be metadata-only plus paste/selection capture.
- A decision on whether YouTube Data API metadata is worth adding.
- A clearer v0.7.5 implementation plan with fewer guesses.

### Expected Negative Or Limiting Outcomes

- LinkedIn server-side capture will probably remain weak.
- Some Substack paid posts will remain preview-only without email/browser capture.
- YouTube transcript extraction will remain best-effort.
- Third-party providers may not justify their privacy/cost tradeoffs.
- Artifact storage may need to be deferred if cleanup/backup complexity is too high.

### Expected User Decisions Needed

- Whether to provide a few representative Substack and LinkedIn examples.
- Whether paid Substack capture matters now or later.
- Whether to create/configure a YouTube Data API key.
- Whether LinkedIn full-text capture should be limited to manual paste/selected text.
- Whether Brain may use third-party extraction services for public URLs.

---

## 14. Acceptance Criteria For This Spike Requirements Document

This document is complete when:

- It states whether spikes are needed.
- It identifies which recommendations can proceed without spikes.
- It defines each needed spike with:
  - hypothesis
  - inputs
  - execution steps
  - data to record
  - expected results
  - decision gates
  - deliverable path
- It can be handed to another agent to execute spikes without re-reading the full recommendation report first.

