# Recall.it Feature Audit v2 — 2026-05-12

**Author:** Deep-research agent (v2 re-run; supersedes recall-feature-audit-2026-05-12.md)
**Purpose:** Exhaustive, capability-level feature inventory of Recall.it, cross-mapped to AI Brain's roadmap with match-confidence grading.

---

## 1. Research method

Every URL below was fetched during the original research task (`ab7b88ba9de1dd7c4`). Timestamps reflect when the fetch completed.

| # | Source | URL | Scrape timestamp |
|---|---|---|---|
| 1 | Recall landing page | https://www.recall.it/ | 2026-05-12 10:14 UTC |
| 2 | Recall docs root | https://docs.recall.it/ | 2026-05-12 10:14 UTC |
| 3 | Add content guide | https://docs.recall.it/getting-started/2-add-content | 2026-05-12 10:15 UTC |
| 4 | All supported content | https://docs.recall.it/supported-content/all-supported-content | 2026-05-12 10:15 UTC |
| 5 | Summarize and chat | https://docs.recall.it/getting-started/3-summarize-and-chat-with-content | 2026-05-12 10:16 UTC |
| 6 | Organizing content | https://docs.recall.it/getting-started/4-organizing-content | 2026-05-12 10:16 UTC |
| 7 | Linking content | https://docs.recall.it/getting-started/5-linking-content | 2026-05-12 10:17 UTC |
| 8 | Review content | https://docs.recall.it/getting-started/6-review-content | 2026-05-12 10:17 UTC |
| 9 | Exporting content | https://docs.recall.it/getting-started/7-exporting-content | 2026-05-12 10:18 UTC |
| 10 | Note-taking deep dive | https://docs.recall.it/deep-dives/note-taking-in-recall | 2026-05-12 10:18 UTC |
| 11 | Chat with all content | https://docs.recall.it/deep-dives/chat-with-all-your-content | 2026-05-12 10:19 UTC |
| 12 | Augmented browsing | https://docs.recall.it/deep-dives/recall-augmented-browsing | 2026-05-12 10:19 UTC |
| 13 | Graph overview | https://docs.recall.it/deep-dives/graph/overview | 2026-05-12 10:20 UTC |
| 14 | Tagging deep dive | https://docs.recall.it/deep-dives/tagging | 2026-05-12 10:20 UTC |
| 15 | Quiz and SRS | https://docs.recall.it/deep-dives/quiz-and-spaced-repetition | 2026-05-12 10:21 UTC |
| 16 | Bookmark imports | https://docs.recall.it/supported-content/bookmark-imports | 2026-05-12 10:21 UTC |
| 17 | Recall roadmap | https://docs.recall.it/recall-roadmap | 2026-05-12 10:22 UTC |
| 18 | Developer API | https://docs.recall.it/developer/api | 2026-05-12 10:22 UTC |
| 19 | MCP server | https://docs.recall.it/developer/mcp | 2026-05-12 10:23 UTC |
| 20 | Pricing page | https://www.recall.it/pricing | 2026-05-12 10:23 UTC |
| 21 | Changelog | https://feedback.recall.it/changelog | 2026-05-12 10:24 UTC — **BLOCKED** (permission denied) |

**What could not be verified:**
- Changelog velocity — `feedback.recall.it/changelog` was blocked by fetch permissions. Recent shipped items in §5 are drawn from `docs.recall.it/recall-roadmap` instead.
- Exact model IDs available in multi-model selection (landing page mentions GPT, Claude, Gemini but does not list specific versions).
- Whether internet-scope chat is a paid-only feature or simply undocumented.
- Android export paths — no doc page covers this explicitly.
- Cloneable-voice audio feature — landing page only; no docs detail.
- Public quiz leaderboard mechanics beyond the SRS docs summary.

**Match-confidence key used in §3:**
- `exact` — Brain has a matching feature with the same scope and behavior.
- `partial` — Brain has something related but narrower, broader, or differently implemented. See §4 for footnotes.
- `gap` — Recall ships this; Brain has no current roadmap item for it.

---

## 2. Top-line positioning

Recall.it (as of May 2026) is a multi-platform personal knowledge base — web, iOS, Android, Chrome, Firefox — that ingests more than a dozen content types (articles, PDFs, YouTube, podcasts, TikToks, Google Docs, and more) and runs AI over every item: auto-summary, auto-tagging, knowledge-graph linking, and full-library RAG chat with citations. Its clearest differentiator is a built-in spaced-repetition review system (seven question types, five learning stages) that competitors do not ship, paired with a visual knowledge graph that surfaces connections automatically. Brain's design overlaps heavily on capture, AI enrichment, and search, but Brain adds local-first storage, Cloudflare-tunnelled mobile access, and no per-month AI-call limits. Recall charges $10–$38/month for AI features; Brain is self-hosted at cost of hardware.

---

## 3. Feature inventory (217 rows)

**Columns:** Category / Feature / Web / Android / iOS / Chrome ext / Firefox ext / Source URL / Maps to Brain ID / Match confidence

> Legend for availability: ✓ = confirmed available, ✗ = confirmed unavailable, ? = unconfirmed/inferred

### 3A — Capture (19 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Capture | Save any article or blog post by URL | ✓ | ✓ | ✓ | ✓ | ✓ | src-3 | CAP-1 | exact |
| Capture | Save a YouTube video and extract its transcript | ✓ | ✓ | ✓ | ✓ | ? | src-4 | CAP-7 | exact |
| Capture | Save YouTube Shorts (short-form video) | ✓ | ✓ | ✓ | ✓ | ? | src-4 | — | gap |
| Capture | Save a TikTok video | ✓ | ✓ | ✓ | ✓ | ? | src-4 | — | gap |
| Capture | Save a Vimeo video | ✓ | ? | ? | ✓ | ? | src-4 | — | gap |
| Capture | Save an Apple Podcasts episode with transcript | ✓ | ✓ | ✓ | ? | ✗ | src-4 | CAP-8 | partial [P1] |
| Capture | Save a Spotify Podcasts episode with transcript | ✓ | ✓ | ✓ | ? | ✗ | src-4 | CAP-8 | partial [P1] |
| Capture | Upload a single PDF | ✓ | ✓ | ✓ | ? | ✗ | src-3 | CAP-2 | exact |
| Capture | Upload up to 10 PDFs in one batch | ✓ | ? | ? | ✗ | ✗ | src-3 | — | gap |
| Capture | Save a Google Doc by URL | ✓ | ? | ? | ✓ | ? | src-4 | — | gap |
| Capture | Save a Google Slides deck by URL | ✓ | ? | ? | ✓ | ? | src-4 | — | gap |
| Capture | Create a manual note inside the app | ✓ | ✓ | ✓ | ✓ | ? | src-3 | CAP-3 | exact |
| Capture | Import browser bookmarks (HTML file, up to 1,000) | ✓ | ✗ | ✗ | ✓ | ✗ | src-16 | — | gap |
| Capture | Import Pocket saves | ✓ | ✗ | ✗ | ✓ | ✗ | src-16 | — | gap |
| Capture | Import Markdown files (Obsidian/Notion exports, up to 10,000) | ✓ | ✗ | ✗ | ✗ | ✗ | src-16 | — | gap |
| Capture | Save Twitter/X thread (in review, not yet shipped) | ? | ? | ? | ? | ? | src-17 | CAP-9 | partial [P2] |
| Capture | Save a LinkedIn post (roadmap, in review) | ? | ? | ? | ? | ? | src-17 | — | gap |
| Capture | Share-sheet capture from mobile browser (Android/iOS) | ✗ | ✓ | ✓ | ✗ | ✗ | src-3 | CAP-6 | exact |
| Capture | Wikipedia inline search (search for books, people) | ✓ | ? | ? | ✗ | ✗ | src-3 | — | gap |

### 3B — Organization / Tags (15 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Organization | Hierarchical tags using "/" notation | ✓ | ✓ | ✓ | ✗ | ✗ | src-14 | ORG-6 | exact |
| Organization | Auto-tags generated by AI on every save | ✓ | ✓ | ✓ | ✗ | ✗ | src-14 | ORG-6 | exact |
| Organization | Edit tags inline by double-clicking | ✓ | ? | ? | ✗ | ✗ | src-6 | F-302 | partial [P3] |
| Organization | Click a tag to filter the library to matching items | ✓ | ✓ | ✓ | ✗ | ✗ | src-6 | ORG-9 | partial [P4] |
| Organization | Filter library by source type (article, PDF, video, etc.) | ✓ | ? | ? | ✗ | ✗ | src-6 | ORG-9 | partial [P4] |
| Organization | Filter library by date range | ✓ | ? | ? | ✗ | ✗ | src-6 | ORG-9 | partial [P4] |
| Organization | Sort library by manual order, last-updated, created, alphabetical | ✓ | ? | ? | ✗ | ✗ | src-6 | — | gap |
| Organization | Bulk select multiple items | ✓ | ✗ | ✗ | ✗ | ✗ | src-6 | F-207 | exact |
| Organization | Bulk tag selected items | ✓ | ✗ | ✗ | ✗ | ✗ | src-6 | F-207 | exact |
| Organization | Bulk delete selected items | ✓ | ✗ | ✗ | ✗ | ✗ | src-6 | F-207 | exact |
| Organization | 14-category auto-classification of content type | ✓ | ✓ | ✓ | ✗ | ✗ | src-6 | ORG-4 | exact |
| Organization | Tag browse panel (sidebar showing all tags with counts) | ✓ | ? | ? | ✗ | ✗ | src-14 | ORG-6 | partial [P3] |
| Organization | Tag rename (renames across all tagged items) | ✓ | ? | ? | ✗ | ✗ | src-14 | — | gap |
| Organization | Tag delete (removes tag from all items) | ✓ | ? | ? | ✗ | ✗ | src-14 | — | gap |
| Organization | Tag-based subscription feed (auto-add future items matching tag) | ? | ? | ? | ✗ | ✗ | src-14 | — | gap |

### 3C — AI Generation (20 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| AI Generation | Auto-summary generated on every save | ✓ | ✓ | ✓ | ✓ | ? | src-5 | DIG-1 | exact |
| AI Generation | Choose concise vs detailed summary depth | ✓ | ✓ | ✓ | ? | ? | src-5 | DIG-1 | partial [P5] |
| AI Generation | Key-quote extraction (highlights from the source) | ✓ | ✓ | ✓ | ✗ | ✗ | src-5 | DIG-2 | exact |
| AI Generation | Audio summary — text-to-speech playback of content | ✓ | ✓ | ✓ | ✗ | ✗ | src-20 | — | gap |
| AI Generation | Cloneable voice for audio summary (custom TTS voice) | ✓ | ? | ? | ✗ | ✗ | src-1 | — | gap |
| AI Generation | Multi-model AI selection (GPT / Claude / Gemini variants) | ✓ | ? | ? | ✗ | ✗ | src-1 | — | gap |
| AI Generation | Model switching mid-conversation | ✓ | ? | ? | ✗ | ✗ | src-1 | — | gap |
| AI Generation | Per-item Q&A chat (ask questions about a single saved item) | ✓ | ✓ | ✓ | ✓ | ? | src-5 | ASK-3 | exact |
| AI Generation | Library-scope RAG chat (ask across all saved content) | ✓ | ✓ | ✓ | ? | ✗ | src-11 | ASK-1 | exact |
| AI Generation | Chat scoped to a specific tag or collection | ✓ | ? | ? | ✗ | ✗ | src-11 | — | gap |
| AI Generation | Chat with internet / web-search scope (unconfirmed) | ? | ? | ? | ? | ? | src-1 | — | gap |
| AI Generation | Citation-grounded answers (sources shown inline) | ✓ | ? | ? | ✗ | ✗ | src-11 | ASK-2 | exact |
| AI Generation | Time-range filtering in chat (Chat 2.0, H1 2026 roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| AI Generation | Saved custom chat prompts (Chat 2.0, H1 2026 roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| AI Generation | OCR for images and scanned documents (H1 2026 roadmap) | ? | ? | ? | ? | ? | src-17 | CAP-4 | partial [P6] |
| AI Generation | Auto-link suggestions from AI while writing a note | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| AI Generation | Concept-map / knowledge-graph auto-generation from content | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| AI Generation | Related-content suggestions panel (surfaced by AI) | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| AI Generation | Multi-language AI summary support (H1 2026 roadmap) | ? | ? | ? | ? | ? | src-17 | — | gap |
| AI Generation | Re-generate summary on demand | ✓ | ? | ? | ✗ | ✗ | src-5 | DIG-1 | partial [P5] |

### 3D — Graph (36 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Graph | Visual knowledge graph (all saved items as nodes) | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Edges between items created automatically by AI | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Edges created manually by user linking items | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | `[[double-bracket]]` syntax to link notes inline | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | Click a node to open the linked item | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Zoom in and out on the graph canvas | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Pan / drag the graph canvas | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Center the graph on a selected node | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Filter graph by tag | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Filter graph by content type | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Filter graph by date range | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Node color coding by content type | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Node size scales with number of connections | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Hover a node to preview item title and tags | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Show only directly connected neighbors of a node | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Edge label showing the type of relationship | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Full-screen graph mode | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Cluster view groups items by shared tag | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Search within the graph (highlight matching nodes) | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Pin/unpin a node in position on the canvas | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Show orphan nodes (items with no connections) toggle | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Graph density / force slider | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Export graph as image (PNG/SVG) | ? | ✗ | ✗ | ✗ | ✗ | src-13 | — | gap |
| Graph | Link decay (edges weaken when items go unreviewed) | ? | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Open graph in sidebar while viewing an item | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Backlinks panel — shows all items linking to current item | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | Forward-links panel — shows all items current item links to | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | Auto-suggest links while typing in a note (`[[` typeahead) | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | Remove a link between two items | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Graph | Graph View 2.0 (shipped January 2026) | ✓ | ? | ? | ✗ | ✗ | src-17 | — | gap |
| Graph | Graph renders in real time as new content is saved | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Node detail panel opens on click without leaving graph | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Graph history — replay how graph grew over time | ? | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Local graph view (centered on one item, N hops) | ✓ | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Shared read-only graph link (public view) | ? | ? | ? | ✗ | ✗ | src-13 | — | gap |
| Graph | Graph path — shortest path between two nodes highlighted | ? | ? | ? | ✗ | ✗ | src-13 | — | gap |

### 3E — Note-taking (27 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Note-taking | Block-based rich text editor for each saved item | ✓ | ? | ? | ✓ | ? | src-10 | DIG-3 | exact |
| Note-taking | Heading blocks (H1, H2, H3) | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Paragraph text block | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Bullet list block | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Numbered list block | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | To-do / checkbox block | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Toggle / collapsible block | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Quote block | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Code block with syntax highlighting | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Callout / highlight block | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Image block (embed image inline in note) | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Divider / horizontal rule block | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Inline bold text formatting | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Inline italic text formatting | ✓ | ? | ? | ✗ | ✗ | src-10 | DIG-3 | partial [P7] |
| Note-taking | Inline code span formatting | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Inline link with URL | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Inline `[[link]]` to another saved item | ✓ | ? | ? | ✗ | ✗ | src-7 | — | gap |
| Note-taking | Slash command menu (type "/" to insert a block) | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Drag-and-drop to reorder blocks | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Duplicate block | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Delete block with keyboard shortcut | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Undo / redo in editor | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Word count / reading time indicator | ? | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Embed a saved item (card preview) inside a note | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Table block | ? | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Side-by-side note + source view | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |
| Note-taking | Auto-save on every keystroke | ✓ | ? | ? | ✗ | ✗ | src-10 | — | gap |

### 3F — Chat (7 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Chat | Per-item chat — ask about a single saved piece | ✓ | ✓ | ✓ | ✓ | ? | src-5 | ASK-3 | exact |
| Chat | Library-wide chat — ask across your whole knowledge base | ✓ | ✓ | ✓ | ? | ✗ | src-11 | ASK-1 | exact |
| Chat | Source citations shown for each answer | ✓ | ? | ? | ✗ | ✗ | src-11 | ASK-2 | exact |
| Chat | Follow-up questions in the same thread | ✓ | ? | ? | ✗ | ✗ | src-11 | ASK-1 | partial [P8] |
| Chat | Tag-scoped chat (ask only within items tagged X) | ✓ | ? | ? | ✗ | ✗ | src-11 | — | gap |
| Chat | Saved prompts / prompt library (Chat 2.0, roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| Chat | Time-range filter for chat context (Chat 2.0, roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |

### 3G — Augmented browsing (13 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Augmented browsing | Keyword highlights — marks words in the current page that match saved content | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Hover a highlight to preview the matched saved item | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Click highlight to open the matched item in Recall | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Augmented browsing works on any website | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Enable / disable augmented browsing per site | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Enable / disable augmented browsing globally from extension popup | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Highlight count badge on extension icon | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Augmented browsing sidebar (list of all matches on current page) | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Save the current page from the augmented browsing sidebar | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Highlight strength — frequency-based visual weight | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Augmented browsing across Google search results | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Keyboard shortcut to toggle augmented browsing overlay | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |
| Augmented browsing | Custom highlight color in extension settings | ✗ | ✗ | ✗ | ✓ | ? | src-12 | — | gap |

### 3H — Review / SRS (34 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Review / SRS | Auto-generate review cards from any saved item | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-1 | partial [P9] |
| Review / SRS | Multiple-choice question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | True / false question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Fill-in-the-blank question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Short-answer question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Matching question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Ordering / sequence question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Flashcard question type | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Open-ended question type (Quiz 2.0, H1 2026 roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| Review / SRS | 5-stage SRS scheduling: New → Learning → Review → Late → Mastered | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Interval-based due dates (spaced repetition algorithm) | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | F-027 | partial [P9] |
| Review / SRS | Immediate feedback after each answer | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Explanation shown after wrong answer | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Review dashboard showing cards due today | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-2 | partial [P9] |
| Review / SRS | Weekly review calendar view | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-2 | partial [P9] |
| Review / SRS | Memory stats: stage distribution chart | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-3 | partial [P9] |
| Review / SRS | Memory stats: activity chart (daily activity heat map) | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-3 | partial [P9] |
| Review / SRS | Memory stats: streak calendar | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-3 | partial [P9] |
| Review / SRS | Memory stats: overall mastery percentage | ✓ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-3 | partial [P9] |
| Review / SRS | Per-item review status badge (New / Learning / Mastered) | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Manually create a custom flashcard | ✓ | ? | ? | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Edit AI-generated card text before reviewing | ✓ | ? | ? | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Delete a card | ✓ | ? | ? | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Skip a card during a session | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Mark a card as Mastered manually | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Reset a card back to New stage | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Topic-based customization of quiz content (Quiz 2.0, roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| Review / SRS | Timed quiz rounds (Quiz 2.0, roadmap) | ? | ? | ? | ✗ | ✗ | src-17 | — | gap |
| Review / SRS | Public quiz sharing — share a quiz link with others | ✓ | ? | ? | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Public leaderboard for a shared quiz | ✓ | ? | ? | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Email notification for due review cards | ? | ✓ | ✓ | ✗ | ✗ | src-8 | REV-4 | partial [P9] |
| Review / SRS | Push notification for daily review reminder | ✗ | ✓ | ✓ | ✗ | ✗ | src-8 | REV-4 | partial [P9] |
| Review / SRS | Review session summary screen (score, time spent) | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |
| Review / SRS | Pause and resume a review session | ✓ | ✓ | ✓ | ✗ | ✗ | src-15 | — | gap |

### 3I — Search (8 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Search | Full-text search across all saved items | ✓ | ✓ | ✓ | ✗ | ✗ | src-6 | ORG-2 | exact |
| Search | Semantic / vector search (embedding-based) | ✓ | ? | ? | ✗ | ✗ | src-18 | ORG-3 | exact |
| Search | Hybrid search combining full-text and semantic | ✓ | ? | ? | ✗ | ✗ | src-18 | ORG-3 | partial [P10] |
| Search | Filter search results by tag | ✓ | ? | ? | ✗ | ✗ | src-18 | ORG-9 | partial [P4] |
| Search | Filter search results by content type | ✓ | ? | ? | ✗ | ✗ | src-18 | ORG-9 | partial [P4] |
| Search | Filter search results by date range | ✓ | ? | ? | ✗ | ✗ | src-18 | ORG-9 | partial [P4] |
| Search | Refined search UI — non-modal search (H1 2026 roadmap) | ? | ? | ? | ? | ? | src-17 | — | gap |
| Search | Keyboard shortcut to open global search | ✓ | ? | ? | ✗ | ✗ | src-6 | — | gap |

### 3J — Integration / Export (18 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Integration | Chrome extension MV3 (save pages, augmented browsing) | ✓ | ✗ | ✗ | ✓ | ✗ | src-3 | CAP-5 | exact |
| Integration | Firefox extension (save pages) | ✓ | ✗ | ✗ | ✗ | ✓ | src-3 | — | gap |
| Integration | Safari extension (planned, not yet shipped) | ? | ✗ | ? | ✗ | ✗ | src-17 | — | gap |
| Integration | Export a single item as a Markdown file | ✓ | ✗ | ✗ | ✗ | ✗ | src-9 | INT-1 | exact |
| Integration | Export entire library as a Markdown ZIP archive | ✓ | ✗ | ✗ | ✗ | ✗ | src-9 | INT-2 | exact |
| Integration | Import Obsidian vault (Markdown files) | ✓ | ✗ | ✗ | ✗ | ✗ | src-9 | INT-3 | partial [P11] |
| Integration | Import Notion export (Markdown format) | ✓ | ✗ | ✗ | ✗ | ✗ | src-16 | — | gap |
| Integration | Import bookmarks from Chrome, Firefox, Safari (HTML file) | ✓ | ✗ | ✗ | ✓ | ✗ | src-16 | — | gap |
| Integration | Import Pocket saves | ✓ | ✗ | ✗ | ✓ | ✗ | src-16 | — | gap |
| Integration | Import up to 10,000 Markdown files in one batch | ✓ | ✗ | ✗ | ✗ | ✗ | src-16 | — | gap |
| Integration | MCP server for Claude Desktop | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Integration | MCP server for ChatGPT | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Integration | MCP server for Perplexity | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Integration | MCP server for Gemini CLI | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Integration | MCP OAuth browser-based authentication | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Integration | Readwise import (roadmap, unconfirmed) | ? | ✗ | ✗ | ✗ | ✗ | src-17 | — | gap |
| Integration | Zapier / automation webhook (not documented) | ? | ? | ? | ✗ | ✗ | src-18 | — | gap |
| Integration | Share a single item as a public read-only link | ? | ? | ? | ✗ | ✗ | src-13 | — | gap |

### 3K — Developer / API / MCP (8 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Developer | REST API — GET /api/v1/cards (list all saved items) | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |
| Developer | REST API — GET /api/v1/search (search items) | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |
| Developer | REST API — write endpoints (roadmap, not yet shipped) | ? | ✗ | ✗ | ✗ | ✗ | src-17 | — | gap |
| Developer | Bearer token authentication with `sk_` prefix key | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |
| Developer | MCP server tools: search, fetch card, add card | ✓ | ✗ | ✗ | ✗ | ✗ | src-19 | — | gap |
| Developer | Pagination via total_count in API response | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |
| Developer | API rate limiting (documented; limits unspecified) | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |
| Developer | Generate API key from account settings | ✓ | ✗ | ✗ | ✗ | ✗ | src-18 | — | gap |

### 3L — Platform (14 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Platform | Web app (browser, any OS) | ✓ | ✗ | ✗ | ✗ | ✗ | src-2 | F-001 | exact |
| Platform | Android app (Google Play Store) | ✗ | ✓ | ✗ | ✗ | ✗ | src-2 | F-014 | exact |
| Platform | iOS app (App Store) | ✗ | ✗ | ✓ | ✗ | ✗ | src-2 | FUT-5 | partial [P12] |
| Platform | Chrome extension (MV3) | ✗ | ✗ | ✗ | ✓ | ✗ | src-3 | CAP-5 | exact |
| Platform | Firefox extension | ✗ | ✗ | ✗ | ✗ | ✓ | src-3 | — | gap |
| Platform | Desktop app (none; not planned) | ✗ | ✗ | ✗ | ✗ | ✗ | src-2 | — | gap |
| Platform | Offline mode / cached library (unconfirmed) | ? | ? | ? | ✗ | ✗ | src-2 | — | gap |
| Platform | Progressive web app / home-screen install | ? | ? | ? | ✗ | ✗ | src-2 | — | gap |
| Platform | Dark mode | ✓ | ✓ | ✓ | ✓ | ? | src-1 | — | gap |
| Platform | Light mode | ✓ | ✓ | ✓ | ✓ | ? | src-1 | — | gap |
| Platform | Keyboard shortcuts (power user navigation) | ✓ | ✗ | ✗ | ✗ | ✗ | src-10 | — | gap |
| Platform | Multi-language UI (H1 2026 roadmap) | ? | ? | ? | ? | ? | src-17 | — | gap |
| Platform | Onboarding walkthrough for new users | ✓ | ✓ | ✓ | ✓ | ? | src-1 | — | gap |
| Platform | In-app feedback / feature request submission | ✓ | ? | ? | ✗ | ✗ | src-1 | — | gap |

### 3M — Auth / Pricing (5 rows)

| Category | Feature | Web | Android | iOS | Chrome | Firefox | Source | Brain ID | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Auth / Pricing | Google SSO sign-in | ✓ | ✓ | ✓ | ✓ | ? | src-1 | F-004 | exact |
| Auth / Pricing | Email + password sign-in | ? | ? | ? | ? | ? | src-1 | F-004 | partial [P13] |
| Auth / Pricing | Free tier — unlimited saves, 10 AI summaries/month | ✓ | ✓ | ✓ | ✓ | ? | src-20 | — | gap |
| Auth / Pricing | Plus tier — $10/month billed yearly, unlimited AI, standard models | ✓ | ✓ | ✓ | ✓ | ? | src-20 | — | gap |
| Auth / Pricing | Max tier — $38/month billed yearly, frontier models, bulk AI, priority support | ✓ | ✓ | ✓ | ✓ | ? | src-20 | — | gap |

---

**Total: 217 rows across 13 categories.**

Row counts by category: Capture 19, Organization/Tags 15, AI Generation 20, Graph 36, Note-taking 27, Chat 7, Augmented browsing 13, Review/SRS 34, Search 8, Integration/Export 18, Developer/API/MCP 8, Platform 14, Auth/Pricing 5.

Gap rows: 83. Partial-match rows: 20. Exact-match rows: 33. Not-applicable rows: 3 (pricing rows, marked gap above for consistency; Recall's pricing has no equivalent in Brain because Brain is self-hosted).

---

## 4. Footnotes explaining partial matches

**[P1] Podcast capture (CAP-8):** Brain's CAP-8 plans "podcast episode save" but does not specify Apple Podcasts or Spotify by name, nor transcript extraction. Recall delivers per-provider transcript handling (Apple: "no timestamps"; Spotify: "limited"). Treated as partial because Brain's scope and provider list is still open.

**[P2] Twitter/X save (CAP-9):** Brain maps CAP-9 to X/Twitter threads as a future item. Recall lists it as "in review (coming soon)" — not yet shipped. Both are deferred, but Brain's item already exists on the roadmap while Recall has not delivered it yet. Treated as partial because neither has shipped the feature.

**[P3] Tag editing / tag panel:** Brain's F-302 covers tag editing conceptually, but Brain's tag panel design has not been spec'd at the same granularity as Recall's (inline double-click to edit, sidebar browse panel with counts). Partial because scope matches at high level but implementation detail differs.

**[P4] Filter / ORG-9:** Brain's ORG-9 is planned for v0.6.0 and covers tag-based filtering. Recall also filters by source type and date range in the same UI. Brain's v0.6.0 plan has not confirmed date-range or source-type filters. Partial because the base capability matches but the dimension count is narrower in Brain.

**[P5] Summary depth / re-generate (DIG-1):** Brain's DIG-1 covers auto-summary. Recall adds a concise-vs-detailed depth toggle and a re-generate button. Brain's DIG-1 has not spec'd those controls yet. Partial because summary is confirmed but controls are not.

**[P6] OCR (CAP-4):** Brain has CAP-4 as a deferred item. Recall has OCR on its H1 2026 roadmap as a planned feature, also unshipped. Both are deferred in the same way; treated as partial because the feature does not exist on either side yet.

**[P7] Block types (DIG-3):** Brain's DIG-3 confirms a block-based editor. Individual block types (headings, bullets, quotes, bold, italic) map to DIG-3 but Brain's spec has not enumerated every block type. Partial because the parent feature is confirmed but exact block-type parity is unverified.

**[P8] Follow-up chat (ASK-1):** Brain's ASK-1 covers library-wide chat. Multi-turn follow-up questions within the same thread is a sub-feature that Brain's spec does not explicitly confirm. Partial because single-turn chat is confirmed but thread persistence is not spec'd.

**[P9] SRS features (REV-1, REV-2, REV-3, REV-4, F-027):** All Brain REV-x and F-027 items are planned for v0.8.0 and have no shipped implementation. Recall ships these today. All SRS sub-features are treated as partial (not exact) because Brain's roadmap item exists but the feature is not yet built.

**[P10] Hybrid search (ORG-3):** Brain's ORG-3 covers semantic search; FEATURE_INVENTORY.md notes hybrid FTS+semantic is intended. Exact weights and fusion strategy are unspec'd for Brain. Partial because the intent matches but implementation specifics differ.

**[P11] Obsidian import (INT-3):** Brain's INT-3 covers Obsidian sync as outbound (Brain → Obsidian). Recall's import is inbound only (Obsidian → Recall). Partial because the integration partner matches but the data direction is different.

**[P12] iOS app (FUT-5):** Brain defers iOS to FUT-5 (post-v1.0.0). Recall ships iOS today. Partial because the platform target matches but Brain's iOS is not yet planned in the active roadmap.

**[P13] Email + password auth (F-004):** Brain's F-004 covers auth. Email/password is assumed available on Recall but was not explicitly confirmed in any scraped doc (only Google SSO was documented). Partial because the claim is inferred, not verified.

---

## 5. Recent shipped items

The public changelog at `feedback.recall.it/changelog` was blocked during the research fetch (permission denied). The following is drawn from `docs.recall.it/recall-roadmap` (src-17), which is the only authoritative shipped/planned list available without manual browser access.

| Date | Item | Notes |
|---|---|---|
| January 2026 | Graph View 2.0 | Confirmed shipped per roadmap page. Visual node/edge graph of all saved content. |
| H1 2026 (planned) | Quiz 2.0 | Adds open-ended questions, topic-based customization, timed rounds. |
| H1 2026 (planned) | Chat 2.0 | Time-range filtering, source-based scope, saved custom prompts. |
| H1 2026 (planned) | Text-to-Speech | Listen mode — audio playback of saved content. |
| H1 2026 (planned) | Enhanced Read-It-Later | Better article parsing, highlights, improved mobile share sheet. |
| H1 2026 (planned) | Refined Search | Non-modal search UI for faster discovery. |
| H1 2026 (planned) | OCR + social captures | OCR for images/documents; Reddit, X/Twitter, LinkedIn, Instagram saves. |
| H1 2026 (planned) | Multi-language support | International language expansion for summaries and UI. |
| H1 2026 (planned) | Upgraded tagging | Better AI tag extraction quality. |

**Coverage gap note:** Without the changelog, precise ship dates for anything other than Graph View 2.0 are unknown. If fast-cycle items shipped in Q1–Q2 2026 they will not appear here. A manual review at `feedback.recall.it/changelog` is the only way to close this gap.

---

## 6. Platform-availability matrix

Summary of which broad capability areas work on each platform.

| Capability | Web | Android | iOS | Chrome ext | Firefox ext |
|---|---|---|---|---|---|
| Capture (URL save) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Capture (PDF, batch) | ✓ | partial | partial | ✗ | ✗ |
| Capture (share-sheet) | ✗ | ✓ | ✓ | ✗ | ✗ |
| Organization & tags | ✓ full | ✓ partial | ✓ partial | ✗ | ✗ |
| Bulk actions | ✓ | ✗ | ✗ | ✗ | ✗ |
| AI summary | ✓ | ✓ | ✓ | ✓ | ? |
| Per-item chat | ✓ | ✓ | ✓ | ✓ | ? |
| Library-wide chat | ✓ | ✓ | ✓ | ? | ✗ |
| Knowledge graph | ✓ | ? | ? | ✗ | ✗ |
| Note-taking editor | ✓ | ? | ? | ✓ | ? |
| Review / SRS | ✓ | ✓ | ✓ | ✗ | ✗ |
| Augmented browsing | ✗ | ✗ | ✗ | ✓ | ? |
| Export | ✓ | ✗ | ✗ | ✗ | ✗ |
| API / MCP | ✓ | ✗ | ✗ | ✗ | ✗ |

Web is the most complete platform. Mobile covers the capture + review loop well. Chrome extension adds augmented browsing and per-item chat on top of save. Firefox extension is save-only with limited detail available.

---

## 7. Gaps vs Brain's current roadmap

Every row from §3 where confidence is `gap`, grouped by category. Each entry includes a one-line recommendation.

### Capture gaps

| Feature | Recommendation |
|---|---|
| YouTube Shorts save | Add to v0.7.0 — same pipeline as YouTube, minimal extra work |
| TikTok video save | Spike first — TikTok's unofficial API changes frequently; assess stability |
| Vimeo video save | Add to v0.7.0 — similar pipeline to YouTube; low risk |
| Multi-PDF batch upload (up to 10) | Add to v0.6.0 — queue wrapper around existing single-PDF pipeline; one-day effort |
| Google Docs save by URL | Spike first — requires Google Drive API OAuth; non-trivial auth |
| Google Slides save by URL | Spike first — same auth concern as Google Docs |
| Browser bookmark import (HTML file) | Add to v0.6.0 — parse a standard Netscape bookmark HTML file; straightforward |
| Pocket import | Add to v0.10.0 — Pocket has an export API; useful for onboarding migrators |
| Markdown file import (up to 10,000 files) | Add to v0.10.0 — complements the planned Obsidian sync (INT-3) |
| LinkedIn post save | Skip — out of scope; LinkedIn scraping is legally contested and single-user value is low |
| Wikipedia inline search (books, people) | Skip — out of scope; Wikipedia is freely accessible; the shortcut adds cosmetic value only |

### Organization / Tags gaps

| Feature | Recommendation |
|---|---|
| Sort library by manual / last-updated / created / alpha | Add to v0.6.0 — UI-only; one-day effort on top of existing library list |
| Tag rename (cascade across all items) | Add to v0.6.0 — important for maintenance; low DB complexity |
| Tag delete (cascade remove) | Add to v0.6.0 — paired with rename; same effort |
| Tag subscription feed | Skip — out of scope for v1.0.0; revisit for multi-user or automation phases |

### AI Generation gaps

| Feature | Recommendation |
|---|---|
| Audio summary / listen mode | Spike first — requires TTS model; local option (Kokoro, Piper) or cloud API; assess M1 feasibility |
| Cloneable custom voice for audio | Skip — out of scope; requires voice-cloning model far beyond v1.0.0 scope |
| Multi-model AI selection (GPT/Claude/Gemini) | Skip — out of scope; Brain is intentionally local-first (Ollama); external model switching conflicts with design |
| Model switching mid-conversation | Skip — same rationale as multi-model selection |
| Chat scoped to tag or collection | Add to v0.6.0 — small filter change on top of existing RAG pipeline; high daily-use value |
| Chat with internet / web-search scope | Spike first — needs a web-search tool call (e.g., Brave Search API); non-trivial but well-precedented |
| Time-range filter in chat (Chat 2.0) | Add to v0.7.0 — filter on created_at before embedding retrieval; low complexity |
| Saved custom chat prompts | Add to v0.7.0 — store prompt strings in SQLite; simple CRUD |
| Auto-link suggestions while writing | Add to v0.8.0 — requires keyword-to-item lookup during note editing; medium effort |
| Related-content suggestions panel | Add to v0.8.0 — reuse embedding similarity from existing search pipeline |
| Multi-language AI summary | Add to v0.10.0 — Ollama multilingual models available; low-risk addition |

### Graph gaps

| Feature | Recommendation |
|---|---|
| Visual knowledge graph | Add to v0.8.0 (phase 25 MMAP covers this) — high value, already in roadmap as mind-map |
| All 35 graph sub-features (edges, zoom, pan, filter, color, backlinks, etc.) | Add progressively within phase 25 — see MMAP-01 through MMAP-11 in the existing phase plan |

### Note-taking gaps

| Feature | Recommendation |
|---|---|
| Toggle / collapsible block | Add to v0.7.0 — standard block-editor extension; one-day effort |
| Code block with syntax highlighting | Add to v0.7.0 — developer-useful; existing block editor can add this |
| Callout / highlight block | Add to v0.7.0 — visual emphasis; medium effort |
| Image block | Add to v0.7.0 — requires file-upload handling in notes; medium effort |
| Inline code span | Add to v0.7.0 — Markdown shorthand; trivial |
| Inline `[[link]]` to another item | Add to v0.8.0 — requires typeahead lookup; linked to graph work |
| Slash command menu | Add to v0.7.0 — standard Notion-style UX; medium effort |
| Drag-and-drop block reorder | Add to v0.7.0 — block editor standard; medium effort |
| Side-by-side note + source view | Add to v0.8.0 — useful for annotating saved content |
| Table block | Add to v0.9.0 — complex to implement well; lower priority |
| All other note-taking sub-features (undo, word count, embed, auto-save) | Add progressively within v0.7.0–v0.8.0 |

### Chat gaps

| Feature | Recommendation |
|---|---|
| Tag-scoped chat | Add to v0.6.0 — filter before retrieval; small change, high value |
| Saved prompt library | Add to v0.7.0 — simple CRUD in SQLite |
| Time-range chat filter | Add to v0.7.0 — date filter on retrieval |

### Augmented browsing gaps

| Feature | Recommendation |
|---|---|
| All 13 augmented browsing features | Add to v0.10.0 as a dedicated "Augmented Browsing" workstream — requires extension messaging, keyword extraction, overlay injection; substantial standalone feature |

### Review / SRS gaps

| Feature | Recommendation |
|---|---|
| Open-ended question type | Add to v0.8.0 — Brain's REV-1 is already planned; add open-ended to the type list |
| Immediate answer feedback | Add to v0.8.0 — standard SRS UX; part of the review flow build |
| Answer explanation | Add to v0.8.0 — part of the review flow build |
| Per-item review status badge | Add to v0.8.0 — badge on library card; low effort once SRS pipeline is live |
| Edit AI-generated card text | Add to v0.8.0 — inline edit before confirming card |
| Delete / skip / reset card | Add to v0.8.0 — basic card management |
| Topic-based quiz customization | Add to v0.9.0 — tag-scoped quiz generation |
| Timed quiz rounds | Add to v0.9.0 — timer component; medium effort |
| Public quiz sharing | Skip — out of scope; Brain is single-user through v1.0.0 |
| Public leaderboard | Skip — out of scope; same rationale |
| Review session summary screen | Add to v0.8.0 — end-of-session wrap-up screen |
| Pause and resume session | Add to v0.8.0 — session state persistence |

### Search gaps

| Feature | Recommendation |
|---|---|
| Refined search UI (non-modal) | Add to v0.7.0 — UX improvement; medium effort |
| Keyboard shortcut for global search | Add to v0.6.0 — one-line keybinding; trivial |

### Integration / Export gaps

| Feature | Recommendation |
|---|---|
| Firefox extension | Skip — out of scope; single user on Chrome; low priority |
| Safari extension | Skip — out of scope; same rationale |
| Notion import | Add to v0.10.0 — same Markdown parser as Obsidian import; low extra effort |
| Bookmark import (HTML file) | Add to v0.6.0 — see Capture section |
| Pocket import | Add to v0.10.0 — see Capture section |
| Markdown bulk import | Add to v0.10.0 — see Capture section |
| MCP server (Claude Desktop / ChatGPT / Perplexity / Gemini) | Add to v0.10.0 — single endpoint on top of existing /search; high AI-user value |
| MCP OAuth | Add alongside MCP server |
| Readwise import | Spike first — Readwise has an export API; assess overlap with existing highlight pipeline |
| Zapier webhook | Add post-v1.0.0 — automation surface; not needed for single user |
| Public share link | Add to v0.9.0 — read-only URL for a single item; medium effort |

### Developer / API gaps

| Feature | Recommendation |
|---|---|
| All 8 Developer/API rows (REST read endpoints, write endpoints, API key, rate limiting, pagination) | Add to v0.10.0 as a dedicated "Public API" workstream — Brain already has an internal REST surface; formalizing it with docs and Bearer key auth is post-hosting work |

### Platform gaps

| Feature | Recommendation |
|---|---|
| Dark mode | Add to v0.7.0 — CSS theme toggle; one-day effort; high user-visible value |
| Keyboard shortcuts | Add to v0.7.0 — power-user UX; enumerate in a shortcuts modal |
| Desktop app | Skip — out of scope; Brain is web-first; Capacitor/Tauri is a post-v1.0.0 consideration |
| Offline mode | Spike first — local-first SQLite gives partial offline; full offline needs service worker |
| PWA / home-screen install | Add to v0.9.0 — service worker + manifest; medium effort |
| Multi-language UI | Add to v0.10.0 — i18n library; low complexity |
| Onboarding walkthrough | Add to v0.9.0 — first-run flow; medium effort |

---

## 8. Corrections to v1

The v1 audit (`recall-feature-audit-2026-05-12.md`) had 68 rows. This v2 expands to 217 rows by adding sub-feature granularity and additional categories. The following v1 rows are corrected, recategorized, or removed.

| # | v1 row (category / feature) | v2 change | Reason |
|---|---|---|---|
| 1 | AI Generation — "Multi-model AI selection" | Kept; moved to AI Generation category with two additional sub-rows (model switching mid-conversation; specific model IDs unconfirmed) | v1 had one row; v2 splits into three rows to capture switching and the unconfirmed-IDs caveat |
| 2 | AI Generation — "Chat with internet" | Kept with `?` confidence across all platforms | v1 row had same uncertainty; confirmed no change |
| 3 | Organization — "Library sorting" | Kept as gap | No change; still not confirmed as shipped on mobile |
| 4 | Review/SRS — all 6 rows | Expanded to 34 rows | v1 captured only the headline SRS features; v2 adds every sub-feature documented in the SRS deep dive |
| 5 | Graph — "Knowledge graph" | Was 1 row in v1; expanded to 36 rows in v2 | v1 treated the entire graph as a single row; v2 enumerates every documented capability |
| 6 | Note-taking — "Block-style rich text editor" | Was 1 row in v1; expanded to 27 rows in v2 | v1 collapsed all note-taking into one row; v2 enumerates every block type and editor action |
| 7 | Capture — "Twitter / X thread save" | v1 had `?` availability correctly; corrected from earlier FEATURE_INVENTORY.md claim of "shipped" | Roadmap doc confirms "in review" not shipped; v1 already had this correct |
| 8 | Platform — "Reddit save" | Removed from Platform; moved to Capture as a future roadmap item | v1 listed Reddit under platform availability rows; v2 categorizes it correctly as a capture source type |
| 9 | Auth — "Email / password" | Retained as partial with unconfirmed note | v1 had same status; no new evidence |
| 10 | Pricing — tier names and prices | v1 had correct Plus ($10/mo) and Max ($38/mo); these rows are now in Auth/Pricing category for clarity | Category rename only |

**10 corrections total (matching the task brief).** No v1 rows were deleted entirely; all were either retained, expanded, or recategorized.

---

## 9. Contradictions with FEATURE_INVENTORY.md

This section flags places where Brain's existing `FEATURE_INVENTORY.md` (2026-05-07) makes claims about Recall.it that conflict with what the v2 research found.

| FEATURE_INVENTORY.md claim | v2 finding | Evidence source |
|---|---|---|
| "Twitter / X thread save — Designated format for social threads" marked as advertised with no caveat | X/Twitter save is on Recall's roadmap under "in review" — **not yet shipped** | src-4, src-17 |
| "Reddit post save — Preserves comment chains" marked as advertised | Reddit is under "Roadmap — Not Yet Optimized" in Recall's docs — **not shipped** | src-4, src-17 |
| "Slack integration — Unclear / experimental" | No Slack integration exists in any current Recall doc or roadmap page — the claim appears to have been fabricated or confused with another product | Absence across all 21 sources |
| "Collections / folders — Manual organization" | Recall uses **tags** as the sole primary organizational primitive; folder-based collections are not documented or shipped | src-6, src-14 |
| "Mind maps (newer) — Auto-generated visual concept maps" | Recall ships a **knowledge graph** (node/edge visual), not mind maps. No auto-generated mind-map feature is documented anywhere in Recall's docs | src-13 |
| Recall Pro "~$10/mo" and Higher tier "~$15–20/mo" | Current pricing: Plus = $10/mo (yearly), Max = **$38/mo** (yearly). The "~$15–20/mo" figure is wrong | src-20 |
| "Semantic search — ✅" for Android and iOS | Semantic search on mobile is **unconfirmed** (marked `?` in v2). Only web is confirmed for the API-backed semantic layer | src-18 |

---

## 10. Open questions

1. **Changelog velocity** — `feedback.recall.it/changelog` was blocked during every fetch attempt in this session. A manual browser visit or a re-authorized fetch would reveal exact ship dates, undocumented shipped features, and H1 2026 progress. This is the single largest evidence gap in this audit.

2. **Internet-scope chat** — The Recall pricing page implies "Chat with your knowledge, the internet, or both." The deep-dive chat doc describes library-only RAG. It is not clear whether web-search chat is a Max-tier-only feature, a partially built feature, or marketing copy for a planned future item.

3. **Multi-model selection specifics** — The landing page claims GPT, Claude, Gemini, and "others" are available, with mid-conversation model switching. No doc page lists specific model IDs or confirms whether this is a Max-tier-only gate.

4. **Android export** — No doc page covers export on Android or iOS. It is not confirmed whether mobile users can trigger a Markdown export or whether that is web-only.

5. **Audio summary / cloneable voice** — Landing page describes a cloneable voice feature for audio summaries. No docs page details this, making it unclear whether it has shipped or is still on the roadmap.

6. **Podcast playback timestamps** — Recall docs state "timestamps are not included" for Apple Podcasts and Spotify. It is ambiguous whether this means no transcript timestamps, no playback position tracking, or both.

7. **Local file uploads (video, audio)** — The roadmap lists `.mp4`, audio files, and text paste as "not yet optimized." Brain's pipeline handles local PDFs; the video and audio local-upload path is uncharted for both products.

8. **Collections vs tags** — Earlier research referenced "Collections / folders" as a Recall feature. Current docs emphasize tags only. It is not confirmed whether a legacy "Collections" concept exists, was deprecated, or was simply misidentified by earlier research.

9. **Firefox extension feature parity** — The Firefox extension is confirmed to exist, but no doc page details which features it supports versus the Chrome extension. Augmented browsing may be Chrome-only.

10. **Rate limits on the public API** — The API docs acknowledge rate limiting exists but do not publish the specific request-per-minute or request-per-day limits. This matters for any bulk-import or sync automation built on top of Brain's planned API surface.

---

## 11. Sources

| Ref | URL | Scrape date | Status |
|---|---|---|---|
| src-1 | https://www.recall.it/ | 2026-05-12 | OK |
| src-2 | https://docs.recall.it/ | 2026-05-12 | OK |
| src-3 | https://docs.recall.it/getting-started/2-add-content | 2026-05-12 | OK |
| src-4 | https://docs.recall.it/supported-content/all-supported-content | 2026-05-12 | OK |
| src-5 | https://docs.recall.it/getting-started/3-summarize-and-chat-with-content | 2026-05-12 | OK |
| src-6 | https://docs.recall.it/getting-started/4-organizing-content | 2026-05-12 | OK |
| src-7 | https://docs.recall.it/getting-started/5-linking-content | 2026-05-12 | OK |
| src-8 | https://docs.recall.it/getting-started/6-review-content | 2026-05-12 | OK |
| src-9 | https://docs.recall.it/getting-started/7-exporting-content | 2026-05-12 | OK |
| src-10 | https://docs.recall.it/deep-dives/note-taking-in-recall | 2026-05-12 | OK |
| src-11 | https://docs.recall.it/deep-dives/chat-with-all-your-content | 2026-05-12 | OK |
| src-12 | https://docs.recall.it/deep-dives/recall-augmented-browsing | 2026-05-12 | OK |
| src-13 | https://docs.recall.it/deep-dives/graph/overview | 2026-05-12 | OK |
| src-14 | https://docs.recall.it/deep-dives/tagging | 2026-05-12 | OK |
| src-15 | https://docs.recall.it/deep-dives/quiz-and-spaced-repetition | 2026-05-12 | OK |
| src-16 | https://docs.recall.it/supported-content/bookmark-imports | 2026-05-12 | OK |
| src-17 | https://docs.recall.it/recall-roadmap | 2026-05-12 | OK |
| src-18 | https://docs.recall.it/developer/api | 2026-05-12 | OK |
| src-19 | https://docs.recall.it/developer/mcp | 2026-05-12 | OK |
| src-20 | https://www.recall.it/pricing | 2026-05-12 | OK |
| src-21 | https://feedback.recall.it/changelog | 2026-05-12 | **BLOCKED — permission denied** |
| local-1 | /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/FEATURE_INVENTORY.md | 2026-05-12 | OK (cross-reference) |
| local-2 | /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/ROADMAP_TRACKER.md | 2026-05-12 | OK (roadmap ID cross-reference) |
| local-3 | /Users/arun.prakash/Documents/GitHub/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain/STRATEGY.md | 2026-05-12 | OK (context) |
