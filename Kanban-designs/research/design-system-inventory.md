# Card Processing Workflow — Design-System Inventory

**Visual source of truth:** current rendered AI Brain + `src/styles/tokens.css`

## Product language and posture

- App shell uses **AI Memory** while repository/product documentation uses AI Brain.
- User-facing saved records are usually “sources” or “items.” “Card” is a visual treatment; the database `cards` table means SRS.
- Structured Calm principles favor quiet reading/thinking surfaces, crisp separators, restrained color, source-first trust, and power on demand (`UX_DESIGN_PRODUCT_MODEL.md:46-97`).

## Color and themes

- Light base: `#FBFCFE`; panel: `#FFFFFF`; primary ink: `#14213D`; border: `#D7DFEA`.
- Dark base: `#101825`; panel: `#162235`; raised surface: `#1B2A40`; border: `#2B3B52`.
- Primary actions invert ink/surface rather than using a bright brand fill.
- Semantic colors are reserved for success, warning, danger, information, and capture quality (`src/styles/tokens.css:11-80`, `:129-174`).
- Workflow columns should rely on labels, structure, and subtle surface/tint differences; color cannot carry status alone.

## Typography

- UI: Inter/system sans, 16px body, 1.5 line height.
- Long-form source content: Charter/Iowan/Cambria/Georgia, 17px, 1.6, max 68ch.
- Monospace: JetBrains Mono/Menlo/Consolas.
- Existing item title uses editorial serif; operational Library rows use UI sans (`src/styles/tokens.css:120-123`; `src/app/globals.css:36-70`).

## Spacing, radius, elevation, motion

- 4px spacing base through 96px.
- Radii: 4/6/8/10/12px plus full pill.
- Shadows are only for floating surfaces; cards are primarily separated by borders.
- Motion tokens are 80/120/150/300ms and collapse to 0 for reduced motion (`src/styles/tokens.css:84-118`, `:177-183`).

## Shell patterns

- Desktop: sticky 240px sidebar, collapsible to 72px; content uses a calm centered/max-width canvas.
- Mobile: fixed 64px bottom navigation with safe-area padding; Capture may become the raised center action.
- Library mobile filter sheet is the strongest precedent for filter facets and active-count communication.
- Item detail desktop supports a companion rail; mobile uses horizontal/segmented tabs and a single vertical task surface.

## Interaction and accessibility patterns

- Global 2px focus-visible outline with offset.
- Semantic tablists, toolbars, dialogs, status regions, navigation landmarks, and explicit labels are common.
- Buttons/links generally preserve 40–44px mobile targets.
- The notes editor already models pending/saved/error/conflict/offline/recovery states; Processing should align its language and trust posture.
- Use Lucide-style 2px outline icons already installed; no emoji, custom inline SVG, or decorative CSS drawings.

## Prototype rules

- Reuse the real logo asset `public/ai-memory-logo.png`.
- Use static fictional content only.
- Match current dark-theme screenshots for the primary prototype and retain token-driven light theme capability if practical.
- Each prototype must show a persistent “Throwaway prototype · Explored — not implemented” marker.
- Desktop target: 1440×1024. Mobile verification target: 390×844.
- Recommended direction should feel Inbox-first and calm; the board is secondary. Comparison directions should change hierarchy/interaction, not palette.
