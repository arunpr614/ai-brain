/**
 * Theme helpers — shared between server (layout SSR) and client (toggle).
 * The authoritative source of truth is a cookie `brain-theme` that can be
 * one of: "system" | "light" | "dark". On SSR we set <html data-theme>
 * to avoid FOUC. See DESIGN.md §13.
 */
export type Theme = "system" | "light" | "dark";

export const THEME_COOKIE = "brain-theme";

export function isTheme(v: unknown): v is Theme {
  return v === "system" || v === "light" || v === "dark";
}
