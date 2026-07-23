import crypto from "node:crypto";
import { checkpointSensitiveDeletion, getDb, newId } from "./client";
import {
  clearNotebookLmPhysicalPurgePending,
  getNotebookLmRuntimeControl,
  markNotebookLmPhysicalPurgePending,
  notebookLmRuntimeProviderWritesAllowed,
  recordNotebookLmProtocolFailure,
  recordNotebookLmProtocolSuccess,
  recordNotebookLmRetentionSweepFailure,
  recordNotebookLmRetentionSweepSuccess,
  tripNotebookLmProviderWriteBlock,
} from "./notebooklm-export-control";
import type { NotebookLmConnectorRow } from "@/lib/notebooklm/connector-auth";
import { hashConnectorToken } from "@/lib/notebooklm/connector-auth";
import {
  NOTEBOOKLM_EVENT_RETENTION_MS,
  NOTEBOOKLM_LEASE_MS,
  NOTEBOOKLM_MAX_SOURCE_LIMIT,
  NOTEBOOKLM_MAX_PRECREATE_LEASES,
  NOTEBOOKLM_MAPPER_VERSION,
  NOTEBOOKLM_MIN_SOURCE_LIMIT,
  NOTEBOOKLM_ORPHAN_LEDGER_RETENTION_MS,
  NOTEBOOKLM_POST_DISPATCH_RETENTION_MS,
  NOTEBOOKLM_PRE_CREATE_RETENTION_MS,
  NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS,
  NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS,
  NOTEBOOKLM_RETENTION_SWEEP_MS,
  NOTEBOOKLM_RETRY_BACKOFF_MS,
  NOTEBOOKLM_SAFE_TARGET_LABEL,
  NOTEBOOKLM_SOURCE_RESERVE,
  type NotebookLmClaimDto,
  type NotebookLmConnectorEvent,
  type NotebookLmRequestPhase,
  type NotebookLmRequestState,
} from "@/lib/notebooklm/contracts";
import { providerTitle } from "@/lib/notebooklm/formatter";
import { recordNotebookLmOperationalEvent } from "@/lib/notebooklm/operations";
import { loadApiToken } from "@/lib/auth/bearer";

export const NOTEBOOKLM_PRIMARY_OWNER = "primary";

export type NotebookLmExportErrorCode =
  | "connector_not_configured"
  | "target_not_private"
  | "target_capacity_unknown"
  | "target_capacity_exhausted"
  | "target_has_active_work"
  | "invalid_binding"
  | "idempotency_conflict"
  | "updated_confirmation_required"
  | "item_has_active_export"
  | "prior_provider_outcome_blocks_recreate"
  | "request_not_found"
  | "request_not_cancellable"
  | "request_not_stoppable"
  | "acknowledgement_required"
  | "stale_lease"
  | "invalid_transition"
  | "runtime_write_blocked"
  | "marker_secret_unavailable";

export class NotebookLmExportError extends Error {
  constructor(public readonly code: NotebookLmExportErrorCode) {
    super(code);
    this.name = "NotebookLmExportError";
  }
}

export interface NotebookLmTargetRow {
  id: string;
  connector_id: string;
  binding_version: number;
  safe_label: string;
  local_binding_fingerprint: string;
  subject_fingerprint: string;
  sharing_policy: "private_only";
  sharing_posture: "unknown" | "private" | "shared" | "public";
  source_limit: number;
  reserve_count: number;
  source_count: number | null;
  health_status: "unknown" | "healthy" | "attention";
  health_reason: string | null;
  verified_at: number | null;
  active: 0 | 1;
  created_at: number;
  deactivated_at: number | null;
}

export interface NotebookLmExportRequestRow {
  id: string;
  owner_id: string;
  idempotency_key: string;
  item_id: string;
  connector_id: string;
  target_id: string;
  binding_version: number;
  mapper_version: number;
  content_hash: string;
  opaque_marker: string;
  payload_title: string | null;
  payload_text: string | null;
  payload_bytes: number;
  payload_words: number;
  limited_capture: 0 | 1;
  state: NotebookLmRequestState;
  phase: NotebookLmRequestPhase;
  safe_reason: string | null;
  lease_epoch: number;
  lease_token_hash: string | null;
  lease_until: number | null;
  next_attempt_at: number;
  attempt_count: number;
  source_alias: string | null;
  provider_status: string | null;
  created_at: number;
  updated_at: number;
  claimed_at: number | null;
  create_dispatched_at: number | null;
  processing_at: number | null;
  completed_at: number | null;
  expires_at: number;
  snapshot_purge_at: number;
  snapshot_purged_at: number | null;
  cancelled_at: number | null;
}

export function bindNotebookLmTarget(input: {
  connector: NotebookLmConnectorRow;
  safeLabel: string;
  localBindingFingerprint: string;
  subjectFingerprint: string;
  sharingPosture: "private" | "shared" | "public" | "unknown";
  sourceCount: number;
  sourceLimit: number;
  reserveCount: number;
  observedBindingVersion: number;
  now?: number;
}): NotebookLmTargetRow {
  if (
    !/^[a-f0-9]{64}$/.test(input.localBindingFingerprint) ||
    !/^[a-f0-9]{64}$/.test(input.subjectFingerprint) ||
    !Number.isSafeInteger(input.sourceCount) ||
    input.sourceCount < 0 ||
    !Number.isSafeInteger(input.sourceLimit) ||
    input.sourceLimit < NOTEBOOKLM_MIN_SOURCE_LIMIT ||
    input.sourceLimit > NOTEBOOKLM_MAX_SOURCE_LIMIT ||
    !Number.isSafeInteger(input.reserveCount) ||
    input.reserveCount !== NOTEBOOKLM_SOURCE_RESERVE ||
    !Number.isSafeInteger(input.observedBindingVersion) ||
    input.observedBindingVersion < 0 ||
    input.safeLabel !== NOTEBOOKLM_SAFE_TARGET_LABEL
  ) {
    throw new NotebookLmExportError("invalid_binding");
  }
  if (input.sharingPosture !== "private") {
    throw new NotebookLmExportError("target_not_private");
  }
  if (input.sourceCount + input.reserveCount >= input.sourceLimit) {
    throw new NotebookLmExportError("target_capacity_exhausted");
  }

  const db = getDb();
  const now = input.now ?? Date.now();
  const safeLabel = NOTEBOOKLM_SAFE_TARGET_LABEL;
  const tx = db.transaction(() => {
    requireLiveNotebookLmConnector(input.connector);
    const active = getActiveNotebookLmTarget();
    // A successful bind response can be lost after the transaction commits. Treat
    // an exact replay from the same connector as an idempotent health refresh and
    // return the authoritative binding version before enforcing the replacement
    // compare-and-swap. A different proof must still present the current version.
    if (
      active &&
      active.connector_id === input.connector.id &&
      active.local_binding_fingerprint === input.localBindingFingerprint &&
      active.subject_fingerprint === input.subjectFingerprint &&
      active.source_limit === input.sourceLimit &&
      active.reserve_count === input.reserveCount
    ) {
      db.prepare(
        `UPDATE notebooklm_targets
         SET safe_label = ?, sharing_posture = 'private', source_count = ?, source_limit = ?,
             reserve_count = ?, health_status = 'healthy', health_reason = NULL, verified_at = ?
         WHERE id = ? AND active = 1`,
      ).run(
        safeLabel,
        input.sourceCount,
        input.sourceLimit,
        input.reserveCount,
        now,
        active.id,
      );
      db.prepare(
        "UPDATE notebooklm_connectors SET state = 'bound', updated_at = ? WHERE id = ? AND state != 'revoked'",
      ).run(now, input.connector.id);
      db.prepare(
        `UPDATE notebooklm_export_requests
         SET lease_epoch = 0, safe_reason = NULL, updated_at = ?
             , next_attempt_at = ?
         WHERE target_id = ? AND phase = 'pre_create' AND create_dispatched_at IS NULL
           AND lease_token_hash IS NULL
           AND COALESCE(safe_reason, '') != 'lease_exhausted'
           AND state IN (
             'authentication_attention', 'target_attention',
             'connector_update_required', 'retryable_failure'
           )`,
      ).run(now, now, active.id);
      recordNotebookLmOperationalEvent({
        eventType: "notebooklm.target_health_checked",
        connectorId: input.connector.id,
        targetId: active.id,
        now,
        db,
      });
      recordNotebookLmProtocolSuccess({ now, db });
      return getNotebookLmTarget(active.id)!;
    }

    if (
      (!active && input.observedBindingVersion !== 0) ||
      (active?.connector_id === input.connector.id &&
        input.observedBindingVersion !== active.binding_version) ||
      (active?.connector_id !== undefined &&
        active.connector_id !== input.connector.id &&
        input.observedBindingVersion !== 0)
    ) {
      throw new NotebookLmExportError("invalid_binding");
    }

    if (active && hasActiveNotebookLmWork(active.id)) {
      throw new NotebookLmExportError("target_has_active_work");
    }
    if (active) {
      db.prepare(
        "UPDATE notebooklm_targets SET active = 0, deactivated_at = ? WHERE id = ? AND active = 1",
      ).run(now, active.id);
      if (active.connector_id !== input.connector.id) {
        db.prepare(
          `UPDATE notebooklm_connectors
           SET state = 'revoked', revoked_at = ?, updated_at = ?
           WHERE id = ? AND state != 'revoked'`,
        ).run(now, now, active.connector_id);
      }
    }
    const versionRow = db
      .prepare(
        "SELECT COALESCE(MAX(binding_version), 0) value FROM notebooklm_targets WHERE connector_id = ?",
      )
      .get(input.connector.id) as { value: number };
    const id = newId();
    db.prepare(
      `INSERT INTO notebooklm_targets
       (id, connector_id, binding_version, safe_label, local_binding_fingerprint,
        subject_fingerprint, sharing_policy, sharing_posture, source_limit, reserve_count,
        source_count, health_status, verified_at, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'private_only', 'private', ?, ?, ?, 'healthy', ?, 1, ?)`,
    ).run(
      id,
      input.connector.id,
      versionRow.value + 1,
      safeLabel,
      input.localBindingFingerprint,
      input.subjectFingerprint,
      input.sourceLimit,
      input.reserveCount,
      input.sourceCount,
      now,
      now,
    );
    db.prepare(
      "UPDATE notebooklm_connectors SET state = 'bound', updated_at = ? WHERE id = ? AND state != 'revoked'",
    ).run(now, input.connector.id);
    recordNotebookLmOperationalEvent({
      eventType: active ? "notebooklm.target_rebound" : "notebooklm.target_bound",
      connectorId: input.connector.id,
      targetId: id,
      now,
      db,
    });
    recordNotebookLmProtocolSuccess({ now, db });
    return getNotebookLmTarget(id)!;
  });
  return tx.immediate();
}

export function createNotebookLmExportRequest(input: {
  itemId: string;
  idempotencyKey: string;
  mappedTitle: string;
  mappedText: string;
  contentHash: string;
  payloadBytes: number;
  payloadWords: number;
  limitedCapture: boolean;
  confirmUpdatedVersion?: boolean;
  ownerId?: string;
  now?: number;
}): { request: NotebookLmExportRequestRow; deduplicated: boolean } {
  const db = getDb();
  const now = input.now ?? Date.now();
  const ownerId = input.ownerId ?? NOTEBOOKLM_PRIMARY_OWNER;
  const earlyReplay = db
    .prepare(
      "SELECT * FROM notebooklm_export_requests WHERE owner_id = ? AND idempotency_key = ?",
    )
    .get(ownerId, input.idempotencyKey) as NotebookLmExportRequestRow | undefined;
  if (earlyReplay) {
    if (earlyReplay.item_id !== input.itemId || earlyReplay.content_hash !== input.contentHash) {
      throw new NotebookLmExportError("idempotency_conflict");
    }
    appendNotebookLmEvent(
      earlyReplay.id,
      earlyReplay.connector_id,
      null,
      "notebooklm.request_deduped",
      earlyReplay.state,
      earlyReplay.state,
      "idempotency_replay",
      now,
    );
    return { request: getNotebookLmExportRequest(earlyReplay.id)!, deduplicated: true };
  }

  const secret = loadApiToken();
  if (!secret) throw new NotebookLmExportError("marker_secret_unavailable");

  // Run retention before the enqueue transaction so any physical WAL truncate
  // happens outside an active transaction. The transaction then rechecks the
  // durable runtime gate, while exact idempotency replay remains available.
  cleanupNotebookLmRetention(now);

  const tx = db.transaction(() => {
    const replay = db
      .prepare(
        "SELECT * FROM notebooklm_export_requests WHERE owner_id = ? AND idempotency_key = ?",
      )
      .get(ownerId, input.idempotencyKey) as NotebookLmExportRequestRow | undefined;
    if (replay) {
      if (replay.item_id !== input.itemId || replay.content_hash !== input.contentHash) {
        throw new NotebookLmExportError("idempotency_conflict");
      }
      appendNotebookLmEvent(
        replay.id,
        replay.connector_id,
        null,
        "notebooklm.request_deduped",
        replay.state,
        replay.state,
        "idempotency_replay",
        now,
      );
      return { request: replay, deduplicated: true };
    }

    const itemExists = db
      .prepare("SELECT 1 value FROM items WHERE id = ?")
      .get(input.itemId) as { value: number } | undefined;
    if (!itemExists) throw new NotebookLmExportError("request_not_found");

    if (!notebookLmRuntimeProviderWritesAllowed(db, now)) {
      throw new NotebookLmExportError("runtime_write_blocked");
    }

    const target = db
      .prepare(
        `SELECT target.* FROM notebooklm_targets target
         JOIN notebooklm_connectors connector ON connector.id = target.connector_id
         WHERE target.active = 1 AND connector.state = 'bound' LIMIT 1`,
      )
      .get() as NotebookLmTargetRow | undefined;
    if (!target) throw new NotebookLmExportError("connector_not_configured");
    if (target.sharing_posture !== "private" || target.health_status !== "healthy") {
      throw new NotebookLmExportError("target_not_private");
    }
    if (target.source_count === null) {
      throw new NotebookLmExportError("target_capacity_unknown");
    }
    const targetSourceCount = target.source_count;

    const prior = db
      .prepare(
        `SELECT * FROM notebooklm_export_requests
         WHERE item_id = ? AND target_id = ? AND binding_version = ?
           AND mapper_version = ? AND content_hash = ?`,
      )
      .get(
        input.itemId,
        target.id,
        target.binding_version,
        NOTEBOOKLM_MAPPER_VERSION,
        input.contentHash,
      ) as NotebookLmExportRequestRow | undefined;
    if (prior) {
      if (
        prior.create_dispatched_at === null &&
        ((prior.phase === "pre_create" &&
          ["retryable_failure", "target_attention", "capacity_blocked"].includes(prior.state)) ||
          (prior.phase === "terminal" && ["cancelled", "expired"].includes(prior.state)))
      ) {
        const openCreates = countOpenCreateRequests(target.id, prior.id);
        if (targetSourceCount + target.reserve_count + openCreates >= target.source_limit) {
          throw new NotebookLmExportError("target_capacity_exhausted");
        }
        db.prepare(
          `UPDATE notebooklm_export_requests
           SET state = 'queued', phase = 'pre_create', safe_reason = NULL,
               payload_title = ?, payload_text = ?,
               payload_bytes = ?, payload_words = ?, limited_capture = ?, updated_at = ?,
               expires_at = ?, snapshot_purge_at = ?, snapshot_purged_at = NULL,
               completed_at = NULL, cancelled_at = NULL, lease_epoch = 0,
               lease_token_hash = NULL, lease_until = NULL, next_attempt_at = ?
           WHERE id = ? AND create_dispatched_at IS NULL`,
        ).run(
          prior.payload_title ?? providerTitle(input.mappedTitle, prior.opaque_marker),
          input.mappedText,
          input.payloadBytes,
          input.payloadWords,
          input.limitedCapture ? 1 : 0,
          now,
          notebookLmRetentionDeadline(now, NOTEBOOKLM_PRE_CREATE_RETENTION_MS),
          notebookLmRetentionDeadline(now, NOTEBOOKLM_PRE_CREATE_RETENTION_MS),
          now,
          prior.id,
        );
        appendNotebookLmEvent(prior.id, prior.connector_id, null, "requeued_by_user", prior.state, "queued", null, now);
        appendNotebookLmEvent(prior.id, prior.connector_id, null, "notebooklm.export_clicked", "queued", "queued", "deliberate_requeue", now);
        if (input.limitedCapture) {
          appendNotebookLmEvent(prior.id, prior.connector_id, null, "notebooklm.limited_confirmed", "queued", "queued", null, now);
        }
        return { request: getNotebookLmExportRequest(prior.id)!, deduplicated: true };
      }
      appendNotebookLmEvent(prior.id, prior.connector_id, null, "notebooklm.request_deduped", prior.state, prior.state, "same_content", now);
      return { request: prior, deduplicated: true };
    }

    const activeForItem = db
      .prepare(
        `SELECT 1 value FROM notebooklm_export_requests
         WHERE item_id = ? AND phase != 'terminal' LIMIT 1`,
      )
      .get(input.itemId) as { value: number } | undefined;
    if (activeForItem) {
      throw new NotebookLmExportError("item_has_active_export");
    }

    const latestForBinding = getLatestNotebookLmExportForItem(
      input.itemId,
      target.id,
      target.binding_version,
    );
    if (
      latestForBinding &&
      latestForBinding.create_dispatched_at !== null &&
      latestForBinding.state !== "succeeded"
    ) {
      throw new NotebookLmExportError("prior_provider_outcome_blocks_recreate");
    }

    const latestSucceeded = getLatestSucceededNotebookLmExportForItem(
      input.itemId,
      target.id,
      target.binding_version,
    );
    if (
      latestSucceeded &&
      latestSucceeded.content_hash !== input.contentHash &&
      !input.confirmUpdatedVersion
    ) {
      throw new NotebookLmExportError("updated_confirmation_required");
    }

    const openCreates = countOpenCreateRequests(target.id);
    if (targetSourceCount + target.reserve_count + openCreates >= target.source_limit) {
      throw new NotebookLmExportError("target_capacity_exhausted");
    }

    const id = newId();
    const marker = createOpaqueMarker(secret, {
      targetId: target.id,
      bindingVersion: target.binding_version,
      itemId: input.itemId,
      mapperVersion: NOTEBOOKLM_MAPPER_VERSION,
      contentHash: input.contentHash,
    });
    db.prepare(
      `INSERT INTO notebooklm_export_requests
       (id, owner_id, idempotency_key, item_id, connector_id, target_id,
        binding_version, mapper_version, content_hash, opaque_marker,
        payload_title, payload_text, payload_bytes, payload_words, limited_capture,
        state, phase, created_at, updated_at, expires_at, snapshot_purge_at,
        next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'pre_create', ?, ?, ?, ?, ?)`,
    ).run(
      id,
      ownerId,
      input.idempotencyKey,
      input.itemId,
      target.connector_id,
      target.id,
      target.binding_version,
      NOTEBOOKLM_MAPPER_VERSION,
      input.contentHash,
      marker,
      providerTitle(input.mappedTitle, marker),
      input.mappedText,
      input.payloadBytes,
      input.payloadWords,
      input.limitedCapture ? 1 : 0,
      now,
      now,
      notebookLmRetentionDeadline(now, NOTEBOOKLM_PRE_CREATE_RETENTION_MS),
      notebookLmRetentionDeadline(now, NOTEBOOKLM_PRE_CREATE_RETENTION_MS),
      now,
    );
    appendNotebookLmEvent(id, target.connector_id, null, "request_queued", null, "queued", null, now);
    appendNotebookLmEvent(id, target.connector_id, null, "notebooklm.export_clicked", "queued", "queued", null, now);
    if (input.limitedCapture) {
      appendNotebookLmEvent(id, target.connector_id, null, "notebooklm.limited_confirmed", "queued", "queued", null, now);
    }
    return { request: getNotebookLmExportRequest(id)!, deduplicated: false };
  });
  return tx.immediate();
}

export function claimNotebookLmExportRequest(input: {
  connector: NotebookLmConnectorRow;
  allowCreate: boolean;
  now?: number;
}): NotebookLmClaimDto | null {
  const db = getDb();
  const now = input.now ?? Date.now();
  cleanupNotebookLmRetention(now);
  let purgedForMissingItems = 0;
  const tx = db.transaction(() => {
    requireLiveNotebookLmConnector(input.connector);
    recoverExpiredNotebookLmLeases(now);
    purgedForMissingItems = terminalizeNotebookLmExportsForMissingItems(now, db);
    const createAllowed =
      input.allowCreate && notebookLmRuntimeProviderWritesAllowed(db, now);
    const createClause = createAllowed
      ? `OR (phase = 'pre_create' AND state IN (
               'queued', 'authentication_attention', 'retryable_failure',
               'target_attention', 'connector_update_required'
             )
             AND lease_epoch < ${NOTEBOOKLM_MAX_PRECREATE_LEASES}
             AND (
               state != 'target_attention'
               OR EXISTS (
                 SELECT 1 FROM notebooklm_targets healthy_target
                 WHERE healthy_target.id = notebooklm_export_requests.target_id
                   AND healthy_target.active = 1
                   AND healthy_target.sharing_posture = 'private'
                   AND healthy_target.health_status = 'healthy'
               )
             )
             AND EXISTS (
               SELECT 1 FROM notebooklm_targets claim_target
               WHERE claim_target.id = notebooklm_export_requests.target_id
                 AND claim_target.active = 1
                 AND claim_target.sharing_posture = 'private'
                 AND claim_target.health_status = 'healthy'
             )
             AND NOT EXISTS (
               SELECT 1 FROM notebooklm_export_requests active_create
               WHERE active_create.target_id = notebooklm_export_requests.target_id
                 AND (
                   (active_create.state = 'leased' AND active_create.phase = 'pre_create')
                   OR (active_create.state = 'sending' AND active_create.phase = 'create')
                 )
             ))`
      : "";
    const row = db
      .prepare(
        `SELECT * FROM notebooklm_export_requests
         WHERE connector_id = ? AND (
           (phase = 'reconcile' AND state IN (
              'reconciling', 'reconciliation_required', 'authentication_attention',
              'target_attention', 'connector_update_required'
            ))
           OR (phase = 'poll' AND state IN (
              'processing', 'authentication_attention', 'target_attention',
              'connector_update_required'
            ))
           ${createClause}
         )
         AND next_attempt_at <= ?
         AND EXISTS (
           SELECT 1 FROM items
           WHERE items.id = notebooklm_export_requests.item_id
         )
         AND (
           state != 'target_attention'
           OR EXISTS (
             SELECT 1 FROM notebooklm_targets healthy_target
             WHERE healthy_target.id = notebooklm_export_requests.target_id
               AND healthy_target.active = 1
               AND healthy_target.sharing_posture = 'private'
               AND healthy_target.health_status = 'healthy'
           )
         )
         ORDER BY CASE phase WHEN 'reconcile' THEN 0 WHEN 'poll' THEN 1 ELSE 2 END,
           next_attempt_at,
           created_at, id
         LIMIT 1`,
      )
      .get(input.connector.id, now) as NotebookLmExportRequestRow | undefined;
    if (!row) return null;
    const target = getNotebookLmTarget(row.target_id);
    if (!target || target.connector_id !== input.connector.id) {
      throw new NotebookLmExportError("invalid_binding");
    }
    const action: NotebookLmClaimDto["action"] =
      row.phase === "reconcile" ? "reconcile" : row.phase === "poll" ? "poll" : "create";
    if (action === "create" && (row.payload_title === null || row.payload_text === null)) {
      db.prepare(
        `UPDATE notebooklm_export_requests
         SET state = 'expired', phase = 'terminal', safe_reason = 'snapshot_missing',
             completed_at = ?, updated_at = ? WHERE id = ?`,
      ).run(now, now, row.id);
      return null;
    }
    const leaseToken = crypto.randomBytes(32).toString("hex");
    const leaseEpoch = row.lease_epoch + 1;
    db.prepare(
      `UPDATE notebooklm_export_requests
       SET state = 'leased', lease_epoch = ?, lease_token_hash = ?, lease_until = ?,
           claimed_at = ?, updated_at = ?, safe_reason = NULL
       WHERE id = ? AND state = ? AND lease_epoch = ?`,
    ).run(
      leaseEpoch,
      hashConnectorToken(leaseToken),
      now + NOTEBOOKLM_LEASE_MS,
      now,
      now,
      row.id,
      row.state,
      row.lease_epoch,
    );
    appendNotebookLmEvent(row.id, input.connector.id, leaseEpoch, "connector_claimed", row.state, "leased", null, now);
    return {
      requestId: row.id,
      leaseToken,
      leaseEpoch,
      action,
      target: {
        bindingVersion: target.binding_version,
        localBindingFingerprint: target.local_binding_fingerprint,
        sharingPolicy: "private_only",
        sourceLimit: target.source_limit,
        reserveCount: target.reserve_count,
      },
      source: {
        marker: row.opaque_marker,
        title: action === "create" ? row.payload_title : null,
        text: action === "create" ? row.payload_text : null,
        sourceAlias: action === "poll" ? row.source_alias : null,
      },
      leaseExpiresAt: new Date(now + NOTEBOOKLM_LEASE_MS).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString(),
    } satisfies NotebookLmClaimDto;
  });
  const result = tx.immediate();
  if (purgedForMissingItems > 0) finalizeNotebookLmSensitivePurge(now);
  return result;
}

export function applyNotebookLmConnectorEvent(input: {
  connector: NotebookLmConnectorRow;
  requestId: string;
  leaseToken: string;
  leaseEpoch: number;
  event: NotebookLmConnectorEvent;
  allowProviderWrite: boolean;
  now?: number;
}): NotebookLmExportRequestRow {
  const db = getDb();
  const now = input.now ?? Date.now();
  const tx = db.transaction(() => {
    requireLiveNotebookLmConnector(input.connector);
    const row = getNotebookLmExportRequest(input.requestId);
    if (!row || row.connector_id !== input.connector.id) {
      throw new NotebookLmExportError("request_not_found");
    }
    if (
      row.lease_epoch !== input.leaseEpoch ||
      row.lease_token_hash !== hashConnectorToken(input.leaseToken) ||
      row.lease_until === null ||
      row.lease_until <= now
    ) {
      throw new NotebookLmExportError("stale_lease");
    }
    const fromState = row.state;
    let toState = row.state;
    let toPhase = row.phase;
    let safeReason: string | null = null;
    let clearLease = true;
    let completedAt: number | null = null;
    let sourceAlias = row.source_alias;
    let providerStatus = row.provider_status;
    let createDispatchedAt = row.create_dispatched_at;
    let processingAt = row.processing_at;
    let snapshotPurgeAt = row.snapshot_purge_at;
    let attemptCount = row.attempt_count;
    let nextAttemptAt = row.next_attempt_at;

    switch (input.event.type) {
      case "preflight_ok": {
        requireTransition(row, "leased", "pre_create");
        const target = getNotebookLmTarget(row.target_id);
        if (
          !target ||
          target.active !== 1 ||
          target.connector_id !== input.connector.id ||
          input.event.sharingPosture !== "private" ||
          input.event.sourceCount < 0 ||
          input.event.sourceLimit !== target.source_limit ||
          input.event.sourceCount + target.reserve_count >= target.source_limit ||
          input.event.sourceCount + target.reserve_count +
            countOpenCreateRequests(target.id, row.id) >= target.source_limit
        ) {
          throw new NotebookLmExportError("invalid_transition");
        }
        db.prepare(
          `UPDATE notebooklm_targets
           SET sharing_posture = 'private', source_count = ?,
               health_status = 'healthy', health_reason = NULL, verified_at = ?
           WHERE id = ? AND connector_id = ?`,
        ).run(input.event.sourceCount, now, row.target_id, input.connector.id);
        recordNotebookLmOperationalEvent({
          eventType: "notebooklm.target_health_checked",
          connectorId: input.connector.id,
          targetId: row.target_id,
          now,
          db,
        });
        recordNotebookLmProtocolSuccess({ now, db });
        clearLease = false;
        break;
      }
      case "dispatch_started": {
        if (
          !input.allowProviderWrite ||
          !notebookLmRuntimeProviderWritesAllowed(db, now)
        ) {
          throw new NotebookLmExportError("runtime_write_blocked");
        }
        requireTransition(row, "leased", "pre_create");
        const preflight = db
          .prepare(
            `SELECT id FROM notebooklm_export_events
             WHERE request_id = ? AND lease_epoch = ? AND event_type = 'preflight_ok'
             ORDER BY id DESC LIMIT 1`,
          )
          .get(row.id, row.lease_epoch) as { id: number } | undefined;
        const target = getNotebookLmTarget(row.target_id);
        const itemExists = db
          .prepare("SELECT 1 value FROM items WHERE id = ?")
          .get(row.item_id) as { value: number } | undefined;
        const adverseAfterPreflight = preflight
          ? (db
              .prepare(
                `SELECT 1 value
                 FROM notebooklm_export_events event
                 JOIN notebooklm_export_requests request ON request.id = event.request_id
                 WHERE request.target_id = ? AND event.id > ?
                   AND event.event_type IN ('target_attention', 'capacity_blocked')
                 LIMIT 1`,
              )
              .get(row.target_id, preflight.id) as { value: number } | undefined)
          : undefined;
        if (
          !preflight ||
          !itemExists ||
          adverseAfterPreflight ||
          !target ||
          target.active !== 1 ||
          target.connector_id !== input.connector.id ||
          target.sharing_posture !== "private" ||
          target.health_status !== "healthy" ||
          target.source_count === null ||
          target.source_count + target.reserve_count +
            countOpenCreateRequests(target.id, row.id) >= target.source_limit
        ) {
          throw new NotebookLmExportError("invalid_transition");
        }
        if (row.attempt_count !== 0 || row.create_dispatched_at !== null) {
          throw new NotebookLmExportError("invalid_transition");
        }
        toState = "sending";
        toPhase = "create";
        clearLease = false;
        createDispatchedAt = now;
        attemptCount = 1;
        snapshotPurgeAt = Math.min(
          row.snapshot_purge_at,
          notebookLmRetentionDeadline(now, NOTEBOOKLM_POST_DISPATCH_RETENTION_MS),
        );
        break;
      }
      case "authentication_required": {
        if (input.event.phase === "pre_create") {
          requireTransition(row, "leased", "pre_create");
          toPhase = "pre_create";
        } else if (input.event.phase === "reconcile") {
          if (!((row.state === "leased" && row.phase === "reconcile") || (row.state === "sending" && row.phase === "create"))) {
            throw new NotebookLmExportError("invalid_transition");
          }
          toPhase = "reconcile";
          snapshotPurgeAt = Math.min(
            row.snapshot_purge_at,
            notebookLmRetentionDeadline(now, NOTEBOOKLM_POST_DISPATCH_RETENTION_MS),
          );
        } else {
          requireTransition(row, "leased", "poll");
          toPhase = "poll";
        }
        toState = "authentication_attention";
        safeReason = `authentication_${input.event.phase}`;
        nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        break;
      }
      case "target_attention": {
        if (
          row.state !== "leased" ||
          !["pre_create", "reconcile", "poll"].includes(row.phase)
        ) {
          throw new NotebookLmExportError("invalid_transition");
        }
        toState = "target_attention";
        toPhase = row.phase;
        safeReason = input.event.reason;
        nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        const sharingPosture =
          input.event.reason === "shared" || input.event.reason === "public"
            ? input.event.reason
            : "unknown";
        if (row.phase === "reconcile") {
          snapshotPurgeAt = Math.min(
            row.snapshot_purge_at,
            notebookLmRetentionDeadline(now, NOTEBOOKLM_POST_DISPATCH_RETENTION_MS),
          );
        }
        db.prepare(
          `UPDATE notebooklm_targets
           SET sharing_posture = ?, health_status = 'attention', health_reason = ?, verified_at = ?
           WHERE id = ? AND connector_id = ?`,
        ).run(sharingPosture, input.event.reason, now, row.target_id, input.connector.id);
        break;
      }
      case "capacity_blocked": {
        requireTransition(row, "leased", "pre_create");
        const target = getNotebookLmTarget(row.target_id);
        if (
          !target ||
          target.active !== 1 ||
          target.connector_id !== input.connector.id ||
          input.event.sourceLimit !== target.source_limit ||
          input.event.sourceCount + target.reserve_count < target.source_limit
        ) {
          throw new NotebookLmExportError("invalid_transition");
        }
        toState = "capacity_blocked";
        toPhase = "pre_create";
        safeReason = "capacity_exhausted";
        nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        db.prepare(
          `UPDATE notebooklm_targets
           SET source_count = ?, health_status = 'attention',
               health_reason = 'capacity_exhausted', verified_at = ?
           WHERE id = ? AND connector_id = ?`,
        ).run(input.event.sourceCount, now, row.target_id, input.connector.id);
        break;
      }
      case "create_accepted": {
        requireTransition(row, "sending", "create");
        requireSourceAlias(input.event.sourceAlias);
        if (notebookLmSourceAliasInUse(row, input.event.sourceAlias)) {
          toState = "duplicate_conflict";
          toPhase = "terminal";
          safeReason = "provider_source_identity_reused";
          completedAt = now;
          markNotebookLmIdentityConflict({
            connectorId: input.connector.id,
            targetId: row.target_id,
            reason: "provider_source_identity_reused",
            now,
            db,
          });
          break;
        }
        sourceAlias = input.event.sourceAlias;
        providerStatus = input.event.providerStatus;
        recordNotebookLmProtocolSuccess({ now, db });
        recordNotebookLmSourceOccupancy(row.target_id, input.connector.id, now);
        if (input.event.providerStatus === "ready") {
          toState = "succeeded";
          toPhase = "terminal";
          completedAt = now;
        } else {
          toState = "processing";
          toPhase = "poll";
          processingAt = now;
          nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        }
        break;
      }
      case "create_uncertain": {
        requireTransition(row, "sending", "create");
        toState = "reconciling";
        toPhase = "reconcile";
        safeReason = input.event.reason;
        nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        if (input.event.reason === "protocol") {
          // A malformed/changed create response follows the one non-idempotent
          // provider request. Treat that schema drift as an immediate stop,
          // while leaving this request eligible for read-only reconciliation.
          tripNotebookLmProviderWriteBlock({
            connectorId: input.connector.id,
            targetId: row.target_id,
            reason: "protocol_drift",
            now,
            db,
          });
        } else {
          recordNotebookLmProtocolFailure({
            connectorId: input.connector.id,
            targetId: row.target_id,
            now,
            db,
          });
        }
        break;
      }
      case "reconcile_result": {
        requireTransition(row, "leased", "reconcile");
        recordNotebookLmProtocolSuccess({ now, db });
        if (input.event.matches === 0) {
          toState = "reconciliation_required";
          toPhase = "reconcile";
          safeReason = "no_visible_match";
          nextAttemptAt = now + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS;
        } else if (input.event.matches === 2) {
          toState = "duplicate_conflict";
          toPhase = "terminal";
          safeReason = "multiple_marker_matches";
          completedAt = now;
          markNotebookLmIdentityConflict({
            connectorId: input.connector.id,
            targetId: row.target_id,
            reason: "multiple_marker_matches",
            now,
            db,
          });
        } else {
          requireSourceAlias(input.event.sourceAlias);
          if (notebookLmSourceAliasInUse(row, input.event.sourceAlias!)) {
            toState = "duplicate_conflict";
            toPhase = "terminal";
            safeReason = "provider_source_identity_reused";
            completedAt = now;
            markNotebookLmIdentityConflict({
              connectorId: input.connector.id,
              targetId: row.target_id,
              reason: "provider_source_identity_reused",
              now,
              db,
            });
            break;
          }
          sourceAlias = input.event.sourceAlias!;
          if (row.source_alias === null) {
            recordNotebookLmSourceOccupancy(row.target_id, input.connector.id, now);
          }
          providerStatus = input.event.providerStatus ?? "processing";
          if (providerStatus === "ready") {
            toState = "succeeded";
            toPhase = "terminal";
            completedAt = now;
          } else if (providerStatus === "failed") {
            toState = "provider_failed";
            toPhase = "terminal";
            safeReason = "provider_processing_failed";
            completedAt = now;
          } else {
            toState = "processing";
            toPhase = "poll";
            processingAt = row.processing_at ?? now;
            nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
          }
        }
        break;
      }
      case "source_status": {
        requireTransition(row, "leased", "poll");
        recordNotebookLmProtocolSuccess({ now, db });
        providerStatus = input.event.providerStatus;
        if (input.event.providerStatus === "ready") {
          toState = "succeeded";
          toPhase = "terminal";
          completedAt = now;
        } else if (input.event.providerStatus === "failed") {
          toState = "provider_failed";
          toPhase = "terminal";
          safeReason = "provider_processing_failed";
          completedAt = now;
        } else {
          toState = "processing";
          toPhase = "poll";
          nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        }
        break;
      }
      case "retryable_failure": {
        if (row.state !== "leased") {
          throw new NotebookLmExportError("invalid_transition");
        }
        if (row.phase === "pre_create") {
          toState = "retryable_failure";
          toPhase = "pre_create";
        } else if (row.phase === "reconcile") {
          toState = "reconciling";
          toPhase = "reconcile";
        } else if (row.phase === "poll") {
          toState = "processing";
          toPhase = "poll";
        } else {
          throw new NotebookLmExportError("invalid_transition");
        }
        safeReason = input.event.reason;
        nextAttemptAt = now + NOTEBOOKLM_RETRY_BACKOFF_MS;
        recordNotebookLmProtocolFailure({
          connectorId: input.connector.id,
          targetId: row.target_id,
          now,
          db,
        });
        break;
      }
      case "connector_update_required": {
        if (row.state !== "leased" && row.state !== "sending") {
          throw new NotebookLmExportError("invalid_transition");
        }
        toState = "connector_update_required";
        toPhase = row.phase === "create" ? "reconcile" : row.phase;
        safeReason = input.event.reason;
        nextAttemptAt = now + NOTEBOOKLM_RECONCILE_ZERO_BACKOFF_MS;
        if (row.phase === "create") {
          snapshotPurgeAt = Math.min(
            row.snapshot_purge_at,
            notebookLmRetentionDeadline(now, NOTEBOOKLM_POST_DISPATCH_RETENTION_MS),
          );
        }
        // The extension emits this normalized event only for provider
        // source-list/status schema drift. Contractually that is an immediate
        // provider-write stop in every phase; reconcile/poll claims remain
        // available because they are read-only.
        tripNotebookLmProviderWriteBlock({
          connectorId: input.connector.id,
          targetId: row.target_id,
          reason: "protocol_drift",
          now,
          db,
        });
        break;
      }
    }

    db.prepare(
      `UPDATE notebooklm_export_requests SET
         state = ?, phase = ?, safe_reason = ?, updated_at = ?, completed_at = ?,
         source_alias = ?, provider_status = ?, create_dispatched_at = ?, processing_at = ?,
         snapshot_purge_at = ?, attempt_count = ?,
         next_attempt_at = ?, lease_token_hash = ?, lease_until = ?
       WHERE id = ? AND lease_epoch = ? AND connector_id = ?`,
    ).run(
      toState,
      toPhase,
      safeReason,
      now,
      completedAt,
      sourceAlias,
      providerStatus,
      createDispatchedAt,
      processingAt,
      snapshotPurgeAt,
      attemptCount,
      nextAttemptAt,
      clearLease ? null : row.lease_token_hash,
      clearLease ? null : row.lease_until,
      row.id,
      input.leaseEpoch,
      input.connector.id,
    );
    appendNotebookLmEvent(
      row.id,
      input.connector.id,
      input.leaseEpoch,
      input.event.type,
      fromState,
      toState,
      safeReason,
      now,
    );
    return getNotebookLmExportRequest(row.id)!;
  });
  return tx.immediate();
}

export function cancelNotebookLmExportRequest(input: {
  requestId: string;
  itemId: string;
  ownerId?: string;
  now?: number;
}): NotebookLmExportRequestRow {
  const db = getDb();
  const now = input.now ?? Date.now();
  const ownerId = input.ownerId ?? NOTEBOOKLM_PRIMARY_OWNER;
  let snapshotPurged = false;
  const tx = db.transaction(() => {
    const row = getNotebookLmExportRequest(input.requestId);
    if (!row || row.owner_id !== ownerId || row.item_id !== input.itemId) {
      throw new NotebookLmExportError("request_not_found");
    }
    if (row.phase !== "pre_create" || row.create_dispatched_at !== null || row.completed_at !== null) {
      throw new NotebookLmExportError("request_not_cancellable");
    }
    snapshotPurged = row.payload_title !== null || row.payload_text !== null;
    db.prepare(
      `UPDATE notebooklm_export_requests
       SET state = 'cancelled', phase = 'terminal', safe_reason = 'cancelled_by_user',
           payload_title = NULL, payload_text = NULL, snapshot_purge_at = ?,
           snapshot_purged_at = ?, cancelled_at = ?, completed_at = ?, updated_at = ?,
           lease_token_hash = NULL, lease_until = NULL
       WHERE id = ? AND phase = 'pre_create' AND create_dispatched_at IS NULL`,
    ).run(now, now, now, now, now, row.id);
    appendNotebookLmEvent(row.id, row.connector_id, row.lease_epoch, "request_cancelled", row.state, "cancelled", "cancelled_by_user", now);
    if (snapshotPurged) {
      appendNotebookLmEvent(row.id, row.connector_id, row.lease_epoch, "snapshot_purged", "cancelled", "cancelled", "cancelled_by_user", now);
      markNotebookLmPhysicalPurgePending({ now, db });
    }
    return getNotebookLmExportRequest(row.id)!;
  });
  const result = tx.immediate();
  if (snapshotPurged) finalizeNotebookLmSensitivePurge(now);
  return result;
}

export function stopCheckingNotebookLmExportRequest(input: {
  requestId: string;
  itemId: string;
  acknowledgeSourceMayExist: boolean;
  ownerId?: string;
  now?: number;
}): NotebookLmExportRequestRow {
  if (!input.acknowledgeSourceMayExist) {
    throw new NotebookLmExportError("acknowledgement_required");
  }
  const db = getDb();
  const now = input.now ?? Date.now();
  const ownerId = input.ownerId ?? NOTEBOOKLM_PRIMARY_OWNER;
  let snapshotPurged = false;
  const tx = db.transaction(() => {
    const row = getNotebookLmExportRequest(input.requestId);
    if (!row || row.owner_id !== ownerId || row.item_id !== input.itemId) {
      throw new NotebookLmExportError("request_not_found");
    }
    if (row.create_dispatched_at === null || row.phase === "terminal") {
      throw new NotebookLmExportError("request_not_stoppable");
    }
    snapshotPurged = row.payload_title !== null || row.payload_text !== null;
    db.prepare(
      `UPDATE notebooklm_export_requests
       SET state = 'reconciliation_required', phase = 'terminal',
           safe_reason = 'checking_stopped_source_may_exist', payload_title = NULL,
           payload_text = NULL, snapshot_purge_at = ?, snapshot_purged_at = ?,
           completed_at = ?, updated_at = ?, lease_token_hash = NULL, lease_until = NULL
       WHERE id = ? AND create_dispatched_at IS NOT NULL AND phase != 'terminal'`,
    ).run(now, now, now, now, row.id);
    appendNotebookLmEvent(
      row.id,
      row.connector_id,
      row.lease_epoch,
      "checking_stopped",
      row.state,
      "reconciliation_required",
      "checking_stopped_source_may_exist",
      now,
    );
    if (snapshotPurged) {
      appendNotebookLmEvent(
        row.id,
        row.connector_id,
        row.lease_epoch,
        "snapshot_purged",
        "reconciliation_required",
        "reconciliation_required",
        "checking_stopped",
        now,
      );
      markNotebookLmPhysicalPurgePending({ now, db });
    }
    return getNotebookLmExportRequest(row.id)!;
  });
  const result = tx.immediate();
  if (snapshotPurged) finalizeNotebookLmSensitivePurge(now);
  return result;
}

export function getNotebookLmExportRequest(id: string): NotebookLmExportRequestRow | null {
  return (
    (getDb().prepare("SELECT * FROM notebooklm_export_requests WHERE id = ?").get(id) as
      | NotebookLmExportRequestRow
      | undefined) ?? null
  );
}

export function getNotebookLmExportByIdempotencyKey(
  idempotencyKey: string,
  ownerId: string = NOTEBOOKLM_PRIMARY_OWNER,
): NotebookLmExportRequestRow | null {
  return (
    (getDb()
      .prepare(
        "SELECT * FROM notebooklm_export_requests WHERE owner_id = ? AND idempotency_key = ?",
      )
      .get(ownerId, idempotencyKey) as NotebookLmExportRequestRow | undefined) ?? null
  );
}

export function getLatestNotebookLmExportForItem(
  itemId: string,
  targetId?: string,
  bindingVersion?: number,
): NotebookLmExportRequestRow | null {
  const clauses = ["item_id = ?"];
  const params: Array<string | number> = [itemId];
  if (targetId !== undefined) {
    clauses.push("target_id = ?");
    params.push(targetId);
  }
  if (bindingVersion !== undefined) {
    clauses.push("binding_version = ?");
    params.push(bindingVersion);
  }
  return (
    (getDb()
      .prepare(
        `SELECT * FROM notebooklm_export_requests
         WHERE ${clauses.join(" AND ")}
         ORDER BY created_at DESC, id DESC LIMIT 1`,
      )
      .get(...params) as NotebookLmExportRequestRow | undefined) ?? null
  );
}

export function getLatestSucceededNotebookLmExportForItem(
  itemId: string,
  targetId?: string,
  bindingVersion?: number,
): NotebookLmExportRequestRow | null {
  const clauses = ["item_id = ?", "state = 'succeeded'"];
  const params: Array<string | number> = [itemId];
  if (targetId !== undefined) {
    clauses.push("target_id = ?");
    params.push(targetId);
  }
  if (bindingVersion !== undefined) {
    clauses.push("binding_version = ?");
    params.push(bindingVersion);
  }
  return (
    (getDb()
      .prepare(
        `SELECT * FROM notebooklm_export_requests
         WHERE ${clauses.join(" AND ")}
         ORDER BY completed_at DESC, created_at DESC, id DESC LIMIT 1`,
      )
      .get(...params) as NotebookLmExportRequestRow | undefined) ?? null
  );
}

export function getExactNotebookLmExportForItem(input: {
  itemId: string;
  targetId: string;
  bindingVersion: number;
  contentHash: string;
}): NotebookLmExportRequestRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM notebooklm_export_requests
         WHERE item_id = ? AND target_id = ? AND binding_version = ?
           AND mapper_version = ? AND content_hash = ? LIMIT 1`,
      )
      .get(
        input.itemId,
        input.targetId,
        input.bindingVersion,
        NOTEBOOKLM_MAPPER_VERSION,
        input.contentHash,
      ) as NotebookLmExportRequestRow | undefined) ?? null
  );
}

export function getNotebookLmTarget(id: string): NotebookLmTargetRow | null {
  return (
    (getDb().prepare("SELECT * FROM notebooklm_targets WHERE id = ?").get(id) as
      | NotebookLmTargetRow
      | undefined) ?? null
  );
}

export function getActiveNotebookLmTarget(): NotebookLmTargetRow | null {
  return (
    (getDb().prepare("SELECT * FROM notebooklm_targets WHERE active = 1 LIMIT 1").get() as
      | NotebookLmTargetRow
      | undefined) ?? null
  );
}

export function getNotebookLmConnectionSummary(now: number = Date.now()): {
  configured: boolean;
  targetLabel: string | null;
  sharingPosture: NotebookLmTargetRow["sharing_posture"] | null;
  safeSourceLimit: number | null;
  reserveCount: number | null;
  safeSlots: number | null;
  healthStatus: NotebookLmTargetRow["health_status"] | null;
  healthReason: string | null;
  targetVerifiedAt: number | null;
  connectorLastSeenAt: number | null;
  connectorOnline: boolean;
} {
  const target = getActiveNotebookLmTarget();
  if (!target) {
    return {
      configured: false,
      targetLabel: null,
      sharingPosture: null,
      safeSourceLimit: null,
      reserveCount: null,
      safeSlots: null,
      healthStatus: null,
      healthReason: null,
      targetVerifiedAt: null,
      connectorLastSeenAt: null,
      connectorOnline: false,
    };
  }
  const connector = getDb()
    .prepare("SELECT last_seen_at FROM notebooklm_connectors WHERE id = ? AND state != 'revoked'")
    .get(target.connector_id) as { last_seen_at: number | null } | undefined;
  const openCreates = countOpenCreateRequests(target.id);
  const safeSlots =
    target.source_count === null
      ? null
      : Math.max(0, target.source_limit - target.reserve_count - target.source_count - openCreates);
  return {
    configured: true,
    targetLabel: target.safe_label,
    sharingPosture: target.sharing_posture,
    safeSourceLimit: target.source_limit - target.reserve_count,
    reserveCount: target.reserve_count,
    safeSlots,
    healthStatus: target.health_status,
    healthReason: target.health_reason,
    targetVerifiedAt: target.verified_at,
    connectorLastSeenAt: connector?.last_seen_at ?? null,
    connectorOnline: Boolean(connector?.last_seen_at && now - connector.last_seen_at < 2 * 60 * 1_000),
  };
}

export function revokeActiveNotebookLmConnector(input: {
  emergency?: boolean;
  now?: number;
} = {}): boolean {
  const db = getDb();
  const now = input.now ?? Date.now();
  let snapshotPurged = false;
  const tx = db.transaction(() => {
    const target = getActiveNotebookLmTarget();
    if (target && hasActiveNotebookLmWork(target.id) && !input.emergency) {
      throw new NotebookLmExportError("target_has_active_work");
    }
    if (target && input.emergency) {
      const unresolved = db
        .prepare(
          `SELECT id, connector_id, state, lease_epoch, create_dispatched_at,
                  (payload_title IS NOT NULL OR payload_text IS NOT NULL) had_snapshot
           FROM notebooklm_export_requests
           WHERE target_id = ? AND phase != 'terminal'`,
        )
        .all(target.id) as Array<{
          id: string;
          connector_id: string;
          state: string;
          lease_epoch: number;
          create_dispatched_at: number | null;
          had_snapshot: 0 | 1;
        }>;
      // Revoke every live scoped token in the same transaction before making
      // any stranded payload decision. The transaction commits atomically.
      db.prepare(
        `UPDATE notebooklm_connectors
         SET state = 'revoked', revoked_at = ?, updated_at = ?
         WHERE state != 'revoked'`,
      ).run(now, now);
      for (const request of unresolved) {
        const possiblyDelivered = request.create_dispatched_at !== null;
        const nextState = possiblyDelivered ? "reconciliation_required" : "cancelled";
        const reason = possiblyDelivered
          ? "emergency_revoked_source_may_exist"
          : "emergency_revoked_before_send";
        db.prepare(
          `UPDATE notebooklm_export_requests
           SET state = ?, phase = 'terminal', safe_reason = ?,
               payload_title = NULL, payload_text = NULL,
               snapshot_purge_at = ?, snapshot_purged_at = ?, completed_at = ?,
               cancelled_at = CASE WHEN ? = 0 THEN ? ELSE cancelled_at END,
               lease_token_hash = NULL, lease_until = NULL, updated_at = ?
           WHERE id = ? AND phase != 'terminal'`,
        ).run(
          nextState,
          reason,
          now,
          now,
          now,
          possiblyDelivered ? 1 : 0,
          now,
          now,
          request.id,
        );
        appendNotebookLmEvent(
          request.id,
          request.connector_id,
          request.lease_epoch,
          "connector_emergency_revoked",
          request.state,
          nextState,
          reason,
          now,
        );
        if (request.had_snapshot) {
          snapshotPurged = true;
          appendNotebookLmEvent(
            request.id,
            request.connector_id,
            request.lease_epoch,
            "snapshot_purged",
            nextState,
            nextState,
            "emergency_revoke",
            now,
          );
        }
      }
      if (snapshotPurged) markNotebookLmPhysicalPurgePending({ now, db });
    }
    if (target) {
      db.prepare(
        "UPDATE notebooklm_targets SET active = 0, deactivated_at = ? WHERE id = ? AND active = 1",
      ).run(now, target.id);
      if (!input.emergency) {
        db.prepare(
          `UPDATE notebooklm_connectors
           SET state = 'revoked', revoked_at = ?, updated_at = ?
           WHERE state != 'revoked'`,
        ).run(now, now);
      }
      recordNotebookLmOperationalEvent({
        eventType: input.emergency
          ? "notebooklm.connector_emergency_revoked"
          : "notebooklm.connector_revoked",
        connectorId: target.connector_id,
        targetId: target.id,
        safeReason: input.emergency ? "credential_compromise_response" : null,
        now,
        db,
      });
      recordNotebookLmOperationalEvent({
        eventType: "notebooklm.connector_disabled",
        connectorId: target.connector_id,
        targetId: target.id,
        safeReason: input.emergency ? "emergency_revoke" : "safe_disconnect",
        now,
        db,
      });
      return true;
    }
    const revoked = db.prepare(
      `UPDATE notebooklm_connectors
       SET state = 'revoked', revoked_at = ?, updated_at = ?
      WHERE state != 'revoked'`,
    ).run(now, now).changes;
    if (revoked > 0) {
      recordNotebookLmOperationalEvent({
        eventType: "notebooklm.connector_disabled",
        safeReason: input.emergency ? "emergency_revoke" : "safe_disconnect",
        now,
        db,
      });
    }
    return revoked > 0;
  });
  const result = tx.immediate();
  if (snapshotPurged) finalizeNotebookLmSensitivePurge(now);
  return result;
}

/**
 * Fail closed when an AI Memory item is deleted. Conclusively unsent work is
 * cancelled; possibly delivered work becomes terminal unresolved because the
 * remote source may exist. Every frozen snapshot is purged immediately while
 * the content-free dedupe/safety ledger remains.
 *
 * The caller owns the surrounding transaction and must call
 * `finalizeNotebookLmSensitivePurge` after commit when the return value is > 0.
 */
export function terminalizeNotebookLmExportsForDeletedItem(
  itemId: string,
  now: number = Date.now(),
  db: ReturnType<typeof getDb> = getDb(),
): number {
  const rows = db
    .prepare(
      `SELECT * FROM notebooklm_export_requests
       WHERE item_id = ?
         AND (phase != 'terminal' OR payload_title IS NOT NULL OR payload_text IS NOT NULL)`,
    )
    .all(itemId) as NotebookLmExportRequestRow[];
  let snapshotsPurged = 0;
  for (const row of rows) {
    const hadSnapshot = row.payload_title !== null || row.payload_text !== null;
    const active = row.phase !== "terminal";
    const possiblyDelivered = row.create_dispatched_at !== null;
    const nextState: NotebookLmRequestState = possiblyDelivered
      ? "reconciliation_required"
      : "cancelled";
    const reason = possiblyDelivered
      ? "item_deleted_source_may_exist"
      : "item_deleted_before_send";
    db.prepare(
      `UPDATE notebooklm_export_requests SET
         state = CASE WHEN phase != 'terminal' THEN ? ELSE state END,
         phase = CASE WHEN phase != 'terminal' THEN 'terminal' ELSE phase END,
         safe_reason = CASE WHEN phase != 'terminal' THEN ? ELSE safe_reason END,
         payload_title = NULL, payload_text = NULL,
         snapshot_purge_at = MIN(snapshot_purge_at, ?),
         snapshot_purged_at = CASE WHEN ? = 1 THEN ? ELSE snapshot_purged_at END,
         completed_at = CASE WHEN phase != 'terminal' THEN ? ELSE completed_at END,
         cancelled_at = CASE
           WHEN phase != 'terminal' AND create_dispatched_at IS NULL THEN ?
           ELSE cancelled_at
         END,
         lease_token_hash = NULL, lease_until = NULL, updated_at = ?
       WHERE id = ?`,
    ).run(nextState, reason, now, hadSnapshot ? 1 : 0, now, now, now, now, row.id);
    if (active) {
      appendNotebookLmEvent(
        row.id,
        row.connector_id,
        row.lease_epoch,
        "item_deleted",
        row.state,
        nextState,
        reason,
        now,
      );
    }
    if (hadSnapshot) {
      snapshotsPurged += 1;
      appendNotebookLmEvent(
        row.id,
        row.connector_id,
        row.lease_epoch,
        "snapshot_purged",
        active ? nextState : row.state,
        active ? nextState : row.state,
        "item_deleted",
        now,
      );
    }
  }
  if (snapshotsPurged > 0) markNotebookLmPhysicalPurgePending({ now, db });
  return snapshotsPurged;
}

const NOTEBOOKLM_PHYSICAL_PURGE_FINALIZE_MAX_GENERATIONS = 8;

export function finalizeNotebookLmSensitivePurge(
  now: number = Date.now(),
  db: ReturnType<typeof getDb> = getDb(),
  checkpoint: (database: ReturnType<typeof getDb>) => void = checkpointSensitiveDeletion,
): void {
  const initial = getNotebookLmRuntimeControl(db);
  try {
    // A second valid sweeper can arrive after the first one checkpointed and
    // cleared this generation. Generations are monotonic, and the only normal
    // clear path follows a successful checkpoint, so repeating finalization for
    // an already-cleared non-zero generation is an idempotent success.
    if (initial.retention_physical_purge_pending !== 1) {
      if (initial.retention_physical_purge_generation > 0) return;
      throw new Error("physical_purge_marker_missing");
    }

    let expectedGeneration = initial.retention_physical_purge_generation;
    for (
      let attempt = 0;
      attempt < NOTEBOOKLM_PHYSICAL_PURGE_FINALIZE_MAX_GENERATIONS;
      attempt += 1
    ) {
      checkpoint(db);
      if (clearNotebookLmPhysicalPurgePending({ expectedGeneration, now, db })) return;

      const current = getNotebookLmRuntimeControl(db);
      if (
        current.retention_physical_purge_pending === 0 &&
        current.retention_physical_purge_generation >= expectedGeneration
      ) {
        // An overlapping sweeper successfully checkpointed and cleared this or
        // a newer generation. Do not turn that valid overlap into a failure.
        return;
      }
      if (
        current.retention_physical_purge_pending === 1 &&
        current.retention_physical_purge_generation > expectedGeneration
      ) {
        // Sensitive writes committed after our checkpoint. Advance and perform
        // another checkpoint before attempting to clear the newer generation.
        expectedGeneration = current.retention_physical_purge_generation;
        continue;
      }
      throw new Error("physical_purge_pending");
    }
    throw new Error("physical_purge_pending");
  } catch (error) {
    try {
      recordNotebookLmRetentionSweepFailure({
        errorCode: notebookLmRetentionFailureCode(error),
        now,
        db,
      });
    } catch {
      // Preserve the original physical-purge failure. The retention worker will
      // retry and surface its own normalized health signal.
    }
    throw error;
  }
}

export function cleanupNotebookLmRetention(
  now: number = Date.now(),
  db: ReturnType<typeof getDb> = getDb(),
): {
  expired: number;
  snapshotsPurged: number;
  eventsDeleted: number;
  overdueSnapshots: number;
  unresolvedOver24h: number;
  ledgerRowsDeleted: number;
} {
  try {
    const result = db.transaction(() => {
      const expiredRows = db
        .prepare(
          `SELECT id, connector_id, state, lease_epoch,
                  (payload_title IS NOT NULL OR payload_text IS NOT NULL) had_snapshot
           FROM notebooklm_export_requests
           WHERE phase = 'pre_create' AND create_dispatched_at IS NULL
             AND completed_at IS NULL AND expires_at <= ?`,
        )
        .all(now) as Array<{
          id: string;
          connector_id: string;
          state: string;
          lease_epoch: number;
          had_snapshot: 0 | 1;
        }>;
      const expired = db.prepare(
        `UPDATE notebooklm_export_requests
         SET state = 'expired', phase = 'terminal', safe_reason = 'expired_before_send',
             payload_title = NULL, payload_text = NULL, snapshot_purged_at = ?,
             completed_at = ?, updated_at = ?, lease_token_hash = NULL, lease_until = NULL
         WHERE phase = 'pre_create' AND create_dispatched_at IS NULL
           AND completed_at IS NULL AND expires_at <= ?`,
      ).run(now, now, now, now).changes;
      for (const row of expiredRows) {
        appendNotebookLmEvent(row.id, row.connector_id, row.lease_epoch, "request_expired", row.state, "expired", "expired_before_send", now, db);
        if (row.had_snapshot) {
          appendNotebookLmEvent(row.id, row.connector_id, row.lease_epoch, "snapshot_purged", "expired", "expired", "expired_before_send", now, db);
        }
      }
      const purgeRows = db
        .prepare(
          `SELECT id, connector_id, state, lease_epoch,
                  (payload_title IS NOT NULL OR payload_text IS NOT NULL) had_snapshot
           FROM notebooklm_export_requests
           WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
        )
        .all(now) as Array<{
          id: string;
          connector_id: string;
          state: string;
          lease_epoch: number;
          had_snapshot: 0 | 1;
        }>;
      const snapshotsPurged = db.prepare(
        `UPDATE notebooklm_export_requests
         SET payload_title = NULL, payload_text = NULL, snapshot_purged_at = ?, updated_at = ?
         WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
      ).run(now, now, now).changes;
      for (const row of purgeRows) {
        appendNotebookLmEvent(row.id, row.connector_id, row.lease_epoch, "snapshot_purged", row.state, row.state, "retention_deadline", now, db);
      }
      const requestEventsDeleted = db
        .prepare("DELETE FROM notebooklm_export_events WHERE created_at < ?")
        .run(now - NOTEBOOKLM_EVENT_RETENTION_MS + NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS).changes;
      const operationalEventsDeleted = db
        .prepare("DELETE FROM notebooklm_operational_events WHERE created_at < ?")
        .run(now - NOTEBOOKLM_EVENT_RETENTION_MS + NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS).changes;
      const orphanCutoff = now - NOTEBOOKLM_ORPHAN_LEDGER_RETENTION_MS;
      const requestsDeleted = db
        .prepare(
          `DELETE FROM notebooklm_export_requests
           WHERE phase = 'terminal' AND COALESCE(completed_at, updated_at) < ?
             AND NOT EXISTS (SELECT 1 FROM items WHERE items.id = notebooklm_export_requests.item_id)
             AND EXISTS (
               SELECT 1 FROM notebooklm_targets target
               WHERE target.id = notebooklm_export_requests.target_id AND target.active = 0
             )`,
        )
        .run(orphanCutoff).changes;
      const targetsDeleted = db
        .prepare(
          `DELETE FROM notebooklm_targets
           WHERE active = 0 AND deactivated_at < ?
             AND NOT EXISTS (
               SELECT 1 FROM notebooklm_export_requests request
               WHERE request.target_id = notebooklm_targets.id
             )`,
        )
        .run(orphanCutoff).changes;
      const connectorsDeleted = db
        .prepare(
          `DELETE FROM notebooklm_connectors
           WHERE state = 'revoked' AND revoked_at < ?
             AND NOT EXISTS (
               SELECT 1 FROM notebooklm_targets target
               WHERE target.connector_id = notebooklm_connectors.id
             )`,
        )
        .run(orphanCutoff).changes;
      db.prepare(
        `DELETE FROM notebooklm_connector_pairing_codes
         WHERE (used_at IS NOT NULL OR expires_at < ?) AND expires_at < ?`,
      ).run(now, now - 24 * 60 * 60 * 1_000);
      const overdueSnapshots = (db
        .prepare(
          `SELECT COUNT(*) value FROM notebooklm_export_requests
           WHERE snapshot_purged_at IS NULL AND snapshot_purge_at <= ?`,
        )
        .get(now) as { value: number }).value;
      const unresolvedOver24h = (db
        .prepare(
          `SELECT COUNT(*) value FROM notebooklm_export_requests
           WHERE create_dispatched_at IS NOT NULL
             AND create_dispatched_at <= ?
             AND state NOT IN ('succeeded', 'provider_failed', 'cancelled', 'expired')`,
        )
        .get(now - 24 * 60 * 60 * 1_000) as { value: number }).value;
      const sensitiveRowsPurged =
        expiredRows.filter((row) => row.had_snapshot === 1).length +
        purgeRows.filter((row) => row.had_snapshot === 1).length;
      if (sensitiveRowsPurged > 0) markNotebookLmPhysicalPurgePending({ now, db });
      return {
        expired,
        snapshotsPurged,
        eventsDeleted: requestEventsDeleted + operationalEventsDeleted,
        overdueSnapshots,
        unresolvedOver24h,
        ledgerRowsDeleted: requestsDeleted + targetsDeleted + connectorsDeleted,
        sensitiveRowsPurged,
        physicalPurgePending:
          getNotebookLmRuntimeControl(db).retention_physical_purge_pending === 1,
      };
    }).immediate();

    if (result.physicalPurgePending) finalizeNotebookLmSensitivePurge(now, db);
    recordNotebookLmRetentionSweepSuccess({
      expired: result.expired,
      snapshotsPurged: result.snapshotsPurged,
      overdueSnapshots: result.overdueSnapshots,
      unresolvedOver24h: result.unresolvedOver24h,
      now,
      db,
    });
    return {
      expired: result.expired,
      snapshotsPurged: result.snapshotsPurged,
      eventsDeleted: result.eventsDeleted,
      overdueSnapshots: result.overdueSnapshots,
      unresolvedOver24h: result.unresolvedOver24h,
      ledgerRowsDeleted: result.ledgerRowsDeleted,
    };
  } catch (error) {
    try {
      const control = db
        .prepare("SELECT retention_last_failure_at FROM notebooklm_runtime_control WHERE id = 1")
        .get() as { retention_last_failure_at: number | null } | undefined;
      if (control?.retention_last_failure_at !== now) {
        recordNotebookLmRetentionSweepFailure({
          errorCode: notebookLmRetentionFailureCode(error),
          now,
          db,
        });
      }
    } catch {
      // Keep the originating cleanup failure observable to the caller/log.
    }
    throw error;
  }
}

function notebookLmRetentionFailureCode(
  error: unknown,
): "cleanup_failed" | "physical_purge_pending" | "wal_checkpoint_incomplete" {
  if (error instanceof Error && error.message === "sensitive_wal_checkpoint_incomplete") {
    return "wal_checkpoint_incomplete";
  }
  if (error instanceof Error && error.message === "physical_purge_pending") {
    return "physical_purge_pending";
  }
  return "cleanup_failed";
}

function notebookLmRetentionDeadline(now: number, maximumRetentionMs: number): number {
  return now + maximumRetentionMs - NOTEBOOKLM_RETENTION_SAFETY_MARGIN_MS;
}

export function startNotebookLmRetentionWorker(): void {
  const registry = globalThis as typeof globalThis & {
    __notebookLmRetentionWorkerStarted?: boolean;
  };
  if (registry.__notebookLmRetentionWorkerStarted) return;
  const run = () => {
    try {
      cleanupNotebookLmRetention();
    } catch {
      console.error("[notebooklm] retention sweep failed (normalized)");
    }
  };
  run();
  registry.__notebookLmRetentionWorkerStarted = true;
  const timer = setInterval(run, NOTEBOOKLM_RETENTION_SWEEP_MS);
  timer.unref();
}

function terminalizeNotebookLmExportsForMissingItems(
  now: number,
  db: ReturnType<typeof getDb>,
): number {
  const missing = db
    .prepare(
      `SELECT DISTINCT request.item_id
       FROM notebooklm_export_requests request
       WHERE (request.phase != 'terminal' OR request.payload_title IS NOT NULL OR request.payload_text IS NOT NULL)
         AND NOT EXISTS (SELECT 1 FROM items WHERE items.id = request.item_id)`,
    )
    .all() as Array<{ item_id: string }>;
  return missing.reduce(
    (total, row) => total + terminalizeNotebookLmExportsForDeletedItem(row.item_id, now, db),
    0,
  );
}

function recoverExpiredNotebookLmLeases(now: number): void {
  const db = getDb();
  const expired = db
    .prepare(
      `SELECT * FROM notebooklm_export_requests
       WHERE state IN ('leased', 'sending') AND lease_until IS NOT NULL AND lease_until <= ?`,
    )
    .all(now) as NotebookLmExportRequestRow[];
  for (const row of expired) {
    const preCreateLeaseExhausted =
      row.state === "leased" &&
      row.phase === "pre_create" &&
      row.lease_epoch >= NOTEBOOKLM_MAX_PRECREATE_LEASES;
    const nextState: NotebookLmRequestState =
      preCreateLeaseExhausted
        ? "retryable_failure"
        : row.state === "sending" || row.phase === "create" || row.phase === "reconcile"
        ? "reconciling"
        : row.phase === "poll"
          ? "processing"
          : "queued";
    const nextPhase: NotebookLmRequestPhase =
      nextState === "reconciling" ? "reconcile" : nextState === "processing" ? "poll" : "pre_create";
    db.prepare(
      `UPDATE notebooklm_export_requests
       SET state = ?, phase = ?, safe_reason = ?, lease_token_hash = NULL,
           lease_until = NULL, next_attempt_at = ?, updated_at = ?, snapshot_purge_at = ?
       WHERE id = ? AND lease_epoch = ? AND lease_until <= ?`,
    ).run(
      nextState,
      nextPhase,
      preCreateLeaseExhausted ? "lease_exhausted" : "lease_expired",
      nextState === "queued" ? now : now + NOTEBOOKLM_RETRY_BACKOFF_MS,
      now,
      nextState === "reconciling"
        ? Math.min(
            row.snapshot_purge_at,
            notebookLmRetentionDeadline(now, NOTEBOOKLM_POST_DISPATCH_RETENTION_MS),
          )
        : row.snapshot_purge_at,
      row.id,
      row.lease_epoch,
      now,
    );
    appendNotebookLmEvent(
      row.id,
      row.connector_id,
      row.lease_epoch,
      preCreateLeaseExhausted ? "lease_exhausted" : "lease_expired",
      row.state,
      nextState,
      preCreateLeaseExhausted ? "lease_exhausted" : "lease_expired",
      now,
    );
  }
}

function hasActiveNotebookLmWork(targetId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 value FROM notebooklm_export_requests
       WHERE target_id = ?
         AND (phase != 'terminal' OR state = 'duplicate_conflict')
       LIMIT 1`,
    )
    .get(targetId) as { value: number } | undefined;
  return Boolean(row);
}

function countOpenCreateRequests(targetId: string, excludeRequestId: string | null = null): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) value FROM notebooklm_export_requests
       WHERE target_id = ?
         AND (? IS NULL OR id != ?)
         AND (
           (
             phase = 'pre_create' AND create_dispatched_at IS NULL
             AND state IN (
               'queued', 'leased', 'authentication_attention', 'retryable_failure',
               'target_attention', 'capacity_blocked', 'connector_update_required'
             )
           )
           OR (
             create_dispatched_at IS NOT NULL AND source_alias IS NULL
           )
         )`,
    )
    .get(targetId, excludeRequestId, excludeRequestId) as { value: number };
  return row.value;
}

function recordNotebookLmSourceOccupancy(
  targetId: string,
  connectorId: string,
  now: number,
): void {
  getDb()
    .prepare(
      `UPDATE notebooklm_targets
       SET source_count = MIN(source_limit, COALESCE(source_count, 0) + 1),
           health_status = 'healthy', health_reason = NULL, verified_at = ?
       WHERE id = ? AND connector_id = ?`,
    )
    .run(now, targetId, connectorId);
}

function markNotebookLmIdentityConflict(input: {
  connectorId: string;
  targetId: string;
  reason: "multiple_marker_matches" | "provider_source_identity_reused";
  now: number;
  db: ReturnType<typeof getDb>;
}): void {
  input.db
    .prepare(
      `UPDATE notebooklm_targets
       SET health_status = 'attention', health_reason = ?, verified_at = ?
       WHERE id = ? AND connector_id = ?`,
    )
    .run(input.reason, input.now, input.targetId, input.connectorId);
  tripNotebookLmProviderWriteBlock(input);
}

function appendNotebookLmEvent(
  requestId: string,
  connectorId: string | null,
  leaseEpoch: number | null,
  eventType: string,
  fromState: string | null,
  toState: string | null,
  safeReason: string | null,
  now: number,
  db: ReturnType<typeof getDb> = getDb(),
): void {
  db
    .prepare(
      `INSERT INTO notebooklm_export_events
       (request_id, connector_id, lease_epoch, event_type, from_state, to_state, safe_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(requestId, connectorId, leaseEpoch, eventType, fromState, toState, safeReason, now);
}

function createOpaqueMarker(
  secret: string,
  input: {
    targetId: string;
    bindingVersion: number;
    itemId: string;
    mapperVersion: number;
    contentHash: string;
  },
): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update("notebooklm-export-marker-v1\u0000", "utf8")
    .update(JSON.stringify(input), "utf8")
    .digest("base64url")
    .slice(0, 22);
  return `AI-MEM-${digest}`;
}

function requireTransition(
  row: NotebookLmExportRequestRow,
  state: NotebookLmRequestState,
  phase: NotebookLmRequestPhase,
): void {
  if (row.state !== state || row.phase !== phase) {
    throw new NotebookLmExportError("invalid_transition");
  }
}

function requireSourceAlias(value: string | undefined): void {
  if (!value || !/^[a-f0-9]{64}$/.test(value)) {
    throw new NotebookLmExportError("invalid_transition");
  }
}

function requireLiveNotebookLmConnector(connector: NotebookLmConnectorRow): void {
  const current = getDb()
    .prepare(
      `SELECT token_hash, extension_origin, protocol_version, state
       FROM notebooklm_connectors WHERE id = ?`,
    )
    .get(connector.id) as
    | {
        token_hash: string;
        extension_origin: string;
        protocol_version: number;
        state: NotebookLmConnectorRow["state"];
      }
    | undefined;
  if (
    !current ||
    current.state === "revoked" ||
    current.token_hash !== connector.token_hash ||
    current.extension_origin !== connector.extension_origin ||
    current.protocol_version !== connector.protocol_version
  ) {
    throw new NotebookLmExportError("invalid_binding");
  }
}

function notebookLmSourceAliasInUse(
  row: NotebookLmExportRequestRow,
  sourceAlias: string,
): boolean {
  const existing = getDb()
    .prepare(
      `SELECT 1 value FROM notebooklm_export_requests
       WHERE target_id = ? AND source_alias = ? AND id != ? LIMIT 1`,
    )
    .get(row.target_id, sourceAlias, row.id) as { value: number } | undefined;
  return Boolean(existing);
}
