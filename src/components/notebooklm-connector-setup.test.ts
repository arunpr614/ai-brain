import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NotebookLmConnectorSetup,
  notebookLmDisconnectPayload,
  type NotebookLmSettingsStatus,
  sharingPostureLabel,
  targetHealthDetail,
} from "./notebooklm-connector-setup";

function settingsStatus(
  connection: Partial<NotebookLmSettingsStatus["connection"]> = {},
  feature: Partial<NotebookLmSettingsStatus["feature"]> = {},
): NotebookLmSettingsStatus {
  return {
    feature: {
      queueAccepting: true,
      queueRequested: true,
      queueAvailable: true,
      masterEnabled: true,
      masterRequested: true,
      masterAvailable: true,
      providerWritesEnabled: true,
      providerWritesRequested: true,
      providerWritesAvailable: true,
      experimental: true,
      runtimeWriteBlocked: false,
      runtimeBlockReason: null,
      protocolFailureStreak: 0,
      retentionHealthy: true,
      retentionLastSuccessAt: "2026-07-22T12:00:00.000Z",
      retentionLastFailureAt: null,
      retentionFailureStreak: 0,
      retentionErrorCode: null,
      physicalPurgePending: false,
      overdueSnapshots: 0,
      unresolvedOver24h: 0,
      ...feature,
    },
    connection: {
      configured: false,
      targetLabel: null,
      sharingPosture: null,
      healthStatus: null,
      healthReason: null,
      safeSourceLimit: null,
      reserveCount: null,
      safeSlots: null,
      connectorOnline: false,
      lastCheckedAt: null,
      ...connection,
    },
  };
}

test("settings render rollout truth, actual posture, health reason, and emergency control", () => {
  const html = renderToStaticMarkup(createElement(NotebookLmConnectorSetup, {
    initialStatus: settingsStatus(
      {
        configured: true,
        targetLabel: "Private NotebookLM target",
        sharingPosture: "shared",
        healthStatus: "attention",
        healthReason: "wrong_target",
        safeSlots: 7,
        connectorOnline: true,
        lastCheckedAt: "2026-07-22T12:00:00.000Z",
      },
      {
        queueAccepting: false,
        providerWritesEnabled: false,
        retentionHealthy: false,
        retentionLastSuccessAt: null,
        retentionFailureStreak: 1,
        retentionErrorCode: "cleanup_failed",
        physicalPurgePending: true,
        overdueSnapshots: 1,
      },
    ),
  }));

  assert.match(html, /Export queue/);
  assert.match(html, /Provider writes/);
  assert.match(html, /NotebookLM master switch/);
  assert.match(html, /Export queue/);
  assert.match(html, /\sOff<\/dd>/);
  assert.match(html, /Disable provider writes/);
  assert.match(html, /Snapshot cleanup needs attention/);
  assert.match(html, /Physical snapshot cleanup is still pending/);
  assert.match(html, /· Shared/);
  assert.match(html, /Destination needs review/);
  assert.match(html, /Emergency revoke/);
  assert.doesNotMatch(html, /cleanup_failed|wrong_target/);
});

test("settings expose an enable control with an explicit confirmation dialog", () => {
  const html = renderToStaticMarkup(createElement(NotebookLmConnectorSetup, {
    initialStatus: settingsStatus(
      {
        configured: true,
        targetLabel: "Private NotebookLM target",
        sharingPosture: "private",
        healthStatus: "healthy",
        connectorOnline: true,
      },
      {
        providerWritesEnabled: false,
        providerWritesRequested: false,
        providerWritesAvailable: true,
      },
    ),
  }));
  assert.match(html, /Provider writes/);
  assert.match(html, /Enable provider writes/);
  assert.doesNotMatch(html, /disabled=""[^>]*>[^<]*Enable provider writes/);
});

test("settings expose independent master and queue enable-disable controls", () => {
  const html = renderToStaticMarkup(createElement(NotebookLmConnectorSetup, {
    initialStatus: settingsStatus(
      {
        configured: true,
        targetLabel: "Private NotebookLM target",
        sharingPosture: "private",
        healthStatus: "healthy",
      },
      {
        masterEnabled: true,
        masterRequested: true,
        queueAccepting: false,
        queueRequested: false,
        queueAvailable: true,
      },
    ),
  }));
  assert.match(html, /Disable master switch/);
  assert.match(html, /Enable export queue/);
  assert.match(html, /Disable provider writes/);
});

test("settings never offer the ordinary reset for restore or identity-conflict stops", () => {
  for (const reason of [
    "restore_reconciliation_required",
    "multiple_marker_matches",
    "provider_source_identity_reused",
  ]) {
    const html = renderToStaticMarkup(createElement(NotebookLmConnectorSetup, {
      initialStatus: settingsStatus(
        {
          configured: true,
          targetLabel: "Private NotebookLM target",
          sharingPosture: "private",
          healthStatus: "healthy",
        },
        {
          queueAccepting: false,
          providerWritesEnabled: false,
          runtimeWriteBlocked: true,
          runtimeBlockReason: reason,
        },
      ),
    }));
    assert.match(html, /Provider writes require dedicated reconciliation/);
    assert.match(html, /ordinary reset is intentionally unavailable/);
    assert.doesNotMatch(html, /Clear after update and revalidation/);
  }

  const protocolDrift = renderToStaticMarkup(createElement(NotebookLmConnectorSetup, {
    initialStatus: settingsStatus(
      {
        configured: true,
        targetLabel: "Private NotebookLM target",
        sharingPosture: "private",
        healthStatus: "healthy",
      },
      {
        queueAccepting: false,
        providerWritesEnabled: false,
        runtimeWriteBlocked: true,
        runtimeBlockReason: "protocol_drift",
      },
    ),
  }));
  assert.match(protocolDrift, /Clear after update and revalidation/);
});

test("safe disconnect and emergency revoke use distinct explicit request bodies", () => {
  assert.deepEqual(notebookLmDisconnectPayload("safe_disconnect"), {
    mode: "safe_disconnect",
  });
  assert.deepEqual(notebookLmDisconnectPayload("emergency_revoke"), {
    mode: "emergency_revoke",
    acknowledgePayloadsPurgedAndSourcesMayExist: true,
  });
  assert.equal(sharingPostureLabel("public"), "Public");
  assert.equal(targetHealthDetail("capacity_unknown", "private"), "Safe source capacity could not be verified.");
});

test("new pairing code is announced politely and receives focus", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/settings/notebooklm-export",
    pretendToBeVisual: true,
  });
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
    fetch: globalThis.fetch,
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  dom.window.setInterval = (() => 1) as typeof dom.window.setInterval;
  dom.window.clearInterval = (() => undefined) as typeof dom.window.clearInterval;
  const calls: Array<{ method: string | undefined; body: unknown }> = [];
  globalThis.fetch = async (_input, init) => {
    calls.push({
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify({
      code: "ABCD-EFGH",
      expiresAt: new Date(Date.now() + 5 * 60 * 1_000).toISOString(),
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const root = createRoot(dom.window.document.getElementById("root")!);

  try {
    await act(async () => root.render(createElement(NotebookLmConnectorSetup, {
      initialStatus: settingsStatus(),
    })));
    const pairButton = [...dom.window.document.querySelectorAll("button")].find(
      (button) => button.textContent?.includes("Pair Chrome connector"),
    );
    assert.ok(pairButton);

    await act(async () => pairButton.click());
    await new Promise<void>((resolve) => dom.window.requestAnimationFrame(() => resolve()));

    const codeRegion = dom.window.document.querySelector('[role="status"][tabindex="-1"]');
    assert.ok(codeRegion);
    assert.equal(codeRegion.getAttribute("aria-live"), "polite");
    assert.equal(dom.window.document.activeElement, codeRegion);
    assert.match(codeRegion.textContent ?? "", /ABCD-EFGH/);
    assert.deepEqual(calls, [{ method: "POST", body: { label: "Chrome connector" } }]);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = previous.fetch;
    dom.window.close();
    restoreGlobal("window", previous.window);
    restoreGlobal("document", previous.document);
    restoreGlobal("navigator", previous.navigator);
    restoreGlobal("IS_REACT_ACT_ENVIRONMENT", previous.act);
  }
});

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}
