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
import { OutboxBadge } from "./outbox-badge";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Library;
  enabled: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", label: "Library", icon: Library, enabled: true },
  { href: "/inbox", label: "Inbox", icon: Inbox, enabled: true },
  { href: "/ask", label: "Ask", icon: MessageSquare, enabled: true },
  { href: "/gen", label: "GenPages", icon: Sparkles, enabled: false },
  { href: "/review", label: "Review", icon: BookOpen, enabled: false },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useCommandPalette();

  // v0.5.0 T-15 / F-019 — responsive nav.
  // Desktop (`md:` and up): left rail aside with labels + Cmd-K search.
  // Mobile (below `md:`): bottom bar with icon-only links for the enabled
  // routes, safe-area padding for gesture bar / nav bar. Both trees render
  // from the same ITEMS constant so nav stays in sync; a new React
  // component was deliberately not added (plan constraint F-019).
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3 md:flex",
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
              {enabled && href === "/inbox" && <OutboxBadge />}
            </Link>
          );
        })}
      </nav>
      </aside>

      {/*
        Mobile bottom-nav (below `md:`). Fixed-position so it sits atop
        any scroll container without page-layout work. `pb-[env(safe-area-inset-bottom)]`
        keeps it clear of the Android 3-button gesture bar and iOS home
        indicator; `pt-2` is the touch-target padding above.
      */}
      <nav
        aria-label="Primary mobile"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex md:hidden",
          "border-t border-[var(--border)] bg-[var(--surface)]",
          "pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-2",
        )}
      >
        {ITEMS.filter((i) => i.enabled).map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={`mobile-${href}`}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-medium",
                "transition-colors duration-[var(--duration-fast)]",
                active
                  ? "text-[var(--accent-11)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
