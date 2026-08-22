# 习惯追踪产品调研：到期但未完成时，选项如何命名与组织

研究日期：2026-08-16
研究语言：中文
研究范围：Streaks、Productive、Habitica、Loop Habit Tracker
来源原则：只使用产品官网、官方帮助中心、开发者官网/官方仓库及其维护者发布的 FAQ；没有用二手文章替代官方资料缺口。

> 本文件是下一轮设计讨论的研究输入，不是对 Personal Dashboard spec、map、issues、生产代码或 prototype 的修改，也不把下面的推论视为已批准的产品决定。

## 结论先行

在本轮查到的第一方资料中，常见的核心不是“请解释为什么没做”，而是先处理一个清晰的记录状态：

1. **完成**：Done、Complete、打勾或正向记录。[Productive 官方帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)、[Habitica 官方概览](https://habitica.com/static/overview?mobile-app=true&theme=wiki)、[Loop 官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)
2. **不计入本次**：Skip、跳过、短横线，或由系统显示为 missed/skipped。[Productive 官方帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)、[Streaks 开发者更新](https://crunchybagel.com/now-available-streaks-10/)、[Loop 官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)
3. **暂停长期规则**：Pause、Stop、Resume，通常是习惯层级的管理，不是单次到期问答。[Productive 官方 Vacation mode](https://support.productiveapp.io/hc/en-us/articles/35968324455953-Vacation-mode-how-to-pause-a-habit)、[Habitica 官方 FAQ](https://habitica.com/static/faq)
4. **补记过去**：从历史/统计/日历进入，补记 Done 或 Skip，而不是把补记混在当前到期的第一层选项里。[Productive 官方历史日期帮助](https://support.productiveapp.io/hc/en-us/articles/35967549684753-How-to-mark-habits-for-previous-days/)、[Loop 官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)

相反，以下几类在这四个产品的第一方资料中没有形成共同的“到期时并列菜单”：

- 把**重新安排**和完成/跳过作为三个同层级的通用结果；[Productive 官方日程/暂停帮助](https://support.productiveapp.io/hc/en-us/articles/35968324455953-Vacation-mode-how-to-pause-a-habit)、[Habitica 官方 FAQ](https://habitica.com/static/faq)、[Loop 官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)
- 到期后统一提供**稍后提醒**或 snooze；[Streaks 官方产品页](https://streaksapp.com/)、[Productive 官方通知帮助](https://support.productiveapp.io/hc/en-us/articles/26920691316113-Notifications-and-widget)、[Loop 官方 README](https://github.com/iSoron/uhabits)
- 先要求用户选择一个**未完成原因**；[Productive 官方 Notes 帮助](https://support.productiveapp.io/hc/en-us/articles/26920710210833-How-to-add-and-view-notes)、[Loop 官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)
- 把“系统如何处理”直接写成用户动作，例如 `Move to fallback`。这部分是结合当前产品基线与上面资料的设计推论，不是外部产品事实。

这支持一个重要的设计判断：`Leaving for gym / Move to fallback / Skip` 之所以感觉不自然，很可能不是三个词单独不好，而是它们混合了三种不同的层级：**行动意图、日程变更、最终记录结果**。这是跨产品归纳，不是任何单个产品的原文结论。

## 1. 资料与可信度边界

| 产品 | 本轮采用的一手资料 | 资料能回答什么 | 明确缺口 |
| --- | --- | --- | --- |
| Streaks | [官方产品页](https://streaksapp.com/)、[官方 Support 页](https://streaksapp.com/support/)、开发者 [Streaks 10 更新](https://crunchybagel.com/now-available-streaks-10/)、开发者 [Streaks 5 更新](https://crunchybagel.com/streaks-5-now-available/) | 任务完成、提醒、周期、skipped/missed 的规则，以及 `complete task` / `miss task` 快捷操作 | 官方 Support 明确把详细帮助放在 App 内；公开网页没有提供完整的“到期后用户看到什么、是否 snooze、是否选原因、如何补记”的操作说明 |
| Productive | [官方 Help Center：标记 Done](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)、[历史日期](https://support.productiveapp.io/hc/en-us/articles/35967549684753-How-to-mark-habits-for-previous-days)、[Vacation mode](https://support.productiveapp.io/hc/en-us/articles/35968324455953-Vacation-mode-how-to-pause-a-habit)、[通知与 widget](https://support.productiveapp.io/hc/en-us/articles/26920691316113-Notifications-and-widget)、[Notes](https://support.productiveapp.io/hc/en-us/articles/26920710210833-How-to-add-and-view-notes) | Done、Skip、Undo、Pause/Stop/Resume、历史补记、通知中的动作、备注的顺序 | 公开帮助没有把“原因选择”描述为到期必经步骤，也没有把单次 reschedule 或 remind-later 描述成统一的到期分组 |
| Habitica | [官方 FAQ](https://habitica.com/static/faq)、[官方新用户概览](https://habitica.com/static/overview?mobile-app=true&theme=wiki)、[官方 Press Kit](https://habitica.com/static/press-kit) | Habits / Dailies / To Do 的分型、check off、missing 的后果、Pause Damage、日程编辑 | 官方资料没有提供普通习惯产品式的单次 `Snooze`、单次 `Reschedule`、到期原因选择或公开的历史补记流程 |
| Loop Habit Tracker | 官方仓库 [README](https://github.com/iSoron/uhabits)、维护者在官方仓库发布的 [FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689) | checkmark、dash skip、通知 check/dismiss、过去日期编辑、灵活频率 | 官方 FAQ 没有描述原因分类，也没有把“提醒稍后”或“重新安排本次”作为到期时的选择菜单 |

## 2. 各产品事实

以下部分只记录来源直接支持的事实。英文 UI 词保留在括号中，避免把不同产品的语义误合并。

### 2.1 Streaks

- **完成是主记录动作。** 官方产品页把 Streaks 描述为习惯型 to-do list：完成任务会延长 streak；任务可以按每天或指定日期/频率安排；产品页也提到自动提醒和查看统计。[官方产品页](https://streaksapp.com/)
- **提醒属于任务机制，不等于到期后的重新安排。** 官方产品页说明 Streaks 会在需要完成任务时自动提醒；公开资料没有说明提醒通知里有 `remind me later` 或 snooze 分支。[官方产品页](https://streaksapp.com/)
- **`skipped` 与 `missed` 是不同结果。** 开发者介绍 `2-Day Rule` 时说明：如果周一未完成，系统可以把该天标为 skipped，streak 不归零；如果接着周二也未完成，则标为 missed，streak 归零。[开发者 Streaks 10 更新](https://crunchybagel.com/now-available-streaks-10/)
- **公开开发者资料还暴露了 `complete task` 与 `miss task` 两个快捷操作。** 这说明“完成”和“标为未完成/错过”是明确的产品动作，但该文章没有把它们描述为一个到期弹窗中的三选一流程。[开发者 Streaks 5 更新](https://crunchybagel.com/streaks-5-now-available/)
- **资料缺口需要保留。** Streaks 官方 Support 页说明详细帮助位于 App 内的 Settings → `?`，公开页面没有足够证据确认：用户是否能在到期时 snooze、是否能从历史补记、是否会被要求选择原因。因此不能用“官方资料没提到”推断这些功能一定不存在。[官方 Support 页](https://streaksapp.com/support/)

### 2.2 Productive

- **完成和跳过是并列的直接状态动作。** 官方帮助说明：向右滑显示绿色 `Done!` 并标为完成；如果计划改变或习惯不再相关，向左滑出现 `Skip`，并将其标为 ignored；操作可以 `Undo`。[官方标记 Done 帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)
- **通知里也只给出结果动作。** 官方通知帮助说明，长按通知会看到 `Done` 和 `Skip` 两个选项。[官方通知与 widget 帮助](https://support.productiveapp.io/hc/en-us/articles/26920691316113-Notifications-and-widget)
- **历史补记被放在过去日期/统计路径。** 官方帮助允许用户打开 Stats，选择过去日期，再把习惯改成 `Done` 或 `Skipped`；另一篇官方帮助也说明过去日期可以改状态，以修正漏记。[官方历史日期帮助](https://support.productiveapp.io/hc/en-us/articles/35967549684753-How-to-mark-habits-for-previous-days/)
- **暂停、停止、恢复是长期习惯管理。** `Pause` 会让习惯继续显示在日程中，但当前不需要完成；`Stop` 会让它不再出现在日程；两者都可稍后 `Resume`。[官方 Vacation mode 帮助](https://support.productiveapp.io/hc/en-us/articles/35968324455953-Vacation-mode-how-to-pause-a-habit)
- **备注不是到期原因选择。** 官方帮助要求习惯先被标为 Done 或 Skipped，之后才能添加 Notes；这更像完成后的可选记录，而不是到期时强制回答“为什么”。[官方 Notes 帮助](https://support.productiveapp.io/hc/en-us/articles/26920710210833-How-to-add-and-view-notes)
- **提醒是预先配置的通知。** 官方创建习惯帮助要求设置提醒时间，目的是在计划的时间提示开始或完成；在本轮查阅的官方资料中没有看到统一的“现在不做，稍后再提醒”按钮。[官方创建习惯帮助](https://support.productiveapp.io/hc/en-us/articles/35963922804241-How-to-create-a-habit)

### 2.3 Habitica

- **Habitica 首先按任务类型组织，而不是先问未完成原因。** 官方 FAQ 把任务分为 Habits、Dailies 和 To Do’s：Dailies 是结构化重复任务，To Do’s 是一次性任务；Dailies 漏掉会影响 HP，而 To Do 错过 due date 不会扣 HP。[官方 FAQ](https://habitica.com/static/faq)
- **完成动作是 check off。** 官方新用户概览说明，用户通过完成并勾选任务获得经验和金币；漏掉 Dailies 则会损失生命值。[官方新用户概览](https://habitica.com/static/overview?mobile-app=true&theme=wiki)
- **“跳过”在 Habitica 中主要是结果/后果语言。** 官方 Press Kit 说，如果跳过一个 daily goal，角色会在第二天失去生命；这不是一个和 `reschedule`、`reason` 并列的普通到期选择器。[官方 Press Kit](https://habitica.com/static/press-kit)
- **暂停是全局或规则级控制。** 官方 FAQ 提供 `Pause Damage` 来防止漏掉 Dailies 时失去 HP；也可以把特定 Daily 的重复设置改为永不到期，之后再恢复。[官方 FAQ](https://habitica.com/static/faq)
- **官方公开资料没有确认单次 snooze、单次 reschedule、原因选择或历史补记的普通到期流程。** 这里应记录为资料缺口，不用社区 wiki 或二手文章替代。[官方 FAQ](https://habitica.com/static/faq)

### 2.4 Loop Habit Tracker

- **完成是加 checkmark。** 官方仓库把 Loop 描述为通过重复和 missed day 计算习惯强度，并提供提醒；通知可直接 check 或 dismiss。[官方仓库 README](https://github.com/iSoron/uhabits)
- **Skip 是单独的日记录状态。** 维护者 FAQ 说明，用短横线 `-` 跳过某天；这会保持 score 不变且不打断 streak，适用于当天确实无法完成的情况，也可以在设置中关闭 skip days。[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- **补记进入统计页的日历编辑。** 官方 FAQ 说明，打开某个习惯的 statistics 页面，在 Calendar 下进入 Edit，再点选过去日期来添加或取消 checkmark。[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- **频率是规则设置，不是到期时的“改到另一天”按钮。** 官方 FAQ说明 Loop 以周期内次数来推断安排，例如每周两次；完成后系统会根据频率生成后续未填充日期的标记。[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- **通知的公开动作是 check/dismiss，而非明确的 remind-later。** README 只说明可以从通知中 check 或 dismiss；FAQ 说明提醒是否出现取决于该天是否已完成和提醒日设置，没有公开 snooze 语义。[官方仓库 README](https://github.com/iSoron/uhabits)、[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- **官方资料没有原因分类。** FAQ 用“无法完成，例如不在所需地点”解释 skip 的适用场景，但没有把这个场景组织成可选原因列表。[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)

## 3. 跨产品归纳：哪些分组常见，哪些不是

下表是对上述事实的归纳，不是某一家产品的 UI 规范。`有` 表示本轮官方资料中直接看到相关机制；`部分` 表示有相邻机制但不是同一种到期选择；`未见` 表示在已查阅的一手资料中没有足够证据。

| 设计问题 | Streaks | Productive | Habitica | Loop | 跨产品归纳 |
| --- | --- | --- | --- | --- | --- |
| 完成/确认 | 有：complete、完成任务（[官方产品页](https://streaksapp.com/)） | 有：Done（[官方帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)） | 有：check off（[官方概览](https://habitica.com/static/overview?mobile-app=true&theme=wiki)） | 有：checkmark（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **最稳定的第一层动作**是确认完成 |
| 跳过/不做 | 有：skipped/missed；部分由规则自动产生（[开发者更新](https://crunchybagel.com/now-available-streaks-10/)） | 有：Skip（[官方帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)） | 有：missing/skip 的后果，但不是普通三选一（[官方 FAQ](https://habitica.com/static/faq)） | 有：dash skip（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **常见，但语义不一致**：可能是用户主动跳过，也可能是系统记录未完成 |
| 延后/重新安排本次 | 未见公开的单次到期动作（[官方 Support](https://streaksapp.com/support/)） | 有日程编辑/暂停，但官方资料未将其写成到期并列选项（[官方 Vacation mode](https://support.productiveapp.io/hc/en-us/articles/35968324455953-Vacation-mode-how-to-pause-a-habit)） | 有重复规则/暂停调整，但非单次 snooze（[官方 FAQ](https://habitica.com/static/faq)） | 有频率规则，但非单次到期菜单（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **不是四者共同的到期分组**；通常属于规则或编辑层 |
| 稍后提醒 | 有提醒，但未见 remind-later（[官方产品页](https://streaksapp.com/)） | 有预设提醒，通知动作是 Done/Skip（[官方通知帮助](https://support.productiveapp.io/hc/en-us/articles/26920691316113-Notifications-and-widget)） | 有提醒机制资料，但本轮官方 FAQ 未说明 snooze（[官方 FAQ](https://habitica.com/static/faq)） | 有提醒，公开动作是 check/dismiss（[官方 README](https://github.com/iSoron/uhabits)） | **提醒常见，临时延后提醒不构成共同模式** |
| 补记/手动记录 | 公开资料不足（[官方 Support](https://streaksapp.com/support/)） | 有：Stats/过去日期改 Done 或 Skipped（[官方历史日期帮助](https://support.productiveapp.io/hc/en-us/articles/35967549684753-How-to-mark-habits-for-previous-days/)） | 本轮官方资料不足（[官方 FAQ](https://habitica.com/static/faq)） | 有：Statistics/Calendar/Edit（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **常见于历史/统计入口，不宜和当前到期响应混在第一层** |
| 原因选择 | 未见（[官方 Support](https://streaksapp.com/support/)） | 未见必选原因；Notes 在状态之后（[官方 Notes 帮助](https://support.productiveapp.io/hc/en-us/articles/26920710210833-How-to-add-and-view-notes)） | 未见单次原因列表（[官方 FAQ](https://habitica.com/static/faq)） | 未见原因列表（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **不是常见必经步骤**；场景说明不等于可选原因分类 |
| 撤销/恢复 | 公开资料没有在本轮确认完整流程（[官方 Support](https://streaksapp.com/support/)） | 有：Undo（[官方标记 Done 帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)） | 通过规则/暂停等方式调整，但不是同一 Undo 资料（[官方 FAQ](https://habitica.com/static/faq)） | 可编辑过去状态（[官方 FAQ](https://github.com/iSoron/uhabits/discussions/689)） | **可恢复性有价值，但不是到期选项本身** |

### 3.1 “完成 / 跳过”与“未完成 / 错过”不能直接等同

这四个产品使用相近词，但不代表同一语义：

- Productive 的 `Skip` 是用户在计划改变或习惯不再相关时主动选择的状态，并且可以 Undo。[官方标记 Done 帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)
- Loop 的 dash 是用户明确标记“这一天跳过”，并保持 score 与 streak 不变。[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- Streaks 的 `skipped` 在开发者示例里是 2-Day Rule 计算出的宽限结果，和之后的 `missed` 区分开来。[开发者 Streaks 10 更新](https://crunchybagel.com/now-available-streaks-10/)
- Habitica 的 missing/skip 会触发其游戏化惩罚逻辑；它的语义依赖 HP、Dailies 和 Cron，而不是普通日程应用的中性“本次不做”。[官方 FAQ](https://habitica.com/static/faq)、[官方 Press Kit](https://habitica.com/static/press-kit)

因此，Personal Dashboard 不能只因为四个产品都出现了 `Skip` 就直接复用同一文案或同一结果语义。

### 3.2 “原因”与“动作”通常不是同一层

在官方资料里，原因更多以解释性场景出现：Productive 说计划改变或习惯不再相关，Loop 举例说当天不在所需地点；但它们没有把这些场景组织成一个普遍的必选原因菜单。[Productive 官方标记 Done 帮助](https://support.productiveapp.io/hc/en-us/articles/35967057602065-How-to-mark-a-habit-as-done)、[Loop 官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)

Productive 的 Notes 还显示了一种更弱耦合的结构：先完成 Done/Skip，再在状态之后添加可选备注。[Productive 官方 Notes 帮助](https://support.productiveapp.io/hc/en-us/articles/26920710210833-How-to-add-and-view-notes)

### 3.3 “补记”通常是历史修正，不是当前到期的第四个结果

Productive 把过去日期的 Done/Skipped 修改放在 Stats；Loop 把过去日期的 checkmark 编辑放在 Statistics → Calendar → Edit。[Productive 官方历史日期帮助](https://support.productiveapp.io/hc/en-us/articles/35967549684753-How-to-mark-habits-for-previous-days/)、[Loop 官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)

这个分层很重要：

- 当前到期响应回答“这次现在怎么处理”；
- 历史补记回答“我之前已经做了，但当时没记录”；
- 二者如果同时出现在右侧，会让用户不清楚是在处理未来/当前计划，还是在修正历史数据。

## 4. 对 Personal Dashboard 的推论

以下都是**推论**，不是已批准的 spec；它们只用于下一轮中文 grill。

### 4.1 当前三项确实混了三种不同对象

当前生产基线明确保留 `Leaving for gym`、`Move to fallback`、`Skip`，并要求 `Move to fallback` 与 `Skip` 使用既有的五个 click-only preset reasons。[Personal Dashboard issue 07](../issues/07-respond-to-pending-departure-without-losing-context.md)

从研究角度看，这三项的对象并不平行：

| 当前选项 | 更像什么 | 研究中对应的常见层级 | 主要风险 |
| --- | --- | --- | --- |
| `Leaving for gym` | 对“现在是否按计划出发”的意图/确认 | 状态确认前的行动承诺 | 容易被误解为已经完成 workout，或和真正的 workout record 重复 |
| `Move to fallback` | 改变本周这一次的安排 | 日程编辑/重新安排 | 不是通用习惯产品的常规中性结果；`fallback` 还是系统概念，不是自然用户意图 |
| `Skip` | 本次不做/不计入 | 直接结果状态 | 需要明确它是否终止本次 departure、是否保留后续 workout 记录入口 |

**推论：** 下一轮不应先做三种更漂亮的按钮文案，而应先定义这三个动作分别是在回答什么问题，以及它们是否真的应该同层显示。

### 4.2 研究支持的候选分层，而不是最终文案

不改变既有领域行为的前提下，可以把讨论收敛为以下候选层级：

1. **第一层：处理这一次 departure。** 只放用户此刻能明确决定的结果/意图；不要在这一层放原因解释。
2. **第二层：如果是调整安排，再选真实的可用 fallback slot。** 先选“调整这次安排”，再选择具体 Saturday/Friday 等可用时段；不要让 `Move to fallback` 这个内部名词独占一个看似与 Skip 同类的按钮。
3. **第二层：如果是不做，再确认“本次跳过”。** 只有在产品确实需要审计/反馈时，才在之后问一个可选的 preset reason；研究没有支持“原因必选”作为习惯追踪产品的通用惯例。
4. **独立入口：历史补记。** “我其实已经完成了，只是忘了记录”应更接近 History/过去日期修正，而不是在当前 pending response 里新增一个含糊的第四选项；是否纳入 PD 仍需结合当前 domain 行为决定。
5. **条件入口：稍后提醒。** 只有当 Personal Dashboard 有明确、可验证的临时提醒语义时才值得出现；研究不能证明它是习惯追踪产品的必备到期动作，也不应为了凑齐选项而新增。

这里的“候选分层”不是要求马上改成这些标签，而是说明研究为什么不支持把 `Leaving for gym / Move to fallback / Skip` 继续当作三个同层级的通用回答。

### 4.3 下一轮中文 grill 应该先定的上游问题

建议按这个顺序讨论，避免又回到按钮文案：

1. **Pending departure 到底发生在 workout 之前还是之后？** 如果发生在之前，`Leaving for gym` 是意图确认，不是完成；如果发生在之后，界面应直接面对记录/未记录结果。
2. **`Move to fallback` 的用户目标是什么？** 是“我今天仍想完成，只是改时间”，还是“系统替我找一个可用 slot”？这会决定它是否应先显示具体可选时段。
3. **`Skip` 的语义是什么？** 是“不做这次”，还是“暂时不处理但保留机会”？若是前者，应使用终止性清晰的文案；若是后者，可能属于延期而不是 skip。
4. **五个 preset reasons 的产品责任是什么？** 是影响统计/历史显示的领域数据，还是曾经为帮助用户解释而加的 UI 分支？如果是前者，需保留但可以延后显示；如果是后者，研究不支持把它们作为默认必答。
5. **是否真的需要 remind-later？** 若没有现有领域命令、持久化语义和提醒重排规则，应该先不加。

## 5. 对本轮问题的直接回答

### “一般习惯追踪软件会问这些吗？”

**不会以这三个同层级选项作为一个明确的跨产品惯例。** 常见的是完成/跳过或未完成状态；重新安排通常藏在日程设置或编辑路径；补记通常在历史/统计里；原因选择和到期后稍后提醒，在本轮四个产品的公开第一方资料中都没有形成共同模式。

### “那应该给哪些选项？”

本轮研究还不足以批准最终文案，但足以排除一个方向：不要把“行动意图 + 日程变更 + 最终结果 + 原因”全部平铺在同一层。对 Personal Dashboard，下一轮应先讨论一个**分层的候选结构**：

- 当前要不要按原计划继续；
- 如果要完成但时间变了，进入具体可用 fallback 的重新安排；
- 如果本次不做，明确记录为跳过；
- 补记与原因是否另置于后续/历史路径；
- 稍后提醒只有在已有真实语义时才加入。

这使下一步从“给三个按钮换文案”转为“先统一 departure response 的流程模型”。

## 6. 研究限制

- Streaks 的完整帮助在 App 内，公开 Support 页只告诉用户如何进入，不能据此断言 App 内不存在其他动作。[官方 Support 页](https://streaksapp.com/support/)
- Habitica 的官方 FAQ 解释任务类型、惩罚和暂停，但没有覆盖所有移动端交互；本文件没有使用社区 Wiki 来填补单次 skip、补记或原因的细节。[官方 FAQ](https://habitica.com/static/faq)
- Loop 的主要官方说明集中在 README 和维护者 FAQ 讨论，能确认 checkmark、skip、历史编辑、提醒规则，但不能把它当成桌面应用的界面模式。[官方仓库 README](https://github.com/iSoron/uhabits)、[官方仓库 FAQ 讨论 #689](https://github.com/iSoron/uhabits/discussions/689)
- Productive 的帮助中心资料足以确认 Done/Skip、Pause/Stop/Resume、历史补记和备注顺序，但没有提供一套通用的到期 reschedule/reason/snooze 对话流程。[Productive 官方帮助中心](https://support.productiveapp.io/hc/en-us/categories/35962957880465-How-to)
