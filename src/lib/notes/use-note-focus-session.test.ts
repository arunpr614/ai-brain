/* eslint-disable react-hooks/refs -- React 19's rule misreads refs passed through createElement in this non-TSX node:test harness. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { act, createElement, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  readNoteFocusTextareaView,
  useNoteFocusSession,
} from "./use-note-focus-session";

async function withDom(run: (document: Document) => Promise<void>) {
  const dom = new JSDOM(
    "<!doctype html><html><body><aside id='background'><button>Background</button></aside><div id='root'></div></body></html>",
    { url: "http://localhost/items/example?repair=queued", pretendToBeVisual: true },
  );
  const previous = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    document: Object.getOwnPropertyDescriptor(globalThis, "document"),
    navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator"),
    crypto: Object.getOwnPropertyDescriptor(globalThis, "crypto"),
    act: Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: dom.window.crypto });
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(dom.window, "scrollTo", { configurable: true, value: () => undefined });
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

function Harness() {
  const surfaceRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focus = useNoteFocusSession({
    enabled: true,
    ready: true,
    surfaceRef,
    textareaRef,
    headingRef,
    triggerRef,
  });
  return createElement(
    "section",
    {
      ref: surfaceRef,
      role: focus.isFocused ? "dialog" : undefined,
      "aria-modal": focus.isFocused ? "true" : undefined,
    },
    createElement("h2", { ref: headingRef, tabIndex: -1 }, "My notes — Example"),
    createElement("textarea", { ref: textareaRef, "aria-label": "Draft" }),
    focus.isFocused
      ? createElement(
          "button",
          { type: "button", onClick: () => focus.exitFocus("button") },
          "Exit focus",
        )
      : createElement(
          "button",
          {
            ref: triggerRef,
            type: "button",
            onClick: (event: { currentTarget: HTMLButtonElement }) =>
              focus.enterFocus(event.currentTarget),
          },
          "Focus",
        ),
  );
}

test("the textarea view snapshot reads the latest cursor and scroll state", async () => {
  await withDom(async (document) => {
    const textarea = document.createElement("textarea");
    textarea.value = "A persistent Focus draft";
    document.body.append(textarea);
    textarea.setSelectionRange(2, 12, "backward");
    textarea.scrollTop = 37;

    const entry = readNoteFocusTextareaView(textarea, textarea);
    textarea.setSelectionRange(8, 18, "forward");
    textarea.scrollTop = 61;
    const exit = readNoteFocusTextareaView(textarea, document.body);

    assert.deepEqual(entry, {
      wasActive: true,
      selectionStart: 2,
      selectionEnd: 12,
      selectionDirection: "backward",
      scrollTop: 37,
      scrollLeft: 0,
    });
    assert.deepEqual(exit, {
      wasActive: false,
      selectionStart: 8,
      selectionEnd: 18,
      selectionDirection: "forward",
      scrollTop: 61,
      scrollLeft: 0,
    });
  });
});

test("invalid and source-reading note markers normalize without opening Focus", async () => {
  for (const search of [
    "?tab=notes&note_mode=bogus&repair=queued",
    "?tab=notes&mode=focus&note_mode=focus&repair=queued",
  ]) {
    await withDom(async (document) => {
      window.history.replaceState({ __NA: true }, "", `/items/example${search}`);
      const root = createRoot(document.getElementById("root")!);
      try {
        await act(async () => root.render(createElement(Harness)));
        const url = new URL(window.location.href);
        assert.equal(url.searchParams.get("note_mode"), null);
        assert.equal(url.searchParams.get("repair"), "queued");
        assert.equal(document.querySelector("section")?.hasAttribute("role"), false);
        assert.equal(window.history.state.__NA, true);
      } finally {
        await act(async () => root.unmount());
      }
    });
  }
});

test("Focus uses the same textarea and preserves selection, scroll, framework history, and background isolation", async () => {
  await withDom(async (document) => {
    window.history.replaceState({ __NA: true }, "", window.location.href);
    const root = createRoot(document.getElementById("root")!);
    try {
      await act(async () => root.render(createElement(Harness)));
      const textarea = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Draft']")!;
      textarea.value = "A persistent Focus draft";
      textarea.setSelectionRange(2, 12, "backward");
      textarea.scrollTop = 37;

      const focusButton = [...document.querySelectorAll("button")].find(
        (button) => button.textContent === "Focus",
      )!;
      await act(async () => {
        focusButton.click();
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      });

      const focusedTextarea = document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Draft']")!;
      assert.equal(focusedTextarea, textarea);
      assert.equal(focusedTextarea.value, "A persistent Focus draft");
      assert.equal(focusedTextarea.selectionStart, 2);
      assert.equal(focusedTextarea.selectionEnd, 12);
      assert.equal(focusedTextarea.selectionDirection, "backward");
      assert.equal(focusedTextarea.scrollTop, 37);
      assert.equal(document.querySelector("section")?.getAttribute("role"), "dialog");
      assert.equal(document.getElementById("background")?.getAttribute("aria-hidden"), "true");
      assert.equal(new URL(window.location.href).searchParams.get("note_mode"), "focus");
      assert.equal(new URL(window.location.href).searchParams.get("repair"), "queued");
      assert.equal(window.history.state.__NA, true);
      assert.deepEqual(Object.keys(window.history.state.__brainNoteFocus).sort(), ["token", "v"]);
      assert.equal(document.activeElement?.textContent, "My notes — Example");

      const exitButton = [...document.querySelectorAll("button")].find(
        (button) => button.textContent === "Exit focus",
      )!;
      await act(async () => {
        exitButton.click();
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      });

      assert.equal(document.querySelector<HTMLTextAreaElement>("textarea[aria-label='Draft']"), textarea);
      assert.equal(document.querySelector("section")?.hasAttribute("role"), false);
      assert.equal(document.getElementById("background")?.getAttribute("aria-hidden"), null);
      const restoredTrigger = [...document.querySelectorAll("button")].find(
        (button) => button.textContent === "Focus",
      );
      assert.ok(restoredTrigger);
      assert.equal(document.activeElement, restoredTrigger);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
