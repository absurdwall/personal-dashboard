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
  if (notificationScheduledTime) {
    notificationScheduledTime.textContent = view.scheduledForEpochMillis
      ? new Date(view.scheduledForEpochMillis).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })
      : "Not scheduled";
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
    const profile = await window.__TAURI__.core.invoke<ProfileView>("profile_state");
    renderProfile(profile);
    showProfileStatus("Profile loaded from this Mac.");
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
      showProfileStatus("Profile label saved on this Mac.");
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

window.addEventListener("focus", () => {
  void refreshNotificationCapability();
});

void connectToApplication();

export {};
