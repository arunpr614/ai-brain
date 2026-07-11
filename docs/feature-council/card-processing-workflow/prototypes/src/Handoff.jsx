import { useEffect, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  FileCode2,
  LockKeyhole,
  Monitor,
  Moon,
  RotateCcw,
  Route,
  Rows3,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react";

const GROUP_OPTIONS = [
  ["status", "Workflow status"],
  ["user_tag", "Primary user tag"],
  ["ai_topic", "Primary AI topic"],
  ["source_type", "Source type"],
  ["channel", "Capture channel"],
  ["quality", "Capture quality"],
  ["age", "Capture age"],
  ["none", "No grouping"],
];

const SORT_OPTIONS = [
  ["custom", "Custom order"],
  ["oldest", "Oldest captured"],
  ["newest", "Newest captured"],
  ["title_asc", "Title A–Z"],
  ["title_desc", "Title Z–A"],
  ["status", "Workflow status"],
  ["source_type", "Source type"],
  ["channel", "Capture channel"],
];

const darkBoard = new URL("../screenshots/direction-b-board-group-sort-menu-compact-dark-1440x1024.jpg", import.meta.url).href;
const lightList = new URL("../screenshots/direction-b-list-group-sort-menu-compact-light-1440x1024.jpg", import.meta.url).href;
const densityComparison = new URL("../screenshots/direction-b-group-sort-density-reference-feedback-revised.png", import.meta.url).href;
const mobileBoard = new URL("../screenshots/direction-b-board-group-sort-menu-compact-mobile-dark-390x844.jpg", import.meta.url).href;

const MEASUREMENTS = [
  ["Desktop trigger", "36px high · 238px minimum width", "Aligns to compact utility controls beside 40px filters"],
  ["Desktop popover", "322 × 148px", "Two 50px rows plus a 32px reset row and 6px padding"],
  ["Popover labels", "13px / 650", "Group by and Sort by"],
  ["Popover values", "12px / regular", "Right-aligned, native select affordance"],
  ["Popover icons", "18px · 1.8 stroke", "Lucide Rows3 and ArrowDownWideNarrow"],
  ["Radius", "8px trigger · 12px popover", "Existing small/medium product radii"],
  ["Mobile trigger", "44px high", "Retains minimum touch target"],
  ["Mobile popover", "Full width · 156px high", "Static in flow; no viewport overflow"],
];

const LOCKED_DECISIONS = [
  ["Direction", "Direction B — Processing, Inbox-first — is approved for continued exploration."],
  ["Shared model", "Board and List use the same Group & sort options, labels, defaults, and URL contract."],
  ["Status safety", "Only Workflow status grouping supports pointer drag. Every other grouping is view-only."],
  ["Appearance", "Light and Dark are intentionally designed modes with identical information and behavior."],
  ["Density", "Organization is a compact utility control, never a primary task surface or oversized sheet on desktop."],
  ["Classification", "The feature remains Explored — not implemented. No production work is authorized by these assets."],
];

const ROUTES = [
  ["Approved dark Board", "/direction-b.html?view=board&group=status&sort=newest&theme=dark"],
  ["Taxonomy-grouped Board", "/direction-b.html?view=board&group=ai_topic&sort=title_asc&theme=dark"],
  ["Approved light List", "/direction-b.html?view=list&group=ai_topic&sort=title_asc&theme=light"],
  ["Source-type List", "/direction-b.html?view=list&group=source_type&sort=newest&theme=dark"],
  ["Compact component specimen", "/group-sort-specimen.html"],
  ["AI agent pickup", "/agent-pickup.html"],
];

function labelFor(options, value) {
  return options.find(([id]) => id === value)?.[1] ?? value;
}

function ThemeControl({ theme, setTheme }) {
  return (
    <div className="handoff-theme" aria-label="Handoff appearance">
      <button type="button" aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun aria-hidden="true" />Light</button>
      <button type="button" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon aria-hidden="true" />Dark</button>
    </div>
  );
}

function HandoffHeader({ page, theme, setTheme }) {
  const nav = [
    ["overview", "Design handoff", "/design-handoff.html"],
    ["specimen", "Component specimen", "/group-sort-specimen.html"],
    ["pickup", "AI agent pickup", "/agent-pickup.html"],
  ];
  return (
    <>
      <a className="skip-link" href="#handoff-main">Skip to handoff content</a>
      <div className="handoff-status"><strong>Approved design record</strong><span>Direction B · Explored — not implemented</span><a href="/direction-b.html?view=board&group=status&sort=newest&theme=dark">Open prototype <ExternalLink aria-hidden="true" /></a></div>
      <header className="handoff-header">
        <div>
          <p className="eyebrow">Card Processing Workflow</p>
          <h1>{page === "overview" ? "Direction B design handoff" : page === "specimen" ? "Group & sort component specimen" : "AI agent pickup guide"}</h1>
          <p>{page === "overview" ? "The approved visual and interaction contract, captured for implementation continuity." : page === "specimen" ? "Runnable Light and Dark states with exact dimensions, options, and behavior." : "A cold-start map of what is locked, where truth lives, and what remains unproven."}</p>
        </div>
        <ThemeControl theme={theme} setTheme={setTheme} />
      </header>
      <nav className="handoff-nav" aria-label="Handoff assets">
        {nav.map(([id, label, href]) => <a key={id} className={page === id ? "active" : ""} aria-current={page === id ? "page" : undefined} href={href}>{label}</a>)}
      </nav>
    </>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return <div className="handoff-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}

function MiniOrganizationControl({ previewTheme = "dark", open = true, defaultGroup = "ai_topic", defaultSort = "title_asc", variantLabel = `${previewTheme} desktop` }) {
  const [groupBy, setGroupBy] = useState(defaultGroup);
  const [sortBy, setSortBy] = useState(defaultSort);
  function reset() {
    setGroupBy("status");
    setSortBy("oldest");
  }
  return (
    <div className="specimen-surface" data-preview-theme={previewTheme}>
      <div className="specimen-context"><span>User tags</span><b>All</b><span>AI topics</span><b>All</b></div>
      <details className="specimen-menu" open={open}>
        <summary><ArrowUpDown aria-hidden="true" /><span>Group &amp; sort</span><b>{labelFor(GROUP_OPTIONS, groupBy)} · {labelFor(SORT_OPTIONS, sortBy)}</b></summary>
        <div className="specimen-popover">
          <label>
            <Rows3 aria-hidden="true" />
            <strong>Group by</strong>
            <select aria-label={`${variantLabel} specimen group by`} value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
              {GROUP_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label>
            <ArrowDownWideNarrow aria-hidden="true" />
            <strong>Sort by</strong>
            <select aria-label={`${variantLabel} specimen sort by`} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <button type="button" onClick={reset}><RotateCcw aria-hidden="true" />Reset to Status · Oldest</button>
        </div>
      </details>
    </div>
  );
}

function OverviewPage() {
  return (
    <main id="handoff-main" className="handoff-main" tabIndex="-1">
      <section className="handoff-hero">
        <div>
          <p className="eyebrow">Stakeholder-approved checkpoint</p>
          <h2>Compact organization, shared across Board and List.</h2>
          <p>The design is locked around a small utility trigger, a two-row menu, comprehensive options, explicit status safety, and intentional Light/Dark parity.</p>
          <div className="handoff-actions"><a className="handoff-primary" href="/direction-b.html?view=board&group=status&sort=newest&theme=dark">Review approved Board <ExternalLink aria-hidden="true" /></a><a href="/group-sort-specimen.html">Inspect component anatomy</a></div>
        </div>
        <figure><img src={darkBoard} alt="Approved Direction B dark Board with compact Group and sort menu open" /><figcaption>Approved dark Board · Workflow status · Newest captured</figcaption></figure>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Design decision" title="What is locked" description="Change these only after a new stakeholder decision is recorded." />
        <div className="decision-grid-handoff">{LOCKED_DECISIONS.map(([title, body]) => <article key={title}><LockKeyhole aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}</div>
      </section>

      <section className="handoff-section split-section">
        <div>
          <SectionHeading eyebrow="Exact specification" title="Component measurements" description="Values are CSS-pixel targets from the approved prototype." />
          <div className="measurement-table" role="table" aria-label="Approved component measurements">
            {MEASUREMENTS.map(([part, value, reason]) => <div role="row" key={part}><strong role="cell">{part}</strong><b role="cell">{value}</b><span role="cell">{reason}</span></div>)}
          </div>
        </div>
        <div className="live-mini-spec"><h3>Live approved specimen</h3><p>Change either select; Reset returns to Status · Oldest.</p><MiniOrganizationControl /><a href="/group-sort-specimen.html">Open all component states <ExternalLink aria-hidden="true" /></a></div>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Visual evidence" title="Why the density changed" description="The comparison records the original pattern, the rejected oversized state, and the approved correction." />
        <figure className="wide-evidence"><img src={densityComparison} alt="Existing compact pattern, oversized feedback state, and revised compact implementation compared side by side" /><figcaption>Density comparison used for the final QA pass.</figcaption></figure>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Review matrix" title="Canonical states" description="Use these exact URLs when reviewing or extending the design." />
        <div className="route-grid">{ROUTES.map(([label, href]) => <a href={href} key={href}><Route aria-hidden="true" /><span><strong>{label}</strong><small>{href}</small></span><ExternalLink aria-hidden="true" /></a>)}</div>
      </section>

      <section className="handoff-section evidence-grid">
        <figure><img src={lightList} alt="Approved Direction B light List with compact Group and sort menu open" /><figcaption>Light List parity</figcaption></figure>
        <figure className="mobile-evidence"><img src={mobileBoard} alt="Approved Direction B mobile Board with compact Group and sort menu open" /><figcaption>390×844 mobile behavior</figcaption></figure>
      </section>

      <section className="handoff-section guardrail-section">
        <ShieldCheck aria-hidden="true" />
        <div><p className="eyebrow">Implementation guardrail</p><h2>This remains exploration evidence.</h2><p>Do not infer authorization for production routes, schema, APIs, migration, persistence, analytics, feature flags, or rollout. Begin with the pickup guide and existing v2 no-go gates.</p></div>
        <a href="/agent-pickup.html">Open AI agent pickup</a>
      </section>
    </main>
  );
}

function SpecimenPage() {
  return (
    <main id="handoff-main" className="handoff-main" tabIndex="-1">
      <section className="handoff-intro"><p className="eyebrow">Runnable HTML asset</p><h2>One component contract, two intentional appearances.</h2><p>The controls below are functional. They use the approved dimensions and the same native select/reset interaction as the Direction B prototype.</p></section>

      <section className="specimen-grid">
        <article data-testid="specimen-dark-open"><div className="specimen-title"><Moon aria-hidden="true" /><span><strong>Dark · open</strong><small>Approved desktop menu</small></span></div><MiniOrganizationControl previewTheme="dark" open variantLabel="dark desktop open" /></article>
        <article data-testid="specimen-light-open"><div className="specimen-title"><Sun aria-hidden="true" /><span><strong>Light · open</strong><small>Intentional token mapping</small></span></div><MiniOrganizationControl previewTheme="light" open defaultGroup="status" defaultSort="newest" variantLabel="light desktop open" /></article>
        <article className="closed-specimen" data-testid="specimen-desktop-closed"><div className="specimen-title"><Monitor aria-hidden="true" /><span><strong>Desktop · closed</strong><small>36px compact trigger</small></span></div><MiniOrganizationControl previewTheme="dark" open={false} defaultGroup="source_type" defaultSort="oldest" variantLabel="dark desktop closed" /></article>
        <article className="mobile-specimen" data-testid="specimen-mobile-open"><div className="specimen-title"><Smartphone aria-hidden="true" /><span><strong>Mobile · open</strong><small>44px trigger, menu in flow</small></span></div><MiniOrganizationControl previewTheme="dark" open defaultGroup="user_tag" defaultSort="title_desc" variantLabel="dark mobile open" /></article>
      </section>

      <section className="handoff-section split-section">
        <div>
          <SectionHeading eyebrow="Option inventory" title="Grouping" />
          <ol className="option-list">{GROUP_OPTIONS.map(([, label], index) => <li key={label}><span>{index + 1}</span>{label}{index === 0 && <b>Status drag only</b>}</li>)}</ol>
        </div>
        <div>
          <SectionHeading eyebrow="Option inventory" title="Sorting" />
          <ol className="option-list">{SORT_OPTIONS.map(([, label], index) => <li key={label}><span>{index + 1}</span>{label}{index === 1 && <b>Default</b>}</li>)}</ol>
        </div>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Anatomy" title="DOM and interaction contract" description="Prefer native semantics; do not replace the select controls with a custom menu without a separate accessibility review." />
        <div className="contract-grid">
          <article><Rows3 aria-hidden="true" /><h3>Container</h3><p>Native <code>details</code> and <code>summary</code>. Summary contains one icon, label, and truncated current-value summary.</p></article>
          <article><ArrowDownWideNarrow aria-hidden="true" /><h3>Rows</h3><p>Each row is a native <code>label</code> with a Lucide icon, strong label, and native <code>select</code>.</p></article>
          <article><RotateCcw aria-hidden="true" /><h3>Reset</h3><p>Reset is a real button. It sets Group to Workflow status and Sort to Oldest captured.</p></article>
          <article><ShieldCheck aria-hidden="true" /><h3>Status safety</h3><p>Non-status grouping reorganizes layout only. Move controls remain the workflow-state mutation path.</p></article>
        </div>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Acceptance criteria" title="The component is complete when" />
        <ul className="acceptance-list">
          <li><CheckCircle2 aria-hidden="true" />Board and List share the exact same option arrays and defaults.</li>
          <li><CheckCircle2 aria-hidden="true" />URL state persists <code>group</code>, <code>sort</code>, and <code>theme</code>.</li>
          <li><CheckCircle2 aria-hidden="true" />Desktop measurements remain 36px trigger, 322px popover, and 50px rows.</li>
          <li><CheckCircle2 aria-hidden="true" />Mobile trigger remains at least 44px and causes no horizontal document overflow at 390px.</li>
          <li><CheckCircle2 aria-hidden="true" />Keyboard, touch, pointer, and native screen-reader paths do not depend on drag.</li>
          <li><CheckCircle2 aria-hidden="true" />Both Light and Dark states retain equivalent hierarchy and legibility.</li>
        </ul>
      </section>
    </main>
  );
}

function CopyCommand({ children }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <div className="command-row"><code>{children}</code><button type="button" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy"}</button></div>;
}

function PickupPage() {
  const files = [
    ["Prototype behavior", "src/App.jsx", "Group/sort option model, Board/List organization, themes, movement safety"],
    ["Approved visual values", "src/styles.css", "Exact compact dimensions and Light/Dark tokens"],
    ["HTML handoff routes", "design-handoff.html · group-sort-specimen.html · agent-pickup.html", "Runnable agent-facing assets"],
    ["Handoff UI", "src/Handoff.jsx · src/handoff.css", "Specs, specimens, state links, and pickup instructions"],
    ["Durable decisions", "AGENTS.md · ../decisions/decision-log.md", "Approved direction, density, and no-change guardrails"],
    ["Visual QA", "design-qa.md · screenshots/", "Comparison history and approved evidence"],
    ["Product/UX contract", "../product/prd-v2.md · ../ux/ux-ui-v2.md", "Scope, jobs, behaviors, accessibility, and no-go gates"],
    ["Technical proposal", "../technical/technical-plan-v2.md", "Exploration-stage data/API/migration plan; not implementation authorization"],
  ];
  return (
    <main id="handoff-main" className="handoff-main" tabIndex="-1">
      <section className="pickup-hero">
        <div><p className="eyebrow">Cold-start handoff</p><h2>Start here; do not reconstruct the design from chat history.</h2><p>This package records the approved Direction B design, the rejected oversized state, the exact compact correction, and the remaining implementation gates.</p></div>
        <div className="pickup-facts"><span><strong>Branch</strong>concept/card-processing-workflow</span><span><strong>Review</strong>PR #21 · review-only</span><span><strong>Status</strong>Explored — not implemented</span><a href="https://github.com/arunpr614/ai-brain/pull/21">Open PR <ExternalLink aria-hidden="true" /></a></div>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="First 10 minutes" title="Cold-start sequence" description="Follow this order before changing any prototype or specification file." />
        <ol className="pickup-steps">
          <li><span>1</span><div><strong>Confirm repository state</strong><p>Use the exact feature worktree and branch. Do not work from an unrelated checkout.</p><CopyCommand>git status --short &amp;&amp; git branch --show-current &amp;&amp; git log -5 --oneline</CopyCommand></div></li>
          <li><span>2</span><div><strong>Read local instructions and the final decisions</strong><p>Start with <code>prototypes/AGENTS.md</code>, this pickup page, the decision log, UX v2, and design QA.</p></div></li>
          <li><span>3</span><div><strong>Run only the isolated prototype</strong><p>No production application change is part of this handoff.</p><CopyCommand>cd docs/feature-council/card-processing-workflow/prototypes &amp;&amp; npm ci &amp;&amp; npm run dev -- --host 127.0.0.1 --port 4173</CopyCommand></div></li>
          <li><span>4</span><div><strong>Open the canonical design assets</strong><p>Review the design handoff, live component specimen, and approved Direction B Board/List states.</p></div></li>
          <li><span>5</span><div><strong>Re-run gates after any change</strong><CopyCommand>npm run build --prefix docs/feature-council/card-processing-workflow/prototypes &amp;&amp; npm run check:agent-docs</CopyCommand></div></li>
        </ol>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Source map" title="Where each kind of truth lives" />
        <div className="file-map">{files.map(([label, path, purpose]) => <article key={path}><FileCode2 aria-hidden="true" /><div><h3>{label}</h3><code>{path}</code><p>{purpose}</p></div></article>)}</div>
      </section>

      <section className="handoff-section split-section">
        <div>
          <SectionHeading eyebrow="Preserve" title="Locked implementation intent" />
          <ul className="rule-list preserve-list">
            <li><CheckCircle2 aria-hidden="true" />Direction B remains Inbox-first; Board and List are secondary views.</li>
            <li><CheckCircle2 aria-hidden="true" />Shared eight-option Group and Sort models.</li>
            <li><CheckCircle2 aria-hidden="true" />Compact desktop density and 44px mobile trigger.</li>
            <li><CheckCircle2 aria-hidden="true" />Light/Dark parity and shareable URL state.</li>
            <li><CheckCircle2 aria-hidden="true" />Non-status grouping never mutates status.</li>
            <li><CheckCircle2 aria-hidden="true" />Native Move controls remain the universal non-drag path.</li>
          </ul>
        </div>
        <div>
          <SectionHeading eyebrow="Do not infer" title="Not authorized by this handoff" />
          <ul className="rule-list stop-list">
            <li><LockKeyhole aria-hidden="true" />Production UI implementation or merge.</li>
            <li><LockKeyhole aria-hidden="true" />Schema, migration, API, or background-worker changes.</li>
            <li><LockKeyhole aria-hidden="true" />Feature flags, rollout, analytics, or live data.</li>
            <li><LockKeyhole aria-hidden="true" />Manual ranking, batch operations, or project-management fields.</li>
            <li><LockKeyhole aria-hidden="true" />Replacing native select semantics with a custom unreviewed menu.</li>
            <li><LockKeyhole aria-hidden="true" />Removing remaining accessibility, scale, concurrency, or migration gates.</li>
          </ul>
        </div>
      </section>

      <section className="handoff-section">
        <SectionHeading eyebrow="Required next evidence" title="Before production implementation can be authorized" />
        <div className="gate-grid">
          <article><ClipboardList aria-hidden="true" /><h3>Task usability</h3><p>Validate option breadth, defaults, terminology, and whether users can predict view-only grouping.</p></article>
          <article><ShieldCheck aria-hidden="true" /><h3>Trust contracts</h3><p>Prove CAS/idempotency, lost-response recovery, archive matrix, Undo metrics, and hard-delete behavior.</p></article>
          <article><Monitor aria-hidden="true" /><h3>Scale</h3><p>Prove 10k/50k query plans, bounded DTOs, pagination, and focus-safe virtualization.</p></article>
          <article><Smartphone aria-hidden="true" /><h3>Accessibility</h3><p>Run manual AT, switch, 320px, zoom/reflow, forced colors, text spacing, and real-device checks.</p></article>
        </div>
      </section>

      <section className="handoff-section final-checklist">
        <SectionHeading eyebrow="Handoff acceptance" title="A future AI agent has picked up correctly when" />
        <ol><li>It can name Direction B and the compact density values without consulting chat history.</li><li>It can open all three HTML handoff assets and the canonical prototype routes.</li><li>It understands that non-status grouping is view-only and that status drag is status-group-only.</li><li>It preserves the Explored — not implemented classification and asks for new authority before production work.</li><li>Its change passes the isolated build, browser visual QA, and repository documentation checks.</li></ol>
      </section>
    </main>
  );
}

export function HandoffApp({ page }) {
  const [theme, setTheme] = useState("dark");
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return (
    <div className="handoff-shell">
      <HandoffHeader page={page} theme={theme} setTheme={setTheme} />
      {page === "specimen" ? <SpecimenPage /> : page === "pickup" ? <PickupPage /> : <OverviewPage />}
      <footer className="handoff-footer"><span>Direction B approved design record · 2026-07-11</span><span>Card Processing Workflow · Explored — not implemented</span></footer>
    </div>
  );
}
