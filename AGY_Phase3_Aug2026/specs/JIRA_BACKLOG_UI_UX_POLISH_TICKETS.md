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
- [`media_1787057644357.png`](file:///Users/arun.prakash/.gemini/antigravity/brain/9bc235e8-cdbc-41e7-9a51-6396613b53bf/.user_uploaded/media_1787057644357.png) *(Missing subtle YouTube platform icon on repair & triage cards)*

---

## 📋 Executive Summary & Problem Statement

During live production usage of the **Phase 3 Reading Studio & Companion Workbench** on `https://brain.arunp.in`, 7 major UI/UX defects were identified:

1. **Missing Authentic YouTube Brand Icon on Cards (`media_1787057644357.png`):**  
   On `/needs-upgrade` and triage queues, YouTube items use a generic monochrome video camera outline icon (`<Video />`), missing the approved Product Council design for the recognizable, subtle red YouTube brand icon (`assets/repair_card_subtle_youtube_icon_1787045734719.jpg`), which impairs visual scanning speed in high-velocity queues.
2. **Degraded ASR Callout Low-Contrast & Color Clashes (`media_1787057571803.png`):**  
   In `src/components/reading-studio/asr-recovery-callout.tsx`, the `"Missing Timed Transcript"` headline and `[ DEGRADED CAPTURE ]` badge use washed-out pastel pink text on a light pink background (< 2.3:1 contrast ratio). The `[ Queued for Mac ASR ]` badge is a translucent green overlay that clashes discordantly with the pink container.
3. **Hero Workspace Banner 3-Column Collision (`media_1787057452904.png`):**  
   Inside the article column, `HeroWorkspaceBanner` squeezes the title into a 150px vertical ribbon, and redundantly duplicates the full `<h1>` headline.
4. **Processing Card Action Buttons & Muddy Badges (`media_1787057518601.png`):**  
   On `/processing`, `[ Studio ↗ ]` uses a washed-out green rectangle (`border-emerald-500/40 bg-emerald-950/20 text-emerald-400`) that clashes with `[ Open ↗ ]` and `[ Inbox ⌵ ]`. The `⚡ ASR` and `📥 Recall` pills use hardcoded dark-mode tokens that render as muddy, illegible blocks in light theme.
5. **Unreadable Focus Mode Buttons & Redundant Toggles (`media_1787057436924.png`):**  
   Active Focus Mode buttons apply `bg-indigo-950/40 text-indigo-300` (< 1.9:1 contrast in light mode), and two separate buttons are rendered within 40px of vertical space.
6. **Unreadable Recall Banner in Light Theme (`media_1787057311981.png`):**  
   `MultiLayerCompanionTabs` uses `text-purple-300` on a light purple surface (< 2.1:1 contrast ratio).
7. **Muddy Header Icon Container & Spacing (`media_1787057318143.png`):**  
   `<BookOpen>` header icon container uses `bg-emerald-950/40 text-emerald-400` with cramped spacing next to the title.

---

## 📊 Epic Execution Matrix (Milestone 3.1)

| Ticket Key | GitHub Issue | Summary / Title | Component | Type | Story Points | Priority | Primary Target Files |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`TICKET-UX-05`** | [#101](https://github.com/arunpr614/ai-brain/issues/101) | **BUG(ux-layout): Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision in Article View** | Hero Workspace Banner | Bug / UX | 3 SP | **`P1 (Blocker)`** | `src/components/reading-studio/hero-workspace-banner.tsx`, `src/app/items/[id]/page.tsx` |
| **`TICKET-UX-08`** | [#102](https://github.com/arunpr614/ai-brain/issues/102) | **FEAT(ux-brand): Introduce Authentic Subtle YouTube Platform Icon & Brand Badge in Repair & Triage Cards** | Triage & Repair Cards | Feature / UX | 2 SP | **`P1 (High)`** | `src/components/repair/needs-upgrade-client.tsx`, `src/components/icons/youtube-icon.tsx`, `src/components/processing/item-card.tsx` |
| **`TICKET-UX-07`** | [#103](https://github.com/arunpr614/ai-brain/issues/103) | **BUG(ux-contrast): Fix Light-Mode Contrast & Clashing Colors in Degraded ASR Recovery Callout** | ASR Recovery Callout | Bug / UX | 2 SP | **`P1 (High)`** | `src/components/reading-studio/asr-recovery-callout.tsx` |
| **`TICKET-UX-06`** | [#104](https://github.com/arunpr614/ai-brain/issues/104) | **BUG(ux-theme): Fix Processing Card Action Buttons & Badges (Studio Button, ASR & Recall Pills)** | Processing Triage Cards | Bug / UX | 2 SP | **`P1 (High)`** | `src/components/processing/item-card.tsx`, `src/components/processing/workflow-controls.tsx` |
| **`TICKET-UX-04`** | [#105](https://github.com/arunpr614/ai-brain/issues/105) | **BUG(ux-contrast): Fix Focus Mode Active Contrast & Redundant Toggle Button Styling in Reading Studio** | Reading Studio Layout | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/split-pane-container.tsx`, `src/components/reading-studio/reading-studio-app.tsx` |
| **`TICKET-UX-01`** | [#106](https://github.com/arunpr614/ai-brain/issues/106) | **BUG(ux-contrast): Fix Light Mode Contrast & Theme Variables in Companion Tabs (Recall Banner & Tags)** | Companion Workbench | Bug | 3 SP | **`P1 (High)`** | `src/components/reading-studio/multi-layer-companion-tabs.tsx` |
| **`TICKET-UX-02`** | [#107](https://github.com/arunpr614/ai-brain/issues/107) | **BUG(ux-theme): Fix Reading Studio Header Icon Badges, Spacing & Title Alignment** | Reading Studio Header | Bug | 2 SP | **`P1 (High)`** | `src/components/reading-studio/reading-studio-app.tsx`, `src/components/reading-studio/hero-workspace-banner.tsx` |
| **`TICKET-UX-03`** | [#108](https://github.com/arunpr614/ai-brain/issues/108) | **FEAT(ux-theme): Comprehensive Semantic Token & WCAG 2.1 AA Contrast Audit for Phase 3 Suite** | Design System | Task | 3 SP | **`P2 (Medium)`** | `src/components/reading-studio/*`, `src/components/repair/*`, `src/app/globals.css` |

**Total Milestone Effort:** 19 Story Points (~2 sprints).

---

## 🎟️ Ticket 8: `TICKET-UX-08` — Introduce Authentic Subtle YouTube Platform Icon & Brand Badge in Cards

### 📌 Summary
Add the authentic red YouTube brand icon (with play triangle glyph) to triage and repair cards, replacing the generic monochrome `<Video />` icon in leading card badges and metadata strips for rapid visual platform identification.

---

### 🔍 Root Cause Analysis (`media_1787057644357.png`)

```tsx
// CURRENT DEFECTIVE CODE (src/components/repair/needs-upgrade-client.tsx:67):
function SourceIcon({ item }: { item: ItemRow }) {
  if (item.source_type === "youtube" || item.source_platform?.includes("youtube")) {
    return <Video className="h-4 w-4 text-red-500" strokeWidth={2} />; // Generic lucide outline camera!
  }
  ...
}
```

**Why it broke:**
1. The Product Council approved design (`assets/repair_card_subtle_youtube_icon_1787045734719.jpg` & `assets/repair_card_subtle_icon_lead_1787045761460.jpg`) specifies the official YouTube brand glyph (rounded red rectangle with centered white play triangle) or a subtle red brand badge.
2. The current implementation uses a generic Lucide `<Video />` outline icon which looks like an arbitrary camcorder, reducing visual differentiation between YouTube videos, MP4 files, podcasts, and articles in large triage lists (50–500 items).

---

### 🎨 What is the "Right UX"?

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ ]  [ ▶️ YouTube ]  job hunting with Hermes and DeepSeep v4 Pro...              ✧ queued   │
│      YouTube • via Recall • [ Full text ] • 17h ago • 13,307 chars • ⚠️ warning             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Design Tokens:
1. **Dedicated `<YouTubeIcon />` Component:**
   - SVG vector rendering the official rounded pill with white play triangle:
     ```tsx
     export function YouTubeIcon({ className = "h-4 w-4" }: { className?: string }) {
       return (
         <svg viewBox="0 0 24 24" className={className} fill="currentColor">
           <path
             fill="#FF0000"
             d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
           />
           <path fill="#FFFFFF" d="m9.545 15.568 6.273-3.568-6.273-3.568z" />
         </svg>
       );
     }
     ```
2. **Leading Icon Container in Repair Cards (`needs-upgrade-client.tsx`):**
   - Clean rounded container: `p-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] shadow-2xs`
   - For YouTube items, renders `<YouTubeIcon className="h-4 w-4 shrink-0" />`.
3. **Metadata Origin Badge:**
   - In `SourceTrustStrip` and `item-card.tsx`, YouTube platform badges include the authentic miniature YouTube icon alongside the `"YouTube"` label.

---

### 🎯 Acceptance Criteria
1. **Brand Authenticity & Crisp SVG:**
   - YouTube items display the official red/white SVG glyph across `/needs-upgrade`, `/processing`, `/library`, and `/items/[id]`.
2. **Theme Resilience:**
   - YouTube icon renders cleanly in both light mode and dark mode without color clipping or border artifacting.
3. **Semantic Fallbacks:**
   - PDF documents display `<FileText className="h-4 w-4 text-amber-500" />`, web articles display `<BookOpen className="h-4 w-4 text-cyan-500" />`.

---

## 🎟️ Ticket 5: `TICKET-UX-05` — Redesign Hero Workspace Banner Layout & Prevent 3-Column Width Collision

### 📌 Summary
Refactor `HeroWorkspaceBanner` into a clean 2-tier card layout (Media + Metadata Row on top, Action Bar on bottom) and eliminate redundant duplicate article title text.

---

## 🎟️ Ticket 7: `TICKET-UX-07` — Fix Light-Mode Contrast & Clashing Colors in Degraded ASR Recovery Callout

### 📌 Summary
Refactor the color tokens in `AsrRecoveryCallout` to ensure all warning text and badges achieve WCAG AA contrast (≥ 4.5:1) in light mode, and replace translucent green-on-pink badges with an opaque, cohesive status badge.

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
    ├── TICKET-UX-08: Authentic Subtle YouTube Brand Icon & Badges (2 SP) [High]
    ├── TICKET-UX-07: Degraded ASR Recovery Callout Contrast & Color Fix (2 SP) [High]
    ├── TICKET-UX-06: Processing Item Card Action Buttons & Badge Polish (2 SP) [High]
    ├── TICKET-UX-04: Focus Mode Active Contrast & Button Streamlining (2 SP) [High]
    ├── TICKET-UX-01: Recall Memory Banner Contrast & Tags (3 SP) [High]
    ├── TICKET-UX-02: Reading Studio Header Badge & Title Polish (2 SP) [High]
    └── TICKET-UX-03: Phase 3 Semantic Theme Variable Audit (3 SP) [Medium]
```
