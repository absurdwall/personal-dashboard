type ApplicationIdentity = Readonly<{
  productName: string;
  featureArea: string;
  boundaryMessage: string;
}>;

type ProfileView = Readonly<{
  schemaVersion: number;
  profileLabel: string;
  authority: "active" | "inactive";
  origin: "local" | "completed_baseline";
}>;

type ProfileBackupAction = Readonly<{
  message: string;
}>;

type ProfileRestorePreview = Readonly<{
  profile: ProfileView;
  exercise: Readonly<{
    currentWeek: Readonly<{
      weekStart: string;
      weekEnd: string;
      completedCount: number;
      weeklyGoal: number;
    }> | null;
    historicalWeekCount: number;
    desiredReminderCount: number;
  }>;
}>;

type ProfileRestoreSelection = Readonly<{
  confirmationRequired: boolean;
  message: string;
  preview?: ProfileRestorePreview;
}>;

type ProfileRestoreAction = Readonly<{
  profile: ProfileView;
  dashboard: ExerciseDashboardView;
  message: string;
}>;

type ProfileMoveAction = ProfileRestoreAction &
  Readonly<{ reminderTransitionPending: boolean }>;
type ProfileMoveSelection = ProfileRestoreSelection;

type BaselineMigrationView = Readonly<{
  status: "completed" | "not_found" | "existing_profile" | "failed";
  failure:
    | "app_state_read"
    | "incomplete_app_state"
    | "invalid_app_state"
    | "baseline_read"
    | "invalid_baseline"
    | "unsupported_baseline"
    | "adoption_failed"
    | null;
  blocksProfile: boolean;
}>;

const INACTIVE_PROFILE_MESSAGE =
  "This profile is inactive. Exercise activity and reminders are paused.";

type DepartureTiming = Readonly<{
  id: string;
  day: string;
  time: string;
}>;

type DepartureDecisionOutcome = "move-to-fallback" | "skip";
type DepartureReason =
  | "Work ran late"
  | "Too tired"
  | "Sick or injured"
  | "Another commitment"
  | "Other";

type ScheduleChoice = Readonly<{
  value: string;
  label: string;
}>;

type ScheduleChoices = Readonly<{
  dayChoices: readonly ScheduleChoice[];
  timeChoices: readonly ScheduleChoice[];
}>;

type ScheduleAdjustment = Readonly<{
  action: string;
  saveAction: string;
  selectedDay: string;
  selectedTime: string;
}>;

type PrimaryDeparture = DepartureTiming & Readonly<{
  departureAtEpochMillis: number;
  status: string;
  statusKind: DepartureStatusKind;
  hasWorkoutRecord: boolean;
  recordWorkoutAction: string | null;
  adjustment: ScheduleAdjustment | null;
}>;

type FallbackDeparture = DepartureTiming & Readonly<{
  departureAtEpochMillis: number;
  availability: string;
  availabilityKind: FallbackAvailabilityKind;
  recordWorkoutAction: string | null;
}>;

type DepartureStatusKind =
  | "scheduled"
  | "unrecorded"
  | "awaiting-response"
  | "unresolved"
  | "leaving"
  | "completed"
  | "moved"
  | "skipped"
  | "not-needed"
  | "missed"
  | "available";

type FallbackAvailabilityKind =
  | "assigned"
  | "available"
  | "unrecorded"
  | "recorded"
  | "not-needed"
  | "missed"
  | "reserved"
  | "unavailable";

type WorkoutPrompt = Readonly<{
  slotId: string;
  heading: string;
  action: string;
}>;

type WorkoutRecording = Readonly<{
  slotId: string;
  heading: string;
  guidance: string;
  choiceName: "activity" | "duration" | "effort";
  choices: readonly string[];
}>;

type WorkoutRecord = Readonly<{
  id: string;
  source: string;
  sourceSlotId: string | null;
  recordedAt: string;
  recordedAtUtcOffsetMinutes: number | null;
  activity: string;
  duration: string;
  effort: string;
  outcome: string;
}>;

type WorkoutHistoryControls = Readonly<{
  activityChoices: readonly string[];
  durationChoices: readonly string[];
  effortChoices: readonly string[];
  editAction: string;
  saveAction: string;
  deleteAction: string;
  deletePrompt: string;
  confirmDeleteAction: string;
  cancelDeleteAction: string;
}>;

type ExerciseWeekHistory = Readonly<{
  weekLabel: string;
  progress: string;
  primaryDepartures: readonly PrimaryDeparture[];
  fallbackDepartures: readonly FallbackDeparture[];
  workoutRecords: readonly WorkoutRecord[];
}>;

type RoutineDepartureSettings = Readonly<{
  order: number;
  day: string;
  time: string;
  selectedDay: string;
  selectedTime: string;
}>;

type RoutineSettings = Readonly<{
  action: string;
  guidance: string;
  saveAction: string;
  primaryDepartures: readonly RoutineDepartureSettings[];
}>;

type ExerciseDashboardView = Readonly<{
  productName: string;
  featureArea: string;
  schemaVersion: number;
  weekLabel: string;
  progress: string;
  manualWorkoutAction: string;
  weeklyGoalStatus: string | null;
  nextDeparture: string | null;
  nextDepartureSlotId: string | null;
  scheduleChoices: ScheduleChoices;
  primaryDepartures: readonly PrimaryDeparture[];
  fallbackDepartures: readonly FallbackDeparture[];
  fallbackAvailableCount: number;
  reminderMessage: string;
  departurePrompt: Readonly<{
    slotId: string;
    heading: string;
    actions: readonly string[];
    status: string | null;
  }> | null;
  departureReasonPrompt: Readonly<{
    slotId: string;
    outcome: DepartureDecisionOutcome;
    heading: string;
    reasons: readonly DepartureReason[];
  }> | null;
  departureConfirmation: Readonly<{
    message: string;
    nextPrompt: string;
  }> | null;
  workoutPrompt: WorkoutPrompt | null;
  workoutRecording: WorkoutRecording | null;
  workoutHistoryControls: WorkoutHistoryControls;
  workoutRecords: readonly WorkoutRecord[];
  history: readonly ExerciseWeekHistory[];
  routineSettings: RoutineSettings;
}>;

type NotificationPermission =
  | "prompt"
  | "granted"
  | "denied";

type NotificationCapabilityView = Readonly<{
  permission: NotificationPermission;
  scheduledForEpochMillis: number | null;
  message: string;
}>;

declare global {
  interface Window {
    __TAURI__: {
      core: {
        invoke<T>(command: string, arguments_?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

type WorkspaceDestination = "this-week" | "history" | "settings";

const workspaceDestinationDetails: Record<
  WorkspaceDestination,
  Readonly<{
    title: string;
    description: string;
  }>
> = {
  "this-week": {
    title: "This Week",
    description:
      "Plan the next departure, record what happened, and keep this week moving.",
  },
  history: {
    title: "History",
    description: "Review recorded workouts and decisions from earlier weeks.",
  },
  settings: {
    title: "Profile & data",
    description: "Keep this device's profile, routine, reminders, and local files under your control.",
  },
};

const runtimeStatus = document.querySelector<HTMLElement>("#runtime-status");
const workspaceDestinationButtons = document.querySelectorAll<HTMLButtonElement>(
  "[data-workspace-destination]",
);
const workspaceDestinationPanels = document.querySelectorAll<HTMLElement>(
  "[data-workspace-panel]",
);
const workspaceTitle = document.querySelector<HTMLElement>("#workspace-title");
const workspaceDescription = document.querySelector<HTMLElement>("#workspace-description");
const workspaceContextStatus = document.querySelector<HTMLElement>(
  "#workspace-context-status",
);
const workspaceDetailHeading = document.querySelector<HTMLElement>(
  "#workspace-detail-heading",
);
const workspaceDetailKicker = document.querySelector<HTMLElement>(
  "#workspace-detail-kicker",
);
const workspaceDetailCopy = document.querySelector<HTMLElement>("#workspace-detail-copy");
const workspaceDetailStatus = document.querySelector<HTMLElement>("#workspace-detail-status");
const workspaceDetail = document.querySelector<HTMLElement>("#workspace-detail");
const workspaceDetailClose = document.querySelector<HTMLButtonElement>(
  "#workspace-detail-close",
);
const workspaceSheetBackdrop = document.querySelector<HTMLElement>(
  "#workspace-sheet-backdrop",
);
const workspaceDetailActions = document.querySelector<HTMLElement>(
  "#workspace-detail-actions",
);
const historyEmptyState = document.querySelector<HTMLElement>("#history-empty-state");
const exerciseDashboard = document.querySelector<HTMLElement>("#exercise-dashboard");
const inactiveProfileNotice = document.querySelector<HTMLElement>(
  "#inactive-profile-notice",
);
const exerciseWeek = document.querySelector<HTMLElement>("#exercise-week");
const exerciseProgress = document.querySelector<HTMLElement>("#exercise-progress");
const nextDeparture = document.querySelector<HTMLElement>("#next-departure");
const primaryDepartures = document.querySelector<HTMLOListElement>("#primary-departures");
const fallbackDepartures = document.querySelector<HTMLOListElement>("#fallback-departures");
const fallbackCount = document.querySelector<HTMLElement>("#fallback-count");
const exerciseReminderStatus = document.querySelector<HTMLElement>(
  "#exercise-reminder-status",
);
const weeklyGoalStatus = document.querySelector<HTMLElement>("#weekly-goal-status");
const logWorkoutNow = document.querySelector<HTMLButtonElement>("#log-workout-now");
const workoutRecording = document.querySelector<HTMLElement>("#workout-recording");
const workoutRecordingHeading = document.querySelector<HTMLElement>(
  "#workout-recording-heading",
);
const workoutRecordingGuidance = document.querySelector<HTMLElement>(
  "#workout-recording-guidance",
);
const workoutRecordingChoices = document.querySelector<HTMLElement>(
  "#workout-recording-choices",
);
const workoutHistory = document.querySelector<HTMLElement>("#workout-history");
const workoutRecords = document.querySelector<HTMLOListElement>("#workout-records");
const exerciseHistory = document.querySelector<HTMLElement>("#exercise-history");
const exerciseHistoryWeeks = document.querySelector<HTMLElement>(
  "#exercise-history-weeks",
);
const routineSettingsAction = document.querySelector<HTMLElement>(
  "#routine-settings-action",
);
const routineSettingsGuidance = document.querySelector<HTMLElement>(
  "#routine-settings-guidance",
);
const routineDepartures = document.querySelector<HTMLOListElement>(
  "#routine-departures",
);
const profileForm = document.querySelector<HTMLFormElement>("#profile-form");
const profileLabel = document.querySelector<HTMLInputElement>("#profile-label");
const profileLabelDisplay = document.querySelector<HTMLOutputElement>(
  "#profile-label-display",
);
const schemaVersion = document.querySelector<HTMLElement>("#schema-version");
const profileAuthority = document.querySelector<HTMLElement>("#profile-authority");
const profileAuthorityMessage = document.querySelector<HTMLElement>(
  "#profile-authority-message",
);
const profileStatus = document.querySelector<HTMLElement>("#profile-status");
const saveProfileLabelButton = document.querySelector<HTMLButtonElement>(
  "#save-profile-label",
);
const backupProfileButton = document.querySelector<HTMLButtonElement>("#backup-profile");
const selectProfileRestoreButton = document.querySelector<HTMLButtonElement>(
  "#select-profile-restore",
);
const profileRestoreConfirmation = document.querySelector<HTMLElement>(
  "#profile-restore-confirmation",
);
const profileRestorePreview = document.querySelector<HTMLElement>(
  "#profile-restore-preview",
);
const profileRestorePreviewProfile = document.querySelector<HTMLElement>(
  "#profile-restore-preview-profile",
);
const profileRestorePreviewAuthority = document.querySelector<HTMLElement>(
  "#profile-restore-preview-authority",
);
const profileRestorePreviewWeek = document.querySelector<HTMLElement>(
  "#profile-restore-preview-week",
);
const profileRestorePreviewProgress = document.querySelector<HTMLElement>(
  "#profile-restore-preview-progress",
);
const profileRestorePreviewHistory = document.querySelector<HTMLElement>(
  "#profile-restore-preview-history",
);
const profileRestorePreviewReminders = document.querySelector<HTMLElement>(
  "#profile-restore-preview-reminders",
);
const confirmProfileRestoreButton = document.querySelector<HTMLButtonElement>(
  "#confirm-profile-restore",
);
const cancelProfileRestoreButton = document.querySelector<HTMLButtonElement>(
  "#cancel-profile-restore",
);
const prepareProfileMoveButton = document.querySelector<HTMLButtonElement>(
  "#prepare-profile-move",
);
const selectProfileMoveImportButton = document.querySelector<HTMLButtonElement>(
  "#select-profile-move-import",
);
const profileMoveExportConfirmation = document.querySelector<HTMLElement>(
  "#profile-move-export-confirmation",
);
const confirmProfileMoveButton = document.querySelector<HTMLButtonElement>(
  "#confirm-profile-move",
);
const cancelProfileMoveButton = document.querySelector<HTMLButtonElement>(
  "#cancel-profile-move",
);
const profileMoveImportConfirmation = document.querySelector<HTMLElement>(
  "#profile-move-import-confirmation",
);
const confirmProfileMoveImportButton = document.querySelector<HTMLButtonElement>(
  "#confirm-profile-move-import",
);
const cancelProfileMoveImportButton = document.querySelector<HTMLButtonElement>(
  "#cancel-profile-move-import",
);
const profileReactivation = document.querySelector<HTMLElement>("#profile-reactivation");
const prepareProfileReactivationButton = document.querySelector<HTMLButtonElement>(
  "#prepare-profile-reactivation",
);
const profileReactivationConfirmation = document.querySelector<HTMLElement>(
  "#profile-reactivation-confirmation",
);
const confirmProfileReactivationButton = document.querySelector<HTMLButtonElement>(
  "#confirm-profile-reactivation",
);
const cancelProfileReactivationButton = document.querySelector<HTMLButtonElement>(
  "#cancel-profile-reactivation",
);
const notificationPermission = document.querySelector<HTMLElement>(
  "#notification-permission",
);
const notificationScheduledTime = document.querySelector<HTMLElement>(
  "#notification-scheduled-time",
);
const notificationStatus = document.querySelector<HTMLElement>("#notification-status");
const requestNotificationPermissionButton = document.querySelector<HTMLButtonElement>(
  "#request-notification-permission",
);
const scheduleCapabilityNotificationButton = document.querySelector<HTMLButtonElement>(
  "#schedule-capability-notification",
);
let currentProfileAuthority: ProfileView["authority"] = "active";
let currentWorkspaceDestination: WorkspaceDestination = "this-week";
let currentExerciseView: ExerciseDashboardView | null = null;
let selectedDepartureSlotId: string | null = null;
let activeWorkoutSlotId: string | null = null;
let workspaceDetailOpen = false;
let detailTriggerToRestore: HTMLButtonElement | null = null;

function departureItem(
  departure: DepartureTiming,
  status?: string,
): HTMLLIElement {
  const item = document.createElement("li");
  const timing = document.createElement("span");
  const day = document.createElement("strong");
  const time = document.createElement("span");
  day.textContent = departure.day;
  time.textContent = departure.time;
  timing.append(day, time);
  item.append(timing);
  if (status) {
    const availability = document.createElement("span");
    availability.className = "availability";
    availability.textContent = status;
    item.append(availability);
  }
  return item;
}

function scheduleSelect(
  labelText: string,
  choices: readonly ScheduleChoice[],
  selectedValue: string,
  role: "day" | "time",
): HTMLLabelElement {
  const label = document.createElement("label");
  const select = document.createElement("select");
  label.append(labelText);
  select.dataset.scheduleRole = role;
  select.replaceChildren(
    ...choices.map((choice) => {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = choice.label;
      option.selected = choice.value === selectedValue;
      return option;
    }),
  );
  label.append(select);
  return label;
}

function scheduleControls(
  dayChoices: readonly ScheduleChoice[],
  timeChoices: readonly ScheduleChoice[],
  selectedDay: string,
  selectedTime: string,
  saveAction: string,
): HTMLDivElement {
  const controls = document.createElement("div");
  const save = document.createElement("button");
  controls.className = "schedule-controls";
  save.type = "button";
  save.textContent = saveAction;
  save.dataset.scheduleSave = "true";
  controls.append(
    scheduleSelect("Day", dayChoices, selectedDay, "day"),
    scheduleSelect("Departure time", timeChoices, selectedTime, "time"),
    save,
  );
  return controls;
}

function primaryDepartureItem(departure: PrimaryDeparture): HTMLLIElement {
  const item = document.createElement("li");
  const trigger = document.createElement("button");
  const identity = document.createElement("span");
  const day = document.createElement("strong");
  const time = document.createElement("span");
  const state = document.createElement("span");
  const marker = document.createElement("span");
  const status = document.createElement("span");
  item.className = "agenda-row primary-agenda-row";
  item.dataset.slotId = departure.id;
  trigger.type = "button";
  trigger.className = "agenda-row-trigger";
  trigger.dataset.agendaSlotId = departure.id;
  trigger.setAttribute("aria-label", `Select ${departure.day} planned workout`);
  trigger.setAttribute(
    "aria-pressed",
    String(departure.id === selectedDepartureSlotId),
  );
  identity.className = "agenda-row-identity";
  day.textContent = departure.day;
  time.textContent = departure.time;
  identity.append(day, time);
  state.className = `agenda-row-state status-${departure.statusKind}`;
  marker.className = "agenda-status-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = departureStatusSignal(departure.statusKind);
  status.textContent = primaryDepartureStatusLabel(departure);
  state.append(marker, status);
  trigger.append(identity, state);
  item.append(trigger);
  if (departure.hasWorkoutRecord) {
    const evidence = document.createElement("span");
    evidence.className = "workout-evidence";
    evidence.textContent = "✓ Workout recorded";
    item.append(evidence);
  }
  return item;
}

function fallbackDepartureItem(departure: FallbackDeparture): HTMLLIElement {
  const item = document.createElement("li");
  const trigger = document.createElement("button");
  const identity = document.createElement("span");
  const day = document.createElement("strong");
  const time = document.createElement("span");
  const state = document.createElement("span");
  const marker = document.createElement("span");
  const status = document.createElement("span");
  item.className = `agenda-row fallback-agenda-row availability-${departure.availabilityKind}`;
  item.dataset.slotId = departure.id;
  trigger.type = "button";
  trigger.className = "agenda-row-trigger";
  trigger.dataset.agendaSlotId = departure.id;
  trigger.setAttribute("aria-label", `Select ${departure.day} open capacity`);
  trigger.setAttribute(
    "aria-pressed",
    String(departure.id === selectedDepartureSlotId),
  );
  if (
    departure.availabilityKind === "reserved" ||
    departure.availabilityKind === "unavailable"
  ) {
    trigger.disabled = true;
    trigger.dataset.agendaUnavailable = "true";
    trigger.setAttribute("aria-disabled", "true");
  }
  identity.className = "agenda-row-identity";
  day.textContent = departure.day;
  time.textContent = departure.time;
  identity.append(day, time);
  state.className = "agenda-row-state";
  marker.className = "agenda-status-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = fallbackAvailabilitySignal(departure.availabilityKind);
  status.textContent = fallbackDepartureStatusLabel(departure);
  state.append(marker, status);
  trigger.append(identity, state);
  item.append(trigger);
  return item;
}

function departureStatusSignal(kind: DepartureStatusKind): string {
  return {
    scheduled: "•",
    unrecorded: "!",
    "awaiting-response": "!",
    unresolved: "!",
    leaving: "→",
    completed: "✓",
    moved: "↪",
    skipped: "—",
    "not-needed": "·",
    missed: "×",
    available: "•",
  }[kind];
}

function fallbackAvailabilitySignal(kind: FallbackAvailabilityKind): string {
  return {
    assigned: "↪",
    available: "•",
    unrecorded: "!",
    recorded: "✓",
    "not-needed": "·",
    missed: "×",
    reserved: "—",
    unavailable: "—",
  }[kind];
}

function primaryDepartureStatusLabel(departure: PrimaryDeparture): string {
  if (departure.hasWorkoutRecord || departure.statusKind === "completed") {
    return "Completed";
  }
  if (departure.recordWorkoutAction) {
    return "Unrecorded — ready to record";
  }
  return {
    scheduled: "Scheduled",
    unrecorded: "Unrecorded",
    "awaiting-response": "Needs review",
    unresolved: "Needs review",
    leaving: "Ready to record",
    completed: "Completed",
    moved: "Rescheduled",
    skipped: "Skipped",
    "not-needed": "No workout needed",
    missed: "Missed",
    available: "Available",
  }[departure.statusKind];
}

function fallbackDepartureStatusLabel(departure: FallbackDeparture): string {
  return {
    assigned: "Assigned from primary plan",
    available: "Available",
    unrecorded: "Unrecorded — ready to record",
    recorded: "Recorded",
    "not-needed": "No workout needed",
    missed: "Missed",
    reserved: "Reserved",
    unavailable: "Unavailable",
  }[departure.availabilityKind];
}

function chronologicalPrimaryDepartures(
  departures: readonly PrimaryDeparture[],
): PrimaryDeparture[] {
  return [...departures].sort(
    (left, right) => left.departureAtEpochMillis - right.departureAtEpochMillis,
  );
}

function chronologicalFallbackDepartures(
  departures: readonly FallbackDeparture[],
): FallbackDeparture[] {
  return [...departures].sort(
    (left, right) => left.departureAtEpochMillis - right.departureAtEpochMillis,
  );
}

function routineDepartureItem(
  departure: RoutineDepartureSettings,
  saveAction: string,
  choices: ScheduleChoices,
): HTMLLIElement {
  const item = document.createElement("li");
  const timing = document.createElement("strong");
  const editor = scheduleControls(
    choices.dayChoices,
    choices.timeChoices,
    departure.selectedDay,
    departure.selectedTime,
    saveAction,
  );
  timing.textContent = `${departure.day} · ${departure.time}`;
  item.dataset.routineOrder = String(departure.order);
  item.append(timing, editor);
  return item;
}

function workoutButton(
  label: string,
  slotId: string,
  choiceName: "start" | WorkoutRecording["choiceName"],
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.slotId = slotId;
  button.dataset.choiceName = choiceName;
  button.dataset.choice = label;
  return button;
}

function workoutCorrectionSelect(
  labelText: string,
  choices: readonly string[],
  selectedValue: string,
  role: "activity" | "duration" | "effort",
): HTMLLabelElement {
  const label = document.createElement("label");
  const select = document.createElement("select");
  label.append(labelText);
  select.dataset.historyRole = role;
  select.replaceChildren(
    ...choices.map((choice) => {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      option.selected = choice === selectedValue;
      return option;
    }),
  );
  label.append(select);
  return label;
}

function workoutRecordSummary(record: WorkoutRecord): HTMLDivElement {
  const summary = document.createElement("div");
  const activity = document.createElement("strong");
  const details = document.createElement("span");
  const context = document.createElement("span");
  const outcome = document.createElement("span");
  activity.textContent = record.activity;
  details.textContent = `${record.duration} · ${record.effort}`;
  context.textContent = `${record.source} · ${record.recordedAt}`;
  outcome.textContent = record.outcome;
  summary.className = "workout-record-summary";
  summary.append(activity, details, context, outcome);
  return summary;
}

function workoutRecordEditor(
  record: WorkoutRecord,
  controls: WorkoutHistoryControls,
): HTMLDetailsElement {
  const editor = document.createElement("details");
  const editorSummary = document.createElement("summary");
  const editorControls = document.createElement("div");
  const save = document.createElement("button");
  editor.className = "record-editor";
  editorSummary.textContent = controls.editAction;
  editorControls.className = "history-controls";
  save.type = "button";
  save.textContent = controls.saveAction;
  save.dataset.historySave = "true";
  editorControls.append(
    workoutCorrectionSelect(
      "Activity",
      controls.activityChoices,
      record.activity,
      "activity",
    ),
    workoutCorrectionSelect(
      "Duration",
      controls.durationChoices,
      record.duration,
      "duration",
    ),
    workoutCorrectionSelect(
      "Perceived effort",
      controls.effortChoices,
      record.effort,
      "effort",
    ),
    save,
  );
  editor.append(editorSummary, editorControls);
  return editor;
}

function workoutRecordDeletion(
  controls: WorkoutHistoryControls,
): HTMLDetailsElement {
  const deletion = document.createElement("details");
  const deletionSummary = document.createElement("summary");
  const deletionPrompt = document.createElement("p");
  const deletionActions = document.createElement("div");
  const confirmDelete = document.createElement("button");
  const cancelDelete = document.createElement("button");
  deletion.className = "record-deletion";
  deletionSummary.textContent = controls.deleteAction;
  deletionPrompt.textContent = controls.deletePrompt;
  deletionActions.className = "history-actions";
  confirmDelete.type = "button";
  confirmDelete.textContent = controls.confirmDeleteAction;
  confirmDelete.dataset.historyDelete = "true";
  cancelDelete.type = "button";
  cancelDelete.textContent = controls.cancelDeleteAction;
  cancelDelete.dataset.historyCancel = "true";
  deletionActions.append(confirmDelete, cancelDelete);
  deletion.append(deletionSummary, deletionPrompt, deletionActions);
  return deletion;
}

function workoutRecordItem(
  record: WorkoutRecord,
  controls: WorkoutHistoryControls,
): HTMLLIElement {
  const item = document.createElement("li");
  item.dataset.recordId = record.id;
  item.append(
    workoutRecordSummary(record),
    workoutRecordEditor(record, controls),
    workoutRecordDeletion(controls),
  );
  return item;
}

function historyWeekItem(
  week: ExerciseWeekHistory,
  controls: WorkoutHistoryControls,
): HTMLElement {
  const article = document.createElement("article");
  const heading = document.createElement("h5");
  const progress = document.createElement("p");
  const primaryHeading = document.createElement("h6");
  const primary = document.createElement("ol");
  const fallbackHeading = document.createElement("h6");
  const fallback = document.createElement("ol");
  heading.textContent = week.weekLabel;
  progress.textContent = week.progress;
  primaryHeading.textContent = "Primary departures";
  fallbackHeading.textContent = "Open capacity";
  primary.className = "departure-list";
  fallback.className = "departure-list";
  primary.replaceChildren(
    ...week.primaryDepartures.map((departure) =>
      departureItem(departure, primaryDepartureStatusLabel(departure)),
    ),
  );
  fallback.replaceChildren(
    ...week.fallbackDepartures.map((departure) =>
      departureItem(departure, fallbackDepartureStatusLabel(departure)),
    ),
  );
  article.append(heading, progress, primaryHeading, primary, fallbackHeading, fallback);
  if (week.workoutRecords.length > 0) {
    const workoutHeading = document.createElement("h6");
    const workouts = document.createElement("ol");
    workoutHeading.textContent = "Recorded workouts";
    workouts.className = "workout-records";
    workouts.replaceChildren(
      ...week.workoutRecords.map((record) => workoutRecordItem(record, controls)),
    );
    article.append(workoutHeading, workouts);
  }
  return article;
}

type SelectedDeparture = PrimaryDeparture | FallbackDeparture;

function selectedDeparture(
  view: ExerciseDashboardView,
): SelectedDeparture | undefined {
  return [...view.primaryDepartures, ...view.fallbackDepartures].find(
    (departure) => departure.id === selectedDepartureSlotId,
  );
}

function isPrimaryDeparture(
  departure: SelectedDeparture,
): departure is PrimaryDeparture {
  return "status" in departure;
}

function selectedDepartureStatusLabel(departure: SelectedDeparture): string {
  return isPrimaryDeparture(departure)
    ? primaryDepartureStatusLabel(departure)
    : fallbackDepartureStatusLabel(departure);
}

function selectedDepartureHasWorkoutRecord(departure: SelectedDeparture): boolean {
  return isPrimaryDeparture(departure)
    ? departure.hasWorkoutRecord
    : departure.availabilityKind === "recorded";
}

function selectedDepartureRecordAction(
  departure: SelectedDeparture,
): string | null {
  return departure.recordWorkoutAction;
}

function updateAgendaRowSelection(): void {
  [primaryDepartures, fallbackDepartures].forEach((container) => {
    container?.querySelectorAll<HTMLButtonElement>(
      "button[data-agenda-slot-id]",
    ).forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.agendaSlotId === selectedDepartureSlotId),
      );
    });
  });
}

function closeWorkspaceDetail(restoreFocus = true): void {
  workspaceDetailOpen = false;
  renderWorkspaceDetail();
  const trigger = detailTriggerToRestore;
  if (restoreFocus) {
    if (trigger?.isConnected) {
      window.requestAnimationFrame(() => trigger.focus());
    } else {
      restoreSelectedAgendaFocus();
    }
  }
  detailTriggerToRestore = null;
}

function restoreSelectedAgendaFocus(): void {
  if (!selectedDepartureSlotId) {
    return;
  }
  const trigger = [primaryDepartures, fallbackDepartures]
    .flatMap((container) =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLButtonElement>(
              "button[data-agenda-slot-id]",
            ),
          )
        : [],
    )
    .find((button) => button.dataset.agendaSlotId === selectedDepartureSlotId);
  window.requestAnimationFrame(() => trigger?.focus());
}

function openWorkspaceDetail(
  slotId: string,
  trigger: HTMLButtonElement | null = null,
): void {
  selectedDepartureSlotId = slotId;
  detailTriggerToRestore = trigger;
  workspaceDetailOpen = true;
  updateAgendaRowSelection();
  if (currentExerciseView?.workoutRecording?.slotId === slotId) {
    activeWorkoutSlotId = slotId;
  }
  renderWorkspaceDetail();
  window.requestAnimationFrame(() => workspaceDetailClose?.focus());
}

function renderWorkspaceDetail(
  view: ExerciseDashboardView | null = currentExerciseView,
): void {
  if (!workspaceDetail || !workspaceSheetBackdrop) {
    return;
  }

  const open = workspaceDetailOpen && currentWorkspaceDestination === "this-week";
  workspaceDetail.hidden = !open;
  workspaceSheetBackdrop.hidden = !open;
  workspaceDetail.setAttribute("aria-hidden", String(!open));
  if (!open) {
    workspaceDetailActions?.replaceChildren();
    if (workoutRecording) {
      workoutRecording.hidden = true;
    }
    if (workoutHistory) {
      workoutHistory.hidden = true;
    }
    return;
  }

  const selected = view ? selectedDeparture(view) : undefined;
  const recording = view?.workoutRecording ?? null;
  const showingRecording = Boolean(
    recording &&
      (activeWorkoutSlotId === recording.slotId ||
        selected?.id === recording.slotId),
  );

  if (workspaceDetailKicker) {
    workspaceDetailKicker.textContent = showingRecording
      ? "Record workout"
      : "Selected workout";
  }
  if (workspaceDetailHeading) {
    workspaceDetailHeading.textContent = selected
      ? `${selected.day} workout`
      : "Record a workout";
  }
  if (workspaceDetailCopy) {
    workspaceDetailCopy.textContent = selected
      ? `${selected.day} · ${selected.time}. The agenda remains visible while you review this plan.`
      : "Record a workout that was not attached to a planned time.";
  }
  if (workspaceDetailStatus) {
    const status = selected
      ? `${selectedDepartureStatusLabel(selected)}${
          selectedDepartureHasWorkoutRecord(selected) ? " · Workout recorded" : ""
        }`
      : "Choose the activity details below.";
    workspaceDetailStatus.textContent =
      currentProfileAuthority === "inactive" ? INACTIVE_PROFILE_MESSAGE : status;
  }
  if (workspaceDetailActions) {
    workspaceDetailActions.replaceChildren();
    const recordAction = selected ? selectedDepartureRecordAction(selected) : null;
    if (
      selected &&
      recordAction &&
      !selectedDepartureHasWorkoutRecord(selected) &&
      !showingRecording
    ) {
      workspaceDetailActions.append(
        workoutButton(recordAction, selected.id, "start"),
      );
    }
  }

  if (
    workoutRecording &&
    workoutRecordingHeading &&
    workoutRecordingGuidance &&
    workoutRecordingChoices
  ) {
    workoutRecording.hidden = !showingRecording;
    workoutRecordingChoices.replaceChildren();
    if (showingRecording && recording) {
      if (workspaceDetailHeading) {
        workspaceDetailHeading.textContent = selected
          ? `${selected.day} workout`
          : "Record a workout";
      }
      workoutRecordingHeading.textContent = recording.heading;
      workoutRecordingGuidance.textContent = recording.guidance;
      workoutRecordingChoices.append(
        ...recording.choices.map((choice) =>
          workoutButton(choice, recording.slotId, recording.choiceName),
        ),
      );
    }
  }

  if (workoutHistory && workoutRecords) {
    const selectedRecords = selected
      ? view?.workoutRecords.filter(
          (record) => record.sourceSlotId === selected.id,
        ) ?? []
      : [];
    const showHistory = Boolean(selected && selectedRecords.length > 0);
    workoutHistory.hidden = !showHistory;
    workoutRecords.replaceChildren(
      ...(showHistory && view
        ? selectedRecords.map((record) =>
            workoutRecordItem(record, view.workoutHistoryControls),
          )
        : []),
    );
  }
}

function showWorkspaceDestination(destination: WorkspaceDestination, focus = false): void {
  currentWorkspaceDestination = destination;
  if (destination !== "this-week") {
    workspaceDetailOpen = false;
    detailTriggerToRestore = null;
  }
  const details = workspaceDestinationDetails[destination];
  workspaceDestinationButtons.forEach((button) => {
    const isCurrent = button.dataset.workspaceDestination === destination;
    button.toggleAttribute("aria-current", isCurrent);
    if (isCurrent) {
      button.setAttribute("aria-current", "page");
    }
    if (focus && isCurrent) {
      button.focus();
    }
  });
  workspaceDestinationPanels.forEach((panel) => {
    panel.hidden = panel.dataset.workspacePanel !== destination;
  });
  if (workspaceTitle) {
    workspaceTitle.textContent = details.title;
  }
  if (workspaceDescription) {
    workspaceDescription.textContent = details.description;
  }
  if (workspaceContextStatus) {
    workspaceContextStatus.textContent = `${details.title} is the current destination.`;
  }
  renderWorkspaceDetail();
}

function renderExerciseDashboard(view: ExerciseDashboardView): void {
  currentExerciseView = view;
  const primaryAgenda = chronologicalPrimaryDepartures(view.primaryDepartures);
  const fallbackAgenda = chronologicalFallbackDepartures(view.fallbackDepartures);
  const allAgendaIds = [...primaryAgenda, ...fallbackAgenda].map((departure) => departure.id);
  if (selectedDepartureSlotId && !allAgendaIds.includes(selectedDepartureSlotId)) {
    selectedDepartureSlotId = null;
    workspaceDetailOpen = false;
    detailTriggerToRestore = null;
  }
  if (exerciseWeek) {
    exerciseWeek.textContent = `Week of ${view.weekLabel}`;
  }
  if (exerciseProgress) {
    exerciseProgress.textContent = view.progress;
  }
  if (nextDeparture) {
    nextDeparture.textContent =
      view.nextDeparture ??
      (view.weeklyGoalStatus
        ? "Weekly goal complete — optional workouts welcome"
        : "No primary departures remaining this week");
  }
  if (primaryDepartures) {
    primaryDepartures.replaceChildren(
      ...primaryAgenda.map((departure) =>
        primaryDepartureItem(departure),
      ),
    );
  }
  if (fallbackDepartures) {
    fallbackDepartures.replaceChildren(
      ...fallbackAgenda.map((departure) => fallbackDepartureItem(departure)),
    );
  }
  if (fallbackCount) {
    fallbackCount.textContent = `${view.fallbackAvailableCount} available`;
  }
  if (exerciseReminderStatus) {
    exerciseReminderStatus.textContent =
      currentProfileAuthority === "inactive"
        ? INACTIVE_PROFILE_MESSAGE
        : view.reminderMessage;
    delete exerciseReminderStatus.dataset.state;
  }
  if (weeklyGoalStatus) {
    weeklyGoalStatus.hidden = view.weeklyGoalStatus === null;
    weeklyGoalStatus.textContent = view.weeklyGoalStatus ?? "";
  }
  if (logWorkoutNow) {
    logWorkoutNow.textContent = view.workoutRecording
      ? "Resume workout"
      : view.manualWorkoutAction;
    logWorkoutNow.disabled = false;
  }
  if (notificationScheduledTime) {
    notificationScheduledTime.textContent = view.nextDeparture ?? "None this week";
  }
  if (exerciseHistory && exerciseHistoryWeeks) {
    exerciseHistory.hidden = view.history.length === 0;
    if (historyEmptyState) {
      historyEmptyState.hidden = view.history.length > 0;
    }
    exerciseHistoryWeeks.replaceChildren(
      ...view.history.map((week) =>
        historyWeekItem(week, view.workoutHistoryControls),
      ),
    );
  }
  if (routineSettingsAction) {
    routineSettingsAction.textContent = view.routineSettings.action;
  }
  if (routineSettingsGuidance) {
    routineSettingsGuidance.textContent = view.routineSettings.guidance;
  }
  if (routineDepartures) {
    routineDepartures.replaceChildren(
      ...view.routineSettings.primaryDepartures.map((departure) =>
        routineDepartureItem(
          departure,
          view.routineSettings.saveAction,
          view.scheduleChoices,
        ),
      ),
    );
  }
  updateAgendaRowSelection();
  renderWorkspaceDetail(view);
  applyAuthorityState();
}

function scheduleEditorFromEvent(
  event: Event,
  selector: string,
): HTMLElement | null {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-schedule-save]",
  );
  return button?.closest<HTMLElement>(selector) ?? null;
}

function selectedSchedule(
  editor: HTMLElement,
): Readonly<{ day: string; departureTime: string }> | null {
  const day = editor.querySelector<HTMLSelectElement>("[data-schedule-role='day']");
  const departureTime = editor.querySelector<HTMLSelectElement>(
    "[data-schedule-role='time']",
  );
  return day && departureTime
    ? {
        day: day.value,
        departureTime: departureTime.value,
      }
    : null;
}

async function runScheduleSave(
  editor: HTMLElement,
  command: "adjust_current_week_departure" | "change_repeating_primary_departure",
  arguments_: Record<string, unknown>,
): Promise<void> {
  editor.querySelectorAll("button, select").forEach((control) => {
    control.setAttribute("disabled", "");
  });
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      command,
      arguments_,
    );
    renderExerciseDashboard(dashboard);
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The schedule change could not be saved.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    editor.querySelectorAll("button, select").forEach((control) => {
      control.removeAttribute("disabled");
    });
  }
}

function setWorkoutActionsDisabled(disabled: boolean): void {
  const shouldDisable = disabled || currentProfileAuthority === "inactive";
  if (logWorkoutNow) {
    logWorkoutNow.disabled = shouldDisable;
  }
  [workspaceDetailActions, workoutRecordingChoices].forEach((container) => {
    container?.querySelectorAll("button").forEach((button) => {
      button.toggleAttribute("disabled", shouldDisable);
    });
  });
  [primaryDepartures, fallbackDepartures].forEach((container) => {
    container?.querySelectorAll<HTMLButtonElement>("button[data-agenda-slot-id]").forEach(
      (button) => {
        if (button.dataset.agendaUnavailable !== "true") {
          button.toggleAttribute("disabled", shouldDisable);
        }
      },
    );
  });
}

async function runWorkoutAction(
  command:
    | "start_workout_record"
    | "start_unscheduled_workout_record"
    | "choose_workout_activity"
    | "choose_workout_duration"
    | "complete_workout_record",
  arguments_: Record<string, string>,
): Promise<void> {
  setWorkoutActionsDisabled(true);
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      command,
      arguments_,
    );
    if (command === "complete_workout_record") {
      activeWorkoutSlotId = null;
      workspaceDetailOpen = false;
    } else if (dashboard.workoutRecording) {
      activeWorkoutSlotId = dashboard.workoutRecording.slotId;
    }
    renderExerciseDashboard(dashboard);
    setWorkoutActionsDisabled(false);
    if (command === "complete_workout_record") {
      detailTriggerToRestore = null;
      restoreSelectedAgendaFocus();
    }
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The workout record could not be saved.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    setWorkoutActionsDisabled(false);
  }
}

async function runWorkoutHistoryAction(
  item: HTMLElement,
  command: "correct_workout_record" | "confirm_workout_record_deletion",
  arguments_: Record<string, string>,
): Promise<void> {
  item.querySelectorAll("button, select").forEach((control) => {
    control.setAttribute("disabled", "");
  });
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      command,
      arguments_,
    );
    renderExerciseDashboard(dashboard);
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The workout history change could not be saved.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    item.querySelectorAll("button, select").forEach((control) => {
      control.removeAttribute("disabled");
    });
  }
}

function handleWorkoutHistoryAction(event: Event): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  const item = button?.closest<HTMLElement>("[data-record-id]");
  const recordId = item?.dataset.recordId;
  if (!button || !item || !recordId) {
    return;
  }
  if (button.dataset.historyCancel) {
    const deletion = button.closest<HTMLDetailsElement>(".record-deletion");
    if (deletion) {
      deletion.open = false;
    }
    return;
  }
  if (button.dataset.historyDelete) {
    void runWorkoutHistoryAction(item, "confirm_workout_record_deletion", {
      recordId,
    });
    return;
  }
  if (!button.dataset.historySave) {
    return;
  }
  const activity = item.querySelector<HTMLSelectElement>(
    "[data-history-role='activity']",
  );
  const duration = item.querySelector<HTMLSelectElement>(
    "[data-history-role='duration']",
  );
  const effort = item.querySelector<HTMLSelectElement>(
    "[data-history-role='effort']",
  );
  if (!activity || !duration || !effort) {
    return;
  }
  void runWorkoutHistoryAction(item, "correct_workout_record", {
    recordId,
    activity: activity.value,
    duration: duration.value,
    effort: effort.value,
  });
}

async function refreshExerciseDashboard(): Promise<void> {
  try {
    const dashboard =
      await window.__TAURI__.core.invoke<ExerciseDashboardView>("exercise_dashboard");
    renderExerciseDashboard(dashboard);
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The exercise dashboard could not be loaded.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
  }
}

async function handleCurrentWeekScheduleSave(event: Event): Promise<void> {
  const editor = scheduleEditorFromEvent(event, ".schedule-editor[data-slot-id]");
  const schedule = editor ? selectedSchedule(editor) : null;
  if (!editor?.dataset.slotId || !schedule) {
    return;
  }
  await runScheduleSave(editor, "adjust_current_week_departure", {
    slotId: editor.dataset.slotId,
    ...schedule,
  });
}

async function handleRoutineScheduleSave(event: Event): Promise<void> {
  const editor = scheduleEditorFromEvent(event, "[data-routine-order]");
  const schedule = editor ? selectedSchedule(editor) : null;
  if (!editor?.dataset.routineOrder || !schedule) {
    return;
  }
  await runScheduleSave(editor, "change_repeating_primary_departure", {
    order: Number(editor.dataset.routineOrder),
    ...schedule,
  });
}

function renderProfile(profile: ProfileView): void {
  currentProfileAuthority = profile.authority;
  if (profileLabel) {
    profileLabel.value = profile.profileLabel;
  }
  if (profileLabelDisplay) {
    profileLabelDisplay.textContent = profile.profileLabel;
  }
  if (schemaVersion) {
    schemaVersion.textContent = String(profile.schemaVersion);
  }
  if (profileAuthority) {
    profileAuthority.textContent = profile.authority === "active" ? "Active" : "Inactive";
  }
  if (profileAuthorityMessage) {
    profileAuthorityMessage.textContent =
      profile.authority === "active"
        ? profile.origin === "completed_baseline"
          ? "This device is authoritative. Completed Mac exercise history was adopted automatically."
          : "This device is authoritative for this profile."
        : INACTIVE_PROFILE_MESSAGE;
  }
  renderWorkspaceDetail();
  applyAuthorityState();
}

function applyAuthorityState(): void {
  const inactive = currentProfileAuthority === "inactive";
  if (inactiveProfileNotice) {
    inactiveProfileNotice.textContent = INACTIVE_PROFILE_MESSAGE;
  }
  inactiveProfileNotice?.toggleAttribute("hidden", !inactive);
  exerciseDashboard?.setAttribute("aria-disabled", String(inactive));
  exerciseDashboard?.querySelectorAll("button, select").forEach((control) => {
    control.toggleAttribute("disabled", inactive);
  });
  workspaceDetail?.setAttribute("aria-disabled", String(inactive));
  workspaceDetail?.querySelectorAll("button, select").forEach((control) => {
    control.toggleAttribute("disabled", inactive);
  });
  if (profileLabel) {
    profileLabel.disabled = inactive;
  }
  if (saveProfileLabelButton) {
    saveProfileLabelButton.disabled = inactive;
  }
  if (prepareProfileMoveButton) {
    prepareProfileMoveButton.disabled = inactive;
  }
  if (profileReactivation) {
    profileReactivation.hidden = !inactive;
  }
  if (!inactive && profileReactivationConfirmation) {
    profileReactivationConfirmation.hidden = true;
  }
}

function showProfileStatus(message: string, state: "ready" | "error" = "ready"): void {
  if (profileStatus) {
    profileStatus.textContent = message;
    profileStatus.dataset.state = state;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return typeof error === "string" ? error : fallback;
}

function profileErrorMessage(error: unknown): string {
  return errorMessage(error, "The profile operation could not be completed.");
}

function notificationErrorMessage(error: unknown): string {
  return errorMessage(error, "The notification operation could not be completed.");
}

function permissionLabel(permission: NotificationPermission): string {
  switch (permission) {
    case "granted":
      return "Granted";
    case "denied":
      return "Denied in macOS settings";
    case "prompt":
      return "Not requested";
  }
}

function renderNotificationCapability(view: NotificationCapabilityView): void {
  if (notificationPermission) {
    notificationPermission.textContent = permissionLabel(view.permission);
  }
  if (requestNotificationPermissionButton) {
    requestNotificationPermissionButton.disabled = false;
    requestNotificationPermissionButton.textContent =
      view.permission === "granted" ? "Check notification access" : "Allow notifications";
  }
  if (scheduleCapabilityNotificationButton) {
    scheduleCapabilityNotificationButton.disabled = view.permission !== "granted";
  }
  if (notificationStatus) {
    notificationStatus.textContent = view.message;
    notificationStatus.dataset.state = "ready";
  }
}

function showNotificationError(error: unknown): void {
  if (notificationStatus) {
    notificationStatus.textContent = notificationErrorMessage(error);
    notificationStatus.dataset.state = "error";
  }
}

async function refreshNotificationCapability(): Promise<void> {
  try {
    const notification =
      await window.__TAURI__.core.invoke<NotificationCapabilityView>("notification_state");
    renderNotificationCapability(notification);
    if (notification.permission === "granted") {
      await refreshExerciseDashboard();
    }
  } catch (error) {
    showNotificationError(error);
  }
}

async function runNotificationAction(
  command: "request_notification_permission" | "schedule_capability_notification",
): Promise<void> {
  requestNotificationPermissionButton?.setAttribute("disabled", "");
  scheduleCapabilityNotificationButton?.setAttribute("disabled", "");
  try {
    const view = await window.__TAURI__.core.invoke<NotificationCapabilityView>(command);
    renderNotificationCapability(view);
    if (command === "request_notification_permission") {
      window.setTimeout(() => {
        void refreshNotificationCapability();
      }, 1_500);
    }
  } catch (error) {
    showNotificationError(error);
  }
}

function setProfileFileActionsDisabled(disabled: boolean): void {
  [
    backupProfileButton,
    selectProfileRestoreButton,
    confirmProfileRestoreButton,
    cancelProfileRestoreButton,
    confirmProfileMoveButton,
    selectProfileMoveImportButton,
    confirmProfileMoveImportButton,
    cancelProfileMoveImportButton,
    confirmProfileReactivationButton,
  ].forEach((button) => button?.toggleAttribute("disabled", disabled));
}

function renderProfileRestoreSelection(selection: ProfileRestoreSelection): void {
  if (profileRestoreConfirmation) {
    profileRestoreConfirmation.hidden = !selection.confirmationRequired;
  }
  const preview = selection.preview;
  if (profileRestorePreview) {
    profileRestorePreview.hidden = !selection.confirmationRequired || !preview;
  }
  if (preview) {
    const currentWeek = preview.exercise.currentWeek;
    if (profileRestorePreviewProfile) {
      profileRestorePreviewProfile.textContent = preview.profile.profileLabel;
    }
    if (profileRestorePreviewAuthority) {
      profileRestorePreviewAuthority.textContent =
        preview.profile.authority === "active"
          ? "Active on this device"
          : "Inactive on this device";
    }
    if (profileRestorePreviewWeek) {
      profileRestorePreviewWeek.textContent = currentWeek
        ? `${currentWeek.weekStart} – ${currentWeek.weekEnd}`
        : "No saved exercise week";
    }
    if (profileRestorePreviewProgress) {
      profileRestorePreviewProgress.textContent = currentWeek
        ? `${currentWeek.completedCount} of ${currentWeek.weeklyGoal} completed`
        : "No saved exercise week";
    }
    if (profileRestorePreviewHistory) {
      profileRestorePreviewHistory.textContent = `${preview.exercise.historicalWeekCount} saved historical week${
        preview.exercise.historicalWeekCount === 1 ? "" : "s"
      }`;
    }
    if (profileRestorePreviewReminders) {
      profileRestorePreviewReminders.textContent = `${preview.exercise.desiredReminderCount} reminder${
        preview.exercise.desiredReminderCount === 1 ? "" : "s"
      } will be rebuilt`;
    }
  }
  showProfileStatus(selection.message);
}

async function runProfileFileAction<T>(
  command: string,
  handleResult: (result: T) => void | Promise<void>,
  handleError?: () => void,
): Promise<void> {
  setProfileFileActionsDisabled(true);
  try {
    const result = await window.__TAURI__.core.invoke<T>(command);
    await handleResult(result);
  } catch (error) {
    handleError?.();
    showProfileStatus(profileErrorMessage(error), "error");
    try {
      const profile = await window.__TAURI__.core.invoke<ProfileView>("profile_state");
      renderProfile(profile);
      await refreshExerciseDashboard();
    } catch {
      // Keep the original operation error visible when recovery state cannot be read.
    }
  } finally {
    setProfileFileActionsDisabled(false);
    applyAuthorityState();
  }
}

function backupProfile(): Promise<void> {
  return runProfileFileAction<ProfileBackupAction>("backup_profile", (result) => {
    showProfileStatus(result.message);
  });
}

function selectProfileRestore(): Promise<void> {
  return runProfileFileAction<ProfileRestoreSelection>(
    "select_profile_restore",
    renderProfileRestoreSelection,
    () => {
      if (profileRestoreConfirmation) {
        profileRestoreConfirmation.hidden = true;
      }
    },
  );
}

function cancelProfileRestore(): Promise<void> {
  return runProfileFileAction<ProfileRestoreSelection>(
    "cancel_profile_restore",
    renderProfileRestoreSelection,
  );
}

function confirmProfileRestore(): Promise<void> {
  return runProfileFileAction<ProfileRestoreAction>(
    "confirm_profile_restore",
    async (restored) => {
    renderProfile(restored.profile);
    renderExerciseDashboard(restored.dashboard);
    if (profileRestoreConfirmation) {
      profileRestoreConfirmation.hidden = true;
    }
    showProfileStatus(restored.message);
    await refreshNotificationCapability();
    },
  );
}

function completeProfileMoveAction(action: ProfileMoveAction): Promise<void> {
  renderProfile(action.profile);
  renderExerciseDashboard(action.dashboard);
  if (profileMoveExportConfirmation) {
    profileMoveExportConfirmation.hidden = true;
  }
  if (profileMoveImportConfirmation) {
    profileMoveImportConfirmation.hidden = true;
  }
  if (profileReactivationConfirmation) {
    profileReactivationConfirmation.hidden = true;
  }
  showProfileStatus(
    action.reminderTransitionPending
      ? `${action.message} Reminder setup will retry automatically.`
      : action.message,
  );
  return refreshNotificationCapability();
}

function moveProfile(): Promise<void> {
  return runProfileFileAction<ProfileMoveAction>(
    "move_profile",
    completeProfileMoveAction,
  );
}

function renderProfileMoveSelection(selection: ProfileMoveSelection): void {
  if (profileMoveImportConfirmation) {
    profileMoveImportConfirmation.hidden = !selection.confirmationRequired;
  }
  showProfileStatus(selection.message);
}

function selectProfileMoveImport(): Promise<void> {
  return runProfileFileAction<ProfileMoveSelection>(
    "select_profile_move_import",
    renderProfileMoveSelection,
    () => {
      if (profileMoveImportConfirmation) {
        profileMoveImportConfirmation.hidden = true;
      }
    },
  );
}

function cancelProfileMoveImport(): Promise<void> {
  return runProfileFileAction<ProfileMoveSelection>(
    "cancel_profile_move_import",
    renderProfileMoveSelection,
  );
}

function confirmProfileMoveImport(): Promise<void> {
  return runProfileFileAction<ProfileMoveAction>(
    "confirm_profile_move_import",
    completeProfileMoveAction,
  );
}

function reactivateProfile(): Promise<void> {
  return runProfileFileAction<ProfileMoveAction>(
    "reactivate_profile",
    completeProfileMoveAction,
  );
}

function baselineMigrationMessage(migration: BaselineMigrationView): string {
  if (migration.status === "completed") {
    return "Completed exercise history migrated into Personal Dashboard. The original baseline file was preserved.";
  }
  if (migration.status === "not_found") {
    return "No completed baseline profile was found; Personal Dashboard will start with a new local profile.";
  }
  if (migration.status === "existing_profile") {
    return "Profile loaded from this device.";
  }
  switch (migration.failure) {
    case "app_state_read":
      return "Personal Dashboard could not read its app-owned profile state. The completed baseline was not changed.";
    case "incomplete_app_state":
      return "Personal Dashboard found incomplete app-owned profile state. The completed baseline was not changed.";
    case "invalid_app_state":
      return "Personal Dashboard found invalid app-owned profile state. The completed baseline was not changed.";
    case "baseline_read":
      return "Personal Dashboard could not read the completed baseline. No profile data was changed.";
    case "invalid_baseline":
      return "The completed baseline is invalid and could not be migrated. No profile data was changed.";
    case "unsupported_baseline":
      return "The completed baseline uses an unsupported schema version. No profile data was changed.";
    case "adoption_failed":
      return "The completed baseline could not be activated in Personal Dashboard. The original baseline was preserved.";
    default:
      return "Baseline migration failed. No profile data was changed.";
  }
}

async function connectToApplication(): Promise<void> {
  if (!runtimeStatus) {
    return;
  }

  try {
    const identity = await window.__TAURI__.core.invoke<ApplicationIdentity>(
      "application_identity",
    );
    runtimeStatus.textContent = identity.boundaryMessage;
    runtimeStatus.dataset.state = "ready";
    document.title = identity.productName;
    document.querySelectorAll<HTMLElement>("[data-product-name]").forEach((element) => {
      element.textContent = identity.productName;
    });
    document.querySelectorAll<HTMLElement>("[data-feature-area]").forEach((element) => {
      element.textContent = identity.featureArea;
    });
  } catch {
    runtimeStatus.textContent = "The local application boundary is unavailable.";
    runtimeStatus.dataset.state = "error";
    return;
  }

  let migration: BaselineMigrationView;
  try {
    migration = await window.__TAURI__.core.invoke<BaselineMigrationView>(
      "baseline_migration_state",
    );
  } catch {
    showProfileStatus("Baseline migration status is unavailable.", "error");
    return;
  }
  if (migration.blocksProfile) {
    showProfileStatus(baselineMigrationMessage(migration), "error");
    document.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>(
      "button, input, select",
    ).forEach((control) => {
      control.disabled = true;
    });
    return;
  }

  try {
    const profile = await window.__TAURI__.core.invoke<ProfileView>("profile_state");
    renderProfile(profile);
    await refreshExerciseDashboard();
    showProfileStatus(
      migration.status === "completed"
        ? baselineMigrationMessage(migration)
        : "Profile loaded from this device.",
    );
  } catch (error) {
    showProfileStatus(profileErrorMessage(error), "error");
  }

  await refreshNotificationCapability();
}

workspaceDestinationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const destination = button.dataset.workspaceDestination;
    if (
      destination === "this-week" ||
      destination === "history" ||
      destination === "settings"
    ) {
      showWorkspaceDestination(destination);
    }
  });
});

showWorkspaceDestination("this-week");

profileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!profileLabel) {
    return;
  }
  void (async () => {
    try {
      const profile = await window.__TAURI__.core.invoke<ProfileView>(
        "update_profile_label",
        { profileLabel: profileLabel.value },
      );
      renderProfile(profile);
      showProfileStatus("Profile label saved on this device.");
    } catch (error) {
      showProfileStatus(profileErrorMessage(error), "error");
    }
  })();
});

backupProfileButton?.addEventListener("click", () => {
  void backupProfile();
});

selectProfileRestoreButton?.addEventListener("click", () => {
  void selectProfileRestore();
});

confirmProfileRestoreButton?.addEventListener("click", () => {
  void confirmProfileRestore();
});

cancelProfileRestoreButton?.addEventListener("click", () => {
  void cancelProfileRestore();
});

prepareProfileMoveButton?.addEventListener("click", () => {
  if (profileMoveExportConfirmation) {
    profileMoveExportConfirmation.hidden = false;
  }
});

cancelProfileMoveButton?.addEventListener("click", () => {
  if (profileMoveExportConfirmation) {
    profileMoveExportConfirmation.hidden = true;
  }
});

confirmProfileMoveButton?.addEventListener("click", () => {
  void moveProfile();
});

selectProfileMoveImportButton?.addEventListener("click", () => {
  void selectProfileMoveImport();
});

confirmProfileMoveImportButton?.addEventListener("click", () => {
  void confirmProfileMoveImport();
});

cancelProfileMoveImportButton?.addEventListener("click", () => {
  void cancelProfileMoveImport();
});

prepareProfileReactivationButton?.addEventListener("click", () => {
  if (profileReactivationConfirmation) {
    profileReactivationConfirmation.hidden = false;
  }
});

cancelProfileReactivationButton?.addEventListener("click", () => {
  if (profileReactivationConfirmation) {
    profileReactivationConfirmation.hidden = true;
  }
});

confirmProfileReactivationButton?.addEventListener("click", () => {
  void reactivateProfile();
});

requestNotificationPermissionButton?.addEventListener("click", () => {
  void runNotificationAction("request_notification_permission");
});

scheduleCapabilityNotificationButton?.addEventListener("click", () => {
  void runNotificationAction("schedule_capability_notification");
});

function handleWorkoutChoice(event: Event): void {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  const slotId = button?.dataset.slotId;
  const choiceName = button?.dataset.choiceName;
  const choice = button?.dataset.choice;
  if (!slotId || !choiceName || !choice) {
    return;
  }
  if (choiceName === "start") {
    void runWorkoutAction("start_workout_record", { slotId });
  } else if (choiceName === "activity") {
    void runWorkoutAction("choose_workout_activity", { slotId, activity: choice });
  } else if (choiceName === "duration") {
    void runWorkoutAction("choose_workout_duration", { slotId, duration: choice });
  } else if (choiceName === "effort") {
    void runWorkoutAction("complete_workout_record", { slotId, effort: choice });
  }
}

function handleAgendaSelection(event: Event): void {
  const trigger = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-agenda-slot-id]",
  );
  if (trigger?.dataset.agendaSlotId) {
    openWorkspaceDetail(trigger.dataset.agendaSlotId, trigger);
  }
}

workspaceDetailActions?.addEventListener("click", handleWorkoutChoice);
workoutRecordingChoices?.addEventListener("click", handleWorkoutChoice);
workoutRecords?.addEventListener("click", handleWorkoutHistoryAction);
exerciseHistoryWeeks?.addEventListener("click", handleWorkoutHistoryAction);
workspaceDetailClose?.addEventListener("click", () => {
  closeWorkspaceDetail();
});
workspaceSheetBackdrop?.addEventListener("click", () => {
  closeWorkspaceDetail();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && workspaceDetailOpen) {
    event.preventDefault();
    closeWorkspaceDetail();
  }
});
logWorkoutNow?.addEventListener("click", () => {
  const existingRecording = currentExerciseView?.workoutRecording;
  if (existingRecording) {
    activeWorkoutSlotId = existingRecording.slotId;
    selectedDepartureSlotId = currentExerciseView
      ? [...currentExerciseView.primaryDepartures, ...currentExerciseView.fallbackDepartures]
          .some((departure) => departure.id === existingRecording.slotId)
        ? existingRecording.slotId
        : null
      : null;
    detailTriggerToRestore = null;
    workspaceDetailOpen = true;
    updateAgendaRowSelection();
    renderWorkspaceDetail();
    window.requestAnimationFrame(() => workspaceDetailClose?.focus());
    return;
  }
  activeWorkoutSlotId = "unscheduled";
  selectedDepartureSlotId = null;
  detailTriggerToRestore = null;
  workspaceDetailOpen = true;
  renderWorkspaceDetail();
  window.requestAnimationFrame(() => workspaceDetailClose?.focus());
  void runWorkoutAction("start_unscheduled_workout_record", {});
});
primaryDepartures?.addEventListener("click", (event) => {
  handleAgendaSelection(event);
  void handleCurrentWeekScheduleSave(event);
});
fallbackDepartures?.addEventListener("click", (event) => {
  handleAgendaSelection(event);
});
routineDepartures?.addEventListener("click", (event) => {
  void handleRoutineScheduleSave(event);
});

window.addEventListener("focus", () => {
  void refreshExerciseDashboard();
  void refreshNotificationCapability();
});

void connectToApplication();

export {};
