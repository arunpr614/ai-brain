# Agent Documentation Source Inventory

Generated from the fetched `origin/main` baseline and the documentation worktree baseline. Every in-scope artifact is classified; package scripts are enumerated separately in the command-safety registry.

| Artifact | Baseline | Kind | Domain | Classification | Feature row | Documentation page | Evidence |
|---|---|---|---|---|---|---|---|
| `android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java` | Main + Worktree | Android source | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `android/app/src/main/AndroidManifest.xml` | Main + Worktree | Android source | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `android/app/src/main/java/com/arunprakash/brain/MainActivity.java` | Main + Worktree | Android source | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `android/app/src/test/java/com/getcapacitor/myapp/ExampleUnitTest.java` | Main + Worktree | Android source | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/manifest.json` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/background.ts` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/capture.ts` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/options.html` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/options.ts` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/popup.html` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `extension/src/popup.ts` | Main + Worktree | Extension source | Extension | Supporting implementation | Extension | Mobile-Extension-and-Pairing | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `scripts/backup-offsite.sh` | Main + Worktree | Operational script | Operations | Operational tool | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `scripts/deploy.sh` | Main + Worktree | Operational script | Operations | Operational tool | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `scripts/deploy/brain-backup.cron` | Main + Worktree | Operational script | Operations | Operational tool | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `scripts/deploy/brain-recall-sync.service` | Worktree only | Operational script | Recall sync | Operational tool | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `scripts/deploy/brain-recall-sync.timer` | Worktree only | Operational script | Recall sync | Operational tool | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `scripts/deploy/brain.service` | Main + Worktree | Operational script | Operations | Operational tool | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `scripts/deploy/cutover.sh` | Main + Worktree | Operational script | Operations | Operational tool | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/actions.ts` | Main + Worktree | Server actions | Application shell | Documented internal capability | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/ask/route.ts` | Main + Worktree | API route | Search and Ask | Documented internal capability | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/capture/note/route.ts` | Main + Worktree | API route | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/capture/pdf/route.ts` | Main + Worktree | API route | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/capture/transcript/route.ts` | Worktree only | API route | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/api/capture/url/route.ts` | Main + Worktree | API route | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/errors/client/route.ts` | Main + Worktree | API route | Application shell | Documented internal capability | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/health/route.ts` | Main + Worktree | API route | Application shell | Documented internal capability | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/items/[id]/enrich/route.ts` | Main + Worktree | API route | Enrichment | Documented internal capability | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/items/[id]/enrichment-status/route.ts` | Main + Worktree | API route | Enrichment | Documented internal capability | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/items/[id]/export.md/route.ts` | Main + Worktree | API route | Library | Documented internal capability | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/library/export.zip/route.ts` | Main + Worktree | API route | Library | Documented internal capability | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/search/route.ts` | Main + Worktree | API route | Search and Ask | Documented internal capability | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/settings/device-pairing/exchange/route.ts` | Main + Worktree | API route | Auth and security | Documented internal capability | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/settings/device-pairing/route.ts` | Main + Worktree | API route | Auth and security | Documented internal capability | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/settings/provider-status/route.ts` | Main + Worktree | API route | Application shell | Documented internal capability | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/settings/rotate-token/route.ts` | Main + Worktree | API route | Application shell | Documented internal capability | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/telegram/webhook/route.ts` | Main + Worktree | API route | Telegram | Documented internal capability | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/threads/[id]/messages/route.ts` | Main + Worktree | API route | Chat | Documented internal capability | Chat | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/threads/[id]/route.ts` | Main + Worktree | API route | Chat | Documented internal capability | Chat | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/threads/route.ts` | Main + Worktree | API route | Chat | Documented internal capability | Chat | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/api/transcripts/owned-media/route.ts` | Worktree only | API route | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/ask/page.tsx` | Main + Worktree | Page | Search and Ask | Documented user feature | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/auth-actions.ts` | Main + Worktree | Server actions | Auth and security | Documented internal capability | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/capture-actions.ts` | Main + Worktree | Server actions | Capture | Documented internal capability | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/capture/page.tsx` | Main + Worktree | Page | Capture | Documented user feature | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/capture/share-result/page.tsx` | Worktree only | Page | Capture | Documented user feature | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/collections/[id]/page.tsx` | Main + Worktree | Page | Organization | Documented user feature | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/debug/quota/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/items/[id]/ask/page.tsx` | Main + Worktree | Page | Search and Ask | Documented user feature | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/items/[id]/page.tsx` | Main + Worktree | Page | Library | Documented user feature | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/items/[id]/repair/actions.ts` | Worktree only | Server actions | Quality and review | Documented internal capability | Quality and review | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/items/[id]/repair/page.tsx` | Worktree only | Page | Quality and review | Documented user feature | Quality and review | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/items/[id]/upgrade-actions.ts` | Main only | Server actions | Quality and review | Documented internal capability | Quality and review | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/items/new/page.tsx` | Main + Worktree | Page | Library | Documented user feature | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/library/page.tsx` | Worktree only | Page | Library | Documented user feature | Library | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/more/page.tsx` | Worktree only | Page | Application shell | Documented user feature | Application shell | System-Architecture | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/needs-upgrade/page.tsx` | Worktree only | Page | Quality and review | Documented user feature | Quality and review | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/review/actions.ts` | Main only | Server actions | Quality and review | Documented internal capability | Quality and review | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/review/page.tsx` | Main only | Page | Quality and review | Documented user feature | Quality and review | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/search/page.tsx` | Main + Worktree | Page | Search and Ask | Documented user feature | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/settings/collections/page.tsx` | Main + Worktree | Page | Organization | Documented user feature | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/settings/device-pairing/page.tsx` | Main + Worktree | Page | Auth and security | Documented user feature | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/settings/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/settings/tags/page.tsx` | Main + Worktree | Page | Organization | Documented user feature | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/setup-apk/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/setup/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/taxonomy-actions.ts` | Main + Worktree | Server actions | Organization | Documented internal capability | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/app/topics/[slug]/page.tsx` | Worktree only | Page | Organization | Documented user feature | Organization | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/app/unlock/page.tsx` | Main + Worktree | Page | Application shell | Documented user feature | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/capture-artifacts.ts` | Main + Worktree | Database module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/chat.ts` | Main + Worktree | Database module | Chat | Supporting implementation | Chat | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/chunks.ts` | Main + Worktree | Database module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/client.ts` | Main + Worktree | Database module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/collections.ts` | Main + Worktree | Database module | Organization | Supporting implementation | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/item-upgrades.ts` | Main only | Database module | Quality and review | Supporting implementation | Quality and review | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/items.ts` | Main + Worktree | Database module | Library | Supporting implementation | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/metadata-cache.ts` | Main + Worktree | Database module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/001_initial_schema.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/002_fts5.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/003_enrichment_queue.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/004_items_add_quotes.sql` | Main + Worktree | Migration | Library | Supporting implementation | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/005_vector_index.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/006_embedding_jobs.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/007_youtube_duration.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/008_batch_id.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/009_telegram_source_type.sql` | Main + Worktree | Migration | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/010_device_pairing_codes.sql` | Main + Worktree | Migration | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/011_telegram_updates.sql` | Main + Worktree | Migration | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/012_capture_source.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/013_capture_quality.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/014_capture_artifacts.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/015_capture_metadata_cache.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/016_capture_artifacts_hardening.sql` | Main + Worktree | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/017_topics.sql` | Worktree only | Migration | Organization | Supporting implementation | Organization | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/migrations/017_transcript_recovery.sql` | Main only | Migration | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/migrations/018_transcript_policy_sources.sql` | Worktree only | Migration | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/migrations/019_transcript_segments.sql` | Worktree only | Migration | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/migrations/020_recall_sync.sql` | Worktree only | Migration | Application shell | Supporting implementation | Application shell | System-Architecture | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/recall-sync.ts` | Worktree only | Database module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/settings.ts` | Main + Worktree | Database module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/tags.ts` | Main + Worktree | Database module | Organization | Supporting implementation | Organization | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/telegram-updates.ts` | Main + Worktree | Database module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/topics.ts` | Worktree only | Database module | Organization | Supporting implementation | Organization | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/db/transcript-jobs.ts` | Main only | Database module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/db/transcripts.ts` | Worktree only | Database module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/android-share/request.ts` | Worktree only | Library module | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/android-share/result.ts` | Worktree only | Library module | Android | Supporting implementation | Android | Mobile-Extension-and-Pairing | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/ask/generator.ts` | Main + Worktree | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/ask/history.ts` | Worktree only | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/ask/parse-citations.ts` | Main + Worktree | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/ask/scope.ts` | Worktree only | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/ask/sse.ts` | Main + Worktree | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/auth.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/auth/api-version.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/auth/bearer.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/backup.ts` | Main + Worktree | Library module | Operations | Supporting implementation | Operations | Deployment-and-Operations | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/artifacts.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/capture-url.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/dedup.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/http.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/jsonld.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/linkedin.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/opengraph.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/pdf.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/platform.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/policy.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/quality.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/result.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/rss.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/selected-text.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/source.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/strip.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/substack.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/transcripts/mock-owned-media-stt.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/openai-owned-media-stt.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/owned-media-stt-route-service.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/owned-media-stt.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/parse-file.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/recovery-options.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/user-provided.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/transcripts/youtube-official.ts` | Worktree only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/capture/types.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/upgrade-policy.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/url-safety.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/url.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/user-provided.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-body.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-metadata.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-transcript/backfill.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-transcript/provider-health.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-transcript/recovery.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-url.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube-user-text.ts` | Main only | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/capture/youtube.ts` | Main + Worktree | Library module | Capture | Supporting implementation | Capture | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/chunk/index.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/client/reachability-decision.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/client/reachability.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/client/register-sw.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/client/setup-apk-pairing.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/client/use-ask-stream.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/cn.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/config/tunnel.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/device-pairing/codes.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/device-pairing/create-route-handler.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/device-pairing/exchange-route-handler.ts` | Main + Worktree | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/device-pairing/token-display.ts` | Worktree only | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/embed/client.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/embed/factory.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/embed/gemini.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/embed/ollama-provider.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/embed/pipeline.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/embed/types.ts` | Main + Worktree | Library module | Embeddings | Supporting implementation | Embeddings | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/enrich/pipeline.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/enrich/prompts.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/errors/sink.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/items/status.ts` | Main + Worktree | Library module | Library | Supporting implementation | Library | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/lan/info.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/library/scope-health.ts` | Worktree only | Library module | Library | Supporting implementation | Library | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/library/selected-actions.ts` | Worktree only | Server actions | Library | Documented internal capability | Library | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/llm/anthropic.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/llm/errors.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/llm/factory.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/llm/ollama.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/llm/openrouter.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/llm/types.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/providers/status.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/queue/enrichment-batch-cron.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/queue/enrichment-batch.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/queue/enrichment-worker.ts` | Main + Worktree | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/queue/transcript-worker.ts` | Main only | Library module | Enrichment | Supporting implementation | Enrichment | Enrichment-and-AI-Providers | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/recall/client.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/fidelity.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/importer.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/mapper.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/scheduler.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/sync-runner.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/recall/types.ts` | Worktree only | Library module | Recall sync | Supporting implementation | Recall sync | Capture-and-Ingestion | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/related/index.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/repair/item-repair.ts` | Worktree only | Library module | Quality and review | Supporting implementation | Quality and review | Feature-Catalog | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/retrieve/index.ts` | Main + Worktree | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/review/attention.ts` | Main only | Library module | Quality and review | Supporting implementation | Quality and review | Feature-Catalog | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/search/index.ts` | Main + Worktree | Library module | Search and Ask | Supporting implementation | Search and Ask | Search-RAG-and-Ask | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/security/redaction.ts` | Worktree only | Library module | Auth and security | Supporting implementation | Auth and security | Security-Privacy-and-Redaction | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/settings/trust-copy.ts` | Worktree only | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/shell/private-counts.ts` | Worktree only | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 8178117c80923e5724e355fb2684cbc836013d39 |
| `src/lib/telegram/client.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/telegram/dispatch.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/telegram/schema.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/telegram/types.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/telegram/webhook-handler.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/telegram/webhook-rate-limit.ts` | Main + Worktree | Library module | Telegram | Supporting implementation | Telegram | Capture-and-Ingestion | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `src/lib/theme.ts` | Main + Worktree | Library module | Application shell | Supporting implementation | Application shell | System-Architecture | 2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a |
| `package.json#scripts` | Main + Worktree | Script registry | Operations | Operational tool | Command safety | Command-Safety | command-safety-registry.md |
| `ROADMAP_TRACKER.md` planned lanes | Main + Worktree | Planning evidence | Product roadmap | Planned only | Future parity | Product-Overview | Tracker evidence only; never implementation proof |
