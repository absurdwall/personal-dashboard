import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyAccentColor,
  applyBackgroundImage,
  resolveBackgroundImagePresentation,
  SerializedLatestMutation,
} from "../../frontend/appearance.ts";

test("an accent selection updates the shared page color tokens immediately", () => {
  const properties = new Map<string, string>();

  applyAccentColor("blue", {
    setProperty(name, value) {
      properties.set(name, value);
    },
  });

  assert.deepEqual(Object.fromEntries(properties), {
    "--parity-accent": "#4d6f91",
    "--parity-accent-strong": "#3d5f80",
    "--parity-accent-soft": "#eaf0f8",
    "--parity-accent-on": "#ffffff",
    "--parity-focus": "#3d5f80",
  });
});

function contrastRatio(foreground: string, background: string): number {
  const channel = (hex: string, offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex: string): number => (
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5)
  );
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test("every accent supplies readable primary and focus roles", () => {
  for (const color of ["forest", "blue", "clay", "lilac"] as const) {
    const properties = new Map<string, string>();
    applyAccentColor(color, {
      setProperty(name, value) {
        properties.set(name, value);
      },
    });

    assert.ok(
      contrastRatio(properties.get("--parity-accent-on") ?? "", properties.get("--parity-accent-strong") ?? "") >= 4.5,
      `${color} primary text does not meet 4.5:1 contrast`,
    );
    assert.match(properties.get("--parity-focus") ?? "", /^#[0-9a-f]{6}$/);
  }
});

test("a ready background applies one shared image layer and recoverable states clear it", () => {
  const properties = new Map<string, string>();
  const target = {
    dataset: {} as Record<string, string>,
    style: {
      setProperty(name: string, value: string) {
        properties.set(name, value);
      },
    },
  };

  applyBackgroundImage({
    accentColor: "forest",
    backgroundImageState: "ready",
    backgroundImageUrl: "data:image/png;base64,c3ludGhldGlj",
    cleanupWarning: null,
  }, target);

  assert.equal(
    properties.get("--background-image"),
    'url("data:image/png;base64,c3ludGhldGlj")',
  );
  assert.equal(target.dataset.backgroundImageState, "ready");

  applyBackgroundImage({
    accentColor: "forest",
    backgroundImageState: "unavailable",
    backgroundImageUrl: null,
    cleanupWarning: null,
  }, target);

  assert.equal(properties.get("--background-image"), "none");
  assert.equal(target.dataset.backgroundImageState, "unavailable");
});

test("an image WebKit cannot decode becomes a recoverable presentation state", async () => {
  const preferences = {
    accentColor: "forest" as const,
    backgroundImageState: "ready" as const,
    backgroundImageUrl: "data:image/png;base64,broken",
    cleanupWarning: null,
  };

  const presentation = await resolveBackgroundImagePresentation(
    preferences,
    async () => { throw new Error("synthetic decode failure"); },
  );

  assert.deepEqual(presentation, {
    ...preferences,
    backgroundImageState: "unavailable",
    backgroundImageUrl: null,
  });
});

test("the packaged image policy admits the local data URL renderer", () => {
  const configuration = JSON.parse(
    readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
  ) as { app: { security: { csp: string } } };
  const imageDirective = configuration.app.security.csp
    .split(";")
    .find((directive) => directive.trimStart().startsWith("img-src"));

  assert.match(imageDirective ?? "", /(?:^|\s)data:(?:\s|$)/);
});

test("appearance writes are serialized and only the latest response is presented", async () => {
  const mutations = new SerializedLatestMutation("initial-confirmed");
  const events: string[] = [];
  let finishFirst!: (value: string) => void;
  let finishSecond!: (value: string) => void;
  const first = mutations.enqueue(
    () => new Promise<string>((resolve) => {
      events.push("first-started");
      finishFirst = resolve;
    }),
    (value) => events.push(value),
    () => events.push("first-failed"),
  );
  const second = mutations.enqueue(
    () => new Promise<string>((resolve) => {
      events.push("second-started");
      finishSecond = resolve;
    }),
    (value) => events.push(value),
    () => events.push("second-failed"),
  );

  await Promise.resolve();
  assert.deepEqual(events, ["first-started"]);
  finishFirst("stale-first-result");
  await first;
  await Promise.resolve();
  assert.deepEqual(events, ["first-started", "second-started"]);
  finishSecond("latest-second-result");
  await second;
  assert.deepEqual(events, ["first-started", "second-started", "latest-second-result"]);
});

test("two queued failures roll back to the last confirmed appearance", async () => {
  const mutations = new SerializedLatestMutation("forest");
  const presentations: string[] = [];
  const first = mutations.enqueue(
    async () => { throw new Error("first failed"); },
    () => presentations.push("unexpected first success"),
    (_error, confirmed) => presentations.push(`first:${confirmed}`),
  );
  const second = mutations.enqueue(
    async () => { throw new Error("second failed"); },
    () => presentations.push("unexpected second success"),
    (_error, confirmed) => presentations.push(`second:${confirmed}`),
  );

  await Promise.all([first, second]);

  assert.deepEqual(presentations, ["second:forest"]);
});
