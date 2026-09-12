import assert from "node:assert/strict";
import test from "node:test";

import {
  preserveDayTaskPlanError,
  preserveTodayDayTaskPlanError,
} from "../../frontend/day-task-presentation.ts";

type TaskList = Readonly<{
  message: string;
  planError: string | null;
  revision: string | null;
}>;

test("a local task mutation keeps the active producer diagnostic until refresh", () => {
  const previous: TaskList = {
    message: "规划任务输入无效",
    planError: "规划任务输入无效",
    revision: "before",
  };
  const mutationResult: TaskList = {
    message: "已读取这一天的任务。",
    planError: null,
    revision: "after",
  };

  assert.deepEqual(preserveDayTaskPlanError(previous, mutationResult), {
    message: "规划任务输入无效",
    planError: "规划任务输入无效",
    revision: "after",
  });
});

test("a newly reported producer diagnostic supersedes the previous diagnostic", () => {
  const previous: TaskList = {
    message: "旧错误",
    planError: "旧错误",
    revision: "before",
  };
  const mutationResult: TaskList = {
    message: "新错误",
    planError: "新错误",
    revision: "after",
  };

  assert.equal(
    preserveDayTaskPlanError(previous, mutationResult).planError,
    "新错误",
  );
});

test("a mutation without an active producer diagnostic remains unchanged", () => {
  const previous: TaskList = {
    message: "已读取这一天的任务。",
    planError: null,
    revision: "before",
  };
  const mutationResult: TaskList = {
    message: "已读取这一天的任务。",
    planError: null,
    revision: "after",
  };

  assert.equal(
    preserveDayTaskPlanError(previous, mutationResult),
    mutationResult,
  );
});

test("a Daily Record mutation keeps the task producer diagnostic in the returned Today view", () => {
  const previous = {
    revision: "record-before",
    daytimeCount: 1,
    dayTasks: {
      message: "规划任务输入无效",
      planError: "规划任务输入无效",
      revision: "tasks-before",
    },
  };
  const mutationResult = {
    revision: "record-after",
    daytimeCount: 2,
    dayTasks: {
      message: "已读取这一天的任务。",
      planError: null,
      revision: "tasks-before",
    },
  };

  assert.deepEqual(preserveTodayDayTaskPlanError(previous, mutationResult), {
    revision: "record-after",
    daytimeCount: 2,
    dayTasks: {
      message: "规划任务输入无效",
      planError: "规划任务输入无效",
      revision: "tasks-before",
    },
  });
});
