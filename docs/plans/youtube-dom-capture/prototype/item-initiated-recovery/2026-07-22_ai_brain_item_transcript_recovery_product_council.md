# AI Brain Item Transcript Recovery Product Council

**Date:** 2026-07-22<br>
**Status:** GO for an inert prototype and synthetic/local implementation planning; NO-GO for production browser capture<br>
**Question:** How should a transcript-missing YouTube item in AI Brain hand off to the existing Chrome extension and return a confirmed transcript to that exact item?

## Council

- **Designer Agent:** owned placement, hierarchy, copy, responsive behavior, guidance, and failure-state clarity.
- **Product Manager Agent:** owned user intent, eligibility, consent boundaries, success criteria, recovery behavior, and production scope.
- **Technical Architect Agent:** owned Chrome feasibility, item binding, extension lifecycle, API boundaries, concurrency, and fail-closed behavior.

All three agents independently recommended the same core model: start from the existing Brain item, open the source video, require a user click on the Brain toolbar icon, guide the user in a persistent side panel, inspect only after an explicit action, and commit only after a second explicit action.

## Decision

Use a small repair panel on an eligible Brain item with this primary action:

> **Get transcript with Chrome**

The action creates a short-lived request bound to the exact item and video, then opens YouTube in a new tab. It does not authorize DOM access and does not claim that a transcript was found. The YouTube tab tells the user to click the Brain extension icon. That toolbar click authorizes only the active tab and opens a tab-specific side panel.

The side panel keeps the exact destination item visible while the user opens YouTube's own transcript panel and chooses a language. Two separate content actions remain mandatory:

1. **Inspect visible transcript** reads the already-visible transcript into temporary extension memory and verifies identity, order, and completeness.
2. **Add transcript to this Brain item** commits the reviewed transcript to the item that created the request.

After success, the side panel offers **Open item in Brain**. It does not steal focus automatically.

## Resolved Tensions

| Question | Council resolution |
| --- | --- |
| Should the Brain button automatically extract the transcript? | No. It automates coordination only. The extension reads nothing before **Inspect**. |
| Popup or side panel? | Keep the existing popup on ordinary tabs. Use a tab-specific side panel only for a YouTube tab attached to an item-bound request. |
| Should Brain open the side panel automatically? | No. The user clicks the toolbar icon. This is both a truthful consent moment and the reliable `activeTab` grant. |
| Where should the action live? | In the current transcript-missing/weak-source repair panel, directly beneath the item context. |
| What happens on mobile? | Do not imply extension support. Offer paste and transcript-file upload, with desktop-only Chrome guidance. |
| What happens after save? | Stay on YouTube until the user chooses **Open item in Brain**. |
| What happens if the panel closes? | Discard inspected or reviewed transcript text. Keep only resumable request metadata, then require inspection again. |
| What happens if the item or video changes? | Fail closed. Do not guess, replace, deduplicate to another item, or attach partial text. |

## Experience Flow

### 1. Eligible Brain Item

Show the Chrome action only when all of these are true:

- The item is a standard YouTube watch URL with a canonical video ID.
- The item has no active transcript source, not merely an empty preview.
- The item remains metadata-only or otherwise explicitly eligible for transcript repair.
- The authorized research feature gate is enabled.
- No conflicting item-bound request is already active.

Keep **Paste transcript** and **Upload transcript file** available as manual alternatives.

### 2. Private Handoff

Brain creates a 30-minute, single-use, opaque request tied to:

- Brain account and item ID
- expected item content revision
- canonical YouTube video ID
- approved extension identity/version
- return path to the same item

Only the opaque request identifier crosses the Brain page to the extension. No item ID, bearer, transcript, or destination is placed in the YouTube URL, query string, fragment, page DOM, clipboard, or diagnostics.

### 3. YouTube Tab

The extension opens the tab inactive, attaches the request to that tab, changes only that tab's toolbar behavior, then activates it. The visible instruction is:

> YouTube opened. Click the Brain extension icon in that tab. Nothing has been read.

Ordinary tabs retain the existing Brain popup.

### 4. Toolbar Authorization

For the request tab only, the extension uses a per-tab empty action popup and a per-tab side-panel path. The toolbar click produces `action.onClicked`, grants `activeTab`, validates the still-live request, and opens the side panel. A pinned side panel opened by other Chrome UI must still ask for the toolbar click if the active-tab grant is absent.

### 5. Open YouTube Transcript

The side panel says:

> Open YouTube's transcript panel and choose a language, then inspect. Nothing has been read.

**Show me where** may highlight YouTube's own **Show transcript** control, but it must not open the panel or inspect content automatically.

### 6. Inspect Locally

**Inspect visible transcript** first obtains a short-lived server authorization after rechecking the kill switch, request expiry, extension version, item revision, video identity, and active-source state. Only then may the extension run an isolated DOM inspection under `activeTab`.

Inspection must preserve cue order and repeated cues, prove traversal reached the final cue, and stop on identity or track changes. Transcript text stays in extension memory only. Caption type remains `unknown` unless independently proven.

### 7. Review And Add

Review shows the exact destination, visible language, timed segment count, character count, completeness proof, and unknown caption type. It also names data that will not be sent: YouTube cookies, Google account details, browsing history, player state, and signed caption URLs.

**Add transcript to this Brain item** performs an atomic exact-item commit. The server rechecks item revision, canonical video identity, request state, and absence of another active transcript source. It never falls back to URL deduplication or another matching item.

### 8. Explicit Return

After a durable receipt is recovered, show:

> Transcript added to "But what is a neural network? | Deep learning chapter 1."

The only navigation action is **Open item in Brain**. The refreshed item replaces the repair action with a transcript-added state and transcript content.

## State Model

| Surface | State | Required behavior |
| --- | --- | --- |
| Brain item | Eligible | Chrome, paste, and upload actions; no extraction claim. |
| Brain item | Launching | Creating an item-bound request; no transcript progress. |
| Brain item | Waiting | YouTube opened; click toolbar icon; request expiry only. |
| Brain item | Extension setup | Cover missing, hidden/unpinned, unpaired, and update-required recovery. |
| Brain item | Production/manual | Hide Chrome action; show paste and upload only. |
| YouTube | Ordinary tab | Existing Brain popup; no item-recovery side panel. |
| YouTube | Bound, unread | Exact item visible; nothing read; open transcript guidance. |
| YouTube | Panel closed | Explain how to open the transcript; do not infer absence. |
| YouTube | Inspecting | Local-only progress after Inspect. |
| YouTube | Review | Evidence and destination; no upload yet. |
| YouTube | Saving | Atomic commit in progress after Add. |
| YouTube | Success | Durable receipt plus explicit return action. |
| YouTube | No transcript | Nothing added; offer manual recovery. |
| YouTube | Incomplete | Block partial text; require another inspection. |
| YouTube | Video changed | Invalidate request and restore ordinary action behavior. |
| YouTube | Item changed | Conflict; replace nothing. |
| YouTube | Expired | Grant nothing; start a new request. |
| YouTube | Network retry | Keep reviewed text only while the panel remains open; retry without false success. |
| Mobile | Unsupported | Paste/upload only; explain that the extension is desktop Chrome only. |

Brain may observe only terminal server states such as `pending`, `committed`, `conflict`, `cancelled`, or `expired`. Local inspecting/review progress and transcript content are not sent to the Brain page before confirmation.

## Technical Shape

### Brain API

- `POST /api/items/:id/youtube-capture-intents`: create the exact-item request under the Brain session and exact web origin.
- `POST /api/capture/youtube-intents/:intent/claim`: claim with the paired extension bearer and exact extension identity/version.
- `POST /api/capture/youtube-intents/:intent/authorize-inspect`: issue short-lived inspect authorization after all gates pass.
- `POST /api/capture/youtube-intents/:intent/commit`: atomically validate and attach the confirmed transcript to `intent.item_id`.
- `GET /api/items/:id/youtube-capture-intents/current`: expose terminal request status for item polling/on-focus refresh.

The database should allow at most one open request per item. Requests are revocable, stored hashed server-side, and preserve `browser_link_only_v1` unless a confirmed commit succeeds.

### Extension

- Add `sidePanel`, `scripting`, an exact Brain API host permission, and exact Brain-origin `externally_connectable` configuration to the approved research package.
- Add no persistent YouTube host permission.
- Require Chrome 116 or later for programmatic `sidePanel.open()`.
- Use `action.setPopup({ tabId, popup: "" })` and `sidePanel.setOptions({ tabId, path, enabled: true })` only on request tabs.
- Store only request/tab metadata in `chrome.storage.session`; do not persist transcript text.
- Restore the ordinary popup and disable the panel on commit, cancellation, expiry, tab close, or canonical-video navigation.

Chrome's documented behavior supports the core design: [per-tab action popup configuration](https://developer.chrome.com/docs/extensions/reference/api/action), [temporary active-tab access after an extension action](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [programmatic tab-specific side panels](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [script execution under `scripting` plus `activeTab`](https://developer.chrome.com/docs/extensions/reference/api/scripting), and [web-page to extension messaging constrained by `externally_connectable`](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

## Required Implementation Gates

The Product Council gives a conditional GO for fixture/local implementation planning only. An approved lab package remains blocked until all of these pass:

1. A packaged MV3 E2E proves that a per-tab empty popup triggers `action.onClicked`, grants `activeTab`, and permits `sidePanel.open({ tabId })` while ordinary tabs retain the current popup.
2. Exact-origin external messaging, paired-bearer claim, extension ID/version checks, expiry, revocation, and single-use behavior are covered by negative tests.
3. SPA navigation to a different YouTube video invalidates the request and restores ordinary extension behavior.
4. Side-panel close proves transcript-memory deletion and mandatory reinspection.
5. Atomic commit proves wrong-item, stale-revision, changed-video, duplicate-source, partial-traversal, and retry conflicts cannot attach or replace content.
6. Production configuration proves that no request can be created and manual recovery remains available.

Production browser capture remains a NO-GO until a new platform/legal/privacy/security decision and separately reviewed implementation explicitly supersede the current final V2 plan.

## Prototype

- [Interactive item-initiated recovery prototype](2026-07-22_ai_brain_item_transcript_recovery_ux_prototype.html)
- [Prototype guide and screenshots](README.md)
- [Browser QA record](2026-07-22_ai_brain_item_transcript_recovery_prototype_qa.md)

The prototype is intentionally inert. It uses synthetic transcript cues, makes no extension or Brain API request, reads no YouTube DOM, and changes no production behavior.
