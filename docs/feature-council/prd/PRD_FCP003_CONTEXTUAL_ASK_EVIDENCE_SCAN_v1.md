# PRD FCP-003 Contextual Ask And Evidence Scan v1

Status: v1 draft  
Decision: Proceed with reduced scope  
Priority: P1

## Goal

Improve Ask so users can control context, prefer high-quality sources, and run a lightweight Evidence Scan that classifies whether selected sources support, contradict, nuance, or do not address a claim.

## User Problem

Ask works, but users cannot easily see or control which sources it uses. Evidence-heavy questions need stronger source selection and claim-level outputs.

## Scope

- Attach selected items/anchors/collections to Ask.
- High-quality-only source filter.
- Source set preview before asking.
- Evidence Scan for one claim over selected sources.
- Citations with verdict labels.

## Non-Goals

- Full Matrix extraction.
- General fact-checking against the internet.
- Legal/medical/financial truth guarantees.

## Acceptance Criteria

- User can ask over explicit source set.
- User can exclude weak sources.
- Evidence Scan produces support, contradicts, nuance, irrelevant, or insufficient evidence labels.
- Result shows citations and source eligibility.
