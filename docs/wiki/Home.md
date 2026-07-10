# AI Brain Agent Documentation

Purpose: Entry point for understanding and changing AI Brain safely.
Audience: AI agents and engineers.
Verified against: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a` and `8178117c80923e5724e355fb2684cbc836013d39`.
Runtime evidence through: 2026-07-09; complete production tree SHA is Unknown.
Last reviewed: 2026-07-10.
Owner: AI Brain maintainer.

AI Brain is a single-user personal knowledge system for capturing material, organizing it, enriching it with AI, searching it, and asking cited questions across a private library. It has a Next.js web application, SQLite storage, Android and browser-extension clients, Telegram capture, and a guarded Recall synchronization subsystem.

## Start Here

1. Read [Agent Onboarding](Agent-Onboarding) before running commands.
2. Read [Source Baselines and Status](Source-Baselines-and-Status) before deciding whether a feature is current.
3. Use the [Feature Catalog](Feature-Catalog) for product, code, and runtime status.
4. Read [System Architecture](System-Architecture) and [Data Model](Data-Model) before cross-cutting changes.
5. Check [Command Safety](Command-Safety) before executing any script.
6. Use [Agent Workflows](Agent-Workflows) and [Troubleshooting](Troubleshooting) for task-specific guidance.

## Documentation Model

The canonical public documentation is versioned under `docs/wiki/` in the application repository. The GitHub Wiki is published from those files. Changes should begin in the canonical files, pass validation, and then be copied to the wiki.

Sensitive operations are deliberately split out. Private owner runbooks are not distributed with a clone. When they are unavailable, report that limitation and stop sensitive work rather than reconstructing commands from historical plans.

## Truth Rules

- Code presence proves implementation, not production deployment.
- A migration proves schema support, not a complete product feature.
- A tracker proves intent or historical status, not current runtime state.
- `origin/main` and the documentation worktree have diverged; neither contains the other.
- The current complete production source SHA is not proven by public-safe evidence.
- Unknown state is represented explicitly.

## Key Areas

- [AI Brain Feature Council Research](Feature-Council-Research)
- [Capture and Ingestion](Capture-and-Ingestion)
- [Search, RAG, and Ask](Search-RAG-and-Ask)
- [Enrichment and AI Providers](Enrichment-and-AI-Providers)
- [Mobile, Extension, and Pairing](Mobile-Extension-and-Pairing)
- [Security, Privacy, and Redaction](Security-Privacy-and-Redaction)
- [Deployment and Operations](Deployment-and-Operations)
- [Documentation Maintenance](Documentation-Maintenance)

The Feature Council section is a dated planning and research record. Its pages distinguish current planning artifacts from historical drafts and do not claim production implementation or runtime verification.

Pinned source entrypoints: [application routes](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/app), [database client](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/src/db/client.ts), and [package scripts](https://github.com/arunpr614/ai-brain/blob/8178117c80923e5724e355fb2684cbc836013d39/package.json).
