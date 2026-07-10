# EXT-01 Browser Extension Parity

Created: 2026-06-14 07:40 IST
Status: Lightweight follow-up
Classification: Partial

## Problem

The design package mentions browser/extension capture representation, and the repo has a Chrome extension. Current planning evidence suggests the extension is primarily URL capture and health/options flow, not full DOM/PDF/note parity.

## Scope

- Keep extension compatibility with capture result contracts.
- Do not redesign the extension in UX v2 unless Arun prioritizes it.
- Ensure extension user-facing copy follows AI Memory brand.

## Requirements If Picked Up

- Consume canonical capture result payloads from PRD-06-FU.
- Show duplicate, updated-existing, metadata-only, and failed-without-save states.
- Keep source platform and captured via separate.
- Avoid promising DOM snapshot or PDF capture unless implemented.

## Acceptance Criteria

- Extension does not regress after capture result API changes.
- User-facing extension copy says AI Memory.
- Unsupported capture modes are not advertised.
