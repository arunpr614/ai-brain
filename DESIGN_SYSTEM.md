# Brain — Design System

**App:** Brain
**Document version:** v0.1.0-design
**Date:** 2026-05-07
**Status:** Authoritative design contract for all phases. Changes here trigger a minor plan bump.
**Related:** `BUILD_PLAN.md` (v0.1.1-plan)

---

## 0. Purpose

This document is the single source of truth for:
1. Design philosophy (the feel and posture of Brain)
2. Visual tokens (color, type, spacing, radius, elevation)
3. Component library and icon set
4. Motion rules
5. Information architecture (desktop + mobile)
6. Per-feature UX patterns (8 feature categories)
7. Accessibility non-negotiables
8. Reference gallery

If a phase adds a feature that can't be expressed in this system, the gap is fixed here *first* before shipping. No ad-hoc design in feature code.

---

## 1. Design philosophy — **Structured Calm**

**Default mood:** calm. Generous whitespace, one accent color, progressive disclosure, editorial-grade typography for long-form content.
**Power layer:** a `⌘K` command palette makes every action keyboard-reachable in ≤2 keystrokes without cluttering the canvas.
**Chrome rule:** the sidebar is the only persistent UI chrome on desktop. Everything else expands on demand and collapses on blur.

Reference apps by mode:
| Mode | Aspirational reference |
|---|---|
| Capture / Inbox | Things 3, Readwise Reader |
| Consume (read an item) | iA Writer, Readwise Reader dual-pane |
| Organize | Notion sidebar (collapsed), Obsidian tag pane |
| Ask (chat over library) | NotebookLM, Perplexity |
| Generate (GenPage/GenLink/Flow) | NotebookLM audio-overview structure; iBooks dictionary pop-over for GenLink |
| Review (SRS) | Anki keyboard-first, Mochi stats |
| Explore (graph) | Obsidian local graph |
| Settings / command surface | Linear, Raycast |

**Rejected philosophies (and why):**
- *Editorial minimalism* pure — discoverability suffers for power features (Generate, Explore).
- *Command-surface density* pure — mobile becomes a second-class citizen; Android share-sheet flow needs calm.
- *Spatial document canvas* — only fits Explore, not whole app.

---

## 2. Color tokens

Palette derives from **Radix Colors** `slate` (neutral) + `indigo` (accent). Both scales ship P3 wide-gamut variants we adopt.

### 2.1 Accent — Indigo

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent-9` (solid) | `#3E63DD` | `#5472E4` | Primary buttons, active nav item, focus ring |
| `--accent-10` (hover) | `#3A5CCC` | `#6983EB` | Button hover |
| `--accent-11` (text-on-neutral) | `#3A5BC7` | `#9EB1FF` | Links, citation chip text |
| `--accent-3` (subtle bg) | `#F0F4FF` | `#182449` | Selected-row bg, badge bg |

### 2.2 Neutral — Slate

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FBFCFD` | `#111113` | App background |
| `--surface` | `#F8F9FA` | `#18191B` | Cards, sidebar, panels |
| `--surface-raised` | `#FFFFFF` | `#1D1E20` | Modals, popovers, tooltips |
| `--border` | `#D7DBDF` | `#2B2D30` | Dividers, input borders |
| `--border-strong` | `#B9BBC6` | `#43484E` | Hovered borders, dragger |
| `--text-primary` | `#1C2024` | `#EDEEF0` | Body text, headings |
| `--text-secondary` | `#60646C` | `#9BA1A6` | Captions, metadata |
| `--text-muted` | `#8B8D98` | `#60646C` | Placeholders, disabled text |

### 2.3 Semantic colors (reserved, use sparingly)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--success` | Radix `grass-11` `#2A7E3B` | `#63C174` | Sync-complete, enrichment-done |
| `--warning` | Radix `amber-11` `#AB6400` | `#F1A10D` | Needs attention, stale |
| `--danger` | Radix `red-11` `#CE2C31` | `#FF6369` | Destructive actions, conflicts |
| `--info` | Radix `sky-11` `#00749E` | `#7CE2FE` | Neutral informational badges |

**Rule:** only the accent and neutral scales appear in general UI. Semantic colors appear only in states that match their meaning.

### 2.4 Theme switching

Implement via CSS variables on `:root` (light) and `:root[data-theme="dark"]` (dark). Use `color-scheme: light dark;` on `html` so native form controls and scrollbars track the theme. Default to **system preference**, with a settings override persisted in SQLite and mirrored into a cookie for SSR.

---

## 3. Typography

### 3.1 Font stack (free / system only)

| Role | Family | Fallback | Source |
|---|---|---|---|
| UI / chrome | **Inter** (variable) | `system-ui, -apple-system, Segoe UI, Roboto, sans-serif` | `fonts.google.com/specimen/Inter` self-hosted |
| Long-form body | **Charter** (bundled on macOS/iOS) | `Iowan Old Style, Cambria, Georgia, serif` | System on Apple platforms; fallback serif on others |
| Monospace | **JetBrains Mono** | `Menlo, Consolas, monospace` | `jetbrains.com/mono` self-hosted |

Self-host Inter and JetBrains Mono (`woff2`, subset = latin) in `public/fonts/` to avoid any external network calls — matches the local-first constraint.

### 3.2 Type scale (modular, 1.25 ratio)

| Token | Size | Line-height | Usage |
|---|---|---|---|
| `--text-xs` | 12px | 16px | Captions, metadata, badges |
| `--text-sm` | 14px | 20px | Secondary UI labels |
| `--text-base` | 16px | 24px | UI body — **floor for any readable text** |
| `--text-md` | 18px | 28px | Item cards, settings body |
| `--text-article` | 17px / 1.6 | `calc(1em * 1.6)` | Long-form reading (Charter) |
| `--text-lg` | 20px | 28px | Section titles |
| `--text-xl` | 24px | 32px | Page titles |
| `--text-2xl` | 30px | 36px | Hero headings |

### 3.3 Weight & tracking

- Inter weights used: 400 (body), 500 (UI labels), 600 (headings). Never bold a whole paragraph.
- Charter: 400 for body, 700 for headings only.
- Tracking: `-0.01em` for `≥18px`, `0` below.
- Never apply text-transform: uppercase to UI labels.

### 3.4 Reading mode

In consume-mode (item view), body text uses Charter at `--text-article` (17px, 1.6 line-height), max content width **68ch**, top-of-viewport progress bar 2px thick. No margin notes sidebar unless explicitly toggled.

---

## 4. Spacing, radius, elevation

### 4.1 Spacing scale (4px base)

`--space-0` 0 · `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48 · `--space-16` 64 · `--space-20` 80.

### 4.2 Radius

`--radius-sm` 4px (chips, inputs) · `--radius-md` 8px (cards, buttons) · `--radius-lg` 12px (modals, sheets) · `--radius-full` 9999px (pills).

### 4.3 Elevation (shadows)

Dark-mode-aware; use CSS variables. Only three levels.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--shadow-1` | `0 1px 2px rgba(15,18,25,.06)` | `0 1px 2px rgba(0,0,0,.4)` | Subtle card lift |
| `--shadow-2` | `0 6px 24px rgba(15,18,25,.08)` | `0 6px 24px rgba(0,0,0,.5)` | Popovers, dropdowns |
| `--shadow-3` | `0 16px 48px rgba(15,18,25,.12)` | `0 16px 48px rgba(0,0,0,.6)` | Modals |

Never use shadows to decorate flat surfaces — shadows are for **floating** layers only.

### 4.4 Layout grid

- Max content width (reading): `68ch`
- Max content width (library / lists): `960px`
- Max content width (full canvas views, e.g., graph): 100%
- Sidebar collapsed: `48px`; expanded: `240px`
- Command palette: `640px × auto`, centered, max-height `60vh`

---

## 5. Component library

**Decision:** **shadcn/ui + Radix Primitives + Tailwind v4**, with **Lucide** for icons.

Reasons:
- Fully RSC-compatible in Next.js 15 (no client-boundary wrappers for base components).
- Copy-owned components — we diff changes in our own repo.
- CSS-variable theming plugs directly into §2 tokens.
- Radix Primitives provide correct a11y semantics out of the box.
- Lucide icons: 2px stroke weight, tree-shakable, consistent with the minimal aesthetic.

### 5.1 Component contracts

Every custom component lives in `src/components/ui/` (primitive) or `src/components/feature/` (composed). Props follow shadcn conventions — `variant`, `size`, `asChild`. Never ship a one-off component inline in a page; extract.

### 5.2 Canonical components (minimum set for v0.1.0)

- Button (`variant`: primary, secondary, ghost, destructive, link; `size`: sm, md, lg, icon)
- Input, Textarea, Select, Combobox (Radix Combobox pattern)
- Card (no shadow by default; elevation opt-in)
- Dialog, Sheet (right/bottom), Popover, Tooltip
- Sidebar + SidebarItem
- CommandPalette (`⌘K`) — Radix Command primitive
- Toast — one at a time, top-right, 4s auto-dismiss
- Badge, Chip, Avatar
- Skeleton (shimmer uses `--surface-raised`, never the accent)
- EmptyState (illustration-free; a single Lucide icon + one-line hint + one CTA)

### 5.3 Do-not-use list

- No icon-only buttons without a `aria-label` and visible tooltip on hover.
- No `<select>` native element for important choices — use Radix Select for theme consistency.
- No 3rd-party modal libraries beyond Radix Dialog.
- No emoji in UI surfaces; only in user-authored content.

---

## 6. Motion

### 6.1 Durations

| Token | ms | Use |
|---|---|---|
| `--motion-fast` | 80 | Hover state, focus ring animate-in |
| `--motion-base` | 120 | State change (card flip, citation expand) |
| `--motion-med` | 150 | Sidebar expand, panel slide-in |
| `--motion-slow` | 300 | Sheet, modal, bottom-sheet on mobile |

### 6.2 Easing

- Enter: `cubic-bezier(0, 0, 0.2, 1)` (decelerate)
- Exit: `cubic-bezier(0.4, 0, 1, 1)` (accelerate)
- Symmetrical: `cubic-bezier(0.4, 0, 0.2, 1)`
- Mobile swipe-to-rate (Review): spring via Framer Motion `{stiffness: 300, damping: 28}` — the only place springs are allowed.

### 6.3 What does **not** animate

- Command palette open/close (instant)
- List reorder in library (instant)
- Graph layout recalculation mid-flight
- Text rendering / font swap
- Streaming LLM tokens — no per-token animation; a single pulsing cursor at the insertion point is the only moving element
- Theme switch (instant; no fade — we rely on `color-scheme` to retint natively)

### 6.4 Reduced motion

Respect `prefers-reduced-motion: reduce` globally. Durations collapse to `0ms`; springs → instant. Pulsing cursor becomes a static underscore.

---

## 7. Information architecture

### 7.1 Desktop (Brain runs at `localhost:3000`)

**Layout:** left sidebar (240px expanded, 48px collapsed) + main pane + optional right panel (chat, related, GenLink preview).

**Sidebar sections (top-to-bottom):**
1. Workspace header (app name + settings icon)
2. **Inbox** — capture landing; newly-added items awaiting review
3. **Library** — all items; filter chips at top
4. **Collections** — manual + auto-clusters; drag-to-arrange
5. **Tags** — hierarchical (`/` separator), collapsible
6. **Ask** — chat threads, most-recent-first
7. **GenPages** — list of generated pages
8. **Flows** — learning journeys
9. **Review** — badge with due count
10. **Explore** — graph view entry
11. *(divider)*
12. Settings · Command palette hint (`⌘K`) · Theme toggle

Default sidebar state: **collapsed** (icons only). Expand on hover or `⌘/`.

**Command palette** (`⌘K`): global search + navigate + action. Indexes items, collections, tags, settings, and every action (`Capture URL`, `New GenPage`, `Start Flow`, `Backup now`…). Results grouped by type. Arrow keys navigate; Enter invokes.

### 7.2 Mobile (Android Capacitor WebView)

**Layout:** bottom nav (5 items, 56px tall) + main pane + top app bar (48px).

Bottom nav items (left-to-right):
1. **Home** (inbox + suggested cards)
2. **Library**
3. **+ Capture** (centered FAB, opens capture sheet — paste URL, pick PDF, write note, open camera for OCR)
4. **Ask**
5. **Review**

Explore (graph) and GenPage/Flow/Settings are reached via the Home screen or top-bar overflow menu. Graph on mobile is replaced with a *related items* list, per §10.

**Share-sheet landing:** Android shares intent → Brain appears in share sheet → tap → Brain opens to a single-screen capture form pre-filled with the shared URL/text, and a primary "Add to Brain" button. Dismiss returns to the originating app. No extra screens.

### 7.3 Keyboard shortcuts (desktop)

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘/` | Toggle sidebar |
| `⌘J` | Jump to Ask |
| `⌘N` | New capture |
| `⌘\` | Toggle right panel |
| `1 / 2 / 3 / 4` | Rate card in Review mode |
| `Space` | Show answer in Review |
| `g i` | Go to Inbox |
| `g l` | Go to Library |
| `g r` | Go to Review |
| `g e` | Go to Explore |
| `?` | Show keyboard shortcuts |

---

## 8. Per-feature UX patterns

### 8.1 Capture

- **Instant-capture with deferred enrichment.** Paste URL → Enter → item appears in Inbox with `enriching…` state → summary/category/tags stream in. Never block the UI on the LLM.
- **Global quick-capture** (`⌘N`): modal slides in from top, single input, infers URL vs note, saves on Enter.
- **Drag-and-drop PDF** anywhere in the app (full-screen dropzone appears on dragover).
- **Inline progress indicator** on the item card (thin bar, top) during enrichment — no spinner.
- **Android share-sheet screen**: one field, one button, no extras.

### 8.2 Organize

- **Sidebar lists both manual and AI-suggested clusters**, with a subtle `sparkle` icon distinguishing auto.
- **Chip-style tag suggestions** while you're naming/saving an item; click to accept.
- **Bulk-select via long-press on mobile / shift-click on desktop** → multi-tag, multi-move, multi-delete.
- **Hierarchical tags** with `/` separator in the tag chip; collapse/expand per level in sidebar.

### 8.3 Consume (item detail)

- **Dual-pane by default**: original text (Charter, 17px, 68ch) on the left; sticky outline + AI digest on the right.
- **Progressive summary**: one-sentence → paragraph → full; reveal on click-to-expand.
- **Highlight-to-annotate**: select text → floating menu → highlight / add note / send to chat. Highlights stored as ranges with a color tag.
- **Focus mode**: `F` key collapses sidebar + right pane; Charter + 72ch center column.
- **Top-of-viewport progress bar** (2px, accent color) shows scroll progress.

### 8.4 Ask (RAG chat)

- **Two entry points**: global library chat (sidebar → Ask) and per-item chat (right panel of item detail).
- **Citation chips** appear below every answer sentence that used retrieval. Hover/tap expands into a source card (title + excerpt + link).
- **Streaming tokens** with a single pulsing cursor; no per-token animation.
- **Source panel** auto-opens alongside chat showing ranked retrieved cards (top 5).
- **"Ask about this highlight"** contextual button seeds the chat input from a highlight or selection.

### 8.5 Generate

**GenPage** (persistent AI-written pages):
- **Outline-first skeleton** renders immediately; sections stream in one by one.
- Each section has a hover **`regenerate`** icon and an inline **expand/collapse** toggle.
- Inline citations are the same chips as Ask; citation density is visible as a subtle gutter indicator.

**GenLink** (clickable-word sub-pages — the novel primitive):
- Meaningful noun phrases are underlined with the accent color at 30% opacity.
- Click → **side-card panel** slides in from the right (not full navigation). Panel width 420px.
- Spinner on first load; content is a mini-summary + related items + keep-reading CTA.
- **Recursive**: GenLinks inside sub-pages are also clickable; panel stacks as breadcrumbs.
- Panel persists until dismissed (`Esc` or click-outside).

**Flow** (multi-step learning journey):
- **Full-screen stepper**: "Step 1 of 7" at top; one section visible at a time; `Continue` button at bottom-right (keyboard: `Enter`).
- Progress persists across sessions; reopen returns to current step.
- End screen: summary + suggested next Flow + "convert to review cards" button.

### 8.6 Review (SRS)

- **Keyboard-first**: `Space` reveals answer; `1/2/3/4` rate (Again/Hard/Good/Easy).
- **Card surfaces the source**: top strip shows item title + small snippet of original context; cue + answer below.
- **Session end screen**: retention curve (14-day sparkline), streak, and "add more from this source" CTA.
- **Sidebar due-count badge** is always visible — surface without nagging.
- **Mobile**: swipe-right = knew it, swipe-left = missed it; tap to reveal. Spring physics on swipe.

### 8.7 Explore (graph)

- **Force-directed graph** (d3-force) with node color = collection; size = connection count.
- **Local graph mode** (default when opening from an item): only 1–2 hops shown.
- **Zoom-to-fit** on load; `⌘+scroll` zoom; click-drag pan.
- **Filter rail** on the right: toggle tags/collections/date to thin the graph.
- **Click node** opens that item in the main pane without closing the graph.
- **Accessible-view toggle**: parallel table view of items + connections as columns; every D3 node has `aria-label`.
- **Mobile**: replaced with a related-items list.

### 8.8 Integrate (Obsidian sync)

- Vault path configured in Settings → opens a folder picker → Brain writes `./<vault>/<category>/<slug>.md`.
- Frontmatter schema (open, standard):
  ```yaml
  ---
  title: "…"
  source: "https://…"
  captured: 2026-05-07T18:22:00Z
  tags: [productivity, ai]
  brain_id: 41f0-…
  ---
  ```
- **Two-way sync status** per item: small icon (synced · pending · conflict).
- **Conflict resolution** picker in Settings: Brain-wins default / Obsidian-wins / manual inbox.
- **Wikilinks** `[[Title]]` auto-generated between items that reference each other (based on embeddings + shared tags).

---

## 9. Empty, loading, error, offline states

Every screen must define all four states. Defaults:

- **Empty:** one Lucide icon at 32px in `--text-muted`, a single one-line hint, one primary CTA button. No illustrations.
- **Loading:** Skeletons matching the final layout for the first 800ms; then a subtle shimmer using `--surface-raised`. Never a full-screen spinner.
- **Error:** plain-language explanation + "Try again" + "Copy details" button (copies stack/context to clipboard).
- **Offline / Mac unreachable** (Android APK specifically): a calm message — "Brain is asleep on your Mac. Reconnect when on your home network." + retry + "Open cached library" button (read-only cache, v0.5+ stretch).

---

## 10. Mobile-specific rules (Android / Capacitor)

- Use `safe-area-inset-top/bottom/left/right` CSS env vars for notch + gesture-bar padding.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- Disable rubber-band `overscroll-behavior: none` globally.
- Tap targets ≥ 44px on any interactive element.
- Body font-size floor 16px — **do not scale down on mobile.** Respect Android accessibility font-size via `rem`.
- Replace graph view with related-items list.
- Long-press for bulk-select (standard Android convention).
- System back gesture mapped to router `back()`; command palette closes on first back.

---

## 11. Accessibility non-negotiables

- Contrast: **4.5:1** for all text vs its direct background; **3:1** for large text (>18px) and UI icons.
- Focus ring: 2px solid `--accent-9`, 2px offset, visible on all interactive elements. Never `outline: none` without a visible replacement.
- Keyboard: every interactive element reachable via Tab; modals trap focus; command palette is the escape hatch.
- Streaming output wrapped in `aria-live="polite"` (never `assertive`).
- GenPage sections are proper heading hierarchy (`h2` → `h3`); not visual-only bold.
- Color alone must not encode meaning — pair with icon or shape (citation chip has icon and color).
- Graph view ships with an accessible parallel table view.
- Respect `prefers-reduced-motion: reduce`.

---

## 12. Token file (canonical location)

All tokens above are expressed once in `src/styles/tokens.css` as CSS variables on `:root` and `:root[data-theme="dark"]`. Tailwind v4 consumes the same variables via `@theme { --color-bg: var(--bg); ... }`. Never hardcode a hex value in a component — read a token.

---

## 13. Theme toggle behavior

- Default: **system preference** (via `prefers-color-scheme`).
- User override: Settings → Appearance → Theme (System / Light / Dark).
- Persistence: SQLite `settings.appearance.theme` + mirror to a `theme` cookie for SSR (avoids FOUC).
- Switching is instant; no fade.
- SSR: the layout reads the `theme` cookie and sets `<html data-theme>` on the server to render the correct palette on first paint.

---

## 14. Reference gallery

1. `linear.app/design` — motion, color, component philosophy.
2. `vercel.com/design/color` — neutral scale + single accent in practice.
3. `radix-ui.com/colors` — canonical palette (slate + indigo).
4. `github.com/shadcn-ui/ui` — CSS-variable theming pattern.
5. Readwise Reader iOS (Mobbin) — dual-pane consume UX.
6. Things 3 iOS (Mobbin) — ambient calm + bottom-nav.
7. `ia.net/topics/on-iA-Writer-5s-design` — editorial minimalism.
8. Obsidian local-graph docs — graph sidebar UX.
9. `typescale.com` — lock Inter + Charter into a consistent modular scale.
10. Untitled UI Figma community file — sidebar + content + dark/light variants.

---

## 15. Acceptance checklist (every new screen)

Before merging a feature phase, confirm:

- [ ] Uses only tokens from §2–§4 (grep: no raw hex in component code)
- [ ] Keyboard-navigable; focus ring visible
- [ ] Empty / loading / error / offline states all defined
- [ ] Works in dark + light
- [ ] Meets contrast ratios (`axe` clean)
- [ ] Respects `prefers-reduced-motion`
- [ ] Mobile layout adapts (bottom nav, 16px body floor, safe-area insets)
- [ ] Has at least one keyboard shortcut registered in `⌘K` / `?` screen
- [ ] Screen reader pass: headings hierarchical, `aria-live` on streaming output, icon-only buttons labeled

---

**End of design system. Version: v0.1.0-design.**
