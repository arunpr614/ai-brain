# Technology Stack Inventory

**Manifest baseline:** `23868faf13c8e3d0821715e6f5d0e3d2af1e1a34`
**Verified:** 2026-07-11

| Layer | Technology and version | Purpose | Evidence |
|---|---|---|---|
| Runtime | Node `>=22 <23`; `.nvmrc` 22 | Next.js server and tooling | `package.json`, `.nvmrc` |
| Web framework | Next.js 16.2.9 | App Router pages, actions, APIs, standalone build | package/lock and `next.config.ts` |
| UI | React/React DOM 19.2.4 | Server/client UI | package/lock |
| Language | TypeScript 5.9.3 | Application and scripts | lockfile/tsconfig |
| Styling | Tailwind CSS and PostCSS plugin 4.2.4; Radix primitives; Lucide | Design system and accessible primitives | package/lock, styles/components |
| Validation | Zod 3.25.76 | Request/config validation | lockfile/source |
| Database | better-sqlite3 11.10.0 | Synchronous single-file persistence | package/lock, `src/db/client.ts` |
| Lexical search | SQLite FTS5 | Items and attached-note full-text search | migrations/repositories |
| Vector search | sqlite-vec 0.1.9 | 768-dimensional vector storage/KNN | package/lock, migrations/vector code |
| Article extraction | Mozilla Readability 0.6.0 and jsdom 29.1.1 | Web document parsing | package/lock, capture code |
| PDF extraction | unpdf 1.6.2 | PDF text extraction | package/lock, PDF capture |
| Export | JSZip 3.10.1 | Library ZIP export | package/lock, export route |
| Scheduling | node-cron 4.2.1 plus systemd/cron | In-process batch jobs and external timers | package/lock, instrumentation/deploy files |
| Markdown | React Markdown 10.1.0, remark-gfm 4.0.1 | Note/source rendering | package/lock, components |
| Mobile | Capacitor core/CLI/Android 8.3.3 | Thin Android WebView client | package/lock, Android project |
| Mobile plugins | Filesystem 8.1.2, Preferences 8.0.1, Capgo share target 8.0.30 | Native files, token storage, share intents | package/lock |
| Android toolchain | min SDK 24, compile/target 36, AGP 8.13.0, Gradle 8.14.3, Java 21 | APK build/runtime | Gradle configuration/wrapper |
| Android app version | versionName 1.0.7, versionCode 8 | APK identity | `android/app/build.gradle` |
| Extension | Chrome Manifest V3, version 0.6.2, Vite 6.4.2 | Browser capture client | extension manifest/lock |
| Text providers | Ollama; Anthropic; OpenRouter | Enrichment and Ask | `src/lib/llm/` |
| Embedding providers | Ollama `nomic-embed-text`; Gemini `gemini-embedding-001` at 768 dimensions | Semantic indexing/query embeddings | `src/lib/embed/` |
| Default local text model | `qwen2.5:7b-instruct-q4_K_M` | Ollama default | LLM provider code/config |
| Default Anthropic model | `claude-haiku-4-5-20251001` | Direct/batch generation default | Anthropic adapter |
| Default OpenRouter model | `anthropic/claude-sonnet-4-6` | Locked-upstream generation default | OpenRouter adapter |
| Testing | Node test runner with `tsx`; fake IndexedDB; jsdom | Unit/integration behavior | package scripts and 127 test files |
| Static checks | ESLint 9, Next config, TypeScript | Code quality/type safety | package scripts/config |
| Deployment | Next standalone output, systemd service, managed edge/tunnel | Hosted private application | `next.config.ts`, deploy scripts/service |
| CI | GitHub Actions `agent-docs.yml` | Wiki/privacy/coverage validation only | `.github/workflows/agent-docs.yml` |
| Observability | health/provider endpoints, JSONL sink, journald, queue/report tables | Operator diagnosis | health/errors/provider/Recall code |

## Versioning caveat

The repository and extension still report `0.6.2`, while Android reports `1.0.7`/8 and the code contains later feature work. These numbers are package/client identifiers, not a reliable capability-status source.
