# OPS-01 Transcript Operator Visibility

Created: 2026-06-14 07:40 IST
Status: Lightweight decision spec
Classification: Needs user decision

## Problem

The 2026-06-11 production handover recommends an operator page for transcript state. This is ops-adjacent and should not be silently bundled into UX v2 without Arun's decision.

## Possible Scope

- `/ops/transcripts` or `/admin/transcripts`.
- Provider cooldown.
- Transcript job counts.
- Latest attempts and errors.
- Recent dry-run summaries.
- Links to Needs Upgrade or item detail.

## Guardrails

- No broad reset/delete controls in first version.
- Dry-run visibility is safer than mutation controls.
- Do not run real backfill or bypass cooldown without explicit approval.

## Acceptance Criteria If Approved

- Operator can see cooldown and job state without SSH.
- Page is protected by existing auth.
- Actions are read-only or dry-run-only unless separately approved.

## Open Decision

Should this be part of AI Memory UX v2, or handled in a separate ops/admin roadmap?
