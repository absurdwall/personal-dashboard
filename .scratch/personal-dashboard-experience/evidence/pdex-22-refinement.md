# PDEX-22 — Calendar implementation and scoped checks · 2026-10-13

Status: implementation complete locally; integration review and packaged acceptance pending.

Ticket: [PDEX-22](../issues/22-calendar-create-details-holidays.md).
Spec: [PDEX-SPEC-02](../refinement-spec-2026-10-11.md), section 10, shared preservation/saving rules, stories 61–67.
Working branch: `codex/pdex-22-refinement`.
Integration: `codex/dashboard-experience-refinement-integration`.
Authorized specification snapshot: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
Actual worker starting tip: `b96b77d74a84309615ab57fdc28055c9ef54b9a3`, verified against the integration merge base before changes.
Task prerequisites: `dc5b09cd5a8ce6d4c45664bc3d610f6b614492e7`.
Implementation: `c65106d9439d02383eefdca9149f5e02d6500315`.
Integration synchronization: `943151a72656187021313dd3814f19a763095c71`, including Task schedule submission repair `7e96b0832fa65884dbf67665e81d4123081930bf`.
Additional uncovered-year DOM verification: resolve the commit with subject `Verify Calendar uncovered-year presentation retains Task controls` on this branch.

## Behavior and reuse

- Calendar keeps its equal-height compact month, previous/next month and year/month selection, original record markers, right selected-day review and Open full Today, and lower selected-day Tasks/history. The replaced creation form lives only in a closed-on-demand dialog; no bottom creation form remains.
- The top plus opens a new Task draft with the selected date, editable date/list/content and name focus. It uses the same Task application and `create_task` IPC. There is no Daily Record creation route.
- Creation now uses the existing `TaskCreateAttempt`, `submitTaskCreation`, `taskCreateAttemptMatches`, `recheckTaskCreation` and explicit original-attempt ending. The `calendar` origin and prefixed calendar draft key separate it from Today. Uncertain submission freezes its original draft/identity until authoritative readback permits an exact retry; a different object at that ID is a conflict.
- Month Task previews support pointer/Enter/Space opening without selecting the surrounding date. Lower Task titles/details open the same editable dialog. Calendar extracts the existing `taskEditor(..., "calendar", ..., true)` form; it does not copy the editor or establish another save model.
- Content starts focused, the editable title occurs once, and the shared compact properties, interval, priority/tag fields and history remain. Closing/saving preserves the selected date and outer/summary scroll position. Failure leaves the dialog draft and visible error. Initial displayed revisions remain bound through the existing draft mechanism.
- Tag-definition changes refresh the dialog's shared property controls from the retained draft, so a newly selected tag survives the later Task Save. The refresh is limited to changed tag definitions, avoiding replacing ordinary drafts on unrelated source refresh.
- Calendar holiday display choices extend the existing app-local AppearanceDocument/Application, defaulting old files to enabled China and US annotations. Accent/background operations preserve these choices. There is no new preference file, Vault directory, dependency or runtime holiday service.
- Holiday text uses spare cell space after calculating the existing Task preview capacity. It never reduces that capacity or increases cell height. Dense cells retain complete holiday names in the date tooltip/accessibility label. Labels truncate on one line when visible. The on-demand controls expose total/region switches, official sources and covered/unavailable years.

Downstream seams: `openCalendarTaskDetails`, `updateCalendarTaskCreationControls`, `taskCreationContext("calendar")`, `recheckTaskCreation("calendar")`, `createCalendarTask(retry)`, existing Task editor/application methods, `AppearanceApplication::set_calendar_holidays` and its `set_calendar_holidays` IPC. The existing shared renderer repair is inherited through the integration merge.

## Official source and coverage decisions

Verified on 2026-10-13 using root's source notes/rendered annual HKO tables and live primary-source checks:

- [PRC festival definition](https://app.www.gov.cn/govdata/gov/202411/12/521605/article.html) provides national festival identities. Annotations use festival dates, including Lunar New Year Eve, rather than multi-day holiday ranges or adjusted workdays.
- [HKO 2026 annual calendar](https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2026e.pdf): Lunar New Year February 17, Dragon Boat June 19, Mid-Autumn September 25, Qingming April 5.
- [HKO 2027 annual calendar](https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf): Lunar New Year February 6, Dragon Boat June 9, Mid-Autumn September 15, Qingming April 5. Eve is the preceding calendar date. Gregorian New Year, Labour Day and National Day use January 1, May 1 and October 1.
- [US OPM federal holiday schedules](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/): actual dates plus explicitly named observed dates. In 2026 Independence Day is observed July 3. In 2027 Juneteenth, Independence Day and Christmas are observed June 18, July 5 and December 24 respectively. Actual June 19/July 4/December 25 annotations remain distinct.
- The same OPM page's 2028 schedule verifies New Year 2028 observed on Friday December 31, 2027. This explicitly named boundary annotation belongs to Gregorian 2027 coverage; the product still does not supply Gregorian 2028 holiday dates.

Coverage is exactly Gregorian 2026–2027. Out-of-coverage years have an explicit unavailable message and no fabricated annual holiday list. Sources/region/date/observed flags accompany the bundled data. No lunar conversion engine, solar-term surface, reminder, Task, Daily Record or working-day classification is introduced.

## Red → green and validation

Confirmed seams remain application operations with real serialization/readback, plus production HTML/compiled TypeScript/CSS in actual macOS WebKit. External IPC responses in controller tests are synthetic system-boundary fixtures; they are not offered as proof of native persistence.

- Preference tracer first failed on the absent CalendarHolidayPreferences/application setter, then passed old-file defaults, write, fresh file readback and accent-change preservation.
- Date-catalogue tracer first failed on the absent module; actual-vs-observed, shared-date regions and coverage checks then passed. The December 2027 boundary first lacked an annotation, then passed after its OPM source was verified.
- Top-plus tracer first lacked the entry/dialog, then passed selected-date defaults/name focus/no bottom form.
- Create and uncertain-result checks first exposed missing dialog completion/frozen recovery, then passed the reused original-attempt engine and exact retry identity.
- Task-preview tracer first opened no editable overlay and could bubble into date selection, then passed the bounded dialog route and propagation handling.
- A tag-definition tracer first exposed stale dialog controls losing the newly selected tag, then passed the limited property refresh while preserving content.
- Existing month/summary/markers/overflow tests were adapted only where the authorized bottom-form replacement changed their creation-control expectations. They now check retained lower Task detail controls while the new creation dialog is closed. Existing Task sources and their true availability/interval fixtures remain.
- Native fixture setup initially omitted the required empty `life/Journal/Daily` directory, causing an unbound synthetic Vault. Fixing the fixture allowed actual Task creation/reopen/update/readback without producing a Daily Record file; this setup error is distinct from a feature failure.

Commands/results after integration synchronization:

1. `npm run build`: passed using the existing canonical node_modules through an ignored symlink; no installation/dependency change.
2. `node --test tests/frontend/compact-calendar.test.ts tests/frontend/calendar-holidays.test.ts tests/frontend/appearance.test.ts`: 40/40 passed. Includes five/six-week month preservation, 1280×720 / 830×758 / 680×560 dialog containment and real hit tests, selected date/month/background preservation, draft/error/retry behavior, existing metadata/intervals, tag-control refresh, spare holiday space, source/coverage and appearance serialization queue behavior.
3. Additional production-DOM uncovered-year check: 1/1 passed at Gregorian 2028, with no holiday text, retained seven selected-day Tasks, enabled Open full Today and four source links. This is an additional test-only commit after the 40-test run.
4. `CARGO_TARGET_DIR=<canonical src-tauri/target> cargo test --manifest-path src-tauri/Cargo.toml --test calendar_workflow --test appearance_workflow`: 20/20 passed (Calendar 9, Appearance 11). Actual application + file-backed Task save/reopen/date change/Calendar and Today identity projection/no Diary creation; file-backed display preference write/fresh readback/default compatibility; retained existing source/appearance checks.
5. `git diff --check`: passed.

Logs retained outside the checkout: `/tmp/pdex22-integrated-dom.log`, `/tmp/pdex22-integrated-application.log`; root may retain them with the final integration evidence. No personal Vault/model/runtime traffic was used for layout validation.

The integration merge had one import conflict: Calendar holidays and Habit settings each inserted their module import at the beginning of main.ts. Both imports were retained; no conflicting product behavior was chosen or invented.

## Pending acceptance

- Independent integration review and combined ticket checks, including later parent/folder contracts.
- A source-bound packaged synthetic-profile Calendar run: actual pointer opening, creation/edit Save, fresh Task/date readback, restart, and preference reopening through real Tauri IPC.
- Actual installed/baseline-region comparison and any required user acceptance.

The earlier source-specific PDEX-23 package is not evidence for PDEX-22. No normal App installation, main merge, remote Git operation, issue/spec closure, model call or new dependency was performed.
