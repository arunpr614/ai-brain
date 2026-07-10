# Adversarial Review - Web Shell And Navigation PRD V1

**Created:** 2026-06-15 22:18:00 IST
**Reviewer:** Main Codex using adversarial-review skill
**Subject:** `FEATURE_WEB_SHELL_NAVIGATION_PRD_V1_2026-06-15_22-16-00_IST.md`
**Verdict:** No-go for implementation until V2 resolves the navigation contract ambiguities.

## Executive Summary

The PRD is directionally sound and correctly limits scope to shell/navigation, but it leaves three implementation-defining decisions open: Capture placement, Pair Device active-state ownership, and `/items/[id]/ask` active-state ownership. Those are not harmless questions. If implementation starts from this V1, the shell could ship with duplicate Capture affordances, inconsistent utility highlighting, or a route-active contract that future Ask/Item work must undo.

No evidence suggests the feature is unsafe in concept. The blocker is specification ambiguity.

## Findings

### P1 - Capture Placement Is Still Ambiguous

**Evidence:** V1 says Capture should "becomes or remains a prominent action above primary route navigation" in SH-003, while also saying a regular Capture nav row may be retained if justified. The open question asks whether desktop Capture should be removed from primary nav or remain in both places.

**Why this matters:** Magic Patterns desktop uses Capture as a top action, while current production has Capture inside primary nav. Leaving both options open permits an implementation that either duplicates Capture or preserves the current hierarchy without proving it matches the approved design.

**Required revision:** V2 must choose one contract. Recommended: desktop Capture is a prominent top action, not a regular primary nav row; it receives active styling on `/capture`. Mobile keeps Capture in bottom nav.

### P1 - Pair Device Active State Is Underspecified

**Evidence:** V1 says `/settings/device-pairing` may show Pair Device active and "Settings context may also be visually related if implementation supports only one active state." The open question asks whether Pair Device, Settings, or both should be active.

**Why this matters:** The current desktop active helper marks all `/settings/*` routes as Settings active, which can conflict with a lower utility Pair Device row. A shell slice must decide this before code, otherwise screenshots can pass with inconsistent state.

**Required revision:** V2 must define a single testable rule. Recommended: Pair Device utility is active on `/settings/device-pairing`; Settings primary remains active only for `/settings`, `/settings/tags`, and `/settings/collections`.

### P1 - Item Ask Active State Conflicts With Current Helper

**Evidence:** V1 requires `/items/[id]/ask` to be Library active, but the current helper marks any pathname ending in `/ask` as Ask active.

**Why this matters:** This is a direct conflict between desired route context and existing code. If not resolved in V2, implementation could accidentally preserve Ask active and still claim acceptance because the PRD's open question leaves room to reinterpret.

**Required revision:** V2 must choose the active state. Recommended: `/items/[id]/ask` is Ask active if it is a full Ask experience, or Library active if it is detail-context content. The route map must match the current product intent and QA table exactly.

### P2 - QA Matrix Does Not Name All Required Representative Routes

**Evidence:** V1 says screenshots are needed for Library, Capture, Settings, and Pair Device desktop states, and mobile Library/Capture/Ask/More/Settings-context states. It does not explicitly include topic, collection, search, item detail, and item Ask active-state checks, although those routes are listed in the active-state table.

**Why this matters:** Active-state regressions often hide in context routes rather than primary nav routes.

**Required revision:** Add a route-active QA table with exact representative URLs, including at least `/topics/<fixture>`, `/collections/<fixture>`, `/search`, `/items/<fixture>`, and `/items/<fixture>/ask`. If fixture routes are unavailable in the shell slice, mark them as blocked or use not-found-safe route checks only where active state still renders.

### P2 - Keyboard Acceptance Is Too Broad To Execute

**Evidence:** V1 says tab sequence reaches collapse/search/nav/Capture/Pair Device/privacy disabled row without traps, but does not state expected disabled-row behavior beyond "does not navigate."

**Why this matters:** Disabled links implemented as anchors with `href="#"` can still receive focus or move the browser if not prevented. The current privacy row is anchor-like in the sidebar code.

**Required revision:** V2 must require the disabled privacy row to be either a non-link element or an `aria-disabled` link with prevented click and no hash navigation. The QA table must check URL stability after activation attempt.

## Positive Findings

- The PRD correctly avoids copying Magic Patterns mobile phone chrome.
- It preserves real production routes and rejects prototype `/pair`, `/login`, `/item/:id`, `/topic/:slug`, and `/collection/:slug`.
- It explicitly protects against fake privacy/offline/device claims.
- It correctly treats contrast QA as a prerequisite already completed.

## Required V2 Changes

1. Choose a single desktop Capture placement contract.
2. Choose a single Pair Device vs Settings active-state contract.
3. Choose a single `/items/[id]/ask` active-state contract.
4. Expand the route-active QA matrix to include context routes.
5. Make disabled Privacy Controls keyboard/click behavior measurable.

## Go/No-Go

No-go for implementation from V1. A revised PRD can proceed if it resolves the P1 findings and carries the P2 QA clarifications forward.
