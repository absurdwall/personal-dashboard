export type InterfaceLanguage = "zh" | "en";

export type InterfaceLanguagePreferences = Readonly<{
  interfaceLanguage: InterfaceLanguage;
}>;

const interfaceCopies = {
  "toolbar.label": { zh: "工作区工具栏", en: "Workspace toolbar" },
  "toolbar.themeSample": { zh: "全局主题色样本", en: "Global accent sample" },
  "toolbar.settings": { zh: "设置", en: "Settings" },
  "toolbar.openSettings": { zh: "打开设置", en: "Open settings" },
  "toolbar.switchToEnglish": { zh: "切换为英文", en: "Switch to English" },
  "toolbar.switchToChinese": { zh: "切换为中文", en: "Switch to Chinese" },
  "toolbar.languageChineseActive": { zh: "中 / EN", en: "中 / EN" },
  "toolbar.languageEnglishActive": { zh: "EN / 中", en: "EN / 中" },
  "toolbar.local": { zh: "本地", en: "Local" },
  "toolbar.dailyLife": { zh: "每日生活", en: "Daily life" },
  "toolbar.moreUnavailable": { zh: "更多选项暂不可用", en: "More options are not available yet" },
  "navigation.primary": { zh: "主要导航", en: "Primary navigation" },
  "navigation.destinations": { zh: "工作区页面", en: "Workspace destinations" },
  "navigation.destination": { zh: "页面", en: "Destination" },
  "navigation.currentDestination": { zh: "{destination}，当前页面", en: "{destination}, current destination" },
  "destination.today": { zh: "今天", en: "Today" },
  "destination.calendar": { zh: "日历", en: "Calendar" },
  "destination.habits": { zh: "习惯", en: "Habits" },
  "destination.settings": { zh: "设置", en: "Settings" },
  "destination.unknown": { zh: "未知页面", en: "Unknown destination" },
  "runtime.connecting": { zh: "正在连接本地应用…", en: "Connecting to the local application…" },
  "runtime.ready": { zh: "本地 Rust 应用已就绪 · 离线", en: "Local Rust application ready · Offline" },
  "runtime.unavailable": { zh: "本地应用边界不可用。", en: "The local application boundary is unavailable." },
  "runtime.private": { zh: "隐私数据留在这台 Mac。", en: "Private and offline on this Mac." },
  "workspace.label": { zh: "Personal Dashboard 工作区", en: "Personal Dashboard workspace" },
  "workspace.information": { zh: "工作区信息", en: "Workspace information" },
  "workspace.todayDescription": { zh: "查看今天 Daily Record 里的大致安排。", en: "Review today's overall plan in the Daily Record." },
  "workspace.calendarDescription": { zh: "先看整个月，再进入某一天。", en: "Review the month, then open a specific day." },
  "workspace.habitsDescription": { zh: "周次数与每日目标时刻放在同一份轻量列表里。", en: "Weekly counts and daily target times share one compact list." },
  "workspace.settingsDescription": { zh: "外观与本地 Vault 设置。", en: "Appearance and local Vault settings." },
  "workspace.todayFeature": { zh: "DAILY RECORD", en: "DAILY RECORD" },
  "workspace.calendarFeature": { zh: "日历", en: "CALENDAR" },
  "workspace.habitsFeature": { zh: "习惯 · 平级入口", en: "HABITS · PRIMARY DESTINATION" },
  "workspace.settingsFeature": { zh: "设置 · 本机偏好", en: "SETTINGS · MAC PREFERENCES" },
  "workspace.current": { zh: "当前页面：{destination}。", en: "{destination} is the current destination." },
  "workspace.weekKnown": { zh: "本周已知", en: "Known this week" },
  "workspace.knownCount": { zh: "{known} / {target} 已知", en: "{known} / {target} known" },
  "workspace.todayRail": { zh: "早间 · 当日 · 晚间", en: "Morning · Daytime · Evening" },
  "workspace.monthView": { zh: "月视图", en: "MONTH VIEW" },
  "workspace.selected": { zh: "{date} · 当前选中", en: "{date} · Selected" },
  "workspace.settingsRail": { zh: "外观 · 数据与 Vault", en: "Appearance · Data & Vault" },
  "workspace.habitsWeek": { zh: "习惯 · 本周", en: "HABITS · THIS WEEK" },
  "workspace.habitsRail": { zh: "周次数 · 每日目标", en: "Weekly count · Daily target" },
  "workspace.todayDate": { zh: "今天 · {date}", en: "TODAY · {date}" },
  "workspace.settingsMac": { zh: "设置 · MAC", en: "SETTINGS · MAC" },
  "settings.categories": { zh: "设置分类", en: "Settings categories" },
  "settings.appearance": { zh: "外观", en: "Appearance" },
  "settings.dataVault": { zh: "数据与 Vault", en: "Data & Vault" },
  "settings.localPreference": { zh: "保存在这台 Mac，不随 Vault 切换。", en: "Saved on this Mac, separately from the selected Vault." },
  "settings.accentColor": { zh: "主题颜色", en: "Accent color" },
  "settings.accentGroup": { zh: "主题颜色预设", en: "Accent color presets" },
  "settings.accentScope": { zh: "同一预设即时用于 Today、Calendar、Habits 与设置。", en: "One preset applies immediately to Today, Calendar, Habits, and Settings." },
  "settings.backgroundImage": { zh: "背景图片", en: "Background image" },
  "settings.backgroundDescription": { zh: "选择一张本地图片，以淡化方式用于所有页面。应用会保留自己的副本。", en: "Choose a local image as a softened backdrop on every page. The app keeps its own copy." },
  "settings.backgroundPreview": { zh: "背景图片预览", en: "Background image preview" },
  "settings.chooseBackground": { zh: "选择图片…", en: "Choose image…" },
  "settings.removeBackground": { zh: "移除图片", en: "Remove image" },
  "settings.backgroundNone": { zh: "默认：无背景图片。", en: "Default: no background image." },
  "settings.backgroundReady": { zh: "背景图片已保存在这台 Mac，并以淡化方式显示。", en: "The background image is saved on this Mac and displayed with a soft treatment." },
  "settings.backgroundUnavailable": { zh: "背景图片已损坏或不可用。请选择另一张图片，或移除当前引用。", en: "The background image is damaged or unavailable. Choose another image or remove the current reference." },
  "settings.colorForest": { zh: "松绿", en: "Forest" },
  "settings.colorBlue": { zh: "雾蓝", en: "Mist blue" },
  "settings.colorClay": { zh: "赤陶", en: "Clay" },
  "settings.colorLilac": { zh: "紫灰", en: "Lilac" },
  "settings.restoreAppearance": { zh: "恢复默认外观", en: "Restore default appearance" },
  "settings.restoreBoundary": { zh: "只恢复外观偏好，不清理 Vault 或个人记录。", en: "Restores appearance only; Vault data and personal records remain unchanged." },
  "settings.recordsOwnership": { zh: "你的记录仍属于自己选择的本地文件夹，无需 Dashboard 账号。", en: "Your records remain in the local folder you choose. No Dashboard account is required." },
  "settings.currentVault": { zh: "当前 Vault", en: "Current Vault" },
  "settings.compatibleVault": { zh: "兼容 Vault 需要 Obsidian Vault 标记与 life/Journal/Daily 目录。", en: "A compatible Vault needs an Obsidian Vault marker and a life/Journal/Daily folder." },
  "settings.noVault": { zh: "尚未选择 Vault。", en: "No Vault selected." },
  "settings.vaultAvailable": { zh: "本地位置可用；这里只确认 Mac 文件状态，不代表 Google Drive 已完成云端同步。", en: "The local location is available. This confirms only the Mac file state, not completed Google Drive cloud sync." },
  "settings.vaultUnconfigured": { zh: "尚未配置本地 Vault。", en: "No local Vault is configured." },
  "settings.vaultUnavailable": { zh: "本地位置不可用：{message}", en: "Local location unavailable: {message}" },
  "settings.vaultIncompatible": { zh: "Vault 不兼容：{message}", en: "Incompatible Vault: {message}" },
  "settings.vaultUnavailablePrefix": { zh: "本地位置不可用：", en: "Local location unavailable: " },
  "settings.vaultIncompatiblePrefix": { zh: "Vault 不兼容：", en: "Incompatible Vault: " },
  "settings.waitingWrites": { zh: "正在完成当前保存，再打开 Vault 选择器…", en: "Finishing the current save before opening the Vault picker…" },
  "settings.pendingWriteFailed": { zh: "保存失败；草稿与更正状态仍保留。", en: "Save failed; drafts and correction state are preserved." },
  "settings.vaultNotSwitchedAfterSaveFailure": { zh: "当前保存失败，Vault 尚未切换；草稿与更正状态仍保留。", en: "The current save failed, so the Vault was not switched. Drafts and correction state are preserved." },
  "settings.vaultSelectionError": { zh: "无法选择 Vault：{error}", en: "Could not choose a Vault: {error}" },
  "settings.waitingLocal": { zh: "等待读取本地状态。", en: "Waiting for local status." },
  "settings.changeVault": { zh: "更换 Vault…", en: "Change Vault…" },
  "settings.driveHeading": { zh: "使用 Google Drive 中的 Vault", en: "Use a Vault in Google Drive" },
  "settings.driveIntro": { zh: "先让 Google Drive 桌面客户端把整个 Vault 保持为 Mac 上可用的本地文件夹，再在这里选择它。", en: "First make the whole Vault locally available through Google Drive for desktop, then choose it here." },
  "settings.driveStepSignIn": { zh: "在 Google Drive 桌面客户端登录。", en: "Sign in with Google Drive for desktop." },
  "settings.driveStepLocal": { zh: "让整个 Vault 在这台 Mac 上保持本地可用。", en: "Keep the entire Vault available locally on this Mac." },
  "settings.driveStepChoose": { zh: "在 Dashboard 中选择该 Vault 文件夹。", en: "Choose that Vault folder in Dashboard." },
  "settings.driveBoundary": { zh: "普通本地 Vault 也可使用。Dashboard 不会自动转换任意笔记，不管理 Google 账号或上传；“本地已保存”不代表“云端已同步”。版本与回收站由 Google Drive 管理。", en: "Ordinary local Vaults also work. Dashboard does not convert arbitrary notes, manage Google accounts, or upload files. “Saved locally” does not mean “synced to the cloud.” Google Drive manages versions and trash." },
  "appearance.saving": { zh: "正在保存本机外观偏好…", en: "Saving the local appearance preference…" },
  "appearance.saved": { zh: "颜色已保存在这台 Mac。", en: "The color is saved on this Mac." },
  "appearance.restoring": { zh: "正在恢复默认外观…", en: "Restoring the default appearance…" },
  "appearance.restored": { zh: "已恢复默认外观；Vault 数据未更改。", en: "Default appearance restored; Vault data was not changed." },
  "appearance.importingBackground": { zh: "正在导入背景图片…", en: "Importing the background image…" },
  "appearance.backgroundImported": { zh: "背景图片副本已保存在这台 Mac。", en: "A copy of the background image is saved on this Mac." },
  "appearance.backgroundSelectionCancelled": { zh: "已取消选择；当前背景未更改。", en: "Selection cancelled; the current background was not changed." },
  "appearance.removingBackground": { zh: "正在移除背景图片…", en: "Removing the background image…" },
  "appearance.backgroundRemoved": { zh: "背景图片已移除；原始图片未更改。", en: "The background image was removed; the original image was not changed." },
  "appearance.cleanupPending": { zh: "外观已更新，但应用自有图片仍待清理：{error}", en: "Appearance was updated, but an app-owned image is still pending cleanup: {error}" },
  "appearance.updateFailed": { zh: "无法更新外观偏好：{error}", en: "Could not update the appearance preference: {error}" },
  "appearance.loadFailed": { zh: "无法读取外观偏好：{error}", en: "Could not load the appearance preference: {error}" },
  "language.saveFailed": { zh: "无法保存界面语言：{error}", en: "Could not save the interface language: {error}" },
  "calendar.historyRecall": { zh: "日历 · 历史回看", en: "CALENDAR · HISTORY RECALL" },
  "calendar.introduction": { zh: "先看整个月，再进入某一天；选中的日期复用 Today 的三个阶段。", en: "Review the month, then open a day using the same three Today phases." },
  "calendar.navigation": { zh: "日历月份导航", en: "Calendar period navigation" },
  "calendar.previousMonth": { zh: "上个月", en: "Previous month" },
  "calendar.nextMonth": { zh: "下个月", en: "Next month" },
  "calendar.year": { zh: "年份", en: "Year" },
  "calendar.month": { zh: "月份", en: "Month" },
  "calendar.today": { zh: "今天", en: "Today" },
  "calendar.monthOption": { zh: "{month} 月", en: "{month}" },
  "calendar.monthHeading": { zh: "{year} 年 {month} 月", en: "{monthName} {year}" },
  "calendar.monthView": { zh: "月视图 · 月历", en: "MONTH VIEW · CALENDAR" },
  "calendar.legend": { zh: "日历图例", en: "Calendar legend" },
  "calendar.dates": { zh: "日历日期", en: "Calendar dates" },
  "calendar.reviewed": { zh: "有复盘", en: "Reviewed" },
  "calendar.unreviewed": { zh: "无复盘", en: "No review" },
  "calendar.readError": { zh: "读取错误", en: "Read error" },
  "calendar.noRecord": { zh: "无记录", en: "No record" },
  "calendar.markerUnreviewed": { zh: "记", en: "N" },
  "calendar.markerReviewed": { zh: "复", en: "R" },
  "calendar.selectedDay": { zh: "选中日期", en: "SELECTED DAY" },
  "calendar.chooseDate": { zh: "选择一个日期", en: "Choose a date" },
  "calendar.loadingSelectedDate": { zh: "正在读取选中日期…", en: "Loading the selected date…" },
  "calendar.chooseDay": { zh: "选择月历中的一天", en: "Choose a day in the calendar" },
  "calendar.previewThenOpen": { zh: "先预览是否有记录与复盘，再打开完整 Today。", en: "Preview its record and review status before opening the full Today view." },
  "calendar.openFullToday": { zh: "打开完整 Today", en: "Open full Today" },
  "calendar.eveningSummary": { zh: "晚间复盘", en: "Evening review" },
  "calendar.hasReview": { zh: "这一天有晚间复盘。", en: "This day has an evening review." },
  "calendar.reviewDetail": { zh: "{count} 条日间记录 · 默认打开晚间复盘", en: "{count} daytime records · Opens the evening review" },
  "calendar.dayStatus": { zh: "当日状态", en: "Day status" },
  "calendar.noReviewCopy": { zh: "这一天有 Daily Record，但没有晚间复盘。", en: "This day has a Daily Record but no evening review." },
  "calendar.daytimeDetail": { zh: "{count} 条日间记录 · 默认打开当日进展", en: "{count} daytime records · Opens daytime progress" },
  "calendar.errorIsolation": { zh: "这一天的异常不会阻断其他日期。", en: "An error on this day does not block other dates." },
  "calendar.vaultNotSelected": { zh: "尚未选择 Vault", en: "No Vault selected" },
  "calendar.chooseVaultInToday": { zh: "请先到 Today 选择 Tortilla Flat Vault。", en: "Choose a Tortilla Flat Vault from Today first." },
  "calendar.readOnly": { zh: "Calendar 浏览不会创建文件。", en: "Browsing Calendar does not create files." },
  "calendar.blankDate": { zh: "空白日期", en: "Blank date" },
  "calendar.blankCopy": { zh: "没有 Daily Record；保持空白，不制造补记义务。", en: "There is no Daily Record. The date stays blank without creating a catch-up obligation." },
  "calendar.unknownBoundary": { zh: "未记录不解释成未完成。", en: "Not recorded does not mean not completed." },
  "calendar.loadFailed": { zh: "无法读取 Calendar：{error}", en: "Could not load Calendar: {error}" },
  "calendar.vaultSelectionFailed": { zh: "Vault 选择失败", en: "Vault selection failed" },
  "calendar.readFailed": { zh: "Calendar 读取失败", en: "Calendar load failed" },
  "calendar.retry": { zh: "当前页面没有完成这次读取；请修复后重试。", en: "This page did not complete the read. Fix the problem and try again." },
  "calendar.selected": { zh: "已选择 {date}。", en: "Selected {date}." },
  "calendar.dateFailed": { zh: "无法读取 {date}；其他日期仍可选择。", en: "Could not read {date}; other dates remain selectable." },
  "calendar.previewStatus": { zh: "选择日期可预览摘要；Calendar 浏览不会修改 Daily Record。", en: "Choose a date to preview its summary. Calendar browsing does not modify Daily Records." },
  "calendar.connectStatus": { zh: "尚未选择 Vault；请先到 Today 连接 Tortilla Flat Vault。", en: "No Vault selected. Connect a Tortilla Flat Vault from Today first." },
  "calendar.loadingNewVault": { zh: "正在读取新 Vault 的 Calendar…", en: "Loading Calendar from the new Vault…" },
  "calendar.weekSun": { zh: "周日", en: "Sun" },
  "calendar.weekMon": { zh: "周一", en: "Mon" },
  "calendar.weekTue": { zh: "周二", en: "Tue" },
  "calendar.weekWed": { zh: "周三", en: "Wed" },
  "calendar.weekThu": { zh: "周四", en: "Thu" },
  "calendar.weekFri": { zh: "周五", en: "Fri" },
  "calendar.weekSat": { zh: "周六", en: "Sat" },
  "today.actions": { zh: "Today 操作", en: "Today workspace actions" },
  "today.selectVault": { zh: "选择 Vault…", en: "Choose Vault…" },
  "today.refresh": { zh: "刷新", en: "Refresh" },
  "today.loading": { zh: "正在读取今天的早间计划…", en: "Loading today's morning plan…" },
  "today.loadingDate": { zh: "正在读取 {date} 的 Daily Record…", en: "Loading the Daily Record for {date}…" },
  "today.vaultName": { zh: "Vault：{name}", en: "Vault: {name}" },
  "today.loadingNewVault": { zh: "正在读取新 Vault 的 Today…", en: "Loading Today from the new Vault…" },
  "today.waitingWrites": { zh: "正在完成当前保存，再切换 Vault…", en: "Finishing the current save before switching Vaults…" },
  "today.selectedDate": { zh: "所选日期 · {date}", en: "Selected day · {date}" },
  "today.currentDate": { zh: "今天 · {date}", en: "Today · {date}" },
  "today.phaseNavigation": { zh: "Today 阶段", en: "Today phases" },
  "today.morning": { zh: "早间基准", en: "Morning baseline" },
  "today.daytime": { zh: "当日进展", en: "Daytime progress" },
  "today.evening": { zh: "晚间复盘", en: "Evening review" },
  "today.morningShort": { zh: "早间", en: "Morning" },
  "today.daytimeShort": { zh: "当日", en: "Daytime" },
  "today.eveningShort": { zh: "晚间", en: "Evening" },
  "today.morningSection": { zh: "早间 · 早间基准", en: "MORNING · BASELINE" },
  "today.daytimeSection": { zh: "当日 · 时间轴", en: "DAYTIME · TIMELINE" },
  "today.shortRecordText": { zh: "简短记录内容", en: "Short record text" },
  "today.eveningUpdateText": { zh: "晚间更新内容", en: "Evening update text" },
  "today.initialArrangement": { zh: "当天的初始安排", en: "Initial arrangement for the day" },
  "today.morningTimeline": { zh: "今天的早间计划时间线", en: "Today's morning plan timeline" },
  "today.noBaseline": { zh: "这份 Daily Record 尚未独立保存早间基准。", en: "This Daily Record does not yet contain a separately saved morning baseline." },
  "today.noBaselineStart": { zh: "这份 Daily Record 未独立保存早间基准；不会用当前安排补造起点。", en: "This Daily Record has no separately saved morning baseline; the current arrangement will not be used to invent one." },
  "today.emptyBaseline": { zh: "早间基准已建立，但初始安排仍为空。", en: "The morning baseline exists, but its initial arrangement is empty." },
  "today.timelineAndRecords": { zh: "时间轴 + 记录", en: "Timeline + records" },
  "today.timelineIntro": { zh: "已确认的事实、接下来计划和记录变化并排阅读；时间过去、第一次回复或没有回复都不会自动变成事实。", en: "Read confirmed facts, upcoming plans, and record changes together. Time passing, a first reply, or no reply never becomes fact automatically." },
  "today.currentDirection": { zh: "现在怎么走", en: "Where things stand" },
  "today.timelineLegend": { zh: "时间轴图例", en: "Timeline legend" },
  "today.currentTimeline": { zh: "今天的当前安排；不按时间推断", en: "Today's current arrangement; not inferred from time" },
  "today.daytimeRail": { zh: "当日更新区", en: "Daytime update rail" },
  "today.known": { zh: "已发生 / 已确认", en: "Known / confirmed" },
  "today.notInferred": { zh: "未按时间推断", en: "Not inferred from time" },
  "today.revisionDirections": { zh: "修订方向记录", en: "Recorded revisions" },
  "today.noKnownFacts": { zh: "今天还没有明确记录的已发生事实。", en: "No facts have been explicitly recorded for today yet." },
  "today.currentArrangement": { zh: "当前安排 · 未按时间推断", en: "Current arrangement · Not inferred from time" },
  "today.noCurrentArrangement": { zh: "这份 Daily Record 还没有当前安排。", en: "This Daily Record does not have a current arrangement yet." },
  "today.nowBoundary": { zh: "现在 · 记录边界", en: "Now · Record boundary" },
  "today.upNext": { zh: "接下来计划 · 修订记录", en: "Up next · Recorded revisions" },
  "today.noDirections": { zh: "尚未明确记录修订方向；不会按钟点从当前安排猜测。", en: "No revised direction has been recorded; Dashboard does not infer one from the clock." },
  "today.directionBoundary": { zh: "修订方向按记录保留，不依据先后顺序判断哪一条仍然有效；当前安排以上方中性区域为准。", en: "Revised directions remain as records; their order does not determine which is still active. Use the neutral current arrangement above." },
  "today.axisNote": { zh: "时间轴只整理明确事实、当前安排线索和修订记录；没有记录的活动继续保持未知。", en: "The timeline organizes explicit facts, current-arrangement cues, and revision records. Unrecorded activity remains unknown." },
  "today.recordCategory": { zh: "记录类别", en: "Record category" },
  "today.ordinaryRecord": { zh: "日常记录", en: "Daily note" },
  "today.exercise": { zh: "健身", en: "Exercise" },
  "today.writeShort": { zh: "写一句", en: "Add a short note" },
  "today.correctRecord": { zh: "更正记录", en: "Correct note" },
  "today.saveRecord": { zh: "保存记录", en: "Save note" },
  "today.saveCorrection": { zh: "保存更正", en: "Save correction" },
  "today.cancelCorrection": { zh: "取消更正", en: "Cancel correction" },
  "today.notePlaceholder": { zh: "跑步 30 分钟", en: "For example: ran for 30 minutes" },
  "today.noteTargetCurrent": { zh: "保存在当前所选日期的日记录中；不替你打卡。", en: "Saved in the selected day's Daily Record; this does not check in for you." },
  "today.noteTarget": { zh: "保存在 {date} 的日记录中；不替你打卡。", en: "Saved in the Daily Record for {date}; this does not check in for you." },
  "today.futureBoundary": { zh: "未来日期不能记录已经发生的事实。", en: "Facts that already happened cannot be recorded on a future date." },
  "today.sideRegion": { zh: "当天任务与初始计划依据", en: "Day tasks and initial planning evidence" },
  "dayTasks.section": { zh: "当天 · 任务", en: "DAY · TASKS" },
  "dayTasks.heading": { zh: "当天任务", en: "Day tasks" },
  "dayTasks.count": { zh: "{count} 项", en: "{count} tasks" },
  "dayTasks.ready": { zh: "已读取这一天的任务。", en: "Loaded tasks for this day." },
  "dayTasks.emptyStatus": { zh: "这一天没有任务。", en: "There are no tasks for this day." },
  "dayTasks.empty": { zh: "当天还没有任务；昨天的任务不会自动带入。", en: "No tasks for this day. Yesterday's list is not carried over." },
  "dayTasks.addLabel": { zh: "添加当天任务", en: "Add a day task" },
  "dayTasks.addPlaceholder": { zh: "添加当天任务", en: "Add a task for this day" },
  "dayTasks.add": { zh: "添加", en: "Add" },
  "dayTasks.saveRename": { zh: "保存", en: "Save" },
  "dayTasks.saveRenameLabel": { zh: "保存任务“{task}”的改名", en: "Save the new name for task {task}" },
  "dayTasks.delete": { zh: "删除", en: "Delete" },
  "dayTasks.boundary": { zh: "未勾选表示尚未确认；任务不会自动跨天带入。", en: "Unchecked means unconfirmed. Tasks are never carried over automatically." },
  "dayTasks.sourceManual": { zh: "手动添加", en: "Added manually" },
  "dayTasks.sourceDailyFlow": { zh: "每日流程导入", en: "Imported by the daily flow" },
  "dayTasks.completionLabel": { zh: "切换“{task}”的完成状态", en: "Toggle completion for {task}" },
  "dayTasks.renameLabel": { zh: "重命名任务“{task}”", en: "Rename task {task}" },
  "dayTasks.deleteLabel": { zh: "删除任务“{task}”", en: "Delete task {task}" },
  "dayTasks.saved": { zh: "当天任务已保存到所选 Vault。", en: "Day tasks were saved to the selected Vault." },
  "dayTasks.notSaved": { zh: "任务未保存：{error}", en: "Task not saved: {error}" },
  "dayTasks.refreshFirst": { zh: "请先刷新有效的当天任务，再重试。", en: "Refresh the valid day-task list before trying again." },
  "dayTasks.enterTask": { zh: "请输入一条当天任务。", en: "Enter a task for this day." },
  "today.shortRecords": { zh: "当日简短记录", en: "Short notes for the day" },
  "today.noShortRecords": { zh: "还没有简短记录。", en: "No short notes yet." },
  "today.arrangementChanges": { zh: "安排变化", en: "Arrangement changes" },
  "today.noArrangementChanges": { zh: "今天还没有明确记录的安排变化。", en: "No arrangement changes have been explicitly recorded today." },
  "today.updateBoundary": { zh: "重排由外部 Agent 明确更新“当前安排”；这里的记录不会覆盖早间基准，也不会自动写回 Dida365。", en: "An external Agent explicitly updates the current arrangement. Notes here do not overwrite the morning baseline or write back to Dida365." },
  "today.agentRecord": { zh: "Agent 整理的今日记录", en: "Today's record organized by the Agent" },
  "today.eveningIntro": { zh: "先读一个保守的 first pass；不要求完整重建整天。", en: "Start with a conservative first pass; a complete reconstruction of the day is not required." },
  "today.whatHappened": { zh: "今天发生了什么", en: "What happened today" },
  "today.planVsActual": { zh: "计划与实际", en: "Plan and actual" },
  "today.simpleSummary": { zh: "简单总结（可选）", en: "Short summary (optional)" },
  "today.questions": { zh: "仍值得确认", en: "Still worth confirming" },
  "today.yourAdditions": { zh: "你的补充", en: "Your additions" },
  "today.yourCorrections": { zh: "你的修正", en: "Your corrections" },
  "today.supplements": { zh: "补充与更正", en: "Additions and corrections" },
  "today.revisionWarning": { zh: "这份复盘之后仍有记录修订；Agent 原文保持不变。", en: "Records were revised after this review; the original Agent text remains unchanged." },
  "today.noEvening": { zh: "Agent 还没有准备晚间复盘。今晚可以不复盘，也不会形成补写债务。", en: "The Agent has not prepared an evening review. Skipping tonight does not create a writing debt." },
  "today.updateMode": { zh: "更新方式", en: "Update type" },
  "today.addMissing": { zh: "补充遗漏信息", en: "Add missing information" },
  "today.correctReview": { zh: "修正已有复盘", en: "Correct the existing review" },
  "today.shortContent": { zh: "简短内容", en: "Short content" },
  "today.saveEvening": { zh: "保存晚间更新", en: "Save evening update" },
  "today.eveningBoundary": { zh: "这会写入受控小节，不会关闭今天，也不会改写整份 Markdown。", en: "This writes to a bounded section without closing the day or rewriting the full Markdown file." },
  "today.initialEvidence": { zh: "初始计划依据", en: "Initial planning evidence" },
  "today.noInitialEvidence": { zh: "尚未记录初始计划依据。", en: "No initial planning evidence has been recorded." },
  "today.morningHandoff": { zh: "早间交接", en: "MORNING HANDOFF" },
  "today.needsRecord": { zh: "Today 需要一份 Daily Record。", en: "Today needs a Daily Record." },
  "today.runMorning": { zh: "请让 Codex 运行早间流程，然后回到这里刷新 Today。", en: "Ask Codex to run the morning flow, then return here and refresh Today." },
  "today.connectVault": { zh: "连接 Tortilla Flat Vault。", en: "Connect a Tortilla Flat Vault." },
  "today.connectVaultCopy": { zh: "只需选择一次 Vault 文件夹。Personal Dashboard 只保存这个工作区设置，并直接读取规范 Daily Record。", en: "Choose the Vault folder once. Personal Dashboard saves only this workspace setting and reads canonical Daily Records directly." },
  "today.repairRecord": { zh: "今天的 Daily Record 需要修复。", en: "Today's Daily Record needs repair." },
  "today.openRecordFirst": { zh: "请先打开可记录的日期，并填写一句内容。", en: "Open a writable date and enter a short note first." },
  "today.correctionSaved": { zh: "更正及修改记录已写入 Daily Record。", en: "The correction and change history were saved to the Daily Record." },
  "today.noteSaved": { zh: "简短记录已写入 Daily Record。", en: "The short note was saved to the Daily Record." },
  "today.notSaved": { zh: "未保存：{error}", en: "Not saved: {error}" },
  "today.refreshBeforeSave": { zh: "请先刷新有效的 Daily Record，再保存。", en: "Refresh a valid Daily Record before saving." },
  "today.loadFailed": { zh: "无法读取 Today：{error}", en: "Could not load Today: {error}" },
  "today.eveningSaved": { zh: "晚间更新已写入 Daily Record。", en: "The evening update was saved to the Daily Record." },
  "today.background": { zh: "背景", en: "Context" },
  "today.recordContent": { zh: "记录内容", en: "Recorded content" },
  "today.observedFacts": { zh: "观察到的事实", en: "Observed facts" },
  "today.originalIntent": { zh: "原计划意图", en: "Original intent" },
  "today.changeReasons": { zh: "变化原因", en: "Reasons for change" },
  "today.revisedDirection": { zh: "接下来这样安排", en: "Revised direction" },
  "today.correctThis": { zh: "更正这条", en: "Correct this note" },
  "today.changeHistory": { zh: "修改记录 · {count}", en: "Change history · {count}" },
  "today.recordMeta": { zh: "{category} · 目标 {date} · 记录于 {createdAt}", en: "{category} · For {date} · Recorded {createdAt}" },
  "count.timeBlocks": { zh: "{count} 个时间块", en: "{count} time blocks" },
  "count.knownDirections": { zh: "{known} 条已知 · {directions} 条修订方向", en: "{known} known · {directions} revised directions" },
  "count.items": { zh: "{count} 项", en: "{count} items" },
  "count.records": { zh: "{count} 条", en: "{count} records" },
  "habits.weekSnapshot": { zh: "本周 · 来源快照", en: "WEEK OF · SOURCED SNAPSHOT" },
  "habits.snapshot": { zh: "习惯快照", en: "Habits snapshot" },
  "habits.weekly": { zh: "本周习惯", en: "Habits this week" },
  "habits.loadingOnDemand": { zh: "正在读取按需快照…", en: "Loading the on-demand snapshot…" },
  "habits.refresh": { zh: "刷新快照", en: "Refresh snapshot" },
  "habits.loading": { zh: "正在读取 Habits 快照…", en: "Loading the Habits snapshot…" },
  "habits.weekStats": { zh: "本周统计", en: "THIS WEEK" },
  "habits.shortSummary": { zh: "简短摘要", en: "Short summary" },
  "habits.mondaySunday": { zh: "周一至周日", en: "Monday to Sunday" },
  "habits.knownTarget": { zh: "已知次数 / 目标次数", en: "Known completions / target" },
  "habits.updated": { zh: "更新时间", en: "Updated" },
  "habits.source": { zh: "来源", en: "Source" },
  "habits.todayState": { zh: "今日情况", en: "TODAY" },
  "habits.knownUnknown": { zh: "已知与未知并列", en: "Known and unknown together" },
  "habits.dailyAnchors": { zh: "每日锚点", en: "Daily anchors" },
  "habits.targetActual": { zh: "目标 / 明确实际", en: "Target / explicit actual" },
  "habits.weekToday": { zh: "本周习惯在今天", en: "Weekly habits today" },
  "habits.countToday": { zh: "周次数 · 今日状态", en: "Weekly count · Today's status" },
  "habits.noSnapshot": { zh: "尚无可显示的快照。", en: "No snapshot is available to display." },
  "habits.noProducer": { zh: "Dashboard 不会自行生成或连接 Dida365。", en: "Dashboard does not generate snapshots or connect to Dida365 on its own." },
  "habits.unknown": { zh: "未知", en: "Unknown" },
  "habits.completed": { zh: "已知完成", en: "Known complete" },
  "habits.notDone": { zh: "明确未完成", en: "Explicitly not done" },
  "habits.conflict": { zh: "来源冲突 · 不计次", en: "Source conflict · Not counted" },
  "habits.partial": { zh: "partial · 不计次", en: "Partial · Not counted" },
  "habits.baseline": { zh: "baseline · 不计次", en: "Baseline · Not counted" },
  "habits.unavailable": { zh: "来源不可用", en: "Source unavailable" },
  "habits.actualTime": { zh: "明确实际时刻", en: "Explicit actual time" },
  "habits.thresholdOnly": { zh: "仅阈值证据", en: "Threshold evidence only" },
  "habits.recordOnly": { zh: "有文字记录 · 不计次", en: "Text record · Not counted" },
  "habits.actualUnknown": { zh: "实际未知", en: "Actual time unknown" },
  "habits.noGoal": { zh: "{count} 次 · 无目标", en: "{count} · No target" },
  "habits.sources": { zh: "来源：{sources}", en: "Sources: {sources}" },
  "habits.notDeclared": { zh: "未声明", en: "Not declared" },
  "habits.todayStatus": { zh: "今天：{status}", en: "Today: {status}" },
  "habits.recent": { zh: "近 7 天", en: "Past 7 days" },
  "habits.expand": { zh: "展开", en: "Expand" },
  "habits.collapse": { zh: "收起", en: "Collapse" },
  "habits.history": { zh: "近 12 周记录", en: "Past 12 weeks" },
  "habits.historyCaption": { zh: "点 = 有来源记录；实心完成与文字记录状态不同", en: "Dot = source record; a solid completion differs from a text-only record" },
  "habits.chooseHistory": { zh: "选择一个日期点，查看来源、coverage 与记录。", en: "Choose a date to inspect sources, coverage, and records." },
  "habits.historyContext": { zh: "历史目标 context：{context}", en: "Historical goal context: {context}" },
  "habits.noHistoryContext": { zh: "历史目标 context：快照未提供；不回填历史达标率。", en: "Historical goal context was not provided by the snapshot; historical attainment is not backfilled." },
  "habits.exerciseAssociation": { zh: "健身 · 日期与关联已预设", en: "Exercise · Date and association are preset" },
  "habits.noExerciseNotes": { zh: "还没有健身短句。", en: "No exercise notes yet." },
  "habits.loadingDate": { zh: "正在读取所选日期…", en: "Loading the selected date…" },
  "habits.recordContent": { zh: "记录内容", en: "Note content" },
  "habits.exercisePlaceholder": { zh: "例如：跑步 30 分钟", en: "For example: ran for 30 minutes" },
  "habits.exerciseNoteText": { zh: "健身记录内容", en: "Exercise note text" },
  "habits.futureBoundary": { zh: "未来日期不能记录已经发生的事实。", en: "Facts that already happened cannot be recorded on a future date." },
  "habits.range": { zh: "12 周显示窗口 · {display} · 来源覆盖 · {range}", en: "12-week display · {display} · Source coverage · {range}" },
  "habits.waitingSnapshot": { zh: "等待有效的 bounded snapshot。", en: "Waiting for a valid bounded snapshot." },
  "habits.noHabitsSnapshot": { zh: "尚无可显示的 Habits 快照。", en: "No Habits snapshot is available to display." },
  "habits.noGoalExcluded": { zh: " {count} 个无目标习惯未计入分母。", en: " {count} habits without goals are excluded from the denominator." },
  "habits.loadingLocal": { zh: "正在读取本地 Habits 快照…", en: "Loading the local Habits snapshot…" },
  "habits.loadFailed": { zh: "无法读取 Habits 快照：{error}", en: "Could not load the Habits snapshot: {error}" },
  "habits.loadDateFailed": { zh: "无法读取所选日期：{error}", en: "Could not load the selected date: {error}" },
  "habits.correctionSaved": { zh: "更正及修改记录已写入 Daily Record；未更新滴答或完成次数。", en: "The correction and change history were saved to the Daily Record; Dida and completion counts were not updated." },
  "habits.noteSaved": { zh: "健身短句已写入 Daily Record；未更新滴答或完成次数。", en: "The exercise note was saved to the Daily Record; Dida and completion counts were not updated." },
  "habits.statusCoverage": { zh: "{status} · 覆盖 {coverage}", en: "{status} · Coverage {coverage}" },
  "habits.coverageAria": { zh: "覆盖 {coverage}", en: "Coverage {coverage}" },
  "common.unknown": { zh: "未知", en: "Unknown" },
  "common.errorDetail": { zh: "{error}", en: "{error}" },
  "common.loading": { zh: "读取中", en: "Loading" },
} as const;

export type InterfaceCopyKey = keyof typeof interfaceCopies;

const languageLocales: Record<InterfaceLanguage, string> = {
  zh: "zh-CN",
  en: "en-US",
};

export function formatInterfaceDate(date: string, language: InterfaceLanguage): string {
  return new Intl.DateTimeFormat(languageLocales[language], {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatInterfaceMonth(
  year: number,
  month: number,
  language: InterfaceLanguage,
): string {
  return new Intl.DateTimeFormat(languageLocales[language], {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

const englishApplicationMessages: Readonly<Record<string, string>> = {
  "请选择 Tortilla Flat vault，以读取 Daily Record。":
    "Choose a Tortilla Flat Vault to read Daily Records.",
  "当前 Vault 文件夹不可用。请检查本地位置，或重新选择 Vault。":
    "The current Vault folder is unavailable. Check the local location or choose another Vault.",
  "这份 Daily Record 有效，但当前安排尚未写入。":
    "This Daily Record is valid, but its current arrangement has not been written yet.",
  "已读取当前安排；这份 Daily Record 未独立保存早间基准。":
    "Loaded the current arrangement; this Daily Record has no separately saved morning baseline.",
  "已读取当前安排；早间基准章节存在但内容为空。":
    "Loaded the current arrangement; the morning baseline section exists but is empty.",
  "已读取独立早间基准和当前安排。":
    "Loaded the separate morning baseline and current arrangement.",
  "这份 Daily Record 未独立保存早间基准；当前安排仍可在 Daytime 查看。":
    "This Daily Record has no separately saved morning baseline; its current arrangement remains available in Daytime.",
  "早间基准章节已保存，但初始安排和依据仍为空。":
    "The morning-baseline section is saved, but its initial plan and evidence are still empty.",
  "已读取独立保存的早间基准。":
    "Loaded the separately saved morning baseline.",
  "要更正的记录已经变化。草稿仍保留；请重新读取该日期后重试。":
    "The record being corrected has changed. The draft is preserved; reload that date and try again.",
  "请选择 Tortilla Flat vault，以读取 Habits 快照。":
    "Choose a Tortilla Flat Vault to read the Habits snapshot.",
  "尚无 Habits 快照。Dashboard 不会自动生成数据；请在每日流程按需生成后刷新。":
    "No Habits snapshot exists. Dashboard does not generate data automatically; generate one from the daily flow and refresh.",
  "正在显示过期的有效快照；数据不是实时读数。":
    "Showing a valid but stale snapshot; this is not a live reading.",
  "已读取按需生成的本地快照；Dashboard 未连接或轮询外部服务。":
    "Loaded the locally generated on-demand snapshot; Dashboard is not connected to or polling external services.",
  "当前周覆盖不完整；显示已知次数下界，未知不等于未完成。":
    "Current-week coverage is incomplete; the known count is a lower bound, and unknown does not mean incomplete.",
  "当前周截至快照范围的来源覆盖完整；未来日期仍保持未知。":
    "Source coverage is complete through the snapshot range for the current week; future dates remain unknown.",
  "请选择 Vault，以读取当天任务。": "Choose a Vault to read day tasks.",
  "这一天没有任务；未勾选事项不会自动顺延。":
    "There are no tasks for this day. Unchecked tasks are not carried over automatically.",
  "已读取这一天的任务。": "Loaded tasks for this day.",
};

const englishDailyRecordHeadings: Readonly<Record<string, string>> = {
  "早间基准": "Morning baseline",
  "今天的大致安排": "Current arrangement",
  "计划依据": "Planning evidence",
  "白天更新": "Daytime updates",
  "晚间复盘": "Evening review",
  "初始安排": "Initial plan",
  "初始计划依据": "Initial planning evidence",
  "简短记录": "Short notes",
  "修改记录": "Change history",
  "用户补充": "User additions",
  "用户修正": "User corrections",
};

const englishDiagnosticLabels: Readonly<Record<string, string>> = {
  "简短记录": "Short note",
  "更正内容": "Correction",
  "记录标识": "Record identifier",
  "修改标识": "Change identifier",
  "白天更新": "Daytime update",
  "晚间复盘更新": "Evening-review update",
  "Habit 名称": "Habit name",
  "任务标识": "Task identifier",
  "任务修改标识": "Task-change identifier",
  "任务来源标识": "Task source identifier",
};

const englishApplicationErrors: Readonly<Record<string, string>> = {
  "今天的 Daily Record 不是有效的 UTF-8 文本。":
    "The Daily Record is not valid UTF-8 text.",
  "今天的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。":
    "The Daily Record is not valid UTF-8 text; nothing was written.",
  "该日期的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。":
    "That date's Daily Record is not valid UTF-8 text; nothing was written.",
  "Daily Record 包含重复的简短记录标识；请修复后刷新 Today。":
    "The Daily Record contains duplicate short-note identifiers. Repair it, then refresh Today.",
  "Daily Record 包含无法识别的简短记录类别。":
    "The Daily Record contains an unrecognized short-note category.",
  "Daily Record 的简短记录缺少正文。":
    "The Daily Record short note is missing its body.",
  "Daily Record 的简短记录正文格式无效。":
    "The Daily Record short-note body has an invalid format.",
  "Daily Record 包含重复的修改记录标识；请修复后刷新 Today。":
    "The Daily Record contains duplicate change identifiers. Repair it, then refresh Today.",
  "Daily Record 的修改记录缺少原文。":
    "The Daily Record change entry is missing its original text.",
  "Daily Record 的修改记录缺少新文。":
    "The Daily Record change entry is missing its replacement text.",
  "今天的 Daily Record 缺少有效 frontmatter。未写入任何内容。":
    "The Daily Record is missing valid frontmatter; nothing was written.",
  "今天的 Daily Record 正文包含未闭合的 Markdown 代码围栏，无法安全定位写入位置；未写入任何内容。":
    "The Daily Record body contains an unclosed Markdown code fence, so a safe write location cannot be found; nothing was written.",
  "当前本地时间缺少 UTC offset；未写入记录。":
    "The current local time is missing a UTC offset; no record was written.",
  "该记录标识已经用于另一条内容。请刷新后重试；未写入任何内容。":
    "That record identifier is already used for different content. Refresh and try again; nothing was written.",
  "该日期的 Daily Record 已被创建。请刷新后重试；现有内容未被覆盖。":
    "That date's Daily Record has already been created. Refresh and try again; existing content was not overwritten.",
  "该日期的 Daily Record 已被另一个写入创建。请刷新后重试；现有内容未被覆盖。":
    "That date's Daily Record was created by another writer. Refresh and try again; existing content was not overwritten.",
  "该日期的 Daily Record 已不存在。请刷新后重试；未创建替代记录。":
    "That date's Daily Record no longer exists. Refresh and try again; no replacement record was created.",
  "该修改标识已经用于另一项更正。请刷新后重试；未写入任何内容。":
    "That change identifier is already used for another correction. Refresh and try again; nothing was written.",
  "找不到要更正的简短记录。请刷新后确认该条目仍然存在。":
    "The short note to correct could not be found. Refresh and confirm that the entry still exists.",
  "不能在未来日期记录已经发生的事实。请选择今天或过去日期。":
    "A fact that has already happened cannot be recorded on a future date. Choose today or a past date.",
  "请先选择 Tortilla Flat vault，再保存简短记录。":
    "Choose a Tortilla Flat Vault before saving a short note.",
  "Vault 或日期保存目标已经变化。草稿仍保留；请返回原日期或刷新后再保存。":
    "The Vault or date save target has changed. The draft is preserved; return to the original date or refresh before saving.",
  "请先选择 Tortilla Flat vault，再更新今天的 Daily Record。":
    "Choose a Tortilla Flat Vault before updating today's Daily Record.",
  "今天还没有 Daily Record。请先让 Codex 运行早间流程，然后刷新 Today。":
    "Today has no Daily Record yet. Run the morning flow with Codex, then refresh Today.",
  "今天的 Daily Record 已在外部发生变化。请刷新 Today 后再保存；外部内容未被覆盖。":
    "Today's Daily Record changed externally. Refresh Today before saving again; external content was not overwritten.",
  "Habit 结果只能是 normal、baseline、partial 或 not_done；未选择仍表示 unknown。":
    "Habit outcome must be normal, baseline, partial, or not_done; no selection still means unknown.",
  "任务文字不能为空。": "Task text cannot be empty.",
  "该任务修改标识已用于其他操作；未写入任何内容。":
    "That task-change identifier was used for another operation; nothing was written.",
  "这一天还没有任务正本。请刷新后再操作；未创建替代数据。":
    "This day has no canonical task document yet. Refresh before retrying; no replacement data was created.",
  "请先选择 Vault，再保存当天任务。": "Choose a Vault before saving day tasks.",
  "Vault 或任务日期已经变化。操作仍可重试；请返回原日期或刷新后再保存。":
    "The Vault or task date changed. The operation remains retryable; return to the original date or refresh before saving.",
  "该任务标识已用于其他任务或已删除任务；请重新添加为新的稳定身份。":
    "That task identifier belongs to a different or deleted task. Add this as a new stable identity.",
  "这一天的任务正本已被创建。请刷新后重试；现有任务未被覆盖。":
    "This day's canonical task document was created externally. Refresh and retry; existing tasks were not overwritten.",
  "这一天的任务正本已不存在。请刷新后重试；未创建替代数据。":
    "This day's canonical task document no longer exists. Refresh and retry; no replacement data was created.",
  "这一天的任务正本已被另一个写入创建。请刷新后重试；现有任务未被覆盖。":
    "This day's canonical task document was created by another writer. Refresh and retry; existing tasks were not overwritten.",
  "当天任务正本包含重复任务标识；未将其当作空任务。":
    "The canonical day-task document contains duplicate task identifiers; it was not treated as empty.",
  "当天任务正本包含重复修改标识；未将其当作空任务。":
    "The canonical day-task document contains duplicate change identifiers; it was not treated as empty.",
  "手动任务不能声明 producer 来源标识。":
    "A manual task cannot declare a producer source reference.",
  "当天任务正本包含重复 producer 来源标识；无法稳定合并任务。":
    "The canonical day-task document contains a duplicate producer reference, so tasks cannot be merged stably.",
  "当天任务正本在删除记录之后仍包含修改；未将其当作有效数据。":
    "The canonical day-task document contains a change after deletion and was rejected.",
  "任务改名记录必须同时保留原文字与新文字。":
    "A task rename must retain both the previous and new text.",
  "任务改名记录的原文字与新文字不能相同。":
    "A task rename cannot use identical previous and new text.",
  "当天任务正本包含不连续的改名记录。":
    "The canonical day-task document contains a discontinuous rename history.",
  "完成、取消完成或删除记录不能携带任务文字。":
    "Completion, reopening, and deletion changes cannot carry task text.",
  "当天任务正本包含重复的完成记录。":
    "The canonical day-task document contains a duplicate completion change.",
  "当天任务正本在未完成状态下包含取消完成记录。":
    "The canonical day-task document reopens a task that was not complete.",
  "当天任务正本的当前文字与最后一次改名记录不一致。":
    "The current task text does not match the final rename change.",
  "当天任务正本的完成状态与修改记录不一致。":
    "The current completion state does not match the task change history.",
  "当天任务正本的删除标记与修改记录不一致。":
    "The deletion tombstone does not match the task change history.",
  "当天任务正本的修改时间与最后一条修改记录不一致。":
    "The task modified time does not match its final change.",
  "找不到要修改的当天任务。请刷新后确认该任务仍然存在。":
    "The day task to change could not be found. Refresh and confirm that it still exists.",
  "该当天任务已经删除；旧身份不会被重新激活。":
    "This day task is deleted; its old identity will not be reactivated.",
  "当天任务正本已在外部发生变化。操作仍可重试；请刷新后再保存，外部内容未被覆盖。":
    "The canonical day-task document changed externally. The operation remains retryable; refresh before saving again. External content was not overwritten.",
};

function englishApplicationDiagnostic(message: string): string | null {
  const exact = englishApplicationMessages[message];
  if (exact) return exact;
  const exactError = englishApplicationErrors[message];
  if (exactError) return exactError;
  if (
    message ===
    "今天的 Daily Record 缺少有效 frontmatter。请修复 type 和 date，然后刷新 Today。"
  ) {
    return "The Daily Record is missing valid frontmatter. Repair type and date, then refresh Today.";
  }
  const identity = /^今天的 Daily Record 身份与 (\d{4}-\d{2}-\d{2}) 不一致。请修复 type 和 date，然后刷新 Today。$/.exec(message);
  if (identity) {
    return `The Daily Record identity does not match ${identity[1]}. Repair type and date, then refresh Today.`;
  }
  const duplicate = /^今天的 Daily Record 包含多个“(.+)”段落。请合并重复段落，然后刷新 Today。$/.exec(message);
  if (duplicate) {
    const heading = englishDailyRecordHeadings[duplicate[1]] ?? duplicate[1];
    return `The Daily Record contains multiple “${heading}” sections. Merge the duplicates, then refresh Today.`;
  }
  const duplicateBaseline = /^今天的 Daily Record 在“早间基准”中包含多个“(.+)”段落。请合并重复段落，然后刷新 Today。$/.exec(message);
  if (duplicateBaseline) {
    const heading = englishDailyRecordHeadings[duplicateBaseline[1]] ?? duplicateBaseline[1];
    return `The Daily Record contains multiple “${heading}” sections inside “Morning baseline”. Merge the duplicates, then refresh Today.`;
  }
  const empty = /^(.+)不能为空。$/.exec(message);
  if (empty) {
    return `${englishDiagnosticLabels[empty[1]] ?? empty[1]} cannot be empty.`;
  }
  const tooLong = /^(.+)只能是一条不超过 500 字的简短内容。$/.exec(message);
  if (tooLong) {
    return `${englishDiagnosticLabels[tooLong[1]] ?? tooLong[1]} must be a single short entry of no more than 500 characters.`;
  }
  const taskTooLong = /^任务文字只能是一条不超过 160 字的内容。$/.exec(message);
  if (taskTooLong) {
    return "Task text must be one line of no more than 160 characters.";
  }
  const staleTask = /^(\d{4}-\d{2}-\d{2}) 的任务已在外部发生变化。操作仍可重试；请刷新后再保存，外部内容未被覆盖。$/.exec(message);
  if (staleTask) {
    return `Tasks for ${staleTask[1]} changed externally. The operation remains retryable; refresh before saving again. External content was not overwritten.`;
  }
  const invalidTaskJson = /^当天任务正本不是有效 JSON：(.+)$/.exec(message);
  if (invalidTaskJson) return `The canonical day-task document is not valid JSON: ${invalidTaskJson[1]}`;
  const taskRead = /^无法读取当天任务正本：(.+)$/.exec(message);
  if (taskRead) return `Could not read the canonical day-task document: ${taskRead[1]}`;
  const unsupportedTaskSchema = /^当天任务正本使用不支持的 schema 版本 (\d+)；未将其当作空任务。$/.exec(message);
  if (unsupportedTaskSchema) {
    return `The canonical day-task document uses unsupported schema version ${unsupportedTaskSchema[1]}; it was not treated as empty.`;
  }
  const taskDateMismatch = /^当天任务正本归属 ([\s\S]*)，与所选日期 (\d{4}-\d{2}-\d{2}) 不一致。$/.exec(message);
  if (taskDateMismatch) {
    return `The canonical day-task document belongs to ${taskDateMismatch[1]}, not the selected date ${taskDateMismatch[2]}.`;
  }
  const invalidTaskTimestamp = /^当天任务正本包含无效时间戳：([\s\S]*)$/.exec(message);
  if (invalidTaskTimestamp) {
    return `The canonical day-task document contains an invalid timestamp: ${invalidTaskTimestamp[1]}`;
  }
  const encodedTask = /^无法编码当天任务正本：(.+)$/.exec(message);
  if (encodedTask) return `Could not encode the canonical day-task document: ${encodedTask[1]}`;
  const taskRecovery = /^当天任务正本在保存边界发生了并发变化。未静默丢弃交错内容；恢复副本保存在 (.+)。请检查后刷新当天任务。$/.exec(message);
  if (taskRecovery) {
    return `The canonical day-task document changed at the save boundary. Interleaved content was not silently discarded; a recovery snapshot remains at ${taskRecovery[1]}. Inspect it, then refresh day tasks.`;
  }
  const invalidIdentifier = /^(.+)格式无效；未写入任何内容。$/.exec(message);
  if (invalidIdentifier) {
    return `${englishDiagnosticLabels[invalidIdentifier[1]] ?? invalidIdentifier[1]} has an invalid format; nothing was written.`;
  }
  const markerMissing = /^Daily Record 的 Dashboard 标记缺少 (.+)。$/.exec(message);
  if (markerMissing) return `The Daily Record Dashboard marker is missing ${markerMissing[1]}.`;
  const markerInvalid = /^Daily Record 的 Dashboard 标记包含无效的 (.+) 值。$/.exec(message);
  if (markerInvalid) return `The Daily Record Dashboard marker contains an invalid ${markerInvalid[1]} value.`;
  const datedExternal = /^(\d{4}-\d{2}-\d{2}) 的 Daily Record 已在外部发生变化。草稿仍保留；请刷新后再保存，外部内容未被覆盖。$/.exec(message);
  if (datedExternal) {
    return `${datedExternal[1]}'s Daily Record changed externally. The draft is preserved; refresh before saving again, and external content was not overwritten.`;
  }
  const duplicateWriteSection = /^(?:该日期|今天)的 Daily Record 包含多个“(.+)”段落。请先合并重复段落；未写入任何内容。$/.exec(message);
  if (duplicateWriteSection) {
    const heading = englishDailyRecordHeadings[duplicateWriteSection[1]] ?? duplicateWriteSection[1];
    return `The Daily Record contains multiple “${heading}” sections. Merge the duplicates first; nothing was written.`;
  }
  const concurrentRecovery = /^今天的 Daily Record 在保存边界发生了并发变化。未静默丢弃交错内容；恢复副本保存在 (.+)。请在 Obsidian 中检查后刷新 Today。$/.exec(message);
  if (concurrentRecovery) {
    return `Today's Daily Record changed concurrently at the save boundary. Interleaved content was not silently discarded; a recovery copy is stored at ${concurrentRecovery[1]}. Inspect it in Obsidian, then refresh Today.`;
  }
  return null;
}

function englishHabitValidationDiagnostic(message: string): string | null {
  const readPrefix = "无法读取 Habits 快照：";
  if (message.startsWith(readPrefix)) {
    const diagnostic = message.slice(readPrefix.length);
    return `Could not read the Habits snapshot: ${
      englishHabitValidationDiagnostic(diagnostic) ?? diagnostic
    }`;
  }
  const exact: Readonly<Record<string, string>> = {
    "Habits 快照 generatedAt 必须是含 UTC offset 的完整本地时间。":
      "Habits snapshot generatedAt must be a complete local timestamp with a UTC offset.",
    "Habits 快照 generatedAt 不能晚于当前本地日期。":
      "Habits snapshot generatedAt cannot be later than the current local date.",
    "Habits 快照 range.from 不是有效日期。":
      "Habits snapshot range.from is not a valid date.",
    "Habits 快照 range.to 不是有效日期。":
      "Habits snapshot range.to is not a valid date.",
    "weekly-count standard 必须大于 0；无目标请使用 null。":
      "weekly-count standard must be greater than 0; use null for no goal.",
    "daily-time standard 必须是 HH:mm。":
      "daily-time standard must use HH:mm.",
  };
  if (exact[message]) return exact[message];
  const patterns: readonly Readonly<[RegExp, (...values: string[]) => string]>[] = [
    [/^Habits 快照不是有效的 schema v1 JSON：(.+)$/, (reason) => `Habits snapshot is not valid schema-v1 JSON: ${reason}`],
    [/^Habits 快照 schemaVersion (.+) 不受支持；当前只读取版本 1。$/, (version) => `Habits snapshot schemaVersion ${version} is unsupported; only version 1 can be read.`],
    [/^Habits 快照范围必须从 (.+) 开始并在今天之前结束；收到 (.+) — (.+)。$/, (expected, from, to) => `Habits snapshot range must start at ${expected} and end no later than today; received ${from} — ${to}.`],
    [/^Habits 快照包含重复 source key：(.+)。$/, (key) => `Habits snapshot contains duplicate source key: ${key}.`],
    [/^Habits 快照包含重复 habit key：(.+)。$/, (key) => `Habits snapshot contains duplicate habit key: ${key}.`],
    [/^Habit (.+) 的 trackingKind 与当前 goal 类型不一致。$/, (habit) => `Habit ${habit} has a trackingKind that does not match its current goal type.`],
    [/^Habit (.+) 的历史目标周日期无效。$/, (habit) => `Habit ${habit} has an invalid historical-goal week date.`],
    [/^Habit (.+) 的历史目标必须使用过去周一。$/, (habit) => `Habit ${habit} historical goals must use a past Monday.`],
    [/^Habit (.+) 有重复历史目标周。$/, (habit) => `Habit ${habit} has a duplicate historical-goal week.`],
    [/^Habit (.+) 有无效 livedDate。$/, (habit) => `Habit ${habit} has an invalid livedDate.`],
    [/^Habit (.+) 的 livedDate 超出快照范围。$/, (habit) => `Habit ${habit} has a livedDate outside the snapshot range.`],
    [/^Habit (.+) 有重复 livedDate。$/, (habit) => `Habit ${habit} has a duplicate livedDate.`],
    [/^Habit (.+) 引用了未声明来源 (.+)。$/, (habit, source) => `Habit ${habit} references undeclared source ${source}.`],
    [/^Habit (.+) 的 observedAt 缺少有效 UTC offset。$/, (habit) => `Habit ${habit} has an observedAt without a valid UTC offset.`],
    [/^Habit (.+) 的 observedAt 晚于快照 generatedAt。$/, (habit) => `Habit ${habit} has an observedAt later than snapshot generatedAt.`],
    [/^Habit (.+) 的同一来源在同一天有相同 observedAt；无法判断替换顺序。$/, (habit) => `Habit ${habit} has identical observedAt values from one source on the same day, so replacement order cannot be determined.`],
    [/^Habit (.+) 的 observation status 与 trackingKind 不一致。$/, (habit) => `Habit ${habit} has an observation status that does not match its trackingKind.`],
    [/^Habit (.+) 的 actualTime\.occurredOn 无效。$/, (habit) => `Habit ${habit} has an invalid actualTime.occurredOn.`],
    [/^Habit (.+) 的 actualTime\.localTime 必须是 HH:mm。$/, (habit) => `Habit ${habit} actualTime.localTime must use HH:mm.`],
    [/^Habit (.+) 的 actualTime 不符合 lived-day 归属。$/, (habit) => `Habit ${habit} actualTime does not match its lived-day attribution.`],
    [/^Habit (.+) 的 actual-time 必须带 explicit-time 证据。$/, (habit) => `Habit ${habit} actual-time must include explicit-time evidence.`],
    [/^Habit (.+) 只有 actual-time 可以携带 actualTime。$/, (habit) => `Habit ${habit} may include actualTime only for actual-time status.`],
    [/^Habit (.+) 的 threshold-met 必须保留阈值证据。$/, (habit) => `Habit ${habit} threshold-met must retain threshold evidence.`],
    [/^Habit (.+) 的完成结果必须带 check-in 或 manual-completion 证据。$/, (habit) => `Habit ${habit} completion results must include check-in or manual-completion evidence.`],
    [/^Habits 快照 (.+) 必须是稳定的小写语义 key。$/, (label) => `Habits snapshot ${label} must be a stable lowercase semantic key.`],
    [/^Habits 快照 (.+) 缺失或过长。$/, (label) => `Habits snapshot ${label} is missing or too long.`],
  ];
  for (const [pattern, render] of patterns) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  return null;
}

const englishErrorFragments: readonly Readonly<[string, string]>[] = [
  ["Vault 不兼容：", "Incompatible Vault: "],
  ["需要 Obsidian Vault 标记和 life/Journal/Daily 目录", "an Obsidian Vault marker and life/Journal/Daily directory are required"],
  ["所选 Vault 文件夹不可用", "The selected Vault folder is unavailable"],
  ["当前 Vault 文件夹不可用。请检查本地位置，或重新选择 Vault。", "The current Vault folder is unavailable. Check the local location or choose another Vault."],
  ["无法读取 Habits 快照：", "Could not read the Habits snapshot: "],
  ["Habits 快照缓存不可用。", "The Habits snapshot cache is unavailable."],
  ["原有选择未更改，未转换或写入任何文件。", "The previous selection was kept; no files were converted or written."],
  ["请重新选择兼容 Vault", "Choose a compatible Vault again"],
  ["未转换或写入任何文件。", "No files were converted or written."],
  ["未写入任何内容。", "Nothing was written."],
  ["草稿仍保留", "The draft is preserved"],
  ["请刷新后重试", "Refresh and try again"],
  ["当天任务正本不是有效 JSON：", "The canonical day-task document is not valid JSON: "],
  ["当天任务正本使用不支持的 schema 版本", "The canonical day-task document uses unsupported schema version "],
  ["未将其当作空任务", "It was not treated as an empty task list"],
  ["操作仍可重试", "The operation remains retryable"],
  ["外部内容未被覆盖", "External content was not overwritten"],
  ["；任务操作仍可重试，未写入任何内容。", "; the task operation remains retryable and nothing was written."],
];

const chineseErrorPrefixes: readonly Readonly<[string, string]>[] = [
  ["Could not read the app-owned background image: ", "无法读取应用自有的背景图片："],
  ["Could not read the selected background image: ", "无法读取所选背景图片："],
  ["Could not import the background image: ", "无法导入背景图片："],
  ["Could not remove the app-owned background image: ", "无法移除应用自有的背景图片："],
  ["Could not update the pending background-image cleanup record: ", "无法更新待清理背景图片记录："],
  ["Could not read the local interface language: ", "无法读取本机界面语言："],
  ["Could not save the interface language: ", "无法保存本机界面语言："],
  ["Could not encode the local interface language: ", "无法编码本机界面语言："],
  ["Could not read the local appearance preference: ", "无法读取本机外观偏好："],
  ["Could not save the appearance preference: ", "无法保存本机外观偏好："],
  ["Could not encode the local appearance preference: ", "无法编码本机外观偏好："],
  ["Could not read the Today workspace setting: ", "无法读取 Today 工作区设置："],
  ["Could not encode the Today workspace setting: ", "无法编码 Today 工作区设置："],
  ["Could not locate the app data directory: ", "无法定位应用数据目录："],
  ["Could not create the profile directory: ", "无法创建应用配置目录："],
  ["Could not read today's daily record: ", "无法读取今天的 Daily Record："],
  ["Could not re-read today's daily record: ", "无法重新读取今天的 Daily Record："],
  ["Could not create the Daily Record directory: ", "无法创建 Daily Record 目录："],
  ["Could not prepare the new Daily Record: ", "无法准备新的 Daily Record："],
  ["Could not exclusively activate the new Daily Record: ", "无法以独占方式启用新的 Daily Record："],
  ["Could not inspect today's daily record permissions: ", "无法检查今天的 Daily Record 权限："],
  ["Could not preserve today's daily record permissions: ", "无法保留今天的 Daily Record 权限："],
  ["Could not write today's daily record update: ", "无法写入今天的 Daily Record 更新："],
  ["Could not prepare today's daily record update: ", "无法准备今天的 Daily Record 更新："],
  ["Could not sync today's daily record directory: ", "无法同步今天的 Daily Record 目录："],
  ["Could not re-read the day-task document: ", "无法重新读取当天任务正本："],
  ["Could not create the day-task document directory: ", "无法创建当天任务正本目录："],
  ["Could not prepare the new day-task document: ", "无法准备新的当天任务正本："],
  ["Could not exclusively activate the new day-task document: ", "无法以独占方式启用新的当天任务正本："],
  ["Could not inspect the day-task document permissions: ", "无法检查当天任务正本权限："],
  ["Could not preserve the day-task document permissions: ", "无法保留当天任务正本权限："],
  ["Could not write the day-task document update: ", "无法写入当天任务正本更新："],
  ["Could not prepare the day-task document update: ", "无法准备当天任务正本更新："],
  ["Could not create the day-task recovery directory; no write was attempted: ", "无法创建当天任务恢复目录；未尝试写入："],
  ["Could not create the day-task recovery directory: ", "无法创建当天任务恢复目录："],
  ["Could not create a day-task recovery snapshot nonce: ", "无法创建当天任务恢复快照 nonce："],
  ["Could not create a day-task update nonce: ", "无法创建当天任务更新 nonce："],
  ["Could not create a day-task conflict snapshot nonce: ", "无法创建当天任务冲突快照 nonce："],
  ["Could not preserve the day-task document inode actually displaced during activation: ", "无法保留启用时实际移出的当天任务正本 inode："],
  ["Could not preserve the concurrent day-task snapshot: ", "无法保留并发当天任务快照："],
  ["Could not finalize the day-task conflict recovery snapshot: ", "无法完成当天任务冲突恢复快照："],
  ["Could not remove the completed day-task snapshot: ", "无法移除已完成的当天任务快照："],
  ["Could not verify the day-task document after conflict rollback: ", "无法在冲突回滚后验证当天任务正本："],
  ["Could not verify the rejected day-task candidate: ", "无法验证被拒绝的当天任务候选："],
  ["Could not remove the rejected day-task candidate: ", "无法移除被拒绝的当天任务候选："],
  ["Could not atomically exchange the day-task document: ", "无法原子交换当天任务正本："],
  ["Could not sync the day-task document directory: ", "无法同步当天任务正本目录："],
  ["The local appearance preference is invalid: ", "本机外观偏好无效："],
  ["The Today workspace setting is invalid: ", "Today 工作区设置无效："],
  ["Could not create the Daily Record recovery directory; no write was attempted: ", "无法创建 Daily Record 恢复目录；未尝试写入："],
  ["Could not create the Daily Record recovery directory: ", "无法创建 Daily Record 恢复目录："],
  ["Could not create a recovery snapshot nonce: ", "无法创建恢复快照 nonce："],
  ["Could not create a daily record update nonce: ", "无法创建 Daily Record 更新 nonce："],
  ["Could not create a conflict snapshot nonce: ", "无法创建冲突快照 nonce："],
  ["Could not preserve the Daily Record inode actually displaced during activation: ", "无法保留启用时实际移出的 Daily Record inode："],
  ["Could not preserve the concurrent daily record snapshot: ", "无法保留并发 Daily Record 快照："],
  ["Could not finalize the conflict recovery snapshot: ", "无法完成冲突恢复快照："],
  ["Could not remove the completed daily record snapshot: ", "无法移除已完成的 Daily Record 快照："],
  ["Could not verify today's daily record after conflict rollback: ", "无法在冲突回滚后验证今天的 Daily Record："],
  ["Could not verify the rejected daily record candidate: ", "无法验证被拒绝的 Daily Record 候选："],
  ["Could not remove the rejected daily record candidate: ", "无法移除被拒绝的 Daily Record 候选："],
  ["Could not atomically exchange today's daily record: ", "无法原子交换今天的 Daily Record："],
];

const chineseApplicationErrors: Readonly<Record<string, string>> = {
  "Background image selection is unavailable.": "背景图片选择目前不可用。",
  "Background image storage is unavailable.": "背景图片存储目前不可用。",
  "The selected background image is unavailable.": "所选背景图片不可用。",
  "The selected background image is empty or larger than 20 MB.": "所选背景图片为空或大于 20 MB。",
  "The selected background image is not a supported PNG, JPEG, GIF, or WebP file.": "所选背景图片不是受支持的 PNG、JPEG、GIF 或 WebP 文件。",
  "The selected background image could not be decoded.": "无法解码所选背景图片。",
  "The app-owned background image name is invalid.": "应用自有的背景图片名称无效。",
  "The local appearance preference has no parent directory.": "本机外观偏好没有父目录。",
  "The selected date is not a valid YYYY-MM-DD calendar date.":
    "所选日期不是有效的 YYYY-MM-DD 日历日期。",
  "The system clock did not provide a valid calendar date.":
    "系统时钟未提供有效的日历日期。",
  "The Daily Record has no parent directory.":
    "Daily Record 没有父目录。",
  "The temporary daily record path contains a NUL byte.":
    "临时 Daily Record 路径包含 NUL 字节。",
  "The daily record path contains a NUL byte.":
    "Daily Record 路径包含 NUL 字节。",
  "Today's Daily Record has no location for a same-volume recovery snapshot.":
    "今天的 Daily Record 没有可用于同卷恢复快照的位置。",
  "Today's daily record has no parent directory.":
    "今天的 Daily Record 没有父目录。",
  "Could not reserve a unique temporary daily record path.":
    "无法保留唯一的临时 Daily Record 路径。",
  "Could not reserve a unique recovery path for the Daily Record inode actually displaced during activation.":
    "无法为启用时实际移出的 Daily Record inode 保留唯一恢复路径。",
  "Could not reserve a unique daily record conflict snapshot path.":
    "无法保留唯一的 Daily Record 冲突快照路径。",
  "The local appearance preference uses an unsupported schema version.":
    "本机外观偏好使用了不受支持的 schema 版本。",
  "The Today workspace setting uses an unsupported schema version.":
    "Today 工作区设置使用了不受支持的 schema 版本。",
  "The selected vault folder is unavailable.":
    "所选 Vault 文件夹不可用。",
  "The selected calendar month is invalid.":
    "所选日历月份无效。",
  "Atomic conditional Daily Record replacement is currently supported only on macOS.":
    "Daily Record 原子条件替换目前仅支持 macOS。",
  "The day-task document has no parent directory.": "当天任务正本没有父目录。",
  "The temporary day-task document path contains a NUL byte.": "临时当天任务正本路径包含 NUL 字节。",
  "The day-task document path contains a NUL byte.": "当天任务正本路径包含 NUL 字节。",
  "The day-task document has no location for a same-volume recovery snapshot.":
    "当天任务正本没有可用于同卷恢复快照的位置。",
  "Could not reserve a unique temporary day-task document path.":
    "无法保留唯一的临时当天任务正本路径。",
  "Could not reserve a unique recovery path for the day-task document inode actually displaced during activation.":
    "无法为启用时实际移出的当天任务正本 inode 保留唯一恢复路径。",
  "Could not reserve a unique day-task conflict snapshot path.":
    "无法保留唯一的当天任务冲突快照路径。",
  "Atomic conditional day-task replacement is currently supported only on macOS.":
    "当天任务原子条件替换目前仅支持 macOS。",
};

function chineseDayTaskStorageDiagnostic(message: string): string | null {
  const complete = /^(.+); the complete new day-task document is present at (.+) and can be verified by refreshing$/.exec(message);
  if (complete) return `${localizeApplicationError(complete[1], "zh")}；完整的新当天任务正本位于 ${complete[2]}，可通过刷新验证`;
  const active = /^The new day-task document is active, but its temporary hard link remains at (.+): (.+)$/.exec(message);
  if (active) return `新的当天任务正本已启用，但临时硬链接仍保留在 ${active[1]}：${active[2]}`;
  const rolledBack = /^(.+); activation was rolled back and the rejected day-task candidate remains at (.+)$/.exec(message);
  if (rolledBack) return `${localizeApplicationError(rolledBack[1], "zh")}；启用已回滚，被拒绝的当天任务候选仍保留在 ${rolledBack[2]}`;
  const rollbackFailed = /^(.+); rollback also failed \((.+)\); the actual displaced day-task document inode remains linked at (.+)$/.exec(message);
  if (rollbackFailed) return `${localizeApplicationError(rollbackFailed[1], "zh")}；回滚也失败（${localizeApplicationError(rollbackFailed[2], "zh")}）；实际移出的当天任务正本 inode 仍链接在 ${rollbackFailed[3]}`;
  const displaced = /^Could not verify the displaced day-task document after atomic exchange; its durable recovery link remains at (.+): (.+)$/.exec(message);
  if (displaced) return `原子交换后无法验证移出的当天任务正本；其持久恢复链接仍保留在 ${displaced[1]}：${displaced[2]}`;
  const activeRecovery = /^Could not verify the day-task document after atomic exchange; the actual displaced inode remains recoverable at (.+): (.+)$/.exec(message);
  if (activeRecovery) return `原子交换后无法验证当天任务正本；实际移出的 inode 仍可在 ${activeRecovery[1]} 恢复：${activeRecovery[2]}`;
  const displacedExternal = /^(.+); the displaced external day-task document remains at (.+) for recovery$/.exec(message);
  if (displacedExternal) return `${localizeApplicationError(displacedExternal[1], "zh")}；移出的外部当天任务正本仍保留在 ${displacedExternal[2]} 以供恢复`;
  return null;
}

function chineseDailyRecordDiagnostic(message: string): string | null {
  const completeNewRecord = /^(.+); the complete new Daily Record is present at (.+) and can be verified by refreshing$/.exec(message);
  if (completeNewRecord) {
    return `${localizeApplicationError(completeNewRecord[1], "zh")}；完整的新 Daily Record 位于 ${completeNewRecord[2]}，可通过刷新验证`;
  }
  const activeHardLink = /^The new Daily Record is active, but its temporary hard link remains at (.+): (.+)$/.exec(message);
  if (activeHardLink) {
    return `新的 Daily Record 已启用，但临时硬链接仍保留在 ${activeHardLink[1]}：${activeHardLink[2]}`;
  }
  const rolledBack = /^(.+); activation was rolled back and the rejected Dashboard candidate remains at (.+)$/.exec(message);
  if (rolledBack) {
    return `${localizeApplicationError(rolledBack[1], "zh")}；启用已回滚，被拒绝的 Dashboard 候选仍保留在 ${rolledBack[2]}`;
  }
  const rollbackFailed = /^(.+); rollback also failed \((.+)\); the actual displaced Daily Record inode remains linked at (.+)$/.exec(message);
  if (rollbackFailed) {
    return `${localizeApplicationError(rollbackFailed[1], "zh")}；回滚也失败（${localizeApplicationError(rollbackFailed[2], "zh")}）；实际移出的 Daily Record inode 仍链接在 ${rollbackFailed[3]}`;
  }
  const displacedRecovery = /^Could not verify the displaced daily record after atomic exchange; its durable recovery link remains at (.+): (.+)$/.exec(message);
  if (displacedRecovery) {
    return `原子交换后无法验证移出的 Daily Record；其持久恢复链接仍保留在 ${displacedRecovery[1]}：${displacedRecovery[2]}`;
  }
  const activeRecovery = /^Could not verify today's daily record after atomic exchange; the actual displaced inode remains recoverable at (.+): (.+)$/.exec(message);
  if (activeRecovery) {
    return `原子交换后无法验证今天的 Daily Record；实际移出的 inode 仍可在 ${activeRecovery[1]} 恢复：${activeRecovery[2]}`;
  }
  const displacedExternal = /^(.+); the displaced external record remains at (.+) for recovery$/.exec(message);
  if (displacedExternal) {
    return `${localizeApplicationError(displacedExternal[1], "zh")}；移出的外部记录仍保留在 ${displacedExternal[2]} 以供恢复`;
  }
  return null;
}

export function localizeApplicationError(
  error: string,
  language: InterfaceLanguage,
): string {
  if (language === "zh") {
    const exact = chineseApplicationErrors[error];
    if (exact) return exact;
    const dailyRecordDiagnostic = chineseDailyRecordDiagnostic(error);
    if (dailyRecordDiagnostic) return dailyRecordDiagnostic;
    const dayTaskStorageDiagnostic = chineseDayTaskStorageDiagnostic(error);
    if (dayTaskStorageDiagnostic) return dayTaskStorageDiagnostic;
    const prefix = chineseErrorPrefixes.find(([source]) => error.startsWith(source));
    if (prefix) return `${prefix[1]}${error.slice(prefix[0].length)}`;
    const localWrite = /^Could not (prepare|write|activate) the local (appearance preference|interface language|Today workspace setting|background image): (.+)$/.exec(error);
    if (localWrite) {
      const action = { prepare: "准备", write: "写入", activate: "启用" }[localWrite[1]];
      const document = {
        "appearance preference": "本机外观偏好",
        "interface language": "本机界面语言",
        "Today workspace setting": " Today 工作区设置",
        "background image": "背景图片",
      }[localWrite[2]];
      return `无法${action}${document}：${localWrite[3]}`;
    }
    const selectedRead = /^Could not (inspect|read) the selected (.+): (.+)$/.exec(error);
    if (selectedRead) {
      const action = selectedRead[1] === "inspect" ? "检查" : "读取";
      return `无法${action}所选 ${selectedRead[2]}：${selectedRead[3]}`;
    }
    return error;
  }
  const fixedDiagnostic = englishApplicationDiagnostic(error);
  if (fixedDiagnostic) return fixedDiagnostic;
  const habitDiagnostic = englishHabitValidationDiagnostic(error);
  if (habitDiagnostic) return habitDiagnostic;
  const translated = englishErrorFragments.reduce(
    (message, [source, replacement]) => message.replaceAll(source, replacement),
    error,
  );
  return translated;
}

export function localizeApplicationMessage(
  message: string,
  language: InterfaceLanguage,
): string {
  if (language === "zh") return message;
  const fixedDiagnostic = englishApplicationDiagnostic(message);
  if (fixedDiagnostic) return fixedDiagnostic;
  const missingRecord = /^(\d{4}-\d{2}-\d{2}) 还没有 Daily Record。只有明确保存一句记录时才会建立最小记录。$/.exec(message);
  if (missingRecord) {
    return `${missingRecord[1]} has no Daily Record. A minimal record is created only when you explicitly save a short note.`;
  }
  if (message.startsWith("Vault 不兼容：")) {
    return localizeApplicationError(message, language);
  }
  if (message.startsWith("刷新失败，继续显示上个有效快照：")) {
    return `Refresh failed; continuing to show the last valid snapshot: ${localizeApplicationError(message.slice("刷新失败，继续显示上个有效快照：".length), language)}`;
  }
  if (message.startsWith("Habits 快照无效；没有可保留的旧读数：")) {
    return `The Habits snapshot is invalid and there is no previous valid reading to retain: ${localizeApplicationError(message.slice("Habits 快照无效；没有可保留的旧读数：".length), language)}`;
  }
  return message;
}

export type HabitDetail =
  | Readonly<{ kind: "future" }>
  | Readonly<{
      kind: "observation";
      sourceLabel: string;
      status:
        | "completed"
        | "not-done"
        | "partial"
        | "baseline"
        | "unavailable"
        | "actual-time"
        | "threshold-met";
      evidence:
        | "check-in"
        | "manual-completion"
        | "explicit-time"
        | "threshold-check-in";
      observedAt: string;
      note: string | null;
    }>
  | Readonly<{
      kind: "actualTime";
      dayRelation: "same-day" | "next-day" | "unresolved";
      localTime: string;
      utcOffsetMinutes: number | null;
    }>
  | Readonly<{ kind: "localRecord"; sourceLabel: string; text: string }>
  | Readonly<{ kind: "conflict" }>
  | Readonly<{ kind: "noRecord" }>;

export function localizeHabitDetail(
  detail: HabitDetail,
  language: InterfaceLanguage,
): string {
  if (detail.kind === "future") {
    return language === "zh" ? "未来日期 · unknown" : "Future date · unknown";
  }
  if (detail.kind === "conflict") {
    return language === "zh"
      ? "来源冲突 · 暂不计入完成次数"
      : "Source conflict · excluded from completion counts";
  }
  if (detail.kind === "noRecord") {
    return language === "zh"
      ? "未读取或没有记录 · unknown，不等于 not_done"
      : "Not read or not recorded · unknown, not not_done";
  }
  if (detail.kind === "localRecord") {
    const label = language === "zh" ? "文字记录" : "text record";
    return `${detail.sourceLabel} · ${label} · ${detail.text}`;
  }
  if (detail.kind === "actualTime") {
    const relation = {
      "same-day": "",
      "next-day": language === "zh" ? "次日 " : "next day ",
      unresolved: language === "zh" ? "待解释 " : "unresolved ",
    }[detail.dayRelation];
    const offset = detail.utcOffsetMinutes === null
      ? language === "zh" ? "未知" : "unknown"
      : language === "zh"
        ? `${detail.utcOffsetMinutes} 分钟`
        : `${detail.utcOffsetMinutes} minutes`;
    const label = language === "zh" ? "明确时刻" : "Exact time";
    return `${label} ${relation}${detail.localTime} · UTC offset ${offset}`;
  }

  const statuses = language === "zh"
    ? {
        completed: "completed",
        "not-done": "not_done",
        partial: "partial · 不计次",
        baseline: "baseline · 不计次",
        unavailable: "unavailable",
        "actual-time": "actual_time",
        "threshold-met": "threshold_met · 不编造分钟",
      }
    : {
        completed: "completed",
        "not-done": "not_done",
        partial: "partial · excluded from counts",
        baseline: "baseline · excluded from counts",
        unavailable: "unavailable",
        "actual-time": "actual_time",
        "threshold-met": "threshold_met · minutes not inferred",
      };
  const evidenceKinds = language === "zh"
    ? {
        "check-in": "打卡证据",
        "manual-completion": "人工明确补报",
        "explicit-time": "明确时刻证据",
        "threshold-check-in": "阈值打卡证据",
      }
    : {
        "check-in": "check-in evidence",
        "manual-completion": "explicit manual report",
        "explicit-time": "exact-time evidence",
        "threshold-check-in": "threshold check-in evidence",
      };
  const observedAt = language === "zh" ? "observedAt" : "Observed at";
  const note = detail.note === null ? "" : ` · ${detail.note}`;
  return `${detail.sourceLabel} · ${statuses[detail.status]} · ${
    evidenceKinds[detail.evidence]
  } · ${observedAt} ${detail.observedAt}${note}`;
}

export function localizeHabitActualTimeLabel(
  label: string,
  language: InterfaceLanguage,
): string {
  if (language === "zh") return label;
  return label.replace(/^次日 /, "Next day ");
}

export function localizeHabitGoalLabel(
  label: string,
  language: InterfaceLanguage,
): string {
  if (language === "zh") return label;
  const weekly = /^每周 (\d+) 次$/.exec(label);
  if (weekly) return `${weekly[1]} times per week`;
  const nextDay = /^每日 次日 (.+)$/.exec(label);
  if (nextDay) return `Daily by ${nextDay[1]} next day`;
  const unresolved = /^每日 (.+) · 日期归属待解释$/.exec(label);
  if (unresolved) return `Daily ${unresolved[1]} · date attribution unresolved`;
  const daily = /^每日 (.+)$/.exec(label);
  if (daily) return `Daily ${daily[1]}`;
  if (label === "未配置目标 · 不计入汇总") return "No goal · Excluded from summary";
  return label;
}

export function localizeHabitCoverageLabel(
  label: string,
  language: InterfaceLanguage,
): string {
  if (language === "zh") return label;
  return label.replace(/ · (\d+) 个 complete 日期$/, " · $1 complete dates");
}

export function interfaceCopy(
  key: InterfaceCopyKey,
  language: InterfaceLanguage,
  variables: Readonly<Record<string, string | number>> = {},
): string {
  return Object.entries(variables).reduce(
    (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)),
    interfaceCopies[key][language] as string,
  );
}

type LocalizableElement = {
  dataset: {
    i18n?: string;
    i18nVariables?: string;
    i18nError?: string;
    applicationMessage?: string;
  };
  textContent: string | null;
  getAttribute?(name: string): string | null;
  setAttribute?(name: string, value: string): void;
};

type InterfaceLanguageRoot = {
  documentElement: { lang: string };
  querySelectorAll(selector: string): Iterable<LocalizableElement>;
};

function variablesFor(
  element: LocalizableElement,
  language: InterfaceLanguage,
): Readonly<Record<string, string | number>> {
  let variables: Readonly<Record<string, string | number>> = {};
  if (!element.dataset.i18nVariables) return {};
  try {
    variables = JSON.parse(element.dataset.i18nVariables) as Record<string, string | number>;
  } catch {
    variables = {};
  }
  return element.dataset.i18nError
    ? { ...variables, error: localizeApplicationError(element.dataset.i18nError, language) }
    : variables;
}

export function setInterfaceCopy(
  element: LocalizableElement | null,
  key: InterfaceCopyKey,
  language: InterfaceLanguage,
  variables: Readonly<Record<string, string | number>> = {},
): void {
  if (!element) return;
  delete element.dataset.applicationMessage;
  delete element.dataset.i18nError;
  element.dataset.i18n = key;
  element.dataset.i18nVariables = JSON.stringify(variables);
  element.textContent = interfaceCopy(key, language, variables);
}

export function setInterfaceError(
  element: LocalizableElement | null,
  key: InterfaceCopyKey,
  error: string,
  language: InterfaceLanguage,
): void {
  if (!element) return;
  setInterfaceCopy(element, key, language);
  element.dataset.i18nError = error;
  element.textContent = interfaceCopy(key, language, {
    error: localizeApplicationError(error, language),
  });
}

export function setApplicationMessage(
  element: LocalizableElement | null,
  message: string,
  language: InterfaceLanguage,
): void {
  if (!element) return;
  delete element.dataset.i18n;
  delete element.dataset.i18nVariables;
  delete element.dataset.i18nError;
  element.dataset.applicationMessage = message;
  element.textContent = localizeApplicationMessage(message, language);
}

export function applyInterfaceLanguage(
  language: InterfaceLanguage,
  root: InterfaceLanguageRoot = document,
): void {
  root.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  for (const element of root.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (key && key in interfaceCopies) {
      element.textContent = interfaceCopy(
        key as InterfaceCopyKey,
        language,
        variablesFor(element, language),
      );
    }
  }
  for (const element of root.querySelectorAll("[data-application-message]")) {
    const message = element.dataset.applicationMessage;
    if (message) element.textContent = localizeApplicationMessage(message, language);
  }
  for (const attribute of ["aria-label", "title", "placeholder"] as const) {
    const dataAttribute = `data-i18n-${attribute}`;
    for (const element of root.querySelectorAll(`[${dataAttribute}]`)) {
      const key = element.getAttribute?.(dataAttribute);
      if (key && key in interfaceCopies) {
        element.setAttribute?.(
          attribute,
          interfaceCopy(key as InterfaceCopyKey, language, variablesFor(element, language)),
        );
      }
    }
  }
}
