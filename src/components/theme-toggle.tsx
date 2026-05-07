"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { isTheme, THEME_COOKIE, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

function applyTheme(theme: Theme): void {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = resolved;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=strict`;
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  // If user picks "system", keep it reactive to OS preference changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const onSelect = (value: Theme) => {
    if (!isTheme(value)) return;
    setTheme(value);
    applyTheme(value);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={`${label} theme`}
          onClick={() => onSelect(value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
            "hover:bg-[var(--surface)]",
            theme === value &&
              "bg-[var(--accent-3)] text-[var(--accent-11)]",
          )}
          title={label}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
