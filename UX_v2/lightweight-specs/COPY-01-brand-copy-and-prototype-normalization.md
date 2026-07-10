# COPY-01 Brand Copy And Prototype Normalization

Created: 2026-06-14 07:40 IST
Status: Lightweight spec
Classification: UX redesign only

## Problem

The design package and source exports are intentionally local references, but exact prototype source can still contain legacy `AI Brain` and `Your Brain` copy. Production UI must say `AI Memory`.

## Scope

- User-facing web app copy.
- Android labels, launcher, setup, unlock, More, offline fallback.
- Ask composer and assistant labels.
- Export and provider-facing user copy.

## Requirements

- Use `AI Memory` in production UI.
- Use `Ask AI Memory`, `Unlock AI Memory`, `Your Memory`, and `Connect to your Memory`.
- Historical docs, exact prototype exports, and source-reference notes may keep legacy names with context.
- Do not blindly paste Magic Patterns source strings.

## Acceptance Criteria

- Brand search runs before release.
- Remaining `AI Brain` matches are documented as historical or non-user-facing.
- Screenshots used for QA show AI Memory.

## Risks

- Current package name/repo names may stay `ai-brain`; do not rename infrastructure casually.
- Android package ID may need to remain `com.arunprakash.brain` for compatibility.
