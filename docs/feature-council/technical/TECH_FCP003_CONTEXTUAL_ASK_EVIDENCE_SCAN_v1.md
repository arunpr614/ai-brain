# Technical Plan FCP-003 Contextual Ask And Evidence Scan v1

Status: v1 draft

## Architecture

Extend existing Ask retrieval with explicit source-set snapshots, source quality filters, and a new evidence scan route/service that runs bounded retrieval plus classification over selected sources.

## Data

- Source set snapshot.
- Evidence scan run.
- Evidence candidates.
- Verdict labels.

## Risks

- Classification may sound more certain than source support allows.
- Query/claim text is sensitive and must not leak into diagnostics.
