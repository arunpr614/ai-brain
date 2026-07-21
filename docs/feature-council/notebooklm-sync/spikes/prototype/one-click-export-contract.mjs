import { createHmac, randomUUID } from "node:crypto";

import { sanitizePublicUrl, sha256 } from "./sync-model.mjs";

export const ONE_CLICK_MAPPING_VERSION = "one-click-text-v1";

const WEAK_CAPTURE_QUALITIES = new Set(["metadata_only", "paywall_preview", "failed"]);
const TERMINAL_STATES = new Set([
  "succeeded",
  "terminal_error",
  "conflict",
]);

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

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

function operationMarker({ mappingKey, targetBindingId, itemId, payloadHash }) {
  const input = [
    "ai-brain:notebooklm-export:v1",
    targetBindingId,
    itemId,
    payloadHash,
    ONE_CLICK_MAPPING_VERSION,
  ].join("\u0000");
  const digest = createHmac("sha256", mappingKey).update(input).digest("base64url").slice(0, 27);
  return `abx1_${digest}`;
}

function displayTitle(title, marker) {
  const clean = normalizeText(title).replace(/\s+/g, " ");
  const bounded = clean.slice(0, 180).trim();
  return `${bounded} [${marker}]`;
}

/**
 * Build the immutable, minimized copied-text source used by the one-click flow.
 * The caller supplies a server-only mapping key and a server-resolved target.
 */
export function prepareOneClickSnapshot(
  item,
  { mappingKey, targetBindingId, allowWeakCapture = false },
) {
  if (!mappingKey || !targetBindingId) throw new Error("server mapping context is required");
  if (!item || typeof item.id !== "string" || !item.id) {
    return { eligible: false, reason: "item_unavailable" };
  }

  const title = normalizeText(item.title);
  const body = normalizeText(item.body);
  if (!title) return { eligible: false, reason: "title_unavailable" };
  if (!body) return { eligible: false, reason: "text_unavailable" };
  if (WEAK_CAPTURE_QUALITIES.has(item.captureQuality) && !allowWeakCapture) {
    return { eligible: false, reason: "confirmation_required_for_weak_capture" };
  }

  const publicUrl = sanitizePublicUrl(item.sourceUrl);
  const canonical = {
    mappingVersion: ONE_CLICK_MAPPING_VERSION,
    title,
    author: normalizeText(item.author) || null,
    publishedAt: normalizeText(item.publishedAt) || null,
    publicUrl,
    body,
  };
  const payloadHash = sha256(stableJson(canonical));
  const marker = operationMarker({
    mappingKey,
    targetBindingId,
    itemId: item.id,
    payloadHash,
  });

  const lines = [`# ${title}`];
  if (canonical.author) lines.push(`Author: ${canonical.author}`);
  if (canonical.publishedAt) lines.push(`Published: ${canonical.publishedAt}`);
  if (publicUrl) lines.push(`Public source: ${publicUrl}`);
  lines.push("", body);

  return {
    eligible: true,
    reason: null,
    marker,
    payloadHash,
    providerTitle: displayTitle(title, marker),
    providerContent: lines.join("\n"),
    mappingVersion: ONE_CLICK_MAPPING_VERSION,
  };
}

export class ProviderFault extends Error {
  constructor(kind) {
    super(kind);
    this.name = "ProviderFault";
    this.kind = kind;
  }
}

/**
 * Credential-free model of the narrow server/worker boundary. It intentionally
 * stores the server-resolved notebook id but never returns it to the browser.
 */
export class OneClickExportCoordinator {
  constructor({ targetBinding, mappingKey, now = () => Date.now() }) {
    if (
      !targetBinding?.enabled ||
      typeof targetBinding.bindingId !== "string" ||
      !targetBinding.bindingId ||
      typeof targetBinding.notebookId !== "string" ||
      !targetBinding.notebookId
    ) {
      throw new Error("target is not configured");
    }
    this.targetBinding = structuredClone(targetBinding);
    this.mappingKey = mappingKey;
    this.now = now;
    this.requests = new Map();
    this.byIdempotencyKey = new Map();
    this.byLogicalExport = new Map();
    this.events = [];
  }

  enqueue({ item, idempotencyKey, confirmLimitedCapture = false }) {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey ?? "")) {
      throw new Error("invalid idempotency key");
    }
    const existingByClick = this.byIdempotencyKey.get(idempotencyKey);
    if (existingByClick) return this.publicStatus(existingByClick, true);

    const snapshot = prepareOneClickSnapshot(item, {
      mappingKey: this.mappingKey,
      targetBindingId: this.targetBinding.bindingId,
      allowWeakCapture: confirmLimitedCapture === true,
    });
    if (!snapshot.eligible) {
      return {
        requestId: null,
        state: "blocked",
        reason: snapshot.reason,
        deduplicated: false,
        observedAt: this.now(),
      };
    }

    const logicalKey = [
      this.targetBinding.bindingId,
      item.id,
      snapshot.payloadHash,
      snapshot.mappingVersion,
    ].join(":");
    const existingLogical = this.byLogicalExport.get(logicalKey);
    if (existingLogical) {
      this.byIdempotencyKey.set(idempotencyKey, existingLogical);
      return this.publicStatus(existingLogical, true);
    }

    const requestId = randomUUID();
    const request = {
      requestId,
      itemId: item.id,
      targetBindingId: this.targetBinding.bindingId,
      notebookId: this.targetBinding.notebookId,
      snapshot: structuredClone(snapshot),
      state: "queued",
      sourceId: null,
      attempts: 0,
      lastErrorCode: null,
      resumePhase: null,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.requests.set(requestId, request);
    this.byIdempotencyKey.set(idempotencyKey, requestId);
    this.byLogicalExport.set(logicalKey, requestId);
    this.record(request, "queued");
    return this.publicStatus(requestId, false);
  }

  async process(requestId, adapter) {
    const request = this.requireRequest(requestId);
    if (TERMINAL_STATES.has(request.state)) return this.publicStatus(requestId, true);
    if (request.state === "authentication_attention") return this.publicStatus(requestId, true);
    if (request.state === "reconciling") return this.reconcile(requestId, adapter);
    if (request.state === "processing") return this.poll(requestId, adapter);
    if (request.state !== "queued" && request.state !== "retryable_error") {
      return this.publicStatus(requestId, true);
    }

    request.state = "running";
    request.attempts += 1;
    request.updatedAt = this.now();
    this.record(request, "provider_write_started");

    try {
      const source = await adapter.addText({
        notebookId: request.notebookId,
        title: request.snapshot.providerTitle,
        content: request.snapshot.providerContent,
      });
      request.sourceId = source.id;
      request.state = "processing";
      request.updatedAt = this.now();
      this.record(request, "provider_write_acknowledged");
      return this.poll(requestId, adapter);
    } catch (error) {
      const kind = providerFaultKind(error, "unknown_outcome");
      if (kind === "authentication_before_send") {
        return this.authenticationAttention(request, "create", kind);
      }
      if (isAuthenticationFault(kind)) {
        return this.authenticationAttention(request, "reconcile", "authentication_unknown_outcome");
      }
      if (kind === "confirmed_not_sent") request.state = "retryable_error";
      else if (kind === "rejected") request.state = "terminal_error";
      else request.state = "reconciling";
      request.lastErrorCode = kind;
      request.updatedAt = this.now();
      this.record(request, request.state);
      return this.publicStatus(requestId, false);
    }
  }

  async reconcile(requestId, adapter) {
    const request = this.requireRequest(requestId);
    let sources;
    try {
      sources = await adapter.listSources({ notebookId: request.notebookId });
    } catch (error) {
      const kind = providerFaultKind(error, "reconciliation_read_unavailable");
      if (isAuthenticationFault(kind)) {
        return this.authenticationAttention(request, "reconcile", "authentication_required");
      }
      request.state = "reconciling";
      request.lastErrorCode = "reconciliation_read_unavailable";
      request.updatedAt = this.now();
      this.record(request, "reconciliation_read_unavailable");
      return this.publicStatus(requestId, false);
    }
    const matches = sources.filter((source) => source.title?.includes(`[${request.snapshot.marker}]`));
    if (matches.length === 0) {
      request.state = "reconciling";
      request.lastErrorCode = "outcome_still_unknown";
      this.record(request, "reconciliation_inconclusive");
      return this.publicStatus(requestId, false);
    }
    if (matches.length > 1) {
      request.state = "conflict";
      request.lastErrorCode = "multiple_marker_matches";
      this.record(request, "reconciliation_conflict");
      return this.publicStatus(requestId, false);
    }
    request.sourceId = matches[0].id;
    request.state = "processing";
    request.updatedAt = this.now();
    this.record(request, "reconciliation_found_source");
    return this.poll(requestId, adapter);
  }

  async poll(requestId, adapter) {
    const request = this.requireRequest(requestId);
    let source;
    try {
      source = await adapter.getSource({
        notebookId: request.notebookId,
        sourceId: request.sourceId,
      });
    } catch (error) {
      const kind = providerFaultKind(error, "status_read_unavailable");
      if (isAuthenticationFault(kind)) {
        return this.authenticationAttention(request, "poll", "authentication_required");
      }
      request.state = "processing";
      request.lastErrorCode = "status_read_unavailable";
      request.updatedAt = this.now();
      this.record(request, "status_read_unavailable");
      return this.publicStatus(requestId, false);
    }
    if (!source || source.status === "processing") {
      request.state = "processing";
      this.record(request, "provider_processing");
    } else if (source.status === "ready") {
      request.state = "succeeded";
      request.lastErrorCode = null;
      this.record(request, "provider_ready");
    } else {
      request.state = "terminal_error";
      request.lastErrorCode = "provider_processing_failed";
      this.record(request, "provider_processing_failed");
    }
    request.updatedAt = this.now();
    return this.publicStatus(requestId, false);
  }

  resumeAfterAuthentication(requestId) {
    const request = this.requireRequest(requestId);
    if (request.state !== "authentication_attention") return this.publicStatus(requestId, true);
    if (request.resumePhase === "create") request.state = "queued";
    else if (request.resumePhase === "reconcile") request.state = "reconciling";
    else if (request.resumePhase === "poll") request.state = "processing";
    else throw new Error("authentication resume phase is unavailable");
    request.resumePhase = null;
    request.lastErrorCode = null;
    request.updatedAt = this.now();
    this.record(request, "authentication_resumed");
    return this.publicStatus(requestId, false);
  }

  authenticationAttention(request, resumePhase, errorCode) {
    request.state = "authentication_attention";
    request.resumePhase = resumePhase;
    request.lastErrorCode = errorCode;
    request.updatedAt = this.now();
    this.record(request, "authentication_attention");
    return this.publicStatus(request.requestId, false);
  }

  publicStatus(requestId, deduplicated = false) {
    const request = this.requireRequest(requestId);
    const safe = {
      requestId: request.requestId,
      state: request.state,
      deduplicated,
      observedAt: this.now(),
    };
    if (request.state === "authentication_attention") safe.action = "reconnect";
    if (request.state === "reconciling") safe.action = "checking_result";
    return safe;
  }

  record(request, event) {
    this.events.push({
      requestId: request.requestId,
      event,
      state: request.state,
      observedAt: this.now(),
    });
  }

  requireRequest(requestId) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("request not found");
    return request;
  }
}

function providerFaultKind(error, fallback) {
  return error instanceof ProviderFault ? error.kind : fallback;
}

function isAuthenticationFault(kind) {
  return kind === "authentication" || kind.startsWith("authentication_");
}

export class FakeNotebookLmAdapter {
  constructor({ mode = "success", listFault = null, getFault = null } = {}) {
    this.mode = mode;
    this.listFault = listFault;
    this.getFault = getFault;
    this.sources = [];
    this.writeCalls = 0;
    this.nextId = 1;
  }

  async addText({ notebookId, title, content }) {
    this.writeCalls += 1;
    if (this.mode === "authentication_before_send") {
      throw new ProviderFault("authentication_before_send");
    }
    if (this.mode === "confirmed_not_sent") throw new ProviderFault("confirmed_not_sent");
    if (this.mode === "rejected") throw new ProviderFault("rejected");

    const source = {
      id: `source-${this.nextId++}`,
      notebookId,
      title,
      content,
      status: this.mode === "processing" ? "processing" : "ready",
    };
    this.sources.push(source);
    if (this.mode === "accepted_response_lost") throw new ProviderFault("unknown_outcome");
    if (this.mode === "authentication_unknown_outcome") {
      throw new ProviderFault("authentication_unknown_outcome");
    }
    return structuredClone(source);
  }

  async listSources({ notebookId }) {
    if (this.listFault) throw new ProviderFault(this.listFault);
    return structuredClone(this.sources.filter((source) => source.notebookId === notebookId));
  }

  async getSource({ notebookId, sourceId }) {
    if (this.getFault) throw new ProviderFault(this.getFault);
    const source = this.sources.find(
      (candidate) => candidate.notebookId === notebookId && candidate.id === sourceId,
    );
    return source ? structuredClone(source) : null;
  }

  markReady(sourceId) {
    const source = this.sources.find((candidate) => candidate.id === sourceId);
    if (source) source.status = "ready";
  }
}
