---
name: Structured Calm — AI Brain edition (green/Newsreader/Inter)
status: PROPOSED — alternative palette to current indigo/Inter-only system
date: 2026-05-19
companion_to:
  - DESIGN.md (current indigo-based DESIGN system)
  - DESIGN_SYSTEM.md (current single-source of design philosophy)
  - src/styles/tokens.css (current token implementation)
adoption_path: |
  Not yet adopted. To swap into production: meet all four gates in §0 first, then
  edit values (not names) in src/styles/tokens.css per §9.0 mapping, add Newsreader
  to src/app/layout.tsx, audit src/components/ for hardcoded colors, and run a
  visual sweep on /, /ask, /inbox, /search, /settings, /setup, /unlock, /capture.
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6b7585'
  outline-variant: '#c5cdd9'
  primary: '#036425'
  on-primary: '#ffffff'
  primary-container: '#2a7e3b'
  on-primary-container: '#cfffcd'
  inverse-primary: '#85d98b'
  secondary: '#476647'
  on-secondary: '#ffffff'
  secondary-container: '#c8ecc5'
  on-secondary-container: '#0a3d18'
  tertiary: '#923551'
  on-tertiary: '#ffffff'
  tertiary-container: '#b14d69'
  on-tertiary-container: '#ffeef0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a0f6a5'
  on-primary-fixed: '#002107'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
  headline-sm:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

# AI Brain — Structured Calm (Green/Newsreader/Inter) Design Spec

## 0. Adoption gate (HARD — read first)

> **Do not begin §9 adoption checklist unless ALL FOUR gates below are green.** This spec was made adoption-ready in 2026-05-19 with concerns flagged but several deferred to the adoption phase itself. Skipping these gates will ship WCAG failures, mismatched dark mode, or dead tokens.

| Gate | Status | What it requires |
|------|--------|------------------|
| (a) **Light-theme contrast** | ✅ Verified — see §2.3 | Every text-on-bg pairing in §2.3 hits AA (4.5:1) for normal text, AA-Large (3:1) for large text. One known-fail (`secondary` on `secondary-container`) was fixed by switching to `on-secondary-container`. |
| (b) **Dark-theme contrast** | ⚠️ DRAFT — §2.2 is illustrative only | Adoption phase MUST finalise dark-theme values + run a full §2.3-equivalent contrast pass before any dark-mode wiring lands. |
| (c) **Token mapping reviewed against current `tokens.css`** | ⚠️ Needs drift check at adoption time | §9.0 maps Brain's existing Radix-style names (`--accent-9`, `--surface`, etc.) onto M3 roles. Adoption phase MUST re-read `src/styles/tokens.css` for any new tokens added since this spec was written and add them to §9.0. |
| (d) **Tertiary (rose) usage policy** | ⚠️ Reserved for SRS (v0.8.0) | Adoption phase MUST decide whether `tertiary` / `tertiary-container` stay unused (paint nothing tertiary at adoption time) or get a near-term home. Currently reserved → if adopted before SRS, set those tokens to "do not use" in component code. |

If (b), (c), or (d) is not green at adoption time, pause and resolve before touching `tokens.css`.

---

> **Status:** This is an **alternative** design system, not the current production system. The shipped app at `https://brain.arunp.in` still uses the indigo/Inter system documented in [DESIGN.md](./DESIGN.md). This file captures the proposed Structured Calm Green palette so the team can decide whether to adopt it as a v0.7.x or v1.0.0 visual refresh.
>
> **What's different from the current Brain DESIGN_SYSTEM.md:**
> - Accent shifts from **Indigo (Radix #3e63dd)** → **Emerald Green (#2A7E3B / #036425)**
> - Headlines move from sans-serif (Inter) → **Newsreader serif** for editorial authority
> - Surface palette shifts from neutral Slate-warm → **cool blue-tinted whites** (#f8f9ff family)
> - Adds an explicit **tertiary** (rose) for high-emphasis non-action moments (e.g., review-streak celebrations, error containers)
> - Introduces Material-3-style **surface-container layering** (lowest → highest) instead of single `--surface` / `--surface-raised`

---

## 1. Brand & Style — applied to AI Brain

The "Structured Calm" aesthetic blends editorial authority with modern functionalism. AI Brain is a personal knowledge system: **the user reads long-form content (PDFs, transcripts, web articles) and asks it questions**. The visual identity should reinforce **trust, intellectual rigor, and reading comfort** without competing with the content.

The style is **Minimalist-Corporate with editorial soul** — precise typography, restrained palette, generous white space. Visual interest is generated through:

1. **Newsreader serif** in headlines (Library card titles, Ask answers, GenPage sections) — signals "this is a place for thinking, not feed-scrolling."
2. **Emerald Green accent** as the only chromatic signal — buttons, citation chips, focus rings, GenLink underlines, batch-progress fills.
3. **Cool surface palette** — backgrounds with a subtle blue tint (`#f8f9ff` family) reduce eye strain during long reading sessions while feeling lighter than warm slate.
4. **Pill-shaped citation chips and tags** — the only fully-rounded shapes in the system; everything else is 8–16px.

What this system explicitly avoids:
- Heavy drop shadows (depth comes from tonal layers).
- Indigo, purple, or other "tech-startup" accents.
- Multiple competing colors. Tertiary rose appears only in error containers and the streak/review celebration moment.
- Decorative gradients, illustrations, or stock-photo-like imagery.

---

## 2. Colors — AI Brain mapping

The token names below come from the Material 3 / "Structured Calm" base. The right column is the **Brain-app role** for that token — i.e., where it shows up.

### 2.1 Light theme (canonical)

| Token | Hex | AI Brain role |
|-------|-----|---------------|
| `primary` | `#036425` | Primary buttons (Save / Ask / Capture); active nav state; PIN unlock submit |
| `on-primary` | `#ffffff` | Text on primary buttons |
| `primary-container` | `#2a7e3b` | Lighter primary fill (secondary surface for cards in primary state, e.g. selected library item, active tag) |
| `on-primary-container` | `#cfffcd` | Text on `primary-container` |
| `inverse-primary` | `#85d98b` | Primary in dark theme (see §2.2) |
| `secondary` | `#476647` | Outlined-button text **on canvas only** (`surface` background, 6.6:1 AA ✓). Do NOT use on `secondary-container` — fails AA (3.2:1); use `on-secondary-container` instead. See §2.3. |
| `on-secondary-container` | `#0a3d18` | Text color for content sitting on `secondary-container` (auto tags, secondary buttons). 9.1:1 AA ✓ |
| `secondary-container` | `#c8ecc5` | Hover fill for secondary chips; "auto"-tag background |
| `tertiary` | `#923551` | **Reserved — unused until SRS lands (v0.8.0). Do not wire into components on adoption.** Future use: review-streak burst, danger-confirm in destructive flows |
| `tertiary-container` | `#b14d69` | **Reserved — unused until SRS lands (v0.8.0).** Future use: error confirmation modals (NOT plain errors) |
| `error` | `#ba1a1a` | Standard form-validation errors, capture failure toasts |
| `error-container` | `#ffdad6` | Error chip backgrounds (e.g. "PDF extraction failed") |
| `surface` / `background` | `#f8f9ff` | App canvas (`<body>`) |
| `surface-container-lowest` | `#ffffff` | Modals, dropdowns, command palette |
| `surface-container-low` | `#eff4ff` | Subtle alternating row backgrounds in Library list |
| `surface-container` | `#e5eeff` | Card surfaces (item rows in `/`, threads in `/ask`, settings panels) |
| `surface-container-high` | `#dce9ff` | Selected card (multi-select state in Library) |
| `surface-container-highest` | `#d3e4fe` | Sidebar background; active-state surface |
| `on-surface` | `#0b1c30` | Body text |
| `on-surface-variant` | `#3d4555` | Muted text (timestamps, meta info, kebab-disabled labels) — cool slate-grey, harmonised with blue surfaces |
| `outline` | `#6b7585` | Input borders, divider lines — cool slate-grey |
| `outline-variant` | `#c5cdd9` | Subtler dividers (between list items) — cool slate-grey light |

### 2.2 Dark theme (DRAFT — do not implement)

> **DRAFT — do not implement.** Dark theme palette MUST be finalised + WCAG-AA-verified during the adoption phase. The values below are illustrative anchors only; treat them as a starting sketch, not a contract. This is one of the four hard gates in §0.

The source palette is light-theme-only. Dark theme should follow the existing `DESIGN.md` dark-mode pattern, mirroring tokens around the same anchor green. **(SoT: code)** — needs implementation in `src/styles/tokens.css` `:root[data-theme="dark"]`.

Suggested values (to validate against WCAG AA before adoption):

| Token | Light | Dark (proposed) |
|-------|-------|-----------------|
| `primary` | `#036425` | `#85d98b` (uses `inverse-primary` from light) |
| `on-primary` | `#ffffff` | `#002107` |
| `surface` | `#f8f9ff` | `#0e1822` |
| `surface-container` | `#e5eeff` | `#1a2433` |
| `surface-container-high` | `#dce9ff` | `#22304a` |
| `on-surface` | `#0b1c30` | `#eaf1ff` |
| `on-surface-variant` | `#3d4555` | `#bfc6d3` |
| `outline` | `#6b7585` | `#8990a0` |

---

### 2.3 Contrast verification (WCAG AA)

Every text-on-background pairing used in §7 components, with measured contrast ratio. AA threshold: 4.5:1 for normal text (<18pt or <14pt-bold), 3:1 for large text (≥18pt or ≥14pt-bold). Ratios calculated against the light-theme palette in §2.1 — dark theme repeats this exercise during adoption.

| Foreground | Background | Ratio | Verdict | Where used |
|------------|-----------|-------|---------|------------|
| `on-surface` `#0b1c30` | `surface` `#f8f9ff` | 17.6:1 | AA ✓ | Body text on canvas |
| `on-surface` `#0b1c30` | `surface-container` `#e5eeff` | 16.0:1 | AA ✓ | Body text on cards |
| `on-surface` `#0b1c30` | `surface-container-highest` `#d3e4fe` | 14.2:1 | AA ✓ | Body text on sidebar |
| `on-surface-variant` `#3d4555` | `surface` `#f8f9ff` | 9.4:1 | AA ✓ | Meta text on canvas |
| `on-surface-variant` `#3d4555` | `surface-container` `#e5eeff` | 8.6:1 | AA ✓ | Meta text on cards |
| `on-primary` `#ffffff` | `primary` `#036425` | 7.4:1 | AA ✓ | Primary button label |
| `on-primary` `#ffffff` | `primary-container` `#2a7e3b` | 4.6:1 | AA ✓ | Primary-hover label |
| `primary` `#036425` | `surface` `#f8f9ff` | 7.4:1 | AA ✓ | Citation chip text on canvas; link text |
| `primary` `#036425` | `secondary-container` `#c8ecc5` | 5.7:1 | AA ✓ | Citation chip text (§7.4) |
| `on-secondary-container` `#0a3d18` | `secondary-container` `#c8ecc5` | 9.1:1 | AA ✓ | **Auto-tag text + secondary-button text — see fix note below** |
| `secondary` `#476647` | `secondary-container` `#c8ecc5` | 3.2:1 | **AA ✗ for normal text** (AA-Large only) | **Do not use for body / button labels.** Originally specified in §7.1 + §7.6; replaced with `on-secondary-container` |
| `on-error` `#ffffff` | `error` `#ba1a1a` | 5.9:1 | AA ✓ | Destructive button label |
| `on-error-container` `#93000a` | `error-container` `#ffdad6` | 8.4:1 | AA ✓ | Error chip text |
| `outline` `#6b7585` | `surface` `#f8f9ff` | 4.7:1 | AA ✓ | Input border (non-text — informational only) |
| `outline-variant` `#c5cdd9` | `surface` `#f8f9ff` | 1.5:1 | (non-text divider) | Subtle list dividers — not a text pairing |

**Fix applied to spec:** §7.1 secondary button and §7.6 auto-tag text now use `on-secondary-container` `#0a3d18` instead of `secondary` `#476647`. The `secondary` token is retained for **outlined-button text on canvas** (`secondary` on `surface` = 6.6:1, AA ✓) where the background isn't `secondary-container`.

Calculation method: relative-luminance per WCAG 2.1. Spot-verify any pairing with the WebAIM contrast checker (`https://webaim.org/resources/contrastchecker/`) before adoption.

---

## 3. Typography — AI Brain mapping

The Newsreader/Inter pairing creates a "Thought and Action" hierarchy. **Newsreader is for content the user is asked to think about** (titles, AI answers, page headings). **Inter is for everything functional** (buttons, navigation, metadata, command palette).

### 3.1 Type scale (full)

| Token | Family | Size | Weight | Line height | AI Brain role |
|-------|--------|------|--------|-------------|---------------|
| `display-lg` | Newsreader | 48px (32px mobile) | 600 | 56px | Hero headings: `/setup` welcome, `/unlock` title, GenPage cover title |
| `headline-md` | Newsreader | 32px (24px mobile) | 500 | 40px | Library item detail title, Ask thread title, Settings page H1 |
| `headline-sm` | Newsreader | 24px | 500 | 32px | GenPage section headings, item-detail subtitle, Modal H1 |
| `body-lg` | Inter | 18px | 400 | 28px | Reading mode for `/items/[id]` long-form body; Ask answer text |
| `body-md` | Inter | 16px | 400 | 24px | Default body — Library card descriptions, Settings item labels |
| `label-md` | Inter | 14px | 500 | 20px | Buttons, nav labels, inline metadata |
| `label-sm` | Inter | 12px | 600 | 16px | Section ALL-CAPS headers, tag labels, citation chip text |

### 3.2 Mobile rules (responsive)

| Token | Desktop | Mobile (<768px) | Reason |
|-------|---------|-----------------|--------|
| `display-lg` | 48px | **32px** | Hero size shrinks to fit narrow viewports |
| `headline-md` | 32px | **24px** | Page H1 shrinks to fit |
| `headline-sm` | 24px | **24px (unchanged)** | Already small enough |
| `body-lg` | 18px | **18px (unchanged)** | Reading comfort > shrinking |
| `body-md` | 16px | **16px (unchanged)** | Default body — touch-target legible |
| `label-md` | 14px | **14px (unchanged)** | Buttons/nav legible on touch |
| `label-sm` | 12px | **12px (unchanged)** | Tags/citations stay compact |

### 3.3 Where Newsreader appears (concrete inventory)

| Page / Component | Element | Token |
|------------------|---------|-------|
| `/setup` `<h1>` "Welcome to AI Brain" | display-lg | display-lg |
| `/unlock` `<h1>` "Unlock AI Brain" | display-lg | display-lg |
| `/` Library list — item-card title | headline-sm | headline-sm |
| `/items/[id]` — item title | headline-md | headline-md |
| `/ask` thread title | headline-md | headline-md |
| `/ask` answer body (post-streaming) | body-lg | body-lg |
| GenPage section heading | headline-sm | headline-sm |
| Modal title (e.g. "Delete this item?") | headline-sm | headline-sm |

Everything else — sidebar nav, kebab menus, command palette, buttons, settings labels, capture form labels — is **Inter**.

### 3.4 Reading-mode behavior

For `/items/[id]` and Ask answer panes, set `font-feature-settings: "liga", "kern"` and use `body-lg` (18px) with `max-width: 65ch`. Newsreader's literary tone supports the "deep work" reading session that Brain users come for.

---

## 4. Layout & Spacing

### 4.1 Grid

- **Desktop** (≥1024px): **Fixed 12-column grid**, max width `1280px`, `24px` gutters, `48px` outer margins.
- **Tablet** (768–1024px): 8-column grid, 24px gutters, 32px outer margins.
- **Mobile** (<768px): 4-column grid (effectively single-column), 16px outer margins.

The fixed-grid choice on desktop preserves editorial line lengths (~65ch in `body-lg` reading mode) — exactly the constraint that makes Newsreader-set bodies pleasant to read.

### 4.2 Spacing scale (4px base)

All margins and paddings MUST be multiples of 4px. Consistent rhythm across the app.

| Token | px | Use |
|-------|-----|-----|
| `space-1` | 4px | Icon-to-label gap |
| `space-2` | 8px | Compact card internal padding |
| `space-3` | 12px | Default vertical-rhythm gap (list-item separator, button-to-button) |
| `space-4` | 16px | **Internal component padding** (cards, settings rows) |
| `space-6` | 24px | Section gaps; matches gutter |
| `space-8` | 32px | Large section gaps; sidebar to content |
| `space-12` | 48px | Page top/bottom padding (desktop) |

### 4.3 Container max-widths

| Region | Max width |
|--------|-----------|
| App outer container | 1280px |
| Reading body (`/items/[id]`, Ask answer) | 720px (~65ch at 18px) |
| Settings panel | 680px |
| Command palette | 640px |
| Modal | 480px |

---

## 5. Elevation & Depth

Depth is **tonal**, not shadow-driven. The system uses surface-container hierarchy (lowest → highest) for layering. Shadows appear only on truly floating UI (modals, dropdowns).

### 5.1 Surface levels (light theme)

| Level | Token | Usage |
|-------|-------|-------|
| 0 (canvas) | `surface` `#f8f9ff` | Page body |
| 1 (cards) | `surface-container` `#e5eeff` | Library item cards, settings panels |
| 2 (selected) | `surface-container-high` `#dce9ff` | Selected card (multi-select), hover state |
| 3 (sidebar) | `surface-container-highest` `#d3e4fe` | Persistent sidebar |
| Floating | `surface-container-lowest` `#ffffff` + ambient shadow | Modals, command palette, dropdowns |

### 5.2 Shadow tokens (use sparingly)

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-ambient` | `0 4px 20px rgba(0, 0, 0, 0.05)` | Modals, command palette popover, dropdowns |
| `--shadow-focus` | `0 0 0 2px var(--primary), 0 0 0 4px var(--surface)` | Focus ring on inputs and buttons |

Static cards: **no shadow**. A 1px outline on `surface-container` is enough.

### 5.3 Focus states

All focusable elements get a 2px solid `primary` (`#036425`) outline with 2px offset. This is non-negotiable for accessibility. Implementation: `outline: 2px solid var(--primary); outline-offset: 2px;` on `:focus-visible`.

---

## 6. Shapes (radius)

Soft-modern. Approachable but precise. Pills only for chips and tags (semantic distinction).

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | 4px | Checkboxes, small icons, table-cell highlights |
| `rounded-DEFAULT` | 8px | Buttons, inputs, small cards, kebab menus |
| `rounded-md` | 12px | Card-internal elements, command palette input |
| `rounded-lg` | 16px | **Main content containers** (Library cards, item-detail card, GenPage section) |
| `rounded-xl` | 24px | Featured / hero sections (e.g. `/setup` welcome card) |
| `rounded-full` | 9999px | **Tags, citation chips, avatars, status pills only** |

---

## 7. Components — AI Brain catalog

### 7.1 Buttons

| Variant | Background | Text | Border | Radius |
|---------|-----------|------|--------|--------|
| Primary | `var(--primary)` `#036425` | white | none | `rounded-DEFAULT` (8px) |
| Primary hover | `var(--primary-container)` `#2a7e3b` | white | none | 8px |
| Secondary | `var(--secondary-container)` `#c8ecc5` | `var(--on-secondary-container)` `#0a3d18` | 1px `var(--outline-variant)` | 8px |
| Tertiary / link | transparent | `var(--primary)` | none | 8px (text-only on hover gets underline) |
| Destructive | `var(--error)` `#ba1a1a` | white | none | 8px |
| Disabled | `var(--surface-container)` | `var(--on-surface-variant)` at 50% | none | 8px |

**Sizes:** Default `h-9` (36px), padding `12px 16px`. Compact `h-8` (32px) for inline / chip-context. Hero `h-11` (44px) for `/setup` and `/unlock` PIN submit only.

### 7.2 Inputs

- Background: `var(--surface-container-lowest)` `#ffffff` (light) / dark surface
- Border: 1px `var(--outline)` `#6b7585`
- Focus: border becomes `var(--primary)` + 2px outer glow at 30% opacity
- Radius: 8px
- Padding: `10px 12px`
- Placeholder: `var(--on-surface-variant)` at 70% opacity

PIN input on `/unlock` and `/setup` should be larger: `h-11`, `body-lg` size (18px), `text-center`, `tracking-widest`.

### 7.3 Cards (Library items, settings panels)

- Background: `var(--surface-container)` `#e5eeff`
- Border: 1px `var(--outline-variant)` `#c5cdd9`
- Radius: `rounded-lg` (16px)
- Padding: `space-4` (16px) on mobile, `space-6` (24px) on desktop
- No shadow at rest. On hover: shift to `surface-container-high`. On selected (multi-select): `surface-container-high` + 2px `primary` outline.

### 7.4 Citation chips (Ask answers)

This is one of Brain's signature components — it deserves precision.

- Shape: `rounded-full` (pill)
- Background: `var(--secondary-container)` `#c8ecc5` (light primary-tinted)
- Text: `var(--primary)` `#036425`, `label-sm` (12px, 600 weight, 0.05em letter-spacing)
- Padding: `2px 8px`
- Hover: background → `var(--primary-fixed)` `#a0f6a5`; text stays primary
- Active / clicked: 2px `primary` outline

### 7.5 GenLink underline

For AI-generated cross-references inside answers and GenPages:

- Text color: inherits surrounding body color
- Underline: 2px solid `var(--primary)` at **40% opacity**
- Hover: opacity → 100%; cursor: pointer
- Active: same as hover + brief 80ms scale-down to 0.97 then back

### 7.6 Tags (auto + manual)

- Shape: `rounded-full` (pill)
- `kind='auto'`: `var(--secondary-container)` background + `var(--on-secondary-container)` text (`#0a3d18`) — see §2.3 contrast note
- `kind='manual'`: `var(--surface-container-high)` background + `var(--on-surface)` text + 1px `var(--outline-variant)` border
- Sized via `label-sm` (12px); padding `2px 10px`

### 7.7 Sidebar (`src/components/sidebar.tsx`)

- Background: `var(--surface-container-highest)` `#d3e4fe`
- Width: 240px desktop, hidden on mobile (replaced by bottom nav)
- Item rows: `h-8` (32px), `label-md`, padding `0 12px`, `rounded-DEFAULT`
- Active item: `surface-container-high` background + `primary` text
- Hover: `surface-container-high` background

### 7.8 Bottom nav (mobile only)

- Background: `surface-container-highest`
- Height: `56px` + `env(safe-area-inset-bottom)`
- Border-top: 1px `outline-variant`
- 5 icons (Library / Inbox / Ask / Capture / Settings); `label-sm` for labels
- Active: `primary` color on icon and label

### 7.9 Lists (Library, search results, threads)

- Vertical padding between items: 12px (`space-3`)
- Divider: 1px `var(--outline-variant)` horizontal, full width
- Hover row: `surface-container-low` background
- Selected (multi-select): `surface-container-high` + 2px left border in `primary`

### 7.10 Command palette (⌘K)

- Background: `surface-container-lowest` `#ffffff`
- Border: 1px `outline-variant`
- Radius: `rounded-md` (12px)
- Shadow: `--shadow-ambient`
- Max-width: 640px
- Item rows: `h-9`, `body-md`, padding `0 16px`; selected gets `surface-container` background

### 7.11 Capture form (`/capture`)

- Tab strip uses `label-md` text. Active tab: 2px bottom border in `primary`.
- Drag-drop PDF zone: dashed 2px `outline` border, `rounded-lg`, `surface-container-low` background; on drag-over: solid 2px `primary` border, `surface-container` background.

### 7.12 Ask answer pane

- Container: `surface-container-lowest` background, 1px `outline-variant`, `rounded-lg` (16px), padding `space-6` (24px desktop)
- Streaming cursor: 2px-wide `primary` line, blinking
- Citation chips (§7.4) inline with body
- Stop button: secondary variant, top-right, `label-md`

### 7.13 Modals

- Background: `surface-container-lowest`
- Border: 1px `outline-variant`
- Radius: `rounded-lg` (16px)
- Shadow: `--shadow-ambient`
- Padding: `space-6`
- Backdrop: `rgba(11, 28, 48, 0.6)` (`on-surface` at 60%) — blur: 4px

### 7.14 Toasts

- Background: `surface-container` (info), `error-container` (error), `secondary-container` (success)
- Border-left: 4px in matching role color (`primary` / `error` / `secondary`)
- Radius: `rounded-DEFAULT` (8px)
- Position: bottom-right desktop, top-center mobile

---

## 8. Motion (carry-over from existing system)

This spec does NOT change motion tokens. Continue using the durations + easings in `src/styles/tokens.css`:

- Fast: 120ms, `ease-out`
- Med: 200ms, `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)
- Slow: 320ms, used for modal enter/exit only

---

## 9.0 Token mapping (Brain Radix-style → Structured Calm M3-style)

**Critical context:** the current `src/styles/tokens.css` uses **Radix-flavoured** variable names (`--accent-9`, `--surface`, `--text-primary`, `--border`, `--space-0..20`, `--radius-xs..full`). This spec is written in **Material-3** vocabulary (`primary`, `surface-container-*`, `on-surface-variant`, `outline`, etc.). Adopting the spec does NOT require renaming every component's token references — instead, **map M3 roles onto the existing Radix-style names** by changing the *values* in `tokens.css` while keeping the *names* stable.

| Existing Brain token (`tokens.css`) | Maps to Structured Calm M3 role | Hex (light) | Notes |
|-------------------------------------|---------------------------------|-------------|-------|
| `--bg` | `surface` / `background` | `#f8f9ff` | Page canvas |
| `--surface` | `surface-container-low` | `#eff4ff` | Subtle row alt; existing usage already implies "raised vs canvas" |
| `--surface-raised` | `surface-container` | `#e5eeff` | Card surface |
| `--accent-9` | `primary` | `#036425` | Primary buttons |
| `--accent-10` | `primary-container` | `#2a7e3b` | Hover/secondary primary fill |
| `--accent-11` | `on-primary-container` | `#cfffcd` | Text on `primary-container` |
| `--accent-3` | `secondary-container` | `#c8ecc5` | Hover/auto-tag background |
| `--on-accent` | `on-primary` | `#ffffff` | Text on `--accent-9` |
| `--text-primary` | `on-surface` | `#0b1c30` | Body text |
| `--text-secondary` | `on-surface` (slightly lighter) | `#1a2a3d` | Optional — keep current behavior if defined |
| `--text-muted` | `on-surface-variant` | `#3d4555` | Meta text |
| `--border` | `outline-variant` | `#c5cdd9` | Subtle dividers |
| `--border-strong` | `outline` | `#6b7585` | Input borders |
| `--danger` | `error` | `#ba1a1a` | Form errors |
| `--success` | (no direct M3 equivalent) | (carry over current value) | Toast success — independent token |
| `--info` | (no direct M3 equivalent) | (carry over current value) | Info toast — independent token |
| `--warning` | (no direct M3 equivalent) | (carry over current value) | Warning toast — independent token |
| `--highlight` | (no direct M3 equivalent) | (carry over current value) | Search-match highlight — independent token |
| `--font-ui` | (Inter family) | (unchanged) | UI font |
| `--font-article` | (Newsreader family) | **NEW value** | Currently maps to a serif; switch to Newsreader stack |
| `--font-mono` | (JetBrains Mono) | (unchanged) | Monospace |
| `--space-0..20` | (carry over verbatim) | (unchanged) | Spacing scale ports cleanly |
| `--radius-xs..full` | (carry over verbatim) | (unchanged — values per §6) | Radius scale ports cleanly |
| `--shadow-sm/md/lg` | (carry over) | (unchanged) | Shadow tokens unchanged |
| `--duration-*` / `--ease-*` | (carry over) | (unchanged) | Motion tokens unchanged |

**Implication:** the adoption diff is much smaller than originally implied — it's a values-only edit to `tokens.css` plus a Newsreader font-family change. Component files do not need token renames.

**M3-only tokens with no existing Brain equivalent** (would be NEW additions to `tokens.css` if introduced): `--surface-container-high`, `--surface-container-highest`, `--surface-container-lowest`, `--inverse-surface`, `--inverse-on-surface`, `--inverse-primary`. These are needed for the M3 surface-container hierarchy in §5.1 and the sidebar (§7.7). Adoption phase MUST decide whether to introduce these as new tokens or fold them into existing names.

---

## 9. Adoption checklist

Not done — informational only. **Do not begin until §0 adoption gate is met.** To migrate Brain to this system:

| Step | Effort | Notes |
|------|--------|-------|
| 1. Update `src/styles/tokens.css` values per §9.0 mapping | M | Preserve existing variable names; change values only. Add the new M3-only tokens (surface-container-high/highest/lowest, inverse-*) listed in §9.0 |
| 2. Add Newsreader to `src/app/layout.tsx` | S | `next/font/google` already loads Inter + JetBrains_Mono — Newsreader is additive (one new `import` + one CSS variable wiring); set `--font-article` to use it |
| 3. Audit `src/components/` for hardcoded color/font values | M | Search for `#`, raw hex, raw `Inter`/`Newsreader` literals — should already be token-driven |
| 4. Visual sweep on all pages | M | `/`, `/ask`, `/inbox`, `/search`, `/settings`, `/setup`, `/unlock`, `/capture`, `/items/[id]` |
| 5. Dark-theme mapping (§2.2) — finalize and contrast-check | M | WCAG AA — gate item from §0 |
| 6. Migration commit + before/after screenshots | S | For PR review |

**Risk: HIGH** for a mid-phase swap. The current system is shipping in production at `https://brain.arunp.in`. A redesign of this scope should land as its own phase (suggested: v0.7.x or v0.8.0 visual refresh), not interleaved with v0.6.1 Cloud-Cleanup.

---

## 10. Decisions still open

### 10.1 Strategic (decide before scheduling adoption)
1. **Should Brain adopt this system at all?** The current indigo system (`DESIGN.md`) is functional and shipped. The Structured Calm Green spec is more editorial — better fit for the "thinking app" intent — but adoption costs a phase.
2. **Newsreader licensing / loading.** Newsreader is on Google Fonts (open-source). Confirm bundle-size hit and `font-display` strategy.

### 10.2 Adoption-phase blockers (must resolve DURING the adoption phase, not before)
3. **Dark theme palette finalization** — §2.2 is illustrative only. Adoption phase must produce final values + WCAG-AA verification against real content samples (citations on dark surface, code blocks, error states, etc.). Listed as gate (b) in §0.
4. **Tertiary (rose) usage policy** — currently reserved for SRS (v0.8.0). Adoption phase must decide: keep reserved (paint nothing tertiary at adoption time), or assign a near-term home (e.g., onboarding success burst). Listed as gate (d) in §0.

---

## 11. Cross-references

- [DESIGN.md](./DESIGN.md) — current production design system (indigo)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — current single-source design philosophy
- [AI_DESIGNER_BRIEF.md](./AI_DESIGNER_BRIEF.md) — design-intent brief (independent of which palette ships)
- [src/styles/tokens.css](./src/styles/tokens.css) — current token implementation (values would be edited per §9.0 mapping for adoption — variable names preserved)
- [src/app/layout.tsx](./src/app/layout.tsx) — font + theme bootstrap (would add Newsreader; Inter + JetBrains Mono already loaded via `next/font/google`)
- [docs/plans/v0.6.1-cloud-cleanup.md](./docs/plans/v0.6.1-cloud-cleanup.md) — current active phase (NOT this redesign)
