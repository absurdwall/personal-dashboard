/** App-local layout preferences never contain Vault or conversation data. */
export type PanelPreferences = {
  history: { expanded: boolean; width: number };
  context: { expanded: boolean; width: number };
  narrow?: { history: boolean; context: boolean };
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

/** Reserve a usable conversation before distributing auxiliary width. */
export function panelGeometry(available: number, preferences: PanelPreferences) {
  const narrow = available < 900;
  const visible = (["history", "context"] as const).filter(side => preferences[side].expanded);
  const separators = visible.length * 16;
  const budget = Math.max(0, available - 360 - separators);
  const base = visible.reduce((sum, side) => sum + minimum[side], 0);
  const extra = visible.reduce((sum, side) => sum + preferences[side].width - minimum[side], 0);
  const extraScale = extra > 0 ? Math.min(1, Math.max(0, budget - base) / extra) : 1;
  const width = (side: Side) => preferences[side].expanded
    ? minimum[side] + (preferences[side].width - minimum[side]) * extraScale : 0;
  return {
    narrow,
    history: width("history"),
    context: width("context"),
    budget,
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
  // Narrow windows retain separate disclosure choices, preserving roomy-window preferences.
  const narrowExpanded = preferences.narrow ?? { history: false, context: false };
  const focusTargets: Partial<Record<Side, HTMLElement>> = {};
  let available = layout.getBoundingClientRect().width;
  let geometry = panelGeometry(available, preferences);
  const save = () => {
    try { localStorage.setItem(preferenceKey, JSON.stringify({ ...preferences, narrow: narrowExpanded })); } catch { /* Layout remains usable. */ }
  };
  const render = () => {
    geometry = panelGeometry(available, preferences);
    layout.dataset.narrow = String(geometry.narrow);
    for (const side of sides) {
      const expanded = geometry.narrow ? narrowExpanded[side] : preferences[side].expanded;
      if (!expanded && panels[side].contains(document.activeElement)) {
        focusTargets[side] = document.activeElement as HTMLElement;
        toggles[side].focus();
      }
      panels[side].hidden = !expanded;
      toggles[side].setAttribute("aria-expanded", String(expanded));
      resizers[side].hidden = !expanded || geometry.narrow;
      const maxWidth = Math.max(minimum[side], geometry.budget - (side === "history" ? geometry.context : geometry.history));
      resizers[side].setAttribute("aria-valuemin", String(minimum[side]));
      resizers[side].setAttribute("aria-valuemax", String(Math.round(maxWidth)));
      resizers[side].setAttribute("aria-valuenow", String(Math.round(geometry[side])));
    }
    if (geometry.narrow) layout.style.gridTemplateColumns = "minmax(0, 1fr)";
    else layout.style.gridTemplateColumns = [
      preferences.history.expanded ? `${geometry.history}px 16px` : "",
      "minmax(0, 1fr)",
      preferences.context.expanded ? `16px ${geometry.context}px` : "",
    ].filter(Boolean).join(" ");
  };
  for (const side of sides) {
    toggles[side].addEventListener("click", () => {
      if (geometry.narrow) { narrowExpanded[side] = !narrowExpanded[side]; save(); }
      else { preferences[side].expanded = !preferences[side].expanded; save(); }
      render();
      if (!panels[side].hidden) {
        const target = focusTargets[side] ?? panels[side].querySelector<HTMLElement>("button, input, [tabindex]");
        if (target?.isConnected) target.focus();
      }
    });
    const resize = (width: number) => {
      const other = side === "history" ? "context" : "history";
      const max = Math.min(640, geometry.budget - geometry[other]);
      if (preferences[other].expanded) preferences[other].width = geometry[other];
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
