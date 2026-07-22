import { useState } from "react";
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

type VerificationScenario = "private" | "shared" | "public" | "unknown" | "capacity";

const verificationScenarios: Array<{ id: VerificationScenario; label: string }> = [
  { id: "private", label: "Owner-private" },
  { id: "shared", label: "Shared" },
  { id: "public", label: "Public" },
  { id: "unknown", label: "Unknown" },
  { id: "capacity", label: "No safe slots" },
];

const steps = ["Permission", "Sign in", "Pair", "Destination", "Verify", "Ready"];

export function ConnectorSetup() {
  const [step, setStep] = useState(0);
  const [pairingCode, setPairingCode] = useState("ABCD-EFGH");
  const [notebookUrl, setNotebookUrl] = useState("https://notebooklm.google.com/notebook/123e4567-e89b-12d3-a456-426614174000");
  const [verificationScenario, setVerificationScenario] = useState<VerificationScenario>("private");
  const [managementAction, setManagementAction] = useState<"disable" | "rebind" | null>(null);
  const posture = verificationScenario === "private"
    ? "Private · owner-only"
    : verificationScenario === "capacity"
      ? "Private · owner-only"
      : verificationScenario === "unknown"
        ? "Not verified"
        : verificationScenario[0].toUpperCase() + verificationScenario.slice(1);
  const safeSlots = verificationScenario === "capacity" ? "0" : verificationScenario === "private" ? "12" : "Blocked";
  const canFinish = verificationScenario === "private";

  return (
    <section className="connector-section">
      <div className="section-heading connector-heading">
        <div>
          <span className="section-kicker">Local-only setup journey</span>
          <h1>Bind one NotebookLM destination on this device</h1>
          <p>
            Notebook selection never appears on the AI Memory item page. The owner pastes one exact notebook URL
            locally; the connector verifies it and creates an immutable binding version.
          </p>
        </div>
        <div className="concept-badge"><Laptop aria-hidden="true" /> Preferred Chrome boundary</div>
      </div>

      <div className="connector-branch-note">
        <ShieldCheck aria-hidden="true" />
        <div>
          <strong>This walkthrough mirrors the implemented Chrome-connector candidate.</strong>
          <p>
            The public sign-in entrance is <code>https://notebooklm.google/</code>. The authenticated app and optional
            host permission use <code>https://notebooklm.google.com/</code>. Google session data, the exact notebook URL,
            and its locally observed title stay in Chrome.
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
                body="The public product entrance is https://notebooklm.google/; the signed-in app runs at https://notebooklm.google.com/. The connector optionally requests only https://notebooklm.google.com/* to inspect the notebook you specify, list its sources, add copied text, and check status. It never requests access to all websites or copies your Google cookies."
              >
                <div className="permission-card">
                  <div><Globe aria-hidden="true" /><span><strong>https://notebooklm.google.com/*</strong><small>Read and change data only on this host</small></span></div>
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
                  <a className="quiet-button" href="https://notebooklm.google/" target="_blank" rel="noreferrer">Open public sign-in <ExternalLink aria-hidden="true" /></a>
                  <button className="primary-button" onClick={() => setStep(2)}>I’m signed in <ArrowRight aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 2 && (
              <SetupPanel
                icon={KeyRound}
                kicker="One-time Brain pairing"
                title="Pair this browser connector"
                body="Create a one-time code in AI Memory → Settings → Export to NotebookLM, then enter it here. The code is exchanged for a narrowly scoped connector credential stored only in Chrome and is discarded after use."
              >
                <div className="notebook-url-card">
                  <label htmlFor="pairing-code">One-time connector pairing code</label>
                  <div>
                    <KeyRound aria-hidden="true" />
                    <input
                      id="pairing-code"
                      type="text"
                      value={pairingCode}
                      onChange={(event) => setPairingCode(event.target.value)}
                      maxLength={9}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <p>Prototype format: eight letters or digits, displayed as <code>ABCD-EFGH</code>. The hosted server never receives the Google session.</p>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(1)}><ArrowLeft aria-hidden="true" /> Back</button>
                  <button className="primary-button" disabled={!pairingCode.trim()} onClick={() => setStep(3)}>Pair connector <ArrowRight aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 3 && (
              <SetupPanel
                icon={BookOpen}
                kicker="Immutable destination"
                title="Paste one exact notebook URL"
                body="Open the intended private notebook in the authenticated app, then paste its exact URL here. The connector does not list or enumerate any other notebooks."
              >
                <div className="notebook-url-card">
                  <label htmlFor="notebook-url">Exact authenticated notebook URL</label>
                  <div>
                    <BookOpen aria-hidden="true" />
                    <input
                      id="notebook-url"
                      type="url"
                      value={notebookUrl}
                      onChange={(event) => setNotebookUrl(event.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  <p>Accepted shape: <code>https://notebooklm.google.com/notebook/&lt;uuid&gt;</code>, with only optional numeric <code>?authuser=0…10</code>.</p>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(2)}><ArrowLeft aria-hidden="true" /> Back</button>
                  <button className="primary-button" disabled={!notebookUrl.trim()} onClick={() => setStep(4)}>Verify this URL <ArrowRight aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 4 && (
              <SetupPanel
                icon={ShieldCheck}
                kicker="Fail-closed health check"
                title="Verify the pasted notebook"
                body="The connector rechecks the expected Google subject, exact notebook, owner-only privacy, source occupancy, and protected headroom before activating a binding."
              >
                <div className="verification-preview" role="group" aria-label="Preview a connector verification result">
                  <span>Prototype result</span>
                  {verificationScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      className={verificationScenario === scenario.id ? "is-selected" : ""}
                      onClick={() => setVerificationScenario(scenario.id)}
                      aria-pressed={verificationScenario === scenario.id}
                    >
                      {scenario.label}
                    </button>
                  ))}
                </div>
                <div className="verification-grid">
                  <VerificationItem label="Expected account" value="Matches" tone="success" />
                  <VerificationItem label="Exact target" value="Matches pasted URL" tone="success" />
                  <VerificationItem label="Sharing posture" value={posture} tone={verificationScenario === "private" || verificationScenario === "capacity" ? "success" : "danger"} />
                  <VerificationItem label="Safe slots" value={safeSlots} tone={verificationScenario === "private" ? "success" : "danger"} />
                </div>
                {!canFinish && (
                  <div className="modal-notice tone-danger"><AlertTriangle aria-hidden="true" /><p>{verificationBlockMessage(verificationScenario)} There is no acknowledgement bypass.</p></div>
                )}
                <div className="binding-preview">
                  <KeyRound aria-hidden="true" />
                  <div><strong>Local detail, generic server label</strong><span>Chrome retains the exact URL and “Product Strategy” title. AI Memory receives only “Private NotebookLM target,” fingerprints, private health, and capacity.</span></div>
                </div>
                <div className="setup-action-row">
                  <button className="quiet-button" onClick={() => setStep(3)}><ArrowLeft aria-hidden="true" /> Edit URL</button>
                  <button className="primary-button" disabled={!canFinish} onClick={() => setStep(5)}>Finish setup <Check aria-hidden="true" /></button>
                </div>
              </SetupPanel>
            )}

            {step === 5 && (
              <SetupPanel
                icon={CheckCircle2}
                kicker="Binding active"
                title="NotebookLM connected"
                body="AI Memory can now queue one-item exports for this device. The connector remains intentionally narrow and user-controlled."
              >
                <div className="ready-destination">
                  <div className="ready-orbit"><BookOpen aria-hidden="true" /><CheckCircle2 aria-hidden="true" /></div>
                  <div><span className="mini-label">Local connector detail</span><h3>Product Strategy</h3><p>Private · owner-only · Connector online · 12 safe slots</p></div>
                </div>
                <div className="ready-rules">
                  <span><Check aria-hidden="true" /> Local Google session</span>
                  <span><Check aria-hidden="true" /> Server label stays generic</span>
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
                          ? "New claims pause first. Safe disconnect is blocked by nonterminal work or a duplicate conflict; a stopped terminal ambiguity may remain recorded. It revokes the scoped server credential and deactivates the target, but neither deletes remote sources nor clears separate Chrome-local connector state."
                          : "Rebinding is blocked whenever queued, sending, processing, reconciling, conflict, or other unresolved work exists. The new pasted URL receives a new binding version and dedupe namespace; existing sources never move or disappear."}
                      </p>
                      <div className="management-confirmation__actions">
                        <button className="quiet-button" onClick={() => setManagementAction(null)}>Keep current setup</button>
                        <button
                          className={`quiet-button${managementAction === "disable" ? " danger-text" : ""}`}
                          onClick={() => {
                            const action = managementAction;
                            setManagementAction(null);
                            setStep(action === "disable" ? 0 : 3);
                          }}
                        >
                          {managementAction === "disable" ? "Disconnect connector" : "Paste a new URL"}
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
          <div><h3>No notebook enumeration</h3><p>The owner pastes one exact URL locally. The item page receives only the generic label, posture, availability, and headroom state.</p></div>
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
          <BlockingCard icon={ShieldCheck} title="Shared, public, or unknown" body="Owner-only private verification is mandatory; consent cannot bypass the block." />
          <BlockingCard icon={AlertTriangle} title="Capacity reserve reached" body="Restore headroom or deliberately paste another private notebook URL." />
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
    "Exchange one-time code",
    "Paste exact URL",
    "Account + safety",
    "Binding active",
  ][index];
}

function verificationBlockMessage(scenario: VerificationScenario) {
  if (scenario === "shared") return "Shared notebooks are blocked in V1.";
  if (scenario === "public") return "Public notebooks are blocked in V1.";
  if (scenario === "unknown") return "An unknown sharing posture is blocked in V1.";
  return "The five-source safety reserve has been reached.";
}
