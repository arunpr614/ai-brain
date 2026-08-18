# 🏛️ AI Brain — Jira & GitHub Execution Backlog: UI/UX Quality & Light Mode Theme Polish

**Phase:** Phase 3 (Reading Studio & Triage)  
**Milestone:** Milestone 3.1 (`v0.9.x - UI/UX Polish, Contrast & Theme Hygiene`)  
**Epic Key:** `EPIC-UX-POLISH-01`  
**Epic Title:** `Phase 3 Reading Studio & Companion UI/UX Refinements, Theme Semantics & Contrast Hygiene`  
**Author:** Lead UI/UX Engineer & Scrum Master (Product Council)  
**Date:** August 18, 2026  
**Status:** Approved & Ready for Sprint Backlog  
**Target Branch:** `feat/phase3-ui-ux-polish` → `main`  
**User Evidence:** [`media_1787057311981.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057311981.png), [`media_1787057318143.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057318143.png), & [`media_1787057384533.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057384533.png)

---

## 📋 Executive Summary & Problem Statement

During live production usage of the **Phase 3 Reading Studio & Companion Workbench** on `https://brain.arunp.in`, critical UI/UX design defects, light-theme contrast regressions, and redundant button placements were identified:

1. **Unreadable Recall Banner in Light Theme (Low Contrast):**  
   In `src/components/reading-studio/multi-layer-companion-tabs.tsx`, the **Imported Recall.it Memory** banner and tag pills utilize hardcoded dark-mode tokens (`bg-purple-950/20 text-purple-300 border-purple-500/30`). In light mode, this produces pale lavender text on a light lilac background with a contrast ratio of < 2.1:1 (violating WCAG AA minimum 4.5:1 requirement).
2. **Muddy Header Icon Container & Awkward Alignment:**  
   In `src/components/reading-studio/reading-studio-app.tsx`, the `<BookOpen>` header icon container uses `bg-emerald-950/40 text-emerald-400 border-emerald-800/40`, rendering as a dirty dark-green square in light mode, with cramped horizontal spacing and unrefined baseline alignment relative to the item title.
3. **Unreadable Focus Mode Buttons & Redundant Toggles:**  
   In `src/components/reading-studio/reading-studio-app.tsx` and `src/components/reading-studio/split-pane-container.tsx`, active Focus Mode buttons apply `bg-indigo-950/40 text-indigo-300 border-indigo-800/60`. In light mode, `text-indigo-300` renders as a washed-out pastel blue on a grey-purple surface (< 1.9:1 contrast ratio). Furthermore, two separate Focus Mode toggle buttons are rendered simultaneously within 40px of vertical space, creating UX clutter.
4. **Missing Semantic Theme Token Hygiene:**  
   Hardcoded palette values (`bg-*-950`, `text-*-300`) bypass CSS theme variables (`var(--surface)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border)`), causing visual friction whenever switching between light and dark themes.

---

## 📊 Epic Execution Matrix (Milestone 3.1)

| Ticket Key | Summary / Title | Component | Type | Story Points | Priority | Primary Files |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`TICKET-UX-01`** | **BUG(ux-contrast): Fix Light Mode Contrast & Theme Variables in Companion Tabs (Recall Banner & Tags)** | Companion Workbench | Bug | 3 SP | **P1 (High)** | `src/components/reading-studio/multi-layer-companion-tabs.tsx` |
| **`TICKET-UX-02`** | **BUG(ux-theme): Fix Reading Studio Header Icon Badges, Spacing & Title Alignment** | Reading Studio Header | Bug | 2 SP | **P1 (High)** | `src/components/reading-studio/reading-studio-app.tsx`, `src/components/reading-studio/hero-workspace-banner.tsx` |
| **`TICKET-UX-03`** | **FEAT(ux-theme): Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit for Phase 3 Suite** | Design System | Task | 3 SP | **P2 (Medium)** | `src/components/reading-studio/*`, `src/components/repair/*`, `src/app/globals.css` |
| **`TICKET-UX-04`** | **BUG(ux-contrast): Fix Focus Mode Active Contrast & Redundant Toggle Button Styling in Reading Studio** | Reading Studio Layout | Bug | 2 SP | **P1 (High)** | `src/components/reading-studio/split-pane-container.tsx`, `src/components/reading-studio/reading-studio-app.tsx` |

**Total Milestone Effort:** 10 Story Points (~3-4 days).

---

## 🎟️ Ticket 1: `TICKET-UX-01` — Fix Light Mode Contrast & Theme Variables in Companion Tabs

### 📌 Summary
Replace hardcoded dark-mode purple tokens in `MultiLayerCompanionTabs` with adaptive theme tokens or high-contrast semantic variables so that Recall memory headers, tags, and icons maintain WCAG AA contrast (≥ 4.5:1) in both light and dark modes.

### 🔍 Root Cause Analysis
```tsx
// CURRENT DEFECTIVE CODE (src/components/reading-studio/multi-layer-companion-tabs.tsx:261):
<div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-purple-300 font-semibold uppercase tracking-wider text-[11px]">
      <Download className="h-4 w-4" />
      <span>Imported Recall.it Memory</span>
    </div>
  </div>
  ...
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-800 text-[11px]">
```
In light mode (`[data-theme="light"]`), `text-purple-300` is `#d8b4fe`, which has almost zero contrast against `bg-purple-950/20` (`rgba(59, 7, 100, 0.2)` on white), rendering text unreadable.

### 🎯 Acceptance Criteria
1. **Adaptive Contrast Tokens:**
   - Dark mode: `dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800/40`
   - Light mode: `bg-purple-50 text-purple-900 border-purple-200`
   - Alternatively, use semantic tokens: `bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-primary)]`.
2. **Tag Pills:**
   - Light mode tags use `bg-purple-100 text-purple-800 border-purple-300` with high legibility.
   - Dark mode tags use `dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700/50`.
3. **Recall Tab Indicator:**
   - Active Recall tab pill uses theme-safe active states (`bg-[var(--surface)] text-[var(--text-primary)] shadow-xs`).
4. **Automated Verification:**
   - Contrast check script verifies ≥ 4.5:1 ratio in both light and dark theme fixtures.

---

## 🎟️ Ticket 2: `TICKET-UX-02` — Fix Reading Studio Header Icon Badges, Spacing & Title Alignment

### 📌 Summary
Redesign the Reading Studio top header bar icon badge container and title layout to be theme-adaptive, visually balanced, and properly spaced in both light and dark modes.

### 🔍 Root Cause Analysis
```tsx
// CURRENT DEFECTIVE CODE (src/components/reading-studio/reading-studio-app.tsx:161):
<div className="flex items-center gap-2 min-w-0">
  <span className="p-1 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 shrink-0">
    <BookOpen className="h-3.5 w-3.5" />
  </span>
  <h1 className="font-semibold text-sm truncate max-w-[280px] sm:max-w-md md:max-w-lg">
    {item.title || "Untitled Workspace"}
  </h1>
</div>
```
In light mode, `bg-emerald-950/40` renders as a dark murky box with neon green icon, causing visual harshness next to clean typography.

### 🎯 Acceptance Criteria
1. **Header Icon Badge Styling:**
   - Uses refined, theme-adaptive styling:
     - Light Mode: `bg-emerald-50 text-emerald-700 border border-emerald-200`
     - Dark Mode: `dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50`
   - Or standard platform icon token: `bg-[var(--surface-raised)] text-[var(--accent-11)] border border-[var(--border)]`.
2. **Spacing & Alignment:**
   - Generous `gap-2.5` between icon container and title.
   - Vertically centered flex alignment (`items-center`).
   - Title text uses standard `font-sans text-sm font-semibold tracking-tight text-[var(--text-primary)]`.
3. **ASR Ground Truth Badge:**
   - In light mode: `bg-emerald-50 text-emerald-800 border-emerald-200`.
   - In dark mode: `dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60`.

---

## 🎟️ Ticket 4: `TICKET-UX-04` — Fix Focus Mode Active Contrast & Redundant Toggle Button Styling

### 📌 Summary
Eliminate low-contrast styling on active Focus Mode buttons in light mode and streamline the duplicate Focus Mode toggles rendered across the top header bar and the split-ratio toolbar.

### 🔍 Root Cause Analysis
```tsx
// CURRENT DEFECTIVE CODE (src/components/reading-studio/reading-studio-app.tsx:193 & split-pane-container.tsx:92):
className={`... ${
  isFocusMode
    ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/60"
    : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
}`}
```
- In light mode, `text-indigo-300` is `#a5b4fc` on a grey-purple background, generating a contrast ratio of < 1.9:1 (completely washed out).
- Having both `[ Exit Focus ]` in the top header and `[ Focus Mode (⌥F) ]` in the split toolbar rendered simultaneously creates redundant button clutter.

### 🎯 Acceptance Criteria
1. **Adaptive High-Contrast Active State:**
   - **Light Mode:** `bg-indigo-50 text-indigo-950 border-indigo-300 font-semibold shadow-xs`
   - **Dark Mode:** `dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-700/60`
2. **Dynamic Labeling & Icons:**
   - When active (`isFocusMode = true`), both buttons clearly display `<Minimize2 className="h-3.5 w-3.5" />` and `"Exit Focus (⌥F)"`.
   - When inactive (`isFocusMode = false`), buttons display `<Maximize2 className="h-3.5 w-3.5" />` and `"Focus Mode (⌥F)"`.
3. **Split Ratio Switcher Cohesion:**
   - The split presets `[ 50:50 ]`, `[ 60:40 ]`, `[ 40:60 ]` and the Focus button in `SplitPaneContainer` share the same visual language, padding, and border radius.

---

## 🎟️ Ticket 3: `TICKET-UX-03` — Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit

### 📌 Summary
Conduct a systemic review and refactor across all Phase 3 UI components to purge hardcoded dark-mode colors and enforce full light/dark theme semantic variable compliance.

### 🎯 Acceptance Criteria
1. **Audit Scope:**
   - `HeroWorkspaceBanner` (`src/components/reading-studio/hero-workspace-banner.tsx`): Check fidelity badge, duration pill, and slide-over segment inspector drawer in light mode.
   - `TranscriptTimeline` (`src/components/reading-studio/transcript-timeline.tsx`): Check active playing segment highlight, timestamp pill, and pin-to-notes button contrast.
   - `FloatingBulkDock` (`src/components/repair/floating-bulk-dock.tsx`): Check floating HUD contrast against white background.
   - `NeedsUpgradeClient` (`src/components/repair/needs-upgrade-client.tsx`): Check health breakdown cards in light mode.
2. **Design System Adherence:**
   - Replace raw Tailwind `-950/-900/-300` values with CSS variables or dual-mode `dark:` prefixes.
   - All interactive controls have visible focus rings (`focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`).
3. **Automated Regression Test:**
   - Add contrast token assertions in `src/app/theme-tokens.test.ts` for all Phase 3 components.

---

## 📅 Roadmap & Milestones

```
Phase 3 Milestones:
├── Milestone 3.0: Reading Studio Core & Kanban Triage (Released - v0.9.0) ✅
└── Milestone 3.1: UI/UX Quality, Contrast & Light-Mode Polish (Target - v0.9.1) 🚀
    ├── TICKET-UX-01: Recall Memory Banner Contrast & Tags (3 SP)
    ├── TICKET-UX-02: Reading Studio Header Badge & Title Polish (2 SP)
    ├── TICKET-UX-04: Focus Mode Active Contrast & Button Streamlining (2 SP)
    └── TICKET-UX-03: Phase 3 Semantic Theme Variable Audit (3 SP)
```
