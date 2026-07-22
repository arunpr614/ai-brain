import assert from "node:assert/strict";
import { before, test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { ExportStatusDto } from "./notebooklm-export";

// Radix selects its layout-effect implementation when the module is loaded.
// Give that import a real document, then let each interaction test install its
// own isolated DOM before rendering.
const bootstrapDom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const bootstrapGlobals = ["window", "document", "navigator", "self"] as const;
const bootstrapPrevious = new Map(
  bootstrapGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
);
for (const [name, value] of [
  ["window", bootstrapDom.window],
  ["document", bootstrapDom.window.document],
  ["navigator", bootstrapDom.window.navigator],
  ["self", bootstrapDom.window],
] as const) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
let buildNotebookLmExportView!: typeof import("./notebooklm-export")["buildNotebookLmExportView"];
let NotebookLmExport!: typeof import("./notebooklm-export")["NotebookLmExport"];
let restoreNotebookLmDialogFocus!: typeof import("./notebooklm-export")["restoreNotebookLmDialogFocus"];
let shouldUseAssertiveNotebookLmStatus!: typeof import("./notebooklm-export")["shouldUseAssertiveNotebookLmStatus"];

before(async () => {
  const exportModule = await import("./notebooklm-export");
  buildNotebookLmExportView = exportModule.buildNotebookLmExportView;
  NotebookLmExport = exportModule.NotebookLmExport;
  restoreNotebookLmDialogFocus = exportModule.restoreNotebookLmDialogFocus;
  shouldUseAssertiveNotebookLmStatus = exportModule.shouldUseAssertiveNotebookLmStatus;
  for (const [name, descriptor] of bootstrapPrevious) restoreGlobal(name, descriptor);
  bootstrapDom.window.close();
});

function status(overrides: Partial<ExportStatusDto> = {}): ExportStatusDto {
  const base: ExportStatusDto = {
    feature: {
      queueAccepting: true,
      providerWritesEnabled: true,
      experimental: true,
      runtimeWriteBlocked: false,
      runtimeBlockReason: null,
    },
    destination: {
      configured: true,
      label: "Private NotebookLM target",
      sharingPosture: "private",
      healthStatus: "healthy",
      healthReason: null,
      safeSlots: 20,
      connectorOnline: true,
      lastCheckedAt: "2026-07-22T12:00:00.000Z",
    },
    item: {
      eligible: true,
      ineligibleReason: null,
      requiresLimitedConfirmation: false,
      changedContent: false,
      alreadyExported: false,
      requestMatchesCurrentVersion: false,
      hasUnresolvedDifferentVersion: false,
    },
    request: null,
    idempotencyAcknowledgement: null,
    setupPath: "/settings/notebooklm-export",
    notebookLmUrl: "https://notebooklm.google/",
    disclosure: "Sends a static copy of the saved text.",
  };
  return {
    ...base,
    ...overrides,
    feature: { ...base.feature, ...overrides.feature },
    destination: { ...base.destination, ...overrides.destination },
    item: { ...base.item, ...overrides.item },
  };
}

function request(
  state: NonNullable<ExportStatusDto["request"]>["state"],
  phase: NonNullable<ExportStatusDto["request"]>["phase"] = "terminal",
): NonNullable<ExportStatusDto["request"]> {
  return {
    requestId: "a".repeat(24),
    state,
    phase,
    reason: null,
    canCancel: false,
    canStopChecking: false,
    possiblyDelivered: phase !== "pre_create",
    createdAt: "2026-07-22T12:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
    completedAt: phase === "terminal" ? "2026-07-22T12:00:00.000Z" : null,
  };
}

type ExportUiHarness = {
  document: Document;
  postBodies: Array<Record<string, unknown>>;
  clickButton: (label: string) => Promise<HTMLButtonElement>;
  failNextGet: () => void;
  failNextPost: () => void;
  getCount: () => number;
  setServerStatus: (next: ExportStatusDto) => void;
  tick: () => Promise<void>;
};

async function withExportUi(
  initialStatus: ExportStatusDto,
  run: (harness: ExportUiHarness) => Promise<void>,
): Promise<void> {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/items/aaaaaaaaaaaaaaaaaaaaaaaa",
    pretendToBeVisual: true,
  });
  const globalNames = [
    "window",
    "document",
    "navigator",
    "self",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLButtonElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement",
    "Element",
    "Node",
    "NodeFilter",
    "CustomEvent",
    "Event",
    "MouseEvent",
    "MutationObserver",
    "getComputedStyle",
    "IS_REACT_ACT_ENVIRONMENT",
  ] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>(
    globalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  const previousFetch = globalThis.fetch;
  const installGlobal = (name: string, value: unknown) => {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  };
  installGlobal("window", dom.window);
  installGlobal("document", dom.window.document);
  installGlobal("navigator", dom.window.navigator);
  installGlobal("self", dom.window);
  installGlobal("HTMLElement", dom.window.HTMLElement);
  installGlobal("HTMLInputElement", dom.window.HTMLInputElement);
  installGlobal("HTMLButtonElement", dom.window.HTMLButtonElement);
  installGlobal("HTMLSelectElement", dom.window.HTMLSelectElement);
  installGlobal("HTMLTextAreaElement", dom.window.HTMLTextAreaElement);
  installGlobal("Element", dom.window.Element);
  installGlobal("Node", dom.window.Node);
  installGlobal("NodeFilter", dom.window.NodeFilter);
  installGlobal("CustomEvent", dom.window.CustomEvent);
  installGlobal("Event", dom.window.Event);
  installGlobal("MouseEvent", dom.window.MouseEvent);
  installGlobal("MutationObserver", dom.window.MutationObserver);
  installGlobal("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
  installGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  dom.window.setInterval = (() => 1) as typeof dom.window.setInterval;
  dom.window.clearInterval = (() => undefined) as typeof dom.window.clearInterval;

  let currentStatus = initialStatus;
  const postBodies: Array<Record<string, unknown>> = [];
  let getCount = 0;
  let shouldFailNextGet = false;
  let shouldFailNextPost = false;
  globalThis.fetch = async (_input, init) => {
    const method = init?.method ?? "GET";
    if (method === "PATCH") {
      return Response.json({ recorded: true });
    }
    if (method === "POST") {
      postBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (shouldFailNextPost) {
        shouldFailNextPost = false;
        throw new Error("synthetic_post_failure");
      }
      const nextRequest = request("queued", "pre_create");
      currentStatus = { ...currentStatus, request: nextRequest };
      return Response.json({ request: nextRequest });
    }
    getCount += 1;
    if (shouldFailNextGet) {
      shouldFailNextGet = false;
      throw new Error("synthetic_get_failure");
    }
    return Response.json(currentStatus);
  };

  const root = createRoot(dom.window.document.getElementById("root")!);
  const tick = async () => {
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  };
  const findButton = (label: string): HTMLButtonElement => {
    const button = Array.from(dom.window.document.querySelectorAll("button"))
      .find((candidate) => candidate.textContent?.trim() === label);
    assert.ok(
      button,
      `button not found: ${label}; available: ${Array.from(dom.window.document.querySelectorAll("button")).map((candidate) => candidate.textContent?.trim()).join(" | ")}`,
    );
    return button as HTMLButtonElement;
  };
  const clickButton = async (label: string) => {
    const button = findButton(label);
    await act(async () => button.click());
    await tick();
    return button;
  };

  try {
    await act(async () => root.render(createElement(NotebookLmExport, {
      itemId: "a".repeat(24),
      payloadPreview: "Full title\n\nSaved body",
    })));
    await tick();
    await run({
      document: dom.window.document,
      postBodies,
      clickButton,
      failNextGet: () => {
        shouldFailNextGet = true;
      },
      failNextPost: () => {
        shouldFailNextPost = true;
      },
      getCount: () => getCount,
      setServerStatus: (next) => {
        currentStatus = next;
      },
      tick,
    });
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = previousFetch;
    dom.window.close();
    for (const [name, descriptor] of previous) restoreGlobal(name, descriptor);
  }
}

test("matching ready request is shown before generic already-exported state", () => {
  const view = buildNotebookLmExportView(status({
    item: {
      eligible: true,
      ineligibleReason: null,
      requiresLimitedConfirmation: false,
      changedContent: false,
      alreadyExported: true,
      requestMatchesCurrentVersion: true,
      hasUnresolvedDifferentVersion: false,
    },
    request: request("ready"),
  }), null, null);

  assert.equal(view.title, "Ready in Private NotebookLM target");
  assert.equal(view.action, "Exported");
});

test("a later cancelled version cannot mask an exact already-exported current version", () => {
  const view = buildNotebookLmExportView(status({
    item: {
      eligible: true,
      ineligibleReason: null,
      requiresLimitedConfirmation: false,
      changedContent: false,
      alreadyExported: true,
      requestMatchesCurrentVersion: false,
      hasUnresolvedDifferentVersion: false,
    },
    request: request("cancelled"),
  }), null, null);

  assert.equal(view.title, "Already exported");
  assert.equal(view.action, "Already exported");
});

test("terminal safety failure takes precedence over changed-content confirmation", () => {
  const current = status({
    item: {
      eligible: true,
      ineligibleReason: null,
      requiresLimitedConfirmation: false,
      changedContent: true,
      alreadyExported: false,
      requestMatchesCurrentVersion: false,
      hasUnresolvedDifferentVersion: false,
    },
    request: request("processing_failed"),
  });
  const view = buildNotebookLmExportView(current, null, null);

  assert.equal(view.title, "NotebookLM could not process this source");
  assert.equal(view.tone, "danger");
  assert.equal(shouldUseAssertiveNotebookLmStatus(current, null, null), true);
});

test("provider-write rollout stage is truthful and disables new exports", () => {
  const view = buildNotebookLmExportView(status({
    feature: {
      queueAccepting: true,
      providerWritesEnabled: false,
      experimental: true,
      runtimeWriteBlocked: false,
      runtimeBlockReason: null,
    },
    item: {
      eligible: true,
      ineligibleReason: null,
      requiresLimitedConfirmation: false,
      changedContent: true,
      alreadyExported: false,
      requestMatchesCurrentVersion: false,
      hasUnresolvedDifferentVersion: false,
    },
  }), null, null);

  assert.equal(view.title, "Provider writes are off");
  assert.equal(view.action, "Provider writes off");
  assert.equal(view.actionDisabled, true);
});

test("queued and reconciling progress are polite while actionable safety failures are assertive", () => {
  const queued = status({ request: request("queued", "pre_create") });
  const reconciling = status({ request: request("reconciling", "reconcile") });
  const unsafeTarget = status({
    destination: {
      configured: true,
      label: "Private NotebookLM target",
      sharingPosture: "shared",
      healthStatus: "attention",
      healthReason: "shared",
      safeSlots: 20,
      connectorOnline: true,
      lastCheckedAt: "2026-07-22T12:00:00.000Z",
    },
  });

  assert.equal(shouldUseAssertiveNotebookLmStatus(queued, null, null), false);
  assert.equal(shouldUseAssertiveNotebookLmStatus(reconciling, null, null), false);
  assert.equal(shouldUseAssertiveNotebookLmStatus(unsafeTarget, null, null), true);
});

test("normal export is one click and sends no confirmation overrides", async () => {
  await withExportUi(status(), async ({ clickButton, postBodies }) => {
    await clickButton("Export to NotebookLM");
    assert.equal(postBodies.length, 1);
    assert.equal(typeof postBodies[0].idempotencyKey, "string");
    assert.equal(postBodies[0].confirmLimitedCapture, undefined);
    assert.equal(postBodies[0].confirmUpdatedVersion, undefined);
  });
});

test("post-dispatch poll failure offers only status checking and never posts a new key", async () => {
  await withExportUi(
    status({ request: request("processing", "poll") }),
    async ({ document, postBodies, clickButton, failNextGet, getCount, tick }) => {
      const initialGetCount = getCount();
      failNextGet();
      await act(async () => {
        document.defaultView?.dispatchEvent(new document.defaultView.Event("online"));
      });
      await tick();

      const actionLabels = Array.from(document.querySelectorAll("button"))
        .map((button) => button.textContent?.trim());
      assert.equal(actionLabels.includes("Retry safely"), false);
      assert.equal(actionLabels.filter((label) => label === "Check again").length, 1);
      assert.equal(getCount(), initialGetCount + 1);

      await clickButton("Check again");
      assert.equal(getCount(), initialGetCount + 2);
      assert.equal(postBodies.length, 0);
    },
  );
});

test("browser-unknown acceptance retries only the original idempotency key", async () => {
  await withExportUi(
    status(),
    async ({ postBodies, clickButton, failNextGet, failNextPost }) => {
      failNextPost();
      failNextGet();
      await clickButton("Export to NotebookLM");

      assert.equal(postBodies.length, 1);
      const originalKey = postBodies[0].idempotencyKey;
      assert.equal(typeof originalKey, "string");

      await clickButton("Retry safely");
      assert.equal(postBodies.length, 2);
      assert.equal(postBodies[1].idempotencyKey, originalKey);
    },
  );
});

test("absent acknowledgement with a possibly-delivered fallback is check-only", async () => {
  await withExportUi(
    status(),
    async ({
      document,
      postBodies,
      clickButton,
      failNextPost,
      setServerStatus,
    }) => {
      setServerStatus(status({
        request: request("processing", "poll"),
        idempotencyAcknowledgement: "absent",
      }));
      failNextPost();
      await clickButton("Export to NotebookLM");

      assert.equal(postBodies.length, 1);
      const actionLabels = Array.from(document.querySelectorAll("button"))
        .map((button) => button.textContent?.trim());
      assert.equal(actionLabels.includes("Retry safely"), false);
      assert.equal(actionLabels.filter((label) => label === "Check again").length, 1);

      await clickButton("Check again");
      assert.equal(postBodies.length, 1);
    },
  );
});

test("known pre-dispatch request without the original key is also check-only offline", async () => {
  await withExportUi(
    status({ request: request("queued", "pre_create") }),
    async ({ document, postBodies, clickButton, tick }) => {
      await act(async () => {
        document.defaultView?.dispatchEvent(new document.defaultView.Event("offline"));
      });
      await tick();

      assert.match(document.body.textContent ?? "", /You’re offline/);
      const actionLabels = Array.from(document.querySelectorAll("button"))
        .map((button) => button.textContent?.trim());
      assert.equal(actionLabels.includes("Retry safely"), false);
      assert.equal(actionLabels.filter((label) => label === "Check again").length, 1);

      await clickButton("Check again");
      assert.equal(postBodies.length, 0);
    },
  );
});

test("limited capture requires its checkbox and sends the explicit confirmation", async () => {
  await withExportUi(status({ item: { requiresLimitedConfirmation: true } as ExportStatusDto["item"] }), async ({ document, clickButton, postBodies, tick }) => {
    await clickButton("Review and export");
    const confirm = Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Export limited text") as HTMLButtonElement;
    assert.ok(confirm);
    assert.equal(confirm.disabled, true);
    const checkbox = document.querySelector("input[type='checkbox']") as HTMLInputElement;
    assert.ok(checkbox);
    await act(async () => checkbox.click());
    await tick();
    assert.equal(confirm.disabled, false);
    await clickButton("Export limited text");
    assert.equal(postBodies[0].confirmLimitedCapture, true);
    assert.equal(postBodies[0].confirmUpdatedVersion, undefined);
  });
});

test("changed content confirmation sends only the updated-version flag", async () => {
  await withExportUi(status({ item: { changedContent: true } as ExportStatusDto["item"] }), async ({ clickButton, postBodies }) => {
    await clickButton("Export updated version");
    await clickButton("Create new source");
    assert.equal(postBodies[0].confirmUpdatedVersion, true);
    assert.equal(postBodies[0].confirmLimitedCapture, undefined);
  });
});

test("limited and changed content require both confirmations before one request", async () => {
  await withExportUi(status({
    item: {
      requiresLimitedConfirmation: true,
      changedContent: true,
    } as ExportStatusDto["item"],
  }), async ({ document, clickButton, postBodies, tick }) => {
    await clickButton("Export updated version");
    const checkbox = document.querySelector("input[type='checkbox']") as HTMLInputElement;
    assert.ok(checkbox);
    await act(async () => checkbox.click());
    await tick();
    await clickButton("Export limited text");
    await clickButton("Create new source");
    assert.equal(postBodies.length, 1);
    assert.equal(postBodies[0].confirmLimitedCapture, true);
    assert.equal(postBodies[0].confirmUpdatedVersion, true);
  });
});

test("dialog close focus policy prevents Radix fallback and restores the connected trigger", () => {
  let prevented = false;
  let focused = false;
  restoreNotebookLmDialogFocus(
    { preventDefault: () => { prevented = true; } },
    {
      isConnected: true,
      disabled: false,
      focus: () => { focused = true; },
    } as HTMLButtonElement,
  );
  assert.equal(prevented, true);
  assert.equal(focused, true);
});

test("item export view records one best-effort view event per component mount", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/items/aaaaaaaaaaaaaaaaaaaaaaaa",
    pretendToBeVisual: true,
  });
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    self: Object.getOwnPropertyDescriptor(globalThis, "self"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
    fetch: globalThis.fetch,
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "self", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  dom.window.setInterval = (() => 1) as typeof dom.window.setInterval;
  dom.window.clearInterval = (() => undefined) as typeof dom.window.clearInterval;
  const calls: Array<{ method: string; body: unknown }> = [];
  globalThis.fetch = async (_input, init) => {
    const method = init?.method ?? "GET";
    calls.push({ method, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(
      JSON.stringify(method === "PATCH" ? { recorded: true } : status()),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const root = createRoot(dom.window.document.getElementById("root")!);

  try {
    try {
      await act(async () => root.render(createElement(NotebookLmExport, {
        itemId: "a".repeat(24),
        payloadPreview: "Title\n\nSaved body",
      })));
    } catch (error) {
      throw new Error(`initial render failed: ${aggregateMessage(error)}`);
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    await act(async () => root.render(createElement(NotebookLmExport, {
      itemId: "a".repeat(24),
      payloadPreview: "Title\n\nSaved body",
    })));

    assert.equal(calls.filter((call) => call.method === "PATCH").length, 1);
    assert.deepEqual(calls.find((call) => call.method === "PATCH")?.body, {
      event: "export_viewed",
    });
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = previous.fetch;
    dom.window.close();
    restoreGlobal("window", previous.window);
    restoreGlobal("document", previous.document);
    restoreGlobal("navigator", previous.navigator);
    restoreGlobal("self", previous.self);
    restoreGlobal("IS_REACT_ACT_ENVIRONMENT", previous.act);
  }
});

function aggregateMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors
      .map((nested) => nested instanceof Error ? nested.stack ?? nested.message : String(nested))
      .join(" | ");
  }
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

function restoreGlobal(name: string, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor);
  else Reflect.deleteProperty(globalThis, name);
}
