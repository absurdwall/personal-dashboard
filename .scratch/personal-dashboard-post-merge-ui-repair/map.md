# 协作与 Today 界面验收修复

父规格：[Spec #36](https://github.com/absurdwall/personal-dashboard/issues/36)。用户已确认拆分并授权发布，GitHub 为实施队列权威来源。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [[界面验收修复 01] 协作三栏到两栏过渡与偏好恢复](https://github.com/absurdwall/personal-dashboard/issues/37) | None | resolved |
| [[界面验收修复 02] Today 长时段标签与正文可读排版](https://github.com/absurdwall/personal-dashboard/issues/38) | None | resolved |
| [[界面验收修复 03] 时间轴两端原地展开与小图标定位现在](https://github.com/absurdwall/personal-dashboard/issues/39) | None | resolved |

三票均可独立启动；Today 两票协调集成并做共同回归。每票包含实际渲染回归和 packaged Mac 验收，最终集成候选版须用户验收并明确同意后才 merge。

2026-10-02：#37–#39 在含 PR #35 的隔离分支认领并并行实现，draft PR #40。用户验收与明确 merge 授权仍是独立门槛；旧 #28–#34、#19 的其他未验收项保留。

[本地规格](spec.md) · [发布回执](ticket-publication.json) · [Management 检查](ticket-management-receipt.json)

## Implementation checkpoint

PR #40 implements all three repairs. Technical checks and isolated packaged Mac scenarios passed; runnable candidate and evidence are recorded in [acceptance.md](acceptance.md). On 2026-10-02 the user accepted the updated daily installation and explicitly authorized merge. PR #40 merged as `7fcc272c0c1f03ed280e0230336ac46328e34a96`; #36–#39 are closed. Daily installation replacement was separately authorized and verified with the existing Vault.
