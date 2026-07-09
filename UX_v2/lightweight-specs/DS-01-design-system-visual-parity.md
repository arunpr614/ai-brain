# DS-01 Design-System Visual Parity

Created: 2026-06-14 07:40 IST
Status: Lightweight spec
Classification: UX redesign only

## Problem

The app has Prism Memory tokens, but visual parity still needs evidence across real web and Android/mobile screens.

## Scope

- Tokens and semantic color usage.
- 8px-or-less cards, crisp borders, restrained shadows.
- Source-quality badges and Ask-scope colors.
- Mobile bottom sheets, nav, filters, and composer surfaces.

## Requirements

- Use color as information, not decoration.
- Source quality must include text, not only color.
- Disabled privacy controls must be visibly disabled and labeled `Coming soon`.
- Do not use legacy indigo/slate styling if Prism Memory tokens cover the case.

## Acceptance Criteria

- Screenshots compared against `../UX_UI_DESIGN_PACKAGE/screenshots`.
- CSS scan does not show a drift back to a one-note theme.
- Mobile text does not overflow buttons, chips, nav, sheets, or banners.

## Risks

- Some screenshot exports may not be enough for pixel fidelity; live Magic Patterns can be checked later if implementation seems visually off.
