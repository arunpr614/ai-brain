# Known Limitations and Technical Debt

Purpose: Separate verified implementation limitations from proposals and speculative concerns.
Audience: AI agents, maintainers, and reviewers.
Verified against: main documentation baseline `ea7b159515fc37f76ffdb83dedf2d33d17f9a193` plus review candidate `fdd740617685c1ce730a6150c306152a04070f86` on `feat/recall-manual-sync`.
Runtime evidence through: 2026-07-12 where cited; most findings are static-code evidence.
Last reviewed: 2026-07-12.
Owner: AI Brain maintainer.

## Verified limitations

- Official-caption recovery and owned-media speech-to-text are inactive/not wired.
- Android accepts one PDF; multiple-PDF share is intentionally rejected.
- Offline support is cached fallback/visited content and note-draft recovery, not offline parity.
- Recall is a guarded one-way import, not two-way synchronization. Its manual control has separate flags and trusted-host permission boundaries; consult its feature-specific page before inferring current availability.
- Card Processing is intentionally single-item and owner-only: no batch moves, rank, drag dependency, project dates/assignees/sprints/WIP limits, collaboration, global archive, or offline mutation queue.
- Related items is similarity output, not a graph.
- Review/Needs Upgrade are quality queues, not spaced repetition.
- Attached notes are not end-to-end encrypted and are excluded from default bulk export.
- One shared bearer token prevents per-device identity/revocation.
- Database backup workflows do not include filesystem capture-artifact files.

## Technical risks

- Continuous enrichment and nightly batch paths claim the same pending queue; measure actual batching before describing it as the default.
- Usage telemetry can label realtime non-Ollama generation as Ollama and lacks complete provider/model/cost fidelity.
- Provider-agnostic Ask retains an Ollama-specific model coupling.
- Several rate limits are in-memory and reset on restart.
- URL safety does not clearly revalidate every redirect destination.
- CSP is absent; local/browser/mobile/extension state lacks application-level encryption.
- Export caching headers and error-context redaction are inconsistent.
- Workers, schedules, backups, HTTP, and one SQLite database share operational fate.
- Duplicate numeric migration prefix `017` is resolved in current main but remains a tooling/human hazard.
- Protected Product CI validates typecheck, lint, the complete product suite, production build, Processing readiness/release smoke, and documentation gates for the shipped workflow.

## Documentation debt

The root README, package version, provider roadmap, and some client comments reflect older local-only stages. Use this wiki's pinned baseline and current code instead.

See [Ideas and Exploration](Ideas-and-Exploration-Catalog) for non-current future work.
