# Technology Stack

Purpose: Record the manifest-backed technology choices and versions used by current main.
Audience: AI agents, engineers, and operators.
Verified against: `8c1341100b174fe4ca518e6a745c30b9078df21c`.
Runtime evidence through: 2026-07-10; versions are source-manifest evidence unless explicitly runtime-verified.
Last reviewed: 2026-07-11.
Owner: AI Brain maintainer.

| Layer | Current technology |
|---|---|
| Runtime/framework | Node 22; Next.js 16.2.9; React 19.2.4; TypeScript 5.9.3 |
| UI/styling | Tailwind CSS 4.2.4, Radix primitives, Lucide, React Markdown 10.1.0, remark-gfm 4.0.1 |
| Persistence | better-sqlite3 11.10.0, SQLite FTS5, sqlite-vec 0.1.9 |
| Validation/extraction | Zod 3.25.76, Mozilla Readability 0.6.0, jsdom 29.1.1, unpdf 1.6.2 |
| Export/scheduling | JSZip 3.10.1, node-cron 4.2.1, external system timers/cron |
| Generation | Ollama, Anthropic, OpenRouter adapters |
| Embeddings | Ollama `nomic-embed-text`; Gemini `gemini-embedding-001` at 768 dimensions |
| Mobile | Capacitor 8.3.3; Android min SDK 24, target/compile 36; Java 21; Gradle 8.14.3 |
| Browser extension | Chrome Manifest V3; Vite build; extension version 0.6.2 |
| Testing/checks | Node test runner through `tsx`, jsdom, fake IndexedDB, TypeScript, ESLint 9 |
| Deployment | Next standalone Node service, managed edge/tunnel, system service, SQLite backups |
| Observability | health/provider endpoints, JSONL client-error sink, system journal, queue/report tables |

The repository/extension version `0.6.2` and Android version `1.0.7`/8 are client/package identifiers, not reliable feature-status sources.
