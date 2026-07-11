# Repository Map

Purpose: Explain directory ownership, architectural boundaries, and safe change entrypoints.
Audience: AI agents and contributors.
Verified against: `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`.
Runtime evidence through: Not applicable; this is source structure.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

| Path | Responsibility |
|---|---|
| `src/app/` | App Router pages, API routes, server actions, auth entrypoints |
| `src/components/` | Shared interactive web UI, navigation, share handling, attached-note editor |
| `src/db/` | SQLite client, migrations, typed repositories, queue state |
| `src/lib/capture/` | Extraction, safety, policy, provenance, fidelity, transcript inputs |
| `src/lib/enrich/`, `llm/`, `embed/`, `queue/` | AI providers, enrichment, chunk/embed and workers |
| `src/lib/search/`, `retrieve/`, `related/`, `ask/` | Lexical/vector retrieval, ranking, similarity, RAG and citations |
| `src/lib/notes/` | Attached-note flags, journal, history, consent and provider policy |
| `src/lib/recall/` | External Recall enumeration, mapping, fidelity and guarded import |
| `src/lib/auth/`, `device-pairing/`, `telegram/`, `security/` | Trust boundaries and integration policies |
| `android/` and `capacitor.config.ts` | Private Android shell and native share behavior |
| `extension/` | Chrome MV3 capture client |
| `scripts/` | Build, validation, migration/backfill, deployment and guarded operator tooling |
| `docs/wiki/` | Canonical public wiki source |
| `docs/agent-docs/` | Coverage, command safety, baselines and publication manifests |
| `docs/feature-council/` | Specifications, validation, research and history—not automatic implementation proof |

## Starting a change

Trace UI or client → action/API → domain module → database repository/migration → worker/integration. Then identify tests and cross-client contracts. Use [Feature Architecture](Feature-Architecture) and [Agent Workflows](Agent-Workflows) for common paths.
