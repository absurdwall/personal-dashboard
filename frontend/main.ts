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

type PrimaryDeparture = DepartureTiming & Readonly<{
  status: string;
}>;

type FallbackDeparture = DepartureTiming & Readonly<{
  availability: string;
}>;

type ExerciseDashboardView = Readonly<{
  productName: string;
  featureArea: string;
  schemaVersion: number;
  weekLabel: string;
  progress: string;
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
  departureConfirmation: Readonly<{
    message: string;
    nextPrompt: string;
  }> | null;
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
const departurePrompt = document.querySelector<HTMLElement>("#departure-prompt");
const departurePromptHeading = document.querySelector<HTMLElement>(
  "#departure-prompt-heading",
);
const departureResponseStatus = document.querySelector<HTMLElement>(
  "#departure-response-status",
);
const departureActions = document.querySelector<HTMLElement>("#departure-actions");
const departureConfirmation = document.querySelector<HTMLElement>(
  "#departure-confirmation",
);
const departureConfirmationMessage = document.querySelector<HTMLElement>(
  "#departure-confirmation-message",
);
const departureConfirmationNextPrompt = document.querySelector<HTMLElement>(
  "#departure-confirmation-next-prompt",
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

function renderExerciseDashboard(view: ExerciseDashboardView): void {
  if (exerciseWeek) {
    exerciseWeek.textContent = `Week of ${view.weekLabel}`;
  }
  if (exerciseProgress) {
    exerciseProgress.textContent = view.progress;
  }
  if (nextDeparture) {
    nextDeparture.textContent =
      view.nextDeparture ?? "No primary departures remaining this week";
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
}

async function respondToDeparture(slotId: string, action: string): Promise<void> {
  departureActions?.querySelectorAll("button").forEach((button) => {
    button.setAttribute("disabled", "");
  });
  try {
    const dashboard = await window.__TAURI__.core.invoke<ExerciseDashboardView>(
      "respond_to_departure",
      { slotId, action },
    );
    renderExerciseDashboard(dashboard);
  } catch (error) {
    if (exerciseReminderStatus) {
      exerciseReminderStatus.textContent = errorMessage(
        error,
        "The departure response could not be saved.",
      );
      exerciseReminderStatus.dataset.state = "error";
    }
    departureActions?.querySelectorAll("button").forEach((button) => {
      button.removeAttribute("disabled");
    });
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

window.addEventListener("focus", () => {
  void refreshExerciseDashboard();
  void refreshNotificationCapability();
});

void connectToApplication();

export {};
