import assert from "node:assert/strict";
import test from "node:test";

import {
  selectVaultAndRefresh,
  type VaultSelectionActions,
  type VaultSelectionDestination,
} from "../../frontend/vault-selection.ts";

type View = Readonly<{ vault: string; date: string; defaultPhase: string }>;

type State = {
  destination: VaultSelectionDestination;
  draft: string;
  correctionId: string | null;
  selectedDate: string | null;
  phase: string;
  currentView: View | null;
  renderedView: View | null;
  statusRenders: number;
  calendarRefreshes: number;
  habitsRefreshes: number;
  order: string[];
};

function actionsFor(state: State): VaultSelectionActions<View> {
  return {
    isCurrent: () => true,
    currentDestination: () => state.destination,
    prepareForVaultSwitch: (view) => {
      state.order.push("reset");
      state.draft = "";
      state.correctionId = null;
      state.selectedDate = null;
      state.phase = view.defaultPhase;
      state.currentView = null;
    },
    renderToday: (view) => {
      state.order.push("today");
      state.currentView = view;
      state.renderedView = view;
    },
    renderWorkspaceContextStatus: () => {
      state.order.push("status");
      state.statusRenders += 1;
    },
    openCalendar: async () => {
      state.order.push("calendar");
      state.calendarRefreshes += 1;
    },
    refreshHabits: async () => {
      state.order.push("habits");
      state.habitsRefreshes += 1;
    },
  };
}

function stateFor(destination: VaultSelectionDestination): State {
  return {
    destination,
    draft: "未保存输入",
    correctionId: "correction-1",
    selectedDate: "2026-09-07",
    phase: "evening",
    currentView: { vault: "vault-a", date: "2026-09-07", defaultPhase: "evening" },
    renderedView: null,
    statusRenders: 0,
    calendarRefreshes: 0,
    habitsRefreshes: 0,
    order: [],
  };
}

test("cancelling Vault selection preserves draft, correction, and browsing state", async () => {
  const state = stateFor("calendar");
  const before = { ...state, order: [...state.order] };
  const result = await selectVaultAndRefresh(
    async () => ({
      changed: false,
      view: { vault: "vault-a", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "unchanged");
  assert.deepEqual(state, before);
});

test("reselecting the current Vault preserves draft, correction, and browsing state", async () => {
  const state = stateFor("habits");
  const before = { ...state, order: [...state.order] };
  const result = await selectVaultAndRefresh(
    async () => ({
      changed: false,
      view: { vault: "vault-a", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "unchanged");
  assert.deepEqual(state, before);
});

test("switching Vault clears old state before refreshing Calendar with the new view", async () => {
  const state = stateFor("calendar");
  const result = await selectVaultAndRefresh(
    async () => ({
      changed: true,
      view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "changed");
  assert.equal(state.draft, "");
  assert.equal(state.correctionId, null);
  assert.equal(state.selectedDate, null);
  assert.equal(state.phase, "morning");
  assert.equal(state.currentView?.vault, "vault-b");
  assert.deepEqual(state.renderedView, {
    vault: "vault-b",
    date: "2026-09-10",
    defaultPhase: "morning",
  });
  assert.equal(state.calendarRefreshes, 1);
  assert.equal(state.habitsRefreshes, 0);
  assert.deepEqual(state.order, ["reset", "today", "status", "calendar"]);
});

test("switching Vault clears old state before refreshing Habits with the new view", async () => {
  const state = stateFor("habits");
  const result = await selectVaultAndRefresh(
    async () => ({
      changed: true,
      view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "changed");
  assert.equal(state.draft, "");
  assert.equal(state.correctionId, null);
  assert.equal(state.selectedDate, null);
  assert.equal(state.habitsRefreshes, 1);
  assert.equal(state.calendarRefreshes, 0);
  assert.deepEqual(state.order, ["reset", "today", "status", "habits"]);
});
