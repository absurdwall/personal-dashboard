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
  SerializedLatestMutation,
  type AccentColor,
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

type HabitCellView = Readonly<{
  date: string;
  coverage: string;
  status: HabitCellStatus;
  hasRecord: boolean;
  countsAsCompletion: boolean;
  actualTimeLabel: string | null;
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
  active: boolean;
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
  summary: Readonly<{
    knownCompletions: number;
    targetCompletions: number;
    coverageNote: string;
    excludedNoGoal: number;
  }>;
  habits: readonly HabitView[];
}>;

function isTodayPhase(value: string | undefined): value is TodayPhase {
  return value === "morning" || value === "daytime" || value === "evening";
}

type WorkspaceDestination = "today" | "calendar" | "habits" | "settings";

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return (
    value === "today" ||
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

type AppearancePreferences = Readonly<{ accentColor: AccentColor }>;

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
const todayHandoff = document.querySelector<HTMLElement>("#today-handoff");
const todayHandoffHeading = document.querySelector<HTMLElement>("#today-handoff-heading");
const todayHandoffCopy = document.querySelector<HTMLElement>("#today-handoff-copy");
const selectTodayVaultButton = document.querySelector<HTMLButtonElement>("#select-today-vault");
const refreshTodayButton = document.querySelector<HTMLButtonElement>("#refresh-today");
const appShell = document.querySelector<HTMLElement>(".app-shell");
let currentWorkspaceDestination: WorkspaceDestination = "today";
let currentAppearance: AppearancePreferences = { accentColor: "forest" };
let currentInterfaceLanguage: InterfaceLanguage = "zh";
let todayOperationCount = 0;
let vaultSelectionInProgress = false;
const todayPresentationRequests = new LatestRequest();
const vaultSelectionRequests = new LatestRequest();
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
let currentCalendarSummaryView: TodayView | null = null;
let selectedCalendarDate: string | null = null;
const calendarMonthRequests = new LatestRequest();
const calendarSelectionRequests = new LatestRequest();
const habitSnapshotRequests = new LatestRequest();
const habitDateRequests = new LatestRequest();
let currentHabitSnapshot: HabitSnapshotView | null = null;
type HabitCellSelection = Readonly<{ habitKey: string; date: string }>;
type HabitNoteDraft = Readonly<{ content: string; correctionId: string | null }>;
let selectedHabitCell: HabitCellSelection | null = null;
let currentHabitDateView: TodayView | null = null;
let habitDateOperationCount = 0;
const pendingWrites = new PendingWriteBarrier();
const appearanceMutations = new SerializedLatestMutation<AppearancePreferences>({
  accentColor: "forest",
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
const habitNoteDrafts = new Map<string, HabitNoteDraft>();

function t(
  key: InterfaceCopyKey,
  variables: Readonly<Record<string, string | number>> = {},
): string {
  return interfaceCopy(key, currentInterfaceLanguage, variables);
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
  calendarMonthRequests.invalidate();
  calendarSelectionRequests.invalidate();
  habitSnapshotRequests.invalidate();
  habitDateRequests.invalidate();
  currentCalendarMonth = null;
  currentCalendarSummaryView = null;
  selectedCalendarDate = null;
  currentTodayView = null;
  currentHabitSnapshot = null;
  selectedHabitCell = null;
  currentHabitDateView = null;
  habitNoteStatus = null;
  datedNoteDrafts.clear();
  habitNoteDrafts.clear();
  correctingShortRecordId = null;
  calendarGrid?.replaceChildren();
  habitsReady?.toggleAttribute("hidden", true);
  habitsEmpty?.toggleAttribute("hidden", true);
  habitsSummaryRows?.replaceChildren();
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

function renderAppearance(preferences: AppearancePreferences): void {
  currentAppearance = preferences;
  applyAccentColor(preferences.accentColor, document.documentElement.style);
  accentColorButtons.forEach((button) => {
    const selected = button.dataset.accentColor === preferences.accentColor;
    button.setAttribute("aria-pressed", String(selected));
  });
}

async function persistAppearanceChange(
  optimistic: AppearancePreferences,
  command: "set_accent_color" | "restore_appearance_defaults",
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
        setCopy(appearanceStatus, successMessage);
        delete appearanceStatus.dataset.state;
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
    { accentColor },
    "set_accent_color",
    { accentColor },
    "appearance.saving",
    "appearance.saved",
  );
}

async function restoreAppearance(): Promise<void> {
  await persistAppearanceChange(
    { accentColor: "forest" },
    "restore_appearance_defaults",
    undefined,
    "appearance.restoring",
    "appearance.restored",
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
  }
  currentTodayView = view;
  renderWorkspaceRailContext(currentWorkspaceDestination);
  renderVaultSettings(view);
  renderDatedNoteComposer(view);
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
      renderToday(view);
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
  if (!currentTodayView?.revision || todayOperationCount > 0) {
    showTodayMutationCopy("today.refreshBeforeSave", "error");
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
  if (currentWorkspaceDestination === "calendar") {
    calendarMonthRequests.invalidate();
    calendarSelectionRequests.invalidate();
    renderCalendarReadError(error, true, false);
    return;
  }
  if (currentWorkspaceDestination === "habits") {
    habitSnapshotRequests.invalidate();
    habitDateRequests.invalidate();
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
        button.toggleAttribute("data-outside-month", !day.inMonth);
        button.toggleAttribute("data-selected", selected);
        button.setAttribute(
          "aria-label",
          `${calendarDateLabel(day.date)} · ${day.isToday ? `${t("calendar.today")} · ` : ""}${t(status.label)}`,
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
        button.append(top, marker);
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

function renderCalendarReadError(
  error: unknown,
  vaultSelectionFailed = false,
  clearContent = true,
): void {
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
      setCopy(
        calendarStatus,
        view.configured ? "calendar.previewStatus" : "calendar.connectStatus",
      );
      calendarStatus.dataset.state = view.configured ? "ready" : "unconfigured";
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
      const today = await window.__TAURI__.core.invoke<TodayView>("today_view");
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
    `${cell.date} · ${habit.name} · ${t(habitStatusLabels[cell.status])} · ${t(
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

function habitRow(habit: HabitView): HTMLElement {
  const article = document.createElement("article");
  article.className = "habit-snapshot-row";
  article.dataset.habitKey = habit.key;
  const identity = document.createElement("div");
  identity.className = "habit-snapshot-identity";
  const name = document.createElement("strong");
  const metadata = document.createElement("p");
  const sources = document.createElement("small");
  name.textContent = habit.name;
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
  article.append(identity, value, recent, expand, history);
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
  heading.textContent = `${cell.date} · ${habit.name}`;
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
    const view = await window.__TAURI__.core.invoke<TodayView>("daily_view", { date });
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

function renderHabitSnapshot(view: HabitSnapshotView): void {
  currentHabitSnapshot = view;
  renderWorkspaceRailContext("habits");
  renderWorkspaceContextStatus(currentWorkspaceDestination);
  if (habitsStatus) {
    if (view.readError) {
      setCopyError(habitsStatus, "habits.loadFailed", view.readError);
    } else {
      setAppMessage(habitsStatus, view.message);
    }
    habitsStatus.dataset.state = view.state;
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
          label.textContent = habit.name;
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
  const leavingCalendar = currentWorkspaceDestination === "calendar" && destination !== "calendar";
  const leavingHabits = currentWorkspaceDestination === "habits" && destination !== "habits";
  if (leavingToday) {
    todayPresentationRequests.invalidate();
  }
  if (leavingCalendar) {
    calendarMonthRequests.invalidate();
    calendarSelectionRequests.invalidate();
  }
  if (leavingHabits) {
    habitSnapshotRequests.invalidate();
    habitDateRequests.invalidate();
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
      currentTodayView = null;
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
  void refreshHabits();
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
  } else if (currentWorkspaceDestination === "habits") {
    void refreshHabits();
  }
});

void connectToApplication();

export {};
