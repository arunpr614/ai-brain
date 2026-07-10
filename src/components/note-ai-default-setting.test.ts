import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { NoteAiDefaultSetting } from "./note-ai-default-setting";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function withDom(run: (document: Document) => Promise<void>) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/settings",
  });
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  try {
    await run(dom.window.document);
  } finally {
    dom.window.close();
    for (const [name, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
}

test("Keep default off persists false when a stored preference is paused", async () => {
  await withDom(async (document) => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (calls.length === 1) {
        return jsonResponse(
          {
            error: "NOTE_AI_CONSENT_REQUIRED",
            providers: [
              {
                fingerprint: "a".repeat(64),
                label: "Remote embeddings",
                purpose: "semantic_index",
              },
            ],
          },
          409,
        );
      }
      return jsonResponse({
        includeInAiByDefault: false,
        effective: false,
        eligible: false,
        providers: [],
      });
    };
    const container = document.getElementById("root")!;
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          createElement(NoteAiDefaultSetting, {
            initialEnabled: true,
            initialEligible: false,
          }),
        );
      });
      const checkbox = document.querySelector("input[type='checkbox']") as HTMLInputElement;
      assert.equal(checkbox.checked, false);
      await act(async () => checkbox.click());
      const keepOff = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Keep default off",
      );
      assert.ok(keepOff);

      await act(async () => keepOff.click());

      assert.deepEqual(calls, [
        {
          url: "/api/settings/note-ai-default",
          body: { includeInAiByDefault: true },
        },
        {
          url: "/api/settings/note-ai-default",
          body: { includeInAiByDefault: false },
        },
      ]);
      assert.match(document.body.textContent ?? "", /excluded from AI & connections by default/);
    } finally {
      await act(async () => root.unmount());
      globalThis.fetch = previousFetch;
    }
  });
});

test("provider approval enables the default only after every acknowledgement succeeds", async () => {
  await withDom(async (document) => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const providers = [
      {
        fingerprint: "a".repeat(64),
        label: "Remote embeddings",
        purpose: "semantic_index",
      },
      {
        fingerprint: "b".repeat(64),
        label: "Remote Ask",
        purpose: "ask",
      },
    ];
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, body });
      if (calls.length === 1) {
        return jsonResponse({ error: "NOTE_AI_CONSENT_REQUIRED", providers }, 409);
      }
      if (url === "/api/settings/note-ai-consent") {
        return jsonResponse({ provider: { ...body, approved: true } });
      }
      return jsonResponse({
        includeInAiByDefault: true,
        effective: true,
        eligible: true,
        providers: [],
      });
    };
    const container = document.getElementById("root")!;
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          createElement(NoteAiDefaultSetting, {
            initialEnabled: false,
            initialEligible: false,
          }),
        );
      });
      const checkbox = document.querySelector("input[type='checkbox']") as HTMLInputElement;
      await act(async () => checkbox.click());
      const allow = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "Allow and enable default",
      );
      assert.ok(allow);

      await act(async () => allow.click());

      assert.deepEqual(calls, [
        {
          url: "/api/settings/note-ai-default",
          body: { includeInAiByDefault: true },
        },
        {
          url: "/api/settings/note-ai-consent",
          body: { fingerprint: providers[0]!.fingerprint, approved: true },
        },
        {
          url: "/api/settings/note-ai-consent",
          body: { fingerprint: providers[1]!.fingerprint, approved: true },
        },
        {
          url: "/api/settings/note-ai-default",
          body: { includeInAiByDefault: true },
        },
      ]);
      assert.equal(checkbox.checked, true);
      assert.match(document.body.textContent ?? "", /Provider permission saved/);
    } finally {
      await act(async () => root.unmount());
      globalThis.fetch = previousFetch;
    }
  });
});
