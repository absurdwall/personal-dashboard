import test from "node:test";
import assert from "node:assert/strict";
import { HabitSettingsDraft } from "../../frontend/habit-settings.ts";

test("create draft defaults to lived date and keeps stable identity/request through a failed save and reread", () => {
  let nextId = 0;
  const draft = new HabitSettingsDraft({ catalogRevision: null, catalogTargetBinding: "vault-a", habits: [] }, "2026-10-13", undefined, () => `id-${++nextId}`);
  draft.settings.name = "Reading";
  const first = draft.request();
  assert.equal(first.habitKey, "local-id-1");
  assert.equal(first.settings.startDate, "2026-10-13");
  assert.deepEqual(first.settings.goal, { kind: "daily-completion" });
  draft.reread({catalogRevision: "r1", catalogTargetBinding: "vault-a", habits: []});
  const retry = draft.request();
  assert.equal(retry.habitKey, first.habitKey);
  assert.equal(retry.changeId, first.changeId);
  assert.equal(retry.expectedRevision, "r1");
  assert.equal(draft.settings.name, "Reading");
  assert.throws(() => draft.reread({catalogRevision: "r2", catalogTargetBinding: "vault-b", habits: []}), /Vault/);
});

test("edit draft loads pending target and keeps stable key while a changed payload gets its own operation", () => {
  let nextId = 0;
  const settings = {name:"Movement", emoji:"🚶", group:"Health", startDate:"2026-10-01", goal:{kind:"weekly-days" as const,days:5}};
  const draft = new HabitSettingsDraft({catalogRevision:"r1",catalogTargetBinding:"vault-a",habits:[{key:"exercise",settings,currentGoal:{kind:"weekly-days",days:3},pendingGoal:{effectiveDate:"2026-10-19",goal:settings.goal},goalLabel:"每周 3 个达标天"}]}, "2026-10-13", "exercise", () => `edit-${++nextId}`);
  assert.deepEqual(draft.settings.goal,{kind:"weekly-days",days:5});
  const first = draft.request();
  draft.settings.name="Exercise";
  const changed=draft.request();
  assert.equal(changed.habitKey,"exercise");
  assert.notEqual(changed.changeId,first.changeId);
  assert.equal(draft.original?.currentGoal?.kind,"weekly-days");
});
