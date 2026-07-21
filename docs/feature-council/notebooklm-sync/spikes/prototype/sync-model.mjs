import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";

export const MAPPER_VERSION = "map-v1";
export const TERMINAL_SUCCESS = new Set(["synced", "drive_updated_unverified"]);

export class AmbiguousWriteError extends Error {
  constructor() {
    super("provider outcome is unknown");
    this.name = "AmbiguousWriteError";
    this.code = "ambiguous_write";
  }
}

export class RetryableProviderError extends Error {
  constructor(code = "transient") {
    super("retryable provider failure");
    this.name = "RetryableProviderError";
    this.code = code;
  }
}

export class PermanentProviderError extends Error {
  constructor(code = "invalid_source") {
    super("permanent provider failure");
    this.name = "PermanentProviderError";
    this.code = code;
  }
}

export class SimulatedCrashError extends Error {
  constructor(point) {
    super(`simulated crash at ${point}`);
    this.name = "SimulatedCrashError";
    this.code = "simulated_crash";
    this.point = point;
  }
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function deriveItemMarker({ connectionKey, itemId, contentHash, mapperVersion = MAPPER_VERSION }) {
  const input = ["notebooklm:item:v1", itemId, contentHash, mapperVersion].join("\u0000");
  return `ab1_${createHmac("sha256", connectionKey).update(input).digest("base64url")}`;
}

export function deriveSourceMarker({ connectionKey, targetAlias, strategy, period, orderedItemMarkers }) {
  const input = [
    "notebooklm:source:v1",
    targetAlias,
    strategy,
    period,
    orderedItemMarkers.join("\n"),
  ].join("\u0000");
  return `ab1b_${createHmac("sha256", connectionKey).update(input).digest("base64url")}`;
}

export function sanitizePublicUrl(rawUrl) {
  if (!rawUrl) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) return null;
  if (parsed.username || parsed.password) return null;
  parsed.hash = "";
  const host = parsed.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host) return null;
  parsed.hostname = host;
  const unbracketedHost = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    isIP(unbracketedHost) !== 0 ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return null;
  }
  const isYouTubeHost = host === "youtube.com" || host.endsWith(".youtube.com");
  const videoId = isYouTubeHost
    ? parsed.searchParams.get("v")
    : host === "youtu.be"
      ? parsed.pathname.slice(1)
      : null;
  if (videoId) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (parsed.searchParams.size > 0) return null;
  parsed.search = "";
  return parsed.toString();
}

export function classifySyntheticItem(item) {
  if (item.syncEligible !== true || item.sensitive === true) {
    return { eligible: false, state: "blocked_policy", reason: "not_explicitly_eligible" };
  }
  if (item.attachedNote && item.notebookConsent !== true) {
    return { eligible: false, state: "blocked_policy", reason: "destination_consent_required" };
  }
  if (item.captureSource === "recall" && item.captureQuality !== "full_text") {
    return { eligible: false, state: "blocked_policy", reason: "insufficient_fidelity" };
  }
  if (new Set(["podcast", "epub", "docx"]).has(item.sourceType)) {
    return { eligible: false, state: "unsupported", reason: "schema_only_or_unreachable_type" };
  }
  if (item.sourceType === "telegram") {
    return { eligible: false, state: "unsupported", reason: "legacy_unmapped_type" };
  }
  if (!new Set(["note", "url", "youtube", "pdf"]).has(item.sourceType)) {
    return { eligible: false, state: "unsupported", reason: "unsupported_type" };
  }
  if (typeof item.title !== "string" || !item.title.trim()) {
    return { eligible: false, state: "unsupported", reason: "title_unavailable" };
  }
  if (typeof item.capturedAt !== "number" || !Number.isFinite(item.capturedAt)) {
    return { eligible: false, state: "unsupported", reason: "invalid_captured_at" };
  }
  if (typeof item.body !== "string" || !item.body.trim()) {
    return {
      eligible: false,
      state: "unsupported",
      reason: item.sourceType === "pdf" ? "pdf_text_unavailable" : "text_unavailable",
    };
  }
  return { eligible: true, state: "eligible", reason: null };
}

function mapBlockedDecision(item, options, policy) {
  const decisionHash = sha256(stableJson({ itemId: item.id, state: policy.state, reason: policy.reason }));
  const operationKey = deriveItemMarker({
    connectionKey: options.connectionKey,
    itemId: item.id,
    contentHash: decisionHash,
  });
  return { ...policy, operationKey, marker: operationKey, desiredHash: null, payload: null };
}

export function mapSyntheticItem(item, options) {
  const policy = classifySyntheticItem(item);
  if (!policy.eligible) {
    return mapBlockedDecision(item, options, policy);
  }

  const sourceUrl = sanitizePublicUrl(item.sourceUrl);
  const normalizedBody = normalizeBodyForExport(item);
  if (!normalizedBody.trim()) {
    return mapBlockedDecision(item, options, {
      eligible: false,
      state: "unsupported",
      reason: item.captureSource === "recall" ? "recall_provenance_malformed" : "text_unavailable",
    });
  }
  const canonicalEntry = {
    title: item.title.trim(),
    type: item.sourceType,
    capturedIso: new Date(item.capturedAt).toISOString(),
    quality: item.captureQuality ?? null,
    publicUrl: sourceUrl,
    summary: typeof item.summary === "string" && item.summary.trim()
      ? { label: "AI-generated", text: item.summary.trim() }
      : null,
    body: normalizedBody,
  };
  const desiredHash = sha256(stableJson(canonicalEntry));
  const operationKey = deriveItemMarker({
    connectionKey: options.connectionKey,
    itemId: item.id,
    contentHash: desiredHash,
  });
  const fields = [
    `Marker: ${operationKey}`,
    `# ${canonicalEntry.title}`,
    `Type: ${canonicalEntry.type}`,
    `Captured: ${canonicalEntry.capturedIso}`,
  ];
  if (sourceUrl) fields.push(`Public source: ${sourceUrl}`);
  if (item.captureQuality) fields.push(`Capture quality: ${item.captureQuality}`);
  fields.push("", normalizedBody);
  if (typeof item.summary === "string" && item.summary.trim()) {
    fields.push("", "## AI-generated summary", item.summary.trim());
  }
  const payload = fields.join("\n");
  return {
    eligible: true,
    state: "prepared",
    reason: null,
    operationKey,
    marker: operationKey,
    desiredHash,
    canonicalEntry,
    payload,
    representation:
      options.path === "enterprise" && item.sourceType === "youtube" && sourceUrl
        ? "youtube_or_aggregate_text"
        : "aggregate_text",
  };
}

function normalizeBodyForExport(item) {
  const normalized = item.body.replace(/\r\n?/g, "\n").trimEnd();
  if (item.captureSource !== "recall") return normalized;
  const recallEnvelope = normalized.replace(/^\uFEFF/, "").trimStart();
  if (!recallEnvelope.startsWith("Imported from Recall\n")) return "";
  const separator = "\n\n---\n\n";
  const separatorIndex = recallEnvelope.indexOf(separator);
  return separatorIndex >= 0 ? recallEnvelope.slice(separatorIndex + separator.length).trim() : "";
}

export function createSyncState() {
  return {
    nextOutboxSequence: 1,
    discoveryCursors: {},
    outbox: [],
    syncItems: {},
    attempts: [],
    runs: [],
    leases: {},
    nextFence: {},
    targetStatus: {},
  };
}

export function durableSnapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

export function appendOutboxItem(state, item, occurredAt) {
  const sequence = state.nextOutboxSequence++;
  state.outbox.push({
    sequence,
    item: structuredClone(item),
    eventType: "created",
    occurredAt,
  });
  return sequence;
}

export function discoverOutbox(state, options) {
  const cursor = state.discoveryCursors[options.targetAlias] ?? 0;
  const pending = state.outbox
    .filter((event) => event.sequence > cursor)
    .sort((a, b) => a.sequence - b.sequence);
  for (const event of pending) {
    const mapped = mapSyntheticItem(event.item, options);
    const ledgerKey = `${options.targetAlias}:${mapped.operationKey}`;
    if (!state.syncItems[ledgerKey]) {
      state.syncItems[ledgerKey] = {
        ledgerKey,
        outboxSequence: event.sequence,
        targetAlias: options.targetAlias,
        itemId: event.item.id,
        operationKey: mapped.operationKey,
        marker: mapped.marker,
        desiredHash: mapped.desiredHash,
        payload: mapped.payload,
        representation: mapped.representation ?? null,
        state: mapped.state,
        reason: mapped.reason,
        sourceId: null,
        attemptCount: 0,
        retryCount: 0,
        nextAttemptAt: null,
        errorCode: null,
        lastFence: null,
      };
    }
    state.discoveryCursors[options.targetAlias] = event.sequence;
  }
  return pending.length;
}

export function acquireLease(state, { targetAlias, owner, now, ttlMs = 30_000 }) {
  const current = state.leases[targetAlias];
  if (current && current.expiresAt > now) return null;
  const fence = (state.nextFence[targetAlias] ?? 0) + 1;
  state.nextFence[targetAlias] = fence;
  const lease = { targetAlias, owner, fence, acquiredAt: now, expiresAt: now + ttlMs };
  state.leases[targetAlias] = lease;
  return structuredClone(lease);
}

export function assertCurrentLease(state, lease, now) {
  if (!Number.isFinite(now)) throw new Error("lease_time_required");
  const current = state.leases[lease.targetAlias];
  if (!current || current.owner !== lease.owner || current.fence !== lease.fence || current.expiresAt <= now) {
    throw new Error("stale_fence");
  }
}

export function releaseLease(state, lease, now) {
  assertCurrentLease(state, lease, now);
  delete state.leases[lease.targetAlias];
}

export class FakeProvider {
  constructor() {
    this.sources = [];
    this.calls = [];
    this.outcomes = {};
    this.nextSource = 1;
    this.createHook = null;
  }

  setOutcomes(operationKey, outcomes) {
    this.outcomes[operationKey] = [...outcomes];
  }

  setCreateHook(hook) {
    this.createHook = hook;
  }

  #createAcceptedSource(input, status = "COMPLETE") {
    const source = {
      id: `fake-source-${this.nextSource++}`,
      targetAlias: input.targetAlias,
      marker: input.marker,
      desiredHash: input.desiredHash,
      status,
      deleted: false,
    };
    this.sources.push(source);
    return structuredClone(source);
  }

  create(input) {
    this.calls.push({ method: "create", operationKey: input.operationKey });
    const queue = this.outcomes[input.operationKey] ?? [];
    const outcome = queue.length ? queue.shift() : "success";
    if (outcome === "timeout_before_accept") throw new RetryableProviderError("timeout");
    if (outcome === "permanent_error") throw new PermanentProviderError();
    if (outcome === "accept_then_timeout") {
      this.#createAcceptedSource(input);
      throw new AmbiguousWriteError();
    }
    if (outcome === "pending") {
      const source = this.#createAcceptedSource(input, "PENDING");
      this.createHook?.(structuredClone(source));
      return source;
    }
    const source = this.#createAcceptedSource(input);
    this.createHook?.(structuredClone(source));
    return source;
  }

  findExact({ targetAlias, marker, desiredHash }) {
    this.calls.push({ method: "find", targetAlias, marker, desiredHash });
    return this.sources
      .filter(
        (source) =>
          !source.deleted &&
          source.targetAlias === targetAlias &&
          source.marker === marker &&
          source.desiredHash === desiredHash,
      )
      .map((source) => structuredClone(source));
  }

  get(sourceId) {
    this.calls.push({ method: "get", sourceId });
    const source = this.sources.find((candidate) => candidate.id === sourceId && !candidate.deleted);
    return source ? structuredClone(source) : null;
  }

  setStatus(sourceId, status) {
    const source = this.sources.find((candidate) => candidate.id === sourceId && !candidate.deleted);
    if (!source) throw new Error("source_not_found");
    source.status = status;
  }

  seedDuplicate(input) {
    return this.#createAcceptedSource(input);
  }
}

function rowsForTarget(state, targetAlias) {
  return Object.values(state.syncItems)
    .filter((row) => row.targetAlias === targetAlias)
    .sort((a, b) => a.outboxSequence - b.outboxSequence);
}

function bindProviderResult(state, row, source, path, now, fence) {
  row.sourceId = source.id;
  row.lastFence = fence;
  row.errorCode = null;
  if (path === "drive") {
    row.state = "drive_updated_unverified";
    row.completedAt = now;
    return;
  }
  if (source.status === "COMPLETE") {
    row.state = "synced";
    row.completedAt = now;
  } else if (new Set(["ERROR", "PERMANENTLY_FAILED"]).has(source.status)) {
    row.state = "permanent_failure";
    row.errorCode = "provider_terminal_failure";
  } else {
    row.state = "processing";
  }
}

export function recoverInterruptedWrites(state) {
  let recovered = 0;
  for (const row of Object.values(state.syncItems)) {
    if (row.state === "creating") {
      row.state = "needs_reconcile";
      row.errorCode = "interrupted_write";
      recovered += 1;
    }
  }
  return recovered;
}

export class SyncEngine {
  constructor({ state, provider, connectionKey, targetAlias, strategy, path = "enterprise", maxRetries = 2 }) {
    if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 || maxRetries > 2) {
      throw new Error("invalid_retry_limit");
    }
    this.state = state;
    this.provider = provider;
    this.connectionKey = connectionKey;
    this.targetAlias = targetAlias;
    this.strategy = strategy;
    this.path = path;
    this.maxRetries = maxRetries;
  }

  discover() {
    return discoverOutbox(this.state, {
      connectionKey: this.connectionKey,
      targetAlias: this.targetAlias,
      strategy: this.strategy,
      path: this.path,
    });
  }

  run({ trigger, owner, now, crashPoint = null, crashOperationKey = null }) {
    const lease = acquireLease(this.state, { targetAlias: this.targetAlias, owner, now });
    if (!lease) return { state: "coalesced", trigger, processed: 0 };
    const run = {
      id: `run-${this.state.runs.length + 1}`,
      trigger,
      state: "running",
      startedAt: now,
      completedAt: null,
      processed: 0,
      fence: lease.fence,
    };
    this.state.runs.push(run);
    try {
      this.discover();
      for (const row of rowsForTarget(this.state, this.targetAlias)) {
        assertCurrentLease(this.state, lease, now);
        if (
          new Set([
            "blocked_policy",
            "unsupported",
            "synced",
            "drive_updated_unverified",
            "permanent_failure",
            "blocked_ambiguous",
            "manual_reconcile",
            "auth_required",
            "blocked_capacity",
          ]).has(row.state)
        ) {
          continue;
        }
        if (row.state === "processing") {
          const source = this.provider.get(row.sourceId);
          if (!source) {
            row.state = "needs_reconcile";
            row.errorCode = "source_missing";
          } else {
            bindProviderResult(this.state, row, source, this.path, now, lease.fence);
          }
          continue;
        }
        if (row.state === "needs_reconcile") {
          this.#reconcile(row, now, lease);
          continue;
        }
        if (row.state === "retry_wait" && row.nextAttemptAt > now) continue;
        this.#create(row, { now, lease, crashPoint, crashOperationKey });
        run.processed += 1;
      }

      const unresolved = rowsForTarget(this.state, this.targetAlias).filter((row) =>
        new Set([
          "creating",
          "processing",
          "needs_reconcile",
          "retry_wait",
          "permanent_failure",
          "blocked_ambiguous",
          "manual_reconcile",
        ]).has(row.state),
      );
      run.state = unresolved.length ? "partial_failure" : "done";
      run.completedAt = now;
      if (run.state === "done") {
        const targetStatus = (this.state.targetStatus[this.targetAlias] ??= {
          lastValidatedRunAt: null,
          lastSuccessfulSyncAt: null,
        });
        targetStatus.lastValidatedRunAt = now;
        if (this.path === "enterprise") targetStatus.lastSuccessfulSyncAt = now;
      }
      return structuredClone(run);
    } catch (error) {
      run.state = "interrupted";
      run.completedAt = now;
      throw error;
    } finally {
      if (this.state.leases[this.targetAlias]?.fence === lease.fence) releaseLease(this.state, lease, now);
    }
  }

  #create(row, { now, lease, crashPoint, crashOperationKey }) {
    if (row.retryCount > this.maxRetries) {
      row.state = "permanent_failure";
      row.errorCode = "retry_limit_reached";
      return;
    }
    row.state = "creating";
    row.attemptCount += 1;
    row.lastFence = lease.fence;
    const attempt = {
      operationKey: row.operationKey,
      attempt: row.attemptCount,
      startedAt: now,
      result: "started",
      errorCode: null,
    };
    this.state.attempts.push(attempt);
    if (crashPoint === "before_call" && crashOperationKey === row.operationKey) {
      throw new SimulatedCrashError("before_call");
    }
    try {
      const source = this.provider.create({
        targetAlias: this.targetAlias,
        operationKey: row.operationKey,
        marker: row.marker,
        desiredHash: row.desiredHash,
        payload: row.payload,
      });
      if (crashPoint === "after_response_before_commit" && crashOperationKey === row.operationKey) {
        throw new SimulatedCrashError("after_response_before_commit");
      }
      assertCurrentLease(this.state, lease, now);
      bindProviderResult(this.state, row, source, this.path, now, lease.fence);
      attempt.result = "accepted";
    } catch (error) {
      if (error instanceof SimulatedCrashError) throw error;
      if (error instanceof AmbiguousWriteError) {
        row.state = "needs_reconcile";
        row.errorCode = "ambiguous_write";
        attempt.result = "unknown";
        attempt.errorCode = "ambiguous_write";
        return;
      }
      if (error instanceof RetryableProviderError) {
        row.state = "retry_wait";
        row.retryCount += 1;
        row.nextAttemptAt = now + 1_000;
        row.errorCode = error.code;
        attempt.result = "retryable_failure";
        attempt.errorCode = error.code;
        return;
      }
      if (error instanceof PermanentProviderError) {
        row.state = "permanent_failure";
        row.errorCode = error.code;
        attempt.result = "permanent_failure";
        attempt.errorCode = error.code;
        return;
      }
      throw error;
    }
  }

  #reconcile(row, now, lease) {
    const matches = this.provider.findExact({
      targetAlias: this.targetAlias,
      marker: row.marker,
      desiredHash: row.desiredHash,
    });
    this.state.attempts.push({
      operationKey: row.operationKey,
      attempt: row.attemptCount,
      startedAt: now,
      result: `reconcile_${matches.length}`,
      errorCode: null,
    });
    if (matches.length === 1) {
      bindProviderResult(this.state, row, matches[0], this.path, now, lease.fence);
      return;
    }
    if (matches.length === 0) {
      row.state = "manual_reconcile";
      row.errorCode = "reconcile_zero_not_conclusive";
      return;
    }
    row.state = "blocked_ambiguous";
    row.errorCode = "reconcile_multiple";
  }
}

export function projectSafeStatus(state, targetAlias, path) {
  const rows = rowsForTarget(state, targetAlias);
  const targetStatus = state.targetStatus[targetAlias] ?? {
    lastValidatedRunAt: null,
    lastSuccessfulSyncAt: null,
  };
  const counts = {};
  for (const row of rows) counts[row.state] = (counts[row.state] ?? 0) + 1;
  return {
    targetAlias,
    path,
    lastValidatedRunAt: targetStatus.lastValidatedRunAt,
    lastSuccessfulSyncAt: path === "enterprise" ? targetStatus.lastSuccessfulSyncAt : null,
    terminalLabel:
      path === "drive"
        ? (counts.drive_updated_unverified ?? 0) > 0
          ? "Drive document updated — NotebookLM refresh unverified"
          : null
        : (counts.synced ?? 0) > 0
          ? "NotebookLM source complete"
          : null,
    counts,
  };
}

export function evaluateSyntheticAuth(input) {
  const safe = (state, reason, extras = {}) => ({ state, reason, ...extras });
  let refreshAttempts = 0;
  if (!input.credential || input.credential.state === "missing") return safe("reauth_required", "missing_authorization");
  if (input.credential.state === "revoked") return safe("reauth_required", "invalid_grant");
  if (input.credential.state === "expired") {
    refreshAttempts = 1;
    if (input.refreshOutcome === "valid") {
      input = { ...input, credential: { state: "valid" } };
    } else {
      return safe("reauth_required", "invalid_grant", { refreshAttempts: 1 });
    }
  }
  if (input.subjectAlias !== input.expectedSubjectAlias) return safe("blocked_identity", "subject_mismatch");
  const missingScopes = input.requiredScopes.filter((scope) => !input.grantedScopes.includes(scope));
  if (missingScopes.length) return safe("blocked_permission", "insufficient_scope", { missingScopeCount: missingScopes.length });
  if (input.licenseOk === false) return safe("blocked_permission", "license_required");
  if (input.targetPermissionOk === false) return safe("blocked_permission", "target_permission_required");
  if (input.driveAccessOk === false) return safe("blocked_permission", "drive_access_required");
  if (input.aclDigest !== input.expectedAclDigest) return safe("blocked_identity", "acl_changed");
  return safe("authorized", "ok", { refreshAttempts });
}

export function normalizeProviderError(error) {
  const status = Number(error?.status);
  if (status === 401) return { code: "reauth_required", retryable: false };
  if (status === 403) return { code: "permission_or_license", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status >= 500 && status < 600) return { code: "provider_unavailable", retryable: true };
  return { code: "provider_error", retryable: false };
}

export function modelCapacity(input) {
  const wordBudget = Math.floor(input.wordLimit * input.headroomRatio);
  const charBudget = Math.floor(input.charLimit * input.headroomRatio);
  const wordsPerDay = input.itemsPerDay * input.averageWordsPerItem;
  const charsPerDay = input.itemsPerDay * input.averageCharactersPerItem;
  const maxItemsByWords = Math.floor(wordBudget / input.averageWordsPerItem);
  const maxItemsByCharacters = Math.floor(charBudget / input.averageCharactersPerItem);
  const maxItemsPerSource =
    input.lane === "enterprise"
      ? maxItemsByWords
      : Math.min(maxItemsByWords, maxItemsByCharacters);
  if (maxItemsPerSource < 1) throw new Error("single_item_exceeds_source_budget");
  const rollingFullDays = Math.floor(maxItemsPerSource / input.itemsPerDay);
  const dailyShards = Math.ceil(input.itemsPerDay / maxItemsPerSource);
  const fullWeeks = Math.floor(input.days / 7);
  const remainderDays = input.days % 7;
  const weeklySources =
    fullWeeks * Math.ceil((7 * input.itemsPerDay) / maxItemsPerSource) +
    (remainderDays > 0 ? Math.ceil((remainderDays * input.itemsPerDay) / maxItemsPerSource) : 0);
  const usableSources = Math.max(
    0,
    input.sourceLimit - input.existingSources - input.pendingDeletionSources - input.reservedHeadroom,
  );
  const sources = {
    perItem: input.itemsPerDay * input.days,
    daily: input.days * dailyShards,
    weekly: weeklySources,
    rollingRetained: Math.ceil((input.itemsPerDay * input.days) / maxItemsPerSource),
    rollingActive: input.days > 0 ? 1 : 0,
  };
  return {
    ...input,
    wordBudget,
    charBudget,
    wordsPerDay,
    charsPerDay,
    maxItemsByWords,
    maxItemsByCharacters,
    maxItemsPerSource,
    rollingFullDays,
    dailyShards,
    bindingLimit:
      input.lane === "enterprise" || maxItemsByWords <= maxItemsByCharacters ? "words" : "characters",
    usableSources,
    sources,
    exceeds: Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, value > usableSources])),
    manualRotations: Math.max(0, sources.rollingRetained - 1),
    storageWords: wordsPerDay * input.days,
    storageCharacters: charsPerDay * input.days,
  };
}
