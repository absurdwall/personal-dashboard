# 历史习惯补记与连续时间轴 — 已批准范围

2026-09-23：用户批准两张独立的端到端实现票，互不阻塞。此次发布不启动实现，不指定发布版本，也不合并进另行批准的 3.0.1 polish 范围。

## 来源与决定

- [原始反馈 01：历史习惯补记](../personal-dashboard-usage-feedback/issues/01-historical-habit-records.md)
- [原始反馈 02：当日时间轴](../personal-dashboard-usage-feedback/issues/02-today-time-axis.md)
- [已确认原型说明](../personal-dashboard-usage-feedback/prototype/README.md)
- 原型归档：原分支 `codex/prototype-today-time-axis` 已退役；tag `archive/today-time-axis-variant-a-2026-09-25` 指向确认提交 `f9551de8500ba8d32b3732626e561b29856fd258`，并收录于本机 `personal-dashboard-prototypes.bundle`。选择 `?variant=A`。归档是视觉与交互参考，不应直接合并原型代码。

用户明确选择 A：计划／实际双栏，共享连续时间刻度；不再迭代 prototype。B／C 不属于实现候选。原型演示控件和合成数据不属于产品功能。

## 产品结果

1. 午夜后仍能找到入口、选择昨天或更早日期、补记或撤回本地习惯完成，保存到正确 lived date，并在各相关视图一致显示。
2. Today 当日情况按 A 原型呈现：左侧 Current arrangement，右侧已确认事实；明确时间按比例定位，“现在”线真实反映当前时刻。只有时段或没有发生时间的内容保留原精度、独立展示。

## 共同约束

遵守现有领域与 ADR；复用既有本地习惯完成、Daily Record 和 Calendar 能力。保留 Morning baseline、修订记录和用户正文。外部习惯来源只读，Short record 不因出现在时间轴上而变成习惯完成证据。

每票独立完成必要的读取／解析、应用操作、UI 和针对性验证；无单独后端、前端、测试横向票，无无关预重构。任何测试均使用合成数据和隔离 Vault。不得改动真实个人记录、Dida365、日常 producer 或自动化，不添加依赖、服务或部署配置。保持原始反馈票不变。

候选构建的 packaged Mac 验收与自动化测试分别记录。发布实现票、完成原型、测试通过均不等于用户日常安装验收完成；本轮不替换正式安装、不推送、不关闭既有其他票。
