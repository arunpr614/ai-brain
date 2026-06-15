"use client";

import {
  AlertTriangle,
  CirclePlus,
  KeyRound,
  Library,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useCommandPalette } from "./command-palette";
import pkg from "../../package.json";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Library;
  enabled: boolean;
  badge?: number;
}

const ITEMS: NavItem[] = [
  { href: "/library", label: "Library", icon: Library, enabled: true },
  { href: "/needs-upgrade", label: "Needs Upgrade", icon: AlertTriangle, enabled: true },
  { href: "/ask", label: "Ask", icon: MessageSquare, enabled: true },
  { href: "/capture", label: "Capture", icon: CirclePlus, enabled: true },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
];

const LOWER_ITEMS: NavItem[] = [
  {
    href: "/settings/device-pairing",
    label: "Pair Device",
    icon: KeyRound,
    enabled: true,
  },
  {
    href: "#privacy-coming-soon",
    label: "Privacy Controls",
    icon: Shield,
    enabled: false,
  },
];

const SIDEBAR_COLLAPSED_KEY = "ai-memory-sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "ai-memory-sidebar-collapsed-change";

function getCollapsedSnapshot(): string {
  if (typeof window === "undefined") return "0";
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) ?? "0";
}

function subscribeCollapsed(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, callback);
  };
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/library") return pathname === "/" || pathname === "/library" || pathname.startsWith("/items/");
  if (href === "/ask") return pathname === "/ask" || pathname.endsWith("/ask");
  if (href === "/settings") return pathname === "/settings" || pathname.startsWith("/settings/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMobileActivePath(pathname: string, href: "/library" | "/capture" | "/ask" | "/more"): boolean {
  if (href === "/library") {
    return (
      pathname === "/" ||
      pathname === "/library" ||
      pathname.startsWith("/items/") ||
      pathname.startsWith("/topics/") ||
      pathname.startsWith("/collections/") ||
      pathname === "/needs-upgrade" ||
      pathname === "/search"
    );
  }
  if (href === "/ask") return pathname === "/ask" || pathname.endsWith("/ask");
  if (href === "/capture") return pathname === "/capture" || pathname.startsWith("/capture/");
  return pathname === "/more" || pathname.startsWith("/settings/") || pathname === "/settings";
}

function useStandardMobileCapture(pathname: string): boolean {
  return (
    pathname === "/ask" ||
    pathname.endsWith("/ask") ||
    pathname === "/capture" ||
    pathname.startsWith("/capture/")
  );
}

export function Sidebar({ needsUpgradeCount = 0 }: { needsUpgradeCount?: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open } = useCommandPalette();
  const collapsed =
    useSyncExternalStore(
      subscribeCollapsed,
      getCollapsedSnapshot,
      () => "0",
    ) === "1";

  const toggleCollapsed = () => {
    const next = !collapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  };

  const primaryItems = ITEMS.map((item) =>
    item.href === "/needs-upgrade"
      ? { ...item, badge: needsUpgradeCount }
      : item,
  );

  const standardMobileCapture = useStandardMobileCapture(pathname);
  const isFocusMode = pathname.startsWith("/items/") && searchParams.get("mode") === "focus";

  if (isFocusMode) return null;

  // Desktop (`md:` and up): left rail aside with labels + search.
  // Mobile (below `md:`): Android-style bottom nav with route-aware Capture.
  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3 md:flex",
          "transition-[width] duration-[var(--duration-med)] ease-[var(--ease-in-out)]",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
      <div className={cn("px-2 pb-4 pt-1", collapsed && "px-0")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <Image
            src="/ai-memory-logo.png"
            alt=""
            width={32}
            height={32}
            className="rounded-md"
            unoptimized
          />
          <div className={cn(collapsed && "sr-only")}>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              AI Memory
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              v{pkg.version} · private memory
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "mb-3 flex h-8 items-center rounded-md border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)]",
          "hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
          collapsed ? "justify-center px-0" : "justify-between px-2",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
        ) : (
          <>
            <span>Navigation</span>
            <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => open()}
        title="Search"
        className={cn(
          "mb-3 flex h-8 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)]",
          "text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]",
          "transition-colors duration-[var(--duration-fast)]",
          collapsed ? "justify-center px-0" : "px-3",
        )}
      >
        <Search className="h-4 w-4" strokeWidth={2} />
        <span className={cn(collapsed && "sr-only")}>Search</span>
        <span
          className={cn(
            "ml-auto font-mono text-xs text-[var(--text-muted)]",
            collapsed && "hidden",
          )}
        >
          ⌘K
        </span>
      </button>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {primaryItems.map(({ href, label, icon: Icon, enabled, badge }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={enabled ? href : "#"}
              title={collapsed ? label : undefined}
              aria-disabled={!enabled}
              aria-current={active ? "page" : undefined}
              tabIndex={enabled ? 0 : -1}
              onClick={(e) => {
                if (!enabled) e.preventDefault();
              }}
              className={cn(
                "relative flex h-8 items-center rounded-md text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2",
                active
                  ? "bg-[var(--accent-3)] text-[var(--accent-11)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
                !enabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text-secondary)]",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className={cn(collapsed && "sr-only")}>{label}</span>
              {Boolean(badge) && (
                <span
                  className={cn(
                    "rounded-full bg-[var(--quality-needs-upgrade)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white",
                    collapsed ? "absolute ml-7 mt-[-18px]" : "ml-auto",
                  )}
                >
                  {badge}
                </span>
              )}
              {!enabled && !collapsed && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <nav className="mt-auto flex flex-col gap-0.5 border-t border-[var(--border)] pt-3" aria-label="Utilities">
        {LOWER_ITEMS.map(({ href, label, icon: Icon, enabled }) => {
          const active = enabled && isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={enabled ? href : "#"}
              title={
                enabled
                  ? collapsed
                    ? label
                    : undefined
                  : `${label} coming soon`
              }
              aria-disabled={!enabled}
              aria-current={active ? "page" : undefined}
              tabIndex={enabled ? 0 : -1}
              onClick={(e) => {
                if (!enabled) e.preventDefault();
              }}
              className={cn(
                "relative flex h-8 items-center rounded-md text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2",
                active
                  ? "bg-[var(--accent-3)] text-[var(--accent-11)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]",
                !enabled && "cursor-not-allowed opacity-55 hover:bg-transparent hover:text-[var(--text-secondary)]",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              <span className={cn(collapsed && "sr-only")}>{label}</span>
              {!enabled && !collapsed && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      </aside>

      <nav
        aria-label="Primary mobile"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around md:hidden",
          "border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 backdrop-blur",
          "pb-[max(env(safe-area-inset-bottom),0.25rem)]",
        )}
      >
        <MobileNavLink
          href="/library"
          label="Library"
          icon={Library}
          active={isMobileActivePath(pathname, "/library")}
        />

        {standardMobileCapture ? (
          <MobileNavLink
            href="/capture"
            label="Capture"
            icon={CirclePlus}
            active={isMobileActivePath(pathname, "/capture")}
          />
        ) : (
          <div className="relative flex h-full flex-1 flex-col items-center justify-end pb-1">
            <Link
              href="/capture"
              aria-label="Open Capture"
              className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--surface)] shadow-lg transition-transform duration-[var(--duration-fast)] active:scale-95"
            >
              <CirclePlus className="h-7 w-7" strokeWidth={2} />
            </Link>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              Capture
            </span>
          </div>
        )}

        <MobileNavLink
          href="/ask"
          label="Ask"
          icon={MessageSquare}
          active={isMobileActivePath(pathname, "/ask")}
        />
        <MobileNavLink
          href="/more"
          label="More"
          icon={MoreHorizontal}
          active={isMobileActivePath(pathname, "/more")}
          badge={needsUpgradeCount}
        />
      </nav>
    </>
  );
}

function MobileNavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof Library;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-medium",
        "transition-colors duration-[var(--duration-fast)]",
        active
          ? "text-[var(--accent-11)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={`Open ${label}`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={2} />
        {Boolean(badge) && (
          <span className="absolute -right-2 -top-1 rounded-full bg-[var(--quality-needs-upgrade)] px-1 text-[9px] font-semibold leading-3 text-white">
            {badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
