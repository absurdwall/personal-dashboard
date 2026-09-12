export type VaultSelectionDestination = "today" | "calendar" | "habits";

export type VaultSelectionResult<View> = Readonly<{
  view: View;
  changed: boolean;
}>;

export type VaultSelectionActions<View> = Readonly<{
  isCurrent: () => boolean;
  isPresentationCurrent: () => boolean;
  currentDestination: () => VaultSelectionDestination;
  waitForPendingWrites: () => Promise<void>;
  prepareForVaultSwitch: (view: View) => void;
  renderToday: (view: View) => void;
  renderWorkspaceContextStatus: () => void;
  openCalendar: () => Promise<void>;
  refreshHabits: () => Promise<void>;
}>;

export async function selectVaultAndRefresh<View>(
  invoke: () => Promise<VaultSelectionResult<View>>,
  actions: VaultSelectionActions<View>,
): Promise<"unchanged" | "changed" | "reconciled" | "superseded"> {
  await actions.waitForPendingWrites();
  const result = await invoke();
  if (!actions.isCurrent()) {
    return "superseded";
  }
  if (!result.changed) {
    return actions.isPresentationCurrent() ? "unchanged" : "superseded";
  }

  actions.prepareForVaultSwitch(result.view);
  actions.renderToday(result.view);
  actions.renderWorkspaceContextStatus();
  if (actions.currentDestination() === "calendar") {
    await actions.openCalendar();
  } else if (actions.currentDestination() === "habits") {
    await actions.refreshHabits();
  }
  return actions.isPresentationCurrent() ? "changed" : "reconciled";
}
