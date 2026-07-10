# F08 Manual Content Notes: Tightening, Future Features, and Annotation Tool Brainstorm

**Date:** 2026-07-10  
**Product:** AI Brain / AI Memory  
**Feature baseline:** Production-verified per-item manual Markdown notes  
**Audience:** Product, design, engineering, QA, and future AI agents  
**Status:** Brainstorm and prioritization input; not an approved implementation commitment

## Executive Summary

The shipped implementation is already strong on the difficult foundations: separately stored canonical Markdown, explicit manual Save, autosave and local recovery, optimistic concurrency, deletion tombstones, versions, exact search, opt-in semantic indexing, provider-specific consent, source-aware Ask citations, Related-item influence, guarded migrations, and production cleanup verification.

The next phase should not begin by making the editor dramatically more complicated. The highest-value move is to make the existing system **more trustworthy, more explainable, and more connected to the act of reading**. The note should evolve from “a Markdown field attached to a card” into a personal thinking layer that connects evidence, interpretation, questions, decisions, and future review.

The recommended product sequence is:

1. Tighten save, sync, indexing, consent, and version-history clarity.
2. Add source-linked highlights and annotations.
3. Add note-only and source-aware Ask controls.
4. Add explicit links, backlinks, and explainable relationships.
5. Build review, synthesis, and learning workflows on top of that trusted graph.

For the annotation tool, the strategic direction is similar: evolve it from pixel-positioned feedback into a **semantically anchored, context-rich, verifiable change request**. The long-term opportunity is for an annotation to become durable product intent that can generate a fix, an acceptance check, and eventually a regression test.

## Working Principles

These principles should constrain future work:

- **Canonical Markdown remains the source of truth.** Avoid replacing a portable document with a proprietary block format unless a future requirement proves Markdown insufficient.
- **The user’s writing remains visibly distinct from AI output.** AI can propose, compare, structure, or critique, but must not silently rewrite the canonical note.
- **Privacy is a product state, not a footnote.** The interface should continuously show whether content is local-only, server-saved, eligible for remote processing, indexed, or being purged.
- **Relationships must be explainable.** A connection is useful only when the user can understand and control why it exists.
- **Recovery paths must remain reversible.** Restore, merge, AI suggestion acceptance, graph-edge creation, and bulk actions should create new state rather than destroy the previous state.
- **Mobile is a first-class review environment.** Desktop may be better for long writing, but mobile should be excellent for capture, highlighting, quick edits, review, and follow-up.
- **Complexity must earn its place.** Prefer incremental capabilities that compound the existing model over a broad “knowledge workspace” redesign.

---

# 1. Tightening the Current Implementation

## 1.1 Create a Unified Trust and Status Bar

The current architecture distinguishes browser journal state, canonical server state, semantic-index state, and provider consent. The interface should compress those technical states into a small, legible trust model.

Recommended states:

| Layer | Example states | User-facing meaning |
|---|---|---|
| Local draft | Drafting, Recovered locally, Local changes waiting | The browser has text that may not yet be canonical |
| Server save | Saving, Saved, Save failed, Conflict | The canonical Markdown state on the server |
| AI eligibility | Private, Permission needed, Included in AI | Whether the note can be used beyond exact search |
| Semantic index | Waiting, Indexing, Indexed, Removing, Index failed | Whether Ask and Related can use the current generation |

Design guidance:

- Show the last confirmed save time without making the UI noisy.
- Prefer plain-language states such as “Saved” and “Available to Ask” over queue terminology.
- Make a local recovery draft visible before the user starts editing.
- Warn on navigation only when the newest text is neither canonically saved nor safely journaled.
- Let the user open a details popover for epoch, generation, provider, and recovery information; keep those details out of the default editor surface.

## 1.2 Turn Version History into a Working Tool

The current checkpoint model protects against loss. The next iteration should help users understand and reuse their thinking history.

Recommended capabilities:

- Inline or side-by-side Markdown diff.
- Labels for Manual save, Timed checkpoint, Before clear, Conflict copy, Restore, and Recovered draft.
- Preview an older version without changing the current note.
- Copy a paragraph from an old version.
- Restore as a new version so the restore remains reversible.
- Compare any two selected versions.
- Show a concise change summary: words added, removed, and headings changed.
- Allow a user-authored checkpoint label such as “Before project review.”

The important distinction is between **history for disaster recovery** and **history for reflection**. Both can share the same data model while using different presentation.

## 1.3 Improve the Markdown Editor Without Becoming a Block Editor

High-value editor improvements:

- Keyboard shortcuts with a discoverable shortcut guide.
- Slash commands for heading, checklist, quote, link, code block, and divider.
- Find and replace within the current note.
- Task-list, table, code-block, and horizontal-rule toolbar controls.
- A sticky mobile toolbar positioned above the software keyboard.
- Smart list continuation and indentation.
- Better paste normalization from websites, Google Docs, email, and AI chat tools.
- Optional focus mode that hides the surrounding card chrome.
- Word count, reading time, and heading outline.
- Insert-link flow with selected-text preservation.
- Optional monospace editing mode for Markdown power users.

Avoid introducing a proprietary block tree, drag handles everywhere, or complex nested object behavior. Those features would increase migration, recovery, accessibility, and export complexity while weakening the portability advantage of Markdown.

## 1.4 Improve Search Explainability

Search should help the user understand both **where** the match came from and **why** the result ranked.

Recommended changes:

- Filters for Original, AI digest, My notes, or any combination.
- A “My notes only” preset.
- Explicit match reasons: exact phrase, title, note text, related concept, or semantic similarity.
- Deep links to the matching note heading or paragraph.
- Multiple snippets when a long note has distinct relevant sections.
- Search-within-this-note from the item detail page.
- A visible indication when exact search is current but semantic indexing is pending.
- Query suggestions based on note headings, not raw note content in telemetry.

## 1.5 Add Source-Aware Ask Controls

The existing source-kind model creates a strong foundation for more transparent retrieval controls.

Recommended Ask modes:

- All library material.
- Original sources only.
- My notes only.
- Original plus My notes, excluding AI digests.
- Prefer My notes while retaining source evidence.
- Selected cards only.

Each answer should include:

- Source-kind labels on every citation.
- The note heading or section when available.
- A clear warning when a note is saved but its newest generation is not yet indexed.
- A retrieval summary such as “Used 2 note sections and 3 original-source sections.”
- A control to rerun the question with a different source policy.

## 1.6 Tighten Consent and Privacy Communication

The underlying consent mechanism is precise. The interface can make it easier to understand without weakening it.

Recommended updates:

- Show provider name, effective model, destination class, and purpose in one compact disclosure.
- Explain separately why semantic indexing and Ask may require different providers.
- Present consent next to the per-note AI switch, not only after a failed action.
- Show “Removing from AI…” until physical semantic cleanup completes.
- Provide a privacy dashboard with content-free counts: notes, AI-enabled notes, pending index jobs, pending purges, and approved providers.
- Add a one-click “Revoke and remove all manual-note AI data” operation with confirmation and progress.
- Offer encrypted note-only export as a later enhancement.

## 1.7 Improve Mobile Note Workflows

Mobile should optimize for quick capture and review rather than duplicate every desktop control.

Recommended mobile behaviors:

- Sticky formatting toolbar above the keyboard.
- Large Save and Preview targets without consuming excessive vertical space.
- Voice dictation entry point.
- Swipe or segmented navigation among Source, AI digest, My notes, and Related.
- Preserve cursor and scroll position across temporary app backgrounding.
- Quick actions for checklist item, highlight response, and append thought.
- Offline status that distinguishes “safe locally” from “synced.”
- Conflict review designed as stacked cards, not a narrow side-by-side diff.

## 1.8 Strengthen Operational Confidence

Recommended verification additions:

- Disconnect during autosave, manual Save, restore, clear, delete, and provider opt-in.
- Browser storage eviction and partial IndexedDB failure.
- Multi-tab edit versus delete and edit versus restore races.
- 100 KiB note performance on low-powered mobile hardware.
- Thousands-of-notes search and reindex benchmarks.
- Backup/restore drills that verify state, revisions, FTS, chunks, vectors, consent, tombstones, and mutation receipts together.
- Provider-model changes that invalidate consent and trigger safe reapproval/reindex behavior.
- Accessibility checks for keyboard-only formatting, conflict resolution, revision preview, live status announcements, and mobile focus management.

## 1.9 Add Local-First Product Metrics

Useful private or aggregated product signals:

- Notes created per active library user.
- Time from card capture to first manual note.
- Manual Save versus autosave frequency.
- Recovery draft usage and successful recovery rate.
- Conflict rate and resolution choice.
- Search-to-note-open rate.
- Ask questions using note context.
- AI opt-in, revocation, and purge completion rate.
- Version preview and restore use.

Raw note text, titles, search queries, and citation content should not be sent as general analytics.

---

# 2. Additional Features to Implement

## 2.1 Source-Linked Highlights and Annotations

This is the strongest next major feature.

A user selects text in the original article, transcript, PDF, or captured body and attaches one of the following:

- Comment.
- Question.
- Takeaway.
- Counterargument.
- Evidence label.
- Task.
- Link to another card.

Each annotation should retain:

- Stable source locator.
- Selected quote.
- Context before and after the quote.
- Source version or capture hash.
- User commentary.
- Creation and update time.
- Orphaned state if source reconstruction fails.

The My notes document could render an automatically maintained “Annotations” section or allow the user to insert annotation references into the canonical Markdown. The system must avoid duplicating annotations into text in a way that becomes impossible to reconcile.

## 2.2 Bidirectional Links and Backlinks

Introduce explicit user-authored relationships:

- Type `[[` to search and link another card.
- Autocomplete by title, author, topic, tag, and recent use.
- Show “Referenced by” on the destination card.
- Distinguish explicit user links from semantic suggestions.
- Allow typed relationships: supports, contradicts, expands, example of, inspired by, depends on.
- Let users accept, rename, or dismiss AI-suggested links.

Explicit links should remain first-class even if semantic models or embeddings change.

## 2.3 Explainable Knowledge Graph

A graph becomes useful only when every edge has a reason.

Possible edge explanations:

- Linked manually in My notes.
- Shares named concepts across note headings.
- Cites the same source or quote.
- One note marks the other as supporting evidence.
- The user labeled the cards as contradictory.
- Strong semantic similarity across user notes.

Recommended controls:

- Filter by edge type and source kind.
- Hide AI-only edges.
- Pin, rename, strengthen, or remove an edge.
- Inspect the exact passages behind an edge.
- Convert a suggested edge into an explicit user link.

Do not begin with a visually impressive but unexplained force-directed graph. Start with an explainable relationship list and neighborhood view.

## 2.4 Cross-Card Synthesis Workspace

Let the user select multiple cards and open a temporary synthesis workspace.

Capabilities:

- Compare sources.
- Identify agreement and contradiction.
- Build an outline.
- Drag selected excerpts into a synthesis note.
- Ask a question using only the selected cards.
- Generate a briefing with citations.
- Create a new synthesis card while preserving links back to every input.
- Preserve whether each section is user-written, quoted, or AI-suggested.

## 2.5 Review and Learning Engine

Manual notes are ideal input for active review because they represent the user’s interpretation rather than generic generated summaries.

Potential features:

- Daily “notes worth revisiting.”
- Spaced repetition for selected headings or takeaways.
- Generate flashcards from selected note text.
- Quiz using original source and My notes.
- “What changed in my thinking?” based on version history.
- Review unresolved questions and incomplete checklists.
- Confidence labels: unfamiliar, learning, understood, applied.

## 2.6 Note Templates

Templates can improve note quality without imposing a new data model.

Starter templates:

- Article or book review.
- Research paper.
- Meeting notes.
- Decision record.
- Project retrospective.
- Claim / evidence / counterargument.
- Learning summary.
- Person or company briefing.
- Experiment result.

Templates should insert ordinary Markdown and remain completely editable.

## 2.7 Action Items and Tasks

Markdown checklists can become a lightweight action layer:

- Aggregate open tasks from manual notes.
- Link each task back to its note line.
- Add due date, defer, complete, or convert-to-project controls without polluting the Markdown syntax excessively.
- Filter tasks by card, collection, topic, or review status.
- Keep the note readable when exported to plain Markdown.

## 2.8 AI Assistance That Does Not Take Over

Useful AI actions:

- Suggest headings.
- Restructure selected text.
- Summarize only the selected section.
- Extract action items.
- Identify unsupported claims.
- Compare the note with the original source and flag possible misunderstanding.
- Suggest questions the note has not answered.
- Suggest related cards with an explanation.
- Improve clarity while preserving the user’s voice.

All actions should produce a visible proposal with Accept, Reject, or Insert below. The system should never silently rewrite the canonical note.

## 2.9 Capture and Portability Extensions

- Voice dictation directly into My notes.
- Browser extension action: append selected page text to an existing card’s note.
- Android share action: append text to a chosen existing card.
- OCR selected text from an image or screenshot.
- Import or export a Markdown folder.
- Optional Obsidian-compatible wikilinks and frontmatter.
- Stable note URLs for personal cross-referencing.
- Bulk export that requires a separate, explicit inclusion decision for private notes.

## 2.10 Smart Collections Based on Notes

Examples:

- Notes containing open questions.
- Notes with incomplete tasks.
- Recently changed thinking.
- AI-enabled versus private-only notes.
- Notes mentioning a project, person, or concept.
- Cards with manual notes but no recent review.

Users should be able to inspect and edit the rule behind every smart collection.

---

# 3. Annotation Tool Updates

This section assumes “annotation tool” refers to the visual annotation and feedback tool used to point at a UI and request changes.

## 3.1 Use Semantic Anchors Instead of Pixel Coordinates

An annotation should attach to the intended interface object, not only to an x/y position.

Possible anchor types:

- DOM element or accessibility node.
- Component identity when discoverable.
- Selected text range.
- Form field and label pair.
- Region plus surrounding landmarks.
- Route, viewport, theme, and UI state.

Fallback behavior:

- If the exact anchor disappears, show the nearest likely target.
- Mark uncertain remapping rather than silently attaching to the wrong element.
- Preserve the original screenshot and crop as historical evidence.

## 3.2 Capture Complete Context Automatically

Each annotation should record:

- Route or screen.
- Viewport and device class.
- Browser surface.
- Theme.
- Screenshot and focused crop.
- Selected element text.
- Accessibility role and name.
- Relevant computed styles.
- Scroll position.
- Open menus, dialogs, loading states, and validation state.
- Preceding interaction steps when relevant.
- Candidate component and source file when discoverable.

This context would sharply reduce ambiguous “move this” or “make this better” requests.

## 3.3 Add Annotation Intent and Scope

Recommended intent labels:

- Visual polish.
- Copy change.
- Behavior bug.
- Accessibility.
- Responsive layout.
- Data or state issue.
- Question.
- New feature.

Recommended scope controls:

- This element only.
- Every instance of this component.
- Current breakpoint only.
- All breakpoints.
- Current state only.
- All equivalent states.

Also include priority and confidence so the agent can distinguish a precise request from exploratory feedback.

## 3.4 Attach Acceptance Criteria

An annotation becomes much more actionable when it says what “done” means.

Examples:

- Use this copy exactly.
- Align the button edge with the input edge.
- Do not change the desktop layout.
- Must remain usable at 320 px.
- Focus returns to the trigger after closing.
- Contrast passes WCAG AA.
- The loading state appears within 100 ms of submission.
- Keep the original asset and crop behavior.

Acceptance criteria should support plain language plus structured fields where measurable.

## 3.5 Preview the Interpretation Before Applying

Recommended workflow:

1. User creates an annotation.
2. Agent summarizes its interpretation.
3. Tool identifies affected components and likely files.
4. Tool shows a proposed visual or behavioral preview.
5. User accepts, revises, or rejects the interpretation.
6. Agent implements the change.
7. Tool displays before/after evidence at the same viewport and state.
8. Acceptance criteria run automatically where possible.

Small, unambiguous changes could support an “Apply directly” preference. Broad or destructive changes should always preview first.

## 3.6 Make Annotations Durable Work Items

Recommended lifecycle:

- Open.
- Clarification needed.
- Ready.
- In progress.
- Applied.
- Verified.
- Rejected.
- Reopened.

Supporting capabilities:

- Comment threads.
- Assign or mention a collaborator/agent.
- Batch related annotations.
- Detect duplicates and contradictory requests.
- Link annotation to commit, PR, or deployment.
- Preserve original and final screenshots.
- Reopen automatically if verification fails.
- Export to GitHub, Jira, or another backlog.

## 3.7 Support Interaction and Time-Based Annotation

Many important problems cannot be captured in one still image.

The tool should support:

- Hover and focus states.
- Drag-and-drop.
- Menus and dialogs.
- Loading transitions.
- Keyboard navigation.
- Mobile software-keyboard behavior.
- Animation timing.
- Multi-step task flows.
- A short screen recording with timestamped annotations.

The annotation should preserve the action sequence required to reproduce the state.

## 3.8 Responsive Annotation Sets

One annotation could target a family of viewports:

- Current viewport only.
- Mobile range.
- Tablet range.
- Desktop range.
- All supported widths.

The tool should display the same target at representative widths and let the user specify whether the intended change is shared or breakpoint-specific.

## 3.9 Annotation-to-Test Generation

This is the most valuable long-term direction.

Examples:

- Responsive annotation → viewport regression test.
- Accessibility annotation → focus order, role, label, or contrast assertion.
- Behavior annotation → interaction test.
- Copy annotation → exact text assertion.
- Visual annotation → before/after screenshot checkpoint.
- Loading-state annotation → timing and state-transition assertion.

The annotation becomes durable product intent instead of disappearing after the implementation.

## 3.10 Privacy and Sharing Controls

- Automatically detect and redact secrets, private names, account data, and sensitive content before sharing.
- Let the user crop or mask the screenshot.
- Distinguish private annotations from team-visible annotations.
- Show what DOM text and metadata will be sent to an agent.
- Keep a local-only mode for sensitive applications.
- Record the redaction policy used when exporting an annotation to GitHub or Jira.

---

# 4. Prioritized Opportunity Map

| Opportunity | User impact | Effort | Risk | Recommended horizon |
|---|---:|---:|---:|---|
| Unified save/sync/index trust bar | High | Low–Medium | Low | Now |
| Version diff and preview | High | Medium | Low | Now |
| Ask source filters and My notes only | High | Medium | Low | Now |
| Mobile sticky toolbar and recovery clarity | Medium–High | Medium | Low | Now |
| Source-linked highlights and annotations | Very high | High | Medium | Next major feature |
| Wikilinks and backlinks | High | Medium | Medium | Next |
| Note templates | Medium | Low | Low | Next |
| Smart review queue | High | Medium | Medium | Next |
| Explainable relationship view | High | High | Medium | Later |
| Cross-card synthesis workspace | Very high | High | Medium–High | Later |
| Spaced repetition and learning engine | Medium–High | High | Medium | Later |
| Semantic annotation anchors | Very high | High | Medium | Annotation tool: Now |
| Annotation acceptance criteria | High | Medium | Low | Annotation tool: Now |
| Before/after verification | Very high | High | Medium | Annotation tool: Next |
| Annotation-to-test generation | Very high | Very high | High | Annotation tool: Later |

## Recommended “Now” Package

1. Unified note trust/status bar.
2. Version diff, preview, and copy-from-history.
3. Ask source filters including My notes only.
4. Sticky mobile editor controls and clearer recovery state.
5. Annotation semantic anchors and explicit scope.
6. Annotation acceptance criteria and before/after evidence contract.

## Recommended “Next” Package

1. Source-linked highlights and annotations.
2. `[[wikilinks]]`, backlinks, and typed relationships.
3. Note templates and task aggregation.
4. Smart review queue.
5. Responsive and interaction annotations.
6. Annotation batching, lifecycle, and PR linkage.

## Recommended “Later” Package

1. Explainable graph neighborhood.
2. Cross-card synthesis workspace.
3. Learning and spaced-review engine.
4. Encrypted note storage/export investigation.
5. Annotation-to-test generation.

---

# 5. Suggested Experiments

## Experiment A: Trust-Bar Comprehension

Prototype three status presentations and test whether users can answer:

- Is my newest text safe?
- Is it on the server?
- Can Ask use it?
- Has remote-provider permission been granted?
- What should I do if indexing failed?

Success criterion: at least 90% correct interpretation without opening help text.

## Experiment B: Source-Linked Annotation Flow

Prototype highlight → annotate → view in My notes → revisit source. Test article, transcript, and PDF variants.

Success criteria:

- Annotation created in under 15 seconds.
- User can return to the source passage.
- Orphaned-source behavior is understandable.
- User understands whether annotation text is part of the canonical note.

## Experiment C: Ask Source Policy

Test whether users understand the difference between:

- All sources.
- My notes only.
- Original only.
- Prefer My notes.

Success criterion: users can predict which sources will be included before submitting the question.

## Experiment D: Annotation Acceptance Criteria

Give users the same visual problem with and without structured acceptance criteria.

Measure:

- Clarification turns.
- Implementation rework.
- Time to verified completion.
- Percentage of changes that unintentionally affect other breakpoints.

---

# 6. Ideas to Avoid or Defer

- **Full Notion-style block editor:** high complexity, weakens Markdown portability, and expands recovery/migration risk.
- **Multiple independent notes per card immediately:** creates navigation, search, consent, and graph ambiguity before the single-note model is exhausted.
- **Automatic AI rewriting:** damages authorship and trust unless every change is a proposal.
- **Graph-first redesign:** a graph without edge explanations becomes decorative rather than useful.
- **Automatic remote processing of every note:** violates the explicit consent boundary.
- **Real-time collaboration:** inconsistent with the current personal, single-owner product model and introduces a much harder concurrency problem.
- **Pixel-only annotation anchors:** brittle across layout, responsive, and copy changes.
- **Applying broad annotations without preview:** increases unintended design drift.

---

# 7. Decision Prompts for the Next Planning Session

1. Is the next release primarily about **trust and polish**, **reading-linked annotation**, or **knowledge connections**?
2. Should source-linked annotations become part of canonical Markdown, a separate structured layer, or a hybrid reference model?
3. Should “My notes only” Ask be a global mode, an item-level action, or both?
4. Which explicit relationship types should ship before an interactive graph?
5. Are checklist tasks personal reminders only, or should they integrate with an external task system?
6. What is the minimum context an annotation must capture before an agent can act without clarification?
7. Which annotation acceptance checks can be generated reliably today?
8. Should annotation changes default to a preview or permit direct application for low-risk edits?

## Final Recommendation

Do not make the editor itself the center of the next roadmap. Make the **thinking loop** the center:

> Read → highlight → interpret → connect → ask → revisit → refine.

For the annotation tool, use the parallel loop:

> Observe → anchor → specify intent → preview → apply → verify → preserve as a test.

Those two loops reinforce the same product value: turning informal human intent into durable, trustworthy, and explainable knowledge.
