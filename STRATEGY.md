# Arun_AI_Recall_App — Strategy & Research Doc

**Date:** 2026-05-07
**Author context:** `../Lenny_Export/Knowly_import/` just shipped an API-level integration with Knowly; `../Lenny_Export/Recall_import/` shipped a Playwright-based integration with Recall. Both products are now well-understood from an architecture perspective.
**Scope decided upfront:** Research + strategy doc only — no code yet. Personal tool (no auth, billing, scale). Learning project with no differentiator requirement.

---

## 1. Honest framing

You asked to build "a web + Android app with all features of Recall.it and Knowly." Before writing a line of code, three realities worth naming:

### Reality 1 — Feature scope is ~30 major features across both products

**Recall.it surface:**
- Web extension for one-click save from any page
- PDF / article / YouTube / podcast capture
- Auto-summary + AI Q&A
- Knowledge graph (auto-link related items)
- Spaced-repetition review
- Search + semantic search
- Web app + iOS + Android
- Categories, tags, collections

**Knowly surface (from your prior `Knowly_Analysis.md`):**
- Auto-Library (topic clustering from saves)
- Flow (AI-generated multi-page learning journeys)
- GenPage (AI-written pages pulling from your sources)
- GenLink (clickable-word wiki exploration)
- Dual-pane original + AI-digest viewer
- Proactive recommendations
- Chrome extension
- Web app (Android not yet shipped by Knowly either)

Combined, with de-dupe: **~20 distinctive features**. Both products took years and teams.

### Reality 2 — Android is a separate, heavy undertaking

React Native / Flutter / Kotlin native — any of them is a weeks-to-months learning curve on top of the core app. **Native Android has almost nothing in common with the Next.js/Python/httpx stack you've used in this repo so far.**

A reasonable personal-tool approach: **ship web first, optionally wrap it in a PWA, leave native Android for later.** Most of the "mobile" experience is capture (share-sheet → save URL) and reading — both solvable with a PWA or a thin React Native shell.

### Reality 3 — "No differentiator, pure learning" changes everything

If you wanted to launch this and compete, we'd be arguing about moats, positioning, go-to-market, compliance, observability. None of that applies here. The doc below optimizes for **maximum learning per hour, on a single-user personal tool**. Cut features aggressively, pick a stack that teaches you modern patterns, ship something usable fast.

---

## 2. Recommended learning goals (pick 2-3, not all)

A learning project works best when the *learning goals* are named upfront. Candidates you could plausibly aim for, from the combined Recall + Knowly surface:

| Learning goal | What it teaches | Weeks of work (single user, part-time) |
|---|---|---|
| A. Modern full-stack (Next.js + Supabase/Postgres + auth + LLM API) | React + TypeScript + SSR + SQL schema design + OpenAI/Anthropic SDK | 2-3 |
| B. RAG (retrieval-augmented generation) | Embeddings, vector DB, chunking, semantic search, citation-grounded answers | 1-2 (on top of A) |
| C. Knowledge graph construction | Entity extraction, graph DB (or Postgres+pgvector), visualization | 2-3 |
| D. Browser extension development | Manifest v3, content scripts, messaging, Chrome/Firefox APIs | 1 |
| E. Multi-agent AI orchestration (like Knowly's "Flow" feature) | LangGraph / custom agent loop, multi-step LLM chains | 2-3 |
| F. Mobile capture (PWA or React Native) | Share sheet, offline-first, responsive UX | 1 (PWA) / 4-6 (RN) |
| G. AI UX patterns (streaming, tool use, long-running jobs) | Streaming responses, tool use, job queues, progress UX | 1-2 |

**My recommendation for "2-4 week MVP, maximum learning":** A + B + G. That's ~4 weeks and covers ~70% of what makes these products feel magical — modern full-stack + RAG + good AI UX.

Add D (browser extension) for ~1 more week if you want the one-click-save flow.

Skip C (knowledge graph) and F (React Native) for v1 — they're rabbit holes that will stall shipping.

---

## 3. Feature prioritization matrix (MoSCoW for personal MVP)

If you're building for yourself only, the feature set should be RUTHLESSLY small. Below is a proposal.

### Must-have (the MVP — ~3-4 weeks)

| Feature | Why | Effort |
|---|---|---|
| **Save a URL / PDF** | Core capture flow — without it the tool is dead | 2-3 days |
| **Auto-summarize on save** | The "understanding" value prop; LLM call on ingest | 2 days |
| **Library view** (list with search) | See what you've saved | 2 days |
| **Ask questions over your library** (RAG) | The core magic — chat with your corpus | 4-5 days |
| **Basic categorization** (LLM-tagged or manual) | Library becomes browsable | 2 days |
| **Single-user auth** (Clerk or Supabase free tier) | So the thing doesn't leak | 1 day |

### Should-have (weeks 5-8, after MVP is usable)

| Feature | Why | Effort |
|---|---|---|
| Browser extension for one-click save | Friction kills capture | 1 week |
| Streaming AI responses | Feels 10× better than batch | 2 days |
| Citation-grounded answers | Shows *which saved item* the answer came from | 2 days |
| Mobile capture via PWA | Share-sheet from iOS/Android works with `manifest.json` | 3 days |
| Proactive recs (Knowly-style) | "You saved X and Y, want to explore Z together?" | 1 week |

### Could-have (later, if still interested)

- Auto-generated multi-page "Flows" (Knowly's GenPage/Flow)
- Knowledge graph viewer
- Spaced repetition
- Podcast / YouTube capture (requires transcription pipeline)
- Native Android app (React Native wrapper or Kotlin)
- Multi-user auth + sharing
- Collections / folders / nested organization

### Won't-have (for v1)

- Billing / Stripe
- Team features
- Public/shared pages
- Onboarding flow
- Analytics
- SEO / landing page
- Anything else that's product-for-paying-users rather than tool-for-you

---

## 4. Recommended stack

### Frontend + backend: **Next.js 15 + TypeScript + Tailwind + shadcn/ui**

- Next.js because you've now seen how both Recall and Knowly use it, and the App Router patterns (Server Components, Server Actions, streaming) are directly applicable.
- TypeScript non-negotiable — the compiler catches class of bugs AI-assisted coding tends to introduce.
- Tailwind + shadcn/ui: fastest path to a decent-looking app without being a designer.

### Database: **Supabase (Postgres + pgvector + auth)**

- Single hosted service covers: SQL database, vector search (for RAG), auth, file storage, real-time subscriptions.
- Free tier is plenty for single-user.
- Postgres skills transfer everywhere; Supabase is a thin layer.
- Alternative: **Turso (SQLite at the edge)** + separate vector DB (Pinecone free tier) if you want to learn edge patterns. Slightly harder.

### LLM layer: **Anthropic Claude (Sonnet 4.6 or Haiku 4.5) + `@anthropic-ai/sdk`**

- Claude Sonnet 4.6 for quality operations (summarization, Q&A).
- Haiku 4.5 for cheap operations (auto-tagging, lightweight categorization).
- Prompt caching built in — key for RAG where the same corpus context is reused.
- Single SDK, one billing relationship, no rolling-your-own retries.

### Embeddings: **OpenAI `text-embedding-3-small`** or **Voyage**

- Cheaper than Anthropic embeddings; both are well-supported by pgvector.
- `text-embedding-3-small` at 1536 dimensions costs ~$0.02 per 1M tokens — negligible for a personal corpus.

### Capture ingest: **Firecrawl or Jina Reader for web page → clean text**

- URL-to-clean-markdown as a service. Skip the messy DIY scraping.
- Free tiers cover personal usage.

### Hosting: **Vercel (frontend) + Supabase (backend/DB)**

- Free tier works for single-user. Matches the stack you've built on before (Open Brain Web).
- No Docker, no Kubernetes, no ops burden.

### Deliberately excluded from the starter stack

- **No Redis** (use Supabase's real-time + Postgres queues if needed)
- **No separate vector DB** (pgvector inside Supabase handles it)
- **No background job runner** yet (start with edge functions; add Inngest/Trigger.dev only when you have long jobs)
- **No custom auth** (Supabase Auth or Clerk — never roll your own)
- **No GraphQL** (REST or Next.js Server Actions are simpler for 1 dev)
- **No monorepo** (single Next.js app until you actually have a second surface)

---

## 5. Proposed 4-week MVP plan (if you move forward)

Even though you said "research + strategy only," here's what comes next if the answer is "go build":

**Week 1: Foundation**
- Next.js + Supabase set up
- Auth (single-user magic link)
- "Save a URL" flow: paste URL → Firecrawl/Jina → store clean text + metadata in Postgres
- Library list page (just a table)

**Week 2: Summarization + storage**
- On save: LLM call → summary + 3-5 auto-tags → store back
- Dual-pane view: original text | AI summary
- Chunk the text + generate embeddings → pgvector
- Search bar: full-text + semantic

**Week 3: Chat with your library (RAG)**
- Chat page: ask a question → vector-search top-k chunks → send to Claude with retrieved context → stream response
- Citations: which saved items were used to answer
- Streaming UI (Server-Sent Events or Next.js streaming)

**Week 4: Polish + capture UX**
- Bookmarklet or simple Chrome extension: right-click "Save to [app]"
- PWA manifest so iOS/Android share sheet works
- Basic categorization view (LLM-generated tags → filterable)
- Deploy to Vercel, use as your personal tool

Explicitly NOT in Week 1-4: agents, Flow-style multi-page journeys, knowledge graphs, spaced repetition, podcast capture, native mobile. All are post-MVP if still interested.

---

## 6. Alternatives worth considering before you build

### 6a. Just use Recall + Knowly
You already pay ~$40/mo for Knowly Pro. Recall is $10/mo. For the "get my stuff organized" job, two mature products already solve it. **If your goal is organization, not learning, this is the honest answer.**

### 6b. Extend an open-source one instead of building from scratch

| Project | What it is | Why it might fit |
|---|---|---|
| [Hoarder](https://github.com/hoarder-app/hoarder) | Open-source bookmark + note manager with AI summarization | Closest to a Recall clone; self-hostable; active |
| [Omnivore](https://github.com/omnivore-app/omnivore) | (Shut down — codebase forkable) | Read-later + highlights at scale |
| [Karakeep](https://github.com/karakeep-app/karakeep) | (successor to Hoarder) | AI-tagging, full-text search, self-host |
| [Obsidian + plugins] | Local-first markdown knowledge base | Different philosophy; fewer AI features but extensible |

**Forking Hoarder/Karakeep and adding Knowly-style features (GenPage, Flow) would teach you more per hour than starting blank**, because you skip months of CRUD-app scaffolding and go straight to the interesting parts.

### 6c. Build only the new-primitive feature
Knowly's truly novel piece is **GenLink** (clickable-word wiki on AI-generated pages). That's ~1 weekend of work on top of any existing RAG app. A tiny focused learning project beats a sprawling clone.

---

## 7. Decision matrix for your choice

| Approach | Learning value | Hours to usable state | Long-term useful? |
|---|---|---|---|
| Full Recall + Knowly clone | High | 200-400+ | No — you'll stop using it |
| 4-week MVP (this doc's recommendation) | High | 40-60 | Maybe — if you actually use it |
| Fork Hoarder/Karakeep, add features | High | 20-40 | Yes — stands on active project |
| Single novel primitive (e.g. GenLink) | Medium | 10-20 | Demo quality |
| Don't build, just use existing products | Zero learning | 0 | Depends on what you want |

---

## 8. Recommended next step

If this folder is actually going to host code eventually, I'd suggest:

1. **Sit with this doc for a day or two** before committing. "Week of focused work to build a thing you'll use for two weeks" is a common AI-assisted-coding trap.
2. **If you still want to build after sleeping on it:** tell me to expand §5 into a week-by-week implementation plan with concrete task lists, tech choices locked, and scaffold the Next.js project.
3. **If the answer is "actually, Hoarder/Karakeep is a better base":** I'll fork one, audit its architecture, and write an extension plan for the novel features (GenPage, GenLink, Flow) from Knowly.
4. **If the answer is "I just wanted to see what this looks like on paper":** we close the doc here. Total cost: this file. No commitment.

---

## 9. Things I'd want to know before writing the build plan

If you move ahead, I'd need answers to:

1. **Compute budget?** Claude + embeddings + Firecrawl on a personal corpus is ~$5-20/mo at modest usage. OK?
2. **How much do you want to write vs. have me write?** Pure AI-generated codebase has quality risks; shared authorship is better for learning.
3. **Is Android actually required, or would a PWA do?** PWA is 1 week; native Android is 4-6.
4. **Is there any data you specifically want in this?** E.g., the 1,131 Lenny items already in Knowly could be pulled via Knowly's API (you have the client code) as the seed corpus.
5. **Do you want me to version-control from day 1?** Personal tool doesn't strictly need git, but if you want to commit + push to GitHub (arunpr614 account, per your preference), we set up the repo now.

---

## 10. Summary

You asked for a Recall + Knowly clone. I'm pushing back: **"research + strategy doc only, personal tool, pure learning"** means the actual right answer is probably a **4-week focused MVP** (save → summarize → chat with your corpus) on a Next.js + Supabase + Claude stack — OR — fork Hoarder/Karakeep to skip the scaffolding.

Full clone is months. Personal tool with real learning value is weeks. Big difference, both are reasonable; only one is likely to finish.

No code written. No commitment yet. Ball in your court.
