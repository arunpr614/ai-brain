# AI Brain Feature Council Research

Purpose: Preserve AI Brain Feature Council research and planning evidence.
Audience: Product, design, engineering, documentation maintainers, and AI agents.
Artifact source commit: `9de8de87de915e874e8290aa556e2b6772d6fabf`
Audited application baseline: `2b4db9540d0b76ee6d3aa2a9da5f788b69a8d02a`
Research evidence date: 2026-06-28.
Lifecycle: Current feature-council artifact.
Runtime verification: Not provided.
Superseded by: None.
Public disclosure: Reviewed and sanitized.
Owner: AI Brain maintainer.

> **Current feature-council artifact.** This is planning evidence, not proof of production implementation or current runtime behavior.

## Reading Paths

- Product direction: [Final handoff](Feature-Council-Final-Handoff-Summary) and [decision log](Feature-Council-Decision-Log).
- Current implementation packages: [approved feature packages](#approved-feature-packages).
- Evidence and gaps: [live feature audit](Feature-Council-Live-Feature-Audit), [research inventory](Feature-Council-Research-Feature-Inventory), and [gap matrix](Feature-Council-Feature-Gap-Matrix).
- Historical record: [v1 drafts](#v1-drafts) and their linked adversarial reviews.
- Prototype source artifacts: [master-ai-brain-prototype.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/master-ai-brain-prototype.html), [fcp001-capture-repair-center.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp001-capture-repair-center.html), [fcp003-contextual-ask-evidence.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp003-contextual-ask-evidence.html), [fcp005-trust-center.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp005-trust-center.html). The wiki links to immutable source; interactive hosting is outside this publication.

Created: 2026-06-28 21:23 IST  
Branch: `codex/ai-brain-feature-council-20260628`  
Status: Reviewed v2 planning package complete  
Scope: Product discovery, UX design, PRD, and technical planning only. No production code was implemented.

## Start Here

1. [LIVE_FEATURE_AUDIT.md](Feature-Council-Live-Feature-Audit) - what exists today in AI Brain.
2. [RESEARCH_FEATURE_INVENTORY.md](Feature-Council-Research-Feature-Inventory) - note.md/research feature inventory and evidence confidence.
3. [FEATURE_GAP_MATRIX.md](Feature-Council-Feature-Gap-Matrix) - mapping of research ideas against live app state.
4. [FEATURE_COUNCIL_DECISION_LOG.md](Feature-Council-Decision-Log) - feature-by-feature council decisions.
5. [PROJECT_TRACKER.md](Feature-Council-Project-Tracker) - status, risks, priorities, blockers, and next actions.
6. [FINAL_HANDOFF_SUMMARY.md](Feature-Council-Final-Handoff-Summary) - concise handoff for the next goal.

## Core Artifact Lifecycle

| Artifact | v1 | Review | v2/final |
| --- | --- | --- | --- |
| Core baseline | [00_CORE_ARTIFACTS_v1.md](Feature-Council-Core-Artifacts-v1) | [reviews/CORE_ARTIFACTS_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-Core-v1-Adversarial-Review) | Split into required final artifacts below |
| Live audit | Included in core v1 | Core review | [LIVE_FEATURE_AUDIT.md](Feature-Council-Live-Feature-Audit) |
| Research inventory | Included in core v1 | Core review | [RESEARCH_FEATURE_INVENTORY.md](Feature-Council-Research-Feature-Inventory) |
| Gap matrix | Included in core v1 | Core review | [FEATURE_GAP_MATRIX.md](Feature-Council-Feature-Gap-Matrix) |
| Decision log | Included in core v1 | Core review | [FEATURE_COUNCIL_DECISION_LOG.md](Feature-Council-Decision-Log) |
| Project tracker | Included in core v1 | Core review | [PROJECT_TRACKER.md](Feature-Council-Project-Tracker) |

## Approved Feature Packages

| ID | Package | Decision | Priority | PRD | UX | Technical plan | Review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FCP-001 | Capture Quality And Repair Center | Proceed | P0 | [prd/PRD_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v2.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v2) | [ux/UX_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v2.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v2) | [technical/TECH_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v2.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v2) | [reviews/FCP001_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-001-v1-Adversarial-Review) |
| FCP-002 | Source Workspace And Reading Studio Lite | Proceed reduced scope | P1 | [prd/PRD_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v2.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v2) | [ux/UX_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v2.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v2) | [technical/TECH_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v2.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v2) | [reviews/FCP002_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-002-v1-Adversarial-Review) |
| FCP-003 | Contextual Ask And Evidence Scan | Proceed reduced scope | P1 | [prd/PRD_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v2.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v2) | [ux/UX_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v2.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v2) | [technical/TECH_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v2.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v2) | [reviews/FCP003_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-003-v1-Adversarial-Review) |
| FCP-004 | Relationship Graph And Connection Map | Proceed reduced scope | P2 | [prd/PRD_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v2.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v2) | [ux/UX_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v2.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v2) | [technical/TECH_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v2.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v2) | [reviews/FCP004_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-004-v1-Adversarial-Review) |
| FCP-005 | AI Services And Privacy Trust Center | Proceed | P0 | [prd/PRD_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v2.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v2) | [ux/UX_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v2.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v2) | [technical/TECH_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v2.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v2) | [reviews/FCP005_PACKAGE_V1_ADVERSARIAL_REVIEW_2026-06-28_21-23-55_IST.md](Feature-Council-FCP-005-v1-Adversarial-Review) |

## v1 Drafts

| ID | PRD v1 | UX v1 | Technical v1 |
| --- | --- | --- | --- |
| FCP-001 | [prd/PRD_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-PRD-v1) | [ux/UX_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-UX-v1) | [technical/TECH_FCP001_CAPTURE_QUALITY_REPAIR_CENTER_v1.md](Feature-Council-FCP-001-Capture-Quality-Repair-Center-Technical-v1) |
| FCP-002 | [prd/PRD_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-PRD-v1) | [ux/UX_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-UX-v1) | [technical/TECH_FCP002_SOURCE_WORKSPACE_READING_STUDIO_LITE_v1.md](Feature-Council-FCP-002-Source-Workspace-Reading-Studio-Lite-Technical-v1) |
| FCP-003 | [prd/PRD_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-PRD-v1) | [ux/UX_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-UX-v1) | [technical/TECH_FCP003_CONTEXTUAL_ASK_EVIDENCE_SCAN_v1.md](Feature-Council-FCP-003-Contextual-Ask-Evidence-Scan-Technical-v1) |
| FCP-004 | [prd/PRD_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-PRD-v1) | [ux/UX_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-UX-v1) | [technical/TECH_FCP004_RELATIONSHIP_GRAPH_CONNECTION_MAP_v1.md](Feature-Council-FCP-004-Relationship-Graph-Connection-Map-Technical-v1) |
| FCP-005 | [prd/PRD_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-PRD-v1) | [ux/UX_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-UX-v1) | [technical/TECH_FCP005_AI_SERVICES_PRIVACY_TRUST_CENTER_v1.md](Feature-Council-FCP-005-Ai-Services-Privacy-Trust-Center-Technical-v1) |

## Prototypes

| Prototype | Package | Purpose |
| --- | --- | --- |
| [prototypes/master-ai-brain-prototype.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/master-ai-brain-prototype.html) | All approved packages | Throwaway clickable master prototype for reviewing the combined product direction and collecting feedback. |
| [prototypes/fcp001-capture-repair-center.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp001-capture-repair-center.html) | FCP-001 | High-fidelity static Repair Center concept for states, filters, and actions. |
| [prototypes/fcp003-contextual-ask-evidence.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp003-contextual-ask-evidence.html) | FCP-003 | Static concept for context chips, source readiness, and Evidence Scan verdict groups. |
| [prototypes/fcp005-trust-center.html](https://github.com/arunpr614/ai-brain/blob/9de8de87de915e874e8290aa556e2b6772d6fabf/docs/feature-council/prototypes/fcp005-trust-center.html) | FCP-005 | Static Trust Center concept for AI readiness, source health, privacy, diagnostics, backups, and offline limits. |

## Council Decisions At A Glance

Approved:

- FCP-001 Capture Quality And Repair Center.
- FCP-002 Source Workspace And Reading Studio Lite.
- FCP-003 Contextual Ask And Evidence Scan.
- FCP-004 Relationship Graph And Connection Map.
- FCP-005 AI Services And Privacy Trust Center.

Parked or rejected:

- Multi-vault/project setup.
- Full Markdown editor/slash command workspace.
- Matrix extraction.
- Neo4j export.
- Existing Markdown vault adoption.
- Subscription/paywall.

## Implementation Caution

This package authorizes planning only. Before code entry, create implementation-entry proof packets for:

- Shared verified auth guard.
- Capture application service and repair result DTO.
- Realtime vs batch enrichment ownership.
- Deploy migration-presence check.
- Provider-aware usage accounting.
- Extension and Android test strategy.
- Diagnostics redaction allowlist.
