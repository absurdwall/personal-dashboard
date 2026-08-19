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
  detailOrigin: null,
  rescheduleDay: "Saturday",
  rescheduleTime: "4:00 PM",
  toast: null,
  toastUndo: null,
  recordSaved: false,
  recordingSource: null,
  recordingStage: "activity",
  recordingDraft: { activity: null, duration: null, effort: null },
  unscheduledRecords: [],
};

if (!variants[state.variant]) state.variant = "A";

const app = document.querySelector("#app");
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const times = ["4:00 PM", "5:30 PM", "6:00 PM", "7:30 PM"];
const recordStages = {
  activity: {
    label: "Activity",
    guidance: "What did you do?",
    choices: ["Elliptical", "Weight training", "Other exercise"],
    next: "duration",
  },
  duration: {
    label: "Duration",
    guidance: "About how long was the workout?",
    choices: ["Under 20", "20", "30", "45", "60+ minutes"],
    next: "effort",
  },
  effort: {
    label: "Effort",
    guidance: "How strenuous did this workout feel?",
    choices: ["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
    next: "complete",
  },
};

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

function isShortRecorded(item) {
  return slotState(item) === "recorded-short";
}

function isRecorded(item) {
  return isCompleted(item) || isShortRecorded(item);
}

function isSkipped(item) {
  return slotState(item) === "skipped";
}

function isMoved(item) {
  return slotState(item) === "moved";
}

function isFuturePlanned(item) {
  return slotState(item) === "scheduled";
}

function isExceptionEligible(item) {
  return slotState(item) === "due" || isMoved(item);
}

function qualifyingWorkoutCount() {
  return (
    allSlots().filter(isCompleted).length +
    state.unscheduledRecords.filter((record) => record.qualifying).length
  );
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
  const completed = qualifyingWorkoutCount();
  const next = allSlots().find((item) => !isRecorded(item) && !isSkipped(item) && item.tone !== "available");
  const emptyKicker = completed >= 3 ? "Weekly goal complete" : "No scheduled workouts remaining";
  const emptyTitle = completed >= 3 ? "Weekly goal complete" : "Log an extra workout";
  return `<header class="week-header">
    <div class="title-block"><span class="eyebrow">This Week · ${sourceData.week}</span><h1>Exercise plan</h1><p>${completed} of 3 qualifying workouts completed</p></div>
    <div class="progress-chip"><strong>${completed}/3</strong><span>completed</span></div>
    <button class="next-card ${next?.tone === "due" ? "is-due" : ""}" type="button" data-open="${next?.id ?? "mon"}"><span>${next?.tone === "due" ? "Needs workout record" : next ? "Next workout" : emptyKicker}</span><strong>${next ? `${next.day} · ${next.time}` : emptyTitle}</strong><small>${next ? next.date : "Optional workouts welcome"}</small></button>
  </header>`;
}

function statusMark(item) {
  const stateName = slotState(item);
  const glyph = stateName === "completed" ? "✓" : stateName === "recorded-short" ? "~" : stateName === "skipped" ? "—" : stateName === "moved" ? "↪" : stateName === "available" ? "·" : stateName === "due" ? "!" : "•";
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

function unscheduledRecordSummary(record) {
  const outcome = record.qualifying
    ? "Counts toward weekly progress"
    : "Short effort — does not count toward weekly progress";
  return `<div class="unscheduled-record"><strong>${record.source}</strong><span>${record.activity} · ${record.duration} · ${outcome}</span></div>`;
}

function unscheduledEntry() {
  const recordSummary = state.unscheduledRecords.length
    ? `<div class="unscheduled-records" role="status" aria-live="polite">${state.unscheduledRecords.map(unscheduledRecordSummary).join("")}</div>`
    : `<p class="unscheduled-help">Record an extra workout without attaching it to Monday, Wednesday, Friday, or an open capacity row.</p>`;
  return `<section class="unscheduled-entry" aria-labelledby="unscheduled-entry-title">
    <div class="unscheduled-copy"><span class="eyebrow">Any time this week</span><h2 id="unscheduled-entry-title">Extra workout</h2>${recordSummary}</div>
    <button class="secondary-action" type="button" data-action="unscheduled-record">${icon("check")}Log workout now</button>
  </section>`;
}

function agenda(options = {}) {
  return `<div class="agenda-list">
    ${options.includeUnscheduled ? unscheduledEntry() : ""}
    ${section("Primary workouts", "Planned schedule", sourceData.primary, options)}
    ${section("Open capacity", "Other times this week", sourceData.fallback, { ...options, className: "capacity-section", countLabel: "open" })}
  </div>`;
}

function actionButtons(item) {
  if (isRecorded(item)) {
    return `<div class="action-stack"><button class="secondary-action" type="button" data-action="edit-record">${icon("edit")}Edit workout record</button></div>`;
  }
  if (isSkipped(item)) {
    return `<div class="action-stack"><button class="secondary-action" type="button" data-action="undo-skip">Undo skip</button></div>`;
  }
  if (isFuturePlanned(item)) return "";
  if (slotState(item) === "available" && !isMoved(item)) {
    return `<p class="detail-muted">This time becomes active after a workout is moved here.</p>`;
  }
  if (!isExceptionEligible(item)) return "";
  return `<div class="action-stack"><button class="primary-action" type="button" data-action="record">${icon("check")}Record workout</button><button class="secondary-action" type="button" data-action="reschedule">${icon("clock")}Change to another time</button><button class="quiet-action" type="button" data-action="skip">Skip this session</button></div>`;
}

function summaryDetail() {
  const item = slotById();
  const movement = isMoved(item) ? `<div class="moved-note"><span class="eyebrow">Schedule updated</span><strong>${item.movedTo}</strong><small>The original row stays visible as a record of the change.</small></div>` : "";
  const statusCopy = isCompleted(item) ? "Workout recorded" : isShortRecorded(item) ? "Workout recorded · Short effort — does not count toward weekly progress" : isSkipped(item) ? "Skipped for this week" : item.status;
  const detailNote = isExceptionEligible(item)
    ? `<p class="detail-note">No departure confirmation is needed. Record the workout when you return; until then this row remains available for a change or a skip.</p>`
    : "";
  return `<section class="detail-content">
    <div class="detail-topline"><span class="eyebrow">Selected workout</span><button class="close-button" type="button" data-close aria-label="Close detail">${icon("close")}</button></div>
    <div class="detail-title"><div class="date-tile"><strong>${item.shortDay}</strong><small>${item.date.replace("August ", "")}</small></div><div><h2>${item.day}</h2><p>${item.time} · ${item.label}</p></div></div>
    <div class="status-line ${slotState(item)}">${statusMark(item)}<strong>${statusCopy}</strong></div>
    ${movement}
    ${actionButtons(item)}
    ${detailNote}
  </section>`;
}

function recordDetail() {
  const item = slotById();
  const unscheduled = state.recordingSource === "unscheduled";
  const backLabel = unscheduled ? "This Week" : item.day;
  const heading = unscheduled ? "Unscheduled workout" : `Record ${item.day}'s workout`;
  const stage = state.recordingStage === "complete" ? null : recordStages[state.recordingStage];
  const sourceNote = unscheduled
    ? `<div class="record-source"><strong>Independent record</strong><span>This workout will not change the selected scheduled row.</span></div>`
    : "";
  const backControl = unscheduled
    ? `<button class="back-link" type="button" data-close>${icon("back")}Back to ${backLabel}</button>`
    : `<button class="back-link" type="button" data-detail-mode="summary">${icon("back")}Back to ${backLabel}</button>`;
  const stageContent = stage
    ? `<div class="choice-group"><span>${stage.label}</span><p class="stage-guidance">${stage.guidance}</p><div class="choice-row">${stage.choices.map((choice) => `<button class="choice" type="button" data-action="choose-record" data-choice-name="${state.recordingStage}" data-choice="${choice}">${choice}</button>`).join("")}</div>${state.recordingStage === "effort" ? `<p class="neutral-guidance">Harder is not better.</p>` : ""}</div>`
    : `<div class="record-review" aria-live="polite"><div><span>Activity</span><strong>${state.recordingDraft.activity}</strong></div><div><span>Duration</span><strong>${state.recordingDraft.duration}</strong></div><div><span>Effort</span><strong>${state.recordingDraft.effort}</strong></div></div><button class="primary-action save-action" type="button" data-action="save-record">${icon("check")}Save workout</button>`;
  return `<section class="detail-content form-detail">
    <div class="detail-topline">${backControl}<button class="close-button" type="button" data-close aria-label="Close detail">${icon("close")}</button></div>
    <span class="eyebrow">${unscheduled ? "Unscheduled workout" : "Workout record"}</span><h2>${heading}</h2><p class="form-intro">Click a choice to continue; no typing is needed.</p>${sourceNote}${stageContent}
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
  return listPage("variant-a", { sheet: state.surface === "detail", includeUnscheduled: true });
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
  state.detailOrigin = "scheduled";
  state.recordingSource = null;
  resetRecording();
  state.surface = "detail";
  state.toast = null;
  state.toastUndo = null;
  syncUrl();
  render();
  requestAnimationFrame(() => document.querySelector(".detail-sheet .close-button, .focus-modal .close-button, .inline-detail .primary-action")?.focus());
}

function closeDetail() {
  const origin = state.detailOrigin;
  state.surface = "list";
  state.detailMode = "summary";
  state.detailOrigin = null;
  state.recordingSource = null;
  resetRecording();
  syncUrl();
  render();
  focusReturnedSource(origin);
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

function resetRecording() {
  state.recordingStage = "activity";
  state.recordingDraft = { activity: null, duration: null, effort: null };
}

function focusRecordControl() {
  requestAnimationFrame(() => document.querySelector(".form-detail .choice, .form-detail .save-action")?.focus());
}

function focusReturnedSource(origin) {
  const selector = origin === "unscheduled" ? '[data-action="unscheduled-record"]' : `[data-open="${state.selected}"]`;
  requestAnimationFrame(() => document.querySelector(selector)?.focus());
}

function openRecord() {
  state.recordingSource = "scheduled";
  resetRecording();
  state.detailMode = "record";
  render();
  focusRecordControl();
}

function openUnscheduledRecord() {
  state.recordingSource = "unscheduled";
  state.detailOrigin = "unscheduled";
  resetRecording();
  state.detailMode = "record";
  state.surface = "detail";
  state.toast = null;
  state.toastUndo = null;
  syncUrl();
  render();
  focusRecordControl();
}

function openReschedule() {
  state.detailMode = "reschedule";
  state.rescheduleDay = "Saturday";
  state.rescheduleTime = "4:00 PM";
  render();
}

function chooseRecord(control) {
  const stage = recordStages[state.recordingStage];
  const choiceName = control.dataset.choiceName;
  const choice = control.dataset.choice;
  if (!stage || choiceName !== state.recordingStage || !stage.choices.includes(choice)) return;
  state.recordingDraft[choiceName] = choice;
  state.recordingStage = stage.next;
  render();
  focusRecordControl();
}

function saveRecord() {
  const qualifies = state.recordingDraft.duration !== "Under 20";
  const origin = state.detailOrigin;
  if (state.recordingSource === "unscheduled") {
    const record = {
      id: `unscheduled-${state.unscheduledRecords.length + 1}`,
      source: "Unscheduled workout",
      activity: state.recordingDraft.activity,
      duration: state.recordingDraft.duration,
      effort: state.recordingDraft.effort,
      qualifying: qualifies,
    };
    state.unscheduledRecords.push(record);
    state.surface = "list";
    state.detailMode = "summary";
    state.recordingSource = null;
    resetRecording();
    syncUrl();
    render();
    showToast("Unscheduled workout recorded");
    focusReturnedSource(origin);
    return;
  }
  const item = selectedItem();
  item.state = qualifies ? "completed" : "recorded-short";
  item.status = qualifies ? "Workout recorded" : "Workout recorded · Short effort";
  item.tone = item.state;
  state.surface = "list";
  state.detailMode = "summary";
  state.recordingSource = null;
  resetRecording();
  syncUrl();
  render();
  showToast(`${item.day} workout recorded`);
  focusReturnedSource(origin);
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
  state.detailOrigin = null;
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
  state.detailOrigin = null;
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
    if (action === "unscheduled-record") openUnscheduledRecord();
    if (action === "choose-record") chooseRecord(control);
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
  state.detailOrigin = null;
  state.recordingSource = null;
  resetRecording();
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
