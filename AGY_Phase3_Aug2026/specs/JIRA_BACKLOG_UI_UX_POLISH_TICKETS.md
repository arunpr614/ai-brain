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
- [`media_1787057571803.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057571803.png) *(Low-contrast text & clashing status badge in Degraded ASR Recovery Callout)*

---

## 📋 Executive Summary & Problem Statement

During live production usage of the **Phase 3 Reading Studio & Companion Workbench** on `https://brain.arunp.in`, 6 major UI/UX defects were identified:

1. **Degraded ASR Callout Low-Contrast & Color Clashes (`media_1787057571803.png`):**  
   In `src/components/reading-studio/asr-recovery-callout.tsx`, the `"Missing Timed Transcript"` headline and `[ DEGRADED CAPTURE ]` badge use washed-out pastel pink text on a light pink background (< 2.3:1 contrast ratio). The `[ Queued for Mac ASR ]` badge is a translucent green overlay that clashes discordantly with the pink container background.
2. **Hero Workspace Banner 3-Column Collision (`media_1787057452904.png`):**  
   Inside the article column, `HeroWorkspaceBanner` squeezes the title into a 150px vertical ribbon, and redundantly duplicates the full `<h1>` headline.
3. **Processing Card Action Buttons & Muddy Badges (`media_1787057518601.png`):**  
   On `/processing`, `[ Studio ↗ ]` uses a washed-out green rectangle (`border-emerald-500/40 bg-emerald-950/20 text-emerald-400`) that clashes with `[ Open ↗ ]` and `[ Inbox ⌵ ]`. The `⚡ ASR` and `📥 Recall` pills use hardcoded dark-mode tokens that render as muddy, illegible blocks in light theme.
4. **Unreadable Focus Mode Buttons & Redundant Toggles (`media_1787057436924.png`):**  
   Active Focus Mode buttons apply `bg-indigo-950/40 text-indigo-300` (< 1.9:1 contrast in light mode), and two separate buttons are rendered within 40px of vertical space.
5. **Unreadable Recall Banner in Light Theme (`media_1787057311981.png`):**  
   `MultiLayerCompanionTabs` uses `text-purple-300` on a light purple surface (< 2.1:1 contrast ratio).
6. **Muddy Header Icon Container & Spacing (`media_1787057318143.png`):**  
   `<BookOpen>` header icon container uses `bg-emerald-950/40 text-emerald-400` with cramped spacing next to the title.

---

## 📊 Epic Execution Matrix (Milestone 3.1)

| Ticket Key | Summary / Title | Component | Type | Story Points | Priority | Primary Target Files |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`TICKET-UX-05`** | **BUG(ux-layout): Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision in Article View** | Hero Workspace Banner | Bug / UX | 3 SP | **`P1 (Blocker)`** | `src/components/reading-studio/hero-workspace-banner.tsx`, `src/app/items/[id]/page.tsx` |
| **`TICKET-UX-07`** | **BUG(ux-contrast): Fix Light-Mode Contrast & Clashing Colors in Degraded ASR Recovery Callout** | ASR Recovery Callout | Bug / UX | 2 SP | **`P1 (High)`** | `src/components/reading-studio/asr-recovery-callout.tsx` |
| **`TICKET-UX-06`** | **BUG(ux-theme): Fix Processing Card Action Buttons & Badges (Studio Button, ASR & Recall Pills)** | Processing Triage Cards | Bug / UX | 2 SP | **`P1 (High)`** | `src/components/reading-studio/item-card.tsx`, `src/components/processing/item-card.tsx` |
| **`TICKET-UX-04`** | **BUG(ux-contrast): Fix Focus Mode Active Contrast & Redundant Toggle Button Styling in Reading Studio** | Reading Studio Layout | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/split-pane-container.tsx`, `src/components/reading-studio/reading-studio-app.tsx` |
| **`TICKET-UX-01`** | **BUG(ux-contrast): Fix Light Mode Contrast & Theme Variables in Companion Tabs (Recall Banner & Tags)** | Companion Workbench | Bug | 3 SP | **`P1 (High)`** | `src/components/reading-studio/multi-layer-companion-tabs.tsx` |
| **`TICKET-UX-02`** | **BUG(ux-theme): Fix Reading Studio Header Icon Badges, Spacing & Title Alignment** | Reading Studio Header | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/reading-studio-app.tsx`, `src/components/reading-studio/hero-workspace-banner.tsx` |
| **`TICKET-UX-03`** | **FEAT(ux-theme): Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit for Phase 3 Suite** | Design System | Task | 3 SP | **`P2 (Medium)`** | `src/components/reading-studio/*`, `src/components/repair/*`, `src/app/globals.css` |

**Total Milestone Effort:** 17 Story Points (~1.5 sprints).

---

## 🎟️ Ticket 7: `TICKET-UX-07` — Fix Light-Mode Contrast & Clashing Colors in Degraded ASR Recovery Callout

### 📌 Summary
Refactor the color tokens in `AsrRecoveryCallout` to ensure all warning text and badges achieve WCAG AA contrast (≥ 4.5:1) in light mode, and replace translucent green-on-pink badges with an opaque, cohesive status badge.

---

### 🔍 Root Cause Analysis (`media_1787057571803.png`)

```tsx
// CURRENT DEFECTIVE CODE (src/components/reading-studio/asr-recovery-callout.tsx:36, 47, 66)
<div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4 text-xs ...">
  ...
  <span className="font-semibold text-rose-700 dark:text-rose-300">
    Missing Timed Transcript
  </span>
  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-rose-700 dark:text-rose-300">
    Degraded Capture
  </span>
  ...
  <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
    <CheckCircle2 className="h-3.5 w-3.5" />
    <span>Queued for Mac ASR</span>
  </div>
</div>
```

**Why it broke:**
1. On a light pink container background (`bg-rose-500/10`), `text-rose-700` and `text-rose-300` blend into the background with a contrast ratio of < 2.3:1, making the warning header and `DEGRADED CAPTURE` chip barely readable.
2. The `[ Queued for Mac ASR ]` badge uses a translucent green background (`bg-emerald-500/15`) layered directly over the pink container background, producing an ugly greyish-muddy tint and visual dissonance.

---

### 🎨 What is the "Right UX"?

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚠️  Missing Timed Transcript  [ DEGRADED CAPTURE ]                                          │
│     Official YouTube captions were blocked or unavailable.                                  │
│     recall_api_metadata_only                                  [ 🟢 Queued for Mac ASR ]     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Design Tokens:
1. **Container Styling:**
   - **Light Mode:** `bg-rose-50/80 border border-rose-200 text-rose-950`
   - **Dark Mode:** `dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-100`
2. **Typography & Badges:**
   - Title: `text-rose-900 dark:text-rose-200 font-bold text-xs` (Contrast: **7.2:1** — AAA Compliant)
   - `[ DEGRADED CAPTURE ]`: `bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700/50 text-[10px] font-mono font-semibold`
3. **`Queued for Mac ASR` Badge:**
   - Opaque clean surface: `bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs` (no translucent pink/green color bleeding).

---

### 🎯 Acceptance Criteria
1. **WCAG AA/AAA Contrast:**
   - All text inside the callout achieves ≥ 4.5:1 contrast against the container background.
2. **Opaque Status Badge:**
   - `Queued for Mac ASR` badge uses an opaque neutral background with crisp green text and border.
3. **Hover & Focus States:**
   - The `Queue Mac ASR (M5 Pro ANE)` button uses the prominent primary action style (`bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]`).

---

## 🎟️ Ticket 5: `TICKET-UX-05` — Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision

### 📌 Summary
Refactor `HeroWorkspaceBanner` into a clean 2-tier card layout (Media + Metadata Row on top, Action Bar on bottom) and eliminate redundant duplicate article title text.

---

## 🎟️ Ticket 6: `TICKET-UX-06` — Fix Processing Card Action Buttons & Badges (Studio Button, ASR & Recall Pills)

### 📌 Summary
Refactor the action button bar on `/processing` item cards to unify button heights, paddings, and visual hierarchy, and replace hardcoded dark-mode tokens in `Studio ↗`, `⚡ ASR`, and `📥 Recall` with theme-adaptive semantic styles.

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
    ├── TICKET-UX-07: Degraded ASR Recovery Callout Contrast & Color Fix (2 SP) [High]
    ├── TICKET-UX-06: Processing Item Card Action Buttons & Badge Polish (2 SP) [High]
    ├── TICKET-UX-04: Focus Mode Active Contrast & Button Streamlining (2 SP) [High]
    ├── TICKET-UX-01: Recall Memory Banner Contrast & Tags (3 SP) [High]
    ├── TICKET-UX-02: Reading Studio Header Badge & Title Polish (2 SP) [High]
    └── TICKET-UX-03: Phase 3 Semantic Theme Variable Audit (3 SP) [Medium]
```
