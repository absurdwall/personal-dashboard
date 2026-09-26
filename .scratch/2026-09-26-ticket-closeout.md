# Personal Dashboard — 2026-09-26 本地票据收尾核对

用户要求核对全部本地 tickets、补齐过期状态，关闭不再继续的旧范围，从 main 的干净基线进入下一轮。本次为文档／状态审计，不是重新验收所有功能。

## 结果

共 106 张 canonical issues：{'resolved': 98, 'wontfix': 8}；活动未结票为 0。92 张原已 resolved 保留，14 张旧状态按下表处理。历史规格中的设计准备状态、旧 Comments 和未通过测试记录保留；它们不是新的执行票。3.0.2 grilling 和未来 AI 方向仍是草案，不在本次旧票关闭范围。

## 本次状态变更与依据

| Ticket | 原状态 | 现状态 | 依据 |
|---|---|---|---|
| [.scratch/personal-dashboard-mac-workspace/issues/08-record-any-workout-in-contextual-pane.md](personal-dashboard-mac-workspace/issues/08-record-any-workout-in-contextual-pane.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/09-review-and-correct-historical-weeks.md](personal-dashboard-mac-workspace/issues/09-review-and-correct-historical-weeks.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/10-adjust-this-week-or-repeating-routine-in-context.md](personal-dashboard-mac-workspace/issues/10-adjust-this-week-or-repeating-routine-in-context.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/11-manage-profile-and-authority-under-profile-data.md](personal-dashboard-mac-workspace/issues/11-manage-profile-and-authority-under-profile-data.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/12-inspect-reminder-readiness-under-notifications.md](personal-dashboard-mac-workspace/issues/12-inspect-reminder-readiness-under-notifications.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/13-preserve-every-workflow-in-compact-window.md](personal-dashboard-mac-workspace/issues/13-preserve-every-workflow-in-compact-window.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace/issues/14-prove-accessible-production-mac-workspace.md](personal-dashboard-mac-workspace/issues/14-prove-accessible-production-mac-workspace.md) | ready-for-agent | wontfix | 关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/06-responsive-sheet-and-accessibility.md](personal-dashboard-mac-workspace-v2-production/issues/06-responsive-sheet-and-accessibility.md) | claimed | resolved | 后续命名空间已完成本票交付范围：见 ../../personal-dashboard-mac-workspace-v2-parity-closure/issues/03-integrated-responsive-and-accessibility-parity.md、04-final-packaged-v2-parity-gate.md，以及 ../../personal-dashboard-mac-workspace-v2-review-fixes/map.md。后续 gate 已记录真实 packaged 响应式、键盘、History／Settings、周结束与重启证据；本票早期锁屏阻塞不再是当前阻塞。以被后续交付承接的历史票收尾，不声称旧候选的失败运行变成通过。 |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/07-persistence-history-settings-and-boundaries.md](personal-dashboard-mac-workspace-v2-production/issues/07-persistence-history-settings-and-boundaries.md) | claimed | resolved | 后续命名空间已完成本票交付范围：见 ../../personal-dashboard-mac-workspace-v2-parity-closure/issues/03-integrated-responsive-and-accessibility-parity.md、04-final-packaged-v2-parity-gate.md，以及 ../../personal-dashboard-mac-workspace-v2-review-fixes/map.md。后续 gate 已记录真实 packaged 响应式、键盘、History／Settings、周结束与重启证据；本票早期锁屏阻塞不再是当前阻塞。以被后续交付承接的历史票收尾，不声称旧候选的失败运行变成通过。 |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/08-packaged-v2-parity-gate.md](personal-dashboard-mac-workspace-v2-production/issues/08-packaged-v2-parity-gate.md) | claimed | resolved | 后续命名空间已完成本票交付范围：见 ../../personal-dashboard-mac-workspace-v2-parity-closure/issues/03-integrated-responsive-and-accessibility-parity.md、04-final-packaged-v2-parity-gate.md，以及 ../../personal-dashboard-mac-workspace-v2-review-fixes/map.md。后续 gate 已记录真实 packaged 响应式、键盘、History／Settings、周结束与重启证据；本票早期锁屏阻塞不再是当前阻塞。以被后续交付承接的历史票收尾，不声称旧候选的失败运行变成通过。 |
| [.scratch/personal-dashboard-timeline-a-repair/issues/01-restore-readable-a-cards.md](personal-dashboard-timeline-a-repair/issues/01-restore-readable-a-cards.md) | claimed | resolved | 本票卡片可读性修复已随 PR #4（45c2780）进入 main。map 和 ticket 02 记录用户于 2026-09-23 改选并认可单列叠放方案、正式 App 安装及 r8 packaged／独立视觉证据。双栏是被用户后续选择替代的旧设计，不应继续要求一轮独立双栏验收。结合用户 2026-09-26 本次关闭旧票、从干净基线开始的指示，补记 resolved；不声称对原双栏候选作了新的验收。3.0.2 新布局问题属于后续规划。 |
| [.scratch/personal-dashboard-usage-feedback/issues/01-historical-habit-records.md](personal-dashboard-usage-feedback/issues/01-historical-habit-records.md) | needs-triage | resolved | 原始反馈已完成分诊并由 ../../personal-dashboard-habit-history-timeline/map.md 的两张实现票交付，PR #4 已合入 main；时间轴的后续可读性修复与认可方案见 ../../personal-dashboard-timeline-a-repair/map.md。源反馈不再重复保留 needs-triage；当时原型确认、实现前描述作为历史保留。 |
| [.scratch/personal-dashboard-usage-feedback/issues/02-today-time-axis.md](personal-dashboard-usage-feedback/issues/02-today-time-axis.md) | needs-triage | resolved | 原始反馈已完成分诊并由 ../../personal-dashboard-habit-history-timeline/map.md 的两张实现票交付，PR #4 已合入 main；时间轴的后续可读性修复与认可方案见 ../../personal-dashboard-timeline-a-repair/map.md。源反馈不再重复保留 needs-triage；当时原型确认、实现前描述作为历史保留。 |
| [.scratch/personal-dashboard-4/issues/09-packaged-acceptance.md](personal-dashboard-4/issues/09-packaged-acceptance.md) | ready-for-human | wontfix | 本地 packaged 交付已完成，相关实现已随 PR #1 合并并安装。唯一未满足项是 Tasks／Habit 配置变化后的专用真实 Google Drive 客户端 fixture 验收，现无新增证据。本次按用户“未解决且不再打算执行的旧票也应收尾”的指示，将这张整体票剩余验收范围关闭为 wontfix；保留未勾选 Drive 项，不声称云端同步已通过，也不把它转成新待办。今后若要承诺该兼容性，应重新明确范围并取证。 |

## 基线与限制

核对起点 main 与 origin/main 同为 13affcd，唯一工作目录为 canonical personal-dashboard；GitHub open PR 为 0，#1/#3/#4 已合并，#2 已关闭未合并。此次只提交本审计拥有的文档，不新增 branch/worktree，不替换 App、不写用户数据。提交推送后再核对实际 Git 状态。

未运行新的 Drive fixture 验收；旧 Exercise UI 已退役；归档与既有验收材料不删除。完整前端此前存在外部 daily-flow 技能标题契约失败，本次没有重跑或声称修复。Management 的摘要只对已注册来源声明完整覆盖，全部本地 106 票的额外盘点以本文为证据。

## 全量 ticket 索引

| Ticket | 当前状态 |
|---|---|
| [.scratch/exercise-habit-tracker/issues/01-local-dashboard-reminder-foundation.md](exercise-habit-tracker/issues/01-local-dashboard-reminder-foundation.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/02-departure-response-follow-up.md](exercise-habit-tracker/issues/02-departure-response-follow-up.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/03-four-tap-workout-record.md](exercise-habit-tracker/issues/03-four-tap-workout-record.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/04-fallback-recovery-and-skip.md](exercise-habit-tracker/issues/04-fallback-recovery-and-skip.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/05-weekly-goal-and-unscheduled-workouts.md](exercise-habit-tracker/issues/05-weekly-goal-and-unscheduled-workouts.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/06-week-rollover-and-missed-slots.md](exercise-habit-tracker/issues/06-week-rollover-and-missed-slots.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/07-schedule-exceptions-and-routine-changes.md](exercise-habit-tracker/issues/07-schedule-exceptions-and-routine-changes.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/08-editable-workout-history.md](exercise-habit-tracker/issues/08-editable-workout-history.md) | resolved |
| [.scratch/exercise-habit-tracker/issues/09-local-backup-and-restore.md](exercise-habit-tracker/issues/09-local-backup-and-restore.md) | resolved |
| [.scratch/personal-dashboard-2/issues/01-preserve-baseline-and-current-plan.md](personal-dashboard-2/issues/01-preserve-baseline-and-current-plan.md) | resolved |
| [.scratch/personal-dashboard-2/issues/02-calendar-date-reading.md](personal-dashboard-2/issues/02-calendar-date-reading.md) | resolved |
| [.scratch/personal-dashboard-2/issues/03-dated-notes-and-corrections.md](personal-dashboard-2/issues/03-dated-notes-and-corrections.md) | resolved |
| [.scratch/personal-dashboard-2/issues/04-habits-snapshot-view.md](personal-dashboard-2/issues/04-habits-snapshot-view.md) | resolved |
| [.scratch/personal-dashboard-2/issues/05-exercise-note-entry.md](personal-dashboard-2/issues/05-exercise-note-entry.md) | resolved |
| [.scratch/personal-dashboard-2/issues/06-final-packaged-acceptance.md](personal-dashboard-2/issues/06-final-packaged-acceptance.md) | resolved |
| [.scratch/personal-dashboard-2/issues/07-cutover-and-retire-exercise.md](personal-dashboard-2/issues/07-cutover-and-retire-exercise.md) | resolved |
| [.scratch/personal-dashboard-2/issues/08-restore-final-presentation.md](personal-dashboard-2/issues/08-restore-final-presentation.md) | resolved |
| [.scratch/personal-dashboard-2/issues/09-review-final-parity-and-close.md](personal-dashboard-2/issues/09-review-final-parity-and-close.md) | resolved |
| [.scratch/personal-dashboard-2/issues/10-vault-recovery-and-review-closure.md](personal-dashboard-2/issues/10-vault-recovery-and-review-closure.md) | resolved |
| [.scratch/personal-dashboard-3/issues/01-settings-vault-colors.md](personal-dashboard-3/issues/01-settings-vault-colors.md) | resolved |
| [.scratch/personal-dashboard-3/issues/02-interface-language.md](personal-dashboard-3/issues/02-interface-language.md) | resolved |
| [.scratch/personal-dashboard-3/issues/03-background-image.md](personal-dashboard-3/issues/03-background-image.md) | resolved |
| [.scratch/personal-dashboard-3/issues/04-day-tasks.md](personal-dashboard-3/issues/04-day-tasks.md) | resolved |
| [.scratch/personal-dashboard-3/issues/05-planning-task-merge.md](personal-dashboard-3/issues/05-planning-task-merge.md) | resolved |
| [.scratch/personal-dashboard-3/issues/06-local-habit-completion.md](personal-dashboard-3/issues/06-local-habit-completion.md) | resolved |
| [.scratch/personal-dashboard-3/issues/07-historical-corrections.md](personal-dashboard-3/issues/07-historical-corrections.md) | resolved |
| [.scratch/personal-dashboard-3/issues/08-drive-compatibility.md](personal-dashboard-3/issues/08-drive-compatibility.md) | resolved |
| [.scratch/personal-dashboard-3/issues/09-packaged-acceptance.md](personal-dashboard-3/issues/09-packaged-acceptance.md) | resolved |
| [.scratch/personal-dashboard-3-0-1/issues/01-habit-english-and-theme-consistency.md](personal-dashboard-3-0-1/issues/01-habit-english-and-theme-consistency.md) | resolved |
| [.scratch/personal-dashboard-4/issues/01-persistent-task-inbox.md](personal-dashboard-4/issues/01-persistent-task-inbox.md) | resolved |
| [.scratch/personal-dashboard-4/issues/02-task-state-history.md](personal-dashboard-4/issues/02-task-state-history.md) | resolved |
| [.scratch/personal-dashboard-4/issues/03-task-lists-archive.md](personal-dashboard-4/issues/03-task-lists-archive.md) | resolved |
| [.scratch/personal-dashboard-4/issues/04-today-shared-tasks.md](personal-dashboard-4/issues/04-today-shared-tasks.md) | resolved |
| [.scratch/personal-dashboard-4/issues/05-calendar-task-panel.md](personal-dashboard-4/issues/05-calendar-task-panel.md) | resolved |
| [.scratch/personal-dashboard-4/issues/06-habit-localized-names.md](personal-dashboard-4/issues/06-habit-localized-names.md) | resolved |
| [.scratch/personal-dashboard-4/issues/07-external-task-adapter.md](personal-dashboard-4/issues/07-external-task-adapter.md) | resolved |
| [.scratch/personal-dashboard-4/issues/08-daily-flow-integration.md](personal-dashboard-4/issues/08-daily-flow-integration.md) | resolved |
| [.scratch/personal-dashboard-4/issues/09-packaged-acceptance.md](personal-dashboard-4/issues/09-packaged-acceptance.md) | wontfix |
| [.scratch/personal-dashboard-4/issues/10-prototype-visual-parity.md](personal-dashboard-4/issues/10-prototype-visual-parity.md) | resolved |
| [.scratch/personal-dashboard-4/issues/11-review-follow-up.md](personal-dashboard-4/issues/11-review-follow-up.md) | resolved |
| [.scratch/personal-dashboard-habit-history-timeline/issues/01-historical-habit-corrections.md](personal-dashboard-habit-history-timeline/issues/01-historical-habit-corrections.md) | resolved |
| [.scratch/personal-dashboard-habit-history-timeline/issues/02-continuous-today-timeline.md](personal-dashboard-habit-history-timeline/issues/02-continuous-today-timeline.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/01-reconcile-schedule-reminders-after-interruption.md](personal-dashboard-mac-workspace/issues/01-reconcile-schedule-reminders-after-interruption.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/02-make-confirmed-profile-restore-recoverable.md](personal-dashboard-mac-workspace/issues/02-make-confirmed-profile-restore-recoverable.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/03-preserve-profile-meaning-across-time-zones.md](personal-dashboard-mac-workspace/issues/03-preserve-profile-meaning-across-time-zones.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/04-drive-packaged-mac-app-through-real-tauri-ipc.md](personal-dashboard-mac-workspace/issues/04-drive-packaged-mac-app-through-real-tauri-ipc.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/05-replace-scrolling-document-with-mac-workspace-navigation.md](personal-dashboard-mac-workspace/issues/05-replace-scrolling-document-with-mac-workspace-navigation.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/06-present-this-week-as-chronological-agenda.md](personal-dashboard-mac-workspace/issues/06-present-this-week-as-chronological-agenda.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/07-respond-to-pending-departure-without-losing-context.md](personal-dashboard-mac-workspace/issues/07-respond-to-pending-departure-without-losing-context.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace/issues/08-record-any-workout-in-contextual-pane.md](personal-dashboard-mac-workspace/issues/08-record-any-workout-in-contextual-pane.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/09-review-and-correct-historical-weeks.md](personal-dashboard-mac-workspace/issues/09-review-and-correct-historical-weeks.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/10-adjust-this-week-or-repeating-routine-in-context.md](personal-dashboard-mac-workspace/issues/10-adjust-this-week-or-repeating-routine-in-context.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/11-manage-profile-and-authority-under-profile-data.md](personal-dashboard-mac-workspace/issues/11-manage-profile-and-authority-under-profile-data.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/12-inspect-reminder-readiness-under-notifications.md](personal-dashboard-mac-workspace/issues/12-inspect-reminder-readiness-under-notifications.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/13-preserve-every-workflow-in-compact-window.md](personal-dashboard-mac-workspace/issues/13-preserve-every-workflow-in-compact-window.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace/issues/14-prove-accessible-production-mac-workspace.md](personal-dashboard-mac-workspace/issues/14-prove-accessible-production-mac-workspace.md) | wontfix |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/01-directly-record-planned-workout.md](personal-dashboard-mac-workspace-v2/issues/01-directly-record-planned-workout.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/02-list-first-this-week-temporary-sheet.md](personal-dashboard-mac-workspace-v2/issues/02-list-first-this-week-temporary-sheet.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/03-record-selected-and-unscheduled-workouts.md](personal-dashboard-mac-workspace-v2/issues/03-record-selected-and-unscheduled-workouts.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/04-change-time-and-skip-exceptions.md](personal-dashboard-mac-workspace-v2/issues/04-change-time-and-skip-exceptions.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/05-responsive-navigation-and-compact-flow.md](personal-dashboard-mac-workspace-v2/issues/05-responsive-navigation-and-compact-flow.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/06-packaged-this-week-acceptance-gate.md](personal-dashboard-mac-workspace-v2/issues/06-packaged-this-week-acceptance-gate.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/07-reconcile-issue-tracker-status-vocabulary.md](personal-dashboard-mac-workspace-v2/issues/07-reconcile-issue-tracker-status-vocabulary.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/08-route-default-prototype-to-v2.md](personal-dashboard-mac-workspace-v2/issues/08-route-default-prototype-to-v2.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/09-add-independent-unscheduled-entry.md](personal-dashboard-mac-workspace-v2/issues/09-add-independent-unscheduled-entry.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/10-hide-exception-actions-for-future-rows.md](personal-dashboard-mac-workspace-v2/issues/10-hide-exception-actions-for-future-rows.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/11-restore-exact-workout-recording-controls.md](personal-dashboard-mac-workspace-v2/issues/11-restore-exact-workout-recording-controls.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/12-materialize-moved-destination-row.md](personal-dashboard-mac-workspace-v2/issues/12-materialize-moved-destination-row.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2/issues/13-make-v2-destinations-reachable.md](personal-dashboard-mac-workspace-v2/issues/13-make-v2-destinations-reachable.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-parity-closure/issues/01-v2-a-visual-parity-and-default-workspace.md](personal-dashboard-mac-workspace-v2-parity-closure/issues/01-v2-a-visual-parity-and-default-workspace.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-parity-closure/issues/02-day-first-change-time-picker.md](personal-dashboard-mac-workspace-v2-parity-closure/issues/02-day-first-change-time-picker.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-parity-closure/issues/03-integrated-responsive-and-accessibility-parity.md](personal-dashboard-mac-workspace-v2-parity-closure/issues/03-integrated-responsive-and-accessibility-parity.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-parity-closure/issues/04-final-packaged-v2-parity-gate.md](personal-dashboard-mac-workspace-v2-parity-closure/issues/04-final-packaged-v2-parity-gate.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/01-production-gap-matrix.md](personal-dashboard-mac-workspace-v2-production/issues/01-production-gap-matrix.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/02-production-shell-and-this-week.md](personal-dashboard-mac-workspace-v2-production/issues/02-production-shell-and-this-week.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/03-direct-recording-and-state-semantics.md](personal-dashboard-mac-workspace-v2-production/issues/03-direct-recording-and-state-semantics.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/04-unscheduled-workout-and-progress.md](personal-dashboard-mac-workspace-v2-production/issues/04-unscheduled-workout-and-progress.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/05-change-time-skip-and-moved-occurrence.md](personal-dashboard-mac-workspace-v2-production/issues/05-change-time-skip-and-moved-occurrence.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/06-responsive-sheet-and-accessibility.md](personal-dashboard-mac-workspace-v2-production/issues/06-responsive-sheet-and-accessibility.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/07-persistence-history-settings-and-boundaries.md](personal-dashboard-mac-workspace-v2-production/issues/07-persistence-history-settings-and-boundaries.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-production/issues/08-packaged-v2-parity-gate.md](personal-dashboard-mac-workspace-v2-production/issues/08-packaged-v2-parity-gate.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-review-fixes/issues/01-close-parity-review-findings.md](personal-dashboard-mac-workspace-v2-review-fixes/issues/01-close-parity-review-findings.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-review-fixes/issues/02-final-review-closure.md](personal-dashboard-mac-workspace-v2-review-fixes/issues/02-final-review-closure.md) | resolved |
| [.scratch/personal-dashboard-mac-workspace-v2-review-fixes/issues/03-supervise-packaged-app-cleanup.md](personal-dashboard-mac-workspace-v2-review-fixes/issues/03-supervise-packaged-app-cleanup.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/01-preserve-completed-baseline.md](personal-dashboard-platform-migration/issues/01-preserve-completed-baseline.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/02-launch-personal-dashboard-mac-app.md](personal-dashboard-platform-migration/issues/02-launch-personal-dashboard-mac-app.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/03-persist-exchange-minimal-mac-profile.md](personal-dashboard-platform-migration/issues/03-persist-exchange-minimal-mac-profile.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/04-notify-with-mac-window-closed.md](personal-dashboard-platform-migration/issues/04-notify-with-mac-window-closed.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/05-install-minimal-ipad-shell.md](personal-dashboard-platform-migration/issues/05-install-minimal-ipad-shell.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/06-install-minimal-samsung-shell.md](personal-dashboard-platform-migration/issues/06-install-minimal-samsung-shell.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/07-show-exercise-week-first-reminder.md](personal-dashboard-platform-migration/issues/07-show-exercise-week-first-reminder.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/08-respond-or-receive-follow-up.md](personal-dashboard-platform-migration/issues/08-respond-or-receive-follow-up.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/09-record-workout-established-flow.md](personal-dashboard-platform-migration/issues/09-record-workout-established-flow.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/10-recover-or-skip-workout.md](personal-dashboard-platform-migration/issues/10-recover-or-skip-workout.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/11-complete-weekly-goal.md](personal-dashboard-platform-migration/issues/11-complete-weekly-goal.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/12-close-week-repeat-routine.md](personal-dashboard-platform-migration/issues/12-close-week-repeat-routine.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/13-adjust-week-or-routine.md](personal-dashboard-platform-migration/issues/13-adjust-week-or-routine.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/14-review-correct-delete-history.md](personal-dashboard-platform-migration/issues/14-review-correct-delete-history.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/15-back-up-restore-profile.md](personal-dashboard-platform-migration/issues/15-back-up-restore-profile.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/16-move-authoritative-profile.md](personal-dashboard-platform-migration/issues/16-move-authoritative-profile.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/17-migrate-completed-mac-profile.md](personal-dashboard-platform-migration/issues/17-migrate-completed-mac-profile.md) | resolved |
| [.scratch/personal-dashboard-platform-migration/issues/18-cut-over-tauri-only.md](personal-dashboard-platform-migration/issues/18-cut-over-tauri-only.md) | resolved |
| [.scratch/personal-dashboard-timeline-a-repair/issues/01-restore-readable-a-cards.md](personal-dashboard-timeline-a-repair/issues/01-restore-readable-a-cards.md) | resolved |
| [.scratch/personal-dashboard-timeline-a-repair/issues/02-readable-overlap-and-narrow-layout.md](personal-dashboard-timeline-a-repair/issues/02-readable-overlap-and-narrow-layout.md) | resolved |
| [.scratch/personal-dashboard-usage-feedback/issues/01-historical-habit-records.md](personal-dashboard-usage-feedback/issues/01-historical-habit-records.md) | resolved |
| [.scratch/personal-dashboard-usage-feedback/issues/02-today-time-axis.md](personal-dashboard-usage-feedback/issues/02-today-time-axis.md) | resolved |
