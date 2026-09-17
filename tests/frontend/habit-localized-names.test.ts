import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { localizedHabitName } from "../../frontend/habit-presentation.ts";

const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const interfaceLanguage = readFileSync(
  new URL("../../frontend/interface-language.ts", import.meta.url),
  "utf8",
);

test("a configured habit name changes language without changing the stable habit identity", () => {
  const habit = {
    key: "exercise",
    name: "External source name",
    localizedNames: { zh: "锻炼", en: "Exercise" },
  };

  assert.equal(localizedHabitName(habit.name, habit.localizedNames, "zh"), "锻炼");
  assert.equal(localizedHabitName(habit.name, habit.localizedNames, "en"), "Exercise");
  assert.equal(habit.key, "exercise");
});

test("a missing or blank translation falls back to the existing source name", () => {
  const names = { zh: "", en: null };

  assert.equal(localizedHabitName("起床", names, "zh"), "起床");
  assert.equal(localizedHabitName("起床", names, "en"), "起床");
});

test("the compact Habits and historical-correction renderers use the localized display seam", () => {
  assert.match(main, /function displayHabitName\(/);
  assert.match(main, /name\.textContent = displayHabitName\(habit\)/);
  assert.match(main, /heading\.textContent = `\$\{cell\.date\} · \$\{displayHabitName\(habit\)\}`/);
  assert.doesNotMatch(main, /name\.textContent = habit\.name(?!Known)/);
  assert.match(interfaceLanguage, /"habits\.namesConfigInvalid":/);
});
