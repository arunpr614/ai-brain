# AI Brain Item Recovery Manual Enrichment UX Specification V1

**Date:** 2026-07-22
**Status:** V1 for Designer, Product Council, and adversarial review
**Prototype:** `prototype/2026-07-22_ai_brain_item_recovery_manual_enrichment_ux_prototype_v1.html`
**Scope:** Synthetic throwaway prototype; no real extension, YouTube, Brain, or provider request

## 1. Experience Intent

Help the user understand three independent decisions:

1. inspect the transcript visible in their signed-in Chrome tab;
2. attach the reviewed transcript to the exact Brain item;
3. authorize a disclosed AI digest and semantic index for that exact transcript version.

The experience must make it possible to stop after attachment. Merely returning to the item, opening Digest, expanding disclosure, closing a dialog, refreshing, or leaving the page does not start processing.

## 2. Core Promise

The most important sentence appears in both Chrome and Brain:

> **Transcript added. AI enrichment has not started.**

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

- Preserve Original and Digest tabs.
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
**Body:** 286 timed segments were added to the exact Brain item that started this request. AI enrichment has not started.
**Privacy heading:** No browser session data shared
**Privacy detail:** Caption type remains unknown. Review AI processing separately in Brain.
**Primary:** Open item in Brain
**Secondary:** Done

Focus starts on the success heading, not Open item. Open item targets the exact item and carries no transcript/provider data in the URL.

## 6. Brain Attachment State

### Banner

**Heading:** Transcript added from Chrome
**Body:** The confirmed transcript is attached to this exact item. AI enrichment has not started.

Banner is success/provenance feedback. It contains no desktop processing command. On mobile it may contain a secondary **Review AI enrichment** navigation control that selects Digest without starting work.

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

> No AI provider has received it. Create an AI digest and semantic index for this exact transcript version.

### Compact provider plan

Always show two rows:

1. **AI digest - {provider}**
   `{model}`
   `On this Brain server | External provider`
2. **Semantic index - {provider}**
   `{model}`
   `On this Brain server | External provider`

OpenRouter additionally names downstream provider and fallback behavior. If unavailable, the action is absent.

### Disclosure control

**What is sent?** is a native disclosure button with `aria-expanded` and `aria-controls`.

Expanded content:

- Digest: title, source type, and up to the first 12,000 transcript characters.
- Index: chunked full transcript text and generated digest.
- Stored: summary, key quotes, category, AI topics, semantic index.
- Excluded: YouTube/Google cookies, account identity, browsing history, player state, signed caption URLs, manual notes, unrelated items.
- This action does not authorize future transcript versions or future Ask questions.

Disclosure is not tooltip-only.

## 8. Authorization Interaction

### Local-only plan

Both processor rows say **On this Brain server**. Inline data-scope copy is visible.

Primary:

> **Enrich on this Brain**

This single click is the processing authorization. The button references the visible disclosure through `aria-describedby`.

### Any remote stage

Primary:

> **Review and enrich transcript**

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
- background queue behavior;
- future revisions and Ask excluded.

**Primary:** Agree and queue enrichment
**Secondary:** Keep AI processing paused

Focus begins on the heading. Escape/cancel closes and returns focus to the invoking button. No database or network provider action occurs on open/close.

## 9. Durable State Copy

| Effective state | Heading | Body | Action |
| --- | --- | --- | --- |
| No transcript | AI digest | Add a transcript before creating an AI digest. | Go to transcript recovery navigation |
| Attachment committing | Waiting for transcript | The transcript is still being attached. AI enrichment has not started. | None |
| Held | Transcript added. AI processing is paused. | No AI provider has received it. | Local authorize or remote review |
| Reviewing | Create an AI digest and search index? | Applies only to current transcript and plan. | Agree and queue / Keep paused |
| Queueing | Starting enrichment... | Securing this transcript version and creating one durable job. | Disabled pending action |
| Queue request failed | Enrichment did not start | Nothing was sent and the transcript was not changed. | Try again with same mutation ID |
| Queued | Enrichment queued | You can leave this page. Brain will use the plan you reviewed. | None |
| Digest running | Creating AI digest | Using {provider} for the current transcript version. | None |
| Indexing | Digest ready, building search index | Using {embedding provider}; the digest will not be regenerated. | None |
| Complete | AI digest | Ready from the current transcript. | None in P0 |
| Digest error | AI enrichment did not finish | The transcript remains attached and unchanged. | Retry enrichment |
| Index error | AI digest ready. Search indexing needs attention. | Retrying the index will not call the digest provider again. | Retry semantic indexing |
| Provider changed | AI provider details changed | Nothing was sent under the new plan. | Review updated plan |
| Content changed | Transcript changed while enrichment was running | The older result was rejected. | Review latest transcript |
| Provider missing | AI enrichment is not configured | The transcript remains attached. | Open AI settings |
| Policy/feature disabled | AI processing remains paused | This environment has not approved AI enrichment for this transcript. | None |
| Session expired | Unlock Brain to continue | The transcript is attached. A new enrichment action is still required. | Unlock Brain |

## 10. Progress Design

Use three stable rows:

1. Queued
2. Create AI digest
3. Build semantic index

States are not percentages. Completed rows use check icons; current row uses an accessible text status and decorative activity icon; future rows remain neutral. Reduced-motion mode uses a static current-state marker.

Persistent panel is authoritative. Toast may acknowledge completion but cannot replace persistent state.

## 11. Digest Output

Render:

- category;
- summary;
- key quotes;
- AI topics/tags;
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

Use `role="alert"` after a user-triggered authorization conflict. Heading receives focus. Copy states **Nothing was sent**. Render the new compact provider rows and require a fresh review.

### Transcript changed before authorization

Refresh the held panel to the latest transcript. Do not imply an error when no work began. Require a new click.

### Transcript changed in flight

Old output is never shown as current. Display:

> **Transcript changed while enrichment was running**
> The older result was rejected. Review the latest transcript before starting again.

### Two tabs/double click

One tab may optimistically show Starting; both converge on the same durable queued job. A no-op replay is not presented as an error.

## 14. Responsive Rules

### Desktop 1024 px+

- Main article plus 330-360 px right rail.
- Provider/model text wraps; no horizontal scroll.
- One full-width primary action.
- Dialog max width supports both provider rows without nested cards.

### Tablet 768-1023 px

- AI Digest becomes an unframed full-width section or single panel after Transcript.
- No duplicated hidden desktop action remains keyboard-focusable.

### Mobile below 768 px

- Original/Digest segmented tabs.
- Full-width 44 px actions.
- Review is a labelled sheet with close control and focus trap/return.
- Long provider/model names wrap with `overflow-wrap:anywhere`.
- Return from successful Chrome handoff selects Digest only for that explicit return.

### 320 px and 200% zoom

- No horizontal scrolling or clipped labels.
- No two primary commands side by side.
- Provider boundary badge wraps below model text.
- Headings use compact panel scale, not hero typography.

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

## 16. Prototype Instrumentation

The throwaway prototype toolbar may expose controls that do not exist in product:

- Full journey
- Ready to enrich
- Local providers
- Complete
- Provider changed
- Transcript changed
- Indexing failed
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

Nothing sent, new plan shown, new review required.

### Transcript changed

Older result rejected; latest transcript remains attached; fresh review required.

### Indexing failed

Digest visible, index failed, retry index only, completion without digest regeneration.

### Feature off

Transcript readable, no dead processing button, accurate environment language.

### Production

Chrome recovery absent, manual transcript routes remain, no browser transcript processing implication.

### Mobile

Digest tab, complete disclosure, review sheet behavior, 44 px actions, wrapping at narrow width.

## 18. Visual QA Matrix

Capture and inspect:

- 1440 x 1000 desktop full journey held/review/running/done;
- 1024 x 768 tablet held and partial success;
- 390 x 844 mobile held/review/partial success;
- 320 x 700 narrow viewport;
- 200% browser zoom equivalent;
- reduced-motion media setting;
- long OpenRouter/downstream model fixture;
- no-network icon-library fallback behavior.

Verify no overlap, clipping, blank panel, hidden command, duplicated focus target, unsupported mobile Chrome action, or false queued/complete copy.

## 19. UX Acceptance Criteria

- [ ] Inspect, Add, and Enrich are independently activated.
- [ ] Add success says AI enrichment has not started.
- [ ] Held is distinct from queued in banner, pill, and Digest.
- [ ] One persistent command exists in the Digest surface.
- [ ] Both processors, models, boundaries, scopes, and limits are visible before authorization.
- [ ] Local-only and remote review behavior matches the Council decision.
- [ ] Opening/canceling review starts no work.
- [ ] Queueing becomes queued only after durable receipt.
- [ ] No percentage or unsupported timing promise appears.
- [ ] Changed provider/content fails closed and requires another action.
- [ ] Item title and transcript remain unchanged.
- [ ] Digest remains visible after index failure.
- [ ] Index retry does not imply or simulate digest rerun.
- [ ] Desktop/mobile/zoom/focus/live-region/reduced-motion behavior passes.
- [ ] Production scenario does not imply browser capture approval.

## 20. V1 Prototype Caveats

- Timers simulate durable states and do not model real latency.
- Provider names/models and transcript cues are synthetic.
- The HTML must not be interpreted as implementation or approval evidence.
- Remote review is represented as an inline focused panel in V1 so the disclosure remains visible during evaluation; V2 must render and verify the specified desktop dialog/mobile sheet semantics.
