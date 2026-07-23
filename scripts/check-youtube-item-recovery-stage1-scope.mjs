#!/usr/bin/env node

import { lstatSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const FROZEN_STAGE1_BASE = "f905f6a1ef69b5a1b2a986449d61a2e40a7fdee8";

const MODIFIED = Object.freeze(["M"]);
const ADDED = Object.freeze(["A"]);
const REVIEWED_FILE_SHA256 = Object.freeze({
  "src/app/api/items/[id]/enrichment-status/route.ts":
    "7cc327d60058b32fd143409853a09a6a9500eb99f2356db6a8b7c873fe3ad2b0",
  "src/app/items/[id]/page.tsx":
    "e8222c0bfb0bd3a7cd8e993f3e21f1044fdb47cd51da51cf3d81d74c8a9b8f8b",
  "src/components/enriching-pill.tsx":
    "de42ece6d8c806fec202febc1dbeec6c11da7a1483f5aae635bf8dd971a0f055",
});

/**
 * This is deliberately an exact path/status allowlist. A later Stage 1 report,
 * test helper, or containment caller must be reviewed and added by name rather
 * than inheriting permission from a broad directory glob.
 */
export const STAGE1_PATH_ALLOWLIST = Object.freeze(
  new Map([
    [
      ".env.example",
      {
        statuses: MODIFIED,
        purpose: "denial-only configuration documentation",
      },
    ],
    [
      "RUNNING_LOG.md",
      { statuses: MODIFIED, purpose: "append-only implementation evidence" },
    ],
    [
      "package.json",
      { statuses: MODIFIED, purpose: "scope-check command registration" },
    ],

    [
      "docs/feature-council/youtube-item-recovery-implementation/DECISION_LOG.md",
      { statuses: ADDED, purpose: "Stage 0 decision evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/DEPENDENCY_GRAPH.md",
      { statuses: ADDED, purpose: "Stage 0 dependency evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/IMPLEMENTATION_BASELINE.md",
      { statuses: ADDED, purpose: "Stage 0 baseline evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/IMPLEMENTATION_TRACKER.md",
      { statuses: ADDED, purpose: "Stage 0/1 tracking evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/MIGRATION_COLLISION_RESOLUTION.md",
      { statuses: ADDED, purpose: "migration allocation evidence without SQL" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/REQUIREMENT_TRACEABILITY.md",
      { statuses: ADDED, purpose: "Stage 0 traceability evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/RISK_REGISTER.md",
      { statuses: ADDED, purpose: "Stage 0/1 risk evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/SOURCE_INVENTORY.md",
      { statuses: ADDED, purpose: "Stage 0 source evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/SOURCE_RECONCILIATION.md",
      { statuses: ADDED, purpose: "Stage 0 source evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_0_ADVERSARIAL_REVIEW_2026-07-23_08-42-46_IST.md",
      { statuses: ADDED, purpose: "independent Stage 0 review evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_0_FOCUSED_RECHECK_ADVERSARIAL_REVIEW_2026-07-23_09-05-27_IST.md",
      { statuses: ADDED, purpose: "independent Stage 0 recheck evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_1_FINAL_GATE_ADVERSARIAL_REVIEW_2026-07-23_11-26-51_IST.md",
      { statuses: ADDED, purpose: "independent Stage 1 gate evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/YOUTUBE_ITEM_RECOVERY_STAGE_1_FOCUSED_FINAL_RECHECK_ADVERSARIAL_REVIEW_2026-07-23_12-07-09_IST.md",
      { statuses: ADDED, purpose: "independent Stage 1 final recheck evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/decisions/TWO_CHANNEL_TRANSFER_ADDENDUM.md",
      { statuses: ADDED, purpose: "Stage 0 contract evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/implementation/CALLER_CONTAINMENT_INVENTORY.md",
      { statuses: ADDED, purpose: "Stage 1 caller inventory" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/implementation/RELEASE_AUTHORITY_MATRIX.md",
      { statuses: ADDED, purpose: "Stage 1 denial matrix" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/implementation/SECURITY_PRIVACY_REVIEW.md",
      { statuses: ADDED, purpose: "Stage 1 security design evidence" },
    ],
    [
      "docs/feature-council/youtube-item-recovery-implementation/source-reconciliation/SOURCE_HASH_MANIFEST.md",
      { statuses: ADDED, purpose: "Stage 0 source hash evidence" },
    ],

    [
      "scripts/backfill-embeddings-prod.mjs",
      { statuses: MODIFIED, purpose: "standalone claimant containment" },
    ],
    [
      "scripts/backfill-embeddings.mjs",
      { statuses: MODIFIED, purpose: "standalone claimant containment" },
    ],
    [
      "scripts/backfill-youtube-transcripts-prod.mjs",
      { statuses: MODIFIED, purpose: "standalone claimant containment" },
    ],
    [
      "scripts/backfill-youtube-transcripts.ts",
      { statuses: MODIFIED, purpose: "standalone claimant containment" },
    ],
    [
      "scripts/build-release-artifact.mjs",
      { statuses: MODIFIED, purpose: "package containment guard" },
    ],
    [
      "scripts/check-youtube-item-recovery-stage1-scope.mjs",
      { statuses: ADDED, purpose: "D-014 scope assertion" },
    ],
    [
      "scripts/check-youtube-item-recovery-stage1-scope.test.mjs",
      { statuses: ADDED, purpose: "D-014 scope assertion evidence" },
    ],
    [
      "scripts/check-release-migration-compatibility.mjs",
      {
        statuses: MODIFIED,
        purpose: "D-018 reservation-aware rollback refusal",
      },
    ],
    [
      "scripts/lib/content-processing-containment.mjs",
      { statuses: ADDED, purpose: "standalone claimant authority" },
    ],
    [
      "scripts/lib/content-processing-containment.test.mjs",
      { statuses: ADDED, purpose: "standalone claimant authority evidence" },
    ],
    [
      "scripts/smoke-release-artifact.mjs",
      { statuses: MODIFIED, purpose: "package containment evidence" },
    ],

    [
      "src/app/api/capture/note/route.ts",
      { statuses: MODIFIED, purpose: "existing-route diagnostic privacy" },
    ],
    [
      "src/app/api/capture/pdf/route.ts",
      { statuses: MODIFIED, purpose: "existing-route diagnostic privacy" },
    ],
    [
      "src/app/api/capture/transcript/route.ts",
      {
        statuses: MODIFIED,
        purpose: "existing-route containment and diagnostic privacy",
      },
    ],
    [
      "src/app/api/capture/url/route.test.ts",
      { statuses: MODIFIED, purpose: "existing-route containment evidence" },
    ],
    [
      "src/app/api/capture/url/route.ts",
      {
        statuses: MODIFIED,
        purpose: "existing-route containment and diagnostic privacy",
      },
    ],
    [
      "src/app/api/errors/client/route.test.setup.ts",
      { statuses: ADDED, purpose: "diagnostic privacy test isolation" },
    ],
    [
      "src/app/api/errors/client/route.test.ts",
      { statuses: MODIFIED, purpose: "diagnostic privacy evidence" },
    ],
    [
      "src/app/api/errors/client/route.ts",
      { statuses: MODIFIED, purpose: "diagnostic privacy redaction" },
    ],
    [
      "src/app/api/items/[id]/enrich/route.test.ts",
      {
        statuses: MODIFIED,
        purpose: "D-014 existing-route no-effect evidence",
      },
    ],
    [
      "src/app/api/items/[id]/enrich/route.ts",
      {
        statuses: MODIFIED,
        purpose: "D-014 existing-route typed no-effect safety response",
      },
    ],
    [
      "src/app/api/items/[id]/enrichment-status/route.test.ts",
      { statuses: MODIFIED, purpose: "existing-status privacy evidence" },
    ],
    [
      "src/app/api/items/[id]/enrichment-status/route.ts",
      { statuses: MODIFIED, purpose: "existing-status privacy redaction" },
    ],
    [
      "src/app/api/processing/routes.test.ts",
      {
        statuses: MODIFIED,
        purpose: "existing-route private-response evidence",
      },
    ],
    [
      "src/app/api/settings/rotate-token/route.ts",
      { statuses: MODIFIED, purpose: "existing-route diagnostic privacy" },
    ],
    [
      "src/app/api/transcripts/owned-media/route.test.ts",
      { statuses: MODIFIED, purpose: "existing-route containment evidence" },
    ],
    [
      "src/app/api/transcripts/owned-media/route.ts",
      { statuses: MODIFIED, purpose: "existing-route containment" },
    ],
    [
      "src/app/capture-actions.ts",
      { statuses: MODIFIED, purpose: "existing-action diagnostic privacy" },
    ],
    [
      "src/app/items/[id]/page.tsx",
      { statuses: MODIFIED, purpose: "existing-UI privacy redaction" },
    ],
    [
      "src/app/items/[id]/repair/actions.ts",
      {
        statuses: MODIFIED,
        purpose: "existing-action containment and diagnostic privacy",
      },
    ],
    [
      "src/app/items/[id]/upgrade-actions.ts",
      { statuses: MODIFIED, purpose: "existing-action claimant containment" },
    ],
    [
      "src/components/enriching-pill.tsx",
      { statuses: MODIFIED, purpose: "existing-UI privacy redaction" },
    ],
    [
      "src/db/item-upgrades.test.ts",
      { statuses: MODIFIED, purpose: "apply containment evidence" },
    ],
    [
      "src/db/item-upgrades.ts",
      { statuses: MODIFIED, purpose: "apply containment" },
    ],
    [
      "src/db/items.test.ts",
      { statuses: MODIFIED, purpose: "claim containment evidence" },
    ],
    ["src/db/items.ts", { statuses: MODIFIED, purpose: "claim containment" }],
    [
      "src/db/schema-capabilities.test.ts",
      { statuses: ADDED, purpose: "schema tri-state evidence" },
    ],
    [
      "src/db/schema-capabilities.ts",
      {
        statuses: ADDED,
        purpose: "non-enabling schema tri-state and attestation",
      },
    ],
    [
      "src/db/test-fixtures/youtube-browser-schema.ts",
      { statuses: ADDED, purpose: "schema attestation test fixture" },
    ],
    [
      "src/db/transcript-jobs.test.ts",
      { statuses: MODIFIED, purpose: "claim/terminal containment evidence" },
    ],
    [
      "src/db/transcript-jobs.ts",
      { statuses: MODIFIED, purpose: "claim/terminal containment" },
    ],
    [
      "src/instrumentation.youtube-containment.test.ts",
      { statuses: ADDED, purpose: "startup containment evidence" },
    ],
    [
      "src/instrumentation.ts",
      { statuses: MODIFIED, purpose: "startup mode planning" },
    ],
    [
      "src/lib/ask/generator.ts",
      { statuses: MODIFIED, purpose: "diagnostic privacy" },
    ],
    [
      "src/lib/capture/capture-url.ts",
      { statuses: MODIFIED, purpose: "existing capture claimant containment" },
    ],
    [
      "src/lib/capture/policy.test.ts",
      { statuses: MODIFIED, purpose: "production denial evidence" },
    ],
    [
      "src/lib/capture/policy.ts",
      { statuses: MODIFIED, purpose: "production denial" },
    ],
    [
      "src/lib/capture/transcripts/owned-media-stt-route-service.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript claimant containment",
      },
    ],
    [
      "src/lib/capture/transcripts/owned-media-stt.test.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript claimant containment evidence",
      },
    ],
    [
      "src/lib/capture/transcripts/owned-media-stt.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript claimant containment",
      },
    ],
    [
      "src/lib/capture/transcripts/recovery-options.test.ts",
      { statuses: MODIFIED, purpose: "recovery-option denial evidence" },
    ],
    [
      "src/lib/capture/transcripts/recovery-options.ts",
      { statuses: MODIFIED, purpose: "recovery-option denial" },
    ],
    [
      "src/lib/capture/transcripts/user-provided.test.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript apply containment evidence",
      },
    ],
    [
      "src/lib/capture/transcripts/user-provided.ts",
      { statuses: MODIFIED, purpose: "existing transcript apply containment" },
    ],
    [
      "src/lib/capture/transcripts/youtube-official.test.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript claimant containment evidence",
      },
    ],
    [
      "src/lib/capture/transcripts/youtube-official.ts",
      {
        statuses: MODIFIED,
        purpose: "existing transcript claimant containment",
      },
    ],
    [
      "src/lib/capture/youtube-transcript/backfill-prod-script.test.ts",
      { statuses: MODIFIED, purpose: "standalone claimant privacy evidence" },
    ],
    [
      "src/lib/capture/youtube-transcript/backfill.test.ts",
      {
        statuses: MODIFIED,
        purpose: "transcript backfill containment evidence",
      },
    ],
    [
      "src/lib/capture/youtube-transcript/backfill.ts",
      { statuses: MODIFIED, purpose: "transcript backfill containment" },
    ],
    [
      "src/lib/capture/youtube-transcript/provider-health.test.ts",
      { statuses: MODIFIED, purpose: "content-free diagnostic evidence" },
    ],
    [
      "src/lib/capture/youtube-transcript/provider-health.ts",
      { statuses: MODIFIED, purpose: "content-free diagnostics" },
    ],
    [
      "src/lib/embed/backfill-scripts.test.ts",
      { statuses: ADDED, purpose: "standalone claimant privacy evidence" },
    ],
    [
      "src/lib/embed/pipeline.test.ts",
      { statuses: MODIFIED, purpose: "embedding apply containment evidence" },
    ],
    [
      "src/lib/embed/pipeline.ts",
      { statuses: MODIFIED, purpose: "embedding apply containment" },
    ],
    [
      "src/lib/enrich/pipeline.test.ts",
      { statuses: MODIFIED, purpose: "enrichment apply containment evidence" },
    ],
    [
      "src/lib/enrich/pipeline.ts",
      { statuses: MODIFIED, purpose: "enrichment apply containment" },
    ],
    [
      "src/lib/errors/sink.test.setup.ts",
      { statuses: ADDED, purpose: "diagnostic privacy test isolation" },
    ],
    [
      "src/lib/errors/sink.test.ts",
      { statuses: ADDED, purpose: "diagnostic privacy evidence" },
    ],
    [
      "src/lib/errors/sink.ts",
      { statuses: MODIFIED, purpose: "closed diagnostic privacy sink" },
    ],
    [
      "src/lib/http/configured-origin.test.ts",
      { statuses: ADDED, purpose: "configured-origin evidence" },
    ],
    [
      "src/lib/http/configured-origin.ts",
      { statuses: ADDED, purpose: "configured-origin private responses" },
    ],
    [
      "src/lib/processing/hold-gate.test.ts",
      { statuses: ADDED, purpose: "schema-026-safe hold-gate evidence" },
    ],
    [
      "src/lib/processing/hold-gate.ts",
      { statuses: ADDED, purpose: "schema-026-safe hold gate" },
    ],
    [
      "src/lib/processing/hold-http.test.ts",
      { statuses: ADDED, purpose: "existing-route typed no-effect evidence" },
    ],
    [
      "src/lib/processing/hold-http.ts",
      { statuses: ADDED, purpose: "private typed no-effect response helper" },
    ],
    [
      "src/lib/processing/http.ts",
      { statuses: MODIFIED, purpose: "configured-origin private responses" },
    ],
    [
      "src/lib/queue/enrichment-batch-cron.test.ts",
      { statuses: MODIFIED, purpose: "batch startup containment evidence" },
    ],
    [
      "src/lib/queue/enrichment-batch-cron.ts",
      { statuses: MODIFIED, purpose: "batch startup containment" },
    ],
    [
      "src/lib/queue/enrichment-batch-binding.ts",
      {
        statuses: ADDED,
        purpose: "durable ambiguous-dispatch containment",
      },
    ],
    [
      "src/lib/queue/enrichment-batch.test.ts",
      { statuses: MODIFIED, purpose: "batch claim/apply containment evidence" },
    ],
    [
      "src/lib/queue/enrichment-batch.ts",
      { statuses: MODIFIED, purpose: "batch claim/apply containment" },
    ],
    [
      "src/lib/queue/enrichment-worker.test.ts",
      {
        statuses: MODIFIED,
        purpose: "worker claim/apply containment evidence",
      },
    ],
    [
      "src/lib/queue/enrichment-worker.ts",
      { statuses: MODIFIED, purpose: "worker claim/apply containment" },
    ],
    [
      "src/lib/queue/note-index-worker.test.setup.ts",
      { statuses: MODIFIED, purpose: "note-index mode test isolation" },
    ],
    [
      "src/lib/queue/note-index-worker.test.ts",
      { statuses: MODIFIED, purpose: "note-index mode containment evidence" },
    ],
    [
      "src/lib/queue/note-index-worker.ts",
      { statuses: MODIFIED, purpose: "D-015 note-index mode containment" },
    ],
    [
      "src/lib/queue/transcript-worker.test.ts",
      { statuses: MODIFIED, purpose: "transcript worker containment evidence" },
    ],
    [
      "src/lib/queue/transcript-worker.ts",
      { statuses: MODIFIED, purpose: "transcript worker containment" },
    ],
    [
      "src/lib/repair/item-repair.test.ts",
      { statuses: MODIFIED, purpose: "repair apply containment evidence" },
    ],
    [
      "src/lib/repair/item-repair.ts",
      { statuses: MODIFIED, purpose: "repair apply containment" },
    ],
    [
      "src/lib/runtime/containment-diagnostics.test.ts",
      { statuses: ADDED, purpose: "content-free diagnostic evidence" },
    ],
    [
      "src/lib/runtime/containment-diagnostics.ts",
      { statuses: ADDED, purpose: "closed content-free diagnostics" },
    ],
    [
      "src/lib/runtime/deployment.test.ts",
      { statuses: ADDED, purpose: "deployment classification evidence" },
    ],
    [
      "src/lib/runtime/deployment.ts",
      { statuses: ADDED, purpose: "authoritative deployment classification" },
    ],
    [
      "src/lib/startup/content-workers.test.ts",
      { statuses: ADDED, purpose: "worker-mode planning evidence" },
    ],
    [
      "src/lib/startup/content-workers.ts",
      { statuses: ADDED, purpose: "worker-mode planning" },
    ],
    [
      "src/lib/telegram/dispatch.test.ts",
      { statuses: MODIFIED, purpose: "existing claimant containment evidence" },
    ],
    [
      "src/lib/telegram/dispatch.ts",
      { statuses: MODIFIED, purpose: "existing claimant containment" },
    ],
    [
      "src/lib/telegram/webhook-handler.ts",
      { statuses: MODIFIED, purpose: "diagnostic privacy" },
    ],
    [
      "src/proxy.ts",
      { statuses: MODIFIED, purpose: "configured-origin request containment" },
    ],
  ]),
);

const FEATURE_ENABLEMENT_KEYS = String.raw`(?:BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED|BRAIN_MANUAL_TRANSCRIPT_ENRICHMENT_(?:UI|WRITE|EXECUTION)_ENABLED|YOUTUBE_TRANSCRIPT_RECOVERY_ENABLED|YOUTUBE_TRANSCRIPT_WORKER_ENABLED)`;

const PROHIBITED_ADDITION_RULES = Object.freeze([
  {
    code: "intent_grant_commit_implementation",
    pattern:
      /\b(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*(?:Intent|Grant|Commit)[\w$]*\s*\(/i,
  },
  {
    code: "intent_grant_commit_implementation",
    pattern:
      /\bexport\s+(?:class|interface|type|const|let|var)\s+[A-Za-z_$][\w$]*(?:Intent|Grant|Commit)[\w$]*/i,
  },
  {
    code: "intent_grant_commit_implementation",
    pattern:
      /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+[`"[]?[A-Za-z0-9_]*(?:intent|grant|commit)[A-Za-z0-9_]*/i,
  },
  {
    code: "intent_grant_commit_implementation",
    pattern: /\/(?:api\/)?[^\s"'`]*(?:intents?|grants?|commit)[^\s"'`]*/i,
  },
  {
    code: "transcript_attachment_implementation",
    pattern: /\battach[A-Za-z0-9_$]*Transcript[A-Za-z0-9_$]*\s*\(/i,
  },
  {
    code: "transcript_attachment_implementation",
    pattern: /\bINSERT\s+INTO\s+[`"[]?transcript_(?:sources|segments)\b/i,
  },
  {
    code: "hold_release_implementation",
    pattern:
      /\b(?:release|clear|remove|delete)[A-Za-z0-9_$]*Hold[A-Za-z0-9_$]*\s*\(/i,
  },
  {
    code: "hold_release_implementation",
    pattern: /\b(?:DELETE\s+FROM|UPDATE)\s+[`"[]?content_processing_holds\b/i,
  },
  {
    code: "new_feature_write_prohibited",
    pattern: /\bINSERT\s+INTO\s+[`"[]?content_processing_holds\b/i,
  },
  {
    code: "new_feature_write_prohibited",
    pattern:
      /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+[`"[]?(?:youtube_browser_|manual_enrichment_)[A-Za-z0-9_]*\b/i,
  },
  {
    code: "feature_enablement",
    pattern: new RegExp(
      String.raw`\b${FEATURE_ENABLEMENT_KEYS}\b\s*(?:=|:)\s*["']?(?:1|true|on|enabled)\b`,
      "i",
    ),
  },
  {
    code: "feature_enablement",
    pattern:
      /\b(?:browserTranscript|manualTranscriptEnrichment|youtubeTranscriptRecovery)[A-Za-z0-9_$]*Enabled\s*=\s*true\b/i,
  },
]);

export function evaluateStage1Changes(changes) {
  const violations = [];
  const seen = new Set();

  for (const change of changes) {
    const key = `${change.status}\0${change.path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!isSafeRepoRelativePath(change.path)) {
      violations.push(violation(change, "unsafe_path"));
      continue;
    }

    const prohibitedPathCode = classifyProhibitedPath(change);
    if (prohibitedPathCode) {
      violations.push(violation(change, prohibitedPathCode));
      continue;
    }

    const allowance = STAGE1_PATH_ALLOWLIST.get(change.path);
    if (!allowance) {
      violations.push(violation(change, "path_not_allowlisted"));
      continue;
    }
    if (!allowance.statuses.includes(change.status)) {
      violations.push(violation(change, "change_status_not_allowlisted"));
      continue;
    }

    if (!isImplementationPath(change.path)) continue;
    const addedText =
      typeof change.addedText === "string" ? change.addedText : "";
    const publicSurfaceCode = classifyProhibitedPublicSurfaceAddition(
      change.path,
      addedText,
      typeof change.removedText === "string" ? change.removedText : "",
    );
    if (publicSurfaceCode) {
      violations.push(violation(change, publicSurfaceCode));
      continue;
    }
    let additionViolation = false;
    for (const rule of PROHIBITED_ADDITION_RULES) {
      if (rule.pattern.test(addedText)) {
        violations.push(violation(change, rule.code));
        additionViolation = true;
        break;
      }
    }
    if (additionViolation) continue;

    const expectedSha256 = REVIEWED_FILE_SHA256[change.path];
    if (
      expectedSha256 !== undefined &&
      sha256(
        typeof change.currentText === "string" ? change.currentText : "",
      ) !== expectedSha256
    ) {
      violations.push(violation(change, "reviewed_file_hash_mismatch"));
    }
  }

  return {
    ok: violations.length === 0,
    checked: seen.size,
    violations,
  };
}

function classifyProhibitedPublicSurfaceAddition(path, addedText, removedText) {
  const addedRouteMethods = exportedRouteMethods(addedText);
  const removedRouteMethods = exportedRouteMethods(removedText);
  if (
    /^src\/app\/api\/.+\/route\.[cm]?[jt]sx?$/i.test(path) &&
    [...addedRouteMethods].some((method) => !removedRouteMethods.has(method))
  ) {
    return "new_route_surface_prohibited";
  }
  const addedActionNames = exportedFunctionNames(addedText);
  const removedActionNames = exportedFunctionNames(removedText);
  if (
    /^src\/app\/.*(?:^|\/)[^/]*actions?\.[cm]?[jt]sx?$/i.test(path) &&
    [...addedActionNames].some((name) => !removedActionNames.has(name))
  ) {
    return "new_action_surface_prohibited";
  }
  if (
    /^(?:src\/app\/.+\/page|src\/components\/.+)\.[cm]?[jt]sx?$/i.test(path) &&
    /\b(?:recovery|browserTranscript|manualEnrichment)(?:Status|State|Action|Phase)\s*(?:=|:)/i.test(
      addedText,
    )
  ) {
    return "new_status_surface_prohibited";
  }
  if (
    /\/(?:enrichment-)?status\/route\.[cm]?[jt]sx?$/i.test(path) &&
    /\b(?:phase|recovery|transcript|hold|provider|batch|manual|processing|[A-Za-z_$][\w$]*(?:_status|_state|_phase|Status|State|Phase))\b\s*:/i.test(
      addedText,
    )
  ) {
    return "new_status_surface_prohibited";
  }
  return null;
}

function exportedRouteMethods(text) {
  const methods = new Set();
  const methodName = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
  for (const pattern of [
    new RegExp(
      String.raw`\bexport\s+(?:async\s+)?function\s+(${methodName})\s*\(`,
      "g",
    ),
    new RegExp(
      String.raw`\bexport\s+(?:declare\s+)?(?:const|let|var)\s+(${methodName})\b`,
      "g",
    ),
  ]) {
    for (const match of text.matchAll(pattern)) methods.add(match[1]);
  }
  for (const exported of exportedSpecifierNames(text)) {
    if (new RegExp(`^(?:${methodName})$`).test(exported)) {
      methods.add(exported);
    }
  }
  return methods;
}

function exportedFunctionNames(text) {
  const names = new Set();
  for (const pattern of [
    /\bexport\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)?\s*\(/g,
    /\bexport\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g,
  ]) {
    for (const match of text.matchAll(pattern)) {
      names.add(match[1] ?? "__default__");
    }
  }
  for (const exported of exportedSpecifierNames(text)) names.add(exported);
  if (/\bexport\s+default\s+(?!async\s+function\b|function\b)/.test(text)) {
    names.add("__default__");
  }
  return names;
}

function exportedSpecifierNames(text) {
  const names = [];
  for (const match of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const rawSpecifier of match[1].split(",")) {
      const specifier = rawSpecifier.trim().replace(/^type\s+/, "");
      if (!specifier) continue;
      const parts = specifier.split(/\s+as\s+/i);
      const exported = (parts[1] ?? parts[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(exported)) names.push(exported);
    }
  }
  return names;
}

function classifyProhibitedPath(change) {
  const path = change.path;
  if (
    /(?:^|\/)(?:migrations?|schema-migrations?)\/.*\.sql$/i.test(path) ||
    /^src\/db\/migrations\/.+$/i.test(path)
  ) {
    return "migration_sql_prohibited";
  }
  if (
    /^(?:extension|android|ios|mobile)\//i.test(path) ||
    /^capacitor\.config\.[cm]?[jt]s$/i.test(path)
  ) {
    return "extension_or_mobile_change_prohibited";
  }
  if (change.status === "A" && isNewPublicSurfacePath(path)) {
    return "new_public_surface_prohibited";
  }
  if (
    change.status === "A" &&
    isImplementationPath(path) &&
    /(?:^|[/_.-])(?:intent|grant|commit)(?:[/_.-]|$)/i.test(path)
  ) {
    return "intent_grant_commit_implementation";
  }
  if (
    change.status === "A" &&
    isImplementationPath(path) &&
    /(?:hold[-_.]?(?:release|clear)|(?:release|clear)[-_.]?hold|transcript[-_.]?attach)/i.test(
      path,
    )
  ) {
    return "hold_release_or_transcript_attachment_implementation";
  }
  return null;
}

function isNewPublicSurfacePath(path) {
  if (isTestPath(path)) return false;
  return (
    /^src\/app\/.+\/(?:route|page|layout|loading|error|not-found)\.[cm]?[jt]sx?$/i.test(
      path,
    ) ||
    /^src\/app\/.*(?:^|\/)[^/]*(?:action|status)[^/]*\.[cm]?[jt]sx?$/i.test(
      path,
    ) ||
    /^src\/components\/.+\.[cm]?[jt]sx?$/i.test(path)
  );
}

function isImplementationPath(path) {
  if (path.startsWith("docs/") || isTestPath(path)) return false;
  if (path === "scripts/check-youtube-item-recovery-stage1-scope.mjs")
    return false;
  return (
    path === ".env.example" ||
    path === "package.json" ||
    path.startsWith("src/") ||
    path.startsWith("scripts/")
  );
}

function isTestPath(path) {
  return (
    /(?:^|\/)[^/]*\.test(?:\.setup)?\.[cm]?[jt]sx?$/i.test(path) ||
    path.includes("/test-fixtures/") ||
    path.endsWith(".test.mjs")
  );
}

function isSafeRepoRelativePath(path) {
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    isAbsolute(path) ||
    path.includes("\\")
  ) {
    return false;
  }
  const segments = path.split("/");
  return (
    segments.every(
      (segment) => segment !== "" && segment !== "." && segment !== "..",
    ) && posix.normalize(path) === path
  );
}

function violation(change, code) {
  return {
    path: change.path,
    status: change.status,
    code,
  };
}

function git(repoRoot, args, { allowFailure = false } = {}) {
  const result = spawnSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || (!allowFailure && result.status !== 0)) {
    const error = new Error("git_command_failed");
    error.code = "git_command_failed";
    throw error;
  }
  return result;
}

function findRepoRoot(cwd) {
  const result = git(cwd, ["rev-parse", "--show-toplevel"], {
    allowFailure: true,
  });
  if (result.status !== 0) {
    const error = new Error("not_a_git_worktree");
    error.code = "not_a_git_worktree";
    throw error;
  }
  return result.stdout.trim();
}

function resolveCommit(repoRoot, ref) {
  const result = git(
    repoRoot,
    ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
    { allowFailure: true },
  );
  const commit = result.stdout.trim();
  if (result.status !== 0 || !/^[a-f0-9]{40,64}$/i.test(commit)) {
    const error = new Error("git_reference_invalid");
    error.code = "git_reference_invalid";
    throw error;
  }
  return commit;
}

function parseNameStatusZ(output) {
  if (!output) return [];
  const fields = output.split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (fields.length % 2 !== 0) {
    const error = new Error("git_name_status_invalid");
    error.code = "git_name_status_invalid";
    throw error;
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    const rawStatus = fields[index];
    const path = fields[index + 1];
    const status = rawStatus.slice(0, 1);
    changes.push({ path, status });
  }
  return changes;
}

function extractPatchText(patch) {
  const lines = patch.split(/\r?\n/);
  return {
    addedText: lines
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1))
      .join("\n"),
    removedText: lines
      .filter((line) => line.startsWith("-") && !line.startsWith("---"))
      .map((line) => line.slice(1))
      .join("\n"),
  };
}

function trackedPatchText(repoRoot, baseCommit, targetCommit, path) {
  const args = [
    "diff",
    "--no-ext-diff",
    "--no-renames",
    "--unified=0",
    baseCommit,
  ];
  if (targetCommit) args.push(targetCommit);
  args.push("--", path);
  return extractPatchText(git(repoRoot, args).stdout);
}

function untrackedPatchText(repoRoot, path) {
  const absolutePath = resolve(repoRoot, path);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    const error = new Error("untracked_path_type_invalid");
    error.code = "untracked_path_type_invalid";
    throw error;
  }
  return {
    addedText: readFileSync(absolutePath, "utf8"),
    removedText: "",
  };
}

function currentWorktreeFileText(repoRoot, path) {
  const absolutePath = resolve(repoRoot, path);
  const stat = lstatSync(absolutePath);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    const error = new Error("reviewed_path_type_invalid");
    error.code = "reviewed_path_type_invalid";
    throw error;
  }
  return readFileSync(absolutePath, "utf8");
}

function currentCommitFileText(repoRoot, targetCommit, path) {
  return git(repoRoot, ["show", `${targetCommit}:${path}`]).stdout;
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function collectStage1Changes({
  cwd = process.cwd(),
  base,
  target,
} = {}) {
  const repoRoot = findRepoRoot(cwd);
  const baseCommit = resolveCommit(repoRoot, base ?? FROZEN_STAGE1_BASE);
  const targetCommit = target ? resolveCommit(repoRoot, target) : null;
  const diffArgs = ["diff", "--name-status", "-z", "--no-renames", baseCommit];
  if (targetCommit) diffArgs.push(targetCommit);
  diffArgs.push("--");

  const changes = parseNameStatusZ(git(repoRoot, diffArgs).stdout);
  const trackedPaths = new Set(changes.map((change) => change.path));

  if (!targetCommit) {
    const untracked = git(repoRoot, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ])
      .stdout.split("\0")
      .filter(Boolean);
    for (const path of untracked) {
      if (!trackedPaths.has(path))
        changes.push({ path, status: "A", untracked: true });
    }
  }

  return changes.map((change) => {
    const patchText =
      change.status === "D"
        ? { addedText: "", removedText: "" }
        : change.untracked
          ? untrackedPatchText(repoRoot, change.path)
          : trackedPatchText(repoRoot, baseCommit, targetCommit, change.path);
    return {
      ...change,
      ...patchText,
      ...(change.status !== "D" &&
      Object.hasOwn(REVIEWED_FILE_SHA256, change.path)
        ? {
            currentText: targetCommit
              ? currentCommitFileText(repoRoot, targetCommit, change.path)
              : currentWorktreeFileText(repoRoot, change.path),
          }
        : {}),
    };
  });
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") return { help: true };
    if (argument === "--base" || argument === "--target") {
      const name = argument.slice(2);
      const value = argv[index + 1];
      if (!value || value.startsWith("--") || options[name] !== undefined) {
        throw Object.assign(new Error("invalid_arguments"), {
          code: "invalid_arguments",
        });
      }
      options[name] = value;
      index += 1;
      continue;
    }
    const match = argument.match(/^--(base|target)=(.+)$/);
    if (match && options[match[1]] === undefined) {
      options[match[1]] = match[2];
      continue;
    }
    throw Object.assign(new Error("invalid_arguments"), {
      code: "invalid_arguments",
    });
  }
  return options;
}

export function runStage1ScopeCheck(options = {}) {
  return evaluateStage1Changes(collectStage1Changes(options));
}

function printUsage() {
  console.log(
    "Usage: node scripts/check-youtube-item-recovery-stage1-scope.mjs [--base <commit>] [--target <commit>]",
  );
}

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      printUsage();
      return;
    }
    const result = runStage1ScopeCheck(options);
    const output = {
      ok: result.ok,
      code: result.ok
        ? "youtube_item_recovery_stage1_scope_ok"
        : "stage1_scope_violation",
      base: options.base ?? FROZEN_STAGE1_BASE,
      target: options.target ?? "worktree",
      checked: result.checked,
      violations: result.violations,
    };
    const destination = result.ok ? console.log : console.error;
    destination(JSON.stringify(output));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        ok: false,
        code:
          error && typeof error === "object" && typeof error.code === "string"
            ? error.code
            : "stage1_scope_check_failed",
      }),
    );
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) main();
