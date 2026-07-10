interface BackgroundSnapshot {
  element: HTMLElement;
  inert: boolean;
  hadInertAttribute: boolean;
  inertAttribute: string | null;
  hadAriaHidden: boolean;
  ariaHidden: string | null;
}

function backgroundBranches(surface: HTMLElement): HTMLElement[] {
  const branches: HTMLElement[] = [];
  let current: HTMLElement | null = surface;
  while (current?.parentElement && current !== current.ownerDocument.body) {
    const parent: HTMLElement = current.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== current && sibling instanceof current.ownerDocument.defaultView!.HTMLElement) {
        branches.push(sibling as HTMLElement);
      }
    }
    current = parent;
  }
  return branches;
}

export function isolateForNoteFocus(surface: HTMLElement): () => void {
  const document = surface.ownerDocument;
  const root = document.documentElement;
  const body = document.body;
  const rootOverflow = root.style.overflow;
  const bodyOverflow = body.style.overflow;
  const hadFocusDataset = Object.prototype.hasOwnProperty.call(
    root.dataset,
    "noteFocusActive",
  );
  const focusDataset = root.dataset.noteFocusActive;
  const snapshots: BackgroundSnapshot[] = backgroundBranches(surface).map((element) => ({
    element,
    inert: element.inert,
    hadInertAttribute: element.hasAttribute("inert"),
    inertAttribute: element.getAttribute("inert"),
    hadAriaHidden: element.hasAttribute("aria-hidden"),
    ariaHidden: element.getAttribute("aria-hidden"),
  }));
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const snapshot of [...snapshots].reverse()) {
      snapshot.element.inert = snapshot.inert;
      if (snapshot.hadInertAttribute) {
        snapshot.element.setAttribute("inert", snapshot.inertAttribute ?? "");
      } else {
        snapshot.element.removeAttribute("inert");
      }
      if (snapshot.hadAriaHidden) {
        snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden ?? "");
      } else {
        snapshot.element.removeAttribute("aria-hidden");
      }
    }
    root.style.overflow = rootOverflow;
    body.style.overflow = bodyOverflow;
    if (hadFocusDataset) root.dataset.noteFocusActive = focusDataset ?? "";
    else delete root.dataset.noteFocusActive;
  };

  try {
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    for (const snapshot of snapshots) {
      snapshot.element.inert = true;
      snapshot.element.setAttribute("aria-hidden", "true");
    }
    root.dataset.noteFocusActive = "true";
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
