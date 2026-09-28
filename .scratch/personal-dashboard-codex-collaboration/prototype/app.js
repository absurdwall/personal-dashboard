const variants = [
  { key: "A", name: "会话列表 + 对话 + 当前对象" },
  { key: "B", name: "日期活动流 + 原有记录" },
  { key: "C", name: "当前对象优先 + 对话" },
];

const dates = [
  { value: "2026-09-26", label: "今天 · 9月26日" },
  { value: "2026-09-25", label: "昨天 · 9月25日" },
  { value: "2026-09-24", label: "周四 · 9月24日" },
  { value: "2026-09-22", label: "周二 · 9月22日" },
];

const statusOptions = [
  ["ready", "待命", "没有工作在运行"],
  ["working", "正在执行", "显示当前工作与停止入口"],
  ["waiting", "等待你补充", "有歧义的建议先不写入"],
  ["queued", "排队中", "其他会话可浏览和准备输入"],
  ["partial", "部分完成", "逐项展示已保存和失败结果"],
  ["interrupted", "已中断", "核对后再继续未完成部分"],
  ["saved", "已保存", "结果回到原有数据页面"],
];

const state = {
  variant: readVariant(),
  selectedDate: "2026-09-26",
  activeSessionId: "session-morning",
  workerSessionId: null,
  queuedSessionIds: [],
  demoStatus: "saved",
  currentWork: "早间安排已保存到 Daily Record；现有 Tasks 没有变化。",
  progress: 0,
  activeArtifact: "plan",
  statusMenuOpen: false,
  composerDraft: "",
  context: null,
  modal: null,
  memoryEditing: null,
  voiceDemo: false,
  connected: false,
  model: "自动选择",
  automaticPlan: true,
  automaticPlanTime: "06:00",
  operationResult: null,
  tasks: [
    { id: "task-184", title: "确认车险续保方案", date: "2026-09-26", time: "14:00", list: "收集箱", status: "pending", deleted: false },
    { id: "task-207", title: "整理租约扫描件", date: "2026-09-26", time: null, list: "个人", status: "pending", deleted: false },
    { id: "task-231", title: "补充厨房滤网尺寸", date: "2026-09-27", time: "11:00", list: "家庭", status: "pending", deleted: false },
  ],
  plans: {
    "2026-09-26": { saved: true, updatedAt: "08:42", items: [{ time: "09:00", title: "先处理两件确定事项", text: "查看车险续保选项；午前整理租约扫描件。" }, { time: "12:00", title: "午餐与休息", text: "给用餐和短暂休息留出完整缓冲。" }, { time: "14:00", title: "核对续保条款", text: "这是已有 Task 的安排时间；任务身份保持不变。" }, { time: "16:00", title: "留出弹性时间", text: "未确认的家务只作为选项，不自动新增任务。" }], basis: "依据：Daily Record、现有 Tasks 和近期衔接摘要。" },
    "2026-09-25": { saved: true, updatedAt: "08:12", items: [{ time: "08:30", title: "先处理固定安排", text: "保留一小时弹性时间；家里的新安排尚待确认。" }, { time: "12:15", title: "午餐与短暂休息", text: "午后再处理可移动事项。" }, { time: "15:00", title: "整理家庭事务清单", text: "只回看已存在的 Tasks。" }], basis: "依据：9月25日 Daily Record 与当时已知安排。" },
    "2026-09-24": { saved: true, updatedAt: "09:05", items: [{ time: "09:00", title: "处理厨房尺寸记录", text: "收集尺寸信息；原任务日期不变。" }, { time: "13:00", title: "留出自由安排时间", text: "不把计划安排当作已发生事实。" }], basis: "依据：9月24日 Daily Record 与会话记录。" },
    "2026-09-22": { saved: true, updatedAt: "08:05", items: [{ time: "09:00", title: "先排固定安排", text: "为可移动事项留出余量。" }, { time: "14:00", title: "检查本周待办", text: "任务继续保留在原清单。" }], basis: "依据：9月22日 Daily Record。" },
  },
  reviews: {
    "2026-09-25": { saved: true, text: "周五完成了已确认的固定安排。家庭事务清单仍有一项待后续处理。", unknown: "没有记录的时段仍保持未知。" },
    "2026-09-26": { saved: false, text: "", unknown: "下午未记录的活动暂时保持未知，不推断为未完成。" },
    "2026-09-24": { saved: false, text: "", unknown: "未记录的活动不等于未完成。" },
    "2026-09-22": { saved: false, text: "", unknown: "未观察到的事实保持未知。" },
  },
  sessions: [
    { id: "session-morning", title: "早间安排与优先级", createdAt: "2026-09-26", lastAt: "08:42", activityDates: ["2026-09-26"], kind: "morning", messages: [
      { who: "user", date: "2026-09-26", text: "帮我按今天真实安排做个早间计划。下午两点有个固定事项，别把没确认的想法直接加进任务。", time: "08:34" },
      { who: "agent", date: "2026-09-26", text: "我先读取了最新 Tasks 和今天的记录。固定时间按已确认信息保留；未确定的家务只列为选项。早间计划已保存，实际 Tasks 没有变化。", time: "08:42", tag: "已保存", receipt: "Daily Record · 早间基准与今天的大致安排已更新。Tasks 未改动。" },
    ] },
    { id: "session-week", title: "把这周安排重新摆一摆", createdAt: "2026-09-25", lastAt: "今天 09:18", activityDates: ["2026-09-25", "2026-09-26"], kind: "daytime", messages: [
      { who: "user", date: "2026-09-25", text: "这周有一项家里安排变了，帮我一起看看哪些事情要往后挪。", time: "16:20" },
      { who: "agent", date: "2026-09-26", text: "我记住了上次讨论的背景；开始调整前我会重新读取今天的 Tasks 和目标日期记录。", time: "09:18", tag: "跨天继续" },
    ] },
    { id: "session-car", title: "车险续保：先比较方案", createdAt: "2026-09-26", lastAt: "07:57", activityDates: ["2026-09-26"], kind: "task", messages: [
      { who: "user", date: "2026-09-26", text: "续保先做比较，暂时不用替我决定。", time: "07:56" },
      { who: "agent", date: "2026-09-26", text: "我会把比较结果作为建议保留；只有你明确决定后，才改 Task 或记录安排。", time: "07:57", tag: "建议 · 未执行", suggestion: { mode: "note", title: "建议：先整理续保差异", text: "先列出保费、保障范围和待确认问题；目前不改 Task 时间，也不写入 Daily Record。", acceptLabel: "保留这条建议", discussLabel: "继续比较" } },
    ] },
    { id: "session-friday", title: "周五复盘和下周交接", createdAt: "2026-09-25", lastAt: "20:11", activityDates: ["2026-09-25"], kind: "review", messages: [
      { who: "user", date: "2026-09-25", text: "没记录到的活动先留白，之后我想起来再补。", time: "20:10" },
      { who: "agent", date: "2026-09-25", text: "好的。未观察到不表示没有发生，我会保留为未知。", time: "20:11", tag: "已保存" },
    ] },
    { id: "session-old", title: "厨房收纳尺寸记录", createdAt: "2026-09-24", lastAt: "17:31", activityDates: ["2026-09-24"], kind: "task", messages: [
      { who: "user", date: "2026-09-24", text: "把量好的尺寸记下来，任务日期暂时不改。", time: "17:30" },
      { who: "agent", date: "2026-09-24", text: "记录已写入当天 Daily Record；原任务保持不变。", time: "17:31", tag: "已保存" },
    ] },
    { id: "session-tuesday", title: "周二的早间安排", createdAt: "2026-09-22", lastAt: "08:05", activityDates: ["2026-09-22"], kind: "morning", messages: [
      { who: "user", date: "2026-09-22", text: "先排固定安排，其他事情给我一点余量。", time: "08:03" },
      { who: "agent", date: "2026-09-22", text: "早间基准保留了固定安排和休息缓冲。", time: "08:05", tag: "已保存" },
    ] },
  ],
  activity: [
    { date: "2026-09-26", time: "08:42", kind: "plan", title: "早间计划已保存", detail: "写入 Daily Record；Tasks 未改动。" },
    { date: "2026-09-26", time: "09:18", kind: "session", title: "跨天会话继续", detail: "周五开始的安排讨论今天继续。" },
    { date: "2026-09-25", time: "19:00", kind: "review", title: "晚间复盘已保存", detail: "未记录的活动保持未知。" },
    { date: "2026-09-24", time: "17:31", kind: "record", title: "尺寸记录已保存", detail: "原 Task 日期没有变化。" },
  ],
  memories: [
    { id: "rest", title: "安排节奏", text: "做计划时先留出休息与转换时间，再放入可移动事项。", status: "已确认", source: "用户明确表达 · 2026-08-14" },
    { id: "options", title: "选项与任务", text: "没有明确承诺的建议先保留为选项，不自动变成 Task。", status: "已确认", source: "用户明确表达 · 2026-08-14" },
    { id: "energy", title: "晚间精力（待核实）", text: "最近几次晚间安排较轻；这可能只是近期状态，不应直接当成长期偏好。", status: "待核实", source: "Agent 推断 · 尚未确认" },
  ],
  recentMemory: "最近在协调几项家庭事务；租约扫描件仍未确认完成。周五开始的周安排会话今天继续。当前任务状态以 Tasks 为准。",
  activityTimer: null,
};

function readVariant() {
  const value = new URL(location.href).searchParams.get("variant");
  return variants.some((item) => item.key === value) ? value : "A";
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function dateLabel(date) {
  return dates.find((item) => item.value === date)?.label ?? date;
}

function shortDate(date) {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

function activeSession() {
  return state.sessions.find((session) => session.id === state.activeSessionId) ?? null;
}

function sessionsForDate() {
  return state.sessions.filter((session) => session.activityDates.includes(state.selectedDate));
}

function selectDate(date) {
  if (!dates.some((item) => item.value === date)) return;
  state.selectedDate = date;
  if (!activeSession()?.activityDates.includes(date)) state.activeSessionId = sessionsForDate()[0]?.id ?? null;
  renderAll();
}

function clock() {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

function renderDateControls() {
  return `<div class="collab-date-controls"><button type="button" data-action="date-previous" aria-label="前一天">‹</button><select data-date-select aria-label="协作日期">${dates.map((date) => `<option value="${date.value}" ${date.value === state.selectedDate ? "selected" : ""}>${esc(date.label)}</option>`).join("")}</select><button type="button" data-action="date-next" aria-label="后一天">›</button></div>`;
}

function sessionStatus(session) {
  if (state.queuedSessionIds.includes(session.id)) return "排队中";
  if (state.demoStatus === "working" && state.workerSessionId === session.id) return "正在工作";
  if (state.demoStatus === "interrupted" && state.workerSessionId === session.id) return "已中断";
  if (state.demoStatus === "partial" && state.workerSessionId === session.id) return "部分完成";
  if (state.demoStatus === "saved" && state.workerSessionId === session.id) return "已保存";
  return "可浏览";
}

function renderSessionItem(session, compact = false) {
  const crossDay = session.activityDates.length > 1;
  const active = session.id === state.activeSessionId;
  return `<button type="button" class="${compact ? "collab-session-chip" : "collab-session-item"}" data-open-session="${esc(session.id)}" aria-current="${active}">
    <span class="collab-session-topline"><strong>${esc(session.title)}</strong><time>${esc(session.lastAt)}</time></span>
    ${compact ? `<small>${session.kind === "morning" ? "早间安排" : session.kind === "daytime" ? "白天调整" : session.kind === "review" ? "晚间复盘" : "Task 会话"}${crossDay ? ` · ${shortDate(session.createdAt)} 创建` : ""}</small>` : `<span class="collab-session-bottom"><span>${session.kind === "morning" ? "早间安排" : session.kind === "daytime" ? "白天调整" : session.kind === "review" ? "晚间复盘" : "Task 会话"}</span><span class="collab-session-state">${sessionStatus(session)}</span></span>${crossDay ? `<span class="collab-session-origin">${shortDate(session.createdAt)} 创建 · ${session.activityDates.length} 天有活动</span>` : ""}`}
  </button>`;
}

function renderSessionPanel() {
  const sessions = sessionsForDate();
  return `<section class="collab-panel" aria-label="协作会话列表">
    <header class="collab-panel-header"><div><h2>会话</h2><p>${esc(dateLabel(state.selectedDate))} · 按活动日期查看</p></div><span class="collab-session-count">${sessions.length}</span></header>
    <div class="collab-session-list">${sessions.length ? sessions.map((session) => renderSessionItem(session)).join("") : `<p class="collab-empty-note">这一天还没有会话。可以从 Today 或某条 Task 带入上下文开始。</p>`}</div>
    <div class="collab-session-footer"><button type="button" class="collab-new-session" data-action="new-session">＋ 新会话</button></div>
  </section>`;
}

function renderStatusStrip() {
  const details = {
    ready: ["待命", "可继续现有会话；页面导航和原有记录不受影响。"],
    working: ["正在执行", state.currentWork],
    waiting: ["等待你补充", "有歧义的内容保持建议；尚未写入 Daily Record 或 Tasks。"],
    queued: ["排队中", `同一 Vault 的其他工作正在运行；${state.queuedSessionIds.length} 个会话等待开始。`],
    partial: ["部分完成", "Task 改期已保存；Daily Record 复盘写入失败，尚未写入。"],
    interrupted: ["已中断", "已保存结果保留；继续前先核对当前对象版本。"],
    saved: ["已保存", state.currentWork],
  }[state.demoStatus];
  const buttons = {
    ready: "",
    working: `<button type="button" class="collab-link-button" data-action="stop-work">停止</button>`,
    waiting: `<button type="button" class="collab-link-button" data-action="discuss-suggestion">继续讨论</button>`,
    queued: `<button type="button" class="collab-link-button" data-action="browse-running-session">查看正在运行的会话</button><button type="button" class="collab-link-button" data-action="stop-and-switch">停止并切换</button>`,
    partial: `<button type="button" class="collab-link-button" data-action="retry-failed">只重试失败项</button>`,
    interrupted: `<button type="button" class="collab-link-button" data-action="resume-work">核对后继续</button>`,
    saved: `<button type="button" class="collab-link-button" data-action="open-result">查看结果</button>`,
  }[state.demoStatus];
  return `<section class="collab-status-strip" aria-label="当前工作状态">
    <div class="collab-status-main"><span class="collab-status-pill" data-state="${state.demoStatus}">${details[0]}</span><p>${esc(details[1])}</p></div>
    <div class="collab-actions">${buttons}</div>
    <div class="collab-status-menu-wrap"><button type="button" class="collab-link-button" data-action="toggle-status-menu" aria-expanded="${state.statusMenuOpen}">演示状态 ▾</button><div class="collab-status-menu" ${state.statusMenuOpen ? "" : "hidden"}>${statusOptions.map(([key, label, help]) => `<button type="button" data-set-status="${key}"><strong>${label}</strong><small>${help}</small></button>`).join("")}</div></div>
  </section>`;
}

function renderMessage(message) {
  const name = message.who === "user" ? "你" : "Codex · 演示";
  const tag = message.tag ? `<span class="collab-message-tag">${esc(message.tag)}</span>` : "";
  const receipt = message.receipt ? `<div class="collab-message-receipt">${esc(message.receipt)}</div>` : "";
  const suggestion = message.suggestion ? `<div class="collab-suggestion"><strong>${esc(message.suggestion.title)}</strong><p>${esc(message.suggestion.text)}</p><div class="collab-suggestion-actions"><button type="button" data-action="accept-suggestion" data-mode="${message.suggestion.mode}">${esc(message.suggestion.acceptLabel)}</button><button type="button" data-action="discuss-suggestion">${esc(message.suggestion.discussLabel)}</button></div></div>` : "";
  return `<article class="collab-message" data-who="${message.who}"><div class="collab-message-meta"><span>${name}</span>${tag}<time>${esc(message.time)}</time></div><div class="collab-message-bubble">${esc(message.text)}</div>${suggestion}${receipt}</article>`;
}

function renderContextChip() {
  return state.context ? `<span class="collab-context-chip">${esc(state.context.label)}<button type="button" data-action="remove-context" aria-label="移除上下文">×</button></span>` : "";
}

function renderComposer() {
  const voiceNote = state.voiceDemo ? "模拟识别文字已插入，可编辑 · 无真实麦克风" : "语音按钮为模拟输入";
  return `<form class="collab-composer" data-composer>
    <div>${renderContextChip()}</div>
    <div class="collab-composer-box"><textarea data-compose aria-label="给协作 Agent 发消息" placeholder="补充事实、调整方向，或继续讨论…" rows="2">${esc(state.composerDraft)}</textarea><div class="collab-composer-actions"><button type="button" data-action="voice" aria-label="模拟语音输入" title="模拟语音输入">◖</button><button type="submit" class="collab-send-button" aria-label="发送">↑</button></div></div>
    <div class="collab-composer-note"><span>${voiceNote}</span><span>当前会话 · 合成状态</span></div>
  </form>`;
}

function renderConversationPanel({ compact = false } = {}) {
  const session = activeSession();
  const stateLabel = session ? sessionStatus(session) : "无会话";
  const messages = (session?.messages ?? []).slice(-10);
  return `<section class="collab-panel collab-conversation" aria-label="协作对话 ${compact ? "紧凑模式" : ""}">
    <header class="collab-panel-header collab-conversation-header"><div><h2>${esc(session?.title ?? "选择或新建一个会话")}</h2><p>${esc(dateLabel(state.selectedDate))}${session && session.activityDates.length > 1 ? ` · ${shortDate(session.createdAt)} 创建 · 可跨天继续` : " · 当前 Vault"}</p></div><span class="collab-session-state">${stateLabel}</span></header>
    <div class="collab-conversation-scroll"><div class="collab-message-list">${messages.map(renderMessage).join("")}</div></div>
    <div class="collab-quick-actions"><button type="button" data-action="context-today">＋ 从 Today 带入</button><button type="button" data-action="context-task">＋ 从 Task 带入</button><button type="button" data-action="start-evening">开始晚间复盘</button></div>
    ${renderComposer()}
  </section>`;
}

function planForDate(date = state.selectedDate) {
  if (!state.plans[date]) state.plans[date] = { saved: false, updatedAt: "", items: [{ time: "09:00", title: "待根据已有安排整理", text: "先读取这一天的 Daily Record 与 Tasks。" }], basis: "尚无已保存的计划。" };
  return state.plans[date];
}

function reviewForDate(date = state.selectedDate) {
  if (!state.reviews[date]) state.reviews[date] = { saved: false, text: "", unknown: "没有记录的活动保持未知。" };
  return state.reviews[date];
}

function renderPlanContent() {
  const plan = planForDate();
  return `<div class="collab-artifact-heading"><div><strong>今天的大致安排</strong><p>Daily Record · ${esc(dateLabel(state.selectedDate))}</p></div><span class="collab-object-meta">${plan.saved ? `已保存 · ${esc(plan.updatedAt)}` : "尚未保存"}</span></div>
    <div class="collab-plan-list">${plan.items.map((item) => `<article class="collab-plan-item"><time>${esc(item.time)}</time><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></article>`).join("")}</div>
    <p class="collab-artifact-note">${esc(plan.basis)} 计划不会自动新增或改动实际 Tasks。</p>
    <div class="collab-artifact-actions"><button type="button" data-action="generate-plan">整理剩余安排</button><button type="button" data-action="open-today">在 Today 查看 ↗</button></div>`;
}

function visibleTasks() {
  return state.tasks.filter((task) => task.date === state.selectedDate || task.deleted);
}

function renderTaskContent() {
  const tasks = visibleTasks();
  return `<div class="collab-artifact-heading"><div><strong>Tasks · 同一任务正本</strong><p>任务结果也会显示在 Today、Tasks 与 Calendar</p></div><span class="collab-object-meta">${tasks.length} 项</span></div>
    <div class="collab-task-list">${tasks.length ? tasks.map((task) => `<article class="collab-task-item" data-task-id="${esc(task.id)}"><div class="collab-task-topline"><strong>${esc(task.title)}</strong><span class="collab-task-state">${task.deleted ? "已删除" : task.status === "completed" ? "已完成" : "待办"} · ${esc(task.date)}${task.time ? ` ${esc(task.time)}` : ""}</span></div><div class="collab-task-actions">${task.deleted ? `<button type="button" data-action="task-restore" data-task-id="${esc(task.id)}">恢复</button>` : `<button type="button" data-action="task-toggle" data-task-id="${esc(task.id)}">${task.status === "completed" ? "重新打开" : "完成"}</button><button type="button" data-action="task-reschedule" data-task-id="${esc(task.id)}">改到 15:30</button><button type="button" data-action="task-delete" data-task-id="${esc(task.id)}">删除</button>`}</div></article>`).join("") : `<p class="collab-empty-note">这一天没有已关联的 Task。</p>`}</div>
    <p class="collab-artifact-note">改动使用同一个 Task ID；不会产生会话专属副本。</p>
    <div class="collab-artifact-actions"><button type="button" data-action="task-add">＋ 新建 Task（演示）</button><button type="button" data-action="open-tasks">打开 Tasks ↗</button></div>`;
}

function renderReviewContent() {
  const review = reviewForDate();
  return `<div class="collab-artifact-heading"><div><strong>晚间复盘</strong><p>Daily Record · ${esc(dateLabel(state.selectedDate))}</p></div><span class="collab-object-meta">${review.saved ? "已保存 · 可补充" : "尚未开始"}</span></div>
    <article class="collab-review-card"><p>${review.saved ? esc(review.text) : "先读取当天已确认的 Tasks 与记录，再准备一版保守草稿。"}</p><div class="collab-review-unknown">${esc(review.unknown)}</div></article>
    <p class="collab-artifact-note">没有记录的时段不推断为完成或失败；历史修正会保留原文与修订线索。</p>
    <div class="collab-artifact-actions"><button type="button" data-action="start-evening">${review.saved ? "补充复盘" : "读取事实并开始复盘"}</button><button type="button" data-action="open-today">在 Today 查看 ↗</button></div>`;
}

function renderArtifactPanel({ focus = false } = {}) {
  const label = state.activeArtifact === "tasks" ? "任务" : state.activeArtifact === "review" ? "晚间复盘" : "今天的大致安排";
  const body = state.activeArtifact === "tasks" ? renderTaskContent() : state.activeArtifact === "review" ? renderReviewContent() : renderPlanContent();
  return `<section class="collab-panel collab-object-panel ${focus ? "collab-object-focus" : ""}" aria-label="当前工作对象">
    <header class="collab-object-title"><div><h2>${focus ? "当前业务对象" : "当前工作内容"}</h2><p>内容仍使用 APP 现有正本</p></div><span class="collab-object-meta">${esc(dateLabel(state.selectedDate))}</span></header>
    <div class="collab-tabs" role="tablist" aria-label="协作对象类型"><button type="button" role="tab" aria-selected="${state.activeArtifact === "plan"}" data-artifact="plan">安排</button><button type="button" role="tab" aria-selected="${state.activeArtifact === "tasks"}" data-artifact="tasks">Tasks</button><button type="button" role="tab" aria-selected="${state.activeArtifact === "review"}" data-artifact="review">复盘</button></div>
    <div class="collab-artifact-body" aria-label="${label}">${body}</div>
  </section>`;
}

function renderDatebar({ sessionPicker = false } = {}) {
  const session = activeSession();
  return `<div class="collab-datebar">${renderDateControls()}${sessionPicker ? `<label class="collab-session-picker-label">当前会话<select class="collab-session-select" data-session-select aria-label="当前会话">${sessionsForDate().map((item) => `<option value="${esc(item.id)}" ${item.id === session?.id ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></label>` : `<span>${sessionsForDate().length} 个会话 · 目标日期与会话日期独立</span>`}<div class="collab-date-actions"><button type="button" class="collab-new-session" data-action="memory">记忆</button><button type="button" class="collab-new-session" data-action="new-session">＋ 新会话</button></div></div>`;
}

function renderVariantA() {
  return `${renderDatebar()}${renderStatusStrip()}<div class="collaboration-grid" data-layout="A">${renderSessionPanel()}${renderConversationPanel()}${renderArtifactPanel()}</div>`;
}

function renderActivityStream() {
  const session = activeSession();
  const messages = (session?.messages ?? []).filter((message) => (message.date ?? session.createdAt) === state.selectedDate).map((message) => ({ time: message.time, kind: "message", title: message.who === "user" ? "你 · 会话补充" : "Codex · 会话回复", detail: message.text }));
  const activity = state.activity.filter((item) => item.date === state.selectedDate).map((item) => ({ time: item.time, kind: item.kind, title: item.title, detail: item.detail }));
  const items = [...messages, ...activity].sort((left, right) => left.time.localeCompare(right.time));
  return `<section class="collab-panel collab-stream-panel" aria-label="当天协作活动"><header class="collab-panel-header"><div><h2>${esc(dateLabel(state.selectedDate))} · 对话与实际变化</h2><p>${esc(session?.title ?? "暂无会话")}</p></div><span class="collab-session-count">${items.length} 项</span></header><p class="collab-stream-intro">同一条时间流里区分会话内容和已保存结果；计划、Task 与 Daily Record 仍保留在各自页面。</p><div class="collab-stream-list">${items.map((item) => `<article class="collab-stream-item" data-kind="${esc(item.kind)}"><time>${esc(item.time)}</time><div><p><strong>${esc(item.title)}</strong> · ${esc(item.detail)}</p></div></article>`).join("") || `<p class="collab-empty-note">这个日期还没有显示活动。</p>`}</div><div class="collab-stream-compose">${renderComposer()}</div></section>`;
}

function renderVariantB() {
  const sessions = sessionsForDate();
  return `${renderDatebar()}<div class="collab-session-strip" aria-label="这一天的会话">${sessions.map((session) => renderSessionItem(session, true)).join("")}</div>${renderStatusStrip()}<div class="collaboration-grid" data-layout="B">${renderActivityStream()}${renderArtifactPanel()}</div>`;
}

function renderVariantC() {
  return `${renderDatebar({ sessionPicker: true })}${renderStatusStrip()}<div class="collaboration-grid" data-layout="C">${renderArtifactPanel({ focus: true })}${renderConversationPanel({ compact: true })}</div>`;
}

function updateShellContext() {
  const date = new Date(`${state.selectedDate}T12:00:00`);
  const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(date);
  const kicker = document.querySelector(".workspace-rail-context .section-label");
  const title = document.querySelector(".workspace-rail-context strong");
  const detail = document.querySelector(".workspace-rail-context small");
  if (kicker) kicker.textContent = `COLLABORATION · ${state.selectedDate}`;
  if (title) title.textContent = `${Number(state.selectedDate.slice(5, 7))}月${Number(state.selectedDate.slice(8, 10))}日 ${weekday}`;
  if (detail) detail.textContent = `${sessionsForDate().length} 个会话 · 按活动日期查看`;
  const context = document.querySelector(".workspace-context-status");
  if (context) context.textContent = `当前页面：协作 · ${dateLabel(state.selectedDate)}`;
}

function renderAll() {
  const shell = document.querySelector(".app-shell");
  shell.dataset.layoutVariant = state.variant;
  document.querySelector("#collaboration-content").innerHTML = state.variant === "B" ? renderVariantB() : state.variant === "C" ? renderVariantC() : renderVariantA();
  const variant = variants.find((item) => item.key === state.variant);
  document.querySelector("#variant-name").textContent = variant.name;
  document.querySelectorAll("[data-variant]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.variant === state.variant)));
  updateShellContext();
  document.querySelector("#overlay-root").innerHTML = renderModal();
}

function setVariant(key) {
  if (!variants.some((item) => item.key === key)) return;
  state.variant = key;
  const url = new URL(location.href);
  url.searchParams.set("variant", key);
  history.replaceState(null, "", url);
  renderAll();
}

function nextVariant(direction) {
  const index = variants.findIndex((item) => item.key === state.variant);
  setVariant(variants[(index + direction + variants.length) % variants.length].key);
}

function addAssistantMessage(text, options = {}, sessionId = state.activeSessionId, date = state.selectedDate) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) return;
  session.messages.push({ who: "agent", date, time: clock(), text, ...options });
  if (!session.activityDates.includes(date)) session.activityDates.push(date);
  session.lastAt = clock();
}

function addActivity(kind, title, detail, date = state.selectedDate) {
  state.activity.push({ date, time: clock(), kind, title, detail });
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}

function createSession() {
  const id = `session-${Date.now()}`;
  state.sessions.unshift({ id, title: "新协作会话", createdAt: state.selectedDate, lastAt: "刚刚", activityDates: [state.selectedDate], kind: "general", messages: [{ who: "agent", date: state.selectedDate, text: `新会话已就绪。我会先读取 ${dateLabel(state.selectedDate)} 的最新状态。`, time: "刚刚", tag: "等待输入" }] });
  state.activeSessionId = id;
  state.activeArtifact = "plan";
  renderAll();
  showToast("新会话已创建；原有页面和记录不变。" );
}

function openContext(kind) {
  if (kind === "task") {
    const task = state.tasks.find((item) => item.id === "task-184");
    state.context = { label: `Task · ${task.title}` };
    state.activeArtifact = "tasks";
  } else {
    state.context = { label: `Today · ${dateLabel(state.selectedDate)}` };
    state.activeArtifact = "plan";
  }
  renderAll();
  document.querySelector("[data-compose]")?.focus();
}

function addQueueReceipt(session, text) {
  addAssistantMessage("已收到补充。本会话排队等待当前工作完成；现在不会启动并行工作，也没有写入业务记录。", { tag: "排队中", receipt: `已保留在“${session.title}”；开始前重新读取最新状态。` }, session.id, state.selectedDate);
  addActivity("session", "会话已加入工作队列", text, state.selectedDate);
}

function submitMessage(form) {
  const input = form.querySelector("[data-compose]");
  const text = input?.value.trim();
  if (!text) return;
  state.composerDraft = "";
  let session = activeSession();
  if (!session) { createSession(); session = activeSession(); }
  const sessionId = session.id;
  session.messages.push({ who: "user", date: state.selectedDate, time: clock(), text, context: state.context?.label ?? "" });
  if (!session.activityDates.includes(state.selectedDate)) session.activityDates.push(state.selectedDate);
  session.lastAt = clock();
  state.context = null;
  state.voiceDemo = false;
  const activeWork = state.demoStatus === "working" || state.demoStatus === "queued";
  if (activeWork && sessionId !== state.workerSessionId) {
    if (!state.queuedSessionIds.includes(sessionId)) state.queuedSessionIds.push(sessionId);
    state.demoStatus = "queued";
    state.currentWork = "本会话排队等待当前工作完成；开始前会重新读取相关记录。";
    addQueueReceipt(session, text);
    renderAll();
    showToast("已加入队列；当前工作完成前不会并行启动。" );
    return;
  }
  if (activeWork && sessionId === state.workerSessionId) {
    addAssistantMessage("收到这条补充；会并入当前会话正在进行的核对。", { tag: "已加入当前工作", receipt: "仍在同一会话中继续；没有启动第二项工作。" }, sessionId, state.selectedDate);
    renderAll();
    showToast("补充已并入当前工作。" );
    return;
  }
  state.demoStatus = "working";
  state.workerSessionId = sessionId;
  state.queuedSessionIds = [];
  state.currentWork = "已收到补充；开始前重新读取关联记录和对象版本。";
  state.progress = 22;
  addActivity("session", "会话收到新补充", text, state.selectedDate);
  renderAll();
  clearTimeout(state.activityTimer);
  state.activityTimer = setTimeout(() => {
    addAssistantMessage("收到。我会以这条补充和最新业务记录为准继续处理；任何实际修改都会单独显示保存结果。", { tag: "处理中", detail: "示意步骤：核对对象 → 根据明确意图处理 → 保存后重新读取确认" }, sessionId, state.selectedDate);
    state.progress = 68;
    state.currentWork = "正在核对关联对象并准备下一步";
    renderAll();
  }, 500);
}

function finishOperation(sessionId, date, message, artifact, receipt) {
  state.demoStatus = "saved";
  state.workerSessionId = sessionId;
  state.currentWork = message;
  state.progress = 100;
  addAssistantMessage(message, { tag: "已保存", receipt }, sessionId, date);
  renderAll();
  showToast("模拟保存结果已回到对应的 Daily Record 或 Task。" );
  state.activeArtifact = artifact;
  renderAll();
}

function generatePlan() {
  const date = state.selectedDate;
  const sessionId = state.activeSessionId;
  const plan = planForDate(date);
  state.demoStatus = "working";
  state.workerSessionId = sessionId;
  state.queuedSessionIds = [];
  state.currentWork = "重新读取这一天的 Daily Record 与 Tasks，再整理剩余安排";
  state.progress = 30;
  state.activeArtifact = "plan";
  addAssistantMessage("我会先核对最新记录，再整理剩余时段。这里只更新计划，不会自动改动实际 Tasks。", { tag: "正在执行" }, sessionId, date);
  renderAll();
  clearTimeout(state.activityTimer);
  state.activityTimer = setTimeout(() => {
    plan.saved = true;
    plan.updatedAt = clock();
    plan.basis = "刚刚重新读取当前状态；未确认的活动没有写成事实。";
    if (plan.items[0]) plan.items[0] = { time: "09:15", title: "先核对续保，再整理租约文件", text: "原有 Task 保持原样；午餐前留出切换时间。" };
    addActivity("plan", "当前安排已重新整理", "Daily Record 已保存更新；原 Task 状态与日期保持不变。", date);
    state.operationResult = { id: "plan", text: `计划已更新 · ${plan.updatedAt}` };
    finishOperation(sessionId, date, "已按剩余时间整理并保存当前安排。早间基准保留原样；Tasks 没有变化。", "plan", `Daily Record · ${dateLabel(date)} · 当前安排更新于 ${plan.updatedAt}`);
  }, 850);
}

function startEveningReview() {
  const date = state.selectedDate;
  const sessionId = state.activeSessionId;
  const review = reviewForDate(date);
  state.demoStatus = "working";
  state.workerSessionId = sessionId;
  state.queuedSessionIds = [];
  state.currentWork = "读取当天已完成 Tasks 与 Daily Record 里的事实";
  state.progress = 28;
  state.activeArtifact = "review";
  renderAll();
  clearTimeout(state.activityTimer);
  state.activityTimer = setTimeout(() => {
    review.saved = true;
    review.text = `${dateLabel(date)}：先整理已确认的安排。没有明确完成记录的事项仍保持未知；其它未记下来的活动暂不推断。`;
    addActivity("review", "晚间复盘已保存", "使用可确认的 Task 与 Daily Record 事实；未知活动没有补写。", date);
    finishOperation(sessionId, date, "晚间复盘草稿已保存到这一天的 Daily Record。", "review", `Daily Record · ${dateLabel(date)} · 未记录活动保持未知。`);
  }, 700);
}

function updateTask(id, update, result) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  update(task);
  state.operationResult = { id, text: result };
  state.demoStatus = "saved";
  state.currentWork = result;
  state.activeArtifact = "tasks";
  addActivity("task", `Task 已保存 · ${task.title}`, result);
  addAssistantMessage(`已更新“${task.title}”。Today、Tasks 与 Calendar 会读取同一条任务记录。`, { tag: "已保存", receipt: `${result} · Task ${task.id}` });
  renderAll();
  showToast(`已在演示状态中更新 Task ${task.id}；没有写入真实数据。` );
}

function addTask() {
  const task = { id: `task-${300 + state.tasks.length}`, title: "确认厨房收纳盒尺寸", date: state.selectedDate, time: null, list: "收集箱", status: "pending", deleted: false };
  state.tasks.unshift(task);
  state.operationResult = { id: task.id, text: "用户明确选择后加入收集箱" };
  state.demoStatus = "saved";
  state.currentWork = "演示 Task 已加入收集箱";
  state.activeArtifact = "tasks";
  addActivity("task", `新建 Task · ${task.title}`, "这条演示任务与各视图共用一个 ID。" );
  addAssistantMessage(`新 Task“${task.title}”已按你的选择加入收集箱。`, { tag: "已保存", receipt: `Task ${task.id} · 收集箱 · ${dateLabel(state.selectedDate)}` });
  renderAll();
}

function setDemoStatus(status) {
  state.demoStatus = status;
  state.statusMenuOpen = false;
  if (status === "working") {
    state.workerSessionId = state.activeSessionId ?? "session-morning";
    state.queuedSessionIds = [];
    state.currentWork = "正在读取最新 Daily Record 和 Tasks";
  }
  if (status === "queued") {
    state.workerSessionId = "session-week";
    state.queuedSessionIds = [state.activeSessionId === state.workerSessionId ? "session-morning" : state.activeSessionId].filter(Boolean);
    state.currentWork = "等待 Vault 中当前运行的工作完成";
  }
  if (status === "interrupted") state.currentWork = "已停止；之前成功保存的结果仍保留";
  if (status === "partial") {
    const task = state.tasks.find((item) => item.id === "task-184");
    if (task) task.time = "15:30";
    state.operationResult = { id: "task-184", text: "Task 日期与时间已保存为 9月26日 15:30" };
  }
  if (status === "saved") state.currentWork = state.operationResult?.text ?? "早间计划已保存到 Daily Record；没有修改实际 Tasks。";
  renderAll();
}

function renderModal() {
  if (!state.modal) return "";
  if (state.modal === "memory") {
    return `<div class="collab-modal-backdrop"><section class="collab-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal><header class="collab-modal-header"><div><h2 id="modal-title">记忆 · 近期衔接</h2><p class="collab-modal-copy">沿用现有背景与原始记录；近期摘要不替代 Tasks 或 Daily Record。</p></div><button type="button" class="collab-modal-close" data-action="close-modal">关闭</button></header><div class="collab-memory-list">${state.memories.map((item) => `<article class="collab-memory-item"><strong>${esc(item.title)} · ${esc(item.status)}</strong>${state.memoryEditing === item.id ? `<form data-memory-form data-memory-id="${esc(item.id)}"><textarea data-memory-value rows="3">${esc(item.text)}</textarea><div class="collab-modal-actions"><button type="submit">保存更正</button><button type="button" data-action="cancel-memory-edit">取消</button></div></form>` : `<p>${esc(item.text)}</p><small>${esc(item.source)}</small><button type="button" data-action="edit-memory" data-memory-id="${esc(item.id)}">编辑背景</button>`}${item.status === "待核实" ? `<button type="button" data-action="confirm-memory" data-memory-id="${item.id}">确认是长期偏好</button><button type="button" data-action="temporary-memory" data-memory-id="${item.id}">只保留在近期衔接</button>` : ""}</article>`).join("")}<article class="collab-memory-item"><strong>近期衔接摘要</strong>${state.memoryEditing === "recent" ? `<form data-recent-memory-form><textarea data-recent-value rows="4">${esc(state.recentMemory)}</textarea><div class="collab-modal-actions"><button type="submit">保存摘要</button><button type="button" data-action="cancel-memory-edit">取消</button></div></form>` : `<p>${esc(state.recentMemory)}</p><button type="button" data-action="edit-recent-memory">编辑摘要</button>`}</article></div></section></div>`;
  }
  return `<div class="collab-modal-backdrop"><section class="collab-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal><header class="collab-modal-header"><div><h2 id="modal-title">设置 · Codex 协作</h2><p class="collab-modal-copy">设置入口沿用现有工具栏；以下只模拟界面，不建立连接。</p></div><button type="button" class="collab-modal-close" data-action="close-modal">关闭</button></header><div class="collab-setting-row"><strong>Codex 连接</strong><button type="button" class="collab-link-button" data-action="toggle-connection">${state.connected ? "已连接（模拟）" : "连接 Codex（演示）"}</button><p>真实连接和登录流程尚未接入这个原型。</p></div><div class="collab-setting-row"><strong>模型偏好</strong><select data-model-select><option ${state.model === "自动选择" ? "selected" : ""}>自动选择</option><option ${state.model === "快速" ? "selected" : ""}>快速</option><option ${state.model === "高能力" ? "selected" : ""}>高能力</option></select><p>仅用于展示设置位置；不调用模型。</p></div><div class="collab-setting-row"><strong>自动早间计划</strong><label><input type="checkbox" data-auto-plan ${state.automaticPlan ? "checked" : ""}> 启用（模拟）</label><p>App 运行期间触发；已有计划保留，不自动修改 Tasks。</p><label>时间 <input type="time" data-auto-time value="${esc(state.automaticPlanTime)}"></label></div></section></div>`;
}

function openModal(type) {
  state.modal = type;
  renderAll();
}

function handleAction(action, button) {
  if (action === "date-previous" || action === "date-next") {
    const index = dates.findIndex((date) => date.value === state.selectedDate);
    const next = index + (action === "date-previous" ? 1 : -1);
    if (dates[next]) selectDate(dates[next].value);
  } else if (action === "new-session") createSession();
  else if (action === "toggle-status-menu") { state.statusMenuOpen = !state.statusMenuOpen; renderAll(); }
  else if (action === "context-today") openContext("today");
  else if (action === "context-task") openContext("task");
  else if (action === "remove-context") { state.context = null; renderAll(); }
  else if (action === "generate-plan") generatePlan();
  else if (action === "start-evening") startEveningReview();
  else if (action === "task-add") addTask();
  else if (action === "task-toggle") updateTask(button.dataset.taskId, (task) => { task.status = task.status === "completed" ? "pending" : "completed"; }, "Task 状态已更新");
  else if (action === "task-reschedule") updateTask(button.dataset.taskId, (task) => { task.date = state.selectedDate; task.time = "15:30"; }, `日期和时间已改为 ${dateLabel(state.selectedDate)} 15:30`);
  else if (action === "task-delete") updateTask(button.dataset.taskId, (task) => { task.deleted = true; }, "Task 已删除，可恢复");
  else if (action === "task-restore") updateTask(button.dataset.taskId, (task) => { task.deleted = false; }, "Task 已恢复到原清单");
  else if (action === "accept-suggestion" && button.dataset.mode === "note") { addAssistantMessage("这条建议已保留在会话里，等待你明确下一步。", { tag: "建议 · 未执行", receipt: "会话建议已保留；Task 与 Daily Record 均未修改。" }); renderAll(); showToast("建议只保留在会话中，没有修改原页面数据。" ); }
  else if (action === "accept-suggestion") { const plan = planForDate(); plan.saved = true; plan.updatedAt = clock(); state.demoStatus = "saved"; state.currentWork = "用户选择后保存计划建议"; addAssistantMessage("已按你的选择保存这版计划；其中选项没有自动变成 Task。", { tag: "已保存", receipt: `Daily Record · ${dateLabel(state.selectedDate)} · Current arrangement` }); renderAll(); }
  else if (action === "discuss-suggestion") { state.demoStatus = "waiting"; renderAll(); showToast("建议保持未执行；可以继续讨论或补充信息。" ); }
  else if (action === "stop-work") { state.demoStatus = "interrupted"; state.currentWork = "已停止；此前成功保存的结果保留"; renderAll(); }
  else if (action === "resume-work") { const nextSessionId = state.activeSessionId ?? state.workerSessionId; state.workerSessionId = nextSessionId; state.queuedSessionIds = state.queuedSessionIds.filter((id) => id !== nextSessionId); state.demoStatus = state.queuedSessionIds.length ? "queued" : "working"; state.currentWork = "已重新读取对象版本，准备从未完成步骤继续"; state.progress = 34; renderAll(); }
  else if (action === "browse-running-session") { state.activeSessionId = state.workerSessionId; state.demoStatus = state.queuedSessionIds.length ? "queued" : "working"; renderAll(); }
  else if (action === "stop-and-switch") { const next = state.queuedSessionIds[0]; if (next) state.activeSessionId = next; state.demoStatus = "interrupted"; state.currentWork = "已停止此前工作；可核对排队会话后继续"; renderAll(); }
  else if (action === "retry-failed") { startEveningReview(); }
  else if (action === "open-result") { state.activeArtifact = state.operationResult?.id === "review" ? "review" : state.operationResult?.id?.startsWith("task") ? "tasks" : "plan"; renderAll(); }
  else if (action === "open-today" || action === "open-tasks") showToast(`${action === "open-today" ? "Today" : "Tasks"} 将继续使用现有页面和同一份正本。`);
  else if (action === "memory") openModal("memory");
  else if (action === "settings") openModal("settings");
  else if (action === "language" || action === "more") showToast("此原型只展示新增协作页，工具栏其它功能保持原样。" );
  else if (action === "close-modal") { state.modal = null; renderAll(); }
  else if (action === "confirm-memory" || action === "temporary-memory") {
    const item = state.memories.find((entry) => entry.id === button.dataset.memoryId);
    if (item) {
      if (action === "confirm-memory") { item.status = "已确认"; item.source = "用户核实 · 刚刚"; }
      else { state.recentMemory = `${state.recentMemory} 晚间精力判断仅作近期情况，尚无长期结论。`; state.memories = state.memories.filter((entry) => entry.id !== item.id); }
    }
    renderAll();
  }
  else if (action === "edit-memory") { state.memoryEditing = button.dataset.memoryId; renderAll(); }
  else if (action === "edit-recent-memory") { state.memoryEditing = "recent"; renderAll(); }
  else if (action === "cancel-memory-edit") { state.memoryEditing = null; renderAll(); }
  else if (action === "voice") { state.voiceDemo = true; state.composerDraft = "今天有一项安排变化，请帮我检查会影响哪些已有任务。"; renderAll(); document.querySelector("[data-compose]")?.focus(); }
  else if (action === "toggle-connection") { state.connected = !state.connected; renderAll(); }
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const variant = target.closest("[data-variant]");
  if (variant) { setVariant(variant.dataset.variant); return; }
  const session = target.closest("[data-open-session]");
  if (session) { state.activeSessionId = session.dataset.openSession; renderAll(); return; }
  const artifact = target.closest("[data-artifact]");
  if (artifact) { state.activeArtifact = artifact.dataset.artifact; renderAll(); return; }
  const demoStatus = target.closest("[data-set-status]");
  if (demoStatus) { setDemoStatus(demoStatus.dataset.setStatus); return; }
  const existing = target.closest("[data-existing-destination]");
  if (existing) { showToast(`${existing.dataset.existingDestination}保持现有页面。本原型只添加并演示“协作”入口。`); return; }
  const compact = target.closest("#destination-select");
  if (compact) { showToast(`${compact.value}保持现有页面。本原型只演示新增协作页。`); return; }
  const actionButton = target.closest("[data-action]");
  if (actionButton) { handleAction(actionButton.dataset.action, actionButton); return; }
  if (target.id === "open-settings") openModal("settings");
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
  if (target.matches("[data-date-select]")) selectDate(target.value);
  else if (target.matches("[data-session-select]")) { state.activeSessionId = target.value; renderAll(); }
  else if (target.matches("#destination-select")) showToast(`${target.value}保持现有页面。本原型只演示新增协作页。`);
  else if (target.matches("[data-model-select]")) { state.model = target.value; showToast(`偏好已选择：${state.model}（界面示意）`); }
  else if (target.matches("[data-auto-plan]")) { state.automaticPlan = target.checked; showToast(`自动计划${state.automaticPlan ? "已启用" : "已关闭"}（界面示意）`); }
  else if (target.matches("[data-auto-time]")) { state.automaticPlanTime = target.value; showToast(`自动计划时间设为 ${state.automaticPlanTime}（界面示意）`); }
});

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-compose]");
  if (input) state.composerDraft = input.value;
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-composer]");
  if (form) { event.preventDefault(); submitMessage(form); return; }
  const memoryForm = event.target.closest("[data-memory-form]");
  if (memoryForm) {
    event.preventDefault();
    const item = state.memories.find((entry) => entry.id === memoryForm.dataset.memoryId);
    const value = memoryForm.querySelector("[data-memory-value]")?.value.trim();
    if (item && value) { item.text = value; item.source = "用户更正 · 刚刚"; state.memoryEditing = null; renderAll(); showToast("长期背景已更新；原始会话仍保留。" ); }
    return;
  }
  const recentForm = event.target.closest("[data-recent-memory-form]");
  if (recentForm) {
    event.preventDefault();
    const value = recentForm.querySelector("[data-recent-value]")?.value.trim();
    if (value) { state.recentMemory = value; state.memoryEditing = null; renderAll(); showToast("近期衔接摘要已更正。" ); }
  }
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
