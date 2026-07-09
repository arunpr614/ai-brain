# AI Memory Design System Implementation Spec

Created: 2026-06-13 21:57 IST

## Visual Concept

AI Memory uses a prism-memory visual language inspired by the logo:

- Deep ink structure.
- Calm white and near-white work surfaces.
- Bright semantic accents.
- Crisp borders over heavy shadows.
- Color as information, not decoration.

## Logo

Use:

- `../assets/logo/ai-memory-logo.png`

Logo rules:

- Use as the master app icon and brand image.
- Do not redraw the logo.
- Do not recolor the logo.
- Do not use the full rainbow palette as page decoration.
- On dense app screens, prefer a compact app icon mark or wordmark treatment.

## Core Tokens

| Token | Hex | Use |
| --- | --- | --- |
| Ink 950 | `#14213D` | Primary text, active nav, strong outlines |
| Ink 800 | `#24344F` | Secondary structure, dark panels |
| Surface | `#FBFCFE` | App background |
| Panel | `#FFFFFF` | Cards, sheets, content surfaces |
| Line | `#D7DFEA` | Borders, separators |
| Muted | `#667085` | Secondary text |
| Ruby | `#E63B6F` | Needs upgrade, repair, destructive |
| Coral | `#F26A4F` | Metadata-only, capture issue |
| Amber | `#F6B73C` | Preview-only, attention, processing |
| Citrine | `#F7E463` | Small highlights only |
| Lime | `#A7D957` | Updated, improved |
| Teal | `#18A999` | Full text, saved, verified |
| Cyan | `#42C7E8` | Transcript, reading, web capture |
| Azure | `#2F80ED` | PDF, item detail, this-item scope |
| Violet | `#7E5BEF` | Ask, AI, selected items |
| Magenta | `#C64ACB` | Collections, synthesis |

## Semantic Color Mapping

Source quality:

| Quality | Color | Meaning |
| --- | --- | --- |
| Full text | Teal | Complete and searchable |
| Transcript | Cyan | Complete transcript |
| Preview only | Amber | Useful but incomplete |
| Metadata only | Coral | Weak source |
| Needs upgrade | Ruby | Requires repair |

Ask scope:

| Scope | Color |
| --- | --- |
| All sources | Ink |
| This item | Azure |
| Selected items | Violet |
| Tag or collection | Magenta |
| High-quality only | Teal |

## Typography

Use a clean system sans-serif similar to Inter.

| Style | Size / Line | Use |
| --- | --- | --- |
| Page title | 24 / 32 | Primary screen titles |
| Section title | 18 / 28 | Cards, panels, sheets |
| Body | 14 / 22 | General UI and reading |
| Dense | 13 / 18 | Lists, metadata |
| Caption | 12 / 16 | Chips, helper text, labels |

Do not scale font size with viewport width. Keep letter spacing at 0 except for uppercase captions.

## Shape And Spacing

- Cards and repeated item rows: 8px radius or less.
- Chips and compact controls: 4px to 6px radius.
- Bottom sheets and modals: 8px radius unless platform conventions require slightly more on Android sheets.
- Spacing scale: 4, 8, 12, 16, 24, 32.
- Avoid nested cards.
- Use borders and separators more than large shadows.

## Components To Build

Foundation:

- App shell.
- Web collapsible side navigation.
- Web secondary Ask history navigation.
- Android bottom navigation.
- Android route-aware Capture button.
- Page header.
- Search input.
- Filter chips and bottom-sheet filters.
- Source item row.
- Source quality badge.
- Source/capture metadata block.
- Tag pill.
- Included topic pill.
- Collection row/card.
- Ask answer card.
- Citation row/card.
- Empty state.
- Warning state.
- Disabled coming-soon controls.
- Modal dialog.
- Android bottom sheet.
- Focus/read mode surface.

## Accessibility Requirements

- Do not rely on color alone.
- Every semantic chip must include text.
- Icon-only buttons need accessible labels.
- Disabled privacy controls must be visibly disabled and labeled `Coming soon`.
- Warning copy must be visible near affected content.
- Android tap targets should be at least 44 x 44 px.
- Keyboard focus must be visible on web.
