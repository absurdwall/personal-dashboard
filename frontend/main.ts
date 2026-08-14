type ApplicationIdentity = Readonly<{
  productName: string;
  featureArea: string;
  boundaryMessage: string;
}>;

type ProfileView = Readonly<{
  schemaVersion: number;
  profileLabel: string;
}>;

type ProfileAction = Readonly<{
  profile: ProfileView;
  message: string;
}>;

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

type PrimaryDeparture = DepartureTiming & Readonly<{
  status: string;
}>;

type FallbackDeparture = DepartureTiming & Readonly<{
  availability: string;
}>;

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
  activity: string;
  duration: string;
  effort: string;
  outcome: string;
}>;

type ExerciseWeekHistory = Readonly<{
  weekLabel: string;
  progress: string;
  primaryDepartures: readonly PrimaryDeparture[];
  fallbackDepartures: readonly FallbackDeparture[];
  workoutRecords: readonly WorkoutRecord[];
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
  workoutRecords: readonly WorkoutRecord[];
  history: readonly ExerciseWeekHistory[];
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

const runtimeStatus = document.querySelector<HTMLElement>("#runtime-status");
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
const departurePrompt = document.querySelector<HTMLElement>("#departure-prompt");
const departurePromptHeading = document.querySelector<HTMLElement>(
  "#departure-prompt-heading",
);
const departureResponseStatus = document.querySelector<HTMLElement>(
  "#departure-response-status",
);
const departureActions = document.querySelector<HTMLElement>("#departure-actions");
const departureReasonPrompt = document.querySelector<HTMLElement>(
  "#departure-reason-prompt",
);
const departureReasonHeading = document.querySelector<HTMLElement>(
  "#departure-reason-heading",
);
const departureReasons = document.querySelector<HTMLElement>("#departure-reasons");
const cancelDepartureReason = document.querySelector<HTMLButtonElement>(
  "#cancel-departure-reason",
);
const departureConfirmation = document.querySelector<HTMLElement>(
  "#departure-confirmation",
);
const departureConfirmationMessage = document.querySelector<HTMLElement>(
  "#departure-confirmation-message",
);
const departureConfirmationNextPrompt = document.querySelector<HTMLElement>(
  "#departure-confirmation-next-prompt",
);
const workoutPrompt = document.querySelector<HTMLElement>("#workout-prompt");
const workoutPromptHeading = document.querySelector<HTMLElement>(
  "#workout-prompt-heading",
);
const workoutPromptAction = document.querySelector<HTMLElement>(
  "#workout-prompt-action",
);
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
const profileForm = document.querySelector<HTMLFormElement>("#profile-form");
const profileLabel = document.querySelector<HTMLInputElement>("#profile-label");
const profileLabelDisplay = document.querySelector<HTMLOutputElement>(
  "#profile-label-display",
);
const schemaVersion = document.querySelector<HTMLElement>("#schema-version");
const profileStatus = document.querySelector<HTMLElement>("#profile-status");
const exportProfileButton = document.querySelector<HTMLButtonElement>("#export-profile");
const importProfileButton = document.querySelector<HTMLButtonElement>("#import-profile");
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

function workoutRecordItem(record: WorkoutRecord): HTMLLIElement {
  const item = document.createElement("li");
  const activity = document.createElement("strong");
  const details = document.createElement("span");
  const outcome = document.createElement("span");
  activity.textContent = record.activity;
  details.textContent = `${record.source} · ${record.duration} · ${record.effort}`;
  outcome.textContent = record.outcome;
  item.append(activity, details, outcome);
  return item;
}

function historyWeekItem(week: ExerciseWeekHistory): HTMLElement {
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
  fallbackHeading.textContent = "Fallback departures";
  primary.className = "departure-list";
  fallback.className = "departure-list";
  primary.replaceChildren(
    ...week.primaryDepartures.map((departure) =>
      departureItem(departure, departure.status),
    ),
  );
  fallback.replaceChildren(
    ...week.fallbackDepartures.map((departure) =>
      departureItem(departure, departure.availability),
    ),
  );
  article.append(heading, progress, primaryHeading, primary, fallbackHeading, fallback);
  if (week.workoutRecords.length > 0) {
    const workoutHeading = document.createElement("h6");
    const workouts = document.createElement("ol");
    workoutHeading.textContent = "Recorded workouts";
    workouts.className = "workout-records";
    workouts.replaceChildren(...week.workoutRecords.map(workoutRecordItem));
    article.append(workoutHeading, workouts);
  }
  return article;
}

function renderExerciseDashboard(view: ExerciseDashboardView): void {
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
      ...view.primaryDepartures.map((departure) =>
        departureItem(departure, departure.status),
      ),
    );
  }
  if (fallbackDepartures) {
    fallbackDepartures.replaceChildren(
      ...view.fallbackDepartures.map((departure) =>
        departureItem(departure, departure.availability),
      ),
    );
  }
  if (fallbackCount) {
    fallbackCount.textContent = `${view.fallbackAvailableCount} available`;
  }
  if (exerciseReminderStatus) {
    exerciseReminderStatus.textContent = view.reminderMessage;
    delete exerciseReminderStatus.dataset.state;
  }
  if (weeklyGoalStatus) {
    weeklyGoalStatus.hidden = view.weeklyGoalStatus === null;
    weeklyGoalStatus.textContent = view.weeklyGoalStatus ?? "";
  }
  if (logWorkoutNow) {
    logWorkoutNow.textContent = view.manualWorkoutAction;
    logWorkoutNow.disabled = view.workoutRecording !== null;
  }
  if (notificationScheduledTime) {
    notificationScheduledTime.textContent = view.nextDeparture ?? "None this week";
  }
  if (departurePrompt && departurePromptHeading && departureActions) {
    departurePrompt.hidden = view.departurePrompt === null;
    departureActions.replaceChildren();
    if (view.departurePrompt) {
      departurePromptHeading.textContent = view.departurePrompt.heading;
      if (departureResponseStatus) {
        departureResponseStatus.textContent = view.departurePrompt.status ?? "";
        departureResponseStatus.hidden = view.departurePrompt.status === null;
      }
      departureActions.replaceChildren(
        ...view.departurePrompt.actions.map((action) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = action;
          button.dataset.slotId = view.departurePrompt?.slotId;
          button.dataset.action = action.toLowerCase().replaceAll(" ", "-");
          return button;
        }),
      );
    }
  }
  if (departureReasonPrompt && departureReasonHeading && departureReasons) {
    departureReasonPrompt.hidden = view.departureReasonPrompt === null;
    departureReasons.replaceChildren();
    if (view.departureReasonPrompt) {
      departureReasonHeading.textContent = view.departureReasonPrompt.heading;
      departureReasons.replaceChildren(
        ...view.departureReasonPrompt.reasons.map((reason) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = reason;
          button.dataset.slotId = view.departureReasonPrompt?.slotId;
          button.dataset.outcome = view.departureReasonPrompt?.outcome;
          button.dataset.reason = reason;
          return button;
        }),
      );
    }
  }
  if (departureConfirmation) {
    departureConfirmation.hidden = view.departureConfirmation === null;
    if (view.departureConfirmation) {
      if (departureConfirmationMessage) {
        departureConfirmationMessage.textContent = view.departureConfirmation.message;
      }
      if (departureConfirmationNextPrompt) {
        departureConfirmationNextPrompt.textContent = view.departureConfirmation.nextPrompt;
      }
    }
  }
  if (workoutPrompt && workoutPromptHeading && workoutPromptAction) {
    workoutPrompt.hidden = view.workoutPrompt === null;
    workoutPromptAction.replaceChildren();
    if (view.workoutPrompt) {
      workoutPromptHeading.textContent = view.workoutPrompt.heading;
      workoutPromptAction.append(
        workoutButton(view.workoutPrompt.action, view.workoutPrompt.slotId, "start"),
      );
    }
  }
  if (
    workoutRecording &&
    workoutRecordingHeading &&
    workoutRecordingGuidance &&
    workoutRecordingChoices
  ) {
    workoutRecording.hidden = view.workoutRecording === null;
    workoutRecordingChoices.replaceChildren();
    if (view.workoutRecording) {
      workoutRecordingHeading.textContent = view.workoutRecording.heading;
      workoutRecordingGuidance.textContent = view.workoutRecording.guidance;
      workoutRecordingChoices.append(
        ...view.workoutRecording.choices.map((choice) =>
          workoutButton(
            choice,
            view.workoutRecording!.slotId,
            view.workoutRecording!.choiceName,
          ),
        ),
      );
    }
  }
  if (workoutHistory && workoutRecords) {
    workoutHistory.hidden = view.workoutRecords.length === 0;
    workoutRecords.replaceChildren(
      ...view.workoutRecords.map(workoutRecordItem),
    );
  }
  if (exerciseHistory && exerciseHistoryWeeks) {
    exerciseHistory.hidden = view.history.length === 0;
    exerciseHistoryWeeks.replaceChildren(...view.history.map(historyWeekItem));
  }
}

async function runDepartureCommand(
  controls: HTMLElement | null,
  command: "respond_to_departure" | "start_departure_decision" | "confirm_departure_decision",
  arguments_: Record<string, string>,
  fallbackError: string,
): Promise<void> {
  controls?.querySelectorAll("button").forEach((button) => {
    button.setAttribute("disabled", "");
  });
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      command,
      arguments_,
    );
    renderExerciseDashboard(dashboard);
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(error, fallbackError);
      exerciseReminderStatus.dataset.state = "error";
    }
    controls?.querySelectorAll("button").forEach((button) => {
      button.removeAttribute("disabled");
    });
  }
}

async function respondToDeparture(slotId: string, action: string): Promise<void> {
  const command =
    action === "leaving-for-gym" ? "respond_to_departure" : "start_departure_decision";
  await runDepartureCommand(
    departureActions,
    command,
    {
      slotId,
      ...(action === "leaving-for-gym" ? { action } : { outcome: action }),
    },
    "The departure response could not be saved.",
  );
}

async function confirmDepartureDecision(
  slotId: string,
  outcome: DepartureDecisionOutcome,
  reason: DepartureReason,
): Promise<void> {
  await runDepartureCommand(
    departureReasons,
    "confirm_departure_decision",
    { slotId, outcome, reason },
    "The departure decision could not be saved.",
  );
}

function setWorkoutActionsDisabled(disabled: boolean): void {
  if (logWorkoutNow) {
    logWorkoutNow.disabled = disabled || workoutRecording?.hidden === false;
  }
  [workoutPromptAction, workoutRecordingChoices].forEach((container) => {
    container?.querySelectorAll("button").forEach((button) => {
      button.toggleAttribute("disabled", disabled);
    });
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
    renderExerciseDashboard(dashboard);
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

function renderProfile(profile: ProfileView): void {
  if (profileLabel) {
    profileLabel.value = profile.profileLabel;
  }
  if (profileLabelDisplay) {
    profileLabelDisplay.textContent = profile.profileLabel;
  }
  if (schemaVersion) {
    schemaVersion.textContent = String(profile.schemaVersion);
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

async function runProfileAction(
  action: () => Promise<ProfileAction>,
): Promise<void> {
  exportProfileButton?.setAttribute("disabled", "");
  importProfileButton?.setAttribute("disabled", "");
  try {
    const result = await action();
    renderProfile(result.profile);
    showProfileStatus(result.message);
  } catch (error) {
    showProfileStatus(profileErrorMessage(error), "error");
  } finally {
    exportProfileButton?.removeAttribute("disabled");
    importProfileButton?.removeAttribute("disabled");
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

  try {
    await refreshExerciseDashboard();

    const profile = await window.__TAURI__.core.invoke<ProfileView>("profile_state");
    renderProfile(profile);
    showProfileStatus("Profile loaded from this device.");
  } catch (error) {
    showProfileStatus(profileErrorMessage(error), "error");
  }

  await refreshNotificationCapability();
}

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

exportProfileButton?.addEventListener("click", () => {
  void runProfileAction(() =>
    window.__TAURI__.core.invoke<ProfileAction>("export_profile"),
  );
});

importProfileButton?.addEventListener("click", () => {
  void runProfileAction(() =>
    window.__TAURI__.core.invoke<ProfileAction>("import_profile"),
  );
});

requestNotificationPermissionButton?.addEventListener("click", () => {
  void runNotificationAction("request_notification_permission");
});

scheduleCapabilityNotificationButton?.addEventListener("click", () => {
  void runNotificationAction("schedule_capability_notification");
});

departureActions?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (button?.dataset.slotId && button.dataset.action) {
    void respondToDeparture(button.dataset.slotId, button.dataset.action);
  }
});

departureReasons?.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
  const outcome = button?.dataset.outcome;
  const reason = button?.dataset.reason;
  if (
    button?.dataset.slotId &&
    (outcome === "move-to-fallback" || outcome === "skip") &&
    (reason === "Work ran late" ||
      reason === "Too tired" ||
      reason === "Sick or injured" ||
      reason === "Another commitment" ||
      reason === "Other")
  ) {
    void confirmDepartureDecision(
      button.dataset.slotId,
      outcome,
      reason,
    );
  }
});

cancelDepartureReason?.addEventListener("click", () => {
  void refreshExerciseDashboard();
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

workoutPromptAction?.addEventListener("click", handleWorkoutChoice);
workoutRecordingChoices?.addEventListener("click", handleWorkoutChoice);
logWorkoutNow?.addEventListener("click", () => {
  void runWorkoutAction("start_unscheduled_workout_record", {});
});

window.addEventListener("focus", () => {
  void refreshExerciseDashboard();
  void refreshNotificationCapability();
});

void connectToApplication();

export {};
