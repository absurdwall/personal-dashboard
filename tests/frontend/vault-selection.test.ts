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
  current: boolean;
  presentationCurrent: boolean;
  pendingWrites: Promise<boolean> | null;
  pendingWriteFailureRenders: number;
  pendingWriteError: string | null;
  pendingWriteFailureDestination: VaultSelectionDestination | null;
  pendingWriteErrorVisible: boolean;
};

function actionsFor(state: State): VaultSelectionActions<View> {
  return {
    isCurrent: () => state.current,
    isPresentationCurrent: () => state.presentationCurrent,
    currentDestination: () => state.destination,
    waitForPendingWrites: async () => state.pendingWrites ? await state.pendingWrites : true,
    renderPendingWriteFailure: () => {
      state.pendingWriteFailureRenders += 1;
      state.pendingWriteError = "Habits 保存失败，草稿仍保留。";
      state.pendingWriteFailureDestination = state.destination;
      state.pendingWriteErrorVisible = true;
      state.order.push("write-failed");
    },
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
    current: true,
    presentationCurrent: true,
    pendingWrites: null,
    pendingWriteFailureRenders: 0,
    pendingWriteError: null,
    pendingWriteFailureDestination: null,
    pendingWriteErrorVisible: false,
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

test("a current Vault result still reconciles globally after its Today presentation is superseded", async () => {
  const state = stateFor("calendar");
  state.presentationCurrent = false;

  const result = await selectVaultAndRefresh(
    async () => ({
      changed: true,
      view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "reconciled");
  assert.equal(state.currentView?.vault, "vault-b");
  assert.equal(state.draft, "");
  assert.equal(state.correctionId, null);
  assert.equal(state.selectedDate, null);
  assert.equal(state.calendarRefreshes, 1);
});

test("an obsolete Vault result cannot clear a newer selection state", async () => {
  const state = stateFor("habits");
  state.current = false;

  const result = await selectVaultAndRefresh(
    async () => ({
      changed: true,
      view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
    }),
    actionsFor(state),
  );

  assert.equal(result, "superseded");
  assert.equal(state.currentView?.vault, "vault-a");
  assert.equal(state.draft, "未保存输入");
  assert.deepEqual(state.order, []);
});

test("a delayed failed Habits save aborts Vault selection and preserves the editor state", async () => {
  const state = stateFor("habits");
  let release!: (saved: boolean) => void;
  state.pendingWrites = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  let invoked = false;

  const selection = selectVaultAndRefresh(
    async () => {
      invoked = true;
      return {
        changed: true,
        view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
      };
    },
    actionsFor(state),
  );

  await Promise.resolve();
  assert.equal(invoked, false);
  release(false);
  assert.equal(await selection, "blocked");
  assert.equal(invoked, false);
  assert.equal(state.draft, "未保存输入");
  assert.equal(state.correctionId, "correction-1");
  assert.equal(state.selectedDate, "2026-09-07");
  assert.equal(state.phase, "evening");
  assert.equal(state.currentView?.vault, "vault-a");
  assert.equal(state.pendingWriteFailureRenders, 1);
  assert.equal(state.pendingWriteError, "Habits 保存失败，草稿仍保留。");
  assert.equal(state.pendingWriteFailureDestination, "habits");
  assert.equal(state.pendingWriteErrorVisible, true);
  assert.deepEqual(state.order, ["write-failed"]);
});

test("a failed pending Habits save after navigating to Calendar blocks the picker and keeps a visible Calendar error", async () => {
  const state = stateFor("habits");
  let release!: (saved: boolean) => void;
  state.pendingWrites = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  let invoked = false;

  const selection = selectVaultAndRefresh(
    async () => {
      invoked = true;
      return {
        changed: true,
        view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
      };
    },
    actionsFor(state),
  );

  await Promise.resolve();
  assert.equal(invoked, false);
  state.destination = "calendar";
  release(false);

  assert.equal(await selection, "blocked");
  assert.equal(invoked, false);
  assert.equal(state.destination, "calendar");
  assert.equal(state.draft, "未保存输入");
  assert.equal(state.correctionId, "correction-1");
  assert.equal(state.selectedDate, "2026-09-07");
  assert.equal(state.phase, "evening");
  assert.equal(state.currentView?.vault, "vault-a");
  assert.equal(state.pendingWriteFailureDestination, "calendar");
  assert.equal(state.pendingWriteErrorVisible, true);
  assert.deepEqual(state.order, ["write-failed"]);
});

test("a delayed successful Habits save allows the Vault picker and switch", async () => {
  const state = stateFor("habits");
  let release!: (saved: boolean) => void;
  state.pendingWrites = new Promise<boolean>((resolve) => {
    release = resolve;
  });
  let invoked = false;

  const selection = selectVaultAndRefresh(
    async () => {
      invoked = true;
      return {
        changed: true,
        view: { vault: "vault-b", date: "2026-09-10", defaultPhase: "morning" },
      };
    },
    actionsFor(state),
  );

  await Promise.resolve();
  assert.equal(invoked, false);
  release(true);
  assert.equal(await selection, "changed");
  assert.equal(invoked, true);
  assert.equal(state.currentView?.vault, "vault-b");
  assert.equal(state.draft, "");
  assert.equal(state.pendingWriteFailureRenders, 0);
  assert.equal(state.pendingWriteError, null);
  assert.equal(state.pendingWriteFailureDestination, null);
  assert.equal(state.pendingWriteErrorVisible, false);
  assert.deepEqual(state.order, ["reset", "today", "status", "habits"]);
});
