/** App-local layout preferences never contain Vault or conversation data. */
export type PanelPreferences = {
  history: { expanded: boolean; width: number };
  context: { expanded: boolean; width: number };
  narrow?: { history: boolean; context: boolean };
  compact?: { context: boolean };
};
type Side = "history" | "context";
const preferenceKey = "personal-dashboard.collaboration-panels.v2";
const legacyPreferenceKey = "personal-dashboard.collaboration-panels.v1";
const minimumHistory = 180;
const defaults = (): PanelPreferences => ({
  history: { expanded: true, width: 216 },
  context: { expanded: false, width: 304 },
});

export function readPanelPreferences(value: string | null): PanelPreferences {
  const result = defaults();
  try {
    const saved = JSON.parse(value ?? "null");
    if (typeof saved?.narrow?.history === "boolean" && typeof saved?.narrow?.context === "boolean") {
      result.narrow = { history: saved.narrow.history, context: saved.narrow.context };
    }
    if (typeof saved?.compact?.context === "boolean") result.compact = { context: saved.compact.context };
    for (const side of ["history", "context"] as const) {
      const panel = saved?.[side];
      if (typeof panel?.expanded === "boolean") result[side].expanded = panel.expanded;
      if (typeof panel?.width === "number" && Number.isFinite(panel.width)) {
        result[side].width = Math.max(side === "history" ? minimumHistory : 240, Math.min(640, panel.width));
      }
    }
  } catch { /* Malformed or unavailable storage uses safe defaults. */ }
  return result;
}

/** History uses a compact column; context is an overlay and consumes no width. */
export function panelGeometry(available: number, preferences: PanelPreferences) {
  const mode = available < 556 ? "single" : available < 900 ? "two" : "three";
  const narrow = mode === "single";
  const historyExpanded = narrow ? preferences.narrow?.history ?? false : preferences.history.expanded;
  // Earlier versions saved a separate context choice at narrow and middle widths.
  const contextExpanded = preferences.context.expanded || preferences.narrow?.context === true ||
    preferences.compact?.context === true;
  const historyVisible = historyExpanded && !narrow;
  const separators = historyVisible ? 16 : 0;
  const budget = Math.max(0, available - 360 - separators);
  const requestedHistory = mode === "two" ? Math.min(260, preferences.history.width) : preferences.history.width;
  const history = historyVisible ? Math.min(requestedHistory, Math.max(minimumHistory, budget)) : 0;
  return {
    mode, narrow, historyExpanded, contextExpanded, history, context: 0, budget,
    historyMaximum: mode === "two" ? Math.min(260, budget) : budget,
  };
}

export function initializeCollaborationPanels(): void {
  const layout = document.querySelector<HTMLElement>(".collaboration-layout");
  const primary = layout?.querySelector<HTMLElement>(".collaboration-primary-layout");
  if (!layout || !primary) return;

  let preferences = defaults();
  let migratePreferences = false;
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved !== null) preferences = readPanelPreferences(saved);
    else {
      const legacy = localStorage.getItem(legacyPreferenceKey);
      if (legacy !== null) {
        const previous = readPanelPreferences(legacy);
        preferences = {
          history: previous.history,
          context: { ...previous.context, expanded: false },
          narrow: { history: previous.narrow?.history ?? false, context: false },
          compact: { context: false },
        };
        migratePreferences = true;
      }
    }
  } catch { /* Storage disabled. */ }

  const panels = {
    history: document.getElementById("collaboration-history-panel")!,
    context: document.getElementById("collaboration-work-panel")!,
  };
  const toggles = {
    history: document.getElementById("collaboration-toggle-history")!,
    context: document.getElementById("collaboration-toggle-context")!,
  };
  const historyResizer = document.getElementById("collaboration-history-resizer")!;
  const closeContext = document.getElementById("collaboration-close-context");
  const chat = layout.querySelector<HTMLElement>(".collaboration-chat-pane");
  const chatHeading = chat?.querySelector<HTMLElement>(".collaboration-chat-heading");
  const composer = document.getElementById("collaboration-composer");
  if (chat && panels.context.parentElement !== chat) chat.append(panels.context);

  const narrowExpanded = preferences.narrow ??= { history: false, context: false };
  const compactExpanded = preferences.compact ??= { context: false };
  const focusTargets: Partial<Record<Side, HTMLElement>> = {};
  let narrowFront: Side = "context";
  let available = layout.getBoundingClientRect().width;
  let geometry = panelGeometry(available, preferences);
  const save = () => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Layout remains usable. */ }
  };
  if (migratePreferences) save();

  const updateOverlayBounds = () => {
    if (!chat || !composer || !chatHeading) return;
    const chatBounds = chat.getBoundingClientRect();
    const composerBounds = composer.getBoundingClientRect();
    const headingBounds = chatHeading.getBoundingClientRect();
    const border = chat.clientTop;
    panels.context.style.top = `${Math.max(0, headingBounds.bottom - chatBounds.top - border + 4)}px`;
    panels.context.style.paddingBottom = `${Math.max(16, composerBounds.height + 16)}px`;
    if (geometry.narrow) {
      const primaryBounds = primary.getBoundingClientRect();
      const top = Math.max(0, headingBounds.bottom - primaryBounds.top - primary.clientTop + 8);
      const bottom = Math.max(0, primaryBounds.bottom - primary.clientTop - composerBounds.top + 1);
      panels.history.style.top = `${top}px`;
      panels.history.style.bottom = `${bottom}px`;
      panels.history.style.height = `${Math.max(0, primary.clientHeight - top - bottom)}px`;
    } else {
      panels.history.style.top = "";
      panels.history.style.bottom = "";
      panels.history.style.height = "";
    }
  };

  const render = () => {
    geometry = panelGeometry(available, preferences);
    layout.dataset.narrow = String(geometry.narrow);
    layout.dataset.columns = geometry.mode;
    primary.dataset.narrow = String(geometry.narrow);
    primary.dataset.columns = geometry.mode;
    for (const side of ["history", "context"] as const) {
      const expanded = side === "history" ? geometry.historyExpanded : geometry.contextExpanded;
      const resizerHidden = side === "history" && (!expanded || geometry.narrow);
      const active = document.activeElement;
      if ((!expanded && panels[side].contains(active)) || (side === "history" && resizerHidden && active === historyResizer)) {
        focusTargets[side] = active as HTMLElement;
        toggles[side].focus();
      }
      panels[side].hidden = !expanded;
      toggles[side].setAttribute("aria-expanded", String(expanded));
      if (side === "history") {
        historyResizer.hidden = resizerHidden;
        historyResizer.setAttribute("aria-valuemin", String(minimumHistory));
        historyResizer.setAttribute("aria-valuemax", String(Math.max(minimumHistory, geometry.historyMaximum)));
        historyResizer.setAttribute("aria-valuenow", String(Math.round(geometry.history)));
        panels.history.style.zIndex = geometry.narrow ? (narrowFront === "history" ? "7" : "6") : "";
      } else {
        panels.context.style.zIndex = geometry.narrow ? (narrowFront === "context" ? "7" : "5") : "";
      }
    }
    primary.style.gridTemplateColumns = geometry.narrow ? "minmax(0, 1fr)" : [
      geometry.historyExpanded ? `${geometry.history}px 16px` : "",
      "minmax(0, 1fr)",
    ].filter(Boolean).join(" ");
    layout.style.display = "flex";
    layout.style.flexDirection = "row";
    layout.style.gridTemplateColumns = "";
    primary.style.position = geometry.narrow ? "relative" : "";
    primary.style.flex = "1 1 0";
    primary.style.gridColumn = "";
    primary.style.gridRow = "";
    updateOverlayBounds();
  };

  const setContextExpanded = (expanded: boolean) => {
    preferences.context.expanded = expanded;
    narrowExpanded.context = expanded;
    compactExpanded.context = expanded;
    if (geometry.narrow && expanded) narrowFront = "context";
    save();
    render();
  };

  toggles.history.addEventListener("click", () => {
    const nextExpanded = !geometry.historyExpanded;
    if (geometry.narrow) narrowExpanded.history = !geometry.historyExpanded;
    else preferences.history.expanded = !geometry.historyExpanded;
    if (geometry.narrow && nextExpanded) narrowFront = "history";
    save();
    render();
    if (!panels.history.hidden) {
      const saved = focusTargets.history;
      const target = saved?.isConnected && !saved.hidden ? saved
        : panels.history.querySelector<HTMLElement>("button, input, [tabindex]");
      if (target?.isConnected) target.focus();
    }
  });

  toggles.context.addEventListener("click", () => {
    setContextExpanded(!geometry.contextExpanded);
    if (!panels.context.hidden) {
      const saved = focusTargets.context;
      const target = saved?.isConnected && !saved.hidden ? saved
        : panels.context.querySelector<HTMLElement>("button, input, [tabindex]");
      if (target?.isConnected) target.focus();
    }
  });
  closeContext?.addEventListener("click", () => {
    setContextExpanded(false);
    toggles.context.focus();
  });

  const resizeHistory = (width: number) => {
    preferences.history.width = Math.max(minimumHistory, Math.min(geometry.historyMaximum, width));
    render();
  };
  historyResizer.addEventListener("keydown", event => {
    let width = geometry.history;
    const step = event.shiftKey ? 40 : 16;
    if (event.key === "Home") width = minimumHistory;
    else if (event.key === "End") width = geometry.historyMaximum;
    else if (event.key === "ArrowLeft") width -= step;
    else if (event.key === "ArrowRight") width += step;
    else return;
    event.preventDefault(); resizeHistory(width); save();
  });
  historyResizer.addEventListener("pointerdown", event => {
    if (event.button !== 0 || geometry.narrow) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = geometry.history;
    historyResizer.focus();
    historyResizer.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => resizeHistory(startWidth + moveEvent.clientX - startX);
    const finish = () => {
      historyResizer.removeEventListener("pointermove", move);
      historyResizer.removeEventListener("lostpointercapture", finish);
      save();
    };
    historyResizer.addEventListener("pointermove", move);
    historyResizer.addEventListener("lostpointercapture", finish);
  });

  const observer = new ResizeObserver(() => {
    const width = layout.getBoundingClientRect().width;
    if (width > 0) { available = width; render(); }
    updateOverlayBounds();
  });
  observer.observe(layout);
  if (chat) observer.observe(chat);
  if (composer) observer.observe(composer);
  render();
}
