export type AccentColor = "forest" | "blue" | "clay" | "lilac";

type StyleTarget = Readonly<{
  setProperty: (name: string, value: string) => void;
}>;

const accentTokens: Record<
  AccentColor,
  Readonly<{ accent: string; strong: string; soft: string }>
> = {
  forest: { accent: "#2d6c57", strong: "#214e43", soft: "#e7f0eb" },
  blue: { accent: "#4d6f91", strong: "#3d5f80", soft: "#eaf0f8" },
  clay: { accent: "#a66348", strong: "#874a33", soft: "#f8eee7" },
  lilac: { accent: "#78638a", strong: "#5f4c72", soft: "#f1ecf6" },
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
}
