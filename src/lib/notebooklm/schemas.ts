import { z } from "zod";
import {
  NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION,
  NOTEBOOKLM_SAFE_TARGET_LABEL,
} from "./contracts";

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const sourceAlias = z.string().regex(/^[a-f0-9]{64}$/);

export const notebookLmExportCreateSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,96}$/),
    confirmLimitedCapture: z.boolean().optional().default(false),
    confirmUpdatedVersion: z.boolean().optional().default(false),
  })
  .strict();

export const notebookLmExportCancelSchema = z
  .discriminatedUnion("mode", [
    z
      .object({
        mode: z.literal("cancel"),
        requestId: z.string().regex(/^[a-f0-9]{24}$/),
      })
      .strict(),
    z
      .object({
        mode: z.literal("stop_checking"),
        requestId: z.string().regex(/^[a-f0-9]{24}$/),
        acknowledgeSourceMayExist: z.literal(true),
      })
      .strict(),
  ]);

export const notebookLmEnrollmentCodeSchema = z
  .object({ label: z.string().trim().min(1).max(64).optional() })
  .strict();

export const notebookLmSettingsPatchSchema = z.union([
  z
    .object({
      action: z.literal("clear_protocol_block"),
      acknowledgeConnectorUpdatedAndTargetRevalidated: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("set_provider_writes"),
      enabled: z.literal(true),
      acknowledgeStaticCopiesWillBeCreated: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("set_provider_writes"),
      enabled: z.literal(false),
    })
    .strict(),
  z
    .object({
      action: z.enum(["set_export_master", "set_export_queue"]),
      enabled: z.literal(true),
      acknowledgeExportsMayBeAccepted: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.enum(["set_export_master", "set_export_queue"]),
      enabled: z.literal(false),
    })
    .strict(),
]);

export const notebookLmDisconnectSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("safe_disconnect") }).strict(),
  z
    .object({
      mode: z.literal("emergency_revoke"),
      acknowledgePayloadsPurgedAndSourcesMayExist: z.literal(true),
    })
    .strict(),
]);

export const notebookLmPairingExchangeSchema = z
  .object({
    code: z.string().trim().min(8).max(9),
    label: z.string().trim().min(1).max(64).optional(),
    protocolVersion: z.literal(NOTEBOOKLM_CONNECTOR_PROTOCOL_VERSION),
  })
  .strict();

export const notebookLmBindSchema = z
  .object({
    bindingVersion: z.number().int().min(0),
    safeLabel: z.literal(NOTEBOOKLM_SAFE_TARGET_LABEL),
    localBindingFingerprint: fingerprint,
    subjectFingerprint: fingerprint,
    sharingPosture: z.enum(["private", "shared", "public", "unknown"]),
    sourceCount: z.number().int().min(0).max(1_000),
    sourceLimit: z.literal(50),
    reserveCount: z.literal(5),
  })
  .strict();

export const notebookLmClaimSchema = z.object({}).strict();

const notebookLmEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("preflight_ok"),
      sourceCount: z.number().int().min(0).max(1_000),
      sourceLimit: z.literal(50),
      sharingPosture: z.literal("private"),
    })
    .strict(),
  z
    .object({
      type: z.literal("authentication_required"),
      phase: z.enum(["pre_create", "reconcile", "poll"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("target_attention"),
      reason: z.enum(["wrong_target", "shared", "public", "unavailable", "capacity_unknown"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("capacity_blocked"),
      sourceCount: z.number().int().min(0).max(1_000),
      sourceLimit: z.literal(50),
    })
    .strict(),
  z.object({ type: z.literal("dispatch_started") }).strict(),
  z
    .object({
      type: z.literal("create_accepted"),
      sourceAlias,
      providerStatus: z.enum(["processing", "ready"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("create_uncertain"),
      reason: z.enum(["network", "timeout", "rate_limited", "server", "protocol"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("reconcile_result"),
      matches: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      sourceAlias: sourceAlias.optional(),
      providerStatus: z.enum(["processing", "ready", "failed"]).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("source_status"),
      providerStatus: z.enum(["processing", "ready", "failed"]),
    })
    .strict(),
  z
    .object({ type: z.literal("retryable_failure"), reason: z.enum(["network", "server"]) })
    .strict(),
  z
    .object({
      type: z.literal("connector_update_required"),
      reason: z.literal("protocol_drift"),
    })
    .strict(),
]).superRefine((value, context) => {
  if (value.type !== "reconcile_result") return;
  if (value.matches === 1 && !value.sourceAlias) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "sourceAlias is required" });
  }
  if (value.matches !== 1 && (value.sourceAlias || value.providerStatus)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "match details are not allowed" });
  }
});

export const notebookLmConnectorEventEnvelopeSchema = z
  .object({
    leaseToken: z.string().regex(/^[a-f0-9]{64}$/),
    leaseEpoch: z.number().int().min(1),
    event: notebookLmEventSchema,
  })
  .strict();
