> 发布时正文副本；正式票为 [GitHub #30](https://github.com/absurdwall/personal-dashboard/issues/30)，当前状态以 GitHub 为准。

## Parent

https://github.com/absurdwall/personal-dashboard/issues/28

## What to build

所选生活日展示当天 04:00 至次日 04:00，默认突出 06:00–24:00，两端可展开；次日凌晨安排、真实时间和“现在”均可直接理解与访问。

## Acceptance criteria

- [ ] 查询与界面共同覆盖完整生活日，04:00 边界不遗漏或重复；次日凌晨显示日期标记。
- [ ] 有时刻 Task 按实际日历时间投影，Calendar 中的明确日期不变；无时刻事项仍可见但不虚构时刻，跨午夜展示不复制 Task 或完成事实。
- [ ] 已存 Daily Record 与习惯事实保留原来源及归属，时间轴展示不执行历史迁移。
- [ ] 默认突出 06:00–24:00，两端可展开；凌晨打开和定位“现在”自动使当前时段可见。
- [ ] 用户手动浏览后不抢回；重叠、短时长、跨午夜片段和无时刻内容保持可读。
- [ ] 用已有时间轴、日期投影和 packaged 场景验证边界、来源、展开及定位；在真实窗口检查卡片可读性。

## Shared verification

每票独立完成必要自动化与相关 packaged Mac 验收，使用隔离 Vault；真实布局及识别质量不能由源码断言或模拟录音代替。保留既有数据、来源、权限和草稿；不新增依赖或服务。验证基线包含已完成前置及已合入兄弟票，并回归本次触及的相邻功能。本次发布只创建实施队列，不代表认领或开始实现。

## Blocked by

- https://github.com/absurdwall/personal-dashboard/issues/29
