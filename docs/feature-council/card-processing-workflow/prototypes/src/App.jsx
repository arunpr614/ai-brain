import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CirclePlus,
  Clock,
  FileText,
  Filter,
  Inbox,
  LayoutGrid,
  Library,
  List,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Tag,
  WifiOff,
  X,
} from "lucide-react";

const STATUSES = ["inbox", "todo", "in_progress", "done"];
const LABEL = {
  inbox: "Inbox",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const INITIAL_CARDS = [
  {
    id: "calm-prioritization",
    title: "A practical guide to calm prioritization",
    type: "Article",
    channel: "Extension",
    age: "50m ago",
    status: "inbox",
    userTags: ["Writing"],
    topics: ["Productivity"],
    quality: "Full text",
    excerpt:
      "A practical framework for choosing what matters now: compare importance and urgency, reduce noise, and protect focus.",
    notes: "Compare this with the weekly review ritual. Keep the next action lightweight.",
  },
  {
    id: "weekly-reviews",
    title: "Designing calmer weekly reviews",
    type: "Note",
    channel: "Web",
    age: "1h ago",
    status: "inbox",
    userTags: ["Weekly review"],
    topics: ["Productivity"],
    quality: "Full text",
    excerpt:
      "Compare lightweight processing cues with task-heavy workflows. Preserve trust, context, and easy recovery.",
    notes: "Prototype a bounded session of three sources and observe whether it feels like debt.",
  },
  {
    id: "attention-memory",
    title: "How attention shapes memory",
    type: "YouTube",
    channel: "Android",
    age: "1d ago",
    status: "inbox",
    userTags: ["Research"],
    topics: ["Memory science"],
    quality: "Transcript",
    excerpt:
      "Attention determines what gets encoded, while deliberate retrieval strengthens durable recall.",
    notes: "",
  },
  {
    id: "pkm-research",
    title: "Research notes on personal knowledge workflows",
    type: "PDF",
    channel: "Web",
    age: "3d ago",
    status: "inbox",
    userTags: ["Research"],
    topics: ["Knowledge systems"],
    quality: "Full text",
    excerpt:
      "Fictional research notes comparing capture, processing, retrieval, and completion habits.",
    notes: "Pull the clearest definition of processed into the PRD.",
  },
  {
    id: "weekly-reflection",
    title: "Idea: make weekly reflection lighter",
    type: "Capture",
    channel: "Telegram",
    age: "4d ago",
    status: "inbox",
    userTags: ["Weekly review"],
    topics: ["Habits"],
    quality: "Full text",
    excerpt:
      "A smaller weekly ritual: review what entered the Inbox, keep one next source, and close one loop.",
    notes: "",
  },
  {
    id: "spaced-reflection",
    title: "The case for spaced reflection",
    type: "Article",
    channel: "Extension",
    age: "2d ago",
    status: "todo",
    userTags: ["Research"],
    topics: ["Memory science"],
    quality: "Full text",
    excerpt: "Reflection can increase transfer when it is separated from the moment of capture.",
    notes: "Keep this separate from SRS Review.",
  },
  {
    id: "second-brain",
    title: "Building a second brain that lasts",
    type: "Article",
    channel: "Web",
    age: "5d ago",
    status: "todo",
    userTags: ["Writing"],
    topics: ["Knowledge systems"],
    quality: "Full text",
    excerpt: "The system becomes useful when captured knowledge returns at the moment of need.",
    notes: "",
  },
  {
    id: "capture-habits",
    title: "Capture habits that stick",
    type: "Note",
    channel: "Web",
    age: "6d ago",
    status: "in_progress",
    userTags: ["Weekly review"],
    topics: ["Habits"],
    quality: "Full text",
    excerpt: "A capture habit survives when follow-up remains optional, quick, and trustworthy.",
    notes: "Draft a short experiment for next week.",
  },
  {
    id: "deep-work",
    title: "Attention management in deep work",
    type: "Article",
    channel: "Extension",
    age: "1w ago",
    status: "in_progress",
    userTags: ["Research"],
    topics: ["Productivity"],
    quality: "Full text",
    excerpt: "Interruptions carry a measurable residue that can outlast the original context switch.",
    notes: "",
  },
  {
    id: "morning-pages",
    title: "Morning pages as a cognitive reset",
    type: "PDF",
    channel: "Web",
    age: "8d ago",
    status: "done",
    userTags: ["Writing"],
    topics: ["Habits"],
    quality: "Full text",
    excerpt: "Unstructured writing can lower cognitive load before focused work begins.",
    notes: "Completed the trial; keep for reference.",
  },
  {
    id: "review-recall",
    title: "The psychology of review and recall",
    type: "Article",
    channel: "Web",
    age: "9d ago",
    status: "done",
    userTags: ["Research"],
    topics: ["Memory science"],
    quality: "Full text",
    excerpt: "Retrieval strengthens memory differently from repeated exposure.",
    notes: "",
  },
  {
    id: "light-notes",
    title: "Light notes vs. heavy notes: tradeoffs",
    type: "Note",
    channel: "Web",
    age: "2w ago",
    status: "done",
    userTags: ["Writing"],
    topics: ["Knowledge systems"],
    quality: "Full text",
    excerpt: "Short annotations can preserve intent without turning every source into homework.",
    notes: "Archived after using the comparison in a design review.",
    archived: true,
  },
];

function currentPage() {
  const path = window.location.pathname;
  if (path.endsWith("item-detail.html")) return "detail";
  if (path.endsWith("direction-a.html")) return "a";
  if (path.endsWith("direction-b.html")) return "b";
  if (path.endsWith("direction-c.html")) return "c";
  return "gallery";
}

export function App() {
  const page = currentPage();
  if (page === "detail") return <ItemDetailPage />;
  if (page === "gallery") return <Gallery />;
  return <Prototype direction={page} />;
}

function ItemDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const direction = ["a", "b", "c"].includes(params.get("direction")) ? params.get("direction") : "b";
  const initialCard = INITIAL_CARDS.find((card) => card.id === params.get("item")) ?? INITIAL_CARDS[0];
  const [status, setStatus] = useState(initialCard.status);
  const [archived, setArchived] = useState(initialCard.archived);
  const [draft, setDraft] = useState(initialCard.notes);
  const [saved, setSaved] = useState(true);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const [announcement, setAnnouncement] = useState("Item detail loaded.");
  const bypassUnloadGuardRef = useRef(false);
  const returnView = params.get("view") || "inbox";
  const returnHref = `/direction-${direction}.html?view=${encodeURIComponent(returnView)}&focus=${encodeURIComponent(initialCard.id)}`;

  useEffect(() => {
    function guardUnload(event) {
      if (saved || bypassUnloadGuardRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", guardUnload);
    return () => window.removeEventListener("beforeunload", guardUnload);
  }, [saved]);

  function requestReturn() {
    if (!saved) {
      setShowLeavePrompt(true);
      return;
    }
    bypassUnloadGuardRef.current = true;
    window.location.href = returnHref;
  }

  function saveNote() {
    setSaved(true);
    setAnnouncement("Note saved in this fictional prototype.");
  }

  function saveAndReturn() {
    setSaved(true);
    bypassUnloadGuardRef.current = true;
    window.location.href = returnHref;
  }

  return (
    <div className="prototype-shell direction-b detail-route-shell">
      <a className="skip-link" href="#item-detail-main">Skip to item detail</a>
      <Sidebar selected="Processing" inboxTotal={5} />
      <div className="prototype-main">
        <div className="prototype-banner"><span>Throwaway prototype · Explored — not implemented</span><a href="/">Prototype gallery</a></div>
        <header className="detail-route-header">
          <button className="secondary-button" onClick={requestReturn}><ArrowLeft aria-hidden="true" />Back to Processing</button>
          <span>Canonical item-detail route simulation</span>
        </header>
        <main id="item-detail-main" className="detail-route" tabIndex="-1">
          <article>
            <p className="eyebrow">{initialCard.type} · via {initialCard.channel} · {initialCard.quality}</p>
            <h1>{initialCard.title}</h1>
            <div className="status-line"><span className={`status-pill status-${status}`}>{LABEL[status]}</span>{archived && <span className="archived-badge">Archived from Processing</span>}</div>
            <p className="detail-excerpt">{initialCard.excerpt}</p>
            <div className="detail-taxonomy"><span>User tags: {initialCard.userTags.join(", ")}</span><span>AI topics: {initialCard.topics.join(", ")}</span></div>
          </article>
          <aside>
            <div className="detail-workflow"><h2>Processing</h2>{archived ? <div className="stack-actions"><button onClick={() => { setArchived(false); setStatus("done"); setAnnouncement("Restored to Done."); }}>Restore to Done</button><button onClick={() => { setArchived(false); setStatus("inbox"); setAnnouncement("Restored and reprocessed to Inbox."); }}>Reprocess to Inbox</button></div> : <><label>Move to<select value={status} onChange={(event) => { setStatus(event.target.value); setAnnouncement(`Moved to ${LABEL[event.target.value]}.`); }}>{STATUSES.map((nextStatus) => <option key={nextStatus} value={nextStatus}>{LABEL[nextStatus]}</option>)}</select></label>{status === "done" && <button onClick={() => { setArchived(true); setAnnouncement("Archived from active Processing; source remains in Library."); }}><Archive aria-hidden="true" />Archive from Processing</button>}</>}</div>
            <div className="notes-editor"><div><h2>My notes</h2><span>{saved ? "Saved" : "Unsaved draft"}</span></div><textarea aria-label="My notes Markdown" value={draft} onChange={(event) => { setDraft(event.target.value); setSaved(false); setAnnouncement("Note has an unsaved draft."); }} placeholder="What do you think, want to remember, or want to try?" /><button disabled={saved} onClick={saveNote}><Check aria-hidden="true" />Save note</button><p>Workflow changes do not save, clear, or submit this note.</p></div>
          </aside>
        </main>
        {showLeavePrompt && <section className="unsaved-prompt" role="alert" aria-labelledby="unsaved-title"><h2 id="unsaved-title">Leave with an unsaved note?</h2><p>Save this fictional note and return, discard only this draft, or keep editing.</p><div><button autoFocus onClick={() => setShowLeavePrompt(false)}>Keep editing</button><button onClick={saveAndReturn}>Save and return</button><button className="danger-button" onClick={() => { bypassUnloadGuardRef.current = true; window.location.href = returnHref; }}>Discard draft</button></div></section>}
        <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      </div>
      <MobileNav selected="Processing" />
    </div>
  );
}

function Gallery() {
  const concepts = [
    {
      id: "a",
      title: "Workflow — board-first operations",
      image: "/concepts/direction-a-workflow-board-first.png",
      href: "/direction-a.html",
      strength: "Strongest whole-workload overview and fastest repeated desktop movement.",
      weakness: "Highest project-management, scale, accessibility, and mobile risk.",
    },
    {
      id: "b",
      title: "Processing — Inbox-first triage",
      image: "/concepts/direction-b-processing-inbox-first.png",
      href: "/direction-b.html",
      strength: "Clearest next decision, best mobile parity, strongest source-first fit.",
      weakness: "Quick preview must not become a second item-detail or notes experience.",
      recommended: true,
    },
    {
      id: "c",
      title: "Queue — Library-integrated",
      image: "/concepts/direction-c-queue-library-integrated.png",
      href: "/direction-c.html",
      strength: "Maximum reuse of Library and strongest dense desktop/batch posture.",
      weakness: "Weakest dedicated behavior loop and easiest to mistake for another filter.",
    },
  ];

  return (
    <main className="gallery-page">
      <div className="prototype-banner">Throwaway prototypes · Explored — not implemented</div>
      <header className="gallery-hero">
        <img src="/ai-memory-logo.png" alt="" />
        <div>
          <p className="eyebrow">AI Brain feature council</p>
          <h1>Card Processing Workflow</h1>
          <p>
            Three interaction and information-architecture directions for turning captured sources
            into deliberate decisions. All data is fictional; no production behavior is represented.
          </p>
        </div>
      </header>

      <section aria-labelledby="directions-title">
        <div className="gallery-heading-row">
          <div>
            <p className="eyebrow">Prototype gallery</p>
            <h2 id="directions-title">Compare the processing model, not the palette</h2>
          </div>
          <span className="recommended-pill">Recommended: Direction B</span>
        </div>
        <div className="concept-grid">
          {concepts.map((concept) => (
            <article className={`concept-card ${concept.recommended ? "recommended" : ""}`} key={concept.id}>
              <a href={concept.href} className="concept-image-link">
                <img src={concept.image} alt={`${concept.title} visual concept`} />
              </a>
              <div className="concept-card-body">
                <div className="concept-label-row">
                  <span>Direction {concept.id.toUpperCase()}</span>
                  {concept.recommended && <strong>Recommended</strong>}
                </div>
                <h3>{concept.title}</h3>
                <p><strong>Strength:</strong> {concept.strength}</p>
                <p><strong>Risk:</strong> {concept.weakness}</p>
                <a className="primary-link" href={concept.href}>Open interactive prototype <ChevronRight aria-hidden="true" /></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="review-grid" aria-labelledby="review-title">
        <div>
          <p className="eyebrow">What reviewers should evaluate</p>
          <h2 id="review-title">Does this help process, not just display?</h2>
          <ul>
            <li>Can you understand Inbox, To Do, In Progress, Done, and Archive without explanation?</li>
            <li>Can you move, undo, archive, and restore without drag?</li>
            <li>Do total backlog and filtered matching counts remain unambiguous?</li>
            <li>Does the mobile layout preserve the same outcomes at 390×844?</li>
            <li>Does the workflow stay distinct from tags, AI topics, quality, and SRS Review?</li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Recommendation</p>
          <h2>Direction B: Processing</h2>
          <p>
            Start with the oldest captured source, make one deliberate decision, preserve exact
            return context, and use Board only when a whole-workload overview is useful.
          </p>
          <p className="muted-copy">
            Unresolved for stakeholder validation: Processing versus Inbox naming, whether read-only
            quick preview earns its complexity, and whether mobile discoverability is strong enough
            under More. Batch mutation and manual ranking are explicitly deferred from first release.
          </p>
        </div>
      </section>
    </main>
  );
}

function Prototype({ direction }) {
  const defaults = {
    a: { view: "board", title: "Workflow", subtitle: "Board-first operations", selectedNav: "Workflow" },
    b: { view: "inbox", title: "Processing", subtitle: "Inbox-first triage", selectedNav: "Processing" },
    c: { view: "list", title: "Library", subtitle: "Queue · Library-integrated processing", selectedNav: "Library" },
  }[direction];
  const initialParams = new URLSearchParams(window.location.search);
  const requestedView = initialParams.get("view");
  const initialView = ["inbox", "board", "list", "archived"].includes(requestedView) ? requestedView : defaults.view;
  const requestedScenario = initialParams.get("scenario");
  const initialScenario = ["normal", "loading", "error", "offline", "empty", "filtered-empty", "mutation-failure", "conflict"].includes(requestedScenario) ? requestedScenario : "normal";
  const returnFocusId = initialParams.get("focus");

  const [cards, setCards] = useState(INITIAL_CARDS);
  const [view, setView] = useState(initialView);
  const [tagFilter, setTagFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(returnFocusId);
  const [scenario, setScenario] = useState(initialScenario);
  const [mobileStatus, setMobileStatus] = useState("inbox");
  const [history, setHistory] = useState(null);
  const [announcement, setAnnouncement] = useState("Prototype loaded.");
  const [dragId, setDragId] = useState(null);
  const [pendingFocusTarget, setPendingFocusTarget] = useState(returnFocusId);
  const mainRef = useRef(null);
  const sourceRefs = useRef(new Map());

  useEffect(() => {
    if (!pendingFocusTarget) return;
    const frame = requestAnimationFrame(() => {
      const target = pendingFocusTarget === "__main__" ? mainRef.current : sourceRefs.current.get(pendingFocusTarget);
      (target ?? mainRef.current)?.focus();
      setPendingFocusTarget(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [cards, view, pendingFocusTarget]);

  useEffect(() => {
    if (!history) return;
    const timer = window.setTimeout(() => {
      setHistory(null);
      setAnnouncement("Undo window expired. The confirmed workflow state is unchanged.");
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [history]);

  function registerSourceRef(id, node) {
    if (node) sourceRefs.current.set(id, node);
    else sourceRefs.current.delete(id);
  }

  const matchesFilters = (card) =>
    (tagFilter === "all" || card.userTags.includes(tagFilter)) &&
    (topicFilter === "all" || card.topics.includes(topicFilter));

  const filtered = useMemo(() => cards.filter(matchesFilters), [cards, tagFilter, topicFilter]);
  const active = filtered.filter((card) => !card.archived);
  const archived = filtered.filter((card) => card.archived);
  const selected = cards.find((card) => card.id === selectedId) ?? null;
  const inboxTotal = cards.filter((card) => !card.archived && card.status === "inbox").length;
  const counts = Object.fromEntries(
    STATUSES.map((status) => [status, active.filter((card) => card.status === status).length]),
  );
  const viewMatching = view === "inbox"
    ? active.filter((card) => card.status === "inbox").length
    : view === "archived"
      ? archived.length
      : active.length;
  const viewScope = view === "inbox" ? "in Inbox" : view === "archived" ? "archived" : "active across all statuses";

  function remember(action, focusId) {
    setHistory({ cards, action, focusId });
  }

  function moveCard(id, status) {
    const card = cards.find((item) => item.id === id);
    if (!card || card.status === status || card.archived) return;
    remember(`Moved “${card.title}” to ${LABEL[status]}.`, card.id);
    setCards((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setAnnouncement(`Moved “${card.title}” to ${LABEL[status]}. Undo available.`);
    if (view === "inbox" && status !== "inbox") {
      const remaining = active.filter((item) => item.status === "inbox" && item.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
      setPendingFocusTarget(remaining[0]?.id ?? "__main__");
    } else {
      setPendingFocusTarget(card.id);
    }
  }

  function archiveCard(id) {
    const card = cards.find((item) => item.id === id);
    if (!card || card.status !== "done") return;
    remember(`Archived “${card.title}”.`, card.id);
    setCards((current) => current.map((item) => item.id === id ? { ...item, archived: true } : item));
    setAnnouncement(`Archived “${card.title}” from Processing. It remains in Library. Undo available.`);
    setPendingFocusTarget(active.find((item) => item.id !== id && item.status === "done")?.id ?? "__main__");
  }

  function restoreCard(id, reprocess = false) {
    const card = cards.find((item) => item.id === id);
    if (!card) return;
    remember(`${reprocess ? "Reprocessed" : "Restored"} “${card.title}”.`, card.id);
    setCards((current) => current.map((item) => item.id === id ? {
      ...item,
      archived: false,
      status: reprocess ? "inbox" : "done",
    } : item));
    setAnnouncement(
      reprocess
        ? `Restored “${card.title}” and moved it to Inbox.`
        : `Restored “${card.title}” to Done.`,
    );
    setPendingFocusTarget(archived.find((item) => item.id !== id)?.id ?? "__main__");
  }

  function undo() {
    if (!history) return;
    setCards(history.cards);
    setAnnouncement(`Undid action. ${history.action}`);
    setPendingFocusTarget(history.focusId ?? "__main__");
    setHistory(null);
  }

  function clearFilters() {
    setTagFilter("all");
    setTopicFilter("all");
    setAnnouncement(`Filters cleared. Inbox has ${inboxTotal} total sources.`);
  }

  function changeTagFilter(nextTag) {
    setTagFilter(nextTag);
    const nextMatching = cards.filter((card) =>
      (nextTag === "all" || card.userTags.includes(nextTag)) &&
      (topicFilter === "all" || card.topics.includes(topicFilter)) &&
      (view === "archived" ? card.archived : !card.archived) &&
      (view !== "inbox" || card.status === "inbox"),
    ).length;
    setAnnouncement(`Filters updated. ${nextMatching} sources match ${viewScope}; ${inboxTotal} total sources in Inbox.`);
  }

  function changeTopicFilter(nextTopic) {
    setTopicFilter(nextTopic);
    const nextMatching = cards.filter((card) =>
      (tagFilter === "all" || card.userTags.includes(tagFilter)) &&
      (nextTopic === "all" || card.topics.includes(nextTopic)) &&
      (view === "archived" ? card.archived : !card.archived) &&
      (view !== "inbox" || card.status === "inbox"),
    ).length;
    setAnnouncement(`Filters updated. ${nextMatching} sources match ${viewScope}; ${inboxTotal} total sources in Inbox.`);
  }

  function leaveInInbox(id) {
    const index = active.filter((card) => card.status === "inbox").findIndex((card) => card.id === id);
    const next = active.filter((card) => card.status === "inbox")[index + 1] ?? null;
    setSelectedId(next?.id ?? null);
    setPendingFocusTarget(next?.id ?? "__main__");
    setAnnouncement(next ? `Left source in Inbox. Next source selected: ${next.title}.` : "Left source in Inbox. You reached the end of the current Inbox results.");
  }

  function changeView(nextView) {
    setView(nextView);
    setAnnouncement(`${nextView === "inbox" ? "Inbox" : nextView[0].toUpperCase() + nextView.slice(1)} view selected.`);
  }

  function applyScenario(next) {
    setScenario(next);
    setAnnouncement(next === "loading" ? "Loading Processing cards." : next === "normal" ? "Processing cards loaded." : `Review scenario changed to ${next.replace("-", " ")}.`);
  }

  function openDetail(id) {
    window.location.href = `/item-detail.html?direction=${direction}&view=${view}&item=${encodeURIComponent(id)}`;
  }

  const shownCards = scenario === "empty" ? active.filter((card) => card.status !== "inbox") : active;

  return (
    <div className={`prototype-shell direction-${direction}`}>
      <a className="skip-link" href="#processing-main">Skip to Processing content</a>
      <Sidebar selected={defaults.selectedNav} inboxTotal={inboxTotal} />
      <div className="prototype-main">
        <div className="prototype-banner">
          <span>Throwaway prototype · Explored — not implemented</span>
          <a href="/">Prototype gallery</a>
        </div>

        {scenario === "offline" && (
          <div className="offline-banner" id="offline-write-reason" role="status">
            <WifiOff aria-hidden="true" />
            You’re offline. Saved views are readable; moving and archiving require a connection.
          </div>
        )}

        <header className="page-header">
          <div>
            <p className="eyebrow">Direction {direction.toUpperCase()}</p>
            <h1>{defaults.title}{direction === "c" && <span className="title-mode">Queue</span>}</h1>
            <p>{defaults.subtitle}. Decide what happens to captured sources.</p>
          </div>
          <div className="header-actions">
            <label className="scenario-control">
              <span>Review state</span>
              <select value={scenario} onChange={(event) => applyScenario(event.target.value)}>
                <option value="normal">Normal</option>
                <option value="loading">Loading</option>
                <option value="error">Load error</option>
                <option value="offline">Offline</option>
                <option value="empty">Empty Inbox</option>
                <option value="filtered-empty">Filtered empty</option>
                <option value="mutation-failure">Move failure</option>
                <option value="conflict">Version conflict</option>
              </select>
            </label>
            <button className="primary-button" disabled={scenario === "offline"} aria-describedby={scenario === "offline" ? "offline-write-reason" : undefined} onClick={() => {
              const next = cards.find((card) => !card.archived && card.status === "inbox");
              setSelectedId(next?.id ?? null);
              setView("inbox");
              setAnnouncement("The oldest Inbox source is selected for processing.");
            }}>
              Process next
            </button>
          </div>
        </header>

        {direction === "b" && <aside className="mobile-discovery" aria-label="Library Inbox summary preview"><Library aria-hidden="true" /><div><strong>Library summary</strong><span>{inboxTotal} saved sources waiting in Processing</span></div><button onClick={() => { setView("inbox"); setAnnouncement("Opened Processing Inbox from the Library summary."); }}>Open Inbox</button></aside>}

        {direction === "c" && (
          <div className="library-mode" aria-label="Library mode">
            <button>Browse</button>
            <button className="active" aria-pressed="true">Queue</button>
          </div>
        )}

        <Metrics direction={direction} inboxTotal={scenario === "empty" ? 0 : inboxTotal} unavailable={scenario === "loading" || scenario === "error"} />

        <ViewTabs view={view} changeView={changeView} />

        <FilterBar
          tagFilter={tagFilter}
          setTagFilter={changeTagFilter}
          topicFilter={topicFilter}
          setTopicFilter={changeTopicFilter}
          clearFilters={clearFilters}
          matching={scenario === "filtered-empty" || scenario === "empty" ? 0 : scenario === "loading" || scenario === "error" ? "—" : viewMatching}
          scope={viewScope}
          total={scenario === "empty" ? 0 : inboxTotal}
        />

        <main id="processing-main" ref={mainRef} className="view-stage" tabIndex="-1">
          {scenario === "loading" ? (
            <LoadingState view={view} />
          ) : scenario === "error" ? (
            <ErrorState onRetry={() => { applyScenario("normal"); setPendingFocusTarget("__main__"); }} />
          ) : scenario === "filtered-empty" ? (
            <FilteredEmpty total={inboxTotal} onClear={() => { clearFilters(); applyScenario("normal"); setPendingFocusTarget("__main__"); }} />
          ) : scenario === "mutation-failure" ? (
            <MutationFailure onRetry={() => { applyScenario("normal"); setPendingFocusTarget("__main__"); }} />
          ) : scenario === "conflict" ? (
            <ConflictState onReload={() => { applyScenario("normal"); setPendingFocusTarget("__main__"); }} />
          ) : view === "inbox" ? (
            <InboxView
              cards={shownCards.filter((card) => card.status === "inbox")}
              selected={selected}
              setSelectedId={setSelectedId}
              moveCard={moveCard}
              setDetailId={openDetail}
              offline={scenario === "offline"}
              direction={direction}
              emptyScenario={scenario === "empty"}
              leaveInInbox={leaveInInbox}
              registerSourceRef={registerSourceRef}
            />
          ) : view === "board" ? (
            <BoardView
              cards={shownCards}
              counts={counts}
              mobileStatus={mobileStatus}
              setMobileStatus={setMobileStatus}
              moveCard={moveCard}
              archiveCard={archiveCard}
              setDetailId={openDetail}
              dragId={dragId}
              setDragId={setDragId}
              offline={scenario === "offline"}
              registerSourceRef={registerSourceRef}
            />
          ) : view === "list" ? (
            <ListView
              cards={shownCards}
              moveCard={moveCard}
              archiveCard={archiveCard}
              setDetailId={openDetail}
              offline={scenario === "offline"}
              dense={direction === "c"}
              registerSourceRef={registerSourceRef}
            />
          ) : (
            <ArchivedView cards={scenario === "empty" ? [] : archived} restoreCard={restoreCard} setDetailId={openDetail} offline={scenario === "offline"} registerSourceRef={registerSourceRef} />
          )}
        </main>

        {history && (
          <div className="undo-toast">
            <span>{history.action}</span>
            <button onClick={undo}><RotateCcw aria-hidden="true" /> Undo · 10s</button>
          </div>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
      </div>

      <MobileNav selected={defaults.selectedNav} />

    </div>
  );
}

function Sidebar({ selected, inboxTotal }) {
  const items = [
    { label: "Library", icon: Library },
    { label: "Processing", icon: Inbox, badge: inboxTotal },
    { label: "Needs Upgrade", icon: AlertTriangle },
    { label: "Ask", icon: MessageSquare },
    { label: "Settings", icon: Settings },
  ];
  return (
    <aside className="sidebar">
      <div className="brand"><img src="/ai-memory-logo.png" alt="" /><div><strong>AI Memory</strong><span>v0.6.2 · private memory</span></div></div>
      <button className="sidebar-control"><span>Navigation</span><PanelLeftClose aria-hidden="true" /></button>
      <button className="sidebar-search"><Search aria-hidden="true" /> Search <kbd>⌘K</kbd></button>
      <button className="capture-button"><CirclePlus aria-hidden="true" /> Capture</button>
      <nav aria-label="Primary">
        {items.map(({ label, icon: Icon, badge }) => (
          <a key={label} href="#" className={selected === label ? "active" : ""} aria-current={selected === label ? "page" : undefined} onClick={(event) => event.preventDefault()}>
            <Icon aria-hidden="true" /> <span>{label}</span>{badge ? <b>{badge}</b> : null}
          </a>
        ))}
      </nav>
      <div className="sidebar-bottom"><span>Pair Device</span><span className="disabled">Privacy Controls · soon</span></div>
    </aside>
  );
}

function MobileNav({ selected }) {
  return (
    <nav className="mobile-nav" aria-label="Primary mobile">
      <button className={selected === "Library" ? "active" : ""}><Library aria-hidden="true" />Library</button>
      <button className="mobile-capture"><CirclePlus aria-hidden="true" />Capture</button>
      <button><MessageSquare aria-hidden="true" />Ask</button>
      <button className={selected === "Processing" ? "active" : ""}><MoreHorizontal aria-hidden="true" />More</button>
    </nav>
  );
}

function Metrics({ direction, inboxTotal, unavailable }) {
  const metrics = [
    { label: "Inbox now", value: unavailable ? "—" : inboxTotal, sub: unavailable ? "unavailable" : inboxTotal === 0 ? "nothing waiting" : "oldest 18d" },
    { label: "Processed this week", value: unavailable ? "—" : 6, sub: unavailable ? "unavailable" : "8 added" },
    { label: "Completed this week", value: unavailable ? "—" : 18, sub: unavailable ? "unavailable" : "first completions" },
  ];
  return <section className={`metrics metrics-${direction}`} aria-label="Processing metrics">{metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.sub}</small></div>)}</section>;
}

function ViewTabs({ view, changeView }) {
  const tabs = [
    ["inbox", "Inbox"], ["board", "Board"], ["list", "List"], ["archived", "Archived"],
  ];
  return <div className="view-tabs" aria-label="Processing views">{tabs.map(([id, label]) => <button key={id} aria-pressed={view === id} className={view === id ? "active" : ""} onClick={() => changeView(id)}>{id === "board" && <LayoutGrid aria-hidden="true" />}{id === "list" && <List aria-hidden="true" />}{id === "archived" && <Archive aria-hidden="true" />}{id === "inbox" && <Inbox aria-hidden="true" />}{label}</button>)}</div>;
}

function FilterBar({ tagFilter, setTagFilter, topicFilter, setTopicFilter, clearFilters, matching, scope, total }) {
  return (
    <section className="filter-bar" aria-label="Filters">
      <div className="filter-summary"><Filter aria-hidden="true" /><span><strong>{matching} sources match {scope}</strong> · {total} total sources in Inbox</span></div>
      <label>User tags<select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="all">All</option><option>Research</option><option>Writing</option><option>Weekly review</option></select></label>
      <label>AI topics<select value={topicFilter} onChange={(event) => setTopicFilter(event.target.value)}><option value="all">All</option><option>Productivity</option><option>Memory science</option><option>Knowledge systems</option><option>Habits</option></select></label>
      {(tagFilter !== "all" || topicFilter !== "all") && <button className="clear-button" onClick={clearFilters}><X aria-hidden="true" />Clear all</button>}
    </section>
  );
}

function InboxView({ cards, selected, setSelectedId, moveCard, setDetailId, offline, direction, emptyScenario, leaveInInbox, registerSourceRef }) {
  if (emptyScenario || cards.length === 0) return <EmptyState />;
  const selectedCard = selected && cards.some((card) => card.id === selected.id) ? selected : null;
  return (
    <div className={`inbox-layout ${direction === "a" ? "compact" : ""}`}>
      <section className="inbox-queue" aria-labelledby="inbox-heading">
        <div className="section-heading"><div><h2 id="inbox-heading">Inbox</h2><p>Oldest current Inbox entry first</p></div><span>{cards.length} matching</span></div>
        <ul className="queue-list">
          {cards.map((card) => (
            <li key={card.id} className={selectedCard?.id === card.id ? "selected" : ""}>
              <button ref={(node) => registerSourceRef(card.id, node)} className="queue-select" onClick={() => setSelectedId(card.id)} aria-pressed={selectedCard?.id === card.id}>
                <SourceMark type={card.type} />
                <span><strong>{card.title}</strong><small>{card.type} · via {card.channel} · {card.age}</small></span>
                <b>Inbox</b>
              </button>
              <CardActions card={card} moveCard={moveCard} setDetailId={setDetailId} offline={offline} compact />
            </li>
          ))}
        </ul>
      </section>
      {direction !== "a" && (selectedCard
        ? <QuickPreview card={selectedCard} moveCard={moveCard} setDetailId={setDetailId} offline={offline} leaveInInbox={leaveInInbox} />
        : <aside className="quick-preview preview-placeholder" aria-labelledby="preview-placeholder-title"><Inbox aria-hidden="true" /><h2 id="preview-placeholder-title">Select a source or process next</h2><p>The oldest Inbox source stays unselected until you start.</p></aside>)}
    </div>
  );
}

function QuickPreview({ card, moveCard, setDetailId, offline, leaveInInbox }) {
  return (
    <aside className="quick-preview" aria-labelledby="quick-preview-title">
      <div className="preview-heading"><div><p className="eyebrow">Quick preview</p><h2 id="quick-preview-title">{card.title}</h2><p>{card.type} · via {card.channel} · {card.age} · {card.quality}</p></div><button className="secondary-button" aria-label={`Open full source: ${card.title}`} onClick={() => setDetailId(card.id)}><BookOpen aria-hidden="true" />Open full source</button></div>
      <p className="preview-excerpt">{card.excerpt}</p>
      <div className="taxonomy-block"><span>User tags</span><div>{card.userTags.map((tag) => <b key={tag}><Tag aria-hidden="true" />{tag}</b>)}</div></div>
      <div className="taxonomy-block"><span>AI topics</span><div>{card.topics.map((topic) => <b key={topic}>{topic}</b>)}</div></div>
      <div className="note-summary"><FileText aria-hidden="true" /><div><span>My notes</span><p>{card.notes || "No attached notes yet."}</p></div><button aria-label={`Open notes for ${card.title}`} onClick={() => setDetailId(card.id)}>Open notes</button></div>
      <div className="decision-grid" aria-label="Move source to">
        {STATUSES.filter((status) => status !== "inbox").map((status) => <button key={status} disabled={offline} aria-describedby={offline ? "offline-write-reason" : undefined} onClick={() => moveCard(card.id, status)}><span>{LABEL[status]}</span><small>{status === "todo" ? "Save for later work" : status === "in_progress" ? "Start working now" : "Processing complete"}</small></button>)}
        <button onClick={() => leaveInInbox(card.id)}><span>Leave in Inbox</span><small>Keep it waiting; select next</small></button>
      </div>
    </aside>
  );
}

function BoardView({ cards, counts, mobileStatus, setMobileStatus, moveCard, archiveCard, setDetailId, dragId, setDragId, offline, registerSourceRef }) {
  return (
    <div>
      <div className="mobile-status-tabs" aria-label="Board status">{STATUSES.map((status) => <button aria-pressed={mobileStatus === status} className={mobileStatus === status ? "active" : ""} onClick={() => setMobileStatus(status)} key={status}>{LABEL[status]} <span>{counts[status]}</span></button>)}</div>
      <div className="board" aria-label="Workflow board">
        {STATUSES.map((status) => (
          <section
            key={status}
            className={`board-column mobile-${mobileStatus === status ? "selected" : "hidden"}`}
            aria-labelledby={`column-${status}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => { if (dragId && !offline) moveCard(dragId, status); setDragId(null); }}
          >
            <header><h2 id={`column-${status}`}>{LABEL[status]}</h2><span>{counts[status]} matching</span></header>
            <ul className="column-list">
              {cards.filter((card) => card.status === status).map((card) => (
                <li ref={(node) => registerSourceRef(card.id, node)} key={card.id} className="board-card" tabIndex="-1" draggable={!offline} onDragStart={() => setDragId(card.id)} onDragEnd={() => setDragId(null)}>
                  <div className="card-meta"><SourceMark type={card.type} /><span>{card.type} · {card.age}</span></div>
                  <h3>{card.title}</h3>
                  <div className="chip-row">{card.userTags.slice(0, 1).map((tag) => <span key={tag}>{tag}</span>)}{card.topics.slice(0, 1).map((topic) => <span key={topic}>AI · {topic}</span>)}</div>
                  <CardActions card={card} moveCard={moveCard} archiveCard={archiveCard} setDetailId={setDetailId} offline={offline} compact />
                </li>
              ))}
              {counts[status] === 0 && <li className="column-empty">No sources in {LABEL[status]}.</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ListView({ cards, moveCard, archiveCard, setDetailId, offline, dense, registerSourceRef }) {
  if (cards.length === 0) return <EmptyState title="No active sources" />;
  return (
    <section className={`list-surface ${dense ? "dense" : ""}`} aria-labelledby="list-heading">
      <div className="section-heading"><div><h2 id="list-heading">All active sources</h2><p>Deterministic status ordering · {cards.length} matching</p></div></div>
      <div className="list-header" aria-hidden="true"><span>Status</span><span>Source</span><span>Labels</span><span>Captured</span><span>Actions</span></div>
      <ul>
        {cards.map((card) => (
          <li key={card.id}>
            <span className={`status-pill status-${card.status}`}>{LABEL[card.status]}</span>
            <button ref={(node) => registerSourceRef(card.id, node)} className="list-title" aria-label={`Open ${card.title}`} onClick={() => setDetailId(card.id)}><SourceMark type={card.type} /><span><strong>{card.title}</strong><small>{card.type} · via {card.channel}</small></span></button>
            <div className="list-labels">{card.userTags.slice(0, 1).map((tag) => <span key={tag}>{tag}</span>)}{card.topics.slice(0, 1).map((topic) => <span key={topic}>AI · {topic}</span>)}</div>
            <span className="list-age">{card.age}</span>
            <CardActions card={card} moveCard={moveCard} archiveCard={archiveCard} setDetailId={setDetailId} offline={offline} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArchivedView({ cards, restoreCard, setDetailId, offline, registerSourceRef }) {
  if (cards.length === 0) return <EmptyState title="Nothing archived from Processing" body="Archived sources would remain available in Library, search, Ask, notes, and export." />;
  return (
    <section className="archive-surface" aria-labelledby="archive-heading">
      <div className="section-heading"><div><h2 id="archive-heading">Archived</h2><p>Hidden from active Processing only</p></div><span>{cards.length} sources</span></div>
      <ul>{cards.map((card) => <li key={card.id}><div><SourceMark type={card.type} /><span><strong>{card.title}</strong><small>Done · archived 2d ago · still in Library</small></span></div><div className="archive-actions"><button ref={(node) => registerSourceRef(card.id, node)} aria-label={`Open ${card.title}`} onClick={() => setDetailId(card.id)}>Open</button><button disabled={offline} aria-describedby={offline ? "offline-write-reason" : undefined} aria-label={`Restore ${card.title} to Done`} onClick={() => restoreCard(card.id)}>Restore to Done</button><button disabled={offline} aria-describedby={offline ? "offline-write-reason" : undefined} aria-label={`Reprocess ${card.title} to Inbox`} onClick={() => restoreCard(card.id, true)}>Reprocess to Inbox</button></div></li>)}</ul>
    </section>
  );
}

function CardActions({ card, moveCard, archiveCard, setDetailId, offline, compact }) {
  return (
    <div className={`card-actions ${compact ? "compact" : ""}`}>
      <button aria-label={`Open ${card.title}`} onClick={() => setDetailId(card.id)}>Open</button>
      <label><span className="sr-only">Move {card.title} to</span><select aria-label={`Move ${card.title} to`} aria-describedby={offline ? "offline-write-reason" : undefined} value={card.status} disabled={offline || card.archived} onChange={(event) => moveCard(card.id, event.target.value)}>{STATUSES.map((status) => <option key={status} value={status}>{LABEL[status]}</option>)}</select></label>
      {card.status === "done" && !card.archived && <button disabled={offline} aria-describedby={offline ? "offline-write-reason" : undefined} aria-label={`Archive ${card.title} from Processing`} onClick={() => archiveCard(card.id)}><Archive aria-hidden="true" />Archive</button>}
    </div>
  );
}

function SourceMark({ type }) {
  return <span className="source-mark" aria-hidden="true">{type === "YouTube" ? <BookOpen /> : <FileText />}</span>;
}

function LoadingState({ view }) {
  return <section className={`loading-state loading-${view}`} aria-busy="true" aria-label="Loading Processing"><span className="sr-only">Loading Processing cards.</span><div className="skeleton-line wide" /><div className="skeleton-grid">{Array.from({ length: view === "board" ? 8 : 6 }).map((_, index) => <div className="skeleton-card" key={index}><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div></section>;
}

function ErrorState({ onRetry }) {
  return <section className="center-state" role="alert"><AlertTriangle aria-hidden="true" /><h2>Processing could not load</h2><p>Your sources are unchanged.</p><button className="primary-button" onClick={onRetry}><RefreshCw aria-hidden="true" />Retry</button></section>;
}

function MutationFailure({ onRetry }) {
  return <section className="center-state trust-state" role="alert"><AlertTriangle aria-hidden="true" /><p className="eyebrow">Source-local rollback</p><h2>“A practical guide to calm prioritization” was not moved</h2><p>The connection failed before the change was confirmed. It remains in Inbox; other sources are unchanged.</p><button className="primary-button" onClick={onRetry}><RefreshCw aria-hidden="true" />Retry this move</button></section>;
}

function ConflictState({ onReload }) {
  return <section className="center-state trust-state" role="alert"><RefreshCw aria-hidden="true" /><p className="eyebrow">Version conflict · 409</p><h2>This source changed on another device</h2><p>It is now In Progress. Your intended move was not applied; notes and source content were not changed.</p><button className="primary-button" onClick={onReload}>Use current version</button></section>;
}

function FilteredEmpty({ total, onClear }) {
  return <section className="center-state"><Filter aria-hidden="true" /><h2>No sources match these filters</h2><p>Inbox still has {total} total.</p><button className="primary-button" onClick={onClear}>Clear all filters</button></section>;
}

function EmptyState({ title = "Nothing waiting for a decision", body = "New captures will appear here. You can also add selected sources from Library." }) {
  return <section className="center-state"><Check aria-hidden="true" /><h2>{title}</h2><p>{body}</p><div><button className="primary-button"><CirclePlus aria-hidden="true" />Capture</button><button className="secondary-button"><Library aria-hidden="true" />Browse Library</button></div></section>;
}
