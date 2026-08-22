import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isViewMode,
  parseViewModeFromUrl,
  resolveViewModePreference,
  serializeViewModeCookie,
  VIEW_MODE_COOKIE,
} from "./view-mode";

describe("ViewMode helpers", () => {
  it("validates valid and invalid view mode strings", () => {
    assert.strictEqual(isViewMode("auto"), true);
    assert.strictEqual(isViewMode("mobile"), true);
    assert.strictEqual(isViewMode("desktop"), true);
    assert.strictEqual(isViewMode("tablet"), false);
    assert.strictEqual(isViewMode(null), false);
    assert.strictEqual(isViewMode(undefined), false);
  });

  it("resolves view mode preferences with fallback to auto", () => {
    assert.strictEqual(resolveViewModePreference("auto"), "auto");
    assert.strictEqual(resolveViewModePreference("mobile"), "mobile");
    assert.strictEqual(resolveViewModePreference("pwa"), "mobile");
    assert.strictEqual(resolveViewModePreference("desktop"), "desktop");
    assert.strictEqual(resolveViewModePreference("invalid"), "auto");
    assert.strictEqual(resolveViewModePreference(null), "auto");
    assert.strictEqual(resolveViewModePreference(undefined), "auto");
  });

  it("serializes view mode cookie with 1-year expiration and Lax policy", () => {
    const cookie = serializeViewModeCookie("mobile");
    assert.ok(cookie.includes(`${VIEW_MODE_COOKIE}=mobile`));
    assert.ok(cookie.includes("path=/"));
    assert.ok(cookie.includes("samesite=lax"));
    assert.ok(cookie.includes("max-age=31536000"));
  });

  it("parses view mode from URL string and URLSearchParams", () => {
    assert.strictEqual(parseViewModeFromUrl("https://brain.arunp.in/library?mode=mobile"), "mobile");
    assert.strictEqual(parseViewModeFromUrl("https://brain.arunp.in/library?mode=pwa"), "mobile");
    assert.strictEqual(parseViewModeFromUrl("https://brain.arunp.in/library?view=desktop"), "desktop");
    assert.strictEqual(parseViewModeFromUrl("https://brain.arunp.in/library?mode=auto"), "auto");
    assert.strictEqual(parseViewModeFromUrl("https://brain.arunp.in/library"), null);
    assert.strictEqual(parseViewModeFromUrl("/library?mode=desktop"), "desktop");

    const params = new URLSearchParams("mode=mobile&filter=all");
    assert.strictEqual(parseViewModeFromUrl(params), "mobile");
  });
});
