import assert from "node:assert/strict";
import test from "node:test";

import { habitCompletionPresentation } from "../../frontend/habit-completion.ts";

test("a local-only completion is checked and names the local source", () => {
  assert.deepEqual(
    habitCompletionPresentation({
      countsAsCompletion: true,
      hasExternalCompletion: false,
      localCompletionState: "completed",
      completionSourceLabels: ["Personal Dashboard local"],
    }),
    {
      checked: true,
      explanation: "local",
      sourceLabels: ["Personal Dashboard local"],
    },
  );
});

test("withdrawing local state stays checked when external evidence still completes", () => {
  assert.deepEqual(
    habitCompletionPresentation({
      countsAsCompletion: true,
      hasExternalCompletion: true,
      localCompletionState: "withdrawn",
      completionSourceLabels: ["Dida365 打卡"],
    }),
    {
      checked: true,
      explanation: "withdrawn-external",
      sourceLabels: ["Dida365 打卡"],
    },
  );
});

test("unknown external evidence and no local record remains unchecked", () => {
  assert.deepEqual(
    habitCompletionPresentation({
      countsAsCompletion: false,
      hasExternalCompletion: false,
      localCompletionState: "none",
      completionSourceLabels: [],
    }),
    {
      checked: false,
      explanation: "unknown",
      sourceLabels: [],
    },
  );
});

test("source explanations distinguish external, merged, and withdrawn-only states", () => {
  assert.equal(
    habitCompletionPresentation({
      countsAsCompletion: true,
      hasExternalCompletion: true,
      localCompletionState: "none",
      completionSourceLabels: ["Dida365 打卡"],
    }).explanation,
    "external",
  );
  assert.equal(
    habitCompletionPresentation({
      countsAsCompletion: true,
      hasExternalCompletion: true,
      localCompletionState: "completed",
      completionSourceLabels: ["Dida365 打卡", "Personal Dashboard local"],
    }).explanation,
    "local-and-external",
  );
  assert.equal(
    habitCompletionPresentation({
      countsAsCompletion: false,
      hasExternalCompletion: false,
      localCompletionState: "withdrawn",
      completionSourceLabels: [],
    }).explanation,
    "withdrawn",
  );
});

test("an external source may share the local display label without changing ownership", () => {
  assert.equal(
    habitCompletionPresentation({
      countsAsCompletion: true,
      hasExternalCompletion: true,
      localCompletionState: "none",
      completionSourceLabels: ["Personal Dashboard local"],
    }).explanation,
    "external",
  );
});
