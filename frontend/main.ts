import { attachTodayAxisGestures, taskAxisDateTime, taskAxisMinute, type AxisGestureTarget, type AxisGestureCommit } from "./today-axis-gestures.js";
import { EveningReviewGuardError, initializeEveningReviewEntry } from "./evening-review-entry.js";
import { initializeCollaborationCommandCompletion } from "./collaboration-command-completion.js";
import { appendCollaborationMarkdown, appendCollaborationWorkHistory, type CollaborationWorkHistory, type CollaborationLink, type WorkHistoryLabels } from "./collaboration-work-history.js";
import { initializeCollaborationPanels } from "./collaboration-panels.js";
import {
  DatedNoteTargetChangedError,
  submitDatedNote,
} from "./dated-note-command.js";
import { LatestRequest } from "./latest-request.js";
import { HistoricalHabitArrival } from "./historical-habit-arrival.js";
import {
  canMutateTodayTasks,
  canStartManualTodayRefresh,
  refreshTodayPresentation,
} from "./today-refresh.js";
import {
  TODAY_AXIS_LABEL_MINIMUM_MINUTES,
  axisMarkerLayout,
  axisOverlapPlacements,
  clockResultMatchesSession,
  clockTickDecision,
  hourTickIsClearFromNow,
  hourTickMinutes,
  locateNow,
  livedAxisMinute,
  onManualScroll,
  stripLeadingAxisTimeLabel,
  type TodayAxisFollowState,
  type TodayAxisSession,
} from "./today-time-axis.js";
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
  localizeCollaborationDiagnostic,
  localizeWorkHistoryDiagnostic,
  localizeHabitActualTimeLabel,
  localizeHabitCoverageLabel,
  localizeHabitDetail,
  localizeHabitGoalLabel,
  updateTodayAxisMarkerAccessibleName,
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
  beginVoiceTranscriptSave,
  enqueueCollaborationDraftWrite,
  submitCollaborationDraftSnapshot,
  type CollaborationVoiceFailure,
  type CollaborationVoiceTarget,
} from "./collaboration-voice.js";
import { BrowserCodexDictationRuntime } from "./collaboration-dictation-runtime.js";
import { CodexCollaborationVoiceInputController } from "./collaboration-dictation.js";
import {
  calendarTasksForDate,
  isCurrentTaskResponse,
  isCurrentTodayTaskResponse,
  normalizeTaskSchedule,
  taskOperationScope,
  TaskOperationIdentityStore,
  performTaskUpdateRequest,
  taskListIdFromScope,
  taskListDisplayName,
  taskListCount,
  taskListMutationConfirmed,
  taskListScopeForId,
  taskFolderScopeForId,
  taskFolderIdFromScope,
  taskParentCandidates,
  taskScopeCount,
  taskDisplaySections,
  taskHistoryGroups,
  taskPropertiesPresentation,
  taskMutationConfirmed,
  taskVisibleInScope,
  todayTaskGroups,
  todayTaskTimeAxisEntries,
  type TaskListScope,
  type TaskPriority,
  type TaskPriorityFilter,
  type TaskPrioritySort,
} from "./task-presentation.js";
import {
  habitCompletionPresentation,
  historicalHabitCorrectionDate,
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

type TimeAxisEntryView = Readonly<{
  planId?: string | null;
  timeEditable?: boolean;
  planPrecision?: "broad" | "approximatePoint" | "exactPoint" | "exactRange" | "unlocated" | null;
  period: string | null;
  text: string;
  sourceDate: string;
  startMinute: number | null;
  endMinute: number | null;
  continuesFromPreviousDay: boolean;
  continuesIntoNextDay: boolean;
  task?: Readonly<{
    id: string;
    state: "pending" | "completed";
    timePassed: boolean;
  }>;
}>;

type TimedTodayAxisEntry = TimeAxisEntryView & Readonly<{
  lane: "arrangement" | "facts" | "tasks";
}>;

type TimeAxisView = Readonly<{
  currentArrangement: readonly TimeAxisEntryView[];
  confirmedFacts: readonly TimeAxisEntryView[];
  unlocatedCurrentArrangement: readonly TimeAxisEntryView[];
  unlocatedConfirmedFacts: readonly TimeAxisEntryView[];
}>;

type TodayClockView = Readonly<{ date: string; time: string; livedDate: string }>;

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
  previousExecutionEnd?: Readonly<{date: string; time: string}> | null;
  newExecutionEnd?: Readonly<{date: string; time: string}> | null;
  previousParentTaskId?: string | null;
  newParentTaskId?: string | null;
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
        executionEnd?: Readonly<{ date: string; time: string }> | null;
      }>
    | Readonly<{
        kind: "manualUpdate";
        name: string;
        content: string | null;
        date: string | null;
        time: string | null;
        listId: string | null;
        executionEnd?: Readonly<{ date: string; time: string }> | null;
        parentTaskId?: string | null;
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
  source: "checkbox" | "reported" | "date-correction" | "daily-flow";
}>;

type TaskView = Readonly<{
  executionEnd: Readonly<{ date: string; time: string }> | null;
  priority?: TaskPriority | null;
  tagIds?: readonly string[];
  parentTaskId?: string | null;
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
  timePassed: boolean;
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
    folderId?: string | null;
  }>[];
  folders?: readonly Readonly<{ id: string; name: string }>[];
  tags?: readonly Readonly<{ id: string; name: string }>[];
  tasks: readonly TaskView[];
}>;

type TodayView = Readonly<{
  state: TodayState;
  date: string;
  isToday: boolean;
  currentTime: string | null;
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
  timeAxis: TimeAxisView;
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

type HabitGoalTarget =
  | Readonly<{ kind: "daily-completion" }>
  | Readonly<{ kind: "weekly-count"; standard: number }>
  | Readonly<{
      kind: "daily-time";
      standard: string;
      dayRelation: "same-day" | "next-day" | "unresolved";
    }>;

type HabitDefinitionView = Readonly<{
  origin: "local" | "sourced";
  emoji: string | null;
  group: string | null;
  startDate: string | null;
  currentGoal: HabitGoalTarget | null;
  currentGoalEffectiveFrom: string | null;
  pendingGoal: HabitGoalTarget | null;
  pendingGoalEffectiveFrom: string | null;
  partialGoalCycle: boolean;
}>;

type HabitView = Readonly<{
  key: string;
  name: string;
  localizedNames: HabitLocalizedNames;
  active: boolean;
  canRecordCompletion: boolean;
  goalKind: "daily-completion" | "weekly-count" | "daily-time";
  goalLabel: string;
  goalTarget: HabitGoalTarget | null;
  definition: HabitDefinitionView | null;
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
  livedDate: string | null;
  readError?: string;
  generatedAt: string | null;
  displayRangeLabel: string | null;
  rangeLabel: string | null;
  producerLabel: string | null;
  completionRevision: string | null;
  completionTargetBinding: string | null;
  catalogRevision: string | null;
  catalogTargetBinding: string | null;
  catalogError: string | null;
  completionError: string | null;
  namesConfigurationState: HabitNamesConfigurationState;
  summary: Readonly<{
    knownCompletions: number;
    targetCompletions: number;
    coverageNote: string;
    excludedNoGoal: number;
  }>;
  habits: readonly HabitView[];
}>;

type HabitDefinitionMutationInput = Readonly<{
  operationId: string;
  targetBinding: string;
  expectedRevision: string | null;
  habitKey: string | null;
  language: InterfaceLanguage;
  name: string;
  emoji: string | null;
  group: string | null;
  startDate: string | null;
  goal: HabitGoalTarget | null;
}>;

type HabitDefinitionSaveResult = Readonly<{
  outcome: "created" | "updated";
  operationId: string;
  habitKey: string;
  revision: string;
  snapshot: HabitSnapshotView;
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

type WorkspaceDestination =
  | "today"
  | "tasks"
  | "calendar"
  | "habits"
  | "collaboration"
  | "settings";

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return (
    value === "today" ||
    value === "tasks" ||
    value === "calendar" ||
    value === "habits" ||
    value === "collaboration" ||
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
  collaboration: {
    title: "destination.collaboration",
    description: "workspace.collaborationDescription",
    featureArea: "workspace.collaborationFeature",
  },
  settings: {
    title: "destination.settings",
    description: "workspace.settingsDescription",
    featureArea: "workspace.settingsFeature",
  },
};

type CollaborationContextPane = Readonly<{
  state: string;
  message: string;
  items: readonly string[];
}>;

type CollaborationContextView = Readonly<{
  date: string;
  vaultName: string | null;
  dailyRecord: CollaborationContextPane;
  tasks: CollaborationContextPane;
  taskRevision: string | null;
  taskTargetBinding: string | null;
  taskRecords: readonly CollaborationTaskReferenceView[];
  taskLists: readonly CollaborationTaskListReferenceView[];
  habits: CollaborationContextPane;
}>;

type CollaborationMemorySource = Readonly<{
  state: string;
  sourcePath: string;
  content: string;
  revision: string | null;
  message: string;
}>;

type CollaborationRoutineReference = Readonly<{
  state: string;
  sourcePath: string;
  content: string;
  message: string;
}>;

type CollaborationRecentMemoryView = Readonly<{
  id: string;
  sessionId: string;
  sessionTitle: string;
  activityDate: string;
  summary: string;
  sourceMessageId: string;
  expiresOn: string;
  updatedAt: string;
}>;

type CollaborationOpenMatterView = Readonly<{
  id: string;
  sessionId: string;
  sessionTitle: string;
  activityDate: string;
  state: string;
  summary: string;
  updatedAt: string;
}>;

type CollaborationMemoryView = Readonly<{
  vaultBinding: string | null;
  longTerm: CollaborationMemorySource;
  routineReference: CollaborationRoutineReference;
  recent: readonly CollaborationRecentMemoryView[];
  openMatters: readonly CollaborationOpenMatterView[];
  correctionNote: string;
  correctionNoteExpiresOn: string | null;
  correctionRevision: number;
  generatedAt: string;
}>;

type CollaborationMemoryProposalView = Readonly<{
  id: string;
  executionAttempted?: boolean;
  status: string;
  basis: string;
  authorizationQuote: string;
  change: string;
  replaces: string | null;
  sourceRevision: string;
  resultMessage: string | null;
  createdAt: string;
  updatedAt: string;
}>;

type CollaborationTaskReferenceView = Readonly<{
  id: string;
  name: string;
  content: string | null;
  date: string | null;
  time: string | null;
  executionEnd?: Readonly<{date: string; time: string}> | null;
  listId: string;
  state: "pending" | "completed" | "abandoned";
  deletedAt: string | null;
  completion: TaskCompletionView | null;
}>;

type CollaborationTaskListReferenceView = Readonly<{
  id: string;
  name: string;
  isSystem: boolean;
  archived: boolean;
}>;

type CollaborationMessageView = Readonly<{
  id: string;
  role: string;
  text: string;
  messageDate: string;
  targetDate: string;
  createdAt: string;
  executionId: string | null;
  runtimeTurnId: string | null;
  deliveryState: string;
  resultChecked: boolean;
  automaticPlan: boolean;
  externalAppIds: readonly string[];
  externalActions: readonly CollaborationExternalToolAction[];
  actionResults?: readonly Readonly<{ id: string; source: string; status: string; targetDate: string | null; messageKind?: "diagnostic" | "sourceText"; message: string }>[];
  pendingExternalApproval: CollaborationExternalApprovalRequest | null;
}>;

type CollaborationExternalToolAction = Readonly<{
  actionId: string;
  sourceId: string;
  sourceName: string;
  toolId: string;
  status: string;
  targetScope: string;
  inputSummary: string;
  resultSummary: string;
  verification?: unknown | null;
}>;

type CollaborationExternalApprovalChoice = Readonly<{
  label: string;
  description: string;
}>;

type CollaborationExternalApprovalQuestion = Readonly<{
  id: string;
  header: string;
  question: string;
  options: readonly CollaborationExternalApprovalChoice[];
}>;

type CollaborationExternalApprovalRequest = Readonly<{
  id: string;
  itemId: string;
  sourceId: string;
  sourceName: string;
  toolId: string;
  targetScope: string;
  inputSummary: string;
  questions: readonly CollaborationExternalApprovalQuestion[];
}>;

type CollaborationTaskOperation =
  | Readonly<{ operation: "createTask"; name: string; content: string | null; date: string | null; time: string | null; executionEnd?: Readonly<{date: string; time: string}> | null; listId: string | null }>
  | Readonly<{ operation: "updateTask"; taskId: string; name: string; content: string | null; date: string | null; time: string | null; executionEnd?: Readonly<{date: string; time: string}> | null; listId: string | null }>
  | Readonly<{ operation: "completeTask"; taskId: string; completedTime?: string | null }>
  | Readonly<{ operation: "abandonTask" | "reopenTask" | "deleteTask" | "restoreTask"; taskId: string }>
  | Readonly<{ operation: "correctCompletion"; taskId: string; completedOn: string; completedTime: string | null }>
  | Readonly<{ operation: "createList"; name: string }>
  | Readonly<{ operation: "renameList"; listId: string; name: string }>
  | Readonly<{ operation: "archiveList" | "restoreList"; listId: string }>
  | Readonly<{
      operation: "saveDailyPlan";
      transition: DailyPlanTransition;
      arrangement: readonly DailyPlanBlockInput[];
      evidence: readonly DailyPlanEvidenceInput[];
      calibrationNote: string | null;
      baselineCorrectionReason: string | null;
      event: string | null;
      originalIntent: string | null;
      changeReason: string | null;
      revisedDirection: string | null;
    }>
  | Readonly<{ operation: "saveEveningReview"; mode: "addition" | "correction"; content: string }>
  | Readonly<{ operation: "createShortRecord"; category: "ordinary" | "exercise"; content: string }>
  | Readonly<{ operation: "correctShortRecord"; recordId: string; content: string }>
  | Readonly<{ operation: "setLocalHabitCompletion"; habitKey: string; completed: boolean }>;

type DailyPlanTransition = "initialPlan" | "morningCalibration" | "morningBaselineCorrection" | "daytimeEvent" | "daytimeReplan";
type DailyPlanBlockInput = Readonly<{ period: string; title: string; detail: string | null }>;
type DailyPlanEvidenceInput = Readonly<{ label: string; items: readonly string[] }>;

type CollaborationTaskOperationBaseline =
  | Readonly<{ kind: "task"; id: string; name: string; content: string | null; date: string | null; time: string | null; executionEnd?: Readonly<{date: string; time: string}> | null; listId: string; listName: string; state: "pending" | "completed" | "abandoned"; deletedAt: string | null; completion: TaskCompletionView | null }>
  | Readonly<{ kind: "list"; id: string; name: string; archived: boolean }>
  | Readonly<{
      kind: "dailyRecord";
      date: string;
      recordState: string;
      baselineAvailability: "missing" | "empty" | "saved" | string;
      morningBaseline: readonly DailyPlanBlockInput[];
      baselineEvidence: readonly DailyPlanEvidenceInput[];
      currentArrangement: readonly DailyPlanBlockInput[];
      currentBasis: readonly DailyPlanEvidenceInput[];
      revision: string | null;
    }>
  | Readonly<{
      kind: "dailyReview";
      date: string;
      account: readonly string[];
      additions: readonly string[];
      corrections: readonly string[];
      shortRecords: readonly string[];
      revision: string | null;
    }>
  | Readonly<{
      kind: "shortRecord";
      date: string;
      id: string;
      category: "ordinary" | "exercise";
      text: string;
      changeCount: number;
      revision: string | null;
    }>
  | Readonly<{
      kind: "habitCompletion";
      date: string;
      key: string;
      name: string;
      canRecordCompletion: boolean;
      localState: string;
      externalCompletion: boolean;
      sourceEvidence: readonly string[];
      sourceSnapshotAt: string | null;
      sourceSnapshotState: "unconfigured" | "missing" | "ready" | "stale" | "retained" | "error" | null;
      sourceSnapshotMessage: string | null;
      completionRevision: string | null;
    }>
  | Readonly<{ kind: "none" }>;

type CollaborationTaskOperationView = Readonly<{
  id: string;
  executionId?: string;
  executionAttempted?: boolean;
  operation: CollaborationTaskOperation;
  status: "awaitingApproval" | "applied" | "rejected" | "conflict" | "failed" | string;
  targetDate: string;
  baseline: CollaborationTaskOperationBaseline;
  resultMessage: string | null;
  resultSnapshot: CollaborationTaskOperationBaseline | null;
  resultRevision: string | null;
  automaticPlan: boolean;
  taskId: string | null;
  listId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

type HabitRefreshReport = Readonly<{
  query: string; generation: string; publication: string; display: string;
  generatedAt: string | null; rangeFrom: string | null; rangeTo: string | null; message: string;
}>;

type CollaborationSessionView = Readonly<{
  id: string;
  title: string;
  createdDate: string;
  activityDates: readonly string[];
  lastActivityAt: string;
  targetDate: string;
  runId: string | null;
  runState: string;
  progress: string;
  runtimeThreadId: string | null;
  taskToolAvailable: boolean;
  dailyPlanToolAvailable: boolean;
  dailyRecordToolAvailable: boolean;
  memoryToolAvailable: boolean;
  messages: readonly CollaborationMessageView[];
  workHistory?: readonly CollaborationWorkHistory[];
  taskOperations: readonly CollaborationTaskOperationView[];
  memoryProposals: readonly CollaborationMemoryProposalView[];
  lastHabitRefresh?: HabitRefreshReport | null;
  draft: string;
  draftsByDate: Readonly<Record<string, string>>;
}>;

type CollaborationRunOwnerView = Readonly<{
  sessionId: string;
  sessionTitle: string;
  runId: string;
  runState: string;
  progress: string;
}>;

type CollaborationWorkspaceView = Readonly<{
  date: string;
  vaultName: string | null;
  selectedModel: string | null;
  context: CollaborationContextView;
  memory: CollaborationMemoryView;
  sessions: readonly CollaborationSessionView[];
  activeRun: CollaborationRunOwnerView | null;
  recoveryRequired: boolean;
}>;

type CollaborationModelOption = Readonly<{
  id: string;
  displayName: string;
  defaultReasoningEffort: string | null;
  reasoningEfforts: readonly string[];
  isDefault: boolean;
}>;

type CollaborationConnectionView = Readonly<{
  executablePath: string | null;
  version: string | null;
  experimental: boolean;
  readOnlyTextTurnsAvailable: boolean;
  textTurnUnavailableReason: string | null;
  authenticated: boolean;
  authMode: string | null;
  accountEmail: string | null;
  planType: string | null;
  models: readonly CollaborationModelOption[];
  selectedModel: string | null;
  selectedReasoningEffort: string | null;
  error: string | null;
}>;

type DailyPlanAutomationSettings = Readonly<{
  enabled: boolean;
  time: string;
  externalScheduleHandoffConfirmed: boolean;
}>;

type DailyPlanAutomationRunView = Readonly<{
  date: string;
  state: string;
  message: string;
  sessionId: string | null;
  executionId: string | null;
  updatedAt: string;
}>;

type DailyPlanAutomationView = Readonly<{
  settings: DailyPlanAutomationSettings;
  date: string;
  time: string;
  vaultConfigured: boolean;
  currentRun: DailyPlanAutomationRunView | null;
}>;

type CollaborationVoiceStatusKey =
  | "collaboration.voiceIncomplete"
  | "collaboration.voiceLoginRequired"
  | "collaboration.voiceConnectionFailed"
  | "collaboration.voiceServiceFailed"
  | "collaboration.voiceQuotaExceeded"
  | "collaboration.voiceConnecting"
  | "collaboration.voiceRequesting"
  | "collaboration.voiceRecording"
  | "collaboration.voiceTranscribing"
  | "collaboration.voiceReview"
  | "collaboration.voiceSavedForDate"
  | "collaboration.voiceCancelled"
  | "collaboration.voicePermissionDenied"
  | "collaboration.voiceCaptureUnavailable"
  | "collaboration.voiceRecordingFailed"
  | "collaboration.voiceEmptyRecording"
  | "collaboration.voiceRecognitionFailed"
  | "collaboration.voiceDraftSaveFailed";

function localCalendarDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

let collaborationActivityDate = "";
let collaborationActivityDateExplicit = false;
let collaborationEmptyTargetDate: string | null = null;
let collaborationTargetDate = "";
let currentCollaborationWorkspace: CollaborationWorkspaceView | null = null;
let currentCollaborationSession: CollaborationSessionView | null = null;
let currentDailyPlanAutomation: DailyPlanAutomationView | null = null;
let dailyPlanAutomationRequest = 0;
let dailyPlanAutomationStatusTimer: number | null = null;
const pendingCollaborationTaskOperationIds = new Set<string>();
const collaborationTaskActionErrors = new Map<string, string>();
const collaborationTaskProjectionWarnings = new Map<string, string>();
const pendingCollaborationMemoryProposalIds = new Set<string>();
const collaborationMemoryProposalErrors = new Map<string, string>();
const collaborationLongTermDrafts = new Map<string, Readonly<{ text: string; revision: string }>>();
const collaborationContinuityDrafts = new Map<string, Readonly<{ text: string; revision: number }>>();
let taskFocusRequestId: string | null = null;
let selectedTaskDetailId: string | null = null;
let selectedTaskDetailBinding: string | null = null;
let taskReturnToCollaborationSessionId: string | null = null;
let dailyPlanReturnToCollaborationSessionId: string | null = null;
let dailyPlanReturnToCollaborationDate: string | null = null;
let currentCollaborationConnection: CollaborationConnectionView | null = null;
let collaborationWorkspaceRequest = 0;
let collaborationConnectionRequest = 0;
let collaborationStatusTimer: number | null = null;
let collaborationTargetDatePendingSession: string | null = null;
let collaborationEmptyDraft = "";
let collaborationEmptyComposerActive = false;
let collaborationSessionCreationPromise: Promise<CollaborationSessionView | null> | null = null;
let collaborationSessionCreationResult: CollaborationSessionView | null = null;
let collaborationSessionCreationError: unknown = null;
let collaborationSessionCreationAttempt: {
  id: string;
  date: string;
  initialDraft: string;
  latestDraft: string;
} | null = null;
const collaborationDrafts = new Map<string, string>();
const collaborationUnsavedDrafts = new Set<string>();
const collaborationDraftWrites = new Map<string, Promise<CollaborationSessionView>>();
let collaborationVaultSwitchDraftWrites: Promise<unknown>[] | null = null;
let collaborationVaultSelectionRevision = 0;
let collaborationReviewEntryNoticeTimer: number | null = null;
const collaborationDraftSaveTimers = new Map<string, number>();
const collaborationTargetDates = new Map<string, string>();
let activeCollaborationVoiceTarget: CollaborationVoiceTarget | null = null;
const collaborationVoiceStatuses = new Map<string, CollaborationVoiceStatusKey>();
const collaborationIncompleteVoiceDrafts = new Set<string>();
const collaborationVoicePreviews = new Map<string, string>();
const collaborationSendingDrafts = new Set<string>();
const pendingCollaborationRunChecks = new Set<string>();
const collaborationSubmittedDrafts = new Map<string, string>();

const collaborationVoiceController = new CodexCollaborationVoiceInputController(
  new BrowserCodexDictationRuntime((command, args) => window.__TAURI__.core.invoke(command,args)),
  {
    onState: (state, target) => {
      activeCollaborationVoiceTarget = state === "idle" ? null : target;
      if (state === "requesting") {
        setCollaborationVoiceStatus(target, "collaboration.voiceRequesting");
      }
      if (state === "connecting") setCollaborationVoiceStatus(target, "collaboration.voiceConnecting");
      if (state === "recording") setCollaborationVoiceStatus(target, "collaboration.voiceRecording");
      if (state === "transcribing") setCollaborationVoiceStatus(target, "collaboration.voiceTranscribing");
      renderCollaborationWorkspace();
    },
    onTranscript: handleCollaborationVoiceTranscript,
    unconfirmedPreviewLabel: () => t("collaboration.voiceUnconfirmedPreview"),
    onPreview: (target, text) => {
      const key = collaborationDraftKey(target.sessionId, target.targetDate);
      if (text) collaborationVoicePreviews.set(key,text); else collaborationVoicePreviews.delete(key);
      if (isCurrentCollaborationVoiceTarget(target)) setRawText(collaborationVoicePreview,text?t("collaboration.voicePreview",{text}):"");
    },
    onIncomplete: (target) => {
      collaborationIncompleteVoiceDrafts.add(collaborationDraftKey(target.sessionId, target.targetDate));
      setCollaborationVoiceStatus(target,"collaboration.voiceIncomplete");
    },
    onFailure: (target, failure) => {
      setCollaborationVoiceStatus(target, collaborationVoiceFailureStatus(failure));
      renderCollaborationVoiceControls();
    },
    onCancel: (target) => {
      setCollaborationVoiceStatus(target, "collaboration.voiceCancelled");
      renderCollaborationVoiceControls();
    },
  },
);

function collaborationDraftKey(sessionId: string, targetDate: string): string {
  return `${sessionId}\u0000${targetDate}`;
}

function cacheCollaborationDrafts(session: CollaborationSessionView, preserveLocal = false): void {
  // Reads and navigation cannot replace edits awaiting or lacking a save ack.
  // Only acknowledgement of the exact current snapshot releases protection.
  for (const [date, draft] of Object.entries(session.draftsByDate)) {
    const key = collaborationDraftKey(session.id, date);
    const submittedDraft = collaborationSubmittedDrafts.get(key);
    if (submittedDraft !== undefined &&
      (submittedDraft === draft || collaborationDrafts.get(key) === "")) continue;
    if ((!preserveLocal && !collaborationUnsavedDrafts.has(key)) || !collaborationDrafts.has(key)) {
      collaborationDrafts.set(key, draft);
    }
  }
  const targetKey = collaborationDraftKey(session.id, session.targetDate);
  const submittedDraft = collaborationSubmittedDrafts.get(targetKey);
  if (submittedDraft !== undefined &&
    (submittedDraft === session.draft || collaborationDrafts.get(targetKey) === "")) return;
  if ((!preserveLocal && !collaborationUnsavedDrafts.has(targetKey)) || !collaborationDrafts.has(targetKey)) {
    collaborationDrafts.set(targetKey, session.draft);
  }
}

function collaborationDraftForDate(session: CollaborationSessionView, date: string): string {
  return collaborationDrafts.get(collaborationDraftKey(session.id, date)) ??
    session.draftsByDate[date] ??
    (session.targetDate === date ? session.draft : "");
}

type AppearanceSelectionResult = Readonly<{
  preferences: AppearancePreferences;
  changed: boolean;
}>;

const runtimeStatus = document.querySelector<HTMLElement>("#runtime-status");
const workspaceDestinationButtons = document.querySelectorAll<HTMLButtonElement>(
  ".destination-button[data-workspace-destination]",
);
const workspaceSidebar = document.querySelector<HTMLElement>("#workspace-sidebar");
const workspaceSidebarToggle = document.querySelector<HTMLButtonElement>("#workspace-sidebar-toggle");
let workspaceSidebarExpanded = true;
function updateWorkspaceSidebarPresentation(): void {
  if (!workspaceSidebar || !workspaceSidebarToggle) return;
  if (!workspaceSidebarExpanded && workspaceSidebar.contains(document.activeElement)) {
    workspaceSidebarToggle.focus({preventScroll: true});
  }
  workspaceSidebar.hidden = !workspaceSidebarExpanded;
  document.querySelector<HTMLElement>(".app-shell")?.setAttribute("data-navigation-expanded", String(workspaceSidebarExpanded));
  workspaceSidebarToggle.setAttribute("aria-expanded", String(workspaceSidebarExpanded));
  const key = workspaceSidebarExpanded ? "navigation.hideSidebar" : "navigation.showSidebar";
  workspaceSidebarToggle.dataset.i18nAriaLabel = key;
  workspaceSidebarToggle.dataset.i18nTitle = key;
  workspaceSidebarToggle.setAttribute("aria-label", t(key));
  workspaceSidebarToggle.title = t(key);
}
workspaceSidebarToggle?.addEventListener("click", () => {
  workspaceSidebarExpanded = !workspaceSidebarExpanded;
  updateWorkspaceSidebarPresentation();
});
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
const collaborationDateInput = document.querySelector<HTMLInputElement>("#collaboration-activity-date");
const collaborationTargetDateInput = document.querySelector<HTMLInputElement>("#collaboration-target-date");
const collaborationSessionList = document.querySelector<HTMLUListElement>("#collaboration-session-list");
const collaborationSessionsStatus = document.querySelector<HTMLElement>("#collaboration-sessions-status");
const collaborationWorkOwner = document.querySelector<HTMLElement>("#collaboration-work-owner");
const collaborationMessageList = document.querySelector<HTMLElement>("#collaboration-message-list");
const collaborationTaskOperations = document.querySelector<HTMLElement>("#collaboration-task-operations");
const collaborationTaskToolNotice = document.querySelector<HTMLElement>("#collaboration-task-tool-notice");
const collaborationTaskToolDisclosure = document.querySelector<HTMLDetailsElement>("#collaboration-task-tool-disclosure");
const collaborationComposer = document.querySelector<HTMLFormElement>("#collaboration-composer");
const collaborationMessageDraft = document.querySelector<HTMLTextAreaElement>("#collaboration-message-draft");
const collaborationCommandMenu = document.querySelector<HTMLElement>("#collaboration-command-menu");
let collaborationCommandCompletion: { close: () => void } | null = null;
const collaborationComposerStatus = document.querySelector<HTMLElement>("#collaboration-composer-status");
const collaborationRecoveryDetails = document.querySelector<HTMLDetailsElement>("#collaboration-recovery-details");
const collaborationVoicePreview = document.querySelector<HTMLElement>("#collaboration-voice-preview");
const collaborationVoiceStartButton = document.querySelector<HTMLButtonElement>("#collaboration-voice-start");
const collaborationVoiceCancelButton = document.querySelector<HTMLButtonElement>("#collaboration-voice-cancel");
const collaborationVoiceStatus = document.querySelector<HTMLElement>("#collaboration-voice-status");
const collaborationSendButton = document.querySelector<HTMLButtonElement>("#collaboration-send-message");
const collaborationChatHeading = document.querySelector<HTMLElement>("#collaboration-chat-heading");
const collaborationChatDate = document.querySelector<HTMLElement>("#collaboration-chat-date");
const collaborationComposerDate = document.querySelector<HTMLElement>("#collaboration-composer-date");
const collaborationRunStatus = document.querySelector<HTMLElement>("#collaboration-run-status");
const collaborationStopButton = document.querySelector<HTMLButtonElement>("#collaboration-stop-run");
const collaborationVaultLabel = document.querySelector<HTMLElement>("#collaboration-context-vault");
const collaborationMemoryStatus = document.querySelector<HTMLElement>("#collaboration-memory-status");
const collaborationMemoryPanel = document.querySelector<HTMLDetailsElement>("#collaboration-memory-panel");
const collaborationLongTermSource = document.querySelector<HTMLElement>("#collaboration-long-term-source");
const collaborationLongTermMessage = document.querySelector<HTMLElement>("#collaboration-long-term-message");
const collaborationLongTermContent = document.querySelector<HTMLTextAreaElement>("#collaboration-long-term-content");
const collaborationLongTermSaveButton = document.querySelector<HTMLButtonElement>("#collaboration-long-term-save");
const collaborationLongTermReloadButton = document.querySelector<HTMLButtonElement>("#collaboration-long-term-reload");
const collaborationRoutineReferenceMessage = document.querySelector<HTMLElement>("#collaboration-routine-reference-message");
const collaborationRoutineReferenceContent = document.querySelector<HTMLElement>("#collaboration-routine-reference-content");
const collaborationRecentMemoryList = document.querySelector<HTMLUListElement>("#collaboration-recent-memory-list");
const collaborationOpenMattersList = document.querySelector<HTMLUListElement>("#collaboration-open-matters-list");
const collaborationContinuityNote = document.querySelector<HTMLTextAreaElement>("#collaboration-continuity-note");
const collaborationContinuitySaveButton = document.querySelector<HTMLButtonElement>("#collaboration-continuity-save");
const collaborationContinuityExpiry = document.querySelector<HTMLElement>("#collaboration-continuity-expiry");
const collaborationMemoryProposals = document.querySelector<HTMLElement>("#collaboration-memory-proposals");
const collaborationRuntimeStatus = document.querySelector<HTMLElement>("#collaboration-runtime-status");
const collaborationModelSummary = document.querySelector<HTMLElement>("#collaboration-model-summary");
const collaborationConnectionStatus = document.querySelector<HTMLElement>("#collaboration-connection-status");
const collaborationTurnCapability = document.querySelector<HTMLElement>("#collaboration-turn-capability");
const collaborationRuntimeDetails = document.querySelector<HTMLElement>("#collaboration-runtime-details");
const collaborationLoginStatus = document.querySelector<HTMLElement>("#collaboration-login-status");
const collaborationModelSelect = document.querySelector<HTMLSelectElement>("#collaboration-model");
const collaborationReasoningEffortSelect = document.querySelector<HTMLSelectElement>("#collaboration-reasoning-effort");
const collaborationRefreshConnectionButton = document.querySelector<HTMLButtonElement>("#collaboration-refresh-connection");
const collaborationConnectButton = document.querySelector<HTMLButtonElement>("#collaboration-connect-chatgpt");
const collaborationAutomaticPlanEnabled = document.querySelector<HTMLInputElement>("#collaboration-automatic-plan-enabled");
const collaborationAutomaticPlanTime = document.querySelector<HTMLInputElement>("#collaboration-automatic-plan-time");
const collaborationExternalScheduleHandoffConfirmed = document.querySelector<HTMLInputElement>("#collaboration-external-handoff-confirmed");
const collaborationExternalScheduleBoundary = document.querySelector<HTMLElement>("#collaboration-external-schedule-boundary");
const collaborationSaveAutomaticPlanSettingsButton = document.querySelector<HTMLButtonElement>("#collaboration-save-automatic-plan-settings");
const collaborationOpenAutomaticPlanRunButton = document.querySelector<HTMLButtonElement>("#collaboration-open-automatic-plan-run");
const collaborationAutomaticPlanStatus = document.querySelector<HTMLElement>("#collaboration-automatic-plan-status");
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
const calendarTaskPreviewResizeObserver = calendarGrid && typeof ResizeObserver !== "undefined"
  ? new ResizeObserver(() => updateCalendarTaskPreviewRows())
  : null;
calendarTaskPreviewResizeObserver?.observe(calendarGrid!);
const calendarSummary = document.querySelector<HTMLElement>("#calendar-summary");
const calendarSummaryHeading = document.querySelector<HTMLElement>("#calendar-summary-heading");
const calendarSummaryStatus = document.querySelector<HTMLElement>("#calendar-summary-status");
const calendarSummaryCopy = document.querySelector<HTMLElement>("#calendar-summary-copy");
const calendarOpenDay = document.querySelector<HTMLButtonElement>("#calendar-open-day");
const calendarReturnToCollaborationButton = document.querySelector<HTMLButtonElement>("#calendar-return-to-collaboration");
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
const taskPriorityFilterControl = document.querySelector<HTMLSelectElement>("#task-priority-filter");
const taskTagFilterControl = document.querySelector<HTMLSelectElement>("#task-tag-filter");
const taskPrioritySortControl = document.querySelector<HTMLSelectElement>("#task-priority-sort");
const tasksCount = document.querySelector<HTMLElement>("#tasks-count");
const tasksList = document.querySelector<HTMLElement>("#tasks-list");
const tasksEmpty = document.querySelector<HTMLElement>("#tasks-empty");
const taskQuickForm = document.querySelector<HTMLFormElement>("#task-quick-form");
const taskQuickName = document.querySelector<HTMLInputElement>("#task-quick-name");
const taskQuickList = document.querySelector<HTMLSelectElement>("#task-quick-list");
const taskQuickFolderTarget = document.querySelector<HTMLLabelElement>("#task-quick-folder-target");
const taskQuickFolderList = document.querySelector<HTMLSelectElement>("#task-quick-folder-list");
const taskQuickFolderEmpty = document.querySelector<HTMLElement>("#task-quick-folder-empty");
const taskQuickParent = document.querySelector<HTMLSelectElement>("#task-quick-parent");
const taskQuickPriority = document.querySelector<HTMLSelectElement>("#task-quick-priority");
const taskQuickTagChoices = document.querySelector<HTMLElement>("#task-quick-tag-choices");
const taskQuickSubmit = document.querySelector<HTMLButtonElement>("#task-quick-submit");
const taskQuickRecovery = document.querySelector<HTMLElement>("#task-quick-recovery");
const taskQuickRecheck = document.querySelector<HTMLButtonElement>("#task-quick-recheck");
const taskQuickRetry = document.querySelector<HTMLButtonElement>("#task-quick-retry");
const taskQuickEndAttempt = document.querySelector<HTMLButtonElement>("#task-quick-end-attempt");
const taskCreateEndAttempt = document.querySelector<HTMLButtonElement>("#task-create-end-attempt");
const taskEndedCreateRegion = document.querySelector<HTMLElement>("#task-create-ended-attempts");
const taskCreateRecheck = document.querySelector<HTMLButtonElement>("#task-create-recheck");
const taskCreateRetry = document.querySelector<HTMLButtonElement>("#task-create-retry");
const taskCreateStatus = document.querySelector<HTMLElement>("#task-create-status");
const taskCreateDialog = document.querySelector<HTMLDialogElement>("#task-create-dialog");
const taskCreateForm = document.querySelector<HTMLFormElement>("#task-create-form");
const taskCreateName = document.querySelector<HTMLInputElement>("#task-create-name");
const taskCreateContent = document.querySelector<HTMLTextAreaElement>("#task-create-content");
const taskCreatePriority = document.querySelector<HTMLSelectElement>("#task-create-priority");
const taskCreateTagChoices = document.querySelector<HTMLElement>("#task-create-tag-choices");
const taskCreateList = document.querySelector<HTMLSelectElement>("#task-create-list");
const taskCreateParent = document.querySelector<HTMLSelectElement>("#task-create-parent");
const taskCreateListLabel = document.querySelector<HTMLElement>("#task-create-list-label");
const taskCreateDate = document.querySelector<HTMLInputElement>("#task-create-date");
const taskCreateTime = document.querySelector<HTMLInputElement>("#task-create-time");
const taskCreateEndDate = document.querySelector<HTMLInputElement>("#task-create-end-date");
const taskCreateEndTime = document.querySelector<HTMLInputElement>("#task-create-end-time");
const taskCreateSubmit = document.querySelector<HTMLButtonElement>("#task-create-submit");
const taskCreateCancel = document.querySelector<HTMLButtonElement>("#task-create-cancel");
const taskNewButton = document.querySelector<HTMLButtonElement>("#task-new");
const taskReturnToCollaborationButton = document.querySelector<HTMLButtonElement>("#task-return-to-collaboration");
const taskNewListButton = document.querySelector<HTMLButtonElement>("#task-new-list");
const taskListScopes = document.querySelector<HTMLElement>("#tasks-list-scopes");
const taskListCreateForm = document.querySelector<HTMLFormElement>("#task-list-create-form");
const taskListCreateName = document.querySelector<HTMLInputElement>("#task-list-create-name");
const taskFolderCreateForm = document.querySelector<HTMLFormElement>("#task-folder-create-form");
const taskFolderCreateName = document.querySelector<HTMLInputElement>("#task-folder-create-name");
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
const newHabitButton = document.querySelector<HTMLButtonElement>("#new-habit");
const habitDefinitionDialog = document.querySelector<HTMLDialogElement>("#habit-definition-dialog");
const habitDefinitionForm = document.querySelector<HTMLFormElement>("#habit-definition-form");
const habitDefinitionHeading = document.querySelector<HTMLElement>("#habit-definition-heading");
const habitDefinitionMode = document.querySelector<HTMLElement>("#habit-definition-mode");
const habitDefinitionName = document.querySelector<HTMLInputElement>("#habit-definition-name");
const habitDefinitionGoalKind = document.querySelector<HTMLSelectElement>("#habit-definition-goal-kind");
const habitDefinitionKeepSourceOption = document.querySelector<HTMLOptionElement>("#habit-definition-keep-source-option");
const habitDefinitionGoalNote = document.querySelector<HTMLElement>("#habit-definition-goal-note");
const habitDefinitionWeeklyField = document.querySelector<HTMLElement>("#habit-weekly-target-field");
const habitDefinitionWeeklyTarget = document.querySelector<HTMLInputElement>("#habit-definition-weekly-target");
const habitDefinitionTimeField = document.querySelector<HTMLElement>("#habit-time-target-field");
const habitDefinitionTimeTarget = document.querySelector<HTMLInputElement>("#habit-definition-time-target");
const habitDefinitionRelationField = document.querySelector<HTMLElement>("#habit-day-relation-field");
const habitDefinitionDayRelation = document.querySelector<HTMLSelectElement>("#habit-definition-day-relation");
const habitDefinitionStartDate = document.querySelector<HTMLInputElement>("#habit-definition-start-date");
const habitDefinitionEmoji = document.querySelector<HTMLInputElement>("#habit-definition-emoji");
const habitDefinitionGroup = document.querySelector<HTMLInputElement>("#habit-definition-group");
const habitDefinitionStatus = document.querySelector<HTMLElement>("#habit-definition-status");
const habitDefinitionSubmit = document.querySelector<HTMLButtonElement>("#habit-definition-submit");
const habitDefinitionCancel = document.querySelector<HTMLButtonElement>("#habit-definition-cancel");
const habitDefinitionRefresh = document.querySelector<HTMLButtonElement>("#habit-definition-refresh");
const todayDate = document.querySelector<HTMLElement>("#today-date");
const todayVault = document.querySelector<HTMLElement>("#today-vault");
const todayStatus = document.querySelector<HTMLElement>("#today-status");
const todayReady = document.querySelector<HTMLElement>("#today-ready");
const todayBaselineStatus = document.querySelector<HTMLElement>("#today-baseline-status");
const todayTimeline = document.querySelector<HTMLOListElement>("#today-baseline-timeline");
const todayBlockCount = document.querySelector<HTMLElement>("#today-block-count");
const todayPlanEmpty = document.querySelector<HTMLElement>("#today-plan-empty");
const todayContinuousAxis = document.querySelector<HTMLElement>("#today-continuous-axis");
const todayAxisScrollSurface = document.querySelector<HTMLElement>("#today-axis-scroll-surface");
const todayAxisTaskPopup = document.querySelector<HTMLDialogElement>("#today-axis-task-popup");
const todayAxisTaskPopupHeading = document.querySelector<HTMLElement>("#today-axis-task-popup-heading");
const todayAxisTaskPopupContent = document.querySelector<HTMLElement>("#today-axis-task-popup-content");
const todayAxisTaskPopupStatus = document.querySelector<HTMLElement>("#today-axis-task-popup-status");
const todayAxisTaskPopupClose = document.querySelector<HTMLButtonElement>("#today-axis-task-popup-close");
let todayAxisTaskPopupOpener: HTMLElement | null = null;
const todayHourTicks = document.querySelector<HTMLElement>("#today-hour-ticks");
const todayCurrentArrangementUnlocated = document.querySelector<HTMLElement>("#today-current-arrangement-unlocated");
const todayUnlocatedTimeRegion = document.querySelector<HTMLElement>("#today-unlocated-time-region");
const todayUnlocatedTimeShortcut = document.querySelector<HTMLButtonElement>("#today-unlocated-time-shortcut");
const todaySideRegion = document.querySelector<HTMLElement>(".today-side-region");
const todayUnlocatedNarrow = () => {
  const availableWidth = document.querySelector<HTMLElement>(".today-layout")?.getBoundingClientRect().width ?? 0;
  return availableWidth > 0 ? availableWidth < 560 : window.innerWidth <= 790;
};
// Presentation state only; keep the original sidebar and every draft/detail node
// docked in the same position. Manual intent lasts for this date/phase.
let todayUnlocatedOverride: boolean | null = null;
let todayUnlocatedCount = 0;
let todaySidebarReadingPosition: number | null = null;
function updateTodayUnlocatedPresentation(): void {
  if (!todaySideRegion || !todayUnlocatedTimeRegion || !todayUnlocatedTimeShortcut) return;
  const daytime = document.querySelector<HTMLElement>("#today-ready")?.dataset.phase === "daytime";
  const shown = !daytime || (todayUnlocatedOverride ?? !todayUnlocatedNarrow());
  if (!shown && todaySideRegion.contains(document.activeElement)) {
    todayUnlocatedTimeShortcut.focus({preventScroll: true});
  }
  const restoreReadingPosition = shown && todaySideRegion.hidden ? todaySidebarReadingPosition : null;
  if (!shown && !todaySideRegion.hidden) todaySidebarReadingPosition = workspaceInformation?.scrollTop ?? null;
  todaySideRegion.hidden = !shown;
  todayUnlocatedTimeRegion.hidden = todayUnlocatedCount === 0;
  todayUnlocatedTimeShortcut.hidden = false;
  todayUnlocatedTimeShortcut.setAttribute("aria-expanded", String(shown));
  const label = t(shown ? "today.hideSidebar" : "today.showSidebar", {count: todayUnlocatedCount});
  todayUnlocatedTimeShortcut.setAttribute("aria-label", label);
  todayUnlocatedTimeShortcut.title = label;
  document.querySelector<HTMLElement>(".today-layout")?.setAttribute("data-unlocated-presentation", shown ? "inline" : "collapsed");
  if (restoreReadingPosition !== null && workspaceInformation) workspaceInformation.scrollTop = restoreReadingPosition;
}
todayUnlocatedTimeShortcut?.addEventListener("click", () => {
  todayUnlocatedOverride = todayUnlocatedTimeShortcut.getAttribute("aria-expanded") !== "true";
  updateTodayUnlocatedPresentation();
});
window.addEventListener("resize", () => updateTodayUnlocatedPresentation());
const todayTimedEvents = document.querySelector<HTMLOListElement>("#today-timed-events");
const todayTimedDurations = document.querySelector<HTMLElement>("#today-timed-duration");
const todayTimedEmpty = document.querySelector<HTMLElement>("#today-timed-empty");
const todayTimedDetails = document.querySelector<HTMLElement>("#today-timed-details");
const todayConfirmedFactsUnlocated = document.querySelector<HTMLElement>("#today-confirmed-facts-unlocated");
const todayCurrentTime = document.querySelector<HTMLTimeElement>("#today-current-time");
const todayLocateNowButton = document.querySelector<HTMLButtonElement>("#today-locate-now");
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
const todayReturnToCollaborationButton = document.querySelector<HTMLButtonElement>("#today-return-to-collaboration");
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
let todayPresentationFresh = false;
let vaultSelectionInProgress = false;
const todayPresentationRequests = new LatestRequest();
const todayClockRequests = new LatestRequest();
const vaultSelectionRequests = new LatestRequest();
let currentTodayPhase: TodayPhase = "morning";
let todayPhaseSelectionRevision = 0;
let todayAxisFollowState: TodayAxisFollowState = "following";
let programmaticTodayAxisScrollUntil = 0;
let currentTodayView: TodayView | null = null;
let currentTasksView: TasksView | null = null;
let taskScope: TaskListScope = "all";
let taskStateScope: "all" | "pending" | "completed" | "abandoned" | "deleted" = "all";
let taskPriorityFilter: TaskPriorityFilter = "all";
let taskTagFilter: string | null = null;
let taskPrioritySort: TaskPrioritySort = "default";
let taskTagRenameEditId: string | null = null;
const taskTagRenameDrafts = new Map<string, string>();
let taskCreateOpen = false;
const composingTaskCreateForms = new WeakSet<HTMLFormElement>();
let taskListManagementOpen = false;
const expandedTaskFolderIds = new Set<string>();
const taskFolderRenameDrafts = new Map<string, string>();
const taskFolderCreateDrafts = new Map<string, string>();
let taskOperationCount = 0;
let taskRefreshQueued = false;
const taskRequests = new LatestRequest();
const todayTaskRequests = new LatestRequest();
const calendarTaskRequests = new LatestRequest();
type TaskDraft = Readonly<{
  endDate: string;
  endTime: string;
  name: string;
  content: string;
  date: string;
  time: string;
  listId: string | null;
  completionDate: string;
  completionTime: string;
  priority?: TaskPriority | null;
  tagIds?: readonly string[];
  parentTaskId?: string | null;
}>;
type TaskCreateInput = Readonly<{
  targetBinding: string; expectedRevision: string | null; taskId: string; name: string;
  content: string | null; date: string | null; time: string | null; listId: string;
  executionEnd: Readonly<{date: string; time: string}> | null;
  parentTaskId?: string | null;
  priority?: TaskPriority | null;
  tagIds?: readonly string[];
}>;
type TaskCreateAttempt = {
  origin: "quick" | "modal" | "today"; surfaceDate?: string; draft: TaskDraft; input: TaskCreateInput;
  originalInput: TaskCreateInput; listName: string;
  phase: "unverified" | "retry-ready" | "conflict";
};
const taskCreateAttempts = new Map<string, TaskCreateAttempt>();
// Transient review of explicitly ended submissions; never another Task storage source.
const taskEndedCreateAttempts = new Map<string, TaskCreateAttempt[]>();
const taskQuickDrafts = new Map<string, string>();
const taskQuickScheduleDrafts = new Map<string, {date: string; time: string}>();
const taskQuickPropertyDrafts = new Map<string, {listId: string; priority: TaskPriority | null; tagIds: readonly string[]; parentTaskId: string | null}>();
const compactScheduleTransactions = new Map<string, {invalidate: () => void; validateContext: () => void}>();
let currentTaskLivedDate: string | null = null;
const taskQuickDate = document.querySelector<HTMLInputElement>("#task-quick-date");
const taskQuickTime = document.querySelector<HTMLInputElement>("#task-quick-time");
const taskCreateDrafts = new Map<string, TaskDraft>();
const todayTaskCreateDrafts = new Map<string, TaskDraft>();
const calendarTaskCreateDrafts = new Map<string, TaskDraft>();
const taskEditDrafts = new Map<string, TaskDraft>();
const taskListCreateDrafts = new Map<string, string>();
const taskListRenameDrafts = new Map<string, string>();
const taskOperationIds = new TaskOperationIdentityStore();
let selectedTodayDate: string | null = null;
const historicalHabitArrival = new HistoricalHabitArrival();
type DatedNoteDraft = {
  content: string;
  category: ShortRecordCategory;
  correctionId: string | null;
};
const datedNoteDrafts = new Map<string, DatedNoteDraft>();
const eveningReviewDrafts = new Map<string, Readonly<{ content: string; mode: string }>>();
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
type HabitDefinitionFormValues = Readonly<{
  habitKey: string | null;
  name: string;
  goalKind: HabitGoalTarget["kind"] | "keep-source";
  weeklyTarget: string;
  timeTarget: string;
  dayRelation: "same-day" | "next-day" | "unresolved";
  startDate: string;
  emoji: string;
  group: string;
}>;
type HabitDefinitionDraft = {
  values: HabitDefinitionFormValues;
  pendingInput: HabitDefinitionMutationInput | null;
  error: string | null;
  needsRefresh: boolean;
};
const habitDefinitionDrafts = new Map<string, HabitDefinitionDraft>();
let activeHabitDefinitionBinding: string | null = null;
let activeHabitDefinitionDraftKey: string | null = null;
let habitDefinitionSaveInFlight = false;
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

initializeCollaborationPanels();
const todayLayoutForResize = document.querySelector<HTMLElement>(".today-layout");
if (todayLayoutForResize) new ResizeObserver(() => updateTodayUnlocatedPresentation()).observe(todayLayoutForResize);

function renderInterfaceLanguage(preferences: InterfaceLanguagePreferences): void {
  currentInterfaceLanguage = preferences.interfaceLanguage;
  applyInterfaceLanguage(currentInterfaceLanguage);
  document.querySelectorAll<HTMLAnchorElement>(".today-axis-marker-link").forEach((link) => {
    const time = link.querySelector<HTMLElement>(".today-axis-marker-time");
    if (time) link.dataset.axisItemTime = time.textContent ?? "";
    updateTodayAxisMarkerAccessibleName(link, currentInterfaceLanguage);
  });
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
  updateCompactScheduleLabel("task-quick", taskQuickDate, taskQuickTime);
  updateCompactScheduleLabel("today-task-create", todayTaskCreateDate, todayTaskCreateTime);
  if (currentCalendarMonth) renderCalendarGrid(currentCalendarMonth);
  if (currentCalendarSummaryView) renderCalendarSummary(currentCalendarSummaryView);
  if (currentHabitSnapshot) renderHabitSnapshot(currentHabitSnapshot);
  if (currentTasksView) renderTasks(currentTasksView);
  if (currentTodayView) {
    renderTodayTasks(currentTodayView);
    renderLegacyDayTasks(currentTodayView.dayTasks);
    renderHistoricalHabitCorrections(currentTodayView);
  }
  updateWorkspaceSidebarPresentation();
  updateTodayUnlocatedPresentation();
  renderWorkspaceNavigationLanguage();
  renderWorkspaceFeatureArea(currentWorkspaceDestination);
  renderWorkspaceRailContext(currentWorkspaceDestination);
  renderWorkspaceContextStatus(currentWorkspaceDestination);
  renderCollaborationWorkspace();
  renderCollaborationVoiceControls();
  renderCollaborationConnection();
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
  historicalHabitArrival.clear();
  taskRequests.invalidate();
  todayTaskRequests.invalidate();
  calendarMonthRequests.invalidate();
  calendarSelectionRequests.invalidate();
  calendarTaskRequests.invalidate();
  habitSnapshotRequests.invalidate();
  habitDateRequests.invalidate();
  habitCompletionRequests.invalidate();
  collaborationWorkspaceRequest += 1;
  cancelCollaborationVoiceCaptureForSelectionChange();
  for (const timer of collaborationDraftSaveTimers.values()) window.clearTimeout(timer);
  collaborationDraftSaveTimers.clear();
  if (collaborationStatusTimer !== null) {
    window.clearInterval(collaborationStatusTimer);
    collaborationStatusTimer = null;
  }
  currentCollaborationWorkspace = null;
  currentCollaborationSession = null;
  collaborationEmptyDraft = "";
  collaborationEmptyComposerActive = false;
  collaborationSessionCreationPromise = null;
  collaborationSessionCreationResult = null;
  collaborationSessionCreationError = null;
  collaborationSessionCreationAttempt = null;
  collaborationDrafts.clear();
  collaborationUnsavedDrafts.clear();
  collaborationVoicePreviews.clear();
  collaborationTargetDates.clear();
  collaborationSendingDrafts.clear();
  collaborationSubmittedDrafts.clear();
  collaborationActivityDate = "";
  collaborationActivityDateExplicit = false;
  collaborationEmptyTargetDate = null;
  collaborationTargetDate = "";
  currentCalendarMonth = null;
  currentCalendarSummaryView = null;
  selectedCalendarDate = null;
  currentTodayView = null;
  currentTasksView = null;
  selectedTaskDetailId = null;
  selectedTaskDetailBinding = null;
  taskEditorDialogRoot?.toggleAttribute("hidden", true);
  taskScope = "all";
  taskStateScope = "all";
  taskCreateOpen = false;
  taskListManagementOpen = false;
  expandedTaskFolderIds.clear();
  taskRefreshQueued = false;
  currentHabitSnapshot = null;
  selectedHabitCell = null;
  currentHabitDateView = null;
  activeHabitDefinitionBinding = null;
  activeHabitDefinitionDraftKey = null;
  habitDefinitionDialog?.close();
  habitsDestination?.querySelector(".habit-canonical-detail")?.remove();
  habitNoteStatus = null;
  habitCompletionStatus = null;
  historicalHabitCompletionStatus = null;
  datedNoteDrafts.clear();
  taskCreateDrafts.clear();
  taskQuickDrafts.clear();
  taskQuickPropertyDrafts.clear();
  taskTagRenameDrafts.clear();
  taskTagRenameEditId = null;
  compactScheduleTransactions.forEach(transaction => transaction.invalidate());
  taskQuickScheduleDrafts.clear();
  currentTaskLivedDate = null;
  taskCreateAttempts.clear();
  taskEndedCreateAttempts.clear();
  taskEndedCreateRegion?.replaceChildren();
  taskQuickForm?.reset();
  taskCreateDialog?.close();
  todayTaskCreateDrafts.clear();
  calendarTaskCreateDrafts.clear();
  taskEditDrafts.clear();
  taskListCreateDrafts.clear();
  taskListRenameDrafts.clear();
  taskFolderRenameDrafts.clear();
  taskFolderCreateDrafts.clear();
  taskOperationIds.clear();
  habitCompletionOperationIds.clear();
  taskCreateForm?.reset();
  todayTaskCreateForm?.reset();
  calendarTaskCreateForm?.reset();
  taskListCreateForm?.reset();
  taskFolderCreateForm?.reset();
  taskCreateForm?.toggleAttribute("hidden", true);
  taskListCreateForm?.toggleAttribute("hidden", true);
  taskFolderCreateForm?.toggleAttribute("hidden", true);
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

function showSettingsSection(section: "appearance" | "data" | "codex"): void {
  settingsCategoryButtons.forEach((button) => {
    const current = button.dataset.settingsSection === section;
    button.toggleAttribute("aria-current", current);
    if (current) button.setAttribute("aria-current", "page");
  });
  settingsPanels.forEach((panel) => {
    panel.hidden = panel.dataset.settingsPanel !== section;
  });
  if (section === "codex") {
    void refreshCollaborationConnection();
    void refreshDailyPlanAutomation();
    if (dailyPlanAutomationStatusTimer === null) {
      dailyPlanAutomationStatusTimer = window.setInterval(() => {
        void refreshDailyPlanAutomation();
      }, 10_000);
    }
  } else if (dailyPlanAutomationStatusTimer !== null) {
    window.clearInterval(dailyPlanAutomationStatusTimer);
    dailyPlanAutomationStatusTimer = null;
  }
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

function collaborationRunStateLabel(state: string): string {
  switch (state) {
    case "waiting": return t("collaboration.statusWaiting");
    case "queued": return t("collaboration.statusQueued");
    case "paused": return t("collaboration.statusPaused");
    case "removed": return t("collaboration.deliveryRemoved");
    case "reading": return t("collaboration.statusReading");
    case "thinking": return t("collaboration.statusThinking");
    case "stopping": return t("collaboration.statusStopping");
    case "stopped": return t("collaboration.statusStopped");
    case "stop-unconfirmed": return t("collaboration.statusStopUnconfirmed");
    case "completed": return t("collaboration.statusCompleted");
    case "error": return t("collaboration.statusError");
    case "interrupted": return t("collaboration.statusInterrupted");
    case "partial": return t("collaboration.statusPartial");
    default: return state;
  }
}

function collaborationRunProgressLabel(session: CollaborationSessionView): string {
  const label = collaborationRunStateLabel(session.runState);
  const progress = ["error", "reading", "thinking", "queued", "stopping", "stop-unconfirmed", "interrupted"].includes(session.runState)
    ? localizeCollaborationDiagnostic(session.progress, currentInterfaceLanguage) : "";
  return progress && progress !== label ? `${label} · ${progress}` : label;
}

function collaborationDeliveryStateLabel(state: string): string {
  switch (state) {
    case "queued": return t("collaboration.deliveryQueued");
    case "paused": return t("collaboration.deliveryPaused");
    case "removed": return t("collaboration.deliveryRemoved");
    case "in-progress": return t("collaboration.deliveryInProgress");
    case "stopping": return t("collaboration.deliveryStopping");
    case "stopped": return t("collaboration.deliveryStopped");
    case "interrupted": return t("collaboration.deliveryInterrupted");
    case "not-started": return t("collaboration.deliveryNotStarted");
    case "stop-unconfirmed": return t("collaboration.deliveryStopUnconfirmed");
    case "error": return t("collaboration.deliveryError");
    case "completed": return t("collaboration.deliveryCompleted");
    default: return state;
  }
}

function collaborationContextStateLabel(state: string): string {
  switch (state) {
    case "ready": return t("collaboration.contextReady");
    case "empty": return t("collaboration.contextEmpty");
    case "missing": return t("collaboration.contextMissing");
    case "stale": return t("collaboration.contextStale");
    case "retained": return t("collaboration.contextRetained");
    case "unconfigured": return t("collaboration.contextUnconfigured");
    case "error": return t("collaboration.contextError");
    default: return state;
  }
}

function collaborationDateLabel(date: string): string {
  return formatInterfaceDate(date, currentInterfaceLanguage);
}

function renderCollaborationConnection(): void {
  const connection = currentCollaborationConnection;
  if (!connection) {
    setCopy(collaborationConnectionStatus, "collaboration.connectionNotChecked");
    setCopy(collaborationRuntimeStatus, "collaboration.connectionNotChecked");
    if (collaborationRuntimeDetails) collaborationRuntimeDetails.hidden = true;
    if (collaborationModelSelect) collaborationModelSelect.disabled = true;
    if (collaborationReasoningEffortSelect) collaborationReasoningEffortSelect.disabled = true;
    if (collaborationConnectButton) collaborationConnectButton.disabled = true;
    if (collaborationModelSummary) setRawText(collaborationModelSummary, "");
    return;
  }

  let summary: string;
  let state: string;
  if (connection.error) {
    summary = connection.error;
    state = "error";
  } else if (connection.authMode && connection.authMode !== "chatgpt") {
    summary = t("collaboration.connectionWrongAuth");
    state = "unavailable";
  } else if (!connection.authenticated) {
    summary = t("collaboration.connectionSignedOut");
    state = "signed-out";
  } else {
    summary = t("collaboration.connectionReady");
    state = "ready";
  }
  if (!connection.error && !connection.readOnlyTextTurnsAvailable) {
    summary += ` · ${connection.textTurnUnavailableReason ?? t("collaboration.turnBlocked")}`;
  }
  setRawText(collaborationConnectionStatus, summary);
  if (collaborationConnectionStatus) collaborationConnectionStatus.dataset.state = state;
  setRawText(collaborationRuntimeStatus, summary);
  if (collaborationRuntimeStatus) collaborationRuntimeStatus.dataset.state = state;

  const activeModel = connection.models.find((model) => model.id === connection.selectedModel) ??
    (connection.selectedModel ? undefined : connection.models.find((model) => model.isDefault));
  const modelName = activeModel?.displayName ?? connection.selectedModel ?? t("collaboration.modelDefault");
  const effort = connection.selectedReasoningEffort ?? activeModel?.defaultReasoningEffort ??
    t("collaboration.reasoningEffortDefault");
  if (collaborationModelSummary) {
    setRawText(collaborationModelSummary, t("collaboration.modelSummary", { model: modelName, effort }));
    collaborationModelSummary.dataset.state = state;
  }

  if (collaborationRuntimeDetails) {
    const details = [connection.version, connection.executablePath].filter(Boolean).join(" · ");
    if (details) {
      setRawText(collaborationRuntimeDetails, details);
      collaborationRuntimeDetails.hidden = false;
    } else {
      collaborationRuntimeDetails.hidden = true;
    }
  }
  if (collaborationTurnCapability) {
    if (connection.readOnlyTextTurnsAvailable) {
      setCopy(collaborationTurnCapability, "collaboration.turnAvailable");
      collaborationTurnCapability.dataset.state = "ready";
    } else {
      setRawText(
        collaborationTurnCapability,
        connection.textTurnUnavailableReason ?? t("collaboration.turnBlocked"),
      );
      collaborationTurnCapability.dataset.state = "unavailable";
    }
  }

  if (collaborationModelSelect) {
    const selected = connection.selectedModel ?? "";
    const options = [new Option(t("collaboration.modelDefault"), "")];
    for (const model of connection.models) {
      const defaultSuffix = model.isDefault ? ` · ${t("collaboration.modelRuntimeDefault")}` : "";
      options.push(new Option(`${model.displayName} · ${model.id}${defaultSuffix}`, model.id));
    }
    collaborationModelSelect.replaceChildren(...options);
    collaborationModelSelect.value = selected;
    collaborationModelSelect.disabled = Boolean(connection.error) || connection.models.length === 0;
  }
  if (collaborationReasoningEffortSelect) {
    const selectedModel = connection.models.find((model) => model.id === connection.selectedModel) ??
      (connection.selectedModel ? undefined : connection.models.find((model) => model.isDefault));
    const options = [new Option(
      selectedModel?.defaultReasoningEffort
        ? t("collaboration.modelReasoningDefault", { effort: selectedModel.defaultReasoningEffort })
        : t("collaboration.reasoningEffortDefault"),
      "",
    )];
    for (const effort of selectedModel?.reasoningEfforts ?? []) {
      options.push(new Option(effort, effort));
    }
    const selectedEffort = connection.selectedReasoningEffort;
    if (selectedEffort && !selectedModel?.reasoningEfforts.includes(selectedEffort)) {
      options.push(new Option(
        t("collaboration.reasoningEffortUnavailable", { effort: selectedEffort }),
        selectedEffort,
      ));
    }
    collaborationReasoningEffortSelect.replaceChildren(...options);
    collaborationReasoningEffortSelect.value = selectedEffort ?? "";
    collaborationReasoningEffortSelect.disabled = Boolean(connection.error) ||
      !selectedModel || (selectedModel.reasoningEfforts.length === 0 && !selectedEffort);
  }
  if (collaborationConnectButton) {
    collaborationConnectButton.disabled = !connection.executablePath;
  }
  renderCollaborationWorkspace();
}

function renderDailyPlanAutomation(view: DailyPlanAutomationView | null): void {
  currentDailyPlanAutomation = view;
  if (!view) {
    setCopy(collaborationAutomaticPlanStatus, "collaboration.automaticPlanNotLoaded");
    if (collaborationOpenAutomaticPlanRunButton) {
      collaborationOpenAutomaticPlanRunButton.hidden = true;
    }
    return;
  }
  if (collaborationAutomaticPlanEnabled) {
    collaborationAutomaticPlanEnabled.checked = view.settings.enabled;
  }
  if (collaborationAutomaticPlanTime) {
    collaborationAutomaticPlanTime.value = view.settings.time;
  }
  if (collaborationExternalScheduleHandoffConfirmed) {
    collaborationExternalScheduleHandoffConfirmed.checked =
      view.settings.externalScheduleHandoffConfirmed;
  }
  setCopy(
    collaborationExternalScheduleBoundary,
    view.settings.externalScheduleHandoffConfirmed
      ? "collaboration.externalScheduleHandoffComplete"
      : "collaboration.externalScheduleHandoffPending",
  );

  const run = view.currentRun;
  const stateCopy: Record<string, InterfaceCopyKey> = {
    queued: "collaboration.automaticPlanQueued",
    running: "collaboration.automaticPlanRunning",
    completed: "collaboration.automaticPlanCompleted",
    existingPlan: "collaboration.automaticPlanExisting",
    readError: "collaboration.automaticPlanReadError",
    damagedRecord: "collaboration.automaticPlanDamaged",
    needsReview: "collaboration.automaticPlanNeedsReview",
    stopped: "collaboration.automaticPlanStopped",
    unavailable: "collaboration.automaticPlanUnavailable",
  };
  if (collaborationAutomaticPlanStatus) {
    if (!view.settings.enabled) {
      setCopy(collaborationAutomaticPlanStatus, "collaboration.automaticPlanDisabled");
    } else if (!view.vaultConfigured) {
      setCopy(collaborationAutomaticPlanStatus, "collaboration.automaticPlanVaultMissing");
    } else if (run) {
      const copy = stateCopy[run.state] ?? "collaboration.automaticPlanNeedsReview";
      setCopy(collaborationAutomaticPlanStatus, copy);
      collaborationAutomaticPlanStatus.dataset.state = run.state;
      if (run.message && run.state !== "completed") {
        collaborationAutomaticPlanStatus.title = run.message;
      } else {
        collaborationAutomaticPlanStatus.removeAttribute("title");
      }
    } else {
      setCopy(collaborationAutomaticPlanStatus, "collaboration.automaticPlanNotDue");
      collaborationAutomaticPlanStatus.removeAttribute("data-state");
    }
  }
  if (collaborationOpenAutomaticPlanRunButton) {
    collaborationOpenAutomaticPlanRunButton.hidden = !run?.sessionId;
    collaborationOpenAutomaticPlanRunButton.disabled = !run?.sessionId;
  }
}

async function refreshDailyPlanAutomation(): Promise<void> {
  const request = ++dailyPlanAutomationRequest;
  try {
    const view = await window.__TAURI__.core.invoke<DailyPlanAutomationView>(
      "collaboration_daily_plan_automation",
    );
    if (request === dailyPlanAutomationRequest) renderDailyPlanAutomation(view);
  } catch (error) {
    if (request !== dailyPlanAutomationRequest) return;
    renderDailyPlanAutomation(null);
    setCopyError(collaborationAutomaticPlanStatus, "collaboration.automaticPlanLoadFailed", error);
    if (collaborationAutomaticPlanStatus) collaborationAutomaticPlanStatus.dataset.state = "error";
  }
}

async function saveDailyPlanAutomationSettings(): Promise<void> {
  const time = collaborationAutomaticPlanTime?.value ?? "";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    setCopy(collaborationAutomaticPlanStatus, "collaboration.automaticPlanInvalidTime");
    if (collaborationAutomaticPlanStatus) collaborationAutomaticPlanStatus.dataset.state = "error";
    return;
  }
  const settings: DailyPlanAutomationSettings = {
    enabled: collaborationAutomaticPlanEnabled?.checked ?? false,
    time,
    externalScheduleHandoffConfirmed:
      collaborationExternalScheduleHandoffConfirmed?.checked ?? false,
  };
  if (collaborationSaveAutomaticPlanSettingsButton) {
    collaborationSaveAutomaticPlanSettingsButton.disabled = true;
  }
  try {
    const view = await window.__TAURI__.core.invoke<DailyPlanAutomationView>(
      "collaboration_update_daily_plan_automation",
      { settings },
    );
    renderDailyPlanAutomation(view);
  } catch (error) {
    setCopyError(collaborationAutomaticPlanStatus, "collaboration.automaticPlanSaveFailed", error);
    if (collaborationAutomaticPlanStatus) collaborationAutomaticPlanStatus.dataset.state = "error";
  } finally {
    if (collaborationSaveAutomaticPlanSettingsButton) {
      collaborationSaveAutomaticPlanSettingsButton.disabled = false;
    }
  }
}

async function openDailyPlanAutomationRun(): Promise<void> {
  const run = currentDailyPlanAutomation?.currentRun;
  if (!run?.sessionId) return;
  try {
    const session = await window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_session",
      { sessionId: run.sessionId },
    );
    if (collaborationDateInput) collaborationDateInput.value = run.date;
    collaborationActivityDate = run.date;
    collaborationActivityDateExplicit = true;
    showWorkspaceDestination("collaboration");
    selectCollaborationSession(session);
  } catch (error) {
    setCopyError(collaborationAutomaticPlanStatus, "collaboration.automaticPlanOpenFailed", error);
    if (collaborationAutomaticPlanStatus) collaborationAutomaticPlanStatus.dataset.state = "error";
  }
}

async function refreshCollaborationConnection(): Promise<void> {
  const request = ++collaborationConnectionRequest;
  if (collaborationRefreshConnectionButton) collaborationRefreshConnectionButton.disabled = true;
  setCopy(collaborationConnectionStatus, "collaboration.connectionChecking");
  setCopy(collaborationRuntimeStatus, "collaboration.connectionChecking");
  try {
    const connection = await window.__TAURI__.core.invoke<CollaborationConnectionView>(
      "collaboration_connection",
    );
    if (request !== collaborationConnectionRequest) return;
    currentCollaborationConnection = connection;
    renderCollaborationConnection();
  } catch (error) {
    if (request !== collaborationConnectionRequest) return;
    currentCollaborationConnection = {
      executablePath: null,
      version: null,
      experimental: true,
      readOnlyTextTurnsAvailable: false,
      textTurnUnavailableReason: t("collaboration.turnBlocked"),
      authenticated: false,
      authMode: null,
      accountEmail: null,
      planType: null,
      models: [],
      selectedModel: null,
      selectedReasoningEffort: null,
      error: String(error),
    };
    renderCollaborationConnection();
  } finally {
    if (request === collaborationConnectionRequest && collaborationRefreshConnectionButton) {
      collaborationRefreshConnectionButton.disabled = false;
    }
  }
}

function renderCollaborationContextPane(
  name: "dailyRecord" | "tasks" | "habits",
  pane: CollaborationContextPane,
): void {
  const container = document.querySelector<HTMLElement>(`[data-context-pane="${name}"]`);
  const status = container?.querySelector<HTMLElement>("[data-context-message]");
  const items = container?.querySelector<HTMLUListElement>("[data-context-items]");
  if (!container || !status || !items) return;
  container.dataset.state = pane.state;
  setRawText(status, `${collaborationContextStateLabel(pane.state)} · ${pane.message}`);
  items.replaceChildren();
  if (pane.items.length === 0) {
    const item = document.createElement("li");
    item.textContent = t("collaboration.noCurrentEntries");
    items.append(item);
    return;
  }
  for (const text of pane.items) {
    const item = document.createElement("li");
    item.textContent = text;
    items.append(item);
  }
}

function renderCollaborationSessionList(sessions: readonly CollaborationSessionView[]): void {
  if (!collaborationSessionList) return;
  collaborationSessionList.replaceChildren();
  if (collaborationSessionsStatus) {
    setRawText(
      collaborationSessionsStatus,
      sessions.length === 0 ? t("collaboration.noSessions") : "",
    );
  }
  for (const session of sessions) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collaboration-session-button";
    button.dataset.sessionId = session.id;
    button.setAttribute("aria-pressed", String(session.id === currentCollaborationSession?.id));
    const title = document.createElement("strong");
    title.textContent = session.title || t("collaboration.untitledSession");
    const dates = document.createElement("small");
    const activityDates = session.activityDates
      .map(collaborationDateLabel)
      .join(", ");
    dates.textContent = `${t("collaboration.createdDate", {
      date: collaborationDateLabel(session.createdDate),
    })} · ${t("collaboration.targetDateShort", {
      date: collaborationDateLabel(session.targetDate),
    })} · ${t("collaboration.activityDatesShort", { dates: activityDates })}`;
    const status = document.createElement("span");
    status.className = "collaboration-session-state";
    status.textContent = collaborationRunStateLabel(session.runState);
    button.append(title, dates, status);
    button.addEventListener("click", () => selectCollaborationSession(session));
    item.append(button);
    collaborationSessionList.append(item);
  }
}

function collaborationVisibleResults(request: CollaborationMessageView) {
  return (request.actionResults ?? []).filter(result => {
    const action = request.externalActions?.find(action => action.actionId === result.id);
    // Successful reads are activity, not saved changes. Preserve failed/unknown effects.
    return !(action && !action.verification && ["completed", "inProgress", "started"].includes(result.status));
  });
}

function collaborationOutcomeSummary(result: NonNullable<CollaborationMessageView["actionResults"]>[number], session: CollaborationSessionView): string {
  const receipt = session.taskOperations?.find(operation => operation.id === result.id);
  if (receipt) {
    const operation = receipt.operation;
    if (operation.operation === "saveDailyPlan") {
      const content = operation.event ?? operation.calibrationNote ?? operation.revisedDirection ??
        operation.arrangement.map(block => `${block.period} ${block.title}${block.detail ? `：${block.detail}` : ""}`).join("；");
      return `${t(`collaboration.dailyPlanTransition.${operation.transition}` as InterfaceCopyKey)}：${content}`;
    }
    if (operation.operation === "setLocalHabitCompletion") {
      const name = receipt.baseline.kind === "habitCompletion" ? receipt.baseline.name : operation.habitKey;
      return `${name} · ${t(operation.completed ? "collaboration.habitMarkedComplete" : "collaboration.habitMarkedIncomplete")}`;
    }
    if ("content" in operation && ["saveEveningReview", "createShortRecord", "correctShortRecord"].includes(operation.operation)) {
      return `${operation.operation === "saveEveningReview" ? t("today.evening") : t("collaboration.dailyRecord")}：${operation.content}`;
    }
    const name = "name" in operation ? operation.name
      : "name" in receipt.baseline ? receipt.baseline.name : "";
    const labels: Record<string, InterfaceCopyKey> = {
      createTask: "collaboration.outcomeTaskCreated", updateTask: "collaboration.outcomeTaskUpdated",
      completeTask: "collaboration.taskOpComplete", abandonTask: "collaboration.taskOpAbandon",
      reopenTask: "collaboration.taskOpReopen", deleteTask: "collaboration.taskOpDelete", restoreTask: "collaboration.taskOpRestore",
      correctCompletion: "collaboration.taskOpCorrectCompletion", createList: "collaboration.taskOpCreateList",
      renameList: "collaboration.taskOpRenameList", archiveList: "collaboration.taskOpArchiveList", restoreList: "collaboration.taskOpRestoreList",
    };
    const observed = receipt.status === "applied" && receipt.resultSnapshot?.kind === "task" ? receipt.resultSnapshot : null;
    const scheduleDate = observed?.date ?? ("date" in operation ? operation.date : null);
    const scheduleTime = observed?.time ?? ("time" in operation ? operation.time : null);
    const schedule = observed
      ? ` · ${t("tasks.date")}: ${scheduleDate ?? t("tasks.noDate")}${scheduleTime ? ` ${scheduleTime}` : ""}`
      : scheduleDate ? ` · ${scheduleDate}${scheduleTime ? ` ${scheduleTime}` : ""}` : "";
    const completion = observed?.completion
      ? ` · ${t("tasks.completionDate")}: ${observed.completion.completedOn}${observed.completion.completedTime ? ` ${observed.completion.completedTime}` : ""}` : "";
    const list = observed?.listName ? ` · ${t("tasks.list")}: ${observed.listName}` : "";
    const content = "content" in operation && operation.content ? `\n${operation.content}` : "";
    return t(labels[operation.operation], { name, previous: "name" in receipt.baseline ? receipt.baseline.name : "", date: "completedOn" in operation ? operation.completedOn : receipt.targetDate,
      time: "completedTime" in operation ? operation.completedTime ?? t("common.unknown") : t("common.unknown") }) + schedule + completion + list + content;
  }
  // Old persisted activity may contain JSON envelopes. Keep it out of the UI too.
  if (/^\s*[\[{]/.test(result.message) || result.message === "null") return t("collaboration.sourceResultRecorded");
  return result.messageKind === "diagnostic"
    ? localizeCollaborationDiagnostic(result.message, currentInterfaceLanguage) : result.message;
}

function renderCollaborationOutcomes(container: HTMLElement, session: CollaborationSessionView, request: CollaborationMessageView): void {
  const visible = collaborationVisibleResults(request);
  if (visible.length) {
    const results = document.createElement("section");
    results.className = "collaboration-action-results";
    const heading = document.createElement("strong");
    heading.textContent = t("collaboration.actionResults");
    results.append(heading);
    for (const result of visible) {
      const item = document.createElement("p");
      item.dataset.actionId = result.id;
      item.dataset.state = result.status;
      const status = ["awaitingApproval", "applied", "rejected", "conflict", "failed", "unknown"].includes(result.status)
        ? t(`collaboration.taskOperationStatus.${result.status}` as InterfaceCopyKey)
        : result.status === "saved" ? t("collaboration.externalStatusSaved")
        : t(`collaboration.habitRefreshState.${result.status}` as InterfaceCopyKey);
      const source = result.source === "Long-term background" ? t("collaboration.longTermHeading")
        : result.source === "Habits page" ? t("collaboration.habitRefreshStage.display")
        : result.source === "Habit source query" ? t("collaboration.habitRefreshStage.query")
        : result.source === "Habit generation" ? t("collaboration.habitRefreshStage.generation")
        : result.source === "Habit publication" ? t("collaboration.habitRefreshStage.publication") : result.source;
      item.textContent = `${source} · ${status}${result.targetDate ? ` · ${collaborationDateLabel(result.targetDate)}` : ""}\n${collaborationOutcomeSummary(result, session)}`;
      const receipt = session.taskOperations?.find(operation => operation.id === result.id);
      if (receipt && result.status === "applied" && (receipt.taskId || receipt.listId ||
        ["saveDailyPlan", "saveEveningReview", "createShortRecord", "correctShortRecord", "setLocalHabitCompletion"].includes(receipt.operation.operation))) {
        const open = document.createElement("button");
        open.type = "button";
        open.className = "text-button collaboration-outcome-link";
        open.textContent = t(receipt.taskId || receipt.listId ? "collaboration.openSavedTask" : receipt.operation.operation === "setLocalHabitCompletion" ? "collaboration.openHabitDate" : "collaboration.openDailyRecordToday");
        open.addEventListener("click", () => {
          if (receipt.taskId || receipt.listId) {
            taskReturnToCollaborationSessionId = session.id;
            taskFocusRequestId = receipt.taskId;
            taskScope = receipt.listId ? taskListScopeForId(receipt.listId) : "all";
            taskStateScope = receipt.resultSnapshot?.kind === "task" && receipt.resultSnapshot.deletedAt ? "deleted" : "all";
            showWorkspaceDestination("tasks", true);
          } else {
            rememberDailyPlanReturnTarget(session);
            if (receipt.operation.operation === "setLocalHabitCompletion") {
              selectedHabitCell = { habitKey: receipt.operation.habitKey, date: receipt.targetDate };
              showWorkspaceDestination("habits", true);
            } else {
              const phase = receipt.operation.operation === "saveEveningReview" ? "evening"
                : receipt.operation.operation === "saveDailyPlan" && ["initialPlan", "morningCalibration", "morningBaselineCorrection"].includes(receipt.operation.transition) ? "morning" : "daytime";
              showWorkspaceDestination("today", true, receipt.targetDate);
              showTodayPhase(phase);
            }
          }
        });
        item.append(open);
      }
      results.append(item);
    }
    container.append(results);
  }
  if (request.externalActions?.length) {
    const activity = document.createElement("details");
    activity.className = "collaboration-external-activity";
    const title = document.createElement("summary");
    title.textContent = t("collaboration.externalActivity");
    activity.append(title);
    for (const action of request.externalActions) {
      const row = document.createElement("p");
      row.textContent = `${action.sourceName} · ${action.toolId} · ${action.status === "saved" ? t("collaboration.externalStatusSaved") : action.status}`;
      activity.append(row);
    }
    container.append(activity);
  }
}

function collaborationWorkHistoryLabels(): WorkHistoryLabels {
  return {
    historyMissing: t("collaboration.historyMissing"),
    formatDiagnostic: value => localizeWorkHistoryDiagnostic(value, currentInterfaceLanguage),
    formatApplicationDiagnostic: value => localizeWorkHistoryDiagnostic(localizeCollaborationDiagnostic(value, currentInterfaceLanguage), currentInterfaceLanguage),
    operationLabel: t("collaboration.workOperation"),
    formatOmission: (field, original, retained, fingerprint) => t("collaboration.capacity.bytes", {field, original:String(original), retained:String(retained), fingerprint}),
    priorPayloadLabel:t("collaboration.capacity.priorPayload"),
    omissionReasons: {
      priorCapacityBound:t("collaboration.capacity.priorCapacityBound"),
      itemByteBound:t("collaboration.capacity.itemByteBound"), executionByteBound:t("collaboration.capacity.executionByteBound"),
      aggregateByteBound:t("collaboration.capacity.aggregateByteBound"), detailCountBound:t("collaboration.capacity.detailCountBound"), summaryPartBound:t("collaboration.capacity.summaryPartBound"),
    },
    statuses: {retrying: t("collaboration.workStatus.retrying"), inProgress: t("collaboration.workStatus.inProgress"), completed: t("collaboration.workStatus.completed"), succeeded: t("collaboration.workStatus.succeeded"), failed: t("collaboration.workStatus.failed"), declined: t("collaboration.workStatus.declined"), pending: t("collaboration.workStatus.pending"), interrupted: t("collaboration.workStatus.interrupted"), unknown: t("collaboration.workStatus.unknown")},
    changeOperations: {add: t("collaboration.changeOperation.add"), update: t("collaboration.changeOperation.update"), delete: t("collaboration.changeOperation.delete"), append: t("collaboration.changeOperation.append"), correct: t("collaboration.changeOperation.correct"), unknown: t("collaboration.changeOperation.unknown")},
    title: t("collaboration.workHistory"), summary: t("collaboration.reasoningSummary"),
    commentary: t("collaboration.codexProgress"), message: t("collaboration.codexMessage"),
    tool: t("collaboration.toolActivity"), failed: t("collaboration.workFailed"),
    completed: t("collaboration.toolCompleted"), running: t("collaboration.workRunning"), details: t("collaboration.workDetails"),
    diagnosticUnavailable: t("collaboration.diagnosticUnavailable"),
    changeStates: {
      sourceObserved: t("collaboration.changeObserved"), verified: t("collaboration.changeVerified"),
      unconfirmed: t("collaboration.changeUnconfirmed"), unobserved: t("collaboration.changeUnconfirmed"),
      scopeRejected: t("collaboration.changeScopeRejected"),
    },
    actions: {
      createTask: t("collaboration.workAction.createTask"),
      updateTask: t("collaboration.workAction.updateTask"),
      completeTask: t("collaboration.workAction.completeTask"),
      abandonTask: t("collaboration.workAction.abandonTask"),
      reopenTask: t("collaboration.workAction.reopenTask"),
      deleteTask: t("collaboration.workAction.deleteTask"),
      restoreTask: t("collaboration.workAction.restoreTask"),
      correctCompletion: t("collaboration.workAction.correctCompletion"),
      createList: t("collaboration.workAction.createList"),
      renameList: t("collaboration.workAction.renameList"),
      archiveList: t("collaboration.workAction.archiveList"),
      restoreList: t("collaboration.workAction.restoreList"),
      saveDailyPlan: t("collaboration.workAction.saveDailyPlan"),
      saveEveningReview: t("collaboration.workAction.saveEveningReview"),
      createShortRecord: t("collaboration.workAction.createShortRecord"),
      correctShortRecord: t("collaboration.workAction.correctShortRecord"),
      setLocalHabitCompletion: t("collaboration.workAction.setLocalHabitCompletion"),
      get_habit: t("collaboration.workAction.get_habit"),
      list_habits: t("collaboration.workAction.list_habits"),
      get_habit_checkins: t("collaboration.workAction.get_habit_checkins"),
      upsert_habit_checkins: t("collaboration.workAction.upsert_habit_checkins"),
      delete_habit_checkins: t("collaboration.workAction.delete_habit_checkins"),
      dashboard_refresh_habits: t("collaboration.workAction.dashboard_refresh_habits"),
      dashboard_memory_update: t("collaboration.workAction.dashboard_memory_update"),
      commandExecution: t("collaboration.workAction.commandExecution"),
      fileChange: t("collaboration.workAction.fileChange"),
      webSearch: t("collaboration.workAction.webSearch"),
      mcpToolCall: t("collaboration.workAction.mcpToolCall"),
      dynamicToolCall: t("collaboration.workAction.dynamicToolCall"),
      runtimeError: t("collaboration.workAction.runtimeError"),
    },
  };
}

function renderCollaborationMessages(session: CollaborationSessionView | null): void {
  if (!collaborationMessageList) return;
  const previousScroll = collaborationMessageList.scrollTop;
  const following = !collaborationMessageList.scrollHeight ||
    collaborationMessageList.scrollHeight - collaborationMessageList.scrollTop - collaborationMessageList.clientHeight < 48;
  const expanded = new Map<string, { open: boolean; manual: string | undefined }>();
  for (const detail of collaborationMessageList.querySelectorAll?.<HTMLDetailsElement>("details[data-work-key]") ?? []) {
    if (detail.dataset.manual) expanded.set(detail.dataset.workKey!, { open: detail.open, manual: detail.dataset.manual });
  }
  collaborationMessageList.replaceChildren();
  if (!session || session.messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "collaboration-empty-conversation";
    empty.textContent = session
      ? t("collaboration.emptyConversation")
      : t("collaboration.selectSession");
    collaborationMessageList.append(empty);
    return;
  }
  for (const message of session.messages) {
    const article = document.createElement("article");
    article.className = `collaboration-message collaboration-message-${message.role}`;
    const heading = document.createElement("header");
    const role = document.createElement("strong");
    role.textContent = message.role === "user"
      ? (message.automaticPlan
        ? t("collaboration.automaticPlanMessageRole")
        : t("collaboration.userRole"))
      : t("collaboration.assistantRole");
    const date = document.createElement("span");
    date.textContent = t("collaboration.messageDate", {
      date: collaborationDateLabel(message.messageDate),
    });
    heading.append(role, date);
    if (message.targetDate !== message.messageDate) {
      const target = document.createElement("small");
      target.textContent = t("collaboration.messageTargetDate", {
        date: collaborationDateLabel(message.targetDate),
      });
      heading.append(target);
    }
    if (message.role === "user" && message.deliveryState) {
      const delivery = document.createElement("span");
      delivery.className = "collaboration-delivery-state";
      delivery.dataset.state = message.deliveryState;
      delivery.textContent = collaborationDeliveryStateLabel(message.deliveryState);
      heading.append(delivery);
    }
    const markdown = message.role === "assistant" && /(?:^|\n)\s*(?:[-*] |\d+\. )|\[[^\]]+\]\(|\*\*|`/.test(message.text);
    const body = document.createElement(markdown ? "div" : "p");
    if (markdown) appendCollaborationMarkdown(body, message.text, document, target => navigateCollaborationLink(session, target));
    else body.textContent = message.text;
    article.append(heading, body);
    // Tool activity belongs to the assistant's work, never to the user's input.
    const request = message.role === "assistant"
      ? session.messages.slice(0, session.messages.indexOf(message)).reverse().find(candidate =>
        candidate.role === "user" && (!message.executionId || candidate.executionId === message.executionId))
      : null;
    const laterReply = session.messages.slice(session.messages.indexOf(message) + 1).some(candidate =>
      candidate.role === "assistant" && candidate.executionId && candidate.executionId === message.executionId);
    if (request && !laterReply) {
      renderCollaborationOutcomes(article, session, request);
      const history = session.workHistory?.find(entry => entry.executionId === request.executionId);
      appendCollaborationWorkHistory(article, history ?? null, document, collaborationWorkHistoryLabels(), target => navigateCollaborationLink(session, target));
    }
    if (message.role === "user" && message.pendingExternalApproval) {
      const panel = document.createElement("section");
      panel.className = "collaboration-external-approval";
      panel.setAttribute("aria-label", t("collaboration.externalApprovalHeading"));
      const notice = document.createElement("p");
      notice.textContent = t("collaboration.externalDisabledNotice");
      panel.append(notice);
      article.append(panel);
    }
    if (message.role === "user" && message.executionId) {
      if (
        ["interrupted", "stop-unconfirmed"].includes(message.deliveryState) &&
        !message.resultChecked
      ) {
        const check = document.createElement("button");
        check.type = "button";
        check.className = "collaboration-message-action";
        check.textContent = t("collaboration.checkSavedResult");
        check.disabled = pendingCollaborationRunChecks.has(message.executionId);
        check.addEventListener("click", () => {
          void reconcileCollaborationRun(session.id, message.executionId!);
        });
        article.append(check);
      } else if (["not-started", "paused"].includes(message.deliveryState)) {
        const resume = document.createElement("button");
        resume.type = "button";
        resume.className = "collaboration-message-action";
        resume.textContent = t("collaboration.resumeNotStarted");
        resume.addEventListener("click", () => {
          void resumeCollaborationRequest(session.id, message.executionId!);
        });
        article.append(resume);
      }
      if (["queued", "paused", "not-started"].includes(message.deliveryState)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "collaboration-message-action";
        remove.textContent = t("collaboration.removePending");
        remove.addEventListener("click", () => { void removeCollaborationRequest(session.id, message.executionId!); });
        article.append(remove);
      }
    }
    collaborationMessageList.append(article);
    const nextUserIndex = session.messages.findIndex((candidate, index) => index > session.messages.indexOf(message) && candidate.role === "user");
    const matchingReply = session.messages.slice(session.messages.indexOf(message) + 1, nextUserIndex < 0 ? undefined : nextUserIndex)
      .some(candidate => candidate.role === "assistant" && (!message.executionId || candidate.executionId === message.executionId));
    const historicalRequest = ["completed", "error", "stopped", "interrupted", "stop-unconfirmed"].includes(message.deliveryState);
    if (message.role === "user" && !matchingReply &&
      ((message.actionResults?.length ?? 0) > 0 || (message.externalActions?.length ?? 0) > 0 ||
        session.workHistory?.some(entry => entry.executionId === message.executionId) || historicalRequest)) {
      const progress = document.createElement("article");
      progress.className = "collaboration-message collaboration-message-assistant";
      renderCollaborationOutcomes(progress, session, message);
      const history = session.workHistory?.find(entry => entry.executionId === message.executionId);
      if (history || historicalRequest) appendCollaborationWorkHistory(progress, history ?? null, document, collaborationWorkHistoryLabels(), target => navigateCollaborationLink(session, target));
      if (progress.children.length) collaborationMessageList.append(progress);
    }
  }
  for (const detail of collaborationMessageList.querySelectorAll?.<HTMLDetailsElement>("details[data-work-key]") ?? []) {
    const previous = expanded.get(detail.dataset.workKey!);
    if (previous) { detail.open = previous.open; detail.dataset.manual = previous.manual; }
  }
  collaborationMessageList.scrollTop = following && ![...expanded.values()].some(entry => entry.open)
    ? collaborationMessageList.scrollHeight : previousScroll;
}

function navigateCollaborationLink(session: CollaborationSessionView, target: CollaborationLink): void {
  // These targets open existing app views and their canonical read/lookup paths.
  // Missing objects remain absent; navigation never creates data or selects a Vault.
  if (target.kind === "task" || target.kind === "list") {
    taskReturnToCollaborationSessionId = session.id;
    taskFocusRequestId = target.kind === "task" ? target.id : null;
    taskScope = target.kind === "list" ? taskListScopeForId(target.id) : "all";
    taskStateScope = "all";
    showWorkspaceDestination("tasks", true);
  } else if (target.kind === "record") {
    rememberDailyPlanReturnTarget(session);
    showWorkspaceDestination("today", true, target.date);
    if (target.phase) showTodayPhase(target.phase);
  } else if (target.kind === "habit") {
    rememberDailyPlanReturnTarget(session);
    selectedHabitCell = { habitKey: target.key, date: target.date };
    showWorkspaceDestination("habits", true);
  }
}

function currentCollaborationVoiceTarget(): CollaborationVoiceTarget | null {
  const session = currentCollaborationSession;
  if (!session) return null;
  return {
    sessionId: session.id,
    targetDate: collaborationTargetDates.get(session.id) ??
      (collaborationTargetDateInput?.value || collaborationTargetDate),
  };
}

function isCurrentCollaborationVoiceTarget(target: CollaborationVoiceTarget): boolean {
  const current = currentCollaborationVoiceTarget();
  return Boolean(current && collaborationDraftKey(current.sessionId, current.targetDate) ===
    collaborationDraftKey(target.sessionId, target.targetDate));
}

function setCollaborationVoiceStatus(
  target: CollaborationVoiceTarget,
  status: CollaborationVoiceStatusKey,
): void {
  collaborationVoiceStatuses.set(collaborationDraftKey(target.sessionId, target.targetDate), status);
  if (isCurrentCollaborationVoiceTarget(target)) setRawText(collaborationVoiceStatus, collaborationVoiceStatusText(target, status));
}

function collaborationVoiceStatusText(target: CollaborationVoiceTarget, status: CollaborationVoiceStatusKey): string {
  const incomplete = collaborationIncompleteVoiceDrafts.has(collaborationDraftKey(target.sessionId, target.targetDate));
  return t(status) + (incomplete && status !== "collaboration.voiceIncomplete" ? "\n" + t("collaboration.voiceIncomplete") : "");
}

function collaborationVoiceFailureStatus(failure: CollaborationVoiceFailure): CollaborationVoiceStatusKey {
  switch (failure) {
    case "permission-denied": return "collaboration.voicePermissionDenied";
    case "capture-unavailable": return "collaboration.voiceCaptureUnavailable";
    case "recording-failed": return "collaboration.voiceRecordingFailed";
    case "empty-recording": return "collaboration.voiceEmptyRecording";
    case "recognition-failed": return "collaboration.voiceRecognitionFailed";
    case "login-required": return "collaboration.voiceLoginRequired";
    case "connection-failed": return "collaboration.voiceConnectionFailed";
    case "service-failed": return "collaboration.voiceServiceFailed";
    case "quota-exceeded": return "collaboration.voiceQuotaExceeded";
  }
}

function renderCollaborationVoiceControls(): void {
  if (!collaborationVoiceStartButton) return;
  const state=collaborationVoiceController.state;
  const target=currentCollaborationVoiceTarget();
  const key=target?collaborationDraftKey(target.sessionId,target.targetDate):"";
  const status=target?collaborationVoiceStatuses.get(key):undefined;
  const activeHere=target&&activeCollaborationVoiceTarget&&
    collaborationDraftKey(activeCollaborationVoiceTarget.sessionId,activeCollaborationVoiceTarget.targetDate)===key;
  const preview = activeHere ? collaborationVoicePreviews.get(key) : undefined;
  setRawText(collaborationVoicePreview,preview?t("collaboration.voicePreview",{text:preview}):"");
  if(state!=="idle"&&activeHere) {
    setCopy(collaborationVoiceStatus,state==="requesting"?"collaboration.voiceRequesting":state==="connecting"?"collaboration.voiceConnecting":state==="recording"?"collaboration.voiceRecording":"collaboration.voiceTranscribing");
  } else if(state!=="idle"&&activeCollaborationVoiceTarget) {
    setRawText(collaborationVoiceStatus,t("collaboration.voiceProcessingOrigin",{date:activeCollaborationVoiceTarget.targetDate}));
  } else if(status && target) setRawText(collaborationVoiceStatus,collaborationVoiceStatusText(target,status));
  else setRawText(collaborationVoiceStatus,"");
  const stop=state==="recording";
  const label=t(stop?"collaboration.voiceStop":"collaboration.voiceStart");
  collaborationVoiceStartButton.setAttribute("aria-label",label);
  collaborationVoiceStartButton.title=label;
  collaborationVoiceStartButton.dataset.action=stop?"stop":"start";
  collaborationVoiceStartButton.setAttribute("aria-pressed",String(stop));
  const connection = currentCollaborationConnection;
  const voiceAvailable = connection?.authenticated === true &&
    connection.authMode === "chatgpt" && connection.readOnlyTextTurnsAvailable &&
    Boolean(currentCollaborationWorkspace?.context.vaultName);
  collaborationVoiceStartButton.disabled = state === "recording"
    ? false
    : vaultSelectionInProgress || state !== "idle" || !voiceAvailable || !target ||
      collaborationMessageDraft?.disabled === true || collaborationSendingDrafts.has(key);
  collaborationVoiceCancelButton?.toggleAttribute("hidden",state==="idle");
  if(collaborationVoiceCancelButton)collaborationVoiceCancelButton.disabled=state==="idle";
  if(collaborationVoiceStatus)collaborationVoiceStatus.dataset.state=state;
}


function collaborationDraftForTarget(target: CollaborationVoiceTarget): string | undefined {
  const key = collaborationDraftKey(target.sessionId, target.targetDate);
  if (collaborationDrafts.has(key)) return collaborationDrafts.get(key);
  if (currentCollaborationSession?.id !== target.sessionId) return undefined;
  const session = currentCollaborationSession;
  const savedDraft = session.draftsByDate[target.targetDate] ??
    (session.targetDate === target.targetDate ? session.draft : undefined);
  if (savedDraft !== undefined) collaborationDrafts.set(key, savedDraft);
  return savedDraft;
}

function handleCollaborationVoiceTranscript(target: CollaborationVoiceTarget, text: string): void {
  const key = collaborationDraftKey(target.sessionId, target.targetDate);
  const isCurrentTarget = isCurrentCollaborationVoiceTarget(target);
  const currentDraft = collaborationDraftForTarget(target) ??
    (isCurrentTarget ? collaborationMessageDraft?.value ?? "" : "");
  // The older debounced snapshot must not be enqueued after this aggregate.
  const timer = collaborationDraftSaveTimers.get(key);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    collaborationDraftSaveTimers.delete(key);
  }
  const { draft, saved } = beginVoiceTranscriptSave(
    target,
    text,
    currentDraft,
    saveCollaborationDraft,
  );
  collaborationDrafts.set(key, draft);

  if (isCurrentTarget && collaborationMessageDraft) {
    collaborationMessageDraft.value = draft;
    collaborationMessageDraft.focus();
    collaborationMessageDraft.setSelectionRange(draft.length, draft.length);
    setCollaborationVoiceStatus(target, "collaboration.voiceReview");
    renderCollaborationWorkspace();
  } else {
    setCollaborationVoiceStatus(target, "collaboration.voiceSavedForDate");
    renderCollaborationVoiceControls();
  }
  void saved.catch(() => {
    setCollaborationVoiceStatus(target, "collaboration.voiceDraftSaveFailed");
    renderCollaborationVoiceControls();
  });
}

function cancelCollaborationVoiceCaptureForSelectionChange(): void {
  collaborationVoiceController.navigate();
}

async function startOrStopCollaborationVoice(): Promise<void> {
  if(collaborationVoiceController.state==="recording") { collaborationVoiceController.stop();return; }
  const target=currentCollaborationVoiceTarget();
  if(!target||vaultSelectionInProgress||collaborationVoiceController.state!=="idle")return;
  if(collaborationMessageDraft)collaborationDrafts.set(collaborationDraftKey(target.sessionId,target.targetDate),collaborationMessageDraft.value);
  void collaborationVoiceController.start(target);
}

function collaborationTaskSchedule(date: string | null, time: string | null, end?: Readonly<{date: string; time: string}> | null): string {
  if (date && time && end) return `${collaborationDateLabel(date)} · ${time} – ${end.date === date ? "" : `${collaborationDateLabel(end.date)} `}${end.time}`;
  const day = date ? collaborationDateLabel(date) : t("collaboration.taskUndated");
  return time ? `${day} · ${time}` : day;
}

function collaborationTaskBaselineText(
  baseline: CollaborationTaskOperationBaseline,
): string {
  if (baseline.kind === "task") {
    return t("collaboration.taskBaselineTask", {
      name: baseline.name,
      id: baseline.id,
      schedule: collaborationTaskSchedule(baseline.date, baseline.time, baseline.executionEnd),
      list: baseline.listName,
      state: t(taskStateCopyKey(baseline.state)),
      content: baseline.content ?? t("collaboration.taskNoNote"),
      deleted: baseline.deletedAt ? t("collaboration.taskDeleted") : t("collaboration.taskActive"),
    });
  }
  if (baseline.kind === "list") {
    return t("collaboration.taskBaselineList", {
      name: baseline.name,
      id: baseline.id,
      state: baseline.archived
        ? t("collaboration.taskListArchived")
        : t("collaboration.taskListActive"),
    });
  }
  if (baseline.kind === "dailyRecord") {
    return collaborationDailyRecordStatusText(baseline);
  }
  if (baseline.kind === "dailyReview") {
    return t("collaboration.dailyReviewBaselineSummary", {
      date: collaborationDateLabel(baseline.date),
      revision: baseline.revision ?? "—",
    });
  }
  if (baseline.kind === "shortRecord") {
    return t("collaboration.shortRecordBaselineSummary", {
      id: baseline.id,
      text: baseline.text,
      revision: baseline.revision ?? "—",
    });
  }
  if (baseline.kind === "habitCompletion") {
    return collaborationHabitSnapshotStatusText(baseline);
  }
  return t("collaboration.taskBaselineNone");
}

function collaborationDailyRecordStatusText(
  record: Extract<CollaborationTaskOperationBaseline, { kind: "dailyRecord" }>,
): string {
  const state = t(`collaboration.dailyPlanState.${record.recordState}` as InterfaceCopyKey);
  const availability = t(
    `collaboration.dailyPlanAvailability.${record.baselineAvailability}` as InterfaceCopyKey,
  );
  return t("collaboration.dailyPlanRecordState", {
    state,
    availability,
    revision: record.revision ?? "—",
  });
}

function appendDailyPlanBlockList(
  parent: HTMLElement,
  headingKey: InterfaceCopyKey,
  blocks: readonly DailyPlanBlockInput[],
): void {
  const section = document.createElement("section");
  section.className = "collaboration-daily-plan-section";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  section.append(heading);
  if (blocks.length === 0) {
    const empty = document.createElement("p");
    setCopy(empty, "collaboration.dailyPlanNoArrangement");
    section.append(empty);
  } else {
    const list = document.createElement("ul");
    for (const block of blocks) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = t("collaboration.dailyPlanPeriodTitle", {
        period: block.period,
        title: block.title,
      });
      item.append(title);
      if (block.detail) {
        const detail = document.createElement("p");
        detail.textContent = block.detail;
        item.append(detail);
      }
      list.append(item);
    }
    section.append(list);
  }
  parent.append(section);
}

function appendDailyPlanEvidence(
  parent: HTMLElement,
  headingKey: InterfaceCopyKey,
  groups: readonly DailyPlanEvidenceInput[],
): void {
  const section = document.createElement("section");
  section.className = "collaboration-daily-plan-section";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  section.append(heading);
  if (groups.length === 0) {
    const empty = document.createElement("p");
    setCopy(empty, "collaboration.dailyPlanNoEvidence");
    section.append(empty);
  } else {
    const list = document.createElement("ul");
    for (const group of groups) {
      const item = document.createElement("li");
      const label = document.createElement("strong");
      label.textContent = group.label;
      item.append(label);
      if (group.items.length > 0) {
        const items = document.createElement("ul");
        for (const value of group.items) {
          const evidence = document.createElement("li");
          evidence.textContent = value;
          items.append(evidence);
        }
        item.append(items);
      }
      list.append(item);
    }
    section.append(list);
  }
  parent.append(section);
}

function appendDailyRecordSnapshot(
  parent: HTMLElement,
  record: Extract<CollaborationTaskOperationBaseline, { kind: "dailyRecord" }>,
  headingKey: InterfaceCopyKey,
): void {
  const snapshot = document.createElement("section");
  snapshot.className = "collaboration-daily-plan-snapshot";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  const date = document.createElement("small");
  date.textContent = `${collaborationDateLabel(record.date)} · ${collaborationDailyRecordStatusText(record)}`;
  snapshot.append(heading, date);
  appendDailyPlanBlockList(snapshot, "collaboration.dailyPlanCurrentArrangement", record.currentArrangement);
  appendDailyPlanEvidence(snapshot, "collaboration.dailyPlanCurrentBasis", record.currentBasis);
  const preserved = document.createElement("details");
  preserved.className = "collaboration-daily-plan-preserved";
  const summary = document.createElement("summary");
  setCopy(summary, "collaboration.dailyPlanMorningBaseline");
  preserved.append(summary);
  appendDailyPlanBlockList(preserved, "collaboration.dailyPlanMorningBaseline", record.morningBaseline);
  appendDailyPlanEvidence(preserved, "collaboration.dailyPlanBaselineEvidence", record.baselineEvidence);
  snapshot.append(preserved);
  parent.append(snapshot);
}

function appendTextSnapshotSection(
  parent: HTMLElement,
  headingKey: InterfaceCopyKey,
  values: readonly string[],
): void {
  const section = document.createElement("section");
  section.className = "collaboration-daily-record-section";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  section.append(heading);
  if (values.length === 0) {
    const empty = document.createElement("p");
    setCopy(empty, "collaboration.operationNoEvidence");
    section.append(empty);
  } else {
    const list = document.createElement("ul");
    for (const value of values) {
      const item = document.createElement("li");
      item.textContent = value;
      list.append(item);
    }
    section.append(list);
  }
  parent.append(section);
}

function appendDailyReviewSnapshot(
  parent: HTMLElement,
  record: Extract<CollaborationTaskOperationBaseline, { kind: "dailyReview" }>,
  headingKey: InterfaceCopyKey,
): void {
  const snapshot = document.createElement("section");
  snapshot.className = "collaboration-daily-record-snapshot";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  const date = document.createElement("small");
  date.textContent = t("collaboration.dailyRecordSnapshotRevision", {
    date: collaborationDateLabel(record.date),
    revision: record.revision ?? "—",
  });
  snapshot.append(heading, date);
  appendTextSnapshotSection(snapshot, "collaboration.dailyReviewAccount", record.account);
  appendTextSnapshotSection(snapshot, "collaboration.dailyReviewAdditions", record.additions);
  appendTextSnapshotSection(snapshot, "collaboration.dailyReviewCorrections", record.corrections);
  appendTextSnapshotSection(snapshot, "collaboration.dailyReviewShortRecords", record.shortRecords);
  parent.append(snapshot);
}

function appendShortRecordSnapshot(
  parent: HTMLElement,
  record: Extract<CollaborationTaskOperationBaseline, { kind: "shortRecord" }>,
  headingKey: InterfaceCopyKey,
): void {
  const snapshot = document.createElement("section");
  snapshot.className = "collaboration-daily-record-snapshot";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  const identity = document.createElement("small");
  identity.textContent = t("collaboration.shortRecordIdentity", {
    id: record.id,
    category: t(`collaboration.shortRecordCategory.${record.category}` as InterfaceCopyKey),
  });
  const text = document.createElement("p");
  text.className = "collaboration-operation-source-text";
  text.textContent = record.text;
  const revision = document.createElement("small");
  revision.textContent = t("collaboration.shortRecordRevision", {
    revision: record.revision ?? "—",
    count: String(record.changeCount),
  });
  snapshot.append(heading, identity, text, revision);
  parent.append(snapshot);
}

function collaborationHabitSnapshotStatusText(
  baseline: Extract<CollaborationTaskOperationBaseline, { kind: "habitCompletion" }>,
): string {
  const state = baseline.sourceSnapshotState
    ? t(`collaboration.habitSnapshotState.${baseline.sourceSnapshotState}` as InterfaceCopyKey)
    : t("common.unknown");
  return t("collaboration.habitSnapshotBaselineSummary", {
    name: baseline.name,
    state,
    revision: baseline.completionRevision ?? "—",
  });
}

function appendHabitCompletionSnapshot(
  parent: HTMLElement,
  baseline: Extract<CollaborationTaskOperationBaseline, { kind: "habitCompletion" }>,
  headingKey: InterfaceCopyKey,
): void {
  const snapshot = document.createElement("section");
  snapshot.className = "collaboration-habit-snapshot";
  const heading = document.createElement("h5");
  setCopy(heading, headingKey);
  const state = baseline.sourceSnapshotState
    ? t(`collaboration.habitSnapshotState.${baseline.sourceSnapshotState}` as InterfaceCopyKey)
    : t("common.unknown");
  const meta = document.createElement("p");
  meta.textContent = t("collaboration.habitSnapshotMeta", {
    date: collaborationDateLabel(baseline.date),
    name: baseline.name,
    state,
    localState: t(`collaboration.habitLocalState.${baseline.localState.toLowerCase()}` as InterfaceCopyKey),
    external: baseline.externalCompletion
      ? t("collaboration.habitExternalCompletion.true")
      : baseline.sourceSnapshotState === "ready" || baseline.sourceSnapshotState === "stale"
        ? t("collaboration.habitExternalCompletion.false")
        : t("common.unknown"),
  });
  const revision = document.createElement("small");
  revision.textContent = t("collaboration.habitSnapshotRevision", {
    generatedAt: baseline.sourceSnapshotAt ?? t("common.unknown"),
    revision: baseline.completionRevision ?? "—",
  });
  snapshot.append(heading, meta, revision);
  if (baseline.sourceSnapshotMessage) {
    const warning = document.createElement("p");
    const staleSnapshot = baseline.sourceSnapshotState === "stale";
    warning.className = staleSnapshot
      ? "collaboration-habit-snapshot-warning"
      : "collaboration-habit-snapshot-message";
    warning.textContent = t(staleSnapshot
      ? "collaboration.habitSnapshotWarning"
      : "collaboration.habitSnapshotMessage", {
      message: baseline.sourceSnapshotMessage,
    });
    snapshot.append(warning);
  }
  appendTextSnapshotSection(snapshot, "collaboration.habitSourceEvidence", baseline.sourceEvidence);
  parent.append(snapshot);
}

function appendDailyPlanMetadata(
  parent: HTMLElement,
  operation: Extract<CollaborationTaskOperation, { operation: "saveDailyPlan" }>,
): void {
  const rows: readonly [InterfaceCopyKey, string | null][] = [
    ["collaboration.dailyPlanCalibrationNote", operation.calibrationNote],
    ["collaboration.dailyPlanBaselineCorrectionReason", operation.baselineCorrectionReason],
    ["collaboration.dailyPlanEvent", operation.event],
    ["collaboration.dailyPlanOriginalIntent", operation.originalIntent],
    ["collaboration.dailyPlanChangeReason", operation.changeReason],
    ["collaboration.dailyPlanRevisedDirection", operation.revisedDirection],
  ];
  for (const [labelKey, value] of rows) {
    if (!value?.trim()) continue;
    const field = document.createElement("p");
    field.className = "collaboration-daily-plan-note";
    const label = document.createElement("strong");
    setCopy(label, labelKey);
    const content = document.createElement("span");
    content.textContent = value;
    field.append(label, content);
    parent.append(field);
  }
}

function collaborationDailyPlanTransitionText(transition: DailyPlanTransition): string {
  return t(`collaboration.dailyPlanTransition.${transition}` as InterfaceCopyKey);
}

function collaborationDailyPlanActionText(
  operation: Extract<CollaborationTaskOperation, { operation: "saveDailyPlan" }>,
): string {
  const transition = collaborationDailyPlanTransitionText(operation.transition);
  const subject = operation.event ?? operation.revisedDirection ?? operation.originalIntent;
  return subject ? `${transition} · ${subject}` : transition;
}

function rememberDailyPlanReturnTarget(session: CollaborationSessionView | null): void {
  if (!session) return;
  dailyPlanReturnToCollaborationSessionId = session.id;
  dailyPlanReturnToCollaborationDate = collaborationTargetDate;
  collaborationTargetDates.set(session.id, collaborationTargetDate);
}

function renderDailyPlanReturnNavigation(): void {
  const visible = Boolean(dailyPlanReturnToCollaborationSessionId);
  if (todayReturnToCollaborationButton) {
    todayReturnToCollaborationButton.hidden = !visible || currentWorkspaceDestination !== "today";
  }
  if (calendarReturnToCollaborationButton) {
    calendarReturnToCollaborationButton.hidden = !visible || currentWorkspaceDestination !== "calendar";
  }
}

function collaborationTaskOperationText(
  operation: CollaborationTaskOperation,
  baseline: CollaborationTaskOperationBaseline,
): string {
  const currentTask = baseline.kind === "task" ? baseline : null;
  const currentList = baseline.kind === "list" ? baseline : null;
  const listLabel = (listId: string | null): string => {
    if (!listId) return currentTask?.listName ?? t("tasks.inbox");
    return currentCollaborationWorkspace?.context.taskLists.find((list) => list.id === listId)?.name ?? listId;
  };
  switch (operation.operation) {
    case "createTask":
      return t("collaboration.taskOpCreate", {
        name: operation.name,
        schedule: collaborationTaskSchedule(operation.date, operation.time, operation.executionEnd),
        list: listLabel(operation.listId),
        content: operation.content ?? t("collaboration.taskNoNote"),
      });
    case "updateTask":
      return t("collaboration.taskOpUpdate", {
        name: operation.name,
        id: operation.taskId,
        schedule: collaborationTaskSchedule(operation.date, operation.time, operation.executionEnd),
        list: listLabel(operation.listId),
        content: operation.content ?? t("collaboration.taskNoNote"),
      });
    case "completeTask":
      return t("collaboration.taskOpComplete", { name: currentTask?.name ?? operation.taskId });
    case "abandonTask":
      return t("collaboration.taskOpAbandon", { name: currentTask?.name ?? operation.taskId });
    case "reopenTask":
      return t("collaboration.taskOpReopen", { name: currentTask?.name ?? operation.taskId });
    case "deleteTask":
      return t("collaboration.taskOpDelete", { name: currentTask?.name ?? operation.taskId });
    case "restoreTask":
      return t("collaboration.taskOpRestore", { name: currentTask?.name ?? operation.taskId });
    case "correctCompletion":
      return t("collaboration.taskOpCorrectCompletion", {
        name: currentTask?.name ?? operation.taskId,
        date: collaborationDateLabel(operation.completedOn),
        time: operation.completedTime ?? t("collaboration.taskNoTime"),
      });
    case "createList":
      return t("collaboration.taskOpCreateList", { name: operation.name });
    case "renameList":
      return t("collaboration.taskOpRenameList", {
        previous: currentList?.name ?? operation.listId,
        name: operation.name,
      });
    case "archiveList":
      return t("collaboration.taskOpArchiveList", { name: currentList?.name ?? operation.listId });
    case "restoreList":
      return t("collaboration.taskOpRestoreList", { name: currentList?.name ?? operation.listId });
    case "saveDailyPlan":
      return collaborationDailyPlanActionText(operation);
    case "saveEveningReview":
      return t(
        operation.mode === "addition"
          ? "collaboration.dailyRecordAction.reviewAddition"
          : "collaboration.dailyRecordAction.reviewCorrection",
        { content: operation.content },
      );
    case "createShortRecord":
      return t("collaboration.dailyRecordAction.shortRecordCreation", {
        category: t(`collaboration.shortRecordCategory.${operation.category}` as InterfaceCopyKey),
        content: operation.content,
      });
    case "correctShortRecord": {
      const category = baseline.kind === "shortRecord" ? baseline.category : "ordinary";
      return t("collaboration.dailyRecordAction.shortRecordCorrection", {
        category: t(`collaboration.shortRecordCategory.${category}` as InterfaceCopyKey),
        id: operation.recordId,
        content: operation.content,
      });
    }
    case "setLocalHabitCompletion": {
      const name = baseline.kind === "habitCompletion" ? baseline.name : operation.habitKey;
      return t(
        operation.completed
          ? "collaboration.habitCompletionAction.add"
          : "collaboration.habitCompletionAction.withdraw",
        { name, date: collaborationDateLabel(
          baseline.kind === "habitCompletion" ? baseline.date : currentCollaborationSession?.targetDate ?? "",
        ) },
      );
    }
  }
}

async function runCollaborationTaskOperationAction(
  sessionId: string,
  operationId: string,
  action: "approve" | "reject" | "refresh" | "reconcile",
): Promise<void> {
  if (pendingCollaborationTaskOperationIds.has(operationId)) return;
  const operationTargetDate = currentCollaborationSession?.taskOperations.find(
    (operation) => operation.id === operationId,
  )?.targetDate ?? currentCollaborationSession?.targetDate;
  pendingCollaborationTaskOperationIds.add(operationId);
  renderCollaborationWorkspace();
  const command = {
    approve: "collaboration_approve_task_operation",
    reject: "collaboration_reject_task_operation",
    refresh: "collaboration_refresh_task_operation",
    reconcile: "collaboration_reconcile_task_operation",
  }[action];
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationSessionView>(command, {
      sessionId,
      operationId,
    });
    if (currentCollaborationSession?.id === sessionId) {
      currentCollaborationSession = updated;
      cacheCollaborationDrafts(updated);
    }
    collaborationTaskActionErrors.delete(operationId);
    const savedOperation = updated.taskOperations.find((operation) => operation.id === operationId);
    if (
      (action === "approve" || action === "reconcile") &&
      savedOperation?.status === "applied" &&
      isCanonicalDateProjectionOperation(savedOperation.operation)
    ) {
      const warning = await refreshCanonicalDateProjections(savedOperation.targetDate);
      if (warning) collaborationTaskProjectionWarnings.set(operationId, warning);
      else collaborationTaskProjectionWarnings.delete(operationId);
    }
    await refreshCollaborationContextAfterOperation(sessionId, operationTargetDate);
    renderCollaborationWorkspace();
  } catch (error) {
    collaborationTaskActionErrors.set(operationId, String(error));
    if (currentCollaborationSession?.id === sessionId && collaborationRunStatus) {
      try {
        currentCollaborationSession = await window.__TAURI__.core.invoke<CollaborationSessionView>(
          "collaboration_session",
          { sessionId },
        );
      } catch {
        // Keep the last saved proposal visible; its exact result can be checked after recovery.
      }
    }
    await refreshCollaborationContextAfterOperation(sessionId, operationTargetDate);
  } finally {
    pendingCollaborationTaskOperationIds.delete(operationId);
    renderCollaborationWorkspace();
  }
}

function isCanonicalDateProjectionOperation(operation: CollaborationTaskOperation): boolean {
  return operation.operation === "saveDailyPlan" ||
    operation.operation === "saveEveningReview" ||
    operation.operation === "createShortRecord" ||
    operation.operation === "correctShortRecord" ||
    operation.operation === "setLocalHabitCompletion";
}

type CollaborationRefreshContext = Readonly<{ sessionId: string; executionId: string; trigger: "confirmedEffect" | "turnTerminal" }>;
async function refreshCanonicalDateProjections(targetDate: string, evidence?: CollaborationRefreshContext): Promise<string | null> {
  if (vaultSelectionInProgress) return null;
  const vaultRevision = collaborationVaultSelectionRevision;
  const [year, month] = targetDate.split("-").map(Number);
  const todayRequest = window.__TAURI__.core.invoke<TodayView>("read_daily_view", { date: targetDate })
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  const calendarRequest = window.__TAURI__.core.invoke<CalendarMonthView>("calendar_month", { year, month })
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  const habitRequest = window.__TAURI__.core.invoke<HabitSnapshotView>("habit_snapshot")
    .then((value) => ({ ok: true as const, value }))
    .catch((error: unknown) => ({ ok: false as const, error }));
  const [today, calendar, habits] = await Promise.all([todayRequest, calendarRequest, habitRequest]);
  if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return null;
  const unavailable: string[] = [];
  const todayTargetVisible = currentWorkspaceDestination === "today" && (
    selectedTodayDate === targetDate ||
    (selectedTodayDate === null && currentTodayView?.date === targetDate)
  );
  const calendarTargetVisible = currentWorkspaceDestination === "calendar" && (
    selectedCalendarDate === targetDate || currentCalendarSummaryView?.date === targetDate
  );
  const habitTargetVisible = selectedHabitCell?.date === targetDate;

  if (today.ok) {
    if (todayTargetVisible) {
      todayPresentationRequests.invalidate();
      todayClockRequests.invalidate();
      renderToday(today.value);
    }
    if (calendarTargetVisible) {
      calendarSelectionRequests.invalidate();
      calendarMonthRequests.invalidate();
      renderCalendarSummary(today.value);
    }
    if (habitTargetVisible) {
      habitDateRequests.invalidate();
      currentHabitDateView = today.value;
      renderSelectedHabitCell();
    }
  } else {
    unavailable.push(t("destination.today"));
    if (calendarTargetVisible) unavailable.push(t("destination.calendar"));
    if (habitTargetVisible) unavailable.push(t("destination.habits"));
    if (todayTargetVisible && todayStatus) {
      todayPresentationRequests.invalidate();
      todayClockRequests.invalidate();
      todayPresentationFresh = false;
      setCopyError(todayStatus, "today.loadFailed", today.error);
      todayStatus.dataset.state = "error";
    }
    if (calendarTargetVisible) {
      calendarSelectionRequests.invalidate();
      calendarMonthRequests.invalidate();
      renderCalendarReadError(today.error, false, false);
    }
    if (habitTargetVisible) {
      habitDateRequests.invalidate();
      currentHabitDateView = null;
      habitNoteStatus = {
        copyKey: "habits.loadDateFailed",
        error: String(today.error),
        state: "error",
      };
      renderSelectedHabitCell();
    }
  }

  if (calendar.ok) {
    const targetMonthIsVisible = currentWorkspaceDestination === "calendar" && (
      selectedCalendarDate === targetDate ||
      (currentCalendarMonth?.year === year && currentCalendarMonth.month === month)
    );
    if (targetMonthIsVisible) {
      calendarSelectionRequests.invalidate();
      calendarMonthRequests.invalidate();
      currentCalendarMonth = calendar.value;
      renderCalendarGrid(calendar.value);
    }
  } else {
    unavailable.push(t("destination.calendar"));
    const targetMonthIsVisible = currentWorkspaceDestination === "calendar" && (
      selectedCalendarDate === targetDate ||
      (currentCalendarMonth?.year === year && currentCalendarMonth.month === month)
    );
    if (targetMonthIsVisible) {
      calendarSelectionRequests.invalidate();
      calendarMonthRequests.invalidate();
      renderCalendarReadError(calendar.error, false, false);
    }
  }

  if (habits.ok) {
    habitSnapshotRequests.invalidate();
    renderHabitSnapshot(habits.value);
  } else {
    unavailable.push(t("destination.habits"));
    habitSnapshotRequests.invalidate();
    renderHabitSnapshot({
      state: "error",
      message: String(habits.error),
      livedDate: null,
      readError: String(habits.error),
      generatedAt: null,
      displayRangeLabel: null,
      rangeLabel: null,
      producerLabel: null,
      completionRevision: null,
      completionTargetBinding: null,
      catalogRevision: null,
      catalogTargetBinding: null,
      catalogError: null,
      completionError: null,
      namesConfigurationState: "missing",
      summary: { knownCompletions: 0, targetCompletions: 0, coverageNote: "", excludedNoGoal: 0 },
      habits: [],
    });
  }

  if (evidence) {
    const observations = [
      { target: "today", status: today.ok ? "readCompleted" : "readFailed", sourceState: today.ok ? today.value.state : "unavailable", pageState: todayTargetVisible || calendarTargetVisible || habitTargetVisible ? (today.ok ? "rendered" : "failed") : "notVisible" },
      { target: "calendar", status: calendar.ok ? "readCompleted" : "readFailed", sourceState: calendar.ok ? calendar.value.taskState : "unavailable", pageState: currentWorkspaceDestination === "calendar" && (selectedCalendarDate === targetDate || (currentCalendarMonth?.year === year && currentCalendarMonth.month === month)) ? (calendar.ok ? "rendered" : "failed") : "notVisible" },
      { target: "habits", status: habits.ok ? "readCompleted" : "readFailed", sourceState: habits.ok ? habits.value.state : "unavailable", pageState: habits.ok ? (currentWorkspaceDestination === "habits" ? "rendered" : "cached") : "failed" },
    ].map(observation => ({...observation, targetDate, trigger:evidence.trigger}));
    // Observation persistence never repeats a canonical write or source refresh.
    void window.__TAURI__.core.invoke("collaboration_record_refresh", {sessionId:evidence.sessionId, executionId:evidence.executionId, observations}).catch(() => {});
  }
  return unavailable.length > 0 ? [...new Set(unavailable)].join(" · ") : null;
}

async function refreshCollaborationContextAfterOperation(
  sessionId: string,
  targetDate: string | undefined,
): Promise<void> {
  if (currentCollaborationSession?.id !== sessionId || !currentCollaborationWorkspace) return;
  const date = targetDate ?? currentCollaborationSession.targetDate;
  try {
    const context = await window.__TAURI__.core.invoke<CollaborationContextView>(
      "collaboration_context",
      { date },
    );
    if (currentCollaborationSession?.id !== sessionId) return;
    currentCollaborationWorkspace = { ...currentCollaborationWorkspace, context };
  } catch (error) {
    const context = currentCollaborationWorkspace.context;
    const message = `Could not refresh current collaboration context: ${String(error)}`;
    currentCollaborationWorkspace = {
      ...currentCollaborationWorkspace,
      context: {
        ...context,
        dailyRecord: { state: "error", message, items: [] },
        tasks: { state: "error", message, items: [] },
        taskRevision: null,
        taskTargetBinding: null,
        taskRecords: [],
        taskLists: [],
        habits: { state: "error", message, items: [] },
      },
    };
  }
}

function appendHabitRefreshReport(container: HTMLElement, report: HabitRefreshReport): void {
  const card = document.createElement("article");
  card.className = "collaboration-task-operation";
  const title = document.createElement("strong");
  title.textContent = t("collaboration.habitRefreshTitle");
  card.append(title);
  for (const stage of ["query", "generation", "publication", "display"] as const) {
    const row = document.createElement("p");
    row.textContent = `${t(`collaboration.habitRefreshStage.${stage}` as InterfaceCopyKey)}: ${t(`collaboration.habitRefreshState.${report[stage]}` as InterfaceCopyKey)}`;
    card.append(row);
  }
  if (report.generatedAt && report.rangeFrom && report.rangeTo) {
    const coverage = document.createElement("small");
    coverage.textContent = t("collaboration.habitRefreshCoverage", { time: report.generatedAt, from: report.rangeFrom, to: report.rangeTo });
    card.append(coverage);
  }
  const detail = document.createElement("p");
  detail.textContent = localizeCollaborationDiagnostic(report.message, currentInterfaceLanguage);
  card.append(detail);
  container.append(card);
}

function renderCollaborationTaskOperations(session: CollaborationSessionView | null): void {
  if (collaborationTaskToolNotice) {
    collaborationTaskToolNotice.replaceChildren();
    const legacyTasks = Boolean(session?.runtimeThreadId && !session.taskToolAvailable);
    const legacyDailyPlan = Boolean(session?.runtimeThreadId && session.dailyPlanToolAvailable !== true);
    const legacyDailyRecord = Boolean(session?.runtimeThreadId && session.dailyRecordToolAvailable !== true);
    const legacyMemory = Boolean(session?.runtimeThreadId && session.memoryToolAvailable !== true);
    const hasLegacyCapability = legacyTasks || legacyDailyPlan || legacyDailyRecord || legacyMemory;
    collaborationTaskToolNotice.hidden = !hasLegacyCapability;
    if (collaborationTaskToolDisclosure) collaborationTaskToolDisclosure.hidden = !hasLegacyCapability;
    if (legacyTasks || legacyDailyPlan || legacyDailyRecord || legacyMemory) {
      if (legacyTasks) {
        const message = document.createElement("span");
        message.textContent = t("collaboration.legacyTaskToolNotice");
        collaborationTaskToolNotice.append(message);
      }
      if (legacyDailyPlan) {
        const message = document.createElement("span");
        message.textContent = t("collaboration.legacyDailyPlanNotice");
        collaborationTaskToolNotice.append(message);
      }
      if (legacyDailyRecord) {
        const message = document.createElement("span");
        message.textContent = t("collaboration.legacyDailyRecordNotice");
        collaborationTaskToolNotice.append(message);
      }
      if (legacyMemory) {
        const message = document.createElement("span");
        message.textContent = t("collaboration.memoryToolUnavailable");
        collaborationTaskToolNotice.append(message);
      }
    }
  }
  if (!collaborationTaskOperations) return;
  collaborationTaskOperations.replaceChildren();
  if (session?.lastHabitRefresh) appendHabitRefreshReport(collaborationTaskOperations, session.lastHabitRefresh);
  const operations = session?.taskOperations ?? [];
  if (operations.length === 0) {
    if (session?.lastHabitRefresh) return;
    const empty = document.createElement("p");
    empty.className = "collaboration-empty-conversation";
    empty.textContent = t("collaboration.noTaskOperations");
    collaborationTaskOperations.append(empty);
    return;
  }
  for (const operation of operations) {
    const card = document.createElement("article");
    const plan = operation.operation.operation === "saveDailyPlan"
      ? operation.operation
      : null;
    const dailyReview = operation.operation.operation === "saveEveningReview" ||
      operation.operation.operation === "createShortRecord" ||
      operation.operation.operation === "correctShortRecord";
    const habitCompletion = operation.operation.operation === "setLocalHabitCompletion";
    const canonicalRecordOperation = dailyReview || habitCompletion;
    const automaticPlan = operation.automaticPlan && plan !== null;
    card.className = [
      "collaboration-task-operation",
      plan ? "collaboration-daily-plan-operation" : "",
      dailyReview ? "collaboration-daily-record-operation" : "",
      habitCompletion ? "collaboration-habit-operation" : "",
      automaticPlan ? "collaboration-automatic-plan-operation" : "",
    ].filter(Boolean).join(" ");
    card.dataset.state = operation.status;
    if (automaticPlan) card.dataset.automaticPlan = "true";
    const heading = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = t(
      automaticPlan
        ? "collaboration.automaticPlanCardTitle"
        : plan
          ? "collaboration.dailyPlanProposal"
          : dailyReview
            ? "collaboration.dailyRecordProposal"
            : habitCompletion
              ? "collaboration.habitCompletionProposal"
              : "collaboration.taskProposal",
    );
    const status = document.createElement("span");
    status.className = "collaboration-task-operation-status";
    setCopy(status, `collaboration.taskOperationStatus.${operation.status === "awaitingApproval" && operation.executionAttempted ? "unknown" : operation.status}` as InterfaceCopyKey);
    heading.append(title, status);
    const target = document.createElement("small");
    target.textContent = t(plan
      ? "collaboration.dailyPlanTargetDate"
      : canonicalRecordOperation
        ? "collaboration.dailyRecordTargetDate"
        : "collaboration.taskOperationTargetDate", {
      date: collaborationDateLabel(operation.targetDate),
    });
    const proposed = document.createElement("p");
    proposed.className = "collaboration-task-operation-proposal";
    proposed.textContent = t("collaboration.taskOperationProposed", {
      action: collaborationTaskOperationText(operation.operation, operation.baseline),
    });
    card.append(heading, target, proposed);
    if (plan) {
      if (operation.baseline.kind === "dailyRecord") {
        appendDailyRecordSnapshot(card, operation.baseline, "collaboration.dailyPlanBaselineSnapshot");
      }
      appendDailyPlanBlockList(card, "collaboration.dailyPlanArrangement", plan.arrangement);
      appendDailyPlanEvidence(card, "collaboration.dailyPlanEvidence", plan.evidence);
      appendDailyPlanMetadata(card, plan);
    } else if (operation.baseline.kind === "dailyReview") {
      appendDailyReviewSnapshot(card, operation.baseline, "collaboration.dailyReviewBaselineSnapshot");
    } else if (operation.baseline.kind === "shortRecord") {
      appendShortRecordSnapshot(card, operation.baseline, "collaboration.shortRecordBaselineSnapshot");
    } else if (operation.baseline.kind === "habitCompletion") {
      appendHabitCompletionSnapshot(card, operation.baseline, "collaboration.habitCompletionBaselineSnapshot");
    } else {
      const baseline = document.createElement("p");
      baseline.textContent = collaborationTaskBaselineText(operation.baseline);
      card.append(baseline);
    }
    if (operation.operation.operation === "archiveList") {
      const note = document.createElement("small");
      note.textContent = t("collaboration.taskArchiveSemantics");
      card.append(note);
    }
    if (operation.resultMessage) {
      const result = document.createElement("p");
      result.className = "collaboration-task-operation-result";
      result.textContent = operation.status === "applied"
        ? plan
          ? automaticPlan
            ? localizeCollaborationDiagnostic(operation.resultMessage ?? t("collaboration.automaticPlanResultLabel"), currentInterfaceLanguage)
            : t("collaboration.dailyPlanResultSaved")
          : dailyReview || habitCompletion
            ? localizeCollaborationDiagnostic(operation.resultMessage, currentInterfaceLanguage)
            : t("collaboration.taskResultSaved")
        : localizeCollaborationDiagnostic(operation.resultMessage, currentInterfaceLanguage);
      card.append(result);
    }
    const actionError = collaborationTaskActionErrors.get(operation.id);
    if (actionError) {
      const error = document.createElement("p");
      error.className = "collaboration-task-operation-error";
      error.setAttribute("role", "alert");
      error.textContent = actionError.includes("was saved")
        ? t(plan
          ? "collaboration.dailyPlanWriteNeedsCheck"
          : canonicalRecordOperation
            ? "collaboration.dailyRecordWriteNeedsCheck"
            : "collaboration.taskWriteNeedsCheck")
        : localizeCollaborationDiagnostic(actionError, currentInterfaceLanguage);
      card.append(error);
    }
    const projectionWarning = collaborationTaskProjectionWarnings.get(operation.id);
    if (projectionWarning) {
      const warning = document.createElement("p");
      warning.className = "collaboration-task-operation-error";
      warning.setAttribute("role", "status");
      warning.textContent = t("collaboration.operationProjectionRefreshWarning", {
        projections: projectionWarning,
      });
      card.append(warning);
    }
    if (operation.resultSnapshot) {
      if (plan && operation.resultSnapshot.kind === "dailyRecord") {
        appendDailyRecordSnapshot(card, operation.resultSnapshot, "collaboration.dailyPlanSavedSnapshot");
      } else if (operation.resultSnapshot.kind === "dailyReview") {
        appendDailyReviewSnapshot(card, operation.resultSnapshot, "collaboration.dailyReviewSavedSnapshot");
      } else if (operation.resultSnapshot.kind === "shortRecord") {
        appendShortRecordSnapshot(card, operation.resultSnapshot, "collaboration.shortRecordSavedSnapshot");
      } else if (operation.resultSnapshot.kind === "habitCompletion") {
        appendHabitCompletionSnapshot(card, operation.resultSnapshot, "collaboration.habitCompletionSavedSnapshot");
      } else {
        const saved = document.createElement("p");
        saved.className = "collaboration-task-operation-snapshot";
        saved.textContent = t("collaboration.taskSavedValue", {
          value: collaborationTaskBaselineText(operation.resultSnapshot),
        });
        card.append(saved);
      }
    }
    const actions = document.createElement("div");
    actions.className = "collaboration-task-operation-actions";
    const pending = pendingCollaborationTaskOperationIds.has(operation.id);
    const addAction = (
      action: "approve" | "reject" | "refresh" | "reconcile",
      copy: InterfaceCopyKey,
    ): void => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action === "approve"
        ? "collaboration-task-operation-approve"
        : "secondary-button";
      setCopy(button, copy);
      button.disabled = pending;
      button.addEventListener("click", () => {
        void runCollaborationTaskOperationAction(session!.id, operation.id, action);
      });
      actions.append(button);
    };
    if (operation.status === "awaitingApproval") {
      if (operation.executionAttempted || actionError?.includes("was saved")) {
        addAction("reconcile", "collaboration.taskCheckResult");
      } else {
        addAction("approve", "collaboration.taskApprove");
        addAction("reject", "collaboration.taskDismiss");
        addAction("reconcile", "collaboration.taskCheckResult");
      }
    } else if (operation.status === "conflict" || operation.status === "failed") {
      addAction("reconcile", "collaboration.taskCheckResult");
      addAction("refresh", "collaboration.taskRefreshReview");
      addAction("reject", "collaboration.taskDismiss");
    } else if (operation.status === "applied" && (plan || dailyReview)) {
      const openToday = document.createElement("button");
      openToday.type = "button";
      openToday.className = "secondary-button";
      setCopy(openToday, plan ? "collaboration.openDailyPlanToday" : "collaboration.openDailyRecordToday");
      openToday.addEventListener("click", () => {
        rememberDailyPlanReturnTarget(session);
        showWorkspaceDestination("today", true, operation.targetDate);
        showTodayPhase(plan && ["initialPlan", "morningCalibration", "morningBaselineCorrection"].includes(plan.transition)
          ? "morning" : operation.operation.operation === "saveEveningReview" ? "evening" : "daytime");
      });
      const openCalendar = document.createElement("button");
      openCalendar.type = "button";
      openCalendar.className = "secondary-button";
      setCopy(openCalendar, plan ? "collaboration.openDailyPlanCalendar" : "collaboration.openDailyRecordCalendar");
      openCalendar.addEventListener("click", () => {
        rememberDailyPlanReturnTarget(session);
        selectedCalendarDate = operation.targetDate;
        showWorkspaceDestination("calendar", true);
      });
      actions.append(openToday, openCalendar);
    } else if (operation.status === "applied" && habitCompletion) {
      const openHabits = document.createElement("button");
      openHabits.type = "button";
      openHabits.className = "secondary-button";
      setCopy(openHabits, "collaboration.openHabitDate");
      openHabits.addEventListener("click", () => {
        if (operation.operation.operation !== "setLocalHabitCompletion") return;
        rememberDailyPlanReturnTarget(session);
        selectedHabitCell = { habitKey: operation.operation.habitKey, date: operation.targetDate };
        showWorkspaceDestination("habits", true);
      });
      actions.append(openHabits);
    } else if (operation.status === "applied" && operation.operation.operation === "correctShortRecord" && operation.baseline.kind === "shortRecord" && operation.baseline.category === "exercise") {
      const openHabits = document.createElement("button");
      openHabits.type = "button";
      openHabits.className = "secondary-button";
      setCopy(openHabits, "collaboration.openHabitDate");
      openHabits.addEventListener("click", () => {
        rememberDailyPlanReturnTarget(session);
        selectedHabitCell = { habitKey: "exercise", date: operation.targetDate };
        showWorkspaceDestination("habits", true);
      });
      actions.append(openHabits);
    } else if (operation.status === "applied" && operation.taskId) {
      const open = document.createElement("button");
      open.type = "button";
      open.className = "secondary-button";
      setCopy(open, "collaboration.openSavedTask");
      open.addEventListener("click", () => {
        taskReturnToCollaborationSessionId = session?.id ?? null;
        taskFocusRequestId = operation.taskId;
        taskScope = "all";
        taskStateScope = operation.resultSnapshot?.kind === "task" && operation.resultSnapshot.deletedAt
          ? "deleted"
          : "all";
        showWorkspaceDestination("tasks", true);
      });
      actions.append(open);
    }
    card.append(actions);
    collaborationTaskOperations.append(card);
  }
}

function collaborationMemorySourceStateLabel(state: string): string {
  switch (state) {
    case "ready": return t("collaboration.memorySourceReady");
    case "missing": return t("collaboration.memorySourceMissing");
    case "unconfigured": return t("collaboration.memorySourceUnconfigured");
    default: return t("collaboration.memorySourceError");
  }
}

function collaborationMemoryStateLabel(state: string): string {
  const key = `collaboration.memoryState.${state}` as InterfaceCopyKey;
  return t(key);
}

function renderMemorySessionLink(
  parent: HTMLElement,
  sessionId: string,
  activityDate: string,
): void {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "text-button";
  setCopy(button, "collaboration.memoryOpenSession");
  button.addEventListener("click", () => {
    void openCollaborationSessionFromMemory(sessionId, activityDate);
  });
  parent.append(button);
}

function renderCollaborationMemory(
  memory: CollaborationMemoryView | null,
  session: CollaborationSessionView | null,
): void {
  if (!memory) {
    setRawText(collaborationMemoryStatus, "");
    setRawText(collaborationLongTermSource, "");
    setRawText(collaborationLongTermMessage, "");
    setRawText(collaborationRoutineReferenceMessage, "");
    setRawText(collaborationContinuityExpiry, "");
    if (collaborationRoutineReferenceContent) collaborationRoutineReferenceContent.textContent = "";
    collaborationRecentMemoryList?.replaceChildren();
    collaborationOpenMattersList?.replaceChildren();
    collaborationMemoryProposals?.replaceChildren();
    if (collaborationLongTermSaveButton) collaborationLongTermSaveButton.disabled = true;
    if (collaborationContinuitySaveButton) collaborationContinuitySaveButton.disabled = true;
    return;
  }
  if (session?.memoryProposals.some((proposal) =>
    ["awaitingApproval", "failed", "conflict"].includes(proposal.status)
  )) {
    if (collaborationMemoryPanel) collaborationMemoryPanel.open = true;
  }
  const binding = memory.vaultBinding;
  if (binding) {
    const longTermDraft = collaborationLongTermDrafts.get(binding);
    if (collaborationLongTermContent) {
      const currentBinding = collaborationLongTermContent.dataset.vaultBinding;
      if (currentBinding !== binding || document.activeElement !== collaborationLongTermContent) {
        collaborationLongTermContent.value = longTermDraft?.text ?? memory.longTerm.content;
        collaborationLongTermContent.dataset.vaultBinding = binding;
        collaborationLongTermContent.dataset.sourceRevision =
          longTermDraft?.revision ?? memory.longTerm.revision ?? "";
      }
      collaborationLongTermContent.disabled = memory.longTerm.state !== "ready" || !memory.longTerm.revision;
    }
    const continuityDraft = collaborationContinuityDrafts.get(binding);
    if (collaborationContinuityNote) {
      const currentBinding = collaborationContinuityNote.dataset.vaultBinding;
      if (currentBinding !== binding || document.activeElement !== collaborationContinuityNote) {
        collaborationContinuityNote.value = continuityDraft?.text ?? memory.correctionNote;
        collaborationContinuityNote.dataset.vaultBinding = binding;
        collaborationContinuityNote.dataset.sourceRevision = String(
          continuityDraft?.revision ?? memory.correctionRevision,
        );
      }
      collaborationContinuityNote.disabled = false;
    }
  } else {
    if (collaborationLongTermContent) {
      collaborationLongTermContent.value = "";
      collaborationLongTermContent.disabled = true;
      delete collaborationLongTermContent.dataset.vaultBinding;
      delete collaborationLongTermContent.dataset.sourceRevision;
    }
    if (collaborationContinuityNote) {
      collaborationContinuityNote.value = "";
      collaborationContinuityNote.disabled = true;
      delete collaborationContinuityNote.dataset.vaultBinding;
      delete collaborationContinuityNote.dataset.sourceRevision;
    }
  }
  const longTermDraft = binding ? collaborationLongTermDrafts.get(binding) : undefined;
  if (collaborationLongTermSaveButton) {
    collaborationLongTermSaveButton.disabled = !binding ||
      memory.longTerm.state !== "ready" || !longTermDraft ||
      pendingCollaborationMemoryProposalIds.has("long-term-editor");
  }
  const continuityDraft = binding ? collaborationContinuityDrafts.get(binding) : undefined;
  if (collaborationContinuitySaveButton) {
    collaborationContinuitySaveButton.disabled = !binding || !continuityDraft ||
      pendingCollaborationMemoryProposalIds.has("continuity-editor");
  }
  if (collaborationLongTermSource) {
    setRawText(
      collaborationLongTermSource,
      t("collaboration.longTermSource", { path: memory.longTerm.sourcePath }),
    );
  }
  if (collaborationLongTermMessage) {
    const state = collaborationMemorySourceStateLabel(memory.longTerm.state);
    const message = memory.longTerm.state === "missing"
      ? t("collaboration.longTermMissing")
      : memory.longTerm.message;
    setRawText(collaborationLongTermMessage, `${state} · ${message}`);
  }
  setRawText(
    collaborationMemoryStatus,
    memory.vaultBinding
      ? `${collaborationMemorySourceStateLabel(memory.longTerm.state)} · ${memory.generatedAt}`
      : t("collaboration.chooseVault"),
  );
  if (collaborationRoutineReferenceMessage) {
    setRawText(
      collaborationRoutineReferenceMessage,
      `${collaborationMemorySourceStateLabel(memory.routineReference.state)} · ${memory.routineReference.message}`,
    );
  }
  if (collaborationRoutineReferenceContent) {
    collaborationRoutineReferenceContent.textContent = memory.routineReference.content;
  }
  setRawText(
    collaborationContinuityExpiry,
    memory.correctionNoteExpiresOn
      ? t("collaboration.continuityNoteExpiry", {
        date: collaborationDateLabel(memory.correctionNoteExpiresOn),
      })
      : "",
  );

  if (collaborationRecentMemoryList) {
    collaborationRecentMemoryList.replaceChildren();
    if (memory.recent.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = t("collaboration.recentMemoryEmpty");
      collaborationRecentMemoryList.append(empty);
    }
    for (const entry of memory.recent) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `${collaborationDateLabel(entry.activityDate)} · ${entry.sessionTitle || t("collaboration.untitledSession")}`;
      const summary = document.createElement("span");
      summary.textContent = entry.summary;
      const expiry = document.createElement("small");
      setRawText(expiry, t("collaboration.memoryExpires", { date: collaborationDateLabel(entry.expiresOn) }));
      item.append(title, summary, expiry);
      renderMemorySessionLink(item, entry.sessionId, entry.activityDate);
      collaborationRecentMemoryList.append(item);
    }
  }
  if (collaborationOpenMattersList) {
    collaborationOpenMattersList.replaceChildren();
    if (memory.openMatters.length === 0) {
      const empty = document.createElement("li");
      empty.textContent = t("collaboration.openMattersEmpty");
      collaborationOpenMattersList.append(empty);
    }
    for (const matter of memory.openMatters) {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `${collaborationDateLabel(matter.activityDate)} · ${collaborationMemoryStateLabel(matter.state)}`;
      const summary = document.createElement("span");
      summary.textContent = matter.summary;
      item.append(title, summary);
      renderMemorySessionLink(item, matter.sessionId, matter.activityDate);
      collaborationOpenMattersList.append(item);
    }
  }
  renderCollaborationMemoryProposals(session);
}

function renderCollaborationMemoryProposals(session: CollaborationSessionView | null): void {
  if (!collaborationMemoryProposals) return;
  collaborationMemoryProposals.replaceChildren();
  const proposals = session?.memoryProposals ?? [];
  if (proposals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "collaboration-empty-conversation";
    empty.textContent = t("collaboration.memoryProposalEmpty");
    collaborationMemoryProposals.append(empty);
    return;
  }
  for (const proposal of proposals) {
    const card = document.createElement("article");
    card.className = "collaboration-memory-proposal";
    card.dataset.state = proposal.status;
    const heading = document.createElement("strong");
    heading.textContent = t("collaboration.memoryProposalTitle");
    const status = document.createElement("small");
    status.textContent = t(`collaboration.memoryProposalStatus.${proposal.status === "awaitingApproval" && proposal.executionAttempted ? "unknown" : proposal.status}` as InterfaceCopyKey);
    const date = document.createElement("small");
    date.textContent = t("collaboration.memoryProposalDate", {
      date: collaborationDateLabel(proposal.createdAt.slice(0, 10)),
    });
    const basis = document.createElement("small");
    basis.textContent = t(proposal.basis === "confirmedInference"
      ? "collaboration.memoryProposalConfirmed"
      : "collaboration.memoryProposalExplicit");
    const quoteLabel = document.createElement("small");
    quoteLabel.textContent = t("collaboration.memoryProposalQuote");
    const quote = document.createElement("blockquote");
    quote.textContent = proposal.authorizationQuote;
    const changeLabel = document.createElement("small");
    changeLabel.textContent = t("collaboration.memoryProposalChange");
    const change = document.createElement("p");
    change.textContent = proposal.change;
    card.append(heading, status, date, basis, quoteLabel, quote, changeLabel, change);
    if (proposal.replaces) {
      const replacesLabel = document.createElement("small");
      replacesLabel.textContent = t("collaboration.memoryProposalReplaces");
      const replaces = document.createElement("blockquote");
      replaces.textContent = proposal.replaces;
      card.append(replacesLabel, replaces);
    }
    if (proposal.resultMessage) {
      const result = document.createElement("p");
      result.textContent = proposal.status === "applied"
        ? t("collaboration.memoryProposalApplied")
        : localizeCollaborationDiagnostic(proposal.resultMessage, currentInterfaceLanguage);
      card.append(result);
    }
    const errorMessage = collaborationMemoryProposalErrors.get(proposal.id);
    if (errorMessage) {
      const error = document.createElement("p");
      error.setAttribute("role", "alert");
      error.textContent = localizeCollaborationDiagnostic(errorMessage, currentInterfaceLanguage);
      card.append(error);
    }
    if (session && proposal.status === "awaitingApproval" && !proposal.executionAttempted) {
      const actions = document.createElement("div");
      actions.className = "collaboration-memory-actions";
      for (const [action, label] of [
        ["approve", "collaboration.memoryProposalApprove"],
        ["reject", "collaboration.memoryProposalDismiss"],
      ] as const) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action === "approve" ? "collaboration-task-operation-approve" : "secondary-button";
        setCopy(button, label);
        button.disabled = pendingCollaborationMemoryProposalIds.has(proposal.id);
        button.addEventListener("click", () => {
          void runCollaborationMemoryProposalAction(session.id, proposal.id, action);
        });
        actions.append(button);
      }
      card.append(actions);
    }
    collaborationMemoryProposals.append(card);
  }
}

async function openCollaborationSessionFromMemory(
  sessionId: string,
  activityDate: string,
): Promise<void> {
  collaborationActivityDate = activityDate;
  collaborationActivityDateExplicit = true;
  if (collaborationDateInput) collaborationDateInput.value = activityDate;
  await refreshCollaborationWorkspace();
  if (currentCollaborationSession?.id === sessionId) return;
  try {
    const session = await window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_session",
      { sessionId },
    );
    currentCollaborationSession = session;
    cacheCollaborationDrafts(session);
    collaborationTargetDate = collaborationTargetDates.get(session.id) ?? session.targetDate;
    collaborationTargetDates.set(session.id, collaborationTargetDate);
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = collaborationTargetDate;
    renderCollaborationWorkspace();
    void refreshCollaborationContext();
    watchCollaborationSession(session);
  } catch (error) {
    setRawText(collaborationMemoryStatus, String(error));
  }
}

async function runCollaborationMemoryProposalAction(
  sessionId: string,
  proposalId: string,
  action: "approve" | "reject",
): Promise<void> {
  if (pendingCollaborationMemoryProposalIds.has(proposalId)) return;
  pendingCollaborationMemoryProposalIds.add(proposalId);
  renderCollaborationWorkspace();
  const command = action === "approve"
    ? "collaboration_approve_memory_proposal"
    : "collaboration_reject_memory_proposal";
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationSessionView>(command, {
      sessionId,
      proposalId,
    });
    collaborationMemoryProposalErrors.delete(proposalId);
    if (currentCollaborationSession?.id === sessionId) currentCollaborationSession = updated;
    await refreshCollaborationWorkspace();
  } catch (error) {
    collaborationMemoryProposalErrors.set(proposalId, String(error));
    if (currentCollaborationSession?.id === sessionId) {
      try {
        currentCollaborationSession = await window.__TAURI__.core.invoke<CollaborationSessionView>(
          "collaboration_session",
          { sessionId },
        );
      } catch {
        // Keep the last saved proposal visible if history cannot be refreshed.
      }
    }
  } finally {
    pendingCollaborationMemoryProposalIds.delete(proposalId);
    renderCollaborationWorkspace();
  }
}

async function saveCollaborationLongTermMemory(): Promise<void> {
  const memory = currentCollaborationWorkspace?.memory;
  const binding = memory?.vaultBinding;
  const draft = binding ? collaborationLongTermDrafts.get(binding) : undefined;
  if (!memory || !binding || !draft) return;
  pendingCollaborationMemoryProposalIds.add("long-term-editor");
  if (collaborationLongTermContent) collaborationLongTermContent.disabled = true;
  renderCollaborationWorkspace();
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationMemoryView>(
      "collaboration_save_long_term_memory",
      { expectedVaultBinding: binding, expectedRevision: draft.revision, content: draft.text },
    );
    if (currentCollaborationWorkspace?.memory.vaultBinding === binding) {
      collaborationLongTermDrafts.delete(binding);
      currentCollaborationWorkspace = { ...currentCollaborationWorkspace, memory: updated };
      if (collaborationLongTermMessage) setCopy(collaborationLongTermMessage, "collaboration.longTermSaved");
    }
  } catch (error) {
    if (collaborationLongTermMessage) {
      setCopyError(collaborationLongTermMessage, "collaboration.longTermSaveFailed", error);
    }
  } finally {
    pendingCollaborationMemoryProposalIds.delete("long-term-editor");
    renderCollaborationWorkspace();
  }
}

async function reloadCollaborationLongTermMemory(): Promise<void> {
  const binding = currentCollaborationWorkspace?.memory.vaultBinding;
  if (!binding) return;
  collaborationLongTermDrafts.delete(binding);
  await refreshCollaborationWorkspace();
}

async function saveCollaborationContinuityNote(): Promise<void> {
  const memory = currentCollaborationWorkspace?.memory;
  const binding = memory?.vaultBinding;
  const draft = binding ? collaborationContinuityDrafts.get(binding) : undefined;
  if (!memory || !binding || !draft) return;
  pendingCollaborationMemoryProposalIds.add("continuity-editor");
  if (collaborationContinuityNote) collaborationContinuityNote.disabled = true;
  renderCollaborationWorkspace();
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationMemoryView>(
      "collaboration_save_continuity_note",
      { expectedVaultBinding: binding, expectedRevision: draft.revision, note: draft.text },
    );
    if (currentCollaborationWorkspace?.memory.vaultBinding === binding) {
      collaborationContinuityDrafts.delete(binding);
      currentCollaborationWorkspace = { ...currentCollaborationWorkspace, memory: updated };
      if (collaborationMemoryStatus) setCopy(collaborationMemoryStatus, "collaboration.continuityNoteSaved");
    }
  } catch (error) {
    if (collaborationMemoryStatus) {
      setCopyError(collaborationMemoryStatus, "collaboration.continuityNoteSaveFailed", error);
    }
  } finally {
    pendingCollaborationMemoryProposalIds.delete("continuity-editor");
    renderCollaborationWorkspace();
  }
}

function renderCollaborationWorkspace(): void {
  const workspace = currentCollaborationWorkspace;
  if (workspace) {
    if (collaborationDateInput) collaborationDateInput.value = collaborationActivityDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = collaborationTargetDate;
    setRawText(
      collaborationVaultLabel,
      workspace.context.vaultName
        ? t("collaboration.currentVault", { name: workspace.context.vaultName })
        : t("collaboration.chooseVault"),
    );
    renderCollaborationContextPane("dailyRecord", workspace.context.dailyRecord);
    renderCollaborationContextPane("tasks", workspace.context.tasks);
    renderCollaborationContextPane("habits", workspace.context.habits);
    const sessions = [...workspace.sessions];
    if (currentCollaborationSession) {
      const existing = sessions.findIndex((session) => session.id === currentCollaborationSession?.id);
      if (existing >= 0) sessions[existing] = currentCollaborationSession;
    }
    renderCollaborationSessionList(sessions);
    if (workspace.recoveryRequired && !workspace.activeRun) {
      setRawText(collaborationWorkOwner, "");
      collaborationWorkOwner?.removeAttribute("data-state");
    } else if (workspace.activeRun) {
      setRawText(
        collaborationWorkOwner,
        t("collaboration.workOwner", {
          session: workspace.activeRun.sessionTitle || t("collaboration.untitledSession"),
          vault: workspace.vaultName ?? t("collaboration.chooseVault"),
          state: collaborationRunStateLabel(workspace.activeRun.runState),
        }),
      );
      if (collaborationWorkOwner) collaborationWorkOwner.dataset.state = "active";
    } else {
      setRawText(collaborationWorkOwner, "");
      collaborationWorkOwner?.removeAttribute("data-state");
    }
  } else {
    setRawText(collaborationWorkOwner, "");
    collaborationWorkOwner?.removeAttribute("data-state");
  }

  const session = currentCollaborationSession;
  if (collaborationChatHeading) {
    setRawText(
      collaborationChatHeading,
      session?.title || (session ? t("collaboration.untitledSession") : t("collaboration.noSession")),
    );
  }
  if (collaborationChatDate) {
    setRawText(
      collaborationChatDate,
      session
        ? `${t("collaboration.targetDateLabel")}: ${collaborationDateLabel(collaborationTargetDate)}`
        : "",
    );
  }
  setRawText(collaborationComposerDate, collaborationTargetDate
    ? `${t("collaboration.targetDateLabel")}: ${collaborationDateLabel(collaborationTargetDate)}`
    : "");
  if (collaborationRunStatus) {
    if (!session) {
      setRawText(collaborationRunStatus, "");
      collaborationRunStatus.dataset.state = "waiting";
    } else {
      setRawText(collaborationRunStatus, collaborationRunProgressLabel(session));
      collaborationRunStatus.dataset.state = session.runState;
    }
  }
  renderCollaborationMessages(session);
  renderCollaborationTaskOperations(session);
  renderCollaborationMemory(workspace?.memory ?? null, session);

  const connected = currentCollaborationConnection?.authenticated === true &&
    currentCollaborationConnection.authMode === "chatgpt" &&
    currentCollaborationConnection.readOnlyTextTurnsAvailable;
  const vaultAvailable = Boolean(workspace?.context.vaultName);
  const recoveryBlocked = Boolean(workspace?.recoveryRequired);
  if (collaborationRecoveryDetails) collaborationRecoveryDetails.hidden = !recoveryBlocked;
  const targetDate = session
    ? collaborationTargetDates.get(session.id) ?? (collaborationTargetDateInput?.value || collaborationTargetDate)
    : "";
  const reviewNotice = document.querySelector<HTMLElement>("#collaboration-review-entry-notice");
  if (reviewNotice) reviewNotice.hidden = reviewNotice.dataset.dismissed === "true" || !session || reviewNotice.dataset.sessionId !== session.id || reviewNotice.dataset.targetDate !== targetDate || !collaborationDraftForDate(session, targetDate);
  const targetKey = session ? collaborationDraftKey(session.id, targetDate) : "";
  const targetDatePending = Boolean(session && collaborationTargetDatePendingSession === session.id);
  const sendingDraft = targetKey !== "" && collaborationSendingDrafts.has(targetKey);
  const composerBusy = targetDatePending || sendingDraft || vaultSelectionInProgress ||
    collaborationSessionCreationPromise !== null;
  if (collaborationMessageDraft) {
    collaborationMessageDraft.disabled = composerBusy;
    if (collaborationMessageDraft.disabled || document.activeElement !== collaborationMessageDraft) {
      collaborationCommandCompletion?.close();
    }
    if (session && document.activeElement !== collaborationMessageDraft) {
      collaborationMessageDraft.value = collaborationDraftForDate(session, targetDate);
    } else if (!session && document.activeElement !== collaborationMessageDraft) {
      collaborationMessageDraft.value = collaborationEmptyDraft;
    }
  }
  if (collaborationSendButton) {
    collaborationSendButton.disabled = !connected || !vaultAvailable || composerBusy ||
      collaborationVoiceController.state !== "idle" ||
      !(collaborationMessageDraft?.value.trim());
  }
  let composerStatus: InterfaceCopyKey | null = null;
  if (!vaultAvailable) {
    composerStatus = "collaboration.composerSelectVault";
  } else if (recoveryBlocked) {
    composerStatus = null;
  } else if (collaborationSessionCreationError) {
    if (collaborationComposerStatus) {
      collaborationComposerStatus.hidden = false;
      setCopyError(collaborationComposerStatus, "collaboration.sessionCreateFailed", collaborationSessionCreationError);
    }
  } else if (collaborationSessionCreationPromise) {
    composerStatus = "collaboration.composerCreatingSession";
  } else if (!connected) {
    composerStatus = "collaboration.composerConnect";
  } else if (!session) {
    composerStatus = "collaboration.composerNewSession";
  } else if (targetDatePending) {
    composerStatus = "collaboration.composerSavingDate";
  } else if (sendingDraft) {
    composerStatus = "collaboration.composerSending";
  }
  if (collaborationComposerStatus && !collaborationSessionCreationError) {
    collaborationComposerStatus.hidden = composerStatus === null;
    if (composerStatus) {
      setCopy(collaborationComposerStatus, composerStatus);
    } else {
      setRawText(collaborationComposerStatus, "");
    }
  }
  if (collaborationStopButton) {
    const stoppable = Boolean(
      session?.runId && ["queued", "reading", "thinking"].includes(session.runState),
    );
    collaborationStopButton.hidden = !stoppable;
    collaborationStopButton.disabled = session?.runState === "stopping";
  }
  const createButton = document.querySelector<HTMLButtonElement>("#collaboration-new-session");
  if (createButton) {
    createButton.disabled = !vaultAvailable || vaultSelectionInProgress ||
      collaborationSessionCreationPromise !== null;
    setCopy(createButton, collaborationSessionCreationAttempt && !collaborationSessionCreationPromise
      ? "collaboration.retrySessionCreate"
      : "collaboration.newSession");
  }
  const activityDateBusy = collaborationSessionCreationAttempt !== null ||
    collaborationSessionCreationPromise !== null || vaultSelectionInProgress;
  if (collaborationDateInput) {
    collaborationDateInput.disabled = activityDateBusy;
  }
  for (const selector of [
    "#collaboration-date-previous",
    "#collaboration-date-next",
    "#collaboration-date-today",
  ]) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) button.disabled = activityDateBusy;
  }
  if (collaborationTargetDateInput) collaborationTargetDateInput.disabled = vaultSelectionInProgress || targetDatePending ||
    collaborationSessionCreationPromise !== null || collaborationSessionCreationAttempt !== null;
  renderCollaborationVoiceControls();
}

function stashCollaborationDraft(forVaultSwitch = false): void {
  if (vaultSelectionInProgress && !forVaultSwitch) return;
  if (!currentCollaborationSession && collaborationMessageDraft) {
    collaborationEmptyDraft = collaborationMessageDraft.value;
    if (collaborationSessionCreationAttempt) {
      collaborationSessionCreationAttempt.latestDraft = collaborationEmptyDraft;
    }
    collaborationEmptyComposerActive = true;
    return;
  }
  if (currentCollaborationSession && collaborationMessageDraft) {
    const sessionId = currentCollaborationSession.id;
    const targetDate = collaborationTargetDates.get(sessionId) ?? collaborationTargetDate;
    const key = collaborationDraftKey(sessionId, targetDate);
    collaborationDrafts.set(key, collaborationMessageDraft.value);
    if (!collaborationMessageDraft.value) {
      collaborationIncompleteVoiceDrafts.delete(key);
      collaborationVoiceStatuses.delete(key);
    }
    collaborationUnsavedDrafts.add(key);
    const previousTimer = collaborationDraftSaveTimers.get(key);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    const draft = collaborationMessageDraft.value;
    let timer = 0;
    timer = window.setTimeout(() => {
      if (collaborationDraftSaveTimers.get(key) === timer) {
        collaborationDraftSaveTimers.delete(key);
      }
      void saveCollaborationDraft({ sessionId, targetDate }, draft).catch((error: unknown) => {
        if (currentCollaborationSession?.id === sessionId && collaborationRunStatus) {
          setCopyError(collaborationRunStatus, "collaboration.draftSaveFailed", error);
          collaborationRunStatus.dataset.state = "error";
        }
      });
    }, 300);
    collaborationDraftSaveTimers.set(key, timer);
  }
}

function flushCollaborationDraft(
  target?: CollaborationVoiceTarget,
  draftOverride?: string,
): Promise<CollaborationSessionView | void> {
  const session = currentCollaborationSession;
  if (!target && (vaultSelectionInProgress || !session || !collaborationMessageDraft)) return Promise.resolve();
  const saveTarget = target ?? {
    sessionId: session!.id,
    targetDate: collaborationTargetDates.get(session!.id) ?? collaborationTargetDate,
  };
  const key = collaborationDraftKey(saveTarget.sessionId, saveTarget.targetDate);
  const timer = collaborationDraftSaveTimers.get(key);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    collaborationDraftSaveTimers.delete(key);
  }
  const draft = draftOverride ?? collaborationMessageDraft?.value ?? "";
  collaborationDrafts.set(key, draft);
  return saveCollaborationDraft(saveTarget, draft);
}

function saveCollaborationDraft(
  target: { sessionId: string; targetDate: string },
  draft: string,
): Promise<CollaborationSessionView> {
  const { sessionId, targetDate } = target;
  const key = collaborationDraftKey(sessionId, targetDate);
  collaborationDrafts.set(key, draft);
  collaborationUnsavedDrafts.add(key);
  const write = enqueueCollaborationDraftWrite(
    collaborationDraftWrites,
    target,
    () => window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_save_draft",
      { sessionId, targetDate, draft },
    ),
  ).then((saved) => {
    // A response acknowledges its queued snapshot, not edits made since it
    // was sent. Equal text can still be an older A in an A → B → A queue;
    // release protection only after queued and debounced writes settle.
    if (collaborationDrafts.get(key) === draft &&
      !collaborationDraftWrites.has(key) && !collaborationDraftSaveTimers.has(key)) {
      collaborationUnsavedDrafts.delete(key);
    }
    cacheCollaborationDrafts(saved, true);
    if (currentCollaborationSession?.id === sessionId) {
      currentCollaborationSession = saved;
      renderCollaborationWorkspace();
    }
    return saved;
  });
  collaborationVaultSwitchDraftWrites?.push(write);
  return write;
}

async function prepareCollaborationForVaultSwitch(): Promise<void> {
  // These transactions own their eventual updates. Do not stash a debounce
  // that could restore submitted text or move a half-changed date's draft.
  if (collaborationSendingDrafts.size || collaborationTargetDatePendingSession) {
    collaborationVoiceController.navigate();
    throw new Error("collaboration-write-pending");
  }
  // Snapshot visible edits before Stop's state callback rerenders the editor.
  stashCollaborationDraft(true);
  const finishing = collaborationVoiceController.settleForVaultSwitch();
  renderCollaborationWorkspace();
  await finishing;
  await drainCollaborationDraftsForVaultSwitch();
}

async function drainCollaborationDraftsForVaultSwitch(): Promise<void> {
  // One observer belongs to the whole Vault selection, including unrelated
  // pending-write waits. Rejections survive removal from the normal queue.
  const observed = collaborationVaultSwitchDraftWrites!;
  while (true) {
    const results = await Promise.allSettled(observed.splice(0));
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
    if (observed.length) continue;
    const keys = new Set([...collaborationUnsavedDrafts, ...collaborationDraftSaveTimers.keys()]);
    if (!keys.size && !collaborationDraftWrites.size) return;
    observed.push(...collaborationDraftWrites.values());
    for (const key of keys) {
      const draft = collaborationDrafts.get(key);
      // Never manufacture an empty origin after navigation or a cache reset.
      if (draft === undefined) throw new Error("collaboration-draft-unavailable");
      const [sessionId, targetDate] = key.split("\u0000");
      flushCollaborationDraft({sessionId, targetDate}, draft);
    }
  }
}

function selectCollaborationSession(session: CollaborationSessionView): void {
  if (collaborationSessionCreationPromise) return;
  cancelCollaborationVoiceCaptureForSelectionChange();
  stashCollaborationDraft();
  currentCollaborationSession = session;
  collaborationEmptyComposerActive = false;
  collaborationEmptyTargetDate = null;
  cacheCollaborationDrafts(session);
  collaborationTargetDate = collaborationTargetDates.get(session.id) ?? session.targetDate;
  collaborationTargetDates.set(session.id, collaborationTargetDate);
  if (collaborationTargetDateInput) collaborationTargetDateInput.value = collaborationTargetDate;
  renderCollaborationWorkspace();
  void refreshCollaborationWorkspace();
}

function refreshCollaborationRunOwner(session: CollaborationSessionView): void {
  if (!currentCollaborationWorkspace) return;
  const owner = currentCollaborationWorkspace.activeRun;
  const isRunning = ["reading", "thinking", "stopping"].includes(session.runState);
  const isQueuedOwner = session.runState === "queued" && (!owner || owner.sessionId === session.id);
  if (isRunning || isQueuedOwner) {
    currentCollaborationWorkspace = {
      ...currentCollaborationWorkspace,
      activeRun: {
        sessionId: session.id,
        sessionTitle: session.title,
        runId: session.runId ?? "",
        runState: session.runState,
        progress: session.progress,
      },
    };
  } else if (owner?.sessionId === session.id) {
    currentCollaborationWorkspace = { ...currentCollaborationWorkspace, activeRun: null };
  }
}

async function refreshCollaborationWorkspace(quiet = false): Promise<void> {
  const request = ++collaborationWorkspaceRequest;
  let date = collaborationActivityDate;
  if (!quiet && collaborationSessionsStatus) {
    setCopy(collaborationSessionsStatus, "collaboration.loading");
  }
  try {
    if (!collaborationActivityDateExplicit && (!currentCollaborationSession || !date)) {
      const clock = await window.__TAURI__.core.invoke<TodayClockView>("today_clock");
      if (request !== collaborationWorkspaceRequest) return;
      date = clock.livedDate;
    }
    collaborationActivityDate = date;
    if (collaborationDateInput) collaborationDateInput.value = date;
    const workspace = await window.__TAURI__.core.invoke<CollaborationWorkspaceView>(
      "collaboration_workspace",
      { date },
    );
    if (request !== collaborationWorkspaceRequest) return;
    collaborationActivityDate = date;
    const previousId = currentCollaborationSession?.id;
    const previousTargetDate = collaborationTargetDate;
    let session = workspace.sessions.find((candidate) => candidate.id === previousId) ??
      (collaborationSessionCreationPromise ? collaborationSessionCreationResult : null) ??
      (collaborationEmptyComposerActive ? null : workspace.sessions[0] ?? null);
    const nextTargetDate = session
      ? collaborationTargetDates.get(session.id) ?? session.targetDate
      : collaborationEmptyTargetDate ?? date;
    if (session?.id !== previousId || nextTargetDate !== previousTargetDate) {
      cancelCollaborationVoiceCaptureForSelectionChange();
    }
    if (session?.id !== previousId) {
      stashCollaborationDraft();
    }
    currentCollaborationSession = session;
    if (session) {
      cacheCollaborationDrafts(session);
      collaborationTargetDates.set(session.id, nextTargetDate);
    }
    collaborationTargetDate = nextTargetDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = collaborationTargetDate;
    let context = workspace.context;
    if (collaborationTargetDate !== date) {
      context = await window.__TAURI__.core.invoke<CollaborationContextView>(
        "collaboration_context",
        { date: collaborationTargetDate },
      );
      if (request !== collaborationWorkspaceRequest) return;
    }
    currentCollaborationWorkspace = { ...workspace, context };
    renderCollaborationWorkspace();
    if (session) watchCollaborationSession(session);
  } catch (error) {
    if (request !== collaborationWorkspaceRequest) return;
    if (quiet) return;
    currentCollaborationWorkspace = null;
    if (!collaborationSessionCreationResult) currentCollaborationSession = null;
    if (collaborationSessionsStatus) {
      setCopyError(collaborationSessionsStatus, "collaboration.sessionLoadFailed", error);
    }
    if (collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.contextReadFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
    renderCollaborationWorkspace();
  }
}

async function refreshCollaborationContext(): Promise<void> {
  const request = ++collaborationWorkspaceRequest;
  const date = collaborationTargetDateInput?.value || collaborationTargetDate;
  collaborationTargetDate = date;
  if (collaborationTargetDateInput) collaborationTargetDateInput.value = date;
  try {
    const context = await window.__TAURI__.core.invoke<CollaborationContextView>(
      "collaboration_context",
      { date },
    );
    if (request !== collaborationWorkspaceRequest) return;
    if (currentCollaborationWorkspace) {
      currentCollaborationWorkspace = { ...currentCollaborationWorkspace, context };
    }
    renderCollaborationWorkspace();
  } catch (error) {
    if (request !== collaborationWorkspaceRequest) return;
    const failedPane: CollaborationContextPane = {
      state: "error",
      message: t("collaboration.contextReadFailed", { error: String(error) }),
      items: [],
    };
    if (currentCollaborationWorkspace) {
      currentCollaborationWorkspace = {
        ...currentCollaborationWorkspace,
        context: {
          ...currentCollaborationWorkspace.context,
          date,
          dailyRecord: failedPane,
          tasks: failedPane,
          habits: failedPane,
        },
      };
    }
    renderCollaborationWorkspace();
  }
}

async function saveCollaborationTargetDate(): Promise<void> {
  if (vaultSelectionInProgress || collaborationSessionCreationPromise || collaborationSessionCreationAttempt) return;
  const session = currentCollaborationSession;
  const date = collaborationTargetDateInput?.value || collaborationTargetDate;
  if (!session) {
    collaborationEmptyTargetDate = date;
    collaborationTargetDate = date;
    void refreshCollaborationContext();
    return;
  }
  const previousDate = collaborationTargetDates.get(session.id) ?? session.targetDate;
  const previousTarget = { sessionId: session.id, targetDate: previousDate };
  const previousDraft = collaborationMessageDraft?.value ??
    collaborationDraftForDate(session, previousDate);
  collaborationDrafts.set(
    collaborationDraftKey(session.id, previousDate),
    previousDraft,
  );
  const previousDraftWrite = flushCollaborationDraft(previousTarget, previousDraft);
  collaborationTargetDate = date;
  collaborationTargetDates.set(session.id, date);
  collaborationTargetDatePendingSession = session.id;
  renderCollaborationWorkspace();
  try {
    await previousDraftWrite;
    const saved = await window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_set_target_date",
      { sessionId: session.id, targetDate: date },
    );
    if (currentCollaborationSession?.id !== session.id) return;
    currentCollaborationSession = saved;
    cacheCollaborationDrafts(saved);
    if (collaborationMessageDraft && isCurrentCollaborationVoiceTarget({ sessionId: session.id, targetDate: date })) {
      collaborationMessageDraft.value = collaborationDraftForDate(saved, date);
    }
    void refreshCollaborationContext();
  } catch (error) {
    if (currentCollaborationSession?.id === session.id) {
      collaborationTargetDates.set(session.id, previousDate);
      collaborationTargetDate = previousDate;
      if (collaborationTargetDateInput) collaborationTargetDateInput.value = previousDate;
      if (collaborationMessageDraft) {
        collaborationMessageDraft.value = collaborationDraftForDate(session, previousDate);
      }
      if (collaborationRunStatus) {
        setCopyError(collaborationRunStatus, "collaboration.sessionLoadFailed", error);
        collaborationRunStatus.dataset.state = "error";
      }
    }
  } finally {
    if (collaborationTargetDatePendingSession === session.id) {
      collaborationTargetDatePendingSession = null;
      renderCollaborationWorkspace();
    }
  }
}

async function stopCollaborationRun(): Promise<void> {
  const session = currentCollaborationSession;
  if (!session?.runId || vaultSelectionInProgress) return;
  const vaultRevision = collaborationVaultSelectionRevision;
  if (collaborationStopButton) collaborationStopButton.disabled = true;
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_stop_run",
      { sessionId: session.id, executionId: session.runId },
    );
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision || currentCollaborationSession?.id !== session.id || currentCollaborationSession.runId !== session.runId) return;
    currentCollaborationSession = updated;
    renderCollaborationWorkspace();
    watchCollaborationSession(updated);
  } catch (error) {
    if (vaultRevision === collaborationVaultSelectionRevision && currentCollaborationSession?.id === session.id && currentCollaborationSession.runId === session.runId && collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.sendFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
  }
}

async function reconcileCollaborationRun(sessionId: string, executionId: string): Promise<void> {
  if (vaultSelectionInProgress || pendingCollaborationRunChecks.has(executionId)) return;
  const vaultRevision = collaborationVaultSelectionRevision;
  const runIdAtStart = currentCollaborationSession?.id === sessionId ? currentCollaborationSession.runId : null;
  pendingCollaborationRunChecks.add(executionId);
  renderCollaborationWorkspace();
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_reconcile_run",
      { sessionId, executionId },
    );
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    if (currentCollaborationSession?.id === sessionId && currentCollaborationSession.runId === runIdAtStart) {
      currentCollaborationSession = updated;
      renderCollaborationWorkspace();
    }
    await refreshCollaborationWorkspace();
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    if (currentCollaborationSession?.id === sessionId) watchCollaborationSession(currentCollaborationSession);
  } catch (error) {
    if (vaultRevision === collaborationVaultSelectionRevision && currentCollaborationSession?.id === sessionId && currentCollaborationSession.runId === runIdAtStart && collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.sessionLoadFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
  } finally {
    pendingCollaborationRunChecks.delete(executionId);
    renderCollaborationWorkspace();
  }
}

async function resumeCollaborationRequest(sessionId: string, executionId: string): Promise<void> {
  await changeCollaborationPendingRequest(sessionId, executionId, "collaboration_resume_not_started");
}

async function removeCollaborationRequest(sessionId: string, executionId: string): Promise<void> {
  await changeCollaborationPendingRequest(sessionId, executionId, "collaboration_remove_pending");
}

async function changeCollaborationPendingRequest(sessionId: string, executionId: string, command: string): Promise<void> {
  if (vaultSelectionInProgress || pendingCollaborationRunChecks.has(executionId)) return;
  const vaultRevision = collaborationVaultSelectionRevision;
  const runIdAtStart = currentCollaborationSession?.id === sessionId ? currentCollaborationSession.runId : null;
  pendingCollaborationRunChecks.add(executionId);
  try {
    const updated = await window.__TAURI__.core.invoke<CollaborationSessionView>(command, { sessionId, executionId });
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    if (currentCollaborationSession?.id === sessionId && currentCollaborationSession.runId === runIdAtStart) {
      currentCollaborationSession = updated;
      renderCollaborationWorkspace();
      watchCollaborationSession(updated);
    }
  } catch (error) {
    if (vaultRevision === collaborationVaultSelectionRevision && currentCollaborationSession?.id === sessionId && currentCollaborationSession.runId === runIdAtStart && collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.sessionLoadFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
  } finally {
    pendingCollaborationRunChecks.delete(executionId);
  }
}

async function createCollaborationSession(): Promise<CollaborationSessionView | null> {
  if (vaultSelectionInProgress || collaborationSessionCreationPromise) return null;
  const vaultRevision = collaborationVaultSelectionRevision;
  const explicitDate = collaborationEmptyTargetDate ??
    (collaborationActivityDateExplicit ? collaborationActivityDate : null);
  const hadSelectedSession = currentCollaborationSession !== null;
  const retainedAttempt = collaborationSessionCreationAttempt;
  const initialDraft = hadSelectedSession
    ? ""
    : (collaborationMessageDraft?.value ?? collaborationEmptyDraft);
  let attempt = retainedAttempt;
  collaborationSessionCreationError = null;
  const creation = (async (): Promise<CollaborationSessionView | null> => {
    try {
      if (!attempt) {
        let date = explicitDate || collaborationActivityDate;
        if (!date) {
          const clock = await window.__TAURI__.core.invoke<TodayClockView>("today_clock");
          if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return null;
          date = clock.livedDate;
        }
        attempt = {
          id: localOperationId("collaboration-session"),
          date,
          initialDraft,
          latestDraft: initialDraft,
        };
        collaborationSessionCreationAttempt = attempt;
      }
      const creationAttempt = attempt;
      const session = await window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_create_session",
        { date: creationAttempt.date, sessionId: creationAttempt.id, initialDraft: creationAttempt.initialDraft },
      );
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return null;
      if (session.id !== creationAttempt.id || session.createdDate !== creationAttempt.date) {
        throw new Error("The collaboration session creation result did not match its request.");
      }
      collaborationSessionCreationAttempt = null;
      cancelCollaborationVoiceCaptureForSelectionChange();
      stashCollaborationDraft();
      const entryDraft = retainedAttempt
        ? creationAttempt.latestDraft
        : hadSelectedSession ? null : collaborationEmptyDraft;
      collaborationSessionCreationResult = session;
      const date = session.targetDate || session.createdDate;
      cacheCollaborationDrafts(session);
      currentCollaborationSession = session;
      collaborationEmptyDraft = "";
      collaborationEmptyComposerActive = false;
      collaborationEmptyTargetDate = null;
      collaborationTargetDates.set(session.id, date);
      collaborationActivityDate = date;
      collaborationTargetDate = date;
      if (collaborationTargetDateInput) collaborationTargetDateInput.value = date;
      if (entryDraft !== null) {
        collaborationDrafts.set(collaborationDraftKey(session.id, date), entryDraft);
        if (entryDraft) {
          collaborationUnsavedDrafts.add(collaborationDraftKey(session.id, date));
          if (collaborationMessageDraft) collaborationMessageDraft.value = entryDraft;
          stashCollaborationDraft();
        }
      }
      renderCollaborationWorkspace();
      await refreshCollaborationWorkspace();
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return null;
      if (collaborationSessionsStatus) setCopy(collaborationSessionsStatus, "collaboration.sessionCreated");
      return currentCollaborationSession?.id === session.id ? currentCollaborationSession : session;
    } catch (error) {
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return null;
      collaborationSessionCreationError = error;
      if (collaborationSessionsStatus) {
        setCopyError(collaborationSessionsStatus, "collaboration.sessionCreateFailed", error);
      }
      renderCollaborationWorkspace();
      return null;
    }
  })();
  collaborationSessionCreationPromise = creation;
  renderCollaborationWorkspace();
  try {
    return await creation;
  } finally {
    if (collaborationSessionCreationPromise === creation) {
      collaborationSessionCreationPromise = null;
      collaborationSessionCreationResult = null;
      renderCollaborationWorkspace();
    }
  }
}

async function openCollaborationForEveningReview(targetDate: string): Promise<boolean> {
  if (vaultSelectionInProgress || collaborationTargetDatePendingSession || collaborationSendingDrafts.size) {
    throw new EveningReviewGuardError("today.reviewBusy");
  }
  const vaultRevision = collaborationVaultSelectionRevision;
  stashCollaborationDraft();
  cancelCollaborationVoiceCaptureForSelectionChange();
  await flushCollaborationDraft();
  if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) throw new EveningReviewGuardError("today.reviewTargetChanged");
  const opened = await window.__TAURI__.core.invoke<Readonly<{ session: CollaborationSessionView; preservedDraft: boolean }>>(
    "collaboration_prepare_evening_review", { date: targetDate, draft: t("today.reviewDraft", { date: targetDate }) },
  );
  if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) throw new EveningReviewGuardError("today.reviewTargetChanged");
  const session = opened.session;
  currentCollaborationSession = session;
  cacheCollaborationDrafts(session);
  collaborationEmptyTargetDate = null;
  collaborationActivityDate = targetDate;
  collaborationActivityDateExplicit = true;
  collaborationTargetDate = targetDate;
  collaborationTargetDates.set(session.id, targetDate);
  if (collaborationDateInput) collaborationDateInput.value = targetDate;
  if (collaborationTargetDateInput) collaborationTargetDateInput.value = targetDate;
  showWorkspaceDestination("collaboration");
  renderCollaborationWorkspace();
  const notice = document.querySelector<HTMLElement>("#collaboration-review-entry-notice");
  if (notice) {
    if (collaborationReviewEntryNoticeTimer !== null) window.clearTimeout(collaborationReviewEntryNoticeTimer);
    notice.dataset.sessionId = session.id;
    notice.dataset.targetDate = targetDate;
    notice.dataset.dismissed = "false";
    setCopy(notice, opened.preservedDraft ? "today.reviewDraftPreserved" : "today.reviewDraftReady", { date: targetDate });
    notice.hidden = false;
    collaborationReviewEntryNoticeTimer = window.setTimeout(() => {
      if (notice.dataset.sessionId === session.id && notice.dataset.targetDate === targetDate) {
        notice.dataset.dismissed = "true";
        notice.hidden = true;
      }
      collaborationReviewEntryNoticeTimer = null;
    }, 5000);
  }
  await refreshCollaborationWorkspace(true);
  window.requestAnimationFrame(() => collaborationMessageDraft?.focus());
  return opened.preservedDraft;
}

const eveningReviewEntryButton = document.querySelector<HTMLButtonElement>("#today-start-review");
const eveningReviewEntryStatus = document.querySelector<HTMLElement>("#today-review-entry-status");
const eveningReviewEntry = eveningReviewEntryButton && eveningReviewEntryStatus
  ? initializeEveningReviewEntry(eveningReviewEntryButton, eveningReviewEntryStatus,
    () => currentTodayView ? { date: currentTodayView.date, isToday: currentTodayView.isToday,
      available: currentTodayView.canRecord && !vaultSelectionInProgress } : null,
    openCollaborationForEveningReview,
    (element, key, values) => setCopy(element, key as InterfaceCopyKey, values),
    (element, key, error) => setCopyError(element, key as InterfaceCopyKey, error))
  : null;

async function openCollaborationForTask(
  taskId: string,
  taskName: string,
  targetDate: string,
): Promise<void> {
  if (vaultSelectionInProgress) return;
  const vaultRevision = collaborationVaultSelectionRevision;
  try {
    await flushCollaborationDraft();
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    let session = currentCollaborationSession;
    if (!session) {
      session = await window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_create_session",
        { date: targetDate },
      );
    } else if (session.targetDate !== targetDate) {
      session = await window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_set_target_date",
        { sessionId: session.id, targetDate },
      );
    }
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    currentCollaborationSession = session;
    cacheCollaborationDrafts(session);
    collaborationActivityDate = targetDate;
    collaborationActivityDateExplicit = true;
    collaborationTargetDate = targetDate;
    collaborationTargetDates.set(session.id, targetDate);
    const key = collaborationDraftKey(session.id, targetDate);
    const existingDraft = collaborationDrafts.get(key) ?? session.draftsByDate[targetDate] ?? "";
    const taskReference = t("collaboration.taskFocusDraft", {
      date: collaborationDateLabel(targetDate),
      id: taskId,
      name: taskName,
    });
    const draft = existingDraft.includes(taskId)
      ? existingDraft
      : [existingDraft.trim(), taskReference].filter(Boolean).join("\n\n");
    // Keep the current editor and cached task draft on the same snapshot even
    // while this save is pending; a Vault preflight must not stash older text.
    if (collaborationMessageDraft) collaborationMessageDraft.value = draft;
    const saved = await saveCollaborationDraft(
      { sessionId: session.id, targetDate },
      draft,
    );
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    currentCollaborationSession = saved;
    if (collaborationDateInput) collaborationDateInput.value = targetDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = targetDate;
    showWorkspaceDestination("collaboration");
    renderCollaborationWorkspace();
    window.requestAnimationFrame(() => collaborationMessageDraft?.focus());
  } catch (error) {
    if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision) return;
    if (collaborationRunStatus) {
      setRawText(collaborationRunStatus, String(error));
      collaborationRunStatus.dataset.state = "error";
    }
    showWorkspaceDestination("collaboration");
  }
}

async function returnToCollaborationFromTask(): Promise<void> {
  const sessionId = taskReturnToCollaborationSessionId;
  if (!sessionId) return;
  if (taskReturnToCollaborationButton) taskReturnToCollaborationButton.disabled = true;
  try {
    const session = currentCollaborationSession?.id === sessionId
      ? currentCollaborationSession
      : await window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_session",
        { sessionId },
      );
    currentCollaborationSession = session;
    collaborationActivityDate = session.targetDate;
    collaborationActivityDateExplicit = true;
    collaborationTargetDate = session.targetDate;
    collaborationTargetDates.set(session.id, session.targetDate);
    if (collaborationDateInput) collaborationDateInput.value = session.targetDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = session.targetDate;
    taskReturnToCollaborationSessionId = null;
    showWorkspaceDestination("collaboration");
    renderCollaborationWorkspace();
    window.requestAnimationFrame(() => collaborationMessageDraft?.focus());
  } catch (error) {
    if (tasksStatus) {
      setRawText(tasksStatus, String(error));
      tasksStatus.dataset.state = "error";
    }
  } finally {
    if (taskReturnToCollaborationButton) taskReturnToCollaborationButton.disabled = false;
  }
}

async function returnToCollaborationFromDailyRecord(): Promise<void> {
  const sessionId = dailyPlanReturnToCollaborationSessionId;
  if (!sessionId) return;
  if (todayReturnToCollaborationButton) todayReturnToCollaborationButton.disabled = true;
  if (calendarReturnToCollaborationButton) calendarReturnToCollaborationButton.disabled = true;
  try {
    const session = currentCollaborationSession?.id === sessionId
      ? currentCollaborationSession
      : await window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_session",
        { sessionId },
      );
    const targetDate = dailyPlanReturnToCollaborationDate ?? session.targetDate;
    currentCollaborationSession = session;
    cacheCollaborationDrafts(session);
    collaborationTargetDates.set(session.id, targetDate);
    collaborationActivityDate = targetDate;
    collaborationActivityDateExplicit = true;
    collaborationTargetDate = targetDate;
    if (collaborationDateInput) collaborationDateInput.value = targetDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = targetDate;
    dailyPlanReturnToCollaborationSessionId = null;
    dailyPlanReturnToCollaborationDate = null;
    showWorkspaceDestination("collaboration");
    renderCollaborationWorkspace();
    window.requestAnimationFrame(() => collaborationMessageDraft?.focus());
  } catch (error) {
    const status = currentWorkspaceDestination === "calendar" ? calendarStatus : todayStatus;
    if (status) {
      setRawText(status, String(error));
      status.dataset.state = "error";
    }
  } finally {
    if (todayReturnToCollaborationButton) todayReturnToCollaborationButton.disabled = false;
    if (calendarReturnToCollaborationButton) calendarReturnToCollaborationButton.disabled = false;
  }
}

function watchCollaborationSession(session: CollaborationSessionView): void {
  if (collaborationStatusTimer !== null) {
    window.clearInterval(collaborationStatusTimer);
    collaborationStatusTimer = null;
  }
  if (!["queued", "reading", "thinking", "stopping"].includes(session.runState)) return;
  const sessionId = session.id;
  const refreshedEffects = new Set<string>();
  let refreshedVaultRevision = collaborationVaultSelectionRevision;
  collaborationStatusTimer = window.setInterval(() => {
    if (vaultSelectionInProgress || currentCollaborationSession?.id !== sessionId) {
      return;
    }
    const vaultRevision = collaborationVaultSelectionRevision;
    if (refreshedVaultRevision !== vaultRevision) {
      refreshedEffects.clear();
      refreshedVaultRevision = vaultRevision;
    }
    void window.__TAURI__.core.invoke<CollaborationSessionView>(
      "collaboration_session",
      { sessionId },
    ).then((updated) => {
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision || currentCollaborationSession?.id !== sessionId) return;
      currentCollaborationSession = updated;
      refreshCollaborationRunOwner(updated);
      renderCollaborationWorkspace();
      const changedDates = new Map<string | null, Set<string>>();
      const addChangedDate = (executionId: string | null | undefined, date: string): void => {
        const owner = executionId ?? null;
        const dates = changedDates.get(owner) ?? new Set<string>();
        dates.add(date);
        changedDates.set(owner, dates);
      };
      const taskEffectExecutions = new Set<string | null>();
      let tasksChanged = false;
      let confirmedEffect = false;
      for (const receipt of updated.taskOperations ?? []) {
        if (receipt.status !== "applied") continue;
        const key = `${receipt.id}:${receipt.resultRevision ?? receipt.updatedAt}`;
        if (refreshedEffects.has(key)) continue;
        refreshedEffects.add(key);
        confirmedEffect = true;
        if (receipt.taskId || receipt.listId) {
          tasksChanged = true;
          taskEffectExecutions.add(receipt.executionId ?? null);
        } else addChangedDate(receipt.executionId, receipt.targetDate);
      }
      for (const history of updated.workHistory ?? []) {
        for (const item of history.items) {
          for (const change of item.changes ?? []) {
            if (!change.path || !change.afterRevision || !["sourceObserved", "verified"].includes(change.verification)) continue;
            const key = `${history.executionId}:${change.id}:${change.afterRevision}`;
            if (refreshedEffects.has(key)) continue;
            refreshedEffects.add(key);
            confirmedEffect = true;
            if (change.targetDate) addChangedDate(history.executionId, change.targetDate);
          }
        }
      }
      for (const request of updated.messages ?? []) {
        for (const receipt of request.actionResults ?? []) {
          if (updated.taskOperations?.some(operation => operation.id === receipt.id)) continue;
          if (!["applied", "saved", "ready"].includes(receipt.status)) continue;
          const key = `${receipt.id}:${receipt.status}`;
          if (refreshedEffects.has(key)) continue;
          refreshedEffects.add(key);
          confirmedEffect = true;
          if (receipt.targetDate) addChangedDate(request.executionId, receipt.targetDate);
        }
      }
      if (confirmedEffect) {
        // A Task's schedule/completion and list state can change any date-based
        // view. Re-read the date being viewed; never redirect the write target.
        if (tasksChanged) {
          const visibleDate = currentWorkspaceDestination === "today"
            ? selectedTodayDate ?? currentTodayView?.date
            : currentWorkspaceDestination === "calendar"
              ? selectedCalendarDate ?? currentCalendarSummaryView?.date : null;
          if (visibleDate) {
            for (const owner of taskEffectExecutions) addChangedDate(owner, visibleDate);
          }
        }
        void Promise.allSettled([
          ...[...changedDates].flatMap(([executionId, dates]) => [...dates].map(date =>
            refreshCanonicalDateProjections(date, executionId ? {sessionId, executionId, trigger:"confirmedEffect"} : undefined))),
          ...(tasksChanged ? [refreshTasks()] : []),
          refreshCollaborationContext(),
        ]);
      }
      if (!["queued", "reading", "thinking", "stopping"].includes(updated.runState)) {
        if (collaborationStatusTimer !== null) window.clearInterval(collaborationStatusTimer);
        collaborationStatusTimer = null;
        // Native file saves have no Dashboard operation receipt. Re-read canonical
        // projections even for a stopped/failed turn, which may have saved earlier.
        // The request's captured date survives target changes and the 04:00 rollover.
        const request = updated.messages.find((message) =>
          message.role === "user" && message.executionId === updated.runId);
        const savedDate = request?.targetDate ?? session.targetDate;
        void Promise.allSettled([
          refreshCanonicalDateProjections(savedDate, {sessionId, executionId:request?.executionId ?? updated.runId!, trigger:"turnTerminal"}),
          refreshTasks(),
          refreshCollaborationWorkspace(),
        ]);
      }
    }).catch((error: unknown) => {
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision || currentCollaborationSession?.id !== sessionId) return;
      if (collaborationRunStatus) {
        setCopyError(collaborationRunStatus, "collaboration.sessionLoadFailed", error);
        collaborationRunStatus.dataset.state = "error";
      }
    });
  }, 750);
}

async function sendCollaborationMessage(): Promise<void> {
  if (vaultSelectionInProgress || collaborationVoiceController.state !== "idle" ||
    collaborationSessionCreationPromise) return;
  let session = currentCollaborationSession;
  if (!session) {
    const draft = collaborationMessageDraft?.value ?? "";
    const connected = currentCollaborationConnection?.authenticated === true &&
      currentCollaborationConnection.authMode === "chatgpt" &&
      currentCollaborationConnection.readOnlyTextTurnsAvailable;
    if (!draft.trim() || !connected || !currentCollaborationWorkspace?.context.vaultName) return;
    const createdSession = await createCollaborationSession();
    if (!createdSession || currentCollaborationSession?.id !== createdSession.id || vaultSelectionInProgress) return;
    session = createdSession;
  }
  const message = collaborationMessageDraft?.value ?? "";
  if (!message.trim()) return;
  const targetDate = collaborationTargetDates.get(session.id) ??
    (collaborationTargetDateInput?.value || collaborationTargetDate);
  const target = { sessionId: session.id, targetDate };
  const draftKey = collaborationDraftKey(session.id, targetDate);
  if (collaborationSendingDrafts.has(draftKey)) return;
  collaborationSendingDrafts.add(draftKey);
  collaborationDrafts.set(draftKey, message);
  collaborationTargetDate = targetDate;
  renderCollaborationWorkspace();
  try {
    // This save is queued behind every keyboard or voice write for this same
    // session and date, so the send uses the final editable snapshot.
    await flushCollaborationDraft(target, message);
    const { result: queued, draft: remainingDraft } = await submitCollaborationDraftSnapshot(
      message,
      () => collaborationDrafts.get(draftKey) ?? message,
      () => window.__TAURI__.core.invoke<CollaborationSessionView>(
        "collaboration_submit_message",
        { sessionId: session.id, targetDate, text: message },
      ),
    );
    cacheCollaborationDrafts(queued, true);
    collaborationSubmittedDrafts.set(draftKey, message);
    collaborationDrafts.set(draftKey, remainingDraft);
    if (!remainingDraft) {
      collaborationUnsavedDrafts.delete(draftKey);
      collaborationIncompleteVoiceDrafts.delete(draftKey);
      collaborationVoiceStatuses.delete(draftKey);
    }
    if (remainingDraft) {
      // Keep any newer memory snapshot durable through the
      // existing write queue, keeping it editable if persistence fails.
      void saveCollaborationDraft(target, remainingDraft).catch(() => {
        setCollaborationVoiceStatus(target, "collaboration.voiceDraftSaveFailed");
        renderCollaborationVoiceControls();
      });
    }
    if (currentCollaborationSession?.id === session.id) {
      if (collaborationMessageDraft && isCurrentCollaborationVoiceTarget(target)) {
        collaborationMessageDraft.value = remainingDraft;
      }
      currentCollaborationSession = queued;
    }
    renderCollaborationWorkspace();
    if (currentCollaborationSession?.id === session.id) {
      refreshCollaborationRunOwner(queued);
      renderCollaborationWorkspace();
      watchCollaborationSession(queued);
      void refreshCollaborationWorkspace();
    }
  } catch (error) {
    const latestDraft = collaborationDrafts.get(draftKey) ?? message;
    collaborationDrafts.set(draftKey, latestDraft);
    if (currentCollaborationSession?.id === session.id && collaborationMessageDraft &&
      isCurrentCollaborationVoiceTarget(target)) {
      collaborationMessageDraft.value = latestDraft;
    }
    renderCollaborationWorkspace();
    if (currentCollaborationSession?.id === session.id && collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.sendFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
  } finally {
    collaborationSendingDrafts.delete(draftKey);
    renderCollaborationWorkspace();
  }
}

async function startChatGPTLogin(): Promise<void> {
  if (collaborationLoginStatus) setCopy(collaborationLoginStatus, "collaboration.connectStarting");
  try {
    await window.__TAURI__.core.invoke<void>("collaboration_start_chatgpt_login");
    if (collaborationLoginStatus) setCopy(collaborationLoginStatus, "collaboration.connectStarted");
    await refreshCollaborationConnection();
  } catch (error) {
    if (collaborationLoginStatus) {
      setCopyError(collaborationLoginStatus, "collaboration.loginFailed", error);
    }
  }
}

async function saveCollaborationModel(): Promise<void> {
  if (!collaborationModelSelect) return;
  const modelId = collaborationModelSelect.value || null;
  collaborationModelSelect.disabled = true;
  try {
    currentCollaborationConnection = await window.__TAURI__.core.invoke<CollaborationConnectionView>(
      "collaboration_select_model",
      { modelId },
    );
    renderCollaborationConnection();
  } catch (error) {
    if (collaborationLoginStatus) {
      setCopyError(collaborationLoginStatus, "collaboration.modelSaveFailed", error);
    }
    if (currentCollaborationConnection) renderCollaborationConnection();
  }
}

async function saveCollaborationReasoningEffort(): Promise<void> {
  if (!collaborationReasoningEffortSelect) return;
  const reasoningEffort = collaborationReasoningEffortSelect.value || null;
  collaborationReasoningEffortSelect.disabled = true;
  try {
    currentCollaborationConnection = await window.__TAURI__.core.invoke<CollaborationConnectionView>(
      "collaboration_select_reasoning_effort",
      { reasoningEffort },
    );
    renderCollaborationConnection();
  } catch (error) {
    if (collaborationLoginStatus) {
      setCopyError(collaborationLoginStatus, "collaboration.reasoningEffortSaveFailed", error);
    }
    if (currentCollaborationConnection) renderCollaborationConnection();
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

let todayAxisEarlyExpanded = false;
let todayAxisLateExpanded = false;
let todayAxisZoomLevel = 0;
let todayAxisRenderedDate: string | null = null;
const todayAxisZoomHeights = [null, "28px", "40px", "56px"] as const;
function axisBounds(): readonly [number, number] {
  return [todayAxisEarlyExpanded ? 240 : 360, todayAxisLateExpanded ? 1680 : 1440];
}
function minutePosition(minute: number): number {
  const [start, end] = axisBounds();
  return (minute - start) / (end - start);
}
function nextAxisDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
function formatAxisMinute(minute: number): string {
  minute %= 1440;
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

type TodayAxisLaneId = "arrangement" | "facts" | "tasks" | "arrangement-unlocated" | "facts-unlocated";

function hasExactPlanTime(entry: TimeAxisEntryView): boolean {
  return entry.planPrecision === "exactPoint" || entry.planPrecision === "exactRange";
}

function axisEntryTimeLabel(entry: TimeAxisEntryView, lane?: TodayAxisLaneId): string {
  if(entry.task) {
    const task=currentTodayView?.tasks.tasks.find(task=>task.id===entry.task!.id);
    if(task?.date&&task.time) {
      const datePrefix=task.date===currentTodayView?.date?"":`${task.date} · `;
      const end=task.executionEnd?`–${task.executionEnd.date===task.date?"":`${task.executionEnd.date} · `}${task.executionEnd.time}`:"";
      return `${datePrefix}${task.time}${end}`;
    }
  }
  if (entry.startMinute === null) {
    if (entry.period) return `${entry.period} · ${t("today.unlocatedPlanLabel")}`;
    if (lane === "facts" || lane === "facts-unlocated") return t("today.unlocatedConfirmedFactLabel");
    return t("today.unlocatedLabel");
  }
  const start = formatAxisMinute(entry.startMinute);
  if (entry.planPrecision === "broad") return entry.period || t("today.planApproximatePoint");
  if (entry.planPrecision === "approximatePoint") {
    const label = t("today.planApproximateReference", { time: start });
    return entry.startMinute >= 1440 ? `${label} · ${nextAxisDate(currentTodayView?.date ?? entry.sourceDate)}` : label;
  }
  const label = entry.endMinute === null ? start : `${start}–${formatAxisMinute(entry.endMinute)}`;
  return entry.startMinute >= 1440 || (entry.endMinute ?? 0) > 1440
    ? `${label} · ${nextAxisDate(currentTodayView?.date ?? entry.sourceDate)}` : label;
}

// Retain copy metadata only for derived labels; period and source text stay verbatim.
function appendAxisEntryTimeLabel(
  target: HTMLElement,
  entry: TimeAxisEntryView,
  lane: TodayAxisLaneId,
): void {
  let key: InterfaceCopyKey;
  let variables: Record<string, string> = {};
  if (!entry.task && entry.startMinute === null) {
    if (entry.period) target.append(`${entry.period} · `);
    key = entry.period ? "today.unlocatedPlanLabel" :
      lane === "facts" || lane === "facts-unlocated" ? "today.unlocatedConfirmedFactLabel" : "today.unlocatedLabel";
  } else if (!entry.task && entry.planPrecision === "broad") {
    target.textContent = entry.period || t("today.planApproximatePoint");
    return;
  } else if (!entry.task && entry.planPrecision === "approximatePoint") {
    key = "today.planApproximateReference";
    variables = { time: formatAxisMinute(entry.startMinute!) };
  } else {
    target.textContent = axisEntryTimeLabel(entry, lane);
    return;
  }
  const label = document.createElement("span");
  setCopy(label, key, variables);
  target.append(label);
  if (entry.planPrecision === "approximatePoint" && entry.startMinute! >= 1440) {
    target.append(` · ${nextAxisDate(currentTodayView?.date ?? entry.sourceDate)}`);
  }
}

function axisEntryMetadataCopyKeys(
  entry: TimeAxisEntryView,
  lane: TodayAxisLaneId,
): readonly InterfaceCopyKey[] {
  if (entry.task) {
    return [
      "today.sourceTask",
      taskStateCopyKey(entry.task.state),
      ...(entry.task.timePassed ? ["tasks.timePassed" as const] : []),
    ];
  }
  if (lane === "arrangement" || lane === "arrangement-unlocated") {
    return ["today.sourceArrangement"];
  }
  return ["today.sourceConfirmedFact"];
}

function appendAxisEntryMetadata(
  target: HTMLElement,
  entry: TimeAxisEntryView,
  lane: TodayAxisLaneId,
): void {
  for (const key of axisEntryMetadataCopyKeys(entry, lane)) {
    const label = document.createElement("span");
    setCopy(label, key);
    target.append(label);
  }
}

function axisEntryDetails(
  entry: TimeAxisEntryView,
  lane: TodayAxisLaneId,
  index: number,
): HTMLDetailsElement {
  const details = document.createElement("details");
  details.className = "today-axis-entry-detail";
  details.id = `today-axis-${lane}-entry-${index}`;
  const summary = document.createElement("summary");
  const time = document.createElement(entry.startMinute === null ? "span" : "time");
  if (entry.startMinute === null) time.className = "today-axis-entry-time-label";
  appendAxisEntryTimeLabel(time, entry, lane);
  if (entry.startMinute !== null) {
    time.setAttribute("datetime", `${entry.startMinute >= 1440 ? nextAxisDate(currentTodayView?.date ?? entry.sourceDate) : (currentTodayView?.date ?? entry.sourceDate)}T${formatAxisMinute(entry.startMinute)}`);
  }
  const excerpt = document.createElement("span");
  excerpt.textContent = entry.text;
  summary.append(time, excerpt);
  {
    const continuation = document.createElement("span");
    continuation.className = "today-axis-entry-summary-metadata";
    const sourceDate = document.createElement("span");
    setCopy(sourceDate, "today.sourceDate", { date: entry.sourceDate });
    continuation.append(sourceDate);
    if (entry.continuesFromPreviousDay) {
      const label = document.createElement("span");
      setCopy(label, "today.continuesFromPrevious");
      continuation.append(label);
    }
    if (entry.continuesIntoNextDay) {
      const label = document.createElement("span");
      setCopy(label, "today.continuesIntoNext");
      continuation.append(label);
    }
    summary.append(continuation);
  }
  const sourceStatus = document.createElement("span");
  sourceStatus.className = "today-axis-entry-summary-metadata";
  appendAxisEntryMetadata(sourceStatus, entry, lane);
  summary.append(sourceStatus);
  const copy = document.createElement("p");
  copy.textContent = entry.text;
  details.append(summary, copy);
  const metadata = document.createElement("div");
  metadata.className = "today-axis-entry-metadata";
  if (entry.period) {
    const period = document.createElement("span");
    period.textContent = entry.period;
    metadata.append(period);
  }
  appendAxisEntryMetadata(metadata, entry, lane);
  const sourceDate = document.createElement("span");
  setCopy(sourceDate, "today.sourceDate", { date: entry.sourceDate });
  metadata.append(sourceDate);
  if (entry.continuesFromPreviousDay) {
    const continuation = document.createElement("span");
    setCopy(continuation, "today.continuesFromPrevious");
    metadata.append(continuation);
  }
  if (entry.continuesIntoNextDay) {
    const continuation = document.createElement("span");
    setCopy(continuation, "today.continuesIntoNext");
    metadata.append(continuation);
  }
  details.append(metadata);
  // Broad or unlocated plans are readable summaries; only precise timeline
  // markers expose the plan-time editor.
  if (lane !== "arrangement" || !hasExactPlanTime(entry)) return details;
  if(entry.task) {
    const edit=document.createElement("button");edit.type="button";setCopy(edit,"tasks.editLabel",{task:entry.text});
    edit.addEventListener("click",()=>{taskFocusRequestId=entry.task!.id;showWorkspaceDestination("tasks");});details.append(edit);
  }
  if (lane === "arrangement") {
    if (!entry.planId || !entry.timeEditable || entry.continuesFromPreviousDay || entry.continuesIntoNextDay) {
      const unavailable = document.createElement("p");
      setCopy(unavailable, entry.continuesFromPreviousDay || entry.continuesIntoNextDay ? "today.planTimeOutsideWindow" : "today.planTimeUnavailable");
      details.append(unavailable);
      return details;
    }
    const edit = document.createElement("button");
    edit.type = "button";
    setCopy(edit, "today.editPlanTime");
    edit.addEventListener("click", () => openPlanTimeEditor(entry));
    details.append(edit);
  }
  return details;
}

function openPlanTimeEditor(entry: TimeAxisEntryView, recovery?: Readonly<{
  loaded: TodayView; startMinute: number; endMinute: number | null; notice: string; savedRevision?: string;
}>): void {
  const loaded = recovery?.loaded ?? currentTodayView;
  if (!entry.planId || !entry.timeEditable || !loaded?.revision || !loaded.targetBinding) return;
  const dialog = document.createElement("dialog");
  dialog.className = "plan-time-editor";
  dialog.dataset.i18nAriaLabel = "today.editPlanTime";
  dialog.setAttribute("aria-label", t("today.editPlanTime"));
  const form = document.createElement("form");
  const heading = document.createElement("h3");
  setCopy(heading, "today.editPlanTime");
  const title = document.createElement("p");
  title.textContent = entry.text;
  const help = document.createElement("p");
  setCopy(help, "today.planTimeHelp");
  form.append(heading, title, help);
  const precisionLabel = document.createElement("label");
  const precisionCaption = document.createElement("span");
  setCopy(precisionCaption, "today.planPrecision");
  precisionLabel.append(precisionCaption);
  const precision = document.createElement("select");
  for (const [value, key] of [
    ["approximatePoint", "today.planApproximatePoint"],
    ["exactPoint", "today.planExactPoint"],
    ["exactRange", "today.planExactRange"],
  ] as const) {
    const option = document.createElement("option");
    option.value = value;
    setCopy(option, key);
    precision.append(option);
  }
  precision.value = entry.planPrecision === "exactRange" || entry.planPrecision === "exactPoint"
    ? entry.planPrecision : "approximatePoint";
  precisionLabel.append(precision);
  form.append(precisionLabel);
  const timeControl = (key: InterfaceCopyKey, minute: number | null) => {
    const group = document.createElement("div");
    const label = document.createElement("label");
    const caption = document.createElement("span");
    setCopy(caption, key);
    label.append(caption);
    const time = document.createElement("input");
    time.type = "time";
    time.step = "60";
    time.value = minute === null ? "" : formatAxisMinute(minute);
    label.append(time);
    const dayLabel = document.createElement("label");
    const nextDay = document.createElement("input");
    nextDay.type = "checkbox";
    nextDay.checked = minute !== null && minute >= 1440;
    const dayCopy = document.createElement("span");
    setCopy(dayCopy, "today.planNextDay");
    dayLabel.append(nextDay, dayCopy);
    group.append(label, dayLabel);
    form.append(group);
    return { time, nextDay, group };
  };
  const start = timeControl("today.planStart", recovery?.startMinute ?? entry.startMinute);
  const end = timeControl("today.planEnd", recovery ? recovery.endMinute : entry.endMinute);
  start.time.required = true;
  const updatePrecision = () => {
    const range = precision.value === "exactRange";
    end.group.hidden = !range;
    end.time.required = range;
    end.time.disabled = end.nextDay.disabled = !range;
  };
  precision.addEventListener("change", updatePrecision);
  updatePrecision();
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const save = document.createElement("button");
  save.type = "submit";
  setCopy(save, "today.planSave");
  const close = document.createElement("button");
  close.type = "button";
  setCopy(close, "today.planCancel");
  close.addEventListener("click", () => dialog.close());
  const recheck = document.createElement("button");
  recheck.type = "button";
  setCopy(recheck, "today.planRecheck");
  recheck.hidden = true;
  let expectedRevision = loaded.revision;
  let savedRevision = recovery?.savedRevision;
  recheck.addEventListener("click", () => {
    if (todayOperationCount > 0) return;
    recheck.disabled = true;
    updateTodayOperationState(1);
    const request = todayPresentationRequests.begin();
    void (async () => {
      try {
        const fresh = await window.__TAURI__.core.invoke<TodayView>("read_daily_view", { date: loaded.date });
        if (!dialog.open || fresh.date !== loaded.date || fresh.targetBinding !== loaded.targetBinding ||
            !fresh.revision || !todayPresentationRequests.isCurrent(request) ||
            currentTodayView?.date !== loaded.date || currentTodayView.targetBinding !== loaded.targetBinding) {
          setCopy(status, "today.planSourceChanged");
          return;
        }
        renderToday(fresh);
        // A successful command's whole-document revision confirms its readback
        // without guessing an updated source ID from its title or position.
        if (savedRevision && fresh.revision === savedRevision) {
          showTodayMutationCopy("today.planSaved", "ready");
          showTodayAxisEditCopy("today.planSaved");
          dialog.close();
          return;
        }
        const unchanged = [...fresh.timeAxis.currentArrangement, ...fresh.timeAxis.unlocatedCurrentArrangement]
          .find(candidate => candidate.planId === entry.planId);
        if (savedRevision || !unchanged?.timeEditable) {
          setCopy(status, "today.planSourceChanged");
          return;
        }
        // The opaque raw-source/span ID still identifies unchanged bytes.
        // Keep the proposed values and require a deliberate subsequent submit.
        expectedRevision = fresh.revision;
        submitted = false;
        save.disabled = precision.disabled = start.time.disabled = start.nextDay.disabled = false;
        end.nextDay.disabled = false;
        updatePrecision();
        setCopy(status, "today.planRetryReady");
        recheck.hidden = true;
      } catch (error) {
        setCopyError(status, "today.planUnconfirmedError", error);
      } finally {
        recheck.disabled = false;
        updateTodayOperationState(-1);
      }
    })();
  });
  form.append(status, save, recheck, close);
  if (recovery) {
    setCopyError(status, recovery.savedRevision ? "today.planReadbackDiagnostic" : "today.planUnconfirmedError", recovery.notice);
    recheck.hidden = false;
    save.disabled = precision.disabled = true;
    start.time.disabled = end.time.disabled = start.nextDay.disabled = end.nextDay.disabled = true;
  }
  let submitted = Boolean(recovery);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitted || todayOperationCount > 0) return;
    const parse = (control: typeof start) => {
      if (!/^\d{2}:\d{2}$/.test(control.time.value)) return null;
      const [hours, minutes] = control.time.value.split(":").map(Number);
      return hours * 60 + minutes + (control.nextDay.checked ? 1440 : 0);
    };
    const startMinute = parse(start);
    const range = precision.value === "exactRange";
    const endMinute = range ? parse(end) : null;
    if (startMinute === null || startMinute < 240 || startMinute >= 1680 ||
        (range && (endMinute === null || endMinute <= startMinute || endMinute > 1680))) {
      setCopy(status, "today.planInvalidTime");
      return;
    }
    const operationId = `plan-time-${crypto.randomUUID()}`;
    // A captured source/revision stays bound even when the displayed date or Vault changes.
    submitted = true;
    save.disabled = precision.disabled = true;
    start.time.disabled = end.time.disabled = start.nextDay.disabled = end.nextDay.disabled = true;
    const request = todayPresentationRequests.begin();
    updateTodayOperationState(1);
    const operation = (async () => {
      let confirmed = false;
      try {
        const result = await window.__TAURI__.core.invoke<Readonly<{ savedRevision: string; view: TodayView | null; refreshError: string | null }>>("edit_plan_time", {
          input: { date: loaded.date, targetBinding: loaded.targetBinding, expectedRevision,
            planId: entry.planId, operationId, startMinute, endMinute, precision: precision.value },
        });
        savedRevision = result.savedRevision;
        confirmed = result.view !== null;
        if (result.view && todayPresentationRequests.isCurrent(request)) {
          renderToday(result.view);
          showTodayMutationCopy("today.planSaved", "ready");
          dialog.close();
        } else {
          if (result.refreshError) setCopyError(status, "today.planReadbackDiagnostic", result.refreshError);
          else setCopy(status, "today.planSavedNeedsReadback");
          recheck.hidden = false;
        }
      } catch (error) {
        setCopyError(status, "today.planUnconfirmedError", error);
        recheck.hidden = false;
      } finally {
        updateTodayOperationState(-1);
      }
      return confirmed;
    })();
    void pendingWrites.track(operation);
  });
  dialog.append(form);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
}

function openTodayAxisTaskCreate(loaded: TodayView, startMinute: number, endMinute: number): void {
  const binding=loaded.tasks.targetBinding;
  if(!binding)return;
  const dialog=document.createElement("dialog");dialog.dataset.axisTaskCreate="";dialog.className="today-axis-task-dialog";
  const heading=document.createElement("h3");setCopy(heading,"tasks.addHeading");
  const form=document.createElement("form");form.className="task-form";
  const grid=document.createElement("div");grid.className="task-form-grid";
  const start=taskAxisDateTime(loaded.date,startMinute),end=taskAxisDateTime(loaded.date,endMinute);
  const input=(key:InterfaceCopyKey,type:string,data:string,value:string)=>{
    const label=document.createElement("label");const caption=document.createElement("span");setCopy(caption,key);
    const field=document.createElement("input");field.type=type;field.dataset[data]="";field.value=value;
    label.append(caption,field);grid.append(label);return field;
  };
  const name=input("tasks.name","text","taskName","");name.required=true;name.maxLength=160;
  const noteLabel=document.createElement("label");const noteCaption=document.createElement("span");setCopy(noteCaption,"tasks.content");
  const note=document.createElement("textarea");note.rows=2;note.dataset.taskContent="";noteLabel.append(noteCaption,note);grid.append(noteLabel);
  input("tasks.date","date","taskDate",start.date);input("tasks.time","time","taskTime",start.time);
  input("tasks.executionEndDate","date","taskEndDate",end.date);input("tasks.executionEndTime","time","taskEndTime",end.time);
  const listLabel=document.createElement("label");const listCaption=document.createElement("span");setCopy(listCaption,"tasks.list");
  const list=document.createElement("select");list.dataset.taskList="";renderTaskListSelect(list,loaded.tasks,"inbox",false);
  listLabel.append(listCaption,list);grid.append(listLabel);
  const status=document.createElement("p");status.setAttribute("role","status");status.dataset.axisTaskStatus="";
  const save=document.createElement("button");save.type="submit";setCopy(save,"tasks.save");
  const cancel=document.createElement("button");cancel.type="button";setCopy(cancel,"today.axisCancel");cancel.addEventListener("click",()=>dialog.close());
  const recheck=document.createElement("button");recheck.type="button";recheck.hidden=true;setCopy(recheck,"tasks.refresh");
  const taskId=localOperationId("axis-task");let revision=loaded.tasks.revision;let submitted: Record<string,unknown>|null=null;let busy=false;
  const sameTarget=()=>currentWorkspaceDestination==="today"&&currentTodayView?.date===loaded.date&&currentTodayView.tasks.targetBinding===binding;
  const matches=(task:TaskView)=>submitted!==null&&task.id===taskId&&task.name===submitted.name&&task.content===submitted.content&&
    task.date===submitted.date&&task.time===submitted.time&&task.listId===submitted.listId&&
    task.executionEnd?.date===(submitted.executionEnd as {date:string}|null)?.date&&task.executionEnd?.time===(submitted.executionEnd as {time:string}|null)?.time;
  recheck.addEventListener("click",()=>{
    if(busy||!sameTarget()) {setCopy(status,"tasks.refreshFirst");return;}
    busy=true;recheck.disabled=true;
    const operation=(async()=>{try {
      const latest=await window.__TAURI__.core.invoke<TasksView>("tasks_view");
      if(!sameTarget()||latest.targetBinding!==binding||latest.state==="error"||latest.state==="unconfigured")throw Error(latest.message);
      renderTaskSurface("today",latest);
      if(latest.tasks.some(matches)){setCopy(taskSurfaceStatus("today"),"tasks.saved");showTodayAxisEditCopy("tasks.saved");dialog.close();return true;}
      if(latest.tasks.some(task=>task.id===taskId)){setCopy(status,"today.axisTaskAlreadyExists");save.disabled=true;return false;}
      revision=latest.revision;save.disabled=false;setCopy(status,"today.axisTaskRetry");return false;
    }catch(error){setCopyError(status,"tasks.notSaved",error);return false;}finally{busy=false;recheck.disabled=false;}})();
    void pendingWrites.track(operation);
  });
  form.addEventListener("submit",event=>{
    event.preventDefault();if(busy||!sameTarget()){setCopy(status,"tasks.refreshFirst");return;}
    const draft=readTaskDraft(form);
    if(!draft.name.trim()){name.focus();return;}
    if(!draft.date||!draft.time||!draft.endDate||!draft.endTime||`${draft.endDate}T${draft.endTime}`<=`${draft.date}T${draft.time}`||
      taskAxisMinute(loaded.date,{date:draft.date,time:draft.time})<240||taskAxisMinute(loaded.date,{date:draft.endDate,time:draft.endTime})>1680){
      setCopy(status,"tasks.invalidExecutionInterval");return;
    }
    submitted={targetBinding:binding,expectedRevision:revision,taskId,name:draft.name.trim(),content:draft.content.trim()||null,
      date:draft.date,time:draft.time,executionEnd:{date:draft.endDate,time:draft.endTime},listId:draft.listId||"inbox"};
    busy=true;save.disabled=true;const request=todayTaskRequests.begin();updateTaskOperationState(1);
    const operation=(async()=>{try {
      const result=await window.__TAURI__.core.invoke<TasksView>("create_task",{input:submitted});
      if(!taskSurfaceIsCurrent("today",request,binding,result.targetBinding,loaded.date,revision)||
        !["ready","empty"].includes(result.state)||!result.tasks.some(matches))throw Error(result.message||t("tasks.confirmationFailed"));
      renderTaskSurface("today",result);setCopy(taskSurfaceStatus("today"),"tasks.saved");showTodayAxisEditCopy("tasks.saved");dialog.close();return true;
    }catch(error){setCopyError(status,"tasks.notSaved",error);recheck.hidden=false;return false;}
    finally{busy=false;updateTaskOperationState(-1);}})();
    void pendingWrites.track(operation);
  });
  form.append(grid,status,save,cancel,recheck);dialog.append(heading,form);dialog.addEventListener("close",()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();name.focus();
}

async function moveTodayAxisTask(change: AxisGestureCommit<TodayView>): Promise<boolean> {
  const loaded=change.context,target=change.target;
  const binding=loaded.tasks.targetBinding;
  let savedTask=loaded.tasks.tasks.find(task=>task.id===target?.key);
  let revision=loaded.tasks.revision;
  if(!binding||!savedTask||!revision)return false;
  const start=taskAxisDateTime(loaded.date,change.startMinute);
  const executionEnd=change.endMinute===null?null:taskAxisDateTime(loaded.date,change.endMinute);
  const sameTarget=()=>currentWorkspaceDestination==="today"&&currentTodayView?.date===loaded.date&&currentTodayView.tasks.targetBinding===binding;
  const matches=(task:TaskView)=>task.id===target!.key&&task.date===start.date&&task.time===start.time&&
    task.executionEnd?.date===executionEnd?.date&&task.executionEnd?.time===executionEnd?.time;
  let recovery:HTMLDialogElement|null=null;
  let status:HTMLElement|null=taskSurfaceStatus("today");
  let retry:HTMLButtonElement|null=null;
  const save=async():Promise<boolean>=>{
    if(!sameTarget()||!savedTask||!revision){setCopy(status,"tasks.refreshFirst");return false;}
    const source=savedTask;
    const edit={targetBinding:binding,taskId:source.id,name:source.name,content:source.content,listId:source.listId,
      date:start.date,time:start.time,executionEnd};
    updateTaskOperationState(1);if(retry)retry.disabled=true;
    try {
      const result=await performTaskUpdateRequest(edit,{expectedRevision:revision,requests:todayTaskRequests,identities:taskOperationIds,
        createChangeId:()=>localOperationId("axis-task-move"),invoke:input=>window.__TAURI__.core.invoke<TasksView>("update_task",{input}),
        isCurrent:(token,view)=>taskSurfaceIsCurrent("today",token,binding,view.targetBinding,loaded.date,revision)});
      if(!result.confirmed)throw Error(result.view.message||t("tasks.confirmationFailed"));
      renderTaskSurface("today",result.view);setCopy(taskSurfaceStatus("today"),"tasks.saved");showTodayAxisEditCopy("tasks.saved");recovery?.close();return true;
    }catch(error){
      if(sameTarget()&&currentTodayView)renderTodayTimeAxis(currentTodayView);
      if(!recovery) {
        recovery=document.createElement("dialog");recovery.dataset.axisTaskRecovery="";recovery.className="today-axis-task-dialog";
        const heading=document.createElement("h3");setCopy(heading,"today.axisTaskMoveRecovery");
        const desired=document.createElement("p");desired.textContent=taskScheduleText(start.date,start.time,executionEnd);
        status=document.createElement("p");status.setAttribute("role","status");status.dataset.axisTaskStatus="";
        const read=document.createElement("button");read.type="button";read.dataset.axisTaskRecheck="";setCopy(read,"tasks.refresh");
        retry=document.createElement("button");retry.type="button";retry.dataset.axisTaskRetry="";retry.disabled=true;setCopy(retry,"tasks.save");
        const cancel=document.createElement("button");cancel.type="button";setCopy(cancel,"today.axisCancel");cancel.addEventListener("click",()=>recovery?.close());
        read.addEventListener("click",()=>{
          if(!sameTarget()){setCopy(status,"tasks.refreshFirst");return;}
          read.disabled=true;
          const operation=(async()=>{try {
            const current=await window.__TAURI__.core.invoke<TasksView>("tasks_view");
            if(!sameTarget()||current.targetBinding!==binding||current.state==="error"||current.state==="unconfigured")throw Error(current.message);
            renderTaskSurface("today",current);
            const found=current.tasks.find(task=>task.id===target!.key);
            if(found&&matches(found)){setCopy(taskSurfaceStatus("today"),"tasks.saved");showTodayAxisEditCopy("tasks.saved");recovery?.close();return true;}
            if(!found||found.deletedAt!==null||found.state==="abandoned"||current.lists.some(list=>list.id===found.listId&&list.archived)) {
              setCopy(status,"today.axisTaskUnavailable");return false;
            }
            // Rebase only the requested timing onto current content/list/state.
            savedTask=found;revision=current.revision;retry!.disabled=false;
            setCopy(status,"today.axisTaskRetry");return false;
          }catch(error){setCopyError(status,"tasks.notSaved",error);return false;}finally{read.disabled=false;}})();
          void pendingWrites.track(operation);
        });
        retry.addEventListener("click",()=>{void pendingWrites.track(save());});
        recovery.append(heading,desired,status,read,retry,cancel);recovery.addEventListener("close",()=>recovery?.remove(),{once:true});
        document.body.append(recovery);recovery.showModal();
      }
      setCopyError(status,"tasks.notSaved",error);return false;
    }finally{updateTaskOperationState(-1);}
  };
  return save();
}

async function moveTodayAxisPlan(change: AxisGestureCommit<TodayView>): Promise<boolean> {
  const loaded = change.context;
  const entry = loaded.timeAxis.currentArrangement.find(entry => entry.planId === change.target?.key);
  if (!entry?.planId || !entry.timeEditable || !loaded.revision || !loaded.targetBinding) return false;
  const sameTarget = () => currentWorkspaceDestination === "today" && currentTodayView?.date === loaded.date &&
    currentTodayView.targetBinding === loaded.targetBinding;
  const precision = entry.planPrecision === "broad" || entry.planPrecision === "approximatePoint"
    ? "approximatePoint" : change.endMinute === null ? "exactPoint" : "exactRange";
  const request = todayPresentationRequests.begin();
  todayPresentationFresh = false;
  updateTodayOperationState(1);
  const recover = (notice: string, savedRevision?: string) => {
    if (!sameTarget() || !todayPresentationRequests.isCurrent(request)) return;
    renderTodayTimeAxis(currentTodayView!);
    showTodayAxisEditCopy(savedRevision ? "today.planSavedNeedsReadback" : "today.planUnconfirmed", "error");
    openPlanTimeEditor(entry, { loaded, startMinute: change.startMinute, endMinute: change.endMinute, notice, savedRevision });
  };
  try {
    const result = await window.__TAURI__.core.invoke<Readonly<{ savedRevision: string; view: TodayView | null; refreshError: string | null }>>("edit_plan_time", {
      input: { date: loaded.date, targetBinding: loaded.targetBinding, expectedRevision: loaded.revision,
        planId: entry.planId, operationId: `plan-drag-${crypto.randomUUID()}`,
        startMinute: change.startMinute, endMinute: change.endMinute, precision },
    });
    if (result.view) {
      if (sameTarget() && todayPresentationRequests.isCurrent(request)) {
        renderToday(result.view);
        showTodayMutationCopy("today.planSaved", "ready");
        showTodayAxisEditCopy("today.planSaved");
      }
      return true;
    }
    recover(result.refreshError ?? t("today.planSavedNeedsReadback"), result.savedRevision);
  } catch (error) {
    recover(String(error));
  } finally {
    updateTodayOperationState(-1);
  }
  return false;
}

function todayAxisGesturePreviewLabel(change: AxisGestureCommit<TodayView>): string {
  const entry = change.target?.kind === "plan"
    ? change.context.timeAxis.currentArrangement.find(entry => entry.planId === change.target?.key) : null;
  const start = formatAxisMinute(change.startMinute);
  const label = entry?.planPrecision === "broad" || entry?.planPrecision === "approximatePoint"
    ? t("today.planApproximateReference", { time: start })
    : change.endMinute === null ? start : `${start}–${formatAxisMinute(change.endMinute)}`;
  return change.startMinute >= 1440 || (change.endMinute ?? 0) >= 1440
    ? `${label} · ${nextAxisDate(change.context.date)}` : label;
}

function resolveTodayAxisGestureTarget(element: Element, loaded: TodayView): AxisGestureTarget | null | false {
  const tasksWritable = canMutateTodayTasks({todayOperationCount, taskOperationCount,
    hasTargetBinding: Boolean(loaded.tasks.targetBinding), state: loaded.tasks.state, isPresentationCurrent: todayPresentationFresh});
  const marker=element.closest<HTMLElement>(".today-axis-marker");if(!marker)return tasksWritable ? null : false;
  const planId = marker.dataset.planId;
  if (planId) {
    const entry = loaded.timeAxis.currentArrangement.find(entry => entry.planId === planId);
    if (!loaded.revision || !loaded.targetBinding || !entry?.timeEditable || entry.startMinute === null || entry.continuesFromPreviousDay || entry.continuesIntoNextDay) return false;
    const resizing = Boolean(element.closest("[data-axis-resize]"));
    if (resizing && (entry.planPrecision !== "exactRange" || entry.endMinute === null)) return false;
    return { key: planId, kind: "plan", startMinute: entry.startMinute, endMinute: entry.endMinute,
      mode: resizing ? "resize-end" : "move" };
  }
  const id=marker.dataset.taskId;if(!tasksWritable || !id)return false;
  const task=loaded.tasks.tasks.find(task=>task.id===id);
  if(!task?.date||!task.time||task.deletedAt!==null||task.state==="abandoned")return false;
  return {key:task.id,kind:"task",startMinute:taskAxisMinute(loaded.date,{date:task.date,time:task.time}),
    endMinute:task.executionEnd?taskAxisMinute(loaded.date,task.executionEnd):null};
}
function commitTodayAxisGesture(change: AxisGestureCommit<TodayView>): void {
  if(!change.target&&change.endMinute!==null)openTodayAxisTaskCreate(change.context,change.startMinute,change.endMinute);
  else if(change.target?.kind==="task")void pendingWrites.track(moveTodayAxisTask(change));
  else if(change.target?.kind==="plan")void pendingWrites.track(moveTodayAxisPlan(change));
}
function showTodayAxisEditCopy(key: InterfaceCopyKey, state: "ready" | "error" = "ready"): void {
  const status=document.querySelector<HTMLElement>("#today-axis-edit-status");
  if(status){setCopy(status,key);status.hidden=false;status.dataset.state=state;}
}
function installTodayAxisGestures(): void {
  const plot=document.querySelector<HTMLElement>("#today-axis-plot");
  const scrollSurface=document.querySelector<HTMLElement>("#today-axis-scroll-surface");
  if(!plot||!scrollSurface)return;
  attachTodayAxisGestures({plot,scrollSurface,bounds:axisBounds,
    begin:()=>{
      if (!currentTodayView || !todayPresentationFresh || todayOperationCount > 0 || taskOperationCount > 0) return null;
      const planWritable = Boolean(currentTodayView.revision && currentTodayView.targetBinding);
      const tasksWritable = canMutateTodayTasks({todayOperationCount,taskOperationCount,
        hasTargetBinding:Boolean(currentTodayView.tasks.targetBinding),state:currentTodayView.tasks.state,isPresentationCurrent:todayPresentationFresh});
      if (!planWritable && !tasksWritable) return null;
      todayAxisFollowState=onManualScroll(todayAxisFollowState);return currentTodayView;
    },
    resolveTarget:resolveTodayAxisGestureTarget,onCommit:commitTodayAxisGesture,previewLabel:todayAxisGesturePreviewLabel,
    onInvalid:()=>{setCopy(taskSurfaceStatus("today"),"today.axisTaskInvalid");showTodayAxisEditCopy("today.axisTaskInvalid","error");},
  });
}

function renderTodayTimeAxisEntries(
  entries: readonly TimedTodayAxisEntry[],
  unlocatedArrangement: readonly TimeAxisEntryView[],
  unlocatedFacts: readonly TimeAxisEntryView[],
): void {
  if (!todayTimedEvents || !todayTimedDurations || !todayTimedDetails || !todayTimedEmpty ||
      !todayCurrentArrangementUnlocated || !todayConfirmedFactsUnlocated) return;
  const laneOrder: Readonly<Record<TimedTodayAxisEntry["lane"], number>> = {
    arrangement: 0,
    facts: 1,
    tasks: 2,
  };
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => (left.entry.startMinute ?? 0) - (right.entry.startMinute ?? 0) ||
      laneOrder[left.entry.lane] - laneOrder[right.entry.lane] || left.index - right.index);
  const detailElements = new Map<number, HTMLDetailsElement>();
  ordered.forEach(({ entry, index }) => {
    detailElements.set(index, axisEntryDetails(entry, entry.lane, index));
  });
  const lowerDetailEntries = ordered.filter(({ entry }) => entry.lane === "facts");
  todayTimedDetails.replaceChildren(...lowerDetailEntries.map(({ index }) => detailElements.get(index)!));
  todayTimedDetails.toggleAttribute("hidden", lowerDetailEntries.length === 0);
  const [visibleStart, visibleEnd] = axisBounds();
  const timedEntries = ordered.filter(({ entry }) => entry.startMinute !== null &&
    entry.startMinute < visibleEnd && (entry.endMinute ?? entry.startMinute) >= visibleStart);
  const hourHeight = Number.parseFloat(
    getComputedStyle(todayContinuousAxis!).getPropertyValue("--today-axis-hour-height"),
  );
  const minimumLabelMinutes = Number.isFinite(hourHeight) && hourHeight > 0
    ? Math.max(TODAY_AXIS_LABEL_MINIMUM_MINUTES, Math.ceil(32 / hourHeight * 60))
    : TODAY_AXIS_LABEL_MINIMUM_MINUTES;
  const visibleEntries = timedEntries.map(({ entry: original, index }) => {
    const entry = { ...original, startMinute: Math.max(original.startMinute!, visibleStart),
      endMinute: original.endMinute === null ? null : Math.min(original.endMinute, visibleEnd) };
    return {
      original,
      entry,
      index,
      markerLayout: axisMarkerLayout(entry, [visibleStart, visibleEnd], minimumLabelMinutes),
    };
  });
  const stackPlacements = axisOverlapPlacements(
    visibleEntries.map(({ entry }) => ({
      startMinute: entry.startMinute!,
      endMinute: entry.endMinute,
    })),
    [visibleStart, visibleEnd],
    minimumLabelMinutes,
  );
  // Dense collisions retain readable targets; the same axis can scroll
  // horizontally in a narrow window rather than clipping every card.
  todayTimedEvents.closest<HTMLElement>(".today-axis-plot")?.style.setProperty(
    "--today-axis-min-track-width", `${Math.max(0, ...stackPlacements.map((placement) => placement.stackSize)) * 144}px`,
  );
  const placementByIndex = new Map(
    visibleEntries.map(({ index }, placementIndex) => [index, stackPlacements[placementIndex]]),
  );
  const markersByStack = new Map<number, HTMLLIElement[]>();
  todayTimedEvents.replaceChildren(
    ...visibleEntries.flatMap(({ original, entry, index, markerLayout }) => {
      const durationMinutes = entry.endMinute === null ? null : entry.endMinute - entry.startMinute;
      const placement = placementByIndex.get(index)!;
      const marker = document.createElement("li");
      marker.className = "today-axis-marker";
      marker.classList.add(
        entry.lane === "arrangement" ? "is-arrangement" :
          entry.lane === "facts" ? "is-fact" : "is-task",
      );
      marker.classList.toggle("is-completed", entry.task?.state === "completed");
      marker.classList.toggle("is-time-passed", entry.task?.timePassed === true);
      if (entry.task) marker.dataset.taskId = entry.task.id;
      const editablePlan = original.lane === "arrangement" &&
        (hasExactPlanTime(original) || original.planPrecision === "broad" || original.planPrecision === "approximatePoint") &&
        original.planId && original.timeEditable &&
        !original.continuesFromPreviousDay && !original.continuesIntoNextDay;
      if (editablePlan) marker.dataset.planId = original.planId!;
      marker.style.setProperty("--axis-top", `${minutePosition(entry.startMinute) * 100}%`);
      marker.style.setProperty(
        "--axis-label-center",
        `${minutePosition(markerLayout.centerMinute) * 100}%`,
      );
      const stackOffset = Math.min(placement.stackIndex, 4) * 5;
      marker.style.setProperty("--axis-stack-offset", `${stackOffset}px`);
      marker.style.zIndex = String(3 + placement.stackIndex);
      marker.style.setProperty("--axis-stack-index", String(placement.stackIndex));
      marker.style.setProperty("--axis-stack-size", String(placement.stackSize));
      marker.style.height = `${markerLayout.heightMinutes / (visibleEnd - visibleStart) * 100}%`;
      marker.dataset.stackId = String(placement.stackId);
      marker.dataset.axisEntryId = detailElements.get(index)!.id;
      marker.classList.toggle("is-stacked", placement.stackSize > 1);
      marker.classList.toggle("is-centered-label", markerLayout.isCenteredLabel);
      markersByStack.set(placement.stackId, [...(markersByStack.get(placement.stackId) ?? []), marker]);

      const readOnlyArrangement = original.lane === "arrangement" && !editablePlan;
      const link = document.createElement(readOnlyArrangement ? "span" : "a");
      if (link instanceof HTMLAnchorElement) {
        link.href = `#today-axis-${entry.lane}-entry-${index}`;
      }
      link.className = "today-axis-marker-link";
      if (readOnlyArrangement) link.classList.add("is-read-only");
      link.draggable = false;
      link.dataset.axisItemTime = axisEntryTimeLabel(original, original.lane);
      link.dataset.axisItemText = entry.text;
      link.dataset.axisMetadataCopyKeys = JSON.stringify(
        axisEntryMetadataCopyKeys(entry, entry.lane),
      );
      updateTodayAxisMarkerAccessibleName(link, currentInterfaceLanguage);
      const timeLabel = document.createElement("span");
      timeLabel.className = "today-axis-marker-time";
      appendAxisEntryTimeLabel(timeLabel, original, original.lane);
      const title = document.createElement("span");
      title.className = "today-axis-marker-title";
      title.textContent = entry.task
        ? entry.text
        : stripLeadingAxisTimeLabel(
          entry.text,
          formatAxisMinute(original.startMinute!),
          original.endMinute === null ? null : formatAxisMinute(original.endMinute),
        );
      const metadata = document.createElement("span");
      metadata.className = "today-axis-marker-source-status";
      appendAxisEntryMetadata(metadata, entry, entry.lane);
      link.append(timeLabel, title, metadata);
      link.classList.toggle("is-short-range", durationMinutes !== null && markerLayout.isCenteredLabel);
      if (!readOnlyArrangement) {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const members = markersByStack.get(placement.stackId) ?? [];
          members.forEach((member) => member.classList.toggle("is-stack-front", member === marker));
          if (editablePlan) {
            openPlanTimeEditor(original);
            return;
          }
          if (entry.task) {
            openTodayAxisTaskPopup(entry.task.id, marker);
            return;
          }
          const target = detailElements.get(index);
          if (!target) return;
          target.open = true;
          todayAxisFollowState = onManualScroll(todayAxisFollowState);
          target.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
      marker.append(link);
      if (editablePlan && original.planPrecision === "exactRange" && original.endMinute !== null) {
        const endHandle = document.createElement("button");
        endHandle.type = "button";
        endHandle.className = "today-axis-plan-end";
        endHandle.dataset.axisResize = "";
        endHandle.dataset.i18nAriaLabel = "today.planResizeEnd";
        endHandle.dataset.i18nTitle = "today.planResizeEnd";
        endHandle.setAttribute("aria-label", t("today.planResizeEnd"));
        endHandle.title = t("today.planResizeEnd");
        if (markerLayout.isCenteredLabel) {
          endHandle.style.top = `calc(50% + var(--today-axis-plot-height) * ${(original.endMinute - markerLayout.centerMinute) / (visibleEnd - visibleStart)})`;
        }
        endHandle.addEventListener("click", () => openPlanTimeEditor(original));
        marker.append(endHandle);
      }

      if (placement.stackSize > 1) {
        const groupCount = stackPlacements.filter(candidate => candidate.stackId === placement.stackId).length;
        const reveal = document.createElement("button");
        reveal.type = "button";
        reveal.className = "today-axis-stack-reveal";
        reveal.dataset.i18nAriaLabel = "today.overlapStackReveal";
        reveal.dataset.i18nTitle = "today.overlapStackReveal";
        reveal.dataset.i18nVariables = JSON.stringify({ count: groupCount });
        const revealLabel = t("today.overlapStackReveal", { count: groupCount });
        reveal.setAttribute("aria-label", revealLabel);
        reveal.title = revealLabel;
        reveal.textContent = `∨ ${groupCount}`;
        reveal.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const members = markersByStack.get(placement.stackId) ?? [];
          const currentIndex = members.findIndex((member) => member.classList.contains("is-stack-front"));
          const next = members[(currentIndex + 1 + members.length) % members.length];
          members.forEach((member) => member.classList.toggle("is-stack-front", member === next));
          next?.querySelector<HTMLAnchorElement>(".today-axis-marker-link")?.focus({ preventScroll: true });
          next?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        marker.append(reveal);
      }
      return [marker];
    }),
  );
  for (const members of markersByStack.values()) {
    if (members.length > 1) members[0].classList.add("is-stack-front");
  }
  todayTimedDurations.replaceChildren(
    ...visibleEntries.flatMap(({ entry, markerLayout }) => {
      if (entry.endMinute !== null && !markerLayout.isCenteredLabel) return [];
      const duration = document.createElement("span");
      duration.className = entry.endMinute === null ? "today-axis-point" : "today-axis-range";
      duration.classList.add(
        entry.lane === "arrangement" ? "is-arrangement" :
          entry.lane === "facts" ? "is-fact" : "is-task",
      );
      duration.style.top = `${minutePosition(entry.startMinute) * 100}%`;
      if (entry.endMinute !== null) duration.style.height = `${(entry.endMinute! - entry.startMinute) / (visibleEnd - visibleStart) * 100}%`;
      return [duration];
    }),
  );
  todayCurrentArrangementUnlocated.replaceChildren(
    ...unlocatedArrangement.map((entry, index) => axisEntryDetails(entry, "arrangement-unlocated", index)),
  );
  todayConfirmedFactsUnlocated.replaceChildren(
    ...unlocatedFacts.map((entry, index) => axisEntryDetails(entry, "facts-unlocated", index)),
  );
  todayCurrentArrangementUnlocated.closest<HTMLElement>(".today-axis-unlocated-lane")?.toggleAttribute(
    "hidden",
    unlocatedArrangement.length === 0,
  );
  todayConfirmedFactsUnlocated.closest<HTMLElement>(".today-axis-unlocated-lane")?.toggleAttribute(
    "hidden",
    unlocatedFacts.length === 0,
  );
  todayTimedEmpty.hidden = entries.length + unlocatedArrangement.length + unlocatedFacts.length > 0;
}

function positionTodayAxisTaskPopup(): void {
  if (!todayAxisTaskPopup?.open) return;
  if (!todayAxisTaskPopupOpener?.isConnected) {
    closeTodayAxisTaskPopup(false, false);
    return;
  }
  const anchor = todayAxisTaskPopupOpener.getBoundingClientRect();
  if (anchor.width === 0 && anchor.height === 0) {
    closeTodayAxisTaskPopup(false, false);
    return;
  }
  const popup = todayAxisTaskPopup.getBoundingClientRect();
  const margin = 12;
  const width = popup.width || Math.min(430, window.innerWidth - margin * 2);
  const height = popup.height || Math.min(340, window.innerHeight - margin * 2);
  const right = anchor.right + 8;
  const leftOfAnchor = anchor.left - width - 8;
  const left = right + width <= window.innerWidth - margin
    ? right
    : leftOfAnchor >= margin
      ? leftOfAnchor
      : Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
  const top = Math.max(margin, Math.min(anchor.top, window.innerHeight - height - margin));
  todayAxisTaskPopup.style.left = `${left}px`;
  todayAxisTaskPopup.style.top = `${top}px`;
}

function closeTodayAxisTaskPopup(discardDraft = false, restoreFocus = true): void {
  if (!todayAxisTaskPopup?.open) return;
  const taskId = todayAxisTaskPopup.dataset.taskId;
  const binding = currentTodayView?.tasks.targetBinding;
  if (discardDraft && taskId && binding) taskEditDrafts.delete(taskDraftKey(binding, taskId));
  todayAxisTaskPopup.dataset.restoreFocus = String(restoreFocus);
  todayAxisTaskPopupContent?.replaceChildren();
  todayAxisTaskPopup.close();
}

function openTodayAxisTaskPopup(taskId: string, marker: HTMLElement, preserveStatus = false): void {
  const view = currentTodayView;
  const stored = view?.tasks.tasks.find((candidate) => candidate.id === taskId);
  if (!view || !stored || !todayAxisTaskPopup || !todayAxisTaskPopupContent || !todayAxisTaskPopupHeading) return;
  const writable = canMutateTodayTasks({
    todayOperationCount,
    taskOperationCount,
    hasTargetBinding: Boolean(view.tasks.targetBinding),
    state: view.tasks.state,
    isPresentationCurrent: todayPresentationFresh,
  });
  const row = taskEditor(stored, writable, view.tasks, "today", true);
  const form = row.querySelector<HTMLFormElement>("form[data-task-editor]");
  if (!form) return;
  if (!preserveStatus && todayAxisTaskPopupStatus) {
    todayAxisTaskPopupStatus.textContent = "";
    delete todayAxisTaskPopupStatus.dataset.state;
  }
  form.classList.remove("task-editor-inline");
  form.classList.add("today-axis-task-popup-form");
  form.querySelector<HTMLButtonElement>("button[data-task-editor-close]")?.remove();
  todayAxisTaskPopupHeading.removeAttribute("data-i18n");
  todayAxisTaskPopupHeading.textContent = stored.name;
  todayAxisTaskPopup.setAttribute("aria-label", t("tasks.editLabel", { task: stored.name }));
  todayAxisTaskPopup.dataset.taskId = taskId;
  todayAxisTaskPopup.dataset.restoreFocus = "true";
  todayAxisTaskPopupOpener = marker.querySelector<HTMLElement>(".today-axis-marker-link") ?? marker;
  todayAxisTaskPopupContent.replaceChildren(form);
  if (!todayAxisTaskPopup.open) todayAxisTaskPopup.show();
  window.requestAnimationFrame(() => {
    positionTodayAxisTaskPopup();
    form.querySelector<HTMLInputElement>("[data-task-name]")?.focus({ preventScroll: true });
  });
}

function updateTodayTimeAxisClock(view: TodayView, currentTime = view.currentTime): void {
  if (!todayContinuousAxis) return;
  const currentMinute = currentTime ? livedAxisMinute(currentTime) : null;
  const showNow = view.isToday && currentMinute !== null;
  todayContinuousAxis.dataset.hasNow = String(showNow);
  todayContinuousAxis.classList.toggle("is-today", showNow);
  todayContinuousAxis.querySelectorAll<HTMLElement>(".today-axis-plot").forEach((plot) => {
    plot.classList.toggle("is-today", showNow);
    const plotBounds = plot.getBoundingClientRect();
    const currentY = currentMinute === null || plotBounds.height === 0
      ? Number.NaN
      : plotBounds.top + plotBounds.height * minutePosition(currentMinute);
    const nowCoveredByCard = Number.isFinite(currentY) &&
      [...plot.querySelectorAll<HTMLElement>(".today-axis-marker")].some((marker) => {
        const cardBounds = marker.getBoundingClientRect();
        return cardBounds.height > 0 && currentY >= cardBounds.top && currentY <= cardBounds.bottom;
      });
    plot.classList.toggle("is-now-covered", showNow && nowCoveredByCard);
  });
  todayHourTicks?.querySelectorAll<HTMLElement>(".today-hour-tick").forEach((tick) => {
    const tickMinute = Number(tick.dataset.minute);
    tick.hidden = tickMinute < axisBounds()[0] || tickMinute > axisBounds()[1] || !Number.isInteger(tickMinute) || !hourTickIsClearFromNow(tickMinute, showNow ? currentMinute : null);
  });
  if (todayLocateNowButton) todayLocateNowButton.hidden = !showNow;
  if (showNow && currentMinute !== null && todayCurrentTime) {
    todayContinuousAxis.style.setProperty(
      "--today-now-position",
      `${minutePosition(currentMinute) * 100}%`,
    );
    todayCurrentTime.textContent = currentMinute >= 1440 ? `${nextAxisDate(view.date)} ${currentTime}` : currentTime;
    todayCurrentTime.dateTime = `${currentMinute >= 1440 ? nextAxisDate(view.date) : view.date}T${currentTime}`;
    todayCurrentTime.hidden = false;
  } else if (todayCurrentTime) {
    todayCurrentTime.hidden = true;
    todayCurrentTime.textContent = "";
    todayCurrentTime.removeAttribute("datetime");
  }
}

function renderTodayTimeAxis(view: TodayView, currentTime = view.currentTime): void {
  if (!todayContinuousAxis) return;
  const entries: readonly TimedTodayAxisEntry[] = [
    ...view.timeAxis.currentArrangement.map((entry) => ({ ...entry, lane: "arrangement" as const })),
    ...view.timeAxis.confirmedFacts.map((entry) => ({ ...entry, lane: "facts" as const })),
    ...todayTaskTimeAxisEntries(view.tasks.tasks, view.date,
      new Set(view.tasks.lists.filter((list) => list.archived).map((list) => list.id)),
    ).map((entry) => ({ ...entry, lane: "tasks" as const })),
  ];
  const earlyCount = entries.filter((entry) => entry.startMinute !== null && entry.startMinute < 360).length;
  const lateCount = entries.filter((entry) => entry.startMinute !== null &&
    (entry.endMinute ?? entry.startMinute) >= 1440).length;
  if (todayAxisRenderedDate !== view.date) {
    todayAxisRenderedDate = view.date;
    todayUnlocatedOverride = null;
    todaySidebarReadingPosition = null;
    const now = view.isToday && currentTime ? livedAxisMinute(currentTime) : null;
    todayAxisEarlyExpanded = now !== null && now < 360;
    todayAxisLateExpanded = now !== null && now >= 1440;
  }
  const zoomHeight = todayAxisZoomHeights[todayAxisZoomLevel];
  if (zoomHeight) todayContinuousAxis.style.setProperty("--today-axis-hour-height", zoomHeight);
  else todayContinuousAxis.style.removeProperty("--today-axis-hour-height");
  todayContinuousAxis.style.setProperty("--today-axis-plot-height", `calc(${(axisBounds()[1] - axisBounds()[0]) / 60} * var(--today-axis-hour-height))`);
  const zoomOut = document.getElementById("today-axis-zoom-out") as HTMLButtonElement | null;
  const zoomIn = document.getElementById("today-axis-zoom-in") as HTMLButtonElement | null;
  if (zoomOut) zoomOut.disabled = todayAxisZoomLevel === 0;
  if (zoomIn) zoomIn.disabled = todayAxisZoomLevel === todayAxisZoomHeights.length - 1;
  for (const [id, expanded] of [["today-expand-early", todayAxisEarlyExpanded], ["today-expand-late", todayAxisLateExpanded]] as const) {
    const button = document.getElementById(id);
    if (button) {
      button.setAttribute("aria-expanded", String(expanded));
      setCopy(button, id === "today-expand-early"
        ? (expanded ? "today.expandEarlyExpanded" : "today.expandEarlyCollapsed")
        : (expanded ? "today.expandLateExpanded" : "today.expandLateCollapsed"));
      const count = id === "today-expand-early" ? earlyCount : lateCount;
      if (count) button.textContent += ` · ${t("today.axisPeriodItemCount", { count })}`;
    }
  }
  todayHourTicks?.replaceChildren(
    ...hourTickMinutes().map((minute) => {
      const tick = document.createElement("span");
      tick.className = "today-hour-tick";
      tick.dataset.minute = String(minute);
      tick.style.top = `${minutePosition(minute) * 100}%`;
      tick.textContent = formatAxisMinute(minute);
      if (minute >= 1440) {
        const dateLabel = document.createElement("small");
        dateLabel.textContent = nextAxisDate(view.date);
        tick.prepend(dateLabel);
      }
      tick.setAttribute("aria-hidden", "true");
      return tick;
    }),
  );
  if (todayHourTicks && todayCurrentTime) todayHourTicks.append(todayCurrentTime);
  renderTodayTimeAxisEntries(
    entries,
    view.timeAxis.unlocatedCurrentArrangement,
    view.timeAxis.unlocatedConfirmedFacts,
  );
  todayUnlocatedCount = view.timeAxis.unlocatedCurrentArrangement.length + view.timeAxis.unlocatedConfirmedFacts.length;
  updateTodayUnlocatedPresentation();
  updateTodayTimeAxisClock(view, currentTime);
}

// Disclosures change only the visible window of the same lived day. Preserve
// the minute at the reader's viewport edge rather than locating the clock.
function toggleTodayAxisSegment(id: string): void {
  if (!currentTodayView) return;
  const plot = todayContinuousAxis?.querySelector<HTMLElement>(".today-axis-plot");
  const scrollSurface = todayAxisScrollSurface ?? workspaceInformation;
  const viewport = scrollSurface?.getBoundingClientRect();
  const oldPlot = plot?.getBoundingClientRect();
  const [start, end] = axisBounds();
  const anchorY = viewport && oldPlot ? Math.max(viewport.top, oldPlot.top) : null;
  const anchorMinute = anchorY !== null && oldPlot && viewport && oldPlot.height > 0 &&
    oldPlot.bottom > viewport.top && oldPlot.top < viewport.bottom
    ? start + (anchorY - oldPlot.top) / oldPlot.height * (end - start) : null;
  const details = [...(todayTimedDetails?.querySelectorAll<HTMLDetailsElement>("details") ?? [])];
  const openDetails = new Set(details.filter((detail) => detail.open).map((detail) => detail.id));
  const detailAnchor = viewport && anchorMinute === null
    ? details.find((detail) => {
      const rect = detail.getBoundingClientRect();
      return rect.bottom > viewport.top && rect.top < viewport.bottom;
    }) : null;
  const detailY = detailAnchor?.getBoundingClientRect().top;
  const frontEntries = new Set(
    [...(todayTimedEvents?.querySelectorAll<HTMLElement>(".is-stack-front") ?? [])]
      .map((marker) => marker.dataset.axisEntryId),
  );
  if (id === "today-expand-early") todayAxisEarlyExpanded = !todayAxisEarlyExpanded;
  else todayAxisLateExpanded = !todayAxisLateExpanded;
  todayAxisFollowState = onManualScroll(todayAxisFollowState);
  renderTodayTimeAxis(currentTodayView);
  todayTimedDetails?.querySelectorAll<HTMLDetailsElement>("details").forEach((detail) => {
    detail.open = openDetails.has(detail.id);
  });
  todayTimedEvents?.querySelectorAll<HTMLElement>(".today-axis-marker").forEach((marker) => {
    // Keep a revealed member at the front when its stack still exists.
    if (frontEntries.has(marker.dataset.axisEntryId)) {
      const members = todayTimedEvents?.querySelectorAll<HTMLElement>(".today-axis-marker") ?? [];
      members.forEach((member) => {
        if (member.dataset.stackId === marker.dataset.stackId) {
          member.classList.toggle("is-stack-front", member === marker);
        }
      });
    }
  });
  if (!scrollSurface) return;
  let delta = 0;
  if (anchorMinute !== null && anchorY !== null && plot) {
    const next = plot.getBoundingClientRect();
    const [nextStart, nextEnd] = axisBounds();
    const minute = Math.max(nextStart, Math.min(nextEnd, anchorMinute));
    delta = next.top + (minute - nextStart) / (nextEnd - nextStart) * next.height - anchorY;
  } else if (detailAnchor && detailY !== undefined) {
    const next = document.getElementById(detailAnchor.id);
    if (next) delta = next.getBoundingClientRect().top - detailY;
  }
  if (delta !== 0) {
    scrollSurface.scrollTo({ top: scrollSurface.scrollTop + delta, behavior: "instant" });
  }
}

function adjustTodayAxisZoom(delta: number): void {
  if (!currentTodayView || !todayContinuousAxis) return;
  const scrollSurface = todayAxisScrollSurface ?? workspaceInformation;
  const viewport = scrollSurface?.getBoundingClientRect();
  const plot = todayContinuousAxis.querySelector<HTMLElement>(".today-axis-plot");
  const oldPlot = plot?.getBoundingClientRect();
  const [start, end] = axisBounds();
  const anchorY = viewport && oldPlot ? Math.max(viewport.top, oldPlot.top) : null;
  const anchorMinute = anchorY !== null && oldPlot && viewport && oldPlot.height > 0 &&
    oldPlot.bottom > viewport.top && oldPlot.top < viewport.bottom
    ? start + (anchorY - oldPlot.top) / oldPlot.height * (end - start) : null;
  todayAxisZoomLevel = Math.max(0, Math.min(todayAxisZoomHeights.length - 1, todayAxisZoomLevel + delta));
  todayAxisFollowState = onManualScroll(todayAxisFollowState);
  renderTodayTimeAxis(currentTodayView);
  if (!scrollSurface || anchorMinute === null || anchorY === null || !plot) return;
  const next = plot.getBoundingClientRect();
  const [nextStart, nextEnd] = axisBounds();
  const minute = Math.max(nextStart, Math.min(nextEnd, anchorMinute));
  const nextY = next.top + (minute - nextStart) / (nextEnd - nextStart) * next.height;
  scrollSurface.scrollTo({ top: scrollSurface.scrollTop + nextY - anchorY, behavior: "instant" });
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
  todayPhaseSelectionRevision += 1;
  const phaseChanged = currentTodayPhase !== phase;
  currentTodayPhase = phase;
  if (todayReady) {
    todayReady.dataset.phase = phase;
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
  if (phaseChanged) {todayUnlocatedOverride = null;todaySidebarReadingPosition = null;}
  updateTodayUnlocatedPresentation();
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

function stashEveningReviewDraft(): void {
  const binding = currentTodayView?.targetBinding;
  if (!binding || !todayEveningContent || !todayEveningMode) return;
  if (todayEveningContent.value) {
    eveningReviewDrafts.set(binding, { content: todayEveningContent.value, mode: todayEveningMode.value });
  } else {
    eveningReviewDrafts.delete(binding);
  }
}

function hasTodayEditingTarget(view: TodayView): boolean {
  stashDatedNoteDraft();
  stashEveningReviewDraft();
  stashTodayTaskCreateDraft();
  return Boolean(
    (view.targetBinding && (datedNoteDrafts.has(view.targetBinding) || eveningReviewDrafts.has(view.targetBinding))) ||
    (view.tasks.targetBinding && todayTaskCreateDrafts.has(todayTaskCreateDraftKey(view.tasks.targetBinding, view.date))) ||
    taskEditorForms("today").some((form) => !form.hidden ||
      (view.tasks.targetBinding && form.dataset.taskEditor &&
        taskEditDrafts.has(taskDraftKey(view.tasks.targetBinding, form.dataset.taskEditor)))) ||
    todayOperationCount > 0 || taskOperationCount > 0
  );
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

function captureTodayTaskEditors(view: TodayView): Set<string> {
  const open = new Set<string>();
  const previous = currentTodayView;
  const binding = previous?.tasks.targetBinding;
  if (!previous || !binding || previous.date !== view.date || binding !== view.tasks.targetBinding) {
    return open;
  }
  for (const form of taskEditorForms("today")) {
    const id = form.dataset.taskEditor;
    const task = previous.tasks.tasks.find((candidate) => candidate.id === id);
    if (form.hidden || !id || !task || !view.tasks.tasks.some((candidate) => candidate.id === id)) continue;
    open.add(id);
    const draft = readTaskDraft(form);
    const key = taskDraftKey(binding, id);
    if (
      draft.name !== task.name || draft.content !== (task.content ?? "") ||
      draft.date !== (task.date ?? "") || draft.time !== (task.time ?? "") ||
      draft.endDate !== (task.executionEnd?.date ?? "") || draft.endTime !== (task.executionEnd?.time ?? "") ||
      draft.listId !== task.listId || draft.completionDate !== (task.completion?.completedOn ?? "") ||
      draft.completionTime !== (task.completion?.completedTime ?? "")
    ) {
      taskEditDrafts.set(key, draft);
    } else {
      taskEditDrafts.delete(key);
    }
  }
  return open;
}

function renderToday(view: TodayView, preserveTaskEditors = false): void {
  closeTodayAxisTaskPopup(false, false);
  const openTaskEditors = preserveTaskEditors ? captureTodayTaskEditors(view) : new Set<string>();
  stashEveningReviewDraft();
  todayPresentationFresh = true;
  const previousView = currentTodayView;
  const startsTodaySession = view.isToday && (
    previousView === null ||
    previousView.date !== view.date ||
    previousView.targetBinding !== view.targetBinding
  );
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
  renderTodayTasks(view, openTaskEditors);
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
  renderTodayTimeAxis(view);
  if (todayDaytimeForm) {
    todayDaytimeForm.hidden = !view.canRecord;
  }
  eveningReviewEntry?.render();
  if (todayEveningForm) {
    todayEveningForm.hidden = !view.canRecord;
  }
  const eveningDraft = view.targetBinding ? eveningReviewDrafts.get(view.targetBinding) : undefined;
  if (todayEveningContent) todayEveningContent.value = eveningDraft?.content ?? "";
  if (todayEveningMode) todayEveningMode.value = eveningDraft?.mode ?? "addition";

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
    setCopy(todayDaytimeCount, "count.items", {
      count:
        view.timeAxis.currentArrangement.length +
        view.timeAxis.confirmedFacts.length +
        view.timeAxis.unlocatedCurrentArrangement.length +
        view.timeAxis.unlocatedConfirmedFacts.length,
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
  const arrival = !view.isToday ? historicalHabitArrival.forDate(view.date) : null;
  if (arrival) {
    showTodayPhase("daytime");
    window.requestAnimationFrame(() => {
      if (
        currentWorkspaceDestination !== "today" ||
        !historicalHabitCorrections ||
        historicalHabitCorrections.hidden ||
        !historicalHabitArrival.consume(arrival, currentTodayView?.date ?? null)
      ) return;
      historicalHabitCorrections.scrollIntoView({ block: "start" });
      historicalHabitCorrections.focus({ preventScroll: true });
    });
  }
  if (startsTodaySession) {
    todayAxisFollowState = "following";
    scheduleTodayAxisFollowScroll();
  }
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
  const untouchedDefault = !draft.name && !draft.content && draft.date === view.date && !draft.time && draft.listId === "inbox";
  if (untouchedDefault) {
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

function renderTodayTasks(
  view: TodayView,
  openEditors = new Set<string>(),
  preserveAxisPopup = false,
): void {
  if (!preserveAxisPopup) closeTodayAxisTaskPopup(false, false);
  clearTaskEditorDialogs("today");
  const shared = view.tasks;
  const archivedListIds = new Set(
    shared.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const groups = todayTaskGroups(shared.tasks, view.date, view.isToday, archivedListIds);
  const writable = canMutateTodayTasks({
    todayOperationCount,
    taskOperationCount,
    hasTargetBinding: Boolean(shared.targetBinding),
    state: shared.state,
    isPresentationCurrent: todayPresentationFresh,
  });
  const { main: scheduled, history: completed } = taskDisplaySections(groups.scheduled, "all");
  const displayedCount = scheduled.length + groups.overdue.length;
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
      ...scheduled.map((task) => taskEditor(task, writable, shared, "today", openEditors.has(task.id))),
      ...(completed.length ? [taskHistorySection(completed, shared, "today", true, openEditors)!] : []),
    );
  }
  if (todayTaskOverdueCount) {
    setCopy(todayTaskOverdueCount, "today.tasksCount", { count: groups.overdue.length });
  }
  todayTaskOverdueSection?.toggleAttribute("hidden", groups.overdue.length === 0);
  if (todayTaskOverdue) {
    todayTaskOverdue.replaceChildren(
      ...groups.overdue.map((task) => taskEditor(task, writable, shared, "today", openEditors.has(task.id))),
    );
  }
  if (todayTaskOverdueEmpty) {
    todayTaskOverdueEmpty.hidden = groups.overdue.length > 0 || shared.state === "error";
  }
  const draftKey = shared.targetBinding
    ? todayTaskCreateDraftKey(shared.targetBinding, view.date)
    : null;
  const attempt = draftKey ? taskCreateAttempts.get(draftKey) : undefined;
  const draft = attempt?.draft ?? (draftKey ? todayTaskCreateDrafts.get(draftKey) : undefined);
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
        t("tasks.quickAdd"),
      );
    }
    if (todayTaskCreateName) todayTaskCreateName.value = draft?.name ?? "";
    if (todayTaskCreateContent) todayTaskCreateContent.value = draft?.content ?? "";
    if (todayTaskCreateDate) todayTaskCreateDate.value = draft?.date ?? view.date;
    if (todayTaskCreateTime) todayTaskCreateTime.value = draft?.time ?? "";
    normalizeTaskDateTimeFields(todayTaskCreateDate, todayTaskCreateTime, !writable);
    updateCompactScheduleLabel("today-task-create", todayTaskCreateDate, todayTaskCreateTime);
    todayTaskCreateSubmit?.toggleAttribute("disabled", !writable);
    updateTodayTaskCreationControls();
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
  const todayTasksWritable = canMutateTodayTasks({
    todayOperationCount,
    taskOperationCount,
    hasTargetBinding: Boolean(currentTodayView?.tasks.targetBinding),
    state: currentTodayView?.tasks.state ?? "unconfigured",
    isPresentationCurrent: todayPresentationFresh,
  });
  selectTodayVaultButton?.toggleAttribute(
    "disabled",
    busy || taskBusy || vaultSelectionInProgress,
  );
  refreshTodayButton?.toggleAttribute("disabled", busy || taskBusy);
  todayDaytimeForm?.querySelector("button")?.toggleAttribute("disabled", busy || taskBusy);
  todayEveningForm?.querySelector("button")?.toggleAttribute("disabled", busy || taskBusy);
  todayTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy || !todayTasksWritable;
  });
  todayTaskCreateForm?.toggleAttribute("hidden", !todayTasksWritable);
  todayTaskScheduled?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy || !todayTasksWritable;
  });
  todayTaskOverdue?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || taskBusy || !todayTasksWritable;
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
      renderToday(preserveTodayDayTaskPlanError(loaded, view), true);
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
  if (!loaded?.revision || !loaded.targetBinding || todayOperationCount > 0) {
    showTodayMutationCopy("today.refreshBeforeSave", "error");
    return false;
  }
  const expectedRevision = loaded.revision;
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TodayView>(command, {
      input: { ...input, expectedRevision },
      date: loaded.date,
      targetBinding: loaded.targetBinding,
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
  if (
    !supersede &&
    !canStartManualTodayRefresh(todayOperationCount, taskOperationCount)
  ) {
    return;
  }
  if (date === null && currentTodayView && hasTodayEditingTarget(currentTodayView)) {
    date = currentTodayView.date;
  }
  const phaseSelectionRevision = todayPhaseSelectionRevision;
  await refreshTodayPresentation({
    requests: todayPresentationRequests,
    date,
    invoke: (command, args) => window.__TAURI__.core.invoke<TodayView>(command, args),
    currentDate: currentTodayView?.date ?? null,
    viewDate: (view) => view.date,
    defaultPhase: (view) => view.defaultPhase,
    onPhase: (phase) => {
      // Record links and user tab selection may happen after the read starts.
      // The source's default phase must not overwrite that newer choice.
      if (todayPhaseSelectionRevision === phaseSelectionRevision) currentTodayPhase = phase;
    },
    onPresent: renderToday,
    onError: (error) => {
      todayPresentationFresh = false;
      if (todayStatus) {
        setCopyError(todayStatus, "today.loadFailed", error);
        todayStatus.dataset.state = "error";
      }
    },
    onOperationCountChanged: (delta) => {
      if (delta > 0) todayPresentationFresh = false;
      updateTodayOperationState(delta);
    },
    waitForPendingWrites: () => pendingWrites.wait(),
  });
}

function scrollTodayAxisToNow(): void {
  const now = currentTodayView?.isToday && currentTodayView.currentTime ? livedAxisMinute(currentTodayView.currentTime) : null;
  if (now !== null && currentTodayView && ((now < 360 && !todayAxisEarlyExpanded) || (now >= 1440 && !todayAxisLateExpanded))) {
    if (now < 360) todayAxisEarlyExpanded = true;
    if (now >= 1440) todayAxisLateExpanded = true;
    renderTodayTimeAxis(currentTodayView);
  }
  if (
    currentWorkspaceDestination !== "today" ||
    !currentTodayView?.isToday ||
    !todayCurrentTime ||
    todayCurrentTime.hidden ||
    todayCurrentTime.getClientRects().length === 0
  ) {
    return;
  }
  todayAxisFollowState = locateNow(todayAxisFollowState);
  programmaticTodayAxisScrollUntil = Date.now() + 1200;
  if (todayAxisScrollSurface) {
    const viewport = todayAxisScrollSurface.getBoundingClientRect();
    const marker = todayCurrentTime.getBoundingClientRect();
    todayAxisScrollSurface.scrollTo({
      top: todayAxisScrollSurface.scrollTop + marker.top - viewport.top - viewport.height / 2,
      behavior: "instant",
    });
  }
  window.setTimeout(() => {
    programmaticTodayAxisScrollUntil = 0;
  }, 1300);
}

function scheduleTodayAxisFollowScroll(): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (todayAxisFollowState === "following") scrollTodayAxisToNow();
    });
  });
}

async function refreshTodayClock(): Promise<void> {
  if (currentWorkspaceDestination !== "today" || !currentTodayView) return;
  const requestedView = currentTodayView;
  const requestedSession: TodayAxisSession = {
    date: requestedView.date,
    targetBinding: requestedView.targetBinding,
  };
  const request = todayClockRequests.begin();
  let clock: TodayClockView;
  try {
    clock = await window.__TAURI__.core.invoke<TodayClockView>("today_clock");
  } catch {
    return;
  }
  if (!todayClockRequests.isCurrent(request) || currentWorkspaceDestination !== "today") return;
  const current = currentTodayView;
  if (
    !current ||
    !clockResultMatchesSession(requestedSession, {
      date: current.date,
      targetBinding: current.targetBinding,
    })
  ) {
    return;
  }
  const hasEditingTarget = hasTodayEditingTarget(current);
  const decision = clockTickDecision(selectedTodayDate, current.date, clock.livedDate, hasEditingTarget);
  if (selectedTodayDate === null && current.date !== clock.livedDate && hasEditingTarget) {
    selectedTodayDate = current.date;
  }
  if (decision === "reload-today") {
    await refreshToday(null, true);
    return;
  }
  if (decision === "update-marker") {
    const updated = { ...current, isToday: true, currentTime: clock.time };
    currentTodayView = updated;
    updateTodayTimeAxisClock(updated, clock.time);
    if (todayAxisFollowState === "following") scrollTodayAxisToNow();
    return;
  }
  const historical = { ...current, isToday: false, currentTime: null };
  currentTodayView = historical;
  if (todayDate) {
    setCopy(todayDate, "today.selectedDate", { date: historical.date });
  }
  updateTodayTimeAxisClock(historical, null);
}

async function selectTodayVault(): Promise<void> {
  if (vaultSelectionInProgress) {
    return;
  }
  const unboundComposer = currentCollaborationSession ? null : {
    draft: collaborationMessageDraft?.value ?? collaborationEmptyDraft,
    active: collaborationEmptyComposerActive,
    targetDate: collaborationEmptyTargetDate,
    activityDate: collaborationActivityDate,
    activityDateExplicit: collaborationActivityDateExplicit,
  };
  const restoreUnboundComposer = () => {
    if (!unboundComposer || currentCollaborationSession) return;
    collaborationEmptyDraft = unboundComposer.draft;
    collaborationEmptyComposerActive = unboundComposer.active || Boolean(unboundComposer.draft);
    collaborationEmptyTargetDate = unboundComposer.targetDate;
    collaborationActivityDate = unboundComposer.activityDate;
    collaborationActivityDateExplicit = unboundComposer.activityDateExplicit;
    collaborationTargetDate = unboundComposer.targetDate ?? unboundComposer.activityDate;
    if (collaborationMessageDraft) collaborationMessageDraft.value = unboundComposer.draft;
  };
  vaultSelectionInProgress = true;
  collaborationVaultSelectionRevision += 1;
  collaborationVaultSwitchDraftWrites = [...collaborationDraftWrites.values()];
  try {
    await prepareCollaborationForVaultSwitch();
  } catch (error) {
    collaborationVaultSwitchDraftWrites = null;
    vaultSelectionInProgress = false;
    renderCollaborationWorkspace();
    renderPendingWriteFailure();
    if (collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.draftSaveFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
    return;
  }
  const selectionRequest = vaultSelectionRequests.begin();
  const presentationRequest = todayPresentationRequests.begin();
  updateTodayOperationState(1);
  try {
    const selectionOutcome = await selectVaultAndRefresh(
      () =>
        window.__TAURI__.core.invoke<VaultSelectionResult<TodayView>>(
          "select_today_vault",
          { interfaceLanguage: currentInterfaceLanguage },
        ),
      {
        isCurrent: () => vaultSelectionRequests.isCurrent(selectionRequest),
        isPresentationCurrent: () => todayPresentationRequests.isCurrent(presentationRequest),
        currentDestination: () => currentWorkspaceDestination,
        waitForPendingWrites: async () => {
          if (!await waitForPendingWrites()) return false;
          // Existing asynchronous saves may settle while other panes wait.
          // Check their retained outcomes immediately before the picker.
          try {
            await drainCollaborationDraftsForVaultSwitch();
            return true;
          } catch {
            return false;
          }
        },
        renderPendingWriteFailure,
        prepareForVaultSwitch: (view) => {
          resetVaultScopedWorkspaceState();
          restoreUnboundComposer();
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
    if (selectionOutcome === "changed" || selectionOutcome === "reconciled") restoreUnboundComposer();
  } catch (error) {
    if (vaultSelectionRequests.isCurrent(selectionRequest)) {
      renderVaultSelectionError(error);
    }
  } finally {
    collaborationVaultSwitchDraftWrites = null;
    vaultSelectionInProgress = false;
    restoreUnboundComposer();
    renderCollaborationWorkspace();
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
  error: { label: "calendar.readError", marker: "calendar.markerError" },
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

function updateCalendarTaskPreviewRows(): void {
  if (!calendarGrid) return;

  const cells = Array.from(calendarGrid.querySelectorAll<HTMLButtonElement>(".calendar-day"));
  const firstCell = cells.find((cell) =>
    cell.querySelector<HTMLElement>(".calendar-day-task-summary"),
  );
  const firstSummary = firstCell?.querySelector<HTMLElement>(".calendar-day-task-summary");
  const firstSummaries = firstCell?.querySelector<HTMLElement>(".calendar-day-task-summaries");
  const summaryStyle = firstSummary ? window.getComputedStyle(firstSummary) : null;
  const summariesStyle = firstSummaries ? window.getComputedStyle(firstSummaries) : null;
  const lineHeight = summaryStyle
    ? Number.parseFloat(summaryStyle.lineHeight) ||
      (Number.parseFloat(summaryStyle.fontSize) || 10) * 1.25
    : 12;
  const summaryGap = summariesStyle
    ? Number.parseFloat(summariesStyle.rowGap || summariesStyle.gap) || 0
    : 0;

  for (const cell of cells) {
    const summaries = cell.querySelector<HTMLElement>(".calendar-day-task-summaries");
    const top = cell.querySelector<HTMLElement>(".calendar-day-top");
    if (!summaries || !top) continue;

    const items = Array.from(summaries.querySelectorAll<HTMLElement>(".calendar-day-task-summary"));
    const cellStyle = window.getComputedStyle(cell);
    const topStyle = window.getComputedStyle(top);
    const summariesStyle = window.getComputedStyle(summaries);
    const topMargin = Number.parseFloat(topStyle.marginBottom) || 0;
    const summariesMargin = Number.parseFloat(summariesStyle.marginTop) || 0;
    const borders =
      (Number.parseFloat(cellStyle.borderTopWidth) || 0) +
      (Number.parseFloat(cellStyle.borderBottomWidth) || 0);
    const padding =
      (Number.parseFloat(cellStyle.paddingTop) || 0) +
      (Number.parseFloat(cellStyle.paddingBottom) || 0);
    const available = Math.max(
      0,
      cell.getBoundingClientRect().height - borders - padding -
        top.getBoundingClientRect().height - topMargin - summariesMargin,
    );
    const capacity = Math.min(
      items.length,
      Math.max(0, Math.floor((available + summaryGap + 0.001) / (lineHeight + summaryGap))),
    );
    items.forEach((item, index) => {
      item.hidden = index >= capacity;
    });

    const baseOverflow = Number.parseInt(cell.dataset.calendarTaskOverflowBase ?? "0", 10) || 0;
    const overflowCount = baseOverflow + Math.max(0, items.length - capacity);
    const overflow = cell.querySelector<HTMLElement>(".calendar-day-task-overflow");
    if (overflow) {
      overflow.dataset.calendarTaskOverflow = String(overflowCount);
      if (overflowCount > 0) {
        setCopy(overflow, "calendar.taskOverflow", { count: overflowCount });
      } else {
        setRawText(overflow, "");
      }
    }
    const accessibleBase = cell.dataset.calendarTaskAriaBase ?? cell.getAttribute("aria-label") ?? "";
    cell.setAttribute(
      "aria-label",
      [
        accessibleBase,
        overflowCount > 0 ? t("calendar.taskOverflow", { count: overflowCount }) : "",
      ].filter(Boolean).join(" · "),
    );
  }
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
    calendarGrid.style.setProperty("--calendar-week-count", String(month.days.length / 7));
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
        const accessibleBase = [
          calendarDateLabel(day.date),
          day.isToday ? t("calendar.today") : "",
          t(status.label),
          taskNames,
        ].filter(Boolean).join(" · ");
        button.dataset.calendarTaskAriaBase = accessibleBase;
        button.dataset.calendarTaskOverflowBase = String(day.taskOverflowCount);
        button.setAttribute("aria-label", [accessibleBase, taskOverflowLabel].filter(Boolean).join(" · "));
        button.setAttribute("aria-pressed", String(selected));
        const top = document.createElement("span");
        top.className = "calendar-day-top";
        const number = document.createElement("strong");
        number.textContent = String(dayNumber);
        const todayLabel = document.createElement("small");
        if (day.isToday) setCopy(todayLabel, "calendar.today");
        top.append(number);
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
        top.append(marker, todayLabel, overflow);
        button.append(top, taskSummaries);
        return button;
      }),
    );
    updateCalendarTaskPreviewRows();
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
  if (view.state === "ready" || view.state === "missing") {
    const plan = document.createElement("section");
    plan.className = "calendar-daily-plan-preview";
    const planHeading = document.createElement("h4");
    setCopy(planHeading, "calendar.dailyPlanPreview");
    plan.append(planHeading);
    if (view.timeline.length === 0) {
      const empty = document.createElement("p");
      setCopy(empty, "calendar.dailyPlanPreviewEmpty");
      plan.append(empty);
    } else {
      const blocks = document.createElement("ol");
      for (const block of view.timeline) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = t("collaboration.dailyPlanPeriodTitle", {
          period: block.period,
          title: block.title,
        });
        item.append(title);
        if (block.detail) {
          const detail = document.createElement("p");
          detail.textContent = block.detail;
          item.append(detail);
        }
        blocks.append(item);
      }
      plan.append(blocks);
    }
    if (view.evidence.length > 0) {
      const evidenceHeading = document.createElement("h5");
      setCopy(evidenceHeading, "collaboration.dailyPlanCurrentBasis");
      const evidence = document.createElement("ul");
      for (const group of view.evidence) {
        const item = document.createElement("li");
        item.textContent = group.items.length > 0
          ? `${group.label}: ${group.items.join(" · ")}`
          : group.label;
        evidence.append(item);
      }
      plan.append(evidenceHeading, evidence);
    }
    calendarSummaryCopy.append(plan);
  }
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

function habitGoalTargetLabel(goal: HabitGoalTarget): string {
  switch (goal.kind) {
    case "daily-completion":
      return t("habits.goalDaily");
    case "weekly-count":
      return t("habits.goalWeeklyValue", { count: goal.standard });
    case "daily-time":
      return t("habits.goalDailyTimeValue", {
        time: goal.standard,
        relation: t(
          goal.dayRelation === "same-day"
            ? "habits.sameDay"
            : goal.dayRelation === "next-day"
              ? "habits.nextDay"
              : "habits.unresolved",
        ),
      });
  }
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
    Boolean(currentHabitSnapshot?.catalogError || currentHabitSnapshot?.completionError) ||
    (!["ready", "stale"].includes(currentHabitSnapshot?.state ?? "unconfigured") &&
      !currentHabitSnapshot?.catalogRevision);
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

function setHabitHistoryDisclosureCopy(
  button: HTMLButtonElement,
  habit: HabitView,
  expanded: boolean,
): void {
  const labelKey = expanded ? "habits.collapseHistoryFor" : "habits.expandHistoryFor";
  const variables = { habit: displayHabitName(habit) };
  setCopy(button, expanded ? "habits.collapse" : "habits.expand", variables);
  button.dataset.i18nAriaLabel = labelKey;
  button.setAttribute("aria-label", t(labelKey, variables));
}

function habitRow(habit: HabitView): HTMLElement {
  const article = document.createElement("article");
  article.className = "habit-snapshot-row";
  article.dataset.habitKey = habit.key;
  article.title = t("habits.editHint");
  const identity = document.createElement("div");
  identity.className = "habit-snapshot-identity";
  const identityHeading = document.createElement("div");
  identityHeading.className = "habit-identity-heading";
  const emoji = document.createElement("span");
  emoji.className = "habit-emoji";
  const name = document.createElement("strong");
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "habit-edit-trigger";
  edit.dataset.habitEdit = habit.key;
  setCopy(edit, "habits.edit");
  edit.setAttribute("aria-label", `${t("habits.edit")} ${displayHabitName(habit)}`);
  const metadata = document.createElement("p");
  const sources = document.createElement("small");
  name.textContent = displayHabitName(habit);
  emoji.textContent = habit.definition?.emoji ?? "";
  emoji.hidden = !emoji.textContent;
  const pendingGoal = habit.definition?.pendingGoal;
  const pendingDate = habit.definition?.pendingGoalEffectiveFrom;
  metadata.textContent = `${habit.definition?.group ? `${habit.definition.group} · ` : ""}${localizeHabitGoalLabel(habit.goalLabel, currentInterfaceLanguage)} · ${
    localizeHabitCoverageLabel(habit.coverageLabel, currentInterfaceLanguage)
  }${pendingGoal && pendingDate ? ` · ${t("habits.pendingGoal", {
    goal: habitGoalTargetLabel(pendingGoal), date: pendingDate,
  })}` : ""}`;
  setCopy(sources, "habits.sources", {
    sources: habit.sourceLabels.join(currentInterfaceLanguage === "zh" ? "、" : ", ") || t("habits.notDeclared"),
  });
  identityHeading.append(emoji, name, edit);
  identity.append(identityHeading, metadata, sources);

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
  setHabitHistoryDisclosureCopy(expand, habit, false);

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

function renderCanonicalHabitDetail(): void {
  const selected = selectedHabitCell;
  if (!selected || !habitsDestination) return;
  const corrections = currentHabitDateView?.date === selected.date
    ? currentHabitDateView.habitCorrections : null;
  const habit = corrections?.habits.find((item) => item.key === selected.habitKey);
  const panel = document.createElement("section");
  panel.className = "habit-canonical-detail";
  const heading = document.createElement("strong");
  heading.textContent = `${selected.date} · ${habit?.nameKnown ? displayHabitName(habit) : selected.habitKey}`;
  const evidence = document.createElement("p");
  const presentation = habit ? habitCompletionPresentation(habit.cell) : null;
  setCopy(evidence, presentation ? habitCompletionExplanationLabels[presentation.explanation] : "habits.completionUnknown", {
    sources: presentation?.sourceLabels.join(currentInterfaceLanguage === "zh" ? "、" : ", ") || t("habits.notDeclared"),
  });
  const coverage = document.createElement("p");
  setCopy(coverage, "habits.canonicalCoverage");
  const goal = document.createElement("p");
  setCopy(goal, "history.goalUnknown");
  const changes = document.createElement("ul");
  for (const change of habit?.localChanges ?? []) {
    const item = document.createElement("li");
    setCopy(item, change.state === "completed" ? "history.localCompletedAt" : "history.localWithdrawnAt", { changedAt: change.changedAt });
    changes.append(item);
  }
  panel.append(heading, evidence, coverage, goal, changes);
  if (corrections?.message) {
    const message = document.createElement("p");
    setAppMessage(message, corrections.message);
    panel.append(message);
  }
  if (habitNoteStatus?.error) {
    const error = document.createElement("p");
    setCopyError(error, "habits.loadDateFailed", habitNoteStatus.error);
    panel.append(error);
  }
  habitsDestination.append(panel);
}

function renderSelectedHabitCell(): void {
  habitsDestination?.querySelector(".habit-canonical-detail")?.remove();
  const context = selectedHabitContext();
  if (!context) {
    renderCanonicalHabitDetail();
    return;
  }
  const { habit, cell, row, detail } = context;
  const history = row.querySelector<HTMLElement>(".habit-history");
  const recent = row.querySelector<HTMLElement>(".habit-recent");
  const expand = row.querySelector<HTMLButtonElement>("button[data-habit-expand]");
  if (history) history.hidden = false;
  if (recent) recent.hidden = true;
  row.classList.add("is-expanded");
  expand?.setAttribute("aria-expanded", "true");
  if (expand) setHabitHistoryDisclosureCopy(expand, habit, true);

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
  const correctionDate = historicalHabitCorrectionDate(cell.date, habit.today.date);
  const snapshot = currentHabitSnapshot;
  if (
    correctionDate &&
    habit.canRecordCompletion &&
    snapshot?.completionTargetBinding &&
    (snapshot.state === "ready" || snapshot.state === "stale")
  ) {
    const correction = document.createElement("button");
    correction.type = "button";
    correction.className = "secondary-button";
    correction.dataset.habitCorrectionDate = correctionDate;
    setCopy(correction, "habits.openHistoricalCorrection", { date: correctionDate });
    detail.append(correction);
  }
  if (habit.key === "exercise") {
    detail.append(habitExerciseEditor(cell.date, cell));
  }
}

async function loadSelectedHabitDate(habitKey: string, date: string): Promise<void> {
  selectedHabitCell = { habitKey, date };
  currentHabitDateView = null;
  habitNoteStatus = null;
  renderSelectedHabitCell();
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

function habitDefinitionDraftKey(binding: string, habitKey: string | null): string {
  return `${binding}:${habitKey ?? "new"}`;
}

function habitGoalValues(goal: HabitGoalTarget | null): Pick<
  HabitDefinitionFormValues,
  "goalKind" | "weeklyTarget" | "timeTarget" | "dayRelation"
> {
  if (goal?.kind === "weekly-count") {
    return {
      goalKind: "weekly-count",
      weeklyTarget: String(goal.standard),
      timeTarget: "",
      dayRelation: "same-day",
    };
  }
  if (goal?.kind === "daily-time") {
    return {
      goalKind: "daily-time",
      weeklyTarget: "3",
      timeTarget: goal.standard,
      dayRelation: goal.dayRelation,
    };
  }
  return {
    goalKind: "daily-completion",
    weeklyTarget: "3",
    timeTarget: "",
    dayRelation: "same-day",
  };
}

function valuesFromHabitDefinitionInput(
  input: HabitDefinitionMutationInput,
): HabitDefinitionFormValues {
  return {
    habitKey: input.habitKey,
    name: input.name,
    ...habitGoalValues(input.goal),
    ...(input.goal === null && input.habitKey ? { goalKind: "keep-source" as const } : {}),
    startDate: input.startDate ?? "",
    emoji: input.emoji ?? "",
    group: input.group ?? "",
  };
}

function writeHabitDefinitionForm(values: HabitDefinitionFormValues): void {
  if (habitDefinitionName) habitDefinitionName.value = values.name;
  if (habitDefinitionGoalKind) habitDefinitionGoalKind.value = values.goalKind;
  if (habitDefinitionWeeklyTarget) habitDefinitionWeeklyTarget.value = values.weeklyTarget;
  if (habitDefinitionTimeTarget) habitDefinitionTimeTarget.value = values.timeTarget;
  if (habitDefinitionDayRelation) habitDefinitionDayRelation.value = values.dayRelation;
  if (habitDefinitionStartDate) habitDefinitionStartDate.value = values.startDate;
  if (habitDefinitionEmoji) habitDefinitionEmoji.value = values.emoji;
  if (habitDefinitionGroup) habitDefinitionGroup.value = values.group;
  syncHabitDefinitionGoalFields();
}

function readHabitDefinitionForm(): HabitDefinitionFormValues | null {
  if (
    !habitDefinitionName || !habitDefinitionGoalKind || !habitDefinitionWeeklyTarget ||
    !habitDefinitionTimeTarget || !habitDefinitionDayRelation || !habitDefinitionStartDate ||
    !habitDefinitionEmoji || !habitDefinitionGroup
  ) return null;
  return {
    habitKey: activeHabitDefinitionDraftKey
      ? habitDefinitionDrafts.get(activeHabitDefinitionDraftKey)?.values.habitKey ?? null
      : null,
    name: habitDefinitionName.value,
    goalKind: habitDefinitionGoalKind.value as HabitGoalTarget["kind"],
    weeklyTarget: habitDefinitionWeeklyTarget.value,
    timeTarget: habitDefinitionTimeTarget.value,
    dayRelation: habitDefinitionDayRelation.value as HabitDefinitionFormValues["dayRelation"],
    startDate: habitDefinitionStartDate.value,
    emoji: habitDefinitionEmoji.value,
    group: habitDefinitionGroup.value,
  };
}

function syncHabitDefinitionGoalFields(): void {
  const goalKind = habitDefinitionGoalKind?.value;
  const keepSource = goalKind === "keep-source";
  if (habitDefinitionWeeklyField) habitDefinitionWeeklyField.hidden = goalKind !== "weekly-count";
  if (habitDefinitionTimeField) habitDefinitionTimeField.hidden = goalKind !== "daily-time";
  if (habitDefinitionRelationField) habitDefinitionRelationField.hidden = goalKind !== "daily-time";
  if (habitDefinitionGoalNote) habitDefinitionGoalNote.hidden = !keepSource;
  if (habitDefinitionWeeklyTarget) habitDefinitionWeeklyTarget.required = goalKind === "weekly-count";
  if (habitDefinitionTimeTarget) habitDefinitionTimeTarget.required = goalKind === "daily-time";
}

function setHabitDefinitionFormLocked(locked: boolean): void {
  [
    habitDefinitionName,
    habitDefinitionGoalKind,
    habitDefinitionWeeklyTarget,
    habitDefinitionTimeTarget,
    habitDefinitionDayRelation,
    habitDefinitionStartDate,
    habitDefinitionEmoji,
    habitDefinitionGroup,
  ].forEach((field) => { if (field) field.disabled = locked; });
  const draft = activeHabitDefinitionDraftKey
    ? habitDefinitionDrafts.get(activeHabitDefinitionDraftKey)
    : null;
  if (habitDefinitionSubmit) habitDefinitionSubmit.disabled = habitDefinitionSaveInFlight || Boolean(draft?.needsRefresh);
  if (habitDefinitionCancel) habitDefinitionCancel.disabled = habitDefinitionSaveInFlight;
  if (habitDefinitionRefresh) habitDefinitionRefresh.disabled = habitDefinitionSaveInFlight;
}

function stashHabitDefinitionForm(): void {
  if (!activeHabitDefinitionDraftKey) return;
  const draft = habitDefinitionDrafts.get(activeHabitDefinitionDraftKey);
  const values = readHabitDefinitionForm();
  if (!draft || draft.pendingInput || !values) return;
  draft.values = values;
  habitDefinitionDrafts.set(activeHabitDefinitionDraftKey, draft);
}

function openHabitDefinitionEditor(habitKey: string | null): void {
  const snapshot = currentHabitSnapshot;
  const binding = snapshot?.catalogTargetBinding;
  if (!snapshot || !binding || snapshot.catalogError) {
    if (habitsStatus) {
      setRawText(habitsStatus, t("habits.definitionUnavailable"));
      habitsStatus.dataset.state = "error";
    }
    return;
  }
  const habit = habitKey ? snapshot.habits.find((item) => item.key === habitKey) : null;
  if (habitKey && !habit) return;
  const draftKey = habitDefinitionDraftKey(binding, habitKey);
  activeHabitDefinitionBinding = binding;
  activeHabitDefinitionDraftKey = draftKey;
  let draft = habitDefinitionDrafts.get(draftKey);
  if (!draft) {
    const definition = habit?.definition;
    const goal = definition?.pendingGoal ?? habit?.goalTarget ?? null;
    draft = {
      values: {
        habitKey,
        name: habit ? displayHabitName(habit) : "",
        ...habitGoalValues(goal),
        ...(definition?.origin === "sourced" && !goal ? { goalKind: "keep-source" as const } : {}),
        startDate: definition?.startDate ?? (habit ? "" : snapshot.livedDate ?? ""),
        emoji: definition?.emoji ?? "",
        group: definition?.group ?? "",
      },
      pendingInput: null,
      error: null,
      needsRefresh: false,
    };
    habitDefinitionDrafts.set(draftKey, draft);
  }
  if (draft.pendingInput) draft.values = valuesFromHabitDefinitionInput(draft.pendingInput);
  if (habitDefinitionHeading) setCopy(habitDefinitionHeading, habit ? "habits.editHeading" : "habits.addHeading");
  if (habitDefinitionMode) habitDefinitionMode.textContent = habit ? displayHabitName(habit) : "";
  if (habitDefinitionStartDate) habitDefinitionStartDate.required = !habit;
  if (habitDefinitionKeepSourceOption) {
    habitDefinitionKeepSourceOption.hidden = !(habit?.definition?.origin === "sourced" && !habit.goalTarget && !habit.definition.pendingGoal);
  }
  writeHabitDefinitionForm(draft.values);
  if (habitDefinitionStatus) {
    if (draft.error) {
      setRawText(habitDefinitionStatus, t("habits.definitionSaveFailed", { error: applicationMessage(draft.error) }));
    } else {
      setRawText(habitDefinitionStatus, "");
    }
  }
  if (habitDefinitionSubmit) {
    setCopy(habitDefinitionSubmit, draft.pendingInput ? "habits.retrySave" : "habits.save");
  }
  if (habitDefinitionRefresh) habitDefinitionRefresh.hidden = !draft.needsRefresh;
  setHabitDefinitionFormLocked(Boolean(draft.pendingInput));
  if (!habitDefinitionDialog?.open) habitDefinitionDialog?.showModal();
  habitDefinitionName?.focus();
}

function habitGoalFromValues(values: HabitDefinitionFormValues): HabitGoalTarget | null | undefined {
  if (values.goalKind === "keep-source") return null;
  if (values.goalKind === "daily-completion") return { kind: "daily-completion" };
  if (values.goalKind === "weekly-count") {
    const standard = Number(values.weeklyTarget);
    if (!Number.isInteger(standard) || standard < 1 || standard > 7) return null;
    return { kind: "weekly-count", standard };
  }
  if (values.goalKind === "daily-time" && /^\d{2}:\d{2}$/.test(values.timeTarget)) {
    return { kind: "daily-time", standard: values.timeTarget, dayRelation: values.dayRelation };
  }
  return undefined;
}

function isHabitDefinitionRevisionConflict(error: unknown): boolean {
  const message = String(error);
  return message.includes("Habit 定义已在其他位置改变") ||
    message.includes("Habit definition changed elsewhere");
}

async function refreshHabitDefinitionAfterConflict(): Promise<boolean> {
  const draftKey = activeHabitDefinitionDraftKey;
  const binding = activeHabitDefinitionBinding;
  const draft = draftKey ? habitDefinitionDrafts.get(draftKey) : null;
  const oldInput = draft?.pendingInput;
  if (!draftKey || !binding || !draft?.needsRefresh || !oldInput || habitDefinitionSaveInFlight) return true;
  const retainedValues = readHabitDefinitionForm() ?? draft.values;
  habitDefinitionSaveInFlight = true;
  setHabitDefinitionFormLocked(true);
  if (habitDefinitionStatus) setRawText(habitDefinitionStatus, t("habits.definitionRefreshing"));
  try {
    await refreshHabits();
    const latest = currentHabitSnapshot;
    if (
      !latest || latest.catalogTargetBinding !== binding || latest.catalogError || latest.readError
    ) {
      throw new Error("没有读回同一所选 Vault 的更新 Habit 定义；表单操作仍保留。请检查 Vault 后重试刷新。");
    }
    draft.values = retainedValues;
    draft.pendingInput = null;
    draft.error = null;
    draft.needsRefresh = false;
    habitDefinitionDrafts.set(draftKey, draft);
    if (habitDefinitionRefresh) habitDefinitionRefresh.hidden = true;
    if (habitDefinitionSubmit) setCopy(habitDefinitionSubmit, "habits.save");
    writeHabitDefinitionForm(retainedValues);
    if (habitDefinitionStatus) setRawText(habitDefinitionStatus, t("habits.definitionConflictRefreshed"));
    return true;
  } catch (error) {
    draft.error = String(error);
    habitDefinitionDrafts.set(draftKey, draft);
    if (habitDefinitionStatus) {
      setRawText(habitDefinitionStatus, t("habits.definitionSaveFailed", { error: applicationMessage(String(error)) }));
    }
    return false;
  } finally {
    habitDefinitionSaveInFlight = false;
    if (activeHabitDefinitionDraftKey === draftKey && activeHabitDefinitionBinding === binding) {
      setHabitDefinitionFormLocked(Boolean(draft.pendingInput));
    }
  }
}

async function saveHabitDefinitionFromForm(event: SubmitEvent): Promise<boolean> {
  event.preventDefault();
  if (habitDefinitionSaveInFlight || !activeHabitDefinitionDraftKey || !activeHabitDefinitionBinding) return true;
  const draftKey = activeHabitDefinitionDraftKey;
  const binding = activeHabitDefinitionBinding;
  const snapshot = currentHabitSnapshot;
  const draft = habitDefinitionDrafts.get(draftKey);
  const values = readHabitDefinitionForm();
  if (!snapshot || !draft || !values) return true;
  if (!draft.pendingInput) {
    if (!habitDefinitionForm?.reportValidity()) return true;
    const goal = habitGoalFromValues(values);
    if (goal === undefined || (goal === null && !values.habitKey) || !values.name.trim() || (!values.habitKey && !values.startDate)) {
      if (habitDefinitionStatus) setRawText(habitDefinitionStatus, t("habits.definitionFormInvalid"));
      return true;
    }
    draft.values = values;
    draft.pendingInput = {
      operationId: localOperationId("habit-definition"),
      targetBinding: binding,
      expectedRevision: snapshot.catalogRevision,
      habitKey: values.habitKey,
      language: currentInterfaceLanguage,
      name: values.name.trim(),
      emoji: values.emoji.trim() || null,
      group: values.group.trim() || null,
      startDate: values.startDate || null,
      goal,
    };
    draft.error = null;
  }
  habitDefinitionDrafts.set(draftKey, draft);
  habitDefinitionSaveInFlight = true;
  setHabitDefinitionFormLocked(true);
  if (habitDefinitionSubmit) setCopy(habitDefinitionSubmit, "habits.definitionSaving");
  if (habitDefinitionStatus) setRawText(habitDefinitionStatus, t("habits.definitionSaving"));
  try {
    const saved = await window.__TAURI__.core.invoke<HabitDefinitionSaveResult>(
      "save_habit_definition",
      { input: draft.pendingInput },
    );
    if (saved.snapshot.catalogTargetBinding !== binding) {
      throw new Error("Habit 保存结果与当前所选 Vault 不匹配；请刷新 Habits 后核对。");
    }
    habitDefinitionDrafts.delete(draftKey);
    if (activeHabitDefinitionDraftKey === draftKey && activeHabitDefinitionBinding === binding) {
      renderHabitSnapshot(saved.snapshot);
      if (habitsStatus) {
        setCopy(habitsStatus, saved.outcome === "created" ? "habits.definitionCreated" : "habits.definitionUpdated");
        habitsStatus.dataset.state = "ready";
      }
      habitDefinitionDialog?.close();
    } else {
      void refreshHabits();
    }
    return true;
  } catch (error) {
    draft.error = String(error);
    draft.needsRefresh = isHabitDefinitionRevisionConflict(error);
    habitDefinitionDrafts.set(draftKey, draft);
    if (activeHabitDefinitionDraftKey === draftKey && habitDefinitionStatus) {
      setRawText(habitDefinitionStatus, t("habits.definitionSaveFailed", { error: applicationMessage(String(error)) }));
    }
    if (activeHabitDefinitionDraftKey === draftKey) {
      if (habitDefinitionRefresh) habitDefinitionRefresh.hidden = !draft.needsRefresh;
      if (habitDefinitionSubmit) setCopy(habitDefinitionSubmit, "habits.retrySave");
      setHabitDefinitionFormLocked(true);
    }
    return false;
  } finally {
    habitDefinitionSaveInFlight = false;
    if (activeHabitDefinitionDraftKey === draftKey) {
      setHabitDefinitionFormLocked(Boolean(draft.pendingInput));
    }
  }
}

function renderHabitSnapshot(view: HabitSnapshotView): void {
  currentHabitSnapshot = view;
  if (newHabitButton) {
    newHabitButton.disabled = !view.catalogTargetBinding || Boolean(view.catalogError);
    newHabitButton.title = view.catalogError
      ? applicationMessage(view.catalogError)
      : t("habits.add");
  }
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
    const rangeKey = view.displayRangeLabel && view.rangeLabel
      ? "habits.range"
      : view.catalogRevision && view.state === "missing"
        ? "habits.localOnlyRange"
        : "habits.waitingSnapshot";
    setCopy(
      habitsRange,
      rangeKey,
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
    renderSelectedHabitCell();
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
      livedDate: null,
      generatedAt: null,
      displayRangeLabel: null,
      rangeLabel: null,
      producerLabel: null,
      completionRevision: null,
      completionTargetBinding: null,
      catalogRevision: null,
      catalogTargetBinding: null,
      catalogError: null,
      completionError: null,
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
  const folderTarget = form.querySelector<HTMLLabelElement>("#task-quick-folder-target");
  const listControl = folderTarget && !folderTarget.hidden
    ? folderTarget.querySelector<HTMLSelectElement>("[data-task-list]")
    : form.querySelector<HTMLSelectElement>("#task-quick-list") ??
      form.querySelector<HTMLSelectElement>("[data-task-list]");
  const listId = listControl?.value || null;
  const parentControl = form.querySelector<HTMLSelectElement>("[data-task-parent]");
  const completionDate =
    form.querySelector<HTMLInputElement>("[data-task-completion-date]")?.value ?? "";
  const completionTime =
    form.querySelector<HTMLInputElement>("[data-task-completion-time]")?.value ?? "";
  const endDate = form.querySelector<HTMLInputElement>("[data-task-end-date]")?.value ?? "";
  const endTime = form.querySelector<HTMLInputElement>("[data-task-end-time]")?.value ?? "";
  const priorityControl = form.querySelector<HTMLSelectElement>("[data-task-priority]");
  const priorityValue = priorityControl?.value ?? "";
  const tagCollection = form.querySelector<HTMLElement>("[data-task-tag-collection]");
  const tagIds = tagCollection
    ? Array.from(tagCollection.querySelectorAll<HTMLInputElement>("input[data-task-tag-choice]:checked"))
        .map((input) => input.value)
    : undefined;
  return {
    name, content, date, time, endDate, endTime, listId, completionDate, completionTime,
    priority: priorityControl ? (priorityValue ? priorityValue as TaskPriority : null) : undefined,
    tagIds,
    parentTaskId: parentControl ? (parentControl.value || null) : undefined,
  };
}

function isBlankTaskDraft(draft: TaskDraft): boolean {
  return (
    !draft.name &&
    !draft.content &&
    !draft.date &&
    !draft.time &&
    !draft.endDate &&
    !draft.endTime &&
    !draft.completionDate &&
    !draft.completionTime &&
    !draft.priority &&
    !(draft.tagIds?.length) &&
    !draft.parentTaskId
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

function taskScheduleText(date: string | null, time: string | null, end?: Readonly<{date: string; time: string}> | null): string {
  if (date && time && end) return `${calendarDateLabel(date)} ${time} – ${end.date === date ? "" : `${calendarDateLabel(end.date)} `}${end.time}`;
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
    reported: "tasks.completionSourceReported",
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

function taskChangeDescription(change: TaskChangeView, view?: TasksView | null): string {
  if (change.kind === "rescheduled") {
    return t("tasks.rescheduled", {
      changedAt: change.changedAt,
      previous: taskScheduleText(change.previousDate, change.previousTime, change.previousExecutionEnd),
      next: taskScheduleText(change.newDate, change.newTime, change.newExecutionEnd),
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
  const base = t(labels[change.kind], {
    changedAt: change.changedAt,
    changeSource: taskChangeSourceText(change.source),
  });
  const parentChanged =
    (change.previousParentTaskId !== undefined || change.newParentTaskId !== undefined) &&
    change.previousParentTaskId !== change.newParentTaskId;
  if (!parentChanged) return base;
  const parentName = (id: string | null | undefined): string => {
    if (!id) return t("tasks.noParent");
    return view?.tasks.find((candidate) => candidate.id === id)?.name ?? id;
  };
  return `${base} · ${t("tasks.parentChangedHistory", {
    previous: parentName(change.previousParentTaskId),
    next: parentName(change.newParentTaskId),
  })}`;
}

function taskChangeHistory(task: TaskView, view?: TasksView | null): HTMLElement | null {
  if (task.changes.length === 0) return null;
  const history = document.createElement("details");
  history.className = "task-change-history";
  const summary = document.createElement("summary");
  setCopy(summary, "tasks.changes", { count: task.changes.length });
  const changes = document.createElement("ul");
  changes.replaceChildren(
    ...task.changes.map((change) => {
      const item = document.createElement("li");
      item.textContent = taskChangeDescription(change, view);
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

function taskFolderIdsByList(view: TasksView): ReadonlyMap<string, string> {
  return new Map(
    view.lists
      .filter((list) => Boolean(list.folderId))
      .map((list) => [list.id, list.folderId!] as const),
  );
}

function taskFolderForId(view: TasksView, folderId: string) {
  return (view.folders ?? []).find((folder) => folder.id === folderId);
}

function renderTaskListScopeButtons(view: TasksView): void {
  if (!taskListScopes) return;
  const navigation: HTMLElement[] = [];
  const archivedListIds = new Set(
    view.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const foldersByList = taskFolderIdsByList(view);
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
      taskScopeCount(view.tasks, scope, "pending", currentTaskLivedDate ?? view.currentDate, archivedListIds, foldersByList),
    );
    button.append(label, count);
    if (scope === "all") {
      button.dataset.i18nAriaLabel = "tasks.scopeAllList";
      button.setAttribute("aria-label", t("tasks.scopeAllList"));
    }
    navigation.push(button);
  };
  const addListButton = (list: TaskListView, container: HTMLElement): void => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.className = "task-list-button";
    button.dataset.taskScope = taskListScopeForId(list.id);
    const label = document.createElement("span");
    label.textContent = list.name;
    const count = document.createElement("strong");
    count.textContent = String(taskScopeCount(
      view.tasks,
      taskListScopeForId(list.id),
      "pending",
      currentTaskLivedDate ?? view.currentDate,
      archivedListIds,
      foldersByList,
    ));
    button.append(label, count);
    button.title = list.name;
    container.append(button);
  };
  addButton("all", "tasks.scopeAll");
  addButton("today", "tasks.scopeToday");
  addButton("inbox", "tasks.scopeInbox");
  const activeCustomLists = view.lists.filter((list) => !list.isSystem && !list.archived);
  for (const folder of view.folders ?? []) {
    const group = document.createElement("div");
    group.className = "task-folder-navigation";
    group.dataset.taskFolderNavigation = folder.id;
    const header = document.createElement("div");
    header.className = "task-folder-navigation-heading";
    const expanded = expandedTaskFolderIds.has(folder.id);
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "task-folder-toggle";
    toggle.dataset.taskFolderToggle = folder.id;
    toggle.textContent = expanded ? "⌄" : "›";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", t(expanded ? "tasks.collapseFolder" : "tasks.expandFolder", {folder: folder.name}));
    toggle.title = t(expanded ? "tasks.collapseFolder" : "tasks.expandFolder", {folder: folder.name});
    const folderButton = document.createElement("button");
    folderButton.type = "button";
    folderButton.role = "tab";
    folderButton.className = "task-list-button task-folder-scope-button";
    folderButton.dataset.taskScope = taskFolderScopeForId(folder.id);
    folderButton.title = folder.name;
    const label = document.createElement("span");
    label.textContent = folder.name;
    const count = document.createElement("strong");
    count.textContent = String(taskScopeCount(
      view.tasks,
      taskFolderScopeForId(folder.id),
      "pending",
      currentTaskLivedDate ?? view.currentDate,
      archivedListIds,
      foldersByList,
    ));
    folderButton.append(label, count);
    header.append(toggle, folderButton);
    const children = document.createElement("div");
    children.className = "task-folder-navigation-children";
    children.hidden = !expanded;
    for (const list of activeCustomLists.filter((candidate) => candidate.folderId === folder.id)) {
      addListButton(list, children);
    }
    group.append(header, children);
    navigation.push(group);
  }
  for (const list of activeCustomLists.filter((candidate) => !candidate.folderId)) {
    const holder = document.createElement("div");
    holder.className = "task-list-navigation-item";
    addListButton(list, holder);
    navigation.push(holder);
  }
  const archived = document.createElement("button");
  archived.type = "button";
  archived.role = "tab";
  archived.className = "task-list-button";
  archived.dataset.taskScope = "archived";
  const archivedLabel = document.createElement("span");
  setCopy(archivedLabel, "tasks.scopeArchived");
  const archivedCount = document.createElement("strong");
  archivedCount.textContent = String(taskScopeCount(
    view.tasks,
    "archived",
    "pending",
    currentTaskLivedDate ?? view.currentDate,
    archivedListIds,
    foldersByList,
  ));
  archived.append(archivedLabel, archivedCount);
  navigation.push(archived);
  taskListScopes.replaceChildren(...navigation);
}

function renderTaskListSelect(
  select: HTMLSelectElement | null,
  view: TasksView,
  selectedListId: string | null,
  includeArchivedCurrent = false,
  allowedListIds?: ReadonlySet<string>,
): void {
  if (!select) return;
  const options = activeTaskLists(view)
    .filter((list) => !allowedListIds || allowedListIds.has(list.id))
    .slice();
  if (includeArchivedCurrent && selectedListId) {
    const current = taskListForId(view, selectedListId);
    if (current?.archived && (!allowedListIds || allowedListIds.has(current.id))) options.push(current);
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
  const fallback = allowedListIds
    ? options[0]?.id ?? ""
    : options.find((list) => list.id === "inbox")?.id ?? options[0]?.id ?? "";
  select.value = options.some((list) => list.id === selectedListId)
    ? selectedListId ?? ""
    : fallback;
}

function renderTaskParentSelect(
  select: HTMLSelectElement | null,
  view: TasksView,
  selectedParentId: string | null,
  disabled: boolean,
  taskId: string | null = null,
): void {
  if (!select) return;
  const candidates = [...taskParentCandidates(view.tasks, taskId)];
  const selected = selectedParentId
    ? view.tasks.find((task) => task.id === selectedParentId)
    : undefined;
  if (selected && selected.deletedAt !== null && !candidates.some((task) => task.id === selected.id)) {
    candidates.unshift(selected);
  }
  const none = document.createElement("option");
  none.value = "";
  setCopy(none, "tasks.noParent");
  select.replaceChildren(none, ...candidates.map((task) => {
    const option = document.createElement("option");
    option.value = task.id;
    const list = taskListForId(view, task.listId);
    const base = `${task.name} · ${list ? taskListDisplayName(list, t("tasks.inbox")) : task.listId}`;
    option.textContent = task.deletedAt !== null
      ? t("tasks.parentDeletedName", {name: base})
      : base;
    return option;
  }));
  select.value = selectedParentId ?? "";
  select.disabled = disabled;
}

function renderTaskTagChoices(
  container: HTMLElement | null,
  view: Pick<TasksView, "tags">,
  selectedTagIds: readonly string[],
  disabled: boolean,
  manage = false,
): void {
  if (!container) return;
  const tags = view.tags ?? [];
  if (tags.length === 0) {
    const empty = document.createElement("p");
    empty.className = "task-tag-empty";
    setCopy(empty, "tasks.noTags");
    container.replaceChildren(container.querySelector("legend")?.cloneNode(true) ?? document.createElement("legend"), empty);
  } else {
    const legend = container.querySelector("legend")?.cloneNode(true) ?? document.createElement("legend");
    const options = tags.map((tag) => {
      const item = document.createElement("div");
      item.className = "task-tag-choice-item";
      const label = document.createElement("label");
      label.className = "task-tag-choice";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = tag.id;
      checkbox.checked = selectedTagIds.includes(tag.id);
      checkbox.disabled = disabled;
      checkbox.dataset.taskTagChoice = "";
      const name = document.createElement("span");
      name.textContent = tag.name;
      label.append(checkbox, name);
      item.append(label);
      if (manage) {
        if (taskTagRenameEditId === tag.id) {
          const edit = document.createElement("div");
          edit.className = "task-tag-rename-form";
          const input = document.createElement("input");
          input.type = "text";
          input.maxLength = 80;
          input.required = true;
          input.value = taskTagRenameDrafts.get(tag.id) ?? tag.name;
          input.disabled = disabled;
          input.dataset.taskTagRename = tag.id;
          input.setAttribute("aria-label", `${t("tasks.renameTag")} · ${tag.name}`);
          const save = document.createElement("button");
          save.type = "button";
          save.className = "text-button";
          save.dataset.taskTagRenameSave = tag.id;
          save.disabled = disabled;
          setCopy(save, "tasks.saveTag");
          const cancel = document.createElement("button");
          cancel.type = "button";
          cancel.className = "text-button";
          cancel.dataset.taskTagRenameCancel = tag.id;
          setCopy(cancel, "tasks.cancel");
          edit.append(input, save, cancel);
          item.append(edit);
        } else {
          const actions = document.createElement("div");
          actions.className = "task-tag-actions";
          const rename = document.createElement("button");
          rename.type = "button";
          rename.className = "text-button";
          rename.dataset.taskTagRenameBegin = tag.id;
          rename.disabled = disabled;
          rename.setAttribute("aria-label", `${t("tasks.renameTag")} · ${tag.name}`);
          setCopy(rename, "tasks.renameTag");
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "text-button";
          remove.dataset.taskTagDelete = tag.id;
          remove.disabled = disabled;
          remove.setAttribute("aria-label", `${t("tasks.deleteTag")} · ${tag.name}`);
          setCopy(remove, "tasks.deleteTag");
          actions.append(rename, remove);
          item.append(actions);
        }
      }
      return item;
    });
    container.replaceChildren(legend, ...options);
  }
  if (!manage) return;
  const create = document.createElement("div");
  create.className = "task-tag-create-form";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 80;
  input.placeholder = t("tasks.tagNamePlaceholder");
  input.disabled = disabled;
  input.dataset.taskTagNew = "";
  input.setAttribute("aria-label", t("tasks.tagName"));
  const add = document.createElement("button");
  add.type = "button";
  add.className = "text-button";
  add.dataset.taskTagCreate = "";
  add.disabled = disabled;
  setCopy(add, "tasks.createTag");
  create.append(input, add);
  container.append(create);
}

function updateTaskEditorSummaries(form: HTMLFormElement, view: TasksView | null): void {
  const listId = form.querySelector<HTMLSelectElement>("[data-task-list]")?.value;
  const list = listId && view ? taskListForId(view, listId) : undefined;
  const listSummary = form.querySelector<HTMLElement>("[data-task-list-summary]");
  if (listSummary) listSummary.textContent = list
    ? taskListDisplayName(list, t("tasks.inbox"))
    : listId ?? t("tasks.inbox");

  const date = form.querySelector<HTMLInputElement>("[data-task-date]")?.value || null;
  const time = form.querySelector<HTMLInputElement>("[data-task-time]")?.value || null;
  const endDate = form.querySelector<HTMLInputElement>("[data-task-end-date]")?.value || "";
  const endTime = form.querySelector<HTMLInputElement>("[data-task-end-time]")?.value || "";
  const end = endDate && endTime ? {date: endDate, time: endTime} : null;
  const scheduleSummary = form.querySelector<HTMLElement>("[data-task-schedule-summary]");
  if (scheduleSummary) scheduleSummary.textContent = taskScheduleText(date, time, end);
  form.querySelector<HTMLButtonElement>("[data-task-clear-end]")?.toggleAttribute(
    "hidden",
    !Boolean(endDate || endTime),
  );
  form.querySelector<HTMLButtonElement>("[data-task-clear-timed-schedule]")?.toggleAttribute(
    "hidden",
    !Boolean(time || endDate || endTime),
  );

  const priority = form.querySelector<HTMLSelectElement>("[data-task-priority]")?.value ?? "";
  const priorityKey: InterfaceCopyKey = priority
    ? `tasks.priority${priority[0].toUpperCase()}${priority.slice(1)}` as InterfaceCopyKey
    : "tasks.priorityNone";
  const selectedIds = Array.from(
    form.querySelectorAll<HTMLInputElement>("input[data-task-tag-choice]:checked"),
  ).map((input) => input.value);
  const tagNames = (view?.tags ?? []).filter((tag) => selectedIds.includes(tag.id)).map((tag) => tag.name);
  const propertiesSummary = form.querySelector<HTMLElement>("[data-task-properties-summary]");
  if (propertiesSummary) propertiesSummary.textContent = [t(priorityKey), ...tagNames].join(" · ");
  const parentId = form.querySelector<HTMLSelectElement>("[data-task-parent]")?.value || null;
  const parent = parentId && view ? view.tasks.find((task) => task.id === parentId) : undefined;
  const parentSummary = form.querySelector<HTMLElement>("[data-task-parent-summary]");
  if (parentSummary) {
    parentSummary.textContent = parent
      ? parent.deletedAt !== null
        ? t("tasks.parentDeletedName", {name: parent.name})
        : parent.name
      : t("tasks.noParent");
  }
  form.querySelector<HTMLElement>(".task-parent-deleted-hint")?.toggleAttribute(
    "hidden",
    !parent || parent.deletedAt === null,
  );
}

function taskCreateListDefault(view: TasksView): string | null {
  const folderId = taskFolderIdFromScope(taskScope);
  if (folderId) {
    return activeTaskLists(view).find((list) => list.folderId === folderId)?.id ?? null;
  }
  const scopedListId = taskListIdFromScope(taskScope);
  const scopedList = scopedListId ? taskListForId(view, scopedListId) : undefined;
  return scopedList && !scopedList.archived ? scopedList.id : "inbox";
}

function taskListRenameDraftKey(binding: string, listId: string): string {
  return `${binding}:${listId}`;
}

function renderTaskFolderSelect(
  select: HTMLSelectElement,
  view: TasksView,
  folderId: string | null | undefined,
  disabled: boolean,
): void {
  const top = document.createElement("option");
  top.value = "";
  setCopy(top, "tasks.noFolder");
  const folders = (view.folders ?? []).map((folder) => {
    const option = document.createElement("option");
    option.value = folder.id;
    option.textContent = folder.name;
    return option;
  });
  select.replaceChildren(top, ...folders);
  select.value = folderId ?? "";
  select.disabled = disabled;
}

function renderTaskListManagement(view: TasksView, canOperate: boolean): void {
  if (!taskListsManagement) return;
  const folderRows = (view.folders ?? []).map((folder) => {
    const row = document.createElement("article");
    row.className = "task-folder-row";
    const heading = document.createElement("div");
    heading.className = "task-list-row-heading";
    const title = document.createElement("strong");
    title.textContent = folder.name;
    const listCount = view.lists.filter((list) => list.folderId === folder.id).length;
    const count = document.createElement("small");
    count.className = "task-meta";
    setCopy(count, "tasks.folderListCount", {count: listCount});
    heading.append(title, count);
    const form = document.createElement("form");
    form.className = "task-folder-row-form";
    form.dataset.taskFolderEditor = folder.id;
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 80;
    input.required = true;
    input.value = taskFolderRenameDrafts.get(folder.id) ?? folder.name;
    input.dataset.taskFolderName = folder.id;
    input.setAttribute("aria-label", t("tasks.renameFolderLabel", {folder: folder.name}));
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "text-button";
    save.disabled = !canOperate;
    setCopy(save, "tasks.saveFolder");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button";
    remove.dataset.taskFolderDelete = folder.id;
    remove.disabled = !canOperate;
    setCopy(remove, "tasks.deleteFolder");
    form.append(input, save, remove);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void pendingWrites.track(renameTaskFolder(folder.id, input));
    });
    remove.addEventListener("click", () => {
      void pendingWrites.track(deleteTaskFolder(folder.id));
    });
    row.append(heading, form);
    return row;
  });
  const listRows = view.lists.map((list) => {
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
    setCopy(count, "tasks.listCount", {
      count: taskListCount(view.tasks, list.id, taskStateScope),
    });
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
    const folderLabel = document.createElement("label");
    folderLabel.className = "task-list-folder-assignment";
    const folderCaption = document.createElement("span");
    setCopy(folderCaption, "tasks.folder");
    const folderSelect = document.createElement("select");
    folderSelect.dataset.taskListFolder = list.id;
    renderTaskFolderSelect(folderSelect, view, list.folderId, !canOperate);
    folderSelect.addEventListener("change", () => {
      void pendingWrites.track(setTaskListFolder(list.id, folderSelect.value || null));
    });
    folderLabel.append(folderCaption, folderSelect);
    form.append(input, save, folderLabel, archive);
    row.append(form);
    return row;
  });
  taskListsManagement.replaceChildren(...folderRows, ...listRows);
}

function renderTaskPropertyFilters(view: TasksView): void {
  if (taskPriorityFilterControl) taskPriorityFilterControl.value = taskPriorityFilter;
  if (taskPrioritySortControl) taskPrioritySortControl.value = taskPrioritySort;
  if (taskTagFilterControl) {
    const tags = view.tags ?? [];
    if (taskTagFilter && !tags.some((tag) => tag.id === taskTagFilter)) taskTagFilter = null;
    const options = [
      Object.assign(document.createElement("option"), { value: "all", textContent: t("tasks.tagAll") }),
      ...tags.map((tag) => Object.assign(document.createElement("option"), {
        value: tag.id,
        textContent: tag.name,
      })),
    ];
    taskTagFilterControl.replaceChildren(...options);
    taskTagFilterControl.value = taskTagFilter ?? "all";
  }
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

function openTaskInTasks(taskId: string): void {
  taskFocusRequestId = taskId;
  if (currentTasksView) renderTasks(currentTasksView);
}

function openTaskCreateForParent(parent: TaskView): void {
  const view = currentTasksView;
  const binding = view?.targetBinding;
  if (!view || !binding || taskOperationCount > 0) return;
  const current = taskCreateDrafts.get(binding);
  const draft: TaskDraft = current
    ? { ...current, listId: current.listId ?? parent.listId, parentTaskId: parent.id }
    : {
        name: "",
        content: "",
        date: "",
        time: "",
        endDate: "",
        endTime: "",
        listId: parent.listId,
        completionDate: "",
        completionTime: "",
        parentTaskId: parent.id,
        priority: null,
        tagIds: [],
      };
  taskCreateDrafts.set(binding, draft);
  taskCreateOpen = true;
  if (taskCreateStatus) setRawText(taskCreateStatus, "");
  renderTasks(view);
  if (!taskCreateDialog?.open) taskCreateDialog?.showModal();
  taskCreateName?.focus();
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
  const open = dialog ? true : editor.hidden;
  if (dialog) {
    selectedTaskDetailId = taskId ?? null;
    selectedTaskDetailBinding = currentTasksView?.targetBinding ?? null;
    taskEditorDialogRoot?.querySelectorAll<HTMLElement>("[data-task-editor-dialog]").forEach(candidate => {
      candidate.hidden = candidate !== dialog;
    });
    taskEditorDialogRoot?.toggleAttribute("hidden", false);
    tasksList?.querySelectorAll<HTMLElement>("[data-task-editor-row]").forEach(candidate => {
      const selected = candidate.dataset.taskEditorRow === taskId;
      candidate.classList.toggle("is-selected", selected);
      candidate.querySelectorAll("[data-task-editor-open]").forEach(button => button.setAttribute("aria-expanded", String(selected)));
    });
  }
  if (dialog) {
    dialog.hidden = !open;
  } else {
    editor.hidden = !open;
  }
  if (open) {
    const content = row.dataset.taskSurface === "tasks"
      ? editor.querySelector<HTMLTextAreaElement>("[data-task-content]")
      : null;
    (content ?? editor.querySelector<HTMLInputElement>("[data-task-name]"))?.focus();
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
  expanded = false,
  parentVisible = false,
): HTMLElement {
  const binding = view?.targetBinding;
  const draft = binding
    ? taskEditDrafts.get(taskDraftKey(binding, task.id))
    : undefined;
  const selectedParentId = draft?.parentTaskId !== undefined
    ? draft.parentTaskId
    : task.parentTaskId ?? null;
  const editingTasks = surface === "tasks";
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
  let taskCompletionToggle: HTMLLabelElement | null = null;
  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "task-row-action task-editor-toggle";
  detailsButton.dataset.taskEditorOpen = task.id;
  detailsButton.setAttribute("aria-expanded", String(surface === "today" ? expanded : Boolean(draft)));
  detailsButton.setAttribute("aria-label", `${t("tasks.details")} · ${task.name}`);
  setCopy(detailsButton, "tasks.details");
  stateActions.append(detailsButton);
  const discuss = document.createElement("button");
  discuss.type = "button";
  discuss.className = "task-row-action secondary-button";
  discuss.dataset.collaborationTaskId = task.id;
  discuss.dataset.collaborationTaskName = task.name;
  discuss.dataset.collaborationTaskDate = task.date ?? (
    surface === "today"
      ? currentTodayView?.date ?? localCalendarDate()
      : surface === "calendar"
        ? selectedCalendarDate ?? localCalendarDate()
        : localCalendarDate()
  );
  discuss.textContent = t("collaboration.taskEntry");
  discuss.setAttribute("aria-label", `${t("collaboration.taskEntry")} · ${task.name}`);
  stateActions.append(discuss);
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
      taskCompletionToggle = completionLabel;
      if (surface !== "tasks") stateActions.append(completionLabel);
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
    if (task.state === "pending") {
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
  title.setAttribute("aria-expanded", String(surface === "today" ? expanded : Boolean(draft)));
  title.textContent = task.name;
  title.setAttribute("aria-label", `${t("tasks.details")} · ${task.name}`);
  const taskList = view ? taskListForId(view, task.listId) : undefined;
  const listName = taskList
    ? taskListDisplayName(taskList, t("tasks.inbox"))
    : task.listId;
  const meta = document.createElement("p");
  meta.className = "task-row-meta";
  meta.append(source, document.createTextNode(" · "), document.createTextNode(listName));
  meta.append(document.createTextNode(" · "), document.createTextNode(taskScheduleText(task.date, task.time, task.executionEnd)));
  if (editingTasks && task.parentTaskId && !parentVisible) {
    const parent = view?.tasks.find((candidate) => candidate.id === task.parentTaskId);
    const parentName = parent?.deletedAt
      ? t("tasks.parentDeletedName", {name: parent.name})
      : parent?.name ?? task.parentTaskId;
    meta.append(document.createTextNode(" · "), document.createTextNode(t("tasks.childOf", {task: parentName})));
  }
  if (task.timePassed) {
    meta.append(document.createTextNode(" · "), document.createTextNode(t("tasks.timePassed")));
  } else if (task.overdue) {
    meta.append(document.createTextNode(" · "), document.createTextNode(t("tasks.overdue")));
  }
  titleLine.append(title, state);
  if (task.content && surface !== "tasks") {
    const contentPreview = document.createElement("p");
    contentPreview.className = "task-row-content";
    contentPreview.textContent = task.content;
    rowMain.append(titleLine, contentPreview, meta);
  } else {
    rowMain.append(titleLine, meta);
  }
  if (surface === "tasks" && taskCompletionToggle) heading.append(taskCompletionToggle);
  heading.append(rowMain, stateActions);

  const editorForm = document.createElement("form");
  editorForm.className =
    surface === "tasks" ? "task-editor-details" : "task-editor-details task-editor-inline";
  editorForm.dataset.taskEditor = task.id;
  editorForm.dataset.taskSurface = surface;
  editorForm.hidden = surface !== "tasks" && !expanded;
  editorForm.setAttribute("aria-label", t("tasks.editLabel", { task: task.name }));
  const grid = document.createElement("div");
  grid.className = "task-form-grid";
  const nameLabel = document.createElement("label");
  nameLabel.className = editingTasks ? "task-title-field" : "task-form-wide";
  const nameCaption = document.createElement("span");
  if (!editingTasks) setCopy(nameCaption, "tasks.name");
  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 160;
  name.required = true;
  name.disabled = !editable;
  name.value = draft?.name ?? task.name;
  name.dataset.taskName = "";
  name.setAttribute("aria-label", `${t("tasks.name")} · ${task.name}`);
  let parentDetails: HTMLDetailsElement | null = null;
  if (editingTasks) {
    nameLabel.append(name);
  } else {
    nameCaption.append(name);
    nameLabel.append(nameCaption);
  }

  const contentLabel = document.createElement("label");
  contentLabel.className = "task-form-wide";
  const contentCaption = document.createElement("span");
  setCopy(contentCaption, "tasks.content");
  const content = document.createElement("textarea");
  content.rows = editingTasks ? 5 : 2;
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

  const endDateLabel = document.createElement("label");
  const endDateCaption = document.createElement("span");
  setCopy(endDateCaption, "tasks.executionEndDate");
  const endDate = document.createElement("input");
  endDate.type = "date";
  endDate.disabled = !editable;
  endDate.value = draft?.endDate ?? task.executionEnd?.date ?? "";
  endDate.dataset.taskEndDate = "";
  endDateCaption.append(endDate);
  endDateLabel.append(endDateCaption);
  const endTimeLabel = document.createElement("label");
  const endTimeCaption = document.createElement("span");
  setCopy(endTimeCaption, "tasks.executionEndTime");
  const endTime = document.createElement("input");
  endTime.type = "time";
  endTime.disabled = !editable;
  endTime.value = draft?.endTime ?? task.executionEnd?.time ?? "";
  endTime.dataset.taskEndTime = "";
  endTimeCaption.append(endTime);
  endTimeLabel.append(endTimeCaption);
  const clearEnd = document.createElement("button");
  clearEnd.type = "button";
  clearEnd.className = "secondary-button";
  clearEnd.disabled = !editable;
  clearEnd.dataset.taskClearEnd = "";
  setCopy(clearEnd, "tasks.clearExecutionEnd");
  clearEnd.addEventListener("click", () => {
    endDate.value = "";
    endTime.value = "";
    stashTaskSurfaceDraft(surface, editorForm);
  });
  if (editingTasks) {
    const listDetails = document.createElement("details");
    listDetails.className = "task-property-disclosure task-list-disclosure";
    listDetails.dataset.taskListDisclosure = "";
    const listSummary = document.createElement("summary");
    const listSummaryLabel = document.createElement("span");
    setCopy(listSummaryLabel, "tasks.list");
    const listSummaryValue = document.createElement("small");
    listSummaryValue.dataset.taskListSummary = "";
    const selectedList = view ? taskListForId(view, draft?.listId ?? task.listId) : undefined;
    listSummaryValue.textContent = selectedList
      ? taskListDisplayName(selectedList, t("tasks.inbox"))
      : task.listId;
    listSummary.append(listSummaryLabel, listSummaryValue);
    listDetails.append(listSummary, listLabel);

    const scheduleDetails = document.createElement("details");
    scheduleDetails.className = "task-property-disclosure task-schedule-disclosure";
    scheduleDetails.dataset.taskScheduleDisclosure = "";
    const scheduleSummary = document.createElement("summary");
    const scheduleSummaryLabel = document.createElement("span");
    setCopy(scheduleSummaryLabel, "tasks.schedule");
    const scheduleSummaryValue = document.createElement("small");
    scheduleSummaryValue.dataset.taskScheduleSummary = "";
    const scheduleEnd = draft
      ? draft.endDate && draft.endTime
        ? {date: draft.endDate, time: draft.endTime}
        : null
      : task.executionEnd;
    scheduleSummaryValue.textContent = taskScheduleText(
      draft?.date ?? task.date,
      draft?.time ?? task.time,
      scheduleEnd,
    );
    scheduleSummary.append(scheduleSummaryLabel, scheduleSummaryValue);
    const scheduleGrid = document.createElement("div");
    scheduleGrid.className = "task-schedule-fields";
    scheduleGrid.append(dateLabel, timeLabel, endDateLabel, endTimeLabel);
    clearEnd.hidden = !Boolean(endDate.value || endTime.value);
    clearEnd.classList.add("task-property-action");
    const clearSchedule = document.createElement("button");
    clearSchedule.type = "button";
    clearSchedule.className = "text-button task-clear-time";
    clearSchedule.dataset.taskClearTimedSchedule = "";
    clearSchedule.hidden = !Boolean(time.value || endDate.value || endTime.value);
    clearSchedule.disabled = !editable;
    setCopy(clearSchedule, "tasks.clearTimedSchedule");
    clearEnd.addEventListener("click", () => {
      endDate.value = "";
      endTime.value = "";
      clearEnd.hidden = true;
      clearSchedule.hidden = !Boolean(time.value);
      updateTaskEditorSummaries(editorForm, view);
      stashTaskSurfaceDraft(surface, editorForm);
    });
    clearSchedule.addEventListener("click", () => {
      time.value = "";
      endDate.value = "";
      endTime.value = "";
      clearEnd.hidden = true;
      clearSchedule.hidden = true;
      updateTaskEditorSummaries(editorForm, view);
      stashTaskSurfaceDraft(surface, editorForm);
    });
    scheduleDetails.append(scheduleSummary, scheduleGrid, clearEnd, clearSchedule);

    const propertiesDetails = document.createElement("details");
    propertiesDetails.className = "task-property-disclosure task-organizing-disclosure";
    propertiesDetails.dataset.taskPropertiesDisclosure = "";
    propertiesDetails.open = taskTagRenameEditId !== null;
    const propertiesSummary = document.createElement("summary");
    const propertiesSummaryLabel = document.createElement("span");
    setCopy(propertiesSummaryLabel, "tasks.properties");
    const propertiesSummaryValue = document.createElement("small");
    propertiesSummaryValue.dataset.taskPropertiesSummary = "";
    const currentPriority = draft?.priority !== undefined ? draft.priority : task.priority ?? null;
    const priorityKey: InterfaceCopyKey = currentPriority
      ? `tasks.priority${currentPriority[0].toUpperCase()}${currentPriority.slice(1)}` as InterfaceCopyKey
      : "tasks.priorityNone";
    const currentTagIds = draft?.tagIds ?? task.tagIds ?? [];
    const currentTags = (view?.tags ?? []).filter((tag) => currentTagIds.includes(tag.id));
    propertiesSummaryValue.textContent = [
      t(priorityKey),
      ...currentTags.map((tag) => tag.name),
    ].join(" · ");
    propertiesSummary.append(propertiesSummaryLabel, propertiesSummaryValue);
    const priorityLabel = document.createElement("label");
    const priorityCaption = document.createElement("span");
    setCopy(priorityCaption, "tasks.priority");
    const prioritySelect = document.createElement("select");
    prioritySelect.dataset.taskPriority = "";
    prioritySelect.disabled = !editable;
    for (const [value, key] of [
      ["", "tasks.priorityNone"],
      ["high", "tasks.priorityHigh"],
      ["medium", "tasks.priorityMedium"],
      ["low", "tasks.priorityLow"],
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      setCopy(option, key);
      prioritySelect.append(option);
    }
    prioritySelect.value = currentPriority ?? "";
    priorityLabel.append(priorityCaption, prioritySelect);
    const tagChoices = document.createElement("fieldset");
    tagChoices.className = "task-tag-choice-set";
    tagChoices.dataset.taskTagCollection = "";
    renderTaskTagChoices(tagChoices, view ?? { tags: [] }, currentTagIds, !editable, true);
    propertiesDetails.append(propertiesSummary, priorityLabel, tagChoices);
    parentDetails = document.createElement("details");
    parentDetails.className = "task-property-disclosure task-parent-disclosure";
    parentDetails.dataset.taskParentDisclosure = "";
    const parentSummary = document.createElement("summary");
    const parentSummaryLabel = document.createElement("span");
    setCopy(parentSummaryLabel, "tasks.parentTask");
    const parentSummaryValue = document.createElement("small");
    parentSummaryValue.dataset.taskParentSummary = "";
    const selectedParent = view?.tasks.find((candidate) => candidate.id === selectedParentId);
    parentSummaryValue.textContent = selectedParent
      ? selectedParent.deletedAt !== null
        ? t("tasks.parentDeletedName", {name: selectedParent.name})
        : selectedParent.name
      : t("tasks.noParent");
    parentSummary.append(parentSummaryLabel, parentSummaryValue);
    const parentLabel = document.createElement("label");
    const parentCaption = document.createElement("span");
    setCopy(parentCaption, "tasks.parentTask");
    const parentSelect = document.createElement("select");
    parentSelect.dataset.taskParent = "";
    if (view) renderTaskParentSelect(parentSelect, view, selectedParentId, !editable, task.id);
    else {
      const noParent = document.createElement("option");
      noParent.value = "";
      setCopy(noParent, "tasks.noParent");
      parentSelect.append(noParent);
      parentSelect.disabled = true;
    }
    parentLabel.append(parentCaption, parentSelect);
    parentDetails.append(parentSummary, parentLabel);
    const deletedParentHint = document.createElement("small");
    deletedParentHint.className = "task-meta task-parent-deleted-hint";
    deletedParentHint.hidden = !selectedParent || selectedParent.deletedAt === null;
    setCopy(deletedParentHint, "tasks.parentDeletedHint");
    parentDetails.append(deletedParentHint);
    if (selectedParent) {
      const openParent = document.createElement("button");
      openParent.type = "button";
      openParent.className = "text-button task-parent-link";
      openParent.dataset.taskOpenParent = selectedParent.id;
      openParent.textContent = selectedParent.name;
      openParent.setAttribute("aria-label", t("tasks.parentOpenLabel", {task: selectedParent.name}));
      openParent.addEventListener("click", () => openTaskInTasks(selectedParent.id));
      parentDetails.append(openParent);
    }
    const directChildren = (view?.tasks ?? []).filter((candidate) => candidate.parentTaskId === task.id);
    const childrenHeading = document.createElement("h4");
    setCopy(childrenHeading, "tasks.directSubtasks", {count: directChildren.length});
    parentDetails.append(childrenHeading);
    if (directChildren.length === 0) {
      const noChildren = document.createElement("p");
      noChildren.className = "task-meta";
      setCopy(noChildren, "tasks.noSubtasks");
      parentDetails.append(noChildren);
    } else {
      const children = document.createElement("ul");
      children.className = "task-direct-children";
      for (const child of directChildren) {
        const item = document.createElement("li");
        const openChild = document.createElement("button");
        openChild.type = "button";
        openChild.className = "task-child-link";
        openChild.dataset.taskChildOpen = child.id;
        openChild.textContent = child.name;
        openChild.addEventListener("click", () => openTaskInTasks(child.id));
        const childState = document.createElement("small");
        childState.className = "task-meta";
        setCopy(childState, child.deletedAt ? "tasks.stateDeleted" : taskStateCopyKey(child.state));
        const childList = view ? taskListForId(view, child.listId) : undefined;
        const childListName = document.createElement("small");
        childListName.className = "task-meta";
        childListName.textContent = childList
          ? taskListDisplayName(childList, t("tasks.inbox"))
          : child.listId;
        item.append(openChild, childState, childListName);
        children.append(item);
      }
      parentDetails.append(children);
    }
    const addChild = document.createElement("button");
    addChild.type = "button";
    addChild.className = "text-button task-add-child";
    addChild.dataset.taskAddChild = task.id;
    addChild.disabled = !editable;
    setCopy(addChild, "tasks.addSubtask");
    addChild.addEventListener("click", () => openTaskCreateForParent(task));
    parentDetails.append(addChild);
    grid.append(contentLabel, listDetails, scheduleDetails, propertiesDetails, parentDetails);
  } else {
    grid.append(nameLabel, contentLabel, listLabel, dateLabel, timeLabel, endDateLabel, endTimeLabel, clearEnd);
  }
  const footer = document.createElement("div");
  footer.className = "task-editor-footer";
  const schedule = document.createElement("small");
  schedule.className = "task-meta";
  schedule.textContent = taskScheduleText(task.date, task.time, task.executionEnd);
  const save = document.createElement("button");
  save.type = "submit";
  save.disabled = !editable;
  setCopy(save, "tasks.save");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "secondary-button task-editor-close";
  close.dataset.taskEditorClose = "";
  close.disabled = !writable;
  setCopy(close, "tasks.cancel");
  if (editingTasks) {
    const actions = document.createElement("div");
    actions.className = "task-editor-footer-actions";
    actions.append(close, save);
    footer.append(actions);
  } else {
    footer.append(schedule, save);
  }
  editorForm.append(grid);
  if (task.completion) {
    const completionDetails = document.createElement("section");
    completionDetails.className = "task-completion-details";
    const completionHeading = document.createElement("h4");
    setCopy(completionHeading, "tasks.completionDetails");
    const taskDate = document.createElement("p");
    taskDate.className = "task-meta";
    setCopy(taskDate, "tasks.taskDateDetails", {
      schedule: taskScheduleText(task.date, task.time, task.executionEnd),
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
  const history = taskChangeHistory(task, view);
  if (history) editorForm.append(history);
  if (!editingTasks) editorForm.append(close);
  const dialog = surface === "tasks" ? document.createElement("div") : null;
  if (dialog) {
    dialog.className = "task-editor-dialog";
    dialog.dataset.taskEditorDialog = task.id;
    dialog.dataset.taskEditorSurface = surface;
    dialog.hidden = selectedTaskDetailId !== task.id;
    dialog.setAttribute("role", "region");
    dialog.setAttribute("aria-label", t("tasks.editLabel", { task: task.name }));
    stateActions.querySelector(".task-completion-toggle")?.remove();
    detailsButton.remove();
    const menu = document.createElement("details");
    menu.className = "task-more-menu";
    menu.dataset.taskMore = "";
    const moreSummary = document.createElement("summary");
    moreSummary.setAttribute("aria-label", t("tasks.more"));
    setCopy(moreSummary, "tasks.more");
    const menuPanel = document.createElement("div");
    menuPanel.className = "task-more-menu-panel";
    const openSchedule = document.createElement("button");
    openSchedule.type = "button";
    openSchedule.className = "task-more-menu-item";
    openSchedule.dataset.taskOpenSchedule = "";
    openSchedule.disabled = !editable;
    setCopy(openSchedule, "tasks.schedule");
    const moveList = document.createElement("button");
    moveList.type = "button";
    moveList.className = "task-more-menu-item";
    moveList.dataset.taskOpenList = "";
    moveList.disabled = !editable;
    setCopy(moveList, "tasks.list");
    const openParent = document.createElement("button");
    openParent.type = "button";
    openParent.className = "task-more-menu-item";
    openParent.disabled = !editable;
    openParent.dataset.taskOpenParentRelationship = "";
    setCopy(openParent, "tasks.changeParent");
    const addSubtask = document.createElement("button");
    addSubtask.type = "button";
    addSubtask.className = "task-more-menu-item";
    addSubtask.dataset.taskAddChild = task.id;
    addSubtask.disabled = !editable;
    setCopy(addSubtask, "tasks.addSubtask");
    menuPanel.append(openSchedule, moveList, openParent, addSubtask);
    if (!deleted && task.state !== "abandoned") {
      const stateAction = document.createElement("button");
      stateAction.type = "button";
      stateAction.className = "task-more-menu-item";
      stateAction.dataset.taskStateAction = task.state === "pending" ? "completed" : "pending";
      stateAction.dataset.taskStateTask = task.id;
      stateAction.disabled = !writable;
      const stateActionCopy = task.state === "pending"
        ? "tasks.complete"
        : "tasks.reopen";
      setCopy(stateAction, stateActionCopy);
      menuPanel.append(stateAction);
    }
    menuPanel.append(...Array.from(stateActions.children));
    menu.append(moreSummary, menuPanel);
    const titlebar = document.createElement("div");
    titlebar.className = "task-editor-titlebar";
    titlebar.append(nameLabel, menu);
    editorForm.prepend(titlebar, meta);
    const closeEdit = (): void => {
      if (binding) taskEditDrafts.delete(taskDraftKey(binding, task.id));
      selectedTaskDetailId = null;
      selectedTaskDetailBinding = currentTasksView?.targetBinding ?? null;
      taskEditorDialogRoot?.toggleAttribute("hidden", true);
      if (currentTasksView) renderTasks(currentTasksView);
      window.requestAnimationFrame(() =>
        tasksList?.querySelector<HTMLButtonElement>(`[data-task-editor-open="${CSS.escape(task.id)}"]`)?.focus(),
      );
    };
    menu.querySelector<HTMLButtonElement>("[data-task-open-schedule]")?.addEventListener("click", () => {
      const disclosure = editorForm.querySelector<HTMLDetailsElement>("[data-task-schedule-disclosure]");
      if (disclosure) disclosure.open = true;
      editorForm.querySelector<HTMLInputElement>("[data-task-date]")?.focus();
    });
    menu.querySelector<HTMLButtonElement>("[data-task-open-list]")?.addEventListener("click", () => {
      const disclosure = editorForm.querySelector<HTMLDetailsElement>("[data-task-list-disclosure]");
      if (disclosure) disclosure.open = true;
      editorForm.querySelector<HTMLSelectElement>("[data-task-list]")?.focus();
    });
    menu.querySelector<HTMLButtonElement>("[data-task-open-parent-relationship]")?.addEventListener("click", () => {
      if (parentDetails) parentDetails.open = true;
      editorForm.querySelector<HTMLSelectElement>("[data-task-parent]")?.focus();
    });
    menu.querySelector<HTMLButtonElement>("[data-task-add-child]")?.addEventListener("click", () => {
      openTaskCreateForParent(task);
    });
    menu.dataset.taskId = task.id;
    dialog.append(editorForm);
    (taskEditorDialogRoot ?? document.body).append(dialog);
    close.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeEdit();
    });
  }
  if (surface === "tasks") {
    row.classList.toggle("is-selected", selectedTaskDetailId === task.id);
    title.setAttribute("aria-expanded", String(selectedTaskDetailId === task.id));
    const completion = document.createElement("label");
    completion.className = "task-completion-toggle";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = task.state === "completed";
    check.disabled = !writable || deleted || task.state === "abandoned";
    if (!deleted && task.state !== "abandoned") {
      check.dataset.taskStateAction = check.checked ? "pending" : "completed";
      check.dataset.taskStateTask = task.id;
    }
    check.setAttribute("aria-label", `${t(check.checked ? "tasks.reopen" : "tasks.complete")} · ${task.name}`);
    completion.append(check);
    const scheduleText = document.createElement("small");
    scheduleText.className = "task-row-schedule";
    scheduleText.textContent = taskScheduleText(task.date, task.time, task.executionEnd);
    heading.replaceChildren(completion, rowMain, scheduleText);
    rowMain.replaceChildren(titleLine);
    heading.addEventListener("click", event => {
      if ((event.target as HTMLElement).closest("button,input,label")) return;
      toggleTaskEditorDetails(title);
    });
  }
  row.append(heading);
  if (!dialog) row.append(editorForm);
  const closeEditorDialog = (): void => {
    if (dialog) {
      dialog.hidden = true;
      selectedTaskDetailId = null;
      taskEditorDialogRoot?.toggleAttribute("hidden", true);
      row.classList.remove("is-selected");
      title.focus();
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
    if (editingTasks) return;
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
    row.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleTaskEditorDetails(title);
      const selectedMore = taskEditorDialogRoot?.querySelector<HTMLDetailsElement>(
        `[data-task-editor-dialog="${CSS.escape(task.id)}"] [data-task-more]`,
      );
      if (selectedMore) {
        selectedMore.open = true;
        selectedMore.querySelector("summary")?.focus();
      }
    });
    editorForm.addEventListener("input", () => {
      updateTaskEditorSummaries(editorForm, currentTasksView);
      stashTaskEditDraft(editorForm);
    });
    editorForm.addEventListener("change", (event) => {
      const target = event.target as HTMLElement;
      if (target.matches("input[data-task-date]")) {
        normalizeTaskDateTimeFields(
          editorForm.querySelector<HTMLInputElement>("[data-task-date]"),
          editorForm.querySelector<HTMLInputElement>("[data-task-time]"),
        );
      }
      updateTaskEditorSummaries(editorForm, currentTasksView);
      stashTaskEditDraft(editorForm);
    });
    editorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopPropagation();
      stashTaskEditDraft(editorForm);
      void pendingWrites.track(updateTask(task.id, editorForm, surface));
    });
    editorForm.querySelector<HTMLButtonElement>("[data-task-correct-completion]")?.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        void pendingWrites.track(correctTaskCompletion(task.id, editorForm, surface));
      },
    );
  }
  return row;
}

function taskHistorySection(
  tasks: readonly TaskView[], view: TasksView,
  surface: TaskSurface, folded: boolean,
  openEditors: ReadonlySet<string> = new Set(),
): HTMLElement | null {
  if (!tasks.length) return null;
  const section = document.createElement(folded ? "details" : "section");
  section.className = "task-ended-history";
  if (folded && tasks.some(task => openEditors.has(task.id))) {
    (section as HTMLDetailsElement).open = true;
  }
  const heading = document.createElement(folded ? "summary" : "h4");
  const headingKey = surface === "today" || (!folded && tasks[0].state === "completed")
    ? "tasks.completedHistory"
    : !folded && tasks[0].state === "abandoned"
      ? "tasks.abandonedHistory"
      : "tasks.endedHistory";
  setCopy(heading, headingKey, { count: tasks.length });
  const rows = document.createElement("div");
  rows.className = "tasks-list";
  section.append(heading, rows);
  let limit = 30;
  const editors = new Map<string, HTMLElement>();
  const render = (): void => {
    if (folded && !(section as HTMLDetailsElement).open) {
      return;
    }
    const writable = surface === "today"
      ? canMutateTodayTasks({ todayOperationCount, taskOperationCount,
          hasTargetBinding: Boolean(view.targetBinding), state: view.state,
          isPresentationCurrent: todayPresentationFresh })
      : Boolean(view.targetBinding) && view.state !== "error" && view.state !== "unconfigured" && taskOperationCount === 0;
    const includedTaskIds = new Set(openEditors);
    if (surface === "tasks" && taskFocusRequestId) includedTaskIds.add(taskFocusRequestId);
    if (surface === "tasks" && selectedTaskDetailId) includedTaskIds.add(selectedTaskDetailId);
    const visibleGroups = taskHistoryGroups(tasks, limit, includedTaskIds);
    const visibleCount = visibleGroups.reduce((count, group) => count + group.tasks.length, 0);
    const groups = visibleGroups.map(group => {
      const container = document.createElement("section");
      container.className = "task-history-date-group";
      const date = document.createElement("h4");
      if (group.date) date.textContent = group.date;
      else setCopy(date, "tasks.historyUnknownDate");
      container.append(date, ...group.tasks.map(task => {
        let editor = editors.get(task.id);
        if (!editor) {
          editor = taskEditor(task, writable, view, surface, openEditors.has(task.id));
          editors.set(task.id, editor);
        }
        return editor;
      }));
      return container;
    });
    rows.replaceChildren(...groups);
    if (tasks.length > visibleCount) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "secondary-button";
      const nextCount = taskHistoryGroups(tasks, limit + 30, includedTaskIds)
        .reduce((count, group) => count + group.tasks.length, 0);
      setCopy(more, "tasks.historyMore", { count: nextCount - visibleCount });
      more.addEventListener("click", () => { limit += 30; render(); });
      rows.append(more);
    }
  };
  section.addEventListener("toggle", render);
  if (!folded || (section as HTMLDetailsElement).open) render();
  return section;
}

function taskTreeRows(tasks: readonly TaskView[], view: TasksView, writable: boolean): HTMLElement[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const children = new Map<string, TaskView[]>();
  for (const task of tasks) {
    const parentId = task.parentTaskId ?? null;
    if (!parentId || !byId.has(parentId)) continue;
    const siblings = children.get(parentId) ?? [];
    siblings.push(task);
    children.set(parentId, siblings);
  }
  const rows: HTMLElement[] = [];
  const visited = new Set<string>();
  const append = (task: TaskView, depth: number): void => {
    if (visited.has(task.id)) return;
    visited.add(task.id);
    const parentVisible = Boolean(task.parentTaskId && byId.has(task.parentTaskId));
    const row = taskEditor(task, writable, view, "tasks", false, parentVisible);
    row.dataset.taskDepth = String(Math.min(depth, 4));
    row.style.setProperty("--task-indent", `${Math.min(depth, 4) * 12}px`);
    rows.push(row);
    for (const child of children.get(task.id) ?? []) append(child, depth + 1);
  };
  for (const task of tasks) {
    if (!task.parentTaskId || !byId.has(task.parentTaskId)) append(task, 0);
  }
  for (const task of tasks) append(task, 0);
  return rows;
}

function renderTasks(view: TasksView): void {
  if (selectedTaskDetailBinding !== view.targetBinding) selectedTaskDetailId = null;
  currentTasksView = view;
  selectedTaskDetailBinding = view.targetBinding;
  if (taskFocusRequestId) selectedTaskDetailId = taskFocusRequestId;
  if (taskFocusRequestId) {
    const focused = view.tasks.find(task => task.id === taskFocusRequestId);
    if (focused) {
      taskStateScope = focused.deletedAt ? "deleted" : focused.state;
      const focusedList = taskListForId(view, focused.listId);
      taskScope = focusedList?.archived ? "archived"
        : focusedList?.isSystem ? "inbox"
        : focusedList ? taskListScopeForId(focused.listId) : "all";
    }
  }
  const folderScopeId = taskFolderIdFromScope(taskScope);
  const scopedListId = taskListIdFromScope(taskScope);
  const scopedList = scopedListId ? taskListForId(view, scopedListId) : undefined;
  const scopedFolder = folderScopeId ? taskFolderForId(view, folderScopeId) : undefined;
  if (
    (taskScope.startsWith("list:") && !scopedList) ||
    (taskScope.startsWith("folder:") && !scopedFolder)
  ) {
    taskScope = "all";
  } else if (scopedList?.archived) {
    taskScope = "archived";
  }
  renderTaskListScopeButtons(view);
  renderTaskPropertyFilters(view);
  const quickProperties = view.targetBinding
    ? taskQuickPropertyDrafts.get(view.targetBinding)
    : undefined;
  const folderLists = folderScopeId
    ? activeTaskLists(view).filter((list) => list.folderId === folderScopeId)
    : [];
  const folderListIds = folderScopeId
    ? new Set(folderLists.map((list) => list.id))
    : undefined;
  const quickListSelection = quickProperties?.listId ?? taskCreateListDefault(view);
  renderTaskListSelect(
    taskQuickList,
    view,
    quickListSelection,
    false,
    folderListIds,
  );
  renderTaskListSelect(taskQuickFolderList, view, quickListSelection, false, folderListIds);
  if (taskQuickFolderList && taskQuickList && taskQuickFolderList.value) {
    taskQuickList.value = taskQuickFolderList.value;
  }
  if (taskQuickFolderTarget) taskQuickFolderTarget.hidden = !folderScopeId;
  if (taskQuickFolderEmpty) {
    taskQuickFolderEmpty.hidden = !folderScopeId || folderLists.length > 0;
  }
  if (taskQuickPriority) taskQuickPriority.value = quickProperties?.priority ?? "";
  renderTaskTagChoices(taskQuickTagChoices, view, quickProperties?.tagIds ?? [], taskOperationCount > 0);
  renderTaskParentSelect(
    taskQuickParent,
    view,
    quickProperties?.parentTaskId ?? null,
    taskOperationCount > 0,
  );
  if (taskQuickForm) {
    const quickDraft = view.targetBinding ? taskQuickDrafts.get(view.targetBinding) ?? "" : "";
    if (taskQuickName && taskQuickName.value !== quickDraft) taskQuickName.value = quickDraft;
  }
  const archivedListIds = new Set(
    view.lists.filter((list) => list.archived).map((list) => list.id),
  );
  const todayGroups =
    taskScope === "today" && (currentTaskLivedDate ?? view.currentDate)
      ? todayTaskGroups(view.tasks, (currentTaskLivedDate ?? view.currentDate)!, true, archivedListIds)
      : null;
  const scopedTasks = todayGroups
    ? [...todayGroups.scheduled, ...todayGroups.overdue].filter(
        (task) => taskStateScope === "all" || task.state === taskStateScope,
      )
    : view.tasks.filter((task) =>
        taskVisibleInScope(
          {
            ...task,
            listArchived: archivedListIds.has(task.listId),
            listFolderId: taskFolderIdsByList(view).get(task.listId) ?? null,
          },
          taskScope,
          taskStateScope,
        ),
      );
  const propertyTasks = taskPropertiesPresentation(
    scopedTasks,
    taskPriorityFilter,
    taskTagFilter,
    taskPrioritySort,
  );
  if (selectedTaskDetailId && !propertyTasks.some((task) => task.id === selectedTaskDetailId)) {
    selectedTaskDetailId = null;
  }
  const { main: visibleTasks, history: historyTasks } = taskDisplaySections(propertyTasks, taskStateScope);
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
          : taskStateScope === "all" || taskStateScope === "pending"
            ? "tasks.emptyPending"
            : "tasks.emptyFiltered",
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
  if (taskFolderCreateForm) {
    taskFolderCreateForm.hidden = !canOperate || !taskListManagementOpen;
    if (view.targetBinding && taskFolderCreateName) {
      taskFolderCreateName.value = taskFolderCreateDrafts.get(view.targetBinding) ?? "";
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
      false,
      folderListIds,
    );
    renderTaskParentSelect(taskCreateParent, view, draft?.parentTaskId ?? null, taskOperationCount > 0);
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
    if (taskCreatePriority) taskCreatePriority.value = draft?.priority ?? "";
    renderTaskTagChoices(taskCreateTagChoices, view, draft?.tagIds ?? [], taskOperationCount > 0);
    if (taskCreateDate) {
      taskCreateDate.value =
        draft?.date ?? (taskScope === "today" ? currentTaskLivedDate ?? view.currentDate ?? "" : "");
    }
    if (taskCreateTime) taskCreateTime.value = draft?.time ?? "";
    if (taskCreateEndDate) taskCreateEndDate.value = draft?.endDate ?? "";
    if (taskCreateEndTime) taskCreateEndTime.value = draft?.endTime ?? "";
    normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime);
  }
  taskCreateSubmit?.toggleAttribute(
    "disabled",
    !writable || taskScope === "archived" || Boolean(folderScopeId && folderLists.length === 0),
  );
  updateTaskCreationControls(view, taskOperationCount > 0);
  clearTaskEditorDialogs("tasks");
  const historyFilter = taskStateScope === "completed" || taskStateScope === "abandoned";
  const taskRows: HTMLElement[] = [];
  if (folderScopeId) {
    for (const list of folderLists) {
      const group = document.createElement("section");
      group.className = "task-list-folder-group";
      group.dataset.taskListGroup = list.id;
      const heading = document.createElement("div");
      heading.className = "task-list-folder-group-heading";
      const name = document.createElement("h4");
      name.textContent = list.name;
      const count = document.createElement("small");
      setCopy(count, "tasks.listCount", {
        count: taskListCount([...visibleTasks, ...historyTasks], list.id, taskStateScope),
      });
      heading.append(name, count);
      group.append(heading);
      const listVisibleTasks = visibleTasks.filter((task) => task.listId === list.id);
      const listHistoryTasks = historyTasks.filter((task) => task.listId === list.id);
      if (historyFilter) {
        const ended = taskHistorySection(
          listVisibleTasks,
          view,
          "tasks",
          false,
          new Set(selectedTaskDetailId ? [selectedTaskDetailId] : []),
        );
        if (ended) group.append(ended);
      } else {
        group.append(...taskTreeRows(listVisibleTasks, view, canOperate));
        const ended = taskHistorySection(
          listHistoryTasks,
          view,
          "tasks",
          true,
          new Set(selectedTaskDetailId ? [selectedTaskDetailId] : []),
        );
        if (ended) group.append(ended);
      }
      if (listVisibleTasks.length === 0 && listHistoryTasks.length === 0) {
        const empty = document.createElement("p");
        empty.className = "task-meta task-list-folder-empty";
        setCopy(empty, "tasks.emptyListInFolder");
        group.append(empty);
      }
      taskRows.push(group);
    }
  } else {
    if (!historyFilter) taskRows.push(...taskTreeRows(visibleTasks, view, canOperate));
    const history = taskHistorySection(
      historyFilter ? visibleTasks : historyTasks,
      view,
      "tasks",
      !historyFilter,
      new Set(selectedTaskDetailId ? [selectedTaskDetailId] : []),
    );
    if (history) taskRows.push(history);
  }
  tasksList?.replaceChildren(...taskRows);
  const selectedPanel = taskEditorDialogRoot?.querySelector<HTMLElement>(
    `[data-task-editor-dialog="${CSS.escape(selectedTaskDetailId ?? "")}"]`,
  );
  taskEditorDialogRoot?.toggleAttribute("hidden", !selectedPanel);
  if (taskReturnToCollaborationButton) {
    taskReturnToCollaborationButton.hidden = !taskReturnToCollaborationSessionId;
  }
  if (taskFocusRequestId) {
    const focusedTask = tasksList?.querySelector<HTMLElement>(
      `[data-task-editor-row="${CSS.escape(taskFocusRequestId)}"]`,
    );
    if (focusedTask) {
      const taskId = taskFocusRequestId;
      taskFocusRequestId = null;
      const details = focusedTask.querySelector<HTMLButtonElement>(
        `button[data-task-editor-open="${CSS.escape(taskId)}"]`,
      );
      if (details?.getAttribute("aria-expanded") !== "true") details?.click();
      window.requestAnimationFrame(() => {
        focusedTask.scrollIntoView({ block: "center", behavior: "smooth" });
        details?.focus();
      });
    }
  }
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
      "[data-task-name], [data-task-content], [data-task-list], [data-task-parent], [data-task-date], [data-task-time], [data-task-end-date], [data-task-end-time], [data-task-clear-end], [data-task-clear-timed-schedule], [data-task-completion-date], [data-task-completion-time], [data-task-priority], input[data-task-tag-choice], input[data-task-tag-new], input[data-task-tag-rename], button[data-task-tag-create], button[data-task-tag-rename-begin], button[data-task-tag-rename-save], button[data-task-tag-rename-cancel], button[data-task-tag-delete], button[data-task-open-schedule], button[data-task-open-list], button[data-task-open-parent-relationship], button[data-task-add-child], button[data-task-correct-completion], button[type=submit]",
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

function updateTaskMutationControls(
  container: HTMLElement | null,
  writable: boolean,
  busy: boolean,
): void {
  container?.querySelectorAll(
    "input[data-task-state-action], button[data-task-state-action], button[data-task-delete], button[data-task-restore]",
  ).forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = busy || !writable;
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
  const todayWritable = canMutateTodayTasks({
    todayOperationCount,
    taskOperationCount,
    hasTargetBinding: Boolean(currentTodayView?.tasks.targetBinding),
    state: currentTodayView?.tasks.state ?? "unconfigured",
    isPresentationCurrent: todayPresentationFresh,
  });
  todayTaskCreateForm?.toggleAttribute("hidden", !todayWritable);
  todayTaskCreateForm?.querySelectorAll("input, textarea, select, button").forEach((element) => {
    (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
      busy || !todayWritable;
  });
  updateTaskEditorOperationState("today", todayWritable, busy);
  updateTaskMutationControls(todayTaskPanel, todayWritable, busy);
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
  updateTaskMutationControls(calendarTaskPanel, calendarCanOperate, busy);
  taskListCreateForm?.querySelectorAll("input, button").forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = busy || !canOperate;
  });
  taskFolderCreateForm?.querySelectorAll("input, button").forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = busy || !canOperate;
  });
  taskListScopes?.querySelectorAll<HTMLButtonElement>("[data-task-scope]").forEach((button) =>
    button.toggleAttribute("disabled", busy),
  );
  taskListsManagement?.querySelectorAll("input, button").forEach((element) => {
    (element as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = busy || !canOperate;
  });
  updateTaskMutationControls(tasksList, canOperate, busy);
  updateTaskMutationControls(taskEditorDialogRoot, canOperate, busy);
  updateTaskEditorOperationState("tasks", writable, busy);
  if (currentTasksView) updateTaskCreationControls(currentTasksView, busy);
  updateTodayTaskCreationControls();
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
    const [view, clock] = await Promise.all([
      window.__TAURI__.core.invoke<TasksView>("tasks_view"),
      window.__TAURI__.core.invoke<TodayClockView>("today_clock"),
    ]);
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
    currentTaskLivedDate = clock.livedDate;
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

async function refreshTaskScheduleClock(): Promise<void> {
  if (currentWorkspaceDestination !== "tasks" || taskOperationCount > 0) return;
  const binding = currentTasksView?.targetBinding;
  try {
    const clock = await window.__TAURI__.core.invoke<TodayClockView>("today_clock");
    if (currentWorkspaceDestination !== "tasks" || currentTasksView?.targetBinding !== binding || taskOperationCount > 0) return;
    if (clock.livedDate !== currentTaskLivedDate) {
      currentTaskLivedDate = clock.livedDate;
      if (currentTasksView) renderTasks(currentTasksView);
    }
  } catch { /* Keep the last observed application date; never guess from UTC. */ }
}

function updateTaskCreationControls(view: TasksView, busy: boolean): void {
  const binding = view.targetBinding;
  const attempt = binding ? taskCreateAttempts.get(binding) : undefined;
  const writable = Boolean(binding) && !["error", "unconfigured"].includes(view.state) &&
    taskStateScope !== "deleted" && taskScope !== "archived";
  const folderId = taskFolderIdFromScope(taskScope);
  const hasFolderTarget = !folderId || activeTaskLists(view).some((list) => list.folderId === folderId);
  taskQuickForm?.toggleAttribute("hidden", !writable);
  if (taskQuickName) {
    taskQuickName.disabled = busy || !writable || Boolean(attempt);
    taskQuickName.value = binding ? taskQuickDrafts.get(binding) ?? "" : "";
  }
  const schedule = attempt?.origin === "quick" ? attempt.draft : binding ? taskQuickScheduleDrafts.get(binding) : undefined;
  if (taskQuickDate) taskQuickDate.value = schedule?.date ?? currentTaskLivedDate ?? "";
  if (taskQuickTime) taskQuickTime.value = schedule?.time ?? "";
  taskQuickForm?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>("input, select, button").forEach((field) => {
    field.disabled = busy || !writable || Boolean(attempt);
  });
  normalizeTaskDateTimeFields(taskQuickDate, taskQuickTime, busy || !writable || Boolean(attempt));
  updateCompactScheduleLabel("task-quick", taskQuickDate, taskQuickTime);
  taskQuickSubmit?.toggleAttribute("disabled", busy || !writable || !hasFolderTarget || Boolean(attempt));
  taskNewButton?.toggleAttribute("disabled", busy || !writable || !hasFolderTarget || attempt?.origin === "quick");
  taskQuickRecovery?.toggleAttribute("hidden", attempt?.origin !== "quick");
  taskQuickRecheck?.toggleAttribute("disabled", busy || !binding);
  taskQuickRetry?.toggleAttribute("disabled", busy || !writable || attempt?.phase !== "retry-ready");
  taskQuickEndAttempt?.toggleAttribute("disabled", busy || !attempt || attempt.phase === "unverified");
  taskCreateForm?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>("input, textarea, select, button").forEach(field => {
    field.disabled = busy || !writable || Boolean(attempt);
  });
  if (!busy && !attempt) normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime, !writable);
  taskCreateSubmit?.toggleAttribute("disabled", busy || !writable || !hasFolderTarget || Boolean(attempt));
  taskCreateCancel?.toggleAttribute("disabled", busy);
  taskCreateRecheck?.toggleAttribute("hidden", attempt?.origin !== "modal");
  taskCreateRetry?.toggleAttribute("hidden", attempt?.origin !== "modal");
  taskCreateEndAttempt?.toggleAttribute("hidden", attempt?.origin !== "modal");
  taskCreateRecheck?.toggleAttribute("disabled", busy || !binding);
  taskCreateRetry?.toggleAttribute("disabled", busy || !writable || attempt?.phase !== "retry-ready");
  taskCreateEndAttempt?.toggleAttribute("disabled", busy || !attempt || attempt.phase === "unverified");
  renderEndedTaskCreations(view);
}

function renderEndedTaskCreations(view: TasksView, region = taskEndedCreateRegion, key = view.targetBinding): void {
  if (!region) return;
  const ended = key ? taskEndedCreateAttempts.get(key) ?? [] : [];
  region.hidden = ended.length === 0;
  region.replaceChildren(...ended.map(attempt => {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    setCopy(summary, "tasks.endedSubmission", {name: attempt.draft.name});
    const note = document.createElement("p");
    setCopy(note, attempt.phase === "conflict" ? "tasks.endedConflict" : "tasks.endedAbsent");
    const fields = document.createElement("dl");
    const field = (key: InterfaceCopyKey, value: string) => {
      const label = document.createElement("dt"); setCopy(label, key);
      const content = document.createElement("dd"); content.textContent = value;
      fields.append(label, content);
    };
    field("tasks.name", attempt.draft.name);
    field("tasks.content", attempt.draft.content);
    field("tasks.list", attempt.originalInput.listId === "inbox" ? t("tasks.inbox") : attempt.listName);
    field("tasks.date", taskScheduleText(attempt.originalInput.date, attempt.originalInput.time, attempt.originalInput.executionEnd));
    details.append(summary, note, fields);
    if (view.tasks.some(task => task.id === attempt.originalInput.taskId)) {
      const existing = document.createElement("button");
      existing.type = "button"; existing.className = "secondary-button";
      existing.disabled = taskOperationCount > 0;
      setCopy(existing, "tasks.viewExisting");
      existing.addEventListener("click", () => {
        if (taskOperationCount > 0) return;
        taskFocusRequestId = attempt.originalInput.taskId;
        if (attempt.origin === "today") showWorkspaceDestination("tasks");
        else if (currentTasksView) renderTasks(currentTasksView);
      });
      details.append(existing);
    }
    return details;
  }));
}

function taskCreationContext(today = false) {
  const surface: TaskSurface = today ? "today" : "tasks";
  const loaded = taskSurfaceView(surface);
  const binding = loaded?.targetBinding;
  const date = today ? currentTodayView?.date ?? null : null;
  const key = binding ? today && date ? todayTaskCreateDraftKey(binding, date) : binding : null;
  return {surface, loaded, binding, date, key, requests: today ? todayTaskRequests : taskRequests};
}

function updateTodayTaskCreationControls(): void {
  const {loaded, key} = taskCreationContext(true);
  const attempt = key ? taskCreateAttempts.get(key) : undefined;
  const writable = canMutateTodayTasks({todayOperationCount, taskOperationCount, hasTargetBinding: Boolean(loaded?.targetBinding), state: loaded?.state ?? "unconfigured", isPresentationCurrent: todayPresentationFresh});
  const busy = taskOperationCount > 0;
  todayTaskCreateForm?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>("input, textarea, select, button").forEach(field => field.disabled = busy || !writable || Boolean(attempt));
  normalizeTaskDateTimeFields(todayTaskCreateDate, todayTaskCreateTime, busy || !writable || Boolean(attempt));
  document.querySelector("#today-task-create-recovery")?.toggleAttribute("hidden", !attempt);
  document.querySelector("#today-task-create-recheck")?.toggleAttribute("disabled", busy || !loaded?.targetBinding);
  document.querySelector("#today-task-create-retry")?.toggleAttribute("disabled", busy || !writable || attempt?.phase !== "retry-ready");
  document.querySelector("#today-task-create-end-attempt")?.toggleAttribute("disabled", busy || !attempt || attempt.phase === "unverified");
  if (loaded) renderEndedTaskCreations(loaded, document.querySelector("#today-task-create-ended-attempts"), key);
}

function endTaskCreationAttempt(today = false): void {
  const {surface, loaded, binding, key} = taskCreationContext(today);
  const attempt = key ? taskCreateAttempts.get(key) : undefined;
  if (!loaded || !binding || !key || !attempt || taskOperationCount > 0 || attempt.phase === "unverified") return;
  taskEndedCreateAttempts.set(key, [...taskEndedCreateAttempts.get(key) ?? [], attempt]);
  taskCreateAttempts.delete(key);
  if (today) { todayTaskCreateDrafts.delete(key); todayTaskCreateForm?.reset(); }
  else {
    taskQuickDrafts.delete(binding); taskQuickScheduleDrafts.delete(binding); taskQuickPropertyDrafts.delete(binding);
    taskCreateDrafts.delete(binding); taskQuickForm?.reset(); taskCreateForm?.reset();
    taskCreateOpen = false; taskCreateDialog?.close();
  }
  renderTaskSurface(surface, loaded);
  setCopy(taskSurfaceStatus(surface), attempt.phase === "conflict" ? "tasks.endedConflict" : "tasks.endedAbsent");
  (today ? todayTaskCreateName : attempt.origin === "quick" ? taskQuickName : taskNewButton)?.focus();
}

function taskCreateAttemptMatches(task: TaskView, attempt: TaskCreateAttempt): boolean {
  const input = attempt.input;
  return task.id === input.taskId && task.name === input.name && task.content === input.content &&
    task.date === input.date && task.time === input.time && task.listId === input.listId &&
    (task.executionEnd?.date ?? null) === (input.executionEnd?.date ?? null) &&
    (task.executionEnd?.time ?? null) === (input.executionEnd?.time ?? null) &&
    (input.priority === undefined || (task.priority ?? null) === input.priority) &&
    (input.tagIds === undefined ||
      JSON.stringify(task.tagIds ?? []) === JSON.stringify(input.tagIds)) &&
    (input.parentTaskId === undefined ||
      (task.parentTaskId ?? null) === input.parentTaskId);
}

function finishTaskCreation(binding: string, attempt: TaskCreateAttempt, view: TasksView): void {
  const key = attempt.origin === "today" ? todayTaskCreateDraftKey(binding, attempt.surfaceDate!) : binding;
  taskCreateAttempts.delete(key);
  if (attempt.origin === "today") {
    todayTaskCreateDrafts.delete(key); todayTaskCreateForm?.reset();
  } else if (attempt.origin === "quick") {
    taskQuickDrafts.delete(binding);
    taskQuickScheduleDrafts.delete(binding);
    taskQuickPropertyDrafts.delete(binding);
    taskQuickForm?.reset();
  } else {
    taskCreateDrafts.delete(binding);
    taskCreateForm?.reset();
    taskCreateOpen = false;
    taskCreateDialog?.close();
  }
  const surface = attempt.origin === "today" ? "today" : "tasks";
  renderTaskSurface(surface, view);
  const status = taskSurfaceStatus(surface);
  setCopy(status, "tasks.saved");
  if (status) status.dataset.state = "ready";
}

async function recheckTaskCreation(today = false): Promise<boolean> {
  const {surface, loaded, binding, key, date, requests} = taskCreationContext(today);
  const attempt = key ? taskCreateAttempts.get(key) : undefined;
  if (!loaded || !binding || !key || !attempt || taskOperationCount > 0) return false;
  const status = today ? todayTaskStatus : attempt.origin === "quick" ? tasksStatus : taskCreateStatus;
  const request = requests.begin();
  updateTaskOperationState(1);
  try {
    const latest = await window.__TAURI__.core.invoke<TasksView>("tasks_view");
    if (!taskSurfaceIsCurrent(surface, request, binding, latest.targetBinding, date, loaded.revision) ||
      !["ready", "empty"].includes(latest.state)) throw Error(latest.message || t("tasks.confirmationFailed"));
    const existing = latest.tasks.find(task => task.id === attempt.input.taskId);
    if (existing && taskCreateAttemptMatches(existing, attempt)) {
      finishTaskCreation(binding, attempt, latest);
      return true;
    }
    attempt.phase = existing ? "conflict" : "retry-ready";
    if (!existing) attempt.input = {...attempt.input, expectedRevision: latest.revision};
    renderTaskSurface(surface, latest);
    setCopy(status, existing ? "tasks.createIdentityConflict" : "tasks.retryReady");
    return false;
  } catch (error) {
    attempt.phase = "unverified";
    setCopyError(status, "tasks.createUnconfirmed", error);
    if (status) status.dataset.state = "error";
    return false;
  } finally {
    updateTaskOperationState(-1);
    if (!taskCreateAttempts.has(key)) (today ? todayTaskCreateName : attempt.origin === "quick" ? taskQuickName : taskNewButton)?.focus();
  }
}

async function createTask(quick = false, retry = false): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const status = quick ? tasksStatus : taskCreateStatus;
  if (!loaded || !binding || ["error", "unconfigured"].includes(loaded.state) || taskOperationCount > 0 ||
    taskScope === "archived" || taskStateScope === "deleted") return false;
  let attempt = taskCreateAttempts.get(binding);
  if (attempt) {
    if (!retry || attempt.phase !== "retry-ready" || attempt.origin !== (quick ? "quick" : "modal")) return false;
  } else {
    if (retry) return false;
    const draft = quick ? readTaskDraft(taskQuickForm!) : readTaskDraft(taskCreateForm!);
    const folderId = taskFolderIdFromScope(taskScope);
    if (folderId && !activeTaskLists(loaded).some((list) => list.folderId === folderId)) {
      setCopy(status, "tasks.folderNeedsList");
      if (status) status.dataset.state = "error";
      return false;
    }
    if (!draft.name.trim()) {
      setCopy(status, "tasks.enterName");
      if (status) status.dataset.state = "error";
      (quick ? taskQuickName : taskCreateName)?.focus();
      return false;
    }
    const normalized = normalizeTaskSchedule(draft.date, draft.time);
    if ((draft.endDate || draft.endTime) && (!normalized.date || !normalized.time || !draft.endDate || !draft.endTime ||
      `${draft.endDate}T${draft.endTime}` <= `${normalized.date}T${normalized.time}`)) {
      setCopy(status, "tasks.invalidExecutionInterval");
      return false;
    }
    const input: TaskCreateInput = {targetBinding: binding, expectedRevision: loaded.revision, taskId: localOperationId("manual-task"),
      name: draft.name.trim(), content: draft.content.trim() || null, date: normalized.date, time: normalized.time,
      listId: draft.listId || "inbox", executionEnd: draft.endDate && draft.endTime ? {date: draft.endDate, time: draft.endTime} : null,
      ...(draft.parentTaskId ? {parentTaskId: draft.parentTaskId} : {}),
      ...(draft.priority ? {priority: draft.priority} : {}),
      ...(draft.tagIds?.length ? {tagIds: draft.tagIds} : {}),
    };
    attempt = {
      origin: quick ? "quick" : "modal", draft, phase: "unverified", input, originalInput: input,
      listName: taskListDisplayName(taskListForId(loaded, input.listId) ?? {id: input.listId, name: input.listId, isSystem: false, archived: false}, t("tasks.inbox")),
    };
    taskCreateAttempts.set(binding, attempt);
    if (quick) taskQuickDrafts.set(binding, draft.name);
    else taskCreateDrafts.set(binding, draft);
  }
  return submitTaskCreation(attempt, loaded, binding);
}

async function submitTaskCreation(attempt: TaskCreateAttempt, loaded: TasksView, binding: string): Promise<boolean> {
  const today = attempt.origin === "today";
  compactScheduleTransactions.get(today ? "today-task-create" : "task-quick")?.invalidate();
  const surface: TaskSurface = today ? "today" : "tasks";
  const date = today ? attempt.surfaceDate ?? null : null;
  const key = today ? todayTaskCreateDraftKey(binding, date!) : binding;
  const status = today ? todayTaskStatus : attempt.origin === "quick" ? tasksStatus : taskCreateStatus;
  attempt.phase = "unverified";
  const request = (today ? todayTaskRequests : taskRequests).begin();
  updateTaskOperationState(1);
  try {
    const hasTaskProperties = Boolean(attempt.input.priority || attempt.input.tagIds?.length || attempt.input.parentTaskId);
    const command = today || !hasTaskProperties ? "create_task" : "create_task_with_properties";
    const view = await window.__TAURI__.core.invoke<TasksView>(command, {input: attempt.input});
    const responseIsCurrent = taskSurfaceIsCurrent(surface, request, binding, view.targetBinding, date, loaded.revision);
    if (!taskMutationConfirmed(responseIsCurrent, view.state, view.tasks.some(task => taskCreateAttemptMatches(task, attempt)))) {
      throw Error(view.state === "error" ? view.message : t("tasks.confirmationFailed"));
    }
    finishTaskCreation(binding, attempt, view);
    return true;
  } catch (error) {
    if (taskSurfaceIsCurrent(surface, request, binding, binding, date, loaded.revision)) {
      renderTaskSurface(surface, loaded);
      setCopyError(status, "tasks.createUnconfirmed", error);
      if (status) status.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
    if (!taskCreateAttempts.has(key)) (today ? todayTaskCreateName : attempt.origin === "quick" ? taskQuickName : taskNewButton)?.focus();
  }
}

async function createTodayTask(retry = false): Promise<boolean> {
  const {loaded, binding, key, date} = taskCreationContext(true);
  if (!loaded || !binding || !key || !date || !canMutateTodayTasks({todayOperationCount, taskOperationCount, hasTargetBinding: true, state: loaded.state, isPresentationCurrent: todayPresentationFresh})) return false;
  let attempt = taskCreateAttempts.get(key);
  if (attempt) {
    if (!retry || attempt.phase !== "retry-ready") return false;
  } else {
    if (retry || !todayTaskCreateForm) return false;
    const draft = readTaskDraft(todayTaskCreateForm);
    if (!draft.name.trim()) { setCopy(todayTaskStatus, "tasks.enterName"); todayTaskCreateName?.focus(); return false; }
    const normalized = normalizeTaskSchedule(draft.date, draft.time);
    const input: TaskCreateInput = {targetBinding: binding, expectedRevision: loaded.revision, taskId: localOperationId("manual-task"), name: draft.name.trim(), content: draft.content.trim() || null, date: normalized.date, time: normalized.time, listId: draft.listId || "inbox", executionEnd: null};
    attempt = {origin: "today", surfaceDate: date, draft, input, originalInput: input, phase: "unverified", listName: taskListDisplayName(taskListForId(loaded, input.listId) ?? {id: input.listId, name: input.listId, isSystem: false, archived: false}, t("tasks.inbox"))};
    taskCreateAttempts.set(key, attempt);
    todayTaskCreateDrafts.set(key, draft);
  }
  return submitTaskCreation(attempt, loaded, binding);
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

type TaskTagMutationCommand = "create_task_tag" | "rename_task_tag" | "delete_task_tag";

type TaskFolderMutationCommand =
  | "create_task_folder"
  | "rename_task_folder"
  | "delete_task_folder"
  | "set_task_list_folder";

async function saveTaskFolderMutation(
  command: TaskFolderMutationCommand,
  loaded: TasksView,
  input: Record<string, unknown>,
  operationKey: string,
  confirms: (view: TasksView) => boolean,
  preserveDraft?: () => void,
  clearDraft?: () => void,
): Promise<boolean> {
  const binding = loaded.targetBinding;
  if (!binding || loaded.state === "error" || loaded.state === "unconfigured" || taskOperationCount > 0) {
    setCopyError(tasksStatus, "tasks.notSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  const request = taskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>(command, {input});
    const responseIsCurrent = taskSurfaceIsCurrent(
      "tasks",
      request,
      binding,
      view.targetBinding,
      null,
      loaded.revision,
    );
    const confirmed = responseIsCurrent && ["ready", "empty"].includes(view.state) && confirms(view);
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      clearDraft?.();
      renderTasks(view);
      setCopy(tasksStatus, "tasks.folderSaved");
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
    if (taskRequests.isCurrent(request) && currentWorkspaceDestination === "tasks" && currentTasksView?.targetBinding === binding) {
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

async function createTaskFolder(): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const name = taskFolderCreateName?.value.trim() ?? "";
  if (!loaded || !binding || !name) {
    setCopy(tasksStatus, "tasks.enterFolderName");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    taskFolderCreateName?.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "folder-create", name.toLocaleLowerCase()]);
  const folderId = stableTaskOperationId(operationKey, "task-folder");
  taskFolderCreateDrafts.set(binding, name);
  return saveTaskFolderMutation(
    "create_task_folder",
    loaded,
    {targetBinding: binding, expectedRevision: loaded.revision, folderId, name},
    operationKey,
    (view) => (view.folders ?? []).some((folder) => folder.id === folderId && folder.name === name),
    () => taskFolderCreateDrafts.set(binding, name),
    () => {
      taskFolderCreateDrafts.delete(binding);
      taskFolderCreateForm?.reset();
    },
  );
}

async function renameTaskFolder(folderId: string, input: HTMLInputElement): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const name = input.value.trim();
  if (!loaded || !binding || !name) {
    setCopy(tasksStatus, "tasks.enterFolderName");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    input.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "folder-rename", folderId, name]);
  taskFolderRenameDrafts.set(folderId, name);
  return saveTaskFolderMutation(
    "rename_task_folder",
    loaded,
    {targetBinding: binding, expectedRevision: loaded.revision, folderId, name},
    operationKey,
    (view) => (view.folders ?? []).some((folder) => folder.id === folderId && folder.name === name),
    () => taskFolderRenameDrafts.set(folderId, name),
    () => taskFolderRenameDrafts.delete(folderId),
  );
}

async function deleteTaskFolder(folderId: string): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  if (!loaded || !binding) return false;
  const folder = taskFolderForId(loaded, folderId);
  if (!folder || !window.confirm(t("tasks.deleteFolderConfirm", {folder: folder.name}))) return false;
  const operationKey = JSON.stringify([binding, "folder-delete", folderId]);
  const changeId = stableTaskOperationId(operationKey, "delete-task-folder");
  return saveTaskFolderMutation(
    "delete_task_folder",
    loaded,
    {targetBinding: binding, expectedRevision: loaded.revision, folderId, changeId},
    operationKey,
    (view) => !(view.folders ?? []).some((candidate) => candidate.id === folderId) &&
      view.lists.filter((list) => list.folderId === folderId).length === 0,
  );
}

async function setTaskListFolder(listId: string, folderId: string | null): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  if (!loaded || !binding) return false;
  const operationKey = JSON.stringify([binding, "list-folder", listId, folderId]);
  return saveTaskFolderMutation(
    "set_task_list_folder",
    loaded,
    {targetBinding: binding, expectedRevision: loaded.revision, listId, folderId},
    operationKey,
    (view) => view.lists.some((list) => list.id === listId && (list.folderId ?? null) === folderId),
  );
}

async function saveTaskTagMutation(
  command: TaskTagMutationCommand,
  loaded: TasksView,
  input: Record<string, unknown>,
  operationKey: string,
  confirms: (view: TasksView) => boolean,
): Promise<boolean> {
  const binding = loaded.targetBinding;
  if (
    !binding ||
    loaded.state === "error" ||
    loaded.state === "unconfigured" ||
    taskOperationCount > 0
  ) {
    setCopyError(tasksStatus, "tasks.tagNotSaved", t("tasks.refreshFirst"));
    if (tasksStatus) tasksStatus.dataset.state = "error";
    return false;
  }
  const request = taskRequests.begin();
  updateTaskOperationState(1);
  try {
    const view = await window.__TAURI__.core.invoke<TasksView>(command, {input});
    const current = taskSurfaceIsCurrent(
      "tasks",
      request,
      binding,
      view.targetBinding,
      null,
      loaded.revision,
    );
    const confirmed = current && ["ready", "empty"].includes(view.state) && confirms(view);
    if (confirmed) {
      taskOperationIds.delete(operationKey);
      renderTasks(view);
      setCopy(tasksStatus, "tasks.tagSaved");
      if (tasksStatus) tasksStatus.dataset.state = "ready";
    } else if (current) {
      setCopyError(
        tasksStatus,
        "tasks.tagNotSaved",
        view.state === "error" ? view.message : t("tasks.confirmationFailed"),
      );
      if (tasksStatus) tasksStatus.dataset.state = "error";
    }
    return confirmed;
  } catch (error) {
    if (taskRequests.isCurrent(request) && currentWorkspaceDestination === "tasks" && currentTasksView?.targetBinding === binding) {
      setCopyError(tasksStatus, "tasks.tagNotSaved", error);
      if (tasksStatus) tasksStatus.dataset.state = "error";
    }
    return false;
  } finally {
    updateTaskOperationState(-1);
  }
}

async function createTaskTag(input: HTMLInputElement): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const name = input.value.trim();
  if (!loaded || !binding || !name) {
    setCopy(tasksStatus, "tasks.tagNameInvalid");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    input.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "tag-create", name.toLocaleLowerCase()]);
  const tagId = stableTaskOperationId(operationKey, "task-tag");
  return saveTaskTagMutation(
    "create_task_tag",
    loaded,
    {targetBinding: binding, expectedRevision: loaded.revision, tagId, name},
    operationKey,
    (view) => (view.tags ?? []).some((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase()),
  );
}

async function renameTaskTag(tagId: string, input: HTMLInputElement): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  const name = input.value.trim();
  if (!loaded || !binding || !revision || !name) {
    setCopy(tasksStatus, "tasks.tagNameInvalid");
    if (tasksStatus) tasksStatus.dataset.state = "error";
    input.focus();
    return false;
  }
  const operationKey = JSON.stringify([binding, "tag-rename", tagId, name]);
  taskTagRenameDrafts.set(tagId, name);
  const saved = await saveTaskTagMutation(
    "rename_task_tag",
    loaded,
    {targetBinding: binding, expectedRevision: revision, tagId, name},
    operationKey,
    (view) => (view.tags ?? []).some((tag) => tag.id === tagId && tag.name === name),
  );
  if (saved) {
    taskTagRenameDrafts.delete(tagId);
    taskTagRenameEditId = null;
    if (currentTasksView) renderTasks(currentTasksView);
  }
  return saved;
}

async function deleteTaskTag(tagId: string): Promise<boolean> {
  const loaded = currentTasksView;
  const binding = loaded?.targetBinding;
  const revision = loaded?.revision;
  if (!loaded || !binding || !revision) return false;
  const tag = (loaded.tags ?? []).find((candidate) => candidate.id === tagId);
  if (!tag || !window.confirm(t("tasks.deleteTagConfirm", {tag: tag.name}))) return false;
  const operationKey = JSON.stringify([binding, "tag-delete", tagId]);
  const changeId = stableTaskOperationId(operationKey, "delete-task-tag");
  const deleted = await saveTaskTagMutation(
    "delete_task_tag",
    loaded,
    {targetBinding: binding, expectedRevision: revision, tagId, changeId},
    operationKey,
    (view) => !(view.tags ?? []).some((candidate) => candidate.id === tagId) &&
      view.tasks.every((task) => !(task.tagIds ?? []).includes(tagId)),
  );
  if (deleted && taskTagFilter === tagId) taskTagFilter = null;
  return deleted;
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
  if (surface === "today") return todayAxisTaskPopup?.open ? todayAxisTaskPopupStatus : todayTaskStatus;
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
    return isCurrentTodayTaskResponse(
      todayTaskRequests,
      token,
      currentWorkspaceDestination,
      currentTodayView?.date ?? null,
      expectedDate,
      currentTodayView?.tasks.targetBinding ?? null,
      expectedTargetBinding,
      responseTargetBinding,
      currentTodayView?.tasks.revision ?? null,
      expectedRevision,
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
  const axisPopupTaskId = surface === "today" && todayAxisTaskPopup?.open
    ? todayAxisTaskPopup.dataset.taskId ?? null
    : null;
  updateSharedTaskView(view);
  if (surface === "tasks") {
    renderTasks(view);
  } else if (surface === "today" && currentTodayView) {
    renderTodayTasks(currentTodayView, new Set<string>(), axisPopupTaskId !== null);
    renderTodayTimeAxis(currentTodayView);
    if (axisPopupTaskId) {
      const marker = todayTimedEvents?.querySelector<HTMLElement>(
        `[data-task-id="${CSS.escape(axisPopupTaskId)}"]`,
      );
      if (marker) openTodayAxisTaskPopup(axisPopupTaskId, marker, true);
      else closeTodayAxisTaskPopup(false, false);
    }
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
  if ((draft.endDate || draft.endTime) && (!normalized.date || !normalized.time || !draft.endDate || !draft.endTime ||
      `${draft.endDate}T${draft.endTime}` <= `${normalized.date}T${normalized.time}`)) {
    setCopyError(status, "tasks.notSaved", t("tasks.invalidExecutionInterval"));
    if (status) status.dataset.state = "error";
    return false;
  }
  const executionEnd = draft.endDate && draft.endTime ? {date: draft.endDate, time: draft.endTime} : null;
  const listId = draft.listId ?? task.listId;
  const edit = {
    targetBinding: binding,
    taskId,
    name,
    content: draft.content.trim() || null,
    date: normalized.date,
    time: normalized.time,
    executionEnd,
    listId,
    ...(surface === "tasks"
      ? {
          priority: draft.priority ?? null,
          tagIds: draft.tagIds ?? [],
          parentTaskId: draft.parentTaskId ?? null,
        }
      : {}),
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
        window.__TAURI__.core.invoke<TasksView>(
          surface === "tasks" ? "update_task_with_properties" : "update_task",
          { input },
        ),
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

  if (destination === "collaboration") {
    setCopy(workspaceRailContextKicker, "collaboration.sectionLabel");
    setCopy(workspaceRailContextTitle, "destination.collaboration");
    setCopy(workspaceRailContextDetail, "collaboration.sessionsLabel");
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
  if (destinationChanged || (destination === "today" && selectedTodayDate !== dailyDate)) {
    compactScheduleTransactions.forEach(transaction => transaction.invalidate());
  }
  const leavingSettings = currentWorkspaceDestination === "settings" && destination !== "settings";
  const leavingToday = currentWorkspaceDestination === "today" && destination !== "today";
  const leavingTasks = currentWorkspaceDestination === "tasks" && destination !== "tasks";
  const leavingCalendar = currentWorkspaceDestination === "calendar" && destination !== "calendar";
  const leavingHabits = currentWorkspaceDestination === "habits" && destination !== "habits";
  const leavingCollaboration =
    currentWorkspaceDestination === "collaboration" && destination !== "collaboration";
  const changingTodaySelection =
    destination === "today" &&
    (destinationChanged || selectedTodayDate !== dailyDate);
  if (leavingToday || changingTodaySelection) {
    todayUnlocatedOverride = null;
    todaySidebarReadingPosition = null;
    historicalHabitArrival.clear();
    todayPresentationRequests.invalidate();
    todayClockRequests.invalidate();
    todayTaskRequests.invalidate();
    if (changingTodaySelection) {
      stashTodayTaskCreateDraft();
      currentTodayView = null;
      historicalHabitCorrections?.toggleAttribute("hidden", true);
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
  if (leavingCollaboration) {
    cancelCollaborationVoiceCaptureForSelectionChange();
    stashCollaborationDraft();
    // Keep the active request observer alive across app navigation; Vault
    // reset and the actual turn terminal state still stop this shared watch.
  }
  if (leavingSettings && dailyPlanAutomationStatusTimer !== null) {
    window.clearInterval(dailyPlanAutomationStatusTimer);
    dailyPlanAutomationStatusTimer = null;
  }
  currentWorkspaceDestination = destination;
  renderDailyPlanReturnNavigation();
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
    const vaultRevision = collaborationVaultSelectionRevision;
    void refreshHabits().then(() => {
      if (vaultSelectionInProgress || vaultRevision !== collaborationVaultSelectionRevision ||
          currentWorkspaceDestination !== "habits" || selectedHabitCell !== selection) return;
      if (selection) void loadSelectedHabitDate(selection.habitKey, selection.date);
    });
  }
  if (destination === "collaboration") {
    if (collaborationDateInput) collaborationDateInput.value = collaborationActivityDate;
    if (collaborationTargetDateInput) collaborationTargetDateInput.value = collaborationTargetDate;
    void refreshCollaborationWorkspace();
    void refreshCollaborationConnection();
    renderCollaborationVoiceControls();
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
  if (currentWorkspaceDestination === "calendar") {
    updateCalendarTaskPreviewRows();
  }
  if (
    currentWorkspaceDestination === "today" &&
    currentTodayView?.isToday &&
    todayAxisFollowState === "following"
  ) {
    scheduleTodayAxisFollowScroll();
  }
});
installTodayAxisGestures();
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
    if (section === "appearance" || section === "data" || section === "codex") {
      showSettingsSection(section);
    }
  });
});

function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(value.getTime())) return date;
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

document.querySelector<HTMLButtonElement>("#collaboration-date-previous")?.addEventListener("click", () => {
  if (collaborationSessionCreationPromise || collaborationSessionCreationAttempt || vaultSelectionInProgress) return;
  collaborationActivityDateExplicit = true;
  collaborationActivityDate = shiftDate(collaborationDateInput?.value || collaborationActivityDate, -1);
  if (collaborationDateInput) collaborationDateInput.value = collaborationActivityDate;
  void refreshCollaborationWorkspace();
});

document.querySelector<HTMLButtonElement>("#collaboration-date-next")?.addEventListener("click", () => {
  if (collaborationSessionCreationPromise || collaborationSessionCreationAttempt || vaultSelectionInProgress) return;
  collaborationActivityDateExplicit = true;
  collaborationActivityDate = shiftDate(collaborationDateInput?.value || collaborationActivityDate, 1);
  if (collaborationDateInput) collaborationDateInput.value = collaborationActivityDate;
  void refreshCollaborationWorkspace();
});

document.querySelector<HTMLButtonElement>("#collaboration-date-today")?.addEventListener("click", () => {
  if (collaborationSessionCreationPromise || collaborationSessionCreationAttempt || vaultSelectionInProgress) return;
  collaborationActivityDateExplicit = false;
  collaborationActivityDate = "";
  void refreshCollaborationWorkspace();
});

collaborationDateInput?.addEventListener("change", () => {
  if (collaborationSessionCreationAttempt || collaborationSessionCreationPromise) return;
  collaborationActivityDateExplicit = Boolean(collaborationDateInput.value);
  collaborationActivityDate = collaborationDateInput.value;
  void refreshCollaborationWorkspace();
});

collaborationTargetDateInput?.addEventListener("change", () => {
  if (vaultSelectionInProgress) return;
  cancelCollaborationVoiceCaptureForSelectionChange();
  collaborationTargetDate = collaborationTargetDateInput.value || collaborationActivityDate;
  void saveCollaborationTargetDate();
});

collaborationMessageDraft?.addEventListener("blur", () => {
  void flushCollaborationDraft().catch((error: unknown) => {
    if (collaborationRunStatus) {
      setCopyError(collaborationRunStatus, "collaboration.draftSaveFailed", error);
      collaborationRunStatus.dataset.state = "error";
    }
  });
});

document.querySelector<HTMLButtonElement>("#collaboration-new-session")?.addEventListener("click", () => {
  void createCollaborationSession();
});

document.querySelector<HTMLButtonElement>("#collaboration-open-settings")?.addEventListener("click", () => {
  showWorkspaceDestination("settings");
  showSettingsSection("codex");
});

collaborationRefreshConnectionButton?.addEventListener("click", () => {
  void refreshCollaborationConnection();
});

collaborationConnectButton?.addEventListener("click", () => {
  void startChatGPTLogin();
});

collaborationSaveAutomaticPlanSettingsButton?.addEventListener("click", () => {
  void saveDailyPlanAutomationSettings();
});

collaborationOpenAutomaticPlanRunButton?.addEventListener("click", () => {
  void openDailyPlanAutomationRun();
});

collaborationModelSelect?.addEventListener("change", () => {
  void saveCollaborationModel();
});

collaborationReasoningEffortSelect?.addEventListener("change", () => {
  void saveCollaborationReasoningEffort();
});

function handleCollaborationDraftInput(): void {
  const target = currentCollaborationVoiceTarget();
  if (target) collaborationSubmittedDrafts.delete(collaborationDraftKey(target.sessionId, target.targetDate));
  collaborationSessionCreationError = null;
  stashCollaborationDraft();
  renderCollaborationWorkspace();
}

collaborationMessageDraft?.addEventListener("input", handleCollaborationDraftInput);

collaborationLongTermContent?.addEventListener("input", () => {
  const binding = collaborationLongTermContent.dataset.vaultBinding;
  const revision = collaborationLongTermContent.dataset.sourceRevision;
  if (!binding || !revision) return;
  collaborationLongTermDrafts.set(binding, {
    text: collaborationLongTermContent.value,
    revision,
  });
  renderCollaborationWorkspace();
});

collaborationLongTermSaveButton?.addEventListener("click", () => {
  void saveCollaborationLongTermMemory();
});

collaborationLongTermReloadButton?.addEventListener("click", () => {
  void reloadCollaborationLongTermMemory();
});

collaborationContinuityNote?.addEventListener("input", () => {
  const binding = collaborationContinuityNote.dataset.vaultBinding;
  const revision = Number(collaborationContinuityNote.dataset.sourceRevision);
  if (!binding || !Number.isInteger(revision) || revision < 0) return;
  collaborationContinuityDrafts.set(binding, {
    text: collaborationContinuityNote.value,
    revision,
  });
  renderCollaborationWorkspace();
});

collaborationContinuitySaveButton?.addEventListener("click", () => {
  void saveCollaborationContinuityNote();
});

// macOS closes the window by hiding it, so unload alone cannot stop capture.
window.addEventListener("personal-dashboard-closing", (event) => {
  collaborationVoiceController.close();
  if ((event as CustomEvent<{ quitting?: boolean }>).detail?.quitting) {
    // Let the existing original-target queue settle within the native bounded
    // exit grace period. Neither an IPC result nor a late tail is guaranteed.
    void Promise.allSettled([...collaborationDraftWrites.values()]).then(() =>
      window.__TAURI__.core.invoke("collaboration_dictation_close_ready").catch(() => undefined));
  }
});
window.addEventListener("beforeunload", () => collaborationVoiceController.close());

collaborationVoiceStartButton?.addEventListener("click", () => {
  startOrStopCollaborationVoice();
});

collaborationVoiceCancelButton?.addEventListener("click", () => {
  collaborationVoiceController.cancel();
  renderCollaborationVoiceControls();
  collaborationMessageDraft?.focus();
});

if (collaborationMessageDraft && collaborationCommandMenu) {
  collaborationCommandCompletion = initializeCollaborationCommandCompletion(
    collaborationMessageDraft,
    collaborationCommandMenu,
    () => t("collaboration.personalRetroCommand"),
    () => collaborationComposer?.requestSubmit(),
  );
}

collaborationComposer?.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendCollaborationMessage();
});

collaborationStopButton?.addEventListener("click", () => {
  void stopCollaborationRun();
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

newHabitButton?.addEventListener("click", () => openHabitDefinitionEditor(null));
habitDefinitionGoalKind?.addEventListener("change", () => {
  syncHabitDefinitionGoalFields();
  stashHabitDefinitionForm();
});
habitDefinitionForm?.addEventListener("input", stashHabitDefinitionForm);
habitDefinitionForm?.addEventListener("change", stashHabitDefinitionForm);
habitDefinitionForm?.addEventListener("submit", (event) => {
  void pendingWrites.track(saveHabitDefinitionFromForm(event));
});
habitDefinitionCancel?.addEventListener("click", () => habitDefinitionDialog?.close());
habitDefinitionRefresh?.addEventListener("click", () => {
  void pendingWrites.track(refreshHabitDefinitionAfterConflict());
});
habitDefinitionDialog?.addEventListener("cancel", () => stashHabitDefinitionForm());

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

taskPriorityFilterControl?.addEventListener("change", () => {
  const priority = taskPriorityFilterControl.value;
  if (priority !== "all" && priority !== "high" && priority !== "medium" &&
      priority !== "low" && priority !== "none") return;
  taskPriorityFilter = priority;
  if (currentTasksView) renderTasks(currentTasksView);
});

taskTagFilterControl?.addEventListener("change", () => {
  const tagId = taskTagFilterControl.value;
  if (tagId !== "all" && !currentTasksView?.tags?.some((tag) => tag.id === tagId)) return;
  taskTagFilter = tagId === "all" ? null : tagId;
  if (currentTasksView) renderTasks(currentTasksView);
});

taskPrioritySortControl?.addEventListener("change", () => {
  const sort = taskPrioritySortControl.value;
  if (sort !== "default" && sort !== "priority") return;
  taskPrioritySort = sort;
  if (currentTasksView) renderTasks(currentTasksView);
});

taskNewButton?.addEventListener("click", () => {
  if (taskOperationCount > 0 || taskNewButton?.disabled) return;
  const binding = currentTasksView?.targetBinding;
  if (taskCreateStatus && (!binding || !taskCreateAttempts.has(binding))) setRawText(taskCreateStatus, "");
  taskCreateOpen = true;
  if (currentTasksView) renderTasks(currentTasksView);
  taskCreateDialog?.showModal();
  taskCreateName?.focus();
});

taskCreateCancel?.addEventListener("click", () => taskCreateDialog?.close());
taskCreateDialog?.addEventListener("cancel", (event) => {
  if (taskOperationCount > 0) event.preventDefault();
});
taskCreateDialog?.addEventListener("close", () => {
  taskCreateOpen = false;
  const binding = currentTasksView?.targetBinding;
  if (binding && !taskCreateAttempts.has(binding)) {
    taskCreateDrafts.delete(binding);
    taskCreateForm?.reset();
  }
  if (currentTasksView) renderTasks(currentTasksView);
  taskNewButton?.focus();
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

function updateCompactScheduleLabel(prefix: string, date: HTMLInputElement | null, time: HTMLInputElement | null): void {
  compactScheduleTransactions.get(prefix)?.validateContext();
  const button = document.querySelector<HTMLButtonElement>(`#${prefix}-schedule`);
  if (!button) return;
  const selectedDate = date?.value || null;
  const todayDate = prefix === "today-task-create"
    ? currentTodayView?.isToday ? currentTodayView.date : null
    : currentTaskLivedDate;
  const visibleDate = selectedDate === null
    ? t("tasks.noDate")
    : selectedDate === todayDate ? t("tasks.scheduleToday") : calendarDateLabel(selectedDate);
  const visibleLabel = time?.value ? `${visibleDate} · ${time.value}` : visibleDate;
  const visibleLabelElement = button.querySelector<HTMLElement>(".task-schedule-label");
  if (visibleLabelElement) visibleLabelElement.textContent = visibleLabel;
  const accessibleLabel = t("tasks.scheduleSummary", {schedule: taskScheduleText(selectedDate, time?.value || null)});
  button.title = accessibleLabel;
  button.setAttribute("aria-label", accessibleLabel);
  button.dataset.scheduled = String(Boolean(date?.value));
}

function bindCompactSchedule(prefix: string, date: HTMLInputElement | null, time: HTMLInputElement | null, baseDate: () => string | null, stash: () => void): void {
  const button = document.querySelector<HTMLButtonElement>(`#${prefix}-schedule`);
  const picker = document.querySelector<HTMLElement>(`#${prefix}-schedule-picker`);
  if (!button || !picker || !date || !time) return;
  let original: {date: string; time: string} | null = null;
  const context = () => prefix === "task-quick"
    ? `${currentWorkspaceDestination}:${currentTasksView?.targetBinding ?? ""}:${taskScope}:${currentTaskLivedDate ?? ""}`
    : `${currentWorkspaceDestination}:${currentTodayView?.tasks.targetBinding ?? ""}:${currentTodayView?.date ?? ""}`;
  let originalContext: string | null = null;
  const positionPicker = () => {
    if (picker.hidden) return;
    const anchor = button.getBoundingClientRect();
    const bounds = picker.getBoundingClientRect();
    picker.style.left = `${Math.max(16, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 16))}px`;
    picker.style.top = `${Math.max(16, Math.min(anchor.bottom + 6 + bounds.height <= window.innerHeight - 16 ? anchor.bottom + 6 : anchor.top - bounds.height - 6, window.innerHeight - bounds.height - 16))}px`;
  };
  window.addEventListener("resize", positionPicker);
  document.addEventListener("scroll", positionPicker, {capture: true, passive: true});
  const invalidate = () => {
    original = null; originalContext = null;
    picker.hidden = true; button.setAttribute("aria-expanded", "false");
  };
  compactScheduleTransactions.set(prefix, {invalidate, validateContext: () => {
    if (originalContext !== null && originalContext !== context()) invalidate();
  }});
  button.closest("form")?.addEventListener("reset", invalidate);
  const close = (apply: boolean) => {
    if (!apply && original) { date.value = original.date; time.value = original.time; }
    invalidate();
    normalizeTaskDateTimeFields(date, time); stash(); updateCompactScheduleLabel(prefix, date, time); button.focus();
  };
  button.addEventListener("click", () => {
    if (!picker.hidden) { close(false); return; }
    original = {date: date.value, time: time.value}; originalContext = context();
    picker.hidden = false; button.setAttribute("aria-expanded", "true"); positionPicker(); date.focus();
  });
  ["today", "tomorrow", "undated"].forEach(preset => document.querySelector(`#${prefix}-${preset}`)?.addEventListener("click", () => {
    const base = baseDate();
    date.value = preset === "undated" ? "" : base ? shiftDate(base, preset === "tomorrow" ? 1 : 0) : "";
    normalizeTaskDateTimeFields(date, time); stash(); updateCompactScheduleLabel(prefix, date, time);
  }));
  document.querySelector(`#${prefix}-schedule-apply`)?.addEventListener("click", () => close(true));
  document.querySelector(`#${prefix}-schedule-cancel`)?.addEventListener("click", () => close(false));
  picker.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(false); }
    if (event.key === "Enter" && (event.target === date || event.target === time) && !event.isComposing) { event.preventDefault(); close(true); }
  });
  date.addEventListener("change", () => { normalizeTaskDateTimeFields(date, time); stash(); updateCompactScheduleLabel(prefix, date, time); });
  time.addEventListener("change", () => { stash(); updateCompactScheduleLabel(prefix, date, time); });
  // Pointer dismissal is a cancel; no Task command occurs in this adapter.
  document.addEventListener("pointerdown", event => {
    if (!picker.hidden && !(event.target instanceof Node && button.parentElement?.contains(event.target))) close(false);
  });
}

function stashQuickSchedule(): void {
  const binding = currentTasksView?.targetBinding;
  if (binding && taskQuickDate && taskQuickTime) taskQuickScheduleDrafts.set(binding, {date: taskQuickDate.value, time: taskQuickTime.value});
}

function stashQuickTaskProperties(): void {
  const binding = currentTasksView?.targetBinding;
  if (!binding) return;
  const selectedPriority = taskQuickPriority?.value ?? "";
  taskQuickPropertyDrafts.set(binding, {
    listId: taskQuickFolderList?.value || taskQuickList?.value || taskCreateListDefault(currentTasksView!) || "",
    priority: selectedPriority ? selectedPriority as TaskPriority : null,
    parentTaskId: taskQuickParent?.value || null,
    tagIds: taskQuickTagChoices
      ? Array.from(taskQuickTagChoices.querySelectorAll<HTMLInputElement>("input[data-task-tag-choice]:checked"))
          .map((input) => input.value)
      : [],
  });
}

taskQuickForm?.addEventListener("input", (event) => {
  if ((event.target as HTMLElement).closest(".task-quick-properties")) stashQuickTaskProperties();
});
taskQuickForm?.addEventListener("change", (event) => {
  if ((event.target as HTMLElement).closest(".task-quick-properties")) stashQuickTaskProperties();
});
taskQuickFolderList?.addEventListener("change", () => {
  if (taskQuickList) taskQuickList.value = taskQuickFolderList?.value ?? "";
  stashQuickTaskProperties();
});
taskQuickList?.addEventListener("change", () => {
  if (taskQuickFolderList && !taskQuickFolderTarget?.hidden) {
    taskQuickFolderList.value = taskQuickList.value;
  }
  stashQuickTaskProperties();
});
bindCompactSchedule("task-quick", taskQuickDate, taskQuickTime, () => currentTaskLivedDate, stashQuickSchedule);
bindCompactSchedule("today-task-create", todayTaskCreateDate, todayTaskCreateTime, () => currentTodayView?.date ?? null, stashTodayTaskCreateDraft);

taskCreateDate?.addEventListener("change", () => {
  normalizeTaskDateTimeFields(taskCreateDate, taskCreateTime);
  stashTaskCreateDraft();
});
taskCreateList?.addEventListener("change", () => {
  const selected = currentTasksView && taskListForId(currentTasksView, taskCreateList.value);
  if (selected && taskCreateListLabel && taskCreateSubmit) {
    const displayName = taskListDisplayName(selected, t("tasks.inbox"));
    setRawText(taskCreateListLabel, displayName);
    setRawText(
      taskCreateSubmit,
      selected.id === "inbox"
        ? t("tasks.add")
        : t("tasks.addToList", { list: displayName }),
    );
  }
  stashTaskCreateDraft();
});
taskCreateForm?.addEventListener("input", stashTaskCreateDraft);
[taskQuickForm, taskCreateForm, todayTaskCreateForm].forEach((form) => {
  form?.addEventListener("compositionstart", () => composingTaskCreateForms.add(form));
  form?.addEventListener("compositionend", () => composingTaskCreateForms.delete(form));
  form?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.isComposing || event.keyCode === 229 || composingTaskCreateForms.has(form))) {
      event.preventDefault();
    }
  });
});
taskQuickName?.addEventListener("input", () => {
  const binding = currentTasksView?.targetBinding;
  if (binding && taskQuickName) taskQuickDrafts.set(binding, taskQuickName.value);
});
[taskQuickEndAttempt, taskCreateEndAttempt].forEach(button => button?.addEventListener("click", () => endTaskCreationAttempt()));
[taskQuickRecheck, taskCreateRecheck].forEach(button => button?.addEventListener("click", () => void pendingWrites.track(recheckTaskCreation())));
taskQuickRetry?.addEventListener("click", () => void pendingWrites.track(createTask(true, true)));
taskCreateRetry?.addEventListener("click", () => void pendingWrites.track(createTask(false, true)));
taskQuickForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (taskQuickForm && composingTaskCreateForms.has(taskQuickForm)) return;
  void pendingWrites.track(createTask(true));
});
taskCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (taskCreateForm && composingTaskCreateForms.has(taskCreateForm)) return;
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
taskFolderCreateForm?.addEventListener("input", () => {
  const binding = currentTasksView?.targetBinding;
  if (binding && taskFolderCreateName) taskFolderCreateDrafts.set(binding, taskFolderCreateName.value);
});
taskFolderCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  void pendingWrites.track(createTaskFolder());
});

tasksDestination?.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  const folderName = target.closest<HTMLInputElement>("input[data-task-folder-name]");
  if (folderName?.dataset.taskFolderName) {
    taskFolderRenameDrafts.set(folderName.dataset.taskFolderName, folderName.value);
    return;
  }
  const tagRename = target.closest<HTMLInputElement>("input[data-task-tag-rename]");
  if (tagRename?.dataset.taskTagRename) {
    taskTagRenameDrafts.set(tagRename.dataset.taskTagRename, tagRename.value);
    return;
  }
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
  updateTaskEditorSummaries(form, currentTasksView);
  stashTaskEditDraft(form);
});

tasksDestination?.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const folderToggle = target.closest<HTMLButtonElement>("button[data-task-folder-toggle]");
  if (folderToggle?.dataset.taskFolderToggle) {
    const folderId = folderToggle.dataset.taskFolderToggle;
    if (expandedTaskFolderIds.has(folderId)) expandedTaskFolderIds.delete(folderId);
    else expandedTaskFolderIds.add(folderId);
    if (currentTasksView) renderTasks(currentTasksView);
    return;
  }
  if (toggleTaskEditorDetails(target)) return;
  const createTag = target.closest<HTMLButtonElement>("button[data-task-tag-create]");
  if (createTag) {
    const input = createTag.closest("[data-task-tag-collection]")?.querySelector<HTMLInputElement>("[data-task-tag-new]");
    if (input) void pendingWrites.track(createTaskTag(input));
    return;
  }
  const renameTag = target.closest<HTMLButtonElement>("button[data-task-tag-rename-begin]");
  if (renameTag?.dataset.taskTagRenameBegin) {
    const form = renameTag.closest<HTMLFormElement>("form[data-task-editor]");
    if (form) stashTaskEditDraft(form);
    const tagId = renameTag.dataset.taskTagRenameBegin;
    const tag = (currentTasksView?.tags ?? []).find((candidate) => candidate.id === tagId);
    taskTagRenameDrafts.set(tagId, tag?.name ?? "");
    taskTagRenameEditId = tagId;
    if (currentTasksView) renderTasks(currentTasksView);
    window.requestAnimationFrame(() =>
      taskEditorDialogRoot?.querySelector<HTMLInputElement>(`[data-task-tag-rename="${CSS.escape(tagId)}"]`)?.focus(),
    );
    return;
  }
  const saveTagRename = target.closest<HTMLButtonElement>("button[data-task-tag-rename-save]");
  if (saveTagRename?.dataset.taskTagRenameSave) {
    const tagId = saveTagRename.dataset.taskTagRenameSave;
    const input = saveTagRename.closest(".task-tag-choice-item")?.querySelector<HTMLInputElement>(`[data-task-tag-rename="${CSS.escape(tagId)}"]`);
    if (input) void pendingWrites.track(renameTaskTag(tagId, input));
    return;
  }
  const cancelTagRename = target.closest<HTMLButtonElement>("button[data-task-tag-rename-cancel]");
  if (cancelTagRename?.dataset.taskTagRenameCancel) {
    const tagId = cancelTagRename.dataset.taskTagRenameCancel;
    taskTagRenameEditId = null;
    taskTagRenameDrafts.delete(tagId);
    if (currentTasksView) renderTasks(currentTasksView);
    return;
  }
  const removeTag = target.closest<HTMLButtonElement>("button[data-task-tag-delete]");
  if (removeTag?.dataset.taskTagDelete) {
    void pendingWrites.track(deleteTaskTag(removeTag.dataset.taskTagDelete));
    return;
  }
  const scopeButton = target.closest<HTMLButtonElement>("button[data-task-scope]");
  const scope = scopeButton?.dataset.taskScope;
  if (
    scope &&
    (scope === "all" ||
      scope === "today" ||
      scope === "inbox" ||
      scope === "archived" ||
      (scope.startsWith("list:") && Boolean(taskListIdFromScope(scope as TaskListScope))) ||
      (scope.startsWith("folder:") && Boolean(taskFolderIdFromScope(scope as TaskListScope)) &&
        Boolean(currentTasksView && taskFolderForId(currentTasksView, taskFolderIdFromScope(scope as TaskListScope)!))))
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

document.addEventListener("click", (event) => {
  const discuss = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-collaboration-task-id]",
  );
  const taskId = discuss?.dataset.collaborationTaskId;
  const taskName = discuss?.dataset.collaborationTaskName;
  const targetDate = discuss?.dataset.collaborationTaskDate;
  if (taskId && taskName && targetDate) {
    void openCollaborationForTask(taskId, taskName, targetDate);
  }
});

taskReturnToCollaborationButton?.addEventListener("click", () => {
  void returnToCollaborationFromTask();
});

todayReturnToCollaborationButton?.addEventListener("click", () => {
  void returnToCollaborationFromDailyRecord();
});

calendarReturnToCollaborationButton?.addEventListener("click", () => {
  void returnToCollaborationFromDailyRecord();
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
  const editHabit = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-edit]",
  );
  if (editHabit?.dataset.habitEdit) {
    openHabitDefinitionEditor(editHabit.dataset.habitEdit);
    return;
  }
  const historicalCorrection = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-habit-correction-date]",
  );
  if (historicalCorrection) {
    const date = historicalCorrection.dataset.habitCorrectionDate;
    const context = selectedHabitContext();
    const snapshot = currentHabitSnapshot;
    if (
      !date ||
      context?.cell.date !== date ||
      historicalHabitCorrectionDate(date, context.habit.today.date) !== date ||
      !context.habit.canRecordCompletion ||
      !snapshot?.completionTargetBinding ||
      (snapshot.state !== "ready" && snapshot.state !== "stale")
    ) {
      return;
    }
    showWorkspaceDestination("today", true, date);
    historicalHabitArrival.select(date);
    return;
  }

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
    const habit = currentHabitSnapshot?.habits.find(
      (candidate) => candidate.key === expand.dataset.habitExpand,
    );
    if (habit) {
      setHabitHistoryDisclosureCopy(expand, habit, !history.hidden);
    } else {
      setCopy(expand, history.hidden ? "habits.expand" : "habits.collapse");
    }
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

habitsDestination?.addEventListener("contextmenu", (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>(".habit-snapshot-row");
  if (!row?.dataset.habitKey) return;
  event.preventDefault();
  openHabitDefinitionEditor(row.dataset.habitKey);
});

habitsDestination?.addEventListener("keydown", (event) => {
  if (event.key !== "F10" || !event.shiftKey) return;
  const row = (event.target as HTMLElement).closest<HTMLElement>(".habit-snapshot-row");
  if (!row?.dataset.habitKey) return;
  event.preventDefault();
  openHabitDefinitionEditor(row.dataset.habitKey);
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
      t("tasks.quickAdd"),
    );
  }
  stashTodayTaskCreateDraft();
});
todayTaskCreateForm?.addEventListener("input", stashTodayTaskCreateDraft);
document.querySelector("#today-task-create-recheck")?.addEventListener("click", () => void pendingWrites.track(recheckTaskCreation(true)));
document.querySelector("#today-task-create-retry")?.addEventListener("click", () => void pendingWrites.track(createTodayTask(true)));
document.querySelector("#today-task-create-end-attempt")?.addEventListener("click", () => endTaskCreationAttempt(true));
todayTaskCreateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (todayTaskCreateForm && composingTaskCreateForms.has(todayTaskCreateForm)) return;
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

todayEveningContent?.addEventListener("input", stashEveningReviewDraft);
todayEveningMode?.addEventListener("change", stashEveningReviewDraft);

todayEveningForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!todayEveningMode || !todayEveningContent) {
    return;
  }
  const savedBinding = currentTodayView?.targetBinding;
  void pendingWrites.track((async () => {
    const saved = await saveTodayMutation(
      "update_evening_review",
      { mode: todayEveningMode.value, content: todayEveningContent.value },
      "today.eveningSaved",
    );
    if (saved && savedBinding) {
      eveningReviewDrafts.delete(savedBinding);
      if (currentTodayView?.targetBinding === savedBinding) todayEveningContent.value = "";
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

todayLocateNowButton?.addEventListener("click", () => scrollTodayAxisToNow());

[workspaceInformation, todayAxisScrollSurface].forEach((surface) => surface?.addEventListener("scroll", () => {
  if (
    currentWorkspaceDestination === "today" &&
    currentTodayView?.isToday &&
    Date.now() > programmaticTodayAxisScrollUntil
  ) {
    todayAxisFollowState = onManualScroll(todayAxisFollowState);
  }
}, { passive: true }));

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void refreshTodayClock();
    void refreshTaskScheduleClock();
    if (currentWorkspaceDestination === "habits") void refreshHabits();
  }
});

window.setInterval(() => {
  void refreshTodayClock();
  if (document.visibilityState === "visible") void refreshTaskScheduleClock();
  if (document.visibilityState === "visible" && currentWorkspaceDestination === "habits") {
    void refreshHabits();
  }
}, 60_000);

window.setInterval(() => {
  if (
    document.visibilityState !== "visible" ||
    currentWorkspaceDestination !== "collaboration" ||
    ["queued", "reading", "thinking", "stopping"].includes(currentCollaborationSession?.runState ?? "")
  ) {
    return;
  }
  void refreshCollaborationWorkspace(true);
}, 60_000);

window.addEventListener("focus", () => {
  if (currentWorkspaceDestination === "today") {
    void refreshTodayClock().then(() => {
      // An automatic focus refresh must not replace an editor just preserved
      // by the clock check. Explicit navigation/refresh remains available.
      if (currentWorkspaceDestination === "today" && currentTodayView &&
          !hasTodayEditingTarget(currentTodayView)) return refreshToday();
    });
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

for (const id of ["today-expand-early", "today-expand-late"]) {
  document.getElementById(id)?.addEventListener("click", () => {
    toggleTodayAxisSegment(id);
  });
}

document.getElementById("today-axis-zoom-out")?.addEventListener("click", () => adjustTodayAxisZoom(-1));
document.getElementById("today-axis-zoom-in")?.addEventListener("click", () => adjustTodayAxisZoom(1));

todayAxisTaskPopupClose?.addEventListener("click", () => closeTodayAxisTaskPopup(true));
todayAxisTaskPopup?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeTodayAxisTaskPopup(true);
});
todayAxisTaskPopup?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closeTodayAxisTaskPopup(true);
});
todayAxisTaskPopup?.addEventListener("close", () => {
  const taskId = todayAxisTaskPopup.dataset.taskId;
  const restoreFocus = todayAxisTaskPopup.dataset.restoreFocus !== "false";
  todayAxisTaskPopupContent?.replaceChildren();
  todayAxisTaskPopup.dataset.taskId = "";
  todayAxisTaskPopupOpener = null;
  if (!restoreFocus || !taskId) return;
  const selector = `[data-task-id="${CSS.escape(taskId)}"] .today-axis-marker-link`;
  const markerLink = todayTimedEvents?.querySelector<HTMLElement>(selector);
  const taskRowButton = todayTaskPanel?.querySelector<HTMLButtonElement>(
    `[data-task-editor-open="${CSS.escape(taskId)}"]`,
  );
  (markerLink ?? taskRowButton)?.focus({ preventScroll: true });
});
todayAxisScrollSurface?.addEventListener("scroll", positionTodayAxisTaskPopup, { passive: true });
workspaceInformation?.addEventListener("scroll", positionTodayAxisTaskPopup, { passive: true });
window.addEventListener("resize", positionTodayAxisTaskPopup);
