/**
 * Theme helpers shared between server first paint and client controls.
 * AI Memory is light-first: only explicit Light/Dark choices are user-facing,
 * while legacy or invalid values resolve to Light.
 */
export type Theme = "light" | "dark";

export const THEME_COOKIE = "brain-theme";
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark";
}

export const isExplicitTheme = isTheme;

export function resolveThemePreference(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}

export function shouldMigrateThemeCookie(value: unknown): boolean {
  return value !== "light" && value !== "dark";
}

export function serializeThemeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; samesite=strict`;
}
