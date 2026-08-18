# 🏛️ AI Brain — Jira & GitHub Execution Backlog: UI/UX Quality & Light Mode Theme Polish

**Phase:** Phase 3 (Reading Studio & Triage)  
**Milestone:** Milestone 3.1 (`v0.9.x - UI/UX Polish, Contrast & Theme Hygiene`)  
**Epic Key:** `EPIC-UX-POLISH-01`  
**Epic Title:** `Phase 3 Reading Studio & Companion UI/UX Refinements, Theme Semantics & Contrast Hygiene`  
**Author:** Lead UI/UX Engineer & Scrum Master (Product Council)  
**Date:** August 18, 2026  
**Status:** Approved & Ready for Sprint Backlog  
**Target Branch:** `feat/phase3-ui-ux-polish` → `main`  
**User Evidence:**
- [`media_1787057311981.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057311981.png) *(Low-contrast Recall memory banner)*
- [`media_1787057318143.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057318143.png) *(Muddy header icon & spacing)*
- [`media_1787057436924.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057436924.png) *(Low-contrast Focus Mode pill & duplicate buttons)*
- [`media_1787057452904.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057452904.png) *(Squashed 150px title text column in Hero Workspace Banner)*
- [`media_1787057518601.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057518601.png) *(Mismatched Processing card action buttons, Studio button styling & muddy ASR/Recall badges)*

---

## 📋 Executive Summary & Problem Statement

During live production usage of the **Phase 3 Reading Studio & Companion Workbench** on `https://brain.arunp.in`, 5 major UI/UX defects were identified:

1. **Hero Workspace Banner 3-Column Collision (`media_1787057452904.png`):**  
   Inside the article column, `HeroWorkspaceBanner` squeezes the title into a 150px vertical ribbon, and redundantly duplicates the full `<h1>` headline.
2. **Processing Card Action Buttons & Muddy Badges (`media_1787057518601.png`):**  
   On `/processing`, `[ Studio ↗ ]` uses a washed-out green rectangle (`border-emerald-500/40 bg-emerald-950/20 text-emerald-400`) that clashes with `[ Open ↗ ]` and `[ Inbox ⌵ ]`. The `⚡ ASR` and `📥 Recall` pills use hardcoded dark-mode tokens that render as muddy, illegible blocks in light theme.
3. **Unreadable Focus Mode Buttons & Redundant Toggles (`media_1787057436924.png`):**  
   Active Focus Mode buttons apply `bg-indigo-950/40 text-indigo-300` (< 1.9:1 contrast in light mode), and two separate buttons are rendered within 40px of vertical space.
4. **Unreadable Recall Banner in Light Theme (`media_1787057311981.png`):**  
   `MultiLayerCompanionTabs` uses `text-purple-300` on a light purple surface (< 2.1:1 contrast ratio).
5. **Muddy Header Icon Container & Spacing (`media_1787057318143.png`):**  
   `<BookOpen>` header icon container uses `bg-emerald-950/40 text-emerald-400` with cramped spacing next to the title.

---

## 📊 Epic Execution Matrix (Milestone 3.1)

| Ticket Key | Summary / Title | Component | Type | Story Points | Priority | Primary Target Files |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`TICKET-UX-05`** | **BUG(ux-layout): Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision in Article View** | Hero Workspace Banner | Bug / UX | 3 SP | **`P1 (Blocker)`** | `src/components/reading-studio/hero-workspace-banner.tsx`, `src/app/items/[id]/page.tsx` |
| **`TICKET-UX-06`** | **BUG(ux-theme): Fix Processing Card Action Buttons & Badges (Studio Button, ASR & Recall Pills)** | Processing Triage Cards | Bug / UX | 2 SP | **`P1 (High)`** | `src/components/processing/item-card.tsx`, `src/components/processing/workflow-controls.tsx` |
| **`TICKET-UX-04`** | **BUG(ux-contrast): Fix Focus Mode Active Contrast & Redundant Toggle Button Styling in Reading Studio** | Reading Studio Layout | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/split-pane-container.tsx`, `src/components/reading-studio/reading-studio-app.tsx` |
| **`TICKET-UX-01`** | **BUG(ux-contrast): Fix Light Mode Contrast & Theme Variables in Companion Tabs (Recall Banner & Tags)** | Companion Workbench | Bug | 3 SP | **`P1 (High)`** | `src/components/reading-studio/multi-layer-companion-tabs.tsx` |
| **`TICKET-UX-02`** | **BUG(ux-theme): Fix Reading Studio Header Icon Badges, Spacing & Title Alignment** | Reading Studio Header | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/reading-studio-app.tsx`, `src/components/reading-studio/hero-workspace-banner.tsx` |
| **`TICKET-UX-03`** | **FEAT(ux-theme): Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit for Phase 3 Suite** | Design System | Task | 3 SP | **`P2 (Medium)`** | `src/components/reading-studio/*`, `src/components/repair/*`, `src/app/globals.css` |

**Total Milestone Effort:** 15 Story Points (~1 sprint).

---

## 🎟️ Ticket 6: `TICKET-UX-06` — Fix Processing Card Action Buttons & Badges (Studio Button, ASR & Recall Pills)

### 📌 Summary
Refactor the action button bar on `/processing` item cards to unify button heights, paddings, and visual hierarchy, and replace hardcoded dark-mode tokens in `Studio ↗`, `⚡ ASR`, and `📥 Recall` with theme-adaptive semantic styles.

---

### 🔍 Root Cause Analysis (`media_1787057518601.png`)

```tsx
// CURRENT DEFECTIVE CODE (src/components/processing/item-card.tsx:64 & 108):
{/* Badges with hardcoded dark-mode palette */}
{item.sourceType === "youtube" && (
  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
    ⚡ ASR
  </span>
)}
{item.captureChannel === "recall" && (
  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-950/40 text-purple-300 border border-purple-800/40">
    📥 Recall
  </span>
)}

{/* Action button bar with mismatched styling */}
<div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
  <Link
    href={`/library/${encodeURIComponent(item.id)}/read`}
    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-950/20 px-3 text-xs font-medium text-emerald-400 hover:bg-emerald-950/40 md:min-h-9 transition-colors"
  >
    Studio
    <ArrowUpRight className="h-3.5 w-3.5" />
  </Link>
  <Link
    href={href}
    className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] md:min-h-9"
  >
    Open
    <ArrowUpRight className="h-3.5 w-3.5" />
  </Link>
  <WorkflowControls item={item} compact onResult={onResult} onError={onError} />
</div>
```

**Why it broke:**
1. `[ Studio ↗ ]` applies `bg-emerald-950/20 text-emerald-400 border-emerald-500/40`, which renders in light mode as a washed-out murky green rectangle that looks disjointed next to `[ Open ↗ ]`.
2. `⚡ ASR` and `📥 Recall` use `bg-*-950/40 text-*-300`, rendering as dark dirty boxes with pastel text that fail WCAG AA contrast.
3. The button bar lacks unified button tokens (`h-8`, `rounded-lg`, consistent typography, and border weights).

---

### 🎨 What is the "Right UX"?

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📄 No.1 Performance Psychologist: The Secret to High Performance                            │
│ 📹 YouTube • Captured 7/12/2026 • [ ⚡ ASR ] [ 📥 Recall ]                         [ ● Inbox ]│
│                                                                                             │
│ ─────────────────────────────────────────────────────────────────────────────────────────── │
│ [ 🎬 Studio ↗ ]   [ 📄 Details ↗ ]   [ 📥 Move to Review ⌵ ]                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Design Tokens:
1. **`Studio ↗` Button:**
   - **Light Mode:** `bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-300 font-medium shadow-2xs`
   - **Dark Mode:** `dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50`
2. **`Open ↗` (Details) Button:**
   - Standard neutral secondary action: `bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] shadow-2xs`
3. **Badge Tokens:**
   - `⚡ ASR`: Light `bg-emerald-50 text-emerald-800 border-emerald-200` | Dark `dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60`
   - `📥 Recall`: Light `bg-purple-50 text-purple-800 border-purple-200` | Dark `dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60`
4. **Button Bar Geometry:**
   - Consistent `h-8 px-3 rounded-lg text-xs gap-1.5` across all 3 controls.

---

### 🎯 Acceptance Criteria
1. **Contrast & Legibility:**
   - All badges and buttons exceed 4.5:1 contrast ratio in both light and dark modes.
2. **Button Height & Alignment:**
   - `Studio ↗`, `Open ↗`, and `WorkflowControls` select dropdown match exact height (`h-8`) and border radius (`rounded-lg`).
3. **Hover & Focus States:**
   - Smooth hover transitions (`transition-colors duration-150`) and clear focus rings (`focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`).

---

## 🎟️ Ticket 5: `TICKET-UX-05` — Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision

### 📌 Summary
Refactor `HeroWorkspaceBanner` into a clean 2-tier card layout (Media + Metadata Row on top, Action Bar on bottom) and eliminate redundant duplicate article title text.

---

## 🎟️ Ticket 4: `TICKET-UX-04` — Fix Focus Mode Active Contrast & Redundant Toggle Button Styling

### 📌 Summary
Eliminate low-contrast styling on active Focus Mode buttons in light mode and streamline the duplicate Focus Mode toggles.

---

## 🎟️ Ticket 1: `TICKET-UX-01` — Fix Light Mode Contrast & Theme Variables in Companion Tabs

### 📌 Summary
Replace hardcoded dark-mode purple tokens in `MultiLayerCompanionTabs` with adaptive theme tokens so Recall memory headers, tags, and icons maintain WCAG AA contrast (≥ 4.5:1) in light mode.

---

## 🎟️ Ticket 2: `TICKET-UX-02` — Fix Reading Studio Header Icon Badges, Spacing & Title Alignment

### 📌 Summary
Redesign the Reading Studio top header bar icon badge container and title layout to be theme-adaptive, visually balanced, and properly spaced in both light and dark modes.

---

## 🎟️ Ticket 3: `TICKET-UX-03` — Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit

### 📌 Summary
Conduct a systemic review and refactor across all Phase 3 UI components to purge hardcoded dark-mode colors and enforce full light/dark theme semantic variable compliance.

---

## 📅 Roadmap & Milestones

```
Phase 3 Milestones:
├── Milestone 3.0: Reading Studio Core & Kanban Triage (Released - v0.9.0) ✅
└── Milestone 3.1: UI/UX Quality, Contrast & Light-Mode Polish (Target - v0.9.1) 🚀
    ├── TICKET-UX-05: Hero Workspace Banner 2-Tier Layout & Collision Fix (3 SP) [Blocker]
    ├── TICKET-UX-06: Processing Item Card Action Buttons & Badge Polish (2 SP)
    ├── TICKET-UX-04: Focus Mode Active Contrast & Button Streamlining (2 SP)
    ├── TICKET-UX-01: Recall Memory Banner Contrast & Tags (3 SP)
    ├── TICKET-UX-02: Reading Studio Header Badge & Title Polish (2 SP)
    └── TICKET-UX-03: Phase 3 Semantic Theme Variable Audit (3 SP)
```
