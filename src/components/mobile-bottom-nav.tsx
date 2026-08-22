"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CirclePlus, Library, MessageSquare, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { getMobileShellTarget, usesStandardMobileCapture } from "./sidebar-routing";
import { QuickCaptureSheet } from "./quick-capture-sheet";

export interface MobileBottomNavProps {
  needsUpgradeCount?: number;
  processingInboxCount?: number;
}

export function MobileBottomNav({
  needsUpgradeCount = 0,
  processingInboxCount = 0,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const mobileTarget = getMobileShellTarget(pathname);
  const standardMobileCapture = usesStandardMobileCapture(pathname);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary mobile"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around md:hidden",
          "border-t border-[var(--border)] bg-[var(--surface)]/95 px-2 backdrop-blur-md",
          "pb-[max(env(safe-area-inset-bottom),0.35rem)]",
        )}
      >
        {/* Tab 1: Library */}
        <MobileNavLink
          href="/library"
          label="Library"
          icon={Library}
          active={mobileTarget === "library"}
          badge={needsUpgradeCount > 0 ? needsUpgradeCount : undefined}
        />

        {/* Tab 2: Ask AI */}
        <MobileNavLink
          href="/ask"
          label="Ask AI"
          icon={MessageSquare}
          active={mobileTarget === "ask"}
        />

        {/* Central Elevated FAB: 1-Tap Capture */}
        {standardMobileCapture ? (
          <MobileNavLink
            href="/capture"
            label="Capture"
            icon={CirclePlus}
            active={mobileTarget === "capture"}
          />
        ) : (
          <div className="relative flex h-full flex-1 flex-col items-center justify-end pb-1">
            <button
              type="button"
              onClick={() => setQuickCaptureOpen(true)}
              aria-label="Open 1-Tap Quick Capture"
              title="1-Tap Quick Capture"
              className={cn(
                "absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full",
                "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]",
                "shadow-lg ring-4 ring-[var(--surface)] transition-transform duration-[var(--duration-fast)]",
                "hover:bg-[var(--action-primary-bg-hover)] active:scale-95",
              )}
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              Capture
            </span>
          </div>
        )}

        {/* Tab 4: More & Settings */}
        <MobileNavLink
          href="/more"
          label="More"
          icon={MoreHorizontal}
          active={mobileTarget === "more"}
          badge={processingInboxCount > 0 ? processingInboxCount : undefined}
        />
      </nav>

      {/* 1-Tap Quick Capture Bottom Sheet */}
      <QuickCaptureSheet
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
      />
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
        "transition-colors duration-[var(--duration-fast)] min-h-[48px]",
        active
          ? "text-[var(--accent-11)] font-semibold"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
      aria-current={active ? "page" : undefined}
      aria-label={`Open ${label}`}
    >
      <span className="relative inline-flex items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
        {Boolean(badge) && (
          <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--quality-needs-upgrade)] px-1 text-[9px] font-bold leading-none text-white">
            {badge && badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className="mt-0.5">{label}</span>
    </Link>
  );
}
