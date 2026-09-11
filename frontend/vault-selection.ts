export type VaultSelectionDestination = "today" | "calendar" | "habits";

export type VaultSelectionResult<View> = Readonly<{
  view: View;
  changed: boolean;
}>;

export type VaultSelectionActions<View> = Readonly<{
  isCurrent: () => boolean;
  currentDestination: () => VaultSelectionDestination;
  prepareForVaultSwitch: (view: View) => void;
  renderToday: (view: View) => void;
  renderWorkspaceContextStatus: () => void;
  openCalendar: () => Promise<void>;
  refreshHabits: () => Promise<void>;
}>;

export async function selectVaultAndRefresh<View>(
  invoke: () => Promise<VaultSelectionResult<View>>,
  actions: VaultSelectionActions<View>,
): Promise<"unchanged" | "changed" | "superseded"> {
  const result = await invoke();
  if (!actions.isCurrent()) {
    return "superseded";
  }
  if (!result.changed) {
    return "unchanged";
  }

  actions.prepareForVaultSwitch(result.view);
  actions.renderToday(result.view);
  actions.renderWorkspaceContextStatus();
  if (actions.currentDestination() === "calendar") {
    await actions.openCalendar();
  } else if (actions.currentDestination() === "habits") {
    await actions.refreshHabits();
  }
  return "changed";
}
