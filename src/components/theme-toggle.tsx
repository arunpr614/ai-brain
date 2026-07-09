"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { isTheme, serializeThemeCookie, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.cookie = serializeThemeCookie(theme);
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

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
            "flex h-11 w-11 items-center justify-center rounded-sm transition-colors md:h-7 md:w-7",
            "hover:bg-[var(--surface)]",
            theme === value &&
              "bg-[var(--control-selected-bg)] text-[var(--control-selected-fg)]",
          )}
          title={label}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
