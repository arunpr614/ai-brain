"use client";

import { useEffect } from "react";
import { THEME_COOKIE, type Theme } from "@/lib/theme";

function readThemeCookie(): Theme {
  const match = document.cookie.match(new RegExp(`${THEME_COOKIE}=([^;]+)`));
  const value = match?.[1];
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function applyThemePreference(theme: Theme): void {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
}

export function ThemeBootstrap() {
  useEffect(() => {
    const apply = () => applyThemePreference(readThemeCookie());
    apply();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return null;
}
