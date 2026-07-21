# Google Platform Research — AI Brain → NotebookLM

**Accessed:** 2026-07-21
**Scope:** Current official Google documentation only
**Status:** Public evidence complete; account eligibility and observed behavior remain unverified

## Executive finding

Google documents programmatic notebook and source management for the separate Google Cloud product now named **Gemini Notebook Enterprise**. The notebook/source API uses Discovery Engine `v1alpha`, and the current how-to pages label it **Preview** under Pre-GA terms.

No documented public source-management API was found for consumer NotebookLM, its paid Google AI tiers, or ordinary Google Workspace NotebookLM. That is a search conclusion, not an explicit Google promise that no API exists. Paid consumer and Workspace plans increase product limits but do not establish Cloud Enterprise API entitlement.

Two supported candidate paths therefore remain:

1. **Direct Enterprise Preview API**, only when the user has a licensed, IAM-enabled Gemini Notebook Enterprise project/notebook and accepts Pre-GA risk.
2. **Google Docs/Drive staging**, in which AI Brain maintains a bounded publication-safe Google Doc using official Workspace APIs and the user imports it into consumer/Workspace NotebookLM once. Current Google help describes periodic and on-open refresh plus manual sync. This is documented UI behavior, not an API, freshness SLA, or behavior yet observed for the target account.

Existing personal/Workspace notebooks must not be assumed reachable through the Enterprise API. Google states that personal/Plus notebooks cannot be directly accessed in Gemini Notebook Enterprise.

## Product and edition map

### Consumer Google Accounts

| Level | Notebooks/user | Sources/notebook | Chats/day |
|---|---:|---:|---:|
| Standard | 100 | 50 | 50 |
| Google AI Plus | 200 | 100 | 200 |
| Google AI Pro | 500 | 300 | 500 |
| Google AI Ultra, 20 TB | 500 | 500 | 2,500 |
| Google AI Ultra, 30 TB | 500 | 600 | 5,000 |

Each source is limited to 500,000 words; a local upload is also limited to 200 MB. Current public pricing is country-dependent. The paid plans above remain consumer plans, not Gemini Notebook Enterprise licenses.

### Google Workspace and Workspace for Education

Google maps Workspace editions into Standard, More, Higher, Expanded, and Highest access groups:

| Access group | Notebooks/user | Sources/notebook | Chats/day |
|---|---:|---:|---:|
| Standard | 100 | 50 | 50 |
| More | 200 | 100 | 200 |
| Higher | 500 | 300 | 500 |
| Expanded | 500 | 400 | 1,000 |
| Highest | 500 | 600 | 5,000 |

Data handling differs by Workspace edition. For editions where NotebookLM is a core service, uploads, queries, and responses are not reviewed by humans or used to train generative AI models. Additional-service editions follow the separate terms identified by Google’s Workspace matrix; edition must be confirmed before privacy claims are made.

### Gemini Notebook Enterprise

Gemini Notebook Enterprise is a Google Cloud product, separate from consumer and ordinary Workspace NotebookLM. Google renamed NotebookLM Enterprise on 2026-07-16; subscription and IAM/API identifiers may still use `NotebookLM` or `notebooklm`.

Eligibility requires, at minimum:

- a Google Cloud project with billing;
- the Discovery Engine API;
- configured Cloud Identity/Workspace identity or supported third-party identity;
- the `Cloud Gemini Notebook User` IAM role;
- a user license in the notebook’s multi-region; and
- sufficient notebook Owner/Editor permissions.

The public list price is USD 9/license/month. Subscriptions contain at least 15 licenses, so USD 135/month is the inferred minimum list-price commitment before discount or tax. A 14-day trial is documented. No new paid subscription is authorized by this research goal.

Enterprise product limits are 500 notebooks/user, 300 sources/notebook, 500 MB or 500,000 words/source, and 500 queries/user/day.

## Direct Enterprise API

### Release stage and endpoint

Current notebook/source how-to pages mark the feature **Preview**, subject to Pre-GA terms, and the surface is `v1alpha`:

```text
https://{global|us|eu}-discoveryengine.googleapis.com/v1alpha/
projects/{PROJECT_NUMBER}/locations/{LOCATION}/...
```

A 2025 release-note entry described notebook creation/management as GA. That conflicts with the current how-to pages; source-management GA is even less clear. Until Google confirms the applicable project terms, this research treats the whole notebook/source API path as Pre-GA.

### Documented notebook operations

- Create a notebook.
- Get a notebook, including its source array.
- List recently viewed notebooks, up to 500 per page.
- Batch-delete notebooks.
- Share notebooks with project users/roles.

### Documented source operations

- `notebooks.sources.batchCreate`: Google Docs/Slides, raw text, public web URLs, and YouTube URLs.
- `notebooks.sources.uploadFile`: one uploaded file.
- `notebooks.sources.get`: source status, metadata, and failure details.
- `notebooks.sources.batchDelete`: source deletion.

Supported upload families include PDF, TXT, Markdown, DOCX, PPTX, XLSX, PNG/JPG/JPEG, and the documented audio/video containers. CSV and ePub appear in consumer UI support but are not listed by the Enterprise upload API.

`GetSource` exposes pending, complete, error, pending-deletion, tentative, and unspecified states. No webhook is documented; clients must poll to a supported terminal state. Failure reasons include size/empty input, upload/ingestion, Drive access, policy/MIME/domain, paywall/unreachable URL, YouTube, and transcription failures.

### Material gaps

No supported public operation was found for:

- source update or replacement;
- source refresh;
- a dedicated source-list method, although `GetNotebook` returns sources;
- webhooks;
- a caller-supplied source identifier;
- an idempotency/request key;
- notebook rename/update;
- a documented batch-create maximum; or
- method-specific API rate quotas.

IAM permission names such as `sources.update` or `sources.refresh` do not establish a callable supported API and must not be used as implementation evidence.

Enterprise sources are documented as static copies. Drive-backed Enterprise sources must not be assumed to auto-refresh. An initial direct-API design should be append-and-retain, with deletion only after a replacement source reaches `COMPLETE`.

## Authentication and authorization

The source methods require an accepted Discovery Engine or `cloud-platform` OAuth scope and granular IAM permissions such as `discoveryengine.sources.create`.

Generic Gemini Enterprise authentication documents user Application Default Credentials, service-account impersonation, attached service accounts, and workload identity. However, notebook ownership/licensing behavior for a service account is not documented. Generic Discovery Engine service-account support does not prove that an unlicensed service account can operate a licensed user’s notebook.

The first permitted Enterprise spike should therefore use official interactive credentials for the licensed user. Workload/service-account access, if desired, must be a separate bounded authentication approach. Google Docs/Slides sources explicitly require Google user credentials through `gcloud auth login --enable-gdrive-access`; service-account-only Drive ingestion and domain-wide delegation are not documented by the Notebook API guide.

No credentials, tokens, cookies, client secrets, or private keys should appear in chat, logs, or repository files.

## Supported Drive/Docs fallback

For consumer or Workspace NotebookLM, current English Google help documents this supported flow:

1. AI Brain creates a Google Doc through `documents.create`.
2. AI Brain writes or replaces a structured digest through `documents.batchUpdate`.
3. The user imports that Doc into the target notebook once.
4. Current help says NotebookLM refreshes the Drive source periodically and when the notebook opens; a user can also request manual sync. Treat that as account-specific behavior to validate, not an observable API contract.

Use three-legged user OAuth and prefer the non-sensitive `drive.file` scope, which limits the app to files it creates or the user explicitly opens with it. A personal account practically requires user OAuth because service accounts cannot own My Drive files. Workspace automation using a shared drive or domain-wide delegation requires separate administrator approval and is not the default recommendation.

A bounded rolling Doc is preferable to one file per AI Brain item. It gives AI Brain a supported update surface and can keep source growth low only while the same Doc remains within both NotebookLM and native Google Docs limits. Rotate before either limit; every new Doc requires a one-time NotebookLM import and an explicit decision to retain or manually remove the prior source.

Google currently documents Docs API quotas of 600 write requests/minute/project and 60 write requests/minute/user/project. Standard use currently has no additional charge, though Google warns that quota overages are planned to become billable later in 2026. This project authorizes USD 0 external spend, so production planning must retain a zero-overage posture.

## Regions, storage, and security

- Public source/API examples document `global`, `us`, and `eu`.
- Canada, India, Japan, Singapore, and the UK have additional allowlisted availability; exact source endpoint behavior requires confirmation before commitment.
- Enterprise data remains within the configured Google Cloud project/location boundary and is not directly accessible as a Cloud Storage object.
- Google-default encryption at rest is automatic.
- CMEK is limited by region and must be configured before notebook creation; current docs say existing notebooks cannot be converted and keys cannot be changed/rotated.
- NotebookLM Enterprise support in VPC Service Controls is GA with no listed Notebook-specific limitation.
- Cloud Audit Logs and optional usage audit logging are available.
- Usage logging can capture prompts, responses, citations, source names, and core content; Google explicitly warns that sensitive data is not filtered. It must remain disabled or receive a separate privacy/retention approval for AI Brain content.

## Architecture implications

### Enterprise path

- Prefer one dated aggregate Markdown/raw-text source per successful daily run.
- Persist source resource name/ID and poll to `COMPLETE` before marking item state successful.
- Include a deterministic, non-secret run/content marker in the title/body.
- After an ambiguous create response, reconcile through `GetNotebook` and source metadata before retry; blind retries can duplicate sources.
- Use retention deletion only for sources created by this integration and only after replacement completion.

At one source/day, the 300-source limit lasts roughly 300 days without deletion. Per-item sources exhaust the same limit in 30, 6, or 3 days at 10, 50, or 100 items/day.

### Consumer/Workspace path

- Maintain one bounded rolling Google Doc or a small rotation set.
- Store a per-item publication ledger and reconstruct the full Doc from authoritative eligible items, rather than relying on fragile incremental offsets.
- Do not claim the target notebook source is updated. The application can prove only that the Drive write succeeded; NotebookLM refresh is documented UI behavior without a supported observation API or freshness SLA.
- UI status should distinguish `Drive document updated` from `NotebookLM refresh observed`; the latter cannot currently be programmatically verified.

## Minimum Gate 0 request

After public and repository research, only these non-secret lane-selection facts are required:

1. Is the account **consumer NotebookLM**, **NotebookLM through Google Workspace**, or **Gemini Notebook Enterprise on Google Cloud**? What exact edition text is visible?
2. If Enterprise access already exists, is a license assigned and is synthetic use of the current Preview/Pre-GA API permitted?
3. May one empty synthetic test notebook and one private app-created synthetic Google Doc be used?
4. Can the user complete an official local user browser/`gcloud` authorization flow without sharing secrets?
5. For consumer/Workspace, is one manual Doc import and manual visual refresh verification acceptable?

Do not paste URLs, notebook/project/source identifiers, screenshots containing account details, credentials, OAuth codes, cookies, or secrets. Applicable identifiers can be entered locally only after the lane is selected. Schedule, content eligibility, retention, and edit/delete preferences are deferred until feasibility is established.

## Primary official sources

- [Gemini Notebook Enterprise overview](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/overview)
- [Create and manage notebooks API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks)
- [Add and manage sources API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources)
- [Source REST reference](https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.notebooks.sources)
- [Batch-create REST reference and scopes](https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.notebooks.sources/batchCreate)
- [Enterprise setup](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-notebooklm)
- [Enterprise licensing](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-licensing)
- [Enterprise FAQ](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/faq)
- [Gemini Enterprise authentication](https://docs.cloud.google.com/gemini/enterprise/docs/authentication)
- [Gemini Enterprise release notes](https://docs.cloud.google.com/gemini/enterprise/docs/release-notes)
- [NotebookLM plans and limits](https://support.google.com/notebooklm/answer/16213268?hl=en)
- [NotebookLM source and Drive-sync behavior](https://support.google.com/notebooklm/answer/16215270?co=GENIE.Platform%3DDesktop&hl=en)
- [Workspace edition matrix](https://support.google.com/notebooklm/answer/16337734?hl=en)
- [Google Docs API create](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/create)
- [Google Docs API batch update](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate)
- [Google Docs OAuth scopes](https://developers.google.com/workspace/docs/api/auth)
- [Docs API usage limits](https://developers.google.com/workspace/docs/api/limits)
- [Drive API usage limits](https://developers.google.com/workspace/drive/api/guides/limits)
- [Usage audit logging](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/set-up-usage-audit-logs-for-nblme)
- [VPC Service Controls product support](https://docs.cloud.google.com/vpc-service-controls/docs/supported-products)

## Unresolved evidence

- Current GA-versus-Preview documentation conflict.
- Service-account notebook ownership and regional-license behavior.
- Source create/upload rate quotas and batch maximum.
- In-country source endpoint behavior.
- Exact pricing when bundled with broader Gemini Enterprise contracts.
- Source-deletion completion timing.
- Programmatic confirmation of consumer NotebookLM’s eventual Drive refresh.
