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

## 2026-09-09 candidate and result matrix

- Candidate commit: `2d051548fdeadf00e52b1247127c0842ee8d4638`.
- Rebuilt packaged executable SHA-256:
  `0eed6ef29378a025f01d5a4caa7c7ed1d3ce81c45c65b8f1b7ae86bb64cc3a5c`.
- Source: the current `src-tauri/target/release/bundle/macos/Personal
  Dashboard.app`, copied to an isolated temporary directory before launch.

The images below are ignored local evidence under
`output/playwright/final-acceptance/`. Before every capture, the native AX
driver set and asserted the app window size shown in the table. CUA preserves
800×640 and 640×520 captures pixel-for-pixel but normalizes a 1180×820 app
window to a 1106×768 stored image; the wide artifacts therefore show the
asserted 1180×820 layout at a reduced capture scale. Each row was directly
compared for font family/size, palette, spacing, reading hierarchy, wrapping,
expansion, and primary-action reachability; all nine passed. Hashes are full
SHA-256 values.

| Entry | App window / stored product pixels | FINAL reference | Packaged product | Result |
| --- | --- | --- | --- | --- |
| Today | 1180×820 / 1106×768 normalized capture | `reference-final-wide.png` · `adb82974c5def04641d673807bbcb40e420ae052034bafcae448fac989c86947` | `product-today-wide.png` · `822602f0cd5642ead666c7b58b0898f9998995748621b23c2222fe2e13396dd3` | PASS |
| Today | 800×640 | `reference-final-medium.png` · `fff8966d6822b7e4ac8981a41132bdc3071022e65f4d230e16a2b70f00e66a1d` | `product-today-medium.png` · `e2b4e1759c8aed90569883d7fff74310bcbad9f5033a97268b7e1136ca699894` | PASS |
| Today | 640×520 | `reference-final-narrow.png` · `72a5587a897ff78b97eb9f6a939fc2d30189d3967c45421512aa8f9348f91f9f` | `product-today-narrow.png` · `24f1a958e6f5a90c480c1378313645cc685f4ff09cd56157bda367b583b7b81c` | PASS |
| Calendar | 1180×820 / 1106×768 normalized capture | `reference-final-calendar-wide.png` · `8886be0ed20c4ab92a087843a2463e0c6714e837884a001f35adfe5be4f7b72f` | `product-calendar-wide.png` · `a6e42999f696804fd769b441ee16ae2ca0a80d17dce77d4004a5be40cba33fb2` | PASS |
| Calendar | 800×640 | `reference-final-calendar-medium.png` · `864ff88158cc8ef39790562c9f57892edf519e1286212afae5146a6e9b9b2aab` | `product-calendar-medium.png` · `00e778cb64bbef2a4f717e2880ec40cb1a669220dd003eddb635d0e10dc1d9ee` | PASS |
| Calendar | 640×520 | `reference-final-calendar-narrow.png` · `2d03eb816dc37e2e62679d6950165763004c3d1e7437428a2627500df877f24b` | `product-calendar-narrow.png` · `d732879e73c583c31fb26d4cef6e3b08fd68e2028436d4d2cb5fcf204610fb2e` | PASS |
| Habits | 1180×820 / 1106×768 normalized capture | `reference-final-habits-wide.png` · `707573c10154b4cf3d83a323606912604de9629a2919d2b4298241a7d7f0f48e` | `product-habits-wide.png` · `5feae99ee9e53c7d89588832e9b4180218914d6f7eb849d110aab1f237ac351f` | PASS |
| Habits | 800×640 | `reference-final-habits-medium.png` · `95179aae539d6ce10343e351aab855ebe0ec589ce34b0e8f23ff5f80e5350c08` | `product-habits-medium.png` · `7ab123b83af5e93fbd8a24f025a424ba5d5fdb77f2b022f122412acd129c6c76` | PASS |
| Habits | 640×520 | `reference-final-habits-narrow.png` · `c8ebf8b1573ee8f2a7cf41b99446469244363a1ae216e5af3837c461a8988e52` | `product-habits-narrow.png` · `cc9143ebfbd40a6b4d266586c93beda280eeae7b0228b6183a3f87b4337225d1` | PASS |

## Comparison notes

| Dimension | Direct rendered observation |
| --- | --- |
| Typography and scale | The restrained system-text scale, serif reading emphasis, small uppercase kickers, tab labels, source metadata, forms, and expanded detail remain visually ordered at all three widths. Long English/Chinese strings wrap without overlapping controls. |
| Palette | White reading surfaces, quiet gray dividers and metadata, deep-green selection/actions, and distinct completion/conflict/record marks keep the FINAL semantic hierarchy. No state depends on color alone. |
| Spacing and reading width | Wide Calendar keeps month and selected-day summary side by side; Today keeps the timeline and update/evidence rail; Habits keeps summary and day-focused rows. At intermediate width the content remains readable without clipped primary actions. At narrow width each becomes one scrollable content column with full-width actions. |
| Expansion state | Morning plan basis exposes the complete fixture, including Options. Habits retains compact recent marks until a row/date is opened, then exposes the 12-week/detail content in place. |
| Complete content | Five morning blocks, the full plan basis, explicit facts, low-energy replan, unknown learning/reset evidence, evening account, 3/15 habit summary, exact-time versus threshold evidence, and sourced Exercise detail were all visible in the rebuilt package. |

Native title-bar treatment and prototype-only `FINAL · 合成演示` / developer
notices are not product requirements.

## 2026-09-10 post-cutover repeat

The reviewed 2.0 executable from candidate `00bd65f` (SHA-256
`498c1d4252a8745e1ed1590d4e4a1bd302dd6e908d6d7d5a26562f168fec4a42`)
was relaunched against isolated synthetic app-data and vault roots. Today,
Calendar, and Habits were captured at all three required window sizes and
directly compared with the frozen FINAL references. Native Retina capture
stored the product windows at 2× pixels. AX checks independently confirmed the
expected entry and expanded-detail semantics. All nine rendered comparisons
passed for palette, typography, spacing, hierarchy, responsive behavior, and
action reachability.

| Entry | Window / stored pixels | Product SHA-256 | Result |
| --- | --- | --- | --- |
| Today | 1180×820 / 2360×1640 | `4f9bf27740061941ae50b9ec23b7af1b1b3da708a54122c895fe69889e0555a5` | PASS |
| Today | 800×640 / 1600×1280 | `d911c7656e341e308ab1968bbc737e709d588aaf274553b464fa59c5e1e82770` | PASS |
| Today | 640×520 / 1280×1040 | `5e66772885a202e91d362ea55fbea26d9f6617109cfadc12d76726bb25c5c38d` | PASS |
| Calendar | 1180×820 / 2360×1640 | `0f642f82567dbbfd97e36635578595667562119f4e74bff2541af84f393e7e6f` | PASS |
| Calendar | 800×640 / 1600×1280 | `a0eda178ce2a55ef1e50e8afb56fb1e6602495d0be1a295572d9dfc9e1498d4e` | PASS |
| Calendar | 640×520 / 1280×1040 | `2e5eb73af2e5010b305fb51e14a0aa0bc8296be3493fc8e695ea1fab5ffb04a9` | PASS |
| Habits | 1180×820 / 2360×1640 | `765bf35ddd9f36a5e2203a2f4bc468d95c2e3ff944d9d1727536c4d8a4fc167d` | PASS |
| Habits | 800×640 / 1600×1280 | `de2f09c67ebab8161b4c184a6a6cf792fe091f9e347612e4c6855e4ac8099071` | PASS |
| Habits | 640×520 / 1280×1040 | `34c1104d57de55cb8d9078439e818f2e6e48e5e00c61f2c7c59ce560bdd00381` | PASS |

The post-cutover UI exposes only Today, Calendar, and Habits; the retired 1.0
destinations are absent. This closes ticket 07's installed visual repeat while
keeping the rendered evidence separate from the packaged AX workflow.

## 2026-09-11 ticket 09 independent review — correction, not closure

The 2026-09-09 and 2026-09-10 tables above remain historical reports. This
section records a fresh paired inspection of the frozen FINAL prototype and the
rebuilt Mac candidate after ticket 08; it supersedes neither historical result
nor the prototype.

- Reviewed commit: `b8bf3808d4bdc86e68b8301acf9eb47b38aba0e1`.
- Packaged version/build: `2.0.0` / `2.0.0`.
- Packaged executable SHA-256:
  `ac19a7de661193fd74a33c6a374b1ff0b9c485dcc54405fbfc7f1f3445448c46`.
- Synthetic source: the dashboard-2 `2026-09-08` Daily Record plus the checked-in complete Habits snapshot, under a disposable acceptance directory. The frozen FINAL prototype was opened from the existing local server; no prototype file was changed.
- Fresh product captures: ignored local files named `ticket09-product-*.png` in this directory. Retina captures include native title-bar chrome; the asserted logical window sizes were 1180×820, 800×640, and 640×520.

| Page/state | Logical window | Frozen FINAL reference | Fresh packaged capture | Visual result |
| --- | --- | --- | --- | --- |
| Today / Daytime | 1180×820 | `reference-final-wide.png` | `ticket09-product-today-daytime-wide.png` · `d8de9e784c38a27423749444bd34605fde2f04e596e1524c3e492adb0c5d9120` | Shell, hierarchy, timeline and update rail restored; native chrome/banner differences accepted. |
| Today / Daytime | 800×640 | `reference-final-medium.png` | `ticket09-product-today-medium.png` · `36c0db16fa18119f9058345441ec5d2207ec564d82dc6fa8047216da0aea0076` | Unresolved icon-only sidebar departure. |
| Today / Daytime | 640×520 | `reference-final-narrow.png` | `ticket09-product-today-narrow.png` · `a9e47ef3bc538f783f6e07d7a402b338fd0bc3515edce0f5c292e70429001764` | Unresolved missing visible date/destination row. |
| Calendar / reviewed 2026-09-08 | 1180×820 | `reference-final-calendar-wide.png` | `ticket09-product-calendar-wide.png` · `d8872e97d7b7af67555b9d79c2fced00f60e65793631902edd4b0d4bff512b8b` | Grid and selected-day reading are present; production status text/card differs from FINAL. |
| Calendar / reviewed 2026-09-08 | 800×640 | `reference-final-calendar-medium.png` | `ticket09-product-calendar-medium.png` · `4323e49a468c072c0bafc343eed2774e13f5560e2dc64eb81c96bd77cd43ea5a` | Same confirmed status/card departure plus icon-only sidebar. |
| Calendar / reviewed 2026-09-08 | 640×520 | `reference-final-calendar-narrow.png` | `ticket09-product-calendar-narrow.png` · `f12dcb5ab8cde98cf2ab1c9c50b02728baa24c1e4845697e66e3f1bb2a00489c` | Unresolved navigation row and summary-before-month ordering. |
| Habits / default snapshot | 1180×820 | `reference-final-habits-wide.png` | `ticket09-product-habits-wide.png` · `b2cf731d4a652ee0a81dd5b984f4022b50ab6b0c669f876e02448cd450aa8305` | Snapshot and two-column reading restored; header metric/hierarchy differs from FINAL. |
| Habits / default snapshot | 800×640 | `reference-final-habits-medium.png` | `ticket09-product-habits-medium.png` · `6fe3ad588f26d624ca2567efc2a116c1d513d1a200276efc4eef59800661044c` | Same header departure plus icon-only sidebar. |
| Habits / default snapshot | 640×520 | `reference-final-habits-narrow.png` | `ticket09-product-habits-narrow.png` · `e04eaafec08a0ba5073d554a66e045ca85acfa56ddf6ff714c167747a5adc003` | Single-column content remains readable, but navigation row and header hierarchy depart from FINAL. |

### Paired deviation ledger

Restored/confirmed: the shared toolbar, Today/Calendar/Habits destinations,
Today's three phase projections and update rail, Calendar's month grid and
selected-day summary, and Habits' sourced snapshot/recent marks/expanded detail
are present. The fresh packaged AX companion independently passed the complete
dashboard-2 synthetic matrix, including Morning, Daytime, Evening, Evening
bottom-surface scrolling, Calendar selection, Habits expansion, and all three
logical sizes.

Explicitly accepted: native macOS title-bar chrome, production `本地` in place
of prototype `本地原型`, and the prototype-only FINAL synthetic-data notice.
These do not silently approve other layout differences.

Unresolved confirmed departures: the 68px icon-only 800px sidebar; the missing
visible 640px context/destination row; Calendar's production-only status copy,
rounded summary card, and narrow summary ordering; and Habits' missing FINAL
header metric plus stronger sourced-snapshot/week heading hierarchy.

Not checked in this review: fresh visual captures for Calendar unreviewed/empty
states and Habits edit/correction states. The existing legacy `calendar` and
`habits` shell scenarios still start by waiting for retired `Log workout now`,
so they are not fresh pass evidence for this candidate.

### Separate non-visual evidence

- `npm run build` — passed.
- `npm run test:frontend` — 7 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed, including unit, workflow, and doc-test suites.
- `npm run build:mac` — passed and produced the reviewed bundle/hash above.
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-2 PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 caffeinate -is scripts/acceptance/macos-ipc-workflow.sh` — passed in an isolated synthetic directory; source Daily Record and Habits snapshot hashes remained unchanged.
- No real-data observation or write was performed; no producer, Dida365, automation, or cutover action was used.

Conclusion: the visual review is recorded, but ticket 09 remains `ready-for-human`
and overall 2.0 visual acceptance remains open until the unresolved departures
are repaired or explicitly accepted and the not-checked states receive fresh
evidence.
