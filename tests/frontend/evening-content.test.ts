import assert from "node:assert/strict";
import test from "node:test";

import {
  hasEveningReviewContent,
  hasEveningVisibleContent,
} from "../../frontend/evening-content.ts";

const supplementOnly = {
  account: [],
  comparison: [],
  summary: [],
  questions: [],
  additions: [],
  corrections: [],
  other: [],
  recordSupplements: [{ id: "habit-note-1" }],
};

test("a short-record supplement is visible without claiming an evening review", () => {
  assert.equal(hasEveningVisibleContent(supplementOnly), true);
  assert.equal(hasEveningReviewContent(supplementOnly), false);
});

test("authored evening account content establishes a review", () => {
  assert.equal(
    hasEveningReviewContent({
      ...supplementOnly,
      account: ["今天发生了什么"],
    }),
    true,
  );
});
