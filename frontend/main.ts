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

function errorMessage(error: unknown): string {
  return typeof error === "string" ? error : "The profile operation could not be completed.";
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
    showProfileStatus(errorMessage(error), "error");
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
    showProfileStatus(errorMessage(error), "error");
  }
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
      showProfileStatus(errorMessage(error), "error");
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

void connectToApplication();

export {};
