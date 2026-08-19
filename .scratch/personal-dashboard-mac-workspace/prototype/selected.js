// PROTOTYPE — Agenda-led winner applied to six fixture-only representative states.
// No Tauri commands, persistence, file pickers, notifications, or production data.

const views = [
  { id: "normal", label: "Normal week", description: "Current progress and next departure" },
  { id: "pending", label: "Pending response", description: "Preset reason selection" },
  { id: "recording", label: "Workout recording", description: "Staged click-only record" },
  { id: "history", label: "History", description: "Correction and delete sheet" },
  { id: "settings", label: "Settings", description: "Profile files and notification warning" },
  { id: "compact", label: "Compact navigation", description: "640×520 list-to-detail drill-in" },
];

const weekFixture = {
  weekLabel: "Aug 10–16",
  progress: 1,
  goal: 3,
  primary: [
    { id: "mon", day: "Mon", date: "Aug 10", time: "4:00 PM", title: "Monday departure", status: "Workout recorded", tone: "complete", detail: "You left for the gym and recorded Weight training · 35 min · Moderate.", workout: "Weight training · 35 min" },
    { id: "thu", day: "Thu", date: "Aug 13", time: "4:00 PM", title: "Thursday departure", status: "Next up", tone: "upcoming", detail: "Your departure reminder is ready. No response is needed yet.", workout: null },
    { id: "sat", day: "Sat", date: "Aug 15", time: "11:00 AM", title: "Saturday departure", status: "Planned", tone: "planned", detail: "This departure is planned for later in the week.", workout: null },
  ],
  fallback: [
    { id: "fri", day: "Fri", date: "Aug 14", time: "4:00 PM", title: "Friday fallback", status: "Available", tone: "available", detail: "Available if a primary departure moves here.", workout: null },
    { id: "sun", day: "Sun", date: "Aug 16", time: "11:00 AM", title: "Sunday fallback", status: "Unavailable", tone: "unavailable", detail: "Unavailable because it follows the Saturday primary too closely.", workout: null },
  ],
};

const historyFixture = [
  { id: "aug10", label: "Aug 10–16", progress: "1 of 3", outcome: "1 recorded · 1 unresolved", tone: "warning" },
  { id: "aug03", label: "Aug 3–9", progress: "3 of 3", outcome: "Goal completed", tone: "complete" },
  { id: "jul27", label: "Jul 27–Aug 2", progress: "2 of 3", outcome: "1 moved to fallback", tone: "neutral" },
  { id: "jul20", label: "Jul 20–26", progress: "1 of 3", outcome: "2 skipped", tone: "neutral" },
  { id: "jul13", label: "Jul 13–19", progress: "3 of 3", outcome: "Goal completed", tone: "complete" },
  { id: "jul06", label: "Jul 6–12", progress: "2 of 3", outcome: "2 recorded", tone: "neutral" },
  { id: "jun29", label: "Jun 29–Jul 5", progress: "3 of 3", outcome: "Goal completed", tone: "complete" },
  { id: "jun22", label: "Jun 22–28", progress: "1 of 3", outcome: "1 recorded", tone: "neutral" },
  { id: "jun15", label: "Jun 15–21", progress: "2 of 3", outcome: "1 short effort", tone: "neutral" },
  { id: "jun08", label: "Jun 8–14", progress: "3 of 3", outcome: "Goal completed", tone: "complete" },
  { id: "jun01", label: "Jun 1–7", progress: "2 of 3", outcome: "1 moved to fallback", tone: "neutral" },
  { id: "may25", label: "May 25–31", progress: "1 of 3", outcome: "1 recorded", tone: "neutral" },
  { id: "may18", label: "May 18–24", progress: "3 of 3", outcome: "Goal completed", tone: "complete" },
];

const recordsFixture = [
  { id: "record-1", activity: "Weight training", duration: "45", effort: "Hard", source: "Thursday departure", time: "Thu, Aug 6 · 5:42 PM", outcome: "Counts toward weekly progress" },
  { id: "record-2", activity: "Elliptical", duration: "30", effort: "Moderate", source: "Monday departure", time: "Mon, Aug 3 · 5:30 PM", outcome: "Counts toward weekly progress" },
  { id: "record-3", activity: "Other exercise", duration: "Under 20", effort: "Easy", source: "Unscheduled workout", time: "Sun, Aug 2 · 10:18 AM", outcome: "Short effort — does not count" },
  { id: "record-4", activity: "Weight training", duration: "20", effort: "Moderate", source: "Friday fallback", time: "Fri, Jul 31 · 6:10 PM", outcome: "Counts toward weekly progress" },
];

const params = new URLSearchParams(window.location.search);
const requestedView = params.get("state");
const state = {
  view: views.some((view) => view.id === requestedView) ? requestedView : "normal",
  destination: "week",
  selectedSlotId: "thu",
  selectedWeekId: "aug03",
  selectedRecordId: "record-1",
  compactSurface: "info",
  pendingStep: params.get("step") === "actions" ? "actions" : "reason",
  pendingOutcome: "move",
  pendingComplete: false,
  workoutComplete: false,
  deleteDialog: params.get("dialog") !== "closed",
  restoreDialog: false,
  settingsSection: params.get("section") ?? "profile",
  profileInactive: params.get("profile") === "inactive",
  notificationsDenied: params.get("permission") !== "granted",
  fixtureStatus: "",
};

const root = document.querySelector("#prototype-root");
const destinationForView = (view) => view === "history" ? "history" : view === "settings" ? "settings" : "week";
state.destination = destinationForView(state.view);
if (state.view === "recording") state.selectedSlotId = "mon";

function icon(name) {
  const paths = {
    week: '<path d="M4 7.5h16M7 3v3m10-3v3M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z"/><path d="m8 13 2.2 2.2L16 9.5"/>',
    history: '<path d="M4.8 8.3A8 8 0 1 1 4 12"/><path d="M4 4v4.3h4.3M12 8v4.5l3 1.8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    warning: '<path d="M12 8v5m0 3.2v.1M10.5 3.8 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L13.5 3.8a1.7 1.7 0 0 0-3 0Z"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function navButton(destination, label, shortcut) {
  const current = state.destination === destination;
  const target = destination === "week" ? "normal" : destination;
  return `<button class="nav-item${current ? " is-current" : ""}" type="button" data-view="${target}" aria-current="${current ? "page" : "false"}">${icon(destination)}<span>${label}</span><kbd>${shortcut}</kbd></button>`;
}

function sidebar() {
  return `<nav class="sidebar" aria-label="Primary destinations">
    <div class="brand"><span class="brand-mark" aria-hidden="true">P</span><div><strong>Personal Dashboard</strong><small>Local on this Mac</small></div></div>
    <div class="nav-list">${navButton("week", "This Week", "⌘1")}${navButton("history", "History", "⌘2")}${navButton("settings", "Settings", "⌘3")}</div>
    <div class="sidebar-foot"><span class="privacy-dot" aria-hidden="true"></span><span>Private · Offline</span></div>
  </nav>`;
}

function compactHeader() {
  return `<header class="compact-header"><div class="compact-brand"><span class="brand-mark" aria-hidden="true">P</span><strong>Personal Dashboard</strong></div><label class="destination-picker"><span class="sr-only">Destination</span><select data-compact-destination><option value="normal"${state.destination === "week" ? " selected" : ""}>This Week</option><option value="history"${state.destination === "history" ? " selected" : ""}>History</option><option value="settings"${state.destination === "settings" ? " selected" : ""}>Settings</option></select></label></header>`;
}

function progressRing() {
  return `<div class="progress-ring" style="--progress:33" role="img" aria-label="1 of 3 qualifying workouts complete"><span><strong>1</strong><small>of 3</small></span></div>`;
}

function weekSlots() {
  const primary = weekFixture.primary.map((slot) => ({ ...slot }));
  if (state.view === "pending" || state.view === "compact") {
    Object.assign(primary[1], { status: "Unresolved — no response", tone: "attention", detail: "This departure is awaiting your response. The 4:15 PM follow-up is active." });
  }
  if (state.view === "recording" && !state.workoutComplete) {
    Object.assign(primary[0], { status: "Workout details needed", tone: "attention", workout: null, detail: "The workout reminder is ready for its remaining preset choices." });
  }
  if (state.view === "recording" && state.workoutComplete) {
    Object.assign(primary[0], { status: "Workout recorded", tone: "complete", workout: "Elliptical · 30 min", detail: "You completed the preset flow and recorded Elliptical · 30 min · Moderate." });
  }
  return { primary, fallback: weekFixture.fallback };
}

function slotRow(slot) {
  const selected = state.selectedSlotId === slot.id;
  return `<li><button type="button" class="slot-row ${slot.tone}${selected ? " is-selected" : ""}" data-slot="${slot.id}" aria-pressed="${selected}"><span class="slot-date"><strong>${slot.day}</strong><small>${slot.time}</small></span><span class="slot-copy"><strong>${slot.title}</strong><small><span class="status-symbol" aria-hidden="true"></span>${slot.status}${slot.workout ? ` · ${slot.workout}` : ""}</small></span>${icon("chevron")}</button></li>`;
}

function agendaList() {
  const slots = weekSlots();
  return `<section class="agenda-section" aria-labelledby="primary-heading"><div class="section-heading"><h3 id="primary-heading">Primary departures</h3><span>3 planned</span></div><ol class="slot-list">${slots.primary.map(slotRow).join("")}</ol></section><section class="agenda-section fallback" aria-labelledby="fallback-heading"><div class="section-heading"><h3 id="fallback-heading">Fallback slots</h3><span>1 available</span></div><ol class="slot-list">${slots.fallback.map(slotRow).join("")}</ol></section>`;
}

function weekInformation() {
  const attention = state.view === "pending" || state.view === "compact";
  const recording = state.view === "recording" && !state.workoutComplete;
  const nextLabel = attention ? "Response overdue" : recording ? "Workout action" : "Next departure";
  const nextValue = attention ? "Thursday departure needs attention" : recording ? "Finish Monday's workout record" : "Thursday at 4:00 PM";
  const nextMeta = attention ? "Follow-up reminder active since 4:15 PM" : recording ? "Activity and duration already selected" : "Reminder set for 3:45 PM";
  return `<div class="pane-scroll"><header class="info-header"><p class="eyebrow">This Week · ${weekFixture.weekLabel}</p><div class="progress-summary">${progressRing()}<div><h1>1 of 3 workouts</h1><p>Two more qualify this week.</p></div></div>${attention || recording ? `<button type="button" class="next-strip attention-strip" data-action-label="${recording ? "Finish" : "Respond"}" data-attention><span>${nextLabel}</span><strong>${nextValue}</strong><small>${nextMeta}</small></button>` : `<div class="next-strip"><span>${nextLabel}</span><strong>${nextValue}</strong><small>${nextMeta}</small></div>`}</header>${agendaList()}</div>`;
}

function selectedSlot() {
  return [...weekSlots().primary, ...weekSlots().fallback].find((slot) => slot.id === state.selectedSlotId) ?? weekSlots().primary[1];
}

function quietDetail(extra = "") {
  const slot = selectedSlot();
  return `<div class="detail-scroll quiet-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button>${extra}<p class="eyebrow">Selected departure</p><div class="detail-title"><div class="day-tile"><strong>${slot.day}</strong><span>${slot.date.replace("Aug ", "")}</span></div><div><h2>${slot.title}</h2><p>${slot.date} · ${slot.time}</p></div></div><div class="status-line ${slot.tone}" role="status"><span class="status-symbol" aria-hidden="true"></span><strong>${slot.status}</strong></div><p class="detail-explanation">${slot.detail}</p>${slot.workout ? `<section class="detail-section"><h3>Recorded workout</h3><p>${slot.workout} · Moderate effort</p><button type="button" class="text-button" data-view="history">Review record</button></section>` : `<section class="detail-section" aria-labelledby="reminder-detail"><h3 id="reminder-detail">Reminder plan</h3><dl><div><dt>Departure</dt><dd>${slot.time}</dd></div><div><dt>Follow-up</dt><dd>15 minutes if unanswered</dd></div></dl></section>`}<p class="detail-footnote">Synthetic state only. Exercise actions remain click-only.</p></div>`;
}

function pendingDetail() {
  if (state.pendingComplete) {
    return `<div class="detail-scroll quiet-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button><p class="eyebrow">Response saved in prototype state</p><div class="completion-panel" role="status"><span class="completion-mark">✓</span><div><h2>${state.pendingOutcome === "move" ? "Moved to Friday" : "Departure updated"}</h2><p>${state.pendingOutcome === "move" ? "Work ran late" : "Your click-only response is complete."}</p></div></div><button type="button" class="secondary-action" data-reset-pending>Review the response flow again</button></div>`;
  }
  if (state.pendingStep === "actions") {
    return `<div class="detail-scroll quiet-detail pending-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button><p class="eyebrow attention-label">Needs attention · Thursday 4:00 PM</p><h2>Are you leaving for the gym?</h2><p class="detail-explanation">This departure has no response. Choose one established outcome.</p><div class="choice-stack" role="group" aria-label="Departure response"><button type="button" class="choice-button primary-choice" data-departure-action="leave">Leaving for gym</button><button type="button" class="choice-button" data-departure-action="move">Move to fallback</button><button type="button" class="choice-button danger-choice" data-departure-action="skip">Skip</button></div><p class="detail-footnote">The pending action remains reachable from the information pane.</p></div>`;
  }
  const heading = state.pendingOutcome === "skip" ? "Why are you skipping this workout?" : "Why are you moving this workout?";
  return `<div class="detail-scroll quiet-detail pending-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button><button type="button" class="breadcrumb-button" data-response-back>‹ Departure responses</button><p class="eyebrow attention-label">Needs attention · Preset reason</p><form class="preset-form" aria-labelledby="reason-heading"><h2 id="reason-heading">${heading}</h2><p>Choose one reason. No typing is required.</p><div class="choice-stack reason-grid">${["Work ran late", "Too tired", "Sick or injured", "Another commitment", "Other"].map((reason) => `<button type="button" class="choice-button" data-reason="${reason}">${reason}${icon("chevron")}</button>`).join("")}</div></form></div>`;
}

function workoutDetail() {
  if (state.workoutComplete) {
    return quietDetail(`<div class="inline-success" role="status" tabindex="-1"><strong>Workout recorded</strong><span>Elliptical · 30 min · Moderate</span></div>`);
  }
  const efforts = ["Very easy", "Easy", "Moderate", "Hard", "Very hard"];
  return `<div class="detail-scroll quiet-detail recording-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to week</button><p class="eyebrow attention-label">Workout recording · Step 3 of 3</p><h2>How strenuous did this workout feel?</h2><p class="detail-explanation">Choose the description that fits. Harder is not better.</p><ol class="recording-steps" aria-label="Workout recording progress"><li class="is-done"><span>1</span><div><small>Activity</small><strong>Elliptical</strong></div></li><li class="is-done"><span>2</span><div><small>Duration</small><strong>30 minutes</strong></div></li><li class="is-current"><span>3</span><div><small>Effort</small><strong>Choose one</strong></div></li></ol><div class="effort-scale" role="group" aria-label="Perceived effort">${efforts.map((effort, index) => `<button type="button" data-effort="${effort}"><span class="effort-dot level-${index + 1}" aria-hidden="true"></span><strong>${effort}</strong></button>`).join("")}</div></div>`;
}

function weekWorkspace() {
  const pending = state.view === "pending" || state.view === "compact";
  let detail;
  if (pending && state.selectedSlotId === "thu") detail = pendingDetail();
  else if (state.view === "recording" && state.selectedSlotId === "mon") detail = workoutDetail();
  else detail = quietDetail(pending ? `<button type="button" class="needs-attention" data-attention>${icon("warning")}<span><strong>Needs attention</strong><small>Return to Thursday's pending response</small></span>${icon("chevron")}</button>` : "");
  return `<main class="workspace variant-a destination-week" data-compact-surface="${state.compactSurface}"><section class="information-pane" aria-label="This Week agenda">${weekInformation()}</section><aside class="detail-pane" aria-label="Selected departure details">${detail}</aside></main>`;
}

function weekHistoryRow(week) {
  const selected = state.selectedWeekId === week.id;
  return `<li><button type="button" class="history-week-row ${week.tone}${selected ? " is-selected" : ""}" data-week="${week.id}" aria-pressed="${selected}"><span><strong>${week.label}</strong><small>${week.outcome}</small></span><span class="week-progress">${week.progress}</span>${icon("chevron")}</button></li>`;
}

function historyInformation() {
  return `<div class="pane-scroll"><header class="destination-header"><p class="eyebrow">Exercise records</p><h1>History</h1><p>Weeks are newest first.</p></header><ol class="history-week-list">${historyFixture.map(weekHistoryRow).join("")}</ol></div>`;
}

function correctionForm() {
  const options = (items, selected) => items.map((item) => `<option${item === selected ? " selected" : ""}>${item}</option>`).join("");
  return `<form class="correction-form" aria-labelledby="correction-heading"><div class="section-heading"><h3 id="correction-heading">Edit record</h3><span>Preset values</span></div><div class="correction-grid"><label>Activity<select>${options(["Elliptical", "Weight training", "Other exercise"], "Weight training")}</select></label><label>Duration<select>${options(["Under 20", "20", "30", "45", "60+ minutes"], "45")}</select></label><label>Perceived effort<select>${options(["Very easy", "Easy", "Moderate", "Hard", "Very hard"], "Hard")}</select></label></div><div class="form-actions"><button type="button" class="primary-action" data-save-correction>Save correction</button><button type="button" class="destructive-text" data-open-delete>Delete record…</button></div></form>`;
}

function deletionSheet() {
  if (!state.deleteDialog) return "";
  return `<div class="sheet-scrim"><section class="mac-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-copy"><div class="sheet-icon danger">!</div><h2 id="delete-title">Delete this workout record?</h2><p id="delete-copy">Weight training · 45 min · Hard will be removed. This cannot be undone.</p><div class="sheet-actions"><button type="button" class="secondary-action" data-cancel-delete>Cancel</button><button type="button" class="delete-button" data-confirm-delete>Confirm delete</button></div></section></div>`;
}

function recordRow(record) {
  const selected = state.selectedRecordId === record.id;
  return `<li><button type="button" class="record-row${selected ? " is-selected" : ""}" data-record="${record.id}" aria-pressed="${selected}"><span class="record-icon" aria-hidden="true">${record.activity === "Weight training" ? "W" : record.activity === "Elliptical" ? "E" : "O"}</span><span><strong>${record.activity} · ${record.duration}</strong><small>${record.source} · ${record.time}</small><small>${record.outcome}</small></span>${icon("chevron")}</button></li>`;
}

function historyDetail() {
  const week = historyFixture.find((item) => item.id === state.selectedWeekId) ?? historyFixture[1];
  return `<div class="detail-scroll history-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to weeks</button><header class="detail-destination-header"><p class="eyebrow">Selected week</p><h2>${week.label}</h2><div class="history-summary"><strong>${week.progress} workouts</strong><span>${week.outcome}</span></div></header><section class="history-departures" aria-labelledby="history-departures-heading"><div class="section-heading"><h3 id="history-departures-heading">Departures</h3><span>3 primary</span></div><ul><li><strong>Mon · 4:00 PM</strong><span>Workout recorded</span></li><li><strong>Thu · 4:00 PM</strong><span>Moved to Friday · Work ran late</span></li><li><strong>Sat · 11:00 AM</strong><span>Workout recorded</span></li></ul></section><section class="history-records" aria-labelledby="history-records-heading"><div class="section-heading"><h3 id="history-records-heading">Workout records</h3><span>4 records</span></div><ol>${recordsFixture.map(recordRow).join("")}</ol></section>${correctionForm()}</div>${deletionSheet()}`;
}

function historyWorkspace() {
  return `<main class="workspace variant-a destination-history" data-compact-surface="${state.compactSurface}"><section class="information-pane" aria-label="History weeks">${historyInformation()}</section><aside class="detail-pane" aria-label="Selected week and workout records">${historyDetail()}</aside></main>`;
}

const settingsSections = [
  { id: "routine", label: "Routine", summary: "Three repeating departures" },
  { id: "profile", label: "Profile & Data", summary: "Active · Home profile" },
  { id: "notifications", label: "Notifications", summary: "Permission denied", warning: true },
];

function settingsInformation() {
  return `<div class="pane-scroll"><header class="destination-header"><p class="eyebrow">Local administration</p><h1>Settings</h1><p>Choose one subsection.</p></header><ul class="settings-section-list">${settingsSections.map((section) => `<li><button type="button" class="settings-row${state.settingsSection === section.id ? " is-selected" : ""}" data-settings-section="${section.id}" aria-pressed="${state.settingsSection === section.id}"><span class="settings-row-icon">${icon(section.id === "notifications" ? "bell" : section.id === "profile" ? "file" : "settings")}</span><span><strong>${section.label}</strong><small>${section.id === "profile" && state.profileInactive ? "Inactive · Moved to another device" : section.id === "notifications" && !state.notificationsDenied ? "Permission granted" : section.summary}</small></span>${section.warning && state.notificationsDenied ? '<span class="warning-badge">!</span>' : ""}${icon("chevron")}</button></li>`).join("")}</ul></div>`;
}

function settingsWarning() {
  if (!state.notificationsDenied || state.settingsSection === "notifications") return "";
  return `<button type="button" class="warning-banner" data-settings-section="notifications">${icon("warning")}<span><strong>Notifications are denied</strong><small>Departure reminders cannot be delivered on this Mac.</small></span>${icon("chevron")}</button>`;
}

function routineSettings() {
  const rows = [["Monday", "4:00 PM"], ["Thursday", "4:00 PM"], ["Saturday", "11:00 AM"]];
  return `<form class="settings-form" aria-labelledby="routine-title"><p class="eyebrow">Repeating schedule</p><h2 id="routine-title">Routine</h2><p class="settings-intro">Adjust each primary departure with presets. Future weeks use the updated routine.</p><ol class="routine-list">${rows.map(([day, time], index) => `<li><span class="routine-number">${index + 1}</span><label>Day<select><option selected>${day}</option><option>Tuesday</option><option>Wednesday</option><option>Friday</option><option>Sunday</option></select></label><label>Time<select><option selected>${time}</option><option>3:30 PM</option><option>5:00 PM</option><option>6:00 PM</option></select></label></li>`).join("")}</ol><button type="button" class="primary-action" data-fixture-action="Routine saved in prototype state">Save routine</button></form>`;
}

function profileSettings() {
  const authority = state.profileInactive ? "Inactive on this Mac" : "Authoritative on this Mac";
  const authorityCopy = state.profileInactive ? "Exercise activity and reminders are paused because this profile moved." : "This device accepts exercise activity and owns reminders for this profile.";
  return `<form class="settings-form" aria-labelledby="profile-title">${settingsWarning()}<p class="eyebrow">Local profile</p><h2 id="profile-title">Profile & Data</h2><div class="authority-panel ${state.profileInactive ? "inactive" : "active"}" role="status"><span class="authority-symbol">${state.profileInactive ? "!" : "✓"}</span><div><strong>${authority}</strong><p>${authorityCopy}</p></div></div><label class="profile-label-field">Profile label<div><input value="Home profile" aria-describedby="profile-label-note"/><button type="button" class="secondary-action" data-fixture-action="Profile label saved in prototype state">Save label</button></div><small id="profile-label-note">Stored only in the local profile.</small></label><section class="file-actions" aria-labelledby="file-actions-title"><div class="section-heading"><h3 id="file-actions-title">Profile files</h3><span>Schema 3</span></div><button type="button" data-fixture-action="A native save picker would open in production">${icon("file")}<span><strong>Back up profile…</strong><small>Save a recovery copy; this Mac stays active.</small></span>${icon("chevron")}</button><button type="button" data-open-restore>${icon("file")}<span><strong>Restore profile…</strong><small>Validate a backup, then confirm replacement.</small></span>${icon("chevron")}</button><button type="button" data-fixture-action="A native move-file picker would open in production">${icon("arrow")}<span><strong>Move profile…</strong><small>Transfer authority and make this Mac inactive.</small></span>${icon("chevron")}</button></section>${state.profileInactive ? `<button type="button" class="secondary-action" data-toggle-profile>Reactivate this profile…</button>` : `<button type="button" class="text-button" data-toggle-profile>Preview inactive-profile state</button>`}<p class="fixture-status" role="status" aria-live="polite" tabindex="-1">${state.fixtureStatus}</p></form>${restoreSheet()}`;
}

function notificationSettings() {
  return `<section class="settings-form" aria-labelledby="notifications-title"><p class="eyebrow">Departure reminders</p><h2 id="notifications-title">Notifications</h2><div class="notification-warning ${state.notificationsDenied ? "is-denied" : "is-granted"}" role="status">${icon(state.notificationsDenied ? "warning" : "bell")}<div><strong>${state.notificationsDenied ? "Permission denied" : "Permission granted"}</strong><p>${state.notificationsDenied ? "Personal Dashboard cannot deliver departure or follow-up reminders." : "Departure reminders can be delivered while the window is closed."}</p></div></div><dl class="settings-facts"><div><dt>Next departure</dt><dd>Thu, Aug 13 · 4:00 PM</dd></div><div><dt>Scheduled reminder</dt><dd>${state.notificationsDenied ? "Not scheduled" : "Thu · 3:45 PM"}</dd></div><div><dt>Capability check</dt><dd>${state.notificationsDenied ? "Blocked by permission" : "Available"}</dd></div></dl><button type="button" class="primary-action" data-toggle-notifications>${state.notificationsDenied ? "Allow notifications" : "Preview denied state"}</button><details class="capability-details"><summary>Run notification capability check</summary><p>The prototype does not schedule a real notification.</p><button type="button" class="secondary-action" data-fixture-action="Capability check represented; no notification scheduled">Schedule for 10 seconds</button></details><p class="fixture-status" role="status" aria-live="polite" tabindex="-1">${state.fixtureStatus}</p></section>`;
}

function restoreSheet() {
  if (!state.restoreDialog) return "";
  return `<div class="sheet-scrim"><section class="mac-sheet" role="dialog" aria-modal="true" aria-labelledby="restore-title" aria-describedby="restore-copy"><div class="sheet-icon">${icon("file")}</div><h2 id="restore-title">Restore this profile?</h2><p id="restore-copy">The validated backup “Home profile · Aug 12” will replace the active profile. Histories will not be merged.</p><div class="sheet-actions"><button type="button" class="secondary-action" data-cancel-restore>Cancel</button><button type="button" class="delete-button safe-replace" data-confirm-restore>Confirm restore</button></div></section></div>`;
}

function settingsDetail() {
  if (state.settingsSection === "routine") return routineSettings();
  if (state.settingsSection === "notifications") return notificationSettings();
  return profileSettings();
}

function settingsWorkspace() {
  return `<main class="workspace variant-a destination-settings" data-compact-surface="${state.compactSurface}"><section class="information-pane" aria-label="Settings subsections">${settingsInformation()}</section><aside class="detail-pane" aria-label="Selected settings controls"><div class="detail-scroll settings-detail"><button type="button" class="back-button" data-back>${icon("arrow")} Back to settings</button>${settingsDetail()}</div></aside></main>`;
}

function prototypeNavigator() {
  const index = views.findIndex((view) => view.id === state.view);
  const view = views[index];
  return `<div class="prototype-switcher state-switcher" role="group" aria-label="Representative state switcher"><button type="button" data-cycle-state="-1" aria-label="Previous state">←</button><div><strong>${index + 1}/6 — ${view.label}</strong><span>${view.description}</span></div><button type="button" data-cycle-state="1" aria-label="Next state">→</button></div>`;
}

function render() {
  state.destination = destinationForView(state.view);
  const workspace = state.destination === "history" ? historyWorkspace() : state.destination === "settings" ? settingsWorkspace() : weekWorkspace();
  root.innerHTML = `<div class="prototype-frame">${compactHeader()}${sidebar()}${workspace}</div>${prototypeNavigator()}<div class="prototype-badge">A SELECTED · SYNTHETIC DATA</div>`;
  const view = views.find((item) => item.id === state.view);
  document.title = `Personal Dashboard — ${view.label}`;
  bindEvents();
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("variant", "A");
  url.searchParams.set("state", state.view);
  url.searchParams.delete("step");
  url.searchParams.delete("dialog");
  url.searchParams.delete("section");
  url.searchParams.delete("profile");
  url.searchParams.delete("permission");
  if (state.view === "pending" && state.pendingStep === "actions") url.searchParams.set("step", "actions");
  if (state.view === "history" && !state.deleteDialog) url.searchParams.set("dialog", "closed");
  if (state.view === "settings" && state.settingsSection !== "profile") url.searchParams.set("section", state.settingsSection);
  if (state.profileInactive) url.searchParams.set("profile", "inactive");
  if (!state.notificationsDenied) url.searchParams.set("permission", "granted");
  window.history.replaceState({}, "", url);
}

function setView(view) {
  state.view = view;
  state.destination = destinationForView(view);
  state.compactSurface = "info";
  state.fixtureStatus = "";
  if (view === "pending" || view === "compact") state.selectedSlotId = "thu";
  if (view === "recording") state.selectedSlotId = "mon";
  if (view === "history") state.deleteDialog = true;
  syncUrl();
  render();
  if (view === "history") focusAfterRender("[data-cancel-delete]");
}

function cycleState(delta) {
  const index = views.findIndex((view) => view.id === state.view);
  setView(views[(index + delta + views.length) % views.length].id);
}

function focusAfterRender(selector) {
  window.requestAnimationFrame(() => root.querySelector(selector)?.focus());
}

function bindEvents() {
  root.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  root.querySelector("[data-compact-destination]")?.addEventListener("change", (event) => setView(event.target.value));
  root.querySelectorAll("[data-cycle-state]").forEach((button) => button.addEventListener("click", () => cycleState(Number(button.dataset.cycleState))));
  root.querySelectorAll("[data-slot]").forEach((button) => button.addEventListener("click", () => { state.selectedSlotId = button.dataset.slot; state.compactSurface = "detail"; render(); focusAfterRender(".back-button"); }));
  root.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => { state.compactSurface = "info"; render(); focusAfterRender(`[data-slot="${state.selectedSlotId}"]`); }));
  root.querySelectorAll("[data-attention]").forEach((button) => button.addEventListener("click", () => { state.selectedSlotId = state.view === "recording" ? "mon" : "thu"; state.compactSurface = "detail"; render(); focusAfterRender(".pending-detail button, .recording-detail button, .back-button"); }));
  root.querySelectorAll("[data-departure-action]").forEach((button) => button.addEventListener("click", () => { const action = button.dataset.departureAction; if (action === "leave") { state.pendingOutcome = "leave"; state.pendingComplete = true; } else { state.pendingOutcome = action; state.pendingStep = "reason"; } syncUrl(); render(); focusAfterRender(".breadcrumb-button, [data-reset-pending]"); }));
  root.querySelector("[data-response-back]")?.addEventListener("click", () => { state.pendingStep = "actions"; syncUrl(); render(); focusAfterRender("[data-departure-action]"); });
  root.querySelectorAll("[data-reason]").forEach((button) => button.addEventListener("click", () => { state.pendingComplete = true; render(); focusAfterRender("[data-reset-pending]"); }));
  root.querySelector("[data-reset-pending]")?.addEventListener("click", () => { state.pendingComplete = false; state.pendingStep = "actions"; syncUrl(); render(); focusAfterRender("[data-departure-action]"); });
  root.querySelectorAll("[data-effort]").forEach((button) => button.addEventListener("click", () => { state.workoutComplete = true; render(); focusAfterRender(".inline-success"); }));
  root.querySelectorAll("[data-week]").forEach((button) => button.addEventListener("click", () => { state.selectedWeekId = button.dataset.week; state.compactSurface = "detail"; state.deleteDialog = false; syncUrl(); render(); focusAfterRender(".back-button, [data-record]"); }));
  root.querySelectorAll("[data-record]").forEach((button) => button.addEventListener("click", () => { state.selectedRecordId = button.dataset.record; render(); focusAfterRender(".correction-form select"); }));
  root.querySelector("[data-open-delete]")?.addEventListener("click", () => { state.deleteDialog = true; syncUrl(); render(); focusAfterRender("[data-cancel-delete]"); });
  root.querySelector("[data-cancel-delete]")?.addEventListener("click", () => { state.deleteDialog = false; syncUrl(); render(); focusAfterRender("[data-open-delete]"); });
  root.querySelector("[data-confirm-delete]")?.addEventListener("click", () => { state.deleteDialog = false; state.fixtureStatus = "Record deleted in prototype state"; syncUrl(); render(); focusAfterRender("[data-open-delete]"); });
  root.querySelector("[data-save-correction]")?.addEventListener("click", () => { state.fixtureStatus = "Correction saved in prototype state"; render(); focusAfterRender("[data-save-correction]"); });
  root.querySelectorAll("[data-settings-section]").forEach((button) => button.addEventListener("click", () => { state.settingsSection = button.dataset.settingsSection; state.compactSurface = "detail"; state.fixtureStatus = ""; syncUrl(); render(); focusAfterRender(".back-button, .settings-form button, .settings-form select"); }));
  root.querySelectorAll("[data-fixture-action]").forEach((button) => button.addEventListener("click", () => { state.fixtureStatus = button.dataset.fixtureAction; render(); focusAfterRender(".fixture-status"); }));
  root.querySelector("[data-toggle-profile]")?.addEventListener("click", () => { state.profileInactive = !state.profileInactive; syncUrl(); render(); focusAfterRender("[data-toggle-profile]"); });
  root.querySelector("[data-toggle-notifications]")?.addEventListener("click", () => { state.notificationsDenied = !state.notificationsDenied; syncUrl(); render(); focusAfterRender("[data-toggle-notifications]"); });
  root.querySelector("[data-open-restore]")?.addEventListener("click", () => { state.restoreDialog = true; render(); focusAfterRender("[data-cancel-restore]"); });
  root.querySelector("[data-cancel-restore]")?.addEventListener("click", () => { state.restoreDialog = false; render(); focusAfterRender("[data-open-restore]"); });
  root.querySelector("[data-confirm-restore]")?.addEventListener("click", () => { state.restoreDialog = false; state.fixtureStatus = "Restore return state represented; no file was changed"; render(); focusAfterRender(".fixture-status"); });
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target.matches("input, textarea, select, [contenteditable]")) return;
  if (event.key === "ArrowLeft") cycleState(-1);
  if (event.key === "ArrowRight") cycleState(1);
  if (event.key === "Escape" && state.deleteDialog) { state.deleteDialog = false; syncUrl(); render(); focusAfterRender("[data-open-delete]"); }
  if (event.key === "Escape" && state.restoreDialog) { state.restoreDialog = false; render(); focusAfterRender("[data-open-restore]"); }
  if (event.metaKey && ["1", "2", "3"].includes(event.key)) {
    event.preventDefault();
    setView({ "1": "normal", "2": "history", "3": "settings" }[event.key]);
  }
});

window.addEventListener("popstate", () => window.location.reload());
render();
if (state.view === "history" && state.deleteDialog) focusAfterRender("[data-cancel-delete]");
