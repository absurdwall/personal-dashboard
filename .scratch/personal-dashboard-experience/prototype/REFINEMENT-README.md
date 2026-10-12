# Personal Dashboard 体验原型 · 用户反馈修订

**Today 选 A，Tasks 选 B。Habits 和 Calendar 保留现有主结构；Collaboration 尚未选定。** 见 [逐页选择记录](../refinement-design-choice-2026-10-11.md)。先前“整体 A 首选”的记录已纠正。

## 打开和运行

当前正在运行：<http://127.0.0.1:4317/refinement-prototype.html?page=habits&variant=current>。

```sh
cd /tmp/pd-experience-refinement.noindex && npm run prototype:experience
```

服务选择可用端口，打印入口和旧 R URL。导航可到五个页面；Today 自动使用 A，Tasks 自动使用 B。Habits/Calendar 没有布局切换；协作仍能用浮动条 A/B/C 比较。刷新或“还原”恢复内存样例，“状态”可核对已选页面、Habit 当前选择、共享 Task、早间基准及当前安排。

全部使用 R 的 **2026-10-10 合成样例日**，不是实际当前日期或真实 Daily Record。无 Vault、Dida、外部服务、模型、麦克风或持久写入；没有新增依赖、产品 build 或 App 安装。服务仍是既有 `prototype:experience`。

## 本轮实际比较范围

| 页面 | 当前原型 | 过目重点 |
| --- | --- | --- |
| Today | A 已选 | 紧凑日轴概览、精细放大、就近任务浮窗 |
| Tasks | B 已选 | 粗体标题直接编辑、Content 优先、下面的紧凑属性与 Save/Cancel |
| Habits | 保留当前本周摘要＋今日列表 | 默认没有新增单项统计页；点左侧才显示详细统计，能返回原列表 |
| Calendar | 保留月历＋右侧回顾＋下方任务 | 顶部 ＋ 预填所选日期；点击 Task 用浮窗编辑，背景位置保留 |
| Collaboration | A/B/C 待选 | A 底部背景、B 侧栏背景、C 按需浮层；输入与转写空间 |

## 操作路线

1. **Habits**：默认看左侧本周摘要、右侧每日锚点与今日列表，保留达标天数、今日状态和过去 7 天。点左侧“活动身体”才在右侧显示本月/累计/连续统计、编辑与打卡入口；“回到今日习惯”恢复列表。原有“展开”只展开该行近期历史，不自动切换整页详情。顶部 ＋ 创建本地 Habit；选中后编辑目标，按既定的下一周期生效；停用可恢复，完整/有限覆盖与来源区别保留。
2. **Today**：A 已选。点 Task 打开就近浮窗，Content 编辑结构沿用 B；拖动“下午”到 16:00 后变“约 16:00”，文档面板中的早间仍是“下午”。Task 区间拖动保留时长，事实不拖动。“取消时间安排”保留日期，不等于删除 Task。
3. **Tasks**：B 已选。点任务默认聚焦 Content，属性在下面。清单、日期、起止时间点开设置；Save/Cancel 同行，窄窗口仍可见。文件夹汇总按原清单分组；创建前选日期和目标清单；优先级/标签可排序筛选；子任务独立完成，可继续嵌套；More 和右键共用操作。
4. **Calendar**：这里不选 A/B/C，也不比较计划/复盘标签或折叠。原主结构保留。选 12 日 → 顶部 ＋ → 日期预填 12 日且可改；创建不补造 Daily Record。点月历或下方同日 Task → 在月历上方打开详情浮窗 → 关闭后保留背景。右侧仍是该日记录/计划回顾，可打开完整 Today。轻量节日样例可关闭，没有周视图或日期格右键/双击新增。
5. **Collaboration**：仍未选。比较背景底部/侧栏/浮层，背景自身限高滚动且可收起。模拟听写 → 加片段 → 停止进入可编辑草稿 → 编辑再发送；输入框下方的转写预览可以收起。Slash 多候选均为模拟，仅 `/retro` 是现有入口；方向键选择，Enter/Tab 补全，Esc 退出，不自动发送。

## 历史原型和检查

- [初稿三方案对照](comparison-prototype.html?page=today&variant=A)：保留初稿布局供追溯；初稿 Habits/Calendar 不是当前选择依据。
- [旧 R](revised.html?page=today&variant=R)：原导航、外壳、样例和时间轴来源，文件不改。
- [本次修订检查](CORRECTION-CHECKS.md)与 `refinement-checks/correction/`：宽窄窗口的默认主界面、选中详情、Calendar 截图。
- [初稿检查](REFINEMENT-CHECKS.md)与原 31 张截图：历史检查，仅对应初稿，不能替代修订版或产品验收。

用户过目修订后的详情交互及待选协作后，再以明确的逐页结论整理 Lenspec；候选不自动进入正式产品。
