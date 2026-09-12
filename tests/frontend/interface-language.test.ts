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
