# 🏛️ AI Brain — Jira & GitHub Execution Backlog: Batch Triage & Range Selection

**Phase:** Phase 3 (Reading Studio & Triage) / Phase 3.5 Finalization  
**Milestone:** Milestone 3 (`v0.9.x - Kanban Card Processing & Reading Studio`)  
**Epic Key:** `EPIC-STUDIO-01`  
**Epic Title:** `High-Velocity Batch Triage, Contiguous Range Selection & Auto-Remediation Workflow`  
**Author:** Lead Technical Project Manager & Scrum Master (Product Council)  
**Date:** August 18, 2026  
**Status:** Approved & Execution-Ready for Autonomous AI Coding Agents  
**Target Branch:** `feature/batch-triage-range-selection` → `main`  
**Prototype Reference:** `src/components/prototype/phase3-suite-prototype.tsx` & `src/app/prototype/phase3-suite/page.tsx`

---

## 📋 Executive Summary & Epic Architecture

This backlog translates the **Batch Triage & Range Selection Engine** requirements into 4 atomic, execution-ready engineering tickets.

The system empowers users and autonomous agents to manage degraded content captures, queue local Apple Neural Engine (ANE) Whisper ASR transcriptions, execute automated article readability healing, and navigate high-velocity stream/Kanban views using zero-friction keyboard and multi-selection interactions.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  AI BRAIN BATCH TRIAGE ARCHITECTURE                              │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   [ Ticket 3: Keyboard 'X' Hotkey & Navigation Engine ]                                         │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │  [J / K] Focus Navigation  •  [X] Toggle Selection  •  [Shift + J/K] Extend Range        │   │
│   │  [Space] Quick Peek        •  [E] Batch Archive     •  [A] Batch AI Synthesize           │   │
│   └─────────────────────────────────────────┬────────────────────────────────────────────────┘   │
│                                             │                                                    │
│                                             ▼ Updates selection state                            │
│   [ Ticket 2: Shift + Click Contiguous Range Selection Hook (`useRangeSelection`) ]              │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Anchor Point Tracking (`lastSelectedId`)                                              │   │
│   │  • Filtered Array Index Splice & Contiguous Range Calculation                            │   │
│   │  • Checkbox State Sync (`aria-checked`, Indeterminate State, Select All / Clear)         │   │
│   └─────────────────────────────────────────┬────────────────────────────────────────────────┘   │
│                                             │                                                    │
│                                             ▼ Binds selection payload                            │
│   [ Ticket 1: Sticky Floating Bulk Action Dock (`FloatingBulkDock`) ]                            │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │  [ 5 Selected ] │ [ ⚡ Queue Mac ASR (3 Videos) ] [ 🔧 Auto-Heal (2 Articles) ] [ Deselect ]│   │
│   │  • Dynamic Count Badges  • Glassmorphic Raised Surface  • In-Flight Progress Bar         │   │
│   └─────────────────────────────────────────┬────────────────────────────────────────────────┘   │
│                                             │                                                    │
│                                             ▼ Dispatches batch jobs                              │
│   [ Ticket 4: Context-Aware Smart Batch Action Dispatcher & Auto-Remediation Pipeline ]          │
│   ┌──────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │  • Concurrency Limiter (ANE CoreML / Worker Queue)                                       │   │
│   │  • Server Action Pipeline (`src/app/needs-upgrade/actions.ts`)                           │   │
│   │  • Partial Failure Resilience, SQLite Transactions & Optimistic Rollback                 │   │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Epic Execution Matrix

| Ticket # | Key / Label | Title | Priority | Points | Type | Primary Target Files |
|---|---|---|---|---|---|---|
| **1** | `TICKET-TRIAGE-01` | `FEAT(triage): Sticky Floating Bulk Action Dock with Dynamic Selection Counter` | **P0 (Blocker)** | **5 SP** | Core UI / Dock | `src/components/repair/floating-bulk-dock.tsx`, `src/app/needs-upgrade/page.tsx`, `src/components/prototype/phase3-suite-prototype.tsx` |
| **2** | `TICKET-TRIAGE-02` | `FEAT(triage): Shift + Click Contiguous Range Selection for Triage Cards` | **P0 (Blocker)** | **3 SP** | State Hook | `src/lib/triage/use-range-selection.ts`, `src/app/needs-upgrade/page.tsx` |
| **3** | `TICKET-TRIAGE-03` | `FEAT(triage): Keyboard 'X' Hotkey Multi-Selection for Stream and Kanban Cards` | **P1 (High)** | **3 SP** | Hotkeys / UX | `src/lib/triage/use-keyboard-triage.ts`, `src/components/processing/processing-app.tsx` |
| **4** | `TICKET-TRIAGE-04` | `FEAT(triage): Context-Aware Smart Batch Action Dispatcher & Auto-Remediation Workflow` | **P1 (High)** | **5 SP** | Engine / Pipeline | `src/lib/triage/batch-dispatcher.ts`, `src/app/needs-upgrade/actions.ts` |

**Total Estimated Effort:** 16 Story Points (~0.5 Sprint).

---

## 🎟️ Ticket 1: Sticky Floating Bulk Action Dock with Dynamic Selection Counter

### 1. Issue Title & Summary
- **Issue Title:** `FEAT(triage): Sticky Floating Bulk Action Dock with Dynamic Selection Counter`
- **Summary:** Implement the high-visibility, glassmorphic floating action dock (`src/components/repair/floating-bulk-dock.tsx`) that mounts whenever 1 or more items are selected in the Needs Upgrade / Repair Center triage views (`src/app/needs-upgrade/page.tsx`). The dock displays an item selection counter badge, context-aware primary and secondary action buttons (`Queue Mac ASR (N Videos)`, `Auto-Heal (M Articles)`, `Archive (K Items)`), an in-flight progress bar with percentage indicator, and keyboard-accessible deselect controls.

### 2. Jira / GitHub Metadata
- **Issue Type:** Feature / Core Component
- **Epic Link:** `EPIC-STUDIO-01: High-Velocity Batch Triage, Contiguous Range Selection & Auto-Remediation Workflow`
- **Milestone:** `v0.9.x - Kanban Card Processing & Reading Studio`
- **Component:** `UI / Repair Center / Triage Dock`
- **Priority:** `P0 - Blocker`
- **Story Points:** 5
- **Labels:** `area/triage`, `layer/ui`, `phase/3`, `milestone/0.9.x`, `priority/p0`

### 3. User Story
```markdown
As an AI Brain user managing degraded content captures and backlogs,
I want a sticky floating action dock at the bottom of the viewport whenever I select one or more triage cards,
So that I can immediately see my selection count, trigger batch ASR or article repair actions with a single click, and monitor ongoing batch job progress without losing my scroll context.
```

### 4. Acceptance Criteria (Gherkin)

```gherkin
Feature: Sticky Floating Bulk Action Dock

  Background:
    Given the user is on the "/needs-upgrade" or Repair Center triage view
    And there are 12 degraded items listed across YouTube and Article sources

  Scenario: Dock visibility on selection state change
    Given 0 items are currently selected
    Then the Floating Bulk Action Dock is not mounted in the DOM
    When the user selects 1 item
    Then the Floating Bulk Action Dock smoothly slides in from the bottom of the viewport
    And the selection badge displays "1 selected"
    When the user deselects the item
    Then the Floating Bulk Action Dock smoothly transitions out and unmounts

  Scenario: Dynamic context-aware action labels
    Given the user selects 3 YouTube items (missing transcripts) and 2 Article items (paywall preview)
    When the Floating Bulk Action Dock is rendered
    Then the selection counter badge displays "5 selected"
    And a primary button displays "Queue Mac ASR (3 Videos)" with a Zap icon in teal
    And a secondary button displays "Auto-Heal (2 Articles)" with a Wrench icon in azure
    And a tertiary button displays "Archive (5 Items)"
    And a "Deselect All" button is present

  Scenario: In-flight batch processing state
    Given 4 items are selected for Mac ASR
    When the user clicks "Queue Mac ASR (4 Videos)"
    Then the primary button state transitions to disabled with an active loading spinner
    And the button text updates to "Processing ASR (25%)..."
    And a horizontal progress bar is displayed across the dock with teal accent
    And the "Deselect All" button is disabled during active execution

  Scenario: Keyboard dismissal
    Given the Floating Bulk Action Dock is active with 3 selected items
    When the user presses the "Escape" key
    Then all selections are cleared
    And the dock slides out of view

  Scenario: Responsive layout on mobile viewports
    Given the user is on a mobile viewport (width < 640px)
    When 2 or more items are selected
    Then the dock remains centered at "bottom-4" with "max-w-[calc(100vw-2rem)]"
    And action buttons wrap or scroll horizontally without overflowing the screen
```

### 5. Technical Implementation Details

#### File Paths & Target Architecture
- `src/components/repair/floating-bulk-dock.tsx`: Pure client component rendering the animated floating dock with glassmorphism surface and progress indicator.
- `src/app/needs-upgrade/page.tsx`: Host page integrating the selection state and rendering `<FloatingBulkDock />`.
- `src/components/prototype/phase3-suite-prototype.tsx`: Authoritative reference prototype implementation (lines 1811–1863).

#### Component Contract & Props
```typescript
import React from "react";

export interface FloatingBulkDockAction {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void | Promise<void>;
}

export interface FloatingBulkProgress {
  current: number;
  total: number;
  percent: number;
  label?: string;
}

export interface FloatingBulkDockProps {
  selectedCount: number;
  totalCount?: number;
  actions: FloatingBulkDockAction[];
  onDeselectAll: () => void;
  onSelectAll?: () => void;
  isProcessing?: boolean;
  progress?: FloatingBulkProgress;
  className?: string;
}
```

#### Design System & CSS Tokens
- Dock Container: `sticky bottom-6 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-4 duration-200`
- Surface Pill: `flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)]/95 backdrop-blur-md px-5 py-3 shadow-2xl`
- Selection Badge: `rounded-md bg-[var(--accent-9)]/15 border border-[var(--accent-9)]/30 px-2.5 py-1 text-xs font-mono font-semibold text-[var(--accent-11)]`
- Primary CTA (ASR): `bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] active:scale-98 transition-all shadow-xs`
- Secondary CTA (Heal): `border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-base)] transition-all shadow-2xs`
- Progress Track: `h-1.5 w-full bg-[var(--surface-base)] rounded-full overflow-hidden`
- Progress Fill: `h-full bg-[var(--teal)] transition-all duration-300 rounded-full`

### 6. Asset & Screen References
- Prototype Implementation: [Phase 3 Suite Prototype Dock](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/src/components/prototype/phase3-suite-prototype.tsx#L1811-L1863)
- Needs Upgrade Desktop View: `Phase4/Phase4.1-AIModelConfig/UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/capture-settings-pairing-export-provider/desktop-needs-upgrade-light.png`
- Needs Upgrade Mobile View: `Phase4/Phase4.1-AIModelConfig/UX_UI_DESIGN_PACKAGE/screenshots/android/mobile-needs-upgrade.png`

### 7. Test & Verification Plan
- **Unit Tests (`src/components/repair/__tests__/floating-bulk-dock.test.tsx`):**
  - Renders nothing when `selectedCount === 0`.
  - Renders selection counter correctly for single and plural counts (`1 selected`, `8 selected`).
  - Calls `onClick` when action button is clicked.
  - Disables action buttons and renders progress percentage when `isProcessing === true`.
  - Fires `onDeselectAll` when clicking "Deselect All".
- **Keyboard Tests:**
  - Fires `onDeselectAll` when the user presses `Escape`.
- **Lint & Typecheck:**
  ```bash
  npm run typecheck
  npm run lint
  npm test src/components/repair
  ```

### 8. GitHub CLI Command
```bash
gh issue create \
  --title "FEAT(triage): Sticky Floating Bulk Action Dock with Dynamic Selection Counter" \
  --milestone "v0.9.x - Kanban Card Processing & Reading Studio" \
  --label "area/triage,layer/ui,phase/3,priority/p0" \
  --body "$(cat <<'EOF'
## User Story
As an AI Brain user managing degraded content captures and backlogs,
I want a sticky floating action dock at the bottom of the viewport whenever I select one or more triage cards,
So that I can immediately see my selection count, trigger batch ASR or article repair actions with a single click, and monitor ongoing batch job progress without losing my scroll context.

## Acceptance Criteria
- [ ] Mounts floating dock when `selectedCount > 0` with smooth slide-up animation (`sticky bottom-6 z-40`).
- [ ] Displays monospace count badge: `X selected`.
- [ ] Computes dynamic context-aware button labels (`Queue Mac ASR (N Videos)`, `Auto-Heal (M Articles)`).
- [ ] In-flight progress bar displays active percentage, animated spinner, and disables conflicting buttons.
- [ ] "Deselect All" button and `Escape` hotkey clear all selections.
- [ ] Responsive layout adapts gracefully to mobile viewports (< 640px).

## Technical Implementation
- Files: `src/components/repair/floating-bulk-dock.tsx`, `src/app/needs-upgrade/page.tsx`
- Props: `FloatingBulkDockProps` with `selectedCount`, `actions`, `onDeselectAll`, `progress`
- Tokens: `var(--surface-raised)`, `var(--border-strong)`, `var(--teal)`, `var(--azure)`
- Reference: `src/components/prototype/phase3-suite-prototype.tsx:1811-1863`

## Verification
`npm run typecheck && npm run lint && npm test src/components/repair`
EOF
)"
```

---

## 🎟️ Ticket 2: Shift + Click Contiguous Range Selection for Triage Cards

### 1. Issue Title & Summary
- **Issue Title:** `FEAT(triage): Shift + Click Contiguous Range Selection for Triage Cards`
- **Summary:** Implement the reusable `useRangeSelection<T>` hook (`src/lib/triage/use-range-selection.ts`) and wire it into the Needs Upgrade triage list (`src/app/needs-upgrade/page.tsx`). The hook enables standard desktop multi-select conventions: clicking an item selects it as an anchor point; `Shift + Click` on a subsequent item selects the contiguous range between the anchor and target index; subsequent standard clicks reset the anchor; and `Cmd/Ctrl + Click` toggles individual items without breaking the existing selection set.

### 2. Jira / GitHub Metadata
- **Issue Type:** Feature / Core Hook
- **Epic Link:** `EPIC-STUDIO-01: High-Velocity Batch Triage, Contiguous Range Selection & Auto-Remediation Workflow`
- **Milestone:** `v0.9.x - Kanban Card Processing & Reading Studio`
- **Component:** `Lib / Triage / Range Selection Hook`
- **Priority:** `P0 - Blocker`
- **Story Points:** 3
- **Labels:** `area/triage`, `layer/lib`, `phase/3`, `milestone/0.9.x`, `priority/p0`

### 3. User Story
```markdown
As a power user triaging dozens of degraded captures,
I want to select large blocks of cards by holding Shift and clicking the start and end cards,
So that I can select 50+ items in two clicks instead of individually clicking 50 checkboxes.
```

### 4. Acceptance Criteria (Gherkin)

```gherkin
Feature: Shift + Click Contiguous Range Selection

  Background:
    Given a triage list containing 10 items with IDs "item-1" through "item-10"
    And no items are currently selected

  Scenario: Single item click establishes anchor
    When the user clicks the checkbox on "item-3" without holding Shift
    Then "item-3" is added to selectedIds
    And the anchor point is set to "item-3"

  Scenario: Shift + Click forward range selection
    Given "item-3" is selected as the anchor point
    When the user clicks "item-7" while holding the "Shift" key
    Then all items from "item-3" through "item-7" ("item-3", "item-4", "item-5", "item-6", "item-7") are added to selectedIds
    And the total selected count is 5
    And the anchor point is updated to "item-7"

  Scenario: Shift + Click reverse range selection
    Given "item-8" is selected as the anchor point
    When the user clicks "item-2" while holding the "Shift" key
    Then all items from "item-2" through "item-8" are added to selectedIds
    And the total selected count is 7

  Scenario: Range selection respects active filtering and search
    Given the list is filtered to show only 4 items: ["item-2", "item-5", "item-8", "item-10"]
    And "item-2" is clicked as the anchor
    When the user Shift + clicks "item-8"
    Then only visible items ["item-2", "item-5", "item-8"] are selected
    And hidden items ("item-3", "item-4", "item-6", "item-7") remain unselected

  Scenario: Native browser text selection prevention
    When the user performs a Shift + Click on a card
    Then default text selection highlight on the DOM is suppressed via "user-select: none"

  Scenario: Master Select All and Deselect All controls
    When the user invokes "selectAll()"
    Then all currently visible items are added to selectedIds
    When the user invokes "deselectAll()"
    Then selectedIds becomes an empty Set and anchor is cleared
```

### 5. Technical Implementation Details

#### File Paths & Responsibilities
- `src/lib/triage/use-range-selection.ts`: Pure TypeScript custom React hook managing selection sets, anchor tracking, and range math.
- `src/app/needs-upgrade/page.tsx`: Integration into the triage list view and table/card rows.

#### Hook Contract & Type Definitions
```typescript
import { useState, useCallback, useMemo } from "react";

export interface UseRangeSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  initialSelectedIds?: string[];
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseRangeSelectionReturn {
  selectedIds: Set<string>;
  selectedCount: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  lastSelectedId: string | null;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string, isShiftKey?: boolean) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setSelectedIds: (ids: Set<string> | string[]) => void;
}
```

#### Contiguous Range Algorithm
```typescript
export function useRangeSelection<T>({
  items,
  getItemId,
  initialSelectedIds = [],
  onSelectionChange,
}: UseRangeSelectionOptions<T>): UseRangeSelectionReturn {
  const [selectedIds, setSelectedIdsState] = useState<Set<string>>(
    () => new Set(initialSelectedIds)
  );
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
      map.set(getItemId(item), index);
    });
    return map;
  }, [items, getItemId]);

  const toggleSelect = useCallback(
    (id: string, isShiftKey = false) => {
      setSelectedIdsState((prev) => {
        const next = new Set(prev);

        if (isShiftKey && lastSelectedId !== null && itemIndexMap.has(lastSelectedId)) {
          const startIndex = itemIndexMap.get(lastSelectedId)!;
          const targetIndex = itemIndexMap.get(id);

          if (targetIndex !== undefined) {
            const min = Math.min(startIndex, targetIndex);
            const max = Math.max(startIndex, targetIndex);

            for (let i = min; i <= max; i++) {
              next.add(getItemId(items[i]));
            }
          }
        } else {
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
        }

        setLastSelectedId(id);
        onSelectionChange?.(next);
        return next;
      });
    },
    [items, getItemId, lastSelectedId, itemIndexMap, onSelectionChange]
  );

  const selectAll = useCallback(() => {
    const all = new Set(items.map(getItemId));
    setSelectedIdsState(all);
    onSelectionChange?.(all);
  }, [items, getItemId, onSelectionChange]);

  const deselectAll = useCallback(() => {
    const empty = new Set<string>();
    setSelectedIdsState(empty);
    setLastSelectedId(null);
    onSelectionChange?.(empty);
  }, [onSelectionChange]);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    isAllSelected,
    isIndeterminate,
    lastSelectedId,
    isSelected,
    toggleSelect,
    selectRange: (fromId, toId) => { /* range dispatch helper */ },
    selectAll,
    deselectAll,
    setSelectedIds: (ids) => {
      const next = new Set(ids);
      setSelectedIdsState(next);
      onSelectionChange?.(next);
    },
  };
}
```

### 6. Asset & Screen References
- Reference UI: [Phase 3 Suite Prototype Needs Upgrade](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/src/components/prototype/phase3-suite-prototype.tsx#L922)
- Existing Multi-Selection Logic: [Phase 4 Selected Actions Lib](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/Phase4.1-AIModelConfig/src/lib/library/selected-actions.ts#L88-L95)

### 7. Test & Verification Plan
- **Unit Tests (`src/lib/triage/__tests__/use-range-selection.test.ts`):**
  - Verify single selection toggle and `lastSelectedId` state tracking.
  - Verify forward range selection (`Shift + Click` from index 1 to 5 selects indices 1, 2, 3, 4, 5).
  - Verify backward range selection (`Shift + Click` from index 6 to 2 selects indices 2, 3, 4, 5, 6).
  - Verify range calculation ignores items filtered out of the active `items` array.
  - Verify `isIndeterminate` returns `true` when 1 to N-1 items are selected.
  - Verify `selectAll()` and `deselectAll()` clear or fill the selection set accurately.
- **Lint & Typecheck:**
  ```bash
  npm run typecheck
  npm run lint
  npm test src/lib/triage/__tests__/use-range-selection.test.ts
  ```

### 8. GitHub CLI Command
```bash
gh issue create \
  --title "FEAT(triage): Shift + Click Contiguous Range Selection for Triage Cards" \
  --milestone "v0.9.x - Kanban Card Processing & Reading Studio" \
  --label "area/triage,layer/lib,phase/3,priority/p0" \
  --body "$(cat <<'EOF'
## User Story
As a power user triaging dozens of degraded captures,
I want to select large blocks of cards by holding Shift and clicking the start and end cards,
So that I can select 50+ items in two clicks instead of individually clicking 50 checkboxes.

## Acceptance Criteria
- [ ] Implement `useRangeSelection<T>` hook with `selectedIds: Set<string>` and `lastSelectedId`.
- [ ] Single click toggles selection and establishes anchor index.
- [ ] `Shift + Click` computes contiguous range `[min(startIndex, targetIndex), max(startIndex, targetIndex)]` and selects all intermediate items.
- [ ] Range math strictly respects visible/filtered item order.
- [ ] Master select/deselect state supports `isIndeterminate` for table header checkbox.
- [ ] Prevents DOM text selection highlights during Shift+Click operations.

## Technical Implementation
- Files: `src/lib/triage/use-range-selection.ts`, `src/app/needs-upgrade/page.tsx`
- Interface: `UseRangeSelectionOptions<T>`, `UseRangeSelectionReturn`
- Algorithm: Array index bounding with `Map<string, number>` for O(1) index lookup.

## Verification
`npm run typecheck && npm run lint && npm test src/lib/triage`
EOF
)"
```

---

## 🎟️ Ticket 3: Keyboard 'X' Hotkey Multi-Selection for Stream and Kanban Cards

### 1. Issue Title & Summary
- **Issue Title:** `FEAT(triage): Keyboard 'X' Hotkey Multi-Selection for Stream and Kanban Cards`
- **Summary:** Implement Gmail/Superhuman-style keyboard multi-selection in the Processing Stream and Kanban views (`src/lib/triage/use-keyboard-triage.ts`, `src/components/processing/processing-app.tsx`). Power users can navigate items using `J`/`K` (or Down/Up arrows), toggle selection on the focused card using `X` (auto-advancing down), expand range selections using `Shift + J` / `Shift + K`, select all via `⌘A` / `Ctrl+A`, toggle preview with `Space`, and trigger batch actions (`E` for Archive, `A` for AI Synthesize) without lifting hands from the keyboard.

### 2. Jira / GitHub Metadata
- **Issue Type:** Feature / Keyboard UX
- **Epic Link:** `EPIC-STUDIO-01: High-Velocity Batch Triage, Contiguous Range Selection & Auto-Remediation Workflow`
- **Milestone:** `v0.9.x - Kanban Card Processing & Reading Studio`
- **Component:** `UI / Processing / Keyboard Shortcuts`
- **Priority:** `P1 - High`
- **Story Points:** 3
- **Labels:** `area/triage`, `area/processing`, `layer/ui`, `phase/3`, `milestone/0.9.x`, `priority/p1`

### 3. User Story
```markdown
As a knowledge curator processing high volumes of incoming captures,
I want to navigate and multi-select cards using keyboard hotkeys ('J', 'K', 'X', 'Shift+J'),
So that I can rapidly triage, preview, and batch-process captures with high velocity without touching my mouse.
```

### 4. Acceptance Criteria (Gherkin)

```gherkin
Feature: Keyboard Hotkey Navigation and Multi-Selection

  Background:
    Given the user is on the Processing Stream or Kanban triage view
    And there are 15 captures displayed in the active list
    And the initial focus is on card index 0

  Scenario: Navigating focused item with J and K
    When the user presses "J" or "ArrowDown"
    Then the active focus indicator moves to card index 1
    And a subtle keycap flash "J" is rendered
    When the user presses "K" or "ArrowUp"
    Then the active focus indicator moves back to card index 0

  Scenario: Toggling selection with X hotkey
    Given card index 2 is currently focused and unselected
    When the user presses "X"
    Then card index 2 is added to the selection set
    And the selection checkbox renders as checked
    And the active focus automatically advances to card index 3

  Scenario: Range selection expansion with Shift + J
    Given card index 2 is currently focused and selected
    When the user presses "Shift + J"
    Then card index 3 is also added to the selection set
    And the active focus moves to card index 3

  Scenario: Quick peek preview with Spacebar
    Given card index 4 is currently focused
    When the user presses "Space"
    Then the Live Quick Peek drawer/preview expands for card index 4
    And existing multi-selections are preserved
    When the user presses "Space" again
    Then the Quick Peek drawer collapses

  Scenario: Batch action dispatch via single hotkey
    Given 3 cards are selected
    When the user presses "E"
    Then the batch archive action is triggered for all 3 selected cards
    And a toast notification confirms "Archived 3 items"
    And selection is cleared

  Scenario: Safe input guard
    Given the user is typing in a search input or text area
    When the user presses "J", "K", "X", "E", or "Space"
    Then the key events are ignored by the triage engine and passed to the text field

  Scenario: Keyboard shortcut help modal
    When the user presses "?"
    Then a modal dialog opens displaying the complete keyboard shortcut cheatsheet
```

### 5. Technical Implementation Details

#### File Paths & Target Architecture
- `src/lib/triage/use-keyboard-triage.ts`: React hook capturing global `keydown` events with input guards, focus navigation, and selection dispatch.
- `src/components/processing/processing-app.tsx`: Integration into stream card rendering, focus rings, and action handlers.
- `src/components/common/keycap-flash.tsx`: Subtle UI HUD flashing the pressed key (`J`, `K`, `X`, `E`).

#### Hook Contract & Type Definitions
```typescript
export interface KeyboardTriageHandlers {
  onToggleSelect: (id: string) => void;
  onExtendSelection?: (fromId: string, toId: string) => void;
  onArchive: (selectedIds: string[]) => void | Promise<void>;
  onSynthesize?: (selectedIds: string[]) => void | Promise<void>;
  onLaunchStudio?: (id: string) => void;
  onTogglePreview?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onUndo?: () => void;
}

export interface UseKeyboardTriageOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  focusedIndex: number;
  setFocusedIndex: React.Dispatch<React.SetStateAction<number>>;
  selectedIds: Set<string>;
  handlers: KeyboardTriageHandlers;
  enabled?: boolean;
}
```

#### Keymap & Input Guard Specification
```typescript
export function isInputElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.getAttribute("contenteditable") === "true"
  );
}

// Hotkey Mapping Table
// 'j' / 'ArrowDown'       -> Focus Next (+1)
// 'k' / 'ArrowUp'         -> Focus Prev (-1)
// 'x' / 'X'               -> Toggle Select + Advance Focus (+1)
// 'Shift + j'             -> Extend Range Selection Down
// 'Shift + k'             -> Extend Range Selection Up
// 'Space'                 -> Toggle Live Peek Drawer
// 'e' / 'E'               -> Archive Selected / Focused
// 'a' / 'A'               -> AI Synthesize Selected / Focused
// 's' / 'S'               -> Launch Reading Studio for Focused
// 'z' / 'Mod+z'           -> Undo Last Action
// 'Mod+a' (⌘A / Ctrl+A)   -> Select All
// 'Escape'                -> Deselect All / Close Peek
// '?'                     -> Toggle Shortcut Help Modal
```

#### Focus & Selection Visual Tokens
- Focused Card Ring: `ring-2 ring-[var(--accent-9)] ring-offset-2 ring-offset-[var(--bg)] transition-shadow`
- Selected Card Background: `bg-[var(--accent-subtle)]/40 border-[var(--accent-9)]/50`
- Keycap Badge HUD: `fixed bottom-8 right-8 z-50 rounded-lg bg-[var(--surface-raised)]/90 border border-[var(--border-strong)] px-3 py-1.5 font-mono text-sm font-bold text-[var(--accent-11)] shadow-xl animate-fade`

### 6. Asset & Screen References
- Reference Prototype Implementation: [Phase 3 Suite Keyboard Listener](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/src/components/prototype/phase3-suite-prototype.tsx#L1034-L1139)
- Visual Keycap Design: [Design System Guidelines](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/docs/specs/UX_SPEC_READING_STUDIO_HERO_AND_PAGE.md#L45-L75)

### 7. Test & Verification Plan
- **Unit Tests (`src/lib/triage/__tests__/use-keyboard-triage.test.ts`):**
  - Pressing `j`/`k` updates `focusedIndex` within bounds `[0, items.length - 1]`.
  - Pressing `x` toggles the focused item's presence in `selectedIds` and increments `focusedIndex`.
  - Pressing `Shift+j` adds the next item to `selectedIds`.
  - Key events occurring inside `<input>` or `<textarea>` elements are ignored.
  - Pressing `e` dispatches `onArchive` with all selected IDs.
- **Lint & Typecheck:**
  ```bash
  npm run typecheck
  npm run lint
  npm test src/lib/triage/__tests__/use-keyboard-triage.test.ts
  ```

### 8. GitHub CLI Command
```bash
gh issue create \
  --title "FEAT(triage): Keyboard 'X' Hotkey Multi-Selection for Stream and Kanban Cards" \
  --milestone "v0.9.x - Kanban Card Processing & Reading Studio" \
  --label "area/processing,area/triage,layer/ui,phase/3,priority/p1" \
  --body "$(cat <<'EOF'
## User Story
As a knowledge curator processing high volumes of incoming captures,
I want to navigate and multi-select cards using keyboard hotkeys ('J', 'K', 'X', 'Shift+J'),
So that I can rapidly triage, preview, and batch-process captures with high velocity without touching my mouse.

## Acceptance Criteria
- [ ] Implement `useKeyboardTriage` hook binding hotkeys: `J`/`K` (navigate), `X` (toggle select & advance), `Shift+J/K` (range extend).
- [ ] Action hotkeys: `Space` (preview peek), `E` (archive), `A` (synthesize), `S` (launch studio), `?` (help overlay).
- [ ] Safe input guard suppresses hotkey capture inside `input`, `textarea`, and `contenteditable` elements.
- [ ] Visual focused card state (`ring-2 ring-[var(--accent-9)]`) and keycap flash HUD.
- [ ] `Mod+A` selects all; `Escape` deselects all.

## Technical Implementation
- Files: `src/lib/triage/use-keyboard-triage.ts`, `src/components/processing/processing-app.tsx`
- Keymap: J/K/X/Space/E/A/S/? with input element guard.
- Reference: `src/components/prototype/phase3-suite-prototype.tsx:1034-1139`

## Verification
`npm run typecheck && npm run lint && npm test src/lib/triage`
EOF
)"
```

---

## 🎟️ Ticket 4: Context-Aware Smart Batch Action Dispatcher & Auto-Remediation Workflow

### 1. Issue Title & Summary
- **Issue Title:** `FEAT(triage): Context-Aware Smart Batch Action Dispatcher & Auto-Remediation Workflow`
- **Summary:** Implement the context-aware batch action dispatcher engine (`src/lib/triage/batch-dispatcher.ts`) and Server Action endpoints (`src/app/needs-upgrade/actions.ts`). The engine inspects heterogeneous selections (YouTube captures missing subtitles, articles with paywall/scraper degradation, and generic captures), splits them into target remediation pipelines (Mac Local CoreML/Whisper ASR vs. Readability auto-healing vs. archive), executes jobs with worker concurrency limits to protect Apple Silicon memory, streams real-time progress, and returns detailed partial-failure reports with optimistic rollback.

### 2. Jira / GitHub Metadata
- **Issue Type:** Feature / Core Backend & Engine
- **Epic Link:** `EPIC-STUDIO-01: High-Velocity Batch Triage, Contiguous Range Selection & Auto-Remediation Workflow`
- **Milestone:** `v0.9.x - Kanban Card Processing & Reading Studio`
- **Component:** `Engine / Triage / Batch Dispatcher`
- **Priority:** `P1 - High`
- **Story Points:** 5
- **Labels:** `area/triage`, `layer/backend`, `layer/pipeline`, `phase/3`, `milestone/0.9.x`, `priority/p1`

### 3. User Story
```markdown
As a user initiating batch repair operations across mixed YouTube videos and article captures,
I want the system to automatically route each item to its optimal remediation pipeline (Mac Local ASR vs. Scraper Auto-Heal) with concurrency controls and progress updates,
So that I can heal dozens of broken captures reliably in parallel without crashing my system or losing track of failed items.
```

### 4. Acceptance Criteria (Gherkin)

```gherkin
Feature: Context-Aware Smart Batch Action Dispatcher

  Background:
    Given the user has selected 6 items:
      | ID     | Kind    | Failure Reason             |
      | item-1 | youtube | Subtitle 429 Block         |
      | item-2 | youtube | Missing Timed Transcript   |
      | item-3 | youtube | Cloud Captions Unavailable |
      | item-4 | article | Paywall Preview (Degraded) |
      | item-5 | article | Incomplete HTML Extraction |
      | item-6 | pdf     | OCR Extraction Pending     |

  Scenario: Heterogeneous batch categorization and routing
    When the user triggers "Execute Smart Auto-Remediation" on the selection
    Then the dispatcher categorizes items:
      | Pipeline        | Item IDs                 |
      | Mac Local ASR   | ["item-1", "item-2", "item-3"] |
      | Scraper Auto-Heal | ["item-4", "item-5"]     |
      | Skip / Manual   | ["item-6"]               |
    And dispatches each group to its specialized worker pipeline

  Scenario: Concurrency control and thermal/memory safety
    Given 8 YouTube items are queued for Mac Local CoreML ASR
    When the ASR batch runner executes
    Then at most 2 ASR transcription jobs run concurrently on Apple Neural Engine (ANE)
    And remaining jobs stay queued in pending state until a worker becomes free

  Scenario: Real-time progress callback streaming
    Given a batch of 5 items is processing
    When item 1 completes successfully
    Then the "onProgress" callback emits "{ completed: 1, total: 5, percent: 20, currentItem: item-1 }"
    And the UI floating dock updates its progress bar to 20%

  Scenario: Partial failure resilience
    Given 3 items are being auto-healed
    And item 2 fails due to a network timeout while items 1 and 3 succeed
    When the batch execution finishes
    Then SQLite commits updates for item 1 and item 3 as "repaired"
    And item 2 remains marked as "degraded" with error metadata stored in technicalDetails
    And the final result object returns "{ total: 3, succeeded: 2, failed: 1, errors: [{ id: 'item-2', error: 'ETIMEDOUT' }] }"
    And a warning toast notifies the user: "2 items repaired, 1 failed"

  Scenario: User abort / cancellation
    Given a batch job of 10 items is in progress
    When the user clicks "Cancel Batch" or invokes AbortController.abort()
    Then in-flight worker jobs complete cleanly, but pending queued jobs are immediately cancelled
    And completed items are retained in SQLite
```

### 5. Technical Implementation Details

#### File Paths & Target Architecture
- `src/lib/triage/batch-dispatcher.ts`: Client orchestration engine managing category splitting, worker pools, concurrency limiting, and progress callbacks.
- `src/app/needs-upgrade/actions.ts`: Next.js Server Actions handling database updates, local ASR subprocess queueing, and scraper re-fetches.
- `src/db/items.ts` & `src/db/schema.ts`: SQLite persistence layer for capture quality tiers and transcript segments.

#### Dispatcher Architecture & Contracts
```typescript
export type TriageRemediationType = "asr" | "auto-heal" | "archive" | "synthesize" | "tag";

export interface BatchItemDescriptor {
  id: string;
  source_type: "youtube" | "article" | "pdf" | "podcast" | "note";
  capture_quality: "gold" | "clean" | "degraded" | "failed";
  audio_extracted?: boolean;
}

export interface BatchProgressPayload {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
  percent: number;
  currentItem?: string;
  stage: "categorizing" | "processing" | "finalizing" | "completed";
}

export interface BatchItemError {
  id: string;
  error: string;
  httpStatus?: number;
}

export interface BatchExecutionResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: BatchItemError[];
  repairedIds: string[];
}

export interface BatchDispatcherOptions {
  concurrency?: {
    asr?: number;        // Default: 2 (ANE/CoreML optimized)
    autoHeal?: number;   // Default: 4 (HTTP scraping)
  };
  onProgress?: (progress: BatchProgressPayload) => void;
  signal?: AbortSignal;
}
```

#### Server Action Contracts (`src/app/needs-upgrade/actions.ts`)
```typescript
"use server";

export async function batchQueueAsrAction(
  itemIds: string[],
  options?: { model?: "whisper-base" | "whisper-medium"; diarization?: boolean }
): Promise<{ enqueuedCount: number; jobIds: string[] }>;

export async function batchAutoHealArticlesAction(
  itemIds: string[]
): Promise<{ repairedCount: number; failedIds: string[]; errors: Record<string, string> }>;

export async function batchArchiveItemsAction(
  itemIds: string[]
): Promise<{ archivedCount: number }>;

export async function batchSynthesizeAction(
  itemIds: string[]
): Promise<{ synthesizedCount: number }>;
```

#### Concurrency Limiter Implementation (Worker Pool Pattern)
```typescript
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  onItemDone?: (result: R, index: number) => void,
  signal?: AbortSignal
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      if (signal?.aborted) throw new DOMException("Batch aborted by user", "AbortError");
      const index = currentIndex++;
      const item = items[index];
      const result = await task(item, index);
      results[index] = result;
      onItemDone?.(result, index);
    }
  }

  const pool = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(pool);
  return results;
}
```

### 6. Asset & Screen References
- Prototype Batch Dispatcher Logic: [Phase 3 Suite Prototype ASR Batch Runner](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/src/components/prototype/phase3-suite-prototype.tsx#L1500-L1570)
- Existing Repair Action Handlers: [Needs Upgrade Action Scripts](file:///Users/arun.prakash/Documents/ArunVault2026-2/Initiatives/Arun_AI_Projects/ai-brain/Phase4/Phase4.1-AIModelConfig/src/app/items/[id]/repair/actions.ts)
- Repair State Visual Evidence: `Phase4/Phase4.1-AIModelConfig/UX_v2/execution/WEB_EXPERIENCE_REVAMP_VISUAL_EVIDENCE_2026-06-15_21-48-07_IST/screenshots/item-ask-needs-upgrade/needs-upgrade-after-repair-1280-light.png`

### 7. Test & Verification Plan
- **Unit Tests (`src/lib/triage/__tests__/batch-dispatcher.test.ts`):**
  - Test smart item categorization partitions YouTube vs Article vs Unsupported items correctly.
  - Test `runWithConcurrency` limits maximum active simultaneous promises to `limit = 2`.
  - Test `onProgress` callback receives monotonic progress updates from 0% to 100%.
  - Test partial failure handling returns correct `succeeded` and `failed` tallies without aborting successful items.
  - Test `AbortSignal` stops execution of queued items immediately upon abort event.
- **Server Action Tests (`src/app/needs-upgrade/__tests__/actions.test.ts`):**
  - Verify `batchQueueAsrAction` enqueues items and updates status in SQLite mock.
  - Verify session verification cookie check rejects unauthenticated requests.
- **Lint & Typecheck:**
  ```bash
  npm run typecheck
  npm run lint
  npm test src/lib/triage/__tests__/batch-dispatcher.test.ts
  ```

### 8. GitHub CLI Command
```bash
gh issue create \
  --title "FEAT(triage): Context-Aware Smart Batch Action Dispatcher & Auto-Remediation Workflow" \
  --milestone "v0.9.x - Kanban Card Processing & Reading Studio" \
  --label "area/backend,area/triage,layer/pipeline,phase/3,priority/p1" \
  --body "$(cat <<'EOF'
## User Story
As a user initiating batch repair operations across mixed YouTube videos and article captures,
I want the system to automatically route each item to its optimal remediation pipeline (Mac Local ASR vs. Scraper Auto-Heal) with concurrency controls and progress updates,
So that I can heal dozens of broken captures reliably in parallel without crashing my system or losing track of failed items.

## Acceptance Criteria
- [ ] Categorizes mixed selections into specialized worker pipelines (Mac Local ASR vs Article Auto-Heal).
- [ ] Enforces worker pool concurrency limiter (max 2 concurrent ASR jobs for ANE memory protection).
- [ ] Real-time progress updates emitted via `onProgress` callback with monotonic percentage.
- [ ] Partial failure resilience: successful items commit to SQLite while failed items retain error diagnostics.
- [ ] Supports cancellation via `AbortSignal`.
- [ ] Server Actions in `src/app/needs-upgrade/actions.ts` with session authentication validation.

## Technical Implementation
- Files: `src/lib/triage/batch-dispatcher.ts`, `src/app/needs-upgrade/actions.ts`
- Functions: `runWithConcurrency`, `batchQueueAsrAction`, `batchAutoHealArticlesAction`
- Contracts: `BatchProgressPayload`, `BatchExecutionResult`

## Verification
`npm run typecheck && npm run lint && npm test src/lib/triage`
EOF
)"
```

---

## 🎯 Verification & Definition of Done (Epic Level)

To achieve **Epic Done** status for `EPIC-STUDIO-01 (Batch Triage & Range Selection)`:
1. **Zero Type Errors:** `npm run typecheck` passes with 0 errors across all target files.
2. **Zero Lint Violations:** `npm run lint` passes across all modified modules.
3. **100% Core Unit Test Pass Rate:** `npm test src/lib/triage src/components/repair` completes with all test suites green.
4. **Accessibility Compliance:** All multi-select checkboxes and keyboard focus indicators meet WCAG AA/AAA contrast ratios and keyboard focus visibility standards.
5. **Zero Text Selection Artifacts:** Rapid `Shift + Click` range selections do not cause unwanted browser text highlighting.
