import assert from "node:assert/strict";
import test from "node:test";
import {
  isCurrentTaskResponse,
  normalizeTaskSchedule,
} from "../../frontend/task-presentation.ts";

test("clearing a task date also clears its time and disables the time control", () => {
  assert.deepEqual(normalizeTaskSchedule("", "09:30"), {
    date: null,
    time: null,
    timeDisabled: true,
  });
  assert.deepEqual(normalizeTaskSchedule("2026-10-01", "09:30"), {
    date: "2026-10-01",
    time: "09:30",
    timeDisabled: false,
  });
});

test("a late task response cannot cross a destination or target binding boundary", () => {
  let currentToken = 2;
  const request = { isCurrent: (token: number) => token === currentToken };

  assert.equal(isCurrentTaskResponse(request, 1, "tasks", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "calendar", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-b"), false);
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-a"), true);
  currentToken = 3;
  assert.equal(isCurrentTaskResponse(request, 2, "tasks", "vault-a", "vault-a"), false);
  assert.equal(isCurrentTaskResponse(request, 3, "tasks", null, "vault-b"), true);
});
