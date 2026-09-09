import { LatestRequest } from "./latest-request.js";

type ApplicationIdentity = Readonly<{
  productName: string;
  featureArea: string;
  boundaryMessage: string;
}>;

type TodayState = "unconfigured" | "missing" | "ready" | "error";

type MorningBlockView = Readonly<{
  period: string;
  title: string;
  detail: string | null;
}>;

type PlanningEvidenceView = Readonly<{
  label: string;
  items: readonly string[];
}>;

type MorningBaselineView = Readonly<{
  availability: "missing" | "empty" | "saved";
  message: string;
  timeline: readonly MorningBlockView[];
  evidence: readonly PlanningEvidenceView[];
}>;

type DaytimeUpdateView = Readonly<{
  title: string;
  context: readonly string[];
  neutral: readonly string[];
  observedFacts: readonly string[];
  originalIntent: readonly string[];
  changeReasons: readonly string[];
  revisedDirection: readonly string[];
}>;

type ShortRecordCategory = "ordinary" | "exercise";

type ShortRecordChangeView = Readonly<{
  id: string;
  modifiedAt: string;
  oldText: string;
  newText: string;
}>;

type ShortRecordView = Readonly<{
  id: string;
  date: string;
  category: ShortRecordCategory;
  createdAt: string;
  text: string;
  changes: readonly ShortRecordChangeView[];
}>;

type EveningOtherView = Readonly<{
  heading: string;
  lines: readonly string[];
}>;

type DaytimeView = Readonly<{
  updates: readonly DaytimeUpdateView[];
  shortRecords: readonly ShortRecordView[];
}>;

type EveningView = Readonly<{
  account: readonly string[];
  comparison: readonly string[];
  summary: readonly string[];
  questions: readonly string[];
  additions: readonly string[];
  corrections: readonly string[];
  other: readonly EveningOtherView[];
  recordSupplements: readonly ShortRecordView[];
  hasLaterRecordRevision: boolean;
}>;

type TodayView = Readonly<{
  state: TodayState;
  date: string;
  isToday: boolean;
  canRecord: boolean;
  defaultPhase: TodayPhase;
  vaultName: string | null;
  message: string;
  revision: string | null;
  targetBinding: string | null;
  baseline: MorningBaselineView;
  timeline: readonly MorningBlockView[];
  evidence: readonly PlanningEvidenceView[];
  daytime: DaytimeView;
  evening: EveningView;
}>;

type TodayPhase = "morning" | "daytime" | "evening";

type DailyRecordAvailability = "missing" | "unreviewed" | "reviewed" | "error";

type CalendarDayView = Readonly<{
  date: string;
  inMonth: boolean;
  isToday: boolean;
  availability: DailyRecordAvailability;
}>;

type CalendarMonthView = Readonly<{
  year: number;
  month: number;
  configured: boolean;
  days: readonly CalendarDayView[];
}>;

function isTodayPhase(value: string | undefined): value is TodayPhase {
  return value === "morning" || value === "daytime" || value === "evening";
}

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

type ChangeTimeChoice = Readonly<{
  value: string;
  label: string;
  suggested: boolean;
}>;

type ChangeTimeDayChoice = Readonly<{
  value: string;
  label: string;
  date: string;
  suggested: boolean;
  timeChoices: readonly ChangeTimeChoice[];
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
  dayChoices: readonly ChangeTimeDayChoice[];
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
  date: string;
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

type WorkspaceDestination = "today" | "calendar" | "this-week" | "history" | "settings";

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return (
    value === "today" ||
    value === "calendar" ||
    value === "this-week" ||
    value === "history" ||
    value === "settings"
  );
}

const workspaceDestinationDetails: Record<
  WorkspaceDestination,
  Readonly<{
    title: string;
    description: string;
  }>
> = {
  today: {
    title: "Today",
    description: "查看今天 Daily Record 里的大致安排。",
  },
  calendar: {
    title: "Calendar",
    description: "先看整个月，再进入某一天。",
  },
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
  ".destination-button[data-workspace-destination]",
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
const calendarYear = document.querySelector<HTMLSelectElement>("#calendar-year");
const calendarMonth = document.querySelector<HTMLSelectElement>("#calendar-month");
const calendarPreviousMonth = document.querySelector<HTMLButtonElement>(
  "#calendar-previous-month",
);
const calendarNextMonth = document.querySelector<HTMLButtonElement>("#calendar-next-month");
const calendarToday = document.querySelector<HTMLButtonElement>("#calendar-today");
const calendarStatus = document.querySelector<HTMLElement>("#calendar-status");
const calendarMonthHeading = document.querySelector<HTMLElement>("#calendar-month-heading");
const calendarGrid = document.querySelector<HTMLElement>("#calendar-grid");
const calendarSummaryHeading = document.querySelector<HTMLElement>("#calendar-summary-heading");
const calendarSummaryStatus = document.querySelector<HTMLElement>("#calendar-summary-status");
const calendarSummaryCopy = document.querySelector<HTMLElement>("#calendar-summary-copy");
const calendarOpenDay = document.querySelector<HTMLButtonElement>("#calendar-open-day");
const todayDate = document.querySelector<HTMLElement>("#today-date");
const todayHeading = document.querySelector<HTMLElement>("#today-heading");
const todayVault = document.querySelector<HTMLElement>("#today-vault");
const todayStatus = document.querySelector<HTMLElement>("#today-status");
const todayReady = document.querySelector<HTMLElement>("#today-ready");
const todayBaselineStatus = document.querySelector<HTMLElement>("#today-baseline-status");
const todayTimeline = document.querySelector<HTMLOListElement>("#today-baseline-timeline");
const todayBlockCount = document.querySelector<HTMLElement>("#today-block-count");
const todayPlanEmpty = document.querySelector<HTMLElement>("#today-plan-empty");
const todayCurrentTimeline = document.querySelector<HTMLOListElement>("#today-current-timeline");
const todayCurrentCount = document.querySelector<HTMLElement>("#today-current-count");
const todayCurrentEmpty = document.querySelector<HTMLElement>("#today-current-empty");
const todayPhaseButtons = document.querySelectorAll<HTMLButtonElement>("[data-today-phase]");
const todayPhasePanels = document.querySelectorAll<HTMLElement>("[data-today-phase-panel]");
const todayDaytimeCount = document.querySelector<HTMLElement>("#today-daytime-count");
const todayDaytimeKnown = document.querySelector<HTMLElement>("#today-daytime-known");
const todayDaytimeKnownEmpty = document.querySelector<HTMLElement>("#today-daytime-known-empty");
const todayFutureDirections = document.querySelector<HTMLElement>("#today-future-directions");
const todayFutureCount = document.querySelector<HTMLElement>("#today-future-count");
const todayFutureEmpty = document.querySelector<HTMLElement>("#today-future-empty");
const todayDaytimeShortRecords = document.querySelector<HTMLElement>(
  "#today-daytime-short-records",
);
const todayShortRecordCount = document.querySelector<HTMLElement>("#today-short-record-count");
const todayShortRecordsEmpty = document.querySelector<HTMLElement>("#today-short-records-empty");
const todayChangeCount = document.querySelector<HTMLElement>("#today-change-count");
const todayDaytimeUpdates = document.querySelector<HTMLElement>("#today-daytime-updates");
const todayDaytimeEmpty = document.querySelector<HTMLElement>("#today-daytime-empty");
const todayDaytimeForm = document.querySelector<HTMLFormElement>("#today-daytime-form");
const todayDaytimeKind = document.querySelector<HTMLSelectElement>("#today-daytime-kind");
const todayDaytimeContent = document.querySelector<HTMLInputElement>("#today-daytime-content");
const todayNoteFormLabel = document.querySelector<HTMLElement>("#today-note-form-label");
const todayNoteTarget = document.querySelector<HTMLElement>("#today-note-target");
const saveDaytimeUpdateButton = document.querySelector<HTMLButtonElement>("#save-daytime-update");
const cancelNoteCorrectionButton = document.querySelector<HTMLButtonElement>("#cancel-note-correction");
const todayEveningAccountSection = document.querySelector<HTMLElement>(
  "#today-evening-account-section",
);
const todayEveningAccount = document.querySelector<HTMLElement>("#today-evening-account");
const todayEveningComparisonSection = document.querySelector<HTMLElement>(
  "#today-evening-comparison-section",
);
const todayEveningComparison = document.querySelector<HTMLElement>(
  "#today-evening-comparison",
);
const todayEveningSummarySection = document.querySelector<HTMLElement>(
  "#today-evening-summary-section",
);
const todayEveningSummary = document.querySelector<HTMLElement>("#today-evening-summary");
const todayEveningQuestionsSection = document.querySelector<HTMLElement>(
  "#today-evening-questions-section",
);
const todayEveningQuestions = document.querySelector<HTMLUListElement>(
  "#today-evening-questions",
);
const todayEveningEmpty = document.querySelector<HTMLElement>("#today-evening-empty");
const todayEveningForm = document.querySelector<HTMLFormElement>("#today-evening-form");
const todayEveningMode = document.querySelector<HTMLSelectElement>("#today-evening-mode");
const todayEveningContent = document.querySelector<HTMLInputElement>("#today-evening-content");
const todayEveningAdditionsSection = document.querySelector<HTMLElement>(
  "#today-evening-additions-section",
);
const todayEveningAdditions = document.querySelector<HTMLUListElement>(
  "#today-evening-additions",
);
const todayEveningCorrectionsSection = document.querySelector<HTMLElement>(
  "#today-evening-corrections-section",
);
const todayEveningCorrections = document.querySelector<HTMLElement>(
  "#today-evening-corrections",
);
const todayRecordSupplementsSection = document.querySelector<HTMLElement>(
  "#today-record-supplements-section",
);
const todayRecordSupplements = document.querySelector<HTMLElement>("#today-record-supplements");
const todayRecordRevisionWarning = document.querySelector<HTMLElement>(
  "#today-record-revision-warning",
);
const todayEveningOther = document.querySelector<HTMLElement>("#today-evening-other");
const todayEvidenceToggle = document.querySelector<HTMLButtonElement>("#today-evidence-toggle");
const todayEvidenceRegion = document.querySelector<HTMLElement>(".today-evidence-region");
const todayEvidenceHeading = document.querySelector<HTMLElement>("#today-evidence-heading");
const todayEvidenceContent = document.querySelector<HTMLElement>("#today-evidence-content");
const todayEvidenceCount = document.querySelector<HTMLElement>("#today-evidence-count");
const todayEvidenceGroups = document.querySelector<HTMLElement>("#today-evidence-groups");
const todayEvidenceEmpty = document.querySelector<HTMLElement>("#today-evidence-empty");
const todayHandoff = document.querySelector<HTMLElement>("#today-handoff");
const todayHandoffHeading = document.querySelector<HTMLElement>("#today-handoff-heading");
const todayHandoffCopy = document.querySelector<HTMLElement>("#today-handoff-copy");
const selectTodayVaultButton = document.querySelector<HTMLButtonElement>("#select-today-vault");
const refreshTodayButton = document.querySelector<HTMLButtonElement>("#refresh-today");
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
let todayOperationCount = 0;
const todayPresentationRequests = new LatestRequest();
let currentTodayPhase: TodayPhase = "morning";
let currentTodayView: TodayView | null = null;
let selectedTodayDate: string | null = null;
type DatedNoteDraft = {
  content: string;
  category: ShortRecordCategory;
  correctionId: string | null;
};
const datedNoteDrafts = new Map<string, DatedNoteDraft>();
let correctingShortRecordId: string | null = null;
let currentCalendarMonth: CalendarMonthView | null = null;
let selectedCalendarDate: string | null = null;
const calendarMonthRequests = new LatestRequest();
const calendarSelectionRequests = new LatestRequest();
let currentExerciseView: ExerciseDashboardView | null = null;
let applicationFeatureArea = "Exercise tracking";
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

function syncWorkspaceViewportMode(restoreFocus = false): void {
  const mode = workspaceViewportMode();
  const compactDetailOpen =
    mode === "compact" &&
    workspaceDetailOpen &&
    currentWorkspaceDestination === "this-week";
  appShell?.setAttribute("data-detail-open", String(compactDetailOpen));
  workspaceInformation?.removeAttribute("aria-hidden");
  // macOS WebKit collapses the compact sheet's AX subtree when aria-modal is true;
  // retain role=dialog and the visual full-surface boundary so the controls remain exposed.
  workspaceDetail?.setAttribute("aria-modal", "false");
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
  if (restoreFocus && workspaceDetailOpen && currentWorkspaceDestination === "this-week") {
    window.requestAnimationFrame(() => {
      if (
        workspaceDetail &&
        workspaceDetailClose &&
        !workspaceDetail.hidden &&
        !workspaceDetail.contains(document.activeElement)
      ) {
        workspaceDetailClose.focus();
      }
    });
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
    missed: "Missed — no response",
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
    missed: "Missed — no response",
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

function exceptionDaySelect(
  choices: readonly ChangeTimeDayChoice[],
  selectedDay: string | null,
): HTMLLabelElement {
  const label = document.createElement("label");
  const select = document.createElement("select");
  label.append("Weekday / date");
  select.dataset.exceptionScheduleDay = "true";
  select.replaceChildren(
    ...choices.map((choice) => {
      const option = document.createElement("option");
      option.value = choice.value;
      option.textContent = [
        choice.label,
        choice.date,
        ...(choice.suggested ? ["suggested"] : []),
      ].join(" · ");
      option.selected = choice.value === selectedDay;
      return option;
    }),
  );
  label.append(select);
  return label;
}

function exceptionTimeSelect(
  choice: ChangeTimeDayChoice | undefined,
  selectedTime: string | null,
): HTMLLabelElement {
  const label = document.createElement("label");
  const select = document.createElement("select");
  label.append("Time");
  select.dataset.exceptionScheduleTime = "true";
  select.replaceChildren(
    ...(choice?.timeChoices ?? []).map((timeChoice) => {
      const option = document.createElement("option");
      option.value = timeChoice.value;
      option.textContent = timeChoice.suggested
        ? `${timeChoice.label} · suggested`
        : timeChoice.label;
      option.selected = timeChoice.value === selectedTime;
      return option;
    }),
  );
  label.append(select);
  return label;
}

function exceptionScheduleParts(
  value: string | null,
): Readonly<{ day: string; departureTime: string }> | null {
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
  const dayChoices = departure.exception?.dayChoices ?? [];
  const selectedSchedule =
    exceptionSelectedSchedule ?? departure.exception?.selectedSchedule ?? null;
  const selectedParts = exceptionScheduleParts(selectedSchedule);
  const selectedDay =
    dayChoices.find((choice) => choice.value === selectedParts?.day) ?? dayChoices[0];
  const selectedTime =
    selectedDay?.timeChoices.find(
      (choice) => choice.value === selectedParts?.departureTime,
    ) ??
    selectedDay?.timeChoices.find((choice) => choice.suggested) ??
    selectedDay?.timeChoices[0];
  const previewMatches = Boolean(
    preview &&
      preview.slotId === departure.id &&
      selectedDay?.value === preview.day &&
      selectedTime?.label === preview.time,
  );
  editor.className = "exception-editor";
  heading.textContent = "Change this workout time";
  guidance.textContent =
    "Choose a weekday and calendar date, then choose a time available on that day. Saturday and Sunday are suggested; the final time is shown before saving.";
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
  controls.append(
    exceptionDaySelect(dayChoices, selectedDay?.value ?? null),
    exceptionTimeSelect(selectedDay, selectedTime?.value ?? null),
  );
  if (!previewMatches) {
    controls.append(previewButton);
  } else if (preview) {
    const result = document.createElement("p");
    result.className = preview.conflict ? "exception-warning" : "exception-preview";
    result.setAttribute("role", preview.conflict ? "alert" : "status");
    result.setAttribute("aria-live", preview.conflict ? "assertive" : "polite");
    result.textContent = preview.conflict
      ? preview.conflict
      : `No conflict found. Final time: ${preview.day}, ${preview.date} · ${preview.time}.`;
    controls.append(result);
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = preview.conflict
      ? "Confirm change"
      : `Change to ${preview.day}, ${preview.date} · ${preview.time}`;
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

function todayTimelineItem(block: MorningBlockView): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "today-timeline-item";
  const period = document.createElement("span");
  period.className = "today-period";
  period.textContent = block.period;
  const copy = document.createElement("div");
  const title = document.createElement("h4");
  title.textContent = block.title;
  copy.append(title);
  if (block.detail) {
    const detail = document.createElement("p");
    detail.textContent = block.detail;
    copy.append(detail);
  }
  item.append(period, copy);
  return item;
}

function todayEvidenceGroup(group: PlanningEvidenceView): HTMLElement {
  const section = document.createElement("section");
  section.className = "today-evidence-group";
  const heading = document.createElement("h4");
  heading.textContent = group.label;
  const list = document.createElement("ul");
  list.append(
    ...group.items.map((item) => {
      const row = document.createElement("li");
      row.textContent = item;
      return row;
    }),
  );
  section.append(heading, list);
  return section;
}

function daytimeUpdateArticle(update: DaytimeUpdateView): HTMLElement {
  const article = document.createElement("article");
  article.className = "today-daytime-update";
  const heading = document.createElement("h4");
  heading.textContent = update.title;
  article.append(heading);
  if (
    update.context.length > 0 &&
    (update.observedFacts.length > 0 ||
      update.originalIntent.length > 0 ||
      update.changeReasons.length > 0 ||
      update.revisedDirection.length > 0)
  ) {
    const contextLabel = document.createElement("p");
    contextLabel.className = "today-update-label";
    contextLabel.textContent = "背景";
    article.append(contextLabel);
  }
  update.context.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    article.append(paragraph);
  });
  appendDaytimeGroup(article, "记录内容", update.neutral);
  appendDaytimeGroup(article, "观察到的事实", update.observedFacts);
  appendDaytimeGroup(article, "原计划意图", update.originalIntent);
  appendDaytimeGroup(article, "变化原因", update.changeReasons);
  appendDaytimeGroup(article, "接下来这样安排", update.revisedDirection);
  return article;
}

function shortRecordArticle(record: ShortRecordView, editable = true): HTMLElement {
  const article = document.createElement("article");
  article.className = "today-short-record";
  const body = document.createElement("p");
  body.textContent = record.text;
  const meta = document.createElement("small");
  meta.textContent = `${record.category === "exercise" ? "健身" : "日常记录"} · ${record.date}`;
  article.append(body, meta);
  if (editable) {
    const correct = document.createElement("button");
    correct.type = "button";
    correct.className = "today-correct-record secondary-button";
    correct.dataset.correctRecordId = record.id;
    correct.textContent = "更正这条";
    article.append(correct);
  }
  if (record.changes.length > 0) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `修改记录 · ${record.changes.length}`;
    details.append(summary);
    record.changes.forEach((change) => {
      const changeRow = document.createElement("p");
      changeRow.textContent = `${change.modifiedAt} · ${change.oldText} → ${change.newText}`;
      details.append(changeRow);
    });
    article.append(details);
  }
  return article;
}

function daytimeKnownArticle(update: DaytimeUpdateView): HTMLElement {
  const article = document.createElement("article");
  article.className = "today-known-update";
  const heading = document.createElement("h4");
  heading.textContent = update.title;
  const list = document.createElement("ul");
  list.append(
    ...update.observedFacts.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }),
  );
  article.append(heading, list);
  return article;
}

function daytimeDirectionArticle(update: DaytimeUpdateView): HTMLElement {
  const article = document.createElement("article");
  article.className = "today-direction-update";
  const heading = document.createElement("h4");
  heading.textContent = update.title;
  const list = document.createElement("ul");
  list.append(
    ...update.revisedDirection.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }),
  );
  article.append(heading, list);
  return article;
}

function daytimeHasArrangementChange(update: DaytimeUpdateView): boolean {
  return (
    update.originalIntent.length > 0 ||
    update.changeReasons.length > 0 ||
    update.revisedDirection.length > 0
  );
}

function appendDaytimeGroup(
  article: HTMLElement,
  heading: string,
  lines: readonly string[],
): void {
  if (lines.length > 0) {
    const label = document.createElement("p");
    label.className = "today-update-label";
    label.textContent = heading;
    const list = document.createElement("ul");
    list.append(
      ...lines.map((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        return item;
      }),
    );
    article.append(label, list);
  }
}

function renderReadingParagraphs(
  container: HTMLElement | null,
  lines: readonly string[],
): void {
  container?.replaceChildren(
    ...lines.map((line) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = line;
      return paragraph;
    }),
  );
}

function renderReadingList(
  container: HTMLElement | null,
  lines: readonly string[],
): void {
  container?.replaceChildren(
    ...lines.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      return item;
    }),
  );
}

function showTodayPhase(phase: TodayPhase, focus = false): void {
  const phaseChanged = currentTodayPhase !== phase;
  currentTodayPhase = phase;
  if (todayReady) {
    todayReady.dataset.phase = phase;
  }
  const labels: Record<TodayPhase, string> = {
    morning: "早间基准",
    daytime: "当日进展",
    evening: "晚间复盘",
  };
  if (todayHeading) {
    todayHeading.textContent = labels[phase];
  }
  todayPhaseButtons.forEach((button) => {
    const selected = button.dataset.todayPhase === phase;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (focus && selected) {
      button.focus();
    }
  });
  todayPhasePanels.forEach((panel) => {
    panel.hidden = panel.dataset.todayPhasePanel !== phase;
  });
  if (todayEvidenceRegion) {
    todayEvidenceRegion.hidden = phase !== "morning";
  }
  renderTodayEvidence();
  if (phaseChanged && workspaceInformation) {
    workspaceInformation.scrollTop = 0;
  }
}

function eveningViewHasContent(evening: EveningView): boolean {
  return (
    evening.account.length > 0 ||
    evening.comparison.length > 0 ||
    evening.summary.length > 0 ||
    evening.questions.length > 0 ||
    evening.additions.length > 0 ||
    evening.corrections.length > 0 ||
    evening.other.length > 0 ||
    evening.recordSupplements.length > 0
  );
}

function selectedShortRecordCategory(): ShortRecordCategory {
  return todayDaytimeKind?.value === "exercise" ? "exercise" : "ordinary";
}

function stashDatedNoteDraft(): void {
  if (!currentTodayView || !todayDaytimeContent) {
    return;
  }
  const content = todayDaytimeContent.value;
  if (content || correctingShortRecordId) {
    datedNoteDrafts.set(currentTodayView.date, {
      content,
      category: selectedShortRecordCategory(),
      correctionId: correctingShortRecordId,
    });
  } else {
    datedNoteDrafts.delete(currentTodayView.date);
  }
}

function renderDatedNoteComposer(view: TodayView): void {
  const draft = datedNoteDrafts.get(view.date);
  correctingShortRecordId = draft?.correctionId ?? null;
  if (todayDaytimeContent) {
    todayDaytimeContent.value = draft?.content ?? "";
  }
  if (todayDaytimeKind) {
    todayDaytimeKind.value = draft?.category ?? "ordinary";
    todayDaytimeKind.disabled = correctingShortRecordId !== null;
  }
  if (todayNoteFormLabel) {
    todayNoteFormLabel.textContent = correctingShortRecordId ? "更正记录" : "写一句";
  }
  if (saveDaytimeUpdateButton) {
    saveDaytimeUpdateButton.textContent = correctingShortRecordId ? "保存更正" : "保存记录";
  }
  cancelNoteCorrectionButton?.toggleAttribute("hidden", correctingShortRecordId === null);
  if (todayNoteTarget) {
    todayNoteTarget.textContent = view.canRecord
      ? `保存在 ${view.date} 的日记录中；不替你打卡。`
      : "未来日期不能记录已经发生的事实。";
  }
}

function renderToday(view: TodayView): void {
  if (currentTodayView?.date !== view.date) {
    stashDatedNoteDraft();
  }
  currentTodayView = view;
  renderDatedNoteComposer(view);
  if (todayDate) {
    todayDate.textContent = `${view.isToday ? "Today" : "Selected day"} · ${view.date}`;
  }
  if (todayVault) {
    todayVault.textContent = view.vaultName
      ? `Vault: ${view.vaultName}`
      : "尚未选择 Vault。";
  }
  if (todayStatus) {
    todayStatus.textContent = view.message;
    todayStatus.dataset.state = view.state;
  }

  const ready = view.state === "ready";
  const readable = ready || view.state === "missing";
  if (todayReady) {
    todayReady.hidden = !readable;
  }
  if (todayHandoff) {
    todayHandoff.hidden = readable;
  }
  if (todayTimeline) {
    todayTimeline.replaceChildren(...view.baseline.timeline.map(todayTimelineItem));
  }
  if (todayBlockCount) {
    todayBlockCount.textContent = `${view.baseline.timeline.length} 个时间块`;
  }
  if (todayBaselineStatus) {
    todayBaselineStatus.textContent = view.baseline.message;
    todayBaselineStatus.dataset.availability = view.baseline.availability;
  }
  if (todayPlanEmpty) {
    todayPlanEmpty.hidden = view.baseline.timeline.length > 0;
    todayPlanEmpty.textContent =
      view.baseline.availability === "missing"
        ? "这份 Daily Record 未独立保存早间基准；不会用当前安排补造起点。"
        : "早间基准已建立，但初始安排仍为空。";
  }
  if (todayCurrentTimeline) {
    todayCurrentTimeline.replaceChildren(...view.timeline.map(todayTimelineItem));
  }
  if (todayCurrentCount) {
    todayCurrentCount.textContent = `${view.timeline.length} 个时间块`;
  }
  if (todayCurrentEmpty) {
    todayCurrentEmpty.hidden = view.timeline.length > 0;
  }
  if (todayDaytimeForm) {
    todayDaytimeForm.hidden = !view.canRecord;
  }
  if (todayEveningForm) {
    todayEveningForm.hidden = !view.isToday;
  }

  const knownUpdates = view.daytime.updates.filter(
    (update) => update.observedFacts.length > 0,
  );
  const directionUpdates = view.daytime.updates.filter(
    (update) => update.revisedDirection.length > 0,
  );
  const directionCount = directionUpdates.reduce(
    (total, update) => total + update.revisedDirection.length,
    0,
  );
  const arrangementChanges = view.daytime.updates.filter(daytimeHasArrangementChange);
  const shortRecords = view.daytime.shortRecords;
  const legacyShortRecords = view.daytime.updates.filter(
    (update) => !daytimeHasArrangementChange(update),
  );
  if (todayDaytimeCount) {
    todayDaytimeCount.textContent = `${knownUpdates.length} 条已知 · ${directionCount} 条修订方向`;
  }
  if (todayDaytimeKnown) {
    todayDaytimeKnown.replaceChildren(...knownUpdates.map(daytimeKnownArticle));
  }
  if (todayDaytimeKnownEmpty) {
    todayDaytimeKnownEmpty.hidden = knownUpdates.length > 0;
  }
  if (todayFutureDirections) {
    todayFutureDirections.replaceChildren(
      ...directionUpdates.map(daytimeDirectionArticle),
    );
  }
  if (todayFutureCount) {
    todayFutureCount.textContent = `${directionCount} 项`;
  }
  if (todayFutureEmpty) {
    todayFutureEmpty.hidden = directionCount > 0;
  }
  if (todayDaytimeShortRecords) {
    todayDaytimeShortRecords.replaceChildren(
      ...shortRecords.map((record) => shortRecordArticle(record)),
      ...legacyShortRecords.map(daytimeUpdateArticle),
    );
  }
  if (todayShortRecordCount) {
    todayShortRecordCount.textContent = `${shortRecords.length + legacyShortRecords.length} 条`;
  }
  if (todayShortRecordsEmpty) {
    todayShortRecordsEmpty.hidden = shortRecords.length + legacyShortRecords.length > 0;
  }
  if (todayDaytimeUpdates) {
    todayDaytimeUpdates.replaceChildren(
      ...arrangementChanges.map(daytimeUpdateArticle),
    );
  }
  if (todayChangeCount) {
    todayChangeCount.textContent = `${arrangementChanges.length} 条`;
  }
  if (todayDaytimeEmpty) {
    todayDaytimeEmpty.hidden = arrangementChanges.length > 0;
  }

  const eveningHasContent = eveningViewHasContent(view.evening);
  todayEveningAccountSection?.toggleAttribute(
    "hidden",
    view.evening.account.length === 0,
  );
  renderReadingList(todayEveningAccount, view.evening.account);
  todayEveningComparisonSection?.toggleAttribute(
    "hidden",
    view.evening.comparison.length === 0,
  );
  renderReadingParagraphs(todayEveningComparison, view.evening.comparison);
  todayEveningSummarySection?.toggleAttribute(
    "hidden",
    view.evening.summary.length === 0,
  );
  renderReadingParagraphs(todayEveningSummary, view.evening.summary);
  todayEveningQuestionsSection?.toggleAttribute(
    "hidden",
    view.evening.questions.length === 0,
  );
  renderReadingList(todayEveningQuestions, view.evening.questions);
  todayEveningAdditionsSection?.toggleAttribute(
    "hidden",
    view.evening.additions.length === 0,
  );
  renderReadingList(todayEveningAdditions, view.evening.additions);
  todayEveningCorrectionsSection?.toggleAttribute(
    "hidden",
    view.evening.corrections.length === 0,
  );
  renderReadingParagraphs(todayEveningCorrections, view.evening.corrections);
  todayRecordSupplementsSection?.toggleAttribute(
    "hidden",
    view.evening.recordSupplements.length === 0,
  );
  if (todayRecordSupplements) {
    todayRecordSupplements.replaceChildren(
      ...view.evening.recordSupplements.map((record) => shortRecordArticle(record, false)),
    );
  }
  todayRecordRevisionWarning?.toggleAttribute(
    "hidden",
    !view.evening.hasLaterRecordRevision,
  );
  if (todayEveningOther) {
    todayEveningOther.replaceChildren(
      ...view.evening.other.map((group) => {
        const section = document.createElement("section");
        section.className = "today-review-section";
        const heading = document.createElement("h4");
        heading.textContent = group.heading;
        section.append(heading);
        group.lines.forEach((line) => {
          const paragraph = document.createElement("p");
          paragraph.textContent = line;
          section.append(paragraph);
        });
        return section;
      }),
    );
  }
  if (todayEveningEmpty) {
    todayEveningEmpty.hidden = eveningHasContent;
  }

  if (!ready) {
    todayEvidenceToggle?.setAttribute("aria-expanded", "false");
    if (todayEvidenceContent) {
      todayEvidenceContent.hidden = true;
    }
  }

  if (todayHandoffHeading && todayHandoffCopy) {
    if (view.state === "unconfigured") {
      todayHandoffHeading.textContent = "连接 Tortilla Flat vault。";
      todayHandoffCopy.textContent =
        "只需选择一次 vault 文件夹。Personal Dashboard 只保存这个 workspace 设置，并直接读取规范 Daily Record。";
    } else if (view.state === "missing") {
      todayHandoffHeading.textContent = "Today 需要一份 Daily Record。";
      todayHandoffCopy.textContent =
        "请让 Codex 运行早间流程，然后回到这里刷新 Today。";
    } else if (view.state === "error") {
      todayHandoffHeading.textContent = "今天的 Daily Record 需要修复。";
      todayHandoffCopy.textContent = view.message;
    }
  }
  showTodayPhase(currentTodayPhase);
}

function renderTodayEvidence(): void {
  const view = currentTodayView;
  if (!view) {
    return;
  }
  const evidence = view.baseline.evidence;
  const evidenceItemCount = evidence.reduce(
    (total, group) => total + group.items.length,
    0,
  );
  if (todayEvidenceHeading) {
    todayEvidenceHeading.textContent = "初始计划依据";
  }
  if (todayEvidenceCount) {
    todayEvidenceCount.textContent = `${evidenceItemCount} 项`;
  }
  if (todayEvidenceGroups) {
    todayEvidenceGroups.replaceChildren(...evidence.map(todayEvidenceGroup));
  }
  if (todayEvidenceEmpty) {
    todayEvidenceEmpty.hidden = evidenceItemCount > 0;
    todayEvidenceEmpty.textContent = "尚未记录初始计划依据。";
  }
}

function showTodayMutationStatus(message: string, state: "ready" | "error"): void {
  if (todayStatus) {
    todayStatus.textContent = message;
    todayStatus.dataset.state = state;
  }
}

function updateTodayOperationState(delta: number): void {
  todayOperationCount = Math.max(0, todayOperationCount + delta);
  const busy = todayOperationCount > 0;
  selectTodayVaultButton?.toggleAttribute("disabled", busy);
  refreshTodayButton?.toggleAttribute("disabled", busy);
  todayDaytimeForm?.querySelector("button")?.toggleAttribute("disabled", busy);
  todayEveningForm?.querySelector("button")?.toggleAttribute("disabled", busy);
}

function localOperationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function saveDatedNote(): Promise<boolean> {
  const loaded = currentTodayView;
  const content = todayDaytimeContent?.value.trim() ?? "";
  if (
    !loaded?.targetBinding ||
    !loaded.canRecord ||
    !content ||
    todayOperationCount > 0
  ) {
    showTodayMutationStatus("请先打开可记录的日期，并填写一句内容。", "error");
    return false;
  }
  const correction = loaded.daytime.shortRecords.find(
    (record) => record.id === correctingShortRecordId,
  );
  if (correctingShortRecordId && (!correction || !loaded.revision)) {
    showTodayMutationStatus("要更正的记录已经变化。草稿仍保留；请刷新后重试。", "error");
    return false;
  }
  const command = correction ? "correct_dated_note" : "add_dated_note";
  const input = correction
    ? {
        date: loaded.date,
        targetBinding: loaded.targetBinding,
        expectedRevision: loaded.revision,
        entryId: correction.id,
        changeId: localOperationId("change"),
        content,
      }
    : {
        date: loaded.date,
        targetBinding: loaded.targetBinding,
        expectedRevision: loaded.revision,
        entryId: localOperationId("note"),
        category: selectedShortRecordCategory(),
        content,
      };
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>(command, { input });
    datedNoteDrafts.delete(loaded.date);
    correctingShortRecordId = null;
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      renderToday(view);
      showTodayMutationStatus(
        correction ? "更正及修改记录已写入 Daily Record。" : "简短记录已写入 Daily Record。",
        "ready",
      );
    }
    return true;
  } catch (error) {
    datedNoteDrafts.set(loaded.date, {
      content,
      category: correction?.category ?? selectedShortRecordCategory(),
      correctionId: correction?.id ?? null,
    });
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      showTodayMutationStatus(`未保存：${String(error)}`, "error");
    }
    return false;
  } finally {
    updateTodayOperationState(-1);
  }
}

async function saveTodayMutation(
  command: "append_daytime_update" | "update_evening_review",
  input: Record<string, unknown>,
  successMessage: string,
): Promise<boolean> {
  if (!currentTodayView?.revision || todayOperationCount > 0) {
    showTodayMutationStatus("请先刷新有效的 Daily Record，再保存。", "error");
    return false;
  }
  const expectedRevision = currentTodayView.revision;
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>(command, {
      input: { ...input, expectedRevision },
    });
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      renderToday(view);
      showTodayMutationStatus(successMessage, "ready");
    }
    return true;
  } catch (error) {
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      showTodayMutationStatus(`未保存：${String(error)}`, "error");
    }
    return false;
  } finally {
    updateTodayOperationState(-1);
  }
}

async function refreshToday(
  date: string | null = selectedTodayDate,
  supersede = false,
): Promise<void> {
  if (todayOperationCount > 0 && !supersede) {
    return;
  }
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const previousDate = currentTodayView?.date ?? null;
    const view = date
      ? await window.__TAURI__.core.invoke<TodayView>("daily_view", { date })
      : await window.__TAURI__.core.invoke<TodayView>("today_view");
    if (!todayPresentationRequests.isCurrent(presentationRequest)) {
      return;
    }
    if (previousDate !== view.date) {
      currentTodayPhase = view.defaultPhase;
    }
    renderToday(view);
  } catch (error) {
    if (!todayPresentationRequests.isCurrent(presentationRequest)) {
      return;
    }
    if (todayStatus) {
      todayStatus.textContent = `无法读取 Today：${String(error)}`;
      todayStatus.dataset.state = "error";
    }
  } finally {
    updateTodayOperationState(-1);
  }
}

async function selectTodayVault(): Promise<void> {
  if (todayOperationCount > 0) {
    return;
  }
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>("select_today_vault");
    if (!todayPresentationRequests.isCurrent(presentationRequest)) {
      return;
    }
    selectedTodayDate = null;
    currentTodayPhase = view.defaultPhase;
    renderToday(view);
  } catch (error) {
    if (todayPresentationRequests.isCurrent(presentationRequest) && todayStatus) {
      todayStatus.textContent = `无法选择 Vault：${String(error)}`;
      todayStatus.dataset.state = "error";
    }
  } finally {
    updateTodayOperationState(-1);
  }
}

const calendarAvailabilityLabels: Record<
  DailyRecordAvailability,
  Readonly<{ label: string; marker: string }>
> = {
  missing: { label: "无记录", marker: "" },
  unreviewed: { label: "无复盘", marker: "记" },
  reviewed: { label: "有复盘", marker: "复" },
  error: { label: "读取错误", marker: "!" },
};

function calendarDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return `${month} 月 ${day} 日 · ${weekday}`;
}

function populateCalendarYears(centerYear: number): void {
  if (!calendarYear) {
    return;
  }
  calendarYear.replaceChildren(
    ...[centerYear - 1, centerYear, centerYear + 1].map((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = `${year} 年`;
      return option;
    }),
  );
  calendarYear.value = String(centerYear);
}

function renderCalendarGrid(month: CalendarMonthView): void {
  if (calendarMonthHeading) {
    calendarMonthHeading.textContent = `${month.year} 年 ${month.month} 月`;
  }
  if (calendarYear) {
    if (!Array.from(calendarYear.options).some((option) => Number(option.value) === month.year)) {
      populateCalendarYears(month.year);
    }
    calendarYear.value = String(month.year);
  }
  if (calendarMonth) {
    calendarMonth.value = String(month.month);
  }
  if (calendarGrid) {
    calendarGrid.setAttribute("aria-label", `${month.year} 年 ${month.month} 月`);
    calendarGrid.replaceChildren(
      ...month.days.map((day) => {
        const button = document.createElement("button");
        const dayNumber = Number(day.date.slice(8));
        const status = calendarAvailabilityLabels[day.availability];
        const selected = day.date === selectedCalendarDate;
        button.type = "button";
        button.className = "calendar-day";
        button.dataset.calendarDate = day.date;
        button.dataset.availability = day.availability;
        button.toggleAttribute("data-outside-month", !day.inMonth);
        button.toggleAttribute("data-selected", selected);
        button.setAttribute(
          "aria-label",
          `${calendarDateLabel(day.date)} · ${day.isToday ? "今天 · " : ""}${status.label}`,
        );
        button.setAttribute("aria-pressed", String(selected));
        const top = document.createElement("span");
        top.className = "calendar-day-top";
        const number = document.createElement("strong");
        number.textContent = String(dayNumber);
        const todayLabel = document.createElement("small");
        todayLabel.textContent = day.isToday ? "今天" : "";
        top.append(number, todayLabel);
        const marker = document.createElement("span");
        marker.className = "calendar-day-marker";
        marker.dataset.availability = day.availability;
        marker.textContent = status.marker;
        marker.setAttribute("aria-hidden", "true");
        button.append(top, marker);
        return button;
      }),
    );
  }
}

function renderCalendarSummary(view: TodayView): void {
  if (calendarSummaryHeading) {
    calendarSummaryHeading.textContent = calendarDateLabel(view.date);
  }
  const availability: DailyRecordAvailability =
    view.state === "error"
      ? "error"
      : view.state === "missing" || view.state === "unconfigured"
        ? "missing"
        : eveningViewHasContent(view.evening)
          ? "reviewed"
          : "unreviewed";
  if (calendarSummaryStatus) {
    calendarSummaryStatus.textContent = calendarAvailabilityLabels[availability].label;
    calendarSummaryStatus.dataset.availability = availability;
  }
  if (calendarOpenDay) {
    calendarOpenDay.disabled = view.state === "unconfigured";
  }
  if (!calendarSummaryCopy) {
    return;
  }
  const heading = document.createElement("strong");
  const copy = document.createElement("p");
  const detail = document.createElement("small");
  if (view.state === "ready" && availability === "reviewed") {
    heading.textContent = "晚间复盘";
    copy.textContent =
      view.evening.account[0] ??
      view.evening.summary[0] ??
      view.evening.comparison[0] ??
      "这一天有晚间复盘。";
    detail.textContent = `${view.daytime.updates.length} 条日间记录 · 默认打开晚间复盘`;
  } else if (view.state === "ready") {
    heading.textContent = "当日状态";
    copy.textContent = "这一天有 Daily Record，但没有晚间复盘。";
    detail.textContent = `${view.daytime.updates.length} 条日间记录 · 默认打开当日进展`;
  } else if (view.state === "error") {
    heading.textContent = "读取错误";
    copy.textContent = view.message;
    detail.textContent = "这一天的异常不会阻断其他日期。";
  } else if (view.state === "unconfigured") {
    heading.textContent = "尚未选择 Vault";
    copy.textContent = "请先到 Today 选择 Tortilla Flat vault。";
    detail.textContent = "Calendar 浏览不会创建文件。";
  } else {
    heading.textContent = "空白日期";
    copy.textContent = "没有 Daily Record；保持空白，不制造补记义务。";
    detail.textContent = "未记录不解释成未完成。";
  }
  calendarSummaryCopy.replaceChildren(heading, copy, detail);
}

async function selectCalendarDate(date: string): Promise<void> {
  const selectionRequest = calendarSelectionRequests.begin();
  selectedCalendarDate = date;
  const [year, month] = date.split("-").map(Number);
  if (
    !currentCalendarMonth ||
    currentCalendarMonth.year !== year ||
    currentCalendarMonth.month !== month
  ) {
    const monthView = await refreshCalendarMonth(year, month);
    if (!monthView || !calendarSelectionRequests.isCurrent(selectionRequest)) {
      return;
    }
  }
  if (currentCalendarMonth) {
    renderCalendarGrid(currentCalendarMonth);
  }
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>("daily_view", { date });
    if (
      !calendarSelectionRequests.isCurrent(selectionRequest) ||
      selectedCalendarDate !== date
    ) {
      return;
    }
    renderCalendarSummary(view);
    if (calendarStatus) {
      calendarStatus.textContent = `已选择 ${calendarDateLabel(date)}。`;
      calendarStatus.dataset.state = view.state;
    }
  } catch (error) {
    if (
      !calendarSelectionRequests.isCurrent(selectionRequest) ||
      selectedCalendarDate !== date
    ) {
      return;
    }
    if (calendarSummaryHeading) {
      calendarSummaryHeading.textContent = calendarDateLabel(date);
    }
    if (calendarSummaryStatus) {
      calendarSummaryStatus.textContent = "读取错误";
      calendarSummaryStatus.dataset.availability = "error";
    }
    if (calendarSummaryCopy) {
      const heading = document.createElement("strong");
      heading.textContent = "读取错误";
      const copy = document.createElement("p");
      copy.textContent = String(error);
      calendarSummaryCopy.replaceChildren(heading, copy);
    }
    if (calendarStatus) {
      calendarStatus.textContent = `无法读取 ${date}；其他日期仍可选择。`;
      calendarStatus.dataset.state = "error";
    }
  }
}

async function refreshCalendarMonth(
  year: number,
  month: number,
): Promise<CalendarMonthView | null> {
  const monthRequest = calendarMonthRequests.begin();
  try {
    const view = await window.__TAURI__.core.invoke<CalendarMonthView>("calendar_month", {
      year,
      month,
    });
    if (!calendarMonthRequests.isCurrent(monthRequest)) {
      return null;
    }
    currentCalendarMonth = view;
    renderCalendarGrid(view);
    if (calendarStatus) {
      calendarStatus.textContent = view.configured
        ? "选择日期可预览摘要；Calendar 浏览不会修改 Daily Record。"
        : "尚未选择 Vault；请先到 Today 连接 Tortilla Flat vault。";
      calendarStatus.dataset.state = view.configured ? "ready" : "unconfigured";
    }
    return view;
  } catch (error) {
    if (calendarMonthRequests.isCurrent(monthRequest) && calendarStatus) {
      calendarStatus.textContent = `无法读取月份：${String(error)}`;
      calendarStatus.dataset.state = "error";
    }
    return null;
  }
}

async function openCalendar(): Promise<void> {
  if (!selectedCalendarDate) {
    const today = await window.__TAURI__.core.invoke<TodayView>("today_view");
    if (currentWorkspaceDestination !== "calendar" || selectedCalendarDate) {
      return;
    }
    selectedCalendarDate = today.date;
    const [year, month] = today.date.split("-").map(Number);
    populateCalendarYears(year);
    const monthView = await refreshCalendarMonth(year, month);
    if (!monthView || currentWorkspaceDestination !== "calendar") {
      return;
    }
    renderCalendarSummary(today);
    return;
  }
  const date = selectedCalendarDate;
  const [year, month] = date.split("-").map(Number);
  const monthView = await refreshCalendarMonth(year, month);
  if (
    !monthView ||
    currentWorkspaceDestination !== "calendar" ||
    selectedCalendarDate !== date
  ) {
    return;
  }
  await selectCalendarDate(date);
}

async function chooseCalendarMonth(
  year: number,
  month: number,
  date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
): Promise<void> {
  calendarSelectionRequests.invalidate();
  selectedCalendarDate = date;
  const monthView = await refreshCalendarMonth(year, month);
  if (!monthView || selectedCalendarDate !== date) {
    return;
  }
  await selectCalendarDate(date);
}

async function moveCalendarMonth(delta: number): Promise<void> {
  const baseYear = currentCalendarMonth?.year ?? Number(calendarYear?.value);
  const baseMonth = currentCalendarMonth?.month ?? Number(calendarMonth?.value);
  const index = baseYear * 12 + baseMonth - 1 + delta;
  const year = Math.floor(index / 12);
  const month = ((index % 12) + 12) % 12 + 1;
  await chooseCalendarMonth(year, month);
}

async function showCalendarToday(): Promise<void> {
  const selectionRequest = calendarSelectionRequests.begin();
  const today = await window.__TAURI__.core.invoke<TodayView>("today_view");
  if (!calendarSelectionRequests.isCurrent(selectionRequest)) {
    return;
  }
  await chooseCalendarMonth(
    Number(today.date.slice(0, 4)),
    Number(today.date.slice(5, 7)),
    today.date,
  );
  if (selectedCalendarDate === today.date) {
    renderCalendarSummary(today);
  }
}

function renderWorkspaceFeatureArea(destination: WorkspaceDestination): void {
  const featureArea =
    destination === "today"
      ? "Daily Record"
      : destination === "calendar"
        ? "Calendar"
        : applicationFeatureArea;
  document.querySelectorAll<HTMLElement>("[data-feature-area]").forEach((element) => {
    element.textContent = featureArea;
  });
}

function showWorkspaceDestination(
  destination: WorkspaceDestination,
  focus = false,
  dailyDate: string | null = null,
): void {
  const destinationChanged = currentWorkspaceDestination !== destination;
  const leavingToday = currentWorkspaceDestination === "today" && destination !== "today";
  const leavingCalendar = currentWorkspaceDestination === "calendar" && destination !== "calendar";
  if (leavingToday) {
    todayPresentationRequests.invalidate();
  }
  if (leavingCalendar) {
    calendarMonthRequests.invalidate();
    calendarSelectionRequests.invalidate();
  }
  const restoreOpenDetail = destination === "this-week" && workspaceDetailOpen;
  currentWorkspaceDestination = destination;
  appShell?.setAttribute("data-workspace-destination", destination);
  const details = workspaceDestinationDetails[destination];
  workspaceDestinationButtons.forEach((button) => {
    const buttonDestination = button.dataset.workspaceDestination;
    const isCurrent = buttonDestination === destination;
    const buttonLabel =
      buttonDestination === "today"
        ? "Today"
        : buttonDestination === "calendar"
          ? "Calendar"
        : buttonDestination === "this-week"
          ? "This Week"
          : buttonDestination === "history"
            ? "History"
            : "Settings";
    button.toggleAttribute("aria-current", isCurrent);
    if (isCurrent) {
      button.setAttribute("aria-current", "page");
    }
    button.setAttribute("aria-pressed", String(isCurrent));
    button.setAttribute(
      "aria-label",
      isCurrent
        ? `${buttonLabel}, current destination`
        : buttonLabel,
    );
    if (focus && isCurrent) {
      button.focus();
    }
  });
  let activeDestinationPanel: HTMLElement | null = null;
  workspaceDestinationPanels.forEach((panel) => {
    const isActive = panel.dataset.workspacePanel === destination;
    panel.hidden = !isActive;
    if (isActive) {
      activeDestinationPanel = panel;
    }
  });
  if (leavingCalendar) {
    calendarGrid?.replaceChildren();
  }
  if (destinationChanged && activeDestinationPanel && workspaceInformation) {
    workspaceInformation.prepend(activeDestinationPanel);
  }
  if (destinationChanged && workspaceInformation) {
    workspaceInformation.scrollTop = 0;
    window.requestAnimationFrame(() => {
      workspaceInformation.scrollTop = 0;
      activeDestinationPanel?.scrollIntoView({ block: "start" });
    });
  }
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
  renderWorkspaceFeatureArea(destination);
  renderWorkspaceDetail();
  if (destination === "today") {
    selectedTodayDate = dailyDate;
    if (dailyDate !== null) {
      currentTodayView = null;
      if (todayDate) {
        todayDate.textContent = `Selected day · ${dailyDate}`;
      }
      if (todayStatus) {
        todayStatus.textContent = `正在读取 ${dailyDate} 的 Daily Record…`;
        todayStatus.dataset.state = "loading";
      }
    }
    void refreshToday(dailyDate, true);
  }
  if (destination === "calendar") {
    void openCalendar();
  }
  if (restoreOpenDetail) {
    window.requestAnimationFrame(() => workspaceDetailClose?.focus());
  }
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
  const daySelect = workspaceException?.querySelector<HTMLSelectElement>(
    "select[data-exception-schedule-day]",
  );
  const timeSelect = workspaceException?.querySelector<HTMLSelectElement>(
    "select[data-exception-schedule-time]",
  );
  if (!daySelect || !timeSelect || !daySelect.value || !timeSelect.value) {
    return null;
  }
  return {
    day: daySelect.value,
    departureTime: timeSelect.value,
  };
}

async function runExceptionPreview(slotId: string): Promise<void> {
  const schedule = selectedExceptionSchedule(slotId);
  if (!schedule) {
    return;
  }
  exceptionSelectedSchedule = `${schedule.day}|${schedule.departureTime}`;
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
    focusExceptionControl("select[data-exception-schedule-day]");
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
    const selectedDayChoice =
      selected && isPrimaryDeparture(selected) && selected.exception
        ? selected.exception.dayChoices.find((choice) => choice.value === schedule.day)
        : undefined;
    const selectedTimeChoice = selectedDayChoice?.timeChoices.find(
      (choice) => choice.value === schedule.departureTime,
    );
    if (
      !exceptionPreview ||
      exceptionPreview.slotId !== slotId ||
      selectedDayChoice?.value !== exceptionPreview.day ||
      selectedTimeChoice?.label !== exceptionPreview.time
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
  const target = event.target as HTMLElement;
  const daySelect = target.closest<HTMLSelectElement>(
    "select[data-exception-schedule-day]",
  );
  const timeSelect = target.closest<HTMLSelectElement>(
    "select[data-exception-schedule-time]",
  );
  if (!daySelect && !timeSelect) {
    return;
  }
  if (daySelect) {
    const dayChoice = currentExerciseView
      ? selectedDeparture(currentExerciseView)
      : undefined;
    const choices =
      dayChoice && isPrimaryDeparture(dayChoice)
        ? dayChoice.exception?.dayChoices ?? []
        : [];
    const selectedDay = choices.find((choice) => choice.value === daySelect.value);
    const previousTime = exceptionScheduleParts(exceptionSelectedSchedule)?.departureTime;
    const selectedTime =
      selectedDay?.timeChoices.find((choice) => choice.value === previousTime) ??
      selectedDay?.timeChoices.find((choice) => choice.suggested) ??
      selectedDay?.timeChoices[0];
    exceptionSelectedSchedule = selectedDay && selectedTime
      ? `${selectedDay.value}|${selectedTime.value}`
      : null;
  } else if (timeSelect) {
    const selectedDay = workspaceException?.querySelector<HTMLSelectElement>(
      "select[data-exception-schedule-day]",
    );
    exceptionSelectedSchedule = selectedDay?.value && timeSelect.value
      ? `${selectedDay.value}|${timeSelect.value}`
      : null;
  }
  exceptionPreview = null;
  renderWorkspaceDetail();
  focusExceptionControl("select[data-exception-schedule-time]");
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
      workspaceContextStatus.setAttribute(
        "aria-label",
        workspaceContextStatus.textContent,
      );
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
    applicationFeatureArea = identity.featureArea;
    renderWorkspaceFeatureArea(currentWorkspaceDestination);
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
window.addEventListener("resize", () => {
  syncWorkspaceViewportMode(true);
  if (workspaceDetailOpen && currentWorkspaceDestination === "this-week") {
    renderWorkspaceDetail();
  }
});
showWorkspaceDestination("this-week");

selectTodayVaultButton?.addEventListener("click", () => {
  void selectTodayVault();
});

refreshTodayButton?.addEventListener("click", () => {
  void refreshToday();
});

calendarGrid?.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-calendar-date]",
  );
  if (target?.dataset.calendarDate) {
    void selectCalendarDate(target.dataset.calendarDate);
  }
});

calendarGrid?.addEventListener("keydown", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-calendar-date]",
  );
  if (!target || !currentCalendarMonth) {
    return;
  }
  const index = currentCalendarMonth.days.findIndex(
    (day) => day.date === target.dataset.calendarDate,
  );
  const offsets: Partial<Record<string, number>> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -index,
    End: currentCalendarMonth.days.length - 1 - index,
  };
  const offset = offsets[event.key];
  if (offset === undefined) {
    return;
  }
  const next = currentCalendarMonth.days[index + offset];
  if (!next) {
    return;
  }
  event.preventDefault();
  void selectCalendarDate(next.date).then(() => {
    calendarGrid
      ?.querySelector<HTMLButtonElement>(`button[data-calendar-date="${next.date}"]`)
      ?.focus();
  });
});

calendarPreviousMonth?.addEventListener("click", () => {
  void moveCalendarMonth(-1);
});

calendarNextMonth?.addEventListener("click", () => {
  void moveCalendarMonth(1);
});

calendarYear?.addEventListener("change", () => {
  void chooseCalendarMonth(
    Number(calendarYear.value),
    currentCalendarMonth?.month ?? Number(calendarMonth?.value),
  );
});

calendarMonth?.addEventListener("change", () => {
  void chooseCalendarMonth(
    currentCalendarMonth?.year ?? Number(calendarYear?.value),
    Number(calendarMonth.value),
  );
});

calendarToday?.addEventListener("click", () => {
  void showCalendarToday();
});

calendarOpenDay?.addEventListener("click", () => {
  if (selectedCalendarDate) {
    showWorkspaceDestination("today", true, selectedCalendarDate);
  }
});

todayDaytimeContent?.addEventListener("input", stashDatedNoteDraft);
todayDaytimeKind?.addEventListener("change", stashDatedNoteDraft);

todayDaytimeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveDatedNote();
});

todayDaytimeShortRecords?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-correct-record-id]",
  );
  const record = currentTodayView?.daytime.shortRecords.find(
    (candidate) => candidate.id === button?.dataset.correctRecordId,
  );
  if (!record || !currentTodayView) {
    return;
  }
  correctingShortRecordId = record.id;
  datedNoteDrafts.set(currentTodayView.date, {
    content: record.text,
    category: record.category,
    correctionId: record.id,
  });
  renderDatedNoteComposer(currentTodayView);
  todayDaytimeContent?.focus();
});

cancelNoteCorrectionButton?.addEventListener("click", () => {
  if (!currentTodayView) {
    return;
  }
  correctingShortRecordId = null;
  datedNoteDrafts.delete(currentTodayView.date);
  renderDatedNoteComposer(currentTodayView);
  todayDaytimeContent?.focus();
});

todayEveningForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!todayEveningMode || !todayEveningContent) {
    return;
  }
  void (async () => {
    const saved = await saveTodayMutation(
      "update_evening_review",
      { mode: todayEveningMode.value, content: todayEveningContent.value },
      "晚间更新已写入 Daily Record。",
    );
    if (saved) {
      todayEveningContent.value = "";
    }
  })();
});

todayEvidenceToggle?.addEventListener("click", () => {
  const expanded = todayEvidenceToggle.getAttribute("aria-expanded") === "true";
  todayEvidenceToggle.setAttribute("aria-expanded", String(!expanded));
  if (todayEvidenceContent) {
    todayEvidenceContent.hidden = expanded;
  }
});

todayPhaseButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    if (isTodayPhase(button.dataset.todayPhase)) {
      showTodayPhase(button.dataset.todayPhase);
    }
  });
  button.addEventListener("keydown", (event) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % todayPhaseButtons.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + todayPhaseButtons.length) % todayPhaseButtons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = todayPhaseButtons.length - 1;
    }
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const nextPhase = todayPhaseButtons[nextIndex]?.dataset.todayPhase;
    if (isTodayPhase(nextPhase)) {
      showTodayPhase(nextPhase, true);
    }
  });
});

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
  if (currentWorkspaceDestination === "today") {
    void refreshToday();
  }
  void refreshExerciseDashboard();
  void refreshNotificationCapability();
});

void connectToApplication();

export {};
