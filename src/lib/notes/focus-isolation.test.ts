import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { isolateForNoteFocus } from "./focus-isolation";

function makeDom() {
  return new JSDOM(
    "<!doctype html><html><body><aside id='sidebar' aria-hidden='false'></aside><main><article><div id='peer'></div><section id='focus'></section></article></main></body></html>",
    { url: "http://localhost/items/example" },
  );
}

test("Focus isolation makes only background branches inert and restores exact prior state", () => {
  const dom = makeDom();
  try {
    const { document } = dom.window;
    const focus = document.getElementById("focus") as HTMLElement;
    const peer = document.getElementById("peer") as HTMLElement & { inert?: boolean };
    const sidebar = document.getElementById("sidebar") as HTMLElement & { inert?: boolean };
    const main = document.querySelector("main") as HTMLElement & { inert?: boolean };
    peer.inert = true;
    document.documentElement.style.overflow = "clip";
    document.body.style.overflow = "auto";

    const cleanup = isolateForNoteFocus(focus);

    assert.equal(peer.inert, true);
    assert.equal(peer.getAttribute("aria-hidden"), "true");
    assert.equal(sidebar.inert, true);
    assert.equal(sidebar.getAttribute("aria-hidden"), "true");
    assert.notEqual(main.inert, true);
    assert.equal(document.documentElement.dataset.noteFocusActive, "true");
    assert.equal(document.documentElement.style.overflow, "hidden");
    assert.equal(document.body.style.overflow, "hidden");

    cleanup();
    cleanup();

    assert.equal(peer.inert, true);
    assert.equal(peer.hasAttribute("aria-hidden"), false);
    assert.notEqual(sidebar.inert, true);
    assert.equal(sidebar.getAttribute("aria-hidden"), "false");
    assert.equal(document.documentElement.hasAttribute("data-note-focus-active"), false);
    assert.equal(document.documentElement.style.overflow, "clip");
    assert.equal(document.body.style.overflow, "auto");
  } finally {
    dom.window.close();
  }
});

test("Focus isolation rolls back partial work when applying isolation throws", () => {
  const dom = makeDom();
  try {
    const { document } = dom.window;
    const focus = document.getElementById("focus") as HTMLElement;
    const peer = document.getElementById("peer") as HTMLElement & { inert?: boolean };
    const sidebar = document.getElementById("sidebar") as HTMLElement & { inert?: boolean };
    const originalSetAttribute = sidebar.setAttribute.bind(sidebar);
    sidebar.setAttribute = (name: string, value: string) => {
      if (name === "aria-hidden" && value === "true") {
        throw new Error("synthetic isolation failure");
      }
      originalSetAttribute(name, value);
    };

    assert.throws(() => isolateForNoteFocus(focus), /synthetic isolation failure/);
    assert.notEqual(peer.inert, true);
    assert.equal(peer.hasAttribute("aria-hidden"), false);
    assert.notEqual(sidebar.inert, true);
    assert.equal(sidebar.getAttribute("aria-hidden"), "false");
    assert.equal(document.documentElement.hasAttribute("data-note-focus-active"), false);
    assert.equal(document.documentElement.style.overflow, "");
    assert.equal(document.body.style.overflow, "");
  } finally {
    dom.window.close();
  }
});
