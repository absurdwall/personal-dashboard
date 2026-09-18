export type AccentColor = "forest" | "blue" | "clay" | "lilac";
export type BackgroundImageState = "none" | "ready" | "unavailable";
export type AppearancePreferences = Readonly<{
  accentColor: AccentColor;
  backgroundImageState: BackgroundImageState;
  backgroundImageUrl: string | null;
  cleanupWarning: string | null;
}>;

type StyleTarget = Readonly<{
  setProperty: (name: string, value: string) => void;
}>;

type BackgroundTarget = {
  dataset: Record<string, string | undefined>;
  style: StyleTarget;
};

const accentTokens: Record<
  AccentColor,
  Readonly<{ accent: string; strong: string; soft: string; onAccent: string; focus: string }>
> = {
  forest: {
    accent: "#2d6c57",
    strong: "#214e43",
    soft: "#e7f0eb",
    onAccent: "#ffffff",
    focus: "#214e43",
  },
  blue: {
    accent: "#4d6f91",
    strong: "#3d5f80",
    soft: "#eaf0f8",
    onAccent: "#ffffff",
    focus: "#3d5f80",
  },
  clay: {
    accent: "#a66348",
    strong: "#874a33",
    soft: "#f8eee7",
    onAccent: "#ffffff",
    focus: "#874a33",
  },
  lilac: {
    accent: "#78638a",
    strong: "#5f4c72",
    soft: "#f1ecf6",
    onAccent: "#ffffff",
    focus: "#5f4c72",
  },
};

export class SerializedLatestMutation<Result> {
  #tail: Promise<void> = Promise.resolve();
  #latestGeneration = 0;
  #confirmed: Result;

  constructor(initialConfirmed: Result) {
    this.#confirmed = initialConfirmed;
  }

  confirm(value: Result): void {
    this.#confirmed = value;
  }

  enqueue(
    operation: () => Promise<Result>,
    presentSuccess: (result: Result) => void,
    presentFailure: (error: unknown, confirmed: Result) => void,
  ): Promise<void> {
    const generation = ++this.#latestGeneration;
    const result = this.#tail.then(operation);
    this.#tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result.then(
      (value) => {
        this.#confirmed = value;
        if (generation === this.#latestGeneration) presentSuccess(value);
      },
      (error: unknown) => {
        if (generation === this.#latestGeneration) presentFailure(error, this.#confirmed);
      },
    );
  }
}

export function applyAccentColor(color: AccentColor, target: StyleTarget): void {
  const tokens = accentTokens[color];
  target.setProperty("--parity-accent", tokens.accent);
  target.setProperty("--parity-accent-strong", tokens.strong);
  target.setProperty("--parity-accent-soft", tokens.soft);
  target.setProperty("--parity-accent-on", tokens.onAccent);
  target.setProperty("--parity-focus", tokens.focus);
}

export function applyBackgroundImage(
  preferences: AppearancePreferences,
  target: BackgroundTarget,
): void {
  const ready = preferences.backgroundImageState === "ready" &&
    preferences.backgroundImageUrl !== null;
  target.style.setProperty(
    "--background-image",
    ready ? `url("${preferences.backgroundImageUrl}")` : "none",
  );
  target.dataset.backgroundImageState = preferences.backgroundImageState;
}

export async function resolveBackgroundImagePresentation(
  preferences: AppearancePreferences,
  decode: (url: string) => Promise<void> = decodeBackgroundImage,
): Promise<AppearancePreferences> {
  if (preferences.backgroundImageState !== "ready" || preferences.backgroundImageUrl === null) {
    return preferences;
  }
  try {
    await decode(preferences.backgroundImageUrl);
    return preferences;
  } catch {
    return {
      ...preferences,
      backgroundImageState: "unavailable",
      backgroundImageUrl: null,
    };
  }
}

function decodeBackgroundImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error("background image decode failed")), {
      once: true,
    });
    image.src = url;
  });
}
