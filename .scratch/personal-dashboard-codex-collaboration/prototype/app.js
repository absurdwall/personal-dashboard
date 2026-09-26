const variants = [
  { key: "A", name: "会话工作台" },
  { key: "B", name: "日期活动流" },
  { key: "C", name: "成果优先工作区" },
];

const dateOptions = [
  { date: "2026-09-26", label: "今天 · 9月26日" },
  { date: "2026-09-25", label: "昨天 · 9月25日" },
  { date: "2026-09-24", label: "周四 · 9月24日" },
  { date: "2026-09-22", label: "周二 · 9月22日" },
];

const state = {
  variant: readVariant(),
  selectedDate: "2026-09-26",
  activeSessionId: "session-morning",
  workingSessionId: "session-morning",
  queuedSessionIds: [],
  activeArtifact: "plan",
  demoStatus: "working",
  demoMenuOpen: false,
  modal: null,
  previewDestination: "tasks",
  context: null,
  voiceDemo: false,
  operationResult: null,
  currentWork: "正在读取今天安排、Tasks 和相关习惯记录",
  progress: 62,
  composerDraft: "",
  autoPlan: true,
  autoPlanTime: "06:00",
  modelPreference: "自动选择",
  simulatedConnected: false,
  memoryEditing: null,
  memoryHistory: [],
  tasks: [
    { id: "task-184", name: "确认车险续保方案", date: "2026-09-26", time: "14:00", list: "Inbox", status: "pending", deleted: false },
    { id: "task-207", name: "整理租约扫描件", date: "2026-09-26", time: null, list: "Personal", status: "pending", deleted: false },
    { id: "task-231", name: "补充厨房滤网尺寸", date: "2026-09-27", time: "11:00", list: "Home", status: "pending", deleted: false },
  ],
  plan: {
    saved: true,
    updatedAt: "08:42",
    items: [
      { time: "09:00", title: "先处理两件确定事项", text: "查看车险续保选项；午前整理租约扫描件。任务仍保留在各自清单。" },
      { time: "12:00", title: "午餐与休息", text: "给用餐和短暂休息留出完整缓冲。" },
      { time: "14:00", title: "核对续保条款", text: "这是已有 Task 的安排时间；如需调整，将修改同一任务。" },
      { time: "16:00", title: "留出弹性时间", text: "未确认的家务先作为选项，不自动新增任务。" },
    ],
    basis: "依据：今天的固定安排、当前 Tasks、近期衔接摘要。没有把未记录的活动当作事实。",
  },
  historicalRecords: {
    "2026-09-25": {
      plan: { saved: true, updatedAt: "08:12", items: [{ time: "08:30", title: "先处理固定安排", text: "保留一小时弹性时间；家里的新安排尚待确认。" }, { time: "12:15", title: "午餐与短暂休息", text: "午后再处理可移动事项。" }, { time: "15:00", title: "整理家庭事务清单", text: "只回看已存在的 Tasks，不自动带入新义务。" }], basis: "依据：9月25日 Daily Record 与当时已知安排。" },
      review: { saved: true, text: "周五完成了已确认的固定安排。家庭事务清单仍有一项待后续处理。", unknown: "没有记录的时段仍保留为未知。" },
    },
    "2026-09-24": {
      plan: { saved: true, updatedAt: "09:05", items: [{ time: "09:00", title: "处理厨房尺寸记录", text: "收集尺寸信息；原任务日期不变。" }, { time: "13:00", title: "留出自由安排时间", text: "不把计划安排当作已发生事实。" }], basis: "依据：9月24日 Daily Record 与会话记录。" },
      review: { saved: false, text: "", unknown: "未记录的活动没有被判定为未完成。" },
    },
    "2026-09-22": {
      plan: { saved: true, updatedAt: "08:05", items: [{ time: "09:00", title: "先排固定安排", text: "为可移动事项留出余量。" }, { time: "14:00", title: "检查本周待办", text: "任务继续保留在 Inbox 与各自清单。" }], basis: "依据：9月22日 Daily Record。" },
      review: { saved: false, text: "", unknown: "未观察到的事实保持未知。" },
    },
  },
  review: {
    saved: false,
    text: "",
    unknown: "下午未记录的活动暂时保持未知，不推断为未完成。",
  },
  habits: [
    { id: "habit-walk", name: "晨间散步", date: "2026-09-26", complete: true, source: "本地完成记录" },
    { id: "habit-read", name: "阅读 20 分钟", date: "2026-09-26", complete: false, source: "尚未记录 · 状态未知" },
    { id: "habit-stretch", name: "拉伸", date: "2026-09-24", complete: false, source: "历史本地记录 · 可更正" },
  ],
  recordCorrection: null,
  longMemory: [
    { id: "pref-rest", title: "安排节奏", text: "做计划时先留出休息与转换时间，再放入可移动事项。", status: "confirmed", source: "用户明确表达 · 2026-08-14" },
    { id: "pref-options", title: "选项与任务", text: "没有明确承诺的建议先保留为选项，不自动变成 Task。", status: "confirmed", source: "用户明确表达 · 2026-08-14" },
    { id: "inferred-evening", title: "晚间精力（待核实）", text: "最近几次晚间安排较轻；这可能只是近期状态，不应直接当成长期偏好。", status: "verify", source: "Agent 推断 · 尚未确认" },
  ],
  recentMemory: "最近在协调几项家庭事务；租约扫描件仍未确认完成。9月25日开始的周安排会话今天继续。此摘要供衔接参考，当前任务状态以 Tasks 为准。",
  sessions: [
    {
      id: "session-morning", title: "早间安排与优先级", createdAt: "2026-09-26", lastAt: "08:42", activityDates: ["2026-09-26"], kind: "morning",
      messages: [
        { who: "user", text: "帮我按今天真实安排做个早间计划。下午两点有个固定事项，别把没确认的想法直接加进任务。", time: "08:34" },
        { who: "agent", text: "我先读取了最新 Tasks 和今天的记录。固定时间按已确认信息保留；未确定的家务只列为选项。早间计划已保存，实际 Tasks 没有变化。", time: "08:42", tag: "已保存", receipt: "Daily Record · 早间基准与今天的大致安排已更新。Tasks 未改动。" },
      ],
    },
    {
      id: "session-week", title: "把这周安排重新摆一摆", createdAt: "2026-09-25", lastAt: "今天 09:18", activityDates: ["2026-09-25", "2026-09-26"], kind: "daytime",
      messages: [
        { who: "user", text: "这周有一项家里安排变了，帮我一起看看哪些事情要往后挪。", time: "昨天 16:20" },
        { who: "agent", text: "我记住了上次讨论的背景；开始调整前我会重新读取今天的 Tasks 和目标日期记录。", time: "今天 09:18", tag: "跨天继续" },
      ],
    },
    {
      id: "session-car", title: "车险续保：先比较方案", createdAt: "2026-09-26", lastAt: "07:56", activityDates: ["2026-09-26"], kind: "task",
      messages: [
        { who: "user", text: "续保先做比较，暂时不用替我决定。", time: "07:56" },
        { who: "agent", text: "我会把比较结果作为建议保留；只有你明确决定后，才改 Task 或记录安排。", time: "07:57", tag: "建议 · 未执行", suggestion: { mode: "note", title: "建议：先整理续保差异", text: "先列出保费、保障范围和待确认问题；目前不改 Task 时间，也不写入 Daily Record。", acceptLabel: "保留这条建议", discussLabel: "继续比较" } },
      ],
    },
    {
      id: "session-friday", title: "周五复盘和下周交接", createdAt: "2026-09-25", lastAt: "昨天 20:10", activityDates: ["2026-09-25"], kind: "review",
      messages: [
        { who: "user", text: "没记录到的活动先留白，之后我想起来再补。", time: "20:10" },
        { who: "agent", text: "好的。未观察到不表示没有发生，我会保留为未知。", time: "20:11", tag: "已保存" },
      ],
    },
    {
      id: "session-old", title: "厨房收纳尺寸记录", createdAt: "2026-09-24", lastAt: "周四 17:30", activityDates: ["2026-09-24"], kind: "task",
      messages: [
        { who: "user", text: "把量好的尺寸记下来，任务日期暂时不改。", time: "17:30" },
        { who: "agent", text: "记录已写入当天 Daily Record；原任务保持不变。", time: "17:31", tag: "已保存" },
      ],
    },
    {
      id: "session-tuesday", title: "周二的早间安排", createdAt: "2026-09-22", lastAt: "周二 08:05", activityDates: ["2026-09-22"], kind: "morning",
      messages: [
        { who: "user", text: "先排固定安排，其他事情给我一点余量。", time: "08:03" },
        { who: "agent", text: "早间基准保留了固定安排和休息缓冲。", time: "08:05", tag: "已保存" },
      ],
    },
  ],
  activity: [
    { date: "2026-09-26", time: "08:34", kind: "session", title: "早间安排与优先级", summary: "明确固定安排与待确认选项；开始读取最新状态。" },
    { date: "2026-09-26", time: "08:42", kind: "morning", title: "早间计划已保存", summary: "早间基准和今天的大致安排写入 Daily Record；Tasks 未改动。" },
    { date: "2026-09-26", time: "09:18", kind: "session", title: "把这周安排重新摆一摆", summary: "从 9月25日继续；目标日期与相关 Tasks 将在工作开始时重新读取。" },
    { date: "2026-09-26", time: "14:00", kind: "task", title: "确认车险续保方案", summary: "Inbox · 待办。日期与时间属于同一条 Task 正本。" },
    { date: "2026-09-26", time: "19:00", kind: "review", title: "晚间复盘", summary: "尚未开始。依据已观察事实；未记录活动保持未知。" },
  ],
};

const statusOptions = [
  ["working", "正在工作", "读取最新状态并执行已明确的操作"],
  ["waiting", "等待你补充", "有一个关键信息需要你选择"],
  ["queued", "排队中", "同一 Vault 的另一项工作正在运行"],
  ["partial", "部分完成", "逐项查看成功结果与待重试项"],
  ["interrupted", "已中断", "保留已确认的修改，可从这里继续"],
  ["saved", "已保存", "工作结果已写入对应的现有记录"],
];

let toastTimer;

function readVariant() {
  const requested = new URLSearchParams(location.search).get("variant")?.toUpperCase();
  return variants.some((item) => item.key === requested) ? requested : "A";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function activeSession() {
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
}

function sessionsForDate(date = state.selectedDate) {
  return state.sessions.filter((session) => session.activityDates.includes(date));
}

function dateLabel(date) {
  return dateOptions.find((item) => item.date === date)?.label ?? date;
}

function shortDate(date) {
  return date.slice(5).replace("-", "/");
}

function activeSessionForDate(date) {
  const sessions = sessionsForDate(date);
  if (!sessions.length) {
    state.activeSessionId = "";
    return;
  }
  if (!sessions.some((session) => session.id === state.activeSessionId)) state.activeSessionId = sessions[0].id;
}

function taskById(id) {
  return state.tasks.find((task) => task.id === id);
}

function visibleTasks() {
  return state.tasks.filter((task) => !task.deleted);
}

function selectedPlan() {
  return state.selectedDate === "2026-09-26" ? state.plan : (state.historicalRecords[state.selectedDate]?.plan ?? state.plan);
}

function selectedReview() {
  return state.selectedDate === "2026-09-26" ? state.review : (state.historicalRecords[state.selectedDate]?.review ?? state.review);
}

function planForDate(date) {
  return date === "2026-09-26" ? state.plan : (state.historicalRecords[date]?.plan ?? state.plan);
}

function reviewForDate(date) {
  return date === "2026-09-26" ? state.review : (state.historicalRecords[date]?.review ?? state.review);
}

function formatTaskDate(task) {
  if (!task.date) return "未安排日期";
  if (task.date === state.selectedDate) return `${dateLabel(task.date).split(" · ")[0]}${task.time ? ` · ${task.time}` : ""}`;
  return `${shortDate(task.date)}${task.time ? ` · ${task.time}` : ""}`;
}

function setVariant(key) {
  state.variant = key;
  const url = new URL(location.href);
  url.searchParams.set("variant", key);
  history.replaceState(null, "", url);
  renderAll();
}

function nextVariant(direction) {
  const index = variants.findIndex((variant) => variant.key === state.variant);
  const next = (index + direction + variants.length) % variants.length;
  setVariant(variants[next].key);
}

function renderDateSelect(className = "") {
  return `<select class="${className}" data-date-select aria-label="按日期查找协作会话">${dateOptions.map((item) => `<option value="${item.date}" ${state.selectedDate === item.date ? "selected" : ""}>${item.label}</option>`).join("")}</select>`;
}

function renderDatePicker() {
  const currentIndex = dateOptions.findIndex((item) => item.date === state.selectedDate);
  const previous = dateOptions[Math.min(currentIndex + 1, dateOptions.length - 1)];
  const next = dateOptions[Math.max(currentIndex - 1, 0)];
  return `<div class="date-control"><button class="date-arrow" data-select-date="${previous.date}" aria-label="前一天">‹</button>${renderDateSelect()}<button class="date-arrow" data-select-date="${next.date}" aria-label="后一天">›</button></div>`;
}

function renderSessionItem(session, compact = false) {
  const isActive = session.id === state.activeSessionId;
  const crossDay = session.activityDates.length > 1;
  const origin = crossDay ? `<span class="session-origin">${shortDate(session.createdAt)} 创建 · ${state.selectedDate === "2026-09-26" ? "今天继续" : "这一天有活动"}</span>` : "";
  return `<button class="session-item ${isActive ? "is-active" : ""}" data-open-session="${session.id}" aria-pressed="${isActive}">
    <span class="session-title-row"><span class="session-title">${esc(session.title)}</span><span class="session-time">${esc(session.lastAt)}</span></span>
    <span class="session-detail">${session.kind === "morning" ? "早间计划" : session.kind === "daytime" ? "白天调整" : session.kind === "review" ? "晚间复盘" : "Tasks · 本地"} · ${compact ? "打开继续" : "有新活动"}</span>${origin}
  </button>`;
}

function renderSessionPanel() {
  const sessions = sessionsForDate();
  return `<aside class="panel session-panel" aria-label="协作会话">
    <div class="panel-header"><div><h3>会话</h3><p class="panel-subtitle">按活动日期查看，可跨天继续</p></div><span class="session-count">${sessions.length}</span></div>
    <div class="session-datebar"><span>${esc(dateLabel(state.selectedDate))} · ${sessions.length} 个会话</span><span>最近活动</span></div>
    <div class="session-list">${sessions.length ? sessions.map((session) => renderSessionItem(session)).join("") : `<div class="session-empty">这一天还没有协作会话。你可以从 Today 或一条 Task 带入上下文开始。</div>`}</div>
    <button class="secondary-button new-session" data-action="new-session">＋ 新会话</button>
  </aside>`;
}

function renderMessage(message) {
  const user = message.who === "user";
  const role = user ? "你" : "Codex · 演示";
  const tag = message.tag ? `<span class="message-chip">${esc(message.tag)}</span>` : "";
  const receipt = message.receipt ? `<div class="saved-receipt"><strong>✓ 已保存</strong> · ${esc(message.receipt)}</div>` : "";
  const progress = message.progress ? `<div class="inline-progress"><span class="tiny-spinner"></span>${esc(message.progress)}</div>` : "";
  const suggestion = message.suggestion ? `<div class="suggestion-card"><div class="suggestion-heading"><strong>${esc(message.suggestion.title)}</strong><span class="mini-pill" style="color:#8a713e;background:#faf3e4">建议 · 未执行</span></div><p>${esc(message.suggestion.text)}</p><div class="suggestion-actions"><button class="small-button" data-action="accept-suggestion" data-suggestion-mode="${esc(message.suggestion.mode ?? "plan")}">${esc(message.suggestion.acceptLabel ?? "按此安排保存")}</button><button class="small-button" data-action="discuss-suggestion">${esc(message.suggestion.discussLabel ?? "先讨论")}</button></div></div>` : "";
  const details = message.detail ? `<details class="detail-fold"><summary>查看工作细节</summary><pre>${esc(message.detail)}</pre></details>` : "";
  return `<div class="message-row ${user ? "is-user" : ""}">
    <span class="avatar ${user ? "user-avatar" : ""}" aria-hidden="true">${user ? "你" : "C"}</span>
    <div class="message-content"><div class="message-author">${role} ${tag}</div><div class="message-bubble">${esc(message.text)}</div>${progress}${suggestion}${receipt}${details}<div class="message-time">${esc(message.time || "刚刚")}</div></div>
  </div>`;
}

function renderMessageList(session = activeSession()) {
  if (!session) return `<div class="session-empty">选择一个会话继续，或从 Today / Tasks 带入上下文。</div>`;
  const messages = session.messages ?? [];
  const visible = messages.slice(-8);
  return `<div class="message-list">${visible.map(renderMessage).join("")}</div>`;
}

function renderContextChips() {
  if (!state.context) return "";
  return `<span class="context-chip">${esc(state.context.label)}<button data-action="remove-context" aria-label="移除上下文">×</button></span>`;
}

function renderComposer(extraClass = "") {
  const voice = state.voiceDemo ? `<span class="voice-state">语音识别演示文字已插入，可编辑 · 无真实麦克风</span>` : `<span>语音按钮为模拟输入</span>`;
  return `<form class="composer ${extraClass}" data-composer>
    <div class="composer-context">${renderContextChips()}</div>
    <div class="composer-box"><textarea data-compose aria-label="给协作 Agent 发消息" placeholder="补充事实、调整方向，或继续讨论…" rows="2">${esc(state.composerDraft)}</textarea>
      <div class="composer-actions"><button class="icon-button" type="button" data-action="voice" aria-label="模拟语音输入" title="模拟语音输入">◖</button><button class="send-button" type="submit" aria-label="发送">↑</button></div>
    </div>
    <div class="composer-footnote"><span>${voice}</span><span>当前会话 · 内存状态</span></div>
  </form>`;
}

function renderConversationPanel({ focus = false } = {}) {
  const session = activeSession();
  const sessionName = session ? esc(session.title) : "选择或新建一个会话";
  const sessionOrigin = session && session.activityDates.length > 1 ? ` · 跨天会话 · ${shortDate(session.createdAt)} 创建` : "";
  let sessionState = "会话记录";
  if (session && state.queuedSessionIds.includes(session.id)) {
    sessionState = "排队中";
  } else if (session && state.demoStatus === "queued") {
    sessionState = session.id === state.workingSessionId ? "正在工作" : "可浏览";
  } else if (session && state.demoStatus === "working") {
    sessionState = session.id === state.workingSessionId ? "持续工作" : "可浏览 · 另一会话工作中";
  } else if (session && session.id === state.workingSessionId && state.demoStatus === "interrupted") sessionState = "已中断";
  else if (session && session.id === state.workingSessionId && state.demoStatus === "partial") sessionState = "部分完成";
  else if (session && session.id === state.workingSessionId && state.demoStatus === "saved") sessionState = "已保存";
  const compactClass = focus ? "focus-chat-panel" : "conversation-panel";
  return `<section class="panel ${compactClass}" aria-label="对话">
    <header class="conversation-heading"><div><h3>${sessionName}</h3><p>${esc(dateLabel(state.selectedDate))}${sessionOrigin} · ${session ? "可跨天继续" : "尚未开始"}</p></div>
      <div class="conversation-heading-actions"><span class="status-pill">${sessionState}</span></div>
    </header>
    <div class="conversation-scroll"><div class="eyebrow">${session?.kind === "morning" ? "早间计划" : session?.kind === "daytime" ? "白天调整" : session?.kind === "review" ? "晚间复盘" : "协作记录"} · ${esc(dateLabel(state.selectedDate))}</div>${renderMessageList(session)}</div>
    ${focus ? `<div class="focus-side-note">对话历史在此保留；Task 状态与 Daily Record 仍来自现有业务正本。</div>` : ""}
    <div class="conversation-quick-actions"><button class="quick-chip" data-action="context-today">＋ 从 Today 带入</button><button class="quick-chip" data-action="context-task" data-task-id="task-184">＋ 从 Task 带入</button><button class="quick-chip" data-action="start-evening">开始晚间复盘</button></div>
    ${renderComposer()}
  </section>`;
}

function renderTaskCard(task, { actions = true, compact = false } = {}) {
  const operation = state.operationResult?.id === task.id ? `<div class="task-action-result">✓ ${esc(state.operationResult.text)}</div>` : "";
  const deleted = task.deleted;
  const complete = task.status === "completed";
  const check = complete ? "✓" : deleted ? "–" : "";
  const buttons = deleted
    ? `<button data-action="task-restore" data-task-id="${task.id}">恢复任务</button>`
    : `<button data-action="task-toggle" data-task-id="${task.id}">${complete ? "重新打开" : "完成"}</button>${!compact ? `<button data-action="task-reschedule" data-task-id="${task.id}">改到 15:30</button><button data-action="task-delete" data-task-id="${task.id}" class="is-danger">删除</button>` : ""}`;
  return `<article class="task-card ${complete ? "is-complete" : ""}" data-task-card="${task.id}">
    <div class="task-top"><span class="task-check ${complete ? "is-checked" : ""}" aria-hidden="true">${check}</span><div class="task-main"><span class="task-name">${esc(task.name)}</span><div class="task-meta"><span>${esc(task.list)} · ${esc(formatTaskDate(task))}</span><span class="source-pill">Task ${esc(task.id)}</span>${deleted ? `<span class="mini-pill" style="color:#a8413a;background:#fff0ee">已删除</span>` : complete ? `<span class="mini-pill">已完成</span>` : `<span class="mini-pill" style="color:#69756d;background:#f0f2ef">待办</span>`}</div></div></div>
    ${actions ? `<div class="task-actions">${buttons}<button data-linked-view="tasks">在 Tasks 查看</button></div>` : ""}${operation}
  </article>`;
}

function renderTaskList({ compact = false, actions = true } = {}) {
  const tasks = visibleTasks();
  return `<div class="task-list">${tasks.map((task) => renderTaskCard(task, { compact, actions })).join("")}${compact ? "" : `<button class="link-button" data-action="task-add">＋ 新建 Task（演示）</button>`}</div>`;
}

function renderPlanRows({ wide = false } = {}) {
  return selectedPlan().items.map((item) => `<div class="${wide ? "wide-plan" : "plan-block"}"><span class="${wide ? "wide-plan-time" : "plan-time"}">${esc(item.time)}</span><div class="${wide ? "wide-plan-content" : ""}"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></div>`).join("");
}

function renderPlanArtifact({ wide = false } = {}) {
  const plan = selectedPlan();
  return `<div class="artifact-topline"><div><h3>今天的大致安排</h3><p class="artifact-caption">Daily Record · ${esc(dateLabel(state.selectedDate))} · ${plan.saved ? `更新于 ${esc(plan.updatedAt)}` : "计划草稿"}</p></div><span class="state-pill" data-state="saved">${plan.saved ? "已保存" : "建议"}</span></div>
  <div class="${wide ? "wide-plan-list" : "plan-list"}">${renderPlanRows({ wide })}</div>
  <div class="${wide ? "basis-box" : "artifact-section"}">${wide ? `<strong>计划依据</strong><p>${esc(plan.basis)}</p>` : `<div class="artifact-section-heading"><strong>计划依据</strong><small>可展开查看原始记录</small></div><div class="evidence-list"><div class="evidence-row"><span class="evidence-mark">✓</span>已确认的固定安排与 Tasks</div><div class="evidence-row"><span class="evidence-mark">✓</span>保留休息和过渡时间</div><div class="evidence-row"><span class="evidence-mark unknown">?</span>未确认的活动不写成事实</div></div>`}</div>
  <div class="object-actions"><button class="primary-button small-button" data-action="generate-plan">${plan.saved ? "整理剩余安排" : "生成计划"}</button><button class="secondary-button small-button" data-action="context-today">从 Today 带入</button><button class="link-button" data-linked-view="today">在 Today 查看 ↗</button></div>`;
}

function renderTasksArtifact() {
  return `<div class="artifact-topline"><div><h3>Tasks · 共享任务</h3><p class="artifact-caption">以下项目在 Tasks、Today、Calendar 使用同一身份</p></div><button class="link-button" data-linked-view="tasks">打开 Tasks ↗</button></div><div class="task-list">${renderTaskList()}</div><div class="object-link"><div><small>当前 Vault</small><strong>任务正本 · 本机</strong></div><span class="state-pill" data-state="saved">读取最新状态</span></div>`;
}

function renderReviewArtifact() {
  const review = selectedReview();
  if (!review.saved) {
    return `<div class="artifact-topline"><div><h3>晚间复盘</h3><p class="artifact-caption">${esc(dateLabel(state.selectedDate))} · 尚未开始</p></div><span class="mini-pill" style="color:#907442;background:#faf3e5">待整理</span></div><div class="review-card"><p>结合当天完成的 Tasks 和已有记录，先形成保守草稿。未观察到的活动会保留为未知。</p><div class="review-question">“下午未记录的活动”不会被写成未完成；你之后可以补充或修正。</div><div class="review-source">依据：当天 Daily Record、Task 完成状态与可用的来源说明</div></div><div class="object-actions"><button class="primary-button small-button" data-action="start-evening">开始晚间复盘</button><button class="secondary-button small-button" data-action="context-today">带入 Today 记录</button></div>`;
  }
  return `<div class="artifact-topline"><div><h3>晚间复盘</h3><p class="artifact-caption">Daily Record · ${esc(dateLabel(state.selectedDate))}</p></div><span class="state-pill" data-state="saved">已保存</span></div><div class="review-card"><p>${esc(review.text)}</p><div class="review-question">${esc(review.unknown)}</div><div class="review-source">已读取当天任务状态；没有推断未记录活动。</div></div><div class="object-actions"><button class="secondary-button small-button" data-action="edit-review">补充复盘</button><button class="link-button" data-linked-view="today">在 Today 查看 ↗</button></div>`;
}

function renderArtifactContent({ wide = false } = {}) {
  if (state.activeArtifact === "tasks") return renderTasksArtifact();
  if (state.activeArtifact === "review") return renderReviewArtifact();
  return renderPlanArtifact({ wide });
}

function renderArtifactTabs({ object = false } = {}) {
  const buttonClass = object ? "object-tab" : "artifact-tab";
  return `<div class="${object ? "object-tabs" : "artifact-nav"}" role="tablist" aria-label="当前工作内容">
    <button class="${buttonClass}" data-artifact="plan" aria-pressed="${state.activeArtifact === "plan"}">早间计划</button>
    <button class="${buttonClass}" data-artifact="tasks" aria-pressed="${state.activeArtifact === "tasks"}">Tasks</button>
    <button class="${buttonClass}" data-artifact="review" aria-pressed="${state.activeArtifact === "review"}">晚间复盘</button>
  </div>`;
}

function renderWorkPanel() {
  return `<aside class="panel work-panel" aria-label="当前工作内容"><div class="panel-header"><div><h3>当前工作内容</h3><p class="panel-subtitle">与现有页面共享正本</p></div><button class="icon-button" data-action="memory" aria-label="查看记忆" title="查看记忆">⌘</button></div>${renderArtifactTabs()}<div class="artifact-content">${renderArtifactContent()}</div><footer class="work-footer"><div class="work-footer-head"><strong><span class="small-dot"></span>任务与计划已重新读取</strong><button class="link-button" data-linked-view="tasks">查看 Tasks</button></div><p>工作开始时读取最新数据；逐项显示已保存结果，不承诺跨对象原子回滚。</p></footer></aside>`;
}

function renderVariantA() {
  const current = activeSession();
  return `<section class="variant-a">
    <div class="variant-meta"><div class="variant-title"><h2>会话工作台</h2><small>会话、对话与当前工作对象并排</small></div>${renderDatePicker()}<button class="context-entry-link" data-action="context-today">↗ 从 Today 带入</button></div>
    <div class="workbench-grid">${renderSessionPanel()}${renderConversationPanel()}${renderWorkPanel()}</div>
  </section>`;
}

function dateChipMarkup(option) {
  const dayName = option.date === "2026-09-26" ? "今天" : option.date === "2026-09-25" ? "昨天" : option.date === "2026-09-24" ? "周四" : "周二";
  const count = sessionsForDate(option.date).length;
  return `<button class="date-chip" data-select-date="${option.date}" aria-pressed="${state.selectedDate === option.date}"><span>${dayName}</span><strong>${option.date.slice(-2)}</strong><small>${count} 会话</small></button>`;
}

function renderFlowDateStrip() {
  return `<div class="date-strip" role="group" aria-label="协作活动日期">${dateOptions.map(dateChipMarkup).join("")}</div>`;
}

function renderSessionStrip() {
  const sessions = sessionsForDate();
  return `<div class="session-strip-panel"><span class="session-strip-label">${esc(dateLabel(state.selectedDate))} · 会话</span><div class="session-strip-items">${sessions.length ? sessions.map((session) => `<button class="session-chip" data-open-session="${session.id}" aria-pressed="${state.activeSessionId === session.id}">${esc(session.title)}<small>${session.createdAt !== state.selectedDate ? `${shortDate(session.createdAt)} 起` : session.lastAt}</small></button>`).join("") : `<span class="session-empty">无会话</span>`}</div><button class="session-strip-new" data-action="new-session">＋ 新会话</button></div>`;
}

function renderTimelineEntry({ time, kind, title, summary, body = "", actions = "" }) {
  const icon = kind === "morning" ? "☼" : kind === "task" ? "□" : kind === "review" ? "↻" : "✳";
  return `<article class="timeline-entry"><time class="timeline-time">${esc(time)}</time><span class="timeline-pin" data-kind="${kind}" aria-hidden="true">${icon}</span><div class="timeline-card"><div class="timeline-card-header"><div><h3>${esc(title)}</h3><p>${esc(summary)}</p></div>${kind === "morning" ? `<span class="state-pill" data-state="saved">已保存</span>` : ""}</div>${body}${actions ? `<div class="timeline-actions">${actions}</div>` : ""}</div></article>`;
}

function renderConversationEvent() {
  const session = activeSession();
  if (!session) return renderTimelineEntry({ time: "09:00", kind: "session", title: "还没有协作会话", summary: "开始一段新会话，或从 Today / Tasks 带入上下文。", actions: `<button class="small-button" data-action="new-session">＋ 新会话</button>` });
  const messages = session.messages ?? [];
  const dayMessages = messages.filter((message) => {
    if (message.time?.startsWith("今天")) return state.selectedDate === "2026-09-26";
    if (message.time?.startsWith("昨天")) return state.selectedDate === "2026-09-25";
    return session.createdAt === state.selectedDate;
  });
  const last = dayMessages[dayMessages.length - 1];
  const first = dayMessages.find((message) => message.who === "user");
  const start = first ? `<div class="timeline-bubble user-bubble">${esc(first.text)}</div>` : "";
  const response = last && last.who === "agent" ? `<div class="timeline-bubble">${esc(last.text)}</div>` : "";
  let eventTime = session.lastAt.includes(":") ? session.lastAt.replace("今天 ", "") : "09:18";
  if (state.selectedDate !== "2026-09-26" && session.createdAt === state.selectedDate) eventTime = first?.time?.replace("昨天 ", "") ?? "09:00";
  const crossDayLabel = session.activityDates.length > 1 ? `${shortDate(session.createdAt)} 创建 · 跨天会话` : "";
  return renderTimelineEntry({ time: eventTime, kind: "session", title: session.title, summary: `${crossDayLabel ? `${crossDayLabel} · ` : ""}仅展示所选日期的会话活动，可继续补充。`, body: `${start}${response}<div class="timeline-actions"><button class="small-button" data-action="focus-composer">继续这段对话</button><button class="small-button" data-action="context-today">从 Today 带入</button></div>` });
}

function renderTimeline() {
  const isToday = state.selectedDate === "2026-09-26";
  const dayPrefix = isToday ? "" : `${shortDate(state.selectedDate)} · `;
  const plan = selectedPlan();
  const review = selectedReview();
  const items = [];
  items.push(renderTimelineEntry({
    time: plan.updatedAt, kind: "morning", title: "早间计划 · 已保存到 Daily Record", summary: `${dayPrefix}今天的大致安排保持可读；早间基准与当前安排分开。`,
    body: `<div class="timeline-summary">${plan.items[0] ? esc(plan.items[0].text) : "计划尚未生成。"}</div><div class="timeline-object-row"><div><strong>${esc(plan.items[0]?.title ?? "早间计划")}</strong><small>Tasks 未自动修改 · 计划依据可展开查看</small></div><button class="link-button" data-artifact="plan">查看计划</button></div>`,
    actions: `<button class="small-button" data-action="generate-plan">调整剩余安排</button><button class="small-button" data-linked-view="today">在 Today 查看</button>`,
  }));
  items.push(renderConversationEvent());
  const firstTask = visibleTasks()[0];
  const taskIsOnSelectedDate = firstTask?.date === state.selectedDate;
  items.push(renderTimelineEntry({
    time: taskIsOnSelectedDate ? (firstTask?.time ?? "全天") : "关联", kind: "task", title: taskIsOnSelectedDate ? "Tasks · 当天任务正本" : "Task · 当前共享状态", summary: taskIsOnSelectedDate ? "当天 Task 状态与 Tasks / Today / Calendar 共用。" : "这是当前关联任务，不属于所选历史日期的活动记录。",
    body: firstTask ? `<div class="timeline-object-row"><div><strong>${esc(firstTask.name)}</strong><small>${esc(firstTask.list)} · ${esc(formatTaskDate(firstTask))} · ${esc(firstTask.id)}</small></div><span class="mini-pill">${firstTask.status === "completed" ? "已完成" : "待办"}</span></div>` : `<div class="timeline-summary">当前没有可展示的任务。</div>`,
    actions: `<button class="small-button" data-action="task-reschedule" data-task-id="${firstTask?.id ?? ""}">改到 15:30</button><button class="small-button" data-linked-view="tasks">在 Tasks 查看</button>`,
  }));
  items.push(renderTimelineEntry({
    time: "19:00", kind: "review", title: review.saved ? "晚间复盘 · 已保存" : "晚间复盘 · 待开始", summary: "根据已观察的事实整理；未记录的活动继续保持未知。",
    body: `<div class="timeline-summary">${review.saved ? esc(review.text) : "尚未复盘。可以先生成保守草稿，再补充遗漏。"}</div>`,
    actions: `<button class="small-button" data-action="${review.saved ? "edit-review" : "start-evening"}">${review.saved ? "补充复盘" : "开始晚间复盘"}</button><button class="small-button" data-artifact="review">打开复盘对象</button>`,
  }));
  const added = state.activity.filter((event) => event.date === state.selectedDate && event.dynamic);
  for (const event of added) items.splice(Math.max(1, items.length - 1), 0, renderTimelineEntry({ time: event.time, kind: event.kind, title: event.title, summary: event.summary, actions: `<button class="small-button" data-linked-view="${event.kind === "task" ? "tasks" : "today"}">查看共享内容</button>` }));
  return items.join("");
}

function renderFlowRail() {
  const plan = selectedPlan();
  const review = selectedReview();
  const tasks = visibleTasks().slice(0, 3);
  return `<aside class="focus-rail">
    <section class="panel"><div class="rail-section"><h3>关联 Tasks <small>${visibleTasks().length} 条</small></h3>${tasks.map((task) => `<div class="rail-task"><span class="task-check ${task.status === "completed" ? "is-checked" : ""}">${task.status === "completed" ? "✓" : ""}</span><div class="rail-task-name">${esc(task.name)}<span class="rail-task-meta">${esc(task.list)} · ${esc(formatTaskDate(task))}</span></div></div>`).join("")}<button class="link-button" data-linked-view="tasks">在 Tasks 查看全部 ↗</button></div></section>
    <section class="panel"><div class="rail-section"><h3>Daily Record · ${esc(shortDate(state.selectedDate))}</h3><button class="phase-link" data-artifact="plan"><span class="phase-icon">☼</span><span><strong>早间基准与安排</strong><small>${plan.saved ? "已保存 · 保留最初安排" : "待生成"}</small></span></button><button class="phase-link" data-action="context-today"><span class="phase-icon">↗</span><span><strong>白天更新</strong><small>从当天事实进入协作</small></span></button><button class="phase-link" data-artifact="review"><span class="phase-icon">↻</span><span><strong>晚间复盘</strong><small>${review.saved ? "已保存 · 可继续补充" : "待开始"}</small></span></button><button class="link-button" data-linked-view="today">打开 Today ↗</button></div></section>
    <section class="panel"><div class="rail-section"><h3>工作队列 <small>同一 Vault 串行</small></h3>${state.demoStatus === "queued" ? `<div class="queue-note">本会话等待“${esc(activeSession()?.title ?? "另一项工作")}”完成。你仍可浏览、编辑草稿和准备补充内容。</div>` : `<div class="queue-note" style="color:#68766c;background:#f4f6f3">没有其他会话同时写入。开始新工作时会重新读取当前状态。</div>`}</div></section>
  </aside>`;
}

function renderVariantB() {
  return `<section class="variant-b">
    <div class="variant-meta"><div class="variant-title"><h2>日期活动流</h2><small>对话与业务变化按当天时间顺序共处</small></div><div class="flow-date-heading"><strong>${esc(dateLabel(state.selectedDate))}</strong><small>按活动日期找回会话与 Daily Record</small></div><button class="context-entry-link" data-action="context-task" data-task-id="task-184">↗ 从 Task 带入</button></div>
    ${renderFlowDateStrip()}${renderSessionStrip()}
    <div class="flow-layout"><section class="panel day-stream" aria-label="当天协作活动"><div class="stream-head"><strong>当天协作与实际变化</strong><span>计划 · 对话 · Task · 复盘</span></div><div class="timeline">${renderTimeline()}</div><div class="stream-composer-entry">${renderComposer()}</div></section>${renderFlowRail()}</div>
  </section>`;
}

function renderSessionMenu() {
  const sessions = sessionsForDate();
  return `<div class="focus-session-menu" data-focus-session-menu hidden>${sessions.length ? sessions.map((session) => renderSessionItem(session, true)).join("") : `<div class="session-empty">此日还没有会话。</div>`}<button class="secondary-button new-session" data-action="new-session">＋ 新会话</button></div>`;
}

function renderTaskCanvas() {
  return `<div class="focus-task-canvas"><div><div class="artifact-topline"><div><h3>Tasks · 同一任务正本</h3><p class="artifact-caption">在协作中修改，原来的 Tasks / Today / Calendar 读取相同对象</p></div><button class="link-button" data-linked-view="tasks">打开 Tasks ↗</button></div><div class="task-list-wide">${visibleTasks().map((task) => renderTaskCard(task)).join("")}<button class="secondary-button" data-action="task-add">＋ 新建 Task（演示）</button></div></div><aside class="task-context-rail"><h3>这个对象怎样联动</h3><p>改期修改 Task ${esc(state.tasks[0]?.id ?? "")} 的日期/时间；不会创建一个会话专属副本。</p><p>完成、删除或恢复也使用同一 Task 身份。Vault 中的手动编辑仍需在操作前重新读取。</p><button class="link-button" data-linked-view="today">查看 Today 上的同一事项 ↗</button></aside></div>`;
}

function renderReviewCanvas() {
  const review = selectedReview();
  return `<div class="artifact-topline"><div><h3>晚间复盘 · ${esc(dateLabel(state.selectedDate))}</h3><p class="artifact-caption">日常记录保持在 Daily Record，不由对话替代。</p></div><span class="state-pill" data-state="${review.saved ? "saved" : "waiting"}">${review.saved ? "已保存 · 可补充" : "尚未开始"}</span></div><div class="review-card"><p>${review.saved ? esc(review.text) : "先读取当天 Task 完成情况和已有记录，再给出一版保守整理。"}</p><div class="review-question">${esc(review.unknown)}</div><div class="review-source">事实依据可回查到原始会话和当天 Daily Record；不记录未经观察的动机或活动。</div></div><div class="object-actions"><button class="primary-button" data-action="${review.saved ? "edit-review" : "start-evening"}">${review.saved ? "补充复盘" : "读取事实并开始复盘"}</button><button class="secondary-button" data-linked-view="today">在 Today 查看 ↗</button></div>`;
}

function renderObjectStage() {
  const plan = selectedPlan();
  const review = selectedReview();
  const title = state.activeArtifact === "tasks" ? "任务" : state.activeArtifact === "review" ? "晚间复盘" : "今天的大致安排";
  const updated = state.activeArtifact === "tasks" ? "Task 正本 · 本地 Vault" : state.activeArtifact === "review" ? (review.saved ? "Daily Record · 已保存" : "Daily Record · 待开始") : `Daily Record · ${plan.saved ? `更新于 ${plan.updatedAt}` : "计划草稿"}`;
  const content = state.activeArtifact === "tasks" ? renderTaskCanvas() : state.activeArtifact === "review" ? renderReviewCanvas() : renderPlanArtifact({ wide: true });
  return `<section class="panel object-stage" aria-label="当前业务对象"><header class="object-stage-heading"><div><div class="eyebrow">当前工作对象 · ${esc(dateLabel(state.selectedDate))}</div><h2>${title}</h2><p>${updated} · 内容与现有 Today / Tasks 共用</p></div><div class="conversation-heading-actions"><button class="secondary-button small-button" data-action="context-today">从 Today 带入</button><button class="icon-button" data-action="memory" aria-label="查看记忆">⌘</button></div></header><div class="object-stage-body">${renderArtifactTabs({ object: true })}<div class="object-summary"><div><strong>${state.activeArtifact === "tasks" ? "当天相关 Tasks" : state.activeArtifact === "review" ? "复盘状态" : "这份安排只表达计划"}</strong><p>${state.activeArtifact === "tasks" ? "每条任务都有稳定身份；状态修改会反映在其它页面。" : state.activeArtifact === "review" ? "计划、事实、早间基准与复盘各自有明确位置。" : "早间基准保留初始安排；白天调整更新当前安排。未确认的事项不自动成为任务。"}</p></div><div class="object-summary-count"><strong>${state.activeArtifact === "tasks" ? visibleTasks().length : state.activeArtifact === "review" ? (review.saved ? "✓" : "—") : plan.items.length}</strong><small>${state.activeArtifact === "tasks" ? "相关任务" : state.activeArtifact === "review" ? "复盘" : "时间段"}</small></div></div>${content}</div></section>`;
}

function renderVariantC() {
  const session = activeSession();
  const sessionName = session ? esc(session.title) : "无会话 · 新建或选择";
  return `<section class="variant-c">
    <div class="variant-meta"><div class="variant-title"><h2>成果优先工作区</h2><small>先看正在改变的记录，对话随对象并列</small></div><span class="context-entry-link" data-action="context-task" data-task-id="task-184">从任务进入 ↗</span></div>
    <div class="focus-sessionbar"><div class="focus-sessionbar-left"><div class="focus-session-popover"><button class="secondary-button small-button" data-action="toggle-session-menu" aria-expanded="false">会话 ▾</button>${renderSessionMenu()}</div><span class="focus-session-name">${sessionName}</span></div><div class="focus-sessionbar-right">${renderDateSelect()}<span class="session-detail">${sessionsForDate().length} 个会话 · ${session && session.createdAt !== state.selectedDate ? `${shortDate(session.createdAt)} 开始` : "按活动日期归档"}</span><button class="secondary-button small-button" data-action="new-session">＋ 新会话</button></div></div>
    <div class="focus-layout">${renderObjectStage()}${renderConversationPanel({ focus: true })}</div>
  </section>`;
}

function statusDetails() {
  if (state.demoStatus === "working") return { title: "正在执行", detail: state.currentWork, icon: "◌", progress: state.progress, state: "working" };
  if (state.demoStatus === "waiting") return { title: "等待你补充", detail: "“新建一条家务 Task”还缺少归属清单；目前只是一条建议。", icon: "?", progress: null, state: "waiting" };
  if (state.demoStatus === "queued") return { title: "排队中", detail: `同一 Vault 的工作仍在运行；${state.queuedSessionIds.length} 个会话等待重新读取后继续。`, icon: "Ⅱ", progress: null, state: "queued" };
  if (state.demoStatus === "partial") return { title: "部分完成", detail: "Task 改期已保存；晚间复盘写入失败，尚未写入。", icon: "!", progress: null, state: "partial" };
  if (state.demoStatus === "interrupted") return { title: "已中断", detail: "1 项修改已保存；余下步骤已停止，可核对后继续。", icon: "■", progress: null, state: "interrupted" };
  return { title: "已保存", detail: state.operationResult?.text ?? "早间计划已保存到 Daily Record；没有修改实际 Tasks。", icon: "✓", progress: null, state: "saved" };
}

function renderDemoMenu() {
  return `<div class="state-menu" ${state.demoMenuOpen ? "" : "hidden"}>${statusOptions.map(([key, title, description]) => `<button data-set-status="${key}"><strong>${title}</strong><small>${description}</small></button>`).join("")}</div>`;
}

function renderRunnerStrip() {
  const status = statusDetails();
  const statusPill = `<span class="state-pill" data-state="${status.state}">${status.title}</span>`;
  const progress = status.progress !== null ? `<div class="runner-progress">阶段 2/3 · 读取最新记录并整理变更</div><div class="runner-progress-track"><div class="runner-progress-fill" style="width:${status.progress}%"></div></div>` : "";
  let buttons = "";
  if (state.demoStatus === "working") buttons = `<button class="small-button" data-action="stop-work">停止当前工作</button>`;
  if (state.demoStatus === "waiting") buttons = `<button class="small-button" data-action="confirm-wait">确认放入 Inbox</button><button class="small-button" data-action="discuss-suggestion">先讨论</button>`;
  if (state.demoStatus === "queued") buttons = `<button class="small-button" data-action="browse-running-session">查看正在运行的会话</button><button class="small-button" data-action="stop-and-switch">停止并切换</button>`;
  if (state.demoStatus === "partial") buttons = `<button class="small-button" data-action="retry-failed">只重试复盘写入</button>`;
  if (state.demoStatus === "interrupted") buttons = `<button class="small-button" data-action="resume-work">核对后继续</button>`;
  if (state.demoStatus === "saved") buttons = `<button class="small-button" data-action="open-result">查看已保存结果</button>`;
  return `<div class="runner-card"><span class="runner-indicator" data-state="${status.state}">${status.icon}</span><div class="runner-main"><div class="runner-titleline">${statusPill}<span class="runner-detail">${esc(status.detail)}</span></div>${progress}${state.demoStatus === "partial" ? `<div class="runner-warning">✓ Task 日期已改为 15:30　·　! Daily Record 复盘还未保存</div>` : ""}${state.demoStatus === "interrupted" ? `<div class="runner-progress">已完成结果保留；继续前会再次核对当前版本。</div>` : ""}</div><div class="runner-buttons">${buttons}</div><div class="runner-demo"><button class="secondary-button small-button" data-action="toggle-demo-menu" aria-expanded="${state.demoMenuOpen}">演示状态 ▾</button>${renderDemoMenu()}</div></div>`;
}

function renderCurrentVariant() {
  if (state.variant === "B") return renderVariantB();
  if (state.variant === "C") return renderVariantC();
  return renderVariantA();
}

function renderAll() {
  document.body.dataset.variant = state.variant;
  document.querySelector("#runner-strip").innerHTML = renderRunnerStrip();
  document.querySelector("#workspace").innerHTML = renderCurrentVariant();
  const current = variants.find((variant) => variant.key === state.variant);
  document.querySelector("#variant-label").textContent = `${current.key} · ${current.name}`;
  renderOverlay();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function setStatus(status) {
  if (status === "partial") {
    const task = taskById("task-184");
    if (task && !task.deleted) task.time = "15:30";
    state.operationResult = { id: "task-184", text: "Task 日期与时间已保存为 9月26日 15:30" };
    selectedReview().saved = false;
  }
  if (status === "queued") {
    state.workingSessionId = "session-week";
    state.queuedSessionIds = [state.activeSessionId === state.workingSessionId ? "session-morning" : state.activeSessionId];
    state.currentWork = "本会话排队等待另一项 Vault 工作完成";
  }
  if (status === "working") { state.workingSessionId = state.activeSessionId || "session-morning"; state.queuedSessionIds = []; }
  if (status === "interrupted") state.currentWork = "已停止；之前成功保存的结果仍然保留";
  state.demoStatus = status;
  state.demoMenuOpen = false;
  renderAll();
}

function addActivity(kind, title, summary, date = state.selectedDate) {
  const time = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  state.activity.push({ date, time, kind, title, summary, dynamic: true });
}

function currentClock() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function addAssistantMessage(text, { tag = "已保存", receipt = "", detail = "", progress = "" } = {}, sessionId = state.activeSessionId, activityDate = state.selectedDate) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  session.messages.push({ who: "agent", text, time: currentClock(), tag, receipt, detail, progress });
  if (!session.activityDates.includes(activityDate)) session.activityDates.push(activityDate);
  session.lastAt = currentClock();
}

function settleProgressMessage(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  const pending = session?.messages?.slice().reverse().find((message) => message.tag === "正在执行");
  if (pending) { pending.tag = "已保存"; pending.progress = ""; }
}

function selectDate(date) {
  if (!dateOptions.some((item) => item.date === date)) return;
  state.selectedDate = date;
  activeSessionForDate(date);
  state.demoMenuOpen = false;
  renderAll();
}

function openContext(kind, taskId = "") {
  if (kind === "task") {
    const task = taskById(taskId) ?? state.tasks[0];
    state.context = { kind: "task", label: `Task · ${task?.name ?? "选定任务"}`, id: task?.id ?? "" };
    state.activeArtifact = "tasks";
    state.currentWork = "读取所选 Task 的当前状态与清单归属";
  } else {
    state.context = { kind: "today", label: `Today · ${dateLabel(state.selectedDate)}`, id: state.selectedDate };
    state.activeArtifact = "plan";
    state.currentWork = "读取当天 Daily Record、早间基准和当前安排";
  }
  if (!activeSession()) createSession(false);
  renderAll();
  setTimeout(() => document.querySelector("[data-compose]")?.focus(), 0);
}

function createSession(render = true) {
  const id = `session-${Date.now()}`;
  const session = { id, title: "新协作会话", createdAt: state.selectedDate, lastAt: "刚刚", activityDates: [state.selectedDate], kind: "general", messages: [{ who: "agent", text: `新会话已就绪。我会先读取 ${dateLabel(state.selectedDate)} 的最新状态，再根据你的明确要求开始工作。`, time: "刚刚", tag: "等待输入" }] };
  state.sessions.unshift(session);
  state.activeSessionId = id;
  state.activeArtifact = "plan";
  if (render) renderAll();
  return session;
}

function updateTask(id, mutate, resultText) {
  const task = taskById(id);
  if (!task) return;
  mutate(task);
  state.operationResult = { id, text: resultText };
  state.demoStatus = "saved";
  state.currentWork = resultText;
  addActivity("task", `Task 已保存 · ${task.name}`, resultText);
  addAssistantMessage(`已更新“${task.name}”。Tasks、Today 与 Calendar 会读取这同一条任务记录。`, { receipt: `${resultText} · Task ${task.id}` });
  renderAll();
  showToast(`已保存到 Task ${task.id}；其它页面读取同一条记录。`);
}

function generatePlan() {
  const operationDate = state.selectedDate;
  const operationSessionId = state.activeSessionId;
  const targetLabel = dateLabel(operationDate);
  const plan = planForDate(operationDate);
  state.demoStatus = "working";
  state.workingSessionId = operationSessionId;
  state.queuedSessionIds = [];
  state.demoMenuOpen = false;
  state.currentWork = "重新读取今天 Daily Record 和 Tasks，再整理剩余安排";
  state.progress = 24;
  state.activeArtifact = "plan";
  addAssistantMessage("我会先核对最新状态，再整理剩余时段。这个操作只更新计划，不会替你新增或改动实际 Tasks。", { tag: "正在执行", progress: "读取最新 Daily Record 与 Tasks" }, operationSessionId, operationDate);
  renderAll();
  setTimeout(() => { state.progress = 78; state.currentWork = "保留固定安排与休息缓冲，生成一版可调整的计划"; renderAll(); }, 520);
  setTimeout(() => {
    plan.saved = true;
    plan.updatedAt = currentClock();
    plan.items[0] = { time: "09:15", title: "先核对续保，再整理租约文件", text: "两项已有安排保留为原任务；午餐前预留切换时间。" };
    if (plan.items[2]) plan.items[2] = { time: "15:30", title: "弹性处理窗口", text: "如果续保比较仍需时间，可在此继续；未确认的家务仍只是选项。" };
    plan.basis = "刚刚重新读取当前状态；两项现有 Task 保持原样。计划较晚生成时没有虚构已过去的事实。";
    state.progress = 100;
    state.currentWork = "已保存新的 Current arrangement；Tasks 保持不变";
    state.operationResult = { id: "plan", text: `计划已更新 · ${plan.updatedAt}` };
    addActivity("morning", "当前安排已重新整理", "Daily Record 已保存更新；原 Task 状态与日期保持不变。", operationDate);
    settleProgressMessage(operationSessionId);
    addAssistantMessage("已按剩余时间整理并保存当前安排。早间基准保留原样；Tasks 没有变化。", { receipt: `Daily Record · ${targetLabel} · 今天的大致安排更新于 ${plan.updatedAt}`, detail: "读取：Daily Record、Task revision\n写入：Current arrangement\n未写入：Task / Habit\n结果：已重新读取以确认保存" }, operationSessionId, operationDate);
    state.demoStatus = "saved";
    renderAll();
    showToast("当前安排已保存到 Daily Record，Task 正本没有改变。");
  }, 1100);
}

function startEveningReview() {
  const operationDate = state.selectedDate;
  const operationSessionId = state.activeSessionId;
  const targetLabel = dateLabel(operationDate);
  const review = reviewForDate(operationDate);
  state.demoStatus = "working";
  state.workingSessionId = operationSessionId;
  state.queuedSessionIds = [];
  state.activeArtifact = "review";
  state.currentWork = "读取当天已完成 Tasks 与 Daily Record 里的事实";
  state.progress = 30;
  renderAll();
  showToast("正在准备复盘草稿；未观察到的活动会保持未知。" );
  setTimeout(() => {
    review.saved = true;
    review.text = `${targetLabel}：先整理已确认的安排。没有明确完成记录的事项仍保持未知；其它未记下来的活动暂不推断。`;
    state.progress = 100;
    state.currentWork = "晚间复盘草稿已保存到当天 Daily Record";
    addActivity("review", "晚间复盘已保存", "以可确认的 Task 与 Daily Record 事实为依据；未知活动没有补写。", operationDate);
    addAssistantMessage(review.text, { tag: "已保存", receipt: `Daily Record · ${targetLabel} · 晚间复盘。未记录活动保持未知。` }, operationSessionId, operationDate);
    state.demoStatus = "saved";
    renderAll();
    showToast("晚间复盘已保存。你可以继续补充或纠正。" );
  }, 850);
}

function addTask() {
  const task = { id: `task-${300 + state.tasks.length}`, name: "确认厨房收纳盒尺寸", date: state.selectedDate, time: null, list: "Inbox", status: "pending", deleted: false };
  state.tasks.unshift(task);
  state.operationResult = { id: task.id, text: "新建 Task 已保存到 Inbox" };
  state.activeArtifact = "tasks";
  state.demoStatus = "saved";
  addActivity("task", `新建 Task · ${task.name}`, "明确选择后写入 Inbox；此 Task 与 Tasks / Today / Calendar 共用身份。" );
  addAssistantMessage(`新 Task“${task.name}”已按你的选择写入 Inbox。`, { receipt: `Task ${task.id} · Inbox · ${dateLabel(state.selectedDate)}` });
  renderAll();
  showToast("Task 已加入 Inbox；各页面共用同一记录。" );
}

function submitMessage(form) {
  const input = form.querySelector("[data-compose]");
  const text = input?.value.trim();
  if (!text) return;
  state.composerDraft = "";
  let session = activeSession();
  if (!session) session = createSession(false);
  const operationSessionId = session.id;
  const operationDate = state.selectedDate;
  session.messages.push({ who: "user", text, time: currentClock(), context: state.context?.label ?? "" });
  if (!session.activityDates.includes(operationDate)) session.activityDates.push(operationDate);
  session.lastAt = currentClock();
  state.context = null;
  state.voiceDemo = false;

  const isCurrentWorker = operationSessionId === state.workingSessionId;
  const currentWorkActive = state.demoStatus === "working" || state.demoStatus === "queued";
  if (currentWorkActive && !isCurrentWorker) {
    if (!state.queuedSessionIds.includes(operationSessionId)) state.queuedSessionIds.push(operationSessionId);
    state.demoStatus = "queued";
    state.currentWork = "本会话已加入队列；当前工作结束后会重新读取相关记录再继续";
    addAssistantMessage("已收到这条补充。本会话排队等待当前工作完成；现在不会启动并行工作，也没有写入业务记录。", { tag: "排队中", receipt: "已保留在会话；开始前会重新读取最新状态" }, operationSessionId, operationDate);
    addActivity("session", "会话已加入工作队列", "补充内容已保留；等待当前 Vault 工作完成。", operationDate);
    renderAll();
    showToast("已加入队列；当前工作完成前不会并行启动。" );
    return;
  }
  if (currentWorkActive && isCurrentWorker) {
    addAssistantMessage("收到这条补充；会并入当前会话正在进行的核对。", { tag: "已加入当前工作", receipt: "仍在同一会话中继续；没有启动第二项工作" }, operationSessionId, operationDate);
    renderAll();
    showToast("补充已并入当前工作。" );
    return;
  }

  state.demoStatus = "working";
  state.workingSessionId = operationSessionId;
  state.queuedSessionIds = [];
  state.currentWork = "已收到补充；开始前重新核对相关记录和版本";
  state.progress = 20;
  addActivity("session", "会话收到新补充", text, operationDate);
  renderAll();
  setTimeout(() => {
    addAssistantMessage("收到。我会以这条补充和最新的业务记录为准继续处理；任何实际改动都会单独显示保存结果。", { tag: "处理中", detail: "示意步骤：\n1. 核对当前对象\n2. 根据明确意图决定操作或继续讨论\n3. 保存后重新读取以确认" }, operationSessionId, operationDate);
    state.progress = 68;
    state.currentWork = "正在核对关联对象并准备下一步";
    renderAll();
  }, 600);
}

function editMemory(id) {
  state.memoryEditing = id;
  renderAll();
  setTimeout(() => document.querySelector("[data-memory-input]")?.focus(), 0);
}

function saveMemory(form) {
  const id = form.dataset.memoryId;
  const item = state.longMemory.find((entry) => entry.id === id);
  const value = form.querySelector("[data-memory-input]")?.value.trim();
  if (!item || !value) return;
  const previous = item.text;
  item.text = value;
  item.status = "confirmed";
  item.source = "用户核实并修正 · 刚刚";
  state.memoryHistory.unshift({ title: item.title, before: previous, after: value, when: currentClock() });
  state.memoryEditing = null;
  renderAll();
  showToast("长期背景已按你的修正更新；原始会话仍可回查。" );
}

function settingsContent() {
  const connection = state.simulatedConnected ? "已连接（模拟状态）" : "尚未连接（演示）";
  return `<section class="modal-section"><h3>Codex 连接</h3><p>设计为本地 Codex App Server 与 ChatGPT 登录。这里不会连接账号或执行真实工作。</p><div class="connection-card"><span class="connection-icon">C</span><div class="connection-copy"><strong>${connection}</strong><small>${state.simulatedConnected ? "仅用于预览连接后的界面状态" : "尚未验证运行版本、发现方式或实际能力"}</small></div><button class="secondary-button small-button" data-action="simulate-connect">${state.simulatedConnected ? "重置演示" : "预览连接状态"}</button></div><div class="setting-row"><div class="setting-copy"><strong>模型偏好</strong><small>可用模型由本地 Codex 提供；此选择为界面示意。</small></div><div class="setting-control"><select data-model-select aria-label="模型偏好"><option ${state.modelPreference === "自动选择" ? "selected" : ""}>自动选择</option><option ${state.modelPreference === "快速" ? "selected" : ""}>快速</option><option ${state.modelPreference === "深度推理" ? "selected" : ""}>深度推理</option></select></div></div><div class="prototype-disclaimer">模型选项仅示意偏好入口。不会在本原型中承诺某个具体型号可用。</div></section>
  <section class="modal-section"><h3>自动早间计划</h3><p>只在 Personal Dashboard 运行时触发；错过设定时间后，当天打开 App 时补生成。已有计划不会覆盖。</p><div class="setting-row"><div class="setting-copy"><strong>启用自动生成</strong><small>${state.autoPlan ? "开启后在设定时间排队生成，只写计划，不修改实际 Tasks。" : "关闭后不自动生成。"}</small></div><div class="setting-control"><button class="switch" role="switch" aria-checked="${state.autoPlan}" data-action="toggle-auto-plan" aria-label="启用自动早间计划"></button></div></div><div class="setting-row"><div class="setting-copy"><strong>生成时间</strong><small>按所选 Vault 的本地生活日期。</small></div><div class="setting-control"><input type="time" value="${esc(state.autoPlanTime)}" data-auto-time ${state.autoPlan ? "" : "disabled"} aria-label="自动计划时间" /></div></div><div class="prototype-disclaimer">App 完全退出后不会后台无人值守。若已有计划，重复触发不会覆盖。</div></section>
  <section class="modal-section"><h3>工作范围</h3><div class="setting-row"><div class="setting-copy"><strong>同一 Vault 同时最多一项 Agent 工作</strong><small>其他会话可以浏览、准备输入或排队；开始前重新读取当前状态。</small></div><span class="state-pill" data-state="saved">串行</span></div><div class="setting-row"><div class="setting-copy"><strong>日常数据工具</strong><small>任务、习惯与 Daily Record 复用现有业务服务；一个主 Skill 负责流程。</small></div><span class="mini-pill">本地优先</span></div></section>`;
}

function memoryContent() {
  const items = state.longMemory.map((item) => {
    const editing = state.memoryEditing === item.id;
    const status = item.status === "verify" ? `<span class="mini-pill" style="color:#907442;background:#faf3e5">待你核实</span>` : `<span class="mini-pill">长期背景</span>`;
    const actions = item.status === "verify" ? `<button class="small-button" data-action="confirm-memory" data-memory-id="${item.id}">确认是长期偏好</button><button class="small-button" data-action="temporary-memory" data-memory-id="${item.id}">仅保留在近期</button>` : `<button class="link-button" data-memory-edit="${item.id}">查看 / 修正</button>`;
    const editor = editing ? `<form class="memory-edit" data-memory-form data-memory-id="${item.id}"><textarea data-memory-input aria-label="修正长期背景">${esc(item.text)}</textarea><div class="memory-edit-actions"><small>明确的长期变化可更新；Agent 推断需先核实。</small><button class="primary-button small-button" type="submit">保存修正</button></div></form>` : "";
    return `<div class="memory-item"><div class="memory-item-head"><strong>${esc(item.title)}</strong>${status}</div><p>${esc(item.text)}</p><div class="memory-item-head" style="margin:6px 0 0"><small style="color:#8b928d;font-size:7px">${esc(item.source)}</small><span>${actions}</span></div>${editor}</div>`;
  }).join("");
  return `<section class="modal-section"><h3>长期个人背景</h3><p>稳定偏好供后续会话参考；用户明确变化可更新，Agent 推断先核实。</p>${items}${state.memoryHistory.length ? `<div class="memory-history"><strong>最近修改</strong>${state.memoryHistory.slice(0, 3).map((item) => `<div style="margin-top:5px">${esc(item.title)} · ${esc(item.when)}<br />之前：${esc(item.before)}<br />现在：${esc(item.after)}</div>`).join("")}</div>` : ""}</section>
  <section class="modal-section"><h3>近期衔接记忆</h3><p>自动整理的近期情况与未结束事项，便于换会话继续；不替代 Tasks 或 Daily Record。</p><div class="memory-item"><div class="memory-item-head"><strong>最近情况</strong><span class="mini-pill">近期 · 自动维护</span></div><p>${esc(state.recentMemory)}</p><div class="memory-item-head" style="margin:7px 0 0"><small style="color:#8b928d;font-size:7px">合成摘要 · 可纠正</small><button class="link-button" data-action="edit-recent-memory">修正近期摘要</button></div>${state.memoryEditing === "recent" ? `<form class="memory-edit" data-recent-memory-form><textarea data-recent-input aria-label="修正近期衔接摘要">${esc(state.recentMemory)}</textarea><div class="memory-edit-actions"><small>近期摘要不是任务状态的权威来源。</small><button class="primary-button small-button" type="submit">保存修正</button></div></form>` : ""}</div></section>
  <section class="modal-section"><h3>原始会话与 Daily Record</h3><p>摘要遗漏时仍可回查来源。以下均为原型内合成记录。</p>${state.sessions.slice(0, 4).map((session) => `<div class="history-entry"><div><strong>${esc(session.title)}</strong><small>${esc(shortDate(session.createdAt))} 创建 · ${session.activityDates.map(shortDate).join("、")} 活动</small></div><button class="link-button" data-open-history-session="${session.id}">打开会话</button></div>`).join("")}<div class="history-entry"><div><strong>Daily Record · ${esc(dateLabel(state.selectedDate))}</strong><small>早间基准、今天的大致安排、白天更新、晚间复盘</small></div><button class="link-button" data-linked-view="today">查看 Today</button></div></section>`;
}

function linkedContent() {
  const selected = state.previewDestination;
  const title = selected === "today" ? "今天" : selected === "tasks" ? "任务" : selected === "calendar" ? "日历" : "习惯";
  const tabs = ["today", "tasks", "calendar", "habits"].map((item) => `<button class="artifact-tab" data-preview-view="${item}" aria-pressed="${selected === item}">${item === "today" ? "Today" : item === "tasks" ? "Tasks" : item === "calendar" ? "Calendar" : "Habits"}</button>`).join("");
  let body = "";
  if (selected === "tasks" || selected === "today" || selected === "calendar") {
    body = `<section class="modal-section"><h3>${selected === "tasks" ? "Tasks 清单" : selected === "today" ? "Today · 共享任务" : "Calendar · 当前日期"}</h3><p>演示页面从同一内存 Task 数组读取；下方 Task ID 与协作工作区一致。</p><div class="shared-preview-list">${visibleTasks().map((task) => `<div class="share-preview-task"><span class="task-check ${task.status === "completed" ? "is-checked" : ""}">${task.status === "completed" ? "✓" : ""}</span><div class="task-main"><span class="task-name">${esc(task.name)}</span><div class="task-meta"><span>${esc(task.list)} · ${esc(formatTaskDate(task))}</span><span class="source-pill">${esc(task.id)}</span></div></div><span class="preview-location">${task.status === "completed" ? "已完成" : "待办"}</span></div>`).join("")}</div></section>`;
    if (selected === "today") body += `<section class="modal-section"><h3>Daily Record · ${esc(dateLabel(state.selectedDate))}</h3><p>今天的大致安排：${esc(selectedPlan().items.map((item) => `${item.time} ${item.title}`).join(" · "))}</p>${state.recordCorrection?.date === state.selectedDate ? `<div class="memory-history"><strong>已更正 · ${esc(shortDate(state.recordCorrection.date))}</strong><br />之前：${esc(state.recordCorrection.old)}<br />现在：${esc(state.recordCorrection.current)}<br />修正时间：${esc(state.recordCorrection.time)}</div>` : `<div class="prototype-disclaimer">计划和事实分开保存；这里查看同一条 Daily Record。历史事实有误时可针对目标日期明确更正。</div>`}<button class="secondary-button small-button" data-action="correct-record">更正此日期的备注（演示）</button></section>`;
  } else {
    body = `<section class="modal-section"><h3>本周习惯 · 本地记录</h3><p>可明确补记、撤回或更正历史本地完成。没有记录不等于未完成。</p>${state.habits.map((habit) => `<div class="history-entry"><div><strong>${esc(habit.name)}</strong><small>${esc(dateLabel(habit.date))} · ${esc(habit.source)}</small></div><span style="display:flex;align-items:center;gap:6px"><span class="${habit.complete ? "state-pill" : "mini-pill"}" ${habit.complete ? `data-state="saved"` : ""}>${habit.complete ? "已完成" : "未知"}</span><button class="small-button" data-action="habit-toggle" data-habit-id="${habit.id}">${habit.complete ? "撤回" : "补记"}</button></span></div>`).join("")}<div class="prototype-disclaimer">历史日期修正只变更明确选中的本地记录，不会写回外部来源。</div><button class="link-button" data-action="context-today">从 Today 带入协作 ↗</button></section>`;
  }
  return `<div class="modal-tabs">${tabs}</div>${body}`;
}

function renderOverlay() {
  const root = document.querySelector("#overlay-root");
  if (!state.modal) { root.innerHTML = ""; return; }
  let title = "", subtitle = "", content = "";
  if (state.modal === "settings") {
    title = "协作设置";
    subtitle = "连接、模型和自动早间计划的交互示意。";
    content = settingsContent();
  } else if (state.modal === "memory") {
    title = "协作记忆";
    subtitle = "长期背景、近期衔接摘要与原始记录来源。";
    content = memoryContent();
  } else if (state.modal === "linked") {
    title = `${state.previewDestination === "today" ? "Today" : state.previewDestination === "tasks" ? "Tasks" : state.previewDestination === "calendar" ? "Calendar" : "Habits"} · 联动预览`;
    subtitle = "原型演示同一业务对象如何出现在现有页面；没有真实写入。";
    content = linkedContent();
  }
  root.innerHTML = `<div class="overlay-backdrop"><aside class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-panel><header class="modal-heading"><div><h2 id="modal-title">${title}</h2><p>${subtitle}</p></div><button class="icon-button" data-action="close-modal" aria-label="关闭">×</button></header><div class="modal-body">${content}</div></aside></div>`;
}

function openModal(name, destination) {
  state.modal = name;
  if (destination) state.previewDestination = destination;
  state.demoMenuOpen = false;
  renderAll();
}

document.addEventListener("click", (event) => {
  const switchButton = event.target.closest("[data-switch]");
  if (switchButton) { nextVariant(switchButton.dataset.switch === "next" ? 1 : -1); return; }

  const dateButton = event.target.closest("[data-select-date]");
  if (dateButton) { selectDate(dateButton.dataset.selectDate); return; }

  const openSessionButton = event.target.closest("[data-open-session]");
  if (openSessionButton) {
    state.activeSessionId = openSessionButton.dataset.openSession;
    state.demoMenuOpen = false;
    renderAll();
    return;
  }

  const openHistorySession = event.target.closest("[data-open-history-session]");
  if (openHistorySession) {
    const session = state.sessions.find((item) => item.id === openHistorySession.dataset.openHistorySession);
    if (session) { state.selectedDate = session.activityDates[session.activityDates.length - 1]; state.activeSessionId = session.id; }
    state.modal = null;
    renderAll();
    return;
  }

  const preview = event.target.closest("[data-nav-preview]");
  if (preview) { openModal("linked", preview.dataset.navPreview); return; }

  const linked = event.target.closest("[data-linked-view]");
  if (linked) { openModal("linked", linked.dataset.linkedView); return; }

  const artifact = event.target.closest("[data-artifact]");
  if (artifact) { state.activeArtifact = artifact.dataset.artifact; renderAll(); return; }

  const setStatusButton = event.target.closest("[data-set-status]");
  if (setStatusButton) { setStatus(setStatusButton.dataset.setStatus); return; }

  const previewView = event.target.closest("[data-preview-view]");
  if (previewView) { state.previewDestination = previewView.dataset.previewView; renderAll(); return; }

  const memoryEdit = event.target.closest("[data-memory-edit]");
  if (memoryEdit) { editMemory(memoryEdit.dataset.memoryEdit); return; }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    if (event.target.classList.contains("overlay-backdrop")) { state.modal = null; renderAll(); }
    return;
  }
  const action = actionButton.dataset.action;
  if (action === "settings") openModal("settings");
  else if (action === "memory") openModal("memory");
  else if (action === "close-modal" || action === "overlay-close") { state.modal = null; renderAll(); }
  else if (action === "toggle-demo-menu") { state.demoMenuOpen = !state.demoMenuOpen; renderAll(); }
  else if (action === "new-session") { state.modal = null; createSession(); showToast("新会话已创建；当前日期的会话仍可从列表切换。" ); }
  else if (action === "toggle-session-menu") {
    const menu = document.querySelector("[data-focus-session-menu]");
    if (menu) { menu.hidden = !menu.hidden; actionButton.setAttribute("aria-expanded", String(!menu.hidden)); }
  }
  else if (action === "context-today") openContext("today");
  else if (action === "context-task") openContext("task", actionButton.dataset.taskId);
  else if (action === "remove-context") { state.context = null; renderAll(); }
  else if (action === "voice") {
    state.composerDraft = "我下午的安排有变化，请先保留早间基准，重新整理剩余时间。";
    state.voiceDemo = true;
    renderAll();
    document.querySelector("[data-compose]")?.focus();
  }
  else if (action === "generate-plan") generatePlan();
  else if (action === "start-evening") startEveningReview();
  else if (action === "edit-review") {
    selectedReview().saved = false;
    state.activeArtifact = "review";
    state.demoStatus = "waiting";
    renderAll();
    showToast("复盘可补充；请在对话中说明要纠正的事实。" );
  }
  else if (action === "task-reschedule") updateTask(actionButton.dataset.taskId, (task) => { task.date = state.selectedDate; task.time = "15:30"; }, `日期 / 时间已改为 ${dateLabel(state.selectedDate)} 15:30`);
  else if (action === "task-toggle") {
    const task = taskById(actionButton.dataset.taskId);
    updateTask(actionButton.dataset.taskId, (current) => { current.status = current.status === "completed" ? "pending" : "completed"; }, task?.status === "completed" ? "任务已重新打开" : "任务已标记完成" );
  }
  else if (action === "task-delete") updateTask(actionButton.dataset.taskId, (task) => { task.deleted = true; }, "任务已删除并可恢复");
  else if (action === "task-restore") updateTask(actionButton.dataset.taskId, (task) => { task.deleted = false; }, "任务已恢复到原清单");
  else if (action === "task-add") addTask();
  else if (action === "accept-suggestion" && actionButton.dataset.suggestionMode === "note") { addAssistantMessage("这条比较建议已保留在会话里，等待你明确下一步。", { tag: "建议 · 未执行", receipt: "会话建议已保留；Task 与 Daily Record 均未修改" }); renderAll(); showToast("建议只留在会话中，没有改动 Task 或 Daily Record。" ); }
  else if (action === "accept-suggestion") { selectedPlan().saved = true; selectedPlan().updatedAt = currentClock(); state.demoStatus = "saved"; state.operationResult = { id: "plan", text: "用户选择后保存计划建议" }; addAssistantMessage("已按你的选择保存这版计划。没有把其中的选项自动变成 Task。", { receipt: `Daily Record · ${dateLabel(state.selectedDate)} · 当前安排已保存` }); renderAll(); showToast("已保存计划；实际 Tasks 未被自动改动。" ); }
  else if (action === "discuss-suggestion") { state.demoStatus = "waiting"; state.activeArtifact = "plan"; renderAll(); showToast("建议保持未执行。你可以继续讨论或补充信息。" ); }
  else if (action === "stop-work") { state.demoStatus = "interrupted"; state.currentWork = "已停止；此前已保存的结果仍保留"; renderAll(); showToast("工作已中断；已保存的对象保持不变。" ); }
  else if (action === "resume-work") { state.workingSessionId = state.activeSessionId; state.queuedSessionIds = state.queuedSessionIds.filter((id) => id !== state.activeSessionId); state.demoStatus = state.queuedSessionIds.length ? "queued" : "working"; state.progress = 34; state.currentWork = "已重新读取对象版本，准备从未完成步骤继续"; renderAll(); showToast("已从核对后的未完成步骤继续。" ); }
  else if (action === "confirm-wait") { const task = { id: "task-312", name: "整理厨房台面", date: state.selectedDate, time: null, list: "Inbox", status: "pending", deleted: false }; state.tasks.unshift(task); state.demoStatus = "saved"; state.operationResult = { id: task.id, text: "用户确认后写入 Inbox" }; addActivity("task", "新增 Task · 整理厨房台面", "用户确认清单归属后写入 Inbox。" ); addAssistantMessage("已按你的选择将“整理厨房台面”加入 Inbox。", { receipt: `Task ${task.id} · Inbox` }); renderAll(); showToast("已写入 Inbox；这是明确选择后的 Task。" ); }
  else if (action === "retry-failed") { const operationDate = state.selectedDate; const operationSessionId = state.activeSessionId; const targetLabel = dateLabel(operationDate); const review = reviewForDate(operationDate); state.demoStatus = "working"; state.currentWork = "只重试尚未保存的 Daily Record 复盘条目"; state.progress = 41; renderAll(); setTimeout(() => { review.saved = true; review.text = "Task 改期已确认；晚间复盘草稿记录这项变更并保留未观察活动为未知。"; state.demoStatus = "saved"; state.operationResult = { id: "review", text: "复盘已重试并保存" }; addActivity("review", "复盘重试成功", "Task 修改没有重复执行；只保存未完成的 Daily Record 条目。", operationDate); addAssistantMessage("复盘条目已单独重试并保存；Task 改期没有重复执行。", { receipt: `Daily Record · ${targetLabel} · 晚间复盘` }, operationSessionId, operationDate); renderAll(); showToast("只重试了失败的复盘写入，没有重复改 Task。" ); }, 850); }
  else if (action === "browse-running-session") { state.activeSessionId = state.workingSessionId; state.demoStatus = state.queuedSessionIds.length ? "queued" : "working"; state.currentWork = "正在运行的会话已重新读取状态"; renderAll(); }
  else if (action === "stop-and-switch") { const queued = state.queuedSessionIds[0]; if (queued) state.activeSessionId = queued; state.demoStatus = "interrupted"; state.currentWork = "已停止此前工作并切换到排队会话；核对后可继续"; renderAll(); showToast("此前工作已停止；可核对排队会话后选择继续。" ); }
  else if (action === "open-result") { state.activeArtifact = state.operationResult?.id === "review" ? "review" : state.operationResult?.id?.startsWith("task") ? "tasks" : "plan"; renderAll(); }
  else if (action === "simulate-connect") { state.simulatedConnected = !state.simulatedConnected; renderAll(); }
  else if (action === "toggle-auto-plan") { state.autoPlan = !state.autoPlan; renderAll(); }
  else if (action === "confirm-memory" || action === "temporary-memory") {
    const item = state.longMemory.find((entry) => entry.id === actionButton.dataset.memoryId);
    if (item) { if (action === "confirm-memory") { item.status = "confirmed"; item.source = "用户核实 · 刚刚"; } else { state.recentMemory = `${state.recentMemory} 晚间精力判断目前仅作近期情况，尚无长期结论。`; state.longMemory = state.longMemory.filter((entry) => entry.id !== item.id); } }
    renderAll();
    showToast(action === "confirm-memory" ? "已按你的确认更新长期背景。" : "未核实推断已移出长期背景，保留在近期衔接中。" );
  }
  else if (action === "edit-recent-memory") { state.memoryEditing = "recent"; renderAll(); }
  else if (action === "focus-composer") { const input = document.querySelector("[data-compose]"); input?.focus(); input?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  else if (action === "habit-toggle") {
    const habit = state.habits.find((item) => item.id === actionButton.dataset.habitId);
    if (habit) { habit.complete = !habit.complete; habit.source = "本地完成记录 · 刚刚修正"; state.demoStatus = "saved"; renderAll(); showToast(`${habit.name} 的 ${shortDate(habit.date)} 本地记录已${habit.complete ? "补记" : "撤回"}。`); }
  }
  else if (action === "correct-record") {
    state.recordCorrection = { date: state.selectedDate, old: "下午安排尚未确认。", current: "补充：14:00 为已确认安排。", time: currentClock() };
    state.demoStatus = "saved";
    addActivity("review", "历史记录已更正", `Daily Record · ${shortDate(state.selectedDate)} · 已保留更正痕迹。`);
    renderAll();
    showToast("历史备注已更正；修正来源和时间保留在本地记录中。" );
  }
});

document.addEventListener("change", (event) => {
  const dateSelect = event.target.closest("[data-date-select]");
  if (dateSelect) { selectDate(dateSelect.value); return; }
  const autoTime = event.target.closest("[data-auto-time]");
  if (autoTime) { state.autoPlanTime = autoTime.value; showToast(`自动计划时间设为 ${state.autoPlanTime}（演示状态）`); return; }
  const modelSelect = event.target.closest("[data-model-select]");
  if (modelSelect) { state.modelPreference = modelSelect.value; showToast(`模型偏好已选择：${state.modelPreference}（界面示意）`); }
});

document.addEventListener("input", (event) => {
  const composer = event.target.closest("[data-compose]");
  if (composer) state.composerDraft = composer.value;
});

document.addEventListener("submit", (event) => {
  const composer = event.target.closest("[data-composer]");
  if (composer) { event.preventDefault(); submitMessage(composer); return; }
  const memoryForm = event.target.closest("[data-memory-form]");
  if (memoryForm) { event.preventDefault(); saveMemory(memoryForm); return; }
  const recentForm = event.target.closest("[data-recent-memory-form]");
  if (recentForm) { event.preventDefault(); state.recentMemory = recentForm.querySelector("[data-recent-input]").value.trim(); state.memoryEditing = null; renderAll(); showToast("近期衔接摘要已修正。" ); }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modal) { state.modal = null; renderAll(); return; }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches("input, textarea, select, [contenteditable='true']") || target.closest("[contenteditable='true']"))) return;
  nextVariant(event.key === "ArrowRight" ? 1 : -1);
});

window.addEventListener("popstate", () => { state.variant = readVariant(); renderAll(); });

renderAll();
