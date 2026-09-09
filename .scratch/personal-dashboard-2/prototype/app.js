// PROTOTYPE FRAME — Calendar + Today shell slices; no production behavior.
// Question: can current Today density + a quiet right-side context rail carry
// the 2.0 daily views, calendar recall, and habits without becoming a card wall?

const root = document.querySelector("#prototype-root");
const TODAY = "2026-09-08";
const variants = [
  { key: "A", name: "Today baseline" },
  { key: "B", name: "Agenda + context" },
  { key: "C", name: "Date-led focus" },
  { key: "D", name: "Calendar + side detail" },
  { key: "E", name: "Calendar + lower detail" },
  { key: "F", name: "Calendar + B top space" },
  { key: "G", name: "Today + production parity" },
  { key: "H", name: "Today + B top space" },
  { key: "I", name: "Today + phase rail" },
  { key: "J", name: "Daytime + now split" },
  { key: "K", name: "Daytime + update rail" },
  { key: "L", name: "Daytime + inline update" },
  { key: "M", name: "Habits + weekly ledger" },
  { key: "N", name: "Habits + target groups" },
  { key: "O", name: "Habits + week index" },
  { key: "P", name: "Habits + week summary" },
  { key: "Q", name: "Exercise + full detail" },
  { key: "R", name: "Exercise + compact detail" },
  { key: "S", name: "Habits + inline activity dots" },
  { key: "T", name: "Habits + compact dots" },
  { key: "U", name: "Habits + side dots" },
  { key: "V", name: "Habits + history rail" },
  { key: "W", name: "Habits + bare dots" },
  { key: "X", name: "Habits + connected dots" },
  { key: "Y", name: "Habits + micro dots" },
  { key: "Z", name: "Habits + tight circles" },
  { key: "AA", name: "Habits + tight squares" },
  { key: "AB", name: "Habits + weekend dots" },
  { key: "AC", name: "Habits + soft dots" },
  { key: "AD", name: "Habits + pill dots" },
  { key: "AE", name: "Habits + weekday labels" },
  { key: "AF", name: "Habits + weekday ticks" },
  { key: "AG", name: "Habits + today anchor" },
  { key: "FINAL", name: "Personal Dashboard 2.0 final" },
];

const CALENDAR_YEARS = [2025, 2026, 2027];
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

const dates = {
  "2026-09-08": { short: "9 月 8 日", weekday: "周二", label: "今天" },
  "2026-09-07": { short: "9 月 7 日", weekday: "周一", label: "昨天" },
  "2026-09-06": { short: "9 月 6 日", weekday: "周日", label: "周日" },
  "2026-09-05": { short: "9 月 5 日", weekday: "周六", label: "周六" },
};

const records = {
  "2026-09-08": {
    status: "reviewed",
    baselineMeta: "06:00 自动生成 · 07:18 起床后修订",
    baseline: [
      ["早上", "07:30–10:00", "先学习，再处理上午的固定安排", "早餐、学习一小时；不把空档填满。"],
      ["上午", "10:00–12:00", "工作 check-in → insurance reimbursement", "10:00 固定安排后，集中处理今天到期的 reimbursement。"],
      ["中午", "12:00–13:30", "午饭、留白和 buffer", "至少半小时不安排事项，为上午延伸留余地。"],
      ["下午", "13:30–17:00", "推进 apartment-renewal", "若没有紧急事项，给它一个完整工作块。"],
      ["晚上", "17:30 以后", "取饭、Exercise、自由恢复", "取饭后争取 30 分钟锻炼，其余时间不设必须事项。"],
    ],
    facts: [
      ["07:18", "起床", "有实际记录；不把晚起解释成偏离。"],
      ["10:00", "工作 check-in", "已记录；午前集中完成 insurance reimbursement。"],
      ["13:40", "突然出现紧急工作", "需要在 17:00 前处理。"],
      ["14:10", "切换到 low-energy plan", "下午先处理紧急工作，晚饭后保护休息。"],
    ],
    current: ["现在处理需要 17:00 前完成的紧急工作", "17:30 取晚饭仍然保留", "Exercise 退到 low-energy baseline：走 10 分钟即可", "晚饭后不再安排必须事项"],
    unknown: ["上午学习实际做了多少 · 未记录", "Reset living space · 未记录"],
    change: ["14:10", "下午原本推进 apartment-renewal", "能量很低 + 临时出现紧急工作", "紧急工作优先；运动退到 baseline；晚饭后保护休息"],
    review: ["有依据：工作 check-in、insurance reimbursement、紧急工作、取饭。", "计划与现实：下午没有继续 apartment-renewal，这是重排后的新方向。", "保持未知：上午学习和 Reset living space 没有足够记录。"],
    edits: [],
  },
  "2026-09-07": {
    status: "unreviewed",
    baselineMeta: "06:00 自动生成 · 没有早间修订",
    baseline: [["上午", "09:00–12:00", "工作 check-in 与一项 Task", "先处理固定安排，余下保持开放。"], ["下午", "14:00–17:30", "可选：继续 apartment-renewal", "没有完成也不产生补记任务。"], ["晚上", "17:30 以后", "取饭与自由时间", "Exercise 结果没有证据就保持未知。"]],
    facts: [["10:00", "工作 check-in", "有明确记录。"], ["17:30", "取饭", "有明确记录。"]],
    current: ["已知：工作 check-in、取饭", "未记录：下午 Task 与 Exercise", "今天没有晚间复盘，也不会形成复盘债务"],
    unknown: ["下午是否处理 apartment-renewal · 未记录", "Exercise · 未记录"],
    change: null,
    review: null,
    edits: [],
  },
  "2026-09-05": {
    status: "backfilled",
    baselineMeta: "06:00 自动生成 · 历史记录",
    baseline: [["上午", "10:00–12:00", "慢早晨与家务", "没有严格小时级安排。"], ["下午", "13:30–17:00", "处理 apartment-renewal", "保留一个完整工作块。"], ["晚上", "19:00 以后", "自由恢复", "后来补记了一段运动。"]],
    facts: [["11:20", "起床实际时间", "来自 9 月 8 日的历史补记。"], ["14:00", "apartment-renewal", "已知做过一段，但没有更细边界。"]],
    current: ["已知：apartment-renewal 有一段推进", "后补：19:20 跑步 30 分钟", "原有未知项仍然保持未知"],
    unknown: ["午间具体休息时长 · 未记录"],
    change: ["9 月 8 日 16:20", "9 月 5 日晚上没有运动记录", "后来想起这段经历", "补记：19:20 跑步 30 分钟"],
    review: ["保留一段可确认的工作块，以及补记的跑步。", "更正：睡觉 23:00 → 23:30。", "其余空白不追问。"],
    edits: ["9 月 8 日 16:20 · 补记 9 月 5 日的跑步 30 分钟。", "9 月 8 日 16:22 · 更正睡觉目标：23:00 → 23:30。"],
  },
};

const habits = [
  { name: "Exercise", detail: "每周目标 3 次 · normal 30 分钟 / low-energy baseline 10 分钟", count: "2 / 3", key: "exercise" },
  { name: "营养药", detail: "只显示已知完成状态；未记录不增加操作负担", count: "5 / 7", key: "nutrition" },
  { name: "Reset living space", detail: "每周目标 5 次 · low-energy baseline 是收好五件物品", count: "2 / 5", key: "reset" },
  { name: "起床", detail: "每日目标 07:30 · 已知实际 07:18", time: "07:30 / 07:18", key: "wake" },
  { name: "睡觉", detail: "每日目标 23:30 · 实际保持未知", time: "23:30 / 未记录", key: "sleep" },
];

let state = {
  variant: new URLSearchParams(window.location.search).get("variant")?.toUpperCase() || "A",
  screen: new URLSearchParams(window.location.search).get("screen") || "today",
  date: new URLSearchParams(window.location.search).get("date") || TODAY,
  month: new URLSearchParams(window.location.search).get("month") || TODAY.slice(0, 7),
  phase: new URLSearchParams(window.location.search).get("phase") || "progress",
  exerciseOpen: false,
  periodOpen: false,
  periodStep: "year",
  habit: new URLSearchParams(window.location.search).get("habit") || "exercise",
  habitCell: null,
  habitGridKey: null,
  expandedHabit: null,
  todayEvidenceVisible: null,
  toast: "",
};

if (!variants.some((item) => item.key === state.variant)) state.variant = "A";
if (!["today", "calendar", "habits"].includes(state.screen)) state.screen = "today";
if (!/^\d{4}-\d{2}-\d{2}$/.test(state.date)) state.date = TODAY;
if (!/^\d{4}-\d{2}$/.test(state.month)) state.month = TODAY.slice(0, 7);
if (!["morning", "progress", "evening"].includes(state.phase)) state.phase = "progress";
if (state.habit !== "exercise") state.habit = "exercise";

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function record() { return records[state.date] ?? null; }

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(key) {
  const date = parseDateKey(key);
  return { short: `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`, weekday: WEEKDAYS[date.getUTCDay()], label: key === TODAY ? "今天" : `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日` };
}

function dateInfo(key) { return dates[key] ?? formatDateKey(key); }

function shiftMonth(key, amount) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return `${year} 年 ${month} 月`;
}

function dateKeyForMonth(key) {
  return Object.keys(records).filter((date) => date.startsWith(key)).sort().at(-1) ?? `${key}-01`;
}

function dayKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function dateStatus(date) {
  const item = records[date];
  if (!item) return ["无记录", "missing", "·"];
  if (item.status === "reviewed" || item.status === "backfilled") return [item.status === "backfilled" ? "有复盘 · 已补记" : "有复盘", "reviewed", "✓"];
  return ["无复盘", "unreviewed", "○"];
}

function syncUrl() {
  const query = new URLSearchParams({ variant: state.variant, screen: state.screen, date: state.date, month: state.month, phase: state.phase });
  window.history.replaceState({}, "", `?${query.toString()}`);
}

function go(patch) { state = { ...state, ...patch }; state.toast = ""; render(); }

function brand() { return `<div class="brand"><span class="brand-mark">P</span><span><strong>Personal Dashboard</strong><small>Exercise tracking</small></span></div>`; }

function nav() {
  return [{ key: "today", label: "Today", sub: "今天" }, { key: "calendar", label: "Calendar", sub: "日历回看" }, { key: "habits", label: "Habits", sub: "习惯" }]
    .map((item) => `<button type="button" class="nav-link${state.screen === item.key ? " selected" : ""}" data-screen="${item.key}"><strong>${item.label}</strong><small>${item.sub}</small></button>`).join("");
}

function notice() { return `<div class="prototype-notice"><span class="notice-mark">FRAME</span><span>合成数据 · 只验证空间关系 · 不连接 Dida365 或真实日记</span></div>`; }

function shellRailContext() {
  if (state.screen === "calendar") {
    return `<div class="shell-rail-context"><span class="kicker">MONTH VIEW</span><strong>${monthLabel(state.month)}</strong><small>${dateInfo(state.date).short} · 当前选中</small></div>`;
  }
  if (state.screen === "habits") {
    return `<div class="shell-rail-context"><span class="kicker">HABITS · 本周</span><strong>9 / 14 已知</strong><small>weekly count · daily target</small></div>`;
  }
  const selected = dateInfo(state.date);
  const selectedLabel = state.date === TODAY ? "TODAY" : "SELECTED DAY";
  return `<div class="shell-rail-context"><span class="kicker">${selectedLabel} · ${state.date}</span><strong>${selected.short}</strong><small>Morning · Daytime · Evening</small></div>`;
}

function pageHeader() {
  if (state.screen === "habits") return `<header class="page-header"><div><span class="kicker">HABITS · 平级入口</span><h1>Habits</h1><p>周次数与每日目标时刻放在同一份轻量列表里。</p></div><span class="header-note">9 / 14<br /><small>本周已知</small></span></header>`;
  const item = dateInfo(state.date);
  const [status, statusClass, icon] = dateStatus(state.date);
  return `<header class="page-header"><div><span class="kicker">${state.screen === "calendar" ? "CALENDAR · 历史回看" : `TODAY · ${state.date}`}</span><h1>${item.short} <em>${item.weekday}</em></h1><p>${state.screen === "calendar" ? "复用 Today 的三阶段结构；没有记录也不产生补记债务。" : "查看这一天 Daily Record 的大致安排、当日进展和晚间复盘。"}</p></div><span class="status-label ${statusClass}">${icon} ${status}<small>${record()?.baselineMeta ?? "没有 Daily Record"}</small></span></header>`;
}

function phaseTabs() {
  if (state.screen === "habits") return "";
  const tabs = [["morning", "早间基准", "起点"], ["progress", "当日进展", "现在"], ["evening", "晚间复盘", record()?.review ? "已有" : "可选"]];
  return `<nav class="phase-tabs" aria-label="一天的三个视图">${tabs.map(([key, label, note]) => `<button type="button" class="phase-tab${state.phase === key ? " active" : ""}" data-phase="${key}"><strong>${label}</strong><small>${note}</small></button>`).join("")}</nav>`;
}

function dateList() {
  return `<div class="date-list" aria-label="可回看的日期">${Object.keys(dates).map((key) => { const item = dates[key]; const [label, cls, icon] = dateStatus(key); return `<button type="button" class="date-row${key === state.date ? " selected" : ""}" data-date="${key}"><span class="date-weekday">${item.weekday}</span><span><strong>${item.short}</strong><small class="${cls}">${icon} ${label}</small></span></button>`; }).join("")}</div>`;
}

function timeline(items) {
  return `<div class="timeline">${items.map(([period, time, title, detail], index) => `<article class="timeline-row"><div class="timeline-time"><strong>${esc(period)}</strong><small>${esc(time)}</small></div><div class="timeline-rule"><span class="timeline-dot${index === 0 ? " active" : ""}"></span></div><div class="timeline-copy"><h3>${esc(title)}</h3><p>${esc(detail)}</p></div></article>`).join("")}</div>`;
}

function facts(items) {
  return `<div class="fact-list">${items.map(([time, title, detail]) => `<article class="fact-row"><time>${esc(time)}</time><div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div></article>`).join("")}</div>`;
}

function evidencePanel(item) {
  if (!item) return `<section class="context-empty"><span class="context-icon">∅</span><strong>没有 Daily Record</strong><p>没有记录不等于没发生，也不用补齐。</p></section>`;
  return `<section class="context-section"><div class="context-heading"><span class="kicker">计划依据</span><span>7 项</span></div><details><summary>固定安排 <b>2</b></summary><p>10:00 工作 check-in<br />17:30 取晚饭</p></details><details><summary>Tasks（任务） <b>2</b></summary><p>保险 reimbursement · 今天到期<br />apartment-renewal · 周五到期</p></details><details><summary>Habits（习惯） <b>2</b></summary><p>Exercise · normal 30 分钟<br />Reset living space · 10 分钟</p></details><details><summary>Options（选项） <b>3</b></summary><p>学习 Agent memory · 小型 Vibe code · 玩游戏</p></details></section>`;
}

function boundaryPanel(item) {
  if (!item) return "";
  return `<section class="context-section quiet-context"><div class="context-heading"><span class="kicker">边界</span><span>保持安静</span></div><p><strong>${item.unknown.length}</strong> 项未知不会被解释成未完成，也不会生成补记任务。</p>${item.change ? `<div class="change-mini"><time>${esc(item.change[0])}</time><strong>日间重排</strong><p>${esc(item.change[1])} → ${esc(item.change[3])}</p></div>` : ""}${item.edits.length ? `<div class="edit-mini"><strong>修改记录</strong>${item.edits.map((edit) => `<p>${esc(edit)}</p>`).join("")}</div>` : ""}</section>`;
}

function renderMorning(item) {
  if (!item) return emptyDay();
  return `<section class="surface-section"><div class="section-top"><div><span class="kicker">Morning baseline · 早间起点</span><h2>今天的大致安排</h2></div><span class="section-meta">${esc(item.baselineMeta)}</span></div><p class="section-intro">这份基准保留下来；白天发生的变化进入当日进展，不覆盖这里。</p>${timeline(item.baseline)}</section>`;
}

function renderProgress(item) {
  if (!item) return emptyDay();
  return `<section class="surface-section"><div class="section-top"><div><span class="kicker">Current progress · 当日进展</span><h2>现在怎么走</h2></div><span class="section-meta">${item.facts.length} 条已知</span></div><div class="current-list">${item.current.map((line) => `<div class="current-row"><span>·</span><p>${esc(line)}</p></div>`).join("")}</div><div class="quiet-unknown"><strong>未知仍是未知</strong><span>${item.unknown.join(" · ")}</span></div></section><section class="surface-section compact-section"><div class="section-top"><div><span class="kicker">已有证据</span><h2>到目前为止</h2></div></div>${facts(item.facts)}</section>${item.change ? `<section class="surface-section compact-section"><div class="section-top"><div><span class="kicker">Daytime change log</span><h2>只保留有意义的变化</h2></div></div><div class="change-line"><time>${esc(item.change[0])}</time><span>${esc(item.change[1])}</span><b>→</b><span>${esc(item.change[3])}</span></div></section>` : ""}`;
}

function renderEvening(item) {
  if (!item) return emptyDay();
  if (!item.review) return `<section class="surface-section quiet-empty"><span class="kicker">Evening review · 可选</span><h2>还没有晚间复盘</h2><p>当日进展仍然可以直接阅读。没有 review 不会产生待办，也不要求补齐这一天。</p><button type="button" class="text-action" data-preview="evening">下一轮加入“用已有证据开始”</button></section>`;
  return `<section class="surface-section"><div class="section-top"><div><span class="kicker">Evening review · 晚间复盘</span><h2>先整理已有证据</h2></div><span class="section-meta">Minimal Review</span></div><div class="review-lines">${item.review.map((line) => `<p><span>•</span>${esc(line)}</p>`).join("")}</div><div class="review-footer"><span>未记录 ≠ 未完成</span><span>没有 review debt</span><span>之后仍可补充</span></div></section>`;
}

function emptyDay() { return `<section class="surface-section quiet-empty"><span class="kicker">No Daily Record</span><h2>这一天还没有记录</h2><p>没有记录不等于没发生。先让这一天保持空白，也是一种有效状态。</p></section>`; }

function dailyContent() {
  const item = record();
  if (state.screen === "habits") return habitsContent();
  if (state.screen === "calendar") { const info = dateInfo(state.date); return `<div class="history-strip"><span class="history-icon">${item ? "◷" : "∅"}</span><div><strong>${info.label} · ${info.short}</strong><p>${item ? `默认打开 ${item.review ? "晚间复盘" : "当日进展"}，仍可切换其他 tab。` : "无记录；不会自动制造补记义务。"}</p></div>${state.date !== TODAY ? `<button type="button" class="text-action" data-screen="today">回到今天</button>` : ""}</div>${state.phase === "morning" ? renderMorning(item) : state.phase === "evening" ? renderEvening(item) : renderProgress(item)}`; }
  return state.phase === "morning" ? renderMorning(item) : state.phase === "evening" ? renderEvening(item) : renderProgress(item);
}

function habitsContent() {
  return `<section class="surface-section habits-intro"><div><span class="kicker">Week of Sep 7–13 · 模拟读数</span><h2>有进展，也允许不知道</h2><p>周次数与每日时间目标并列；Dashboard 的自由文本不会自动替代 Dida365 打勾。</p></div><strong class="habit-total">9 <small>/ 14<br />已知</small></strong></section><section class="habit-table"><div class="table-label"><span>习惯</span><span>目标 / 已知</span></div>${habits.map((habit) => `<article class="habit-row"><div class="habit-symbol">${habit.key === "exercise" ? "↗" : habit.key === "wake" ? "☼" : habit.key === "sleep" ? "☾" : "＋"}</div><div><strong>${habit.name}</strong><p>${habit.detail}</p>${habit.key === "exercise" && state.exerciseOpen ? `<div class="exercise-note"><span>Dashboard 自由文本</span><strong>跑步 30 分钟</strong><small>不要求结构化详情或 Strava 链接</small></div>` : ""}</div><div class="habit-value">${habit.count ? `<strong>${habit.count}</strong><small>每周次数</small>` : `<strong>${habit.time.split(" / ")[0]}</strong><small>${habit.time.split(" / ")[1]}</small>`}</div>${habit.key === "exercise" ? `<button type="button" class="row-action" data-action="toggle-exercise">${state.exerciseOpen ? "收起" : "展开"}</button>` : ""}</article>`).join("")}</section><p class="frame-note">骨架版：健身展开输入、历史补记／更正和完整状态动作下一轮加入。</p>`;
}

function habitGlyph(key) {
  return key === "exercise" ? "↗" : key === "wake" ? "☼" : key === "sleep" ? "☾" : "＋";
}

function habitValue(habit) {
  if (habit.count) return `<strong>${esc(habit.count)}</strong><small>每周次数</small>`;
  const [target, actual] = habit.time.split(" / ");
  return `<strong>${esc(target)}</strong><small>${actual === "未记录" ? "未记录" : `${esc(actual)} · 已知实际`}</small>`;
}

function habitInlineExercise() {
  return state.exerciseOpen ? `<div class="exercise-note"><span>Dashboard 自由文本</span><strong>跑步 30 分钟</strong><small>不要求结构化详情或 Strava 链接</small></div>` : "";
}

function habitLedgerRow(habit) {
  return `<article class="habit-ledger-row"><div class="habit-symbol">${habitGlyph(habit.key)}</div><div class="habit-ledger-copy"><strong>${esc(habit.name)}</strong><p>${esc(habit.detail)}</p>${habit.key === "exercise" ? habitInlineExercise() : ""}</div><div class="habit-value">${habitValue(habit)}</div>${habit.key === "exercise" ? `<button type="button" class="row-action" data-action="toggle-exercise">${state.exerciseOpen ? "收起" : "展开"}</button>` : ""}</article>`;
}

function habitTargetRow(habit) {
  return `<article class="habit-target-row"><div class="habit-target-name"><span class="habit-symbol">${habitGlyph(habit.key)}</span><div><strong>${esc(habit.name)}</strong><p>${esc(habit.detail)}</p>${habit.key === "exercise" ? habitInlineExercise() : ""}</div></div><div class="habit-value">${habitValue(habit)}</div>${habit.key === "exercise" ? `<button type="button" class="row-action" data-action="toggle-exercise">${state.exerciseOpen ? "收起" : "展开"}</button>` : ""}</article>`;
}

function habitsTodayRail() {
  return `<aside class="habits-proto-rail"><section class="habits-rail-section"><div class="habits-rail-heading"><span class="section-label">今日已知</span><small>9 月 8 日</small></div><div class="habits-rail-fact"><span>起床</span><strong>07:18</strong><small>目标 07:30</small></div><div class="habits-rail-fact"><span>睡觉</span><strong>未记录</strong><small>目标 23:30</small></div><div class="habits-rail-fact"><span>Exercise</span><strong>2 / 3</strong><small>本周次数</small></div></section><section class="habits-rail-section quiet-context"><div class="habits-rail-heading"><span class="section-label">记录边界</span><small>只读</small></div><p>未记录保持未知；一句“跑步 30 分钟”只是 Dashboard 自由文本，不自动代表滴答已打勾。</p></section></aside>`;
}

function habitsShell(body) {
  return `<div class="app app-a b-shell-app habits-proto-app">${bStyleTopbar()}${notice()}<aside class="sidebar b-shell-sidebar">${shellRailContext()}<nav class="side-nav">${nav()}</nav><div class="sidebar-bottom"><span></span>Private and offline on this Mac.</div></aside><main class="workspace"><div class="workspace-inner habits-proto-workspace">${body}</div></main>${switcher()}${toast()}</div>`;
}

function habitsWeekMeta() {
  return `<div class="habits-proto-meta"><div><span class="kicker">WEEK OF SEP 7–13 · 模拟读数</span><strong>本周习惯</strong></div><span>9 / 14 已知 · 未记录不判定为零</span></div>`;
}

function habitsVariantM() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-ledger-layout"><section class="habits-ledger-main"><section class="habits-ledger-group"><div class="habits-group-heading"><span class="section-label">每周次数</span><small>3 条</small></div>${weekly.map(habitLedgerRow).join("")}</section><section class="habits-ledger-group"><div class="habits-group-heading"><span class="section-label">每日目标时刻</span><small>2 条</small></div>${daily.map(habitLedgerRow).join("")}</section><p class="frame-note">M：一份连续的周账本；Exercise 可以展开一句自由记录。</p></section>${habitsTodayRail()}</div>`);
}

function habitsVariantN() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-target-grid"><section class="habits-target-group"><div class="habits-group-heading"><span class="section-label">每周次数</span><small>只看周进度</small></div>${weekly.map(habitTargetRow).join("")}</section><section class="habits-target-group"><div class="habits-group-heading"><span class="section-label">每日目标时刻</span><small>目标 / 已知实际</small></div>${daily.map(habitTargetRow).join("")}</section></div><div class="habits-boundary-line"><strong>看法</strong><span>周次数和每日时间是两种不同的读法；不强迫它们合成一个总分。</span></div>`);
}

function habitsVariantO() {
  const weekly = habits.filter((habit) => habit.count);
  const weekDays = [["周一", "9/7", "已知"], ["周二", "9/8", "今天"], ["周三", "9/9", ""], ["周四", "9/10", ""], ["周五", "9/11", ""], ["周六", "9/12", ""], ["周日", "9/13", ""]];
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-index-layout"><aside class="habits-week-index"><div class="habits-group-heading"><span class="section-label">本周索引</span><small>轻量上下文</small></div>${weekDays.map(([day, date, note], index) => `<button type="button" class="habits-week-index-row${index === 1 ? " selected" : ""}" data-preview="habit-day"><span>${day}</span><strong>${date}</strong><small>${note || "—"}</small></button>`).join("")}<p>这里不显示每天的完成清单，只帮助定位当前周。</p></aside><section class="habits-index-main"><div class="habits-group-heading"><span class="section-label">习惯周进度</span><small>3 条 · 周次数</small></div>${weekly.map(habitLedgerRow).join("")}<section class="habits-index-anchors"><div class="habits-group-heading"><span class="section-label">每日锚点</span><small>目标 / 实际</small></div>${habits.filter((habit) => habit.time).map(habitLedgerRow).join("")}</section></section></div>`);
}

function habitTodayRow(habit) {
  if (habit.time) {
    const [target, actual] = habit.time.split(" / ");
    const known = actual !== "未记录";
    return `<article class="habit-today-row"><div><strong>${esc(habit.name)}</strong><p>目标 ${esc(target)} · ${known ? `已知实际 ${esc(actual)}` : "实际保持未知"}</p></div><div class="habit-value${known ? "" : " unknown"}"><strong>${esc(actual)}</strong><small>今日实际</small></div></article>`;
  }
  return `<article class="habit-today-row"><div><strong>${esc(habit.name)}</strong><p>本周目标 ${esc(habit.count.split(" /")[1])} 次 · 今日未记录，不判定为未完成</p>${habit.key === "exercise" ? `${habitInlineExercise()}<div class="habit-row-actions"><button type="button" class="row-action" data-action="toggle-exercise">${state.exerciseOpen ? "收起" : "展开"}</button><button type="button" class="row-action" data-habit-detail="exercise">看 30 天</button></div>` : ""}</div><div class="habit-value"><strong>${esc(habit.count)}</strong><small>本周次数</small></div></article>`;
}

function habitsVariantP() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout"><aside class="habits-week-summary"><div class="habits-group-heading"><span class="section-label">本周统计</span><small>简短摘要</small></div><div class="habits-summary-total"><strong>9 / 14</strong><span>已知进度</span></div>${weekly.map((habit) => `<article class="habits-summary-row"><span>${esc(habit.name)}</span><strong>${esc(habit.count)}</strong><small>每周次数</small></article>`).join("")}<p>未记录不判定为零，也不要求为了填满统计而补写。</p></aside><section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>2026-09-08 · 已知与未知并列</small></div><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map(habitTodayRow).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map(habitTodayRow).join("")}</section></section></div>`);
}

const exerciseKnownDays = new Set(["2026-08-12", "2026-08-16", "2026-08-21", "2026-08-25", "2026-08-30", "2026-09-02", "2026-09-05"]);
const habitKnownDays = {
  exercise: exerciseKnownDays,
  nutrition: new Set(["2026-07-02", "2026-07-08", "2026-07-15", "2026-07-21", "2026-08-03", "2026-08-12", "2026-08-19", "2026-08-27", "2026-09-01", "2026-09-04"]),
  reset: new Set(["2026-07-05", "2026-07-18", "2026-08-04", "2026-08-18", "2026-09-03"]),
  wake: new Set(["2026-08-12", "2026-08-16", "2026-08-21", "2026-08-25", "2026-08-30", "2026-09-05", "2026-09-08"]),
  sleep: new Set(["2026-08-11", "2026-08-15", "2026-08-20", "2026-08-24", "2026-08-29", "2026-09-04"]),
};
const exerciseNotes = [
  ["9 月 5 日", "跑步 30 分钟", "自由文本记录；没有要求结构化详情。"],
  ["9 月 2 日", "低能量：走 10 分钟", "仍然作为一次已知运动记录查看。"],
  ["8 月 30 日", "跑步 30 分钟", "本地合成的示例记录。"],
  ["8 月 25 日", "跑步 30 分钟", "本地合成的示例记录。"],
];
const exerciseNoteByDay = {
  "2026-09-05": "跑步 30 分钟",
  "2026-09-02": "低能量：走 10 分钟",
  "2026-08-30": "跑步 30 分钟",
  "2026-08-25": "跑步 30 分钟",
};
const habitRecordByDay = {
  exercise: exerciseNoteByDay,
  nutrition: { "2026-09-04": "已知记录：营养药", "2026-09-01": "已知记录：营养药" },
  reset: { "2026-09-03": "收好五件物品" },
  wake: { "2026-09-08": "实际 07:18", "2026-09-05": "实际 08:12" },
  sleep: { "2026-09-04": "实际 23:42", "2026-08-29": "实际 23:36" },
};

function exerciseMonthDays() {
  const end = parseDateKey(TODAY);
  const start = new Date(end.getTime());
  start.setUTCDate(start.getUTCDate() - 29);
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start.getTime());
    date.setUTCDate(start.getUTCDate() + index);
    return dayKey(date);
  });
}

function exerciseDotCalendar() {
  const days = exerciseMonthDays();
  const leading = parseDateKey(days[0]).getUTCDay();
  const cells = [...Array.from({ length: leading }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return `<div class="habit-dot-calendar"><div class="habit-dot-weekdays">${WEEKDAYS.map((day) => `<span>${day.slice(1)}</span>`).join("")}</div><div class="habit-dot-cells">${cells.map((key) => { if (!key) return `<span class="habit-dot-cell empty" aria-hidden="true"></span>`; const date = parseDateKey(key); const done = exerciseKnownDays.has(key); const today = key === TODAY; return `<span class="habit-dot-cell${today ? " today" : ""}" title="${key} · ${done ? "已知完成" : "未记录"}"><small>${date.getUTCDate()}</small>${done ? `<i class="habit-dot" aria-label="${key} 已知完成"></i>` : ""}</span>`; }).join("")}</div></div>`;
}

function habitsVariantQ() {
  return habitsShell(`<div class="habit-detail-workspace"><header class="habit-detail-header"><div><button type="button" class="habit-back-action" data-back-habits>← 回到 Habits</button><span class="kicker">HABITS / EXERCISE · 二级详情</span><h1>Exercise</h1><p>看过去 30 天的已知记录、目标进度和自由文本，不把空白解释成失败。</p></div><span class="status-label"><strong>2 / 3</strong><small>本周已知次数</small></span></header><div class="habit-detail-layout"><section class="habit-detail-main"><div class="habit-detail-heading"><div><span class="section-label">过去 30 天</span><h2>已知完成点</h2></div><button type="button" class="habit-range-button" data-preview="habit-range">30 天⌄</button></div>${exerciseDotCalendar()}<div class="habit-dot-legend"><span><i class="habit-dot"></i> 已知完成</span><span><i class="habit-dot-blank"></i> 未记录 / 未确认</span></div><p class="habit-detail-note">点阵只表达“这里有一条已知完成记录”。没有点的日期保持开放，不自动代表没有完成。</p></section><aside class="habit-detail-rail"><section class="habit-detail-section"><div class="habits-group-heading"><span class="section-label">读数</span><small>保守统计</small></div><div class="habit-detail-stat"><span>已知完成</span><strong>7 次</strong></div><div class="habit-detail-stat"><span>周目标</span><strong>3 次 / 周</strong></div><div class="habit-detail-stat"><span>文字记录</span><strong>4 条</strong></div></section><section class="habit-detail-section"><div class="habits-group-heading"><span class="section-label">最近记录</span><small>自由文本</small></div>${exerciseNotes.map(([date, title, detail]) => `<article class="habit-note-row"><time>${esc(date)}</time><h4>${esc(title)}</h4><p>${esc(detail)}</p></article>`).join("")}</section><section class="habit-detail-section quiet-context"><div class="habits-group-heading"><span class="section-label">第一版分析</span><small>不替你下结论</small></div><p>过去 30 天至少能确认 7 次；最近一周已知 2 次。其余日期记录不足，先不计算完成率或失败率。</p></section></aside></div></div>`);
}

function habitCompactDotStrip() {
  return `<div class="habit-compact-chart"><div class="habit-compact-chart-top"><span class="section-label">过去 30 天</span><span>7 次已知完成 · 本周 2 / 3</span></div><div class="habit-compact-months"><span>8 月</span><span>9 月</span></div><div class="habit-compact-dots">${exerciseMonthDays().map((key) => { const done = exerciseKnownDays.has(key); return `<span class="habit-compact-cell${key === TODAY ? " today" : ""}" title="${key} · ${done ? "已知完成" : "未记录"}">${done ? `<i class="habit-dot" aria-label="${key} 已知完成"></i>` : ""}</span>`; }).join("")}</div><div class="habit-dot-legend"><span><i class="habit-dot"></i> 已知完成</span><span><i class="habit-dot-blank"></i> 空白 = 未记录 / 未确认</span></div></div>`;
}

function habitsVariantR() {
  return habitsShell(`<div class="habit-compact-workspace"><header class="habit-compact-header"><div><button type="button" class="habit-back-action" data-back-habits>← 回到 Habits</button><span class="kicker">HABITS / EXERCISE · 紧凑详情</span><h1>Exercise</h1><p>只保留长期观察真正需要的点阵、最近记录和少量读数。</p></div><span class="status-label"><strong>2 / 3</strong><small>本周已知次数</small></span></header>${habitCompactDotStrip()}<div class="habit-compact-lower"><section class="habit-compact-notes"><div class="habits-group-heading"><span class="section-label">最近记录</span><small>看具体发生了什么</small></div>${exerciseNotes.slice(0, 3).map(([date, title, detail]) => `<article class="habit-note-row"><time>${esc(date)}</time><h4>${esc(title)}</h4><p>${esc(detail)}</p></article>`).join("")}</section><aside class="habit-compact-stats"><div class="habits-group-heading"><span class="section-label">读数</span><small>只读</small></div><div class="habit-detail-stat"><span>已知完成</span><strong>7 次</strong></div><div class="habit-detail-stat"><span>周目标</span><strong>3 次 / 周</strong></div><p>空白不计算为失败；如果想知道具体内容，回到对应日期的 Calendar 记录。</p></aside></div></div>`);
}

function habitCellPopover(habitKey = state.habitGridKey || "exercise", options = {}) {
  const habit = habits.find((item) => item.key === habitKey) || habits[0];
  if (!state.habitCell) return `<div class="habit-mini-popover empty"><p>点一个有记录的格子，在这里看当天内容。</p></div>`;
  const info = dateInfo(state.habitCell);
  const note = habitRecordByDay[habitKey]?.[state.habitCell];
  const emptyMessage = habit.time ? "这天没有已知实际时间；保持未知，不判定为未完成。" : "这天没有已知记录；保持未知，不判定为未完成。";
  if (options.minimal || habitKey === "nutrition") return `<div class="habit-mini-popover minimal"><strong>${esc(info.short)}</strong><small>${note ? "已知记录" : "未记录"}</small><button type="button" class="habit-mini-close" data-action="close-habit-cell" aria-label="关闭记录">×</button></div>`;
  return `<div class="habit-mini-popover"><div><strong>${esc(info.short)} · ${esc(habit.name)}</strong><button type="button" class="habit-mini-close" data-action="close-habit-cell" aria-label="关闭记录">×</button></div><p>${note ? esc(note) : emptyMessage}</p></div>`;
}

function habitRecentWeekStrip(habitKey = "exercise", style = "boxed") {
  const habit = habits.find((item) => item.key === habitKey) || habits[0];
  const knownDays = habitKnownDays[habitKey] || new Set();
  const styleClass = ["dots", "line", "micro", "tight-circle", "tight-square", "weekend", "soft", "pill", "weekday", "weekday-line", "weekday-focus"].includes(style) ? style : "boxed";
  const end = parseDateKey(TODAY);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end.getTime());
    date.setUTCDate(end.getUTCDate() - (6 - index));
    return dayKey(date);
  });
  const heading = styleClass === "boxed" ? `<div class="habit-week-strip-heading"><span>近 7 天</span><small>${esc(habit.time ? "已知实际" : "已知记录")}</small></div>` : styleClass === "line" ? `<div class="habit-week-strip-heading"><span>近 7 天</span><small>连续点</small></div>` : styleClass === "dots" ? `<div class="habit-week-strip-heading"><span>近 7 天</span><small>${esc(habit.time ? "已知实际" : "已知记录")}</small></div>` : ["tight-circle", "tight-square"].includes(styleClass) ? "" : styleClass === "weekend" ? `<div class="habit-week-strip-heading"><span>近 7 天</span><small>轻分组</small></div>` : styleClass === "soft" ? `<div class="habit-week-strip-heading"><span>近 7 天</span><small>轻重层次</small></div>` : styleClass === "pill" ? "" : `<div class="habit-week-strip-heading minimal"><span>近 7 天</span></div>`;
  const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
  const weekdayMarkup = ["weekday", "weekday-line", "weekday-focus"].includes(styleClass) ? `<div class="habit-week-strip-weekdays">${days.map((key) => { const date = parseDateKey(key); const label = styleClass === "weekday-line" ? `周${weekdayLabels[date.getUTCDay()]}` : weekdayLabels[date.getUTCDay()]; return `<span class="${key === TODAY ? "today" : ""}">${label}</span>`; }).join("")}</div>` : "";
  return `<div class="habit-week-strip habit-week-strip-${styleClass}">${heading}${weekdayMarkup}<div class="habit-week-strip-dots-row">${days.map((key) => { const done = knownDays.has(key); const date = parseDateKey(key); return `<button type="button" class="habit-week-strip-cell${done ? " done" : ""}${key === TODAY ? " today" : ""}" data-habit-key="${habitKey}" data-habit-day="${key}" aria-label="${key} · ${done ? "已知记录" : "未记录"}"><span>${styleClass === "boxed" ? date.getUTCDate() : ""}</span></button>`; }).join("")}</div></div>`;
}

function habitMiniActivityGrid(habitKey = "exercise", density = "") {
  const weekCount = 12;
  const lastWeek = parseDateKey(TODAY);
  lastWeek.setUTCDate(lastWeek.getUTCDate() - lastWeek.getUTCDay());
  const first = new Date(lastWeek.getTime());
  first.setUTCDate(lastWeek.getUTCDate() - (weekCount - 1) * 7);
  const dayLabels = ["日", "一", "二", "三", "四", "五", "六"];
  const habit = habits.find((item) => item.key === habitKey) || habits[0];
  const knownDays = habitKnownDays[habitKey] || new Set();
  const dotLabel = habit.time ? "已知实际" : "已知记录";
  const monthLabels = Array.from({ length: weekCount }, (_, week) => { const date = new Date(first.getTime()); date.setUTCDate(first.getUTCDate() + week * 7); return date.getUTCDate() <= 7 || week === 0 ? `${date.getUTCMonth() + 1} 月` : ""; });
  const cells = dayLabels.map((label, weekday) => `<div class="habit-mini-row"><span>${label}</span>${Array.from({ length: weekCount }, (_, week) => { const date = new Date(first.getTime()); date.setUTCDate(first.getUTCDate() + week * 7 + weekday); const key = dayKey(date); const inRange = key <= TODAY; const done = knownDays.has(key); return inRange ? `<button type="button" class="habit-mini-cell${done ? " done" : ""}${key === TODAY ? " today" : ""}" data-habit-key="${habitKey}" data-habit-day="${key}" aria-label="${key} · ${done ? dotLabel : "未记录"}"></button>` : `<span class="habit-mini-cell outside"></span>`; }).join("")}</div>`).join("");
  return `<div class="habit-mini-history${density ? ` habit-mini-history-${density}` : ""}"><div class="habit-mini-heading"><span>${esc(habit.name)} · 近 12 周</span><small>点格子看记录</small></div><div class="habit-mini-months"><span></span>${monthLabels.map((label) => `<span>${label}</span>`).join("")}</div><div class="habit-mini-grid">${cells}</div><div class="habit-mini-legend"><span><i class="habit-dot"></i>${dotLabel}</span><span>空白不判定为失败</span></div></div>`;
}

function habitTodayRowWithHistory(habit, options = {}) {
  const density = options.density || "";
  const side = options.layout === "side";
  const isDaily = Boolean(habit.time);
  const [target, actual] = isDaily ? habit.time.split(" / ") : ["", ""];
  const expanded = state.expandedHabit === habit.key;
  const history = expanded ? side ? `<div class="habit-history-side"><div>${habitMiniActivityGrid(habit.key, density)}</div>${habitCellPopover()}</div>` : `<div class="habit-history-reveal"><div>${habitMiniActivityGrid(habit.key, density)}</div>${habitCellPopover()}</div>` : "";
  const description = isDaily ? `目标 ${esc(target)} · ${actual === "未记录" ? "实际保持未知" : `已知实际 ${esc(actual)}`}` : `本周目标 ${esc(habit.count.split(" /")[1])} 次 · 今日未记录，不判定为未完成`;
  const value = isDaily ? `<div class="habit-value${actual === "未记录" ? " unknown" : ""}"><strong>${esc(actual)}</strong><small>今日实际</small></div>` : `<div class="habit-value"><strong>${esc(habit.count)}</strong><small>本周次数</small></div>`;
  return `<article class="habit-today-row habit-today-row-history${side ? " habit-today-row-side" : ""}${expanded ? " expanded" : ""}"><div><strong>${esc(habit.name)}</strong><p>${description}</p><div class="habit-row-actions"><button type="button" class="row-action" data-action="toggle-habit-grid" data-habit-grid="${habit.key}">${expanded ? "收起" : "展开"}</button></div></div>${value}${history}</article>`;
}

function habitTodayRowSide(habit, stripStyle = "boxed") {
  const isDaily = Boolean(habit.time);
  const [target, actual] = isDaily ? habit.time.split(" / ") : ["", ""];
  const expanded = state.expandedHabit === habit.key;
  const selected = state.habitGridKey === habit.key && state.habitCell;
  const description = isDaily ? `目标 ${esc(target)} · ${actual === "未记录" ? "实际保持未知" : `已知实际 ${esc(actual)}`}` : `本周目标 ${esc(habit.count.split(" /")[1])} 次 · 今日未记录，不判定为未完成`;
  const value = isDaily ? `<div class="habit-value${actual === "未记录" ? " unknown" : ""}"><strong>${esc(actual)}</strong><small>今日实际</small></div>` : `<div class="habit-value"><strong>${esc(habit.count)}</strong><small>本周次数</small></div>`;
  const history = expanded ? habitMiniActivityGrid(habit.key, "side") : habitRecentWeekStrip(habit.key, stripStyle);
  const detail = selected ? habitCellPopover(habit.key) : "";
  return `<article class="habit-today-row habit-today-row-side${expanded ? " expanded" : ""}"><div><strong>${esc(habit.name)}</strong><p>${description}</p><div class="habit-row-actions"><button type="button" class="row-action" data-action="toggle-habit-grid" data-habit-grid="${habit.key}">${expanded ? "收起" : "展开"}</button></div></div>${value}<div class="habit-history-side${expanded ? " expanded" : ""}">${history}${detail}</div></article>`;
}

function habitsVariantS() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout"><aside class="habits-week-summary"><div class="habits-group-heading"><span class="section-label">本周统计</span><small>简短摘要</small></div><div class="habits-summary-total"><strong>9 / 14</strong><span>已知进度</span></div>${weekly.map((habit) => `<article class="habits-summary-row"><span>${esc(habit.name)}</span><strong>${esc(habit.count)}</strong><small>每周次数</small></article>`).join("")}<p>未记录不判定为零，也不要求为了填满统计而补写。</p></aside><section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>2026-09-08 · 已知与未知并列</small></div><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map(habitTodayRowWithHistory).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map(habitTodayRowWithHistory).join("")}</section></section></div>`);
}

function habitsSummarySidebar(weekly) {
  return `<aside class="habits-week-summary"><div class="habits-group-heading"><span class="section-label">本周统计</span><small>简短摘要</small></div><div class="habits-summary-total"><strong>9 / 14</strong><span>已知进度</span></div>${weekly.map((habit) => `<article class="habits-summary-row"><span>${esc(habit.name)}</span><strong>${esc(habit.count)}</strong><small>每周次数</small></article>`).join("")}<p>未记录不判定为零，也不要求为了填满统计而补写。</p></aside>`;
}

function habitsVariantT() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout habits-layout-t">${habitsSummarySidebar(weekly)}<section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>紧凑点阵 · 已知与未知并列</small></div><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map((habit) => habitTodayRowWithHistory(habit, { density: "compact" })).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map((habit) => habitTodayRowWithHistory(habit, { density: "compact" })).join("")}</section></section></div>`);
}

function habitsVariantU() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout habits-layout-u">${habitsSummarySidebar(weekly)}<section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>近 7 天常驻 · 展开看近 12 周</small></div><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map(habitTodayRowSide).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map(habitTodayRowSide).join("")}</section></section></div>`);
}

function habitsVariantSideStrip(style, caption) {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout habits-layout-u habits-layout-${style}">${habitsSummarySidebar(weekly)}<section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>${caption}</small></div><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map((habit) => habitTodayRowSide(habit, style)).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map((habit) => habitTodayRowSide(habit, style)).join("")}</section></section></div>`);
}

function habitsVariantW() { return habitsVariantSideStrip("dots", "纯点 · 展开看近 12 周"); }
function habitsVariantX() { return habitsVariantSideStrip("line", "连接点 · 展开看近 12 周"); }
function habitsVariantY() { return habitsVariantSideStrip("micro", "微型点串 · 展开看近 12 周"); }
function habitsVariantZ() { return habitsVariantSideStrip("tight-circle", "近 7 天紧凑点 · 展开看近 12 周"); }
function habitsVariantAA() { return habitsVariantSideStrip("tight-square", "近 7 天紧凑方块 · 展开看近 12 周"); }
function habitsVariantAB() { return habitsVariantSideStrip("weekend", "近 7 天自然分组 · 展开看近 12 周"); }
function habitsVariantAC() { return habitsVariantSideStrip("soft", "近 7 天轻重层次 · 展开看近 12 周"); }
function habitsVariantAD() { return habitsVariantSideStrip("pill", "近 7 天整体点串 · 展开看近 12 周"); }
function habitsVariantAE() { return habitsVariantSideStrip("weekday", "周几对齐 · 展开看近 12 周"); }
function habitsVariantAF() { return habitsVariantSideStrip("weekday-line", "周几坐标 · 展开看近 12 周"); }
function habitsVariantAG() { return habitsVariantSideStrip("weekday-focus", "今天锚点 · 展开看近 12 周"); }

function habitRailRow(habit) {
  const isDaily = Boolean(habit.time);
  const [target, actual] = isDaily ? habit.time.split(" / ") : ["", ""];
  const selected = (state.expandedHabit || "exercise") === habit.key;
  const value = isDaily ? `<div class="habit-value${actual === "未记录" ? " unknown" : ""}"><strong>${esc(actual)}</strong><small>今日实际</small></div>` : `<div class="habit-value"><strong>${esc(habit.count)}</strong><small>本周次数</small></div>`;
  const description = isDaily ? `目标 ${esc(target)} · ${actual === "未记录" ? "实际保持未知" : `已知实际 ${esc(actual)}`}` : `本周目标 ${esc(habit.count.split(" /")[1])} 次 · 今日未记录，不判定为未完成`;
  return `<article class="habit-today-row habit-rail-row${selected ? " selected" : ""}"><div><strong>${esc(habit.name)}</strong><p>${description}</p><div class="habit-row-actions"><button type="button" class="row-action" data-action="select-habit-rail" data-habit-grid="${habit.key}">${selected ? "已显示" : "看历史"}</button></div></div>${value}</article>`;
}

function habitsVariantV() {
  const weekly = habits.filter((habit) => habit.count);
  const daily = habits.filter((habit) => habit.time);
  const railHabitKey = state.expandedHabit || "exercise";
  return habitsShell(`${pageHeader()}${habitsWeekMeta()}<div class="habits-summary-layout habits-layout-v">${habitsSummarySidebar(weekly)}<section class="habits-today-detail"><div class="habits-group-heading"><span class="section-label">今日情况</span><small>右侧固定历史点阵</small></div><div class="habits-v-body"><section class="habits-v-list"><section class="habits-today-section"><div class="habits-today-heading"><strong>每日锚点</strong><small>目标 / 实际</small></div>${daily.map(habitRailRow).join("")}</section><section class="habits-today-section"><div class="habits-today-heading"><strong>本周习惯在今天</strong><small>周次数 · 今日状态</small></div>${weekly.map(habitRailRow).join("")}</section></section><aside class="habits-history-rail"><div class="habits-group-heading"><span class="section-label">历史点阵</span><small>默认显示 Exercise</small></div><div class="habits-history-rail-picker">${habits.map((habit) => `<button type="button" class="${habit.key === railHabitKey ? "selected" : ""}" data-action="select-habit-rail" data-habit-grid="${habit.key}">${esc(habit.name)}</button>`).join("")}</div>${habitMiniActivityGrid(railHabitKey, "rail")}${habitCellPopover(railHabitKey)}</aside></div></section></div>`);
}

function contextFor(screen) {
  if (screen === "habits") return `<section class="context-section"><div class="context-heading"><span class="kicker">今日小结</span><span>只读</span></div><p><strong>起床</strong> 07:18 <small>目标 07:30</small></p><p><strong>睡觉</strong> 未记录 <small>目标 23:30</small></p><p><strong>Exercise</strong> 2 / 3 <small>周次数</small></p></section><section class="context-section quiet-context"><div class="context-heading"><span class="kicker">边界</span></div><p>一句“跑步 30 分钟”只作为 Dashboard 记录，不自动代表滴答已打勾。</p></section>`;
  return `${evidencePanel(record())}${boundaryPanel(record())}`;
}

function baseContent(className, includeDateRail = false) {
  return `<div class="${className}">${pageHeader()}${phaseTabs()}${dailyContent()}</div>`;
}

function variantA() {
  return `<div class="app app-a"><aside class="sidebar">${brand()}<nav class="side-nav">${nav()}</nav><div class="sidebar-bottom"><span></span>Private and offline on this Mac.</div></aside><main class="workspace">${notice()}<div class="workspace-inner"><div class="a-top">${pageHeader()}${phaseTabs()}</div><div class="a-body-grid"><section class="a-primary">${dailyContent()}</section><aside class="a-context">${contextFor(state.screen)}</aside></div></div></main>${switcher()}${toast()}</div>`;
}

function variantB() {
  return `<div class="app app-b"><header class="topbar">${brand()}<nav class="top-nav">${nav()}</nav><span class="variant-caption">B · agenda + context</span></header>${notice()}<main class="b-layout"><aside class="b-dates"><span class="kicker">Date index</span>${dateList()}<p class="rail-note">当前选中的日期保留在 tab 切换中。</p></aside><section class="b-main">${baseContent("content")}</section><aside class="b-context"><span class="kicker">Context</span>${contextFor(state.screen)}</aside></main>${switcher()}${toast()}</div>`;
}

function variantC() {
  const item = dateInfo(state.date);
  return `<div class="app app-c"><header class="topbar">${brand()}<nav class="top-nav">${nav()}</nav><span class="variant-caption">C · date-led focus</span></header>${notice()}<main class="c-layout"><section class="c-main">${baseContent("content")}</section><aside class="c-rail"><div class="rail-date"><span>${item.weekday}</span><strong>${item.short}</strong><small>${dateStatus(state.date)[0]}</small></div><span class="kicker">Recent days</span>${dateList()}<div class="c-rail-context">${contextFor(state.screen)}</div></aside></main>${switcher()}${toast()}</div>`;
}

function calendarHeader() {
  const [year, month] = state.month.split("-").map(Number);
  return `<header class="calendar-header"><div><span class="kicker">CALENDAR · HISTORY RECALL</span><h1>Calendar</h1><p>先看整个月，再进入某一天；选中的日期复用 Today 的三个阶段。</p></div><div class="calendar-toolbar"><button type="button" class="calendar-step" data-month-step="-1" aria-label="上个月">←</button><div class="period-picker"><button type="button" class="period-part" data-action="toggle-period" data-period-step="year" aria-expanded="${state.periodOpen && state.periodStep === "year"}">${year} 年</button><span class="period-divider">/</span><button type="button" class="period-part" data-action="toggle-period" data-period-step="month" aria-expanded="${state.periodOpen && state.periodStep === "month"}">${month} 月</button>${state.periodOpen ? periodMenu(year, month) : ""}</div><button type="button" class="calendar-step" data-month-step="1" aria-label="下个月">→</button><button type="button" class="today-button" data-calendar-today>今天</button></div></header>`;
}

function periodMenu(year, month) {
  if (state.periodStep === "year") return `<div class="period-menu" role="menu"><div class="period-menu-heading"><strong>先选年份</strong><small>再进入月份</small></div><div class="period-options">${CALENDAR_YEARS.map((option) => `<button type="button" class="period-option${option === year ? " selected" : ""}" data-period-year="${option}">${option} 年${option === year ? " · 当前" : ""}</button>`).join("")}</div></div>`;
  return `<div class="period-menu" role="menu"><div class="period-menu-heading"><button type="button" class="period-back" data-period-step="year">← ${year} 年</button><small>再选月份</small></div><div class="period-options month-options">${Array.from({ length: 12 }, (_, index) => index + 1).map((option) => `<button type="button" class="period-option${option === month ? " selected" : ""}" data-period-month="${String(option).padStart(2, "0")}">${option} 月</button>`).join("")}</div></div>`;
}

function calendarGrid() {
  const first = parseDateKey(`${state.month}-01`);
  const start = new Date(first.getTime());
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime());
    date.setUTCDate(start.getUTCDate() + index);
    return dayKey(date);
  });
  return `<div class="calendar-grid-wrap"><div class="calendar-weekdays">${WEEKDAYS.map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-grid" role="grid" aria-label="${monthLabel(state.month)}">${cells.map((key) => { const info = dateInfo(key); const item = records[key]; const [label, cls] = dateStatus(key); const inMonth = key.startsWith(state.month); const marker = item ? `<span class="calendar-day-marker ${cls}" aria-label="${label}">${item.status === "backfilled" ? "补" : item.status === "unreviewed" ? "待" : "复"}</span>` : `<span class="calendar-day-marker empty" aria-label="无记录"></span>`; return `<button type="button" class="calendar-day${inMonth ? "" : " outside"}${key === state.date ? " selected" : ""}" data-calendar-date="${key}" aria-label="${info.short} ${info.weekday} · ${label}"><span class="calendar-day-top"><strong>${parseDateKey(key).getUTCDate()}</strong><small>${key === TODAY ? "今天" : ""}</small></span>${marker}</button>`; }).join("")}</div></div>`;
}

function selectedDayDetail() {
  const item = dateInfo(state.date);
  const [status, statusClass, icon] = dateStatus(state.date);
  return `<section class="calendar-day-detail"><div class="selected-day-heading"><div><span class="kicker">SELECTED DAY · 选中日期</span><h2>${item.short} <em>${item.weekday}</em></h2></div><span class="status-label ${statusClass}">${icon} ${status}<small>${record()?.baselineMeta ?? "没有 Daily Record"}</small></span></div>${phaseTabs()}${dailyContent()}</section>`;
}

function selectedDaySummary() {
  const item = record();
  const info = dateInfo(state.date);
  const [status, statusClass, icon] = dateStatus(state.date);
  const summary = item?.review?.[0] ?? (item ? item.status === "unreviewed" ? "这一天有已知记录，但没有晚间复盘。" : "这一天有历史复盘和补记。" : "没有 Daily Record；保持空白，不制造补记义务。");
  const secondary = item ? item.change ? `最近变化：${item.change[3]}` : `${item.facts.length} 条已知记录` : "未记录不解释成未完成";
  return `<section class="calendar-day-summary"><div class="selected-day-heading"><div><span class="kicker">SELECTED DAY · 选中日期</span><h2>${info.short} <em>${info.weekday}</em></h2></div><span class="status-label ${statusClass}">${icon} ${status}<small>${item?.baselineMeta ?? "没有 Daily Record"}</small></span></div><div class="summary-copy"><strong>${item?.review ? "晚间复盘" : item ? "当日状态" : "空白日期"}</strong><p>${esc(summary)}</p><small>${esc(secondary)}</small></div><button type="button" class="open-day-action" data-open-day="${state.date}">打开完整 Today <span>↗</span></button></section>`;
}

function bStyleTopbar() {
  return `<header class="topbar b-shell-topbar" aria-label="工作区工具栏">${brand()}<span class="b-shell-space" aria-hidden="true"></span><div class="b-shell-actions"><button type="button" class="b-shell-button" data-preview="settings">设置</button><button type="button" class="b-shell-button b-shell-more" data-preview="more">•••</button><span class="b-shell-caption">本地原型</span></div></header>`;
}

function calendarVariant(layout, utilityTop = false) {
  const shellClass = utilityTop ? " b-shell-app" : "";
  return `<div class="app app-a app-calendar${shellClass} ${layout === "side" ? "calendar-side" : "calendar-lower"}${utilityTop ? " calendar-utility-shell" : ""}">${utilityTop ? bStyleTopbar() : ""}${utilityTop ? notice() : ""}<aside class="sidebar${utilityTop ? " b-shell-sidebar" : ""}">${utilityTop ? shellRailContext() : brand()}<nav class="side-nav">${nav()}</nav><div class="sidebar-bottom"><span></span>Private and offline on this Mac.</div></aside><main class="workspace"><div class="workspace-inner calendar-workspace">${utilityTop ? "" : notice()}${calendarHeader()}<div class="calendar-frame ${layout === "side" ? "calendar-frame-side" : "calendar-frame-lower"}"><section class="calendar-month"><div class="calendar-month-heading"><div><span class="kicker">MONTH VIEW · 月历</span><h2>${monthLabel(state.month)}</h2></div><span class="calendar-legend"><i class="reviewed"></i>有复盘 <i class="unreviewed"></i>无复盘 <i class="backfilled"></i>补记</span></div>${calendarGrid()}</section>${layout === "side" ? `<aside class="calendar-detail-side">${selectedDaySummary()}</aside>` : `<section class="calendar-detail-lower">${selectedDayDetail()}</section>`}</div></div></main>${switcher()}${toast()}</div>`;
}

function variantD() { return calendarVariant("side"); }
function variantE() { return calendarVariant("lower"); }
function variantF() { return calendarVariant("side", true); }

const todayProtoBlocks = [
  ["已发生（约 08:00–10:40）", "多起床，完成洗漱和洗澡", "早上没有锻炼；原本准备出门，后来改为在家工作，并下楼买回今天的第一顿饭。"],
  ["上午后段至下午前段（现在至约 15:30）", "吃第一顿饭并安顿下来，然后以居家工作为主", "吃饭、工作和切换之间保留 buffer；小范围收拾不扩成另一项全天工程。"],
  ["下午弹性窗口（约 15:30–17:30）", "根据当时状态决定是否出门完成一次锻炼 20 分钟+", "约 16:00–17:00 下楼买晚饭，可与锻炼尽量合并；不想锻炼只买饭即可。"],
  ["晚饭后至睡前", "两顿饭，晚饭后轻量工作或休息", "21:30 左右开始收尾，完成睡前准备；保护入睡 buffer。"],
];

const todayProtoFacts = [
  ["观察到的事实", "早上起床较晚，没有晨间锻炼；今天改为在家工作。"],
  ["当前方向", "先吃饭并安顿下来，之后以居家工作为主。"],
  ["保留弹性", "下午是否锻炼由当时状态决定，不补偿式追赶。"],
];

const todayProtoReview = [
  "今天已确认的内容先保留，不把原先未执行的安排解释成失败。",
  "计划与实际：工作地点和早晨安排发生变化，但主方向仍然清楚。",
  "仍然未知的事情保持未知，不生成新的补记任务。",
];

const daytimePastRows = [
  ["08:00–10:40", "已确认", "起床、洗漱和洗澡", "早上没有锻炼；原定出门安排后来改成居家工作。"],
  ["10:43", "记录", "改为居家工作", "已下楼买回第一顿饭；工作地点变化已经确认。"],
];

const daytimeFutureRows = [
  ["现在–15:30", "计划", "吃第一顿饭并安顿下来", "不追回刚才花掉的时间，以居家工作为主。"],
  ["15:30–17:30", "计划", "弹性窗口", "可选择锻炼 20 分钟+，并尽量和买晚饭合并成一次外出。"],
  ["17:30–21:30", "计划", "晚饭和恢复", "不补做晨间内容；保留轻量工作或休息的空间。"],
];

const daytimeUpdateRows = [
  ["09:42", "重大调整", "上班计划取消", "从“去单位”改为先吃饭、安顿，再居家工作。"],
  ["10:43", "有意义的事件", "第一顿饭已买回", "往返比预期久一些，后续计划顺延，不追赶。"],
];

function todayOuterHeader() {
  const selected = dateInfo(state.date);
  const historical = state.date !== TODAY;
  return `<header class="today-outer-header"><div><span class="kicker">EXERCISE TRACKING</span><h1>${historical ? `Today · ${selected.short}` : "Today"}</h1><p>查看${historical ? selected.short : "今天"} Daily Record 里的大致安排。</p></div><span class="today-outer-status">${historical ? "Historical day · prototype read-only." : "Today is the current destination."}</span></header>`;
}

function todayWorkspaceHeader() {
  const selected = dateInfo(state.date);
  const historical = state.date !== TODAY;
  const status = record() ? `已从${historical ? ` ${selected.short} ` : "今天的 "}Daily Record 读取早间计划。` : "这一天没有 Daily Record；保留空白，不制造补记义务。";
  return `<header class="today-proto-toolbar"><div><p class="today-proto-date">${historical ? "SELECTED DAY" : "TODAY"} · ${state.date}</p><h2>早间计划</h2></div><div class="today-proto-actions"><button type="button" data-preview="select-vault">选择 Vault…</button><button type="button" data-preview="refresh-today">刷新</button></div></header><p class="today-proto-vault">Vault: tortilla-flat</p><p class="today-proto-status">${status}</p>`;
}

function todayProtoTabs(vertical = false) {
  const tabs = [["morning", "Morning", "早间基准"], ["progress", "Daytime", "当日进展"], ["evening", "Evening", "晚间复盘"]];
  return `<nav class="today-proto-tabs${vertical ? " vertical" : ""}" role="tablist" aria-label="Today 阶段">${tabs.map(([key, label, note]) => `<button type="button" role="tab" data-phase="${key}" aria-selected="${state.phase === key}"><strong>${label}</strong><small>${note}</small></button>`).join("")}</nav>`;
}

function todayProtoMorning() {
  const item = record();
  if (state.date !== TODAY && !item) return emptyDay();
  const rows = state.date === TODAY ? todayProtoBlocks.map(([period, title, detail]) => [period, "", title, detail]) : item.baseline;
  const selected = dateInfo(state.date);
  return `<section class="today-proto-panel"><div class="today-region-heading"><div><p class="section-label">${state.date === TODAY ? "今日方向" : `${selected.short} · 早间基准`}</p><h3>${state.date === TODAY ? "今天的大致安排" : "这一天的大致安排"}</h3></div><span class="today-count">${rows.length} 个时间块</span></div><ol class="today-proto-timeline" aria-label="早间计划时间线">${rows.map(([period, time, title, detail]) => `<li><span class="today-period">${esc(period)}${time ? `<small>${esc(time)}</small>` : ""}</span><div><h4>${esc(title)}</h4><p>${esc(detail)}</p></div></li>`).join("")}</ol></section>`;
}

function todayProtoDaytime() {
  return `<section class="today-proto-panel"><div class="today-region-heading"><div><p class="section-label">白天更新</p><h3>变化与新的方向</h3></div><span class="today-count">3 条</span></div><p class="today-reading-introduction">这里只呈现有意义的事件和 material replan；未记录的活动保持 unknown。</p><div class="today-proto-facts">${todayProtoFacts.map(([label, text]) => `<article><span>${esc(label)}</span><p>${esc(text)}</p></article>`).join("")}</div><p class="today-proto-unknown"><strong>未知仍然是未知</strong> 上午学习实际做了多少 · Reset living space · 未记录</p></section>`;
}

function todayProtoEvening() {
  const item = record();
  if (state.date !== TODAY && !item) return emptyDay();
  const review = state.date === TODAY ? todayProtoReview : item.review;
  const selected = dateInfo(state.date);
  if (!review) return `<section class="today-proto-panel quiet-empty"><span class="section-label">${selected.short} · 晚间复盘</span><h3>这一天没有晚间复盘</h3><p>已知记录仍然可以回看；没有 review 不会产生补记义务。</p></section>`;
  return `<section class="today-proto-panel"><div class="today-region-heading"><div><p class="section-label">晚间复盘</p><h3>${state.date === TODAY ? "Agent 整理的今日记录" : `${selected.short} 的记录回看`}</h3></div><span class="today-count">Minimal Review</span></div><p class="today-reading-introduction">先读一个保守的 first pass；不要求完整重建整天。</p><div class="today-proto-review">${review.map((line) => `<p><span>•</span>${esc(line)}</p>`).join("")}</div><div class="today-proto-review-footer"><span>未记录 ≠ 未完成</span><span>没有 review debt</span><span>之后仍可补充</span></div></section>`;
}

function todayProtoPhaseContent() {
  if (state.date !== TODAY && !record()) return emptyDay();
  if (state.phase === "progress") return todayProtoDaytime();
  if (state.phase === "evening") return todayProtoEvening();
  return todayProtoMorning();
}

function todayProtoEvidence(defaultVisible = false) {
  const item = record();
  const visible = state.todayEvidenceVisible ?? defaultVisible;
  const historical = state.date !== TODAY;
  const count = historical ? item ? `${item.facts.length} 项已知` : "0 项" : "7 项";
  const baselineCopy = historical && item ? item.baseline.slice(0, 2).map(([, time, title]) => `${time} ${title}`).join("<br />") : "工作 check-in · 10:00<br />取晚饭 · 17:30";
  const recordCopy = historical && item ? `${item.facts.length} 条已知记录${item.change ? `<br />${item.change[0]} · 历史修订` : ""}` : "insurance reimbursement<br />Exercise · normal 30 分钟<br />Reset living space";
  return `<aside class="today-proto-evidence${visible ? " open" : ""}"><button type="button" class="today-proto-evidence-toggle" data-action="toggle-today-evidence" aria-expanded="${visible}"><span>计划依据</span><span class="today-count">${count} <b>${visible ? "−" : "+"}</b></span></button>${visible ? `<div class="today-proto-evidence-content"><section><h4>固定安排</h4><p>${baselineCopy}</p></section><section><h4>Tasks / Habits</h4><p>${recordCopy}</p></section><section class="quiet-context"><h4>边界</h4><p>这里只是计划依据，不代表已完成，也不会自动写回 Dida365。</p></section></div>` : ""}</aside>`;
}

function daytimeAxisRow([time, label, title, detail], kind) {
  return `<article class="daytime-axis-row ${kind}"><time>${esc(time)}</time><span class="daytime-axis-dot" aria-hidden="true"></span><div><div class="daytime-row-meta"><span>${esc(label)}</span><span>${kind === "future" ? "接下来" : "已知"}</span></div><h4>${esc(title)}</h4><p>${esc(detail)}</p></div></article>`;
}

function daytimeNowMarker() {
  return `<div class="daytime-now-marker${state.date === TODAY ? "" : " historical"}"><span>${state.date === TODAY ? "现在 · 14:10" : "历史记录边界"}</span></div>`;
}

function daytimeAxisHeader(title, note) {
  return `<header class="daytime-explorer-header"><div><p class="section-label">DAYTIME · 时间轴</p><h3>${title}</h3></div><span class="daytime-simulated-now">${note}</span></header>`;
}

function daytimeNowSplit() {
  return `<section class="daytime-explorer daytime-now-split">${daytimeAxisHeader("现在怎么走", "模拟当前 14:10")}<div class="daytime-axis-legend"><span><i class="past"></i>已发生 / 已确认</span><span><i class="future"></i>接下来计划</span></div><div class="daytime-axis"><section class="daytime-axis-zone"><p class="daytime-zone-label">已发生 / 已确认</p>${daytimePastRows.map((row) => daytimeAxisRow(row, "past")).join("")}</section>${daytimeNowMarker()}<section class="daytime-axis-zone future-zone"><p class="daytime-zone-label">接下来计划</p>${daytimeFutureRows.map((row) => daytimeAxisRow(row, "future")).join("")}</section></div><p class="daytime-explorer-note">时间轴只整理已知事实和接下来方向；上午学习实际做了多少仍然保持未知。</p></section>`;
}

function daytimeUpdateRail(rows = daytimeUpdateRows) {
  const historical = state.date !== TODAY;
  return `<aside class="daytime-update-rail"><section class="daytime-update-composer"><div class="daytime-update-rail-heading"><span class="section-label">${historical ? "历史记录" : "新增更新"}</span><span>${historical ? "只读" : "模拟"}</span></div>${historical ? `<p class="daytime-history-intro">这里展示 ${esc(dateInfo(state.date).short)} 已有的补记／更正，不在历史回看里新增现实记录。</p>` : `<label>更新类型<select><option>有意义的事件</option><option>补记时间块</option><option>Habit 结果</option><option>重大调整</option></select></label><label>一句话说明<input type="text" placeholder="例如：工作地点发生变化" /></label><button type="button" data-preview="daytime-save">保存到记录栏</button><p>只写入这个 prototype 的合成记录。</p>`}</section><section class="daytime-record-list"><div class="daytime-update-rail-heading"><span class="section-label">记录更新</span><span>${rows.length} 条</span></div>${rows.length ? rows.map(([time, kind, title, detail]) => `<article class="daytime-update-item"><time>${esc(time)}</time><span>${esc(kind)}</span><h4>${esc(title)}</h4><p>${esc(detail)}</p></article>`).join("") : `<p class="daytime-axis-empty">这一天没有已知的修改记录。</p>`}<p class="daytime-rail-note">记录说明发生过什么；它不会自动替代早间基准，也不代表 Habit 已完成。</p></section></aside>`;
}

function daytimeRowsFor(item) {
  if (state.date === TODAY) return { past: daytimePastRows, future: daytimeFutureRows, updates: daytimeUpdateRows };
  if (!item) return { past: [], future: [], updates: [] };
  const past = item.facts.map(([time, title, detail]) => [time, "已知记录", title, detail]);
  const future = item.current.slice(0, 3).map((line, index) => [index === 0 ? "回看" : "保持开放", "历史方向", line, index === 0 ? "只保留这一天已有的方向，不补造时间细节。" : "没有更多证据，不把空白解释成失败。"]);
  const updates = item.change ? [[item.change[0], "历史修订", item.change[1], `${item.change[2]} → ${item.change[3]}`], ...item.edits.map((edit) => ["记录", "修改记录", "历史补记 / 更正", edit])] : [];
  return { past, future, updates };
}

function daytimeAxisRows(rows, kind, emptyText) {
  return rows.length ? rows.map((row) => daytimeAxisRow(row, kind)).join("") : `<p class="daytime-axis-empty">${esc(emptyText)}</p>`;
}

function daytimeWithUpdateRail() {
  const item = record();
  const rows = daytimeRowsFor(item);
  const historical = state.date !== TODAY;
  const selected = dateInfo(state.date);
  return `<section class="daytime-explorer daytime-with-update-rail">${daytimeAxisHeader(historical ? `${selected.short} · 时间轴回看` : "时间轴 + 记录", historical ? "历史记录 · 可补记" : "模拟当前 14:10")}<div class="daytime-explorer-grid"><div><div class="daytime-axis-legend"><span><i class="past"></i>已发生 / 已确认</span><span><i class="future"></i>${historical ? "后续方向" : "接下来计划"}</span></div><div class="daytime-axis"><section class="daytime-axis-zone"><p class="daytime-zone-label">已发生 / 已确认</p>${daytimeAxisRows(rows.past, "past", "这一天没有已知记录。")}</section>${daytimeNowMarker()}<section class="daytime-axis-zone future-zone"><p class="daytime-zone-label">${historical ? "后续方向" : "接下来计划"}</p>${daytimeAxisRows(rows.future, "future", "这一天没有可继续回看的方向。")}</section></div></div>${daytimeUpdateRail(rows.updates)}</div></section>`;
}

function daytimeInlineUpdate() {
  return `<section class="daytime-explorer daytime-inline-update">${daytimeAxisHeader("当前线上的更新", "模拟当前 14:10")}<div class="daytime-axis-legend"><span><i class="past"></i>已发生 / 已确认</span><span><i class="future"></i>接下来计划</span></div><div class="daytime-axis"><section class="daytime-axis-zone"><p class="daytime-zone-label">已发生 / 已确认</p>${daytimePastRows.map((row) => daytimeAxisRow(row, "past")).join("")}</section><div class="daytime-now-marker inline"><span>现在 · 14:10</span><button type="button" class="daytime-inline-action" data-preview="daytime-update">＋记录一条更新</button></div><section class="daytime-inline-form"><label>更新类型<select><option>有意义的事件</option><option>补记时间块</option><option>重大调整</option></select></label><label>一句话说明<input type="text" placeholder="例如：工作地点发生变化" /></label><button type="button" data-preview="daytime-save">保存到时间轴</button></section><section class="daytime-axis-zone future-zone"><p class="daytime-zone-label">接下来计划</p>${daytimeFutureRows.map((row) => daytimeAxisRow(row, "future")).join("")}</section></div></section>`;
}

function todayVariant(layout, daytimeRenderer = null, evidenceMode = "default") {
  const sharedTop = layout !== "production" ? bStyleTopbar() : "";
  const vertical = layout === "rail";
  const evidence = evidenceMode === "none" ? "" : layout === "context" ? todayProtoEvidence(true) : layout === "production" ? todayProtoEvidence(false) : "";
  const phaseContent = state.date !== TODAY && !record() ? emptyDay() : daytimeRenderer && state.phase === "progress" ? daytimeRenderer() : todayProtoPhaseContent();
  const inner = vertical ? `<div class="today-rail-layout"><aside class="today-phase-rail">${todayProtoTabs(true)}<p>阶段只切换阅读面，不改变早间基准。</p></aside><section class="today-proto-primary">${phaseContent}${todayProtoEvidence()}</section></div>` : `<div class="today-proto-layout${evidence ? "" : " single"}"><section class="today-proto-primary">${phaseContent}</section>${evidence}</div>`;
  const shellClass = sharedTop ? " b-shell-app" : "";
  return `<div class="app app-a today-proto-app today-${layout}${shellClass}">${sharedTop}${sharedTop ? notice() : ""}<aside class="sidebar${sharedTop ? " b-shell-sidebar" : ""}">${sharedTop ? shellRailContext() : brand()}<nav class="side-nav">${nav()}</nav><div class="sidebar-bottom"><span></span>Private and offline on this Mac.</div></aside><main class="workspace"><div class="workspace-inner today-proto-workspace">${sharedTop ? "" : notice()}${todayOuterHeader()}<section class="today-proto-surface">${todayWorkspaceHeader()}${vertical ? "" : todayProtoTabs()}${inner}</section></div></main>${switcher()}${toast()}</div>`;
}

function variantG() { return todayVariant("production"); }
function variantH() { return todayVariant("context"); }
function variantI() { return todayVariant("rail"); }
function variantJ() { return todayVariant("context", daytimeNowSplit); }
function variantK() { return todayVariant("context", daytimeWithUpdateRail, state.phase === "morning" ? "default" : "none"); }
function variantL() { return todayVariant("context", daytimeInlineUpdate); }
function variantM() { return habitsVariantM(); }
function variantN() { return habitsVariantN(); }
function variantO() { return habitsVariantO(); }
function variantP() { return habitsVariantP(); }
function variantQ() { return habitsVariantQ(); }
function variantR() { return habitsVariantR(); }
function variantS() { return habitsVariantS(); }
function variantT() { return habitsVariantT(); }
function variantU() { return habitsVariantU(); }
function variantV() { return habitsVariantV(); }
function variantW() { return habitsVariantW(); }
function variantX() { return habitsVariantX(); }
function variantY() { return habitsVariantY(); }
function variantZ() { return habitsVariantZ(); }
function variantAA() { return habitsVariantAA(); }
function variantAB() { return habitsVariantAB(); }
function variantAC() { return habitsVariantAC(); }
function variantAD() { return habitsVariantAD(); }
function variantAE() { return habitsVariantAE(); }
function variantAF() { return habitsVariantAF(); }
function variantAG() { return habitsVariantAG(); }
function variantFinal() {
  if (state.screen === "calendar") return calendarVariant("side", true);
  if (state.screen === "habits") return habitsVariantAG();
  return todayVariant("context", daytimeWithUpdateRail, state.phase === "morning" ? "default" : "none");
}

function switcher() {
  const current = variants.find((item) => item.key === state.variant);
  if (current.key === "FINAL") return "";
  return `<div class="variant-switcher" aria-label="Prototype variant switcher"><button type="button" data-variant="-1" aria-label="上一个方案">←</button><span><small>FRAME VARIANT</small><strong>${current.key} · ${current.name}</strong></span><button type="button" data-variant="1" aria-label="下一个方案">→</button></div>`;
}

function toast() { return state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ""; }

function render(options = {}) {
  const preserveScroll = options.preserveScroll === true;
  const scrollY = window.scrollY;
  syncUrl();
  root.innerHTML = state.variant === "B" ? variantB() : state.variant === "C" ? variantC() : state.variant === "D" ? variantD() : state.variant === "E" ? variantE() : state.variant === "F" ? variantF() : state.variant === "G" ? variantG() : state.variant === "H" ? variantH() : state.variant === "I" ? variantI() : state.variant === "J" ? variantJ() : state.variant === "K" ? variantK() : state.variant === "L" ? variantL() : state.variant === "M" ? variantM() : state.variant === "N" ? variantN() : state.variant === "O" ? variantO() : state.variant === "P" ? variantP() : state.variant === "Q" ? variantQ() : state.variant === "R" ? variantR() : state.variant === "S" ? variantS() : state.variant === "T" ? variantT() : state.variant === "U" ? variantU() : state.variant === "V" ? variantV() : state.variant === "W" ? variantW() : state.variant === "X" ? variantX() : state.variant === "Y" ? variantY() : state.variant === "Z" ? variantZ() : state.variant === "AA" ? variantAA() : state.variant === "AB" ? variantAB() : state.variant === "AC" ? variantAC() : state.variant === "AD" ? variantAD() : state.variant === "AE" ? variantAE() : state.variant === "AF" ? variantAF() : state.variant === "AG" ? variantAG() : state.variant === "FINAL" ? variantFinal() : variantA();
  window.scrollTo({ top: preserveScroll ? scrollY : 0, behavior: "instant" });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.variant) {
    const index = variants.findIndex((item) => item.key === state.variant);
    const nextVariant = variants[(index + Number(target.dataset.variant) + variants.length) % variants.length];
    state.variant = nextVariant.key;
    if (["G", "H", "I", "J", "K", "L"].includes(nextVariant.key)) state.screen = "today";
    if (["D", "E", "F"].includes(nextVariant.key)) state.screen = "calendar";
    if (["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "FINAL"].includes(nextVariant.key)) { state.screen = nextVariant.key === "FINAL" ? state.screen : "habits"; state.habitCell = null; state.habitGridKey = ["V"].includes(nextVariant.key) ? "exercise" : null; state.expandedHabit = ["V"].includes(nextVariant.key) ? "exercise" : null; }
    render();
    return;
  }
  if (target.dataset.screen) {
    state.screen = target.dataset.screen;
    if (state.screen === "calendar" && state.variant !== "FINAL" && ["G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG"].includes(state.variant)) state.variant = "F";
    if (state.screen === "habits" && state.variant !== "FINAL" && !["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG"].includes(state.variant)) state.variant = "M";
    if (state.screen !== "calendar" && state.screen !== "habits" && state.variant !== "FINAL" && ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG"].includes(state.variant)) state.variant = "A";
    if (state.screen === "today") { state.date = TODAY; state.phase = "progress"; }
    else if (state.screen === "calendar") { state.month = state.date.slice(0, 7); state.phase = records[state.date]?.review ? "evening" : "progress"; }
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.date) {
    state.date = target.dataset.date;
    state.month = state.date.slice(0, 7);
    state.screen = "calendar";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.calendarDate) {
    state.date = target.dataset.calendarDate;
    state.month = state.date.slice(0, 7);
    state.screen = "calendar";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.monthStep) {
    state.month = shiftMonth(state.month, Number(target.dataset.monthStep));
    state.date = dateKeyForMonth(state.month);
    state.screen = "calendar";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.periodYear) {
    state.month = `${target.dataset.periodYear}-${state.month.slice(5, 7)}`;
    state.date = dateKeyForMonth(state.month);
    state.screen = "calendar";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.periodStep = "month";
    state.periodOpen = true;
    render();
    return;
  }
  if (target.dataset.periodMonth) {
    state.month = `${state.month.slice(0, 4)}-${target.dataset.periodMonth}`;
    state.date = dateKeyForMonth(state.month);
    state.screen = "calendar";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.calendarToday !== undefined) {
    state.month = TODAY.slice(0, 7);
    state.date = TODAY;
    state.screen = "calendar";
    state.phase = "progress";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.openDay) {
    state.date = target.dataset.openDay;
    state.screen = "today";
    state.phase = records[state.date]?.review ? "evening" : "progress";
    state.variant = state.variant === "FINAL" ? "FINAL" : "A";
    state.periodOpen = false;
    render();
    return;
  }
  if (target.dataset.phase) { state.phase = target.dataset.phase; render(); return; }
  if (target.dataset.habitDetail) { state.habit = target.dataset.habitDetail; state.screen = "habits"; state.variant = "R"; render(); return; }
  if (target.dataset.backHabits !== undefined) { state.screen = "habits"; state.variant = "P"; state.habitCell = null; state.habitGridKey = null; state.expandedHabit = null; render(); return; }
  if (target.dataset.habitDay) { state.habitCell = target.dataset.habitDay; state.habitGridKey = target.dataset.habitKey || "exercise"; render({ preserveScroll: true }); return; }
  if (target.dataset.action === "close-habit-cell") { state.habitCell = null; render({ preserveScroll: true }); return; }
  if (target.dataset.action === "select-habit-rail") { state.expandedHabit = target.dataset.habitGrid; state.habitGridKey = target.dataset.habitGrid; state.habitCell = null; render({ preserveScroll: true }); return; }
  if (target.dataset.action === "toggle-period") { const step = target.dataset.periodStep; state.periodOpen = !(state.periodOpen && state.periodStep === step); state.periodStep = step; render(); return; }
  if (target.dataset.periodStep) { state.periodStep = target.dataset.periodStep; state.periodOpen = true; render(); return; }
  if (target.dataset.action === "toggle-today-evidence") { const panel = target.closest(".today-proto-evidence"); state.todayEvidenceVisible = !panel?.classList.contains("open"); render(); return; }
  if (target.dataset.action === "toggle-exercise") { state.exerciseOpen = !state.exerciseOpen; render(); return; }
  if (target.dataset.action === "toggle-habit-grid") { state.expandedHabit = state.expandedHabit === target.dataset.habitGrid ? null : target.dataset.habitGrid; state.habitGridKey = target.dataset.habitGrid; state.habitCell = null; render({ preserveScroll: true }); return; }
  if (target.dataset.preview) { state.toast = "下一轮再加入这个动作；这轮先看布局。"; render(); }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable='true']")) return;
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const index = variants.findIndex((item) => item.key === state.variant);
  state.variant = variants[(index + (event.key === "ArrowRight" ? 1 : -1) + variants.length) % variants.length].key;
  render();
});


// FINAL closure interaction: two entry points, one in-memory daily note collection.
const closureNotes = Object.entries(exerciseNoteByDay).map(([date, text], i) => ({id:`seed-${i}`,date,habit:'exercise',text,changes:[]}));
let closureEditing = null;
let closureSequence = 0;
function closureEntries(date, habit = null) {
  return closureNotes.filter(n => n.date === date && (!habit || n.habit === habit));
}
function closureList(date, habit = null) {
  const notes = closureEntries(date, habit);
  return notes.length ? notes.map(n => `<article class="closure-note"><p>${esc(n.text)}</p><small>${n.habit === 'exercise' ? '健身 · ' : ''}${esc(date)}</small><button type="button" data-correct-note="${n.id}">更正这条</button>${n.changes.length ? `<details><summary>修改记录 · ${n.changes.length}</summary>${n.changes.map(c => `<p><small>${esc(c.at)} · ${c.before ? '更正' : '补记'}</small><br>${c.before ? `${esc(c.before)} → ` : ''}${esc(c.after)}</p>`).join('')}</details>` : ''}</article>`).join('') : '<p class="closure-empty">还没有简短记录。</p>';
}
function closureEditor(date, habit = null) {
  const editing = closureEntries(date,habit).find(n => n.id === closureEditing);
  return `<section class="closure-editor daytime-update-composer"><strong>${editing ? '更正记录' : '写一句'} · ${esc(date)}</strong><form data-closure-date="${date}" data-closure-habit="${habit || ''}" data-closure-edit="${editing?.id || ''}">${habit ? '<p>健身</p>' : `<label>记录类别<select name="habit"><option value=""${!editing?.habit ? ' selected' : ''}>日常记录</option><option value="exercise"${editing?.habit === 'exercise' ? ' selected' : ''}>健身</option></select></label>`}<label>记录内容<input name="content" required maxlength="500" placeholder="例如：跑步 30 分钟" value="${esc(editing?.text || '')}"></label><button type="submit">${editing ? '保存更正' : '保存记录'}</button>${editing ? '<button type="button" data-cancel-correction>取消更正</button>' : ''}<small>保存在 ${esc(date)} 的日记录中；不替你打卡。</small></form></section>`;
}
function closureChangeSummary(date) {
  const entries=closureEntries(date);
  return entries.length ? `<section class="closure-review-notes"><h4>补充与更正</h4>${entries.map(n=>`<p>${esc(n.text)}${n.changes.length ? `<small> · 后补 ${esc(n.changes.at(-1).at)}</small>` : ''}</p>`).join('')}<small>已有复盘正文保留，补充在此显示。</small></section>` : '';
}
const oldHabitPopover = habitCellPopover;
habitCellPopover = function(key = state.habitGridKey || 'exercise', options = {}) {
  if(state.variant !== 'FINAL' || key !== 'exercise' || !state.habitCell) return oldHabitPopover(key,options);
  return `<div class="habit-mini-popover closure-popover"><strong>${esc(state.habitCell)} · 健身</strong><button type="button" data-action="close-habit-cell" aria-label="关闭记录">×</button>${closureList(state.habitCell,'exercise')}${closureEditor(state.habitCell,'exercise')}</div>`;
};
const oldDaytimeRail = daytimeUpdateRail;
daytimeUpdateRail = function(rows = daytimeUpdateRows) {
  if(state.variant !== 'FINAL') return oldDaytimeRail(rows);
  return `<aside class="daytime-update-rail">${closureEditor(state.date)}<section><div class="daytime-update-rail-heading">当日简短记录</div>${closureList(state.date)}</section><section><div class="daytime-update-rail-heading">安排变化</div>${rows.map(([time,kind,title,detail])=>`<article class="daytime-update-item"><time>${esc(time)}</time><h4>${esc(title)}</h4><p>${esc(detail)}</p></article>`).join('')}</section><p class="daytime-rail-note">这里保存记录；需要重排时继续在 Agent 对话里调整。</p></aside>`;
};
const oldPhaseContent=todayProtoPhaseContent;
todayProtoPhaseContent=function(){
  if(state.variant==='FINAL' && !record()) return `<section class="today-proto-panel"><h3>${esc(state.date)} · 尚无日记录</h3><p>可以留一句实际发生的事，不需要补出整天计划。</p></section>${closureEditor(state.date)}`;
  return oldPhaseContent();
};
const oldEvening=todayProtoEvening;
todayProtoEvening=function(){return oldEvening()+(state.variant==='FINAL'?closureChangeSummary(state.date):'');};
const oldRows=daytimeRowsFor;
daytimeRowsFor=function(item){
  if(state.variant!=='FINAL')return oldRows(item);
  if(state.date===TODAY)return {past:records[TODAY].facts.map(([t,title,d])=>[t,'已确认',title,d]),future:[['14:10–17:00','计划','先处理紧急工作','暂停原定项目，先完成今天的急事。'],['17:30','计划','取晚饭','保留原定安排。'],['晚饭后','计划','运动或休息','按状态选择，不追加必须事项。']],updates:[['14:10','重大调整','下午安排变化','原本推进项目 → 临时工作优先，晚间留恢复空间。']]};
  if(!item)return {past:[],future:[],updates:[]};
  return {past:item.facts.map(([t,title,d])=>[t,'已知记录',title,d]),future:item.baseline.map(([p,t,title,d])=>[t||p,'当时计划',title,'原计划线索；实际未记录的部分保持未知。']),updates:item.edits.map(e=>['补记','修改记录','后来补充',e])};
};
const oldMorning=todayProtoMorning;
todayProtoMorning=function(){
  if(state.variant!=='FINAL')return oldMorning();
  if(!record())return emptyDay();
  return `<section class="today-proto-panel"><div class="today-region-heading"><h3>当天的初始安排</h3><span>${esc(record().baselineMeta)}</span></div><ol class="today-proto-timeline">${record().baseline.map(([p,t,title,d])=>`<li><span class="today-period">${esc(p)}<small>${esc(t)}</small></span><div><h4>${esc(title)}</h4><p>${esc(d)}</p></div></li>`).join('')}</ol></section>`;
};
const oldHeader=todayWorkspaceHeader;
todayWorkspaceHeader=function(){
  if(state.variant!=='FINAL')return oldHeader();
  const title={morning:'早间基准',progress:'当日进展',evening:'晚间复盘'}[state.phase];
  return oldHeader().replaceAll('早间计划',title);
};
const oldOuter=todayOuterHeader;
todayOuterHeader=function(){return state.variant==='FINAL'?oldOuter().replace('EXERCISE TRACKING','DAILY RECORD').replace('Historical day · prototype read-only.','历史日期 · 可补充或更正'):oldOuter();};
const oldBrand=brand;
brand=function(){return state.variant==='FINAL'?oldBrand().replaceAll('Exercise tracking','Daily life'):oldBrand();};
const oldNotice=notice;
notice=function(){return state.variant==='FINAL'?'<div class="prototype-notice"><span class="notice-mark">FINAL</span><span>合成演示 · 修改仅在本页内存中 · 刷新重置</span></div>':oldNotice();};
const oldCalendar=calendarGrid;
calendarGrid=function(){return state.variant==='FINAL'?oldCalendar().replaceAll('>待<','>记<'):oldCalendar();};
const oldRender=render;
render=function(options={}){
  oldRender(options);
  if(state.variant==='FINAL'){
    document.title='PROTOTYPE · Personal Dashboard 2.0 · FINAL';
    for(const el of root.querySelectorAll('.shell-rail-context strong,.header-note,.habits-proto-meta span,.habits-summary-total strong')){
      if(el.textContent.includes('9 / 14'))el.innerHTML=el.innerHTML.replaceAll('9 / 14','3 / 15');
    }
    for(const el of root.querySelectorAll('.habit-today-row p,.habit-today-row-side p')) {
      if(el.textContent.includes('今日未记录') && el.closest('article')?.textContent.includes('Exercise'))el.textContent='本周目标 3 次 · 今日已有快照打卡';
    }
    for(const el of root.querySelectorAll('.habit-today-row p,.habit-today-row-side p'))if(el.textContent.includes('本周目标 7 次'))el.textContent='本周目标 7 次 · 今日已有快照打卡';
    const meta=root.querySelector('.habits-proto-meta');
    if(meta)meta.insertAdjacentHTML('beforeend','<small>来源：合成快照 · 更新于 9 月 8 日 21:30 · 未覆盖处保持未知</small>');
    const evening=root.querySelector('.today-proto-review');
    if(evening && state.date===TODAY)evening.insertAdjacentHTML('beforebegin','<p class="today-reading-introduction">21:30 晚间视角</p>');
  }
};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button || state.variant!=='FINAL')return;
  if(button.dataset.correctNote){closureEditing=button.dataset.correctNote;render({preserveScroll:true});}
  if(button.hasAttribute('data-cancel-correction')){closureEditing=null;render({preserveScroll:true});}
});
document.addEventListener('submit',event=>{
  const form=event.target.closest('form[data-closure-date]');
  if(!form)return;
  event.preventDefault();
  const fields=new FormData(form);
  const text=String(fields.get('content')||'').trim();
  if(!text)return;
  const date=form.dataset.closureDate;
  const habit=form.dataset.closureHabit || String(fields.get('habit')||'');
  const at=`2026-09-08 ${String(22+Math.floor(closureSequence/60)).padStart(2,'0')}:${String(closureSequence++%60).padStart(2,'0')} -04:00`;
  let note=closureNotes.find(n=>n.id===form.dataset.closureEdit && n.date===date);
  if(note){note.changes.push({at,before:note.text,after:text});note.text=text;}
  else {note={id:`note-${closureSequence}`,date,habit,text,changes:[{at,before:null,after:text}]};closureNotes.push(note);}
  if(!records[date])records[date]={status:'unreviewed',baselineMeta:'未独立保存早间基准',baseline:[],facts:[],current:[],unknown:[],change:null,review:null,edits:[]};
  records[date].edits.push(`${at} · ${note.changes.at(-1).before?'更正':'补记'}：${text}`);
  if(records[date].review)records[date].status='backfilled';
  if(note.habit==='exercise'){
    habitRecordByDay.exercise[date]=text;
    habitKnownDays.exercise.add(date); // A record mark, never a check-in mutation.
  }
  closureEditing=null;
  state.toast='已保存合成记录；未更新滴答打卡或完成次数。';
  render({preserveScroll:true});
});
if(state.variant==='FINAL'){
  habits.find(h=>h.key==='exercise').count='1 / 3';
  habits.find(h=>h.key==='nutrition').count='2 / 7';
  habits.find(h=>h.key==='reset').count='0 / 5';
  for(const key of ['exercise','nutrition','reset']){
    for(const date of [...habitKnownDays[key]])if(date>='2026-09-07')habitKnownDays[key].delete(date);
  }
  habitKnownDays.exercise.add('2026-09-08');
  habitKnownDays.nutrition.add('2026-09-07');habitKnownDays.nutrition.add('2026-09-08');
  habitRecordByDay.nutrition['2026-09-07']='已知打卡';habitRecordByDay.nutrition['2026-09-08']='已知打卡';
  closureNotes.push({id:'today-run',date:TODAY,habit:'exercise',text:'19:00 跑步 30 分钟',changes:[]});
  habitRecordByDay.exercise[TODAY]='19:00 跑步 30 分钟';
  records['2026-09-05'].baseline[2][3]='晚饭后留恢复空间。';
  records['2026-09-05'].review=['上午慢慢开始，14:00 处理了一段项目工作。','晚饭后留出恢复时间；具体活动见下方记录。'];
  records['2026-09-05'].facts[0]=['08:12','起床','已有明确时间记录。'];
  records['2026-09-05'].edits=[];
  records['2026-09-05'].change=null;
  records['2026-09-05'].status='reviewed';
  todayProtoReview.splice(0,todayProtoReview.length,'07:18 起床。10:00 参加工作 check-in，上午处理报销。','13:40 临时工作打断原安排，14:10 将下午改为先处理急事。原定项目没有继续。','17:30 取饭，19:00 跑步 30 分钟，之后休息。','早间学习完成量没有记录。有想补充的再告诉我。');
  records[TODAY].review=[...todayProtoReview];
}

render();
