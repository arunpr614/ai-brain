"use client";

import {
  BookOpen,
  Inbox,
  Library,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCommandPalette } from "./command-palette";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Library;
  enabled: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Library", icon: Library, enabled: true },
  { href: "/inbox", label: "Inbox", icon: Inbox, enabled: false },
  { href: "/ask", label: "Ask", icon: MessageSquare, enabled: true },
  { href: "/gen", label: "GenPages", icon: Sparkles, enabled: false },
  { href: "/review", label: "Review", icon: BookOpen, enabled: false },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useCommandPalette();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3",
        "transition-[width] duration-[var(--duration-med)] ease-[var(--ease-in-out)]",
      )}
    >
      <div className="px-2 pb-4 pt-1">
        <h1 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          AI Brain
        </h1>
        <p className="text-xs text-[var(--text-muted)]">v0.1.0 · local</p>
      </div>

      <button
        type="button"
        onClick={() => open()}
        className={cn(
          "mb-3 flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5",
          "text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]",
          "transition-colors duration-[var(--duration-fast)]",
        )}
      >
        <Search className="h-4 w-4" strokeWidth={2} />
        <span>Search</span>
        <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">⌘K</span>
      </button>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {ITEMS.map(({ href, label, icon: Icon, enabled }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={enabled ? href : "#"}
              aria-disabled={!enabled}
              tabIndex={enabled ? 0 : -1}
              onClick={(e) => {
                if (!enabled) e.preventDefault();
              }}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                active
                  ? "bg-[var(--accent-3)] text-[var(--accent-11)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
                !enabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text-secondary)]",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span>{label}</span>
              {!enabled && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
