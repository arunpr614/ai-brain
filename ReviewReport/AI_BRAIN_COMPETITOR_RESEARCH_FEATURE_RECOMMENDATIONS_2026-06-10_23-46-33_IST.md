# AI Brain Competitor Research And Feature Recommendations

**Created:** 2026-06-10 23:46:33 IST
**Author:** Codex
**Scope:** Deep research on Recall and Knowly, compared against the current AI Brain system after the v0.8 capture-quality release and v0.8.1 Next security patch.
**Primary question:** What should AI Brain build next, and what should it skip for now?

---

## 1. Executive Recommendation

AI Brain should not try to become a clone of Recall or Knowly.

The strongest strategic direction is:

> Make AI Brain the most trustworthy personal capture and retrieval system for the user's own high-value sources, especially YouTube, YouTube Shorts, LinkedIn, Substack, PDFs, and notes.

The next product work should deepen the capture-to-useful-memory loop, not widen into every flashy surface.

Recommended feature sequence:

1. **Capture Review Inbox and Source Quality Workflow**
   - Turn the current Library quality labels into an actionable workflow.
   - Help the user find weak captures, upgrade them, delete junk, and confirm what is worth keeping.

2. **Browser Selected-Text Capture**
   - Add a Chrome extension flow that captures the selected text plus the source URL.
   - This is the safest high-quality path for LinkedIn, Substack, quotes, newsletters, and web pages where full extraction is unreliable.

3. **Substack Email/Paste Capture**
   - Add a manual "paste newsletter/article text" capture mode before any Gmail or mailbox automation.
   - This is the honest path for paid Substack and subscriber-only content.

4. **Quality-Aware Ask and Scoped Ask**
   - Let the user ask across selected items, tags, source types, date ranges, or only high-quality captures.
   - Add "this answer used weak captures" warnings where appropriate.

5. **Source Highlights and Citation Navigation**
   - Store and show source passages or user highlights.
   - Let answers jump back to the exact saved passage, transcript line, or selected text.

6. **Lightweight Review / Weekly Digest**
   - Build a quiet weekly review that resurfaces important captures and unresolved weak saves.
   - Do not build full gamified spaced repetition yet.

7. **Read-Only API/MCP and Export Hardening**
   - If AI Brain is meant to become personal context for Codex, Claude, Cursor, or other agents, add a read-only context surface.
   - This should be read-only first, with strong token handling and no write API until the data model is stable.

8. **Android Offline Reads**
   - Build this before large mobile/native ambitions if the phone is a real reading surface.
   - Do not start it until the physical APK smoke is refreshed.

Do not build next:

- Full visual graph as a centerpiece.
- Recursive Knowly-style GenPages/Flows.
- Full spaced-repetition gamification.
- Broad social/video platform scraping.
- Gmail mailbox automation.
- AI podcasts, voice cloning, or "listen mode".
- Native desktop/mobile apps beyond the existing PWA/APK path.
- A Notion-grade block editor.
- Browser routine automation agents.

---

## 2. Work Plan And To-Do List

This report was produced using the following checklist.

| Step | Status | Notes |
|---|---|---|
| Define research scope and execution plan | Done | Focused on Recall, Knowly, supplied Notion material, and AI Brain's current roadmap. |
| Read current AI Brain product state | Done | Reviewed roadmap, project tracker, capture plans, v0.8 execution summary, and Phase 2 running log. |
| Research Recall site, docs, feedback, roadmap, pricing | Done | Public docs and feedback were accessible. |
| Research Knowly site, Chrome Web Store, pricing, updates | Done | Public site, pricing, Chrome Web Store, and Product Hunt were accessible. Updates route is a Notion iframe; some content is lower confidence. |
| Research supplied Notion link | Partially done | The exact supplied Notion URL loads a JS-only Notion shell and was not text-extractable through static fetch. See source caveat below. |
| Compare competitor capabilities to AI Brain | Done | Compared capture, organization, Ask/chat, graph, review, mobile, API/MCP, export, and trust posture. |
| Create recommendation report | Done | This file. |

---

## 3. Source Caveats

### 3.1 Recall

Recall's public sources were accessible:

- Website: https://www.recall.it/
- Docs: https://docs.recall.it/
- Supported content: https://docs.recall.it/supported-content/all-supported-content
- Augmented Browsing: https://docs.recall.it/deep-dives/recall-augmented-browsing
- Knowledge Graph: https://docs.recall.it/deep-dives/graph/overview
- Quiz and spaced repetition: https://docs.recall.it/deep-dives/quiz-and-spaced-repetition
- API: https://docs.recall.it/developer/api
- MCP: https://docs.recall.it/developer/mcp
- Feedback roadmap: https://feedback.recall.it/
- Changelog: https://feedback.recall.it/changelog
- Pricing: https://www.recall.it/pricing
- Recall 2.0 announcement: https://www.recall.it/post/recall-2-0-announcement

Confidence: **high**.

### 3.2 Knowly

Knowly's public sources were partly accessible:

- Website: https://goknowly.ai/
- Pricing: https://goknowly.ai/price
- Chrome Web Store: https://chromewebstore.google.com/detail/knowly/oficpngmljfaphmfjleogdkkjpdpnlcl
- Product Hunt: https://www.producthunt.com/products/knowly-ai
- Updates route: https://goknowly.ai/updates

The `/updates` route is a web app wrapper around a Notion iframe. Static extraction found the embedded Notion page ID `204ad268-1bdd-80a0-89b2-ee7a6f72417f`, but the Notion page itself loads through client-side JavaScript and did not expose useful text through a plain fetch.

Confidence: **medium** for Knowly positioning, pricing, extension details, and public product claims. **Lower** for detailed update/roadmap content unless later verified visually in a browser.

### 3.3 Supplied Notion Link

The user supplied:

```text
https://vaulted-shoemaker-888.notion.site/ebd//20fad2681bdd80bc9b0bfcee2b747665
```

This URL returns a Notion JS shell with page metadata but no readable page text through static fetch. The double slash after `/ebd//` also resembles a known Notion embed URL issue. A few canonical variants were tested, but no static readable content was recovered.

Confidence: **low** for any direct claims from that exact page. It should be reopened manually in a browser if it is important.

---

## 4. Current AI Brain Baseline

AI Brain is no longer a blank-slate prototype. The latest deployed state matters.

### Shipped strengths

- Cloud-hosted app at `https://brain.arunp.in`.
- Telegram/API capture smoke is green for:
  - YouTube
  - YouTube Shorts
  - LinkedIn with pasted text
  - Substack
- YouTube anti-bot failures now save metadata instead of failing completely.
- YouTube/Shorts/LinkedIn weak captures can be upgraded with pasted text.
- Strong captures are protected from accidental downgrade.
- Upgrade clears stale summaries, chunks, embeddings, auto-tags, and jobs.
- Library has quality filters:
  - All
  - Needs upgrade
  - Full text
  - Metadata only
- Ask/RAG already exists with semantic search and citations.
- Production audit is clean after Next 16.2.9 patch.
- Production DB/artifact smoke cleanup is clean.

### Open product gaps

- No true Capture Review Inbox yet.
- No browser selected-text capture.
- No Substack paid/newsletter email-body capture.
- No quality-aware Ask behavior.
- No scoped Ask by tag/date/source/selection in a polished UI.
- No source highlight or "jump to exact passage" workflow.
- No read-only MCP/API context surface for external AI tools.
- Android physical phone smoke remains pending.
- Android offline item reads are still planned, not shipped.
- Graph and augmented browsing plans exist, but they predate the current capture-quality reality.

### The important strategic shift

Before v0.8, the system had a reliability problem: captures could fail or create confusing dummy/weak records.

After v0.8, the system has a product-quality problem: weak captures are now honestly saved, but the user still needs help turning them into useful memory.

That makes "review, upgrade, selected text, and source grounding" more important than graph visuals or learning-game mechanics.

---

## 5. Recall Research Summary

### Positioning

Recall positions itself as a lifelong AI knowledge base: save what matters, write what you think, and curate an AI that knows what you know. It emphasizes "personal context" as the durable edge when frontier models become broadly available.

This matters because Recall is not only selling capture. It is selling a personal context layer.

### Supported sources

Recall publicly lists support for:

- YouTube videos and Shorts
- TikTok and Vimeo
- PDFs
- Google Docs and Slides
- Websites, articles, and blogs
- Apple Podcasts and Spotify Podcasts
- Bookmark imports
- Pocket imports
- Markdown imports from tools like Notion or Obsidian
- X posts
- Reddit posts

Limitations include private/member-only content, paid podcasts, paywalls requiring extension access, and file/import size limits.

### User-facing workflows

Recall has:

- Browser extension capture.
- Web app URL/content capture.
- Mobile app/share-sheet capture.
- Automatic summarization.
- Automatic tags.
- Rich notes.
- Knowledge graph.
- Augmented Browsing that resurfaces prior knowledge while the user browses.
- Quiz and spaced repetition.
- Markdown export.
- API and MCP.

### Roadmap and feedback signals

The most useful Recall insight is not the feature list. It is the feedback pressure.

Top or active feedback themes include:

- Subscribe to content so RSS feeds, newsletters, YouTube channels, and podcasts automatically enter the knowledge base.
- Import a list of URLs.
- Highlight in source text/transcript.
- Support more social sources such as X, LinkedIn, Instagram.
- Improve search UI/UX.
- Faster mobile sharing.
- Custom AI prompts.
- OCR/image reading.
- Better Substack saving.
- Smarter duplicate detection.
- Multi-select export and multi-card chat.

This is important because even a more mature competitor is still investing in the same basic trust issues:

- capture completeness
- duplicate handling
- mobile capture reliability
- search usability
- Substack quality
- source-grounded highlights
- multi-item chat

### Strategic implication for AI Brain

Recall is broad. AI Brain should be sharper.

The best Recall-inspired features for AI Brain are:

- Source highlights.
- Multi-select/scoped Ask.
- Markdown export and portability.
- Read-only MCP/API.
- Capture subscriptions later.
- A light review loop.

The worst Recall features to chase immediately are:

- Full graph as a primary navigation mode.
- Public quiz challenges.
- Voice cloning/listen mode.
- Every content source.
- Full mobile/native parity.

---

## 6. Knowly Research Summary

### Positioning

Knowly's current positioning is "From saved to understood." It presents itself as a proactive learning/knowledge product, not a passive bookmark manager and not a prompt-first chatbot.

The public homepage frames the product in three acts:

- Save and organize.
- Understand through Flows, GenPages, and GenLinks.
- Browse with digests on every webpage.

Product Hunt describes Knowly as "LLM Wiki + NotebookLM" in a closed-loop proactive AI.

### Capture sources and surface

Knowly is Chrome-first:

- Save web pages.
- Save PDFs/documents.
- Save videos.
- Save tweets or tweet-like social content.
- Use a "bubble" from the browser.

The Chrome Web Store listing showed:

- Extension version `0.0.19`.
- Updated May 9, 2026.
- Hundreds of users, still early.
- Website content permission disclosure.
- In-app purchases.

### AI behavior

Knowly's public wedge is not "ask a chatbot." It is:

- personalized digest
- Flow
- GenPage
- GenLink
- proactive "next move"
- cross-source connections

Pricing confirms chat exists, but it is secondary to saving, digesting, and generating flows/pages.

### Strategic implication for AI Brain

Knowly's best insight is that users do not always want a blank prompt box. Sometimes they want the system to say:

- "Here is what this means."
- "Here is what is connected."
- "Here is what you should read or review next."

But Knowly's full GenPage/Flow model is too large for AI Brain right now. AI Brain should borrow the small version:

- a weekly digest
- item-level "what to do next"
- related capture suggestions
- short generated reading briefs from selected items

AI Brain should not build recursive generated pages yet.

---

## 7. Competitor Comparison Against AI Brain

| Capability | Recall | Knowly | AI Brain today | Recommendation |
|---|---|---|---|---|
| URL/article capture | Strong | Claimed | Shipped | Keep hardening, do not overbuild. |
| YouTube capture | Strong, but private/member limits | Claimed video digest | Shipped with fallback and pasted-text upgrade | Improve user-provided transcript/notes path and source highlighting. |
| YouTube Shorts | Supported by Recall | Not clearly separated | Shipped | Keep as part of YouTube lane. |
| LinkedIn capture | In review/planned at Recall | Not clearly verified | Metadata/pasted text safe path shipped | Build selected-text browser capture instead of scraping. |
| Substack capture | Recently improved by Recall | Web/PDF capture claimed | Public Substack works; paid/newsletter path missing | Build manual email/paste capture before Gmail automation. |
| Browser extension | Core Recall/Knowly surface | Core surface | Existing extension, but not selected-text focused | Build selected-text capture and optional highlight save. |
| Mobile sharing | Recall has mobile, still feedback pain | Mobile app backlog | Telegram/API/APK exist; phone smoke pending | Do not expand mobile until APK smoke and offline reads are handled. |
| Automatic organization | Strong auto-tags/graph | Auto-clusters | Auto enrichment/tags exist | Add editable cluster/tag review, not a big taxonomy project. |
| Search | Recall improving UI | Unified search planned | FTS/semantic/hybrid exists | Improve scoped search and quality-aware Ask. |
| Chat with all content | Recall ships | Knowly chat exists but secondary | Ask/RAG shipped | Add scoping, multi-select, and weak-source warnings. |
| Multi-select chat | Recall added June 2026 | Not clear | Not polished | Build after Capture Review Inbox. |
| Source highlights | Recall planned/high demand | Digest page surface | Not present | Build soon. This is high leverage. |
| Knowledge graph | Recall mature | Planned/dynamic graph positioning | Related items shipped; graph plan exists | Defer full graph until content volume and source quality justify it. |
| Spaced repetition | Recall strong | Not public evidence | Planned later | Defer full SRS; build lightweight review first. |
| GenPages/Flows | Not Recall's main thing | Knowly wedge | GenPages planned historically | Defer. Build simpler "briefing from selected sources" later. |
| API/MCP | Recall read-only API/MCP | Not public | Capture API exists; no strong context MCP | Build read-only context API/MCP after scoped Ask. |
| Export | Recall Markdown export, multi-select ZIP | Not emphasized | Some export exists historically | Harden export as trust feature. |
| Recycle bin/version safety | Recall feedback demand | Not clear | Not prominent | Add as cheap trust feature before risky editing flows. |

---

## 8. Recommended Build List

## 8.1 Build Next: Capture Review Inbox

### Why

The v0.8 release made weak captures visible and upgradeable, but the user still needs a work surface for dealing with them.

Recall's feedback shows users care about mobile capture speed, duplicate detection, and better Substack saving. AI Brain has just touched all three. The next step is to make these states actionable.

### What to build

Add a `Review` or `Needs attention` view that shows:

- metadata-only YouTube/Shorts
- metadata-only LinkedIn
- Substack previews/paywall previews
- failed captures, if any
- duplicate candidates
- captures with no summary or no embeddings

Each row should have one clear next action:

- Add transcript or notes.
- Paste selected text.
- Open source.
- Mark as good enough.
- Delete.
- Merge duplicate.

### Acceptance criteria

- User can process weak captures in under 30 seconds each.
- Weak captures do not pollute the main Library view unless the user wants them there.
- Each weak item shows why it is weak in plain language.
- Processing a weak item updates Ask/search state correctly.

### Priority

**P0 - build first.**

---

## 8.2 Build Next: Browser Selected-Text Capture

### Why

This is the best answer to the user's real source mix:

- LinkedIn blocks anonymous server-side reads.
- Substack paid content is available to the user in browser/email, not to the server.
- Web pages often contain the specific passage the user cares about, not necessarily the whole page.

Selected-text capture is safer than scraping and more precise than "save whole page."

### What to build

Chrome extension actions:

- Select text on page.
- Click extension or context-menu item.
- Save selected text with:
  - source URL
  - page title
  - selected text
  - optional user note
  - captured timestamp

Server behavior:

- If source URL already exists as a weak capture, offer upgrade/attach.
- If source URL is new, create a `user_provided_full_text` or `selected_text` item.
- Preserve exact text formatting enough for quotes, bullets, and paragraph breaks.

### Acceptance criteria

- Works on LinkedIn post text selected by user.
- Works on Substack article/email text selected by user.
- Works on normal web pages.
- Does not require broad host permissions for MVP; use explicit user action.
- Does not scrape private content without user-selected text.

### Priority

**P0 - build immediately after Capture Review Inbox.**

---

## 8.3 Build Next: Substack Email/Paste Capture

### Why

Substack is one of the user's main sources. Public Substack extraction can work, but paid/subscriber content is best captured from the email body or user-provided text.

The spike already found manual email-body parsing promising, but not proven on real paid examples.

### What to build

Start with manual paste, not Gmail:

- New capture mode: `Paste article/newsletter`.
- Fields:
  - title
  - source URL, optional
  - author/publication, optional
  - body
  - notes, optional
- If the text looks like a Substack email, clean common footer noise.
- Store as user-provided full text.

### Acceptance criteria

- Captures a pasted Substack newsletter cleanly.
- Does not store raw email headers/artifacts by default.
- Does not require Gmail OAuth.
- Can upgrade an existing Substack preview when URL matches.
- Includes tests with sanitized real examples before production.

### Priority

**P0/P1 - build after selected-text capture, or before it if Substack becomes the most painful source.**

---

## 8.4 Build Next: Quality-Aware Ask And Scoped Ask

### Why

Recall is pushing smarter chat with filters, time ranges, and synthesis. Knowly is pushing flows instead of blank prompts. AI Brain already has Ask, so the highest leverage is not another chat page. It is better control over what Ask uses.

### What to build

Ask controls:

- Ask all high-quality captures.
- Ask selected items.
- Ask a tag/topic.
- Ask a source type:
  - YouTube
  - LinkedIn
  - Substack
  - PDF
  - Note
- Ask a date range.
- Exclude metadata-only items by default, or warn when included.

Answer behavior:

- If answer depends on weak captures, say so.
- Show source quality labels beside citations.
- Let user jump from citation to source passage when available.

### Acceptance criteria

- Multi-select two or more Library items and ask across them.
- Ask can be limited to Substack or YouTube.
- Metadata-only items are not silently treated as rich evidence.
- The user can tell which sources shaped the answer.

### Priority

**P1 - after capture review and source capture.**

---

## 8.5 Build Next: Source Highlights And Passage Navigation

### Why

Recall feedback has a planned request for "Highlight in source text/transcript" with meaningful vote count. This is not decoration. It is a trust feature.

AI Brain needs the user to believe:

- the capture saved the important thing
- Ask used the right passage
- the original context is recoverable

### What to build

For captured items:

- Highlight saved selected passages.
- Show extracted key quotes as clickable passages.
- For YouTube transcript lines, preserve timestamp anchors.
- For Ask citations, jump to the relevant passage on the item page.

### Acceptance criteria

- Selecting text from browser creates a visible highlight in item detail.
- Ask citation opens the relevant passage.
- YouTube citation can jump to the timestamp line inside saved transcript text.
- No complex annotation editor in MVP.

### Priority

**P1 - pair with selected-text capture or build immediately after.**

---

## 8.6 Build Later: Lightweight Review / Weekly Digest

### Why

Recall's spaced repetition is a strong differentiator, and Knowly's proactive suggestions point in the same direction: the product should not wait forever for the user to search.

But full SRS is too much too soon.

### What to build first

Weekly digest:

- New captures this week.
- Weak captures needing upgrade.
- 3 to 5 resurfaced older items.
- Suggested connections.
- "Ask a question about these" button.

Daily review:

- Optional later.
- Keep it private and calm, not gamified.

### Acceptance criteria

- Weekly review can be generated from existing captures.
- User can mark items as reviewed, archive, or upgrade.
- No leaderboard, streak system, or challenge mechanic.

### Priority

**P2 - after source capture and scoped Ask.**

---

## 8.7 Build Later: Read-Only API/MCP

### Why

Recall's API/MCP is strategically important because it turns the knowledge base into context infrastructure. AI Brain is already used alongside Codex-like workflows, so this could be high leverage.

### What to build

Read-only first:

- Search items.
- Retrieve item metadata.
- Retrieve item text/chunks.
- Retrieve recent captures.
- Retrieve weak captures needing attention.
- Optional semantic search endpoint.

Do not build write actions until:

- token model is clean
- audit logging exists
- destructive actions have review/recycle bin safety

### Acceptance criteria

- External AI tool can search AI Brain without seeing secrets.
- No mutation endpoints in MVP.
- API token can be rotated.
- Calls are logged enough for debugging.

### Priority

**P2 - high leverage, but after capture quality is stable.**

---

## 8.8 Build Later: Android Offline Reads

### Why

Offline reads are valuable if the phone is a real reading surface. The roadmap already contains a detailed plan. Recall's mobile feedback reinforces that mobile capture/read reliability matters.

### What to do before building

- Re-run physical APK smoke.
- Confirm current app install/version.
- Confirm actual user behavior: does the user read saved items on phone, or mainly capture into Brain?

### Priority

**P2/P1 depending on phone usage.**

If the phone is mostly a capture input, selected-text/browser/Telegram quality work is more urgent. If the phone is a daily reading surface, offline reads should move up.

---

## 9. Features To Skip Or Defer

## 9.1 Full Knowledge Graph

Defer.

Reason:

- AI Brain's current bottleneck is capture quality and retrieval trust.
- The library is small enough that graph value will be thin.
- Graph work has non-trivial schema, embedding, layout, and UI complexity.
- Recall's graph is a mature product surface, but AI Brain can get 80 percent of the utility from related items, scoped Ask, highlights, and "why related" explanations.

Build later when:

- library has hundreds of strong captures
- tags and source quality are clean
- user has a specific question the graph answers better than search

## 9.2 Knowly-Style GenPages And Recursive Flows

Defer.

Reason:

- This is a big product bet, not a small feature.
- It can generate attractive pages that are not actually used.
- It risks turning the system from "trusted memory" into "content generator."

Build a much smaller version first:

- "Create briefing from selected items."
- "What should I read next?"
- "Summarize these five captures."

## 9.3 Full Spaced Repetition And Gamification

Defer.

Reason:

- Recall's SRS is strong, but it is also a whole product inside the product.
- AI Brain does not yet know which captures are worth remembering.
- Weak or metadata-only captures would produce bad review cards.

Build lightweight review first.

## 9.4 Broad Platform Scraping

Skip for now.

Avoid:

- LinkedIn scraping
- Instagram scraping
- TikTok scraping
- X private/protected scraping
- paid content bypass

Use explicit user-provided text instead.

## 9.5 Gmail/Mailbox Automation

Defer.

Reason:

- OAuth, privacy, mailbox scope, background sync, and deletion semantics are heavy.
- Manual email paste captures the same product value with much less risk.

Build Gmail automation only if:

- manual paste works
- the user captures many Substack emails
- the pain is repetition, not quality

## 9.6 Audio Summaries, Voice Cloning, AI Podcasts

Skip.

Reason:

- They do not solve today's capture/retrieval bottleneck.
- They add cost and surface area.
- They are nice when the core loop is already sticky.

## 9.7 Native Mobile/Desktop Apps

Skip for now.

Reason:

- The existing web/PWA/APK path is enough for a solo tool.
- Native work multiplies QA and release burden.
- Current mobile risk is smoke/offline/read quality, not native polish.

## 9.8 Notion-Grade Editor

Skip.

Reason:

- AI Brain should not become Notion.
- The core value is saved sources plus source-grounded memory.
- Markdown/plain text with good capture, highlights, and export is enough.

---

## 10. Recommended Next Release Shape

Recommended release name:

```text
v0.8.2 Capture Review And Selected Text
```

### Release objective

Make weak or partial captures easy to identify, upgrade, and use safely in Ask.

### In scope

- Capture Review Inbox / Needs attention view.
- Browser selected-text capture MVP.
- Upgrade existing weak capture from selected text.
- Source quality labels in Ask citations.
- Basic source highlight display on item page.

### Out of scope

- Full Substack email parser, unless selected-text capture is too slow.
- Full graph.
- Full SRS.
- Gmail integration.
- GenPages.

### Suggested acceptance tests

- YouTube metadata-only item appears in Review Inbox.
- LinkedIn metadata-only item appears in Review Inbox.
- Substack preview item appears in Review Inbox with correct action.
- User selects LinkedIn text in browser and saves it to Brain.
- Selected text upgrades existing LinkedIn weak item.
- User selects Substack text in browser and saves it to Brain.
- Ask response shows source quality labels.
- Ask does not silently rely on metadata-only items as if they were full text.

---

## 11. Strategic Product Principle

The best feature filter for AI Brain should be:

> Does this make captured knowledge more trustworthy, recoverable, and useful later?

If yes, build it.

If it mainly makes the app look more impressive, defer it.

This filter pushes the roadmap toward:

- better capture
- explicit source quality
- selected user text
- source highlights
- scoped Ask
- export/API trust
- quiet review

And away from:

- big graph surfaces
- generic generated pages
- broad scraping
- gamification
- native app expansion
- audio novelty features

---

## 12. Final Recommendation

The next right product move is:

1. Build **Capture Review Inbox**.
2. Build **Browser Selected-Text Capture**.
3. Use that to improve **LinkedIn and Substack** without unsafe scraping.
4. Then make **Ask quality-aware and scoped**.

This path is smaller than the Recall/Knowly feature universe, but it is more aligned with AI Brain's actual wedge: a private, trustworthy, self-hosted memory system that captures the user's real sources and can explain itself later.

That is the right thing to build before graphs, GenPages, SRS, or broader platform coverage.

---

## 13. Source Links

### Recall

- https://www.recall.it/
- https://www.recall.it/pricing
- https://www.recall.it/post/recall-2-0-announcement
- https://www.recall.it/compare/notebooklm-alternative
- https://docs.recall.it/
- https://docs.recall.it/supported-content/all-supported-content
- https://docs.recall.it/deep-dives/recall-augmented-browsing
- https://docs.recall.it/deep-dives/graph/overview
- https://docs.recall.it/deep-dives/quiz-and-spaced-repetition
- https://docs.recall.it/developer/api
- https://docs.recall.it/developer/mcp
- https://feedback.recall.it/
- https://feedback.recall.it/changelog
- https://feedback.recall.it/changelog/recall-release-notes-4-june-2026-multi-select-for-export-and-chat-better-substac
- https://feedback.recall.it/feature-requests?sort=top
- https://feedback.recall.it/feature-requests/p/subscribe-to-content-that-get-automatically-added-to-your-knowledge-base
- https://feedback.recall.it/feature-requests/p/import-list-of-urls
- https://feedback.recall.it/feature-requests/p/highlight-in-source-text-transcript

### Knowly

- https://goknowly.ai/
- https://goknowly.ai/updates
- https://goknowly.ai/price
- https://chromewebstore.google.com/detail/knowly/oficpngmljfaphmfjleogdkkjpdpnlcl
- https://www.producthunt.com/products/knowly-ai
- https://vaulted-shoemaker-888.notion.site/ebd//20fad2681bdd80bc9b0bfcee2b747665

### AI Brain Local Context

- `ROADMAP_TRACKER.md`
- `PROJECT_TRACKER.md`
- `BACKLOG.md`
- `Phase_2_RUNNING_LOG.md`
- `docs/plans/v0.8.0-capture-quality-next-feature-plan-2026-06-10_17-39-01_IST.md`
- `docs/plans/v0.8.0-safe-capture-upgrades-implementation-plan-2026-06-10_17-55-32_IST.md`
- `docs/plans/v0.6.x-augmented-browsing.md`
- `docs/plans/v0.6.x-graph-view.md`
- `docs/plans/v0.6.x-library-offline-from-db.md`
- `docs/plans/spikes/SPIKE-012-substack-email-ingestion-2026-06-10_11-16-14_IST.md`
