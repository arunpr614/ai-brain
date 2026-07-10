# AI Memory Design System: Prism Memory

Created: 2026-06-11
Logo reference: `../assets/logo/ai-memory-logo.png`

## Design Concept

AI Memory should feel like a private prism of knowledge: calm and readable at rest, vivid when the interface needs to explain source type, capture quality, AI state, or provenance.

The logo suggests:

- Faceted intelligence
- Segmented source categories
- Dark structural outlines
- Knowledge, memory, growth, and synthesis
- A bright system hidden inside a calm surface

The product UI should not become a rainbow interface. The app should use near-white work surfaces and deep navy structure, with the logo colors used as semantic accents.

## Mood Words

- Private
- Intelligent
- Faceted
- Trustworthy
- Vivid
- Calm
- Searchable
- Source-aware

## Core Principle

Use color as information, not decoration.

The strongest visual language should come from:

- Source platform
- Capture method
- Source quality
- Ask scope
- Repair / upgrade state
- Current focus

## Color Tokens

| Token | Hex | Use |
|---|---:|---|
| Ink 950 | `#14213D` | Primary text, strong outlines, active nav |
| Ink 800 | `#24344F` | Secondary structure, dark panels |
| Surface | `#FBFCFE` | App background |
| Panel | `#FFFFFF` | Cards, sheets, content surfaces |
| Line | `#D7DFEA` | Borders, separators |
| Muted | `#667085` | Secondary text |
| Ruby | `#E63B6F` | Manual notes, needs upgrade, important repair states |
| Coral | `#F26A4F` | Capture issues, warning-adjacent states |
| Amber | `#F6B73C` | Processing, preview-only, attention |
| Citrine | `#F7E463` | Small highlights only |
| Lime | `#A7D957` | Healthy, updated, organized |
| Teal | `#18A999` | Saved, verified, full text |
| Cyan | `#42C7E8` | Transcript, reading, web capture |
| Azure | `#2F80ED` | PDF, knowledge surfaces, item detail |
| Violet | `#7E5BEF` | Ask, AI, selected items |
| Magenta | `#C64ACB` | Synthesis, collections, networked knowledge |

## Semantic Mapping

## Source Platform

| Source | Color |
|---|---|
| YouTube | Coral |
| LinkedIn | Azure |
| Substack | Amber |
| PDF | Azure |
| Manual note | Ruby |
| Telegram | Teal |
| Chrome extension | Violet |
| Web capture | Cyan |

## Source Quality

| Quality | Color | Meaning |
|---|---|---|
| Full text | Teal | Complete, searchable |
| Transcript | Cyan | Complete transcript available |
| Preview only | Amber | Useful but incomplete |
| Metadata only | Coral | Weak source |
| Needs upgrade | Ruby | Requires action |
| Saved | Teal | Capture succeeded |
| Enriching | Violet | AI processing |
| Updated | Lime | Improved existing item |

## Ask Scope

| Scope | Color |
|---|---|
| All sources | Ink |
| This item | Azure |
| Selected items | Violet |
| Tag / collection | Magenta |
| High-quality only | Teal |

## Typography

Use a clean system sans-serif, similar to Inter.

| Style | Size / Line | Use |
|---|---|
| Display | 32 / 40 | Design-system hero only |
| H1 | 24 / 32 | Page titles |
| H2 | 18 / 28 | Section headers |
| Body | 14 / 22 | Reading and general UI |
| Dense | 13 / 18 | Lists, metadata, tables |
| Caption | 12 / 16 | Chips, provenance, helper text |

## Shape And Layout

| Token | Value | Use |
|---|---:|---|
| Radius XS | 4px | Inputs, chips, compact controls |
| Radius SM | 6px | Cards and list rows |
| Radius MD | 8px | Modals and sheets |
| Spacing | 4, 8, 12, 16, 24, 32 | Core spacing scale |

Rules:

- Cards should stay at 8px radius or less.
- Use crisp borders more than shadows.
- Focus rings should use Ink or the active semantic color.
- Use prismatic divider strips sparingly, mostly in design-system surfaces, active source groups, or onboarding.

## Component Guidance

## Buttons

- Primary: Ink background, white text.
- Secondary: white background, Ink border.
- Tertiary: text button with subtle hover.
- Destructive: Ruby border or fill depending on severity.
- Icon-only: use familiar symbols, tooltip on hover.

## Chips And Badges

Every chip must include text. Do not rely on color alone.

Good:

- `PDF`
- `Captured via Telegram`
- `Needs upgrade`
- `Ask: Selected items`

Avoid:

- Unlabeled colored dots
- Rainbow category-only visuals without text

## Item Rows

Item rows should show:

- Title
- Source platform
- Captured via
- Source quality
- Saved date or updated state
- Offline availability when relevant

Use the color accent on the chip or left edge, not across the full row.

## Ask Answers

Ask surfaces should feel more sober than colorful.

Use:

- Ink text
- White answer card
- Citation chips
- Source quality warning when needed
- Violet only for Ask scope or active AI state

## Capture Results

Capture result cards should always show:

- Status
- Source platform
- Captured via
- Quality
- Recommended next action

## Accessibility Rules

- Never rely on color alone.
- Keep saturated color below 15 percent of normal operational screens.
- Use Citrine only for highlights, never body text.
- Prefer Ink text on pale tinted backgrounds.
- Keep contrast strong for chips and buttons.
- Use labels for every source quality state.

## Platform Adaptation

## Web

Web can use:

- Collapsible left nav
- Dense list rows
- Right rails
- Bulk selection
- More visible semantic chips

## Android

Android should use:

- Bottom nav
- Floating capture action
- Compact horizontal filters
- Bottom sheets for history, filters, and repair actions
- Fewer simultaneous chips per row

## Magic Patterns Project

Editor: https://www.magicpatterns.com/c/us6uvqd5gjsudnfejzpuva
Preview: https://project-ai-brain-prism-design-system-928.magicpatterns.app
Active artifact: `61b63d8e-e865-421a-bff3-2819b6652acb`

Preview status: verified on 2026-06-11.

## HTML Document

Local HTML version: `UX_DESIGN_SYSTEM_PRISM_MEMORY.html`
Local logo asset: `assets/ai-memory-logo.png`
