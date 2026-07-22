# AI Brain Held Browser Transcript Manual Enrichment UX Specification V2 Final

**Date:** 2026-07-22
**Status:** Final after Designer, Product Council, and adversarial review
**Prototype:** `prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v2_final.html`
**Scope:** Synthetic throwaway prototype; no real extension, YouTube, Brain, or provider request

## 1. Experience Intent

Help the user understand three independent decisions:

1. inspect the transcript visible in their signed-in Chrome tab;
2. attach the reviewed transcript to the exact Brain item;
3. authorize a disclosed AI digest and search index for that exact transcript version.

The experience must make it possible to stop after attachment. Merely returning to the item, opening Digest, expanding disclosure, closing a dialog, refreshing, or leaving the page does not start processing.

## 2. Core Promise

The most important sentence appears in both Chrome and Brain:

> **Transcript added. AI processing has not started.**

This replaces copy that says enrichment or indexing is already queued.

## 3. Surface Ownership

| Surface | Owns | Does not own |
| --- | --- | --- |
| Brain item recovery panel | Start exact-item recovery and manual fallback | Transcript inspection or provider consent |
| Chrome side panel | Open/Inspect/Add, exact-item binding, temporary review, attachment receipt | Provider plan, enrichment queue, AI credentials |
| Item success banner | Confirm transcript attached and AI not started | Processing command on desktop |
| Transcript panel | Source, language, cues, provenance, current derived-state link | Duplicate enrichment command |
| AI Digest panel | Provider plan, processing authorization, stages, output, retry | Transcript replacement or browser access |
| Title status pill | Compact mirror of durable state | Primary command or detailed failure recovery |

## 4. Information Architecture

### Desktop

- Existing article/content column remains the source and transcript surface.
- Existing 330-360 px right rail begins with AI Digest.
- Capture metadata and notes remain below it.
- AI Digest uses one framed panel; provider rows and disclosures are divider-separated sections, not nested cards.
- Sticky behavior is allowed while the right rail remains visible.

### Tablet

- Right rail collapses below the main article.
- AI Digest appears directly after Transcript and before general article copy where feasible.
- Provider disclosure and actions stay full width.

### Mobile

- Preserve the current query-driven Original, Digest, Ask, Related, Details, and optional Notes tabs. The prototype may make non-Digest tabs inert, but it must render their real information architecture.
- **Open item in Brain** from a successful Chrome attachment opens the exact item with Digest selected after a compact transcript-added confirmation.
- Ordinary later visits preserve the user's requested tab.
- Original shows Transcript and an `AI digest: Not started/in progress/ready/needs attention` navigation status.
- Digest contains the complete provider plan, authorization, stages, output, and retry.
- Chrome recovery itself remains desktop-only; paste/upload can lead to future held-source behavior only when separately approved.

## 5. Extension Changes

Do not add a fourth step. Keep Open, Inspect, Add.

### Review

Continue to show:

- exact destination item;
- language;
- timed segment count;
- character count;
- final-cue completeness;
- caption type unknown when not proven;
- data sent to Brain and browser/session exclusions;
- processing hold notice.

### Success

**Eyebrow:** Complete
**Heading:** Transcript added
**Body:** 286 timed segments were added to the exact Brain item that started this request. AI processing has not started.
**Privacy heading:** No browser session data shared
**Privacy detail:** Caption type remains unknown. Review AI processing separately in Brain.
**Primary:** Open item in Brain
**Secondary:** Done

Focus starts on the success heading, not Open item. Open item targets the exact item and carries no transcript/provider data in the URL.

## 6. Brain Attachment State

### Banner

**Heading:** Transcript added from Chrome
**Body:** The confirmed transcript is attached to this exact item. AI processing has not started.

Banner is success/provenance feedback. It contains no desktop processing command. On mobile it may contain a secondary **Review AI enrichment** navigation control that selects Digest without starting work.

Bind the banner to a server-validated, content-free receipt reference for this item. Show it on the first successful return and safe idempotent refresh, permit dismissal, and stop auto-focusing after dismissal or expiry. Back/forward navigation and a stale receipt never replay consent or expose transcript/provider data in the URL.

### Title pills

| State | Pill |
| --- | --- |
| Held | AI paused |
| Queued | Queued |
| Digest running | AI processing |
| Indexing | Building index |
| Complete | AI ready |
| Conflict | Review needed |
| Partial index failure | Index needs attention |

## 7. AI Digest Held Panel

### Heading

> **Transcript added. AI processing is paused.**

### Supporting copy

> AI Brain has not started AI processing for this transcript version. Create an AI digest and search index when you are ready.

### Compact provider plan

Always show two rows:

1. **AI digest - {provider}**
   `{model}`
   `On this Brain server | External provider`
2. **Search index - {provider}**
   `{model}`
   `On this Brain server | External provider`

OpenRouter is shown as the gateway, names the downstream provider/model, and says whether fallback is disabled or exactly which fallback policy applies. Unknown downstream/fallback identity removes the action.

### Disclosure control

**What is sent?** is a native disclosure button with `aria-expanded` and `aria-controls`.

Expanded content:

- Digest: title, channel/author, duration, source type, and the first 12,000 transcript characters under the versioned counting rule.
- Digest limitation: later parts of a long transcript are not summarized in P0.
- Index: title repeated with chunked full transcript text and title repeated with the generated digest; this supports meaning-based search/retrieval, while an Ask request remains separate.
- Stored: summary, key quotes, category, AI topics, search index.
- Retention: provider-account handling terms per external stage, Brain source/derived-output storage and backup limitation, exact lab cleanup/delete-by, and authorization expiry as separate facts.
- Excluded: YouTube/Google cookies, account identity, browsing history, player state, signed caption URLs, manual notes, unrelated items.
- This action does not authorize future transcript versions or future Ask questions.

Disclosure is not tooltip-only.

## 8. Authorization Interaction

### Local-only plan

Both processor rows say **On this Brain server**. Complete inline data-scope copy is open and cannot be collapsed while authorization is enabled.

Primary:

> **Enrich on this Brain**

This single click is the processing authorization. The button references the visible disclosure through `aria-describedby`.

### Any remote stage

Primary:

> **Review AI processing**

Desktop opens a focused dialog. Mobile opens a review sheet. The surface keeps the item context visible and contains no provider picker.

**Heading:** Create an AI digest and search index?
**Intro:** This permission applies only to the current transcript version and provider plan below.

Required sections:

- destination item and current transcript label;
- both provider rows;
- sent/not-sent data;
- 12,000-character digest limit;
- full-text embedding coverage;
- outputs stored;
- approved retention/delete-by wording;
- separate Brain source delete-by, provider handling terms, and authorization expiry;
- background queue behavior;
- future revisions and Ask excluded.

**Primary:** Agree and queue AI processing
**Secondary:** Keep AI processing paused

Use one mounted responsive component: native `<dialog>` or an established accessible primitive, centered on desktop and presented as a bottom sheet on mobile. Focus begins on the heading. Background content is inert and page scroll is locked. The disclosure owns a bounded internal scroll region; the visible close control and non-overlapping action footer remain reachable at 320 px, safe-area insets, and 200% zoom. Tab focus cannot leave the surface. Escape/cancel closes and returns focus to the invoking button. No database or network provider action occurs on open/close.

## 9. Durable State Copy

| Effective state | Heading | Body | Action |
| --- | --- | --- | --- |
| No transcript | AI digest | Add a transcript before creating an AI digest. | Go to transcript recovery navigation |
| Attachment committing | Waiting for transcript | The transcript is still being attached. AI processing has not started. | None |
| Held | Transcript added. AI processing is paused. | AI Brain has not started AI processing for this transcript version. | Local authorize or remote review |
| Reviewing | Review AI processing for this transcript | Applies only to the current transcript, ordered stages, scope, and expiry. | Agree and queue AI processing / Keep paused |
| Authorizing | Authorizing AI processing | Securing this transcript version and recording your choice. | Disabled pending action |
| Authorization outcome unknown | Checking whether AI processing started | This page did not receive a clear response from Brain. Do not approve again yet. Brain is checking the original request. | Automatic reconcile, then Check status |
| Confirmed pre-commit denial | AI processing did not start | No provider request was created. Review the issue and try again. | Retry with the same scope and a new mutation only after authoritative denial |
| Queued | AI processing queued | Your choice was recorded. You can leave this page. | None |
| Digest running | Creating AI digest | Using {provider} for the current transcript version. | None |
| Indexing | Digest ready, building search index | Using {embedding provider}; the digest will not be regenerated. | None |
| Complete | AI digest and search index ready | Created from the current transcript revision with both named processors. | None in P0 |
| Digest error | AI enrichment did not finish | The transcript remains attached and unchanged. | Retry digest with {provider} when the scope is still valid |
| Index error | AI digest ready. Search indexing needs attention. | Retrying resends the full current transcript and saved digest to the approved index provider; it does not call the digest provider. | Retry search indexing with {provider} |
| Provider changed before dispatch | AI provider details changed before processing | The queued job is paused. No provider request was started. | Review updated plan |
| Provider changed after digest | Digest ready. Search indexing is paused. | The approved digest provider already received this version. Review the changed search-index plan before sending full text. | Review search-index plan |
| Provider changed after index dispatch | Search-index plan changed after sending | The approved index provider already received this version. The changed plan was not used. | Wait for safe resolution |
| Content changed | Transcript changed while enrichment was running | The older result was rejected. | Review latest transcript |
| Authorization expired | AI processing approval expired | Processing is paused. Review current providers, scope, and retention terms before deciding again. | Review when still eligible |
| Provider missing, user can manage | AI processing is not configured | The transcript remains attached. | Open AI settings |
| Provider missing, managed Brain | AI processing is unavailable | The transcript remains attached. The Brain administrator must restore the approved plan. | None |
| Policy/feature disabled | AI processing remains paused | This environment has not approved AI enrichment for this transcript. | None |
| Session expired | Unlock Brain to continue | The transcript is attached. A new enrichment action is still required. | Unlock Brain |
| Retrieval incompatible | AI digest ready. Search index needs rebuilding. | The saved index is not compatible with the current search model and will not be used. Ask remains a separate action. | None until a reviewed reindex path exists |
| Runner unavailable | AI processing is paused | This environment cannot run the approved interactive job safely. | Operator only |

## 10. Progress Design

Use four stable rows:

1. Authorization
2. Queued
3. Create AI digest
4. Build search index

Before receipt, only Authorization can be current; Queued remains not started. After an accepted or reconciled receipt, Authorization is complete and Queued becomes current/complete according to durable state.

States are not percentages. Completed rows use check icons; current row uses an accessible text status and decorative activity icon; future rows remain neutral. Reduced-motion mode uses a static current-state marker.

Persistent panel is authoritative. Toast may acknowledge completion but cannot replace persistent state.

## 11. Digest Output

Render the enforced transcript output contract:

- one allowlisted category;
- exactly three non-empty digest paragraphs;
- one to five source-verified excerpts of at most 200 characters;
- three to eight normalized AI topics;
- quiet provenance footer with current transcript label, digest provider, index provider, and date.

Do not present the model-generated title or rename the item.

Do not label the result **complete video summary** while input is bounded to 12,000 characters.

## 12. Partial Success

Digest remains visible above an amber status band:

> **The digest is safe**
> Retrying the index will not call the digest provider again.

The failed third progress row remains visible. Primary retry is stage-specific. Provider Settings is secondary.

The item title pill says **Index needs attention**, not generic enrichment failed.

## 13. Conflicts

### Provider plan changed

Use `role="alert"` after a user-triggered authorization conflict. Heading receives focus. Select copy from durable stage facts:

- before dispatch: **The queued job is paused. No provider request was started.**
- after digest dispatch/completion: disclose that the approved digest provider already received this version and pause search indexing;
- after index dispatch: disclose that the approved index provider already received this version, the changed plan was not used, and Brain is verifying safe apply.

Never use unqualified **Nothing was sent**.

### Transcript changed before authorization

Refresh the held panel to the latest transcript. Do not imply an error when no work began. Require a new click.

### Transcript changed in flight

Old output is never shown as current. Display:

> **Transcript changed while enrichment was running**
> The older result was rejected. Review the latest transcript before starting again.

### Two tabs/double click

One tab may optimistically show Starting; both converge on the same durable queued job. A no-op replay is not presented as an error.

### Authorization response lost

Both automatic recovery and manual **Check status** reuse the original mutation ID. New approval remains disabled. Reload and offline recovery preserve the unknown state until an accepted/rejected durable result is known. The UI never claims no provider activity from a network exception.

## 14. Responsive Rules

### Desktop 1024 px+

- Main article plus 330-360 px right rail.
- Provider/model text wraps; no horizontal scroll.
- One full-width primary action.
- Dialog max width supports both provider rows without nested cards; background is inert and the disclosure scrolls inside the modal without obscuring actions.

### Tablet 768-1023 px

- AI Digest becomes an unframed full-width section or single panel after Transcript.
- One logical Digest command is reflowed or remounted intentionally; no hidden duplicate action or duplicate ID exists.

### Mobile below 768 px

- Preserve the current scrollable/query-driven Original, Digest, Ask, Related, Details, and optional Notes tabs.
- Full-width 44 px actions.
- Review is a labelled sheet with close control and focus trap/return.
- Sheet uses safe-area padding, internal disclosure scrolling, inert background, scroll lock, and a non-overlapping action footer.
- Long provider/model names wrap with `overflow-wrap:anywhere`.
- Return from successful Chrome handoff selects Digest only for that explicit return.

### 320 px and 200% zoom

- No horizontal scrolling or clipped labels.
- No two primary commands side by side.
- Provider boundary badge wraps below model text.
- Headings use compact panel scale, not hero typography.
- The prototype shell itself uses `width:min(390px, 100%)`, and automated `scrollWidth <= clientWidth` assertions pass at 320, 360, and 390 px.

## 15. Accessibility

1. Native buttons, dialog/sheet semantics, headings, and lists.
2. Authorization button references visible disclosure via `aria-describedby`.
3. Disclosure uses `aria-expanded` and `aria-controls`.
4. Review heading gets initial focus; cancel/close returns to invoker.
5. Chrome return focuses Transcript added heading, never authorization.
6. Queued/running/indexing/ready changes announce once via polite live region.
7. Provider/content conflicts and user-triggered failures use alerts.
8. Poll responses that do not change state make no announcement.
9. Completion does not steal focus.
10. Disabled queueing action retains readable label and stable dimensions.
11. Touch targets at least 44 x 44 CSS px.
12. State does not depend on color; icons are decorative when adjacent text names the state.
13. Reduced motion, high contrast, keyboard-only, and screen-reader flows remain complete.
14. Exactly one authorization action and one copy of each relationship ID are mounted.
15. Scenario controls are ordinary pressed buttons/menus or implement the complete ARIA tab pattern with keyboard navigation and panels.
16. Complete local disclosure is visible while its one-click authorization is enabled.

## 16. Prototype Instrumentation

The throwaway prototype toolbar may expose controls that do not exist in product:

- Full journey
- Ready to enrich
- Local providers
- Complete
- Provider changed
- Transcript changed
- Indexing failed
- Response lost
- Provider missing
- Session expired
- Authorization expired
- Digest failure/retry
- Provider drift before dispatch, between stages, and after index dispatch
- Duplicate/two-tab convergence
- Item deleting/in-flight deletion
- Stale prior digest
- Feature off
- Production
- Desktop/mobile viewport switch
- Reset

These controls manipulate synthetic state only.

## 17. Prototype Scenario Requirements

### Full journey

Brain missing transcript -> Get transcript with Chrome -> YouTube -> open Brain companion -> Inspect -> review -> Add -> success -> Open item -> held Digest -> remote review -> durable queued -> digest -> index -> ready.

### Ready to enrich

Direct item view proves attachment can remain held indefinitely with no automatic transition.

### Local providers

Both stages say On this Brain server and the one-click local authorization path is visible.

### Provider changed

Direct entries cover pre-dispatch, after digest, and after index dispatch. Copy reports exactly which approved stage already received this version and never uses an unqualified no-transfer claim.

### Transcript changed

Older result rejected; latest transcript remains attached; fresh review required.

### Indexing failed

Digest visible, index failed, retry index only, completion without digest regeneration.

### Feature off

Transcript readable, no dead processing button, accurate environment language.

### Production

Chrome recovery absent, manual transcript routes remain, no browser transcript processing implication.

### Mobile

Full current item tabs, Digest selected only on explicit return, complete disclosure, real review sheet behavior, one mounted action, 44 px actions, and wrapping at narrow width.

### Authorization uncertainty

Direct entries cover pre-commit denial, response loss after commit, offline status recovery, duplicate click, and two-tab convergence. The original mutation remains visible only as prototype instrumentation; the product frame shows truthful reconciliation copy.

### Provider, session, expiry, retry, and deletion

Direct entries cover provider missing (user-manageable and managed), session expiry before approval and during recovery, authorization expiry while held/queued/between stages, digest retry 1/3 and exhausted, item deletion while queued/in-flight, and stale prior digest. Each exposes only the actions the server permits.

## 18. Visual QA Matrix

Capture and inspect:

- 1440 x 1000 desktop full journey held/review/running/done;
- 1024 x 768 tablet held and partial success;
- 390 x 844 and 360 x 800 mobile held/review/partial success;
- 320 x 700 narrow viewport;
- 200% browser zoom equivalent;
- reduced-motion media setting;
- long OpenRouter/downstream model fixture;
- zero-external-request run with bundled/local or deterministic CSS/text asset fallbacks.

Verify no overlap, clipping, blank panel, hidden/duplicated command, duplicate ID, focus escape/loss, unsupported mobile Chrome action, false queued/complete/no-transfer copy, external network request, or `scrollWidth > clientWidth`.

## 19. UX Acceptance Criteria

- [ ] Inspect, Add, and Enrich are independently activated.
- [ ] Add success says AI processing has not started.
- [ ] Held is distinct from queued in banner, pill, and Digest.
- [ ] One persistent command exists in the Digest surface.
- [ ] Both processors, models, boundaries, scopes, and limits are visible before authorization.
- [ ] Local-only and remote review behavior matches the Council decision.
- [ ] Opening/canceling review starts no work.
- [ ] Queueing becomes queued only after durable receipt.
- [ ] Lost responses remain an unknown/reconciling state and never claim no transfer without proof.
- [ ] No percentage or unsupported timing promise appears.
- [ ] Changed provider/content fails closed and requires another action.
- [ ] Provider drift copy distinguishes pre-dispatch, between-stage, and post-dispatch facts.
- [ ] Brain retention, provider handling, and authorization expiry are separately visible and executable.
- [ ] Item title and transcript remain unchanged.
- [ ] Digest remains visible after index failure.
- [ ] Index retry does not imply or simulate digest rerun.
- [ ] Desktop/mobile/zoom/focus/live-region/reduced-motion behavior passes.
- [ ] Real dialog/sheet semantics, one mounted action, real item tabs, and no horizontal overflow pass at 320/360/390 px and 200% zoom.
- [ ] Production scenario does not imply browser capture approval.

## 20. V2 Prototype Limits

- Timers simulate durable states and do not model real latency.
- Provider names/models and transcript cues are synthetic.
- The HTML must not be interpreted as implementation or approval evidence.
- The final V2 HTML renders the specified desktop dialog/mobile sheet, deterministic error states, and layout assertions, but it remains synthetic and cannot prove server authorization, provider behavior, policy validity, or production approval.
