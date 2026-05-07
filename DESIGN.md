---
version: 0.1.0
name: AI Brain
description: AI Brain is a local-first personal knowledge app combining Recall.it's capture + SRS + graph features with Knowly's auto-organize + generative (GenPage / GenLink / Flow) features. The system is calm by default (the "Structured Calm" philosophy) with a ⌘K command palette as the power layer. Canvas is content-first — editorial typography (Inter for UI + Charter for long-form reading) on a Radix Slate neutral, single indigo accent used only for primary CTAs, links, focus rings, and the active nav item. Every token is defined in both light and dark. Buttons are {rounded.md} (8px) rectangles; cards are {rounded.lg} (12px); shadows are restrained and reserved for floating layers only. Motion is fast (80–150ms) and honors prefers-reduced-motion. The same design renders 1:1 in a Capacitor WebView on Android with a bottom-nav adaptation and 16px body-text floor. Companion artifact: DESIGN_SYSTEM.md (the operational design contract / acceptance checklist for every PR).

colors:
  # Accent (Radix Indigo) — used for primary CTAs, links, focus rings, active nav item ONLY
  primary: "#3E63DD"
  primary-hover: "#3A5CCC"
  primary-pressed: "#3A5BC7"
  primary-dark: "#5472E4"
  primary-dark-hover: "#6983EB"
  primary-dark-pressed: "#9EB1FF"
  primary-subtle-light: "#F0F4FF"
  primary-subtle-dark: "#182449"
  on-primary: "#FFFFFF"

  # Neutral surfaces (Radix Slate) — light
  bg-light: "#FBFCFD"
  surface-light: "#F8F9FA"
  surface-raised-light: "#FFFFFF"
  border-light: "#D7DBDF"
  border-strong-light: "#B9BBC6"

  # Neutral surfaces (Radix Slate) — dark
  bg-dark: "#111113"
  surface-dark: "#18191B"
  surface-raised-dark: "#1D1E20"
  border-dark: "#2B2D30"
  border-strong-dark: "#43484E"

  # Text — light
  text-primary-light: "#1C2024"
  text-secondary-light: "#60646C"
  text-muted-light: "#8B8D98"

  # Text — dark
  text-primary-dark: "#EDEEF0"
  text-secondary-dark: "#9BA1A6"
  text-muted-dark: "#60646C"

  # Semantic (used sparingly, only to encode meaning)
  success-light: "#2A7E3B"
  success-dark: "#63C174"
  warning-light: "#AB6400"
  warning-dark: "#F1A10D"
  danger-light: "#CE2C31"
  danger-dark: "#FF6369"
  info-light: "#00749E"
  info-dark: "#7CE2FE"

  # Highlight yellow (for user highlights on article body — both themes)
  highlight-light: "#FFF3B0"
  highlight-dark: "#4A3F10"

typography:
  hero-display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: -0.02em
  page-title:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.01em
  section-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: -0.01em
  heading-3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.40
  heading-4:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.55
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
  body-md-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.50
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  body-sm-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.43
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.33
  caption-strong:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
  button-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.00
  button-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.00
  # Long-form reading (Charter) — used only in item/article body, GenPage body, Flow step body
  article-body:
    fontFamily: Charter
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.60
  article-heading-1:
    fontFamily: Charter
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.30
  article-heading-2:
    fontFamily: Charter
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.35
  article-quote:
    fontFamily: Charter
    fontSize: 18px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.55
  # Monospace (JetBrains Mono) — code, IDs, keyboard shortcuts
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
  mono-kbd:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.00

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 48px
  section: 64px
  section-lg: 96px

shadow:
  # Light theme
  none: "none"
  sm-light: "0 1px 2px rgba(15, 18, 25, 0.06)"
  md-light: "0 6px 24px rgba(15, 18, 25, 0.08)"
  lg-light: "0 16px 48px rgba(15, 18, 25, 0.12)"
  # Dark theme — same layer semantics, tuned for dark canvas
  sm-dark: "0 1px 2px rgba(0, 0, 0, 0.40)"
  md-dark: "0 6px 24px rgba(0, 0, 0, 0.50)"
  lg-dark: "0 16px 48px rgba(0, 0, 0, 0.60)"

motion:
  duration-fast: 80ms
  duration-base: 120ms
  duration-med: 150ms
  duration-slow: 300ms
  ease-out: "cubic-bezier(0, 0, 0.2, 1)"
  ease-in: "cubic-bezier(0.4, 0, 1, 1)"
  ease-in-out: "cubic-bezier(0.4, 0, 0.2, 1)"

components:
  # --- Buttons ---
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: 36px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  button-primary-disabled:
    backgroundColor: "{colors.border-light}"
    textColor: "{colors.text-muted-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    border: "1px solid {colors.border-light}"
    height: 36px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: 32px
  button-destructive:
    backgroundColor: "{colors.danger-light}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: 36px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.body-sm-medium}"
    padding: "0"
    textDecoration: "none on rest, underline on hover"
  button-icon:
    backgroundColor: "transparent"
    rounded: "{rounded.md}"
    padding: "8px"
    width: 32px
    height: 32px
    ariaLabelRequired: true

  # --- Inputs ---
  text-input:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-sm}"
    border: "1px solid {colors.border-light}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    height: 36px
  text-input-focused:
    border: "1px solid {colors.primary}"
    boxShadow: "0 0 0 2px {colors.primary-subtle-light}"
  textarea:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-sm}"
    border: "1px solid {colors.border-light}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
    minHeight: 96px
  select:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-sm}"
    border: "1px solid {colors.border-light}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    height: 36px

  # --- Cards ---
  card-base:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    border: "1px solid {colors.border-light}"
    shadow: "none"
  card-item:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md} {spacing.lg}"
    border: "1px solid {colors.border-light}"
    minHeight: 88px
  card-item-hover:
    border: "1px solid {colors.border-strong-light}"
    backgroundColor: "{colors.surface-raised-light}"
  card-suggestion:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    border: "1px solid {colors.border-light}"
  card-empty-state:
    backgroundColor: "transparent"
    padding: "{spacing.xxl}"
    textAlign: "center"

  # --- Chips, Badges, Citations ---
  tag-chip:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
    border: "1px solid {colors.border-light}"
  tag-chip-active:
    backgroundColor: "{colors.primary-subtle-light}"
    textColor: "{colors.primary-pressed}"
    border: "1px solid {colors.primary}"
  citation-chip:
    backgroundColor: "{colors.primary-subtle-light}"
    textColor: "{colors.primary-pressed}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    icon: "{lucide.book-open}"
    iconSize: 12px
  due-badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.full}"
    padding: "2px 6px"
    minWidth: 20px
    textAlign: "center"
  enriching-pill:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    icon: "{lucide.sparkles}"
    iconAnimation: "pulse 2s"
  status-dot-synced:
    color: "{colors.success-light}"
    size: 8px
    rounded: "{rounded.full}"
  status-dot-pending:
    color: "{colors.warning-light}"
    size: 8px
    rounded: "{rounded.full}"
  status-dot-conflict:
    color: "{colors.danger-light}"
    size: 8px
    rounded: "{rounded.full}"
  kbd:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.mono-kbd}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
    border: "1px solid {colors.border-light}"
    borderBottomWidth: 2px

  # --- Navigation ---
  sidebar:
    backgroundColor: "{colors.surface-light}"
    borderRight: "1px solid {colors.border-light}"
    widthCollapsed: 48px
    widthExpanded: 240px
    transition: "width {motion.duration-med} {motion.ease-in-out}"
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.body-sm-medium}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs} {spacing.sm}"
    height: 32px
    iconSize: 16px
  sidebar-item-hover:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-subtle-light}"
    textColor: "{colors.primary-pressed}"
  bottom-nav:
    backgroundColor: "{colors.surface-raised-light}"
    borderTop: "1px solid {colors.border-light}"
    height: 56px
    paddingBottom: "env(safe-area-inset-bottom)"
  bottom-nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.caption}"
    minWidth: 48px
    iconSize: 20px
  bottom-nav-item-active:
    textColor: "{colors.primary}"
  bottom-nav-fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 48px
    shadow: "{shadow.md-light}"
    icon: "{lucide.plus}"

  # --- Command Palette (⌘K) ---
  command-palette:
    backgroundColor: "{colors.surface-raised-light}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border-light}"
    shadow: "{shadow.lg-light}"
    width: 640px
    maxHeight: "60vh"
  command-palette-input:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    padding: "{spacing.md} {spacing.lg}"
    border: "none"
    borderBottom: "1px solid {colors.border-light}"
    height: 48px
  command-palette-item:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xs} {spacing.md}"
    height: 36px
    iconSize: 16px
  command-palette-item-selected:
    backgroundColor: "{colors.primary-subtle-light}"

  # --- Surfaces for read / write modes ---
  article-container:
    backgroundColor: "{colors.bg-light}"
    maxWidth: 68ch
    paddingX: "{spacing.lg}"
    typography: "{typography.article-body}"
  article-progress-bar:
    backgroundColor: "{colors.primary}"
    height: 2px
    position: "top of viewport"
  dual-pane-split:
    backgroundColor: "{colors.bg-light}"
    leftPaneWidth: "1fr"
    rightPaneWidth: "360px"
    gap: "{spacing.xl}"
  markdown-editor:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    padding: "{spacing.lg}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border-light}"

  # --- Chat / Ask ---
  chat-message-user:
    backgroundColor: "{colors.primary-subtle-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    alignSelf: "flex-end"
    maxWidth: "75%"
  chat-message-assistant:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    padding: "{spacing.md} 0"
    alignSelf: "flex-start"
  chat-streaming-cursor:
    backgroundColor: "{colors.text-primary-light}"
    width: 8px
    height: 18px
    animation: "pulse 900ms infinite"
  chat-input:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-md}"
    border: "1px solid {colors.border-light}"
    rounded: "{rounded.lg}"
    padding: "{spacing.sm} {spacing.md}"
    minHeight: 48px
    paddingRight: 48px
  source-preview-popover:
    backgroundColor: "{colors.surface-raised-light}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border-light}"
    shadow: "{shadow.md-light}"
    padding: "{spacing.md}"
    maxWidth: 360px

  # --- Generative UI ---
  genpage-section:
    backgroundColor: "transparent"
    padding: "{spacing.xxl} 0"
    typography: "{typography.article-body}"
  genpage-section-heading:
    typography: "{typography.article-heading-2}"
    textColor: "{colors.text-primary-light}"
    marginBottom: "{spacing.md}"
  genpage-regenerate-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary-light}"
    icon: "{lucide.refresh-cw}"
    visibility: "hidden on rest, visible on section-hover"
  genlink-underline:
    textColor: "{colors.text-primary-light}"
    textDecoration: "underline"
    textDecorationColor: "{colors.primary} at 30% opacity"
    textDecorationThickness: "1.5px"
    textUnderlineOffset: "3px"
    cursor: "pointer"
  genlink-panel:
    backgroundColor: "{colors.surface-raised-light}"
    borderLeft: "1px solid {colors.border-light}"
    shadow: "{shadow.md-light}"
    width: 420px
    padding: "{spacing.xl}"
    transition: "transform {motion.duration-med} {motion.ease-out}"
  flow-stepper:
    backgroundColor: "{colors.surface-light}"
    borderBottom: "1px solid {colors.border-light}"
    padding: "{spacing.md} {spacing.lg}"
    typography: "{typography.body-sm-medium}"
    height: 48px
  flow-progress-pill:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-strong}"
    rounded: "{rounded.full}"
    padding: "2px 10px"

  # --- Review (SRS) ---
  review-card:
    backgroundColor: "{colors.surface-raised-light}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.border-light}"
    shadow: "{shadow.sm-light}"
    padding: "{spacing.xxl}"
    maxWidth: 560px
    minHeight: 280px
  review-card-context-strip:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.caption}"
    padding: "{spacing.xs} {spacing.md}"
    borderBottom: "1px solid {colors.border-light}"
  review-rating-button:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
    border: "1px solid {colors.border-light}"
    height: 40px
    minWidth: 96px
  review-rating-button-again:
    border: "1px solid {colors.danger-light}"
    textColor: "{colors.danger-light}"
  review-rating-button-easy:
    border: "1px solid {colors.success-light}"
    textColor: "{colors.success-light}"

  # --- Graph / Explore ---
  graph-node:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    size: 6px
    sizeMax: 24px
    hoverScale: 1.08
  graph-node-label:
    typography: "{typography.caption}"
    textColor: "{colors.text-secondary-light}"
    visibility: "zoom-dependent"
  graph-edge:
    strokeColor: "{colors.border-strong-light}"
    strokeWidth: 1px
    opacity: 0.5

  # --- Toasts / Feedback ---
  toast:
    backgroundColor: "{colors.surface-raised-light}"
    textColor: "{colors.text-primary-light}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.border-light}"
    shadow: "{shadow.md-light}"
    padding: "{spacing.sm} {spacing.md}"
    position: "top-right"
    width: 360px
  skeleton:
    backgroundColor: "{colors.surface-raised-light}"
    rounded: "{rounded.md}"
    shimmerColor: "{colors.border-light}"
    shimmerDuration: 1200ms

dark-mode:
  # Every light token has a dark counterpart. Map at render time via CSS variables:
  # :root[data-theme="dark"] overrides each *-light token with the *-dark variant.
  rules:
    - "bg-light → bg-dark"
    - "surface-light → surface-dark"
    - "surface-raised-light → surface-raised-dark"
    - "border-light → border-dark"
    - "border-strong-light → border-strong-dark"
    - "text-primary-light → text-primary-dark"
    - "text-secondary-light → text-secondary-dark"
    - "text-muted-light → text-muted-dark"
    - "primary → primary-dark"
    - "primary-hover → primary-dark-hover"
    - "primary-pressed → primary-dark-pressed"
    - "primary-subtle-light → primary-subtle-dark"
    - "success-light → success-dark"
    - "warning-light → warning-dark"
    - "danger-light → danger-dark"
    - "info-light → info-dark"
    - "highlight-light → highlight-dark"
    - "shadow-*-light → shadow-*-dark"

icons:
  library: lucide
  strokeWidth: 2
  defaultSize: 16px
  sizes:
    xs: 12px
    sm: 14px
    md: 16px
    lg: 20px
    xl: 24px
---

# AI Brain — Design System (DESIGN.md)

> Design contract for AI agents and humans generating UI for AI Brain. Paired with `DESIGN_SYSTEM.md` (acceptance checklist, per-feature UX patterns), `BUILD_PLAN.md` (phased roadmap), and `ROADMAP_TRACKER.md` (sequenced features by version).
>
> **Rule:** every UI choice in code must resolve to a token defined in the frontmatter. No raw hex in components.

## Visual Theme & Atmosphere

AI Brain's mood is **Structured Calm** — a reading and thinking app first, a dashboard second. The default canvas is quiet: Radix Slate neutrals, one indigo accent (`{colors.primary}`), generous whitespace, and progressive disclosure. Every "dense" surface — the command palette, the filter rail, the graph view — hides until summoned. A ⌘K command palette delivers the power layer without imposing density on the default view.

Typography carries hierarchy. **Inter** handles all UI chrome and short-form reading; **Charter** carries long-form article bodies, GenPage sections, and Flow step content — giving the consume/generate surfaces an editorial, book-like feel distinct from the UI. **JetBrains Mono** appears only in keyboard-shortcut badges, code snippets, and item IDs.

Geometry is sober: **buttons are `{rounded.md}` rectangles** (not pills), **cards are `{rounded.lg}`**, and `{rounded.full}` is reserved for status dots, badges, the bottom-nav FAB, and the due-count indicator. Shadows (`{shadow.sm-light}` through `{shadow.lg-light}`) are restrained and *only* appear on floating layers — popovers, modals, the command palette, the hero mockup. Flat cards have a 1px `{colors.border-light}` and nothing more.

Motion is deliberately fast: **80ms hover, 120ms state change, 150ms panel slide, 300ms modal**, with `{motion.ease-out}` for enter and `{motion.ease-in}` for exit. Streaming LLM output shows a single pulsing cursor — no per-token animation. The command palette opens instantly (zero animation); theme switching is instant. All motion collapses to 0ms under `prefers-reduced-motion: reduce`.

The app runs in three surfaces — a desktop browser (localhost:3000), a Capacitor WebView on Android (bottom-nav + share-sheet target), and a Chrome extension popup — all rendering the same tokens.

## Color Palette & Roles

### Accent — Indigo (the only accent)

`{colors.primary}` is reserved for **four uses only**: primary CTA background, link text, focus ring, and the active nav item background. Over-using it collapses its meaning. `{colors.primary-subtle-light}` (tinted indigo) backs active states — selected sidebar item, citation chip, selected row.

### Neutral — Slate

A seven-step neutral scale carries the entire app: `{colors.bg-light}` at the bottom → `{colors.surface-light}` for cards/sidebar → `{colors.surface-raised-light}` for popovers/modals/inputs. `{colors.border-light}` is the default 1px divider; `{colors.border-strong-light}` appears only on hover and dragger handles.

Text tiers:
- `{colors.text-primary-light}` — body and headings (4.5:1 minimum on `bg-light` + `surface-light`)
- `{colors.text-secondary-light}` — captions, metadata, sidebar labels
- `{colors.text-muted-light}` — placeholders, disabled, timestamps older than one week

### Semantic — reserved

`{colors.success-light}` (sync complete), `{colors.warning-light}` (stale / attention), `{colors.danger-light}` (conflict / destructive), `{colors.info-light}` (informational). These **never** appear as decoration — only when they encode their specific meaning. Never paired with color alone: each is accompanied by a Lucide icon.

### Dark mode

Every light token has a matching `*-dark` variant (see frontmatter `dark-mode.rules`). Theme is applied via CSS variables on `:root[data-theme="dark"]`. SSR reads a `theme` cookie (defaulted to `prefers-color-scheme`) to render the correct palette on first paint — zero FOUC. Switching is instant.

## Typography Rules

**Font families (self-hosted, no external network calls):**

- **Inter** (variable weight, latin subset) — UI chrome, labels, headings in sidebar/lists
- **Charter** — long-form reading surfaces (item detail, GenPage, Flow, review-card cue)
- **JetBrains Mono** — `<kbd>`, code, item IDs

Fallback chains are specified in `DESIGN_SYSTEM.md` §3.

### Hierarchy

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| `{typography.hero-display}` | 48px | 600 | 1.10 | Empty-state heroes ("Welcome to AI Brain") |
| `{typography.page-title}` | 30px | 600 | 1.20 | Page titles ("Library", "Ask", "Review") |
| `{typography.section-title}` | 24px | 600 | 1.33 | Section openers on home |
| `{typography.heading-3}` | 20px | 600 | 1.40 | Card titles, modal titles |
| `{typography.heading-4}` | 18px | 500 | 1.55 | Item titles in lists |
| `{typography.body-md}` | 16px | 400 | 1.50 | UI body **(floor for readable text)** |
| `{typography.body-md-medium}` | 16px | 500 | 1.50 | Active sidebar item, emphasis |
| `{typography.body-sm}` | 14px | 400 | 1.43 | Dense UI, tables, sidebar items |
| `{typography.body-sm-medium}` | 14px | 500 | 1.43 | Secondary button labels |
| `{typography.caption}` | 12px | 400 | 1.33 | Metadata, badges, tag chips |
| `{typography.caption-strong}` | 12px | 500 | 1.33 | Citation chips, due badges |
| `{typography.button-md}` | 14px | 500 | 1.00 | Buttons |
| `{typography.article-body}` | 17px (Charter) | 400 | 1.60 | Item body, GenPage body |
| `{typography.article-heading-1}` | 28px (Charter) | 700 | 1.30 | Article H1 in reading mode |
| `{typography.article-heading-2}` | 22px (Charter) | 700 | 1.35 | Article H2 in reading mode |
| `{typography.article-quote}` | 18px italic | 400 | 1.55 | Pull quotes in GenPage |
| `{typography.mono-kbd}` | 12px (JetBrains) | 500 | 1.00 | `<kbd>` shortcut keys |
| `{typography.mono-sm}` | 13px (JetBrains) | 400 | 1.50 | Code, item IDs |

### Principles

- Negative tracking on display sizes (`-0.01em` to `-0.02em`) — tightens headlines
- Body and UI labels use neutral tracking
- No uppercase text-transform on UI labels
- Charter used only in reading surfaces — never for UI chrome
- Bold (`600+`) for headings; `500` for UI labels and buttons; `400` for body

## Component Stylings

### Buttons

- **`button-primary`** — dominant CTA (Save, Add, Start Flow, Generate). Indigo background, white text, 8px rounded, 36px height. Hover → `{colors.primary-hover}`; pressed → `{colors.primary-pressed}`; disabled → `{colors.border-light}` bg + `{colors.text-muted-light}` text.
- **`button-secondary`** — secondary action (Cancel, Skip). Transparent bg, 1px `{colors.border-light}` border, primary text color.
- **`button-ghost`** — tertiary (menu-kebab actions). Transparent, 32px height, `{rounded.md}`.
- **`button-destructive`** — Delete, Clear All. `{colors.danger-light}` bg.
- **`button-link`** — inline links. Indigo text, underline on hover.
- **`button-icon`** — icon-only chrome button. Requires `aria-label`.

### Inputs

- **`text-input`** — `{colors.surface-raised-light}` bg, 1px border, 36px height, `{rounded.md}`. Focus ring: `2px {colors.primary-subtle-light}` outside + 1px indigo border.
- **`textarea`** — same palette, 96px min-height, resizable vertically only.
- **`select`** — Radix Select primitive; never native `<select>`.

### Cards

- **`card-base`** — general card. Flat (`shadow: none`), 1px border.
- **`card-item`** — library item row. 88px min height, title + metadata + tag chips.
- **`card-suggestion`** — home-page "Suggested for you" card (Catch-up / Learn / Discover).
- **`card-empty-state`** — transparent, centered, single Lucide icon + one-liner + CTA.

### Chips & badges

- **`tag-chip`** — 2×8px padding, `{rounded.sm}`. `active` variant flips bg to `primary-subtle-light` and border to indigo.
- **`citation-chip`** — indigo subtle bg, book-open icon, 12px caption-strong. Used in Ask answers and GenPage inline citations.
- **`due-badge`** — indigo bg, `{rounded.full}`, numeric-only. Shown on Review sidebar item.
- **`enriching-pill`** — appears on freshly-captured items while LLM enrichment runs; sparkle icon pulses on 2s cycle.
- **`status-dot-*`** — 8px `{rounded.full}` dots for Obsidian sync state (synced/pending/conflict). Paired with text, not color alone.
- **`kbd`** — keyboard shortcut indicator. JetBrains Mono 12px, subtle 2px bottom border for "key" look.

### Navigation

- **`sidebar`** — collapsed 48px icon-only by default; expands to 240px on hover or `⌘/`.
- **`sidebar-item`** — 32px row height, 16px icon + label. Active state uses `primary-subtle-light` bg + `primary-pressed` text.
- **`bottom-nav`** (mobile) — 5 items, 56px tall, `env(safe-area-inset-bottom)` padding. Active item's icon and label flip to `{colors.primary}`.
- **`bottom-nav-fab`** — centered + button, 48px circle, indigo bg, plus icon. Triggers capture sheet.

### Command palette (⌘K)

- **`command-palette`** — 640px wide, `60vh` max, raised surface + `{shadow.lg-light}`.
- **`command-palette-input`** — no border, bottom-only divider.
- **`command-palette-item`** — 36px row, 16px icon. Selected state uses `primary-subtle-light`.

### Surfaces

- **`article-container`** — reading mode, 68ch max-width, Charter body.
- **`article-progress-bar`** — 2px indigo bar at top of viewport, tracks scroll.
- **`dual-pane-split`** — left (original content) + right (AI digest, 360px fixed).
- **`markdown-editor`** — raised surface, Inter 16px, `{rounded.lg}` border.

### Chat / Ask

- **`chat-message-user`** — indigo-tinted bubble, right-aligned, 75% max width.
- **`chat-message-assistant`** — no bubble, left-aligned; blends into canvas like an article.
- **`chat-streaming-cursor`** — 8×18px indigo block that pulses at 900ms.
- **`chat-input`** — raised surface, `{rounded.lg}`, 48px min height, send-button room reserved on right.
- **`source-preview-popover`** — expands from citation-chip hover/tap. 360px max-width.

### Generate (GenPage / GenLink / Flow)

- **`genpage-section`** — article-body typography on transparent bg.
- **`genpage-section-heading`** — Charter H2 (22px/700).
- **`genpage-regenerate-button`** — icon-only button visible only on section hover.
- **`genlink-underline`** — indigo underline at 30% opacity, 1.5px thickness, 3px offset. The **most important novel component** in AI Brain.
- **`genlink-panel`** — slides in from right, 420px, raised surface, `{shadow.md-light}`. Recursive — inner GenLinks open stacked panels with breadcrumb nav.
- **`flow-stepper`** — 48px top strip showing "Step N of M", progress pill on the right, keyboard-reachable "Continue" button in-content.

### Review (SRS)

- **`review-card`** — centerpiece at 560px max, 280px min-height, raised + `{shadow.sm-light}`. Top strip (`review-card-context-strip`) shows source item title + snippet.
- **`review-rating-button`** — four buttons: Again / Hard / Good / Easy. Again uses danger border; Easy uses success border. All keyboard-reachable (1/2/3/4).

### Graph / Explore

- **`graph-node`** — indigo `{rounded.full}` dot, size maps to connection count (6px–24px). Hover scales to 1.08.
- **`graph-edge`** — 1px neutral stroke at 0.5 opacity.
- **`graph-node-label`** — Inter caption, visible only above a zoom threshold to reduce clutter.
- Accessible parallel: a data-table view is always available via a toggle.

### Feedback

- **`toast`** — top-right, 360px, raised + `{shadow.md-light}`, 4-second auto-dismiss, one at a time.
- **`skeleton`** — shimmer matching final layout; never a full-screen spinner.

## Layout Principles

### Spacing

- **Base unit:** 4px (`{spacing.xxs}`), primary increment 8px (`{spacing.xs}`).
- **Tokens:** `xxs` 4 · `xs` 8 · `sm` 12 · `md` 16 · `lg` 20 · `xl` 24 · `xxl` 32 · `xxxl` 48 · `section` 64 · `section-lg` 96.
- **Section rhythm:** home-page section openers use `{spacing.section}` (64px) between bands; library rows use `{spacing.md}` gaps.

### Grid

- **Reading max-width:** `68ch` (item body, GenPage, Flow step)
- **List max-width:** 960px (library, collections, review queue)
- **Full-canvas:** 100% (graph, dual-pane, chat)
- **Sidebar collapsed:** 48px; expanded 240px
- **Command palette:** 640px centered, `60vh` max-height

### Whitespace

Generous breathing room between library cards (`{spacing.md}` vertical gap). Reading surfaces get 68ch columns with page-level top/bottom `{spacing.xxxl}`. Dense surfaces (command palette, filter rail) use `{spacing.xs}` / `{spacing.sm}` — they are the exception.

## Depth & Elevation

Only **three elevation tiers** — no decorative shadows on flat surfaces.

| Level | Treatment (light / dark) | Use |
|---|---|---|
| 0 (flat) | No shadow; 1px `{colors.border-light}` | Cards, item rows, sidebar, bottom nav |
| 1 (subtle) | `{shadow.sm-light}` / `{shadow.sm-dark}` | Review card, FAB, elevated list items on drag |
| 2 (floating) | `{shadow.md-light}` / `{shadow.md-dark}` | Popovers, toasts, GenLink panel, source preview |
| 3 (modal) | `{shadow.lg-light}` / `{shadow.lg-dark}` | Command palette, modals, confirm dialogs |

Graph nodes and chat bubbles carry no shadow. Shadows are for **floating** layers only.

## Do's and Don'ts

### Do

- Use `{colors.primary}` for **primary CTAs, links, focus rings, and active nav items only** — nothing else.
- Apply `{rounded.md}` (8px) to buttons. Apply `{rounded.lg}` (12px) to cards. Apply `{rounded.full}` to status dots, badges, the FAB, and pill-style due badges.
- Use Charter for article bodies, GenPage sections, Flow step content, and the SRS card cue. Use Inter for all UI chrome.
- Use Lucide icons at 16px (UI), 20px (nav), 24px (empty-state). Never mix icon libraries.
- Use `{typography.body-md}` (16px) as the body-text **floor** on every platform.
- Respect `prefers-color-scheme` on first paint; mirror theme to a cookie for SSR.
- Collapse all motion under `prefers-reduced-motion: reduce`.
- Pair every semantic color with an icon so color is never the only signal.
- Map every interactive element to a keyboard shortcut surfaced in `⌘K` and the `?` help screen.

### Don't

- Don't use pill-shaped rectangles for regular buttons — pills are reserved for status badges, due-count badges, and flow-progress indicators.
- Don't introduce a second accent color. Don't tint the canvas with indigo washes.
- Don't animate individual streaming tokens — use the single pulsing cursor.
- Don't show a full-screen spinner; use skeletons matching the final layout.
- Don't use color alone to encode meaning (citation vs warning; synced vs conflict — always pair with icon).
- Don't scale down body text on mobile; respect the Android accessibility font-size setting.
- Don't fade theme switches; repaint instantly via `color-scheme`.
- Don't write raw hex values in component files — read a token.
- Don't stack more than three modal layers.

## Responsive Behavior

### Breakpoints

| Name | Width | Key changes |
|---|---|---|
| Mobile | < 600px | Bottom nav replaces sidebar; dual-pane collapses to tabbed view; graph → list; command palette is full-screen |
| Tablet | 600 – 1023px | Sidebar icon-only; dual-pane side-by-side at tight gap |
| Desktop | 1024 – 1439px | Default — sidebar collapsed-by-default, expand on hover |
| Wide | ≥ 1440px | Sidebar still collapsed; content uses fixed max-widths (68ch / 960px) rather than stretching |

### Touch targets (mobile)

- All interactive elements ≥ 44px in effective tap area
- Bottom-nav items: 48px minimum width
- FAB: 48px circle
- Review rating buttons: 40px visible, 48px tap

### Collapsing strategy

- **Sidebar** (desktop) → **bottom nav** (mobile). Five items on mobile: Home, Library, +Capture (FAB), Ask, Review. Explore/GenPage/Flow/Settings live in the top-bar overflow.
- **Dual-pane item view** → tabbed single-pane on mobile: tabs "Original" / "Digest" / "Chat".
- **Graph** → related-items list on mobile.
- **Command palette** → full-screen overlay on mobile.
- **Flow stepper** → bottom-anchored progress strip + sticky Continue button.

### Safe areas & viewport (Capacitor WebView)

- `viewport-fit=cover` required
- `safe-area-inset-*` for top (status bar) and bottom (gesture bar)
- `overscroll-behavior: none` globally
- Respect Android system font-size scaling via `rem` units

## Agent Prompt Guide

When generating UI for AI Brain, always reference tokens by name — never inline values.

### Example prompts (ready to use)

**"Render a library card for a captured item"**
```
Compose a `card-item` with:
- Title in `{typography.heading-4}` / `{colors.text-primary-light}` (dark: `{colors.text-primary-dark}`)
- Metadata row under title: `{typography.caption}` / `{colors.text-secondary-light}`, showing source domain + captured-at relative time + page count if PDF
- Tag chips row: up to 3 `tag-chip` components, overflow collapses to "+N"
- If enrichment in progress: show `enriching-pill` in the top-right corner
- Hover state flips to `card-item-hover`
- Clicking routes to `/items/[id]`
```

**"Render the Ask (chat) message list"**
```
User bubble: `chat-message-user`, right-aligned, indigo subtle bg.
Assistant response: `chat-message-assistant` — no bubble, body-md typography, blends into canvas.
After each sentence that used retrieval: one or more `citation-chip`s inline (book-open icon + shorthand source id). Hover/tap expands into `source-preview-popover`.
While streaming: `chat-streaming-cursor` at the insertion point; no token-level animation.
```

**"Render the Review card"**
```
Centered `review-card` (560×280 min), top `review-card-context-strip` with source title + snippet.
Cue in Charter 18–22px article-body; answer hidden until Space pressed.
Below: four `review-rating-button`s (Again/Hard/Good/Easy), 1–4 keyboard.
Against- and Easy-variants use danger/success border per `review-rating-button-again` / `review-rating-button-easy`.
Mobile: swipe-right = Good, swipe-left = Again; tap to reveal.
```

**"Render a GenPage with GenLinks"**
```
Top: page title in `{typography.page-title}`.
Sections: stream in one by one as `genpage-section` blocks. Each heading is `genpage-section-heading` (Charter 22/700).
Body in `{typography.article-body}` (Charter 17/1.60) max 68ch.
Noun phrases wrapped in `genlink-underline`. Click opens `genlink-panel` from the right (420px).
Inline citations after retrieval-grounded sentences use `citation-chip`.
Hover on a section reveals `genpage-regenerate-button` in the top-right gutter.
```

### Color quick reference

- **CTA & focus & link & active nav** → `{colors.primary}` (dark: `{colors.primary-dark}`)
- **Canvas** → `{colors.bg-light}` / `{colors.bg-dark}`
- **Card / sidebar** → `{colors.surface-light}` / `{colors.surface-dark}`
- **Popover / modal / input** → `{colors.surface-raised-light}` / `{colors.surface-raised-dark}`
- **Dividers** → `{colors.border-light}` / `{colors.border-dark}`
- **Body text** → `{colors.text-primary-light}` / `{colors.text-primary-dark}`
- **Secondary text** → `{colors.text-secondary-light}` / `{colors.text-secondary-dark}`

## Iteration Guide

1. Change tokens in the frontmatter — not in components.
2. When adding a new component, add a new `components:` entry in frontmatter *first*, then describe it in the prose section.
3. Dark-mode values are tracked via the `dark-mode.rules` map; every new `*-light` token needs a `*-dark` pair.
4. Keep `{colors.primary}` sacred — resist adding it anywhere outside its four approved uses.
5. Keep the **three** elevation tiers. New shadow styles must collapse into one of the existing levels.
6. Run the `DESIGN_SYSTEM.md` §15 acceptance checklist on every new screen before merging a phase.

## Known Gaps

- Dark-mode hex values for semantic success/warning/danger/info are defined in frontmatter but not shown in an HTML preview yet. `preview.html` / `preview-dark.html` companion artifacts will be generated during v0.1.0 scaffolding.
- Graph-view node color-by-collection requires a per-collection palette extension; will be defined in v0.6.0 once auto-clustering lands.
- Animation timings for Framer Motion's spring (swipe-to-rate on mobile) are referenced in prose but not token-serialized here; single-use exception.
- Citation-chip shape variants (article vs PDF vs YouTube) need iconography tokens — add alongside v0.10.0 capture-breadth phase.
- Capacitor-specific dark-mode bridge (system theme → WebView) needs validation; deferred to v0.5.0 spike.

---

**Version: 0.1.0 · Paired with AI Brain `DESIGN_SYSTEM.md` v0.1.0-design · Format conforms to `getdesign.md` spec (9 canonical sections).**
