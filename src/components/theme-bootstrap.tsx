"use client";

import { useEffect } from "react";
import {
  resolveThemePreference,
  serializeThemeCookie,
  shouldMigrateThemeCookie,
  THEME_COOKIE,
} from "@/lib/theme";

function readThemeCookie(): string | undefined {
  const match = document.cookie.match(new RegExp(`${THEME_COOKIE}=([^;]+)`));
  const value = match?.[1];
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function ThemeBootstrap() {
  useEffect(() => {
    const raw = readThemeCookie();
    const resolved = resolveThemePreference(raw);
    document.documentElement.dataset.theme = resolved;
    if (shouldMigrateThemeCookie(raw)) {
      document.cookie = serializeThemeCookie("light");
    }
  }, []);

  return null;
}
