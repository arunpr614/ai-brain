import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  Inbox,
  Library,
  Maximize2,
  MessageSquare,
  Monitor,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  WifiOff,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  scenarios,
  type DeviceMode,
  type ExportStage,
  type ScenarioDefinition,
  type ScenarioId,
  type Tone,
} from "./model";

interface ItemPrototypeProps {
  scenarioId: ScenarioId;
  onScenarioChange: (scenario: ScenarioId) => void;
  device: DeviceMode;
  onDeviceChange: (device: DeviceMode) => void;
}

type ModalKind = "limited" | "changed" | "payload" | null;

const timeline = ["Queued", "Sending", "Processing", "Ready"];

const footerLockedStages: ExportStage[] = [
  "queued",
  "waiting",
  "running",
  "processing",
  "auth-create",
  "auth-reconcile",
  "auth-poll",
  "reconciling",
  "conflict",
  "processing-failed",
  "succeeded",
  "already",
  "blocked",
];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const statusMeta: Record<ExportStage, {
  title: string;
  body: string;
  tone: Tone;
  icon: LucideIcon;
}> = {
  idle: {
    title: "Ready to export",
    body: "One deliberate click creates one static copied-text source.",
    tone: "neutral",
    icon: BookOpen,
  },
  queued: {
    title: "Queued for NotebookLM",
    body: "AI Memory froze the minimized saved version. It is safe to close this page.",
    tone: "info",
    icon: Clock3,
  },
  waiting: {
    title: "Queued — waiting for desktop connector",
    body: "The request will continue when the connected computer is online.",
    tone: "warning",
    icon: WifiOff,
  },
  running: {
    title: "Sending the saved copy to NotebookLM…",
    body: "The connector is performing the one allowed copied-text create. Retry is unavailable.",
    tone: "info",
    icon: Send,
  },
  processing: {
    title: "Added to NotebookLM. Processing…",
    body: "The exact source is known, but AI Memory will not call this export complete yet.",
    tone: "info",
    icon: RefreshCw,
  },
  succeeded: {
    title: "Ready in Private NotebookLM target",
    body: "NotebookLM finished processing this exact saved version.",
    tone: "success",
    icon: CheckCircle2,
  },
  "auth-create": {
    title: "Reconnect NotebookLM",
    body: "Nothing was sent. Reconnect on the configured device before the export can start.",
    tone: "warning",
    icon: ShieldCheck,
  },
  "auth-reconcile": {
    title: "Reconnect to check the result",
    body: "NotebookLM may already have received this item. AI Memory will not send it again.",
    tone: "warning",
    icon: ShieldCheck,
  },
  "auth-poll": {
    title: "Reconnect to finish checking",
    body: "The source was already added. Reconnect only to resume processing-status checks; nothing will be sent again.",
    tone: "warning",
    icon: ShieldCheck,
  },
  reconciling: {
    title: "Checking whether NotebookLM received it…",
    body: "The create response was interrupted. All recovery checks are read-only.",
    tone: "warning",
    icon: RefreshCw,
  },
  conflict: {
    title: "Export paused to prevent another copy",
    body: "More than one source has the exact recovery marker. Nothing else will be sent or deleted.",
    tone: "danger",
    icon: AlertTriangle,
  },
  "processing-failed": {
    title: "NotebookLM could not process this source",
    body: "The recorded source failed after creation. AI Memory will not create a replacement automatically.",
    tone: "danger",
    icon: XCircle,
  },
  already: {
    title: "Already exported",
    body: "This exact saved version is already ready in the configured private notebook. No new source was created.",
    tone: "success",
    icon: CheckCircle2,
  },
  changed: {
    title: "This item changed since its last export",
    body: "A new export creates another source. The previous NotebookLM source remains unchanged.",
    tone: "warning",
    icon: AlertTriangle,
  },
  blocked: {
    title: "Destination safety reserve reached",
    body: "Restore source headroom or deliberately configure another private destination. No item was sent.",
    tone: "danger",
    icon: XCircle,
  },
  cancelled: {
    title: "Export cancelled",
    body: "The request was cancelled before sending began. Nothing left AI Memory.",
    tone: "neutral",
    icon: X,
  },
};

export function ItemPrototype({
  scenarioId,
  onScenarioChange,
  device,
  onDeviceChange,
}: ItemPrototypeProps) {
  const scenario = useMemo(
    () => scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0],
    [scenarioId],
  );
  const [stage, setStage] = useState<ExportStage>("idle");
  const [modal, setModal] = useState<ModalKind>(null);
  const [limitedConfirmed, setLimitedConfirmed] = useState(false);
  const [unresolvedNote, setUnresolvedNote] = useState(false);
  const [recoveryDisclosure, setRecoveryDisclosure] = useState<string | null>(null);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState(() => Date.now());
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const transitionTo = useCallback((nextStage: ExportStage) => {
    setStage(nextStage);
    setStatusUpdatedAt(Date.now());
    setUnresolvedNote(false);
    setRecoveryDisclosure(null);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => clearTimers, [clearTimers]);

  function later(nextStage: ExportStage, delay: number) {
    timers.current.push(window.setTimeout(() => transitionTo(nextStage), delay));
  }

  function runHappyPath(startAtQueued = true) {
    clearTimers();
    if (startAtQueued) transitionTo("queued");
    later("running", startAtQueued ? 850 : 100);
    later("processing", startAtQueued ? 1_850 : 1_100);
    later("succeeded", startAtQueued ? 3_350 : 2_600);
  }

  function runReconciliationRecovery() {
    clearTimers();
    transitionTo("reconciling");
    later("processing", 1_100);
    later("succeeded", 2_600);
  }

  function resumeProcessingCheck() {
    clearTimers();
    transitionTo("processing");
    later("succeeded", 1_500);
  }

  function requestExport() {
    if (footerLockedStages.includes(stage)) return;
    clearTimers();
    setRecoveryDisclosure(null);
    switch (scenario.id) {
      case "happy":
        runHappyPath();
        return;
      case "offline":
        transitionTo("waiting");
        return;
      case "limited":
        setLimitedConfirmed(false);
        setModal("limited");
        return;
      case "auth-create":
        transitionTo("auth-create");
        return;
      case "auth-reconcile":
        transitionTo("running");
        later("auth-reconcile", 1_100);
        return;
      case "auth-poll":
        transitionTo("running");
        later("processing", 900);
        later("auth-poll", 2_050);
        return;
      case "uncertain":
        transitionTo("running");
        later("reconciling", 1_100);
        return;
      case "conflict":
        transitionTo("running");
        later("reconciling", 900);
        later("conflict", 2_150);
        return;
      case "processing-failed":
        transitionTo("running");
        later("processing", 900);
        later("processing-failed", 2_400);
        return;
      case "already":
        transitionTo("already");
        return;
      case "changed":
        transitionTo("changed");
        setModal("changed");
        return;
      case "capacity":
        transitionTo("blocked");
        return;
    }
  }

  function confirmModal() {
    if (modal === "limited" && !limitedConfirmed) return;
    closeModal();
    runHappyPath();
  }

  function resetScenario() {
    clearTimers();
    transitionTo("idle");
    closeModal();
    setLimitedConfirmed(false);
  }

  function changeScenario(nextScenario: ScenarioId) {
    resetScenario();
    onScenarioChange(nextScenario);
  }

  const active = ["queued", "waiting", "running", "processing", "reconciling"].includes(stage);
  const footerLocked = footerLockedStages.includes(stage);
  const buttonLabel = primaryButtonLabel(stage, scenario);
  const connectorLabel = connectorStatusLabel(scenario, stage);

  return (
    <div className="experience-layout">
      <aside className="scenario-panel" aria-label="Prototype scenarios">
        <div className="scenario-panel__intro">
          <span className="section-kicker">Prototype controls</span>
          <h2>Choose a delivery condition</h2>
          <p>These controls are for the design document only. They do not appear in AI Memory.</p>
        </div>
        <div className="scenario-list">
          {scenarios.map((candidate) => (
            <button
              className={`scenario-card${candidate.id === scenario.id ? " is-selected" : ""}`}
              key={candidate.id}
              onClick={() => changeScenario(candidate.id)}
              aria-pressed={candidate.id === scenario.id}
            >
              <span className={`scenario-dot connector-${candidate.connector}`} aria-hidden="true" />
              <span>
                <small>{candidate.eyebrow}</small>
                <strong>{candidate.label}</strong>
                <span>{candidate.description}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="prototype-canvas" aria-label="Interactive item export prototype">
        <div className="prototype-toolbar">
          <div>
            <span className="section-kicker">Live item experience</span>
            <p><strong>{scenario.label}</strong> · {scenario.description}</p>
          </div>
          <div className="toolbar-actions">
            <div className="segmented-control" aria-label="Preview device">
              <button
                className={device === "desktop" ? "is-active" : ""}
                onClick={() => onDeviceChange("desktop")}
                aria-pressed={device === "desktop"}
              >
                <Monitor aria-hidden="true" /> Desktop
              </button>
              <button
                className={device === "mobile" ? "is-active" : ""}
                onClick={() => onDeviceChange("mobile")}
                aria-pressed={device === "mobile"}
              >
                <Smartphone aria-hidden="true" /> Mobile
              </button>
            </div>
            <button className="quiet-button" onClick={resetScenario}>
              <RefreshCw aria-hidden="true" /> Replay
            </button>
          </div>
        </div>

        <div className={`device-wrap device-wrap--${device}`}>
          <div className="device-chrome" aria-hidden="true">
            <span /><span /><span />
            <div>memory.local/items/4cf2…</div>
          </div>
          <div className={`ai-shell ai-shell--${device}`}>
            <DesktopSidebar />
            <main className="item-page">
              <div className="item-page__topline">
                <button className="text-button"><ArrowLeft aria-hidden="true" /> Back to Library</button>
                <span>Implemented-candidate preview · no live NotebookLM connection</span>
              </div>

              <div className="item-grid">
                <article className="item-article">
                  <header className="item-header">
                    <div className="item-title-row">
                      <h1>Why durable memory changes how teams use AI</h1>
                      <span className="ready-chip"><CheckCircle2 aria-hidden="true" /> Ready</span>
                    </div>
                    <div className="source-strip">
                      <span><FileText aria-hidden="true" /> Article</span>
                      <span className="quality-dot" /> Full text
                      <span>Saved today, 4:18 PM</span>
                    </div>
                    <a className="source-link" href="#source-preview" onClick={(event) => event.preventDefault()}>
                      <ExternalLink aria-hidden="true" /> hbr.org
                    </a>
                    {scenario.id === "limited" && (
                      <div className="capture-warning" role="note">
                        <AlertTriangle aria-hidden="true" />
                        <span><strong>Limited capture.</strong> AI Memory saved a preview, not the full article.</span>
                      </div>
                    )}
                  </header>

                  <div className="article-copy" id="source-preview">
                    <p>
                      Most AI tools treat every conversation as a fresh start. Durable memory changes the
                      relationship: decisions, source context, and useful fragments remain available without
                      asking people to reconstruct the past.
                    </p>
                    <p>
                      The useful unit is not an endless transcript. It is a well-bounded source with provenance,
                      a stable saved version, and clear rules for what can leave the private system.
                    </p>
                    {scenario.id !== "limited" && (
                      <p>
                        When the memory layer is trustworthy, teams can spend less time restating context and more
                        time comparing evidence. The system becomes a map of what was learned—not a black box that
                        silently changes beneath them.
                      </p>
                    )}
                  </div>

                  <TargetStrip
                    scenario={scenario}
                    stage={stage}
                    connectorLabel={connectorLabel}
                    onReviewPayload={() => setModal("payload")}
                  />

                  {stage !== "idle" && (
                    <ExportStatus
                      stage={stage}
                      scenario={scenario}
                      unresolvedNote={unresolvedNote}
                      recoveryDisclosure={recoveryDisclosure}
                      statusUpdatedAt={statusUpdatedAt}
                      onCancel={() => {
                        clearTimers();
                        transitionTo("cancelled");
                      }}
                      onConnectorOnline={() => runHappyPath()}
                      onReconnect={() => {
                        if (stage === "auth-create") runHappyPath();
                        else if (stage === "auth-poll") resumeProcessingCheck();
                        else runReconciliationRecovery();
                      }}
                      onSourceFound={runReconciliationRecovery}
                      onStayUnresolved={() => {
                        setUnresolvedNote(true);
                        setRecoveryDisclosure(null);
                        setStatusUpdatedAt(Date.now());
                      }}
                      onExplainRecovery={() => {
                        setRecoveryDisclosure(recoveryDisclosureFor(stage));
                        setStatusUpdatedAt(Date.now());
                      }}
                      onReset={resetScenario}
                    />
                  )}

                  <footer className="item-actions">
                    <button className="secondary-button"><Maximize2 aria-hidden="true" /> Focus mode</button>
                    <button className="secondary-button"><MessageSquare aria-hidden="true" /> Ask this item</button>
                    <button
                      className={`secondary-button notebook-button${stage === "succeeded" || stage === "already" ? " is-success" : ""}`}
                      onClick={requestExport}
                      disabled={footerLocked}
                      aria-busy={active}
                    >
                      {stage === "processing" || stage === "reconciling" || stage === "running" ? (
                        <RefreshCw className="spin" aria-hidden="true" />
                      ) : stage === "succeeded" || stage === "already" ? (
                        <Check aria-hidden="true" />
                      ) : (
                        <BookOpen aria-hidden="true" />
                      )}
                      {buttonLabel}
                    </button>
                    <button className="secondary-button"><Download aria-hidden="true" /> Export as .md</button>
                  </footer>
                </article>

                <aside className="companion-panel">
                  <div className="companion-tabs"><button className="is-active">Digest</button><button>My Notes</button></div>
                  <section>
                    <span className="mini-label">AI summary</span>
                    <p>Durable, source-grounded memory lets teams reuse context while preserving provenance and privacy boundaries.</p>
                    <span className="exclusion-note"><ShieldCheck aria-hidden="true" /> Not included in NotebookLM export</span>
                  </section>
                  <section>
                    <span className="mini-label">Key ideas</span>
                    <ul className="plain-list">
                      <li>Stable saved versions</li>
                      <li>Source provenance</li>
                      <li>Explicit data boundaries</li>
                    </ul>
                  </section>
                  <section>
                    <span className="mini-label">Tags</span>
                    <div className="tag-row"><span>AI strategy</span><span>Knowledge</span></div>
                  </section>
                </aside>
              </div>
              <MobileBottomNav />
            </main>
          </div>
        </div>

        {modal && (
          <ExportModal
            kind={modal}
            mobile={device === "mobile"}
            limitedConfirmed={limitedConfirmed}
            onLimitedConfirmed={setLimitedConfirmed}
            onClose={closeModal}
            onConfirm={confirmModal}
          />
        )}
      </section>
    </div>
  );
}

function DesktopSidebar() {
  return (
    <aside className="ai-sidebar">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>
        <div><strong>AI Memory</strong><span>private memory</span></div>
      </div>
      <button className="sidebar-search"><Search aria-hidden="true" /> Search <kbd>⌘K</kbd></button>
      <button className="capture-button"><CirclePlus aria-hidden="true" /> Capture</button>
      <nav aria-label="Prototype application navigation">
        <a className="is-active" href="#library" onClick={(event) => event.preventDefault()}><Library aria-hidden="true" /> Library</a>
        <a href="#processing" onClick={(event) => event.preventDefault()}><Inbox aria-hidden="true" /> Processing</a>
        <a href="#ask" onClick={(event) => event.preventDefault()}><MessageSquare aria-hidden="true" /> Ask</a>
        <a href="#settings" onClick={(event) => event.preventDefault()}><Settings aria-hidden="true" /> Settings</a>
      </nav>
      <div className="sidebar-foot"><ShieldCheck aria-hidden="true" /> Private by default</div>
    </aside>
  );
}

function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Prototype mobile navigation">
      <button className="is-active"><Library aria-hidden="true" /><span>Library</span></button>
      <button><CirclePlus aria-hidden="true" /><span>Capture</span></button>
      <button><MessageSquare aria-hidden="true" /><span>Ask</span></button>
      <button><Settings aria-hidden="true" /><span>More</span></button>
    </nav>
  );
}

function TargetStrip({
  scenario,
  stage,
  connectorLabel,
  onReviewPayload,
}: {
  scenario: ScenarioDefinition;
  stage: ExportStage;
  connectorLabel: string;
  onReviewPayload: () => void;
}) {
  const capacityBlocked = scenario.id === "capacity" || stage === "blocked";
  return (
    <section className={`target-strip${capacityBlocked ? " is-blocked" : ""}`} aria-label="NotebookLM destination">
      <div className="target-icon"><BookOpen aria-hidden="true" /></div>
      <div className="target-copy">
        <span className="mini-label">NotebookLM destination</span>
        <strong>Private NotebookLM target <span>· Private</span></strong>
        <p>Sends a static copy of the saved text. Changes do not sync automatically.</p>
        <button className="target-review" onClick={onReviewPayload}>What will be sent?</button>
      </div>
      <div className="target-health">
        <span className={`health-dot connector-${scenario.connector}`} aria-hidden="true" />
        <span>{connectorLabel}</span>
        <small>{capacityBlocked ? "Reserve protected" : "12 safe slots · limit 50 · reserve 5"}</small>
      </div>
    </section>
  );
}

function ExportStatus({
  stage,
  scenario,
  unresolvedNote,
  recoveryDisclosure,
  statusUpdatedAt,
  onCancel,
  onConnectorOnline,
  onReconnect,
  onSourceFound,
  onStayUnresolved,
  onExplainRecovery,
  onReset,
}: {
  stage: ExportStage;
  scenario: ScenarioDefinition;
  unresolvedNote: boolean;
  recoveryDisclosure: string | null;
  statusUpdatedAt: number;
  onCancel: () => void;
  onConnectorOnline: () => void;
  onReconnect: () => void;
  onSourceFound: () => void;
  onStayUnresolved: () => void;
  onExplainRecovery: () => void;
  onReset: () => void;
}) {
  const meta = statusMeta[stage];
  const Icon = meta.icon;
  const progressIndex = stageProgress(stage);
  const assertive = ["auth-create", "auth-reconcile", "auth-poll", "conflict", "processing-failed", "blocked"].includes(stage);
  return (
    <section
      className={`export-status tone-${meta.tone}`}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      aria-busy={["queued", "running", "processing", "reconciling"].includes(stage)}
      tabIndex={-1}
    >
      <div className="status-heading">
        <span className="status-icon"><Icon className={stage === "processing" || stage === "reconciling" ? "spin" : ""} aria-hidden="true" /></span>
        <div><strong>{meta.title}</strong><p>{meta.body}</p></div>
        <small>{freshnessLabel(stage, unresolvedNote, statusUpdatedAt)}</small>
      </div>

      {["queued", "waiting", "running", "processing", "auth-poll", "succeeded"].includes(stage) && (
        <ol className="status-timeline" aria-label="Export progress">
          {timeline.map((step, index) => (
            <li key={step} className={index < progressIndex ? "is-complete" : index === progressIndex ? "is-current" : ""}>
              <span>{index < progressIndex ? <Check aria-hidden="true" /> : index + 1}</span>
              <small>{step}</small>
            </li>
          ))}
        </ol>
      )}

      {unresolvedNote && stage === "reconciling" && (
        <p className="unresolved-note"><Clock3 aria-hidden="true" /> Still unresolved. No new create will be attempted; check again later.</p>
      )}

      {recoveryDisclosure && (
        <p className="unresolved-note" role="note"><ShieldCheck aria-hidden="true" /> {recoveryDisclosure}</p>
      )}

      <div className="status-actions">
        {(stage === "queued" || stage === "waiting") && <button className="quiet-button danger-text" onClick={onCancel}>Cancel export</button>}
        {stage === "waiting" && <button className="primary-button" onClick={onConnectorOnline}>Bring connector online</button>}
        {(stage === "auth-create" || stage === "auth-reconcile" || stage === "auth-poll") && <button className="primary-button" onClick={onReconnect}>Reconnect on this device</button>}
        {stage === "reconciling" && (
          <>
            <button className="primary-button" onClick={onSourceFound}>Simulate source found</button>
            <button className="quiet-button" onClick={onStayUnresolved}>Keep unresolved</button>
            <button className="quiet-button danger-text" onClick={onExplainRecovery}>Stop checking + purge temporary copy</button>
          </>
        )}
        {(stage === "succeeded" || stage === "already" || stage === "cancelled") && <button className="quiet-button" onClick={onReset}>Replay scenario</button>}
        {stage === "conflict" && <button className="quiet-button" onClick={onExplainRecovery}>Show safe recovery</button>}
        {stage === "blocked" && <button className="quiet-button" onClick={onExplainRecovery}>Show capacity steps</button>}
        {stage === "processing-failed" && <button className="quiet-button" onClick={onExplainRecovery}>Show failure details</button>}
        {((scenario.id === "uncertain" && stage === "reconciling") || stage === "conflict" || stage === "processing-failed") && (
          <span className="no-retry-label">New create intentionally absent</span>
        )}
      </div>
    </section>
  );
}

function ExportModal({
  kind,
  mobile,
  limitedConfirmed,
  onLimitedConfirmed,
  onClose,
  onConfirm,
}: {
  kind: Exclude<ModalKind, null>;
  mobile: boolean;
  limitedConfirmed: boolean;
  onLimitedConfirmed: (checked: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const payloadOnly = kind === "payload";
  const changed = kind === "changed";
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const dialog = dialogRef.current;
    if (!backdrop || !dialog) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const hiddenSiblings: Array<{
      element: HTMLElement;
      ariaHidden: string | null;
      inert: boolean;
    }> = [];
    let current: HTMLElement = backdrop;

    while (current.parentElement) {
      const parent = current.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (sibling === current || !(sibling instanceof HTMLElement)) return;
        hiddenSiblings.push({
          element: sibling,
          ariaHidden: sibling.getAttribute("aria-hidden"),
          inert: sibling.inert,
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      });
      if (parent === document.body) break;
      current = parent;
    }

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    const focusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const initialFocusFrame = window.requestAnimationFrame(() => {
      if (closeButtonRef.current) closeButtonRef.current.focus();
      else dialog.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = focusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !dialog.contains(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !dialog.contains(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      if (dialog.contains(event.target as Node)) return;
      const first = focusableElements()[0];
      if (first) first.focus();
      else dialog.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      hiddenSiblings.reverse().forEach(({ element, ariaHidden, inert }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;

      const returnTarget = returnFocusRef.current;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected && !returnTarget.matches(":disabled")) {
          returnTarget.focus();
          return;
        }
        document.querySelector<HTMLElement>(".export-status")?.focus();
      });
    };
  }, [onClose]);

  return (
    <div ref={backdropRef} className="modal-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section
        ref={dialogRef}
        className={`export-modal${mobile ? " export-modal--mobile" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-modal-title"
        tabIndex={-1}
      >
        <header>
          <div className="modal-symbol"><BookOpen aria-hidden="true" /></div>
          <div>
            <span className="section-kicker">Static copied-text source</span>
            <h2 id="export-modal-title">
              {payloadOnly ? "What leaves AI Memory" : changed ? "Export an updated version?" : "Export the limited text?"}
            </h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label="Close dialog"><X aria-hidden="true" /></button>
        </header>

        {!payloadOnly && (
          <div className={`modal-notice${changed ? " tone-info" : " tone-warning"}`}>
            <AlertTriangle aria-hidden="true" />
            <p>{changed
              ? "The saved item changed after its last successful export. This creates a new source; the previous source remains in NotebookLM."
              : "AI Memory did not capture the full source. NotebookLM will receive only the text visible on this item—not the full article."}</p>
          </div>
        )}

        <div className="modal-target-row">
          <span>Fixed destination</span>
          <strong><BookOpen aria-hidden="true" /> Private NotebookLM target · Private</strong>
          <small>Exact URL and notebook title remain in the local connector</small>
        </div>

        <div className="payload-grid">
          <div className="payload-column is-sent">
            <span className="mini-label"><Check aria-hidden="true" /> Sent</span>
            <ul>
              <li>Title</li>
              <li>Saved content body</li>
              <li>Author and publication date, when present</li>
              <li>Full title remains in copied text; display title alone may shorten to 180 characters</li>
            </ul>
          </div>
          <div className="payload-column is-excluded">
            <span className="mini-label"><X aria-hidden="true" /> Not sent</span>
            <ul>
              <li>AI summaries, quotes, chats, and private notes</li>
              <li>AI Memory, user, or database identifiers</li>
              <li>Every source URL, plus thumbnails and temporary media paths</li>
              <li>Google cookies, notebook IDs, and source IDs</li>
            </ul>
          </div>
        </div>

        <div className="privacy-disclosure">
          <ShieldCheck aria-hidden="true" />
          <p>Your Google session stays on this device. The complete payload must fit 200,000 UTF-8 bytes and 50,000 normalized words; nothing is truncated. A short opaque recovery code supports read-only recovery.</p>
        </div>

        {kind === "limited" && (
          <label className="confirmation-check">
            <input type="checkbox" checked={limitedConfirmed} onChange={(event) => onLimitedConfirmed(event.target.checked)} />
            <span><strong>I understand.</strong> Export only the limited text shown in AI Memory.</span>
          </label>
        )}

        <footer>
          <button className="quiet-button" onClick={onClose}>{payloadOnly ? "Close" : "Cancel"}</button>
          {!payloadOnly && (
            <button className="primary-button" onClick={onConfirm} disabled={kind === "limited" && !limitedConfirmed}>
              <Send aria-hidden="true" /> {changed ? "Export updated version" : "Export limited text"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function primaryButtonLabel(stage: ExportStage, scenario: ScenarioDefinition) {
  if (stage === "succeeded") return "Exported";
  if (stage === "already") return "Already exported";
  if (stage === "queued" || stage === "waiting") return "Queued";
  if (stage === "running") return "Sending…";
  if (stage === "processing") return "Processing…";
  if (stage === "reconciling") return "Checking delivery…";
  if (stage === "auth-create") return "Reconnect above";
  if (stage === "auth-reconcile") return "Reconnect above to check";
  if (stage === "auth-poll") return "Reconnect above to finish";
  if (stage === "conflict") return "Export paused";
  if (stage === "processing-failed") return "No automatic replacement";
  if (stage === "blocked") return "Export unavailable";
  if (scenario.id === "changed") return "Export updated version";
  return "Export to NotebookLM";
}

function connectorStatusLabel(scenario: ScenarioDefinition, stage: ExportStage) {
  if (stage === "blocked") return "Capacity blocked";
  if (stage === "auth-create" || stage === "auth-reconcile" || stage === "auth-poll" || scenario.connector === "attention") return "Attention needed";
  if (stage === "waiting" || scenario.connector === "offline") return "Desktop offline";
  return "Desktop online";
}

function stageProgress(stage: ExportStage) {
  if (stage === "queued" || stage === "waiting") return 0;
  if (stage === "running") return 1;
  if (stage === "processing" || stage === "auth-poll" || stage === "processing-failed") return 2;
  if (stage === "succeeded") return 3;
  return 0;
}

function freshnessLabel(stage: ExportStage, unresolved: boolean, updatedAt: number) {
  const time = new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  switch (stage) {
    case "queued":
      return `Queued at ${time}`;
    case "waiting":
      return `Connector checked at ${time} · offline`;
    case "running":
      return `Send started at ${time}`;
    case "processing":
      return `Provider checked at ${time}`;
    case "succeeded":
    case "already":
      return `Ready confirmed at ${time}`;
    case "auth-create":
    case "auth-reconcile":
    case "auth-poll":
      return `Session checked at ${time}`;
    case "reconciling":
      return unresolved ? `Last recovery check ${time} · unresolved` : `Recovery check started at ${time}`;
    case "conflict":
      return `Conflict confirmed at ${time}`;
    case "processing-failed":
      return `Failure confirmed at ${time}`;
    case "changed":
      return `Saved version checked at ${time}`;
    case "blocked":
      return `Capacity checked at ${time}`;
    case "cancelled":
      return `Cancelled at ${time}`;
    case "idle":
      return `Ready checked at ${time}`;
  }
}

function recoveryDisclosureFor(stage: ExportStage) {
  if (stage === "conflict") {
    return "Prototype recovery: compare the matching source titles in NotebookLM. AI Memory keeps this request paused and will neither create nor delete anything automatically.";
  }
  if (stage === "blocked") {
    return "Prototype connector settings: restore the destination’s protected headroom or deliberately bind a different notebook. This request remains blocked; nothing was sent.";
  }
  if (stage === "processing-failed") {
    return "Prototype recovery: inspect the recorded failed source in NotebookLM. AI Memory will not create a replacement or remove the remote source in V1.";
  }
  if (stage === "reconciling") {
    return "V1 stop-checking confirmation: server recovery stops and temporary AI Memory content is purged. Any matching unresolved Chrome journal remains until the owner performs the separately warned emergency local clear. A source may still exist in NotebookLM; no remote deletion is claimed.";
  }
  return "This request remains paused. The prototype does not perform another create while delivery is unresolved.";
}
