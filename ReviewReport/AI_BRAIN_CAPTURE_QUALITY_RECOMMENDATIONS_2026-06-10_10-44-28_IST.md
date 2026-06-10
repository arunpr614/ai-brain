# AI Brain Capture Quality Recommendations

**Created:** 2026-06-10 10:44:28 IST  
**Author:** Codex  
**Scope:** Improve capture quality for the user's dominant sources: YouTube videos, YouTube Shorts, LinkedIn links, and Substack links.  
**Codebase inspected:** `src/lib/capture/url.ts`, `src/lib/capture/youtube.ts`, `src/lib/telegram/dispatch.ts`, `src/db/items.ts`, `package.json`  
**Current branch context:** v0.7.3/v0.7.4 local worktree, not committed/deployed at the time of this report.

---

## 1. Executive Recommendation

Brain should move from a single generic "fetch URL and run Readability" model to a **platform-aware capture pipeline**.

The best near-term path is:

1. **Keep server-side capture for public, static content.**
   - Works well for normal articles and public Substack posts.
   - Works for YouTube when transcript endpoints are available.

2. **Add source-specific adapters for YouTube, Substack, and LinkedIn.**
   - YouTube should combine transcript, oEmbed, and official Data API metadata.
   - Substack should use RSS and article metadata before falling back to generic Readability.
   - LinkedIn should default to metadata-only from the server and ask for user-provided text or browser-side capture for full content.

3. **Add a "capture quality" model.**
   - Every captured item should know whether it is `full_text`, `transcript`, `metadata_only`, `client_dom`, `email_body`, `paywall_preview`, or `failed`.
   - This is more useful than one overloaded `extraction_warning` string.

4. **For LinkedIn and paid/subscribed Substack, build a client-side capture path.**
   - Server-side scraping will remain brittle and risky.
   - A Chrome extension or authenticated Browser/PWA capture flow can capture the page the user is already viewing, with explicit user action.
   - For Substack specifically, email ingestion may be the highest-quality path because newsletters arrive as email bodies.

5. **Store raw capture artifacts.**
   - Save sanitized HTML/Markdown/API JSON alongside the item.
   - This allows reprocessing later when parsers improve without asking the user to capture again.

My strongest recommendation: **do not spend a lot of engineering effort trying to make Hetzner scrape LinkedIn.** Treat LinkedIn as a "logged-in client capture" problem. For YouTube and Substack, source-specific server adapters will bring a large quality jump.

---

## 2. Current Brain Capture Baseline

### Generic URL Capture

Current file:

```text
src/lib/capture/url.ts
```

Current behavior:

- normalizes URL
- blocks private/internal URLs through `assertPublicHttpUrl`
- fetches up to 5 MB with a browser-like user agent
- runs Mozilla Readability over JSDOM
- fails if extracted article text is under 100 characters
- emits `short_article` if body is under 500 characters

This is solid for normal articles. It is weak for:

- JavaScript-heavy pages
- logged-in pages
- paywalled pages
- social posts
- pages where the useful content is in metadata/RSS/API rather than the initial HTML

### YouTube Capture

Current file:

```text
src/lib/capture/youtube.ts
```

Current behavior:

- recognizes YouTube URL variants
- calls InnerTube player endpoint
- parses caption `timedtext`
- formats timestamped transcript
- returns no-transcript placeholder when captions are absent
- now has a local v0.7.4 fallback for YouTube anti-bot challenge via oEmbed metadata

This is good for transcripts when YouTube allows the server request. It still needs richer metadata and better Shorts behavior.

### Capture Storage

Current item model:

```text
items.source_type
items.capture_source
items.source_url
items.title
items.author
items.body
items.extraction_warning
items.duration_seconds
```

This stores the final text but not the extraction method, raw source artifact, thumbnail, publish date, platform-specific IDs, or quality score.

---

## 3. Source Research Summary

### YouTube

Useful official surfaces:

- **YouTube Data API `videos.list`** returns structured video resources and supports fields such as `snippet`, `contentDetails`, `status`, `statistics`, `player`, and `topicDetails`. This is suitable for title, channel, description, duration, thumbnails, privacy/embeddability, and view/comment counts. Source: https://developers.google.com/youtube/v3/docs/videos
- **YouTube Data API quota** has a default daily allocation and every API request costs at least one quota point. For a single-user personal tool, `videos.list`-style metadata lookups should be fine if cached. Source: https://developers.google.com/youtube/v3/determine_quota_cost
- **Captions API** exists, but it is for authorized caption management and content-owner workflows, not a reliable public transcript API for arbitrary videos. Source: https://developers.google.com/youtube/v3/docs/captions/download and https://developers.google.com/youtube/v3/guides/implementation/captions
- **oEmbed** is a standard way to get embeddable metadata from a URL; YouTube supports the oEmbed pattern well enough for title/author fallback. Source: https://oembed.com/

Implication:

- Use official Data API for metadata.
- Continue best-effort transcript extraction from timed-text.
- Keep oEmbed as low-friction fallback.
- Do not rely on the official Captions API for arbitrary public transcript download.

### LinkedIn

Useful official surfaces:

- LinkedIn Posts API can retrieve posts by URN when authorized and within LinkedIn's API product/permission model. Source: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- LinkedIn's Marketing API and member data have strict usage/storage/export restrictions. Source: https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases
- LinkedIn Help explicitly discourages crawlers, bots, plugins, and extensions that scrape or automate LinkedIn. Source: https://www.linkedin.com/help/linkedin/answer/a1341387

Implication:

- Server-side LinkedIn scraping is not a good foundation.
- Official API access is unlikely to fit a personal knowledge capture use case.
- The high-quality path is explicit user-driven capture: selected text, copied post body, or a browser capture where the user intentionally sends the visible content to Brain.

### Substack

Useful official surfaces:

- Substack publications expose RSS feeds at `https://your.substack.com/feed`. Source: https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication
- Substack Terms govern account use and should be treated carefully before relying on unofficial/private APIs. Source: https://substack.com/tos
- Substack also commonly exposes useful article metadata in normal web markup; generic Article/BlogPosting JSON-LD patterns are well-known on the web. Source: https://developers.google.com/search/docs/appearance/structured-data/article

Implication:

- RSS-first extraction is likely to be more stable than generic HTML for free posts.
- For paid/subscribed posts, the email body may be the most reliable and legitimate personal archive source.
- Avoid building core product behavior around undocumented Substack APIs.

### Browser / Client Capture

Useful official surfaces:

- Chrome extension `activeTab` grants temporary access to the active page after a user gesture and avoids broad all-site permission by default. Source: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome content scripts can read page DOM and pass content to the extension. Source: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Web Share Target lets an installed PWA receive shared title/text/url/files from the OS share sheet. Source: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target

Implication:

- A desktop Chrome extension is the cleanest high-quality capture path for logged-in pages and dynamic pages.
- Android share targets mostly receive URL/text/files, not the full app DOM. For LinkedIn mobile, sharing often gives only a URL, so a "paste selected text" workflow may still be needed.

### Third-Party Extraction Services

Options researched:

- Firecrawl can scrape and return Markdown/HTML/raw HTML/images/screenshots/JSON and supports main-content filtering. Sources: https://docs.firecrawl.dev/api-reference/introduction and https://docs.firecrawl.dev/api-reference/endpoint/scrape
- Jina Reader converts URLs/HTML into LLM-friendly Markdown and supports extraction controls such as selectors and wait conditions. Source: https://jina.ai/reader/
- Browserless provides hosted browser automation and scrape/screenshot/PDF-style endpoints. Source: https://docs.browserless.io/

Implication:

- These are useful optional fallback providers for public pages.
- They should not be the primary answer for LinkedIn because terms/reliability remain the bigger problem.
- They introduce cost, privacy, and dependency tradeoffs. For a personal Brain, prefer local/source-specific extraction first.

---

## 4. Recommended Target Architecture

### 4.1 Platform Router

Add a routing layer before generic URL extraction:

```text
src/lib/capture/platform.ts
```

Suggested output:

```ts
type CapturePlatform =
  | "youtube"
  | "youtube_short"
  | "substack"
  | "linkedin"
  | "generic_article";
```

Routing examples:

- `youtube.com/watch`, `youtu.be`, `youtube.com/shorts` -> YouTube adapter
- `*.substack.com`, `substack.com/@.../p/...` -> Substack adapter
- `linkedin.com/posts`, `linkedin.com/feed/update`, `linkedin.com/pulse`, `linkedin.com/in/.../recent-activity` -> LinkedIn adapter
- everything else -> generic article adapter

### 4.2 Capture Quality Fields

Add migration:

```text
src/db/migrations/013_capture_quality.sql
```

Proposed fields on `items`:

```sql
ALTER TABLE items ADD COLUMN source_platform TEXT;
ALTER TABLE items ADD COLUMN capture_quality TEXT;
ALTER TABLE items ADD COLUMN extraction_method TEXT;
ALTER TABLE items ADD COLUMN extraction_version TEXT;
ALTER TABLE items ADD COLUMN published_at INTEGER;
ALTER TABLE items ADD COLUMN thumbnail_url TEXT;
ALTER TABLE items ADD COLUMN description TEXT;
```

Suggested `capture_quality` values:

| Value | Meaning |
| --- | --- |
| `full_text` | Article/post body captured from public HTML/RSS/email/client DOM |
| `transcript` | Video transcript captured |
| `metadata_plus_transcript` | Rich metadata plus transcript |
| `metadata_only` | Title/author/url/thumbnail only |
| `paywall_preview` | Only preview text available |
| `client_dom` | User-approved browser DOM capture |
| `email_body` | Captured from newsletter email body |
| `failed` | Capture failed but diagnostic retained |

Why this matters:

- The user can trust what Brain saved.
- The UI can show "good capture" vs "metadata-only".
- RAG can route weak captures differently.
- Reprocessing can target low-quality items later.

### 4.3 Raw Artifact Storage

Add migration:

```text
src/db/migrations/014_capture_artifacts.sql
```

Proposed table:

```sql
CREATE TABLE capture_artifacts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT,
  content_type TEXT,
  sha256 TEXT,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

Artifact examples:

- `youtube_oembed.json`
- `youtube_data_api.json`
- `youtube_timedtext.xml`
- `substack_feed_entry.xml`
- `substack_html.html`
- `substack_article.jsonld`
- `linkedin_opengraph.json`
- `client_dom.html`
- `client_readability.md`
- `email.eml` or sanitized `email.html`

Store artifacts under:

```text
data/artifacts/captures/<item_id>/
```

Important rule:

- Never store cookies, bearer tokens, Telegram secrets, or browser local storage.
- If storing client DOM, sanitize scripts and obvious tracking fragments first.

---

## 5. Platform-Specific Recommendations

## 5.1 YouTube Videos

### Current Pain

YouTube is the highest-value capture type because transcripts become excellent RAG material. It is also fragile because public transcript extraction is not an official stable API surface and server-hosted IPs can get challenged.

### Recommended Capture Ladder

Use this order:

1. Normalize/canonicalize video ID.
2. Fetch oEmbed immediately for low-cost title/author fallback.
3. If a YouTube Data API key is configured, fetch `videos.list` metadata:
   - title
   - channel title and channel ID
   - description
   - published date
   - duration
   - thumbnails
   - embeddable/privacy/status
   - statistics when available
4. Fetch transcript through current InnerTube/timed-text path.
5. If transcript works, save body as:
   - compact metadata header
   - chapters if found in description
   - timestamped transcript
6. If transcript is absent, save metadata-rich body with `capture_quality = "metadata_only"` or `paywall_preview` equivalent.
7. If InnerTube is anti-bot challenged, use the v0.7.4 oEmbed fallback and mark as `metadata_only`.

### Recommended Body Format

Use a retrieval-friendly body, not just transcript:

```text
Title: ...
Channel: ...
Published: ...
Duration: ...
URL: ...
Capture quality: metadata_plus_transcript

Description:
...

Chapters:
00:00 Intro
...

Transcript:
[0:00] ...
```

Why:

- Current body is intentionally "pure transcript", but search and embeddings lose the description, channel, and chapter context unless enrichment injects it later.
- A structured header improves retrieval for queries like "that Claude Code video from The AI Guy" even when those words appear only in metadata.

### YouTube Data API Setup

Add optional env var:

```text
YOUTUBE_DATA_API_KEY=
```

If absent, keep current behavior. If present, add metadata enrichment.

### Tests

- public video with transcript -> `metadata_plus_transcript`
- public video with no captions -> `metadata_only` with description/body
- Shorts URL -> same adapter, but `source_platform = youtube_short`
- anti-bot InnerTube + oEmbed success -> metadata-only
- Data API unavailable/quota error -> continue with oEmbed/InnerTube

---

## 5.2 YouTube Shorts

### Current Pain

Shorts often have short/no transcripts, thin descriptions, and high dependence on visual/audio content. A metadata-only Short can be nearly useless unless Brain stores enough context.

### Recommended Capture Ladder

1. Normalize Shorts URL to video ID and canonical YouTube URL.
2. Fetch oEmbed.
3. Fetch Data API metadata if configured.
4. Try transcript.
5. If no transcript:
   - store title, channel, description, hashtags, published date, duration, thumbnail
   - set `capture_quality = "metadata_only"`
   - make UI honest: "Short saved; no transcript available."

### Optional Later Enhancement

Add a manual "Add note to capture" flow for Shorts:

```text
Save this Short with a note:
"This was the example about using Graphify with Claude Code."
```

This would materially improve retrieval more than trying to infer meaning from a title alone.

### Avoid For Now

- Do not download YouTube audio/video server-side for transcription as the default path. It adds terms, reliability, bandwidth, and storage questions.
- Do not attempt to bypass YouTube anti-bot challenges.

---

## 5.3 Substack

### Current Pain

Generic Readability can work on public Substack posts, but it misses a better stable signal: publication RSS feeds. Paid/subscriber-only posts will often be partial or unavailable from server fetches.

### Recommended Capture Ladder

1. Detect Substack URL.
2. Canonicalize:
   - strip tracking params
   - resolve `substack.com/@author/p/slug` style URLs when possible
3. Try RSS feed:
   - derive publication host
   - fetch `https://<publication>.substack.com/feed`
   - match post by URL/slug
   - use RSS title, author, published date, content/description
4. Fetch page HTML.
5. Extract JSON-LD Article/BlogPosting metadata:
   - headline
   - author
   - datePublished
   - image
   - description
6. Run Readability.
7. Reconcile:
   - choose the longest clean body among RSS content and Readability body
   - use JSON-LD/RSS metadata for title/author/published date
8. If content is truncated/paywalled:
   - save preview
   - set `capture_quality = "paywall_preview"`
   - suggest email ingestion for full capture

### Highest-Quality Path For Paid Substack

Add newsletter email ingestion.

Why:

- Substack sends newsletters to the subscriber's inbox.
- The email body is often the exact content the user was entitled to read.
- This avoids brittle server scraping and keeps capture user-authorized.

Possible routes:

- manual forward to a private Brain inbound email address
- Gmail API ingestion for selected Substack senders
- user uploads `.eml` / shares email text

### Tests

- public Substack post with RSS entry -> full text from RSS
- public Substack post with no RSS match -> Readability fallback
- paywall/preview page -> `paywall_preview`
- custom domain Substack -> feed discovery fallback from page `<link rel="alternate" type="application/rss+xml">`

---

## 5.4 LinkedIn

### Current Pain

LinkedIn content is usually logged-in, dynamic, and legally/operationally hostile to automated scraping. Server-side capture should not pretend it can reliably read LinkedIn posts.

### Recommended Capture Ladder

For server-side captures:

1. Detect LinkedIn URL.
2. Fetch public metadata only:
   - Open Graph title
   - Open Graph description
   - canonical URL
   - image if available
3. If body is too short:
   - save as `metadata_only`
   - Telegram response should say: "Saved LinkedIn link as metadata only. For full text, paste the post text or use browser capture."

For full-quality captures:

1. Add "Save selected text with URL" workflow:
   - Telegram: user can paste LinkedIn text + URL.
   - Web/Android: support title/url/body in one capture request.
2. Add Chrome extension capture:
   - user clicks Brain extension on the LinkedIn page
   - extension uses `activeTab` and content script to extract visible text
   - sends sanitized content to Brain
3. Optional: Brain in-app browser capture for logged-in pages, but this is heavier and not the first choice.

### LinkedIn Body Format

```text
LinkedIn post
Author: ...
URL: ...
Capture quality: client_dom

Post text:
...

Shared link:
...
```

### What Not To Do

- Do not build a headless LinkedIn scraper on Hetzner.
- Do not use fake accounts.
- Do not store LinkedIn cookies in Brain.
- Do not rely on LinkedIn API unless the use case and permissions are explicitly approved and compliant.

---

## 6. Implementation Roadmap

## Phase 1: Quality Labels And Platform Routing

**Effort:** 1-2 days  
**Risk:** low  
**Value:** high

Files:

```text
src/lib/capture/platform.ts
src/lib/capture/types.ts
src/db/migrations/013_capture_quality.sql
src/db/items.ts
src/app/api/capture/url/route.ts
src/lib/telegram/dispatch.ts
src/components/library-list.tsx
src/app/items/[id]/page.tsx
```

Work:

- Add platform detection.
- Add `capture_quality`, `source_platform`, `extraction_method`, `published_at`, `thumbnail_url`, `description`.
- Display capture quality in Library/detail.
- Keep old behavior as fallback.

Acceptance:

- YouTube, Substack, LinkedIn links are tagged by platform.
- Metadata-only captures are visibly different from full captures.
- Existing generic URL captures still work.

## Phase 2: YouTube Rich Metadata Adapter

**Effort:** 1-3 days  
**Risk:** medium because of API key/config and quota  
**Value:** very high

Files:

```text
src/lib/capture/youtube.ts
src/lib/capture/youtube-metadata.ts
src/lib/capture/youtube.test.ts
scripts/smoke-youtube-prod.mjs
.env.example
```

Work:

- Add optional YouTube Data API metadata fetch.
- Cache Data API response as capture artifact.
- Add structured body header and chapters from description.
- Preserve current timed-text transcript path.
- Keep v0.7.4 anti-bot oEmbed fallback.

Acceptance:

- Public YouTube captures include title, channel, description, duration, thumbnail, published date, and transcript when available.
- Shorts get at least metadata-rich capture even without transcript.

## Phase 3: Substack Adapter

**Effort:** 2-4 days  
**Risk:** medium  
**Value:** high

Files:

```text
src/lib/capture/substack.ts
src/lib/capture/rss.ts
src/lib/capture/jsonld.ts
src/lib/capture/substack.test.ts
src/app/api/capture/url/route.ts
```

Work:

- Detect Substack.
- Discover RSS feed.
- Match post in RSS feed.
- Parse RSS content.
- Parse JSON-LD and Open Graph.
- Reconcile RSS/Readability output.
- Mark paywall previews honestly.

Acceptance:

- Public Substack links usually save full text with author/date.
- Paid/subscriber previews are clearly marked.

## Phase 4: LinkedIn Metadata And Manual Full-Text Flow

**Effort:** 1-2 days  
**Risk:** low  
**Value:** medium-high

Files:

```text
src/lib/capture/linkedin.ts
src/lib/capture/opengraph.ts
src/app/api/capture/url/route.ts
src/app/api/capture/note/route.ts
src/lib/telegram/dispatch.ts
```

Work:

- Detect LinkedIn.
- Save Open Graph metadata.
- Add clear Telegram/web acknowledgement that full text needs pasted/client capture.
- Support "URL + pasted text" as a single capture:
  - source URL = LinkedIn URL
  - body = pasted text
  - source_platform = linkedin
  - capture_quality = full_text
  - extraction_method = user_paste

Acceptance:

- LinkedIn captures no longer fail mysteriously.
- User can produce a good LinkedIn capture by pasting the post text with the link.

## Phase 5: Chrome Extension / Browser Capture

**Effort:** 1-2 weeks  
**Risk:** medium-high  
**Value:** very high for LinkedIn and paywalled content

Files:

```text
extensions/chrome/manifest.json
extensions/chrome/service-worker.ts
extensions/chrome/content-script.ts
src/app/api/capture/dom/route.ts
src/lib/capture/client-dom.ts
src/lib/capture/client-dom.test.ts
```

Work:

- Build extension with `activeTab` and `scripting`.
- On user click:
  - collect URL/title/selection
  - run Readability on cloned DOM where appropriate
  - for LinkedIn, extract visible post text conservatively
  - send sanitized text to Brain
- Add server endpoint to accept client-provided DOM/text with provenance.

Acceptance:

- User can capture a LinkedIn post they are viewing with one explicit click.
- Browser-captured items are marked `capture_quality = client_dom`.

## Phase 6: Substack Email Ingestion

**Effort:** 1-2 weeks  
**Risk:** medium due auth/privacy  
**Value:** very high for paid newsletters

Work:

- Start with manual `.eml` / pasted email body capture.
- Later add Gmail integration only if user wants it.
- Extract newsletter title, sender, date, canonical post URL, and body.

Acceptance:

- Paid Substack posts can be saved from the email the user already received.

---

## 7. Provider Decision

### Recommended Default

Use local/source-specific adapters first.

Why:

- Better privacy.
- Lower cost.
- Easier debugging.
- Avoids sending logged-in/personal content to a third party.

### When To Consider Firecrawl/Jina/Browserless

Use as optional fallback for public pages only:

- generic articles where Readability fails
- public Substack custom domains where RSS discovery fails
- docs/blog pages with complex layout

Do not make these mandatory for core capture.

### Suggested Provider Ranking

| Provider | Best Use | Caution |
| --- | --- | --- |
| Jina Reader | Cheap/simple URL-to-Markdown fallback | Sends URL/content to third party |
| Firecrawl | Public pages needing Markdown/HTML/screenshot/structured scrape | Cost, auth, external dependency |
| Browserless | Rendering JS-heavy public pages | Operational complexity; avoid for LinkedIn scraping |

---

## 8. Recommended Data Model Summary

Minimum migration:

```sql
ALTER TABLE items ADD COLUMN source_platform TEXT;
ALTER TABLE items ADD COLUMN capture_quality TEXT;
ALTER TABLE items ADD COLUMN extraction_method TEXT;
ALTER TABLE items ADD COLUMN extraction_version TEXT;
ALTER TABLE items ADD COLUMN published_at INTEGER;
ALTER TABLE items ADD COLUMN thumbnail_url TEXT;
ALTER TABLE items ADD COLUMN description TEXT;
```

Artifact table:

```sql
CREATE TABLE capture_artifacts (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  path TEXT,
  content_type TEXT,
  sha256 TEXT,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
```

Indexes:

```sql
CREATE INDEX idx_items_source_platform ON items(source_platform);
CREATE INDEX idx_items_capture_quality ON items(capture_quality);
CREATE INDEX idx_items_published_at ON items(published_at DESC);
CREATE INDEX idx_capture_artifacts_item ON capture_artifacts(item_id);
```

---

## 9. UI Recommendations

### Library Row Badges

Show small badges:

```text
YouTube · transcript
YouTube Short · metadata only
Substack · full text
Substack · preview only
LinkedIn · metadata only
LinkedIn · pasted text
LinkedIn · browser capture
```

### Item Detail

Add a capture diagnostics panel:

```text
Capture quality: metadata only
Method: youtube_oembed
Platform: YouTube Short
Captured via: Telegram
Could improve by: Add a note or retry from browser
```

### Retry / Improve Capture

Add buttons:

- `Retry capture`
- `Add pasted text`
- `Capture from browser`
- `Attach email body`

This turns weak captures into repairable items rather than permanent low-quality records.

---

## 10. Success Metrics

Track capture quality by platform:

```text
YouTube: % transcript, % metadata_only, % failed
YouTube Shorts: % transcript, % metadata_only, % failed
Substack: % full_text, % paywall_preview, % failed
LinkedIn: % metadata_only, % user_paste/client_dom, % failed
```

Operational target:

- YouTube videos: 80%+ transcript or metadata_plus_transcript
- YouTube Shorts: 90%+ saved, but many will be metadata-only
- Public Substack: 90%+ full text
- Paid Substack: 80%+ full text if email ingestion exists
- LinkedIn: 95%+ save success, but server-side will mostly be metadata-only unless user paste/browser capture exists

---

## 11. Practical Next Step

Start with a focused v0.7.5 plan:

**v0.7.5 Capture Quality Foundation**

1. Add `source_platform` and `capture_quality`.
2. Add platform router.
3. Add LinkedIn metadata-only adapter with clear user guidance.
4. Add Substack RSS + JSON-LD adapter.
5. Add YouTube Data API metadata as optional enhancement.
6. Add Library/detail capture quality badges.

Then follow with:

**v0.7.6 Browser Capture**

- Chrome extension or PWA/browser-side capture path for LinkedIn and paywalled Substack.

This sequencing gives an immediate quality lift without getting trapped in LinkedIn scraping or a large extension project too early.

---

## 12. Source Links

- YouTube Data API videos resource: https://developers.google.com/youtube/v3/docs/videos
- YouTube Data API quota calculator: https://developers.google.com/youtube/v3/determine_quota_cost
- YouTube captions download docs: https://developers.google.com/youtube/v3/docs/captions/download
- YouTube captions implementation guide: https://developers.google.com/youtube/v3/guides/implementation/captions
- oEmbed specification: https://oembed.com/
- LinkedIn Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- LinkedIn restricted API/data uses: https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases
- LinkedIn prohibited software/extensions: https://www.linkedin.com/help/linkedin/answer/a1341387
- Substack RSS support: https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication
- Substack Terms of Use: https://substack.com/tos
- Google Article structured data docs: https://developers.google.com/search/docs/appearance/structured-data/article
- Chrome extension `activeTab`: https://developer.chrome.com/docs/extensions/develop/concepts/activeTab
- Chrome content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Web Share Target API: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- Firecrawl API docs: https://docs.firecrawl.dev/api-reference/introduction
- Firecrawl scrape endpoint: https://docs.firecrawl.dev/api-reference/endpoint/scrape
- Jina Reader: https://jina.ai/reader/
- Browserless docs: https://docs.browserless.io/
- Mozilla Readability: https://github.com/mozilla/readability

