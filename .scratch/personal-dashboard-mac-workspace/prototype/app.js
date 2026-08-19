const variants = {
  A: { name: "Agenda-led", description: "The week is the anchor; detail stays quiet until selected." },
  B: { name: "Action-led", description: "The next action is the anchor; the week becomes a compact index." },
};

const fixture = {
  weekLabel: "Aug 10–16",
  progress: 1,
  goal: 3,
  next: "Thursday at 4:00 PM",
  reminder: "Reminder set for 3:45 PM",
  primary: [
    {
      id: "mon",
      day: "Mon",
      date: "Aug 10",
      time: "4:00 PM",
      title: "Monday departure",
      status: "Workout recorded",
      tone: "complete",
      detail: "You left for the gym and recorded Strength · 35 min · Moderate.",
      workout: "Strength · 35 min",
    },
    {
      id: "thu",
      day: "Thu",
      date: "Aug 13",
      time: "4:00 PM",
      title: "Thursday departure",
      status: "Next up",
      tone: "upcoming",
      detail: "Your departure reminder is ready. No response is needed yet.",
      workout: null,
    },
    {
      id: "sat",
      day: "Sat",
      date: "Aug 15",
      time: "11:00 AM",
      title: "Saturday departure",
      status: "Planned",
      tone: "planned",
      detail: "This departure is planned for later in the week.",
      workout: null,
    },
  ],
  fallback: [
    {
      id: "fri",
      day: "Fri",
      date: "Aug 14",
      time: "4:00 PM",
      title: "Friday fallback",
      status: "Available",
      tone: "available",
      detail: "Available if a primary departure moves here.",
      workout: null,
    },
    {
      id: "sun",
      day: "Sun",
      date: "Aug 16",
      time: "11:00 AM",
      title: "Sunday fallback",
      status: "Unavailable",
      tone: "unavailable",
      detail: "Not available because it follows the Saturday primary too closely.",
      workout: null,
    },
  ],
};

const state = {
  variant: readVariant(),
  selectedId: "thu",
  destination: "week",
  compactSurface: "info",
};

const root = document.querySelector("#prototype-root");

function readVariant() {
  const value = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return value in variants ? value : "A";
}

function icon(name) {
  const paths = {
    week: '<path d="M4 7.5h16M7 3v3m10-3v3M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z"/><path d="m8 13 2.2 2.2L16 9.5"/>',
    history: '<path d="M4.8 8.3A8 8 0 1 1 4 12"/><path d="M4 4v4.3h4.3M12 8v4.5l3 1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    dumbbell: '<path d="M6 7v10M3.5 9.5v5M18 7v10m2.5-7.5v5M6 12h12"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function navButton(id, label, shortcut) {
  const isCurrent = state.destination === id;
  return `<button class="nav-item${isCurrent ? " is-current" : ""}" type="button" data-destination="${id}" aria-current="${isCurrent ? "page" : "false"}">
    ${icon(id)}<span>${label}</span><kbd>${shortcut}</kbd>
  </button>`;
}

function sidebar() {
  return `<nav class="sidebar" aria-label="Primary destinations">
    <div class="brand"><span class="brand-mark" aria-hidden="true">P</span><div><strong>Personal Dashboard</strong><small>Local on this Mac</small></div></div>
    <div class="nav-list">
      ${navButton("week", "This Week", "⌘1")}
      ${navButton("history", "History", "⌘2")}
      ${navButton("settings", "Settings", "⌘3")}
    </div>
    <div class="sidebar-foot"><span class="privacy-dot" aria-hidden="true"></span><span>Private · Offline</span></div>
  </nav>`;
}

function compactHeader() {
  const labels = { week: "This Week", history: "History", settings: "Settings" };
  return `<header class="compact-header">
    <div class="compact-brand"><span class="brand-mark" aria-hidden="true">P</span><strong>Personal Dashboard</strong></div>
    <label class="destination-picker"><span class="sr-only">Destination</span>
      <select data-compact-destination>
        ${Object.entries(labels).map(([id, label]) => `<option value="${id}"${state.destination === id ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
  </header>`;
}

function progressRing() {
  const ratio = fixture.progress / fixture.goal;
  const dash = Math.round(100 * ratio);
  return `<div class="progress-ring" style="--progress:${dash}" role="img" aria-label="${fixture.progress} of ${fixture.goal} qualifying workouts complete">
    <span><strong>${fixture.progress}</strong><small>of ${fixture.goal}</small></span>
  </div>`;
}

function slotRow(slot, compact = false) {
  const selected = state.selectedId === slot.id;
  return `<li>
    <button type="button" class="slot-row ${slot.tone}${selected ? " is-selected" : ""}${compact ? " is-dense" : ""}" data-slot="${slot.id}" aria-pressed="${selected}">
      <span class="slot-date"><strong>${slot.day}</strong><small>${slot.time}</small></span>
      <span class="slot-copy"><strong>${slot.title}</strong><small><span class="status-symbol" aria-hidden="true"></span>${slot.status}${slot.workout ? ` · ${slot.workout}` : ""}</small></span>
      ${icon("chevron")}
    </button>
  </li>`;
}

function agendaList(compact = false) {
  return `<section class="agenda-section" aria-labelledby="primary-heading">
    <div class="section-heading"><h3 id="primary-heading">Primary departures</h3><span>3 planned</span></div>
    <ol class="slot-list">${fixture.primary.map((slot) => slotRow(slot, compact)).join("")}</ol>
  </section>
  <section class="agenda-section fallback" aria-labelledby="fallback-heading">
    <div class="section-heading"><h3 id="fallback-heading">Fallback slots</h3><span>1 available</span></div>
    <ol class="slot-list">${fixture.fallback.map((slot) => slotRow(slot, compact)).join("")}</ol>
  </section>`;
}

function variantAInfo() {
  return `<div class="pane-scroll">
    <header class="info-header">
      <p class="eyebrow">This Week · ${fixture.weekLabel}</p>
      <div class="progress-summary">${progressRing()}<div><h1>${fixture.progress} of ${fixture.goal} workouts</h1><p>Two more qualify this week.</p></div></div>
      <div class="next-strip"><span>Next departure</span><strong>${fixture.next}</strong><small>${fixture.reminder}</small></div>
    </header>
    ${agendaList(false)}
  </div>`;
}

function variantBInfo() {
  return `<div class="pane-scroll dense-info">
    <header class="dense-week-header">
      <div><p class="eyebrow">${fixture.weekLabel}</p><h1>This Week</h1></div>
      <div class="compact-progress" aria-label="${fixture.progress} of ${fixture.goal} workouts complete"><strong>${fixture.progress}/${fixture.goal}</strong><span class="mini-track"><i style="width:33%"></i></span></div>
    </header>
    ${agendaList(true)}
  </div>`;
}

function selectedSlot() {
  return [...fixture.primary, ...fixture.fallback].find((slot) => slot.id === state.selectedId) ?? fixture.primary[1];
}

function quietDetail() {
  const slot = selectedSlot();
  return `<div class="detail-scroll quiet-detail">
    <button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button>
    <p class="eyebrow">Selected departure</p>
    <div class="detail-title"><div class="day-tile"><strong>${slot.day}</strong><span>${slot.date.replace("Aug ", "")}</span></div><div><h2>${slot.title}</h2><p>${slot.date} · ${slot.time}</p></div></div>
    <div class="status-line ${slot.tone}" role="status"><span class="status-symbol" aria-hidden="true"></span><strong>${slot.status}</strong></div>
    <p class="detail-explanation">${slot.detail}</p>
    ${slot.id === "thu" ? `<section class="detail-section" aria-labelledby="reminder-a"><h3 id="reminder-a">Before you go</h3><dl><div><dt>Reminder</dt><dd>3:45 PM</dd></div><div><dt>Follow-up</dt><dd>4:15 PM if unanswered</dd></div></dl></section>
    <button type="button" class="primary-action">View departure plan ${icon("arrow")}</button>` : ""}
    ${slot.workout ? `<section class="detail-section"><h3>Recorded workout</h3><p>${slot.workout} · Moderate effort</p><button type="button" class="text-button">Review record</button></section>` : ""}
    <p class="detail-footnote">Exercise responses stay click-only. No profile data is read by this prototype.</p>
  </div>`;
}

function actionDetail() {
  const slot = selectedSlot();
  const isNext = slot.id === "thu";
  return `<div class="detail-scroll action-detail">
    <button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button>
    ${isNext ? `<section class="action-hero" aria-labelledby="action-title">
      <div class="action-kicker"><span class="pulse" aria-hidden="true"></span>Next required action</div>
      <p class="action-time">In 2 hours</p>
      <h2 id="action-title">Leave for the gym at 4:00 PM</h2>
      <p>Your reminder will arrive at 3:45 PM. You do not need to respond yet.</p>
      <button type="button" class="primary-action">Review departure plan ${icon("arrow")}</button>
    </section>` : `<section class="action-hero selected-context"><div class="action-kicker">Selected departure</div><h2>${slot.title}</h2><p>${slot.detail}</p></section>`}
    <section class="action-facts" aria-label="Weekly context">
      <div><span>Progress</span><strong>${fixture.progress} of ${fixture.goal}</strong><small>Two workouts remaining</small></div>
      <div><span>Fallback</span><strong>Friday available</strong><small>Sunday unavailable</small></div>
    </section>
    <section class="detail-section upcoming-section"><div class="section-heading"><h3>After this</h3><span>Saturday</span></div><p>Your final primary departure is Saturday at 11:00 AM.</p></section>
    <p class="detail-footnote">Exercise responses stay click-only. No profile data is read by this prototype.</p>
  </div>`;
}

function unavailableDestination() {
  const labels = { history: "History", settings: "Settings" };
  const copy = state.destination === "history"
    ? "The selected comparison direction will be applied to long week and workout-record states after review."
    : "The selected comparison direction will be applied to Routine, Profile & Data, and Notifications after review.";
  return `<section class="placeholder-pane" aria-labelledby="placeholder-title"><button type="button" class="back-button" data-back>${icon("arrow")} Back</button><p class="eyebrow">Deliberately paused</p><h1 id="placeholder-title">${labels[state.destination]}</h1><p>${copy}</p><button type="button" class="secondary-action" data-destination="week">Return to This Week</button></section>`;
}

function workspace() {
  if (state.destination !== "week") {
    return `<main class="workspace placeholder-workspace" data-compact-surface="detail">${unavailableDestination()}</main>`;
  }

  const info = state.variant === "A" ? variantAInfo() : variantBInfo();
  const detail = state.variant === "A" ? quietDetail() : actionDetail();
  return `<main class="workspace variant-${state.variant.toLowerCase()}" data-compact-surface="${state.compactSurface}">
    <section class="information-pane" aria-label="This Week agenda">${info}</section>
    <aside class="detail-pane" aria-label="Selected departure details">${detail}</aside>
  </main>`;
}

function switcher() {
  const meta = variants[state.variant];
  return `<div class="prototype-switcher" role="group" aria-label="Prototype variant switcher">
    <button type="button" data-cycle="-1" aria-label="Previous variant">←</button>
    <div><strong>${state.variant} — ${meta.name}</strong><span>${meta.description}</span></div>
    <button type="button" data-cycle="1" aria-label="Next variant">→</button>
  </div>`;
}

function render() {
  document.title = `Personal Dashboard — ${state.variant} ${variants[state.variant].name}`;
  root.innerHTML = `<div class="prototype-frame">
    ${compactHeader()}
    ${sidebar()}
    ${workspace()}
  </div>${switcher()}<div class="prototype-badge">PROTOTYPE · SYNTHETIC DATA</div>`;
  bindEvents();
}

function bindEvents() {
  root.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => {
    state.selectedId = button.dataset.slot;
    state.compactSurface = "detail";
    render();
    window.requestAnimationFrame(() => root.querySelector(".back-button")?.focus());
  }));

  root.querySelectorAll("[data-destination]").forEach((button) => button.addEventListener("click", () => {
    state.destination = button.dataset.destination;
    state.compactSurface = "info";
    render();
  }));

  root.querySelector("[data-compact-destination]")?.addEventListener("change", (event) => {
    state.destination = event.target.value;
    state.compactSurface = "info";
    render();
  });

  root.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => {
    if (state.destination !== "week") state.destination = "week";
    state.compactSurface = "info";
    render();
    window.requestAnimationFrame(() => root.querySelector(`[data-slot="${state.selectedId}"]`)?.focus());
  }));

  root.querySelectorAll("[data-cycle]").forEach((button) => button.addEventListener("click", () => cycleVariant(Number(button.dataset.cycle))));
}

function cycleVariant(delta) {
  const keys = Object.keys(variants);
  const next = keys[(keys.indexOf(state.variant) + delta + keys.length) % keys.length];
  const url = new URL(window.location.href);
  url.searchParams.set("variant", next);
  window.history.replaceState({}, "", url);
  state.variant = next;
  render();
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target.matches("input, textarea, select, [contenteditable]")) return;
  if (event.key === "ArrowLeft") cycleVariant(-1);
  if (event.key === "ArrowRight") cycleVariant(1);
  if (event.metaKey && ["1", "2", "3"].includes(event.key)) {
    event.preventDefault();
    state.destination = { "1": "week", "2": "history", "3": "settings" }[event.key];
    state.compactSurface = "info";
    render();
  }
});

window.addEventListener("popstate", () => {
  state.variant = readVariant();
  render();
});

render();
