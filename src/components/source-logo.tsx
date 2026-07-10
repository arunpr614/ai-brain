import { FileText, Globe, StickyNote } from "lucide-react";

function logoClassName(className: string | undefined): string {
  return className ?? "h-3.5 w-3.5 shrink-0";
}

function sourceLogoKind(
  platform: string | null | undefined,
  type: string | null | undefined,
): "youtube" | "linkedin" | "substack" | "pdf" | "note" | "generic" {
  if (platform === "youtube" || platform === "youtube_short" || type === "youtube") {
    return "youtube";
  }
  if (platform === "linkedin") return "linkedin";
  if (platform === "substack") return "substack";
  if (platform === "pdf" || type === "pdf") return "pdf";
  if (platform === "note" || type === "note") return "note";
  return "generic";
}

export function SourceLogo({
  platform,
  type,
  className,
}: {
  platform: string | null | undefined;
  type: string | null | undefined;
  className?: string;
}) {
  const baseClassName = logoClassName(className);
  const kind = sourceLogoKind(platform, type);

  if (kind === "youtube") {
    // Local brand-inspired mark. No remote logo asset or CDN request.
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className={baseClassName}
      >
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0033" />
        <path d="M10 9v6l5-3-5-3z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (kind === "linkedin") {
    // Local brand-inspired mark. Source text remains the accessible label.
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className={baseClassName}
      >
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#0A66C2" />
        <circle cx="8" cy="8" r="1.4" fill="#FFFFFF" />
        <path d="M6.8 10.4h2.4v7H6.8v-7zM11 10.4h2.3v1c.5-.7 1.3-1.2 2.4-1.2 1.8 0 3.1 1.2 3.1 3.7v3.5h-2.4v-3.2c0-1.2-.4-1.9-1.4-1.9-.8 0-1.2.5-1.5 1-.1.2-.1.5-.1.7v3.4H11v-7z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (kind === "substack") {
    // Local brand-inspired mark. Source text remains the accessible label.
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className={baseClassName}
      >
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#FF6719" />
        <path d="M7 7h10M7 10h10" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 13h10v5l-5-2.5L7 18v-5z" fill="#FFFFFF" />
      </svg>
    );
  }

  if (kind === "pdf") {
    return <FileText aria-hidden="true" className={baseClassName} strokeWidth={2} />;
  }

  if (kind === "note") {
    return <StickyNote aria-hidden="true" className={baseClassName} strokeWidth={2} />;
  }

  return <Globe aria-hidden="true" className={baseClassName} strokeWidth={2} />;
}
