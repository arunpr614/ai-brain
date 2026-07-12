# Card Processing Workflow — Growth and Engagement Assessment

**Council role:** Product Manager — Growth and Engagement
**Date:** 2026-07-11
**Status:** Discovery assessment; not implemented
**Scope:** Single-owner, local-first product behavior only. No production code, schema, navigation, analytics, notification, or migration change is authorized by this document.

## Executive recommendation

Proceed with the behavior of **Direction 2: Inbox-first triage with a secondary board**, but prototype the customer-facing navigation label **Inbox** against the broader label **Processing**. My growth recommendation is **Inbox**: it communicates the first job immediately, is less technical than Queue, less project-management-coded than Workflow, and avoids colliding with the product's existing background “queued/processing” states. Use the page subtitle **Decide what happens to captured sources** and keep `Board`, `All active`, and `Archived` as views inside the section.

The durable loop should be:

`Capture → Saved to Inbox → Make one deliberate decision → Continue to next → Revisit active work → Complete → Optionally archive → Find/use the source later`

This is an engagement feature only if it reduces the cost of deciding what a capture is for and makes later return easier. It should not optimize transition volume, time in app, daily streaks, or notification opens.

The launch posture should be conservative:

- Every **new** successful capture enters Inbox.
- Existing sources are **not silently backfilled**.
- First use offers a count-previewed choice: start with new captures, bring in a bounded recent set, select sources in Library, or—under an advanced disclosure—bring in all history.
- V1 sends **no proactive notifications** and uses only neutral, content-free local counters if measurement is approved.
- Library remains the durable home for all saved sources; Inbox is an operational projection, not a second collection of content.

## Evidence base

Repository citations below are relative to the project root. Wiki citations use `WIKI_ROOT`, meaning:

`/Users/arun.prakash/Library/CloudStorage/GoogleDrive-arun.prakash@toasttab.com/Other computers/My MacBook Pro M1 2025/arun-cursor/Initiatives/Arun_AI_Projects/ai-brain-wiki-card-processing-workflow-20260711`

### Current product and model

- AI Brain is explicitly a one-owner product for capture, trustworthy source context, organization, retrieval, cited Ask, notes, export, and backup—not collaboration or a full research-writing workspace (`WIKI_ROOT/Product-Overview.md:10-21`, `WIKI_ROOT/Product-Overview.md:33-41`).
- The current Library is chronological, capped to 100 loaded sources, and filtered by source, quality, and one tag (`src/app/library/page.tsx:17-31`, `src/app/library/page.tsx:62-81`; `src/db/items.ts:228-239`). It already displays total versus filtered counts and provides Capture, search, filters, and bulk selection (`src/app/library/page.tsx:91-120`, `src/app/library/page.tsx:123-209`; `src/components/library-list.tsx:106-213`).
- Desktop primary navigation currently contains Library, Needs Upgrade, Ask, and Settings, with Capture as a separate primary action (`src/components/sidebar.tsx:38-43`, `src/components/sidebar.tsx:145-217`). Mobile has exactly four bottom-navigation positions: Library, Capture, Ask, and More (`src/components/sidebar.tsx:255-303`).
- The supplied current-product screenshots corroborate those IA constraints and the high visual prominence of Capture: `docs/feature-council/card-processing-workflow/research/screenshots/current-product/library-desktop-1440x1024.png` and `library-mobile-390x844.png`.
- Capture entrypoints support URL, PDF, and note on web (`src/app/capture/page.tsx:22-57`; `src/app/capture/tabs.tsx:15-73`), while the wiki records web, Android, extension, Telegram, and Recall ingestion paths converging on one domain journey (`WIKI_ROOT/Capture-and-Ingestion.md:12-32`). New items converge through `insertCaptured`, but that write has no workflow or archive field today (`src/db/items.ts:32-88`).
- A successful URL capture currently redirects to the existing item-detail route (`src/app/capture-actions.ts:87-95`); manual note capture does the same (`src/app/actions.ts:19-35`). The workflow should augment that result moment rather than replace the trusted detail route.
- The item-detail route already supports source reading, digest, scoped Ask, Related, Details, notes, tags, collections, repair, export, and deletion (`src/app/items/[id]/page.tsx:276-347`, `src/app/items/[id]/page.tsx:350-560`). Its hard-coded return target is Library (`src/app/items/[id]/page.tsx:276-285`), so contextual return state is necessary for a sustainable Inbox session.
- Current destructive lifecycle behavior is delete, including dependent cleanup; there is no user-facing archive model (`src/app/items/[id]/page.tsx:406-443`; `src/db/items.ts:280-289`).
- Category, user/AI tags, topics, and collections are already distinct concepts (`WIKI_ROOT/Organization-Tags-Topics-and-Collections.md:12-19`). Workflow status and archive must remain additional orthogonal attributes.
- The schema's existing `cards` table is an SRS/review substrate, not the captured-source aggregate (`src/db/migrations/001_initial_schema.sql:81-97`; `WIKI_ROOT/Data-Model.md:10-23`). “Cards” should therefore remain a visual treatment, not the section or domain name.

### Roadmap and prior-council lessons

- The roadmap already reserves a separate SRS Review feature with a daily queue, streak, retention chart, 8 a.m. notification, and due-count badge (`ROADMAP_TRACKER.md:347-360`). Reusing those mechanics for Inbox would create competing urgency systems and confuse source triage with learning review.
- The product's v1 decision gate already asks for four consecutive weeks of daily-use evidence (`ROADMAP_TRACKER.md:389-396`). A four-week dogfood baseline is therefore more credible than invented percentage-growth targets.
- The prior Manual Content Notes council defined activation by later user payoff, not by opening an editor or completing an infrastructure action (`docs/feature-council/F08-manual-content-notes/council/product_council_v1.md:63-89`). It also warned against making each item feel like homework and against adding notifications or counts without a value loop (`docs/feature-council/F08-manual-content-notes/council/product_council_v1.md:98-107`). Inbox should follow the same principle.
- That council recommended local, content-free measurement and reliability gates for a single-user product, while explicitly rejecting false precision before a baseline exists (`docs/feature-council/F08-manual-content-notes/council/product_council_v1.md:449-496`).
- The Note Focus Mode council likewise prohibited external analytics and limited any future measurement to content-free local operational counters (`docs/feature-council/note-focus-mode/DECISION_LOG.md:45-49`).
- The current analytics decision spec defaults to no product analytics, prefers aggregate local counters, and prohibits raw private content, full URLs, tokens, and secrets (`UX_v2/lightweight-specs/ANALYTICS-01-events-and-privacy.md:7-32`).
- The current card-processing product directions already select Inbox-first behavior because it most directly reduces backlog while protecting mobile parity, migration trust, and the source-first model (`docs/feature-council/card-processing-workflow/product/product-directions.md:179-264`, `docs/feature-council/card-processing-workflow/product/product-directions.md:350-387`). This assessment strengthens the first-use, return, measurement, and anti-compulsion parts of that direction.

## Naming and discoverability assessment

| Candidate | Growth/engagement assessment | Decision |
|---|---|---|
| **Inbox** | Immediately predicts “new captures waiting for a decision.” Familiar without implying email semantics beyond unprocessed intake. Narrower than the whole workflow, but the primary return job is the feature's discovery hook. | **Recommend as customer-facing navigation label.** |
| Processing | Broad enough to contain Inbox, Board, All active, and Archived. However, it is an abstract gerund and collides with visible enrichment states such as queued/processing. | Retain as internal concept or page subtitle alternative; prototype against Inbox. |
| Workflow | Clearly signals state movement, but sounds like a configurable business/project-management system. | Reject for V1 naming. |
| Queue | Concise but operational/technical; does not explain what decision the owner should make. | Reject as top-level name; acceptable internal implementation vocabulary only. |
| Backlog | Honest but emotionally punitive; a growing number can turn capture into debt. | Reject. |
| Board | Names one view, not the user job, and performs poorly on mobile. | Reject as feature name; keep as a view. |
| Tasks / To Do | Misrepresents sources as tasks and invites due dates, reminders, priorities, and project scope. | Reject. |
| Review | Already used for source-quality review and reserved for SRS on the roadmap. | Reject due semantic collision. |

### Recommended information architecture

- **Desktop:** Place **Inbox** directly after Library and before Needs Upgrade. Show a neutral numeric badge, never a red alert badge. Cap display at `99+`; the page itself shows the exact count and oldest age.
- **Mobile V1:** Do not displace Library, Capture, Ask, or More. Add a compact Library entry card—`Inbox 18 · oldest 12d`—and an Inbox row in More. This makes the new job visible at the point where backlog is already felt without prematurely changing the four-slot mobile shell.
- **Inside Inbox:** Use `Inbox | Board | All active | Archived`. Board is visible but secondary. The default route always resumes the Inbox list, not the last board column, unless the owner explicitly enters a saved Board/All view.
- **Library relationship:** Library answers “What have I saved?” Inbox answers “What still needs a decision?” Both open the same item identity, reuse source rows and taxonomy language, and preserve a contextual return link.
- **Promotion rule for mobile:** Consider a bottom-nav slot only after four-week dogfood shows mobile Inbox use on at least two distinct days in three of four weeks and the Library/More entry is repeatedly used. Do not optimize navigation around a hypothetical habit.

## Backlog-reduction behavior

### Define the behavior precisely

Use **Triaged** in user-facing copy. If the council retains **Processed** in metrics, define it identically:

> A distinct source is processed/triaged once, when it leaves Inbox for the first time because of a deliberate owner action.

Moving backward and leaving Inbox again must not increment it. Reordering within a state must not increment it. A duplicate capture must not reset status or increment it. Bulk moves count distinct first exits but must be segmented from one-by-one triage in diagnostics because they represent different levels of intent.

Define **Completed** as the source's first deliberate entry into Done. Reopening and recompleting do not inflate it. Define **Archived** as a visibility/lifecycle action on Done, never as completion itself.

### Recommended Inbox interaction

1. Default to a focused chronological list with **oldest first** after onboarding; offer newest-first without hiding the current sort.
2. Open the existing detail route or a read-only quick preview, then offer large labeled actions: **To Do**, **In Progress**, **Done**, and **Leave in Inbox**.
3. After a confirmed move, keep an Undo action visible and advance to the next source without returning to the top.
4. Preserve the exact source anchor, filters, sort, and scroll when returning from detail.
5. Let To Do and In Progress support lightweight manual ordering; do not add due dates or scoring.
6. Keep Done visible as a review buffer. Archive is an explicit later cleanup action and never automatic.

This loop reduces decision overhead without requiring a note, tag, or full read for every source. Making those actions mandatory would recreate the “every item is homework” risk identified by the Notes council.

### Sustainable weekly loop

- **Capture-time loop:** The existing detail result banner should say **Saved to Inbox** with two choices: **Leave for later** and **Process now**. It should not interrupt capture or force immediate triage.
- **Short-session loop:** Inbox opens at the last confirmed position and suggests a bounded session such as **Process 3**; this is a session size, not a quota or streak.
- **Active-work loop:** Board/All active helps the owner revisit intentionally kept sources. In Progress is for current attention, not an indefinitely accumulating second backlog.
- **Closure loop:** Done remains reviewable; periodic manual batch archive keeps active views calm without erasing the source from Library/search/Ask.
- **Value-return loop:** Item detail, My notes, Ask, Related, Library search, and repair remain the places where processed sources produce value. Inbox should link back into those surfaces rather than building parallel reading or writing tools.

## First-use and legacy backfill onboarding

Silent all-history backfill is a growth anti-pattern here: it turns the first visit into debt, corrupts first-processing metrics, and may make the feature look impossible before the user experiences one successful triage.

### Recommended first-use flow

1. Explain the contract in one sentence: **New captures wait here until you decide what happens next.**
2. Show the number of existing Library sources and offer four explicit choices with count previews:
   - **Start with new captures** — default and safest.
   - **Bring in recent captures** — recommend up to the 25 newest sources from the last 30 days; show the exact count before applying.
   - **Choose from Library** — opens existing selection behavior.
   - **Bring in all history** — advanced disclosure with exact count and a warning that this creates a large Inbox.
3. If recent sources are chosen, guide a first bounded session of three recent, still-contextual captures. After that, default the durable queue to oldest first.
4. Confirm the choice and explain that older unclassified sources remain fully available in Library and can be added later.
5. Never count the backfill write itself as processing, completion, or engagement.

The owner can revisit import settings until legacy sources are handled, but `legacy/unclassified` should not become a permanent daily status or a fifth workflow column.

## Return behavior

Return mechanics determine whether Inbox becomes a calm habit or a repeated setup task.

- Preserve exact list/column anchor, filters, sort, and selected state across detail navigation and view switches.
- A contextual detail link says **Back to Inbox** or **Back to Board** only when entered from that surface; direct links continue to return to Library.
- The Library entry card shows backlog size and oldest age, not a generic “activity” feed.
- Capture results acknowledge Inbox placement without forcing a detour.
- Empty Inbox copy should reinforce the achieved state—**Nothing waiting for a decision**—and offer Library or Capture, not demand a streak.
- If a moved source returns to Inbox, retain first-triaged history and show it in order by its explicit return time or the user's selected sort; do not pretend it is newly captured.

## Notifications, badges, and metric risks

### V1 notification decision

**Ship no proactive notifications.** The roadmap's SRS Review feature already proposes an 8 a.m. reminder, due badge, and streak. A second daily urgency loop would make source capture feel like obligation and create ambiguity over whether “review” means learning, repair, or triage.

If four-week dogfood later shows the owner forgets Inbox despite finding it valuable, test one **opt-in weekly local summary**, not a daily reminder:

`This week: 12 captured · 8 triaged · Inbox +4 · oldest 18d`

It should deep-link to Inbox, respect quiet hours, expose Snooze/Turn off, contain no titles or source content, and never use loss-framed copy such as “You broke your streak” or “18 overdue.” Notification opens are diagnostic only, not a success metric.

### Badge rules

- Neutral color and plain count; never red, pulsing, or “overdue.”
- Exact count on the page; `99+` in constrained navigation.
- No badge on Capture: attaching growing debt to the capture affordance would suppress the core acquisition behavior.
- Do not celebrate a zero Inbox with confetti or pressure the user to preserve it.

## Success measures and local measurement contract

### Headline product measures

| Measure | Definition | Why it is useful |
|---|---|---|
| Inbox now | Current non-archived Inbox sources | Direct state of undecided capture backlog |
| Oldest Inbox age | Age of the oldest non-archived Inbox source | Detects stagnation hidden by a stable count |
| First exits this week | Distinct sources leaving Inbox for the first time | Deliberate triage throughput |
| New captures this week | Distinct successful new source identities placed in Inbox | Input rate needed to interpret throughput |
| Net Inbox change | End count minus start count, including returns | Shows whether backlog is actually shrinking |
| Triage-to-add ratio | First exits / new captures over a rolling four-week window | Indicates whether the loop keeps pace without using a streak |
| First completions this week | Distinct sources entering Done for the first time | Stronger downstream outcome than movement |
| Mutation reliability | Confirmed move/archive/restore operations / attempts, with normalized failures | Trust gate for immediate-save behavior |

Today counts may appear in a disclosed **Activity** detail to satisfy short-term feedback, but the primary UI should emphasize weekly trend and current backlog; one-person daily numbers are volatile and easy to overread.

### Four-week dogfood gates

Treat these as owner-utility decisions, not population-growth statistics:

- **Activation:** onboarding choice completed and three distinct sources deliberately triaged in the first guided session, with at least one successful return to the preserved queue position.
- **Sustained use:** at least one deliberate Inbox action on two distinct days in three of four weeks.
- **Backlog health:** over the four-week window, first exits keep pace with new captures (`triage-to-add ratio ≥ 1`) or, when clearing legacy items, both Inbox count and oldest age trend downward.
- **Downstream value:** at least one active source is revisited and deliberately completed in each active week; this prevents Inbox clearing from being the only observed behavior.
- **Trust:** zero silent state divergence or confirmed lost moves in controlled offline, retry, multi-tab, undo, archive, and restore scenarios.

Do not invent adoption percentages or retention cohorts for one owner. Establish the baseline first and review the event timeline alongside qualitative dogfood notes.

### Privacy and storage rules

Default to no external analytics. If local measurement is approved, store content-free event facts or derived counters only:

- allowed: opaque item ID, event kind, prior/next status, individual/bulk mode, timestamp, surface, device class, latency, normalized result/error code;
- prohibited: title, body, note, summary, tag/category names, query, full URL, transcript, citation text, notification content, token, or secret;
- measurement data must be exportable/deletable with a documented retention limit and must never be required for the workflow itself.

## Anti-vanity-metric guardrails

Do not use these as product success measures:

- total workflow transitions—reordering and churn inflate it;
- archive count—cleanup is not value;
- raw Board opens, sessions, or time in app—longer may mean more friction;
- daily-active-user or retention percentages for a single owner;
- streak length, perfect-Inbox days, or zero-Inbox rate;
- notification delivery/open rate;
- number of tags/notes added during triage;
- count of sources moved to Done without first-event and reopen context;
- backlog size alone, because a stable count can hide an aging backlog or a high capture rate.

Every displayed metric must answer one of three questions: **What needs attention? Is the backlog getting healthier? Are deliberate decisions producing later completion/value?** If it answers none, keep it out of the product UI.

## Scope boundaries

### V1 includes

- Workflow status for the existing source/item: Inbox, To Do, In Progress, Done.
- Inbox-first list, secondary Board and All-active list, and separate Archived view.
- Accessible Move to actions, immediate confirmation, Undo, and contextual return.
- User-tag and AI-category facets kept semantically separate; source/quality remain optional secondary filters.
- Explicit launch import choices and a reversible archive/restore contract.
- Content-free local activity only if separately approved.

### V1 excludes

- Assignees, collaborators, sharing, roles, comments, mentions, or team activity.
- Due dates, overdue states, reminders, recurrence, dependencies, sprints, estimates, capacity planning, or project templates.
- Daily notifications, streaks, gamification, rewards, nudging, or externally hosted product analytics.
- AI-generated priority, automatic status movement, automatic completion, or automatic archive.
- A replacement for Library, Needs Upgrade/source-quality Review, SRS Review, My notes, search, Ask, or collections.
- Duplicating the note editor or full reading experience inside a board drawer.
- Treating archive as deletion or hiding archived-from-workflow sources from Library/search/Ask by default.
- Treating manual tags, AI categories, workflow status, and archive as interchangeable taxonomy.

## Key growth risks and mitigations

| Risk | Why it harms sustainable use | Mitigation |
|---|---|---|
| Large launch backlog | First experience feels like inherited debt | No silent backfill; exact count preview; bounded recent import |
| “Processing” sounds like system work | User cannot predict the destination; conflicts with enrichment copy | Use Inbox in navigation; explanatory subtitle; test both labels |
| Moving becomes the goal | Metrics reward churn and mass Done actions | Count distinct first exits/completions; show net and age; segment bulk |
| Board becomes a project manager | Expands mental model and feature scope | Inbox list default; Board secondary; hard non-goals |
| Badge anxiety suppresses capture | Every new source increases visible debt | Neutral count, no Capture badge, no overdue semantics |
| Competing Review reminders | Source triage and SRS learning both demand attention | No V1 notification; keep queues and vocabulary distinct |
| Triage breaks the reading/note loop | Owner clears cards but receives no later value | Reuse item detail, contextual return, active revisit and completion measures |
| Backfill corrupts metrics | Historical writes appear as new engagement | Tag migration origin; exclude import writes from first-exit baseline |
| Private-content telemetry leakage | Trust loss outweighs product learning | Local, opt-in/content-free counters; reject content fields |
| Mobile burial | More-only entry is forgotten | Library Inbox card; measure entry use before changing bottom nav |

## Prototype validation plan

The throwaway prototypes should make the following decisions observable:

1. **Naming comprehension:** Show the current shell with Inbox versus Processing. Ask what the owner expects before opening it. Success means Inbox is correctly predicted as “captured sources awaiting a decision” without explanation; Processing must not be selected merely because it sounds broader.
2. **First win:** Import three recent sources, triage them, undo one, and resume. Success means the owner can explain what changed, where the source still lives, and what happens next.
3. **Backlog stress:** Show 327 Inbox sources, oldest age, and a bounded session action. Success means the owner chooses to process a few rather than abandoning or mass-completing the queue.
4. **Return fidelity:** Open item detail, inspect/edit My notes, move status, and return. Success means exact context is restored and no second note/editor model is implied.
5. **Mobile discovery:** Find Inbox from the Library summary and More without changing bottom navigation. Success means both entry and next-source triage are discoverable without drag.
6. **Metric comprehension:** Compare a simple weekly health summary with a dashboard of daily counts. Success means the owner can correctly identify whether backlog improved without interpreting more activity as more value.
7. **Boundary recognition:** Ask whether the prototype supports deadlines, reminders, assignees, or SRS review. Success means the owner correctly answers no.

## Final growth/engagement position

**Conditional GO for prototype validation.** The feature has a credible retention loop because it turns passive capture accumulation into deliberate decisions and creates a reliable return path into reading, notes, repair, Ask, and completion. The strongest direction is Inbox-first, not board-first.

Adopt **Inbox** as the leading customer-facing navigation candidate, retain **Processing** as the comparison label, default new captures to Inbox, avoid silent history backfill, ship no V1 notifications, and judge success by backlog health plus downstream completion—not transition volume or streaks.
