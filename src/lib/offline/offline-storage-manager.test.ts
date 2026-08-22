import test from "node:test";
import assert from "node:assert/strict";
import {
  formatBytes,
  PAGES_CACHE_NAME,
  SHELL_CACHE_NAME,
} from "./offline-storage-manager";

test("formatBytes formats various byte sizes cleanly", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-50), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(500 * 1024), "500.0 KB");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
  assert.equal(formatBytes(18.4 * 1024 * 1024), "18.4 MB");
  assert.equal(formatBytes(50 * 1024 * 1024), "50.0 MB");
});

test("cache names match active service worker v6 standards", () => {
  assert.equal(PAGES_CACHE_NAME, "ai-memory-pages-v6");
  assert.equal(SHELL_CACHE_NAME, "ai-memory-shell-v6");
});
