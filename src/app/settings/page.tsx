import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  FolderTree,
  SearchCheck,
  Shield,
  Sparkles,
  Tags,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NoteAiDefaultSetting } from "@/components/note-ai-default-setting";
import { getJsonSetting } from "@/db/settings";
import { verifySessionCookie } from "@/lib/auth";
import { getNoteAiDefaultPreference } from "@/lib/notes/default-ai-policy";
import { manualNotesUiEnabled } from "@/lib/notes/flags";
import { noteAiProviderPolicy } from "@/lib/notes/provider-policy";
import { getProviderStatusReport, type ProviderStatus } from "@/lib/providers/status";
import {
  BACKUP_TRUST_COPY,
  OFFLINE_TRUST_COPY,
  PRIVACY_TRUST_COPY,
  PROVIDER_TRUST_COPY,
} from "@/lib/settings/trust-copy";
import { resolveThemePreference, THEME_COOKIE, type Theme } from "@/lib/theme";
import pkg from "../../../package.json";

interface BackupConfig {
  enabled: boolean;
  interval_hours: number;
  retention_count: number;
}

const BACKUP_DEFAULTS: BackupConfig = {
  enabled: true,
  interval_hours: 6,
  retention_count: 28,
};

export default async function SettingsPage() {
  const c = await cookies();
  if (!verifySessionCookie(c)) {
    redirect("/unlock?next=/settings");
  }

  const raw = c.get(THEME_COOKIE)?.value;
  const themePref: Theme = resolveThemePreference(raw);
  const backup = getJsonSetting<BackupConfig>("backup", BACKUP_DEFAULTS);
  const providerStatus = await getProviderStatusReport();
  const noteAiDefault = getNoteAiDefaultPreference();
  const noteAiPolicy = noteAiProviderPolicy();

  return (
    <div className="mx-auto max-w-[680px] px-8 py-10">
      <h1 className="mb-8 text-[30px] font-semibold leading-[1.2] tracking-[-0.01em] text-[var(--text-primary)]">
        Settings
      </h1>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Organization
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/settings/collections"
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
          >
            <FolderTree className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={2} />
            <span className="font-medium">Collections</span>
          </Link>
          <Link
            href="/settings/tags"
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
          >
            <Tags className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={2} />
            <span className="font-medium">Tags</span>
          </Link>
          <Link
            href="/settings/device-pairing"
            className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors hover:border-[var(--border-strong)]"
          >
            <Wifi className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={2} />
            <span className="font-medium">Device pairing</span>
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Appearance
        </h2>
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div>
	            <p className="text-sm font-medium text-[var(--text-primary)]">Theme</p>
	            <p className="text-xs text-[var(--text-secondary)]">
	              AI Memory opens in Light. Dark is an explicit preference.
	            </p>
          </div>
          <ThemeToggle initial={themePref} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Internal snapshots
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-[var(--text-secondary)]">Status</dt>
            <dd className="text-[var(--text-primary)]">
              {backup.enabled ? "Configured" : "Not configured"}
            </dd>
            <dt className="text-[var(--text-secondary)]">Interval</dt>
            <dd className="text-[var(--text-primary)]">
              Every {backup.interval_hours} hours
            </dd>
            <dt className="text-[var(--text-secondary)]">Retention</dt>
            <dd className="text-[var(--text-primary)]">
              Last {backup.retention_count} snapshots
            </dd>
            <dt className="text-[var(--text-secondary)]">Server path</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              /opt/brain/data/backups/
            </dd>
          </dl>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {BACKUP_TRUST_COPY.detail}
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          AI services
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProviderStatusRow
              icon={<Sparkles className="h-4 w-4" strokeWidth={2} />}
              title={PROVIDER_TRUST_COPY.llmTitle}
              status={providerStatus.llm}
              okCopy={PROVIDER_TRUST_COPY.llmOk}
            />
            <ProviderStatusRow
              icon={<SearchCheck className="h-4 w-4" strokeWidth={2} />}
              title={PROVIDER_TRUST_COPY.embedTitle}
              status={providerStatus.embed}
              okCopy={PROVIDER_TRUST_COPY.embedOk}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
            {PROVIDER_TRUST_COPY.storage}
          </p>
        </div>
      </section>

      {manualNotesUiEnabled() && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
            My notes
          </h2>
          <NoteAiDefaultSetting
            initialEnabled={noteAiDefault}
            initialEligible={noteAiPolicy.eligible}
          />
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Data & Privacy
        </h2>
        <TrustInfoPanel
          icon={<Shield className="h-4 w-4" strokeWidth={2} />}
          title={PRIVACY_TRUST_COPY.title}
          badge={PRIVACY_TRUST_COPY.badge}
        >
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {PRIVACY_TRUST_COPY.detail}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-11 cursor-not-allowed items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium text-[var(--text-muted)] opacity-70 md:h-8"
            >
              Manage privacy controls
            </button>
          </div>
        </TrustInfoPanel>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Offline
        </h2>
        <TrustInfoPanel
          icon={<WifiOff className="h-4 w-4" strokeWidth={2} />}
          title={OFFLINE_TRUST_COPY.title}
          badge={OFFLINE_TRUST_COPY.badge}
        >
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {OFFLINE_TRUST_COPY.detail}
          </p>
        </TrustInfoPanel>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Export
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="mb-3 text-sm text-[var(--text-primary)]">
            Download your entire library as a zip of markdown files (Obsidian-ready).
          </p>
          <a
            href="/api/library/export.zip"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--action-primary-bg)] px-3 text-sm font-medium text-[var(--action-primary-fg)] hover:bg-[var(--action-primary-bg-hover)] md:h-8"
          >
            Download library.zip
          </a>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          About
        </h2>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-[var(--text-secondary)]">App version</dt>
            <dd className="font-mono text-[var(--text-primary)]">{pkg.version}</dd>
            <dt className="text-[var(--text-secondary)]">Mode</dt>
            <dd className="text-[var(--text-primary)]">Cloud (Hetzner via Cloudflare)</dd>
            <dt className="text-[var(--text-secondary)]">Storage</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">
              /opt/brain/data/brain.sqlite
            </dd>
          </dl>
        </div>
      </section>
    </div>
  );
}

function TrustInfoPanel({
  icon,
  title,
  badge,
  children,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
          <span className="text-[var(--text-muted)]">{icon}</span>
          <span>{title}</span>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--warning)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--warning)]">
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function ProviderStatusRow({
  icon,
  title,
  status,
  okCopy,
}: {
  icon: ReactNode;
  title: string;
  status: ProviderStatus;
  okCopy: string;
}) {
  const tone =
    status.status === "ok"
      ? "text-[var(--success)]"
      : status.status === "quota_or_billing"
        ? "text-[var(--warning)]"
        : "text-[var(--danger)]";
  const copy =
    status.status === "ok"
      ? okCopy
      : status.status === "quota_or_billing"
        ? "Billing or quota is blocking this service."
        : status.status === "unconfigured"
          ? "This service is not configured."
          : "This service is not reachable right now.";

  return (
    <div className="rounded-md border border-[var(--border)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={tone}>{icon}</span>
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{copy}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-[var(--text-muted)]">Provider</dt>
        <dd className="truncate font-mono text-[var(--text-secondary)]">{status.provider}</dd>
        <dt className="text-[var(--text-muted)]">Model</dt>
        <dd className="truncate font-mono text-[var(--text-secondary)]">{status.model}</dd>
      </dl>
      <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
        <Activity className="h-3 w-3" strokeWidth={2} />
        Checked {new Date(status.lastCheckedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
