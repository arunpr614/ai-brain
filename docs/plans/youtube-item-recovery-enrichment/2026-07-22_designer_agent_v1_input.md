# AI Brain Item Recovery And Manual Enrichment: Designer Agent V1 Input

**Date:** 2026-07-22<br>
**Role:** Designer Agent, Product Council<br>
**Status:** V1 council input, ready for Product Manager and Technical Architect review<br>
**Decision scope:** Extend the item-bound YouTube transcript recovery experience with a user-controlled AI enrichment action that becomes available only after a transcript is durably attached.

## Executive Recommendation

Keep the existing three moments visibly separate:

1. **Inspect visible transcript** reads the already-open YouTube transcript into temporary extension memory.
2. **Add transcript to this Brain item** writes the reviewed transcript to the exact originating item.
3. **Enrich with {provider}** sends the attached transcript for AI processing only after the user returns to AI Brain and reviews an inline provider and payload disclosure.

The third action should live in the existing **AI digest** panel, because that is where its result appears. The transcript panel should remain the authoritative source and provenance surface. The extension must never start enrichment or imply that adding a transcript also authorizes AI processing.

After a successful Add, the extension should continue to say **Open item in Brain**. Its supporting copy should add: **AI enrichment has not started.** The return link may open the item's AI digest panel or mobile Digest tab so the next choice is easy to find, but opening that surface is navigation, not consent.

The ready-state panel should show the provider, the content that will be sent, the content that will not be sent, and the primary action together. The action label names the actual provider, for example **Enrich with Anthropic**. A separate confirmation modal is not recommended: the visible, provider-specific button is the third explicit consent boundary. If the provider changes after the disclosure renders, the request must stop, refresh the disclosure, and require another click.

This recommendation is a GO for the inert throwaway prototype and detailed planning. It does not change the existing NO-GO for production browser capture. Manual enrichment may be available for an already-approved transcript regardless of how the transcript was added, but browser-derived transcripts remain restricted to approved research or fixture environments until the existing capture gates are separately cleared.

## Evidence Reviewed

| Evidence | Design implication |
| --- | --- |
| `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/README.md` | The current flow deliberately requires separate Inspect and Add actions, deletes unconfirmed transcript text when the panel closes, offers honest mobile fallback, and fails closed on item/video changes. The enrichment extension must preserve all of those behaviors. |
| `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_product_council.md` | The request is exact-item bound, the browser action only coordinates the handoff, production capture is still a NO-GO, and Brain may not observe local inspection/review content before Add. Enrichment therefore starts only from the durable Brain item, not from extension memory. |
| `docs/plans/youtube-dom-capture/prototype/item-initiated-recovery/2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html` | The current completed-item state explicitly says external AI processing remains paused. This is the right place to introduce a truthful next step, not to silently remove the pause. |
| `src/app/items/[id]/page.tsx` | The item page already separates a left-side Transcript panel from a right-side AI Digest panel on desktop and uses tabs on mobile. The digest placeholder is the natural persistent home for the new action. |
| `src/components/enriching-pill.tsx` | Existing observable states are `pending`, `running`, `batched`, `done`, and `error`, with labels for queued, enriching, nightly batch, retry, and failure. The new design should reuse this vocabulary while adding an explicit pre-queue `ready` state. |
| `src/db/item-upgrades.ts` | The current upgrade path immediately inserts a pending enrichment job and resets `enrichment_state` to `pending`. That contradicts the requested manual boundary. Implementation must introduce a held/not-started state or equivalent gate so Add cannot be mistaken for enrichment consent. |
| `.env.example` | Enrichment can use Ollama, Anthropic, or OpenRouter. Provider disclosure cannot be hardcoded to one vendor and must accurately distinguish local/server processing from an external provider. |

## Experience Principles

### 1. Adding text is not permission to process it

The Add receipt proves that the transcript is attached. It does not prove that the user agreed to send the transcript to an AI provider. Every success message must state whether enrichment has or has not started.

### 2. Put the decision beside the result

The user should make the enrichment decision in the AI Digest panel. Placing it in the transcript header would mix source provenance with derived content. Placing it only in a transient success banner would make it difficult to find later.

### 3. Name the destination, not just the capability

Avoid a generic **Enrich now** action when an external provider is configured. Use **Enrich with Anthropic**, **Enrich with OpenRouter**, or **Enrich on this Brain**. The user should not need a tooltip or Settings knowledge to understand where the transcript will be processed.

### 4. One explicit click, with the disclosure in view

The ready panel itself is the confirmation surface. The button starts immediately after one deliberate click because the provider and payload disclosure are adjacent and persistently visible. A modal would repeat the same decision and make the flow feel more suspicious rather than more informed.

### 5. Never claim progress the system cannot prove

Use state labels rather than invented percentages. `Queued`, `Queued for tonight's batch`, `Enriching`, and `Retrying 2 of 3` map to existing observable states. The UI should say a digest is ready only after the current transcript revision has a durable successful result.

### 6. Transcript revision is part of the visible contract

The ready, in-progress, and completed states must refer to the transcript revision used. A result from an older transcript is not current even if the job itself succeeded.

## Information Architecture And Placement

### Extension Side Panel

Preserve the current Open -> Inspect -> Add step tracker. Do not add Enrich as a fourth extension step. Enrichment runs in AI Brain under a different privacy boundary and provider context; putting it in the extension would collapse those concepts and encourage a misleading one-click capture-and-process model.

Update only the Add success copy:

- Eyebrow: **Complete**
- Heading: **Transcript added**
- Body: **286 timed segments were added to the exact Brain item that started this request. AI enrichment has not started.**
- Privacy line: **No browser session data was shared. Caption type remains unknown.**
- Primary action: **Open item in Brain**
- Secondary action: **Done**

The return URL should target the same item and carry a server-issued receipt reference, not transcript or provider data. On desktop it should focus the item-level success heading while keeping the AI Digest panel visible. On mobile it should open the Digest tab after presenting a compact transcript-added status at the top. Focus must never land directly on the enrichment button in a way that could turn an Enter key used for navigation into consent.

### Brain Item Header

After Add, replace the weak-source repair panel with a success banner:

- Heading: **Transcript added from Chrome**
- Body: **The confirmed transcript is attached to this item. AI enrichment has not started.**
- Metadata: **English - 286 timed segments - caption type unknown**

Do not put the enrichment command in this banner on desktop. The banner confirms the prior action; the AI Digest panel owns the next action. On mobile, the banner may include a secondary navigation control labeled **Review AI enrichment** that selects the Digest tab. This control must look secondary and must not start a job.

### Transcript Panel

Keep the current structure and source chips. Add a compact derived-state row only when it helps explain a stale or in-progress relationship:

- Not started: **AI digest: Not started**
- In progress: **AI digest: Enriching this transcript**
- Current: **AI digest: Ready from this transcript**
- Stale: **AI digest: Needs refresh**

The row is status, not a second action. On desktop it may link to `#ai-digest`; on mobile it selects the Digest tab. Keep source facts such as language, caption type, segment count, and import time independent from AI state.

### AI Digest Panel

Use the existing digest panel as the single persistent command surface. It has these internal regions separated by simple dividers, not nested cards:

1. Heading and state.
2. Benefit statement or generated output.
3. Provider and privacy disclosure.
4. Primary action or progress/status.

Desktop width remains the existing 360 px right rail. The action must not require horizontal scrolling at that width. Use a full-width button when the provider name would make an inline button wrap awkwardly.

## Provider And Privacy Disclosure

The server should provide display-ready, trusted metadata for the provider currently selected for enrichment. Do not derive it in the browser from environment names, previous jobs, or model IDs.

### Common Disclosure

Always display this above the action:

> Uses the item title and attached transcript to create a summary, key quotes, category, and AI topics.

Always display this below the provider-specific line:

> YouTube cookies, Google account details, browsing history, player data, and signed caption URLs are not sent.

If tags/topics or embeddings use a different provider after enrichment, disclose that separately in the implementation PRD. The button cannot truthfully authorize undisclosed downstream processing.

### Local Or Same-Brain Processing

- Provider label: **Processed on this Brain**
- Detail: **Ollama processes the transcript on this AI Brain server. Transcript content is not sent to an external AI provider.**
- Primary action: **Enrich on this Brain**

Do not say "stays on this device" when AI Brain runs on Hetzner or another server. The accurate boundary is the Brain server.

### Anthropic

- Provider label: **External AI provider: Anthropic**
- Detail: **AI Brain will send the item title and transcript text to Anthropic for this enrichment.**
- Primary action: **Enrich with Anthropic**

### OpenRouter

- Provider label: **External AI provider: OpenRouter**
- Detail: **AI Brain will send the item title and transcript text through OpenRouter to {configured model provider}. Fallback routing is {disabled/enabled}.**
- Primary action: **Enrich with OpenRouter**

If the configured downstream model provider is unknown, do not offer the action. Show the provider-unavailable state rather than claiming OpenRouter is the final processor.

### Expandable Detail

Use an inline text control **What is sent?** with `aria-expanded`. Expanded copy should enumerate:

- Sent: item title, transcript text, transcript language, and the minimum source type needed by the enrichment prompt.
- Not sent: YouTube/Google cookies, account identity, browsing history, player state, signed caption URLs, extension request token, and unrelated Brain items.
- Output: summary, key quotes, category, and AI topics stored on this item.

This disclosure cannot exist only in a tooltip.

## Confirmation Decision

**Recommendation: no additional modal in the normal path.**

The provider-specific button is a clear third consent action because:

- It appears only after the transcript is durable.
- The actual provider is named in the button.
- The input and exclusions are visible in the same panel.
- Nothing begins on panel open, tab selection, return from Chrome, or transcript Add.
- Keyboard focus does not automatically land on the action.

A new click is required when:

- The configured provider or downstream provider changed after render.
- The active transcript revision changed.
- A prior job was cancelled or superseded.
- The user retries after a terminal failure.
- The prior digest is stale and must be regenerated.

The API should reject a stale disclosure fingerprint. The UI then shows **AI provider details changed** and renders the new disclosure; it must not silently continue using the earlier click.

## End-To-End Journey

### A. Transcript Missing

The existing recovery panel remains:

- Heading: **Transcript missing**
- Primary: **Get transcript with Chrome** in approved desktop research environments only.
- Alternatives: **Paste transcript** and **Upload transcript file**.
- Disclosure: **Opens this video and connects it to this item. Brain will not read the page until you click Inspect in the extension.**

No enrichment action is visible or enabled. The AI Digest panel says:

- Heading: **AI digest**
- Body: **Add a transcript before creating an AI digest for this video.**
- Optional navigation link: **Go to transcript recovery**

### B. Inspect And Add In Chrome

Keep current copy and behavior for Ready, Inspecting, Review, Add, incomplete transcript, item changed, video changed, expiry, and network retry. No provider name or enrichment state appears before Add succeeds.

### C. Add Success In Chrome

Show the revised success copy above. **Open item in Brain** returns to the exact item. It does not queue work, call a provider, or upload transcript text again.

### D. Transcript Attached, Enrichment Not Started

Brain shows the transcript success banner and the ready AI Digest panel. The panel contains the complete provider disclosure and one primary action. This is the third boundary.

### E. User Starts Enrichment

On click, freeze the transcript revision, provider disclosure fingerprint, and item identity for the request. Replace the action immediately with **Starting enrichment...** and a spinner. Disable repeat activation while preserving the button width.

After a durable queue receipt, change to the appropriate progress state. A toast may echo **Enrichment started**, but the persistent panel and title-level pill are authoritative.

### F. Digest Completes

Refresh the AI Digest panel in place. Keep focus stable unless the user explicitly selected **View AI digest** from another surface. Announce completion through a polite live region, then render category, summary, quotes, and topics. Record the provider and source revision in a quiet footer.

## State-By-State UI Copy

The following is normative V1 copy for the prototype and later PRD.

| State | Surface | Heading / label | Body | Primary action | Secondary behavior |
| --- | --- | --- | --- | --- | --- |
| No active transcript | AI Digest | **AI digest** | **Add a transcript before creating an AI digest for this video.** | None | **Go to transcript recovery** navigation link when recovery is available. |
| Transcript Add committing | AI Digest | **Waiting for transcript** | **The transcript is still being attached. AI enrichment has not started.** | None | Passive status only. |
| Add success in extension | Extension side panel | **Transcript added** | **286 timed segments were added to the exact Brain item that started this request. AI enrichment has not started.** | **Open item in Brain** | **Done** closes the panel. |
| Ready, local | AI Digest | **Create AI digest** | **Use this transcript to create a summary, key quotes, category, and AI topics. Ollama processes it on this AI Brain server.** | **Enrich on this Brain** | **What is sent?** disclosure. |
| Ready, Anthropic | AI Digest | **Create AI digest** | **Use this transcript to create a summary, key quotes, category, and AI topics. AI Brain will send the item title and transcript text to Anthropic.** | **Enrich with Anthropic** | **What is sent?** disclosure. |
| Ready, OpenRouter | AI Digest | **Create AI digest** | **AI Brain will send the item title and transcript text through OpenRouter to {configured model provider}.** | **Enrich with OpenRouter** | Show routing/fallback status and **What is sent?** |
| Provider missing | AI Digest | **AI enrichment is not configured** | **Choose an AI provider before sending this transcript for enrichment. The transcript remains attached.** | **Open AI settings** | No disabled enrichment button. |
| Provider details changed | AI Digest alert | **AI provider details changed** | **Review the updated provider and privacy details before continuing. Nothing was sent.** | Render the new provider-specific action | Focus the alert heading, not the action. |
| Starting | AI Digest | **Starting enrichment...** | **Securing this transcript version and creating the job. You can leave this page after it is queued.** | Disabled progress button | `aria-busy="true"`. |
| Start request failed | AI Digest alert | **Enrichment did not start** | **Nothing was sent and the transcript was not changed. Check your connection and try again.** | **Try again** | Keep disclosure visible. |
| Queued realtime | AI Digest | **Queued for enrichment** | **This transcript is waiting for the enrichment worker. You can leave this page.** | None | Title pill: **queued**. |
| Queued batch | AI Digest | **Queued for tonight's batch** | **This transcript is safely queued. The digest will appear here after the configured batch finishes.** | None | Do not expose raw batch ID in normal UI. |
| Running | AI Digest | **Creating AI digest** | **Using the transcript attached {relative time}. You can leave this page.** | None | Title pill: **enriching...** and polite live status. |
| Retrying | AI Digest warning | **Retrying enrichment, {attempt} of 3** | **The previous attempt did not finish. AI Brain will retry without changing the transcript.** | None while automatic retry remains | Title pill mirrors **retrying 2/3...**. |
| Current success | AI Digest | **AI digest** | Render category, summary, key quotes, and topics. Footer: **Created from the current transcript with {provider} on {date}.** | None | Optional **Refresh AI digest** only when policy allows intentional reprocessing. |
| Retryable terminal failure | AI Digest alert | **AI enrichment did not finish** | **The transcript is still attached and unchanged. No new digest was saved.** | **Try enrichment again** | **Check AI provider settings** link. |
| Attempts exhausted | AI Digest alert | **AI enrichment needs attention** | **Three attempts did not finish. The transcript is safe. Review the provider, then try again.** | **Check AI provider settings** | After settings review, show **Try enrichment again**. |
| Transcript changed before start | AI Digest | **Transcript updated** | **The enrichment choice now applies to the latest attached transcript. Review the provider details before starting.** | Provider-specific action | Do not carry forward an old click or disclosure fingerprint. |
| Transcript changed in flight | AI Digest warning | **Transcript changed while enrichment was running** | **The older job was stopped or its result was rejected. Start again with the latest transcript.** | **Enrich latest transcript with {provider}** | Never apply the old result. |
| Existing digest is stale | AI Digest warning | **AI digest needs refresh** | **This digest was created from an older transcript and is not used as the current answer context. Enrich the latest transcript to replace it.** | **Refresh with {provider}** | Previous digest may be collapsed under **View previous digest** only if product policy retains it. |
| Item deleted/unavailable | Item return | **This item is no longer available** | **The transcript and enrichment action cannot be opened.** | **Back to Library** | Do not redirect to a similar URL/item. |
| Session expired | AI Digest alert | **Unlock Brain to continue** | **Your transcript is attached. Unlock this Brain before starting enrichment.** | **Unlock Brain** | Return to the same item and require a fresh enrichment click. |
| Enrichment feature disabled | AI Digest | **AI enrichment is unavailable** | **This Brain is currently keeping the transcript without AI processing.** | None | Preserve transcript/export/manual use. |

## Progress And Feedback Behavior

### Persistent State

The AI Digest panel is the source of truth. The existing title-level `EnrichingPill` is a compact mirror only:

- `pending`: **queued**
- `running`: **enriching...**
- `batched`: **queued for tonight's batch**
- retry attempt greater than one: **retrying {attempt}/3...**
- `error`: **enrichment failed**
- `done`: no title pill; the digest content itself proves completion.

Add a pre-queue visual state that does not reuse `pending`. Suggested product term: `ready` or `held`. User-facing copy is **Ready to enrich**, not **queued**.

### Announcements

- Use `role="status"` / `aria-live="polite"` for queued, running, retrying, and done transitions.
- Use `role="alert"` only for provider change, stale transcript conflict, start failure, and terminal failure.
- Do not announce every three-second polling response; announce only state changes.
- On completion, announce **AI digest ready for {item title}** once.
- Keep focus where the user left it. Do not move focus when polling completes.

### Timing

- Show **Starting enrichment...** immediately after activation.
- Do not show success from the POST response alone; require the durable job receipt/state.
- Polling may retain the existing three-second cadence, but visual animation should not reset on each poll.
- Respect `prefers-reduced-motion`; replace pulsing Sparkles with a static icon and changing text.

## Stale Transcript And Concurrency Design

Every visual state should be keyed to an immutable transcript source/revision identifier, not only item ID.

1. When the ready panel renders, it describes the current active transcript revision.
2. Clicking Enrich submits that revision and a provider disclosure fingerprint.
3. If either changed, enrichment does not start. The UI refreshes and asks for another click.
4. If the transcript changes while queued/running, the old job is superseded or its result is rejected.
5. If an old result arrives, do not flash it briefly. Keep the panel in **Transcript changed while enrichment was running**.
6. Search, Ask, AI topics, and the current digest must not present stale derived output as current.

The transcript remains visible and exportable through every enrichment error. Retry acts on derived processing only; it must never re-run Chrome capture or overwrite the transcript.

## Production And Research Honesty

The browser recovery feature remains:

- Visible only in authorized research/fixture/local environments.
- Desktop Chrome only.
- Hidden in production, where paste and upload remain.
- Incapable of creating an intent when its feature gate is off.

The enrichment feature is a separate gate. Its visibility depends on an approved active transcript and configured provider, not on whether Chrome capture is available. Therefore:

- A production item with a manually pasted or uploaded approved transcript may show manual enrichment if product/privacy policy enables it.
- A research browser-derived transcript may show manual enrichment only if the research environment also enables the enrichment gate.
- The UI must not use **Get transcript with Chrome** in production screenshots or copy.
- The extension success screen must not claim that Search, Ask, or AI topics are ready before enrichment/indexing actually completes.

## Responsive Layout

### Desktop, 1024 px And Wider

- Preserve the current main article plus 360 px right rail.
- Keep AI Digest sticky within the right rail when space allows.
- Place the ready action at the top of the AI Digest panel.
- Stack disclosure text above a full-width primary button inside the 360 px panel.
- Keep the transcript success banner and Transcript panel in the main column.
- Do not duplicate the active Enrich command in the item header or transcript panel.

### Tablet, 768-1023 px

- Use the existing responsive column behavior.
- When the right rail drops below the article, place AI Digest after Transcript and before general item body/metadata where feasible.
- Provider disclosure and action remain one full-width block.
- Preserve at least 16 px horizontal page padding and 44 px action height.

### Mobile, Below 768 px

- Keep **Original** and **Digest** as separate item tabs.
- After returning from Chrome, select **Digest** only when the user activated **Open item in Brain** from the successful transcript request. Show a compact **Transcript added** status above the digest action.
- On ordinary later visits, preserve the user's requested tab rather than forcing Digest.
- Show the complete provider disclosure in the Digest tab; do not shorten it to a tooltip.
- Make the provider-specific action full width and at least 44 px tall.
- Allow long provider/model names to wrap in body copy; keep the button label to the provider display name.
- In the Original tab, the Transcript panel status link **AI digest: Not started** may select Digest but cannot start enrichment.
- Chrome recovery remains unavailable on mobile; paste/upload can still lead to the same enrichment-ready state after a durable transcript Add.

### Narrow And Zoomed Layouts

- At 320 CSS px and 200% zoom, headings, provider names, status labels, and actions must wrap without clipping or horizontal scroll.
- Never place two primary commands side by side.
- Keep status icons `aria-hidden` when adjacent text carries the meaning.
- Avoid color-only state. Pair teal/success, amber/warning, and red/error treatments with icons and explicit copy.

## Accessibility Requirements

1. The enrichment control is a native `button`, not a link or clickable container.
2. The provider disclosure has a stable ID referenced by `aria-describedby` on the button.
3. **What is sent?** is a native button with `aria-expanded` and `aria-controls`.
4. Starting state uses `aria-disabled` or `disabled` and preserves a readable label; spinner is decorative.
5. Focus is never moved onto the enrichment action automatically.
6. Extension return focuses **Transcript added from Chrome** or the mobile Digest heading, then leaves the user to review.
7. Polling announces state transitions once and does not flood screen readers.
8. Error focus moves to the error heading only after a user-triggered start/retry fails; background failures use a persistent alert without stealing focus.
9. All interactive targets are at least 44 by 44 CSS px on touch layouts and at least the existing 32 px compact desktop height.
10. The provider and privacy meaning remains available at 200% zoom, in high contrast mode, and without icon color.
11. Reduced-motion users receive no pulsing or spinning beyond a static progress icon and text updates.
12. Exact provider names and status copy are localized as text; model IDs may wrap with `overflow-wrap: anywhere`.

## Prototype Scenarios

The throwaway prototype should extend the existing scenario bar rather than replace the Inspect/Add journey. Each scenario starts from a deterministic direct view.

| Scenario | What the prototype must demonstrate |
| --- | --- |
| Full happy path, Anthropic | Missing transcript -> Chrome Inspect -> Add -> exact-item return -> visible Anthropic disclosure -> third click -> queued -> running -> digest ready. |
| Full happy path, local Ollama | Same flow with **Enrich on this Brain** and accurate server-local disclosure. |
| Add without enrichment | User adds the transcript, returns to Brain, and leaves without clicking. Transcript remains; job never queues. |
| Mobile return | Desktop Chrome flow completes, then the Brain return is visualized at mobile width with Digest selected and a full-width action. Also show mobile-only paste/upload route. |
| Provider not configured | Transcript is attached; no Enrich action appears; **Open AI settings** is available. |
| Provider changed before click | Old disclosure is invalidated, nothing is sent, new disclosure is shown, and another click is required. |
| Starting network failure | Persistent **Enrichment did not start** state; transcript and disclosure remain. |
| Realtime queue | Queued -> running -> done, with no percentage and no focus theft. |
| Nightly batch | **Queued for tonight's batch** mirrors the existing `batched` state. |
| Automatic retry | **Retrying 2 of 3** while transcript remains unchanged. |
| Terminal error | **Try enrichment again** and provider settings path; no false digest. |
| Transcript changes before click | Ready panel refreshes to the latest revision and requires a fresh click. |
| Transcript changes in flight | Old result is rejected; **Enrich latest transcript with {provider}** appears. |
| Stale existing digest | Old digest is clearly non-current/hidden from current answer context; **Refresh with {provider}** appears. |
| Double click / two tabs | One durable job; both views converge on the same state. |
| Session expired | Return to exact item after unlock; enrichment still requires a fresh click. |
| Production browser capture off | Chrome action absent, paste/upload present, and manual enrichment appears only after an approved transcript exists. |
| Accessibility | Keyboard-only Inspect/Add/return/enrich journey, screen-reader announcements, reduced motion, 200% zoom, and 320 px width. |

### Prototype Controls

Add these explicit controls outside the product frame:

- Transcript state: Missing / Added / Changed
- Provider: This Brain (Ollama) / Anthropic / OpenRouter / Not configured
- Enrichment state: Ready / Starting / Queued / Batched / Running / Retrying / Error / Done / Stale / Superseded
- Viewport shortcuts: Desktop / Mobile
- Environment: Approved research / Production

These controls are prototype instrumentation only and must not appear in the product UI.

## Design Risks And Mitigations

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Add silently queues enrichment | Violates the requested third consent boundary and contradicts the current prototype's paused-processing copy. | Add a true held/ready state. Assert no job/provider call occurs on transcript commit. |
| Generic **Enrich now** hides the provider | Users cannot make an informed privacy choice. | Name the actual provider in the button and adjacent disclosure. |
| A modal becomes the only disclosure | Users may click through without context and cannot revisit details. | Keep disclosure persistent in AI Digest; use no normal-path modal. |
| Hardcoded Anthropic copy | The app can also use Ollama or OpenRouter. | Render trusted provider metadata from server configuration. |
| "Local" implies the user's device | Hetzner/server deployment makes that false. | Say **on this AI Brain server**. |
| OpenRouter obscures the final model provider | The named intermediary is not the full data destination. | Display downstream provider and fallback status or disable the action. |
| CTA duplicated across banner, transcript, and digest | Multiple apparent consent points create uncertainty and race-prone clicks. | One command in AI Digest; other surfaces only navigate or mirror status. |
| Old digest appears current after transcript change | Search/Ask may use claims based on superseded content. | Revision-bind outputs, label stale, and exclude stale output from current contexts. |
| Enrichment progress looks like transcript capture | Users may think the browser is still being read. | Move progress entirely into Brain and say **The transcript is still attached and unchanged** on errors. |
| Return link auto-focuses the primary action | Keyboard activation could accidentally become consent. | Focus a heading/status, never the Enrich button. |
| Percent progress is fabricated | Provider/batch work does not expose reliable completion percentage. | Use truthful named states only. |
| Production prototype implies browser capture approval | Could be read as launch authorization. | Production scenario hides Chrome recovery and labels manual routes. |
| Mobile suggests extension support | Chrome extension path is desktop-only. | Mobile begins from attached/paste/upload states and states the limitation. |
| Completion toast disappears | User loses confidence about whether derived content exists. | Persistent digest contents and revision/provider footer are authoritative. |

## Design Acceptance Criteria

### Consent And Privacy

- [ ] Adding a transcript creates no enrichment job and sends no transcript to an AI provider.
- [ ] Inspect, Add, and Enrich remain three independently activated controls on the appropriate surfaces.
- [ ] No enrichment control appears without an active, durable transcript source.
- [ ] The ready state names the actual provider and accurately describes the processing boundary.
- [ ] The ready state lists the input payload and browser/account data exclusions before the action.
- [ ] The provider disclosure is visible text, not tooltip-only.
- [ ] A provider/disclosure change invalidates the earlier view and requires a new click.
- [ ] OpenRouter names the configured downstream provider and fallback behavior or remains disabled.

### Placement And Flow

- [ ] The extension Add success explicitly says AI enrichment has not started.
- [ ] **Open item in Brain** returns to the exact originating item and never starts enrichment.
- [ ] The persistent Enrich command lives in the AI Digest panel and is not duplicated on desktop.
- [ ] Transcript panel provenance remains readable independently of enrichment status.
- [ ] Mobile users can reach the action through Digest without being shown a Chrome capture action.
- [ ] Production hides/disables creation of browser recovery intents while preserving approved manual transcript routes.

### State Truthfulness

- [ ] `Ready to enrich` is visually and semantically distinct from `queued`.
- [ ] Starting, queued, batched, running, retrying, done, and error map only to durable backend states.
- [ ] No percentage appears unless the backend later exposes a trustworthy denominator.
- [ ] Failure and retry never imply the transcript was lost or needs recapture.
- [ ] Double activation produces one durable job and convergent UI.
- [ ] A stale transcript revision blocks or supersedes the old job/result.
- [ ] Stale digest content is not presented or consumed as current.

### Responsive And Accessible

- [ ] Desktop 360 px digest rail fits all provider copy and controls without horizontal scroll.
- [ ] Mobile action is full width, at least 44 px high, and available in the Digest tab.
- [ ] At 320 px and 200% zoom, all text and controls wrap without overlap or clipping.
- [ ] Button is described by the visible provider/privacy text through `aria-describedby`.
- [ ] Status transitions announce once through polite live regions; alerts are reserved for actionable conflicts/failures.
- [ ] Completion does not steal focus.
- [ ] Reduced motion, high contrast, keyboard-only, and screen-reader journeys remain complete.

## Council Recommendation

The Product Council should adopt this model for V1 planning and prototype work:

1. Preserve the current item-bound Chrome recovery flow and its two consent boundaries unchanged.
2. Treat transcript Add as a durable source mutation that leaves AI enrichment in a new **ready/held** state, never `pending`.
3. Return the user to the same Brain item and make the AI Digest panel the persistent home of the third action.
4. Use one inline provider-specific action with the full disclosure visible; do not add a normal-path confirmation modal.
5. Bind enrichment to the active transcript revision and provider disclosure fingerprint, failing closed on either change.
6. Reuse existing queue/progress vocabulary after the user clicks, while keeping the transcript available through every failure.
7. Keep browser capture restricted to approved research environments and prove the production manual-only state in the prototype.

The most important product sentence is:

> **Transcript added. AI enrichment has not started.**

That sentence makes the handoff understandable, preserves user agency, and creates a clean contract for the implementation plan.
