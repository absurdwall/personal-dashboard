import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
const hook=registerHooks({resolve(specifier,context,nextResolve){return nextResolve(specifier==="./interface-language.js"?"./interface-language.ts":specifier,context);}});
const {isSleepHabitKey}=await import("../../frontend/sleep-facts.ts");hook.deregister();

const source = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");

function production(name: string) {
  const start = source.indexOf(`function ${name}(`);
  const rest = source.slice(start);
  return stripTypeScriptTypes(rest.slice(0, /^}\n/m.exec(rest)!.index + 2));
}

class FakeElement {
  className = "";
  hidden = false;
  textContent = "";
  dataset: Record<string, string> = {};
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  classList = { add: (...names: string[]) => { this.className = [...this.className.split(" "), ...names].filter(Boolean).join(" "); } };
  readonly tag: string;
  constructor(tag: string) { this.tag = tag; }
  append(...nodes: FakeElement[]) { this.children.push(...nodes); }
  replaceChildren(...nodes: FakeElement[]) { this.children = [...nodes]; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
}

test("selecting a Habit renders compact detail and pages rather than expanding every history row", () => {
  const currentView = new FakeElement("today-view");
  const panel = new FakeElement("detail-panel");
  panel.hidden = true;
  const heading = new FakeElement("heading");
  const status = new FakeElement("status");
  const content = new FakeElement("content");
  const cells = Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 14 - index)).toISOString().slice(0, 10);
    return {
      date,
      coverage: "unknown",
      countsAsCompletion: true,
      hasExternalCompletion: false,
      localCompletionState: "completed",
      hasRecord: true,
      completionSourceLabels: ["Personal Dashboard local"],
      localRecords: [],
      details: [],
    };
  });
  const habit = {
    key: "reading",
    name: "Read",
    localizedNames: null,
    active: true,
    canRecordCompletion: true,
    goalKind: "daily-completion",
    goalLabel: "每日完成",
    goalTarget: { kind: "daily-completion" },
    sourceLabels: ["Personal Dashboard local"],
    coverageLabel: "local",
    goalHistory: [],
    today: { date: "2026-10-14", countsAsCompletion: false, status: "unknown" },
    recent: [],
    history: cells,
    definition: {
      origin: "local",
      emoji: "📚",
      group: null,
      startDate: "2026-01-01",
      lifecycleActive: true,
      lifecycleHistory: [],
      goalRevisions: [],
      currentGoal: { kind: "daily-completion" },
      currentGoalEffectiveFrom: "2026-01-01",
      pendingGoal: null,
      pendingGoalEffectiveFrom: null,
      partialGoalCycle: false,
    },
  };
  const view = {
    habit,
    statistics: {
      monthAttainedDays: 2,
      monthExact: false,
      cumulativeAttainedDays: 24,
      cumulativeExact: true,
      currentStreak: 1,
      highestConfirmedStreak: 3,
      highestHistoryExact: false,
      streakUnit: "days",
      coverageFrom: "2026-07-23",
      coverageTo: "2026-10-14",
    },
    canonicalState: "ready",
    canonicalRevision: "revision-4",
    canonicalTargetBinding: "vault-binding",
    canonicalError: null,
    localCompletions: cells.map((cell) => ({
      livedDate: cell.date,
      state: "completed",
      completedAt: `${cell.date}T09:00:00-04:00`,
      changes: [{ id: `completion-${cell.date}`, kind: "completed", changedAt: `${cell.date}T09:00:00-04:00` }],
    })),
    snapshotState: "ready",
    snapshotGeneratedAt: "2026-10-14T09:00:00-04:00",
    snapshotRange: "2026-07-01 — 2026-10-14",
  };
  const context = vm.createContext({
    isSleepHabitKey,
    document: { createElement: (tag: string) => new FakeElement(tag) },
    habitDetailPanel: panel,
    habitsCurrentTodayView: currentView,
    habitDetailHeading: heading,
    habitDetailStatus: status,
    habitDetailContent: content,
    habitDetailLoading: false,
    habitDetailLoadError: null,
    habitDetailLifecycleNotice: null,
    selectedHabitDetailKey: "reading",
    currentHabitDetailHistory: view,
    currentHabitSnapshot: { catalogTargetBinding: "vault-binding", catalogRevision: "catalog-4", catalogError: null },
    habitDetailRecordLimit: 20,
    habitLifecycleOperationCount: 0,
    currentInterfaceLanguage: "en",
    displayHabitName: (item: any) => item.name,
    habitCompletionControl: () => new FakeElement("completion-control"),
    habitGoalTargetLabel: () => "Daily",
    localizeHabitGoalLabel: (label: string) => label,
    localizeHabitDetail: (detail: unknown) => String(detail),
    setCopy: (element: FakeElement, key: string, variables: Record<string, unknown> = {}) => {
      element.textContent = `${key} ${JSON.stringify(variables)}`;
    },
    setCopyError: (element: FakeElement, key: string, error: string) => { element.textContent = `${key} ${error}`; },
    setRawText: (element: FakeElement, value: string) => { element.textContent = value; },
    t: (key: string) => key,
  });
  vm.runInContext(`${production("habitDetailRecords")}\n${production("renderHabitDetailPanel")}\nrenderHabitDetailPanel()`, context);

  assert.equal(currentView.hidden, true);
  assert.equal(panel.hidden, false);
  assert.equal(heading.textContent, "📚 Read");
  const stats = content.children.find((child) => child.className === "habit-detail-stats");
  assert.equal(stats?.children.length, 4);
  const records = content.children.find((child) => child.className === "habit-detail-records");
  assert.ok(records);
  const list = records.children.find((child) => child.className === "habit-detail-record-list");
  assert.equal(list?.children.length, 20);
  assert.ok(records.children.some((child) => child.dataset.habitDetailLoadMore === "true"));
  assert.ok(JSON.stringify(records).includes("Personal Dashboard local"));
  assert.ok(JSON.stringify(content).includes("revision-4"));
  assert.ok(JSON.stringify(content).includes("2026-07-01 — 2026-10-14"));
});
