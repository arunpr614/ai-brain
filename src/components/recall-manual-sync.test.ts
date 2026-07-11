import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import type { RecallManualSyncStatus } from "@/lib/recall/manual-sync-contract";
import {
  RecallManualSync,
  canBeginRecallSubmission,
  correlateConfirmedAcceptedRequest,
  monotonicServerNow,
  parseRecallAcceptedResponse,
  pendingAcknowledgementResolved,
  recallStatusLookupHeaders,
  retainConfirmedAcceptedRequest,
} from "./recall-manual-sync";

const observedAt = "2026-07-11T06:30:00.000Z";

function status(overrides: Partial<RecallManualSyncStatus> = {}): RecallManualSyncStatus {
  return {
    enabled: true,
    available: true,
    activity: null,
    lastSuccessfulSyncAt: null,
    nextAutomaticSyncAt: null,
    retryAfterSeconds: 0,
    observedAt,
    idempotencyAcknowledgement: null,
    requestAcknowledgement: null,
    ...overrides,
  };
}

function render(value: RecallManualSyncStatus): string {
  return renderToStaticMarkup(createElement(RecallManualSync, { initialStatus: value }));
}

test("Recall Settings panel renders never-synced and schedule-unavailable truth", () => {
  const html = render(status());
  assert.match(html, /Recall is ready/);
  assert.match(html, /Not yet synced/);
  assert.match(html, /Schedule unavailable/);
  assert.match(html, /min-h-11/);
  assert.match(html, /aria-live="polite"/);
});

test("Recall Settings panel distinguishes queued-behind-automatic and partial cooldown", () => {
  const queued = render(status({
    activity: {
      requestId: "request-one",
      state: "queued_behind_automatic",
      requestedAt: observedAt,
      startedAt: null,
      completedAt: null,
      heartbeatAt: observedAt,
      safeReason: "active",
      counts: null,
    },
  }));
  assert.match(queued, /Waiting for the active sync/);

  const partial = render(status({
    retryAfterSeconds: 272,
    activity: {
      requestId: "request-two",
      state: "partial_failure",
      requestedAt: observedAt,
      startedAt: observedAt,
      completedAt: observedAt,
      heartbeatAt: observedAt,
      safeReason: "internal",
      counts: { imported: 1, upgraded: 0, alreadyCurrent: 2 },
    },
  }));
  const partialCounts = "1 item imported · 2 items already current";
  assert.match(partial, /Sync stopped early/);
  assert.equal(partial.split(partialCounts).length - 1, 1);
  assert.match(partial, /Some changes were saved\. Retrying remains safe\./);
  assert.match(partial, /Try again in 4:32/);
});

test("terminal success renders each aggregate exactly once", () => {
  const html = render(status({
    activity: {
      requestId: "request-complete",
      state: "done",
      requestedAt: observedAt,
      startedAt: observedAt,
      completedAt: observedAt,
      heartbeatAt: observedAt,
      safeReason: null,
      counts: { imported: 1, upgraded: 1, alreadyCurrent: 2 },
    },
  }));
  const successCounts = "1 item imported · 1 item upgraded · 2 items already current";
  assert.match(html, /Sync complete/);
  assert.equal(html.split(successCounts).length - 1, 1);
  assert.match(html, /Recall sync finished successfully\./);
});

test("unknown-write terminal result requires an explicit status check before retry", () => {
  const html = render(status({
    retryAfterSeconds: 120,
    activity: {
      requestId: "request-unknown",
      state: "error",
      requestedAt: observedAt,
      startedAt: observedAt,
      completedAt: observedAt,
      heartbeatAt: observedAt,
      safeReason: "internal",
      counts: null,
    },
  }));
  assert.match(html, /Sync stopped/);
  assert.match(html, />Check again</);
  assert.doesNotMatch(html, /Try again in/);
});

test("automatic executions also receive truthful long-running copy", () => {
  const html = render(status({
    activity: {
      requestId: null,
      state: "running_automatic",
      requestedAt: null,
      startedAt: "2026-07-11T05:00:00.000Z",
      completedAt: null,
      heartbeatAt: observedAt,
      safeReason: "active",
      counts: null,
    },
  }));
  assert.match(html, /This is taking longer than usual/);
});

test("cooldown time advances from the server anchor and monotonic elapsed time only", () => {
  const server = Date.parse(observedAt);
  const originalDateNow = Date.now;
  try {
    Date.now = () => server + 24 * 60 * 60 * 1000;
    assert.equal(monotonicServerNow(server, 100, 5_100), server + 5_000);
    Date.now = () => server - 24 * 60 * 60 * 1000;
    assert.equal(monotonicServerNow(server, 100, 70_100), server + 70_000);
  } finally {
    Date.now = originalDateNow;
  }
});

test("lost-response correlation and double-submit guards stay closed until a bounded acknowledgement", () => {
  const absent = { state: "absent", requestId: null, activityState: null, resolutionAfterMs: 10_000 } as const;
  const active = { state: "active", requestId: "request-one", activityState: "queued", resolutionAfterMs: 10_000 } as const;
  const terminal = { state: "terminal", requestId: "request-one", activityState: "done", resolutionAfterMs: 10_000 } as const;
  assert.equal(pendingAcknowledgementResolved(1_000, 10_999, absent), false);
  assert.equal(pendingAcknowledgementResolved(1_000, 11_000, absent), true);
  assert.equal(pendingAcknowledgementResolved(1_000, 1_001, active), true);
  assert.equal(pendingAcknowledgementResolved(1_000, 1_001, terminal), true);
  assert.equal(canBeginRecallSubmission(false, null), true);
  assert.equal(canBeginRecallSubmission(true, null), false);
  assert.equal(canBeginRecallSubmission(false, "retained-key"), false);
});

test("different-key active dedupe remains confirmed through GET failure and active-to-terminal recovery", () => {
  const accepted = parseRecallAcceptedResponse({
    requestId: "existing-request-a",
    state: "queued",
    deduplicated: true,
    observedAt,
  });
  assert.equal(accepted?.requestId, "existing-request-a");
  assert.equal(canBeginRecallSubmission(false, null, accepted!.requestId), false);
  assert.equal(retainConfirmedAcceptedRequest(accepted!.requestId, null), accepted!.requestId);
  assert.equal(correlateConfirmedAcceptedRequest(accepted!.requestId, status()), "missing");
  const activeStatus = status({
    requestAcknowledgement: {
      state: "active",
      requestId: accepted!.requestId,
      activityState: "queued",
    },
    activity: {
      requestId: accepted!.requestId,
      state: "queued",
      requestedAt: observedAt,
      startedAt: null,
      completedAt: null,
      heartbeatAt: observedAt,
      safeReason: "active",
      counts: null,
    },
  });
  assert.equal(correlateConfirmedAcceptedRequest(accepted!.requestId, activeStatus), "active");
  assert.equal(retainConfirmedAcceptedRequest(accepted!.requestId, activeStatus), accepted!.requestId);
  assert.equal(canBeginRecallSubmission(false, null, accepted!.requestId), false);
  const supersededByActiveB = status({
    requestAcknowledgement: {
      state: "terminal",
      requestId: accepted!.requestId,
      activityState: "done",
    },
    activity: {
      ...activeStatus.activity!,
      requestId: "newer-request-b",
      state: "queued",
    },
  });
  assert.equal(correlateConfirmedAcceptedRequest(accepted!.requestId, supersededByActiveB), "terminal");
  assert.equal(retainConfirmedAcceptedRequest(accepted!.requestId, supersededByActiveB), null);
  assert.match(render(supersededByActiveB), /disabled=""/);
  const supersededByTerminalB = status({
    ...supersededByActiveB,
    activity: {
      ...supersededByActiveB.activity!,
      state: "done",
      completedAt: observedAt,
      counts: { imported: 0, upgraded: 0, alreadyCurrent: 0 },
    },
  });
  assert.equal(correlateConfirmedAcceptedRequest(accepted!.requestId, supersededByTerminalB), "terminal");
  assert.deepEqual(recallStatusLookupHeaders(null, accepted!.requestId), {
    "x-recall-request-id": accepted!.requestId,
  });
  assert.deepEqual(recallStatusLookupHeaders("lost-key", null), {
    "x-recall-idempotency-key": "lost-key",
  });
  assert.equal(canBeginRecallSubmission(false, null, null), true);
  assert.equal(parseRecallAcceptedResponse({ requestId: "existing-request-a", state: "terminal" }), null);
});

test("an idle Settings page refreshes on visibility return and learns automatic activity", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/settings" });
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
    fetch: globalThis.fetch,
  };
  let visibility = "hidden";
  Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, get: () => visibility });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(status({
      activity: {
        requestId: null,
        state: "running_automatic",
        requestedAt: null,
        startedAt: observedAt,
        completedAt: null,
        heartbeatAt: observedAt,
        safeReason: "active",
        counts: null,
      },
    })), { status: 200, headers: { "content-type": "application/json" } });
  };
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    await act(async () => root.render(createElement(RecallManualSync, { initialStatus: status() })));
    assert.equal(calls, 0);
    visibility = "visible";
    await act(async () => {
      dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(calls, 1);
    assert.match(dom.window.document.body.textContent ?? "", /Automatic sync in progress/);
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

test("out-of-order status responses are aborted and cannot overwrite the newest state", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/settings" });
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
    fetch: globalThis.fetch,
  };
  let visibility = "hidden";
  Object.defineProperty(dom.window.document, "visibilityState", { configurable: true, get: () => visibility });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  const responses: Array<(response: Response) => void> = [];
  const signals: AbortSignal[] = [];
  globalThis.fetch = async (_input, init) => {
    if (init?.signal) signals.push(init.signal);
    return new Promise<Response>((resolve) => responses.push(resolve));
  };
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    await act(async () => root.render(createElement(RecallManualSync, { initialStatus: status() })));
    visibility = "visible";
    await act(async () => dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange")));
    await act(async () => dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange")));
    assert.equal(responses.length, 2);
    assert.equal(signals[0].aborted, true);
    await act(async () => {
      responses[1](new Response(JSON.stringify(status({
        activity: {
          requestId: null,
          state: "running_automatic",
          requestedAt: null,
          startedAt: observedAt,
          completedAt: null,
          heartbeatAt: observedAt,
          safeReason: "active",
          counts: null,
        },
      })), { status: 200, headers: { "content-type": "application/json" } }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      responses[0](new Response(JSON.stringify(status()), { status: 200, headers: { "content-type": "application/json" } }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.match(dom.window.document.body.textContent ?? "", /Automatic sync in progress/);
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
