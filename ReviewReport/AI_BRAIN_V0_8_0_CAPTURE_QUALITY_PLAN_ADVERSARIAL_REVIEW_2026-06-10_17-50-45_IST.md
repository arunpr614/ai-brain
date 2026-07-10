# AI Brain v0.8.0 Capture Quality Plan Adversarial Review

**Created:** 2026-06-10 17:50:45 IST
**Author:** Codex
**Review posture:** brutal adversarial self-critique
**Reviewed plan:** `docs/plans/v0.8.0-capture-quality-next-feature-plan-2026-06-10_17-39-01_IST.md`
**Related evidence reviewed:** capture-quality spike execution report, v0.7.5 self-critique, v0.7.6 hardening execution report, current capture code paths, current Telegram acknowledgements, current Library/item-detail UI

---

## 1. Executive Verdict

The plan has the right strategic instinct: **do not chase brittle scraping; improve weak captures through explicit upgrade flows.**

But as an implementation plan, it is not yet good enough. It is a directional memo wearing a plan costume.

The brutal version:

- It correctly prioritizes YouTube and LinkedIn capture quality.
- It correctly protects the v0.7.6 reliability gains.
- It correctly avoids unsafe LinkedIn scraping.
- But it is stale against the current code in several places.
- It under-specifies the hardest part: how YouTube pasted transcript/notes become item content.
- It assumes "same URL plus text upgrades existing item" is solved generally, when it is only solved for LinkedIn today.
- It lacks database, search, enrichment, artifact, and rollback requirements for upgrades.
- It does not define enough acceptance tests to prevent duplicate YouTube rows, degraded Ask quality, or misleading quality labels.
- It postpones measurement and review UI even though those are needed to know whether the feature actually worked.

**Recommendation:** Do not execute this plan as written. Rewrite it into a tighter v0.8.0 implementation plan focused on one release objective: **safe weak-capture upgrades with measurable quality outcomes.**

---

## 2. What The Plan Gets Right

### Correct: Save-first reliability must remain sacred

The plan keeps the v0.7.6 production lesson intact: a blocked transcript or platform limitation should not make capture fail. This is the right product posture.

### Correct: User-provided text is the honest high-quality path

For LinkedIn and many YouTube cases, the most reliable content source is the user. The plan is right to prefer explicit user-provided transcript/text over scraping, cookies, browser automation, or platform-specific DOM extraction.

### Correct: LinkedIn-specific scraping should stay out

The plan preserves the safe LinkedIn direction from SPIKE-009: metadata-only server capture plus manual paste/selected-text capture. That is exactly the right risk boundary.

### Correct: Substack classification needs trust cleanup

The production smoke proved Substack can capture useful body text while still labeling it conservatively. The plan is right that quality labels must become sharper because users will use those labels to decide what Brain actually knows.

### Correct: A giant dashboard would be premature

The plan avoids turning this into a broad analytics dashboard project. Good. The capture experience needs a scalpel, not a parade.

---

## 3. Critical Findings

### P0 - The plan says "YouTube upgrade" but the current pipeline cannot do it

The plan's top priority is a YouTube transcript/text upgrade path. That priority is right, but the plan does not confront the actual implementation gap.

Current behavior:

- `/api/capture/url` and Telegram both compute meaningful pasted text.
- But `extractUrlCapture` ignores user text for YouTube because YouTube detection routes straight to `extractYoutubeVideo`.
- `extractYoutubeVideo` returns transcript/metadata content from YouTube, not user-provided text.
- The existing upgrade check only upgrades when incoming quality is `user_provided_full_text`.
- For YouTube, incoming quality will not become `user_provided_full_text` today.

Likely failure mode if implemented lazily:

1. User saves a YouTube link.
2. Brain stores it as `metadata_only`.
3. User pastes the same YouTube link plus transcript.
4. Brain extracts YouTube again, still metadata-only.
5. Upgrade condition does not fire.
6. Brain creates another duplicate metadata-only item.

This is exactly the user-hostile loop v0.8.0 is supposed to eliminate.

Required correction:

- Add an explicit `captureYoutubeUserText` or generic `captureUserProvidedUrlText` path.
- For YouTube/Shorts, if meaningful pasted text exists, build a user-provided content body while preserving original video metadata from the existing item when available.
- Ensure existing `metadata_only` YouTube/Shorts rows upgrade instead of duplicating.
- Add route and Telegram tests specifically for YouTube URL-only followed by same URL plus pasted transcript.

### P0 - The plan is stale: it treats already-shipped hardening work as future work

Several items in the plan were already partially or fully implemented in v0.7.6:

- LinkedIn metadata-only capture exists.
- LinkedIn pasted-text capture exists.
- LinkedIn metadata-only-to-user-text upgrade exists.
- Item detail quality hints exist.
- Library quality labels exist.
- Substack paywall handling has already been hardened once.
- Artifact safety and build safety were already addressed.

This matters because the plan's execution order is now misleading. It says to build broad "YouTube/LinkedIn upgrade flow" first, but the actual remaining high-value gap is narrower and sharper:

1. YouTube/Shorts user-provided transcript upgrade.
2. Web/manual UI entry point for adding transcript/notes.
3. Capture-quality filter/review affordance.
4. Substack classification validation with real fixtures.

Required correction:

- Rewrite the plan against the current production baseline, not the pre-v0.7.6 baseline.
- Mark existing behavior as "already available."
- Mark true gaps as "needs implementation."

### P0 - The plan has no re-enrichment requirement after an upgrade

If a metadata-only item is upgraded to full pasted text, Brain's embeddings, chunks, summaries, quotes, and Ask behavior must reflect the new body.

The plan only says "update the existing item." That is dangerously incomplete.

Questions the plan does not answer:

- Are old chunks deleted?
- Are old embeddings deleted?
- Is the item re-queued for enrichment?
- Does `enrichment_state` reset from `done` to `pending`?
- Does Ask use stale metadata chunks until a worker catches up?
- Are old quotes/summaries invalidated?
- Does the UI show "updating" after the upgrade?

Failure mode:

- The item page shows pasted transcript text.
- Ask still retrieves old metadata-only chunks.
- User believes Brain captured the transcript, but retrieval still behaves like it did not.

Required correction:

- Define an upgrade transaction that updates item content and invalidates downstream derived state.
- Re-run chunking, embeddings, and enrichment for upgraded content.
- Add tests proving Ask/retrieval state does not remain stale after upgrade.

### P1 - The plan does not define the content model for pasted YouTube text

"Paste transcript/notes" sounds simple, but it hides important product decisions.

The plan does not specify:

- Is pasted text treated as transcript, notes, or both?
- Does Brain preserve line breaks and timestamps?
- Does Brain strip the source URL only or all URLs?
- How does it title the upgraded item if the pasted text's first line is noisy?
- Does it keep original YouTube title/channel/duration/thumbnail?
- Does it retain the previous metadata artifact?
- Does it store a new artifact for the user-provided transcript?
- Is quality `user_provided_full_text`, `transcript`, or a new value like `user_provided_transcript`?

Using `user_provided_full_text` for every pasted YouTube transcript may technically work, but it blurs useful meaning. A pasted LinkedIn post and a pasted YouTube transcript are not the same kind of content.

Required correction:

- Define a pasted-content contract:
  - preserve paragraph/timestamp formatting
  - remove only the captured source URL
  - keep secondary URLs
  - store user text as an artifact
  - keep video metadata
  - use a clear extraction method such as `youtube_user_provided_transcript`
- Decide whether to add a new quality label or reuse `user_provided_full_text` with platform/method specificity.

### P1 - Acceptance criteria are too easy to game

The plan's acceptance criteria are directionally sensible but not testable enough.

Example:

- "The item page clearly shows the upgraded quality."

This could pass while:

- retrieval still uses stale chunks
- duplicate rows still exist
- Telegram says "updated" but web UI still shows old content
- export metadata says one thing while Library says another
- artifacts are missing

Required correction:

Every acceptance criterion should map to a concrete automated or smoke check.

Minimum acceptance tests:

- Telegram: YouTube URL-only creates metadata-only item.
- Telegram: same YouTube URL plus 8+ words upgrades existing item.
- API: same YouTube URL plus note upgrades existing item.
- API: upgrade response says `action: "upgraded"`.
- DB: item count remains 1.
- DB: `total_chars` increases.
- DB: quality and extraction method change.
- DB/search: old chunks are replaced or reprocessing is queued.
- Web item: hint disappears or changes after upgrade.
- Export: capture metadata reflects upgraded state.
- Smoke cleanup: no smoke rows remain.

### P1 - The plan does not define duplicate semantics beyond one happy path

The plan says later pasted text should upgrade the existing weak item. Good. But real duplicates are messier:

- What if the existing item is already `metadata_plus_transcript`?
- What if the existing item is `transcript` but user pastes personal notes?
- What if the same YouTube URL is captured once as Short and once as watch URL?
- What if source URL canonicalization changes?
- What if there are already two duplicates from older bugs?
- What if the existing item is `failed` or `paywall_preview`?
- What if the incoming pasted text is worse than the existing content?

Required correction:

Define an explicit upgrade matrix:

| Existing quality | Incoming content | Action |
|---|---|---|
| `metadata_only` | user text | upgrade |
| `paywall_preview` | user text/email | upgrade |
| `transcript` / `metadata_plus_transcript` | user notes | append or create note, not blind overwrite |
| `full_text` | user text | duplicate guard or ask for explicit append |
| duplicate legacy rows | any | choose canonical row and do not multiply duplicates |

### P1 - The plan underestimates Library review/filter work

The plan pushes "Capture Quality Review Surface" to priority 4. That is probably too late.

Reason: after v0.8.0 starts creating or upgrading weak captures, the user needs a fast way to find:

- metadata-only YouTube links
- LinkedIn previews
- Substack previews
- recently upgraded items
- items still awaiting enrichment after upgrade

The current Library shows labels, but it does not provide a quality filter/facet. If the user's library grows, "paste transcript with the same link" is not enough. They need to know what still needs action.

Required correction:

- Move a minimal "Needs upgrade" Library filter into the same release as YouTube upgrade.
- Keep it simple: `All`, `Needs upgrade`, `Full text`, `Metadata only`.
- Do not wait until all quality labels are perfect. The filter is part of making the feature usable.

### P1 - Substack classification cleanup is not scoped tightly enough

The plan correctly identifies the problem, but the proposed rules are vague:

- "Use JSON-LD article body, RSS entry content, and readability body length together."
- "Treat long body with no paywall marker as full_text or long_preview."

Current code already uses Readability, JSON-LD, Open Graph, RSS, and strong paywall markers. The real risk is not "use more sources"; it is **mislabeling confidence.**

The plan also proposes `long_preview`, but `long_preview` is not currently in the `CaptureQuality` type. Adding it is not free:

- DB values and migrations need to support it.
- UI labels need it.
- export metadata needs it.
- tests need it.
- any downstream quality logic needs it.

Required correction:

- Decide whether v0.8.0 introduces a new `long_preview` quality.
- If yes, define migration/type/UI/export/test scope.
- If no, keep only existing labels and improve the classifier within current values.
- Use a small fixture gate before changing behavior.

### P1 - The plan has no production observability requirement

This feature can look successful in unit tests and still fail in real use.

The plan needs metrics or logs for:

- capture created vs upgraded
- platform
- old quality
- new quality
- duplicate prevented
- upgrade rejected because pasted text was too short
- enrichment reset/requeued
- artifact save outcome

Required correction:

- Add structured logs for capture upgrade decisions.
- Add smoke output that prints created/upgraded/duplicate counts.
- Add at least one production-safe synthetic smoke for upgrade behavior before release.

### P2 - The Telegram copy is still too passive

The plan's Telegram copy is polite but weak. It says:

> Saved metadata. If you want the transcript/notes attached, paste it here with the same link.

That is understandable, but it makes the user do a small puzzle:

- How much text is enough?
- Can they paste YouTube's transcript?
- Can they paste their own notes?
- Must the same link be included?
- Will it update or create another item?

Required correction:

Use copy that makes the action concrete:

> Saved the YouTube link, but I could not read the transcript. To upgrade this item, send the same link again with the transcript or your notes pasted below it.

And after upgrade:

> Updated the existing YouTube item with your pasted text.

### P2 - The item detail page hint is not action-oriented enough

Current YouTube metadata-only hint says:

> Retry later or add a note if the video has no transcript.

That is weaker than the v0.8.0 product goal. "Add a note" is not an available in-page action today, and "retry later" is vague.

Required correction:

- Either add a real "Add transcript or notes" action, or change the hint to match the available Telegram/API flow.
- Do not show a UI prompt for an action the UI cannot perform.

### P2 - The plan ignores source provenance and trust in user-provided text

Once the user can paste transcripts or notes, Brain should record that provenance clearly.

The plan does not specify whether the user-provided text is:

- exact transcript
- edited transcript
- personal notes
- summary
- quoted article content

This matters for trust. Brain should not imply a pasted personal summary is the video's actual transcript.

Required correction:

- Either ask the user to choose `Transcript` vs `Notes`, or label it generically as "Pasted text" and avoid claiming it is official transcript.
- Store extraction method and artifact kind accurately.

### P2 - The plan does not address old weak rows already in production

The plan focuses on future captures. But production may already contain weak metadata-only items.

Required correction:

- Define whether v0.8.0 supports upgrading any existing metadata-only item.
- Add a Library filter so old weak rows are visible.
- Do not require recapturing from scratch.

### P2 - Web app capture flow is underspecified

The plan says "Web item page action: Add transcript or notes," but it does not define:

- route/action name
- form placement
- text limits
- validation
- whether it appends or replaces
- success state
- error state
- mobile behavior
- whether it works without Telegram

Required correction:

- Either remove web action from v0.8.0 and make Telegram-only explicit, or fully specify the web action.
- Half-building this will create confusing UI.

### P2 - No rollback/data repair story

Upgrade flows mutate existing items. That is riskier than creating new rows.

The plan does not define:

- backup before production upgrade smoke
- whether old body is stored in artifact/history
- how to recover if an upgrade overwrites good content
- whether upgrades are reversible

Required correction:

- Store the previous body/metadata as an artifact or add an item revision table before destructive overwrite, or constrain overwrite only to weak metadata-only captures.
- For v0.8.0, only overwrite `metadata_only`/`paywall_preview` rows unless a broader revision design exists.

---

## 4. Hidden Assumptions That Need To Be Made Explicit

1. **Assumption:** Pasted text with the same URL is intentional upgrade, not a new note.
   **Risk:** User may paste commentary and accidentally overwrite capture content.

2. **Assumption:** `metadata_only -> user_provided_full_text` is always a quality improvement.
   **Risk:** Short or low-quality pasted text can be worse than existing metadata.

3. **Assumption:** URL canonicalization is stable enough to find existing items.
   **Risk:** YouTube Shorts/watch normalization works now, but future URL shapes can break upgrade matching.

4. **Assumption:** Item body mutation automatically propagates to search and Ask.
   **Risk:** Derived state can remain stale.

5. **Assumption:** The user wants one item per URL.
   **Risk:** Sometimes they may want multiple personal notes about the same video.

6. **Assumption:** Quality labels are self-explanatory.
   **Risk:** "metadata only" and "pasted text" help, but they do not tell the user what Brain can answer well.

---

## 5. Revised Recommendation

Replace the current plan with a tighter v0.8.0 plan:

### v0.8.0 Goal

Make weak captures upgradeable without duplicates or stale Ask/search state.

### v0.8.0 Release Scope

1. **YouTube/Shorts pasted text upgrade**
   - If same canonical URL exists as `metadata_only`, pasted text upgrades it.
   - Preserve video metadata.
   - Store pasted text as the new body with clear provenance.
   - Store the pasted text artifact.

2. **Derived-state reset after upgrade**
   - Reset/requeue enrichment.
   - Rebuild chunks/embeddings.
   - Ensure Ask uses upgraded content.

3. **Telegram acknowledgement cleanup**
   - Metadata-only YouTube/LinkedIn messages explain exactly how to upgrade.
   - Upgrade message says existing item was updated.

4. **Minimal Library review filter**
   - Add `Needs upgrade`.
   - Include YouTube/Shorts `metadata_only`, LinkedIn `metadata_only`, and Substack `paywall_preview`.

5. **Substack classification validation**
   - Do fixture-based refinement only if evidence shows current labels are wrong.
   - Do not add `long_preview` unless the whole quality model is updated.

### Defer

- Browser extension selected-text capture.
- YouTube Data API changes unless a key is configured and a separate measurement pass proves value.
- Third-party extraction providers.
- Generic item revision history beyond safe weak-capture upgrades.
- Large capture dashboard.

---

## 6. Required Test Plan Before Execution

### Unit Tests

- YouTube user-provided text builder preserves formatting and source metadata.
- Meaningful text removes only the captured URL.
- Upgrade matrix returns expected action for metadata-only, full-text, transcript, paywall-preview, and duplicate legacy rows.

### API Route Tests

- YouTube URL-only creates metadata-only item.
- Same YouTube URL plus pasted text upgrades existing item.
- Same YouTube URL plus pasted text does not create a duplicate.
- Upgrade response returns `action: "upgraded"`.
- Upgrade resets/requeues downstream processing state.

### Telegram Tests

- YouTube metadata-only ack gives concrete upgrade instruction.
- Same YouTube link plus pasted text sends "Updated existing capture."
- LinkedIn existing behavior remains intact.
- Too-short pasted text does not overwrite existing content.

### UI Tests

- Item detail shows improvement hint only for weak captures.
- After upgrade, hint disappears or changes.
- Library `Needs upgrade` filter includes weak captures and excludes upgraded captures.

### Production Smoke

- Backup production DB first.
- Synthetic Telegram owner-path smoke:
  - YouTube URL-only
  - same YouTube URL plus pasted transcript text
  - LinkedIn URL-only
  - same LinkedIn URL plus pasted text
- Confirm item count remains stable where upgrade is expected.
- Confirm cleanup removes smoke rows and artifacts.

---

## 7. Go / No-Go Decision

**No-go for executing the current plan as written.**

It is safe as a product direction, but unsafe as an implementation plan because it hides the actual hard parts:

- YouTube pasted text is not wired.
- duplicate semantics are underspecified.
- derived-state refresh is missing.
- Substack quality changes are vague.
- acceptance criteria are too soft.

**Go after rewrite** into a scoped implementation plan with the test plan above.

---

## 8. Final Call

The next right thing is not to start coding from this plan directly.

The next right thing is to create a revised v0.8.0 implementation plan with one crisp release objective:

> Upgrade weak captures safely, visibly, and measurably.

Once that plan exists, implementation should start from a clean branch off `origin/main` and touch only the capture upgrade path, derived-state reset, Telegram copy, minimal Library filtering, and tests.
