import "./policy.test.setup";

import { after, test } from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { TEST_DB_DIR } from "./policy.test.setup";
import { insertCaptured } from "@/db/items";
import { listCapturePolicyDecisionsForItem } from "@/db/transcripts";
import {
  allowUserProvidedTranscriptForItem,
  currentTranscriptEnvironment,
  decideTranscriptAcquisition,
} from "./policy";

const POLICY_ENV_KEYS = [
  "BRAIN_DEPLOYMENT_ENV",
  "BRAIN_PRODUCTION_RUNTIME",
  "BRAIN_TRANSCRIPT_ENV",
  "BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE",
  "BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED",
  "NODE_ENV",
] as const;

type PolicyEnvironment = Partial<
  Record<(typeof POLICY_ENV_KEYS)[number], string>
>;

function withPolicyEnvironment<T>(
  values: PolicyEnvironment,
  run: () => T,
): T {
  const saved = Object.fromEntries(
    POLICY_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof POLICY_ENV_KEYS)[number], string | undefined>;
  for (const key of POLICY_ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) Reflect.set(process.env, key, value);
  }
  try {
    return run();
  } finally {
    for (const key of POLICY_ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else Reflect.set(process.env, key, value);
    }
  }
}

after(() => {
  try {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  } catch {}
});

test("user-provided transcript creates an allowed full-text policy decision", () => {
  const item = insertCaptured({
    source_type: "youtube",
    source_url: "https://www.youtube.com/watch?v=abc123",
    title: "Video",
    body: "Metadata only",
    source_platform: "youtube",
    capture_quality: "metadata_only",
  });

  const result = allowUserProvidedTranscriptForItem(item);

  assert.equal(result.status, "allowed");
  if (result.status !== "allowed") throw new Error("expected allowed");
  assert.equal(result.allowed.__brand, "AllowedTranscriptAcquisition");
  assert.equal(result.allowed.method, "user_paste");
  assert.equal(result.allowed.retentionClass, "full_text_allowed");
  assert.equal(result.decision.production_allowed, 1);

  const rows = listCapturePolicyDecisionsForItem(item.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].rights_basis, "user_provided_transcript");
  assert.equal(rows[0].blocked_reason, null);
});

test("public lab caption acquisition is blocked by authoritative production even with approval and a caller lab override", () => {
  const result = withPolicyEnvironment({
    BRAIN_DEPLOYMENT_ENV: "production",
    BRAIN_PRODUCTION_RUNTIME: "1",
    BRAIN_TRANSCRIPT_ENV: "lab",
    BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab",
    BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED: "1",
    NODE_ENV: "development",
  }, () => decideTranscriptAcquisition({
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    platform: "youtube",
    environment: "lab",
    rightsBasis: "public_lab_only",
    method: "lab_public_caption",
    retentionClass: "derived_metrics_only",
    legalApprovalId: "approval-cannot-promote",
  }));

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") throw new Error("expected blocked");
  assert.equal(
    result.blockedReason,
    "lab_public_caption_production_blocked",
  );
  assert.equal(result.decision.environment, "production");
  assert.equal(result.decision.production_allowed, 0);
  assert.equal(result.decision.rights_basis, "blocked_unknown_rights");
});

test("public lab caption full-text retention is blocked without legal approval in an authoritative lab", () => {
  const result = withPolicyEnvironment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "0",
  }, () => decideTranscriptAcquisition({
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    platform: "youtube",
    environment: "production",
    rightsBasis: "public_lab_only",
    method: "lab_public_caption",
    retentionClass: "full_text_allowed",
  }));

  assert.equal(result.status, "blocked");
  if (result.status !== "blocked") throw new Error("expected blocked");
  assert.equal(
    result.blockedReason,
    "lab_public_caption_full_text_requires_legal_approval",
  );
  assert.equal(result.decision.environment, "lab");
  assert.equal(result.decision.production_allowed, 0);
});

test("every authoritative production or conflict combination denies lab captions regardless of caller, legacy, flags, approval, or retention", () => {
  const productionCases: Array<{
    name: string;
    deployment?: string;
    runtime?: string;
  }> = [
    { name: "production", deployment: "production", runtime: "1" },
    {
      name: "production deployment only",
      deployment: "production",
    },
    { name: "production runtime only", runtime: "1" },
    {
      name: "production-env conflict",
      deployment: "production",
      runtime: "0",
    },
    { name: "lab conflict", deployment: "lab", runtime: "1" },
    {
      name: "development conflict",
      deployment: "development",
      runtime: "1",
    },
    { name: "test conflict", deployment: "test", runtime: "1" },
  ];

  for (const marker of productionCases) {
    for (
      const callerEnvironment of [
        "production",
        "lab",
        "development",
        "test",
      ] as const
    ) {
      for (const legacyEnvironment of [undefined, "lab", "production"]) {
        for (const legalApprovalId of [null, "approval-cannot-promote"]) {
          for (
            const retentionClass of [
              "derived_metrics_only",
              "full_text_allowed",
            ] as const
          ) {
            const result = withPolicyEnvironment({
              BRAIN_DEPLOYMENT_ENV: marker.deployment,
              BRAIN_PRODUCTION_RUNTIME: marker.runtime,
              BRAIN_TRANSCRIPT_ENV: legacyEnvironment,
              BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab",
              BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED: "1",
              NODE_ENV: "development",
            }, () => decideTranscriptAcquisition({
              sourceUrl: "https://www.youtube.com/watch?v=matrix",
              platform: "youtube",
              environment: callerEnvironment,
              rightsBasis: "public_lab_only",
              method: "lab_public_caption",
              retentionClass,
              legalApprovalId,
            }));

            assert.equal(
              result.status,
              "blocked",
              `${marker.name}/${callerEnvironment}/${String(legacyEnvironment)}/${String(legalApprovalId)}/${retentionClass}`,
            );
            assert.equal(result.decision.environment, "production");
            assert.equal(result.decision.production_allowed, 0);
          }
        }
      }
    }
  }
});

test("missing or malformed authority fails closed despite every legacy promotion input", () => {
  const cases: Array<{
    name: string;
    environment: PolicyEnvironment;
    reason: string;
  }> = [
    {
      name: "both missing",
      environment: {},
      reason: "lab_public_caption_deployment_unclassified",
    },
    {
      name: "runtime missing",
      environment: { BRAIN_DEPLOYMENT_ENV: "lab" },
      reason: "lab_public_caption_deployment_unclassified",
    },
    {
      name: "deployment missing",
      environment: { BRAIN_PRODUCTION_RUNTIME: "0" },
      reason: "lab_public_caption_deployment_unclassified",
    },
    {
      name: "deployment malformed",
      environment: {
        BRAIN_DEPLOYMENT_ENV: "LAB",
        BRAIN_PRODUCTION_RUNTIME: "0",
      },
      reason: "lab_public_caption_deployment_invalid",
    },
    {
      name: "runtime malformed",
      environment: {
        BRAIN_DEPLOYMENT_ENV: "lab",
        BRAIN_PRODUCTION_RUNTIME: "false",
      },
      reason: "lab_public_caption_deployment_invalid",
    },
  ];

  for (const entry of cases) {
    const result = withPolicyEnvironment({
      ...entry.environment,
      BRAIN_TRANSCRIPT_ENV: "lab",
      BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_MODE: "lab",
      BRAIN_YOUTUBE_BROWSER_TRANSCRIPT_ENABLED: "1",
      NODE_ENV: "development",
    }, () => decideTranscriptAcquisition({
      sourceUrl: "https://www.youtube.com/watch?v=authority",
      platform: "youtube",
      environment: "lab",
      rightsBasis: "public_lab_only",
      method: "lab_public_caption",
      retentionClass: "derived_metrics_only",
      legalApprovalId: "approval-cannot-promote",
    }));

    assert.equal(result.status, "blocked", entry.name);
    if (result.status !== "blocked") throw new Error("expected blocked");
    assert.equal(result.blockedReason, entry.reason, entry.name);
    assert.equal(result.decision.environment, "production", entry.name);
    assert.equal(result.decision.production_allowed, 0, entry.name);
  }
});

test("authoritative non-production preserves the existing lab method and retention rule but never production-allows it", () => {
  for (const deployment of ["lab", "development", "test"] as const) {
    const derived = withPolicyEnvironment({
      BRAIN_DEPLOYMENT_ENV: deployment,
      BRAIN_PRODUCTION_RUNTIME: "0",
      NODE_ENV: "production",
    }, () => decideTranscriptAcquisition({
      sourceUrl: "https://www.youtube.com/watch?v=nonprod",
      platform: "youtube",
      environment: "production",
      rightsBasis: "public_lab_only",
      method: "lab_public_caption",
      retentionClass: "derived_metrics_only",
    }));
    assert.equal(derived.status, "allowed", deployment);
    assert.equal(derived.decision.environment, deployment);
    assert.equal(derived.decision.production_allowed, 0);

    const fullWithoutApproval = withPolicyEnvironment({
      BRAIN_DEPLOYMENT_ENV: deployment,
      BRAIN_PRODUCTION_RUNTIME: "0",
    }, () => decideTranscriptAcquisition({
      sourceUrl: "https://www.youtube.com/watch?v=nonprod",
      platform: "youtube",
      environment: "production",
      rightsBasis: "public_lab_only",
      method: "lab_public_caption",
      retentionClass: "full_text_allowed",
    }));
    assert.equal(fullWithoutApproval.status, "blocked", deployment);
    assert.equal(fullWithoutApproval.decision.production_allowed, 0);

    const fullWithApproval = withPolicyEnvironment({
      BRAIN_DEPLOYMENT_ENV: deployment,
      BRAIN_PRODUCTION_RUNTIME: "0",
    }, () => decideTranscriptAcquisition({
      sourceUrl: "https://www.youtube.com/watch?v=nonprod",
      platform: "youtube",
      environment: "production",
      rightsBasis: "public_lab_only",
      method: "lab_public_caption",
      retentionClass: "full_text_allowed",
      legalApprovalId: "lab-retention-approval",
    }));
    assert.equal(fullWithApproval.status, "allowed", deployment);
    assert.equal(fullWithApproval.decision.production_allowed, 0);
  }
});

test("current transcript environment prefers authoritative markers and keeps ordinary fallback compatibility", () => {
  assert.equal(withPolicyEnvironment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "0",
    NODE_ENV: "production",
  }, currentTranscriptEnvironment), "lab");

  assert.equal(withPolicyEnvironment({
    BRAIN_DEPLOYMENT_ENV: "lab",
    BRAIN_PRODUCTION_RUNTIME: "1",
    BRAIN_TRANSCRIPT_ENV: "lab",
    NODE_ENV: "development",
  }, currentTranscriptEnvironment), "production");

  assert.equal(withPolicyEnvironment({
    BRAIN_TRANSCRIPT_ENV: "lab",
    NODE_ENV: "development",
  }, currentTranscriptEnvironment), "lab");

  assert.equal(withPolicyEnvironment({
    BRAIN_TRANSCRIPT_ENV: "lab",
    NODE_ENV: "production",
  }, currentTranscriptEnvironment), "production");

  assert.equal(withPolicyEnvironment({
    NODE_ENV: "test",
  }, currentTranscriptEnvironment), "test");
});

test("ordinary user, upload, official-owned, and STT methods retain schema-026 allowance without accepting caller environment authority", () => {
  const methods = [
    {
      method: "user_paste",
      rightsBasis: "user_provided_transcript",
    },
    {
      method: "uploaded_file",
      rightsBasis: "user_provided_transcript",
    },
    {
      method: "youtube_official_caption",
      rightsBasis: "owned_youtube_channel",
    },
    {
      method: "owned_media_stt",
      rightsBasis: "owned_uploaded_media",
    },
  ] as const;

  for (const entry of methods) {
    const result = withPolicyEnvironment({
      BRAIN_TRANSCRIPT_ENV: "lab",
      NODE_ENV: "production",
    }, () => decideTranscriptAcquisition({
      sourceUrl: "https://www.youtube.com/watch?v=ordinary",
      platform: "youtube",
      environment: "development",
      rightsBasis: entry.rightsBasis,
      method: entry.method,
      retentionClass: "full_text_allowed",
    }));

    assert.equal(result.status, "allowed", entry.method);
    assert.equal(result.decision.environment, "production");
    assert.equal(result.decision.production_allowed, 1);
    assert.equal(result.decision.blocked_reason, null);
  }
});
