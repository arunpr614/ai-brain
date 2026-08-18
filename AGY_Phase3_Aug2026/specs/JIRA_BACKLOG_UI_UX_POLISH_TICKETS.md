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

---

## 📋 Executive Summary & Problem Statement

During live production usage of the **Phase 3 Reading Studio & Companion Workbench** on `https://brain.arunp.in`, 4 major UI/UX defects were identified:

1. **Hero Workspace Banner 3-Column Width Collision & Vertical Text Squeeze (`media_1787057452904.png`):**  
   Inside the article column (`max-w-[68ch]` ~650px), `HeroWorkspaceBanner` forces a 3-way horizontal flex layout (`[Thumbnail (176px)]` + `[Title Text (?px)]` + `[CTA Rail (240px)]`). This leaves only ~150px for the title, squeezing long video titles into a comical 10-line vertical ribbon (1-2 words per line). Furthermore, the banner redundantly duplicates the full `<h1>` title already displayed right above it.
2. **Unreadable Recall Banner in Light Theme (Low Contrast — `media_1787057311981.png`):**  
   In `src/components/reading-studio/multi-layer-companion-tabs.tsx`, the **Imported Recall.it Memory** banner and tag pills utilize hardcoded dark-mode tokens (`bg-purple-950/20 text-purple-300 border-purple-500/30`), producing pale lavender text on a light background (< 2.1:1 contrast ratio).
3. **Muddy Header Icon Container & Spacing (`media_1787057318143.png`):**  
   In `src/components/reading-studio/reading-studio-app.tsx`, the `<BookOpen>` header icon container uses `bg-emerald-950/40 text-emerald-400 border-emerald-800/40`, rendering as a dirty dark-green square in light mode with cramped spacing next to the title.
4. **Unreadable Focus Mode Buttons & Redundant Toggles (`media_1787057436924.png`):**  
   Active Focus Mode buttons apply `bg-indigo-950/40 text-indigo-300 border-indigo-800/60` (< 1.9:1 contrast in light mode), and two redundant focus mode buttons are rendered simultaneously within 40px of vertical space.

---

## 📊 Epic Execution Matrix (Milestone 3.1)

| Ticket Key | Summary / Title | Component | Type | Story Points | Priority | Primary Target Files |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`TICKET-UX-05`** | **BUG(ux-layout): Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision in Article View** | Hero Workspace Banner | Bug / UX | 3 SP | **`P1 (Blocker)`** | `src/components/reading-studio/hero-workspace-banner.tsx`, `src/app/items/[id]/page.tsx` |
| **`TICKET-UX-01`** | **BUG(ux-contrast): Fix Light Mode Contrast & Theme Variables in Companion Tabs (Recall Banner & Tags)** | Companion Workbench | Bug | 3 SP | **`P1 (High)`** | `src/components/reading-studio/multi-layer-companion-tabs.tsx` |
| **`TICKET-UX-02`** | **BUG(ux-theme): Fix Reading Studio Header Icon Badges, Spacing & Title Alignment** | Reading Studio Header | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/reading-studio-app.tsx`, `src/components/reading-studio/hero-workspace-banner.tsx` |
| **`TICKET-UX-04`** | **BUG(ux-contrast): Fix Focus Mode Active Contrast & Redundant Toggle Button Styling in Reading Studio** | Reading Studio Layout | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/split-pane-container.tsx`, `src/components/reading-studio/reading-studio-app.tsx` |
| **`TICKET-UX-03`** | **FEAT(ux-theme): Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit for Phase 3 Suite** | Design System | Task | 3 SP | **`P2 (Medium)`** | `src/components/reading-studio/*`, `src/components/repair/*`, `src/app/globals.css` |

**Total Milestone Effort:** 13 Story Points (~1 sprint).

---

## 🎟️ Ticket 5: `TICKET-UX-05` — Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision

### 📌 Summary
Refactor the internal layout of `HeroWorkspaceBanner` from a cramped 3-column horizontal squeeze into a clean 2-tier card layout (Media + Metadata Row on top, Action Bar on bottom) and eliminate redundant duplicate article title text.

---

### 🔍 Deep Root Cause Analysis (`media_1787057452904.png`)

```tsx
// DEFECTIVE LAYOUT (src/components/reading-studio/hero-workspace-banner.tsx:109)
<div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
  {/* Column 1: Thumbnail Poster (176px wide) */}
  <div className="flex items-start gap-4">
    <div className="relative flex h-24 w-36 sm:h-28 sm:w-44 shrink-0 ...">...</div>

    {/* Column 2: Title & Badges (trapped in the middle) */}
    <div className="min-w-0 flex-1 space-y-2">
      <h2>{item.title}</h2> {/* <-- Squeezed into ~150px remaining space! */}
    </div>
  </div>

  {/* Column 3: Action Rail (240px wide) */}
  <div className="flex flex-col items-end gap-3 shrink-0">
    <Link className="px-6 ...">Launch Reading Studio</Link>
  </div>
</div>
```

**Why it broke:**
1. The parent container (`article` in `src/app/items/[id]/page.tsx`) has `lg:grid-cols-[minmax(0,68ch)_360px]`, giving the article ~650px total width.
2. Inside 650px: Thumbnail (176px) + Action Button (240px) + Paddings/Gaps (84px) = **500px**.
3. The remaining middle column receives only **~150px** of width, causing the title to wrap after every 1-2 words into a 10-line vertical ribbon.
4. The item title is already rendered prominently in `<h1>` 40px above this card, making this repetition redundant and visually cluttered.

---

### 🎨 What is the "Right UX"?

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎬 HERO WORKSPACE BANNER (Correct 2-Tier Architecture)                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   [ 🔴 YouTube ]  [ ✅ High Fidelity • 18:42 ]  [ 124 timed segments ]    │
│  │   16:9       │                                                                           │
│  │   Thumbnail  │   Reading Studio & Synchronized Media Player                              │
│  │   Poster     │   Interactive timeline with word-level seek, speed controls, and smart   │
│  │   [ 18:42 ]  │   companion notes.                                                        │
│  └──────────────┘                                                                           │
│  ─────────────────────────────────────────────────────────────────────────────────────────  │
│  [ 🎬 Launch Reading Studio  ⌘↵  → ]       [ 🔍 Inspect Segments ]     [ ⌥F Focus ]  [ 📋 ] │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key UX Principles:
1. **No Redundant Full-Title Repetition:** Instead of repeating the entire 80-character article headline, display the purposeful workspace identity: `"Reading Studio & Synchronized Media Player"` with a concise 1-line value proposition.
2. **2-Tier Hierarchy (Content Top, Actions Bottom):**
   - **Top Tier:** 16:9 Thumbnail Poster on the left + Badge Cluster (Platform, Quality, Duration, Segment Count) and workspace overview on the right.
   - **Bottom Tier (Action Dock):** A full-width horizontal action dock spanning the card bottom.
     - Primary button: `[ 🎬 Launch Reading Studio ⌘↵ → ]` (prominent, high contrast)
     - Secondary actions: `[ 🔍 Inspect Segments ]`, `[ ⌥F Focus Mode ]`, `[ 📋 Copy Link ]`
3. **Responsive Graceful Flow:** On narrow screens / mobile, the thumbnail poster spans full width, followed by the badge stack and action buttons.

---

### 🎯 Acceptance Criteria
1. **Layout Structure:**
   - Top section is a 2-column flex (`[Thumbnail (140px)]` + `[Badge Stack & Workspace Summary (flex-1)]`).
   - Bottom section is a separated border-top action dock with flex-wrap alignment (`justify-between` or `gap-3`).
2. **Typography & Content:**
   - Replaces repeated `item.title` with concise banner heading: `"Reading Studio & Synchronized Media"` (or truncated subtitle if specific to the item).
   - Summary text has `line-clamp-2 text-xs text-[var(--text-secondary)]`.
3. **Responsiveness:**
   - No horizontal squeeze or text wrapping below 320px container width.
4. **Theme Adaptation:**
   - Card border uses `border-[var(--border)] bg-[var(--surface-raised)]` (or `border-rose-500/30` for degraded items).
   - High contrast in both light and dark modes.

---

## 🎟️ Ticket 4: `TICKET-UX-04` — Fix Focus Mode Active Contrast & Redundant Toggle Button Styling

### 📌 Summary
Eliminate low-contrast styling on active Focus Mode buttons in light mode and streamline the duplicate Focus Mode toggles rendered across the top header bar and the split-ratio toolbar.

### 🔍 Root Cause Analysis (`media_1787057436924.png`)
- `bg-indigo-950/40 text-indigo-300 border-indigo-800/60` yields < 1.9:1 contrast in light mode.
- Duplicate buttons (`[ Exit Focus ]` in header and `[ Focus Mode (⌥F) ]` in split toolbar) create UX confusion.

### 🎯 Acceptance Criteria
1. **Adaptive High-Contrast Active State:**
   - **Light Mode:** `bg-indigo-50 text-indigo-950 border-indigo-300 font-semibold shadow-xs`
   - **Dark Mode:** `dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-700/60`
2. **Synchronized State Labels:**
   - When active (`isFocusMode = true`): Displays `<Minimize2 />` + `"Exit Focus (⌥F)"`.
   - When inactive (`isFocusMode = false`): Displays `<Maximize2 />` + `"Focus Mode (⌥F)"`.

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
    ├── TICKET-UX-01: Recall Memory Banner Contrast & Tags (3 SP)
    ├── TICKET-UX-02: Reading Studio Header Badge & Title Polish (2 SP)
    ├── TICKET-UX-04: Focus Mode Active Contrast & Button Streamlining (2 SP)
    └── TICKET-UX-03: Phase 3 Semantic Theme Variable Audit (3 SP)
```
