# UX FCP-001 Capture Quality And Repair Center v1

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Historical draft - do not implement.
Runtime verification: Not provided.
Superseded by: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2).
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Historical draft - do not implement.** Use the current successor: [Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2).

Status: v1 draft

## Flow

Capture result -> item saved/updated/duplicate/weak/failed -> clear next action -> repair -> source revalidated -> Ask/search eligible.

## Key Screens

- Capture result panel on web.
- Android share result sheet.
- Extension notification/options result.
- Review Repair Center.
- Item detail Source Health panel.

## States

- Full text saved.
- Saved with warning.
- Metadata only.
- Duplicate found.
- Updated existing.
- Needs transcript/text.
- Retryable extraction failure.
- Repair running.
- Repair complete.
- Repair failed.

## Interaction Notes

Primary action should be one of: Open item, Repair, Retry, Paste text, Ignore, Delete. Weak states should never use celebratory copy.

## Accessibility Notes

Status badges need text labels, not color-only signals. Repair actions must be keyboard reachable and screen-reader named.

## Mobile Notes

Android result state should be a responsive page/sheet after share handoff, not a blocking alert. Offline fallback should say queued only if queue exists.
