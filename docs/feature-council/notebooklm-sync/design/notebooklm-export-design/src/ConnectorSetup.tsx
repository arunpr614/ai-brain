import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Laptop,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Unplug,
  UserRoundCheck,
} from "lucide-react";

interface NotebookOption {
  id: string;
  label: string;
  detail: string;
  posture: "Private" | "Shared";
  headroom: string;
  blocked?: boolean;
}

const notebooks: NotebookOption[] = [
  {
    id: "product-strategy",
    label: "Product Strategy",
    detail: "Planning notes and market research",
    posture: "Private",
    headroom: "12 safe slots",
  },
  {
    id: "team-research",
    label: "Team Research",
    detail: "Shared with 6 collaborators",
    posture: "Shared",
    headroom: "8 safe slots",
  },
  {
    id: "reading-inbox",
    label: "Reading Inbox",
    detail: "Source reserve reached",
    posture: "Private",
    headroom: "0 safe slots",
    blocked: true,
  },
];

const steps = ["Permission", "Sign in", "Destination", "Verify", "Ready"];

export function ConnectorSetup() {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState("product-strategy");
  const [sharedAcknowledged, setSharedAcknowledged] = useState(false);
  const [managementAction, setManagementAction] = useState<"disable" | "rebind" | null>(null);
  const selected = useMemo(
    () => notebooks.find((notebook) => notebook.id === selectedId) ?? notebooks[0],
    [selectedId],
  );

  const canFinish = !selected.blocked && (selected.posture !== "Shared" || sharedAcknowledged);

  function chooseNotebook(id: string) {
    setSelectedId(id);
    setSharedAcknowledged(false);
  }

  return (
    <section className="connector-section">
      <div className="section-heading connector-heading">
        <div>
          <span className="section-kicker">Local-only setup journey</span>
          <h1>Bind one NotebookLM destination on this device</h1>
          <p>
            Notebook selection never appears on the AI Memory item page. The connector resolves one notebook,
            verifies its safety posture, and creates an immutable binding version.
          </p>
        </div>
        <div className="concept-badge"><Laptop aria-hidden="true" /> Preferred Chrome boundary</div>
      </div>

      <div className="connector-branch-note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>This walkthrough shows the preferred product credential boundary.</strong>
          <p>
            It uses AI Memory’s existing Chrome extension and Chrome’s signed-in session without copying cookies.
            A separately authorized synthetic feasibility spike may instead run pinned <code>notebooklm-py</code>
            in a desktop worker; that branch requires its own private local session vault, explicit purge, and a
            separate security review.
          </p>
        </div>
      </div>

      <div className="connector-workspace">
        <ol className="setup-steps" aria-label="Connector setup progress">
          {steps.map((label, index) => (
            <li key={label} className={index < step ? "is-complete" : index === step ? "is-current" : ""}>
              <button
                onClick={() => {
                  if (index <= step) {
                    setManagementAction(null);
                    setStep(index);
                  }
                }}
                disabled={index > step}
              >
                <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
                <div><strong>{label}</strong><small>{stepDescription(index)}</small></div>
              </button>
            </li>
          ))}
        </ol>

        <div className="connector-window">
          <header className="connector-titlebar">
            <div className="connector-app-icon"><BookOpen aria-hidden="true" /></div>
            <div><strong>AI Memory Connector</strong><span>Runs only on this device</span></div>
            <span className="local-pill"><LockKeyhole aria-hidden="true" /> Local</span>
          </header>

          <div className="connector-content">
            {step === 0 && (
              <SetupPanel
                icon={Globe}
                kicker="Narrow browser permission"
                title="Allow access to NotebookLM"
                body="The public product entrance is notebooklm.google; the signed-in app runs at notebooklm.google.com. The connector needs access only to that authenticated app host to inspect the notebook you specify, list its sources, add copied text, and check status. It never requests access to all websites or copies your Google cookies."
              >
                <div className="permission-card">
                  <div><Globe aria-hidden="true" /><span><strong>notebooklm.google.com</strong><small>Read and change data only on this host</small></span></div>
                  <span className="permission-state"><Check aria-hidden="true" /> Requested when used</span>
                </div>
                <button className="primary-button setup-primary" onClick={() => setStep(1)}>Allow in Chrome <ArrowRight aria-hidden="true" /></button>
              </SetupPanel>
            )}

            {step === 1 && (
              <SetupPanel
                icon={UserRoundCheck}
                kicker="Browser-managed Google session"
                title="Sign in to NotebookLM"
                body="Open NotebookLM and sign in on this device. AI Memory’s hosted server never receives your Google cookies, CSRF values, or browser profile."
              >
                <div className="session-diagram">
                  <div><Laptop aria-hidden="true" /><span>Your browser</span></div>
                  <ArrowRight aria-hidden="true" />
                  <div><BookOpen aria-hidden="true" /><span>NotebookLM</span></div>
                  <div className="server-away"><ShieldCheck aria-hidden="true" /><span>AI Memory server<br /><small>No Google session</small></span></div>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(0)}><ArrowLeft aria-hidden="true" /> Back</button>
                  <button className="primary-button" onClick={() => setStep(2)}>I’m signed in <ArrowRight aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 2 && (
              <SetupPanel
                icon={BookOpen}
                kicker="Immutable destination"
                title="Choose one destination"
                body="AI Memory exports only to this notebook until you deliberately change the binding. Existing sources never move when you rebind."
              >
                <div className="notebook-list" role="radiogroup" aria-label="Available notebooks">
                  {notebooks.map((notebook) => (
                    <button
                      key={notebook.id}
                      role="radio"
                      aria-checked={selectedId === notebook.id}
                      className={`notebook-option${selectedId === notebook.id ? " is-selected" : ""}${notebook.blocked ? " is-blocked" : ""}`}
                      onClick={() => chooseNotebook(notebook.id)}
                    >
                      <span className="radio-circle">{selectedId === notebook.id && <span />}</span>
                      <BookOpen aria-hidden="true" />
                      <span className="notebook-copy"><strong>{notebook.label}</strong><small>{notebook.detail}</small></span>
                      <span className={`posture posture-${notebook.posture.toLowerCase()}`}>{notebook.posture}</span>
                      <span className="headroom">{notebook.headroom}</span>
                    </button>
                  ))}
                </div>
                <p className="illustrative-note">Capacity values are illustrative. Production thresholds and reserve policy remain to be defined.</p>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(1)}><ArrowLeft aria-hidden="true" /> Back</button>
                  <button className="primary-button" onClick={() => setStep(3)}>Use this notebook <ArrowRight aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 3 && (
              <SetupPanel
                icon={ShieldCheck}
                kicker="Fail-closed health check"
                title={`Verify ${selected.label}`}
                body="The connector rechecks the account, exact notebook, sharing posture, and source headroom before a binding can become active."
              >
                <div className="verification-grid">
                  <VerificationItem label="Expected account" value="Matches" tone="success" />
                  <VerificationItem label="Notebook access" value="Available" tone="success" />
                  <VerificationItem label="Sharing posture" value={selected.posture} tone={selected.posture === "Shared" ? "warning" : "success"} />
                  <VerificationItem label="Safe headroom" value={selected.headroom} tone={selected.blocked ? "danger" : "success"} />
                </div>
                {selected.posture === "Shared" && !selected.blocked && (
                  <label className="confirmation-check shared-check">
                    <input type="checkbox" checked={sharedAcknowledged} onChange={(event) => setSharedAcknowledged(event.target.checked)} />
                    <span><strong>I understand who may read exports.</strong> People with access to {selected.label} may read the copied item text.</span>
                  </label>
                )}
                {selected.blocked && (
                  <div className="modal-notice tone-danger"><AlertTriangle aria-hidden="true" /><p>This notebook has reached AI Memory’s safety reserve. No real item can be exported here.</p></div>
                )}
                <div className="binding-preview">
                  <KeyRound aria-hidden="true" />
                  <div><strong>New immutable binding</strong><span>Friendly labels may be reused, but every rebind creates a new version and dedupe namespace.</span></div>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(2)}><ArrowLeft aria-hidden="true" /> Choose another</button>
                  <button className="primary-button" disabled={!canFinish} onClick={() => setStep(4)}>Finish setup <Check aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 4 && (
              <SetupPanel
                icon={CheckCircle2}
                kicker="Binding active"
                title="NotebookLM connected"
                body="AI Memory can now queue one-item exports for this device. The connector remains intentionally narrow and user-controlled."
              >
                <div className="ready-destination">
                  <div className="ready-orbit"><BookOpen aria-hidden="true" /><CheckCircle2 aria-hidden="true" /></div>
                  <div><span className="mini-label">Active destination</span><h3>{selected.label}</h3><p>{selected.posture} · Connector online · {selected.headroom}</p></div>
                </div>
                <div className="ready-rules">
                  <span><Check aria-hidden="true" /> Local Google session</span>
                  <span><Check aria-hidden="true" /> Server cannot change target</span>
                  <span><Check aria-hidden="true" /> One non-retried create</span>
                </div>
                <div className="management-safety-row">
                  <CheckCircle2 aria-hidden="true" />
                  <span><strong>Safe to manage</strong><small>0 queued, running, reconciling, or unresolved requests</small></span>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button danger-text" onClick={() => setManagementAction("disable")}><Unplug aria-hidden="true" /> Disable connector</button>
                  <button className="quiet-button" onClick={() => setManagementAction("rebind")}><RefreshCw aria-hidden="true" /> Change destination</button>
                </div>
                {managementAction && (
                  <section className="management-confirmation" aria-labelledby="management-confirmation-title">
                    <AlertTriangle aria-hidden="true" />
                    <div>
                      <h3 id="management-confirmation-title">
                        {managementAction === "disable" ? "Disable and revoke this connector?" : "Create a new destination binding?"}
                      </h3>
                      <p>
                        {managementAction === "disable"
                          ? "New claims pause first. Known in-flight work must reach a truthful terminal or unresolved state before the device token is revoked and the local session is purged. Existing NotebookLM sources remain in place."
                          : "Rebinding is blocked whenever queued, running, reconciling, or unresolved work exists. The new target receives a new binding version and dedupe namespace; existing NotebookLM sources never move or disappear."}
                      </p>
                      <div className="management-confirmation__actions">
                        <button className="quiet-button" onClick={() => setManagementAction(null)}>Keep current setup</button>
                        <button
                          className={`quiet-button${managementAction === "disable" ? " danger-text" : ""}`}
                          onClick={() => {
                            const action = managementAction;
                            setManagementAction(null);
                            setStep(action === "disable" ? 0 : 2);
                          }}
                        >
                          {managementAction === "disable" ? "Disable + purge local session" : "Create new binding"}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </SetupPanel>
            )}
          </div>
        </div>
      </div>

      <div className="connector-notes">
        <article>
          <span className="note-number">01</span>
          <div><h3>Setup and export are separate</h3><p>The local connector discovers notebooks. The item page receives only a safe label, posture, availability, and headroom state.</p></div>
        </article>
        <article>
          <span className="note-number">02</span>
          <div><h3>Unknown means blocked</h3><p>An unreadable sharing posture or uncertain capacity is never treated as private or available.</p></div>
        </article>
        <article>
          <span className="note-number">03</span>
          <div><h3>Changing target creates a boundary</h3><p>Rebinding is unavailable while work is outstanding. Existing NotebookLM sources remain where they are and are never silently moved or deleted.</p></div>
        </article>
      </div>

      <div className="blocking-examples">
        <div className="section-heading compact"><div><span className="section-kicker">Failure examples</span><h2>Conditions that stop setup or export</h2></div></div>
        <div className="blocking-grid">
          <BlockingCard icon={UserRoundCheck} title="Wrong Google account" body="Switch account and recheck. No item was sent." />
          <BlockingCard icon={ShieldCheck} title="Sharing unknown" body="Real AI Memory content remains blocked until posture can be verified." />
          <BlockingCard icon={AlertTriangle} title="Capacity reserve reached" body="Remove sources or deliberately choose another notebook." />
        </div>
      </div>
    </section>
  );
}

function SetupPanel({
  icon: Icon,
  kicker,
  title,
  body,
  children,
}: {
  icon: typeof BookOpen;
  kicker: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="setup-panel">
      <div className="setup-panel__heading">
        <span className="setup-icon"><Icon aria-hidden="true" /></span>
        <div><span className="section-kicker">{kicker}</span><h2>{title}</h2><p>{body}</p></div>
      </div>
      {children}
    </section>
  );
}

function VerificationItem({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "danger" }) {
  return (
    <div className={`verification-item tone-${tone}`}>
      {tone === "success" ? <CheckCircle2 aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function BlockingCard({ icon: Icon, title, body }: { icon: typeof BookOpen; title: string; body: string }) {
  return <article className="blocking-card"><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div><ExternalLink aria-hidden="true" /></article>;
}

function stepDescription(index: number) {
  return [
    "Narrow host access",
    "Keep session local",
    "Choose once",
    "Account + safety",
    "Binding active",
  ][index];
}
