import {
  DatedNoteTargetChangedError,
  submitDatedNote,
} from "./dated-note-command.js";
import { LatestRequest } from "./latest-request.js";

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
  details: readonly string[];
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

type WorkspaceDestination = "today" | "calendar" | "habits";

function isWorkspaceDestination(value: string | undefined): value is WorkspaceDestination {
  return (
    value === "today" ||
    value === "calendar" ||
    value === "habits"
  );
}

const workspaceDestinationDetails: Record<
  WorkspaceDestination,
  Readonly<{
    title: string;
    description: string;
    featureArea: string;
  }>
> = {
  today: {
    title: "Today",
    description: "查看今天 Daily Record 里的大致安排。",
    featureArea: "Daily Record",
  },
  calendar: {
    title: "Calendar",
    description: "先看整个月，再进入某一天。",
    featureArea: "Calendar",
  },
  habits: {
    title: "Habits",
    description: "查看按需快照里的周次数、每日时刻与 12 周记录。",
    featureArea: "Habits",
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
const workspaceSettingsButton = document.querySelector<HTMLButtonElement>(
  "#workspace-settings",
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
const habitSnapshotRequests = new LatestRequest();
const habitDateRequests = new LatestRequest();
let currentHabitSnapshot: HabitSnapshotView | null = null;
type HabitCellSelection = Readonly<{ habitKey: string; date: string }>;
type HabitNoteDraft = Readonly<{ content: string; correctionId: string | null }>;
let selectedHabitCell: HabitCellSelection | null = null;
let currentHabitDateView: TodayView | null = null;
let habitDateOperationCount = 0;
let habitNoteStatus: Readonly<{ message: string; state: "ready" | "error" }> | null = null;
const habitNoteDrafts = new Map<string, HabitNoteDraft>();
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
  meta.textContent = `${record.category === "exercise" ? "健身" : "日常记录"} · 目标 ${record.date} · 记录于 ${record.createdAt}`;
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
  renderWorkspaceRailContext("today");
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
      showTodayMutationStatus(
        correctionId ? "更正及修改记录已写入 Daily Record。" : "简短记录已写入 Daily Record。",
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
      showTodayMutationStatus(
        error instanceof DatedNoteTargetChangedError
          ? error.message
          : `未保存：${String(error)}`,
        "error",
      );
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
  renderWorkspaceRailContext("calendar");
}

function renderCalendarSummary(view: TodayView): void {
  renderWorkspaceRailContext("calendar");
  if (calendarSummaryHeading) {
    calendarSummaryHeading.textContent = calendarDateLabel(view.date);
  }
  const availability = view.dailyRecordAvailability;
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

const habitStatusLabels: Record<HabitCellStatus, string> = {
  unknown: "未知",
  completed: "已知完成",
  notDone: "明确未完成",
  conflict: "来源冲突 · 不计次",
  partial: "partial · 不计次",
  baseline: "baseline · 不计次",
  unavailable: "来源不可用",
  actualTime: "明确实际时刻",
  thresholdOnly: "仅阈值证据",
  recordOnly: "有文字记录 · 不计次",
};

function habitProgressLabel(habit: HabitView): string {
  if (habit.completedCount === null) {
    return habit.today.actualTimeLabel ?? "实际未知";
  }
  if (habit.weeklyTarget === null) {
    return `${habit.completedCount} 次 · 无目标`;
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
    `${cell.date} · ${habit.name} · ${habitStatusLabels[cell.status]} · coverage ${cell.coverage}${
      cell.date === habit.today.date ? " · 今天锚点" : ""
    }`,
  );
  button.title = `${cell.date} · ${habitStatusLabels[cell.status]}`;
  if (compact) {
    const weekday = ["日", "一", "二", "三", "四", "五", "六"][
      new Date(`${cell.date}T00:00:00Z`).getUTCDay()
    ];
    const label = document.createElement("small");
    label.textContent = weekday;
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
  metadata.textContent = `${habit.goalLabel} · ${habit.coverageLabel}`;
  sources.textContent = `来源：${habit.sourceLabels.join("、") || "未声明"}`;
  identity.append(name, metadata, sources);

  const value = document.createElement("div");
  value.className = "habit-snapshot-value";
  const progress = document.createElement("strong");
  const todayState = document.createElement("small");
  progress.textContent = habitProgressLabel(habit);
  todayState.textContent = `今天：${habitStatusLabels[habit.today.status]}`;
  value.append(progress, todayState);

  const recent = document.createElement("div");
  recent.className = "habit-recent";
  const recentLabel = document.createElement("span");
  recentLabel.textContent = "近 7 天";
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
  expand.textContent = "展开";

  const history = document.createElement("section");
  history.className = "habit-history";
  history.hidden = true;
  history.id = `habit-history-${habit.key}`;
  expand.setAttribute("aria-controls", history.id);
  const historyHeading = document.createElement("div");
  historyHeading.className = "habit-history-heading";
  const heading = document.createElement("strong");
  const caption = document.createElement("small");
  heading.textContent = "近 12 周记录";
  caption.textContent = "点 = 有来源记录；实心完成与文字记录状态不同";
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
    label.textContent = index === 0 || month !== previousMonth ? `${Number(month)} 月` : "";
    return label;
  });
  months.replaceChildren(monthCorner, ...monthLabels);
  const weekdayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  for (const [weekday, weekdayLabel] of weekdayLabels.entries()) {
    const label = document.createElement("span");
    label.className = "habit-history-weekday";
    label.textContent = weekdayLabel;
    grid.append(label);
    for (const week of weeks) {
      const cell = week[weekday];
      if (cell) grid.append(habitCellButton(habit, cell, false));
    }
  }
  const goalContext = document.createElement("p");
  goalContext.className = "habit-goal-context";
  goalContext.textContent = habit.goalHistory.length
    ? `历史目标 context：${habit.goalHistory
        .map((context) => `${context.weekOf} ${context.label} ${context.goalLabel}`)
        .join("；")}`
    : "历史目标 context：快照未提供；不回填历史达标率。";
  const detail = document.createElement("div");
  detail.className = "habit-cell-detail";
  detail.dataset.habitDetail = habit.key;
  detail.setAttribute("role", "status");
  detail.textContent = "选择一个日期点，查看来源、coverage 与记录。";
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
  meta.textContent = `健身 · 目标 ${record.date} · 记录于 ${record.createdAt}`;
  const correct = document.createElement("button");
  correct.type = "button";
  correct.dataset.habitCorrectRecordId = record.id;
  correct.textContent = "更正这条";
  article.append(text, meta, correct);
  if (record.changes.length > 0) {
    const changes = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `修改记录 · ${record.changes.length}`;
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
  heading.textContent = `${draft?.correctionId ? "更正记录" : "写一句"} · ${date}`;
  const association = document.createElement("p");
  association.className = "habit-note-association";
  association.textContent = "健身 · 日期与关联已预设";
  panel.append(heading, association);

  const records = document.createElement("div");
  records.className = "habit-note-records";
  if (exerciseRecords) {
    if (exerciseRecords.length > 0) {
      records.replaceChildren(...exerciseRecords.map(habitExerciseRecordArticle));
    } else {
      const empty = document.createElement("p");
      empty.textContent = "还没有健身短句。";
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
    records.textContent = "正在读取所选日期…";
  }
  panel.append(records);

  if (view?.targetBinding && view.canRecord) {
    const form = document.createElement("form");
    form.dataset.habitNoteForm = "";
    const label = document.createElement("label");
    label.textContent = "记录内容";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 500;
    input.required = true;
    input.autocomplete = "off";
    input.placeholder = "例如：跑步 30 分钟";
    input.setAttribute("aria-label", "Exercise note text");
    input.value = draft?.content ?? "";
    label.append(input);
    const actions = document.createElement("div");
    actions.className = "habit-note-actions";
    const save = document.createElement("button");
    save.type = "submit";
    save.disabled = habitDateOperationCount > 0;
    save.textContent = draft?.correctionId ? "保存更正" : "保存记录";
    actions.append(save);
    if (draft?.correctionId) {
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "secondary-button";
      cancel.dataset.habitCancelCorrection = "";
      cancel.textContent = "取消更正";
      actions.append(cancel);
    }
    const target = document.createElement("small");
    target.textContent = `保存在 ${date} 的日记录中；不替你打卡。`;
    form.append(label, actions, target);
    panel.append(form);
  } else if (view && !view.canRecord) {
    const boundary = document.createElement("p");
    boundary.textContent = "未来日期不能记录已经发生的事实。";
    panel.append(boundary);
  }

  if (habitNoteStatus) {
    const status = document.createElement("p");
    status.className = "habit-note-status";
    status.dataset.state = habitNoteStatus.state;
    status.setAttribute("role", "status");
    status.textContent = habitNoteStatus.message;
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
  if (expand) expand.textContent = "收起";

  const heading = document.createElement("strong");
  const state = document.createElement("span");
  const details = document.createElement("ul");
  heading.textContent = `${cell.date} · ${habit.name}`;
  state.textContent = `${habitStatusLabels[cell.status]} · coverage ${cell.coverage}`;
  details.replaceChildren(
    ...cell.details.map((line) => {
      const item = document.createElement("li");
      item.textContent = line;
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
    habitNoteStatus = { message: `无法读取所选日期：${String(error)}`, state: "error" };
    renderSelectedHabitCell();
  }
}

function stashHabitNoteDraft(): void {
  const binding = currentHabitDateView?.targetBinding;
  const input = habitsDestination?.querySelector<HTMLInputElement>(
    "input[aria-label='Exercise note text']",
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
    ?.querySelector<HTMLInputElement>("input[aria-label='Exercise note text']")
    ?.value.trim() ?? "";
  if (!loaded?.targetBinding || !loaded.canRecord || !content || habitDateOperationCount > 0) {
    habitNoteStatus = { message: "请先打开可记录的日期，并填写一句内容。", state: "error" };
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
        message: correctionId
          ? "更正及修改记录已写入 Daily Record；未更新滴答或完成次数。"
          : "健身短句已写入 Daily Record；未更新滴答或完成次数。",
        state: "ready",
      };
    }
    await refreshHabits();
    return true;
  } catch (error) {
    if (habitDateRequests.isCurrent(request)) {
      habitNoteStatus = {
        message: error instanceof DatedNoteTargetChangedError
          ? error.message
          : `未保存：${String(error)}`,
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
  if (habitsStatus) {
    habitsStatus.textContent = view.message;
    habitsStatus.dataset.state = view.state;
  }
  if (habitsRange) {
    habitsRange.textContent = view.displayRangeLabel && view.rangeLabel
      ? `12 周显示窗口 · ${view.displayRangeLabel} · 来源覆盖 · ${view.rangeLabel}`
      : "等待有效的 bounded snapshot。";
  }
  const hasSnapshot = view.habits.length > 0;
  if (habitsReady) habitsReady.hidden = !hasSnapshot;
  if (habitsEmpty) habitsEmpty.hidden = hasSnapshot;
  if (!hasSnapshot) {
    if (habitsEmptyHeading) {
      habitsEmptyHeading.textContent =
        view.state === "unconfigured" ? "尚未选择 Vault。" : "尚无可显示的 Habits 快照。";
    }
    if (habitsEmptyCopy) habitsEmptyCopy.textContent = view.message;
    return;
  }
  if (habitsSummaryTotal) {
    habitsSummaryTotal.textContent = `${view.summary.knownCompletions} / ${view.summary.targetCompletions}`;
  }
  if (habitsSummaryNote) {
    const noGoal = view.summary.excludedNoGoal
      ? ` ${view.summary.excludedNoGoal} 个无目标习惯未计入分母。`
      : "";
    habitsSummaryNote.textContent = `${view.summary.coverageNote}${noGoal}`;
  }
  if (habitsGeneratedAt) habitsGeneratedAt.textContent = view.generatedAt ?? "未知";
  if (habitsProducer) habitsProducer.textContent = view.producerLabel ?? "未知";
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
          kind.textContent = habit.goalLabel;
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
    habitsStatus.textContent = "正在读取本地 Habits 快照…";
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
      message: `无法读取 Habits 快照：${String(error)}`,
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
    element.textContent = featureArea;
  });
}

function renderWorkspaceRailContext(destination: WorkspaceDestination): void {
  if (!workspaceRailContextKicker || !workspaceRailContextTitle || !workspaceRailContextDetail) {
    return;
  }

  if (destination === "today") {
    const date = currentTodayView?.date ?? selectedTodayDate;
    workspaceRailContextKicker.textContent = `TODAY · ${date ?? "—"}`;
    workspaceRailContextTitle.textContent = date
      ? calendarDateLabel(date).split(" · ")[0]
      : "Today";
    workspaceRailContextDetail.textContent = "Morning · Daytime · Evening";
    return;
  }

  if (destination === "calendar") {
    const month = currentCalendarMonth;
    workspaceRailContextKicker.textContent = "MONTH VIEW";
    workspaceRailContextTitle.textContent = month
      ? `${month.year} 年 ${month.month} 月`
      : "Calendar";
    workspaceRailContextDetail.textContent = selectedCalendarDate
      ? `${calendarDateLabel(selectedCalendarDate)} · 当前选中`
      : "选择一个日期";
    return;
  }

  const summary = currentHabitSnapshot?.summary;
  workspaceRailContextKicker.textContent = "HABITS · 本周";
  workspaceRailContextTitle.textContent = summary
    ? `${summary.knownCompletions} / ${summary.targetCompletions} 已知`
    : "Habits";
  workspaceRailContextDetail.textContent = "weekly count · daily target";
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
  workspaceDestinationButtons.forEach((button) => {
    const buttonDestination = button.dataset.workspaceDestination;
    const isCurrent = buttonDestination === destination;
    const buttonLabel = isWorkspaceDestination(buttonDestination)
      ? workspaceDestinationDetails[buttonDestination].title
      : "Unknown destination";
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
  renderWorkspaceRailContext(destination);
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
    runtimeStatus.textContent = identity.boundaryMessage;
    runtimeStatus.dataset.state = "ready";
    document.title = identity.productName;
    document.querySelectorAll<HTMLElement>("[data-product-name]").forEach((element) => {
      element.textContent = identity.productName;
    });
    renderWorkspaceFeatureArea(currentWorkspaceDestination);
  } catch {
    runtimeStatus.textContent = "The local application boundary is unavailable.";
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

syncWorkspaceViewportMode();
window.addEventListener("resize", () => {
  syncWorkspaceViewportMode();
});
showWorkspaceDestination("today");

selectTodayVaultButton?.addEventListener("click", () => {
  void selectTodayVault();
});

workspaceSettingsButton?.addEventListener("click", () => {
  selectTodayVaultButton?.click();
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
      .querySelector<HTMLInputElement>("input[aria-label='Exercise note text']")
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
      .querySelector<HTMLInputElement>("input[aria-label='Exercise note text']")
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
    expand.textContent = history.hidden ? "展开" : "收起";
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
  if ((event.target as HTMLElement).matches("input[aria-label='Exercise note text']")) {
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
  void saveHabitExerciseNote();
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
