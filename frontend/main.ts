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

type ScheduleOption = Readonly<{
  value: string;
  day: string;
  time: string;
  label: string;
  suggested: boolean;
}>;

type DepartureExceptionKind =
  | "unrecorded"
  | "changed-original"
  | "changed-destination"
  | "skipped";

type DepartureException = Readonly<{
  kind: DepartureExceptionKind;
  changeAction: string | null;
  skipAction: string | null;
  undoAction: string | null;
  targetDay: string | null;
  targetTime: string | null;
  scheduleOptions: readonly ScheduleOption[];
  selectedSchedule: string | null;
}>;

type PrimaryDeparture = DepartureTiming & Readonly<{
  departureAtEpochMillis: number;
  status: string;
  statusKind: DepartureStatusKind;
  hasWorkoutRecord: boolean;
  recordWorkoutAction: string | null;
  adjustment: ScheduleAdjustment | null;
  exception: DepartureException | null;
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
  adjustedDepartures: readonly PrimaryDeparture[];
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
  adjustedDepartures: readonly PrimaryDeparture[];
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

type DepartureChangePreview = Readonly<{
  slotId: string;
  day: string;
  time: string;
  conflict: string | null;
}>;

const UNSCHEDULED_WORKOUT_SLOT_ID = "unscheduled";

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

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return value === "this-week" || value === "history" || value === "settings";
}

const workspaceDestinationDetails: Record<
  WorkspaceDestination,
  Readonly<{
    title: string;
    description: string;
  }>
> = {
  "this-week": {
    title: "This Week",
    description: "See this week's plan and record what happened.",
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
const workspaceDestinationSelect = document.querySelector<HTMLSelectElement>(
  "#workspace-destination-select",
);
const workspaceTitle = document.querySelector<HTMLElement>("#workspace-title");
const workspaceDescription = document.querySelector<HTMLElement>("#workspace-description");
const workspaceContextStatus = document.querySelector<HTMLElement>(
  "#workspace-context-status",
);
const workspaceInformation = document.querySelector<HTMLElement>(".workspace-information");
const workspaceDetailHeading = document.querySelector<HTMLElement>(
  "#workspace-detail-heading",
);
const workspaceDetailDateTile = document.querySelector<HTMLElement>(
  "#workspace-detail-date-tile",
);
const workspaceDetailDateDay = document.querySelector<HTMLElement>(
  "#workspace-detail-date-day",
);
const workspaceDetailDateLabel = document.querySelector<HTMLElement>(
  "#workspace-detail-date-label",
);
const workspaceDetailTime = document.querySelector<HTMLElement>("#workspace-detail-time");
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
const workspaceException = document.querySelector<HTMLElement>("#workspace-exception");
const historyEmptyState = document.querySelector<HTMLElement>("#history-empty-state");
const exerciseDashboard = document.querySelector<HTMLElement>("#exercise-dashboard");
const inactiveProfileNotice = document.querySelector<HTMLElement>(
  "#inactive-profile-notice",
);
const exerciseWeek = document.querySelector<HTMLElement>("#exercise-week");
const exerciseProgress = document.querySelector<HTMLElement>("#exercise-progress");
const exerciseProgressChip = document.querySelector<HTMLElement>("#exercise-progress-chip");
const exerciseProgressChipValue = document.querySelector<HTMLElement>(
  "#exercise-progress-chip-value",
);
const nextDepartureCard = document.querySelector<HTMLElement>("#next-departure-card");
const nextDepartureLabel = document.querySelector<HTMLElement>("#next-departure-label");
const nextDeparture = document.querySelector<HTMLElement>("#next-departure");
const nextDepartureDate = document.querySelector<HTMLElement>("#next-departure-date");
const primaryDepartures = document.querySelector<HTMLOListElement>("#primary-departures");
const adjustedAgendaSection = document.querySelector<HTMLElement>("#adjusted-agenda");
const adjustedDepartures = document.querySelector<HTMLOListElement>("#adjusted-departures");
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
const currentWeekHistory = document.querySelector<HTMLElement>("#current-week-history");
const currentWeekWorkoutRecords = document.querySelector<HTMLOListElement>(
  "#current-week-workout-records",
);
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
const appShell = document.querySelector<HTMLElement>(".app-shell");
let currentProfileAuthority: ProfileView["authority"] = "active";
let currentWorkspaceDestination: WorkspaceDestination = "this-week";
let currentExerciseView: ExerciseDashboardView | null = null;
let selectedDepartureSlotId: string | null = null;
let activeWorkoutSlotId: string | null = null;
let workspaceDetailOpen = false;
let detailTriggerToRestore: HTMLButtonElement | null = null;
let exceptionEditorSlotId: string | null = null;
let exceptionPreview: DepartureChangePreview | null = null;
let exceptionSelectedSchedule: string | null = null;

type WorkspaceViewportMode = "desktop" | "intermediate" | "compact";

function setAgendaTriggerState(
  trigger: HTMLButtonElement,
  slotId: string,
): void {
  const selected = slotId === selectedDepartureSlotId;
  trigger.setAttribute("aria-pressed", String(selected));
  trigger.setAttribute(
    "aria-expanded",
    String(selected && workspaceDetailOpen),
  );
}

function workspaceViewportMode(): WorkspaceViewportMode {
  if (window.innerWidth <= 680) {
    return "compact";
  }
  if (window.innerWidth <= 900) {
    return "intermediate";
  }
  return "desktop";
}

function syncWorkspaceViewportMode(): void {
  const mode = workspaceViewportMode();
  const compactDetailOpen =
    mode === "compact" &&
    workspaceDetailOpen &&
    currentWorkspaceDestination === "this-week";
  appShell?.setAttribute("data-detail-open", String(compactDetailOpen));
  workspaceInformation?.setAttribute("aria-hidden", String(compactDetailOpen));
  workspaceInformation?.toggleAttribute("inert", compactDetailOpen);
  workspaceDetail?.setAttribute("aria-modal", String(compactDetailOpen));
  if (workspaceDestinationSelect) {
    workspaceDestinationSelect.value = currentWorkspaceDestination;
  }
  if (workspaceDetailClose) {
    const compact = mode === "compact";
    workspaceDetailClose.textContent = compact ? "Back" : "Close";
    workspaceDetailClose.setAttribute(
      "aria-label",
      compact ? "Back to This Week agenda" : "Close workout detail",
    );
  }
}

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

const weekdayOrder = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const monthNumbers: Readonly<Record<string, number>> = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

function weekDateLabel(weekLabel: string | undefined, day: string): string | null {
  if (!weekLabel) {
    return null;
  }
  const match = weekLabel.match(/^[^,]+,\s+([A-Za-z]+)\s+(\d+)\s+–/);
  const month = match ? monthNumbers[match[1]] : undefined;
  const startDay = match ? Number(match[2]) : Number.NaN;
  const dayOffset = weekdayOrder.indexOf(day as (typeof weekdayOrder)[number]);
  if (month === undefined || Number.isNaN(startDay) || dayOffset < 0) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, month, startDay + dayOffset)));
}

function shortWeekday(day: string): string {
  return day.slice(0, 3);
}

function progressFraction(progress: string): string {
  const match = progress.match(/^(\d+)\s+of\s+(\d+)/);
  return match ? `${match[1]}/${match[2]}` : progress;
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

function primaryDepartureItem(
  departure: PrimaryDeparture,
  adjusted = false,
): HTMLLIElement {
  const item = document.createElement("li");
  const trigger = document.createElement("button");
  const identity = document.createElement("span");
  const day = document.createElement("strong");
  const date = document.createElement("small");
  const copy = document.createElement("span");
  const time = document.createElement("strong");
  const label = document.createElement("small");
  const state = document.createElement("span");
  const marker = document.createElement("span");
  const status = document.createElement("span");
  const chevron = document.createElement("span");
  item.className = `agenda-row primary-agenda-row${adjusted ? " adjusted-agenda-row" : ""}`;
  item.dataset.slotId = departure.id;
  trigger.type = "button";
  trigger.className = "agenda-row-trigger";
  trigger.dataset.agendaSlotId = departure.id;
  setAgendaTriggerState(trigger, departure.id);
  trigger.setAttribute("aria-controls", "workspace-detail");
  identity.className = "agenda-row-identity slot-date";
  day.textContent = shortWeekday(departure.day);
  const dateLabel =
    weekDateLabel(currentExerciseView?.weekLabel, departure.day) ?? "This week";
  date.textContent = dateLabel;
  copy.className = "agenda-row-copy slot-copy";
  time.textContent = departure.time;
  const workoutLabel = adjusted ? "Changed workout" : "Primary workout";
  label.textContent = workoutLabel;
  copy.append(time, label);
  identity.append(day, date);
  state.className = `agenda-row-state slot-status status-${departure.statusKind}`;
  marker.className = "agenda-status-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = departureStatusSignal(departure.statusKind);
  const statusLabel = primaryDepartureStatusLabel(departure);
  status.textContent = statusLabel;
  state.append(marker, status);
  chevron.className = "agenda-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";
  trigger.append(identity, copy, state, chevron);
  trigger.setAttribute(
    "aria-label",
    `Select ${departure.day}, ${dateLabel}, ${departure.time}, ${workoutLabel}, ${statusLabel}`,
  );
  item.append(trigger);
  if (departure.hasWorkoutRecord) {
    const evidence = document.createElement("span");
    evidence.className = "workout-evidence";
    evidence.textContent = "✓ Workout recorded";
    item.append(evidence);
  }
  if (departure.exception?.undoAction) {
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "secondary-button agenda-inline-action";
    undo.textContent = departure.exception.undoAction;
    undo.dataset.exceptionAction = "undo";
    undo.dataset.slotId = departure.id;
    item.append(undo);
  }
  return item;
}

function fallbackDepartureItem(departure: FallbackDeparture): HTMLLIElement {
  const item = document.createElement("li");
  const trigger = document.createElement("button");
  const identity = document.createElement("span");
  const day = document.createElement("strong");
  const date = document.createElement("small");
  const copy = document.createElement("span");
  const time = document.createElement("strong");
  const label = document.createElement("small");
  const state = document.createElement("span");
  const marker = document.createElement("span");
  const status = document.createElement("span");
  const chevron = document.createElement("span");
  item.className = `agenda-row fallback-agenda-row availability-${departure.availabilityKind}`;
  item.dataset.slotId = departure.id;
  trigger.type = "button";
  trigger.className = "agenda-row-trigger";
  trigger.dataset.agendaSlotId = departure.id;
  setAgendaTriggerState(trigger, departure.id);
  trigger.setAttribute("aria-controls", "workspace-detail");
  if (
    departure.availabilityKind === "reserved" ||
    departure.availabilityKind === "unavailable"
  ) {
    trigger.disabled = true;
    trigger.dataset.agendaUnavailable = "true";
    trigger.setAttribute("aria-disabled", "true");
  }
  identity.className = "agenda-row-identity slot-date";
  day.textContent = shortWeekday(departure.day);
  const dateLabel =
    weekDateLabel(currentExerciseView?.weekLabel, departure.day) ?? "This week";
  date.textContent = dateLabel;
  copy.className = "agenda-row-copy slot-copy";
  time.textContent = departure.time;
  const workoutLabel = "Available workout time";
  label.textContent = workoutLabel;
  copy.append(time, label);
  identity.append(day, date);
  state.className = "agenda-row-state slot-status";
  marker.className = "agenda-status-marker";
  marker.setAttribute("aria-hidden", "true");
  marker.textContent = fallbackAvailabilitySignal(departure.availabilityKind);
  const statusLabel = fallbackDepartureStatusLabel(departure);
  status.textContent = statusLabel;
  state.append(marker, status);
  chevron.className = "agenda-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "›";
  trigger.append(identity, copy, state, chevron);
  trigger.setAttribute(
    "aria-label",
    `Select ${departure.day}, ${dateLabel}, ${departure.time}, ${workoutLabel}, ${statusLabel}`,
  );
  item.append(trigger);
  if (departure.availabilityKind === "recorded") {
    const evidence = document.createElement("span");
    evidence.className = "workout-evidence";
    evidence.textContent = "✓ Workout recorded";
    item.append(evidence);
  }
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
  return {
    scheduled: "Scheduled",
    unrecorded: departure.recordWorkoutAction
      ? "Unrecorded — ready to record"
      : "Unrecorded",
    "awaiting-response": "Needs review",
    unresolved: "Unresolved — no response",
    leaving: "Ready to record",
    completed: "Completed",
    moved: "Changed this week",
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
  const adjustedHeading = document.createElement("h6");
  const adjusted = document.createElement("ol");
  const fallbackHeading = document.createElement("h6");
  const fallback = document.createElement("ol");
  heading.textContent = week.weekLabel;
  progress.textContent = week.progress;
  primaryHeading.textContent = "Primary departures";
  fallbackHeading.textContent = "Open capacity";
  adjustedHeading.textContent = "Changed this week";
  primary.className = "departure-list";
  adjusted.className = "departure-list";
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
  adjusted.replaceChildren(
    ...week.adjustedDepartures.map((departure) =>
      departureItem(departure, primaryDepartureStatusLabel(departure)),
    ),
  );
  article.append(heading, progress, primaryHeading, primary);
  if (week.adjustedDepartures.length > 0) {
    article.append(adjustedHeading, adjusted);
  }
  article.append(fallbackHeading, fallback);
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
  return [
    ...view.primaryDepartures,
    ...view.adjustedDepartures,
    ...view.fallbackDepartures,
  ].find(
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

function selectedDepartureSourceLabel(departure: SelectedDeparture): string {
  if (!isPrimaryDeparture(departure)) {
    return "Open capacity workout";
  }
  if (departure.exception?.kind === "changed-destination") {
    return "Changed this week";
  }
  if (departure.exception?.kind === "changed-original") {
    return "Original plan";
  }
  return "Primary workout";
}

function selectedDepartureRecordAction(
  departure: SelectedDeparture,
): string | null {
  return departure.recordWorkoutAction;
}

function updateAgendaRowSelection(): void {
  [primaryDepartures, adjustedDepartures, fallbackDepartures].forEach((container) => {
    container?.querySelectorAll<HTMLButtonElement>(
      "button[data-agenda-slot-id]",
    ).forEach((button) => {
      if (button.dataset.agendaSlotId) {
        setAgendaTriggerState(button, button.dataset.agendaSlotId);
      }
    });
  });
}

function closeWorkspaceDetail(restoreFocus = true): void {
  workspaceDetailOpen = false;
  updateAgendaRowSelection();
  renderWorkspaceDetail();
  const trigger = detailTriggerToRestore;
  trigger?.setAttribute("aria-expanded", "false");
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
  const trigger = [primaryDepartures, adjustedDepartures, fallbackDepartures]
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

function focusExceptionControl(selector: string): void {
  window.requestAnimationFrame(() => {
    workspaceException?.querySelector<HTMLElement>(selector)?.focus();
  });
}

function openWorkspaceDetail(
  slotId: string,
  trigger: HTMLButtonElement | null = null,
): void {
  if (exceptionEditorSlotId !== slotId) {
    exceptionEditorSlotId = null;
    exceptionPreview = null;
    exceptionSelectedSchedule = null;
  }
  selectedDepartureSlotId = slotId;
  detailTriggerToRestore = trigger;
  trigger?.setAttribute("aria-expanded", "true");
  workspaceDetailOpen = true;
  updateAgendaRowSelection();
  if (currentExerciseView?.workoutRecording?.slotId === slotId) {
    activeWorkoutSlotId = slotId;
  }
  renderWorkspaceDetail();
  window.requestAnimationFrame(() => workspaceDetailClose?.focus());
}

function exceptionActionButton(
  label: string,
  slotId: string,
  action: "change" | "skip" | "undo",
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.exceptionAction = action;
  button.dataset.slotId = slotId;
  if (action === "skip") {
    button.className = "secondary-button";
  }
  return button;
}

function exceptionScheduleSelect(
  choices: readonly ScheduleOption[],
  selectedSchedule: string | null,
): HTMLLabelElement {
  const label = document.createElement("label");
  const select = document.createElement("select");
  label.append("New time");
  select.dataset.exceptionSchedule = "true";
  select.replaceChildren(
    ...choices.map((choice) => {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = choice.suggested
        ? `${choice.label} · suggested`
        : choice.label;
      option.selected = choice.value === selectedSchedule;
      return option;
    }),
  );
  label.append(select);
  return label;
}

function exceptionEditor(
  departure: PrimaryDeparture,
  preview: DepartureChangePreview | null,
): HTMLDivElement {
  const editor = document.createElement("div");
  const heading = document.createElement("h4");
  const guidance = document.createElement("p");
  const controls = document.createElement("div");
  const previewButton = document.createElement("button");
  const cancelButton = document.createElement("button");
  const choices = departure.exception?.scheduleOptions ?? [];
  const selectedSchedule =
    exceptionSelectedSchedule ?? departure.exception?.selectedSchedule ?? choices[0]?.value ?? null;
  const selectedChoice = choices.find((choice) => choice.value === selectedSchedule);
  const previewMatches = Boolean(
    preview &&
      preview.slotId === departure.id &&
      selectedChoice?.day === preview.day &&
      selectedChoice?.time === preview.time,
  );
  editor.className = "exception-editor";
  heading.textContent = "Change this workout time";
  guidance.textContent =
    "Choose any time that has not passed. Saturday and Sunday are suggested; the final time is shown before saving.";
  controls.className = "exception-controls";
  previewButton.type = "button";
  previewButton.textContent = "Check this time";
  previewButton.dataset.exceptionPreview = "true";
  previewButton.dataset.slotId = departure.id;
  cancelButton.type = "button";
  cancelButton.className = "secondary-button";
  cancelButton.textContent = "Cancel";
  cancelButton.dataset.exceptionCancel = "true";
  cancelButton.dataset.slotId = departure.id;
  controls.append(exceptionScheduleSelect(choices, selectedSchedule));
  if (!previewMatches) {
    controls.append(previewButton);
  } else if (preview) {
    const result = document.createElement("p");
    result.className = preview.conflict ? "exception-warning" : "exception-preview";
    result.setAttribute("role", preview.conflict ? "alert" : "status");
    result.setAttribute("aria-live", preview.conflict ? "assertive" : "polite");
    result.textContent = preview.conflict
      ? preview.conflict
      : `No conflict found. Final time: ${preview.day} · ${preview.time}.`;
    controls.append(result);
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = preview.conflict
      ? "Confirm change"
      : `Change to ${preview.day} · ${preview.time}`;
    save.dataset.exceptionSave = "true";
    save.dataset.slotId = departure.id;
    save.dataset.confirmConflict = String(Boolean(preview.conflict));
    controls.append(save);
  }
  controls.append(cancelButton);
  editor.append(heading, guidance, controls);
  return editor;
}

function renderWorkspaceDetail(
  view: ExerciseDashboardView | null = currentExerciseView,
): void {
  syncWorkspaceViewportMode();
  if (!workspaceDetail || !workspaceSheetBackdrop) {
    return;
  }

  const open = workspaceDetailOpen && currentWorkspaceDestination === "this-week";
  workspaceDetail.hidden = !open;
  workspaceSheetBackdrop.hidden = !open;
  workspaceDetail.setAttribute("aria-hidden", String(!open));
  workspaceDetail.toggleAttribute("inert", !open);
  workspaceSheetBackdrop.setAttribute("aria-hidden", String(!open));
  if (!open) {
    workspaceDetailActions?.replaceChildren();
    workspaceException?.replaceChildren();
    if (workspaceException) {
      workspaceException.hidden = true;
    }
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
  if (workspaceDetailDateTile) {
    workspaceDetailDateTile.hidden = !selected;
  }
  if (workspaceDetailDateDay) {
    workspaceDetailDateDay.textContent = selected ? shortWeekday(selected.day) : "—";
  }
  if (workspaceDetailDateLabel) {
    workspaceDetailDateLabel.textContent = selected
      ? weekDateLabel(view?.weekLabel, selected.day) ?? "This week"
      : "—";
  }
  if (workspaceDetailTime) {
    workspaceDetailTime.textContent = selected
      ? `${selected.time} · ${selectedDepartureSourceLabel(selected)}`
      : "Unscheduled workout";
  }
  if (workspaceDetailCopy) {
    const changedOriginal =
      selected &&
      isPrimaryDeparture(selected) &&
      selected.exception?.kind === "changed-original" &&
      selected.exception.targetDay &&
      selected.exception.targetTime
        ? ` Changed this week to ${selected.exception.targetDay} · ${selected.exception.targetTime}.`
        : "";
    workspaceDetailCopy.textContent = selected
      ? `${selected.day} · ${selected.time} · ${selectedDepartureSourceLabel(selected)}.${changedOriginal} The agenda remains visible while you review this plan.`
      : "Unscheduled workout · record a workout that is not attached to a planned time.";
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
    if (selected && isPrimaryDeparture(selected) && selected.exception) {
      const exception = selected.exception;
      const editing = exceptionEditorSlotId === selected.id;
      if (!editing && exception.changeAction) {
        workspaceDetailActions.append(
          exceptionActionButton(exception.changeAction, selected.id, "change"),
        );
      }
      if (!editing && exception.skipAction) {
        workspaceDetailActions.append(
          exceptionActionButton(exception.skipAction, selected.id, "skip"),
        );
      }
      if (!editing && exception.undoAction) {
        workspaceDetailActions.append(
          exceptionActionButton(exception.undoAction, selected.id, "undo"),
        );
      }
    }
  }
  if (workspaceException) {
    const editing = Boolean(
      selected &&
        isPrimaryDeparture(selected) &&
        selected.exception &&
        exceptionEditorSlotId === selected.id,
    );
    workspaceException.hidden = !editing;
    workspaceException.replaceChildren(
      ...(editing && selected && isPrimaryDeparture(selected) && selected.exception
        ? [exceptionEditor(selected, exceptionPreview)]
        : []),
    );
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
  appShell?.setAttribute("data-workspace-destination", destination);
  if (destination !== "this-week") {
    detailTriggerToRestore?.setAttribute("aria-expanded", "false");
    workspaceDetailOpen = false;
    detailTriggerToRestore = null;
    updateAgendaRowSelection();
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
  if (workspaceDestinationSelect) {
    workspaceDestinationSelect.value = destination;
  }
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
  const adjustedAgenda = chronologicalPrimaryDepartures(view.adjustedDepartures);
  const fallbackAgenda = chronologicalFallbackDepartures(view.fallbackDepartures);
  const nextDepartureView = [
    ...view.primaryDepartures,
    ...view.adjustedDepartures,
    ...view.fallbackDepartures,
  ].find((departure) => departure.id === view.nextDepartureSlotId);
  const nextNeedsRecord = Boolean(
    nextDepartureView &&
      "recordWorkoutAction" in nextDepartureView &&
      nextDepartureView.recordWorkoutAction,
  );
  const allAgendaIds = [...primaryAgenda, ...adjustedAgenda, ...fallbackAgenda].map(
    (departure) => departure.id,
  );
  if (selectedDepartureSlotId && !allAgendaIds.includes(selectedDepartureSlotId)) {
    selectedDepartureSlotId = null;
    workspaceDetailOpen = false;
    detailTriggerToRestore = null;
  }
  if (exerciseWeek) {
    exerciseWeek.textContent = `This Week · ${view.weekLabel}`;
    exerciseWeek.setAttribute("aria-label", `Week of ${view.weekLabel}`);
  }
  if (exerciseProgress) {
    exerciseProgress.textContent = view.progress;
  }
  if (exerciseProgressChipValue) {
    exerciseProgressChipValue.textContent = progressFraction(view.progress);
  }
  if (exerciseProgressChip) {
    const progressMatch = view.progress.match(/^(\d+)\s+of\s+(\d+)/);
    const completed = progressMatch ? Number(progressMatch[1]) : 0;
    const goal = progressMatch ? Number(progressMatch[2]) : 0;
    const ratio = goal > 0 ? `${Math.min(completed / goal, 1) * 100}%` : "0%";
    exerciseProgressChip.style.setProperty("--progress-ratio", ratio);
    exerciseProgressChip.setAttribute(
      "aria-label",
      `Weekly progress: ${view.progress}`,
    );
  }
  if (nextDepartureLabel) {
    nextDepartureLabel.textContent = view.weeklyGoalStatus
      ? "Weekly goal complete"
      : nextNeedsRecord
        ? "Needs workout record"
        : view.nextDeparture
          ? "Next workout"
          : "No scheduled workouts remaining";
  }
  if (nextDeparture) {
    nextDeparture.textContent =
      view.nextDeparture ??
      (view.weeklyGoalStatus
        ? "Log an extra workout"
        : "Log an extra workout");
  }
  if (nextDepartureDate) {
    nextDepartureDate.textContent = nextDepartureView
      ? weekDateLabel(view.weekLabel, nextDepartureView.day) ?? "This week"
      : "Optional workouts welcome";
  }
  if (nextDepartureCard) {
    nextDepartureCard.classList.toggle("is-due", nextNeedsRecord);
    const nextDateLabel = nextDepartureDate?.textContent ?? "";
    nextDepartureCard.setAttribute(
      "aria-label",
      nextDeparture
        ? `Next departure · ${nextDepartureLabel?.textContent ?? "Next workout"}: ${nextDeparture.textContent} · ${nextDateLabel}`
        : "Next departure",
    );
  }
  if (primaryDepartures) {
    primaryDepartures.replaceChildren(
      ...primaryAgenda.map((departure) =>
        primaryDepartureItem(departure),
      ),
    );
  }
  if (adjustedAgendaSection && adjustedDepartures) {
    adjustedAgendaSection.hidden = adjustedAgenda.length === 0;
    adjustedDepartures.replaceChildren(
      ...adjustedAgenda.map((departure) => primaryDepartureItem(departure, true)),
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
      historyEmptyState.hidden =
        view.history.length > 0 || view.workoutRecords.length > 0;
    }
    exerciseHistoryWeeks.replaceChildren(
      ...view.history.map((week) =>
        historyWeekItem(week, view.workoutHistoryControls),
      ),
    );
  }
  if (currentWeekHistory && currentWeekWorkoutRecords) {
    const hasCurrentWeekRecords = view.workoutRecords.length > 0;
    currentWeekHistory.hidden = !hasCurrentWeekRecords;
    currentWeekWorkoutRecords.replaceChildren(
      ...view.workoutRecords.map((record) =>
        workoutRecordItem(record, view.workoutHistoryControls),
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

function selectedExceptionSchedule(
  slotId: string,
): Readonly<{ day: string; departureTime: string }> | null {
  const select = workspaceException?.querySelector<HTMLSelectElement>(
    "select[data-exception-schedule]",
  );
  if (!select) {
    return null;
  }
  const value = select.value;
  if (!value) {
    return null;
  }
  const separator = value.indexOf("|");
  if (separator === -1) {
    return null;
  }
  return {
    day: value.slice(0, separator),
    departureTime: value.slice(separator + 1),
  };
}

async function runExceptionPreview(slotId: string): Promise<void> {
  const schedule = selectedExceptionSchedule(slotId);
  if (!schedule) {
    return;
  }
  const select = workspaceException?.querySelector<HTMLSelectElement>(
    "select[data-exception-schedule]",
  );
  exceptionSelectedSchedule = select?.value ?? exceptionSelectedSchedule;
  workspaceException?.querySelectorAll("button, select").forEach((control) => {
    control.setAttribute("disabled", "");
  });
  try {
    exceptionPreview = await window.__TAURI__.core.invoke<DepartureChangePreview>(
      "preview_current_week_departure_change",
      {
        slotId,
        ...schedule,
      },
    );
    renderWorkspaceDetail();
    focusExceptionControl("button[data-exception-save]");
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The time change could not be previewed.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    workspaceException?.querySelectorAll("button, select").forEach((control) => {
      control.removeAttribute("disabled");
    });
    focusExceptionControl("button[data-exception-preview]");
  }
}

async function runExceptionMutation(
  command:
    | "change_current_week_departure"
    | "skip_current_week_departure"
    | "undo_skip_current_week_departure",
  arguments_: Record<string, unknown>,
  slotId: string,
): Promise<void> {
  setWorkoutActionsDisabled(true);
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      command,
      arguments_,
    );
    exceptionEditorSlotId = null;
    exceptionPreview = null;
    exceptionSelectedSchedule = null;
    workspaceDetailOpen = false;
    detailTriggerToRestore = null;
    selectedDepartureSlotId = slotId;
    renderExerciseDashboard(dashboard);
    if (workspaceContextStatus) {
      workspaceContextStatus.textContent =
        command === "skip_current_week_departure"
          ? "Workout skipped."
          : command === "undo_skip_current_week_departure"
            ? "Skip undone."
            : "Workout time changed.";
    }
    setWorkoutActionsDisabled(false);
    window.requestAnimationFrame(() => restoreSelectedAgendaFocus());
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The workout exception could not be saved.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    setWorkoutActionsDisabled(false);
  }
}

function handleExceptionAction(event: Event): boolean {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (!button) {
    return false;
  }
  const slotId = button.dataset.slotId;
  if (!slotId) {
    return false;
  }
  if (button.dataset.exceptionAction === "change") {
    exceptionEditorSlotId = slotId;
    exceptionPreview = null;
    const departure = currentExerciseView
      ? selectedDeparture(currentExerciseView)
      : undefined;
    exceptionSelectedSchedule =
      departure && isPrimaryDeparture(departure)
        ? departure.exception?.selectedSchedule ?? null
        : null;
    renderWorkspaceDetail();
    focusExceptionControl("select[data-exception-schedule]");
    return true;
  }
  if (button.dataset.exceptionAction === "skip") {
    void runExceptionMutation("skip_current_week_departure", { slotId }, slotId);
    return true;
  }
  if (button.dataset.exceptionAction === "undo") {
    void runExceptionMutation("undo_skip_current_week_departure", { slotId }, slotId);
    return true;
  }
  if (button.dataset.exceptionCancel) {
    exceptionEditorSlotId = null;
    exceptionPreview = null;
    exceptionSelectedSchedule = null;
    renderWorkspaceDetail();
    window.requestAnimationFrame(() => {
      workspaceDetailActions
        ?.querySelector<HTMLButtonElement>('button[data-exception-action="change"]')
        ?.focus();
    });
    return true;
  }
  if (button.dataset.exceptionPreview) {
    void runExceptionPreview(slotId);
    return true;
  }
  if (button.dataset.exceptionSave) {
    const schedule = selectedExceptionSchedule(slotId);
    if (!schedule) {
      return true;
    }
    const selected = currentExerciseView
      ? selectedDeparture(currentExerciseView)
      : undefined;
    const selectedChoice =
      selected && isPrimaryDeparture(selected) && selected.exception
        ? selected.exception.scheduleOptions.find(
            (choice) => choice.day === schedule.day && choice.value.endsWith(`|${schedule.departureTime}`),
          )
        : undefined;
    if (
      !exceptionPreview ||
      exceptionPreview.slotId !== slotId ||
      selectedChoice?.day !== exceptionPreview.day ||
      selectedChoice?.time !== exceptionPreview.time
    ) {
      void runExceptionPreview(slotId);
      return true;
    }
    void runExceptionMutation(
      "change_current_week_departure",
      {
        slotId,
        ...schedule,
        confirmConflict: button.dataset.confirmConflict === "true",
      },
      slotId,
    );
    return true;
  }
  return false;
}

workspaceException?.addEventListener("change", (event) => {
  const select = (event.target as HTMLElement).closest<HTMLSelectElement>(
    "select[data-exception-schedule]",
  );
  if (!select) {
    return;
  }
  exceptionSelectedSchedule = select.value;
  exceptionPreview = null;
  renderWorkspaceDetail();
  focusExceptionControl("select[data-exception-schedule]");
});

function setWorkoutActionsDisabled(disabled: boolean): void {
  const shouldDisable = disabled || currentProfileAuthority === "inactive";
  if (logWorkoutNow) {
    logWorkoutNow.disabled = shouldDisable;
  }
  [workspaceDetailActions, workspaceException, workoutRecordingChoices].forEach((container) => {
    container?.querySelectorAll("button").forEach((button) => {
      button.toggleAttribute("disabled", shouldDisable);
    });
  });
  [primaryDepartures, adjustedDepartures, fallbackDepartures].forEach((container) => {
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
    if (command === "complete_workout_record" && workspaceContextStatus) {
      workspaceContextStatus.textContent =
        arguments_.slotId === UNSCHEDULED_WORKOUT_SLOT_ID
          ? "Unscheduled workout recorded."
          : "Workout recorded.";
    }
    setWorkoutActionsDisabled(false);
    if (command !== "complete_workout_record" && dashboard.workoutRecording) {
      window.requestAnimationFrame(() => {
        workoutRecordingChoices?.querySelector<HTMLButtonElement>("button")?.focus();
      });
    }
    if (command === "complete_workout_record") {
      detailTriggerToRestore = null;
      if (arguments_.slotId === UNSCHEDULED_WORKOUT_SLOT_ID) {
        logWorkoutNow?.setAttribute("aria-expanded", "false");
        window.requestAnimationFrame(() => logWorkoutNow?.focus());
      } else {
        restoreSelectedAgendaFocus();
      }
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
    if (isWorkspaceDestination(destination)) {
      showWorkspaceDestination(destination);
    }
  });
});

workspaceDestinationSelect?.addEventListener("change", () => {
  const destination = workspaceDestinationSelect.value;
  if (isWorkspaceDestination(destination)) {
    showWorkspaceDestination(destination);
  }
});

syncWorkspaceViewportMode();
window.addEventListener("resize", syncWorkspaceViewportMode);
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

workspaceDetailActions?.addEventListener("click", (event) => {
  if (!handleExceptionAction(event)) {
    handleWorkoutChoice(event);
  }
});
workspaceException?.addEventListener("click", (event) => {
  handleExceptionAction(event);
});
workoutRecordingChoices?.addEventListener("click", handleWorkoutChoice);
workoutRecords?.addEventListener("click", handleWorkoutHistoryAction);
currentWeekWorkoutRecords?.addEventListener("click", handleWorkoutHistoryAction);
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
      ? [
          ...currentExerciseView.primaryDepartures,
          ...currentExerciseView.adjustedDepartures,
          ...currentExerciseView.fallbackDepartures,
        ]
          .some((departure) => departure.id === existingRecording.slotId)
        ? existingRecording.slotId
        : null
      : null;
    detailTriggerToRestore = selectedDepartureSlotId ? null : logWorkoutNow;
    logWorkoutNow.setAttribute("aria-expanded", "true");
    workspaceDetailOpen = true;
    updateAgendaRowSelection();
    renderWorkspaceDetail();
    window.requestAnimationFrame(() => workspaceDetailClose?.focus());
    return;
  }
  activeWorkoutSlotId = UNSCHEDULED_WORKOUT_SLOT_ID;
  selectedDepartureSlotId = null;
  detailTriggerToRestore = logWorkoutNow;
  logWorkoutNow.setAttribute("aria-expanded", "true");
  workspaceDetailOpen = true;
  updateAgendaRowSelection();
  renderWorkspaceDetail();
  window.requestAnimationFrame(() => workspaceDetailClose?.focus());
  void runWorkoutAction("start_unscheduled_workout_record", {});
});
primaryDepartures?.addEventListener("click", (event) => {
  if (handleExceptionAction(event)) {
    return;
  }
  handleAgendaSelection(event);
  void handleCurrentWeekScheduleSave(event);
});
adjustedDepartures?.addEventListener("click", (event) => {
  if (handleExceptionAction(event)) {
    return;
  }
  handleAgendaSelection(event);
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
