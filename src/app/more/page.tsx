import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Download,
  FolderTree,
  KeyRound,
  Palette,
  SearchCheck,
  Shield,
  Smartphone,
  Sparkles,
  Tags,
  User,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { countNeedsUpgradeItems } from "@/db/items";
import { getProviderStatusReport, type ProviderStatus } from "@/lib/providers/status";
import {
  OFFLINE_TRUST_COPY,
  PRIVACY_TRUST_COPY,
  PROVIDER_TRUST_COPY,
} from "@/lib/settings/trust-copy";
import pkg from "../../../package.json";

export default async function MorePage() {
  const needsUpgradeCount = countNeedsUpgradeItems();
  const providerStatus = await getProviderStatusReport();

  return (
    <div className="mx-auto max-w-[720px] px-5 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
          More
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Settings, devices, data, and app health.
        </p>
      </header>

      <section className="mb-5 flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] text-[var(--text-muted)]">
          <User className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-[var(--text-primary)]">
            AI Memory
          </p>
          <p className="truncate text-sm text-[var(--text-secondary)]">
            Personal memory workspace
          </p>
        </div>
      </section>

      {needsUpgradeCount > 0 && (
        <Link
          href="/needs-upgrade"
          className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--quality-needs-upgrade)] bg-[var(--surface)] p-4 text-[var(--quality-needs-upgrade)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)]">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Needs upgrade</span>
            <span className="block text-xs">
              {needsUpgradeCount} weak {needsUpgradeCount === 1 ? "capture" : "captures"}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={2} />
        </Link>
      )}

      <MoreSection title="Preferences">
        <MoreLink href="/settings" icon={Palette} title="Appearance" />
        <MoreLink href="/settings/tags" icon={Tags} title="Tags" />
        <MoreLink href="/settings/collections" icon={FolderTree} title="Collections" />
      </MoreSection>

      <MoreSection title="Devices">
        <MoreLink href="/settings/device-pairing" icon={KeyRound} title="Device pairing" />
        <MoreLink href="/setup-apk" icon={Smartphone} title="Android setup" />
      </MoreSection>

      <MoreSection title="Data & Privacy">
        <MoreDownloadLink />
        <DisabledMoreRow
          icon={Shield}
          title={PRIVACY_TRUST_COPY.title}
          description={PRIVACY_TRUST_COPY.short}
          badge={PRIVACY_TRUST_COPY.badge}
        />
        <InfoMoreRow
          icon={WifiOff}
          title={OFFLINE_TRUST_COPY.title}
          description={OFFLINE_TRUST_COPY.short}
          badge={OFFLINE_TRUST_COPY.badge}
        />
      </MoreSection>

      <MoreSection title="Provider Health">
        <ProviderRow
          icon={Sparkles}
          title={PROVIDER_TRUST_COPY.llmTitle}
          status={providerStatus.llm}
        />
        <ProviderRow
          icon={SearchCheck}
          title={PROVIDER_TRUST_COPY.embedTitle}
          status={providerStatus.embed}
        />
      </MoreSection>

      <p className="pt-2 text-center text-xs font-medium text-[var(--text-muted)]">
        AI Memory v{pkg.version}
      </p>
    </div>
  );
}

function MoreSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {children}
      </div>
    </section>
  );
}

function MoreLink({
  href,
  icon: Icon,
  title,
}: {
  href: string;
  icon: typeof Palette;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-[var(--text-primary)] last:border-b-0 hover:bg-[var(--surface-raised)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={2} />
    </Link>
  );
}

function MoreDownloadLink() {
  return (
    <a
      href="/api/library/export.zip"
      className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 py-3 text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]">
        <Download className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        Backup & export
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={2} />
    </a>
  );
}

function DisabledMoreRow({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 py-3 opacity-75">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        <span className="block text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
      <span className="shrink-0 rounded-full border border-[var(--warning)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">
        {badge}
      </span>
    </div>
  );
}

function InfoMoreRow({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: typeof WifiOff;
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] text-[var(--text-muted)]">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        <span className="block text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </span>
      </span>
      <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
        {badge}
      </span>
    </div>
  );
}

function ProviderRow({
  icon: Icon,
  title,
  status,
}: {
  icon: typeof Activity;
  title: string;
  status: ProviderStatus;
}) {
  const tone =
    status.status === "ok"
      ? "text-[var(--success)]"
      : status.status === "quota_or_billing"
        ? "text-[var(--warning)]"
        : "text-[var(--danger)]";
  const copy =
    status.status === "ok"
      ? "Available"
      : status.status === "quota_or_billing"
        ? "Quota blocked"
        : status.status === "unconfigured"
          ? "Not configured"
          : "Unreachable";

  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--surface-raised)] ${tone}`}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--text-primary)]">
          {title}
        </span>
        <span className="block truncate text-xs text-[var(--text-secondary)]">
          {status.provider} · {status.model}
        </span>
      </span>
      <span className={`shrink-0 text-xs font-medium ${tone}`}>{copy}</span>
    </div>
  );
}
