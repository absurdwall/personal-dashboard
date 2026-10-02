/** App-local layout preferences never contain Vault or conversation data. */
export type PanelPreferences = {
  history: { expanded: boolean; width: number };
  context: { expanded: boolean; width: number };
  narrow?: { history: boolean; context: boolean };
  compact?: { context: boolean };
};
type Side = "history" | "context";
const preferenceKey = "personal-dashboard.collaboration-panels.v1";
const minimum = { history: 180, context: 240 };
const defaults = (): PanelPreferences => ({
  history: { expanded: true, width: 216 },
  context: { expanded: true, width: 304 },
});

export function readPanelPreferences(value: string | null): PanelPreferences {
  const result = defaults();
  try {
    const saved = JSON.parse(value ?? "null");
    if (typeof saved?.narrow?.history === "boolean" && typeof saved?.narrow?.context === "boolean") {
      result.narrow = { history: saved.narrow.history, context: saved.narrow.context };
    }
    if (typeof saved?.compact?.context === "boolean") {
      result.compact = { context: saved.compact.context };
    }
    for (const side of ["history", "context"] as const) {
      const panel = saved?.[side];
      if (typeof panel?.expanded === "boolean") result[side].expanded = panel.expanded;
      if (typeof panel?.width === "number" && Number.isFinite(panel.width)) {
        result[side].width = Math.max(minimum[side], Math.min(640, panel.width));
      }
    }
  } catch { /* Malformed or unavailable storage uses safe defaults. */ }
  return result;
}

/** Width-driven disclosures are separate from the user's roomy-window choices. */
export function panelGeometry(available: number, preferences: PanelPreferences) {
  const mode = available < 556 ? "single" : available < 900 ? "two" : "three";
  const narrow = mode === "single";
  const historyExpanded = narrow ? preferences.narrow?.history ?? false : preferences.history.expanded;
  const contextExpanded = narrow ? preferences.narrow?.context ?? false
    : mode === "two" ? preferences.compact?.context ?? false : preferences.context.expanded;
  const visible = (["history", "context"] as const).filter(side =>
    side === "history" ? historyExpanded && !narrow : contextExpanded && mode === "three");
  const separators = visible.length * 16;
  const budget = Math.max(0, available - 360 - separators);
  // Keep Sessions compact in the middle mode, even for oversized saved widths.
  const requested = { history: mode === "two" ? Math.min(260, preferences.history.width) : preferences.history.width,
    context: preferences.context.width };
  const base = visible.reduce((sum, side) => sum + minimum[side], 0);
  const extra = visible.reduce((sum, side) => sum + requested[side] - minimum[side], 0);
  const extraScale = extra > 0 ? Math.min(1, Math.max(0, budget - base) / extra) : 1;
  const width = (side: Side) => visible.includes(side)
    ? minimum[side] + (requested[side] - minimum[side]) * extraScale : 0;
  return {
    mode, narrow, historyExpanded, contextExpanded,
    history: width("history"), context: width("context"), budget,
    historyMaximum: mode === "two" ? Math.min(260, budget) : Math.min(640, budget - width("context")),
    contextMaximum: Math.min(640, budget - width("history")),
  };
}

export function initializeCollaborationPanels(): void {
  const layout = document.querySelector<HTMLElement>(".collaboration-layout");
  if (!layout) return;
  let preferences = defaults();
  try { preferences = readPanelPreferences(localStorage.getItem(preferenceKey)); } catch { /* Storage disabled. */ }
  const sides = ["history", "context"] as const;
  const panels = {
    history: document.getElementById("collaboration-history-panel")!,
    context: document.getElementById("collaboration-work-panel")!,
  };
  const toggles = {
    history: document.getElementById("collaboration-toggle-history")!,
    context: document.getElementById("collaboration-toggle-context")!,
  };
  const resizers = {
    history: document.getElementById("collaboration-history-resizer")!,
    context: document.getElementById("collaboration-context-resizer")!,
  };
  // Old narrow defaults apply only when two columns genuinely no longer fit.
  const narrowExpanded = preferences.narrow ??= { history: false, context: false };
  const compactExpanded = preferences.compact ??= { context: false };
  const focusTargets: Partial<Record<Side, HTMLElement>> = {};
  let available = layout.getBoundingClientRect().width;
  let geometry = panelGeometry(available, preferences);
  const save = () => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)); } catch { /* Layout remains usable. */ }
  };
  const render = () => {
    geometry = panelGeometry(available, preferences);
    layout.dataset.narrow = String(geometry.narrow);
    layout.dataset.columns = geometry.mode;
    for (const side of sides) {
      const expanded = side === "history" ? geometry.historyExpanded : geometry.contextExpanded;
      if (!expanded && panels[side].contains(document.activeElement)) {
        focusTargets[side] = document.activeElement as HTMLElement;
        toggles[side].focus();
      }
      panels[side].hidden = !expanded;
      toggles[side].setAttribute("aria-expanded", String(expanded));
      resizers[side].hidden = !expanded || geometry.narrow || (side === "context" && geometry.mode === "two");
      const maxWidth = Math.max(minimum[side], side === "history" ? geometry.historyMaximum : geometry.contextMaximum);
      resizers[side].setAttribute("aria-valuemin", String(minimum[side]));
      resizers[side].setAttribute("aria-valuemax", String(Math.round(maxWidth)));
      resizers[side].setAttribute("aria-valuenow", String(Math.round(geometry[side])));
    }
    if (geometry.narrow) layout.style.gridTemplateColumns = "minmax(0, 1fr)";
    else layout.style.gridTemplateColumns = [
      geometry.historyExpanded ? `${geometry.history}px 16px` : "",
      "minmax(0, 1fr)",
      geometry.context > 0 ? `16px ${geometry.context}px` : "",
    ].filter(Boolean).join(" ");
  };
  for (const side of sides) {
    toggles[side].addEventListener("click", () => {
      if (geometry.narrow) { narrowExpanded[side] = !narrowExpanded[side]; save(); }
      else if (geometry.mode === "two" && side === "context") { compactExpanded.context = !compactExpanded.context; save(); }
      else { preferences[side].expanded = !preferences[side].expanded; save(); }
      render();
      if (!panels[side].hidden) {
        const target = focusTargets[side] ?? panels[side].querySelector<HTMLElement>("button, input, [tabindex]");
        if (target?.isConnected) target.focus();
      }
    });
    const resize = (width: number) => {
      const other = side === "history" ? "context" : "history";
      const max = side === "history" ? geometry.historyMaximum : geometry.contextMaximum;
      if (geometry[other] > 0) preferences[other].width = geometry[other];
      preferences[side].width = Math.max(minimum[side], Math.min(max, width));
      render();
    };
    resizers[side].addEventListener("keydown", event => {
      let width = geometry[side];
      const step = event.shiftKey ? 40 : 16;
      if (event.key === "Home") width = minimum[side];
      else if (event.key === "End") width = geometry.budget;
      else if (event.key === "ArrowLeft") width += side === "history" ? -step : step;
      else if (event.key === "ArrowRight") width += side === "history" ? step : -step;
      else return;
      event.preventDefault(); resize(width); save();
    });
    resizers[side].addEventListener("pointerdown", event => {
      if (event.button !== 0 || geometry.narrow) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = geometry[side];
      resizers[side].focus();
      resizers[side].setPointerCapture(event.pointerId);
      const move = (moveEvent: PointerEvent) => resize(startWidth + (moveEvent.clientX - startX) * (side === "history" ? 1 : -1));
      const finish = () => {
        resizers[side].removeEventListener("pointermove", move);
        resizers[side].removeEventListener("lostpointercapture", finish);
        save();
      };
      resizers[side].addEventListener("pointermove", move);
      resizers[side].addEventListener("lostpointercapture", finish);
    });
  }
  new ResizeObserver(entries => {
    const width = entries[0]?.contentRect.width ?? 0;
    if (width <= 0) return; // A hidden destination must not erase window preferences.
    available = width; render();
  }).observe(layout);
  render();
}
