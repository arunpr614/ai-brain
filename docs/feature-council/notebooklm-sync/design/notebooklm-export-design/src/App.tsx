import { useState } from "react";
import {
  BookOpen,
  Boxes,
  Cable,
  CheckCircle2,
  FileText,
  FlaskConical,
  MousePointerClick,
  ShieldCheck,
} from "lucide-react";
import { ConnectorSetup } from "./ConnectorSetup";
import { ItemPrototype } from "./ItemPrototype";
import { Specification } from "./Specification";
import { SystemDesign } from "./SystemDesign";
import type { DeviceMode, ScenarioId, SectionId } from "./model";

const sections: Array<{
  id: SectionId;
  label: string;
  eyebrow: string;
  icon: typeof BookOpen;
}> = [
  { id: "experience", label: "Item experience", eyebrow: "Interactive", icon: MousePointerClick },
  { id: "connector", label: "Connector setup", eyebrow: "Local", icon: Cable },
  { id: "system", label: "System design", eyebrow: "Architecture", icon: Boxes },
  { id: "spec", label: "Specification", eyebrow: "Handoff", icon: FileText },
];

function App() {
  const [section, setSection] = useState<SectionId>("experience");
  const [scenario, setScenario] = useState<ScenarioId>("happy");
  const [device, setDevice] = useState<DeviceMode>("desktop");

  return (
    <div className="artifact-shell">
      <header className="artifact-header">
        <div className="artifact-brand">
          <div className="artifact-mark" aria-hidden="true"><BookOpen /><span /></div>
          <div>
            <span className="section-kicker">AI Memory · Consumer NotebookLM</span>
            <strong>One-click export · implemented-candidate handoff</strong>
          </div>
        </div>
        <div className="artifact-summary">
          <span><FlaskConical aria-hidden="true" /> Implemented candidate</span>
          <span><ShieldCheck aria-hidden="true" /> No live connection</span>
          <span><CheckCircle2 aria-hidden="true" /> Contract + code aligned</span>
        </div>
      </header>

      <div className="hero-band">
        <div className="hero-copy">
          <span className="hero-index">IMPLEMENTED-CANDIDATE HANDOFF · 2026-07-22</span>
          <h1>Send one saved AI Memory item to one specified NotebookLM notebook.</h1>
          <p>
            A code-aligned interactive handoff for a deliberate one-item export—built around a durable queue,
            a local Chrome session boundary, and honest recovery when a provider write is uncertain.
          </p>
        </div>
        <div className="hero-decision">
          <span className="hero-score">V1</span>
          <div><span className="section-kicker">Implemented boundary</span><strong>Chrome MV3 connector</strong><p>Owner-only · exact local URL · private target</p></div>
        </div>
      </div>

      <nav className="document-nav" aria-label="Design document sections">
        {sections.map(({ id, label, eyebrow, icon: Icon }) => (
          <button
            key={id}
            className={section === id ? "is-active" : ""}
            onClick={() => setSection(id)}
            aria-current={section === id ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span><small>{eyebrow}</small><strong>{label}</strong></span>
          </button>
        ))}
      </nav>

      <main className="document-main">
        {section === "experience" && (
          <ItemPrototype
            scenarioId={scenario}
            onScenarioChange={setScenario}
            device={device}
            onDeviceChange={setDevice}
          />
        )}
        {section === "connector" && <ConnectorSetup />}
        {section === "system" && <SystemDesign />}
        {section === "spec" && <Specification />}
      </main>

      <footer className="document-footer">
        <div><BookOpen aria-hidden="true" /><span><strong>AI Memory × NotebookLM</strong><small>Implemented-candidate handoff</small></span></div>
        <p>
          This artifact mirrors the implemented candidate. It makes no live Google request and is not evidence of
          production deployment, a successful signed-in canary, or official consumer NotebookLM API support.
        </p>
        <span>PM contract · migration 026 · current API and UI contracts</span>
      </footer>
    </div>
  );
}

export default App;
