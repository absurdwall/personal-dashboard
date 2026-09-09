# Personal Dashboard 2.0 FINAL visual acceptance

This record separates rendered visual review from the packaged Accessibility
contract. AX success proves structure, text, focus, and action reachability; it
does not by itself prove typography, palette, spacing, or visual hierarchy.

## Reproduction

The frozen reference is the local `FINAL` prototype. Start it with `npm run
prototype:dashboard-2`, then capture each of these routes at 1180×820, 800×640,
and 640×520:

```text
?variant=FINAL&screen=today&date=2026-09-08&month=2026-09&phase=progress
?variant=FINAL&screen=calendar&month=2026-09&date=2026-09-08&phase=progress
?variant=FINAL&screen=habits&date=2026-09-08&phase=progress
```

Reference captures from the 2026-09-09 review are under the ignored local
directory `output/playwright/final-acceptance/`; they are generated evidence,
not product assets and are not committed.

Build the product with `npm run build:mac`. Launch a copied bundle with an
isolated `PERSONAL_DASHBOARD_DATA_DIR`, the same synthetic 2026-09-08 Daily
Record used by the `dashboard-2` scenario, the checked-in complete Habits
snapshot, and the scenario's fixed clock. Inspect the native window at wide,
800×640, and 640×520 sizes. Run the automated companion separately:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-2 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 \
scripts/acceptance/macos-ipc-workflow.sh
```

## 2026-09-09 comparison

| Dimension | Direct rendered observation |
| --- | --- |
| Typography and scale | The restrained system-text scale, serif reading emphasis, small uppercase kickers, tab labels, source metadata, forms, and expanded detail remain visually ordered at all three widths. Long English/Chinese strings wrap without overlapping controls. |
| Palette | White reading surfaces, quiet gray dividers and metadata, deep-green selection/actions, and distinct completion/conflict/record marks keep the FINAL semantic hierarchy. No state depends on color alone. |
| Spacing and reading width | Wide Calendar keeps month and selected-day summary side by side; Today keeps the timeline and update/evidence rail; Habits keeps summary and day-focused rows. At intermediate width the content remains readable without clipped primary actions. At narrow width each becomes one scrollable content column with full-width actions. |
| Expansion state | Morning plan basis exposes the complete fixture, including Options. Habits retains compact recent marks until a row/date is opened, then exposes the 12-week/detail content in place. |
| Complete content | Five morning blocks, the full plan basis, explicit facts, low-energy replan, unknown learning/reset evidence, evening account, 3/15 habit summary, exact-time versus threshold evidence, and sourced Exercise detail were all visible in the rebuilt package. |

Native title-bar treatment and prototype-only `FINAL · 合成演示` / developer
notices are not product requirements. The candidate intentionally still exposes
the 1.0 This Week, History, Settings/Profile, and compact destination selector;
ticket 07 owns their authorized retirement and must repeat installed visual
acceptance after removal. Their presence is not evidence that the 2.0 cutover
has occurred.
