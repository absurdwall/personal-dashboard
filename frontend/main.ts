import {
  DatedNoteTargetChangedError,
  submitDatedNote,
} from "./dated-note-command.js";
import { LatestRequest } from "./latest-request.js";
import {
  PendingWriteBarrier,
  selectVaultAndRefresh,
  type VaultSelectionResult,
} from "./vault-selection.js";
import {
  applyAccentColor,
  applyBackgroundImage,
  resolveBackgroundImagePresentation,
  SerializedLatestMutation,
  type AccentColor,
  type AppearancePreferences,
} from "./appearance.js";
import {
  applyInterfaceLanguage,
  formatInterfaceDate,
  formatInterfaceMonth,
  interfaceCopy,
  localizeApplicationMessage,
  localizeHabitActualTimeLabel,
  localizeHabitCoverageLabel,
  localizeHabitDetail,
  localizeHabitGoalLabel,
  setApplicationMessage,
  setInterfaceCopy,
  setInterfaceError,
  type HabitDetail,
  type InterfaceCopyKey,
  type InterfaceLanguage,
  type InterfaceLanguagePreferences,
} from "./interface-language.js";
import { preserveTodayDayTaskPlanError } from "./day-task-presentation.js";
import {
  calendarTasksForDate,
  isCurrentTaskResponse,
  normalizeTaskSchedule,
  taskOperationScope,
  TaskOperationIdentityStore,
  performTaskUpdateRequest,
  taskListIdFromScope,
  taskListDisplayName,
  taskListMutationConfirmed,
  taskListScopeForId,
  taskScopeCount,
  taskMutationConfirmed,
  taskVisibleInScope,
  todayTaskGroups,
  type TaskListScope,
} from "./task-presentation.js";
import {
  habitCompletionPresentation,
  historicalHabitCorrectionPresentation,
  type HabitCompletionExplanation,
  type HabitLocalCompletionState,
} from "./habit-completion.js";
import { reconcileHabitCompletionWrite } from "./habit-completion-command.js";
import {
  localizedHabitName,
  type HabitLocalizedNames,
} from "./habit-presentation.js";

type ApplicationIdentity = Readonly<{
  productName: string;
  featureArea: string;
  boundaryMessage: string;
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
  needsReview: boolean;
}>;

type ShortRecordView = Readonly<{
  id: string;
  date: string;
  category: ShortRecordCategory;
  createdAt: string;
  text: string;
  changes: readonly ShortRecordChangeView[];
  needsReview: boolean;
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

type DayTaskChangeView = Readonly<{
  id: string;
  kind: "renamed" | "completed" | "reopened" | "deleted";
  changedAt: string;
  previousText: string | null;
  newText: string | null;
}>;

type DayTaskView = Readonly<{
  id: string;
  text: string;
  source: Readonly<{ kind: "manual" | "daily-flow"; reference: string | null }>;
  createdAt: string;
  modifiedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
  changes: readonly DayTaskChangeView[];
}>;

type DayTaskListView = Readonly<{
  state: "unconfigured" | "empty" | "ready" | "error";
  message: string;
  planError: string | null;
  revision: string | null;
  targetBinding: string | null;
  tasks: readonly DayTaskView[];
}>;

type TaskChangeView = Readonly<{
  id: string;
  kind:
    | "renamed"
    | "content-edited"
    | "rescheduled"
    | "list-moved"
    | "edited"
    | "completed"
    | "reopened"
    | "abandoned"
    | "restored"
    | "deleted"
    | "undeleted"
    | "completion-corrected"
    | "noop";
  changedAt: string;
  source: "user" | "daily-flow";
  previousName: string | null;
  newName: string | null;
  previousContent: string | null;
  newContent: string | null;
  previousDate: string | null;
  newDate: string | null;
  previousTime: string | null;
  newTime: string | null;
  previousListId: string | null;
  newListId: string | null;
  previousState: "pending" | "completed" | "abandoned" | null;
  newState: "pending" | "completed" | "abandoned" | null;
  previousDeletedAt: string | null;
  newDeletedAt: string | null;
  previousCompletion: TaskCompletionView | null;
  newCompletion: TaskCompletionView | null;
  operation?:
    | Readonly<{
        kind: "reschedule";
        date: string | null;
        time: string | null;
      }>
    | Readonly<{ kind: "setState"; state: "pending" | "completed" | "abandoned" }>
    | Readonly<{
        kind: "correctCompletion";
        completedOn: string;
        completedTime: string | null;
      }>
    | null;
}>;

type TaskCompletionView = Readonly<{
  completedOn: string;
  completedTime: string | null;
  recordedAt: string;
  source: "checkbox" | "date-correction" | "daily-flow";
}>;

type TaskView = Readonly<{
  id: string;
  name: string;
  content: string | null;
  date: string | null;
  time: string | null;
  listId: string;
  source: Readonly<{ kind: "manual" | "daily-flow"; reference: string | null }>;
  state: "pending" | "completed" | "abandoned";
  deletedAt: string | null;
  completion: TaskCompletionView | null;
  overdue: boolean;
  createdAt: string;
  modifiedAt: string;
  changes: readonly TaskChangeView[];
}>;

type TasksView = Readonly<{
  state: "unconfigured" | "empty" | "ready" | "error";
  message: string;
  schemaVersion: number;
  revision: string | null;
  targetBinding: string | null;
  vaultName: string | null;
  vaultPath: string | null;
  currentDate: string | null;
  lists: readonly Readonly<{
    id: string;
    name: string;
    isSystem: boolean;
    archived: boolean;
  }>[];
  tasks: readonly TaskView[];
}>;

type TodayView = Readonly<{
  state: TodayState;
  date: string;
  isToday: boolean;
  canRecord: boolean;
  defaultPhase: TodayPhase;
  dailyRecordAvailability: DailyRecordAvailability;
  vaultName: string | null;
  vaultPath: string | null;
  vaultAvailability: "unconfigured" | "available" | "unavailable" | "incompatible";
  message: string;
  revision: string | null;
  targetBinding: string | null;
  baseline: MorningBaselineView;
  timeline: readonly MorningBlockView[];
  evidence: readonly PlanningEvidenceView[];
  daytime: DaytimeView;
  evening: EveningView;
  tasks: TasksView;
  dayTasks: DayTaskListView;
  habitCorrections: HabitCorrectionView;
}>;

type TodayPhase = "morning" | "daytime" | "evening";

type DailyRecordAvailability = "missing" | "unreviewed" | "reviewed" | "error";

type CalendarDayView = Readonly<{
  date: string;
  inMonth: boolean;
  isToday: boolean;
  availability: DailyRecordAvailability;
  taskSummaries: readonly Readonly<{
    id: string;
    name: string;
    state: "pending" | "completed" | "abandoned";
  }>[];
  taskOverflowCount: number;
}>;

type CalendarMonthView = Readonly<{
  year: number;
  month: number;
  configured: boolean;
  taskState: "unconfigured" | "empty" | "ready" | "error";
  taskMessage: string;
  days: readonly CalendarDayView[];
}>;

type HabitSnapshotState =
  | "unconfigured"
  | "missing"
  | "ready"
  | "stale"
  | "retained"
  | "error";

type HabitCellStatus =
  | "unknown"
  | "completed"
  | "notDone"
  | "conflict"
  | "partial"
  | "baseline"
  | "unavailable"
  | "actualTime"
  | "thresholdOnly"
  | "recordOnly";

type HabitNamesConfigurationState = "missing" | "ready" | "invalid";

type HabitCellView = Readonly<{
  date: string;
  coverage: string;
  status: HabitCellStatus;
  hasRecord: boolean;
  countsAsCompletion: boolean;
  actualTimeLabel: string | null;
  localCompletionState: HabitLocalCompletionState;
  hasExternalCompletion: boolean;
  completionSourceLabels: readonly string[];
  details: readonly HabitDetail[];
  localRecords: readonly Readonly<{
    id: string;
    sourceLabel: string;
    text: string;
  }>[];
}>;

type HabitView = Readonly<{
  key: string;
  name: string;
  localizedNames: HabitLocalizedNames;
  active: boolean;
  canRecordCompletion: boolean;
  goalKind: "weekly-count" | "daily-time";
  goalLabel: string;
  weeklyTarget: number | null;
  completedCount: number | null;
  sourceLabels: readonly string[];
  coverageLabel: string;
  goalHistory: readonly Readonly<{
    weekOf: string;
    label: string;
    goalLabel: string;
  }>[];
  today: HabitCellView;
  recent: readonly HabitCellView[];
  history: readonly HabitCellView[];
}>;

type HabitSnapshotView = Readonly<{
  state: HabitSnapshotState;
  message: string;
  readError?: string;
  generatedAt: string | null;
  displayRangeLabel: string | null;
  rangeLabel: string | null;
  producerLabel: string | null;
  completionRevision: string | null;
  completionTargetBinding: string | null;
  namesConfigurationState: HabitNamesConfigurationState;
  summary: Readonly<{
    knownCompletions: number;
    targetCompletions: number;
    coverageNote: string;
    excludedNoGoal: number;
  }>;
  habits: readonly HabitView[];
}>;

type HabitCorrectionHabitView = Readonly<{
  key: string;
  name: string;
  localizedNames: HabitLocalizedNames;
  nameKnown: boolean;
  canRecordCompletion: boolean;
  goalLabel: string | null;
  localChangeCount: number;
  localChanges: readonly Readonly<{
    state: HabitLocalCompletionState;
    changedAt: string;
  }>[];
  cell: HabitCellView;
}>;

type HabitCorrectionView = Readonly<{
  state: HabitSnapshotState;
  message: string;
  date: string;
  canRecord: boolean;
  completionRevision: string | null;
  completionTargetBinding: string | null;
  namesConfigurationState: HabitNamesConfigurationState;
  habits: readonly HabitCorrectionHabitView[];
}>;

function isTodayPhase(value: string | undefined): value is TodayPhase {
  return value === "morning" || value === "daytime" || value === "evening";
}

type WorkspaceDestination = "today" | "tasks" | "calendar" | "habits" | "settings";

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return (
    value === "today" ||
    value === "tasks" ||
    value === "calendar" ||
    value === "habits" ||
    value === "settings"
  );
}

const workspaceDestinationDetails: Record<
  WorkspaceDestination,
  Readonly<{
    title: InterfaceCopyKey;
    description: InterfaceCopyKey;
    featureArea: InterfaceCopyKey;
  }>
> = {
  today: {
    title: "destination.today",
    description: "workspace.todayDescription",
    featureArea: "workspace.todayFeature",
  },
  tasks: {
    title: "destination.tasks",
    description: "workspace.tasksDescription",
    featureArea: "workspace.tasksFeature",
  },
  calendar: {
    title: "destination.calendar",
    description: "workspace.calendarDescription",
    featureArea: "workspace.calendarFeature",
  },
  habits: {
    title: "destination.habits",
    description: "workspace.habitsDescription",
    featureArea: "workspace.habitsFeature",
  },
  settings: {
    title: "destination.settings",
    description: "workspace.settingsDescription",
    featureArea: "workspace.settingsFeature",
  },
};

type AppearanceSelectionResult = Readonly<{
  preferences: AppearancePreferences;
  changed: boolean;
}>;

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
const workspaceSettingsButton = document.querySelector<HTMLButtonElement>(
  "#workspace-settings",
);
const workspaceLanguageButton = document.querySelector<HTMLButtonElement>(
  "#workspace-language",
);
const interfaceLanguageStatus = document.querySelector<HTMLElement>(
  "#interface-language-status",
);
const settingsCategoryButtons = document.querySelectorAll<HTMLButtonElement>(
  "[data-settings-section]",
);
const settingsPanels = document.querySelectorAll<HTMLElement>("[data-settings-panel]");
const accentColorButtons = document.querySelectorAll<HTMLButtonElement>("[data-accent-color]");
const restoreAppearanceButton = document.querySelector<HTMLButtonElement>("#restore-appearance");
const appearanceStatus = document.querySelector<HTMLElement>("#appearance-status");
const chooseBackgroundImageButton = document.querySelector<HTMLButtonElement>(
  "#choose-background-image",
);
const removeBackgroundImageButton = document.querySelector<HTMLButtonElement>(
  "#remove-background-image",
);
const backgroundImageStatus = document.querySelector<HTMLElement>("#background-image-status");
const settingsVaultPath = document.querySelector<HTMLElement>("#settings-vault-path");
const settingsVaultStatus = document.querySelector<HTMLElement>("#settings-vault-status");
const settingsSelectVaultButton = document.querySelector<HTMLButtonElement>(
  "#settings-select-vault",
);
const workspaceRailContextKicker = document.querySelector<HTMLElement>(
  "#workspace-rail-context-kicker",
);
const workspaceRailContextTitle = document.querySelector<HTMLElement>(
  "#workspace-rail-context-title",
);
const workspaceRailContextDetail = document.querySelector<HTMLElement>(
  "#workspace-rail-context-detail",
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
const calendarTaskPanel = document.querySelector<HTMLElement>("#calendar-task-panel");
const calendarTaskStatus = document.querySelector<HTMLElement>("#calendar-task-status");
const calendarTaskCount = document.querySelector<HTMLElement>("#calendar-task-count");
const calendarTaskList = document.querySelector<HTMLElement>("#calendar-task-list");
const calendarTaskEmpty = document.querySelector<HTMLElement>("#calendar-task-empty");
const calendarTaskCreateForm = document.querySelector<HTMLFormElement>(
  "#calendar-task-create-form",
);
const calendarTaskCreateName = document.querySelector<HTMLInputElement>(
  "#calendar-task-create-name",
);
const calendarTaskCreateContent = document.querySelector<HTMLTextAreaElement>(
  "#calendar-task-create-content",
);
const calendarTaskCreateList = document.querySelector<HTMLSelectElement>(
  "#calendar-task-create-list",
);
const calendarTaskCreateDate = document.querySelector<HTMLInputElement>(
  "#calendar-task-create-date",
);
const calendarTaskCreateTime = document.querySelector<HTMLInputElement>(
  "#calendar-task-create-time",
);
const calendarTaskCreateSubmit = document.querySelector<HTMLButtonElement>(
  "#calendar-task-create-submit",
);
const tasksDestination = document.querySelector<HTMLElement>("#workspace-destination-tasks");
const tasksStatus = document.querySelector<HTMLElement>("#tasks-status");
const taskFilter = document.querySelector<HTMLSelectElement>("#task-filter");
const tasksCount = document.querySelector<HTMLElement>("#tasks-count");
const tasksList = document.querySelector<HTMLElement>("#tasks-list");
const tasksEmpty = document.querySelector<HTMLElement>("#tasks-empty");
const taskCreateForm = document.querySelector<HTMLFormElement>("#task-create-form");
const taskCreateName = document.querySelector<HTMLInputElement>("#task-create-name");
const taskCreateContent = document.querySelector<HTMLTextAreaElement>("#task-create-content");
const taskCreateList = document.querySelector<HTMLSelectElement>("#task-create-list");
const taskCreateListLabel = document.querySelector<HTMLElement>("#task-create-list-label");
const taskCreateDate = document.querySelector<HTMLInputElement>("#task-create-date");
const taskCreateTime = document.querySelector<HTMLInputElement>("#task-create-time");
const taskCreateSubmit = document.querySelector<HTMLButtonElement>("#task-create-submit");
const taskCreateCancel = document.querySelector<HTMLButtonElement>("#task-create-cancel");
const taskNewButton = document.querySelector<HTMLButtonElement>("#task-new");
const taskNewListButton = document.querySelector<HTMLButtonElement>("#task-new-list");
const taskListScopes = document.querySelector<HTMLElement>("#tasks-list-scopes");
const taskListCreateForm = document.querySelector<HTMLFormElement>("#task-list-create-form");
const taskListCreateName = document.querySelector<HTMLInputElement>("#task-list-create-name");
const taskListsManagement = document.querySelector<HTMLElement>("#tasks-lists-management");
const taskListsManagementPanel = document.querySelector<HTMLElement>(
  "#tasks-list-management-panel",
);
const taskListsManagementClose = document.querySelector<HTMLButtonElement>(
  "#tasks-list-management-close",
);
const taskEditorDialogRoot = document.querySelector<HTMLElement>(
  "#task-editor-dialog-root",
);
const refreshTasksButton = document.querySelector<HTMLButtonElement>("#refresh-tasks");
const habitsStatus = document.querySelector<HTMLElement>("#habits-status");
const habitsDestination = document.querySelector<HTMLElement>("#workspace-destination-habits");
const habitsRange = document.querySelector<HTMLElement>("#habits-range");
const habitsReady = document.querySelector<HTMLElement>("#habits-ready");
const habitsEmpty = document.querySelector<HTMLElement>("#habits-empty");
const habitsEmptyHeading = document.querySelector<HTMLElement>("#habits-empty-heading");
const habitsEmptyCopy = document.querySelector<HTMLElement>("#habits-empty-copy");
const habitsSummaryTotal = document.querySelector<HTMLElement>("#habits-summary-total");
const habitsSummaryRows = document.querySelector<HTMLElement>("#habits-summary-rows");
const habitsSummaryNote = document.querySelector<HTMLElement>("#habits-summary-note");
const habitsGeneratedAt = document.querySelector<HTMLElement>("#habits-generated-at");
const habitsProducer = document.querySelector<HTMLElement>("#habits-producer");
const habitsTodayDate = document.querySelector<HTMLElement>("#habits-today-date");
const habitsDailyList = document.querySelector<HTMLElement>("#habits-daily-list");
const habitsWeeklyList = document.querySelector<HTMLElement>("#habits-weekly-list");
const refreshHabitsButton = document.querySelector<HTMLButtonElement>("#refresh-habits");
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
const todayTaskStatus = document.querySelector<HTMLElement>("#today-task-status");
const todayTaskCount = document.querySelector<HTMLElement>("#today-task-count");
const todayTaskScheduled = document.querySelector<HTMLElement>("#today-task-scheduled");
const todayTaskOverdueSection = document.querySelector<HTMLElement>(
  "#today-task-overdue-section",
);
const todayTaskOverdue = document.querySelector<HTMLElement>("#today-task-overdue");
const todayTaskOverdueCount = document.querySelector<HTMLElement>("#today-task-overdue-count");
const todayTaskEmpty = document.querySelector<HTMLElement>("#today-task-empty");
const todayTaskOverdueEmpty = document.querySelector<HTMLElement>("#today-task-overdue-empty");
const todayTaskCreateForm = document.querySelector<HTMLFormElement>("#today-task-create-form");
const todayTaskCreateName = document.querySelector<HTMLInputElement>("#today-task-create-name");
const todayTaskCreateContent = document.querySelector<HTMLTextAreaElement>(
  "#today-task-create-content",
);
const todayTaskCreateList = document.querySelector<HTMLSelectElement>("#today-task-create-list");
const todayTaskCreateDate = document.querySelector<HTMLInputElement>("#today-task-create-date");
const todayTaskCreateTime = document.querySelector<HTMLInputElement>("#today-task-create-time");
const todayTaskCreateSubmit = document.querySelector<HTMLButtonElement>(
  "#today-task-create-submit",
);
const todayLegacyTaskHistory = document.querySelector<HTMLElement>(
  "#today-legacy-task-history",
);
const todayLegacyTaskStatus = document.querySelector<HTMLElement>("#today-legacy-task-status");
const todayLegacyTaskCount = document.querySelector<HTMLElement>("#today-legacy-task-count");
const todayLegacyTaskList = document.querySelector<HTMLElement>("#today-legacy-task-list");
const todayLegacyTaskEmpty = document.querySelector<HTMLElement>("#today-legacy-task-empty");
const historicalHabitCorrections = document.querySelector<HTMLElement>(
  "#historical-habit-corrections",
);
const historicalHabitDate = document.querySelector<HTMLElement>("#historical-habit-date");
const historicalHabitStatus = document.querySelector<HTMLElement>("#historical-habit-status");
const historicalHabitList = document.querySelector<HTMLElement>("#historical-habit-list");
const historicalHabitBoundary = document.querySelector<HTMLElement>(
  "#historical-habit-boundary",
);
const todayHandoff = document.querySelector<HTMLElement>("#today-handoff");
const todayHandoffHeading = document.querySelector<HTMLElement>("#today-handoff-heading");
const todayHandoffCopy = document.querySelector<HTMLElement>("#today-handoff-copy");
const selectTodayVaultButton = document.querySelector<HTMLButtonElement>("#select-today-vault");
const refreshTodayButton = document.querySelector<HTMLButtonElement>("#refresh-today");
const appShell = document.querySelector<HTMLElement>(".app-shell");
let currentWorkspaceDestination: WorkspaceDestination = "today";
let currentAppearance: AppearancePreferences = {
  accentColor: "forest",
  backgroundImageState: "none",
  backgroundImageUrl: null,
  cleanupWarning: null,
};
let currentInterfaceLanguage: InterfaceLanguage = "zh";
let todayOperationCount = 0;
let vaultSelectionInProgress = false;
const todayPresentationRequests = new LatestRequest();
const vaultSelectionRequests = new LatestRequest();
let currentTodayPhase: TodayPhase = "morning";
let currentTodayView: TodayView | null = null;
let currentTasksView: TasksView | null = null;
let taskScope: TaskListScope = "all";
let taskStateScope: "all" | "pending" | "completed" | "abandoned" | "deleted" = "all";
let taskCreateOpen = false;
let taskListManagementOpen = false;
let taskOperationCount = 0;
let taskRefreshQueued = false;
const taskRequests = new LatestRequest();
const todayTaskRequests = new LatestRequest();
const calendarTaskRequests = new LatestRequest();
type TaskDraft = Readonly<{
  name: string;
  content: string;
  date: string;
  time: string;
  listId: string | null;
  completionDate: string;
  completionTime: string;
}>;
const taskCreateDrafts = new Map<string, TaskDraft>();
const todayTaskCreateDrafts = new Map<string, TaskDraft>();
const calendarTaskCreateDrafts = new Map<string, TaskDraft>();
const taskEditDrafts = new Map<string, TaskDraft>();
const taskListCreateDrafts = new Map<string, string>();
const taskListRenameDrafts = new Map<string, string>();
const taskOperationIds = new TaskOperationIdentityStore();
let selectedTodayDate: string | null = null;
type DatedNoteDraft = {
  content: string;
  category: ShortRecordCategory;
  correctionId: string | null;
};
const datedNoteDrafts = new Map<string, DatedNoteDraft>();
let correctingShortRecordId: string | null = null;
let currentCalendarMonth: CalendarMonthView | null = null;
let currentCalendarSummaryView: TodayView | null = null;
let selectedCalendarDate: string | null = null;
const calendarMonthRequests = new LatestRequest();
const calendarSelectionRequests = new LatestRequest();
const habitSnapshotRequests = new LatestRequest();
const habitDateRequests = new LatestRequest();
const habitCompletionRequests = new LatestRequest();
let currentHabitSnapshot: HabitSnapshotView | null = null;
type HabitCellSelection = Readonly<{ habitKey: string; date: string }>;
type HabitNoteDraft = Readonly<{ content: string; correctionId: string | null }>;
let selectedHabitCell: HabitCellSelection | null = null;
let currentHabitDateView: TodayView | null = null;
let habitDateOperationCount = 0;
let habitCompletionOperationCount = 0;
const habitCompletionOperationIds = new Map<string, string>();
const pendingWrites = new PendingWriteBarrier();
const appearanceMutations = new SerializedLatestMutation<AppearancePreferences>({
  accentColor: "forest",
  backgroundImageState: "none",
  backgroundImageUrl: null,
  cleanupWarning: null,
});
const interfaceLanguageMutations =
  new SerializedLatestMutation<InterfaceLanguagePreferences>({ interfaceLanguage: "zh" });
type HabitNoteStatus = Readonly<{
  state: "ready" | "error";
  copyKey?: InterfaceCopyKey;
  error?: string;
  applicationMessage?: string;
}>;

let habitNoteStatus: HabitNoteStatus | null = null;
let habitCompletionStatus: HabitNoteStatus | null = null;
let historicalHabitCompletionStatus: HabitNoteStatus | null = null;
const habitNoteDrafts = new Map<string, HabitNoteDraft>();

function t(
  key: InterfaceCopyKey,
  variables: Readonly<Record<string, string | number>> = {},
): string {
  return interfaceCopy(key, currentInterfaceLanguage, variables);
}

function displayHabitName(
  habit: Readonly<{ name: string; localizedNames?: HabitLocalizedNames | null }>,
): string {
  return localizedHabitName(habit.name, habit.localizedNames, currentInterfaceLanguage);
}

function applicationMessage(message: string): string {
  return localizeApplicationMessage(message, currentInterfaceLanguage);
}

function setCopy(
  element: HTMLElement | null,
  key: InterfaceCopyKey,
  variables: Readonly<Record<string, string | number>> = {},
): void {
  setInterfaceCopy(element, key, currentInterfaceLanguage, variables);
}

function setCopyError(
  element: HTMLElement | null,
  key: InterfaceCopyKey,
  error: unknown,
): void {
  setInterfaceError(element, key, String(error), currentInterfaceLanguage);
}

function setAppMessage(element: HTMLElement | null, message: string): void {
  setApplicationMessage(element, message, currentInterfaceLanguage);
}

function setRawText(element: HTMLElement | null, value: string): void {
  if (!element) return;
  delete element.dataset.i18n;
  delete element.dataset.i18nVariables;
  delete element.dataset.applicationMessage;
  element.textContent = value;
}

function renderInterfaceLanguage(preferences: InterfaceLanguagePreferences): void {
  currentInterfaceLanguage = preferences.interfaceLanguage;
  applyInterfaceLanguage(currentInterfaceLanguage);
  if (workspaceLanguageButton) {
    const chinese = currentInterfaceLanguage === "zh";
    setCopy(
      workspaceLanguageButton,
      chinese ? "toolbar.languageChineseActive" : "toolbar.languageEnglishActive",
    );
    const nextLanguageKey = chinese ? "toolbar.switchToEnglish" : "toolbar.switchToChinese";
    workspaceLanguageButton.dataset.i18nAriaLabel = nextLanguageKey;
    workspaceLanguageButton.dataset.i18nTitle = nextLanguageKey;
    workspaceLanguageButton.setAttribute("aria-label", t(nextLanguageKey));
    workspaceLanguageButton.title = t(nextLanguageKey);
  }
  if (currentCalendarMonth) renderCalendarGrid(currentCalendarMonth);
  if (currentCalendarSummaryView) renderCalendarSummary(currentCalendarSummaryView);
  if (currentHabitSnapshot) renderHabitSnapshot(currentHabitSnapshot);
  if (currentTasksView) renderTasks(currentTasksView);
  if (currentTodayView) {
    renderTodayTasks(currentTodayView);
    renderLegacyDayTasks(currentTodayView.dayTasks);
    renderHistoricalHabitCorrections(currentTodayView);
  }
  renderWorkspaceNavigationLanguage();
  renderWorkspaceFeatureArea(currentWorkspaceDestination);
  renderWorkspaceRailContext(currentWorkspaceDestination);
  renderWorkspaceContextStatus(currentWorkspaceDestination);
}

async function chooseInterfaceLanguage(interfaceLanguage: InterfaceLanguage): Promise<void> {
  renderInterfaceLanguage({ interfaceLanguage });
  await interfaceLanguageMutations.enqueue(
    () => window.__TAURI__.core.invoke<InterfaceLanguagePreferences>(
      "set_interface_language",
      { interfaceLanguage },
    ),
    (saved) => {
      renderInterfaceLanguage(saved);
      setRawText(interfaceLanguageStatus, "");
    },
    (error, confirmed) => {
      renderInterfaceLanguage(confirmed);
      if (interfaceLanguageStatus) {
        setCopyError(interfaceLanguageStatus, "language.saveFailed", error);
      }
    },
  );
}

function resetVaultScopedWorkspaceState(): void {
  taskRequests.invalidate();
  todayTaskRequests.invalidate();
  calendarMonthRequests.invalidate();
  calendarSelectionRequests.invalidate();
  calendarTaskRequests.invalidate();
  habitSnapshotRequests.invalidate();
  habitDateRequests.invalidate();
  habitCompletionRequests.invalidate();
  currentCalendarMonth = null;
  currentCalendarSummaryView = null;
  selectedCalendarDate = null;
  currentTodayView = null;
  currentTasksView = null;
  taskScope = "all";
  taskStateScope = "all";
  taskCreateOpen = false;
  taskListManagementOpen = false;
  taskRefreshQueued = false;
  currentHabitSnapshot = null;
  selectedHabitCell = null;
  currentHabitDateView = null;
  habitNoteStatus = null;
  habitCompletionStatus = null;
  historicalHabitCompletionStatus = null;
  datedNoteDrafts.clear();
  taskCreateDrafts.clear();
  todayTaskCreateDrafts.clear();
  calendarTaskCreateDrafts.clear();
  taskEditDrafts.clear();
  taskListCreateDrafts.clear();
  taskListRenameDrafts.clear();
  taskOperationIds.clear();
  habitCompletionOperationIds.clear();
  taskCreateForm?.reset();
  todayTaskCreateForm?.reset();
  calendarTaskCreateForm?.reset();
  taskListCreateForm?.reset();
  taskCreateForm?.toggleAttribute("hidden", true);
  taskListCreateForm?.toggleAttribute("hidden", true);
  taskListsManagementPanel?.toggleAttribute("hidden", true);
  taskListScopes?.replaceChildren();
  taskListsManagement?.replaceChildren();
  taskEditorDialogRoot?.replaceChildren();
  setCopy(taskCreateListLabel, "tasks.inbox");
  setCopy(taskCreateSubmit, "tasks.add");
  normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime);
  normalizeTaskDateTimeFields(todayTaskCreateDate, todayTaskCreateTime);
  todayTaskScheduled?.replaceChildren();
  todayTaskOverdue?.replaceChildren();
  calendarTaskList?.replaceChildren();
  if (calendarTaskCount) calendarTaskCount.textContent = "";
  if (calendarTaskEmpty) calendarTaskEmpty.hidden = true;
  calendarTaskPanel?.toggleAttribute("hidden", true);
  calendarTaskCreateForm?.toggleAttribute("hidden", true);
  setCopy(calendarTaskCreateSubmit, "tasks.add");
  normalizeTaskDateTimeFields(calendarTaskCreateDate, calendarTaskCreateTime);
  todayLegacyTaskList?.replaceChildren();
  todayLegacyTaskHistory?.toggleAttribute("hidden", true);
  tasksList?.replaceChildren();
  if (tasksCount) tasksCount.textContent = "";
  if (tasksEmpty) tasksEmpty.hidden = true;
  if (tasksStatus) {
    setCopy(tasksStatus, "tasks.loadNewVault");
    tasksStatus.dataset.state = "loading";
  }
  habitNoteDrafts.clear();
  correctingShortRecordId = null;
  calendarGrid?.replaceChildren();
  habitsReady?.toggleAttribute("hidden", true);
  habitsEmpty?.toggleAttribute("hidden", true);
  habitsSummaryRows?.replaceChildren();
  historicalHabitList?.replaceChildren();
  historicalHabitCorrections?.toggleAttribute("hidden", true);
  if (habitsSummaryTotal) habitsSummaryTotal.textContent = "—";
  setCopy(habitsRange, "habits.loadingOnDemand");
  setCopy(calendarSummaryHeading, "calendar.loadingSelectedDate");
  if (calendarSummaryStatus) {
    setCopy(calendarSummaryStatus, "common.loading");
    calendarSummaryStatus.dataset.availability = "unknown";
  }
  calendarSummaryCopy?.replaceChildren();
  if (calendarOpenDay) calendarOpenDay.disabled = true;
  if (calendarStatus) {
    setCopy(calendarStatus, "calendar.loadingNewVault");
    calendarStatus.dataset.state = "loading";
  }
  renderWorkspaceRailContext(currentWorkspaceDestination);
}

let backgroundPresentationGeneration = 0;

function renderBackgroundPresentation(preferences: AppearancePreferences): void {
  if (appShell) applyBackgroundImage(preferences, appShell);
  if (removeBackgroundImageButton) {
    removeBackgroundImageButton.disabled = currentAppearance.backgroundImageState === "none";
  }
  setCopy(
    backgroundImageStatus,
    preferences.backgroundImageState === "ready"
      ? "settings.backgroundReady"
      : preferences.backgroundImageState === "unavailable"
        ? "settings.backgroundUnavailable"
        : "settings.backgroundNone",
  );
  backgroundImageStatus?.toggleAttribute(
    "data-state",
    preferences.backgroundImageState === "unavailable",
  );
  if (backgroundImageStatus && preferences.backgroundImageState === "unavailable") {
    backgroundImageStatus.dataset.state = "error";
  }
}

function renderAppearance(preferences: AppearancePreferences): void {
  currentAppearance = preferences;
  const presentationGeneration = ++backgroundPresentationGeneration;
  applyAccentColor(preferences.accentColor, document.documentElement.style);
  renderBackgroundPresentation(preferences);
  accentColorButtons.forEach((button) => {
    const selected = button.dataset.accentColor === preferences.accentColor;
    button.setAttribute("aria-pressed", String(selected));
  });
  if (preferences.cleanupWarning && appearanceStatus) {
    setCopyError(appearanceStatus, "appearance.cleanupPending", preferences.cleanupWarning);
    appearanceStatus.dataset.state = "error";
  }
  if (preferences.backgroundImageState === "ready") {
    void resolveBackgroundImagePresentation(preferences).then((presentation) => {
      if (presentationGeneration === backgroundPresentationGeneration) {
        renderBackgroundPresentation(presentation);
      }
    });
  }
}

async function persistAppearanceChange(
  optimistic: AppearancePreferences,
  command: "set_accent_color" | "remove_background_image" | "restore_appearance_defaults",
  arguments_: Record<string, unknown> | undefined,
  progressMessage: InterfaceCopyKey,
  successMessage: InterfaceCopyKey,
): Promise<void> {
  renderAppearance(optimistic);
  setCopy(appearanceStatus, progressMessage);
  await appearanceMutations.enqueue(
    () => window.__TAURI__.core.invoke<AppearancePreferences>(command, arguments_),
    (saved) => {
      renderAppearance(saved);
      if (appearanceStatus) {
        if (saved.cleanupWarning) {
          setCopyError(appearanceStatus, "appearance.cleanupPending", saved.cleanupWarning);
          appearanceStatus.dataset.state = "error";
        } else {
          setCopy(appearanceStatus, successMessage);
          delete appearanceStatus.dataset.state;
        }
      }
    },
    (error, confirmed) => {
      renderAppearance(confirmed);
      if (appearanceStatus) {
        setCopyError(appearanceStatus, "appearance.updateFailed", error);
        appearanceStatus.dataset.state = "error";
      }
    },
  );
}

async function chooseAccentColor(accentColor: AccentColor): Promise<void> {
  await persistAppearanceChange(
    { ...currentAppearance, accentColor },
    "set_accent_color",
    { accentColor },
    "appearance.saving",
    "appearance.saved",
  );
}

async function restoreAppearance(): Promise<void> {
  await persistAppearanceChange(
    {
      accentColor: "forest",
      backgroundImageState: "none",
      backgroundImageUrl: null,
      cleanupWarning: null,
    },
    "restore_appearance_defaults",
    undefined,
    "appearance.restoring",
    "appearance.restored",
  );
}

async function chooseBackgroundImage(): Promise<void> {
  setCopy(appearanceStatus, "appearance.importingBackground");
  let changed = false;
  await appearanceMutations.enqueue(
    async () => {
      const result = await window.__TAURI__.core.invoke<AppearanceSelectionResult>(
        "select_background_image",
        { interfaceLanguage: currentInterfaceLanguage },
      );
      changed = result.changed;
      return result.preferences;
    },
    (saved) => {
      renderAppearance(saved);
      if (saved.cleanupWarning && appearanceStatus) {
        setCopyError(appearanceStatus, "appearance.cleanupPending", saved.cleanupWarning);
        appearanceStatus.dataset.state = "error";
      } else {
        setCopy(
          appearanceStatus,
          changed
            ? "appearance.backgroundImported"
            : "appearance.backgroundSelectionCancelled",
        );
        appearanceStatus?.removeAttribute("data-state");
      }
    },
    (error, confirmed) => {
      renderAppearance(confirmed);
      if (appearanceStatus) {
        setCopyError(appearanceStatus, "appearance.updateFailed", error);
        appearanceStatus.dataset.state = "error";
      }
    },
  );
}

async function removeBackgroundImage(): Promise<void> {
  await persistAppearanceChange(
    {
      ...currentAppearance,
      backgroundImageState: "none",
      backgroundImageUrl: null,
      cleanupWarning: null,
    },
    "remove_background_image",
    undefined,
    "appearance.removingBackground",
    "appearance.backgroundRemoved",
  );
}

function showSettingsSection(section: "appearance" | "data"): void {
  settingsCategoryButtons.forEach((button) => {
    const current = button.dataset.settingsSection === section;
    button.toggleAttribute("aria-current", current);
    if (current) button.setAttribute("aria-current", "page");
  });
  settingsPanels.forEach((panel) => {
    panel.hidden = panel.dataset.settingsPanel !== section;
  });
}

type VaultSettingsView = Pick<TodayView, "vaultPath" | "vaultAvailability" | "message">;

function renderVaultSettings(view: VaultSettingsView): void {
  if (settingsVaultPath) {
    if (view.vaultPath) {
      delete settingsVaultPath.dataset.i18n;
      delete settingsVaultPath.dataset.i18nVariables;
      settingsVaultPath.textContent = view.vaultPath;
    } else {
      setCopy(settingsVaultPath, "settings.noVault");
    }
  }
  if (settingsVaultStatus) {
    if (view.vaultAvailability === "unconfigured") {
      setCopy(settingsVaultStatus, "settings.vaultUnconfigured");
    } else if (view.vaultAvailability === "unavailable") {
      setRawText(settingsVaultStatus, "");
      const prefix = document.createElement("span");
      const detail = document.createElement("span");
      setCopy(prefix, "settings.vaultUnavailablePrefix");
      setAppMessage(detail, view.message);
      settingsVaultStatus.replaceChildren(prefix, detail);
    } else if (view.vaultAvailability === "incompatible") {
      setRawText(settingsVaultStatus, "");
      const prefix = document.createElement("span");
      const detail = document.createElement("span");
      setCopy(prefix, "settings.vaultIncompatiblePrefix");
      setAppMessage(detail, view.message);
      settingsVaultStatus.replaceChildren(prefix, detail);
    } else {
      setCopy(settingsVaultStatus, "settings.vaultAvailable");
    }
    settingsVaultStatus.dataset.state = view.vaultAvailability;
  }
}

async function waitForPendingWrites(): Promise<boolean> {
  if (currentWorkspaceDestination === "habits" && habitsStatus) {
    setCopy(habitsStatus, "today.waitingWrites");
    habitsStatus.dataset.state = "loading";
  }
  if (currentWorkspaceDestination === "settings" && settingsVaultStatus) {
    setCopy(settingsVaultStatus, "settings.waitingWrites");
    settingsVaultStatus.dataset.state = "loading";
  }
  if (currentWorkspaceDestination === "tasks" && tasksStatus) {
    setCopy(tasksStatus, "tasks.waitingWrites");
    tasksStatus.dataset.state = "loading";
  }
  return await pendingWrites.wait();
}

function renderPendingWriteFailure(): void {
  if (currentWorkspaceDestination === "habits") {
    if (habitsStatus) {
      setCopy(habitsStatus, "settings.pendingWriteFailed");
      habitsStatus.dataset.state = "error";
    }
    renderSelectedHabitCell();
    return;
  }
  if (currentWorkspaceDestination === "calendar") {
    if (calendarStatus) {
      setCopy(calendarStatus, "settings.vaultNotSwitchedAfterSaveFailure");
      calendarStatus.dataset.state = "error";
    }
    return;
  }
  if (currentWorkspaceDestination === "settings") {
    if (settingsVaultStatus) {
      setCopy(settingsVaultStatus, "settings.vaultNotSwitchedAfterSaveFailure");
      settingsVaultStatus.dataset.state = "error";
    }
    return;
  }
  if (currentWorkspaceDestination === "tasks") {
    if (tasksStatus) {
      setCopy(tasksStatus, "settings.vaultNotSwitchedAfterSaveFailure");
      tasksStatus.dataset.state = "error";
    }
    return;
  }
  if (todayStatus) {
    setCopy(todayStatus, "settings.vaultNotSwitchedAfterSaveFailure");
    todayStatus.dataset.state = "error";
  }
}

function syncWorkspaceViewportMode(): void {
  appShell?.setAttribute("data-detail-open", "false");
  workspaceInformation?.removeAttribute("aria-hidden");
  if (workspaceDestinationSelect) {
    workspaceDestinationSelect.value = currentWorkspaceDestination;
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
    setCopy(contextLabel, "today.background");
    article.append(contextLabel);
  }
  update.context.forEach((line) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = line;
    article.append(paragraph);
  });
  appendDaytimeGroup(article, "today.recordContent", update.neutral);
  appendDaytimeGroup(article, "today.observedFacts", update.observedFacts);
  appendDaytimeGroup(article, "today.originalIntent", update.originalIntent);
  appendDaytimeGroup(article, "today.changeReasons", update.changeReasons);
  appendDaytimeGroup(article, "today.revisedDirection", update.revisedDirection);
  return article;
}

function shortRecordArticle(record: ShortRecordView, editable = true): HTMLElement {
  const article = document.createElement("article");
  article.className = "today-short-record";
  const body = document.createElement("p");
  body.textContent = record.text;
  const meta = document.createElement("small");
  setCopy(meta, "today.recordMeta", {
    category: t(record.category === "exercise" ? "today.exercise" : "today.ordinaryRecord"),
    date: record.date,
    createdAt: record.createdAt,
  });
  article.append(body, meta);
  if (editable) {
    const correct = document.createElement("button");
    correct.type = "button";
    correct.className = "today-correct-record secondary-button";
    correct.dataset.correctRecordId = record.id;
    setCopy(correct, "today.correctThis");
    article.append(correct);
  }
  if (record.changes.length > 0) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    setCopy(summary, "today.changeHistory", { count: record.changes.length });
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
  heading: InterfaceCopyKey,
  lines: readonly string[],
): void {
  if (lines.length > 0) {
    const label = document.createElement("p");
    label.className = "today-update-label";
    setCopy(label, heading);
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
  const labels: Record<TodayPhase, InterfaceCopyKey> = {
    morning: "today.morning",
    daytime: "today.daytime",
    evening: "today.evening",
  };
  setCopy(todayHeading, labels[phase]);
  todayPhaseButtons.forEach((button) => {
    const selected = button.dataset.todayPhase === phase;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (focus && selected) {
      button.focus();
    }
  });
  todayPhasePanels.forEach((panel) => {
    const selected = panel.dataset.todayPhasePanel === phase;
    panel.hidden = !selected;
    panel.setAttribute("aria-hidden", String(!selected));
    if (selected) {
      // WebKit can retain a stale AX subtree after a hidden tabpanel is revealed.
      // Re-attaching the active panel makes the newly visible reading surface
      // available to VoiceOver and the packaged accessibility checks.
      panel.parentElement?.append(panel);
    }
  });
  const updateRail = document.querySelector<HTMLElement>(".today-update-rail");
  if (updateRail) updateRail.hidden = phase !== "daytime";
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
  const draftKey = currentTodayView?.targetBinding;
  if (!currentTodayView || !draftKey || !todayDaytimeContent) {
    return;
  }
  const content = todayDaytimeContent.value;
  if (content || correctingShortRecordId) {
    datedNoteDrafts.set(draftKey, {
      content,
      category: selectedShortRecordCategory(),
      correctionId: correctingShortRecordId,
    });
  } else {
    datedNoteDrafts.delete(draftKey);
  }
}

function renderDatedNoteComposer(view: TodayView): void {
  const draft = view.targetBinding ? datedNoteDrafts.get(view.targetBinding) : undefined;
  correctingShortRecordId = draft?.correctionId ?? null;
  if (todayDaytimeContent) {
    todayDaytimeContent.value = draft?.content ?? "";
  }
  if (todayDaytimeKind) {
    todayDaytimeKind.value = draft?.category ?? "ordinary";
    todayDaytimeKind.disabled = correctingShortRecordId !== null;
  }
  if (todayNoteFormLabel) {
    setCopy(todayNoteFormLabel, correctingShortRecordId ? "today.correctRecord" : "today.writeShort");
  }
  if (saveDaytimeUpdateButton) {
    setCopy(saveDaytimeUpdateButton, correctingShortRecordId ? "today.saveCorrection" : "today.saveRecord");
  }
  cancelNoteCorrectionButton?.toggleAttribute("hidden", correctingShortRecordId === null);
  if (todayNoteTarget) {
    setCopy(
      todayNoteTarget,
      view.canRecord ? "today.noteTarget" : "today.futureBoundary",
      view.canRecord ? { date: view.date } : {},
    );
  }
}

function renderToday(view: TodayView): void {
  if (currentTodayView?.date !== view.date) {
    stashDatedNoteDraft();
    historicalHabitCompletionStatus = null;
  }
  if (
    currentTodayView?.tasks.targetBinding !== view.tasks.targetBinding ||
    currentTodayView?.date !== view.date
  ) {
    stashTodayTaskCreateDraft();
  }
  currentTodayView = view;
  renderWorkspaceRailContext(currentWorkspaceDestination);
  renderVaultSettings(view);
  renderDatedNoteComposer(view);
  renderTodayTasks(view);
  renderLegacyDayTasks(view.dayTasks);
  renderHistoricalHabitCorrections(view);
  if (todayDate) {
    setCopy(todayDate, view.isToday ? "today.currentDate" : "today.selectedDate", {
      date: view.date,
    });
  }
  if (todayVault) {
    setCopy(
      todayVault,
      view.vaultName ? "today.vaultName" : "settings.noVault",
      view.vaultName ? { name: view.vaultName } : {},
    );
  }
  if (todayStatus) {
    setAppMessage(todayStatus, view.message);
    todayStatus.dataset.state = view.state;
  }
  if (selectTodayVaultButton) {
    selectTodayVaultButton.hidden = view.vaultAvailability === "available";
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
    setCopy(todayBlockCount, "count.timeBlocks", { count: view.baseline.timeline.length });
  }
  if (todayBaselineStatus) {
    setAppMessage(todayBaselineStatus, view.baseline.message);
    todayBaselineStatus.dataset.availability = view.baseline.availability;
  }
  if (todayPlanEmpty) {
    todayPlanEmpty.hidden = view.baseline.timeline.length > 0;
    setCopy(
      todayPlanEmpty,
      view.baseline.availability === "missing" ? "today.noBaselineStart" : "today.emptyBaseline",
    );
  }
  if (todayCurrentTimeline) {
    todayCurrentTimeline.replaceChildren(...view.timeline.map(todayTimelineItem));
  }
  if (todayCurrentCount) {
    setCopy(todayCurrentCount, "count.timeBlocks", { count: view.timeline.length });
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
    setCopy(todayDaytimeCount, "count.knownDirections", {
      known: knownUpdates.length,
      directions: directionCount,
    });
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
    setCopy(todayFutureCount, "count.items", { count: directionCount });
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
    setCopy(todayShortRecordCount, "count.records", {
      count: shortRecords.length + legacyShortRecords.length,
    });
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
    setCopy(todayChangeCount, "count.records", { count: arrangementChanges.length });
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
      setCopy(todayHandoffHeading, "today.connectVault");
      setCopy(todayHandoffCopy, "today.connectVaultCopy");
    } else if (view.state === "missing") {
      setCopy(todayHandoffHeading, "today.needsRecord");
      setCopy(todayHandoffCopy, "today.runMorning");
    } else if (view.state === "error") {
      setCopy(todayHandoffHeading, "today.repairRecord");
      setAppMessage(todayHandoffCopy, view.message);
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
    setCopy(todayEvidenceHeading, "today.initialEvidence");
  }
  if (todayEvidenceCount) {
    setCopy(todayEvidenceCount, "count.items", { count: evidenceItemCount });
  }
  if (todayEvidenceGroups) {
    todayEvidenceGroups.replaceChildren(...evidence.map(todayEvidenceGroup));
  }
  if (todayEvidenceEmpty) {
    todayEvidenceEmpty.hidden = evidenceItemCount > 0;
    setCopy(todayEvidenceEmpty, "today.noInitialEvidence");
  }
}

function dayTaskChangeDescription(change: DayTaskChangeView): string {
  if (change.kind === "renamed") {
    return t("dayTasks.changeRenamed", {
      changedAt: change.changedAt,
      previous: change.previousText ?? "",
      next: change.newText ?? "",
    });
  }
  const labels: Record<Exclude<DayTaskChangeView["kind"], "renamed">, InterfaceCopyKey> = {
    completed: "dayTasks.changeCompleted",
    reopened: "dayTasks.changeReopened",
    deleted: "dayTasks.changeDeleted",
  };
  return t(labels[change.kind], { changedAt: change.changedAt });
}

function dayTaskChangeHistory(task: DayTaskView): HTMLElement | null {
  if (currentTodayView?.isToday || task.changes.length === 0) return null;
  const history = document.createElement("details");
  history.className = "day-task-change-history";
  const summary = document.createElement("summary");
  setCopy(summary, "dayTasks.changeHistory", { count: task.changes.length });
  const changes = document.createElement("ul");
  changes.replaceChildren(
    ...task.changes.map((change) => {
      const item = document.createElement("li");
      item.textContent = dayTaskChangeDescription(change);
      return item;
    }),
  );
  history.append(summary, changes);
  return history;
}

function todayTaskCreateDraftKey(binding: string, date: string): string {
  return `${binding}:${date}`;
}

function stashTodayTaskCreateDraft(): void {
  const view = currentTodayView;
  const binding = view?.tasks.targetBinding;
  if (!view || !binding || !todayTaskCreateForm) return;
  const draft = readTaskDraft(todayTaskCreateForm);
  const key = todayTaskCreateDraftKey(binding, view.date);
  if (isBlankTaskDraft(draft)) {
    todayTaskCreateDrafts.delete(key);
  } else {
    todayTaskCreateDrafts.set(key, draft);
  }
}

function calendarTaskCreateDraftKey(binding: string, date: string): string {
  return `${binding}:${date}`;
}

function stashCalendarTaskCreateDraft(): void {
  const view = currentCalendarSummaryView;
  const binding = view?.tasks.targetBinding;
  const date = selectedCalendarDate ?? view?.date;
  if (!view || !binding || !date || !calendarTaskCreateForm) return;
  const draft = readTaskDraft(calendarTaskCreateForm);
  const key = calendarTaskCreateDraftKey(binding, date);
  if (isBlankTaskDraft(draft)) {
    calendarTaskCreateDrafts.delete(key);
  } else {
    calendarTaskCreateDrafts.set(key, draft);
  }
}

function renderLegacyDayTasks(dayTasks: DayTaskListView): void {
  const hasHistoricalContent =
    dayTasks.revision !== null || dayTasks.tasks.length > 0 || dayTasks.state === "error";
  todayLegacyTaskHistory?.toggleAttribute("hidden", !hasHistoricalContent);
  if (todayLegacyTaskCount) {
    setCopy(todayLegacyTaskCount, "today.legacyTasksCount", { count: dayTasks.tasks.length });
  }
  if (todayLegacyTaskStatus) {
    if (dayTasks.state === "error" || dayTasks.planError) {
      setAppMessage(todayLegacyTaskStatus, dayTasks.message);
    } else if (dayTasks.tasks.length > 0) {
      setCopy(todayLegacyTaskStatus, "today.legacyTasksPresent");
    } else {
      setCopy(todayLegacyTaskStatus, "today.legacyTasksEmpty");
    }
    todayLegacyTaskStatus.dataset.state = dayTasks.planError ? "error" : dayTasks.state;
  }
  if (todayLegacyTaskEmpty) {
    todayLegacyTaskEmpty.hidden = dayTasks.tasks.length > 0 || dayTasks.state === "error";
  }
  if (!todayLegacyTaskList) return;
  todayLegacyTaskList.replaceChildren(
    ...dayTasks.tasks.map((task) => {
      const row = document.createElement("article");
      row.className = "day-task-item is-legacy-read-only";
      row.classList.toggle("is-complete", task.completedAt !== null);
      row.classList.toggle("is-deleted", task.deletedAt !== null);
      const marker = document.createElement("span");
      marker.className = "day-task-deleted-marker";
      setCopy(
        marker,
        task.deletedAt
          ? "dayTasks.deletedHistorical"
          : task.completedAt
            ? "tasks.stateCompleted"
            : "tasks.statePending",
      );
      const body = document.createElement("div");
      body.className = "day-task-body";
      const name = document.createElement("strong");
      name.textContent = task.text;
      const meta = document.createElement("p");
      meta.className = "day-task-meta";
      setCopy(meta, task.source.kind === "manual" ? "dayTasks.sourceManual" : "dayTasks.sourceDailyFlow");
      body.append(name, meta);
      const history = dayTaskChangeHistory(task);
      if (history) body.append(history);
      row.append(marker, body);
      return row;
    }),
  );
}

function renderTodayTasks(view: TodayView): void {
  clearTaskEditorDialogs("today");
  const shared = view.tasks;
  const archivedListIds = new Set(
    shared.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const groups = todayTaskGroups(shared.tasks, view.date, view.isToday, archivedListIds);
  const writable =
    Boolean(shared.targetBinding) &&
    shared.state !== "error" &&
    shared.state !== "unconfigured" &&
    taskOperationCount === 0;
  const displayedCount = groups.scheduled.length + groups.overdue.length;
  if (todayTaskCount) setCopy(todayTaskCount, "today.tasksCount", { count: displayedCount });
  if (todayTaskStatus) {
    if (shared.state === "error") {
      setCopyError(todayTaskStatus, "tasks.loadFailed", shared.message);
    } else if (displayedCount > 0) {
      setCopy(todayTaskStatus, "today.tasksReady");
    } else {
      setCopy(todayTaskStatus, "today.tasksEmpty");
    }
    todayTaskStatus.dataset.state = shared.state;
  }
  if (todayTaskEmpty) {
    todayTaskEmpty.hidden = displayedCount > 0 || shared.state === "error";
  }
  if (todayTaskScheduled) {
    todayTaskScheduled.replaceChildren(
      ...groups.scheduled.map((task) => taskEditor(task, writable, shared, "today")),
    );
  }
  if (todayTaskOverdueCount) {
    setCopy(todayTaskOverdueCount, "today.tasksCount", { count: groups.overdue.length });
  }
  todayTaskOverdueSection?.toggleAttribute("hidden", groups.overdue.length === 0);
  if (todayTaskOverdue) {
    todayTaskOverdue.replaceChildren(
      ...groups.overdue.map((task) => taskEditor(task, writable, shared, "today")),
    );
  }
  if (todayTaskOverdueEmpty) {
    todayTaskOverdueEmpty.hidden = groups.overdue.length > 0 || shared.state === "error";
  }
  const draftKey = shared.targetBinding
    ? todayTaskCreateDraftKey(shared.targetBinding, view.date)
    : null;
  const draft = draftKey ? todayTaskCreateDrafts.get(draftKey) : undefined;
  todayTaskCreateForm?.toggleAttribute("hidden", !writable);
  todayTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      !writable;
  });
  if (todayTaskCreateForm) {
    renderTaskListSelect(todayTaskCreateList, shared, draft?.listId ?? "inbox");
    const selectedCreateList = taskListForId(shared, todayTaskCreateList?.value ?? "inbox");
    if (selectedCreateList && todayTaskCreateSubmit) {
      setRawText(
        todayTaskCreateSubmit,
        selectedCreateList.id === "inbox"
          ? t("tasks.add")
          : t("tasks.addToList", { list: selectedCreateList.name }),
      );
    }
    if (todayTaskCreateName) todayTaskCreateName.value = draft?.name ?? "";
    if (todayTaskCreateContent) todayTaskCreateContent.value = draft?.content ?? "";
    if (todayTaskCreateDate) todayTaskCreateDate.value = draft?.date ?? view.date;
    if (todayTaskCreateTime) todayTaskCreateTime.value = draft?.time ?? "";
    normalizeTaskDateTimeFields(todayTaskCreateDate, todayTaskCreateTime, !writable);
    todayTaskCreateSubmit?.toggleAttribute("disabled", !writable);
  }
}

function renderHistoricalHabitCorrections(view: TodayView): void {
  if (!historicalHabitCorrections) return;
  historicalHabitCorrections.hidden = view.isToday;
  if (view.isToday) return;
  const corrections = view.habitCorrections;
  if (historicalHabitDate) historicalHabitDate.textContent = corrections.date;
  if (historicalHabitStatus) {
    if (historicalHabitCompletionStatus?.copyKey && historicalHabitCompletionStatus.error) {
      setCopyError(
        historicalHabitStatus,
        historicalHabitCompletionStatus.copyKey,
        historicalHabitCompletionStatus.error,
      );
    } else if (historicalHabitCompletionStatus?.copyKey) {
      setCopy(historicalHabitStatus, historicalHabitCompletionStatus.copyKey);
    } else if (corrections.namesConfigurationState === "invalid") {
      setCopy(historicalHabitStatus, "habits.namesConfigInvalid");
    } else {
      setAppMessage(historicalHabitStatus, corrections.message);
    }
    historicalHabitStatus.dataset.state =
      historicalHabitCompletionStatus?.state ?? corrections.state;
  }
  if (historicalHabitBoundary) {
    setCopy(
      historicalHabitBoundary,
      corrections.canRecord ? "history.habitBoundary" : "history.futureBoundary",
    );
  }
  if (!historicalHabitList) return;
  const habits = corrections.habits.filter((habit) => habit.canRecordCompletion);
  historicalHabitList.replaceChildren(
    ...habits.map((habit) => {
      const presentation = historicalHabitCorrectionPresentation(habit);
      const row = document.createElement("article");
      row.className = "historical-habit-item";
      row.dataset.historicalHabitKey = habit.key;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = presentation.checked;
      checkbox.disabled =
        todayOperationCount > 0 ||
        !corrections.canRecord ||
        !presentation.writable ||
        !corrections.completionTargetBinding;
      checkbox.dataset.historicalHabitCompletionKey = habit.key;
      checkbox.dataset.historicalHabitCompletionDate = corrections.date;
      checkbox.setAttribute(
        "aria-label",
        t("history.recordHabitCompletion", {
          habit: habit.nameKnown ? displayHabitName(habit) : habit.key,
          date: corrections.date,
        }),
      );

      const body = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = habit.nameKnown
        ? displayHabitName(habit)
        : t("history.unknownHabitName", { key: habit.key });
      const meta = document.createElement("p");
      meta.className = "day-task-meta";
      meta.textContent = habit.goalLabel
        ? t("history.goal", {
            goal: localizeHabitGoalLabel(habit.goalLabel, currentInterfaceLanguage),
          })
        : t("history.goalUnknown");
      const explanation = document.createElement("small");
      setCopy(explanation, habitCompletionExplanationLabels[presentation.explanation], {
        sources:
          presentation.sourceLabels.join(currentInterfaceLanguage === "zh" ? "、" : ", ") ||
          t("habits.notDeclared"),
      });
      body.append(name, meta, explanation);

      if (habit.localChanges.length > 0) {
        const history = document.createElement("div");
        history.className = "historical-habit-change-history";
        const summary = document.createElement("p");
        summary.className = "historical-habit-change-summary";
        setCopy(summary, "history.changeHistory", { count: habit.localChangeCount });
        const changes = document.createElement("ul");
        changes.replaceChildren(
          ...habit.localChanges.map((change) => {
            const item = document.createElement("li");
            setCopy(
              item,
              change.state === "completed"
                ? "history.localCompletedAt"
                : "history.localWithdrawnAt",
              { changedAt: change.changedAt },
            );
            return item;
          }),
        );
        history.append(summary, changes);
        body.append(history);
      }
      row.append(checkbox, body);
      return row;
    }),
  );
  if (habits.length === 0) {
    const empty = document.createElement("p");
    empty.className = "day-task-empty";
    setCopy(empty, "history.noCompletionHabits");
    historicalHabitList.append(empty);
  }
}

function showTodayMutationCopy(
  key: InterfaceCopyKey,
  state: "ready" | "error",
  variables: Readonly<Record<string, string | number>> = {},
): void {
  if (todayStatus) {
    setCopy(todayStatus, key, variables);
    todayStatus.dataset.state = state;
  }
}

function showTodayMutationError(key: InterfaceCopyKey, error: unknown): void {
  if (todayStatus) {
    setCopyError(todayStatus, key, error);
    todayStatus.dataset.state = "error";
  }
}

function showTodayMutationApplicationMessage(
  message: string,
  state: "ready" | "error",
): void {
  if (todayStatus) {
    setAppMessage(todayStatus, message);
    todayStatus.dataset.state = state;
  }
}

function updateTodayOperationState(delta: number): void {
  todayOperationCount = Math.max(0, todayOperationCount + delta);
  const busy = todayOperationCount > 0;
  const taskBusy = taskOperationCount > 0;
  selectTodayVaultButton?.toggleAttribute(
    "disabled",
    busy || taskBusy || vaultSelectionInProgress,
  );
  refreshTodayButton?.toggleAttribute("disabled", busy || taskBusy);
  todayDaytimeForm?.querySelector("button")?.toggleAttribute("disabled", busy || taskBusy);
  todayEveningForm?.querySelector("button")?.toggleAttribute("disabled", busy || taskBusy);
  todayTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy;
  });
  todayTaskScheduled?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy;
  });
  todayTaskOverdue?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy;
  });
  calendarTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy;
  });
  calendarTaskList?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy;
  });
  historicalHabitList?.querySelectorAll("input").forEach((element) => {
    const correction = currentTodayView?.habitCorrections;
    (element as HTMLInputElement).disabled =
      busy ||
      !correction?.canRecord ||
      !correction.completionTargetBinding;
  });
}

function localOperationId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function setHistoricalHabitCompletion(
  habitKey: string,
  livedDate: string,
  completed: boolean,
): Promise<boolean> {
  const loaded = currentTodayView;
  const corrections = loaded?.habitCorrections;
  const habit = corrections?.habits.find((candidate) => candidate.key === habitKey);
  if (
    !loaded ||
    loaded.isToday ||
    loaded.date !== livedDate ||
    !corrections?.completionTargetBinding ||
    !corrections.canRecord ||
    !habit?.canRecordCompletion ||
    todayOperationCount > 0
  ) {
    historicalHabitCompletionStatus = {
      copyKey: "history.completionUnavailable",
      state: "error",
    };
    if (loaded) renderHistoricalHabitCorrections(loaded);
    return false;
  }
  const signature = `${corrections.completionTargetBinding}:${habitKey}:${livedDate}:${completed}`;
  const changeId = stableHabitCompletionOperationId(signature);
  const request = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  let operationSettled = false;
  const finishOperation = () => {
    if (operationSettled) return;
    operationSettled = true;
    updateTodayOperationState(-1);
  };
  historicalHabitCompletionStatus = {
    copyKey: "habits.completionSaving",
    state: "ready",
  };
  renderHistoricalHabitCorrections(loaded);
  try {
    await reconcileHabitCompletionWrite(
      window.__TAURI__.core.invoke<TodayView>("set_historical_habit_completion", {
        input: {
          habitKey,
          livedDate,
          completed,
          changeId,
          targetBinding: corrections.completionTargetBinding,
          expectedRevision: corrections.completionRevision,
        },
      }),
      {
        onPersisted: () => {
          finishOperation();
          habitCompletionOperationIds.delete(signature);
          if (!todayPresentationRequests.isCurrent(request)) {
            historicalHabitCompletionStatus = null;
          }
        },
        isPresentationCurrent: () => todayPresentationRequests.isCurrent(request),
        isTargetVisible: () =>
          currentWorkspaceDestination === "today" && currentTodayView?.date === livedDate,
        present: (view) => {
          const updatedHabit = view.habitCorrections.habits.find(
            (candidate) => candidate.key === habitKey,
          );
          const explanation = updatedHabit
            ? historicalHabitCorrectionPresentation(updatedHabit).explanation
            : "unknown";
          historicalHabitCompletionStatus = {
            copyKey:
              !completed && explanation === "withdrawn-external"
                ? "habits.completionWithdrawnStillExternal"
                : !completed && explanation === "external"
                  ? "habits.completionExternalUnchanged"
                  : completed
                    ? "habits.completionSaved"
                    : "habits.completionRemoved",
            state: "ready",
          };
          renderToday(view);
        },
        refresh: async () => {
          historicalHabitCompletionStatus = null;
          await refreshToday(livedDate, true);
        },
      },
    );
    return true;
  } catch (error) {
    finishOperation();
    if (todayPresentationRequests.isCurrent(request)) {
      historicalHabitCompletionStatus = {
        copyKey: "habits.completionSaveFailed",
        error: String(error),
        state: "error",
      };
      renderHistoricalHabitCorrections(loaded);
    } else if (
      currentWorkspaceDestination === "today" &&
      currentTodayView?.date === livedDate
    ) {
      historicalHabitCompletionStatus = null;
      await refreshToday(livedDate, true);
    }
    return false;
  } finally {
    finishOperation();
  }
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
    showTodayMutationCopy("today.openRecordFirst", "error");
    return false;
  }
  const category = selectedShortRecordCategory();
  const correctionId = correctingShortRecordId;
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await submitDatedNote<TodayView>(
      {
        date: loaded.date,
        targetBinding: loaded.targetBinding,
        revision: loaded.revision,
        records: loaded.daytime.shortRecords,
      },
      { content, category, correctionId },
      window.__TAURI__.core.invoke,
      localOperationId,
    );
    datedNoteDrafts.delete(loaded.targetBinding);
    correctingShortRecordId = null;
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      renderToday(preserveTodayDayTaskPlanError(loaded, view));
      showTodayMutationCopy(
        correctionId ? "today.correctionSaved" : "today.noteSaved",
        "ready",
      );
    }
    return true;
  } catch (error) {
    datedNoteDrafts.set(loaded.targetBinding, {
      content,
      category,
      correctionId,
    });
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      if (error instanceof DatedNoteTargetChangedError) {
        showTodayMutationApplicationMessage(error.message, "error");
      } else {
        showTodayMutationError("today.notSaved", error);
      }
    }
    return false;
  } finally {
    updateTodayOperationState(-1);
  }
}

async function saveTodayMutation(
  command: "append_daytime_update" | "update_evening_review",
  input: Record<string, unknown>,
  successMessage: InterfaceCopyKey,
): Promise<boolean> {
  const loaded = currentTodayView;
  if (!loaded?.revision || todayOperationCount > 0) {
    showTodayMutationCopy("today.refreshBeforeSave", "error");
    return false;
  }
  const expectedRevision = loaded.revision;
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>(command, {
      input: { ...input, expectedRevision },
    });
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      renderToday(preserveTodayDayTaskPlanError(loaded, view));
      showTodayMutationCopy(successMessage, "ready");
    }
    return true;
  } catch (error) {
    if (todayPresentationRequests.isCurrent(presentationRequest)) {
      showTodayMutationError("today.notSaved", error);
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
      setCopyError(todayStatus, "today.loadFailed", error);
      todayStatus.dataset.state = "error";
    }
  } finally {
    updateTodayOperationState(-1);
  }
}

async function selectTodayVault(): Promise<void> {
  if (vaultSelectionInProgress) {
    return;
  }
  vaultSelectionInProgress = true;
  const selectionRequest = vaultSelectionRequests.begin();
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    await selectVaultAndRefresh(
      () =>
        window.__TAURI__.core.invoke<VaultSelectionResult<TodayView>>(
          "select_today_vault",
          { interfaceLanguage: currentInterfaceLanguage },
        ),
      {
        isCurrent: () => vaultSelectionRequests.isCurrent(selectionRequest),
        isPresentationCurrent: () => todayPresentationRequests.isCurrent(presentationRequest),
        currentDestination: () => currentWorkspaceDestination,
        waitForPendingWrites,
        renderPendingWriteFailure,
        prepareForVaultSwitch: (view) => {
          resetVaultScopedWorkspaceState();
          selectedTodayDate = null;
          currentTodayPhase = view.defaultPhase;
        },
        renderToday,
        renderWorkspaceContextStatus: () =>
          renderWorkspaceContextStatus(currentWorkspaceDestination),
        openCalendar,
        refreshHabits,
        refreshTasks,
      },
    );
  } catch (error) {
    if (vaultSelectionRequests.isCurrent(selectionRequest)) {
      renderVaultSelectionError(error);
    }
  } finally {
    vaultSelectionInProgress = false;
    updateTodayOperationState(-1);
  }
}

function renderVaultSelectionError(error: unknown): void {
  if (currentWorkspaceDestination === "tasks") {
    taskRequests.invalidate();
    if (tasksStatus) {
      setCopyError(tasksStatus, "settings.vaultSelectionError", error);
      tasksStatus.dataset.state = "error";
    }
    return;
  }
  if (currentWorkspaceDestination === "calendar") {
    calendarMonthRequests.invalidate();
    calendarSelectionRequests.invalidate();
    renderCalendarReadError(error, true, false);
    return;
  }
  if (currentWorkspaceDestination === "habits") {
    habitSnapshotRequests.invalidate();
    habitDateRequests.invalidate();
    habitCompletionRequests.invalidate();
    if (habitsStatus) {
      setCopyError(habitsStatus, "settings.vaultSelectionError", error);
      habitsStatus.dataset.state = "error";
    }
    return;
  }
  if (currentWorkspaceDestination === "settings") {
    if (settingsVaultStatus) {
      setCopyError(settingsVaultStatus, "settings.vaultSelectionError", error);
      settingsVaultStatus.dataset.state = "error";
    }
    return;
  }
  todayPresentationRequests.invalidate();
  if (todayStatus) {
    setCopyError(todayStatus, "settings.vaultSelectionError", error);
    todayStatus.dataset.state = "error";
  }
}

const calendarAvailabilityLabels: Record<
  DailyRecordAvailability,
  Readonly<{ label: InterfaceCopyKey; marker: InterfaceCopyKey | null }>
> = {
  missing: { label: "calendar.noRecord", marker: null },
  unreviewed: { label: "calendar.unreviewed", marker: "calendar.markerUnreviewed" },
  reviewed: { label: "calendar.reviewed", marker: "calendar.markerReviewed" },
  error: { label: "calendar.readError", marker: null },
};

function calendarDateLabel(date: string): string {
  return formatInterfaceDate(date, currentInterfaceLanguage);
}

function populateCalendarYears(centerYear: number): void {
  if (!calendarYear) {
    return;
  }
  calendarYear.replaceChildren(
    ...[centerYear - 1, centerYear, centerYear + 1].map((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = currentInterfaceLanguage === "zh" ? `${year} 年` : String(year);
      return option;
    }),
  );
  calendarYear.value = String(centerYear);
}

function renderCalendarGrid(month: CalendarMonthView): void {
  if (calendarMonthHeading) {
    calendarMonthHeading.textContent = formatInterfaceMonth(
      month.year,
      month.month,
      currentInterfaceLanguage,
    );
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
    calendarGrid.setAttribute(
      "aria-label",
      formatInterfaceMonth(month.year, month.month, currentInterfaceLanguage),
    );
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
        button.dataset.calendarTaskCount = String(
          day.taskSummaries.length + day.taskOverflowCount,
        );
        button.toggleAttribute("data-outside-month", !day.inMonth);
        button.toggleAttribute("data-selected", selected);
        button.classList.toggle(
          "has-calendar-tasks",
          day.taskSummaries.length + day.taskOverflowCount > 0,
        );
        const taskNames = day.taskSummaries
          .map((task) => `${task.name} · ${t(taskStateCopyKey(task.state))}`)
          .join(" · ");
        const taskOverflowLabel =
          day.taskOverflowCount > 0
            ? t("calendar.taskOverflow", { count: day.taskOverflowCount })
            : "";
        button.setAttribute(
          "aria-label",
          [
            calendarDateLabel(day.date),
            day.isToday ? t("calendar.today") : "",
            t(status.label),
            taskNames,
            taskOverflowLabel,
          ]
            .filter(Boolean)
            .join(" · "),
        );
        button.setAttribute("aria-pressed", String(selected));
        const top = document.createElement("span");
        top.className = "calendar-day-top";
        const number = document.createElement("strong");
        number.textContent = String(dayNumber);
        const todayLabel = document.createElement("small");
        if (day.isToday) setCopy(todayLabel, "calendar.today");
        top.append(number, todayLabel);
        const marker = document.createElement("span");
        marker.className = "calendar-day-marker";
        marker.dataset.availability = day.availability;
        if (status.marker) setCopy(marker, status.marker);
        marker.setAttribute("aria-hidden", "true");
        const taskSummaries = document.createElement("span");
        taskSummaries.className = "calendar-day-task-summaries";
        taskSummaries.replaceChildren(
          ...day.taskSummaries.map((task) => {
            const summary = document.createElement("span");
            summary.className = "calendar-day-task-summary";
            summary.dataset.calendarTaskSummary = task.id;
            summary.dataset.taskState = task.state;
            summary.textContent = task.name;
            summary.title = `${task.name} · ${t(taskStateCopyKey(task.state))}`;
            return summary;
          }),
        );
        const overflow = document.createElement("span");
        overflow.className = "calendar-day-task-overflow";
        overflow.dataset.calendarTaskOverflow = String(day.taskOverflowCount);
        if (day.taskOverflowCount > 0) {
          setCopy(overflow, "calendar.taskOverflow", { count: day.taskOverflowCount });
        }
        button.append(top, taskSummaries, overflow, marker);
        return button;
      }),
    );
  }
  renderWorkspaceRailContext("calendar");
}

function renderCalendarSummary(view: TodayView): void {
  currentCalendarSummaryView = view;
  renderWorkspaceRailContext("calendar");
  if (calendarSummaryHeading) {
    calendarSummaryHeading.textContent = calendarDateLabel(view.date);
  }
  const availability = view.dailyRecordAvailability;
  if (calendarSummaryStatus) {
    setCopy(calendarSummaryStatus, calendarAvailabilityLabels[availability].label);
    calendarSummaryStatus.dataset.availability = availability;
  }
  if (calendarOpenDay) {
    calendarOpenDay.disabled = view.state === "unconfigured";
  }
  renderCalendarTasks(view);
  if (!calendarSummaryCopy) {
    return;
  }
  const heading = document.createElement("strong");
  const copy = document.createElement("p");
  const detail = document.createElement("small");
  if (view.state === "ready" && availability === "reviewed") {
    setCopy(heading, "calendar.eveningSummary");
    copy.textContent =
      view.evening.account[0] ??
      view.evening.summary[0] ??
      view.evening.comparison[0] ??
      t("calendar.hasReview");
    setCopy(detail, "calendar.reviewDetail", { count: view.daytime.updates.length });
  } else if (view.state === "ready") {
    setCopy(heading, "calendar.dayStatus");
    setCopy(copy, "calendar.noReviewCopy");
    setCopy(detail, "calendar.daytimeDetail", { count: view.daytime.updates.length });
  } else if (view.state === "error") {
    setCopy(heading, "calendar.readError");
    setAppMessage(copy, view.message);
    setCopy(detail, "calendar.errorIsolation");
  } else if (view.state === "unconfigured") {
    setCopy(heading, "calendar.vaultNotSelected");
    setCopy(copy, "calendar.chooseVaultInToday");
    setCopy(detail, "calendar.readOnly");
  } else {
    setCopy(heading, "calendar.blankDate");
    setCopy(copy, "calendar.blankCopy");
    setCopy(detail, "calendar.unknownBoundary");
  }
  calendarSummaryCopy.replaceChildren(heading, copy, detail);
}

function renderCalendarTasks(view: TodayView): void {
  clearTaskEditorDialogs("calendar");
  const shared = view.tasks;
  const tasks = calendarTasksForDate(shared.tasks, view.date);
  const writable =
    Boolean(shared.targetBinding) &&
    shared.state !== "error" &&
    shared.state !== "unconfigured" &&
    taskOperationCount === 0;
  if (calendarTaskPanel) {
    calendarTaskPanel.hidden = false;
  }
  if (calendarTaskCount) {
    setCopy(calendarTaskCount, "calendar.taskCount", { count: tasks.length });
  }
  if (calendarTaskStatus) {
    if (shared.state === "error") {
      setCopyError(calendarTaskStatus, "tasks.loadFailed", shared.message);
    } else if (shared.state === "unconfigured") {
      setCopy(calendarTaskStatus, "settings.noVault");
    } else if (tasks.length > 0) {
      setCopy(calendarTaskStatus, "calendar.taskReady");
    } else {
      setCopy(calendarTaskStatus, "calendar.taskEmpty");
    }
    calendarTaskStatus.dataset.state = shared.state;
  }
  if (calendarTaskEmpty) {
    calendarTaskEmpty.hidden =
      tasks.length > 0 || shared.state === "error" || shared.state === "unconfigured";
  }
  if (calendarTaskList) {
    calendarTaskList.replaceChildren(
      ...tasks.map((task) => taskEditor(task, writable, shared, "calendar")),
    );
  }
  const draftKey = shared.targetBinding
    ? calendarTaskCreateDraftKey(shared.targetBinding, view.date)
    : null;
  const draft = draftKey ? calendarTaskCreateDrafts.get(draftKey) : undefined;
  calendarTaskCreateForm?.toggleAttribute("hidden", !writable);
  calendarTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      !writable;
  });
  if (calendarTaskCreateForm) {
    renderTaskListSelect(calendarTaskCreateList, shared, draft?.listId ?? "inbox");
    const selectedCreateList = taskListForId(shared, calendarTaskCreateList?.value ?? "inbox");
    if (selectedCreateList && calendarTaskCreateSubmit) {
      setRawText(
        calendarTaskCreateSubmit,
        selectedCreateList.id === "inbox"
          ? t("tasks.add")
          : t("tasks.addToList", { list: selectedCreateList.name }),
      );
    }
    if (calendarTaskCreateName) calendarTaskCreateName.value = draft?.name ?? "";
    if (calendarTaskCreateContent) calendarTaskCreateContent.value = draft?.content ?? "";
    if (calendarTaskCreateDate) calendarTaskCreateDate.value = draft?.date ?? view.date;
    if (calendarTaskCreateTime) calendarTaskCreateTime.value = draft?.time ?? "";
    normalizeTaskDateTimeFields(calendarTaskCreateDate, calendarTaskCreateTime, !writable);
    calendarTaskCreateSubmit?.toggleAttribute("disabled", !writable);
  }
}

function renderCalendarTaskLoading(): void {
  if (calendarTaskPanel) calendarTaskPanel.hidden = false;
  if (calendarTaskCount) calendarTaskCount.textContent = "";
  if (calendarTaskStatus) {
    setCopy(calendarTaskStatus, "common.loading");
    calendarTaskStatus.dataset.state = "loading";
  }
  calendarTaskList?.replaceChildren();
  if (calendarTaskEmpty) calendarTaskEmpty.hidden = true;
  calendarTaskCreateForm?.toggleAttribute("hidden", true);
}

function renderCalendarTaskError(error: unknown): void {
  if (calendarTaskPanel) calendarTaskPanel.hidden = false;
  if (calendarTaskCount) calendarTaskCount.textContent = "";
  if (calendarTaskStatus) {
    setCopyError(calendarTaskStatus, "tasks.loadFailed", error);
    calendarTaskStatus.dataset.state = "error";
  }
  calendarTaskList?.replaceChildren();
  if (calendarTaskEmpty) calendarTaskEmpty.hidden = true;
  calendarTaskCreateForm?.toggleAttribute("hidden", true);
}

function renderCalendarReadError(
  error: unknown,
  vaultSelectionFailed = false,
  clearContent = true,
): void {
  calendarTaskRequests.invalidate();
  currentCalendarSummaryView = null;
  if (clearContent) {
    calendarGrid?.replaceChildren();
    currentCalendarMonth = null;
  }
  if (calendarStatus) {
    setCopyError(calendarStatus, "calendar.loadFailed", error);
    calendarStatus.dataset.state = "error";
  }
  if (calendarSummaryHeading) {
    setCopy(
      calendarSummaryHeading,
      vaultSelectionFailed ? "calendar.vaultSelectionFailed" : "calendar.readFailed",
    );
  }
  if (calendarSummaryStatus) {
    setCopy(calendarSummaryStatus, "calendar.readError");
    calendarSummaryStatus.dataset.availability = "error";
  }
  if (calendarSummaryCopy) {
    const heading = document.createElement("strong");
    setCopy(heading, vaultSelectionFailed ? "calendar.vaultSelectionFailed" : "calendar.readError");
    const copy = document.createElement("p");
    setCopyError(copy, "common.errorDetail", error);
    const detail = document.createElement("small");
    setCopy(detail, "calendar.retry");
    calendarSummaryCopy.replaceChildren(heading, copy, detail);
  }
  if (calendarOpenDay) {
    calendarOpenDay.disabled = true;
  }
  renderCalendarTaskError(error);
}

async function selectCalendarDate(date: string): Promise<void> {
  const selectionRequest = calendarSelectionRequests.begin();
  stashCalendarTaskCreateDraft();
  taskEditorForms("calendar").forEach(stashTaskEditDraft);
  calendarTaskRequests.invalidate();
  selectedCalendarDate = date;
  currentCalendarSummaryView = null;
  renderCalendarTaskLoading();
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
    const view = await window.__TAURI__.core.invoke<TodayView>("read_daily_view", { date });
    if (
      !calendarSelectionRequests.isCurrent(selectionRequest) ||
      selectedCalendarDate !== date
    ) {
      return;
    }
    renderCalendarSummary(view);
    if (calendarStatus) {
      setCopy(calendarStatus, "calendar.selected", { date: calendarDateLabel(date) });
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
      setCopy(calendarSummaryStatus, "calendar.readError");
      calendarSummaryStatus.dataset.availability = "error";
    }
    if (calendarSummaryCopy) {
      const heading = document.createElement("strong");
      setCopy(heading, "calendar.readError");
      const copy = document.createElement("p");
      setCopyError(copy, "common.errorDetail", error);
      calendarSummaryCopy.replaceChildren(heading, copy);
    }
    if (calendarStatus) {
      setCopy(calendarStatus, "calendar.dateFailed", { date });
      calendarStatus.dataset.state = "error";
    }
    renderCalendarTaskError(error);
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
      if (!view.configured) {
        setCopy(calendarStatus, "calendar.connectStatus");
        calendarStatus.dataset.state = "unconfigured";
      } else if (view.taskState === "error") {
        setCopyError(calendarStatus, "calendar.taskSourceLoadFailed", view.taskMessage);
        calendarStatus.dataset.state = "error";
      } else {
        setCopy(calendarStatus, "calendar.previewStatus");
        calendarStatus.dataset.state = "ready";
      }
    }
    return view;
  } catch (error) {
    if (
      calendarMonthRequests.isCurrent(monthRequest) &&
      currentWorkspaceDestination === "calendar"
    ) {
      renderCalendarReadError(error);
    }
    return null;
  }
}

async function openCalendar(): Promise<void> {
  try {
    if (!selectedCalendarDate) {
      const selectionRequest = calendarSelectionRequests.begin();
      const today = await window.__TAURI__.core.invoke<TodayView>("read_daily_view", {
        date: null,
      });
      if (
        !calendarSelectionRequests.isCurrent(selectionRequest) ||
        currentWorkspaceDestination !== "calendar" ||
        selectedCalendarDate
      ) {
        return;
      }
      selectedCalendarDate = today.date;
      const [year, month] = today.date.split("-").map(Number);
      populateCalendarYears(year);
      const monthView = await refreshCalendarMonth(year, month);
      if (
        !monthView ||
        !calendarSelectionRequests.isCurrent(selectionRequest) ||
        currentWorkspaceDestination !== "calendar" ||
        selectedCalendarDate !== today.date
      ) {
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
  } catch (error) {
    if (currentWorkspaceDestination === "calendar") {
      renderCalendarReadError(error);
    }
  }
}

async function chooseCalendarMonth(
  year: number,
  month: number,
  date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`,
): Promise<void> {
  calendarSelectionRequests.invalidate();
  stashCalendarTaskCreateDraft();
  taskEditorForms("calendar").forEach(stashTaskEditDraft);
  calendarTaskRequests.invalidate();
  selectedCalendarDate = date;
  currentCalendarSummaryView = null;
  renderCalendarTaskLoading();
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
  const today = await window.__TAURI__.core.invoke<TodayView>("read_daily_view", {
    date: null,
  });
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

const habitStatusLabels: Record<HabitCellStatus, InterfaceCopyKey> = {
  unknown: "habits.unknown",
  completed: "habits.completed",
  notDone: "habits.notDone",
  conflict: "habits.conflict",
  partial: "habits.partial",
  baseline: "habits.baseline",
  unavailable: "habits.unavailable",
  actualTime: "habits.actualTime",
  thresholdOnly: "habits.thresholdOnly",
  recordOnly: "habits.recordOnly",
};

const habitCompletionExplanationLabels: Record<
  HabitCompletionExplanation,
  InterfaceCopyKey
> = {
  unknown: "habits.completionUnknown",
  external: "habits.completionExternal",
  local: "habits.completionLocal",
  "local-and-external": "habits.completionLocalExternal",
  withdrawn: "habits.completionWithdrawn",
  "withdrawn-external": "habits.completionWithdrawnExternal",
};

function habitProgressLabel(habit: HabitView): string {
  if (habit.completedCount === null) {
    return habit.today.actualTimeLabel
      ? localizeHabitActualTimeLabel(habit.today.actualTimeLabel, currentInterfaceLanguage)
      : t("habits.actualUnknown");
  }
  if (habit.weeklyTarget === null) {
    return t("habits.noGoal", { count: habit.completedCount });
  }
  return `${habit.completedCount} / ${habit.weeklyTarget}`;
}

function habitCellButton(
  habit: HabitView,
  cell: HabitCellView,
  compact: boolean,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `habit-cell status-${cell.status}${
    cell.date === habit.today.date ? " is-today" : ""
  }`;
  button.dataset.habitKey = habit.key;
  button.dataset.habitDate = cell.date;
  button.dataset.habitDetails = JSON.stringify(cell.details);
  button.setAttribute(
    "aria-label",
    `${cell.date} · ${displayHabitName(habit)} · ${t(habitStatusLabels[cell.status])} · ${t(
      "habits.coverageAria",
      { coverage: cell.coverage },
    )}${
      cell.date === habit.today.date ? ` · ${t("calendar.today")}` : ""
    }`,
  );
  button.title = `${cell.date} · ${t(habitStatusLabels[cell.status])}`;
  if (compact) {
    const weekdayKeys: InterfaceCopyKey[] = [
      "calendar.weekSun",
      "calendar.weekMon",
      "calendar.weekTue",
      "calendar.weekWed",
      "calendar.weekThu",
      "calendar.weekFri",
      "calendar.weekSat",
    ];
    const weekday = weekdayKeys[new Date(`${cell.date}T00:00:00Z`).getUTCDay()];
    const label = document.createElement("small");
    if (weekday) setCopy(label, weekday);
    button.append(label);
  }
  const mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = cell.hasRecord ? "•" : "";
  button.append(mark);
  return button;
}

function habitCompletionControl(habit: HabitView): HTMLElement {
  const control = document.createElement("div");
  control.className = "habit-completion-control";
  if (!habit.canRecordCompletion) {
    control.setAttribute("aria-hidden", "true");
    return control;
  }
  const presentation = habitCompletionPresentation(habit.today);
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = presentation.checked;
  input.disabled =
    habitCompletionOperationCount > 0 ||
    !currentHabitSnapshot?.completionTargetBinding ||
    !["ready", "stale"].includes(currentHabitSnapshot.state);
  input.dataset.habitCompletionKey = habit.key;
  input.dataset.habitCompletionDate = habit.today.date;
  input.setAttribute("aria-label", t("habits.recordCompletion", { habit: displayHabitName(habit) }));
  input.title = t("habits.recordCompletion", { habit: displayHabitName(habit) });
  const explanation = document.createElement("small");
  setCopy(explanation, habitCompletionExplanationLabels[presentation.explanation], {
    sources:
      presentation.sourceLabels.join(currentInterfaceLanguage === "zh" ? "、" : ", ") ||
      t("habits.notDeclared"),
  });
  control.append(input, explanation);
  return control;
}

function habitRow(habit: HabitView): HTMLElement {
  const article = document.createElement("article");
  article.className = "habit-snapshot-row";
  article.dataset.habitKey = habit.key;
  const identity = document.createElement("div");
  identity.className = "habit-snapshot-identity";
  const name = document.createElement("strong");
  const metadata = document.createElement("p");
  const sources = document.createElement("small");
  name.textContent = displayHabitName(habit);
  metadata.textContent = `${localizeHabitGoalLabel(habit.goalLabel, currentInterfaceLanguage)} · ${
    localizeHabitCoverageLabel(habit.coverageLabel, currentInterfaceLanguage)
  }`;
  setCopy(sources, "habits.sources", {
    sources: habit.sourceLabels.join(currentInterfaceLanguage === "zh" ? "、" : ", ") || t("habits.notDeclared"),
  });
  identity.append(name, metadata, sources);

  const value = document.createElement("div");
  value.className = "habit-snapshot-value";
  const progress = document.createElement("strong");
  const todayState = document.createElement("small");
  progress.textContent = habitProgressLabel(habit);
  setCopy(todayState, "habits.todayStatus", { status: t(habitStatusLabels[habit.today.status]) });
  value.append(progress, todayState);

  const completion = habitCompletionControl(habit);

  const recent = document.createElement("div");
  recent.className = "habit-recent";
  const recentLabel = document.createElement("span");
  setCopy(recentLabel, "habits.recent");
  const recentCells = document.createElement("div");
  recentCells.className = "habit-recent-cells";
  recentCells.replaceChildren(
    ...habit.recent.map((cell) => habitCellButton(habit, cell, true)),
  );
  recent.append(recentLabel, recentCells);

  const expand = document.createElement("button");
  expand.type = "button";
  expand.className = "habit-expand";
  expand.dataset.habitExpand = habit.key;
  expand.setAttribute("aria-expanded", "false");
  setCopy(expand, "habits.expand");

  const history = document.createElement("section");
  history.className = "habit-history";
  history.hidden = true;
  history.id = `habit-history-${habit.key}`;
  expand.setAttribute("aria-controls", history.id);
  const historyHeading = document.createElement("div");
  historyHeading.className = "habit-history-heading";
  const heading = document.createElement("strong");
  const caption = document.createElement("small");
  setCopy(heading, "habits.history");
  setCopy(caption, "habits.historyCaption");
  historyHeading.append(heading, caption);
  const grid = document.createElement("div");
  grid.className = "habit-history-grid";
  const weeks = Array.from({ length: 12 }, (_, week) =>
    habit.history.slice(week * 7, week * 7 + 7),
  );
  const months = document.createElement("div");
  months.className = "habit-history-months";
  const monthCorner = document.createElement("span");
  monthCorner.setAttribute("aria-hidden", "true");
  const monthLabels = weeks.map((week, index) => {
    const label = document.createElement("span");
    const month = week[0]?.date.slice(5, 7);
    const previousMonth = weeks[index - 1]?.[0]?.date.slice(5, 7);
    label.textContent = index === 0 || month !== previousMonth
      ? currentInterfaceLanguage === "zh"
        ? `${Number(month)} 月`
        : new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })
            .format(new Date(Date.UTC(2026, Number(month) - 1, 1)))
      : "";
    return label;
  });
  months.replaceChildren(monthCorner, ...monthLabels);
  const weekdayLabels: InterfaceCopyKey[] = [
    "calendar.weekMon",
    "calendar.weekTue",
    "calendar.weekWed",
    "calendar.weekThu",
    "calendar.weekFri",
    "calendar.weekSat",
    "calendar.weekSun",
  ];
  for (const [weekday, weekdayLabel] of weekdayLabels.entries()) {
    const label = document.createElement("span");
    label.className = "habit-history-weekday";
    setCopy(label, weekdayLabel);
    grid.append(label);
    for (const week of weeks) {
      const cell = week[weekday];
      if (cell) grid.append(habitCellButton(habit, cell, false));
    }
  }
  const goalContext = document.createElement("p");
  goalContext.className = "habit-goal-context";
  setCopy(
    goalContext,
    habit.goalHistory.length ? "habits.historyContext" : "habits.noHistoryContext",
    habit.goalHistory.length
      ? {
          context: habit.goalHistory
            .map((context) => `${context.weekOf} ${context.label} ${
              localizeHabitGoalLabel(context.goalLabel, currentInterfaceLanguage)
            }`)
            .join(currentInterfaceLanguage === "zh" ? "；" : "; "),
        }
      : {},
  );
  const detail = document.createElement("div");
  detail.className = "habit-cell-detail";
  detail.dataset.habitDetail = habit.key;
  detail.setAttribute("role", "status");
  setCopy(detail, "habits.chooseHistory");
  history.append(historyHeading, months, grid, goalContext, detail);
  article.append(identity, value, completion, recent, expand, history);
  return article;
}

function selectedHabitContext(): Readonly<{
  habit: HabitView;
  cell: HabitCellView;
  row: HTMLElement;
  detail: HTMLElement;
}> | null {
  if (!selectedHabitCell || !currentHabitSnapshot) return null;
  const habit = currentHabitSnapshot.habits.find(
    (candidate) => candidate.key === selectedHabitCell?.habitKey,
  );
  const cell = habit?.history.find(
    (candidate) => candidate.date === selectedHabitCell?.date,
  );
  const row = [...(habitsDestination?.querySelectorAll<HTMLElement>(".habit-snapshot-row") ?? [])]
    .find((candidate) => candidate.dataset.habitKey === selectedHabitCell?.habitKey);
  const detail = row?.querySelector<HTMLElement>(".habit-cell-detail");
  if (!habit || !cell || !row || !detail) return null;
  return { habit, cell, row, detail };
}

function habitExerciseRecordArticle(record: ShortRecordView): HTMLElement {
  const article = document.createElement("article");
  article.className = "habit-note-record";
  const text = document.createElement("p");
  text.textContent = record.text;
  const meta = document.createElement("small");
  setCopy(meta, "today.recordMeta", {
    category: t("today.exercise"),
    date: record.date,
    createdAt: record.createdAt,
  });
  const correct = document.createElement("button");
  correct.type = "button";
  correct.dataset.habitCorrectRecordId = record.id;
  setCopy(correct, "today.correctThis");
  article.append(text, meta, correct);
  if (record.changes.length > 0) {
    const changes = document.createElement("details");
    const summary = document.createElement("summary");
    setCopy(summary, "today.changeHistory", { count: record.changes.length });
    changes.append(summary);
    for (const change of record.changes) {
      const line = document.createElement("p");
      line.textContent = `${change.modifiedAt} · ${change.oldText} → ${change.newText}`;
      changes.append(line);
    }
    article.append(changes);
  }
  return article;
}

function habitExerciseEditor(date: string, cell: HabitCellView): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "habit-note-editor";
  const view = currentHabitDateView?.date === date ? currentHabitDateView : null;
  const binding = view?.targetBinding ?? null;
  const draft = binding ? habitNoteDrafts.get(binding) : undefined;
  const exerciseRecords = view?.daytime.shortRecords.filter(
    (record) => record.category === "exercise",
  );
  const heading = document.createElement("strong");
  heading.textContent = `${t(draft?.correctionId ? "today.correctRecord" : "today.writeShort")} · ${date}`;
  const association = document.createElement("p");
  association.className = "habit-note-association";
  setCopy(association, "habits.exerciseAssociation");
  panel.append(heading, association);

  const records = document.createElement("div");
  records.className = "habit-note-records";
  if (exerciseRecords) {
    if (exerciseRecords.length > 0) {
      records.replaceChildren(...exerciseRecords.map(habitExerciseRecordArticle));
    } else {
      const empty = document.createElement("p");
      setCopy(empty, "habits.noExerciseNotes");
      records.replaceChildren(empty);
    }
  } else if (cell.localRecords.length > 0) {
    records.replaceChildren(
      ...cell.localRecords.map((record) => {
        const line = document.createElement("p");
        line.textContent = record.text;
        return line;
      }),
    );
  } else {
    setCopy(records, "habits.loadingDate");
  }
  panel.append(records);

  if (view?.targetBinding && view.canRecord) {
    const form = document.createElement("form");
    form.dataset.habitNoteForm = "";
    const label = document.createElement("label");
    setCopy(label, "habits.recordContent");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 500;
    input.required = true;
    input.autocomplete = "off";
    input.placeholder = t("habits.exercisePlaceholder");
    input.dataset.i18nPlaceholder = "habits.exercisePlaceholder";
    input.dataset.habitNoteInput = "";
    input.dataset.i18nAriaLabel = "habits.exerciseNoteText";
    input.setAttribute("aria-label", t("habits.exerciseNoteText"));
    input.value = draft?.content ?? "";
    label.append(input);
    const actions = document.createElement("div");
    actions.className = "habit-note-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.disabled = habitDateOperationCount > 0;
    setCopy(save, draft?.correctionId ? "today.saveCorrection" : "today.saveRecord");
    actions.append(save);
    if (draft?.correctionId) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "secondary-button";
      cancel.dataset.habitCancelCorrection = "";
      setCopy(cancel, "today.cancelCorrection");
      actions.append(cancel);
    }
    const target = document.createElement("small");
    setCopy(target, "today.noteTarget", { date });
    form.append(label, actions, target);
    panel.append(form);
  } else if (view && !view.canRecord) {
    const boundary = document.createElement("p");
    setCopy(boundary, "habits.futureBoundary");
    panel.append(boundary);
  }

  if (habitNoteStatus) {
    const status = document.createElement("p");
    status.className = "habit-note-status";
    status.dataset.state = habitNoteStatus.state;
    status.setAttribute("role", "status");
    if (habitNoteStatus.copyKey && habitNoteStatus.error) {
      setCopyError(status, habitNoteStatus.copyKey, habitNoteStatus.error);
    } else if (habitNoteStatus.copyKey) {
      setCopy(status, habitNoteStatus.copyKey);
    } else if (habitNoteStatus.applicationMessage) {
      setAppMessage(status, habitNoteStatus.applicationMessage);
    }
    panel.append(status);
  }
  return panel;
}

function renderSelectedHabitCell(): void {
  const context = selectedHabitContext();
  if (!context) return;
  const { habit, cell, row, detail } = context;
  const history = row.querySelector<HTMLElement>(".habit-history");
  const recent = row.querySelector<HTMLElement>(".habit-recent");
  const expand = row.querySelector<HTMLButtonElement>("button[data-habit-expand]");
  if (history) history.hidden = false;
  if (recent) recent.hidden = true;
  row.classList.add("is-expanded");
  expand?.setAttribute("aria-expanded", "true");
  if (expand) setCopy(expand, "habits.collapse");

  const heading = document.createElement("strong");
  const state = document.createElement("span");
  const details = document.createElement("ul");
  heading.textContent = `${cell.date} · ${displayHabitName(habit)}`;
  setCopy(state, "habits.statusCoverage", {
    status: t(habitStatusLabels[cell.status]),
    coverage: cell.coverage,
  });
  details.replaceChildren(
    ...cell.details.map((line) => {
      const item = document.createElement("li");
      item.textContent = localizeHabitDetail(line, currentInterfaceLanguage);
      return item;
    }),
  );
  detail.replaceChildren(heading, state, details);
  if (habit.key === "exercise") {
    detail.append(habitExerciseEditor(cell.date, cell));
  }
}

async function loadSelectedHabitDate(habitKey: string, date: string): Promise<void> {
  selectedHabitCell = { habitKey, date };
  currentHabitDateView = null;
  habitNoteStatus = null;
  renderSelectedHabitCell();
  if (habitKey !== "exercise") return;
  const request = habitDateRequests.begin();
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>("read_daily_view", { date });
    if (
      !habitDateRequests.isCurrent(request) ||
      selectedHabitCell?.habitKey !== habitKey ||
      selectedHabitCell.date !== date
    ) {
      return;
    }
    currentHabitDateView = view;
    renderSelectedHabitCell();
  } catch (error) {
    if (!habitDateRequests.isCurrent(request)) return;
    habitNoteStatus = {
      copyKey: "habits.loadDateFailed",
      error: String(error),
      state: "error",
    };
    renderSelectedHabitCell();
  }
}

function stashHabitNoteDraft(): void {
  const binding = currentHabitDateView?.targetBinding;
  const input = habitsDestination?.querySelector<HTMLInputElement>(
    "input[data-habit-note-input]",
  );
  if (!binding || !input) return;
  const previous = habitNoteDrafts.get(binding);
  if (input.value || previous?.correctionId) {
    habitNoteDrafts.set(binding, {
      content: input.value,
      correctionId: previous?.correctionId ?? null,
    });
  } else {
    habitNoteDrafts.delete(binding);
  }
}

async function saveHabitExerciseNote(): Promise<boolean> {
  const loaded = currentHabitDateView;
  const content = habitsDestination
    ?.querySelector<HTMLInputElement>("input[data-habit-note-input]")
    ?.value.trim() ?? "";
  if (!loaded?.targetBinding || !loaded.canRecord || !content || habitDateOperationCount > 0) {
    habitNoteStatus = { copyKey: "today.openRecordFirst", state: "error" };
    renderSelectedHabitCell();
    return false;
  }
  const draft = habitNoteDrafts.get(loaded.targetBinding);
  const correctionId = draft?.correctionId ?? null;
  habitNoteDrafts.set(loaded.targetBinding, {
    content,
    correctionId,
  });
  habitDateOperationCount += 1;
  const request = habitDateRequests.begin();
  renderSelectedHabitCell();
  try {
    const view = await submitDatedNote<TodayView>(
      {
        date: loaded.date,
        targetBinding: loaded.targetBinding,
        revision: loaded.revision,
        records: loaded.daytime.shortRecords,
      },
      { content, category: "exercise", correctionId },
      window.__TAURI__.core.invoke,
      localOperationId,
    );
    habitNoteDrafts.delete(loaded.targetBinding);
    if (habitDateRequests.isCurrent(request)) {
      currentHabitDateView = view;
      habitNoteStatus = {
        copyKey: correctionId ? "habits.correctionSaved" : "habits.noteSaved",
        state: "ready",
      };
    }
    await refreshHabits();
    return true;
  } catch (error) {
    if (habitDateRequests.isCurrent(request)) {
      habitNoteStatus = {
        ...(error instanceof DatedNoteTargetChangedError
          ? { applicationMessage: error.message }
          : { copyKey: "today.notSaved" as const, error: String(error) }),
        state: "error",
      };
      renderSelectedHabitCell();
    }
    return false;
  } finally {
    habitDateOperationCount = Math.max(0, habitDateOperationCount - 1);
    if (habitDateRequests.isCurrent(request)) renderSelectedHabitCell();
  }
}

function stableHabitCompletionOperationId(signature: string): string {
  const existing = habitCompletionOperationIds.get(signature);
  if (existing) return existing;
  const created = localOperationId("habit-completion");
  habitCompletionOperationIds.set(signature, created);
  return created;
}

async function setLocalHabitCompletion(
  habitKey: string,
  livedDate: string,
  completed: boolean,
): Promise<boolean> {
  const loaded = currentHabitSnapshot;
  const habit = loaded?.habits.find((candidate) => candidate.key === habitKey);
  if (
    !loaded?.completionTargetBinding ||
    !habit?.canRecordCompletion ||
    habit.today.date !== livedDate ||
    habitCompletionOperationCount > 0
  ) {
    habitCompletionStatus = { copyKey: "habits.completionUnavailable", state: "error" };
    if (loaded) renderHabitSnapshot(loaded);
    return false;
  }
  const signature = `${loaded.completionTargetBinding}:${habitKey}:${livedDate}:${completed}`;
  const changeId = stableHabitCompletionOperationId(signature);
  const request = habitCompletionRequests.begin();
  habitCompletionOperationCount += 1;
  let operationSettled = false;
  const finishOperation = () => {
    if (operationSettled) return;
    operationSettled = true;
    habitCompletionOperationCount = Math.max(0, habitCompletionOperationCount - 1);
  };
  habitCompletionStatus = { copyKey: "habits.completionSaving", state: "ready" };
  renderHabitSnapshot(loaded);
  try {
    await reconcileHabitCompletionWrite(
      window.__TAURI__.core.invoke<HabitSnapshotView>(
        "set_local_habit_completion",
        {
          input: {
            habitKey,
            livedDate,
            completed,
            changeId,
            targetBinding: loaded.completionTargetBinding,
            expectedRevision: loaded.completionRevision,
          },
        },
      ),
      {
        onPersisted: () => {
          finishOperation();
          habitCompletionOperationIds.delete(signature);
          if (!habitCompletionRequests.isCurrent(request)) {
            habitCompletionStatus = null;
          }
        },
        isPresentationCurrent: () => habitCompletionRequests.isCurrent(request),
        isTargetVisible: () => currentWorkspaceDestination === "habits",
        present: (view) => {
          const updatedHabit = view.habits.find((candidate) => candidate.key === habitKey);
          const explanation = updatedHabit
            ? habitCompletionPresentation(updatedHabit.today).explanation
            : "unknown";
          habitCompletionStatus = {
            copyKey:
              !completed && explanation === "withdrawn-external"
                ? "habits.completionWithdrawnStillExternal"
                : !completed && explanation === "external"
                  ? "habits.completionExternalUnchanged"
                  : completed
                    ? "habits.completionSaved"
                    : "habits.completionRemoved",
            state: "ready",
          };
          renderHabitSnapshot(view);
        },
        refresh: async () => {
          habitCompletionStatus = null;
          await refreshHabits();
        },
      },
    );
    return true;
  } catch (error) {
    finishOperation();
    if (habitCompletionRequests.isCurrent(request)) {
      habitCompletionStatus = {
        copyKey: "habits.completionSaveFailed",
        error: String(error),
        state: "error",
      };
      renderHabitSnapshot(loaded);
    } else if (currentWorkspaceDestination === "habits") {
      habitCompletionStatus = null;
      await refreshHabits();
    }
    return false;
  } finally {
    finishOperation();
  }
}

function renderHabitSnapshot(view: HabitSnapshotView): void {
  currentHabitSnapshot = view;
  renderWorkspaceRailContext("habits");
  renderWorkspaceContextStatus(currentWorkspaceDestination);
  if (habitsStatus) {
    if (habitCompletionStatus?.copyKey && habitCompletionStatus.error) {
      setCopyError(
        habitsStatus,
        habitCompletionStatus.copyKey,
        habitCompletionStatus.error,
      );
    } else if (habitCompletionStatus?.copyKey) {
      setCopy(habitsStatus, habitCompletionStatus.copyKey);
    } else if (view.namesConfigurationState === "invalid") {
      setCopy(habitsStatus, "habits.namesConfigInvalid");
    } else if (view.readError) {
      setCopyError(habitsStatus, "habits.loadFailed", view.readError);
    } else {
      setAppMessage(habitsStatus, view.message);
    }
    habitsStatus.dataset.state = habitCompletionStatus?.state ?? view.state;
  }
  if (habitsRange) {
    setCopy(
      habitsRange,
      view.displayRangeLabel && view.rangeLabel ? "habits.range" : "habits.waitingSnapshot",
      view.displayRangeLabel && view.rangeLabel
        ? { display: view.displayRangeLabel, range: view.rangeLabel }
        : {},
    );
  }
  const hasSnapshot = view.habits.length > 0;
  if (habitsReady) habitsReady.hidden = !hasSnapshot;
  if (habitsEmpty) habitsEmpty.hidden = hasSnapshot;
  if (!hasSnapshot) {
    if (habitsEmptyHeading) {
      setCopy(
        habitsEmptyHeading,
        view.state === "unconfigured" ? "settings.noVault" : "habits.noHabitsSnapshot",
      );
    }
    if (view.readError) {
      setCopyError(habitsEmptyCopy, "habits.loadFailed", view.readError);
    } else {
      setAppMessage(habitsEmptyCopy, view.message);
    }
    return;
  }
  if (habitsSummaryTotal) {
    habitsSummaryTotal.textContent = `${view.summary.knownCompletions} / ${view.summary.targetCompletions}`;
  }
  if (habitsSummaryNote) {
    const noGoal = view.summary.excludedNoGoal
      ? t("habits.noGoalExcluded", { count: view.summary.excludedNoGoal })
      : "";
    habitsSummaryNote.textContent = `${applicationMessage(view.summary.coverageNote)}${noGoal}`;
  }
  if (habitsGeneratedAt) habitsGeneratedAt.textContent = view.generatedAt ?? t("common.unknown");
  if (habitsProducer) habitsProducer.textContent = view.producerLabel ?? t("common.unknown");
  if (habitsTodayDate) habitsTodayDate.textContent = view.habits[0]?.today.date ?? "—";
  if (habitsSummaryRows) {
    habitsSummaryRows.replaceChildren(
      ...view.habits
        .filter((habit) => habit.goalKind === "weekly-count")
        .map((habit) => {
          const row = document.createElement("div");
          const label = document.createElement("span");
          const value = document.createElement("strong");
          const kind = document.createElement("small");
          row.className = "habits-summary-row";
          label.textContent = displayHabitName(habit);
          value.textContent = habitProgressLabel(habit);
          kind.textContent = localizeHabitGoalLabel(habit.goalLabel, currentInterfaceLanguage);
          row.append(label, value, kind);
          return row;
        }),
    );
  }
  if (habitsDailyList) {
    habitsDailyList.replaceChildren(
      ...view.habits
        .filter((habit) => habit.goalKind !== "weekly-count")
        .map(habitRow),
    );
  }
  if (habitsWeeklyList) {
    habitsWeeklyList.replaceChildren(
      ...view.habits
        .filter((habit) => habit.goalKind === "weekly-count")
        .map(habitRow),
    );
  }
  renderSelectedHabitCell();
}

async function refreshHabits(): Promise<void> {
  const request = habitSnapshotRequests.begin();
  if (habitsStatus) {
    setCopy(habitsStatus, "habits.loadingLocal");
    habitsStatus.dataset.state = "loading";
  }
  try {
    const view = await window.__TAURI__.core.invoke<HabitSnapshotView>("habit_snapshot");
    if (!habitSnapshotRequests.isCurrent(request)) return;
    renderHabitSnapshot(view);
  } catch (error) {
    if (!habitSnapshotRequests.isCurrent(request)) return;
    renderHabitSnapshot({
      state: "error",
      message: String(error),
      readError: String(error),
      generatedAt: null,
      displayRangeLabel: null,
      rangeLabel: null,
      producerLabel: null,
      completionRevision: null,
      completionTargetBinding: null,
      namesConfigurationState: "missing",
      summary: {
        knownCompletions: 0,
        targetCompletions: 0,
        coverageNote: "",
        excludedNoGoal: 0,
      },
      habits: [],
    });
  }
}

function taskDraftKey(targetBinding: string, taskId: string): string {
  return targetBinding + ":" + taskId;
}

function readTaskDraft(form: HTMLFormElement): TaskDraft {
  const name = form.querySelector<HTMLInputElement>("[data-task-name]")?.value ?? "";
  const content = form.querySelector<HTMLTextAreaElement>("[data-task-content]")?.value ?? "";
  const date = form.querySelector<HTMLInputElement>("[data-task-date]")?.value ?? "";
  const time = form.querySelector<HTMLInputElement>("[data-task-time]")?.value ?? "";
  const listId = form.querySelector<HTMLSelectElement>("[data-task-list]")?.value || null;
  const completionDate =
    form.querySelector<HTMLInputElement>("[data-task-completion-date]")?.value ?? "";
  const completionTime =
    form.querySelector<HTMLInputElement>("[data-task-completion-time]")?.value ?? "";
  return { name, content, date, time, listId, completionDate, completionTime };
}

function isBlankTaskDraft(draft: TaskDraft): boolean {
  return (
    !draft.name &&
    !draft.content &&
    !draft.date &&
    !draft.time &&
    !draft.completionDate &&
    !draft.completionTime
  );
}

function normalizeTaskDateTimeFields(
  dateInput: HTMLInputElement | null,
  timeInput: HTMLInputElement | null,
  forceTimeDisabled = false,
): void {
  if (!dateInput || !timeInput) return;
  const normalized = normalizeTaskSchedule(dateInput.value, timeInput.value);
  dateInput.value = normalized.date ?? "";
  timeInput.value = normalized.time ?? "";
  timeInput.disabled = forceTimeDisabled || normalized.timeDisabled;
}

function stashTaskCreateDraft(): void {
  const binding = currentTasksView?.targetBinding;
  if (!binding || !taskCreateForm) return;
  const draft = readTaskDraft(taskCreateForm);
  if (isBlankTaskDraft(draft)) {
    taskCreateDrafts.delete(binding);
  } else {
    taskCreateDrafts.set(binding, draft);
  }
}

function taskSurfaceView(surface: TaskSurface): TasksView | null {
  if (surface === "tasks") return currentTasksView;
  if (surface === "today") return currentTodayView?.tasks ?? null;
  return currentCalendarSummaryView?.tasks ?? null;
}

function taskSurfaceBinding(surface: TaskSurface): string | null {
  return taskSurfaceView(surface)?.targetBinding ?? null;
}

function stashTaskEditDraft(form: HTMLFormElement): void {
  const surface: TaskSurface =
    form.dataset.taskSurface === "today"
      ? "today"
      : form.dataset.taskSurface === "calendar"
        ? "calendar"
        : "tasks";
  const binding = taskSurfaceBinding(surface);
  const taskId = form.dataset.taskEditor;
  if (!binding || !taskId) return;
  const draft = readTaskDraft(form);
  const key = taskDraftKey(binding, taskId);
  if (isBlankTaskDraft(draft)) {
    taskEditDrafts.delete(key);
  } else {
    taskEditDrafts.set(key, draft);
  }
}

function reconcileTaskCompletionDraft(
  targetBinding: string,
  taskId: string,
  task: TaskView,
): void {
  const key = taskDraftKey(targetBinding, taskId);
  const draft = taskEditDrafts.get(key);
  if (!draft) return;
  const next: TaskDraft = {
    ...draft,
    completionDate: task.completion?.completedOn ?? "",
    completionTime: task.completion?.completedTime ?? "",
  };
  if (isBlankTaskDraft(next)) {
    taskEditDrafts.delete(key);
  } else {
    taskEditDrafts.set(key, next);
  }
}

function taskScheduleText(date: string | null, time: string | null): string {
  if (!date) return t("tasks.noDate");
  return time
    ? t("tasks.dateAt", { date: calendarDateLabel(date), time })
    : calendarDateLabel(date);
}

function taskStateCopyKey(
  state: "pending" | "completed" | "abandoned",
): InterfaceCopyKey {
  return state === "pending"
    ? "tasks.statePending"
    : state === "completed"
      ? "tasks.stateCompleted"
      : "tasks.stateAbandoned";
}

function taskCompletionSourceText(source: TaskCompletionView["source"]): string {
  const key: Record<TaskCompletionView["source"], InterfaceCopyKey> = {
    checkbox: "tasks.completionSourceCheckbox",
    "date-correction": "tasks.completionSourceCorrection",
    "daily-flow": "tasks.completionSourceDailyFlow",
  };
  return t(key[source]);
}

function taskCompletionMoment(completion: TaskCompletionView | null): string {
  if (!completion) return t("tasks.completionUnknown");
  return completion.completedTime
    ? t("tasks.dateAt", {
        date: calendarDateLabel(completion.completedOn),
        time: completion.completedTime,
      })
    : calendarDateLabel(completion.completedOn);
}

function taskChangeSourceText(source: TaskChangeView["source"]): string {
  return t(
    source === "user" ? "tasks.changeSourceUser" : "tasks.changeSourceDailyFlow",
  );
}

function taskChangeDescription(change: TaskChangeView): string {
  if (change.kind === "rescheduled") {
    return t("tasks.rescheduled", {
      changedAt: change.changedAt,
      previous: taskScheduleText(change.previousDate, change.previousTime),
      next: taskScheduleText(change.newDate, change.newTime),
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "completed") {
    return t("tasks.completedChange", {
      changedAt: change.changedAt,
      actual: taskCompletionMoment(change.newCompletion),
      source: change.newCompletion
        ? taskCompletionSourceText(change.newCompletion.source)
        : t("tasks.completionUnknown"),
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "reopened") {
    return t("tasks.reopenedChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "abandoned") {
    return t("tasks.abandonedChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "restored") {
    return t("tasks.restoredChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "deleted") {
    return t("tasks.deletedChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "undeleted") {
    return t("tasks.undeletedChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "completion-corrected") {
    return t("tasks.completionCorrectedChange", {
      changedAt: change.changedAt,
      previous: taskCompletionMoment(change.previousCompletion),
      next: taskCompletionMoment(change.newCompletion),
      changeSource: taskChangeSourceText(change.source),
    });
  }
  if (change.kind === "noop") {
    return t("tasks.noopChange", {
      changedAt: change.changedAt,
      changeSource: taskChangeSourceText(change.source),
    });
  }
  const labels: Record<
    Exclude<
      TaskChangeView["kind"],
      | "rescheduled"
      | "completed"
      | "reopened"
      | "abandoned"
      | "restored"
      | "deleted"
      | "undeleted"
      | "completion-corrected"
      | "noop"
    >,
    InterfaceCopyKey
  > = {
    renamed: "tasks.renamed",
    "content-edited": "tasks.contentEdited",
    "list-moved": "tasks.edited",
    edited: "tasks.edited",
  };
  return t(labels[change.kind], {
    changedAt: change.changedAt,
    changeSource: taskChangeSourceText(change.source),
  });
}

function taskChangeHistory(task: TaskView): HTMLElement | null {
  if (task.changes.length === 0) return null;
  const history = document.createElement("details");
  history.className = "task-change-history";
  const summary = document.createElement("summary");
  setCopy(summary, "tasks.changes", { count: task.changes.length });
  const changes = document.createElement("ul");
  changes.replaceChildren(
    ...task.changes.map((change) => {
      const item = document.createElement("li");
      item.textContent = taskChangeDescription(change);
      return item;
    }),
  );
  history.append(summary, changes);
  return history;
}

type TaskListView = TasksView["lists"][number];

function taskListForId(view: TasksView, listId: string): TaskListView | undefined {
  return view.lists.find((list) => list.id === listId);
}

function activeTaskLists(view: TasksView): readonly TaskListView[] {
  return view.lists.filter((list) => !list.archived);
}

function taskListCount(view: TasksView, listId: string): number {
  return view.tasks.filter((task) => task.listId === listId && task.deletedAt === null).length;
}

function renderTaskListScopeButtons(view: TasksView): void {
  if (!taskListScopes) return;
  const buttons: HTMLButtonElement[] = [];
  const archivedListIds = new Set(
    view.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const addButton = (scope: TaskListScope, copyKey: InterfaceCopyKey): void => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.className = "task-list-button";
    button.dataset.taskScope = scope;
    const label = document.createElement("span");
    setCopy(label, copyKey);
    const count = document.createElement("strong");
    count.textContent = String(
      taskScopeCount(view.tasks, scope, taskStateScope, view.currentDate, archivedListIds),
    );
    button.append(label, count);
    if (scope === "all") {
      button.dataset.i18nAriaLabel = "tasks.scopeAllList";
      button.setAttribute("aria-label", t("tasks.scopeAllList"));
    }
    buttons.push(button);
  };
  addButton("all", "tasks.scopeAll");
  addButton("today", "tasks.scopeToday");
  addButton("inbox", "tasks.scopeInbox");
  for (const list of view.lists.filter((candidate) => !candidate.isSystem && !candidate.archived)) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.className = "task-list-button";
    button.dataset.taskScope = taskListScopeForId(list.id);
    const label = document.createElement("span");
    label.textContent = list.name;
    const count = document.createElement("strong");
    count.textContent = String(
      taskScopeCount(
        view.tasks,
        taskListScopeForId(list.id),
        taskStateScope,
        view.currentDate,
        archivedListIds,
      ),
    );
    button.append(label, count);
    button.title = list.name;
    buttons.push(button);
  }
  addButton("archived", "tasks.scopeArchived");
  taskListScopes.replaceChildren(...buttons);
}

function renderTaskListSelect(
  select: HTMLSelectElement | null,
  view: TasksView,
  selectedListId: string | null,
  includeArchivedCurrent = false,
): void {
  if (!select) return;
  const options = activeTaskLists(view).slice();
  if (includeArchivedCurrent && selectedListId) {
    const current = taskListForId(view, selectedListId);
    if (current?.archived) options.push(current);
  }
  select.replaceChildren(
    ...options.map((list) => {
      const option = document.createElement("option");
      option.value = list.id;
      const displayName = taskListDisplayName(list, t("tasks.inbox"));
      option.textContent = list.archived
        ? `${displayName} · ${t("tasks.archivedLabel")}`
        : displayName;
      option.disabled = list.archived && list.id !== selectedListId;
      return option;
    }),
  );
  const fallback = options.find((list) => list.id === "inbox")?.id ?? options[0]?.id ?? "";
  select.value = options.some((list) => list.id === selectedListId)
    ? selectedListId ?? ""
    : fallback;
}

function taskCreateListDefault(view: TasksView): string {
  const scopedListId = taskListIdFromScope(taskScope);
  const scopedList = scopedListId ? taskListForId(view, scopedListId) : undefined;
  return scopedList && !scopedList.archived ? scopedList.id : "inbox";
}

function taskListRenameDraftKey(binding: string, listId: string): string {
  return `${binding}:${listId}`;
}

function renderTaskListManagement(view: TasksView, canOperate: boolean): void {
  if (!taskListsManagement) return;
  const rows = view.lists.map((list) => {
    const row = document.createElement("article");
    row.className = "task-list-row";
    row.classList.toggle("is-archived", list.archived);
    const heading = document.createElement("div");
    heading.className = "task-list-row-heading";
    const title = document.createElement("strong");
    const displayName = taskListDisplayName(list, t("tasks.inbox"));
    title.textContent = displayName;
    const count = document.createElement("small");
    count.className = "task-meta";
    setCopy(count, "tasks.listCount", { count: taskListCount(view, list.id) });
    heading.append(title, count);
    row.append(heading);
    if (list.isSystem) {
      const permanent = document.createElement("small");
      setCopy(permanent, "tasks.permanentList");
      permanent.className = "task-meta";
      row.append(permanent);
      return row;
    }
    const form = document.createElement("form");
    form.className = "task-list-row-form";
    form.dataset.taskListEditor = list.id;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.required = true;
    input.value = currentTasksView?.targetBinding
      ? taskListRenameDrafts.get(taskListRenameDraftKey(currentTasksView.targetBinding, list.id)) ?? list.name
      : list.name;
    input.dataset.taskListName = "";
    input.setAttribute("aria-label", t("tasks.renameListLabel", { list: displayName }));
    const save = document.createElement("button");
    save.type = "submit";
    save.disabled = !canOperate;
    setCopy(save, "tasks.saveList");
    const archive = document.createElement("button");
    archive.type = "button";
    archive.className = "secondary-button";
    archive.disabled = !canOperate;
    if (list.archived) {
      archive.dataset.taskListRestore = list.id;
      setCopy(archive, "tasks.restoreList");
    } else {
      archive.dataset.taskListArchive = list.id;
      setCopy(archive, "tasks.archiveList");
    }
    form.append(input, save, archive);
    row.append(form);
    return row;
  });
  taskListsManagement.replaceChildren(...rows);
}

function taskEditorForms(surface?: TaskSurface): HTMLFormElement[] {
  return Array.from(
    document.querySelectorAll<HTMLFormElement>("form[data-task-editor]"),
  ).filter((form) => !surface || form.dataset.taskSurface === surface);
}

function clearTaskEditorDialogs(surface: TaskSurface): void {
  taskEditorDialogRoot?.querySelectorAll<HTMLElement>(
    `[data-task-editor-dialog][data-task-editor-surface="${surface}"]`,
  ).forEach((dialog) => dialog.remove());
}

function toggleTaskEditorDetails(target: HTMLElement): boolean {
  const toggle = target.closest<HTMLButtonElement>("button[data-task-editor-open]");
  if (!toggle) return false;
  const taskId = toggle.dataset.taskEditorOpen;
  const row = toggle.closest<HTMLElement>("[data-task-editor-row]");
  const inlineEditor = taskId
    ? row?.querySelector<HTMLFormElement>(
        `form[data-task-editor="${CSS.escape(taskId)}"]`,
      )
    : undefined;
  const dialog = taskId
    ? Array.from(
        taskEditorDialogRoot?.querySelectorAll<HTMLElement>(
          "[data-task-editor-dialog]",
        ) ?? [],
      ).find(
        (candidate) =>
          candidate.dataset.taskEditorDialog === taskId &&
          candidate.dataset.taskEditorSurface === row?.dataset.taskSurface,
      )
    : undefined;
  const editor = dialog ?? inlineEditor;
  if (!row || !editor) return false;
  const open = dialog ? dialog.hidden : editor.hidden;
  if (dialog) {
    dialog.hidden = !open;
  } else {
    editor.hidden = !open;
  }
  if (open) {
    editor.querySelector<HTMLInputElement>("[data-task-name]")?.focus();
  }
  row.querySelectorAll<HTMLButtonElement>("button[data-task-editor-open]").forEach((button) => {
    button.setAttribute("aria-expanded", String(open));
  });
  return true;
}

function taskEditor(
  task: TaskView,
  writable: boolean,
  view: TasksView | null = currentTasksView,
  surface: TaskSurface = "tasks",
): HTMLElement {
  const binding = view?.targetBinding;
  const draft = binding
    ? taskEditDrafts.get(taskDraftKey(binding, task.id))
    : undefined;
  const deleted = task.deletedAt !== null;
  const editable = writable && !deleted;
  const row = document.createElement("article");
  row.className = "task-form task-editor task-row";
  row.dataset.taskEditorRow = task.id;
  row.dataset.taskSurface = surface;
  row.dataset.taskState = task.state;
  row.classList.toggle("is-deleted", deleted);
  row.classList.toggle("is-complete", task.state === "completed");
  row.classList.toggle("is-abandoned", task.state === "abandoned");
  row.setAttribute("aria-label", t("tasks.editLabel", { task: task.name }));

  const heading = document.createElement("div");
  heading.className = "task-row-summary";
  const source = document.createElement("small");
  setCopy(
    source,
    task.source.kind === "manual" ? "tasks.sourceManual" : "tasks.sourceDailyFlow",
  );
  const state = document.createElement("span");
  state.className = "task-state-label";
  setCopy(state, deleted ? "tasks.stateDeleted" : taskStateCopyKey(task.state));
  const stateActions = document.createElement("div");
  stateActions.className = "task-state-actions";
  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "task-row-action task-editor-toggle";
  detailsButton.dataset.taskEditorOpen = task.id;
  detailsButton.setAttribute("aria-expanded", String(Boolean(draft)));
  detailsButton.setAttribute("aria-label", `${t("tasks.details")} · ${task.name}`);
  setCopy(detailsButton, "tasks.details");
  stateActions.append(detailsButton);
  if (deleted) {
    const restore = document.createElement("button");
    restore.type = "button";
    restore.dataset.taskRestore = task.id;
    restore.disabled = !writable;
    restore.setAttribute("aria-label", `${t("tasks.undoDelete")} · ${task.name}`);
    setCopy(restore, "tasks.undoDelete");
    stateActions.append(restore);
  } else {
    if (task.state !== "abandoned") {
      const completionLabel = document.createElement("label");
      completionLabel.className = "task-completion-toggle";
      const completion = document.createElement("input");
      completion.type = "checkbox";
      completion.checked = task.state === "completed";
      completion.disabled = !writable;
      completion.dataset.taskStateAction =
        task.state === "completed" ? "pending" : "completed";
      completion.dataset.taskStateTask = task.id;
      completion.setAttribute(
        "aria-label",
        `${t(task.state === "completed" ? "tasks.reopen" : "tasks.complete")} · ${task.name}`,
      );
      const completionText = document.createElement("span");
      setCopy(
        completionText,
        task.state === "completed" ? "tasks.reopen" : "tasks.complete",
      );
      completionLabel.append(completion, completionText);
      stateActions.append(completionLabel);
    } else {
      const restore = document.createElement("button");
      restore.type = "button";
      restore.dataset.taskStateAction = "pending";
      restore.dataset.taskStateTask = task.id;
      restore.disabled = !writable;
      restore.setAttribute("aria-label", `${t("tasks.restore")} · ${task.name}`);
      setCopy(restore, "tasks.restore");
      stateActions.append(restore);
    }
    if (task.state !== "abandoned") {
      const abandon = document.createElement("button");
      abandon.type = "button";
      abandon.className = "secondary-button";
      abandon.dataset.taskStateAction = "abandoned";
      abandon.dataset.taskStateTask = task.id;
      abandon.disabled = !writable;
      abandon.setAttribute("aria-label", `${t("tasks.abandon")} · ${task.name}`);
      setCopy(abandon, "tasks.abandon");
      stateActions.append(abandon);
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary-button";
    remove.dataset.taskDelete = task.id;
    remove.disabled = !writable;
    remove.setAttribute("aria-label", `${t("tasks.delete")} · ${task.name}`);
    setCopy(remove, "tasks.delete");
    stateActions.append(remove);
  }
  const rowMain = document.createElement("div");
  rowMain.className = "task-row-main";
  const titleLine = document.createElement("div");
  titleLine.className = "task-row-title-line";
  const title = document.createElement("button");
  title.type = "button";
  title.className = "task-title-button task-editor-toggle";
  title.dataset.taskEditorOpen = task.id;
  title.setAttribute("aria-expanded", String(Boolean(draft)));
  title.textContent = task.name;
  title.setAttribute("aria-label", `${t("tasks.details")} · ${task.name}`);
  const taskList = view ? taskListForId(view, task.listId) : undefined;
  const listName = taskList
    ? taskListDisplayName(taskList, t("tasks.inbox"))
    : task.listId;
  const meta = document.createElement("p");
  meta.className = "task-row-meta";
  meta.append(source, document.createTextNode(" · "), document.createTextNode(listName));
  meta.append(document.createTextNode(" · "), document.createTextNode(taskScheduleText(task.date, task.time)));
  if (task.overdue) {
    meta.append(document.createTextNode(" · "), document.createTextNode(t("tasks.overdue")));
  }
  titleLine.append(title, state);
  if (task.content) {
    const contentPreview = document.createElement("p");
    contentPreview.className = "task-row-content";
    contentPreview.textContent = task.content;
    rowMain.append(titleLine, contentPreview, meta);
  } else {
    rowMain.append(titleLine, meta);
  }
  heading.append(rowMain, stateActions);

  const editorForm = document.createElement("form");
  editorForm.className =
    surface === "tasks" ? "task-editor-details" : "task-editor-details task-editor-inline";
  editorForm.dataset.taskEditor = task.id;
  editorForm.dataset.taskSurface = surface;
  editorForm.hidden = surface !== "tasks";
  editorForm.setAttribute("aria-label", t("tasks.editLabel", { task: task.name }));
  const grid = document.createElement("div");
  grid.className = "task-form-grid";
  const nameLabel = document.createElement("label");
  nameLabel.className = "task-form-wide";
  const nameCaption = document.createElement("span");
  setCopy(nameCaption, "tasks.name");
  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 160;
  name.required = true;
  name.disabled = !editable;
  name.value = draft?.name ?? task.name;
  name.dataset.taskName = "";
  nameCaption.append(name);
  nameLabel.append(nameCaption);

  const contentLabel = document.createElement("label");
  contentLabel.className = "task-form-wide";
  const contentCaption = document.createElement("span");
  setCopy(contentCaption, "tasks.content");
  const content = document.createElement("textarea");
  content.rows = 2;
  content.disabled = !editable;
  content.value = draft?.content ?? task.content ?? "";
  content.dataset.taskContent = "";
  contentCaption.append(content);
  contentLabel.append(contentCaption);

  const dateLabel = document.createElement("label");
  const dateCaption = document.createElement("span");
  setCopy(dateCaption, "tasks.date");
  const date = document.createElement("input");
  date.type = "date";
  date.disabled = !editable;
  date.value = draft?.date ?? task.date ?? "";
  date.dataset.taskDate = "";
  dateCaption.append(date);
  dateLabel.append(dateCaption);

  const timeLabel = document.createElement("label");
  const timeCaption = document.createElement("span");
  setCopy(timeCaption, "tasks.time");
  const time = document.createElement("input");
  time.type = "time";
  time.disabled = !editable || !(draft?.date ?? task.date);
  time.value = draft?.time ?? task.time ?? "";
  time.dataset.taskTime = "";
  normalizeTaskDateTimeFields(date, time, !editable);
  timeCaption.append(time);
  timeLabel.append(timeCaption);

  const listLabel = document.createElement("label");
  const listCaption = document.createElement("span");
  setCopy(listCaption, "tasks.list");
  const list = document.createElement("select");
  list.disabled = !editable;
  list.dataset.taskList = "";
  if (view) {
    renderTaskListSelect(list, view, draft?.listId ?? task.listId, true);
  }
  listCaption.append(list);
  listLabel.append(listCaption);

  grid.append(nameLabel, contentLabel, listLabel, dateLabel, timeLabel);
  const footer = document.createElement("div");
  footer.className = "task-editor-footer";
  const schedule = document.createElement("small");
  schedule.className = "task-meta";
  schedule.textContent = taskScheduleText(task.date, task.time);
  const save = document.createElement("button");
  save.type = "submit";
  save.disabled = !editable;
  setCopy(save, "tasks.save");
  footer.append(schedule, save);
  editorForm.append(grid);
  if (task.completion) {
    const completionDetails = document.createElement("section");
    completionDetails.className = "task-completion-details";
    const completionHeading = document.createElement("h4");
    setCopy(completionHeading, "tasks.completionDetails");
    const taskDate = document.createElement("p");
    taskDate.className = "task-meta";
    setCopy(taskDate, "tasks.taskDateDetails", {
      schedule: taskScheduleText(task.date, task.time),
    });
    const actual = document.createElement("p");
    actual.className = "task-meta";
    setCopy(actual, "tasks.actualCompletionDetails", {
      completed: taskCompletionMoment(task.completion),
      source: taskCompletionSourceText(task.completion.source),
    });
    const recorded = document.createElement("p");
    recorded.className = "task-meta";
    setCopy(recorded, "tasks.recordedCompletionDetails", {
      recordedAt: task.completion.recordedAt,
    });
    const correction = document.createElement("div");
    correction.className = "task-completion-correction";
    const correctionDateLabel = document.createElement("label");
    const correctionDateCaption = document.createElement("span");
    setCopy(correctionDateCaption, "tasks.completionDate");
    const correctionDate = document.createElement("input");
    correctionDate.type = "date";
    correctionDate.disabled = !editable;
    correctionDate.value = draft?.completionDate ?? task.completion.completedOn;
    correctionDate.dataset.taskCompletionDate = "";
    correctionDate.setAttribute(
      "aria-label",
      `${t("tasks.completionDate")} · ${task.name}`,
    );
    correctionDateCaption.append(correctionDate);
    correctionDateLabel.append(correctionDateCaption);
    const correctionTimeLabel = document.createElement("label");
    const correctionTimeCaption = document.createElement("span");
    setCopy(correctionTimeCaption, "tasks.completionTime");
    const correctionTime = document.createElement("input");
    correctionTime.type = "time";
    correctionTime.disabled = !editable;
    correctionTime.value = draft?.completionTime ?? task.completion.completedTime ?? "";
    correctionTime.dataset.taskCompletionTime = "";
    correctionTime.setAttribute(
      "aria-label",
      `${t("tasks.completionTime")} · ${task.name}`,
    );
    correctionTimeCaption.append(correctionTime);
    correctionTimeLabel.append(correctionTimeCaption);
    const correct = document.createElement("button");
    correct.type = "button";
    correct.dataset.taskCorrectCompletion = task.id;
    correct.disabled = !editable;
    correct.setAttribute("aria-label", `${t("tasks.correctCompletion")} · ${task.name}`);
    setCopy(correct, "tasks.correctCompletion");
    correction.append(correctionDateLabel, correctionTimeLabel, correct);
    completionDetails.append(completionHeading, taskDate, actual, recorded, correction);
    editorForm.append(completionDetails);
  }
  editorForm.append(footer);
  const history = taskChangeHistory(task);
  if (history) editorForm.append(history);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "secondary-button task-editor-close";
  close.dataset.taskEditorClose = "";
  setCopy(close, "tasks.cancel");
  editorForm.append(close);
  const dialog = surface === "tasks" ? document.createElement("div") : null;
  if (dialog) {
    dialog.className = "task-editor-dialog";
    dialog.dataset.taskEditorDialog = task.id;
    dialog.dataset.taskEditorSurface = surface;
    dialog.hidden = true;
    dialog.append(editorForm);
    (taskEditorDialogRoot ?? document.body).append(dialog);
  }
  row.append(heading);
  if (!dialog) row.append(editorForm);
  const closeEditorDialog = (): void => {
    if (dialog) {
      dialog.hidden = true;
    } else {
      editorForm.hidden = true;
    }
    row.querySelectorAll<HTMLButtonElement>("button[data-task-editor-open]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
  };
  [detailsButton, title].forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTaskEditorDetails(toggle);
    });
  });
  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeEditorDialog();
  });
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeEditorDialog();
    }
  });
  dialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditorDialog();
    }
  });
  if (surface === "tasks") {
    editorForm.addEventListener("input", () => stashTaskEditDraft(editorForm));
    editorForm.addEventListener("change", (event) => {
      const target = event.target as HTMLElement;
      if (target.matches("input[data-task-date]")) {
        normalizeTaskDateTimeFields(
          editorForm.querySelector<HTMLInputElement>("[data-task-date]"),
          editorForm.querySelector<HTMLInputElement>("[data-task-time]"),
        );
      }
      stashTaskEditDraft(editorForm);
    });
    editorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      stashTaskEditDraft(editorForm);
      void pendingWrites.track(updateTask(task.id, editorForm, surface));
    });
    editorForm.querySelector<HTMLButtonElement>("[data-task-correct-completion]")?.addEventListener(
      "click",
      () => {
        void pendingWrites.track(correctTaskCompletion(task.id, editorForm, surface));
      },
    );
  }
  return row;
}

function renderTasks(view: TasksView): void {
  currentTasksView = view;
  const scopedListId = taskListIdFromScope(taskScope);
  const scopedList = scopedListId ? taskListForId(view, scopedListId) : undefined;
  if (
    taskScope !== "all" &&
    taskScope !== "today" &&
    taskScope !== "inbox" &&
    taskScope !== "archived" &&
    !scopedList
  ) {
    taskScope = "all";
  } else if (scopedList?.archived) {
    taskScope = "archived";
  }
  renderTaskListScopeButtons(view);
  const archivedListIds = new Set(
    view.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const todayGroups =
    taskScope === "today" && view.currentDate
      ? todayTaskGroups(view.tasks, view.currentDate, true, archivedListIds)
      : null;
  const visibleTasks = todayGroups
    ? [...todayGroups.scheduled, ...todayGroups.overdue].filter(
        (task) => taskStateScope === "all" || task.state === taskStateScope,
      )
    : view.tasks.filter((task) =>
        taskVisibleInScope(
          { ...task, listArchived: archivedListIds.has(task.listId) },
          taskScope,
          taskStateScope,
        ),
      );
  taskListScopes?.querySelectorAll<HTMLButtonElement>("[data-task-scope]").forEach((button) => {
    const selected = button.dataset.taskScope === taskScope;
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("aria-current", selected ? "page" : "false");
    button.tabIndex = selected ? 0 : -1;
  });
  if (taskFilter) taskFilter.value = taskStateScope;
  if (tasksCount) {
    setCopy(tasksCount, "tasks.count", { count: visibleTasks.length });
  }
  if (tasksStatus) {
    if (view.state === "error") {
      setCopyError(tasksStatus, "tasks.loadFailed", view.message);
    } else if (view.state === "unconfigured") {
      setCopy(tasksStatus, "settings.noVault");
    } else {
      setCopy(
        tasksStatus,
        view.state === "ready" ? "tasks.ready" : "tasks.emptyStatus",
      );
    }
    tasksStatus.dataset.state = view.state;
  }
  if (tasksEmpty) {
    tasksEmpty.hidden =
      visibleTasks.length > 0 ||
      view.state === "error" ||
      view.state === "unconfigured";
    if (!tasksEmpty.hidden) {
      setCopy(
        tasksEmpty,
        taskStateScope === "deleted"
          ? "tasks.emptyDeleted"
          : taskScope === "today"
            ? "today.tasksEmpty"
          : taskScope === "inbox"
            ? "tasks.empty"
            : taskScope === "archived"
              ? "tasks.emptyArchived"
            : "tasks.emptyAll",
      );
    }
  }
  const canOperate =
    Boolean(view.targetBinding) &&
    view.state !== "error" &&
    view.state !== "unconfigured" &&
    taskOperationCount === 0;
  const writable = canOperate && taskStateScope !== "deleted";
  renderTaskListManagement(view, canOperate);
  if (taskListsManagementPanel) {
    taskListsManagementPanel.hidden = !taskListManagementOpen;
  }
  if (taskListCreateForm) {
    taskListCreateForm.hidden = !canOperate || !taskListManagementOpen;
    if (view.targetBinding && taskListCreateName) {
      taskListCreateName.value = taskListCreateDrafts.get(view.targetBinding) ?? "";
    }
  }
  if (taskCreateForm) {
    taskCreateForm.hidden = !writable || taskScope === "archived" || !taskCreateOpen;
    const draft = view.targetBinding
      ? taskCreateDrafts.get(view.targetBinding)
      : undefined;
    renderTaskListSelect(
      taskCreateList,
      view,
      draft?.listId ?? taskCreateListDefault(view),
    );
    const selectedCreateList = taskListForId(view, taskCreateList?.value ?? "inbox");
    if (selectedCreateList && taskCreateListLabel) {
      const displayName = taskListDisplayName(selectedCreateList, t("tasks.inbox"));
      setRawText(taskCreateListLabel, displayName);
      if (taskCreateSubmit) {
        setRawText(
          taskCreateSubmit,
          selectedCreateList.id === "inbox"
            ? t("tasks.add")
            : t("tasks.addToList", { list: displayName }),
        );
      }
    }
    if (taskCreateName) taskCreateName.value = draft?.name ?? "";
    if (taskCreateContent) taskCreateContent.value = draft?.content ?? "";
    if (taskCreateDate) {
      taskCreateDate.value =
        draft?.date ?? (taskScope === "today" ? view.currentDate ?? "" : "");
    }
    if (taskCreateTime) taskCreateTime.value = draft?.time ?? "";
    normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime);
  }
  taskCreateSubmit?.toggleAttribute(
    "disabled",
    !writable || taskScope === "archived",
  );
  clearTaskEditorDialogs("tasks");
  tasksList?.replaceChildren(
    ...visibleTasks.map((task) => taskEditor(task, canOperate, view, "tasks")),
  );
}

function stableTaskOperationId(
  signature: string,
  prefix: string,
  scope: string | null = null,
): string {
  return taskOperationIds.getOrCreate(signature, () => localOperationId(prefix), scope);
}

function updateTaskEditorOperationState(
  surface: TaskSurface,
  writable: boolean,
  busy: boolean,
): void {
  taskEditorForms(surface).forEach((form) => {
    form.querySelectorAll(
      "[data-task-name], [data-task-content], [data-task-date], [data-task-time], [data-task-completion-date], [data-task-completion-time], button[data-task-correct-completion], button[type=submit]",
    ).forEach((element) => {
      (element as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement).disabled =
        busy || !writable;
    });
    if (!busy) {
      normalizeTaskDateTimeFields(
        form.querySelector<HTMLInputElement>("[data-task-date]"),
        form.querySelector<HTMLInputElement>("[data-task-time]"),
        !writable,
      );
    }
  });
}

function updateTaskOperationState(delta: number): void {
  taskOperationCount = Math.max(0, taskOperationCount + delta);
  const busy = taskOperationCount > 0;
  selectTodayVaultButton?.toggleAttribute(
    "disabled",
    busy || todayOperationCount > 0 || vaultSelectionInProgress,
  );
  refreshTasksButton?.toggleAttribute("disabled", busy || todayOperationCount > 0);
  todayDaytimeForm?.querySelector("button")?.toggleAttribute("disabled", busy || todayOperationCount > 0);
  todayEveningForm?.querySelector("button")?.toggleAttribute("disabled", busy || todayOperationCount > 0);
  const canOperate =
    Boolean(currentTasksView?.targetBinding) &&
    currentTasksView?.state !== "error" &&
    currentTasksView?.state !== "unconfigured";
  const writable = canOperate && taskStateScope !== "deleted";
  if (taskCreateForm) {
    taskCreateForm.hidden = !writable || taskScope === "archived" || !taskCreateOpen;
    taskCreateForm.querySelectorAll("input, textarea, select, button").forEach((element) => {
      (element as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement).disabled =
        busy;
    });
    if (!busy) normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime, !writable);
  }
  taskCreateSubmit?.toggleAttribute(
    "disabled",
    busy || !writable || taskScope === "archived" || !taskCreateOpen,
  );
  const todayCanOperate =
    Boolean(currentTodayView?.tasks.targetBinding) &&
    currentTodayView?.tasks.state !== "error" &&
    currentTodayView?.tasks.state !== "unconfigured";
  const todayWritable = todayCanOperate && taskOperationCount === 0;
  todayTaskCreateForm?.toggleAttribute("hidden", !todayWritable);
  todayTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || !todayCanOperate;
  });
  updateTaskEditorOperationState("today", todayWritable, busy);
  todayTaskCreateSubmit?.toggleAttribute("disabled", busy || !todayWritable);
  const calendarCanOperate =
    Boolean(currentCalendarSummaryView?.tasks.targetBinding) &&
    currentCalendarSummaryView?.tasks.state !== "error" &&
    currentCalendarSummaryView?.tasks.state !== "unconfigured";
  const calendarWritable = calendarCanOperate && taskOperationCount === 0;
  calendarTaskCreateForm?.toggleAttribute("hidden", !calendarWritable);
  calendarTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || !calendarCanOperate;
  });
  updateTaskEditorOperationState("calendar", calendarWritable, busy);
  taskListCreateForm?.querySelectorAll("input, button").forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = busy || !canOperate;
  });
  taskListScopes?.querySelectorAll<HTMLButtonElement>("[data-task-scope]").forEach((button) =>
    button.toggleAttribute("disabled", busy),
  );
  taskListsManagement?.querySelectorAll("input, button").forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = busy || !canOperate;
  });
  tasksList?.querySelectorAll(
    "input[data-task-state-action], button[data-task-state-action], button[data-task-delete], button[data-task-restore]",
  ).forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement).disabled =
      busy || !canOperate;
  });
  updateTaskEditorOperationState("tasks", writable, busy);
  if (!busy && taskRefreshQueued) {
    taskRefreshQueued = false;
    if (currentWorkspaceDestination === "tasks") void refreshTasks();
  }
}

async function refreshTasks(): Promise<void> {
  if (taskOperationCount > 0) {
    taskRefreshQueued = true;
    return;
  }
  taskRefreshQueued = false;
  const request = taskRequests.begin();
  const expectedTargetBinding = currentTasksView?.targetBinding ?? null;
  if (tasksStatus) {
    setCopy(tasksStatus, "common.loading");
    tasksStatus.dataset.state = "loading";
  }
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>("tasks_view");
    if (
      !isCurrentTaskResponse(
        taskRequests,
        request,
        currentWorkspaceDestination,
        expectedTargetBinding,
        view.targetBinding,
      )
    ) {
      return;
    }
    renderTasks(view);
  } catch (error) {
    if (
      !taskRequests.isCurrent(request) ||
      currentWorkspaceDestination !== "tasks"
    ) {
      return;
    }
    renderTasks({
      state: "error",
      message: String(error),
      schemaVersion: 2,
      revision: currentTasksView?.revision ?? null,
      targetBinding: currentTasksView?.targetBinding ?? null,
      vaultName: currentTasksView?.vaultName ?? null,
      vaultPath: currentTasksView?.vaultPath ?? null,
      currentDate: currentTasksView?.currentDate ?? null,
      lists: [],
      tasks: [],
    });
  }
}

async function createTask(): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const status = taskSurfaceStatus("tasks");
  if (
    !loaded ||
    !binding ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const name = taskCreateName?.value.trim() ?? "";
  if (!name) {
    setCopy(status, "tasks.enterName");
    if (status) status.dataset.state = "error";
    taskCreateName?.focus();
    return false;
  }
  const normalized = normalizeTaskSchedule(
    taskCreateDate?.value,
    taskCreateTime?.value,
  );
  const content = taskCreateContent?.value ?? "";
  const listId = taskCreateList?.value || "inbox";
  const operationKey = JSON.stringify([binding, "create"]);
  const taskId = stableTaskOperationId(operationKey, "manual-task");
  const request = taskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>("create_task", {
      input: {
        targetBinding: binding,
        expectedRevision: loaded.revision,
        taskId,
        name,
        content: content.trim() || null,
        date: normalized.date,
        time: normalized.time,
        listId,
      },
    });
    const responseIsCurrent = taskSurfaceIsCurrent(
      "tasks",
      request,
      binding,
      view.targetBinding,
      null,
      loaded.revision,
    );
    const savedTask = view.tasks.find(
      (task) =>
        task.id === taskId &&
        task.name === name &&
        task.content === (content.trim() || null) &&
        task.date === normalized.date &&
        task.time === normalized.time &&
        task.listId === listId,
    );
    const confirmed = taskMutationConfirmed(
      responseIsCurrent,
      view.state,
      Boolean(savedTask),
    );
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      taskCreateDrafts.delete(binding);
      if (taskCreateForm) taskCreateForm.reset();
      taskCreateOpen = false;
      renderTaskSurface("tasks", view);
      setCopy(status, "tasks.saved");
      if (status) status.dataset.state = "ready";
    } else if (responseIsCurrent) {
      stashTaskCreateDraft();
      renderTaskSurface("tasks", view);
      setCopyError(
        status,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (status) status.dataset.state = "error";
    }
    return view.state !== "error";
  } catch (error) {
    if (taskSurfaceIsCurrent("tasks", request, binding, binding, null, loaded.revision)) {
      stashTaskCreateDraft();
      renderTaskSurface("tasks", loaded);
      setCopyError(status, "tasks.notSaved", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

async function createTodayTask(): Promise<boolean> {
  const todayView = currentTodayView;
  const loaded = todayView?.tasks;
  const binding = loaded?.targetBinding;
  const status = taskSurfaceStatus("today");
  if (
    !todayView ||
    !loaded ||
    !binding ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const name = todayTaskCreateName?.value.trim() ?? "";
  if (!name) {
    setCopy(status, "tasks.enterName");
    if (status) status.dataset.state = "error";
    todayTaskCreateName?.focus();
    return false;
  }
  const normalized = normalizeTaskSchedule(
    todayTaskCreateDate?.value,
    todayTaskCreateTime?.value,
  );
  const content = todayTaskCreateContent?.value ?? "";
  const listId = todayTaskCreateList?.value || "inbox";
  const operationKey = JSON.stringify([binding, "today-create", todayView.date]);
  const taskId = stableTaskOperationId(operationKey, "manual-task");
  const expectedDate = todayView.date;
  const request = todayTaskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>("create_task", {
      input: {
        targetBinding: binding,
        expectedRevision: loaded.revision,
        taskId,
        name,
        content: content.trim() || null,
        date: normalized.date,
        time: normalized.time,
        listId,
      },
    });
    const responseIsCurrent = taskSurfaceIsCurrent(
      "today",
      request,
      binding,
      view.targetBinding,
      expectedDate,
      loaded.revision,
    );
    const savedTask = view.tasks.find(
      (task) =>
        task.id === taskId &&
        task.name === name &&
        task.content === (content.trim() || null) &&
        task.date === normalized.date &&
        task.time === normalized.time &&
        task.listId === listId,
    );
    const confirmed = taskMutationConfirmed(
      responseIsCurrent,
      view.state,
      Boolean(savedTask),
    );
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      todayTaskCreateDrafts.delete(todayTaskCreateDraftKey(binding, expectedDate));
      if (todayTaskCreateForm) todayTaskCreateForm.reset();
      renderTaskSurface("today", view);
      setCopy(status, "tasks.saved");
      if (status) status.dataset.state = "ready";
    } else if (responseIsCurrent) {
      stashTodayTaskCreateDraft();
      renderTaskSurface("today", view);
      setCopyError(
        status,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (status) status.dataset.state = "error";
    }
    return confirmed;
  } catch (error) {
    if (taskSurfaceIsCurrent("today", request, binding, binding, expectedDate, loaded.revision)) {
      stashTodayTaskCreateDraft();
      renderTaskSurface("today", loaded);
      setCopyError(status, "tasks.notSaved", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

async function createCalendarTask(): Promise<boolean> {
  const calendarView = currentCalendarSummaryView;
  const loaded = calendarView?.tasks;
  const binding = loaded?.targetBinding;
  const date = selectedCalendarDate ?? calendarView?.date ?? null;
  const status = taskSurfaceStatus("calendar");
  if (
    !calendarView ||
    !loaded ||
    !binding ||
    !date ||
    calendarView.date !== date ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const name = calendarTaskCreateName?.value.trim() ?? "";
  if (!name) {
    setCopy(status, "tasks.enterName");
    if (status) status.dataset.state = "error";
    calendarTaskCreateName?.focus();
    return false;
  }
  const normalized = normalizeTaskSchedule(
    calendarTaskCreateDate?.value,
    calendarTaskCreateTime?.value,
  );
  const content = calendarTaskCreateContent?.value ?? "";
  const listId = calendarTaskCreateList?.value || "inbox";
  const operationKey = JSON.stringify([binding, "calendar-create", date]);
  const taskId = stableTaskOperationId(operationKey, "manual-task");
  const request = calendarTaskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>("create_task", {
      input: {
        targetBinding: binding,
        expectedRevision: loaded.revision,
        taskId,
        name,
        content: content.trim() || null,
        date: normalized.date,
        time: normalized.time,
        listId,
      },
    });
    const responseIsCurrent = taskSurfaceIsCurrent(
      "calendar",
      request,
      binding,
      view.targetBinding,
      date,
      loaded.revision,
    );
    const savedTask = view.tasks.find(
      (task) =>
        task.id === taskId &&
        task.name === name &&
        task.content === (content.trim() || null) &&
        task.date === normalized.date &&
        task.time === normalized.time &&
        task.listId === listId,
    );
    const confirmed = taskMutationConfirmed(
      responseIsCurrent,
      view.state,
      Boolean(savedTask),
    );
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      calendarTaskCreateDrafts.delete(calendarTaskCreateDraftKey(binding, date));
      if (calendarTaskCreateForm) calendarTaskCreateForm.reset();
      renderTaskSurface("calendar", view);
      setCopy(status, "tasks.saved");
      if (status) status.dataset.state = "ready";
    } else if (responseIsCurrent) {
      stashCalendarTaskCreateDraft();
      renderTaskSurface("calendar", view);
      setCopyError(
        status,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (status) status.dataset.state = "error";
    }
    return confirmed;
  } catch (error) {
    if (taskSurfaceIsCurrent("calendar", request, binding, binding, date, loaded.revision)) {
      stashCalendarTaskCreateDraft();
      renderTaskSurface("calendar", loaded);
      setCopyError(status, "tasks.notSaved", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

type TaskListCommand =
  | "create_task_list"
  | "rename_task_list"
  | "archive_task_list"
  | "restore_task_list";

async function saveTaskListMutation(
  command: TaskListCommand,
  loaded: TasksView,
  listId: string,
  operationKey: string,
  input: Record<string, unknown>,
  confirms: (list: TaskListView) => boolean,
  preserveDraft: (() => void) | null = null,
  clearDraft: (() => void) | null = null,
): Promise<boolean> {
  if (
    !loaded.targetBinding ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(tasksStatus, "tasks.notSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  const request = taskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>(command, { input });
    const responseIsCurrent = isCurrentTaskResponse(
      taskRequests,
      request,
      currentWorkspaceDestination,
      loaded.targetBinding,
      view.targetBinding,
    );
    const savedList = view.lists.find((list) => list.id === listId && confirms(list));
    const confirmed = taskListMutationConfirmed(
      responseIsCurrent,
      view.state,
      Boolean(savedList),
    );
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      clearDraft?.();
      renderTasks(view);
      setCopy(tasksStatus, "tasks.listSaved");
      if (tasksStatus) tasksStatus.dataset.state = "ready";
    } else if (responseIsCurrent) {
      preserveDraft?.();
      renderTasks(view);
      setCopyError(
        tasksStatus,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (tasksStatus) tasksStatus.dataset.state = "error";
    }
    return confirmed;
  } catch (error) {
    if (taskRequests.isCurrent(request) && currentWorkspaceDestination === "tasks") {
      preserveDraft?.();
      renderTasks(loaded);
      setCopyError(tasksStatus, "tasks.notSaved", error);
      if (tasksStatus) tasksStatus.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

async function createTaskList(): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  if (
    !loaded ||
    !binding ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(tasksStatus, "tasks.notSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  const name = taskListCreateName?.value.trim() ?? "";
  if (!name) {
    setCopy(tasksStatus, "tasks.enterListName");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    taskListCreateName?.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "list-create"]);
  const listId = stableTaskOperationId(operationKey, "task-list");
  taskListCreateDrafts.set(binding, name);
  return saveTaskListMutation(
    "create_task_list",
    loaded,
    listId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: loaded.revision,
      listId,
      name,
    },
    (list) => list.name === name && !list.archived,
    () => {
      taskListCreateDrafts.set(binding, name);
    },
    () => {
      taskListCreateDrafts.delete(binding);
      if (taskListCreateForm) taskListCreateForm.reset();
    },
  );
}

type TaskSurface = "tasks" | "today" | "calendar";

function taskSurfaceStatus(surface: TaskSurface): HTMLElement | null {
  if (surface === "tasks") return tasksStatus;
  if (surface === "today") return todayTaskStatus;
  return calendarTaskStatus;
}

function taskSurfaceIsCurrent(
  surface: TaskSurface,
  token: number,
  expectedTargetBinding: string,
  responseTargetBinding: string | null,
  expectedDate: string | null,
  expectedRevision: string | null,
): boolean {
  if (surface === "tasks") {
    return isCurrentTaskResponse(
      taskRequests,
      token,
      currentWorkspaceDestination,
      expectedTargetBinding,
      responseTargetBinding,
    ) &&
      (expectedRevision === null || currentTasksView?.revision === expectedRevision);
  }
  if (surface === "today") {
    return (
      todayTaskRequests.isCurrent(token) &&
      currentWorkspaceDestination === "today" &&
      currentTodayView?.date === expectedDate &&
      currentTodayView.tasks.targetBinding === expectedTargetBinding &&
      responseTargetBinding === expectedTargetBinding &&
      (expectedRevision === null || currentTodayView.tasks.revision === expectedRevision)
    );
  }
  return (
    calendarTaskRequests.isCurrent(token) &&
    currentWorkspaceDestination === "calendar" &&
    selectedCalendarDate === expectedDate &&
    currentCalendarSummaryView?.date === expectedDate &&
    currentCalendarSummaryView.tasks.targetBinding === expectedTargetBinding &&
    responseTargetBinding === expectedTargetBinding &&
    (expectedRevision === null || currentCalendarSummaryView.tasks.revision === expectedRevision)
  );
}

function updateSharedTaskView(view: TasksView): void {
  if (currentTasksView?.targetBinding === view.targetBinding) {
    currentTasksView = view;
  }
  if (currentTodayView?.tasks.targetBinding === view.targetBinding) {
    currentTodayView = { ...currentTodayView, tasks: view };
  }
  if (currentCalendarSummaryView?.tasks.targetBinding === view.targetBinding) {
    currentCalendarSummaryView = { ...currentCalendarSummaryView, tasks: view };
  }
}

function renderTaskSurface(surface: TaskSurface, view: TasksView): void {
  updateSharedTaskView(view);
  if (surface === "tasks") {
    renderTasks(view);
  } else if (surface === "today" && currentTodayView) {
    renderTodayTasks(currentTodayView);
  } else if (surface === "calendar" && currentCalendarSummaryView) {
    renderCalendarTasks(currentCalendarSummaryView);
  }
}

function stashTaskSurfaceDraft(_surface: TaskSurface, form: HTMLFormElement): void {
  stashTaskEditDraft(form);
}

async function renameTaskList(listId: string, form: HTMLFormElement): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const name = form.querySelector<HTMLInputElement>("[data-task-list-name]")?.value.trim() ?? "";
  if (!loaded || !binding || !revision || loaded.state === "error" || loaded.state === "unconfigured") {
    setCopyError(tasksStatus, "tasks.notSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  if (!name) {
    setCopy(tasksStatus, "tasks.enterListName");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    form.querySelector<HTMLInputElement>("[data-task-list-name]")?.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "list-rename", listId]);
  const draftKey = taskListRenameDraftKey(binding, listId);
  taskListRenameDrafts.set(draftKey, name);
  return saveTaskListMutation(
    "rename_task_list",
    loaded,
    listId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      listId,
      name,
    },
    (list) => list.name === name,
    () => taskListRenameDrafts.set(draftKey, name),
    () => taskListRenameDrafts.delete(draftKey),
  );
}

async function setTaskListArchived(listId: string, archived: boolean): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  if (!loaded || !binding || !revision || loaded.state === "error" || loaded.state === "unconfigured") {
    setCopyError(tasksStatus, "tasks.notSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  const operationKey = JSON.stringify([
    binding,
    archived ? "list-archive" : "list-restore",
    listId,
  ]);
  return saveTaskListMutation(
    archived ? "archive_task_list" : "restore_task_list",
    loaded,
    listId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      listId,
    },
    (list) => list.archived === archived,
  );
}

async function updateTask(
  taskId: string,
  form: HTMLFormElement,
  surface: TaskSurface = "tasks",
): Promise<boolean> {
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const task = loaded?.tasks.find((candidate) => candidate.id === taskId);
  const status = taskSurfaceStatus(surface);
  if (
    !loaded ||
    !binding ||
    !revision ||
    !task ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const draft = readTaskDraft(form);
  const name = draft.name.trim();
  if (!name) {
    setCopy(status, "tasks.enterName");
    if (status) status.dataset.state = "error";
    form.querySelector<HTMLInputElement>("[data-task-name]")?.focus();
    return false;
  }
  const normalized = normalizeTaskSchedule(draft.date, draft.time);
  const listId = draft.listId ?? task.listId;
  const edit = {
    targetBinding: binding,
    taskId,
    name,
    content: draft.content.trim() || null,
    date: normalized.date,
    time: normalized.time,
    listId,
  };
  const expectedDate =
    surface === "today"
      ? currentTodayView?.date ?? null
      : surface === "calendar"
        ? currentCalendarSummaryView?.date ?? null
        : null;
  const requests =
    surface === "tasks"
      ? taskRequests
      : surface === "calendar"
        ? calendarTaskRequests
        : todayTaskRequests;
  let request: number | null = null;
  updateTaskOperationState(1);
  try {
    const result = await performTaskUpdateRequest(edit, {
      expectedRevision: revision,
      requests,
      identities: taskOperationIds,
      createChangeId: () => localOperationId("edit-task"),
      invoke: (input) =>
        window.__TAURI__.core.invoke<TasksView>("update_task", { input }),
      onBegin: (operation) => {
        request = operation.requestToken;
      },
      isCurrent: (requestToken, view) =>
        taskSurfaceIsCurrent(
          surface,
          requestToken,
          binding,
          view.targetBinding,
          expectedDate,
          revision,
        ),
    });
    const { view, responseIsCurrent, confirmed } = result;
    if (confirmed) {
      taskEditDrafts.delete(taskDraftKey(binding, taskId));
      renderTaskSurface(surface, view);
      setCopy(status, "tasks.saved");
      if (status) status.dataset.state = "ready";
    } else if (responseIsCurrent) {
      stashTaskSurfaceDraft(surface, form);
      renderTaskSurface(surface, view);
      setCopyError(
        status,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (status) status.dataset.state = "error";
    }
    return view.state !== "error";
  } catch (error) {
    if (
      request !== null &&
      taskSurfaceIsCurrent(surface, request, binding, binding, expectedDate, revision)
    ) {
      stashTaskSurfaceDraft(surface, form);
      renderTaskSurface(surface, loaded);
      setCopyError(status, "tasks.notSaved", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

type TaskLifecycleCommand =
  | "set_task_state"
  | "delete_task"
  | "restore_task"
  | "correct_task_completion";

async function saveTaskLifecycleMutation(
  command: TaskLifecycleCommand,
  loaded: TasksView,
  taskId: string,
  operationKey: string,
  input: Record<string, unknown>,
  confirms: (task: TaskView) => boolean,
  draftForm: HTMLFormElement | null = null,
  surface: TaskSurface = "tasks",
): Promise<boolean> {
  const status = taskSurfaceStatus(surface);
  if (
    !loaded.targetBinding ||
    !loaded.revision ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const expectedDate =
    surface === "today"
      ? currentTodayView?.date ?? null
      : surface === "calendar"
        ? currentCalendarSummaryView?.date ?? null
        : null;
  const requests =
    surface === "tasks"
      ? taskRequests
      : surface === "calendar"
        ? calendarTaskRequests
        : todayTaskRequests;
  const request = requests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>(command, { input });
    const responseIsCurrent = taskSurfaceIsCurrent(
      surface,
      request,
      loaded.targetBinding,
      view.targetBinding,
      expectedDate,
      loaded.revision,
    );
    const savedTask = view.tasks.find(
      (task) => task.id === taskId && confirms(task),
    );
    const confirmed = taskMutationConfirmed(
      responseIsCurrent,
      view.state,
      Boolean(savedTask),
    );
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      taskOperationIds.retireOther(
        taskOperationScope(loaded.targetBinding, taskId),
        operationKey,
      );
      if (loaded.targetBinding && savedTask) {
        reconcileTaskCompletionDraft(loaded.targetBinding, taskId, savedTask);
      }
      renderTaskSurface(surface, view);
      setCopy(status, "tasks.saved");
      if (status) status.dataset.state = "ready";
    } else if (responseIsCurrent) {
      if (draftForm) stashTaskSurfaceDraft(surface, draftForm);
      renderTaskSurface(surface, view);
      setCopyError(
        status,
        "tasks.notSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (status) status.dataset.state = "error";
    }
    return confirmed;
  } catch (error) {
    if (
      taskSurfaceIsCurrent(
        surface,
        request,
        loaded.targetBinding,
        loaded.targetBinding,
        expectedDate,
        loaded.revision,
      )
    ) {
      if (draftForm) stashTaskSurfaceDraft(surface, draftForm);
      renderTaskSurface(surface, loaded);
      setCopyError(status, "tasks.notSaved", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

async function setTaskState(
  taskId: string,
  state: Exclude<TaskView["state"], "deleted">,
  surface: TaskSurface = "tasks",
): Promise<boolean> {
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const task = loaded?.tasks.find((candidate) => candidate.id === taskId);
  const status = taskSurfaceStatus(surface);
  if (!loaded || !binding || !revision || !task || task.deletedAt !== null) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const operationKey = JSON.stringify([binding, "state", taskId, state]);
  const changeId = stableTaskOperationId(
    operationKey,
    "task-state",
    taskOperationScope(binding, taskId),
  );
  return saveTaskLifecycleMutation(
    "set_task_state",
    loaded,
    taskId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      taskId,
      changeId,
      state,
    },
    (candidate) => candidate.state === state && candidate.deletedAt === null,
    null,
    surface,
  );
}

async function deleteTask(taskId: string, surface: TaskSurface = "tasks"): Promise<boolean> {
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const task = loaded?.tasks.find((candidate) => candidate.id === taskId);
  const status = taskSurfaceStatus(surface);
  if (!loaded || !binding || !revision || !task || task.deletedAt !== null) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const operationKey = JSON.stringify([binding, "delete", taskId]);
  const changeId = stableTaskOperationId(
    operationKey,
    "delete-task",
    taskOperationScope(binding, taskId),
  );
  return saveTaskLifecycleMutation(
    "delete_task",
    loaded,
    taskId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      taskId,
      changeId,
    },
    (candidate) => candidate.deletedAt !== null,
    null,
    surface,
  );
}

async function restoreTask(taskId: string, surface: TaskSurface = "tasks"): Promise<boolean> {
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const task = loaded?.tasks.find((candidate) => candidate.id === taskId);
  const status = taskSurfaceStatus(surface);
  if (!loaded || !binding || !revision || !task || task.deletedAt === null) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const operationKey = JSON.stringify([binding, "restore", taskId]);
  const changeId = stableTaskOperationId(
    operationKey,
    "restore-task",
    taskOperationScope(binding, taskId),
  );
  return saveTaskLifecycleMutation(
    "restore_task",
    loaded,
    taskId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      taskId,
      changeId,
    },
    (candidate) => candidate.deletedAt === null,
    null,
    surface,
  );
}

async function correctTaskCompletion(
  taskId: string,
  form: HTMLFormElement,
  surface: TaskSurface = "tasks",
): Promise<boolean> {
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const task = loaded?.tasks.find((candidate) => candidate.id === taskId);
  const status = taskSurfaceStatus(surface);
  if (!loaded || !binding || !revision || !task || task.deletedAt !== null) {
    setCopyError(status, "tasks.notSaved", t("tasks.refreshFirst"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const draft = readTaskDraft(form);
  const completedOn = draft.completionDate.trim();
  const completedTime = draft.completionTime.trim() || null;
  stashTaskSurfaceDraft(surface, form);
  if (!completedOn) {
    setCopy(status, "tasks.completionRequiredDate");
    if (status) status.dataset.state = "error";
    form.querySelector<HTMLInputElement>("[data-task-completion-date]")?.focus();
    return false;
  }
  const operationKey = JSON.stringify([
    binding,
    "completion-correction",
    taskId,
    completedOn,
    completedTime,
  ]);
  const changeId = stableTaskOperationId(
    operationKey,
    "completion-correction",
    taskOperationScope(binding, taskId),
  );
  return saveTaskLifecycleMutation(
    "correct_task_completion",
    loaded,
    taskId,
    operationKey,
    {
      targetBinding: binding,
      expectedRevision: revision,
      taskId,
      changeId,
      completedOn,
      completedTime,
    },
    (candidate) =>
      candidate.state === "completed" &&
      candidate.deletedAt === null &&
      candidate.completion?.completedOn === completedOn &&
      candidate.completion.completedTime === completedTime,
    form,
    surface,
  );
}

function renderWorkspaceFeatureArea(destination: WorkspaceDestination): void {
  const featureArea = workspaceDestinationDetails[destination].featureArea;
  document.querySelectorAll<HTMLElement>("[data-feature-area]").forEach((element) => {
    setCopy(element, featureArea);
  });
}

function renderWorkspaceNavigationLanguage(focus = false): void {
  workspaceDestinationButtons.forEach((button) => {
    const buttonDestination = button.dataset.workspaceDestination;
    const isCurrent = buttonDestination === currentWorkspaceDestination;
    const buttonLabel = isWorkspaceDestination(buttonDestination)
      ? t(workspaceDestinationDetails[buttonDestination].title)
      : t("destination.unknown");
    button.toggleAttribute("aria-current", isCurrent);
    if (isCurrent) button.setAttribute("aria-current", "page");
    button.setAttribute("aria-pressed", String(isCurrent));
    button.setAttribute(
      "aria-label",
      isCurrent
        ? t("navigation.currentDestination", { destination: buttonLabel })
        : buttonLabel,
    );
    if (focus && isCurrent) button.focus();
  });
}

function renderWorkspaceRailContext(destination: WorkspaceDestination): void {
  if (!workspaceRailContextKicker || !workspaceRailContextTitle || !workspaceRailContextDetail) {
    return;
  }

  if (destination === "today") {
    const date = currentTodayView?.date ?? selectedTodayDate;
    setCopy(workspaceRailContextKicker, "workspace.todayDate", { date: date ?? "—" });
    workspaceRailContextTitle.textContent = date ? calendarDateLabel(date) : t("destination.today");
    setCopy(workspaceRailContextDetail, "workspace.todayRail");
    return;
  }

  if (destination === "tasks") {
    setCopy(workspaceRailContextKicker, "tasks.selected");
    setCopy(workspaceRailContextTitle, "destination.tasks");
    setCopy(workspaceRailContextDetail, "workspace.tasksRail");
    return;
  }

  if (destination === "calendar") {
    const month = currentCalendarMonth;
    setCopy(workspaceRailContextKicker, "workspace.monthView");
    workspaceRailContextTitle.textContent = month
      ? formatInterfaceMonth(month.year, month.month, currentInterfaceLanguage)
      : t("destination.calendar");
    setCopy(
      workspaceRailContextDetail,
      selectedCalendarDate ? "workspace.selected" : "calendar.chooseDate",
      selectedCalendarDate ? { date: calendarDateLabel(selectedCalendarDate) } : {},
    );
    return;
  }

  if (destination === "settings") {
    setCopy(workspaceRailContextKicker, "workspace.settingsMac");
    setCopy(workspaceRailContextTitle, "destination.settings");
    setCopy(workspaceRailContextDetail, "workspace.settingsRail");
    return;
  }

  const summary = currentHabitSnapshot?.summary;
  setCopy(workspaceRailContextKicker, "workspace.habitsWeek");
  if (summary) {
    setCopy(workspaceRailContextTitle, "workspace.knownCount", {
      known: summary.knownCompletions,
      target: summary.targetCompletions,
    });
  } else {
    setCopy(workspaceRailContextTitle, "destination.habits");
  }
  setCopy(workspaceRailContextDetail, "workspace.habitsRail");
}

function renderWorkspaceContextStatus(destination: WorkspaceDestination): void {
  if (!workspaceContextStatus) {
    return;
  }
  const summary = currentHabitSnapshot?.summary;
  if (destination === "habits" && currentHabitSnapshot?.habits.length && summary) {
    const total = document.createElement("strong");
    total.textContent = `${summary.knownCompletions} / ${summary.targetCompletions}`;
    const label = document.createElement("small");
    setCopy(label, "workspace.weekKnown");
    workspaceContextStatus.replaceChildren(total, label);
    workspaceContextStatus.dataset.state = "habits-summary";
    return;
  }
  setCopy(workspaceContextStatus, "workspace.current", {
    destination: t(workspaceDestinationDetails[destination].title),
  });
  workspaceContextStatus.dataset.state = "default";
}

function showWorkspaceDestination(
  destination: WorkspaceDestination,
  focus = false,
  dailyDate: string | null = null,
): void {
  const destinationChanged = currentWorkspaceDestination !== destination;
  const leavingToday = currentWorkspaceDestination === "today" && destination !== "today";
  const leavingTasks = currentWorkspaceDestination === "tasks" && destination !== "tasks";
  const leavingCalendar = currentWorkspaceDestination === "calendar" && destination !== "calendar";
  const leavingHabits = currentWorkspaceDestination === "habits" && destination !== "habits";
  const changingTodaySelection =
    destination === "today" &&
    (destinationChanged || selectedTodayDate !== dailyDate);
  if (leavingToday || changingTodaySelection) {
    todayPresentationRequests.invalidate();
    todayTaskRequests.invalidate();
    if (changingTodaySelection) {
      stashTodayTaskCreateDraft();
      currentTodayView = null;
    }
  }
  if (leavingTasks) {
    stashTaskCreateDraft();
    taskEditorForms("tasks").forEach(stashTaskEditDraft);
    clearTaskEditorDialogs("tasks");
    taskRequests.invalidate();
  }
  if (leavingCalendar) {
    stashCalendarTaskCreateDraft();
    taskEditorForms("calendar").forEach(stashTaskEditDraft);
    calendarMonthRequests.invalidate();
    calendarSelectionRequests.invalidate();
    calendarTaskRequests.invalidate();
  }
  if (leavingHabits) {
    habitSnapshotRequests.invalidate();
    habitDateRequests.invalidate();
    habitCompletionRequests.invalidate();
    stashHabitNoteDraft();
    currentHabitDateView = null;
  }
  currentWorkspaceDestination = destination;
  appShell?.setAttribute("data-workspace-destination", destination);
  const details = workspaceDestinationDetails[destination];
  renderWorkspaceNavigationLanguage(focus);
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
  setCopy(workspaceTitle, details.title);
  setCopy(workspaceDescription, details.description);
  renderWorkspaceContextStatus(destination);
  renderWorkspaceFeatureArea(destination);
  renderWorkspaceRailContext(destination);
  if (destination === "today") {
    selectedTodayDate = dailyDate;
    if (dailyDate !== null) {
      stashTodayTaskCreateDraft();
      if (todayDate) {
        setCopy(todayDate, "today.selectedDate", { date: dailyDate });
      }
      if (todayStatus) {
        setCopy(todayStatus, "today.loadingDate", { date: dailyDate });
        todayStatus.dataset.state = "loading";
      }
    }
    void refreshToday(dailyDate, true);
  }
  if (destination === "tasks") {
    void refreshTasks();
  }
  if (destination === "calendar") {
    void openCalendar();
  }
  if (destination === "habits") {
    const selection = selectedHabitCell;
    void refreshHabits().then(() => {
      if (selection) void loadSelectedHabitDate(selection.habitKey, selection.date);
    });
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
    try {
      const language = await window.__TAURI__.core.invoke<InterfaceLanguagePreferences>(
        "interface_language_preferences",
      );
      interfaceLanguageMutations.confirm(language);
      renderInterfaceLanguage(language);
    } catch (error) {
      if (interfaceLanguageStatus) {
        setCopyError(interfaceLanguageStatus, "language.saveFailed", error);
      }
    }
    setCopy(runtimeStatus, "runtime.ready");
    runtimeStatus.dataset.state = "ready";
    document.title = identity.productName;
    document.querySelectorAll<HTMLElement>("[data-product-name]").forEach((element) => {
      element.textContent = identity.productName;
    });
    renderWorkspaceFeatureArea(currentWorkspaceDestination);
    try {
      const preferences = await window.__TAURI__.core.invoke<AppearancePreferences>(
        "appearance_preferences",
      );
      appearanceMutations.confirm(preferences);
      renderAppearance(preferences);
    } catch (error) {
      if (appearanceStatus) {
        setCopyError(appearanceStatus, "appearance.loadFailed", error);
        appearanceStatus.dataset.state = "error";
      }
    }
  } catch {
    setCopy(runtimeStatus, "runtime.unavailable");
    runtimeStatus.dataset.state = "error";
    return;
  }

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

renderInterfaceLanguage({ interfaceLanguage: "zh" });
syncWorkspaceViewportMode();
window.addEventListener("resize", () => {
  syncWorkspaceViewportMode();
});
showWorkspaceDestination("today");

selectTodayVaultButton?.addEventListener("click", () => {
  void selectTodayVault();
});

workspaceSettingsButton?.addEventListener("click", () => {
  showWorkspaceDestination("settings");
});

workspaceLanguageButton?.addEventListener("click", () => {
  void chooseInterfaceLanguage(currentInterfaceLanguage === "zh" ? "en" : "zh");
});

settingsCategoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const section = button.dataset.settingsSection;
    if (section === "appearance" || section === "data") showSettingsSection(section);
  });
});

accentColorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const accentColor = button.dataset.accentColor;
    if (accentColor === "forest" || accentColor === "blue" || accentColor === "clay" || accentColor === "lilac") {
      void chooseAccentColor(accentColor);
    }
  });
});

restoreAppearanceButton?.addEventListener("click", () => {
  void restoreAppearance();
});

chooseBackgroundImageButton?.addEventListener("click", () => {
  void chooseBackgroundImage();
});

removeBackgroundImageButton?.addEventListener("click", () => {
  void removeBackgroundImage();
});

settingsSelectVaultButton?.addEventListener("click", () => {
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

refreshHabitsButton?.addEventListener("click", () => {
  if (habitCompletionOperationCount > 0) return;
  habitCompletionStatus = null;
  void refreshHabits();
});

taskFilter?.addEventListener("change", () => {
  const state = taskFilter.value;
  if (
    state !== "all" &&
    state !== "pending" &&
    state !== "completed" &&
    state !== "abandoned" &&
    state !== "deleted"
  ) {
    return;
  }
  taskStateScope = state;
  if (currentTasksView) renderTasks(currentTasksView);
});

taskNewButton?.addEventListener("click", () => {
  taskCreateOpen = true;
  if (currentTasksView) renderTasks(currentTasksView);
  taskCreateName?.focus();
});

taskCreateCancel?.addEventListener("click", () => {
  taskCreateOpen = false;
  const binding = currentTasksView?.targetBinding;
  if (binding) taskCreateDrafts.delete(binding);
  taskCreateForm?.reset();
  if (currentTasksView) renderTasks(currentTasksView);
});

taskNewListButton?.addEventListener("click", () => {
  taskListManagementOpen = !taskListManagementOpen;
  if (currentTasksView) renderTasks(currentTasksView);
  if (taskListManagementOpen) taskListCreateName?.focus();
});

taskListsManagementClose?.addEventListener("click", () => {
  taskListManagementOpen = false;
  if (currentTasksView) renderTasks(currentTasksView);
});

refreshTasksButton?.addEventListener("click", () => {
  if (taskOperationCount === 0) void refreshTasks();
});

taskCreateDate?.addEventListener("change", () => {
  normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime);
  stashTaskCreateDraft();
});
taskCreateList?.addEventListener("change", () => {
  const selected = currentTasksView && taskListForId(currentTasksView, taskCreateList.value);
  if (selected && taskCreateListLabel && taskCreateSubmit) {
    setRawText(taskCreateListLabel, selected.name);
    setRawText(
      taskCreateSubmit,
      selected.id === "inbox"
        ? t("tasks.add")
        : t("tasks.addToList", { list: selected.name }),
    );
  }
  stashTaskCreateDraft();
});
taskCreateForm?.addEventListener("input", stashTaskCreateDraft);
taskCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  stashTaskCreateDraft();
  void pendingWrites.track(createTask());
});
taskListCreateForm?.addEventListener("input", () => {
  const binding = currentTasksView?.targetBinding;
  if (binding && taskListCreateName) {
    taskListCreateDrafts.set(binding, taskListCreateName.value);
  }
});
taskListCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void pendingWrites.track(createTaskList());
});

tasksDestination?.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  const listForm = target.closest<HTMLFormElement>("form[data-task-list-editor]");
  const listId = listForm?.dataset.taskListEditor;
  const binding = currentTasksView?.targetBinding;
  if (listForm && listId && binding && target.matches("[data-task-list-name]")) {
    taskListRenameDrafts.set(
      taskListRenameDraftKey(binding, listId),
      (target as HTMLInputElement).value,
    );
    return;
  }
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  if (form) stashTaskEditDraft(form);
});

tasksDestination?.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  const stateAction = target.closest<HTMLInputElement>(
    "input[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state));
    }
    return;
  }
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  if (!form) return;
  if (target.matches("input[data-task-date]")) {
    normalizeTaskDateTimeFields(
      form.querySelector<HTMLInputElement>("[data-task-date]"),
      form.querySelector<HTMLInputElement>("[data-task-time]"),
    );
  }
  stashTaskEditDraft(form);
});

tasksDestination?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (toggleTaskEditorDetails(target)) return;
  const scopeButton = target.closest<HTMLButtonElement>("button[data-task-scope]");
  const scope = scopeButton?.dataset.taskScope;
  if (
    scope &&
    (scope === "all" ||
      scope === "today" ||
      scope === "inbox" ||
      scope === "archived" ||
      (scope.startsWith("list:") && Boolean(taskListIdFromScope(scope as TaskListScope))))
  ) {
    taskScope = scope as TaskListScope;
    if (currentTasksView) renderTasks(currentTasksView);
    return;
  }
  const archiveList = target.closest<HTMLButtonElement>("button[data-task-list-archive]");
  if (archiveList?.dataset.taskListArchive) {
    void pendingWrites.track(setTaskListArchived(archiveList.dataset.taskListArchive, true));
    return;
  }
  const restoreList = target.closest<HTMLButtonElement>("button[data-task-list-restore]");
  if (restoreList?.dataset.taskListRestore) {
    void pendingWrites.track(setTaskListArchived(restoreList.dataset.taskListRestore, false));
    return;
  }
  const stateAction = target.closest<HTMLButtonElement>(
    "button[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state));
    }
    return;
  }
  const remove = target.closest<HTMLButtonElement>("button[data-task-delete]");
  if (remove?.dataset.taskDelete) {
    void pendingWrites.track(deleteTask(remove.dataset.taskDelete));
    return;
  }
  const restore = target.closest<HTMLButtonElement>("button[data-task-restore]");
  if (restore?.dataset.taskRestore) {
    void pendingWrites.track(restoreTask(restore.dataset.taskRestore));
    return;
  }
  const correct = target.closest<HTMLButtonElement>(
    "button[data-task-correct-completion]",
  );
  const form = correct?.closest<HTMLFormElement>("form[data-task-editor]");
  if (correct?.dataset.taskCorrectCompletion && form) {
    void pendingWrites.track(
      correctTaskCompletion(correct.dataset.taskCorrectCompletion, form),
    );
  }
});

tasksDestination?.addEventListener("submit", (event) => {
  const target = event.target as HTMLElement;
  const listForm = target.closest<HTMLFormElement>("form[data-task-list-editor]");
  const listId = listForm?.dataset.taskListEditor;
  if (listForm && listId) {
    event.preventDefault();
    void pendingWrites.track(renameTaskList(listId, listForm));
    return;
  }
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  const taskId = form?.dataset.taskEditor;
  if (!form || !taskId) return;
  event.preventDefault();
  stashTaskEditDraft(form);
  void pendingWrites.track(updateTask(taskId, form));
});

habitsDestination?.addEventListener("change", (event) => {
  const checkbox = (event.target as HTMLElement).closest<HTMLInputElement>(
    "input[data-habit-completion-key][data-habit-completion-date]",
  );
  if (!checkbox) return;
  const habitKey = checkbox.dataset.habitCompletionKey;
  const livedDate = checkbox.dataset.habitCompletionDate;
  if (!habitKey || !livedDate) return;
  const operation = setLocalHabitCompletion(habitKey, livedDate, checkbox.checked);
  void pendingWrites.track(operation);
});

habitsDestination?.addEventListener("click", (event) => {
  const correct = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-correct-record-id]",
  );
  if (correct && currentHabitDateView?.targetBinding) {
    const record = currentHabitDateView.daytime.shortRecords.find(
      (candidate) => candidate.id === correct.dataset.habitCorrectRecordId,
    );
    if (!record || record.category !== "exercise") return;
    habitNoteDrafts.set(currentHabitDateView.targetBinding, {
      content: record.text,
      correctionId: record.id,
    });
    habitNoteStatus = null;
    renderSelectedHabitCell();
    habitsDestination
      .querySelector<HTMLInputElement>("input[data-habit-note-input]")
      ?.focus();
    return;
  }
  const cancelCorrection = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-cancel-correction]",
  );
  if (cancelCorrection && currentHabitDateView?.targetBinding) {
    habitNoteDrafts.delete(currentHabitDateView.targetBinding);
    habitNoteStatus = null;
    renderSelectedHabitCell();
    habitsDestination
      .querySelector<HTMLInputElement>("input[data-habit-note-input]")
      ?.focus();
    return;
  }
  const expand = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-expand]",
  );
  if (expand) {
    const row = expand.closest<HTMLElement>(".habit-snapshot-row");
    const history = row?.querySelector<HTMLElement>(".habit-history");
    const recent = row?.querySelector<HTMLElement>(".habit-recent");
    if (!history) return;
    history.hidden = !history.hidden;
    if (recent) recent.hidden = !history.hidden;
    row?.classList.toggle("is-expanded", !history.hidden);
    expand.setAttribute("aria-expanded", String(!history.hidden));
    setCopy(expand, history.hidden ? "habits.expand" : "habits.collapse");
    if (history.hidden && selectedHabitCell?.habitKey === row?.dataset.habitKey) {
      habitDateRequests.invalidate();
      selectedHabitCell = null;
      currentHabitDateView = null;
      habitNoteStatus = null;
    }
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-key][data-habit-date]",
  );
  if (!button) return;
  const key = button.dataset.habitKey;
  const date = button.dataset.habitDate;
  if (!key || !date) return;
  void loadSelectedHabitDate(key, date);
});

habitsDestination?.addEventListener("input", (event) => {
  if ((event.target as HTMLElement).matches("input[data-habit-note-input]")) {
    stashHabitNoteDraft();
  }
});

habitsDestination?.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>(
    "form[data-habit-note-form]",
  );
  if (!form) return;
  event.preventDefault();
  stashHabitNoteDraft();
  const save = saveHabitExerciseNote();
  void pendingWrites.track(save);
});

todayDaytimeContent?.addEventListener("input", stashDatedNoteDraft);
todayDaytimeKind?.addEventListener("change", stashDatedNoteDraft);

todayTaskCreateDate?.addEventListener("change", () => {
  normalizeTaskDateTimeFields(todayTaskCreateDate, todayTaskCreateTime);
  stashTodayTaskCreateDraft();
});
todayTaskCreateList?.addEventListener("change", () => {
  const view = currentTodayView?.tasks;
  const selected = view && taskListForId(view, todayTaskCreateList.value);
  if (selected && todayTaskCreateSubmit) {
    setRawText(
      todayTaskCreateSubmit,
      selected.id === "inbox"
        ? t("tasks.add")
        : t("tasks.addToList", { list: selected.name }),
    );
  }
  stashTodayTaskCreateDraft();
});
todayTaskCreateForm?.addEventListener("input", stashTodayTaskCreateDraft);
todayTaskCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  stashTodayTaskCreateDraft();
  void pendingWrites.track(createTodayTask());
});

const todayTaskPanel = document.querySelector<HTMLElement>(".day-task-panel");
todayTaskPanel?.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  if (form) stashTaskEditDraft(form);
});

todayTaskPanel?.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  const stateAction = target.closest<HTMLInputElement>(
    "input[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state, "today"));
    }
    return;
  }
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  if (!form) return;
  if (target.matches("input[data-task-date]")) {
    normalizeTaskDateTimeFields(
      form.querySelector<HTMLInputElement>("[data-task-date]"),
      form.querySelector<HTMLInputElement>("[data-task-time]"),
    );
  }
  stashTaskEditDraft(form);
});

todayTaskPanel?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (toggleTaskEditorDetails(target)) return;
  const stateAction = target.closest<HTMLButtonElement>(
    "button[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state, "today"));
    }
    return;
  }
  const remove = target.closest<HTMLButtonElement>("button[data-task-delete]");
  if (remove?.dataset.taskDelete) {
    void pendingWrites.track(deleteTask(remove.dataset.taskDelete, "today"));
    return;
  }
  const restore = target.closest<HTMLButtonElement>("button[data-task-restore]");
  if (restore?.dataset.taskRestore) {
    void pendingWrites.track(restoreTask(restore.dataset.taskRestore, "today"));
    return;
  }
  const correct = target.closest<HTMLButtonElement>(
    "button[data-task-correct-completion]",
  );
  const form = correct?.closest<HTMLFormElement>("form[data-task-editor]");
  if (correct?.dataset.taskCorrectCompletion && form) {
    void pendingWrites.track(
      correctTaskCompletion(correct.dataset.taskCorrectCompletion, form, "today"),
    );
  }
});

todayTaskPanel?.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>(
    "form[data-task-editor]",
  );
  const taskId = form?.dataset.taskEditor;
  if (!form || !taskId) return;
  event.preventDefault();
  stashTaskEditDraft(form);
  void pendingWrites.track(updateTask(taskId, form, "today"));
});

calendarTaskCreateDate?.addEventListener("change", () => {
  normalizeTaskDateTimeFields(calendarTaskCreateDate, calendarTaskCreateTime);
  stashCalendarTaskCreateDraft();
});
calendarTaskCreateList?.addEventListener("change", () => {
  const view = currentCalendarSummaryView?.tasks;
  const selected = view && taskListForId(view, calendarTaskCreateList.value);
  if (selected && calendarTaskCreateSubmit) {
    setRawText(
      calendarTaskCreateSubmit,
      selected.id === "inbox"
        ? t("tasks.add")
        : t("tasks.addToList", { list: selected.name }),
    );
  }
  stashCalendarTaskCreateDraft();
});
calendarTaskCreateForm?.addEventListener("input", stashCalendarTaskCreateDraft);
calendarTaskCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  stashCalendarTaskCreateDraft();
  void pendingWrites.track(createCalendarTask());
});

calendarTaskPanel?.addEventListener("input", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>(
    "form[data-task-editor]",
  );
  if (form) stashTaskEditDraft(form);
});

calendarTaskPanel?.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  const stateAction = target.closest<HTMLInputElement>(
    "input[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state, "calendar"));
    }
    return;
  }
  const form = target.closest<HTMLFormElement>("form[data-task-editor]");
  if (!form) return;
  if (target.matches("input[data-task-date]")) {
    normalizeTaskDateTimeFields(
      form.querySelector<HTMLInputElement>("[data-task-date]"),
      form.querySelector<HTMLInputElement>("[data-task-time]"),
    );
  }
  stashTaskEditDraft(form);
});

calendarTaskPanel?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (toggleTaskEditorDetails(target)) return;
  const stateAction = target.closest<HTMLButtonElement>(
    "button[data-task-state-action][data-task-state-task]",
  );
  if (stateAction) {
    const taskId = stateAction.dataset.taskStateTask;
    const state = stateAction.dataset.taskStateAction;
    if (
      taskId &&
      (state === "pending" || state === "completed" || state === "abandoned")
    ) {
      void pendingWrites.track(setTaskState(taskId, state, "calendar"));
    }
    return;
  }
  const remove = target.closest<HTMLButtonElement>("button[data-task-delete]");
  if (remove?.dataset.taskDelete) {
    void pendingWrites.track(deleteTask(remove.dataset.taskDelete, "calendar"));
    return;
  }
  const restore = target.closest<HTMLButtonElement>("button[data-task-restore]");
  if (restore?.dataset.taskRestore) {
    void pendingWrites.track(restoreTask(restore.dataset.taskRestore, "calendar"));
    return;
  }
  const correct = target.closest<HTMLButtonElement>(
    "button[data-task-correct-completion]",
  );
  const form = correct?.closest<HTMLFormElement>("form[data-task-editor]");
  if (correct?.dataset.taskCorrectCompletion && form) {
    void pendingWrites.track(
      correctTaskCompletion(correct.dataset.taskCorrectCompletion, form, "calendar"),
    );
  }
});

calendarTaskPanel?.addEventListener("submit", (event) => {
  const form = (event.target as HTMLElement).closest<HTMLFormElement>(
    "form[data-task-editor]",
  );
  const taskId = form?.dataset.taskEditor;
  if (!form || !taskId) return;
  event.preventDefault();
  stashTaskEditDraft(form);
  void pendingWrites.track(updateTask(taskId, form, "calendar"));
});

historicalHabitList?.addEventListener("change", (event) => {
  const input = (event.target as HTMLElement).closest<HTMLInputElement>(
    "input[data-historical-habit-completion-key][data-historical-habit-completion-date]",
  );
  const habitKey = input?.dataset.historicalHabitCompletionKey;
  const livedDate = input?.dataset.historicalHabitCompletionDate;
  if (!input || !habitKey || !livedDate) return;
  void pendingWrites.track(
    setHistoricalHabitCompletion(habitKey, livedDate, input.checked),
  );
});

todayDaytimeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void pendingWrites.track(saveDatedNote());
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
  if (!currentTodayView.targetBinding) {
    return;
  }
  datedNoteDrafts.set(currentTodayView.targetBinding, {
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
  if (currentTodayView.targetBinding) {
    datedNoteDrafts.delete(currentTodayView.targetBinding);
  }
  renderDatedNoteComposer(currentTodayView);
  todayDaytimeContent?.focus();
});

todayEveningForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!todayEveningMode || !todayEveningContent) {
    return;
  }
  void pendingWrites.track((async () => {
    const saved = await saveTodayMutation(
      "update_evening_review",
      { mode: todayEveningMode.value, content: todayEveningContent.value },
      "today.eveningSaved",
    );
    if (saved) {
      todayEveningContent.value = "";
    }
    return saved;
  })());
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


window.addEventListener("focus", () => {
  if (currentWorkspaceDestination === "today") {
    void refreshToday();
  } else if (currentWorkspaceDestination === "calendar") {
    void openCalendar();
  } else if (currentWorkspaceDestination === "tasks") {
    void refreshTasks();
  } else if (currentWorkspaceDestination === "habits") {
    void refreshHabits();
  }
});

void connectToApplication();

export {};
