import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInterfaceLanguage,
  formatInterfaceDate,
  formatInterfaceMonth,
  interfaceCopy,
  localizeApplicationError,
  localizeApplicationMessage,
  localizeHabitActualTimeLabel,
  localizeHabitCoverageLabel,
  localizeHabitDetail,
  localizeHabitGoalLabel,
  setInterfaceError,
  type InterfaceLanguage,
} from "../../frontend/interface-language.ts";

type FakeElement = {
  dataset: Record<string, string | undefined>;
  textContent: string;
};

function languageRoot(elements: FakeElement[]) {
  return {
    documentElement: {
      lang: "zh-CN",
    },
    querySelectorAll: (selector: string) => {
      if (selector === "[data-i18n]") {
        return elements.filter((element) => element.dataset.i18n);
      }
      if (selector === "[data-application-message]") {
        return elements.filter((element) => element.dataset.applicationMessage);
      }
      return [];
    },
  };
}

test("fixed interface copy switches language while personal content and drafts stay unchanged", () => {
  const navigation: FakeElement = {
    dataset: { i18n: "destination.today" },
    textContent: "今天",
  };
  const personalRecord: FakeElement = {
    dataset: {},
    textContent: "用户写的 Markdown · Do not translate",
  };
  const operationStatus: FakeElement = {
    dataset: { i18n: "today.noteSaved", state: "ready" },
    textContent: "简短记录已保存到绑定的 Daily Record。",
  };
  const draft = { value: "未保存草稿 · Keep this wording" };
  const selectedDate = "2026-09-12";
  const phase = "daytime";

  applyInterfaceLanguage(
    "en",
    languageRoot([navigation, personalRecord, operationStatus]),
  );

  assert.equal(navigation.textContent, "Today");
  assert.equal(personalRecord.textContent, "用户写的 Markdown · Do not translate");
  assert.equal(operationStatus.textContent, "The short note was saved to the Daily Record.");
  assert.equal(operationStatus.dataset.state, "ready");
  assert.equal(draft.value, "未保存草稿 · Keep this wording");
  assert.equal(selectedDate, "2026-09-12");
  assert.equal(phase, "daytime");
});

test("Tasks scopes and reviewed backend diagnostics have real bilingual output", () => {
  assert.equal(interfaceCopy("tasks.scopeAll", "zh"), "全部任务");
  assert.equal(interfaceCopy("tasks.scopeToday", "zh"), "今日");
  assert.equal(interfaceCopy("tasks.scopeInbox", "zh"), "收集箱");
  assert.equal(interfaceCopy("tasks.inbox", "zh"), "收集箱");
  assert.equal(interfaceCopy("tasks.scopeAll", "en"), "All");
  assert.equal(interfaceCopy("tasks.scopeToday", "en"), "Today");
  assert.equal(interfaceCopy("tasks.scopeInbox", "en"), "Inbox");
  assert.equal(interfaceCopy("tasks.inbox", "en"), "Inbox");

  const diagnostics: Array<[string, string]> = [
    [
      "找不到要改期的任务；未写入任何内容。",
      "The task to reschedule could not be found; nothing was written.",
    ],
    [
      "放弃任务不会被旧 daily-flow 操作重新激活；请先明确恢复意图。未写入任何内容。",
      "An abandoned task will not be reactivated by an old daily-flow operation; restore it explicitly first; nothing was written.",
    ],
    ["任务完成日期无效。", "Task completion date is invalid."],
    ["任务状态没有可保存的变化。", "The task state has no changes to save."],
    [
      "任务正本包含重复的 daily-flow 来源标识。",
      "The task source contains a duplicate daily-flow source reference.",
    ],
    [
      "Tasks 当前绑定的 Vault 或文件目标已经变化。请先读取最新任务正本；未写入任何内容。",
      "The Vault or file target bound to Tasks changed. Read the latest task source before retrying; nothing was written.",
    ],
  ];

  for (const [source, expected] of diagnostics) {
    assert.equal(localizeApplicationError(source, "en"), expected);
    assert.equal(localizeApplicationError(source, "zh"), source);
  }
  assert.equal(
    localizeApplicationError("daily-flow task adapter 必须提供绝对 Vault 路径。", "en"),
    "The daily-flow task adapter requires an absolute Vault path.",
  );
});

test("fixed application statuses and generated habit labels have English equivalents", () => {
  assert.equal(
    localizeApplicationMessage(
      "已读取按需生成的本地快照；Dashboard 未连接或轮询外部服务。",
      "en",
    ),
    "Loaded the locally generated on-demand snapshot; Dashboard is not connected to or polling external services.",
  );
  assert.equal(
    localizeApplicationMessage(
      "要更正的记录已经变化。草稿仍保留；请重新读取该日期后重试。",
      "en",
    ),
    "The record being corrected has changed. The draft is preserved; reload that date and try again.",
  );
  assert.equal(
    localizeApplicationMessage(
      "没有需要写入的 daily-flow 行动；建议仍保持为建议。",
      "en",
    ),
    "There are no daily-flow actions to write; suggestions remain suggestions.",
  );
  assert.equal(
    localizeApplicationMessage("daily-flow 明确行动已写入任务正本。", "en"),
    "The explicit daily-flow action was written to the canonical task source.",
  );
  assert.equal(
    localizeApplicationMessage(
      "今天的 Daily Record 缺少有效 frontmatter。请修复 type 和 date，然后刷新 Today。",
      "en",
    ),
    "The Daily Record is missing valid frontmatter. Repair type and date, then refresh Today.",
  );
  assert.equal(
    localizeApplicationMessage(
      "今天的 Daily Record 身份与 2026-09-12 不一致。请修复 type 和 date，然后刷新 Today。",
      "en",
    ),
    "The Daily Record identity does not match 2026-09-12. Repair type and date, then refresh Today.",
  );
  assert.equal(
    localizeApplicationMessage(
      "今天的 Daily Record 包含多个“晚间复盘”段落。请合并重复段落，然后刷新 Today。",
      "en",
    ),
    "The Daily Record contains multiple “Evening review” sections. Merge the duplicates, then refresh Today.",
  );
  assert.equal(localizeHabitGoalLabel("每周 3 次", "en"), "3 times per week");
  assert.equal(
    localizeHabitCoverageLabel("2026-09-01 — 2026-09-12 · 4 个 complete 日期", "en"),
    "2026-09-01 — 2026-09-12 · 4 complete dates",
  );
});

test("fixed error details switch language without changing their source diagnostic", () => {
  const status: FakeElement = { dataset: {}, textContent: "" };
  const sourceError = "Vault 不兼容：需要 Obsidian Vault 标记和 life/Journal/Daily 目录";

  setInterfaceError(status, "settings.vaultSelectionError", sourceError, "zh");
  applyInterfaceLanguage("en", languageRoot([status]));

  assert.equal(
    status.textContent,
    "Could not choose a Vault: Incompatible Vault: an Obsidian Vault marker and life/Journal/Daily directory are required",
  );
  assert.equal(status.dataset.i18nError, sourceError);
  assert.doesNotMatch(status.textContent, /[一-龥]/);
  assert.equal(
    localizeApplicationError("Could not read the local interface language: permission denied", "zh"),
    "无法读取本机界面语言：permission denied",
  );
  assert.equal(
    localizeApplicationError("今天的 Daily Record 不是有效的 UTF-8 文本。", "en"),
    "The Daily Record is not valid UTF-8 text.",
  );
  assert.equal(
    localizeApplicationError("Daily Record 的简短记录正文格式无效。", "en"),
    "The Daily Record short-note body has an invalid format.",
  );
  assert.equal(
    localizeApplicationError("Could not read today's daily record: permission denied", "zh"),
    "无法读取今天的 Daily Record：permission denied",
  );
  assert.equal(
    localizeApplicationError("简短记录不能为空。", "en"),
    "Short note cannot be empty.",
  );
  assert.equal(
    localizeApplicationError("记录标识格式无效；未写入任何内容。", "en"),
    "Record identifier has an invalid format; nothing was written.",
  );
  assert.equal(
    localizeApplicationError("The local appearance preference is invalid: bad JSON", "zh"),
    "本机外观偏好无效：bad JSON",
  );
  assert.equal(
    localizeApplicationError("Could not create the Daily Record recovery directory: permission denied", "zh"),
    "无法创建 Daily Record 恢复目录：permission denied",
  );
  assert.equal(
    localizeApplicationError(
      "2026-09-08 的任务已在外部发生变化。操作仍可重试；请刷新后再保存，外部内容未被覆盖。",
      "en",
    ),
    "Tasks for 2026-09-08 changed externally. The operation remains retryable; refresh before saving again. External content was not overwritten.",
  );
  assert.equal(
    localizeApplicationError("任务文字只能是一条不超过 160 字的内容。", "en"),
    "Task text must be one line of no more than 160 characters.",
  );
  for (const diagnostic of [
    "当天任务正本归属 2026-09-07，与所选日期 2026-09-08 不一致。",
    "当天任务正本归属 not-a-date，与所选日期 2026-09-08 不一致。",
    "当天任务正本归属 ，与所选日期 2026-09-08 不一致。",
    "当天任务正本包含重复任务标识；未将其当作空任务。",
    "当天任务正本包含重复 producer 来源标识；无法稳定合并任务。",
    "当天任务正本的完成状态与修改记录不一致。",
    "当天任务正本包含无效时间戳：2026-99-99T99:99+99:99",
    "当天任务正本包含无效时间戳：",
  ]) {
    assert.doesNotMatch(localizeApplicationError(diagnostic, "en"), /[一-龥]/);
  }
  assert.equal(
    localizeApplicationError(
      "Could not write the day-task document update: disk full",
      "zh",
    ),
    "无法写入当天任务正本更新：disk full",
  );
  assert.equal(
    localizeApplicationError(
      "该日期的 Daily Record 包含多个“简短记录”段落。请先合并重复段落；未写入任何内容。",
      "en",
    ),
    "The Daily Record contains multiple “Short notes” sections. Merge the duplicates first; nothing was written.",
  );
  assert.equal(
    localizeApplicationError("Could not write the local Today workspace setting: disk full", "zh"),
    "无法写入 Today 工作区设置：disk full",
  );
  assert.equal(
    localizeApplicationError("The selected calendar month is invalid.", "zh"),
    "所选日历月份无效。",
  );
  assert.equal(
    localizeApplicationError(
      "无法读取 Habits 快照：Habits 快照 range.from 不是有效日期。",
      "en",
    ),
    "Could not read the Habits snapshot: Habits snapshot range.from is not a valid date.",
  );
  assert.equal(
    localizeApplicationError("无法读取任务正本：permission denied", "en"),
    "Could not read the canonical task source: permission denied",
  );
  assert.equal(
    localizeApplicationError(
      "任务正本在保存边界发生了并发变化。未静默丢弃交错内容；恢复副本保存在 /tmp/tasks.snapshot。请刷新 Tasks 后重试。",
      "en",
    ),
    "The task source changed concurrently at the save boundary. Interleaved content was not silently discarded; a recovery snapshot remains at /tmp/tasks.snapshot. Refresh Tasks and try again.",
  );
  for (const diagnostic of [
    "任务名称不能为空。",
    "任务列表名称不能为空。",
    "任务列表名称不能超过 80 个字符，也不能换行。",
    "任务时间必须先绑定日期。",
    "任务列表不存在；未写入任何内容。",
    "该任务列表标识已用于其他清单；请使用新的稳定身份。未写入任何内容。",
    "Inbox 是永久清单；不能改名。未写入任何内容。",
    "Inbox 是永久清单；不能归档或恢复。未写入任何内容。",
    "归档清单不能作为新任务或移动任务的目标；请先恢复清单。未写入任何内容。",
    "找不到要更新状态的任务；未写入任何内容。",
    "任务必须先从放弃状态恢复为待办，再标记完成；未写入任何内容。",
    "任务完成日期必须是有效的 YYYY-MM-DD 日期。",
    "任务完成记录不能使用未来日期或未来时刻。",
    "已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。",
    "只有已明确完成的任务才能更正完成记录；未写入任何内容。",
    "任务正本不是有效 JSON：missing field",
    "Tasks 当前绑定的 Vault 或文件目标已经变化。请刷新 Tasks 后重试；未写入任何内容。",
    "daily-flow adapter 使用调用方明确提供的 Vault；不会改变 Dashboard 的已选 Vault。",
    "lived date 必须是有效的 YYYY-MM-DD 日期。",
    "daily-flow task adapter 使用不支持的 schema 版本 2。",
    "daily-flow task adapter 必须明确提供 Vault 路径。",
    "daily-flow 请求的 Vault 与任务正本当前目标不一致；未写入任何内容。",
    "daily-flow adapter 无法读取当前时间上下文：任务正本包含无效修改时间。",
    "同一 daily-flow 请求不能重复声明任务标识；未写入任何内容。",
    "同一 daily-flow 请求不能重复声明来源标识；未写入任何内容。",
    "同一 daily-flow 请求不能重复使用操作标识；未写入任何内容。",
    "该 daily-flow 来源标识已经绑定到其他任务；旧输入不会改绑对象。未写入任何内容。",
    "该 daily-flow 操作标识已用于其他操作；未写入任何内容。",
    "任务正本已经存在。请先读取最新任务正本，再提交 daily-flow 写命令；未写入任何内容。",
    "任务无变化操作记录不能携带字段前后值。",
    "任务无变化操作记录缺少操作内容。",
  ]) {
    assert.doesNotMatch(localizeApplicationError(diagnostic, "en"), /[一-龥]/);
  }
});

test("planning task input diagnostics have complete English equivalents", () => {
  for (const diagnostic of [
    "无法读取规划任务输入：permission denied",
    "规划任务输入不是有效 JSON：missing field `text`",
    "规划任务输入使用不支持的 schema 版本 2；未接收任何候选。",
    "规划任务输入归属 ，与所选日期 2026-09-08 不一致。",
    "规划任务输入包含重复来源标识；未接收任何候选。",
    "规划任务输入包含重复任务身份；未接收任何候选。",
    "规划任务来源标识格式无效；未写入任何内容。",
    "规划任务身份格式无效；未写入任何内容。",
    "规划任务来源身份已绑定到另一任务；旧候选不会被重新解释。",
    "规划任务身份已用于另一来源；未写入任何候选。",
  ]) {
    assert.doesNotMatch(localizeApplicationError(diagnostic, "en"), /[一-龥]/);
  }
  assert.equal(
    localizeApplicationError(
      "Could not write the local habit-completion document update: disk full",
      "zh",
    ),
    "无法写入本地习惯完成正本更新：disk full",
  );
});

test("local habit completion labels, details, and diagnostics are bilingual", () => {
  assert.equal(
    localizeApplicationError("The system clock did not provide a valid timestamp.", "zh"),
    "系统时钟未提供有效的时间戳。",
  );
  assert.equal(
    interfaceCopy("habits.recordCompletion", "zh", { habit: "Reset living space" }),
    "记录“Reset living space”今天完成",
  );
  assert.equal(
    interfaceCopy("habits.recordCompletion", "en", { habit: "Reset living space" }),
    "Record “Reset living space” complete today",
  );
  assert.equal(
    interfaceCopy("habits.completionWithdrawnExternal", "en", { sources: "Dida365" }),
    "Local withdrawn; external remains: Dida365",
  );
  assert.equal(
    localizeHabitDetail(
      {
        kind: "localCompletion",
        state: "withdrawn",
        changedAt: "2026-09-12T09:30-04:00",
      },
      "en",
    ),
    "Personal Dashboard local completion withdrawn · 2026-09-12T09:30-04:00",
  );
  for (const diagnostic of [
    "当前没有可验证的 Habits catalog；请刷新有效快照后再记录。",
    "Habits catalog 中没有这个稳定习惯 key；未写入任何内容。",
    "该习惯不是 completion 型；时刻和阈值证据不能用本地完成框记录。",
    "本地习惯完成正本包含重复修改标识。",
    "本地习惯完成正本包含无效时间戳：not-a-time",
    "本地习惯完成正本包含未来修改时间：2026-09-13T08:00-04:00",
    "本地习惯完成正本的修改记录时间顺序倒置。",
    "本地习惯完成正本不是有效 JSON：expected value",
  ]) {
    assert.doesNotMatch(localizeApplicationError(diagnostic, "en"), /[一-龥]/);
  }
});

test("historical correction copy and catalog boundaries are bilingual", () => {
  assert.equal(
    interfaceCopy("history.goalUnknown", "en"),
    "Target for that week unknown · Not backfilled",
  );
  assert.equal(
    interfaceCopy("history.unknownHabitName", "en", { key: "reset" }),
    "Display name unknown · Stable key: reset",
  );
  assert.equal(
    interfaceCopy("dayTasks.changeRenamed", "en", {
      changedAt: "2026-09-08T14:10-04:00",
      previous: "旧任务",
      next: "新任务",
    }),
    "2026-09-08T14:10-04:00 · Renamed: 旧任务 → 新任务",
  );
  for (const message of [
    "请选择 Vault，以读取历史习惯。",
    "没有可验证的 Habits catalog；所选日期的外部状态未知。",
    "没有可验证的 Habits catalog；所选日期的外部状态与历史目标未知。",
    "正在使用过期但有效的 catalog；所选日期的外部证据可能不是最新。",
    "所选日期不在外部快照覆盖内；外部状态未知，本地更正仍按稳定习惯 key 保存。",
    "未来日期仅供查看；不能记录尚未发生的本地习惯完成。",
    "历史习惯缓存不可用。",
    "已读取所选日期的习惯证据与本地更正。",
  ]) {
    assert.doesNotMatch(localizeApplicationMessage(message, "en"), /[一-龥]/);
  }
  assert.doesNotMatch(
    localizeApplicationMessage(
      "刷新失败，继续显示上个有效历史读数：Habits snapshot is invalid.",
      "en",
    ),
    /[一-龥]/,
  );
  assert.doesNotMatch(
    localizeApplicationMessage(
      "无法读取 Habits 快照：bad JSON；外部状态与历史目标未知。",
      "en",
    ),
    /[一-龥]/,
  );
});

test("Habits translates generated detail grammar but preserves source-owned text", () => {
  const detail = {
    kind: "observation" as const,
    sourceLabel: "TickTick · 文字记录 · 来源",
    status: "partial" as const,
    evidence: "check-in" as const,
    observedAt: "2026-09-12",
    note: "用户备注：次日 30 分钟 · 待解释",
  };

  assert.equal(
    localizeHabitDetail(detail, "en"),
    "TickTick · 文字记录 · 来源 · partial · excluded from counts · check-in evidence · Observed at 2026-09-12 · 用户备注：次日 30 分钟 · 待解释",
  );
  assert.equal(
    localizeHabitDetail({
      kind: "localRecord",
      sourceLabel: "Dashboard · partial · 打卡证据 · observedAt fake",
      text: "次日 30 分钟 · 待解释",
    }, "en"),
    "Dashboard · partial · 打卡证据 · observedAt fake · text record · 次日 30 分钟 · 待解释",
  );
  assert.equal(localizeHabitDetail({ kind: "conflict" }, "en"), "Source conflict · excluded from completion counts");
  assert.equal(localizeHabitActualTimeLabel("次日 08:00", "en"), "Next day 08:00");
  assert.equal(localizeHabitGoalLabel("每日 次日 08:00", "en"), "Daily by 08:00 next day");
  assert.equal(
    localizeHabitGoalLabel("每日 07:00 · 日期归属待解释", "en"),
    "Daily 07:00 · date attribution unresolved",
  );
});

test("date labels change locale without changing the selected calendar value", () => {
  const selectedDate = "2026-09-12";

  assert.equal(formatInterfaceDate(selectedDate, "zh"), "9月12日周六");
  assert.equal(formatInterfaceDate(selectedDate, "en"), "Sat, Sep 12");
  assert.equal(formatInterfaceMonth(2026, 9, "zh"), "2026年9月");
  assert.equal(formatInterfaceMonth(2026, 9, "en"), "September 2026");
  assert.equal(selectedDate, "2026-09-12");
});

test("the shared copy entry provides both languages and variable interpolation", () => {
  const examples: Array<[InterfaceLanguage, string]> = [
    ["zh", "3 个时间块"],
    ["en", "3 time blocks"],
  ];

  for (const [language, expected] of examples) {
    assert.equal(interfaceCopy("count.timeBlocks", language, { count: 3 }), expected);
  }
});
