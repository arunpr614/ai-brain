# Feature Catalog

Purpose: Provide a current, compact status matrix with links to evidence-backed feature documentation.
Audience: AI agents, engineers, and product/design collaborators.
Verified against: deployed application `8c1341100b174fe4ca518e6a745c30b9078df21c` plus retained feature-specific historical evidence.
Runtime evidence through: 2026-07-12; each row retains its own runtime boundary.
Last reviewed: 2026-07-22 for the NotebookLM one-click export candidate; other rows retain their prior evidence dates.
Owner: AI Brain maintainer.

Implementation status, availability, confidence, and runtime evidence are independent. `Historical dated evidence; not reverified` means an earlier feature-specific record exists, but this review did not reproduce it. The 2026-07-10 label is reserved for boundaries explicitly exercised in that release.

| Feature | Status | Availability | Confidence | Runtime evidence | Detailed page | Verified baseline | Key boundary |
|---|---|---|---|---|---|---|---|
| PIN setup, unlock, sessions | Implemented | Default | High | Historical dated evidence; not reverified | [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing) | `23868faf…` | Single owner; no roles/SSO |
| Bearer API authentication | Implemented | Default | High | Historical dated evidence; not reverified | [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing) | `23868faf…` | One shared client token |
| Android pairing | Implemented | Default | High | Historical dated evidence; not reverified | [Authentication and Pairing](Authentication-Sessions-and-Device-Pairing) | `23868faf…` | Short code returns shared token |
| Theme, responsive shell, navigation, command palette | Implemented | Default | High | Code/test; runtime not rechecked | [Library and Items](Library-and-Item-Management) | `23868faf…` | UI shell, not a separate content capability |
| Library browse/filter/select | Implemented | Default | High | Historical dated evidence; not reverified | [Library and Items](Library-and-Item-Management) | `23868faf…` | No saved smart filters |
| Bulk tag/collect/delete | Implemented | Default | High | Code/test; runtime not rechecked | [Library and Items](Library-and-Item-Management) | `23868faf…` | Authenticated single-owner actions |
| Item detail and source-reading Focus | Implemented | Default | High | Historical dated evidence; not reverified | [Library and Items](Library-and-Item-Management) | `23868faf…` | Not annotation/PDF studio |
| Standalone note capture | Implemented | Default | High | Historical dated evidence; not reverified | [Capture](Capture-and-Ingestion) | `23868faf…` | Separate from attached My notes |
| URL/article capture | Implemented | Default | High | Historical dated evidence; not reverified | [Capture](Capture-and-Ingestion) | `23868faf…` | Some sites metadata-only |
| Browser-selected text capture | Implemented | Extension | High | Code/test; latest runtime not rechecked | [Browser Extension](Browser-Extension) | `23868faf…` | Requires page context and server policy |
| PDF capture | Implemented | Default | High | Historical dated evidence; not reverified | [Capture](Capture-and-Ingestion) | `23868faf…` | One PDF; no OCR/renderer |
| YouTube initial capture | Implemented | Default | High | Historical dated evidence; not reverified | [Capture](Capture-and-Ingestion) | `23868faf…` | Platform/provider variability |
| User-provided transcript repair | Implemented | Default | High | Code/test; runtime scope varies | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | YouTube items only |
| YouTube recovery worker | Implemented | Background | High code; Medium runtime | Code/test; runtime scope varies | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Public recovery policy-limited |
| YouTube production backfill tooling | Implemented | Operator-only | High code; runtime Unknown | Not independently verified | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Production write; private runbook required |
| Official caption recovery | Inactive | Inactive | High | Not deployed as usable feature | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Not wired; authorized OAuth required |
| Owned-media speech-to-text | Inactive | Inactive | High | Route returns 503 | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Provider disabled in current route |
| Capture result contract | Partially implemented | Default | High | Multiple clients verified | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | No single all-channel lifecycle |
| Provenance/artifacts/cache | Implemented | Supporting | High | Historical dated evidence; not reverified | [Capture](Capture-and-Ingestion) | `23868faf…` | Retention contract incomplete |
| Needs Upgrade | Implemented | Default | High | Historical dated evidence; not reverified | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Source quality, not SRS |
| Attention Review inbox | Implemented | Reachable route | High code; Medium runtime | Code/test; runtime not rechecked | [Quality and Repair](Capture-Quality-Review-and-Repair) | `23868faf…` | Not primary navigation or SRS |
| Card Processing Workflow | Implemented | Enabled in verified private production release | High | Staged production workflow and runtime verification 2026-07-12 | [Card Processing Workflow](Card-Processing-Workflow) | `ea7b159…` | Single-owner workflow; no batch, rank, project fields, collaboration, or global archive |
| Unified Repair Center proposal | Planned | Not available | High | No runtime claim | [Ideas and Exploration](Ideas-and-Exploration-Catalog) | `23868faf…` | Several primitives exist; full proposal is absent |
| Android thin client/share | Implemented | Private sideload | High | Historical dated evidence; not reverified | [Mobile and Pairing](Mobile-Extension-and-Pairing) | `23868faf…` | Not public/offline-native |
| Multi-PDF Android share | Rejected | Inactive | High | Rejected by classifier | [Mobile and Pairing](Mobile-Extension-and-Pairing) | `23868faf…` | Single-PDF contract |
| Browser extension | Implemented | User-installed | High | Historical runtime evidence | [Browser Extension](Browser-Extension) | `23868faf…` | No store/overlay proof |
| Telegram capture | Implemented | Configured | High | Webhook boundary verified | [Telegram Capture](Telegram-Capture) | `23868faf…` | Private owner chat only |
| Recall synchronization | Implemented | Default-off flags plus configured daily timer | High code/local proof; host proof pending | Daily timer evidence 2026-07-10; manual control not deployed | [Recall Synchronization](Recall-Synchronization) | `fdd7406…` candidate | Guarded one-way import and manual request UI; not two-way sync |
| AI Memory → NotebookLM one-click export | Experimental | Default-off implementation candidate; not yet deployed | High code; live-provider confidence pending | Code/test candidate; no signed-in consumer NotebookLM runtime claim | [NotebookLM One-Click Export](NotebookLM-One-Click-Export) | Current feature worktree based on `4736ba3…`; final release SHA pending | One explicit item, one fixed owner-only private notebook, copied text only; undocumented consumer web interface |
| AI Brain → NotebookLM synchronization | Deferred research | Not available | High research confidence; zero live Google evidence | 46/46 credential-free local checks; no runtime claim | [NotebookLM Synchronization Research](NotebookLM-Synchronization-Research) | `ad78d774…` audit baseline | No current integration; Enterprise and Drive hypotheses remain account/live-evidence gated |
| AI enrichment/taxonomy | Implemented | Background | High | Historical dated evidence; not reverified | [Enrichment](Enrichment-and-AI-Providers) | `23868faf…` | Queue/provider failures remain |
| Provider abstraction/health | Implemented | Configured | High | Strict providers verified | [Enrichment](Enrichment-and-AI-Providers) | `23868faf…` | Health is point-in-time |
| Tags/categories/topics/collections | Implemented | Default | High | Historical dated evidence; not reverified | [Organization](Organization-Tags-Topics-and-Collections) | `23868faf…` | No hierarchy/smart rules |
| Item/library export | Implemented | Default | High | Code/test; runtime scope varies | [Library and Items](Library-and-Item-Management) | `23868faf…` | One-way; notes excluded by default |
| Chunking/semantic indexing | Implemented | Background | High | Historical dated evidence; not reverified | [Search and Ask](Search-RAG-and-Ask) | `23868faf…` | Provider/index generation dependent |
| FTS/semantic/hybrid search | Implemented | Default | High | Historical dated evidence; not reverified | [Search and Ask](Search-RAG-and-Ask) | `23868faf…` | No rank explanation/source-kind UI |
| Ask with scopes/citations | Implemented | Provider-configured | High | Historical dated evidence; not reverified | [Search and Ask](Search-RAG-and-Ask) | `23868faf…` | Not Evidence Scan |
| Chat persistence | Implemented | Default | High | Historical dated evidence; not reverified | [Search and Ask](Search-RAG-and-Ask) | `23868faf…` | Single-owner only |
| Related items | Implemented | Default | High | Code/test; runtime scope varies | [Search and Ask](Search-RAG-and-Ask) | `23868faf…` | Similarity, not graph |
| Attached My notes | Feature-flagged | Enabled in verified release | High | Verified 2026-07-10 lifecycle/Focus scope | [Manual Content Notes](Manual-Content-Notes) | `23868faf…` | One note/item; not E2EE |
| Notes in AI/connections | Feature-flagged | Consent-gated | High | Verified 2026-07-10 consent/provider boundary | [Manual Content Notes](Manual-Content-Notes) | `23868faf…` | Flags + opt-in + provider acknowledgement |
| Global note AI default | Feature-flagged | Parent note UI/write flags | High | Verified 2026-07-10 Settings/first-save scope | [Manual Content Notes](Manual-Content-Notes) | `23868faf…` | First save/recreation only |
| Note Focus Mode | Feature-flagged | Enabled in verified release | High | Verified 2026-07-10 route/control/canonicalization scope | [Manual Content Notes](Manual-Content-Notes) | `23868faf…` | Physical Android/AT residuals |
| Provider/privacy/offline settings | Implemented | Default | High | Verified 2026-07-10 Settings presence/provider scope | [Security and Privacy](Security-Privacy-and-Redaction) | `23868faf…` | Full Trust Center is a separate planned proposal |
| Offline fallback | Implemented | Client cache | High | Historical client evidence; not reverified | [Mobile and Pairing](Mobile-Extension-and-Pairing) | `23868faf…` | Implements fallback only; full offline library is planned |
| Database backups/restore | Implemented | Operator-controlled | High | Dated backup/restore evidence | [Backups and Restore](Backups-and-Restore) | `23868faf…` | Artifact files not included |
| Health/errors/quota diagnostics | Implemented | Operator-oriented | High | Historical dated evidence; not reverified | [Deployment and Operations](Deployment-and-Operations) | `23868faf…` | Not general analytics |
| Local status tooling | Implemented | Operator-only | High code; runtime Unknown | Not independently verified | [Deployment and Operations](Deployment-and-Operations) | `23868faf…` | Availability varies by machine |

Planned, explored, deferred, rejected, and superseded capabilities are cataloged separately in [Ideas and Exploration](Ideas-and-Exploration-Catalog).
