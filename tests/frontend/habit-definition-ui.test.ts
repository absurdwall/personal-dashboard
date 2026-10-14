import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const language = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");

test("Habit creation stays in the existing Habits summary and shares a compact create/edit form", () => {
  assert.match(html, /id="new-habit"/);
  assert.match(html, /id="refresh-habits"/);
  assert.match(html, /id="habit-definition-dialog"[\s\S]*?id="habit-definition-form"/);
  assert.match(html, /id="habit-definition-name"/);
  assert.match(html, /id="habit-definition-start-date" type="date" required/);
  assert.match(html, /value="daily-completion"/);
  assert.match(html, /value="weekly-count"/);
  assert.match(html, /value="daily-time"/);
  assert.match(html, /value="next-day"/);
  assert.match(html, /id="habit-definition-cancel"[\s\S]*?id="habit-definition-submit"/);
  assert.match(main, /newHabitButton\?\.addEventListener\("click", \(\) => openHabitDefinitionEditor\(null\)\)/);
  assert.match(main, /function openHabitDefinitionEditor\(habitKey: string \| null\)/);
});

test("Habit rows stay compact while keeping a discoverable, shared edit route", () => {
  assert.match(main, /edit\.dataset\.habitEdit = habit\.key/);
  assert.match(main, /openHabitDefinitionEditor\(editHabit\.dataset\.habitEdit\)/);
  assert.match(main, /addEventListener\("contextmenu"[\s\S]*?openHabitDefinitionEditor\(row\.dataset\.habitKey\)/);
  assert.match(main, /event\.key !== "F10" \|\| !event\.shiftKey[\s\S]*?openHabitDefinitionEditor\(row\.dataset\.habitKey\)/);
  assert.match(styles, /\.habit-snapshot-row:hover \.habit-edit-trigger,[\s\S]*?\.habit-snapshot-row:focus-within \.habit-edit-trigger/);
  assert.match(styles, /\.habit-edit-trigger \{[^}]*opacity: 0/s);
});

test("editing a sourced Habit with no recognized goal preserves its source goal", () => {
  assert.match(html, /id="habit-definition-keep-source-option" value="keep-source"/);
  assert.match(main, /definition\?\.origin === "sourced" && !goal \? \{ goalKind: "keep-source" as const \} : \{\}/);
  assert.match(main, /if \(values\.goalKind === "keep-source"\) return null/);
  assert.match(main, /goal: HabitGoalTarget \| null/);
  assert.match(language, /"habits\.keepSourceGoalNote": \{ zh: .+, en: .+ \}/);
});

test("a stale Habit definition keeps its draft until the same Vault is refreshed", () => {
  assert.match(html, /id="habit-definition-refresh"[\s\S]*?hidden/);
  assert.match(main, /function isHabitDefinitionRevisionConflict\(error: unknown\)/);
  assert.match(main, /async function refreshHabitDefinitionAfterConflict\(\)/);
  assert.match(main, /await refreshHabits\(\)/);
  assert.match(main, /latest\.catalogTargetBinding !== binding/);
  assert.match(main, /draft\.pendingInput = null/);
  assert.match(main, /draft\.values = retainedValues/);
  assert.match(main, /habitDefinitionRefresh\?\.addEventListener\("click"/);
  assert.match(language, /"habits\.definitionConflictRefreshed": \{ zh: .+, en: .+ \}/);
});
