// PROTOTYPE — ticket 07 layout alternatives. Real Personal Dashboard labels and
// exercise content are represented as static fixture data. Nothing is persisted.

const variants = {
  A: {
    name: "Agenda first",
    description: "The week stays scannable; selection opens the next useful action.",
  },
  B: {
    name: "Action first",
    description: "The next required action leads; the agenda remains a compact index.",
  },
  C: {
    name: "Timeline first",
    description: "One chronological rail carries the week; detail is a calm side context.",
  },
};

const data = {
  week: "Monday, August 10 – Sunday, August 16",
  progress: "0 of 3 completed",
  next: "Monday, August 10 at 4:00 PM",
  reminder: "Next departure reminder is scheduled.",
  primary: [
    { id: "mon", day: "Monday", shortDay: "Mon", time: "4:00 PM", status: "Awaiting response", tone: "due", detail: "Time to leave for the gym.", date: "August 10" },
    { id: "wed", day: "Wednesday", shortDay: "Wed", time: "4:00 PM", status: "Scheduled", tone: "scheduled", detail: "This departure is planned for later this week.", date: "August 12" },
    { id: "fri", day: "Friday", shortDay: "Fri", time: "4:00 PM", status: "Scheduled", tone: "scheduled", detail: "This departure is planned for later this week.", date: "August 14" },
  ],
  fallback: [
    { id: "sat", day: "Saturday", shortDay: "Sat", time: "Available", status: "Available", tone: "available", detail: "Available if a primary departure moves here.", date: "August 15" },
    { id: "sun", day: "Sunday", shortDay: "Sun", time: "Available", status: "Available", tone: "available", detail: "Available if a primary departure moves here.", date: "August 16" },
  ],
};

const state = {
  variant: readParam("variant", "A").toUpperCase(),
  mode: readParam("mode", "normal"),
  selected: readParam("selected", "mon"),
  surface: "list",
};

if (!variants[state.variant]) state.variant = "A";
if (!["normal", "pending"].includes(state.mode)) state.mode = "normal";

const app = document.querySelector("#app");
const allSlots = () => [...data.primary, ...data.fallback];
const slot = () => allSlots().find((item) => item.id === state.selected) ?? data.primary[0];
const isPending = () => state.mode === "pending";

function readParam(name, fallback) {
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function icon(name) {
  const paths = {
    week: '<path d="M4 7.5h16M7 3v3m10-3v3M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12Z"/><path d="m8 13 2.2 2.2L16 9.5"/>',
    history: '<path d="M4.8 8.3A8 8 0 1 1 4 12"/><path d="M4 4v4.3h4.3M12 8v4.5l3 1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 .1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 .3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    warning: '<path d="M12 8v5m0 3.2v.1M10.5 3.8 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L13.5 3.8a1.7 1.7 0 0 0-3 0Z"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function nav() {
  return `<aside class="sidebar" aria-label="Primary navigation">
    <div class="brand"><span class="brand-mark">P</span><div><strong>Personal Dashboard</strong><small>Exercise tracking</small></div></div>
    <nav class="nav-list">
      <button class="nav-item is-current" type="button" aria-current="page">${icon("week")}<span>This Week</span><kbd>⌘1</kbd></button>
      <button class="nav-item" type="button">${icon("history")}<span>History</span><kbd>⌘2</kbd></button>
      <button class="nav-item" type="button">${icon("settings")}<span>Settings</span><kbd>⌘3</kbd></button>
    </nav>
    <div class="sidebar-foot"><span class="privacy-dot"></span>Private and offline on this Mac.</div>
  </aside>`;
}

function compactNav() {
  return `<header class="compact-nav"><div class="compact-brand"><span class="brand-mark">P</span><strong>Personal Dashboard</strong></div><select aria-label="Destination"><option>This Week</option><option>History</option><option>Settings</option></select></header>`;
}

function modeBar() {
  return `<div class="mode-bar" role="group" aria-label="Prototype state"><span>Fixture state</span><button class="${state.mode === "normal" ? "is-active" : ""}" data-mode="normal">Normal week</button><button class="${state.mode === "pending" ? "is-active" : ""}" data-mode="pending">Pending response</button></div>`;
}

function statusText(item) {
  if (isPending() && item.id === "mon") return "Unresolved — no response";
  return item.status;
}

function statusTone(item) {
  if (isPending() && item.id === "mon") return "attention";
  return item.tone;
}

function slotRow(item, extra = "") {
  const selected = state.selected === item.id;
  return `<li><button type="button" class="slot-row ${statusTone(item)} ${selected ? "is-selected" : ""} ${extra}" data-slot="${item.id}" aria-pressed="${selected}">
    <span class="slot-day"><strong>${item.shortDay}</strong><small>${item.day === "Saturday" || item.day === "Sunday" ? "Fallback" : item.time}</small></span>
    <span class="slot-main"><strong>${item.day} departure</strong><small><i class="status-mark" aria-hidden="true"></i>${statusText(item)}</small></span>${icon("chevron")}
  </button></li>`;
}

function progress() {
  return `<section class="progress-block"><div class="progress-copy"><span class="eyebrow">${data.week}</span><h1>${data.progress}</h1><p>Three qualifying workouts are planned this week.</p></div><div class="progress-meter" aria-label="0 of 3 completed"><span>0</span><small>of 3</small></div></section>`;
}

function nextStrip() {
  const pending = isPending();
  return `<section class="next-strip ${pending ? "is-warning" : ""}" ${pending ? 'data-slot="mon"' : ""}>
    <span class="strip-label">${pending ? "Needs attention" : "Next departure"}</span>
    <strong>${pending ? "Monday departure" : data.next}</strong>
    <small>${pending ? "Unresolved — no response" : data.reminder}</small>
    ${pending ? '<span class="strip-action">Respond</span>' : ""}
  </section>`;
}

function agendaSections(compact = false) {
  return `<section class="agenda-section"><div class="section-heading"><div><span class="eyebrow">Current plan</span><h2>Primary departures</h2></div><span>3 planned</span></div><ol>${data.primary.map((item) => slotRow(item, compact ? "is-compact" : "")).join("")}</ol></section>
  <section class="agenda-section fallback-section"><div class="section-heading"><div><span class="eyebrow">Recovery capacity</span><h2>Fallback availability</h2></div><span>2 available</span></div><ol>${data.fallback.map((item) => slotRow(item, compact ? "is-compact" : "")).join("")}</ol></section>`;
}

function detailActions() {
  if (isPending() && state.selected === "mon") {
    return `<section class="attention-detail"><span class="eyebrow attention-label">Needs attention · Monday, August 10</span><h2>Time to leave for the gym</h2><p>Choose one established outcome. The weekly agenda stays visible while you respond.</p><div class="action-stack"><button class="primary-action" type="button">Leaving for gym</button><button class="secondary-action" type="button">Move to fallback</button><button class="quiet-action" type="button">Skip</button></div></section>`;
  }
  return `<section class="selection-detail"><span class="eyebrow">Selected departure</span><div class="detail-heading"><div class="date-tile"><strong>${slot().shortDay}</strong><small>${slot().day === "Saturday" || slot().day === "Sunday" ? "Fallback" : slot().time}</small></div><div><h2>${slot().day} departure</h2><p>${slot().day === "Monday" ? "Monday, August 10 at 4:00 PM" : slot().detail}</p></div></div><div class="status-line ${statusTone(slot())}"><i class="status-mark" aria-hidden="true"></i><strong>${statusText(slot())}</strong></div><section class="detail-fact"><span>What stays visible</span><p>The selected row, its truthful status, and the weekly context remain available while this detail is open.</p></section>${slot().id === "mon" ? '<div class="quiet-note">The due response opens here automatically when required.</div>' : ""}</section>`;
}

function pendingRecovery() {
  if (!isPending() || state.selected === "mon") return "";
  return `<button class="needs-attention" type="button" data-slot="mon">${icon("warning")}<span><strong>Needs attention</strong><small>Return to Monday's pending response</small></span>${icon("chevron")}</button>`;
}

function detailPane() {
  return `<aside class="detail-pane" aria-label="Contextual detail"><div class="detail-scroll"><button class="back-button" type="button" data-back>${icon("back")}<span>Back to week</span></button>${pendingRecovery()}${detailActions()}<p class="detail-footnote">Exercise responses remain click-only. No production data is read by this prototype.</p></div></aside>`;
}

function agendaFirst() {
  return `<main class="workspace variant-a" data-surface="${state.surface}"><section class="information-pane"><div class="pane-scroll">${modeBar()}${progress()}${nextStrip()}${agendaSections()}</div></section>${detailPane()}</main>`;
}

function actionFirst() {
  return `<main class="workspace variant-b" data-surface="${state.surface}"><section class="information-pane"><div class="pane-scroll">${modeBar()}<section class="action-card ${isPending() ? "is-warning" : ""}"><span class="eyebrow">${isPending() ? "Needs attention" : "Current focus"}</span><h1>${isPending() ? "Respond to Monday's departure" : "Monday departure"}</h1><p>${isPending() ? "Unresolved — no response" : data.next}</p><button class="primary-action" type="button" data-slot="mon">${isPending() ? "Open response" : "View departure"}${icon("arrow")}</button></section><div class="compact-context"><span>${data.progress}</span><span>2 fallback available</span></div><section class="compact-agenda"><div class="section-heading"><div><span class="eyebrow">This Week · ${data.week}</span><h2>Upcoming departures</h2></div><span>5 slots</span></div><ol>${[...data.primary, ...data.fallback].map((item) => slotRow(item, "is-compact")).join("")}</ol></section></div></section>${detailPane()}</main>`;
}

function timelineFirst() {
  const timeline = [...data.primary, ...data.fallback];
  return `<main class="workspace variant-c" data-surface="${state.surface}"><section class="information-pane"><div class="pane-scroll">${modeBar()}<header class="timeline-header"><span class="eyebrow">This Week</span><h1>${data.week}</h1><div><strong>${data.progress}</strong><span>·</span><span>${isPending() ? "Needs attention" : "Next: Monday at 4:00 PM"}</span></div></header><ol class="timeline">${timeline.map((item, index) => `<li class="timeline-item ${statusTone(item)} ${state.selected === item.id ? "is-selected" : ""}"><span class="timeline-line" aria-hidden="true"><i></i></span><button type="button" class="timeline-row" data-slot="${item.id}" aria-pressed="${state.selected === item.id}"><span><strong>${item.day}</strong><small>${item.time}</small></span><span><strong>${item.day === "Saturday" || item.day === "Sunday" ? "Fallback availability" : "Primary departure"}</strong><small><i class="status-mark" aria-hidden="true"></i>${statusText(item)}</small></span>${icon("chevron")}</button></li>`).join("")}</ol><p class="timeline-note">${data.reminder}</p></div></section>${detailPane()}</main>`;
}

function switcher() {
  return `<div class="prototype-switcher" role="group" aria-label="Layout alternative switcher"><button type="button" data-cycle="-1" aria-label="Previous alternative">←</button><div><strong>${state.variant} — ${variants[state.variant].name}</strong><span>${variants[state.variant].description}</span></div><button type="button" data-cycle="1" aria-label="Next alternative">→</button></div>`;
}

function render() {
  const workspace = state.variant === "A" ? agendaFirst() : state.variant === "B" ? actionFirst() : timelineFirst();
  app.innerHTML = `<div class="frame">${compactNav()}${nav()}${workspace}</div>${switcher()}<div class="prototype-badge">PROTOTYPE · TICKET 07 BASELINE · FIXTURE ONLY</div>`;
  document.title = `Personal Dashboard — ${state.variant} ${variants[state.variant].name}`;
  bind();
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("variant", state.variant);
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("selected", state.selected);
  window.history.replaceState({}, "", url);
}

function bind() {
  app.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => {
    state.selected = button.dataset.slot;
    state.surface = "detail";
    syncUrl();
    render();
    requestAnimationFrame(() => app.querySelector(".back-button, .action-stack button")?.focus());
  }));
  app.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    state.surface = "list";
    syncUrl();
    render();
    requestAnimationFrame(() => app.querySelector(`[data-slot="${state.selected}"]`)?.focus());
  }));
  app.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    state.selected = "mon";
    state.surface = "list";
    syncUrl();
    render();
  }));
  app.querySelectorAll("[data-cycle]").forEach((button) => button.addEventListener("click", () => cycle(Number(button.dataset.cycle))));
}

function cycle(delta) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(state.variant);
  state.variant = keys[(index + delta + keys.length) % keys.length];
  syncUrl();
  render();
}

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select, [contenteditable]")) return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
});

render();
