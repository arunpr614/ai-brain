import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { ItemCompanionTabs } from "./item-companion-tabs";

async function withDom(run: (document: Document) => Promise<void>) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/items/example",
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

function StatefulNotes() {
  const [draft, setDraft] = useState("");
  return createElement("input", {
    "aria-label": "Draft note",
    value: draft,
    onChange: (event: { currentTarget: HTMLInputElement }) => setDraft(event.currentTarget.value),
  });
}

test("switching to AI digest keeps the live My notes panel mounted", async () => {
  await withDom(async (document) => {
    const root = createRoot(document.getElementById("root")!);
    try {
      await act(async () => {
        root.render(
          createElement(ItemCompanionTabs, {
            notes: createElement(StatefulNotes),
            digest: createElement("p", null, "Digest content"),
          }),
        );
      });

      const input = document.querySelector<HTMLInputElement>("input[aria-label='Draft note']")!;
      await act(async () => {
        input.value = "Persistent draft";
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
      });
      assert.equal(input.value, "Persistent draft");

      const digest = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "AI digest",
      );
      assert.ok(digest);
      await act(async () => digest.click());
      const hidden = document.querySelector<HTMLInputElement>("input[aria-label='Draft note']");
      assert.equal(hidden, input);

      const notes = [...document.querySelectorAll("button")].find(
        (button) => button.textContent?.trim() === "My notes",
      );
      assert.ok(notes);
      await act(async () => notes.click());

      const restored = document.querySelector<HTMLInputElement>("input[aria-label='Draft note']")!;
      assert.equal(restored.value, "Persistent draft");
      assert.equal(restored, input);
    } finally {
      await act(async () => root.unmount());
    }
  });
});

test("the companion tablist supports the expected arrow-key keyboard pattern", async () => {
  await withDom(async (document) => {
    const container = document.getElementById("root")!;
    const root = createRoot(container);
    try {
      await act(async () => {
        root.render(
          createElement(ItemCompanionTabs, {
            digest: createElement("p", null, "Digest content"),
            notes: createElement("p", null, "Note content"),
          }),
        );
      });

      const notes = document.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')!;
      assert.equal(notes.textContent?.trim(), "My notes");
      assert.equal(notes.tabIndex, 0);

      await act(async () => {
        notes.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
        );
      });

      const digest = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
        (tab) => tab.textContent?.trim() === "AI digest",
      )!;
      assert.equal(digest.getAttribute("aria-selected"), "true");
      assert.equal(digest.tabIndex, 0);
      assert.equal(document.activeElement, digest);
      assert.equal(notes.tabIndex, -1);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
