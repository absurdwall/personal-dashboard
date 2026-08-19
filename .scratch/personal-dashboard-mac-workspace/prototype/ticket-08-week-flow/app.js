// PROTOTYPE — This Week flow alternatives. Static fixture data only.
// The question: does a full-width agenda with detail revealed on selection
// make the new workout-record-first model feel less redundant?

const variants = {
  A: {
    name: "List + temporary sheet",
    description: "TickTick-like agenda first; detail appears only after selection.",
  },
  B: {
    name: "Inline selected row",
    description: "The selected row expands in place; the week never leaves the list.",
  },
  C: {
    name: "Two-track week board",
    description: "Primary plan and recovery capacity sit side by side; detail is a modal layer.",
  },
};

const sourceData = {
  week: "Monday, August 10 – Sunday, August 16",
  progress: "0 of 3 completed",
  next: "Monday · 4:00 PM",
  primary: [
    {
      id: "mon",
      day: "Monday",
      shortDay: "Mon",
      date: "August 10",
      time: "4:00 PM",
      label: "Primary workout",
      status: "Needs workout record",
      tone: "due",
    },
    {
      id: "wed",
      day: "Wednesday",
      shortDay: "Wed",
      date: "August 12",
      time: "4:00 PM",
      label: "Primary workout",
      status: "Scheduled",
      tone: "scheduled",
    },
    {
      id: "fri",
      day: "Friday",
      shortDay: "Fri",
      date: "August 14",
      time: "4:00 PM",
      label: "Primary workout",
      status: "Scheduled",
      tone: "scheduled",
    },
  ],
  fallback: [
    {
      id: "sat",
      day: "Saturday",
      shortDay: "Sat",
      date: "August 15",
      time: "4:00 PM",
      label: "Available workout time",
      status: "Available",
      tone: "available",
    },
    {
      id: "sun",
      day: "Sunday",
      shortDay: "Sun",
      date: "August 16",
      time: "4:00 PM",
      label: "Available workout time",
      status: "Available",
      tone: "available",
    },
  ],
};

const state = {
  variant: readParam("variant", "A").toUpperCase(),
  surface: "list",
  selected: readParam("selected", "mon"),
  detailMode: "summary",
  rescheduleDay: "Saturday",
  rescheduleTime: "4:00 PM",
  toast: null,
  toastUndo: null,
  recordSaved: false,
};

if (!variants[state.variant]) state.variant = "A";

const app = document.querySelector("#app");
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const times = ["4:00 PM", "5:30 PM", "6:00 PM", "7:30 PM"];

function readParam(name, fallback) {
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

function icon(name) {
  const paths = {
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16M8 14h.01M12 14h.01M16 14h.01"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    history: '<path d="M4.8 8.3A8 8 0 1 1 4 12"/><path d="M4 4v4.3h4.3M12 8v4.5l3 1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 .1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 .3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    warning: '<path d="M12 8v5m0 3.2v.1M10.5 3.8 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L13.5 3.8a1.7 1.7 0 0 0-3 0Z"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
    edit: '<path d="m4 16.5-.8 3.8 3.8-.8L18.3 8.2a2.1 2.1 0 0 0-3-3L4 16.5Z"/><path d="m13.8 6.2 4 4"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function allSlots() {
  return [...sourceData.primary, ...sourceData.fallback];
}

function slotById(id = state.selected) {
  return allSlots().find((item) => item.id === id) ?? sourceData.primary[0];
}

function slotState(item) {
  return item.state ?? item.tone;
}

function isCompleted(item) {
  return slotState(item) === "completed";
}

function isSkipped(item) {
  return slotState(item) === "skipped";
}

function isMoved(item) {
  return slotState(item) === "moved";
}

function statusLabel(item) {
  return item.status;
}

function nav() {
  return `<aside class="sidebar" aria-label="Primary navigation">
    <div class="brand"><span class="brand-mark">P</span><div><strong>Personal Dashboard</strong><small>Exercise tracking</small></div></div>
    <nav class="nav-list">
      <button class="nav-item is-current" type="button" aria-current="page">${icon("calendar")}<span>This Week</span><kbd>⌘1</kbd></button>
      <button class="nav-item" type="button">${icon("history")}<span>History</span><kbd>⌘2</kbd></button>
      <button class="nav-item" type="button">${icon("settings")}<span>Settings</span><kbd>⌘3</kbd></button>
    </nav>
    <div class="sidebar-foot"><span class="privacy-dot"></span>Private and offline on this Mac.</div>
  </aside>`;
}

function compactNav() {
  return `<header class="compact-nav"><div class="compact-brand"><span class="brand-mark">P</span><strong>Personal Dashboard</strong></div><select aria-label="Destination"><option>This Week</option><option>History</option><option>Settings</option></select></header>`;
}

function header() {
  const completed = allSlots().filter(isCompleted).length;
  const next = allSlots().find((item) => !isCompleted(item) && !isSkipped(item) && item.tone !== "available");
  return `<header class="week-header">
    <div class="title-block"><span class="eyebrow">This Week · ${sourceData.week}</span><h1>Exercise plan</h1><p>${completed} of 3 qualifying workouts completed</p></div>
    <div class="progress-chip"><strong>${completed}/3</strong><span>completed</span></div>
    <button class="next-card ${next?.tone === "due" ? "is-due" : ""}" type="button" data-open="${next?.id ?? "mon"}"><span>${next?.tone === "due" ? "Needs workout record" : "Next workout"}</span><strong>${next ? `${next.day} · ${next.time}` : "Weekly goal complete"}</strong><small>${next ? next.date : "Optional workouts welcome"}</small></button>
  </header>`;
}

function statusMark(item) {
  const stateName = slotState(item);
  const glyph = stateName === "completed" ? "✓" : stateName === "skipped" ? "—" : stateName === "moved" ? "↪" : stateName === "available" ? "·" : stateName === "due" ? "!" : "•";
  return `<span class="status-mark status-${stateName}" aria-hidden="true">${glyph}</span>`;
}

function slotRow(item, options = {}) {
  const selected = state.selected === item.id;
  const movedText = isMoved(item) && item.movedTo ? `Changed to ${item.movedTo}` : statusLabel(item);
  return `<li class="agenda-item ${selected ? "is-selected" : ""} ${options.inline ? "has-inline-detail" : ""}">
    <button class="slot-row ${slotState(item)}" type="button" data-open="${item.id}" aria-pressed="${selected}">
      <span class="slot-date"><strong>${item.shortDay}</strong><small>${item.date}</small></span>
      <span class="slot-copy"><strong>${item.time}</strong><small>${item.label}</small></span>
      <span class="slot-status">${statusMark(item)}<span>${movedText}</span></span>
      ${icon("chevron")}
    </button>
    ${options.inline && selected ? inlineDetail() : ""}
  </li>`;
}

function section(title, eyebrow, items, options = {}) {
  return `<section class="agenda-section ${options.className ?? ""}">
    <div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><span>${items.length} ${options.countLabel ?? "items"}</span></div>
    <ol>${items.map((item) => slotRow(item, options)).join("")}</ol>
  </section>`;
}

function agenda(options = {}) {
  return `<div class="agenda-list">
    ${section("Primary workouts", "Planned schedule", sourceData.primary, options)}
    ${section("Open capacity", "Other times this week", sourceData.fallback, { ...options, className: "capacity-section", countLabel: "open" })}
  </div>`;
}

function actionButtons(item) {
  if (isCompleted(item)) {
    return `<div class="action-stack"><button class="secondary-action" type="button" data-action="edit-record">${icon("edit")}Edit workout record</button></div>`;
  }
  if (isSkipped(item)) {
    return `<div class="action-stack"><button class="secondary-action" type="button" data-action="undo-skip">Undo skip</button></div>`;
  }
  if (item.tone === "available" && !isMoved(item)) {
    return `<p class="detail-muted">This time becomes active after a workout is moved here.</p>`;
  }
  const record = item.tone === "due" || isMoved(item) ? `<button class="primary-action" type="button" data-action="record">${icon("check")}Record workout</button>` : "";
  return `<div class="action-stack">${record}<button class="secondary-action" type="button" data-action="reschedule">${icon("clock")}Change to another time</button><button class="quiet-action" type="button" data-action="skip">Skip this session</button></div>`;
}

function summaryDetail() {
  const item = slotById();
  const movement = isMoved(item) ? `<div class="moved-note"><span class="eyebrow">Schedule updated</span><strong>${item.movedTo}</strong><small>The original row stays visible as a record of the change.</small></div>` : "";
  const statusCopy = isCompleted(item) ? "Workout recorded" : isSkipped(item) ? "Skipped for this week" : item.status;
  return `<section class="detail-content">
    <div class="detail-topline"><span class="eyebrow">Selected workout</span><button class="close-button" type="button" data-close aria-label="Close detail">${icon("close")}</button></div>
    <div class="detail-title"><div class="date-tile"><strong>${item.shortDay}</strong><small>${item.date.replace("August ", "")}</small></div><div><h2>${item.day}</h2><p>${item.time} · ${item.label}</p></div></div>
    <div class="status-line ${slotState(item)}">${statusMark(item)}<strong>${statusCopy}</strong></div>
    ${movement}
    ${actionButtons(item)}
    <p class="detail-note">No departure confirmation is needed. Record the workout when you return; until then this row remains available for a change or a skip.</p>
  </section>`;
}

function recordDetail() {
  const item = slotById();
  return `<section class="detail-content form-detail">
    <div class="detail-topline"><button class="back-link" type="button" data-detail-mode="summary">${icon("back")}Back to ${item.day}</button><button class="close-button" type="button" data-close aria-label="Close detail">${icon("close")}</button></div>
    <span class="eyebrow">Workout record</span><h2>Record ${item.day}'s workout</h2><p class="form-intro">Click-only fixture controls; no typing is needed.</p>
    <div class="choice-group"><span>Activity</span><div class="choice-row"><button class="choice is-chosen" type="button">Strength</button><button class="choice" type="button">Running</button><button class="choice" type="button">Mobility</button></div></div>
    <div class="choice-group"><span>Duration</span><div class="choice-row"><button class="choice" type="button">30 min</button><button class="choice is-chosen" type="button">45 min</button><button class="choice" type="button">60 min</button></div></div>
    <div class="choice-group"><span>Effort</span><div class="choice-row"><button class="choice" type="button">Easy</button><button class="choice is-chosen" type="button">Moderate</button><button class="choice" type="button">Hard</button></div></div>
    <button class="primary-action save-action" type="button" data-action="save-record">${icon("check")}Save workout</button>
  </section>`;
}

function rescheduleDetail() {
  const item = slotById();
  const conflict = state.rescheduleDay === "Wednesday" && state.rescheduleTime === "4:00 PM";
  return `<section class="detail-content form-detail">
    <div class="detail-topline"><button class="back-link" type="button" data-detail-mode="summary">${icon("back")}Back to ${item.day}</button><button class="close-button" type="button" data-close aria-label="Close detail">${icon("close")}</button></div>
    <span class="eyebrow">Change this week only</span><h2>Choose another time</h2><p class="form-intro">All not-yet-past days and times are available. Saturday and Sunday are the suggested recovery times.</p>
    <div class="schedule-field"><label for="move-day">Day</label><select id="move-day" data-reschedule="day">${days.map((day) => `<option ${day === state.rescheduleDay ? "selected" : ""}>${day}</option>`).join("")}</select></div>
    <div class="schedule-field"><label for="move-time">Time</label><select id="move-time" data-reschedule="time">${times.map((time) => `<option ${time === state.rescheduleTime ? "selected" : ""}>${time}</option>`).join("")}</select></div>
    ${conflict ? `<div class="conflict-warning">${icon("warning")}<span><strong>Wednesday already has a 4:00 PM workout.</strong><small>You can still continue; the conflict will remain visible in the agenda.</small></span></div>` : ""}
    <button class="primary-action save-action" type="button" data-action="save-reschedule">${icon("check")}${conflict ? "Confirm despite conflict" : "Save new time"}</button>
  </section>`;
}

function detailContent() {
  if (state.detailMode === "record") return recordDetail();
  if (state.detailMode === "reschedule") return rescheduleDetail();
  return summaryDetail();
}

function detailSheet(extraClass = "") {
  return `<div class="sheet-backdrop" data-close></div><aside class="detail-sheet ${extraClass}" aria-label="Selected workout detail">${detailContent()}</aside>`;
}

function inlineDetail() {
  return `<div class="inline-detail">${detailContent()}</div>`;
}

function focusModal() {
  return `<div class="focus-backdrop" data-close><aside class="focus-modal" aria-label="Selected workout detail" onclick="event.stopPropagation()">${detailContent()}</aside></div>`;
}

function listPage(className, options = {}) {
  return `<main class="page ${className}"><div class="page-scroll">${header()}${agenda(options)}</div>${options.sheet ? detailSheet() : ""}</main>`;
}

function renderA() {
  return listPage("variant-a", { sheet: state.surface === "detail" });
}

function renderB() {
  return listPage("variant-b", { inline: true });
}

function renderC() {
  const primary = section("Primary plan", "Planned schedule", sourceData.primary, { className: "board-column" });
  const capacity = section("Open capacity", "Suggested recovery times", sourceData.fallback, { className: "board-column", countLabel: "open" });
  return `<main class="page variant-c"><div class="page-scroll">${header()}<div class="two-track-board"><div>${primary}</div><div>${capacity}</div></div></div>${state.surface === "detail" ? focusModal() : ""}</main>`;
}

function switcher() {
  return `<div class="prototype-switcher" role="group" aria-label="Layout alternative switcher"><button type="button" data-cycle="-1" aria-label="Previous alternative">←</button><div><strong>${state.variant} — ${variants[state.variant].name}</strong><span>${variants[state.variant].description}</span></div><button type="button" data-cycle="1" aria-label="Next alternative">→</button></div>`;
}

function toast() {
  if (!state.toast) return "";
  return `<div class="toast" role="status"><span>${state.toast}</span>${state.toastUndo ? `<button type="button" data-action="undo">Undo</button>` : ""}</div>`;
}

function render() {
  const page = state.variant === "A" ? renderA() : state.variant === "B" ? renderB() : renderC();
  app.innerHTML = `<div class="frame">${compactNav()}${nav()}${page}</div>${switcher()}${toast()}<div class="prototype-badge">PROTOTYPE · THIS WEEK FLOW · FIXTURE ONLY</div>`;
  document.title = `Personal Dashboard — ${state.variant} ${variants[state.variant].name}`;
  bind();
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("variant", state.variant);
  url.searchParams.set("selected", state.selected);
  window.history.replaceState({}, "", url);
}

function openDetail(id) {
  state.selected = id;
  state.detailMode = "summary";
  state.surface = "detail";
  state.toast = null;
  state.toastUndo = null;
  syncUrl();
  render();
  requestAnimationFrame(() => document.querySelector(".detail-sheet .close-button, .focus-modal .close-button, .inline-detail .primary-action")?.focus());
}

function closeDetail() {
  state.surface = "list";
  state.detailMode = "summary";
  syncUrl();
  render();
  requestAnimationFrame(() => document.querySelector(`[data-open="${state.selected}"]`)?.focus());
}

function showToast(message, undo = null) {
  state.toast = message;
  state.toastUndo = undo;
  render();
  window.setTimeout(() => {
    if (state.toast === message) {
      state.toast = null;
      state.toastUndo = null;
      render();
    }
  }, 4200);
}

function selectedItem() {
  return slotById();
}

function openRecord() {
  state.detailMode = "record";
  render();
}

function openReschedule() {
  state.detailMode = "reschedule";
  state.rescheduleDay = "Saturday";
  state.rescheduleTime = "4:00 PM";
  render();
}

function saveRecord() {
  const item = selectedItem();
  item.state = "completed";
  item.status = "Workout recorded";
  item.tone = "completed";
  state.surface = "list";
  state.detailMode = "summary";
  syncUrl();
  render();
  showToast(`${item.day} workout recorded`);
}

function saveReschedule() {
  const item = selectedItem();
  const destination = `${state.rescheduleDay} · ${state.rescheduleTime}`;
  item.state = "moved";
  item.status = "Changed this week";
  item.tone = "moved";
  item.movedTo = destination;
  state.surface = "list";
  state.detailMode = "summary";
  syncUrl();
  render();
  showToast(`${item.day} moved to ${destination}`);
}

function skipItem() {
  const item = selectedItem();
  const previous = { state: item.state, status: item.status, tone: item.tone, movedTo: item.movedTo };
  item.state = "skipped";
  item.status = "Skipped for this week";
  item.tone = "skipped";
  delete item.movedTo;
  state.surface = "list";
  state.detailMode = "summary";
  syncUrl();
  render();
  showToast(`${item.day} skipped`, () => {
    Object.assign(item, previous);
    state.toast = null;
    state.toastUndo = null;
    render();
  });
}

function undoSkip() {
  const item = selectedItem();
  item.state = item.id === "mon" ? "due" : item.tone;
  item.status = item.id === "mon" ? "Needs workout record" : item.id === "wed" || item.id === "fri" ? "Scheduled" : "Available";
  item.tone = item.id === "mon" ? "due" : item.tone;
  state.surface = "list";
  state.toast = null;
  state.toastUndo = null;
  render();
}

function bind() {
  app.querySelectorAll("[data-open]").forEach((control) => control.addEventListener("click", () => openDetail(control.dataset.open)));
  app.querySelectorAll("[data-close]").forEach((control) => control.addEventListener("click", closeDetail));
  app.querySelectorAll("[data-detail-mode]").forEach((control) => control.addEventListener("click", () => {
    state.detailMode = control.dataset.detailMode;
    render();
  }));
  app.querySelectorAll("[data-reschedule]").forEach((control) => control.addEventListener("change", () => {
    if (control.dataset.reschedule === "day") state.rescheduleDay = control.value;
    if (control.dataset.reschedule === "time") state.rescheduleTime = control.value;
    render();
  }));
  app.querySelectorAll("[data-action]").forEach((control) => control.addEventListener("click", () => {
    const action = control.dataset.action;
    if (action === "record") openRecord();
    if (action === "reschedule") openReschedule();
    if (action === "skip") skipItem();
    if (action === "save-record") saveRecord();
    if (action === "save-reschedule") saveReschedule();
    if (action === "undo-skip") undoSkip();
    if (action === "undo") state.toastUndo?.();
    if (action === "edit-record") openRecord();
  }));
  app.querySelectorAll("[data-cycle]").forEach((control) => control.addEventListener("click", () => cycle(Number(control.dataset.cycle))));
}

function cycle(delta) {
  const keys = Object.keys(variants);
  const current = keys.indexOf(state.variant);
  state.variant = keys[(current + delta + keys.length) % keys.length];
  state.surface = "list";
  state.detailMode = "summary";
  syncUrl();
  render();
}

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea, select, [contenteditable]")) return;
  if (event.key === "Escape" && state.surface === "detail") closeDetail();
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
});

render();
