import assert from "node:assert/strict";
import test from "node:test";
import {
  isExplicitTheme,
  isTheme,
  resolveThemePreference,
  serializeThemeCookie,
  shouldMigrateThemeCookie,
  THEME_COOKIE,
} from "./theme";

test("resolveThemePreference is light-first for missing, legacy, and invalid values", () => {
  assert.equal(resolveThemePreference(undefined), "light");
  assert.equal(resolveThemePreference(null), "light");
  assert.equal(resolveThemePreference(""), "light");
  assert.equal(resolveThemePreference("system"), "light");
  assert.equal(resolveThemePreference("banana"), "light");
  assert.equal(resolveThemePreference("light"), "light");
  assert.equal(resolveThemePreference("dark"), "dark");
});

test("theme guards accept only explicit Light and Dark choices", () => {
  assert.equal(isTheme("light"), true);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme("system"), false);
  assert.equal(isExplicitTheme("light"), true);
  assert.equal(isExplicitTheme("dark"), true);
  assert.equal(isExplicitTheme("system"), false);
});

test("legacy or invalid theme cookies should migrate to Light", () => {
  assert.equal(shouldMigrateThemeCookie(undefined), true);
  assert.equal(shouldMigrateThemeCookie("system"), true);
  assert.equal(shouldMigrateThemeCookie("banana"), true);
  assert.equal(shouldMigrateThemeCookie("light"), false);
  assert.equal(shouldMigrateThemeCookie("dark"), false);
});

test("serializeThemeCookie persists explicit theme under the existing cookie name", () => {
  assert.match(serializeThemeCookie("light"), new RegExp(`^${THEME_COOKIE}=light;`));
  assert.match(serializeThemeCookie("dark"), /max-age=31536000/);
  assert.match(serializeThemeCookie("dark"), /samesite=strict/);
});
