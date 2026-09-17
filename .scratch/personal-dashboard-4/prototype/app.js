// THROWAWAY PERSONAL DASHBOARD 4.0 PROTOTYPE
// This prototype deliberately reuses the current Personal Dashboard workspace
// shell. The only new destination is Tasks; Today, Calendar, and Habits keep
// their existing composition and visual language.

const DEMO_TODAY = "2026-09-19";
const DEMO_MONTH = "2026-09";
const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VARIANTS = new Set(["A", "B", "C"]);

const initialLists = [
  { id: "inbox", name: "收集箱", en: "Inbox", archived: false },
  { id: "home", name: "生活维护", en: "Home care", archived: false },
  { id: "work", name: "工作推进", en: "Work", archived: false },
  { id: "learning", name: "学习与阅读", en: "Learning", archived: false },
  { id: "august", name: "8 月其他", en: "August others", archived: true },
];

const initialTasks = [
  {
    id: "t-laundry",
    name: "洗衣服",
    content: "晚饭后把床单和运动衣一起洗；不需要为了完成它挤掉休息。",
    date: "2026-09-17",
    time: "18:30",
    listId: "home",
    state: "completed",
    completedAt: "2026-09-19 19:40",
    trace: [
      { at: "2026-09-17 18:30", text: "任务日期设为 9 月 17 日" },
      { at: "2026-09-19 19:40", text: "完成；实际完成日晚于任务日期，Calendar 仍留在 9 月 17 日" },
    ],
  },
  {
    id: "t-reimbursement",
    name: "提交保险报销",
    content: "把收据和保险单放进同一个文件夹，提交前检查金额。",
    date: "2026-09-19",
    time: "10:00",
    listId: "work",
    state: "completed",
    completedAt: "2026-09-19 11:14",
    trace: [{ at: "2026-09-19 11:14", text: "完成；记录于当天" }],
  },
  {
    id: "t-focus",
    name: "推进 apartment-renewal",
    content: "下午保留一个完整工作块；如果临时工作插入，只记录事实，不自动判定失败。",
    date: "2026-09-19",
    time: "14:00",
    listId: "work",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-18 08:05", text: "创建任务，安排在 9 月 19 日下午" }],
  },
  {
    id: "t-urgent",
    name: "处理 17:00 前的紧急工作",
    content: "这是今天现实中出现的临时事项，不把它与 Daily Record 的计划段落混写。",
    date: "2026-09-19",
    time: "16:30",
    listId: "work",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-19 13:40", text: "明确新增；来源为当日安排" }],
  },
  {
    id: "t-groceries",
    name: "去沃尔玛买日用品",
    content: "洗衣液、纸巾、猫砂。未来日期任务可以存在，不要求先创建 Daily Record。",
    date: "2026-09-22",
    time: null,
    listId: "home",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-18 21:10", text: "创建未来任务；尚无对应 Daily Record" }],
  },
  {
    id: "t-reading",
    name: "读完 Design Systems 章节",
    content: "没有日期；保留在 Tasks 的收集位置，不静默塞进 Today。",
    date: null,
    time: null,
    listId: "learning",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-16 20:45", text: "创建无日期任务" }],
  },
  {
    id: "t-invoice",
    name: "整理 8 月发票",
    content: "逾期只表达日期关系；未勾选不等于已确认失败。",
    date: "2026-09-12",
    time: null,
    listId: "work",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-12 09:00", text: "任务日期设为 9 月 12 日" }],
  },
  {
    id: "t-donate",
    name: "把旧衣服送出",
    content: "明确决定本轮不做；保留为放弃历史，可恢复为待办。",
    date: "2026-09-13",
    time: null,
    listId: "home",
    state: "abandoned",
    completedAt: null,
    abandonedAt: "2026-09-14 08:30",
    trace: [{ at: "2026-09-14 08:30", text: "明确放弃；不计入完成" }],
  },
  {
    id: "t-future-recordless",
    name: "预约年度体检",
    content: "未来日期但没有 Daily Record；Calendar 仍显示任务。",
    date: "2026-09-24",
    time: "09:30",
    listId: "home",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-17 18:22", text: "创建未来任务；没有生成空日记" }],
  },
  {
    id: "t-crowd-1",
    name: "清理下载文件夹",
    content: "拥挤日期示例 1。",
    date: "2026-09-06",
    time: null,
    listId: "learning",
    state: "completed",
    completedAt: "2026-09-06 16:12",
    trace: [{ at: "2026-09-06 16:12", text: "完成" }],
  },
  {
    id: "t-crowd-2",
    name: "给房东发邮件",
    content: "拥挤日期示例 2。",
    date: "2026-09-06",
    time: "11:00",
    listId: "work",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-05 17:08", text: "创建任务" }],
  },
  {
    id: "t-crowd-3",
    name: "买咖啡豆",
    content: "拥挤日期示例 3。",
    date: "2026-09-06",
    time: null,
    listId: "home",
    state: "abandoned",
    completedAt: null,
    abandonedAt: "2026-09-07 09:00",
    trace: [{ at: "2026-09-07 09:00", text: "明确放弃" }],
  },
  {
    id: "t-crowd-4",
    name: "回顾本周阅读笔记",
    content: "拥挤日期示例 4。",
    date: "2026-09-06",
    time: null,
    listId: "learning",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-09-06 08:20", text: "创建任务" }],
  },
  {
    id: "t-crowd-5",
    name: "整理桌面",
    content: "拥挤日期示例 5。",
    date: "2026-09-06",
    time: null,
    listId: "home",
    state: "completed",
    completedAt: "2026-09-06 20:10",
    trace: [{ at: "2026-09-06 20:10", text: "完成" }],
  },
  {
    id: "t-august-1",
    name: "联系维修师傅",
    content: "归档清单中仍未完成；归档不自动放弃。",
    date: "2026-08-28",
    time: null,
    listId: "august",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-08-28 09:00", text: "任务日期设为 8 月 28 日" }],
  },
  {
    id: "t-august-2",
    name: "整理旧照片",
    content: "归档清单中的另一个未完成任务。",
    date: "2026-08-29",
    time: null,
    listId: "august",
    state: "pending",
    completedAt: null,
    trace: [{ at: "2026-08-29 14:30", text: "任务日期设为 8 月 29 日" }],
  },
  {
    id: "t-august-3",
    name: "取消旧网络套餐",
    content: "归档清单中的历史完成任务。",
    date: "2026-08-30",
    time: null,
    listId: "august",
    state: "completed",
    completedAt: "2026-08-30 11:00",
    trace: [{ at: "2026-08-30 11:00", text: "完成后清单仍被归档" }],
  },
];

const records = {
  "2026-09-19": {
    status: "reviewed",
    title: "周六的现实记录",
    meta: "08:10 自动生成 · 13:40 明确补充",
    note: "今天的记录有工作 check-in、保险报销和临时紧急工作；下午的安排已经按现实重排。",
    phases: [
      ["07:30–10:00", "先学习，再处理固定安排", "早餐后保留一个小时阅读，不把空档全部填满。"],
      ["10:00–12:00", "工作 check-in → insurance reimbursement", "先完成固定 check-in，再集中提交报销材料。"],
      ["13:30–17:00", "临时工作优先", "13:40 出现紧急工作；apartment-renewal 保留为 Task，不把未完成写成失败。"],
      ["17:30 以后", "取饭、休息与低能量运动", "晚饭后仍保留 10 分钟走路的 baseline，其余时间保护恢复。"],
    ],
    facts: ["10:00 工作 check-in 已记录", "11:14 保险报销已完成", "13:40 紧急工作进入当天现实"],
    unknown: ["上午学习实际做了多少 · 未记录", "Reset living space · 没有足够记录"],
  },
  "2026-09-18": {
    status: "unreviewed",
    title: "周五的 Daily Record",
    meta: "06:20 自动生成 · 尚未复盘",
    note: "这一天有记录但还没有完成 Review；任务状态仍可独立查看。",
    phases: [["全天", "计划与现实暂未整理", "Review 状态保持未复盘，不由任务完成状态代替。"]],
    facts: ["尚未复盘"],
    unknown: ["晚间实际安排 · 未记录"],
  },
  "2026-09-17": {
    status: "reviewed",
    title: "周四的历史记录",
    meta: "已完成复盘 · 任务日期保留",
    note: "洗衣服属于 9 月 17 日的任务；即使 9 月 19 日才完成，Calendar 不自动把它复制到完成日。",
    phases: [["晚上", "保护恢复时间", "任务日期留在当天；实际完成时间在 Task 详情中单独展示。"]],
    facts: ["18:30 洗衣服原定时间", "没有把晚完成改写成当天事实"],
    unknown: ["实际完成前的中间过程 · 未记录"],
  },
  "2026-09-12": {
    status: "error",
    title: "部分读取失败的历史记录",
    meta: "演示读取错误 · 不影响任务历史",
    note: "即使 Daily Record 读取出现错误，Calendar 仍可保留任务日期与状态。",
    phases: [],
    facts: ["Daily Record 读取错误"],
    unknown: ["正文不可用 · 任务数据仍可查"],
  },
};

const habitFixtures = [
  { id: "morning", zh: "晨间规划", en: "Morning planning", goal: 3, source: "Daily flow · Demo", done: ["2026-09-15", "2026-09-17", "2026-09-19"] },
  { id: "reading", zh: "晨读", en: "Morning reading", goal: 3, source: "Dida365 reference", done: ["2026-09-14", "2026-09-16"] },
  { id: "review", zh: "睡前回顾", en: "Evening review", goal: 3, source: "Local + Daily flow", done: ["2026-09-15", "2026-09-18"] },
  { id: "reset", zh: "Reset living space", en: null, goal: 3, source: "Dida365 reference", done: ["2026-09-13", "2026-09-16"] },
];

const query = new URLSearchParams(location.search);
const validScreens = new Set(["today", "tasks", "calendar", "habits", "settings"]);
const state = {
  screen: validScreens.has(query.get("screen")) ? query.get("screen") : "today",
  variant: VARIANTS.has(query.get("variant")) ? query.get("variant") : "B",
  lang: query.get("lang") === "en" ? "en" : "zh",
  selectedDate: /^\d{4}-\d{2}-\d{2}$/.test(query.get("date") || "") ? query.get("date") : DEMO_TODAY,
  month: /^\d{4}-\d{2}$/.test(query.get("month") || "") ? query.get("month") : DEMO_MONTH,
  filter: "all",
  selectedList: "all",
  archiveListId: "august",
  tasks: structuredClone(initialTasks),
  lists: structuredClone(initialLists),
  deletedTasks: [],
  localHabits: {},
  phase: "morning",
  lastNotice: "",
  audit: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function t(zh, en) {
  return state.lang === "en" ? en : zh;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseDate(date) {
  return new Date(`${date}T12:00:00Z`);
}

function isoDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function shiftMonth(month, offset) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return state.lang === "en"
    ? parseDate(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : `${year} 年 ${monthNumber} 月`;
}

function dateLabel(date) {
  if (!date) return t("未安排", "Undated");
  const parsed = parseDate(date);
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();
  const weekday = state.lang === "en" ? WEEKDAYS_EN[parsed.getUTCDay()] : `周${WEEKDAYS_ZH[parsed.getUTCDay()]}`;
  return state.lang === "en" ? `${WEEKDAYS_EN[parsed.getUTCDay()]}, ${month}/${day}` : `${month} 月 ${day} 日 · ${weekday}`;
}

function dateTimeLabel(task) {
  if (!task.date) return t("未安排", "Undated");
  return `${task.date === DEMO_TODAY ? t("今天", "Today") : dateLabel(task.date)}${task.time ? ` · ${task.time}` : ""}`;
}

function getList(id) {
  return state.lists.find((list) => list.id === id) || state.lists[0];
}

function getTask(id) {
  return state.tasks.find((task) => task.id === id);
}

function visibleTasks() {
  return state.tasks.filter((task) => !task.deleted);
}

function isArchived(task) {
  return Boolean(getList(task.listId)?.archived);
}

function isOverdue(task) {
  return Boolean(task.date && task.date < DEMO_TODAY && task.state === "pending");
}

function isLate(task) {
  return Boolean(task.date && task.completedAt && task.completedAt.slice(0, 10) > task.date);
}

function isSmartTodayTask(task) {
  return !isArchived(task) && task.date === DEMO_TODAY;
}

function defaultListIdForNewTask() {
  if (state.screen === "tasks") {
    const selectedList = state.selectedList;
    if (selectedList && selectedList !== "all" && selectedList !== "today" && selectedList !== "archive") {
      return selectedList;
    }
  }
  return "inbox";
}

function statusLabel(status) {
  return { pending: t("待办", "Open"), completed: t("已完成", "Completed"), abandoned: t("已放弃", "Abandoned") }[status] || status;
}

function recordFor(date) {
  return records[date] || {
    status: "none",
    title: t("没有 Daily Record", "No Daily Record"),
    meta: t("只查看任务，不创建空日记", "Task-only date; no empty record created"),
    note: t("这一天目前没有 Daily Record；有日期任务仍然可以存在。", "There is no Daily Record for this date; dated Tasks can still exist."),
    phases: [],
    facts: [],
    unknown: [t("没有对应 Daily Record", "No Daily Record")],
  };
}

function logAction(text) {
  state.lastNotice = text;
  state.audit.unshift({ at: "刚刚", text });
  state.audit = state.audit.slice(0, 12);
}

let toastTimer;
function showToast(message, undoTaskId = null) {
  $("#prototype-toast")?.remove();
  const toast = document.createElement("div");
  toast.id = "prototype-toast";
  toast.className = "prototype-toast";
  toast.setAttribute("role", "status");
  toast.innerHTML = `<span>${esc(message)}</span>${undoTaskId ? `<button type="button" data-undo-task="${esc(undoTaskId)}">撤销</button>` : ""}`;
  document.body.append(toast);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.remove(), 5000);
}

function syncUrl() {
  const params = new URLSearchParams();
  params.set("screen", state.screen);
  params.set("variant", state.variant);
  params.set("lang", state.lang);
  params.set("date", state.selectedDate);
  params.set("month", state.month);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function updateWorkspaceHeader() {
  const config = {
    today: { feature: "Daily Record", title: "Today", description: "查看今天 Daily Record 里的大致安排。", status: "Today is the current destination.", kicker: `TODAY · ${state.selectedDate}`, railTitle: "Today", railDetail: "Morning · Daytime · Evening" },
    tasks: { feature: "Tasks", title: "Tasks", description: "独立管理任务；同一条任务也会出现在 Today 和日历。", status: `${visibleTasks().filter((task) => task.state === "pending" && !isArchived(task)).length} 个待办任务 · 仅演示内存状态`, kicker: `TASKS · ${visibleTasks().length} ITEMS`, railTitle: "Tasks", railDetail: "Lists · Dates · History" },
    calendar: { feature: "Calendar", title: "Calendar", description: "先看整个月，再进入某一天；选中的日期复用 Today 的三个阶段。", status: `Selected ${dateLabel(state.selectedDate)}`, kicker: `MONTH VIEW · ${monthLabel(state.month).toUpperCase()}`, railTitle: monthLabel(state.month), railDetail: `${dateLabel(state.selectedDate)} · Review + Tasks` },
    habits: { feature: "Habits", title: "Habits", description: "按需查看来源快照；未知仍保持未知，不由缺失记录推断失败。", status: "Snapshot · source evidence", kicker: "HABITS · WEEKLY", railTitle: "Habits", railDetail: "Weekly snapshot · Known / Unknown" },
    settings: { feature: "Settings", title: "Settings", description: "外观和 Vault 设置沿用当前 Personal Dashboard。", status: "Settings is the current destination.", kicker: "SETTINGS", railTitle: "Settings", railDetail: "Appearance · Data & Vault" },
  }[state.screen];
  $("[data-feature-area]").textContent = config.feature;
  $("#workspace-title").textContent = config.title;
  $("#workspace-description").textContent = config.description;
  $("#workspace-context-status").textContent = config.status;
  $("#workspace-rail-context-kicker").textContent = config.kicker;
  $("#workspace-rail-context-title").textContent = config.railTitle;
  $("#workspace-rail-context-detail").textContent = config.railDetail;
  $("#runtime-status").textContent = "本地原型 · 合成数据已载入";
  $("#workspace-language").textContent = state.lang === "zh" ? "中 / EN" : "EN / 中";
}

function setScreen(screen) {
  if (!validScreens.has(screen)) return;
  state.screen = screen;
  $$("[data-workspace-panel]").forEach((panel) => { panel.hidden = panel.dataset.workspacePanel !== screen; });
  $$(".destination-button").forEach((button) => {
    if (button.dataset.workspaceDestination === screen) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const select = $("#workspace-destination-select");
  if (select) select.value = screen === "settings" ? "today" : screen;
  $(".app-shell").dataset.workspaceDestination = screen;
  updateWorkspaceHeader();
  if (screen === "today") renderToday();
  if (screen === "tasks") renderTasks();
  if (screen === "calendar") renderCalendar();
  if (screen === "habits") renderHabits();
  syncUrl();
}

function renderToday() {
  const record = recordFor(state.selectedDate);
  $("#today-ready").hidden = false;
  $("#today-handoff").hidden = true;
  $("#today-date").textContent = dateLabel(state.selectedDate);
  $("#today-heading").textContent = "早间基准";
  $("#today-vault").textContent = "Demo Vault · 本地合成数据（刷新重置）";
  $("#today-status").textContent = `${record.title} · 任务与记录在原型内共享状态。`;
  $("#today-baseline-status").textContent = record.meta;
  $("#today-baseline-status").dataset.availability = record.status === "none" ? "missing" : record.status;
  $("#today-block-count").textContent = `${record.phases.length} 个时间块`;
  $("#today-baseline-timeline").innerHTML = record.phases.map(([period, title, copy]) => `<li class="today-timeline-item"><span class="today-period">${esc(period)}</span><div><h4>${esc(title)}</h4><p>${esc(copy)}</p></div></li>`).join("");
  $("#today-plan-empty").hidden = record.phases.length > 0;
  renderTodayPhase();
  renderDayTaskPanel();
  renderTodayEvidence(record);
}

function renderTodayPhase() {
  $$("[data-today-phase]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.todayPhase === state.phase)));
  $$("[data-today-phase-panel]").forEach((panel) => { panel.hidden = panel.dataset.todayPhasePanel !== state.phase; });
  const record = recordFor(state.selectedDate);
  $("#today-daytime-known").innerHTML = record.facts.length ? `<div class="today-known-update"><h4>今天已确认的事实</h4><ul>${record.facts.map((fact) => `<li>${esc(fact)}</li>`).join("")}</ul></div>` : "";
  $("#today-daytime-known-empty").hidden = record.facts.length > 0;
  $("#today-current-timeline").innerHTML = record.phases.slice(0, 2).map(([period, title, copy]) => `<li class="today-timeline-item"><span class="today-period">${esc(period)}</span><div><h4>${esc(title)}</h4><p>${esc(copy)}</p></div></li>`).join("");
  $("#today-current-count").textContent = `${Math.min(2, record.phases.length)} 项`;
  $("#today-current-empty").hidden = record.phases.length > 0;
  $("#today-future-directions").innerHTML = record.unknown.length ? `<div class="today-direction-update"><h4>仍然未知</h4><ul>${record.unknown.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>` : "";
  $("#today-future-count").textContent = `${record.unknown.length} 项`;
  $("#today-future-empty").hidden = record.unknown.length > 0;
  $("#today-daytime-count").textContent = `${record.facts.length + record.unknown.length} 条线索`;
  $("#today-daytime-short-records").innerHTML = `<div class="today-short-record"><p>${esc(record.note)}</p><small>${esc(record.meta)}</small></div>`;
  $("#today-short-record-count").textContent = "1 条";
  $("#today-short-records-empty").hidden = true;
  $("#today-daytime-updates").innerHTML = `<div class="today-daytime-update"><p>任务完成状态不会自动改写 Daily Record 的文字。</p></div>`;
  $("#today-change-count").textContent = "0 条";
  $("#today-daytime-empty").hidden = true;
  $("#today-evening-account-section").hidden = false;
  $("#today-evening-account").innerHTML = `<h4>记录账户</h4><p>${esc(record.note)}</p>`;
  $("#today-evening-comparison-section").hidden = false;
  $("#today-evening-comparison").innerHTML = `<h4>计划与现实</h4><p>已完成和未完成都保留为明确状态；没有按时间推断缺失事实。</p>`;
  $("#today-evening-summary-section").hidden = false;
  $("#today-evening-summary").innerHTML = `<p>${esc(record.title)} · ${esc(record.meta)}</p>`;
  $("#today-evening-questions-section").hidden = false;
  $("#today-evening-questions").innerHTML = "<li>哪些事情需要在下一次安排中明确保留？</li>";
  $("#today-evening-empty").hidden = true;
}

function renderTodayEvidence(record) {
  $("#today-evidence-count").textContent = `${record.facts.length} 条`;
  $("#today-evidence-groups").innerHTML = `<div class="today-evidence-group"><h4>来源与边界</h4><ul><li>Daily Record：${esc(record.meta)}</li><li>Task 状态：单独记录，不替代复盘。</li></ul></div>`;
  $("#today-evidence-empty").hidden = true;
}

function taskMeta(task) {
  const bits = [getList(task.listId)?.name || "收集箱", dateTimeLabel(task)];
  if (isOverdue(task)) bits.push("逾期 · 未推断失败");
  if (isLate(task)) bits.push("晚完成 · 日期保留");
  return bits;
}

function taskActionButtons(task) {
  if (task.state === "abandoned") return `<button type="button" class="task-row-action" data-task-action="restore" data-task-id="${esc(task.id)}">恢复待办</button>`;
  return task.state === "pending" ? `<button type="button" class="task-row-action" data-task-action="complete" data-task-id="${esc(task.id)}">完成</button><button type="button" class="task-row-action" data-task-action="abandon" data-task-id="${esc(task.id)}">放弃</button>` : `<button type="button" class="task-row-action" data-task-action="reopen" data-task-id="${esc(task.id)}">重开</button>`;
}

function taskRow(task) {
  const classes = ["task-row", `is-${task.state}`];
  if (isOverdue(task)) classes.push("is-overdue");
  if (isArchived(task)) classes.push("is-archived");
  return `<article class="${classes.join(" ")}" data-task-row="${esc(task.id)}"><input type="checkbox" data-task-toggle data-task-id="${esc(task.id)}" ${task.state === "completed" ? "checked" : ""} ${task.state === "abandoned" ? "disabled" : ""} aria-label="${esc(task.name)}"><div class="task-row-main"><div class="task-row-title-line"><button type="button" class="task-title-button" data-task-open data-task-id="${esc(task.id)}">${esc(task.name)}</button><span class="task-status task-status-${esc(task.state)}">${esc(statusLabel(task.state))}</span>${isOverdue(task) ? '<span class="task-status task-status-overdue">逾期</span>' : ""}</div>${task.content ? `<p class="task-row-content">${esc(task.content)}</p>` : ""}<p class="task-row-meta">${taskMeta(task).map((item) => `<span>${esc(item)}</span>`).join("<i aria-hidden=\"true\">·</i>")}</p></div><div class="task-row-actions"><button type="button" class="task-row-action" data-task-open data-task-id="${esc(task.id)}">详情</button>${task.date ? `<button type="button" class="task-row-action" data-task-action="reschedule" data-task-id="${esc(task.id)}">改期</button>` : ""}${taskActionButtons(task)}</div></article>`;
}

function selectedTaskSet() {
  let tasks = visibleTasks();
  if (state.selectedList === "today") tasks = tasks.filter(isSmartTodayTask);
  else if (state.selectedList === "archive") tasks = tasks.filter((task) => isArchived(task));
  else {
    tasks = tasks.filter((task) => !isArchived(task));
    if (state.selectedList !== "all") tasks = tasks.filter((task) => task.listId === state.selectedList);
  }
  if (state.filter !== "all") tasks = tasks.filter((task) => task.state === state.filter);
  return tasks.sort((a, b) => {
    if (a.state !== b.state) return a.state === "pending" ? -1 : b.state === "pending" ? 1 : a.state === "completed" ? -1 : 1;
    if (!a.date && !b.date) return a.name.localeCompare(b.name);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`);
  });
}

function renderTaskLists() {
  const navigation = $("#task-list-navigation");
  const archiveCount = visibleTasks().filter((task) => isArchived(task)).length;
  const nonArchived = visibleTasks().filter((task) => !isArchived(task));
  const entries = [
    { id: "all", name: "全部任务", count: nonArchived.length },
    { id: "today", name: "今日", count: nonArchived.filter(isSmartTodayTask).length },
    ...state.lists.filter((list) => !list.archived).map((list) => ({ id: list.id, name: list.name, count: visibleTasks().filter((task) => task.listId === list.id && !isArchived(task)).length })),
    { id: "archive", name: "已归档", count: archiveCount },
  ];
  navigation.innerHTML = entries.map((entry) => `<button type="button" class="task-list-button ${state.selectedList === entry.id ? "is-active" : ""}" data-task-list="${esc(entry.id)}" aria-current="${state.selectedList === entry.id ? "page" : "false"}"><span>${esc(entry.name)}</span><strong>${entry.count}</strong></button>`).join("") + (state.selectedList === "archive" && archiveCount ? '<button type="button" class="task-archive-action" data-task-restore-list>恢复清单</button>' : "");
  $("#tasks-list-kicker").textContent = state.selectedList === "archive" ? "ARCHIVE · HISTORY" : state.selectedList === "today" ? "TODAY · SMART VIEW" : state.selectedList === "all" ? "TASKS · ALL" : getList(state.selectedList).name;
  $("#tasks-list-heading").textContent = state.selectedList === "archive" ? "已归档任务" : state.selectedList === "today" ? "今日任务" : state.selectedList === "all" ? "全部任务" : getList(state.selectedList).name;
  $("#tasks-status").textContent = state.selectedList === "archive" ? `已归档清单 · ${archiveCount} 个任务；归档不自动放弃，也不从历史中删除。` : state.selectedList === "today" ? `今日自动视图 · ${selectedTaskSet().length} 个任务；日期变化后会自动更新。` : `${visibleTasks().filter((task) => task.state === "pending" && !isArchived(task)).length} 个待办 · ${visibleTasks().filter((task) => task.state === "completed").length} 个已完成 · ${visibleTasks().filter((task) => task.state === "abandoned").length} 个已放弃`;
  $("#task-filter").value = state.filter;
}

function renderTasks() {
  renderTaskLists();
  const tasks = selectedTaskSet();
  $("#tasks-list").innerHTML = tasks.map(taskRow).join("");
  $("#tasks-empty").hidden = tasks.length > 0;
}

function renderDayTaskPanel() {
  const tasks = visibleTasks().filter((task) => task.date === state.selectedDate && !isArchived(task));
  const pending = tasks.filter((task) => task.state === "pending").length;
  $("#day-task-count").textContent = `${pending} 待办 · ${tasks.filter((task) => task.state === "completed").length} 已完成`;
  $("#day-task-status").textContent = `${dateLabel(state.selectedDate)} · Tasks 共享同一身份`;
  $("#day-task-list").innerHTML = tasks.map((task) => `<div class="day-task-item ${task.state === "completed" ? "is-complete" : ""}"><input type="checkbox" data-task-toggle data-task-id="${esc(task.id)}" ${task.state === "completed" ? "checked" : ""} aria-label="${esc(task.name)}"><div class="day-task-body"><form class="day-task-rename-form" data-task-rename data-task-id="${esc(task.id)}"><input name="name" value="${esc(task.name)}" aria-label="任务名称"><button type="submit" class="day-task-save">保存</button></form><p class="day-task-meta">${esc(task.time || "未设时间")} · ${esc(statusLabel(task.state))}${isLate(task) ? " · 晚完成" : ""}</p></div><button type="button" class="day-task-delete" data-task-open data-task-id="${esc(task.id)}">详情</button></div>`).join("");
  $("#day-task-empty").hidden = tasks.length > 0;
}

function calendarDays(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const start = first.getUTCDay();
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, 1 - start + index));
    return { date: date.toISOString().slice(0, 10), inMonth: date.getUTCMonth() === monthNumber - 1 };
  });
}

function renderCalendar() {
  const [year, monthNumber] = state.month.split("-").map(Number);
  const yearSelect = $("#calendar-year");
  yearSelect.innerHTML = [year - 1, year, year + 1].map((item) => `<option value="${item}">${item} 年</option>`).join("");
  yearSelect.value = String(year);
  $("#calendar-month").value = String(monthNumber);
  $("#calendar-month-heading").textContent = monthLabel(state.month);
  $("#calendar-status").textContent = `Calendar preview · ${monthLabel(state.month)}`;
  $("#calendar-grid").innerHTML = calendarDays(state.month).map(({ date, inMonth }) => {
    const selected = date === state.selectedDate;
    const status = recordFor(date).status;
    const tasks = visibleTasks().filter((task) => task.date === date);
    const visible = tasks.slice(0, state.variant === "C" ? 3 : state.variant === "A" ? 1 : 2);
    const marker = { reviewed: "R", unreviewed: "N", error: "!", none: "" }[status];
    return `<button type="button" class="calendar-day" data-calendar-date="${date}" data-availability="${status}" ${inMonth ? "" : "data-outside-month"} ${selected ? "data-selected" : ""} aria-pressed="${selected}" aria-label="${esc(dateLabel(date))}"><span class="calendar-day-top"><strong>${Number(date.slice(8))}</strong><small>${date === DEMO_TODAY ? "Today" : ""}</small></span>${tasks.length ? `<span class="calendar-day-tasks">${visible.map((task) => `<span class="calendar-day-task ${task.state === "completed" ? "is-complete" : ""}">${esc(task.name)}</span>`).join("")}${tasks.length > visible.length ? `<span class="calendar-day-more">+${tasks.length - visible.length}</span>` : ""}</span>` : '<span class="calendar-day-tasks"></span>'}<span class="calendar-day-marker" data-availability="${status}" aria-hidden="true">${marker}</span></button>`;
  }).join("");
  renderCalendarSummary();
}

function renderCalendarSummary() {
  const record = recordFor(state.selectedDate);
  const tasks = visibleTasks().filter((task) => task.date === state.selectedDate);
  $("#calendar-summary-heading").textContent = dateLabel(state.selectedDate);
  $("#calendar-summary-status").textContent = { reviewed: "已复盘", unreviewed: "未复盘", error: "读取错误", none: "无记录" }[record.status];
  $("#calendar-summary-status").dataset.availability = record.status;
  $("#calendar-summary-copy").innerHTML = `<strong>${esc(record.title)}</strong><p>${esc(record.note)}</p><small>${tasks.length} 个任务 · ${esc(record.meta)}</small>${tasks.length ? `<div class="calendar-summary-task-list">${tasks.map((task) => `<div class="calendar-summary-task ${task.state === "completed" ? "is-complete" : ""}"><span>${esc(task.name)}</span><small>${esc(statusLabel(task.state))}${isLate(task) ? " · 晚完成但日期保留" : ""}</small></div>`).join("")}</div>` : ""}`;
  $("#calendar-open-day").disabled = false;
}

function habitDone(fixture, date) {
  const key = `${fixture.id}:${date}`;
  return state.localHabits[key] ?? fixture.done.includes(date);
}

function habitCell(fixture, date) {
  const done = habitDone(fixture, date);
  return `<button type="button" class="habit-cell status-${done ? "completed" : "notDone"} ${date === DEMO_TODAY ? "is-today" : ""}" data-habit-toggle data-habit="${esc(fixture.id)}" data-date="${date}" aria-label="${esc(date)} · ${esc(fixture.zh)} · ${done ? "已完成" : "未完成"}"><small>${Number(date.slice(8))}</small><span>${done ? "•" : "·"}</span></button>`;
}

function habitRow(fixture) {
  const end = parseDate(DEMO_TODAY);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - 6 + index);
    return date.toISOString().slice(0, 10);
  });
  const doneCount = dates.filter((date) => habitDone(fixture, date)).length;
  const todayDone = habitDone(fixture, DEMO_TODAY);
  return `<div class="habit-snapshot-row"><div class="habit-snapshot-identity"><strong>${esc(fixture.zh)}</strong><p>${fixture.en ? esc(fixture.en) : "无稳定英文名称 · 使用原名"}</p><small>${esc(fixture.source)} · stable identity: ${esc(fixture.id)}</small></div><div class="habit-snapshot-value"><strong>${doneCount} / ${fixture.goal}</strong><small>本周已知 / 目标</small></div><div class="habit-completion-control"><input type="checkbox" data-habit-toggle data-habit="${esc(fixture.id)}" data-date="${DEMO_TODAY}" ${todayDone ? "checked" : ""} aria-label="${esc(fixture.zh)} 今日完成"><small>${todayDone ? "今日已完成" : "今日未知"}</small></div><div class="habit-recent"><span>最近 7 天 · 点击可切换本地演示记录</span><div class="habit-recent-cells">${dates.map((date) => habitCell(fixture, date)).join("")}</div></div><span aria-hidden="true"></span></div>`;
}

function renderHabits() {
  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = parseDate(DEMO_TODAY);
    date.setUTCDate(date.getUTCDate() - 6 + index);
    return date.toISOString().slice(0, 10);
  });
  const totalDone = habitFixtures.reduce((sum, fixture) => sum + weekDates.filter((date) => habitDone(fixture, date)).length, 0);
  const totalGoal = habitFixtures.reduce((sum, fixture) => sum + fixture.goal, 0);
  $("#habits-range").textContent = "9 月 13 日 – 9 月 19 日 · source snapshot";
  $("#habits-status").textContent = "已载入合成来源快照；未知不等于失败。";
  $("#habits-ready").hidden = false;
  $("#habits-empty").hidden = true;
  $("#habits-summary-total").textContent = `${totalDone} / ${totalGoal}`;
  $("#habits-summary-rows").innerHTML = habitFixtures.map((fixture) => `<div class="habits-summary-row"><span>${esc(fixture.zh)}</span><strong>${weekDates.filter((date) => habitDone(fixture, date)).length}</strong><small>${fixture.en ? esc(fixture.en) : "fallback: original name"}</small></div>`).join("");
  $("#habits-summary-note").textContent = "来源记录、本地记录和未知状态并列展示；没有新建习惯或目标。";
  $("#habits-generated-at").textContent = "2026-09-19 08:10 · demo";
  $("#habits-producer").textContent = "Daily flow + Dida365 reference";
  $("#habits-today-date").textContent = dateLabel(DEMO_TODAY);
  $("#habits-daily-list").innerHTML = habitFixtures.slice(0, 2).map(habitRow).join("");
  $("#habits-weekly-list").innerHTML = habitFixtures.slice(2).map(habitRow).join("");
}

function openTaskDialog(taskId = null, date = null, defaultListId = null) {
  const task = taskId ? getTask(taskId) : null;
  const selectedListId = task?.listId || defaultListId || defaultListIdForNewTask();
  const dialog = document.createElement("dialog");
  dialog.className = "prototype-dialog";
  dialog.innerHTML = `<form method="dialog" class="task-dialog-form"><div class="prototype-dialog-header"><div><p class="section-label">${task ? "任务 · 编辑" : "任务 · 新建"}</p><h2>${task ? "编辑任务" : "新建任务"}</h2></div><button type="button" class="prototype-dialog-close" data-dialog-close aria-label="关闭">×</button></div><label>任务名称<input name="name" maxlength="160" required value="${esc(task?.name || "")}" placeholder="例如：给房东发邮件"></label><label>内容（可选）<textarea name="content" rows="3" maxlength="500">${esc(task?.content || "")}</textarea></label><div class="prototype-dialog-grid"><label>日期（可选）<input name="date" type="date" value="${esc(task?.date || date || "")}"></label><label>时间（可选）<input name="time" type="time" value="${esc(task?.time || "")}"></label></div><label>清单<select name="listId">${state.lists.filter((list) => !list.archived).map((list) => `<option value="${esc(list.id)}" ${selectedListId === list.id ? "selected" : ""}>${esc(list.name)}</option>`).join("")}</select></label>${task && isLate(task) ? '<p class="prototype-dialog-boundary">实际完成日为 9 月 19 日，任务日期仍保留为 9 月 17 日。</p>' : ""}<div class="prototype-dialog-actions"><button type="button" class="secondary-button" data-dialog-close>取消</button>${task ? '<button type="button" class="prototype-danger" data-dialog-delete>删除</button>' : ""}<button type="submit">保存任务</button></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialog.querySelector("[data-dialog-delete]")?.addEventListener("click", () => { deleteTask(task); dialog.close(); });
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    const nextDate = String(data.get("date") || "") || null;
    const nextTime = nextDate ? String(data.get("time") || "") || null : null;
    if (task) {
      task.name = name;
      task.content = String(data.get("content") || "").trim();
      task.date = nextDate;
      task.time = nextTime;
      task.listId = String(data.get("listId") || "inbox");
      task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: "编辑任务；稳定身份保持不变" });
      logAction(`保存编辑：${task.name}`);
      showToast("任务已保存；Today 与 Calendar 使用同一身份。");
    } else {
      const newTask = { id: `t-${Date.now()}`, name, content: String(data.get("content") || "").trim(), date: nextDate, time: nextTime, listId: String(data.get("listId") || "inbox"), state: "pending", completedAt: null, trace: [{ at: `${DEMO_TODAY} 20:18`, text: "创建 Dashboard Task" }] };
      state.tasks.push(newTask);
      logAction(`创建任务：${newTask.name}`);
      showToast("任务已创建；没有写入 Dida365。");
    }
    dialog.close();
    setScreen(state.screen);
  });
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute("open", "");
  dialog.querySelector("input[name=name]")?.focus();
}

function openRescheduleDialog(task) {
  if (!task) return;
  const dialog = document.createElement("dialog");
  dialog.className = "prototype-dialog";
  dialog.innerHTML = `<form method="dialog" class="task-dialog-form"><div class="prototype-dialog-header"><div><p class="section-label">任务 · 改期</p><h2>改期任务</h2></div><button type="button" class="prototype-dialog-close" data-dialog-close aria-label="关闭">×</button></div><p class="prototype-dialog-lead"><strong>${esc(task.name)}</strong><br>当前日期：${esc(task.date || "未安排")}</p><label>新的任务日期<input name="date" type="date" required value="${esc(task.date || DEMO_TODAY)}"></label><label>时间（可选）<input name="time" type="time" value="${esc(task.time || "")}"></label><p class="prototype-dialog-boundary">只有明确改期才会移动 Calendar 里的日期；完成日晚于任务日期不会自动移动。</p><div class="prototype-dialog-actions"><button type="button" class="secondary-button" data-dialog-close>取消</button><button type="submit">确认改期</button></div></form>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextDate = String(data.get("date") || "");
    if (!nextDate) return;
    const oldDate = task.date;
    task.date = nextDate;
    task.time = String(data.get("time") || "") || null;
    task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: `明确改期：${oldDate || "未安排"} → ${nextDate}` });
    logAction(`改期任务：${task.name}`);
    dialog.close();
    setScreen(state.screen);
    showToast("任务日期已改动；Calendar 会显示新的任务日期。");
  });
  if (dialog.showModal) dialog.showModal();
  else dialog.setAttribute("open", "");
}

function deleteTask(task) {
  if (!task) return;
  task.deleted = true;
  state.deletedTasks.push(task.id);
  logAction(`删除任务：${task.name}`);
  showToast("任务已移出当前视图；可以撤销。", task.id);
  setScreen(state.screen);
}

function toggleTask(task) {
  if (!task || task.state === "abandoned") return;
  if (task.state === "completed") {
    task.state = "pending";
    task.completedAt = null;
    task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: "撤销完成；任务回到待办" });
    logAction(`撤销完成：${task.name}`);
    showToast("任务已恢复为待办；三个入口会同步。");
  } else {
    task.state = "completed";
    task.completedAt = `${DEMO_TODAY} 20:18`;
    task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: "完成；实际完成时间单独记录，任务日期不变" });
    logAction(`完成任务：${task.name}`);
    showToast("任务已完成；Calendar 仍按原任务日期显示。");
  }
  setScreen(state.screen);
}

function changeTaskState(task, nextState) {
  if (!task) return;
  task.state = nextState;
  if (nextState === "completed") task.completedAt = `${DEMO_TODAY} 20:18`;
  if (nextState !== "completed") task.completedAt = null;
  if (nextState === "abandoned") task.abandonedAt = `${DEMO_TODAY} 20:18`;
  task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: nextState === "abandoned" ? "明确放弃；不计入完成" : nextState === "pending" ? "恢复为待办" : "完成任务" });
  logAction(`${statusLabel(nextState)}：${task.name}`);
  setScreen(state.screen);
}

function restoreList() {
  const list = state.lists.find((candidate) => candidate.id === state.archiveListId && candidate.archived) || state.lists.find((candidate) => candidate.archived);
  if (!list) return;
  list.archived = false;
  state.selectedList = list.id;
  state.archiveListId = state.lists.find((candidate) => candidate.archived)?.id || null;
  logAction(`恢复清单：${list.name}`);
  setScreen("tasks");
  showToast("清单已恢复；任务状态没有被批量改变。");
}

function handleClick(event) {
  const target = event.target;
  const nav = target.closest(".destination-button");
  if (nav) { event.preventDefault(); setScreen(nav.dataset.workspaceDestination); return; }
  if (target.closest("#workspace-settings")) { event.preventDefault(); setScreen("settings"); return; }
  if (target.closest("#workspace-more")) { event.preventDefault(); showToast("更多选项暂未开放；这版只演示 Tasks 入口和共享状态。"); return; }
  if (target.closest("#workspace-language")) { event.preventDefault(); state.lang = state.lang === "zh" ? "en" : "zh"; logAction(state.lang === "zh" ? "切换为中文显示" : "Switched to English display"); setScreen(state.screen); return; }
  if (target.closest("#task-new")) {
    event.preventDefault();
    openTaskDialog(null, state.screen === "today" || state.screen === "calendar" ? state.selectedDate : null, defaultListIdForNewTask());
    return;
  }
  if (target.closest("#task-new-list")) { event.preventDefault(); showToast("清单创建暂不在 4.0 原型范围内。"); return; }
  const listButton = target.closest("[data-task-list]");
  if (listButton) { event.preventDefault(); state.selectedList = listButton.dataset.taskList; state.filter = "all"; setScreen("tasks"); return; }
  if (target.closest("[data-task-restore-list]")) { event.preventDefault(); restoreList(); return; }
  const taskOpen = target.closest("[data-task-open]");
  if (taskOpen) { event.preventDefault(); openTaskDialog(taskOpen.dataset.taskId); return; }
  const taskAction = target.closest("[data-task-action]");
  if (taskAction) {
    event.preventDefault();
    const task = getTask(taskAction.dataset.taskId);
    const action = taskAction.dataset.taskAction;
    if (action === "complete" || action === "reopen") changeTaskState(task, action === "complete" ? "completed" : "pending");
    if (action === "abandon") changeTaskState(task, "abandoned");
    if (action === "restore") changeTaskState(task, "pending");
    if (action === "reschedule") openRescheduleDialog(task);
    return;
  }
  const undo = target.closest("[data-undo-task]");
  if (undo) {
    const task = getTask(undo.dataset.undoTask);
    if (task) { task.deleted = false; state.deletedTasks = state.deletedTasks.filter((id) => id !== task.id); logAction(`撤销删除：${task.name}`); setScreen(state.screen); showToast("任务已恢复。"); }
    return;
  }
  const taskToggle = target.closest("[data-task-toggle]");
  if (taskToggle) { event.preventDefault(); toggleTask(getTask(taskToggle.dataset.taskId)); return; }
  const calendarDay = target.closest("[data-calendar-date]");
  if (calendarDay) { event.preventDefault(); state.selectedDate = calendarDay.dataset.calendarDate; setScreen("calendar"); return; }
  const phase = target.closest("[data-today-phase]");
  if (phase) { event.preventDefault(); state.phase = phase.dataset.todayPhase; renderTodayPhase(); return; }
  if (target.closest("#calendar-previous-month")) { event.preventDefault(); state.month = shiftMonth(state.month, -1); renderCalendar(); syncUrl(); return; }
  if (target.closest("#calendar-next-month")) { event.preventDefault(); state.month = shiftMonth(state.month, 1); renderCalendar(); syncUrl(); return; }
  if (target.closest("#calendar-today")) { event.preventDefault(); state.month = DEMO_MONTH; state.selectedDate = DEMO_TODAY; renderCalendar(); syncUrl(); return; }
  if (target.closest("#calendar-open-day")) { event.preventDefault(); setScreen("today"); return; }
  if (target.closest("#refresh-today")) { event.preventDefault(); renderToday(); showToast("Today 已刷新；演示状态仍留在内存中。"); return; }
  if (target.closest("#select-today-vault")) { event.preventDefault(); showToast("原型使用 Demo Vault；没有打开真实文件选择器。"); return; }
  if (target.closest("#refresh-habits")) { event.preventDefault(); logAction("刷新习惯来源快照"); renderHabits(); showToast("习惯快照已重新读取；仍是合成数据。"); return; }
  const habit = target.closest("[data-habit-toggle]");
  if (habit) { event.preventDefault(); const key = `${habit.dataset.habit}:${habit.dataset.date}`; const fixture = habitFixtures.find((item) => item.id === habit.dataset.habit); if (!fixture) return; state.localHabits[key] = !habitDone(fixture, habit.dataset.date); logAction(`切换本地习惯记录：${fixture.zh}`); renderHabits(); }
}

function handleChange(event) {
  const target = event.target;
  if (target.matches("#workspace-destination-select")) { setScreen(target.value); return; }
  if (target.matches("#task-filter")) { state.filter = target.value; renderTasks(); syncUrl(); return; }
  if (target.matches("#calendar-year")) { state.month = `${target.value}-${String(Number($("#calendar-month").value)).padStart(2, "0")}`; renderCalendar(); syncUrl(); return; }
  if (target.matches("#calendar-month")) { state.month = `${String(Number($("#calendar-year").value)).padStart(4, "0")}-${String(Number(target.value)).padStart(2, "0")}`; renderCalendar(); syncUrl(); }
}

function handleSubmit(event) {
  const form = event.target;
  if (form.matches("#day-task-add-form")) {
    event.preventDefault();
    const input = $("#day-task-add-input");
    const name = input.value.trim();
    if (!name) return;
    state.tasks.push({ id: `t-${Date.now()}`, name, content: "", date: state.selectedDate, time: null, listId: "inbox", state: "pending", completedAt: null, trace: [{ at: `${DEMO_TODAY} 20:18`, text: "从 Today 创建当天任务" }] });
    input.value = "";
    logAction(`从 Today 创建任务：${name}`);
    renderToday();
    showToast("当天任务已添加；Tasks 与 Calendar 会同步。");
    return;
  }
  if (form.matches("[data-task-rename]")) {
    event.preventDefault();
    const task = getTask(form.dataset.taskId);
    const name = String(new FormData(form).get("name") || "").trim();
    if (!task || !name) return;
    task.name = name;
    task.trace.push({ at: `${DEMO_TODAY} 20:18`, text: "从 Today 保存任务名称" });
    logAction(`保存任务名称：${name}`);
    renderToday();
    showToast("任务名称已保存。");
    return;
  }
  if (form.matches("#today-daytime-form, #today-evening-form")) {
    event.preventDefault();
    const content = String(new FormData(form).get("content") || "").trim();
    if (!content) return;
    logAction("保存一条 Daily Record 演示更新");
    showToast("演示更新留在内存中；未写入真实 Vault。");
    form.reset();
  }
}

document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const dialog = document.querySelector("dialog[open]");
    if (dialog) dialog.close();
  }
});

$("#today-evidence-toggle")?.addEventListener("click", () => {
  const content = $("#today-evidence-content");
  const button = $("#today-evidence-toggle");
  const open = content.hidden;
  content.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
});

function boot() {
  setScreen(state.screen);
}

boot();
