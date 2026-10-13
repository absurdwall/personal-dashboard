# PDEX-26 frontend failure comparison — 2026-10-13

Final complete run: 510/538 passing; 28 failed, 0 skipped.
Exact pre-change-name matches: 15. Additional names: 13. Matching names do not turn failures into passes.

| Test file / exact name | Baseline name | Classification |
| --- | --- | --- |
| tests/frontend/collaboration-native-file-refresh.test.ts — opening Tasks during a Collaboration turn keeps the source watch and request target | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/collaboration-short-record.test.ts — a delayed canonical read preserves the explicitly selected record phase | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/daytime-rail-layout.test.ts — Daytime keeps the shared time axis in the reading column and notes below tasks in the rail | yes | legacy source/layout assertion; actual production checks retained separately |
| tests/frontend/docked-sidebars.test.ts — Today manual intent, axis/sidebar reading position and expanded details survive resize | no | changed-overview-pixel-assumption; independent reading-node regression repaired |
| tests/frontend/docked-sidebars.test.ts — Today quick schedule shows its current date and time within the existing row | yes | legacy source/layout assertion; actual production checks retained separately |
| tests/frontend/lived-day-rendering-regressions.test.ts — folded 06:00 and 06:50 point cards share reveal controls and retain source labels/anchors | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — folded end and clipped short ranges expose collisions without relabeling their times | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — expanding quiet hours recomputes stacks and exposes next-day entries | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — compiled Today long labels and complete multilingual content keep readable widths in the shipped WebKit layout | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — quiet-hour clicks keep the visible reading minute through independent expansion and collapse | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — shipped WebKit timeline keeps endpoint placement, reading anchors, reveal and detail state | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — closed edited Today draft retains its day, while untouched rows and other surfaces do not block rollover | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — explicit history remains selected and a stale clock from the previous Vault cannot pin the new Vault | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — focus/resume keeps an active Today editor across rollover and still refreshes when idle | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/lived-day-rendering-regressions.test.ts — pending Today and Task writes pin the old day even without an open editor | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/startup-interface-language.test.ts — persisted English startup refreshes existing axis controls and derived times without replacing interaction state | yes | baseline startup fixture null element |
| tests/frontend/task-surface.test.ts — Tasks keeps the accepted prototype hierarchy and defers heavy controls | yes | legacy source/layout assertion; actual production checks retained separately |
| tests/frontend/task-surface.test.ts — Calendar shows task previews and an editable shared task panel | no | legacy source/layout assertion; actual production checks retained separately |
| tests/frontend/today-time-axis.test.ts — time axis markup uses one full-width lane for arrangement and fact cards | yes | legacy source/layout assertion; actual production checks retained separately |
| tests/frontend/unified-today-axis.test.ts — plans, point Tasks and facts share a scale with separate clickable collision columns and full-width solitary cards | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — the Daytime axis scrolls independently and quiet-hour expansion preserves its reading position | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — existing quiet-hour entries are initially visible and a deliberate fold advertises their count and next-day date | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — Morning reads original baseline wording as a text document with an explicit source | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — Locate now targets the inner timeline viewport while preserving the surrounding page | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — dense collisions remain readable by scrolling the timeline horizontally instead of shrinking targets | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — temporary collision columns reuse space after an interval ends instead of adding a fixed column | no | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — after-midnight cards keep their date, title and source readable within their own collision target | yes | extracted-function fixture lacks production bindings or DOM methods |
| tests/frontend/unified-today-axis.test.ts — advancing the clock keeps plans, pending Tasks and confirmed facts distinct | no | extracted-function fixture lacks production bindings or DOM methods |

Full source-regex/extraction failures remain qualified; no broad unrelated product or fixture rewrite was made. Actual full-production application/DOM tests replace no native acceptance.

Exploratory browser: 44/55 passing, 11 failed. This run spans the159741b build and the laterb89a216 build; it is not frozen package evidence.

| Exact browser failure | Classification |
| --- | --- |
| sidebar keyboard activation and focus at 640px use the production UI without writes | calendar-summary-toggle absent already in918e7e0; retained obsolete selector |
| sidebar keyboard activation and focus at 1000px use the production UI without writes | calendar-summary-toggle absent already in918e7e0; retained obsolete selector |
| sidebar keyboard activation and focus at 1280px use the production UI without writes | calendar-summary-toggle absent already in918e7e0; retained obsolete selector |
| Tasks compact rows select one full detail while completion stays independent | pre-refinement visible-property/menu/lower-detail selector or obsolete20px checkbox expectation |
| selected detail edits one Task and preserves unmodified endpoints and identity | pre-refinement visible-property/menu/lower-detail selector or obsolete20px checkbox expectation |
| selected detail retains abandon, restore, delete and historical pagination | pre-refinement visible-property/menu/lower-detail selector or obsolete20px checkbox expectation |
| Today Task deep link opens selected identity even after a different Task list scope | pre-refinement visible-property/menu/lower-detail selector or obsolete20px checkbox expectation |
| selected detail freezes all edit controls until the submitted save finishes | pre-refinement visible-property/menu/lower-detail selector or obsolete20px checkbox expectation |
| production Task pointer moves preserve point/range semantics and explicit completion state | transient detached DOM handle during refresh; original suite failure retained; new production Task range/pointer regression passes |
| an ordinary Task card click still opens its existing details | old lower-details expectation; nearby production dialog regression passes |
| held pointer scrolls the inner axis and Escape removes its preview without a write | old scrollable default-scale expectation; actual Fine edge-scroll regression passes |

The obsolete Calendar toggle is absent in the918e7e0 HTML as well as current HTML. Task property panels/More and nearby Today dialogs are approved changes. Old edge-scroll probes assume a tall default scale; current Fine pointer tests prove scrolling/Escape. The detached-handle result stays a failed exploratory case, with current full-production Task range tests and root native matrix retaining the acceptance obligation.

[Machine results and log hashes](pdex-26-source-verification-2026-10-13.json) bind the exact failure names, source identities and retained logs.
